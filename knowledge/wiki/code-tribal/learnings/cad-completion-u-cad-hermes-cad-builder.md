# CAD-COMPLETION/U-CAD-HERMES-CAD-BUILDER — [MAIN-FORCE] [CAD-COMPLETION]/U-CAD-HERMES-CAD-BUILDER (slot:delta): PA3 parallel-hermes CAD-unit builder harness

**Commit:** `01866ce7d38a` · **By:** markjvillanueva3-cloud · **At:** 2026-06-26T11:02:43-05:00
**Tags:** cad-completion, u-cad-hermes-cad-builder, auto-distilled

## Subject
[MAIN-FORCE] [CAD-COMPLETION]/U-CAD-HERMES-CAD-BUILDER (slot:delta): PA3 parallel-hermes CAD-unit builder harness

## Body
```
[MAIN-FORCE] [CAD-COMPLETION]/U-CAD-HERMES-CAD-BUILDER (slot:delta): PA3 parallel-hermes CAD-unit builder harness

The CAD-unit analogue of alpha's hermes-graph-improvement loop: auto-plan a PARALLEL
opus-fast-max build fan-out over the autonomous-buildable PENDING CAD-completion units
(the operator's "drastically increase parallel hermes agents, automatically invoked").

- CADBuilderFanoutEngine.ts -- PURE planner. Composes alpha's OpusFastMaxAgentSpecEngine
  (injected opus cost table + opus-fast-max spec; 5x multiplier stays single-sourced).
  Classifies autonomous-buildable (excludes operator/merge/GPU-gated + shipped), greedily
  packs fixed-cost build cells (builder + physics/test/code reviewers) into a token budget.
  R12: a refused budget spawns NOTHING; gated -> excluded, over-budget -> refused.
- cad-hermes-builder-driver.mts -- I/O+CLI driver (tsx). deriveMergeGatedIds self-clears
  post-merge; writes ledger + Workflow-ready plan artifact.
- hermes_cad_build_plan dispatcher action (enum + case + schema), pure, no spawn.
- 58 tests (26 engine + 19 wire + 13 driver), tsc clean. LIVE: 3 cells / 12 opus-fast-max
  agents over U-CAD-VALIDATION-50-RUN(T2) + U-CAD-PRINTGEN-E2E(T3) + PA3; 17 excluded honestly.
- Also ran hermes-graph-improvement-driver --refresh --count 16 (improve alpha's graph).

Per-file 2-arm scrutiny PASS (arm B caught + closed a driver-test R15 gap).
```

## Files touched (8)
- mcp-server/src/__tests__/CADBuilderFanoutEngine.test.ts | 211 +++++++++++++++++++++++++++++++++++++
- mcp-server/src/__tests__/hermesDispatcher.wire.test.ts  |  32 ++++++
- mcp-server/src/engines/CADBuilderFanoutEngine.ts        | 296 ++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/schemas/hermesActionSchemas.ts           |  23 ++++
- mcp-server/src/tools/dispatchers/hermesDispatcher.ts    |  19 +++-
- scripts/cad-hermes-builder-driver.mts                   | 256 +++++++++++++++++++++++++++++++++++++++++++++
- scripts/cad-hermes-builder-driver.test.mjs              | 166 +++++++++++++++++++++++++++++
- 7 files changed, 1002 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 01866ce7d38a`
- Milestone envelope: `mcp-server/data/milestones/CAD-COMPLETION.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._