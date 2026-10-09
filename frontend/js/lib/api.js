/**
 * API client.
 *
 * Thin wrapper over `fetch` for the REST API described in the Technical
 * Architecture document (base path `/api/v1`).
 *
 * Two behaviours worth knowing about:
 *
 *  1. Errors are normalised. Every failure — HTTP error, network error,
 *     timeout, malformed body — becomes an `ApiError` carrying a machine
 *     readable `code` plus a message that is safe to show a user. Feature code
 *     never has to inspect a raw Response.
 *
 *  2. Mock fallback. While the backend does not exist yet, the client falls
 *     back to `mock-data.js` and routes those requests through the mock
 *     adapter, which speaks the same paths and response shapes. Set
 *     `data-api-mock="false"` on <html> (or add `?mock=0` to the URL) to turn
 *     this off and talk to a real API only.
 */

import { API_BASE, ACCOUNT_STATUS, ALLOWED_TRANSITIONS, REQUEST_STATUS_LABELS } from '../../shared/constants.js';
import * as mock from './mock-data.js';
import * as store from './store.js';

const DEFAULT_TIMEOUT = 12_000;

/* ------------------------------------------------------------------ */
/* configuration                                                       */
/* ------------------------------------------------------------------ */

function readConfig() {
  const data = document.documentElement.dataset;
  const params = new URLSearchParams(window.location.search);

  const baseUrl = data.apiBase || params.get('apiBase') || 'http://localhost:4000';
  const mockParam = params.get('mock');

  return {
    baseUrl: baseUrl.replace(/\/$/, ''),
    mockEnabled: mockParam === null ? data.apiMock !== 'false' : mockParam !== '0',
    timeout: Number(data.apiTimeout) || DEFAULT_TIMEOUT,
  };
}

export const config = readConfig();

/** Set once the first real request succeeds, so we stop warning. */
let usingMock = config.mockEnabled;
export const isUsingMock = () => usingMock;

/* ------------------------------------------------------------------ */
/* ApiError                                                            */
/* ------------------------------------------------------------------ */

export class ApiError extends Error {
  constructor({ code, message, status = 0, details = null, field = null }) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
    this.field = field;
  }

  /** Message safe to render inside a form field or toast. */
  get userMessage() {
    return this.message || 'Something went wrong. Please try again.';
  }

  get isAuthError() {
    return this.status === 401 || this.status === 403;
  }

  get isValidationError() {
    return this.status === 422 || this.code === 'VALIDATION_ERROR';
  }

  get isNetworkError() {
    return this.code === 'NETWORK_ERROR';
  }
}

/* ------------------------------------------------------------------ */
/* low-level request                                                   */
/* ------------------------------------------------------------------ */

function buildUrl(path, query) {
  const url = new URL(`${config.baseUrl}${API_BASE}${path}`, window.location.origin);

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) value.forEach((item) => url.searchParams.append(key, item));
    else url.searchParams.set(key, value);
  }

  return url;
}

async function request(method, path, { body, query, auth = true, signal, timeout = config.timeout } = {}) {
  const url = buildUrl(path, query);
  const controller = new AbortController();
  const timer = timeout ? setTimeout(() => controller.abort(new DOMException('Timeout', 'TimeoutError')), timeout) : null;

  // Chain the caller's signal so component teardown cancels the request.
  const onExternalAbort = () => controller.abort(signal.reason);
  if (signal) {
    if (signal.aborted) controller.abort(signal.reason);
    else signal.addEventListener('abort', onExternalAbort, { once: true });
  }

  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  if (auth) {
    const token = store.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
      credentials: 'same-origin',
    });

    return await parseResponse(response);
  } catch (error) {
    throw toApiError(error);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onExternalAbort);
  }
}

async function parseResponse(response) {
  const contentType = response.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? await response.json().catch(() => null) : await response.text().catch(() => null);

  if (!response.ok) {
    throw new ApiError({
      status: response.status,
      code: payload?.error?.code ?? payload?.code ?? httpCodeName(response.status),
      // Prefer the user-safe message the API sends back.
      message: payload?.error?.message ?? payload?.message ?? defaultMessage(response.status),
      details: payload?.error?.details ?? payload?.details ?? null,
      field: payload?.error?.field ?? payload?.field ?? null,
    });
  }

  return payload?.success === true && Object.hasOwn(payload, 'data') ? payload.data : payload;
}

function toApiError(error) {
  if (error instanceof ApiError) return error;

  if (error?.name === 'AbortError') {
    return new ApiError({ code: 'TIMEOUT', message: 'That took too long. Check your connection and try again.' });
  }
  if (error?.name === 'TimeoutError') {
    return new ApiError({ code: 'TIMEOUT', message: 'The server took too long to respond. Please try again.' });
  }

  return new ApiError({
    code: 'NETWORK_ERROR',
    message: 'Could not reach the server. Check your connection and try again.',
  });
}

function httpCodeName(status) {
  const map = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORISED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    422: 'VALIDATION_ERROR',
    429: 'RATE_LIMITED',
  };
  return map[status] ?? 'UNKNOWN_ERROR';
}

function defaultMessage(status) {
  const map = {
    400: 'Some of the details you entered are not correct.',
    401: 'Your session has expired. Please sign in again.',
    403: 'You do not have permission to do that.',
    404: 'We could not find what you were looking for.',
    409: 'That action conflicts with the current state.',
    422: 'Please check the highlighted fields.',
    429: 'Too many attempts. Please wait a moment and try again.',
  };
  return map[status] ?? 'Something went wrong. Please try again.';
}

/* ------------------------------------------------------------------ */
/* public client                                                       */
/* ------------------------------------------------------------------ */

// Routed through `call()` so the mock fallback also applies to the named
// client below, not just the feature modules.
const get = (path, options) => call('GET', path, options);
const post = (path, body, options) => call('POST', path, { ...options, body });
const patch = (path, body, options) => call('PATCH', path, { ...options, body });
const put = (path, body, options) => call('PUT', path, { ...options, body });
const del = (path, options) => call('DELETE', path, options);

export const api = {
  /* Auth — section 9.2 of the Technical Architecture document */
  auth: {
    register: (payload) => post('/auth/register', payload, { auth: false }),
    login: (payload) => post('/auth/login', payload, { auth: false }),
    logout: () => post('/auth/logout'),
    me: () => get('/auth/me'),
    forgotPassword: (payload) => post('/auth/forgot-password', payload, { auth: false }),
    resetPassword: (payload) => post('/auth/reset-password', payload, { auth: false }),
  },

  /* Marketplace discovery */
  categories: () => get('/categories', { auth: false }),
  providers: (query, options) => get('/providers', { ...options, query, auth: false }),
  provider: (id, options) => get(`/providers/${id}`, { ...options, auth: false }),
  providerServices: (id, options) => get(`/providers/${id}/services`, { ...options, auth: false }),
  providerAvailability: (id, options) => get(`/providers/${id}/availability`, { ...options, auth: false }),
  providerReviews: (id, query, options) => get(`/providers/${id}/reviews`, { ...options, query, auth: false }),
  reviews: (query, options) => get('/reviews', { ...options, query, auth: false }),

  /* Customer requests */
  requests: (query, options) => get('/requests', { ...options, query }),
  request: (id, options) => get(`/requests/${id}`, options),
  createRequest: (payload) => post('/requests', payload),
  cancelRequest: (id, payload) => patch(`/requests/${id}/cancel`, payload ?? {}),
  submitReview: (requestId, payload) => post(`/requests/${requestId}/review`, payload),

  /* Messaging */
  conversations: (query, options) => get('/conversations', { ...options, query }),
  conversation: (id, options) => get(`/conversations/${id}`, options),
  requestMessages: (requestId, query, options) => get(`/requests/${requestId}/messages`, { ...options, query }),
  sendMessage: (requestId, payload) => post(`/requests/${requestId}/messages`, payload),

  /* Provider */
  me: () => get('/provider/me'),
  providerRequests: (query, options) => get('/provider/requests', { ...options, query }),
  acceptRequest: (id, payload) => patch(`/provider/requests/${id}/accept`, payload ?? {}),
  rejectRequest: (id, payload) => patch(`/provider/requests/${id}/reject`, payload ?? {}),
  updateRequestStatus: (id, payload) => patch(`/provider/requests/${id}/status`, payload),
  updateProviderProfile: (payload) => put('/provider/profile', payload),
  createProviderService: (payload) => post('/provider/services', payload),
  updateProviderService: (id, payload) => patch(`/provider/services/${id}`, payload),
  deleteProviderService: (id) => del(`/provider/services/${id}`),
  updateAvailability: (payload) => put('/provider/availability', payload),

  /* Profile & notifications */
  updateProfile: (payload) => put('/users/me', payload),
  notifications: (query, options) => get('/notifications', { ...options, query }),
  markNotificationsRead: (payload) => patch('/notifications/read', payload ?? {}),

  /* Admin */
  admin: {
    dashboard: (options) => get('/admin/dashboard', options),
    users: (query, options) => get('/admin/users', { ...options, query }),
    setUserStatus: (id, payload) => patch(`/admin/users/${id}/status`, payload),
    providers: (query, options) => get('/admin/providers', { ...options, query }),
    setProviderVerification: (id, payload) => patch(`/admin/providers/${id}/verification`, payload),
    requests: (query, options) => get('/admin/requests', { ...options, query }),
    reviews: (query, options) => get('/admin/reviews', { ...options, query }),
    moderateReview: (id, payload) => patch(`/admin/reviews/${id}/moderation`, payload),
    reports: (query, options) => get('/admin/reports', { ...options, query }),
    resolveReport: (id, payload) => patch(`/admin/reports/${id}/status`, payload),
    createCategory: (payload) => post('/admin/categories', payload),
    updateCategory: (id, payload) => patch(`/admin/categories/${id}`, payload),
  },
};

/* ------------------------------------------------------------------ */
/* mock adapter                                                        */
/* ------------------------------------------------------------------ */

/**
 * Matches the real paths so feature code does not change when the backend
 * lands. Everything is async and returns the same envelope the API uses.
 */
const mockRoutes = [
  [
    'POST',
    /^\/auth\/register$/,
    (params, query, body) => {
      // Echo the chosen role so the demo lands the user in the right
      // experience instead of always in the customer one.
      const wantsProvider = body?.role === 'provider';
      const user = wantsProvider
        ? { ...mock.demoProviderUser, fullName: body?.fullName ?? mock.demoProviderUser.fullName, email: body?.email ?? mock.demoProviderUser.email, phone: body?.phone ?? mock.demoProviderUser.phone }
        : { ...mock.demoUser, fullName: body?.fullName ?? mock.demoUser.fullName, email: body?.email ?? mock.demoUser.email, phone: body?.phone ?? mock.demoUser.phone };

      return { user, token: wantsProvider ? 'mock-token-provider' : 'mock-token-customer' };
    },
  ],
  [
    'POST',
    /^\/auth\/login$/,
    (body) => {
      const known = Object.values(mock.demoCredentials).some((item) => item.email === body?.email);
      if (!known) {
        throw new ApiError({
          status: 401,
          code: 'INVALID_CREDENTIALS',
          message: 'We could not match that email and password. Check them and try again.',
        });
      }

      if (body.email === mock.demoCredentials.provider.email) {
        return { user: mock.demoProviderUser, token: 'mock-token-provider' };
      }
      if (body.email === mock.demoCredentials.admin.email) {
        return {
          user: { ...mock.demoUser, role: 'admin', fullName: 'Platform Administrator' },
          token: 'mock-token-admin',
        };
      }
      return { user: mock.demoUser, token: 'mock-token-customer' };
    },
  ],
  ['POST', /^\/auth\/logout$/, () => ({ message: 'Signed out.' })],
  ['GET', /^\/auth\/me$/, () => ({ user: store.getUser() ?? mock.demoUser })],

  ['GET', /^\/categories$/, () => ({ categories: mock.categories, groups: mock.categories.length })],
  ['GET', /^\/providers$/, (_body, query) => ({ providers: filterProviders(query), total: filterProviders(query).length })],
  ['GET', /^\/providers\/([^/]+)\/services$/, (params) => ({
    services: mock.providers.find((item) => item.id === params[0])?.services ?? [],
  })],
  ['GET', /^\/providers\/([^/]+)\/availability$/, (params) => ({
    availability: mock.providers.find((item) => item.id === params[0])?.availability ?? [],
  })],
  ['GET', /^\/providers\/([^/]+)\/reviews$/, (params) => {
    const list = mock.reviews.filter((item) => item.providerId === params[0]);
    return { reviews: list, averageRating: average(list) };
  }],
  ['GET', /^\/providers\/([^/]+)$/, (params) => {
    const provider = mock.providers.find((item) => item.id === params[0]);
    if (!provider) throw new ApiError({ status: 404, code: 'NOT_FOUND', message: 'That provider no longer exists.' });
    const list = mock.reviews.filter((item) => item.providerId === provider.id);
    return { provider: { ...provider, reviews: list, rating: average(list) || provider.rating } };
  }],

  ['GET', /^\/reviews$/, (_params, query) => {
    const providerId = query?.providerId;
    const list = providerId ? mock.reviews.filter((item) => item.providerId === providerId) : [...mock.reviews];
    if (query?.minRating) list = list.filter((item) => item.rating >= Number(query.minRating));
    return { reviews: list, averageRating: average(list), total: list.length };
  }],
  ['GET', /^\/requests$/, () => ({ requests: mock.serviceRequests, total: mock.serviceRequests.length })],
  [
    'POST',
    /^\/requests$/,
    (body) => {
      // Push it into the store so the customer's list and the confirmation
      // screen agree with what the form just did.
      const created = {
        id: `REQ-${String(135 + mock.serviceRequests.length).padStart(5, '0')}`,
        customerId: store.getUser()?.id ?? mock.demoUser.id,
        customerName: store.getUser()?.fullName ?? mock.demoUser.fullName,
        providerId: body?.provider_id,
        providerName: mock.providers.find((item) => item.id === body?.provider_id)?.businessName ?? 'Provider',
        serviceName: mock.providers
          .find((item) => item.id === body?.provider_id)
          ?.services.find((service) => service.id === body?.service_id)?.name,
        description: body?.description ?? '',
        state: body?.state ?? '',
        city: body?.city ?? '',
        area: body?.area ?? '',
        preferredDate: body?.preferred_date ?? '',
        preferredTime: body?.preferred_time ?? '',
        notes: body?.notes ?? '',
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mock.serviceRequests.unshift(created);
      return created;
    },
  ],
  ['GET', /^\/requests\/([^/]+)$/, (params) => {
    const request = mock.serviceRequests.find((item) => item.id === params[0]);
    if (!request) throw new ApiError({ status: 404, code: 'NOT_FOUND', message: 'That request could not be found.' });
    return { request };
  }],
  ['PATCH', /^\/requests\/([^/]+)\/cancel$/, (params) => ({ request: transition(params[0], 'CANCELLED') })],
  ['GET', /^\/requests\/([^/]+)\/messages$/, (params) => {
    const conversation = mock.conversations.find((item) => item.requestId === params[0]);
    return { messages: conversation?.messages ?? [], conversationId: conversation?.id ?? null };
  }],
  ['POST', /^\/requests\/([^/]+)\/messages$/, (params, query, body) => {
    const conversation = mock.conversations.find((item) => item.requestId === params[0]);
    const message = {
      id: `MSG-${Date.now().toString().slice(-6)}`,
      senderId: mock.demoUser.id,
      senderName: mock.demoUser.fullName,
      senderRole: 'customer',
      body: body?.body ?? '',
      createdAt: new Date().toISOString(),
      readAt: null,
    };
    if (conversation) conversation.messages.push(message);
    return { message };
  }],
  ['POST', /^\/requests\/([^/]+)\/review$/, (params, query, body) => ({ review: { id: `REV-${Date.now().toString().slice(-6)}`, requestId: params[0], ...body } })],

  ['GET', /^\/conversations$/, () => ({ conversations: mock.conversations })],
  ['GET', /^\/conversations\/([^/]+)$/, (params) => {
    const conversation = mock.conversations.find((item) => item.id === params[0]);
    if (!conversation) throw new ApiError({ status: 404, code: 'NOT_FOUND', message: 'That conversation could not be found.' });
    return { conversation };
  }],

  ['GET', /^\/provider\/me$/, () => ({ provider: currentProvider() })],
  ['GET', /^\/provider\/requests$/, () => {
    const providerId = currentProvider().id;
    return { requests: mock.serviceRequests.filter((item) => item.providerId === providerId) };
  }],
  ['PATCH', /^\/provider\/requests\/([^/]+)\/accept$/, (params) => ({ request: transition(params[0], 'ACCEPTED') })],
  [
    'PATCH',
    /^\/provider\/requests\/([^/]+)\/reject$/,
    (params, query, body) => {
      const request = transition(params[0], 'REJECTED');
      request.rejectionReason = body?.reason ?? '';
      return { request };
    },
  ],
  ['PATCH', /^\/provider\/requests\/([^/]+)\/status$/, (params, query, body) => ({ request: transition(params[0], body?.status) })],
  ['PUT', /^\/provider\/profile$/, (_params, _query, body) => {
    // Mutate the stored provider rather than returning a merged copy, so a
    // saved profile (photo, NIN, business name) still shows up when the public
    // profile is opened next. A copy looked correct on the edit screen and
    // then silently reverted everywhere else.
    const provider = currentProvider();
    Object.assign(provider, body ?? {});
    return { provider };
  }],
  ['POST', /^\/provider\/services$/, (_params, _query, body) => ({ service: { id: `SVC-${Date.now().toString().slice(-4)}`, ...body } })],
  ['PATCH', /^\/provider\/services\/([^/]+)$/, (params, _query, body) => ({ service: { ...body, id: params[0] } })],
  ['DELETE', /^\/provider\/services\/([^/]+)$/, () => ({ message: 'Service removed.' })],
  ['PUT', /^\/provider\/availability$/, (_params, _query, body) => ({ availability: body?.days ?? [] })],

  ['PUT', /^\/users\/me$/, (_params, _query, body) => ({ user: { ...(store.getUser() ?? mock.demoUser), ...body } })],
  ['GET', /^\/notifications$/, () => ({ notifications: mock.notifications })],
  ['PATCH', /^\/notifications\/read$/, () => ({ message: 'Notifications marked as read.' })],

  ['GET', /^\/admin\/dashboard$/, () => ({
    stats: mock.adminStats,
    activity: mock.activityFeed,
  })],
  ['GET', /^\/admin\/users$/, () => ({ users: mock.customers })],
  ['PATCH', /^\/admin\/users\/([^/]+)\/status$/, (params, _query, body) => ({ user: { ...mock.customers[0], id: params[0], status: body?.status } })],
  ['GET', /^\/admin\/providers$/, () => ({ providers: mock.providers })],
  ['PATCH', /^\/admin\/providers\/([^/]+)\/verification$/, (params, _query, body) => {
    const target = mock.providers.find((item) => item.id === params[0]) ?? mock.providers[0];
    return { provider: { ...target, ...(body ?? {}) } };
  }],
  ['PATCH', /^\/admin\/providers\/([^/]+)\/status$/, (params, _query, body) => {
    const target = mock.providers.find((item) => item.id === params[0]) ?? mock.providers[0];
    return { provider: { ...target, status: body?.status ?? ACCOUNT_STATUS.ACTIVE } };
  }],
  ['GET', /^\/admin\/requests$/, () => ({ requests: mock.serviceRequests })],
  ['GET', /^\/admin\/reviews$/, () => ({ reviews: mock.reviews })],
  ['PATCH', /^\/admin\/reviews\/([^/]+)\/moderation$/, (params, _query, body) => ({ review: { id: params[0], ...body } })],
  ['GET', /^\/admin\/reports$/, () => ({ reports: mock.reports })],
  ['PATCH', /^\/admin\/reports\/([^/]+)\/status$/, (params, _query, body) => ({ report: { id: params[0], status: body?.status } })],
  ['POST', /^\/admin\/categories$/, (_params, _query, body) => ({ category: { id: body?.name?.toLowerCase(), ...body } })],
  ['PATCH', /^\/admin\/categories\/([^/]+)$/, (params, _query, body) => ({ category: { id: params[0], ...body } })],
];

/**
 * Resolves the provider record belonging to whoever is signed in.
 *
 * A session stores a user id (`USR-*`) while provider records are keyed
 * `PRV-*`, so provider-scoped routes have to translate between the two.
 */
function currentProvider() {
  const userId = store.getUser()?.id;
  return mock.providers.find((item) => item.userId === userId) ?? mock.providers[0];
}

/**
 * Applies a status change in place, enforcing the same transition table the UI
 * uses. The mock has to be as strict as the real API, otherwise the frontend
 * ends up "passing" against demo data and failing in production.
 */
function transition(id, status) {
  const request = findRequest(id);

  if (!ALLOWED_TRANSITIONS[request.status]?.includes(status)) {
    throw new ApiError({
      status: 409,
      code: 'INVALID_TRANSITION',
      message: `A request that is ${REQUEST_STATUS_LABELS[request.status]?.toLowerCase() ?? request.status} cannot become ${REQUEST_STATUS_LABELS[status]?.toLowerCase() ?? status}.`,
    });
  }

  request.status = status;
  request.updatedAt = new Date().toISOString();
  return request;
}

function findRequest(id) {
  const request = mock.serviceRequests.find((item) => item.id === id);
  if (!request) throw new ApiError({ status: 404, code: 'NOT_FOUND', message: 'That request could not be found.' });
  return request;
}

function average(list) {
  if (!list.length) return null;
  return Number((list.reduce((sum, item) => sum + item.rating, 0) / list.length).toFixed(1));
}

function filterProviders(query = {}) {
  const term = String(query.q ?? '').toLowerCase().trim();
  let list = [...mock.providers];

  if (term) {
    list = list.filter((provider) =>
      [
        provider.businessName,
        provider.fullName,
        provider.serviceCategory,
        ...provider.categories,
        provider.bio,
        ...provider.services.map((service) => service.name),
      ]
        .join(' ')
        .toLowerCase()
        .includes(term)
    );
  }

  if (query.category) list = list.filter((provider) => provider.categories.includes(query.category));
  if (query.state) list = list.filter((provider) => provider.state === query.state);
  if (query.city) list = list.filter((provider) => provider.city === query.city);
  if (query.area) list = list.filter((provider) => provider.areas.includes(query.area));
  if (query.minRating) list = list.filter((provider) => provider.rating >= Number(query.minRating));
  if (query.available === true || query.available === 'true') list = list.filter((provider) => provider.available);

  const sort = query.sort ?? 'rating';
  list.sort((a, b) => {
    if (sort === 'experience') return b.experienceYears - a.experienceYears;
    if (sort === 'reviews') return b.reviewCount - a.reviewCount;
    return b.rating - a.rating;
  });

  return list;
}

function runMock(method, path, body, query) {
  for (const [routeMethod, pattern, handler] of mockRoutes) {
    if (routeMethod !== method) continue;
    const match = pattern.exec(path);
    if (match) {
      // Simulate latency so loading states are actually visible in the demo.
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          try {
            resolve(handler(match.slice(1), query, body));
          } catch (error) {
            reject(error instanceof ApiError ? error : toApiError(error));
          }
        }, 220 + (path.length % 5) * 60);
      });
    }
  }

  return Promise.reject(
    new ApiError({ status: 501, code: 'NOT_IMPLEMENTED', message: 'The mock adapter has no handler for this request yet.' })
  );
}

/* ------------------------------------------------------------------ */
/* single entry point used by feature modules                          */
/* ------------------------------------------------------------------ */

/**
 * Sends a request to the API, falling back to the mock adapter when the
 * backend is unreachable and mock mode is enabled.
 */
export async function call(method, path, options = {}) {
  try {
    const result = await request(method, path, options);
    usingMock = false;
    return result;
  } catch (error) {
    const apiError = error instanceof ApiError ? error : toApiError(error);
    // A plain dev server answers unknown API routes with 404/405/501, which
    // means "no backend yet" rather than a real failure worth surfacing.
    const backendMissing =
      apiError.isNetworkError ||
      apiError.code === 'TIMEOUT' ||
      apiError.status === 404 ||
      apiError.status === 405 ||
      apiError.status === 501;
    const publicRouteRequiresAuthentication =
      method === 'GET' &&
      options.auth === false &&
      apiError.status === 401;

    const canFallback = config.mockEnabled && (backendMissing || publicRouteRequiresAuthentication);

    if (!canFallback) {
      if (apiError.isAuthError && apiError.status === 401 && !options.skipAuthRedirect) {
        store.clearSession();
      }
      throw apiError;
    }

    if (usingMock === false) {
      console.info('[api] Backend unreachable — using demo data. Set data-api-mock="false" to disable.');
    }
    usingMock = true;
    return runMock(method, path, options.body, options.query);
  }
}

export const http = { get, post, patch, put, del };