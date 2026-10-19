# Stech WhatsApp Business CRM — Phase 7 User Acceptance Testing (UAT) Plan

**Document Version:** 1.0.0  
**Test Framework:** Structured Scenario Verification  
**Evaluation Target:** Stech WhatsApp Business CRM Release Candidate  
**Client Acceptance Status:** Pending Client Review & Sign-Off  

---

## 1. UAT Roles & Permission Mapping

The CRM system enforces role-based access control (RBAC) across six operational personas using the four seeded system roles (`SUPER_ADMIN`, `ADMIN`, `MANAGER`, `AGENT`):

| Persona | System Role | Primary Responsibilities |
| :--- | :--- | :--- |
| **Super Admin** | `SUPER_ADMIN` | Tenant management, system configuration, global audit logs, full access. |
| **System Admin** | `ADMIN` | User accounts, department definitions, integration settings, system-wide CRM. |
| **Department Manager** | `MANAGER` | Team oversight, conversation assignment, department analytics, campaign approval. |
| **Support / Sales Agent** | `AGENT` | Contact management, lead tracking, conversation claiming, outbound replies, tasks. |
| **Marketing Specialist** | `MANAGER` | Audience segmentation, campaign preparation, template variable mapping. |
| **Campaign Approver** | `ADMIN` / `MANAGER` | Reviewing marketing dispatches, maker-checker approval/rejection. |

---

## 2. UAT Scenarios & Execution Matrix

### Scenario UAT-01: Staff Authentication & Session Security
- **Requirement Ref:** SRS-SEC-01 (Authentication)
- **Tester:** QA Lead
- **Preconditions:** Active user account exists in database.
- **Steps:**
  1. Navigate to `/login`.
  2. Input valid credentials (`admin@crm.local` / `Admin123!`).
  3. Submit login form.
- **Expected Outcome:** Valid JWT issued, stored securely; redirected to Dashboard.
- **Status:** **PASS** (Verified in automated suite `tests/auth.test.js`)

---

### Scenario UAT-02: Role Privilege Boundary Enforcement
- **Requirement Ref:** SRS-SEC-02 (RBAC Controls)
- **Tester:** Security Engineer
- **Preconditions:** Agent authenticated session.
- **Steps:**
  1. Agent attempts to call `GET /api/v1/users` or `DELETE /api/v1/departments/:id`.
- **Expected Outcome:** Server rejects with `403 Forbidden` (`You lack necessary permissions`).
- **Status:** **PASS** (Verified in `phase7-e2e-business-workflows.test.js`)

---

### Scenario UAT-03: Departmental Inbox Isolation
- **Requirement Ref:** SRS-CRM-03 (Department Isolation)
- **Tester:** QA Lead
- **Preconditions:** Conversation exists in Department B (`Sales`). Agent assigned only to Department A (`Support`).
- **Steps:**
  1. Agent in Dept A attempts to view or claim conversation in Dept B.
- **Expected Outcome:** Server rejects with `403 Forbidden` (`You do not have access to conversations belonging to unauthorized departments`).
- **Status:** **PASS** (Verified in `phase3-shared-inbox.test.js` & `phase7-e2e-business-workflows.test.js`)

---

### Scenario UAT-04: Contact Lifecycle & Tagging
- **Requirement Ref:** SRS-CRM-01 (Contact Management)
- **Tester:** CRM Specialist
- **Preconditions:** Authenticated agent session.
- **Steps:**
  1. Create new contact with phone, email, and company.
  2. Attach tags (`VIP-Enterprise`).
- **Expected Outcome:** Contact persisted with unique phone number and associated tags.
- **Status:** **PASS** (Verified in `phase2-crm-core.test.js`)

---

### Scenario UAT-05: Lead Pipeline Advance & Task Follow-Up
- **Requirement Ref:** SRS-CRM-02 (Lead & Pipeline Tracking)
- **Tester:** Sales Representative
- **Preconditions:** Contact created in CRM.
- **Steps:**
  1. Create lead with value $45,000 in `NEW` stage.
  2. Advance stage to `QUALIFIED`.
  3. Create follow-up task assigned to staff.
- **Expected Outcome:** Lead history updated in activity logs; task appears in agent queue.
- **Status:** **PASS** (Verified in `phase2-crm-core.test.js`)

---

### Scenario UAT-06: Shared Inbox Conversation Ingestion
- **Requirement Ref:** SRS-MSG-01 (Inbound Ingestion)
- **Tester:** Support Agent
- **Preconditions:** Inbound customer message arrives via WhatsApp webhook.
- **Steps:**
  1. Verify conversation appears in Unassigned queue.
  2. Verify contact details match incoming phone number.
- **Expected Outcome:** Message rendered in timeline with timestamp and `INBOUND` direction.
- **Status:** **PASS** (Verified in `phase3-shared-inbox.test.js`)

---

### Scenario UAT-07: Conversation Claim & Assignment
- **Requirement Ref:** SRS-MSG-02 (Agent Assignment)
- **Tester:** Support Agent
- **Preconditions:** Unassigned conversation in agent's primary department.
- **Steps:**
  1. Click "Claim Conversation".
- **Expected Outcome:** Conversation status advances to `OPEN`; assigned agent set to current user; Socket.IO broadcast notifies team.
- **Status:** **PASS** (Verified in `phase3-shared-inbox.test.js`)

---

### Scenario UAT-08: 24-Hour Customer Service Window Enforcement
- **Requirement Ref:** SRS-WA-02 (Meta Window Policy)
- **Tester:** Integration Engineer
- **Preconditions:** Customer sent message within last 24 hours.
- **Steps:**
  1. Agent submits free-form text reply.
- **Expected Outcome:** Allowed while within 24h window; rejected if window expired (> 24h since customer inbound message).
- **Status:** **PASS** (Verified in `phase4-whatsapp-cloud-api.test.js`)

---

### Scenario UAT-09: Departmental Conversation Transfer with Handover
- **Requirement Ref:** SRS-MSG-03 (Department Transfers)
- **Tester:** Support Agent
- **Preconditions:** Active conversation claimed in Support.
- **Steps:**
  1. Transfer conversation to Sales department with reason and handover summary.
- **Expected Outcome:** Conversation removed from Support inbox; appears in Sales inbox; handover summary saved as internal note.
- **Status:** **PASS** (Verified in `phase7-e2e-business-workflows.test.js`)

---

### Scenario UAT-10: Approved Template Messaging
- **Requirement Ref:** SRS-WA-03 (Template Dispatch)
- **Tester:** Marketing Specialist
- **Preconditions:** Approved Meta template exists in catalog.
- **Steps:**
  1. Select template `welcome_greeting`.
  2. Map parameters `{{1}}` to First Name, `{{2}}` to Company.
  3. Dispatch template to contact.
- **Expected Outcome:** Template validated against schema; outbound message created with `TEMPLATE` type.
- **Status:** **PASS** (Verified in `phase4-whatsapp-cloud-api.test.js`)

---

### Scenario UAT-11: Marketing Consent Recording & History
- **Requirement Ref:** SRS-MKT-01 (Marketing Compliance)
- **Tester:** Compliance Officer
- **Preconditions:** Contact exists in CRM.
- **Steps:**
  1. Record consent `GRANTED` with proof `Web Form #104`.
  2. Inspect consent history timeline.
- **Expected Outcome:** Contact marked eligible for marketing dispatches; audit trail reflects recording user and timestamp.
- **Status:** **PASS** (Verified in `phase5-campaign-automation.test.js`)

---

### Scenario UAT-12: Opt-Out Suppression Gate
- **Requirement Ref:** SRS-MKT-02 (STOP Opt-Out Compliance)
- **Tester:** QA Lead
- **Preconditions:** Contact previously granted consent.
- **Steps:**
  1. Contact revokes consent (`status: REVOKED` or inbound STOP).
  2. Run campaign broadcast targeting cohort that includes contact.
- **Expected Outcome:** Contact suppressed from recipient queue; zero WhatsApp messages dispatched to contact.
- **Status:** **PASS** (Verified in `phase5-campaign-automation.test.js` & `phase7-e2e-business-workflows.test.js`)

---

### Scenario UAT-13: Audience Segmentation
- **Requirement Ref:** SRS-MKT-03 (Audience Filters)
- **Tester:** Marketing Specialist
- **Preconditions:** Contacts seeded with tags and department affiliations.
- **Steps:**
  1. Create segment with filter `tags = ['VIP']` and `consentStatus = 'GRANTED'`.
  2. Preview eligible recipient count.
- **Expected Outcome:** Segment dynamically computes matching opt-in contacts.
- **Status:** **PASS** (Verified in `phase5-campaign-automation.test.js`)

---

### Scenario UAT-14: Maker-Checker Campaign Approval Workflow
- **Requirement Ref:** SRS-MKT-04 (Campaign Approvals)
- **Tester:** Marketing Specialist & Admin
- **Preconditions:** Draft campaign prepared.
- **Steps:**
  1. Specialist submits campaign for review (`PENDING_APPROVAL`).
  2. Specialist attempts to start campaign directly.
  3. Admin reviews and approves campaign (`APPROVED`).
- **Expected Outcome:** Starting draft/unapproved campaign rejected; approval state allows scheduling.
- **Status:** **PASS** (Verified in `phase5-campaign-automation.test.js`)

---

### Scenario UAT-15: Campaign Scheduling & Queue Execution
- **Requirement Ref:** SRS-MKT-05 (Asynchronous Job Execution)
- **Tester:** Operations Lead
- **Preconditions:** Approved campaign.
- **Steps:**
  1. Schedule campaign for future dispatch time.
  2. Queue worker claims pending send jobs atomically.
- **Expected Outcome:** Jobs dispatched according to configurable rate limits (`CAMPAIGN_RATE_LIMIT_DELAY_MS`).
- **Status:** **PASS** (Verified in `phase5-campaign-automation.test.js`)

---

### Scenario UAT-16: Executive Dashboard & Operational KPIs
- **Requirement Ref:** SRS-RPT-01 (Executive Analytics)
- **Tester:** General Manager
- **Preconditions:** Authenticated Manager/Admin session.
- **Steps:**
  1. Access Dashboard Overview.
- **Expected Outcome:** Displays real-time counts for active leads, open conversations, unassigned chats, response times, and campaign delivery rates.
- **Status:** **PASS** (Verified in `phase6-reporting-audit.test.js`)

---

### Scenario UAT-17: Chronological Audit Trail & Correlation
- **Requirement Ref:** SRS-AUD-01 (Audit Logging)
- **Tester:** Security Auditor
- **Preconditions:** Administrative user session.
- **Steps:**
  1. View `/api/v1/audit`.
  2. Search for specific user action or correlation ID.
- **Expected Outcome:** Audit record details previous state, new state, actor IP address, and timestamp.
- **Status:** **PASS** (Verified in `phase6-reporting-audit.test.js` & `phase7-e2e-business-workflows.test.js`)

---

### Scenario UAT-18: Audit Log CSV Export
- **Requirement Ref:** SRS-AUD-02 (Secure Export)
- **Tester:** Compliance Officer
- **Preconditions:** Administrative session.
- **Steps:**
  1. Request CSV export from `/api/v1/audit/export`.
- **Expected Outcome:** HTTP 200 with `text/csv` stream and RFC-compliant attachment filename; audit export action self-logged in audit trail.
- **Status:** **PASS** (Verified in `phase6-reporting-audit.test.js`)

---

## 3. Client Sign-Off & Handover Formalities

| Milestone Acceptance Gate | Evaluator | Sign-Off Status | Date |
| :--- | :--- | :--- | :--- |
| **Technical Specification Compliance** | Stech QA Automation Lead | **ACCEPTED** (82 / 82 Tests Pass) | 2026-10-20 |
| **Security & RBAC Enforcement** | Stech Security Lead | **ACCEPTED** (Zero Vulnerabilities) | 2026-10-20 |
| **User Acceptance Testing (UAT)** | Client Project Sponsor | *Awaiting Client Trial Session* | Pending Handover |
| **Production Launch Authorization** | Client Commercial Director | *Blocked by Meta Credentials* | Pending Credentials |
