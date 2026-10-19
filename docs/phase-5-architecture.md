# Phase 5 Architecture — Marketing Campaigns, Audience Segmentation, Scheduling & Automation

## 1. Overview & Architectural Vision
Phase 5 introduces enterprise-grade WhatsApp outbound marketing, audience segmentation, durable campaign queues, maker-checker governance, real-time consent enforcement, customer response attribution, and trigger-based marketing automations to Stech WhatsApp Business CRM.

The module is architected for strict Meta Business Policy compliance, high resilience under high throughput, department isolation, and zero unsolicited messaging risk.

```
                      ┌────────────────────────────────────────┐
                      │           Admin / Marketer UI          │
                      │  (Campaigns, Segments, Automations)   │
                      └───────────────────┬────────────────────┘
                                          │ REST API
                                          ▼
                      ┌────────────────────────────────────────┐
                      │    Express REST Controllers & RBAC     │
                      │   (Permissions & Dept Data Scoping)    │
                      └───────────────────┬────────────────────┘
                                          │
                      ┌───────────────────▼────────────────────┐
                      │            Campaign Service            │
                      │   - State Machine & Approvals          │
                      │   - Dynamic Audience Calculation       │
                      │   - Audit & Activity Logging           │
                      └───────┬────────────────────────┬───────┘
                              │                        │
               Audience Query │                        │ Snapshot & Schedule
                              ▼                        ▼
               ┌──────────────────────┐       ┌──────────────────────┐
               │    Segment Service   │       │    Campaign Queue    │
               │ (Tag, Stage, Consent)│       │ (Durable DB Worker)  │
               └──────────────┬───────┘       └──────────┬───────────┘
                              │                          │
                              ▼                          │ Real-time Consent Check
               ┌──────────────────────┐                  │ & Rate-limited Dispatch
               │   Consent Service    │◄─────────────────┘
               │ (Opt-in, REVOKED)    │
               └──────────────────────┘
                              │
                              ▼ Outbound Meta Message
               ┌────────────────────────────────────────┐
               │     WhatsApp Service (Meta Graph API)  │
               └──────────────────┬─────────────────────┘
                                  │
                                  ▼
               ┌────────────────────────────────────────┐
               │      Inbound Webhook Controller        │
               │   - STOP / UNSUBSCRIBE Keyword Opt-Out │
               │   - Response Attribution Tracking      │
               └──────────────────┬─────────────────────┘
                                  │
                                  ▼
               ┌────────────────────────────────────────┐
               │         Marketing Automation           │
               │ (Trigger Evaluation -> CRM Task Action)│
               └────────────────────────────────────────┘
```

---

## 2. Core Subsystems

### 2.1 Dynamic Audience Segmentation Engine
- **Filter Criteria**: Tag matching (`hasSome`), lead lifecycle stage (`LEAD_STAGE_CHANGED`), owner isolation, and strict affirmative consent filtering (`consentStatus = 'GRANTED'`, `isOptedOut = false`).
- **Live Previewing**: Pre-send query execution calculates exact total audience count, eligible recipient count, and suppressed contact count without modifying contact or campaign records.
- **Department Isolation**: Segment visibility and filtering automatically inherit the operator's active departmental permissions (`ADMIN` and `SUPER_ADMIN` retain global tenant oversight).

### 2.2 Maker-Checker Approval Governance
To prevent accidental or non-compliant marketing blasts:
1. An Agent or Manager creates a campaign in `DRAFT` status.
2. The campaign is submitted for review (`PENDING_APPROVAL`).
3. An authorized manager or administrator approves (`APPROVED`) or rejects (`REJECTED`) with a required comment.
4. **Self-Approval Prevention**: The author cannot approve their own campaign when running under multi-user enforcement.
5. **Invalidation on Edit**: Any modification to template, parameters, or audience invalidates prior approval, resetting status to `DRAFT`.

### 2.3 Durable Queue Worker & Rate Limiter
- **Durable Persistence**: All scheduled and running campaign recipients are snapshotted into `campaign_recipients` and `campaign_send_jobs` in PostgreSQL.
- **Fail-Safe Worker Loop**: An in-process background worker polls pending jobs in batches of 10.
- **Adaptive Rate Limiting**: Inter-message delay (50ms) enforces compliance with Meta's 20-80 msg/sec WhatsApp tier thresholds.
- **Real-Time Pre-Send Consent Re-Check**: Immediately before calling Meta Graph API, the worker re-queries the contact's live record. If consent was revoked between scheduling and actual dispatch, the send is aborted and recipient status is marked `SUPPRESSED`.

### 2.4 Customer Response Attribution & Opt-Out Ingestion
- Inbound webhook processing correlates inbound customer messages against recent campaign recipients (`contactId` match within recent window).
- **Keyword Suppression**: Inbound keywords (`STOP`, `UNSUBSCRIBE`, `CANCEL`, `QUIT`, `OPT OUT`) trigger immediate contact opt-out, set `consentStatus: REVOKED`, log an immutable consent record, and increment campaign `optOutCount`.
- **Engagement Analytics**: Conversational replies increment campaign `repliedCount` and open/re-open conversations in the Shared Team Inbox with campaign attribution tags.

### 2.5 Trigger-Based Marketing Automation
- Configurable rules listen to CRM lifecycle events (`LEAD_STAGE_CHANGED`, `CONTACT_CREATED`, `CONSENT_REVOKED`, `CAMPAIGN_REPLY`).
- When conditions match (e.g., stage equals `WON`), automated actions (such as generating high-priority follow-up tasks or alerts) are asynchronously dispatched and audited in `automation_executions`.
