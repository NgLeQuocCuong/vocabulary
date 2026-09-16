import { parseFile } from './parser.js';
import { shuffleIds } from './shuffle.js';
import type { WorkerRequest, WorkerResponse } from '../types/vocab.js';

const ctx: Worker = self as unknown as Worker;

ctx.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;

  if (request.kind === 'parse') {
    try {
      const { rows } = await parseFile({
        buffer: request.payload,
        delimiter: request.delimiter,
        mapping: request.mapping,
        chunkSize: 1000,
        onProgress(parsed, valid, skipped) {
          const response: WorkerResponse = {
            type: 'progress',
            parsed,
            valid,
            skipped,
            totalBytes: request.payload.byteLength,
            processedBytes: request.payload.byteLength,
          };
          ctx.postMessage(response);
        },
      });

      const response: WorkerResponse = { type: 'complete', rows };
      ctx.postMessage(response);
    } catch (err) {
      ctx.postMessage({ type: 'error', message: (err as Error).message });
    }
  } else if (request.kind === 'shuffle') {
    const total = request.ids.length;
    const chunkSize = Math.max(1, Math.floor(total / 20));

    // Report progress in slices, but keep the shuffle itself fast.
    const response: WorkerResponse = { type: 'shuffle-progress', total, shuffled: 0 };
    ctx.postMessage(response);

    const shuffled = shuffleIds(request.ids);

    for (let i = 0; i <= total; i += chunkSize) {
      const progress: WorkerResponse = {
        type: 'shuffle-progress',
        total,
        shuffled: Math.min(i, total),
      };
      ctx.postMessage(progress);
      if (i < total) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    const final: WorkerResponse = { type: 'shuffle-complete', ids: shuffled };
    ctx.postMessage(final, [shuffled.buffer]);
  }
};
