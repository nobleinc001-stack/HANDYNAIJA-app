# Database

PostgreSQL is accessed by the backend through Prisma. The canonical schema is
`backend/prisma/schema.prisma`; keep database changes there rather than
maintaining a second SQL schema that can drift.

## Commands

Run these from the project root:

```sh
npm run db:generate
npm run db:push
npm run db:studio
```

`db:push` synchronizes the Prisma schema with the configured database. For
production deployments, use reviewed Prisma migrations rather than running
schema synchronization automatically.

The backend reads `backend/.env` regardless of the directory used to start the
process. Configure `DATABASE_URL` there and never commit that file.
