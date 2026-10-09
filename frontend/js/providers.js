/**
 * Provider profile rendering.
 *
 * Powers the public `provider-profile.html` page: identity header, about,
 * services, availability, reviews, and the request CTA.
 */

import { el, $, mount, initials } from './lib/dom.js';
import { icon } from './lib/icons.js';
import { call } from './lib/api.js';
import * as store from './lib/store.js';
import { DAYS_OF_WEEK, SERVICE_NAMES, VERIFICATION_STATUS } from '../shared/constants.js';
import {
  spinner,
  errorState,
  ratingDisplay,
  reviewCard,
  detailList,
  emptyState,
} from './components/ui.js';
import { relativeHref } from './components/navbar.js';

const DAY_LABELS = Object.fromEntries(DAYS_OF_WEEK.map((day) => [day.value, day.short]));

/* ------------------------------------------------------------------ */
/* sections                                                            */
/* ------------------------------------------------------------------ */

/** Collapses an availability array into readable lines. */
export function summariseAvailability(availability = []) {
  if (!availability.length) return [];
  if (!availability.some((slot) => slot.available)) return ['Unavailable at the moment'];

  const available = availability.filter((slot) => slot.available);
  const groups = [];

  for (const slot of available) {
    const last = groups.at(-1);
    const previousDay = last?.days.at(-1);
    const isConsecutive = previousDay !== undefined && (previousDay + 1) % 7 === slot.day;

    if (isConsecutive && last.start === slot.start && last.end === slot.end) {
      last.days.push(slot.day);
      continue;
    }
    groups.push({ days: [slot.day], start: slot.start, end: slot.end, label: DAY_LABELS[slot.day] ?? String(slot.day) });
  }

  return groups.map((group) => {
    const span = group.days.length > 1 ? `${group.label}–${DAY_LABELS[group.days.at(-1)]}` : group.label;
    return `${span}: ${formatClock(group.start)} – ${formatClock(group.end)}`;
  });
}

function formatClock(value) {
  if (!value) return '';
  const [hours, minutes] = String(value).split(':').map(Number);
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

/* ------------------------------------------------------------------ */
/* page                                                                */
/* ------------------------------------------------------------------ */

/**
 * Renders the whole provider profile into `[data-provider-root]`.
 * Reads the provider id from `?id=`.
 */
export async function renderProviderProfile(root, { providerId } = {}) {
  if (!root) return null;

  const id = providerId ?? new URLSearchParams(window.location.search).get('id');
  if (!id) {
    mount(root, errorState({ title: 'No provider selected', message: 'Open this page from a search result.' }));
    return null;
  }

  mount(root, spinner({ label: 'Loading provider profile', large: true }));

  try {
    const { provider } = await call('GET', `/providers/${encodeURIComponent(id)}`, { auth: false });
    const profile = hydrate(provider);
    mount(root, profileView(profile));
    return profile;
  } catch (error) {
    mount(
      root,
      errorState({
        title: 'We could not load this provider',
        message: error.userMessage,
        onRetry: () => renderProviderProfile(root, { providerId: id }),
      })
    );
    return null;
  }
}

/** Fills in derived fields the API may omit. */
function hydrate(provider) {
  return {
    reviews: [],
    averageRating: provider.rating ?? null,
    ...provider,
    serviceName: SERVICE_NAMES[provider.serviceCategory] ?? provider.serviceCategory,
  };
}

function profileView(provider) {
  const requestHref = relativeHref(`request-service.html?provider=${encodeURIComponent(provider.id)}`);
  const averageRating = provider.averageRating ?? provider.rating ?? 0;
  const reviews = provider.reviews ?? [];

  return el(
    'div',
    null,

    /* --- identity header ----------------------------------------- */
    el(
      'section',
      { class: 'profile-hero', 'aria-labelledby': 'provider-name' },
      el(
        'div',
        { class: 'profile-hero__identity' },
        avatarLarge(provider),
        el(
          'div',
          { class: 'profile-hero__text' },
          el(
            'div',
            { class: 'profile-hero__name' },
            el('h1', { class: 'h2', id: 'provider-name', text: provider.businessName || provider.fullName }),
            provider.verificationStatus === VERIFICATION_STATUS.VERIFIED
              ? el('span', { class: 'badge badge--verified' }, icon('verified'), 'Verified')
              : null
          ),
          el(
            'p',
            { class: 'text-small text-muted' },
            `${provider.serviceName} • ${provider.city}, ${provider.state} • ${provider.experienceYears} ${
              provider.experienceYears === 1 ? 'year' : 'years'
            } experience`
          ),
          el(
            'div',
            { class: 'cluster', style: { '--cluster-gap': 'var(--space-3)' } },
            ratingDisplay(averageRating, reviews.length || provider.reviewCount),
            el('span', { class: 'badge badge--neutral' }, icon('briefcase'), `${provider.completedJobs ?? 0} jobs completed`),
            provider.available
              ? el('span', { class: 'badge badge--completed' }, el('span', { class: 'badge__dot', 'aria-hidden': 'true' }), 'Available')
              : el('span', { class: 'badge badge--cancelled' }, el('span', { class: 'badge__dot', 'aria-hidden': 'true' }), 'Unavailable')
          ),
          provider.responseTime ? el('p', { class: 'text-xs text-muted', text: provider.responseTime }) : null
        )
      ),
      el(
        'div',
        { class: 'profile-hero__actions' },
        requestButton(provider, requestHref),
        el(
          'a',
          { class: 'btn btn--secondary', href: messageHref(provider) },
          icon('message'),
          'Message'
        )
      )
    ),

    /* --- about --------------------------------------------------- */
    el(
      'section',
      { class: 'profile-section', 'aria-labelledby': 'about-heading' },
      el('h2', { class: 'eyebrow', id: 'about-heading' }, 'About'),
      el('p', { text: provider.bio ?? 'This provider has not added a description yet.' }),
      el(
        'div',
        { class: 'cluster', style: { '--cluster-gap': 'var(--space-4)' } },
        el('span', { class: 'chip' }, icon('pin'), `Serves ${(provider.areas ?? []).join(', ') || provider.city}`),
        el('span', { class: 'chip' }, icon('shield'), `${averageRating.toFixed(1)} average rating`)
      )
    ),

    /* --- services ------------------------------------------------ */
    el(
      'section',
      { class: 'profile-section', 'aria-labelledby': 'services-heading' },
      el('h2', { class: 'eyebrow', id: 'services-heading' }, 'Services'),
      provider.services?.length
        ? el(
            'ul',
            { class: 'stack', style: { '--flow': 'var(--space-3)', 'list-style': 'none', padding: '0' } },
            ...provider.services.map((service) =>
              el(
                'li',
                { class: 'card card--padded', style: { padding: 'var(--space-4)' } },
                el(
                  'div',
                  { class: 'cluster', style: { '--cluster-gap': 'var(--space-3)' } },
                  el('span', { class: 'chip chip--remove' }, service.name),
                  el('span', { class: 'text-small text-muted', text: service.description ?? '' })
                )
              )
            )
          )
        : emptyState({
            iconName: 'briefcase',
            title: 'No services listed yet',
            text: 'This provider has not published their service menu.',
          })
    ),

    /* --- availability -------------------------------------------- */
    el(
      'section',
      { class: 'profile-section', 'aria-labelledby': 'availability-heading' },
      el('h2', { class: 'eyebrow', id: 'availability-heading' }, 'Availability'),
      el(
        'div',
        { class: 'cluster', style: { '--cluster-gap': 'var(--space-2)' } },
        ...summariseAvailability(provider.availability).map((line) => el('span', { class: 'chip', text: line }))
      )
    ),

    /* --- details ------------------------------------------------- */
    el(
      'section',
      { class: 'profile-section', 'aria-labelledby': 'details-heading' },
      el('h2', { class: 'eyebrow', id: 'details-heading' }, 'Details'),
      detailList([
        { label: 'Category', value: provider.serviceName },
        { label: 'Experience', value: `${provider.experienceYears} years` },
        { label: 'Location', value: `${provider.city}, ${provider.state}` },
        { label: 'Service areas', value: (provider.areas ?? []).join(', ') || '—' },
        { label: 'Jobs completed', value: String(provider.completedJobs ?? 0) },
        {
          label: 'Verification',
          node:
            provider.verificationStatus === VERIFICATION_STATUS.VERIFIED
              ? el('span', { class: 'badge badge--verified' }, icon('verified'), 'Identity verified by HandyNaija')
              : el('span', { class: 'badge badge--unverified', text: 'Not yet verified' }),
        },
      ])
    ),

    /* --- reviews ------------------------------------------------- */
    el(
      'section',
      { class: 'profile-section', 'aria-labelledby': 'reviews-heading' },
      el(
        'div',
        { class: 'cluster cluster-between' },
        el('h2', { class: 'eyebrow', id: 'reviews-heading' }, 'Reviews'),
        reviews.length ? ratingDisplay(averageRating, reviews.length) : null
      ),
      reviews.length
        ? el('div', { class: 'stack', style: { '--flow': 'var(--space-3)' } }, ...reviews.map(reviewCard))
        : emptyState({
            iconName: 'starOutline',
            title: 'No reviews yet',
            text: 'This provider has not completed a reviewable service.',
          })
    ),

    /* --- sticky CTA (mobile) ------------------------------------ */
    el('div', { class: 'sticky-cta' }, requestButton(provider, requestHref))
  );
}

function requestButton(provider, href) {
  if (!provider.available) {
    return el(
      'a',
      { class: 'btn btn--secondary btn--lg', href: messageHref(provider), 'aria-disabled': 'true' },
      'Currently unavailable'
    );
  }
  return el('a', { class: 'btn btn--primary btn--lg', href }, 'Request service');
}

function messageHref(provider) {
  // Messaging is tied to a service request, so route through the request flow.
  return relativeHref(`request-service.html?provider=${encodeURIComponent(provider.id)}&focus=messages`);
}

function avatarLarge(provider) {
  return el(
    'span',
    { class: 'avatar avatar--xl' },
    provider.avatarUrl
      ? el('img', { src: provider.avatarUrl, alt: '' })
      : initials(provider.businessName || provider.fullName)
  );
}

/* ------------------------------------------------------------------ */
/* current provider                                                    */
/* ------------------------------------------------------------------ */

/**
 * Resolves the `PRV-*` id of the signed-in provider.
 *
 * The session stores a user id (`USR-*`), but every provider-scoped endpoint
 * is keyed by the provider record id. When the session already carries a
 * `providerId` we use it; otherwise we ask the API and cache the answer on the
 * stored user so the lookup only happens once per session.
 *
 * @returns {Promise<string|null>}
 */
export async function resolveMyProviderId() {
  const user = store.getUser();
  if (!user) return null;
  if (user.providerId) return user.providerId;

  try {
    const { provider } = await call('GET', '/provider/me');
    if (!provider?.id) return null;

    store.setUser({ ...user, providerId: provider.id });
    return provider.id;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* review submission (customer, post-completion)                       */
/* ------------------------------------------------------------------ */

/**
 * Opens the review dialog for a completed request.
 * Resolves to the created review, or undefined if cancelled.
 */
export async function submitReviewForRequest(requestId, providerName) {
  const { ratingInput, modal, toastSuccess } = await import('./components/ui.js');

  const stars = ratingInput({ name: 'rating', value: 0, describedBy: 'rating-hint' });
  const comment = el('textarea', {
    class: 'control',
    id: 'review-comment',
    name: 'comment',
    rows: 4,
    maxlength: 2000,
    placeholder: 'Tell other customers about your experience',
  });

  const body = el(
    'div',
    { class: 'form' },
    el('p', { class: 'text-small text-muted', text: `How was your experience with ${providerName}?` }),
    stars,
    el(
      'div',
      { class: 'field' },
      el('label', { class: 'field__label', for: 'review-comment' }, 'Your review'),
      comment,
      el('span', { class: 'field__hint', text: 'Reviews are tied to completed services and cannot be edited by the provider.' })
    )
  );

  return modal({
    title: 'Review this service',
    body,
    confirmLabel: 'Submit review',
    wide: false,
    onConfirm: async () => {
      const rating = Number(stars.input.value);
      if (!rating) throw blocked('Select a star rating before submitting.', 'Rating required');

      const text = comment.value.trim();
      if (text.length < 10) {
        throw blocked('Tell other customers a little more — at least 10 characters.', 'Review too short');
      }

      const result = await call('POST', `/requests/${encodeURIComponent(requestId)}/review`, {
        body: { rating, comment: text },
      });

      toastSuccess('Thank you. Your review has been published.', { title: 'Review submitted' });
      return result?.review ?? { rating, comment: text };
    },
  });
}

/**
 * Keeps the dialog open and shows a specific message. `modal` reads
 * `userMessage` off whatever `onConfirm` throws, so a rejected review does not
 * look like a server failure.
 */
function blocked(message, title) {
  const error = new Error(message);
  error.userMessage = message;
  error.title = title;
  return error;
}