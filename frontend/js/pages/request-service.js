/**
 * Booking flow (`request-service.html`).
 *
 * Loads the preselected provider (from `?provider=`) so the service list and
 * category are prefilled, then hands off to `initBookingForm`.
 */

import { registerPage, boot } from '../main.js';
import { $ } from '../lib/dom.js';
import { icon, iconNode } from '../lib/icons.js';
import { call } from '../lib/api.js';
import { initBookingForm } from '../requests.js';
import { alertBanner } from '../components/ui.js';

registerPage('request-service', initRequest);

function initRequest() {
  $('main .btn--ghost span')?.append(iconNode('arrowLeft'));

  const providerId = new URLSearchParams(window.location.search).get('provider');

  return initBookingForm($('[data-booking-root]'), {
    providerId,

    // Resolves the provider so the form can offer their real services.
    loadProvider: async (id) => {
      try {
        const { provider } = await call('GET', `/providers/${encodeURIComponent(id)}`, { auth: false });
        return provider;
      } catch {
        return null;
      }
    },

    onCreated: (created) => {
      window.location.href = `request-confirmation.html?id=${encodeURIComponent(created.id)}`;
    },
  });
}

boot();