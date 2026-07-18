# Ultimate Post Processor Generator Roadmap (POST-ULT)

**Goal**: Build a post processor generator that doesn't just format G-code for a controller — it runs every program through PRISM's full 7-phase physics pipeline to produce the **best possible program for any given situation**, with truly accurate, variable, and adaptive speeds and feeds throughout every cut, for any machine+controller+purchased-options combination.

**What makes this different from Fusion/hyperMILL/Mastercam posts**: Traditional posts are format translators — they take CAM toolpath moves and output controller-dialect G-code with static speeds and feeds set by the CAM programmer. PRISM's Ultimate Post runs the program through **131+ physics engines** including Kienzle cutting forces, Taylor tool life, Altintas stability lobes, Loewen-Shaw thermal models, Euler-Bernoulli deflection, chip thinning compensation, and stochastic verification — producing line-by-line optimized feeds that adapt to engagement changes, corner geometry, material conditions, and machine dynamics throughout the entire cut.

**Baseline**: 180 Fusion CPS posts (35 manufacturers), 910+ machine profiles, 95,608 tools, 2,957 materials, 296 playbook rules, 3,700+ tribal tips.

**Core design principle**: **NEVER butcher the user's intent.** The programmer chose their toolpaths, operation order, and strategy for reasons. PRISM enhances within those choices by default — and only reorganizes with explicit approval and full explanations of why.

---

## Architecture: Tiered Optimization with User Consent

### The Optimization Tier System

Every PRISM post run operates at a user-selected tier. The user sees exactly what each tier does and chooses how much control they hand over. This is especially critical for Fusion plugin users who are programming interactively.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  TIER 1: FORMAT ONLY (Safe Default)                                        │
│  ✓ Controller dialect translation (G/M codes, formatting, decimals)        │
│  ✓ Purchase-option-aware codes (only emit what's installed)                │
│  ✓ Safe start/end blocks, tool change sequences                           │
│  ✗ Does NOT change any speeds, feeds, or toolpath order                   │
│  → "Just post my program correctly for this machine"                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  TIER 2: PHYSICS-ENHANCED S/F (Recommended Default)                        │
│  ✓ Everything in Tier 1                                                    │
│  ✓ Physics-optimized speeds and feeds (Kienzle, stability lobes, thermal) │
│  ✓ Line-by-line adaptive feed (chip thinning, corner decel, engagement)   │
│  ✓ Chatter-free RPM selection from stability lobe analysis                │
│  ✓ Power/torque budget enforcement                                        │
│  ✗ Does NOT change toolpath geometry, operation order, or tool selection   │
│  ✗ Does NOT change retract heights, linking moves, or rapid paths         │
│  → "Optimize my feeds but don't touch my toolpaths"                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  TIER 3: MOTION-OPTIMIZED (User Approval Required)                         │
│  ✓ Everything in Tier 2                                                    │
│  ✓ Rapid repositioning optimization (per-axis kinematics, diagonal moves) │
│  ✓ Retract height optimization (minimize air travel)                      │
│  ✓ Air-cut elimination (skip non-cutting passes)                          │
│  ✓ HSM smoothing / look-ahead code injection                             │
│  ✓ Subprogram detection (repeated patterns → M98 calls)                   │
│  ⚠ SHOWS DIFF: "Changed 23 rapid moves, saving est. 47 sec (14%)"       │
│  ⚠ User reviews and approves/rejects each category of change             │
│  → "Optimize my motion too, but show me what you're changing"             │
├─────────────────────────────────────────────────────────────────────────────┤
│  TIER 4: FULL RESTRUCTURE (Explicit Opt-In Only)                           │
│  ✓ Everything in Tier 3                                                    │
│  ✓ Operation reordering for minimum tool changes & repositioning          │
│  ✓ Tool selection recommendations (with explanations)                     │
│  ✓ Strategy alternatives ("pocket: adaptive clearing saves 3:12 vs your   │
│    conventional, here's why...")                                           │
│  ✓ Hole pattern optimization (TSP/ACO sequencing)                         │
│  ⚠ FULL EXPLANATION: Every change comes with physics justification        │
│  ⚠ Side-by-side comparison: your version vs. PRISM recommendation         │
│  ⚠ User accepts/rejects EACH suggestion individually                     │
│  → "Show me everything you'd do differently and let me choose"            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Rules
1. **Tier 1 is always safe** — pure formatting, zero behavioral changes
2. **Tier 2 changes S/F only** — the toolpath geometry the user programmed is sacred
3. **Tier 3 changes motion but not strategy** — rapids/retracts are fair game, cutting moves are not
4. **Tier 4 is advisory** — PRISM suggests, user decides. Every suggestion includes WHY and the predicted impact
5. **Never silently reorganize** — if the user's Fusion plugin sends operation order A→B→C, that's what gets posted unless they explicitly approve changes
6. **Explanations are mandatory at Tier 3+** — not just "changed X", but "changed X because Y, saving Z seconds, with these tradeoffs"

---

## Architecture: The 7-Phase Pipeline as Post Backbone

Every program generated by the Ultimate Post passes through this pipeline. Phases activate based on the selected optimization tier.

```
RAW CAM OUTPUT (any CAM system — Fusion, hyperMILL, Mastercam, NX, SolidCAM, etc.)
    ↓
[P0] INPUT NORMALIZATION ─── Machine/tool/material catalog resolution (910 machines, 95K tools, 2.9K materials)
    ↓                        ← ALL TIERS
[P1] PHYSICS FOUNDATION ─── Per-operation: UltimateSpeedFeed, Kienzle force, stability lobes, deflection, thermal
    ↓                        ← TIER 2+
[P2] LINE-BY-LINE S/F ──── Per G-code block: chip thinning, adaptive feed, corner decel, arc limiting, wear tracking
    ↓                        ← TIER 2+
[P3] MOTION OPTIMIZATION ── Rapid repositioning, retract optimization, air-cut elimination, HSM code injection
    ↓                        ← TIER 3+ (with user approval)
[P3.5] RESTRUCTURE ──────── Operation reorder, tool selection, strategy alternatives
    ↓                        ← TIER 4 ONLY (explicit opt-in, per-suggestion approval)
[P4] STOCHASTIC VERIFY ──── Monte Carlo tolerance, uncertainty CI, Cpk prediction, batch robustness
    ↓                        ← TIER 2+
[P5] SAFETY & KNOWLEDGE ─── 296 playbook rules, 3,700+ tribal tips, collision detection, machine envelope checks
    ↓                        ← ALL TIERS
[P6] OUTPUT GENERATION ──── Controller dialect, purchase-option-aware G-code, setup sheets, analytics report
    ↓                        ← ALL TIERS
FINAL G-CODE + OPTIMIZATION REPORT (what was changed, why, and predicted impact)
```

---

## Wave 1: CPS Ingestion & Property Taxonomy (Foundation)

### POST-ULT-MS1: CPS Parser Engine
**Units: 5 | Priority: P0**

Parse all 180 Fusion `.cps` baseline posts to extract structured metadata — the knowledge base for what each controller expects.

| Unit | Name | Description |
|------|------|-------------|
| U01 | CpsParserEngine | Parse `.cps` JavaScript to extract: description, vendor, capabilities, extension, tolerances, circular limits, helical support, high feed rates |
| U02 | CpsPropertyExtractor | Extract all `properties = {}` blocks — title, description, group, type, values (enum options), defaults, scope. Groups: configuration, multiAxis, preferences, formats, homePositions, probing |
| U03 | CpsFormatExtractor | Extract `createFormat()`, `createVariable()`, `createReferenceVariable()` definitions — decimal places, prefixes, suffixes per controller |
| U04 | CpsCodeExtractor | Extract G-code and M-code tables, WCS definitions (`wcsDefinitions`), canned cycle support, coolant codes |
| U05 | CpsCapabilityMapper | Map capability flags and derive fingerprint: milling, turning, mill-turn, inspection, machine simulation |

**Input**: 180 CPS files from `C:/PRISM/BOX/FUSION BASIC POSTS/`
**Output**: Structured JSON catalog of every post's metadata, properties, formats, and codes

---

### POST-ULT-MS2: Universal Property Taxonomy
**Units: 4 | Priority: P0**

Unified taxonomy of every configurable option — the bridge between CPS properties and machine purchase options.

| Unit | Name | Description |
|------|------|-------------|
| U01 | PropertyCatalogBuilder | Scan all 180 parsed CPS files, build master catalog of ~200+ unique property names, types, and valid values |
| U02 | PropertyGroupNormalizer | Normalize equivalent features across controllers: Haas `G187` = Siemens `CYCLE832` = Mazak `G05.1` = Fanuc `G5.1` = Heidenhain `CYCLE32` (all = HSM smoothing) |
| U03 | PurchaseOptionClassifier | Classify each property: (a) always-available, (b) machine-specific config, (c) **purchase-dependent** (TSC, probing, SSV, DWO, Y-axis, live tooling, etc.) |
| U04 | ControllerDialectMapper | Map dialect families: Fanuc-based (Haas, Doosan, Brother, Robodrill, Makino, Fadal), Siemens (840C/D/One, 808D, 810D, 828D), Heidenhain (145/155/407/426), Mazak (MAZATROL), Okuma (OSP) |

---

### POST-ULT-MS3: Machine-to-Post Cross-Reference
**Units: 4 | Priority: P0**

Map 910+ machines to their CPS baselines and identify gaps.

| Unit | Name | Description |
|------|------|-------------|
| U01 | MachinePostMatcher | Match each machine profile to best CPS post (manufacturer + controller + type) |
| U02 | CoverageGapAnalyzer | Identify machines with NO matching CPS — gap report by manufacturer/controller |
| U03 | PostFeatureEnricher | Enrich `machine-post-enriched.ts` with full extracted property lists and defaults per machine |
| U04 | PostCoverageMatrix | Coverage matrix: rows=machine models, cols=post features, cells=supported/optional/unavailable |

---

## Wave 2: Purchase Option Variability + Physics Context Resolution

### POST-ULT-MS4: Machine Option Registry
**Units: 5 | Priority: P0**

What each machine CAN have vs. what it DOES have — drives both post formatting AND physics pipeline configuration.

| Unit | Name | Description |
|------|------|-------------|
| U01 | MachineOptionSchema | TypeScript schema: `{ hasTSC, hasProbing, hasSSV, hasDWO, hasLiveTooling, hasYAxis, hasCAxis, hasPartCatcher, hasChipConveyor, hasToolArm, hasBarFeeder, coolantPressure, spindleOption, hasHSMPackage, has5AxisPackage, hasAdaptiveControl, hasThermalComp }` |
| U02 | ManufacturerOptionCatalog | Per-manufacturer option availability: standard vs. purchasable vs. unavailable per model line |
| U03 | OptionImpactMapper | Map each option to: (a) post properties enabled/disabled, AND (b) physics pipeline stages affected (e.g., `hasTSC=true` → enables TSC coolant model in CoolantOptimizationPhysicsEngine, changes thermal partition in CuttingThermalEngine) |
| U04 | OptionValidationEngine | Validate option compatibility (Y-axis requires live tooling on lathes, DWO requires 5th axis, etc.) |
| U05 | OptionPresetGenerator | Common presets per machine family: "base model", "fully loaded", "production config" |

---

### POST-ULT-MS5: Controller Feature Matrix
**Units: 4 | Priority: P1**

What each controller revision supports — drives which smoothing/TCP/look-ahead codes the pipeline can inject.

| Unit | Name | Description |
|------|------|-------------|
| U01 | FanucDialectMatrix | 0i-F/0i-TF/16i/18i/30i/31i — nano smoothing G5.1, AI contour G5.1 Q2, AICC, high-speed skip G31 |
| U02 | SiemensDialectMatrix | 808D/810D/828D/840C/840D/840Dsl/ONE — CYCLE800 modes (27/39/57/45/30/54/192), CYCLE832 levels, TRANSMIT, TRACYL |
| U03 | HeidenhainDialectMatrix | iTNC 530/TNC 620/TNC 640/TNC7 — PLANE SPATIAL vs M128, TCPM vs FUNCTION TCPM, cycle definitions |
| U04 | MazakOkumaDialectMatrix | SmoothG/SmoothAi/SmoothX, MAZATROL conversational vs EIA, G43.4 vs G43.5; Okuma OSP-P200/P300/P300A, G08 HPCC |

---

## Wave 3: User Intent Preservation + Rapid Optimization

### POST-ULT-MS6: Optimization Tier & Consent System
**Units: 7 | Priority: P0**

**The most important milestone in the entire roadmap.** This gates everything else — without it, PRISM is just another tool that "knows better" and butchers the programmer's work.

| Unit | Name | Description |
|------|------|-------------|
| U01 | OptimizationTierSchema | TypeScript enum + config: `tier: 1\|2\|3\|4` with per-tier feature flags. Stored per-machine AND per-job (user can override per-job). Default: Tier 2 for experienced users, Tier 1 for new setups |
| U02 | UserIntentDetector | Parse incoming CAM program to identify user decisions: operation order, tool selections, strategy choices (adaptive vs conventional vs trochoidal), retract heights, linking preferences. These are the "sacred" elements at Tier 1-2 |
| U03 | ChangeClassifier | Classify every potential PRISM modification: (a) S/F change (Tier 2), (b) motion/rapid change (Tier 3), (c) structural change (Tier 4). Nothing crosses tier boundaries without consent |
| U04 | ChangeExplanationEngine | Generate human-readable explanations for EVERY proposed change at Tier 3+: what changed, why (physics justification), predicted impact (time saved, tool life gained, surface finish improved), and tradeoffs ("faster but louder" / "safer but 8 sec slower") |
| U05 | DiffPreviewGenerator | Visual diff of original vs. optimized program: color-coded by change type (green=S/F, yellow=motion, red=structural). Shows summary stats: "47 feed changes, 12 rapid repathing, 0 operation reorders" |
| U06 | PerSuggestionApproval | At Tier 3-4, user can accept/reject individual changes or categories of changes. "Accept all rapid optimizations but reject operation reorder." Remembers preferences for next time |
| U07 | FusionPluginIntegration | For the eventual PRISM Fusion plugin: tier selection in the post dialog, inline diff preview, one-click accept/reject. Respects Fusion's operation order and strategy choices by default. Plugin sends intent metadata (why user chose this strategy) alongside toolpath data |

**Design principle**: PRISM should feel like a brilliant colleague who says "I'd suggest changing this, here's why" — not a robot that silently rewrites your program.

---

### POST-ULT-MS7: Rapid Repositioning & Non-Cutting Time Optimization
**Units: 8 | Priority: P0**

Optimize all non-cutting motion using actual per-axis machine kinematics. This is **Tier 3** — motion changes require user approval with full explanations.

| Unit | Name | Description |
|------|------|-------------|
| U01 | PerAxisKinematicsSolver | Use actual per-axis rapid rates from machine profiles (not generic). Real example: DMG DMC 70V has Z=18 m/min vs X/Y=24 m/min — a Z-first retract is slower than XY-first. Haas VF-6/50 has 15.24 m/min all axes vs. Brother S700X at 50 m/min X/Y. These differences change optimal rapid strategy completely |
| U02 | DiagonalVsSequentialOptimizer | Calculate actual time for diagonal (simultaneous XYZ) vs. sequential (Z up → XY → Z down) rapids per machine. Some controllers move all axes simultaneously at the slowest axis rate; others move each at its own rate. The optimal strategy depends on the machine's motion controller |
| U03 | RetractHeightOptimizer | Wire `PRISM_RAPID_PATH_OPTIMIZER` — minimize retract height per repositioning move based on actual stock/fixture clearance. Don't retract to Z50mm when Z5mm clears everything. Saves seconds per retract × hundreds of retracts = minutes |
| U04 | AirCutEliminator | Wire `PRISM_AIRCUT_ELIMINATION_ENGINE` (5,221 lines) — detect passes cutting air (after previous pass removed material) and replace with rapids at safe height. Common in finishing passes where roughing already cleared zones |
| U05 | RapidPathSequencer | Wire `PRISM_RAPID_PATH_OPTIMIZER` (nearest neighbor + 2-opt + Christofides) — when Tier 4 approved, reorder hole patterns and feature sequences for shortest total rapid distance. Show TSP savings: "reordered 47 holes, reduced rapid travel 34%, saving est. 1:23" |
| U06 | ToolChangePositionOptimizer | Optimize XY position during tool changes — move to position closest to first cut of next tool DURING the tool change, not after. Account for ATC type (carousel timing vs side-mount) |
| U07 | RotaryAxisRepositionOptimizer | For 4/5-axis machines: optimize rotary axis repositioning between operations. Consider rotary axis speed (often much slower than linear — 20-60 RPM vs linear rapids). Minimize total rotation angle. Handle wrap-around (350° → 10° should go +20°, not -340°) |
| U08 | NonCuttingTimeBudget | Calculate and report non-cutting time breakdown: rapid repositioning, tool changes, spindle accel/decel, retract/approach, rotary repositioning. Show what percentage of cycle time is non-cutting and where savings are available — even if user stays at Tier 2, they see the opportunity |

**Existing engines consumed**: PRISM_RAPID_PATH_OPTIMIZER, PRISM_RAPIDS_OPTIMIZER, PRISM_AIRCUT_ELIMINATION_ENGINE, MotionDynamicsProfileEngine, PRISM_SWARM_TOOLPATH (ACO sequencing), InverseKinematicsSolverEngine, PRISM_ADVANCED_KINEMATICS_ENGINE

**Key per-axis data already available** in machine profiles:
```
AxisDetail { name: string, travel_mm: number, rapid_m_min: number }
```
Examples: Okuma Genos L200 X=30/Y=15/Z=30 (asymmetric!), DMG DMC 70V Z=18 vs X/Y=24

---

## Wave 4: Physics-Integrated Post Generator (Tier 2+ Features)

### POST-ULT-MS8: Pipeline Phase 0-1 Integration (Context Resolution + Physics Foundation)
**Units: 7 | Priority: P0**

Wire the existing PRISM physics engines into the post generation pipeline. This is where the magic happens — every program gets physics-optimized before a single line of G-code is formatted.

| Unit | Name | Description |
|------|------|-------------|
| U01 | CatalogContextResolver | Auto-resolve machine profile (from 910), tool specs (from 95,608), material properties (from 2,957), holder stiffness (from 1,332) — all before physics runs. Uses `SpeedFeedOrchestratorEngine`'s 67 integration points |
| U02 | UltimateSpeedFeedIntegration | Wire `UltimateSpeedFeedEngine` as the primary S/F calculator — takes ANY subset of inputs, infers missing params via Kienzle/Taylor/Loewen-Shaw, outputs confidence-scored parameters (conservative/balanced/aggressive) per operation |
| U03 | StabilityLobeIntegration | Wire `ChatterStabilityLobeEngine` — compute stability lobe diagram for each tool+holder+machine combo, select chatter-free RPM zones, inject spindle speed that avoids regenerative chatter (Altintas & Budak 1995) |
| U04 | DeflectionLimitIntegration | Wire `ToolDeflectionPredictionEngine` — Euler-Bernoulli cantilever + stepped shaft model, enforce 0.05mm max deflection, reduce DOC/feed if deflection exceeds limits |
| U05 | ThermalBudgetIntegration | Wire `CuttingThermalEngine` — Trigger-Chao shear plane temp + Jaeger moving heat source + Loewen-Shaw heat partition, ensure tool-chip interface stays below coating degradation temp |
| U06 | PowerTorqueBudgetIntegration | Wire `CuttingPowerBudgetEngine` — verify spindle power/torque within constant-torque and constant-power regions of the machine's torque-speed curve, cap MRR at machine limits |
| U07 | WearLifePrediction | Wire `ToolWearRateEngine` — Taylor tool life `VT^n=C`, predict tool life at chosen parameters, flag when tool change needed mid-program, optimize speed for cost vs. productivity target |

**Existing engines consumed**: UltimateSpeedFeedEngine, SpeedFeedOrchestratorEngine, ChatterStabilityLobeEngine, ToolDeflectionPredictionEngine, CuttingThermalEngine, CuttingPowerBudgetEngine, ToolWearRateEngine, KienzleForceModelEngine

---

### POST-ULT-MS9: Pipeline Phase 2 Integration (Line-by-Line Adaptive Optimization)
**Units: 6 | Priority: P0**

**This is the key differentiator** — every single G-code line gets its own physics-optimized feed rate based on actual engagement geometry at that point in the cut.

| Unit | Name | Description |
|------|------|-------------|
| U01 | AutoSpeedFeedWiring | Wire `AutoSpeedFeedEngine` — parses raw CAM G-code, calculates physics-optimized S/F for EVERY cutting line using full engine stack. Produces per-line detail reports |
| U02 | ChipThinningCompensation | Wire `AdvancedChipThicknessEngine` — industry-validated lookup table (matches SolidCAM iMachining), feed boost up to 2.3x at 5% radial engagement, ball nose position-dependent, round insert effective angle, helix lag correction |
| U03 | EngagementAdaptiveFeed | Wire `EngagementAdaptiveFeedEngine` — maintains constant chip load as engagement angle varies throughout cut. Modes: constant_chip_load, constant_force, constant_MRR, thermal_balance. S-curve feed ramping between zones |
| U04 | CornerDecelerationEngine | Per-line direction change detection — angle-based feed reduction at corners (default: 30° threshold → 50% slowdown), prevents tool shock and breakage at engagement spikes |
| U05 | ArcAndPlungeLimiting | Arc feed limiting (small radius < 2.0mm → reduced feed), plunge rate limiting (Z-only moves → 50% feed), prevents tool overload on geometric transitions |
| U06 | ContinuousWearThermalTracking | Per-line wear progression (Kienzle VB model) + thermal accumulation tracking — as tool wears, adjust feeds to maintain surface finish; as temperature climbs, adjust to stay below coating limits |

**Result**: Instead of one F-word per operation (like traditional posts), the output has **variable F-words that change line-by-line** based on real physics at each point in the cut.

---

### POST-ULT-MS10: Pipeline Phase 3 Integration (Motion + Controller Feature Injection)
**Units: 6 | Priority: P0**

Inject controller-specific HSM codes, smoothing modes, and TCP handling — matched to what the machine actually has installed.

| Unit | Name | Description |
|------|------|-------------|
| U01 | HSMCodeInjector | Inject smoothing codes based on controller + purchased HSM package: Haas G187 P1/P2/P3, Siemens CYCLE832 tolerance levels, Fanuc G5.1 Q1/Q2, Heidenhain CYCLE32/M120 LA, Mazak G5.1 Q1, Okuma G08 P1 HPCC |
| U02 | TCPModeInjector | Inject TCP/RTCP for 5-axis: Haas G234/DWO (G254/G255), Siemens TRAORI/CYCLE800, Fanuc G43.4/G43.5, Heidenhain FUNCTION TCPM/M128, Mazak G43.4+parameter F86, Okuma G169 |
| U03 | LookAheadOptimizer | Tune look-ahead/motion control: Siemens COMPOF/COMPON/COMPCURV, Fanuc AI contour, Haas look-ahead buffer size, machine-specific jerk limits from G_FORCE_PHYSICS database |
| U04 | CoolantStrategyInjector | Map physics-selected coolant strategy to controller codes: flood (M8), TSC with pressure (M51 Pxxx), air blast (M7), MQL (M50), cryogenic — only emit codes for actually-installed coolant system |
| U05 | SSVInjector | Wire `SpindleSpeedVariationEngine` — when stability lobe analysis detects borderline chatter zone, inject SSV codes (Haas M138/M139, Okuma M695/M694) with calculated variation range |
| U06 | MachineDynamicsAdapter | Use `G_FORCE_PHYSICS.MACHINE_DYNAMICS` to set machine-class-specific acceleration profiles, jerk limits (rough vs finish), and high feed rates — economy VMC (0.3g) vs high-speed (1.2g) vs ultra (2.0g) |

---

### POST-ULT-MS11: Pipeline Phase 4-5 Integration (Verification + Safety)
**Units: 5 | Priority: P0**

Every program gets statistically verified and safety-checked before output.

| Unit | Name | Description |
|------|------|-------------|
| U01 | MonteCarloVerification | Wire `UncertaintyPropagationPipelineEngine` — propagate force/feed/thermal uncertainties through the pipeline, output 95% confidence intervals on surface finish and dimensional results, predict Cpk |
| U02 | PlaybookRuleEnforcement | Wire `MachiningPlaybookEngine` (296 rules) — validate material-specific anti-patterns, feature sequencing, wall thickness adequacy, tool-to-feature fit, coolant compatibility |
| U03 | TribalKnowledgeInjection | Wire tribal tips (3,700+ across 18 CAM systems) — inject CAM-specific best practices as comments or parameter adjustments (e.g., SolidCAM's chip thinning table, hyperMILL's collision-safe retract heights) |
| U04 | SafetyAnalyzer | Wire `GCodeSafetyAnalyzerEngine` — machine envelope collision detection, spindle/feed limit enforcement, tool clearance validation, rapid-into-material detection |
| U05 | MachineEnvelopeValidator | Validate all moves against actual machine travel limits (from machine profile), rotary axis ranges, check for axis-over-travel before it reaches the controller |

---

### POST-ULT-MS12: Pipeline Phase 6 (Output Generation + Formatting)
**Units: 6 | Priority: P0**

Format the physics-optimized program for the target controller with full purchase-option awareness.

| Unit | Name | Description |
|------|------|-------------|
| U01 | PostTemplateEngine | Controller-family base templates (Fanuc-family, Siemens, Heidenhain, Mazak, Okuma) — header/footer/safe-start/tool-change/retract patterns derived from CPS analysis |
| U02 | PropertyInjector | Given machine purchase options, inject/remove properties — `hasSSV=false` strips M138/M139, `hasProbing=false` strips all G65 P9xxx, `hasTSC=false` maps to M8 flood only |
| U03 | GCodeDialectTranslator | Translate dialect differences: work offsets (G54-59 vs G154 vs G54.1 Pn vs FRAMES), decimal places, arc format (IJK vs R), block numbering, program structure (% vs ;) |
| U04 | CannedCycleGenerator | Per-controller canned cycles: drilling (G73/G81/G83), tapping (G84/G84.2/G84.3 rigid/floating), boring (G85/G86/G87/G76), with physics-optimized peck depths and feed-per-rev |
| U05 | ProbingModuleGenerator | Probe routines matched to installed system: Renishaw G65 P9xxx, Heidenhain touch probe cycles (TCH PROBE), Siemens CYCLE977/978/979, Haas NGC probing, Blum macros |
| U06 | AnalyticsReportGenerator | Per-program analytics: force/power/thermal ranges per operation, tool life consumed %, cycle time breakdown, cost per part, chip thinning impact summary, optimization delta vs. CAM-native feeds |

---

## Wave 5: Advanced Physics + Cross-CAM

### POST-ULT-MS13: Advanced Physics Integration
**Units: 6 | Priority: P1**

Wire the deeper physics models for maximum accuracy.

| Unit | Name | Description |
|------|------|-------------|
| U01 | ConstitutiveModelIntegration | Wire `ConstitutiveModelEngine` (Johnson-Cook/Zerilli-Armstrong) — strain rate & temperature effects on material flow stress for accurate force prediction at varying speeds |
| U02 | OxleyPredictiveIntegration | Wire `AdvancedCuttingPhysicsEngine` (Oxley predictive machining) — analytical chip formation model for more accurate force prediction than empirical Kienzle at extreme conditions |
| U03 | ProcessDampingIntegration | Wire Altintas process damping model — at low speeds where stability lobes predict instability, process damping can provide stability. Important for heavy roughing |
| U04 | CrossPhysicsCoupling | Wire `CrossPhysicsCouplingEngine` — force↔thermal↔wear↔deflection coupled simulation. Tool wear increases forces, which increase temperature, which accelerates wear — the coupled model captures this feedback loop |
| U05 | StochasticForceModel | Wire `StochasticCuttingForceEngine` — Monte Carlo force prediction with material property scatter, tool geometry tolerance, and run-out effects for realistic confidence bounds |
| U06 | SurfaceIntegrityPredictor | Predict residual stress, white layer, work hardening from cutting parameters — feed back to adjust finishing passes for critical aerospace/medical parts |

---

### POST-ULT-MS14: Cross-CAM Unification + Multi-Channel
**Units: 5 | Priority: P1**

Handle toolpaths from any CAM system and multi-channel mill-turn.

| Unit | Name | Description |
|------|------|-------------|
| U01 | CamNeutralInterface | Common toolpath input format — already partially built in `MasterPostProcessorEngine`. Extends to accept CL/APT data, Fusion toolpath JSON, hyperMILL toolpath XML |
| U02 | CamSpecificEnhancer | Inject CAM-specific physics insights: Fusion adaptive clearing engagement angles, hyperMILL 5X auto-tilt vectors, Mastercam dynamic motion chip load targets, SolidCAM iMachining chip thinning factors |
| U03 | SubprogramOptimizer | Detect repeated geometry patterns → emit M98/CALL/L subroutine calls with coordinate transforms. Reduces program size 5-20x for pattern parts |
| U04 | MultiChannelPostGenerator | Mill-turn multi-channel: sync codes for C-axis, sub-spindle transfer, simultaneous turret+mill operations. Targets Mazak Integrex, DMG NLX, Okuma Multus, Nakamura |
| U05 | MillTurnPhysicsIntegration | Wire `MillTurnSwissPipelineEngine` — turning-specific physics (constant surface speed, part deflection under cutting forces, bar stock vibration modes) integrated with milling physics for mill-turn transitions |

---

## Wave 6: Validation, Delivery & Learning

### POST-ULT-MS15: Comprehensive Validation Suite
**Units: 5 | Priority: P0**

Validate that physics-optimized programs are correct AND better than CAM-native output.

| Unit | Name | Description |
|------|------|-------------|
| U01 | PostDiffEngine | Compare PRISM-optimized output against CPS baseline for identical toolpath input — quantify the improvement (cycle time reduction, surface finish improvement, tool life extension) |
| U02 | BackplotVerification | Feed generated G-code through `GCodeBackplotEngine` — verify motion correctness, no gouge, no rapid-into-material, correct tool orientation |
| U03 | PhysicsConsistencyChecker | Verify physics pipeline output consistency: forces within machine power budget, temperatures below coating limits, deflection within tolerance, tool life > program duration |
| U04 | RegressionMatrix | Automated test: 20 standard toolpath scenarios × 6 controllers × 3 option configs (base/mid/loaded) × 3 materials (6061-T6, 4140, Ti-6Al-4V) = 1,080 test cases |
| U05 | A/BComparisonEngine | Side-by-side comparison: CAM-native feeds vs. PRISM physics-optimized feeds — show per-line delta, predicted cycle time savings, predicted tool life improvement, predicted surface finish improvement |

---

### POST-ULT-MS16: Post Library & Configurator
**Units: 4 | Priority: P1**

User-facing interface for generating and managing physics-optimized posts.

| Unit | Name | Description |
|------|------|-------------|
| U01 | PostLibraryBrowser | Browse all available posts by machine/controller/capability, filter by installed options, show physics pipeline capabilities per post |
| U02 | PostConfigurator | Interactive: select machine → toggle purchase options → select physics pipeline stages → set aggressiveness (conservative/balanced/aggressive) → preview optimization delta → generate |
| U03 | PostExporter | Export as: `.cps` (Fusion), `.tcpost` (hyperMILL), `.mcpost` (Mastercam), PRISM-native JSON, or raw `.nc`/`.mpf`/`.eia` with physics annotations as comments |
| U04 | PostVersionManager | Track post versions, diff changes, rollback, associate with machine serial numbers |

---

### POST-ULT-MS17: Fleet Deployment & Continuous Learning
**Units: 5 | Priority: P2**

Deploy across shop floor and learn from real results.

| Unit | Name | Description |
|------|------|-------------|
| U01 | FleetPostSynchronizer | Sync post updates across all machines when templates, physics models, or option configs change |
| U02 | PostChangeImpactAnalyzer | When a post or physics model changes, identify all affected programs, flag for re-posting, estimate improvement delta |
| U03 | ShopStandardEnforcer | Enforce: mandatory safe start blocks, required comment formats, approved G-code subsets, physics pipeline minimum stages per machine |
| U04 | ShopFeedbackLoop | Wire `PostLearningFromShop` — ingest operator edits to posted programs, compare actual vs. predicted cycle times, calibrate physics models from real measurements |
| U05 | PredictivePostOptimizer | Wire `PredictionFeedbackOrchestratorEngine` — use historical job data to predict optimal post configuration for new jobs, recommend machine assignment based on physics capability match |

---

## Summary

| Wave | Milestones | Units | Focus |
|------|-----------|-------|-------|
| 1 — Foundation | MS1-MS3 | 13 | Parse 180 CPS files, build taxonomy, cross-ref 910 machines |
| 2 — Options | MS4-MS5 | 9 | Purchase option variability + controller feature matrices |
| 3 — Intent & Motion | MS6-MS7 | 16 | **User intent preservation** (4-tier consent), **rapid repositioning** (per-axis kinematics, magazine opt) |
| 4 — Physics Pipeline | MS8-MS12 | 42 | Wire 131+ physics engines into 7-phase pipeline — entry/exit, surface finish, chip evac, feed ramp, part deflection, setup sheets, operator comments, probe routines, prove-out mode |
| 5 — Advanced | MS13-MS14 | 12 | Deep physics (Johnson-Cook, Oxley, coupled models) + cross-CAM + mill-turn + bar feeder/pallet |
| 6 — Validation & Delivery | MS15-MS17 | 14 | Test suite, configurator UI, fleet deployment, continuous learning |
| **Total** | **17** | **106** | |

---

## Physics Engine Integration Map

Shows which existing PRISM engines feed into which pipeline phase:

### Phase 1 — Physics Foundation (per-operation)
| Engine | Physics Model | What It Does in the Post |
|--------|--------------|--------------------------|
| `UltimateSpeedFeedEngine` | Kienzle + Taylor + Loewen-Shaw | Calculate optimal S/F for each operation with confidence scoring |
| `ChatterStabilityLobeEngine` | Altintas & Budak (1995) regenerative | Select chatter-free RPM from stability lobe diagram |
| `ToolDeflectionPredictionEngine` | Euler-Bernoulli cantilever beam | Cap DOC/feed to keep deflection < 0.05mm |
| `CuttingThermalEngine` | Trigger-Chao + Jaeger + Shaw | Ensure temperature stays below coating degradation |
| `CuttingPowerBudgetEngine` | Spindle torque-speed curve | Cap MRR at machine power/torque limits |
| `ToolWearRateEngine` | Taylor VT^n=C | Predict tool life, optimize for cost vs. productivity |
| `KienzleForceModelEngine` | kc = kc1.1 × h^(-mc) | 3-component force prediction (Fc, Ff, Fp) |

### Phase 2 — Line-by-Line Optimization (per G-code block)
| Engine | Physics Model | What It Does in the Post |
|--------|--------------|--------------------------|
| `AutoSpeedFeedEngine` | Full engine stack per line | Physics S/F on EVERY cutting line |
| `AdvancedChipThicknessEngine` | Martellotti (1941) + empirical | Feed boost up to 2.3x at low engagement |
| `EngagementAdaptiveFeedEngine` | Constant chip load / force / MRR | Variable feed that adapts as engagement changes |
| `PostProcessorFeedOptimizerEngine` | Corner/arc/plunge detection | Per-line feed reduction at geometric transitions |

### Phase 3 — Motion + Controller (machine-specific)
| Engine | Controller Feature | What It Does in the Post |
|--------|-------------------|--------------------------|
| `AdvancedPostProcessorEngine` | HSM/RTCP/tool management | Inject smoothing, TCP, and management codes |
| `SpindleSpeedVariationEngine` | SSV for chatter suppression | M138/M139 (Haas), M695/M694 (Okuma) |
| `POST_PROCESSOR_DATABASE_V2` | G_FORCE_PHYSICS | Machine-class acceleration/jerk profiles |

### Phase 4-5 — Verification + Safety
| Engine | Physics Model | What It Does in the Post |
|--------|--------------|--------------------------|
| `UncertaintyPropagationPipelineEngine` | Monte Carlo | 95% CI on all physics predictions |
| `MachiningPlaybookEngine` | 296 rules | Validate against proven patterns |
| `GCodeSafetyAnalyzerEngine` | Envelope + limits | Collision and over-travel detection |

---

## Purchase Options Taxonomy

### Hardware Options (affect both post formatting AND physics pipeline)
| Option | Post Impact | Physics Pipeline Impact |
|--------|------------|------------------------|
| **Probing** | Enables probe cycle G-codes (G65 P9xxx, TCH PROBE, CYCLE977) | Enables in-process measurement feedback loop |
| **TSC (Through-Spindle Coolant)** | M51/M88/M50 codes | Changes thermal partition model — better heat removal → higher speeds allowed |
| **SSV (Spindle Speed Variation)** | M138/M139, M695/M694 | Expands stable cutting envelope in borderline chatter zones |
| **Chip Conveyor** | M-codes at program start/end | Enables aggressive chip removal strategies |
| **Tool Arm/Tool Setting Probe** | M104/M105 + measurement macros | Enables tool wear compensation feedback |
| **4th/5th Axis** | DWO/CYCLE800/PLANE SPATIAL | Enables tool vector optimization, singularity avoidance |
| **Y-Axis (lathe)** | G17.1/G18.1 plane selection | Enables off-center milling physics (engagement geometry changes) |
| **High-Speed Spindle** | Higher RPM range in S-words | Changes stability lobe diagram — potentially more stable zones at high RPM |
| **High-Torque Spindle** | More aggressive roughing parameters | Expands power budget — allows higher MRR |

### Software/Controller Options (affect which pipeline features can be injected)
| Option | Post Impact | Physics Pipeline Impact |
|--------|------------|------------------------|
| **HSM Package** | G187/CYCLE832/G5.1 codes | Enables smoothing-aware feed calculation |
| **5-Axis Simultaneous** | TCP/RTCP licensing codes | Enables full 5-axis motion optimization |
| **Adaptive Control** | Controller-based feed override | Physics pipeline can defer some adaptation to controller |
| **Thermal Compensation** | Controller thermal comp codes | Physics thermal model can account for machine-level compensation |

---

## Critical Path

```
MS1 (CPS Parse) → MS2 (Taxonomy) → MS3 (Cross-Ref)
                                         ↓
              MS4 (Options) → MS5 (Controller Matrix)
                                    ↓
              MS6 (Tier/Consent) ← GATES EVERYTHING BELOW
                    ↓
              MS7 (Rapid Reposition) ─── uses per-axis kinematics
                    ↓
              MS8 (Physics P0-P1) → MS9 (Line-by-Line P2) → MS10 (Motion P3)
                                                                   ↓
                                         MS11 (Verify P4-P5) → MS12 (Output P6)
                                                                   ↓
                                                       MS15 (Validation) → MS16 (UI)
```

**Parallel tracks**: MS13 (Advanced Physics) and MS14 (Cross-CAM) can proceed independently once MS9 is complete.

**MS6 is the gatekeeper** — it must be built first because every downstream milestone needs to know which tier is active to decide what changes are allowed.

---

## What "Ultimate Post" Means — Concrete Examples by Tier

### Tier 1: Format Only
User's Fusion program posted correctly for Haas NGC — zero behavioral changes.
```gcode
N10 G90 G94 G17 G40 G49 G80
N20 T1 M6 (1/2 ENDMILL 4FL)
N30 G54
N40 S8000 M3              ← User's RPM preserved exactly
N50 G43 H1 Z1.0
N60 M8                    ← Flood only (machine doesn't have TSC)
N70 G1 X1.0 Y0.5 F64.0   ← User's feed preserved exactly
N80 G1 X2.0 Y0.5 F64.0
N90 G1 X2.0 Y1.5 F64.0
...
(PRISM: Format-only post. User S/F preserved. No physics applied.)
(PRISM TIP: Tier 2 would optimize feeds — est. 23% cycle time reduction available.)
```
Even at Tier 1, PRISM tells you what you're leaving on the table.

---

### Tier 2: Physics-Enhanced S/F (Recommended)
Same toolpath geometry and operation order. Only speeds and feeds change — physics-justified, per-line.
```gcode
N10 G90 G94 G17 G40 G49 G80
N15 G187 P2 E0.001        ← HSM smoothing (NGC + purchased HSM package)
N20 T1 M6 (1/2 ENDMILL 4FL - CARBIDE 4FL - TL:45min@8247RPM)
N30 G54
N35 (PRISM T2: Kienzle Fc=412N, Pc=1.8kW/14.9kW, deflect=0.023mm, stable@8247RPM)
N40 S8247 M3              ← Chatter-free RPM from stability lobe analysis
N45 M88                   ← TSC on (purchased) — thermal model allows +12% speed
N50 G43 H1 Z1.0
N60 G1 X1.0 Y0.5 F78.2   ← Feed boosted: 22% radial engagement → chip thin 1.22x
N70 G1 X2.0 Y0.5 F91.4   ← Slot exit → feed up (engagement dropping)
N75 G1 X2.0 Y0.8 F54.1   ← Corner approach → 33% decel (engagement spike)
N80 G1 X2.0 Y1.5 F84.7   ← Straight cut, engagement stable → feed recovered
N85 G1 X1.8 Y1.5 F71.3   ← Wear progression: VB=0.08mm@12min → -6% feed adj
...
N500 (PRISM T2: Cycle 4:23 vs CAM-native 5:41 = 23% faster)
N505 (PRISM T2: Tool life consumed 67% of 45min predicted, Ra 0.8μm)
N510 (PRISM TIP: Tier 3 available — 12 rapid moves could save est. 47 sec more)
```
Toolpath geometry is untouched. Operation order is untouched. Only S/F optimized by physics.

---

### Tier 3: Motion-Optimized (User Approved)
Before posting, PRISM shows the user a change report:

```
┌─ PRISM TIER 3 CHANGE REPORT ─────────────────────────────────────────────┐
│                                                                           │
│  RAPID REPOSITIONING (12 changes)                          [Accept] [Reject]
│  ├─ 8 retract heights reduced (Z50→Z12 avg)    saves 18 sec │
│  ├─ 3 rapids converted diagonal (XYZ simult)   saves 11 sec │
│  │   └─ Machine: Haas VF-2 — all axes 25.4m/min = diagonal is faster    │
│  └─ 1 tool change position optimized            saves  4 sec │
│                                                                           │
│  AIR-CUT ELIMINATION (2 changes)                           [Accept] [Reject]
│  ├─ Pass 3 of Op2 (finish) — 67% air after rough saves 14 sec │
│  └─ Pass 1 of Op4 (restmill) — area already clear saves  8 sec │
│                                                                           │
│  TOTAL NON-CUTTING TIME SAVINGS: 55 sec (16% of cycle)                   │
│  Cutting moves: UNCHANGED (all Tier 2 S/F optimization applied)          │
│                                                                           │
│  [Accept All]  [Review Each]  [Stay at Tier 2]                           │
└───────────────────────────────────────────────────────────────────────────┘
```

The user sees every change, why, and the savings. They can accept/reject per category.

---

### Tier 4: Full Restructure (Explicit Opt-In)
PRISM goes further — suggests operation reordering, tool changes, strategy alternatives:

```
┌─ PRISM TIER 4 SUGGESTIONS ───────────────────────────────────────────────┐
│                                                                           │
│  OPERATION REORDER (saves 2 tool changes)              [Accept] [Reject] │
│  ├─ Move Op3 (drill 47 holes) before Op2 (pocket)                       │
│  │   WHY: Op1 and Op3 both use T3 (spot drill) — eliminates 1 tool      │
│  │   change (est. 12 sec) and the associated retract/approach            │
│  │   TRADEOFF: Drilling before pocket means chips in holes during        │
│  │   pocket — recommend air blast between ops if concerned               │
│  └─ Combine Op5 + Op6 (both use T7, same WCS)                           │
│      WHY: Same tool, same fixture — no reason for separate ops           │
│      TRADEOFF: None — this is purely beneficial                          │
│                                                                           │
│  HOLE PATTERN SEQUENCE (47 holes)                      [Accept] [Reject] │
│  ├─ Current: Row-by-row (Fusion default)                                 │
│  ├─ Suggested: ACO-optimized nearest neighbor                            │
│  │   WHY: Reduces total rapid travel from 4,230mm to 2,810mm            │
│  │   SAVINGS: 34% less rapid distance = est. 1:23 faster                │
│  └─ Preview: [Show reordered path on grid]                               │
│                                                                           │
│  STRATEGY ALTERNATIVE (Op2 pocket)                     [Accept] [Reject] │
│  ├─ Current: Conventional pocket (your Fusion selection)                  │
│  ├─ Alternative: Adaptive clearing (Fusion Adaptive)                     │
│  │   WHY: 6061-T6 in 12mm deep pocket — adaptive clearing allows         │
│  │   2x axial DOC at 40% radial, same MRR but lower force peaks         │
│  │   SAVINGS: Est. 3:12 faster, 40% less tool wear                      │
│  │   TRADEOFF: Different surface pattern on walls (scallop vs step)     │
│  └─ THIS IS A STRATEGY CHANGE — only applied if you explicitly accept   │
│                                                                           │
│  [Accept All]  [Review Each]  [Stay at Tier 3]                           │
└───────────────────────────────────────────────────────────────────────────┘
```

Every suggestion has: WHAT, WHY, SAVINGS, TRADEOFFS. The user decides.

---

### Rapid Repositioning: Per-Axis Kinematics in Action

Why this matters — same repositioning move, different machines, different optimal strategy:

```
Move: From X0 Y0 Z-50 to X200 Y150 Z-50 (retract, traverse, plunge)

HAAS VF-2 (all axes 25.4 m/min, 0.5g accel):
  Sequential: Z retract 50mm (0.12s) → XY traverse (0.47s) → Z plunge (0.12s) = 0.71s
  Diagonal:   XYZ simultaneous — limited by longest axis X (0.47s) = 0.47s
  → DIAGONAL WINS by 0.24s (34% faster)

DMG DMC 70V (X/Y=24 m/min, Z=18 m/min, different accel):
  Sequential: Z retract (0.17s) → XY traverse (0.50s) → Z plunge (0.17s) = 0.84s
  Diagonal:   XYZ simultaneous — limited by slow Z axis = 0.56s
  → DIAGONAL STILL WINS but only by 0.28s — Z axis drags down XY

BROTHER S700X (X/Y=50 m/min, Z=50 m/min, 2.0g accel):
  Sequential: Z retract (0.06s) → XY traverse (0.18s) → Z plunge (0.06s) = 0.30s
  Diagonal:   XYZ simultaneous = 0.18s
  → DIAGONAL WINS by 0.12s — high-speed machine, every ms counts

5-AXIS WITH ROTARY (A-axis 20 RPM, C-axis 100 RPM):
  Linear axes finish in 0.3s, but A-axis rotation takes 0.8s
  → Rotary axis is the bottleneck — start A rotation first, overlap with linear
  → PRISM sequences: start A+C rotation → after 0.5s start XYZ → all arrive together
```

**× hundreds of repositions per program = minutes saved.**

**That's** the ultimate post.

---

## Scrutiny Pass: Gaps Found & Additions (2026-03-22)

Deep audit of all 1,088 PRISM engines revealed **47+ engines that exist but weren't wired into the roadmap**. These fall into critical categories that make the difference between "good" and "truly maximized" output. Below are the gaps organized by which milestone they belong to, with new units added.

### GAP 1: Entry/Exit Strategy (Missing from MS9 — Line-by-Line)
**Impact: HIGH — entry moves are the #1 cause of tool breakage**

The roadmap optimizes feeds per line but doesn't optimize HOW the tool enters/exits the cut. A plunge into full-width material at the optimized feed will still break the tool.

**Engines available but unwired:**
- `EntryExitStrategyEngine.ts` — helical, ramp, arc, plunge, interpolated entry with material-specific rules
- `RampingEngine.ts` — linear/helical ramp with feed reduction for angled entry
- `PlungeMillingEngine.ts` — Z-axis plunge optimization

**Add to MS9:** `U07 EntryExitOptimizer` — Detect entry/exit moves in G-code, verify strategy matches material (no plunge into Ti-6Al-4V, helical entry for hard materials), adjust entry feed rates independently from cutting feeds.

---

### GAP 2: Surface Finish Prediction & Verification (Missing from MS11 — Verify)
**Impact: HIGH — can't verify quality without predicting it**

We track forces, thermal, and wear — but never explicitly predict the surface finish (Ra) that these parameters will produce. Without this, we can't tell the operator what finish to expect.

**Engines available but unwired:**
- `SurfaceFinishPredictorEngine.ts` — Brammertz kinematic roughness, scallop height, waviness, composite
- `StepoverOptimizationEngine.ts` — curvature-adaptive stepover for target Ra
- `StochasticSurfaceFinishEngine.ts` — probabilistic finish with uncertainty
- `FinishingPassOptimizationEngine.ts` — finishing-specific parameter tuning

**Add to MS11:** `U06 SurfaceFinishVerifier` — Predict Ra per operation from physics (feed marks, BUE risk, vibration amplitude), verify against drawing tolerance, flag operations that won't meet spec, suggest parameter adjustments.

---

### GAP 3: Feed Ramping / S-Curve Transitions (Missing from MS9 — Line-by-Line)
**Impact: MEDIUM-HIGH — step changes in feed cause machine jerk and marks**

The roadmap produces line-by-line variable feeds, but going from F78.2 to F54.1 in one block causes a jerk event. Need smooth transitions.

**Engines available but unwired:**
- `MinimumJerkTrajectoryEngine.ts` — 5th-order polynomial jerk-limited profiles
- `ExponentialSmoothingEngine.ts` — feed rate smoothing
- `ClothoidBlendingEngine.ts` — Euler spiral transitions
- `ToolpathSmoothingEngine.ts` — spline smoothing

**Add to MS9:** `U08 FeedTransitionSmoother` — Insert intermediate feed blocks for S-curve ramping between significantly different feed rates. Respect machine jerk limits from G_FORCE_PHYSICS. Prevent step-changes > 20% between consecutive blocks.

---

### GAP 4: Part/Workpiece Deflection (Missing from MS8 — Physics Foundation)
**Impact: HIGH — tool deflection is only half the story**

We model tool deflection (Euler-Bernoulli) but not workpiece deflection. A thin-wall pocket deflects under cutting forces — the wall moves away from the tool, leaving material, then springs back.

**Engines available but unwired:**
- `ThinWallMachiningEngine.ts` — wall deflection δ = F·H³/(3·E·I), natural frequency, trochoidal reduction
- `ThinFloorVibrationEngine.ts` — pocket floor vibration
- `PartDeflectionEngine.ts` — general workpiece deflection
- `RigidityDegradationEngine.ts` — rigidity loss as material is removed

**Add to MS8:** `U08 PartDeflectionIntegration` — Wire thin wall/floor engines. For thin-wall pockets (wall thickness < 3× tool diameter), reduce radial engagement and use alternating-side cutting. Predict wall deflection and compensate tool path or warn user.

---

### GAP 5: Chip Evacuation Constraints (Missing from MS9 — Line-by-Line)
**Impact: MEDIUM-HIGH — deep features need feed reduction for chip clearing**

Chip evacuation gets harder as depth increases. In a 3× diameter deep pocket, chips can re-cut, work-harden the surface, and break tools. Feed needs to reduce with depth.

**Engines available but unwired:**
- `ChipBreakingEngine.ts` — chip form prediction, bird's nest risk
- `ChipConveyorEngine.ts` — conveyor speed for chip flow
- `ChipMorphologyDiagnosticEngine.ts` — chip shape diagnosis
- `BurrFormationEngine.ts` — exit burr risk

**Add to MS9:** `U09 ChipEvacuationConstraint` — Reduce feed in deep features where L/D > 2 (pocket depth / tool diameter). Inject peck-retract cycles for deep drilling. Flag bird's nest risk for stringy materials (304SS, Inconel).

---

### GAP 6: Tool Magazine Optimization (Missing from MS7 — Rapid Reposition)
**Impact: MEDIUM — saves 2-8 sec per tool change on carousel machines**

Tool change time depends on which slot the next tool is in. Carousel ATCs take 0.5-2 sec per slot to rotate. Optimizing slot assignment saves time.

**Engines available but unwired:**
- `ToolMagazineOptimizationEngine.ts` — carousel slot optimization for retrieval time

**Add to MS7:** `U09 ToolMagazineSlotOptimizer` — Given program tool sequence, calculate optimal magazine slot assignment to minimize carousel rotation time. Account for ATC type (carousel: slot distance matters; side-mount: all equal; chain: similar to carousel). Tier 3+ with approval.

---

### GAP 7: Setup Sheet / Complete Job Package (Missing from MS12 — Output)
**Impact: HIGH — G-code alone is not a complete deliverable**

The operator needs: tool list with offsets, fixture drawing, WCS setup instructions, and operation notes. Currently MS12 has AnalyticsReportGenerator but not a complete job package.

**Engines available but unwired:**
- `SetupSheetEngine.ts` — professional setup sheet generation
- `SetupSheetFromGCodeEngine.ts` — reverse-engineer setup from G-code
- `SetupSheetLibraryEngine.ts` — template library

**Add to MS12:** `U07 SetupSheetGenerator` — Auto-generate complete setup package: tool list with holder/projection/offset, fixture instructions, WCS setup procedure, first-article inspection checklist. Output as printable PDF or Markdown.

---

### GAP 8: Probe Routine Auto-Generation (Missing from MS12 — Output)
**Impact: MEDIUM — automates a manual, error-prone step**

MS12 U05 handles probe module generation for the CPS post format, but doesn't auto-generate probe routines based on the part features.

**Engines available but unwired:**
- `ProbeRoutineEngine.ts` — automatic probe routine generation
- `ProbeRoutineGeneratorEngine.ts` — feature-based probe sequence

**Add to MS12:** `U08 AutoProbeRoutineGenerator` — Analyze part features and auto-generate: WCS setup probe routine (before cutting), in-process measurement (mid-program critical features), first-article inspection (after cutting). Only if machine has probing purchased.

---

### GAP 9: Geometric/Thermal Compensation (Missing from MS10 — Motion)
**Impact: MEDIUM — matters for precision work ±0.01mm and tighter**

For tight-tolerance work, machine geometric errors and thermal growth matter. Some controllers have built-in compensation; PRISM should inject compensation codes or warn when accuracy limits are approached.

**Engines available but unwired:**
- `AxisCompensationEngine.ts` — thermal growth + backlash + pitch error per axis
- `MachineGeometricAccuracyEngine.ts` — ISO 230-2/3 geometric error mapping
- `ThermalGrowthCompensationEngine.ts` — spindle/axis thermal expansion

**Add to MS10:** `U07 GeometricCompensationInjector` — For precision operations (tolerance < 0.025mm), inject warm-up recommendations, dwell times for thermal settling, and backlash approach direction consistency. Emit thermal comp codes if controller supports them.

---

### GAP 10: Coolant Flow & Nozzle Positioning (Missing from MS10 — Motion)
**Impact: MEDIUM — wrong coolant delivery wastes 10-20% tool life**

MS10 U04 maps coolant strategy to M-codes, but doesn't optimize coolant delivery — nozzle position, flow rate, concentration for the specific operation.

**Engines available but unwired:**
- `CoolantFlowEngine.ts` — nozzle position and flow rate calculation
- `CoolantStrategyEngine.ts` — type/concentration optimization
- `CoolantOptimizationPhysicsEngine.ts` — physics-based coolant selection

**Add to MS10 U04 (expand):** Add coolant pressure/flow recommendations as comments. For programmable coolant nozzles (e.g., Haas P-Cool), emit positioning commands. For TSC, calculate optimal pressure based on tool diameter and material.

---

### GAP 11: Minimum Block Length / Block Density (Missing from MS9 — Line-by-Line)
**Impact: MEDIUM — controllers stutter on very short blocks at high feed**

High-speed machining produces many short line segments. If the block execution time is shorter than the controller's cycle time (typically 1-4ms), the machine decelerates. Need to ensure minimum block length.

**Add to MS9:** `U10 BlockDensityOptimizer` — Calculate block execution time at programmed feed. If < controller cycle time (from machine profile), either: (a) merge short blocks, (b) reduce feed to ensure smooth execution, or (c) inject G5.1/CYCLE832 to enable controller-side smoothing. Critical for HSM at > 5000mm/min.

---

### GAP 12: DNC / Program Transfer Optimization (Missing from MS12 — Output)
**Impact: LOW-MEDIUM — matters for older machines with limited memory**

**Engines available:** `DNCTransferEngine.ts`

**Add to MS12:** `U09 ProgramSizeOptimizer` — For memory-constrained controllers: split large programs into M98 subprogram calls, optimize block length for serial DNC drip-feed, calculate file size and warn if > controller memory. Generate QR codes for Haas/Mazak with Cimco integration.

---

### GAP 13: Spindle Warm-Up Sequences (Missing from MS10 — Motion)
**Impact: MEDIUM — critical for precision first-article work**

**Engines available:** `MachineWarmupEngine.ts`, `SpindleRunoutEngine.ts`

**Add to MS10:** `U08 SpindleWarmupInjector` — For precision operations or cold-start conditions, inject optional spindle warm-up routine (ramp from 1000→max RPM in 3-5 stages, dwell 30s each). Add as block-delete section so operator can skip if machine is warm.

---

### GAP 14: Bar Feeder / Pallet Changer Integration (Missing from MS14 — Cross-CAM)
**Impact: MEDIUM — critical for production lathe and HMC work**

**Engines available:** `BarFeederEngine.ts`, `BarPullerTimingEngine.ts`, `BarStockVibrationEngine.ts`, `SteadyRestPlacementEngine.ts`

**Add to MS14:** `U06 ProductionAutomationIntegration` — For bar-fed lathes: inject bar feed advance codes, remnant length management, part count tracking. For HMCs with pallet changers: inject M60 pallet change codes, optimize pallet load/unload sequence. For Swiss-type: multi-channel synchronization.

---

### GAP 15: Operator-Friendly Comments & Prove-Out Mode (Missing from MS12 — Output)
**Impact: MEDIUM — operators need more than physics annotations**

The analytics report is great for engineers but operators need: "THIS IS OP2 - ROUGH POCKET - EXPECT HEAVY CUT" not "Kienzle Fc=412N".

**Add to MS12:** `U10 OperatorCommentInjector` — Strategic comments at: operation transitions ("OP2: POCKET ROUGH - T3 1/2 EM 4FL"), tool changes ("NEXT TOOL: T5 - CHECK PROTRUSION 45mm"), critical operations ("THIN WALL - LISTEN FOR CHATTER"), and program checkpoints ("50% COMPLETE - CHECK PART"). Also generate a `/` block-delete prove-out version at 50% feeds for first article.

---

## Updated Unit Counts After Scrutiny

| Milestone | Before | Added | After |
|-----------|--------|-------|-------|
| MS7 (Rapid) | 8 | +1 (magazine) | 9 |
| MS8 (Physics P0-P1) | 7 | +1 (part deflection) | 8 |
| MS9 (Line-by-Line P2) | 6 | +4 (entry/exit, feed ramp, chip evac, block density) | 10 |
| MS10 (Motion P3) | 6 | +2 (geometric comp, spindle warmup) | 8 |
| MS11 (Verify P4-P5) | 5 | +1 (surface finish) | 6 |
| MS12 (Output P6) | 6 | +4 (setup sheet, auto probe, DNC, operator comments) | 10 |
| MS14 (Cross-CAM) | 5 | +1 (bar feeder/pallet) | 6 |
| **Total** | **92** | **+14** | **106** |
