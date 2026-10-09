/**
 * Service request lifecycle.
 *
 * Covers the booking flow (`request-service.html`), the customer's request
 * list, and the provider's accept / reject / status actions. Every state
 * change is checked against `ALLOWED_TRANSITIONS` before the API is called,
 * so the UI never offers an action the server would reject.
 */

import { el, $, $$, mount, formatDateTime, formatRelative, todayIso } from './lib/dom.js';
import { icon } from './lib/icons.js';
import { call } from './lib/api.js';
import * as store from './lib/store.js';
import {
  REQUEST_STATUS,
  REQUEST_STATUS_LABELS,
  ACTIVE_STATUSES,
  ALLOWED_TRANSITIONS,
  TRANSITION_ACTORS,
  CATEGORY_GROUPS,
  SERVICE_NAMES,
  LOCATIONS,
  STATES,
  ROLES,
} from '../shared/constants.js';
import {
  validateDate,
  validateTime,
  validatePreferredSlot,
  validateArea,
  validateState,
  validateCity,
  validateRequired,
  validateText,
  validateImageFile,
} from '../shared/validation.js';
import {
  statusBadge,
  progressTimeline,
  emptyState,
  errorState,
  avatar,
  detailList,
  spinner,
  toastSuccess,
  toastError,
  confirmDialog,
  field,
  uploadField,
  badge,
} from './components/ui.js';
import { relativeHref } from './components/navbar.js';
import { initForm, bindLocationCascade } from './validators.js';

/* ================================================================== */
/* booking flow                                                        */
/* ================================================================== */

/**
 * Builds the "Request a service" form.
 *
 * @param {HTMLElement} container
 * @param {object} options
 * @param {string} [options.providerId] - pre-selected provider
 * @param {(id:string)=>Promise<object>} [options.loadProvider]
 * @param {(created:object)=>void} [options.onCreated]
 */
export function initBookingForm(container, { providerId = null, loadProvider = null, onCreated = null } = {}) {
  if (!container) return null;

  const draft = store.getRequestDraft() ?? {};
  const params = new URLSearchParams(window.location.search);
  const preselected = providerId ?? params.get('provider');

  // A request always belongs to a provider, so never present a form that asks
  // the customer to type an id — send them back to the results instead.
  if (!preselected) {
    mount(
      container,
      emptyState({
        iconName: 'search',
        title: 'Choose a provider first',
        text: 'Requests are sent to a specific professional, so pick who you would like to do the job.',
        action: el('a', { class: 'btn btn--primary', href: relativeHref('services.html') }, 'Find a provider'),
      })
    );
    return container;
  }

  mount(container, spinner({ label: 'Preparing the request form' }));

  // Build asynchronously so the provider lookup can populate the service list.
  Promise.resolve(preselected && loadProvider ? loadProvider(preselected) : null).then((provider) => {
    mount(container, formMarkup(provider, draft, preselected));

    const form = $('form', container);
    // `field()` derives the input id from the field name, so target by name
    // rather than by a hand-written id that does not exist.
    const stateSelect = $('[name="state"]', form);
    const citySelect = $('[name="city"]', form);
    const areaInput = $('[name="area"]', form);

    bindLocationCascade({
      stateSelect,
      citySelect,
      areaInput,
      cities: LOCATIONS,
      onChange: (location) => store.setRequestDraft({ ...collect(form), ...location }),
    });

    // Prefill date/time with sensible minimums.
    const dateInput = $('[name="preferredDate"]', form);
    const timeInput = $('[name="preferredTime"]', form);

    if (dateInput) {
      dateInput.min = todayIso();
      if (!dateInput.value) dateInput.value = draft.preferredDate ?? todayIso(1);
    }

    // Offer only the provider's actual services when we know them. The control
    // is a <select>, so replace its options rather than its children.
    if (provider?.services?.length) {
      const select = $('[name="serviceId"]', form);
      if (select instanceof HTMLSelectElement) {
        mount(
          select,
          el('option', { value: '' }, 'Select a service'),
          ...provider.services.map((service) =>
            el('option', { value: service.id, selected: service.id === draft.serviceId }, service.name)
          )
        );
      }
    }

    const wired = initForm(form, {
      rules: {
        providerId: (values) => validateRequired(values.providerId, 'Choose a provider'),
        serviceId: (values) => validateRequired(values.serviceId, 'Choose a service'),
        description: (values) => validateText(values.description, { label: 'Describe what you need help with', min: 20, max: 2000 }),
        state: (values) => validateState(values.state),
        city: (values) => validateCity(values.city, values.state),
        area: (values) => validateArea(values.area),
        preferredDate: (values) => validateDate(values.preferredDate),
        preferredTime: (values) => validateTime(values.preferredTime),
        photo: (values, name) => {
          const file = form.querySelector('[data-field="photo"]')?.file?.();
          if (!file) return { valid: true, message: null, value: null };
          return validateImageFile(file);
        },
      },
      onSubmit: async (values) => {
        // Cross-field rule: the slot must be far enough in the future.
        const slot = validatePreferredSlot(values.preferredDate, values.preferredTime, { minLeadMinutes: 60 });
        if (!slot.valid) {
          const timeField = $('[name="preferredTime"]', form)?.closest('[data-field]');
          timeField?.showError?.(slot.message);
          $('[name="preferredTime"]', form)?.focus();
          return;
        }

        const payload = {
          provider_id: values.providerId,
          category_id: values.categoryId ?? values.serviceId,
          service_id: values.serviceId,
          description: values.description.trim(),
          state: values.state,
          city: values.city,
          area: values.area.trim(),
          preferred_date: values.preferredDate,
          preferred_time: values.preferredTime,
          notes: values.notes?.trim() ?? '',
        };

        const result = await call('POST', '/requests', { body: payload });
        store.clearRequestDraft();
        toastSuccess('Your request has been sent. The provider will respond shortly.', { title: 'Request sent' });

        if (onCreated) onCreated(result);
        else window.location.href = relativeHref(`request-confirmation.html?id=${encodeURIComponent(result.id)}`);
      },
    });

    // Save a draft on change so an accidental navigation loses nothing.
    form.addEventListener('change', () => store.setRequestDraft(collect(form)));
  });

  return container;
}

function collect(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  return data;
}

function formMarkup(provider, draft, preselected) {
  const form = el(
    'form',
    { class: 'form', novalidate: true },

    /* --- error summary ------------------------------------------ */
    el('div', { class: 'alert alert--danger hidden', 'data-error-summary-host': '', role: 'alert' }, el('span', { class: 'sr-only' }, 'Errors')),
    el('p', { class: 'field__error-text', 'data-error-summary': '', role: 'alert' }),

    /* --- provider ---------------------------------------------- */
    el(
      'section',
      { class: 'form-section', 'aria-labelledby': 'section-provider' },
      el('h2', { class: 'eyebrow', id: 'section-provider' }, 'Provider'),
      el(
        'div',
        { class: 'form-grid' },
        field({
          name: 'providerId',
          label: 'Provider',
          type: 'text',
          value: draft.providerId ?? provider?.id ?? preselected,
          required: true,
          full: true,
          iconName: 'briefcase',
          readonly: true,
          hint: provider ? `Sending your request to ${provider.businessName}.` : preselected,
        }),
        // Always a <select>: when no provider is preselected it falls back to
        // the full category list, so the field is never a free-text box.
        field({
          name: 'serviceId',
          label: 'Service needed',
          required: true,
          full: true,
          options: provider
            ? [
                { value: '', label: 'Select a service' },
                ...provider.services.map((service) => ({ value: service.id, label: service.name })),
              ]
            : [
                { value: '', label: 'Select a category' },
                ...CATEGORY_GROUPS.flatMap((group) => group.services).map((service) => ({
                  value: service.id,
                  label: service.name,
                })),
              ],
          value: draft.serviceId ?? provider?.services?.[0]?.id ?? '',
          hint: provider ? 'From this provider’s published service list.' : null,
        }),
      )
    ),

    /* --- job description ---------------------------------------- */
    el(
      'section',
      { class: 'form-section', 'aria-labelledby': 'section-job' },
      el('h2', { class: 'eyebrow', id: 'section-job' }, 'What do you need help with?'),
      field({
        name: 'description',
        label: 'Describe the problem',
        type: 'textarea',
        value: draft.description ?? '',
        required: true,
        full: true,
        rows: 5,
        min: 20,
        max: 2000,
        placeholder: 'For example: the kitchen sink is leaking underneath the cabinet whenever the tap runs.',
        hint: 'At least 20 characters. The more detail, the fewer follow-up questions.',
      })
    ),

    /* --- location ----------------------------------------------- */
    el(
      'section',
      { class: 'form-section', 'aria-labelledby': 'section-location' },
      el('h2', { class: 'eyebrow', id: 'section-location' }, 'Location'),
      el(
        'div',
        { class: 'form-grid' },
        field({
          name: 'state',
          label: 'State',
          required: true,
          options: [{ value: '', label: 'Select a state' }, ...STATES.map((item) => ({ value: item, label: item }))],
          value: draft.state ?? '',
        }),
        field({
          name: 'city',
          label: 'City',
          required: true,
          options: [{ value: '', label: 'Select a city' }],
          value: draft.city ?? '',
        }),
        field({
          name: 'area',
          label: 'Area or neighbourhood',
          value: draft.area ?? '',
          required: true,
          full: true,
          iconName: 'pin',
          placeholder: 'e.g. Umuoji',
          hint: 'This helps the provider plan the visit. Exact addresses are shared after acceptance.',
        })
      )
    ),

    /* --- scheduling --------------------------------------------- */
    el(
      'section',
      { class: 'form-section', 'aria-labelledby': 'section-schedule' },
      el('h2', { class: 'eyebrow', id: 'section-schedule' }, 'Preferred date and time'),
      el(
        'div',
        { class: 'form-grid' },
        field({ name: 'preferredDate', label: 'Preferred date', type: 'date', required: true, value: draft.preferredDate ?? '' }),
        field({ name: 'preferredTime', label: 'Preferred time', type: 'time', required: true, value: draft.preferredTime ?? '' })
      ),
      el('p', { class: 'field__hint' }, 'The provider may propose a different time. You will be notified before anything is confirmed.')
    ),

    /* --- attachments & notes ------------------------------------ */
    el(
      'section',
      { class: 'form-section', 'aria-labelledby': 'section-extra' },
      el('h2', { class: 'eyebrow', id: 'section-extra' }, 'Optional photo and notes'),
      uploadField({ name: 'photo', label: 'Photo of the problem', hint: 'A photo often helps providers quote accurately. JPG, PNG or WEBP, up to 5MB.' }),
      field({
        name: 'notes',
        label: 'Additional notes',
        type: 'textarea',
        value: draft.notes ?? '',
        rows: 3,
        max: 1000,
        full: true,
        placeholder: 'Anything else the provider should know before arriving.',
      })
    ),

    /* --- submit -------------------------------------------------- */
    el(
      'div',
      { class: 'cluster', style: { '--cluster-gap': 'var(--space-3)' } },
      el('button', { class: 'btn btn--primary btn--lg', type: 'submit' }, 'Submit request'),
      el('a', { class: 'btn btn--ghost', href: relativeHref('my-requests.html') }, 'Save and finish later')
    ),
    el('p', { class: 'field__hint' }, 'By submitting you agree that HandyNaija may share your contact details with this provider.')
  );

  return form;
}

/* ================================================================== */
/* customer request list                                               */
/* ================================================================== */

/** Renders the customer's requests with live status filters. */
export async function renderCustomerRequests(container, { emptyAction = null } = {}) {
  if (!container) return;

  mount(container, spinner({ label: 'Loading your requests' }));

  try {
    const { requests } = await call('GET', '/requests', { query: { sort: 'recent' } });
    const list = requests ?? [];
    const counts = countByStatus(list);
    const reload = () => renderCustomerRequests(container, { emptyAction });

    const tabs = el(
      'div',
      { class: 'counter-tabs', role: 'tablist', 'aria-label': 'Filter requests by status' },
      ...[
        { key: 'all', label: 'All', count: list.length },
        { key: 'active', label: 'Active', count: list.filter((item) => ACTIVE_STATUSES.includes(item.status)).length },
        { key: 'completed', label: 'Completed', count: counts[REQUEST_STATUS.COMPLETED] ?? 0 },
        { key: 'cancelled', label: 'Cancelled', count: (counts[REQUEST_STATUS.CANCELLED] ?? 0) + (counts[REQUEST_STATUS.REJECTED] ?? 0) },
      ].map((tab) =>
        el(
          'button',
          { class: 'counter-tab', type: 'button', role: 'tab', 'aria-selected': String(tab.key === 'all'), dataset: { tab: tab.key } },
          tab.label,
          el('span', { class: 'counter-tab__count', text: String(tab.count) })
        )
      )
    );

    const listSlot = el('div', { class: 'stack', style: { '--flow': 'var(--space-3)' } });

    const applyFilter = (key) => {
      const filtered = key === 'all' ? list : list.filter((item) => matchesTab(item, key));
      renderList(listSlot, filtered, emptyAction);
      $$('[data-tab]', container).forEach((tab) => tab.setAttribute('aria-selected', String(tab.dataset.tab === key)));
    };

    tabs.addEventListener('click', (event) => {
      const button = event.target.closest('[data-tab]');
      if (button) applyFilter(button.dataset.tab);
    });

    mount(container, tabs, el('div', { style: { height: 'var(--space-5)' } }), listSlot);
    applyFilter('all');

    // Cancel / review buttons in the cards are inert until this is wired.
    bindRequestActions(container, { reload, role: ROLES.CUSTOMER });

    // Deep link from a notification: ?id=REQ-00124 or ?review=REQ-00102
    const params = new URLSearchParams(window.location.search);
    const focusId = params.get('id') ?? params.get('review');
    if (focusId) {
      const target = listSlot.querySelector(`[data-request-id="${focusId}"]`);
      target?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      target?.classList.add('is-highlight');
    }
  } catch (error) {
    mount(container, errorState({ message: error.userMessage, onRetry: () => renderCustomerRequests(container) }));
  }
}

function matchesTab(request, key) {
  if (key === 'active') return ACTIVE_STATUSES.includes(request.status);
  if (key === 'completed') return request.status === REQUEST_STATUS.COMPLETED;
  if (key === 'cancelled') return request.status === REQUEST_STATUS.CANCELLED || request.status === REQUEST_STATUS.REJECTED;
  return true;
}

function countByStatus(list) {
  return list.reduce((acc, request) => {
    acc[request.status] = (acc[request.status] ?? 0) + 1;
    return acc;
  }, {});
}

function renderList(container, list, emptyAction) {
  if (!list.length) {
    mount(
      container,
      emptyState({
        iconName: 'calendar',
        title: 'Nothing here yet',
        text: 'Requests you send will appear here with their current status.',
        action:
          emptyAction ??
          el('a', { class: 'btn btn--primary', href: relativeHref('services.html') }, 'Find a service'),
      })
    );
    return;
  }

  mount(
    container,
    ...list.map((request) =>
      el(
        'article',
        { class: 'card', dataset: { requestId: request.id } },
        el(
          'div',
          { class: 'card__body' },
          el(
            'div',
            { class: 'cluster cluster-between' },
            el(
              'div',
              { class: 'stack', style: { '--flow': '2px' } },
              el('h3', { class: 'card__title' }, request.serviceName ?? SERVICE_NAMES[request.categoryId] ?? 'Service request'),
              el('span', { class: 'text-xs text-muted', text: `${request.id} • ${request.providerName}` })
            ),
            statusBadge(request.status)
          ),
          el(
            'dl',
            { class: 'meta-list' },
            el('div', null, el('dt', null, 'When: '), el('dd', null, formatDateTime(request.preferredDate, request.preferredTime))),
            el('div', null, el('dt', null, 'Where: '), el('dd', null, `${request.area}, ${request.city}`))
          ),
          request.rejectionReason
            ? el('p', { class: 'text-small text-danger', text: `Reason: ${request.rejectionReason}` })
            : null,
          request.status === REQUEST_STATUS.COMPLETED
            ? el('button', { class: 'btn btn--sm btn--secondary', type: 'button', 'data-review': request.id }, icon('starOutline'), 'Leave a review')
            : null
        ),
        el(
          'div',
          { class: 'card__footer' },
          el('a', { class: 'btn btn--sm btn--ghost', href: relativeHref(`request-details.html?id=${request.id}`) }, 'View details'),
          el('a', { class: 'btn btn--sm btn--ghost', href: relativeHref(`messages.html?request=${request.id}`) }, icon('message'), 'Message'),
          canCancel(request)
            ? el('button', { class: 'btn btn--sm btn--danger-soft', type: 'button', 'data-cancel': request.id }, 'Cancel request')
            : null
        )
      )
    )
  );
}

function canCancel(request) {
  const allowed = ALLOWED_TRANSITIONS[request.status] ?? [];
  return allowed.includes(REQUEST_STATUS.CANCELLED) && TRANSITION_ACTORS[REQUEST_STATUS.CANCELLED] === ROLES.CUSTOMER;
}

/* ================================================================== */
/* request details                                                     */
/* ================================================================== */

/** Renders a single request with its timeline and role-appropriate actions. */
export async function renderRequestDetails(container, { requestId, role = ROLES.CUSTOMER, providerName = null } = {}) {
  if (!container) return null;

  const id = requestId ?? new URLSearchParams(window.location.search).get('id');
  if (!id) {
    mount(container, errorState({ title: 'No request selected', message: 'Open this page from your request list.' }));
    return null;
  }

  mount(container, spinner({ label: 'Loading request' }));

  try {
    const { request } = await call('GET', `/requests/${encodeURIComponent(id)}`, { auth: role !== ROLES.CUSTOMER });
    mount(container, detailsView(request, role, providerName));
    bindRequestActions(container, {
      reload: () => renderRequestDetails(container, { requestId: id, role, providerName }),
      role,
    });
    return request;
  } catch (error) {
    mount(container, errorState({ message: error.userMessage, onRetry: () => renderRequestDetails(container, { requestId: id, role }) }));
    return null;
  }
}

function detailsView(request, role, providerName) {
  const name = providerName ?? request.providerName;

  return el(
    'div',
    { class: 'stack', style: { '--flow': 'var(--space-6)' } },

    el(
      'div',
      { class: 'page-head' },
      el(
        'div',
        { class: 'page-head__text' },
        el('span', { class: 'eyebrow', text: `Request ${request.id}` }),
        el('h1', { class: 'h1', text: request.serviceName ?? 'Service request' }),
        el('p', { class: 'text-small text-muted', text: `Sent ${formatRelative(request.createdAt)}` })
      ),
      el('div', { class: 'page-head__actions' }, statusBadge(request.status))
    ),

    /* --- progress ----------------------------------------------- */
    el(
      'section',
      { class: 'profile-section' },
      el('h2', { class: 'eyebrow' }, 'Progress'),
      progressTimeline(request.status),
      request.status === REQUEST_STATUS.REJECTED && request.rejectionReason
        ? el('p', { class: 'text-small text-danger', text: `The provider declined: ${request.rejectionReason}` })
        : null
    ),

    /* --- details ----------------------------------------------- */
    el(
      'section',
      { class: 'profile-section' },
      el('h2', { class: 'eyebrow' }, 'Request details'),
      detailList([
        { label: 'Provider', value: name },
        { label: 'Service', value: request.serviceName ?? SERVICE_NAMES[request.categoryId] ?? '—' },
        { label: 'Description', value: request.description },
        { label: 'Location', value: `${request.area ?? ''}, ${request.city}, ${request.state}`.replace(/^,\s*/, '') },
        { label: 'Preferred', value: formatDateTime(request.preferredDate, request.preferredTime) },
        { label: 'Notes', value: request.notes || '—' },
        { label: 'Last updated', value: formatRelative(request.updatedAt ?? request.createdAt) },
      ])
    ),

    /* --- actions ----------------------------------------------- */
    actionBar(request, role)
  );
}

function actionBar(request, role) {
  const allowed = ALLOWED_TRANSITIONS[request.status] ?? [];
  const actions = [];

  if (role === ROLES.CUSTOMER) {
    if (allowed.includes(REQUEST_STATUS.CANCELLED)) {
      actions.push(
        el('button', { class: 'btn btn--secondary', type: 'button', 'data-cancel': request.id }, 'Cancel request')
      );
    }
    if (request.status === REQUEST_STATUS.COMPLETED) {
      actions.push(el('button', { class: 'btn btn--primary', type: 'button', 'data-review': request.id }, icon('starOutline'), 'Leave a review'));
    }
  }

  if (role === ROLES.PROVIDER) {
    if (allowed.includes(REQUEST_STATUS.ACCEPTED)) {
      actions.push(el('button', { class: 'btn btn--primary', type: 'button', 'data-accept': request.id }, 'Accept request'));
    }
    if (allowed.includes(REQUEST_STATUS.REJECTED)) {
      actions.push(el('button', { class: 'btn btn--danger-soft', type: 'button', 'data-reject': request.id }, 'Decline'));
    }
    for (const next of [REQUEST_STATUS.SCHEDULED, REQUEST_STATUS.IN_PROGRESS, REQUEST_STATUS.COMPLETED]) {
      if (!allowed.includes(next)) continue;
      actions.push(
        el(
          'button',
          { class: 'btn btn--primary', type: 'button', 'data-request': request.id, dataset: { status: next } },
          REQUEST_STATUS_LABELS[next]
        )
      );
    }
  }

  actions.push(
    el('a', { class: 'btn btn--secondary', href: relativeHref(`messages.html?request=${request.id}`) }, icon('message'), 'Message')
  );

  return el(
    'section',
    { class: 'profile-section' },
    el('h2', { class: 'eyebrow' }, 'Actions'),
    el(
      'div',
      { class: 'btn-group btn-group--stack' },
      ...actions
    )
  );
}

/* ================================================================== */
/* status transitions                                                  */
/* ------------------------------------------------------------------ */
/* All of these re-read the request after mutating so the UI always
   reflects what the server actually stored.
   ================================================================== */

export async function acceptRequest(requestId, { reload } = {}) {
  try {
    await call('PATCH', `/provider/requests/${encodeURIComponent(requestId)}/accept`, { body: {} });
    toastSuccess('Request accepted. The customer has been notified.', { title: 'Accepted' });
    await reload?.();
    return true;
  } catch (error) {
    toastError(error.userMessage, { title: 'Could not accept' });
    return false;
  }
}

export async function rejectRequest(requestId, { reload } = {}) {
  const { modal } = await import('./components/ui.js');
  const textarea = el('textarea', { class: 'control', rows: 3, maxlength: 500, placeholder: 'Let the customer know why (optional)' });

  const confirmed = await modal({
    title: 'Decline this request',
    body: el(
      'div',
      { class: 'stack', style: { '--flow': 'var(--space-3)' } },
      el('p', { text: 'The customer will be notified. A short reason is helpful and improves trust.' }),
      textarea
    ),
    confirmLabel: 'Decline request',
    variant: 'btn--danger',
    onConfirm: async () => {
      await call('PATCH', `/provider/requests/${encodeURIComponent(requestId)}/reject`, {
        body: { reason: textarea.value.trim() },
      });
      return true;
    },
  });

  if (!confirmed) return false;

  toastSuccess('Request declined.', { title: 'Declined' });
  await reload?.();
  return true;
}

export async function updateRequestStatus(requestId, status, { reload } = {}) {
  try {
    await call('PATCH', `/provider/requests/${encodeURIComponent(requestId)}/status`, { body: { status } });
    toastSuccess(`Marked as ${REQUEST_STATUS_LABELS[status].toLowerCase()}.`, { title: 'Status updated' });
    await reload?.();
    return true;
  } catch (error) {
    toastError(error.userMessage, { title: 'Could not update status' });
    return false;
  }
}

export async function cancelRequest(requestId, { reload } = {}) {
  const ok = await confirmDialog({
    title: 'Cancel this request?',
    message: 'The provider will be notified. This cannot be undone.',
    confirmLabel: 'Cancel request',
    variant: 'btn--danger',
  });
  if (!ok) return false;

  try {
    await call('PATCH', `/requests/${encodeURIComponent(requestId)}/cancel`, { body: {} });
    toastSuccess('Request cancelled.', { title: 'Cancelled' });
    await reload?.();
    return true;
  } catch (error) {
    toastError(error.userMessage, { title: 'Could not cancel' });
    return false;
  }
}

/* ================================================================== */
/* provider request queue                                              */
/* ================================================================== */

/** Renders the provider's incoming requests with status tabs. */
export async function renderProviderRequestQueue(container) {
  if (!container) return;

  mount(container, spinner({ label: 'Loading requests' }));

  try {
    const { requests } = await call('GET', '/provider/requests');
    const list = requests ?? [];
    const reload = () => renderProviderRequestQueue(container);

    if (!list.length) {
      mount(
        container,
        emptyState({
          iconName: 'inbox',
          title: 'No requests yet',
          text: 'When a customer sends you a request it will appear here for you to accept or decline.',
        })
      );
      return;
    }

    const statuses = [REQUEST_STATUS.PENDING, REQUEST_STATUS.ACCEPTED, REQUEST_STATUS.SCHEDULED, REQUEST_STATUS.IN_PROGRESS, REQUEST_STATUS.COMPLETED];

    const tabs = el(
      'div',
      { class: 'tabs', role: 'tablist', 'aria-label': 'Filter requests' },
      ...['ALL', ...statuses].map((key) =>
        el(
          'button',
          { class: 'tabs__tab', type: 'button', role: 'tab', 'aria-selected': String(key === 'ALL'), dataset: { statusTab: key } },
          key === 'ALL' ? 'All' : REQUEST_STATUS_LABELS[key]
        )
      )
    );

    const tableSlot = el('div');
    const apply = (key) => {
      const filtered = key === 'ALL' ? list : list.filter((item) => item.status === key);
      mount(tableSlot, filtered.length ? requestTable(filtered, reload) : emptyState({ iconName: 'inbox', title: 'Nothing in this view' }));
    };

    tabs.addEventListener('click', (event) => {
      const button = event.target.closest('[data-status-tab]');
      if (!button) return;
      $$('[data-status-tab]', tabs).forEach((tab) => tab.setAttribute('aria-selected', String(tab === button)));
      apply(button.dataset.statusTab);
    });

    mount(container, tabs, el('div', { style: { height: 'var(--space-4)' } }), tableSlot);
    apply('ALL');

    // Accept / decline / start / complete in the table are inert until wired.
    bindRequestActions(container, { reload, role: ROLES.PROVIDER });
  } catch (error) {
    mount(container, errorState({ message: error.userMessage, onRetry: () => renderProviderRequestQueue(container) }));
  }
}

function requestTable(list, reload) {
  const rows = list.map((request) => {
    const allowed = ALLOWED_TRANSITIONS[request.status] ?? [];

    return el(
      'tr',
      null,
      el(
        'td',
        { dataset: { label: 'Customer' } },
        el(
          'div',
          { class: 'cluster', style: { '--cluster-gap': 'var(--space-2)' } },
          avatar(request.customerName, { size: 'sm' }),
          el(
            'div',
            { class: 'stack', style: { '--flow': '0px' } },
            el('span', { class: 'table__primary', text: request.customerName }),
            el('span', { class: 'text-xs text-muted', text: request.id })
          )
        )
      ),
      el('td', { dataset: { label: 'Service' } }, el('span', { class: 'table__primary', text: request.serviceName ?? 'Service' }), el('br'), el('span', { class: 'text-xs text-muted clamp-2', text: request.description })),
      el('td', { dataset: { label: 'Where' } }, `${request.area}, ${request.city}`),
      el('td', { dataset: { label: 'Date / time' } }, formatDateTime(request.preferredDate, request.preferredTime)),
      el('td', { dataset: { label: 'Status' } }, statusBadge(request.status)),
      el(
        'td',
        { dataset: { label: 'Actions' } },
        el(
          'div',
          { class: 'table__actions' },
          el('a', { class: 'btn btn--sm btn--ghost', href: relativeHref(`request-details.html?id=${request.id}`) }, 'View'),
          allowed.includes(REQUEST_STATUS.ACCEPTED)
            ? el('button', { class: 'btn btn--sm btn--primary', type: 'button', 'data-accept': request.id }, 'Accept')
            : null,
          allowed.includes(REQUEST_STATUS.REJECTED)
            ? el('button', { class: 'btn btn--sm btn--danger-soft', type: 'button', 'data-reject': request.id }, 'Decline')
            : null,
          allowed.includes(REQUEST_STATUS.IN_PROGRESS)
            ? el('button', { class: 'btn btn--sm btn--secondary', type: 'button', 'data-request': request.id, dataset: { status: REQUEST_STATUS.IN_PROGRESS } }, 'Start')
            : null,
          allowed.includes(REQUEST_STATUS.COMPLETED)
            ? el('button', { class: 'btn btn--sm btn--primary', type: 'button', 'data-request': request.id, dataset: { status: REQUEST_STATUS.COMPLETED } }, 'Complete')
            : null,
          el('a', { class: 'btn btn--sm btn--ghost', href: relativeHref(`messages.html?request=${request.id}`) }, icon('message'))
        )
      )
    );
  });

  return el(
    'div',
    { class: 'table-wrap' },
    el(
      'table',
      { class: 'table table--stackable' },
      el(
        'thead',
        null,
        el(
          'tr',
          null,
          el('th', { scope: 'col' }, 'Customer'),
          el('th', { scope: 'col' }, 'Service'),
          el('th', { scope: 'col' }, 'Where'),
          el('th', { scope: 'col' }, 'Date / time'),
          el('th', { scope: 'col' }, 'Status'),
          el('th', { scope: 'col' }, 'Actions')
        )
      ),
      el('tbody', null, ...rows)
    )
  );
}

/* ================================================================== */
/* shared event delegation                                             */
/* ================================================================== */

/**
 * Wires accept / reject / status / cancel / review buttons inside a root.
 * One handler for every list and detail page.
 *
 * Binding is idempotent: `renderCustomerRequests` and friends call this again
 * after every reload, and a naive `addEventListener` per render would fire one
 * request per past render. A single listener is kept per root and only its
 * options are refreshed.
 */
const actionBindings = new WeakMap();

export function bindRequestActions(root, { reload, role = ROLES.CUSTOMER } = {}) {
  if (!root) return () => {};

  const existing = actionBindings.get(root);
  if (existing) {
    existing.options = { reload, role };
    return existing.dispose;
  }

  const binding = { options: { reload, role }, dispose: () => {} };

  const handler = async (event) => {
    const target = event.target.closest('[data-accept], [data-reject], [data-request][data-status], [data-cancel], [data-review]');
    if (!target || !root.contains(target)) return;

    event.preventDefault();

    // Guard against a double click firing the same transition twice.
    if (target.dataset.busy === 'true') return;
    target.dataset.busy = 'true';

    const { reload: currentReload, role: currentRole } = binding.options;

    try {
      if (target.dataset.accept) return await acceptRequest(target.dataset.accept, { reload: currentReload });
      if (target.dataset.reject) return await rejectRequest(target.dataset.reject, { reload: currentReload });
      if (target.dataset.request && target.dataset.status) {
        return await updateRequestStatus(target.dataset.request, target.dataset.status, { reload: currentReload });
      }
      if (target.dataset.cancel) return await cancelRequest(target.dataset.cancel, { reload: currentReload });

      if (target.dataset.review) {
        const { submitReviewForRequest } = await import('./providers.js');
        const created = await submitReviewForRequest(target.dataset.review, 'this provider');
        if (created) {
          target.remove();
          await currentReload?.();
        }
      }
      return undefined;
    } finally {
      delete target.dataset.busy;
    }
  };

  root.addEventListener('click', handler);
  binding.dispose = () => root.removeEventListener('click', handler);

  actionBindings.set(root, binding);
  return binding.dispose;
}

export { badge, REQUEST_STATUS, REQUEST_STATUS_LABELS };