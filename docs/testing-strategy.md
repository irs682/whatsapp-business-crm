# WhatsApp Business CRM - Testing Strategy

## 1. Testing Pyramid

WhatsApp Business CRM adopts a three-tier testing strategy:

```
        /  E2E Tests  \       (Playwright / Cypress)
       /   Integration \      (Supertest + Vitest API Testing)
      /    Unit Tests   \     (Vitest Pure Logic & Middleware)
     ---------------------
```

## 2. Backend Automated Testing

### Test Runner
- **Vitest**: Modern, ultra-fast test runner with ESM/CommonJS support, built-in mocking, and code coverage.
- **Supertest**: HTTP assertion library used for end-to-end route, middleware, and validation checks.

### Test Suites Included
1. **Health Check Tests (`server/tests/health.test.js`)**:
   - Asserts root `/` service metadata.
   - Asserts `/api/v1/health` heartbeat.
   - Asserts 404 standard `ApiError` responses.
2. **Authentication & Validation Tests (`server/tests/auth.test.js`)**:
   - Verifies 422 Unprocessable Entity on missing credentials or invalid emails.
   - Verifies 401 Unauthorized when accessing protected routes without Bearer tokens.
3. **WhatsApp Webhooks Tests (`server/tests/whatsapp.webhook.test.js`)**:
   - Verifies Meta webhook challenge handshake.
   - Verifies 403 Forbidden on invalid verify tokens.
   - Verifies 200 OK fast acknowledgment for incoming event payloads.

### Running Backend Tests
```bash
cd server
npm test
```

## 3. Frontend Automated Testing
- Unit testing for components and utility functions using Vitest and React Testing Library.
- Mocking network requests using MSW (Mock Service Worker) or Axios mock adapters.
