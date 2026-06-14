---
name: reference_feature_gap_audit_cad_dedup_wins_2026_05_18
description: "FEATURE-GAP-AUDIT-MS0 CAD/lathe units — most \"digest=0 absent\" claims were digest-staleness; R8 dedup-preflight is the highest-leverage first step"
aliases: reference_feature_gap_audit_cad_dedup_wins_2026_05_18
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.112Z
---


2026-05-18, slot delta (claude-3ddf0577), `/checkin-delta /loop ... /goal`, 9 iters.

**Headline:** Of 8 FEATURE-GAP-AUDIT-MS0 CAD/lathe units worked, **5 were R8 dedup-wins** — the engine was *already ported in a prior session* and the audit's "(digest=0, absent)" tag was a digest-staleness false-positive (same META-tool schema-read-blindness class as the 2026-05-17 high-roi-skill-rank regression). Verifying with `Glob mcp-server/src/engines/<Name>*.ts` BEFORE porting saved ~5 full re-ports.

**Shipped (9 commits):**
- `U-GAP-CAD-BREP-TESSELLATOR` — real port: `BRepTessellatorEngine.ts` (STEP entity-map→mesh, ear-clip MIT 18.433 + 5 parametric surfaces) + 39 tests + cadDispatcher `brep_tessellate`. AdaptiveTessellationEngine already covered the V2 half (re-scoped).
- `U-GAP-CAD-GEODESIC` — real port: `GeodesicDistanceEngine.ts` (Dijkstra/FMM/path/iso) + 32 tests + 4 cadDispatcher actions.
- `U-GAP-LATHE-NOSE-RADIUS-COMP` — real port w/ value-add: monolith was 74-line reference-data ONLY; port adds executable LAP-rule validator (`validateProgram` detects G80-with-active-TNR bug) + 28 tests + 4 turningDispatcher actions.
- `U-GAP-CAD-MESH-DECIMATION` / `-SPECTRAL-GRAPH` / `-SURFACE-RECON` / `-CURVATURE-OFFSET` / `-VORONOI-ISOSURFACE` — **R8 dedup-wins**: engines already ported, gap was MISSING TESTS. Added 19+23+20+18+20 = 100 tests; envelopes flipped with `rescope_note`.
- `U-GAP-CAD-COMPLETE-GEN` — **deferred**: 2914-line/10-part monolith is structurally covered by 6 existing engines (CADKernel/Blueprint/Neural/TextToCAD/CADToSTEP/LATHE-*). CLOSE-OUT-DEFERRED entry has the per-part coverage map; genuine residual = Part-4 parametric feature primitives → recommended focused follow-up `U-GAP-CAD-FEATURE-PRIMITIVES` rather than 2914-line re-port.

**Reusable doctrine:**
1. For any `Re-modularize PRISM_X from v8.89 monolith (digest=0, absent)` unit → `Glob *X*.ts` in engines/ FIRST. The header usually says `Ported from PRISM_X.js (monolith R2.3.1)`. "digest=0" ≠ "absent".
2. Already-ported-but-untested → close out by ADDING the test (real reference values), flip envelope with `rescope_note`. Faster + higher-value than re-porting.
3. Reference-data-only monoliths (no algorithms) → port as canonical constants + add an executable validator (turns manual prose into an enforceable lint). That's the value-add.
4. Huge multi-part monoliths → write a per-part coverage map into CLOSE-OUT-DEFERRED; spawn a focused follow-up for the genuine residual; never re-port code that already exists.

3-of-3 scrutiny: all PASS, 0 P0/P1. Total ~218 real-value tests added. Sister: [[reference_predict_with_trend_2026_05_17]] (same milestone, mill domain, same R8 re-scope pattern). [[feedback_auto_close_out]] · [[feedback_roadmap_close_out]].
