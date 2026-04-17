# PP-MASTER-UNIFIED-ROADMAP — Post-Processor AGI Pipeline (10-Stage)

**Date:** 2026-04-16
**Version:** v1.0 (master consolidation, supersedes all prior PP roadmaps)
**Authority:** Canonical post-processor roadmap. All prior PP roadmaps are FROZEN as source material.
**Omega Target:** **1.0** (every stage, every milestone, every unit — no exceptions)
**Quality Reference:** `UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN-2026-04-15.md` (identical rigor, identical scrutiny depth)
**Frontend Reference:** `SCRUTINY-R5-CODEX-FRONTEND-UNIVERSAL-ALIGNMENT-2026-04-16.md` (Universal Phase 0 + Calculator 6-mode)

---

## PROVENANCE — SOURCE ROADMAPS CONSOLIDATED

| Source Roadmap | Size | Status | Contribution |
|---|---|---|---|
| `PP-AGI-MAXOUT-ROADMAP-2026-04-15.md` | 850 LOC / 94 MS / 2,810→210 engines | FROZEN | Deep-learning architecture, 10-phase structure, dimensional analysis |
| `PP-AGI-MAXOUT-SCRUTINY-CONSOLIDATED-2026-04-15.md` | 447 LOC / 8 scrutiny passes | FROZEN | 104 gap findings, 30% asset utilization, 77.6% dedup |
| `data/docs/roadmap/PP-MAXIMIZATION-ROADMAP.md` | 872 LOC / 12 MS / 48 units | FROZEN | Canonical Kienzle hardening, CPS parser, machine fingerprinting, UI |
| `data/docs/roadmap/PP-REVENUE-ROADMAP.md` | 574 LOC / 8 MS / 42 units | FROZEN | 4-tier pricing ($79/$199/$499 + Free), quotas, licensing, GTM |
| `data/milestones/PPG-BASELINE-v11-ROADMAP.md` | 2,814 LOC / 1 MS / 45 units / 43 bugs | FROZEN | HURCO VM30i v11 as definitive milling-post reference |
| `PP-HARDENING-ROADMAP.md` | 4 LOC | FROZEN | Deprecated placeholder (historical marker only) |

**Total source material consolidated:** 5,561 LOC across 5 authoritative documents + 8 scrutiny passes.

---

## EXECUTIVE SUMMARY

PRISM's post-processor (PP) subsystem becomes a **near-AGI code generator** for 860 CNC machine models × 173 controller dialects × 750 materials × 150 toolpath strategies × 10-dimension safety envelope — yielding **4.7 × 10^18 practical program permutations**. The system fuses four cognition layers:

| Cognition Layer | Examples | PP Role |
|---|---|---|
| **Deep Learning** | PINN (physics), Transformer (G-code), GNN (collision), RL (toolpath) | Generate, optimize, predict |
| **Deep Reasoning** | Tree-of-Thought, Chain-of-Thought, Counterfactual, Hypothesis Ranker | Decide, explain, reflect |
| **Deep Logic** | SMT/Z3 collision proofs, TLA+ concurrency proofs, symbolic execution | Verify, prove, guarantee |
| **Neural Networking** | GAT, Diffusion, LoRA adapters, cross-transfer, meta-learning | Transfer, adapt, learn fast |

### Numeric Targets

| Metric | Baseline (2026-04-16) | Target (end of Stage 10) | Delta |
|---|---|---|---|
| PP engines (wired) | 4 / 1,869 | 210 / 2,079 | +206 |
| Dispatchers | 84 (1 `ppDispatcher` exists, 0 PP-AGI) | 85 (`ppDispatcher` 180+ actions) | +180 actions |
| PP neural engines | 81 (75,449 LOC, 0% wired) | 81 wired + 6 dormant giants | 100% utilization |
| Controller dialects | 9 families | 173 dialects | +164 |
| Machine models covered | 232 profiles | 860 | +628 |
| Materials | 6,372 DB / 254 wired | 6,372 DB / 750 wired | 3x wiring |
| Collision coverage | 56% ready | 100% ready (10-dim S(x)) | +44% |
| MIT courses integrated | 9 / 225 | 225 / 225 | 100% |
| Tribal tips wired | 899 / 4,493 (20%) | 4,493 / 4,493 (100%) | 5x |
| Formulas wired | 254 / 509 (50%) | 509 / 509 (100%) | 2x |
| Algorithms wired | 21 / 53 (40%) | 53 / 53 (100%) | 2.5x |
| Test coverage | 1,255 pass / 1,255 | 2,305 pass / 2,305 | +1,050 |
| PP formal verification | 0 proofs | 180 Z3/TLA+ proofs | +180 |
| Calculator modes | 2 (mill/lathe partial) | 6 (mill/lathe/edm/wire_edm/laser/waterjet) | +4 |
| PPG wizard steps | 3 partial | 8 full (per /wire-edm-studio template) | +5 |
| Revenue tiers | 0 | 4 (Free / $79 / $199 / $499) | $0 → mrr |
| Omega | 0.87 sample | **1.0** | + |

### Pipeline Shape (10 Stages)

```
STAGE 1  →  STAGE 2  →  STAGE 3  →  STAGE 4  →  STAGE 5
Pre-Flight   Physics     Neural     Fabric     Toolpath
Phase 0      Canonical   DL Core    M×C×Mat    RL+Opt
                                               ↓
STAGE 10 ←  STAGE 9  ←  STAGE 8  ←  STAGE 7  ←  STAGE 6
Launch+CL   Revenue    Validate    Frontend    Reason+Logic
                       E2E+POC     Calc+PPG    SMT/Z3/ToT
```

---

## I. CURRENT STATE ANALYSIS (2026-04-16 baseline)

### I.1 PP Neural Inventory (81 engines, 75,449 LOC — 0% wired, 100% dormant)

Dormant neural giants flagged by Pass 8 scrutiny, to be wired in Stage 1:

| Engine | LOC | Usages | Capability |
|---|---|---|---|
| `PostProcessorDeepIntelligenceEngine` | 2,656 | 0 | 8-domain deep reasoning over post output |
| `PostProcessorNeuralNetworkEngine` | 1,823 | 0 | Multi-layer perceptron for post metadata |
| `PostProcessorTransformerEngine` | 1,033 | 0 | 512-dim G-code sequence transformer |
| `PostProcessorUnifiedDeepReasoningEngine` | 1,248 | 0 | ToT+CoT+counterfactual fusion |
| `PostProcessorPipelineEngine` | 38 stages | partial | Central orchestrator |
| `FeatureStrategyKnowledgeBaseEngine` | 121 KB | 0 | Strategy picker |
| `TroubleshootingAssistantEngine` | 120 KB | 0 | 8-domain root cause |
| `CrossDisciplinaryFormulaIntegrationEngine` | 80 KB | 0 | 6,582 formulas / 15 domains |
| `CrossDisciplinaryDeepLearningEngine` | 72 KB | 0 | 107 MIT courses |
| `ManufacturingKnowledgeGraphEngine` | 68 KB | 0 | NL graph queries |
| `KnowledgeGraphEngine` | 49 KB | 0 | Graph traversal |

### I.2 PP Dispatcher (`ppDispatcher.ts`) Current Action Surface

Per R4-FIX-3+5 (commit in progress session-10928), `ppDispatcher.ts` now has ~180 deduplicated actions routing to ~50 PP validator/analysis/post engines. Latest additions (this session track): `pp_cham_*` (3) for `PPInlineCornerBreakValidatorEngine`.

### I.3 Frontend State (per SCRUTINY-R5)

- **134 pages / 170 components / 87 API clients**
- **CalculatorPage.tsx**: 13,400 LOC / 665 KB — catastrophically monolithic
- **Mill tab**: 0 sub-panels (vs lathe's 7) — shallow
- **Mode-switch hygiene**: buggy (mode change doesn't reset dependent state)
- **6-mode matrix**: mill / lathe / edm / wire_edm / laser / waterjet
- **WEDM Studio wizard**: 6-step (template for other studios)
- **PostProcessorGeneratorPage**: exists (stub), needs PPG wizard integration

### I.4 Data Availability

- **24,545 JM DIE programs**: 0 labeled (P0 blocker for training)
- **36,929 total G-code programs across JM DIE + CAM archives**
- **180+ Fusion `.cps` files**: parseable with PP-MS1 CPS parser (blocked)
- **232 fully-profiled machines**: fingerprint matching target
- **6,372 materials + 95,608 tools DB**: partially wired
- **43 known HURCO VM30i v11 bugs**: documented in PPG-BASELINE as reference post

### I.5 Scrutiny Scorecard (8 passes, consolidated)

| Pass | Score | Status |
|---|---|---|
| P1 Duplication | 77.6% redundant | MUST dedup before scaffolding |
| P2 Wiring | 9.8% forward | MUST wire before building new |
| P3 Physics | 75/100 | Missing: process damping, Archard, MDOF |
| P4 Neural | 4/10 | Missing: weight persistence, GPU, SO(3) |
| P5 Safety | 56% | Missing: CCD, GJK, Z3, Swiss 40% gap |
| P6 Operational | 1/10 | Missing: rollback, canary, monitoring, $170K-700K GPU |
| P7 Completeness | 104 gaps | 28 P0, 47 P1, 29 P2 |
| P8 Asset Utilization | 30% used | 1,309 engines dormant, 216 MIT courses unused |

**Verdict:** Wire existing 175,000+ assets FIRST. Every stage enforces `/dedup` before scaffolding. 70% of "new" work in prior PP-AGI-MAXOUT was duplicate of existing PRISM assets.

---

## II. AGI COGNITION LAYER ARCHITECTURE

The master pipeline fuses four cognition layers. Each stage declares which layer(s) it builds or extends.

### II.1 Deep Learning Layer (DL)

| Component | Architecture | Parameters | Trained On | Stage |
|---|---|---|---|---|
| G-code Transformer | 512-dim, 12-layer, 8-head | 50M | 36,929 programs + synthetic 10M | 3 |
| Controller Embedding | 173 dialects × 128-dim | 22K | controller_manuals.jsonl | 4 |
| Physics-Informed NN (PINN) | Chatter, wear, force, temp, deflection | 10-100M each | Kienzle + Taylor + Johnson-Cook | 2 |
| Collision GNN (Graph Attention) | 5-layer GAT, 256-dim | 300M | synthetic collision scenarios | 5, 7 |
| Toolpath RL (PPO) | Actor-critic, 1M env steps | 20M | simulated machining | 5 |
| CAD/CAM Multi-modal Encoder | STEP + DXF + mesh + G-code | 200M | 180+ CPS files + STEP library | 3 |
| LoRA Adapters | Per machine family (r=8) | 500K each | customer data on-demand | 10 |
| Diffusion (toolpath synthesis) | 128-step DDPM | 100M | 10M synthetic paths | 5 |

### II.2 Deep Reasoning Layer (DR)

| Pattern | PRISM Engine | PP Role | Stage |
|---|---|---|---|
| Tree-of-Thought | `TreeOfThoughtEngine` (exists) | Multi-hypothesis post strategy | 6 |
| Chain-of-Thought | `ChainOfThoughtEngine` (exists) | Sequential per-block optimization | 6 |
| Counterfactual | `CounterfactualReasoningEngine` (exists) | "What if feed was 10% lower?" | 6 |
| Hypothesis Ranker | `HypothesisRankerEngine` (exists) | Rank candidate posts | 6 |
| Reflection | `ReflectionEngine` (exists) | Post-hoc self-critique | 6 |
| Creative Synthesis | `PRISMCreativeReasoningEngine` (exists, 6 modes, 15 domains) | Novel post strategies | 6 |
| Multi-Path | `MultiPathReasoningEngine` (exists) | Parallel exploration | 6 |

**Critical:** Do NOT create new reasoning engines. Phase 8 of PP-AGI-MAXOUT was DELETED (100% duplicate). Wire existing.

### II.3 Deep Logic Layer (DL-Logic, formal verification)

| Method | Tool | Property Proved | Stage |
|---|---|---|---|
| SMT (Z3) | z3-solver via WASM | Collision-free motion (over all initial states) | 5 |
| TLA+ | apalache | Concurrent channel sync (mill-turn) | 5 |
| Symbolic Execution | custom `SymbolicPostExecutor` | Path coverage of post pipeline | 6 |
| Refinement Types | custom `RefinementTypeChecker` | Feed ≤ machine max_feed per axis | 5 |
| Dimensional Analysis | `DimensionalAnalysisEngine` (exists) | Units consistent across every formula | 2 |

**Target:** 180 formal proofs (60 safety, 60 physics, 60 controller dialect). Each proof lands as a passing test.

### II.4 Neural Networking Layer (NN-Net, transfer + adaptation)

| Capability | Mechanism | Stage |
|---|---|---|
| Cross-machine transfer | Shared backbone + LoRA adapter per machine | 3, 10 |
| Meta-learning | MAML over machine families | 10 |
| Zero-shot controller | Prompt-based inference on unseen dialect | 4 |
| Continuous learning | On-device LoRA fine-tune from customer G-code | 10 |
| Federated aggregation | FedAvg with DP noise (optional, P2) | 10 |

---

## III. 10-DIMENSIONAL VARIABILITY FABRIC (cross-cutting)

The PP must generate valid output for every cell of the following tensor. Stage 3 builds the fabric engine; later stages densify it.

| Dimension | Count | Source of truth | Stage wired |
|---|---|---|---|
| **Machine model** | 860 | `src/registries/machineRegistry.ts` + `mcp-server/data/machine-profiles/` | 3 |
| **Controller dialect** | 173 | `ControllerDialectRegistry` (to create in Stage 4) | 4 |
| **Tool SKU** | 105,000 | `ToolCatalogEngine` (exists, 95,608 wired) | 3 |
| **Holder** | 12,000 | `HolderRegistry` | 3 |
| **Turret/spindle config** | 30 | per-machine profile | 3 |
| **Fixture/workholding** | 200 | `FixtureRegistry` | 3 |
| **Material** | 750 | `MaterialRegistry` (6,372 DB, 750 wired target) | 3 |
| **Coolant** | 40 | `CoolantRegistry` | 7 |
| **Toolpath strategy** | 150 | `ToolpathStrategyRegistry` | 5 |
| **Kinematics** | 30 | `KinematicsRegistry` (3/4/5-axis, Swiss, mill-turn) | 3 |
| **Safety envelope** | 10 dims | S(x) extended in Stage 6 | 6 |

**Practical permutations** (not cartesian, constrained by compatibility graph): **4.7 × 10^18**.

---

## IV. FRONTEND INTEGRATION (Calculator 6-mode + PPG wizard)

Per `SCRUTINY-R5-CODEX-FRONTEND-UNIVERSAL-ALIGNMENT-2026-04-16.md`:

### IV.1 Calculator Mode Matrix (Stage 8)

| Mode | Current State | Target (Stage 8) | Template |
|---|---|---|---|
| `mill` | 0 sub-panels (shallow) | 7 sub-panels parity with lathe | /mill-studio |
| `lathe` | 7 sub-panels | 7 + post-preview pane | /lathe-studio |
| `edm` (sinker) | missing | 6 sub-panels | /sinker-edm-studio |
| `wire_edm` | partial | 6 sub-panels | /wire-edm-studio (template) |
| `laser` | missing | 5 sub-panels | /laser-studio (new) |
| `waterjet` | missing | 5 sub-panels | /waterjet-studio (new) |

### IV.2 PPG Wizard (8-step, Stage 8)

Derived from `/wire-edm-studio` 6-step template + post-processor specifics:

1. **Select Machine** → `MachineFingerprintEngine` (PP-MS3)
2. **Select Controller** → `ControllerDialectEngine` (Stage 4)
3. **Select Features** → 4-category toggle (basic, advanced, probing, high-speed)
4. **Upload CPS / Seed** → `PostCPSParserEngine` (PP-MS1)
5. **Generate Post** → `PostProcessorPipelineEngine` (38 stages)
6. **Validate** → `PostValidationSuiteEngine` + `PostValidationHardeningEngine`
7. **Prove-Out** → `ProveOutModeEngine`
8. **Download** → `PostDownloadEngine` (.nc/.tap/.mpf/.h/.eia/.zip)

### IV.3 Frontend Component Manifest (Stage 8)

| Component | Status | Stage |
|---|---|---|
| `CalculatorPage.tsx` refactor (split 13.4k LOC) | needs decomposition | 8 |
| `PostProcessorGeneratorPage.tsx` | stub | 8 |
| `ppg/MachineSelector.tsx` | missing | 8 |
| `ppg/ControllerFingerprint.tsx` | missing | 8 |
| `ppg/FeatureToggleMatrix.tsx` | missing | 8 |
| `ppg/GcodeComparisonPanel.tsx` | missing | 8 |
| `ppg/PostPreviewComponent.tsx` | missing | 8 |
| `ppg/PostLibraryUI.tsx` | missing | 8 |
| `ppg/ValidationReportPanel.tsx` | missing | 8 |
| `ppg/ProveOutToggle.tsx` | missing | 8 |

---

## V. STAGE PATTERN (applied uniformly to all 10 stages)

Every stage follows the same skeleton — modeled on `UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN-2026-04-15.md` (Phase 0 awareness transactional layer):

```
STAGE N — <Name>
  N.0  Scrutiny prerequisites (blocking gate before any unit)
       - /dedup sweep against existing 1,869 engines + 509 formulas
       - Read PRISM-SELF-AWARENESS-DIRECTIVE + recent commits
       - Asset-utilization check (dormant engines that solve this?)
  N.1-N.6  Milestones (MS0-MSN), each with:
       - Units (U-*, 2-6 per milestone)
       - File manifest (FILES_CREATED / FILES_MODIFIED)
       - Abort criteria (hard fail conditions that trigger rollback)
       - Rollback command (one-line git checkout or rm)
  N.7  AGI layer bindings (which cognition layer(s) this stage activates)
  N.8  Frontend bindings (which UI components depend on this stage)
  N.9  Exit gates (~16 items, matching RGS quality standard)
  N.10 Omega contribution (target ≥ 1.0)
  N.11 Revenue hooks (which pricing tier unlocks after this stage)
```

### V.1 Exit Gate Template (16 items, canonical)

Every stage's exit gate MUST satisfy all 16 items:

1. All units completed with commit messages `LAYER-PHASE-UNIT: title — summary`
2. All new engines pass `/dedup` (similarity < 85%)
3. All new engines wired to a dispatcher action with Zod schema
4. All new dispatcher actions in z.enum + switch + getEngine case
5. `npm run build:fast` green (< 5s)
6. `npm run build:verify` (full tsc) green (< 45s)
7. `npx vitest run` green (zero regressions)
8. Test coverage ≥ baseline + (new engine LOC × 0.6) lines of test
9. Anti-regression: action count non-decreasing in every dispatcher
10. Physics citations: every formula has `// citation: Author Year, page X`
11. AGI layer claim validated (DL / DR / DL-Logic / NN-Net target hit)
12. Frontend component (if any) passes Vite build + no TS errors
13. Stage-scoped scrutiny pass (8 passes, ≥ 90/100 each)
14. State file written: `state/milestones/PP-STAGE-<N>-STATE.json` schemaVersion stamped
15. Self-awareness directive updated (new engines surfaced)
16. Omega recomputed and ≥ 1.0

### V.2 Scrutiny Gate Template (per stage)

Each stage completes 8 scrutiny passes before exit:

| Pass | Focus | Failure threshold |
|---|---|---|
| 1 | Duplication | > 20% overlap with existing |
| 2 | Wiring | < 95% forward coverage |
| 3 | Physics rigor | < 85/100 |
| 4 | Neural architecture | < 7/10 |
| 5 | Safety / collision | < 90% applicable dimensions |
| 6 | Operational integrity | < 8/10 (rollback, canary, monitoring) |
| 7 | Completeness / edge cases | > 3 P0 open |
| 8 | Asset utilization | < 90% of related dormant engines wired |

---

## VI. STAGE 0 — PRE-FLIGHT (prerequisite to Stage 1)

**Purpose:** Unblock Stage 1 by wiring dormant assets, laying infrastructure, labeling data, and enforcing awareness. Mirrors UNIVERSAL Phase 0 (0.1-0.25).

**Status:** in-progress. Current commit `e070aaae` (CPP-MS3-S7) classified 68 state files — feeds Stage 0.

### PP-STAGE-0-MS0: Asset Wiring Sprint (3 weeks — blocks all stages)

| Unit | Task | Hours | Dormant asset wired |
|---|---|---|---|
| U-S0-01 | Export 1,309 orphaned engines | 4 | all unnamed orphans |
| U-S0-02 | Wire 6 dormant giants via `ppDispatcher` + `intelligenceDispatcher` | 8 | 6 engines, 554 KB total |
| U-S0-03 | Integrate 216 dormant MIT courses → tribal tips | 40 | 216 courses |
| U-S0-04 | Activate 3,594 dormant tribal tips via `TribalTipsLookupEngine` | 16 | 3,594 tips |
| U-S0-05 | Wire 255 dormant formulas via `FormulaRegistry.register()` | 24 | 255 formulas |
| U-S0-06 | Wire 32 dormant algorithms via `AlgorithmRegistry.register()` | 16 | 32 algorithms |
| U-S0-07 | Wire 21 reasoning engines → `intelligenceDispatcher` actions | 8 | 21 engines |
| U-S0-08 | Export 37 unwired PP engines | 1 | 37 PP engines (includes 81 PP neural) |

**Exit gate PP-STAGE-0-MS0:**
- [ ] `npm run build:verify` green
- [ ] All 1,309 + 6 + 21 + 37 engines appear in `SYSTEM_ARCHITECTURE.json` with `wired: true`
- [ ] `duplicationGuardEngine.getAllAssets()` returns count ≥ baseline + 1,373
- [ ] All 255 formulas invocable via `FormulaRegistry.get(id).compute(...)`
- [ ] 8-pass scrutiny on this milestone ≥ 90/100 per pass

### PP-STAGE-0-MS1: Data Labeling Infrastructure (6 weeks)

| Unit | Task | Hours |
|---|---|---|
| U-S0-10 | `PostDataLabelingEngine` — label schema, auto-labeler, CLI | 16 |
| U-S0-11 | Label 24,545 JM DIE programs (machine / controller / material / outcome) | 800 (automated + 200 human-review) |
| U-S0-12 | `PostDataQualityEngine` — label confidence, outlier detection | 16 |
| U-S0-13 | Train/val/test split frozen as `data/pp-training/splits.json` | 4 |
| U-S0-14 | `PostDataVersioningEngine` — dataset versioning, DVC integration | 16 |
| U-S0-15 | Synthetic program generator — `SyntheticPostGeneratorEngine` (target 10M) | 80 |

**Exit gate PP-STAGE-0-MS1:**
- 24,545 programs labeled, label coverage ≥ 95%
- Label confidence mean ≥ 0.85
- 10M synthetic programs generated, distribution-matched to real
- 8-pass scrutiny ≥ 90/100 per pass

### PP-STAGE-0-MS2: Training Infrastructure (4 weeks)

| Unit | Task | Hours |
|---|---|---|
| U-S0-20 | `PPTrainingPipelineEngine` — DDP, checkpointing, mixed-precision | 40 |
| U-S0-21 | `PPEvaluationHarnessEngine` — held-out metrics, regression detection | 24 |
| U-S0-22 | `PPModelRegistryEngine` — version, artifact, provenance, rollback | 24 |
| U-S0-23 | `PPDeploymentEngine` — canary, shadow, A/B, blue-green | 32 |
| U-S0-24 | `PPMonitoringEngine` — latency, accuracy drift, alert rules | 24 |
| U-S0-25 | `PPLatencyBudgetEngine` — per-dispatcher budgets, SLO enforcement | 16 |

### PP-STAGE-0-MS3: Formal Verification Infra (3 weeks)

| Unit | Task | Hours |
|---|---|---|
| U-S0-30 | `Z3CollisionProverEngine` — Z3 WASM binding | 24 |
| U-S0-31 | `TLAChannelSyncProverEngine` — apalache binding | 24 |
| U-S0-32 | `SymbolicPostExecutorEngine` — symbolic G-code executor | 40 |

### PP-STAGE-0-MS4: PRISM Integration Awareness (2 weeks)

| Unit | Task | Hours |
|---|---|---|
| U-S0-40 | Wire PP stages into `prismSelfAwarenessEngine.getPPCapabilities()` | 8 |
| U-S0-41 | Register PP SVI coupling in `SVIPsiEngine` (target Ψ ≥ 0.9) | 16 |
| U-S0-42 | Forge-quint cascade: engines ↔ skills ↔ hooks ↔ scripts ↔ docs ↔ state | 16 |
| U-S0-43 | Auto-doc: every new PP engine gets JSDoc + roadmap-index entry | 8 |
| U-S0-44 | Operational integrity: rollback automation tested on 5 synthetic failures | 16 |

**Stage 0 total effort:** 116 h (wiring) + 960 h (data labeling, mostly automated) + 160 h (infra) + 88 h (formal) + 64 h (PRISM int) = **~1,388 hours over 13-15 weeks**.

**Stage 0 Exit Gate (all 16 items MUST pass):** Stage 0 is the only stage allowed to slip; every later stage blocks on its completion.

---

## VII. STAGE 1 — PHYSICS FOUNDATIONS & CANONICAL HARDENING

**Purpose:** Make every physics formula in every PP engine canonical, cited, dimensional-analysis-verified. Retire inline Kienzle/Taylor. Hardening per PP-MS0 of `PP-MAXIMIZATION-ROADMAP.md`.

**AGI Layer:** Deep Logic (dimensional analysis + refinement types)
**Frontend Binding:** none (infrastructure)
**Revenue Tier Unlocked:** Free tier can display canonical physics citations

### PP-STAGE-1-MS0: Kienzle / Taylor / Johnson-Cook canonicalization

**Source roadmap:** PP-MAXIMIZATION-ROADMAP PP-MS0 (canonical P=1800 hardening)

| Unit | Task | Files |
|---|---|---|
| U-S1-01 | Audit all 499 formulas for inline constants; replace with `constants.ts` imports | grep pattern `const kc1_?1 = \d+` across src/** |
| U-S1-02 | Add citation header to every formula file (Author Year, page, DOI) | all `src/physics/*.ts` + formula engines |
| U-S1-03 | `DimensionalAnalysisHookEngine` — block commit if formula fails DA | `src/hooks/dimensionalAnalysisHook.ts` |
| U-S1-04 | `RefinementTypeCheckerEngine` — enforce feed ≤ machine max_feed | `src/engines/RefinementTypeCheckerEngine.ts` |
| U-S1-05 | Test suite: every formula has ≥ 3 canonical reference cases | `src/__tests__/formula-canonical-*.test.ts` |

### PP-STAGE-1-MS1: Missing Physics Models (Pass 3 gaps)

| Unit | Model | Engine | Reference |
|---|---|---|---|
| U-S1-10 | Process damping (low-RPM chatter) | `ProcessDampingPINNEngine` | Altintas et al. 2008 |
| U-S1-11 | Archard adhesive wear | `ArchardWearPhysicsEngine` | Archard 1953 |
| U-S1-12 | MDOF stability with FRF | `MDOFStabilityEngine` | Tlusty & Polacek 1963 |
| U-S1-13 | Oblique cutting model | `ObliqueCuttingEngine` | Oxley 1989 |
| U-S1-14 | Size effect correction | `SizeEffectCorrectionEngine` | Backer, Marshall & Shaw 1952 |
| U-S1-15 | Loewen-Shaw heat partition | `LoewenShawHeatPartitionEngine` | Loewen & Shaw 1954 |
| U-S1-16 | Timoshenko shear beam (L/D > 10) | `TimoshenkoShearBeamEngine` | Timoshenko 1921 |

### PP-STAGE-1-MS2: Post-Processor Canonical Pipeline (PP-MAX PP-MS0 deep-dive)

| Unit | Task |
|---|---|
| U-S1-20 | `PostProcessorCanonicalPipelineEngine` — hardcoded 38-stage baseline, no drift |
| U-S1-21 | `PostKienzleGroundTruthEngine` — P=1800 for P-group, M=2100, K=1100, N=700, S=2800, H=3200 |
| U-S1-22 | Regression: generate 100 reference programs, compare byte-for-byte against `data/pp-reference/` |
| U-S1-23 | Integrate `FormulaRegistry` lookup into every PP stage (no inline constants anywhere) |

**Exit Gate PP-STAGE-1 (16 items):**
- [ ] 0 inline Kienzle/Taylor constants in `src/**`
- [ ] Every formula file has citation + DOI
- [ ] 7 missing P0 physics models implemented and tested
- [ ] Dimensional analysis hook blocks 100% of synthetic bad formulas
- [ ] `pp_canonical_validate` dispatcher action confirms 100 reference programs byte-identical
- [ ] `npm run build:verify` green
- [ ] 8-pass scrutiny ≥ 90/100 per pass
- [ ] Omega ≥ 1.0

---

## VIII. STAGE 2 — DEEP LEARNING CORE (PINN + Transformer + GNN)

**Purpose:** Build the neural substrate. Weight persistence, GPU acceleration, SO(3), CAD/CAM encoder — all blockers from Pass 4.

**AGI Layer:** Deep Learning (PINN backbone)
**Frontend Binding:** `ppg/ModelVersionBadge.tsx` (shows active model version)
**Revenue Tier Unlocked:** Pro ($79/mo) — users can run neural-assisted posts

### PP-STAGE-2-MS0: Neural Infrastructure (Pass 4 blockers)

| Unit | Task |
|---|---|
| U-S2-01 | `ModelWeightPersistenceEngine` — safetensors + ONNX save/load |
| U-S2-02 | `GPUAccelerationEngine` — WebGPU via `@mlc-ai/web-runtime` + CUDA via onnxruntime-node |
| U-S2-03 | `SO3KinematicsEncoderEngine` — quaternion + axis-angle, 32-dim |
| U-S2-04 | `CADCAMMultiModalEncoderEngine` — STEP, DXF, mesh, G-code unified 200M-param |
| U-S2-05 | `NeuralDeterminismEngine` — seeded, golden baseline, tolerance-based assertions |

### PP-STAGE-2-MS1: Physics-Informed Neural Networks (7 PINN engines)

| Unit | PINN | Loss = data + λ·physics_residual |
|---|---|---|
| U-S2-10 | `ChatterStabilityPINNEngine` | SLD + process damping + MDOF |
| U-S2-11 | `ToolWearPINNEngine` | Taylor + Archard adhesive + abrasive |
| U-S2-12 | `CuttingForcePINNEngine` | Kienzle + oblique + size effect |
| U-S2-13 | `CuttingTemperaturePINNEngine` | Jaeger + Loewen-Shaw |
| U-S2-14 | `ToolDeflectionPINNEngine` | Euler-Bernoulli + Timoshenko |
| U-S2-15 | `SurfaceFinishPINNEngine` | Ra theoretical + regression residual |
| U-S2-16 | `ChipFormationPINNEngine` | Shear-angle + Johnson-Cook |

### PP-STAGE-2-MS2: G-code Transformer & Graph Attention

| Unit | Network | Target |
|---|---|---|
| U-S2-20 | `GcodeTransformerEngine` (extend existing `PostProcessorTransformerEngine`) | 50M params, BPE vocab |
| U-S2-21 | `ToolGNNEngine` (graph attention over tool assembly) | 200M |
| U-S2-22 | `CollisionGNNEngine` | 300M |
| U-S2-23 | `MachineKnowledgeGraphGNNEngine` — 860 machines as nodes | 100M |

### PP-STAGE-2-MS3: Training Runs & Baselines

| Unit | Task |
|---|---|
| U-S2-30 | Train all 7 PINNs on labeled + synthetic (est. 4 GPU-weeks) |
| U-S2-31 | Train G-code transformer (est. 2 GPU-weeks) |
| U-S2-32 | Train GNNs (est. 2 GPU-weeks) |
| U-S2-33 | Register models in `PPModelRegistryEngine`, deploy canary |
| U-S2-34 | Golden baselines: 1,000 held-out programs, expected outputs frozen |

**Exit Gate PP-STAGE-2 (16 items):** all PINNs ≥ 85% accuracy on held-out, G-code transformer perplexity ≤ 4.0, GNN collision recall ≥ 99%, neural tests deterministic (seeded), models saved + loadable, canary deployed.

---

## IX. STAGE 3 — MACHINE × CONTROLLER × MATERIAL FABRIC

**Purpose:** Build the 10-dimensional variability fabric. Cover 860 machines × 173 controllers × 750 materials. Fingerprinting from PP-MAX PP-MS2.

**AGI Layer:** Neural Networking (cross-machine transfer via LoRA)
**Frontend Binding:** `ppg/MachineSelector.tsx`, `ppg/ControllerFingerprint.tsx`, `ppg/MaterialPicker.tsx`
**Revenue Tier Unlocked:** Pro ($79/mo) → Production ($199/mo) — production tier unlocks full machine fabric

### PP-STAGE-3-MS0: Machine Fabric (860 machines)

**Source:** PP-MAX PP-MS2 + PP-MS3 (machine fingerprinting + selection UI)

| Unit | Task |
|---|---|
| U-S3-01 | `MachineProfileRegistryEngine` — 860 profiles, schemaV2 with 40+ fields |
| U-S3-02 | Harvest remaining 628 machine profiles from catalogs (Mazak, Haas, Okuma, DMG MORI, Mitsubishi, Makino, Hurco, Doosan, Brother, Citizen, Star) |
| U-S3-03 | `MachineFingerprintEngine` — match uploaded CPS/G-code to best profile with confidence |
| U-S3-04 | `MachineCompatibilityGraphEngine` — edge weights for tool × holder × fixture × material |
| U-S3-05 | `LoRAAdapterPerMachineEngine` — 860 adapters at r=8, trained on-demand |

### PP-STAGE-3-MS1: Controller Dialect Fabric (173 dialects)

**Source:** PP-AGI Phase 3 (CTRL), Pass 7 legacy gap

| Unit | Task |
|---|---|
| U-S3-10 | `ControllerDialectRegistryEngine` — 173 dialects with capability matrix |
| U-S3-11 | `ControllerDialectEmbeddingEngine` — 173 × 128-dim, learned |
| U-S3-12 | Legacy controllers: Fanuc 15/16i, Siemens 810D, Okuma OSP-P100 (Pass 7 P0) |
| U-S3-13 | Modern: Fanuc 30i/31i, Siemens 840D/One, Heidenhain TNC640/7, Haas NGC, Okuma OSP-P300, Mazak Smooth, Mitsubishi M700/M80, Mori SNC, Doosan Fanuc, Brother Speedio, Citizen Cincom, Star SBL |
| U-S3-14 | `ZeroShotControllerInferenceEngine` — prompt-based for unseen dialect |

### PP-STAGE-3-MS2: Material Fabric (750 materials wired)

| Unit | Task |
|---|---|
| U-S3-20 | `MaterialRegistryExtensionEngine` — wire 496 additional from 6,372 DB |
| U-S3-21 | Per-material Kienzle coefficients validated against published sources |
| U-S3-22 | Johnson-Cook parameters for 200 materials (ductile metals) |
| U-S3-23 | Material × tool compatibility matrix (carbide, ceramic, CBN, PCD, HSS) |

### PP-STAGE-3-MS3: Tool / Holder / Fixture / Kinematics

| Unit | Task |
|---|---|
| U-S3-30 | Wire 95,608 `ToolCatalogEngine` entries to PP pipeline |
| U-S3-31 | `HolderRegistryEngine` — 12K holders, toolholder-machine compatibility |
| U-S3-32 | `FixtureRegistryEngine` — 200 workholding configurations |
| U-S3-33 | `KinematicsRegistryEngine` — 30 configs (3/4/5-axis, Swiss, mill-turn, twin-spindle, sub-spindle) |

### PP-STAGE-3-MS4: CAM Bridge Completeness (Pass 7 gap)

10 CAM systems had tips only, no bridge engines:

| Unit | CAM System | Bridge Engine |
|---|---|---|
| U-S3-40 | Esprit | `EspritCAMBridgeEngine` |
| U-S3-41 | Tebis | `TebisCAMBridgeEngine` |
| U-S3-42 | Cimatron | `CimatronCAMBridgeEngine` |
| U-S3-43 | SprutCAM | `SprutCAMBridgeEngine` |
| U-S3-44 | WorkNC | `WorkNCCAMBridgeEngine` |
| U-S3-45 | BobCAD | `BobCADBridgeEngine` |
| U-S3-46 | TopSolid | `TopSolidCAMBridgeEngine` |
| U-S3-47 | SurfCAM | `SurfCAMBridgeEngine` |
| U-S3-48 | EdgeCAM | `EdgeCAMBridgeEngine` |
| U-S3-49 | CAMWorks | `CAMWorksCAMBridgeEngine` |

**Exit Gate PP-STAGE-3 (16 items):** 860 machine profiles queryable, 173 controller dialects generate valid G-code on 10 representative programs each, 750 materials with ≥ 3 physics parameters each, 10 CAM bridges each parse ≥ 5 reference programs.

---

## X. STAGE 4 — TOOLPATH & RL OPTIMIZATION

**Purpose:** Apply reinforcement learning to toolpath choice + per-block parameter optimization. Covers PP-AGI Phase 6 (PATH) + RL backbone.

**AGI Layer:** Deep Learning (RL PPO + diffusion) + Neural Networking (zero-shot transfer)
**Frontend Binding:** `ppg/ToolpathStrategySelector.tsx`, `calculator/OptimizationPanel.tsx`
**Revenue Tier Unlocked:** Production ($199/mo)

### PP-STAGE-4-MS0: Toolpath Strategy Fabric (150 strategies)

| Unit | Task |
|---|---|
| U-S4-01 | `ToolpathStrategyRegistryEngine` — 150 strategies across mill/lathe/edm/swiss/5ax |
| U-S4-02 | `StrategySelectionRLPolicyEngine` — PPO actor-critic over strategy space |
| U-S4-03 | `ToolpathSimulatorEngine` — physics-accurate simulator for RL env (use existing `MachiningSimulatorEngine` if present) |
| U-S4-04 | `StrategyHumanOverrideEngine` — human-in-the-loop with explainability |

### PP-STAGE-4-MS1: Per-Block Parameter Optimization

| Unit | Task |
|---|---|
| U-S4-10 | `PerBlockParameterOptimizerEngine` — per-G-code-line S/F optimization |
| U-S4-11 | `AdaptiveFeedRateEngine` — load-responsive feed scaling |
| U-S4-12 | `ChatterAvoidanceOptimizerEngine` — RPM selection from stability lobe map |
| U-S4-13 | `ToolLifeMaxOptimizerEngine` — feed/speed balance for Taylor life target |

### PP-STAGE-4-MS2: Toolpath Synthesis (Diffusion)

| Unit | Task |
|---|---|
| U-S4-20 | `ToolpathDiffusionEngine` — 128-step DDPM over path samples |
| U-S4-21 | `ToolpathConstraintProjectionEngine` — project diffused paths to feasible manifold |
| U-S4-22 | `NovelToolpathProposalEngine` — bridges to `PRISMCreativeReasoningEngine` |

### PP-STAGE-4-MS3: Optimization Integration

| Unit | Task |
|---|---|
| U-S4-30 | Wire optimizers into `PostProcessorPipelineEngine` phase 25-35 |
| U-S4-31 | Calculator "Optimize" CTA → RL policy inference |
| U-S4-32 | `OptimizationExplanationEngine` — human-readable rationale per recommendation |

**Exit Gate PP-STAGE-4 (16 items):** RL policy beats heuristic baseline by ≥ 15% on MRR × tool-life objective over 100 held-out programs; per-block optimizer produces valid G-code; diffusion sampler generates constraint-satisfying paths ≥ 95%; explanation text scores ≥ 0.8 on readability.

---

## XI. STAGE 5 — SAFETY, COLLISION & S(x) EXPANSION

**Purpose:** Raise safety coverage from 56% to 100% across 10-dim S(x). Add CCD, GJK, Z3 formal proofs. Covers PP-AGI Phase 7.

**AGI Layer:** Deep Logic (Z3/TLA+ formal verification) + Deep Learning (Collision GNN)
**Frontend Binding:** `ppg/SafetyEnvelopeBadge.tsx`, `ppg/CollisionReportPanel.tsx`
**Revenue Tier Unlocked:** Production ($199/mo) — Enterprise ($499/mo) gets formal-proof receipts

### PP-STAGE-5-MS0: Collision Detection

| Unit | Task |
|---|---|
| U-S5-01 | `ContinuousCollisionDetectionEngine` (CCD) — sweep & prune + narrow-phase |
| U-S5-02 | `GJKAlgorithmEngine` — complete implementation (currently stub) |
| U-S5-03 | `CollisionGNNInferenceEngine` — wire 300M-param GNN from Stage 2 |
| U-S5-04 | `RapidMotionCollisionGuardEngine` — every G0 move checked |

### PP-STAGE-5-MS1: Machine-Family Collision Coverage

| Unit | Family | Gap filled |
|---|---|---|
| U-S5-10 | Swiss (40% → 100%) | Gang slide, B-axis swing, sub-spindle, guide bushing |
| U-S5-11 | Mill-Turn (50% → 100%) | Multi-channel sync, tool-turret collision, B-axis swing during turning |
| U-S5-12 | 5-axis (70% → 100%) | Trunnion/fork head, RTCP singularity, head-table clearance |
| U-S5-13 | Wire EDM (65% → 100%) | Wire path obstruction, upper/lower head collision |
| U-S5-14 | Mill (85% → 100%) | Tombstone, pallet changer, tool-magazine swap |
| U-S5-15 | Lathe (90% → 100%) | Follow rest, bar puller, sub-spindle hand-off |

### PP-STAGE-5-MS2: Formal Verification

| Unit | Task |
|---|---|
| U-S5-20 | `Z3CollisionProver` — prove collision-freedom over state-space for representative programs |
| U-S5-21 | `TLAChannelSyncProver` — prove mill-turn channel sync correctness |
| U-S5-22 | `RefinementTypeSafetyChecker` — prove feed/RPM/load within machine limits |
| U-S5-23 | 180 proofs target: 60 safety, 60 physics, 60 controller dialect |

### PP-STAGE-5-MS3: S(x) 10-Dimensional Expansion

Current 6 dims → target 10:
1. Force (exists)
2. Thermal (exists)
3. Deflection (exists)
4. Chatter (exists)
5. Wear (exists)
6. Power (exists)
7. **Singularity** (new, Stage 5)
8. **Wire path** (new, Stage 5)
9. **Channel sync** (new, Stage 5)
10. **Coolant coverage** (new, Stage 7)

| Unit | Task |
|---|---|
| U-S5-30 | `SingularityDetectionEngine` — 5-axis singularity detection + avoidance |
| U-S5-31 | `WirePathObstructionEngine` |
| U-S5-32 | `MultiChannelSyncValidatorEngine` |
| U-S5-33 | `SafetyEnvelopeExpandedEngine` — unified S(x) = Σ w_i · s_i over 10 dims |
| U-S5-34 | `SafetyEnvelopeReceiptEngine` — cryptographically signed receipts for Enterprise tier |

**Exit Gate PP-STAGE-5 (16 items):** CCD catches 100% of synthetic rapid-collision scenarios; GJK passes CMU collision benchmark suite; 180 Z3/TLA+ proofs validate; 6 machine families at 100% coverage; S(x) computed across all 10 dimensions; receipts verifiable.

---

## XII. STAGE 6 — DEEP REASONING + DEEP LOGIC FUSION

**Purpose:** Wire existing reasoning engines (ToT, CoT, Counterfactual, Hypothesis Ranker, Reflection, Creative, Multi-Path) into PP pipeline. NO new reasoning engines. Covers PP-AGI Phase 8 (DELETED) — converted to pure wiring.

**AGI Layer:** Deep Reasoning (all 7 existing engines) + Deep Logic (symbolic execution)
**Frontend Binding:** `ppg/ReasoningTracePanel.tsx` (user can expand to see decision tree)
**Revenue Tier Unlocked:** Enterprise ($499/mo) — explainable AI receipts

### PP-STAGE-6-MS0: Reasoning Integration

| Unit | Task |
|---|---|
| U-S6-01 | `TreeOfThoughtEngine` → wire 3 PP action points (strategy pick, parameter tune, error recovery) |
| U-S6-02 | `ChainOfThoughtEngine` → wire per-block optimization trace |
| U-S6-03 | `CounterfactualReasoningEngine` → "what-if" panel for every PP recommendation |
| U-S6-04 | `HypothesisRankerEngine` → rank top-5 candidate posts before final emit |
| U-S6-05 | `ReflectionEngine` → post-generation self-critique + auto-repair loop (max 3 iters) |
| U-S6-06 | `PRISMCreativeReasoningEngine` → novel strategy exploration for tricky materials |
| U-S6-07 | `MultiPathReasoningEngine` → parallel exploration of 5 strategies, best wins |

### PP-STAGE-6-MS1: Symbolic Execution & Path Coverage

| Unit | Task |
|---|---|
| U-S6-10 | `SymbolicPostExecutorEngine` — symbolic execution of `PostProcessorPipelineEngine` 38 stages |
| U-S6-11 | `PathCoverageAnalyzerEngine` — 100% path coverage target |
| U-S6-12 | `BranchBranchCoverageHarnessEngine` — generates test inputs to cover every branch |

### PP-STAGE-6-MS2: Reasoning UX

| Unit | Task |
|---|---|
| U-S6-20 | `ReasoningTraceExporterEngine` — export trace as JSON + HTML report |
| U-S6-21 | `ReasoningTraceViewer` React component — expandable tree, click-to-drill |
| U-S6-22 | `ReasoningReceiptSigner` — Enterprise tier signed receipts |

**Exit Gate PP-STAGE-6 (16 items):** All 7 reasoning engines callable from `ppDispatcher`; PP pipeline 100% symbolic-path covered; trace viewer renders; ≥ 5 signed receipt examples; 8-pass scrutiny ≥ 90/100.

---

## XIII. STAGE 7 — FRONTEND INTEGRATION (Calculator 6-mode + PPG Wizard)

**Purpose:** Bring PP-AGI to the user. Refactor CalculatorPage. Build PPG wizard. Ship 6-mode matrix parity.

**AGI Layer:** all 4 (surfaced to user)
**Revenue Tier Unlocked:** all tiers (frontend is the purchase funnel)

### PP-STAGE-7-MS0: Calculator Refactor

**Source:** SCRUTINY-R5 CALC-MILL-MS0 through CALC-CROSS-MS0

| Unit | Task |
|---|---|
| U-S7-01 | Decompose `CalculatorPage.tsx` 13,400 LOC into per-mode sub-pages |
| U-S7-02 | `CalculatorMillPage.tsx` — 7 sub-panels parity with lathe |
| U-S7-03 | `CalculatorLathePage.tsx` — extend with post-preview pane |
| U-S7-04 | `CalculatorEDMPage.tsx` — 6 sub-panels |
| U-S7-05 | `CalculatorWireEDMPage.tsx` — 6 sub-panels (adapt from /wire-edm-studio) |
| U-S7-06 | `CalculatorLaserPage.tsx` — 5 sub-panels (new mode) |
| U-S7-07 | `CalculatorWaterjetPage.tsx` — 5 sub-panels (new mode) |
| U-S7-08 | `ModeSwitchHygieneEngine` — reset dependent state on mode change |
| U-S7-09 | `CrossModeCompareEngine` — "show me this part in 3 modes" CTA |

### PP-STAGE-7-MS1: PPG 8-Step Wizard

**Source:** PP-MAX PP-MS3 + PP-MS4 + PP-MS7 + PP-MS8

| Unit | Step | Component |
|---|---|---|
| U-S7-10 | Step 1 Machine | `ppg/MachineSelector.tsx` |
| U-S7-11 | Step 2 Controller | `ppg/ControllerFingerprint.tsx` |
| U-S7-12 | Step 3 Features | `ppg/FeatureToggleMatrix.tsx` (4 categories: basic, advanced, probing, HSM) |
| U-S7-13 | Step 4 CPS / Seed | `ppg/CPSUploadOrSeed.tsx` + `PostCPSParserEngine` wire |
| U-S7-14 | Step 5 Generate | `ppg/GeneratePanel.tsx` + progress |
| U-S7-15 | Step 6 Validate | `ppg/ValidationReportPanel.tsx` |
| U-S7-16 | Step 7 Prove-Out | `ppg/ProveOutToggle.tsx` |
| U-S7-17 | Step 8 Download | `ppg/DownloadPanel.tsx` (.nc/.tap/.mpf/.h/.eia/.zip) |

### PP-STAGE-7-MS2: Preview, Comparison & Library

**Source:** PP-MAX PP-MS4 + PP-MS6

| Unit | Task |
|---|---|
| U-S7-20 | `ppg/GcodeComparisonPanel.tsx` — before/after side-by-side with diff markers |
| U-S7-21 | `ppg/PostPreviewComponent.tsx` — line-numbered viewer with physics annotations |
| U-S7-22 | `ppg/PostLibraryUI.tsx` — 180+ CPS + PRISM-native posts with faceted search |
| U-S7-23 | `ppg/PostVersionDiffViewer.tsx` |
| U-S7-24 | `ppg/ReasoningTraceViewer.tsx` (from Stage 6) |

### PP-STAGE-7-MS3: Frontend API Integration

| Unit | Task |
|---|---|
| U-S7-30 | `api/ppgClient.ts` — unified client for 180+ PP dispatcher actions |
| U-S7-31 | Route `POST /api/ppg/generate` |
| U-S7-32 | Route `GET /api/ppg/posts/:id/preview` |
| U-S7-33 | Route `POST /api/ppg/download` (returns binary + correct Content-Type) |
| U-S7-34 | SSE for long-running generation with progress |
| U-S7-35 | Optimistic UI with loading skeletons |

**Exit Gate PP-STAGE-7 (16 items):** all 6 calculator modes load, render, and round-trip a reference program; PPG wizard 8 steps functional end-to-end on Haas VF-2 + Fanuc 31i mill + Mazak Integrex + Makino U6 wire EDM + Bystronic laser + OMAX waterjet; Vite build green; no TS errors; accessibility AA.

---

## XIV. STAGE 8 — VALIDATION, PROVE-OUT & E2E TESTING

**Purpose:** Harden before launch. E2E against 10 representative machines. Pass PPG-BASELINE 43 bugs. Performance budget compliance.

**AGI Layer:** Deep Logic (differential testing, metamorphic testing)
**Frontend Binding:** `ppg/ProveOutToggle.tsx`, `ppg/ValidationReportPanel.tsx`
**Revenue Tier Unlocked:** all (prereq for launch)

### PP-STAGE-8-MS0: Prove-Out Mode (PP-MAX PP-MS5)

| Unit | Task |
|---|---|
| U-S8-01 | `ProveOutModeEngine` — feed −25%, RPM cap 80%, single-block, stop-and-check points |
| U-S8-02 | `PostValidationHardeningEngine` — block if exceeds machine max_rpm/max_feed/work_envelope/tool_capacity |
| U-S8-03 | `PostValidationReportEngine` — per-block severity flags + recommendations PDF |
| U-S8-04 | Wire `ProveOutToggle` into PPG wizard step 7 |

### PP-STAGE-8-MS1: PPG-BASELINE HURCO v11 (43 bugs)

**Source:** PPG-BASELINE-v11-ROADMAP (2,814 LOC, 45 units)

| Unit | Task |
|---|---|
| U-S8-10 | Parse existing HURCO VM30i v11 CPS file |
| U-S8-11 | Generate PRISM equivalent, diff against reference |
| U-S8-12-U-S8-52 | Fix 43 documented bugs one-by-one (see PPG-BASELINE for itemized list) |
| U-S8-53 | Regression: re-run all 45 reference programs, byte-identical or semantically equivalent |

### PP-STAGE-8-MS2: Integration Testing (PP-MAX PP-MS9)

| Unit | Task |
|---|---|
| U-S8-60 | 10 representative machines end-to-end: Haas VF-2, Fanuc 31i mill, Siemens 840D 5-axis, Mazak Integrex, Okuma lathe, Brother Speedio, Citizen Cincom L20, DMG MORI NLX, Hurco VMX, Doosan turning |
| U-S8-61 | G-code simulation validation — parse each generated program through `PostValidationSuiteEngine` |
| U-S8-62 | Performance benchmarks: 3-axis < 2s, 5-axis < 5s, wire EDM < 3s |
| U-S8-63 | Load test: 100 concurrent PPG requests, P99 < 10s |
| U-S8-64 | Chaos test: inject controller timeout, CAM parse failure, machine profile missing — all gracefully handled |

### PP-STAGE-8-MS3: Coolant / Probing / Subprogram (PP-MAX PP-MS7)

| Unit | Task |
|---|---|
| U-S8-70 | `CoolantControlConfigEngine` — per-machine M-codes (flood, TSC, mist, air blast) |
| U-S8-71 | `UnifiedProbingDialectEngine` — 8+ controllers (Fanuc G65, Haas M65, Siemens CYCLE977, Heidenhain TCH PROBE, Okuma, Mazak M181, Brother, Doosan) |
| U-S8-72 | `SubprogramStructureEngine` — M98/M99 vs CALL/RET vs CALL PGM, auto-extract repeats |

### PP-STAGE-8-MS4: Non-Traditional Process Posts (PP-MAX PP-MS8)

| Unit | Task |
|---|---|
| U-S8-80 | `EDMPostProcessorExtension` — wire/sinker dialect (Fanuc ROBOcut, Mitsubishi, Sodick, AgieCharmilles) |
| U-S8-81 | `LaserWaterjetPostExtension` — pierce sequence, cut conditions, taper compensation, abrasive flow (Bystronic, TRUMPF, OMAX, Flow) |

**Exit Gate PP-STAGE-8 (16 items):** 10 rep machines E2E pass; all 43 HURCO bugs resolved; P99 latency within budget; coolant/probing/subprogram validated on ≥ 3 controllers each; non-traditional posts validated on ≥ 2 vendors each; chaos test passes; Omega ≥ 1.0.

---

## XV. STAGE 9 — REVENUE ENABLEMENT, LICENSING & GTM

**Purpose:** Monetize. 4-tier pricing. Quota enforcement. License engine. Stripe integration.

**Source:** PP-REVENUE-ROADMAP PP-REV-MS0-7 (42 units)

**AGI Layer:** none directly; monetization layer
**Frontend Binding:** `pricing/PricingPage.tsx`, `account/BillingPage.tsx`, `account/QuotaWidget.tsx`
**Revenue:** **live** after this stage

### PP-STAGE-9-MS0: Tier Definition (PP-REV-MS0)

| Tier | Price | Machines | Controllers | Features | Monthly Posts |
|---|---|---|---|---|---|
| Free | $0 | 3 demo | Fanuc 31i, Haas NGC | Basic | 10 |
| Pro | $79/mo | 25 | 12 popular | Advanced + Probing | 500 |
| Production | $199/mo | 150 | 50 | HSM + 5-axis + Mill-turn | Unlimited |
| Enterprise | $499/mo | 860 | 173 | All + Formal Proofs + Custom Post | Unlimited + SLA |

### PP-STAGE-9-MS1: Quota & License (PP-REV-MS1 + MS2)

| Unit | Task |
|---|---|
| U-S9-10 | `PostQuotaEngine` — per-user post counter, monthly reset |
| U-S9-11 | `PostLicenseEngine` — JWT + signed claim with tier + features + seats |
| U-S9-12 | `PostUsageMeterEngine` — event stream to analytics + Stripe |
| U-S9-13 | `PostEntitlementMatrix` — tier × feature lookup |
| U-S9-14 | Middleware: `requireTier("production")` for high-value endpoints |

### PP-STAGE-9-MS2: Payment Integration (PP-REV-MS3)

| Unit | Task |
|---|---|
| U-S9-20 | Stripe subscription + webhook handling |
| U-S9-21 | Proration for tier upgrades/downgrades |
| U-S9-22 | Dunning (retry failed charges 3× over 14 days) |
| U-S9-23 | Tax (Stripe Tax) |

### PP-STAGE-9-MS3: Billing UI (PP-REV-MS4)

| Unit | Task |
|---|---|
| U-S9-30 | `PricingPage.tsx` — feature matrix, CTA per tier |
| U-S9-31 | `account/BillingPage.tsx` — subscription, invoices, payment method |
| U-S9-32 | `account/QuotaWidget.tsx` — "X of Y posts this month" |
| U-S9-33 | Tier upgrade modal triggered on quota exceeded |

### PP-STAGE-9-MS4: Enterprise Custom Post (PP-REV-MS5)

| Unit | Task |
|---|---|
| U-S9-40 | `CustomPostRequestEngine` — workflow: request → quote → scoping → delivery |
| U-S9-41 | SLA tracking (99.5% uptime, P1 response < 1h) |
| U-S9-42 | Dedicated Slack/Teams channel provisioning |

### PP-STAGE-9-MS5: Marketing & Content (PP-REV-MS6)

| Unit | Task |
|---|---|
| U-S9-50 | `PostProcessorPage.tsx` enhancement: workflow diagram, before/after showcase, 18 CAM systems grid |
| U-S9-51 | Case studies: JM Die, 3 additional pilots |
| U-S9-52 | Video: "PRISM PP in 90 seconds" |
| U-S9-53 | Docs: /docs/ppg with every dispatcher action |

### PP-STAGE-9-MS6: Analytics & Growth (PP-REV-MS7)

| Unit | Task |
|---|---|
| U-S9-60 | `PostAnalyticsEngine` — funnel (visit → signup → first post → paid) |
| U-S9-61 | Feature-use heatmap |
| U-S9-62 | Churn prediction (LoRA-based) |
| U-S9-63 | A/B test harness for pricing page |

**Exit Gate PP-STAGE-9 (16 items):** 4 tiers live; Stripe integration processes test + production payments; quota enforcement on every PPG call; PricingPage + BillingPage + QuotaWidget green Lighthouse ≥ 90; first paid customer transacts; analytics funnel populated; 8-pass scrutiny ≥ 90/100.

---

## XVI. STAGE 10 — PRODUCTION LAUNCH & CONTINUOUS LEARNING

**Purpose:** Deploy to prod, monitor, continuously learn from real customer programs.

**AGI Layer:** Neural Networking (meta-learning + continual LoRA)
**Revenue Tier Unlocked:** all + Enterprise upgrades

### PP-STAGE-10-MS0: Production Deployment

| Unit | Task |
|---|---|
| U-S10-01 | Canary rollout (5% → 25% → 50% → 100% over 7 days) |
| U-S10-02 | Shadow mode (route 100% of traffic to new + old, compare) |
| U-S10-03 | Rollback automation (auto-revert if P99 > budget or accuracy drift > 3%) |
| U-S10-04 | Runbook: incident response, escalation, on-call rotation |
| U-S10-05 | SLO dashboard (Grafana): latency, availability, accuracy, error rate |

### PP-STAGE-10-MS1: Continual Learning

| Unit | Task |
|---|---|
| U-S10-10 | `ContinualLearningOrchestrator` — schedule weekly LoRA fine-tunes per machine family |
| U-S10-11 | `DataCurationPipelineEngine` — new customer programs labeled + added to training set |
| U-S10-12 | `CatastrophicForgettingGuardEngine` — EWC regularization or replay buffer |
| U-S10-13 | `MetaLearningMAMLEngine` — fast adaptation to new machines with < 10 examples |
| U-S10-14 | Opt-in: customers can toggle "improve PRISM using my data" (privacy-first) |

### PP-STAGE-10-MS2: Human Oversight (Pass 7 P0 gap fix)

| Unit | Task |
|---|---|
| U-S10-20 | `HumanApprovalGateEngine` — AI-generated G-code requires operator approval before first run |
| U-S10-21 | `ConfidenceDisplayEngine` — per-block confidence badge (green ≥ 0.9, amber 0.7-0.9, red < 0.7) |
| U-S10-22 | `ExplanationGenerationEngine` — "why did you choose this feed?" NL generation |
| U-S10-23 | `DeviationLoggerEngine` — log every operator override, feed back to training |

### PP-STAGE-10-MS3: Regulatory & Certification

| Unit | Task |
|---|---|
| U-S10-30 | ISO 9001 quality-record generation for every post |
| U-S10-31 | AS9100D aerospace trace for aviation customers |
| U-S10-32 | ITAR compliance (US-only data residency option) |
| U-S10-33 | Formal proof receipts (Stage 5) provided to auditors |
| U-S10-34 | Export control: block restricted geographies |

### PP-STAGE-10-MS4: Launch Readiness & Public Beta

| Unit | Task |
|---|---|
| U-S10-40 | Private beta (50 shops, JM Die + partners) — 4 weeks |
| U-S10-41 | Public beta (500 shops) — 8 weeks |
| U-S10-42 | GA launch — 1.0 release, press release, product hunt, LinkedIn |
| U-S10-43 | NPS survey instrumentation |
| U-S10-44 | Referral program (free month for each referred paid account) |

**Exit Gate PP-STAGE-10 (16 items):** canary successful, SLOs green for 30 days, continual learning active (≥ 1 weekly fine-tune), human oversight functional (confidence + explanation + approval), ISO/AS9100/ITAR audits pass, public beta live, first 10 paid customers, NPS ≥ 50, Omega = 1.0.

---

## XVII. CROSS-STAGE DEPENDENCY GRAPH

```
Stage 0 (Pre-flight)
  ↓ blocks all
Stage 1 (Physics) ─────┐
Stage 2 (Neural) ──────┤
                       ├──→ Stage 4 (Toolpath RL)
Stage 3 (Fabric) ──────┤    ↓
                       │    Stage 5 (Safety) ──┐
                       │                       ├──→ Stage 6 (Reasoning+Logic)
                       │                       │            ↓
                       │                       │     Stage 7 (Frontend)
                       │                       │            ↓
                       │                       │     Stage 8 (Validation+E2E)
                       │                       │            ↓
                       │                       │     Stage 9 (Revenue)
                       │                       │            ↓
                       │                       │     Stage 10 (Launch+CL)
```

### Parallelizable tracks

- Stage 1, 2, 3 can run in parallel after Stage 0 completes
- Stage 5, 6 can run in parallel after Stage 4 completes
- Stage 7 can start with Stage 5+6 partial (mock data OK)
- Stage 8 gates on Stage 7 UI complete + Stage 5 safety complete
- Stage 9 gates on Stage 8 E2E green
- Stage 10 gates on Stage 9 live

### Timeline (sequential worst-case; parallel tracks compress)

| Stage | Duration | Cumulative |
|---|---|---|
| 0 | 14 weeks | 14 |
| 1 | 6 weeks | 20 |
| 2 | 10 weeks | 30 |
| 3 | 12 weeks | 42 |
| 4 | 8 weeks | 50 |
| 5 | 8 weeks | 58 |
| 6 | 4 weeks | 62 |
| 7 | 10 weeks | 72 |
| 8 | 6 weeks | 78 |
| 9 | 6 weeks | 84 |
| 10 | 6 weeks + ongoing | 90 |

**With parallelism (Stage 1/2/3 overlap, 5/6 overlap, 7 early-start):** ~60-68 weeks (14-15 months) to GA.

**Total effort:** ~13,000 engineer-hours across stages (roughly 5-6 FTE for 14-15 months).

---

## XVIII. QUALITY GATES & SCRUTINY PROTOCOL

### XVIII.1 Per-Unit Gate (every U-*)

Before commit:
1. `/dedup` check (< 85% similarity)
2. Engine has singleton export
3. Dispatcher action wired (z.enum + switch + getEngine)
4. Zod schema validates input
5. ≥ 22 tests for new engine, all pass
6. `npm run build:fast` green
7. Commit message follows `LAYER-PHASE-UNIT: title — summary` with `Co-Authored-By: Claude Opus 4.7`

### XVIII.2 Per-Milestone Gate (every MS)

Before declaring milestone complete:
1. All units in milestone pass unit gate
2. Milestone exit-gate checklist 100%
3. 8-pass scrutiny per-milestone ≥ 90/100 each pass
4. State file updated: `state/milestones/PP-STAGE-<N>-MS<M>-STATE.json`
5. Roadmap index updated: `data/roadmap-index.json` marks milestone `completed`
6. `PRISM-SELF-AWARENESS-DIRECTIVE` updated if new surfaces added

### XVIII.3 Per-Stage Gate (every S)

Before Stage N declared complete and Stage N+1 allowed to start:
1. All 16 exit-gate items satisfied
2. 8-pass stage-wide scrutiny ≥ 90/100 per pass
3. Omega = 1.0 confirmed by `OmegaComputeEngine`
4. SVI Ψ ≥ 0.9 confirmed by `SVIPsiEngine`
5. Cross-stage regression: prior stages' exit gates still pass
6. `state/milestones/PP-STAGE-<N>-COMPLETE.json` written with signed hash
7. Public changelog entry

### XVIII.4 Per-Release Gate (Stage 10 GA)

Before Stage 10 → public GA:
1. All 10 stages exit-gate PASS
2. Customer alpha (JM Die) + private beta (50 shops) + public beta (500 shops) green
3. ISO 9001, AS9100D, ITAR compliance audits passed
4. Load test 1,000 concurrent PPG requests P99 < 10s
5. Chaos test passes (30 failure modes)
6. SLO dashboard 30 days green
7. Rollback rehearsed on production 3 times
8. Security audit (OWASP Top 10, SOC 2 Type 1)
9. All 180 formal proofs verified in CI
10. NPS ≥ 50 in beta
11. Pricing live + 10 paid customers transacting
12. Docs complete (every dispatcher action, every engine, every formula)
13. Incident runbook rehearsed
14. On-call rotation staffed
15. `MEMORY.md` + `state/shared/*` fully synced
16. `PRISM-UNIFIED-ROADMAP-v2.md` updated with PP completion

---

## XIX. AGI CAPABILITY MATRIX (cross-stage)

| Capability | Stage(s) | Deep-L | Deep-R | Deep-Logic | NN-Net |
|---|---|---|---|---|---|
| Physics-informed prediction | 1, 2 | PINNs | — | dimensional analysis | — |
| G-code generation | 2, 4 | Transformer | CoT | refinement types | zero-shot controller |
| Strategy selection | 4 | RL PPO | ToT + Hypothesis | — | transfer across machines |
| Collision detection | 5 | GNN | — | Z3 proofs | — |
| Channel sync (mill-turn) | 5 | — | — | TLA+ proofs | — |
| Parameter optimization | 4 | RL + diffusion | CoT | refinement types | LoRA per-machine |
| Error recovery | 6 | Transformer infill | Reflection | symbolic exec | — |
| Novel strategy | 6 | diffusion | Creative (6 modes, 15 domains) | — | cross-domain |
| Multi-hypothesis post | 6 | — | Multi-Path + Ranker | — | — |
| Continual improvement | 10 | LoRA fine-tune | — | — | MAML + EWC |
| Human-in-loop explanation | 10 | — | CoT + Counterfactual | formal receipts | — |

---

## XX. REVENUE ROLLUP (tier-by-stage unlock)

| Stage | Free | Pro ($79) | Production ($199) | Enterprise ($499) |
|---|---|---|---|---|
| 1 | canonical physics | | | |
| 2 | | neural-assisted | | |
| 3 | 3 demo machines | 25 popular | 150 common | 860 all |
| 4 | | | RL optimization | |
| 5 | | | collision check | formal proof receipts |
| 6 | | | | reasoning trace + signed receipts |
| 7 | | | | |
| 8 | basic validation | prove-out | full validation + coolant/probing | custom post SLA |
| 9 | quota 10/mo | quota 500/mo | unlimited | unlimited + SLA |
| 10 | | | | continual custom LoRA |

### Cumulative MRR Target (post Stage 10, month 3 of GA)

| Tier | Customers | MRR |
|---|---|---|
| Free | 2,000 | $0 |
| Pro | 150 | $11,850 |
| Production | 40 | $7,960 |
| Enterprise | 10 | $4,990 |
| **Total** | **2,200** | **$24,800** |

Month 12 target: 300 Pro / 100 Production / 30 Enterprise = **$63,670 MRR** = $764K ARR.

---

## XXI. RISK REGISTER

| Risk | Prob | Impact | Mitigation |
|---|---|---|---|
| GPU budget not funded ($170K-700K) | HIGH | HIGH | Phase approach: rent spot GPU, self-host smaller models, compress 13B → 3B via distillation |
| Data labeling effort underestimated | HIGH | MED | Auto-label pipeline + human QA only on uncertain, target 95% auto |
| Swiss-type / mill-turn collision proofs intractable for Z3 | MED | HIGH | Fall back to bounded model checking + human review for < 1% uncertain cases |
| Customer refuses data-sharing for continual learning | MED | MED | Opt-in only, all tiers functional without data-share, on-premise Enterprise |
| Regulatory: ITAR / export control | LOW | HIGH | Geofence + token-gated, legal review before GA |
| Competitor launches first (Autodesk, Mastercam, Fusion Post) | MED | HIGH | Ship Stage 8 end-to-end to private beta within 30 weeks |
| Hallucinated G-code causes crash in customer shop | LOW | CRITICAL | Stage 5 formal proofs + Stage 10 human approval gate + ProveOutMode MANDATORY for first run |
| Anti-regression failure (dispatchers drop actions) | LOW | MED | `validate_anti_regression` pre-commit hook (already exists) |

---

## XXII. APPENDICES

### Appendix A: Complete Unit Index (summary counts)

| Stage | Milestones | Units | Engines (new) | Engines (wired, dormant) | Tests |
|---|---|---|---|---|---|
| 0 | 5 | 45 | 12 | 1,373 | 220 |
| 1 | 3 | 23 | 7 + 4 | — | 230 |
| 2 | 4 | 34 | 16 | — | 340 |
| 3 | 5 | 49 | 35 | 496 materials + 95,608 tools | 490 |
| 4 | 4 | 32 | 13 | — | 320 |
| 5 | 4 | 34 | 22 | — | 340 |
| 6 | 3 | 22 | 6 (wiring only) | 7 reasoning | 220 |
| 7 | 4 | 36 | 15 engines + 40 components | — | 360 |
| 8 | 5 | 53 | 8 | — | 530 |
| 9 | 7 | 42 | 13 | — | 420 |
| 10 | 5 | 44 | 14 | — | 440 |
| **Total** | **49** | **414** | **210 new** | **~1,900 wired** | **~3,910** |

Test delta vs baseline 1,255: **+2,655** (adjusted down to 1,050 by dedup per Pass 1; consolidated estimate ≈ **+1,050 → 2,305 total**).

### Appendix B: AGI Engine Catalog (210 new engines)

*See `state/shared/PP-MASTER-ENGINE-CATALOG.json` (to be generated in Stage 0 U-S0-44).*

Breakdown:
- Stage 1 physics: 11 engines
- Stage 2 neural: 16 engines (7 PINN + 4 NN infra + 5 transformer/GNN)
- Stage 3 fabric: 35 engines (5 registry + 5 fingerprint + 10 materials + 10 CAM bridges + 5 kinematics)
- Stage 4 toolpath: 13 engines
- Stage 5 safety: 22 engines
- Stage 6 reasoning integration: 6 engines
- Stage 7 frontend engines: 15 engines
- Stage 8 validation: 8 engines
- Stage 9 revenue: 13 engines
- Stage 10 continual: 14 engines

### Appendix C: Dispatcher Action Inventory

`ppDispatcher.ts` target: 180+ actions (currently ~45 post R4-FIX-3+5).

| Category | Actions |
|---|---|
| Pipeline (Stage 1) | 12 |
| Physics (Stage 1) | 15 |
| Neural inference (Stage 2) | 20 |
| Machine fabric (Stage 3) | 25 |
| Controller (Stage 3) | 18 |
| Material (Stage 3) | 10 |
| Toolpath opt (Stage 4) | 15 |
| Safety (Stage 5) | 22 |
| Reasoning (Stage 6) | 12 |
| Generation/validation (Stage 7/8) | 20 |
| Revenue/quota (Stage 9) | 10 |
| Continual (Stage 10) | 8 |
| **Total** | **187** |

### Appendix D: Frontend Component Manifest (~55 components)

- Calculator per-mode pages: 6
- Calculator sub-panels: 35 (7 mill × 5 + 7 lathe × 5 + 6 edm × 2 + 6 wedm × 2 + 5 laser + 5 waterjet)
- PPG wizard: 8 step components
- PPG preview/library: 6
- Reasoning trace viewer: 2
- Billing/quota: 4
- Account/settings: 4

### Appendix E: Verification Protocol (per-unit)

```bash
# 1. Dedup check (BEFORE writing any code)
npx tsx mcp-server/src/tools/bin/duplication-check.ts \
  --type engine --name <ProposedName> --keywords "<k1,k2,k3>"

# 2. Build fast
cd mcp-server && npm run build:fast

# 3. Test
npx vitest run src/__tests__/<NewEngine>.test.ts

# 4. Anti-regression (action count)
npx tsx mcp-server/src/tools/bin/validate-anti-regression.ts

# 5. Scrutiny 8-pass (milestone boundary only)
npx tsx mcp-server/src/tools/bin/scrutiny-suite.ts --milestone PP-STAGE-<N>-MS<M>

# 6. Commit
git commit -m "$(cat <<'EOF'
PP-STAGE-<N>/U-S<N>-<UU>: <title> — <summary>

<body>

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

### Appendix F: State Files Required (schemaVersion-stamped)

| File | Purpose |
|---|---|
| `state/milestones/PP-STAGE-<N>-MS<M>-STATE.json` | Per-milestone state, updated during execution |
| `state/milestones/PP-STAGE-<N>-COMPLETE.json` | Signed stage-complete record |
| `state/shared/PP-MASTER-ENGINE-CATALOG.json` | All 210 new engines + metadata |
| `state/shared/PP-AGI-CAPABILITY-MATRIX.json` | Cognition-layer × stage mapping |
| `data/roadmap-index.json` | Milestone queue (already exists, append) |
| `mcp-server/data/state/BASELINE_INVENTORY.json` | Update after each stage |
| `mcp-server/data/state/HEALTH_CHECK_REPORT.json` | Regenerate per stage |

### Appendix G: Integration Points with Existing PRISM Roadmaps

- `PRISM-UNIFIED-ROADMAP-v2.md` — this document is a SUB-ROADMAP rolled up into v2
- `UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN-2026-04-15.md` — quality standard reference; PP work contributes ~40 new skills + ~60 hooks + ~20 scripts to universal plan
- `LATHE-MASTER-UNIFIED-ROADMAP.md` — lathe studio integration (Stage 7)
- `MILL-AGI-UNIFIED-ROADMAP-2026-04-16.md` — mill studio integration (Stage 7); MILL-AGI Phases C/D RETIRED per SCRUTINY-R5 decision #2
- `SCRUTINY-R5-CODEX-FRONTEND-UNIVERSAL-ALIGNMENT-2026-04-16.md` — frontend reference (Stage 7)

### Appendix H: Referenced Shared Directives

- `state/shared/PRISM-SELF-AWARENESS-DIRECTIVE.md` — must update after each stage
- `state/shared/AGENT_BOUNDARY_DIRECTIVE.md` — enforced (this track = PP, not APP/APPW/FMERGE/WEB/UI)
- `state/shared/CLAUDE-CODEX-ROADMAP-EXECUTION-DIRECTIVE.md` — execution protocol
- `state/shared/CLAUDE-CODEX-COORDINATION-DIRECTIVE.md` — cross-session coordination
- `state/shared/PRISM-AI-SYSTEM-INTELLIGENCE.md` — DuplicationGuard + asset registry
- `state/shared/PENDING_GAP_ENGINES.json` — register new engines immediately

### Appendix I: Glossary

- **AGI Layer**: one of Deep Learning / Deep Reasoning / Deep Logic / Neural Networking
- **CPS**: Fusion 360 Post Processor source file (.cps)
- **Cognition Layer**: synonym for AGI layer
- **CCD**: Continuous Collision Detection
- **DR**: Deep Reasoning
- **GAT**: Graph Attention Network
- **GJK**: Gilbert-Johnson-Keerthi (collision algorithm)
- **GNN**: Graph Neural Network
- **LoRA**: Low-Rank Adaptation (for on-device fine-tuning)
- **MAML**: Model-Agnostic Meta-Learning
- **MDOF**: Multi-Degree-of-Freedom stability
- **MRR**: Material Removal Rate (machining) / Monthly Recurring Revenue (business) — context-specific
- **NN-Net**: Neural Networking (transfer / adaptation)
- **Omega**: PRISM quality score, target 1.0
- **PINN**: Physics-Informed Neural Network
- **PPO**: Proximal Policy Optimization (RL algorithm)
- **PPG**: Post-Processor Generator
- **PP**: Post-Processor (subsystem)
- **RTCP**: Rotation Tool Center Point
- **S(x)**: Safety score, 10-dimensional in Stage 5
- **SLD**: Stability Lobe Diagram
- **SMT**: Satisfiability Modulo Theories (Z3)
- **SO(3)**: 3D rotation group (kinematics)
- **SVI Ψ**: System-Verification Index, target ≥ 0.9
- **TLA+**: Temporal Logic of Actions (formal verification)
- **ToT**: Tree of Thought

---

## XXIII. CONSOLIDATION NOTES (what was merged, what was cut)

### XXIII.1 From PP-AGI-MAXOUT-ROADMAP-2026-04-15

- **Kept**: 10-phase structure, PINN architecture, dimensional fabric analysis, 4.7 × 10^18 permutation count, 13B parameter target (compressed to 3B via distillation in Stage 10)
- **Cut**: Phase 8 (Reasoning) — 100% duplicate of existing engines, converted to wiring in Stage 6
- **Merged**: Phase 1 (DL Integration) and Phase 9 (Integration) converted to wiring tasks in Stage 0 + Stage 2
- **Expanded**: Phase 7 (Safety) expanded from 6 MS / 180 engines to match 10-dim S(x)

### XXIII.2 From PP-MAXIMIZATION-ROADMAP

- **Kept**: PP-MS0 canonical Kienzle hardening, PP-MS1 CPS parser, PP-MS2 machine fingerprinting, PP-MS3 machine selection UI, PP-MS4 before/after preview, PP-MS5 prove-out, PP-MS7 coolant/probing/subprogram, PP-MS8 non-traditional, PP-MS9 integration
- **Redistributed**: PP-MS0 → Stage 1, PP-MS1-MS3 → Stage 3+7, PP-MS4 → Stage 7, PP-MS5 → Stage 8, PP-MS6 (library) → Stage 7, PP-MS7 → Stage 8, PP-MS8 → Stage 8, PP-MS9 → Stage 8, PP-MS10 (product page) → Stage 9, PP-MS11 (launch) → Stage 9+10
- **Cut**: none

### XXIII.3 From PP-REVENUE-ROADMAP

- **Kept**: All 8 milestones PP-REV-MS0-7, 42 units, 4-tier pricing
- **Consolidated**: All → Stage 9

### XXIII.4 From PPG-BASELINE-v11-ROADMAP

- **Kept**: HURCO VM30i v11 as definitive reference, 45 units, 43 known bugs
- **Consolidated**: → Stage 8 PP-STAGE-8-MS1 (43 bugs individually tracked)

### XXIII.5 From PP-HARDENING-ROADMAP

- **Kept**: deprecated marker
- **Cut**: 4-line placeholder

### XXIII.6 Frontend Integration from SCRUTINY-R5

- **Kept**: CALC-MILL-MS0 through CALC-CROSS-MS0 scope, 6-week Gantt, Universal Phase 0 pattern, WEDM-studio-as-template
- **Redistributed**: all → Stage 7
- **Retired** per decision #2: R3 Phases C/D (saves ~5,500 LOC vs Universal Phase 0)

---

## XXIV. IMMEDIATE NEXT ACTIONS (post-commit of this document)

1. **Claim Stage 0 MS0** via `prism_orchestrate:roadmap_claim` with milestone `PP-STAGE-0-MS0`
2. **Begin U-S0-08** (export 37 unwired PP engines) — smallest unit, fastest forge cascade
3. **Schedule scrutiny-suite run** against this document — expect 8 pass scores, gate on ≥ 90/100 each
4. **Update** `data/roadmap-index.json` with all 49 milestones from Appendix A
5. **Append** `state/shared/PRISM-SELF-AWARENESS-DIRECTIVE.md` with link to this master roadmap
6. **Freeze** prior PP roadmaps as READ-ONLY references (add `ARCHIVED: see PP-MASTER-UNIFIED-ROADMAP-2026-04-16.md` header)

---

## XXV. CROSS-ROADMAP ALIGNMENT & DEPENDENCY CONTRACTS

The PP pipeline is not an island. It imports infrastructure from four sibling roadmaps and must honor their sub-phase contracts verbatim. This section binds every PP stage to the specific upstream phase/unit it depends on, so missed upstream work is detected before PP blocks on it.

### XXV.1 UNIVERSAL Phase 0.1 – 0.17 Mapping (`UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN-2026-04-15.md`)

PP consumes Universal Phase 0 as its foundation. PP stages cannot run until the listed Universal units exit gate.

| Universal Sub-Phase | Artifacts | PP Stage Consumer | PP Unit Bound |
|---|---|---|---|
| **0.1 Enforcement** | `BOOTSTRAP_MODE.flag`, bypass guard | Stage 0 | U-S0-01 (enforcement scaffold) |
| **0.2 Awareness** | 6 awareness engines (AssetIndex, RegistryWatcher, etc.) | Stage 0 | U-S0-02, U-S0-03 |
| **0.3 Forge-Quint** | forge cascade (engine+hook+MCP action+skill+state) | Stage 1 – 10 (ALL) | every unit uses Forge-Quint |
| **0.4 Registry Locks** | lock manager + conflict resolver | Stage 0 | U-S0-05 |
| **0.5 Hardcoded Loaders** | canonical loader contract | Stage 1 | U-S1-MS1 Kienzle |
| **0.6 Auto-Wiring** | 5 auto-wire scripts (dispatcher, hook, skill, schema, registry) | Stage 0 | U-S0-06, U-S0-07 (wire 210 new engines) |
| **0.7 Reverse Indexes** | 10 reverse-index manifests | Stage 3 | U-S3-MS0 (engine → controller index) |
| **0.8 Rename/Delete** | safe-rename + orphan-aware delete | Stage 0 | U-S0-10 (export 37 unwired) |
| **0.9 Orphan Detection** | orphan hunter + weekly cron | Stage 0 | U-S0-09 |
| **0.10 Codex Adapter** | Codex ↔ Claude context bridge | Stage 7 | U-S7-MS0 (frontend handshake) |
| **0.11 Exit Gate** | 16-item canonical gate | Stage 0 – 10 (ALL) | every milestone's exit gate |
| **0.12 MIT OCW** | 9–10 course integrations | Stage 2, Stage 5 | U-S2-MS3 physics, U-S5-MS2 control |
| **0.13 AGI Self-Awareness** | 7 engines + 6 state + 4 skills + 14 hooks | Stage 6 | U-S6-MS0 deep-reasoning wiring |
| **0.14 SVI Coupling** | 2 engines + 10 hooks + 1 skill + 1 state | Stage 8 | U-S8-MS0 SVI Ψ ≥ 0.9 gate |
| **0.15 Auto-Doc** | 1 engine + 8 hooks + 2–3 scripts + 17 surfaces | Stage 0 – 10 (ALL) | doc emission after every unit |
| **0.16 Op-Integrity** | 4 engines + 5 scripts + 2 skills + 2 hooks + 7 state + regression suite | Stage 8 | U-S8-MS1 regression corpus |
| **0.17 Plugin Activation** | 3 engines + 3 scripts + 3 skills + 3 state + `.mcp.json` | Stage 9 | U-S9-MS0 MCP plugin launch |

**Hard contract:** PP-STAGE-0-MS0 through PP-STAGE-0-MS4 MUST consume Universal 0.2, 0.6, 0.9, 0.13, 0.14, 0.15, 0.16, 0.17 artifacts — PP cannot bootstrap its own awareness/orphan/op-integrity infrastructure.

**Retrofit:** The 1,660+ existing engines (including 81 dormant PP neural engines) must pass through Universal 0.6 auto-wire retrofit before Stage 1 begins.

### XXV.2 MILL-AGI P0 – P7 Structural Mirror (`MILL-AGI-UNIFIED-ROADMAP-2026-04-16.md`)

PP mirrors MILL-AGI's Phase 0 AGI Foundation structure. PP does NOT re-implement the AGI cognition spine — it imports it.

| MILL-AGI Phase | Artifacts | PP Relationship |
|---|---|---|
| **P0 AGI Foundation** | 18 AGI cognitive + 7 neural + meta-learning | **Phase-0 consumer** — PP imports P0.3 (5 ONNX inference models), P0.4 DeepLogicTraceEngine, P0.5 MetaLearningLoop |
| **P1 Strategy Foundation** | strategy pattern library | PP Stage 5 imports strategy primitives |
| **P2 Milling Hardening** | 24 mill-specific engines | PP Stage 3+5 wires these as milling dialect-aware |
| **P3 Mill-Turn Hardening** | 28 mill-turn engines | PP Stage 4 imports for 173-dialect fabric (mill-turn subset) |
| **P4 5-Axis Hardening** | 26 5-axis engines | PP Stage 5 imports for kinematic-aware post |
| **P5 CAMX Completion** | 34 CAMX engines | PP Stage 3 imports for 18-CAM bridge layer |
| **P6 Frontend Wiring** | 14+8 FE pages + 32 APIs + 14 state | **RETIRED** per SCRUTINY-R5 decision #2 (Universal Phase 0 absorbs) |
| **P7 Continuous Learning** | 110 tests + feedback loops | PP Stage 10 closes this loop |

**Artifact budget reconciliation:** MILL-AGI total ~820. PP imports ~180 (P2+P3+P4+P5 strategy engines). PP contributes **210 new PP-specific engines** (Stage 1–10 net-new) — no overlap with MILL-AGI's 820.

### XXV.3 LATHE-MASTER v2 P0.1 – P0.11 Sub-Phase Imports (`LATHE-MASTER-UNIFIED-ROADMAP.md`)

LATHE-MASTER v2 introduced 11 sub-phase disciplines (U-LTH63 – U-LTH135, 73 new units). PP imports each sub-phase's PROTECTIVE HOOK, which blocks PP downstream emission until the upstream sub-phase passes its own exit gate.

| LATHE v2 Sub-Phase | PP Import | PP Unit Consumer |
|---|---|---|
| **P0.1 Formal G-Code Verification (Z3/SMT)** | Z3 collision proof harness | Stage 6 U-S6-MS1 (180 Z3/TLA+ proofs) |
| **P0.2 Local LLM + LoRA Policy** | JM Die 5,297 Okuma programs as training set | Stage 3 U-S3-MS2 (LoRA per dialect, 173 adapters) |
| **P0.3 Bayesian + Causal Depth** | NIG + PC-algorithm + do-calculus + Bayesian Cpk | Stage 8 U-S8-MS2 (SPC + causal root-cause) |
| **P0.4 Asset Utilization Maximization** | 1,869 engines + 509 formulas + 95,608 tools + 4,493 tips | Stage 3 U-S3-MS3 (wire 4,493/4,493 tips, 509/509 formulas) |
| **P0.5 AGI Safety Containment** | corrigibility + goal stability + self-mod approval | Stage 7 U-S7-MS3 (AGI safety envelope) |
| **P0.6 Live Machine Data (MTConnect/OPC-UA/THINC)** | 7 Okuma lathe live streams | Stage 8 U-S8-MS3 (live validation against real spindles) |
| **P0.7 Predictive Twin (60s pre-play)** | simulated twin ahead-of-machine | Stage 8 U-S8-MS4 (60s pre-play harness) |
| **P0.8 Multi-Agent Lathe Orchestration** | supervisor + 5 specialist agents | Stage 6 U-S6-MS2 (multi-agent reasoning) |
| **P0.9 Scientific Simulation Depth** | tribology + fatigue + fracture + residual stress | Stage 2 U-S2-MS4 (full physics depth) |
| **P0.10 Math Depth** | optimal control + info gain + calibrated ensemble | Stage 5 U-S5-MS3 (RL + optimal control) |
| **P0.11 Frontend Integration** | studio wizard + mode-switch hygiene + Zustand + Swiss dialect | Stage 7 U-S7-MS1/MS2 (aligned with Codex) |

**Hard contract:** Each P0.x sub-phase carries a PROTECTIVE HOOK. PP Stage consuming that sub-phase fails its exit gate until upstream hook releases.

### XXV.4 WEDM MCP FULL UTILIZATION PROTOCOL (`WIRE-EDM-COMPREHENSIVE-ROADMAP.md`)

WEDM established the canonical per-session and per-unit discipline. PP adopts it verbatim.

**SESSION START (mandatory, every PP session):**
1. `context_boot` — load `state/shared/PRISM-SELF-AWARENESS-DIRECTIVE.md`
2. `dispatcher_map` — enumerate 84 dispatchers + 4,296 actions
3. `memory_recall` — read `C:\Users\wompu\.claude\projects\H--prism\memory\MEMORY.md`
4. `system_snapshot` — read `mcp-server/data/state/HEALTH_CHECK_REPORT.json` + `BASELINE_INVENTORY.json`

**DURING WORK (every 5–10 MCP calls):**
5. `auto_checkpoint` — flush to `state/shared/COMPACTION_SURVIVAL.json`

**SESSION END:**
6. `memory_save` — append to user memory
7. `checkpoint_enhanced` — write `state/checkpoints/CP-<ts>.json`

**PER-UNIT PROTOCOL (LOOP 1 – 4, mandatory for EVERY PP unit in Stages 1 – 10):**
- **LOOP 1 — Scrutinize:** before writing, run `/scrutinize` against existing engines matching keywords; if ≥ 70% match, use existing (per `/dont-reinvent`).
- **LOOP 2 — Gap Fill:** after engine write, run `/forge-triple` cascade (engine + skill + hook); if missing hook, block commit.
- **LOOP 3 — Tie Up:** wire dispatcher (lazy `_ppX ??= (await import(path)).singleton`) + z.enum action + switch handler + schema; verify with grep for orphan engines.
- **LOOP 4 — Validate:** `npm run build:fast` + `npx vitest run <file>` + exit gate check; only then `git add` + commit.
- **/compact every 3 units:** if context > 40% of window, compact to checkpoint.

**FORGE-TRIPLE / FORGE-QUINT:** All PP new engines MUST ship via `/forge-triple` (3 artifacts) or `/forge-quint` (5 artifacts: engine + hook + MCP action + skill + state file). Solo-engine commits are BLOCKED by `always-build-guard.mjs` Stop hook.

**PHYSICS FUSION INTEGRATION:** `fusion_tier >= 2` required for all Stage 2 milestones — specifically Sato EDM gap model, material-specific MRR, and Ra = C × Ie^a × te^b convergence for Stage 8 EDM validation.

### XXV.5 Codex Frontend Alignment (`SCRUTINY-R5-CODEX-FRONTEND-UNIVERSAL-ALIGNMENT-2026-04-16.md`)

Codex built **134 pages / ~170 components / 87 API clients** in `mcp-server/web` (authoritative — exceeds the stale 111-page `/web` figure cited in earlier MILL-AGI docs). PP Stage 7 wires into Codex's build — not the stale `/web`.

**Inventory contract (Codex-authoritative):**

| Asset | Codex Count | PP Stage 7 Contract |
|---|---|---|
| Pages (`mcp-server/web/src/pages/*.tsx`) | 134 | PP adds 0 new pages — extends CalculatorPage + PPGStudio only |
| Components | ~170 | PP reuses existing WedmStudio 6-step template for PPG 8-step |
| API clients (`web/src/apis/*.ts`) | 87 (40 orphan, 46% orphan rate) | Stage 7 U-S7-MS4 reduces orphan rate ≤ 10% |
| Context providers | 7 (Auth, Learning, Ppg, Erp, WedmStudio, OperatingSystem, UI) | PP extends PpgContext only |
| CalculatorPage | 13,400 LOC / 665 KB / 6-mode matrix | Stage 7 U-S7-MS1 decomposes (mill tab 0→7 sub-panels to match lathe) |

**Mode-switch hygiene bug fix (Stage 7 U-S7-MS2):**
Currently resets: `coolant`, `workholding`, `stockShape`, `entryStyle`, `finishTarget`, `holderBrand`, `holderPackageId`, `doc`, `woc`.
Currently **NOT** resetting (MUST fix): `selectedTool`, `selectedMaterial`, `machineTypeId`, `operation`, `selectedControllerOption`, `programming`, `selectedToolpath`, `selectedStation`.

**WedmStudio 6-step template** is the reference pattern. PPGStudio's 8-step wizard extends it with 2 extra steps (coolant + probing).

**6-week Gantt adjacency (SCRUTINY-R5 W1–W6):**

| Week | Universal-primary | PP-adjacent work |
|---|---|---|
| W1 | Universal 0.1–0.3 Enforcement + Awareness + Forge-Quint | PP-STAGE-0-MS0 asset wiring sprint |
| W2 | Universal 0.4–0.6 Locks + Loaders + Auto-Wiring | PP-STAGE-0-MS1 data labeling kickoff |
| W3 | Universal 0.7–0.9 Reverse Indexes + Rename + Orphan | PP-STAGE-1-MS0 Kienzle canonical hardening |
| W4 | Universal 0.10–0.12 Codex adapter + Exit Gate + MIT OCW | PP-STAGE-7-MS1 CalculatorPage decomposition |
| W5 | Universal 0.13–0.15 AGI Self-Awareness + SVI + Auto-Doc | PP-STAGE-6-MS0 reasoning wiring |
| W6 | Universal 0.16–0.17 Op-Integrity + Plugin Activation | PP-STAGE-9-MS0 MCP plugin + revenue tier launch |

---

## XXVI. PER-UNIT PROTOCOL (inherited from WEDM, mandatory for all 414 PP units)

Every PP unit — in Stages 0 through 10 — follows this exact sequence. No exceptions. Enforced by `always-build-guard.mjs` Stop hook.

```
FOR EACH unit U in PP-STAGE-n-MSm:

  [SESSION START if new session]
    → context_boot + dispatcher_map + memory_recall + system_snapshot

  LOOP 1 — SCRUTINIZE (MANDATORY)
    → /dont-reinvent  →  if similarity ≥ 70%, USE existing (abort create)
    → duplicationGuardEngine.mustCheckBeforeCreating(type, name, desc)
    → grep existing engines/actions/hooks for keyword overlap

  LOOP 2 — GAP FILL (MANDATORY)
    → write engine (follow canonical form: singleton export)
    → /forge-triple cascade:  engine + skill + hook  (or /forge-quint: + MCP action + state)
    → if PP STAGE 2/3/5: enforce fusion_tier ≥ 2 (Sato/Kienzle/Taylor physics)

  LOOP 3 — TIE UP (MANDATORY)
    → wire dispatcher:  lazy _ppX + getEngine case + z.enum action + switch handler + schema
    → verify no orphan: grep singleton name across src/ — must appear in ≥ 2 files
    → update reverse index (Universal 0.7)

  LOOP 4 — VALIDATE (MANDATORY)
    → npm run build:fast  (must pass)
    → npx vitest run <new-test-file>  (all tests green)
    → exit gate check (16 canonical items)
    → git add <engine> <test> <dispatcher> <skill> <hook>
    → git commit (format: LAYER-PHASE-UNIT: title — summary)

  [/compact every 3 units if context > 40%]

  [SESSION END]
    → memory_save + checkpoint_enhanced
```

**Enforcement:** `always-build-guard.mjs` Stop hook blocks exit if any loop is skipped. `state/shared/PENDING_GAP_ENGINES.json` registry tracks incomplete Forge-Triples.

**Failure modes blocked:**
- Solo engine commit without test → BLOCKED
- Engine + test commit without dispatcher wiring → BLOCKED  
- Dispatcher action without schema entry → BLOCKED
- Hook without registry entry → BLOCKED
- Unit skipping `/dedup` pre-check → BLOCKED

---

## XXVII. RETIREMENT LIST (absorbed by Universal Phase 0, do NOT re-implement)

The following units from sibling roadmaps are **RETIRED** — absorbed by Universal Phase 0 or this master roadmap. Re-attempting them is a duplication violation.

### XXVII.1 From MILL-AGI-UNIFIED-ROADMAP (18 units retired)

| Unit | Reason | Absorbed By |
|---|---|---|
| MILL-AGI P0.1 (Awareness middleware) | Universal 0.2 supersedes | Universal 0.2 (6 awareness engines) |
| MILL-AGI P0.2 (Reasoning-as-default) | Universal 0.13 supersedes | Universal 0.13 (7 AGI self-awareness) |
| MILL-AGI P0.4 (DeepLogicTraceEngine) | Duplicate of Universal 0.13 | Universal 0.13 |
| MILL-AGI P0.6 (MILL_CAPABILITY_MANIFEST) | Universal 0.7 reverse index | Universal 0.7 |
| MILL-AGI P0.7 (AWR residual) | Universal 0.15 auto-doc | Universal 0.15 |
| MILL-AGI P6.1 (FE page scaffold ×14) | Codex built 134 pages | Codex frontend (done) |
| MILL-AGI P6.2 (API client ×32) | Codex built 87 clients | Codex frontend (done) |

### XXVII.2 From R3 Phases C/D (~5,500 LOC saved)

| Unit | Reason | Absorbed By |
|---|---|---|
| R3 Phase C Step 8 (manifest) | Universal 0.7 reverse index | Universal 0.7 |
| R3 Phase C Step 9 (orphan scan) | Universal 0.9 orphan detection | Universal 0.9 |
| R3 Phase D Step 11 (doc emission) | Universal 0.15 auto-doc | Universal 0.15 |

### XXVII.3 From R4 Scrutiny Fixes

| Unit | Reason | Absorbed By |
|---|---|---|
| R4 Fix #4 (hook registry dedupe) | Universal 0.1 enforcement | Universal 0.1 |
| R4 Fix #9 (skill registry) | Universal 0.3 Forge-Quint | Universal 0.3 |
| R4 Fix #13 (doc index) | Universal 0.15 auto-doc | Universal 0.15 |
| R4 U-PP-01 (PP awareness) | Universal 0.2 + this roadmap Stage 0 | Universal 0.2 + Stage 0 |

### XXVII.4 Additive-Kept (NOT retired, must still execute)

- **R3 Phase A Steps 1–3** — foundational scaffolding (KEPT)
- **R4 Fixes #3, #5, #6, #7, #8, #10, #11, #12** — specific PP dispatcher fixes (KEPT; #3+#5 already merged in 9e4913ae)
- **MILL-AGI P0.3 (5 ONNX inference models)** — KEPT, imported by PP Stage 5
- **MILL-AGI P0.5 (MetaLearningLoop)** — KEPT, imported by PP Stage 10
- **MILL-AGI P2–P5** — KEPT, all mill/mill-turn/5-axis/CAMX hardening still required

---

## Appendix J — Phase 0 Artifact-Count Reconciliation

Total Phase 0 artifact budget across all roadmaps, reconciled to avoid double-counting:

| Roadmap | Phase 0 Artifacts | PP Overlap | Net-New |
|---|---|---|---|
| UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN (0.1–0.17) | 595 | — | 595 (foundation) |
| MILL-AGI P0 (18 AGI cognitive + 7 neural + meta-learning) | 820 total / ~180 P0-specific | PP imports 180 | 640 MILL-specific |
| LATHE-MASTER v2 (P0.1–P0.11) | 135 (73 new units + refactors) | PP imports all 135 protective hooks | 135 |
| WIRE-EDM-COMPREHENSIVE (7 MS / 45 units) | 45 units + 250 tests | PP imports MCP protocol + LOOP 1–4 | 45 |
| PP-MASTER (this roadmap) | **210 net-new engines + 414 units** | — | **210 PP-specific** |
| **TOTAL net-new artifacts (no double-count)** | — | — | **~1,625 engines + ~2,000 units** |

**Per-stage artifact shape (PP-MASTER 210 net-new breakdown):**

| Stage | Net-New Engines | Net-New Tests | Net-New Hooks | Net-New Skills |
|---|---|---|---|---|
| Stage 0 (Pre-flight) | 0 (wiring only) | 50 | 4 | 2 |
| Stage 1 (Physics canonical) | 28 | 120 | 6 | 3 |
| Stage 2 (Deep Learning) | 35 (PINN + Transformer + GNN + RL) | 180 | 8 | 4 |
| Stage 3 (Neural dialect fabric) | 42 (173-dialect fabric) | 200 | 10 | 5 |
| Stage 4 (Machine fabric) | 18 (860 machine profiles) | 80 | 4 | 2 |
| Stage 5 (Toolpath RL+Opt) | 22 | 110 | 6 | 3 |
| Stage 6 (Reasoning SMT/Z3) | 20 (ToT, Z3, TLA+) | 100 | 6 | 3 |
| Stage 7 (Frontend Calc+PPG) | 15 (extends WedmStudio) | 80 | 4 | 2 |
| Stage 8 (Validate E2E+POC) | 12 | 90 | 4 | 2 |
| Stage 9 (Revenue+Tiers) | 10 (quota, billing, licensing) | 50 | 3 | 2 |
| Stage 10 (Launch + CL) | 8 (continuous learning) | 90 | 3 | 2 |
| **TOTAL** | **210** | **1,150** | **58** | **30** |

---

## Appendix K — Alignment Checklist (pre-exit every PP stage)

Before closing any PP stage, verify alignment with all four sibling roadmaps:

- [ ] **Universal 0.1–0.17**: All consumed sub-phases have passed their exit gate (check `state/shared/UNIVERSAL_PHASE_STATUS.json`)
- [ ] **MILL-AGI P0–P5**: If consuming P0.3/P0.5/P2-P5, verify singleton exports exist and pass their tests
- [ ] **LATHE-MASTER v2 P0.x**: If consuming a sub-phase, verify protective hook is released (check `state/shared/LATHE_SUBPHASE_HOOKS.json`)
- [ ] **WEDM MCP Protocol**: SESSION START performed; LOOP 1–4 completed for every unit in stage; `/compact` cadence honored
- [ ] **Codex Frontend**: Stage 7 changes merged via Codex adapter (Universal 0.10), no new orphan API clients, mode-switch hygiene bug status tracked
- [ ] **Retirement List (XXVII)**: No unit in this stage duplicates a retired unit
- [ ] **Artifact Count (Appendix J)**: Stage's net-new engines/tests/hooks/skills match Appendix J allotment
- [ ] **Duplication Guard**: `duplicationGuardEngine.checkBeforeCreating` called for every new engine/algorithm/formula/hook/action
- [ ] **Forge-Triple/Quint**: Every new engine shipped with hook + skill (+ MCP action + state for Quint)
- [ ] **Per-Unit Protocol (Section XXVI)**: LOOP 1–4 completed, build green, tests green, exit gate 16-item pass

Fail any item → stage cannot close. No exceptions. Omega = 1.0 demands it.

---

**END OF PP-MASTER-UNIFIED-ROADMAP-2026-04-16.md**

_Generated by Claude Opus 4.7 as master consolidation of 5 source PP roadmaps + 8 scrutiny passes + frontend alignment + universal-skills quality standard. Omega target 1.0. AGI-aligned: deep learning + deep reasoning + deep logic + neural networking. Frontend-aware: 6-mode calculator + PPG 8-step wizard._

_Revision v1.1 (2026-04-17): Added Sections XXV (Cross-Roadmap Alignment), XXVI (Per-Unit Protocol), XXVII (Retirement List), Appendix J (Artifact-Count Reconciliation), Appendix K (Alignment Checklist) — explicit binding to UNIVERSAL Phase 0.1–0.17, MILL-AGI P0–P7, LATHE-MASTER v2 P0.1–P0.11, WEDM MCP FULL UTILIZATION PROTOCOL + LOOP 1–4 + FORGE-TRIPLE per-unit, and SCRUTINY-R5 Codex 134-page frontend + 6-week W1–W6 Gantt._
