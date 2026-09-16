import type { Db } from './db.js';
import type { ImportMeta, AppSettings, Theme } from '../types/vocab.js';
import { requestToPromise } from './db.js';

export async function recordImport(db: Db, meta: ImportMeta): Promise<void> {
  const tx = db.transaction('imports', 'readwrite');
  const store = tx.objectStore('imports');
  store.put(meta);
  await transactionComplete(tx);
}

export async function getImports(db: Db): Promise<ImportMeta[]> {
  const tx = db.transaction('imports');
  const index = tx.objectStore('imports').index('by-imported-at');
  return requestToPromise(index.getAll() as IDBRequest<ImportMeta[]>);
}

export async function getImport(db: Db, id: string): Promise<ImportMeta | undefined> {
  const tx = db.transaction('imports');
  const store = tx.objectStore('imports');
  return requestToPromise(store.get(id) as IDBRequest<ImportMeta | undefined>);
}

const DEFAULT_SETTINGS: AppSettings = {
  key: 'settings',
  defaultDeckName: 'imported',
  defaultSessionSize: 20,
  theme: 'system',
};

export async function getSettings(db: Db): Promise<AppSettings> {
  const tx = db.transaction('settings');
  const store = tx.objectStore('settings');
  const existing = await requestToPromise(store.get('settings') as IDBRequest<AppSettings | undefined>);
  return existing ?? { ...DEFAULT_SETTINGS };
}

export async function saveSettings(db: Db, patch: Partial<Omit<AppSettings, 'key'>>): Promise<AppSettings> {
  const tx = db.transaction('settings', 'readwrite');
  const store = tx.objectStore('settings');
  const current =
    (await requestToPromise(store.get('settings') as IDBRequest<AppSettings | undefined>)) ?? { ...DEFAULT_SETTINGS };
  const next: AppSettings = { ...current, ...patch };
  store.put(next);
  await transactionComplete(tx);
  return next;
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.removeAttribute('data-theme');
  if (theme === 'dark') {
    root.setAttribute('data-theme', 'dark');
  } else if (theme === 'light') {
    root.setAttribute('data-theme', 'light');
  }
  // system: leave unstamped so prefers-color-scheme takes over
}

function transactionComplete(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('Transaction aborted'));
  });
}
