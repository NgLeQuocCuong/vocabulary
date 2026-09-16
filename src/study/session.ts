import type { Card, Rating } from '../types/vocab.js';

export interface SessionState {
  queue: Card[];
  currentIndex: number;
  flipped: boolean;
  results: Map<number, Rating>;
}

export function createSession(cards: Card[]): SessionState {
  return {
    queue: [...cards],
    currentIndex: 0,
    flipped: false,
    results: new Map(),
  };
}

export function currentCard(state: SessionState): Card | undefined {
  return state.queue[state.currentIndex];
}

export function flip(state: SessionState): SessionState {
  return { ...state, flipped: true };
}

export function rate(state: SessionState, rating: Rating): SessionState {
  const card = currentCard(state);
  if (!card) return state;

  const nextResults = new Map(state.results);
  nextResults.set(card.id, rating);

  return {
    ...state,
    flipped: false,
    currentIndex: state.currentIndex + 1,
    results: nextResults,
  };
}

export function goBack(state: SessionState): SessionState {
  if (state.currentIndex <= 0) return state;
  return { ...state, currentIndex: state.currentIndex - 1, flipped: false };
}

export function goForward(state: SessionState): SessionState {
  if (state.currentIndex >= state.queue.length - 1) return state;
  return { ...state, currentIndex: state.currentIndex + 1, flipped: false };
}

export function isComplete(state: SessionState): boolean {
  return state.currentIndex >= state.queue.length;
}

export function sessionSummary(state: SessionState) {
  const total = state.queue.length;
  const answered = state.results.size;
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0 } as Record<Rating, number>;
  const weakCards: Card[] = [];

  for (const [id, rating] of state.results) {
    counts[rating]++;
    if (rating <= 2) {
      const card = state.queue.find((c) => c.id === id);
      if (card) weakCards.push(card);
    }
  }

  return {
    total,
    answered,
    correct: counts[3] + counts[4],
    hard: counts[2],
    again: counts[1],
    accuracy: answered > 0 ? Math.round(((counts[3] + counts[4]) / answered) * 100) : 0,
    weakCards,
  };
}
