# Phase 4 REST API Reference: WhatsApp Cloud API

Base URL: `/api/v1`

---

## 1. Webhook Endpoints (Public / Meta Signed)

### 1.1 Webhook Subscription Verification
- **Method & Path**: `GET /webhooks/whatsapp`
- **Authentication**: Meta Hub verification query parameters.
- **Query Parameters**:
  - `hub.mode`: `"subscribe"`
  - `hub.verify_token`: Verified against `WHATSAPP_VERIFY_TOKEN`.
  - `hub.challenge`: Echo challenge number.
- **Success Response**: `200 OK` (Echoes `hub.challenge` as plain text).
- **Error Response**: `403 Forbidden` (`Webhook verification token mismatch`).

### 1.2 Webhook Inbound Ingestion & Receipts
- **Method & Path**: `POST /webhooks/whatsapp`
- **Security**: Validates `X-Hub-Signature-256` HMAC-SHA256 signature using `WHATSAPP_APP_SECRET` against raw body.
- **Payload**: Standard Meta WhatsApp Business Account webhook packet.
- **Success Response**: `200 OK` `{ "success": true, "message": "EVENT_RECEIVED" }`
- **Error Response**: `401 Unauthorized` (`Missing/Invalid webhook signature`).

---

## 2. WhatsApp Integration Management (CRM Authenticated)

Requires Bearer token: `Authorization: Bearer <token>`.

### 2.1 Readiness Status
- **Method & Path**: `GET /integrations/whatsapp/status`
- **Permissions**: Authenticated user.
- **Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "enabled": true,
    "mode": "mock",
    "apiVersion": "v21.0",
    "phoneNumberIdConfigured": true,
    "phoneNumberIdMasked": "1048...1029",
    "businessAccountIdConfigured": true,
    "appSecretConfigured": true,
    "accessTokenConfigured": true,
    "verifyTokenConfigured": true,
    "webhookPath": "/api/v1/webhooks/whatsapp",
    "isReady": true
  }
}
```

### 2.2 List Approved WhatsApp Templates
- **Method & Path**: `GET /integrations/whatsapp/templates`
- **Permissions**: Authenticated user.
- **Response**: `200 OK` (List of approved message templates).

### 2.3 Synchronize Templates
- **Method & Path**: `POST /integrations/whatsapp/templates/sync`
- **Permissions**: `campaigns:manage`
- **Response**: `200 OK` (Seeds/refreshes standard pre-approved templates).

---

## 3. Outbound Conversation Messaging

Requires Bearer token: `Authorization: Bearer <token>`.

### 3.1 Send Free-Form WhatsApp Message
- **Method & Path**: `POST /conversations/:id/send-text`
- **Permissions**: `conversations:reply` (enforces 24-hour customer service window)
- **Body**:
```json
{
  "text": "Hello Sarah, looking into your order right now!"
}
```
- **Success Response**: `201 Created` (Returns message with `status: "SENT"` and `waMessageId`).
- **Policy Violation**: `422 Unprocessable Entity`
```json
{
  "success": false,
  "message": "Outside 24-hour customer service window. Free-form messaging disallowed; use pre-approved WhatsApp template."
}
```

### 3.2 Send Pre-Approved WhatsApp Template
- **Method & Path**: `POST /conversations/:id/send-template`
- **Permissions**: `conversations:reply` (Permitted even when 24h window is expired!)
- **Body**:
```json
{
  "templateName": "welcome_greeting",
  "languageCode": "en_US",
  "components": [
    {
      "type": "body",
      "parameters": [
        { "type": "text", "text": "Sarah" }
      ]
    }
  ]
}
```
- **Success Response**: `201 Created`
