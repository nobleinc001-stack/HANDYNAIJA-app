# Deployment

Keep environment-specific values in deployment secrets or environment
variables, not in committed files. Set `DATABASE_URL`, `JWT_SECRET`, and
`NODE_ENV=production` for the backend. Render provides `PORT`; the backend
listens on that port on `0.0.0.0`.

The API accepts HTTPS origins on `*.vercel.app` for Vercel production and
preview deployments. Set `CORS_ORIGINS` to a comma-separated list of exact
origins to allow a custom frontend domain, for example
`https://handynaija.example.com`. Configure the frontend's `data-api-base` to
the deployed API origin.

Apply reviewed Prisma migrations before starting production API instances.
Local schema synchronization (`db:push`) is intended for development only.
