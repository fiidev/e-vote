import http from "k6/http";
import { check, sleep } from "k6";
import { Trend } from "k6/metrics";
import exec from "k6/execution";

// Custom Trends to isolate phase latencies
const ttfbTrend = new Trend("duration_ttfb", true);
const writeTrend = new Trend("duration_write_operation", true);

// Configurable via CLI Environment Variables:
// k6 run -e TARGET_URL=https://myapi.com -e VUS=50 -e ITERATIONS=1000 universal-k6-template.js
const TARGET_URL = __ENV.TARGET_URL || "http://localhost:3000";
const VUS = parseInt(__ENV.VUS || "50", 10);
const ITERATIONS = parseInt(__ENV.ITERATIONS || "500", 10);
const MAX_DURATION = __ENV.MAX_DURATION || "3m";

export const options = {
  discardResponseBodies: false,
  scenarios: {
    stress_rush: {
      executor: "shared-iterations",
      vus: VUS,
      iterations: ITERATIONS,
      maxDuration: MAX_DURATION,
    },
  },
  thresholds: {
    "checks": ["rate>0.99"],                         // 99%+ requests must return 200 OK
    "http_req_failed": ["rate<0.01"],                 // Less than 1% failure
    "duration_ttfb": ["p(90)<500", "p(95)<1000"],    // p95 under 1 second
    "duration_write_operation": ["p(90)<800", "p(95)<1500"],
  },
};

const defaultHeaders = {
  "User-Agent": "k6-Universal-Optimizer/1.0",
  "Accept": "application/json",
  "Content-Type": "application/json",
  "Connection": "keep-alive",
};

export default function () {
  // CRITICAL: Always use exec.scenario.iterationInTest for unique per-iteration data
  // Using __ITER causes collisions across concurrent VUs!
  const uniqueIndex = exec.scenario.iterationInTest;

  // 1. PHASE 1: Read Endpoint (Health / Metadata / Catalog)
  const resRead = http.get(`${TARGET_URL}/healthz`, {
    headers: defaultHeaders,
    timeout: "10s",
  });
  ttfbTrend.add(resRead.timings.waiting);

  const okRead = check(resRead, {
    "Read operation: 200 OK": (r) => r.status === 200,
  });
  if (!okRead) {
    console.error(`[FAIL] Read failed: status=${resRead.status} body=${resRead.body}`);
  }

  // Realistic human thinking / pacing delay (50ms - 100ms)
  sleep(0.05);

  // 2. PHASE 2: Write Endpoint (Submit / Action / Transaction)
  const payload = JSON.stringify({
    userId: `sim-user-${uniqueIndex}`,
    action: "benchmark_submit",
    timestamp: Date.now(),
  });

  const resWrite = http.post(`${TARGET_URL}/api/benchmark`, payload, {
    headers: defaultHeaders,
    timeout: "10s",
  });
  writeTrend.add(resWrite.timings.duration);

  const okWrite = check(resWrite, {
    "Write operation: 200 OK": (r) => r.status === 200,
  });
  if (!okWrite) {
    console.error(`[FAIL] Write failed: status=${resWrite.status} index=${uniqueIndex} body=${resWrite.body}`);
  }
}
