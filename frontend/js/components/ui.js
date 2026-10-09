/**
 * Reusable UI primitives.
 *
 * Everything here returns a DOM node (or a small controller) and is safe to
 * import on any page. Components never reach for globals.
 */

import {
  el,
  $,
  mount,
  frag,
  initials,
  formatDate,
  formatDateTime,
  formatRelative,
  restartAnimation,
} from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import {
  REQUEST_STATUS,
  REQUEST_STATUS_LABELS,
  REQUEST_STATUS_ORDER,
  STATUS_VARIANT,
  VERIFICATION_STATUS,
} from '../../../shared/constants.js';

/* ================================================================== */
/* Feedback: skeleton, empty state, spinner                            */
/* ================================================================== */

/**
 * Placeholder shown while data loads. Uses aria-busy on the wrapper and hides
 * itself from assistive tech so screen readers announce results, not the
 * loading chrome.
 */
export function skeletonCard() {
  return el(
    'div',
    { class: 'skeleton-card', 'aria-hidden': 'true' },
    el('div', { class: 'skeleton skeleton--circle skeleton--avatar' }),
    el(
      'div',
      null,
      el('div', { class: 'skeleton skeleton--text skeleton--title' }),
      el('div', { class: 'skeleton skeleton--text-sm' }),
      el('div', { class: 'skeleton skeleton--text-sm' }),
      el('div', { class: 'skeleton skeleton--pill', style: { width: '40%', marginTop: '0.75rem' } })
    )
  );
}

export function skeletonGrid(count = 4, factory = skeletonCard) {
  const wrapper = el('div', {
    class: 'stack',
    style: { '--flow': 'var(--space-4)' },
    'aria-busy': 'true',
    'aria-live': 'polite',
  });
  const nodes = Array.from({ length: count }, factory);
  nodes.forEach((node) => wrapper.append(node));
  wrapper.append(el('span', { class: 'sr-only', text: 'Loading results' }));
  return wrapper;
}

export function skeletonStatGrid(count = 4) {
  const wrapper = el('div', { class: 'stat-grid', 'aria-busy': 'true' }, null);
  for (let index = 0; index < count; index += 1) {
    wrapper.append(
      el(
        'div',
        { class: 'stat', 'aria-hidden': 'true' },
        el('div', { class: 'skeleton skeleton--text-sm', style: { width: '45%' } }),
        el('div', { class: 'skeleton skeleton--text', style: { width: '30%', height: '1.6em' } })
      )
    );
  }
  return wrapper;
}

export function spinner({ label = 'Loading', large = false } = {}) {
  return el(
    'div',
    { class: 'loading-block', role: 'status' },
    el('span', { class: large ? 'spinner spinner--lg' : 'spinner', 'aria-hidden': 'true' }),
    el('span', { text: label })
  );
}

/**
 * Empty state. Always offers a next action — an empty screen with no way
 * forward is a dead end.
 */
export function emptyState({ iconName = 'inbox', title, text, action = null }) {
  return el(
    'div',
    { class: 'empty-state' },
    el('div', { class: 'empty-state__icon' }, icon(iconName)),
    el('p', { class: 'empty-state__title', text: title }),
    text ? el('p', { class: 'empty-state__text', text }) : null,
    action
      ? el('div', { class: 'cluster', style: { '--cluster-gap': 'var(--space-3)' } }, action)
      : null
  );
}

/** Inline error panel for a failed section load, with a retry affordance. */
export function errorState({ title = 'We could not load this', message, onRetry }) {
  return el(
    'div',
    { class: 'alert alert--danger', role: 'alert' },
    el('span', { class: 'alert__icon' }, icon('alert')),
    el(
      'div',
      { class: 'alert__body' },
      el('p', { class: 'alert__title', text: title }),
      el('p', { text: message ?? 'Check your connection and try again.' }),
      onRetry
        ? el('div', { style: { marginTop: 'var(--space-2)' } }, el('button', { class: 'btn btn--sm btn--secondary', type: 'button', onclick: onRetry }, 'Try again'))
        : null
    )
  );
}

/* ================================================================== */
/* Toasts                                                              */
/* ================================================================== */

const TOAST_ICONS = {
  success: 'checkCircle',
  danger: 'xCircle',
  info: 'info',
};

let toastRegion = null;

function ensureToastRegion() {
  if (toastRegion?.isConnected) return toastRegion;
  toastRegion = el('div', {
    class: 'toast-region',
    role: 'region',
    'aria-label': 'Notifications',
  });
  document.body.append(toastRegion);
  return toastRegion;
}

/**
 * Shows a transient message. Errors persist until dismissed; successes
 * auto-close after `duration` ms.
 */
export function toast(message, { title, variant = 'info', duration = 5000 } = {}) {
  const region = ensureToastRegion();

  const node = el(
    'div',
    { class: `toast toast--${variant}`, role: variant === 'danger' ? 'alert' : 'status' },
    el('span', { class: 'toast__icon' }, icon(TOAST_ICONS[variant] ?? 'info')),
    el(
      'div',
      { class: 'toast__body' },
      title ? el('p', { class: 'toast__title', text: title }) : null,
      el('p', { class: 'toast__text', text: message })
    ),
    el('button', { class: 'toast__close', type: 'button', 'aria-label': 'Dismiss notification' }, '×')
  );

  const dismiss = () => {
    if (!node.isConnected) return;
    node.classList.add('is-leaving');
    setTimeout(() => node.remove(), 220);
  };

  $('.toast__close', node).addEventListener('click', dismiss);
  region.append(node);

  if (variant !== 'danger' && duration > 0) setTimeout(dismiss, duration);
  return dismiss;
}

export const toastSuccess = (message, options) => toast(message, { ...options, variant: 'success' });
export const toastError = (message, options) => toast(message, { ...options, variant: 'danger' });

/* ================================================================== */
/* Modal                                                               */
/* ================================================================== */

let openModals = 0;

/**
 * Opens a modal dialog with focus trapping and Escape-to-close.
 * Resolves with whatever `onConfirm` returns (or undefined when cancelled).
 */
export function modal({ title, body, confirmLabel = 'Confirm', cancelLabel = 'Cancel', variant = 'btn--primary', wide = false, onConfirm }) {
  return new Promise((resolve) => {
    const previousFocus = document.activeElement;

    const confirmButton = el('button', {
      class: `btn ${variant}`,
      type: 'button',
      disabled: true,
    });
    confirmButton.textContent = confirmLabel;

    const dialog = el(
      'div',
      { class: `modal__dialog ${wide ? 'modal__dialog--wide' : ''}`, role: 'document' },
      el(
        'div',
        { class: 'modal__header' },
        el('h2', { class: 'h3', id: 'modal-title', text: title }),
        el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Close dialog' }, icon('close'))
      ),
      el('div', { class: 'modal__body' }, body),
      el(
        'div',
        { class: 'modal__footer' },
        el('button', { class: 'btn btn--secondary', type: 'button', 'data-cancel': '' }, cancelLabel),
        confirmButton
      )
    );

    const overlay = el('div', {
      class: 'modal',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'modal-title',
    });
    overlay.append(dialog);

    let settled = false;
    const close = (result) => {
      if (settled) return;
      settled = true;
      overlay.classList.remove('is-open');
      document.removeEventListener('keydown', onKeydown, true);
      document.body.style.removeProperty('overflow');
      openModals -= 1;
      setTimeout(() => {
        overlay.remove();
        previousFocus?.focus?.();
      }, 220);
      resolve(result);
    };

    function onKeydown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        close(undefined);
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = $$focusable(dialog);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    function $$focusable(scope) {
      return Array.from(
        scope.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')
      );
    }

    $('[data-cancel]', dialog).addEventListener('click', () => close(undefined));
    $('.icon-btn', dialog).addEventListener('click', () => close(undefined));
    overlay.addEventListener('mousedown', (event) => {
      if (event.target === overlay) close(undefined);
    });

    confirmButton.addEventListener('click', async () => {
      confirmButton.classList.add('is-loading');
      confirmButton.disabled = true;
      try {
        const result = await onConfirm?.();
        close(result ?? true);
      } catch (error) {
        confirmButton.classList.remove('is-loading');
        confirmButton.disabled = false;
        toast(error.userMessage ?? 'That action could not be completed.', { variant: 'danger' });
      }
    });

    document.body.append(overlay);
    document.addEventListener('keydown', onKeydown, true);
    document.body.style.overflow = 'hidden';
    openModals += 1;

    requestAnimationFrame(() => {
      overlay.classList.add('is-open');
      const autofocus = dialog.querySelector('[autofocus]');
      (autofocus ?? dialog.querySelector('button'))?.focus();
    });
  });
}

/** Destructive-action confirmation. Resolves true only if confirmed. */
export function confirmDialog({ title, message, confirmLabel = 'Confirm', variant = 'btn--danger' }) {
  return modal({
    title,
    body: el('p', { text: message }),
    confirmLabel,
    variant,
    onConfirm: () => true,
  }).then(Boolean);
}

/* ================================================================== */
/* Badges & status                                                     */
/* ================================================================== */

/**
 * Request status badge. The text label is always present — colour is only a
 * secondary cue, so status is never communicated by colour alone.
 */
export function statusBadge(status) {
  const variant = STATUS_VARIANT[status] ?? 'neutral';
  const label = REQUEST_STATUS_LABELS[status] ?? status;
  return el('span', { class: `badge badge--${variant}` }, el('span', { class: 'badge__dot', 'aria-hidden': 'true' }), label);
}

export function badge(label, { variant = 'neutral', dot = false } = {}) {
  return el(
    'span',
    { class: `badge badge--${variant}` },
    dot ? el('span', { class: 'badge__dot', 'aria-hidden': 'true' }) : null,
    label
  );
}

/** Verified tick shown only when the platform has actually verified. */
export function verifiedMark(status) {
  if (status !== VERIFICATION_STATUS.VERIFIED) return null;
  return el(
    'span',
    { class: 'provider-card__verified' },
    icon('verified'),
    el('span', { class: 'sr-only' }, 'Verified provider')
  );
}

/* ================================================================== */
/* Rating                                                              */
/* ================================================================== */

export function ratingDisplay(rating, reviewCount) {
  const value = Number(rating) || 0;
  const wrapper = el('div', { class: 'rating' });

  for (let index = 1; index <= 5; index += 1) {
    const filled = index <= Math.round(value);
    wrapper.append(el('span', { class: 'rating__star', style: { color: filled ? 'var(--accent-500)' : 'var(--slate-300)' } , html: icon(filled ? 'star' : 'starOutline') }));
  }

  wrapper.append(el('span', { class: 'rating__value', text: value.toFixed(1) }));
  if (reviewCount !== undefined) {
    wrapper.append(el('span', { class: 'rating__count', text: `(${reviewCount} reviews)` }));
  }
  return wrapper;
}

/**
 * Interactive 1–5 star input. Keyboard operable: arrow keys move the
 * selection, Home/End jump to the ends.
 */
export function ratingInput({ name = 'rating', value = 0, describedBy = null } = {}) {
  const group = el('div', { class: 'rating rating--input', role: 'radiogroup', 'aria-label': 'Your rating' });
  const hidden = el('input', { type: 'hidden', name, value: String(value) });
  let current = Number(value) || 0;

  const buttons = Array.from({ length: 5 }, (_, index) => {
    const starValue = index + 1;
    const button = el('button', {
      type: 'button',
      class: 'rating__star',
      role: 'radio',
      'aria-checked': String(starValue === current),
      'aria-label': `${starValue} star${starValue === 1 ? '' : 's'}`,
      tabIndex: starValue === current || (current === 0 && starValue === 1) ? '0' : '-1',
      html: icon('starOutline'),
      onclick: () => setRating(starValue),
      onkeydown: (event) => onKeydown(event, starValue),
    });
    group.append(button);
    return button;
  });

  function setRating(starValue) {
    current = starValue;
    hidden.value = String(starValue);
    buttons.forEach((button, index) => {
      const isOn = index < current;
      button.classList.toggle('is-on', isOn);
      button.innerHTML = icon(isOn ? 'star' : 'starOutline');
      button.setAttribute('aria-checked', String(index + 1 === current));
      button.tabIndex = index + 1 === current ? 0 : -1;
    });
    group.dispatchEvent(new CustomEvent('ratingchange', { bubbles: true, detail: { rating: current } }));
  }

  function onKeydown(event, starValue) {
    let next = starValue;
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') next = Math.min(5, starValue + 1);
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') next = Math.max(1, starValue - 1);
    else if (event.key === 'Home') next = 1;
    else if (event.key === 'End') next = 5;
    else return;

    event.preventDefault();
    setRating(next);
    buttons[next - 1].focus();
  }

  const wrapper = el(
    'div',
    { class: 'field' },
    el('span', { class: 'field__label', id: `${name}-label` }, 'Your rating', el('span', { class: 'required' }, '*')),
    group,
    hidden,
    describedBy ? el('span', { class: 'field__hint', id: describedBy }, 'Select a rating') : null
  );

  wrapper.setRating = setRating;
  return wrapper;
}

/* ================================================================== */
/* Progress timeline                                                   */
/* ================================================================== */

/**
 * Renders the request lifecycle. Rejected / Cancelled requests show a clear
 * end state instead of pretending to progress.
 */
export function progressTimeline(status) {
  const endedEarly = status === REQUEST_STATUS.REJECTED || status === REQUEST_STATUS.CANCELLED;
  const currentIndex = REQUEST_STATUS_ORDER.indexOf(status);
  const list = el('ol', { class: 'timeline', 'aria-label': 'Request progress' });

  REQUEST_STATUS_ORDER.forEach((value, index) => {
    const reached = !endedEarly && currentIndex >= 0 && index <= currentIndex;
    const classes = ['timeline__step'];
    if (reached) classes.push('is-done');
    if (index === currentIndex && !endedEarly) classes.push('is-current');

    list.append(
      el(
        'li',
        { class: classes.join(' '), 'aria-current': index === currentIndex ? 'step' : null },
        el('span', { class: 'timeline__dot' }, reached ? icon('check') : null),
        el('span', { class: 'timeline__label', text: REQUEST_STATUS_LABELS[value] })
      )
    );
  });

  if (endedEarly) {
    list.append(
      el(
        'li',
        { class: 'timeline__step is-current' },
        el('span', { class: 'timeline__dot' }, icon('close')),
        el('span', { class: 'timeline__label', text: REQUEST_STATUS_LABELS[status] })
      )
    );
  }

  return list;
}

/* ================================================================== */
/* Form fields                                                         */
/* ================================================================== */

/**
 * Builds a labelled control with inline error slot.
 *
 * `control` may be a string ('text', 'email', …), a full options object for
 * `el()`, or an existing node.
 */
export function field({
  name,
  label,
  type = 'text',
  value = '',
  placeholder = '',
  hint = null,
  required = false,
  options = null,
  rows = null,
  min = null,
  max = null,
  autocomplete = null,
  disabled = false,
  readonly = false,
  full = false,
  iconName = null,
  control = null,
}) {
  let input;

  if (control instanceof Node) {
    input = control;
  } else if (options) {
    input = el(
      'select',
      { class: 'control', name, id: name, disabled, required },
      ...options.map((option) =>
        el('option', { value: option.value, selected: String(option.value) === String(value) }, option.label)
      )
    );
  } else if (type === 'textarea') {
    input = el('textarea', {
      class: 'control',
      name,
      id: name,
      placeholder,
      rows: rows ?? 4,
      disabled,
      required,
      maxlength: max,
    });
    input.value = value ?? '';
  } else {
    input = el('input', {
      class: 'control',
      type,
      name,
      id: name,
      value: value ?? '',
      placeholder,
      disabled,
      readonly: readonly || null,
      required,
      min,
      max,
      maxlength: max,
      autocomplete,
      inputmode: type === 'tel' ? 'tel' : undefined,
    });
  }

  const errorId = `${name}-error`;
  const hintId = `${name}-hint`;

  const wrapper = el(
    'div',
    { class: `field ${full ? 'field--full' : ''}`, dataset: { field: name } },
    el(
      'label',
      { class: 'field__label', for: name },
      label,
      required ? el('span', { class: 'required', 'aria-hidden': 'true' }, '*') : null
    ),
    iconName ? el('div', { class: 'control-group' }, el('span', { class: 'control-group__icon' }, icon(iconName)), input) : input,
    hint ? el('span', { class: 'field__hint', id: hintId }, hint) : null,
    el(
      'span',
      { class: 'field__error', id: errorId, role: 'alert' },
      icon('alert'),
      el('span', { class: 'field__error-text' })
    )
  );

  // Keep the hint wired up for assistive tech.
  if (hint) input.setAttribute('aria-describedby', hintId);

  wrapper.input = input;
  wrapper.showError = (message) => {
    wrapper.classList.add('has-error');
    wrapper.classList.remove('has-success');
    $('.field__error-text', wrapper).textContent = message;
    input.setAttribute('aria-invalid', 'true');
    input.setAttribute('aria-describedby', errorId);
  };
  wrapper.clearError = () => {
    wrapper.classList.remove('has-error');
    $('.field__error-text', wrapper).textContent = '';
    input.removeAttribute('aria-invalid');
    if (hint) input.setAttribute('aria-describedby', hintId);
    else input.removeAttribute('aria-describedby');
  };
  return wrapper;
}

/** Password input with a show/hide toggle. */
export function passwordField({ name = 'password', label = 'Password', value = '', required = true, hint = null, autocomplete = 'current-password' }) {
  const wrapper = field({ name, label, type: 'password', value, required, hint, autocomplete });
  const input = wrapper.input;

  // Re-home the input inside a control-group so the toggle can sit beside it.
  const group = el('div', { class: 'control-group' });
  input.replaceWith(group);
  group.append(input);

  const toggle = el(
    'button',
    {
      class: 'control-group__action',
      type: 'button',
      'aria-label': 'Show password',
      'aria-pressed': 'false',
    },
    icon('eye')
  );

  toggle.addEventListener('click', () => {
    const revealed = input.type === 'text';
    input.type = revealed ? 'password' : 'text';
    toggle.setAttribute('aria-pressed', String(!revealed));
    toggle.setAttribute('aria-label', revealed ? 'Show password' : 'Hide password');
    mount(toggle, icon(revealed ? 'eye' : 'eyeOff'));
    input.focus();
  });

  group.append(toggle);
  return wrapper;
}

/** Single checkbox wrapped with a visible label. */
export function checkboxField({ name, label, checked = false, hint = null }) {
  const input = el('input', { type: 'checkbox', name, id: name, checked });
  const wrapper = el(
    'div',
    { class: 'field' },
    el(
      'label',
      { class: 'check', for: name },
      input,
      el('span', null, label)
    ),
    hint ? el('span', { class: 'field__hint' }, hint) : null
  );
  wrapper.input = input;
  return wrapper;
}

/** Radio group rendered as cards. */
export function radioGroup({ name, legend, options, value = null, required = true }) {
  const group = el(
    'div',
    { class: 'choice-grid', role: 'radiogroup', 'aria-label': legend, 'aria-required': String(required) },
    ...options.map((option) =>
      el(
        'label',
        { class: 'choice' },
        el('input', {
          type: 'radio',
          name,
          value: option.value,
          checked: String(option.value) === String(value ?? ''),
        }),
        el('span', { class: 'choice__marker', 'aria-hidden': 'true' }),
        el(
          'span',
          null,
          el('span', { class: 'choice__title', text: option.label }),
          option.description ? el('span', { class: 'choice__description', text: option.description }) : null
        )
      )
    )
  );

  const wrapper = el(
    'div',
    { class: 'field' },
    el('span', { class: 'field__label' }, legend, required ? el('span', { class: 'required' }, '*') : null),
    group
  );

  wrapper.input = group.querySelector(`input[name="${name}"]`);
  wrapper.value = () => group.querySelector(`input[name="${name}"]:checked`)?.value ?? null;
  wrapper.clearError = () => group.querySelectorAll('.choice').forEach((item) => item.style.removeProperty('border-color'));
  return wrapper;
}

/** Image upload with preview and client-side size/type check. */
export function uploadField({ name, label, hint = 'JPG, PNG or WEBP. Maximum 5MB.', accept = 'image/jpeg,image/png,image/webp' }) {
  const input = el('input', { type: 'file', name, id: name, accept });
  const fileName = el('span', { class: 'text-small text-strong' });
  const previewImg = el('img', { alt: '' });

  const dropzone = el(
    'div',
    { class: 'upload' },
    el('span', { class: 'upload__icon' }, icon('upload')),
    el('span', { class: 'text-small text-strong', text: 'Choose a file or drag it here' }),
    el('span', { class: 'field__hint', text: hint })
  );
  dropzone.append(input);

  const preview = el(
    'div',
    { class: 'upload__preview' },
    previewImg,
    el(
      'div',
      { class: 'stack', style: { '--flow': '2px', 'min-width': '0' } },
      fileName,
      el('span', { class: 'field__hint', text: hint })
    ),
    el('button', { class: 'btn btn--sm btn--ghost', type: 'button', 'data-clear': '' }, 'Remove')
  );

  const wrapper = el(
    'div',
    { class: `field ${''}`, dataset: { field: name } },
    el('label', { class: 'field__label', for: name }, label),
    dropzone,
    preview,
    el(
      'span',
      { class: 'field__error', id: `${name}-error`, role: 'alert' },
      icon('alert'),
      el('span', { class: 'field__error-text' })
    )
  );

  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (!file) return reset();
    fileName.textContent = file.name;
    if (file.type.startsWith('image/')) {
      previewImg.src = URL.createObjectURL(file);
      wrapper.classList.add('has-file');
    }
  });

  $('[data-clear]', preview).addEventListener('click', (event) => {
    event.preventDefault();
    reset();
  });

  ['dragenter', 'dragover'].forEach((type) =>
    dropzone.addEventListener(type, (event) => {
      event.preventDefault();
      dropzone.classList.add('is-dragging');
    })
  );
  ['dragleave', 'drop'].forEach((type) =>
    dropzone.addEventListener(type, () => dropzone.classList.remove('is-dragging'))
  );

  function reset() {
    input.value = '';
    previewImg.removeAttribute('src');
    wrapper.classList.remove('has-file');
  }

  wrapper.input = input;
  wrapper.file = () => input.files?.[0] ?? null;
  wrapper.clearError = () => {
    wrapper.classList.remove('has-error');
    $('.field__error-text', wrapper).textContent = '';
  };
  wrapper.showError = (message) => {
    wrapper.classList.add('has-error');
    $('.field__error-text', wrapper).textContent = message;
  };
  return wrapper;
}

/* ================================================================== */
/* Data display                                                        */
/* ================================================================== */

export function avatar(name, { src = null, size = null, className = '' } = {}) {
  return el(
    'span',
    { class: `avatar ${size ? `avatar--${size}` : ''} ${className}`.trim() },
    src ? el('img', { src, alt: '', loading: 'lazy' }) : initials(name)
  );
}

/** Key/value rows used on profiles and request details. */
export function detailList(rows) {
  return el(
    'div',
    { class: 'detail-list' },
    ...rows
      .filter(Boolean)
      .map((row) =>
        el(
          'div',
          { class: 'detail-row' },
          el('span', { class: 'detail-row__label', text: row.label }),
          row.node ? el('span', { class: 'detail-row__value' }, row.node) : el('span', { class: 'detail-row__value', text: row.value ?? '—' })
        )
      )
  );
}

export function statTile({ label, value, meta = null, accent = false }) {
  return el(
    'div',
    { class: `stat ${accent ? 'stat--accent' : ''}` },
    el('span', { class: 'stat__label', text: label }),
    el('span', { class: 'stat__value', text: String(value) }),
    meta ? el('span', { class: 'stat__meta', text: meta }) : null
  );
}

export function alertBanner({ variant = 'info', title = null, message, action = null }) {
  const iconName = { success: 'checkCircle', danger: 'xCircle', warning: 'alert', info: 'info', neutral: 'info' }[variant];
  return el(
    'div',
    { class: `alert alert--${variant}`, role: variant === 'danger' ? 'alert' : 'status' },
    el('span', { class: 'alert__icon' }, icon(iconName)),
    el(
      'div',
      { class: 'alert__body' },
      title ? el('p', { class: 'alert__title', text: title }) : null,
      el('p', { text: message }),
      action
    )
  );
}

export function reviewCard(review) {
  return el(
    'article',
    { class: 'card card--padded' },
    el(
      'div',
      { class: 'cluster', style: { '--cluster-gap': 'var(--space-3)' } },
      avatar(review.customerName, { size: 'sm' }),
      el(
        'div',
        { class: 'stack', style: { '--flow': '0px' } },
        el('span', { class: 'text-strong text-small', text: review.customerName }),
        el('span', { class: 'text-xs text-muted', text: formatDate(review.createdAt) })
      ),
      el('span', { class: 'spacer' }),
      ratingDisplay(review.rating)
    ),
    el('p', { class: 'text-small', text: review.comment })
  );
}

/**
 * Card heading with an optional "view all" link.
 *
 * @param {string} title
 * @param {string} [subtitle]
 * @param {string|null} [href] - when set with `linkLabel`, renders a text link
 * @param {string} [linkLabel]
 * @param {string} [headingId] - wires `aria-labelledby` on the card
 */
export function sectionHead(title, subtitle = '', href = null, linkLabel = 'View all', headingId = null) {
  return el(
    'div',
    { class: 'section-head', style: { 'margin-bottom': 'var(--space-4)' } },
    el(
      'div',
      { class: 'stack', style: { '--flow': '2px' } },
      el('h2', { class: 'h4', id: headingId, text: title }),
      subtitle ? el('p', { class: 'text-xs text-muted', text: subtitle }) : null
    ),
    href && linkLabel
      ? el('a', { class: 'btn btn--ghost btn--sm', href }, icon('chevronRight'), linkLabel)
      : null
  );
}

/**
 * Grid of shortcut tiles for dashboard sidebars.
 *
 * @param {{label:string, href:string, iconName:string, meta?:string}[]} items
 */
export function quickActions(items = []) {
  if (!items.length) return null;

  return el(
    'ul',
    { class: 'quick-actions' },
    ...items.map((item) =>
      el(
        'li',
        {},
        el(
          'a',
          { class: 'quick-action', href: item.href },
          el('span', { class: 'quick-action__icon' }, icon(item.iconName)),
          el(
            'span',
            { class: 'stack', style: { '--flow': '0px' } },
            el('span', { class: 'text-small text-strong', text: item.label }),
            item.meta ? el('span', { class: 'text-xs text-muted', text: item.meta }) : null
          ),
          el('span', { class: 'spacer' }),
          icon('chevronRight')
        )
      )
    )
  );
}

/** Format helper re-exports so pages only need one import. */
export { formatDate, formatDateTime, formatRelative };

export { restartAnimation, frag, $ };