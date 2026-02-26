# ROADMAP v14.1 SYSTEMS ARCHITECTURE AUDIT
## Perspective: Chief Manufacturing Technology Officer
## Finding: The roadmap builds features but misses 7 systemic infrastructure gaps
## Generated: 2026-02-15

---

## AUDIT METHODOLOGY

Audited every file in the v14.1 package (32 files, 17,698 lines) against:
- The actual MCP server codebase (321 actions, 37 engines, 14 registries)
- The extracted IP inventory (868 + 1,062 files, 227MB)
- The formula registry (490 formulas, 66 INVENTION, 39 NOVEL)
- The engine registry (447 engines, 92 INVENTION, 88 NOVEL)
- The toolpath strategy registry (697 strategies)
- The wiring registries (D2F, F2E, E2S mappings)
- The controller database (58 files, 9,200+ alarm codes)
- Industry requirements for production manufacturing software

---

## FINDING 1: THE FORMULA REGISTRY IS A DEAD ASSET

**The problem:** FORMULA_REGISTRY.json catalogs 490 formulas with rich metadata — inputs,
outputs, physics basis, novelty classification, category, equations. FormulaRegistry.ts (28KB)
exists in the MCP server. But **no roadmap phase plans to wire formulas through the registry.**

Currently, formulas are hardcoded inside ManufacturingCalculations.ts and AdvancedCalculations.ts.
When job_plan needs Kienzle force, it calls a method directly. It never queries FormulaRegistry
to discover which formula is appropriate, what inputs it needs, or what its confidence level is.

**Why this matters:** The formula registry enables:
- **Formula discovery**: "What formulas apply to this problem?" → registry lookup
- **Formula comparison**: Run the same problem through Taylor AND extended Taylor AND ML-predicted
  tool life, compare results, use the most confident one
- **Formula versioning**: When a better model is published, register it without touching engine code
- **Formula chaining**: The registry knows inputs/outputs, so it can automatically chain
  F-CUT-001 → F-THERM-002 → F-SURF-003 (force → temperature → surface finish)
- **Novelty tracking**: 66 INVENTION formulas exist. Nobody knows which ones are wired.

**What the roadmap should add:**

```
R3-MS0.5: Formula Registry Integration
  1. FormulaRegistry.ts already has get/search/list — wire to calcDispatcher
  2. Add action: formula_discover(problem_type, material, operation) → ranked formula list
  3. Add action: formula_compare(formula_ids[], inputs) → side-by-side results
  4. Modify speed_feed_calc to query FormulaRegistry for applicable formulas before computing
  5. Index the 105 INVENTION/NOVEL formulas and flag which have implementations vs stubs
```

---

## FINDING 2: CROSS-DOMAIN PHYSICS COUPLING IS THE REAL BREAKTHROUGH — AND IT'S MISSING

**The problem:** The HYBRID formula category contains 20 formulas, 15 of which are
INVENTION/NOVEL class. These represent **coupled physics effects** that no other tool models:

| Formula | What It Does | Why It Matters |
|---------|-------------|----------------|
| F-HYB-005: Force-Thermal Coupling | Links cutting force to heat generation to tool temperature | Higher force = more heat = faster wear. Current calcs treat these independently. |
| F-HYB-006: Wear-Surface Coupling | Links tool wear state to surface finish degradation | As tool wears, Ra increases. Current calcs assume fresh tool. |
| F-HYB-007: Vibration-Wear Coupling | Links vibration to accelerated wear | Chatter doesn't just hurt finish — it destroys tools 3x faster. |
| F-HYB-008: Thermal-Deflection Coupling | Links thermal growth to dimensional accuracy | Hot spindle = position shift = scrap parts. |
| F-HYB-017: Unified Machining Model | Single model combining force+thermal+vibration+wear | The holy grail — predict everything from one set of inputs. |
| F-HYB-018: Self-Optimizing Process | Parameters that auto-adjust based on sensor feedback | Adaptive machining — the future of CNC. |

**R7-MS0 plans surface integrity and chatter prediction as separate calculations.**
The real value is in the COUPLING — force changes temperature which changes wear which
changes surface finish which changes the next pass. A sequential chain misses the
feedback loops. The Unified Machining Model (F-HYB-017) captures these interactions.

**What the roadmap should add:**

```
R7-MS0 AMENDMENT: Coupled Physics Model
  1. Don't just calculate Ra and chatter separately — implement the coupling formulas
  2. F-HYB-005 (Force-Thermal) feeds into F-HYB-008 (Thermal-Deflection)
  3. F-HYB-006 (Wear-Surface) modifies Ra prediction based on tool wear state
  4. F-HYB-007 (Vibration-Wear) adjusts tool life prediction when chatter is present
  5. The unified model runs ALL couplings simultaneously for a single prediction
  6. This is what makes PRISM's predictions qualitatively different from a handbook
```

---

## FINDING 3: THE WIRING REGISTRIES MAP THE ENTIRE SYSTEM — AND NOBODY USES THEM

**The problem:** Four wiring registry files exist:
- PRECISE_WIRING_D2F.json — Dispatchers → Formulas (which dispatcher uses which formula)
- PRECISE_WIRING_F2E.json — Formulas → Engines (which engine implements which formula)
- PRECISE_WIRING_E2S.json — Engines → Services (which service exposes which engine)
- WIRING_EXHAUSTIVE_FINAL.json — Complete system wiring map

These are architectural blueprints showing exactly how data flows through the system.
**No roadmap phase references them.** Every implementation milestone forces the executor
to re-discover which engine to call, which formula to use, which service to wire.

**What the roadmap should add:**

```
EVERY implementation milestone should reference wiring registries:
  "Before implementing [action], consult PRECISE_WIRING_D2F.json to identify
   which formulas are mapped to this dispatcher. Then consult PRECISE_WIRING_F2E.json
   to identify which engine implements those formulas. Wire accordingly."

Add to ROADMAP_INSTRUCTIONS.md:
  "Step 3.5: Load PRECISE_WIRING_D2F.json to identify formula dependencies
   for the current action before writing any code."
```

---

## FINDING 4: 697 TOOLPATH STRATEGIES EXIST BUT ONLY strategy_select USES THEM

**The problem:** ToolpathStrategyRegistry.ts is 182KB — the largest file in the entire
codebase. It contains 697 strategies covering every conceivable manufacturing scenario.
The only action that touches it is `strategy_select` in ToolpathCalculations.ts.

**What's missing:**
- **strategy_compare**: "Show me trochoidal vs adaptive clearing for this pocket" with
  predicted cycle time, tool life, and surface finish for each
- **strategy_learn**: Record which strategy actually worked best for a given scenario,
  feed back into strategy rankings
- **strategy_chain**: Some features need multiple strategies (rough → semi-finish → finish).
  Auto-generate the strategy chain for a complete feature.
- **strategy_explain**: Tell the user WHY trochoidal is better than conventional for this
  specific case (deep pocket, tough material, long tool)

**What the roadmap should add:**

```
R3-MS2 AMENDMENT: Toolpath Intelligence Expansion
  Add: strategy_compare(feature, material, strategies[]) → ranked comparison
  Add: strategy_chain(feature, constraints) → ordered [rough, semi, finish] strategies
  Add: strategy_explain(strategy, context) → plain-language rationale
  Wire: strategy outcomes to R7-MS3 learning pipeline
```

---

## FINDING 5: NO DATA VALIDATION PIPELINE EXISTS

**The problem:** R1 plans to load 3,518 materials, 824 machines, and 1,944 tools into
registries. But there is no plan to validate that the loaded data is:
- **Correct**: Is the hardness of 4140 steel actually 197 HB? (It should be 197-217 HB annealed)
- **Consistent**: Does the same material in two files have the same properties?
- **Complete**: What percentage of fields are null/undefined vs populated?
- **Current**: Are the tool catalog entries from 2024 or 2018?
- **Cross-referenced**: Does a material's composition match its designation?

**Why this matters for a safety-critical system:** If MaterialRegistry returns
hardness=500 HB for 6061-T6 aluminum (actual: ~95 HB), every downstream calculation
will produce dangerously wrong cutting parameters. The data validation pipeline IS the
safety system for the data layer.

**What the roadmap should add:**

```
R1-MS4.5: Data Validation Pipeline
  New engine: DataValidationEngine.ts
  1. PHYSICAL BOUNDS CHECKING:
     - Hardness: 0 < HB < 800 (nothing exceeds this in practice)
     - Density: 1.0 < g/cm³ < 23.0 (lithium to osmium)
     - Tensile strength: 10 < MPa < 3000
     - Thermal conductivity: 0.1 < W/mK < 430 (polyurethane to silver)
     - Melting point: 150°C < Tm < 3500°C
  2. CROSS-REFERENCE VALIDATION:
     - If material has AISI designation, verify it maps to correct UNS
     - If material has composition, verify composition sums to ~100%
     - If machine has max RPM, verify it's reasonable for machine type
  3. CONSISTENCY CHECKING:
     - Same material in multiple files → properties must agree within 5%
     - Machine RPM max must be ≥ RPM min
     - Tool diameter must be > 0 and < 500mm (no 1-meter endmill exists)
  4. COMPLETENESS SCORING:
     - Per-material: score 0-100 based on field population
     - Per-category: what % of entries have full data vs stubs
     - Generate VALIDATION_REPORT.json after every build
  5. STALENESS DETECTION:
     - Flag tool entries with no manufacturer catalog source
     - Flag materials with no standards reference (AISI, DIN, JIS)
```

---

## FINDING 6: SUSTAINABILITY & ESG ARE COMPLETELY ABSENT

**The problem:** The formula registry has 13 SUSTAINABILITY formulas including:
- F-SUST-011: Eco-Efficiency Index
- F-SUST-012: Optimal Sustainability
- F-SUST-013: Circular Economy Score

Plus ECONOMICS formulas for energy cost, coolant cost, and waste disposal cost.
The roadmap mentions cost optimization (R7-MS1) but **completely ignores sustainability.**

**Why this matters:** European manufacturers (and increasingly US/Asian ones) face
mandatory ESG reporting requirements. ISO 14955 covers environmental evaluation of
machine tools. Customers increasingly ask suppliers for carbon footprint data per part.

**A manufacturer who can say "this part was made with optimized parameters that reduced
energy consumption by 18% and coolant usage by 30% compared to handbook values" has a
real competitive advantage.** PRISM has the formulas to calculate this. Nobody plans to use them.

**What the roadmap should add:**

```
R7-MS1 AMENDMENT: Sustainability Metrics
  Add to optimize_parameters output:
    sustainability: {
      energy_kwh: number;           // Total energy consumption for the operation
      co2_kg: number;               // Estimated CO2 emissions (from energy + coolant + material waste)
      coolant_liters: number;       // Coolant consumed
      chip_waste_kg: number;        // Material removed (already calculated from MRR)
      eco_efficiency_score: number; // F-SUST-011
    }

  Add action: sustainability_report(job_plan_result) → full environmental impact report
  Wire: F-SUST-011, F-SUST-012, F-SUST-013 through FormulaRegistry
```

---

## FINDING 7: NO REGRESSION TEST SUITE FOR CALCULATIONS

**The problem:** R2 covers safety validation extensively — S(x) ≥ 0.70, fault injection,
hand-calc verification. But there is **no persistent regression test suite** that runs
after every build to verify calculations haven't changed.

ManufacturingCalculations.ts (30KB) contains the core formulas. If someone modifies the
Kienzle force calculation during R7 physics work, how do we detect that speed_feed_calc
now returns different values than yesterday? We don't, currently.

**What the roadmap should add:**

```
R2-MS1.5: Calculation Regression Suite
  Create: data/test/CALC_BENCHMARKS.json
  Content: 50+ known-good calculation results:
    { input: { material: "4140", operation: "milling", ... },
      expected: { vc_mpm: 120, fz_mm: 0.15, force_n: 1247, ... },
      tolerance_pct: 5,
      source: "Machining Data Handbook, 3rd Ed, Table 4.12" }

  Create: src/__tests__/calcRegression.test.ts
  Runs in npm run build (test:critical pipeline)
  Fails build if ANY benchmark result changes by more than tolerance_pct
  This is the "golden dataset" — if it passes, calculations are trustworthy

  Add: Regression hook
    HOOK: calc_regression_gate
    TRIGGER: post-build
    PURPOSE: Run all 50+ benchmarks, block release if any fail
    MODE: blocking
    PRIORITY: critical
```

---

## FINDING 8: MISSING FORMULA CATEGORIES IN ROADMAP COVERAGE

These formula registry categories have ZERO roadmap coverage:

| Category | Formulas | INVENTION/NOVEL | What They Enable | Should Go In |
|----------|----------|-----------------|-----------------|-------------|
| TRIBOLOGY | 14 | 2 | Friction modeling for workholding, chip flow | R7-MS2 |
| METROLOGY | 15 | 2 | Measurement planning, adaptive sampling | R9-MS5 |
| COOLANT | 15 | 2 | Coolant flow optimization, MQL decision | R7-MS0 |
| TOOL_GEOMETRY | 20 | 4 | Tool selection scoring, optimal nose radius | R3-MS0 |
| GEOMETRIC | 15 | 2 | Stepover optimization, path density | R3-MS2 |
| SCHEDULING | 17 | 3 | Dynamic priority, schedule robustness | R7-MS5 |
| DIGITAL_TWIN | 15 | 4 | Model update frequency, confidence decay | R10 |
| SUSTAINABILITY | 13 | 3 | See Finding 6 | R7-MS1 |
| HYBRID | 20 | 15 | See Finding 2 | R7-MS0 |
| SIGNAL | 18 | 2 | Already partially in R7-MS0 | R7-MS0/R9 |

**Total uncovered: 162 formulas including 39 INVENTION/NOVEL class**

---

## FINDING 9: THE CONTROLLER DATABASE IS UNDEREXPLOITED

**The problem:** 58 files in extracted/controllers/ with 9,200+ alarm codes across
12 controller families. AlarmRegistry.ts (18KB) loads them. Three actions exist:
alarm_decode, alarm_diagnose, alarm_fix.

**What's missing:**
- **Alarm pattern analysis**: "This machine has thrown alarms 5073, 5074, 5075 in the
  last week — what's the root cause?" (Answer: probably a failing encoder)
- **Controller-specific G-code validation**: When controller_optimize generates G-code
  for a FANUC, validate it against FANUC's modal group rules. When it's for a Siemens,
  validate against Siemens's syntax.
- **Controller capability matrix**: "Can my Haas VF-2 do rigid tapping?" → query
  CONTROLLER_DATABASE.json for capability flags.
- **Alarm-to-parameter correlation**: "Every time I run this program at 12,000 RPM,
  I get alarm 2087" → correlate alarm conditions with cutting parameters to identify
  the trigger (spindle overload at that RPM with that tool).

**What the roadmap should add:**

```
R3-MS3 AMENDMENT: Controller Intelligence
  Add: alarm_pattern(machine, alarm_history[]) → root cause analysis
  Add: controller_validate(controller_type, gcode_block) → validation result
  Add: controller_capabilities(machine) → capability flags
  Wire: ALARM_FIX_PROCEDURES.json to alarm_fix action
  Wire: CONTROLLER_DATABASE.json to controller_capabilities action
```

---

## FINDING 10: NO API/EMBEDDING STRATEGY

**The problem:** R4 (Enterprise) and R9 (Integration) plan external integrations, but
the roadmap never addresses how PRISM's intelligence is **consumed** by other systems.

A CAM plugin doesn't call MCP tools — it calls an API. An ERP system doesn't chat with
Claude — it sends an HTTP request. A mobile app doesn't have an MCP connection — it needs
a REST endpoint.

**The MCP server architecture is perfect for Claude Desktop integration. It's inadequate
for every other consumption model.** The roadmap needs an API layer between the MCP
dispatchers and external consumers.

**What the roadmap should add:**

```
R4-MS0 AMENDMENT: API Layer
  Create: src/api/PrismAPI.ts
  Expose key actions as REST endpoints:
    POST /api/v1/speed-feed     → speed_feed_calc
    POST /api/v1/job-plan       → job_plan (R3)
    POST /api/v1/material       → material_get + material_search
    POST /api/v1/tool           → tool_get + tool_recommend
    POST /api/v1/chatter        → chatter_predict (R7)
    POST /api/v1/optimize       → optimize_parameters (R7)
    GET  /api/v1/health         → server health + registry status

  Authentication: API key based (simple to start)
  Rate limiting: Per-key limits
  Response format: Standard JSON with safety metadata

  This enables:
    - CAM plugins (Fusion 360, Mastercam) to query PRISM
    - Mobile app for shop floor
    - ERP integration for quoting
    - Third-party tools to embed PRISM intelligence
```

---

## FINDING 11: MISSING UNITS & TOLERANCE INTELLIGENCE

**The problem:** The roadmap's physics engines calculate in metric. The US market
(PRISM's primary initial market) works predominantly in imperial. But there's no
systematic unit handling strategy.

More critically, **tolerance analysis** is absent. When PRISM recommends ap=2.0mm for
a roughing pass, and the part has a ±0.05mm tolerance on the final dimension, how many
finish passes are needed? What's the optimal stock-to-leave? If thermal growth shifts
Z by 15μm (R7-MS0 thermal_compensate), does that eat into the tolerance budget?

**What the roadmap should add:**

```
R3-MS0 AMENDMENT: Unit & Tolerance Intelligence
  1. Every action that accepts dimensional input must accept unit: 'mm' | 'inch'
  2. Every output must include the unit used
  3. Add action: tolerance_budget(part_tolerance, operations[])
     → allocate tolerance across roughing/semi/finish passes
     → account for thermal growth, tool wear, machine accuracy
     → output: per-pass stock-to-leave with tolerance consumed
  4. Wire extracted/units/ (3 files) for unit conversion
  5. Wire PRISM_UNIT_CONVERTER skill
```

---

## FINDING 12: KNOWLEDGE QUERY ENGINE IS UNDERWIRED

**The problem:** KnowledgeQueryEngine.ts (28KB) exists and has a cross_query action.
But it only searches registries. It doesn't search:
- The 99 skills (8.5KB+ of manufacturing knowledge each)
- The 220 MIT course teachings
- The 44 manufacturer catalogs (once extracted)
- The accumulated job history (once R7-MS3 builds it)

**A user asking "what's the best approach for machining Inconel 718?" should get answers
synthesized from:** material properties (MaterialRegistry), recommended strategies
(ToolpathStrategyRegistry), cutting parameters (FormulaRegistry), relevant skills
(prism-cutting-mechanics, prism-cam-strategies), MIT course knowledge (2.810 Manufacturing
Processes), and accumulated job outcomes.

**What the roadmap should add:**

```
R3-MS3 AMENDMENT: Unified Knowledge Search
  Expand cross_query to search:
    1. All registries (current)
    2. Skill content (SKILL.md files → index on load)
    3. Formula registry (match by category + inputs)
    4. Engine registry (match by physics domain)
    5. Job history (match by material + operation)
  Return results ranked by relevance with source attribution
```

---

## REVISED PHASE AMENDMENTS SUMMARY

| Finding | Affects | Amendment | New Lines |
|---------|---------|-----------|-----------|
| F1: Formula Registry | R3-MS0 | Add formula_discover, formula_compare | ~200 |
| F2: Coupled Physics | R7-MS0 | Wire HYBRID formulas, unified model | ~400 |
| F3: Wiring Registries | All phases | Add wiring lookup to implementation protocol | ~50 |
| F4: Strategy Intelligence | R3-MS2 | Add strategy_compare, strategy_chain, strategy_explain | ~250 |
| F5: Data Validation | R1-MS4 | New DataValidationEngine.ts | ~300 |
| F6: Sustainability | R7-MS1 | Add sustainability metrics to optimization output | ~150 |
| F7: Calc Regression | R2-MS1 | Create benchmark dataset + regression test suite | ~200 |
| F8: Formula Coverage | R3/R7 | Wire 162 uncovered formulas across phases | ~400 |
| F9: Controller Intel | R3-MS3 | Add alarm_pattern, controller_validate, capabilities | ~250 |
| F10: API Layer | R4-MS0 | Create REST API wrapper for key actions | ~500 |
| F11: Units/Tolerance | R3-MS0 | Unit handling + tolerance_budget action | ~200 |
| F12: Knowledge Query | R3-MS3 | Expand cross_query to all knowledge sources | ~150 |
| **TOTAL** | | | **~3,050** |

---

## NEW HOOKS REQUIRED BY FINDINGS

```
HOOK: formula_registry_consistency
  TRIGGER: post-load on FormulaRegistry
  PURPOSE: Verify all registered formulas have corresponding engine implementations
  MODE: warning | PRIORITY: high

HOOK: coupled_physics_convergence
  TRIGGER: post-calc on unified machining model
  PURPOSE: Verify coupled physics iteration converges (no oscillation/divergence)
  MODE: blocking | PRIORITY: critical

HOOK: data_validation_gate
  TRIGGER: post-load on all registries
  PURPOSE: Run physical bounds + cross-reference checks
  MODE: blocking | PRIORITY: critical

HOOK: sustainability_bounds
  TRIGGER: post-calc on sustainability metrics
  PURPOSE: Verify energy/CO2 estimates are in realistic range
  MODE: warning | PRIORITY: normal

HOOK: calc_regression_gate
  TRIGGER: post-build
  PURPOSE: Run golden dataset benchmarks
  MODE: blocking | PRIORITY: critical

HOOK: api_rate_limit
  TRIGGER: pre-calc on API requests
  PURPOSE: Enforce per-key rate limits
  MODE: blocking | PRIORITY: high

HOOK: unit_consistency_check
  TRIGGER: pre-calc on any dimensional input
  PURPOSE: Detect mixed units (some inputs mm, some inch)
  MODE: blocking | PRIORITY: critical
```

**Adds 7 hooks → total planned: 159 (129 existing + 23 from SKILLS_SCRIPTS_HOOKS_PLAN + 7 new)**

---

## NEW SKILLS REQUIRED BY FINDINGS

```
SKILL: prism-formula-navigator
  PURPOSE: Help Claude discover and explain the 490 registered formulas
  TRIGGERS: "what formula should I use", "how is force calculated", "explain Taylor"

SKILL: prism-sustainability-advisor
  PURPOSE: Help Claude calculate and explain environmental impact
  TRIGGERS: "carbon footprint", "energy consumption", "eco-friendly machining"

SKILL: prism-tolerance-advisor
  PURPOSE: Help Claude with tolerance analysis and stack-up
  TRIGGERS: "tolerance budget", "stock-to-leave", "how many finish passes"

SKILL: prism-controller-expert
  PURPOSE: Help Claude diagnose alarms and validate G-code per controller family
  TRIGGERS: "alarm", "error code", "FANUC G-code", "Siemens cycle"
```

**Adds 4 skills → total planned: 14 (10 from SKILLS_SCRIPTS_HOOKS_PLAN + 4 new)**

---

## PRIORITY RANKING OF ALL 12 FINDINGS

By impact on end-user value × implementation effort:

| Rank | Finding | Impact | Effort | Rationale |
|------|---------|--------|--------|-----------|
| 1 | F5: Data Validation | CRITICAL | M | Bad data = bad parameters = broken tools. Must be first. |
| 2 | F7: Calc Regression | CRITICAL | S | Without this, any code change can silently break safety. |
| 3 | F2: Coupled Physics | HIGH | L | This is THE differentiator. Nobody else does coupled models. |
| 4 | F11: Units/Tolerance | HIGH | M | US market can't use a metric-only tool. Tolerance = quality. |
| 5 | F1: Formula Registry | HIGH | M | Unlocks 490 formulas from dead catalog to live system. |
| 6 | F4: Strategy Intel | HIGH | M | 697 strategies are useless if you can only select, not compare. |
| 7 | F9: Controller Intel | MEDIUM | M | Alarm diagnosis is a daily pain point for every machinist. |
| 8 | F12: Knowledge Query | MEDIUM | S | Makes PRISM's accumulated knowledge actually findable. |
| 9 | F6: Sustainability | MEDIUM | S | Growing regulatory requirement, easy to add to existing calcs. |
| 10 | F3: Wiring Registries | LOW | XS | Documentation improvement, not code change. |
| 11 | F10: API Layer | HIGH | L | Needed for R4/R9 but not until those phases start. |
| 12 | F8: Formula Coverage | MEDIUM | XL | 162 formulas is a lot of wiring — do incrementally. |

---

## EXECUTION RECOMMENDATION

**Immediate (add to R1):** F5 (Data Validation) — insert as R1-MS4.5 between registry
loading and enrichment. Cannot load 3,518 materials without validating them first.

**Immediate (add to R2):** F7 (Calc Regression Suite) — insert as R2-MS1.5. Create the
golden dataset of 50+ known-good results. This protects everything built afterward.

**Integrate into R3:** F1 (Formula Registry), F4 (Strategy Intelligence), F9 (Controller
Intelligence), F11 (Units/Tolerance), F12 (Knowledge Query).

**Integrate into R7:** F2 (Coupled Physics), F6 (Sustainability), F8 (Formula Coverage).

**Integrate into R4:** F10 (API Layer).

**Apply everywhere:** F3 (Wiring Registries) — add one line to ROADMAP_INSTRUCTIONS.md.

---

*These findings don't invalidate the existing roadmap. They fill the gaps between
"we planned features" and "we planned a system." The features are excellent.
The system thinking — data validation, regression testing, formula lifecycle,
coupled physics, unit handling — is what makes the difference between a prototype
that demos well and a platform that manufacturers trust with their livelihood.*
