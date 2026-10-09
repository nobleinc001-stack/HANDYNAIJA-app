/**
 * Provider dashboard (`provider-dashboard.html`).
 *
 * Today's schedule, request counts by status, earnings placeholder, and the
 * reviews that need a response.
 */

import { registerPage, boot } from '../main.js';
import { el, mount, formatDateTime, formatRelative } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { call } from '../lib/api.js';
import { ROLES, REQUEST_STATUS } from '../../shared/constants.js';
import { renderShell, appendUserChip, pageHead } from '../components/shell.js';
import {
  statusBadge,
  skeletonCard,
  emptyState,
  errorState,
  sectionHead,
  ratingDisplay,
  toastError,
} from '../components/ui.js';
import { relativeHref } from '../components/navbar.js';
import * as store from '../lib/store.js';

registerPage('provider-dashboard', initProviderDashboard);

async function initProviderDashboard() {
  const content = renderShell({
    role: ROLES.PROVIDER,
    title: 'Dashboard',
    subtitle: 'Your business at a glance',
    actions: [
      el('a', { class: 'btn btn--primary', href: relativeHref('provider-availability.html') }, icon('calendar'), 'Set availability'),
    ],
  });

  appendUserChip(content);

  const statsSlot = el('div', { class: 'stat-grid' });
  const panelsSlot = el('div', { class: 'dashboard-grid' });

  mount(
    content,
    pageHead(
      `Hello, ${firstName()}`,
      'Accept new requests and keep your schedule current.',
      [el('a', { class: 'btn btn--secondary', href: relativeHref('provider-requests.html') }, 'Open request queue')]
    ),
    statsSlot,
    panelsSlot
  );

  mount(statsSlot, ...Array.from({ length: 4 }, () => el('div', { class: 'stat' }, skeletonCard({ compact: true }))));
  mount(panelsSlot, el('div', { class: 'card card--padded' }, skeletonCard()));

  try {
    const [requestsResult, reviewsResult] = await Promise.all([
      call('GET', '/provider/requests', { query: { limit: 50 } }),
      call('GET', '/reviews', { query: { limit: 5, sort: 'recent' } }),
    ]);

    const requests = requestsResult?.requests ?? [];
    const reviews = reviewsResult?.reviews ?? [];

    const pending = requests.filter((r) => r.status === REQUEST_STATUS.PENDING);
    const active = requests.filter((r) =>
      [REQUEST_STATUS.ACCEPTED, REQUEST_STATUS.SCHEDULED, REQUEST_STATUS.IN_PROGRESS].includes(r.status)
    );
    const completed = requests.filter((r) => r.status === REQUEST_STATUS.COMPLETED);
    const todays = active
      .filter((r) => isToday(r.preferredDate))
      .sort((a, b) => String(a.preferredTime).localeCompare(String(b.preferredTime)));

    const avgRating = reviews.length
      ? (reviews.reduce((sum, r) => sum + (r.rating ?? 0), 0) / reviews.length).toFixed(1)
      : '—';

    mount(
      statsSlot,
      stat('Awaiting response', pending.length, 'inbox', pending.length > 0),
      stat('Active jobs', active.length, 'calendar'),
      stat('Completed', completed.length, 'check'),
      stat('Average rating', avgRating, 'starOutline')
    );

    mount(
      panelsSlot,
      el(
        'section',
        { class: 'card card--padded', 'aria-labelledby': 'today-heading' },
        sectionHead('Today', 'Your accepted and scheduled jobs', 'provider-requests.html', 'Full queue', 'today-heading'),
        todays.length
          ? el('ul', { class: 'list' },
              ...todays.map((r) =>
                el('li', {}, el('a', { class: 'list__row', href: relativeHref(`request-details.html?id=${encodeURIComponent(r.id)}`) },
                  el('span', { class: 'list__primary', text: `${r.preferredTime} • ${r.serviceName}` }),
                  el('span', { class: 'list__meta text-xs text-muted', text: `${r.customerName} • ${r.area}` }),
                  statusBadge(r.status)))))
          : emptyState({ iconName: 'calendar', title: 'Nothing booked today', text: 'Accepted jobs with today\'s date will show up here.' })
      ),
      el(
        'section',
        { class: 'card card--padded', 'aria-labelledby': 'pending-heading' },
        sectionHead('Needs a response', 'Requests waiting on you', 'provider-requests.html?tab=pending', 'See all', 'pending-heading'),
        pending.length
          ? el('ul', { class: 'list' },
              ...pending.slice(0, 5).map((r) =>
                el('li', {}, el('a', { class: 'list__row', href: relativeHref(`request-details.html?id=${encodeURIComponent(r.id)}`) },
                  el('span', { class: 'list__primary', text: r.serviceName }),
                  el('span', { class: 'list__meta text-xs text-muted', text: `${r.customerName} • ${r.city}` }),
                  el('span', { class: 'text-xs text-muted', text: formatRelative(r.createdAt) }),
                  statusBadge(r.status)))))
          : emptyState({ iconName: 'inbox', title: 'Inbox zero', text: 'You have answered every request.' })
      ),
      el(
        'section',
        { class: 'card card--padded card--full', 'aria-labelledby': 'reviews-heading' },
        sectionHead('Latest reviews', 'What customers said', 'provider-reviews.html', 'All reviews', 'reviews-heading'),
        reviews.length
          ? el('div', { class: 'stack', style: { '--flow': 'var(--space-4)' } },
              ...reviews.map((r) =>
                el('article', { class: 'stack', style: { '--flow': 'var(--space-1)' } },
                  el('div', { class: 'cluster', style: { '--cluster-gap': 'var(--space-2)' } },
                    el('strong', { class: 'text-small', text: r.customerName }),
                    ratingDisplay(r.rating),
                    el('span', { class: 'spacer' }),
                    el('span', { class: 'text-xs text-muted', text: formatRelative(r.createdAt) })),
                  el('p', { class: 'text-small text-muted', text: r.comment }))))
          : emptyState({ iconName: 'starOutline', title: 'No reviews yet', text: 'Reviews appear once you complete your first job.' })
      )
    );
  } catch (error) {
    mount(panelsSlot, el('div', { class: 'card card--padded' }, errorState({ message: error.userMessage, onRetry: initProviderDashboard })));
  }
}

/* ------------------------------------------------------------------ */

function stat(label, value, iconName, accent = false) {
  return el('div', { class: accent ? 'stat stat--accent' : 'stat' },
    el('span', { class: 'stat__icon' }, icon(iconName)),
    el('div', { class: 'stack', style: { '--flow': '2px' } },
      el('strong', { class: 'stat__value', text: String(value) }),
      el('span', { class: 'text-xs text-muted', text: label })));
}

function isToday(date) {
  if (!date) return false;
  const value = new Date(`${date}T00:00:00`);
  const today = new Date();
  return value.toDateString() === today.toDateString();
}

function firstName() {
  const user = store.getUser();
  return user?.fullName?.split(' ')[0] ?? 'there';
}

boot();