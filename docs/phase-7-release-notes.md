# Stech WhatsApp Business CRM — Release Notes (v1.0.0-rc1)

**Release Milestone:** Phase 7 — Production Hardening & Release Engineering  
**Branch:** `feature/phase-7-production-readiness`  
**Target Architecture:** Node.js 20 LTS / Express / PostgreSQL 16 / React 18 Vite / Socket.IO / Meta Cloud API  

---

## 1. Release Overview

Version 1.0.0-rc1 transitions the Stech WhatsApp Business CRM from a development-stage application into an enterprise-grade, containerized, production-ready system. This release hardens security, formalizes database migration tracking, packages services for multi-stage Docker orchestration, establishes automated CI/CD pipelines, introduces robust asynchronous worker safeguards, and adds end-to-end regression test coverage across all business modules.

---

## 2. Key Highlights & New Capabilities

### Containerization & Orchestration
- **Production Multi-Stage Dockerfiles:** Added `server/Dockerfile` using Node.js 20 LTS Alpine with non-root security user, `dumb-init` signal handling, and native health checks. Added `client/Dockerfile` with multi-stage Vite build and Nginx Alpine static serving with gzip compression.
- **Docker Compose Stacks:** Provided `docker-compose.yml` for local/staging developer parity and `docker-compose.production.yml` with CPU/memory limits and isolated PostgreSQL internal networking.

### Continuous Integration & Automated Delivery (CI/CD)
- **GitHub Actions Pipeline (`.github/workflows/ci.yml`):** Fully automated CI workflow running on all PRs and pushes to main/release branches. Validates Prisma schema, runs clean migration replay against an isolated PostgreSQL 16 service container, executes the 82-test backend suite, runs the Vite production asset build, and verifies Docker image builds.

### Database Reliability & Automated Recovery
- **Prisma Migration History Synchronization:** Reconciled historical schema drift through migration `20261020011500_phase_2_through_6_sync`. Clean database replay verified with zero schema divergence.
- **Automated Backup & Restore Tooling:** Developed `scripts/db-backup.js` and `scripts/db-restore.js` with SHA-256 cryptographic checksums, automated table verification, and active database overwrite safeguards.

### Security & Operational Hardening
- **Strict Environment Validation:** Application fails fast at startup if critical production secrets (`DATABASE_URL`, `JWT_SECRET >= 32 chars`, allowed origins) are missing or misconfigured.
- **Distributed Request Tracing:** Centralized `correlationId.middleware.js` injects unique trace identifiers (`X-Correlation-ID`) across all requests, application logs, and error responses.
- **Sensitive Header & Stack Trace Redaction:** Stack traces are suppressed in production mode; authorization tokens and webhook signatures are masked in logs.
- **Timing-Safe HMAC-SHA256 Webhook Verification:** Timing attack defense for all incoming Meta Cloud API webhook dispatches.

### Campaign Worker Reliability
- **Configurable Rate Limiting:** Added `CAMPAIGN_RATE_LIMIT_DELAY_MS` and `CAMPAIGN_BATCH_SIZE` to throttle broadcasts according to Meta Cloud API tiers.
- **Pre-Send Opt-Out Re-Verification:** Worker re-checks marketing consent immediately prior to message dispatch, preventing dispatches to contacts who opted out while a campaign was queued.

### Performance & End-to-End Verification
- **High-Concurrency Benchmarking:** 320 requests benchmarked across 6 workloads with a 0.0% error rate. Inbound webhooks processed at 625 req/sec with a p95 latency of 20 ms.
- **End-to-End Business Workflows:** 9 comprehensive business workflow tests covering user administration, CRM contacts, leads, tasks, shared inbox claim/reply/transfer, WhatsApp webhook ingestion, marketing automation, opt-out suppression, and health probes. All 82 tests pass cleanly.

---

## 3. Operational Requirements for Production Launch

1. **Meta WhatsApp Credentials:** The application is currently running in `WHATSAPP_MODE=mock`. Client must provide genuine Meta Cloud API credentials (Phone Number ID, WABA ID, permanent System User Token, App Secret) to enable live dispatches.
2. **Reverse Proxy & Ingress:** A public HTTPS domain with valid TLS certificates must be routed to port 80 (frontend SPA) and port 5000 (backend API).
3. **Database Volume Persistence:** Production host must mount persistent volume `crm_pgdata` to prevent data loss across container lifecycle events.
