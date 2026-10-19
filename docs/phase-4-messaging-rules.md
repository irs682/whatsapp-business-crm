# Phase 4 Messaging Rules & 24-Hour Customer Service Window

## 1. Meta Customer Service Policy Rules

Under Meta's WhatsApp Business Platform policies:
1. **The 24-Hour Window**: When a customer sends a message to your WhatsApp Business number, a 24-hour customer service window opens.
2. **Free-form Responses**: During this 24-hour window, authorized staff may send free-form text, images, and documents without prior template approval.
3. **Outside the Window**: Once 24 hours have elapsed since the customer's last inbound message, free-form messaging is disallowed.
4. **Re-engagement**: To message a customer outside the 24-hour window, the business must use a pre-approved Meta WhatsApp Message Template.
5. **Window Reset**: The 24-hour window only resets when a genuine inbound message from the customer is received (an agent opening a conversation or reading a message does NOT reset the customer service window).

---

## 2. Technical Implementation in CRM

- The backend calculates eligibility dynamically:
  ```javascript
  const isWithinWindow = Date.now() - new Date(conversation.lastInboundMessageAt).getTime() <= 24 * 60 * 60 * 1000;
  ```
- Attempting to call `POST /conversations/:id/send-text` outside the window rejects with `422 Unprocessable Entity` (`OUTSIDE_24H_WINDOW`).
- The frontend Shared Team Inbox renders an active countdown timer (`🟢 24h Window Active: Xh Ym remaining`) or alert badge (`🔴 24h Window Expired: Template Required`).
- Sending an approved template via `POST /conversations/:id/send-template` is permitted at all times.
