# Phase 7 Staging Deployment Guide: Single Ubuntu Linux VPS with HTTPS
**Stech WhatsApp Business CRM**  
**Engineering Discipline:** DevOps & Full-Stack Cloud Deployment Architect  
**Branch:** `feature/phase-7-production-readiness`  
**Target Environment:** Isolated Ubuntu 22.04 / 24.04 LTS VPS with TLS Reverse Proxy  

---

## 1. System Architecture Overview

The Phase 7 containerized architecture follows zero-trust isolation and multi-stage build optimization:

```
                          INTERNET (Browser / Meta Webhook)
                                       │
                               HTTPS (Port 443) / HTTP (Port 80)
                                       ▼
                 ┌───────────────────────────────────────────┐
                 │          UBUNTU LINUX HOST VPS            │
                 │                                           │
                 │   Host Nginx Reverse Proxy + Let's Encrypt│
                 │   - Terminates TLS (SSLv3/TLSv1.3)        │
                 │   - Handles WebSocket Upgrades (WSS)      │
                 │   - Enforces UFW Firewall (22, 80, 443)   │
                 └─────────────────────┬─────────────────────┘
                                       │ HTTP Proxy (127.0.0.1:80)
                                       ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        DOCKER ENGINE NETWORK                           │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │   crm_prod_client (Nginx Alpine Web Server & SPA Router)       │   │
│   │   - Serves Vite React 18 production bundle                     │   │
│   │   - Proxies /api/ and /socket.io/ to backend container         │   │
│   │   - Attached to: crm_frontend_net                              │   │
│   └───────────────────────────────┬────────────────────────────────┘   │
│                                   │ http://server:5000 (Internal DNS)  │
│                                   ▼                                    │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │   crm_prod_server (Node.js 20 LTS Alpine Runtime)              │   │
│   │   - Express API + Socket.IO Engine                             │   │
│   │   - In-process Campaign Worker (Mock mode in staging)          │   │
│   │   - Attached to: crm_frontend_net + crm_backend_net            │   │
│   │   - Non-root user (node), dumb-init PID 1 supervisor           │   │
│   └───────────────────────────────┬────────────────────────────────┘   │
│                                   │ postgres:5432 (Internal DNS)       │
│                                   ▼                                    │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │   crm_prod_postgres (PostgreSQL 16 Alpine Database)            │   │
│   │   - ZERO public exposure (crm_backend_net internal: true)      │   │
│   │   - Persistent storage volume: crm_prod_pgdata                 │   │
│   │   - Healthcheck: pg_isready                                    │   │
│   └────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Infrastructure Prerequisites

| Requirement | Specification | Notes |
| :--- | :--- | :--- |
| **Operating System** | Ubuntu 22.04 LTS or 24.04 LTS (x86_64) | Clean minimal server installation |
| **Compute** | 2 vCPUs minimum (4 vCPUs recommended) | Container CPU reservations: 1.0 total |
| **Memory** | 4 GB RAM minimum (8 GB recommended) | Database + Node runtime + Nginx |
| **Storage** | 40 GB NVMe / SSD | Docker images, PostgreSQL volume, backups |
| **Network** | 1 Static Public IPv4 Address | Bound to A-Record for domain |
| **Domain Name** | Fully Qualified Domain Name (e.g. `staging-crm.yourdomain.com`) | Managed via Cloudflare, Route53, Namecheap |
| **Firewall** | Inbound: 22 (SSH), 80 (HTTP), 443 (HTTPS) | All other ports (specifically 5432) strictly blocked |

---

## 3. Ubuntu Host Initial Provisioning

Execute these commands over SSH on a fresh Ubuntu VPS instance:

### 3.1 System Update & Essential Packages
```bash
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y curl wget git ufw certbot python3-certbot-nginx nginx fail2ban
```

### 3.2 UFW Firewall Configuration
Ensure PostgreSQL (port 5432) and Node backend (port 5000) are **never** opened to the public internet:
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status verbose
```

### 3.3 Docker Engine & Docker Compose Plugin Installation
```bash
# Add Docker's official GPG key:
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# Add repository to Apt sources:
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Enable Docker on boot and add deployment user to docker group:
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
# (Log out and log back in for group membership to take effect)
```

---

## 4. Repository Setup & Environment Configuration

### 4.1 Clone Repository & Switch Branch
```bash
mkdir -p /opt/stech
cd /opt/stech
git clone https://github.com/irs682/whatsapp-business-crm.git .
git checkout feature/phase-7-production-readiness
```

### 4.2 Generate Cryptographically Secure Secrets
Run the following helper commands to generate strong, unique secrets:
```bash
# Generate 64-char JWT Secret:
openssl rand -hex 32

# Generate Strong PostgreSQL Password:
openssl rand -base64 24 | tr -d "=+/"

# Generate Secure WhatsApp Webhook Verify Token:
openssl rand -hex 16
```

### 4.3 Configure Staging Environment File
Create the staging environment configuration at `server/.env.production` (or `server/.env.staging`):
```bash
cp server/.env.staging.example server/.env.production
nano server/.env.production
```

Populate with your staging domain and generated secrets:
```ini
# Application Runtime
NODE_ENV=production
PORT=5000
API_PREFIX=/api/v1
CLIENT_URL=https://staging-crm.yourdomain.com
ALLOWED_ORIGINS=https://staging-crm.yourdomain.com

# PostgreSQL Credentials & Connection (Docker Internal Network)
POSTGRES_USER=postgres
POSTGRES_PASSWORD=PASTE_GENERATED_SECURE_DB_PASSWORD
POSTGRES_DB=whatsapp_crm
DATABASE_URL="postgresql://postgres:PASTE_GENERATED_SECURE_DB_PASSWORD@postgres:5432/whatsapp_crm?schema=public"

# Authentication & Session Security (Minimum 32 characters)
JWT_SECRET=PASTE_GENERATED_64_CHAR_JWT_SECRET
JWT_EXPIRES_IN=1d
BCRYPT_SALT_ROUNDS=12

# API Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=500

# Meta WhatsApp Cloud API — STAGING SAFEGUARDS:
# Keep WHATSAPP_MODE=mock and CAMPAIGN_WORKER_ENABLED=false to strictly prevent real WhatsApp bulk dispatching!
WHATSAPP_ENABLED=true
WHATSAPP_MODE=mock
WHATSAPP_API_VERSION=v21.0
WHATSAPP_BASE_URL=https://graph.facebook.com
WHATSAPP_APP_ID=mock_meta_app_id
WHATSAPP_APP_SECRET=mock_meta_app_secret
WHATSAPP_ACCESS_TOKEN=mock_meta_system_user_access_token
WHATSAPP_PHONE_NUMBER_ID=mock_meta_phone_number_id
WHATSAPP_BUSINESS_ACCOUNT_ID=mock_meta_waba_id
WHATSAPP_VERIFY_TOKEN=PASTE_GENERATED_WEBHOOK_VERIFY_TOKEN
WHATSAPP_WEBHOOK_PATH=/api/v1/webhooks/whatsapp

# Background Campaign Worker & Throttling
CAMPAIGN_WORKER_ENABLED=false
CAMPAIGN_RATE_LIMIT_DELAY_MS=100
CAMPAIGN_BATCH_SIZE=10
CAMPAIGN_MAX_RETRIES=3

# Observability & Logging
LOG_LEVEL=info
HEALTH_CHECK_TIMEOUT_MS=3000
```

---

## 5. Docker Stack Deployment

### 5.1 Validate Compose Configuration
```bash
docker compose -f docker-compose.production.yml --env-file ./server/.env.production config
```

### 5.2 Build & Launch Containers
```bash
docker compose -f docker-compose.production.yml --env-file ./server/.env.production up -d --build
```

### 5.3 Verify Container Status & Health
Check that all 3 services (`crm_prod_postgres`, `crm_prod_server`, `crm_prod_client`) are in healthy state:
```bash
docker compose -f docker-compose.production.yml ps
```

Expected output:
```
NAME                IMAGE                          COMMAND                  SERVICE    STATUS                    PORTS
crm_prod_client     whatsapp-business-crm-client   "/docker-entrypoint.…"   client     Up (healthy)              0.0.0.0:80->80/tcp
crm_prod_postgres   postgres:16-alpine             "docker-entrypoint.s…"   postgres   Up (healthy)              (no public ports)
crm_prod_server     whatsapp-business-crm-server   "/usr/bin/dumb-init …"   server     Up (healthy)              (no public ports)
```

### 5.4 Execute Database Migrations Inside Container
Apply the Prisma migration sync to the isolated production database:
```bash
docker compose -f docker-compose.production.yml exec server npx prisma migrate deploy
docker compose -f docker-compose.production.yml exec server npx prisma migrate status
```

### 5.5 Optional: Seed Staging Database
If initial roles, default permissions, and test accounts are required:
```bash
docker compose -f docker-compose.production.yml exec server npm run prisma:seed
```

---

## 6. Host Nginx Reverse Proxy & Let's Encrypt TLS

To allow the host Nginx to bind to public ports 80 and 443 while forwarding to the Docker client container, assign Docker's client container to a loopback port (e.g., `127.0.0.1:8080:80`):

### 6.1 Update Compose Port Mapping
In `docker-compose.production.yml`:
```yaml
  client:
    ports:
      - "127.0.0.1:${HTTP_PORT:-8080}:80"
```

### 6.2 Host Nginx Virtual Host Configuration
Create `/etc/nginx/sites-available/staging-crm`:
```nginx
# Map WebSocket Upgrade headers for Socket.IO
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

server {
    listen 80;
    listen [::]:80;
    server_name staging-crm.yourdomain.com;

    # Certbot ACME challenge route
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Redirect all HTTP traffic to HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name staging-crm.yourdomain.com;

    # SSL Certificate Paths (Managed by Certbot)
    ssl_certificate /etc/letsencrypt/live/staging-crm.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/staging-crm.yourdomain.com/privkey.pem;

    # Modern TLS Security Parameters
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;

    # Security Headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Max body size for contact CSV bulk imports & media attachments
    client_max_body_size 25M;

    # Root proxy to Docker Client (which serves SPA + proxies /api/ and /socket.io/)
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;

        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;

        # Forwarded Client Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port 443;

        # Real-time WebSocket timeouts
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
        proxy_buffering off;
    }
}
```

### 6.3 Enable Site & Acquire SSL Certificate
```bash
# Enable site configuration:
sudo ln -s /etc/nginx/sites-available/staging-crm /etc/nginx/sites-enabled/
sudo nginx -t

# Obtain Let's Encrypt TLS Certificate:
sudo certbot --nginx -d staging-crm.yourdomain.com --non-interactive --agree-tos -m devops@yourdomain.com

# Reload Nginx:
sudo systemctl reload nginx
```

### 6.4 Verify Certificate Auto-Renewal
```bash
sudo certbot renew --dry-run
```

---

## 7. DNS Configuration Steps

1. Log in to your DNS registrar or DNS management portal (Cloudflare, AWS Route 53, Namecheap, GoDaddy).
2. Create an **A Record**:
   - **Type:** `A`
   - **Name / Host:** `staging-crm` (or `@` if using root domain)
   - **IPv4 Address:** `<YOUR_UBUNTU_VPS_PUBLIC_IP>`
   - **TTL:** 300 seconds (5 minutes) for rapid propagation during staging setup.
   - **Proxy Status:** DNS Only (Grey Cloud in Cloudflare) initially to complete Let's Encrypt validation.
3. Verify DNS propagation from your local workstation:
   ```bash
   dig +short staging-crm.yourdomain.com
   nslookup staging-crm.yourdomain.com
   ```

---

## 8. Meta WhatsApp Cloud API Webhook Setup

When configuring the Meta App for WhatsApp Business webhooks on staging:

1. **Navigate to:** [Meta for Developers Portal](https://developers.facebook.com/) -> App Dashboard -> **WhatsApp** -> **Configuration**.
2. **Edit Callback URL**:
   - **Callback URL:** `https://staging-crm.yourdomain.com/api/v1/webhooks/whatsapp`
   - **Verify Token:** `<THE_WHATSAPP_VERIFY_TOKEN_CONFIGURED_IN_ENV>`
3. **Webhook Verification Handshake Test (Manual Pre-Check):**
   ```bash
   curl -i "https://staging-crm.yourdomain.com/api/v1/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=YOUR_VERIFY_TOKEN&hub.challenge=12345678"
   ```
   Expected response:
   ```
   HTTP/1.1 200 OK
   Content-Type: text/plain

   12345678
   ```
4. **Subscribe to Webhook Fields**:
   - In the **Webhook fields** table, click **Manage**.
   - Subscribe to: `messages`.
   - Send a test notification from Meta's dashboard to verify receipt in container logs:
     ```bash
     docker compose -f docker-compose.production.yml logs -f server | grep WhatsAppWebhook
     ```

---

## 9. Staging Health & Readiness Verification

Run these verification tests against the deployed URL:

```bash
# 1. Frontend Web Server Health:
curl -i https://staging-crm.yourdomain.com/health

# 2. Comprehensive Service Health & Dependencies (PostgreSQL + WhatsApp Mode + Worker):
curl -i https://staging-crm.yourdomain.com/api/v1/health

# 3. Liveness Probe (Process execution):
curl -i https://staging-crm.yourdomain.com/api/v1/health/live

# 4. Readiness Probe (PostgreSQL connectivity check):
curl -i https://staging-crm.yourdomain.com/api/v1/health/ready

# 5. Socket.IO Real-Time Handshake:
curl -i "https://staging-crm.yourdomain.com/socket.io/?EIO=4&transport=polling"
```

All endpoints must return `HTTP/1.1 200 OK`.

---

## 10. Automated Backup & Disaster Recovery Operations

### 10.1 Trigger Manual On-Demand Backup
```bash
docker compose -f docker-compose.production.yml exec server node scripts/db-backup.js
```
Backups are placed in `./backups/` with timestamp and SHA-256 integrity metadata.

### 10.2 Configure Daily Automated Backup Cron Job
Add to host crontab (`crontab -e`):
```cron
# Run CRM database backup every morning at 02:00 AM UTC:
0 2 * * * cd /opt/stech && docker compose -f docker-compose.production.yml exec -T server node scripts/db-backup.js >> /var/log/crm-backup.log 2>&1
```

### 10.3 Test Restoration into Isolated Recovery Database
To verify backup recoverability without impacting the active database:
```bash
docker compose -f docker-compose.production.yml exec server node scripts/db-restore.js --target-db=whatsapp_crm_recovery_test
```

---

## 11. Rollback & Maintenance Procedures

### Graceful Restart
```bash
docker compose -f docker-compose.production.yml restart
```

### Zero-Downtime Deployment / Update
```bash
git pull origin feature/phase-7-production-readiness
docker compose -f docker-compose.production.yml build
docker compose -f docker-compose.production.yml up -d --no-deps server client
docker compose -f docker-compose.production.yml exec server npx prisma migrate deploy
```

### Complete Teardown with Volume Preservation
```bash
# Safely stops all containers while preserving database state:
docker compose -f docker-compose.production.yml down

# CAUTION: Never run 'docker compose down -v' on staging/production as this destroys crm_prod_pgdata!
```
