---
name: reference_delta_cad_traintest_readiness_2026_06_27
description: "Delta/CAD train+test+print-gen readiness recon (slot:delta, 2026-06-27). KEY NEW FACT: Hermes/octopus is LIVE again (OAuth restored) — it was DARK for the prior 4 runs of the 'utilize hermes + train CAD model' goal, so do NOT re-run that goal blind a 5th time; the orchestration half is dedup-don't-rebuild. The plan already exists (CAD-COMPLETION-ROADMAP-2026-06-26). The goal is gated by 3 OPERATOR decisions, not missing code: (D0) training-target ambiguity OCR-dim-LoRA vs print->geometry; (2) Fusion add-in manual activation; (3) operator_verified eval split. GPU is GREEN/liftable today."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.544Z
aliases: reference_delta_cad_traintest_readiness_2026_06_27
---


# Delta/CAD train+test+print-gen readiness (2026-06-27, slot:delta, session claude-f52932d6)

Operator `/checkin-delta /goal` (5th instance of the "utilize hermes/octopus + finally train+test cad
model + print generation; Fusion up for live testing" goal). Recon via a 4-agent ultracode Workflow
(`wf_87ab2c05-15a`, 806K subagent tok) + a live 5-lens Hermes octopus ($0) + on-disk verification.
Deliverable: `state/shared/specs/DELTA-CAD-TRAIN-TEST-READINESS-2026-06-27.md` (commit `ad1bd4b34d`).

## THE decisive new fact (R12) — Hermes/octopus is LIVE again
The orchestration half of this goal failed the prior 4 runs (6/24, 6/25×2, 6/26) because the proxy was
DARK (dead xAI OAuth). This session: `hermes_status` up+authenticated:true, live `hermes_ask` round-trip OK,
9/9 `PRISM Hermes *` tasks Ready, graph-improve ledger regenerated TODAY, driver dry-run planned a real
2-agent fan-out. **The orchestration is DEDUP — already fully built, just was dark; now executable.** Do
NOT rebuild grok-capability-rank / MultiModelConsensusEngine / OpusFastMaxAgentSpec / GraphImprovementFanout
/ the 9 crons. Do NOT re-run this goal blind again — the blocker was never code. (Stale SessionStart
"Hermes HUNG" banner is a 3-min cache; the live probe is authoritative.) See [[reference_hermes_proxy_aiohttp_dark_root_cause_2026_06_26]].

## The plan already exists — do not author a duplicate
`CAD-COMPLETION-ROADMAP-2026-06-26.md` (authored yesterday for this exact goal) is the comprehensive
units plan. This session ADDED a reconcile/decision brief, not a new plan (R8 dedup).

## The 3 HARD BLOCKERS are all operator (not missing code)
1. **D0 — training-target ambiguity (R7, the #1 decision):** "train the CAD model" = (A) blueprint-OCR
   dimension LoRA (Qwen2.5-VL-7B; the live gate T1; corpus = **594 rows, 52 short of 646**, all pseudo-
   labeled) vs (B) print→CAD-geometry generation (**ZERO labeled corpus**; needs GROUND-TRUTH corpus run +
   TRAINING-EXTRACT 12 units + likely a new geometry trainer). Different products. Operator must pick.
2. **Fusion add-in manual activation:** bridge is fully built (`Fusion360LiveBridgeEngine` 1671L, 17 routes,
   `:18360`, dispatcher-wired `f360_live_*`, 1163 `.f3d` test parts) but the add-in is `runOnStartup:false`
   → must be manually Run in Fusion's UI each session. No automation path. Units cm / inch ×2.54 (not 25.4).
   `:18365` is the separate read-only nav add-in, NOT CAD-gen.
3. **operator_verified eval split:** T1 deploy gate Brier ≤0.15 needs a human-verified split that does NOT
   exist; trainer self-stamps `eval_gate_satisfied:false`. Do not promote an adapter on pseudo-label Brier.

## What IS green / autonomously runnable today
GPU Blackwell GREEN (`gpu_health → qlora_ready:true`, torch 2.11.0+cu128 sm_120, verified 6/06; the 6/04
"torch broken" note is STALE). T1 trainer (`blueprint_vl_train_lora.py` + `blueprint-vl-train-runner.mjs`)
needs only: 4 pip deps (`trl qwen-vl-utils pillow pymupdf`) in the GPU venv + a staged bundle
(`state/shared/lora/local-lora/*.jsonl` via `BlueprintLoRABridgeEngine`). NO dry-run flag. T2 harness
(`CADDrawAnyPartValidationHarnessEngine`, `cadDispatcher: cad_draw_any_part_validate`) built+wired, binary
v1 rubric (dim-pass-rate scoring deferred = `U-VALIDATION-50-SCORING`). print→regen proven 0.00% dim on blisk.

## Envelope drift (class-grep + 3/6 spot-verified): CAD-GROUND-TRUTH-MS0 envelope says 4/10 but all 10
engines exist on disk (DimensionalSignature/GroundTruthBatchExtractor/GroundTruthRegistry confirmed) —
CODE-complete; BUT the corpus production RUN was never executed (trilobe labeled set = 0 rows). "Code done"
≠ "corpus produced." Demote stale in_progress claims U-DASAL09/10 + U-CTE10.

## Did NOT (R12): launch T1 blind (target ambiguous + can't clear deploy gate); install GPU-venv deps
(5 active slots = not fleet-quiet, india's shared venv, reap-risk); flip GROUND-TRUTH envelope (would
mislead the training-data question). All documented for an operator-confirmed / quiet-window run.

Related: [[reference_delta_cad_completion_roadmap_2026_06_26]] · [[reference_blackwell_gpu_training_ready_2026_06_06]] · [[reference_octopus_hermes_agents_2026_06_25]] · [[reference_pa3_hermes_cad_builder_2026_06_26]]
