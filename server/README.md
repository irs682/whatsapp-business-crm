# WhatsApp Business CRM - Backend API

Production-ready backend API service for the WhatsApp Business CRM, built with Node.js, Express, PostgreSQL, and Prisma ORM.

## Architecture & Design

The backend uses a strict **Modular Layered Architecture**:

```
server/
├── prisma/
│   ├── schema.prisma       # 17+ CRM entities, enums, soft delete, indexes
│   └── seed.js             # Initial roles, permissions, departments & admin
├── src/
│   ├── config/             # Environment, Prisma singleton, CORS, loggers
│   ├── constants/          # Status codes, system roles, permissions
│   ├── errors/             # Custom operational ApiError subclasses
│   ├── middleware/         # Auth, RBAC, Zod validation, Rate limiter, Error handler
│   ├── modules/            # Domain-driven feature modules (6-file standard)
│   ├── integrations/       # WhatsApp Cloud API client, webhook & documentation
│   ├── routes/             # Central API router mounting all modules
│   ├── utils/              # Response formatter, JWT, Bcrypt, Pagination
│   ├── app.js              # Express application configuration
│   └── server.js           # Server bootstrap and graceful shutdown
└── tests/                  # Automated integration tests (Vitest + Supertest)
```

## Modular 6-File Standard

Every module inside `src/modules/` adheres to:
1. `<module>.controller.js`: Thin HTTP controller extracting input and invoking service
2. `<module>.service.js`: Domain business logic and orchestration
3. `<module>.repository.js`: Encapsulated database queries via Prisma
4. `<module>.routes.js`: Route definitions with validation and RBAC guards
5. `<module>.validation.js`: Zod input schemas
6. `<module>.constants.js`: Module-specific constants and enums

## Operational Phase 1 Endpoints

- **Authentication**:
  - `POST /api/v1/auth/register`
  - `POST /api/v1/auth/login`
  - `GET /api/v1/auth/me`
- **Users**:
  - `GET /api/v1/users` (search, pagination, status filter)
  - `POST /api/v1/users`
  - `GET /api/v1/users/:id`
  - `PATCH /api/v1/users/:id`
  - `DELETE /api/v1/users/:id`
- **Departments**:
  - `GET /api/v1/departments`
  - `POST /api/v1/departments`
  - `GET /api/v1/departments/:id`
  - `PATCH /api/v1/departments/:id`
  - `DELETE /api/v1/departments/:id`
- **Contacts**:
  - `GET /api/v1/contacts` (search, tags, consent, pagination)
  - `POST /api/v1/contacts`
  - `GET /api/v1/contacts/:id`
  - `PATCH /api/v1/contacts/:id`
  - `DELETE /api/v1/contacts/:id`
- **Leads**:
  - `GET /api/v1/leads` (pipeline stage filter, agent filter)
  - `POST /api/v1/leads`
  - `GET /api/v1/leads/:id`
  - `PATCH /api/v1/leads/:id`
  - `DELETE /api/v1/leads/:id`
- **WhatsApp Webhooks**:
  - `GET /api/v1/webhooks/whatsapp` (Meta verification)
  - `POST /api/v1/webhooks/whatsapp` (Inbound events)

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env

# 3. Generate Prisma client & apply migrations
npx prisma generate
npx prisma migrate dev --name init

# 4. Seed initial database data
npm run prisma:seed

# 5. Start development server
npm run dev

# 6. Run automated tests
npm test
```
