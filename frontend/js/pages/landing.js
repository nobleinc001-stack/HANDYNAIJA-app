/**
 * Landing page (`index.html`).
 *
 * Hero search, a preview of nearby providers, the category grid, and the
 * top-rated list. Every panel degrades to a skeleton while its request is
 * in flight and to a helpful empty state afterwards.
 */

import { registerPage, boot, markLoaded } from '../main.js';
import { $, el, mount, debounce } from '../lib/dom.js';
import { icon, iconNode } from '../lib/icons.js';
import { call } from '../lib/api.js';
import { STATES, LOCATIONS, POPULAR_SERVICES, SERVICE_NAMES } from '../../shared/constants.js';
import {
  skeletonCard,
  emptyState,
  avatar,
  ratingDisplay,
  verifiedMark,
  errorState,
} from '../components/ui.js';
import { providerCard, renderCategoryGrid, renderPopularChips } from '../services.js';
import { relativeHref } from '../components/navbar.js';

registerPage('landing', initLanding);

async function initLanding() {
  wireHeroSearch();
  renderPopularChips($('[data-popular-chips]'), { limit: POPULAR_SERVICES.length });
  renderCategoryGrid($('[data-category-grid]'));

  await Promise.all([renderNearby(), renderTopProviders()]);
  markLoaded();
}

/* ------------------------------------------------------------------ */
/* hero search                                                         */
/* ------------------------------------------------------------------ */

function wireHeroSearch() {
  const form = $('#hero-search');
  if (!form) return;

  const queryInput = $('#hero-query');
  const stateSelect = $('[data-hero-state]');
  const citySelect = $('[data-hero-city]');

  // Inject the magnifier icon into the search group.
  const iconSlot = $('.control-group__icon', form);
  if (iconSlot) iconSlot.append(iconNode('search'));

  mount(
    stateSelect,
    el('option', { value: '' }, 'Select a state'),
    ...STATES.map((state) => el('option', { value: state }, state))
  );

  const syncCities = () => {
    const list = LOCATIONS[stateSelect.value] ?? [];
    mount(
      citySelect,
      el('option', { value: '' }, stateSelect.value ? 'Select a city' : 'Select a city first'),
      ...list.map((city) => el('option', { value: city }, city))
    );
    citySelect.disabled = list.length === 0;
  };

  stateSelect.addEventListener('change', syncCities);
  syncCities();

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const params = new URLSearchParams();
    const term = queryInput.value.trim();
    if (term) params.set('q', term);
    if (stateSelect.value) params.set('state', stateSelect.value);
    if (citySelect.value) params.set('city', citySelect.value);

    window.location.href = relativeHref(`services.html${params.toString() ? `?${params}` : ''}`);
  });

  // Suggest matching category names as the user types.
  const datalist = el('datalist', { id: 'hero-suggestions' });
  for (const id of POPULAR_SERVICES) {
    datalist.append(el('option', { value: SERVICE_NAMES[id] ?? id }));
  }
  queryInput.setAttribute('list', 'hero-suggestions');
  queryInput.after(datalist);

  queryInput.addEventListener(
    'input',
    debounce(() => {
      queryInput.setCustomValidity('');
    }, 200)
  );
}

/* ------------------------------------------------------------------ */
/* nearby providers (hero preview)                                     */
/* ------------------------------------------------------------------ */

async function renderNearby() {
  const slot = $('[data-nearby-providers]');
  if (!slot) return;

  slot.setAttribute('aria-busy', 'true');
  mount(slot, ...Array.from({ length: 3 }, skeletonCard));

  try {
    const { providers } = await call('GET', '/providers', {
      query: { sort: 'rating', available: 'true' },
      auth: false,
    });

    const top = (providers ?? []).slice(0, 3);

    if (!top.length) {
      mount(
        slot,
        emptyState({
          iconName: 'pin',
          title: 'No providers in your area yet',
          text: 'Try a different location, or check back soon.',
          action: el('a', { class: 'btn btn--secondary', href: relativeHref('services.html') }, 'Browse all providers'),
        })
      );
      return;
    }

    mount(
      slot,
      ...top.map((provider) => nearbyRow(provider))
    );
  } catch (error) {
    mount(slot, errorState({ message: error.userMessage, onRetry: renderNearby }));
  } finally {
    slot.removeAttribute('aria-busy');
  }
}

function nearbyRow(provider) {
  const serviceName = SERVICE_NAMES[provider.serviceCategory] ?? provider.serviceCategory;

  return el(
    'a',
    {
      class: 'cluster',
      href: relativeHref(`provider-public.html?id=${encodeURIComponent(provider.id)}`),
      style: { 'text-decoration': 'none', color: 'inherit', 'align-items': 'flex-start', '--cluster-gap': 'var(--space-3)' },
    },
    avatar(provider.businessName || provider.fullName, { src: provider.avatarUrl }),
    el(
      'div',
      { class: 'stack', style: { '--flow': '2px', 'min-width': '0', flex: '1 1 auto' } },
      el(
        'div',
        { class: 'cluster', style: { '--cluster-gap': 'var(--space-2)' } },
        el('span', { class: 'text-strong text-small', text: provider.businessName || provider.fullName }),
        verifiedMark(provider.verificationStatus)
      ),
      el('span', { class: 'text-xs text-muted', text: `${serviceName} • ${provider.city}` }),
      el('div', { class: 'cluster', style: { '--cluster-gap': 'var(--space-2)' } }, ratingDisplay(provider.rating, provider.reviewCount))
    )
  );
}

/* ------------------------------------------------------------------ */
/* top providers                                                       */
/* ------------------------------------------------------------------ */

async function renderTopProviders() {
  const slot = $('[data-top-providers]');
  if (!slot) return;

  slot.setAttribute('aria-busy', 'true');
  mount(slot, ...Array.from({ length: 3 }, skeletonCard));

  try {
    const { providers } = await call('GET', '/providers', { query: { sort: 'reviews' }, auth: false });
    const top = (providers ?? []).slice(0, 3);

    if (!top.length) {
      mount(slot, emptyState({ iconName: 'starOutline', title: 'No providers to show yet' }));
      return;
    }

    mount(slot, ...top.map((provider) => providerCard(provider)));
  } catch (error) {
    mount(slot, errorState({ message: error.userMessage, onRetry: renderTopProviders }));
  } finally {
    slot.removeAttribute('aria-busy');
  }
}

boot();