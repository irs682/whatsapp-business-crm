# Stech WhatsApp Business CRM — Phase 7 Production Deployment Runbook

**Document Version:** 1.0.0  
**Target Environments:** Staging & Production  
**Stack:** Docker Compose / Node.js 20 LTS Alpine / React Vite Nginx / PostgreSQL 16 Alpine  

---

## 1. Architecture Topology

The production architecture consists of three containerized services connected via an internal Docker bridge network (`crm_internal_network`) behind a TLS reverse proxy (e.g. Nginx, Traefik, or AWS ALB):

```
                                [Internet Clients & Meta Webhooks]
                                                │
                                         HTTPS (Port 443)
                                                ▼
                                   ┌─────────────────────────┐
                                   │  TLS Reverse Proxy / LB │
                                   └────────────┬────────────┘
                                                │
                       ┌────────────────────────┴────────────────────────┐
                       │                                                 │
                  Path: /                                          Path: /api/*
                       ▼                                                 ▼
            ┌──────────────────────┐                          ┌──────────────────────┐
            │   client (Nginx)     │                          │     server (API)     │
            │   React Static SPA   │                          │   Node.js 20 Express │
            │   Port: 80 (internal)│                          │   Port: 5000 (int)   │
            └──────────────────────┘                          └──────────┬───────────┘
                                                                         │
                                                                   Internal DB Net
                                                                         ▼
                                                              ┌──────────────────────┐
                                                              │      postgres        │
                                                              │    PostgreSQL 16     │
                                                              │    Port: 5432 (int)  │
                                                              │    Volume: crm_pgdata│
                                                              └──────────────────────┘
```

---

## 2. Pre-Deployment Prerequisites

Before executing the deployment, verify the following prerequisites:
1. Docker Engine >= 24.0 and Docker Compose >= 2.20 installed on target host.
2. Domain name pointed to the host IP (e.g., `crm.stech.com`).
3. Valid TLS certificates provisioned via Let's Encrypt Certbot or Cloudflare.
4. `.env.production` prepared from `server/.env.production.example` with cryptographically secure secrets:
   - `JWT_SECRET`: Random 64-character hex string (`openssl rand -hex 32`)
   - `DATABASE_URL`: `postgresql://postgres:[SECURE_PASSWORD]@postgres:5432/whatsapp_crm?schema=public`
   - `CAMPAIGN_WORKER_ENABLED=true`
   - `CAMPAIGN_RATE_LIMIT_DELAY_MS=100`

---

## 3. Step-by-Step Production Deployment Procedure

### Step 1: Clone Repository & Select Release Tag
```bash
git clone https://github.com/irs682/whatsapp-business-crm.git /opt/stech-crm
cd /opt/stech-crm
git checkout tags/v1.0.0 -b release-v1.0.0
```

### Step 2: Configure Production Environment
```bash
cp server/.env.production.example server/.env.production
chmod 600 server/.env.production
# Edit secrets using a secure editor (nano or vi)
vim server/.env.production
```

### Step 3: Pre-Deployment Database Backup (If Upgrading Existing Instance)
```bash
node scripts/db-backup.js
```

### Step 4: Build Production Container Images
```bash
docker compose -f docker-compose.production.yml build --no-cache
```

### Step 5: Start PostgreSQL Database Container
```bash
docker compose -f docker-compose.production.yml up -d postgres
# Wait for healthy probe
docker compose -f docker-compose.production.yml ps postgres
```

### Step 6: Apply Database Migrations (Zero Data Loss)
Execute migration deployment inside the isolated container or via CLI:
```bash
# Strictly execute migrate deploy (NEVER migrate dev in production)
docker compose -f docker-compose.production.yml run --rm server npx prisma migrate deploy
```

Verify migration status:
```bash
docker compose -f docker-compose.production.yml run --rm server npx prisma migrate status
```

### Step 7: Launch Full Application Stack
```bash
docker compose -f docker-compose.production.yml up -d
```

### Step 8: Verify Container Health Probes
```bash
# Check running container statuses
docker compose -f docker-compose.production.yml ps

# Verify API liveness
curl -f http://127.0.0.1:5000/api/v1/health/live

# Verify database connection readiness
curl -f http://127.0.0.1:5000/api/v1/health/ready

# Verify full system diagnostics
curl -s http://127.0.0.1:5000/api/v1/health | jq .
```

---

## 4. Post-Deployment Verification & Smoke Tests

1. **SPA Loading:** Navigate to `https://crm.stech.com/` in an incognito browser window. Confirm login screen loads with HTTPS lock icon.
2. **Administrative Login:** Log in using the designated Super Admin credentials. Confirm JWT token issuance and redirect to Dashboard.
3. **Department Isolation:** Verify that an agent in Department A cannot view conversations belonging to Department B.
4. **Webhook Endpoint Availability:** Verify `GET /api/v1/webhooks/whatsapp` responds with 403 on invalid tokens and 200 on matching verification tokens.
5. **Observability Verification:** Inspect Docker logs for errors:
   ```bash
   docker compose -f docker-compose.production.yml logs -f server
   ```

---

## 5. Maintenance Procedures

### Daily Automated Database Backup
Configure a daily cron job to run `scripts/db-backup.js` at 02:00 UTC:
```bash
0 2 * * * cd /opt/stech-crm && /usr/bin/node scripts/db-backup.js >> /var/log/crm-backup.log 2>&1
```

### Container Restart & Graceful Shutdown
```bash
# Graceful stop
docker compose -f docker-compose.production.yml down

# Restart
docker compose -f docker-compose.production.yml restart
```
