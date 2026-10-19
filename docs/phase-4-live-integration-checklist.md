# Phase 4 Live Meta Integration Verification Checklist

## 1. Overview
This checklist defines the validation procedure for connecting Stech WhatsApp Business CRM to a live Meta WhatsApp Business Account and executing end-to-end verification.

---

## 2. Current Status
- **Technical Implementation**: **COMPLETE AND TESTED** (Mock & unit tests passing 44/44).
- **Live Meta Verification**: **BLOCKED BY EXTERNAL CONFIGURATION** (Pending organization account owner providing live Meta WABA credentials & public HTTPS webhook callback).

---

## 3. End-to-End Verification Procedure (To Be Executed With Live Credentials)

- [ ] **Step 1: Public HTTPS Webhook Tunnel**
  - Launch an HTTPS tunnel (e.g. ngrok or Cloudflare Tunnel) to port 5000:
    ```bash
    ngrok http 5000
    ```
- [ ] **Step 2: Meta Webhook Subscription Verification**
  - In Meta App Dashboard -> WhatsApp -> Configuration:
    - Set Callback URL to: `https://<your-subdomain>.ngrok-free.app/api/v1/webhooks/whatsapp`
    - Enter `WHATSAPP_VERIFY_TOKEN` and click **Verify and Save**.
    - Confirm the GET challenge verification succeeds with 200 OK.
- [ ] **Step 3: Webhook Fields Subscription**
  - Subscribe to `messages` and `message_template_status_update`.
- [ ] **Step 4: Receive Real Inbound WhatsApp Message**
  - Send a WhatsApp message from a physical phone to the Meta test/business phone number.
  - Confirm message appears in real time on the Shared Team Inbox timeline.
  - Verify contact creation and conversation linking.
- [ ] **Step 5: Send Real Free-Form WhatsApp Outbound Message**
  - From the CRM Inbox, type a reply and click send.
  - Confirm the physical phone receives the WhatsApp message.
  - Observe checkmark status progress: `SENT` -> `DELIVERED` -> `READ`.
- [ ] **Step 6: Send Real Pre-Approved WhatsApp Template**
  - Open Template Modal, choose `welcome_greeting`, fill in customer name, and send.
  - Confirm physical phone receives formatted template text.
- [ ] **Step 7: Inbound Opt-Out Verification**
  - Reply `STOP` from the physical phone.
  - Confirm CRM Contact record shows `isOptedOut: true` and `consentStatus: REVOKED`.
