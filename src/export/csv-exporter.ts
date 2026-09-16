import type { Db } from '../storage/db.js';

const BATCH_SIZE = 1000;

export async function exportCardsToCsv(db: Db, fileName = 'vocab-forge-cards.csv'): Promise<void> {
  const rows: string[] = ['front,back,context,tags,deck,createdAt'];
  let batch: string[] = [];

  function escapeField(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  await iterateCards(db, (card) => {
    const line = [
      escapeField(card.front),
      escapeField(card.back),
      escapeField(card.context ?? ''),
      escapeField((card.tags ?? []).join(', ')),
      escapeField(card.deck ?? ''),
      new Date(card.createdAt).toISOString(),
    ].join(',');
    batch.push(line);

    if (batch.length >= BATCH_SIZE) {
      rows.push(...batch);
      batch = [];
    }
  });

  if (batch.length) rows.push(...batch);

  const csv = rows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, fileName);
}

async function iterateCards(db: Db, callback: (card: { front: string; back: string; context?: string; tags?: string[]; deck?: string; createdAt: number }) => void): Promise<void> {
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
      callback(cursor.value as { front: string; back: string; context?: string; tags?: string[]; deck?: string; createdAt: number });
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

function triggerDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
