import type { Db } from '../storage/db.js';
import type { NewCard, ImportMeta, ParsedRow, WorkerResponse } from '../types/vocab.js';
import { generateId } from '../utils/uuid.js';
import { putCardsBulk } from '../storage/card-store.js';
import { recordImport } from '../storage/meta-store.js';
import WorkerScript from '../worker/worker.ts?worker';

const BATCH_SIZE = 1000;

export interface ImportCallbacks {
  onProgress: (parsed: number, valid: number, skipped: number) => void;
  onComplete: (meta: ImportMeta, rows: ParsedRow[]) => void;
  onError: (message: string) => void;
}

function toNewCard(row: ParsedRow, importId: string): NewCard {
  const now = Date.now();
  return {
    front: row.front,
    back: row.back,
    context: row.context,
    tags: row.tags ? row.tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
    deck: row.deck,
    createdAt: now,
    importId,
    interval: 0,
    repetitions: 0,
    easeFactor: 2.5,
    dueAt: now,
  };
}

export async function importFile(
  db: Db,
  file: File,
  mapping: Partial<ImportMeta['mapping']>,
  callbacks: ImportCallbacks,
): Promise<void> {
  const worker = new WorkerScript();
  const buffer = await file.arrayBuffer();

  // Infer delimiter from file extension; user can override later.
  const fileDelimiter: ',' | '\t' = file.name.toLowerCase().endsWith('.tsv') ? '\t' : ',';
  const delimiter: 'csv' | 'tsv' = fileDelimiter === '\t' ? 'tsv' : 'csv';

  worker.onmessage = async (event: MessageEvent<WorkerResponse | { type: 'error'; message: string }>) => {
    const data = event.data;

    if (data.type === 'progress') {
      callbacks.onProgress(data.parsed, data.valid, data.skipped);
    } else if (data.type === 'complete') {
      const rows = data.rows;
      const importId = generateId();
      const newCards = rows.map((row) => toNewCard(row, importId));

      // Write to IndexedDB in batches.
      for (let i = 0; i < newCards.length; i += BATCH_SIZE) {
        const batch = newCards.slice(i, i + BATCH_SIZE);
        await putCardsBulk(db, batch);
      }

      const meta: ImportMeta = {
        id: importId,
        fileName: file.name,
        rowCount: rows.length,
        importedCount: newCards.length,
        skippedCount: 0, // already filtered by parser
        delimiter,
        mapping: {
          front: mapping.front ?? 'front',
          back: mapping.back ?? 'back',
          context: mapping.context,
          deck: mapping.deck,
          tags: mapping.tags,
        },
        importedAt: Date.now(),
      };

      await recordImport(db, meta);
      worker.terminate();
      callbacks.onComplete(meta, rows);
    } else if (data.type === 'error') {
      worker.terminate();
      callbacks.onError(data.message);
    }
  };

  worker.onerror = (err) => {
    worker.terminate();
    callbacks.onError(err.message ?? 'Worker failed');
  };

  worker.postMessage({
    kind: 'parse',
    payload: buffer,
    delimiter: fileDelimiter,
    mapping,
  });
}
