# WhatsApp Business CRM

> Production-ready, enterprise-grade CRM and multi-agent shared inbox engineered for the Meta WhatsApp Business Cloud API.

[![CI Status](https://github.com/organization/whatsapp-business-crm/actions/workflows/ci.yml/badge.svg)](https://github.com/organization/whatsapp-business-crm)
[![Node Version](https://img.shields.io/badge/node-%3E%3D20.0.0-emerald.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-ISC-blue.svg)](LICENSE)

---

## 1. Project Overview & Objectives

**WhatsApp Business CRM** is a centralized customer relationship and support management system built specifically for businesses communicating over WhatsApp. It solves the operational bottlenecks of multi-agent chat support, message compliance, department routing, and lead conversions.

### Core Objectives
- **Shared Team Inbox**: Enable multiple agents and managers to handle customer support concurrently from a single WhatsApp business phone number.
- **24-Hour Policy Compliance**: Enforce Meta's 24-hour customer service window, seamlessly transitioning between free-form agent responses and pre-approved WhatsApp templates.
- **Enterprise RBAC**: Role-based permissions (`SUPER_ADMIN`, `ADMIN`, `MANAGER`, `AGENT`) for strict data governance.
- **Department Routing**: Route inbound chats and sales opportunities to specialized queues (Support, Sales, Billing).
- **Lead Pipeline**: Visual deal stages, pipeline values, and agent assignments directly linked to WhatsApp contacts.
- **Consent & Opt-Out**: Automated keyword detection (`STOP`, `UNSUBSCRIBE`) and audit logging for messaging compliance.
- **Meta Cloud API Ready**: Clean abstraction layer ready for webhook verification, inbound event parsing, and outbound dispatch.

---

## 2. Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite, Tailwind CSS, Lucide Icons, React Router v6, Socket.IO Client |
| **Backend** | Node.js (v20+ / v23), Express 5, Socket.IO, Morgan, Helmet, CORS |
| **Database** | PostgreSQL 14+, Prisma ORM 5.22 |
| **Security & Auth** | JSON Web Tokens (JWT), bcryptjs, express-rate-limit, Zod |
| **Integrations** | Meta WhatsApp Cloud API (Graph API v21.0+) |
| **Testing** | Node.js Native Test Runner (82 passing tests across 20 suites) |
| **Tooling & CI** | GitHub Actions, Docker, Docker Compose, Prettier, Concurrently |

---

## 3. High-Level Folder Structure

```
whatsapp-business-crm/
├── .github/
│   ├── workflows/ci.yml          # GitHub Actions release verification CI pipeline
├── client/                       # React + Vite + Tailwind CSS frontend
│   ├── Dockerfile                # Multi-stage production Nginx static container
│   ├── nginx.conf                # Production SPA reverse proxy configuration
├── server/                       # Node.js + Express + Prisma backend
│   ├── Dockerfile                # Production Node 20 LTS Alpine container
│   ├── prisma/
│   │   ├── migrations/           # Version-controlled migrations
│   │   ├── schema.prisma         # 32+ CRM entities, enums & relations
│   │   └── seed.js               # Initial roles, permissions, departments & admin
├── docker-compose.yml            # Local development orchestration stack
├── docker-compose.production.yml # Resource-bounded production container stack
├── scripts/                      # Setup, DB backup, DB restore, and load test tooling
│   ├── db-backup.js              # Automated PostgreSQL snapshot with SHA-256 checksum
│   ├── db-restore.js             # Guardrailed database recovery utility
│   └── load-test.js              # High-concurrency performance benchmark suite
├── docs/                         # Architecture, Security, Runbooks, Handover
│   ├── phase-7-completion-report.md
│   ├── phase-7-deployment-runbook.md
│   ├── phase-7-rollback-plan.md
│   ├── phase-7-security-audit.md
│   ├── phase-7-database-recovery.md
│   ├── phase-7-worker-reliability.md
│   ├── phase-7-monitoring-and-alerting.md
│   ├── phase-7-performance-report.md
│   ├── phase-7-e2e-test-report.md
│   ├── phase-7-live-meta-verification.md
│   └── phase-7-handover-checklist.md
├── package.json                  # Root workspace orchestrator
└── README.md                     # Master documentation
```

---

## 4. Production Docker Deployment

Deploy the entire production stack (Nginx SPA, Node.js API, and PostgreSQL 16) using Docker Compose:

```bash
# 1. Prepare production configuration
cp server/.env.production.example server/.env.production

# 2. Build production container images
docker compose -f docker-compose.production.yml build

# 3. Apply safe database migrations
docker compose -f docker-compose.production.yml run --rm server npx prisma migrate deploy

# 4. Launch containers
docker compose -f docker-compose.production.yml up -d

# 5. Verify system health probes
curl -f http://127.0.0.1:5000/api/v1/health/live
curl -f http://127.0.0.1:5000/api/v1/health/ready
```

For complete rollout and disaster recovery instructions, refer to [docs/phase-7-deployment-runbook.md](file:///c:/Users/PMLS/Desktop/CRM/whatsapp-business-crm/docs/phase-7-deployment-runbook.md) and [docs/phase-7-rollback-plan.md](file:///c:/Users/PMLS/Desktop/CRM/whatsapp-business-crm/docs/phase-7-rollback-plan.md).

---

## 5. Development Roadmap & Release Status

- [x] **Phase 1 — Core Architecture & Foundation**
- [x] **Phase 2 — Core CRM Implementation (Users, Departments, Contacts, E.164, CSV Import, Leads, Tags, Notes, Tasks, Dashboard)**
- [x] **Phase 3 — Shared Team Inbox & Realtime WebSockets (3-Column Layout, Agent Claiming, Dept Routing & Transfers, Quick Replies, Unread Tracking)**
- [x] **Phase 4 — Official Meta WhatsApp Cloud API Integration (Webhooks, HMAC Verification, 24h Window, Templates, Status Receipts)**
- [x] **Phase 5 — Marketing Campaigns & Audience Segmentation (State Machine, Durable Dispatch Queue, Consent & Suppression, Attribution)**
- [x] **Phase 6 — Advanced Reporting, Analytics, Audit Logging & Management Intelligence (FRT/RT Engine, Executive Dashboard, Formula-Safe Exports, 71 Passing Tests)**
- [x] **Phase 7 — Production Hardening, Dockerization, CI/CD, E2E Testing, Backup & Recovery, Monitoring & Client Handover (82 Passing Tests, Zero Critical Defects)**

Refer to [docs/phase-7-completion-report.md](file:///c:/Users/PMLS/Desktop/CRM/whatsapp-business-crm/docs/phase-7-completion-report.md) for the exhaustive release readiness audit.
