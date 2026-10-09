/**
 * Request details (`request-details.html`).
 *
 * Shared by customers and providers — `renderRequestDetails` picks the right
 * navigation set and action buttons from the signed-in role.
 */

import { registerPage, boot } from '../main.js';
import { $ } from '../lib/dom.js';
import { ROLES } from '../../../shared/constants.js';
import { renderShell, appendUserChip } from '../components/shell.js';
import { renderRequestDetails } from '../requests.js';
import * as store from '../lib/store.js';

registerPage('request-details', initDetails);

function initDetails() {
  const requestId = new URLSearchParams(window.location.search).get('id');
  const role = store.getRole() ?? ROLES.CUSTOMER;

  const content = renderShell({
    role,
    title: 'Request details',
    subtitle: requestId ?? '',
    backHref: role === ROLES.PROVIDER ? 'provider-requests.html' : 'my-requests.html',
    backLabel: 'Back to requests',
  });

  appendUserChip(content);

  const slot = document.createElement('div');
  slot.setAttribute('data-details-root', '');
  content.append(slot);

  return renderRequestDetails(slot, { requestId, role });
}

boot();