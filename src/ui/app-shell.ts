import { el } from './components.js';

export type ScreenName = 'home' | 'import' | 'study' | 'summary';

export interface AppShell {
  root: HTMLElement;
  main: HTMLElement;
  nav: HTMLElement;
  setActiveScreen: (screen: ScreenName) => void;
  onNavigate: (handler: (screen: ScreenName) => void) => void;
  onThemeToggle: (handler: () => void) => void;
}

export function buildAppShell(): AppShell {
  const root = el('div', { className: 'app-shell' });

  const header = el('header', { className: 'app-header' });
  const brand = el('div', { className: 'brand', text: 'Vocab Forge' });
  const nav = el('nav', { className: 'app-nav' });

  const themeBtn = el('button', {
    className: 'icon-btn',
    text: '🌓',
    attrs: { 'aria-label': 'Toggle theme', title: 'Toggle theme' },
  });

  header.append(brand, nav, themeBtn);

  const main = el('main', { className: 'app-main' });
  root.append(header, main);

  const buttons: Record<ScreenName, HTMLButtonElement> = {
    home: el('button', { className: 'nav-btn active', text: 'Home' }),
    import: el('button', { className: 'nav-btn', text: 'Import' }),
    study: el('button', { className: 'nav-btn', text: 'Study' }),
    summary: el('button', { className: 'nav-btn', text: 'Summary' }),
  };

  for (const [name, btn] of Object.entries(buttons)) {
    nav.appendChild(btn);
    btn.addEventListener('click', () => {
      navigateHandlers.forEach((h) => h(name as ScreenName));
    });
  }

  const navigateHandlers: ((screen: ScreenName) => void)[] = [];
  const themeHandlers: (() => void)[] = [];

  themeBtn.addEventListener('click', () => {
    themeHandlers.forEach((h) => h());
  });

  const shell: AppShell = {
    root,
    main,
    nav,
    setActiveScreen(screen) {
      for (const [name, btn] of Object.entries(buttons)) {
        btn.classList.toggle('active', name === screen);
      }
    },
    onNavigate(handler) {
      navigateHandlers.push(handler);
    },
    onThemeToggle(handler) {
      themeHandlers.push(handler);
    },
  };

  return shell;
}
