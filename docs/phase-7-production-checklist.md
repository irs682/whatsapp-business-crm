# Stech WhatsApp Business CRM — Phase 7 Production Launch Checklist

**Document Version:** 1.0.0  
**Target Milestone:** Production Go-Live Gate Review  
**Status:** Verification In Progress (Technical Gates Complete; External Gates Pending)  

---

## 1. Release Gates Summary

| Gate | Category | Description | Status | Evidence / Notes |
| :---: | :--- | :--- | :---: | :--- |
| **Gate A** | **Code Quality** | Tests pass, linting passes, frontend builds, zero critical defects | **PASSED** | 82/82 backend tests pass; Vite build succeeds in 14.8s. |
| **Gate B** | **Database** | Migrations replay on clean DB, backup/restore tested, zero drift | **PASSED** | Replay verified; `db-backup.js` and `db-restore.js` tested. |
| **Gate C** | **Security** | RBAC verified, department isolation passes, secrets protected | **PASSED** | `phase-7-security-audit.md`; timing-safe HMAC validation. |
| **Gate D** | **Infrastructure** | Multi-stage Docker images build, compose stacks run, health checks pass | **PASSED** | `docker-compose.production.yml`, Alpine Node 20 LTS, Nginx. |
| **Gate E** | **Meta WhatsApp** | Live Meta authentication, public webhook, real inbound/outbound SMS | **BLOCKED** | Blocked awaiting client live Meta credentials and HTTPS ingress. |
| **Gate F** | **Marketing Safety** | Consent enforced, opt-out suppression verified, queue throttling active | **PASSED** | Pre-send consent gate verified; configurable batch delay. |
| **Gate G** | **UAT** | Required business workflows pass, client trial session | **PENDING** | 18 UAT test scenarios documented; awaiting client trial. |
| **Gate H** | **Operational Handover** | Runbooks, administrator guide, backup procedure, disaster recovery | **PASSED** | All Phase 7 operational guides compiled. |

---

## 2. Pre-Flight Production Checklist

### Infrastructure & System Environment
- [x] Multi-stage `server/Dockerfile` using Node.js 20 LTS Alpine with non-root user.
- [x] Multi-stage `client/Dockerfile` with Nginx static file serving and gzip compression.
- [x] Production orchestration stack `docker-compose.production.yml` with memory and CPU resource limits.
- [x] PostgreSQL 16 container volume `crm_pgdata` isolated on internal network.
- [x] Liveness probe (`/api/v1/health/live`) and readiness probe (`/api/v1/health/ready`) configured.
- [x] GitHub Actions CI/CD workflow (`.github/workflows/ci.yml`) validating migrations and container builds.

### Database & State Reliability
- [x] Historical migration tracking verified (`20261018193012_init` & `20261020011500_phase_2_through_6_sync`).
- [x] Zero schema drift between `schema.prisma` and PostgreSQL database.
- [x] Automated database backup script `scripts/db-backup.js` tested with SHA-256 integrity metadata.
- [x] Automated restore script `scripts/db-restore.js` verified against disposable test database.
- [x] Production deployment instructions enforce `prisma migrate deploy` (never `migrate dev`).

### Application Security & RBAC
- [x] Passwords hashed with bcrypt (salt rounds = 10).
- [x] JWT expiration enforced with minimum 32-character secret length validation at startup.
- [x] Rate limiting middleware active with configurable window and request limits.
- [x] Request correlation ID middleware (`correlationId.middleware.js`) attached to every response.
- [x] Stack traces suppressed in production error responses.
- [x] Department isolation strictly prevents cross-department conversation leaks.
- [x] Webhook endpoints protected with timing-safe HMAC-SHA256 signature verification.

### Asynchronous Worker & Messaging Safeguards
- [x] Atomic job claiming prevents duplicate campaign dispatching.
- [x] Pre-send opt-out re-verification prevents dispatches to contacts who revoked consent.
- [x] Worker rate limiting delay (`CAMPAIGN_RATE_LIMIT_DELAY_MS`) configurable to respect Meta throughput.
- [x] 24-hour customer service window tracked to prevent outbound WhatsApp policy violations.

### Handover & Commercial Blockers
- [ ] Client provides Meta Developer App ID, App Secret, and verified WABA Phone Number ID.
- [ ] Client provisions public DNS record and TLS reverse proxy (e.g., `https://crm.client.com`).
- [ ] Client conducts formal User Acceptance Testing (UAT) review.
- [ ] Client leadership signs commercial handover agreement.
