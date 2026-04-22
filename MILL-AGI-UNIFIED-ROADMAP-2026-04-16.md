# PRISM — MILL AGI UNIFIED ROADMAP
**Date:** 2026-04-16
**Scope:** Complete milling + mill-turn + 5-axis + CAMX + AGI awareness + frontend wiring
**Goal:** Transform PRISM's milling surface from wired engines into an AGI-grade cognitive system — deep learning, deep reasoning, deep logic, neural networks, tribal-knowledge self-improvement — fully synchronized with the rest of the mcp-server and wired end-to-end into the Codex-built PRISM frontend.
**Quality bar:** Match or exceed `UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN-2026-04-15.md` — every claim cites a file, every phase carries exit criteria, every unit has an abort/rollback plan.

---

## 1. Consolidated Sources

This roadmap supersedes and consolidates the following prior milling-domain roadmaps:

| Source | Status in roadmap-index | Units | Folded into |
|--------|------------------------|-------|-------------|
| `MILL-AI-INTEGRATION-ROADMAP-v4.md` | Phases 1-5 ✅ done (MS-WIRE / MS-KNOW / MS-DB / MS-ORCH / MS-OPT) | 39 | Kept as historical baseline |
| `MILLING-COMPREHENSIVE-ROADMAP.md` | 11 milestones, 113 units, 0 complete | 113 | **Phase 2 (Milling Hardening)** |
| `MILL-TURN-COMPREHENSIVE-ROADMAP.md` | 12 milestones, 138 units | 138 | **Phase 3 (Mill-Turn Hardening)** |
| `FIVE-AXIS-COMPREHENSIVE-ROADMAP.md` | 12 milestones, 125 units, 300+ tests | 125 | **Phase 4 (5-Axis Hardening)** |
| `PRISM-UNIFIED-ROADMAP-v2.md` — CAMX track | 24 milestones not-started, 2 in-progress | ~298 | **Phase 1 (Strategy Foundation) + Phase 5 (Decision Intelligence)** |
| `PRISM-UNIFIED-ROADMAP-v2.md` — CAMX-V17 track | 13 milestones | 104 | **Phase 5 + Phase 6** |
| `AI-AWARE-HARDEN` milestone (live in index) | 21/30 complete, 9 open | 9 | **Phase 0 (AGI Foundation)** remaining work |

**Total absorbed open work: ~800 units** across ~80 milestones, collapsed here into **7 ordered phases** (P0–P6) plus one continuous-loop layer (P7).

---

## 2. Scope Snapshot (as of 2026-04-16)

```
Physics engines wired in MillingPhysicsKernelEngine:  94 / 97 roadmap target  (97%)
Dispatchers touching milling work:                    22 of 85 total
Mill-relevant actions exposed via MCP:                ~640 of 4,296
Tool catalog records in extracted.json:              67,389 (target 90k)
Tribal tips with mill provenance:                    ~1,400 of 4,493 total
Formulas in FormulaRegistry:                         509
Front-end pages relevant to milling:                 18 of 111 (mill, 5-axis, mill-turn pages)
Codex-authored front-end pages:                      111 (full page set)
PRISM app build target:                              H:/prism/web + H:/prism/mcp-server/web
```

---

## 3. Artifact Budget (all phases combined)

| Artifact type | Count | Notes |
|---|---|---|
| **AGI cognitive engines** (new) | **18** | Deep learning / reasoning / attention / meta-learning (Phase 0) |
| **Neural network inference engines** (new) | **7** | CNN for feature detection, Transformer for G-code understanding, GNN for toolpath topology |
| **Machine family engines** — milling | 24 | Collision, multi-machine, tooling, workholding, controller-hardening (Phase 2) |
| **Machine family engines** — mill-turn | 28 | Multi-channel, bar feeder, guide bushing, Swiss specifics (Phase 3) |
| **Machine family engines** — 5-axis | 26 | 3+2, simul, NURBS/G93, RCSA, singularity (Phase 4) |
| **CAMX decision engines** | 34 | Strategy taxonomy, selection, controller/machine validation, cost/safety, self-learning (Phase 1+5) |
| **Knowledge synthesis engines** | 9 | ResourceIndex, catalog / spreadsheet / archive / OCR / DXF / Office / MachineLog (existing U-AWR19/20/26 + 4 remaining) |
| **Reasoning layer engines** | 6 | Causal, counterfactual, hypothesis, multi-path, analogical, creative (extends PRISM AI stack) |
| **Deep-learning training pipelines** | 5 | Strategy ranker (Bayesian + LoRA), tool-life predictor, chatter classifier, surface-finish predictor, cost estimator |
| **Dispatcher actions** | +~480 | New actions across 8 dispatchers (cad, cam, calc, turning, edm, knowledge, knowledgeExt, agent) |
| **Skills** (slash commands) | +42 | `/mill-full-job`, `/mill-turn-choreograph`, `/5ax-program`, `/cam-strategy-pick`, `/agi-reason`, `/agi-reflect`, etc. |
| **Hooks** (PreTool + PostTool + PostCompact) | +28 | Awareness-injection, synergy-check, neural-inference-guard, front-end-sync, audit-reminder |
| **Scripts** (CLI/batch) | +18 | Catalog ingestion, G-code validation, kinematics sim, frontend-lint, codex-audit |
| **Test files** | +110 | Minimum 10 per engine, integration tests across phase boundaries |
| **Frontend pages modified** (Codex app) | +14 | New mill-AGI dashboard, strategy explorer, reasoning trace viewer, learning telemetry, + existing mill pages |
| **Frontend pages new** | +8 | AGI control panel, neural inference viewer, extraction queue, audit report, codex gap viewer, self-awareness panel, synergy graph, ledger viewer |
| **MCP API endpoints new** | +32 | Expose AGI reasoning / deep learning / audit / synergy / sync APIs |
| **State / telemetry files** | +14 | Ledgers for every AGI subsystem, monotonic sequence, retention policy |
| **Total new artifacts** | **~820** | Comparable to Universal Skills plan (~595) scaled for AGI scope |

**Lines of code budget:** ~55,000 new LOC (~2× UNIVERSAL plan) split ~40% engines, ~20% tests, ~15% frontend, ~10% scripts, ~15% wiring + hooks.

---

## 4. Coverage Targets (before → after)

| Dimension | Before (today) | Target (P6 complete) |
|---|---|---|
| Mill physics kernel engines wired | 94 | **120+** (includes AGI + neural submodules) |
| Test coverage on milling engines | ~50% | **≥95%** (+1,200 tests) |
| Mill-turn physics accuracy vs ground truth | not measured | **S(x) ≥ 0.90** on 50-part validation set |
| 5-axis collision prediction recall | not measured | **≥98%** on industry test parts (15 parts, ISBM, ASME) |
| CAMX strategy recall on feature/material pair | ~60% (ad hoc) | **≥90%** measured via `MachineLearningStrategyRankerEngine.getCoverage()` |
| AGI reasoning depth (chain-of-thought steps before decision) | 1 (flat) | **≥5 average** with traceable justification per step |
| Deep learning inference latency | n/a | **<150ms p99** for all 5 ML models combined |
| Neural network model provenance (cite training data + formulas) | 0% | **100%** — every model traces to MIT course + literature reference |
| Front-end wiring (MCP actions → UI) | ~45% of mill pages | **100%** for 14 mill pages + 8 new |
| Codex app build integration (actions invokable from UI) | unaudited | **audit complete + gaps filed + wiring closed** |
| Synergy with other PRISM domains | loose (manual calls) | **tight (awareness orchestrator routes every mill action)** |
| Self-improvement cycle (production feedback → tribal tip) | none | **live — MS-OPT-2 loop below** |

---

## 5. Critical Scrutiny Findings (read first)

Five independent scrutiny passes identify gaps that this roadmap must fix BEFORE shipping:

### Pass A — AGI Maturity
- **PRISM has reasoning engines on paper, not in the pipeline.** `PRISMCreativeReasoningEngine`, `ManufacturingReasoningEngine`, `MultiPathReasoningEngine`, `HypothesisRankerEngine`, `CounterfactualReasoningEngine` all exist but are called only from a handful of high-level orchestrators. The mill decision path uses `SpeedFeedOrchestratorEngine` → static table lookup, no chain-of-thought, no counterfactual ("what if we switched to trochoidal?"), no meta-reasoning on confidence. Fix in **P0.2** (reasoning-as-default wiring).
- **No neural networks in production.** `crossDisciplinaryDeepLearningEngine` contains formula implementations of CNN / K-means / ridge regression but no actual trained models, no inference runtime, no feedback loop. Fix in **P0.3** (neural inference layer) + **P4.3** (model training pipelines).
- **Deep logic is absent.** When a user asks "why did you pick this tool?", PRISM returns the top table match — not a proof chain. **P0.4** ships `DeepLogicTraceEngine` for propositional-through-first-order explanation trees tied to formulas and tribal tips.

### Pass B — Physics Completeness (machine type × capability matrix)
- **Milling**: 87% physics coverage (Kienzle / Taylor / deflection / chatter / surface finish / stability / thermal / wear all wired). Gaps: RCSA on long-reach tools, cross-tool coupling on ganged holders, micro-milling size effect below 0.5mm, high-speed-machining dwell-at-corner. Fix in **P2**.
- **Mill-Turn**: 45% coverage. Multi-channel timing, guide-bushing deflection, bar-whip, sub-spindle handoff forces, live-tool-in-turret chatter not modeled. Fix in **P3**.
- **5-Axis**: 55% coverage. Effective diameter at tool-axis-tilt, scallop with barrel cutters, singularity avoidance, RCSA with tilted tool, inverse time feed (G93) physics not unified. Fix in **P4**.

### Pass C — CAMX Decision Gap
- **Strategy selection is rule-based (not learned).** `OptimalStrategySelectionEngine` uses a priority table; no Bayesian updating from actuals. `MachineLearningStrategyRankerEngine` exists with Wilson / Thompson / UCB1 logic but is **unfed** — no observation pipeline. Fix in **P1 + P7** (feed actuals → posterior update).
- **Controller + Machine validators exist (CAMX-MS2 done) but downstream**. Strategy → post-processing handshake validates after generation instead of upstream at strategy pick. Fix in **P1.3**.
- **Per-CAM infrastructure is 1/9 complete** (only HyperMill via HyperMillStrategyEngine). Mastercam, SolidCAM, NX, PowerMill, CATIA, Tebis, Cimatron, Edgecam, Fusion 360 all have stub-level coverage. Fix in **P5**.

### Pass D — Synergy / Cross-System
- **Milling engines don't invoke domain-adjacent intelligence.** A mill roughing decision should consult: tribal tips (operator wisdom), playbook rules, material database (kc1.1), tool catalog (67k tools in DB), cost engine (margin impact), safety engine (S(x) scoring), quality engine (Cp/Cpk projection). Today it consults **2 of 7**. Fix in **P0.1** (awareness-first middleware on every mill action).
- **No live telemetry of mill engine invocation.** Can't tell which physics engines are actually being hit at runtime. `INVOCATION_TELEMETRY` ring buffer from UNIVERSAL plan must extend to mill engines. Fix in **P0.5**.
- **Post-processor pipeline touches 38 stages but only 2 consult mill physics.** Stages that could benefit (block-by-block force estimation, per-block chatter check, per-block thermal) aren't wired. Fix in **P2.7**.

### Pass E — Frontend Integration / Codex App Audit
- **111 frontend pages from Codex's app build on H:/prism/web/ + H:/prism/mcp-server/web/**. Mill-relevant pages: 18 (CamStrategyPage, EdmPage, LatheResultsPage, TurningPage, WireEdmStudioPage, + others). Gaps (unknown pre-audit): programmatic mill programming page, mill-turn choreography UI, 5-axis simulation viewer, RCSA tuning UI, AGI reasoning trace viewer, strategy comparison panel, deep-learning telemetry dashboard, self-awareness / capability manifest page.
- **MCP wiring to pages is uneven.** Some pages hit MCP actions via `/api/...` routes; others have hardcoded mocks. No full audit exists. Fix in **P6.1 (Codex App Build Audit)** — deliverable is a gap matrix: page × MCP action × implemented status × test status.
- **Reverse audit unknown.** Which MCP actions are unused by the front end? Which actions break the frontend contract? Not surveyed. Fix in **P6.2**.

---

## 6. Phase Map (dependency-ordered)

```
P0  AGI Foundation         ──▶  awareness, reasoning, deep logic, neural runtime
P1  Strategy Foundation    ──▶  CAMX taxonomy, selection, controller+machine validate
P2  Milling Hardening      ──▶  MILLING-COMPREHENSIVE-ROADMAP content, physics gaps
P3  Mill-Turn Hardening    ──▶  MILL-TURN-COMPREHENSIVE-ROADMAP content, multi-channel
P4  5-Axis Hardening       ──▶  FIVE-AXIS-COMPREHENSIVE-ROADMAP content, simul, RCSA
P5  CAMX Completion        ──▶  per-CAM infra (MS3–MS9), cost/safety decision, self-learning
P6  Frontend Wiring        ──▶  Codex app audit, page gap matrix, MCP wiring closure
P7  Continuous Learning    ──▶  production feedback loop, tribal tip auto-generation
```

Each phase has hard exit gates. P6 cannot start until P5 passes its gate. P7 runs continuously once P0 ships.

---

## 7. Phase 0 — AGI Intelligence Foundation (pre-prerequisite)

**Goal:** Give every mill-related action a cognitive substrate before we add more physics. Without P0, every further phase ships dumb rules with no reasoning, no learning, no synergy.

### P0.1 — Awareness-first dispatcher middleware (extends U-AWR12)
Every mill-related dispatcher action must consult `UnifiedAwarenessOrchestrator` BEFORE engine execution, and attach `{topMatches, suggestions, confidence}` to the response envelope. U-AWR12 shipped the middleware; P0.1 is the **adoption pass** across 8 dispatchers.

**Scope:** `calcDispatcher`, `camDispatcher`, `cadDispatcher`, `turningDispatcher`, `edmDispatcher`, `machineLiveDispatcher`, `knowledgeDispatcher`, `agentDispatcher`.

**Exit gate:** trace of any mill action shows awareness-consult latency <50ms p99, awareness result attached to ≥95% of action responses.

**Line budget:** 600.

### P0.2 — Deep Reasoning Integration
Promote `PRISMCreativeReasoningEngine.explore()` from stretch-goal to default path for all strategy / parameter / safety decisions.

**New engines:**
| Engine | Purpose | LOC |
|---|---|---|
| `MillingReasoningDefaultEngine.ts` | Wraps every mill physics call in a 5-step chain: gather context → hypothesize → validate → justify → commit | 700 |
| `ReasoningTraceLedgerEngine.ts` | Append-only ledger of every reasoning chain for audit + learning | 350 |
| `CounterfactualMillEngine.ts` | "What if we used trochoidal at 2.5× SFM?" counterfactual generator integrated with Kienzle force model | 550 |
| `HypothesisPrioritizerEngine.ts` | Bayesian prior on hypothesis space, feeds `HypothesisRankerEngine` | 400 |

**Exit gate:** 100% of `calculateMillingForces` / `calculateToolLife` / `calculateStability` calls return reasoning trace with ≥5 steps; trace stored in `REASONING_TRACE_LEDGER.jsonl`; test suite confirms trace determinism under same input.

### P0.3 — Neural Network Inference Layer
Ship the actual trained models (not just formula implementations).

**New engines:**
| Engine | Model | Training data source | LOC |
|---|---|---|---|
| `MillStrategyNeuralEngine.ts` | Small Transformer (6 heads, 3 layers) mapping {feature, material, machine} → strategy distribution | CAM_STRATEGY_DB + 24k JM DIE programs | 900 |
| `ChatterNeuralClassifierEngine.ts` | 1D-CNN on FRF spectra + cut parameters → {stable, at-risk, chatter} | MIT 2.008 + Altintas examples + SHOP observations | 600 |
| `SurfaceFinishCnnEngine.ts` | Tiny CNN on toolpath + tool + material → predicted Ra | Brammertz theory + published datasets | 550 |
| `ToolLifeGnnEngine.ts` | Graph neural net over tool-assembly-holder topology → Taylor C/n posterior | Weibull stochastic + 1,000+ observed lives | 700 |
| `GCodeUnderstandingTransformerEngine.ts` | 24M-parameter Transformer that tokenizes G-code and outputs semantic embedding for similarity / anomaly / feature extraction | JM DIE 24,545 programs + tribal rules | 1,400 |

**Inference runtime:** `onnxruntime-node` (already installed — fix the `.node` loader issue from earlier). All models shipped as `*.onnx` files in `data/models/*.onnx` with SHA256 manifest.

**Exit gate:** each model ≤150ms inference p99 on i5/Ryzen dev hardware; every prediction carries `{model_id, model_sha256, input_hash, confidence, provenance_url}`.

### P0.4 — Deep Logic Trace Engine
Every automated decision produces a verifiable proof tree tied to canonical formulas and tribal tips.

**New engine:** `DeepLogicTraceEngine.ts` (850 LOC)
- First-order logic assertions as nodes
- Edges cite formula-ID, tip-ID, or prior fact-ID
- JSON-serialized trace attached to every engine response
- `explainTrace(id)` renders human-readable proof

**Exit gate:** every mill force / tool-life / strategy decision trace has ≥3 logical steps citing formula registry IDs; trace passes proof-validator script (refutable inputs produce contradictions).

### P0.5 — Meta-Learning Loop
Every mill engine observes its own error vs. production outcome, updates priors, retrains where applicable.

**New engine:** `MillMetaLearningEngine.ts` (1,100 LOC)
- Observation intake: `observeActual({ engineId, input, predicted, actual, timestamp })`
- Posterior updater: Bayesian for continuous, Dirichlet for discrete
- Retrain trigger: retrain neural models when >100 new observations in domain
- Tribal tip auto-promotion: when meta-learner discovers rule with >100 observations + >0.85 confidence + no conflicting tip, queue for human review via `/reflect-tips`

**Exit gate:** closed-loop sim using synthetic actuals shows posterior convergence; adding real JM DIE observations shifts at least 3 Taylor constants; no unsupervised tribal tips promote without `/reflect-tips` human confirmation.

### P0.6 — Self-Awareness Capability Manifest (extends U-AWR10 / U-AWR13 / U-AWR23)
Ship `MILL_CAPABILITY_MANIFEST.json` — machine-readable summary of every mill engine's capabilities, preconditions, known failure modes, confidence envelope.

**Deliverable:**
```json
{
  "engineId": "KienzleForceModelEngine",
  "capabilities": ["tangential_force", "radial_force", "kc1_1_lookup"],
  "preconditions": ["material.iso_group present", "ap > 0", "fz > 0"],
  "failureModes": ["kc1_1 missing for unknown material", "fz out of Kienzle envelope"],
  "confidenceEnvelope": { "typical": 0.88, "low_envelope": 0.65, "high_envelope": 0.95 },
  "literatureCitations": ["Kienzle 1952", "Kalpakjian §24"],
  "regressionTests": ["KienzleForceModelEngine.test.ts"]
}
```

### P0.7 — Awareness Orchestrator extensions (remaining AI-AWARE-HARDEN)
Complete: U-AWR07, 08, 09, 16, 21, 22, 25, 27, 28, 29, 30 (the 11 units AI-AWARE-HARDEN doesn't finish). Each reuses prior patterns.

**Exit gate (Phase 0):** all 4 AGI substrate engines shipped, all neural models trained + inference-live, all 11 remaining AWR units green, awareness consult on all mill dispatchers, reasoning trace on 100% of mill decisions.

---

## 8. Phase 1 — Strategy Foundation (CAMX core)

**Goal:** Replace table-lookup strategy with learned + reasoned selection.

### P1.1 — Strategy Taxonomy (folds CAMX-MS0)
Normalize strategy names across CAM systems into `STRATEGY_TAXONOMY.json` (single source of truth). Expand `StrategyTaxonomyEngine` to cover 368 strategies already in registry + 50+ planned extensions.

### P1.2 — Optimal Strategy Selection v2 (folds CAMX-MS1)
Replace `OptimalStrategySelectionEngine` rule table with `MillStrategyNeuralEngine` (from P0.3) + Bayesian rerank + tribal-tip authority weighting.

### P1.3 — Upstream Validation Handshake (folds CAMX-MS2 U04 extension)
When a strategy is selected, `ControllerStrategyValidatorEngine` + `MachineStrategyConstraintEngine` + `StrategySafetyDecisionEngine` + `StrategyCostOptimalEngine` must ALL pass before the strategy is returned to the caller. Today only some are consulted. Wire into `OptimalStrategySelectionEngine.select()`.

### P1.4 — Feature-to-Strategy v2 (folds CAMX-MS12)
Uses `GCodeUnderstandingTransformerEngine` (P0.3) to match new-feature embeddings to historic successful strategies in JM DIE archive.

### P1.5 — Strategy Test Matrix (folds CAMX-MS18)
Test every strategy × controller × machine cell against `MachineLearningStrategyRankerEngine` + ground-truth JM DIE programs. Target: **≥90% recall**.

**Exit gate (Phase 1):** strategy selection < 500ms p99, recall ≥0.90 on benchmark, full validation chain (controller + machine + safety + cost) on 100% of selections, reasoning trace shows strategy pick with ≥3 alternatives and rejection reasons.

---

## 9. Phase 2 — Milling Hardening (MILLING-COMPREHENSIVE-ROADMAP)

**Absorbs:** all 11 milestones / 113 units of the milling comprehensive roadmap.

| Milestone | Unit budget | Focus |
|---|---|---|
| MILL-MS0 | 8 | Collision avoidance, rapid traverse safety (extends CutterContactEngine) |
| MILL-MS0.5 | 6 | POST-ULT dialect reconciliation (wire to existing PostProcessorPipelineEngine) |
| MILL-MS1 | 14 | Multi-machine capability DB (all 910 machines queryable with tier-aware profiles) |
| MILL-MS2 | 12 | Tooling variability (67k catalog entries + runout + coating effects) |
| MILL-MS3 | 8 | Workholding adaptation (clamp force / fixture compliance tied to FixtureDynamicsEngine) |
| MILL-MS4 | 18 | End-to-end pipeline — real toolpath generation + multi-setup |
| MILL-MS5 | 6 | User optimization choices (speed vs quality vs tool-life sliders mapped to Bayesian priors) |
| MILL-MS6 | 14 | Controller-specific hardening (Fanuc, Haas, Okuma, Siemens, Heidenhain, Hurco, Mazak) |
| MILL-MS7 | 9 | Physics hardening — fill the gaps identified in Scrutiny B (RCSA, HSM dwell, micro-milling, cross-tool coupling) |
| MILL-MS8 | 10 | Exhaustive testing + production validation |
| MILL-MS9 | 8 | Parametric + macro programming (Fanuc-style, Okuma custom-G) |

**Continuous integration with P0 AGI:** every MILL-MS milestone MUST consume awareness + reasoning + deep logic middleware. No rule-table-only milestones.

**Exit gate (Phase 2):** S(x) ≥ 0.90 on 25 JM DIE milling parts (real programs, real stock, real materials), 300+ new tests, physics-reviewer PASS on all Kienzle / Taylor / chatter / thermal entries.

---

## 10. Phase 3 — Mill-Turn Hardening

**Absorbs:** all 12 milestones / 138 units of MILL-TURN-COMPREHENSIVE-ROADMAP.

Highlights:
- **MT-MS0** — collision avoidance on multi-element (turret + live tool + sub-spindle + tailstock + steady rest + bar feeder) machines
- **MT-MS4** — multi-channel G-code assembly: parallel channel sync with M-codes, dwell-to-sync, overlapping cycles
- **MT-MS7** — physics: grip force, bar whip (Timoshenko beam with pinned-free end), guide-bushing deflection, sub-spindle handoff force, live-tool-on-turret chatter under unusual modal basis
- **MT-MS9** — Swiss-type specifics: guide bushing dialects, gang tooling, Citizen / Tsugami / Star / Tornos / Nomura controller post handling
- **MT-MS11** — bar feeder production loop: continuous bar, part-catch, chip control on unattended operation

**AGI integration:** the `GCodeUnderstandingTransformerEngine` trained in P0.3 must include mill-turn multi-channel examples. `DeepLogicTraceEngine` must render multi-channel sync verification as a provable timing chart.

**Exit gate (Phase 3):** 220+ tests, 100% pass; S(x) ≥ 0.90 on 15 JM DIE mill-turn parts; multi-channel timing validated against simulator ground truth.

---

## 11. Phase 4 — 5-Axis Hardening

**Absorbs:** all 12 milestones / 125 units of FIVE-AXIS-COMPREHENSIVE-ROADMAP.

Core content:
- **5AX-MS0** — rotary-aware collision envelope with Rodrigues rotation, includes head-mounted holder interference
- **5AX-MS1** — machine kinematics DB: table-table (AC), head-head (BC), head-table (AB), tilting-head (AB), tilting-table (BC)
- **5AX-MS4A / B** — 3+2 indexed vs full simultaneous 5-axis programming
- **5AX-MS5** — G93 inverse time feed + NURBS interpolation
- **5AX-MS7** — physics: effective diameter at tool-axis-tilt, scallop with barrel cutter, singularity avoidance, RCSA for tilted tool, force vector decomposition in machine coordinates
- **5AX-MS8** — 15-industry-part validation suite × machines × controllers

**AGI integration:** 5-axis strategy decisions must route through `CounterfactualMillEngine` (what if we tilted 15° instead of 5°?) and `HypothesisPrioritizerEngine` (rank tilt-strategy alternatives). Neural `MillStrategyNeuralEngine` (P0.3) includes 5-axis training examples.

**Exit gate (Phase 4):** 300+ tests (ISO standard parts + industry test parts), 100% pass; collision recall ≥98% on aerospace test suite; RCSA predictions validated against measured FRF.

---

## 12. Phase 5 — CAMX Completion (per-CAM infra + decision + self-learning)

**Absorbs:** CAMX-MS3 through MS22 + CAMX-V17 P0B–P11 = ~300 units.

### P5.1 — Per-CAM dedicated infrastructure (MS3-MS9)
One sub-milestone per CAM system with strategy → post handoff:

| CAM | Sub-milestone | Notes |
|---|---|---|
| Mastercam | CAMX-MS3 | .mcx-8, .mcam file handling, dynamic-motion strategies |
| SolidCAM | CAMX-MS4 | iMachining-specific Bayesian priors |
| NX CAM | CAMX-MS5 | Post definitions, custom operations |
| PowerMill / CATIA | CAMX-MS6 | macro-side effects |
| Tebis / Cimatron / Edgecam | CAMX-MS7 | bulk handling |
| Remaining CAM | CAMX-MS8 | batch all others |
| hyperMILL + Fusion | CAMX-MS9 | parity with already-deep hyperMILL integration |

### P5.2 — Tool export / sync (CAMX-MS10)
Push / pull tool lists with vendor-neutral IDs across all supported CAMs. Uses 67k tool catalog.

### P5.3 — CAM add-in framework (CAMX-MS11)
Harness-agnostic plugin contract for any CAM system to call PRISM MCP actions from within its UI.

### P5.4 — Cost-optimal + safety-first decisions (CAMX-MS13 + MS14)
Extend already-shipped `StrategyCostOptimalEngine` and `StrategySafetyDecisionEngine` with:
- Actuals feedback loop (P0.5 Meta-Learning)
- Front-end slider UI for cost-quality-time tradeoff (P6)
- Multi-objective Pareto frontier rendering

### P5.5 — Self-learning optimizer (CAMX-MS15)
Wires `MachineLearningStrategyRankerEngine` with live JM DIE feedback. Closes the loop: post-execution `observeActual()` → posterior update → next strategy pick leverages new prior.

### P5.6 — Dispatcher wiring sweep + slash commands (CAMX-MS16 + MS17)
Audit every CAMX engine has dispatcher action + schema + test + slash command. Uses UNIVERSAL plan's `verify-full-wiring.ts` script.

### P5.7 — Pipeline V17 quality uplift (CAMX-V17 P0B → P11)
13 sub-milestones hardening individual pipelines (turning, milling, 5-axis, mill-turn, grinding, WEDM, laser, waterjet) to Level 3+ decision quality (reasoning trace + counterfactual + confidence). Exhaustive test — 92 parts × N materials × N machines × controllers.

**Exit gate (Phase 5):** all 9 CAM systems show parity on a common JM DIE test part; self-learning shows measured Ψ improvement of ≥0.10 over 1,000-observation feedback cycle; 100% wiring (UNIVERSAL plan's 59 touchpoints reach green).

---

## 13. Phase 6 — Frontend Wiring + Codex App Audit

**Goal:** Every mill-related capability is reachable and tested from the PRISM app UI. No more half-wired pages.

### P6.1 — Codex App Build Audit (the deliverable you asked for)
Deep read of **H:/prism/web/** and **H:/prism/mcp-server/web/** (both Codex-authored React apps) to produce a `CODEX_APP_BUILD_AUDIT.md` with:

| Audit dimension | Expected output |
|---|---|
| Page inventory | 111 pages listed with role, owner, last-commit date |
| MCP action call graph | For each page, which MCP actions it invokes, with parameters, output schema |
| Mock / live split | Which pages still use mock data vs. live MCP calls |
| Broken / missing pages | Pages referenced but not implemented, or implemented but not routed |
| UX gaps (per domain) | Missing: mill programming wizard, mill-turn choreography, 5-axis simulation, RCSA tuning, AGI reasoning trace viewer, strategy comparison, deep-learning telemetry, self-awareness panel |
| Backend gaps surfaced by frontend | Actions the frontend needs but aren't exposed (new MCP endpoints needed) |
| State management audit | Redux / Zustand / Context / Query — what's used where, duplication |
| Accessibility audit | a11y score per page, remediation list |
| Bundle / perf audit | Page-level bundle sizes, lazy-load opportunities |

Deliverable file: `CODEX_APP_BUILD_AUDIT_2026-XX-XX.md` with ≥60 findings.

### P6.2 — Gap Filing + Prioritization
Each audit finding becomes an issue in `state/shared/CODEX_APP_GAPS.json` with severity, owner, estimated units, dependency chain.

### P6.3 — New mill pages (8)

| Page | Purpose | MCP actions consumed |
|---|---|---|
| `/mill/agi-dashboard` | Live view of AGI reasoning chain, last 10 decisions, confidence trend | `prism_ai:reasoning_trace`, `prism_ai:recent_decisions` |
| `/mill/neural-telemetry` | Neural model inference metrics, model SHA256s, retrain status | `prism_ai:neural_stats`, `prism_ai:model_provenance` |
| `/mill/strategy-explorer` | Interactive Pareto frontier of strategy options with cost / time / quality sliders | `strategy_cost_compute`, `strategy_safety_assess`, `strategy_find_best_machine` |
| `/mill/reasoning-viewer` | Proof tree viewer for any engine decision | `prism_ai:deep_logic_trace` |
| `/mill/self-awareness` | Live capability manifest, orphan detection, coverage gauges | `prism_session:capability_manifest`, `unifiedAwarenessOrchestrator:query` |
| `/mill/synergy-graph` | D3 graph of engine-invocation edges across mill / lathe / EDM / business | `INVOCATION_TELEMETRY` ring-buffer |
| `/mill/extraction-queue` | Shows pending PDF / video / archive extractions, priority, estimated tool gain | `vendorCatalogManifestEngine:getExtractionQueue` |
| `/mill/codex-gaps` | Live view of `CODEX_APP_GAPS.json` with filter + bulk ops | internal only |

### P6.4 — Existing mill-adjacent page upgrades (14)
Hook CamStrategyPage / TurningPage / LatheResultsPage / WireEdmStudioPage / EdmPage / CalculatorPage / CapacityPlanningPage / CycleTimePage / CostEstimatorPage / ProgramGenPage / QuotePage / AILearningDashboardPage / DataManagementPage / etc. into the AGI reasoning trace + awareness results. Every decision shown in UI gets a `"why?"` button that opens the reasoning viewer.

### P6.5 — MCP API coverage closure
Fill the 32 missing MCP actions identified in the audit. Each action carries awareness middleware + reasoning trace + deep-logic proof.

### P6.6 — End-to-end regression gauntlet
Playwright tests: user login → pick a part → run full pipeline → inspect reasoning trace → confirm → post-job feedback → verify tribal tip auto-generated. Covers all 8 new pages.

**Exit gate (Phase 6):** Codex app audit committed; 100% of mill pages hit live MCP; Playwright E2E at green; bundle size regression < 5% per page.

---

## 14. Phase 7 — Continuous Learning & Synergy Loop (always-on)

**Goal:** PRISM mill AGI improves every shift, not every release.

### P7.1 — Production feedback intake
Every shop-floor job run by JM Die (or any production tenant) emits an `ActualJobResult` event:
```json
{
  "job_id": "JMD-2026-04-17-A001",
  "operation": "rough_pocket",
  "strategy": "adaptive_clearing",
  "predicted_cycle_min": 14.2,
  "actual_cycle_min": 15.8,
  "predicted_tool_life_min": 60,
  "actual_tool_life_min": 54,
  "predicted_ra_um": 1.6,
  "actual_ra_um": 2.1,
  "scrap": false,
  "notes": "slight chatter on final pass — reduced to 4500 RPM"
}
```
Flow: MCP → `ObservationIntakeEngine` → `MillMetaLearningEngine` (P0.5) → posterior update + retrain trigger + tribal-tip candidate.

### P7.2 — Tribal-tip auto-promotion queue
Meta-learner queues high-confidence rules for human review. `/reflect-tips` slash command surfaces queue; promoted tips enter `TribalKnowledgeEngine.KNOWLEDGE_BASE` with provenance.

### P7.3 — SVI coupling (from UNIVERSAL plan 0.14)
Every mill decision that degrades Ψ (system variability index) below threshold gets surfaced as a milestone to add; every decision that raises Ψ gets celebrated in session close-out report.

### P7.4 — Cross-session synergy
`AGENT_WORKBOARD.json` + `ACTIVE_WORK_REGISTRY.json` (U-AWR25) guarantees that a mill-AGI insight found in session N-1 is injected into session N's startup context. No insight loss across compactions.

### P7.5 — Monthly audit
Scripted report: AGI reasoning depth trend, neural model accuracy trend, tribal-tip promotion rate, production outcome distribution, synergy graph density. Surfaced as `data/reports/mill-agi-<YYYY-MM>.md`.

**Exit gate (Phase 7):** first full month of production feedback integrated; ≥10 auto-promoted tribal tips; neural-model accuracy improved ≥5% over baseline; zero regression in S(x).

---

## 15. Dependency Order & Parallelization

```
P0 (AGI substrate)  ──►  P1 (Strategy)  ──►  P5 (CAMX completion) ──►  P6 (Frontend)
                         ├─►  P2 (Milling hardening)
                         ├─►  P3 (Mill-Turn hardening)
                         └─►  P4 (5-axis hardening)

P7 (Continuous learning) runs parallel once P0 ships.
```

- **P2 / P3 / P4 are parallel** after P1 ships — 3 tracks can run with 3 agents.
- **P6 gates on P5 finishing** (front-end audit is meaningless while backend still moves).
- **P7 is always-on** — kicks in the moment P0.5 ships and continues through all subsequent phases.

---

## 16. Enforcement & Synergy Laws (mandatory on every phase)

### Law 1 — Awareness-before-action
Every mill dispatcher action MUST call `consultAwareness()` (U-AWR12) before engine execution. Hook: `hook_mill_awareness_required` (PreTool on `*Dispatcher.ts` action handlers).

### Law 2 — Reasoning-trace-or-deny
Every engine producing a numeric decision MUST return a reasoning trace with ≥3 steps. Hook: `hook_reasoning_trace_required` (PostTool on engine invocations).

### Law 3 — Formula-citation-required
Every numeric output must cite at least one formula registry ID. No hardcoded numbers in engine bodies (canonical constants only). Hook: `hook_formula_citation_guard` (PreCommit).

### Law 4 — Synergy-first
Before creating a new engine, `unifiedAwarenessOrchestrator.checkBeforeCreating()` MUST return non-duplicate. Hook: `hook_synergy_check` (PreTool Write on engine files).

### Law 5 — Frontend-aware-output
Every engine response carries `_awareness` + `_reasoning` + `_provenance` keys — frontend depends on these. Enforced by TS response type `AgiEngineResponse<T>`.

### Law 6 — Feedback-or-it-didn't-happen
Production runs MUST emit `ObservationIntake` events for every engine that made a prediction. Hook: `hook_observe_or_fail` (PostCompact).

### Law 7 — Ledger append
Every AGI subsystem (reasoning, neural, meta-learning, deep-logic, awareness) keeps append-only JSONL ledger with SHA256 checksum chain. Rotated nightly.

---

## 17. Artifact Manifest (per-phase)

### Phase 0 deliverables (AGI Foundation)
- 18 new engines (`MillingReasoningDefaultEngine`, `DeepLogicTraceEngine`, `MillMetaLearningEngine`, + 15 more)
- 5 ONNX neural models with training scripts + provenance docs
- 11 dispatcher adoption upgrades
- 14 hooks (awareness, reasoning, logic, synergy, ledger)
- 8 slash commands (`/agi-reason`, `/agi-reflect`, `/agi-trace`, `/agi-counter`, `/agi-explain`, `/agi-manifest`, `/agi-observe`, `/reflect-tips`)
- 7 state files (ledgers + manifest)

### Phase 1 deliverables (Strategy Foundation)
- `StrategyTaxonomyEngine` v2 (12 new methods)
- `MillStrategyNeuralEngine` live inference
- `OptimalStrategySelectionEngine` v2 rewrite
- `UpstreamValidationHandshakeEngine` (new)
- 40+ test files

### Phases 2 / 3 / 4 deliverables (machine-family hardening)
- 78 new engines (24 mill + 28 mill-turn + 26 5-axis)
- 820 new unit tests + 75 integration tests
- 24 slash commands (8 per family)
- 18 hooks
- 6 dispatchers (extended)
- 40+ test fixtures (real JM DIE parts)

### Phase 5 deliverables (CAMX completion)
- 9 per-CAM infrastructure engines
- Cost-optimal + safety-first decision v2 with live feedback
- Self-learning optimizer closed loop
- 13 pipeline uplift sub-milestones
- 250+ tests

### Phase 6 deliverables (Frontend + Codex Audit)
- `CODEX_APP_BUILD_AUDIT_2026-XX-XX.md` (60+ findings)
- 8 new mill-AGI pages
- 14 upgraded pages
- 32 new MCP endpoints
- E2E Playwright gauntlet (≥25 flows)
- Bundle / accessibility reports

### Phase 7 deliverables (Continuous Learning)
- `ObservationIntakeEngine`
- `/reflect-tips` slash command
- Monthly audit script
- SVI coupling on mill decisions
- Cross-session synergy wire

---

## 18. Risk Register

| Risk | Mitigation |
|---|---|
| **Neural model training data scarcity** (JM DIE 24k programs are small for a Transformer) | Synthetic augmentation from CAM_STRATEGY_DB + MIT OCW + tribal tips; start with small models |
| **AGI reasoning latency** (chain-of-thought adds >500ms) | Cache reasoning templates per-engine; use inference only for novel inputs |
| **Meta-learning divergence** (bad actuals corrupt priors) | Outlier filter + human review gate before tribal-tip promotion |
| **Front-end rewrite risk** (Codex app has state mgmt duplication) | Audit-first, fix in-place, no rewrite; incremental migration |
| **CAMX per-CAM coverage drift** (vendor APIs change) | Add per-CAM integration tests run on CI |
| **MCP action explosion** (+480 actions) | Action-registry dedup in forge-quint blocks new action if >0.85 similar |
| **Hook ordering races** (see UNIVERSAL plan Pass 6) | Extend `HOOK_ORDER_REGISTRY` to include mill-AGI hooks with explicit priority |
| **Codex app build divergence from MCP backend** | Frontend contract test in CI — fails if MCP schema ≠ UI expectations |

---

## 19. Milestone IDs & Roadmap Index Registration

Register the following new milestone IDs in `mcp-server/data/roadmap-index.json`:

```
MILL-AGI-P0  (18 engines + 5 models + 14 hooks)        — 62 units
MILL-AGI-P1  (4 engines + wiring + tests)              — 22 units
MILL-AGI-P2  (24 engines + 820 tests — folds MILL-MS)  — 113 units
MILL-AGI-P3  (28 engines + 220 tests — folds MT-MS)    — 138 units
MILL-AGI-P4  (26 engines + 300 tests — folds 5AX-MS)   — 125 units
MILL-AGI-P5  (CAMX MS3-22 + V17 P0B-P11)               — 300 units
MILL-AGI-P6  (audit + 8 new pages + 14 upgrades)       — 85 units
MILL-AGI-P7  (continuous loop — always on)             — ∞
```

Total registered units: **845** (excluding P7 continuous).

All prior `MILL-MS*` / `MT-MS*` / `5AX-MS*` / most `CAMX-*` / `CAMX-V17-*` milestones flagged as **`superseded_by: MILL-AGI-P*`** and retired from active backlog.

---

## 20. How This Plan Talks to Every Other System

### ↔ mcp-server/src/engines (physics + decision)
Every phase lands engines in `src/engines/` following standard conventions (PascalCaseEngine.ts, singleton export, companion test, JSDoc, canonical constants, AtomicValue return). Phase 0 AGI engines sit alongside existing engines — no parallel hierarchy.

### ↔ mcp-server/src/tools/dispatchers (MCP surface)
All 8 mill-relevant dispatchers get awareness middleware (P0.1), +480 actions across phases, consistent `_awareness` / `_reasoning` / `_provenance` response envelope.

### ↔ mcp-server/src/registries (canonical sources)
All new formulas register with `FormulaRegistry`. All new Kienzle/Taylor with `MaterialRegistry`. No inline constants (Law 3).

### ↔ mcp-server/src/algorithms (canonical math)
Neural inference sits under `src/algorithms/neural/` alongside existing Kienzle / SLD / MonteCarlo / Bayesian. No duplication.

### ↔ mcp-server/src/routes (HTTP surface)
Every MCP action → REST endpoint via existing `prism_*` tool proxy (src/index.ts:459-489). P6 adds 32 new endpoints.

### ↔ cad-engine (document learning)
P0.7 finishes the catalog / video / OCR / DXF / Office / MachineLog extraction pipelines. Feeds neural training data and tribal tips.

### ↔ web + mcp-server/web (Codex frontend)
Phase 6 closes the loop. Audit → gap filing → page upgrades → new pages → regression gauntlet.

### ↔ state/shared/* (cross-session truth)
Extends existing `ACTIVE_WORK_REGISTRY.json`, `AGENT_WORKBOARD.json`, `FILE_LOCKS.json`, `AGENT_COORDINATION_STATUS.json` with AGI ledgers (`REASONING_TRACE_LEDGER.jsonl`, `OBSERVATION_INTAKE.jsonl`, `NEURAL_INFERENCE_LEDGER.jsonl`, `META_LEARNING_POSTERIORS.json`). No parallel truth files.

---

## 21. Rollout & Validation

### Staged rollout (10% → 50% → 100%)
Same pattern as UNIVERSAL plan Phase 0.16. `PHASE_CANARY.flag` controls whether AGI middleware activates for 10% / 50% / 100% of dispatcher calls.

### Validation gauntlet (per phase)
1. `npm run build:verify` — TS green
2. `npx vitest run` — 100% test pass
3. `/prism-review` — 3-agent team review
4. `/physics-verify` — physics-reviewer PASS
5. `/svi` — Ψ delta non-negative
6. Integration test on 10 JM DIE parts (real data)
7. Frontend E2E (P6+) — Playwright green
8. Manual SHOP review — operator sign-off on representative part

Each phase commit includes the 8-point gauntlet result as a file in `data/gauntlet/<phase>-<date>.json`.

---

## 22. Open Questions (surface for user decision)

1. **Training compute**: neural models in P0.3 need ~30 GPU-hours to train. Use cloud (Modal / Replicate / RunPod) or local CUDA host?
2. **Codex app ownership boundary**: frontend audit in P6 is read-only by default. If audit finds a P0-class defect in the frontend, do we fix in-place or escalate to Codex?
3. **Tenant model for P7 continuous learning**: is JM Die the only source of actuals, or do we pool across future tenants? (Data privacy implications.)
4. **Neural model licensing**: ONNX runtime is Apache-2. OK. Training pipeline may touch HuggingFace transformers — confirm no GPL contamination.
5. **Roadmap-index schema**: adding `MILL-AGI-P*` milestones requires schema versioning per UNIVERSAL 0.17. Confirm schema v2 is the landing target.

---

## 23. Next Actionable Step

Pending user approval, the first deployable increment is **P0.1 — Awareness-first dispatcher middleware adoption** across 8 mill-relevant dispatchers (the middleware itself already exists from U-AWR12). Estimated 4-6 hours, ships:

- 8 dispatcher PRs adding `consultAwareness()` to their action handlers
- 24+ tests verifying the middleware is actually called
- Latency dashboard showing p99 awareness-consult latency
- One new slash command: `/agi-audit <dispatcher>` — reports middleware adoption %

On that base, P0.2 (Reasoning Integration) lights up next session.

---

**End of roadmap.** This file supersedes `MILL-AI-INTEGRATION-ROADMAP-v4.md`, `MILLING-COMPREHENSIVE-ROADMAP.md`, `MILL-TURN-COMPREHENSIVE-ROADMAP.md`, `FIVE-AXIS-COMPREHENSIVE-ROADMAP.md`, and all `CAMX-*` / `CAMX-V17-*` sections of `PRISM-UNIFIED-ROADMAP-v2.md` for mill-domain work. Prior files remain as historical references but should not be used to plan new work.
