---
title: "FEATURE-GAP-AUDIT 'digest=0, absent' is usually digest-staleness, not a real gap"
type: lesson
created: 2026-05-18
by: claude-3ddf0577 (slot delta)
tags: [dedup, r8, feature-gap-audit, monolith-port, close-out]
domain: backend-dev
---

## The lesson

`FEATURE-GAP-AUDIT-MS0` units titled
`Re-modularize PRISM_X_ENGINE from v8.89 monolith (digest=0, absent)`
mostly do **not** describe absent engines. The `(digest=0, absent)` tag is
produced by a stale engine-digest scan — the same META-tool
schema-read-blindness class as the 2026-05-17 `high-roi-skill-rank`
regression and the 2026-05-16 juliett "3 META-tool calc bugs / assumed a
schema without reading the file" finding. Recurring class.

2026-05-18 slot delta worked 8 CAD/lathe units: **5 of 8 were already
ported in prior sessions** — the gap was a *missing companion test*, not a
missing engine. Re-porting would have duplicated working code and burned 5×
the time.

## The doctrine (R8 dedup-preflight, applied to monolith-port units)

1. **Before porting anything**, `Glob mcp-server/src/engines/<Name>*.ts`.
   The existing file's header almost always says
   `Ported from PRISM_X.js (monolith R2.3.1)`. `digest=0` ≠ `absent`.
2. **Already-ported-but-untested** → close out by *adding the test*
   (real reference values, ≥10 cases, ≥3 failure modes) and flip the
   envelope `status: completed` with an `exit_evidence.rescope_note`.
   Faster and higher-value than re-porting.
3. **Reference-data-only monolith** (no algorithms — e.g. the 74-line
   `PRISM_TOOL_NOSE_RADIUS_COMPENSATION_ENGINE`) → port as canonical
   constants **plus an executable validator** that turns the manual prose
   into an enforceable lint (TNR → `validateProgram` detects the
   "G80 reached with TNR still active" LAP bug). That validator is the
   value-add the unit exists for.
4. **Huge multi-part monolith** (e.g. 2914-line
   `PRISM_COMPLETE_CAD_GENERATION_ENGINE`, 10 parts) → do **not** re-port.
   Write a per-part coverage map into
   `state/shared/CLOSE-OUT-DEFERRED.md` (P1 math→CADKernel, P5 CSG→
   CADKernel, P6 feature-pipe→Blueprint/Neural/TextToCAD, P8 STEP→
   CADToSTEPPipeline, …), flag the genuine residual as a focused
   follow-up unit (`U-GAP-CAD-FEATURE-PRIMITIVES`), and let the
   `goal-complete-gate` clear via the deferral entry.

## Shipped this session (9 commits)

| Unit | Kind | Tests | Wiring |
|---|---|---|---|
| U-GAP-CAD-BREP-TESSELLATOR | real port | 39 | cadDispatcher `brep_tessellate` |
| U-GAP-CAD-GEODESIC | real port | 32 | cadDispatcher `geodesic_{dijkstra,fast_marching,path,iso_curves}` |
| U-GAP-LATHE-NOSE-RADIUS-COMP | port + validator | 28 | turningDispatcher `tnr_{lookup_p_code,get_g_code,validate_program,setup_procedure}` |
| U-GAP-CAD-MESH-DECIMATION | dedup-win (test) | 19 | calcDispatcher (existing) |
| U-GAP-CAD-SPECTRAL-GRAPH | dedup-win (test) | 23 | n/a (analysis engine) |
| U-GAP-CAD-SURFACE-RECON | dedup-win (test) | 20 | n/a |
| U-GAP-CAD-CURVATURE-OFFSET | dedup-win (test) | 18 | n/a |
| U-GAP-CAD-VORONOI-ISOSURFACE | dedup-win (test) | 20 | n/a |
| U-GAP-CAD-COMPLETE-GEN | deferred (coverage map) | — | — |

3-of-3 scrutiny: all PASS, 0 P0/P1. ~218 real-value tests added.

Memory: [[reference_feature_gap_audit_cad_dedup_wins_2026_05_18]].
Sister: [[reference_predict_with_trend_2026_05_17]] (same milestone, mill,
same R8 re-scope). See also `feedback_auto_close_out`, `feedback_roadmap_close_out`.
