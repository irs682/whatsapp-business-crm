# Phase 3 Architecture: Shared Team Inbox & Real-Time Conversation Management

## 1. System Overview

Phase 3 introduces a secure, real-time shared conversation management engine for Stech WhatsApp Business CRM. It connects customer engagements to authorized departmental queues, supports single-click agent claiming with conflict resolution, facilitates seamless cross-department transfers with handover summaries, tracks internal read states, provides reusable quick reply snippets, and broadcasts live state updates through an authenticated Socket.IO layer.

---

## 2. Component Architecture

```
+-----------------------------------------------------------------------------------+
|                                React 18 + Vite Frontend                           |
|  - 3-Column Shared Inbox (Directory, Chronological Timeline, Customer Context)   |
|  - Socket.IO Client (Auto-reconnection, Event Handlers, Fallback REST polling)   |
|  - Permission-aware controls (Department isolation, role capabilities)           |
+------------------------------------------+----------------------------------------+
                                           |
                                  HTTPS / WSS (JWT Handshake)
                                           |
+------------------------------------------v----------------------------------------+
|                                Node.js / Express Backend                          |
|  - HTTP Router (/conversations, /messages, /quick-replies, /notes)                |
|  - Socket.IO Server (Handshake JWT validation, User & Dept room multiplexing)    |
|  - RBAC & Department Isolation Middlewares                                        |
|  - Services: ConversationService, MessageService, QuickReplyService, NoteService  |
|  - Atomic DB Operations (Prisma Transactions: Atomic Claiming & Transfers)        |
+------------------------------------------+----------------------------------------+
                                           |
                                      Prisma ORM
                                           |
+------------------------------------------v----------------------------------------+
|                               PostgreSQL 15+ Database                             |
|  - conversations, messages, conversation_transfers, conversation_read_states       |
|  - quick_replies, notes, activity_logs, contacts, departments, users              |
+-----------------------------------------------------------------------------------+
```

---

## 3. Data Flow & Lifecycles

### 3.1. Conversation Lifecycle & Operational States
The system enforces strict operational states:
- `OPEN`: Active customer conversation requiring agent response.
- `PENDING`: Awaiting customer response or external resolution.
- `RESOLVED`: Inactive / successfully addressed thread.
- `CLOSED`: Archived terminal state.

Valid state transitions:
- `OPEN` <-> `PENDING`
- `OPEN` -> `RESOLVED` / `CLOSED`
- `PENDING` -> `RESOLVED` / `CLOSED`
- `RESOLVED` -> `OPEN` (Customer re-engagement or agent reopen)
- `CLOSED` -> `OPEN` (Permitted under specific supervisor authorization)

### 3.2. Atomic Agent Claiming (Race Condition Protection)
When two agents attempt to claim the same unassigned conversation concurrently:
1. `conversation.repository.claimAtomic(id, agentId)` runs `prisma.conversation.updateMany({ where: { id, assignedToUserId: null }, data: { assignedToUserId: agentId } })`.
2. PostgreSQL returns the row count modified.
3. If `count === 0`, a `409 Conflict` (`CONVERSATION_ALREADY_CLAIMED`) is returned to the losing agent.
4. The winning request emits `conversation.assigned` to the department Socket.IO room.

### 3.3. Department Routing & Transfers with Handover Notes
1. An authorized agent or manager initiates `POST /conversations/:id/transfer`.
2. A single database transaction:
   - Records a permanent `ConversationTransfer` log containing `fromDepartmentId`, `toDepartmentId`, `transferredById`, `reason`, and `handoverNote`.
   - Updates `Conversation.departmentId` to `targetDepartmentId` and updates or clears `assignedToUserId`.
   - Records an entry in `ActivityLog`.
3. Event `conversation.transferred` is broadcast to:
   - Target department room `dept:<targetDepartmentId>`
   - Previous department room `dept:<fromDepartmentId>`
   - The active conversation room `conversation:<id>`
4. Real-Time Access Recalculation:
   - Clients of staff who do not belong to the target department (and are not admins) revoke room subscription and remove the conversation from their active UI.

### 3.4. Chronological Timeline & Separation of Concerns
The conversation timeline merges three distinct entity streams:
1. **Customer WhatsApp Messages**: Inbound and outbound customer communications with delivery status (`LOCAL_SAVED` in Phase 3; Meta receipts in Phase 4).
2. **Internal Team Notes**: Rendered with high-contrast amber styling and a shield icon, strictly isolated from customer payloads.
3. **Transfer System Events**: Displays transition context, reason, and handover summary directly inside the chronological stream.

---

## 4. Phase Boundary (Phase 3 vs. Phase 4)

| Feature | Phase 3 (Current) | Phase 4 (Next Milestone) |
|---|---|---|
| Customer Threading | Internal DB persistence & UI | Meta Cloud API Webhook Sync |
| Outbound Delivery | Stored as `LOCAL_SAVED` / `DRAFT` | Live HTTPS Meta Graph API dispatch |
| Message Receipts | `LOCAL_SAVED` timestamp | Webhook-driven `SENT`, `DELIVERED`, `READ` |
| Quick Replies | Internal agent snippets | Meta WhatsApp approved templates |
| Attachments | Extensible metadata schema | S3/Local object storage & media CDN |
