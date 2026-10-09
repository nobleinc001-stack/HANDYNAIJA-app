/**
 * Provider request queue (`provider-requests.html`).
 * Accept, decline and status updates happen inline via `requests.js`.
 */

import { registerPage, boot } from '../main.js';
import { el } from '../lib/dom.js';
import { ROLES } from '../../../shared/constants.js';
import { renderShell, appendUserChip, pageHead } from '../components/shell.js';
import { renderProviderRequestQueue } from '../requests.js';

registerPage('provider-requests', initQueue);

function initQueue() {
  const content = renderShell({
    role: ROLES.PROVIDER,
    title: 'Request queue',
    subtitle: 'Respond quickly to keep your rating up',
  });

  appendUserChip(content);

  const slot = el('div');
  content.append(
    pageHead('Incoming requests', 'Accept, decline, and move jobs through their stages.'),
    slot
  );

  return renderProviderRequestQueue(slot);
}

boot();