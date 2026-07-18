# WIRE-UNWIRED-MS0/U-WIRE-ASC — wire ActionSchemaCacheEngine into prism_dev (5 actions)

**Commit:** `fc23ca95dd7c` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T05:01:50-05:00
**Tags:** wire-unwired-ms0, u-wire-asc, auto-distilled

## Subject
[WIRE-UNWIRED-MS0]/U-WIRE-ASC: wire ActionSchemaCacheEngine into prism_dev (5 actions)

## Body
```
[WIRE-UNWIRED-MS0]/U-WIRE-ASC: wire ActionSchemaCacheEngine into prism_dev (5 actions)

Caches dispatcher action → param-name patterns scraped from case-block
sources (`params.X` / `params["X"]`), 2-min TTL with lazy refresh.

- asc_get_schema: action_name → ActionSchema | null (found:true|false)
- asc_search_schemas: query+max → matches[] (≤500 result cap)
- asc_get_param_hint: action_name → compact `action(params)` signature
- asc_get_dispatcher_actions: dispatcher_name → all actions for one dispatcher
- asc_get_stats: {actions, dispatchers, withParams}

DEFERRED: invalidate() — cache-mutating; meaningful only after dispatcher
source-file changes (build-time concern). Wiring it would let stale-cache
races be triggered remotely.

Wire-safety doctrine:
- found:true|false discriminator on get_schema (slimResponse strips null)
- count survivor alongside matches[] (slimResponse strips empty arrays)
- search-schemas test compares per-field (action/dispatcher/signature +
  nullish-coalesced params:[]→0-length) because slimResponse strips
  empty params:[] silently from no-param actions like 'stats()'
- DoS guards: 256-char strings, 500-result cap on search

Tests: 19/19 PASS (5 schema gates + 3 ROUTING PROOFs incl. per-field
parity for empty-array survivors + suffix-tolerance + 2 schema-reject).
```

## Files touched (4)
- .../__tests__/dispatcher.actionSchemaCache.test.ts | 224 +++++++++++++++++++++
- mcp-server/src/schemas/devActionSchemas.ts         |  33 +++
- mcp-server/src/tools/dispatchers/devDispatcher.ts  |  47 ++++-
- 3 files changed, 303 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show fc23ca95dd7c`
- Milestone envelope: `mcp-server/data/milestones/WIRE-UNWIRED-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._