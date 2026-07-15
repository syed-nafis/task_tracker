import { MongoClient, Db } from 'mongodb';

const DB_NAME = 'task_tracker';

// Cache the client promise on globalThis so Next.js dev HMR doesn't open a new
// connection pool on every reload.
const globalWithMongo = globalThis as typeof globalThis & {
  _mongoClientPromise?: Promise<MongoClient>;
};

function getClient(): Promise<MongoClient> {
  if (!globalWithMongo._mongoClientPromise) {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI is not set — add it to .env.local');
    globalWithMongo._mongoClientPromise = new MongoClient(uri).connect();
  }
  return globalWithMongo._mongoClientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await getClient();
  return client.db(DB_NAME);
}
