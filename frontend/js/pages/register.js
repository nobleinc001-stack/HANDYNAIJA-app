/**
 * Registration (`register.html`).
 * Role selection, validation and submission live in `auth.js`.
 */

import { registerPage, boot } from '../main.js';
import { $ } from '../lib/dom.js';
import { icon, iconNode } from '../lib/icons.js';
import { initRegisterForm } from '../auth.js';

registerPage('register', initRegister);

function initRegister() {
  $('[data-brand-mark]')?.append(iconNode('home'));
  return initRegisterForm($('[data-register-root]'));
}

boot();