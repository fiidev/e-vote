import { check, sleep } from "k6";
import http from "k6/http";

export const options = {
  stages: [
    { duration: "15s", target: 500 }, // Ramp up ke 500 VUs
    { duration: "30s", target: 1500 }, // Ramp up ke 1500 VUs
    { duration: "30s", target: 3000 }, // Peak 3000 VUs bersamaan
    { duration: "15s", target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<200"], // 95% request di bawah 200ms
    http_req_failed: ["rate<0.01"], // Error rate di bawah 1%
  },
};

const BASE_URL = __ENV.API_URL || "http://127.0.0.1:8080";

export default function () {
  // 1. Ambil info pemilihan aktif (di-cache RAM di Go)
  const resElection = http.get(`${BASE_URL}/api/v1/elections/active`);
  check(resElection, {
    "election status is 200 or 404": (r) =>
      r.status === 200 || r.status === 404,
  });

  // 2. Health check ping
  const resHealth = http.get(`${BASE_URL}/healthz`);
  check(resHealth, {
    "healthz status is 200": (r) => r.status === 200,
  });

  sleep(0.1);
}
