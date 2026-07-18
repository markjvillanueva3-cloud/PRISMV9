---
name: reference_delta_cad_learn_loop_persistence_gap_2026_06_11
description: Delta's CAD closed loop MEASURES + CORRECTS live (validated), but corrections are NOT persisted as cross-session training signal -- the xproc_outcome_publish->india / cad-fix-training-ledger arrow is the open gap; closure reuses india's L2 outcome->training pattern
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.541Z
aliases: reference_delta_cad_learn_loop_persistence_gap_2026_06_11
---


**Finding (slot:india, 2026-06-11, operator goal "max out CAD closed-loop training for delta"):** assessed delta's CAD closed-loop training as the india training-methods half-owner (cad <-> NN/GNN is the canonical india<->delta bridge).

**State (grounded, R12):**
- **MEASUREMENT loop PROVEN** (CAD-CLOSED-LOOP-MS0, 18 commits 2026-06-10): measure->correct->converge on REAL refs (blisk/impeller/valve/rotor) via surface-Hausdorff+Chamfer+dims+bbox-vol, units-first inch->mm. Accuracy 0.000% dims / 1.551% mean / 5.087% worst surface dev. Ceiling: literal 0% = re-import NURBS, not regen.
- **CORRECTION loop EXISTS + validated live** (do NOT claim measure-only): `scripts/cad-fusion-correction-loop-live.mjs` runs build->probeFaceGeometry->diffXrayPrints vs xray ground truth->proposeFeatureCorrections->apply on the real :18365 Fusion bridge ([[reference_delta_closed_loop_training_live_2026_06_02]]).
- **GAP = cross-session TRAINING PERSISTENCE.** DELTA-CONTEXT-LEDGER §3 A3/P9: `cad-fix-training-ledger` does NOT exist; `xproc_outcome_publish->india` unwired. VERIFIED: `state/outcomes/` has speed_feed/sinker_edm/mill/lathe/wedm/grinder/welder but **NO cad.jsonl**. So each session's corrections EVAPORATE -- they don't persist as durable training signal improving the NEXT session's generator. Real trainers exist to build onto: `CADSequenceTrainerEngine`, `CADTrainingPipelineOrchestratorEngine`.

**Closure (plan: `state/shared/specs/DELTA-CAD-LEARN-LOOP-CLOSURE-PLAN-2026-06-11.md`):** this is the SAME open-loop->training gap india just closed fleet-wide (U-OUTCOME-LORA-WIRE: outcome bus -> LoRA corpus via outcome-to-alpaca-converter). Closure = (1) delta emits compare() outcomes to `state/outcomes/cad.jsonl` [delta-owned, needs real compare() field names -- do NOT fabricate]; (2) india clones the L2 converter for the CAD shape + registers `cad-outcomes` as an advisory lora-training-jsonl source (assembler auto-folds); (3) delta+india build `cad-fix-training-ledger` recording (deviation_before, correction, deviation_after) so only deviation-REDUCING corrections become positive training pairs (R9); (4) delta GPU re-embed for CAD-RAG (Blackwell, 768d CPU->1024d GPU nv-embedqa, use PRISM_EMBED_CONCURRENCY=16). TOP UNBLOCK (operator-gated): C1->P1 `U-MERGE-SLOT-DELTA` (unlocks 410 commits).

**Lesson:** "complete the closed loop" -- verify which ARC is open. Delta's measure+correct arcs are closed/live; the open arc is cross-session TRAINING PERSISTENCE (corrections->durable signal->retrain). The acceleration is closing the feedback arrow, not building correction from scratch. Reuse the L2 outcome->training pattern; it's the same shape at the CAD grain.
