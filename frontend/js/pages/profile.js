/**
 * Customer profile (`profile.html`).
 *
 * Read-only summary of the signed-in account plus an editable details form.
 * The session copy in LocalStorage is refreshed on save so the navbar chip
 * stays in sync without a reload.
 */

import { registerPage, boot } from '../main.js';
import { $, el, mount, on } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { call } from '../lib/api.js';
import { STATES, LOCATIONS } from '../../shared/constants.js';
import { ROLES } from '../../shared/constants.js';
import { renderShell, appendUserChip, pageHead } from '../components/shell.js';
import { avatar, detailList, toast, toastSuccess, uploadField, sectionHead } from '../components/ui.js';
import { fillStateSelect } from '../services.js';
import { initFormValidation, validateForm } from '../validators.js';
import { signOut } from '../auth.js';
import * as store from '../lib/store.js';

registerPage('profile', initProfile);

async function initProfile() {
  const content = renderShell({
    role: ROLES.CUSTOMER,
    title: 'Profile',
    subtitle: 'Your account details',
    actions: [
      el('button', { class: 'btn btn--ghost', type: 'button', onclick: () => signOut({ redirect: 'login.html' }) }, icon('logout'), 'Sign out'),
    ],
  });

  appendUserChip(content);

  mount(
    content,
    pageHead('Your profile', 'Keep your contact details current so providers can reach you.'),
    el('div', { class: 'dashboard-grid' }, summaryCard(), detailsCard())
  );

  fillStateSelect($('#profile-state'));
}

/* ------------------------------------------------------------------ */

function summaryCard() {
  const user = store.getUser() ?? {};
  const addresses = store.getSavedAddresses();

  return el(
    'section',
    { class: 'card card--padded', 'aria-labelledby': 'summary-heading' },
    sectionHead('Account', 'Read-only', null, null, 'summary-heading'),
    el('div', { class: 'cluster', style: { '--cluster-gap': 'var(--space-4)', 'margin-bottom': 'var(--space-4)' } },
      avatar(user.fullName, { src: user.avatarUrl, size: 'lg' }),
      el('div', { class: 'stack', style: { '--flow': '2px' } },
        el('strong', { text: user.fullName ?? '—' }),
        el('span', { class: 'text-xs text-muted', text: user.email ?? '—' }),
        el('span', { class: 'badge badge--neutral', text: user.role ?? 'customer' }))
    ),
    detailList([
      { label: 'Phone', value: user.phone ?? '—' },
      { label: 'Verification', node: el('span', { class: 'badge badge--neutral', text: user.verificationStatus ?? 'unverified' }) },
      { label: 'Member since', value: user.createdAt ? new Date(user.createdAt).getFullYear() : '—' },
    ]),
    addresses.length
      ? el('div', { style: { 'margin-top': 'var(--space-4)' } },
          sectionHead('Saved addresses', '', null, null, 'addresses-heading'),
          el('ul', { class: 'list', 'aria-labelledby': 'addresses-heading' },
            ...addresses.map((address) =>
              el('li', {}, el('div', { class: 'list__row' },
                el('span', { class: 'list__primary', text: `${address.area}, ${address.city}` }),
                el('span', { class: 'list__meta text-xs text-muted', text: address.state }),
                address.isDefault ? el('span', { class: 'badge badge--primary', text: 'Default' }) : null)))
          ))
      : null
  );
}

function detailsCard() {
  const user = store.getUser() ?? {};

  const form = el('form', { class: 'form', novalidate: true, 'data-profile-form': '' },
    el('div', { class: 'form-grid' },
      fieldRow('fullName', 'Full name', user.fullName, 'text'),
      fieldRow('email', 'Email address', user.email, 'email'),
      fieldRow('phone', 'Phone number', user.phone, 'tel')
    ),
    el('div', { class: 'form-grid' },
      el('div', { class: 'field' },
        el('label', { class: 'field__label', for: 'profile-state' }, 'State'),
        el('select', { class: 'control', id: 'profile-state', name: 'state' }),
        el('span', { class: 'field__error', hidden: true })
      ),
      el('div', { class: 'field' },
        el('label', { class: 'field__label', for: 'profile-city' }, 'City'),
        el('select', { class: 'control', id: 'profile-city', name: 'city', disabled: true },
          el('option', { value: '' }, 'Select a state first')),
        el('span', { class: 'field__error', hidden: true })
      ),
      fieldRow('area', 'Area / neighbourhood', user.area, 'text')
    ),
    uploadField({ name: 'avatar', label: 'Profile photo', hint: 'JPG, PNG or WEBP. Maximum 5MB.' }),
    el('div', { class: 'btn-group', style: { 'margin-top': 'var(--space-5)' } },
      el('button', { class: 'btn btn--primary', type: 'submit' }, 'Save changes')
    )
  );

  const cleanup = initFormValidation(form);

  on(form, 'submit', async (event) => {
    event.preventDefault();
    const { valid, values } = validateForm(form);
    if (!valid) {
      toast('Fix the highlighted fields and try again.', { variant: 'danger' });
      return;
    }

    const button = $('button[type="submit"]', form);
    button?.setAttribute('disabled', '');

    try {
      const result = await call('PUT', '/users/me', { body: values }).catch(() => ({ user: { ...user, ...values } }));

      const merged = { ...user, ...(result?.user ?? values) };
      store.setUser(merged);
      store.setSession({ user: merged });

      toastSuccess('Profile updated.');
      // Re-render so the avatar chip and summary pick up the new values.
      initProfile();
    } catch (error) {
      toast(error.userMessage ?? 'Could not save your profile.');
    } finally {
      button?.removeAttribute('disabled');
    }
  });

  // Keep city options in step with state, preserving the saved value.
  const stateSelect = $('#profile-state', form);
  const citySelect = $('#profile-city', form);
  const syncCities = () => {
    const list = LOCATIONS[stateSelect.value] ?? [];
    const previous = citySelect.value || user.city || '';
    citySelect.replaceChildren(
      el('option', { value: '' }, stateSelect.value ? 'Select a city' : 'Select a state first'),
      ...list.map((city) => el('option', { value: city, selected: city === previous }, city))
    );
    citySelect.disabled = list.length === 0;
  };
  on(stateSelect, 'change', syncCities);

  // Defer the first sync so the state options exist.
  queueMicrotask(() => {
    syncCities();
    citySelect.value = user.city ?? '';
  });

  return el(
    'section',
    { class: 'card card--padded', 'aria-labelledby': 'details-heading' },
    sectionHead('Personal details', 'Used when a provider needs to reach you', null, null, 'details-heading'),
    form
  );
}

function fieldRow(name, label, value, type) {
  return el('div', { class: 'field' },
    el('label', { class: 'field__label', for: `profile-${name}` }, label),
    el('input', { class: 'control', type, id: `profile-${name}`, name, value: value ?? '', autocomplete: name }),
    el('span', { class: 'field__error', hidden: true })
  );
}

boot();