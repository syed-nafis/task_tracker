/**
 * One-off (re-runnable) migration: data/*.json → MongoDB.
 *
 * Usage: node scripts/migrate-to-mongo.mjs
 * Reads MONGODB_URI from .env.local (or the environment).
 *
 * - Upserts by app-level `id`, so running twice is safe.
 * - Folds legacy baseline_data/current_data freetext into results.notes.
 * - Seeds stage_history with a single entry for the current stage.
 * - Seeds the `counters` collection from max ids.
 * - Leaves the JSON files untouched as a backup.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MongoClient } from 'mongodb';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DB_NAME = 'task_tracker';

// Minimal .env.local parser (avoid dotenv dep)
function loadEnvLocal() {
  const fp = join(ROOT, '.env.local');
  if (!existsSync(fp)) return;
  for (const line of readFileSync(fp, 'utf-8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

function readJSON(name, fallback) {
  const fp = join(ROOT, 'data', name);
  if (!existsSync(fp)) return fallback;
  return JSON.parse(readFileSync(fp, 'utf-8'));
}

function migrateExperiment(exp) {
  const { baseline_data, current_data, ...rest } = exp;
  const legacyNotes = [
    baseline_data ? `Baseline: ${baseline_data}` : '',
    current_data ? `Current: ${current_data}` : '',
  ].filter(Boolean).join('\n');

  return {
    ...rest,
    stage_history: exp.stage_history ?? [
      { stage: exp.status, entered_at: exp.created_at ?? new Date().toISOString(), note: '' },
    ],
    results: exp.results ?? {
      exposure_event: '',
      variants: ['Control', 'Variant B'],
      exposures: [null, null],
      metrics: [],
      notes: legacyNotes,
    },
  };
}

async function main() {
  loadEnvLocal();
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not set. Add it to .env.local');
    process.exit(1);
  }

  const experiments = readJSON('experiments.json', []).map(migrateExperiment);
  const tasks = readJSON('tasks.json', []);
  const ideas = readJSON('ideas.json', []);
  const pages = readJSON('pages.json', []);

  const client = await new MongoClient(uri).connect();
  const db = client.db(DB_NAME);

  async function upsertById(collection, docs) {
    if (docs.length === 0) return 0;
    const res = await db.collection(collection).bulkWrite(
      docs.map((doc) => ({
        replaceOne: { filter: { id: doc.id }, replacement: doc, upsert: true },
      })),
    );
    return res.upsertedCount + res.modifiedCount;
  }

  const nExp = await upsertById('experiments', experiments);
  const nTasks = await upsertById('tasks', tasks);
  const nIdeas = await upsertById('ideas', ideas);

  if (pages.length > 0) {
    await db.collection('pages').bulkWrite(
      pages.map((name) => ({
        updateOne: { filter: { name }, update: { $setOnInsert: { name } }, upsert: true },
      })),
    );
  }

  // Seed counters from max ids — only ratchet upward, never backward.
  for (const [key, docs] of [['experiments', experiments], ['tasks', tasks], ['ideas', ideas]]) {
    const maxId = docs.reduce((m, d) => Math.max(m, d.id), 0);
    await db.collection('counters').updateOne(
      { _id: key },
      [{ $set: { seq: { $max: [{ $ifNull: ['$seq', 0] }, maxId] } } }],
      { upsert: true },
    );
  }

  const counts = {
    experiments: await db.collection('experiments').countDocuments(),
    tasks: await db.collection('tasks').countDocuments(),
    ideas: await db.collection('ideas').countDocuments(),
    pages: await db.collection('pages').countDocuments(),
  };
  console.log(`Upserted: ${nExp} experiments, ${nTasks} tasks, ${nIdeas} ideas`);
  console.log('Collection counts:', counts);
  console.log('Counters:', await db.collection('counters').find().toArray());

  await client.close();
}

main().catch((err) => { console.error(err); process.exit(1); });
