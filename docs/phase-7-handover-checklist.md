# Stech WhatsApp Business CRM — Phase 7 Client Handover & Training Guide

**Document Version:** 1.0.0  
**Project:** Stech WhatsApp Business CRM  
**Target Audience:** Client System Administrators, Operations Managers, Support Agents, and Marketing Teams  

---

## 1. System Administrator Guide

### 1.1 User & Department Administration
1. **Accessing User Management:** Log in as `SUPER_ADMIN` or `ADMIN` and navigate to **Settings > Users**.
2. **Inviting New Staff:** Click **Invite User**, specify user name, email, phone number, and assign a system role (`ADMIN`, `MANAGER`, or `AGENT`).
3. **Department Configuration:** Under **Settings > Departments**, create organizational units (e.g. *Technical Support*, *Sales*, *Billing*). Assign a Department Manager and link staff members.
4. **Department Isolation Policy:** Staff assigned to Department A cannot view conversations belonging to Department B unless transferred. Super Admins retain global visibility.

### 1.2 WhatsApp Integration & Account Connection
1. **Switching from Mock to Live Mode:**
   - In `server/.env.production`, set `WHATSAPP_MODE=production`.
   - Insert client credentials:
     - `WHATSAPP_PHONE_NUMBER_ID`
     - `WHATSAPP_BUSINESS_ACCOUNT_ID`
     - `WHATSAPP_ACCESS_TOKEN`
     - `WHATSAPP_APP_SECRET`
     - `WHATSAPP_VERIFY_TOKEN`
   - Restart server container: `docker compose -f docker-compose.production.yml restart server`.
2. **Webhook Verification in Meta Developer Portal:**
   - In the Meta App Dashboard, navigate to **WhatsApp > Configuration**.
   - Set **Callback URL** to `https://crm.yourcompany.com/api/v1/webhooks/whatsapp`.
   - Set **Verify Token** to the exact value configured in `WHATSAPP_VERIFY_TOKEN`.
   - Subscribe to the `messages` webhook field.

### 1.3 Database Backup & Operational Health
1. **Daily Backup:** The automated backup script runs nightly at 02:00 UTC via `scripts/db-backup.js`.
2. **Monitoring Health:**
   - Diagnostic status: `https://crm.yourcompany.com/api/v1/health`
   - Container readiness: `https://crm.yourcompany.com/api/v1/health/ready`
   - Error logs & audit trail: Navigate to **Settings > Audit Logs**.

---

## 2. Support & Sales Representative Guide (Agent)

### 2.1 Shared Inbox Daily Workflow
1. **Accessing Conversations:** Log in and navigate to **Shared Inbox**. Conversations are grouped into:
   - *Mine:* Conversations assigned directly to you.
   - *Unassigned:* Incoming customer messages waiting for team pickup.
   - *All Department:* All active conversations in your assigned department.
2. **Claiming a Conversation:** Select an unassigned chat and click **Claim Conversation**. This assigns the chat to you and advances status to `OPEN`.
3. **Customer Messaging & 24h Window:**
   - Reply to customers via the message box.
   - If the customer has sent a message within the last 24 hours, free-form text and media replies are permitted.
   - If the 24-hour customer service window has expired, the CRM prompts you to use an approved Meta Message Template.
4. **Quick Replies:** Type the shortcut (e.g. `/hours`, `/pricing`) or click the Quick Reply icon to insert pre-approved responses.
5. **Internal Notes:** Switch the chat tab to **Internal Notes** to leave private notes visible only to staff.
6. **Departmental Transfer:** If a conversation requires another team (e.g. Sales), click **Transfer**, choose the target department, and provide a handover summary.
7. **Resolving a Chat:** Once the customer's inquiry is complete, click **Resolve Conversation**.

---

## 3. Marketing Specialist Guide

### 3.1 Marketing Consent & Compliance
1. WhatsApp strictly enforces opt-in policies. Marketing broadcasts can only be sent to contacts with affirmative consent (`status: GRANTED`).
2. If a customer replies with "STOP" or requests an opt-out, their status is set to `REVOKED`. The system automatically suppresses them from all future campaigns.

### 3.2 Audience Segmentation & Campaign Creation
1. **Creating a Segment:** Navigate to **Marketing > Audience Segments**. Define filtering criteria (e.g. contacts with tag `VIP` who have granted consent).
2. **Creating a Campaign:**
   - Select **New Campaign**.
   - Choose Campaign Type (`BROADCAST`).
   - Select an Approved Meta Template (e.g. `seasonal_promotion`).
   - Map template placeholder variables (`{{1}}` -> First Name, `{{2}}` -> Company Name).
   - Link the target audience segment.
   - Click **Preview** to verify personalized rendering on sample contacts.

### 3.3 Maker-Checker Approval Workflow
1. Once prepared, the campaign status is `DRAFT`.
2. Click **Submit for Approval** (`PENDING_APPROVAL`).
3. An authorized Campaign Approver (`MANAGER` or `ADMIN`) reviews the campaign and clicks **Approve**.
4. Once approved, the campaign can be scheduled for dispatch.
5. The background worker throttles outgoing dispatches according to Meta rate limits (`CAMPAIGN_RATE_LIMIT_DELAY_MS`).

---

## 4. Technical Handover & Repository Specifications

| Repository Element | Specification Details |
| :--- | :--- |
| **Git Repository** | `https://github.com/irs682/whatsapp-business-crm` |
| **Starting Branch** | `feature/phase-6-reporting-analytics` |
| **Release Branch** | `feature/phase-7-production-readiness` |
| **Backend Runtime** | Node.js 20.x LTS Alpine (`server/Dockerfile`) |
| **Frontend Runtime** | React 18 / Vite 6 / Nginx Alpine (`client/Dockerfile`) |
| **Database Engine** | PostgreSQL 16.x Alpine (`crm_pgdata` volume) |
| **ORM & Migrations** | Prisma 5.22.0 (2 applied migrations, clean replay verified) |
| **Automated Tests** | 82 automated backend tests passing (`node --test tests/**/*.test.js`) |
| **Security Controls** | Timing-safe HMAC SHA-256 webhook signatures, bcrypt password hashing, RBAC |

---

## 5. Formal Handover Sign-Off Checklist

- [x] Full codebase, Docker assets, and CI/CD pipelines committed to release branch.
- [x] Zero critical defects or schema inconsistencies.
- [x] Comprehensive documentation delivered in `docs/`.
- [ ] Client provides live Meta Cloud API production credentials.
- [ ] Client schedules operator training session for support staff and marketing leads.
- [ ] Client conducts formal User Acceptance Testing (UAT) review.
- [ ] Formal commercial acceptance sign-off.
