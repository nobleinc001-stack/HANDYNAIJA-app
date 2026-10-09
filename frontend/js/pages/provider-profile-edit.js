/**
 * Business profile editor (`provider-profile.html`).
 *
 * Editable business details, verification state, and a link to the public
 * profile customers see. Saves with `PUT /provider/profile`.
 */

import { registerPage, boot } from '../main.js';
import { $, el, mount } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { call } from '../lib/api.js';
import { ROLES, STATES, LOCATIONS, SERVICE_NAMES } from '../../shared/constants.js';
import { renderShell, appendUserChip, pageHead } from '../components/shell.js';
import {
  avatar,
  badge,
  detailList,
  verifiedMark,
  uploadField,
  alertBanner,
  spinner,
  toastSuccess,
  toastError,
  sectionHead,
} from '../components/ui.js';
import { initFormValidation, validateForm } from '../validators.js';
import { relativeHref } from '../components/navbar.js';
import { resolveMyProviderId } from '../providers.js';

registerPage('provider-profile', initProfile);

async function initProfile() {
  const providerId = await resolveMyProviderId();

  const content = renderShell({
    role: ROLES.PROVIDER,
    title: 'Business profile',
    subtitle: 'What customers see when they find you',
  });

  appendUserChip(content);

  const slot = el('div');
  content.append(
    pageHead('Your public profile', 'A complete profile earns more requests.'),
    slot
  );

  mount(slot, spinner({ label: 'Loading your profile', large: true }));

  let provider = null;
  try {
    const result = await call('GET', `/providers/${encodeURIComponent(providerId)}`);
    provider = result?.provider ?? result;
  } catch (error) {
    mount(slot, alertBanner({ variant: 'danger', title: 'Could not load profile', message: error.userMessage }));
    return;
  }

  render(slot, provider, providerId);
}

/* ------------------------------------------------------------------ */

function render(slot, provider, providerId) {
  const isVerified = provider.verificationStatus === 'verified';

  const picture = pictureField(provider.avatarUrl ?? null, provider.businessName ?? provider.fullName ?? 'You');

  const form = el('form', { class: 'form', novalidate: true },
    el('div', { class: 'form-grid' },
      textField('businessName', 'Business name', provider.businessName ?? provider.fullName, true),
      textField('yearsExperience', 'Years of experience', provider.yearsExperience ?? '', false, 'number')
    ),
    picture.node,
    el('div', { class: 'field' },
      el('label', { class: 'field__label', for: 'business-bio' }, 'About your business'),
      el('textarea', { class: 'control', id: 'business-bio', name: 'bio', rows: '4', maxlength: '600' }, provider.bio ?? ''),
      el('span', { class: 'field__hint' }, 'Describe your experience, the areas you cover and what customers can expect.')
    ),
    el('div', { class: 'form-grid' },
      el('div', { class: 'field' },
        el('label', { class: 'field__label', for: 'business-state' }, 'State'),
        el('select', { class: 'control', id: 'business-state', name: 'state' },
          el('option', { value: '' }, 'Select a state'),
          ...STATES.map((state) => el('option', { value: state, selected: state === provider.state }, state))),
        el('span', { class: 'field__error', hidden: true })
      ),
      el('div', { class: 'field' },
        el('label', { class: 'field__label', for: 'business-city' }, 'City'),
        el('select', { class: 'control', id: 'business-city', name: 'city', disabled: true }),
        el('span', { class: 'field__error', hidden: true })
      )
    ),
    el('div', { class: 'field' },
      el('label', { class: 'field__label', for: 'business-area' }, 'Areas you cover'),
      el('input', { class: 'control', type: 'text', id: 'business-area', name: 'areasServed', value: (provider.areasServed ?? []).join(', ') }),
      el('span', { class: 'field__hint' }, 'Comma separated, for example: Lekki, Ikoyi, Victoria Island')
    ),
    el('div', { class: 'btn-group', style: { 'margin-top': 'var(--space-5)' } },
      el('button', { class: 'btn btn--primary', type: 'submit' }, 'Save profile'),
      el('a', { class: 'btn btn--ghost', href: relativeHref(`provider-public.html?id=${encodeURIComponent(providerId)}`) }, icon('externalLink'), 'View public profile')
    )
  );

  initFormValidation(form);

  // State -> city cascade.
  const stateSelect = $('#business-state', form);
  const citySelect = $('#business-city', form);
  const syncCities = () => {
    const list = LOCATIONS[stateSelect.value] ?? [];
    citySelect.replaceChildren(
      el('option', { value: '' }, stateSelect.value ? 'Select a city' : 'Select a state first'),
      ...list.map((city) => el('option', { value: city, selected: city === provider.city }, city))
    );
    citySelect.disabled = list.length === 0;
  };
  stateSelect.addEventListener('change', syncCities);
  syncCities();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const { valid, values } = validateForm(form);
    if (!valid) {
      toastError('Fix the highlighted fields and try again.');
      return;
    }

    const button = $('button[type="submit"]', form);
    button?.setAttribute('disabled', '');

    try {
      values.areasServed = String(values.areasServed ?? '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      values.yearsExperience = Number(values.yearsExperience || 0);

      // The picker converted the chosen image to a data URL; the raw file path
      // the browser reports is meaningless and must not be sent.
      delete values.coverImage;
      const avatarUrl = picture.getValue();
      if (avatarUrl) values.avatarUrl = avatarUrl;

      await call('PUT', '/provider/profile', { body: values });
      toastSuccess('Profile updated.');
      render(slot, { ...provider, ...values }, providerId);
    } catch (error) {
      toastError(error.userMessage ?? 'Could not save your profile.');
    } finally {
      button?.removeAttribute('disabled');
    }
  });

  mount(slot,
    el('div', { class: 'dashboard-grid' },
      el('section', { class: 'card card--padded' },
        sectionHead('Verification', 'How customers recognise you', null, null, 'verification-heading'),
        el('div', { class: 'cluster', style: { '--cluster-gap': 'var(--space-4)', 'margin-bottom': 'var(--space-4)' } },
          avatar(provider.businessName ?? provider.fullName, { src: provider.avatarUrl, size: 'lg' }),
          el('div', { class: 'stack', style: { '--flow': 'var(--space-1)' } },
            el('strong', { text: provider.businessName ?? provider.fullName ?? '—' }),
            el('div', { class: 'cluster', style: { '--cluster-gap': 'var(--space-2)' } },
              verifiedMark(provider.verificationStatus),
              badge(provider.verificationStatus ?? 'unverified', { variant: isVerified ? 'verified' : 'unverified' }))
          )
        ),
        detailList([
          { label: 'Categories', value: (provider.categories ?? []).map((id) => SERVICE_NAMES[id] ?? id).join(', ') || '—' },
          { label: 'Base location', value: [provider.area, provider.city, provider.state].filter(Boolean).join(', ') || '—' },
          { label: 'Response rate', value: provider.responseRate ? `${provider.responseRate}%` : '—' },
          { label: 'Rating', value: provider.rating ? `${provider.rating} / 5` : 'No reviews yet' },
        ]),
        isVerified
          ? alertBanner({ variant: 'success', title: 'You are verified', message: 'Your badge is shown on every customer-facing page.' })
          : alertBanner({
              variant: 'warning',
              title: 'Verification pending',
              message: 'Add your National Identification Number below, then upload your business registration and a utility bill from Profile documents.',
            }),
        el('div', { class: 'stack', style: { '--flow': 'var(--space-3)', 'margin-top': 'var(--space-4)' } },
          sectionHead('National Identification Number', provider.nin ? 'On file' : 'Required to verify your account', null, null, 'nin-heading'),
          ninField(provider, async (nin) => {
            try {
              await call('PUT', '/provider/profile', { body: { nin } });
              toastSuccess('NIN submitted for verification.');
              render(slot, { ...provider, nin }, providerId);
            } catch (error) {
              toastError(error.userMessage ?? 'Could not submit your NIN.');
            }
          })
        )
      ),
      el('section', { class: 'card card--padded card--full' },
        sectionHead('Edit details', 'Shown on your public profile', null, null, 'edit-heading'),
        form)
    )
  );
}

function textField(name, label, value, required, type = 'text') {
  return el('div', { class: 'field' },
    el('label', { class: 'field__label', for: `business-${name}` }, label),
    el('input', { class: 'control', type, id: `business-${name}`, name, value: value ?? '', required: required || null, min: type === 'number' ? '0' : null }),
    el('span', { class: 'field__error', hidden: true })
  );
}

/* ------------------------------------------------------------------ */
/* profile picture                                                     */
/* ------------------------------------------------------------------ */

const MAX_PICTURE_BYTES = 2 * 1024 * 1024;

/**
 * Profile picture picker with a live preview.
 *
 * There is no upload endpoint in the MVP, so the chosen image is read into a
 * data URL and stored on the provider as `avatarUrl`. That is what the public
 * profile renders, so a picture chosen here is genuinely the one customers
 * see. Object URLs are deliberately not used — they die with the document and
 * would leave a broken image behind on the next page.
 *
 * @param {string|null} currentUrl
 * @returns {{ node: HTMLElement, getValue: () => string|null }}
 */
function pictureField(currentUrl, name) {
  const previewSlot = el('div');
  const showPreview = (src) => {
    previewSlot.replaceChildren(avatar(name, { src, size: 'xl' }));
  };
  showPreview(currentUrl);

  const status = el('span', { class: 'field__hint', text: 'JPG, PNG or WEBP. Maximum 2MB.' });

  const picker = uploadField({
    name: 'coverImage',
    label: 'Profile picture',
    hint: 'This appears on your public profile and beside every service you offer.',
  });

  const input = picker.querySelector('input[type="file"]');
  // The file itself is never uploaded — it is converted to a data URL below —
  // so keep it out of the validated form payload.
  let pending = currentUrl ?? null;

  input?.addEventListener('change', () => {
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      status.textContent = 'That file is not an image. Choose a JPG, PNG or WEBP.';
      return;
    }
    if (file.size > MAX_PICTURE_BYTES) {
      status.textContent = 'That image is larger than 2MB. Choose a smaller one.';
      return;
    }

    const reader = new FileReader();
    reader.addEventListener('load', () => {
      pending = String(reader.result);
      showPreview(pending);
      status.textContent = 'Ready to save. It will show on your public profile.';
    });
    reader.addEventListener('error', () => {
      status.textContent = 'That image could not be read. Try a different file.';
    });
    reader.readAsDataURL(file);
  });

  const node = el('div', { class: 'stack', style: { '--flow': 'var(--space-4)' } },
    el('div', { class: 'cluster', style: { '--cluster-gap': 'var(--space-4)' } },
      previewSlot,
      el('div', { class: 'stack', style: { '--flow': 'var(--space-1)', 'min-width': '0' } },
        el('strong', { class: 'text-small', text: 'Profile picture' }),
        status)),
    picker
  );

  return { node, getValue: () => pending };
}

/* ------------------------------------------------------------------ */
/* NIN verification                                                    */
/* ------------------------------------------------------------------ */

/** Nigerian National Identification Number: exactly 11 digits. */
const NIN_PATTERN = /^\d{11}$/;

/** Shows a NIN without exposing it in full. */
function maskNin(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (digits.length < 4) return '••••';
  return `•••• •••• ${digits.slice(-4)}`;
}

/**
 * NIN capture for provider verification.
 *
 * The number is validated to 11 digits client-side and sent with the profile
 * payload. It is never echoed back in full, so the page stores and displays
 * only what is needed to show "received".
 *
 * @param {object} provider
 * @param {(nin: string) => void} onSubmit
 */
function ninField(provider, onSubmit) {
  const stored = provider.nin ?? '';
  const form = el('form', { class: 'form', novalidate: true });

  const input = el('input', {
    class: 'control',
    type: 'text',
    id: 'provider-nin',
    name: 'nin',
    inputmode: 'numeric',
    autocomplete: 'off',
    maxlength: '11',
    placeholder: '11 digits',
    value: stored,
    'aria-describedby': 'provider-nin-hint',
  });

  const error = el('span', { class: 'field__error', hidden: true });

  const field = el('div', { class: 'field' },
    el('label', { class: 'field__label', for: 'provider-nin' }, 'National Identification Number (NIN)'),
    input,
    el('span', { class: 'field__hint', id: 'provider-nin-hint' },
      'Required for verification. We only use it to confirm your identity and never display it in full.'),
    error
  );

  const submit = el('button', { class: 'btn btn--primary', type: 'submit' },
    stored ? 'Update NIN' : 'Submit for verification');

  form.append(field, el('div', { class: 'btn-group', style: { 'margin-top': 'var(--space-3)' } }, submit));

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = input.value.replace(/\D/g, '');

    if (!NIN_PATTERN.test(value)) {
      error.textContent = 'Enter your 11-digit NIN, for example 12345678901';
      error.hidden = false;
      input.setAttribute('aria-invalid', 'true');
      input.focus();
      return;
    }

    error.hidden = true;
    error.textContent = '';
    input.removeAttribute('aria-invalid');
    onSubmit(value);
  });

  input.addEventListener('input', () => {
    if (error.hidden) return;
    error.hidden = true;
    input.removeAttribute('aria-invalid');
  });

  if (stored) {
    form.prepend(alertBanner({
      variant: 'success',
      title: 'NIN received',
      message: `We are holding ${maskNin(stored)}. Submit a new number below if this has changed.`,
    }));
  }

  return form;
}

boot();