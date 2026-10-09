/**
 * Customer dashboard (`dashboard.html`).
 *
 * Stat tiles, the next active request, recent requests, saved searches and
 * quick actions. The shell comes from `components/shell.js`.
 */

import { registerPage, boot } from '../main.js';
import { el, mount, formatDateTime, formatRelative } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { call } from '../lib/api.js';
import { ROLES, ACTIVE_STATUSES, REQUEST_STATUS } from '../../../shared/constants.js';
import { renderShell, appendUserChip, pageHead } from '../components/shell.js';
import {
  statusBadge,
  avatar,
  skeletonCard,
  emptyState,
  errorState,
  sectionHead,
  quickActions,
} from '../components/ui.js';
import { relativeHref } from '../components/navbar.js';
import * as store from '../lib/store.js';

registerPage('dashboard', initDashboard);

async function initDashboard() {
  const content = renderShell({
    role: ROLES.CUSTOMER,
    title: 'Dashboard',
    subtitle: 'Your requests at a glance',
    actions: [
      el('a', { class: 'btn btn--primary', href: relativeHref('services.html') }, icon('search'), 'Find a service'),
    ],
  });

  appendUserChip(content);

  const statsSlot = el('div', { class: 'stat-grid' });
  const panelsSlot = el('div', { class: 'dashboard-grid' });

  mount(
    content,
    pageHead(
      `Welcome back, ${firstName()}`,
      'Here is what is happening with your services.',
      [el('a', { class: 'btn btn--secondary', href: relativeHref('my-requests.html') }, 'View all requests')]
    ),
    statsSlot,
    panelsSlot
  );

  mount(statsSlot, ...Array.from({ length: 4 }, () => el('div', { class: 'stat' }, skeletonCard())));
  mount(panelsSlot, el('div', { class: 'card card--padded' }, skeletonCard()));

  try {
    const [requests, conversations] = await Promise.all([
      call('GET', '/requests', { query: { limit: 50 } }),
      call('GET', '/conversations', { query: { limit: 5 } }),
    ]);

    const list = requests?.requests ?? [];
    // Statuses are UPPER_CASE in the API; comparing against lowercase literals
    // silently produced zero counts on every tile.
    const active = list.filter((item) => ACTIVE_STATUSES.includes(item.status));
    const completed = list.filter((item) => item.status === REQUEST_STATUS.COMPLETED);
    const upcoming = active
      .filter((item) => [REQUEST_STATUS.ACCEPTED, REQUEST_STATUS.SCHEDULED].includes(item.status))
      .sort((a, b) => new Date(`${a.preferredDate}T${a.preferredTime}`) - new Date(`${b.preferredDate}T${b.preferredTime}`))[0];

    mount(
      statsSlot,
      stat('Active requests', active.length, 'inbox'),
      stat('Completed', completed.length, 'check'),
      stat('Unread messages', (conversations?.conversations ?? []).reduce((sum, c) => sum + (c.unreadCount ?? 0), 0), 'message'),
      stat('Saved searches', store.getRecentSearches().length, 'search')
    );

    mount(
      panelsSlot,
      el(
        'section',
        { class: 'card card--padded', 'aria-labelledby': 'next-heading' },
        sectionHead('Next up', 'Your closest scheduled visit', 'my-requests.html', 'All requests', 'next-heading'),
        upcoming ? nextRequestCard(upcoming) : emptyState({ iconName: 'calendar', title: 'Nothing scheduled', text: 'Requests you accept a time for will appear here.', action: el('a', { class: 'btn btn--secondary', href: relativeHref('services.html') }, 'Book a service') })
      ),
      el(
        'section',
        { class: 'card card--padded', 'aria-labelledby': 'recent-heading' },
        sectionHead('Recent requests', 'Your latest five', 'my-requests.html', 'See all', 'recent-heading'),
        recentRequests(list.slice(0, 5))
      ),
      el(
        'section',
        { class: 'card card--padded', 'aria-labelledby': 'quick-heading' },
        sectionHead('Quick actions', 'Shortcuts to common tasks', null, null, 'quick-heading'),
        quickActions([
          { label: 'Find a provider', href: 'services.html', iconName: 'search' },
          { label: 'Start a request', href: 'request-service.html', iconName: 'inbox' },
          { label: 'Open messages', href: 'messages.html', iconName: 'message' },
          { label: 'Update profile', href: 'profile.html', iconName: 'user' },
        ])
      ),
      el(
        'section',
        { class: 'card card--padded', 'aria-labelledby': 'saved-heading' },
        sectionHead('Recent searches', 'Pick up where you left off', 'services.html', 'Browse all', 'saved-heading'),
        recentSearches()
      )
    );
  } catch (error) {
    mount(
      panelsSlot,
      el('div', { class: 'card card--padded' }, errorState({ message: error.userMessage, onRetry: initDashboard }))
    );
  }
}

/* ------------------------------------------------------------------ */

function stat(label, value, iconName) {
  return el(
    'div',
    { class: 'stat' },
    el('span', { class: 'stat__icon' }, icon(iconName)),
    el(
      'div',
      { class: 'stack', style: { '--flow': '2px' } },
      el('strong', { class: 'stat__value', text: String(value) }),
      el('span', { class: 'text-xs text-muted', text: label })
    )
  );
}

function nextRequestCard(request) {
  return el(
    'a',
    {
      class: 'cluster provider-card',
      href: relativeHref(`request-details.html?id=${encodeURIComponent(request.id)}`),
      style: { 'text-decoration': 'none', color: 'inherit' },
    },
    avatar(request.providerName, { src: request.providerAvatarUrl }),
    el(
      'div',
      { class: 'stack', style: { '--flow': '2px', flex: '1 1 auto', 'min-width': '0' } },
      el('div', { class: 'cluster', style: { '--cluster-gap': 'var(--space-2)' } },
        el('strong', { class: 'text-small', text: request.serviceName }),
        statusBadge(request.status)),
      el('span', { class: 'text-xs text-muted', text: `${request.providerName} • ${request.area}, ${request.city}` }),
      el('span', { class: 'text-xs text-muted', text: formatDateTime(request.preferredDate, request.preferredTime) })
    ),
    el('span', { class: 'btn btn--secondary btn--sm' }, 'View')
  );
}

function recentRequests(list) {
  if (!list.length) {
    return emptyState({ iconName: 'calendar', title: 'No requests yet', text: 'Your request history will show up here.' });
  }

  return el(
    'ul',
    { class: 'list' },
    ...list.map((request) =>
      el(
        'li',
        {},
        el(
          'a',
          { class: 'list__row', href: relativeHref(`request-details.html?id=${encodeURIComponent(request.id)}`) },
          el('span', { class: 'list__primary', text: request.serviceName }),
          el('span', { class: 'list__meta text-xs text-muted', text: request.providerName }),
          statusBadge(request.status),
          el('span', { class: 'text-xs text-muted', text: formatRelative(request.createdAt) })
        )
      )
    )
  );
}

function recentSearches() {
  const recent = store.getRecentSearches().slice(0, 5);
  if (!recent.length) {
    return emptyState({ iconName: 'search', title: 'No saved searches', text: 'Search for a service and it will be remembered here.' });
  }

  return el(
    'div',
    { class: 'chip-row' },
    ...recent.map((term) =>
      el('a', { class: 'chip', href: relativeHref(`services.html?q=${encodeURIComponent(term)}`) }, term)
    )
  );
}

function firstName() {
  const user = store.getUser();
  return user?.fullName?.split(' ')[0] ?? 'there';
}

boot();