# Phase 2 — Security & Department Isolation Verification

## Security Principles Enforced
Phase 2 mandates zero regression of Phase 1 protections while extending RBAC, multi-tenancy, and department-level record isolation to all Core CRM entities.

---

## 1. Department Record Isolation
All database queries and retrieval routes enforce department boundaries at the SQL/Prisma query level before records are ever sent to controllers or clients:

- **Contacts**:
  - Non-privileged users (`AGENT`, `MANAGER`) are restricted to contacts whose `departmentId` matches one of the user's assigned departments, or contacts where `ownerId === user.id`, or unassigned contacts (`departmentId IS NULL`).
  - Cross-department contact access is blocked with `403 Forbidden` on direct GET, UPDATE, and DELETE.
- **Leads**:
  - Leads are filtered by department and assigned user ID.
  - Non-privileged staff cannot read, advance, or delete leads belonging to unauthorized departments.
- **Internal Notes**:
  - Parent record access is strictly checked before a note can be created or listed.
  - If a user cannot access Contact A, attempting to attach a note to Contact A returns `404 Not Found` or `403 Forbidden`.
- **Follow-up Tasks**:
  - Filtered by creator, assignee, and parent record department.
- **Dashboard Metrics**:
  - Counters and aggregates (`totalContacts`, `totalLeads`, `stageCounts`, `tasksDueSoonCount`) dynamically filter based on the caller's assigned departments. No restricted records are counted or leaked.

---

## 2. RBAC & Privilege Hierarchy
- **Last Active Super Admin Guard**:
  - Attempting to deactivate (`PATCH /users/:id/status`) or delete the last active `SUPER_ADMIN` is blocked with `400 Bad Request`.
- **Role Hierarchy**:
  - `AGENT` accounts cannot create users, assign roles, deactivate accounts, or view restricted users (`403 Forbidden`).
  - Users cannot assign roles higher than their own authority (`SUPER_ADMIN > ADMIN > MANAGER > AGENT`).
- **Secret Scrubbing**:
  - Password hashes, session secrets, and internal tokens are never serialized in API responses.

---

## 3. CSV Import & WhatsApp Marketing Compliance
- **Strict Non-Opt-in Safeguard**:
  - Importing a contact from CSV sets `consentStatus: 'PENDING'` and `isOptedOut: false`.
  - Under no circumstances does CSV import mark a contact as `consentStatus: 'GRANTED'` or `marketingEligible: true`.
  - Marketing opt-in requires explicit verified consent records via the Consent module.
- **Duplicate Identification**:
  - All phone numbers are normalized using E.164 formatting (`+<country_code><subscriber_number>`).
  - Intra-batch duplicates are detected in the first pass and rejected with clear row numbers.
  - Database duplicates are detected in the second pass and rejected before insertion.
