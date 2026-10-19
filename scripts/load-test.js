/**
 * Stech WhatsApp Business CRM — Phase 7 Performance & Load Testing Suite
 * Executes simulated concurrent workloads against CRM API endpoints:
 * 1. Health & Liveness probes
 * 2. Authenticated Dashboard statistics
 * 3. Contact listing & search
 * 4. Conversation listing
 * 5. Webhook event ingestion bursts with HMAC SHA-256 verification
 */

const http = require('http');
const crypto = require('crypto');
const path = require('path');
process.env.NODE_ENV = 'test';
require(path.resolve(__dirname, '../server/node_modules/dotenv')).config({ path: path.resolve(__dirname, '../server/.env') });

const app = require('../server/src/app');
const prisma = require('../server/src/config/prisma');

function calculatePercentiles(latencies) {
  if (!latencies.length) return { min: 0, avg: 0, p50: 0, p90: 0, p95: 0, p99: 0, max: 0 };
  const sorted = [...latencies].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, val) => acc + val, 0);
  const getP = (p) => sorted[Math.min(Math.floor((p / 100) * sorted.length), sorted.length - 1)];

  return {
    min: sorted[0],
    avg: Math.round(sum / sorted.length),
    p50: getP(50),
    p90: getP(90),
    p95: getP(95),
    p99: getP(99),
    max: sorted[sorted.length - 1],
  };
}

function makeRequest(serverUrl, options, body = null) {
  return new Promise((resolve) => {
    const start = Date.now();
    const url = new URL(options.path, serverUrl);

    const req = http.request(
      url,
      {
        method: options.method || 'GET',
        headers: options.headers || {},
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          const duration = Date.now() - start;
          resolve({
            statusCode: res.statusCode,
            duration,
            body: data,
          });
        });
      }
    );

    req.setTimeout(8000, () => {
      req.destroy();
      resolve({ statusCode: 504, duration: Date.now() - start, error: 'Request Timeout' });
    });

    req.on('error', (err) => {
      resolve({
        statusCode: 0,
        duration: Date.now() - start,
        error: err.message,
      });
    });

    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runScenario(name, serverUrl, concurrency, totalRequests, reqFn) {
  process.stdout.write(`  Running: ${name} (${totalRequests} total, concurrency: ${concurrency})... `);
  const latencies = [];
  let successful = 0;
  let failed = 0;
  const startTime = Date.now();

  let issued = 0;
  async function worker() {
    while (issued < totalRequests) {
      const idx = issued++;
      const res = await reqFn(serverUrl, idx);
      latencies.push(res.duration);
      if (res.statusCode >= 200 && res.statusCode < 400) {
        successful++;
      } else {
        failed++;
      }
    }
  }

  const workers = [];
  for (let i = 0; i < concurrency; i++) {
    workers.push(worker());
  }
  await Promise.all(workers);

  const totalTimeMs = Date.now() - startTime;
  const rps = Math.round((totalRequests / (totalTimeMs / 1000)) * 10) / 10;
  const stats = calculatePercentiles(latencies);

  console.log(`DONE in ${(totalTimeMs / 1000).toFixed(2)}s (${rps} req/sec, Failures: ${failed})`);
  return {
    name,
    totalRequests,
    concurrency,
    durationSec: (totalTimeMs / 1000).toFixed(2),
    rps,
    successful,
    failed,
    stats,
  };
}

async function main() {
  console.log('=================================================================');
  console.log('🚀 STECH WHATSAPP BUSINESS CRM — PHASE 7 PERFORMANCE & LOAD TEST');
  console.log('=================================================================\n');

  const startMem = process.memoryUsage();
  const server = http.createServer(app);

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const serverUrl = `http://127.0.0.1:${address.port}`;
  console.log(`[INFO] Ephemeral test server active on ${serverUrl}`);

  // Obtain an auth token for authenticated scenarios
  console.log('[INFO] Authenticating test administrative session...');
  const loginRes = await makeRequest(
    serverUrl,
    {
      path: '/api/v1/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { email: 'admin@crm.local', password: 'Admin123!' }
  );

  let token = null;
  try {
    const parsed = JSON.parse(loginRes.body);
    token = parsed.token || (parsed.data && parsed.data.token);
  } catch (err) {
    console.error('Failed to parse auth token:', err);
  }

  if (!token) {
    console.warn('[WARN] Auth token acquisition failed. Authenticated endpoints will return 401.');
  } else {
    console.log('[INFO] Auth session established successfully.');
  }

  const results = [];

  // Scenario 1: Health Check Liveness Probe
  results.push(
    await runScenario('Health Check (/api/v1/health/live)', serverUrl, 20, 100, async (base) => {
      return makeRequest(base, { path: '/api/v1/health/live' });
    })
  );

  // Scenario 2: Deep Health & DB Status Probe
  results.push(
    await runScenario('System Health & DB Probe (/api/v1/health)', serverUrl, 10, 50, async (base) => {
      return makeRequest(base, { path: '/api/v1/health' });
    })
  );

  // Scenario 3: Contact Search & Pagination (Authenticated)
  results.push(
    await runScenario('Contact Search (/api/v1/contacts?limit=10)', serverUrl, 10, 50, async (base) => {
      return makeRequest(base, {
        path: '/api/v1/contacts?limit=10',
        headers: { Authorization: `Bearer ${token}` },
      });
    })
  );

  // Scenario 4: Shared Inbox Conversation List (Authenticated)
  results.push(
    await runScenario('Conversations List (/api/v1/conversations?limit=10)', serverUrl, 10, 50, async (base) => {
      return makeRequest(base, {
        path: '/api/v1/conversations?limit=10',
        headers: { Authorization: `Bearer ${token}` },
      });
    })
  );

  // Scenario 5: Dashboard Overview Metrics (Authenticated DB Aggregation)
  results.push(
    await runScenario('Dashboard Metrics (/api/v1/dashboard/metrics)', serverUrl, 10, 30, async (base) => {
      return makeRequest(base, {
        path: '/api/v1/dashboard/metrics',
        headers: { Authorization: `Bearer ${token}` },
      });
    })
  );

  // Scenario 6: WhatsApp Webhook Event Burst (Simulated Inbound Message)
  const appSecret = process.env.WHATSAPP_APP_SECRET || 'test_app_secret';
  results.push(
    await runScenario('Webhook Ingestion Burst (/api/v1/webhooks/whatsapp)', serverUrl, 10, 40, async (base, idx) => {
      const payload = JSON.stringify({
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: { display_phone_number: '15551234567', phone_number_id: '100000000000000' },
                  contacts: [{ profile: { name: `Load User ${idx}` }, wa_id: `1555000${idx}` }],
                  messages: [
                    {
                      from: `1555000${idx}`,
                      id: `wamid.HBgLMTU1NTAwM${idx}==`,
                      timestamp: Math.floor(Date.now() / 1000),
                      text: { body: `Performance load test message ${idx}` },
                      type: 'text',
                    },
                  ],
                },
                field: 'messages',
              },
            ],
          },
        ],
      });

      const signature = 'sha256=' + crypto.createHmac('sha256', appSecret).update(payload).digest('hex');

      return makeRequest(
        base,
        {
          path: '/api/v1/webhooks/whatsapp',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-hub-signature-256': signature,
          },
        },
        payload
      );
    })
  );

  const endMem = process.memoryUsage();
  await new Promise((resolve) => server.close(resolve));
  await prisma.$disconnect();

  console.log('\n=================================================================');
  console.log('📊 PERFORMANCE & LOAD TEST SUMMARY');
  console.log('=================================================================');
  console.table(
    results.map((r) => ({
      Scenario: r.name,
      Requests: r.totalRequests,
      'RPS': r.rps,
      'Min (ms)': r.stats.min,
      'Avg (ms)': r.stats.avg,
      'p50 (ms)': r.stats.p50,
      'p95 (ms)': r.stats.p95,
      'p99 (ms)': r.stats.p99,
      'Max (ms)': r.stats.max,
      'Failed': r.failed,
    }))
  );

  console.log(`\nMemory Delta: RSS +${Math.round((endMem.rss - startMem.rss) / (1024 * 1024))}MB, Heap +${Math.round((endMem.heapUsed - startMem.heapUsed) / (1024 * 1024))}MB`);
  console.log('Load test completed cleanly.\n');
}

main().catch((err) => {
  console.error('Fatal load test failure:', err);
  process.exit(1);
});
