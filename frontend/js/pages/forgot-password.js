/**
 * Password reset (`pages/forgot-password.html`).
 * The form itself is built by `auth.js` so the rules stay with sign-in.
 */

import { registerPage, boot } from '../main.js';
import { $ } from '../lib/dom.js';
import { icon, iconNode } from '../lib/icons.js';
import { initForgotPasswordForm } from '../auth.js';

registerPage('forgot-password', initForgotPassword);

function initForgotPassword() {
  $('[data-brand-mark]')?.append(iconNode('lock'));
  return initForgotPasswordForm($('[data-forgot-root]'));
}

boot();