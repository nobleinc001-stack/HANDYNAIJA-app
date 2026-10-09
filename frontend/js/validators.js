/**
 * Form wiring.
 *
 * Connects the shared validation rules in `shared/validation.js` to DOM
 * fields built by `components/ui.js`. Handles inline errors, submission
 * lifecycle, focus management and draft preservation.
 */

import { $, $$, el } from './lib/dom.js';
import { validatePayload, validateRequired } from '../shared/validation.js';
import { toastError } from './components/ui.js';

/**
 * Wires a form.
 *
 * @param {HTMLFormElement} form
 * @param {object} options
 * @param {object} options.rules - field name -> (values, fieldName) => result
 * @param {(values:object)=>Promise<void>} options.onSubmit - throws to signal failure
 * @param {()=>object} [options.getExtraValues] - fields that are not plain inputs
 * @param {boolean} [options.validateOnBlur=true]
 */
export function initForm(form, { rules = {}, onSubmit, getExtraValues = null, validateOnBlur = true } = {}) {
  const submitButton = form.querySelector('[type="submit"]');
  const submitLabel = submitButton?.textContent ?? '';
  const formError = form.querySelector('[data-form-error]');

  const fieldWrapper = (name) => form.querySelector(`[data-field="${name}"]`);
  const inputFor = (name) => fieldWrapper(name)?.querySelector('input, select, textarea');

  const clearAllErrors = () => {
    $$('[data-field]', form).forEach((wrapper) => {
      wrapper.classList.remove('has-error', 'has-success');
      const input = wrapper.querySelector('input, select, textarea');
      input?.removeAttribute('aria-invalid');
    });
    if (formError) formError.textContent = '';
  };

  const showErrors = (errors, summaryTarget) => {
    clearAllErrors();

    let firstInvalid = null;
    for (const [name, message] of Object.entries(errors)) {
      const wrapper = fieldWrapper(name);
      if (wrapper?.showError) wrapper.showError(message);
      else if (wrapper) {
        wrapper.classList.add('has-error');
        const slot = wrapper.querySelector('.field__error-text');
        if (slot) slot.textContent = message;
      }

      const input = inputFor(name);
      if (input) {
        input.setAttribute('aria-invalid', 'true');
        if (!firstInvalid) firstInvalid = input;
      }
    }

    // Announce the summary for screen reader users, then move focus.
    if (formError) {
      formError.textContent = `Please correct ${Object.keys(errors).length} field${
        Object.keys(errors).length === 1 ? '' : 's'
      } below.`;
    }
    if (summaryTarget) summaryTarget.textContent = formError?.textContent ?? '';

    firstInvalid?.focus();
    firstInvalid?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  };

  const readValues = () => {
    const values = {};
    const data = new FormData(form);

    for (const [key, value] of data.entries()) {
      if (key.endsWith('[]')) {
        const field = key.slice(0, -2);
        values[field] = values[field] ?? [];
        values[field].push(value);
      } else {
        values[key] = value;
      }
    }

    return { ...values, ...(getExtraValues?.() ?? {}) };
  };

  const runValidation = () => {
    const values = readValues();
    const { valid, errors, values: validated } = validatePayload(values, rules);
    return { valid, errors, values: { ...values, ...validated } };
  };

  // Clear a field's error as soon as the user starts fixing it.
  $$('[data-field]', form).forEach((wrapper) => {
    const input = wrapper.querySelector('input, select, textarea');
    if (!input) return;

    const clear = () => {
      if (!wrapper.classList.contains('has-error')) return;
      wrapper.clearError?.() ?? wrapper.classList.remove('has-error');
      input.removeAttribute('aria-invalid');
    };

    input.addEventListener('input', clear);

    if (validateOnBlur) {
      input.addEventListener('blur', () => {
        const rule = rules[input.name];
        if (!rule) return;
        const result = rule(readValues(), input.name);
        if (result.valid) {
          wrapper.classList.add('has-success');
          wrapper.clearError?.();
        }
      });
    }
  });

  form.setLoading = (loading, label = null) => {
    if (!submitButton) return;
    submitButton.classList.toggle('is-loading', loading);
    submitButton.disabled = loading;
    submitButton.setAttribute('aria-busy', String(loading));
    if (label) submitButton.textContent = label;
    else submitButton.textContent = submitLabel;
  };

  form.setFormError = (message) => {
    if (formError) formError.textContent = message ?? '';
  };

  form.validate = runValidation;
  form.clearErrors = clearAllErrors;
  form.showErrors = showErrors;

  if (onSubmit) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      clearAllErrors();

      const { valid, errors, values } = runValidation();

      if (!valid) {
        showErrors(errors, form.querySelector('[data-error-summary]'));
        return;
      }

      form.setLoading(true);
      try {
        await onSubmit(values, form);
      } catch (error) {
        const message = error.userMessage ?? 'Something went wrong. Please try again.';
        toastError(message, { title: 'Could not continue' });
        form.setFormError(message);

        // Map server-side field errors onto the matching inputs.
        if (error.isValidationError && error.details && typeof error.details === 'object') {
          showErrors(error.details, form.querySelector('[data-error-summary]'));
        }
      } finally {
        form.setLoading(false);
      }
    });
  }

  return form;
}

/** Reads a required checkbox group (e.g. availability days) into an array. */
export function checkedValues(form, name) {
  return $$(`input[name="${name}"]:checked`, form).map((input) => input.value);
}

/** Populates `<select>` state -> city cascades from `shared/constants.js`. */
export function bindLocationCascade({ stateSelect, citySelect, areaInput = null, cities = {}, onChange = null }) {
  // A missing control should degrade to "no cascade", not take the page down.
  if (!stateSelect || !citySelect) return () => {};

  const syncCities = () => {
    const list = cities[stateSelect.value] ?? [];
    const previous = citySelect.value;

    citySelect.replaceChildren(
      el('option', { value: '' }, 'Select a city'),
      ...list.map((city) => el('option', { value: city, selected: city === previous }, city))
    );

    citySelect.disabled = list.length === 0;
    onChange?.({ state: stateSelect.value, city: citySelect.value, area: areaInput?.value ?? '' });
  };

  stateSelect.addEventListener('change', syncCities);
  syncCities();

  areaInput?.addEventListener('input', () => {
    onChange?.({ state: stateSelect.value, city: citySelect.value, area: areaInput.value });
  });

  return syncCities;
}

/** Ensures a required field is not silently empty (used by custom controls). */
export function requireValue(fieldWrapper, value, message) {
  if (!validateRequired(value, message).valid) {
    fieldWrapper.classList.add('has-error');
    const slot = fieldWrapper.querySelector('.field__error-text');
    if (slot) slot.textContent = message;
    return false;
  }
  fieldWrapper.classList.remove('has-error');
  return true;
}

/* ------------------------------------------------------------------ */
/* native-validation bridge                                            */
/* ------------------------------------------------------------------ */
/* Pages that build their own markup (rather than using `field()` from
 * components/ui.js) rely on the browser's own constraint validation instead
 * of a rules map. These two helpers give those forms the same inline error
 * presentation and the same `{ valid, values }` result shape as `initForm`,
 * so every form in the app behaves identically.
 * ------------------------------------------------------------------ */

const VALIDATABLE = 'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="file"]), select, textarea';

function controlsIn(form) {
  return $$(VALIDATABLE, form).filter((control) => control.type !== 'hidden');
}

function wrapperFor(control) {
  return control.closest('.field') ?? control.parentElement;
}

/**
 * Writes a message into whichever error slot the markup provides:
 * a bare `.field__error` span, or the `field()` component's
 * `.field__error-text` child.
 */
function paintError(control, message) {
  const wrapper = wrapperFor(control);
  wrapper?.classList.add('has-error');
  wrapper?.classList.remove('has-success');

  const slot = wrapper?.querySelector('.field__error');
  if (slot) {
    slot.hidden = false;
    const target = slot.querySelector('.field__error-text') ?? slot;
    target.textContent = message;
  }

  control.setAttribute('aria-invalid', 'true');
}

function clearError(control) {
  const wrapper = wrapperFor(control);
  if (!wrapper) return;

  wrapper.classList.remove('has-error');

  const slot = wrapper.querySelector('.field__error');
  if (slot) {
    slot.hidden = true;
    const target = slot.querySelector('.field__error-text') ?? slot;
    target.textContent = '';
  }

  control.removeAttribute('aria-invalid');
}

/** Reads every control into a plain object, coercing numbers and checkboxes. */
function readForm(form) {
  const values = {};

  for (const control of controlsIn(form)) {
    const { name } = control;
    if (!name) continue;

    if (control.type === 'checkbox') {
      values[name] = control.checked;
    } else if (control.type === 'radio') {
      if (control.checked) values[name] = control.value;
    } else if (control.type === 'number' || control.type === 'range') {
      values[name] = control.value === '' ? '' : Number(control.value);
    } else {
      values[name] = control.value;
    }
  }

  // Multiple selects and checkbox groups share one name and arrive as arrays.
  const data = new FormData(form);
  for (const [key, value] of data.entries()) {
    if (key.endsWith('[]')) {
      const field = key.slice(0, -2);
      values[field] = values[field] ?? [];
      values[field].push(value);
    }
  }

  return values;
}

/**
 * Attaches inline validation to a form built from plain controls.
 *
 * Errors clear as soon as the user edits the field and are shown on blur, so
 * nobody is told a field is wrong before they have finished with it.
 *
 * @param {HTMLFormElement} form
 * @returns {() => void} cleanup that removes the listeners
 */
export function initFormValidation(form) {
  if (!form) return () => {};

  const listeners = [];

  for (const control of controlsIn(form)) {
    const onInput = () => {
      if (wrapperFor(control)?.classList.contains('has-error')) clearError(control);
      control.setCustomValidity?.('');
    };

    const onBlur = () => {
      if (control.checkValidity()) {
        clearError(control);
        wrapperFor(control)?.classList.add('has-success');
      } else {
        paintError(control, control.validationMessage);
      }
    };

    control.addEventListener('input', onInput);
    control.addEventListener('change', onInput);
    control.addEventListener('blur', onBlur);
    listeners.push([control, 'input', onInput], [control, 'change', onInput], [control, 'blur', onBlur]);
  }

  return () => {
    for (const [target, event, handler] of listeners) target.removeEventListener(event, handler);
  };
}

/**
 * Validates a form and reads its values in one pass.
 *
 * @returns {{ valid: boolean, values: object, errors: Record<string,string> }}
 */
export function validateForm(form) {
  if (!form) return { valid: true, values: {}, errors: {} };

  const values = readForm(form);
  const errors = {};
  let firstInvalid = null;

  for (const control of controlsIn(form)) {
    if (control.checkValidity()) {
      if (!errors[control.name]) clearError(control);
      continue;
    }

    const message = control.validationMessage || 'Please check this field';
    if (!errors[control.name]) errors[control.name] = message;
    paintError(control, message);
    if (!firstInvalid) firstInvalid = control;
  }

  if (firstInvalid) {
    firstInvalid.focus();
    firstInvalid.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  return { valid: Object.keys(errors).length === 0, values, errors };
}