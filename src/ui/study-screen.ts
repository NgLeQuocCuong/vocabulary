import type { Db } from '../storage/db.js';
import type { Card, Rating } from '../types/vocab.js';
import {
  createSession,
  currentCard,
  flip,
  rate,
  isComplete,
  sessionSummary,
  goBack,
  goForward,
} from '../study/session.js';
import { handleStudyKeydown } from '../study/keyboard.js';
import { updateCardAfterRating } from '../study/scheduler.js';
import { recordRating } from '../storage/card-store.js';
import { el } from './components.js';

export interface StudyScreenProps {
  db: Db;
  cards: Card[];
  onFinish: () => void;
}

const LABELS: Record<Rating, string> = {
  1: 'Again',
  2: 'Hard',
  3: 'Good',
  4: 'Easy',
};

export function buildStudyScreen({ db, cards, onFinish }: StudyScreenProps): HTMLElement {
  let state = createSession(cards);

  const container = el('section', { className: 'screen study-screen' });

  const progress = el('div', { className: 'study-progress' });
  const progressBar = el('div', { className: 'study-progress-bar' });
  const progressFill = el('div', { className: 'study-progress-fill' });
  const progressText = el('div', { className: 'study-progress-text' });
  progressBar.append(progressFill);
  progress.append(progressBar, progressText);

  const cardWrap = el('div', { className: 'card-wrap' });
  const cardInner = el('div', { className: 'card-inner' });
  const cardFront = el('div', { className: 'card-face card-front' });
  const cardBack = el('div', { className: 'card-face card-back' });
  cardInner.append(cardFront, cardBack);
  cardWrap.append(cardInner);

  const controls = el('div', { className: 'study-controls' });
  const flipBtn = el('button', { className: 'btn btn-primary', text: 'Flip (Space)' });
  const ratingGroup = el('div', { className: 'rating-group hidden' });
  const ratingBtns = new Map<Rating, HTMLButtonElement>();

  for (let r = 1 as Rating; r <= 4; r++) {
    const btn = el('button', {
      className: `btn btn-rating rating-${r}`,
      text: `${r} ${LABELS[r as Rating]}`,
    });
    btn.addEventListener('click', () => doRate(r as Rating));
    ratingBtns.set(r as Rating, btn);
    ratingGroup.appendChild(btn);
  }

  controls.append(flipBtn, ratingGroup);

  const hint = el('div', {
    className: 'study-hint',
    html: '<span>Space</span> flip · <span>1–4</span> rate · <span>← →</span> navigate',
  });

  const summary = el('div', { className: 'session-summary hidden' });
  container.append(progress, cardWrap, controls, hint, summary);

  function updateUI() {
    const card = currentCard(state);
    if (!card) {
      finishSession();
      return;
    }

    cardInner.classList.toggle('flipped', state.flipped);
    cardFront.textContent = card.front;
    cardBack.innerHTML = '';
    cardBack.appendChild(el('div', { className: 'card-back-term', text: card.back }));
    if (card.context) {
      cardBack.appendChild(el('div', { className: 'card-context', text: card.context }));
    }
    if (card.deck || card.tags?.length) {
      const meta = el('div', { className: 'card-meta' });
      if (card.deck) meta.appendChild(el('span', { className: 'deck-tag', text: card.deck }));
      for (const tag of card.tags ?? []) {
        meta.appendChild(el('span', { className: 'tag', text: tag }));
      }
      cardBack.appendChild(meta);
    }

    progressText.textContent = `Card ${state.currentIndex + 1} of ${state.queue.length}`;
    const pct = ((state.currentIndex) / state.queue.length) * 100;
    progressFill.style.width = `${pct}%`;

    flipBtn.classList.toggle('hidden', state.flipped);
    ratingGroup.classList.toggle('hidden', !state.flipped);
  }

  function doFlip() {
    state = flip(state);
    updateUI();
  }

  async function doRate(rating: Rating) {
    const card = currentCard(state);
    if (!card) return;

    // Persist the rating asynchronously.
    await recordRating(db, card.id, rating);
    updateCardAfterRating(card, rating);

    state = rate(state, rating);
    updateUI();
  }

  function doNext() {
    if (isComplete(state)) {
      onFinish();
      return;
    }
    state = goForward(state);
    updateUI();
  }

  function doPrevious() {
    state = goBack(state);
    updateUI();
  }

  function finishSession() {
    const stats = sessionSummary(state);
    cardWrap.classList.add('hidden');
    controls.classList.add('hidden');
    hint.classList.add('hidden');
    progress.classList.add('hidden');
    summary.classList.remove('hidden');

    summary.innerHTML = `
      <h3>Session complete</h3>
      <div class="summary-stats">
        <div class="stat"><span class="stat-value">${stats.answered}</span><span class="stat-label">Cards studied</span></div>
        <div class="stat"><span class="stat-value">${stats.accuracy}%</span><span class="stat-label">Accuracy</span></div>
        <div class="stat"><span class="stat-value">${stats.again}</span><span class="stat-label">Again</span></div>
        <div class="stat"><span class="stat-value">${stats.hard}</span><span class="stat-label">Hard</span></div>
      </div>
      ${stats.weakCards.length ? `<h4>Review these</h4>
      <ul class="weak-list">${stats.weakCards.map((c) => `<li><strong>${c.front}</strong> — ${c.back}</li>`).join('')}</ul>` : ''}
      <button class="btn btn-primary finish-btn">Done</button>
    `;

    summary.querySelector('.finish-btn')?.addEventListener('click', () => onFinish());
  }

  flipBtn.addEventListener('click', doFlip);

  const keyboardHandler = (e: KeyboardEvent) =>
    handleStudyKeydown(e, {
      flip: doFlip,
      rate: doRate,
      next: doNext,
      previous: doPrevious,
    });

  document.addEventListener('keydown', keyboardHandler);

  updateUI();
  return container;
}
