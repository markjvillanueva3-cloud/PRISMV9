# CAD-DRAWING-PIPELINE-MS0/U-CADDRAW-STOCK-OFFSET — [MAIN-FORCE] [CAD-DRAWING-PIPELINE-MS0]/U-CADDRAW-STOCK-OFFSET (slot:delta): secondary-op finish-stock baked into geometry (stage S4)

**Commit:** `11aa5eea9bd6` · **By:** markjvillanueva3-cloud · **At:** 2026-06-19T15:22:49-05:00
**Tags:** cad-drawing-pipeline-ms0, u-caddraw-stock-offset, auto-distilled

## Subject
[MAIN-FORCE] [CAD-DRAWING-PIPELINE-MS0]/U-CADDRAW-STOCK-OFFSET (slot:delta): secondary-op finish-stock baked into geometry (stage S4)

## Body
```
[MAIN-FORCE] [CAD-DRAWING-PIPELINE-MS0]/U-CADDRAW-STOCK-OFFSET (slot:delta): secondary-op finish-stock baked into geometry (stage S4)

WHY: the operator plans ahead for secondary ops -- leave material for grinding/honing, undersize a sinker-EDM electrode by the spark gap -- so the AS-MODELED geometry carries the finish stock and the stage-5 print-regen validation compares against the STOCK-INCLUDED nominal, not the finished print dim. Stage S4 of CAD-DRAWING-PIPELINE-COMPREHENSIVE-2026-06-19.md.

WHAT:
- CADStockAllowanceEngine.ts (pure): applyAllowance(nominalMm, allowance) returns the as-modeled stock-included dimension + provenance. GEOMETRIC DIRECTION: external surface (grind removes from outside) -> OVERSIZE; internal bore (hone enlarges) -> UNDERSIZE; EDM electrode (discharge burns oversize cavity) -> UNDERSIZE by the spark gap. delta = (diametral?2:1) x per-side allowance. applyPlan() batches.
- SPARK GAP imported from src/physics/constants.ts EDM_PHYSICS.sinker_spark_gap (Jameson SME 2001) -- NEVER inlined; default graphite/finish, override by electrodeMaterial+regime. Grind/hone allowance VALUES are operator inputs (not the engine's decision); exact tolerance values defer to physics-reviewer per the delta soul.
- WIRED to cadDispatcher: cad_apply_stock_allowance (enum + getEngine cadStockAllowance + case [single or batch] + schema).
- TESTED: 13 tests, spanning configs (grind-external-diametral oversize, hone-internal-diametral undersize, finish-external-linear, EDM-electrode spark-gap sourced-from-constant) + failures (negative/NaN/missing/unknown-electrode) + adversarial (allowance>nominal warning, Infinity rejected by Zod) + batch + dispatcher round-trip. tsc clean for changed files.

4/7 pipeline units shipped. Next: U-CADDRAW-ROUTE-CLASS (cad_drawing task class in AISystemRouterEngine, Ollama-first/Claude-failsafe). Loop iter6.
```

## Files touched (5)
- mcp-server/src/__tests__/CADStockAllowanceEngine.test.ts | 109 ++++++++++++++++++++++++++
- mcp-server/src/engines/CADStockAllowanceEngine.ts        | 153 +++++++++++++++++++++++++++++++++++++
- mcp-server/src/schemas/cadActionSchemas.ts               |   7 +-
- mcp-server/src/tools/dispatchers/cadDispatcher.ts        |  18 +++++
- 4 files changed, 286 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 11aa5eea9bd6`
- Milestone envelope: `mcp-server/data/milestones/CAD-DRAWING-PIPELINE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._