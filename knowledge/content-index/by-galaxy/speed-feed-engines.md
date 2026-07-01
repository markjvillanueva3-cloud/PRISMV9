---
name: speed-feed-engines
description: Strategic, categorized engine digest for the speed-feed (SFC) galaxy -- Kienzle/Taylor/Merchant/Altintas physics core, vendor parity, and the AI-ladder calibration loop.
type: reference
galaxy: speed-feed
node_type: memory
---

# speed-feed galaxy -- engine digest

## Overview

The speed-feed (SFC -- Speed & Feed Calculator) galaxy is one of two saleable PRISM subscription products (owner slot: oscar). It computes physics-optimized cutting parameters (Vc/SFM, fz/chip-load, RPM, feed, MRR) for any material x tool x machine cell across milling, turning, drilling, tapping, reaming, and boring. The physics stack is Kienzle specific-cutting-force (`Fc = kc1.1 * ap * fz^(1-mc)`), Taylor tool life (`VT^n = C`), Merchant/Oxley shear mechanics, Gilbert economic speed, and Altintas stability-lobe (SLD) chatter analysis -- with every numeric constant imported from `mcp-server/src/physics/constants.ts` (NEVER inlined; canonical kc1.1 per ISO group P/M/K/N/S/H lives there only). Engines live FLAT at `mcp-server/src/engines/` -- there is NO per-engine `speed-feed/` subdir (that dir holds galaxy doctrine `.md` only; confirmed `PATHS.md:5` + `CLAUDE.md:sec 2`). The galaxy layers a 9-axis composition orchestrator, an AI/ML calibration ladder (L1/L2/L3), live vendor-parity readers/exporters (G-Wizard + HSMAdvisor), and a shop-floor-actuals fold-back loop on top of a canonical single-cell physics engine.

## Strategic categories

Grounded in `PATHS.md`, `CLAUDE.md sec 2`, and the 16 engine headers read this session.

### Core physics + force/thermal models
- `UltimateSpeedFeedEngine.ts` -- canonical single-cell physics (31 models, 401-assert gauntlet)
- `KienzleForceModelEngine.ts` -- Kienzle (1952) specific-cutting-force
- `GilbertEconomicSpeedEngine.ts` -- economic (min-cost / max-prod) speed
- `JohnsonCookConstitutiveEngine.ts` -- flow-stress constitutive model
- `ToolDeflectionPredictionEngine.ts` -- tool deflection (Timoshenko)
- `ToolWearRateEngine.ts` -- Taylor-based wear-rate
- `StochasticToolWearEngine.ts` -- Weibull/Monte-Carlo wear distribution

### Orchestration + composition
- `SpeedFeedOrchestratorEngine.ts` -- central hub, 67 integration points (2,851 LOC)
- `SpeedFeedNineAxisOrchestratorEngine.ts` -- 9-axis composition + 3 modes + clamp (PRIMARY)
- `AutoSpeedFeedEngine.ts` -- line-by-line G-code S/F optimization
- `AutoSpeedFeedCalculatorEngine.ts` -- auto-SF prediction
- `SFCOptimizeEngine.ts` -- end-to-end optimization run
- `SFCCalculateEngine.ts` -- core S/F calc entrypoint
- `PPGSFCClosedLoopOrchestratorEngine.ts` -- print-to-program <-> SFC closed loop

### Chatter / stability (SLD)
- `ChatterStabilityLobeEngine.ts` -- Altintas & Budak (1995) analytical SLD
- `SpeedFeedChatterStabilityAdapterEngine.ts` -- SLD + RCSA-FRF adapter into SFC

### AI / ML calibration ladder + self-learning loop
- `SpeedFeedDeepLearningEngine.ts` -- SF-AI-L1 (NN + Monte Carlo + Bayesian + CoT)
- `SpeedFeedAdvancedAIEngine.ts` -- SF-AI-L2
- `SpeedFeedUltimateAIEngine.ts` -- SF-AI-L3 (deep ensemble, episodic memory, KG, ToT)
- `SFCMultiHypothesisRankerEngine.ts` -- Bayesian arbiter across physics/RAG/adapter candidates
- `SFCParameterRefinementEngine.ts` -- median+IQR correction from actuals (clamp [0.25,4.0])
- `SpeedFeedPSNDecisionPriorEngine.ts` -- Bayesian prior from PSN
- `SpeedFeedOutcomeFeedbackBridgeEngine.ts` -- outcome->calibration ring-buffer (real bus 2026-06-22)
- `SFCFewShotNewMaterialEngine.ts` -- few-shot transfer for unseen materials
- `SFCDriftCanaryEngine.ts` -- drift detection on the S/F model
- `SFCRAGWarmStartEngine.ts` -- historical-program RAG priors
- `SFCInferenceGateWireEngine.ts` -- inference-gate wire (unmerged wiring, see notes)
- `SFCConvergencePreviewEngine.ts` -- convergence preview
- `SFCOutcomeCaptureWireEngine.ts` -- outcome-capture wire (consumed by sfcOutcomeWire)
- `SFCProvenanceWireEngine.ts` -- provenance/citation wire

### Vendor parity -- G-Wizard + HSMAdvisor (live readers + exporters)
- `GWizardAdapterEngine.ts` -- read-only G-Wizard toolcrib.csv reader (60-col CSV)
- `GWizardComparatorBridgeEngine.ts` -- G-Wizard crib -> PRISM comparison
- `GWizardToolCribExportEngine.ts` -- ShopTool[] -> toolcrib.csv export
- `HSMAdvisorAdapterEngine.ts` -- read-only HSMAdvisor settings_v2.xml reader (UTF-16 LE)
- `HSMAdvisorComparatorBridgeEngine.ts` -- HSMAdvisor <Cut> -> PRISM comparison
- `HSMAdvisorSettingsExportEngine.ts` -- machine/tool fleet -> HSMAdvisor settings export
- `SpeedFeedTriComparatorEngine.ts` -- PRISM x baseline x G-Wizard/HSMAdvisor matrix
- `SpeedFeedBaselineComparatorEngine.ts` -- diff vs 5 curated literature baseline DBs

### Tool catalog + material/data integration
- `ToolCatalogEngine.ts` -- unified cutting-tool catalog with physical dimensions
- `ToolCatalogAdaptiveEngine.ts` -- adaptive catalog resolution
- `SpeedFeedResourceIntegrationEngine.ts` -- CNCCookbook/Sandvik/Kennametal PDF knowledge
- `MachineAwareSpeedFeedEngine.ts` -- machine-envelope adjustments
- `HeatTreatmentAwareSpeedFeedEngine.ts` -- heat-treat-regime adjustments
- `ProvenSpeedFeedAggregatorEngine.ts` -- proven S/F DB aggregation
- `SpeedFeedMinerEngine.ts` -- mine JM Die programs for S/F data
- `SpeedFeedPDFCorpusBridgeEngine.ts` -- S/F extraction from PDF corpus
- `SpeedFeedShopLibraryBridgeEngine.ts` -- rank from on-hand shop tool library

### Cross-vendor / at-scale comparison + sweep
- `SpeedFeedExhaustiveCombinationEngine.ts` -- physics-invariant bounded cartesian sweep + ledger
- `SpeedFeedAtScaleHarnessEngine.ts` -- at-scale test/comparison harness
- `SpeedFeedGpuJudgeEngine.ts` -- GPU-accelerated judging
- `SpeedFeedCalibrationPersistEngine.ts` -- persist calibration actuals
- `WedmTrainingPairBridgeEngine.ts` -- WEDM 98-pair training-corpus indexer
- `WedmProgramIndexEngine.ts` -- WEDM program indexer

### Fan-out propagation + safety-gate + cross-galaxy bridges
- `SpeedFeedPropagationBridgeEngine.ts` -- fan-out to post + mill/lathe/wedm + print-to-program
- `SpeedFeedDownstreamSubscriberEngine.ts` -- sfcOutcomeWire -> 5 downstream caches
- `SpeedFeedToQuoteBridgeEngine.ts` -- MRR -> cycle_min bridge into quoting
- `CrossProcessSpeedFeedBridge.ts` -- cross-process S/F bridge
- `CAMSpeedFeedBridgeEngine.ts` -- 6 CAM-system S/F vocab normalize <-> orchestrator
- `SpindlePowerCheckEngine.ts` -- spindle-power CLAMP gate (safety)
- `SpindleTorqueGateEngine.ts` -- spindle-torque gate (safety)

### Lathe S/F facade family (IPR feed units)
- `LatheSpeedFeedCalculatorFacadeEngine.ts` -- lathe facade
- `LatheSpeedFeedDeepLearningAdvisorEngine.ts` -- lathe DL advisor
- `LatheSpeedFeedReasoningBridgeEngine.ts` -- lathe reasoning bridge
- `LatheSpeedFeedShopAwareTuningEngine.ts` -- lathe shop-aware tuning

## Key engines (detailed)

### UltimateSpeedFeedEngine.ts
The canonical single-cell physics core -- accepts ANY subset of inputs and infers all missing parameters via Kienzle force, Taylor tool life, Loewen-Shaw thermal (applied inline), chip-thinning compensation, power/torque budget, thermal-damage risk, and MRR maximization within constraint envelopes. Composes `KienzleForceModel`, `ExtendedTaylorModel`, `GilbertMRRModel`, `JaegerTempField`, `StabilityLobeDiagram`, and the `CoolantVcModifier` algorithm; imports all constants from `constants.ts` and emits confidence-scored outputs with conservative/balanced/aggressive alternatives.
- file: `mcp-server/src/engines/UltimateSpeedFeedEngine.ts`
- Notable: exports `UltimateSpeedFeedEngine`, `ultimateSpeedFeedEngine`, types `UltimateSpeedFeedInput` / `UltimateSpeedFeedResult` / `ISOGroup` / `Operation` / `CutType` / `ToolMaterial` / `CoolantType`; imports `captureSFC` (sfcOutcomeWire), `KienzleForceModel`, `ExtendedTaylorModel`, `GilbertMRRModel`, `JaegerTempField`.

### SpeedFeedOrchestratorEngine.ts
The central hub wiring 67 integration points (machine, tool, material, holder, coolant, workholding, CAM strategy, geometry) into one unified S/F pipeline. Applies inline Kienzle-force / Taylor-life physics against canonical constants plus inline thermal + stability approximations (module composition tracked by milestone SF-PSN-WIRE-MS0). Under flag `PRISM_SFC_CONVERGE=1` it flag-gate-delegates core physics to `UltimateSpeedFeedEngine` via an input adapter; the flag-off path is provably unchanged.
- file: `mcp-server/src/engines/SpeedFeedOrchestratorEngine.ts` (2,851 LOC)
- Notable: imports `CANONICAL_TAYLOR` / `CANONICAL_KIENZLE` / `CANONICAL_MATERIAL_DB` / `CANONICAL_TOOL_MODULUS`, `monteCarloEngine`, `stochasticToolLifeEngine`, `machiningPlaybookEngine`, `catalogCorpusLoaderEngine`, `orchestratorToUltimateInput` adapter.

### SpeedFeedNineAxisOrchestratorEngine.ts
The PRIMARY operator-facing orchestrator -- a THIN composition layer over `UltimateSpeedFeedEngine` (does NOT reinvent physics). Accepts an explicit 9-axis input model (machine, spindle, controller, material, workholding, tool-holder, tooling, coolant, toolpath), derives per-axis multipliers/constraints, pipes through the canonical calculate(), and post-processes into 3 optimization modes (cost_batch = Gilbert V_min_cost, aggressive_rush = V_max_prod, prism_optimized = Pareto knee) plus MRR ranking + ROI advice. Every run() auto-emits to the propagation bridge and outcome-feedback bridge.
- file: `mcp-server/src/engines/SpeedFeedNineAxisOrchestratorEngine.ts`
- Notable: exports the 9-axis engine + types `NineAxisInput` / `NineAxisResult` / `OptimizationMode` / `MachineKinematics`; imports `CANONICAL_KIENZLE` + `predictedRa` (constants), `speedFeedPropagationBridgeEngine`, `speedFeedOutcomeFeedbackBridgeEngine`.

### ToolCatalogEngine.ts
Unified cutting-tool catalog consolidating ~30 vendor data sources (SGS, Tungaloy, Sandvik, WIDIA, Mitsubishi, Seco, Ingersoll, Guhring, Helical, Horn, Niagara, Dormer, and lazy-loaded JSON catalogs for OSG/Emuge/Sumitomo/Kennametal) into one queryable catalog with physical dimensions for collision avoidance, operation recommendation, and S/F lookup. Uses Layer-2 bundle-splitting -- large catalogs load from `dist/data/*.json` on first access rather than baking into the bundle.
- file: `mcp-server/src/engines/ToolCatalogEngine.ts`
- Notable: dispatcher-wired via `calcDispatcher` (tool_catalog_search / _lookup / _assembly / _collision_envelope / _recommend / _stats); imports `OSG_SPEED_FEED`, `GUHRING_SPEED_FEED`, `ISCAR_SPEED_FEED`, `HELICAL_SPEED_FEED`, `dimensionImputationEngine`, `loadCatalog`/`loadCatalogExport`.

### KienzleForceModelEngine.ts
The foundational Kienzle (1952) specific-cutting-force model: `kc = kc1.1 * h^(-mc)` with corrections for rake angle, tool wear, speed (BUE region), and size effect at thin chips. Computes force components (Fc/Ff/Fp), resultant, torque, power, instantaneous+average milling forces, and empirical HB-to-kc1.1 correlation. Uses a 6-deg reference rake (gamma_0) and cites Kienzle VDI-Z (1952), Altintas Manufacturing Automation Ch.2, and Sandvik Metal Cutting Technology Ch.5.
- file: `mcp-server/src/engines/KienzleForceModelEngine.ts`
- Notable: exports `KienzleForceModelEngine`, interfaces `KienzleCoefficients` / `SpecificCuttingForceInput`; actions kienzle_specific_force / kienzle_force_components / kienzle_milling_forces; imports `RobustRegressionEngine`.

### AutoSpeedFeedEngine.ts
The line-by-line G-code S/F optimizer -- the "missing link": takes raw G-code from any CAM system and calculates physics-optimized S and F for EVERY cutting line. Pipeline: parse G-code -> resolve material+tool per tool-section via `UltimateSpeedFeedEngine` -> apply `PostProcessorFeedOptimizerEngine` adjustments (chip thinning, corner decel, arc/plunge limiting) -> verify against machine power budget -> emit optimized G-code. Uses static (not lazy) imports enabling a true synchronous optimizeSync() path for the sync PrintToProgram pipeline.
- file: `mcp-server/src/engines/AutoSpeedFeedEngine.ts`
- Notable: exports `AutoSpeedFeedEngine` + `ISOGroup` + `ToolDefinition`; imports `ultimateSpeedFeedEngine`, `postProcessorFeedOptimizer`, `machiningPlaybookEngine`. (Regression rail: no `Math.round` inside the calc body -- fixed `1b87f98f2`.)

### ChatterStabilityLobeEngine.ts
Computes stability-lobe diagrams (SLD) for milling -- the maximum stable axial depth of cut a_lim as a function of spindle RPM, via `a_lim = -1 / (2 * Ks * Re[G(w)])` where Ks is specific cutting force and G(w) the structural FRF. Implements the Altintas & Budak (1995) analytical stability model; resolves FRF from `MachineRegistry` by machine_id or accepts manual natural-frequency/damping/stiffness overrides.
- file: `mcp-server/src/engines/ChatterStabilityLobeEngine.ts`
- Notable: exports `ChatterStabilityLobeEngine` + interfaces `ChatterInput` / `StabilityLobe`; imports `FRFStabilityLobe`, `StabilityLobeDiagram`, `EigensolverEngine`, `CANONICAL_KIENZLE` / `CANONICAL_TOOL_MODULUS`, `machineRegistry` (FRFData).

### SpeedFeedResourceIntegrationEngine.ts
Extracts and codifies authoritative S/F knowledge from PDF references (CNCCookbook "Feeds and Speeds Ultimate Guide 2024", face-mill 45/90-deg calculator, machine-specific POSTS configs) into material SFM charts, chip-load recs, face-mill lead-angle strategies, trochoidal/HEM guidelines, and JM-Die special materials (M2, D2, S7, A2, H13, tungsten carbide, graphite). Integrates Kienzle/Taylor/chip-thinning/Ra/HEM formulas with every numeric SFM/chip-load value sourced to cited catalogs (Sandvik, Kennametal, Harvey Tool, Iscar).
- file: `mcp-server/src/engines/SpeedFeedResourceIntegrationEngine.ts`
- Notable: imports `CANONICAL_KIENZLE` / `CANONICAL_TAYLOR` / `CANONICAL_MATERIAL_DB`; exports `OperationType` / `CutType` / `ToolMaterialType` / `CoolantType`.

### SpeedFeedDeepLearningEngine.ts (SF-AI-L1)
First-layer AI hardening for the Calculator Studio: neural networks (speed/feed/tool-life/finish/power prediction), Monte Carlo uncertainty (Weibull tool-life distribution, MRR variability, safety margins), Bayesian optimization (multi-objective MRR-vs-life-vs-finish with a Gaussian-Process surrogate + Expected-Improvement acquisition), chain-of-thought parameter derivation, and self-learning shop-floor calibration. Physics is inline approximation (Kienzle/Taylor/Loewen-Shaw/chip-thinning/SLD) pending SF-PSN-WIRE-MS0 module composition.
- file: `mcp-server/src/engines/SpeedFeedDeepLearningEngine.ts`
- Notable: the galaxy's PSN-leg-#10 AI engine (wired via `sfc_fewshot_predict` per CLAUDE.md); imports `CANONICAL_MATERIAL_DB` / `CANONICAL_KIENZLE` / `CANONICAL_TAYLOR`.

### SpeedFeedUltimateAIEngine.ts (SF-AI-L3)
Top-layer AI hardening: deep ensemble networks (5 diverse architectures -- MLP/ResNet/Transformer/GRU/Attention -- with uncertainty via disagreement + confidence calibration), episodic memory (shop-floor experience storage + similar-job retrieval), a material-tool-operation knowledge graph, tree-of-thoughts multi-branch reasoning, meta-learning (few-shot new-material transfer + domain-shift detection), active learning, and LLM CLI integration.
- file: `mcp-server/src/engines/SpeedFeedUltimateAIEngine.ts`
- Notable: L3 of the SF-AI ladder (L1=DeepLearning, L2=AdvancedAI, L3=Ultimate); training tracked under U-OSC9-17.

### SFCMultiHypothesisRankerEngine.ts
The Bayesian arbiter -- never picks one source, ranks ALL candidates: {Kienzle prior, Taylor prior, formula, learned_residual via gate, RAG_prior, IRL_reward}. Emits ranked sfm/fpt/doc with Brier-validated calibrated confidence (< 0.15 target) + reward decomposed into cycle_time/tool_life/surface_finish/safety, with a safety-shield rejection path. Combines priors from `SFCRAGWarmStartEngine.retrieve()` (historical programs) with an IQL reward likelihood.
- file: `mcp-server/src/engines/SFCMultiHypothesisRankerEngine.ts`
- Notable: DISPATCHER-WIRED `prism_calc:sfc_rank_hypotheses` + `sfc_ranker_stats` (round-trip proven; corrected from a STALE WIRE-EXEMPT marker 2026-06-22); imports `SFCRAGWarmStartEngine`, `CANONICAL_KIENZLE` / `CANONICAL_TAYLOR`, `SFCProvenanceWireEngine`, citation schema.

### SpeedFeedTriComparatorEngine.ts
The headline PRISM-vs-HSMAdvisor-vs-G-Wizard 3-way comparator -- stacks three S/F "opinions" for ONE canonical cut on a single axis basis (vc/fz/rpm/feed/mrr). Honest by design (R12): neither HSMAdvisor nor G-Wizard exposes a drivable API, so it computes PRISM always, reads the always-on curated literature baseline, and BEST-EFFORT folds in HSMAdvisor's live open <Cut> + a matching G-Wizard crib tool -- marking unavailable systems `available:false` with a reason, never fabricated. Consensus = per-axis MEDIAN across available EXTERNAL systems (excludes PRISM, the thing being judged); pure composition, no re-implemented physics.
- file: `mcp-server/src/engines/SpeedFeedTriComparatorEngine.ts`
- Notable: imports `speedFeedBaselineComparatorEngine`, `gWizardComparatorBridgeEngine`, `hsmAdvisorAdapterEngine`; feeds `SpeedFeedSelfTuningEngine`.

### SpeedFeedBaselineComparatorEngine.ts
The always-on grounded external reference -- compares PRISM SFC output to 5 public baseline sources (Sandvik Coromant 2024, Kennametal Master Catalog, CNCCookbook defaults, Titans of CNC cited cuts, HSMAdvisor public table). Static lookup keyed by (material_iso_group, tool_material, diameter_bucket, operation, cut_type), each entry storing median + low/high range. compare() runs the 9-axis orchestrator ONCE, looks up the matching baseline, computes per-axis variance (Vc/fz/MRR), flags >15% deviation from the baseline median, and returns per-source comparison + a 0-1 agreement score.
- file: `mcp-server/src/engines/SpeedFeedBaselineComparatorEngine.ts`
- Notable: exports `speedFeedNineAxisOrchestratorEngine`-consuming comparator + `BaselineSource` type; the single physics run reused by the TriComparator.

### GWizardAdapterEngine.ts
Read-only adapter for G-Wizard Calculator's tool crib -- resolves the hash-suffixed AIR sandbox dir by scanning `%APPDATA%` for `GWizard.*` (most-recently-modified), then parses the 60-column `Local Store/toolcrib.csv` (key/description/sfm/ipt/chipload/diameter/flutes/coating/... columns), coercing literal "NaN" to undefined. Read-only by design -- never writes back. Closes U-OSC9-12.
- file: `mcp-server/src/engines/GWizardAdapterEngine.ts`
- Notable: pure fs reader (`readFileSync`/`statSync`/`readdirSync`); sibling exporters `GWizardComparatorBridgeEngine` + `GWizardToolCribExportEngine`.

### HSMAdvisorAdapterEngine.ts
Read-only adapter for HSMAdvisor's `%APPDATA%/HSMAdvisor/settings_v2.xml` (UTF-16 LE, BOM-prefixed) -- a hand-rolled regex extractor (no XML lib in deps) pulls the <Settings>/<Tool>/<Cut> blocks. The <Cut> block carries HSMAdvisor's COMPUTED sfm/ipt/mrr/rpm/feed/deflection for the operator's currently-selected tool+material -- the comparison currency the NineAxisOrchestrator diffs against. Read-only; never writes back. Closes U-OSC9-09.
- file: `mcp-server/src/engines/HSMAdvisorAdapterEngine.ts`
- Notable: exports `hsmAdvisorAdapterEngine` + `HSMAdvisorState`; siblings `HSMAdvisorComparatorBridgeEngine` + `HSMAdvisorSettingsExportEngine`.

### SpeedFeedPropagationBridgeEngine.ts
The canonical fan-out bridge -- when the 9-axis orchestrator computes a new recommendation, every downstream consumer sees it consistently WITHOUT re-running the calc. Versioned snapshot store keyed by (machine.name, material.name, tool_diameter_mm); 5 domain bridges translate a NineAxisResult into each consumer's shape (post-processor override block, mill-wizard defaults, lathe-wizard Vc/fn/insert, wire-EDM parameter-pack, print-to-program full snapshot); publishes to the `sfcOutcomeWire` bus. Intentionally has NO physics -- pure translation/propagation.
- file: `mcp-server/src/engines/SpeedFeedPropagationBridgeEngine.ts`
- Notable: exports `speedFeedPropagationBridgeEngine` + `PropagationDomain`; consumes `NineAxisInput`/`NineAxisResult`/`OptimizationMode`.

## Full engine index

One-liners are grounded in the file header (for engines read this session) or `PATHS.md` / `CLAUDE.md sec 2` (for the rest). Engines NOT header-read this session carry a doctrine-sourced or "(no header read)" note.

| Engine | Category | One-line |
|--------|----------|----------|
| UltimateSpeedFeedEngine.ts | Core physics | Canonical single-cell S/F physics; 31 models, 401-assert gauntlet; infers all missing params. |
| KienzleForceModelEngine.ts | Core physics | Kienzle (1952) specific-cutting-force kc = kc1.1*h^-mc with rake/wear/speed/size corrections. |
| GilbertEconomicSpeedEngine.ts | Core physics | Gilbert economic speed (V_min_cost / V_max_prod). (doctrine-confirmed; no header read) |
| JohnsonCookConstitutiveEngine.ts | Core physics | Johnson-Cook flow-stress constitutive model. (doctrine-confirmed; no header read) |
| ToolDeflectionPredictionEngine.ts | Core physics | Tool deflection prediction (Timoshenko). (doctrine-confirmed; no header read) |
| ToolWearRateEngine.ts | Core physics | Taylor-based tool-wear-rate model. (doctrine-confirmed; no header read) |
| StochasticToolWearEngine.ts | Core physics | Weibull/Monte-Carlo stochastic tool-wear distribution. (doctrine-confirmed; no header read) |
| SpeedFeedOrchestratorEngine.ts | Orchestration | Central hub wiring 67 integration points into one S/F pipeline; 2,851 LOC. |
| SpeedFeedNineAxisOrchestratorEngine.ts | Orchestration | PRIMARY 9-axis composition over Ultimate; 3 modes + clamp + MRR/ROI. |
| AutoSpeedFeedEngine.ts | Orchestration | Line-by-line G-code S/F optimizer; parse -> resolve -> optimize -> emit. |
| AutoSpeedFeedCalculatorEngine.ts | Orchestration | Auto-SF prediction (dispatcher auto_speed_feed_calc). (no header read) |
| SFCOptimizeEngine.ts | Orchestration | End-to-end SFC optimization run (sfc_optimize_run). (no header read) |
| SFCCalculateEngine.ts | Orchestration | Core S/F calc entrypoint (sfc_calculate). (no header read) |
| PPGSFCClosedLoopOrchestratorEngine.ts | Orchestration | Print-to-program <-> SFC closed-loop orchestrator. (no header read) |
| ChatterStabilityLobeEngine.ts | Chatter/SLD | Altintas & Budak (1995) analytical SLD; a_lim vs RPM from oriented FRF. |
| SpeedFeedChatterStabilityAdapterEngine.ts | Chatter/SLD | Altintas SLD + RCSA-FRF adapter into SFC (U-OSC9-06). (doctrine-sourced; no header read) |
| SpeedFeedDeepLearningEngine.ts | AI/ML ladder | SF-AI-L1: NN + Monte Carlo + Bayesian opt + CoT + self-learning calibration. |
| SpeedFeedAdvancedAIEngine.ts | AI/ML ladder | SF-AI-L2 mid-layer AI hardening. (doctrine-sourced; no header read) |
| SpeedFeedUltimateAIEngine.ts | AI/ML ladder | SF-AI-L3: deep ensemble + episodic memory + KG + tree-of-thoughts + meta-learning. |
| SFCMultiHypothesisRankerEngine.ts | AI/ML ladder | Bayesian arbiter ranking all candidate sources; Brier-calibrated, safety-shielded. |
| SFCParameterRefinementEngine.ts | AI/ML ladder | Median+IQR multiplicative correction from actuals; clamp [0.25,4.0], fail-loud. (doctrine-sourced; no header read) |
| SpeedFeedPSNDecisionPriorEngine.ts | AI/ML ladder | Bayesian decision prior sourced from the PSN. (doctrine-sourced; no header read) |
| SpeedFeedOutcomeFeedbackBridgeEngine.ts | AI/ML ladder | Outcome -> DL calibration ring-buffer; real bus wired 2026-06-22. (doctrine-sourced; no header read) |
| SFCFewShotNewMaterialEngine.ts | AI/ML ladder | Few-shot parameter transfer for unseen materials. (no header read) |
| SFCDriftCanaryEngine.ts | AI/ML ladder | Drift-detection canary on the S/F model. (no header read) |
| SFCRAGWarmStartEngine.ts | AI/ML ladder | Historical-program RAG priors (retrieve() for the ranker). (no header read) |
| SFCInferenceGateWireEngine.ts | AI/ML ladder | Inference-gate wire (prism_calc:ultimate_speed_feed wiring on slot/india, unmerged here). (doctrine-sourced) |
| SFCConvergencePreviewEngine.ts | AI/ML ladder | Convergence preview for the SFC calc. (no header read) |
| SFCOutcomeCaptureWireEngine.ts | AI/ML ladder | Outcome-capture wire; consumed by middleware/sfcOutcomeWire.ts (LEGIT wire-exempt). (doctrine-sourced) |
| SFCProvenanceWireEngine.ts | AI/ML ladder | Provenance/citation wire for ranked candidates. (doctrine-sourced) |
| GWizardAdapterEngine.ts | Vendor parity | Read-only G-Wizard toolcrib.csv reader (60-col; AppData hash-dir resolve). |
| GWizardComparatorBridgeEngine.ts | Vendor parity | G-Wizard crib tool -> PRISM canonical comparison prepare. (doctrine-sourced; no header read) |
| GWizardToolCribExportEngine.ts | Vendor parity | ShopTool[] -> G-Wizard toolcrib.csv exporter. (doctrine-sourced; no header read) |
| HSMAdvisorAdapterEngine.ts | Vendor parity | Read-only HSMAdvisor settings_v2.xml reader (UTF-16 LE, regex extract). |
| HSMAdvisorComparatorBridgeEngine.ts | Vendor parity | HSMAdvisor live <Cut> -> PRISM comparison. (doctrine-sourced; no header read) |
| HSMAdvisorSettingsExportEngine.ts | Vendor parity | Machine/tool fleet -> HSMAdvisor settings export. (doctrine-sourced; no header read) |
| SpeedFeedTriComparatorEngine.ts | Vendor parity | PRISM x baseline x HSMAdvisor x G-Wizard 3-way comparator; honest available-flags. |
| SpeedFeedBaselineComparatorEngine.ts | Vendor parity | Diff vs 5 curated literature baseline DBs; flags >15% median deviation. |
| ToolCatalogEngine.ts | Catalog/data | Unified ~30-vendor tool catalog w/ physical dims for collision + S/F lookup. |
| ToolCatalogAdaptiveEngine.ts | Catalog/data | Adaptive tool-catalog resolution layer. (no header read) |
| SpeedFeedResourceIntegrationEngine.ts | Catalog/data | Codifies CNCCookbook/Sandvik/Kennametal PDF S/F knowledge + JM special materials. |
| MachineAwareSpeedFeedEngine.ts | Catalog/data | Machine-envelope-aware S/F adjustments. (doctrine-sourced; no header read) |
| HeatTreatmentAwareSpeedFeedEngine.ts | Catalog/data | Heat-treat-regime-aware S/F adjustments. (doctrine-sourced; no header read) |
| ProvenSpeedFeedAggregatorEngine.ts | Catalog/data | Proven S/F DB aggregation (mill/lathe). (doctrine-sourced; no header read) |
| SpeedFeedMinerEngine.ts | Catalog/data | Mine JM Die programs for real S/F data (speed_feed_mine). (no header read) |
| SpeedFeedPDFCorpusBridgeEngine.ts | Catalog/data | S/F extraction from the PDF corpus (sfc_pdf_corpus_bridge). (no header read) |
| SpeedFeedShopLibraryBridgeEngine.ts | Catalog/data | Rank S/F from on-hand shop tool library (sfc_shop_library_rank). (no header read) |
| SpeedFeedExhaustiveCombinationEngine.ts | At-scale/sweep | Physics-invariant bounded cartesian sweep + ledger (I1-I6). (doctrine-sourced; no header read) |
| SpeedFeedAtScaleHarnessEngine.ts | At-scale/sweep | At-scale S/F test/comparison harness. (no header read) |
| SpeedFeedGpuJudgeEngine.ts | At-scale/sweep | GPU-accelerated S/F judging (speed_feed_gpu_judge). (no header read) |
| SpeedFeedCalibrationPersistEngine.ts | At-scale/sweep | Persist calibration actuals (speed_feed_calibration_persist). (no header read) |
| WedmTrainingPairBridgeEngine.ts | At-scale/sweep | Indexes mike's 98-pair WEDM training corpus (U-OSC9-13). (doctrine-sourced; no header read) |
| WedmProgramIndexEngine.ts | At-scale/sweep | WEDM program indexer. (no header read) |
| SpeedFeedPropagationBridgeEngine.ts | Propagation/bridge | Fan-out NineAxisResult to post + mill/lathe/wedm + print-to-program; no physics. |
| SpeedFeedDownstreamSubscriberEngine.ts | Propagation/bridge | sfcOutcomeWire -> 5 downstream caches. (doctrine-sourced; no header read) |
| SpeedFeedToQuoteBridgeEngine.ts | Propagation/bridge | MRR -> cycle_min bridge into charlie's quoting. (doctrine-sourced; no header read) |
| CrossProcessSpeedFeedBridge.ts | Propagation/bridge | Cross-process S/F bridge. (no header read) |
| CAMSpeedFeedBridgeEngine.ts | Propagation/bridge | Normalize 6 CAM-system S/F vocab <-> orchestrator (cam_speed_feed_bridge). (doctrine-sourced; no header read) |
| SpindlePowerCheckEngine.ts | Safety gate | Spindle-power CLAMP gate before surfacing aggressive RPM. (doctrine-sourced; no header read) |
| SpindleTorqueGateEngine.ts | Safety gate | Spindle-torque gate (check_spindle_torque). (doctrine-sourced; no header read) |
| LatheSpeedFeedCalculatorFacadeEngine.ts | Lathe facade | Lathe S/F facade; IPR feed units, CSS/G50 cap. (doctrine-sourced; no header read) |
| LatheSpeedFeedDeepLearningAdvisorEngine.ts | Lathe facade | Lathe S/F deep-learning advisor. (doctrine-sourced; no header read) |
| LatheSpeedFeedReasoningBridgeEngine.ts | Lathe facade | Lathe S/F reasoning bridge. (doctrine-sourced; no header read) |
| LatheSpeedFeedShopAwareTuningEngine.ts | Lathe facade | Lathe S/F shop-aware tuning. (doctrine-sourced; no header read) |
| SpeedFeedAutopilotEngine.ts | Orchestration | Autopilot S/F run (speed_feed_autopilot). (no header read) |

> Scope note (R12): "speed-feed galaxy" is a doctrine grouping, not a filesystem dir -- engines are FLAT at `mcp-server/src/engines/`, selected here by the SFC name-families the galaxy owns per `PATHS.md` + `CLAUDE.md sec 2`. Adjacent flat-dir engines whose names partially matched (generic HeatTreatmentEngine / JohnsonCookEngine / most Spindle*/ToolWear* variants) are owned by other galaxies (thermal/materials/mill) and are excluded here except where the SFC doctrine explicitly claims them. A hard count via `Glob` on the subdir returned 0 files; the authoritative flat-dir list above is 67 engines matched by SFC name-family and doctrine ownership.
