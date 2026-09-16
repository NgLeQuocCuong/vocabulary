import { getDb, resetDb } from './storage/db.js';
import { getCardCount, putCardsBulk, getAllCards } from './storage/card-store.js';
import { getSettings, saveSettings, applyTheme } from './storage/meta-store.js';
import { buildAppShell, type ScreenName } from './ui/app-shell.js';
import { buildHomeScreen } from './ui/home-screen.js';
import { buildImportScreen } from './ui/import-screen.js';
import { buildStudyScreen } from './ui/study-screen.js';
import { buildSampleDeck, DEFAULT_DECK_NAME } from './utils/sample-data.js';
import { generateId } from './utils/uuid.js';
import { showToast } from './ui/components.js';
import type { Card } from './types/vocab.js';

async function bootstrap(): Promise<void> {
  const db = await getDb();

  // Load or initialize settings.
  let settings = await getSettings(db);
  if (!settings) {
    settings = await saveSettings(db, {
      defaultDeckName: DEFAULT_DECK_NAME,
      defaultSessionSize: 20,
      theme: 'system',
    });
  }
  applyTheme(settings.theme);

  // Seed sample deck on first launch.
  const count = await getCardCount(db);
  if (count === 0) {
    const sampleImportId = generateId();
    const sampleCards = buildSampleDeck(sampleImportId);
    await putCardsBulk(db, sampleCards);
  }

  // Build UI shell.
  const shell = buildAppShell();
  document.body.appendChild(shell.root);

  function clearMain() {
    shell.main.innerHTML = '';
  }

  async function renderHome() {
    clearMain();
    shell.setActiveScreen('home');
    const allCards = await getAllCards(db);
    const home = await buildHomeScreen({
      db,
      cards: allCards,
      onNavigate: (screen) => navigateTo(screen),
      onStartStudy: (cards) => {
        if (cards.length === 0) {
          showToast('No cards to study. Import a deck first.', 'error');
          return;
        }
        renderStudy(cards);
      },
    });
    shell.main.appendChild(home);
  }

  function renderImport() {
    clearMain();
    shell.setActiveScreen('import');
    const imp = buildImportScreen({
      db,
      onComplete: () => navigateTo('home'),
    });
    shell.main.appendChild(imp);
  }

  function renderStudy(cards: Card[]) {
    clearMain();
    shell.setActiveScreen('study');
    const study = buildStudyScreen({
      db,
      cards,
      onFinish: () => navigateTo('home'),
    });
    shell.main.appendChild(study);
  }

  async function navigateTo(screen: ScreenName) {
    if (screen === 'home') {
      await renderHome();
    } else if (screen === 'import') {
      renderImport();
    } else if (screen === 'study') {
      const all = await getAllCards(db);
      const settings = await getSettings(db);
      const shuffled = all.sort(() => Math.random() - 0.5).slice(0, settings.defaultSessionSize);
      renderStudy(shuffled);
    } else {
      navigateTo('home');
    }
  }

  shell.onNavigate((screen) => navigateTo(screen));
  shell.onThemeToggle(async () => {
    const current = await getSettings(db);
    const order: Array<typeof current.theme> = ['system', 'light', 'dark'];
    const nextIndex = (order.indexOf(current.theme) + 1) % order.length;
    const nextTheme = order[nextIndex]!;
    await saveSettings(db, { theme: nextTheme });
    applyTheme(nextTheme);
    showToast(`Theme set to ${nextTheme}`, 'info');
  });

  // Expose a debug reset on the window for development.
  (window as unknown as { resetVocabForge: () => Promise<void> }).resetVocabForge = async () => {
    await resetDb();
    showToast('Database reset. Reload to re-seed.', 'info');
  };

  await renderHome();
}

bootstrap().catch((err) => {
  console.error('Failed to bootstrap Vocab Forge:', err);
  document.body.innerHTML = `
    <div class="fatal-error">
      <h1>Unable to start Vocab Forge</h1>
      <p>${(err as Error).message}</p>
      <p>Try a different browser or clear site data.</p>
    </div>
  `;
});
