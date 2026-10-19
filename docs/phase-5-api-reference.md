# Phase 5 API Reference — Marketing Campaigns & Automation

All endpoints require standard Bearer Authentication (`Authorization: Bearer <token>`) and are prefixed with `/api/v1`.

---

## 1. Audience Segmentation Endpoints

### `POST /api/v1/marketing/segments/preview`
Calculates real-time estimated audience count and sample contacts based on dynamic filters.
- **Permission**: `segments:read` or `campaigns:create`
- **Request Body**:
  ```json
  {
    "filters": {
      "tags": ["VIP"],
      "leadStages": ["WON"],
      "consentOnly": true,
      "isOptedOut": false
    },
    "page": 1,
    "limit": 10
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Audience preview generated",
    "data": {
      "totalAudience": 250,
      "eligibleCount": 240,
      "suppressedCount": 10,
      "sampleContacts": [...]
    }
  }
  ```

### `POST /api/v1/marketing/segments`
Saves a reusable audience segment definition.
- **Permission**: `segments:create`

### `GET /api/v1/marketing/segments`
Lists saved segments with pagination, search, and department scoping.
- **Permission**: `segments:read`

---

## 2. Marketing Consent Endpoints

### `GET /api/v1/contacts/:id/marketing-consent`
Retrieves current marketing eligibility and opt-out state for a contact.
- **Permission**: `contacts:read`

### `POST /api/v1/contacts/:id/marketing-consent`
Records affirmative opt-in or revocation of marketing consent with immutable audit trail.
- **Permission**: `contacts:update` or `campaigns:create`
- **Request Body**:
  ```json
  {
    "status": "GRANTED",
    "source": "WEB_FORM",
    "proof": "Form #91823 checkbox agreed",
    "notes": "User opted in via website"
  }
  ```

### `GET /api/v1/contacts/:id/consent-history`
Returns chronological audit ledger of all consent modifications for the contact.
- **Permission**: `contacts:read`

---

## 3. WhatsApp Campaign Endpoints

### `GET /api/v1/campaigns`
Paginated search and filter for marketing campaigns.
- **Permission**: `campaigns:read`

### `POST /api/v1/campaigns`
Creates a new draft campaign with template and audience mappings.
- **Permission**: `campaigns:create`

### `POST /api/v1/campaigns/:id/submit-approval`
Submits draft campaign for administrative maker-checker review.
- **Permission**: `campaigns:create` or `campaigns:update`

### `POST /api/v1/campaigns/:id/approve`
Approves campaign for scheduling/launch (enforces non-self approval).
- **Permission**: `campaigns:approve`

### `POST /api/v1/campaigns/:id/reject`
Rejects campaign with mandatory rejection reason.
- **Permission**: `campaigns:approve`

### `POST /api/v1/campaigns/:id/schedule`
Schedules approved campaign for future execution.
- **Permission**: `campaigns:schedule`
- **Request Body**:
  ```json
  {
    "scheduledAt": "2026-11-01T10:00:00.000Z",
    "timezone": "America/New_York"
  }
  ```

### `POST /api/v1/campaigns/:id/start`
Snapshots audience into durable queue and launches dispatch worker.
- **Permission**: `campaigns:start`

### `POST /api/v1/campaigns/:id/pause`
Pauses running campaign worker execution.
- **Permission**: `campaigns:pause`

### `POST /api/v1/campaigns/:id/resume`
Resumes paused campaign.
- **Permission**: `campaigns:resume`

### `POST /api/v1/campaigns/:id/cancel`
Permanently cancels campaign execution and cancels pending queue jobs.
- **Permission**: `campaigns:cancel`

### `GET /api/v1/campaigns/:id/results`
Returns comprehensive performance metrics (total, sent, delivered, read, failed, replies, opt-outs).
- **Permission**: `campaigns:read`

### `GET /api/v1/campaigns/:id/recipients`
Paginated inspectable recipient delivery ledger.
- **Permission**: `campaigns:read`

---

## 4. Marketing Automation Endpoints

### `GET /api/v1/marketing/automations`
Lists configured trigger rules.
- **Permission**: `automations:read`

### `POST /api/v1/marketing/automations`
Creates an automated rule (e.g., Lead Stage Changed -> Create CRM Task).
- **Permission**: `automations:create`
