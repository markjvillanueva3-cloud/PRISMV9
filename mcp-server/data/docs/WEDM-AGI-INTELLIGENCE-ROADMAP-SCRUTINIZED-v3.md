# Wire EDM AGI-Level Intelligence Roadmap — SCRUTINIZED v3
**Date:** 2026-04-15 (Scrutinized 2026-04-16, v3 deep scrutiny)
**Scope:** Complete AGI-grade Wire EDM intelligence — perception, reasoning, learning, autonomy, explainability
**Goal:** Autonomous program generation, self-optimizing parameters, predictive maintenance, cross-domain reasoning, explainable decisions
**Depth Match:** UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN-2026-04-15.md (Phase 0.1-0.19 granularity)

---

## Scope Snapshot (CORRECTED from live inventory scan)

### Full PRISM System Context (from PRISM-INVENTORY-2026-04-15.md)
| Category | System Total | Notes |
|----------|--------------|-------|
| **Engines** | 1,869 | TypeScript engine classes |
| **Dispatchers** | 85 | MCP tool dispatchers |
| **Actions** | 2,720+ | Dispatcher actions |
| **Formulas** | 509 | Registered mathematical formulas |
| **Algorithms** | 53 | FFT, Kalman, GA, etc. |
| **Tribal Tips** | 4,493 | Shop floor knowledge |
| **Skills** | 66 | Slash command skills |
| **Scripts** | 52 | Automation scripts |
| **Hooks** | 227 | Validation/lifecycle hooks |
| **JM DIE Programs** | 36,929 | CNC program archive |
| **Materials** | 6,372 | Material database entries |
| **Tools** | 95,608 | Cutting tool database entries |
| **Machines** | 910 | Machine database entries |
| **MIT Courses** | 225 | 9 integrated, 216 pending |
| **Tests** | 1,255 | Vitest test cases |

### WEDM Subset Inventory — VERIFIED 2026-04-16
| Category | WEDM Count | % of Total | Status | Source |
|----------|------------|------------|--------|--------|
| **WEDM Engines** | 119 | 6.4% | Production-ready | `grep -l WEDM\|WireEDM engines/` |
| **WEDM Actions** | 256 | 9.4% | Production-ready | `grep wedm_ edmDispatcher.ts` |
| **WEDM Tribal Tips** | 107 | 2.4% | Production-ready | `wedm-knowledge-tips.ts` |
| **WEDM Programs (JM DIE)** | 2,500+ | 6.8% | Indexed | `H:/PRISM/JM DIE/WIRE EDM/` |
| **Controller Brands** | 6 | — | Production-ready | Mitsubishi, Fanuc, Sodick, Makino, AgieCharmilles, custom |
| **Math Models** | 10 | — | Production-ready | `WEDMNeuralTrainingEngine.ts` |
| **WEDM Skills** | 0 | 0% | **GAP** | `~/.claude/commands/wedm-*.md` |
| **WEDM Scripts** | 0 | 0% | **GAP** | `scripts/wedm-*.ts` |
| **WEDM Hooks** | 0 | 0% | **GAP** | `src/hooks/wedm-*.ts` |
| **WEDM State Files** | 0 | 0% | **GAP** | `data/state/WEDM_*.json` |
| **WEDM Playbooks** | 0 | 0% | **GAP** | `data/playbooks/wedm-*.json` |

### What Must Be Built (AGI Gap) — REVISED
| Type | Count | Location |
|------|-------|----------|
| **Skills (Phase 0.1)** | 12 | `~/.claude/commands/wedm-*.md` |
| **Scripts (Phase 0.2)** | 18 | `mcp-server/scripts/wedm-*.ts` |
| **Hooks (Phase 0.3)** | 16 | `mcp-server/src/hooks/wedm-*.ts` |
| **Playbooks (Phase 0.4)** | 8 | `data/playbooks/wedm-*.json` |
| **State Files (Phase 0.5)** | 15 | `data/state/WEDM_*.json` |
| **Indexes (Phase 0.6)** | 8 | `data/state/WEDM_*_INDEX.json` |
| **AGI Engines (Phase 1-5)** | 45 | `mcp-server/src/engines/WEDM*.ts` |
| **SVI Integration (Phase 0.10)** | 4 | Extend `SystemVariabilityIndexEngine` |
| **Local LLM (Phase 0.15)** | 6 | LoRA adapters for WEDM |
| **MIT OCW Integration (Phase 0.8)** | 5 units | Manufacturing + thermal courses |
| **AGI Proximity (Phase 0.14)** | 8 | Goal synthesis, causal, peer learning |
| **Operational Integrity (Phase 0.12)** | 10 | Bootstrap, ledgers, regression |
| **Codex Dual-Ship Hooks** | 16 | `~/.claude/hooks/lib/wedm-*.py` |
| **Total New Artifacts** | ~171 | |

### PRISM Integration Status (from inventory)
| Integration | Current | Target |
|-------------|---------|--------|
| Engines to dispatchers | ~30% | 100% wired or flagged orphan |
| Formulas to engines | ~50% | 100% with verification coverage |
| Algorithms to engines | ~40% | 100% via unified API |
| Tribal tips actively used | ~20% | 100% in abstraction hierarchy |
| MIT courses integrated | 9/225 (4%) | 100% mapped |
| Databases in Qdrant/search | ~0% | 100% |

### Coverage Targets After Full WEDM AGI Implementation
| Metric | Current | Target | Method |
|--------|---------|--------|--------|
| Ra prediction error | ±20% | ±5% | GP + Klocke calibration |
| Cycle time prediction | ±15% | ±3% | Kunieda MRR + learning |
| Wire break prediction recall | 60% | 95% | Weibull + sensor fusion |
| First-part success rate | 85% | 99% | Few-shot + transfer learning |
| New material adaptation | 5 cuts | 1-2 cuts | Prototypical networks |
| Operator explanation satisfaction | N/A | >90% | SHAP + counterfactual |
| Autonomy level | L1 (assisted) | L4 (lights-out capable) | State machine + safety |
| Ψ (Reachability) contribution | unmeasured | +3% to system Ψ | SVI integration |
| WEDM skill coverage | 0/12 | 12/12 | Phase 0.1 |
| WEDM hook coverage | 0/16 | 16/16 | Phase 0.3 |
| WEDM JM DIE programs indexed | 0% | 100% | Phase 0.9 |

---

## ⚠ CRITICAL SCRUTINY FINDINGS — READ FIRST (12 Passes)

### Pass 1 — Inventory Analysis (2026-04-16)
- **119 production engines exist, 0 skills exist** — Claude cannot orchestrate what it cannot invoke
- **256 dispatcher actions exist, 0 workflow playbooks** — no guidance on action sequencing
- **0/16 WEDM-specific hooks exist** — safety hooks exist in general but no `wedm_*` prefixed hook files
- **Neural engines have no confidence bounds** — outputs not validated against physics limits
- **JM Die profile hardcoded** — no dynamic shop profile injection
- **Inventory counts were wrong** — roadmap claimed 47 engines (actual: 119), 175 actions (actual: 256)

### Pass 2 — Architecture Gaps
- **No sensor fusion layer** — Phase 1 assumes sensors exist but no integration path
- **No digital twin state persistence** — machine state is transient, not checkpointed
- **No causal graph persistence** — cause-effect relationships computed but not stored
- **No Pareto frontier caching** — multi-objective recomputed from scratch each time
- **No transfer learning registry** — material→material scaling factors not indexed
- **No WEDM-specific awareness injection** — SessionStart doesn't inject WEDM context

### Pass 3 — Learning Infrastructure
- **No feedback loop closure** — `WEDMFeedbackCalibrationEngine` receives input but has no automated trigger
- **No drift detection** — model parameters updated but never checked for concept drift
- **No OOD detector** — novel materials processed without flagging as out-of-distribution
- **RL state space undefined** — Phase 3 mentions RL but no state/action/reward formalization
- **No local LLM fine-tuning** — JM Die programs not used for domain adaptation

### Pass 4 — Safety & Autonomy
- **No autonomy level state machine** — L0-L5 described but no transition logic
- **No collision detection mesh** — collision avoidance assumes geometry but no mesh generator
- **No predictive maintenance baseline** — component RUL requires historical baselines not collected
- **No safety envelope runtime enforcement** — constraints listed but no real-time guard
- **No S(x) safety scoring for WEDM-specific operations** — general safety but no domain binding

### Pass 5 — Explainability
- **No SHAP/LIME integration** — feature attribution mentioned but no implementation path
- **No counterfactual generator** — "what if" requires perturbation engine not present
- **No trust calibration feedback** — operator override reasons not captured
- **No explanation templating** — explanations generated ad-hoc, not consistent

### Pass 6 — Operational Integrity
- **No bootstrap for AGI stack** — Phase 1-5 engines gate on each other with no cold-start path
- **No hook ordering for AGI hooks** — 16 new hooks with undefined execution order
- **No schema versioning for state files** — 15 new state files without migration strategy
- **No perf budget for SessionStart** — AGI awareness injection could exceed latency limits
- **No regression suite for AGI engines** — neural/causal/RL outputs not tested for stability
- **No BOOTSTRAP_MODE.flag for WEDM stack** — cold start deadlocks

### Pass 7 — MIT OCW Integration (NEW)
- **No formal grounding for WEDM physics** — Klocke/Kunieda models cited but not MIT-course-backed
- **2.008 Manufacturing not ingested** — MIT manufacturing science course not leveraged
- **2.830 Control Systems not ingested** — servo control theory not formalized
- **18.06 Linear Algebra gaps** — SVD/PCA for embeddings not rigorously grounded
- **6.S191 Deep Learning not applied** — neural models lack calibration rigor

### Pass 8 — SVI Coupling (NEW)
- **WEDM work not tracked in SVI** — Ψ calculation doesn't include WEDM surface completeness
- **No SVI-ranked backlog for WEDM** — no prioritization by Ψ impact
- **No milestone gate for WEDM Ψ-delta** — can ship net-zero improvements
- **WEDM engines not in SVI watched surfaces** — drift not detected

### Pass 9 — Auto-Documentation Propagation (NEW)
- **WEDM engine count not in CLAUDE.md managed block** — stale "47 engines" claim
- **No WEDM_DIGEST.md** — no auto-generated WEDM engine inventory
- **No WEDM action tracker** — 256 actions not documented
- **WEDM tribal tips not synced to MEMORY.md** — user context missing

### Pass 10 — Plugin/Agent Activation (NEW)
- **No `/wedm-*` skills in commands manifest** — Claude can't invoke WEDM workflows
- **No WEDM-specific agent recommendations** — `SlashCommandRecommenderEngine` doesn't surface WEDM tools
- **`dispatcher-wirer` agent never used for WEDM** — manual wiring only
- **No WEDM entries in AGENT_REGISTRY** — orchestration not discoverable

### Pass 11 — AGI Proximity (NEW)
- **No autonomous goal synthesis for WEDM** — sessions don't propose WEDM improvements
- **No causal reasoning binding for WEDM** — `CausalReasoningEngine` exists but not WEDM-aware
- **No peer learning for WEDM** — cross-session WEDM insights not shared
- **No compositional synthesis for WEDM** — can't combine engines for novel solutions
- **No temporal reasoning for WEDM** — no "last month Ra was X, now Y" tracking

### Pass 12 — Local LLM Infrastructure (NEW)
- **No WEDM LoRA adapter** — JM Die programs not used for fine-tuning
- **No Ollama integration for WEDM queries** — all queries go to Claude (expensive)
- **No Qdrant vectors for WEDM programs** — 2,500+ programs not searchable locally
- **No outcome tracking for WEDM jobs** — good/scrap/adjust not logged for learning

---

## Existing Assets — LEVERAGE, DO NOT REINVENT

### Production Engines (119 total, USE these)
| Engine | LOC | Leverage For | Phase |
|--------|-----|--------------|-------|
| `WEDMNeuralTrainingEngine` | 2,436 | P3 learning — 10 models already implemented | P3-MS1 |
| `WEDMProgramNeuralAnalysisEngine` | 1,888 | P1 perception — pattern recognition | P1-MS2 |
| `WireEDMDeepAIHardeningEngine` | 1,718 | Cross-engine AI — hardening layer | P0.7 |
| `WireEDMAGIOrchestrator` | 1,011 | Orchestration — AGI coordination | P0.1 skills |
| `EDMQualityOrchestratorEngine` | 2,612 | P5 explainability — quality reasoning | P5-MS1 |
| `WEDMFeedbackCalibrationEngine` | 229 | P3 learning — Bayesian updates | P3-MS1 |
| `WireEDMKnowledgeSynthesisEngine` | 1,465 | P2 reasoning — knowledge integration | P2-MS1 |
| `EDMMaterialMachineWireEngine` | 1,753 | P2 planning — selection logic | P2-MS3 |
| `StochasticEDMEngine` | 349 | P5 uncertainty — Monte Carlo | P5-MS2 |
| `WEDMCompleteOrchestrationEngine` | 3,465 | Full pipeline — extend not replace | P0.1 |
| `WireEDMUnifiedScienceEngine` | ~950 | Physics grounding — Klocke/Kunieda | P0.8 MIT |
| `WireEDMDeepNeuralReasoningEngine` | 1,029 | Causal neural reasoning | P2-MS1 |
| `WireEDMDeepReasoningEngine` | 1,081 | Complex scenario reasoning | P2-MS1 |
| `WEDMProgramOptimizerEngine` | 1,253 | Program optimization | P2-MS2 |
| `EDMDrawingInterpretationEngine` | 886 | DXF/STEP parsing | P1-MS2 |
| `EDMStartHoleSetupEngine` | 1,349 | Start hole planning | P1-MS2 |
| `EDMFeasibilityEngine` | 938 | Accessibility checking | P1-MS2 |
| `EDMToolpathStrategyEngine` | 1,224 | Toolpath optimization | P2-MS3 |
| `EDMWireSlugCornerTaperEngine` | 961 | Tab/slug planning | P2-MS3 |
| *(100 more engines...)* | | | |

### Existing Math Models (10 total, USE these)
1. Bayesian Parameter Estimation — conjugate Gaussian
2. Gaussian Process Regression — RBF kernel
3. Neural Network — 3-layer MLP, Xavier init
4. Klocke Ra Model — `Ra = C × Ie^α × ton^β × f^γ`
5. Kunieda MRR Model — `MRR = (Ie × ton × fp) / (ρ × Ce)`
6. Taylor Wire Life — `L = C × v^(-n) × T^(-m)`
7. Weibull Wire Break — `P(break) = 1 - exp(-(t/λ)^k)`
8. Monte Carlo — simulated annealing
9. Gradient Descent — momentum-based
10. Cross-Entropy Loss — classification

### Existing Tribal Knowledge (107 tips, USE don't duplicate)
- Wire breakage prevention (23 tips)
- Surface finish optimization (18 tips)
- Thick section cutting (12 tips)
- Taper/UV coordination (15 tips)
- Flushing strategies (14 tips)
- Machine setup (11 tips)
- Safety protocols (8 tips)
- Controller-specific (6 tips)

### Cross-PRISM Assets to Leverage
| Asset | Location | WEDM Use |
|-------|----------|----------|
| `DuplicationGuardEngine` | `engines/` | All new engine checks |
| `AwarenessQueryEngine` | `engines/` | WEDM asset discovery |
| `SystemVariabilityIndexEngine` | `engines/` | SVI integration |
| `DocPropagationEngine` | `engines/` | Auto-doc for WEDM |
| `AgentRegistryEngine` | `engines/` | WEDM agent registration |
| `PRISMSelfAwarenessEngine` | `engines/` | WEDM awareness injection |
| `proper-lockfile` | npm | Transactional writes |
| `forge-triple` skill | `~/.claude/commands/` | WEDM skill creation |

---

## Phase 0 — AGI Foundation Layer (18 sub-phases)

### 0.1 — Skills Architecture (12 skills)

| Skill | Purpose | Actions Orchestrated | Line Budget | Priority |
|-------|---------|---------------------|-------------|----------|
| `/wedm-program` | Drawing → complete program | 12 actions (parse→feasibility→select→toolpath→gcode) | 400 | P0 |
| `/wedm-feasibility` | Feasibility assessment | 4 actions (parse→assess→conductivity→thickness) | 200 | P0 |
| `/wedm-cost` | Cost estimation | 5 actions (estimate_time→wire_consumption→cost→doc) | 250 | P0 |
| `/wedm-batch` | Batch programming | 6 actions (batch_analyze→optimize→pattern→schedule) | 300 | P1 |
| `/wedm-controller` | Machine/controller selection | 4 actions (select_machine→select_wire→ecode_family) | 200 | P0 |
| `/wedm-troubleshoot` | Wire break diagnosis | 5 actions (diagnose→predict_break→recovery→tips) | 300 | P0 |
| `/wedm-ai-advisor` | Neural parameter optimization | 6 actions (neural_*→optimize→calibrate) | 350 | P1 |
| `/wedm-jm-die` | JM Die shop context | Profile injection + customer patterns | 150 | P0 |
| `/wedm-studio` | Full interactive studio | wedm_studio_pipeline + advanced_analysis | 500 | P1 |
| `/wedm-learn` | Extract knowledge from PDFs/videos | Tribal tip extraction + calibration | 300 | P1 |
| `/wedm-compare` | Compare programs/parameters | Side-by-side analysis | 200 | P2 |
| `/wedm-report` | Generate production reports | Utilization + quality + cost | 250 | P2 |

**Exit Gate:** All 12 skills invokable from CLI, each executes correct action sequence. Verified via canary tests.

### 0.2 — Scripts for Diagnostics (18 scripts)

| Script | Purpose | Input | Output | Calls |
|--------|---------|-------|--------|-------|
| `wedm_geometry_diagnostic.ts` | Validate DXF/STEP geometry | file path | validation report | EDMDrawingInterpretationEngine |
| `wedm_ecode_selector.ts` | Select E-code family | material + machine | E-code recommendation | EDMMaterialMachineWireEngine |
| `wedm_param_comparison.ts` | Compare parameter sets | 2 parameter sets | diff table | WEDMProgramOptimizerEngine |
| `wedm_batch_orchestrator.ts` | Orchestrate batch jobs | job list | execution plan | WEDMSchedulingEngine |
| `wedm_wire_calculator.ts` | Wire consumption estimate | contour + passes | wire meters + cost | Kunieda model |
| `wedm_finish_troubleshoot.ts` | Surface finish diagnosis | Ra target + actual | root cause + fix | WEDMFeedbackCalibrationEngine |
| `wedm_capability_report.ts` | Controller capability matrix | controller list | capability table | EDMPostProcessGCodeEngine |
| `wedm_calibration_validator.ts` | Validate calibration data | feedback data | validity score | WEDMFeedbackCalibrationEngine |
| `wedm_setup_formatter.ts` | Format setup sheet | setup data | PDF/HTML | WEDMSetupSheetEngine |
| `wedm_similarity_scorer.ts` | Program similarity | 2 programs | similarity % | WEDMProgramNeuralAnalysisEngine |
| `wedm_utilization_report.ts` | Machine utilization | date range | utilization stats | WEDMSchedulingEngine |
| `wedm_cost_sensitivity.ts` | Cost sensitivity analysis | base cost + vars | sensitivity matrix | Monte Carlo |
| `wedm_retrofit_existing.ts` | Back-fill 119 engines into registries | — | registry sync | retrofit pattern |
| `wedm_verify_wiring.ts` | Verify all 256 actions wired | — | wiring report | dispatcher introspection |
| `wedm_index_programs.ts` | Index JM Die WEDM programs | H:/PRISM/JM DIE/WIRE EDM/ | WEDM_PROGRAM_INDEX.json | file scan |
| `wedm_train_lora.py` | Train LoRA adapter on outcomes | outcomes.jsonl | adapter checkpoint | HuggingFace PEFT |
| `wedm_embed_programs.ts` | Embed programs into Qdrant | program files | vector DB | all-MiniLM-L6-v2 |
| `wedm_sync_qdrant.ts` | Sync Qdrant between home/work | H: drive | sync report | Qdrant API |

**Exit Gate:** All 18 scripts runnable, produce valid output for test inputs.

### 0.3 — Safety Hooks (16 new hooks, dual-ship TS + Python)

| Hook | Trigger | Logic | Block Condition | Codex File |
|------|---------|-------|-----------------|------------|
| `hook_wedm_calibration_validate` | PreTool wedm_feedback_* | Validate feedback data quality | confidence < 0.5 | `enforce-wedm-calibration.py` |
| `hook_wedm_neural_sanity` | PostTool wedm_neural_* | Validate neural outputs in bounds | Ra < 0 OR Ra > 20 | `enforce-wedm-neural.py` |
| `hook_wedm_gcode_injection` | PreTool wedm_generate_gcode | Scan for injection patterns | malicious G-code detected | `enforce-wedm-gcode.py` |
| `hook_wedm_quality_audit` | PostTool wedm_override_quality | Log override to audit trail | always log, never block | `audit-wedm-quality.py` |
| `hook_wedm_workflow_monitor` | PreTool wedm_* | Track multi-action progress | workflow timeout | `monitor-wedm-workflow.py` |
| `hook_wedm_ecode_consistency` | PreTool wedm_generate_gcode | Validate E-code matches machine | mismatch detected | `enforce-wedm-ecode.py` |
| `hook_wedm_taper_limits` | PreTool wedm_solve_taper | Validate UV angle ≤ machine max | angle > machine_max | `enforce-wedm-taper.py` |
| `hook_wedm_tension_safety` | PreTool wedm_* | Wire tension in safe range | tension > 2000g OR < 500g | `enforce-wedm-tension.py` |
| `hook_wedm_batch_deps` | PreTool wedm_batch_* | Check for circular dependencies | cycle detected | `enforce-wedm-batch.py` |
| `hook_wedm_cost_confidence` | PostTool wedm_estimate_cost | Warn if confidence < 70% | warn only | `warn-wedm-cost.py` |
| `hook_wedm_schedule_conflict` | PreTool wedm_schedule | Check machine availability | double-booking | `enforce-wedm-schedule.py` |
| `hook_wedm_learning_trigger` | PostTool wedm_submit_feedback | Auto-trigger calibration | always trigger | `trigger-wedm-learning.py` |
| `hook_wedm_drift_alert` | PostTool wedm_calibration_* | Alert on concept drift | drift > threshold | `alert-wedm-drift.py` |
| `hook_wedm_ood_detector` | PreTool wedm_*_material | Flag out-of-distribution | OOD score > 0.7 | `detect-wedm-ood.py` |
| `hook_wedm_sx_safety` | PreTool wedm_* CRITICAL | S(x) safety scoring | S(x) < 0.70 | `enforce-wedm-safety.py` |
| `hook_wedm_awareness_inject` | SessionStart | Inject WEDM context if relevant | — | `inject-wedm-awareness.py` |

**Exit Gate:** All 16 hooks registered, fire on correct triggers, block/warn as specified. Both TS and Codex Python variants pass tests.

### 0.4 — Workflow Playbooks (8 playbooks)

| Playbook | Workflow | Steps | Triggers | JSON Schema Version |
|----------|----------|-------|----------|---------------------|
| `wedm_drawing_to_program.json` | Complete program generation | 12 steps | /wedm-program | v1 |
| `wedm_wire_break_diagnosis.json` | Wire break troubleshooting | 6 steps | /wedm-troubleshoot | v1 |
| `wedm_new_material_learning.json` | Adapt to new material | 8 steps | unknown material | v1 |
| `wedm_batch_optimization.json` | Batch job optimization | 5 steps | /wedm-batch | v1 |
| `wedm_quality_gate_review.json` | Quality gate override flow | 4 steps | quality gate fail | v1 |
| `wedm_parameter_tuning.json` | Neural parameter optimization | 7 steps | /wedm-ai-advisor | v1 |
| `wedm_jm_die_customer.json` | JM Die customer-specific flow | 6 steps | /wedm-jm-die + customer | v1 |
| `wedm_continuous_learning.json` | Feedback → calibration → validate | 5 steps | hook_wedm_learning_trigger | v1 |

**Exit Gate:** All 8 playbooks parse, execute in dry-run, produce expected action sequences. Schema version v1 documented with migration path.

### 0.5 — State Files & Indexes (15 files)

| File | Purpose | Schema Version | Zod Schema | Migration |
|------|---------|----------------|------------|-----------|
| `WEDM_MACHINE_STATE.json` | Live machine state snapshot | v1 | `WEDMMachineStateSchema` | N/A (new) |
| `WEDM_DIGITAL_TWIN.json` | Digital twin checkpoint | v1 | `WEDMDigitalTwinSchema` | N/A |
| `WEDM_CAUSAL_GRAPH.json` | Cause-effect relationships | v1 | `WEDMCausalGraphSchema` | N/A |
| `WEDM_PARETO_CACHE.json` | Cached Pareto frontiers | v1 | `WEDMParetoCacheSchema` | N/A |
| `WEDM_TRANSFER_REGISTRY.json` | Material transfer factors | v1 | `WEDMTransferRegistrySchema` | N/A |
| `WEDM_AUTONOMY_STATE.json` | Current autonomy level + transitions | v1 | `WEDMAutonomyStateSchema` | N/A |
| `WEDM_FEEDBACK_LEDGER.jsonl` | Feedback history (append-only) | v1 | `WEDMFeedbackEntrySchema` | rotation policy |
| `WEDM_DRIFT_BASELINE.json` | Concept drift baselines | v1 | `WEDMDriftBaselineSchema` | N/A |
| `WEDM_PROGRAM_INDEX.json` | Index: program → features | v1 | `WEDMProgramIndexSchema` | N/A |
| `WEDM_MATERIAL_INDEX.json` | Index: material → programs | v1 | `WEDMMaterialIndexSchema` | N/A |
| `WEDM_CONTROLLER_INDEX.json` | Index: controller → capabilities | v1 | `WEDMControllerIndexSchema` | N/A |
| `WEDM_TELEMETRY_RING.json` | Ring buffer: recent invocations | v1 | `WEDMTelemetryRingSchema` | 1000 entry cap |
| `WEDM_OUTCOME_LEDGER.jsonl` | Program → outcome tracking | v1 | `WEDMOutcomeEntrySchema` | rotation policy |
| `WEDM_LORA_CHECKPOINT.json` | LoRA training metadata | v1 | `WEDMLoRACheckpointSchema` | N/A |
| `WEDM_SVI_DELTA_LEDGER.jsonl` | Ψ delta per WEDM change | v1 | `WEDMSVIDeltaSchema` | rotation policy |

**Exit Gate:** All 15 files have Zod schemas in `src/schemas/wedm/`, versioned, load/save works, rotation policy for ledgers.

### 0.6 — Reverse Index Layer (8 indexes)

| Index | Maps | Backs Query | Maintenance Hook |
|-------|------|-------------|------------------|
| `WEDM_ENGINE_USAGE_INDEX.json` | engine → {actions, skills, hooks, tests} | `wedmDependentsOf(engineId)` | `hook_post_write_wedm_index` |
| `WEDM_ACTION_RESOLUTION_INDEX.json` | actionId → {engine, schema, skill} | `resolveWedmAction(actionId)` | same |
| `WEDM_SKILL_MANIFEST_INDEX.json` | skill → {engines, actions, hooks} | `wedmSkillCallGraph(skillId)` | same |
| `WEDM_TIP_USAGE_INDEX.json` | tipId → {engines, programs, invocations} | `wedmTipUsage(tipId)` | same |
| `WEDM_PROGRAM_SIMILARITY_INDEX.json` | programId → {similar[], embedding} | `findSimilarWedmPrograms(id)` | `wedm_embed_programs.ts` |
| `WEDM_CUSTOMER_PATTERN_INDEX.json` | customer → {programs, params, success_rate} | `jmDieWedmPatterns(customer)` | program scan |
| `WEDM_FORMULA_PROVENANCE_INDEX.json` | formula → {source, citation, engines} | `wedmFormulaSource(id)` | MIT OCW ingest |
| `WEDM_ALIAS_TABLE.json` | canonicalId → [aliases[]] | `wedmAliasesOf(id)` | rename tracking |

**Exit Gate:** All 8 indexes populated, queries return in <50ms, `hook_post_write_wedm_index` maintains consistency.

### 0.7 — Duplication Guard Integration

**Unit:** U-WEDM-DG1

Extend `DuplicationGuardEngine` with WEDM-specific checks:
- All 119 existing WEDM engines registered with keywords
- All 107 tribal tips registered with embeddings
- All 10 math models registered with formula signatures
- Semantic similarity threshold 0.85 for WEDM domain

**Exit Gate:** `DuplicationGuardEngine.mustCheckBeforeCreating("engine", "WEDMSomethingEngine", ...)` returns matches for 119 existing engines.

### 0.8 — MIT OCW Integration for WEDM (5 units)

| Unit | Course | Feeds | Artifact |
|------|--------|-------|----------|
| U-WEDM-MIT1 | 2.008 Fundamentals of Manufacturing | Klocke Ra, Kunieda MRR, discharge physics | 15 tips + formula citations |
| U-WEDM-MIT2 | 2.830 Control of Manufacturing | Servo control, adaptive feed, PID tuning | `WEDMServoControlEngine` extension |
| U-WEDM-MIT3 | 2.813 Manufacturing Systems | Batch optimization, scheduling | `WEDMSchedulingEngine` extension |
| U-WEDM-MIT4 | 18.06 Linear Algebra | SVD/PCA for program embeddings | `WEDMProgramNeuralAnalysisEngine` rigor |
| U-WEDM-MIT5 | 6.S191 Deep Learning | GP calibration, uncertainty bounds | `WEDMNeuralTrainingEngine` validation |

**Anti-Patterns:**
- Do NOT create `MITManufacturingEngine` — extend existing WEDM engines with MIT-backed citations
- Do NOT ingest courses already in main plan — coordinate with Phase 0.12 UNIVERSAL

**Exit Gates:**
- All 5 courses ingested, each ≥5 WEDM-specific tips
- Formula provenance index has MIT citations for Klocke, Kunieda, Weibull
- `WEDMNeuralTrainingEngine` confidence bounds validated against 6.S191 principles

### 0.9 — JM Die WEDM Program Harvesting

**Units:** U-WEDM-JMD1, U-WEDM-JMD2, U-WEDM-JMD3

| Unit | Scope | Output |
|------|-------|--------|
| U-WEDM-JMD1 | Index all WEDM programs in H:/PRISM/JM DIE/WIRE EDM/ | `WEDM_PROGRAM_INDEX.json` (~2,500 entries) |
| U-WEDM-JMD2 | Extract parameters from NC files | `WEDM_PARAMETER_CORPUS.json` (E-codes, offsets, feeds) |
| U-WEDM-JMD3 | Build customer pattern index | `WEDM_CUSTOMER_PATTERN_INDEX.json` (100+ customers) |

**Leverage Existing:**
- `JMDieProgramAnalyzerEngine` — extend for WEDM-specific analysis
- `WedmProgramIndexEngine` — already exists, populate it

**Exit Gates:**
- ≥2,000 WEDM programs indexed with features
- ≥50 customers have pattern profiles
- Parameter corpus covers all 6 controller brands

### 0.10 — SVI Coupling for WEDM

**Units:** U-WEDM-SVI1, U-WEDM-SVI2, U-WEDM-SVI3, U-WEDM-SVI4

| Unit | Artifact | Purpose |
|------|----------|---------|
| U-WEDM-SVI1 | `hook_wedm_svi_inject` (SessionStart) | Inject WEDM Ψ contribution into session brief |
| U-WEDM-SVI2 | `SVIImpactProjectorEngine` extension | Project Ψ delta for WEDM engine/action creation |
| U-WEDM-SVI3 | `hook_wedm_svi_milestone_gate` | Block WEDM milestone if net-zero Ψ |
| U-WEDM-SVI4 | `WEDM_SVI_DELTA_LEDGER.jsonl` | Track Ψ contributions |

**Integration:**
- Add WEDM engines (119) to SVI watched surfaces
- Add WEDM actions (256) to SVI action coverage
- Add WEDM skills (12 new) to SVI skill completeness

**Exit Gates:**
- `prism_dev:svi_summary` includes WEDM contribution
- WEDM-related creations emit Ψ-delta badge
- `WEDM_SVI_DELTA_LEDGER.jsonl` receives entries on WEDM PostTool

### 0.11 — Auto-Documentation for WEDM

**Units:** U-WEDM-DOC1, U-WEDM-DOC2, U-WEDM-DOC3

| Unit | Artifact | Managed Block |
|------|----------|---------------|
| U-WEDM-DOC1 | `WEDM_DIGEST.md` | Auto-generated from 119 engines |
| U-WEDM-DOC2 | CLAUDE.md WEDM section | `<!-- AUTO-WEDM-START -->...<!-- AUTO-WEDM-END -->` |
| U-WEDM-DOC3 | `hook_post_write_wedm_doc_cascade` | Trigger doc refresh on WEDM engine write |

**Exit Gates:**
- `WEDM_DIGEST.md` auto-regenerates within 60s of WEDM engine write
- CLAUDE.md WEDM count matches live count (119 engines)
- No manual edits inside managed blocks

### 0.12 — Operational Integrity for WEDM

**Units:** U-WEDM-OP1 through U-WEDM-OP10

| Unit | Artifact | Purpose |
|------|----------|---------|
| U-WEDM-OP1 | `WEDM_BOOTSTRAP_MODE.flag` | Resolve bootstrap paradox for WEDM stack |
| U-WEDM-OP2 | `WEDM_HOOK_ORDER_REGISTRY.json` | Deterministic hook ordering for 16 hooks |
| U-WEDM-OP3 | `wedm_retrofit_existing.ts` | Back-fill 119 engines into registries |
| U-WEDM-OP4 | WEDM perf budget: SessionStart ≤500ms | Measured via `WEDM_BOOT_TELEMETRY.jsonl` |
| U-WEDM-OP5 | `/wedm-hook-disable <name>` skill | Kill switch for WEDM hooks |
| U-WEDM-OP6 | `wedm_rotate_ledgers.ts` | Hot/warm/cold tiering for WEDM ledgers |
| U-WEDM-OP7 | `correlationId` in all WEDM ledgers | End-to-end tracing |
| U-WEDM-OP8 | `WEDMTransactionLogEngine.ts` | Rollback for multi-file WEDM writes |
| U-WEDM-OP9 | Schema versioning for all 15 state files | Migration paths |
| U-WEDM-OP10 | `wedm_regression.test.ts` | 30+ tests for WEDM AGI stack |

**Exit Gates:**
- Fresh clone + `WEDM_BOOTSTRAP_MODE.flag` → WEDM stack boots in <60s
- Retrofit script emits counts matching live `find` (±1%)
- 30/30 regression tests pass

### 0.13 — AGI Session Awareness for WEDM

**Units:** U-WEDM-SAW1 through U-WEDM-SAW5

| Unit | Artifact | Purpose |
|------|----------|---------|
| U-WEDM-SAW1 | `hook_session_wedm_awareness_inject` | Inject WEDM context when relevant |
| U-WEDM-SAW2 | `WEDMSituationalFilterEngine.ts` | Filter 119 engines to ≤10 relevant per prompt |
| U-WEDM-SAW3 | `WEDMGoalStackExtension` | WEDM-specific goal types |
| U-WEDM-SAW4 | `WEDM_SESSION_BRIEF.md` | Session-specific WEDM summary |
| U-WEDM-SAW5 | `hook_wedm_reflection` | Post-milestone WEDM-specific insights |

**Exit Gates:**
- Sessions mentioning "wire edm" get WEDM context injected
- `WEDMSituationalFilterEngine` compresses 119 engines to ≤10 relevant
- WEDM-specific insights appear in `SESSION_INSIGHTS_LEDGER`

### 0.14 — AGI Proximity Layer for WEDM

**Units:** U-WEDM-AGI1 through U-WEDM-AGI8

| Unit | Artifact | Purpose |
|------|----------|---------|
| U-WEDM-AGI1 | `WEDMGoalSynthesisEngine.ts` | Propose WEDM improvements autonomously |
| U-WEDM-AGI2 | `WEDMCausalBindingEngine.ts` | Bind `CausalReasoningEngine` to WEDM domain |
| U-WEDM-AGI3 | `WEDMTransferBridgeEngine.ts` | Cross-material analogical reasoning |
| U-WEDM-AGI4 | `WEDMCompositionalEngine.ts` | Combine WEDM engines for novel solutions |
| U-WEDM-AGI5 | `WEDMPredictiveSimEngine.ts` | Pre-play WEDM parameter changes |
| U-WEDM-AGI6 | `WEDMPeerLearningEngine.ts` | Cross-session WEDM insight sharing |
| U-WEDM-AGI7 | `WEDMAbstractionHierarchyEngine.ts` | Tip → principle → law |
| U-WEDM-AGI8 | `WEDM_ABSTRACTION_HIERARCHY.json` | Multi-level generalizations |

**Exit Gates:**
- `WEDMGoalSynthesisEngine.propose()` returns ≥3 WEDM improvement goals
- `WEDMTransferBridgeEngine.findAnalogies("D2")` returns ≥1 cross-material match
- `WEDM_ABSTRACTION_HIERARCHY.json` has ≥3 levels, ≥20 entries

### 0.15 — Local LLM Infrastructure for WEDM

**Units:** U-WEDM-LLM1 through U-WEDM-LLM6

| Unit | Artifact | Hardware | Purpose |
|------|----------|----------|---------|
| U-WEDM-LLM1 | `WEDMLocalModelEngine.ts` | Any | Route simple WEDM queries to Ollama |
| U-WEDM-LLM2 | `wedm-lora-adapter/` | RTX 4080 | LoRA fine-tuned on JM Die WEDM programs |
| U-WEDM-LLM3 | `WEDMQdrantEngine.ts` | RTX 4080 | Vector memory for 2,500 WEDM programs |
| U-WEDM-LLM4 | `WEDMOutcomeTrackingEngine.ts` | Any | Log good/scrap/adjust outcomes |
| U-WEDM-LLM5 | `/wedm-local-ask` skill | Any | Query local model for WEDM |
| U-WEDM-LLM6 | `/wedm-train-lora` skill | RTX 4080 | Trigger overnight LoRA training |

**Models:**
- Qwen2.5-Coder 7B — G-code specialized (14GB VRAM)
- all-MiniLM-L6-v2 — embeddings (80MB)
- WEDM LoRA adapter — fine-tuned on JM Die

**Exit Gates:**
- `/wedm-local-ask "What E-code for D2?"` returns answer from Ollama in <2s
- Qdrant contains ≥2,000 WEDM program embeddings
- LoRA training completes overnight on RTX 4080

### 0.16 — Plugin/Agent Activation for WEDM

**Units:** U-WEDM-PLG1 through U-WEDM-PLG4

| Unit | Artifact | Purpose |
|------|----------|---------|
| U-WEDM-PLG1 | WEDM entries in `AGENT_REGISTRY.json` | Register WEDM-specific agents |
| U-WEDM-PLG2 | `SlashCommandRecommenderEngine` WEDM rules | Surface `/wedm-*` on EDM mentions |
| U-WEDM-PLG3 | `/wedm-commands-audit` skill | Weekly WEDM skill usage report |
| U-WEDM-PLG4 | `WEDM_AGENT_UTILIZATION_LEDGER.jsonl` | Track WEDM agent invocations |

**Exit Gates:**
- User asks "wire edm" → recommender surfaces `/wedm-program`, `/wedm-feasibility`
- `AGENT_REGISTRY.json` has ≥5 WEDM agent entries
- `/wedm-commands-audit` produces usage report

### 0.17 — WEDM-Specific Test Suite

**Unit:** U-WEDM-TEST1

Create `src/__tests__/wedm/` with:
- `wedm_skills.test.ts` — all 12 skills invoke correctly
- `wedm_hooks.test.ts` — all 16 hooks fire/block correctly
- `wedm_playbooks.test.ts` — all 8 playbooks execute
- `wedm_indexes.test.ts` — all 8 indexes query correctly
- `wedm_svi.test.ts` — SVI coupling works
- `wedm_agi.test.ts` — AGI parity tests pass

**Exit Gate:** 60+ WEDM-specific tests pass.

### 0.18 — WEDM AGI Parity Test Suite

**Canary tests that MUST pass on any fresh session:**

1. **Query WEDM capability** → Uses `AwarenessQueryEngine` with WEDM filter, not raw grep
2. **Propose WEDM program** → Auto-runs `/wedm-feasibility` before `/wedm-program`
3. **Hit WEDM quality gate fail** → Explains via causal graph + suggests fix
4. **Unknown WEDM material** → Flags OOD, proposes few-shot protocol
5. **Wire break during cut** → Auto-recovers within safe limits
6. **Create new WEDM engine** → `DuplicationGuardEngine` checks 119 existing first
7. **Ask about JM Die WEDM** → Surfaces customer patterns from index
8. **Propose WEDM improvement** → `WEDMGoalSynthesisEngine` contributes ≥1 goal

All 8 must pass on any randomly-chosen fresh session. **This is the WEDM AGI parity bar.**

---

## Phase 1 — Perception & Sensing (WEDM-AGI-P1)

*(Content same as v2 but with updated unit IDs and leverage existing references)*

### P1-MS1: Machine State Awareness (3 engines, 2 hooks)

| Unit | Artifact | LOC | Purpose | Leverages |
|------|----------|-----|---------|-----------|
| U-P1-01 | `WEDMMachineStateEngine.ts` | 600 | Aggregate machine state from sensors | — |
| U-P1-02 | `WEDMSensorFusionEngine.ts` | 800 | Fuse sensor streams with Kalman filter | `StochasticEDMEngine` |
| U-P1-03 | `WEDMDigitalTwinEngine.ts` | 1,000 | Maintain virtual machine state, <10ms latency | — |
| U-P1-04 | `hook_wedm_sensor_anomaly` | 100 | Detect sensor anomalies via SPC | — |
| U-P1-05 | `hook_wedm_twin_sync` | 100 | Sync digital twin on state change | — |

**Exit Gates:**
- [ ] `WEDM_MACHINE_STATE.json` updates within 10ms of sensor change
- [ ] Kalman filter reduces sensor noise by ≥50%
- [ ] Digital twin matches physical machine within 1mm position error
- [ ] Anomaly hook fires on simulated sensor failure (canary test)

### P1-MS2: Part & Workholding Recognition (3 engines)

| Unit | Artifact | LOC | Purpose | Leverages |
|------|----------|-----|---------|-----------|
| U-P1-06 | `WEDMPartRecognitionEngine.ts` | 700 | Identify part from DXF/STEP/camera | `EDMDrawingInterpretationEngine` |
| U-P1-07 | `WEDMWorkholdingAnalysisEngine.ts` | 500 | Analyze fixture, clamps, accessibility | `EDMFeasibilityEngine` |
| U-P1-08 | `WEDMAccessibilityEngine.ts` | 400 | Wire access path planning | `EDMStartHoleSetupEngine` |

**Anti-Pattern:** Do NOT rebuild DXF parsing — extend `EDMDrawingInterpretationEngine`.

**Exit Gates:**
- [ ] Part recognition from DXF achieves ≥95% feature extraction accuracy
- [ ] Workholding analysis flags interference with ≥90% recall
- [ ] Accessibility scoring matches operator assessment on 10 JM Die test parts

### P1-MS3: Material Characterization (2 engines)

| Unit | Artifact | LOC | Purpose | Leverages |
|------|----------|-----|---------|-----------|
| U-P1-09 | `WEDMMaterialCharacterizationEngine.ts` | 600 | Infer material from spark behavior | Klocke Ra model |
| U-P1-10 | `WEDMMaterialDatabaseEngine.ts` | 400 | Comprehensive material property DB | `EDMMaterialMachineWireEngine` |

**Exit Gates:**
- [ ] Material inference from spark behavior achieves ≥80% accuracy on known materials
- [ ] Database covers all JM Die materials (D2, A2, M2, S7, H13, WC, graphite)
- [ ] Unknown material triggers OOD flag (not silent classification)

---

## Phase 2 — Reasoning & Planning (WEDM-AGI-P2)

### P2-MS1: Causal Reasoning Engine (3 engines, 1 state file)

| Unit | Artifact | LOC | Purpose | Leverages |
|------|----------|-----|---------|-----------|
| U-P2-01 | `WEDMCausalReasoningEngine.ts` | 1,200 | Causal graph traversal + intervention | `WireEDMDeepNeuralReasoningEngine` |
| U-P2-02 | `WEDMCounterfactualEngine.ts` | 800 | "What if" analysis | `WireEDMDeepReasoningEngine` |
| U-P2-03 | `WEDMRootCauseEngine.ts` | 600 | Automatic fault diagnosis | `WEDMFeedbackCalibrationEngine` |
| U-P2-04 | `WEDM_CAUSAL_GRAPH.json` | — | Persisted causal graph | — |

**Causal Relationships to Model:**
```
Discharge Energy → Crater Size → Ra
Discharge Energy → Temperature → HAZ
Wire Tension → Vibration → Ra uniformity
Flushing Pressure → Debris Evacuation → Stability
ON/OFF Ratio → Duty Cycle → MRR vs Ra tradeoff
Corner Radius → Wire Deflection → Accuracy
Taper Angle → Wire Lag → Dimensional error
```

**Exit Gates:**
- [ ] Causal graph has ≥50 edges covering all key relationships
- [ ] Counterfactual queries return in <100ms
- [ ] Root cause diagnosis matches expert diagnosis on 10 test failures (≥80%)

### P2-MS2: Multi-Objective Optimization (3 engines)

| Unit | Artifact | LOC | Purpose | Leverages |
|------|----------|-----|---------|-----------|
| U-P2-05 | `WEDMMultiObjectiveEngine.ts` | 1,000 | NSGA-II implementation | `GeneticOptimizer` |
| U-P2-06 | `WEDMParetoEngine.ts` | 600 | Pareto frontier analysis + caching | `WEDMNeuralTrainingEngine` Monte Carlo |
| U-P2-07 | `WEDMTradeoffEngine.ts` | 400 | Interactive preference elicitation | — |

**Exit Gates:**
- [ ] NSGA-II produces Pareto frontier with ≥10 solutions
- [ ] Pareto cache hit rate ≥80% for repeated queries
- [ ] Tradeoff engine correctly adjusts weights based on user preference

### P2-MS3: Hierarchical Task Planning (3 engines)

| Unit | Artifact | LOC | Purpose | Leverages |
|------|----------|-----|---------|-----------|
| U-P2-08 | `WEDMHierarchicalPlannerEngine.ts` | 1,200 | HTN planning | `WEDMCompleteOrchestrationEngine` |
| U-P2-09 | `WEDMSequencingEngine.ts` | 600 | Optimal cut ordering | `EDMToolpathStrategyEngine` |
| U-P2-10 | `WEDMTabStrategyEngine.ts` | 400 | Slug retention planning | `EDMWireSlugCornerTaperEngine` |

**Exit Gates:**
- [ ] HTN planner generates valid plans for 100% of JM Die test parts
- [ ] Sequencing reduces total travel by ≥15% vs naive order
- [ ] Tab strategy retains slugs on 100% of internal features

### P2-MS4: Transfer Learning (3 engines, 1 index)

| Unit | Artifact | LOC | Purpose | Leverages |
|------|----------|-----|---------|-----------|
| U-P2-11 | `WEDMTransferLearningEngine.ts` | 800 | Domain adaptation | `WireEDMKnowledgeSynthesisEngine` |
| U-P2-12 | `WEDMAnalogicalReasoningEngine.ts` | 600 | Similar case retrieval | `WEDMProgramNeuralAnalysisEngine` |
| U-P2-13 | `WEDMKnowledgeDistillationEngine.ts` | 500 | Compress tribal knowledge | 107 tips |
| U-P2-14 | `WEDM_TRANSFER_REGISTRY.json` | — | Transfer factor index | — |

**Exit Gates:**
- [ ] Transfer registry has ≥20 material→material mappings
- [ ] Analogical retrieval returns ≥5 similar cases in <50ms
- [ ] Knowledge distillation produces ≤100 actionable rules from 107 tips

---

## Phase 3 — Learning & Adaptation (WEDM-AGI-P3)

*(Same structure as v2, 13 units across 3 milestones)*

---

## Phase 4 — Autonomy & Safety (WEDM-AGI-P4)

*(Same structure as v2, 10 units across 3 milestones)*

---

## Phase 5 — Explainability & Trust (WEDM-AGI-P5)

*(Same structure as v2, 10 units across 3 milestones)*

---

## Implementation Priority (Aligned with UNIVERSAL)

### Immediate (2 weeks) — Phase 0 Foundation
1. **Phase 0.1-0.6** — Skills (12), Scripts (18), Hooks (16), Playbooks (8), State files (15), Indexes (8)
2. **Phase 0.7** — Duplication Guard integration
3. **Phase 0.9** — JM Die program harvesting
4. **Phase 0.12** — Operational integrity (bootstrap, regression tests)

### Short-term (1 month) — Phase 0 Completion + P2
5. **Phase 0.8** — MIT OCW integration
6. **Phase 0.10-0.11** — SVI coupling + auto-doc
7. **Phase 0.13-0.14** — AGI session awareness + proximity
8. **P2-MS1** — Causal Reasoning Engine (foundation)

### Medium-term (3 months) — Phases 1, 3, 5
9. **P1-MS1-MS3** — Perception layer
10. **P3-MS1** — Continuous Learning Loop
11. **P5-MS1** — Decision Explainability
12. **Phase 0.15** — Local LLM infrastructure

### Long-term (6 months) — Phases 3, 4 Advanced
13. **P3-MS2-MS3** — Few-shot + RL learning
14. **P4-MS1-MS3** — Full autonomy + predictive maintenance
15. **P5-MS2-MS3** — Uncertainty + trust calibration

---

## Anti-Patterns (Comprehensive)

### Do NOT Rebuild
- Do NOT rebuild DXF parsing — extend `EDMDrawingInterpretationEngine`
- Do NOT create new material DB — extend `EDMMaterialMachineWireEngine`
- Do NOT duplicate neural models — all 10 models are in `WEDMNeuralTrainingEngine`
- Do NOT add more tribal tips without `/dedup` check
- Do NOT create `WEDMSelfAwarenessEngine` — extend `PRISMSelfAwarenessEngine`
- Do NOT create `WEDMDuplicationGuardEngine` — extend `DuplicationGuardEngine`

### Do NOT Skip
- Do NOT train RL in production — use `WEDMSimulationEngine` first
- Do NOT skip OOD detection for new materials
- Do NOT emit explanations without provenance chain
- Do NOT allow L4 autonomy without L3 validation period
- Do NOT skip schema versioning for state files
- Do NOT skip regression tests for AGI engines
- Do NOT skip Codex dual-ship for hooks

### Do NOT Exceed
- Do NOT exceed SessionStart perf budget (500ms for WEDM inject)
- Do NOT exceed 1000 entries in ring buffers
- Do NOT let ledgers grow unbounded (rotation policy required)
- Do NOT inject >10 engines per prompt (situational filter required)

---

## Artifact Count Summary (FINAL)

| Phase | Engines | Hooks | Skills | Scripts | State Files | Indexes | Other | Total |
|-------|---------|-------|--------|---------|-------------|---------|-------|-------|
| Phase 0.1-0.6 | 0 | 16 | 12 | 18 | 15 | 8 | 8 playbooks | 77 |
| Phase 0.7-0.9 | 0 | 1 | 0 | 3 | 0 | 0 | DG extension | 4 |
| Phase 0.10-0.11 | 0 | 2 | 0 | 0 | 1 | 0 | Doc propagation | 3 |
| Phase 0.12 | 1 | 0 | 1 | 2 | 2 | 0 | Regression suite | 6 |
| Phase 0.13-0.14 | 8 | 2 | 0 | 0 | 1 | 0 | AGI proximity | 11 |
| Phase 0.15-0.16 | 2 | 0 | 2 | 2 | 1 | 0 | Local LLM + plugins | 7 |
| Phase 0.17-0.18 | 0 | 0 | 0 | 0 | 0 | 0 | Test suites | 2 |
| Phase 1 | 8 | 2 | 0 | 0 | 0 | 0 | Perception | 10 |
| Phase 2 | 12 | 0 | 0 | 0 | 2 | 0 | Reasoning | 14 |
| Phase 3 | 11 | 2 | 0 | 0 | 2 | 0 | Learning | 15 |
| Phase 4 | 9 | 0 | 0 | 0 | 1 | 0 | Autonomy | 10 |
| Phase 5 | 10 | 1 | 0 | 0 | 0 | 0 | Explainability | 11 |
| Codex dual-ship | 0 | 16 | 0 | 0 | 0 | 0 | Python hooks | 16 |
| **Total** | **61** | **42** | **15** | **25** | **25** | **8** | **~10** | **~186** |

---

## Exit Gates Summary

### Phase 0 Exit (Must pass before Phase 1)
- [ ] All 12 skills invokable, correct action sequences
- [ ] All 16 hooks registered, dual-shipped TS + Python
- [ ] All 8 playbooks parse and dry-run
- [ ] All 15 state files have Zod schemas, versioned
- [ ] All 8 indexes query in <50ms
- [ ] 119 existing engines registered in `DuplicationGuardEngine`
- [ ] JM Die programs indexed (≥2,000)
- [ ] MIT OCW courses integrated (5 units)
- [ ] SVI coupling emits Ψ-delta on WEDM writes
- [ ] Operational integrity: bootstrap, ledger rotation, regression tests
- [ ] AGI parity: 8/8 canary tests pass

### Phase 1-5 Exit (Per milestone)
- See individual milestone exit gates above

### Final Exit (Full AGI Readiness)
- [ ] Ra prediction error ≤±5%
- [ ] Wire break recall ≥95%
- [ ] First-part success ≥99%
- [ ] Autonomy level L4 achievable
- [ ] Operator satisfaction ≥90%
- [ ] WEDM Ψ contribution +3% to system
- [ ] All 186 artifacts shipped and tested

---

*Scrutinized: 2026-04-16 v3*
*Depth: Matches UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN-2026-04-15.md*
*Milestone: WEDM-AGI-ROADMAP-SCRUTINIZED-v3*
