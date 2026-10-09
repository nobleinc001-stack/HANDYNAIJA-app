# Project folder structure

```text
HANDYNAIJA/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── config/          # Environment and database client
│   │   ├── controllers/     # HTTP handlers
│   │   ├── middleware/      # Auth, validation, and error handling
│   │   ├── routes/          # Versioned route modules
│   │   ├── services/        # Application logic
│   │   ├── utils/           # Errors and response helpers
│   │   ├── validators/      # Zod schemas
│   │   ├── app.js
│   │   └── server.js
│   ├── tests/               # Backend-local tests if added
│   ├── .env.example
│   └── package.json
├── database/                # Database operational notes
├── deployment/              # Hosting and release notes
├── docs/                    # Product, technical, and team documentation
├── frontend/
│   ├── assets/
│   ├── css/
│   ├── images/
│   ├── js/
│   │   ├── components/
│   │   ├── lib/             # API client, state, utilities, mock adapter
│   │   └── pages/
│   ├── shared/              # Browser-safe constants and validation
│   ├── pages/               # Nested informational pages
│   └── *.html               # Main app screens
├── shared/                  # Re-exports for existing project-root imports
├── tests/
│   └── backend/             # Node test-runner API tests
├── uploads/                 # Local-only placeholder; ignored by Git
├── .gitignore
├── package.json             # Root convenience scripts
├── README.md
└── serve.mjs                # Development-only static file server
```

## Placement guidelines

- Add API routes and their validation/controller/service code under
  `backend/src/` following the existing module boundaries.
- Make database changes in `backend/prisma/schema.prisma`; do not duplicate
  the canonical schema in a second handwritten file.
- Keep page-specific frontend behavior in `frontend/js/pages/`, reusable
  components in `frontend/js/components/`, and shared browser utilities in
  `frontend/js/lib/`.
- Keep browser-safe constants and validation in `frontend/shared/` so they
  are included when the frontend is deployed as a standalone static site.
- Add project references to `docs/`; keep operational database notes in
  `database/` and hosting notes in `deployment/`.
- Do not store production uploads on the API server's local disk; use durable
  object storage when upload functionality is introduced.
- Never add `.env` files, credentials, dependency folders, or generated
  production assets to source control.

This map describes the current repository. It does not imply that every
planned API feature or database model is implemented.
