# Phase 4 WhatsApp Template Management

## 1. Overview
Meta WhatsApp message templates are standardized, pre-approved message formats required to initiate conversations or reply to customers outside the 24-hour service window.

---

## 2. Template Structure & Placeholders
Templates contain variable placeholders formatted as `{{1}}`, `{{2}}`, etc.

Example: `welcome_greeting`
- **Body**: `"Hello {{1}}, welcome to Stech Solutions! How can we assist you today?"`
- **Parameters**: `[{{ type: 'text', text: 'Sarah' }}]`
- **Rendered Output**: `"Hello Sarah, welcome to Stech Solutions! How can we assist you today?"`

---

## 3. Pre-Seeded Approved Templates

| Template Name | Category | Language | Sample Format |
|---|---|---|---|
| `welcome_greeting` | UTILITY | en_US | Hello {{1}}, welcome to Stech Solutions! How can we assist you today? |
| `support_followup` | UTILITY | en_US | Hello {{1}}, following up on your recent inquiry regarding {{2}}. Please let us know if you need further help. |
| `order_status_update` | UTILITY | en_US | Hi {{1}}, your order #{{2}} status is now: {{3}}. |

---

## 4. Frontend Template Picker
The Shared Inbox provides an intuitive template modal allowing staff to:
1. Select an approved template from a dropdown.
2. View a live preview of the message body.
3. Fill in dynamic parameters for each detected placeholder (`{{1}}`, `{{2}}`).
4. Dispatch directly to the customer over Meta Cloud API.
