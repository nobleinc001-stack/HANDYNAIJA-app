/**
 * HANDYNAIJA — Shared Validation Rules
 *
 * Pure, dependency-free validators shared by the frontend forms and the
 * backend request validators. Every function returns a result object rather
 * than throwing, so both layers can consume it the same way.
 *
 * Shape: { valid: boolean, message: string|null, value: any }
 */

import { STATES, LOCATIONS, RATING, DAYS_OF_WEEK } from './constants.js';

/* ------------------------------------------------------------------ */
/* primitives                                                          */
/* ------------------------------------------------------------------ */

const ok = (value = null) => ({ valid: true, message: null, value });
const fail = (message, value = null) => ({ valid: false, message, value });

/**
 * Accepts local Nigerian numbers: 0803..., +234803..., 234803...
 * Returns the normalised form (leading +234) on success.
 */
export function validatePhone(input) {
  const raw = String(input ?? '').trim();
  if (!raw) return fail('Enter your phone number');

  const digits = raw.replace(/[\s()-]/g, '');

  let local = null;
  if (/^0\d{10}$/.test(digits)) local = digits;
  else if (/^234\d{10}$/.test(digits)) local = `0${digits.slice(3)}`;
  else if (/^\+234\d{10}$/.test(digits)) local = `0${digits.slice(4)}`;
  else if (/^234\d{10}$/.test(digits)) local = `0${digits.slice(3)}`;

  if (!local) return fail('Enter a valid Nigerian phone number, e.g. 0803 123 4567', raw);
  return ok(`+234${local.slice(1)}`);
}

/** Pragmatic email check — deliberately not RFC-exhaustive. */
export function validateEmail(input) {
  const value = String(input ?? '').trim().toLowerCase();
  if (!value) return fail('Enter your email address');
  if (value.length > 254) return fail('Email address is too long', value);
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(value)) {
    return fail('Enter a valid email address, e.g. name@example.com', value);
  }
  return ok(value);
}

/**
 * Password policy for the MVP:
 * min 8 chars, one uppercase, one lowercase, one digit.
 */
export function validatePassword(input) {
  const value = String(input ?? '');
  if (!value) return fail('Enter a password');
  if (value.length < 8) return fail('Password must be at least 8 characters long', value);
  if (!/[A-Z]/.test(value)) return fail('Password must include an uppercase letter', value);
  if (!/[a-z]/.test(value)) return fail('Password must include a lowercase letter', value);
  if (!/\d/.test(value)) return fail('Password must include a number', value);
  return ok(value);
}

/** Names: letters, spaces, hyphens, apostrophes. Two-plus characters. */
export function validateName(input, label = 'Enter your full name') {
  const value = String(input ?? '').trim().replace(/\s+/g, ' ');
  if (!value) return fail(label);
  if (value.length < 2) return fail(label, value);
  if (value.length > 80) return fail('Name must be 80 characters or fewer', value);
  if (!/^[\p{L}][\p{L}\p{M}'.\- ]*$/u.test(value)) {
    return fail('Use letters, spaces, hyphens or apostrophes only', value);
  }
  return ok(value);
}

/** Business name is looser than a personal name (allows &, +, digits). */
export function validateBusinessName(input) {
  const value = String(input ?? '').trim().replace(/\s+/g, ' ');
  if (!value) return fail('Enter your business or provider name');
  if (value.length < 2) return fail('Enter your business or provider name', value);
  if (value.length > 100) return fail('Business name must be 100 characters or fewer', value);
  return ok(value);
}

export function validateRequired(input, label = 'This field is required') {
  const value = typeof input === 'string' ? input.trim() : input;
  if (value === null || value === undefined || value === '') return fail(label);
  return ok(value);
}

export function validateText(input, { label = 'This field is required', min = 10, max = 2000 } = {}) {
  const value = String(input ?? '').trim();
  if (!value) return fail(label);
  if (value.length < min) return fail(`Enter at least ${min} characters`, value);
  if (value.length > max) return fail(`Keep this under ${max} characters`, value);
  return ok(value);
}

export function validateNumber(input, { label = 'Enter a number', min = 0, max = 100, integer = true } = {}) {
  const raw = String(input ?? '').trim();
  if (!raw) return fail(label);
  const value = Number(raw);
  if (!Number.isFinite(value)) return fail(`${label} must be a number`, raw);
  if (integer && !Number.isInteger(value)) return fail(`${label} must be a whole number`, raw);
  if (value < min) return fail(`${label} must be at least ${min}`, raw);
  if (value > max) return fail(`${label} must be at most ${max}`, raw);
  return ok(value);
}

/* ------------------------------------------------------------------ */
/* domain fields                                                       */
/* ------------------------------------------------------------------ */

export function validateState(input) {
  const value = String(input ?? '').trim();
  if (!value) return fail('Select a state');
  if (!STATES.includes(value)) return fail('Select a valid state', value);
  return ok(value);
}

export function validateCity(input, state) {
  const value = String(input ?? '').trim();
  if (!value) return fail('Select a city');
  const cities = LOCATIONS[state];
  if (cities && !cities.includes(value)) return fail('Select a city within the chosen state', value);
  return ok(value);
}

export function validateArea(input) {
  const value = String(input ?? '').trim();
  if (!value) return fail('Enter your area or neighbourhood');
  if (value.length < 2) return fail('Enter your area or neighbourhood', value);
  return ok(value);
}

/** `YYYY-MM-DD`, must be today or later. */
export function validateDate(input, { allowPast = false } = {}) {
  const value = String(input ?? '').trim();
  if (!value) return fail('Choose a date');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return fail('Choose a valid date', value);

  const chosen = new Date(`${value}T00:00:00`);
  if (Number.isNaN(chosen.getTime())) return fail('Choose a valid date', value);

  if (!allowPast) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (chosen < today) return fail('Choose today or a future date', value);
  }
  return ok(value);
}

/** `HH:MM` in 24-hour form. */
export function validateTime(input) {
  const value = String(input ?? '').trim();
  if (!value) return fail('Choose a time');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return fail('Choose a valid time', value);
  return ok(value);
}

/**
 * Combined date + time check. A time must be at least `minLeadMinutes`
 * ahead if the chosen date is today.
 */
export function validatePreferredSlot(date, time, { minLeadMinutes = 60 } = {}) {
  const dateResult = validateDate(date);
  if (!dateResult.valid) return dateResult;

  const timeResult = validateTime(time);
  if (!timeResult.valid) return timeResult;

  if (minLeadMinutes > 0) {
    const [hours, minutes] = timeResult.value.split(':').map(Number);
    const now = new Date();
    const slot = new Date();
    slot.setHours(hours, minutes, 0, 0);
    const isToday = dateResult.value === now.toISOString().slice(0, 10);
    if (isToday && slot.getTime() - now.getTime() < minLeadMinutes * 60_000) {
      return fail(`Choose a time at least ${minLeadMinutes} minutes from now`);
    }
  }
  return ok({ date: dateResult.value, time: timeResult.value });
}

export function validateRating(input) {
  const value = Number(input);
  if (!Number.isInteger(value)) return fail('Select a rating');
  if (value < RATING.MIN || value > RATING.MAX) return fail(`Rating must be between ${RATING.MIN} and ${RATING.MAX}`);
  return ok(value);
}

export function validateExperienceYears(input) {
  return validateNumber(input, { label: 'Enter your years of experience', min: 0, max: 70 });
}

export function validateWorkingDay(day) {
  const value = Number(day);
  if (!DAYS_OF_WEEK.some((d) => d.value === value)) return fail('Invalid day of the week');
  return ok(value);
}

/* ------------------------------------------------------------------ */
/* file uploads                                                        */
/* ------------------------------------------------------------------ */

export const UPLOAD_LIMITS = Object.freeze({
  maxBytes: 5 * 1024 * 1024,
  imageTypes: ['image/jpeg', 'image/png', 'image/webp'],
});

/** Validates a File object for provider photos / request attachments. */
export function validateImageFile(file) {
  if (!file) return fail('Choose an image to upload');
  if (!UPLOAD_LIMITS.imageTypes.includes(file.type)) {
    return fail('Upload a JPG, PNG or WEBP image');
  }
  if (file.size > UPLOAD_LIMITS.maxBytes) {
    return fail('Image must be 5MB or smaller', file.name);
  }
  return ok(file);
}

/* ------------------------------------------------------------------ */
/* cross-field rules                                                   */
/* ------------------------------------------------------------------ */

export function validatePasswordConfirmation(password, confirmation) {
  if (!confirmation) return fail('Confirm your password');
  if (password !== confirmation) return fail('Passwords do not match');
  return ok(confirmation);
}

/**
 * Validates a whole payload against a field -> validator map.
 * Returns { valid, errors: { field: message }, values: { field: value } }
 * so a form can render every message in one pass.
 */
export function validatePayload(payload, rules) {
  const errors = {};
  const values = {};

  for (const [field, rule] of Object.entries(rules)) {
    const result = rule(payload, field);
    if (!result.valid) errors[field] = result.message;
    else values[field] = result.value;
  }

  return { valid: Object.keys(errors).length === 0, errors, values };
}