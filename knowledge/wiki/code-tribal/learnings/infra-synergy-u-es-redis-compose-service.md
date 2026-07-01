# INFRA-SYNERGY/U-ES-REDIS-COMPOSE-SERVICE — [MAIN-FORCE] [INFRA-SYNERGY]/U-ES-REDIS-COMPOSE-SERVICE: orchestrate Redis as a first-class stack service (was an unmanaged dependency)

**Commit:** `6112afa40a3b` · **By:** markjvillanueva3-cloud · **At:** 2026-06-25T20:55:10-05:00
**Tags:** infra-synergy, u-es-redis-compose-service, auto-distilled

## Subject
[MAIN-FORCE] [INFRA-SYNERGY]/U-ES-REDIS-COMPOSE-SERVICE: orchestrate Redis as a first-class stack service (was an unmanaged dependency)

## Body
```
[MAIN-FORCE] [INFRA-SYNERGY]/U-ES-REDIS-COMPOSE-SERVICE: orchestrate Redis as a first-class stack service (was an unmanaged dependency)

Gap surfaced during Phase 3 live validation: the whole Redis-dependent layer
(RedisCacheProvider cache/locks, JobQueueEngine/BullMQ, the new RedisStreamSink
durable bus) targets 127.0.0.1:6379, but the root compose never orchestrated a
Redis -- it was a "run it yourself" dependency. Added an additive `redis`
service (redis:7-alpine, appendonly=yes for durability, localhost-only
127.0.0.1:6379, healthcheck, prism-net, persisted volume).

Purely additive -- no existing service changed. Validated: `docker compose
config` parses (redis in the service list); container up + PONG; RedisStreamSink
12/12 incl the live append->consume round-trip against the compose-managed Redis.

This is the R13 prerequisite for any Phase-3 bus cutover (orchestrated Redis
before re-pointing AGENT_CHAT.jsonl). The cutover itself (flag flips +
consumer re-points) remains a deliberate operator scope decision.
```

## Files touched (2)
- docker-compose.yml | 22 ++++++++++++++++++++++
- 1 file changed, 22 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 6112afa40a3b`
- Milestone envelope: `mcp-server/data/milestones/INFRA-SYNERGY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._