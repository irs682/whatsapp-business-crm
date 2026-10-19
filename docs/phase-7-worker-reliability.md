# Phase 7 Background Worker Reliability & Campaign Queue Hardening
**Stech WhatsApp Business CRM**  
**Engineering Discipline:** Site Reliability Engineer & Backend Engineer  
**Branch:** `feature/phase-7-production-readiness`  

---

## 1. Queue Architecture & State Machine

Stech WhatsApp Business CRM utilizes a PostgreSQL database-backed durable queue implementation (`campaign_send_jobs` and `campaign_recipients`). This architecture eliminates message loss when containers or server processes restart.

### Job State Transitions
```
                ┌──────────────┐
                │   PENDING    │
                └──────┬───────┘
                       │ Claimed by worker tick
                       ▼
                ┌──────────────┐
                │   CLAIMED    │
                └──────┬───────┘
                       │
       ┌───────────────┼───────────────┐
       │ Invariant     │ API Success   │ Network Failure /
       │ Opt-out Check │               │ Transient 5xx
       ▼               ▼               ▼
┌──────────────┐┌──────────────┐┌──────────────────────┐
│  SUPPRESSED  ││  COMPLETED   ││ PENDING (Backoff)    │
│  (No send)   ││ (SENT in WA) ││ (Attempts < Max)     │
└──────────────┘└──────────────┘└──────────┬───────────┘
                                           │ Max Retries Exceeded
                                           ▼
                                ┌──────────────────────┐
                                │        FAILED        │
                                │ (Permanent DLQ State)│
                                └──────────────────────┘
```

---

## 2. Hardened Worker Invariants

### 2.1 Configurable Throughput & Rate Limiting
- Replaced fixed 50 ms delay with `CAMPAIGN_RATE_LIMIT_DELAY_MS` (configurable in `server/.env`).
- For Meta Cloud API Tier-1 compliance (maximum 80 messages/second overall limit), recommended production setting is `50ms` (20 msgs/sec per worker node) or `100ms` (10 msgs/sec).
- Configurable batch claiming via `CAMPAIGN_BATCH_SIZE` (default: 10 jobs per tick).

### 2.2 Pre-Send Immediate Consent Re-Verification
- Before dispatching a message, the worker re-queries `prisma.contact.findUnique()` to verify that the contact has not opted out or revoked consent between the time the campaign was launched and the moment of physical dispatch.
- If revoked, the job is immediately marked `SUPPRESSED`, the campaign's `suppressedCount` is incremented, and no outbound WhatsApp request is transmitted.

### 2.3 Idempotent Retries & Exponential Backoff
- Transient network failures (`status >= 500`, timeout, or Meta rate-limit error `130429`) trigger exponential retry backoff:
  $$\text{Delay} = 2^{\text{attempts}} \times 2000 \text{ ms} + \text{jitter}$$
- Jobs reaching `maxAttempts` (default 3) transition to `FAILED` with explicit `errorDetails` logged, preventing infinite loops.

### 2.4 Worker Control & Process Decoupling
- Workers can be completely deactivated in web-only containers using `CAMPAIGN_WORKER_ENABLED=false`.
- When pausing or cancelling a campaign (`CAMPAIGN_STATUS.PAUSED` / `CANCELLED`), workers immediately halt execution of remaining pending jobs.
