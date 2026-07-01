# WIRE-UNWIRED-MS0/U-WIRE-PLG — [MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-PLG: wire PluginInventoryEngine into prism_dev (6 read-only actions)

**Commit:** `32df1483c683` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T10:17:27-05:00
**Tags:** wire-unwired-ms0, u-wire-plg, auto-distilled

## Subject
[MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-PLG: wire PluginInventoryEngine into prism_dev (6 read-only actions)

## Body
```
[MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-PLG: wire PluginInventoryEngine into prism_dev (6 read-only actions)

Wires plugin/MCP/extension inventory queries (Phase 0.17 U-PLG3 of
UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN). 6 read-only actions through
prism_dev. Engine-pair test pre-existed.

6 read-only actions:
  plug_get             — get(id) → PluginEntry|null
  plug_list            — list() — all entries
  plug_list_by_kind    — listByKind(kind) — 4 kinds
  plug_list_by_health  — listByHealth(status) — 4 statuses
  plug_summary         — summary() — total + byKind + byHealth + top-5 used
  plug_size            — size()

DEFER (7 state-mutating + 1 path-traversal):
  register / registerAll / markHealth / markUsed
    class=fictional-entry injection — caller could inject fake plugins
    that flow into /aware boot brief
  unregister / clear — destructive
  loadFromInventoryFile(filePath)
    class=path-traversal — caller path goes straight to readFileSync

Wire-level invariants:
  - found / is_empty discriminators (slim-resistant)
  - plugin_count + total + size flattened to top level
  - All schemas strict (no extra params accepted)
  - All enum fields enforced (kind, status)

Tests: 22/22 PASS dispatcher round-trip + engine-direct seed in beforeAll.
       Asserts tag normalization (engine line 59 lowercase+dedup):
       input ['test', 'FIXTURE', 'Test'] → output ['test', 'fixture'].

VARIABILITY: 4 PluginKinds queryable (mcp-server has 2, agent-plugin/
extension have 1 each, skill-pack has 0). 3 HealthStatuses populated
(healthy=2, degraded=1, unreachable=1).

WIRE-UNWIRED-MS0 progress: 29->30 wires this session.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (4)
- .../__tests__/dispatcher.pluginInventory.test.ts   | 258 +++++++++++++++++++++
- mcp-server/src/schemas/devActionSchemas.ts         |  27 +++
- mcp-server/src/tools/dispatchers/devDispatcher.ts  |  49 +++-
- 3 files changed, 333 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 32df1483c683`
- Milestone envelope: `mcp-server/data/milestones/WIRE-UNWIRED-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._