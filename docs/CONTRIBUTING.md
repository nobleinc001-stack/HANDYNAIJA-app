# Contributing

## Before making a change

1. Read the root [README](../README.md), relevant product scope, and the
   [API contract](./API_CONTRACT.md).
2. Check whether the feature is implemented, planned, or explicitly deferred.
3. Keep changes focused and update the related documentation when behavior or
   contracts change.

## Local setup

- Use Node.js 18+ and npm.
- Configure a local `backend/.env` from `backend/.env.example`.
- Generate Prisma Client and apply the development schema:

  ```sh
  npm run db:generate
  npm run db:push
  ```

- Run the API and frontend in separate terminals:

  ```sh
  npm run api:dev
  npm start
  ```

Never commit `.env` files, database credentials, JWT secrets, personal data,
or production exports.

## Branches and changes

- Start from the current shared development branch.
- Use short descriptive branches, for example `feature/provider-search`,
  `fix/booking-transition`, or `docs/mvp-scope`.
- Keep each change small enough to review; do not mix unrelated refactors into
  a feature.
- Prefer clear commit messages in the imperative mood, such as
  `Add provider search filters`.
- Do not include generated dependencies or local upload files in commits.

## Engineering expectations

- Preserve existing module boundaries and native ES module conventions.
- Validate all request input at the API boundary.
- Enforce authentication, role, and resource ownership on the server.
- Use Prisma schema changes as the source of truth for database structure.
- Return the established JSON response envelope and useful error codes.
- Avoid silent fallbacks for real API errors; mock behavior must remain
  development-only.
- Never return password hashes or log secrets, authorization headers, or
  sensitive user details.
- Add or update automated tests for new behavior, especially authorization,
  validation, and booking status transitions.

## Checks before review

Run checks relevant to the change. The current backend test suite is:

```sh
npm test --prefix backend
```

For database changes, also run:

```sh
npm run db:generate
npm run db:push
```

Do not run a destructive database operation against shared or production data.
If a check cannot run, report the exact blocker in the pull request.

## Pull request checklist

- [ ] The change solves one clearly described problem.
- [ ] Existing behavior and affected user roles were checked.
- [ ] Tests cover new or changed behavior.
- [ ] Relevant docs and API contract are updated.
- [ ] No secrets, `.env` files, or generated dependency files are included.
- [ ] Database changes include a safe rollout/migration plan.
- [ ] Known limitations and deployment configuration are stated.
