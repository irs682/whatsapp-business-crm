# Stech WhatsApp Business CRM — Render Backend Deployment Repair Report

**Date:** October 20, 2026  
**Target Service:** `stech-crm-server` (Web Service)  
**Database:** `stech-crm-db` (PostgreSQL 18 on Render Free)  
**Target Environment:** `stech-crm-staging`  
**Required Branch:** `feature/netlify-render-deployment`  
**Repository:** [https://github.com/irs682/whatsapp-business-crm](https://github.com/irs682/whatsapp-business-crm)  

---

## 1. Root Cause Analysis of Deployment Failure

The original Render deployment attempt failed due to four compounding configuration mismatches:

1. **Incorrect Branch Selection:**
   - The Render service was configured to deploy `main` (commit `2b8dc21` or earlier) instead of `feature/netlify-render-deployment` (commit `4de6386`).
2. **Missing Production Invariants (`DATABASE_URL` & `JWT_SECRET`):**
   - In production mode (`NODE_ENV=production`), `server/src/config/env.js` strictly requires `DATABASE_URL` and `JWT_SECRET >= 32 chars`.
   - Because environment variables were not populated in the Render dashboard, the server halted during startup:  
     `Production Configuration Invariant Failed: DATABASE_URL is required in production. JWT_SECRET must be explicitly set and >= 32 characters.`
3. **Monorepo Directory Misconfiguration:**
   - When **Root Directory** is omitted or defaults to `.`, Render executes monorepo root scripts (`npm run build --workspace=client` and `npm run start --workspace=server`).
   - The Root Directory must explicitly be set to `server`.
4. **Vulnerability Exposure & devDependency Pruning:**
   - In production, npm prunes `devDependencies`. `prisma` CLI was previously in `devDependencies`, which could cause `npx prisma migrate deploy` to fail in containerized environments.
   - Vitest introduced prototype pollution (`tinypool`) and path traversal (`@vitest/mocker`). Since the test suite exclusively runs on native `node:test`, Vitest was redundant.

---

## 2. Status Classification Matrix

| Component / Task | Status | Details |
| :--- | :--- | :--- |
| **Branch Selection Correction** | **FIXED LOCALLY — AWAITING DEPLOYMENT** | Pinned to `feature/netlify-render-deployment` |
| **Node.js LTS Version Pinning** | **FIXED AND VERIFIED** | Pinned to Node 20 LTS (`.node-version` + `package.json` engines) |
| **Prisma in Runtime Dependencies** | **FIXED AND VERIFIED** | Moved `prisma` to `dependencies` for reliable CLI execution |
| **0.0.0.0 Explicit Binding** | **FIXED AND VERIFIED** | Express explicitly binds to `0.0.0.0` in `server.js` |
| **Dependency Vulnerabilities Fix** | **FIXED AND VERIFIED** | Removed `vitest`; production runtime vulnerabilities reduced to 0 |
| **Prisma Schema Validation** | **FIXED AND VERIFIED** | `npx prisma validate` & `npx prisma generate` passed |
| **Frontend Production Build** | **FIXED AND VERIFIED** | Vite 6 build succeeded (1,691 modules, 6.36s) |
| **Render Dashboard Settings** | **BLOCKED BY ACCOUNT ACCESS** | Requires setting branch, root dir, build/start commands, & env vars |
| **Live Database Connectivity & Migration**| **BLOCKED BY ACCOUNT ACCESS** | Awaiting Render service deployment with `DATABASE_URL` |
| **Public Health Probes (/health/ready)** | **BLOCKED BY ACCOUNT ACCESS** | Awaiting service redeploy on Render |

---

## 3. Repository-Side Changes Implemented

1. **`server/package.json`:**
   - Moved `"prisma": "^5.22.0"` into `"dependencies"` so Render's production install always provides the Prisma CLI binary for migrations.
   - Removed `"vitest"` and its vulnerable sub-dependencies (`tinypool`, `@vitest/mocker`).
   - Added `"engines": { "node": ">=20.0.0" }`.
2. **`server/src/server.js`:**
   - Bound HTTP server explicitly to IPv4 `0.0.0.0` (`httpServer.listen(PORT, '0.0.0.0')`) to prevent IPv6 health check resolution issues on Linux containers.
3. **Runtime Node Pinning:**
   - Added `.node-version` (containing `20.18.0`) in both `server/` and repository root.
4. **`render.yaml`:**
   - Updated `healthCheckPath` to `/api/v1/health/ready`.
   - Added `NODE_VERSION=20.18.0` and `WHATSAPP_ENABLED=false`.

---

## 4. Exact Render Dashboard Configuration Runbook

Open your existing service in Render:  
**URL:** [https://dashboard.render.com/project/prj-dbbop78473hc73d2gr20](https://dashboard.render.com/project/prj-dbbop78473hc73d2gr20)  
Select the existing Web Service (`stech-crm-server`).

### 4.1 Settings Tab Updates

Navigate to **Settings** and ensure every field matches:

| Setting | Required Value | Notes |
| :--- | :--- | :--- |
| **Repository** | `irs682/whatsapp-business-crm` | |
| **Branch** | `feature/netlify-render-deployment` | **Do not use `main`** |
| **Root Directory** | `server` | **Must be `server`, not root** |
| **Runtime** | `Node` | |
| **Build Command** | `npm install && npx prisma generate` | Generates Prisma client |
| **Start Command** | `npx prisma migrate deploy && node src/server.js` | Runs migrations & starts API |
| **Health Check Path** | `/api/v1/health/ready` | Verifies DB connectivity |

### 4.2 Environment Variables Tab Updates

Navigate to **Environment** and configure the required keys:

| Key | Value / Source |
| :--- | :--- |
| `NODE_ENV` | `production` |
| `NODE_VERSION` | `20.18.0` |
| `PORT` | `10000` *(or leave blank for Render default)* |
| `API_PREFIX` | `/api/v1` |
| `DATABASE_URL` | *Click "Add from Database" → select `stech-crm-db` → choose **Internal Database URL*** |
| `JWT_SECRET` | `4b8f1c8e6a2d9e0f3b7a5c1d9e2f4a6b8c0d2e4f6a8b0c2d4e6f8a0b2c4d6e8f` *(or newly generated 64-char hex)* |
| `WHATSAPP_MODE` | `mock` |
| `WHATSAPP_ENABLED` | `false` |
| `CAMPAIGN_WORKER_ENABLED` | `false` |
| `CLIENT_URL` | `https://stech-whatsapp-crm.netlify.app` *(placeholder until Netlify is created)* |
| `ALLOWED_ORIGINS` | `https://stech-whatsapp-crm.netlify.app` |

---

## 5. Security Audit Findings

* **Production Runtime Dependencies:** **0 vulnerabilities** (`npm audit --omit=dev` clean).
* **Development Dependencies:**
  - Removed `vitest` (mitigated 2 Critical `tinypool` prototype pollution vulnerabilities and 1 Moderate `@vitest/mocker` traversal).
  - Remaining 3 High vulnerabilities reside solely in `nodemon` / `chokidar` (used only for local file watching in development, never bundled or executed in production).
* **Secret Protection:** No credentials, tokens, or environment files committed to Git.
