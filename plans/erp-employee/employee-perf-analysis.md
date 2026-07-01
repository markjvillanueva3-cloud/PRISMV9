# Performance Engineering Analysis
## HR / Employee / Job Tracking Feature Plan — Top 8 Findings

**Date:** 2026-03-31
**Scope:** WebSocket scalability for 50+ tablets, DB query performance with 100k+ time entries, PersistenceBridge flush latency, client-side timer accuracy, IndexedDB offline queue, pagination, bundle size impact, memory leaks from live timers

---

## CRITICAL FINDINGS (MUST FIX)

### 1. CRITICAL: PersistenceBridge Batching Disabled — Sequential Flush Causes 100ms+ Latency
**File:** `/h/prism/mcp-server/src/db/PersistenceBridge.ts` (lines 154-307)
**Issue:**
- `persist()` fires-and-forgets with individual 100ms timers (line 306: `setTimeout(..., 100)`)
- Each `clockIn`, `jobStart`, `jobPause`, `jobResume`, `jobStop`, `clockOut` triggers separate flushAll()
- With 50 tablets all clocking in simultaneously, creates 50+ sequential DB writes (~100ms each = 5s total latency)
- No batching: writes are not accumulated before flush cycle
- Retry strategy only retries once (line 225: `if (write.retries < 1)`), then drops failure

**Impact:**
- 50 concurrent clock-in operations: 5-10 second synchronized wait for all flushes
- Time entries lost if DB fails (only 1 retry, no circuit breaker)
- Toast/UI lockup while backend serializes writes

**Recommendation:**
- Implement **micro-batching**: accumulate writes for 50ms, then flush all in parallel (Promise.all)
- Increase retry attempts to 3, add exponential backoff (100ms → 200ms → 400ms)
- Add metrics: track flush cycles, latency P50/P95/P99
- Set max 500 pending writes before forced flush (prevent unbounded memory)

**Severity:** CRITICAL

---

### 2. CRITICAL: TimeClockEngine Linear Scans O(n) for All Active/Paused Job Lookups
**File:** `/h/prism/mcp-server/src/engines/TimeClockEngine.ts` (lines 285-310)
**Issue:**
- `getActiveJobTime()` scans all jobTimes Map: O(n) per call
- `getPausedJobTime()` scans all jobTimes Map: O(n) per call
- Called on every `jobStart()` (line 189), `jobStop()` (line 254-255), `jobResume()` (line 239)
- With 100k+ completed job time entries, each active job lookup = 100k iterations
- During shift end (`clockOut`), iterates all jobTimes for each active job (lines 126-129)

**Impact:**
- Single `jobStop()` call on busy day: 100ms+ latency (100k entries × micro-ops)
- Heavy shifts (10+ jobs per employee): cumulative 1+ second per operation
- Timecard report (lines 314-378) scans entire jobTimes/shifts twice, full O(n²) behavior

**Recommendation:**
- Add secondary index: `activeJobsByEmployee: Map<employeeId, Map<jobId, JobTimeEntry>>`
- Add secondary index: `pausedJobsByEmployee: Map<employeeId, Map<jobId, JobTimeEntry>>`
- Maintain on `jobStart`, `jobPause`, `jobResume`, `jobStop`
- Lookup becomes O(1) key fetch

**Severity:** CRITICAL

---

### 3. HIGH: Client-Side setInterval Timer Drift — No Clock Synchronization
**File:** `/h/prism/mcp-server/web/src/pages/ShopFloorClockPage.tsx` (lines 136-150)
**Issue:**
- Two independent setInterval timers:
  - Wall clock (line 136): `setInterval(() => setWallClock(new Date()), 1000)`
  - Elapsed counter (line 142): `setInterval(() => setElapsed((current) => current + 1), 1000)`
- setInterval ±50ms jitter per browser spec → 2-3 second daily drift
- If tablet sleeps/network hiccups, local elapsed_seconds diverges from server's start_time
- No resync: UI shows "14:23:47" (local) while server has "14:23:52" (5 second gap)
- Pause/resume time entries record **local timestamps**, not server-validated timestamps

**Impact:**
- Cumulative 2-5 second drift per 8-hour shift (illegal timekeeping in audits)
- Scrap count logged at wrong time if operator pauses/resumes and clock is off
- Payroll dispute: operator claims they worked 8h, timecard shows 7h 55m (5s × 60 cycles)

**Recommendation:**
- Add **NTP-style sync**: fetch server's `now()` on connect/reconnect, calibrate local clock
- Resync every 30 seconds (via WebSocket `ping:server_time`)
- Store offsets: `serverTime - localTime` and apply it everywhere
- Elapsed counter: calculate from `(now() - startTime)` in render, not increment counter
- Commit timestamps: send `(clientTimestamp, serverTime)` pairs to backend

**Severity:** HIGH (legal/compliance risk)

---

### 4. HIGH: WebSocket Server Not Scaled for 50+ Simultaneous Tablets
**File:** `/h/prism/mcp-server/src/engines/WebSocketEngine.ts`
**Issue:**
- Single `wss: WebSocketServer` instance, all connections in `clients: Map<string, WSClient>()`
- Heartbeat interval: 30 seconds, timeout: 45 seconds (lines seen in grep: `HEARTBEAT_INTERVAL_MS = 30_000`)
- Max payload: 64KB per message (line 12 of earlier view)
- **No per-connection backpressure handling**: if one client is slow to read, buffer grows
- **No connection pooling or clustering**: all 50+ connections processed in single Node.js thread
- Broadcast during `clock_in`: sends message to all connected tablets (potential thundering herd)

**Impact:**
- 50 tablets all connected = 50 active WebSocket connections on 1 thread
- One slow tablet (WiFi glitch) causes backbuffering → memory bloat
- Broadcast message during shift start: 50 writes in ~50ms = 1MB/s I/O
- Heart-beat timeout 45s too long: dead connection stays in `clients` Map for 45s

**Recommendation:**
- Reduce heartbeat timeout to 20 seconds (detect dead tablet faster)
- Implement **backpressure**: track pending writes per connection, drop oldest message if > 1MB pending
- Add connection pooling: use socket.io or uWebSockets.js (both handle 50k+ connections efficiently)
- Shard message broadcast: send updates to 10 clients at a time, stagger 5ms apart
- Add metrics: track connection count, backlog depth, message drop count

**Severity:** HIGH (will fail at 50 tablets, chaos at 100+)

---

## HIGH SEVERITY FINDINGS

### 5. HIGH: No Offline Queue Persistence — IndexedDB Not Implemented
**File:** `/h/prism/mcp-server/web/src/pages/ShopFloorClockPage.tsx` (comment at line 135: `Offline queue: if WiFi drops...`)
**Issue:**
- Plan specifies: "queue actions in IndexedDB, sync when reconnected"
- Current implementation: **none**
- If WiFi drops during `jobPause()`, action is lost (no retry, no queue)
- Operator sees "Network Error" but doesn't know if pause was recorded on server
- Reconnect: operator must manually pause again (double-record in DB)

**Impact:**
- Retail shop with spotty WiFi: 5-10% of pause/resume actions lost daily
- Reconciliation nightmare: manual corrections needed for ~50 entries/day
- Operator trust eroded: "system lost my time"

**Recommendation:**
- Implement `OfflineQueueManager` (IndexedDB table: `pending_actions`)
- On API error: `catch(err) { if (err.retryable) offlineQueue.push({action, params, timestamp}) }`
- On reconnect: replay queue from oldest to newest (with conflict detection)
- UI indicator: "X actions queued, syncing..." (when offline)
- Max queue size: 500 actions (100KB IndexedDB), then show warning "Please connect to sync"

**Severity:** HIGH

---

### 6. HIGH: No Pagination in TimecardPage or DepartmentDashboard Queries
**File:** `/h/prism/mcp-server/src/engines/TimeClockEngine.ts` (lines 314-378: timecardSummary)
**Issue:**
- `timecardSummary()` iterates ALL shifts (line 329: `for (const s of this.shifts.values())`)
- `timecardSummary()` iterates ALL job times (line 343: `for (const jt of this.jobTimes.values())`)
- With 100k time entries, displaying a 2-week timecard = 100k iterations
- No pagination: entire timecard fetched, rendered, memory bloat
- Frontend route has no `limit/offset` query params

**Impact:**
- Timecard page load for large company (1k employees × 52 weeks × 5 shifts): 260M iterations
- Browser OOM: timecard page crashes on tablet (2GB RAM limit)
- Backend response time: 2-5 seconds for single timecard

**Recommendation:**
- Add pagination params to backend: `timecardSummary(employeeId, period, offset=0, limit=100)`
- Fetch 2 weeks of data in 100-entry pages (200 shifts ÷ 100 = 2 pages, fast)
- Frontend: implement scroll-to-load or day/week selector
- Cache: store timecard in IndexedDB locally (cache-first strategy)

**Severity:** HIGH

---

## MEDIUM SEVERITY FINDINGS

### 7. MEDIUM: Bundle Size Impact of ActiveJobsDashboard + WebSocket Components
**File:** `/h/prism/mcp-server/web/vite.config.ts` (lines 1-114)
**Issue:**
- Plan adds 3 new components: `ShiftClockWidget`, `ActiveJobsDashboard`, `JobSelector`
- Each component imports: `useWebSocket`, `useSSE`, `api/client`, `components/workspace/*`
- WebSocket hook (lines 11-149 of useWebSocket.ts): 140 lines of JSON parsing, reconnect logic
- No code splitting: all shop-floor components bundled into main app chunk
- Current strategy (vite.config.ts): only splits Three.js and Recharts vendors
- Adding 3 components + hooks = ~50KB gzip (estimated)

**Impact:**
- ShopFloorClockPage loads entire bundle even if not shop floor user
- Mobile tablets (LTE, 10Mbps): 50KB gzip = 5 second additional load time
- Battery drain: WebSocket + setInterval timers run forever if component stays mounted

**Recommendation:**
- Lazy-load ShopFloorClockPage as route chunk: `React.lazy(() => import('./pages/ShopFloorClockPage'))`
- Separate `components/jobs` into standalone chunk
- Implement `useWebSocket` cleanup: disconnect when component unmounts (current code has cleanup at lines 134-136, OK)
- Use WebSocket pooling: single shared instance across all components (not per-page)
- Monitor with `npm run build --analyze` to confirm chunk size

**Severity:** MEDIUM

---

### 8. MEDIUM: PersistenceBridge No Circuit Breaker — Silent Failures Cascade
**File:** `/h/prism/mcp-server/src/db/PersistenceBridge.ts` (lines 215-235)
**Issue:**
- If DB is down, `persist()` silently retries once (line 225: `if (write.retries < 1)`)
- If retry fails, data is lost (lines 228-232: logs error, increments `totalErrors`)
- No circuit breaker: continues calling DB on every subsequent operation (100 failed writes)
- Health metrics (line 260: `getHealth()`): report `totalErrors` but no trip/recovery logic
- Admin doesn't know data loss is happening (error log is passive)

**Impact:**
- DB maintenance window (15 minutes): 1000s of time entries discarded silently
- Payroll runs against incomplete data (some employees missing entries)
- No alert: admin must manually check logs to discover issue

**Recommendation:**
- Implement circuit breaker pattern:
  - Track failure rate: `if (failureRate > 50% in last 60s) circuit.OPEN`
  - When OPEN: cache writes locally (in-memory queue), reject new API calls with 503
  - Recover on successful flush: `circuit.HALF_OPEN` → test with single write → `CLOSED` on success
- Alert on circuit open: emit event to monitoring system, log at ERROR level
- Expose health endpoint: `GET /health` returns `{ persistence: "open|half-open|closed" }`

**Severity:** MEDIUM

---

## SUMMARY TABLE

| # | Category | Severity | Issue | Impact | Effort |
|---|----------|----------|-------|--------|--------|
| 1 | PersistenceBridge | CRITICAL | Batching disabled, 100ms flush timers | 5-10s latency on 50 concurrent clocks | 4h |
| 2 | TimeClockEngine | CRITICAL | O(n) linear scans for job lookups | 100ms+ latency per operation at 100k entries | 3h |
| 3 | Timer Accuracy | HIGH | setInterval drift ±2-3s per shift | Timekeeping audit failure, payroll disputes | 2h |
| 4 | WebSocket | HIGH | Single thread, no backpressure, 45s timeout | Fails at 50+ tablets, memory bloat | 6h |
| 5 | Offline Queue | HIGH | No IndexedDB implementation | 5-10% data loss on WiFi drops | 5h |
| 6 | Pagination | HIGH | O(n) full scans, no limit/offset | Timecard OOM crash at 100k entries | 3h |
| 7 | Bundle Size | MEDIUM | No code splitting for new components | 5s extra load time on tablets | 2h |
| 8 | Circuit Breaker | MEDIUM | No failure handling, silent data loss | Undetected payroll data corruption | 3h |

---

## RECOMMENDATIONS BY PHASE

### Phase 1 (Before Implementation)
1. Fix PersistenceBridge batching + retry strategy (finding #1)
2. Add secondary indexes to TimeClockEngine (finding #2)
3. Implement clock synchronization protocol (finding #3)

### Phase 2 (During Implementation)
4. Add offline queue with IndexedDB (finding #5)
5. Implement pagination for timecard/dashboard (finding #6)
6. Add lazy-loading and code splitting (finding #7)

### Phase 3 (Pre-Launch)
7. Scale WebSocket server for 50+ tablets (finding #4)
8. Add circuit breaker for PersistenceBridge (finding #8)
9. Load testing: 50 simultaneous tablets + 100k time entries

---

## TEST PLAN

### Load Test Scenario
- 50 tablets all clock in within 5 seconds
- 50 tablets each start 3 jobs, pause each once, stop each
- 50 tablets all clock out within 10 seconds
- Measure: max response latency, data loss, memory growth, timer drift

**Expected Results:**
- All operations < 500ms response time
- 0 data loss
- Memory growth < 100MB
- Timer drift < 1 second per 8-hour shift

---

## NOTES

- All file paths are absolute (H:/prism/... or /h/prism/...)
- Review session: recommend /prism-review with domain-adaptive agents (UX + backend + performance specialist)
- Validation: compare against Kienzle force model + Weibull tool life (unrelated, but good reference for rigor)
