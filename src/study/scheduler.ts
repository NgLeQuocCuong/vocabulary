// Spaced-repetition scheduler placeholder.
// v1 records ratings on cards but does not schedule future reviews.
// This module will later implement an SM-2-like algorithm using the
// interval, repetitions, easeFactor, and dueAt fields already stored.

import type { Card, Rating } from '../types/vocab.js';

export function updateCardAfterRating(card: Card, rating: Rating): void {
  // v1: only store the rating and timestamp.
  card.lastRating = rating;
  card.lastStudiedAt = Date.now();
}
