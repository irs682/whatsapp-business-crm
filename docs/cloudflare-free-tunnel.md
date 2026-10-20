# Cloudflare Quick Tunnel Fallback Runbook
**Stech WhatsApp Business CRM**
**Document Reference:** `docs/cloudflare-free-tunnel.md`
**Target Environment:** Local Docker Desktop + Cloudflare Quick Tunnel (`trycloudflare.com`)
**Cost:** $0.00 / month Guaranteed
**Purpose:** Immediate public HTTPS access and Meta WhatsApp webhook verification without a cloud VPS

---

## 1. Overview & Operational Model

When cloud VM provisioning is deferred, blocked by regional capacity, or awaiting cloud account approval, Cloudflare Quick Tunnel provides an immediate, zero-cost fallback solution.

By running `cloudflared` locally on the Windows workstation, an authenticated, encrypted reverse tunnel is established directly to Cloudflare's global edge network. This exposes the local CRM Docker stack via a secure public HTTPS endpoint (`https://<random>.trycloudflare.com`) without opening inbound firewall ports or configuring router port forwarding.

```
+--------------------------+         +-------------------------------+         +-----------------------+
|   Meta WhatsApp API /    |  HTTPS  |   Cloudflare Edge Network     | Tunnel  |   Windows Workstation |
|   Remote CRM Users       | ------> |   (*.trycloudflare.com)       | ======> |   cloudflared process |
+--------------------------+         +-------------------------------+         +-----------+-----------+
                                                                                           |
                                                                                           v
                                                                               +-----------+-----------+
                                                                               | Docker crm_free_client|
                                                                               | Nginx Reverse Proxy   |
                                                                               | (Port 80)             |
                                                                               +-----------+-----------+
                                                                                           |
                                                                              +------------+------------+
                                                                              |                         |
                                                                              v                         v
                                                                    +---------+---------+     +---------+---------+
                                                                    | crm_free_server   |     | crm_free_postgres |
                                                                    | Express API :5000 |     | PostgreSQL :5432  |
                                                                    +-------------------+     +-------------------+
```

---

## 2. Mandatory Disclaimers & Operational Limits

> [!WARNING]
> **Host Dependency:** The operator's Windows PC must remain powered on, awake, and connected to the internet. If the computer sleeps, restarts, or closes the `cloudflared` window, the CRM becomes unreachable.
>
> **Temporary Hostnames:** Quick Tunnel URLs (`https://<unique-subdomain>.trycloudflare.com`) change whenever the tunnel process is restarted. Do NOT configure permanent third-party webhooks with temporary URLs unless you update the Meta App callback whenever the tunnel reconnects.
>
> **Development / Staging Only:** Quick Tunnels are designed for staging, demos, and webhook validation. They should never be considered a substitute for a dedicated 24/7 cloud server.

---

## 3. Step-by-Step Execution Guide

### Step 1: Install `cloudflared` on Windows

Open Windows PowerShell (Run as Administrator or standard user):

```powershell
# Option A: Install via Windows Package Manager (winget)
winget install --id Cloudflare.cloudflared -e

# Option B: Manual download if winget is unavailable
New-Item -ItemType Directory -Force -Path "$HOME\cloudflared"
Invoke-WebRequest -Uri "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe" -OutFile "$HOME\cloudflared\cloudflared.exe"
$env:Path += ";$HOME\cloudflared"
```

Verify installation:
```powershell
cloudflared --version
```

---

### Step 2: Prepare Environment Configuration

In the repository root, copy the free-tier environment template:

```powershell
Copy-Item "server\.env.free.example" "server\.env.free"
```

Update `server/.env.free` with temporary secure local credentials:
- `POSTGRES_PASSWORD`: Set a secure local password.
- `JWT_SECRET`: Set a 32+ character random string.
- `WHATSAPP_MODE`: Keep as `mock` for safe testing.
- `CAMPAIGN_WORKER_ENABLED`: Keep as `false`.

---

### Step 3: Launch Local Docker Stack

Start the CRM stack using the free compose specification:

```powershell
# Build and launch all three containers
docker compose -f docker-compose.free.yml up -d --build

# Verify all containers are healthy
docker compose -f docker-compose.free.yml ps
```

Check that the frontend responds locally:
```powershell
Invoke-WebRequest -Uri "http://localhost/api/v1/health" | Select-Object -ExpandProperty Content
```
Expected output:
```json
{"success":true,"message":"Stech WhatsApp CRM API is healthy","timestamp":"...","uptime":...}
```

---

### Step 4: Launch Cloudflare Quick Tunnel

Run the tunnel targeting local port 80 (the Nginx client reverse proxy):

```powershell
cloudflared tunnel --url http://localhost:80
```

The terminal will output connection logs. Look for the public tunnel address:
```
2026-10-20T13:45:00Z INF +--------------------------------------------------------------------------------------------+
2026-10-20T13:45:00Z INF |  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):  |
2026-10-20T13:45:00Z INF |  https://bold-pine-random-words.trycloudflare.com                                          |
2026-10-20T13:45:00Z INF +--------------------------------------------------------------------------------------------+
```

Note your public URL: `https://<YOUR_SUBDOMAIN>.trycloudflare.com`

---

### Step 5: Update CORS & Client URL (If Required)

If strict CORS or Socket.IO origin checks reject requests:
1. Update `CLIENT_URL` and `ALLOWED_ORIGINS` in `server/.env.free`:
   ```env
   CLIENT_URL=https://bold-pine-random-words.trycloudflare.com
   ALLOWED_ORIGINS=https://bold-pine-random-words.trycloudflare.com
   ```
2. Restart the server container:
   ```powershell
   docker compose -f docker-compose.free.yml restart server
   ```

---

### Step 6: Validate Public Accessibility & Webhooks

#### 1. Public Health Check
From an external device or browser:
```bash
curl -i https://bold-pine-random-words.trycloudflare.com/api/v1/health
```

#### 2. WhatsApp Webhook Challenge Verification
Simulate the GET challenge that Meta sends when registering the webhook callback URL:
```powershell
$TUNNEL_URL = "https://bold-pine-random-words.trycloudflare.com"
$VERIFY_TOKEN = "free_tier_mock_verify_token"

Invoke-WebRequest -Uri "$TUNNEL_URL/api/v1/webhooks/whatsapp?hub.mode=subscribe&hub.challenge=1158201444&hub.verify_token=$VERIFY_TOKEN" | Select-Object -ExpandProperty Content
```
Expected output:
```
1158201444
```

#### 3. WebSocket / Socket.IO Live Updates
Open `https://bold-pine-random-words.trycloudflare.com` in your browser.
1. Log in to the CRM dashboard.
2. Observe the shared inbox.
3. Open Developer Tools > Network > WS: Confirm the persistent `101 Switching Protocols` connection to `/socket.io/`.
