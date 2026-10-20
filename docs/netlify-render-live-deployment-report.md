# Stech WhatsApp Business CRM — Netlify + Render Live Deployment Report
**Target Environment:** Staging / Demonstration / UAT (Render Free + Netlify Free)  
**Date:** October 20, 2026  
**Repository:** [https://github.com/irs682/whatsapp-business-crm](https://github.com/irs682/whatsapp-business-crm)  
**Deployment Branch:** `feature/netlify-render-deployment`  
**Git Commit:** `2b8dc215e018845791e4bebd4531022b4f11beb3`  

---

## 1. Executive Deployment Status Matrix

| Component | Target Platform | Current Status | Verification State |
| :--- | :--- | :--- | :--- |
| **Git Repository & Branch** | GitHub (`irs682/whatsapp-business-crm`) | **DEPLOYED AND VERIFIED** | Branch synchronized and pushed to remote |
| **Frontend Production Build** | Netlify / Vite 6 + React 18 | **DEPLOYED AND VERIFIED (LOCAL BUILD)** | `npm run build` passed (1,691 modules, `dist/` ready) |
| **SPA Client Routing** | Netlify Edge (`_redirects`) | **DEPLOYED AND VERIFIED (LOCAL)** | `/* /index.html 200` present in `client/dist/_redirects` |
| **Database Migrations** | Prisma 5.22.0 (`prisma migrate deploy`) | **CONFIGURED BUT NOT DEPLOYED** | 2 migration folders validated; awaiting target DB run |
| **Render PostgreSQL DB** | Render Free (`stech-crm-db`) | **CONFIGURED BUT NOT DEPLOYED** | Created on Render; awaiting dashboard access / live check |
| **Render Backend Service** | Render Free Web Service (`stech-crm-server`) | **CONFIGURED BUT NOT DEPLOYED** | Blueprint and build commands validated; awaiting Web Service create |
| **Netlify Frontend Site** | Netlify Free Site | **CONFIGURED BUT NOT DEPLOYED** | Base/build/publish settings configured; awaiting Netlify site link |
| **Live End-to-End Handshake** | Netlify Frontend ↔ Render Backend | **BLOCKED** | Blocked on Render & Netlify dashboard activation steps |

---

## 2. Infrastructure & Configuration Verification

### 2.1 Git Deployment Branch Verification
- **Branch:** `feature/netlify-render-deployment`
- **Remote Tracking:** `origin/feature/netlify-render-deployment`
- **Clean Working Tree:** Verified — zero uncommitted changes.
- **Latest Commit:** `2b8dc21` (`feat(deployment): configure repository for Netlify and Render Free deployment`)
- **Main Branch Alignment:** `main` fast-forwarded and synchronized on GitHub remote.

### 2.2 Prisma Migration History & Compatibility Assessment
- **PostgreSQL Version:** 18 (as configured on Render)
- **Prisma Version:** `5.22.0` (Client & CLI)
- **Engine Compatibility Analysis:**
  - Prisma 5.22.0 operates over standard PostgreSQL Wire Protocol v3.0, supported by PostgreSQL 14 through 18.
  - Native features used: UUIDs (`gen_random_uuid()`), JSONB, standard relations, and timestamps.
  - Connection mode: SSL required for external connections (`?sslmode=require`); native VPC routing for internal Render connections (`dpg-...:5432`).
- **Verified Migration Sequence:**
  1. `server/prisma/migrations/20261018193012_init`
  2. `server/prisma/migrations/20261020011500_phase_2_through_6_sync`
  - Replays all 31 models cleanly without requiring `db push --accept-data-loss` or `migrate reset`.

### 2.3 Client Production Packaging
- **Engine:** Vite v6.4.4
- **Transform Count:** 1,691 modules transformed
- **Output Artifacts:**
  - HTML: `dist/index.html` (1.05 kB)
  - CSS: `dist/assets/index-VvWH6uh8.css` (32.14 kB)
  - JavaScript: `dist/assets/index-CRMN7vIQ.js` (445.74 kB)
- **Redirects File:** Verified `client/dist/_redirects` contains `/*    /index.html   200`.

---

## 3. Step-by-Step Dashboard Operations Runbook

Because automated subagent browser execution paused at the Render dashboard authentication login screen, follow these exact manual steps in your browser:

### Step 1: Verify PostgreSQL Database (`stech-crm-db`)
1. Open the Render Project: [https://dashboard.render.com/project/prj-dbbop78473hc73d2gr20](https://dashboard.render.com/project/prj-dbbop78473hc73d2gr20)
2. Click on **`stech-crm-db`**.
3. Verify that the status indicator is **Available** (green).
4. Note the **Internal Database URL** (e.g., `postgresql://stech_crm_user:PASSWORD@dpg-dbbos6jncjis739ev5kg-a/stech_crm`).
   > *Security Rule:* Never paste or share the password in plain text.
5. In **Access Control** / **IP Allow List**:
   - Currently Render sets `0.0.0.0/0`.
   - The internal Render network automatically connects regardless of external allow lists.
   - Once migrations are applied, you can restrict or clear the IP allow list to prevent arbitrary public connections.

---

### Step 2: Create and Deploy the Node.js Backend Web Service
1. In the same Render Project (`Stech WhatsApp CRM`), click **New +** > select **Web Service**.
2. Connect your GitHub repository: `irs682/whatsapp-business-crm`.
3. Configure the exact deployment parameters:
   - **Name:** `stech-crm-server`
   - **Region:** `Singapore (Southeast Asia)` *(must match `stech-crm-db`)*
   - **Branch:** `feature/netlify-render-deployment`
   - **Root Directory:** `server`
   - **Runtime:** `Node.js`
   - **Instance Type:** `Free`
   - **Build Command:** `npm install && npx prisma generate`
   - **Start Command:** `npx prisma migrate deploy && node src/server.js`
   - **Health Check Path:** `/api/v1/health/ready`
4. Add the following **Environment Variables** in Render:

| Key | Value / Source | Purpose |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Enforces production runtime guards |
| `API_PREFIX` | `/api/v1` | Base API routing prefix |
| `DATABASE_URL` | *Select "Add from Database" > `stech-crm-db` > "Internal Connection String"* | Zero-latency internal DB connection |
| `JWT_SECRET` | *(Generate a 64-char random hex string)* | Authentication tokens |
| `WHATSAPP_MODE` | `mock` | Mock Meta WhatsApp driver (no charges) |
| `WHATSAPP_ENABLED` | `true` | Enables WhatsApp routes in mock mode |
| `CAMPAIGN_WORKER_ENABLED` | `false` | Prevents background queue spam |
| `CLIENT_URL` | `https://stech-whatsapp-crm.netlify.app` *(update after Netlify create)* | Express CORS allowed origin |
| `ALLOWED_ORIGINS` | `https://stech-whatsapp-crm.netlify.app` *(update after Netlify create)* | Socket.IO allowed origin |
| `ALLOW_STAGING_SEED` | `false` *(set to `true` temporarily only during seed)* | Production seed guardrail |

5. Click **Create Web Service**.
6. Wait for the build to finish. Once live, copy your public backend URL:  
   `https://stech-crm-server.onrender.com`

---

### Step 3: Seed Initial Staging Data (Controlled Execution)
Once the Web Service deploys and migrations run automatically:
1. In the Render Dashboard, navigate to `stech-crm-server` > **Shell** tab.
2. Run:
   ```bash
   ALLOW_STAGING_SEED=true node prisma/seed.js
   ```
3. This creates:
   - System Roles (`SUPER_ADMIN`, `ADMIN`, `MANAGER`, `AGENT`)
   - 31 granular permissions
   - Default departments (`Customer Support`, `Sales & Inquiries`, `Billing & Finance`)
   - Super Admin account and Support Agent account
   - Standard pipeline stages, tags, quick replies, and Meta WhatsApp templates.
4. Keep the Shell closed and ensure `ALLOW_STAGING_SEED` is disabled or unset in environment variables.

---

### Step 4: Deploy the Frontend to Netlify
1. Log in to [https://app.netlify.com/](https://app.netlify.com/).
2. Click **Add new site** > **Import an existing project** > **GitHub**.
3. Select `irs682/whatsapp-business-crm`.
4. Configure Build Settings:
   - **Branch to deploy:** `feature/netlify-render-deployment`
   - **Base directory:** `client`
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
5. Configure Environment Variables in Netlify:
   - **`VITE_API_BASE_URL`**: `https://<YOUR-RENDER-BACKEND>.onrender.com/api/v1`
6. Click **Deploy Site**.
7. Once deployed, note your Netlify URL (e.g. `https://stech-crm-staging.netlify.app`).

---

### Step 5: Finalize Inter-Service Connection & CORS
1. Return to the Render Dashboard > `stech-crm-server` > **Environment**.
2. Update:
   - `CLIENT_URL` = `https://<YOUR-NETLIFY-SITE>.netlify.app`
   - `ALLOWED_ORIGINS` = `https://<YOUR-NETLIFY-SITE>.netlify.app`
3. Click **Save Changes** (triggers an automated redeploy).

---

## 4. Post-Deployment Verification Checklist

Once both services are active:
- [ ] **Liveness Probe:** `curl https://<YOUR-RENDER-BACKEND>.onrender.com/api/v1/health/live` → `{"status":"alive"}`
- [ ] **Readiness Probe:** `curl https://<YOUR-RENDER-BACKEND>.onrender.com/api/v1/health/ready` → `{"status":"ready","database":"connected"}`
- [ ] **CORS Verification:** Inspect browser Network tab when logging into the Netlify frontend; verify `access-control-allow-origin` header matches Netlify origin.
- [ ] **SPA Route Refresh:** Navigate to `https://<YOUR-NETLIFY-SITE>.netlify.app/contacts` and refresh browser; verify page reloads without 404 (handled by `_redirects`).
- [ ] **Socket.IO Handshake:** Check browser console on the Shared Inbox page; confirm real-time WebSocket connection establishes with status 101/200.

---

## 5. Free-Tier Guardrails & Lifecycle Notices

> [!WARNING]
> **Free-Tier Limits:**
> 1. **Render Free PostgreSQL Lifespan:** Expires on **November 19, 2026** (30 days from creation). Regular logical backups must be taken using `node scripts/db-backup.js` before expiration.
> 2. **Render Web Service Inactivity Sleep:** Free instances spin down after 15 minutes of inactivity. The initial incoming HTTP request may experience a cold start latency of 30–50 seconds.
> 3. **WhatsApp Mock Mode:** Meta Cloud API remains in `mock` mode to prevent inadvertent broadcast charges or policy violations.
> 4. **No Production Data:** This staging deployment is strictly for UAT, demonstrations, and feature validation.
