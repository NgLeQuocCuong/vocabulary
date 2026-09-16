import type { Db } from './db.js';
import type { Card, NewCard, Rating } from '../types/vocab.js';
import { requestToPromise } from './db.js';

export async function getAllCards(db: Db): Promise<Card[]> {
  const tx = db.transaction('cards');
  const store = tx.objectStore('cards');
  return requestToPromise(store.getAll() as IDBRequest<Card[]>);
}

export async function getCardsByDeck(db: Db, deck: string): Promise<Card[]> {
  const tx = db.transaction('cards');
  const index = tx.objectStore('cards').index('by-deck');
  return requestToPromise(index.getAll(deck) as IDBRequest<Card[]>);
}

export async function getCardsByImport(db: Db, importId: string): Promise<Card[]> {
  const tx = db.transaction('cards');
  const index = tx.objectStore('cards').index('by-import');
  return requestToPromise(index.getAll(importId) as IDBRequest<Card[]>);
}

export async function getCard(db: Db, id: number): Promise<Card | undefined> {
  const tx = db.transaction('cards');
  const store = tx.objectStore('cards');
  return requestToPromise(store.get(id) as IDBRequest<Card | undefined>);
}

export async function getCardCount(db: Db): Promise<number> {
  const tx = db.transaction('cards');
  const store = tx.objectStore('cards');
  return requestToPromise(store.count() as IDBRequest<number>);
}

export async function putCard(db: Db, card: Card): Promise<number> {
  const tx = db.transaction('cards', 'readwrite');
  const store = tx.objectStore('cards');
  return requestToPromise(store.put(card) as IDBRequest<number>);
}

export async function putCardsBulk(db: Db, cards: NewCard[]): Promise<void> {
  const tx = db.transaction('cards', 'readwrite');
  const store = tx.objectStore('cards');
  for (const card of cards) {
    store.put(card);
  }
  await transactionComplete(tx);
}

export async function recordRating(db: Db, id: number, rating: Rating): Promise<void> {
  const tx = db.transaction('cards', 'readwrite');
  const store = tx.objectStore('cards');
  const card = await requestToPromise(store.get(id) as IDBRequest<Card | undefined>);
  if (!card) {
    await transactionComplete(tx);
    return;
  }
  card.lastRating = rating;
  card.lastStudiedAt = Date.now();
  store.put(card);
  await transactionComplete(tx);
}

export async function deleteCardsByImport(db: Db, importId: string): Promise<void> {
  const tx = db.transaction('cards', 'readwrite');
  const index = tx.objectStore('cards').index('by-import');
  const cursorRequest = index.openCursor(importId);
  await new Promise<void>((resolve, reject) => {
    cursorRequest.onsuccess = () => {
      const cursor = cursorRequest.result;
      if (!cursor) {
        resolve();
        return;
      }
      cursor.delete();
      cursor.continue();
    };
    cursorRequest.onerror = () => reject(cursorRequest.error);
  });
  await transactionComplete(tx);
}

function transactionComplete(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('Transaction aborted'));
  });
}
