/**
 * Messaging (`messages.html`).
 * Conversation list + thread, built by `initMessaging`.
 */

import { registerPage, boot } from '../main.js';
import { ROLES } from '../../shared/constants.js';
import { renderShell } from '../components/shell.js';
import { initMessaging } from '../messages.js';
import * as store from '../lib/store.js';

registerPage('messages', initMessages);

function initMessages() {
  const params = new URLSearchParams(window.location.search);
  const role = store.getRole() ?? ROLES.CUSTOMER;

  const content = renderShell({
    role,
    title: 'Messages',
    subtitle: 'Talk through the details of each job',
  });

  const slot = document.createElement('div');
  slot.setAttribute('data-messages-root', '');
  content.append(slot);

  return initMessaging(slot, {
    requestId: params.get('request'),
    conversationId: params.get('conversation'),
    role,
  });
}

boot();