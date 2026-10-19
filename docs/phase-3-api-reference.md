# Phase 3 REST API Reference

All Phase 3 endpoints require a valid JWT Bearer token: `Authorization: Bearer <token>`.
Base URL: `/api/v1`

---

## 1. Conversations API

### 1.1 List Conversations
- **Method & Path**: `GET /conversations`
- **Permissions**: `conversations:read`
- **Query Parameters**:
  - `status`: `OPEN | PENDING | RESOLVED | CLOSED`
  - `priority`: `LOW | NORMAL | HIGH | URGENT`
  - `departmentId`: UUID
  - `assignedAgentId`: UUID
  - `unassigned`: `true | false`
  - `search`: string (matches contact first/last name or phone)
  - `page`: integer (default `1`)
  - `limit`: integer (default `25`, max `100`)
- **Response**: `200 OK`
```json
{
  "success": true,
  "message": "Conversations fetched successfully",
  "data": {
    "items": [
      {
        "id": "uuid",
        "contactId": "uuid",
        "departmentId": "uuid",
        "assignedToUserId": "uuid",
        "status": "OPEN",
        "priority": "NORMAL",
        "unreadCount": 2,
        "lastMessageAt": "2026-10-19T14:30:00.000Z",
        "contact": { "id": "uuid", "firstName": "Alice", "phone": "+1234567890" },
        "department": { "id": "uuid", "name": "Customer Support" },
        "assignedToUser": { "id": "uuid", "firstName": "John", "lastName": "Doe" },
        "messages": [{ "id": "uuid", "text": "Hello, need help", "createdAt": "..." }]
      }
    ],
    "pagination": { "page": 1, "limit": 25, "total": 1, "totalPages": 1 }
  }
}
```

### 1.2 Get Conversation By ID
- **Method & Path**: `GET /conversations/:id`
- **Permissions**: `conversations:read` (enforces user department isolation)
- **Response**: `200 OK` (includes contact with leads, tasks, tags, and transfer history)

### 1.3 Create Conversation
- **Method & Path**: `POST /conversations`
- **Permissions**: `conversations:reply`
- **Body**:
```json
{
  "contactId": "uuid",
  "departmentId": "uuid",
  "priority": "HIGH"
}
```
- **Response**: `201 Created`

### 1.4 Update Conversation Status
- **Method & Path**: `PATCH /conversations/:id/status`
- **Permissions**: `conversations:close`
- **Body**: `{ "status": "RESOLVED" }`
- **Status Transitions Enforced**:
  - `OPEN` -> `PENDING`, `RESOLVED`, `CLOSED`
  - `PENDING` -> `OPEN`, `RESOLVED`, `CLOSED`
  - `RESOLVED` -> `OPEN`
  - `CLOSED` -> `OPEN`

### 1.5 Update Conversation Priority
- **Method & Path**: `PATCH /conversations/:id/priority`
- **Permissions**: `conversations:reply`
- **Body**: `{ "priority": "URGENT" }`

### 1.6 Claim Unassigned Conversation (Atomic)
- **Method & Path**: `POST /conversations/:id/claim`
- **Permissions**: `conversations:assign`
- **Response (Winner)**: `200 OK` with updated conversation
- **Response (Conflict/Losing Request)**: `409 Conflict` (`CONVERSATION_ALREADY_CLAIMED`)

### 1.7 Assign Conversation to Agent
- **Method & Path**: `POST /conversations/:id/assign`
- **Permissions**: `conversations:assign`
- **Body**: `{ "assignedToUserId": "uuid" }` (or `null` to unassign)

### 1.8 Transfer Conversation to Another Department
- **Method & Path**: `POST /conversations/:id/transfer`
- **Permissions**: `conversations:transfer`
- **Body**:
```json
{
  "targetDepartmentId": "uuid",
  "reason": "Escalated for technical onboarding",
  "handoverNote": "Customer verified and ready for database setup",
  "assignedToUserId": "uuid"
}
```

### 1.9 Mark Conversation as Read
- **Method & Path**: `POST /conversations/:id/read`
- **Permissions**: `conversations:read`
- **Response**: `200 OK` `{ "read": true }`

---

## 2. Messages API

### 2.1 List Conversation Messages
- **Method & Path**: `GET /conversations/:conversationId/messages`
- **Permissions**: `conversations:read`
- **Ordering**: Ascending by `createdAt` (chronological)

### 2.2 Send / Persist Outbound Message
- **Method & Path**: `POST /conversations/:conversationId/messages`
- **Permissions**: `conversations:reply`
- **Body**:
```json
{
  "text": "Hello, thank you for reaching out to Stech Solutions.",
  "type": "TEXT",
  "direction": "OUTBOUND"
}
```
- **Note**: Persists with status `LOCAL_SAVED`. (Meta API delivery connects in Phase 4).

---

## 3. Quick Replies API

### 3.1 List Quick Replies
- **Method & Path**: `GET /quick-replies`
- **Permissions**: `quick_replies:read`
- **Query Parameters**: `departmentId`

### 3.2 Create Quick Reply
- **Method & Path**: `POST /quick-replies`
- **Permissions**: `quick_replies:manage`
- **Body**:
```json
{
  "title": "Welcome Greeting",
  "content": "Hello! Welcome to Stech Solutions. How may we assist you today?",
  "shortcut": "/welcome",
  "departmentId": null
}
```

### 3.3 Delete Quick Reply
- **Method & Path**: `DELETE /quick-replies/:id`
- **Permissions**: `quick_replies:manage`
