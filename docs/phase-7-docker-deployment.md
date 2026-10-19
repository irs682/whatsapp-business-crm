# Phase 7 Docker Deployment & Containerization Guide
**Stech WhatsApp Business CRM**  
**Engineering Discipline:** DevOps & Cloud Infrastructure Architect  
**Branch:** `feature/phase-7-production-readiness`  

---

## 1. Containerization Architecture

Stech WhatsApp Business CRM implements production-grade multi-stage Docker builds to ensure minimal image size, zero secret leakage, reproducible builds, and non-root execution.

```
┌────────────────────────────────────────────────────────┐
│                        DOCKER HOST                     │
│                                                        │
│   ┌────────────────┐      ┌────────────────────────┐   │
│   │   crm_client   │      │       crm_server       │   │
│   │  (Nginx Alpine)│ ───► │ (Node.js 20 LTS Alpine)│   │
│   │    Port 80     │      │        Port 5000       │   │
│   └───────┬────────┘      └───────────┬────────────┘   │
│           │                           │                │
│           │       crm_backend_net     │                │
│           │    (Private Internal Net) │                │
│           ▼                           ▼                │
│   ┌────────────────────────────────────────────────┐   │
│   │                  crm_postgres                  │   │
│   │              (PostgreSQL 16 Alpine)            │   │
│   │                 crm_prod_pgdata                │   │
│   │              (Persistent Volume)               │   │
│   └────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────┘
```

---

## 2. Image Specifications

### 2.1 Backend (`server/Dockerfile`)
- **Base Image:** `node:20-alpine` (Supported LTS runtime replacing development v23).
- **Stage 1 (Builder):** Installs OpenSSL and devDependencies, copies Prisma schema, and generates the Prisma Client.
- **Stage 2 (Runner):** Installs production-only dependencies (`npm ci --omit=dev`), imports pre-generated Prisma binaries from Stage 1, adds `dumb-init` for graceful POSIX signal forwarding (`SIGTERM`/`SIGINT`), and switches to non-root `USER node`.
- **Health Check:** Polls `http://localhost:5000/api/v1/health` every 30 seconds.

### 2.2 Frontend (`client/Dockerfile`)
- **Base Image:** `node:20-alpine` (Builder) -> `nginx:alpine` (Runner).
- **Stage 1 (Builder):** Compiles Vite React production bundle into static `dist/`.
- **Stage 2 (Runner):** Serves optimized static assets with gzip compression, 1-year cache headers for hashed `/assets/`, and SPA fallback routing (`try_files $uri $uri/ /index.html`).
- **Health Check:** Polls `http://localhost/health` every 30 seconds.

---

## 3. Operational Commands

### 3.1 Local / Staging Stack Startup
```bash
# Build and start all services in the background
docker compose up -d --build

# Inspect container status and health
docker compose ps

# Follow unified logs
docker compose logs -f server
```

### 3.2 Production Deployment Stack
```bash
# Launch production stack with environment file
docker compose -f docker-compose.production.yml --env-file ./server/.env.production up -d --build

# Verify zero public exposure of database
docker compose -f docker-compose.production.yml ps
```

### 3.3 Database Migrations Inside Container
```bash
# Apply pending Prisma migrations in production
docker compose exec server npx prisma migrate deploy

# Check migration status
docker compose exec server npx prisma migrate status
```

### 3.4 Graceful Teardown & Volume Preservation
```bash
# Stop containers without erasing persistent database data
docker compose down

# Note: Never run 'docker compose down -v' in production as this deletes pgdata!
```
