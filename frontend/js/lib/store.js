/**
 * LocalStorage-backed state.
 *
 * Two kinds of data live here:
 *  1. Session data — the signed-in user and the auth token. The token is only a
 *     placeholder until the real backend issues one; never treat it as proof
 *     of identity on its own.
 *  2. UI preferences and drafts — safe, disposable, per-device.
 *
 * Everything is namespaced under `hn:` so it can never collide with anything
 * else served from the same origin.
 */

import { ROLES } from '../../../shared/constants.js';

const PREFIX = 'hn:';

const keys = {
  session: `${PREFIX}session`,
  user: `${PREFIX}user`,
  preferences: `${PREFIX}preferences`,
  requestDraft: `${PREFIX}request-draft`,
  recentSearches: `${PREFIX}recent-searches`,
  seenNotifications: `${PREFIX}seen-notifications`,
  addresses: `${PREFIX}addresses`,
};

/* ------------------------------------------------------------------ */
/* safe JSON helpers                                                   */
/* ------------------------------------------------------------------ */

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed === null || parsed === undefined ? fallback : parsed;
  } catch (error) {
    console.warn(`[store] Could not read "${key}" — falling back to default.`, error);
    return fallback;
  }
}

function write(key, value) {
  try {
    if (value === null || value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    // Quota exceeded, private-mode restrictions, disabled storage.
    console.warn(`[store] Could not write "${key}".`, error);
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* session                                                             */
/* ------------------------------------------------------------------ */

export function getSession() {
  return read(keys.session, null);
}

export function setSession(session) {
  return write(keys.session, session);
}

export function clearSession() {
  localStorage.removeItem(keys.session);
  localStorage.removeItem(keys.user);
}

/** The signed-in user's basic profile. Safe to call on public pages. */
export function getUser() {
  return read(keys.user, null);
}

export function setUser(user) {
  return write(keys.user, user);
}

/** Convenience predicates — all null-safe. */
export function isAuthenticated() {
  return Boolean(getSession()?.token);
}

export function getRole() {
  return getSession()?.user?.role ?? null;
}

export function isRole(...roles) {
  const role = getRole();
  return Boolean(role) && roles.includes(role);
}

export function isCustomer() {
  return isRole(ROLES.CUSTOMER);
}

export function isProvider() {
  return isRole(ROLES.PROVIDER);
}

export function isAdmin() {
  return isRole(ROLES.ADMIN);
}

export function getToken() {
  return getSession()?.token ?? null;
}

/* ------------------------------------------------------------------ */
/* preferences (cross-device-agnostic UI state)                        */
/* ------------------------------------------------------------------ */

const DEFAULT_PREFERENCES = {
  recentSearches: [],
  favouriteCategories: [],
  notificationsRead: false,
  reducedMotion: false,
};

export function getPreferences() {
  return { ...DEFAULT_PREFERENCES, ...read(keys.preferences, {}) };
}

export function setPreference(key, value) {
  const prefs = getPreferences();
  prefs[key] = value;
  write(keys.preferences, prefs);
  return prefs;
}

export function pushRecentSearch(term) {
  const trimmed = String(term ?? '').trim();
  if (trimmed.length < 2) return getPreferences().recentSearches;

  const prefs = getPreferences();
  const existing = prefs.recentSearches.filter((item) => item.toLowerCase() !== trimmed.toLowerCase());
  prefs.recentSearches = [trimmed, ...existing].slice(0, 6);
  write(keys.preferences, prefs);
  return prefs.recentSearches;
}

export function getRecentSearches() {
  return getPreferences().recentSearches;
}

export function clearRecentSearches() {
  return setPreference('recentSearches', []);
}

/* ------------------------------------------------------------------ */
/* request draft                                                       */
/* ------------------------------------------------------------------ */

/**
 * Preserves a half-finished service request across an accidental navigation
 * or a trip to the login page. Validated again on submit — never trusted.
 */
export function getRequestDraft() {
  return read(keys.requestDraft, null);
}

export function setRequestDraft(draft) {
  return write(keys.requestDraft, draft);
}

export function clearRequestDraft() {
  return write(keys.requestDraft, null);
}

/* ------------------------------------------------------------------ */
/* notifications                                                       */
/* ------------------------------------------------------------------ */

export function getSeenNotificationIds() {
  return read(keys.seenNotifications, []);
}

export function markNotificationsSeen(ids) {
  const merged = new Set([...getSeenNotificationIds(), ...ids]);
  return write(keys.seenNotifications, Array.from(merged).slice(-200));
}

/* ------------------------------------------------------------------ */
/* saved addresses                                                     */
/* ------------------------------------------------------------------ */

/**
 * Bookmarks for the places a user works or lives.
 *
 * Convenience only — the authoritative address lives on the user record, so
 * this cache is disposable and safe to clear at any time.
 */
export function getSavedAddresses() {
  const list = read(keys.addresses, []);
  return Array.isArray(list) ? list : [];
}

export function setSavedAddresses(addresses) {
  return write(keys.addresses, Array.isArray(addresses) ? addresses.slice(0, 10) : []);
}

export function addSavedAddress(address) {
  const list = getSavedAddresses();
  const key = `${address?.state}|${address?.city}|${address?.area}`.toLowerCase();

  // Re-adding an existing address just promotes it to the default.
  const withoutDuplicate = list.filter((item) => `${item?.state}|${item?.city}|${item?.area}`.toLowerCase() !== key);

  return setSavedAddresses([{ ...address, isDefault: true }, ...withoutDuplicate.map((item) => ({ ...item, isDefault: false }))]);
}

export function removeSavedAddress(index) {
  const list = getSavedAddresses();
  return setSavedAddresses(list.filter((_, position) => position !== index));
}

/* ------------------------------------------------------------------ */
/* misc                                                                */
/* ------------------------------------------------------------------ */

/** Read a value from a `data-*` attribute on <html> so pages can configure the API. */
export function getConfig(name, fallback = null) {
  const value = document.documentElement.dataset[name];
  return value === undefined ? fallback : value;
}

export function resetAll() {
  Object.values(keys).forEach((key) => localStorage.removeItem(key));
}