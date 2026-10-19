# Phase 3 Database Design & Schema Specification

## 1. Schema Modifications Overview

Phase 3 introduces modifications and additions to the PostgreSQL schema managed via Prisma ORM (`server/prisma/schema.prisma`).

---

## 2. Updated Enums

### 2.1. `ConversationPriority` (New)
```prisma
enum ConversationPriority {
  LOW
  NORMAL
  HIGH
  URGENT
}
```

### 2.2. `MessageStatus` (Extended)
Added `LOCAL_SAVED` to distinguish internal Phase 3 messages from live Meta-delivered messages:
```prisma
enum MessageStatus {
  PENDING
  LOCAL_SAVED
  SENT
  DELIVERED
  READ
  FAILED
}
```

---

## 3. New Models

### 3.1. `ConversationTransfer`
Tracks immutable handover history and context during cross-departmental escalations.
```prisma
model ConversationTransfer {
  id              String       @id @default(uuid()) @db.Uuid
  conversationId  String       @map("conversation_id") @db.Uuid
  fromDepartmentId String?     @map("from_department_id") @db.Uuid
  toDepartmentId  String       @map("to_department_id") @db.Uuid
  transferredById String       @map("transferred_by_id") @db.Uuid
  reason          String       @db.Text
  handoverNote    String?      @map("handover_note") @db.Text
  createdAt       DateTime     @default(now()) @map("created_at")

  conversation    Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  fromDepartment  Department?  @relation("TransfersFrom", fields: [fromDepartmentId], references: [id])
  toDepartment    Department   @relation("TransfersTo", fields: [toDepartmentId], references: [id])
  transferredBy   User         @relation(fields: [transferredById], references: [id])

  @@index([conversationId])
  @@index([toDepartmentId])
  @@map("conversation_transfers")
}
```

### 3.2. `ConversationReadState`
Tracks user-specific conversation read progress independently to prevent one agent clearing another user's unread indicator.
```prisma
model ConversationReadState {
  id              String       @id @default(uuid()) @db.Uuid
  conversationId  String       @map("conversation_id") @db.Uuid
  userId          String       @map("user_id") @db.Uuid
  lastReadAt      DateTime     @default(now()) @map("last_read_at")
  lastReadMessageId String?    @map("last_read_message_id") @db.Uuid

  conversation    Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  user            User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([conversationId, userId])
  @@map("conversation_read_states")
}
```

### 3.3. `QuickReply`
Reusable snippets for rapid agent responses with shortcut triggers (e.g. `/hello`, `/pricing`).
```prisma
model QuickReply {
  id           String      @id @default(uuid()) @db.Uuid
  title        String      @db.VarChar(100)
  content      String      @db.Text
  shortcut     String      @unique @db.VarChar(50)
  departmentId String?     @map("department_id") @db.Uuid
  createdById  String      @map("created_by_id") @db.Uuid
  isActive     Boolean     @default(true) @map("is_active")
  createdAt    DateTime    @default(now()) @map("created_at")
  updatedAt    DateTime    @updatedAt @map("updated_at")

  department   Department? @relation(fields: [departmentId], references: [id])
  createdBy    User        @relation(fields: [createdById], references: [id])

  @@index([departmentId])
  @@map("quick_replies")
}
```

---

## 4. Extended Models

### 4.1. `Conversation`
Extended with operational priority, inbound message tracking, resolution timestamps, and relational hooks:
- `priority`: `ConversationPriority @default(NORMAL)`
- `lastInboundMessageAt`: `DateTime?`
- `resolvedAt`: `DateTime?`
- `closedAt`: `DateTime?`
- `transfers`: `ConversationTransfer[]`
- `readStates`: `ConversationReadState[]`

### 4.2. Composite & Single-Column Indexes
- `idx_conversations_dept_status`: `[departmentId, status]`
- `idx_conversations_assigned`: `[assignedToUserId]`
- `idx_conversations_last_message`: `[lastMessageAt]`
- `idx_quick_replies_shortcut`: `[shortcut]` (Unique)
- `idx_read_state_conv_user`: `[conversationId, userId]` (Unique)
