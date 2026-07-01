# INFRA-SYNERGY/U-ES-PHASE3-BUILD — [MAIN-FORCE] [INFRA-SYNERGY]/U-ES-PHASE3-BUILD: durable Redis-Streams backend for EventBusEngine (additive, default-off)

**Commit:** `04101a79114f` · **By:** markjvillanueva3-cloud · **At:** 2026-06-25T20:08:58-05:00
**Tags:** infra-synergy, u-es-phase3-build, auto-distilled

## Subject
[MAIN-FORCE] [INFRA-SYNERGY]/U-ES-PHASE3-BUILD: durable Redis-Streams backend for EventBusEngine (additive, default-off)

## Body
```
[MAIN-FORCE] [INFRA-SYNERGY]/U-ES-PHASE3-BUILD: durable Redis-Streams backend for EventBusEngine (additive, default-off)

Phase 3 of the infra-synergy research (slot:bravo), built per the committed
PHASE3-DESIGN. Operator-authorized build with Redis down -> mock-validated now,
live round-trip opt-in (PRISM_EVENT_BUS_LIVE=1) deferred to a Redis-up session.

Dedup-correct: NOT a parallel event bus. RedisStreamSink is the durable
TRANSPORT the wired in-memory EventBusEngine optionally fans out to.

- RedisStreamSink.ts: fail-soft Redis Streams client (XADD/XGROUP/XREADGROUP/
  XACK/XPENDING) over ioredis (already wired, no new dep); mirrors
  RedisCacheProvider graceful degradation. Per-call timeout (Promise.race) so a
  hung Redis degrades to {ok:false} instead of stalling the publisher. Input
  validation throws; all I/O fails soft. XPENDING = per-group lag (replaces the
  file bus's 29k global "unread").
- EventBusEngine.ts: ADDITIVE attachDurableSink() + a guarded durable append in
  publish() that fires ONLY when a sink is attached AND PRISM_EVENT_BUS=redis.
  Default (no sink / flag!=redis) = byte-identical in-memory bus => ZERO
  regression to the 9 infraDispatcher consumers (proven: original 14 EventBus
  tests + 2 sibling suites stay green). mode reflects reality; new
  durable_dropped_count is additive.

Tests: RedisStreamSink 12 (11 + 1 opt-in live) -- happy round-trip + 4 failure +
3 adversarial (malformed entries / null reply / hung-timeout) + validation;
EventBusEngine 19 (14 original + 5 durable: no-regression / default-off /
fail-soft / mapped-fields / dropped-count). tsc clean.

Verified: per-file scrutiny (reviewer + code-analyzer) PASS/PASS; the 2 P2s they
flagged (mode-vs-reality, per-call timeout) fixed + the timeout pinned by a test.

Next (Redis-up): live round-trip validation -> re-point AGENT_CHAT.jsonl writers
+ closed-loop consumers behind the flag -> parity -> flip default to redis.
```

## Files touched (5)
- mcp-server/src/__tests__/EventBusEngine.test.ts  |  64 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++-
- mcp-server/src/__tests__/RedisStreamSink.test.ts | 170 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/EventBusEngine.ts         |  45 ++++++++++++++++++++++++++++++++++++++++++++-
- mcp-server/src/engines/RedisStreamSink.ts        | 308 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 4 files changed, 585 insertions(+), 2 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 04101a79114f`
- Milestone envelope: `mcp-server/data/milestones/INFRA-SYNERGY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._