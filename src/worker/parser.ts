import type { ImportMeta, ParsedRow } from '../types/vocab.js';

const TextDecoderConstructor: typeof TextDecoder = globalThis.TextDecoder;

const COLUMN_ALIASES: Record<string, string[]> = {
  front: ['front', 'term', 'word', 'phrase'],
  back: ['back', 'definition', 'meaning', 'translation', 'answer'],
  context: ['context', 'example', 'sentence', 'note', 'notes'],
  deck: ['deck', 'category', 'group'],
  tags: ['tags', 'tag', 'labels'],
};

function guessDelimiter(firstLine: string): ',' | '\t' {
  const tabs = firstLine.split('\t').length - 1;
  const commas = firstLine.split(',').length - 1;
  return tabs >= commas ? '\t' : ',';
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, '-');
}

export function buildColumnMap(
  headers: string[],
  explicitMapping?: Partial<ImportMeta['mapping']>,
): ImportMeta['mapping'] {
  const normalized = headers.map(normalizeHeader);
  const pick = (candidates: string[]): string | undefined => {
    for (const alias of candidates) {
      const idx = normalized.indexOf(alias);
      if (idx >= 0) return headers[idx];
    }
    return undefined;
  };

  const front = explicitMapping?.front ?? pick(COLUMN_ALIASES.front);
  const back = explicitMapping?.back ?? pick(COLUMN_ALIASES.back);
  if (!front || !back) {
    throw new Error('Could not identify required front and back columns.');
  }

  return {
    front,
    back,
    context: explicitMapping?.context ?? pick(COLUMN_ALIASES.context),
    deck: explicitMapping?.deck ?? pick(COLUMN_ALIASES.deck),
    tags: explicitMapping?.tags ?? pick(COLUMN_ALIASES.tags),
  };
}

function decodeBuffer(buffer: ArrayBuffer): string {
  // Try UTF-8 first; if a BOM is present the TextDecoder strips it.
  const decoder = new TextDecoderConstructor('utf-8', { fatal: false, ignoreBOM: false });
  return decoder.decode(buffer);
}

function parseCsvRow(line: string, delimiter: ',' | '\t'): string[] {
  const fields: string[] = [];
  let current = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (insideQuotes) {
      if (char === '"') {
        if (next === '"') {
          current += '"';
          i++; // skip escaped quote
        } else {
          insideQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        insideQuotes = true;
      } else if (char === delimiter) {
        fields.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

export interface ParseOptions {
  buffer: ArrayBuffer;
  delimiter?: ',' | '\t';
  mapping?: Partial<ImportMeta['mapping']>;
  onProgress?: (parsed: number, valid: number, skipped: number) => void;
  chunkSize?: number;
}

export async function parseFile(options: ParseOptions): Promise<{
  rows: ParsedRow[];
  headers: string[];
  mapping: ImportMeta['mapping'];
  delimiter: ',' | '\t';
}> {
  const { buffer, mapping, onProgress, chunkSize = 1000 } = options;
  const text = decodeBuffer(buffer);
  const lines = text.split(/\r?\n|\r/).filter((line) => line.length > 0);

  if (lines.length === 0) {
    throw new Error('File is empty.');
  }

  const delimiter = options.delimiter ?? guessDelimiter(lines[0]!);
  const headers = parseCsvRow(lines[0]!, delimiter);
  const resolvedMapping = buildColumnMap(headers, mapping);

  const colIndex = (name?: string): number => (name ? headers.indexOf(name) : -1);
  const frontIdx = colIndex(resolvedMapping.front);
  const backIdx = colIndex(resolvedMapping.back);
  const contextIdx = colIndex(resolvedMapping.context);
  const deckIdx = colIndex(resolvedMapping.deck);
  const tagsIdx = colIndex(resolvedMapping.tags);

  const rows: ParsedRow[] = [];
  let parsed = 0;
  let valid = 0;
  let skipped = 0;

  for (let i = 1; i < lines.length; i++) {
    parsed++;
    const fields = parseCsvRow(lines[i]!, delimiter);
    const front = fields[frontIdx]?.trim() ?? '';
    const back = fields[backIdx]?.trim() ?? '';

    if (!front || !back) {
      skipped++;
      continue;
    }

    valid++;
    rows.push({
      front,
      back,
      context: contextIdx >= 0 ? fields[contextIdx]?.trim() || undefined : undefined,
      deck: deckIdx >= 0 ? fields[deckIdx]?.trim() || undefined : undefined,
      tags: tagsIdx >= 0 ? fields[tagsIdx]?.trim() || undefined : undefined,
      sourceRow: i + 1, // 1-based line number
    });

    if (i % chunkSize === 0 || i === lines.length - 1) {
      onProgress?.(parsed, valid, skipped);
      // Yield to event loop every chunk to keep the worker responsive.
      if (i % chunkSize === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
  }

  onProgress?.(parsed, valid, skipped);
  return { rows, headers, mapping: resolvedMapping, delimiter };
}
