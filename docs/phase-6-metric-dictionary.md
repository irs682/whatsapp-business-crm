# Phase 6 Metric Dictionary & Data Definition Standard

This document is the authoritative standard for all calculations across the Stech WhatsApp Business CRM Reporting & Analytics engine. All backend services and frontend dashboards must strictly adhere to these definitions to prevent conflicting calculations.

---

## 1. Executive Management Metrics

| Metric ID | Display Name | Business Definition | Calculation Formula | Source Tables | Date Attribution | Scope / RBAC | Exclusions / Notes |
|---|---|---|---|---|---|---|---|
| `EXEC_CUST_TOTAL` | Total Accessible Customers | Total unique non-deleted contacts accessible to the user | `COUNT(contacts.id)` | `contacts` | Lifetime | Department scoped | Excludes `deletedAt != null` |
| `EXEC_CUST_NEW` | New Customers | Contacts created within the specified period | `COUNT(contacts.id WHERE createdAt >= start AND createdAt <= end)` | `contacts` | `createdAt` | Department scoped | Excludes deleted contacts |
| `EXEC_LEAD_TOTAL` | Total Leads | Total active pipeline opportunities | `COUNT(leads.id WHERE deletedAt IS NULL)` | `leads` | Lifetime | Department scoped | Active leads only |
| `EXEC_LEAD_WON` | Won Deals | Deals successfully closed in period | `COUNT(leads.id WHERE stage = 'WON' AND updatedAt >= start AND updatedAt <= end)` | `leads` | `updatedAt` | Department scoped | Closed won stage |
| `EXEC_LEAD_LOST` | Lost Deals | Deals marked lost in period | `COUNT(leads.id WHERE stage = 'LOST' AND updatedAt >= start AND updatedAt <= end)` | `leads` | `updatedAt` | Department scoped | Closed lost stage |
| `EXEC_CONV_OPEN` | Active Conversations | Threads currently needing attention | `COUNT(conversations.id WHERE status IN ('OPEN', 'PENDING'))` | `conversations` | Real-time snapshot | Department scoped | Excludes `RESOLVED`, `CLOSED` |
| `EXEC_CONV_UNASSIGNED`| Unassigned Queue | Active conversations with no agent assigned | `COUNT(conversations.id WHERE status = 'OPEN' AND assignedToUserId IS NULL)` | `conversations` | Real-time snapshot | Department scoped | High-urgency triage queue |
| `EXEC_OVERDUE_TASKS` | Overdue Follow-ups | Uncompleted tasks past their due timestamp | `COUNT(tasks.id WHERE status NOT IN ('COMPLETED', 'CANCELLED') AND dueDate < NOW())` | `tasks` | `dueDate` | Department / User scoped | Alerts management to delays |

---

## 2. Conversation & Inbox Analytics

| Metric ID | Display Name | Business Definition | Calculation Formula | Source Tables | Date Attribution | Scope / RBAC | Exclusions / Notes |
|---|---|---|---|---|---|---|---|
| `CONV_FRT_AVG` | Average First Response Time (Minutes) | Mean time taken for human agent to send initial reply to an incoming conversation | `AVG(firstOutboundMessage.createdAt - firstInboundMessage.createdAt)` | `conversations`, `messages` | `firstInboundMessage.createdAt` | Department scoped | Excludes internal notes; excludes unreplied chats |
| `CONV_FRT_MEDIAN` | Median First Response Time | Middle value in ordered first response distribution | `PERCENTILE_CONT(0.50)` | `conversations`, `messages` | `firstInboundMessage.createdAt` | Department scoped | Eliminates outlier skew |
| `CONV_RT_AVG` | Average Resolution Time (Hours) | Mean time taken from conversation initiation to first `RESOLVED` status transition | `AVG(resolvedAt - createdAt)` | `conversations` | `resolvedAt` | Department scoped | Only evaluated on resolved/closed threads |
| `CONV_REOPEN_RATE` | Conversation Reopen Rate (%) | Proportion of resolved conversations reopened due to subsequent inbound messages | `(COUNT(reopenedConversations) / COUNT(resolvedConversations)) * 100` | `conversations`, `activity_logs` | `activity_logs.createdAt` | Department scoped | Tracks resolution quality |
| `CONV_VOLUME_TREND` | Daily Conversation Volume | Total new threads initiated per calendar day (UTC) | `COUNT(conversations.id) GROUP BY DATE(createdAt)` | `conversations` | `createdAt` | Department scoped | Trend visualization |

---

## 3. Agent Performance Metrics

| Metric ID | Display Name | Business Definition | Calculation Formula | Source Tables | Date Attribution | Scope / RBAC | Exclusions / Notes |
|---|---|---|---|---|---|---|---|
| `AGENT_ASSIGNED_CHATS` | Assigned Conversations | Conversations assigned to agent within reporting window | `COUNT(conversations.id WHERE assignedToUserId = agentId)` | `conversations` | `updatedAt` / assignment logs | Manager / Self | Identifies workload assignment |
| `AGENT_RESOLVED_CHATS` | Resolved Conversations | Conversations resolved by this agent | `COUNT(conversations.id WHERE assignedToUserId = agentId AND status IN ('RESOLVED', 'CLOSED'))` | `conversations` | `resolvedAt` | Manager / Self | Output metric |
| `AGENT_FRT_AVG` | Agent Average FRT (Minutes) | Agent's personal average first response latency | `AVG(agentFirstReply.createdAt - inboundMsg.createdAt)` | `messages`, `conversations` | `agentFirstReply.createdAt` | Manager / Self | Core SLA indicator |
| `AGENT_TASKS_COMPLETED`| Tasks Completed | Follow-up tasks completed by agent | `COUNT(tasks.id WHERE assignedToUserId = agentId AND status = 'COMPLETED')` | `tasks` | `completedAt` | Manager / Self | CRM productivity |
| `AGENT_NOTES_CREATED` | Internal Notes Created | Number of collaboration/context notes written by agent | `COUNT(notes.id WHERE authorId = agentId)` | `notes` | `createdAt` | Manager / Self | Collaboration volume |

---

## 4. WhatsApp & Campaign Messaging Metrics

| Metric ID | Display Name | Business Definition | Calculation Formula | Source Tables | Date Attribution | Scope / RBAC | Exclusions / Notes |
|---|---|---|---|---|---|---|---|
| `WA_SENT_COUNT` | Messages Sent | Outbound messages accepted by Meta Cloud API | `COUNT(messages.id WHERE direction = 'OUTBOUND' AND status IN ('SENT', 'DELIVERED', 'READ'))` | `messages` | `createdAt` | Department scoped | Excludes local mock/draft errors |
| `WA_DELIVERY_RATE` | Delivery Rate (%) | Percentage of sent messages confirmed delivered to recipient device | `(COUNT(DELIVERED + READ) / COUNT(SENT + DELIVERED + READ + FAILED)) * 100` | `messages` | `createdAt` | Department scoped | Network & provider health |
| `WA_READ_RATE` | Read Receipt Rate (%) | Percentage of delivered messages read by customer | `(COUNT(READ) / COUNT(DELIVERED + READ)) * 100` | `messages` | `readAt` | Department scoped | Engagement indicator |
| `CAMP_SUPPRESS_RATE`| Campaign Suppression Rate (%)| Percentage of targeted audience suppressed due to opt-out or missing consent | `(suppressedCount / totalRecipients) * 100` | `campaigns` | `startedAt` | Manager / Admin | Compliance & list quality |
| `CAMP_OPT_OUT_RATE` | Campaign Opt-Out Rate (%) | Percentage of recipients who unsubscribed after campaign delivery | `(optOutCount / deliveredCount) * 100` | `campaigns` | Inbound webhook keyword timestamp | Manager / Admin | Meta quality rating guardrail |

---

## 5. Date Boundary & Timezone Rules
1. **Internal Storage**: All database timestamps are persisted and queried in UTC (`TIMESTAMPTZ` / Prisma `DateTime`).
2. **Boundary Standard**: Start dates are inclusive (`>= YYYY-MM-DD 00:00:00.000Z`), End dates are inclusive (`<= YYYY-MM-DD 23:59:59.999Z`).
3. **Period-over-Period Comparison**: The prior comparative period spans an identical number of days immediately preceding the selected start date:
   $$\text{Duration} = \text{End Date} - \text{Start Date}$$
   $$\text{Prior Period Start} = \text{Start Date} - \text{Duration}$$
   $$\text{Prior Period End} = \text{Start Date} - 1 \text{ ms}$$
