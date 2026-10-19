# Phase 7 Production Environment Configuration Guide
**Stech WhatsApp Business CRM**  
**Engineering Discipline:** DevOps & Cloud Infrastructure Architect  
**Branch:** `feature/phase-7-production-readiness`  

---

## 1. Overview & Separation of Environments

Stech WhatsApp Business CRM strictly delineates configurations across four execution environments:
1. **Development (`development`):** Local development with mock WhatsApp mode, dynamic CORS allowance, verbose error stack traces, and local SQLite/PostgreSQL.
2. **Automated Testing (`test`):** In-memory or disposable PostgreSQL database, synchronous webhook execution (`x-test-sync`), zero external network calls.
3. **Staging (`staging`):** Exact architectural replica of production connected to Meta Test Phone Number ID, pre-production database with full migration replay.
4. **Production (`production`):** Fail-fast startup validations, strict CORS origin restrictions, redacted stack traces, permanent Meta System User tokens, and durable worker processing.

---

## 2. Configuration Parameters Reference

### 2.1 Core Application
| Variable | Required | Default / Example | Description |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | Yes | `production` | Execution mode (`development`, `test`, `production`) |
| `PORT` | Yes | `5000` | HTTP listener port |
| `API_PREFIX` | No | `/api/v1` | Base route prefix for all REST APIs |
| `CLIENT_URL` | Yes | `https://crm.yourcompany.com` | Primary frontend web application URL |
| `ALLOWED_ORIGINS` | No | Comma-separated URLs | Whitelist of permitted CORS origins |

### 2.2 Database & Storage
| Variable | Required | Default / Example | Description |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | Yes | `postgresql://...` | PostgreSQL connection string |

### 2.3 Authentication & Security
| Variable | Required | Security Invariant | Description |
| :--- | :--- | :--- | :--- |
| `JWT_SECRET` | **MANDATORY** | Minimum 32 random chars | Cryptographic secret for signing auth tokens |
| `JWT_EXPIRES_IN` | No | `1d` | Token lifespan |
| `BCRYPT_SALT_ROUNDS`| No | `10` or `12` | Password hashing complexity factor |
| `RATE_LIMIT_WINDOW_MS`| No | `900000` (15 min) | Rate limiting evaluation window |
| `RATE_LIMIT_MAX` | No | `300` | Max requests per IP within the window |

### 2.4 Meta WhatsApp Cloud API
| Variable | Required | Description |
| :--- | :--- | :--- |
| `WHATSAPP_ENABLED` | Yes | Set `true` to activate integration |
| `WHATSAPP_MODE` | Yes | `production`, `test`, or `mock` |
| `WHATSAPP_API_VERSION` | Yes | Graph API version (pinned to `v21.0`) |
| `WHATSAPP_BASE_URL` | No | Default `https://graph.facebook.com` |
| `WHATSAPP_APP_ID` | In prod | Meta Developer Application ID |
| `WHATSAPP_APP_SECRET` | In prod | Meta App Secret (Hex) for webhook HMAC verification |
| `WHATSAPP_ACCESS_TOKEN`| In prod | Permanent System User Token with `whatsapp_business_messaging` |
| `WHATSAPP_PHONE_NUMBER_ID`| In prod | 15-digit Phone Number ID assigned by Meta |
| `WHATSAPP_BUSINESS_ACCOUNT_ID`| In prod | 15-digit WhatsApp Business Account ID (WABA) |
| `WHATSAPP_VERIFY_TOKEN`| In prod | Secret token for Meta Webhook challenge verification |
| `WHATSAPP_WEBHOOK_PATH`| No | Webhook route path (default `/api/v1/webhooks/whatsapp`) |

### 2.5 Background Campaign Workers
| Variable | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `CAMPAIGN_WORKER_ENABLED` | No | `true` | Enables in-process campaign job queue runner |
| `CAMPAIGN_RATE_LIMIT_DELAY_MS` | No | `50` | Throttling pause (ms) between consecutive messages |
| `CAMPAIGN_BATCH_SIZE` | No | `10` | Messages claimed per processing tick |
| `CAMPAIGN_MAX_RETRIES` | No | `3` | Maximum attempts before marking job `FAILED` |

---

## 3. Fail-Fast Startup Safeguards

Implemented in `server/src/config/env.js`:
When `NODE_ENV === 'production'`:
- If `DATABASE_URL` is empty, startup aborts with code 1.
- If `JWT_SECRET` is omitted, equals the default placeholder, or is under 32 characters, startup aborts with code 1.
- Insecure defaults are strictly blocked from booting in production environments.
