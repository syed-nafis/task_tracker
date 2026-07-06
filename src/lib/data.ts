import { getDb } from './mongodb';
import type { Experiment, Task, Idea } from './types';

// Documents are stored with their app-level numeric `id`; Mongo's `_id` is
// internal only and stripped before returning to the app.
type WithMongoId = { _id?: unknown };

function strip<T>(doc: T & WithMongoId): T {
  if (doc && typeof doc === 'object' && '_id' in doc) {
    const { _id, ...rest } = doc;
    void _id;
    return rest as T;
  }
  return doc;
}

// insertOne mutates its argument (adds _id) and replaceOne rejects payloads
// whose _id differs from the stored one — so always write a stripped copy.
function clean<T extends object>(doc: T): T {
  return strip({ ...doc });
}

/** Atomically increment and return the next id for a collection. */
export async function nextId(counter: 'experiments' | 'tasks' | 'ideas'): Promise<number> {
  const db = await getDb();
  const res = await db
    .collection<{ _id: string; seq: number }>('counters')
    .findOneAndUpdate(
      { _id: counter },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: 'after' },
    );
  return res!.seq;
}

// --- Experiments ---
export async function getExperiments(): Promise<Experiment[]> {
  const db = await getDb();
  const docs = await db.collection<Experiment>('experiments').find().sort({ id: -1 }).toArray();
  return docs.map(strip);
}

export async function getExperiment(id: number): Promise<Experiment | null> {
  const db = await getDb();
  const doc = await db.collection<Experiment>('experiments').findOne({ id });
  return doc ? strip(doc) : null;
}

export async function insertExperiment(exp: Experiment): Promise<void> {
  const db = await getDb();
  await db.collection<Experiment>('experiments').insertOne(clean(exp));
}

export async function updateExperiment(id: number, exp: Experiment): Promise<void> {
  const db = await getDb();
  await db.collection<Experiment>('experiments').replaceOne({ id }, clean(exp));
}

export async function deleteExperiment(id: number): Promise<void> {
  const db = await getDb();
  await db.collection<Experiment>('experiments').deleteOne({ id });
}

// --- Tasks ---
export async function getTasks(): Promise<Task[]> {
  const db = await getDb();
  const docs = await db.collection<Task>('tasks').find().sort({ id: -1 }).toArray();
  return docs.map(strip);
}

export async function insertTask(task: Task): Promise<void> {
  const db = await getDb();
  await db.collection<Task>('tasks').insertOne(clean(task));
}

export async function updateTask(id: number, task: Task): Promise<void> {
  const db = await getDb();
  await db.collection<Task>('tasks').replaceOne({ id }, clean(task));
}

export async function deleteTask(id: number): Promise<void> {
  const db = await getDb();
  await db.collection<Task>('tasks').deleteOne({ id });
}

// --- Ideas ---
export async function getIdeas(): Promise<Idea[]> {
  const db = await getDb();
  const docs = await db.collection<Idea>('ideas').find().sort({ id: -1 }).toArray();
  return docs.map(strip);
}

export async function getIdea(id: number): Promise<Idea | null> {
  const db = await getDb();
  const doc = await db.collection<Idea>('ideas').findOne({ id });
  return doc ? strip(doc) : null;
}

export async function insertIdea(idea: Idea): Promise<void> {
  const db = await getDb();
  await db.collection<Idea>('ideas').insertOne(clean(idea));
}

export async function updateIdea(id: number, idea: Idea): Promise<void> {
  const db = await getDb();
  await db.collection<Idea>('ideas').replaceOne({ id }, clean(idea));
}

export async function deleteIdea(id: number): Promise<void> {
  const db = await getDb();
  await db.collection<Idea>('ideas').deleteOne({ id });
}

// --- Pages registry ---
const DEFAULT_PAGES = ['homepage', 'pdp', 'cart', 'checkout', 'category', 'search'];

export async function getPages(): Promise<string[]> {
  const db = await getDb();
  const docs = await db.collection<{ name: string }>('pages').find().sort({ name: 1 }).toArray();
  if (docs.length === 0) return DEFAULT_PAGES;
  return docs.map((d) => d.name);
}

export async function addPages(pages: string[]): Promise<void> {
  if (pages.length === 0) return;
  const db = await getDb();
  const col = db.collection<{ name: string }>('pages');
  await col.bulkWrite(
    pages.map((name) => ({
      updateOne: { filter: { name }, update: { $setOnInsert: { name } }, upsert: true },
    })),
  );
}
