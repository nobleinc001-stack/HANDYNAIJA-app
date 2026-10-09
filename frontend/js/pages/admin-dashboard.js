/**
 * Admin dashboard (`admin-dashboard.html`).
 *
 * Platform counts, open reports, pending verifications and recent activity.
 * Everything comes from `GET /admin/dashboard`.
 */

import { registerPage, boot } from '../main.js';
import { el, mount, formatRelative } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { call } from '../lib/api.js';
import { ROLES, REQUEST_STATUS } from '../../shared/constants.js';
import { renderShell, appendUserChip, pageHead } from '../components/shell.js';
import {
  statTile,
  badge,
  emptyState,
  errorState,
  skeletonStatGrid,
  sectionHead,
  spinner,
} from '../components/ui.js';
import { relativeHref } from '../components/navbar.js';

registerPage('admin-dashboard', initAdminDashboard);

async function initAdminDashboard() {
  const content = renderShell({
    role: ROLES.ADMIN,
    title: 'Admin',
    subtitle: 'Platform health and moderation',
  });

  appendUserChip(content);

  const statsSlot = el('div');
  const panelsSlot = el('div', { class: 'dashboard-grid' });

  mount(
    content,
    pageHead('Platform overview', 'Users, providers, requests and anything needing a decision.'),
    statsSlot,
    panelsSlot
  );

  mount(statsSlot, skeletonStatGrid(4));
  mount(panelsSlot, el('div', { class: 'card card--padded' }, spinner({ label: 'Loading platform overview' })));

  try {
    const data = await call('GET', '/admin/dashboard');

    // The endpoint returns `{ stats, activity, reports }`. Tolerate a nested
    // `summary` too, so the page keeps working if the payload is reshaped.
    const stats = data?.stats ?? data?.summary ?? {};
    const reports = data?.reports ?? [];

    mount(
      statsSlot,
      statTile({ label: 'Customers', value: String(stats.customers ?? stats.totalCustomers ?? 0), accent: true }),
      statTile({ label: 'Providers', value: String(stats.providers ?? stats.totalProviders ?? 0) }),
      statTile({ label: 'Requests', value: String(stats.activeRequests ?? stats.totalRequests ?? 0) }),
      statTile({ label: 'Open reports', value: String(stats.openReports ?? 0) })
    );

    mount(
      panelsSlot,
      el(
        'section',
        { class: 'card card--padded', 'aria-labelledby': 'providers-heading' },
        sectionHead('Providers', 'Verification and account status', 'admin-providers.html', 'Manage', 'providers-heading'),
        detailCard([
          { label: 'Verified', value: stats.verifiedProviders ?? 0, href: 'admin-providers.html?status=verified' },
          { label: 'Awaiting verification', value: stats.unverifiedProviders ?? stats.pendingProviders ?? 0, href: 'admin-providers.html?status=unverified' },
          { label: 'Suspended', value: stats.suspendedProviders ?? 0, href: 'admin-providers.html?status=suspended' },
          { label: 'Active categories', value: stats.categoriesActive ?? 0, href: 'admin-categories.html' },
        ])
      ),
      el(
        'section',
        { class: 'card card--padded', 'aria-labelledby': 'requests-heading' },
        sectionHead('Requests', 'Volume across the platform', 'admin-requests.html', 'All requests', 'requests-heading'),
        detailCard([
          { label: 'Pending', value: stats.pendingRequests ?? 0, href: `admin-requests.html?status=${REQUEST_STATUS.PENDING}` },
          { label: 'Active', value: stats.activeRequests ?? 0, href: 'admin-requests.html' },
          { label: 'Completed', value: stats.completedServices ?? stats.completedRequests ?? 0, href: `admin-requests.html?status=${REQUEST_STATUS.COMPLETED}` },
          { label: 'Declined or cancelled', value: stats.rejectedRequests ?? stats.disputedRequests ?? 0, href: `admin-requests.html?status=${REQUEST_STATUS.REJECTED}` },
        ])
      ),
      el(
        'section',
        { class: 'card card--padded', 'aria-labelledby': 'activity-heading' },
        sectionHead('Recent activity', 'What has happened on the platform', null, null, 'activity-heading'),
        activityList(data?.activity ?? [])
      ),
      el(
        'section',
        { class: 'card card--padded card--full', 'aria-labelledby': 'reports-heading' },
        sectionHead('Reports needing review', 'Customer and provider complaints', 'admin-reports.html', 'Open queue', 'reports-heading'),
        reportsTable(reports)
      )
    );
  } catch (error) {
    mount(panelsSlot, el('div', { class: 'card card--padded' }, errorState({ message: error.userMessage, onRetry: initAdminDashboard })));
  }
}

/* ------------------------------------------------------------------ */

function activityList(activity) {
  if (!activity.length) {
    return emptyState({ iconName: 'chart', title: 'No recent activity', text: 'Platform events will appear here.' });
  }

  return el(
    'ul',
    { class: 'list' },
    ...activity.slice(0, 6).map((item) =>
      el(
        'li',
        {},
        el(
          'div',
          { class: 'list__row' },
          el(
            'span',
            { class: 'stack', style: { '--flow': '0px' } },
            el('span', { class: 'list__primary', text: item.message }),
            item.detail ? el('span', { class: 'list__meta text-xs text-muted', text: item.detail }) : null
          ),
          el('span', { class: 'spacer' }),
          el('span', { class: 'text-xs text-muted', text: formatRelative(item.createdAt) })
        )
      )
    )
  );
}

/* ------------------------------------------------------------------ */

function detailCard(rows) {
  return el('div', { class: 'stack', style: { '--flow': 'var(--space-2)' } },
    ...rows.map((row) =>
      el('a', { class: 'list__row', href: relativeHref(row.href) },
        el('span', { class: 'list__primary', text: row.label }),
        el('span', { class: 'spacer' }),
        el('strong', { text: String(row.value) }),
        icon('chevronRight'))));
}

function reportsTable(reports) {
  const open = reports.filter((report) => !['resolved', 'dismissed'].includes(report.status));

  if (!open.length) {
    return emptyState({ iconName: 'checkCircle', title: 'Nothing to review', text: 'All reports have been handled.' });
  }

  return el('div', { class: 'table-wrap' },
    el('table', { class: 'table table--stackable' },
      el('thead', {}, el('tr', {},
        el('th', { scope: 'col' }, 'Report'),
        el('th', { scope: 'col' }, 'Reason'),
        el('th', { scope: 'col' }, 'Against'),
        el('th', { scope: 'col' }, 'Status'),
        el('th', { scope: 'col' }, 'Raised')
      )),
      el('tbody', {},
        ...open.slice(0, 8).map((report) =>
          el('tr', {},
            el('td', { class: 'table__primary', text: report.id }),
            el('td', { text: report.reason ?? '—' }),
            el('td', { text: [report.targetName, report.targetType].filter(Boolean).join(' • ') || '—' }),
            el('td', {}, badge(report.status ?? 'open', { variant: 'warning', dot: true })),
            el('td', { class: 'text-xs text-muted', text: formatRelative(report.createdAt) })
          )))
    ));
}

boot();