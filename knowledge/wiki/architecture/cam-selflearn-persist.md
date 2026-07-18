---
title: CAM self-learn persist (learned-op-order artifact)
type: architecture
domain: cam
status: active
created: 2026-06-02
by: claude-1981bb83 (slot:kilo)
unit: U-CAM-SELFLEARN-PERSIST
---

# CAM self-learn persist — closing the LOAD side of the offline CAM closed loop

## Problem
The offline CAM closed loop was *architecturally* closed but *operationally* open: `cam-learn-order-run.mjs` learned a corpus pairwise op-ordering and wrote it to `CAM-ORDER-LEARN-REPORT.json`, but `cam-part-program-planner.mjs` used a **hardcoded** `export const LATHE_OP_ORDER` and never read it. Every refinement had to be hand-transcribed into source — the open loop.

## Solution (U-CAM-SELFLEARN-PERSIST, #35)
The op-order map is now a durable **DATA artifact** the planner LOADS, with the hardcoded map as the fail-soft fallback.

- **Store** `scripts/lib/cam-learned-order-store.mjs` — pure + injectable IO. `loadLearnedOrder` NEVER throws (ENOENT quiet; parse/kind/schema/invalid-order all WARN→fallback). `validateOrderMap` enforces manufacturing invariants so a corrupt artifact can't drive a parting-first sequence: facing strictly-before-parting, parting==max rank, rough-before-finish monotonic (`OD_roughing<OD_finishing`, `ID_boring<bore_finish`) when both present, `__proto__`/`constructor` rejected, ≤256 families, reduce-not-spread (no `Math.min(...huge)` RangeError). `buildLearnedOrderArtifact` fails LOUD on bad input. `writeLearnedOrderArtifact` = atomic tmp+rename, the single validated write path.
- **Consumer** `planPartProgramFromDefaults` loads the artifact (fallback `LATHE_OP_ORDER`) and passes it to `planPartProgram(matrix,rules,part,orderMap,orderSource)`; the plan surfaces `order_source` (`learned-artifact` | `default-fallback` | `builtin-default`). The offline loop driver calls FromDefaults, so it auto-picks up the learned order.
- **Producers** `cam-emit-learned-order.mjs` (no-corpus bootstrap) + `cam-learn-order-run.mjs` (auto-persists on every retrain). Both persist the **curated 15-family** map (not the 12-family raw `corpus_suggested_order`, which would drop tap/profile/live_tool_milling).
- **Artifact** `state/shared/cam-drive/learned-op-order.json` (committed — fresh clones need it; the corpus `_filelist.txt` is machine-local). schemaVersion 1.0.0, kind `cam_learned_op_order`, provenance carries sampled/programs/minSupport/minConfidence/mean_sequence_fidelity.

## HONEST SCOPE — LOAD side only
#35 closes the **LOAD** side. The persisted order IS the curated const; a retrain refreshes the artifact's provenance + audit report, NOT its `order` — so a corpus *shift* does not yet change ordering on its own (the loop is "externalized but static"). Auto-merging fresh corpus `disagreements` INTO the persisted order (the WRITE side) is **U-CAM-RETRAIN-LIFECYCLE (#36)**. The persisted `corpus_suggested_order` (in provenance) differs from the persisted `order` — that delta is #36's input. Stating it any other way over-claims closure (caught by independent review, R12).

## Lesson — stale test fixture (regression)
The `JM_PART` planner-test fixture was left in the OLD drill-first order when commit `446dc68261` (#49) corpus-updated `LATHE_OP_ORDER` to OD-first, so `"canonical lathe order → no sequence warnings"` had been RED since that commit. Reordered the fixture to corpus-canonical ascending. **Takeaway:** when a learned/curated constant changes, every fixture encoding "canonical" ordering of it must move with it — a self-improve commit that changes ranks must re-green the order-sensitive tests, not just the rank const.

Verified: `order_source="learned-artifact"` live; 101/101 CAM lib tests. Memory [[reference_cam_selflearn_persist_2026_06_02]].
