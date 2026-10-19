# Phase 3 — Shared Team Inbox & Real-Time Conversation Management
## Implementation Plan & Pre-Implementation Audit

**Organization**: Stech Solutions  
**Repository**: [whatsapp-business-crm](https://github.com/irs682/whatsapp-business-crm)  
**Branch**: `feature/phase-3-shared-inbox` (branched directly from verified `feature/phase-2-crm-core`)  
**Baseline Test Status**: 28/28 passing tests  
**Frontend Build Status**: Passing (`vite build` succeeded with 0 errors)

---

## 1. Repository Audit & Baseline State

### 1.1 Existing Reusable Assets
- **Authentication & RBAC**: JWT verification middleware, role hierarchy (`SUPER_ADMIN`, `ADMIN`, `MANAGER`, `AGENT`), granular permissions.
- **Department Isolation**: Multi-department user assignment (`user_departments`), record filtering helpers, and access check middleware.
- **CRM Entities**: `Contact` (normalized E.164, company, tags, consent), `Department`, `User`, `Lead`, `Note`, `Task`, `ActivityLog`.
- **Placeholder Modules**: `server/src/modules/conversations/`, `server/src/modules/messages/` contain placeholder route controllers that can now be implemented with full business logic.
- **Frontend Framework**: React 18 + Vite, Tailwind CSS, Lucide icons, `AuthContext` (exposing `user`, `hasPermission`), Axios API client with automatic JWT bearer attachment.

### 1.2 Gaps Identified for Phase 3
1. **Conversation Model Needs Expansion**:
   - Priority field (`LOW`, `NORMAL`, `HIGH`, `URGENT`).
   - Timestamps: `lastInboundMessageAt`, `resolvedAt`, `closedAt`.
   - Explicit status transitions (`OPEN`, `PENDING`, `RESOLVED`, `CLOSED`).
2. **Conversation Handover & Transfers**:
   - `ConversationTransferHistory` model to log transfer reason, handover notes, source department, and destination department.
3. **Internal Messaging Model**:
   - `Message` model requires local/internal delivery tracking (`status`: `QUEUED`, `LOCAL_SAVED`, `SENT`, `DELIVERED`, `READ`, `FAILED`).
   - Content types: `TEXT`, `IMAGE`, `DOCUMENT`, `AUDIO`, `VIDEO`.
   - Sender identification (`senderUserId` vs customer inbound).
4. **Quick Replies Module**:
   - Reusable canned responses model (`QuickReply`) with department scoping.
5. **Real-Time Communication**:
   - Need WebSocket server (`socket.io`) attached to Express HTTP server.
   - Authentication middleware verifying JWT on handshake.
   - Dynamic room management: join `dept:<departmentId>` and `conversation:<conversationId>` only if authorized.
   - Automated room departure upon department transfers.
6. **Frontend 3-Column Shared Inbox (`/inbox`)**:
   - Currently a static placeholder in `client/src/pages/InboxPage.jsx`.
   - Requires dynamic 3-column layout:
     - Left: Filter tabs, search, unread badge, conversation list item.
     - Center: Header (status, agent, department), chronological message timeline (inbound/outbound visual styles), internal notes visual distinction, message composer, quick reply picker.
     - Right: Customer details panel (tags, leads, tasks, activity timeline, contact link).

---

## 2. Proposed Database Schema Modifications

### 2.1 Prisma Schema Enhancements
1. **`ConversationPriority` Enum**:
   ```prisma
   enum ConversationPriority {
     LOW
     NORMAL
     HIGH
     URGENT
   }
   ```
2. **`Conversation` Model Extensions**:
   - `priority`: `ConversationPriority @default(NORMAL)`
   - `lastInboundMessageAt`: `DateTime?`
   - `resolvedAt`: `DateTime?`
   - `closedAt`: `DateTime?`
   - `transfers`: `ConversationTransfer[]`
3. **`ConversationTransfer` Model**:
   - `id`, `conversationId`, `fromDepartmentId`, `toDepartmentId`, `transferredByUserId`, `reason`, `handoverSummary`, `createdAt`.
4. **`QuickReply` Model**:
   - `id`, `title`, `content`, `shortcut`, `departmentId?`, `createdById`, `isActive`, `createdAt`, `updatedAt`.
5. **Indexes**:
   - `[departmentId, status]`
   - `[assignedToUserId, status]`
   - `[contactId]`
   - `[lastMessageAt]`

---

## 3. Real-Time Architecture (Socket.IO)

```
[Client (React Browser)]
       │
       ▼ (WSS Handshake with JWT)
[Socket.IO Authentication Middleware]
       │
  (Validates JWT & Loads User Departments)
       │
       ├──► Joins room: `user:<userId>`
       └──► Joins rooms: `dept:<departmentId>` for each assigned department
              │
              ├── Conversation Updated / Status Changed
              ├── Real-time Inbound / Outbound Message Emitted
              ├── Transfer Notice (Client automatically drops old dept room)
              └── Internal Note Created
```

### Event Names & Payloads
- `conversation:created` -> `{ conversation }`
- `conversation:updated` -> `{ conversationId, status, priority, departmentId, assignedToUserId }`
- `conversation:assigned` -> `{ conversationId, assignedToUser, assignedBy }`
- `conversation:transferred` -> `{ conversationId, fromDepartmentId, toDepartmentId, handoverSummary }`
- `message:created` -> `{ conversationId, message }`
- `note:created` -> `{ conversationId, note }`
- `conversation:read` -> `{ conversationId, userId }`

---

## 4. Security & Access Control Specifications
1. **Department Isolation**:
   - Conversations, messages, notes, and activity history inherit department boundaries.
   - Non-privileged agents cannot query, read, or listen via WebSockets to conversations belonging to unauthorized departments.
2. **Transfer Access Revocation**:
   - When a conversation is transferred from Dept A to Dept B, agents only in Dept A immediately lose access.
   - REST routes verify the *current* department state. WebSocket server broadcasts a transfer event prompting clients to leave the conversation room and refresh their queue.
3. **Assignment Race-Condition Safeguard**:
   - Claiming an unassigned conversation uses an atomic conditional update (`where: { id, assignedToUserId: null }`). If another agent claimed it concurrently, the second request fails gracefully with `409 Conflict`.
4. **Internal Message Integrity**:
   - Internal test messages are clearly demarcated (`LOCAL_SAVED`) and do not fabricate WhatsApp Meta delivery receipts.

---

## 5. Milestone Execution Sequence

- **Milestone 3.1 — Audit and Data Models**: Update Prisma schema, push to PostgreSQL, update seed script with quick replies and permissions.
- **Milestone 3.2 — Conversation APIs**: CRUD, status transitions, priority updates, search, pagination, department isolation.
- **Milestone 3.3 — Assignment and Transfers**: Atomic claiming, agent assignments, department transfers, handover notes, access revocation.
- **Milestone 3.4 — Messages, Notes and Quick Replies**: Chronological message timeline, internal conversation notes, quick reply snippet management.
- **Milestone 3.5 — Authenticated Real-Time Communication**: Socket.IO integration, JWT handshake, authorized room joining/leaving, event broadcasting.
- **Milestone 3.6 — Shared Inbox Frontend**: 3-column professional Wati/respond.io inspired interface connected to real REST & WebSocket APIs.
- **Milestone 3.7 — Quality Assurance & Testing**: Add Phase 3 integration test suite, execute Phase 1 + 2 regression suite, verify Vite production build.
- **Milestone 3.8 — Documentation & Handover**: Complete all required Phase 3 documentation deliverables.
