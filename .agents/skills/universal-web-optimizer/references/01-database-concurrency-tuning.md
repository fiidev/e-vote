# Database Concurrency, Query Tuning & Atomic Operations

This reference guide provides proven architectural patterns for scaling relational databases (PostgreSQL, MySQL, SQLite) under high write concurrency (1,000+ simultaneous operations).

---

## 1. The Single-Statement Atomic CTE Pattern

### The Problem: Multi-Roundtrip Interactive Transactions
Under high concurrent traffic, traditional transactional code creates severe connection pool bottlenecks:

```
App Server (e.g. Railway)                Cloud Database (e.g. Prisma / Neon)
    |                                                 |
    | ----- 1. BEGIN -------------------------------> |  (takes ~20ms)
    | ----- 2. SELECT item FOR UPDATE --------------> |  (takes ~20ms)
    | ----- 3. UPDATE item SET claimed = true ------> |  (takes ~20ms)
    | ----- 4. INSERT INTO records (...) -----------> |  (takes ~20ms)
    | ----- 5. COMMIT ------------------------------> |  (takes ~20ms)
    |                                                 |
    Total Time Holding DB Connection: ~100-150ms!
```

If your database pool has 20 connections, holding each connection for 150ms limits your maximum theoretical throughput to **only ~130 transactions/second**, causing massive queue timeouts.

---

### The Solution: Consolidate into a Single Atomic CTE

PostgreSQL, SQLite 3.35+, and modern relational engines support data modification inside Common Table Expressions (CTEs). The entire claim, validation, and insertion execute in **1 single network roundtrip (~15–20ms total)**:

```sql
WITH valid_target AS (
    -- 1. Validate parent record / target entity
    SELECT id FROM targets 
    WHERE id = $1 AND is_active = true 
    LIMIT 1
),
claimed_token AS (
    -- 2. Concurrency-safe atomic claim (only 1 concurrent worker can match where claimed = false)
    UPDATE tokens
    SET claimed = true, claimed_at = $2
    WHERE token_code = $3 
      AND claimed = false 
      AND EXISTS (SELECT 1 FROM valid_target)
    RETURNING token_id, owner_id
),
inserted_record AS (
    -- 3. Record transaction only if claim was successful
    INSERT INTO transaction_records (id, target_id, owner_id, recorded_at)
    SELECT $4, $1, ct.owner_id, $2
    FROM claimed_token ct
    RETURNING id
)
SELECT 
    (SELECT count(*)::int FROM valid_target)  AS target_count,
    (SELECT count(*)::int FROM claimed_token)  AS claim_count,
    (SELECT count(*)::int FROM inserted_record) AS insert_count;
```

### Result Interpretation in Code
- `target_count == 0`: Target entity was not found or inactive (HTTP 404/400).
- `claim_count == 0`: Token was already used/claimed (HTTP 400 `ALREADY_USED`).
- `insert_count == 1`: Success! (HTTP 200 OK).
- Unique constraint violations (e.g. double vote / double purchase by same user) abort the entire statement atomically, rolling back the claim with zero data corruption.

---

## 2. Connection Pool Math

> **Core Rule**: *Bigger pool is not faster.* A pool larger than what database CPU/I/O can execute concurrently merely shifts the queue from your app into database process memory.

### Calculation Formula
$$\text{Max Pool Connections} \approx (\text{DB CPU Cores} \times 2) + \text{Effective Spindles / IOPS Allowance}$$

### Guidelines for Cloud & Serverless Databases
Environment | Recommended `MaxConns` | Timeout Guidance
:--- | :--- | :---
**Direct Postgres on dedicated VM (4 vCPU)** | 25 – 40 | `idle_timeout: 5m`, `conn_timeout: 5s`
**Prisma Postgres / Neon Serverless Proxy** | 15 – 25 | Sizing > 30 causes proxy queue saturation
**Supabase PgBouncer (Transaction mode)** | 20 – 30 | Use pooled port (6543) instead of direct (5432)
**Local Docker Development** | 10 | Fast fail instead of hanging

---

## 3. Indexing Strategy: The Shape of the Query

Do not index individual columns in isolation. Always index for the **exact shape of high-frequency queries**:

```sql
-- Query:
SELECT * FROM orders WHERE user_id = $1 AND status = 'COMPLETED' ORDER BY created_at DESC LIMIT 10;

-- Optimal Composite Index:
-- 1. Equality filters first (user_id, status)
-- 2. Sort / Range columns last (created_at DESC)
CREATE INDEX idx_orders_user_status_created 
ON orders (user_id, status, created_at DESC);
```

### Partial Indexes for Asymmetric Data
If 95% of rows are `processed = true` and workers query for `processed = false`:
```sql
-- Do NOT index the entire column! Index only the unprocessed slice:
CREATE INDEX idx_unprocessed_queue 
ON job_queue (created_at ASC) 
WHERE processed = false;
```
This reduces index size by 95% and guarantees writes on processed rows incur zero index update penalty.
