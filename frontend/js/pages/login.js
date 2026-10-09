/**
 * Sign in (`login.html`).
 * Form, demo-account quick fill and redirect handling all live in `auth.js`.
 */

import { registerPage, boot } from '../main.js';
import { $ } from '../lib/dom.js';
import { icon, iconNode } from '../lib/icons.js';
import { initLoginForm } from '../auth.js';

registerPage('login', initLogin);

function initLogin() {
  $('[data-brand-mark]')?.append(iconNode('home'));
  return initLoginForm($('[data-login-root]'));
}

boot();