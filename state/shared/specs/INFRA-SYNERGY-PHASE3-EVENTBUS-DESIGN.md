# Phase 3 Design — Durable Redis-Streams backend mode for EventBusEngine

> **Parent:** `INFRA-SYNERGY-RESEARCH-2026-06-25.md` · **Slot:** bravo · **Status:** design only (build deferred to a Redis-up session for real R15 validation — see §6).
> **Solves P1** (the file bus `AGENT_CHAT.jsonl` with 29,405 unread — no per-consumer offsets) + **P3** (closed-loop outcomes scattered across JSONL ledgers).

---

## 1. Dedup finding — EXTEND, do not fork (R7/R8)

A wired incumbent already owns the "event bus" concern. Verified:

- **`EventBusEngine.ts`** (`mcp-server/src/engines/`) — in-memory typed pub/sub, bounded ring-buffer history (1000), `subscribe(type, handler) -> unsubscribe`, wildcard `"*"`, per-handler try/catch fail-soft, `getStats().mode = "in-memory"`. Wired to **`infraDispatcher`** via 4 actions: `event_bus_publish`, `event_bus_events`, `event_bus_stats`, `summary.event_bus`.
- Siblings: `SessionEventLogEngine` (in-memory session recorder), the file bus (`AGENT_CHAT.jsonl`).

A speculative standalone `EventLogEngine` was built and **deleted** this session — shipping a parallel Redis bus next to the wired in-memory bus is the exact fork anti-pattern. The `mode` field on `getStats()` is the natural seam: Phase 3 makes the in-memory bus optionally **also** durably fan out to Redis Streams.

## 2. Design — additive, default-OFF, zero-regression

Two pieces:

**(a) `RedisStreamSink` (new, the durable transport adapter)** — fail-soft Redis-Streams client, no new dependency (`ioredis` already wired via `RedisCacheProvider`/`JobQueueEngine`), mock-injectable (mirrors `RedisCacheProvider` graceful degradation: never throws on I/O):
```
interface RedisStreamSink {
  attachClient(c: RedisStreamClient): void           // tests / connection reuse
  connect(url?): Promise<boolean>                     // real ioredis (mirror RedisCacheProvider.init)
  append(topic, event): Promise<{ok, id|null, error}> // XADD prism:events:<topic> * data <json>
  consume(topic, group, consumer, {count, fromId}): Promise<{ok, events[], error}>  // XREADGROUP >  (+ XGROUP MKSTREAM)
  ack(topic, group, ids): Promise<{ok, acked, error}>                                // XACK
  pending(topic, group): Promise<{ok, count, error}>                                 // XPENDING summary = per-group lag
}
```
Per-group offsets replace the global "unread"; `pending()` is the lag a caught-up slot reads as 0.

**(b) Additive change to `EventBusEngine`** (the ONLY edit to the wired engine):
- New optional `attachDurableSink(sink: RedisStreamSink)` — default none.
- In `publish()`, AFTER the existing synchronous in-memory fan-out and return-id computation, when a sink is attached AND `PRISM_EVENT_BUS=redis`, also durably append (guarded, fail-soft, never throws, never changes the return value).
- `getStats().mode` reflects `"in-memory"` vs `"in-memory+redis"`.
- **Default path (no sink / flag=file) is byte-identical** — the 9 dispatcher consumers see ZERO behavior change. This is the safety property that makes the edit low-risk.

## 3. Flag

`PRISM_EVENT_BUS = file | redis` (default `file`). Default `file` => durable append never fires => zero behavior change until an operator flips it after a parity check.

## 4. R15 test matrix (mock fetch/client — no live Redis needed)

- **RedisStreamSink** (mocked `RedisStreamClient`): happy append->consume->ack round-trip; ES/Redis-down -> `{ok:false}` no throw (×3 ops); XGROUP BUSYGROUP swallowed (group already exists); malformed stream entry skipped not crashed (adversarial); XPENDING summary -> lag count (adversarial); input-validation throws on empty topic/group.
- **EventBusEngine regression**: existing suite stays GREEN with no sink (proves zero regression to the 9 consumers); with a mock sink attached + flag=redis, `publish()` fans out to BOTH in-memory subscribers AND the sink; with flag=file, the sink is NOT called; a throwing/failing sink never breaks `publish()` (the bus's existing per-handler fail-soft extends to the durable path).

## 5. Closed-loop consumers (the payoff, P3)

Once live: model outcomes as events (`quote.created`, `cut.completed`, `ocr.extracted`, `fleet.commit`); GNN refpool growth, LoRA dataset feed, quote-vs-actual reconciliation, and system-viz roosts become **independent consumer groups of one durable log** instead of bespoke pollers. Kafka is the later transport swap behind the same `RedisStreamSink` interface when Streams backpressures.

## 6. Why the build is deferred (R13/R15 — proven foundation)

The additive design is low-risk, but R15 requires VALIDATION against live data with numbers — an XADD/XREADGROUP round-trip + a per-group-lag readout — which needs a running Redis. Redis is not up this session (Docker daemon down; no standalone redis-server). Building the durable path mock-only against a 9-consumer wired engine is lower-integrity than building+validating together once Redis is up. **Build trigger:** Redis reachable on `:6379` (or via the compose `redis` service once Docker is up).

## 7. Build order when unblocked (logical, R13)
1. `RedisStreamSink.ts` + mock tests (verifiable core, no engine touch).
2. Additive `EventBusEngine.attachDurableSink` + guarded publish delegation; run the EXISTING EventBusEngine suite -> must stay green (no-regression gate).
3. Live round-trip (opt-in `PRISM_EVENT_BUS_LIVE=1`): append->consume->ack->pending against real Redis, assert lag semantics.
4. Re-point the `AGENT_CHAT.jsonl` writers + closed-loop consumers behind the flag; parity check; flip default to `redis`.
