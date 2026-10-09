/**
 * Provider availability (`provider-availability.html`).
 *
 * Recurring weekly hours (per-day time ranges) plus blackout dates. The whole
 * schedule is saved in one `PUT /provider/availability` call.
 */

import { registerPage, boot } from '../main.js';
import { $, el, mount } from '../lib/dom.js';
import { call } from '../lib/api.js';
import { ROLES, DAYS_OF_WEEK } from '../../shared/constants.js';
import { renderShell, appendUserChip, pageHead } from '../components/shell.js';
import { alertBanner, spinner, toastSuccess, toastError } from '../components/ui.js';
import { resolveMyProviderId, summariseAvailability } from '../providers.js';

registerPage('provider-availability', initAvailability);

const DEFAULT_RANGE = { enabled: true, start: '08:00', end: '17:00' };

let providerId = null;
let schedule = [];
let blackouts = [];

async function initAvailability() {
  providerId = await resolveMyProviderId();

  const content = renderShell({
    role: ROLES.PROVIDER,
    title: 'Availability',
    subtitle: 'Tell customers when you can take jobs',
  });

  appendUserChip(content);

  const slot = el('div', { class: 'card card--padded' });
  content.append(
    pageHead('Weekly availability', 'Customers see this before they send a request.'),
    slot
  );

  mount(slot, spinner({ label: 'Loading your schedule', large: true }));

  try {
    const [availability, provider] = await Promise.all([
      call('GET', `/providers/${encodeURIComponent(providerId)}/availability`),
      call('GET', `/providers/${encodeURIComponent(providerId)}`),
    ]);

    schedule = normalise(availability?.availability ?? availability?.days ?? []);
    blackouts = provider?.provider?.blackoutDates ?? [];
  } catch {
    schedule = normalise([]);
  }

  render(slot);
}

/* ------------------------------------------------------------------ */

function normalise(payload) {
  const days = Array.isArray(payload) ? payload : payload?.days ?? payload?.availability ?? [];
  const entries = Array.isArray(days) ? days : [];

  return DAYS_OF_WEEK.map((day) => {
    const found = entries.find((entry) => entry?.day === day.value || entry?.value === day.value);
    // A single `{ start, end }` pair is as valid as a `ranges` array.
    const ranges = found?.ranges ?? (found?.start ? [{ start: found.start, end: found.end }] : []);
    // `available` is the public slot flag; `isEnabled`/`enabled` are the
    // persisted variants. An explicit `false` on any of them disables the day.
    const disabled = found && (found.available === false || found.isEnabled === false || found.enabled === false);

    return {
      day: day.value,
      label: day.short,
      enabled: found ? !disabled : day.value !== 0,
      start: ranges[0]?.start ?? DEFAULT_RANGE.start,
      end: ranges[0]?.end ?? DEFAULT_RANGE.end,
    };
  });
}

function render(slot) {
  const form = el('form', { class: 'form', novalidate: true },
    alertBanner({
      variant: 'info',
      // `summariseAvailability` reads the public slot shape
      // (`{ day, available, start, end }`); the editor tracks `enabled`.
      // Handing it the editor rows directly made every provider look
      // permanently unavailable.
      message: summariseAvailability(schedule.map((day) => ({ ...day, available: day.enabled }))),
    }),
    el('div', { class: 'stack', style: { '--flow': 'var(--space-2)', 'margin-top': 'var(--space-5)' } },
      ...schedule.map(dayRow)),
    el('div', { class: 'btn-group', style: { 'margin-top': 'var(--space-6)' } },
      el('button', { class: 'btn btn--primary', type: 'submit' }, 'Save availability'),
      el('button', { class: 'btn btn--ghost', type: 'button', onclick: () => { schedule = normalise([]); render(slot); } }, 'Reset to defaults')
    )
  );

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = $('button[type="submit"]', form);
    button?.setAttribute('disabled', '');

    try {
      await call('PUT', '/provider/availability', {
        body: {
          // Saved in the same slot shape the GET returns, so a save followed
          // by a reload round-trips instead of resetting to the defaults.
          days: schedule.map((day) => ({
            day: day.day,
            available: day.enabled,
            start: day.start,
            end: day.end,
          })),
        },
      });
      toastSuccess('Availability updated.');
    } catch (error) {
      toastError(error.userMessage ?? 'Could not save your availability.');
    } finally {
      button?.removeAttribute('disabled');
    }
  });

  mount(slot, form);
}

function dayRow(day) {
  const inputId = `day-${day.day}`;

  const toggle = el('input', { type: 'checkbox', id: inputId, checked: day.enabled });
  const start = el('input', { class: 'control control--sm', type: 'time', value: day.start, 'aria-label': `${day.label} start time`, disabled: !day.enabled });
  const end = el('input', { class: 'control control--sm', type: 'time', value: day.end, 'aria-label': `${day.label} end time`, disabled: !day.enabled });

  toggle.addEventListener('change', () => {
    day.enabled = toggle.checked;
    start.disabled = !toggle.checked;
    end.disabled = !toggle.checked;
  });
  start.addEventListener('change', () => { day.start = start.value; });
  end.addEventListener('change', () => { day.end = end.value; });

  return el('div', { class: 'availability-row' },
    el('label', { class: 'check', for: inputId, style: { 'min-width': '8rem' } }, toggle, el('span', { text: day.label })),
    el('div', { class: 'cluster', style: { '--cluster-gap': 'var(--space-2)' } }, start, el('span', { class: 'text-xs text-muted', text: 'to' }), end)
  );
}

boot();