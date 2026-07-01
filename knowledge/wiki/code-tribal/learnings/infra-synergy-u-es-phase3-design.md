# INFRA-SYNERGY/U-ES-PHASE3-DESIGN — [MAIN-FORCE] [INFRA-SYNERGY]/U-ES-PHASE3-DESIGN: Phase 3 event-log design (extend EventBusEngine with a Redis-Streams backend, not a fork)

**Commit:** `67b8358b0fb8` · **By:** markjvillanueva3-cloud · **At:** 2026-06-25T19:46:23-05:00
**Tags:** infra-synergy, u-es-phase3-design, auto-distilled

## Subject
[MAIN-FORCE] [INFRA-SYNERGY]/U-ES-PHASE3-DESIGN: Phase 3 event-log design (extend EventBusEngine with a Redis-Streams backend, not a fork)

## Body
```
[MAIN-FORCE] [INFRA-SYNERGY]/U-ES-PHASE3-DESIGN: Phase 3 event-log design (extend EventBusEngine with a Redis-Streams backend, not a fork)

Dedup-correct Phase 3 design (slot:bravo). A wired incumbent EventBusEngine
(in-memory pub/sub, 9 infraDispatcher consumers, getStats().mode seam) already
owns the event-bus concern -> the durable Redis-Streams capability is an
ADDITIVE, default-OFF backend MODE on that engine, NOT a parallel engine. A
speculative standalone EventLogEngine was built + deleted this session (R7/R8).

Design: RedisStreamSink (fail-soft XADD/XREADGROUP/XACK/XPENDING adapter, no new
dep -- ioredis already wired; mirrors RedisCacheProvider graceful degradation)
+ EventBusEngine.attachDurableSink() + guarded publish delegation. Flag
PRISM_EVENT_BUS=file|redis default file => byte-identical default path => zero
regression to the 9 consumers. Per-group XPENDING lag replaces the file bus's
29k global "unread".

Build DEFERRED (R13/R15): the additive design is low-risk but real validation
needs a live Redis (XADD/consume/ack round-trip + lag readout); Redis is down
this session. Build trigger: Redis reachable on :6379. Build order + R15 test
matrix + no-regression gate in the spec.
```

## Files touched (2)
- state/shared/specs/INFRA-SYNERGY-PHASE3-EVENTBUS-DESIGN.md | 61 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 1 file changed, 61 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 67b8358b0fb8`
- Milestone envelope: `mcp-server/data/milestones/INFRA-SYNERGY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._