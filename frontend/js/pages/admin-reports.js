/**
 * Admin — reports and review moderation (`admin-reports.html`).
 *
 * Two tabs: the report queue (resolve / dismiss) and review moderation
 * (hide abusive reviews).
 */

import { registerPage, boot } from '../main.js';
import { el, mount, formatRelative } from '../lib/dom.js';
import { call } from '../lib/api.js';
import { ROLES, REPORT_REASON_LABELS } from '../../shared/constants.js';
import { renderShell, appendUserChip, pageHead } from '../components/shell.js';
import {
  badge,
  ratingDisplay,
  emptyState,
  errorState,
  confirmDialog,
  toastSuccess,
  toastError,
} from '../components/ui.js';

registerPage('admin-reports', initReports);

async function initReports() {
  const content = renderShell({ role: ROLES.ADMIN, title: 'Reports & reviews', subtitle: 'Moderation queue' });
  appendUserChip(content);

  const reportsPanel = el('div');
  const reviewsPanel = el('div', { hidden: true });

  const tabs = el('div', { class: 'counter-tabs', role: 'tablist', 'aria-label': 'Moderation sections' },
    el('button', { class: 'counter-tab', type: 'button', role: 'tab', 'aria-selected': 'true', dataset: { tab: 'reports' }, text: 'Reports' }),
    el('button', { class: 'counter-tab', type: 'button', role: 'tab', 'aria-selected': 'false', dataset: { tab: 'reviews' }, text: 'Reviews' })
  );

  content.append(
    pageHead('Moderation', 'Resolve reports and remove reviews that break the rules.'),
    tabs,
    el('div', { style: { 'margin-top': 'var(--space-4)' } }, reportsPanel, reviewsPanel)
  );

  tabs.addEventListener('click', (event) => {
    const button = event.target.closest('[data-tab]');
    if (!button) return;
    const showReports = button.dataset.tab === 'reports';
    for (const tab of tabs.children) tab.setAttribute('aria-selected', String(tab === button));
    reportsPanel.hidden = !showReports;
    reviewsPanel.hidden = showReports;
  });

  await loadReports(reportsPanel);
  await loadReviews(reviewsPanel);
}

/* ------------------------------------------------------------------ */

async function loadReports(slot) {
  mount(slot, errorState({ title: 'Loading reports', message: '' }));

  let reports = [];

  const draw = () => {
    const open = reports.filter((report) => !['resolved', 'dismissed'].includes(report.status));

    if (!open.length) {
      mount(slot, emptyState({ iconName: 'checkCircle', title: 'Queue is clear', text: 'Every report has been handled.' }));
      return;
    }

    mount(slot, el('div', { class: 'table-wrap' },
      el('table', { class: 'table table--stackable' },
        el('thead', {}, el('tr', {},
          el('th', { scope: 'col' }, 'Report'),
          el('th', { scope: 'col' }, 'Reason'),
          el('th', { scope: 'col' }, 'Details'),
          el('th', { scope: 'col' }, 'Raised'),
          el('th', { scope: 'col' }, 'Actions')
        )),
        el('tbody', {}, ...open.map((report) =>
          el('tr', {},
            el('td', { class: 'table__primary', text: report.id }),
            el('td', { text: REPORT_REASON_LABELS[report.reason] ?? report.reason ?? '—' }),
            el('td', {},
              el('div', { class: 'stack', style: { '--flow': '0px' } },
                el('span', { class: 'text-xs', text: `${report.reporterName ?? report.reportedByName ?? report.reporterId ?? 'User'} → ${report.targetName ?? report.targetId ?? '—'}` }),
                el('span', { class: 'text-xs text-muted', text: (report.description ?? '').slice(0, 120) }))),
            el('td', { class: 'text-xs text-muted', text: formatRelative(report.createdAt) }),
            el('td', { class: 'table__actions' },
              el('div', { class: 'cluster', style: { '--cluster-gap': 'var(--space-2)' } },
                el('button', { class: 'btn btn--primary btn--sm', type: 'button', onclick: () => resolve(report, 'resolved', draw) }, 'Resolve'),
                el('button', { class: 'btn btn--ghost btn--sm', type: 'button', onclick: () => resolve(report, 'dismissed', draw) }, 'Dismiss'))
          )))))));
  };

  try {
    const result = await call('GET', '/admin/reports', { query: { limit: 100 } });
    reports = result?.reports ?? [];
    draw();
  } catch (error) {
    mount(slot, errorState({ message: error.userMessage, onRetry: () => loadReports(slot) }));
  }

  async function resolve(report, status, redraw) {
    const confirmed = await confirmDialog({
      title: status === 'resolved' ? 'Resolve report' : 'Dismiss report',
      message: status === 'resolved'
        ? `Mark ${report.id} as resolved and notify the reporter?`
        : `Dismiss ${report.id}? The reporter is told there was no breach.`,
      confirmLabel: status === 'resolved' ? 'Resolve' : 'Dismiss',
      variant: status === 'resolved' ? 'btn--primary' : 'btn--ghost',
    });
    if (!confirmed) return;

    try {
      await call('PATCH', `/admin/reports/${encodeURIComponent(report.id)}/status`, { body: { status } });
      report.status = status;
      toastSuccess(`Report ${status}.`);
      redraw();
    } catch (error) {
      toastError(error.userMessage ?? 'Could not update that report.');
    }
  }
}

/** One review card with a hide / restore control. */
function reviewRow(review) {
  const button = el('button', {
    class: review.isHidden ? 'btn btn--secondary btn--sm' : 'btn btn--danger-soft btn--sm',
    type: 'button',
    text: review.isHidden ? 'Restore' : 'Hide',
  });

  button.addEventListener('click', async () => {
    const next = review.isHidden ? 'published' : 'hidden';

    const confirmed = await confirmDialog({
      title: next === 'hidden' ? 'Hide review' : 'Restore review',
      message: next === 'hidden'
        ? 'Hide this review from the provider profile? The customer is not notified.'
        : 'Make this review visible again?',
      confirmLabel: next === 'hidden' ? 'Hide' : 'Restore',
    });
    if (!confirmed) return;

    try {
      await call('PATCH', `/admin/reviews/${encodeURIComponent(review.id)}/moderation`, { body: { status: next } });
      review.isHidden = next === 'hidden';
      review.moderationStatus = next;
      button.textContent = review.isHidden ? 'Restore' : 'Hide';
      button.className = review.isHidden ? 'btn btn--secondary btn--sm' : 'btn btn--danger-soft btn--sm';
      toastSuccess(`Review ${next}.`);
    } catch (error) {
      toastError(error.userMessage ?? 'Could not update that review.');
    }
  });

  return el('article', { class: 'card card--padded' },
    el('div', { class: 'cluster', style: { '--cluster-gap': 'var(--space-2)', 'margin-bottom': 'var(--space-2)' } },
      el('strong', { class: 'text-small', text: review.customerName ?? 'Customer' }),
      ratingDisplay(review.rating),
      el('span', { class: 'spacer' }),
      badge(review.moderationStatus ?? 'published', { variant: review.isHidden ? 'danger' : 'active', dot: true })),
    el('p', { class: 'text-small', text: review.comment ?? '' }),
    el('div', { class: 'btn-group', style: { 'margin-top': 'var(--space-3)' } }, button)
  );
}

async function loadReviews(slot) {
  try {
    const { reviews = [] } = await call('GET', '/admin/reviews', { query: { limit: 100 } });

    if (!reviews.length) {
      mount(slot, emptyState({ iconName: 'starOutline', title: 'No reviews to moderate' }));
      return;
    }

    mount(slot, el('div', { class: 'stack', style: { '--flow': 'var(--space-3)' } },
      ...reviews.map(reviewRow)));
  } catch (error) {
    mount(slot, errorState({ message: error.userMessage, onRetry: () => loadReviews(slot) }));
  }
}

boot();