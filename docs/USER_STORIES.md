# User stories

Stories below summarize the supplied product and MVP briefs. They describe
desired product behavior; they are not a claim that every story is already
implemented. Current backend support is marked in the [API contract](./API_CONTRACT.md).

## Customer

- **C01 — Account:** As a customer, I want to register, sign in, sign out, and
  recover access so that I can use the marketplace securely.
- **C02 — Profile:** As a customer, I want to maintain my contact and location
  details so that service requests contain useful information.
- **C03 — Discover:** As a customer, I want to browse categories and search
  providers by service, name, and location so that I can find relevant
  professionals.
- **C04 — Compare:** As a customer, I want to filter and compare providers by
  location, service, availability, and rating so that I can make an informed
  choice.
- **C05 — Assess provider:** As a customer, I want to view a provider's
  services, experience, coverage area, availability, verification state, and
  reviews so that I understand who may do the work.
- **C06 — Request service:** As a customer, I want to select a service and
  submit a job description, location, and preferred time so that the provider
  can evaluate my request.
- **C07 — Track/cancel:** As a customer, I want to see request progress and
  cancel before work begins when allowed so that I know what is happening.
- **C08 — Communicate:** As a customer, I want to exchange messages with the
  provider in the context of a request so that job details stay together.
- **C09 — Review:** As a customer, I want to rate and review a completed job
  so that I can share my experience with future customers.
- **C10 — Report:** As a customer, I want to report inappropriate activity so
  that the marketplace can investigate it.

## Service provider

- **P01 — Join:** As a provider, I want to register and create a professional
  profile so customers can discover me.
- **P02 — Describe services:** As a provider, I want to list and maintain my
  services, experience, and service areas so that customers understand what I
  offer and where I work.
- **P03 — Availability:** As a provider, I want to maintain working days,
  hours, and unavailable periods so that customers can request suitable times.
- **P04 — Manage requests:** As a provider, I want to review request details,
  accept or reject a request, and manage its status so that I can organize my
  work.
- **P05 — Coordinate:** As a provider, I want to message a customer associated
  with a request so that we can clarify the job.
- **P06 — Reputation:** As a provider, I want to see my reviews and overall
  rating so that I can understand customer feedback.

## Administrator

- **A01 — Monitor:** As an administrator, I want a dashboard of marketplace
  activity so that I can monitor service quality and operations.
- **A02 — Manage accounts:** As an administrator, I want to find, activate,
  suspend, and verify accounts under defined policy so that marketplace
  integrity can be maintained.
- **A03 — Manage categories:** As an administrator, I want to maintain service
  categories so that customers can find consistent listings.
- **A04 — Moderate:** As an administrator, I want to inspect reports and
  moderate listings or reviews so that harmful or fraudulent activity can be
  addressed.

## MVP acceptance themes

- Validate required fields and show actionable errors.
- Enforce account role and ownership on the server for protected actions.
- Persist marketplace records in PostgreSQL rather than trusting browser-only
  state.
- Allow only valid request-status transitions.
- Do not allow a review to be treated as verified feedback for an incomplete
  service.
- Make unsupported or unavailable functionality explicit to the user.
