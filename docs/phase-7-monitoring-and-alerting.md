# Stech WhatsApp Business CRM — Phase 7 Monitoring & Observability Architecture

**Document Version:** 1.0.0  
**Status:** Approved for Production Hardening  
**Target Architecture:** Node.js Express + PostgreSQL 16 + Socket.IO + Meta Cloud API  

---

## 1. Executive Summary

Production monitoring for Stech WhatsApp Business CRM provides real-time visibility into application health, database connectivity, asynchronous campaign worker throughput, Socket.IO connection concurrency, and WhatsApp webhook processing. This document specifies health check probes, structured logging standards, correlation tracing, metrics instrumentation, alerting rules, and incident response procedures.

---

## 2. Health Check Probes

The API exposes three distinct endpoints under `/api/v1/health` for orchestrators (Kubernetes, Docker Compose, AWS ECS, or Load Balancers):

| Endpoint | Type | Purpose | Success Condition | HTTP Status |
| :--- | :--- | :--- | :--- | :--- |
| `GET /api/v1/health` | Comprehensive Summary | Provides full dependency diagnostics (DB latency, WhatsApp mode, worker state). Redacts secrets. | Database reachable | `200 OK` (or `503 Service Unavailable`) |
| `GET /api/v1/health/live` | Liveness Probe | Verifies Node.js event loop is responsive and process has not deadlocked. | Process uptime > 0 | `200 OK` |
| `GET /api/v1/health/ready` | Readiness Probe | Verifies PostgreSQL connection is active via `SELECT 1` query probe before routing traffic. | Active DB connection | `200 OK` (or `503 Service Unavailable`) |

### Sample Health Payload (`GET /api/v1/health`)
```json
{
  "status": "healthy",
  "service": "whatsapp-business-crm-api",
  "version": "1.0.0",
  "timestamp": "2026-10-20T01:50:00.000Z",
  "uptimeSeconds": 1420,
  "correlationId": "req-1729389000000-a1b2c3d4",
  "dependencies": {
    "database": {
      "status": "healthy",
      "latencyMs": 3
    },
    "whatsapp": {
      "mode": "live",
      "enabled": true,
      "isConfigured": true
    },
    "worker": {
      "enabled": true,
      "rateLimitDelayMs": 100
    }
  }
}
```

*Security Guardrail:* No database connection strings, passwords, or WhatsApp tokens are ever exposed in health check outputs.

---

## 3. Structured Logging & Correlation Tracing

### 3.1 Distributed Tracing (`correlationId`)
Every incoming HTTP request is assigned a unique trace ID via `server/src/middleware/correlationId.middleware.js`:
- Propagates existing client header `X-Correlation-ID` or `X-Request-ID` if provided.
- Generates `req-[timestamp]-[randomHex]` if missing.
- Attaches `req.correlationId` to response headers `X-Correlation-ID`.
- Injected into all application loggers and error responses.

### 3.2 Error Logging & Redaction
The centralized error handler (`server/src/middleware/errorHandler.middleware.js`):
1. **Redacts Stack Traces:** Stack traces are omitted in production (`NODE_ENV=production`), returning clean JSON errors.
2. **Standardized Schema:**
```json
{
  "status": "fail",
  "message": "Resource not found",
  "correlationId": "req-1729389000000-a1b2c3d4"
}
```
3. **Secret Redaction Policy:** Application loggers sanitize headers (`Authorization`, `x-hub-signature-256`), database connection URLs, and recipient phone numbers (masked to `+92300*****67` in general application logs).

---

## 4. Key Performance Indicators (KPIs) & Metrics

| Category | Metric | Warning Threshold | Critical Threshold | Action Required |
| :--- | :--- | :--- | :--- | :--- |
| **API Health** | HTTP 5xx Error Rate | > 1% over 5m | > 5% over 5m | Page on-call; inspect error logs with correlation IDs. |
| **Latency** | p95 Response Time | > 500ms | > 2000ms | Inspect database slow queries and connection pool usage. |
| **Database** | Connection Pool Saturation | > 75% utilized | > 90% utilized | Increase `connection_limit` or scale read replicas. |
| **Database** | Migration Drift | Any unapplied migration | Unapplied migration in prod | Check deployment pipeline; run `prisma migrate status`. |
| **Worker** | Campaign Queue Stagnation | Pending jobs > 100 for > 10m | Pending jobs > 500 for > 30m | Inspect worker liveness, database locks, or Meta API rate limiting. |
| **Worker** | Campaign Job Failure Rate | > 2% failed | > 10% failed | Review Meta template rejections, phone number invalidity, or token expiry. |
| **WhatsApp** | Webhook HMAC Verification Failure | > 5 per minute | > 20 per minute | Investigate potential spoofing attack or mismatched `WHATSAPP_APP_SECRET`. |
| **WhatsApp** | Graph API 401 Unauthorized | > 1 event | Persistent 401 | Immediate token expiration alert. Rotate `WHATSAPP_ACCESS_TOKEN`. |
| **Realtime** | Socket.IO Disconnect Spikes | > 20% drops in 1m | > 50% drops in 1m | Check reverse proxy WebSocket timeout / buffer limits. |

---

## 5. Alerting Architecture & Integrations

For production deployment, monitoring agents (Prometheus Node Exporter, Datadog Agent, or CloudWatch) should be configured with the following notification channels:

1. **P0 Incidents (Immediate SMS / PagerDuty / OpsGenie):**
   - Database unreachable (`/api/v1/health/ready` returns 503).
   - Meta Access Token expired (`401 Unauthorized` on outbound WhatsApp API).
   - Core API unresponsive (`/api/v1/health/live` times out > 10s).
2. **P1 Incidents (Slack / Email Alerts):**
   - Worker queue stalled for > 15 minutes.
   - Webhook processing error rate > 5%.
   - Disk space utilization > 80% on PostgreSQL volume.
3. **P2 Warnings (Daily Digest):**
   - Transient WhatsApp network retry spikes.
   - Slow queries > 1000ms logged in PostgreSQL `pg_stat_statements`.

---

## 6. Observability Verification Checklist

- [x] Liveness probe (`/api/v1/health/live`) responds with 200 OK.
- [x] Readiness probe (`/api/v1/health/ready`) verifies DB connectivity.
- [x] Diagnostic health endpoint (`/api/v1/health`) confirms worker, database, and WhatsApp statuses without credential leaks.
- [x] Correlation IDs propagated on all responses and error payloads.
- [x] Stack traces hidden in production environment.
- [x] Secret sanitization verified on environment variables and headers.
