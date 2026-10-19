# Phase 6 — REST API Reference: Reporting, Analytics & Audit Logging

## Base URL
`/api/v1`

All endpoints require JWT Bearer authentication:
`Authorization: Bearer <token>`

---

## 1. Executive Management Dashboard
- **Endpoint**: `GET /api/v1/reports/executive`
- **Permission**: `reports:read`
- **Query Parameters**:
  - `range`: Preset string (`today`, `yesterday`, `7days`, `30days`, `thisMonth`, `lastMonth`)
  - `startDate`: ISO 8601 string (when `range=custom`)
  - `endDate`: ISO 8601 string (when `range=custom`)
  - `departmentId`: UUID (optional department filter)
- **Response**:
```json
{
  "success": true,
  "message": "Executive report metrics retrieved",
  "data": {
    "period": { "start": "2026-09-19T00:00:00.000Z", "end": "2026-10-19T23:59:59.999Z" },
    "customers": { "total": 1420, "newInPeriod": 180, "priorPeriodNew": 150, "growthPercent": 20.0 },
    "leads": { "total": 85, "newInPeriod": 25, "priorPeriodNew": 20, "growthPercent": 25.0, "won": 12, "lost": 3, "byStage": [] },
    "inbox": { "open": 42, "pending": 18, "resolved": 320, "unassigned": 6, "totalActive": 60 },
    "tasks": { "overdue": 4 },
    "campaigns": { "total": 8, "completed": 7, "totalRecipients": 2400, "delivered": 2280, "read": 1800 }
  }
}
```

---

## 2. Conversation & Inbox Analytics
- **Endpoint**: `GET /api/v1/reports/conversations`
- **Permission**: `reports:read`
- **Response**:
```json
{
  "success": true,
  "message": "Conversation metrics retrieved",
  "data": {
    "volume": { "total": 420, "open": 42, "pending": 18, "resolved": 360, "unassigned": 6 },
    "performance": {
      "averageFirstResponseMinutes": 4.2,
      "medianFirstResponseMinutes": 3.0,
      "evaluatedFRTSampleSize": 380,
      "averageResolutionHours": 2.8,
      "medianResolutionHours": 1.5,
      "reopenRatePercent": 3.4
    },
    "trends": { "daily": [], "byDepartment": [] }
  }
}
```

---

## 3. Agent Performance Analytics
- **Endpoint**: `GET /api/v1/reports/agents`
- **Permission**: `reports:read`
- **Response**:
```json
{
  "success": true,
  "message": "Agent performance metrics retrieved",
  "data": {
    "agents": [
      {
        "agentId": "uuid",
        "name": "Jane Agent",
        "email": "jane@crm.local",
        "departments": ["Support"],
        "assignedConversations": 45,
        "resolvedConversations": 41,
        "completedTasks": 18,
        "overdueTasks": 1,
        "notesWritten": 24,
        "transfersInitiated": 3
      }
    ]
  }
}
```

---

## 4. Department Performance Analytics
- **Endpoint**: `GET /api/v1/reports/departments`
- **Permission**: `reports:read`

---

## 5. Customers & Contacts Analytics
- **Endpoint**: `GET /api/v1/reports/contacts`
- **Permission**: `reports:read`

---

## 6. Lead Pipeline Analytics
- **Endpoint**: `GET /api/v1/reports/leads`
- **Permission**: `reports:read`

---

## 7. WhatsApp Messaging Delivery Analytics
- **Endpoint**: `GET /api/v1/reports/whatsapp`
- **Permission**: `reports:read`

---

## 8. Campaign Performance Analytics
- **Endpoint**: `GET /api/v1/reports/campaigns`
- **Permission**: `reports:read`

---

## 9. Task Performance Analytics
- **Endpoint**: `GET /api/v1/reports/tasks`
- **Permission**: `reports:read`

---

## 10. Secure Report Export
- **Endpoint**: `POST /api/v1/reports/export` (also supports `GET /api/v1/reports/export`)
- **Permission**: `reports:export`
- **Request Body**:
```json
{
  "type": "executive",
  "filters": { "range": "30days", "departmentId": "uuid" }
}
```
- **Response**: Streaming `text/csv; charset=utf-8` file with sanitized cells against spreadsheet formula injection.

---

## 11. Comprehensive Audit Log Viewer
- **Endpoints**:
  - `GET /api/v1/audit-logs`: Paginated audit log search with filters (`page`, `limit`, `actorId`, `action`, `entity`, `departmentId`, `startDate`, `endDate`, `search`).
  - `GET /api/v1/audit-logs/:id`: Single audit record inspector.
  - `GET /api/v1/audit-logs/export`: CSV export of audit records.
- **Permission**: `audit:read` (Super Admin and Admin).
