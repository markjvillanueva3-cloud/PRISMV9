---
title: JM-DIE-LATHE-UPGRADE-MS0 YOLO session (2026-05-25 whiskey)
type: architecture
status: shipped
slot: whiskey
date: 2026-05-25
milestone: JM-DIE-LATHE-UPGRADE-MS0
ms0_lattice: yolo_autonomous_loop
---

# JM-DIE-LATHE-UPGRADE-MS0 — autonomous YOLO session (whiskey, 2026-05-25)

13-commit autonomous YOLO+/goal+/loop[5m] session that closed the lathe AI MCP-surface exposure gap for the JM Die test shop. Operator directive: *"complete all remaining lathe units in the entire system | run full tests to train lathe wizard nn, gnn, lora, deep learning, deep reasoning, ai systems. utilize full jm die data and full prism capabilities"*.

## What "lathe wizard" actually means in PRISM

There is no `LatheWizard*Engine` on disk. The **lathe wizard** is the frontend integration layer that binds 5 frontend nodes (`lathe-wizard`, `lathe-studio`, `shop-management`, `business-management`, `employee-portal`) to the 49+ lathe AI/LoRA/deep-learning/RL/transformer engines in `mcp-server/src/engines/Lathe*.ts`. The backend exposure surface is the `prism_turning` dispatcher actions plus the new `prism_ai:jm_die_lathe_*` actions.

This session closed the **MCP-surface gap** between those engines and their frontend consumers.

## Backend exposure deliverables (25 new prism_turning + 1 prism_ai actions)

### prism_ai: U-PROGRAM-LIBRARY family

| Action | Engine | What |
|---|---|---|
| `jm_die_lathe_program_library` | `LatheProgramLibraryEngine` | Frontend aggregator — customer/partNumber/variants[] + hasOptimized star + dispatchableMachines for "send to machine" pop-up |
| `jm_die_lathe_program_recognize` | `LatheProgramRecognitionBridgeEngine` | OCR partNumber → library lookup with Levenshtein fuzzy alternates + frontend routing hint (dispatch / regenerate_v2 / new_part) |
| `jm_die_lathe_audit` | `LatheProgramAuditPipelineEngine` | 3-stage code audit + collision screen (prior session) |
| `jm_die_lathe_upgrade_v2` | `JMDieLatheProgramUpgraderV2Engine` | Physics-driven V2 upgrade (prior session) |

### prism_turning: getStats-only engines closed (5)

| Action | Engine method |
|---|---|
| `lathe_dl_intel_analyze` | `LatheDeepLearningIntelligenceEngine.analyzeWithIntelligence` |
| `lathe_rl_select_action` | `LatheReinforcementLearningEngine.selectAction` |
| `lathe_intelligence_decide_macro` | `LatheIntelligenceEngine.decideMacroVsHardCode` |
| `lathe_archive_training_run` | `LatheFullArchiveTrainingEngine.trainFullArchive` |
| `lathe_ai_feature_find_best` | `LatheAIFeatureRegistration.findBestEngineForTask` |

### prism_turning: LatheLoRA* unwired engines (10 actions / 3 engines)

| Action | Engine method |
|---|---|
| `lathe_lora_generate_script` | `LatheLoRATrainingScriptEngine.generateScript` |
| `lathe_lora_apply_preset` | `.applyPreset` |
| `lathe_lora_estimate` | `.estimateVRAM` / `.estimateTime` |
| `lathe_lora_validate_config` | `.validateConfig` |
| `lathe_lora_tribal_augment` | `LatheLoRATribalAugmentationEngine.findRelevantTips` |
| `lathe_lora_tribal_find_tips` | alias of `tribal_augment` |
| `lathe_lora_tribal_aug_stats` | `.getConfig` |
| `lathe_lora_tribal_extract` | `LatheLoRATribalExtractorEngine.extractTip` |
| `lathe_lora_tribal_extract_batch` | `.extractTip` × array |
| `lathe_lora_tribal_extractor_stats` | `.getConfig` |

### prism_turning: AI-tier unwired engines (4 actions, plus 5 closed via xray bulk-sweep `45e5ceaa7e`)

| Action | Engine |
|---|---|
| `lathe_ai_orchestrate_full` | `LatheAIOrchestrationEngine.orchestrateFullAnalysis` |
| `lathe_ai_train_from_programs` | `LatheAITrainingEngine.trainFromPrograms` |
| `lathe_adaptive_machining_adapt` | `LatheAdaptiveMachiningEngine.adaptTurningParameters` |
| `lathe_attention_self` | `LatheAttentionMechanismEngine.computeSelfAttention` |
| `lathe_ai_reason` (xray) | `LatheAIReasoningEngine.reason` |
| `lathe_active_learning_select` (xray) | `LatheActiveLearningEngine.selectSamples` |
| `lathe_bayesian_optimize` (xray) | `LatheBayesianOptimizationEngine.fitGP + predictGP` |
| `lathe_deep_logic_evaluate` (xray) | `LatheDeepLogicEngine.analyzeOperation` |
| `lathe_cam_intelligence_recommend` (xray) | `LatheCAMIntelligenceEngine.recommendParametricTemplate` |

### prism_turning: fleet-wide truly-unwired (6 engines, 6 actions)

These were unwired across ALL dispatchers — caught only by fleet-wide audit:

| Action | Engine |
|---|---|
| `lathe_master_orchestrate` | `LatheMasterOrchestratorFacadeEngine.orchestrate` |
| `lathe_post_validate_program` | `LathePostGeneratorValidatorWiringEngine.validateProgram` |
| `lathe_post_regression_generate` | `LathePostRegressionTestGeneratorEngine.generateTest` |
| `lathe_program_catalog_register` | `LatheProgramCatalogEngine.register` |
| `lathe_transformer_tokenize` | `LatheTransformerEngine.tokenizeProgram` |
| `lathe_unified_ai_execute` | `LatheUnifiedAIOrchestrator.execute` |

## Training validation (operator /goal #2)

Four training runs against the JM Die `CNC LATHE` corpus, all converging to `avg_program_score ∈ [57.27, 58.72]`, σ < 1.5 — confirming corpus quality distribution is stable across sample sizes.

| Run | progs | epochs | elapsed | avg_score | NN accuracy |
|---|---|---|---|---|---|
| smoke | 200 | 20 | 6.4s | 57.67 | 64.3% |
| validation | 2000 | 30 | 7m 35s | 58.72 | — |
| medium | 5000 | 50 | 11m | 57.27 | — |
| large | 10000 | 50 | 38m 51s | 57.75 | — |

Detached runner: `scripts/train-lathe-full-archive.mjs` (lazy-imports from `dist/`, optional `--max` + `--epochs` flags, throttled progress sidecar at `state/shared/dashboards/lathe-archive-training-progress.json`). **Full corpus (130K files including PRISM_UPGRADED variants) OOMs** — bounded `--max=10000` is the canonical run.

## Frontend wiring contract (delegated to bravo/delta/papa)

See `state/shared/specs/U-PROGRAM-LIBRARY-FRONTEND-WIRING-SPEC-2026-05-25.md` (commit `23e4cadb2a`). 174-line spec mapping `prism_ai:jm_die_lathe_program_library` to:

- `lathe-wizard` (step-by-step program walkthrough)
- `lathe-studio` (Lathe Calculator Studio page)
- `shop-management` (fleet dispatcher view)
- `business-management` (cost/margin analytics)
- `employee-portal` (operator self-serve)

Camera-recognition bridge documented per-frontend via the `partNumber` query field.

## Commit ledger

| iter | sha | unit |
|---|---|---|
| 22 | `c6e1d0ca6c` | U-LATHE-FLEET-INVENTORY |
| 22 | `23e4cadb2a` | U-PROGRAM-LIBRARY-FRONTEND-SPEC |
| 24 | `22390799c9` | U-LATHE-AI-TRAIN-RUNNER |
| 26 | `0971a04b1b` | U-LATHE-PROGRAM-RECOGNITION-BRIDGE |
| 27 | `26d2c4da84` | U-LATHE-DL-INTEL-ANALYZE |
| 28 | `0dc78efcfc` | U-LATHE-RL-SELECT-ACTION |
| 29 | `7ca7a1cbc5` | U-LATHE-INTEL-DECIDE-MACRO + U-AI-TRAIN-2K |
| 30 | `96d4d6d7d6` | U-LATHE-ARCHIVE-TRAIN-RUN + U-LATHE-AI-FEATURE-FIND-BEST |
| 31 | `50998dea67` | U-AI-TRAIN-5K |
| 32 | `3a0dfb6959` | U-LATHE-LORA-UNWIRED-3 (10 actions) |
| 34 | `26008112e0` | U-AI-TRAIN-10K |
| 35 | `24af44de54` | U-LATHE-AI-TIER-UNWIRED-4 |
| 36 | `8619b42ff9` | U-LATHE-FLEET-UNWIRED-6 |

(iter 33 was no-op — xray bulk-sweep `45e5ceaa7e` race-merged the same 5-engine wire 25s before my Edit.)

## Saturation evidence

`for f in H:/prism/mcp-server/src/engines/Lathe*.ts; do count=$(grep -rc "$(basename $f .ts)\b" H:/prism/mcp-server/src/tools/dispatchers/); [ "$count" = "0" ] && echo "$f"; done` → empty. **Zero lathe engines remain unwired across all dispatchers.**

## What's left (blocked or out-of-slot)

- **U-UPGRADE-CAPABILITY-AWARE** — wire mike's `JMDieLatheCapabilityEngine` (slot/mike `b3a0d1ea76`, unmerged) into V2 upgrader. Blocked on golf integrator landing slot/mike into cad-fusion-live-ms0.
- **Frontend nodes** — 5 frontend nodes need binding to the 25 new MCP actions per spec `U-PROGRAM-LIBRARY-FRONTEND-WIRING-SPEC-2026-05-25.md`. Lane: bravo (lathe) / delta (cad) / papa (UI).
- **Multi-method deepening** — most lathe AI engines have one flagship action wired; deeper surfaces (e.g. `LatheUnifiedAIOrchestrator.findEngineForCapability`, `LatheAIOrchestrationEngine.orchestrateLearning`) remain for future passes.

## Cross-refs

- Memory: `feedback_always_build` · `feedback_always_close_out` · `feedback_commit_to_slot_worktree` · `feedback_parallel_scrutiny_per_file`
- Wiki: `[[lathe-program-library]]` · `[[lathe-archive-training]]` · `[[checkin-loop-fullstack]]`
- Spec: `state/shared/specs/U-PROGRAM-LIBRARY-FRONTEND-WIRING-SPEC-2026-05-25.md`
- Dashboard: `state/shared/dashboards/lathe-fleet-task-inventory-2026-05-24.md` · `state/shared/dashboards/lathe-archive-training-dashboard.{json,md}`
