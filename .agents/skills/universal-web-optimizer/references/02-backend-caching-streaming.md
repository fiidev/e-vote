# Backend Concurrency, Multi-Tier Caching & Real-Time Streaming

This reference guide provides patterns for shielding backend databases from excessive read load and replacing heavy client polling with real-time streaming architectures.

---

## 1. Multi-Tier Caching Architecture

```
Client Request
      │
      ▼
┌──────────────┐     Hit (< 1ms)
│  L1: RAM     │ ──────────────────► Return Response
│ (In-Memory)  │
└──────────────┘
      │ Miss
      ▼
┌──────────────┐     Hit (2-5ms)
│  L2: Redis   │ ──────────────────► Populate L1 & Return
│ (Distributed)│
└──────────────┘
      │ Miss
      ▼
┌──────────────┐
│  Database    │ ──────────────────► Populate L2 + L1 & Return
└──────────────┘
```

### L1 In-Memory RAM Caching (Per-Process)
Use L1 in-memory caching for data that is **read on every request but changes infrequently** (e.g. active election metadata, configuration toggles, site settings).

```go
// Example Go concurrency-safe in-memory cache with TTL
type InMemoryCache[T any] struct {
    sync.RWMutex
    data      T
    expiresAt time.Time
    ttl       time.Duration
}

func (c *InMemoryCache[T]) GetOrFetch(fetcher func() (T, error)) (T, error) {
    c.RLock()
    if time.Now().Before(c.expiresAt) {
        defer c.RUnlock()
        return c.data, nil
    }
    c.RUnlock()

    c.Lock()
    defer c.Unlock()
    // Double-check locking after acquiring write lock
    if time.Now().Before(c.expiresAt) {
        return c.data, nil
    }

    freshData, err := fetcher()
    if err != nil {
        return c.data, err // Fallback to stale data on fetch error
    }
    c.data = freshData
    c.expiresAt = time.Now().Add(c.ttl)
    return c.data, nil
}
```

---

## 2. Replacing Client Polling with Server-Sent Events (SSE)

### Why HTTP Polling Destroys Concurrency
If 1,500 active users poll an endpoint every 2 seconds:
$$\text{Polling Load} = \frac{1500 \text{ users}}{2 \text{ seconds}} = 750 \text{ req/sec}$$
750 req/sec needlessly floods the database, network sockets, and reverse proxy logs with identical responses.

### The SSE Solution
A single long-lived HTTP connection using `text/event-stream`. Data is pushed **only when a state change occurs**:

```javascript
// Browser Client
const eventSource = new EventSource('/api/v1/live-stream?channel=main');
eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    updateDashboard(data);
};
```

```go
// Go / Fiber SSE Handler with PubSub Broadcast
func (h *StreamHandler) HandleSSE(c *fiber.Ctx) error {
    c.Set("Content-Type", "text/event-stream")
    c.Set("Cache-Control", "no-cache")
    c.Set("Connection", "keep-alive")
    c.Set("Transfer-Encoding", "chunked")

    clientChan := make(chan []byte, 16)
    h.broker.Register(clientChan)
    defer h.broker.Unregister(clientChan)

    c.Context().SetBodyStreamWriter(func(w *bufio.Writer) {
        for msg := range clientChan {
            fmt.Fprintf(w, "data: %s\n\n", msg)
            w.Flush()
        }
    })
    return nil
}
```

---

## 3. Sliding-Window Rate Limiting

To protect write endpoints from bot abuse while allowing legitimate burst traffic, implement in-memory sliding-window counters:

- Track timestamps of requests in a circular buffer or sorted set.
- Drop requests exceeding threshold within the moving time window (e.g. max 5 failed attempts per 60 seconds).
- Reject with `HTTP 429 Too Many Requests` before touching database transactions.
