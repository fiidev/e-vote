---
name: universal-web-optimizer
description: >-
  Optimizes web application performance, scalability, and reliability across any technology stack (frontend, backend, database, infrastructure). Use when diagnosing slow response times, preparing for high concurrency/traffic rushes (1,000+ simultaneous users), tuning database queries/indexes/connection pools, implementing atomic write operations, eliminating N+1 queries, modernizing Core Web Vitals (LCP/INP/CLS), sanitizing reverse proxy container bindings (0.0.0.0 leaks), conducting realistic k6 load testing, or performing Twelve-Factor App production readiness audits.
---

# Universal Web Optimizer: Performance, Scalability & Reliability Runbook

> **Core Philosophy**: *Measure before optimizing.* Performance optimization without empirical measurement is pure guesswork — and guessing introduces unnecessary complexity without fixing what actually matters. Profile first, identify the real constraint, implement targeted architectural fixes, verify with load testing, and enforce production hygiene.

---

## Quick Reference: The 6 Universal Performance Pillars

Pillar | Scope | Primary Targets | Reference Document
:--- | :--- | :--- | :---
**1. Database Persistence** | Database / Storage | Connection pool math, Single-Statement Atomic CTE, Index selectivity, N+1 query elimination | [01-database-concurrency-tuning.md](./references/01-database-concurrency-tuning.md)
**2. Backend & Concurrency** | API / Application Server | In-memory RAM L1 cache, Redis L2, Server-Sent Events (SSE) vs Polling, sliding-window rate limiting | [02-backend-caching-streaming.md](./references/02-backend-caching-streaming.md)
**3. Frontend Web Vitals** | Client Browser / UX | LCP (hero image modern formats), CLS (layout shifts), INP (main-thread task splitting), font self-hosting | [03-frontend-core-web-vitals.md](./references/03-frontend-core-web-vitals.md)
**4. Reverse Proxy & Infra** | Docker / Network / CDN | Internal `0.0.0.0` socket bind resolution, `X-Forwarded-*` sanitization, edge keep-alive, TLS latency | [04-reverse-proxy-container-rules.md](./references/04-reverse-proxy-container-rules.md)
**5. Load Testing (k6)** | Empirical Verification | Realistic `shared-iterations`, global iteration indexing (`iterationInTest`), SLA threshold budgets | [universal-k6-template.js](./scripts/universal-k6-template.js)
**6. Production Hardening** | Security & 12-Factor | Zero-hardcode audit (credentials, domains), runtime schema validation, test artifact isolation | [06-twelve-factor-production-audit.md](./references/06-twelve-factor-production-audit.md)

---

## When to Activate This Skill

- Preparing an application for a known traffic rush, launch, ticket sale, election, or flash sale (1,000+ concurrent users).
- Database connection pool exhaustion errors (`connection limit exceeded`, `timeout acquiring connection from pool`, `P1008`).
- High latencies on write-heavy endpoints under load (> 1 second per transaction).
- Broken reverse proxy redirects pointing to container internal IPs (`0.0.0.0:PORT` or `127.0.0.1`).
- Core Web Vitals failing in production (LCP > 2.5s, INP > 200ms, CLS > 0.1).
- Auditing a repository before production deployment to eliminate hardcoded credentials and staging domains.

**When NOT to use:**
- Micro-optimizing isolated algorithms that execute in < 1 ms and do not touch I/O or network.
- Premature caching of rarely read or highly volatile non-critical data.

---

## The 5-Step Optimization Workflow

```
1. MEASURE   --> Establish real empirical baselines under realistic concurrency.
2. IDENTIFY  --> Pinpoint the exact bottleneck category via the Diagnostic Tree.
3. ARCHITECT --> Apply targeted pattern (Atomic CTE, Pool Tuning, SSE, Cache, Proxy Sanitizer).
4. VERIFY    --> Run k6 stress testing to verify 100% HTTP 200 OK and meet SLA latency targets.
5. GUARD     --> Enforce Twelve-Factor config separation; remove test artifacts from repository.
```

---

## Diagnostic Decision Tree: What Is Actually Slow?

```
Observed Slowness
├── Initial Page Load Slow (High TTFB / Slow LCP)
│   ├── High TTFB (Server Waiting > 500ms)?
│   │   ├── TLS Handshake Long? --> Check Edge Keep-Alive, HTTP/2 multiplexing, DNS preconnect.
│   │   ├── Server Render / Query Long? --> Check N+1 queries, unindexed queries, database proxy hops.
│   │   └── Reverse Proxy Redirecting? --> Check 0.0.0.0 bind leaks or unneeded redirect chains.
│   └── Large Asset Downloads (> 1MB)?
│       ├── Heavy Images? --> Modernize to WebP/AVIF with explicit dimensions and fetchpriority="high".
│       └── Heavy JS Bundles? --> Dynamic code splitting, analyze bundle tree, defer non-critical scripts.
├── Interactivity Lag (High INP / UI Freezes)
│   ├── Long tasks on main thread (> 50ms)? --> Decouple computations via Web Workers or scheduler.yield().
│   └── Frequent re-renders? --> Audit controlled component state trees and memoization boundaries.
├── Read Endpoint Slow Under Load
│   ├── Database CPU high? --> Missing composite index on filtered/sorted columns; check EXPLAIN ANALYZE.
│   ├── Static/active data re-queried repeatedly? --> Implement L1 In-Memory RAM cache with TTL.
│   └── Polling flood? --> Replace client polling loops with Server-Sent Events (SSE).
└── Write Endpoint Stalling / Timing Out Under High Concurrency
    ├── Error: "Too many connections" / "Pool exhausted"? --> Slower is not solved by bigger pool.
    │   └── Transaction holding connection too long --> Consolidate into Single-Statement Atomic CTE.
    ├── Deadlocks / Serialization Failures? --> Sort row locks deterministically or use conditional UPDATE claim.
    └── False-positive test failures (400 Bad Request)? --> Ensure test suite assigns unique keys per VU iteration.
```

---

## Core Optimization Rules

### 1. Database: Single-Statement Atomic CTE
Never use multi-step interactive transactions (`BEGIN` -> `SELECT` -> `UPDATE` -> `INSERT` -> `COMMIT`) across cloud database proxies for simple claim-and-record operations. Every round-trip adds 15–30ms of network latency while holding an exclusive connection from the pool.
*Compress the entire transaction into a single atomic CTE statement (see [01-database-concurrency-tuning.md](./references/01-database-concurrency-tuning.md)).*

### 2. Connection Pool Sizing
$$\text{Ideal Max Connections} \approx (\text{CPU Cores} \times 2) + \text{Disk Spindle Count}$$
When connecting through cloud connection poolers (Prisma Accelerate, Supabase Pooler, PgBouncer), size `MaxConns` between 15–25. Sizing too high causes queue congestion on the proxy rather than increasing throughput.

### 3. Reverse Proxy & Container Binding (0.0.0.0 Fix)
Containers listening on `0.0.0.0:PORT` must **never** let `request.url` dictate public redirects.
Always sanitize incoming requests and outgoing redirect headers by prioritizing `X-Forwarded-Host` and `X-Forwarded-Proto`, and falling back to canonical `process.env.APP_URL`.

### 4. Realistic k6 Load Testing
Never use `__ITER` to index unique test payloads in shared-concurrency tests. Always use `exec.scenario.iterationInTest` so every iteration across all concurrent VUs receives a strictly unique test item without collision.

### 5. Twelve-Factor Zero-Hardcode Standard
Never commit hardcoded admin emails, API secrets, or domain names (`https://example.com`) directly into source files. All configuration must be driven through environment variables.
