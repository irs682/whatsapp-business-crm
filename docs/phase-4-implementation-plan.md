# Phase 4 Implementation Plan
## Official Meta WhatsApp Cloud API Integration
**Project**: Stech WhatsApp Business CRM  
**Milestone**: Phase 4 of 7  
**Branch**: `feature/phase-4-whatsapp-cloud-api`  
**Date**: October 19, 2026  

---

## 1. Executive Summary

Phase 4 enables secure, reliable, real-world WhatsApp communication through the official Meta WhatsApp Business Platform (Cloud API). It elevates the Phase 3 Shared Team Inbox from internal local testing to genuine bidirectional WhatsApp messaging, supporting incoming message webhooks, outbound message dispatch, 24-hour customer service window enforcement, pre-approved Meta message templates, media attachments, and delivery/read receipts.

---

## 2. Current Repository State & Baseline

- **Verified Baseline**: 36/36 tests passing (Phase 1 Auth/RBAC, Phase 2 CRM Core, Phase 3 Shared Inbox).
- **Existing WhatsApp Placeholders**:
  - `server/src/integrations/whatsapp/whatsapp.client.js`: Basic scaffold with simulated message ID generator.
  - `server/src/integrations/whatsapp/whatsapp.service.js`: Verification stub and 24-hour window helper.
  - `server/src/integrations/whatsapp/whatsapp.webhook.js`: Routes for `GET /` and `POST /` mounted at `/api/v1/webhooks/whatsapp`.
- **Database Schema**:
  - `Conversation`: has `lastInboundMessageAt`, `channel`, `status`, `priority`.
  - `Message`: has `waMessageId` (unique), `direction`, `type`, `status` (`QUEUED`, `LOCAL_SAVED`, `SENT`, `DELIVERED`, `READ`, `FAILED`).
  - `MessageTemplate`: has `name`, `category`, `language`, `body`, `status`, `metaTemplateId`.
  - `Contact`: has `phone`, `waId`, `consentStatus`, `isOptedOut`.

---

## 3. Required Integration Architecture

```
                                  [Meta WhatsApp Cloud Platform]
                                          ^               |
                           HTTPS Outbound |               | Inbound Webhooks
                       (Graph API v21.0+) |               | (HMAC-SHA256 Signed)
                                          |               v
+-----------------------------------------+---------------+------------------------------------------+
| Stech WhatsApp Business CRM Backend                                                                |
|                                                                                                    |
|  1. Webhook Engine:                                                                                |
|     - Raw Body Capture + Timing-Safe HMAC-SHA256 Verification (X-Hub-Signature-256)                |
|     - Inbound Message Processor (Deduplication by wamid, Contact match/create, Queue routing)      |
|     - Status Tracker (SENT -> DELIVERED -> READ -> FAILED, Non-regressive state machine)           |
|                                                                                                    |
|  2. WhatsApp Cloud Client:                                                                         |
|     - Modes: MOCK (safe offline integration testing), TEST (sandbox), PRODUCTION (live)            |
|     - 24-Hour Policy Window Validator (Blocks free-form replies if lastInboundMessageAt > 24h)     |
|     - Official Meta Message Formatter (Text, Template, Media)                                      |
|     - Transient Error Retries with Exponential Backoff                                             |
|                                                                                                    |
|  3. Template Management:                                                                           |
|     - Meta Template Synchronization & Local Cache                                                  |
|     - Parameter & Component Substitution (Header, Body {{1}}, Footer, Buttons)                     |
|                                                                                                    |
|  4. Real-Time Socket.IO Synchronization:                                                           |
|     - Emits message.created, message.status_changed, conversation.updated to authorized rooms      |
+-------------------------------------------------+--------------------------------------------------+
                                                  | Socket.IO / REST
                                                  v
+-------------------------------------------------+--------------------------------------------------+
| React 18 + Vite Frontend (Shared Team Inbox)                                                       |
|  - 24-Hour Customer Service Window Countdown / Alert                                               |
|  - WhatsApp Template Picker Modal with Dynamic Variable Substitution                               |
|  - Real-time Message Delivery Status Ticks (Sent, Delivered, Read, Failed)                         |
|  - Connection Health & Integration Status Indicator                                                |
+----------------------------------------------------------------------------------------------------+
```

---

## 4. Key Security & Compliance Requirements

1. **Webhook HMAC-SHA256 Signature Verification**:
   - Every incoming `POST /api/v1/webhooks/whatsapp` request must validate `X-Hub-Signature-256` against `req.rawBody` using `crypto.timingSafeEqual` and `WHATSAPP_APP_SECRET`.
2. **24-Hour Customer Service Window**:
   - Meta policy mandates that free-form messages can only be sent within 24 hours of the customer's last inbound message.
   - If `Date.now() - lastInboundMessageAt > 24h`, the backend strictly enforces that only pre-approved Meta message templates can be dispatched.
3. **Opt-Out Compliance**:
   - Inbound keywords (`STOP`, `UNSUBSCRIBE`, `CANCEL`) automatically mark `Contact.isOptedOut = true` and `Contact.consentStatus = 'REVOKED'`.
4. **Credential Isolation**:
   - Meta App Secret and Access Tokens are never logged, never returned to the client, and validated at startup.

---

## 5. Implementation Milestones

- **Milestone 4.1**: Audit and Meta Configuration Environment.
- **Milestone 4.2**: Webhook Security & HMAC-SHA256 Raw-Body Verification.
- **Milestone 4.3**: Inbound Message Ingestion, Contact Matching, Deduplication & Routing.
- **Milestone 4.4**: Outbound Messaging via Official WhatsApp Cloud API Client (`mock`, `test`, `production`).
- **Milestone 4.5**: 24-Hour Customer Service Window Rules & Meta Message Templates.
- **Milestone 4.6**: Status Receipt Tracking (Non-Regressive) & Media Handling.
- **Milestone 4.7**: Frontend Shared Inbox Integration (Window Timer, Template Picker, Status Ticks).
- **Milestone 4.8**: Comprehensive Automated Testing (36 baseline + new Phase 4 tests) & Documentation.
- **Milestone 4.9**: Live Meta Integration Verification & External Setup Guide.

---

## 6. External Blockers & Mocking Strategy

In standard development environments where live Meta Business Manager credentials or public webhook URLs (ngrok/Cloudflare) have not yet been provisioned by the project owner:
- Operating mode `mock` provides fully deterministic, offline Meta API emulation for all tests.
- Live integration with real WhatsApp phone numbers is structured under `Milestone 4.9` and documented in `docs/phase-4-live-integration-checklist.md`.
