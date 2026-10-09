# API contract

## Base URL and conventions

- Base path: `/api/v1`
- Content type: JSON (`application/json`)
- Authentication: bearer JWT in `Authorization: Bearer <token>` for protected
  routes.
- Successful response envelope:

  ```json
  { "success": true, "data": {}, "error": null }
  ```

- Error response envelope:

  ```json
  {
    "success": false,
    "data": null,
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Validation failed",
      "details": []
    }
  }
  ```

The frontend API client unwraps `data` from a successful envelope. Validation
errors currently return HTTP 400. Error status and codes for domain errors
come from the backend error middleware.

## Implemented endpoints

### Health

| Method and path | Auth | Behavior |
|---|---|---|
| `GET /health` | No | Process health check at the server root. |
| `GET /api/v1/health` | No | Versioned API health check. |

### Authentication

| Method and path | Auth | Behavior |
|---|---|---|
| `POST /api/v1/auth/register` | No | Create a user and return `{ user, token }`. |
| `POST /api/v1/auth/login` | No | Validate email/password and return `{ user, token }`. |
| `POST /api/v1/auth/reset-password` | No | Current placeholder; does not issue or deliver a reset token. |

Register body:

```json
{
  "fullName": "Ada Example",
  "email": "ada@example.com",
  "password": "at-least-8-characters",
  "phone": "+2348000000000",
  "role": "customer",
  "state": "Lagos",
  "city": "Ikeja",
  "area": "Ikeja"
}
```

`role` accepts `customer`, `provider`, or `admin` in the current validator.
**This is unsafe for public deployment:** restrict administrator provisioning
to a controlled administrative process before enabling public registration.
The email must be valid and password at least 8 characters.

Login body:

```json
{ "email": "ada@example.com", "password": "at-least-8-characters" }
```

Reset body:

```json
{ "email": "ada@example.com" }
```

### Providers

All `/providers` routes currently require a valid bearer token because the
router applies authentication before the route handlers.

| Method and path | Role | Behavior |
|---|---|---|
| `POST /api/v1/providers/profile` | `PROVIDER` | Create or update the caller's provider profile. |
| `PUT /api/v1/providers/services` | `PROVIDER` | Replace the caller's service list. |
| `GET /api/v1/providers/search` | Any authenticated user | Search profiles by query parameters. |

Provider profile body fields: `businessName` (required, at least 2
characters), `fullName` (required, at least 2), `serviceCategory` (required,
at least 2), optional `bio` (minimum 20 when present), `categories` (string
array), `state`, `city`, `areas` (string array), `experienceYears` (integer,
minimum 0), `responseTime`, and `available` (boolean).

Provider services body:

```json
{
  "services": [
    {
      "name": "Pipe repair",
      "category": "Plumbing",
      "description": "Residential pipe repairs",
      "priceFrom": 5000,
      "priceTo": 25000,
      "isActive": true
    }
  ]
}
```

At least one service is required. `name` and `category` must be at least 2
characters; an optional description must be at least 10 characters; prices
must be non-negative.

Search query parameters currently recognized by the validator/service:
`serviceCategory`, `state`, `city`, and `q`. The search validator currently
allows additional query keys. Results include provider profile, user summary,
and services.

### Bookings

All booking routes require authentication.

| Method and path | Role | Behavior |
|---|---|---|
| `POST /api/v1/bookings` | `CUSTOMER` | Create a pending booking. |
| `PATCH /api/v1/bookings/:id/status` | `CUSTOMER` or `PROVIDER` | Change status if actor owns that side of the booking and transition is allowed. |

Create body:

```json
{
  "providerId": "provider-user-uuid",
  "serviceId": "service-uuid",
  "title": "Repair leaking kitchen sink",
  "description": "The pipe under the sink is leaking.",
  "location": "Ikeja, Lagos",
  "scheduledAt": "2026-10-10T10:00:00+01:00",
  "totalAmount": 12000
}
```

`providerId` and `serviceId` must be UUIDs; `title` and `location` are
required. `scheduledAt` must be an ISO datetime with offset. `totalAmount`, if
provided, must be non-negative.

Status body:

```json
{ "status": "ACCEPTED", "reason": "Optional cancellation reason" }
```

Allowed transitions in the current service:

```text
PENDING -> ACCEPTED | REJECTED | CANCELLED
ACCEPTED -> SCHEDULED | CANCELLED
SCHEDULED -> IN_PROGRESS | CANCELLED
IN_PROGRESS -> COMPLETED
```

`COMPLETED`, `REJECTED`, and `CANCELLED` are terminal. The backend checks that
customers and providers own the booking side they are modifying.

### Reviews

All review routes currently require authentication.

| Method and path | Role | Behavior |
|---|---|---|
| `POST /api/v1/reviews` | `CUSTOMER` | Submit a review for a completed booking owned by the caller. |
| `GET /api/v1/reviews/provider/:providerId` | Any authenticated user | List reviews for a provider. |

Create body:

```json
{
  "bookingId": "booking-uuid",
  "providerId": "provider-user-uuid",
  "rating": 5,
  "comment": "Arrived on time and completed the repair."
}
```

`bookingId` and `providerId` must be UUIDs; `rating` is an integer from 1 to 5.
The service verifies that the booking belongs to the caller, is completed, and
has not already been reviewed. It derives the actual provider from the booking
instead of trusting the submitted `providerId`, then updates the provider's
rating and review count.

## Not implemented by the API yet

The frontend mock client includes paths for categories, public provider
profiles/services/availability, customer request lists/details/cancellation,
messaging, notifications, user profile updates, provider availability, and
admin tools. These must not be treated as live API endpoints until routes,
validation, authorization, persistence, and tests are added.

Other current integration limitations:

- Provider search requires authentication, although marketplace discovery
  should generally be public.
- `/auth/logout` and `/auth/me` are not implemented.
- Reset-password currently only returns a placeholder success response.
- Public self-registration currently accepts `admin`; close this before
  deployment.

## Local testing

API origin defaults to `http://localhost:4000`; frontend requests use
`/api/v1`. Health checks can be tested with:

```sh
curl http://localhost:4000/health
curl http://localhost:4000/api/v1/health
```
