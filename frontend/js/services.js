/**
 * Provider search, filtering and sorting.
 *
 * Drives `services.html` (results + filter rail) and the compact search on
 * `index.html`. Filtering happens on the server via query params; the URL is
 * kept in sync so results are shareable and back/forward works.
 */

import { el, $, $$, mount, debounce, initials } from './lib/dom.js';
import { icon } from './lib/icons.js';
import { call } from './lib/api.js';
import * as store from './lib/store.js';
import { CATEGORY_GROUPS, SERVICE_NAMES, POPULAR_SERVICES, LOCATIONS, STATES } from '../../shared/constants.js';
import {
  skeletonGrid,
  emptyState,
  errorState,
  avatar,
  ratingDisplay,
  verifiedMark,
  toastError,
} from './components/ui.js';
import { relativeHref } from './components/navbar.js';

const PAGE_SIZE = 12;

/* ------------------------------------------------------------------ */
/* query state                                                         */
/* ------------------------------------------------------------------ */

export function readQueryState() {
  const params = new URLSearchParams(window.location.search);
  return {
    q: params.get('q') ?? '',
    category: params.get('category') ?? '',
    state: params.get('state') ?? '',
    city: params.get('city') ?? '',
    area: params.get('area') ?? '',
    minRating: params.get('minRating') ?? '',
    available: params.get('available') === 'true',
    sort: params.get('sort') ?? 'rating',
    page: Math.max(1, Number(params.get('page')) || 1),
  };
}

function writeQueryState(state, { replace = true } = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(state)) {
    if (value === '' || value === false || value === null || value === undefined) continue;
    if (key === 'page' && value === 1) continue;
    params.set(key, String(value));
  }
  const url = `${window.location.pathname}${params.toString() ? `?${params}` : ''}`;
  window.history[replace ? 'replaceState' : 'pushState']({}, '', url);
}

/* ------------------------------------------------------------------ */
/* provider card                                                       */
/* ------------------------------------------------------------------ */

export function providerCard(provider, { showRequest = true } = {}) {
  const serviceName = SERVICE_NAMES[provider.serviceCategory] ?? provider.serviceCategory;
  const href = relativeHref(`provider-public.html?id=${encodeURIComponent(provider.id)}`);

  const meta = el(
    'div',
    { class: 'provider-card__meta' },
    el('span', { class: 'provider-card__meta-item' }, el('span', { html: icon('briefcase') }), serviceName),
    el('span', { class: 'provider-card__meta-item' }, el('span', { html: icon('pin') }), `${provider.city}, ${provider.state}`),
    el(
      'span',
      { class: 'provider-card__meta-item' },
      el('span', { html: icon('starBadge') }),
      `${provider.experienceYears} ${provider.experienceYears === 1 ? 'year' : 'years'} experience`
    ),
    provider.available
      ? null
      : el('span', { class: 'provider-card__meta-item' }, el('span', { html: icon('clock') }), 'Currently unavailable')
  );

  return el(
    'article',
    { class: 'provider-card' },
    avatar(provider.businessName || provider.fullName, { src: provider.avatarUrl, className: 'provider-card__avatar' }),
    el(
      'div',
      { class: 'provider-card__body' },
      el(
        'div',
        { class: 'provider-card__head' },
        el('a', { class: 'provider-card__name', href }, provider.businessName || provider.fullName),
        verifiedMark(provider.verificationStatus)
      ),
      meta,
      el('p', { class: 'text-small text-muted clamp-2', text: provider.bio }),
      el(
        'div',
        { class: 'provider-card__actions' },
        el('a', { class: 'btn btn--secondary btn--sm', href }, icon('user'), 'View profile'),
        showRequest
          ? el(
              'a',
              { class: 'btn btn--primary btn--sm', href: relativeHref(`request-service.html?provider=${encodeURIComponent(provider.id)}`) },
              'Request service'
            )
          : null
      )
    )
  );
}

/** Slightly richer card used on the results page, with the rating surfaced. */
export function providerResultCard(provider) {
  const card = providerCard(provider);
  const body = $('.provider-card__body', card);
  const head = $('.provider-card__head', body);

  head.append(ratingDisplay(provider.rating, provider.reviewCount));
  return card;
}

/* ------------------------------------------------------------------ */
/* results controller                                                  */
/* ------------------------------------------------------------------ */

/**
 * Wires a results region: loading skeletons, filtering, sorting, pagination,
 * empty states and URL sync.
 *
 * @param {HTMLElement} container - where cards are rendered
 * @param {object} options
 * @param {string[]} [options.categories] - restrict the category filter
 * @param {boolean} [options.compact] - hide the request CTA
 */
export function initProviderSearch(container, { categories = null, compact = false, onChange = null } = {}) {
  if (!container) return null;

  const resultsMeta = $('[data-results-meta]');
  const emptySlot = $('[data-empty-slot]');
  let controller = null;
  let state = readQueryState();

  async function load({ announce = true } = {}) {
    controller?.abort();
    controller = new AbortController();

    // The markup ships `aria-busy="true"` on the results region so assistive
    // tech treats the first paint as still loading. It has to come back off,
    // otherwise the region stays "busy" forever and live-region updates after
    // the first one may never be announced.
    container.setAttribute('aria-busy', 'true');
    mount(container, skeletonGrid(compact ? 3 : PAGE_SIZE));
    emptySlot?.replaceChildren();
    if (resultsMeta) resultsMeta.textContent = '';

    try {
      const result = await call('GET', '/providers', {
        query: {
          q: state.q,
          category: state.category,
          state: state.state,
          city: state.city,
          area: state.area,
          minRating: state.minRating,
          available: state.available,
          sort: state.sort,
        },
        signal: controller.signal,
        auth: false,
      });

      const providers = result.providers ?? [];
      render(providers);
      if (state.q) store.pushRecentSearch(state.q);
      if (announce) announceResults(providers.length);
    } catch (error) {
      if (error?.name === 'AbortError') return;
      mount(container, errorState({ message: error.userMessage, onRetry: () => load() }));
    } finally {
      container.removeAttribute('aria-busy');
    }
  }

  function render(providers) {
    if (!providers.length) {
      mount(container);
      emptySlot?.replaceChildren(noResults(state));
      if (resultsMeta) resultsMeta.textContent = 'No providers found';
      return;
    }

    emptySlot?.replaceChildren();
    mount(
      container,
      el(
        'div',
        { class: 'stack', style: { '--flow': 'var(--space-4)' } },
        ...providers.map((provider) => (compact ? providerCard(provider, { showRequest: !compact }) : providerResultCard(provider)))
      )
    );

    if (resultsMeta) {
      const label = state.q ? ` for “${state.q}”` : '';
      resultsMeta.textContent = `${providers.length} provider${providers.length === 1 ? '' : 's'} found${label}`;
    }
  }

  function announceResults(count) {
    let live = $('[data-results-live]');
    if (!live) {
      live = el('span', { class: 'sr-only', 'aria-live': 'polite' });
      container.after(live);
    }
    live.textContent = `${count} provider${count === 1 ? '' : 's'} found.`;
  }

  function noResults(currentState) {
    const suggestions = [];
    if (currentState.q) suggestions.push('try a broader service name');
    if (currentState.category) suggestions.push('remove the category filter');
    if (currentState.minRating) suggestions.push('lower the minimum rating');
    if (currentState.area) suggestions.push('search a nearby area');

    return emptyState({
      iconName: 'search',
      title: 'No providers matched your search',
      text: suggestions.length
        ? `Try to ${suggestions.slice(0, 2).join(' or ')}.`
        : 'Try a different service or location.',
      action: el(
        'button',
        {
          class: 'btn btn--secondary',
          type: 'button',
          onclick: () => {
            state = { ...readQueryState(), q: '', category: '', state: '', city: '', area: '', minRating: '', available: false, page: 1 };
            syncInputs();
            writeQueryState(state);
            load();
          },
        },
        'Clear all filters'
      ),
    });
  }

  function syncInputs() {
    $$('[data-filter]').forEach((input) => {
      const key = input.dataset.filter;
      if (input.type === 'checkbox') input.checked = Boolean(state[key]);
      else input.value = state[key] ?? '';
    });
    $$('[data-sort]').forEach((select) => {
      select.value = state.sort;
    });
    $$('[data-search-input]').forEach((input) => {
      if (input.value !== state.q) input.value = state.q;
    });
  }

  /** Re-reads the filter rail, updates the URL, reloads. */
  function update({ push = false } = {}) {
    const next = { ...state };

    $$('[data-filter]').forEach((input) => {
      const key = input.dataset.filter;
      next[key] = input.type === 'checkbox' ? input.checked : input.value;
    });

    const sortSelect = $('[data-sort]');
    if (sortSelect) next.sort = sortSelect.value;

    next.page = 1;
    state = next;
    writeQueryState(state, { replace: !push });
    onChange?.(state);
    load();
  }

  /* --- wiring ---------------------------------------------------- */

  const searchInputs = $$('[data-search-input]');
  searchInputs.forEach((input) => {
    input.value = state.q;

    const run = debounce(() => {
      state = { ...state, q: input.value, page: 1 };
      writeQueryState(state);
      onChange?.(state);
      load();
      // Keep the two search boxes (header + hero) in sync.
      searchInputs.forEach((other) => {
        if (other !== input) other.value = input.value;
      });
    }, 350);

    input.addEventListener('input', run);
    input.form?.addEventListener('submit', (event) => {
      event.preventDefault();
      input.removeEventListener('input', run);
      run();
      input.addEventListener('input', run);
    });
  });

  $$('[data-filter]').forEach((input) => {
    if (input.type === 'checkbox') input.addEventListener('change', () => update({ push: true }));
    else input.addEventListener('input', debounce(() => update(), 300));
    input.addEventListener('change', () => update({ push: true }));
  });

  $('[data-sort]')?.addEventListener('change', (event) => update({ push: true }));

  $$('[data-clear-filters]').forEach((button) =>
    button.addEventListener('click', () => {
      state = { ...state, q: '', category: '', state: '', city: '', area: '', minRating: '', available: false, page: 1 };
      syncInputs();
      writeQueryState(state);
      onChange?.(state);
      load();
    })
  );

  // City options follow the selected state.
  const stateSelect = $('[data-filter="state"]');
  const citySelect = $('[data-filter="city"]');
  if (stateSelect && citySelect) {
    const syncCities = () => {
      const list = LOCATIONS[stateSelect.value] ?? [];
      const previous = citySelect.value;
      citySelect.replaceChildren(
        el('option', { value: '' }, 'All cities'),
        ...list.map((city) => el('option', { value: city, selected: city === previous }, city))
      );
      citySelect.disabled = !stateSelect.value;
    };
    stateSelect.addEventListener('change', syncCities);
    syncCities();
  }

  window.addEventListener('popstate', () => {
    state = readQueryState();
    syncInputs();
    onChange?.(state);
    load({ announce: false });
  });

  syncInputs();
  onChange?.(state);
  load({ announce: false });

  return { reload: load, getState: () => state, setState: (next) => { state = { ...state, ...next }; syncInputs(); load(); } };
}

/* ------------------------------------------------------------------ */
/* filter rail builder                                                 */
/* ------------------------------------------------------------------ */

/** Renders the category filter list from the shared constants. */
export function buildCategoryFilter(container, { selected = '', counts = null, categories = null } = {}) {
  if (!container) return;

  const source = categories ?? CATEGORY_GROUPS.flatMap((group) => group.services);

  const items = source.map((category) =>
    el(
      'label',
      { class: 'filter-option' },
      el('input', {
        type: 'radio',
        name: 'category',
        value: category.id,
        checked: category.id === selected,
        'data-filter': 'category',
      }),
      el('span', { text: category.name }),
      counts?.[category.id] !== undefined ? el('span', { class: 'filter-option__count', text: String(counts[category.id]) }) : null
    )
  );

  mount(
    container,
    el(
      'div',
      { class: 'filter-list' },
      el(
        'label',
        { class: 'filter-option' },
        el('input', { type: 'radio', name: 'category', value: '', checked: !selected, 'data-filter': 'category' }),
        el('span', { text: 'All categories' })
      ),
      ...items
    )
  );
}

/** Populates a `<select>` of states. */
export function fillStateSelect(select, { selected = '', placeholder = 'All states' } = {}) {
  if (!select) return;
  mount(
    select,
    el('option', { value: '' }, placeholder),
    ...STATES.map((state) => el('option', { value: state, selected: state === selected }, state))
  );
}

/** Renders the popular-service chips on the landing page. */
export function renderPopularChips(container, { limit = 6 } = {}) {
  if (!container) return;

  mount(
    container,
    ...POPULAR_SERVICES.filter((id) => SERVICE_NAMES[id]).slice(0, limit).map((id) =>
      el('a', { class: 'chip', href: relativeHref(`services.html?category=${id}`) }, SERVICE_NAMES[id])
    )
  );
}

/** Renders the category tile grid. */
export function renderCategoryGrid(container, { groups = CATEGORY_GROUPS } = {}) {
  if (!container) return;

  mount(
    container,
    el(
      'div',
      { class: 'grid-auto', style: { '--grid-gap': 'var(--space-4)' } },
      ...groups.map((group) =>
        el(
          'a',
          { class: 'category-card', href: relativeHref(`services.html?category=${group.services[0].id}`) },
          el('span', { class: 'category-card__icon' }, icon(categoryIcon(group.icon))),
          el('span', { class: 'category-card__name', text: group.name }),
          el('span', { class: 'category-card__count', text: `${group.services.length} services` })
        )
      )
    )
  );
}

function categoryIcon(name) {
  return { home: 'home', car: 'car', book: 'book', laptop: 'laptop', user: 'scissors' }[name] ?? 'briefcase';
}

export { initials, toastError };