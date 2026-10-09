/**
 * Site footer. Static content only — rendered on every page into
 * `[data-site-footer]`.
 */

import { el, $ } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { CATEGORY_GROUPS } from '../../shared/constants.js';
import { brand, relativeHref } from './navbar.js';

const RESOURCE_LINKS = [
  { href: 'services.html', label: 'Find a service' },
  { href: 'pages/about.html', label: 'How it works' },
  { href: 'pages/contact.html', label: 'Contact us' },
  { href: 'login.html', label: 'Log in' },
  { href: 'register.html', label: 'Create an account' },
];

const PROVIDER_LINKS = [
  { href: 'register.html?role=provider', label: 'Join as a provider' },
  { href: 'provider-dashboard.html', label: 'Provider dashboard' },
  { href: 'provider-services.html', label: 'List your services' },
  { href: 'pages/about.html#verification', label: 'Provider verification' },
  { href: 'pages/contact.html', label: 'Get help' },
];

export function renderFooter({ year = new Date().getFullYear() } = {}) {
  const mountPoint = $('[data-site-footer]');
  if (!mountPoint) return null;

  const popularCategories = CATEGORY_GROUPS[0].services.slice(0, 5);

  const footer = el(
    'footer',
    { class: 'site-footer' },
    el(
      'div',
      { class: 'container' },
      el(
        'div',
        { class: 'site-footer__grid' },
        el(
          'div',
          null,
          brand({ href: relativeHref('index.html') }),
          el(
            'p',
            { class: 'text-small', style: { 'margin-top': 'var(--space-3)', 'max-width': '38ch' } },
            'Find and hire trusted local professionals — electricians, plumbers, tutors and more — in your area.'
          ),
          el(
            'div',
            { class: 'cluster', style: { '--cluster-gap': 'var(--space-3)', 'margin-top': 'var(--space-4)' } },
            el('span', { class: 'badge badge--accent' }, icon('pin'), 'Serving Anambra, Lagos and Abuja')
          )
        ),
        el(
          'div',
          null,
          el('h2', { class: 'site-footer__title' }, 'Services'),
          el(
            'ul',
            { class: 'site-footer__links' },
            ...popularCategories.map((category) =>
              el(
                'li',
                null,
                el('a', { href: relativeHref(`services.html?category=${category.id}`) }, category.name)
              )
            ),
            el('li', null, el('a', { href: relativeHref('services.html') }, 'All services'))
          )
        ),
        el(
          'div',
          null,
          el('h2', { class: 'site-footer__title' }, 'Popular'),
          el(
            'ul',
            { class: 'site-footer__links' },
            ...RESOURCE_LINKS.map((link) => el('li', null, el('a', { href: relativeHref(link.href) }, link.label)))
          )
        ),
        el(
          'div',
          null,
          el('h2', { class: 'site-footer__title' }, 'For providers'),
          el(
            'ul',
            { class: 'site-footer__links' },
            ...PROVIDER_LINKS.map((link) => el('li', null, el('a', { href: relativeHref(link.href) }, link.label)))
          )
        )
      ),
      el(
        'div',
        { class: 'site-footer__bottom' },
        el('p', null, `© ${year} HandyNaija. All rights reserved.`),
        el(
          'nav',
          { 'aria-label': 'Legal' },
          el(
            'div',
            { class: 'cluster', style: { '--cluster-gap': 'var(--space-4)' } },
            el('a', { href: relativeHref('pages/about.html') }, 'About'),
            el('a', { href: relativeHref('pages/contact.html') }, 'Contact'),
            el('a', { href: relativeHref('pages/terms.html') }, 'Terms'),
            el('a', { href: relativeHref('pages/privacy.html') }, 'Privacy')
          )
        )
      )
    )
  );

  mountPoint.replaceWith(footer);
  return footer;
}