# Phase 7 Database Backup, Migration & Disaster Recovery Plan
**Stech WhatsApp Business CRM**  
**Engineering Discipline:** PostgreSQL Database Administrator & Site Reliability Engineer  
**Branch:** `feature/phase-7-production-readiness`  

---

## 1. Executive Summary & Recovery Targets

This document defines the database backup schedule, storage policies, integrity verification procedures, disaster recovery runbooks, and recovery targets for Stech WhatsApp Business CRM.

### Proposed Recovery Targets (For Client Approval)
- **Recovery Point Objective (RPO):** `<= 1 hour` (Maximum allowable data loss window in disaster event).
- **Recovery Time Objective (RTO):** `<= 30 minutes` (Maximum allowable downtime from outage detection to operational restoration).
- **Backup Retention Window:** 30 daily full backups, 12 monthly archival backups.

---

## 2. Backup Architecture & Tooling

### 2.1 Automated Backup Utility (`scripts/db-backup.js`)
- Generates logical full database dumps using PostgreSQL `pg_dump` with `--clean --if-exists` options.
- Automatically calculates a cryptographic **SHA-256 integrity checksum** over the resulting dump file.
- Persists corresponding `.meta.json` files containing timestamp, table count, byte size, and checksum.
- Backups are stored in `backups/`, which is excluded from version control via `.gitignore`.

### 2.2 Automated Restoration Utility (`scripts/db-restore.js`)
- Pre-execution validation verifies the SHA-256 checksum against metadata to prevent deploying corrupted dumps.
- Safety Guardrail: Direct restoration into the active database (`whatsapp_crm`) is blocked unless explicitly overridden with `--confirm-overwrite-active-db`.
- Post-restoration verification automatically confirms that all 32 public catalog tables are present.

---

## 3. Disaster Recovery Test Evidence

A live backup and restore cycle was executed during Phase 7 verification:
1. **Backup Generation:**
   - Command: `node scripts/db-backup.js`
   - File: `backups/backup_whatsapp_crm_2026-10-19T21-02-30-897Z.sql` (164.47 KB)
   - SHA-256: `a9bacc24ca128d79a6339b0bb07f8bae9f82627143203320d0046c50964f045c`
2. **Restoration into Disposable Database (`whatsapp_crm_recovery_test`):**
   - Command: `node scripts/db-restore.js --target-db=whatsapp_crm_recovery_test`
   - SHA-256 Checksum Verification: **MATCH (PASSED)**
   - Restored Tables: **32 tables (100% of all CRM business models)**
   - Post-Restoration Status: **PASSED**

---

## 4. Disaster Recovery Runbook (Operator Procedures)

### Scenario A: Minor Record Corruption or Accidental Table Modification
1. Export a point-in-time diff before taking action.
2. Restore the latest clean daily backup into a temporary sandbox database (`whatsapp_crm_recover_temp`):
   ```bash
   node scripts/db-restore.js --file=./backups/backup_xyz.sql --target-db=whatsapp_crm_recover_temp
   ```
3. Extract and re-import only the affected records into the primary database.

### Scenario B: Catastrophic Host Failure / Full Database Loss
1. Provision fresh PostgreSQL 16 instance.
2. Retrieve the latest verified encrypted backup file and metadata from secure offsite storage (e.g. AWS S3 / Cloudflare R2).
3. Execute full restoration:
   ```bash
   node scripts/db-restore.js --file=./backups/backup_xyz.sql --target-db=whatsapp_crm --confirm-overwrite-active-db
   ```
4. Verify migration state parity:
   ```bash
   cd server && npx prisma migrate status
   ```
5. Restart application containers and verify `/api/v1/health/ready`.
