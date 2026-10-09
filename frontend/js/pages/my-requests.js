/**
 * Customer request list (`my-requests.html`).
 * Tabbed history built by `renderCustomerRequests`.
 */

import { registerPage, boot } from '../main.js';
import { $, el } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { ROLES } from '../../../shared/constants.js';
import { renderShell, appendUserChip, pageHead } from '../components/shell.js';
import { renderCustomerRequests } from '../requests.js';
import { relativeHref } from '../components/navbar.js';

registerPage('my-requests', initMyRequests);

async function initMyRequests() {
  const content = renderShell({
    role: ROLES.CUSTOMER,
    title: 'My requests',
    subtitle: 'Every service request you have sent',
    actions: [el('a', { class: 'btn btn--primary', href: relativeHref('services.html') }, icon('search'), 'New request')],
  });

  appendUserChip(content);

  content.append(
    pageHead('Your requests', 'Track progress, message your provider or leave a review.'),
    el('div', { 'data-requests-root': '' })
  );

  return renderCustomerRequests($('[data-requests-root]'), {
    emptyAction: el('a', { class: 'btn btn--primary', href: relativeHref('services.html') }, 'Find a provider'),
  });
}

boot();