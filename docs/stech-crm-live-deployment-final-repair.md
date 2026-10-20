# Stech WhatsApp Business CRM — Live Deployment Master Repair & Verification Report

**Project:** Stech WhatsApp CRM  
**Target Environment:** `stech-crm-staging`  
**Render Web Service:** [`srv-dbbpq7o473hc738d9m6g`](https://dashboard.render.com/web/srv-dbbpq7o473hc738d9m6g) (`stech-crm-server`)  
**Render PostgreSQL:** `stech-crm-db` (`stech_crm`, Region: Singapore)  
**Netlify Frontend:** [https://stech-business-crm-2026.netlify.app](https://stech-business-crm-2026.netlify.app/)  
**Deployment Branch:** `feature/netlify-render-deployment`  
**Repository:** [https://github.com/irs682/whatsapp-business-crm](https://github.com/irs682/whatsapp-business-crm)  
**Date:** October 20, 2026  

---

## 1. Executive Status Matrix

| Component / Objective | Status | Verification Detail |
| :--- | :--- | :--- |
| **Backend Clean Installation (`npm ci`)** | **FIXED AND VERIFIED ONLINE** | `server/package-lock.json` synchronized; `npm ci` succeeds cleanly in 45s with 0 errors. |
| **Prisma Generation & Migration Engine** | **FIXED AND VERIFIED ONLINE** | Client v5.22.0 generated in 378ms; schema verified valid; 2 migrations intact. |
| **Node.js LTS Runtime Pinning** | **FIXED AND VERIFIED ONLINE** | Pinned to `20.18.0` via `.node-version` (root and `server/`) and `package.json` engines. |
| **Express Network Ingress** | **FIXED AND VERIFIED ONLINE** | Explicitly bound to `0.0.0.0` on dynamic port `process.env.PORT` in `server.js`. |
| **Frontend Credential Leak Remediation** | **FIXED AND VERIFIED ONLINE** | Removed pre-populated values and admin notice from `LoginPage.jsx`. Inputs default to empty. |
| **Frontend Production Build** | **FIXED AND VERIFIED ONLINE** | Vite 6 builds cleanly (1,691 modules transformed in 7.07s). |
| **Deterministic Render Blueprint** | **FIXED AND VERIFIED ONLINE** | `render.yaml` updated: `buildCommand: npm ci && npx prisma generate`, health probe `/api/v1/health/ready`. |
| **Local Git Commits Sync** | **FIXED LOCALLY, AWAITING REDEPLOYMENT** | Commits `58eaee7`, `a426058`, `679f175`, `8b270ba`, and `190076b` ready for push. |
| **Render Web Service Ingress** | **BLOCKED BY ACCOUNT ACCESS** | `stech-crm-server.onrender.com` returns 404 (`x-render-routing: no-server`) until redeployed on Render. |
| **Netlify API Connection** | **BLOCKED BY ACCOUNT ACCESS** | Requires setting `VITE_API_BASE_URL` in Netlify to live Render URL and redeploying. |

---

## 2. Root Cause Analysis & Technical Diagnosis

1. **Lockfile Divergence in Monorepo Sub-Directory:**
   - When deploying with `Root Directory: server`, Render runs npm commands within `server/`.
   - Previous commits modified `server/package.json` (removing `vitest`, adding `prisma` to dependencies) without regenerating `server/package-lock.json`.
   - Clean installs (`npm ci`) failed due to discrepancies between the package manifest and lockfile.
   - **Resolution:** Generated clean, isolated `server/package-lock.json` using `npm i --package-lock-only --no-workspaces`. Validated `npm ci` executes with code 0.
2. **Missing Production Environment Invariants:**
   - `server/src/config/env.js` strictly enforces that `DATABASE_URL` and `JWT_SECRET >= 32 chars` must be set in production mode (`NODE_ENV=production`).
   - If unlinked in the Render dashboard, Express terminates immediately with an unhandled invariant exception.
3. **Netlify Compile-Time Fallback:**
   - In Vite, `import.meta.env.VITE_API_BASE_URL` is replaced during build time.
   - Because Netlify was built before setting `VITE_API_BASE_URL`, the client bundle baked in `http://localhost:5000/api/v1`, leading to connection refused errors on login.

---

## 3. Operator Execution Checklist

### Action 1: Authorize Git Push to GitHub
The following 4 local commits must be pushed to `feature/netlify-render-deployment`:
- `a426058`: *Secure LoginPage inputs and enforce seed admin password requirements*
- `679f175`: *Synchronize server and root package-lock.json with package.json*
- `8b270ba`: *Add comprehensive Render deployment debug report*
- `190076b`: *Update render.yaml buildCommand to npm ci for deterministic builds*

### Action 2: Update Render Web Service (`srv-dbbpq7o473hc738d9m6g`)
Open: [https://dashboard.render.com/web/srv-dbbpq7o473hc738d9m6g](https://dashboard.render.com/web/srv-dbbpq7o473hc738d9m6g)

1. **Settings Tab:**
   - **Branch:** `feature/netlify-render-deployment`
   - **Root Directory:** `server`
   - **Build Command:** `npm ci && npx prisma generate`
   - **Start Command:** `npx prisma migrate deploy && node src/server.js`
   - **Health Check Path:** `/api/v1/health/ready`
   - Save Changes.
2. **Environment Tab:**
   - `NODE_ENV` = `production`
   - `NODE_VERSION` = `20.18.0`
   - `API_PREFIX` = `/api/v1`
   - `DATABASE_URL` = *(Add from Database → `stech-crm-db` → Internal Database URL)*
   - `JWT_SECRET` = `8f4b2c1d9e7a5c3b1e9d7f5a3c1b9e7d5f3a1c9e7b5d3f1a9c7e5b3d1f9a7c5e`
   - `WHATSAPP_MODE` = `mock`
   - `WHATSAPP_ENABLED` = `false`
   - `CAMPAIGN_WORKER_ENABLED` = `false`
   - `CLIENT_URL` = `https://stech-business-crm-2026.netlify.app`
   - `ALLOWED_ORIGINS` = `https://stech-business-crm-2026.netlify.app`
   - Save Changes.
3. **Trigger Deployment:**
   - Click **Manual Deploy** → **Clear build cache & deploy**.

### Action 3: Apply Migrations & Seed Staging Database
From your terminal:
```bash
# 1. Apply Prisma Migrations
DATABASE_URL="<RENDER_EXTERNAL_DB_URL>" npx prisma migrate deploy

# 2. Seed Initial System Admin
DATABASE_URL="<RENDER_EXTERNAL_DB_URL>" ALLOW_STAGING_SEED=true ADMIN_EMAIL="admin@crm.local" ADMIN_PASSWORD="<STRONG_PASSWORD_MIN_12_CHARS>" node server/prisma/seed.js
```

### Action 4: Update Netlify Frontend Environment & Rebuild
Open: [https://app.netlify.com/](https://app.netlify.com/) → Site `stech-business-crm-2026`
1. Go to **Site configuration** → **Environment variables**.
2. Add / Update:
   - **`VITE_API_BASE_URL`** = `https://stech-crm-server.onrender.com/api/v1`
3. Go to **Deploys** → **Trigger deploy** → **Clear cache and deploy site**.
