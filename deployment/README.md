# Deployment

Keep environment-specific values in deployment secrets or environment
variables, not in committed files. Set `DATABASE_URL`, `JWT_SECRET`,
`NODE_ENV=production`, and `PORT` for the backend. Configure the frontend's
`data-api-base` to the deployed API origin and restrict API CORS to the deployed
frontend origin before public deployment.

Apply reviewed Prisma migrations before starting production API instances.
Local schema synchronization (`db:push`) is intended for development only.
