---
name: reference_whiskey_lathe_lora_tier_complete_2026_05_30
description: LATHE-LORA-MS0 self-improving-AI composition tier — all 8 engines shipped on slot/whiskey (2026-05-30)
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.260Z
aliases: reference_whiskey_lathe_lora_tier_complete_2026_05_30
---


# LATHE-LORA-MS0 — 8-engine self-improving-AI tier COMPLETE (slot:whiskey, 2026-05-30)

Whiskey (lathe galaxy) built the lathe domain's own self-improving AI as the composition/feedback tier over india's shared substrate — per the fleet rule [[feedback_domains_own_ai_training_systems]] (each domain owns its AI, cloned from india's ai-training; india owns GPU compute). Plan: `state/shared/specs/LATHE-SELFIMPROVE-AI-PLAN.md`.

**Key architecture decision (india-substrate finding [[reference_whiskey_india_ai_substrate_2026_05_29]]):** lathe is ALREADY a first-class `process` in `crossProcessOutcomeStore` (∈ OUTCOME_PROCESSES) + `CrossProcessNeuralLearningEngine`. So the tier WIRES TO india's loop — it does NOT build a parallel bus/ledger/auto-train. The 8 engines are the domain composition tier (produce signal + compose inference); the loop is shared-singleton calls.

**8 engines/units (all on `prism_turning`, 11 new actions; #5 also dual-wired `prism_safety`):**
- #2 U-LLR-LEDGER `5a25e98018` — LatheLoRAExperienceLedgerEngine (thin facade over crossProcessOutcomeStore process:lathe + reward fn)
- #1 U-LLR-EXTRACT `65b89e693e` — LatheLoRAKnowledgeExtractorEngine (outcomes+corpus+tribal → SFT records)
- #3 U-LLR-CONTEXT `9d7e02b4c3` — LatheLoRASemanticContextEngine (RAG over retrieveSimilar)
- #4 U-LLR-FUSION `3a9af41a78` — LatheLoRAKnowledgeFusionEngine (confidence-weighted fuse + R7 conflict-surfacing + Kienzle/Taylor anchor, CANONICAL_* imported never inlined)
- #5 U-LLR-UNCERTAINTY `438b97ba43` — LatheLoRAUncertaintyQuantifierEngine (calibration gate auto/review/reject; renormalised uncertainty over present signals; non-softenable S(x) bands 0.70/0.90 + hazard reject; dual-wired prism_safety:lathe_lora_calibration_gate)
- #6 U-LLR-SELECT `ab1617f193` — WIRING: exposed existing LatheLoRAModelSelectorEngine runtime (select/register/record_outcome/release); only getStats was reachable before
- #7 U-LLR-ENSEMBLE `30f1c0c856` — WIRING: exposed existing LatheLoRAEnsembleVoterEngine runtime (vote+hasConsensus / getHistory)
- #8 U-LLR-META `324c5f013c` — LatheLoRAMetaAdaptationEngine (promotion gate: deploy-ready absolute gate mirroring nn-graph gradeMetrics AUROC≥0.78/macroF1≥0.55/Brier≤0.15 + measured-lift-over-incumbent; verdict promote|hold|reject)

**Lessons reinforced:** R8 read-before-write caught that #6/#7's "engines" already existed (only `getStats` wired) → made them WIRING units not rebuilds (duplication-guard). #4 physics anchor imports CANONICAL_KIENZLE/CANONICAL_TAYLOR (never inline). #5/#8 gate thresholds are named policy constants (S(x) bands cite physics/CLAUDE.md; nn-graph gates cite scripts/lib/nn-graph-eval.mjs with keep-in-sync comment) — not physics material constants.

**Process:** every file got per-file 2-reviewer scrutiny PASS (0 P0/P1) + tsc --noEmit clean + vitest before the next; milestone-close 3-of-3 PASS recorded (session 57dfea65). 90 tier tests.

**P2 DEFERRED follow-up (open):** route #2 `computeReward` through the richer existing `LatheLoRARewardShapingEngine.calculateReward` (structured RewardComponent[]/RewardResult) in a future unit — the current scalar [0,1] reward is an intentional self-contained store-labeling signal, but the loop could use the shaper's structured analysis. Flagged by 3-of-3 arm A.
