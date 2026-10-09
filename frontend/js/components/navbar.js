/**
 * Site header and role-aware primary navigation.
 *
 * The header is rendered by JavaScript into `[data-site-header]` so that the
 * same markup serves every page and stays in sync with the auth state. Pages
 * without a placeholder simply get nothing.
 */

import { el, $, on, mount, delegate } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { API_BASE, ROLES } from '../../../shared/constants.js';
import * as store from '../lib/store.js';

/** Where each role lands after signing in. */
const HOME_FOR_ROLE = {
  [ROLES.CUSTOMER]: 'dashboard.html',
  [ROLES.PROVIDER]: 'provider-dashboard.html',
  [ROLES.ADMIN]: 'admin-dashboard.html',
};

/** Primary links per role, per the navigation structure in the UI spec. */
const NAV_BY_STATE = {
  public: [
    { href: 'index.html', label: 'Home', match: ['index.html'] },
    { href: 'services.html', label: 'Services', match: ['services.html', 'provider-public.html', 'request-service.html'] },
    { href: 'pages/about.html', label: 'How it works', match: ['about.html'] },
    { href: 'pages/contact.html', label: 'Contact', match: ['contact.html'] },
  ],
  [ROLES.CUSTOMER]: [
    { href: 'dashboard.html', label: 'Dashboard', match: ['dashboard.html'] },
    { href: 'services.html', label: 'Find a service', match: ['services.html', 'provider-public.html', 'request-service.html'] },
    { href: 'my-requests.html', label: 'My requests', match: ['my-requests.html', 'request-details.html'] },
    { href: 'messages.html', label: 'Messages', match: ['messages.html'] },
    { href: 'profile.html', label: 'Profile', match: ['profile.html'] },
  ],
  [ROLES.PROVIDER]: [
    { href: 'provider-dashboard.html', label: 'Dashboard', match: ['provider-dashboard.html'] },
    { href: 'provider-requests.html', label: 'Requests', match: ['provider-requests.html', 'request-details.html'] },
    { href: 'provider-services.html', label: 'My services', match: ['provider-services.html'] },
    { href: 'messages.html', label: 'Messages', match: ['messages.html'] },
    { href: 'provider-availability.html', label: 'Availability', match: ['provider-availability.html'] },
    { href: 'provider-profile.html', label: 'Profile', match: ['provider-profile.html'] },
  ],
  [ROLES.ADMIN]: [
    { href: 'admin-dashboard.html', label: 'Dashboard', match: ['admin-dashboard.html'] },
    { href: 'admin-users.html', label: 'Customers', match: ['admin-users.html'] },
    { href: 'admin-providers.html', label: 'Providers', match: ['admin-providers.html'] },
    { href: 'admin-categories.html', label: 'Categories', match: ['admin-categories.html'] },
    { href: 'admin-requests.html', label: 'Requests', match: ['admin-requests.html'] },
    { href: 'admin-reports.html', label: 'Reports', match: ['admin-reports.html'] },
  ],
};

/* ------------------------------------------------------------------ */
/* brand                                                               */
/* ------------------------------------------------------------------ */

export function brand({ href = 'index.html' } = {}) {
  return el(
    'a',
    { class: 'brand', href, 'aria-label': 'HandyNaija home' },
    el('span', { class: 'brand__mark' }, icon('logo')),
    el('span', { class: 'brand__name', html: 'Handy<em>Naija</em>' })
  );
}

/* ------------------------------------------------------------------ */
/* header                                                              */
/* ------------------------------------------------------------------ */

/**
 * @param {object} options
 * @param {'public'|'customer'|'provider'|'admin'} options.variant - force a nav set
 * @param {boolean} options.overlay - transparent header that solidifies on scroll
 */
export function renderHeader({ variant = null, overlay = false } = {}) {
  const mountPoint = $('[data-site-header]');
  if (!mountPoint) return null;

  const user = store.getUser();
  const role = store.getRole();

  // `data-header="none"` belongs to app pages: they draw their own sidebar, so
  // the public header must not be rendered at all.
  if (variant === 'none') {
    mountPoint.remove();
    return null;
  }

  const navKey = variant ?? (role ? role : 'public');
  const links = NAV_BY_STATE[navKey];

  if (!links) {
    mountPoint.remove();
    return null;
  }

  const nav = el(
    'nav',
    { class: 'site-nav', 'aria-label': 'Primary' },
    ...links.map((link) =>
      el('a', {
        class: 'site-nav__link',
        href: relativeHref(link.href),
        'data-match': link.match.join(','),
        text: link.label,
      })
    )
  );

  const actions = el('div', { class: 'site-header__actions' });

  if (user) {
    actions.append(notificationButton());
    actions.append(
      el(
        'a',
        { class: 'site-nav__link', href: relativeHref(role === ROLES.PROVIDER ? 'provider-profile.html' : 'profile.html') },
        icon('user'),
        el('span', { class: 'site-nav__label' }, user.fullName?.split(' ')[0] ?? 'Profile')
      )
    );
    actions.append(
      el(
        'button',
        {
          class: 'icon-btn',
          type: 'button',
          'data-sign-out': '',
          'aria-label': 'Sign out',
          title: 'Sign out',
        },
        icon('logout')
      )
    );
  } else {
    actions.append(el('a', { class: 'btn btn--ghost btn--sm', href: relativeHref('login.html') }, 'Log in'));
    actions.append(
      el(
        'a',
        { class: 'btn btn--accent btn--sm', href: relativeHref('register.html') },
        'Join as a provider'
      )
    );
  }

  const header = el(
    'header',
    { class: `site-header ${overlay ? 'site-header--overlay' : ''}` },
    el(
      'div',
      { class: 'container site-header__inner' },
      brand(),
      nav,
      actions,
      el(
        'button',
        {
          class: 'icon-btn nav-toggle',
          type: 'button',
          'aria-label': 'Open menu',
          'aria-expanded': 'false',
          'aria-controls': 'mobile-nav',
        },
        icon('menu')
      )
    )
  );

  mountPoint.replaceWith(header);
  markCurrentLink(header, links);
  wireScroll(header);
  wireDrawer(header, links, user, role);
  wireSignOut(header);

  return header;
}

function notificationButton() {
  const button = el(
    'button',
    { class: 'icon-btn', type: 'button', 'aria-label': 'Notifications, 2 unread', 'data-notifications': '' },
    icon('bell')
  );
  // Populated lazily from localStorage so the header renders instantly.
  const unread = store.getPreferences().notificationsRead ? 0 : 2;
  if (unread > 0) {
    button.append(el('span', { class: 'icon-btn__dot', 'aria-hidden': 'true', text: String(unread) }));
  }
  return button;
}

function markCurrentLink(header, links) {
  const current = currentPage();
  if (!current) return;

  for (const link of header.querySelectorAll('[data-match]')) {
    const matches = (link.dataset.match ?? '').split(',');
    if (matches.some((item) => current.endsWith(item))) {
      link.setAttribute('aria-current', 'page');
      break;
    }
  }
}

function wireScroll(header) {
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 12);
  onScroll();
  on(window, 'scroll', onScroll, { passive: true });
}

/* ------------------------------------------------------------------ */
/* mobile drawer                                                       */
/* ------------------------------------------------------------------ */

function wireDrawer(header, links, user, role) {
  const toggle = $('.nav-toggle', header);
  if (!toggle) return;

  const drawer = el(
    'div',
    { class: 'nav-drawer', id: 'mobile-nav', 'aria-hidden': 'true' },
    el(
      'div',
      { class: 'nav-drawer__head' },
      brand(),
      el('button', { class: 'icon-btn', type: 'button', 'data-close-nav': '', 'aria-label': 'Close menu' }, icon('close'))
    ),
    el(
      'nav',
      { class: 'nav-drawer__nav', 'aria-label': 'Mobile' },
      ...links.map((link) =>
        el('a', {
          class: 'site-nav__link',
          href: relativeHref(link.href),
          'data-match': link.match.join(','),
          text: link.label,
        })
      )
    ),
    user
      ? el(
          'div',
          { class: 'nav-drawer__footer' },
          el(
            'a',
            { class: 'btn btn--secondary btn--block', href: relativeHref(role === ROLES.PROVIDER ? 'provider-profile.html' : 'profile.html') },
            'My profile'
          ),
          el('button', { class: 'btn btn--secondary btn--block', type: 'button', 'data-sign-out': '' }, 'Sign out')
        )
      : el(
          'div',
          { class: 'nav-drawer__footer' },
          el('a', { class: 'btn btn--secondary btn--block', href: relativeHref('login.html') }, 'Log in'),
          el('a', { class: 'btn btn--primary btn--block', href: relativeHref('register.html') }, 'Create an account')
        )
  );

  const scrim = el('div', { class: 'nav-scrim', 'data-scrim': '' });

  document.body.append(drawer, scrim);

  const setOpen = (open) => {
    drawer.classList.toggle('is-open', open);
    scrim.classList.toggle('is-visible', open);
    drawer.setAttribute('aria-hidden', String(!open));
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) drawer.querySelector('a, button')?.focus();
    else toggle.focus();
  };

  toggle.addEventListener('click', () => setOpen(true));
  $('[data-close-nav]', drawer).addEventListener('click', () => setOpen(false));
  scrim.addEventListener('click', () => setOpen(false));
  on(document, 'keydown', (event) => {
    if (event.key === 'Escape' && drawer.classList.contains('is-open')) setOpen(false);
  });

  // Keep the drawer in sync with the main nav's current-page marker.
  for (const link of drawer.querySelectorAll('[data-match]')) {
    const matches = (link.dataset.match ?? '').split(',');
    if (currentPage() && matches.some((item) => currentPage().endsWith(item))) {
      link.setAttribute('aria-current', 'page');
    }
  }

  drawer.addEventListener('click', (event) => {
    if (event.target.closest('[data-sign-out]')) signOut();
  });
}

/* ------------------------------------------------------------------ */
/* sign out                                                            */
/* ------------------------------------------------------------------ */

async function wireSignOut(header) {
  delegate(header, 'click', '[data-sign-out]', (event) => {
    event.preventDefault();
    signOut();
  });
}

function signOut() {
  store.clearSession();
  window.location.href = relativeHref('index.html');
}

export { signOut };

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

/**
 * Rewrites a root-relative path so the same header works from `pages/`.
 * Anything already absolute or external is returned untouched.
 */
export function relativeHref(href) {
  if (/^(https?:|mailto:|tel:|#|\/)/.test(href)) return href;

  const isNested = document.body.dataset.depth === 'nested';
  return isNested ? `../${href}` : `./${href}`;
}

function currentPage() {
  const path = window.location.pathname.split('/').pop();
  return path === '' ? 'index.html' : path;
}

export { HOME_FOR_ROLE, NAV_BY_STATE, API_BASE };