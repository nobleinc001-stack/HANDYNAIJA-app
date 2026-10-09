/**
 * Admin — service categories (`admin-categories.html`).
 *
 * Grouped list of the shared `CATEGORY_GROUPS` plus the persisted categories.
 * Create and rename go through `POST /admin/categories` and
 * `PATCH /admin/categories/:id`.
 */

import { registerPage, boot } from '../main.js';
import { el, mount, slugify } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { call } from '../lib/api.js';
import { ROLES, CATEGORY_GROUPS } from '../../../shared/constants.js';
import { renderShell, appendUserChip, pageHead } from '../components/shell.js';
import {
  badge,
  alertBanner,
  errorState,
  modal,
  spinner,
  toastSuccess,
  toastError,
  sectionHead,
} from '../components/ui.js';
import { initFormValidation, validateForm } from '../validators.js';

registerPage('admin-categories', initCategories);

async function initCategories() {
  const content = renderShell({
    role: ROLES.ADMIN,
    title: 'Categories',
    subtitle: 'What services the marketplace offers',
    actions: [el('button', { class: 'btn btn--primary', type: 'button', onclick: openCreate }, icon('plus'), 'Add category')],
  });

  appendUserChip(content);

  const slot = el('div', { class: 'stack', style: { '--flow': 'var(--space-5)' } });
  content.append(pageHead('Service categories', 'Categories drive search, filters and provider profiles.'), slot);

  mount(slot, el('div', { class: 'card card--padded' }, spinner({ label: 'Loading categories' })));

  try {
    const { categories = [] } = await call('GET', '/categories');
    renderGroups(slot, categories);
  } catch (error) {
    mount(slot, errorState({ message: error.userMessage, onRetry: initCategories }));
  }
}

function renderGroups(slot, persisted) {
  // Merge the persisted list over the shared groups so admins see additions.
  // Seed from the persisted records (they carry isActive/providerCount), then
  // top up from the shared groups for anything the API has not returned —
  // appending both lists wholesale listed every category twice.
  const byGroup = new Map();

  const groupFor = (key, label) => {
    if (!byGroup.has(key)) byGroup.set(key, { id: key, name: label ?? key, services: [] });
    return byGroup.get(key);
  };

  const sharedById = new Map(CATEGORY_GROUPS.flatMap((group) => group.services).map((service) => [service.id, service]));
  const seen = new Set();

  for (const category of persisted) {
    const key = category.groupId ?? category.group ?? 'other';
    const label = category.groupName ?? CATEGORY_GROUPS.find((group) => group.id === key)?.name;
    groupFor(key, label).services.push({
      id: category.id,
      name: category.name,
      description: category.description,
      icon: category.icon,
      isActive: category.isActive !== false,
      providerCount: category.providerCount,
      persisted: true,
    });
    seen.add(category.id);
  }

  for (const group of CATEGORY_GROUPS) {
    for (const service of group.services) {
      if (seen.has(service.id)) continue;
      groupFor(group.id, group.name).services.push({
        id: service.id,
        name: service.name,
        isActive: true,
        persisted: false,
      });
      seen.add(service.id);
    }
  }

  mount(slot, ...[...byGroup.values()].map((group) =>
    el('section', { class: 'card card--padded' },
      sectionHead(group.name, `${group.services.length} services`, null, null, null),
      el('div', { class: 'stack', style: { '--flow': 'var(--space-2)' } },
        ...group.services.map((service) => categoryRow(service, slot, persisted)))
    )));
}

function categoryRow(service, slot, persisted) {
  return el('div', { class: 'list__row' },
    el('span', { class: 'list__primary', text: service.name }),
    el('code', { class: 'text-xs text-muted', text: service.id }),
    el('span', { class: 'spacer' }),
    badge(service.isActive === false ? 'Inactive' : 'Active', { variant: service.isActive === false ? 'neutral' : 'active', dot: true }),
    el('div', { class: 'cluster', style: { '--cluster-gap': 'var(--space-1)' } },
      el('button', { class: 'btn btn--ghost btn--sm', type: 'button', onclick: () => openEdit(service, slot, persisted) }, 'Rename'))
  );
}

/* ------------------------------------------------------------------ */

function openCreate() {
  openDialog(null);
}

function openEdit(service, slot, persisted) {
  openDialog(service, slot, persisted);
}

function openDialog(service, slot, persisted = []) {
  const isEdit = Boolean(service);

  const form = el('form', { class: 'form', novalidate: true },
    el('div', { class: 'field' },
      el('label', { class: 'field__label', for: 'category-name' }, 'Category name'),
      el('input', { class: 'control', type: 'text', id: 'category-name', name: 'name', value: service?.name ?? '', required: true, maxlength: '60' }),
      el('span', { class: 'field__error', hidden: true })
    ),
    el('div', { class: 'field' },
      el('label', { class: 'field__label', for: 'category-description' }, 'Description'),
      el('textarea', { class: 'control', id: 'category-description', name: 'description', rows: '2', maxlength: '200' }, service?.description ?? '')
    )
  );

  initFormValidation(form);

  // Categories that come from `shared/constants.js` are platform defaults with
  // no database row to update — POSTing a "rename" for one used to silently
  // create a duplicate instead.
  if (isEdit && !service.persisted) {
    form.querySelectorAll('input, textarea').forEach((control) => {
      control.readOnly = true;
    });
  }

  modal({
    title: isEdit ? 'Rename category' : 'Add category',
    confirmLabel: isEdit ? 'Save' : 'Add',
    body: isEdit && !service.persisted
      ? el(
          'div',
          { class: 'stack', style: { '--flow': 'var(--space-3)' } },
          alertBanner({
            variant: 'neutral',
            title: 'Platform default',
            message: `“${service.name}” is defined in the shared constants and cannot be renamed here. Add a new category instead if you need a different label.`,
          })
        )
      : form,
    onConfirm: async () => {
      if (isEdit && !service.persisted) return true;

      const { valid, values } = validateForm(form);
      if (!valid) return false;

      try {
        if (isEdit) {
          await call('PATCH', `/admin/categories/${encodeURIComponent(service.id)}`, { body: values });
          const match = persisted.find((item) => item.id === service.id);
          if (match) Object.assign(match, values);
        } else {
          const created = { ...values, id: slugify(values.name), group: 'other', isActive: true };
          await call('POST', '/admin/categories', { body: created });
          persisted.push(created);
        }
        toastSuccess(isEdit ? 'Category updated.' : 'Category added.');
        renderGroups(slot, persisted);
        return true;
      } catch (error) {
        toastError(error.userMessage ?? 'Could not save that category.');
        return false;
      }
    },
  });
}

boot();