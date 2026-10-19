# Phase 7 CI/CD Pipeline & Automated Quality Gate Specification
**Stech WhatsApp Business CRM**  
**Engineering Discipline:** DevOps & Site Reliability Engineering  
**Branch:** `feature/phase-7-production-readiness`  

---

## 1. CI/CD Architecture Overview

The Continuous Integration & Quality Gate pipeline is implemented via GitHub Actions (`.github/workflows/ci.yml`). Every code submission (push and pull request) must pass three parallel and sequential verification jobs before merge approval:

```
                  ┌─────────────────────────────────────────┐
                  │ Push to main / develop / feature branch │
                  └────────────────────┬────────────────────┘
                                       │
            ┌──────────────────────────┴──────────────────────────┐
            ▼                                                     ▼
┌──────────────────────────────────────┐     ┌──────────────────────────────────────┐
│  backend-and-database-checks         │     │  frontend-checks                     │
│  - Setup Node 20 LTS                 │     │  - Setup Node 20 LTS                 │
│  - Launch PostgreSQL 16 Service      │     │  - Install client dependencies       │
│  - Prisma Schema Validation          │     │  - Vite Production Asset Build       │
│  - Clean Migration Replay (deploy)   │     │  - Verify 0 bundling errors          │
│  - Migration Status Parity Check     │     └──────────────────┬───────────────────┘
│  - Prisma Client Code Generation     │                        │
│  - Automated Test Suite Execution    │                        │
└──────────────────┬───────────────────┘                        │
                   │                                            │
                   └─────────────────────┬──────────────────────┘
                                         ▼
                   ┌──────────────────────────────────────────┐
                   │  docker-build-checks                     │
                   │  - Build Backend Multi-stage Docker Image│
                   │  - Build Frontend Nginx Multi-stage Image│
                   │  - Verify 0 container build errors       │
                   └──────────────────────────────────────────┘
```

---

## 2. Quality Gate Stages

### Stage 1: Prisma Schema Validation & Migration Replay
- Spins up a real, isolated PostgreSQL 16 Alpine container service in GitHub runner.
- Executes `npx prisma validate` ensuring syntactic and relational consistency.
- Executes `npx prisma migrate deploy` on an empty database, proving that the migration chain (`20261018193012_init` -> `20261020011500_phase_2_through_6_sync`) can build the production catalog from zero without drift.
- Runs `npx prisma migrate status` to confirm 100% applied status.

### Stage 2: Backend Automated Test Execution
- Generates `@prisma/client`.
- Runs full backend regression suite (`npm test`).
- Enforces minimum 32-character `JWT_SECRET` and mock Meta operating mode.

### Stage 3: Frontend Production Asset Compilation
- Runs `npm ci` on client dependencies.
- Executes Vite production bundling (`npm run build`).
- Guarantees zero bundling errors, invalid imports, or broken JSX components.

### Stage 4: Docker Multi-Stage Image Verification
- Builds `server/Dockerfile` using Buildx to verify that Node 20 LTS Alpine, Prisma native engines, and non-root runner user build cleanly.
- Builds `client/Dockerfile` to ensure Nginx configuration and static assets assemble into an executable container.

---

## 3. Production Release Safety Policy

1. **Branch Protection:** Releases to staging or production are permitted only from protected branches (`main`, `release/*`) upon code review.
2. **Database Migration Safety:**
   - Production deployments must strictly execute `prisma migrate deploy`.
   - `prisma migrate dev` and `prisma db push --accept-data-loss` are strictly prohibited in deployment workflows.
3. **Secret Hygiene:**
   - Secrets are provided strictly via GitHub Repository Secrets (`DATABASE_URL`, `JWT_SECRET`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_APP_SECRET`).
   - Secrets are masked automatically by GitHub Actions and never printed in build outputs.
