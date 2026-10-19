# Phase 5 Database Design & Migration Specification

## 1. Schema Extensions & Relationships
The Phase 5 database design introduces persistent models for marketing segments, campaign execution tracking, maker-checker approvals, recipient lifecycle tracking, durable queue send jobs, activity audit logging, opt-in consent history, and marketing automations.

```
┌─────────────────────┐       ┌──────────────────────┐
│  MarketingSegment   │◄──────┤       Campaign       │
└─────────────────────┘       └──────────┬───────────┘
                                         │ 1:N
                                         ├───► CampaignApproval
                                         │ 1:N
                                         ├───► CampaignRecipient (@@unique([campaignId, contactId]))
                                         │ 1:N        │ 1:N
                                         │            ▼
                                         ├───► CampaignSendJob
                                         │ 1:N
                                         └───► CampaignActivityLog

┌─────────────────────┐       ┌──────────────────────┐
│       Contact       │◄──────┤       Consent        │ (Immutable Audit Trail)
└─────────────────────┘       └──────────────────────┘

┌──────────────────────────────┐
│   MarketingAutomationRule    │◄─── AutomationExecution
└──────────────────────────────┘
```

---

## 2. Model Definitions

### 2.1 MarketingSegment
- `id`: UUID (Primary Key)
- `name`: String
- `description`: String?
- `filters`: JSON (dynamic tags, leadStages, sources, consent requirements)
- `departmentId`: UUID? (Foreign Key -> Department)
- `createdById`: UUID (Foreign Key -> User)
- `isArchived`: Boolean (default `false`)
- `createdAt`, `updatedAt`, `deletedAt`: DateTime

### 2.2 Campaign
- `id`: UUID (Primary Key)
- `name`: String
- `description`: String?
- `type`: Enum `CampaignType` (`BROADCAST`, `DRIP`)
- `templateId`: UUID (Foreign Key -> MessageTemplate)
- `audienceSegmentId`: UUID? (Foreign Key -> MarketingSegment)
- `departmentId`: UUID? (Foreign Key -> Department)
- `createdById`: UUID (Foreign Key -> User)
- `approvedById`: UUID? (Foreign Key -> User)
- `status`: Enum `CampaignStatus` (`DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `SCHEDULED`, `RUNNING`, `PAUSED`, `COMPLETED`, `CANCELLED`, `REJECTED`, `FAILED`)
- `timezone`: String (default `'UTC'`)
- `parameters`: JSON (mapping `{{1}}` to contact attributes)
- `scheduledAt`, `startedAt`, `completedAt`, `pausedAt`, `cancelledAt`: DateTime?
- `totalRecipients`, `eligibleCount`, `suppressedCount`, `sentCount`, `deliveredCount`, `readCount`, `failedCount`, `repliedCount`, `optOutCount`: Int (default 0)

### 2.3 CampaignRecipient
- `id`: UUID (Primary Key)
- `campaignId`: UUID (Foreign Key -> Campaign, Cascade Delete)
- `contactId`: UUID (Foreign Key -> Contact, Cascade Delete)
- `phone`: String?
- `waMessageId`: String? (Meta Graph API Message ID)
- `recipientStatus`: Enum `CampaignRecipientStatus` (`QUEUED`, `PROCESSING`, `SENT`, `DELIVERED`, `READ`, `FAILED`, `SUPPRESSED`, `SKIPPED`)
- `errorDetails`: String?
- `sentAt`, `deliveredAt`, `readAt`, `failedAt`: DateTime?
- Constraint: `@@unique([campaignId, contactId])`

### 2.4 CampaignSendJob
- `id`: UUID (Primary Key)
- `campaignId`: UUID (Foreign Key -> Campaign, Cascade Delete)
- `recipientId`: UUID (Foreign Key -> CampaignRecipient, Cascade Delete)
- `status`: Enum `JobStatus` (`PENDING`, `CLAIMED`, `COMPLETED`, `FAILED`, `CANCELLED`)
- `attempts`: Int (default 0)
- `maxAttempts`: Int (default 3)
- `nextAttemptAt`: DateTime (default `now()`)
- `lockedAt`: DateTime?
- `lastError`: String?
- Index: `@@index([status, nextAttemptAt])`

### 2.5 Consent (Opt-in & Opt-out Audit Ledger)
- `id`: UUID (Primary Key)
- `contactId`: UUID (Foreign Key -> Contact, Cascade Delete)
- `source`: String (`WEB_FORM`, `KEYWORD_STOP`, `MANUAL_STAFF`, `IMPORT`)
- `status`: Enum `ConsentStatus` (`PENDING`, `GRANTED`, `REVOKED`)
- `marketingEligible`: Boolean
- `optOutAt`: DateTime?
- `proof`: String? (Document reference, signed form, or keyword text)
- `actorId`: UUID? (Foreign Key -> User)
- `notes`: String?
- Timestamp: `createdAt`, `updatedAt`

### 2.6 MarketingAutomationRule & AutomationExecution
- `MarketingAutomationRule`: `triggerType` (`LEAD_STAGE_CHANGED`, `CONTACT_CREATED`, `CAMPAIGN_REPLY`, `CONSENT_REVOKED`), `conditions` (JSON), `actionType` (`CREATE_TASK`, `SEND_TEMPLATE`, `ASSIGN_DEPARTMENT`, `SUPPRESS_CONTACT`), `actionConfig` (JSON).
- `AutomationExecution`: `ruleId`, `contactId`, `status` (`SUCCESS`, `FAILED`), `executionDetails` (JSON), `error` (String?).
