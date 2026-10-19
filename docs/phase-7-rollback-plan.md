# Stech WhatsApp Business CRM — Phase 7 Rollback & Disaster Recovery Plan

**Document Version:** 1.0.0  
**Target Environments:** Staging & Production  
**Scope:** Application Services, Database, Asynchronous Workers, and Meta Integration  

---

## 1. Rollback Principles & Decision Matrix

| Trigger Event | Severity | Rollback Decision | Recommended Recovery Action |
| :--- | :---: | :--- | :--- |
| **API Startup Failure (Fatal Error / Missing Env)** | P0 | Immediate Application Rollback | Revert to previous Docker image tag (`v1.0.0-previous`) |
| **Database Migration Rejection / Lock Conflict** | P0 | Hold Release; Do Not Reset DB | Forward-fix migration or restore latest verified backup |
| **Critical Regression in Shared Inbox / Messaging** | P1 | Application Rollback | Roll back `server` container image; preserve database records |
| **Frontend UI Rendering Defect (Vite Bundle Error)** | P2 | Frontend-Only Rollback | Revert `client` container image to previous Nginx build |
| **Meta Graph API Token Expiration (`401 Unauthorized`)** | P1 | No Code Rollback | Rotate `WHATSAPP_ACCESS_TOKEN` in `.env.production` and restart `server` |
| **Asynchronous Worker Queue Stagnation** | P2 | Process Restart | Restart campaign worker queue; inspect dead-letter rows |

*Critical Safeguard:* Never execute `prisma migrate reset` or `prisma db push --accept-data-loss` in response to a failed production deployment.

---

## 2. Scenario 1: Application Release Rollback (Backend or Frontend)

If a newly deployed container release exhibits fatal errors or unacceptable regression:

### Step 1: Re-tag and Relaunch Previous Release
```bash
# Stop failing containers
docker compose -f docker-compose.production.yml stop server client

# Checkout previous stable release tag
git checkout tags/v1.0.0-previous

# Rebuild or point to previous tagged images
docker compose -f docker-compose.production.yml up -d --no-deps server client
```

### Step 2: Validate Liveness & Readiness Probes
```bash
curl -f http://127.0.0.1:5000/api/v1/health/live
curl -f http://127.0.0.1:5000/api/v1/health/ready
```

---

## 3. Scenario 2: Failed Database Migration & Forward Repair

Database migrations are additive and forward-only. If `prisma migrate deploy` fails due to a locked table or constraint violation:

1. **Do Not Reset the Database:** Existing business records must remain intact.
2. **Inspect Migration Error:**
   ```bash
   docker compose -f docker-compose.production.yml run --rm server npx prisma migrate status
   ```
3. **Forward-Repair Strategy:**
   - Resolve the lock or conflicting constraint in a new forward migration script.
   - If the migration partially executed, mark it resolved or rollback the specific table change using an approved forward script.
   - Re-run `prisma migrate deploy`.

---

## 4. Scenario 3: Database Disaster Recovery (Restoration from Backup)

In the event of catastrophic data corruption, disk hardware failure, or unintended administrative deletion:

### Step 1: Quarantine Affected Services
```bash
docker compose -f docker-compose.production.yml stop server
```

### Step 2: Identify Latest Verified Backup
Inspect available automated snapshots created by `scripts/db-backup.js`:
```bash
ls -la backups/
# Select target file, e.g., backups/backup_2026-10-20T00-00-00.sql
```

### Step 3: Execute Guardrailed Restoration
Use the project restoration utility `scripts/db-restore.js`:
```bash
# 1. Verify file integrity against SHA-256 checksum
# 2. Restore into target database
TARGET_DATABASE_URL="postgresql://postgres:[PASSWORD]@postgres:5432/whatsapp_crm" \
node scripts/db-restore.js backups/backup_2026-10-20T00-00-00.sql
```

### Step 4: Verify Post-Restore Consistency
```bash
# Confirm table count and row accessibility
docker compose -f docker-compose.production.yml run --rm server npx prisma migrate status
```

### Step 5: Resume Application Services
```bash
docker compose -f docker-compose.production.yml start server
```

---

## 5. Scenario 4: Meta WhatsApp Access Token Expiration

If outbound messages fail with `401 Unauthorized (Graph API Error Code 190)`:

1. Obtain a refreshed permanent System User Access Token from Meta Business Manager.
2. Update `server/.env.production`:
   ```bash
   WHATSAPP_ACCESS_TOKEN="EAAxxxxxxx..."
   ```
3. Gracefully reload the backend server:
   ```bash
   docker compose -f docker-compose.production.yml restart server
   ```
4. Verify outbound messaging via test conversation or template retrieval endpoint:
   ```bash
   curl -s -H "Authorization: Bearer [ADMIN_TOKEN]" http://127.0.0.1:5000/api/v1/integrations/whatsapp/templates/meta
   ```

---

## 6. Scenario 5: Campaign Worker Queue Stall or Crash

If campaign broadcasts stall or worker process terminates unexpectedly:

1. Check worker logs:
   ```bash
   docker compose -f docker-compose.production.yml logs --tail=100 server | grep -i campaign
   ```
2. Any pending campaign jobs in `CLAIMED` status whose lock has timed out will automatically be reclaimed on worker reboot via `CampaignQueue.resetStaleLocks()`.
3. Restart backend service:
   ```bash
   docker compose -f docker-compose.production.yml restart server
   ```
4. Ensure no duplicate messages are sent: The database unique index on `[campaignId, contactId]` in `campaign_recipients` strictly prevents double-dispatching to the same recipient.

---

## 7. Emergency Incident Escalation Contacts

| Role | Contact Entity | Escalation Trigger |
| :--- | :--- | :--- |
| **Lead DevOps Engineer** | devops@stech.com | Infrastructure outages, container crashes, DB connection loss |
| **Lead Backend Architect** | backend@stech.com | Unhandled API exceptions, migration deadlocks, queue bugs |
| **Meta Integration Lead** | integrations@stech.com | Meta API token revocation, webhook delivery failures |
| **Client Account Executive** | executive@client.com | P0 outages exceeding 15 minutes RTO |
