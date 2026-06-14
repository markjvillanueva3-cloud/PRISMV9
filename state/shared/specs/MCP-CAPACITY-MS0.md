# MCP-CAPACITY-MS0 — permanent fix for MCP-server drops at 30-chat scale (2026-05-25)

> User directive (2026-05-25, slot:unbound claude-9e91d800): "plan for the permanent fix for mcp servers always dropping, build for 30 chats at once on it"

> Scope: **planning + design spec only this milestone.** Implementation is the follow-on MS1 once this spec is signed off. Phase A units below are the minimum-viable foundation; Phase B is the optional rewrite if Phase A alone isn't enough at 30-chat scale.

---

## §0 — What this spec promises

A permanent fix for the recurring MCP-server drop pathology — `mcp__prism*` and `mcp__prism_safe__*` calls failing across the fleet — that has resisted three prior partial fixes (U-WATCHDOG-MEM-PROBE 2026-05-23, U-SUPERVISOR-HEAP-BUMP 2026-05-23, MCP-CONNECTIVITY hook 2026-05-24). Target: 30 concurrent chats × ~5 MCP actions per chat per minute, sustained 8+ hours without restart, p95 latency <500ms, zero drops in steady state.

This is NOT a Phase 1 build; it's the spec for a follow-on milestone. The slot-recovery + fleet-dashboard milestone (17 units, the in-flight build) is independently shippable without this work.

---

## §1 — What's already been tried (and what's still broken)

| Date | Unit | Fix | Status today |
|---|---|---|---|
| 2026-05-22 | MCP-CONNECTIVITY hook | UserPromptSubmit `:3100` probe + LOUD banner on disconnect | ✅ Shipped — surfaces drops but doesn't prevent them |
| 2026-05-23 | U-SUPERVISOR-HEAP-BUMP | Spawn child with `NODE_OPTIONS=--max-old-space-size=8192` | ✅ Shipped — raised OOM ceiling but didn't eliminate |
| 2026-05-23 | U-WATCHDOG-MEM-PROBE | Watchdog preemptive restart on RSS > 3GB | ✅ Shipped — catches OOM before kernel kills, but restart = ~3-5s of dropped requests |

**Evidence that drops still happen (today, 2026-05-25):**
- `PRISM MCP Server` scheduled task: `LastTaskResult=2147946720` (= `0x80070420`, non-zero — implies recent unclean exit / restart cycle)
- Operator report (this conversation): MCP drops are persistent enough to be a chronic pain point
- Mitigation only — no underlying capacity model

The pattern: **each prior fix raises the ceiling slightly; load eventually catches up; new fix needed.** A permanent fix requires capacity modeling, not another point patch.

---

## §2 — Failure modes at 30-chat scale

Decoded by reading existing watchdog/connectivity hooks + extrapolating to 30× concurrency:

| Failure mode | Root cause | Today's frequency | At 30 chats |
|---|---|---|---|
| **OOM heap exhaustion** | Single Node process accumulates state (in-flight dispatcher caches, engine instances, file-watch handles); each new chat adds ~50-100 MB working set | ~Daily at fleet load | Multiple per hour — exponentially worse |
| **HTTP connection limit** | Default Node HTTP server `maxConnections=Infinity` but socket FD exhaustion ~16K on Windows | Rare | Approached at 30 chats × 5 actions × keep-alive |
| **Event-loop starvation** | Sync I/O in dispatchers (a few `readFileSync` calls in chat-slots/handoff) blocks all clients | Visible as p95 latency spikes | Severe — 30 clients waiting on a 200ms sync read = 6s tail |
| **State-file contention** | `chat-slots.json`, `slot-task-queues.json`, `golf-cron-registry.json` all written by lock-file + tmp+rename. Lock acquisition wait scales linearly with concurrency | Sub-second today | 30× contention = 1-3s waits per write |
| **Cascading restart storms** | Watchdog restarts MCP under pressure; all 30 chats reconnect simultaneously; new server gets thundering-herd load → OOM again | Rare | Almost certain without admission control |
| **Subprocess fork bombs** | Some dispatcher actions spawn child Node processes (e.g. `psk.mjs checkin`); 30 chats × parallel actions = unbounded fork tree | Visible in Task Manager today | OS-level death spiral |
| **WAL-checkpoint stall** | Coordination SQLite WAL mode; 30 concurrent writers cause WAL growth + slow checkpoint | Negligible today | Significant under load |
| **No backpressure** | Clients keep sending; server has no admission control; queue grows unbounded → memory ↑ → OOM | This is the chronic OOM driver | The structural cause to fix |

The chronic OOM is **not a memory leak** — it's the absence of admission control. Every fix so far has raised the watermark, not changed the slope.

---

## §3 — Design approach — Single-process MCP, state externalized, with admission control (RECOMMENDED)

The simplest permanent fix that meets the 30-chat bar without rearchitecting the harness:

### §3.1 — Foundation (Phase A, 5-6 units)

1. **Admission control** — at `/POST` entry of every MCP action: check in-flight count, queue depth, current RSS. If any limit hit, return `503 Service-Bring-Back-Up` immediately with `Retry-After` header. Hooks already have retry logic; this gives them a deterministic signal instead of a hang.
2. **Per-chat rate limiting** — token bucket per `session_id` (extracted from request headers). Default: 30 actions / 30s / chat. Configurable per dispatcher action. Prevents one chat's `/loop` from starving the others.
3. **Action latency budget** — every dispatcher action gets a hard `setTimeout` (default 10s, override per-action). Past budget = 504 + log + circuit-breaker increment. Today actions can hang indefinitely on a stuck file lock.
4. **State externalization** — move `chat-slots.json`, `slot-task-queues.json`, `slot-task-claims.json` lookups into a single SQLite WAL connection pool (already used for coordination.db per HOOK-SYNERGY-MS0/U-COORD08). Dispatcher actions become pure SQL reads/writes. No in-process JSON parse/stringify on hot paths.
5. **Async-only enforcement** — banlist `readFileSync`, `writeFileSync`, `execSync` on the dispatcher hot path. Auto-detected by lint rule + CI gate.
6. **Watchdog hardening** — current watchdog restarts on RSS > 3GB. Add: graceful-shutdown phase that drains in-flight requests for 2s before SIGTERM. Reduces cascade restarts.

### §3.2 — Capacity safeguards (Phase B, 3-4 units)

7. **HTTP/2 server with multiplexing** — replace HTTP/1.1 keep-alive (1 stream per TCP connection) with HTTP/2 (multiple streams per connection). Reduces socket usage from 30+ connections to ~5.
8. **Subprocess pool** — actions that spawn child Node processes (`psk.mjs`, `chat-slots.mjs` CLI, etc.) get a bounded worker pool (size N, default 8). Excess work queues. No fork bombs.
9. **Connection draining on restart** — watchdog signals MCP, MCP stops accepting new requests + serves in-flight, exits clean, watchdog spawns new process, clients reconnect over ~500ms window with retries. Currently restart = abrupt SIGKILL with all-clients-drop.
10. **Memory profiling guardrail** — periodic v8 heap snapshot capture on RSS > 2GB (warning level, before 3GB restart threshold). Snapshots go to `state/shared/dashboards/mcp-heap-snapshots/` for post-incident analysis.

### §3.3 — Validation (Phase C, 3 units)

11. **Load-test harness** — `scripts/mcp-load-test.mjs` simulates 30 concurrent chats × N actions/minute over T minutes. Records: p50, p95, p99 latency, drop rate, restart count, peak RSS.
12. **Per-action telemetry** — every MCP dispatcher action emits to `state/shared/dashboards/mcp-action-latency.jsonl` (already an allowlisted golf-writable path). 60s aggregation + p95 alert.
13. **Steady-state SLO** — 30 chats × 5 actions/min × 8h = 72,000 actions. Pass criteria: drop rate < 0.1% (72 actions allowed to drop), p95 < 500ms, restart count ≤ 1 (planned only).

Total: 12-13 units, estimated 12-16h focused work. Phased so Phase A alone (foundation) ships measurable improvement; Phase B+C optional if Phase A meets the bar.

---

## §4 — Alternative approaches (rejected with reasoning)

| Approach | Why rejected |
|---|---|
| **Multi-process MCP — shard by chat or domain** | Requires routing/proxy layer + cross-shard coordination. 4-6× more code than §3. Phase A's admission control + state externalization probably gets us to 30 chats without this — keep in reserve as MS1 if we don't. |
| **Per-chat embedded MCP** | 30 chats × ~500 MB MCP server = 15 GB JUST for MCP. Each chat's claude.exe is already ~300-600 MB. Total ~30 GB on a 64 GB machine before any agent work. Memory-prohibitive at fleet scale. |
| **Stateless HTTP dispatchers + Redis** | New external dependency (Redis), new failure mode (Redis goes down → all PRISM dies), new ops burden. Existing SQLite WAL gives us what Redis would without adding a service. |
| **Bigger box (RAM/cores)** | Linear cost, no structural fix. Drops on memory pressure WILL happen at SOME chat count without admission control. Doesn't address the root pattern. |

---

## §5 — `LastTaskResult=2147946720` diagnosis (U-FH03 / pre-flight)

The current MCP server scheduled task shows this non-zero result. Hex: `0x80070420`. Decoded: `ERROR_SERVICE_NOT_ACTIVE`. Possible causes:
1. Task tried to start service that was already running (race with watchdog)
2. Task action exited with code = ERROR_SERVICE_NOT_ACTIVE
3. Scheduled task wrapper mis-detected the service state

**First diagnostic action (U-FH03 in SLOT-RECOVERY-MS0 milestone):** dump the scheduled-task XML, identify the wrapper script, run it manually with `-Verbose`, capture exit code path. May resolve in 30 minutes (config bug) or surface as a deeper symptom of §2 cascade restarts.

If U-FH03 surfaces a §2 cascade pattern, that VALIDATES the §3 approach. If U-FH03 is a config typo (likely), it's a 1-line fix.

---

## §6 — Integration with the in-flight SLOT-RECOVERY-MS0 milestone

These two milestones interact:

| SLOT-RECOVERY produces | MCP-CAPACITY consumes |
|---|---|
| `slot-sessions/<nato>.jsonl` (per-slot session history) | Source-of-truth for per-chat rate-limit identity (§3 #2 needs session_id stable across /compact — sidecar gives it) |
| `slot-task-queues.json` (v1.1 with `dedicated`/general_pool) | Read-heavy MCP path; benefits from state externalization (§3 #4) |
| `ghost.fleet_state` viz roost | Becomes the operator-facing display for per-chat MCP latency + rate-limit consumption |
| `TaskAddEngine` | Becomes the test-bench for §3 admission control (a chat /queue-add'ing 1000 tasks in a tight loop should hit rate limit, not OOM) |

Build order recommendation: ship SLOT-RECOVERY-MS0 + FLEET-DASHBOARD-MS0 first (foundation), then MCP-CAPACITY-MS0 Phase A (admission control benefits the fleet immediately), then Phase B if Phase A doesn't hit the 30-chat bar.

---

## §7 — Knobs (proposed)

| Knob | Purpose | Default |
|---|---|---|
| `PRISM_MCP_MAX_INFLIGHT` | Admission-control ceiling | 60 (30 chats × 2 burst) |
| `PRISM_MCP_RATE_LIMIT_PER_CHAT` | Token bucket size per session_id | 30/30s |
| `PRISM_MCP_ACTION_TIMEOUT_MS` | Per-action latency budget | 10000 |
| `PRISM_MCP_WATCHDOG_RSS_WARN_MB` | RSS warning threshold (heap snapshot) | 2048 |
| `PRISM_MCP_WATCHDOG_RSS_KILL_MB` | RSS restart threshold | 3072 |
| `PRISM_MCP_GRACEFUL_DRAIN_MS` | Drain-then-exit window on restart | 2000 |
| `PRISM_MCP_SUBPROCESS_POOL_SIZE` | Bounded worker pool | 8 |
| `PRISM_MCP_HTTP2_DISABLE` | Fallback to HTTP/1.1 | 0 (HTTP/2 on by default) |
| `PRISM_MCP_LOAD_TEST_DURATION_MIN` | Load-test runtime | 60 |
| `PRISM_MCP_LOAD_TEST_CHATS` | Simulated concurrent chats | 30 |

All defaults sized for 30-chat target. Operator can dial up.

---

## §8 — Open questions

1. **HTTP/2 vs HTTP/1.1** — Phase B introduces HTTP/2. Some Claude Code MCP clients may not support it cleanly. Need to verify before commit. If HTTP/2 problematic → keep HTTP/1.1 + raise socket limit explicitly.
2. **SQLite WAL contention at 30 writers** — WAL handles concurrent readers well, but concurrent writers serialize. Need to measure during load test. If serialization is the bottleneck → consider switching to in-memory SQLite + periodic snapshot or back to file-per-slot pattern.
3. **Should rate limits be per-dispatcher action or per-session_id only?** — A chat doing `/system-viz` regen (heavy) should weigh more than a chat doing `prism_session:slot_session_latest` (cheap). Cost-weighted token bucket may be needed.
4. **Subprocess pool size** — 8 is a guess. Real number is per-action: psk.mjs is expensive (~200ms each); chat-slots.mjs CLI is cheap (~30ms). May need per-action pool.
5. **MCP server graceful-restart semantics** — Claude Code clients reconnect automatically, but how robustly? Need to verify before relying on graceful-drain.

These are MS1 implementation decisions, not MS0 spec decisions. Captured here for the implementing chat to remember.

---

## §9 — Unit breakdown (deferred to MS1)

Per §3:
- Phase A: 6 units (admission control, rate limit, latency budget, state externalization, async enforcement, watchdog hardening)
- Phase B: 4 units (HTTP/2, subprocess pool, drain restart, heap profile)
- Phase C: 3 units (load test, telemetry, SLO validation)

Total: 12-13 units. Estimated 12-16h. Single-slot single-chat buildable in 2-3 sessions.

Detailed unit specs: written at MS1 kickoff (this MS0 spec is the master plan; per-unit specs follow).

---

## §10 — Sign-off

- [ ] Operator approves §3 approach (single-process + admission control + state externalization)
- [ ] Operator approves §4 rejections (multi-process, embedded, Redis, bigger box)
- [ ] Operator answers §8 open questions (or accepts MS1-implementation deferral)
- [ ] Operator authorizes Phase ordering (recommend: SLOT-RECOVERY/FLEET-DASHBOARD first, then this)
- [ ] MS1 unit-spec drafting begins after sign-off

— Spec drafted 2026-05-25 by claude-9e91d800 (slot:unbound, machine: DESKTOP-N7MI1VB). Sister spec to SLOT-RECOVERY-MS0; together they form the complete fleet-stability plan from operator directives this session.
