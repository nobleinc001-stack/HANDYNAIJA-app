/**
 * Provider reviews (`provider-reviews.html`).
 * Rating breakdown plus the full review list for the signed-in provider.
 */

import { registerPage, boot } from '../main.js';
import { el, mount } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { call } from '../lib/api.js';
import { ROLES } from '../../../shared/constants.js';
import { renderShell, appendUserChip, pageHead } from '../components/shell.js';
import {
  avatar,
  ratingDisplay,
  reviewCard,
  emptyState,
  errorState,
  skeletonCard,
  statTile,
} from '../components/ui.js';
import { resolveMyProviderId } from '../providers.js';

registerPage('provider-reviews', initReviews);

async function initReviews() {
  const providerId = await resolveMyProviderId();

  const content = renderShell({
    role: ROLES.PROVIDER,
    title: 'Reviews',
    subtitle: 'Feedback from customers you have worked with',
  });

  appendUserChip(content);

  const slot = el('div');
  content.append(pageHead('Customer reviews', 'Responding to reviews is optional, but it builds trust.'), slot);

  mount(slot, el('div', { class: 'stack', style: { '--flow': 'var(--space-4)' } },
    ...Array.from({ length: 3 }, () => skeletonCard())));

  try {
    const [{ reviews = [] }, provider] = await Promise.all([
      call('GET', `/providers/${encodeURIComponent(providerId)}/reviews`, { query: { sort: 'recent', limit: 50 } }),
      call('GET', `/providers/${encodeURIComponent(providerId)}`),
    ]);

    if (!reviews.length) {
      mount(slot, emptyState({ iconName: 'starOutline', title: 'No reviews yet', text: 'Complete a job and the customer can leave a review.' }));
      return;
    }

    const breakdown = [5, 4, 3, 2, 1].map((stars) => ({
      stars,
      count: reviews.filter((review) => Math.round(review.rating) === stars).length,
    }));
    const total = reviews.length;

    mount(slot,
      el('div', { class: 'stat-grid' },
        statTile({ label: 'Average rating', value: (provider?.provider?.rating ?? reviews[0].rating ?? 0).toFixed(1), accent: true }),
        statTile({ label: 'Total reviews', value: String(total) }),
        statTile({ label: 'Recommended', value: `${Math.round((breakdown[0].count + breakdown[1].count) / total * 100)}%` })
      ),
      ratingCard(breakdown, total, reviews),
      el('div', { class: 'stack', style: { '--flow': 'var(--space-4)' } },
        ...reviews.map((review) => reviewCard(review)))
    );
  } catch (error) {
    mount(slot, errorState({ message: error.userMessage, onRetry: initReviews }));
  }
}

/** Rating distribution card. */
function ratingCard(breakdown, total, reviews) {
  return el('div', { class: 'card card--padded' },
    el('h2', { class: 'eyebrow', style: { 'margin-bottom': 'var(--space-4)' } }, 'Rating breakdown'),
    el('div', { class: 'stack', style: { '--flow': 'var(--space-2)' } },
      ...breakdown.map((row) =>
        el('div', { class: 'cluster', style: { '--cluster-gap': 'var(--space-3)' } },
          el('span', { class: 'text-xs text-muted', style: { 'min-width': '3.5rem' }, text: `${row.stars} star` }),
          el('div', { class: 'rating-bar', role: 'img', 'aria-label': `${row.count} of ${total} reviews gave ${row.stars} stars` },
            el('div', { class: 'rating-bar__fill', style: { width: `${Math.round((row.count / total) * 100)}%` } })),
          el('span', { class: 'text-xs text-muted', text: String(row.count) })
        )
      )
    )
  );
}

boot();