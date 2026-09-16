const DB_NAME = 'vocab-forge';
const DB_VERSION = 1;

export interface VocabDb {
  db: IDBDatabase;
  transaction: (storeNames: 'cards' | 'imports' | 'settings' | ('cards' | 'imports' | 'settings')[], mode?: IDBTransactionMode) => IDBTransaction;
}

let dbPromise: Promise<VocabDb> | null = null;

export function getDb(): Promise<VocabDb> {
  if (!dbPromise) {
    dbPromise = openDbInternal();
  }
  return dbPromise;
}

function openDbInternal(): Promise<VocabDb> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'));
    request.onsuccess = () => {
      const db = request.result;
      const api: VocabDb = {
        db,
        transaction(storeNames, mode = 'readonly') {
          return db.transaction(storeNames, mode);
        },
      };
      resolve(api);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const oldVersion = event.oldVersion;

      if (oldVersion < 1) {
        const cardStore = db.createObjectStore('cards', { keyPath: 'id', autoIncrement: true });
        cardStore.createIndex('by-deck', 'deck');
        cardStore.createIndex('by-due', 'dueAt');
        cardStore.createIndex('by-front', 'front');
        cardStore.createIndex('by-import', 'importId');

        const importStore = db.createObjectStore('imports', { keyPath: 'id' });
        importStore.createIndex('by-imported-at', 'importedAt');

        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };
  });
}

export async function resetDb(): Promise<void> {
  if (dbPromise) {
    const { db } = await dbPromise;
    db.close();
    dbPromise = null;
  }
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

export type Db = VocabDb;
