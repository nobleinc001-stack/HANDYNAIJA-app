/**
 * Page bootstrap.
 *
 * Every page imports this, registers its entry point, then calls `boot()`:
 *
 *   import { registerPage, boot } from './js/main.js';
 *   registerPage('landing', initLanding);
 *   boot();
 *
 * `boot()` renders the shared chrome (header, footer), applies the auth guard
 * declared on <body>, then hands off to the page-specific entry point.
 *
 * Declarative contract on <body>:
 *   data-page        — page id, used for the entry-point registry
 *   data-auth        — "required" | "optional" | "customer" | "provider" | "admin"
 *   data-depth       — "nested" when the page lives in pages/
 *   data-header      — "public" | "customer" | "provider" | "admin" (forces a nav set)
 *   data-overlay     — "true" for a transparent header over a hero
 *   data-mock        — "false" disables the mock API fallback
 *   data-api-base    — override the API origin
 */

import { $ } from './lib/dom.js';
import { ROLES } from '../../shared/constants.js';
import * as auth from './auth.js';
import { renderHeader } from './components/navbar.js';
import { renderFooter } from './components/footer.js';
import { toast } from './components/ui.js';

const AUTH_MODES = {
  required: { roles: null, optional: false },
  optional: { roles: null, optional: true },
  customer: { roles: [ROLES.CUSTOMER], optional: false },
  provider: { roles: [ROLES.PROVIDER], optional: false },
  admin: { roles: [ROLES.ADMIN], optional: false },
  public: { roles: null, optional: true },
};

/**
 * Registers a page entry point. Called before `boot()` in page scripts.
 * @param {string} name - matches `data-page` on <body>
 * @param {(context:object)=>void|Promise<void>} handler
 */
const pageHandlers = new Map();

export function registerPage(name, handler) {
  pageHandlers.set(name, handler);
}

export async function boot() {
  const body = document.body;
  const page = body.dataset.page;

  // Tells js/boot-guard.js that the modules loaded and the page took over, so
  // it stands down instead of showing its "could not start" diagnostic.
  document.documentElement.dataset.appBooted = 'true';

  // Shared chrome first so guards and errors have a place to render.
  renderHeader({
    variant: body.dataset.header === 'auto' || !body.dataset.header ? null : body.dataset.header,
    overlay: body.dataset.overlay === 'true',
  });
  renderFooter();

  applyAuthMode(body.dataset.auth);

  const handler = pageHandlers.get(page);
  if (!handler) {
    if (page) console.warn(`[boot] No handler registered for page "${page}".`);
    return;
  }

  try {
    await handler({ user: auth.currentUser(), role: auth.currentRole(), body });
  } catch (error) {
    console.error(`[boot] "${page}" failed to initialise.`, error);
    const slot = $('[data-page-error]');
    if (slot) {
      slot.textContent = 'This page could not load properly. Try refreshing.';
      slot.classList.remove('hidden');
    }
    toast(error?.userMessage ?? 'Something went wrong loading this page.', { variant: 'danger' });
  }
}

function applyAuthMode(mode) {
  if (!mode) return;
  const config = AUTH_MODES[mode];
  if (!config) return;
  auth.requireAuth(config);
}

/** Marks a page as still loading — cleared once its handler resolves. */
export function markLoaded(selector = '[data-page-loading]') {
  const node = $(selector);
  if (node) node.remove();
}