---
terminal: claude-1415666f
topic: viz-phase2-merge
source: live-chat
state: Phase 2 viz layer expansion — 5 generators built + run, merge wiring 80% complete, merge not yet executed
generatedAt: 2026-05-11T03:30:00Z
---

# RESUME

Finish Phase 2 viz layer expansion. **Five new augmentation generators have ALREADY been built and run successfully** — their `*-augmentation.json` files exist in `state/shared/system-viz/`. The merge wiring in `scripts/merge-augmentations.mjs` is 80% complete; one Edit failed before context hit hard cap. Need to verify wiring landed, then run merge + repair + dedup + commit.

## EXACT NEXT STEPS (do these in order, no detours)

### 1. Verify merge-augmentations.mjs wiring landed

Grep for the Phase-2 markers — all SHOULD be present:

```bash
grep -n "jmDieCustomers\|frontendDeep\|wikiCrossRefs\|schemaEngEdges\|enginePhysEdges" H:/prism/scripts/merge-augmentations.mjs
```

Expected presence in the file:
  - 5 `loadOptional()` calls (one per Phase 2 augmentation) — **CONFIRMED LANDED**
  - 5 `if (jmDie...)` version entries — **CONFIRMED LANDED**
  - 3 `mergeIndexedAugmentation` calls (jmDieCustomers, frontendDeep, wikiCrossRefs) + 2 `mergeEdgesOnly` calls (schemaEngEdges, enginePhysEdges) — **STATUS UNCERTAIN, the Edit succeeded per tool result but Edit hook reported success too quickly to confirm**
  - 1 console.log line with `jmDie=...n/...e  frontendDeep=...n/...e  wikiX=...n/...e  schemaEng=...e  enginePhys=...e` — **STATUS UNCERTAIN**
  - schema bump from `2.25.0` → `2.26.0` (TWO places: one in `console.log` and one in `G.schemaVersion`) — **STATUS UNCERTAIN**

If any of the 3 uncertain blocks are missing, add them. The patterns:

  - Insert the 5 merge calls IMMEDIATELY AFTER these existing lines:
    ```js
    const engineImpEdgeCount = mergeEdgesOnly(engineImpEdges, "engineImportEdges");
    const testCovEdgeCount   = mergeEdgesOnly(testCovEdges,   "testCoverageEdges");
    ```
    Add:
    ```js
    const [jmDieNodes,   jmDieEdges]   = mergeIndexedAugmentation(jmDieCustomers, "jmDieCustomers");
    const [frontDNodes,  frontDEdges]  = mergeIndexedAugmentation(frontendDeep,   "frontendDeep");
    const [wikiXNodes,   wikiXEdges]   = mergeIndexedAugmentation(wikiCrossRefs,  "wikiCrossRefs");
    const schemaEdgeCount = mergeEdgesOnly(schemaEngEdges,  "schemaEngineEdges");
    const physEdgeCount   = mergeEdgesOnly(enginePhysEdges, "enginePhysicsEdges");
    ```

  - Replace `schema bumped to 2.25.0` console.log line with TWO lines:
    ```js
    console.log(`  Phase 2:       jmDie=${jmDieNodes}n/${jmDieEdges}e  frontendDeep=${frontDNodes}n/${frontDEdges}e  wikiX=${wikiXNodes}n/${wikiXEdges}e  schemaEng=${schemaEdgeCount}e  enginePhys=${physEdgeCount}e`);
    console.log(`  schema bumped to 2.26.0`);
    ```

  - Replace `G.schemaVersion = "2.25.0";` → `G.schemaVersion = "2.26.0";`

### 2. Run merge → repair → dedup

```bash
cd H:/prism && H:/Tools/nodejs/node.exe --max-old-space-size=16384 scripts/merge-augmentations.mjs
cd H:/prism && H:/Tools/nodejs/node.exe --max-old-space-size=16384 scripts/repair-graph-engine-classification.mjs
cd H:/prism && H:/Tools/nodejs/node.exe --max-old-space-size=16384 scripts/dedup-graph-nodes.mjs
```

### 3. Verify graph stats

```bash
node -e "const G=require('H:/prism/state/shared/system-viz/system-graph.json');console.log('schema:',G.schemaVersion,'nodes:',G.nodes.length,'edges:',G.edges.length);console.log('meta has jmDieCustomers:',!!G.meta.jmDieCustomers,'frontendDeep:',!!G.meta.frontendDeep,'wikiCrossRefs:',!!G.meta.wikiCrossRefs,'schemaEngineEdges:',!!G.meta.schemaEngineEdges,'enginePhysicsEdges:',!!G.meta.enginePhysicsEdges);"
```

Expected: schema 2.26.0, +~820 nodes (60 jmDie + 1 long_tail + 622 frontend + ~83 dir rollups + 181 wiki = ~947 raw, minus existing dupes ~820), +~6 K edges (1166 schema/physics edges + 622 frontend contains + 181 wiki contains + cross-refs etc).

### 4. Commit Phase 2

```bash
cd H:/prism && rtk git add scripts/generate-jm-die-customers.mjs scripts/generate-schema-engine-edges.mjs scripts/generate-engine-physics-edges.mjs scripts/generate-frontend-deep.mjs scripts/generate-wiki-cross-refs.mjs scripts/regen-viz.mjs scripts/merge-augmentations.mjs state/shared/system-viz/system-graph.json state/shared/system-viz/jm-die-customers-augmentation.json state/shared/system-viz/schema-engine-edges-augmentation.json state/shared/system-viz/engine-physics-edges-augmentation.json state/shared/system-viz/frontend-deep-augmentation.json state/shared/system-viz/wiki-cross-refs-augmentation.json
```

Commit message: `[CAD-FUSION-LIVE-MS0]/U-VIZ-LAYER-PHASE2: business + frontend + connective-tissue saturation`

Headline numbers to include in the commit body:
  - JM Die customer atomization: 60 atomic + 1 long-tail (152 customers, 2738 files); OMG=4183 files, ITW=1036, OPTIMAS=1102, FONTANA=1311, ATF=988, HOLO-KROME=620
  - Frontend deep-walk: 622 atomic files + 42 dir rollups across 3 frontends (prism-web 607, cqask-ui 8, cadquery-ui 7); 195 components, 147 pages, 90 api, 48 hooks
  - Schema→engine edges: 810 edges (185 validates + 521 uses_type + 104 uses_constant). Top refs: outcomeeventschema, citationschema
  - Engine→physics edges: 356 edges (CANONICAL_KIENZLE imported by 107 engines — critical safety blast-radius signal)
  - Wiki cross-refs: 181 knowledge nodes (code-tribal category) + 183 edges
  - Schema bumped 2.25.0 → 2.26.0

## CONTEXT

### Phase 2 generators (all already built + run, output files exist):
  - `scripts/generate-jm-die-customers.mjs` → `jm-die-customers-augmentation.json`
  - `scripts/generate-schema-engine-edges.mjs` → `schema-engine-edges-augmentation.json`
  - `scripts/generate-engine-physics-edges.mjs` → `engine-physics-edges-augmentation.json`
  - `scripts/generate-frontend-deep.mjs` → `frontend-deep-augmentation.json`
  - `scripts/generate-wiki-cross-refs.mjs` → `wiki-cross-refs-augmentation.json`

### Phase 1 already shipped (commit `1cc6c68a7` and `165b53362` and `7adc4ff37`):
  - L5 reclassifier (eng.other 2176 → 510, 77% reduction)
  - CAM/CAD vendor catalog atomization (214 nodes)
  - TS-registry entries (691 nodes: ToolpathStrategy 594, etc.)
  - Engine-import edges (1957 edges, 207 new beyond engineGraph)
  - Test→engine coverage edges (4541)
  - Physics constants atomic (130 nodes)
  - Schema bumped to 2.25.0
  - 127,556 unique nodes / 148,891 edges / 0 dupes

### Why the merge wiring is fragile:
The `merge-augmentations.mjs` file is 1,260+ lines. The Phase-2 Edit calls used substring matches that may not have landed perfectly. The grep in Step 1 is the gate — trust it over assumptions.

### Schema bump location:
There are TWO `2.25.0` strings in merge-augmentations.mjs — one in `console.log` (the post-merge banner) and one in `G.schemaVersion = "..."` (the actual write). BOTH need to become `2.26.0`.

### Frontend tally surprise:
`mcp-server/web/src` is the REAL prism frontend (607 files). cqask/ui and mcp-cadquery/frontend are minor pending merges (8 + 7 files). The frontend-deep generator covers all three.

### Wiki cross-ref low yield is correct:
Most wiki entries are auto-generated action wikis (11,321 skipped intentionally). Only 181 hand-authored knowledge entries under `knowledge/wiki/code-tribal/` get atomic nodes. Cross-ref edge count is low because auto-gen wikis have empty `related:` fields.

## PEER CLAIMS AT WRITE TIME
  - `claude-99eca613` — revenue-roadmap audit JSONs (DO NOT TOUCH)
  - `claude-845cf238` — OutcomeEpisodicMemoryBridgeEngine.ts + tests + aiReasoningDispatcher (DO NOT TOUCH)
  - `claude-2d87fea3` — TribalKnowledgeEngine.ts (DO NOT TOUCH)
  - `DESKTOP--29052` — held a stale claim on merge-augmentations.mjs from 28m ago at write time. Stale claim, safe to override.

## WORKING DIRECTORY

`H:/prism` (main worktree, branch `cad-fusion-live-ms0`)

## COMMITS THIS SESSION (Phase 1 already pushed)

  - `c4672f4f5` U-VIZ-COMBO (prior session)
  - `1cc6c68a7` U-VIZ-SATURATE (prior session)
  - `95bc680ff` U-VIZ-SATURATE2 (prior session)
  - `72c3547ff` U-VIZ-SATURATE3 (prior session)
  - `165b53362` U-VIZ-SATURATE4 (prior session)
  - `d2833bfd9` U-VIZ-PERF (prior session)
  - `7adc4ff37` U-VIZ-PERF-FIX (this session, IIFE wrap of simple.html)
  - `<phase 1 layer-saturate-ms0>` (this session — eng.other reclassify + cam-vendor + ts-registry + import edges + test coverage + physics atomic)
  - **NOT YET COMMITTED**: Phase 2 (jmDie + schemaEng + enginePhys + frontendDeep + wikiX)
