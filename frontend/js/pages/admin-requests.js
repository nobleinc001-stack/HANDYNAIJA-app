/**
 * Admin — all requests (`admin-requests.html`).
 * Read-only oversight table with a status filter.
 */

import { registerPage, boot } from '../main.js';
import { el, mount, debounce, formatDateTime } from '../lib/dom.js';
import { call } from '../lib/api.js';
import { ROLES, REQUEST_STATUS, REQUEST_STATUS_ORDER, REQUEST_STATUS_LABELS } from '../../shared/constants.js';
import { renderShell, appendUserChip, pageHead } from '../components/shell.js';
import { statusBadge, emptyState, errorState } from '../components/ui.js';
import { relativeHref } from '../components/navbar.js';

registerPage('admin-requests', initRequests);

async function initRequests() {
  const initial = (new URLSearchParams(window.location.search).get('status') ?? '').toUpperCase();

  // Offer every status, including the terminal ones — an admin chasing a
  // complaint needs to filter by "Rejected" and "Cancelled" too.
  const FILTERABLE = [...REQUEST_STATUS_ORDER, REQUEST_STATUS.REJECTED, REQUEST_STATUS.CANCELLED];

  const content = renderShell({ role: ROLES.ADMIN, title: 'Requests', subtitle: 'Every request across the platform' });
  appendUserChip(content);

  const search = el('input', {
    class: 'control',
    type: 'search',
    placeholder: 'Search by reference, customer or provider',
    'aria-label': 'Search requests',
    style: { 'max-width': '22rem' },
  });

  const statusSelect = el('select', { class: 'control', 'aria-label': 'Filter by status', style: { 'max-width': '14rem' } },
    el('option', { value: '' }, 'All statuses'),
    ...FILTERABLE.map((status) =>
      el('option', { value: status, selected: status === initial }, REQUEST_STATUS_LABELS[status] ?? status)));

  const slot = el('div');
  content.append(
    pageHead('All requests', 'Inspect a request for support or dispute handling.'),
    el('div', { class: 'filter-group' }, search, statusSelect),
    slot
  );

  let requests = [];

  const draw = () => {
    const term = search.value.trim().toLowerCase();
    const status = statusSelect.value;

    let list = requests;
    if (status) list = list.filter((request) => request.status === status);
    if (term) {
      list = list.filter((request) =>
        `${request.id} ${request.customerName ?? ''} ${request.providerName ?? ''} ${request.serviceName ?? ''}`
          .toLowerCase()
          .includes(term));
    }

    if (!list.length) {
      mount(slot, emptyState({ iconName: 'calendar', title: 'No requests match these filters' }));
      return;
    }

    mount(slot, requestTable(list));
  };

  function requestTable(list) {
    return el('div', { class: 'table-wrap' },
      el('table', { class: 'table table--stackable' },
        el('thead', {}, el('tr', {},
          el('th', { scope: 'col' }, 'Reference'),
          el('th', { scope: 'col' }, 'Service'),
          el('th', { scope: 'col' }, 'Customer'),
          el('th', { scope: 'col' }, 'Provider'),
          el('th', { scope: 'col' }, 'Scheduled for'),
          el('th', { scope: 'col' }, 'Status')
        )),
        el('tbody', {}, ...list.map(requestRow))
      )
    );
  }

  function requestRow(request) {
    return el('tr', {},
      el('td', { class: 'table__primary' },
        el('a', { class: 'link', href: relativeHref(`request-details.html?id=${encodeURIComponent(request.id)}`) }, request.id)),
      el('td', { text: request.serviceName ?? '—' }),
      el('td', { text: request.customerName ?? '—' }),
      el('td', { text: request.providerName ?? '—' }),
      el('td', { class: 'text-xs text-muted', text: formatDateTime(request.preferredDate, request.preferredTime) }),
      el('td', {}, statusBadge(request.status))
    );
  }

  search.addEventListener('input', debounce(draw, 150));
  statusSelect.addEventListener('change', draw);

  try {
    const result = await call('GET', '/admin/requests', { query: { limit: 200 } });
    requests = result?.requests ?? [];
    draw();
  } catch (error) {
    mount(slot, errorState({ message: error.userMessage, onRetry: initRequests }));
  }
}

boot();