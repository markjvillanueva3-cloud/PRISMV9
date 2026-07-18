---
name: reference_delta_cad_learning_bridge_2026_05_31
description: delta CAD course outcomes wired into the shared fleet learning substrate (india's loop) — labeled experience ledger + outcome-bus tap (emit) + recommendFromExperience (consume). The compound-learning step for CAD, consuming india's contract not reinventing it.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.541Z
aliases: reference_delta_cad_learning_bridge_2026_05_31
---


# delta CAD ↔ fleet AI learning bridge (compound learning, commit b2d89be65c)

Closes the operator directive "ensure your AI system takes full advantage of other galaxies' AI builds
including india." delta's CAD course-verification system now both EMITS to and CONSUMES from the shared
learning substrate india owns — per [[feedback_domains_own_ai_training_systems]] (domain produces the signal,
india runs the trainer) + [[feedback_plot_path_track_movements]] steps 4-5 (feed learning, compound fleet-wide).

## The substrate india + fleet built (located in MAIN tree H:/prism, R8 — consume, don't reinvent)
- `mcp-server/src/engines/FeedbackBusEngine.ts` — in-process pub/sub (`publish(topic,payload)` / `subscribe`),
  conventional topic `outcome.recorded`. TS-side, main tree.
- `mcp-server/src/engines/MasterAITrainingLedgerEngine.ts` (CAM-ML-CLOSEDLOOP-MS0 U-CMCCL09) — the shared
  LoRA-run ledger: `ingest(entry)` / `query` / `sloStatus`. schema v1.
- `MetaLearningOptimizerEngine` ("learn to learn faster") + per-domain `*MetaLearningEngine`
  (Lathe/Milling/PostProcessor…) — each domain clones this architecture.
- kilo's **CAM-ML-CLOSEDLOOP-MS0 (14 units)** = the exemplar closed loop (MillingLoRA*, FiveAxisLoRA*,
  LoRADriftCoordinator, MasterAITrainingLedger, OrchestratorConfidenceFeedback…).
- Shared jsonl ledgers in `H:/prism/state/shared/`: `outcome-bus.jsonl` (the cross-process outcome tap),
  `psn-training-signal.jsonl` (git-log-fed scoped_commit signal — NOT a hand-written store), plus per-domain
  ledgers (`post-closed-loop-ledger.jsonl`).

## What delta built (`scripts/lib/cad-fusion-learning-bridge.mjs`, 15 tests)
- **EMIT (outbound):** `buildSignals(ledger)` → `{experiences, outcomeTaps}`; `emitSignals` writes:
  1. `cad-course-experience.jsonl` (delta-OWNED, sole writer, owns schema) — labeled examples
     `{ts,schema,slot,domain,source,kind,courseId,features:{dimension,featureOps,checks,modelFailures},
     label:{target:"model_verified", value:0|1}}`. The LABEL is the strong ground-truth signal: 1 iff the live
     BRep topology matched the predicted build map (NOT mere step-success). This is supervised training data.
  2. `outcome-bus.jsonl` (shared fleet tap) — matched the EXACT live 10-key shape
     `{ts,source,session_id,slot,domain,tool,success,previously_failed,hint,task}`.
- **CONSUME (inbound):** `recommendFromExperience(experiences)` — the domain-local meta-learning loop (mirrors
  india's MetaLearningOptimizer): per-course success rate over history → re-run focus (lowest success first);
  a stable single-signature all-fail course = `knownDefect` (deprioritized — needs a FIX not more runs).
- Wired into `scripts/cad-fusion-run-course.mjs`: `--run` emits after each run (best-effort, non-fatal —
  R12: a learning-emit failure never fails the course run); `--learn-status` runs the recommender.

## Live-verified (read from ledger, NOT claimed)
`--run`: ran 9, proven 9, model-verified 8 → `↪ learning signal → fleet: 18 records (8+/1− labeled, 89%
verified)`. `cad-course-experience.jsonl` in main tree = 9 records, pos=8 neg=1. `--learn-status`: "8 verified
/ 1 unverified (89%) · both classes: true · re-run focus: C3D_EXTRUDE_RECT_PATTERN" (the dup defect — both
classes present = healthy training signal; the negative is the hard example the trainer learns the boundary from).

## SCHEMA-HONESTY lesson (R8/R7 applied to schemas — caught pre-ship by the test)
First cut INVENTED `{kind:"engine_outcome",payload:{engineId,ok}}` for outcome-bus + a labeled shape for
psn-training-signal — BOTH wrong: the live shapes are an auto-tap (10 keys incl. `previously_failed`) and a
git-log scoped_commit feed. Writing invented shapes into a shared MULTI-WRITER ledger pollutes it + breaks
consumers. Fix: match the exact live keyset (probed 300 records to confirm `previously_failed`); put the rich
labeled shape in delta's OWN sole-writer ledger. Lesson: before writing to ANY shared ledger, read its real
record shape over a sample — never assume the schema. Pairs with [[reference_delta_course_system_and_channel_verify_2026_05_31]].

## NEXT (for india / the trainer side)
A TS consumer in india's process tails `cad-course-experience.jsonl` → `MasterAITrainingLedger.ingest()` or a
CAD-LoRA dataset builder. delta supplies the signal continuously; india trains + (gated) promotes. The 8 UI-only
drawing ops remain the autonomy ceiling (separate finding, same session).
