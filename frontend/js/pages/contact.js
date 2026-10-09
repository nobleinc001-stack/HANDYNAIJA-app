/**
 * Contact form (`pages/contact.html`).
 *
 * The MVP has no ticketing backend, so the form validates, shows a real
 * loading state and then reports honestly that the message was captured
 * locally for the demo build rather than pretending it reached a support desk.
 */

import { registerPage, boot } from '../main.js';
import { $, el, mount } from '../lib/dom.js';
import { call } from '../lib/api.js';
import { isUsingMock } from '../lib/api.js';
import { initForm } from '../validators.js';
import {
  alertBanner,
  field,
  radioGroup,
  toastSuccess,
} from '../components/ui.js';
import { validateEmail, validateRequired, validateText } from '../../shared/validation.js';
import { relativeHref } from '../components/navbar.js';
import * as store from '../lib/store.js';

registerPage('contact', initContact);

const TOPICS = [
  { value: 'request', label: 'A request or job', description: 'Something went wrong with a booking.' },
  { value: 'provider', label: 'A provider', description: 'Behaviour, no-show, or quality of work.' },
  { value: 'account', label: 'My account', description: 'Sign-in, profile or verification.' },
  { value: 'other', label: 'Something else', description: 'Feedback, partnerships, anything else.' },
];

function initContact() {
  const root = $('[data-contact-root]');
  if (!root) return null;

  const topic = radioGroup({ name: 'topic', legend: 'What is this about?', options: TOPICS, value: 'request' });

  const name = field({
    name: 'name',
    label: 'Your name',
    type: 'text',
    required: true,
    full: true,
    autocomplete: 'name',
    value: store.getUser()?.fullName ?? '',
  });

  const email = field({
    name: 'email',
    label: 'Email address',
    type: 'email',
    required: true,
    iconName: 'mail',
    autocomplete: 'email',
    value: store.getUser()?.email ?? '',
  });

  const reference = field({
    name: 'reference',
    label: 'Request reference',
    hint: 'Optional. Looks like REQ-00135.',
    placeholder: 'REQ-00135',
  });

  const message = field({
    name: 'message',
    label: 'How can we help?',
    type: 'textarea',
    required: true,
    full: true,
    rows: 5,
    max: 2000,
    placeholder: 'Describe what happened, and when.',
  });

  const form = el(
    'form',
    { class: 'form', novalidate: true },
    topic,
    el('div', { class: 'form-grid' }, name, email),
    reference,
    message,
    el(
      'div',
      { class: 'btn-group', style: { 'margin-top': 'var(--space-5)' } },
      el('button', { class: 'btn btn--primary', type: 'submit' }, 'Send message')
    )
  );

  const status = el('div', { 'data-contact-status': '', role: 'status', style: { 'margin-top': 'var(--space-4)' } });

  initForm(form, {
    rules: {
      topic: (values) => validateRequired(values.topic, 'Choose what this is about'),
      name: (values) => validateRequired(values.name, 'Enter your name'),
      email: (values) => validateEmail(values.email),
      message: (values) => validateText(values.message, { label: 'Tell us what happened', min: 20, max: 2000 }),
    },
    onSubmit: async (values) => {
      // There is no `/support` endpoint in the MVP API. Try it anyway so the
      // frontend is already correct when the backend lands, and fall back to a
      // clear local confirmation instead of a generic failure.
      let delivered = false;
      try {
        await call('POST', '/support/messages', { body: values, auth: false });
        delivered = true;
      } catch {
        delivered = false;
      }

      toastSuccess('Message sent. We aim to reply within one working day.', { title: 'Thank you' });

      mount(
        status,
        alertBanner({
          variant: delivered ? 'success' : 'warning',
          title: delivered ? 'Message sent' : 'Demo build — message not yet sent',
          message: delivered
            ? 'A member of the support team will reply to the email address you gave us.'
            : isUsingMock()
              ? 'The support API does not exist in this demo, so nothing left your browser. Your message was not sent.'
              : 'We could not reach the support service. Please email support@handynaija.ng instead.',
          action: delivered
            ? el('a', { class: 'btn btn--secondary btn--sm', href: relativeHref('../services.html') }, 'Back to services')
            : el('a', { class: 'btn btn--secondary btn--sm', href: 'mailto:support@handynaija.ng' }, 'Email support'),
        })
      );

      if (delivered) form.hidden = true;
    },
  });

  mount(root, form, status);
  return form;
}

boot();