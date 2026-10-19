# Phase 6 — Agent Performance & Productivity Analytics

## 1. Metric Architecture
The Agent Performance module evaluates genuine operational contributions without reducing productivity solely to raw message volume.

### Key Dimensions
1. **Assigned Conversations**: Total conversations assigned to the agent within the reporting period.
2. **Resolved Conversations**: Total conversations brought to `RESOLVED` or `CLOSED` status by the agent.
3. **Completed Tasks**: Follow-ups successfully completed within the reporting window (`completedAt: { gte: start, lte: end }`).
4. **Overdue Tasks**: Active tasks assigned to the agent where `dueDate < now()` and status is not `COMPLETED` or `CANCELLED`.
5. **Internal Collaboration Notes**: Count of internal context notes written on contacts, leads, or conversations.
6. **Transfers Initiated**: Count of conversation transfers escalated or handed over by the agent.

---

## 2. Departmental Isolation & Access Control
- **Staff / Agents**: Access is scoped to the agent's assigned departments and personal workload.
- **Team Managers**: Scoped to agents belonging to the manager's assigned department.
- **System Administrators**: Unrestricted organization-wide performance scorecard.
