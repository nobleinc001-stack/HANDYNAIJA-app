/**
 * Search results page (`services.html`).
 *
 * Wires the filter rail, sort control, URL sync and the result list. All of
 * the state lives in `services.js` so this file only supplies markup.
 */

import { registerPage, boot } from '../main.js';
import { $, el, mount } from '../lib/dom.js';
import { icon, iconNode } from '../lib/icons.js';
import { LOCATIONS, SERVICE_NAMES } from '../../shared/constants.js';
import { initProviderSearch, buildCategoryFilter, fillStateSelect, readQueryState } from '../services.js';
import * as store from '../lib/store.js';

registerPage('services', initServices);

function initServices() {
  // Search icon inside the input.
  $('[data-search-icon]')?.append(iconNode('search'));

  const initial = readQueryState();

  buildCategoryFilter($('[data-category-filter]'), { selected: initial.category });

  // Without this the state filter only ever offers "All states", which makes
  // the whole location filter unusable.
  fillStateSelect($('[data-filter="state"]'), { selected: initial.state, placeholder: 'All states' });

  populateCities(initial.city);
  renderRecentHint();

  const rebuildFilters = renderActiveFilters();
  initProviderSearch($('[data-provider-results]'), { onChange: (state) => rebuildFilters?.(state) });
}

/* ------------------------------------------------------------------ */
/* state -> city cascade                                               */
/* ------------------------------------------------------------------ */

function populateCities(preselect = '') {
  const stateSelect = $('[data-filter="state"]');
  const citySelect = $('[data-filter="city"]');
  if (!stateSelect || !citySelect) return;

  const sync = () => {
    const list = LOCATIONS[stateSelect.value] ?? [];
    const previous = citySelect.value || preselect;

    citySelect.replaceChildren(
      el('option', { value: '' }, stateSelect.value ? 'All cities' : 'Select a state first'),
      ...list.map((city) => el('option', { value: city, selected: city === previous }, city))
    );
    citySelect.disabled = list.length === 0;
    citySelect.value = list.includes(previous) ? previous : '';
  };

  stateSelect.addEventListener('change', sync);
  sync();
}

/* ------------------------------------------------------------------ */
/* recent searches                                                     */
/* ------------------------------------------------------------------ */

function renderRecentHint() {
  const hint = $('[data-recent-hint]');
  const recent = store.getRecentSearches();
  if (!hint || !recent.length) return;

  hint.hidden = false;
  hint.textContent = '';

  hint.append(
    'Recent: ',
    ...recent.map((term) =>
      el(
        'button',
        {
          class: 'chip',
          type: 'button',
          style: { 'margin-inline-end': 'var(--space-1)' },
          onclick: () => {
            const input = $('[data-search-input]');
            if (!input) return;
            input.value = term;
            input.dispatchEvent(new Event('input', { bubbles: true }));
          },
        },
        term
      )
    )
  );
}

/* ------------------------------------------------------------------ */
/* active filter summary                                               */
/* ------------------------------------------------------------------ */

/**
 * Mirrors the filter rail as removable chips. On a long results page the rail
 * is easy to scroll past, and nothing else tells you a filter is narrowing
 * the list.
 */
function renderActiveFilters() {
  const slot = $('[data-active-filters]');
  if (!slot) return null;

  const rebuild = (state = readQueryState()) => {
    const chips = [
      state.q && { key: 'q', label: `“${state.q}”` },
      state.category && { key: 'category', label: SERVICE_NAMES[state.category] ?? state.category },
      state.state && { key: 'state', label: state.state },
      state.city && { key: 'city', label: state.city },
      state.area && { key: 'area', label: state.area },
      state.minRating && { key: 'minRating', label: `${state.minRating} stars & up` },
      state.available && { key: 'available', label: 'Available now' },
    ].filter(Boolean);

    if (!chips.length) {
      mount(slot);
      slot.hidden = true;
      return;
    }

    slot.hidden = false;
    mount(
      slot,
      el('span', { class: 'text-small text-muted', text: 'Filters:' }),
      ...chips.map((chip) =>
        el(
          'button',
          {
            class: 'chip chip--remove',
            type: 'button',
            'aria-label': `Remove filter: ${chip.label}`,
            onclick: () => {
              const params = new URLSearchParams(window.location.search);
              params.delete(chip.key);
              const query = params.toString();
              window.location.href = query ? `${window.location.pathname}?${query}` : window.location.pathname;
            },
          },
          chip.label,
          icon('close')
        )
      )
    );
  };

  rebuild();
  return rebuild;
}

boot();