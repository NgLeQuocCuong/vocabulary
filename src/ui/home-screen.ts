import type { Db } from '../storage/db.js';
import type { Card } from '../types/vocab.js';
import { getCardCount } from '../storage/card-store.js';
import { getSettings, saveSettings } from '../storage/meta-store.js';
import { exportCardsToCsv } from '../export/csv-exporter.js';
import { exportCardsToJson } from '../export/json-exporter.js';
import { shuffleArray } from '../utils/shuffle.js';
import { el } from './components.js';
import type { ScreenName } from './app-shell.js';

export interface HomeScreenProps {
  db: Db;
  cards: Card[];
  onNavigate: (screen: ScreenName) => void;
  onStartStudy: (cards: Card[]) => void;
}

export async function buildHomeScreen({ db, cards: allCards, onNavigate, onStartStudy }: HomeScreenProps): Promise<HTMLElement> {
  const container = el('section', { className: 'screen home-screen' });

  const count = await getCardCount(db);
  const settings = await getSettings(db);

  const hero = el('div', { className: 'hero' });
  const title = el('h1', { text: 'Ready to review?' });
  const subtitle = el('p', {
    text: count === 0
      ? 'Start by importing your vocabulary list, or study the built-in sample deck.'
      : `You have ${count.toLocaleString()} card${count === 1 ? '' : 's'} ready to study.`,
  });
  hero.append(title, subtitle);

  const actions = el('div', { className: 'action-grid' });

  const importBtn = el('button', { className: 'card-action', text: 'Import cards' });
  const studyBtn = el('button', { className: 'card-action card-action-primary', text: 'Start study session' });
  const exportBtn = el('button', { className: 'card-action', text: 'Export data' });

  importBtn.addEventListener('click', () => onNavigate('import'));
  studyBtn.addEventListener('click', () => {
    if (allCards.length === 0) return;
    // Limit session size per settings and shuffle.
    const sessionCards = shuffleArray(allCards).slice(0, settings.defaultSessionSize);
    onStartStudy(sessionCards);
  });
  exportBtn.addEventListener('click', () => {
    const menu = el('div', { className: 'export-menu' });
    const csvBtn = el('button', { className: 'btn', text: 'Export CSV' });
    const jsonBtn = el('button', { className: 'btn', text: 'Export JSON' });
    csvBtn.addEventListener('click', () => exportCardsToCsv(db));
    jsonBtn.addEventListener('click', () => exportCardsToJson(db));
    menu.append(csvBtn, jsonBtn);

    const existing = document.querySelector('.export-menu');
    existing?.remove();
    exportBtn.after(menu);
  });

  actions.append(importBtn, studyBtn, exportBtn);

  const settingsSection = el('div', { className: 'settings-section' });
  const settingsTitle = el('h3', { text: 'Session settings' });
  const sizeLabel = el('label', { text: 'Cards per session', attrs: { for: 'session-size' } });
  const sizeInput = el('input', {
    attrs: {
      id: 'session-size',
      type: 'number',
      min: '1',
      max: '500',
      value: String(settings.defaultSessionSize),
    },
  });
  sizeInput.addEventListener('change', async () => {
    const value = parseInt(sizeInput.value, 10);
    if (value > 0 && value <= 500) {
      await saveSettings(db, { defaultSessionSize: value });
    }
  });

  settingsSection.append(settingsTitle, sizeLabel, sizeInput);
  container.append(hero, actions, settingsSection);

  return container;
}
