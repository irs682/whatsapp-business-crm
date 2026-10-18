# WhatsApp Business CRM - API Specification (REST v1)

All endpoints are prefixed with `/api/v1` and communicate via JSON payloads.

## 1. Standard Response Envelope

All API endpoints return a predictable JSON envelope:

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {},
  "meta": {
    "pagination": {
      "total": 120,
      "page": 1,
      "limit": 20,
      "totalPages": 6,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "phone",
      "message": "Phone number is required"
    }
  ]
}
```

## 2. Authentication Endpoints

### `POST /api/v1/auth/register`
- **Access**: Public / Development setup
- **Body**:
  ```json
  {
    "email": "agent@crm.local",
    "password": "Password123!",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890",
    "roleName": "AGENT"
  }
  ```

### `POST /api/v1/auth/login`
- **Access**: Public (Rate-limited: 20 req / 15 min)
- **Body**:
  ```json
  {
    "email": "admin@crm.local",
    "password": "Admin123!"
  }
  ```

### `GET /api/v1/auth/me`
- **Access**: Authenticated (Bearer Token)
- **Returns**: Current user profile, role, departments, and permission slugs.

---

## 3. CRM Core Endpoints

### Contacts (`/api/v1/contacts`)
- `GET /` — List contacts (query params: `page`, `limit`, `search`, `tag`, `consentStatus`, `isOptedOut`)
- `POST /` — Create contact (`phone`, `waId`, `firstName`, `lastName`, `email`, `tags`, `customFields`)
- `GET /:id` — Get single contact with recent conversations and notes
- `PATCH /:id` — Update contact fields or opt-out status
- `DELETE /:id` — Soft delete / archive contact

### Leads (`/api/v1/leads`)
- `GET /` — List leads (query params: `stage`, `contactId`, `assignedToUserId`, `departmentId`)
- `POST /` — Create lead (`contactId`, `title`, `value`, `currency`, `stage`, `source`, `assignedToUserId`)
- `GET /:id` — Get lead details with contact and agent metadata
- `PATCH /:id` — Advance stage, update value, or reassign
- `DELETE /:id` — Remove lead

### Departments (`/api/v1/departments`)
- `GET /` — List all active departments
- `POST /` — Create department (`name`, `description`, `isActive`)
- `GET /:id` — Department details and assigned agents
- `PATCH /:id` — Update department
- `DELETE /:id` — Deactivate department

### Users (`/api/v1/users`)
- `GET /` — List users (`page`, `limit`, `search`, `role`, `status`)
- `POST /` — Create user (`email`, `password`, `firstName`, `lastName`, `roleId`, `departmentIds`)
- `GET /:id` — User profile and assigned tickets
- `PATCH /:id` — Update profile or role
- `DELETE /:id` — Deactivate user

---

## 4. WhatsApp Webhook Endpoints

### `GET /api/v1/webhooks/whatsapp`
- **Description**: Verifies webhook URL with Meta Graph API using `hub.challenge` and `hub.verify_token`.

### `POST /api/v1/webhooks/whatsapp`
- **Description**: Receives incoming messages and delivery status updates from Meta servers.
