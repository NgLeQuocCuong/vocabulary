import type { Db } from '../storage/db.js';

const BATCH_SIZE = 1000;

export async function exportCardsToJson(db: Db, fileName = 'vocab-forge-cards.json'): Promise<void> {
  const chunks: string[] = ['['];
  let batch: string[] = [];
  let first = true;

  function emit(line: string): void {
    batch.push(line);
    if (batch.length >= BATCH_SIZE) {
      chunks.push(...batch);
      batch = [];
    }
  }

  await iterateCards(db, (card) => {
    emit((first ? '' : ',') + JSON.stringify(card));
    first = false;
  });

  if (batch.length) chunks.push(...batch);
  chunks.push(']');

  const blob = new Blob([chunks.join('\n')], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function iterateCards(
  db: Db,
  callback: (card: unknown) => void,
): Promise<void> {
  const tx = db.transaction('cards', 'readonly');
  const store = tx.objectStore('cards');
  const cursorRequest = store.openCursor();

  await new Promise<void>((resolve, reject) => {
    cursorRequest.onsuccess = () => {
      const cursor = cursorRequest.result;
      if (!cursor) {
        resolve();
        return;
      }
      callback(cursor.value);
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
