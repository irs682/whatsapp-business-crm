# Phase 4 Meta Setup & Onboarding Guide

## 1. Overview
This guide provides step-by-step instructions for connecting Stech WhatsApp Business CRM to the official **Meta WhatsApp Business Platform (Cloud API)**.

---

## 2. Prerequisites
1. A **Meta for Developers Account** ([https://developers.facebook.com/](https://developers.facebook.com/)).
2. A **Meta Business Portfolio (Business Manager)**.
3. An active **WhatsApp Business Account (WABA)**.
4. A phone number dedicated to the WhatsApp Business API (cannot be active on standard WhatsApp Mobile App at the same time).

---

## 3. Step-by-Step Onboarding

### Step 3.1: Create a Meta App
1. Go to the Meta Developer Dashboard and click **Create App**.
2. Select **Business** as the application type.
3. Name your application (e.g. `Stech WhatsApp Business CRM`).
4. In the app dashboard, navigate to **Add products to your app** and choose **WhatsApp** -> click **Set up**.

### Step 3.2: Obtain System User & Permanent Access Token
1. Go to **Meta Business Settings** -> **Users** -> **System Users**.
2. Click **Add**, assign the `Admin` system user role.
3. Click **Generate New Token**.
4. Select your WhatsApp App and check the required permissions:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
5. Copy the generated permanent access token and set it in your environment:
   ```bash
   WHATSAPP_ACCESS_TOKEN=EAAG...
   ```

### Step 3.3: Locate Phone Number ID & WABA ID
1. In your Meta App Dashboard, navigate to **WhatsApp** -> **API Setup**.
2. Copy the **Phone Number ID** (e.g. `104829102910291`) -> `WHATSAPP_PHONE_NUMBER_ID`.
3. Copy the **WhatsApp Business Account ID** -> `WHATSAPP_BUSINESS_ACCOUNT_ID`.
4. Copy your **App Secret** from **App Settings** -> **Basic** -> `WHATSAPP_APP_SECRET`.

### Step 3.4: Configure Webhooks
1. In your Meta App Dashboard, navigate to **WhatsApp** -> **Configuration**.
2. Click **Edit** under **Webhook**:
   - **Callback URL**: `https://your-public-domain.com/api/v1/webhooks/whatsapp`
   - **Verify Token**: value of `WHATSAPP_VERIFY_TOKEN` in `.env`
3. Click **Verify and Save**. (The backend will immediately validate the challenge token and return 200 OK).
4. Under **Webhook fields**, click **Manage** and subscribe to:
   - `messages` (for inbound customer messages and delivery/read receipts)
   - `message_template_status_update` (for template approval notices)

---

## 4. Environment Variables Reference

```env
WHATSAPP_ENABLED=true
WHATSAPP_MODE=production   # 'mock' | 'test' | 'production'
WHATSAPP_API_VERSION=v21.0
WHATSAPP_BASE_URL=https://graph.facebook.com
WHATSAPP_APP_ID=123456789012345
WHATSAPP_APP_SECRET=your_meta_app_secret
WHATSAPP_ACCESS_TOKEN=your_meta_system_user_token
WHATSAPP_PHONE_NUMBER_ID=your_meta_phone_number_id
WHATSAPP_BUSINESS_ACCOUNT_ID=your_meta_waba_id
WHATSAPP_VERIFY_TOKEN=your_custom_verify_token
WHATSAPP_WEBHOOK_PATH=/api/v1/webhooks/whatsapp
```
