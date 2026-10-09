# MVP scope

## Objective

Deliver a usable first marketplace release that supports the core loop:
customer discovery → provider comparison → service request → provider response
→ completion → customer feedback.

## Included in the product definition

- Customer and provider accounts with role-aware access.
- Provider profile, service catalogue, and location/service-area information.
- Search and basic filtering by service and location.
- Service request submission, provider response, and status tracking.
- Simple text communication associated with a request.
- Customer rating and written feedback for completed work.
- Basic administrator operations for accounts, providers, categories, and
  reports.
- Responsive web experience and clear validation/error states.

## Implemented in the current codebase

- Static HTML/CSS/native-module frontend with customer, provider, and admin
  screens.
- Express API with registration, login, reset-password placeholder, provider
  profile and service updates, provider search, booking creation/status
  updates, and provider-review operations.
- PostgreSQL persistence through Prisma for users, provider profiles,
  services, bookings, and reviews.
- JWT-based bearer-token authentication and role middleware.
- API health endpoints and backend health tests.
- Mock frontend adapter for prototype screens where the corresponding API
  behavior is not yet available.

See [API contract](./API_CONTRACT.md) for exact paths and important
implementation limitations.

## Not yet complete; do not present as production-ready

- Frontend-to-API wiring for every existing page and full parity between
  frontend mock routes and backend routes.
- Persistent messaging, conversations, notifications, and provider
  availability schedules.
- Admin management/reporting API and an admin account provisioning workflow.
- Robust password recovery delivery and token-based reset.
- Review policy enforcement for completed bookings and duplicate reviews.
- File uploads and durable object storage.
- Production CORS allowlist, rate limits, operational logging, and monitoring.
- Formal production migration rollout and deployment automation.

## Deferred unless explicitly approved

- In-platform payments, escrow, commissions, and refunds.
- Real-time chat, voice, or file exchange.
- Map/radius-based search and automated provider matching.
- Automated identity/background verification.
- Native mobile applications.
- Advanced analytics and recommendation models.

## Release gates

Before exposing the MVP publicly:

1. Close the security and integration gaps listed above, especially admin
   account provisioning and provider visibility.
2. Test customer, provider, and administrator journeys end-to-end against
   PostgreSQL.
3. Verify that authorization and booking ownership are enforced server-side.
4. Use HTTPS, production secrets, restricted CORS, backups, and monitoring.
5. Confirm public pages use the real API and cannot silently rely on mock data.
