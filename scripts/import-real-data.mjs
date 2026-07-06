/**
 * Import real CRO data (sheet + monthly reports) into MongoDB.
 *
 * Usage: node scripts/import-real-data.mjs
 * Reads MONGODB_URI from .env.local (or the environment).
 *
 * DESTRUCTIVE: wipes experiments, tasks, ideas, and pages collections,
 * then seeds them from scripts/real-data/*.json (generated from the
 * ideas spreadsheet + April/May HTML reports).
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MongoClient } from 'mongodb';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SEED = join(ROOT, 'scripts', 'real-data');
const DB_NAME = 'task_tracker';

function loadEnvLocal() {
  const fp = join(ROOT, '.env.local');
  if (!existsSync(fp)) return;
  for (const line of readFileSync(fp, 'utf-8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

function readSeed(name) {
  return JSON.parse(readFileSync(join(SEED, name), 'utf-8'));
}

async function main() {
  loadEnvLocal();
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not set. Add it to .env.local');
    process.exit(1);
  }

  const experiments = readSeed('experiments.json');
  const tasks = readSeed('tasks.json');
  const ideas = readSeed('ideas.json');
  const pages = readSeed('pages.json');

  const client = await new MongoClient(uri).connect();
  const db = client.db(DB_NAME);

  for (const name of ['experiments', 'tasks', 'ideas', 'pages']) {
    await db.collection(name).deleteMany({});
  }

  if (experiments.length) await db.collection('experiments').insertMany(experiments);
  if (tasks.length) await db.collection('tasks').insertMany(tasks);
  if (ideas.length) await db.collection('ideas').insertMany(ideas);
  if (pages.length) await db.collection('pages').insertMany(pages.map((name) => ({ name })));

  // Reset counters to seed maxima.
  for (const [key, docs] of [['experiments', experiments], ['tasks', tasks], ['ideas', ideas]]) {
    const maxId = docs.reduce((m, d) => Math.max(m, d.id), 0);
    await db.collection('counters').updateOne(
      { _id: key },
      { $set: { seq: maxId } },
      { upsert: true },
    );
  }

  console.log('Seeded:', {
    experiments: await db.collection('experiments').countDocuments(),
    tasks: await db.collection('tasks').countDocuments(),
    ideas: await db.collection('ideas').countDocuments(),
    pages: await db.collection('pages').countDocuments(),
  });

  await client.close();
}

main().catch((err) => { console.error(err); process.exit(1); });
