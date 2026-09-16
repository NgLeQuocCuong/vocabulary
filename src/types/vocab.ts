export type Rating = 1 | 2 | 3 | 4;

export interface Card {
  id: number;
  front: string;
  back: string;
  context?: string;
  tags?: string[];
  deck?: string;
  createdAt: number;
  importId: string;

  // Future-proof SRS fields; unused by v1 scheduling
  interval: number;
  repetitions: number;
  easeFactor: number;
  dueAt: number;

  lastRating?: Rating;
  lastStudiedAt?: number;
}

export type NewCard = Omit<Card, 'id'>;

export interface ImportMeta {
  id: string;
  fileName: string;
  rowCount: number;
  importedCount: number;
  skippedCount: number;
  delimiter: 'csv' | 'tsv';
  mapping: {
    front: string;
    back: string;
    context?: string;
    deck?: string;
    tags?: string;
  };
  importedAt: number;
}

export type Theme = 'system' | 'light' | 'dark';

export interface AppSettings {
  key: 'settings';
  defaultDeckName: string;
  defaultSessionSize: number;
  theme: Theme;
}

export type ParsedRow = {
  front: string;
  back: string;
  context?: string;
  tags?: string;
  deck?: string;
  sourceRow: number;
};

export type ImportProgress = {
  type: 'progress';
  parsed: number;
  valid: number;
  skipped: number;
  totalBytes: number;
  processedBytes: number;
};

export type ImportResult = {
  type: 'complete';
  rows: ParsedRow[];
};

export type ShuffleProgress = {
  type: 'shuffle-progress';
  total: number;
  shuffled: number;
};

export type ShuffleResult = {
  type: 'shuffle-complete';
  ids: Int32Array;
};

export type WorkerRequest =
  | { kind: 'parse'; payload: ArrayBuffer; delimiter: ',' | '\t'; mapping: ImportMeta['mapping'] }
  | { kind: 'shuffle'; ids: Int32Array };

export type WorkerResponse = ImportProgress | ImportResult | ShuffleProgress | ShuffleResult;
