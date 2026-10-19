# Phase 4 Webhook Security & HMAC Verification

## 1. Threat Model & Overview

Webhooks are public-facing HTTP endpoints vulnerable to spoofing, replay attacks, and unauthorized payload injection. Stech WhatsApp Business CRM implements strict cryptographic verification according to Meta's Cloud API security standards.

---

## 2. Signature Verification Details

### 2.1 Raw-Body Capture
HMAC-SHA256 calculations depend on the exact binary byte representation of the incoming request body before any parsing or whitespace manipulation takes place.
In `server/src/app.js`:
```javascript
app.use(
  express.json({
    limit: '10mb',
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);
```

### 2.2 Timing-Safe Comparison
To defend against side-channel timing attacks, hash signatures are compared using `crypto.timingSafeEqual`:
```javascript
const providedBuf = Buffer.from(providedSignatureHex, 'hex');
const expectedBuf = Buffer.from(expectedSignatureHex, 'hex');

if (providedBuf.length !== expectedBuf.length) {
  return false;
}

return crypto.timingSafeEqual(providedBuf, expectedBuf);
```

### 2.3 Operating Modes & Enforcement
- **Production Mode**: Signature verification is strictly mandatory. Requests missing `X-Hub-Signature-256` or bearing invalid signatures are rejected with `401 Unauthorized`.
- **Test Mode**: Enforces signature verification whenever `WHATSAPP_APP_SECRET` is configured.
- **Mock Mode**: Verifies signatures when provided, but permits unsigned mock events for isolated local testing.
