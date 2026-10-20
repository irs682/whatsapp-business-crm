# Oracle Cloud Always Free Deployment Runbook
**Stech WhatsApp Business CRM**
**Document Reference:** `docs/oracle-free-deployment.md`
**Target Environment:** Oracle Cloud Infrastructure (OCI) Always Free
**Compute Architecture:** Ampere A1 Compute (ARM64 Ubuntu 24.04 / 22.04 LTS)
**Cost:** $0.00 / month Guaranteed

---

## 1. Overview & Free-Tier Specifications

Oracle Cloud Infrastructure (OCI) provides one of the most generous Always Free compute offerings in the cloud industry. This deployment guide enables hosting the complete Stech WhatsApp Business CRM at **zero cost** within published Always Free limits.

### Always Free Compute & Storage Allowance
- **Ampere A1 Compute:** Up to 4 OCPU and 24 GB RAM (can be split or combined into a single VM).
- **Block Storage:** 200 GB total free boot volume storage.
- **Outbound Bandwidth:** 10 TB per month free outbound data transfer.
- **Public IPv4:** 1 free ephemeral or reserved public IPv4 address per compute instance.
- **Cost:** $0.00 / month forever, provided resources remain tagged as "Always Free Eligible".

---

## 2. Step-by-Step Operator Instructions

### Step 1: Oracle Cloud Account Creation & Home Region Selection

1. Navigate to [https://www.oracle.com/cloud/free/](https://www.oracle.com/cloud/free/).
2. Click **Start for free**.
3. Enter your country, name, and email address.
4. **Payment Card Verification:**
   - *Requirement Notice:* Oracle requires a valid payment card (credit or debit) during signup solely for identity verification and anti-fraud purposes.
   - *Temporary Hold:* A temporary hold of ~$1.00 USD (or local equivalent) may appear and is immediately reversed.
   - *Billing Protection:* You will **not** be charged unless you explicitly upgrade to a Paid Pay-As-You-Go account. Always select resources labeled **"Always Free Eligible"**.
5. **Select Home Region Wisely:**
   - Choose a home region physically closest to your primary user base (e.g., `US East (Ashburn)`, `Frankfurt`, `Mumbai`, etc.).
   - *Important:* Always Free Ampere A1 capacity is tied to your selected Home Region and cannot be changed later.

---

### Step 2: Generate SSH Keypair (Windows PowerShell)

Before launching the instance, generate a modern Ed25519 SSH keypair on your local Windows PC:

```powershell
# Open PowerShell on your Windows workstation
# Create the .ssh directory if it does not already exist
New-Item -ItemType Directory -Force -Path "$HOME\.ssh"

# Generate an Ed25519 keypair specifically for your Oracle CRM instance
ssh-keygen -t ed25519 -f "$HOME\.ssh\id_oracle_crm" -C "stech-crm-oracle"
```

When prompted for a passphrase, you may enter a secure passphrase or press `Enter` for none.

View and copy your **Public Key** (you will paste this into the Oracle Console):
```powershell
Get-Content "$HOME\.ssh\id_oracle_crm.pub"
```
> [!CAUTION]
> Never share or upload your private key (`id_oracle_crm`). Only provide the public key (`id_oracle_crm.pub`) to Oracle.

---

### Step 3: Provision the Always Free ARM Instance

1. In the Oracle Cloud Console, navigate to **Compute > Instances > Create Instance**.
2. **Name:** Enter `stech-crm-production` (or `stech-crm-staging`).
3. **Compartment:** Select your root compartment.
4. **Placement:** Default Availability Domain.
5. **Image and Shape:**
   - Click **Edit Image and Shape**.
   - **Image:** Click **Change Image** > Select **Ubuntu** > Choose **Ubuntu 24.04** or **Ubuntu 22.04 Minimal/Full** (Label must display *Always Free Eligible*).
   - **Shape:** Click **Change Shape** > Select **Ampere (ARM Processor)** > Check **VM.Standard.A1.Flex**.
   - Configure Allocation:
     - **OCPUs:** `2` (or up to `4`)
     - **Memory (GB):** `6` (or up to `24`)
     - Verify the green badge: **"Always Free Eligible"**.
6. **Networking:**
   - Select **Create new virtual cloud network (VCN)**.
   - Select **Create new public subnet**.
   - Ensure **Assign a public IPv4 address** is set to **Yes**.
7. **Add SSH Keys:**
   - Select **Paste public keys**.
   - Paste the public key string copied from `id_oracle_crm.pub`.
8. **Boot Volume:**
   - Default 50 GB to 100 GB (must be $\le 200$ GB total across tenancy).
9. Click **Create**.

> [!NOTE]
> *Capacity Notice:* If Oracle returns an error indicating "Out of capacity for shape VM.Standard.A1.Flex", switch to another Availability Domain within your region, reduce OCPUs to 2, or retry after a short interval.

---

### Step 4: Configure Oracle VCN Security Ingress Rules

By default, Oracle VCN firewalls block all inbound traffic except port 22 (SSH). You must allow web traffic:

1. In the Oracle Console, go to **Networking > Virtual Cloud Networks**.
2. Click your VCN > Click **Security Lists** > Select **Default Security List for your VCN**.
3. Under **Ingress Rules**, click **Add Ingress Rules**:
   - **Rule 1 (HTTP):**
     - Source CIDR: `0.0.0.0/0`
     - IP Protocol: `TCP`
     - Destination Port Range: `80`
     - Description: `Allow Inbound HTTP`
   - **Rule 2 (HTTPS):**
     - Source CIDR: `0.0.0.0/0`
     - IP Protocol: `TCP`
     - Destination Port Range: `443`
     - Description: `Allow Inbound HTTPS`
4. Click **Add Ingress Rules**.
> [!IMPORTANT]
> Do NOT open port `5432` (PostgreSQL) in the security list. Database traffic must remain strictly internal to the Docker network.

---

### Step 5: Connect via SSH and Configure Host Firewall

Note the **Public IP Address** displayed on your instance page in the Oracle Console.

From Windows PowerShell:
```powershell
$ORACLE_IP = "<PASTE_YOUR_INSTANCE_PUBLIC_IP>"
ssh -i "$HOME\.ssh\id_oracle_crm" ubuntu@$ORACLE_IP
```

Once connected to the Ubuntu terminal, synchronize Ubuntu's internal firewall (iptables/netfilter) with your VCN rules:

```bash
# Update and upgrade packages
sudo apt update && sudo apt upgrade -y

# Configure iptables rules to allow HTTP and HTTPS
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save 2>/dev/null || sudo apt-get install -y iptables-persistent
```

---

### Step 6: Install Docker Engine and Docker Compose

Install Docker using the official Docker APT repository for Ubuntu:

```bash
# Remove conflicting packages
for pkg in docker.io docker-doc docker-compose docker-compose-v2 podman-docker containerd runc; do sudo apt-get remove -y $pkg; done

# Add Docker's official GPG key and repository
sudo apt update
sudo apt install -y ca-certificates curl gnupg git
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker packages
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Enable non-root Docker usage
sudo usermod -aG docker $USER
newgrp docker

# Verify Docker and Compose installations
docker --version
docker compose version
```

---

### Step 7: Clone Repository & Configure Environment

Clone the free deployment branch directly to the VM:

```bash
cd /home/ubuntu
git clone -b feature/free-cloud-deployment https://github.com/irs682/whatsapp-business-crm.git
cd whatsapp-business-crm

# Create the staging environment configuration from the template
cp server/.env.free.example server/.env.free
```

Generate secure, random cryptographic secrets for JWT and PostgreSQL:

```bash
# Generate high-entropy secrets
DB_PASS=$(openssl rand -hex 24)
JWT_SECRET=$(openssl rand -hex 32)

# Update server/.env.free with generated secrets
sed -i "s/REPLACE_WITH_STRONG_FREE_TIER_PASSWORD/$DB_PASS/g" server/.env.free
sed -i "s/REPLACE_WITH_GENUINE_64_CHAR_HEX_OR_BASE64_RANDOM_SECRET/$JWT_SECRET/g" server/.env.free
```

Verify the contents of `server/.env.free`:
```bash
cat server/.env.free | grep -E "NODE_ENV|PORT|POSTGRES|WHATSAPP_MODE"
```

---

### Step 8: Build Containers & Apply Database Migrations

Launch the database container first, verify health, and deploy Prisma migrations:

```bash
# Start PostgreSQL service
docker compose -f docker-compose.free.yml up -d postgres

# Wait for PostgreSQL healthcheck to become healthy
docker compose -f docker-compose.free.yml ps

# Run Prisma migrations using a one-off server container
docker compose -f docker-compose.free.yml run --rm server npx prisma migrate deploy

# Seed initial administrative roles and departments if required
docker compose -f docker-compose.free.yml run --rm server node scripts/seed.js || true

# Start remaining services (Backend API and Frontend Nginx)
docker compose -f docker-compose.free.yml up -d --build
```

Verify running containers:
```bash
docker compose -f docker-compose.free.yml ps
```
All three containers (`crm_free_postgres`, `crm_free_server`, `crm_free_client`) should display status **Up (healthy)**.

---

### Step 9: Configure Zero-Cost HTTPS

A bare IP address cannot establish trusted HTTPS certificates. To provide secure HTTPS without purchasing a domain, choose one of these two free methods:

#### Method A: DuckDNS / nip.io with Free Let's Encrypt (Recommended for Direct Public IP)
1. Register a free account at [https://www.duckdns.org/](https://www.duckdns.org/).
2. Create a free subdomain: e.g., `stech-crm.duckdns.org` pointing to your Oracle VM public IP.
3. Install Certbot on the Ubuntu host:
   ```bash
   sudo apt install -y certbot
   sudo certbot certonly --standalone -d stech-crm.duckdns.org --pre-hook "docker stop crm_free_client" --post-hook "docker start crm_free_client"
   ```
4. Mount the certificates into `client/nginx.conf` or terminate SSL via host Nginx.

#### Method B: Cloudflare Named Tunnel (Zero Open Inbound Ports, Free Cloudflare SSL)
1. Sign up for a free Cloudflare account at [https://dash.cloudflare.com/](https://dash.cloudflare.com/).
2. Add a free domain or use Cloudflare Tunnel to expose `http://localhost:80`.
3. Cloudflare automatically provides an edge SSL/TLS certificate with zero server configuration.

---

### Step 10: Post-Deployment Verification Checklist

Execute these checks to verify end-to-end functionality:

```bash
# 1. Check Backend Health Endpoint
curl -i http://localhost/api/v1/health

# 2. Check Client HTTP Response
curl -i http://localhost/

# 3. Verify Database Container is Isolated (Should NOT respond on host 5432)
nc -zv 127.0.0.1 5432 || echo "PostgreSQL correctly private"

# 4. Check Container Resource Consumption
docker stats --no-stream
```

Open your browser to `http://<ORACLE_PUBLIC_IP>` or `https://<YOUR_FREE_DOMAIN>`:
1. Log in with initial administrative credentials.
2. Navigate to **Contacts**, **Leads**, and **Shared Inbox**.
3. Verify real-time Socket.IO connection status badge in the UI.
4. Check that audit logs record the login event.
