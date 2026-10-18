# WhatsApp Cloud API Integration Layer

This directory houses the foundational integration between the **WhatsApp Business CRM** and Meta's **WhatsApp Cloud API** (Graph API v21.0+).

## Architecture Overview

```
server/src/integrations/whatsapp/
├── whatsapp.client.js      # Outbound HTTP client interacting with Meta Graph API
├── whatsapp.service.js     # Webhook parsing, customer care window checks, event dispatching
├── whatsapp.webhook.js    # Express route handler for Meta verification & inbound events
├── whatsapp.constants.js  # Protocol constants, delivery statuses, window limits
└── README.md              # Technical documentation & implementation mapping
```

## Route Endpoints

- `GET /api/v1/webhooks/whatsapp`: Webhook verification endpoint used when registering webhook URL inside Meta App Dashboard (`hub.mode`, `hub.verify_token`, `hub.challenge`).
- `POST /api/v1/webhooks/whatsapp`: Receives real-time events (inbound messages, status updates, delivery reports).

---

## Future Feature Implementation Map (Phase 4 Roadmap)

| Feature | Target Location | Architecture & Design Notes |
| :--- | :--- | :--- |
| **Meta Webhook Verification** | `whatsapp.service.js#verifyWebhook` | Validates `hub.verify_token` against `env.WHATSAPP_VERIFY_TOKEN` and echoes `hub.challenge`. |
| **Receiving Inbound Messages** | `whatsapp.service.js#handleWebhookEvent` | Parses `entry[].changes[].value.messages[]`. Auto-creates Contact if not existing, creates Conversation, persists Message record with `direction = INBOUND`. |
| **Delivery / Read Receipts** | `whatsapp.service.js#handleWebhookEvent` | Parses `entry[].changes[].value.statuses[]`. Updates Message record with matching `waMessageId` to `DELIVERED` or `READ`. |
| **Sending Free-form Messages** | `whatsapp.client.js#sendMessage` | Allowed only within the 24-hour customer care window. Formats JSON payload and POSTs to `/v21.0/{PHONE_NUMBER_ID}/messages`. |
| **Sending Approved Templates** | `whatsapp.client.js#sendTemplateMessage` | Required for initiating outbound conversations or messages outside the 24h window. Maps template parameters to CRM contact fields. |
| **24-Hour Customer Care Window** | `whatsapp.service.js#isWithinCustomerServiceWindow` | Enforces Meta policy: if `Date.now() - conversation.lastInboundMessageAt > 24 hours`, free-form replies are blocked, requiring an approved template. |
| **Media Messages (Images, Docs, Voice)** | `whatsapp.client.js` & `server/src/jobs/` | Handles Meta media ID generation, pre-signed upload URLs, and downloading incoming voice notes/attachments to storage (S3/local). |
| **Opt-Out Processing** | `whatsapp.service.js` | Evaluates inbound message content against consent opt-out triggers (e.g., `STOP`, `UNSUBSCRIBE`, `CANCEL`). Flags `Contact.isOptedOut = true` and logs Consent record. |
| **Idempotency & Deduplication** | `whatsapp.webhook.js` & Redis/DB | Meta webhooks guarantee at-least-once delivery. Inbound events must check `wamid` against existing database records to discard duplicates. |
| **Retry Handling & Backoff** | `whatsapp.client.js` & BullMQ | Outbound requests failing with 429/500 errors will trigger exponential backoff queues. |

---

## Environment Variables Required

```env
WHATSAPP_API_VERSION=v21.0
WHATSAPP_BASE_URL=https://graph.facebook.com
WHATSAPP_ACCESS_TOKEN=your_system_user_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_BUSINESS_ACCOUNT_ID=your_waba_id
WHATSAPP_VERIFY_TOKEN=your_custom_secret_verify_token
WHATSAPP_APP_SECRET=your_meta_app_secret
```
