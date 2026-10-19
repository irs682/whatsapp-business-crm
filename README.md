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
| **Testing** | Node.js Native Test Runner (36 passing tests) |
| **Tooling & CI** | GitHub Actions, Prettier, Concurrently |

---

## 3. High-Level Folder Structure

```
whatsapp-business-crm/
├── .github/
│   ├── workflows/ci.yml          # GitHub Actions CI workflow
│   ├── ISSUE_TEMPLATE/           # Bug report & feature request templates
│   └── pull_request_template.md  # PR review checklist
├── client/                       # React + Vite + Tailwind CSS frontend
│   ├── public/                   # Static assets & favicon
│   ├── src/
│   │   ├── api/                  # Axios HTTP client with JWT interceptor
│   │   ├── components/           # Reusable UI & navigation components
│   │   ├── constants/            # Route & UI constants
│   │   ├── context/              # AuthContext session state
│   │   ├── features/             # Modular business features
│   │   ├── layouts/              # AuthLayout and MainLayout
│   │   ├── pages/                # 10 Route pages (Dashboard, Inbox, Contacts, etc.)
│   │   ├── routes/               # AppRoutes switch
│   │   ├── App.jsx               # App container
│   │   ├── index.css             # Tailwind CSS tokens
│   │   └── main.jsx              # React DOM root
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
├── server/                       # Node.js + Express + Prisma backend
│   ├── prisma/
│   │   ├── schema.prisma         # 17+ CRM entities, enums & relations
│   │   └── seed.js               # Initial roles, permissions, departments & admin
│   ├── src/
│   │   ├── config/               # Env, Prisma client, CORS, logger
│   │   ├── constants/            # HTTP status, Roles, Permissions
│   │   ├── errors/               # Operational ApiError classes
│   │   ├── middleware/           # Auth, RBAC, Zod validation, Rate limiter
│   │   ├── modules/              # 18 Domain-driven feature modules (6-file standard)
│   │   ├── integrations/         # WhatsApp Cloud API client & webhooks
│   │   ├── routes/               # Central API router
│   │   ├── utils/                # Standard response formatters, JWT, Bcrypt
│   │   ├── app.js                # Express app setup
│   │   └── server.js             # Bootstrap & graceful shutdown
│   ├── tests/                    # Vitest + Supertest integration tests
│   ├── package.json
│   └── vitest.config.js
├── docs/                         # Architecture, Database, APIs & Roadmap
│   ├── architecture.md
│   ├── database-design.md
│   ├── api-specification.md
│   ├── authentication.md
│   ├── development-setup.md
│   ├── deployment.md
│   ├── testing-strategy.md
│   ├── whatsapp-integration.md
│   └── project-roadmap.md
├── scripts/                      # Setup & module generator scripts
├── .gitignore
├── package.json                  # Root workspace orchestrator
└── README.md                     # Master documentation
```

---

## 4. Backend Modular 6-File Standard

Every module in `server/src/modules/` follows a uniform design:
```
modules/<module_name>/
├── <name>.controller.js   # HTTP controller extracting params & returning ApiResponse
├── <name>.service.js      # Business logic, state transitions, validation
├── <name>.repository.js   # Prisma database operations & transactions
├── <name>.routes.js       # Route paths, RBAC middleware & Zod schema guards
├── <name>.validation.js   # Zod request body & query schemas
└── <name>.constants.js    # Module enums, pagination defaults, status codes
```

---

## 5. Prerequisites

- **Node.js**: `v20.x` or higher
- **npm**: `v10.x` or `v11.x`
- **PostgreSQL**: `v14.x` or higher

---

## 6. Quick Start & Installation

### Step 1: Clone and Install
```bash
git clone <repository-url> whatsapp-business-crm
cd whatsapp-business-crm

# Install root, backend, and frontend dependencies
npm install
```

### Step 2: Configure Environment Variables
Copy the provided environment templates:
```bash
# Server environment
cp server/.env.example server/.env

# Client environment
cp client/.env.example client/.env
```

Ensure `server/.env` contains your PostgreSQL connection string:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/whatsapp_crm?schema=public"
```

### Step 3: Database Migration & Seeding
```bash
# Generate Prisma Client
npm run prisma:generate

# Apply migrations
npm run prisma:migrate

# Seed initial roles, permissions, departments & super admin user
npm run prisma:seed
```

#### Default Credentials
- **URL**: `http://localhost:5173/login`
- **Email**: `admin@crm.local`
- **Password**: `Admin123!`

---

## 7. Running the Application

### Concurrent Development (Backend + Frontend)
```bash
npm run dev
```
- **Backend API**: `http://localhost:5000/api/v1`
- **Frontend Portal**: `http://localhost:5173`

### Run Backend Only
```bash
npm run dev:server
```

### Run Frontend Only
```bash
npm run dev:client
```

---

## 8. Automated Testing

Run the full integration test suite (Health, Authentication, Zod Validation, and Meta Webhook Verification):
```bash
npm run test
```

---

## 9. WhatsApp Webhook Configuration

1. In your Meta App Dashboard, navigate to **WhatsApp > Configuration**.
2. Set **Callback URL** to: `https://your-domain.com/api/v1/webhooks/whatsapp`
3. Set **Verify Token** to: value of `WHATSAPP_VERIFY_TOKEN` in `server/.env`
4. Subscribe to Webhook fields: `messages`, `message_template_status_update`.

---

## 10. Development Roadmap

- [x] **Phase 1 — Core Architecture & Foundation**
- [x] **Phase 2 — Core CRM Implementation (Users, Departments, Contacts, E.164, CSV Import, Leads, Tags, Notes, Tasks, Dashboard)**
- [x] **Phase 3 — Shared Team Inbox & Realtime WebSockets (3-Column Layout, Agent Claiming, Dept Routing & Transfers, Quick Replies, Unread Tracking)**
- [ ] **Phase 4 — WhatsApp Cloud API Production Dispatch**
- [ ] **Phase 5 — Marketing Campaigns & Audience Segmentation**
- [ ] **Phase 6 — Analytics, SLA Tracking & Custom Reports**
- [ ] **Phase 7 — Production Hardening, Docker & Penetration Testing**

Refer to [docs/project-roadmap.md](file:///c:/Users/PMLS/Desktop/CRM/whatsapp-business-crm/docs/project-roadmap.md) for detailed task breakdowns.
