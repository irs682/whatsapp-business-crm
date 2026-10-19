# Phase 6 — WhatsApp Messaging & Campaign Performance Analytics

## 1. WhatsApp Delivery Funnel & Webhook Reconciliation
Outbound message metrics reflect authentic provider message statuses recorded through Meta WhatsApp Cloud API webhooks:

1. **Queued**: Message generated and placed in database queue.
2. **Sent (`SENT`)**: Accepted by Meta Cloud API.
3. **Delivered (`DELIVERED`)**: Handset delivery receipt received via webhook.
4. **Read (`READ`)**: Customer opened and viewed message (blue tick receipt).
5. **Failed (`FAILED`)**: Error returned by Meta Graph API or carrier.

### Calculations
- **Delivery Rate (%)**:
  $$\text{Delivery Rate} = \left(\frac{\text{Delivered} + \text{Read}}{\text{Total Outbound}}\right) \times 100$$
- **Read Rate (%)**:
  $$\text{Read Rate} = \left(\frac{\text{Read}}{\text{Delivered} + \text{Read}}\right) \times 100$$

*Note: Locally saved drafts (`LOCAL_SAVED`) and simulated test submissions are excluded from authentic delivery calculations.*

---

## 2. Marketing Campaign Funnels
Campaign performance aggregates data from `Campaign`, `CampaignRecipient`, and `Message` entities:

- **Audience Reach**: Total targeted recipients.
- **Suppressed**: Recipients excluded due to missing consent (`consentStatus != GRANTED`) or active opt-out (`isOptedOut = true`).
- **Eligible Count**: Net recipients processed for dispatch.
- **Replies**: Explicit inbound messages linked to campaign context.
- **Opt-Outs**: Unsubscribes triggered during or immediately following campaign execution.
