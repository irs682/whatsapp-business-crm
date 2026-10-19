# Phase 7 Architecture Review & Production Blueprint
**Stech WhatsApp Business CRM**  
**Engineering Discipline:** Principal Software Architect & Cloud Infrastructure Architect  
**Branch:** `feature/phase-7-production-readiness`  

---

## 1. System Topology Overview

Stech WhatsApp Business CRM is designed as a modular, three-tier enterprise web application with asynchronous background worker capabilities and real-time bidirectional messaging:

```
                                      ┌─────────────────────────────────────┐
                                      │      Meta WhatsApp Cloud API        │
                                      │        (Graph API v21.0)            │
                                      └───────┬─────────────────────▲───────┘
                                              │ Inbound Webhooks    │ Outbound API
                                              │ (HTTPS POST)        │ (HTTPS POST)
                                              ▼                     │
┌───────────────────────────┐         ┌─────────────────────────────┴───────┐
│     Client Browser        │ ◄─────► │           Express API Server        │
│  (React 18 + Vite SPA)    │  HTTP/  │        (Node.js 20 LTS Alpine)      │
│  - Shared Team Inbox      │  WS     │  - Authentication & RBAC Middleware │
│  - Executive Dashboard    │         │  - Department Isolation Layer       │
│  - Campaign Workspace     │         │  - Real-Time Engine (Socket.IO)     │
│  - Audit Viewer & Reports │         │  - Webhook HMAC-SHA256 Verifier     │
└───────────────────────────┘         └──────┬──────────────────────▲───────┘
                                             │                      │
                                             │ Reads / Writes       │ Polls / Updates
                                             ▼                      │
                                      ┌─────────────────────────────┴───────┐
                                      │        PostgreSQL 16 Engine         │
                                      │          (Docker Volume)            │
                                      │  - 31 Relational Business Tables    │
                                      │  - Durable Campaign Job Queue       │
                                      │  - Comprehensive Audit Log Catalog  │
                                      └─────────────────────────────────────┘
```

---

## 2. Core Architectural Layers

### 2.1 Presentation Tier (Frontend SPA)
- **Framework:** React 18 with Vite bundling.
- **Styling:** Tailwind CSS with responsive layout tokens and dark/light system adaptation.
- **Real-Time Client:** `socket.io-client` subscribing to `conversation:<id>` and `dept:<id>` rooms.
- **State & Data Layer:** Axios client configured with JWT bearer interceptors and automatic 401 redirect handling.

### 2.2 Application & Business Logic Tier (Backend API)
- **Framework:** Node.js 20 LTS with Express 5.
- **Modular Monolith Architecture:** Modules organized by domain boundary (`auth`, `users`, `departments`, `contacts`, `conversations`, `messages`, `campaigns`, `reports`, `audit`, `whatsapp`).
- **Security Middleware Pipeline:**
  1. `helmet`: Restricts HTTP headers, clickjacking (`X-Frame-Options: SAMEORIGIN`), and Content Security Policy.
  2. `cors`: Restricts allowed client origins in production; rejects unauthorized third-party cross-origin requests.
  3. `rateLimiter`: Protects against brute-force attacks on authentication routes and volumetric DoS.
  4. `requestLogger`: Enriches request logs with response times, IP, user agent, and correlation IDs.
  5. `authenticate`: Validates JWT signature, checks expiration, and rejects deactivated accounts.
  6. `requirePermissions`: Enforces granular RBAC across 50 fine-grained system permissions.

### 2.3 Data & Persistence Tier
- **Database Engine:** PostgreSQL 16.
- **ORM:** Prisma 5.22.0 using connection pooling via `pg`.
- **Migration Tracking:** Strictly version-controlled via `_prisma_migrations` with forward-only schema transitions.
- **Relational Integrity:** Foreign key constraints with cascading deletes where appropriate (`contacts` -> `messages`, `conversations` -> `messages`) and restricted deletes for auditability (`users` -> `audit_logs`).

---

## 3. Real-Time & Asynchronous Engine

### 3.1 Real-Time WebSocket Infrastructure (Socket.IO)
- Socket connections authenticate using JWT token handshakes.
- Agents join room subscriptions according to assigned department (`dept:<departmentId>`) and claimed conversations (`conversation:<conversationId>`).
- Events emitted:
  - `message.created`: Broadcasts inbound customer messages and outbound agent replies instantly.
  - `message.updated`: Real-time transition of delivery checkmarks (`SENT` -> `DELIVERED` -> `READ`).
  - `conversation.transferred`: Re-routes conversation between departmental queues in real time.

### 3.2 Durable Campaign Queue & Marketing Automation
- Database-backed durable queue design avoiding message loss across server restarts.
- Single-worker atomic job claiming via PostgreSQL transactions.
- Pre-send compliance check: Verifies recipient consent and opt-out status immediately before dispatching each individual message.
- Exponential backoff retry handler for transient Meta rate limits.

---

## 4. Meta WhatsApp Integration Boundary

```
[Inbound Webhook Request] ──► [Express Body Parser (Captures rawBody)]
                                              │
                                              ▼
                             [Timing-Safe HMAC-SHA256 Signature Check]
                                 ├── Valid ──► [200 OK Fast Acknowledgment]
                                 │                       │
                                 │                       ▼
                                 │             [Async Event Ingestion]
                                 │             - Idempotency Wamid Check
                                 │             - Contact Match or Create
                                 │             - Department Routing
                                 │             - Socket.IO Broadcast
                                 │
                                 └── Invalid ──► [401 Unauthorized Rejection]
```

---

## 5. Security & Isolation Boundaries

1. **Departmental Multi-Tenancy:**
   - Conversations, contacts, and reports are partitioned by `department_id`.
   - Agents cannot read or transfer conversations outside their assigned department unless granted `DEPARTMENTS_MANAGE` or administrative roles.
2. **24-Hour Customer Service Window:**
   - Free-form agent messaging is prohibited once 24 hours have elapsed since the customer's last inbound message.
   - Outbound contact outside the window requires pre-approved Meta WhatsApp templates.
3. **Data Protection & Sanitization:**
   - Database backups exclude production secrets.
   - API error responses redact internal stack traces in production mode (`NODE_ENV=production`).
