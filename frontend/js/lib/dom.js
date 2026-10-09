/**
 * Tiny DOM toolkit. Deliberately small — enough to build components without
 * pulling in a framework.
 */

/**
 * Creates an element.
 *   el('div', { class: 'card', onclick: fn }, 'Hello', el('span', null, '!'))
 */
export function el(tag, props = null, ...children) {
  const node = document.createElement(tag);

  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (value === null || value === undefined || value === false) continue;

      if (key === 'class' || key === 'className') {
        node.className = value;
      } else if (key === 'dataset') {
        Object.assign(node.dataset, value);
      } else if (key === 'style' && typeof value === 'object') {
        applyStyle(node, value);
      } else if (key === 'text') {
        node.textContent = value;
      } else if (key === 'html') {
        node.innerHTML = value;
      } else if (key.startsWith('on') && typeof value === 'function') {
        node.addEventListener(key.slice(2).toLowerCase(), value);
      } else if (key in node && key !== 'list' && typeof value !== 'object') {
        node[key] = value;
      } else {
        node.setAttribute(key, value === true ? '' : value);
      }
    }
  }

  appendAll(node, children);
  return node;
}

/**
 * Applies an inline style object.
 *
 * Custom properties (`--flow`, `--cluster-gap`, …) must go through
 * `setProperty` — assigning them onto the style object is silently ignored by
 * every browser, which would quietly drop the spacing tokens the layout
 * primitives rely on.
 */
function applyStyle(node, styles) {
  for (const [property, value] of Object.entries(styles)) {
    if (value === null || value === undefined || value === false) continue;
    if (property.startsWith('--')) node.style.setProperty(property, String(value));
    else node.style[property] = value;
  }
}

/** Builds an SVG element from a raw markup string (used by the icon set). */
export function svg(markup, { className = '', size } = {}) {
  const wrapper = document.createElement('span');
  wrapper.innerHTML = markup.trim();
  const node = wrapper.firstElementChild;
  if (!node) return null;
  if (className) node.setAttribute('class', className);
  if (size) {
    node.setAttribute('width', size);
    node.setAttribute('height', size);
  }
  node.setAttribute('aria-hidden', 'true');
  node.setAttribute('focusable', 'false');
  return node;
}

function appendAll(parent, children) {
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false || child === true) continue;

    if (child instanceof Node) {
      parent.append(child);
      continue;
    }

    // `icon()` returns SVG markup, and call sites pass it straight through as a
    // child. Parse that markup into real nodes instead of showing it as text.
    const value = String(child);
    if (value.trimStart().startsWith('<svg')) {
      const wrapper = document.createElement('template');
      wrapper.innerHTML = value.trim();
      const node = wrapper.content.firstElementChild;
      if (node) {
        parent.append(node);
        continue;
      }
    }

    parent.append(document.createTextNode(value));
  }
}

/** Document fragment from an HTML string. */
export function frag(htmlString) {
  const template = document.createElement('template');
  template.innerHTML = htmlString.trim();
  return template.content;
}

export const $ = (selector, scope = document) => scope.querySelector(selector);
export const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

/** Replaces a container's children in one operation. */
export function mount(container, ...children) {
  if (!container) return null;
  container.replaceChildren();
  appendAll(container, children);
  return container;
}

export function on(target, eventName, handler, options) {
  if (!target) return () => {};
  const handlerList = eventName.split(' ').map((name) => [name, handler]);
  for (const [name, fn] of handlerList) target.addEventListener(name, fn, options);
  return () => {
    for (const [name, fn] of handlerList) target.removeEventListener(name, fn, options);
  };
}

/** Event delegation — `on(root, 'click', '.btn', handler)` */
export function delegate(root, eventName, selector, handler) {
  return on(root, eventName, (event) => {
    const match = event.target.closest(selector);
    if (match && root.contains(match)) handler(event, match);
  });
}

export function toggleClass(node, className, force) {
  if (!node) return;
  node.classList.toggle(className, force);
}

export function setText(node, text) {
  if (node) node.textContent = text;
}

/** Triggers a CSS transition by removing and re-adding a class next frame. */
export function restartAnimation(node, className) {
  if (!node) return;
  node.classList.remove(className);
  void node.offsetWidth;
  node.classList.add(className);
}

/* ------------------------------------------------------------------ */
/* Formatting helpers                                                  */
/* ------------------------------------------------------------------ */

export function formatCurrency(amount, { compact = false } = {}) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
    notation: compact ? 'compact' : 'standard',
  }).format(amount);
}

export function formatDate(value, options = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!value) return '';
  const date = toDate(value);
  if (!date) return '';
  return new Intl.DateTimeFormat('en-NG', options).format(date);
}

export function formatTime(value) {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{2}:\d{2}$/.test(value)) {
    const [h, m] = value.split(':').map(Number);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
  }
  const date = toDate(value);
  if (!date) return '';
  return new Intl.DateTimeFormat('en-NG', { hour: 'numeric', minute: '2-digit' }).format(date);
}

export function formatDateTime(date, time) {
  if (date && time) return `${formatDate(date)} at ${formatTime(time)}`;
  return formatDate(date || time);
}

function toDate(value) {
  if (value instanceof Date) return value;
  if (typeof value === 'string' && /^\d{2}:\d{2}$/.test(value)) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "2 hours ago", "Yesterday", "12 Mar" — for conversation and activity lists. */
export function formatRelative(value) {
  const date = toDate(value);
  if (!date) return '';

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.round(diffMs / 60_000);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.round(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  return formatDate(date, { day: 'numeric', month: 'short' });
}

export function initials(name) {
  return String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('');
}

export function debounce(fn, wait = 250) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

export function slugify(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** `YYYY-MM-DD` for today, used to seed date inputs. */
export function todayIso(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

export function minIso(offsetMinutes = 60) {
  return new Date(Date.now() + offsetMinutes * 60_000).toISOString().slice(0, 17);
}