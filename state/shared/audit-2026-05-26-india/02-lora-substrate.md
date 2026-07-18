# LoRA Training Substrate Audit — slot india (2026-05-26)

Auditor: india | Scope: PRISM LoRA pipeline (lathe / mill / wire-EDM / mill-turn / 5-axis / cam / cad / laser / waterjet / grinding / blueprint / continual)

## TL;DR (Karpathy R12 — fail loud)

**The LoRA dispatcher surface is massive (~245 actions across 8 dispatchers) but the runtime is empty.** Per-domain cadence/drift/deployment/ensemble actions exist as code paths, but on-disk state shows ZERO promoted-active adapters, ZERO completed training runs, ZERO drift evaluations beyond a single 2026-04-21 Bayesian-on-15-sample baseline. The 3766-tuple MASTER LoRA training set (CAM-AI-TRAINING-MS0, shipped slot:kilo 5/26) is the only real corpus; it has NO consumer wired to feed an actual fine-tune. **Article-incorporation opportunity is enormous** — Layer-4 dreaming maps directly to the dormant `lathe_lora_cadence_should_trigger` + `_active_version` lifecycle.

---

## 1. LoRA dispatcher inventory (action counts per dispatcher)

Grep of `lora_` / `lora-` patterns across `mcp-server/src/tools/dispatchers/*.ts`:

| Dispatcher | LoRA actions (case occurrences) | Notes |
|---|---:|---|
| `turningDispatcher` (`prism_turning`) | **71** | Densest surface. `lathe_lora_*` covers cadence, drift, deployment, embedding-cache, ensemble, experiment, hyperparam, knowledge-graph, master-orch, model-selector, monitoring, resource-manager, verification + adaptive-refinement + attention-analyzer + voter + combiner + benchmark + continual-buffer. Plus `lathe_lora_tribal_*` augmenter (extract, find-tips, aug-stats, extractor-stats, extract-batch). |
| `millDispatcher` (`prism_mill`) | **136 line-hits / ~80 distinct actions** | Full mirror of lathe: `mill_lora_cadence_{state,config,active_version,active_versions_all_axes,should_trigger,...}`, `mill_lora_pool_{set,allocate,release,reserve}`, `mill_lora_emb_{set,get_exact,find_similar,best_match,list_by_tag}`, `mill_lora_deploy_{create,begin,activate,advance_canary,rollback,update_health,history}`, `mill_lora_exp_{create,log_metric,find_best,find_best_per_axis,compare}`, `mill_lora_ens_{combine,history,stats}`, `mill_lora_mon_{record,health,active_alerts,ack_alert}`, `mill_lora_orch_{init,init_mill_stack,register_subsystem,transition,events,health_check,shutdown}`, `mill_lora_sel_{register_model,record_outcome,select,release,find_by_axis}`, `mill_lora_eorch_*`, `mill_lora_tribe_*` (extract/find/stats), `mill_lora_aug_*` (tips/rules/check/augment/search). Plus `mill_5axis_lora_*` + `millturn_lora_{predict,train,optimize}` + `milling_lora_{predict,train,optimize}`. |
| `camDispatcher` (`prism_cam`) | **17** | `cam_lora_{predict,apply_delta,validate,check_health,list,select,ensemble,standardize}`, `cam_ml_{train_lora,predict_lora}`, `cam_feedback_lora_training_export`, plus `lathe_lora_{generate_script,apply_preset,estimate,validate_config,get_config,master_initialize,master_register_subsystem,master_transition,master_health,master_summary}` (lathe LoRA also wired through CAM dispatcher), and `cam_lora_adapter_status`. |
| `edmDispatcher` (`prism_edm`) | **9** | `wedm_lora_{create,set_scale,forward}`, `laser_lora_{config,state,record}`, `waterjet_lora_{config,state,record}`, plus dataset schemas. |
| `aiReasoningDispatcher` | **8** | `lora_drift_{record,active,should_retrain,check_all_clear,reset,buffer_size,get_config,set_config}` — the **global drift coordinator** sitting in front of all per-domain LoRAs. |
| `shopPracticeDispatcher` | **6** | `lathe_lora_tribal_{augment,find_tips,aug_stats,extract,extract_batch,extractor_stats}` (mirror of turning surface). |
| `dataDispatcher` | **4** | `grinding_lora_cadence_{config,state,record}` + dataset schema. |
| `cadDispatcher` | **2** | `blueprint_lora_{export,history,prepare_set,register_endpoint}` (4 actions, 2 grep-hits). |
| Plus `prism_quoting` | **0** | No `lora_` actions — quoting consumes outcomes but does not train. |

**Estimated total distinct LoRA actions: ~245** (raw grep 247 lines, includes some duplicate case statements).

Per-domain milestone files: `mcp-server/data/milestones/LATHE-LORA-MS0.json` (50 units, 23 completed, status `in_progress`, 19 sessions in) + `S-LORA-DOMAIN-STACK-MS0.json`.

---

## 2. LoRA lifecycle state — what's actually flowing

| Stage | Code-side | Disk-side | Verdict |
|---|---|---|---|
| Dataset emission | `CAMFeedbackLoopEngine.loraTrainingExport()` documented `docs/cam-ai/lora-training.md` (weights: correction=1.0, confirmation=0.5) | `mcp-server/data/test-lathe-lora/{train,val,test}.json` (5.5K + 690B + 1.4K — tiny smoke set, mostly G71 boilerplate, confidence 0.75, **EMPTY tribal_tips_applied**); `mcp-server/data/wedm-lora-smoke-out/wedm_lora_{train,test,val}.jsonl` (4.5K train, 1.7K test, **0-byte val**) | Smoke-only — neither dataset has volume to fine-tune anything. |
| MASTER training set | CAM-AI-TRAINING-MS0 closeout, slot kilo 5/26 (`reference_cam_ai_training_ms0_5system_2026_05_26.md`) | 3766 LoRA tuples, 8 tracks, real-data provenance, stratified 3206/560 split | **The one real corpus.** But ZERO consumer wired — no train.mjs reads `cam-master-split-summary.json`. |
| Cadence orchestrator | `lathe_lora_cadence_state` + `should_trigger` + `cron_schedule_summary` + `pipeline_estimated_duration` + `active_version` + `active_versions_all_axes` (mill mirror) | NO `lora-cadence-*.json` under `mcp-server/data/state/` or `state/shared/`. NO loop-state files referencing lora-cadence retrain runs. | Engine APIs return defaults; no scheduled task fires retrain. |
| Drift coordinator | `aiReasoningDispatcher.lora_drift_check_all_clear` (line 2922), 8 drift actions total | Closest evidence: `CAM_ML_DRIFT_LOG.jsonl` — **single line, 2026-04-21**, 15-sample Bayesian eval, MAE 154.3 RPM, `n_alerts:0`, summary `worst_alert_level:"ok"`. No `lora_drift_*.jsonl` per-domain logs. | Drift coordinator returns "all clear" because no data is being recorded against it. Vacuously clear ≠ actually clear. **R12 fail-loud.** |
| Deployment lifecycle | `mill_lora_deploy_{register_target,create,begin,activate,advance_canary,update_health,update_mill_signals,rollback,active,active_by_axis,history,stats}` | NO deployment-history JSON. NO active-version registry. `WEDM_LORA_CHECKPOINT.json` — adapter `wedm-lora-v1`, `status: "not_trained"`, `samples: 0`, `deployed: false`, `inferenceCount: 0`, `lastTraining: null`. | Shadow/canary/active state machine exists but no LoRA has ever entered it. |
| Embedding cache | `mill_lora_emb_*` (8 actions) + `lathe_lora_embedding_cache_stats` | No `*-lora-embedding-cache*.json` on disk. | Empty store. |
| Ensemble + Voter + Combiner | `mill_lora_ens_*` + `lathe_lora_voter_stats` + `lathe_lora_combiner_stats` | No `lora-ensemble-*.json`. | No ensembles registered. |
| Experiment + Benchmark + Monitoring | `mill_lora_exp_*` (compare/find_best) + `lathe_lora_{experiment,benchmark,monitoring}_stats` | No `lora-experiment-*.json`, no `lora-benchmark-*.json`. | No tracked experiments. |
| Tribal augmenter | `mill_lora_aug_{tips,rules,find_relevant,check_rules,augment,search_tips,tips_by_material,tips_by_operation,stats}` | Tribal corpus exists (3,919 tips) but `lathe_lora_tribal_extractor_stats` shows zero extracted-to-LoRA edges. | Augmenter has data on the input side; never invoked. |
| Master orchestrator | `lathe_lora_master_orch_stats` + `mill_lora_orch_{init,init_mill_stack,events,health_check,shutdown}` | No orchestrator event log. | Never started. |

**Layer-2 summary:** the substrate is the most over-built dormant capability in PRISM. Heavy architecture, zero rotational mass.

---

## 3. Promotion gate — has any LoRA gone active?

**No.** Concrete evidence:
- `mill_lora_cadence_active_versions_all_axes` — no axis registry on disk → returns empty.
- `mill_lora_deploy_active` / `active_by_axis` → no `lora-deployment-*.json` records → empty.
- `WEDM_LORA_CHECKPOINT.json` → `status: "not_trained"`, `deployment.deployed: false`.
- `LATHE-LORA-MS0.json` → milestone `in_progress`, 23/50 units done, but no shipped LoRA artifact (`artifacts.adapterPath: null` analog).
- `LATHE_AI_TRAINING_REPORT.json` (2026-04-15, schema 1.0.0) — 16,558 programs *parsed* + scored (avg 80.4) — but this is the **dataset prep** report, not a LoRA train output. No `train_loss`, no `val_loss`, no `adapter_path`.

The shadow → canary → active state machine is exhaustively coded across mill + lathe and has never received its first transition. The deployment registry is a Schrödinger artifact.

---

## 4. Article incorporation candidates (Layer-4 dreaming + CAG static-cache → LoRA pipelines)

dunik_7's article frames "Layer 4 = consolidator that runs while you sleep, materializes Layer-1/2/3 into a NEW file with a review gate." This maps DIRECTLY onto the PRISM LoRA cadence — but PRISM's cadence is documented-not-wired. The 4 highest-leverage units to file in india queue:

### U-LORA-CONSOLIDATOR-01 — `mill-lora-nightly-consolidator.mjs` (Layer-4 dreamer)
**Map:** dunik_7 Layer-4 sleep-consolidator → `mill_lora_cadence_should_trigger` already exists as the gate. Build the scheduled-task body that (a) reads `cam-master-split-summary.json` + new feedback since last run, (b) runs LoRA train against base model via Ollama or python sidecar, (c) writes adapter → `mcp-server/data/state/lora-deployments/<axis>/shadow-<utc>.json` (NEW file, never overwrites), (d) calls `mill_lora_deploy_create` shadow tier, (e) flips `mill_lora_cadence_active_version` only if review-gate green. Cron: `PRISM Mill LoRA Consolidator`, 02:00 + 14:00 with +330s phase offset.
**Files touched:** `scripts/mill-lora-nightly-consolidator.mjs` (NEW) + register scheduled task + emit `lora-deployments/*.json` (NEW path).
**Review gate:** scrutiny-3way ledger entry per promotion; lathe-LoRA precedent in `LATHE-LORA-MS0.json` gate model.
**Lift:** wires the 80% of the substrate that's currently dormant.

### U-LORA-CONSOLIDATOR-02 — `wedm-lora-trainer-wire.mjs`
**Map:** dunik_7 "review-gated promotion" → fix the R12 violation that `WEDM_LORA_CHECKPOINT.json` has been `status:not_trained, samples:0` since schema-v1. Build the script that reads `WEDM_OUTCOME_LEDGER.jsonl` (declared in checkpoint), trains the adapter, writes ONLY to a NEW shadow path `mcp-server/data/state/wedm-lora-deployments/shadow-<utc>.json`, never overwrites the active checkpoint. Promotion via `wedm_lora_set_scale` after review.
**Lift:** turns a 736-byte placeholder into a real LoRA — the W1 surface CLAUDE.md §WEDM-AGI section advertises as "62 engines / 101 tests / 23 skills".

### U-LORA-CONSOLIDATOR-03 — `lora-drift-monitor-real.mjs` (close the R12 vacuous-clear gap)
**Map:** dunik_7 "static cache + review gate" → `lora_drift_check_all_clear` returns "clear" today only because nothing writes to the drift log. Wire `CAMFeedbackLoopEngine.recordOutcome` to ALSO emit a `lora_drift_record` per (task, decisionId) so the coordinator has signal. Then schedule a daily evaluator (`lora-drift-evaluator-daily.ps1`) that uses `lora_drift_should_retrain` to gate U-LORA-CONSOLIDATOR-01 firing. Mann-Kendall on the rolling window per `docs/cam-ai/lora-training.md §Drift telemetry`.
**Lift:** stops `check_all_clear` from being a lie. Karpathy R12.

### U-LORA-CONSOLIDATOR-04 — `lora-master-corpus-trainer.mjs` (close the CAM-AI-TRAINING orphan)
**Map:** CAM-AI-TRAINING-MS0 shipped 3766 stratified tuples 2026-05-26; no consumer wired. dunik_7 CAG-static-cache maps to "the corpus is the cache; LoRA adapter is the materialization." Build the script that reads `cam-master-split-summary.json`, trains 8 per-track LoRAs (template / physics / param / cross-system / iso286 / surface / coolant / operator-gate), writes adapter set to NEW directory `mcp-server/data/state/cam-master-lora/<track>/v1/`. Per-track holdout AUROC/MAPE evaluated against the 560-holdout split before any track LoRA promotes.
**Lift:** unlocks the only real LoRA corpus PRISM owns.

All four units share the same shape: NEW-file emission + review-gate before promotion. None overwrite an existing artifact. All composable with the cron-bootstrap + scheduled-task infrastructure already shipped by `S4U` (NN-GRAPH-MS2/U2).

---

## Evidence appendix

- `mcp-server/data/docs/DISPATCHER_DIGEST.md` — 104 dispatchers, 13,335 total actions (header).
- `mcp-server/src/tools/dispatchers/turningDispatcher.ts:127` — `lathe_lora_cadence_should_trigger` declared.
- `mcp-server/src/tools/dispatchers/millDispatcher.ts:484` — `mill_lora_cadence_active_versions_all_axes`.
- `mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts:2922` — `lora_drift_check_all_clear` switch case.
- `mcp-server/src/schemas/aiReasoningActionSchemas.ts:512` — `LoRADriftCoordinatorEngine.checkAllClear`.
- `mcp-server/data/state/CAM_ML_DRIFT_LOG.jsonl` — sole drift evaluation, 2026-04-21.
- `mcp-server/data/state/WEDM_LORA_CHECKPOINT.json` — `not_trained, samples:0, deployed:false`.
- `mcp-server/data/test-lathe-lora/{train,val,test}.json` — smoke fixtures.
- `mcp-server/data/wedm-lora-smoke-out/wedm_lora_val.jsonl` — **0 bytes**.
- `mcp-server/data/milestones/LATHE-LORA-MS0.json` — 50 units, 23 complete, status `in_progress`.
- `knowledge/memories/reference/reference_cam_ai_training_ms0_5system_2026_05_26.md` — MASTER corpus 3766 tuples.
- `docs/cam-ai/lora-training.md` — feedback → LoRA pair contract; weights 1.0/0.5.
