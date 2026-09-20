import { check, sleep } from "k6";
import http from "k6/http";

export const options = {
  discardResponseBodies: true,
  scenarios: {
    wave_test: {
      executor: "ramping-vus",
      startVUs: 10,
      stages: [
        { duration: "10s", target: 100 }, // Pemanasan ke 100 VUs
        { duration: "15s", target: 300 }, // Naik ke 300 VUs
        { duration: "20s", target: 600 }, // Puncak di 600 VUs bersamaan
        { duration: "10s", target: 0 }, // Pendinginan
      ],
      gracefulRampDown: "5s",
    },
  },
  thresholds: {
    http_req_duration: ["p(90)<300", "p(95)<500"], // 90% di bawah 300ms
    http_req_failed: ["rate<0.02"], // Toleransi error < 2%
  },
};

const BASE_URL =
  __ENV.API_URL || "https://backend-go-production-af2b.up.railway.app";

const params = {
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
    Accept: "application/json",
    "Content-Type": "application/json",
    Connection: "keep-alive",
  },
  timeout: "5s",
};

export default function () {
  // 1. Uji Healthz endpoint
  const resHealth = http.get(`${BASE_URL}/healthz`, params);
  check(resHealth, {
    "healthz 200 OK": (r) => r.status === 200,
  });

  // 2. Uji Query In-Memory Election Cache
  const resElection = http.get(`${BASE_URL}/api/v1/elections/active`, params);
  check(resElection, {
    "election status is 200 or 404": (r) =>
      r.status === 200 || r.status === 404,
  });

  // 3. Uji Token Verification & Rate Limiting Pipeline
  const payload = JSON.stringify({ token: "MTC-PROD-TEST" });
  const resAuth = http.post(`${BASE_URL}/api/v1/auth/verify`, payload, params);
  check(resAuth, {
    "verify status is 400 or 429": (r) => r.status === 400 || r.status === 429,
  });

  sleep(0.05);
}
