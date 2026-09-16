export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: {
    className?: string;
    text?: string;
    html?: string;
    attrs?: Record<string, string>;
    children?: (Node | string)[];
    onClick?: (ev: MouseEvent) => void;
  } = {},
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (options.className) element.className = options.className;
  if (options.text !== undefined) element.textContent = options.text;
  if (options.html !== undefined) element.innerHTML = options.html;
  if (options.attrs) {
    for (const [key, value] of Object.entries(options.attrs)) {
      element.setAttribute(key, value);
    }
  }
  if (options.children) {
    for (const child of options.children) {
      element.append(typeof child === 'string' ? document.createTextNode(child) : child);
    }
  }
  if (options.onClick) {
    element.addEventListener('click', (ev) => options.onClick!(ev as MouseEvent));
  }
  return element;
}

export function showToast(message: string, type: 'info' | 'error' | 'success' = 'info'): void {
  const existing = document.querySelector('.toast');
  existing?.remove();

  const toast = el('div', {
    className: `toast toast-${type}`,
    text: message,
  });
  document.body.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('visible'));
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 250);
  }, 3000);
}
