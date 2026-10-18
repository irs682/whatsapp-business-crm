# WhatsApp Business CRM - Development Setup Guide

This guide covers local environment setup, PostgreSQL configuration, Prisma migrations, seeding, and running the development environment.

## 1. Prerequisites

- **Node.js**: `v20.x` or higher (verified on Node `v23.x`)
- **npm**: `v10.x` or `v11.x`
- **PostgreSQL**: `v14.x` or higher (local or Docker container)
- **Meta WhatsApp Business Account** (for live testing webhooks, or simulated locally)

---

## 2. Cloning & Installing Dependencies

```bash
# Clone the repository
git clone <repository-url> whatsapp-business-crm
cd whatsapp-business-crm

# Install root dependencies
npm install

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
cd ..
```

---

## 3. Database & Environment Configuration

### Server Configuration
Create `server/.env` based on `server/.env.example`:
```bash
cp server/.env.example server/.env
```
Ensure your `DATABASE_URL` is set to your PostgreSQL instance:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/whatsapp_crm?schema=public"
```

### Client Configuration
Create `client/.env` based on `client/.env.example`:
```bash
cp client/.env.example client/.env
```
```env
VITE_API_BASE_URL="http://localhost:5000/api/v1"
```

---

## 4. Prisma Migrations & Database Seeding

Run the following commands inside `server/`:

```bash
# Generate the Prisma Client
npm run prisma:generate

# Run initial database migrations
npm run prisma:migrate

# Seed default roles (SUPER_ADMIN, ADMIN, MANAGER, AGENT), permissions, and admin user
npm run prisma:seed
```

### Default Seed Credentials
- **Email**: `admin@crm.local`
- **Password**: `Admin123!`
- **Role**: `SUPER_ADMIN`

---

## 5. Running the Application

### Option A: Concurrent Workspace Mode (Root)
From the root directory:
```bash
npm run dev
```
This boots both the backend server (`http://localhost:5000`) and the Vite frontend (`http://localhost:5173`) in parallel.

### Option B: Separate Terminals
```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
cd client
npm run dev
```

---

## 6. Running Tests & Linting

```bash
# Backend Automated Tests
cd server
npm test

# Format Check
npm run format
```
