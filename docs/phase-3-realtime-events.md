# Phase 3 Real-Time Architecture & Socket.IO Events

## 1. Overview
Real-time messaging in Stech WhatsApp Business CRM is built on top of `Socket.IO` (^4.8.1). The real-time layer operates as an event-driven notification plane while PostgreSQL serves as the durable source of truth.

---

## 2. Authentication & Room Security

### 2.1 Handshake Authentication
Clients must present a valid JWT token during connection handshake:
```javascript
const socket = io('http://localhost:5000', {
  auth: { token: 'jwt_bearer_token' }
});
```
Connections missing a token or carrying an expired/invalid signature are rejected with an `Authentication error`.

### 2.2 Room Taxonomy
The server automatically joins authenticated sockets to:
- `user:<userId>`: Targeted direct user notifications (read state sync, direct assignments).
- `dept:<departmentId>`: Broadcasts relevant only to staff in a particular department.
- `conversation:<conversationId>`: Explicitly joined via `conversation:join` client event. Access is validated against the conversation's department before permission to join is granted.

---

## 3. Supported Real-Time Events

### 3.1 Server-to-Client Events

| Event Name | Room Scope | Payload | Description |
|---|---|---|---|
| `conversation.created` | `dept:<deptId>` | Conversation object | Emitted when a new conversation is initialized. |
| `conversation.updated` | `conversation:<id>` & `dept:<deptId>` | Updated conversation fields | General conversation updates. |
| `conversation.status_changed` | `conversation:<id>` & `dept:<deptId>` | `{ conversationId, status, previousStatus }` | Status transition (e.g. `OPEN` -> `RESOLVED`). |
| `conversation.priority_changed`| `conversation:<id>` & `dept:<deptId>` | `{ conversationId, priority }` | Priority escalation or reduction. |
| `conversation.assigned` | `conversation:<id>` & `dept:<deptId>` | `{ conversationId, assignedToUser }` | Agent claim or reassignment. |
| `conversation.transferred` | `dept:<fromDept>`, `dept:<toDept>`, `conversation:<id>` | `{ conversationId, fromDepartmentId, toDepartmentId, transfer }` | Department transfer. Receiving staff gain visibility; non-authorized staff revoke UI access. |
| `message.created` | `conversation:<id>` & `dept:<deptId>` | `{ conversationId, message }` | New inbound or outbound message persisted. |
| `note.created` | `conversation:<id>` | `{ conversationId, note }` | Internal collaboration note added. |
| `conversation.read` | `user:<userId>` | `{ conversationId, userId }` | Read receipt synchronization across connected sessions. |

### 3.2 Client-to-Server Events

| Event Name | Payload | Validation & Action |
|---|---|---|
| `conversation:join` | `{ conversationId }` | Verifies user has access to conversation's department; joins socket to `conversation:<id>`. |
| `conversation:leave` | `{ conversationId }` | Removes socket from `conversation:<id>`. |

---

## 4. Reconnection & Resilience Strategy

- **Durable Source of Truth**: The client re-fetches active conversation state and messages upon reconnection.
- **Exponential Backoff**: Configured with 10 attempts, 1s delay, 5s max delay.
- **Duplicate Protection**: React timeline state deduplicates events by entity `id`.
