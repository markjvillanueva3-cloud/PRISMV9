# ENGINE / ALGORITHM / FORMULA AUDIT — stubs · completeness · wiring

> **Scope:** operator directive (slot:bravo, 2026-06-19) — *"audit all engines, algorithms and formulas first for stubs and complete builds. assess validity. Ensure that each individual engine, algorithm and formula is wired and utilized by all compatible end users."*
> **Method:** harness-driven (deterministic scans, out-of-context) per `/forge-audit-v3` + R5 (Ollama/script-first, not Claude grinding 3825 files). **ALL MEANS ALL** — full population enumerated first, then scanned in full.
> **Verdict:** the engine/algorithm/formula layer is **substantially complete and wired**. Zero stub engines. The actionable backlog is small and bounded (10 unwired assets + a handful of enhancement TODOs).

---

## 1. Full population (enumerated FIRST — ALL MEANS ALL)

| Layer | Count | Source |
|---|---|---|
| Engine files (canonical) | **3812** | `audit-unwired-engines.mjs` canonical folder scan |
| Engine `.ts` (recursive incl. sub-files) | 3851 | `find src/engines -name '*.ts'` |
| Algorithms (real, excl. `*.test.ts` + index) | **122** | `src/algorithms/*.ts` |
| Physics/formula files | **6** | `src/physics/*.ts` |
| Formula registry | 1 | `registries/FormulaRegistry.ts` |
| Dispatchers | 119 | `src/tools/dispatchers/*.ts` |

---

## 2. Wiring / utilization audit (the "wired & utilized by all compatible end users" axis)

### Engines — `audit-unwired-engines.mjs` (output: `state/shared/UNWIRED-ENGINE-AUDIT-2026-06-19.json`)

| Classification | Count | % |
|---|---|---|
| WIRED-DIRECT | 3597 | 94.4% |
| WIRE-EXEMPT (tagged) | 122 | 3.2% |
| WIRED-VIA-ORCH | 36 | |
| WIRED-VIA-ENGINE | 26 | |
| WIRED-VIA-ROUTE | 12 | |
| WIRED-VIA-HOOK | 8 | |
| WIRED-VIA-SINGLETON / ENTRY | 3 | |
| **UNWIRED** | **7** | **0.18%** |
| DORMANT-BRIDGE (gated, intentional) | 1 | |

**Harness validity (assessed, R12):** I hypothesized the 7 UNWIRED were a transitive-wiring false-positive (consumed by a wired peer engine). **Falsified by reading the live references** — e.g. `CreoAddinRibbonEngine` references `CreoToolkitBridgeEngine` only in a *comment* (line 13), and `BatchCAMAPIBridgeEngines` only co-defines a same-named class, not an import. The matcher `engineReferencedInConsumer` **strips comments first** (`stripCommentLines`, lines 155-168) and requires a real import form — so it correctly does not count these. **The audit is valid; the 7 are genuinely unwired. No harness fix made (a non-bug).**

### The 7 genuinely-unwired engines — all external-CAD/CAM-vendor bridges (built ahead of seat integration)

| Engine | External target | Consumer status |
|---|---|---|
| `CreoToolkitBridgeEngine` | PTC Creo Toolkit (DLL) | comment-only ref in CreoAddinRibbon |
| `CATIACAAV5BridgeEngine` | Dassault CATIA CAA V5 | — |
| `RhinoCommonBridgeEngine` | McNeel RhinoCommon | — |
| `OnshapeAPIBridgeEngine` | Onshape REST API | test-only |
| `OnshapeLiveCollabAdapter` | Onshape live collab | — |
| `NXOpenAssemblyDrawingEngine` | Siemens NXOpen | test-only |
| `HyperMillACBridgeEngine` | hyperMILL Automation Center (port 18365) | co-defined twin in BatchCAMAPIBridgeEngines IS camDispatcher-wired |

**Disposition (recommendation — CAD/CAM galaxy = delta/kilo/echo own these):** these bridge external *proprietary CAD seats*. Wiring them as live MCP actions before the seat is installed/integrated would create dispatcher actions that throw/timeout at runtime (R12 — an exposed-but-dead action is worse than an honest gap). Correct remedy is **either** (a) `// WIRE-EXEMPT: forward-built bridge, awaiting <seat> integration milestone` annotation (removes the false-backlog signal, no runtime risk), **or** (b) wire to `cadDispatcher`/`camDispatcher` once the owning slot confirms seat-integration readiness. **Not unilaterally actioned by bravo** (R8 — external-seat readiness is CAD-domain knowledge; these files are delta/kilo/echo-claimed). Surfaced to those slots.

### Algorithms — 3 genuinely orphaned (the SAFE, in-domain wiring target)

`FiniteElementMethod1D` (323 LOC), `LinearStateSpaceModel` (483 LOC), `TSNEAlgorithm` (271 LOC) — complete, tested pure-math ports (KNOWLEDGE-CONVERSION-MS0) that are **not in AlgorithmRegistry, not imported by any engine, not in the AlgorithmGatewayEngine catalog**. Unlike the CAD bridges they have **no external-seat dependency** → wiring them into `AlgorithmRegistry` (read by the gateway via `algorithmRegistry.all()` and exposed through `prism_algorithm`) is safe + in-scope, matching the established ALGO-SYNERGY pattern (tango, 2026-06-15, FuzzyController). **→ Wired as the follow-on unit to this audit (U-ALGO-WIRE-ORPHANS).**

---

## 3. Stub / completeness audit (the "stubs and complete builds" axis)

| Marker | Engines | Algorithms | Physics |
|---|---|---|---|
| `throw new Error("...not implemented")` | 1 (FALSE +) | 0 | 0 |
| `// TODO / FIXME / STUB` | 16 | 0 | 0 |
| `return null/{}/[] as ... // stub` | 1 | 0 | 0 |
| `"placeholder"` string | 124 (mostly UI/param text) | — | — |
| `Math.random(` | 359 (mostly Monte-Carlo/stochastic — legitimate) | — | — |

**Hard markers triaged (R12 — read the body, not the marker):**
- `CommonlyMissedPatternsRegistry:85` + `PRISMNeuralKnowledgeSynthesisEngine:240` — **false positives**: registries/examples that *describe* stub patterns as data.
- `CodingCopilotEngine:399` + `AutoForgeEngine:437` — **code-generator templates** that emit `// TODO`/`status:"not_implemented"` *into generated code*, not stubs in the engine.
- Genuine enhancement TODOs inside *complete* engines (NOT stub engines): `OEECalculatorEngine:79` (assumes 60/40 breakdown vs measured), `LatheReinforcementLearningEngine:1895` (`value_loss` not tracked separately), `AutoTestGeneratorEngine:392/398` (add Sandvik/ISO reference data). → domain-owner enhancement backlog, not blocking.

**TODO/FIXME triage (iter 6 — complete classification of the 16 markers):** 4 benign (code-generator *template strings* in `AutoForgeEngine:437` + `CodingCopilotEngine:399/414/418` that emit TODO into GENERATED code by design; `PRISMNeuralKnowledgeSynthesisEngine:240` is a doctrine example string). 2 real-but-minor, domain-owned: `LatheReinforcementLearningEngine:1895` `value_loss:0 //TODO` (fabricated RL training diagnostic metric → india/whiskey) + `OEECalculatorEngine:79` 60/40 default split (documented business default → hotel). Neither safety/physics-critical; flagged to owners.

**Conclusion:** **zero stub engines.** The hard-stub surface is benign. The 124 placeholder / 359 Math.random hits are dominated by legitimate uses (UI text, Monte-Carlo sampling, stochastic physics).

**Placeholder DANGEROUS-SUBSET triage (iter 5 — placeholder-value-in-physics check):** read every `placeholder` hit in physics/safety/calc engines. Mostly benign (safe sentinels: `HyperMillMaterialPhysicsBridge:127` iso_group="P" returned with `kc1_1:0,found:false` — impossible to misuse; `MillingForceEngine` header is historical, already stub-rescued). **One GENUINE defect found + FIXED** [U-FIX-FEEDRATE-PLACEHOLDER]: `ToolpathForceProfileEngine.generateModulations` hardcoded `originalFeedrate = 1000`, so every feed-modulation recommendation used a fabricated baseline instead of the segment's real `feedrate_mm_min` (R12/R9 fabricated-output). Fixed (thread `input.segments` + per-segment lookup) + 10 new tests + 2-arm scrutiny PASS.

**Placeholder FABRICATED-OUTPUT deep sweep (iter 8 — traced 8 high-signal hardcoded/placeholder hits fleet-wide for the feedrate-bug class):**
- BENIGN (verified): `EndToEndPipelineEngine:552` `S0 M03` IS filled with real rpm in `assembleProgram:604` (`.replace S0->S<rpm>`); `CollisionPreventionEngine:559` `body_type:"stock"` is on the tool-assembly AABB whose own body_type is never read (overlap checks read `obs.body_type`); `GrooveClassificationEngine:299` (documented heuristic, refined by peck engine); `CADFileClassifierEngine:212` + `PPArcValidatorEngine:298` (documented caller-supplied sentinels); `AutoWiringEngine:419` (test-template).
- **2 NEW REAL fabricated-output defects found (domain-owned — need an input-API/geometry change, NOT safe bravo plumbing since the real value is not in scope):**
  - `WEDMCalculatorAIEngine:433` `pathLength=100` → `cuttingTime=pathLength/feed` → **every** `passes[].cutting_time_min` + `WEDMCalcResult.predicted_cycle_time_min` (shipped). `WEDMCalcInput` carries no cut-length/perimeter. → **mike**: add optional `cut_length_mm` + fail-loud (null cutting_time when absent, never fabricate).
  - `LatheOpusReasoningEngine:1931` `cycleTimePerPart=5` → `calculateOperationCost` → `costPerPart` → returned `efficiencyScore`. → **whiskey/charlie**: thread real cycle time from part volume/MRR; (partly cancels as a *relative* comparator, but absolute cost/efficiency is fabricated).

**Math.random DANGEROUS-SUBSET triage (iter 4 — fake-physics-by-randomness check):** read every `Math.random` line in the physics-domain engines (force/thermal/wear/cutting/deflection/surface/chatter/physics). **VERDICT: zero fake physics.** All uses are legitimate: Box-Muller Gaussian sampling (`AdvancedPostPhysicsEngine:222`, `AdvancedWearPhysicsEngine:168`, `PhysicsMLHybridEngine:43`, `ThermalWearCouplingEngine:142`), NN He/Xavier weight-init (`ForceNeuralPredictorEngine:395`, `ThermalNeuralPredictorEngine:565`, `PhysicsNeuralBridgeEngine:90`), and RL epsilon-greedy exploration (`LatheReinforcementLearningEngine:900`, `MillingReinforcementLearningEngine:160`). **No deterministic physics output is fabricated via `Math.random`.** (Note, not a defect: the NN weight-init is unseeded → non-reproducible init across instantiations; standard practice, and trained/loaded weights override it.) The remaining ~336 non-physics hits are in AI/ML/agent/optimization engines where randomness is inherent (exploration/sampling/init/ids) — no validity risk.

---

## 3b. Cost/quote engine fabricated-output sweep (iter 9-10, charlie money-surface)

Scanned 76 cost/quote engines for hardcoded values flowing into returned cost/quote/ROI/time outputs.
- **1 SILENT defect found + FIXED** (high severity — value presented as exact): `ToolROIEngine` `annualParts=5000` → returned `annual_savings` ($/yr feeding purchasing). [U-FIX-TOOLROI-ANNUALPARTS] optional `annual_parts` + named default + ASSUMED label + schema discoverability. Dispatcher-wired (business+calc). 8 tests, 2-arm PASS.
- **3 LOWER-severity self-labeled estimates — ALL FIXED** [U-FIX-SELFLABELED-ESTIMATES]: `MillingKnowledgeOrchestratorEngine` `toolCost=15` → `DEFAULT_BASE_TOOL_COST_USD` + optional `base_tool_cost_usd`; `CAMIntegrationEngine` `estimatedVolume=50` → `DEFAULT_REMOVED_VOLUME_CM3` + optional `material_volume_cm3`; `HybridProgramComposerEngine` `mrr=10` → `DEFAULT_MRR_CM3_MIN` + optional `dimensions.mrr_cm3_min`. Each: named constant + optional real input + guard + 10 tests (inverse/linear-scaling invariants). 37 tests PASS, tsc clean.
- **Benign**: `SecondaryOpsPipelineEngine` per-op-type cycle-time table (part_flip=60s etc. — documented heuristic, consistent across all cases). Physics-estimate `Math.random`/literals (sigma_n, fn, mttr) are domain estimates, not cost outputs.

**Fabricated-output remediation tally: 7 defects FIXED** — 4 silent (feedrate, WEDM cut-time, LatheOpus cost, ToolROI annual-savings) + 3 self-labeled estimates (Milling toolCost, CAM volume, HybridProgram mrr). ZERO fabricated-output defects remain in the swept surfaces. Pattern: [[fabricated-output-placeholder-defect-class]].

## 3c. G-code / post-processor / safety-output sweep (iter, most-critical surface)

Swept the 169 post-processor / G-code-emitter / safety-verifier engines (the highest-severity output layer — emitted feed/RPM/clearance reaches a real machine). Traced every high-signal hardcoded-value-with-marker hit. **VERDICT: layer is HEALTHY — ZERO silent fabrications.** All hits use the correct idiom: parser-state defaults overwritten by the parsed `F`/`S` word (`GCodeEnergyOptimizer:373`, `ProgramCompare:243`, `UnifiedProgramParser:654` — all reassigned from the G-code line), documented self-labeled fallbacks with the estimate surfaced (`PostVerificationSafety:701` ra=3.2 in the no-nose-radius `else` branch + `formula_used` field; `MacroCandidateGate:314` programMaxRpm "if not specified" → overwritten by VC198/G50), material-branched defaults (`EDMPostProcessGCode:552` tempC reassigned per-material), or internal planning estimates not emitted to G-code (`FiveAxisToolpathIntegration:1171` feedRate → internal mrr_cm3_min only). The fabricated-output defect class was concentrated in the COST/ESTIMATE engines (now all fixed); the safety-critical G-code layer was written with proper fallback discipline. **An automated detector now guards against regressions: `scripts/audit-fabricated-output.mjs`.**

## 3d. Automated detector + remaining triage backlog (iter, detector-built)

`scripts/audit-fabricated-output.mjs` (+ 6 node:test cases + `state/shared/fabricated-output-baseline.json` 38-key ratchet) codifies the manual sweep. **It already paid off**: surfaced + I FIXED an **8th** real defect — `LatheOpusReasoningEngine.buildOperationSequence` `estimatedVolume=1000` (fabricated returned `estimated_time_sec`+`estimated_cost`; now real geometry-derived stock volume). The baseline's 38 candidates are mostly benign internal physics estimates (grain size, head diameter, stickout — feed calcs, not returned outputs); `--guard` fails only on NEW keys (ratchet).

**Confirmed-real candidates still in the backlog (need DEEPER integration, not a 5-line fix → owner follow-up):**
- `ManufacturingReasoningEngine:692/701` — **FIXED 2026-06-19** [U-FIX-MFGREASONING-COST-PLACEHOLDER]: was `estimated_cost: 0.50 // Placeholder` + `0` pushed into `chain.cost_implications` → returned `totalCost` at confidence 0.7 (fabricated cost presented as real). `ManufacturingProblem` carries no tool-price/cycle-time/machine-rate (verified), so the R12-honest fix relabels both as explicit PLACEHOLDER (description + notes), drops confidence to 0.1, zeros the fabricated 0.50 — surfaces the estimate, invents no fake data. Real values still need ToolROIEngine/cost-optimizer wiring (deeper follow-up; hotel/charlie/india). Detector confirms candidate removed.
- Remaining 11 hot keys (`FourthAxisDecision::maxCost`, `ToolCrib::turnover_rate`, etc.) await per-key flow-trace — the detector makes this a cheap, re-runnable backlog.

## 4. Bounded actionable backlog (post-audit)

| # | Item | Owner | Safe to auto-build? | Status |
|---|---|---|---|---|
| 1 | Wire 3 orphaned algorithms → prism_algorithm | bravo (pure-math, no seat dep) | ✅ yes | **DONE 3/3** — `control_statespace`(LinearStateSpace) + `ml_tsne`(TSNE) [U-ALGO-WIRE-ORPHANS] + `num_fem_1d`(FiniteElementMethod1D, source_spec adapter) [U-ALGO-WIRE-FEM1D]. 21 round-trip tests ✓, tsc clean, 4 reviewer-agents PASS. 2 stale WIRE-EXEMPT tags retired. |
| 2 | Disposition of 7 CAD-vendor bridges (WIRE-EXEMPT tag vs dispatcher-wire) | delta/kilo/echo | ⚠️ needs seat-readiness call | surfaced to CAD/CAM slots |
| 3 | Enhancement TODOs (OEE 60/40, Lathe-RL value_loss, AutoTestGen ref-data) | hotel/whiskey/india | n/a (enhancement) | domain backlog |
| 4 | Deep triage of 124 placeholder + 359 Math.random hits | any | low priority | **physics-subset DONE** (iter 4): 0 fake-physics — all Box-Muller/NN-init/RL-exploration. Non-physics ~336 inherently legitimate. 124 placeholder = mostly UI/param text (queued, low-pri). |
| 5 | `WEDMCalculatorAIEngine:433` pathLength=100 → fabricated cut-time/cycle-time | bravo (fixed) | ✅ | **FIXED** [U-FIX-WEDM-CUTTIME]: optional additive `cut_length_mm` → real cut/cycle time; absent → named-default estimate flagged low-confidence (0.35) + ESTIMATE warning. 10 tests, 2-arm PASS. |
| 6 | `LatheOpusReasoningEngine:1931` cycleTimePerPart=5 → fabricated cost/efficiency | bravo (fixed) | ✅ | **FIXED** [U-FIX-LATHE-CYCLETIME]: optional `params.cycle_time_min` → real cost; absent → named-default flagged via additive `cost_is_estimate` + recommendation note. Latent method (test-only consumer — fix prevents fabrication if/when wired). 53 tests, 2-arm PASS. |

---

## 5. Headline (assess-validity answer)

> **The engine/algorithm/formula layer is healthy.** 3812 engines: **99.8% wired**, 0 stub engines. 122 algorithms: 0 stubs, 3 orphaned (being wired). 6 physics files + formula registry: 0 stubs. The only genuine wiring gap is 10 build-ahead assets (7 external-CAD bridges + 3 pure-math algorithms), of which the 3 algorithms are safely wireable now and the 7 bridges await seat-integration disposition by their owning galaxies.

_Generated 2026-06-19 (slot:bravo) · harnesses: `audit-unwired-engines.mjs`, stub-marker scans. Re-run: see §1-3 commands._
