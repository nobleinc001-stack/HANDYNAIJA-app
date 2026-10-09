/**
 * Provider services (`provider-services.html`).
 *
 * List the services a provider offers, add new ones, toggle availability and
 * remove services. Writes go through `POST/PATCH/DELETE /provider/services`.
 */

import { registerPage, boot } from '../main.js';
import { el, mount, formatCurrency } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { call } from '../lib/api.js';
import { ROLES, CATEGORY_GROUPS, SERVICE_NAMES } from '../../../shared/constants.js';
import { renderShell, appendUserChip, pageHead } from '../components/shell.js';
import {
  badge,
  emptyState,
  errorState,
  skeletonCard,
  sectionHead,
  modal,
  confirmDialog,
  toastSuccess,
  toastError,
} from '../components/ui.js';
import { initFormValidation, validateForm } from '../validators.js';
import { resolveMyProviderId } from '../providers.js';

registerPage('provider-services', initServices);

/** The slot currently on screen, so dialogs can refresh it after saving. */
let currentSlot = null;

let providerId = null;

async function initServices() {
  providerId = await resolveMyProviderId();

  const content = renderShell({
    role: ROLES.PROVIDER,
    title: 'My services',
    subtitle: 'What customers can request from you',
    actions: [
      el('button', { class: 'btn btn--primary', type: 'button', onclick: openCreateDialog }, icon('plus'), 'Add service'),
    ],
  });

  appendUserChip(content);

  const slot = el('div');
  currentSlot = slot;
  content.append(
    pageHead('Services you offer', 'Customers only see services you have activated.'),
    slot
  );

  await load(slot);
}

/* ------------------------------------------------------------------ */

async function load(slot) {
  mount(slot, el('div', { class: 'stack', style: { '--flow': 'var(--space-4)' } },
    ...Array.from({ length: 3 }, () => skeletonCard())));

  if (!providerId) {
    mount(slot, errorState({
      title: 'Provider not found',
      message: 'We could not match your account to a provider profile.',
    }));
    return;
  }

  try {
    const { services = [] } = await call('GET', `/providers/${encodeURIComponent(providerId)}/services`);

    if (!services.length) {
      mount(slot, emptyState({
        iconName: 'briefcase',
        title: 'No services listed yet',
        text: 'Add at least one service so customers can find and request you.',
        action: el('button', { class: 'btn btn--primary', type: 'button', onclick: openCreateDialog }, 'Add your first service'),
      }));
      return;
    }

    mount(slot, el('div', { class: 'stack', style: { '--flow': 'var(--space-3)' } },
      ...services.map((service) => serviceRow(service, slot))));
  } catch (error) {
    mount(slot, errorState({ message: error.userMessage, onRetry: () => load(slot) }));
  }
}

function serviceRow(service, slot) {
  const isActive = service.isActive !== false && service.status !== 'inactive';
  const meta = [
    SERVICE_NAMES[service.category] ?? service.category,
    service.price ? formatCurrency(service.price) : null,
  ].filter(Boolean);

  return el('div', { class: 'request-card' },
    el('div', { class: 'request-card__top' },
      el('div', { class: 'stack', style: { '--flow': '2px' } },
        el('h3', { class: 'request-card__title', text: service.name || SERVICE_NAMES[service.category] || service.category }),
        meta.length
          ? el('span', { class: 'text-xs text-muted', text: meta.join(' • ') })
          : null),
      badge(isActive ? 'Active' : 'Inactive', { variant: isActive ? 'completed' : 'neutral', dot: true })
    ),
    service.description ? el('p', { class: 'text-small text-muted', text: service.description }) : null,
    el('div', { class: 'btn-group', style: { 'margin-top': 'var(--space-3)' } },
      el('button', {
        class: 'btn btn--secondary btn--sm',
        type: 'button',
        onclick: async () => {
          try {
            await call('PATCH', `/provider/services/${encodeURIComponent(service.id)}`, {
              body: { isActive: !isActive },
            });
            toastSuccess(`"${service.name}" is now ${isActive ? 'hidden' : 'live'}.`);
            await load(slot);
          } catch (error) {
            toastError(error.userMessage ?? 'Could not update that service.');
          }
        },
      }, isActive ? 'Hide' : 'Activate'),
      el('button', { class: 'btn btn--ghost btn--sm', type: 'button', onclick: () => openEditDialog(service, slot) }, 'Edit'),
      el('button', {
        class: 'btn btn--danger-soft btn--sm',
        type: 'button',
        onclick: async () => {
          const confirmed = await confirmDialog({
            title: 'Remove service',
            message: `Remove "${service.name}" from your profile? Customers will no longer be able to request it.`,
            confirmLabel: 'Remove',
          });
          if (!confirmed) return;

          try {
            await call('DELETE', `/provider/services/${encodeURIComponent(service.id)}`);
            toastSuccess('Service removed.');
            await load(slot);
          } catch (error) {
            toastError(error.userMessage ?? 'Could not remove that service.');
          }
        },
      }, 'Remove')
    )
  );
}

/* ------------------------------------------------------------------ */
/* dialogs                                                             */
/* ------------------------------------------------------------------ */

function openCreateDialog() {
  openServiceDialog(null, currentSlot);
}

function openEditDialog(service, slot) {
  openServiceDialog(service, slot);
}

function openServiceDialog(service, slot) {
  const isEdit = Boolean(service);

  const form = el('form', { class: 'form', novalidate: true },
    el('div', { class: 'field' },
      el('label', { class: 'field__label', for: 'service-category' }, 'Category'),
      el('select', { class: 'control', id: 'service-category', name: 'category', required: true },
        el('option', { value: '' }, 'Choose a category'),
        ...CATEGORY_GROUPS.map((group) =>
          el('optgroup', { label: group.name },
            ...group.services.map((category) =>
              el('option', { value: category.id, selected: category.id === service?.category }, category.name))))),
      el('span', { class: 'field__error', hidden: true })
    ),
    el('div', { class: 'field' },
      el('label', { class: 'field__label', for: 'service-name' }, 'Service name'),
      el('input', { class: 'control', type: 'text', id: 'service-name', name: 'name', value: service?.name ?? '', required: true, maxlength: '80' }),
      el('span', { class: 'field__error', hidden: true })
    ),
    el('div', { class: 'field' },
      el('label', { class: 'field__label', for: 'service-description' }, 'Description'),
      el('textarea', { class: 'control', id: 'service-description', name: 'description', rows: '3', maxlength: '400' }, service?.description ?? ''),
      el('span', { class: 'field__hint' }, 'A short note about what is included.')
    ),
    el('div', { class: 'field' },
      el('label', { class: 'field__label', for: 'service-price' }, 'Starting price (₦)'),
      el('input', { class: 'control', type: 'number', id: 'service-price', name: 'price', min: '0', step: '500', value: service?.price ?? '' })
    )
  );

  initFormValidation(form);

  modal({
    title: isEdit ? 'Edit service' : 'Add a service',
    wide: false,
    confirmLabel: isEdit ? 'Save changes' : 'Add service',
    body: form,
    onConfirm: async () => {
      const { valid, values } = validateForm(form);
      if (!valid) return false;

      try {
        if (isEdit) {
          await call('PATCH', `/provider/services/${encodeURIComponent(service.id)}`, { body: values });
          toastSuccess('Service updated.');
        } else {
          await call('POST', '/provider/services', { body: { ...values, isActive: true } });
          toastSuccess('Service added.');
        }
        if (slot) await load(slot);
        return true;
      } catch (error) {
        toastError(error.userMessage ?? 'Could not save that service.');
        return false;
      }
    },
  });
}

boot();