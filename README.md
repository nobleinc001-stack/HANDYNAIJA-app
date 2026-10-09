# HandyNaija

HandyNaija is a local-services marketplace MVP. The current application uses
plain HTML, CSS, and native browser modules in `frontend/`, an Express REST API
in `backend/`, and PostgreSQL through Prisma.

## Requirements

- Node.js 18 or later and npm
- PostgreSQL running locally (or a reachable PostgreSQL instance)

## Configure the database

1. Copy `backend/.env.example` to `backend/.env`.
2. Set `DATABASE_URL` to the PostgreSQL connection string for your database.
   Keep the real connection string in `.env`; do not commit it.
3. Set `JWT_SECRET` to a long, random secret.
4. From the project root, generate Prisma Client and apply the current schema:

   ```sh
   npm run db:generate
   npm run db:push
   ```

The schema is maintained in `backend/prisma/schema.prisma`. See
`database/README.md` for database setup and maintenance notes.

## Run locally

Start the API and frontend in separate terminals from the project root:

```sh
npm run api:dev
npm start
```

The API is available at `http://localhost:4000/api/v1`; its health check is
`http://localhost:4000/health`. The server verifies its PostgreSQL connection
before it begins listening. The frontend is available at
`http://localhost:4173/` and redirects to the app.

The frontend talks to `http://localhost:4000` by default. To use a different
API origin, set `data-api-base` on the document's `<html>` element or pass
`?apiBase=https://your-api-host` in the URL. The existing mock adapter remains
available for prototype screens whose API endpoints have not been implemented.

## Project map

- `frontend/` — marketplace pages, styles, and browser modules
- `backend/src/` — Express application, route handlers, validation, and services
- `backend/prisma/` — PostgreSQL schema
- `database/` — database operations and schema ownership notes
- `docs/` — project documentation index and API reference
- `tests/` — automated API tests
- `uploads/` — local development upload storage (ignored by Git)
- `deployment/` — environment and release guidance
- `frontend/shared/` — browser-safe constants and validation used by frontend modules

Product scope, technical contracts, and team workflow are documented in
[`docs/README.md`](docs/README.md).

The supplied product, architecture, requirements, user-story, and UX documents
remain at the project root as the source references for this MVP.
