import { join } from 'path';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import type { Experiment, Task, Idea } from './types';

const DATA_DIR = join(process.cwd(), 'data');

function readJSON<T>(filename: string, fallback: T): T {
  const fp = join(DATA_DIR, filename);
  if (!existsSync(fp)) return fallback;
  try {
    return JSON.parse(readFileSync(fp, 'utf-8')) as T;
  } catch {
    return fallback;
  }
}

function writeJSON<T>(filename: string, data: T): void {
  const fp = join(DATA_DIR, filename);
  writeFileSync(fp, JSON.stringify(data, null, 2), 'utf-8');
}

export function getExperiments(): Experiment[] {
  return readJSON<Experiment[]>('experiments.json', []);
}
export function saveExperiments(data: Experiment[]): void {
  writeJSON('experiments.json', data);
}

export function getTasks(): Task[] {
  return readJSON<Task[]>('tasks.json', []);
}
export function saveTasks(data: Task[]): void {
  writeJSON('tasks.json', data);
}

export function getIdeas(): Idea[] {
  return readJSON<Idea[]>('ideas.json', []);
}
export function saveIdeas(data: Idea[]): void {
  writeJSON('ideas.json', data);
}

export function getPages(): string[] {
  return readJSON<string[]>('pages.json', ['homepage', 'pdp', 'cart', 'checkout', 'category', 'search']);
}
export function savePages(data: string[]): void {
  writeJSON('pages.json', data);
}

export function nextId(items: { id: number }[]): number {
  return items.length === 0 ? 1 : Math.max(...items.map((i) => i.id)) + 1;
}
