import http from "k6/http";
import { check, sleep } from "k6";
import { Trend } from "k6/metrics";
import exec from "k6/execution";

// Metric tracking khusus untuk mengukur kecepatan per tahapan
const electionTrend = new Trend("duration_get_election", true);
const verifyTrend = new Trend("duration_verify_token", true);
const voteTrend = new Trend("duration_cast_vote", true);

// Muat data 1.500 token unik & kandidat dari file JSON
const testData = JSON.parse(open("./tokens_1500.json"));

export const options = {
  discardResponseBodies: false,
  scenarios: {
    real_voting_rush: {
      executor: "shared-iterations",
      vus: 75,           // 75 bilik suara / pemilih aktif bersamaan
      iterations: 1500,  // Tepat 1.500 pemilih unik
      maxDuration: "4m", // Maksimal 4 menit
    },
  },
  thresholds: {
    "checks": ["rate>0.99"],
    "duration_verify_token": ["p(90)<1200", "p(95)<2000"],
    "duration_cast_vote": ["p(90)<1200", "p(95)<2000"],
  },
};

// Target default langsung ke Go backend di Railway
const BASE_URL = __ENV.API_URL || "https://backend-go-production-af2b.up.railway.app";

const commonHeaders = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
  "Accept": "application/json",
  "Content-Type": "application/json",
  "Connection": "keep-alive",
};

export default function () {
  // Setiap iterasi (0 sampai 1499) mendapatkan 1 token unik pasti dari indeks global pengujian
  const iterIndex = exec.scenario.iterationInTest;
  const token = testData.tokens[iterIndex] || testData.tokens[0];
  const candidate = testData.candidates[iterIndex % testData.candidates.length];

  // 1. TAHAP 1: Kunjungi halaman & ambil info pemilihan aktif (di-cache RAM di Go)
  const resElection = http.get(`${BASE_URL}/api/v1/elections/active`, {
    headers: commonHeaders,
    timeout: "10s",
  });
  electionTrend.add(resElection.timings.duration);

  check(resElection, {
    "1. Ambil Pemilihan: 200 OK": (r) => r.status === 200,
  });

  // Jeda realistis pemilih mengetik token
  sleep(0.05);

  // 2. TAHAP 2: Masukkan & Verifikasi Token Unik Pemilih
  const verifyPayload = JSON.stringify({ token: token });
  const resVerify = http.post(`${BASE_URL}/api/v1/auth/verify`, verifyPayload, {
    headers: commonHeaders,
    timeout: "10s",
  });
  verifyTrend.add(resVerify.timings.duration);

  let sessionToken = "";
  if (resVerify.status === 200) {
    try {
      const json = JSON.parse(resVerify.body);
      if (json.session) sessionToken = json.session;
    } catch (_e) {}
  }

  const okVerify = check(resVerify, {
    "2. Verifikasi Token: 200 OK": (r) => r.status === 200,
  });
  if (!okVerify) {
    console.error(`[FAIL] Verify status=${resVerify.status} token=${token} body=${resVerify.body}`);
  }

  // Jeda realistis pemilih memilih paslon
  sleep(0.05);

  // 3. TAHAP 3: Kirim Surat Suara (Cast Vote)
  const voteHeaders = Object.assign({}, commonHeaders, {
    "X-Vote-Token": token,
  });
  if (sessionToken) {
    voteHeaders["Authorization"] = `Bearer ${sessionToken}`;
  }

  const votePayload = JSON.stringify({
    candidateId: candidate.candidate_id,
    token: token,
  });

  const resVote = http.post(`${BASE_URL}/api/v1/votes`, votePayload, {
    headers: voteHeaders,
    timeout: "10s",
  });
  voteTrend.add(resVote.timings.duration);

  const okVote = check(resVote, {
    "3. Kirim Suara Masuk: 200 OK": (r) => r.status === 200,
  });
  if (!okVote) {
    console.error(`[FAIL] Vote status=${resVote.status} token=${token} body=${resVote.body}`);
  }
}
