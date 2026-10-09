/**
 * Inline SVG icon set.
 *
 * Icons are plain markup strings so they can be dropped anywhere without a
 * build step. All icons are decorative — callers must supply the accessible
 * name on the surrounding control.
 */

import { svg } from './dom.js';

const wrap = (body, { stroke = true } = {}) =>
  `<svg viewBox="0 0 24 24" fill="${stroke ? 'none' : 'currentColor'}" ${
    stroke
      ? 'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"'
      : ''
  } aria-hidden="true" focusable="false">${body}</svg>`;

const FILLED = (body) => `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">${body}</svg>`;

export const icons = {
  /* Navigation & chrome */
  menu: wrap('<path d="M3 6h18M3 12h18M3 18h18"/>'),
  close: wrap('<path d="M18 6 6 18M6 6l12 12"/>'),
  search: wrap('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
  bell: wrap('<path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>'),
  user: wrap('<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>'),
  users: wrap('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 5.5a3.5 3.5 0 0 1 0 7"/><path d="M18 14.5a6 6 0 0 1 3.5 5.5"/>'),
  home: wrap('<path d="m3 10 9-7 9 7v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 21v-7h6v7"/>'),
  grid: wrap('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'),
  settings: wrap('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1"/>'),
  logout: wrap('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>'),
  login: wrap('<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="m10 17 5-5-5-5"/><path d="M15 12H3"/>'),
  chevronDown: wrap('<path d="m6 9 6 6 6-6"/>'),
  chevronRight: wrap('<path d="m9 6 6 6-6 6"/>'),
  chevronLeft: wrap('<path d="m15 6-6 6 6 6"/>'),
  arrowRight: wrap('<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>'),
  arrowLeft: wrap('<path d="M19 12H5"/><path d="m11 18-6-6 6-6"/>'),
  externalLink: wrap('<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14 21 3"/>'),
  filter: wrap('<path d="M3 5h18l-7 8v6l-4 2v-8z"/>'),
  more: wrap('<circle cx="12" cy="5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="19" r="1.4"/>'),

  /* Status & feedback */
  check: wrap('<path d="m20 6-11 11-5-5"/>'),
  checkCircle: wrap('<circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/>'),
  xCircle: wrap('<circle cx="12" cy="12" r="9"/><path d="m15 9-6 6M9 9l6 6"/>'),
  alert: wrap('<circle cx="12" cy="12" r="9"/><path d="M12 8v5"/><circle cx="12" cy="16" r="0.6" fill="currentColor"/>'),
  info: wrap('<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><circle cx="12" cy="8" r="0.6" fill="currentColor"/>'),
  clock: wrap('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  star: FILLED('<path d="m12 3.6 2.6 5.3 5.8.85-4.2 4.1 1 5.78L12 16.9l-5.2 2.73 1-5.78-4.2-4.1 5.8-.85z"/>'),
  starOutline: wrap('<path d="m12 4 2.5 5.1 5.6.8-4.05 3.95.96 5.57L12 16.8l-5.01 2.62.96-5.57L4 9.9l5.6-.8z"/>'),

  /* Domain */
  briefcase: wrap('<rect x="2.5" y="7" width="19" height="13" rx="2"/><path d="M8.5 7V5.5A1.5 1.5 0 0 1 10 4h4a1.5 1.5 0 0 1 1.5 1.5V7"/><path d="M2.5 12.5h19"/>'),
  calendar: wrap('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M8 3v4M16 3v4"/>'),
  message: wrap('<path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'),
  send: wrap('<path d="M21 3 3 10.5l7 2.6 2.6 7z"/><path d="M10 13.5 21 3"/>'),
  pin: wrap('<path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11"/><circle cx="12" cy="10" r="2.5"/>'),
  starBadge: wrap('<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>'),
  shield: wrap('<path d="M12 3 5 6v6c0 4.5 3 8 7 9 4-1 7-4.5 7-9V6z"/><path d="m9 12 2 2 4-4"/>'),
  verified: wrap('<path d="m12 3 2.2 2 3-.3.6 3 2.4 1.8-1.4 2.7 1.4 2.7-2.4 1.8-.6 3-3-.3-2.2 2-2.2-2-3 .3-.6-3L4.6 14l1.4-2.7L4.6 8.6 7 6.8l.6-3 3 .3z"/><path d="m9.2 12.2 2 2 3.6-4"/>'),
  phone: wrap('<path d="M21 16.5v3a2 2 0 0 1-2.2 2 19.5 19.5 0 0 1-8.5-3 19 19 0 0 1-5.9-5.9 19.5 19.5 0 0 1-3-8.6A2 2 0 0 1 3.4 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L7.5 9.7a16 16 0 0 0 5.9 5.9l1.1-1.1a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.6 1.8"/>'),
  mail: wrap('<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>'),
  lock: wrap('<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>'),
  eye: wrap('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7"/><circle cx="12" cy="12" r="3"/>'),
  eyeOff: wrap('<path d="M10.7 6.2A9.9 9.9 0 0 1 12 6c6.4 0 10 6 10 6a17 17 0 0 1-3 3.7"/><path d="M6.5 7.7A17 17 0 0 0 2 12s3.6 6 10 6a9.7 9.7 0 0 0 4-.8"/><path d="m3 3 18 18"/><path d="M9.9 10a3 3 0 0 0 4.2 4.2"/>'),
  plus: wrap('<path d="M12 5v14M5 12h14"/>'),
  edit: wrap('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7.5 18.5 3 20l1.5-4.5z"/>'),
  trash: wrap('<path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"/><path d="M9 7V4h6v3"/>'),
  upload: wrap('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m8 8 4-4 4 4"/><path d="M12 4v12"/>'),
  image: wrap('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="m4 17 5-5 4 4 2.5-2.5L20 17"/>'),
  flag: wrap('<path d="M5 21V4"/><path d="M5 5h11l-2 3.5L16 12H5"/>'),
  chart: wrap('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
  inbox: wrap('<path d="M3 12h5l2 3h4l2-3h5"/><path d="M5.5 5h13l2.5 7v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6z"/>'),
  wallet: wrap('<path d="M3 7a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2"/><path d="M3 7v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7H6a3 3 0 0 1 0-6"/><circle cx="17" cy="13" r="1" fill="currentColor"/>'),
  wrench: wrap('<path d="M14.5 6.5a4.5 4.5 0 0 0 5.8 5.8l-8 8a2.8 2.8 0 1 1-4-4l8-8a4.5 4.5 0 0 1-1.8-1.8z"/>'),

  /* Service categories */
  bolt: wrap('<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>'),
  droplet: wrap('<path d="M12 3s6 6.5 6 10.5a6 6 0 0 1-12 0C6 9.5 12 3 12 3"/>'),
  car: wrap('<path d="M5 17h14"/><path d="M6.5 17V11l1.8-4.3A2 2 0 0 1 10.1 5.5h3.8a2 2 0 0 1 1.8 1.2L17.5 11v6"/><circle cx="7.5" cy="14.5" r="1.3"/><circle cx="16.5" cy="14.5" r="1.3"/>'),
  book: wrap('<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5A2.5 2.5 0 0 1 4 20.5"/>'),
  laptop: wrap('<rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M2 19h20"/>'),
  scissors: wrap('<circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><path d="M8 7.5 20 18M20 6 8 16.5"/>'),
  spray: wrap('<path d="M9 10h6v9a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z"/><path d="M10 10V6a2 2 0 0 1 2-2h1"/><path d="M15 8h5M17.5 5.5h2.5"/>'),
  brush: wrap('<path d="M9.5 14.5 4 20"/><path d="M14 4.5 19.5 10 12 17.5 6.5 12z"/>'),

  /* Brand mark */
  logo: FILLED('<path d="M13.4 2.2a1 1 0 0 0-1.5 0L3.3 11.4a1 1 0 0 0 .7 1.7h4.3v4.6a1 1 0 0 0 .8 1l1.6.5a1 1 0 0 0 1.3-.9V13.1h5.6a1 1 0 0 0 .7-1.7z"/>'),
};

/** Returns the markup string for an icon name. */
export function icon(name, className = '') {
  const markup = icons[name];
  if (!markup) {
    console.warn(`[icons] Unknown icon: "${name}"`);
    return wrap('');
  }
  if (!className) return markup;
  return markup.replace('<svg ', `<svg class="${className}" `);
}

/**
 * Returns an icon as a real SVG *element* rather than a markup string.
 *
 * Use this whenever an icon goes into an element that already exists via the
 * native DOM API. `node.append('<svg …>')` does not parse the string — it
 * inserts it as a text node, so the raw markup ends up painted on the page.
 * Passing the element from here avoids that entirely.
 *
 * @param {string} name
 * @param {string} [className]
 * @returns {SVGElement|null}
 */
export function iconNode(name, className = '') {
  return svg(icon(name, className));
}

/** Inline star row used for ratings. */
export function starRow(rating, { className = 'rating__star' } = {}) {
  const rounded = Math.round(Number(rating) || 0);
  return Array.from({ length: 5 }, (_, index) => {
    const filled = index < rounded;
    return icon(filled ? 'star' : 'starOutline', className).replace(
      '<svg ',
      `<svg data-star="${index + 1}" data-filled="${filled}" `
    );
  });
}