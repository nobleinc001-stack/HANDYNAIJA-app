/**
 * Admin — customers (`admin-users.html`).
 * Searchable list with suspend / reactivate via `PATCH /admin/users/:id/status`.
 */

import { registerPage, boot } from '../main.js';
import { el, mount, debounce, formatRelative } from '../lib/dom.js';
import { call } from '../lib/api.js';
import { ROLES, ACCOUNT_STATUS } from '../../shared/constants.js';
import { renderShell, appendUserChip, pageHead } from '../components/shell.js';
import {
  avatar,
  badge,
  emptyState,
  errorState,
  confirmDialog,
  toastSuccess,
  toastError,
} from '../components/ui.js';

registerPage('admin-users', initUsers);

async function initUsers() {
  const content = renderShell({ role: ROLES.ADMIN, title: 'Customers', subtitle: 'Accounts created on the platform' });
  appendUserChip(content);

  const search = el('input', {
    class: 'control',
    type: 'search',
    placeholder: 'Search by name or email',
    'aria-label': 'Search customers',
    style: { 'max-width': '20rem' },
  });

  const slot = el('div');
  content.append(
    pageHead('Customer accounts', 'Suspend an account to block sign-in and new requests.'),
    el('div', { class: 'filter-group', style: { 'margin-bottom': 'var(--space-4)' } }, search),
    slot
  );

  let users = [];

  const draw = () => {
    const term = search.value.trim().toLowerCase();
    const filtered = term
      ? users.filter((user) => `${user.fullName} ${user.email}`.toLowerCase().includes(term))
      : users;

    if (!filtered.length) {
      mount(slot, emptyState({ iconName: 'users', title: 'No customers match that search' }));
      return;
    }

    mount(slot, el('div', { class: 'table-wrap' },
      el('table', { class: 'table table--stackable' },
        el('thead', {}, el('tr', {},
          el('th', { scope: 'col' }, 'Customer'),
          el('th', { scope: 'col' }, 'Phone'),
          el('th', { scope: 'col' }, 'Joined'),
          el('th', { scope: 'col' }, 'Status'),
          el('th', { scope: 'col' }, 'Actions')
        )),
        el('tbody', {}, ...filtered.map(userRow)))));
  };

  search.addEventListener('input', debounce(draw, 150));

  try {
    const result = await call('GET', '/admin/users', { query: { limit: 100 } });
    users = result?.users ?? [];
    draw();
  } catch (error) {
    mount(slot, errorState({ message: error.userMessage, onRetry: initUsers }));
  }

  function userRow(user) {
    const suspended = user.status === ACCOUNT_STATUS.SUSPENDED;

    return el('tr', {},
      el('td', { class: 'table__primary' },
        el('div', { class: 'cluster', style: { '--cluster-gap': 'var(--space-3)' } },
          avatar(user.fullName, { src: user.avatarUrl, size: 'sm' }),
          el('span', { text: user.fullName }))),
      el('td', { class: 'text-xs text-muted', text: user.phone ?? user.email ?? '—' }),
      el('td', { class: 'text-xs text-muted', text: formatRelative(user.joinedAt ?? user.createdAt) }),
      el('td', {}, badge(user.status ?? ACCOUNT_STATUS.ACTIVE, { variant: suspended ? 'danger' : 'active', dot: true })),
      el('td', { class: 'table__actions' },
        el('button', {
          class: suspended ? 'btn btn--secondary btn--sm' : 'btn btn--danger-soft btn--sm',
          type: 'button',
          onclick: async () => {
            const next = suspended ? ACCOUNT_STATUS.ACTIVE : ACCOUNT_STATUS.SUSPENDED;
            const confirmed = await confirmDialog({
              title: suspended ? 'Reactivate account' : 'Suspend account',
              message: suspended
                ? `Allow ${user.fullName} to sign in again?`
                : `Suspend ${user.fullName}? They will be signed out and cannot create new requests.`,
              confirmLabel: suspended ? 'Reactivate' : 'Suspend',
              variant: suspended ? 'btn--primary' : 'btn--danger',
            });
            if (!confirmed) return;

            try {
              await call('PATCH', `/admin/users/${encodeURIComponent(user.id)}/status`, { body: { status: next } });
              user.status = next;
              toastSuccess(`${user.fullName} is now ${next}.`);
              draw();
            } catch (error) {
              toastError(error.userMessage ?? 'Could not update that account.');
            }
          },
        }, suspended ? 'Reactivate' : 'Suspend'))
    );
  }
}

boot();