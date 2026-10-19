# Phase 6 — Conversation Analytics, SLA & Response Time Specifications

## 1. Metric Formulations

### First Response Time (FRT)
- **Business Purpose**: Measures operational speed in responding to inbound customer WhatsApp messages.
- **Formula**:
  $$\text{FRT} = \text{Timestamp}(\text{First Outbound Human Message}) - \text{Timestamp}(\text{First Inbound Customer Message})$$
- **Inclusion Rules**:
  - The inbound message must precede the outbound reply.
  - The outbound message must be sent by an assigned agent or authorized user (`direction: 'OUTBOUND'`).
  - Internal team notes are stored in the `Note` table and are explicitly excluded from FRT.
- **Handling Incomplete Samples**:
  - Conversations without an inbound message or waiting for a first reply are omitted from the FRT duration array and tracked in the `unassigned` / `open` volume queue.
  - Both **Mean (Average)** and **Median** are computed to avoid skewing caused by long overnight idle periods.

### Resolution Time (RT)
- **Business Purpose**: Measures full lifecycle time to resolve a conversation.
- **Formula**:
  $$\text{RT} = \text{Timestamp}(\text{resolvedAt}) - \text{Timestamp}(\text{createdAt})$$
- **Reopen Rate**:
  $$\text{Reopen Rate} = \left(\frac{\text{CONVERSATION\_REOPENED Events}}{\text{Total Resolved Conversations}}\right) \times 100$$
  Derived from chronological `ActivityLog` records matching the conversation ID.

---

## 2. Shared Inbox Queues & Routing Flow
- **Open Queue**: Actively worked on by staff.
- **Pending Queue**: Waiting on external customer response.
- **Resolved / Closed**: Customer issue completed.
- **Unassigned Queue**: Status `OPEN` with `assignedToUserId: null`.
- **Department Allocation**: Grouped by current owning department while tracking historical transfer flows in the `ConversationTransfer` table.
