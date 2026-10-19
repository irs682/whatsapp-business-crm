# Phase 2 — Core CRM API Reference Specification

## Base Configuration
- **Base URL**: `/api/v1`
- **Authentication**: JWT Bearer Token in `Authorization: Bearer <token>`
- **Content-Type**: `application/json`

---

## 1. User Management (`/api/v1/users`)

| Method | Endpoint | Required Permission | Description |
|---|---|---|---|
| `GET` | `/users` | `users:read` | List paginated staff accounts with filters (`roleId`, `departmentId`, `status`, `search`) |
| `POST` | `/users` | `users:create` | Create staff account with role and department assignments |
| `GET` | `/users/:id` | `users:read` | Retrieve single staff profile |
| `PATCH` | `/users/:id` | `users:update` | Update staff details (firstName, lastName, phone, roleId) |
| `PATCH` | `/users/:id/status` | `users:update` | Activate or deactivate user account (protects last active SUPER_ADMIN) |
| `PUT` | `/users/:id/departments` | `users:update` | Set assigned departments and primary department |

---

## 2. Department Management (`/api/v1/departments`)

| Method | Endpoint | Required Permission | Description |
|---|---|---|---|
| `GET` | `/departments` | `departments:read` | List departments with member counts and manager info |
| `POST` | `/departments` | `departments:create` | Create organizational department / isolation boundary |
| `GET` | `/departments/:id` | `departments:read` | Get department details |
| `PATCH` | `/departments/:id` | `departments:update` | Update department details or managerId |
| `GET` | `/departments/:id/users` | `departments:read` | List all staff members assigned to department |
| `POST` | `/departments/:id/users` | `departments:update` | Assign staff member to department |
| `DELETE` | `/departments/:id/users/:userId` | `departments:update` | Remove staff member from department |

---

## 3. Contact Tags (`/api/v1/tags`)

| Method | Endpoint | Required Permission | Description |
|---|---|---|---|
| `GET` | `/tags` | `tags:read` | List reusable contact classification tags |
| `POST` | `/tags` | `tags:manage` | Create tag with unique name and color code |
| `GET` | `/tags/:id` | `tags:read` | Get tag details |
| `PATCH` | `/tags/:id` | `tags:manage` | Update tag name, color, or description |
| `DELETE` | `/tags/:id` | `tags:manage` | Delete tag (cascades contact relationships safely) |

---

## 4. Contact Management (`/api/v1/contacts`)

| Method | Endpoint | Required Permission | Description |
|---|---|---|---|
| `GET` | `/contacts` | `contacts:read` | List contacts with department isolation & search |
| `POST` | `/contacts` | `contacts:create` | Create contact with normalized E.164 phone & duplicate check |
| `GET` | `/contacts/:id` | `contacts:read` | Get contact profile, notes, tasks, and activity |
| `PATCH` | `/contacts/:id` | `contacts:update` | Update contact information |
| `DELETE` | `/contacts/:id` | `contacts:delete` | Soft-delete contact |
| `POST` | `/contacts/import` | `contacts:create` | CSV contact import engine (`preview: true` or dry run; enforces `consentStatus: PENDING` safeguard) |
| `GET` | `/contacts/:id/activity` | `contacts:read` | Retrieve customer interaction activity timeline |

---

## 5. Lead Pipeline (`/api/v1/leads`)

| Method | Endpoint | Required Permission | Description |
|---|---|---|---|
| `GET` | `/leads` | `leads:read` | List opportunities filtered by stage, owner, and department |
| `POST` | `/leads` | `leads:create` | Create lead linked to contact and department |
| `GET` | `/leads/:id` | `leads:read` | Get lead details |
| `PATCH` | `/leads/:id` | `leads:update` | Update lead or advance stage (records `LEAD_STAGE_CHANGED` activity) |
| `DELETE` | `/leads/:id` | `leads:delete` | Soft-delete lead opportunity |
| `GET` | `/leads/stages` | `leads:read` | List configurable pipeline stages |
| `POST` | `/leads/stages` | `leads:create` | Create custom pipeline stage |
| `PATCH` | `/leads/stages/:id` | `leads:update` | Update stage order or title |

---

## 6. Internal Notes (`/api/v1/notes`)

| Method | Endpoint | Required Permission | Description |
|---|---|---|---|
| `GET` | `/notes` | `notes:read` | List notes for a contact or lead (validates caller access to parent record) |
| `POST` | `/notes` | `notes:create` | Create confidential internal note (author tracked automatically) |
| `DELETE` | `/notes/:id` | `notes:delete` | Soft delete note (author or admin only) |

---

## 7. Follow-up Tasks (`/api/v1/tasks`)

| Method | Endpoint | Required Permission | Description |
|---|---|---|---|
| `GET` | `/tasks` | `tasks:read` | List tasks (`filter`: `all`, `assigned_to_me`, `overdue`, `due_soon`, `completed`) |
| `POST` | `/tasks` | `tasks:create` | Create task with priority, status, and due date |
| `GET` | `/tasks/:id` | `tasks:read` | Get task details |
| `PATCH` | `/tasks/:id` | `tasks:update` | Update task (transitions to `COMPLETED` auto-record `completedAt`) |
| `DELETE` | `/tasks/:id` | `tasks:delete` | Soft-delete task |

---

## 8. CRM Dashboard (`/api/v1/dashboard`)

| Method | Endpoint | Required Permission | Description |
|---|---|---|---|
| `GET` | `/dashboard/metrics` | `dashboard:read` | Returns PostgreSQL aggregated counters, pipeline distribution, recent leads, and activity stream scoped by department isolation |
