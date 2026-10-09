# Roadmap

This is a milestone-based plan, not a dated commitment. Sequence and estimates
should be revisited after the team confirms owners, capacity, and launch
criteria.

## Milestone 1 — Foundations and data

- Confirm MVP acceptance criteria and user roles.
- Keep local environment setup repeatable.
- Finalize PostgreSQL schema and adopt reviewed Prisma migrations.
- Add automated checks for schema generation, API behavior, and critical
  validation rules.

**Exit criteria:** A new developer can configure the project, apply the
development schema, run the API/frontend, and run the tests.

## Milestone 2 — Account and provider onboarding

- Complete customer/provider registration and login.
- Implement secure admin provisioning (no public admin self-registration).
- Complete provider profiles and service management.
- Add profile ownership and role authorization tests.

**Exit criteria:** Customer and provider accounts can be created and managed
without mock-only state.

## Milestone 3 — Marketplace discovery

- Implement public category and provider discovery endpoints.
- Add location, category, availability, and rating filters as supported by
  persisted data.
- Wire search results and provider profiles to real API responses.

**Exit criteria:** A visitor can search and compare real providers, with
appropriate privacy boundaries.

## Milestone 4 — Requests and booking lifecycle

- Complete request creation, customer/provider lists, details, cancellation,
  and status transitions.
- Validate schedule and ownership rules.
- Wire customer and provider request screens.

**Exit criteria:** A request can be accepted or declined, progressed through
work, completed, and presented consistently to both participants.

## Milestone 5 — Communication and trust

- Implement request-scoped messaging and durable conversation history.
- Enforce review eligibility, one-review policy, and 1–5 rating limits.
- Add notification delivery and provider verification workflow as product
  policy is finalized.

**Exit criteria:** Parties can coordinate a request and eligible customers can
leave trustworthy feedback.

## Milestone 6 — Administration and release readiness

- Implement category/account/provider/report moderation.
- Restrict CORS, add rate limiting, configure production secrets, HTTPS,
  backups, logging, and monitoring.
- Deploy to staging and test critical journeys against the production-like
  stack.
- Run accessibility, security, and end-to-end acceptance checks.

**Exit criteria:** Release gates in [MVP scope](./MVP_SCOPE.md) are met and
operational owners are identified.

## Deferred opportunities

Payments, escrow, commissions, maps/radius matching, rich media chat, native
apps, and advanced recommendations should be considered only after usage
evidence and explicit product approval.
