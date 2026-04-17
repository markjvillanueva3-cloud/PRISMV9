# SCRUTINY PASS 3 — Print→CNC One-Shot Pipeline
**Date:** 2026-04-16
**Scope:** Evaluate whether PRISM can deliver the "print → CNC program in one shot" promise with extreme intelligence and coordination
**Inventory source:** H:/prism-agi-infra-a/PRISM-INVENTORY-LATEST.md (2,114 engines / 87 dispatchers / 4,471 actions / 509 formulas / 95,608 tools / 910 machines / 4,493 tribal tips)
**Agents used (round 3 — 3 new roles):** goal-planner, collective-intelligence-coordinator, safety-physics
**Prior rounds used:** physics-reviewer, system-architect, analyst, code-archaeologist, production-validator, security-manager

---

## TL;DR — CONVERGENT VERDICT: **BLOCK**

All three independent scrutiny agents reached the same conclusion from orthogonal angles:

| Agent (role) | Score | Verdict |
|---|---|---|
| **goal-planner** (pipeline completeness) | ~43% stage coverage | NO-GO |
| **collective-intelligence-coordinator** (synergy) | 0.148 / 1.0 synergy | capability-surplus but memoryless |
| **safety-physics** (S(x) chain) | ~0.25 S(x) floor (vs 0.70 required) | HARD BLOCK |

**The math is there. The wiring is absent.** PRISM is not an AGI; it's a high-quality encyclopedia of formulas with catastrophic cross-engine silence. Closing the gaps is a ~6-8 day focused effort, not a months-long rebuild.

---

## 1. The One-Shot Entry Point

**Exists:** `AutoPrintToProgramBridgeEngine.runAutoPipeline(input)` at `H:/prism/mcp-server/src/engines/AutoPrintToProgramBridgeEngine.ts:159`
**Wired:** `camDispatcher.ts:2780-2834` → actions `print_to_program_full`, `auto_print_to_program`
**Broken:** `print_to_program_enhanced` is in the z.enum but `PrintToProgramPipelineEngine.ts:506` switch has NO case for it → every call throws `Unknown action`
**Untested:** ZERO test files import `AutoPrintToProgramBridgeEngine`. Three existing pipeline tests use pre-parsed `DrawingInput`, not raw files.
**Secretly limited:** Bridge at line 227 admits `"STEP content provided as string — StepImportEngine requires file_path. Pass file path instead."` → raw-string STEP returns zero features.

---

## 2. Pipeline Stage Coverage (goal-planner findings)

```
STAGE                             COVERAGE   STATUS    KEY GAP
───────────────────────────────────────────────────────────────────────────────────
S1  File ingestion                  ~55%    PARTIAL   DWG = absent. STL = absent. Native CAD = none
S2  PMI / GD&T extraction           ~20%    FAIL      No AP242 PMI extractor. BlueprintOCR = text only
S3  B-rep / topology                ~40%    PARTIAL   Mesh only, no face-graph adjacency
S4  Feature recognition             ~60%    PARTIAL   No feature-interaction analysis
S5  Stock & setup inference         ~50%    PARTIAL   No op-splitting / orientation planner
S6  Strategy selection              ~25%    FAIL      OptimalStrategySelectionEngine NOT called
S7  Tool selection                  ~70%    PARTIAL   95k catalog wired; no holder/runout pass
S8  Physics validation              ~75%    PARTIAL   Chatter/thermal not fed back per-op
S9  Toolpath generation             ~15%    FAIL      Canned cycles, NOT collision-checked XYZ
S10 Post-processing                 ~10%    FAIL      PostProcessorPipelineEngine NOT invoked
S11 Verification                    ~25%    FAIL      Regex syntax only; no kinematic sim
S12 Output + provenance             ~70%    PARTIAL   No deep-logic proof chain
```

**Weighted coverage: 43%.** The output today is not a machine-ready program for any non-trivial part — it's a canned-cycle skeleton without controller dialect or collision check.

---

## 3. Coordination Gaps (collective-intelligence findings)

**Synergy axis scores (0.0-1.0):**

| # | Axis | Score | Weight | Contrib |
|---|------|-------|--------|---------|
| 1 | Reasoning→Execution coupling | 0.10 | 0.20 | 0.020 |
| 2 | Awareness middleware adoption | **0.05** | 0.15 | 0.008 |
| 3 | Cross-engine working memory | 0.15 | 0.10 | 0.015 |
| 4 | Tribal knowledge propagation | 0.45 | 0.10 | 0.045 |
| 5 | REASONING_TRACE_LEDGER | **0.00** | 0.10 | 0.000 |
| 6 | Neural ↔ formula fusion | 0.10 | 0.15 | 0.015 |
| 7 | Multi-agent orchestration | 0.10 | 0.10 | 0.010 |
| 8 | Feedback loop closure | 0.35 | 0.10 | 0.035 |

**Overall synergy: 0.148 / 1.0**

**Most damning findings:**

- `consultAwareness` has **0 of 87 dispatchers** as callers. `awarenessMiddleware.ts` is well-designed (30s cache, fails-open, <50ms budget) — nobody invokes it.
- `MillingPrintToProgramEngine.ts` imports 13 engines at lines 28-69; **zero** are reasoning engines (PRISMCreativeReasoning, ManufacturingReasoning, MultiPathReasoning, HypothesisRanker, CounterfactualReasoning).
- **0 matches** for `ReasoningTraceLedger|REASONING_TRACE|observeActual|DeepLogicTraceEngine` across the codebase. P0.4 roadmap deliverable exists only as a title.
- Neural models live as `data/models/*/checkpoint.json` — **no `.onnx` weights.** Runtime `onnxruntime-node` is in deps but `ModelRegistryEngine.loadModel` has zero production callers.
- `MultiAgentCoordinatorEngine` exists as a class. **0 dispatchers invoke it.**
- No shared blackboard/working memory. Every pipeline re-queries materials, re-fetches Kienzle, re-calls tribal tips.

**Quote (collective-intelligence):** *"The 2,114 engines are a capability surplus masquerading as intelligence. The ceiling isn't math — it's the lack of a shared cognitive substrate."*

---

## 4. Safety-Physics Chain Breaks (safety-physics findings)

### Canonical constants audit — **DIRTY (systemic violation)**
30+ engines inline `kc1_1` / `taylor_n` despite the CLAUDE.md rule *"NEVER inline Kienzle/Taylor constants — import from constants.ts."* Worst offenders:

- `AdaptivePipelineGeneratorEngine.ts:189-194` — full ISO P/M/K/N/S/H table inline
- `CAMKernelOrchestratorEngine.ts:361-366` — duplicate ISO table
- `ChanceConstrainedOptimizationEngine.ts:72-77` — duplicate ISO table
- `CalibratedSimulationEngine.ts:71-76` — **divergent** (steel taylorC: 200 vs canonical 300)
- `BatchCAMMaterialBridgeEngines.ts:486,514,543,571,600,630,660` — 7 inline kc values
- `AIMLEngine.ts:382` — bare `taylorN = 0.25` with no material key
- `BayesianToolLifeEngine.ts:82` — inline Taylor block

**Critical divergence:** `CalibratedSimulationEngine` Ti `taylorC:40` vs `CAMKernelOrchestratorEngine` Ti `taylor_C:100` — **2.5x difference** for same ISO-S material. One will crash a Ti-6Al-4V job.

### S(x) coverage — **0.05 / 1.0**
137 regex hits across 30 engines but only `OmegaSafetyScoreEngine.ts` implements S(x). `PrintToProgramPipelineEngine.ts:2489` computes `safetyPassRate` but **never hard-gates**. A program with `safetyPassRate = 0.3` still returns `success: true` at line 2508.

### Dimensional consistency — **UNVERIFIED / IMPLICIT**
G-code output at `PrintToProgramPipelineEngine.ts:2451` is a bare string — no `unit: mm|inch` tag, no AtomicValue wrapping. mm/inch mix would go undetected → risk of 25.4× over-travel.

### Post-processor physics — **3 of 194 stages (1.5%)**
PostProcessorPipelineEngine has 194 stage-style matches; physics import happens at 3 sites (lines 23, 298, 336 — thermal-wear RK4 at 2.7b is the only positive). Roadmap's "only 2 of 38 stages consult mill physics" understates; at import level it's **3/194**.

---

## 5. Top 10 Severity-Ranked Blockers (cross-agent consensus)

| # | Sev | Blocker | Source | Fix location |
|---|-----|---------|--------|--------------|
| 1 | **S1** | No final S(x) hard gate — unsafe programs ship | safety-physics | `PrintToProgramPipelineEngine.ts:2489` |
| 2 | **S1** | `ToolpathGenerationEngine`+`CollisionDetectionEngine` not called — canned cycles only | goal-planner | `PrintToProgramPipelineEngine.ts:2442` |
| 3 | **S1** | `PostProcessorPipelineEngine` not called — output not controller-dialect | goal-planner | `PrintToProgramPipelineEngine.generateGCode()` |
| 4 | **S1** | Divergent Taylor-C across engines — 2.5× Ti life prediction error | safety-physics | 30+ files, migrate to constants.ts |
| 5 | **S1** | Raw STEP/IGES content fails silently with zero features | goal-planner | `AutoPrintToProgramBridgeEngine.ts:227` |
| 6 | **S1** | `print_to_program_enhanced` dispatcher action throws on every call | goal-planner | `PrintToProgramPipelineEngine.ts:506` |
| 7 | **S2** | 0 of 87 dispatchers invoke `consultAwareness` middleware | collective-int | 8 mill dispatchers (P0.1) |
| 8 | **S2** | `OptimalStrategySelectionEngine` not imported by any print-to-program pipeline | goal-planner / col-int | `MillingPrintToProgramEngine.ts` imports |
| 9 | **S2** | No `REASONING_TRACE_LEDGER` — no audit trail for floor-failure investigation | collective-int | Build `ReasoningTraceLedgerEngine.ts` |
| 10 | **S2** | No `observeActual` — ML ranker starves; JM Die archive unused as training signal | collective-int | Auto-emit at pipeline conclusion |

---

## 6. Missing Engines Confirmed Absent

Engines named in roadmap Phase 0 / Phase 2 but **not present** (grep-confirmed):

1. **`STEPAP242PMIExtractorEngine`** (~550 LOC) — Stage 2; pulls GD&T/datum/surface finish from STEP AP242 PMI
2. **`DeepLogicTraceEngine`** (~700 LOC) — Stage 11; first-order proof chain ("why this tool?")
3. **`ProgramVerificationEngine`** (~400 LOC) — Stage 11; wraps sim+collision+cycle-time as a real Stage-11 gate
4. **`RawCADToDrawingInputAdapterEngine`** (~650 LOC) — Stages 1→4 bridge (replaces the 15-line toys inside `AutoPrintToProgramBridgeEngine.ts:416-494`)
5. **`DWGParserEngine`** (~450 LOC) — Stage 1; DWG binary import
6. **`ReasoningTraceLedgerEngine`** (~350 LOC) — append-only JSONL at `data/state/REASONING_TRACE_LEDGER.jsonl`
7. **`NeuralFormulaFusionEngine`** (~400 LOC) — confidence-weighted ensemble of neural prediction + formula prediction

**Missing assets (non-engine):**
- `.onnx` weights for 5 planned Phase 0.3 neural models (directories exist, weights don't)
- `MILL_CAPABILITY_MANIFEST.json` (Phase 0.6 deliverable)
- Awareness-middleware adoption in 8 mill-relevant dispatchers

---

## 7. Minimum Closure Set to Ship "One Shot" (Pareto plan)

Ordered by cost/impact. Roughly **6–8 focused engineering days** gets you to a shippable floor.

### Phase A — Unblock the pipeline (≈1-2 days, ~700 LOC)
1. Add `case "print_to_program_enhanced":` to `PrintToProgramPipelineEngine.ts:506` switch
2. Write tmp-file adapter in `AutoPrintToProgramBridgeEngine.ts` so raw STEP/IGES strings work
3. Insert hard gate at `PrintToProgramPipelineEngine.ts:2489` — reject when `safetyPassRate < 0.70`
4. Tag every `ProgramBlock` + program envelope with explicit `unit` field

### Phase B — Wire the real stages (≈2-3 days, ~900 LOC)
5. Wire `toolpathGenerationEngine` + `collisionDetectionEngine` as Stage 3.5 + 5.5
6. Wire `postProcessorPipelineEngine` as Stage 4.5 when `machine_brand` is set
7. Wire `optimalStrategySelectionEngine` into `MillingPrintToProgramEngine` strategy pick

### Phase C — Build coordination substrate (≈2-3 days, ~1500 LOC)
8. Build `ReasoningTraceLedgerEngine` + force trace emission from 3 print-to-program pipelines
9. Wire `consultAwareness` into 8 mill dispatchers (calc/cam/cad/turning/edm/machineLive/knowledge/agent)
10. Auto-emit `recordOutcome` at pipeline conclusion; add `scripts/backfill-jm-die-outcomes.mjs`

### Phase D — Fix the physics hygiene (≈1 day)
11. Migrate 30 engines with inline kc1_1/taylor_n to `constants.ts` imports
12. Add CI rule: fail on inline kc1_1/taylor_n literals in non-constants.ts files

### Phase E — Prove it works (≈0.5 day)
13. Write `src/__tests__/AutoPrintToProgramBridgeEngine.test.ts` with golden STEP+DWG+DXF samples
14. Assert: output has `postprocessor_applied=true`, unit tag present, S(x) ≥ 0.70, collision-pass

**After this closure set:** "print→CNC one shot for prismatic parts with canonical features" is an honest claim. Phases P3-P7 of MILL-AGI-UNIFIED-ROADMAP (mill-turn, 5-axis, per-CAM, frontend wiring, continuous learning) are polish on top.

---

## 8. What This Changes on the Roadmap

The `MILL-AGI-UNIFIED-ROADMAP-2026-04-16.md` artifact budget (~820 new artifacts, 7 phases) is **not invalidated** — but its ordering needs reshuffling. The current roadmap front-loads AGI substrate (P0) before pipeline plumbing. Prior two scrutiny rounds already noted 21 of 30 P0 engines are redundant. This round proves the critical path isn't "add more AGI engines" — it's **wire up the engines we have** so the one-shot entry point can reach them.

**Recommended roadmap surgery:**
- Promote Phase A+B (closure Phases 1-7 above) from P2/P5 buried inside the roadmap to a **P-minus-1 "Pipeline Closure" sprint** that ships BEFORE P0 AGI expansion
- Keep P0.4 `DeepLogicTraceEngine` + P0.2 reasoning wiring as immediately-next since they reuse existing reasoning engines
- Defer P0.3 neural inference layer until the classical pipeline is closed — neural ensemble is meaningless if the deterministic path is unwired

---

## 9. Final Verdict

**Can PRISM deliver "print to CNC program in one shot" today?** **NO.**

**Can PRISM deliver it in 6-8 engineering days with the closure set above?** **YES — for prismatic parts with canonical features.**

**Is PRISM operating as an "AGI-grade" system today?** **NO.** It is a capability-surplus library. The reasoning engines, neural models, multi-agent coordinator, awareness orchestrator, and trace ledger promised in the roadmap are either named-only (trace ledger, neural weights) or unadopted by the pipeline that was supposed to consume them. Synergy score 0.148 / 1.0.

**The good news:** the math is overwhelmingly correct (Kienzle, Taylor, Johnson-Cook, Bayesian conjugate-normal, Wilson, UCB1, Welford, NURBS, RK4 thermal-wear, Timoshenko beam — all present and canonical). Every single-engine computation is strong. The failure mode is **coordination silence**, not mathematical error. That failure mode is tractable.

**Closure effort:** ~1,500-2,100 new LOC across ~14 concrete tasks. Roughly 2% of the current engine-count surface. After which the 2,114 engines stop being islands and start being a mind.

---

## Artifacts
- Report: `H:/prism/SCRUTINY-PRINT-TO-CNC-ONESHOT-2026-04-16.md` (this file)
- Prior rounds: `H:/prism/SCRUTINY-PP-AGI-*-2026-04-15.md`, `H:/prism/PP-AGI-MAXOUT-SCRUTINY-CONSOLIDATED-2026-04-15.md`
- Roadmap: `H:/prism/MILL-AGI-UNIFIED-ROADMAP-2026-04-16.md`
- Latest inventory: `H:/prism-agi-infra-a/PRISM-INVENTORY-LATEST.md`
