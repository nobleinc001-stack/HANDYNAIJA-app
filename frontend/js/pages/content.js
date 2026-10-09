/**
 * Boot helper for the static content pages in `pages/`.
 *
 * These pages carry their copy in the HTML — there is nothing to fetch — so
 * the only job is to register the page id (which keeps `boot()` from warning)
 * and to make sure the shared header and footer still render.
 *
 *   import { bootContent } from './content.js';
 *   bootContent('about');
 *
 * Pass a handler when a page needs behaviour, e.g. the contact form.
 */

import { registerPage, boot } from '../main.js';

/**
 * @param {string} name - must match `data-page` on <body>
 * @param {(context: object) => void|Promise<void>} [handler]
 */
export function bootContent(name, handler = null) {
  registerPage(name, handler ?? (() => {}));
  boot();
}