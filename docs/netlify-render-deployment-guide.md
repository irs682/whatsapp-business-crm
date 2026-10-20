# Netlify + Render Free Deployment Guide
**Stech WhatsApp Business CRM**
**Document Reference:** `docs/netlify-render-deployment-guide.md`
**Target Architecture:** 
- **Frontend:** Netlify Free Tier (React 18 + Vite SPA)
- **Backend API & WebSockets:** Render Free Web Service (Node.js Express + Socket.IO)
- **Database:** Render Free PostgreSQL (PostgreSQL 16)
**Monthly Cost:** **$0.00 / month** (Within published free-tier allowances)
**Working Branch:** `feature/netlify-render-deployment`

---

## 1. Architecture & Free-Tier Topology

This deployment splits the monorepo across two premier free cloud providers:

```
+---------------------------------------------------------------------------------------------------------+
|                                        PUBLIC INTERNET INGRESS                                          |
+----------------------------------------------------+----------------------------------------------------+
                                                     |
                                                     v
                         +-------------------------------------------------------+
                         | Netlify Global CDN Edge (HTTPS)                       |
                         | Hostname: https://<your-subdomain>.netlify.app        |
                         | Static SPA: React 18 + Vite + TailwindCSS             |
                         +---------------------------+---------------------------+
                                                     |
                                    REST API & WebSockets (WSS)
                                                     |
                                                     v
                         +-------------------------------------------------------+
                         | Render Free Web Service (HTTPS / WSS)                 |
                         | Hostname: https://<your-service>.onrender.com         |
                         | Runtime: Native Node.js (Express 5 + Socket.IO 4)     |
                         | Port: Dynamic (process.env.PORT)                      |
                         +---------------------------+---------------------------+
                                                     |
                                    Private Mesh Network (Encrypted)
                                                     |
                                                     v
                         +-------------------------------------------------------+
                         | Render Free PostgreSQL                                |
                         | Hostname: dpg-<id>-a (Internal Render Network)        |
                         | Storage: 1 GB / Shared CPU                            |
                         | ORM: Prisma 5.22.0 (prisma migrate deploy)            |
                         +-------------------------------------------------------+
```

---

## 2. Investigation of Migration History Discrepancy

> [!IMPORTANT]
> **Audit Finding regarding Prisma Migrations:**  
> Previous documentation drafts incorrectly referred to six fictitious sequential migration folders (e.g., `20260317000000_init_crm`, `20260318000000_phase2_core`, etc.).  
> An inspection of the actual filesystem (`server/prisma/migrations/`) confirms that the true committed migration chain consists of exactly two migrations:
> 1. `20261018193012_init` — Initial baseline CRM schema.
> 2. `20261020011500_phase_2_through_6_sync` — Consolidated synchronization migration covering Phases 2 through 6 (RBAC, Departments, Shared Inbox, WhatsApp Cloud API, Campaigns, and Reporting & Audit Logging).
>
> Running `npx prisma migrate deploy` replays these exact two migrations cleanly on a new database, creating all 31 business models without data drift. No schema push (`db push --accept-data-loss`) or reset (`migrate reset`) should ever be used.

---

## 3. Step 1: Provision Render Free PostgreSQL

1. Log in or create a free account at [https://render.com/](https://render.com/).
2. In the Render Dashboard, click **New +** > select **PostgreSQL**.
3. Configure the database parameters:
   - **Name:** `stech-crm-db`
   - **Database:** `whatsapp_crm`
   - **User:** `postgres` (or default generated user)
   - **Region:** Choose the region closest to your users (e.g., `Oregon (US West)` or `Frankfurt (EU Central)`).  
     *Important: Your Web Service must be deployed in this exact same region.*
   - **PostgreSQL Version:** `16`
   - **Instance Type:** Select **Free** (1 GB RAM, 0.25 vCPU, 1 GB storage).
4. Click **Create Database**.
5. Once provisioned, locate the connection details on the database dashboard:
   - **Internal Database URL:** (e.g., `postgres://postgres:password@dpg-xxxxxx-a:5432/whatsapp_crm`). Copy this for your Render Web Service.
   - **External Database URL:** (e.g., `postgres://postgres:password@dpg-xxxxxx-a.oregon-postgres.render.com/whatsapp_crm?sslmode=require`). Copy this if you need to run migrations or tools from your local workstation.

> [!WARNING]
> **30-Day Expiration Policy on Render Free PostgreSQL:**  
> Render Free PostgreSQL instances automatically expire and are deleted **30 days** after creation.
> - **For Staging / Evaluation:** Suitable for zero-cost testing.
> - **Backup Requirement:** Perform regular logical backups using `pg_dump` or `scripts/db-backup.js`.
> - **Production Transition:** Upgrade to Render's Basic PostgreSQL plan ($7/month) or migrate to a permanent managed provider (e.g., Supabase, Neon, or AWS RDS) before deploying commercial production workloads.

---

## 4. Step 2: Deploy Render Backend Web Service

### Option A: Using the Included Render Blueprint (`render.yaml`)
1. In Render Dashboard, click **New +** > **Blueprint**.
2. Connect repository: `https://github.com/irs682/whatsapp-business-crm`.
3. Select branch: `feature/netlify-render-deployment`.
4. Render automatically parses [render.yaml](file:///c:/Users/PMLS/Desktop/CRM/whatsapp-business-crm/render.yaml) and provisions both the database and web service.

---

### Option B: Manual Web Service Setup via Render Dashboard
1. In the Render Dashboard, click **New +** > **Web Service**.
2. Connect your GitHub repository: `whatsapp-business-crm`.
3. Configure the service settings:
   - **Name:** `stech-crm-server`
   - **Region:** Must match your PostgreSQL database region (e.g., `Oregon (US West)`).
   - **Branch:** `feature/netlify-render-deployment`
   - **Root Directory:** `server`
   - **Runtime:** `Node`
   - **Build Command:** `npm install && npx prisma generate`
   - **Start Command:** `npx prisma migrate deploy && node src/server.js`
   - **Instance Type:** Select **Free** (0.5 vCPU, 512 MB RAM).
4. Expand **Advanced** and set:
   - **Health Check Path:** `/api/v1/health`
   - **Auto-Deploy:** `Yes`
5. Under **Environment Variables**, add the following:

| Environment Variable | Value | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Enforces production runtime guards |
| `PORT` | `10000` | Render default port (injected automatically) |
| `API_PREFIX` | `/api/v1` | Base route prefix |
| `DATABASE_URL` | `<PASTE_INTERNAL_DATABASE_URL>` | Internal connection string from Step 1 |
| `JWT_SECRET` | *(Generate a 64-char random hex string)* | E.g., `openssl rand -hex 32` |
| `CLIENT_URL` | `https://your-app.netlify.app` | *Update with your Netlify URL after Step 3* |
| `ALLOWED_ORIGINS` | `https://your-app.netlify.app` | Comma-separated allowed origins |
| `WHATSAPP_MODE` | `mock` | Guaranteed $0 safe mock WhatsApp engine |
| `CAMPAIGN_WORKER_ENABLED` | `false` | Conserves CPU and prevents runaways on free tier |
| `ALLOW_STAGING_SEED` | `true` | Allows initial roles/permissions seeding |

6. Click **Create Web Service**.
7. Wait for deployment to complete. Render will install dependencies, generate the Prisma engine, run migrations, and launch the HTTP/WebSocket server.
8. Note your public backend URL: `https://stech-crm-server.onrender.com`.

---

## 5. Step 3: Deploy Netlify Frontend

1. Log in or create a free account at [https://www.netlify.com/](https://www.netlify.com/).
2. Click **Add new site** > **Import an existing project**.
3. Select **GitHub** and authorize access to `whatsapp-business-crm`.
4. Configure the build settings:
   - **Branch to deploy:** `feature/netlify-render-deployment`
   - **Base directory:** `client`
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
5. Expand **Environment variables** and configure:

| Variable Name | Required Value | Notes |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | `https://stech-crm-server.onrender.com/api/v1` | **CRITICAL:** Use your actual Render backend URL followed by `/api/v1`. The frontend automatically derives the Socket.IO URL from this variable. |

6. Click **Deploy site**.
7. Netlify will build the Vite bundle and deploy it to a global CDN address (e.g., `https://stech-crm-staging.netlify.app`).
8. **React Router SPA Routing:** The repository includes [client/public/_redirects](file:///c:/Users/PMLS/Desktop/CRM/whatsapp-business-crm/client/public/_redirects) and [netlify.toml](file:///c:/Users/PMLS/Desktop/CRM/whatsapp-business-crm/netlify.toml), which redirect all sub-routes (`/login`, `/inbox`, `/contacts`) to `/index.html` with HTTP 200, preventing 404 errors on browser page reloads.

---

## 6. Step 4: Synchronize CORS & Allowed Origins

Now that both URLs are known:
1. Copy your public Netlify URL (e.g., `https://stech-crm-staging.netlify.app`).
2. Return to the **Render Dashboard** > Select `stech-crm-server` > **Environment**.
3. Update:
   - `CLIENT_URL` = `https://stech-crm-staging.netlify.app`
   - `ALLOWED_ORIGINS` = `https://stech-crm-staging.netlify.app`
4. Click **Save Changes**. Render will automatically redeploy the service with updated CORS policies.
*(Note: Trailing slashes are automatically stripped by the server origin sanitizer).*

---

## 7. Step 5: Database Seeding (Initial Roles & Admin Account)

To populate system roles, permissions, default departments (Customer Support, Sales, Billing), and an initial administrator account:

### Method A: Via Render One-Off Shell
1. In Render Dashboard, open `stech-crm-server`.
2. Click the **Shell** tab (or connect via SSH).
3. Execute:
   ```bash
   node prisma/seed.js
   ```
4. Output confirms:
   - Roles created: `SUPER_ADMIN`, `ADMIN`, `MANAGER`, `AGENT`
   - Permissions synced: 35 permissions
   - Default departments created: `Customer Support`, `Sales & Inquiries`, `Billing & Finance`
   - Default Administrator created: `admin@crm.local` / `Admin123!`

### Method B: From Local Workstation via External Database URL
From your local terminal, point `DATABASE_URL` to Render's **External Database URL**:
```powershell
$env:DATABASE_URL="postgres://postgres:password@dpg-xxxxxx-a.oregon-postgres.render.com/whatsapp_crm?sslmode=require"
$env:ALLOW_STAGING_SEED="true"
node server/prisma/seed.js
```

---

## 8. Managing Render Free-Tier Limitations

### 8.1 Idle Sleep & Spin-Down Behavior
- **Trigger:** Render Free Web Services automatically sleep after **15 minutes** without incoming HTTP requests.
- **Cold Start Latency:** When the first request arrives, Render takes **30 to 50 seconds** to wake the container and start the Express server.
- **User Experience:** When visiting the Netlify frontend after a period of inactivity, the first API call will take ~40 seconds while Render boots. Subsequent calls respond immediately (<100ms).

### 8.2 Impact on WhatsApp Webhooks
- **Meta Timeout Rule:** Meta WhatsApp Cloud API webhooks require an HTTP `200 OK` response within 5 to 20 seconds.
- **Cold Start Behavior:** If an incoming message arrives while the Render instance is asleep, the initial delivery attempt may time out.
- **Meta Retry Policy:** Meta automatically retries failed deliveries using exponential backoff (retry after ~5 mins, ~15 mins, up to 24 hours). Once the container wakes, pending messages are acknowledged and ingested into the shared inbox.

### 8.3 Impact on Socket.IO Real-Time Engine
- **Sleep Disconnection:** When Render sleeps, active WebSocket connections are terminated.
- **Auto-Reconnection:** The client service ([client/src/services/socket.js](file:///c:/Users/PMLS/Desktop/CRM/whatsapp-business-crm/client/src/services/socket.js)) includes automated exponential backoff reconnection (`reconnectionAttempts: 10`, `reconnectionDelayMax: 5000`). Once the server wakes, the client re-authenticates and re-establishes the real-time inbox pipe seamlessly.

### 8.4 Policy Compliance & Upgrade Path
- **No Artificial Pings:** Do not use third-party "pinger" services (e.g., UptimeRobot) to artificially keep free instances awake. This violates Render's terms and may trigger account suspension.
- **Commercial Production Upgrade:**
  - Render Web Service: Upgrade to **Starter** ($7/mo) — Disables sleep, provides dedicated 0.5 CPU / 512 MB RAM, persistent WebSocket state.
  - Render PostgreSQL: Upgrade to **Basic** ($7/mo) — Removes 30-day expiration, provides persistent SSD storage and automated daily backups.

---

## 9. Deployment Verification Checklist

| Verification Task | Method | Expected Result |
| :--- | :--- | :--- |
| **Backend Health Check** | `curl -i https://<render-url>/api/v1/health` | HTTP 200 with `status: ok` |
| **Database Migrations** | Render build logs | Clean execution of migrations |
| **Frontend Rendering** | Open `https://<netlify-url>` in browser | Clean login UI with branding |
| **React Router Refresh** | Navigate to `/login` and refresh browser (F5) | Page reloads without 404 |
| **Authentication Flow** | Log in with `admin@crm.local` / `Admin123!` | Issues JWT, redirects to Dashboard |
| **Socket.IO Connection** | Inspect Browser DevTools > Network > WS | Status 101 Switching Protocols to `/socket.io/` |
| **CORS Verification** | Inspect Network request headers | `Access-Control-Allow-Origin` matches Netlify URL |
| **Data Isolation & RBAC** | Navigate to Contacts and Departments | Data renders scoped to user role |
| **Audit Log Generation** | Open Audit Trail in CRM | Login event recorded with IP & User-Agent |
