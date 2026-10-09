# Architecture

## System shape

HandyNaija is currently a modular monolith:

```text
Browser
  └── Static frontend (HTML, CSS, native ES modules)
        └── REST/JSON over HTTP
              └── Express API (Node.js, ES modules)
                    └── Prisma ORM
                          └── PostgreSQL
```

The frontend and backend are separate deployable processes. The backend owns
business rules, authentication, authorization, and persistence. The browser
must not connect directly to PostgreSQL.

## Technology

- Frontend: semantic HTML, CSS, browser-native JavaScript modules.
- Backend: Node.js 18+, Express, Zod validation, bcryptjs, JWT, and Prisma.
- Database: PostgreSQL.
- Local frontend server: `serve.mjs` serves the repository for development.
- Tests: Node's built-in test runner for backend health endpoints.

## Request flow

1. A page imports feature modules and the shared API client.
2. The API client builds a request under `/api/v1`, attaches a bearer token
   when present, and parses the JSON response.
3. Express parses and logs the request, routes it to a controller, applies
   validation and authorization middleware, and calls a service.
4. A service uses Prisma to read or write PostgreSQL.
5. The API returns a JSON success/error envelope; the frontend client unwraps
   the success `data` value for feature code.

## Backend module boundaries

- `config/` — environment and Prisma client configuration.
- `routes/` — HTTP path and middleware composition.
- `controllers/` — HTTP request/response adapters.
- `validators/` — Zod input schemas.
- `services/` — application and domain operations.
- `middleware/` — authentication, validation, and error handling.
- `utils/` — shared response and error helpers.
- `prisma/` — relational schema and generated client integration.

Keep business rules in services, not in route declarations or browser code.
Validate all untrusted input at the API boundary and enforce object ownership
on every protected operation.

## Configuration

The API reads `backend/.env` (local development) or injected environment
variables (hosted environments). Important variables:

- `DATABASE_URL` — PostgreSQL connection string.
- `JWT_SECRET` — secret used to sign bearer tokens.
- `JWT_EXPIRES_IN` — token lifetime.
- `PORT` — API listen port.
- `NODE_ENV` — runtime environment.

Never commit real secrets. The frontend's API origin is configurable with the
HTML `data-api-base` attribute; it must point at the deployed API outside local
development. Disable mock mode in production.

## Security boundaries

- Passwords are stored as bcrypt hashes; never return hashes to clients.
- The API validates tokens and applies role checks for protected routes.
- The database is reachable by the backend only and is configured through a
  secret connection string.
- Production deployment must use HTTPS, restrict CORS to the frontend origin,
  rotate strong secrets, and avoid logging credentials or tokens.
- Public administrator enrollment is not acceptable; provision admin accounts
  via a controlled operation.

## Known gaps

The API currently exposes only a subset of the frontend's mock API. In
particular, messaging, availability, admin management, and several
profile/request operations are not backed by routes and persistent models.
Provider search currently requires authentication. Public deployment must
resolve these gaps or clearly disable the corresponding screens. See
[MVP scope](./MVP_SCOPE.md) and [API contract](./API_CONTRACT.md).
