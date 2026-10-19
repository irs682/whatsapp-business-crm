# Phase 6 — Advanced Reporting, Analytics, Audit Logging & Management Intelligence Architecture

## 1. System Overview
Phase 6 delivers an enterprise-grade analytics engine, audit trail framework, and management intelligence dashboard for Stech Solutions' WhatsApp Business CRM. The architecture prioritizes data accuracy, tenant and departmental isolation, zero hardcoded statistics, formula-injection-safe exports, and full traceability.

```
                           +----------------------------------------+
                           |     React + Vite Frontend Client      |
                           |  (ReportsPage & AuditLogsPage UI)      |
                           +-------------------+--------------------+
                                               |
                                     HTTPS REST + JWT Bearer
                                               v
+-----------------------------------------------------------------------------------+
|                            Node.js Express Backend API                            |
|                                                                                   |
|  +--------------------+  +-----------------------+  +--------------------------+  |
|  |  report.routes.js  |  |   audit.routes.js     |  |   rbac.middleware.js     |  |
|  | (/api/v1/reports)  |  |  (/api/v1/audit-logs) |  | (reports:read, audit:read|  |
|  +---------+----------+  +-----------+-----------+  +--------------------------+  |
|            |                         |                                            |
|            v                         v                                            |
|  +--------------------+  +-----------------------+  +--------------------------+  |
|  |  report.service.js |  |   audit.service.js    |  |     auditLogger.js       |  |
|  |  - FRT / RT engine |  |  - Filter & Paging    |  |  - Sensitive Redaction   |  |
|  |  - Funnel analysis |  |  - Immutable Logs     |  |  - Correlation IDs       |  |
|  |  - Period compar.  |  |  - Dept. Scoping      |  |                          |  |
|  |  - Sanitized CSV   |  +-----------+-----------+  +--------------------------+  |
|  +---------+----------+              |                                            |
|            |                         |                                            |
+------------+-------------------------+--------------------------------------------+
             |                         |
             +------------+------------+
                          v
+-----------------------------------------------------------------------------------+
|                        PostgreSQL Database via Prisma ORM                         |
|                                                                                   |
|   Conversations | Messages | Contacts | Leads | Tasks | Campaigns | AuditLogs     |
|   Indices: [department_id], [created_at], [status], [actor_id], [action]          |
+-----------------------------------------------------------------------------------+
```

## 2. Core Architectural Pillars

### A. True Database Aggregation (Zero Fabrication)
Every metric displayed on the Executive Dashboard, Conversation Analytics, Agent Performance, Lead Pipeline, WhatsApp Funnel, Campaign Reach, and Task Overdues is computed in real time from authentic database records using Prisma aggregations (`count`, `groupBy`, `aggregate`, and relation queries).

### B. Departmental & Role Isolation (RBAC)
- **SUPER_ADMIN & ADMIN**: Complete cross-department visibility into organization-wide metrics and comprehensive audit logs.
- **MANAGER**: Visibility bounded strictly to the departments to which the manager is assigned (`targetDepartmentIds` query clause enforced at the database level).
- **AGENT**: Allowed to view their own workload/metrics; strictly blocked from administrative audit logs and cross-team executive summaries (enforced by `requirePermissions(PERMISSIONS.AUDIT_READ)` returning 403 Forbidden).

### C. First Response Time (FRT) & Resolution Time (RT) Engine
- **FRT Definition**: Time difference between the first inbound customer message in a conversation and the first subsequent outbound qualifying agent message (`direction: 'OUTBOUND'`, excluding internal notes).
- **RT Definition**: Time difference between conversation creation and the first qualifying resolution event (`resolvedAt`).
- **Median & Mean Metrics**: Computed across evaluated conversation samples to prevent outlier skewing.

### D. Audit Logging & Security Redaction
- Enterprise `logAudit` utility records actor ID, action, entity type, entity ID, department ID, correlation ID, previous state, new state, client IP address, and metadata.
- **Secret Redaction**: Recursively replaces passwords, tokens, API keys, secrets, and auth headers with `[REDACTED]`.
- **Immutability**: Audit records have no update or delete routes in the application API.

### E. Secure Report Export & Formula-Injection Defense
- Exports are delivered as streaming CSV files with headers: `Content-Type: text/csv; charset=utf-8` and `Content-Disposition: attachment; filename="report_..."`.
- **Formula Injection Mitigation**: Any value beginning with `=`, `+`, `-`, `@`, `\t`, or `\r` is automatically escaped with a leading single quote (`'`), neutralizing CSV injection in Excel, Google Sheets, and LibreOffice.
- Every export is auditable and logs a `REPORT_EXPORTED` event.
