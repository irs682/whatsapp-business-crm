# Phase 4 Database Design & Entity Relationships

## 1. Schema Utilization Overview

Phase 4 utilizes the robust PostgreSQL data models established in Phases 1–3, extending operational workflows for Meta message identifiers, provider timestamps, templates, and opt-out tracking.

---

## 2. Core Entity Schemas & Fields

### 2.1 `Message` (Outbound & Inbound Tracking)
```prisma
model Message {
  id              String           @id @default(uuid())
  conversationId  String           @map("conversation_id")
  direction       MessageDirection // INBOUND | OUTBOUND
  type            MessageType      // TEXT | IMAGE | DOCUMENT | AUDIO | VIDEO | LOCATION | TEMPLATE | INTERACTIVE
  text            String?
  mediaUrl        String?          @map("media_url")
  metadata        Json?            // Stores full Meta webhook packet / template variables
  waMessageId     String?          @unique @map("wa_message_id") // Meta wamid.HBgL...
  status          MessageStatus    // QUEUED | LOCAL_SAVED | SENT | DELIVERED | READ | FAILED
  failureReason   String?          @map("failure_reason")

  senderUserId    String?          @map("sender_user_id")
  senderUser      User?            @relation("UserSentMessages", fields: [senderUserId], references: [id])
  conversation    Conversation     @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  createdAt       DateTime         @default(now()) @map("created_at")
  updatedAt       DateTime         @updatedAt @map("updated_at")

  @@index([conversationId])
  @@index([waMessageId])
  @@index([status])
  @@map("messages")
}
```

### 2.2 `Conversation` (Policy Window & Activity Tracking)
- `lastInboundMessageAt`: `DateTime?` - Essential for calculating the 24-hour customer service window. Updated whenever an eligible customer message is received via webhook.
- `lastMessageAt`: `DateTime?` - Tracks latest overall message time for sorting queue conversations.
- `unreadCount`: `Int` - Incremented on incoming messages; reset when an agent opens and reads the conversation.

### 2.3 `MessageTemplate` (Pre-Approved Meta Templates)
```prisma
model MessageTemplate {
  id              String           @id @default(uuid())
  name            String           @unique
  category        TemplateCategory @default(MARKETING) // MARKETING | UTILITY | AUTHENTICATION
  language        String           @default("en_US")
  body            String           // e.g. "Hello {{1}}, welcome to Stech Solutions!"
  headerType      String?          @map("header_type")
  headerContent   String?          @map("header_content")
  footerContent   String?          @map("footer_content")
  buttons         Json?
  status          TemplateStatus   @default(DRAFT)     // DRAFT | SUBMITTED | APPROVED | REJECTED
  metaTemplateId  String?          @map("meta_template_id")

  createdAt       DateTime         @default(now()) @map("created_at")
  updatedAt       DateTime         @updatedAt @map("updated_at")
  deletedAt       DateTime?        @map("deleted_at")

  @@index([category])
  @@index([status])
  @@map("message_templates")
}
```

### 2.4 `Contact` (E.164 Identifiers & Opt-Out Flags)
- `phone`: Unique normalized E.164 string (`+18005550199`).
- `waId`: Meta-provided recipient WhatsApp identifier (`18005550199`).
- `isOptedOut`: Boolean flag toggled when customer sends opt-out keywords (`STOP`, `UNSUBSCRIBE`).
- `consentStatus`: `GRANTED` | `REVOKED` | `PENDING`.
