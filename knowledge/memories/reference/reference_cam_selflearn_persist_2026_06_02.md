---
name: reference_cam_selflearn_persist_2026_06_02
description: "U-CAM-SELFLEARN-PERSIST (#35) — externalized the planner's hardcoded LATHE_OP_ORDER into a durable learned-op-order.json artifact the planner LOADS (fail-soft fallback). Closes the LOAD side of the offline CAM closed loop; corpus-shift→order auto-merge is #36. Also fixed a pre-existing stale-fixture test regression."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.504Z
aliases: reference_cam_selflearn_persist_2026_06_02
---


# CAM self-learn persist — LOAD-side of the closed loop (slot:kilo, 2026-06-02)

Standing /goal: *"closed loop learning and self improving for cam program generation."* The offline CAM loop was "architecturally closed but operationally OPEN" — the learner (`cam-learn-order-run.mjs`) wrote a corpus-learned ranking to `CAM-ORDER-LEARN-REPORT.json`, but the planner used a **hardcoded** `export const LATHE_OP_ORDER` and never read it. Refinements had to be hand-transcribed into source — the open loop.

## What shipped (commit pending — slot/kilo)
- **`scripts/lib/cam-learned-order-store.mjs`** (new, pure + injectable IO): `loadLearnedOrder` (fail-soft, NEVER throws — ENOENT quiet, every other degrade WARNs then falls back), `buildLearnedOrderArtifact` (fail-LOUD on bad input), `writeLearnedOrderArtifact` (atomic tmp+rename, validated single write path), `validateOrderMap` (invariants: facing strictly-before-parting, parting==max, rough-before-finish monotonic when both present, forbidden `__proto__`/`constructor`, ≤256 families, reduce-not-spread vs RangeError), `sortOrderMap`, `deriveProvenanceFromReport`. 28 tests.
- **`cam-part-program-planner.mjs`**: `planPartProgram(matrix,rules,part,orderMap=LATHE_OP_ORDER,orderSource="builtin-default")` — pure, 3-arg byte-compatible; surfaces `order_source` in the plan. `planPartProgramFromDefaults` now `loadLearnedOrder`s the artifact → the offline loop (which calls FromDefaults) auto-picks it up.
- **`cam-emit-learned-order.mjs`** (new, no-corpus bootstrap) + **`cam-learn-order-run.mjs`** extended to auto-persist on every retrain. Both persist the **curated 15-family** `LATHE_OP_ORDER` (NOT the 12-family raw `corpus_suggested_order`, which would drop tap/profile/live_tool_milling).
- **`state/shared/cam-drive/learned-op-order.json`** — the persisted artifact (15 families, provenance: sampled 2005 / 2000 w-ops / mean_sequence_fidelity 0.9376). Committed (fresh clones need it — corpus `_filelist.txt` is machine-local).
- Live-verified: `planPartProgramFromDefaults` → `order_source: "learned-artifact"`. 101/101 CAM lib tests.

## HONEST SCOPE (R12 — reviewer P1-A caught my over-claim)
#35 closes the **LOAD** side only. The persisted order IS the curated const; a retrain refreshes the artifact's *provenance + audit report*, NOT its order — so a corpus *shift* does not yet change ordering on its own. Auto-merging fresh corpus `disagreements` INTO the persisted order (the WRITE side, so a shift changes ordering with zero code edit) is **U-CAM-RETRAIN-LIFECYCLE (#36)**. The loop is "externalized but static" until #36. The persisted `corpus_suggested_order` (in provenance) genuinely differs from the persisted `order` — that delta is #36's input.

## Pre-existing regression fixed (R12)
The `JM_PART` test fixture in `cam-part-program-planner.test.mjs` was in the OLD drill-first order; commit `446dc68261` (#49) corpus-updated `LATHE_OP_ORDER` to OD-first but left the fixture stale → `"canonical lathe order → no sequence warnings"` had been RED since. Reordered the fixture to corpus-canonical ascending (also more faithful to the 16,558-program corpus). See [[reference_cam_fusion_live_path_unblocked_2026_06_02]] · [[reference_fusion_port_assignment_kilo_18361_2026_06_02]].
