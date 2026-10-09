/**
 * Request confirmation (`request-confirmation.html`).
 *
 * Shows what happens next and gives a direct route to the request so the
 * customer can follow the status instead of being dropped on a blank page.
 */

import { registerPage, boot } from '../main.js';
import { $, el, mount, formatDateTime } from '../lib/dom.js';
import { icon, iconNode } from '../lib/icons.js';
import { call } from '../lib/api.js';
import { statusBadge, progressTimeline, spinner, errorState, detailList } from '../components/ui.js';
import { relativeHref } from '../components/navbar.js';

registerPage('request-confirmation', initConfirmation);

async function initConfirmation() {
  const root = $('[data-confirmation-root]');
  const id = new URLSearchParams(window.location.search).get('id');

  $('[data-check-icon]').append(iconNode('check'));

  if (!id) {
    mount(root, errorState({ title: 'No request reference', message: 'Open this page from your request list.' }));
    return;
  }

  const detailSlot = el('div', { class: 'stack', style: { '--flow': 'var(--space-5)' } });
  mount(
    root,
    el(
      'div',
      { class: 'confirmation' },
      el('div', { class: 'confirmation__icon' }, icon('check')),
      el('h1', { class: 'h1', text: 'Request sent' }),
      el('p', { class: 'text-lead', text: 'We have passed your request to the provider. You will be notified as soon as they respond.' })
    ),
    el('div', { style: { height: 'var(--space-8)' } }),
    detailSlot
  );

  mount(detailSlot, spinner({ label: 'Loading your request' }));

  try {
    const { request } = await call('GET', `/requests/${encodeURIComponent(id)}`);
    mount(
      detailSlot,
      el(
        'section',
        { class: 'profile-section' },
        el('h2', { class: 'eyebrow' }, 'Your request'),
        detailList([
          { label: 'Reference', value: request.id },
          { label: 'Provider', value: request.providerName },
          { label: 'Service', value: request.serviceName },
          { label: 'Preferred', value: formatDateTime(request.preferredDate, request.preferredTime) },
          { label: 'Location', value: `${request.area}, ${request.city}, ${request.state}` },
          { label: 'Status', node: statusBadge(request.status) },
        ])
      ),
      el(
        'section',
        { class: 'profile-section' },
        el('h2', { class: 'eyebrow' }, 'What happens next'),
        progressTimeline(request.status),
        el(
          'ol',
          { class: 'stack text-small text-muted', style: { '--flow': 'var(--space-2)', 'padding-inline-start': '1.25rem' } },
          el('li', { text: 'The provider reviews your request and accepts, declines, or proposes a different time.' }),
          el('li', { text: 'Once accepted, message the provider to confirm the details.' }),
          el('li', { text: 'The provider marks the job complete when the work is done.' }),
          el('li', { text: 'Leave a review so other customers know who to trust.' })
        )
      ),
      el(
        'div',
        { class: 'btn-group btn-group--stack', style: { 'margin-top': 'var(--space-6)' } },
        el('a', { class: 'btn btn--primary btn--lg', href: relativeHref(`request-details.html?id=${request.id}`) }, 'Track this request'),
        el('a', { class: 'btn btn--secondary', href: relativeHref('services.html') }, 'Search for another service'),
        el('a', { class: 'btn btn--ghost', href: relativeHref('dashboard.html') }, 'Go to dashboard')
      )
    );
  } catch (error) {
    mount(
      detailSlot,
      errorState({
        message: `${error.userMessage} You can still track it from your requests.`,
        onRetry: () => initConfirmation(),
      }),
      el('div', { class: 'btn-group', style: { 'margin-top': 'var(--space-6)' } },
        el('a', { class: 'btn btn--primary', href: relativeHref('my-requests.html') }, 'Go to my requests'))
    );
  }
}

boot();