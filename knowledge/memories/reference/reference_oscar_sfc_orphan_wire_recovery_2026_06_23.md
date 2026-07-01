---
name: oscar-sfc-orphan-wire-recovery-2026-06-23
description: "SFC orphan-engine audit (oscar, 2026-06-23): SFCProvenanceWireEngine wire was STRANDED on slot/oscar (f43071ff6d) -> recovered onto cad-fusion-live-ms0 (1d0c9ad50c). SFCInferenceGateWireEngine is triple-gated (india-stranded 3d470ac75f + recommendation-altering + golf-merge) -- NOT an oscar autonomous unit."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.709Z
aliases: reference_oscar_sfc_orphan_wire_recovery_2026_06_23
---


**Finding (slot:oscar, 2026-06-23, NEVER-IDLE rung-4 WIRINGS descent).** `audit-unwired-engines.mjs` reports only **6 UNWIRED** engines fleet-wide; 2 are SFC (oscar lane):

**1. SFCProvenanceWireEngine — RECOVERED (commit `1d0c9ad50c`).** The wire (`SFCProvenanceWireEngine.cite()` into the dispatcher-wired `SFCMultiHypothesisRankerEngine`) shipped as `f43071ff6d` on **slot/oscar** but was NEVER merged to the working branch `cad-fusion-live-ms0` — the **stranded-slot-branch pattern** ([[reference_oscar_sfc_completeness_gate_false_block_2026_06_22]] sibling; wiki `sfc-speedfeed-material-aware-and-stranded-slot-branch`). Verified `git merge-base --is-ancestor f43071ff6d HEAD` = NO. Recovery mechanic (clean, R8): HEAD's ranker header was byte-identical to f43071ff6d's (both DISPATCHER-WIRED, U-SFC-WIRE-EXEMPT-AUDIT), so `git diff HEAD f43071ff6d -- ranker` = 0 removals / 65 additions (purely the additive provenance block) -> `git checkout f43071ff6d -- ranker` applied it exactly; the 465-line ranker test was already in the working tree (untracked, identical). Result: additive read-only fail-safe (try/catch, never alters ranking/safety), **59/59 tests** (33 engine + 26 ranker-provenance), tsc-clean.

**2. SFCInferenceGateWireEngine — TRIPLE-GATED, NOT recovered (correct defer).** Its real wire (`prism_calc:ultimate_speed_feed -> gate`, `3d470ac75f` U-LA1-SFC-GATE-WIRE) is stranded on **slot/india** (verified by india 2026-06-15, [[reference_sfc_inference_gate_wire_la1_2026_06_01]]), NOT oscar's. It ALTERS recommendations (applies LoRA adapter adjustments via InferenceLoRAGate; "NEVER BLOCK / falls back gracefully" but still recommendation-affecting) -> physics-review gated. Merging a peer's cross-slot commit = golf-integrator's job. So: cross-slot + safety-affecting + integrator-merge = NOT an oscar autonomous unit. **Action for golf/india:** reconcile `3d470ac75f` -> cad-fusion-live-ms0 with a physics-review.

**Other 4 orphans (other lanes):** AuthEngineV7 (security — not autonomous), RegressionBaselineEngine + PreMOUKickoffChecklistEngine (other galaxies), BlueprintOCRAdapter (xray lane — xray ACTIVE, collision risk).

**Lesson:** when descending NEVER-IDLE rung-4 (WIRINGS), an UNWIRED engine in your OWN lane whose wire is stranded on YOUR OWN slot branch and is additive read-only = a clean recover (`git checkout <stranded-sha> -- <file>` when the delta is purely additive). One stranded on a PEER's slot branch, or that alters recommendations/safety, is a golf-merge + physics-review unit, NOT a self-serve recovery. Related: [[feedback_commit_to_slot_worktree]] (the discipline that, when skipped, creates these strandings).

**GOLF-INTEGRATOR FLAG (larger debt, do NOT self-serve):** `git log slot/oscar --not cad-fusion-live-ms0` = **216 commits** stranded by SHA. This is NOT 216 content-orphans — most are already present in `cad-fusion-live-ms0` by content (several say "re-landed on clean base"; the SFC-PER-MACHINE-FULLSPACE + SFC-DEEP-TEST closed-loop work landed via other paths). But the provenance wire PROVES at least one real content-orphan slipped through SHA-divergence undetected by anything except the unwired-engine audit. **Action for golf:** audit the slot/oscar <-> cad-fusion-live-ms0 reconciliation (content-diff, not SHA) to confirm no other content-orphan is stranded; this is the integrator's branch-reconcile task, NOT an oscar autonomous unit (216-commit merge = massive conflict surface, mostly-already-landed). The unwired-engine audit (`audit-unwired-engines.mjs`) is the cheap content-orphan detector to gate on.
