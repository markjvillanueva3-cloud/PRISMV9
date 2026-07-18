# WIRE-UNWIRED-MS0/U-WIRE-ASSETDEP — [MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-ASSETDEP: wire AssetDependencyGraphEngine read-only into prism_dev (5 actions)

**Commit:** `b8d2451b6e16` · **By:** markjvillanueva3-cloud · **At:** 2026-05-16T22:48:24-05:00
**Tags:** wire-unwired-ms0, u-wire-assetdep, auto-distilled

## Subject
[MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-ASSETDEP: wire AssetDependencyGraphEngine read-only into prism_dev (5 actions)

## Body
```
[MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-ASSETDEP: wire AssetDependencyGraphEngine read-only into prism_dev (5 actions)

AssetDependencyGraphEngine (Phase 0.24 U-INT2) maps engine→formula→material
dependencies for impact analysis. Ships a hard-coded 7-node graph
(CuttingForceEngine, kienzle_formula, material_db, SpeedFeedEngine,
 ToolLifeEngine, taylor_formula, PostProcessorEngine). 0 dispatcher refs
before this, 14/14 engine-direct tests green. reset() DEFERRED — every read
method auto-initializes idempotently.

5 actions wired:
  - asset_dep_node          → getNode(id)
  - asset_dep_dependencies  → getDependencies(id, depth?)
  - asset_dep_dependents    → getDependents(id, depth?)
  - asset_dep_impact        → analyzeImpact(asset_id|assetId)
  - asset_dep_stats         → getStats()

Surfaces:
  - devDispatcher.ts: +5 ACTIONS enum entries + 5 case blocks (lazy import,
    inline param-presence guards; asset_id/assetId alias resolution inline)
  - devActionSchemas.ts: +5 Zod schemas:
    * id min(1) on node/dependencies/dependents
    * depth int positive max(20) (caps recursion blast radius)
    * impact refine() guard requiring asset_id OR assetId
  - dispatcher.assetDependencyGraph.test.ts: 18 cases (6 schema + 12 round-trip)
    - ROUTING PROOF: hard-coded "CuttingForceEngine → kienzle_formula" edge
      round-trips through both getDependencies + getDependents
    - 7-node graph stats: totalNodes=7 verified
    - PostProcessorEngine leaf-node case: dependents=[] (slimResponse-aware)
    - impact analysis: material_db downstream affects CuttingForceEngine
    - depth=1 vs depth=3 cross-checked against engine-direct
      (graph topology may converge at depth=1 — not a wiring bug)
    - asset_id/assetId alias parity proven byte-identical
    - {error, details} envelope verified — refine message surfaces in details

beforeEach calls assetDependencyGraphEngine.reset() to ensure each test gets
a freshly-initialized 7-node graph (singleton survives across tests).

Test result: 32/32 PASS (18 round-trip + 14 engine-direct).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (4)
- .../dispatcher.assetDependencyGraph.test.ts        | 270 +++++++++++++++++++++
- mcp-server/src/schemas/devActionSchemas.ts         |  26 ++
- mcp-server/src/tools/dispatchers/devDispatcher.ts  |  58 ++++-
- 3 files changed, 353 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show b8d2451b6e16`
- Milestone envelope: `mcp-server/data/milestones/WIRE-UNWIRED-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._