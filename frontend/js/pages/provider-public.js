/**
 * Public provider profile (`provider-public.html`).
 * The provider id comes from `?id=`; the markup is built in `providers.js`.
 */

import { registerPage, boot } from '../main.js';
import { $ } from '../lib/dom.js';
import { icon, iconNode } from '../lib/icons.js';
import { renderProviderProfile } from '../providers.js';

registerPage('provider-public', initProfile);

function initProfile() {
  // Arrow icon for the back link.
  $('main .btn--ghost span')?.append(iconNode('arrowLeft'));

  const providerId = new URLSearchParams(window.location.search).get('id');

  return renderProviderProfile($('[data-provider-root]'), { providerId });
}

boot();