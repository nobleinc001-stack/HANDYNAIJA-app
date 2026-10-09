/**
 * HANDYNAIJA — Shared Constants
 * Single source of truth for browser-side enumerations.
 * Keep this file free of DOM and Node APIs so it can be imported anywhere.
 */

export const APP = {
  name: 'HandyNaija',
  tagline: 'Find a trusted local professional',
  currency: 'NGN',
  currencySymbol: '₦',
  dateFormat: 'en-NG',
};

/** User roles. Maps to `users.role` in the database. */
export const ROLES = Object.freeze({
  CUSTOMER: 'customer',
  PROVIDER: 'provider',
  ADMIN: 'admin',
});

export const ROLE_LABELS = Object.freeze({
  [ROLES.CUSTOMER]: 'Customer',
  [ROLES.PROVIDER]: 'Service Provider',
  [ROLES.ADMIN]: 'Administrator',
});

/**
 * Service request lifecycle — mirrors section 7 of the Technical Architecture doc.
 * PENDING ─┬─> ACCEPTED ──> SCHEDULED ──> IN_PROGRESS ──> COMPLETED
 *          ├─> REJECTED
 *          └─> CANCELLED
 */
export const REQUEST_STATUS = Object.freeze({
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  SCHEDULED: 'SCHEDULED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
});

/** Ordered list used by the progress timeline and by filter dropdowns. */
export const REQUEST_STATUS_ORDER = Object.freeze([
  REQUEST_STATUS.PENDING,
  REQUEST_STATUS.ACCEPTED,
  REQUEST_STATUS.SCHEDULED,
  REQUEST_STATUS.IN_PROGRESS,
  REQUEST_STATUS.COMPLETED,
]);

/** Human labels for the timeline / badges. */
export const REQUEST_STATUS_LABELS = Object.freeze({
  [REQUEST_STATUS.PENDING]: 'Pending',
  [REQUEST_STATUS.ACCEPTED]: 'Accepted',
  [REQUEST_STATUS.SCHEDULED]: 'Scheduled',
  [REQUEST_STATUS.IN_PROGRESS]: 'In Progress',
  [REQUEST_STATUS.COMPLETED]: 'Completed',
  [REQUEST_STATUS.REJECTED]: 'Rejected',
  [REQUEST_STATUS.CANCELLED]: 'Cancelled',
});

/** Statuses that still count as "work in flight" for dashboards. */
export const ACTIVE_STATUSES = Object.freeze([
  REQUEST_STATUS.PENDING,
  REQUEST_STATUS.ACCEPTED,
  REQUEST_STATUS.SCHEDULED,
  REQUEST_STATUS.IN_PROGRESS,
]);

/** Terminal statuses — no further transitions allowed. */
export const TERMINAL_STATUSES = Object.freeze([
  REQUEST_STATUS.COMPLETED,
  REQUEST_STATUS.REJECTED,
  REQUEST_STATUS.CANCELLED,
]);

/**
 * Legal state transitions. The API must reject anything not listed here.
 * Keyed by current status -> array of allowed next statuses.
 */
export const ALLOWED_TRANSITIONS = Object.freeze({
  [REQUEST_STATUS.PENDING]: [REQUEST_STATUS.ACCEPTED, REQUEST_STATUS.REJECTED, REQUEST_STATUS.CANCELLED],
  [REQUEST_STATUS.ACCEPTED]: [REQUEST_STATUS.SCHEDULED, REQUEST_STATUS.IN_PROGRESS, REQUEST_STATUS.CANCELLED],
  [REQUEST_STATUS.SCHEDULED]: [REQUEST_STATUS.IN_PROGRESS, REQUEST_STATUS.CANCELLED],
  [REQUEST_STATUS.IN_PROGRESS]: [REQUEST_STATUS.COMPLETED],
  [REQUEST_STATUS.COMPLETED]: [],
  [REQUEST_STATUS.REJECTED]: [],
  [REQUEST_STATUS.CANCELLED]: [],
});

/** Who is allowed to trigger each transition. */
export const TRANSITION_ACTORS = Object.freeze({
  [REQUEST_STATUS.ACCEPTED]: ROLES.PROVIDER,
  [REQUEST_STATUS.REJECTED]: ROLES.PROVIDER,
  [REQUEST_STATUS.SCHEDULED]: ROLES.PROVIDER,
  [REQUEST_STATUS.IN_PROGRESS]: ROLES.PROVIDER,
  [REQUEST_STATUS.COMPLETED]: ROLES.PROVIDER,
  [REQUEST_STATUS.CANCELLED]: ROLES.CUSTOMER,
});

/** Top-level service category groups (section 8 of the Product Specification). */
export const CATEGORY_GROUPS = Object.freeze([
  {
    id: 'home',
    name: 'Home Services',
    icon: 'home',
    services: [
      { id: 'electrician', name: 'Electrician' },
      { id: 'plumber', name: 'Plumber' },
      { id: 'cleaner', name: 'Cleaner' },
      { id: 'painter', name: 'Painter' },
      { id: 'carpenter', name: 'Carpenter' },
      { id: 'ac-technician', name: 'AC Technician' },
    ],
  },
  {
    id: 'automotive',
    name: 'Automotive',
    icon: 'car',
    services: [
      { id: 'mechanic', name: 'Mechanic' },
      { id: 'auto-electrician', name: 'Auto Electrician' },
      { id: 'car-wash', name: 'Car Wash' },
      { id: 'tire-technician', name: 'Tire Technician' },
    ],
  },
  {
    id: 'education',
    name: 'Education',
    icon: 'book',
    services: [
      { id: 'tutor', name: 'Tutor' },
      { id: 'music-teacher', name: 'Music Teacher' },
      { id: 'language-teacher', name: 'Language Teacher' },
    ],
  },
  {
    id: 'technology',
    name: 'Technology',
    icon: 'laptop',
    services: [
      { id: 'computer-technician', name: 'Computer Technician' },
      { id: 'phone-technician', name: 'Phone Technician' },
      { id: 'network-technician', name: 'Network Technician' },
      { id: 'software-technician', name: 'Software Technician' },
    ],
  },
  {
    id: 'personal',
    name: 'Personal Services',
    icon: 'user',
    services: [
      { id: 'barber', name: 'Barber' },
      { id: 'tailor', name: 'Tailor' },
      { id: 'makeup-artist', name: 'Makeup Artist' },
      { id: 'photographer', name: 'Photographer' },
    ],
  },
]);

/** Flat lookup of every valid service id -> name. */
export const SERVICE_NAMES = Object.freeze(
  CATEGORY_GROUPS.flatMap((group) => group.services).reduce((acc, service) => {
    acc[service.id] = service.name;
    return acc;
  }, {})
);

/**
 * Services surfaced as quick-pick chips on the landing page.
 * Every id must exist in `SERVICE_NAMES`.
 */
export const POPULAR_SERVICES = Object.freeze([
  'electrician',
  'plumber',
  'mechanic',
  'cleaner',
  'tutor',
  'computer-technician',
]);

/**
 * Location model for the MVP: State -> City -> Area.
 * Real GPS/geospatial search is explicitly out of scope for the MVP.
 */
export const LOCATIONS = Object.freeze({
  Anambra: ['Awka', 'Onitsha', 'Nnewi'],
  Lagos: ['Ikeja', 'Lagos Island', 'Surulere', 'Yaba', 'Ikorodu'],
  Abuja: ['Gwagwalada', 'Kuje', 'Maitama', 'Wuse'],
  Oyo: ['Ibadan', 'Ogbomoso', 'Oyo'],
  Rivers: ['Port Harcourt', 'Obio-Akpor', 'Bonny'],
  Enugu: ['Enugu', 'Nsukka', 'Oji'],
  Kaduna: ['Kaduna', 'Zaria', 'Kafanchan'],
  Kano: ['Kano', 'Wudil'],
  'Cross River': ['Calabar', 'Ugep'],
  Edo: ['Benin City', 'Ekpoma'],
});

export const STATES = Object.freeze(Object.keys(LOCATIONS));

/** Verification states for a provider profile (section 17, Product Spec). */
export const VERIFICATION_STATUS = Object.freeze({
  UNVERIFIED: 'unverified',
  VERIFIED: 'verified',
});

export const VERIFICATION_LABELS = Object.freeze({
  [VERIFICATION_STATUS.UNVERIFIED]: 'Not verified',
  [VERIFICATION_STATUS.VERIFIED]: 'Verified',
});

/** Account status — used for admin suspend / activate actions. */
export const ACCOUNT_STATUS = Object.freeze({
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
});

/** Notification types (section 11, MVP Requirements). */
export const NOTIFICATION_TYPE = Object.freeze({
  REQUEST_SUBMITTED: 'request_submitted',
  REQUEST_ACCEPTED: 'request_accepted',
  REQUEST_REJECTED: 'request_rejected',
  REQUEST_CANCELLED: 'request_cancelled',
  REQUEST_RESCHEDULED: 'request_rescheduled',
  NEW_MESSAGE: 'new_message',
  SERVICE_COMPLETED: 'service_completed',
  NEW_REVIEW: 'new_review',
  REVIEW_REMINDER: 'review_reminder',
});

/** Report reasons (section 21, Product Specification). */
export const REPORT_REASON = Object.freeze({
  FRAUD: 'fraud_scam',
  INAPPROPRIATE: 'inappropriate_behaviour',
  FAKE_PROFILE: 'fake_profile',
  POOR_CONDUCT: 'poor_conduct',
  SPAM: 'spam',
  OTHER: 'other',
});

export const REPORT_REASON_LABELS = Object.freeze({
  [REPORT_REASON.FRAUD]: 'Fraud or scam',
  [REPORT_REASON.INAPPROPRIATE]: 'Inappropriate behaviour',
  [REPORT_REASON.FAKE_PROFILE]: 'Fake profile',
  [REPORT_REASON.POOR_CONDUCT]: 'Poor conduct',
  [REPORT_REASON.SPAM]: 'Spam',
  [REPORT_REASON.OTHER]: 'Other',
});

/** Days of week — 0 = Sunday. Used by provider availability. */
export const DAYS_OF_WEEK = Object.freeze([
  { value: 0, short: 'Sun', name: 'Sunday' },
  { value: 1, short: 'Mon', name: 'Monday' },
  { value: 2, short: 'Tue', name: 'Tuesday' },
  { value: 3, short: 'Wed', name: 'Wednesday' },
  { value: 4, short: 'Thu', name: 'Thursday' },
  { value: 5, short: 'Fri', name: 'Friday' },
  { value: 6, short: 'Sat', name: 'Saturday' },
]);

/** Rating bounds for reviews. */
export const RATING = Object.freeze({ MIN: 1, MAX: 5 });

/** Base path for the REST API. Must match `backend` `/api/v1` mount point. */
export const API_BASE = '/api/v1';

/**
 * Status -> CSS modifier hook. Kept here so badges stay consistent with
 * `components.css`, and so the backend can emit the same key if needed.
 */
export const STATUS_VARIANT = Object.freeze({
  [REQUEST_STATUS.PENDING]: 'pending',
  [REQUEST_STATUS.ACCEPTED]: 'accepted',
  [REQUEST_STATUS.SCHEDULED]: 'scheduled',
  [REQUEST_STATUS.IN_PROGRESS]: 'in-progress',
  [REQUEST_STATUS.COMPLETED]: 'completed',
  [REQUEST_STATUS.REJECTED]: 'rejected',
  [REQUEST_STATUS.CANCELLED]: 'cancelled',
});