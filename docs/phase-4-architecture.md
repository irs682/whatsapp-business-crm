# Phase 4 Architecture: Official Meta WhatsApp Cloud API Integration

## 1. System Overview

Phase 4 establishes real-time bidirectional messaging between Stech WhatsApp Business CRM and the official Meta WhatsApp Business Platform (Cloud API). It provides enterprise webhook security (raw body HMAC-SHA256 verification), customer-service window compliance, WhatsApp template sending, delivery receipt state progression, and unified Socket.IO synchronization.

---

## 2. Inbound Architecture (Webhooks & Ingestion)

```
[Customer on WhatsApp]
          | (Sends WhatsApp message)
          v
[Meta Cloud Platform]
          | (HTTPS POST with X-Hub-Signature-256 header)
          v
[GET/POST /api/v1/webhooks/whatsapp]
          |
          +--> [Raw Body Capture in Express (app.js verify hook)]
          |
          +--> [HMAC-SHA256 Signature Verification via crypto.timingSafeEqual]
          |      - Rejects invalid / tampered payloads with 401 Unauthorized
          |
          +--> [Immediate 200 OK Acknowledgment to Meta]
          |
          v (Asynchronous setImmediate event queue)
[WhatsAppService.processWebhookPayload]
          |
          +--> Inbound Messages:
          |      1. Idempotency Check (Find by wamid; skip if duplicate)
          |      2. Match/Create Contact (normalize E.164 phone & wa_id)
          |      3. Opt-Out Detection (Keyword STOP/UNSUBSCRIBE -> revoke consent)
          |      4. Match/Create Conversation (Update lastInboundMessageAt, unreadCount)
          |      5. Persist Message in PostgreSQL (direction: INBOUND, status: DELIVERED)
          |      6. Broadcast to Socket.IO (conversation & department rooms)
          |
          +--> Status Receipts:
                 1. Match local message by waMessageId
                 2. Non-regressive state transition (SENT -> DELIVERED -> READ)
                 3. If failed: capture error title and update status: FAILED
                 4. Broadcast status change to Socket.IO
```

---

## 3. Outbound Architecture (Agent Replies & Templates)

```
[CRM Agent in Shared Team Inbox]
          |
          +---> Free-form Reply (POST /conversations/:id/send-text)
          |       |
          |       v
          |     [24-Hour Policy Window Check]
          |       - Is Date.now() - lastInboundMessageAt <= 24h?
          |       - YES: Dispatch via WhatsAppClient -> Meta Cloud API -> status: SENT
          |       - NO: Throw 422 OUTSIDE_24H_WINDOW (Prompt Template Modal)
          |
          +---> Pre-Approved WhatsApp Template (POST /conversations/:id/send-template)
                  |
                  v
                [Permitted Anytime, even when window is expired]
                  - Validates template is APPROVED in local DB
                  - Substitutes parameters {{1}}, {{2}} in components array
                  - Dispatches via WhatsAppClient -> Meta Cloud API -> status: SENT
                  - Updates lastMessageAt
                  - Broadcasts message.created to Socket.IO
```

---

## 4. Non-Regressive Delivery State Machine

Message delivery follows Meta's lifecycle hierarchy:
1. `QUEUED` / `LOCAL_SAVED` (Level 1)
2. `SENT` (Level 2)
3. `DELIVERED` (Level 3)
4. `READ` (Level 4)
5. `FAILED` (Terminal Error)

Rule: A message in `READ` status will never regress to `DELIVERED` or `SENT` if out-of-order webhook packets arrive.
