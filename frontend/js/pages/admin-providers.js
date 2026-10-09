/**
 * Admin — providers (`admin-providers.html`).
 * Approve or reject verification, and suspend a provider account.
 */

import { registerPage, boot } from '../main.js';
import { el, mount, debounce } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { call } from '../lib/api.js';
import { ROLES, VERIFICATION_STATUS, ACCOUNT_STATUS } from '../../../shared/constants.js';
import { renderShell, appendUserChip, pageHead } from '../components/shell.js';
import {
  avatar,
  badge,
  ratingDisplay,
  verifiedMark,
  emptyState,
  errorState,
  confirmDialog,
  modal,
  detailList,
  toastSuccess,
  toastError,
} from '../components/ui.js';
import { relativeHref } from '../components/navbar.js';

registerPage('admin-providers', initProviders);

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: VERIFICATION_STATUS.UNVERIFIED, label: 'Pending' },
  { key: VERIFICATION_STATUS.VERIFIED, label: 'Verified' },
  { key: ACCOUNT_STATUS.SUSPENDED, label: 'Suspended' },
];

async function initProviders() {
  const params = new URLSearchParams(window.location.search);

  const content = renderShell({ role: ROLES.ADMIN, title: 'Providers', subtitle: 'Verification and account control' });
  appendUserChip(content);

  const search = el('input', {
    class: 'control',
    type: 'search',
    placeholder: 'Search providers',
    'aria-label': 'Search providers',
    style: { 'max-width': '18rem' },
  });

  const tabs = el('div', { class: 'counter-tabs', role: 'tablist', 'aria-label': 'Filter providers' },
    ...FILTERS.map((filter) =>
      el('button', {
        class: 'counter-tab',
        type: 'button',
        role: 'tab',
        'aria-selected': String((params.get('status') ?? 'all') === filter.key),
        dataset: { filter: filter.key },
        text: filter.label,
      })));

  const slot = el('div');
  content.append(
    pageHead('Provider accounts', 'Verify legitimate providers and remove bad actors.'),
    el('div', { class: 'filter-group' }, search, tabs),
    slot
  );

  let providers = [];
  let activeFilter = params.get('status') ?? 'all';

  const draw = () => {
    const term = search.value.trim().toLowerCase();
    let list = providers;

    if (activeFilter === VERIFICATION_STATUS.UNVERIFIED) {
      list = list.filter((p) => p.verificationStatus !== VERIFICATION_STATUS.VERIFIED && p.status !== ACCOUNT_STATUS.SUSPENDED);
    } else if (activeFilter !== 'all') {
      list = list.filter((p) => (activeFilter === ACCOUNT_STATUS.SUSPENDED ? p.status === ACCOUNT_STATUS.SUSPENDED : p.verificationStatus === activeFilter));
    }

    if (term) list = list.filter((p) => `${p.businessName ?? p.fullName} ${p.email ?? ''}`.toLowerCase().includes(term));

    if (!list.length) {
      mount(slot, emptyState({ iconName: 'briefcase', title: 'No providers match' }));
      return;
    }

    mount(slot, el('div', { class: 'table-wrap' },
      el('table', { class: 'table table--stackable' },
        el('thead', {}, el('tr', {},
          el('th', { scope: 'col' }, 'Provider'),
          el('th', { scope: 'col' }, 'Rating'),
          el('th', { scope: 'col' }, 'Verification'),
          el('th', { scope: 'col' }, 'Account'),
          el('th', { scope: 'col' }, 'Actions')
        )),
        el('tbody', {}, ...list.map(providerRow)))));
  };

  search.addEventListener('input', debounce(draw, 150));
  tabs.addEventListener('click', (event) => {
    const button = event.target.closest('[data-filter]');
    if (!button) return;
    activeFilter = button.dataset.filter;
    for (const tab of tabs.children) tab.setAttribute('aria-selected', String(tab === button));
    draw();
  });

  try {
    const result = await call('GET', '/admin/providers', { query: { limit: 100 } });
    providers = result?.providers ?? [];
    draw();
  } catch (error) {
    mount(slot, errorState({ message: error.userMessage, onRetry: initProviders }));
  }

  function providerRow(provider) {
    const verified = provider.verificationStatus === VERIFICATION_STATUS.VERIFIED;
    const suspended = provider.status === ACCOUNT_STATUS.SUSPENDED;

    return el('tr', {},
      el('td', { class: 'table__primary' },
        el('div', { class: 'cluster', style: { '--cluster-gap': 'var(--space-3)' } },
          avatar(provider.businessName ?? provider.fullName, { src: provider.avatarUrl, size: 'sm' }),
          el('div', { class: 'stack', style: { '--flow': '0px' } },
            el('span', { text: provider.businessName ?? provider.fullName }),
            el('span', { class: 'text-xs text-muted', text: [provider.city, provider.state].filter(Boolean).join(', ') })))),
      el('td', {}, ratingDisplay(provider.rating, provider.reviewCount)),
      el('td', {}, el('span', { class: 'cluster', style: { '--cluster-gap': 'var(--space-2)' } },
        verifiedMark(provider.verificationStatus),
        badge(verified ? 'Verified' : 'Pending', { variant: verified ? 'verified' : 'warning' }))),
      el('td', {}, badge(provider.status ?? ACCOUNT_STATUS.ACTIVE, { variant: suspended ? 'danger' : 'active', dot: true })),
      el('td', { class: 'table__actions' },
        el('div', { class: 'cluster', style: { '--cluster-gap': 'var(--space-2)' } },
          el('button', { class: 'btn btn--ghost btn--sm', type: 'button', onclick: () => showDocuments(provider) }, 'Documents'),
          el('button', {
            class: 'btn btn--secondary btn--sm',
            type: 'button',
            onclick: async () => {
              const next = verified ? VERIFICATION_STATUS.UNVERIFIED : VERIFICATION_STATUS.VERIFIED;
              const confirmed = await confirmDialog({
                title: verified ? 'Remove verification' : 'Verify provider',
                message: verified
                  ? `Remove the verified badge from ${provider.businessName ?? provider.fullName}?`
                  : `Confirm that ${provider.businessName ?? provider.fullName} has submitted valid documents?`,
                confirmLabel: verified ? 'Remove badge' : 'Verify',
                variant: verified ? 'btn--danger' : 'btn--primary',
              });
              if (!confirmed) return;

              try {
                await call('PATCH', `/admin/providers/${encodeURIComponent(provider.id)}/verification`, { body: { status: next } });
                provider.verificationStatus = next;
                toastSuccess(`Verification updated to ${next}.`);
                draw();
              } catch (error) {
                toastError(error.userMessage ?? 'Could not update verification.');
              }
            },
          }, verified ? 'Unverify' : 'Verify'),
          el('button', {
            class: 'btn btn--danger-soft btn--sm',
            type: 'button',
            onclick: async () => {
              const next = suspended ? ACCOUNT_STATUS.ACTIVE : ACCOUNT_STATUS.SUSPENDED;
              const confirmed = await confirmDialog({
                title: suspended ? 'Reinstate provider' : 'Suspend provider',
                message: suspended
                  ? `Allow ${provider.businessName ?? provider.fullName} to accept requests again?`
                  : `Suspend ${provider.businessName ?? provider.fullName}? In-flight jobs are unaffected.`,
                confirmLabel: suspended ? 'Reinstate' : 'Suspend',
                variant: suspended ? 'btn--primary' : 'btn--danger',
              });
              if (!confirmed) return;

              try {
                await call('PATCH', `/admin/providers/${encodeURIComponent(provider.id)}/verification`, { body: { status: next, accountStatus: next } });
                provider.status = next;
                toastSuccess(`Account ${next}.`);
                draw();
              } catch (error) {
                toastError(error.userMessage ?? 'Could not update that account.');
              }
            },
          }, suspended ? 'Reinstate' : 'Suspend'))
      )
    );
  }

  function showDocuments(provider) {
    const documents = provider.documents ?? [];
    modal({
      title: `${provider.businessName ?? provider.fullName} — submitted documents`,
      wide: true,
      confirmLabel: 'Close',
      cancelLabel: 'Dismiss',
      body: documents.length
        ? detailList(documents.map((doc) => ({ label: doc.type ?? doc.name ?? 'Document', value: doc.fileName ?? doc.url ?? '—' })))
        : el('p', { class: 'text-small text-muted', text: 'No documents were submitted for this provider yet.' }),
      onConfirm: () => true,
    });
  }
}

boot();