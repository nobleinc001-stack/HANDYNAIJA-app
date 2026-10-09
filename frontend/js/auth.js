/**
 * Authentication.
 *
 * Talks to `/api/v1/auth/*`, persists the session locally, and provides the
 * route guards every authenticated page calls on boot.
 */

import { API_BASE, ROLES, ROLE_LABELS } from '../../shared/constants.js';
import { ApiError, call } from './lib/api.js';
import * as store from './lib/store.js';
import { el, $, mount } from './lib/dom.js';
import { relativeHref } from './components/navbar.js';
import { toastSuccess, toastError } from './components/ui.js';
import { initForm } from './validators.js';
import {
  validateEmail,
  validateName,
  validatePhone,
  validatePassword,
  validatePasswordConfirmation,
  validateRequired,
} from '../../shared/validation.js';
import {
  alertBanner,
  checkboxField,
  field,
  passwordField,
  radioGroup,
} from './components/ui.js';

/** Landing page for each role after sign-in. */
export const HOME_FOR_ROLE = {
  [ROLES.CUSTOMER]: 'dashboard.html',
  [ROLES.PROVIDER]: 'provider-dashboard.html',
  [ROLES.ADMIN]: 'admin-dashboard.html',
};

const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

/* ------------------------------------------------------------------ */
/* session                                                             */
/* ------------------------------------------------------------------ */

/**
 * Stores the session returned by the API.
 *
 * NOTE: the MVP has no backend yet, so `token` may be a placeholder string.
 * The server is the only thing that can authorise a request — never treat a
 * value from LocalStorage as proof of identity.
 */
export function saveSession({ user, token }) {
  store.setUser(user);
  store.setSession({
    token,
    user: { id: user.id, role: user.role, fullName: user.fullName },
    expiresAt: Date.now() + SESSION_TTL_MS,
  });
  return user;
}

export function currentUser() {
  return store.getUser();
}

export function currentRole() {
  return store.getRole();
}

export function isSignedIn() {
  const session = store.getSession();
  if (!session?.token) return false;

  if (session.expiresAt && session.expiresAt < Date.now()) {
    store.clearSession();
    return false;
  }
  return true;
}

export async function signOut({ redirect = 'index.html' } = {}) {
  try {
    await call('POST', '/auth/logout', { skipAuthRedirect: true });
  } catch {
    // Even if the server call fails, drop the local session — the user asked
    // to leave, and a stale token is worse than a harmless extra request.
  }
  store.clearSession();
  if (redirect !== null) window.location.href = relativeHref(redirect);
}

/* ------------------------------------------------------------------ */
/* actions                                                             */
/* ------------------------------------------------------------------ */

/**
 * Signs in.
 * `identifier` may be an email address or a phone number.
 */
export async function signIn({ identifier, password, remember = true }) {
  const isEmail = String(identifier).includes('@');

  const payload = {
    password,
    ...(isEmail ? { email: identifier.trim().toLowerCase() } : { phone: identifier.trim() }),
  };

  const result = await call('POST', '/auth/login', { body: payload, auth: false });

  if (!result?.user || !result?.token) {
    throw new ApiError({ code: 'MALFORMED_RESPONSE', message: 'We could not sign you in. Please try again.' });
  }

  if (!remember) {
    // Short-lived tab session: keep the user cached, drop the token on close.
    sessionStorage.setItem(`${API_BASE}:transient`, '1');
  }

  saveSession(result);
  return result.user;
}

export async function register(payload) {
  const result = await call('POST', '/auth/register', { body: payload, auth: false });

  if (!result?.user) {
    throw new ApiError({ code: 'MALFORMED_RESPONSE', message: 'We could not create your account. Please try again.' });
  }

  // The register endpoint may or may not return a token; handle both.
  if (result.token) saveSession(result);
  else store.setUser(result.user);

  return result.user;
}

export async function requestPasswordReset({ identifier }) {
  const isEmail = String(identifier).includes('@');
  return call('POST', '/auth/forgot-password', {
    body: isEmail ? { email: identifier.trim().toLowerCase() } : { phone: identifier.trim() },
    auth: false,
  });
}

/* ------------------------------------------------------------------ */
/* guards                                                              */
/* ------------------------------------------------------------------ */

/**
 * Protects a page.
 *
 * @param {object} options
 * @param {string[]} options.roles - allowed roles; omit to allow any signed-in user
 * @param {boolean} options.optional - don't redirect when signed out (public pages)
 * @returns {object|null} the signed-in user, or null on a public page
 */
export function requireAuth({ roles = null, optional = false } = {}) {
  if (!isSignedIn()) {
    if (optional) return null;
    redirectToLogin();
    return null;
  }

  const role = currentRole();

  if (roles && !roles.includes(role)) {
    toastError(`This page is only available to ${roles.map((item) => ROLE_LABELS[item] ?? item).join(' or ')} accounts.`, {
      title: 'Not available for your account',
    });
    window.location.href = relativeHref(HOME_FOR_ROLE[role] ?? 'index.html');
    return null;
  }

  return currentUser();
}

export function redirectToLogin(returnTo = null) {
  const target = returnTo ?? `${window.location.pathname.split('/').pop()}${window.location.search}`;
  const next = encodeURIComponent(target);
  window.location.href = relativeHref(`login.html?next=${next}`);
}

/** Redirects a signed-in user away from login / register. */
export function redirectIfSignedIn() {
  if (!isSignedIn()) return false;
  const target = new URLSearchParams(window.location.search).get('next');
  window.location.href = relativeHref(target || (HOME_FOR_ROLE[currentRole()] ?? 'dashboard.html'));
  return true;
}

/* ------------------------------------------------------------------ */
/* error messages                                                      */
/* ------------------------------------------------------------------ */

/** Maps an ApiError to a message appropriate for a sign-in form. */
export function loginErrorMessage(error) {
  if (error instanceof ApiError) {
    if (error.code === 'INVALID_CREDENTIALS' || error.status === 401) {
      return 'We could not match that email and password. Check them and try again.';
    }
    if (error.status === 403) return 'Your account has been suspended. Contact support for help.';
    if (error.isValidationError) return 'Check the email and password you entered.';
  }
  return error?.userMessage ?? 'We could not sign you in. Please try again.';
}

export function registrationErrorMessage(error) {
  if (error instanceof ApiError && error.code === 'EMAIL_TAKEN') {
    return 'An account already exists with that email. Try logging in instead.';
  }
  if (error instanceof ApiError && error.code === 'PHONE_TAKEN') {
    return 'An account already exists with that phone number.';
  }
  return error?.userMessage ?? 'We could not create your account. Please try again.';
}

/* ------------------------------------------------------------------ */
/* demo credentials helper                                             */
/* ------------------------------------------------------------------ */

/**
 * Renders a one-click demo sign-in panel. Only mounted when the client is
 * running against mock data — never shown against a real API.
 */
export async function renderDemoLoginPanel(container, onPick) {
  if (!container) return;

  const [{ demoCredentials }, { isUsingMock }] = await Promise.all([
    import('./lib/mock-data.js'),
    import('./lib/api.js'),
  ]);

  if (!isUsingMock()) {
    container.remove();
    return;
  }

  const panel = el(
    'div',
    { class: 'alert alert--neutral' },
    el('span', { class: 'alert__icon' }, el('span', { html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><circle cx="12" cy="8" r=".6" fill="currentColor"/></svg>' })),
    el(
      'div',
      { class: 'alert__body' },
      el('p', { class: 'alert__title', text: 'Demo mode' }),
      el('p', { text: 'The API is not running, so these demo accounts use built-in sample data.' }),
      el(
        'div',
        { class: 'cluster', style: { '--cluster-gap': 'var(--space-2)', 'margin-top': 'var(--space-2)' } },
        ...Object.entries(demoCredentials).map(([role, credentials]) =>
          el(
            'button',
            { class: 'btn btn--sm btn--secondary', type: 'button', onclick: () => onPick(role, credentials) },
            credentials.label
          )
        )
      )
    )
  );

  container.replaceWith(panel);
}

/** Fills a form with demo credentials and submits it. */
export async function fillAndSubmitDemo(form, role, submit) {
  const { demoCredentials } = await import('./lib/mock-data.js');
  const credentials = demoCredentials[role];
  if (!credentials) throw new Error(`Unknown demo role: ${role}`);

  const identifier = form.querySelector('[name="identifier"]');
  const password = form.querySelector('[name="password"]');
  if (identifier) identifier.value = credentials.email;
  if (password) password.value = credentials.password;

  await submit();
  return credentials;
}

/* ------------------------------------------------------------------ */
/* sign-in form (login.html)                                           */
/* ------------------------------------------------------------------ */

/**
 * Builds the sign-in form into `[data-login-root]`.
 *
 * `identifier` accepts either an email address or a phone number, which is
 * what customers expect in Nigeria — we should not make them remember which
 * one they signed up with.
 */
export function initLoginForm(root) {
  if (!root) return null;
  if (redirectIfSignedIn()) return null;

  const identifier = field({
    name: 'identifier',
    label: 'Email or phone number',
    type: 'text',
    required: true,
    full: true,
    iconName: 'user',
    autocomplete: 'username',
    placeholder: 'chidi@example.com or 0803 123 4567',
  });

  const password = passwordField({
    name: 'password',
    label: 'Password',
    required: true,
    autocomplete: 'current-password',
  });

  const remember = checkboxField({
    name: 'remember',
    label: 'Keep me signed in on this device',
    checked: true,
  });

  const form = el(
    'form',
    { class: 'form', novalidate: true, 'data-error-summary-host': '' },
    el('p', { class: 'field__error-text', 'data-error-summary': '', role: 'alert' }),
    el('div', { class: 'form-grid' }, identifier, password),
    remember,
    el(
      'div',
      { class: 'cluster cluster-between', style: { 'margin-top': 'var(--space-2)' } },
      el('a', { class: 'link text-small', href: relativeHref('pages/forgot-password.html') }, 'Forgot password?')
    ),
    el(
      'div',
      { class: 'btn-group', style: { 'margin-top': 'var(--space-5)' } },
      el('button', { class: 'btn btn--primary btn--lg btn--block', type: 'submit' }, 'Sign in')
    )
  );

  mount(root, form);

  const wired = initForm(form, {
    rules: {
      identifier: (values) => validateRequired(values.identifier, 'Enter your email address or phone number'),
      password: (values) => validateRequired(values.password, 'Enter your password'),
    },
    onSubmit: async (values) => {
      let user;
      try {
        user = await signIn({
          identifier: values.identifier,
          password: values.password,
          remember: values.remember !== false,
        });
      } catch (error) {
        // Surface the friendlier copy, but keep it an ApiError so `initForm`
        // still treats it as a failed submission.
        throw new ApiError({ ...error, message: loginErrorMessage(error) });
      }

      const next = new URLSearchParams(window.location.search).get('next');
      const target = next || HOME_FOR_ROLE[user.role] || 'dashboard.html';

      window.location.href = relativeHref(target);
    },
  });

  // The demo panel lives outside the form; wire its buttons once it exists.
  const demoSlot = $('[data-demo-logins]');
  if (demoSlot) {
    renderDemoLoginPanel(demoSlot, async (role, credentials) => {
      identifier.input.value = credentials.email;
      password.input.value = credentials.password;
      await fillAndSubmitDemo(form, role, () => wired.requestSubmit());
    });
  }

  identifier.input.focus();
  return wired;
}

/* ------------------------------------------------------------------ */
/* registration form (register.html)                                   */
/* ------------------------------------------------------------------ */

const REGISTER_ROLES = [
  {
    value: ROLES.CUSTOMER,
    label: 'I need a service',
    description: 'Find and hire trusted professionals near you.',
  },
  {
    value: ROLES.PROVIDER,
    label: 'I offer a service',
    description: 'List your skills and receive requests from customers.',
  },
];

/**
 * Builds the registration form into `[data-register-root]`.
 *
 * The role chooser is a card radio group rather than a select because it is
 * the single most consequential decision on the page, and the consequences of
 * getting it wrong are not obvious from a dropdown.
 */
export function initRegisterForm(root) {
  if (!root) return null;
  if (redirectIfSignedIn()) return null;

  const params = new URLSearchParams(window.location.search);
  const preselected = params.get('role') === ROLES.PROVIDER ? ROLES.PROVIDER : ROLES.CUSTOMER;

  const role = radioGroup({
    name: 'role',
    legend: 'How will you use HandyNaija?',
    options: REGISTER_ROLES,
    value: preselected,
  });

  const fullName = field({
    name: 'fullName',
    label: 'Full name',
    type: 'text',
    required: true,
    full: true,
    autocomplete: 'name',
    placeholder: 'Chidi Okonkwo',
  });

  const email = field({
    name: 'email',
    label: 'Email address',
    type: 'email',
    required: true,
    iconName: 'mail',
    autocomplete: 'email',
    placeholder: 'you@example.com',
  });

  const phone = field({
    name: 'phone',
    label: 'Phone number',
    type: 'tel',
    required: true,
    iconName: 'phone',
    autocomplete: 'tel',
    placeholder: '0803 123 4567',
    hint: 'Providers use this to reach you about a request.',
  });

  const password = passwordField({
    name: 'password',
    label: 'Password',
    required: true,
    autocomplete: 'new-password',
    hint: 'At least 8 characters, with an uppercase letter, a lowercase letter and a number.',
  });

  const confirmPassword = passwordField({
    name: 'confirmPassword',
    label: 'Confirm password',
    required: true,
    autocomplete: 'new-password',
  });

  const terms = checkboxField({
    name: 'terms',
    label: 'I agree to the Terms of Use and Privacy Policy',
  });

  const providerNote = el('div', { 'data-provider-note': '' });

  const form = el(
    'form',
    { class: 'form', novalidate: true, 'data-error-summary-host': '' },
    el('p', { class: 'field__error-text', 'data-error-summary': '', role: 'alert' }),
    role,
    providerNote,
    el('div', { class: 'form-grid' }, fullName),
    el('div', { class: 'form-grid' }, email, phone),
    el('div', { class: 'form-grid' }, password, confirmPassword),
    terms,
    el(
      'p',
      { class: 'field__hint' },
      'Already have an account? ',
      el('a', { class: 'link', href: relativeHref('login.html') }, 'Sign in')
    ),
    el(
      'div',
      { class: 'btn-group', style: { 'margin-top': 'var(--space-5)' } },
      el('button', { class: 'btn btn--primary btn--lg btn--block', type: 'submit' }, 'Create account')
    )
  );

  mount(root, form);

  // Tell providers up front what happens next, so the form is not a dead end.
  const syncProviderNote = () => {
    const isProvider = role.value() === ROLES.PROVIDER;
    mount(
      providerNote,
      isProvider
        ? alertBanner({
            variant: 'info',
            title: 'Next: build your provider profile',
            message:
              'After signing up you will add your services, set your availability and can apply for verification.',
          })
        : null
    );
  };
  form.addEventListener('change', syncProviderNote);
  syncProviderNote();

  initForm(form, {
    rules: {
      role: (values) => validateRequired(values.role, 'Choose how you will use HandyNaija'),
      fullName: (values) => validateName(values.fullName),
      email: (values) => validateEmail(values.email),
      phone: (values) => validatePhone(values.phone),
      password: (values) => validatePassword(values.password),
      confirmPassword: (values, field) =>
        validatePasswordConfirmation(form.querySelector('[name="password"]').value, values[field]),
      terms: (values) =>
        values.terms === true || values.terms === 'on'
          ? { valid: true, message: null, value: true }
          : { valid: false, message: 'You must accept the Terms of Use to continue', value: null },
    },
    onSubmit: async (values) => {
      const isProvider = values.role === ROLES.PROVIDER;

      let user;
      try {
        user = await register({
          fullName: values.fullName,
          email: values.email,
          phone: values.phone,
          password: values.password,
          role: values.role,
          businessName: isProvider ? `${values.fullName}'s business` : undefined,
        });
      } catch (error) {
        throw new ApiError({ ...error, message: registrationErrorMessage(error) });
      }

      toastSuccess(
        isProvider
          ? 'Account created. Let us set up your provider profile.'
          : 'Welcome to HandyNaija.',
        { title: 'Account created' }
      );

      window.location.href = relativeHref(
        isProvider ? 'provider-profile.html' : (HOME_FOR_ROLE[user.role] ?? 'dashboard.html')
      );
    },
  });

  return form;
}

/* ------------------------------------------------------------------ */
/* password reset (pages/forgot-password.html)                         */
/* ------------------------------------------------------------------ */

/**
 * Builds the "forgot password" form.
 *
 * The response is deliberately identical whether or not the account exists,
 * so this screen cannot be used to discover who has an account.
 */
export function initForgotPasswordForm(root) {
  if (!root) return null;

  const identifier = field({
    name: 'identifier',
    label: 'Email address or phone number',
    type: 'text',
    required: true,
    full: true,
    iconName: 'user',
    autocomplete: 'username',
    placeholder: 'chidi@example.com or 0803 123 4567',
  });

  const form = el(
    'form',
    { class: 'form', novalidate: true, 'data-error-summary-host': '' },
    el('p', { class: 'field__error-text', 'data-error-summary': '', role: 'alert' }),
    identifier,
    el(
      'div',
      { class: 'btn-group', style: { 'margin-top': 'var(--space-5)' } },
      el('button', { class: 'btn btn--primary btn--lg btn--block', type: 'submit' }, 'Send reset link')
    ),
    el(
      'p',
      { class: 'text-center text-small text-muted', style: { 'margin-top': 'var(--space-4)' } },
      'Remembered it? ',
      el('a', { class: 'link', href: relativeHref('login.html') }, 'Back to sign in')
    )
  );

  const status = el('div', { 'data-reset-status': '', role: 'status' });

  initForm(form, {
    rules: {
      identifier: (values) => validateRequired(values.identifier, 'Enter your email address or phone number'),
    },
    onSubmit: async (values) => {
      await requestPasswordReset({ identifier: values.identifier });

      mount(
        status,
        alertBanner({
          variant: 'success',
          title: 'Check your inbox',
          message:
            'If an account matches those details, we have sent instructions to reset the password. The link expires in one hour.',
          action: el('a', { class: 'btn btn--secondary btn--sm', href: relativeHref('login.html') }, 'Back to sign in'),
        })
      );
      form.hidden = true;
    },
  });

  mount(root, form, status);
  identifier.input.focus();
  return form;
}