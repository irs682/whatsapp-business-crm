# Phase 6 — Database Design & Query Optimization

## 1. Schema Modifications

### AuditLog Model Extension
The `AuditLog` entity in PostgreSQL (`server/prisma/schema.prisma`) was extended to support departmental scoping, correlation tracking, and performant indexing:

```prisma
model AuditLog {
  id            String      @id @default(uuid())
  actorId       String?     @map("actor_id")
  action        String
  entity        String
  entityId      String?     @map("entity_id")
  departmentId  String?     @map("department_id")
  correlationId String?     @map("correlation_id")
  previousState Json?       @map("previous_state")
  newState      Json?       @map("new_state")
  metadata      Json?
  ipAddress     String?     @map("ip_address")
  userAgent     String?     @map("user_agent")

  actor         User?       @relation("ActorAuditLogs", fields: [actorId], references: [id])
  department    Department? @relation(fields: [departmentId], references: [id])
  createdAt     DateTime    @default(now()) @map("created_at")

  @@index([actorId])
  @@index([entity, entityId])
  @@index([departmentId])
  @@index([action])
  @@index([createdAt])
  @@map("audit_logs")
}
```

### Department Relation Update
Added `auditLogs AuditLog[]` relation on `Department` to support department-scoped audit queries and cascades.

---

## 2. Query Optimization & Indexing Strategy

1. **Date Range Scoping (`createdAt`)**:
   All reporting queries filter by `createdAt: { gte: start, lte: end }`. High-volume tables (`messages`, `conversations`, `audit_logs`, `campaigns`) maintain B-tree indexes on `created_at`.
2. **Department Bounding (`departmentId`)**:
   Tenant and departmental filtering uses indexed foreign keys (`@@index([departmentId])`) on `conversations`, `leads`, `contacts`, and `campaigns`.
3. **Compound Indexes**:
   - `[entity, entityId]` on `audit_logs` for entity lifecycle lookups.
   - `[conversationId, createdAt]` on `messages` for sequential FRT analysis.
4. **Prisma Aggregation Engine**:
   - `prisma.lead.groupBy({ by: ['stage'], _count: true, _sum: { value: true } })`
   - `prisma.message.groupBy({ by: ['status'], where: { direction: 'OUTBOUND' } })`
   - `prisma.campaign.aggregate({ _sum: { totalRecipients: true, deliveredCount: true, readCount: true } })`

All queries run with parameterized SQL via Prisma ORM to eliminate SQL injection vulnerabilities.
