# Phase 6 — Comprehensive Enterprise Audit Logging & Audit Viewer

## 1. Audit Framework Architecture
The Audit Logging system (`server/src/utils/auditLogger.js` and `server/src/modules/audit/`) records all security, governance, and business-critical operations.

### Audited Events
- User lifecycle: `USER_CREATED`, `USER_DEACTIVATED`, `ROLE_CHANGED`
- CRM mutations: `CONTACT_UPDATED`, `CONTACT_EXPORTED`, `LEAD_STAGE_CHANGED`
- Inbox routing: `CONVERSATION_ASSIGNED`, `CONVERSATION_TRANSFERRED`, `CONVERSATION_REOPENED`
- Campaign controls: `CAMPAIGN_APPROVED`, `CAMPAIGN_REJECTED`, `CAMPAIGN_STARTED`, `CAMPAIGN_CANCELLED`
- Governance: `CONSENT_GRANTED`, `CONSENT_REVOKED`
- Intelligence: `REPORT_EXPORTED`, `AUDIT_LOG_EXPORTED`

---

## 2. Redaction & Privacy
The audit logger recursively scrubs sensitive fields prior to database persistence:
- Stripped fields: `password`, `token`, `secret`, `jwt`, `apiKey`, `authorization`, `creditCard`
- Replaced with: `"[REDACTED]"`

---

## 3. Immutability & Access Control
- Audit records have **zero** update or delete endpoints in the API.
- Only users with the `audit:read` permission (Super Admin & Admin) are authorized to list, inspect, and export audit trails. Unauthorized requests receive a 403 Forbidden status.
