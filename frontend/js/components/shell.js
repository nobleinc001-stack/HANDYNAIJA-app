/**
 * Authenticated app shell.
 *
 * Renders the sidebar navigation and top bar for the customer, provider and
 * admin dashboards. Keeps the HTML pages to their page-specific content and
 * means navigation changes land in one place.
 */

import { el, $, mount } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { ROLES } from '../../shared/constants.js';
import { relativeHref } from './navbar.js';
import { avatar } from './ui.js';
import * as store from '../lib/store.js';

/** Sidebar link sets, mirroring the navigation structure in the UI spec. */
const NAV = {
  [ROLES.CUSTOMER]: [
    { href: 'dashboard.html', label: 'Dashboard', iconName: 'grid', match: 'dashboard.html' },
    { href: 'services.html', label: 'Find a service', iconName: 'search', match: ['services.html', 'provider-public.html', 'request-service.html'] },
    { href: 'my-requests.html', label: 'My requests', iconName: 'calendar', match: ['my-requests.html', 'request-details.html', 'request-confirmation.html'] },
    { href: 'messages.html', label: 'Messages', iconName: 'message', match: 'messages.html' },
    { href: 'profile.html', label: 'Profile', iconName: 'user', match: 'profile.html' },
  ],
  [ROLES.PROVIDER]: [
    { href: 'provider-dashboard.html', label: 'Dashboard', iconName: 'grid', match: 'provider-dashboard.html' },
    { href: 'provider-requests.html', label: 'Requests', iconName: 'inbox', match: ['provider-requests.html', 'request-details.html'], badge: 'requests' },
    { href: 'provider-services.html', label: 'My services', iconName: 'briefcase', match: 'provider-services.html' },
    { href: 'messages.html', label: 'Messages', iconName: 'message', match: 'messages.html' },
    { href: 'provider-availability.html', label: 'Availability', iconName: 'calendar', match: 'provider-availability.html' },
    { href: 'provider-reviews.html', label: 'Reviews', iconName: 'starOutline', match: 'provider-reviews.html' },
    { href: 'provider-profile.html', label: 'Profile', iconName: 'user', match: 'provider-profile.html' },
  ],
  [ROLES.ADMIN]: [
    { href: 'admin-dashboard.html', label: 'Dashboard', iconName: 'grid', match: 'admin-dashboard.html' },
    { href: 'admin-users.html', label: 'Customers', iconName: 'users', match: 'admin-users.html' },
    { href: 'admin-providers.html', label: 'Providers', iconName: 'briefcase', match: 'admin-providers.html' },
    { href: 'admin-categories.html', label: 'Categories', iconName: 'grid', match: 'admin-categories.html' },
    { href: 'admin-requests.html', label: 'Requests', iconName: 'calendar', match: 'admin-requests.html' },
    { href: 'admin-reports.html', label: 'Reports & reviews', iconName: 'flag', match: 'admin-reports.html', badge: 'reports' },
  ],
};

const ROLE_LABEL = {
  [ROLES.CUSTOMER]: 'Customer account',
  [ROLES.PROVIDER]: 'Provider account',
  [ROLES.ADMIN]: 'Administrator',
};

/**
 * Renders the shell into `[data-shell]`.
 *
 * @param {object} options
 * @param {string} options.role - one of ROLES
 * @param {string} options.title - top bar heading
 * @param {string} [options.subtitle]
 * @param {Node|Node[]} [options.actions] - top bar buttons
 * @param {string} [options.backHref] - when set, the top bar shows a back link
 * @param {string} [options.backLabel]
 * @param {Record<string, number>} [options.counts] - badge counts by key
 * @returns {HTMLElement|null} the content region pages should render into
 */
export function renderShell({ role, title, subtitle = '', actions = [], backHref = null, backLabel = 'Back', counts = {} }) {
  const mountPoint = $('[data-shell]');
  if (!mountPoint) return null;

  const links = NAV[role] ?? [];
  const currentPage = currentFile();

  const sidebar = el(
    'aside',
    { class: 'app-sidebar' },
    el(
      'div',
      { class: 'app-sidebar__group' },
      el('p', { class: 'app-sidebar__label' }, ROLE_LABEL[role] ?? 'Menu'),
      ...links.map((link) =>
        el(
          'a',
          {
            class: 'app-sidebar__link',
            href: relativeHref(link.href),
            'aria-current': matches(link.match) ? 'page' : null,
          },
          icon(link.iconName),
          el('span', { text: link.label }),
          link.badge && counts[link.badge]
            ? el('span', { class: 'app-sidebar__count', text: String(counts[link.badge]) })
            : null
        )
      )
    ),
    el(
      'div',
      { class: 'app-sidebar__foot' },
      el(
        'a',
        { class: 'app-sidebar__link', href: relativeHref('index.html') },
        icon('home'),
        el('span', { text: 'Public site' })
      )
    )
  );

  const topbar = el(
    'header',
    { class: 'app-topbar' },
    backHref
      ? el('a', { class: 'icon-btn', href: relativeHref(backHref), 'aria-label': backLabel }, icon('arrowLeft'))
      : null,
    el(
      'div',
      { class: 'app-topbar__title' },
      el('h1', { class: 'h4', text: title }),
      subtitle ? el('span', { class: 'text-xs text-muted', text: subtitle }) : null
    ),
    el('div', { class: 'app-topbar__actions' }, ...[].concat(actions))
  );

  const content = el('div', { class: 'app-body', 'data-content': '' });

  mount(
    mountPoint,
    el(
      'div',
      { class: 'app-shell' },
      sidebar,
      el('div', { class: 'app-content' }, topbar, content)
    )
  );

  // The sidebar replaces the public header on app pages.
  $('[data-site-header]')?.remove();
  $('[data-site-footer]')?.replaceWith(el('div', { 'data-site-footer': '' }));

  return content;
}

/** Adds a user chip to the top bar (call after `renderShell`). */
export function appendUserChip(content) {
  const user = store.getUser();
  if (!user || !content) return;

  const topbar = $('.app-topbar__actions', content.closest('.app-shell'));
  if (!topbar) return;

  topbar.prepend(
    el(
      'a',
      {
        class: 'icon-btn',
        href: relativeHref(store.getRole() === ROLES.PROVIDER ? 'provider-profile.html' : 'profile.html'),
        'aria-label': `Signed in as ${user.fullName}`,
        title: user.fullName,
      },
      avatar(user.fullName, { src: user.avatarUrl, size: 'sm' })
    )
  );
}

/** Standard page header inside a shell: title block + actions. */
export function pageHead(title, subtitle, actions = []) {
  return el(
    'div',
    { class: 'page-head' },
    el(
      'div',
      { class: 'page-head__text' },
      el('h2', { class: 'h1', text: title }),
      subtitle ? el('p', { class: 'text-small text-muted', text: subtitle }) : null
    ),
    actions.length ? el('div', { class: 'page-head__actions' }, ...actions) : null
  );
}

function matches(match) {
  const page = currentFile();
  const list = Array.isArray(match) ? match : [match];
  return list.some((item) => page === item);
}

function currentFile() {
  const parts = window.location.pathname.split('/');
  return parts[parts.length - 1] === '' ? 'index.html' : parts[parts.length - 1];
}