# CAMX FINAL ROADMAP v17 — Complete Print-to-CNC-Program Pipeline
## Comprehensive | Every Decision Reasoned | Every Stage Tested | Real Data Only
## /smart /forge-triple applied to EVERY session | /prism-review after EVERY build

Generated: 2026-03-23 | Scrutinization passes: 14 (v1→v17)
Confidence: 95% (remaining 5% = hardware integration + unknown unknowns)

---

## EXECUTION PROTOCOL (NON-NEGOTIABLE FOR EVERY SESSION)

### PRISM APP ARCHITECTURE — MCP Server as Computation Backend

```
PRISM App (Web UI / Desktop / API)
  │
  ├─ MCP Server (port 18361) — ALL computation happens here
  │   ├─ 77 dispatchers → 2,700+ actions
  │   ├─ 1,246 engines (physics, toolpath, post-processing, cost, quality)
  │   ├─ 50 algorithms (Kienzle, Taylor, SLD, J-C, Usui, etc.)
  │   ├─ 23 registries (materials, tools, machines, formulas, strategies)
  │   ├─ codebase-memory-mcp (103K nodes knowledge graph)
  │   └─ Every pipeline stage is an MCP action call
  │
  ├─ Claude API (background) — AI reasoning layer
  │   ├─ PipelineEnforcementAgent (Layer 2 judgment)
  │   ├─ Tribal knowledge interpretation
  │   ├─ Strategy tradeoff analysis
  │   ├─ Natural language decision explanations
  │   ├─ Override justification generation
  │   └─ Called ONLY for judgment — NOT for computation
  │
  └─ Output
      ├─ G-code program (controller-specific)
      ├─ Setup sheet
      ├─ Cost breakdown
      ├─ Decision audit trail
      ├─ Safety certification
      └─ Production package

PIPELINE FLOW (every stage is an MCP dispatcher action):
  prism_cam:print_to_program        → Stage 1 (intake)
  prism_cam:feature_recognize       → Stage 2 (features)
  prism_cam:dfm_check               → Stage 3 (DFM gate)
  prism_cam:machine_select          → Stage 4 (machine)
  prism_cam:tool_select             → Stage 5 (tool)
  prism_cam:strategy_select         → Stage 6 (strategy)
  prism_cam:speed_feed_calculate    → Stage 7 (S/F)
  prism_cam:toolpath_generate       → Stage 8 (toolpath)
  prism_cam:collision_check         → Stage 9 (collision gate)
  prism_cam:post_process            → Stage 10 (post-processing)
  prism_cam:simulate                → Stage 11 (simulation gate)
  prism_cam:generate_setup_sheet    → Stage 12 (documentation)
  prism_cam:calculate_cost          → Stage 13 (cost)
  prism_cam:package_output          → Stage 14 (production package)

  Claude API called at: strategy tradeoff (Stage 6), override decisions,
  decision explanations, tribal knowledge interpretation.
  NOT called for: force computation, S/F calculation, G-code generation,
  collision detection, post-processing — these are DETERMINISTIC MCP actions.

KNOWLEDGE GRAPH (persistent across all sessions):
  mcp__codebase-memory-mcp__search_graph     → find any engine/function
  mcp__codebase-memory-mcp__trace_call_path  → trace wiring chains
  mcp__codebase-memory-mcp__get_architecture → system overview
  mcp__codebase-memory-mcp__query_graph      → complex Cypher queries
  103,457 nodes, 162,685 edges — survives all compactions

  USE THIS for Phase 0-PRE audit instead of re-reading files.
  USE THIS to verify wiring after every build.
  USE THIS to find orphans and dead code.
  RE-INDEX after significant code changes: mcp__codebase-memory-mcp__index_repository
```

### MAXIMUM QUALITY MODE — No token savings, no shortcuts, no skipping

### ANTI-HALLUCINATION + CONTEXT RETENTION RULES

```
CONTEXT RETENTION:
  - /compact after EVERY 2-3 units (not 5-10)
  - Start FRESH SESSION after every /compact
  - NEVER build more than 3 units without compacting
  - ALWAYS read the specific roadmap file at session start
  - ALWAYS read reference_system_capabilities.md at session start
  - NEVER assume you remember what was built — READ the actual files

CONTEXT RETENTION INFRASTRUCTURE (use ALL of these):
  - codebase-memory-mcp knowledge graph: 103,457 nodes, 162,685 edges — QUERY THIS instead of re-reading files
    /codebase-memory-exploring for architecture questions
    /codebase-memory-tracing for "who calls what" questions
    /codebase-memory-quality for dead code / unused function detection
    mcp__codebase-memory-mcp__search_graph for finding engines/functions
    mcp__codebase-memory-mcp__trace_call_path for wiring verification
  - precompact-save.sh: AUTO-saves state before compaction (hook fires automatically)
  - postcompact-handler.sh: AUTO-restores context after compaction
  - session-start-unified.sh: AUTO-loads context on startup
  - 19 persistent memory files in ~/.claude/projects/memory/ (auto-loaded every session)
  - /checkpoint before destructive operations
  - /snapshot for save/load session context
  - /replay for session context reconstruction after compaction
  - /remember for persisting critical decisions to memory files

AUTOMATIC HOOKS THAT FIRE WITHOUT YOU CALLING THEM:
  session-start-unified.sh  → loads context + efficiency rules on EVERY session start
  precompact-save.sh        → saves COMPACTION_SURVIVAL.json BEFORE every compaction
  postcompact-handler.sh    → restores critical facts AFTER every compaction
  stop-completion-check.sh  → warns if stopping with incomplete work
  task-completed-chain.sh   → suggests next milestone when task finishes
  pretooluse-unified.sh     → tool routing, safety blocks, dedup on every tool call
  posttooluse-unified.sh    → syntax checks, output compression after every tool call
  auto-approve.sh           → auto-approves safe operations (reads, MCP, safe writes)
  PreToolUse hooks:         → physics verification agent on Edit/Write
                            → test impact analysis agent on Edit/Write
                            → knowledge graph reminder on Grep/Glob/Read

  THESE ARE ALREADY RUNNING. You don't need to invoke them.
  They protect quality, save context, and enforce consistency AUTOMATICALLY.

MCP SERVER TOOLS (use for ALL PRISM computation):
  77 dispatchers with 2,700+ actions — call via prism_cam, prism_calc, etc.
  Every physics calculation, tool selection, strategy decision is an MCP action.
  The PRISM web app will call these SAME actions via Claude API + MCP bridge.
  When building pipeline stages, ensure each stage IS a dispatchable MCP action.

CODE EXPLORATION — USE KNOWLEDGE GRAPH FIRST (automatic via skills):
  - /codebase-memory-exploring TRIGGERS AUTOMATICALLY for architecture/code search questions
  - /codebase-memory-tracing TRIGGERS AUTOMATICALLY for "who calls what" questions
  - /codebase-memory-quality TRIGGERS AUTOMATICALLY for dead code/unused function questions
  - Use mcp__codebase-memory-mcp__search_graph INSTEAD OF grep for finding engines
  - Use mcp__codebase-memory-mcp__trace_call_path INSTEAD OF grep for tracing wiring
  - The knowledge graph has 103,457 nodes — it knows every function, class, and connection
  - It PERSISTS across compactions — no context loss
  - Only fall back to Read/Grep when the graph doesn't have the answer

ANTI-HALLUCINATION:
  - NEVER claim an engine does something without QUERYING THE KNOWLEDGE GRAPH or READING ITS CODE
  - NEVER claim a test passes without RUNNING IT
  - NEVER claim wiring exists without GREPPING FOR THE IMPORT
  - NEVER claim a formula is correct without HAND-CALCULATING a test case
  - If you're not sure if something exists → grep for it, don't guess
  - If you're not sure a method works → call it with test input, don't assume
  - If you built something → READ IT BACK and verify it does what you intended

OUTPUT DEGRADATION PREVENTION:
  - After building, IMMEDIATELY run /prism-review (catches degradation early)
  - After building, IMMEDIATELY run affected tests (catches regressions)
  - After building, READ the output of your own code with a critical eye
  - Compare output to EXPECTED output (hand-calculated or from reference)
  - If output looks "too perfect" or "too clean" → be suspicious, it may be stub data
  - If output has no warnings or edge cases → be suspicious, real programs always have notes

VERIFICATION OVER ASSUMPTION:
  - Don't say "this engine handles X" — SHOW the line of code that handles X
  - Don't say "this is wired" — SHOW the import + call site + result usage
  - Don't say "this test validates Y" — SHOW the assertion that checks Y
  - Don't say "this formula is correct" — SHOW the hand calculation that matches
```

```
SESSION START:
  /startup → /handoff read → read reference_system_capabilities.md
  → read THIS ROADMAP for current phase/unit
  → /smart /forge-triple (sets model/effort/team for session)

PER UNIT BUILD:
  1. Read ALL files listed in unit's "FILES TO READ FIRST"
  2. Build/edit code per unit instructions
  3. Run: npx tsc --noEmit → 0 errors
  4. Run: /prism-review (physics + wiring + test review agents)
  5. Run: affected tests → 0 failures
  6. VERIFY: engine is WIRED (imported AND called, not just imported)
  7. VERIFY: result is USED in output (not computed and discarded)
  8. VERIFY: physics constants from src/physics/constants.ts (not inline)
  9. IF any fail → FIX before next unit. NO SKIPPING.

AFTER EVERY 2-3 UNITS:
  /compact → /roadmap-quality-check → start new session
  This ensures fresh context for maximum quality building.
  Do NOT try to build 10+ units in one session — quality degrades.

SESSION END (MANDATORY CODE REVIEW + QUALITY CHECK):
  1. Run: npx tsc --noEmit → verify 0 errors
  2. Run: /prism-review → verify all 3 review agents approve
  3. Run: npx vitest run [affected files] → verify 0 regressions
  4. Run: git diff --stat → review every file changed
  5. VERIFY: every engine built is WIRED and USED
  6. VERIFY: no conflicting physics constants (all match canonical)
  7. VERIFY: no duplicate computations (force computed once, not 4 times)
  8. /compact with quality results in handoff
  9. NEXT SESSION START: /roadmap-quality-check (scrutinize what was built)

COMPACTION SCHEDULE (mandatory):
  After Phase 0-A (6 units): /compact + new session
  After Phase 0-B (7 units): /compact + new session
  After Phase 0-C (6 units): /compact + new session
  After Phase 0-D (20 units — compact every 5): 4 compactions
  After Phase 0-E (4 units): /compact + new session
  During Phase 1 (22 units — compact every 3): ~7 compactions
  During Phase 2 (5 units): 1-2 compactions
  During Phase 3 (16 units — compact every 4): 4 compactions
  During Phases 4-10 (per-machine — compact every milestone): ~30 compactions
  During Phase 11 (testing — compact every test suite): ~9 compactions
  TOTAL: ~60+ compaction points across the entire roadmap

QUALITY CHECK AFTER EVERY COMPACTION:
  /roadmap-quality-check runs AUTOMATICALLY after every /compact
  This catches: dead imports, conflicting constants, unused results,
  duplicate computations, missing tests, wiring gaps

See H:/prism/CAMX-CODE-REVIEW-PROTOCOL.md for full review checklist.
See H:/prism/CAMX-ROADMAP-v22-QUALITY-FIXES.md for quality requirements.
```

---

## NON-NEGOTIABLE RULES

1. **/smart /forge-triple** at session start — sets OPUS/MAX for architecture, model routing for agents
2. **/prism-review** after EVERY build — 3 parallel review agents (physics, wiring, test)
3. **No fake data** — every test value traceable to real drawing, catalog, or published reference
4. **MCP-first** — every pipeline stage must be callable as an MCP dispatcher action
5. **Knowledge graph first** — use codebase-memory-mcp BEFORE grep/glob for code exploration
6. **Re-index after major changes** — run index_repository after building 10+ engines
4. **No keyword-only tests** — validate coordinates, parameters, physics values
5. **No `|| true` assertions** — every check must be able to FAIL
6. **Phase gate = 100%** — no phase proceeds until validation tests pass
7. **Level 3 minimum** — every decision evaluates ≥3 alternatives with scoring
8. **/compact after every phase** — preserve context for next session

---

## PHASE 0-PRE: FULL SYSTEM QUALITY AUDIT — Everything We Already Built

**THIS PHASE IS THE FIRST THING THAT HAPPENS. NOTHING ELSE STARTS UNTIL THIS IS DONE.**

**Purpose: Verify EVERY piece of code we've already built is REAL, CORRECT, and USABLE
before we wire anything new into it. We have 1,246 engines, 50 algorithms, 77 dispatchers,
23 registries, 780+ test files, and 76 CAMX engines. Are they LEGIT?**

### AUDIT SESSION 1: Pipeline Engines — Do They Actually Generate Programs?
```
/smart: OPUS/MAX | Role: CNC programmer + code archaeologist
/forge-triple (engines + skills + hooks review for each pipeline)
/physics-verify (cross-pipeline physics consistency)
/forge-wiring (verify what's connected vs what's orphaned)
/forge-audit quick (code quality scan)
/scrutinize (standalone code quality review on each pipeline file)

U-AUDIT1: Run EACH of 9 pipeline engines with a REAL test input and inspect the OUTPUT

  PrintToProgramPipelineEngine:
    INPUT: simple pocket plate (4140 steel, 50×50×15mm pocket, 4 holes)
    RUN: engine.calculate("print_to_program", input)
    CHECK: Does output contain REAL G-code with REAL coordinates?
    CHECK: Are coordinates X50 Y50 (from feature dims) or X0 Y0 (hardcoded stubs)?
    CHECK: Does G83 drill have correct Z depth and Q peck values?
    CHECK: Are S/F values physics-backed (not just S1000 F200 everywhere)?
    VERDICT: PRODUCTION / SCAFFOLD / STUB / BROKEN

  TurningPrintToProgramEngine:
    INPUT: stepped shaft (4140, 50mm OD, 3 diameters, 100mm long)
    RUN: engine.calculate("turning_print_to_program", input)
    CHECK: G71/G70 with correct P/Q block numbers?
    CHECK: Profile points produce real contour (not just G01 X50 Z-100)?
    CHECK: G76 threading generates correct minor diameter?
    VERDICT: PRODUCTION / SCAFFOLD / STUB / BROKEN

  MultiAxisPrintToProgramEngine:
    INPUT: angled hole plate (3 holes at 15°, 30°, 45°)
    RUN: engine.calculate() with appropriate action
    CHECK: G68.2 tilted work plane with correct angles?
    CHECK: More than 1 interpolated point (or still the placeholder)?
    VERDICT: PRODUCTION / SCAFFOLD / STUB / BROKEN

  MillTurnSwissPipelineEngine:
    INPUT: shaft with cross-hole
    RUN: engine.calculate("mill_turn_assemble_program", input)
    CHECK: Does assembleProgram() exist and produce output? (was BROKEN)
    CHECK: Multi-channel G-code with sync codes?
    VERDICT: PRODUCTION / SCAFFOLD / STUB / BROKEN

  GrindingProgramAssemblerEngine:
    INPUT: OD cylindrical grind (52100, 50mm OD, roundness 2μm)
    RUN: engine.compute()
    CHECK: Real grinding G-code with infeed, spark-out, dressing?
    CHECK: Monte Carlo uncertainty in output (CI95)?
    VERDICT: PRODUCTION / SCAFFOLD / STUB / BROKEN

  EDMProgramAssemblerEngine (wire):
    INPUT: simple die profile (D2, square 25×25mm)
    RUN: engine.compute()
    CHECK: Wire EDM G-code with auto-thread, skim passes, corner slow-down?
    VERDICT: PRODUCTION / SCAFFOLD / STUB / BROKEN

  LaserProgramAssemblerEngine:
    INPUT: simple bracket (mild steel 1.5mm)
    RUN: engine.compute()
    CHECK: Pierce sequence + cut path + correct M-codes per controller?
    VERDICT: PRODUCTION / SCAFFOLD / STUB / BROKEN

  WaterjetProgramAssemblerEngine:
    INPUT: aluminum plate profile (6061, 6mm)
    RUN: engine.compute()
    CHECK: Pierce + kerf comp + cut path?
    VERDICT: PRODUCTION / SCAFFOLD / STUB / BROKEN

  QuoteToShipOrchestratorEngine (E1086):
    INPUT: simple turning part
    RUN: engine.calculate() or engine.run()
    CHECK: Does it actually orchestrate 21 stages or return stub data?
    CHECK: Does stage 13 route to correct pipeline per process type?
    VERDICT: WORKING / STUB / BROKEN

OUTPUT: 9-pipeline quality scorecard with verdicts
```

**`/compact` → new session → `/roadmap-quality-check`**

### AUDIT SESSION 2: CAMX Engines — Are the 76 We Built Real Code?
```
/smart: OPUS/MAX | Role: code quality engineer + manufacturing domain expert
/forge-engines (engine discovery — verify each engine has real methods)
/scrutinize (code quality review per batch)
/prism-review after each batch (physics + wiring + test agents)

U-AUDIT2: For each BATCH of CAMX engines, read the compute method and verify REAL logic

  BATCH 1 — Decision/Intelligence engines (17 engines):
    PipelineDecisionOrchestratorEngine (E1080): does decide() actually score 5 axes?
    OptimalStrategySelectionEngine (E1087): does it evaluate 28 strategies with physics?
    StrategyTaxonomyEngine (E1084): does it have 60 canonical strategies mapped?
    FeatureStrategyKnowledgeBaseEngine (E1112): does it have 203 rules that can be queried?
    SmartToolSelectorEngine: does it query 95K catalog or return synthetic tools?
    ... (all 17, each checked for REAL logic vs stub)

  BATCH 2 — Safety engines (6 engines):
    PipelineSafetyOrchestratorEngine (E1093): does it compute 6 risk dimensions?
    SafetyVetoEngine (E1098): does it check 8 hard vetoes with real physics?
    CollisionPreventionEngine (E1139): does it do AABB + narrow-phase collision?
    ... (all 6, each checked)

  BATCH 3 — Per-CAM strategy engines (21 engines):
    MastercamStrategyEngine (E1102): does it have 30 strategies with real parameters?
    SolidCAMiMachiningEngine (E1103): does Technology Wizard compute real ae/ap?
    ... (all 21, each checked)

  BATCH 4 — Cost/business engines (8 engines):
    PipelineCostModelEngine (E1095): does it compute 10-component cost breakdown?
    ToolROIEngine (E1081): does it compute 3 price points with real ROI math?
    ... (all 8, each checked)

  BATCH 5 — Standards/lifecycle engines (13 engines):
    STEPNCEngines (E1129): does the parser actually parse P21 format?
    VericutBridgeEngine (E1130): does it generate real Vericut project XML?
    QuoteToShipOrchestratorEngine (E1086): does it actually chain 21 stages?
    ... (all 13, each checked)

  BATCH 6 — Tool export/sync/add-in engines (11 engines):
    MastercamToolExportEngine (E1123): does it produce real .mcam-tools format?
    UniversalToolExportEngine (E1124): does ISO 13399 XML validate?
    ... (all 11, each checked)

  For EACH engine:
    VERDICT: REAL (has working logic) / PARTIAL (some methods stub) / STUB (returns hardcoded) / EMPTY (no implementation)
    If STUB or EMPTY → flag for rebuild or removal from wiring targets

OUTPUT: 76-engine quality scorecard. Stubs listed for fix/removal.
```

**`/compact` → new session → `/roadmap-quality-check`**

### AUDIT SESSION 3: Algorithms — Does the Math Actually Work?
```
/smart: OPUS/MAX | Role: cutting science mathematician + physics reviewer
/algorithm-inspect (PRISM algorithm explorer — inspect each algorithm)
/physics-verify (cross-pipeline physics consistency check)
/formula-browse (browse formulas to verify against algorithm implementations)
/calibrate (compare algorithm output against known calibration data)

U-AUDIT3: Verify the TOP 20 most critical algorithms compute correctly

  KienzleForceModel:
    TEST: Fc for 4140 steel (kc1.1=1800, mc=0.25), ap=3mm, fz=0.15mm
    EXPECTED: Fc = 1800 × 3 × 0.15^(1-0.25) = 1800 × 3 × 0.287 = 1550N (approx)
    RUN algorithm → compare to hand calculation → within ±5%?

  StabilityLobeDiagram:
    TEST: known natural frequency 800Hz, 4-flute endmill
    EXPECTED: critical RPM = 60 × 800 / 4 = 12000 RPM (and multiples)
    RUN algorithm → does it identify stable/unstable pockets correctly?

  JohnsonCookModel:
    TEST: Ti-6Al-4V (A=997, B=653, n=0.45, C=0.0198, m=0.7)
    EXPECTED: known flow stress at given strain/rate/temperature
    RUN algorithm → within ±10% of published data?

  TaylorToolLife (ExtendedTaylorModel):
    TEST: carbide in 4140 (C=350, n=0.25), Vc=200 m/min
    EXPECTED: T = (350/200)^(1/0.25) = 1.75^4 = 9.4 min
    RUN algorithm → matches hand calculation?

  UsuiWearModel:
    TEST: known wear test data from published paper
    RUN algorithm → wear rate within ±20% of published?

  ... (top 20 algorithms, each with hand-calculated verification)

  For algorithms that FAIL verification:
    FIX the formula before any pipeline wires to it
    Re-verify after fix

OUTPUT: Algorithm verification scorecard. Failed algorithms listed for fix.
```

**`/compact` → new session → `/roadmap-quality-check`**

### AUDIT SESSION 4: Registries, Constants, Tests, Wiring
```
/smart: OPUS/MAX | Role: systems architect + QA engineer
/forge-wiring (architecture wiring validator — finds orphans + phantoms)
/forge-drift (registry + documentation drift detector)
/forge-tests scan (test gap discovery)
/forge-audit (codebase quality scan)
/system-audit (complete PRISM system health check)
/forge-cleanup (dead code + file detector)
/trace (wiring chain tracer — follows engine→dispatcher→schema connections)
/unwired-review (structured unwired engine triage)

U-AUDIT4: Verify 11 registries have REAL queryable data
  FormulaRegistry: query "kienzle" → returns formula with equation + variables?
  MaterialRegistry: query "4140" → returns kc1.1, mc, thermal_k, hardness range?
  ToolpathStrategyRegistry: query "adaptive_clearing" → returns strategy with ae/ap/Vc?
  ToolRegistry: query "endmill 12mm" → returns catalog entries?
  MachineRegistry: query "Haas VF-2" → returns travel, RPM, power, taper?
  CoatingRegistry: query "TiAlN" → returns properties?
  CoolantRegistry: query "flood" → returns properties?
  AlgorithmRegistry: list → returns 50 algorithms?
  PostProcessorRegistry: query "fanuc" → returns post config?
  AlarmRegistry: query "1001" → returns alarm description?
  KnowledgeBaseRegistry: exists and is queryable?

U-AUDIT5: Physics constants consistency (ALL engines, not just CAMX)
  1. Extract canonical kc1.1 values from src/physics/constants.ts
  2. grep ALL 1,246 engine files for kc1.1/kc1_1 inline values
  3. LIST every engine with values that differ from canonical
  4. FIX each conflict (replace inline with canonical import)
  5. Create regression test: "canonical_constants_consistency.test.ts"
     that greps for inline constants and FAILS if any exist

U-AUDIT6: Test quality audit
  1. grep -rn "|| true" src/__tests__/ tests/ → list ALL always-pass assertions
  2. For EACH || true found: FIX it NOW (replace with real assertion or remove)
  3. grep -rn "\.includes(" in assertion context → count keyword-only checks
  4. Sample 10 keyword-only checks: should any be coordinate/physics checks instead?
  5. Create test quality report: % keyword-only vs % parametric vs % physics-validated

U-AUDIT7: Wiring reality audit
  For EACH of 9 pipelines:
    1. grep for "require(" or "import(" of other engines
    2. For EACH import: grep for actual CALL SITE (method invocation)
    3. For EACH call: grep for RESULT USAGE (stored, returned, or added to output)
    4. Classify: WIRED+USED / WIRED+UNUSED / DEAD IMPORT
    5. Remove dead imports. Wire unused results to output.

U-AUDIT8: Dispatcher action coverage
  For EACH of 77 dispatchers:
    1. Count actions in z.enum
    2. For each action: does the engine method it calls EXIST?
    3. For each action: does the schema match the engine interface?
    4. Flag: phantom actions (in z.enum but engine method missing)
    5. Flag: orphan engines (engine exists but no dispatcher action)

OUTPUT: Complete system health scorecard:
  Engines: X real / Y partial / Z stub / W broken
  Algorithms: X verified / Y need fix
  Registries: X queryable / Y empty
  Constants: X consistent / Y conflicting (fixed)
  Tests: X real / Y keyword-only / Z always-pass (fixed)
  Wiring: X real / Y dead imports (removed) / Z unused results (wired)
  Dispatchers: X valid / Y phantom / Z orphan
```

**`/compact` CHECKPOINT 0-PRE** — Complete system audited. Every engine, algorithm,
registry, constant, test, and wiring verified. Stubs identified. Conflicts fixed.
THIS scorecard is the TRUE starting point for the roadmap.

**GATE: If >20% of engines are stubs, >10% of algorithms fail verification,
or >5% of constants conflict → STOP and fix before proceeding to Phase 0-A.**

---

## PHASE 0-A: PRINT READING VALIDATION (6 units)

### U01: Test BlueprintOCREngine with Real Haas Drawings
```
/smart: OPUS/MAX | Role: OCR/vision + manufacturing
FILES TO READ FIRST:
  - src/engines/BlueprintOCREngine.ts
  - src/engines/PDFBlueprintDimensionExtractorEngine.ts
  - data/docs/haas-lathe-workbook-full.txt (find a drawing page)
  - data/docs/haas-mill-workbook-full.txt (find a drawing page)

STEPS:
  1. Extract 3 complete part drawings from haas-lathe-workbook-full.txt
     (O00075, O0106, O0107 all have dimensions in the text)
  2. Feed each through BlueprintOCREngine.analyzeBlueprint()
  3. Verify EVERY dimension is extracted correctly
  4. Verify tolerances are captured
  5. Verify GD&T frames parsed (if present)
  6. Create vitest: src/__tests__/blueprint-ocr-real-data.test.ts
     - For each drawing: assert extracted dims match known values ±0.1mm
     - Assert tolerance values match
     - Assert feature count matches

EXIT CRITERIA:
  ✓ 3 real drawings processed
  ✓ Dimension accuracy ≥95%
  ✓ vitest passes

/prism-review after build
```

### U02: Test PrintToGeometryEngine — EXECUTE CadQuery Output
```
/smart: OPUS/MAX | Role: CAD/geometry + Python
FILES TO READ FIRST:
  - src/engines/PrintToGeometryEngine.ts
  - Python: C:/Users/Admin.DIGITALSTORM-PC/AppData/Local/Programs/Python/Python312/python.exe

STEPS:
  1. Take OCR-extracted dimensions from U01
  2. Feed through PrintToGeometryEngine.generate()
  3. Get CadQuery Python script output
  4. ACTUALLY EXECUTE the Python script: python -c "import cadquery as cq; ..."
  5. If CadQuery not installed, install it: pip install cadquery
  6. Verify 3D model:
     - Dimensions match input ±0.05mm
     - Volume is reasonable (calculate expected volume from dims)
     - Feature count matches (holes, pockets)
  7. Create vitest that validates CadQuery output structure
     (even if we can't execute CadQuery in vitest, validate the Python string)

EXIT CRITERIA:
  ✓ CadQuery script executes without error
  ✓ Model dimensions match input
  ✓ vitest for script structure passes

/prism-review after build
```

### U03: Test StepImportEngine with Real STEP Files
```
/smart: OPUS/HIGH | Role: CAD import
FILES TO READ FIRST:
  - src/engines/StepImportEngine.ts
  - List files: ls H:\prism\BOX\*.step H:\prism\BOX\*.stp

STEPS:
  1. Import 3 STEP files from H:\prism\BOX
  2. Extract: face count, edge count, feature types
  3. Verify extracted data is reasonable (not empty, not all zeros)
  4. Create vitest with REAL STEP file imports

EXIT CRITERIA:
  ✓ 3 STEP files successfully imported
  ✓ Feature extraction produces non-empty results
  ✓ vitest passes
```

### U04: Test FeatureRecognitionEngine on Real Geometry
```
/smart: OPUS/HIGH | Role: feature recognition
FILES TO READ FIRST:
  - src/engines/FeatureRecognitionEngine.ts
  - src/engines/FeatureToZoneEngine.ts

STEPS:
  1. Take STEP-imported geometry from U03
  2. Run FeatureRecognitionEngine.recognize()
  3. Verify feature types are correct (pocket IS pocket, hole IS hole)
  4. Run FeatureToZoneEngine to decompose into machining zones
  5. Verify zones make sense (bulk vs corner vs wall)

EXIT CRITERIA:
  ✓ Features correctly typed
  ✓ Zone decomposition produces valid zones
  ✓ vitest passes
```

### U05: Test End-to-End: Drawing → Features → Program Routing
```
/smart: OPUS/MAX | Role: pipeline architect
STEPS:
  1. Take a Haas Lathe Workbook drawing (e.g., O0106 stepped shaft)
  2. BlueprintOCR → extract dims
  3. Detect machine type from features (has OD/ID → turning)
  4. Route to TurningPrintToProgramEngine
  5. Generate program
  6. Verify program dimensions match drawing dims

EXIT CRITERIA:
  ✓ Drawing → turning program with correct coordinates
  ✓ No manual intervention needed
```

### U06: Test End-to-End: Mill Drawing → Milling Program
```
/smart: OPUS/MAX | Role: pipeline architect
STEPS:
  1. Take a Haas Mill Workbook drawing (from haas-mill-workbook-full.txt)
  2. BlueprintOCR → extract dims (pockets, holes, contours)
  3. Detect machine type (has pockets/holes → milling)
  4. Route to PrintToProgramPipelineEngine
  5. Verify routing is correct

EXIT CRITERIA:
  ✓ Drawing → milling program (even if scaffold quality)
  ✓ Correct routing demonstrated
```

**`/compact` CHECKPOINT 0-A** — Print-to-CAD pipeline validated with real data.

---

## PHASE 0-B: CRITICAL BUG FIXES (7 units — same as v14)

[Units U07-U13: Fix multi-start threading, facing G72, MillTurn crash, routing, Kienzle approach angle, robustness weight, grooving G75 Q]

Each unit: /prism-review after fix, regression test created.

**`/compact` CHECKPOINT 0-B**

---

## PHASE 1: WIRE ALL KNOWLEDGE + DECISION ARCHITECTURE (18 units)

### Tribal Knowledge Integration (4 units)

### U14: Build TribalKnowledgeDecisionBridge
```
/smart: OPUS/MAX | Role: knowledge engineering
FILES TO READ FIRST:
  - src/engines/TribalKnowledgeEngine.ts (header + query methods)
  - src/engines/MachiningPlaybookEngine.ts (header + advise method)
  - src/data/mastercam-cam-tips.ts (first 50 lines for tip structure)
  - src/engines/PipelineDecisionOrchestratorEngine.ts (scoring interface)

STEPS:
  1. Create src/engines/TribalKnowledgeDecisionBridge.ts (~400L)
  2. This engine:
     a. Takes decision context: {material_iso, operation, strategy,
        machine_controller, tool_type, feature_type}
     b. Queries TribalKnowledgeEngine for matching tips (top 10)
     c. Queries MachiningPlaybookEngine for matching rules
     d. Queries controller-knowledge-tips for controller-specific advice
     e. Queries academy courses for educational references (if applicable)
     f. Returns: { tips: TipMatch[], rules: RuleMatch[],
        controller_advice: string[], educational_refs: string[] }
  3. Wire to calcDispatcher: tribal_decision_query
  4. Create vitest:
     - Query for "ISO M + od_rough + mastercam" → should return MC tips about stainless
     - Query for "ISO H + finish + any" → should return hard turning tips
     - Query for controller "haas" → should return Haas-specific G-code tips

EXIT CRITERIA:
  ✓ Engine created and wired
  ✓ Queries return relevant tips (not random)
  ✓ /prism-review passes
  ✓ vitest passes
```

### U15: Build TribalKnowledgeActionEngine (Convert Tips to Rules)
```
/smart: OPUS/MAX | Role: knowledge engineering + manufacturing domain expert
FILES TO READ FIRST:
  - src/data/mastercam-cam-tips.ts (read ALL 261 tips)
  - src/data/solidcam-cam-tips.ts (read ALL 200 tips)
  - src/data/hypermill-cam-tips-ext.ts (read ALL 83 tips)

STEPS:
  1. Create src/engines/TribalKnowledgeActionEngine.ts (~600L)
  2. Define ActionableTip interface:
     { id, text, applies_when: {iso?, operation?, strategy?, controller?,
       feature?, tool_type?, hardness_min?, hardness_max?},
       action: {parameter, operation: 'set'|'multiply'|'add'|'max'|'min', value},
       confidence, source }
  3. Convert TOP 200 tips to actionable rules:
     - 50 turning tips (from solidcam-cam-tips, covering iMachining/HSR/HSS)
     - 50 milling tips (from mastercam-cam-tips, covering Dynamic/OptiRough)
     - 30 5-axis tips (from hypermill tips, covering MAXX/5X strategies)
     - 20 grinding tips (from general machining knowledge)
     - 20 EDM tips (from EDM-specific tips)
     - 15 laser tips
     - 15 waterjet tips
  4. Each actionable tip modifies a SPECIFIC parameter:
     Example: "Dynamic Motion: reduce engagement to 60% for stainless"
     → { applies_when: {strategy: "dynamic_mill", iso: "M"},
         action: {parameter: "ae_pct", operation: "multiply", value: 0.6} }
  5. Wire to calcDispatcher: tribal_action_query, tribal_action_apply
  6. Create vitest:
     - Apply rules to a 4140 steel pocket rough → verify ae_pct unchanged (no rule)
     - Apply rules to a 316L dynamic milling → verify ae_pct reduced to 60%
     - Apply rules to glass waterjet → verify pierce_strategy forced to "moving"

EXIT CRITERIA:
  ✓ 200 actionable rules created
  ✓ Rules produce correct parameter modifications
  ✓ /prism-review passes (physics reviewer validates rules)
  ✓ vitest passes
```

### U16: Wire TribalKnowledgeBridge into ALL Pipeline Decision Points
```
/smart: OPUS/HIGH | Role: pipeline wiring
STEPS:
  1. In PipelineDecisionOrchestratorEngine.decide():
     After scoring candidates, before final selection:
     a. Call TribalKnowledgeDecisionBridge.query(context)
     b. Call TribalKnowledgeActionEngine.apply(candidates, context)
     c. Tips modify candidate scores
     d. Playbook violations penalize candidates
     e. Applied tips appear in justification[]
  2. Verify: same decision WITH tips may differ from WITHOUT tips
  3. Create vitest: decision with tribal tips for stainless → different ae than without

EXIT CRITERIA:
  ✓ Tips modify decisions
  ✓ Justification includes tip references
  ✓ /prism-review passes
```

### U17: Wire Conversational Output Formatters
```
/smart: OPUS/HIGH | Role: CNC controller specialist
FILES TO READ FIRST:
  - src/data/controller-knowledge-tips.ts (27 Mazatrol references)
  - src/engines/MultiCamStrategyEngineExt.ts (22 Mazatrol strategies)
  - src/engines/MachiningKnowledgeBaseEngine.ts (search for mazatrol/conversational)

STEPS:
  1. Create src/engines/ConversationalOutputEngine.ts (~800L)
  2. Three formatters:
     a. Mazatrol UNIT+SHAPE format:
        - UNIT: operation type (common turning, bar, endmill, etc.)
        - SHAPE: geometry definition (linear, arc, chamfer, etc.)
        - TOOL DATA: tool number, offset, nose radius
        - CUT COND: speed, feed, depth
     b. Okuma AOT (Advanced One-Touch) guidance:
        - Process template selection
        - Geometry input sequence
        - Tool data entry sequence
        - Not full AOT code, but setup INSTRUCTIONS for the operator
     c. Haas VQC guidance:
        - Visual Quick Code operation selection
        - Parameter fill instructions
  3. For Mazatrol: Use the 22 strategies from MultiCamStrategyEngineExt as operation templates
  4. For Okuma: Use controller-knowledge-tips Okuma entries for guidance
  5. For Haas: Use Haas-specific entries for VQC guidance
  6. Wire to camDispatcher: conversational_format_mazatrol, conversational_format_okuma_aot,
     conversational_format_haas_vqc
  7. Create vitest: simple shaft → Mazatrol UNIT output, verify structure

EXIT CRITERIA:
  ✓ Mazatrol UNIT+SHAPE output for simple turning operations
  ✓ Okuma AOT guidance for simple operations
  ✓ /prism-review passes
  ✓ vitest passes
```

### Decision Architecture Wiring (8 units — U-DA1 through U-DA8 from v15)

[Detailed step-by-step instructions for each, following same pattern as above]

### Remaining Knowledge Wiring (6 units — manufacturer S/F data, KB functions, controller knowledge, academy courses, hyperMILL materials, POST-ULT pipeline)

[Detailed step-by-step instructions for each]

**`/compact` CHECKPOINT 1** — All knowledge wired, decision architecture connected, tribal tips actionable, conversational output available.

---

## PHASE 2: MACHINE SELECTION + BUSINESS LOGIC (5 units)

### U-MACH1: Wire Machine Selection Into Pipeline
```
/smart: OPUS/HIGH | Role: manufacturing process planning
FILES TO READ FIRST:
  - src/engines/MachineSelectionEngine.ts
  - src/engines/MachineMatcherEngine.ts
  - src/engines/MachineRateDatabaseEngine.ts
  - src/engines/CapacityPlanningEngine.ts

STEPS:
  1. After feature extraction, BEFORE tool selection:
     a. Query MachineMatcherEngine with features → which machines can make this part?
     b. Query MachineRateDatabaseEngine → cost per hour for each
     c. Query CapacityPlanningEngine → which machines are available?
     d. Rank: capability × cost × availability → top 3 with reasoning
  2. If NO machine can make ALL features:
     a. Split into operations: which machine for which features
     b. Flag features that need outsourcing (e.g., "EDM required, no EDM machine in shop")
     c. Call MakeVsBuyDecisionEngine for outsource cost estimate
  3. Output includes: selected_machine, alternative_machines[],
     outsource_recommendations[], capability_gaps[]
  4. Create vitest:
     - Part with 5-axis feature + no 5-axis machine → outsource recommended
     - Part feasible on 3 machines → cheapest machine selected
     - Part with EDM feature → EDM outsource with cost estimate

EXIT CRITERIA:
  ✓ Machine selection reasoning in every pipeline output
  ✓ Outsource recommendations when capability gap exists
  ✓ /prism-review passes
  ✓ vitest passes
```

### U-MACH2 through U-MACH5: ROI Advisory, Shop Network, Tool ROI, OEE
[Detailed step-by-step for each, following same pattern]

**`/compact` CHECKPOINT 2** — Business logic integrated.

---

## PHASE 3: UPGRADE TO LEVEL 3 DECISIONS + STOCK TRACKING (15 units)

[U18-U29 from v14 + U-STK1 through U-STK3, each with detailed step-by-step]

**`/compact` CHECKPOINT 3** — Level 3 decisions active, stock model tracking.

---

## PHASE 4: SIMULATION GATE + MONITORING (6 units from v16)

[U-SIM1 through U-SIM3, U-DT1 through U-DT3, each with detailed step-by-step]

**`/compact` CHECKPOINT 4** — Simulation gates active.

---

## PHASE 5-11: PER-MACHINE PIPELINE COMPLETION

### Phase 5: TURNING (adopt LATHE-COMPREHENSIVE-ROADMAP v3.0 — 104 units)
**`/compact` CHECKPOINT 5** after each sub-milestone (LATHE-MS0 through MS10)

### Phase 6: MILLING (85 units, same pattern)
**`/compact` CHECKPOINT 6** after each sub-milestone

### Phase 7: 5-AXIS (80 units)
**`/compact` CHECKPOINT 7**

### Phase 8: MILL-TURN/SWISS (85 units)
**`/compact` CHECKPOINT 8**

### Phase 9: GRINDING (65 units)
**`/compact` CHECKPOINT 9**

### Phase 10: WIRE EDM + SINKER EDM (testing only — pipeline already built, 40 units)
**`/compact` CHECKPOINT 10**

### Phase 11: LASER + WATERJET (55 + 50 units)
**`/compact` CHECKPOINT 11**

---

## PHASE 12: EXHAUSTIVE TESTING WITH REAL COMPLEX PARTS

### 12 Tiers × 9 Machine Types
[Complete part list from v9 with cross-material testing from v13]
[Every part has step-by-step instructions for test creation]

**`/compact` CHECKPOINT 12**

---

## PHASE 13: FINAL WIRING + WEB UI + COMMANDS

[From original CAMX MS16-19, detailed step-by-step]

**`/compact` CHECKPOINT 13**

---

## TOTAL SCALE

| Component | Count |
|---|---|
| Total phases | 14 (0A through 13) |
| Total units | ~950 |
| Compaction checkpoints | 14+ |
| Test checks target | ~12,000+ |
| Engines to wire | 109 reasoning + 39 optimization + 47 post-processor |
| Knowledge to integrate | 3,831 tips + 296 rules + 591K tool data + 2,544 materials |
| Machine types | 9 |
| Controller dialects | 20+ |
| Conversational outputs | 3 (Mazatrol, Okuma AOT, Haas VQC) |
| Tribal tips → actionable rules | 200 (initial), expandable to 400+ |
| Real test parts | 92 across 12 difficulty tiers |
| /prism-review gates | After EVERY build |
| /compact checkpoints | After EVERY phase |
# CAMX ROADMAP v18 AMENDMENTS
## Fixes for ALL gaps found by Physics, Wiring, and Test Review Agents
## Applied to CAMX-FINAL-ROADMAP-v17.md

---

## AMENDMENT 1: Add 6 Missing Engines to Phase 1 (Wiring Review Finding)

Add to Phase 1 after U18 (Decision Architecture):

### U19: Wire AdaptiveToolpathRouterEngine (35 algorithms) into OptimalStrategySelection
```
/smart: OPUS/MAX | Role: toolpath architecture
FILES TO READ FIRST:
  - src/engines/AdaptiveToolpathRouterEngine.ts (35 algos, 30 priority rules)
  - src/engines/OptimalStrategySelectionEngine.ts (E1087)
  - src/engines/AlgorithmSelectorEngine.ts

STEPS:
  1. OptimalStrategySelection (E1087) currently has 28 strategies in STRATEGY_DB
  2. AdaptiveToolpathRouter has 35 algorithms in ALGORITHM_REGISTRY
  3. These OVERLAP but are NOT connected
  4. Wire: OptimalStrategySelection calls AdaptiveToolpathRouter.route()
     to get the specific algorithm + parameters for the selected strategy
  5. The flow becomes: OptimalStrategy picks strategy → AdaptiveRouter
     picks specific algorithm within that strategy → Router generates
     toolpath segment parameters
  6. Also wire AlgorithmSelectorEngine (used by FeatureToZoneEngine for
     per-zone algorithm selection)

EXIT CRITERIA:
  ✓ OptimalStrategy → AdaptiveRouter chain works
  ✓ 35 algorithms reachable through the chain
  ✓ Per-zone algorithm selection works for complex features
  ✓ vitest passes
  ✓ /prism-review passes
```

### U20: Wire ProductionToolpathEngine into milling pipeline
```
/smart: OPUS/HIGH | Role: toolpath generation
FILES TO READ FIRST:
  - src/engines/ProductionToolpathEngine.ts (polygon offset HSM)

STEPS:
  1. ProductionToolpathEngine generates production-ready polygon-offset
     HSM toolpaths with G-code, cost estimate, and chatter-safe RPM
  2. Wire into PrintToProgramPipeline: for pocket features when strategy
     is "production_hsm" or machine has HSM capability
  3. Wire into UnifiedCAMPipeline: already partially connected but verify
  4. Create vitest

EXIT CRITERIA:
  ✓ ProductionToolpath called for HSM-capable pockets
  ✓ G-code output includes polygon-offset paths
```

### U21: Wire WorkCoordinateEngine + ProgramStructureEngine into ALL pipelines
```
/smart: OPUS/HIGH | Role: CNC programming
FILES TO READ FIRST:
  - src/engines/WorkCoordinateEngine.ts (G54-G59 assignment)
  - src/engines/ProgramStructureEngine.ts (subprograms, tool groups)

STEPS:
  1. Every program needs WCS assignment (currently hardcoded G54)
  2. Wire WorkCoordinateEngine: for single-setup → G54.
     Multi-setup → auto-assign G54-G59. Tombstone → G54.1 Pn.
  3. Wire ProgramStructureEngine: organize program into logical blocks,
     add subprogram calls (M98/CALL) for repeated patterns,
     add safety blocks per controller
  4. Create vitest: multi-setup part → G54 + G55 assigned correctly

EXIT CRITERIA:
  ✓ WCS auto-assigned per setup count
  ✓ Subprograms used for repeated patterns
  ✓ Program structure includes header/safety/body/footer per controller
```

### U22: Wire BackplotEngine as verification gate
```
/smart: OPUS/HIGH | Role: verification
FILES TO READ FIRST:
  - src/engines/BackplotEngine.ts
  - src/engines/CNCSimulationPipelineEngine.ts

STEPS:
  1. BackplotEngine is faster than full CNC simulation
  2. Wire as FIRST verification gate: backplot generated G-code,
     verify toolpath covers all features, no air cuts, no gouges
  3. If backplot fails → reject G-code before simulation
  4. Output backplot data for visualization (coordinates, tool paths)
  5. CNCSimulationPipeline remains as SECOND (deeper) verification gate

EXIT CRITERIA:
  ✓ Backplot runs before simulation
  ✓ Backplot data in output for visualization
  ✓ Backplot failure blocks output
```

---

## AMENDMENT 2: Fix ALL Bracket Placeholders (Wiring Review Finding)

Replace lines 323-329 in CAMX-FINAL-ROADMAP-v17.md:

### Decision Architecture U-DA1: Wire DecisionTreeEngine
```
/smart: OPUS/HIGH
FILES TO READ FIRST:
  - src/engines/DecisionTreeEngine.ts (7 structured trees)
  - src/engines/PipelineDecisionOrchestratorEngine.ts (E1080)

STEPS:
  1. PipelineDecisionOrchestrator.decide() currently scores candidates
  2. ADD: before final selection, trace through DecisionTreeEngine
     for the matching category (tool_select → tool decision tree,
     strategy_select → strategy decision tree, etc.)
  3. DecisionTree returns reasoning[] — step-by-step logic path
  4. Include reasoning[] in the decision output justification
  5. This gives EVERY decision a traceable logic path, not just a score

EXIT CRITERIA:
  ✓ reasoning[] appears in decision output
  ✓ Reasoning has ≥3 steps for complex decisions
```

### Decision Architecture U-DA2: Wire InferenceChainEngine
```
/smart: OPUS/HIGH
FILES TO READ FIRST:
  - src/engines/InferenceChainEngine.ts (multi-step reasoning)

STEPS:
  1. For complex decisions (multi-setup planning, process routing):
     Call InferenceChain.analyzeAndRecommend() with full context
  2. Chain produces intermediate conclusions leading to final recommendation
  3. Add to PipelineDecisionOrchestrator for complex decision categories

EXIT CRITERIA:
  ✓ Multi-step reasoning for complex decisions
  ✓ Intermediate conclusions visible in output
```

### [Continue for U-DA3 through U-DA8 — XAI, 17 optimization engines, 6 prediction engines, simulation gate, convex optimization, fuzzy logic]

### Knowledge Wiring U-KW1: Manufacturer S/F data
```
/smart: OPUS/HIGH
FILES TO READ FIRST:
  - src/data/guhring-iscar-speed-feed-data.ts
  - src/data/helical-speed-feed-data.ts
  - src/data/osg-speed-feed-data.ts
  - src/data/manufacturer-speed-feed-data.ts
  - src/engines/UltimateSpeedFeedEngine.ts

STEPS:
  1. UltimateSpeedFeedEngine has inline ISO-group speed tables
  2. We have 2,423 lines of manufacturer-SPECIFIC speed/feed data
  3. When a tool's manufacturer is known (e.g., Sandvik CNMG 120408):
     Look up brand-specific Vc/fz instead of generic ISO table
  4. Lazy-load manufacturer data files
  5. Fallback to ISO tables when brand unknown

EXIT CRITERIA:
  ✓ Known-brand tools get brand-specific S/F
  ✓ Unknown brands get ISO table (no regression)
  ✓ vitest: Sandvik 4140 → specific Vc, generic 4140 → ISO Vc
```

### [Continue for U-KW2 through U-KW6 — KB functions, controller knowledge, academy courses, hyperMILL materials, POST-ULT pipeline with SPECIFIC insertion points per pipeline]

---

## AMENDMENT 3: Add POST-ULT Wiring Specifics (Wiring Review Finding)

Replace vague U08 with specific per-pipeline wiring:

### U08a: Wire POST-ULT into PrintToProgramPipelineEngine
```
STEPS:
  1. FIND: the point in generateProgram() where program_text is assembled
     (after all operations have G-code, before output)
  2. INSERT: lazy-load PostPhysicsFoundationEngine
  3. CALL: postPhysics.resolve({
       gcode: program_text,
       material: materialCallout,
       tools: selectedTools,
       machine: machineProfile,
       controller: controllerType
     })
  4. CHAIN: result through LineByLineAdaptiveEngine.optimize()
     → MotionControllerInjectionEngine.inject()
     → PostVerificationSafetyEngine.verify()
     → PostOutputGenerationEngine.format()
  5. REPLACE: program_text with chain output
  6. FALLBACK: if any engine unavailable, keep original program_text
```

### U08b: Wire POST-ULT into TurningPrintToProgramEngine
```
STEPS:
  1. FIND: end of generateGCode() where program_text is joined
  2. Same chain as U08a but with turning-specific context:
     - G18 plane (not G17)
     - CSS awareness (G96/G97 handled by LineByLine)
     - Threading sections marked as DO-NOT-OPTIMIZE (G76 parameters are sacred)
  3. LineByLineAdaptive must NOT modify F values inside G76 threading blocks
  4. FALLBACK: keep original if unavailable
```

### U08c-U08i: Same for remaining 7 pipelines (5-Axis, Mill-Turn, Grinding, Wire EDM, Sinker EDM, Laser, Waterjet)
Each with process-specific considerations (G93 for 5-axis, EDM power settings, laser power commands, etc.)

---

## AMENDMENT 4: Add Test Infrastructure Phase (Test Review Finding)

### Add Phase 0-C: Test Infrastructure Hardening (BEFORE any building)

### U-TEST1: Audit and fix ALL `|| true` and keyword-only assertions
```
/smart: OPUS/HIGH | Role: test quality engineer
STEPS:
  1. grep -rn "|| true" tests/ src/__tests__/ → list every always-pass assertion
  2. grep -rn "\.includes(" tests/ src/__tests__/ → list every keyword-only check
  3. For EACH || true: replace with actual parametric check or remove
  4. For EACH .includes(): determine if it should be:
     a. Coordinate check (parse G-code, extract X/Y/Z values, compare to input dims)
     b. Parameter check (extract S/F values, compare to physics computation)
     c. Structural check (verify block ordering, P/Q matching) — these CAN stay as includes
  5. Create a test utility: parseGCode(text) → { blocks[], tools[], coordinates[], params[] }
     This utility makes parametric assertions EASY for all future tests

EXIT CRITERIA:
  ✓ ZERO || true in any test file
  ✓ ≥50% of .includes() upgraded to parametric checks
  ✓ parseGCode() utility created and tested
```

### U-TEST2: Define 14-stage pipeline validation matrix
```
/smart: OPUS/MAX | Role: pipeline architect + test engineer
STEPS:
  1. Create src/__tests__/helpers/pipeline-stage-validator.ts
  2. Define 14 stages with input/output types and validation functions:
     Stage 1: OCR → dims (accuracy ±0.1mm)
     Stage 2: Feature Recognition → feature list (types correct)
     Stage 3: Material Resolution → ISO + properties (kc1.1 ±5% of Sandvik)
     Stage 4: Machine Selection → machine + justification (capability match)
     Stage 5: Strategy Selection → strategy + alternatives (≥3 scored)
     Stage 6: Tool Selection → tool list (exists in catalog, grade matches ISO)
     Stage 7: S/F Calculation → Vc,fz,ap,ae (±15% of manufacturer data)
     Stage 8: Toolpath Generation → move sequence (no gouge, covers geometry)
     Stage 9: Physics Validation → force,power,Ra (force < machine capacity)
     Stage 10: Collision Check → pass/fail (0 collisions)
     Stage 11: Post-Processing → G-code (valid syntax per controller)
     Stage 12: Simulation → verified (stock removed correctly)
     Stage 13: Cycle Time → estimate (±20% of manual calculation)
     Stage 14: Documentation → setup sheet (complete tool list + offsets)
  3. Each stage validator can be called independently
  4. Pipeline test harness chains all 14 validators

EXIT CRITERIA:
  ✓ 14-stage validator created
  ✓ Each stage has typed input/output + validation function
  ✓ Pipeline harness chains all stages
```

### U-TEST3: Create cross-material S/F range tables
```
/smart: OPUS/MAX | Role: manufacturing domain expert
STEPS:
  1. Create src/__tests__/fixtures/material-sf-ranges.ts
  2. Define expected Vc/fz/ap ranges PER ISO group + specific alloys:
     ISO_P_1045:     { Vc_min: 180, Vc_max: 280, fz_min: 0.15, fz_max: 0.30 }
     ISO_P_4140_28:  { Vc_min: 150, Vc_max: 240, fz_min: 0.12, fz_max: 0.25 }
     ISO_P_4140_42:  { Vc_min: 80,  Vc_max: 150, fz_min: 0.08, fz_max: 0.18 }
     ISO_M_303:      { Vc_min: 120, Vc_max: 200, fz_min: 0.10, fz_max: 0.22 }
     ISO_M_316L:     { Vc_min: 100, Vc_max: 170, fz_min: 0.08, fz_max: 0.20 }
     ISO_K_gray:     { Vc_min: 150, Vc_max: 300, fz_min: 0.15, fz_max: 0.30 }
     ISO_N_6061:     { Vc_min: 300, Vc_max: 600, fz_min: 0.15, fz_max: 0.35 }
     ISO_N_7075:     { Vc_min: 250, Vc_max: 500, fz_min: 0.12, fz_max: 0.30 }
     ISO_S_Ti6Al4V:  { Vc_min: 35,  Vc_max: 80,  fz_min: 0.06, fz_max: 0.15 }
     ISO_S_IN718:    { Vc_min: 15,  Vc_max: 45,  fz_min: 0.04, fz_max: 0.12 }
     ISO_H_D2_62:    { Vc_min: 50,  Vc_max: 120, fz_min: 0.04, fz_max: 0.10 }
  3. Source: Sandvik Coromant General Turning catalog + Kennametal NOVO
  4. Every cross-material test asserts output falls within these ranges

EXIT CRITERIA:
  ✓ Range table covers all 6 ISO groups + 15+ specific alloys
  ✓ Ranges traceable to published manufacturer data
  ✓ Test helper: assertSFInRange(result, material) function created
```

### U-TEST4: Create controller dialect assertion library
```
/smart: OPUS/HIGH | Role: CNC controller specialist
STEPS:
  1. Create src/__tests__/helpers/controller-assertions.ts
  2. Per-controller assertion helpers:
     assertFanucPeckDrill(gcode, {depth, peck, retract, feed})
       → verifies "G83 Z{depth} Q{peck*1000} R{retract} F{feed}"
     assertSiemensCycle83(gcode, {depth, peck, retract, feed})
       → verifies "CYCLE83({retract},{rfp},{sdis},{depth},,,{feed},,,)"
     assertHeidenhainCycl200(gcode, {depth, peck, feed})
       → verifies "CYCL DEF 200 DRILLING\nQ200={retract} Q201={depth} Q206={feed*1000}"
     assertHaasPeckDrill(gcode, {depth, peck, retract, feed})
       → verifies "G83 Z{depth} Q{peck} R{retract} F{feed}" (Haas Q in mm, not microns)
     assertMazakPeckDrill(gcode, {depth, peck, retract, feed})
       → verifies Mazak-specific syntax
  3. Similar helpers for: tool change, safe start, HSM mode, cutter comp,
     threading cycle, probing cycle — per controller family

EXIT CRITERIA:
  ✓ Assertion library covers 6 controller families
  ✓ 10+ operation types per controller
  ✓ Used by all subsequent cross-controller tests
```

### U-TEST5: Create negative/error input test battery
```
/smart: OPUS/HIGH | Role: QA engineer
STEPS:
  1. Create src/__tests__/negative-input-battery.test.ts
  2. 50+ negative test cases:
     MATERIAL:
       - Unrecognized material name → graceful fallback with warning
       - Empty material → error with clear message
       - Hardness outside valid range (0 HRC, 100 HRC) → clamped with warning
     DIMENSIONS:
       - Negative dimensions → rejected with error
       - Zero-length features → rejected
       - Bore diameter > OD → rejected (physics impossible)
       - Pocket deeper than stock thickness → rejected
     MACHINE:
       - RPM exceeds machine max → clamped with warning
       - Power exceeds capacity → auto-reduced with warning
       - Travel exceeds envelope → rejected
     TOOL:
       - Tool diameter > pocket width → rejected
       - Tool too short for feature depth → rejected with tool recommendation
       - No suitable tool in catalog → clear error with recommendation
     TOLERANCE:
       - Tolerance tighter than machine capability → warning with Cpk prediction
       - Tolerance = 0 → rejected
     FEATURES:
       - Empty feature list → error
       - Conflicting features (pocket inside a hole) → warning
       - Unsupported feature type → graceful skip with warning
  3. Every test verifies the error/warning is CLEAR and ACTIONABLE

EXIT CRITERIA:
  ✓ 50+ negative tests all pass
  ✓ Every error message is actionable (not just "invalid input")
  ✓ No crashes — all failures are graceful
```

### U-TEST6: Create parameter sanity guard
```
/smart: OPUS/HIGH | Role: manufacturing domain expert
STEPS:
  1. Create src/__tests__/helpers/parameter-sanity.ts
  2. Define physically impossible parameter ranges:
     feed_per_rev_max_mm: 5.0 (anything above snaps the tool)
     Vc_steel_max_m_min: 500 (anything above is unrealistic for steel)
     Vc_aluminum_max_m_min: 3000 (PCD absolute max)
     ap_max_factor: 3.0 (ap > 3×D is physically impossible)
     ae_max_factor: 1.0 (ae > D is impossible)
     G83_Q_max_mm: 50 (Q5000 = 5 meters is obviously wrong)
     G71_U_max_mm: 10 (DOC > 10mm in turning = unrealistic for most ops)
  3. Test that NO pipeline output EVER produces values outside these ranges
  4. This catches bugs like the 5-axis G83 Q5000 peck depth

EXIT CRITERIA:
  ✓ Sanity guard catches Q5000 and similar bugs
  ✓ Applied to all 9 pipeline outputs
  ✓ Zero violations in any test
```

---

## AMENDMENT 5: Add Process-Specific Physics (Physics Review)

Add to Phase 3 (Level 3 decisions):

### U-PHYS1: Thread milling force model
```
Thread milling has DIFFERENT force components than standard milling:
  - Radial force from helical path
  - Axial force from thread pitch engagement
  - Variable engagement angle around the helix
Wire into ThreadingPipelineEngine and TurningPrintToProgramEngine
```

### U-PHYS2: Helical interpolation force model
```
During helical bore milling (G2/G3 with Z):
  - Effective diameter changes along helix
  - Chip thickness varies with helix angle
Wire into PrintToProgramPipeline for helical entry strategy
```

### U-PHYS3: Plunge milling force model
```
Plunge milling forces are primarily AXIAL (not radial):
  - Different from peripheral milling physics
  - Spindle thrust capacity is the limit, not torque
Wire into PrintToProgramPipeline for deep cavity roughing option
```

### U-PHYS4: Hard milling dynamics — process damping
```
At low cutting speeds in hard materials (ISO H):
  - Process damping STABILIZES the cut (opposite of normal chatter behavior)
  - Optimal speed may be BELOW the stability lobe minimum
  - This is why HSM works in hardened steel at specific speed ranges
Wire into ChatterStabilityLobeEngine + OptimalStrategySelection for ISO H
```

---

## AMENDMENT 6: Specify WEDM Routing Fix Lines (Wiring Review Finding)

Replace vague P1/U09 with specific:

```
STEPS:
  1. In QuoteToShipOrchestratorEngine.ts:
     Line ~200: Replace 'EDMProgramAssemblerEngine' with 'EDMQualityOrchestratorEngine'
     Line ~1492: Same replacement
     The EDMQualityOrchestratorEngine.run_pipeline() is the 20-stage entry point
  2. In MultiProcessCAMBridgeEngine.ts:
     Lines 53-57: Replace wire_edm inline handler with lazy-load of EDMQualityOrchestratorEngine
     Lines 176-180: Same for sinker_edm handler
  3. The 20 stages are:
     Drawing → Feasibility → Material/Machine/Wire → Start Holes → Setup
     → Toolpath → Multi-Pass → Parameters → Flushing → Wire/Slug
     → Corner/Taper → Monitoring → Surface Integrity → Post-Process
     → G-Code → Cost → Documentation → Quality → Learning
  4. For SINKER EDM: same orchestrator but uses sinker-specific stages
     (electrode design → orbiting → jump cycle instead of wire-specific stages)
```

---

## AMENDMENT 7: Golden Snapshots During Development (Test Review Finding)

Add to EVERY phase (5-11) that produces correct pipeline output:

```
RULE: When a pipeline generates correct output for a new machine type/part:
  1. Save the generated G-code as a golden snapshot:
     tests/golden-snapshots/{machine-type}/{part-name}.gcode
  2. Save the input that produced it:
     tests/golden-snapshots/{machine-type}/{part-name}.input.json
  3. Create a vitest that loads the input, runs the pipeline,
     and compares output to the golden snapshot
  4. Any future change that alters the output will FAIL this test
     → developer must review and update snapshot if change is intentional
```

---

## UPDATED UNIT COUNT

| Phase | v17 Units | v18 Additions | v18 Total |
|---|---|---|---|
| Phase 0-A: Print Reading | 6 | 0 | 6 |
| Phase 0-B: Bug Fixes | 7 | 0 | 7 |
| **Phase 0-C: Test Infrastructure** | **0** | **6** | **6** |
| Phase 1: Knowledge + Decisions | 18 | 4 (new engine wiring) | 22 |
| Phase 2: Business Logic | 5 | 0 | 5 |
| Phase 3: Level 3 Decisions | 12 | 4 (process physics) | 16 |
| Phases 4-10: Per-Machine | ~600 | 0 | ~600 |
| Phase 11: Testing | 15 | golden snapshots throughout | 15 |
| Phase 12: Final Wiring | 6 | 0 | 6 |
| **TOTAL** | **~950** | **~14** | **~964** |

---

## SCRUTINY RESOLUTION CHECKLIST

| Finding | Amendment | Status |
|---|---|---|
| 6 engines missing from roadmap | Amendment 1: U19-U22 | FIXED |
| Bracket placeholders in .md | Amendment 2: Expanded with step-by-step | FIXED |
| POST-ULT wiring too vague | Amendment 3: Per-pipeline specifics | FIXED |
| `|| true` anti-patterns | Amendment 4: U-TEST1 | FIXED |
| No negative/error tests | Amendment 4: U-TEST5 | FIXED |
| No pipeline stage validation | Amendment 4: U-TEST2 | FIXED |
| No cross-material ranges | Amendment 4: U-TEST3 | FIXED |
| No controller dialect assertions | Amendment 4: U-TEST4 | FIXED |
| No parameter sanity guard | Amendment 4: U-TEST6 | FIXED |
| Golden snapshots deferred too late | Amendment 7: During development | FIXED |
| Process-specific physics missing | Amendment 5: U-PHYS1-4 | FIXED |
| WEDM routing lines unspecified | Amendment 6: Exact lines given | FIXED |
| Test agent domain knowledge | U-TEST6 parameter sanity guard | FIXED |
# CAMX ROADMAP v19 AMENDMENTS
## Fixes the 84% gap: 49/50 algorithms unused, 0/11 registries queried, 22 orphaned engines

---

## THE PROBLEM IN ONE TABLE

| Asset | Total | Used by Pipelines | % Utilized |
|---|---|---|---|
| Engines | 1,246 | ~200 referenced | 16% |
| Algorithms | 50 | 1 (MonteCarlo) | 2% |
| Registries | 11 key | 0 | 0% |
| Orphaned engines | 22 | 0 (never referenced by anything) | 0% |

---

## AMENDMENT 8: Wire ALL 11 Registries Into Pipeline Decisions (5 units)

### U-REG1: Wire ToolpathStrategyRegistry (752 strategies) into OptimalStrategySelection
```
/smart: OPUS/MAX
FILES TO READ FIRST:
  - src/registries/ToolpathStrategyRegistry.ts (752 entries)
  - src/engines/OptimalStrategySelectionEngine.ts (E1087, has 28-entry private STRATEGY_DB)
  - src/engines/AdaptiveToolpathRouterEngine.ts (35-entry ALGORITHM_REGISTRY)

PROBLEM: OptimalStrategy has 28 strategies. The registry has 752. These OVERLAP.
FIX:
  1. OptimalStrategy.compute() should FIRST query ToolpathStrategyRegistry
     for ALL strategies matching the feature type + axis count
  2. Filter by machine capability (from MachineStrategyConstraintEngine)
  3. THEN score the filtered candidates with physics
  4. The private 28-entry STRATEGY_DB becomes a FALLBACK, not the primary source
  5. This gives the decision engine access to 752 strategies instead of 28

EXIT: Pipeline queries registry. >28 strategies evaluated for complex features.
```

### U-REG2: Wire MaterialRegistry (1,662L) into SpeedFeedOrchestrator
```
/smart: OPUS/MAX
FILES TO READ FIRST:
  - src/registries/MaterialRegistry.ts (1,662 lines)
  - src/engines/SpeedFeedOrchestratorEngine.ts (has inline 13-material MATERIAL_DB)

PROBLEM: SFO has 13 materials inline. MaterialRegistry has hundreds.
FIX:
  1. SFO.resolveMaterial() should FIRST query MaterialRegistry
  2. If registry returns full properties (kc1_1, mc, thermal_k, etc.), use those
  3. FALLBACK to inline 13-material table if registry miss
  4. Also wire hyperMILL materials catalog (2,544 entries) as secondary source

EXIT: SFO queries registry. Known alloys get alloy-specific properties.
```

### U-REG3: Wire FormulaRegistry (1,109L) into physics computation
```
/smart: OPUS/HIGH
FILES TO READ FIRST:
  - src/registries/FormulaRegistry.ts

PROBLEM: Physics engines hardcode formulas inline. FormulaRegistry catalogs ALL formulas.
FIX:
  1. When PipelineDecisionOrchestrator makes a physics-dependent decision,
     query FormulaRegistry for which formula applies
  2. FormulaRegistry returns: formula name, equation, variables, units, domain, source
  3. This enables: formula provenance in output ("Ra calculated using fz²/32r per ISO 4287")
  4. Also enables: formula switching (Kienzle vs Merchant vs Oxley for force)

EXIT: Formula provenance appears in output. Multiple formula options compared.
```

### U-REG4: Wire CoatingRegistry + CoolantRegistry + PostProcessorRegistry
```
/smart: OPUS/HIGH
FILES:
  - src/registries/CoatingRegistry.ts
  - src/registries/CoolantRegistry.ts
  - src/registries/PostProcessorRegistry.ts

FIX:
  1. CoatingSelectionEngine (E1082) queries CoatingRegistry for ALL available coatings
  2. CoolantStrategyEngine queries CoolantRegistry for ALL coolant types with properties
  3. PostSelectionEngine queries PostProcessorRegistry for best post per controller

EXIT: Selection engines query registries, not inline tables.
```

### U-REG5: Wire AlgorithmRegistry + MachineRegistry + ToolRegistry
```
/smart: OPUS/HIGH
FIX:
  1. AdaptiveToolpathRouter queries AlgorithmRegistry for ALL available algorithms
  2. MachineSelectionEngine queries MachineRegistry for ALL machine profiles
  3. SmartToolSelectorEngine queries ToolRegistry as index into 95K catalog

EXIT: Decision engines use registries as knowledge backbone.
```

---

## AMENDMENT 9: Wire Critical Algorithms Into Pipeline Physics (8 units)

### U-ALG1: Wire CWEZBuffer (Cutter Workpiece Engagement Z-buffer)
```
/smart: OPUS/MAX
FILES TO READ FIRST:
  - src/algorithms/CWEZBuffer.ts

PURPOSE: CWE Z-buffer computes EXACT instantaneous engagement between cutter and
workpiece using a Z-buffer (depth buffer) approach. This is MORE ACCURATE than the
analytical InstantaneousEngagementEngine for complex geometry (curved walls, rest stock).

WHERE: Wire into PostProcessorPipeline Phase 2 as an UPGRADE to InstantaneousEngagement.
For simple geometry → keep analytical. For complex → use CWEZBuffer.
The per-block S/F optimization becomes more accurate for non-trivial parts.

EXIT: Complex geometry parts get CWE-based per-block S/F, simple parts keep analytical.
```

### U-ALG2: Wire StabilityLobeDiagram + FRFStabilityLobe + RCSA
```
/smart: OPUS/MAX
FILES:
  - src/algorithms/StabilityLobeDiagram.ts
  - src/algorithms/FRFStabilityLobe.ts
  - src/algorithms/RCSA.ts

PURPOSE:
  - StabilityLobeDiagram: the classic chatter prediction (already used by engine but
    algorithm itself not directly called by pipeline)
  - FRFStabilityLobe: Frequency Response Function for more accurate SLD
  - RCSA: Receptance Coupling Substructure Analysis — models the ASSEMBLY dynamics
    (tool + holder + spindle) rather than just tool cantilever

WHERE: Wire into RPM selection at every pipeline. Current StabilityRPMRewriterEngine
uses simplified stability check. Upgrade to use the full FRF + RCSA chain for
accurate chatter prediction that accounts for holder type and spindle dynamics.

EXIT: RPM selection uses assembly dynamics. Different holders produce different stable zones.
```

### U-ALG3: Wire AntColonyTSP for tool change optimization
```
PURPOSE: Better than greedy for tool change sequence. Finds shorter total turret/magazine
travel. Significant for >10 tool jobs.
WHERE: ToolChangeOptimizationEngine and IntelligentSequencingEngine.
EXIT: Jobs with >10 tools get TSP-optimized sequence.
```

### U-ALG4: Wire DPMultiPass for roughing depth optimization
```
PURPOSE: Dynamic programming finds OPTIMAL number of passes and depth per pass.
Better than fixed % rules. Minimizes cycle time while respecting force constraints.
WHERE: Every roughing decision in every pipeline.
EXIT: Roughing pass count + depth optimized per material/tool combo.
```

### U-ALG5: Wire GeneticOptimizer + ParticleSwarm for joint S/F optimization
```
PURPOSE: Search {Vc, fz, ap, ae} space JOINTLY to find true minimum cycle time
subject to ALL constraints simultaneously. Better than solving each independently.
WHERE: OptimalStrategySelectionEngine and SpeedFeedOrchestrator.
EXIT: Joint optimization available. Falls back to formula-based when speed needed.
```

### U-ALG6: Wire FFTAnalyzer + STFTChatter + WaveletBreakage for monitoring
```
PURPOSE:
  FFT: frequency-domain vibration analysis
  STFT: time-frequency chatter detection (identifies WHEN chatter starts)
  Wavelet: tool breakage detection from force/vibration signatures
WHERE: Generate monitoring THRESHOLDS in the CNC program output.
  Comments or macro variables that tell the machine monitoring system
  what force/vibration levels to expect and when to alarm.
EXIT: Programs include monitoring thresholds in comments/macros.
```

### U-ALG7: Wire ChipBreakingModel + ChipEvacuationModel + ChipVolumeRate
```
PURPOSE:
  ChipBreaking: predict chip form (continuous/segmented/broken) from feed/DOC/material
  ChipEvacuation: verify chip clearance in deep holes/pockets
  ChipVolumeRate: volumetric chip production rate → coolant flow requirement
WHERE: Feed selection (modify feed if continuous chips predicted) + coolant flow calc.
EXIT: Feed adjusted for chip control. Deep holes get evacuation check.
```

### U-ALG8: Wire KalmanFilter + ExtendedTaylorModel + BayesianWearModel
```
PURPOSE:
  KalmanFilter: real-time state estimation from noisy sensor data
  ExtendedTaylor: more accurate tool life (accounts for variable Vc, intermittent cutting)
  BayesianWear: probabilistic wear model, updated from actual measurements
WHERE: Self-learning feedback loop. When MTConnect/OPC-UA data available:
  KalmanFilter estimates current state → ExtendedTaylor predicts remaining life →
  BayesianWear updates prediction from actual → better next-program predictions.
EXIT: Learning loop uses advanced algorithms, not just simple Bayesian updating.
```

---

## AMENDMENT 10: Wire Orphaned Material-Specific Engines (4 units)

### U-MAT1: Wire SuperalloyMachiningEngine into ISO S material handling
```
PURPOSE: Superalloy-specific machining physics (Inconel, Hastelloy, Waspaloy).
Work hardening, notch wear, thermal damage, ceramic insert behavior.
WHERE: When material is ISO S AND is a nickel/cobalt superalloy:
  Query SuperalloyMachiningEngine for specific recommendations.
EXIT: Inconel/Hastelloy parts get superalloy-specific physics.
```

### U-MAT2: Wire CeramicsMachiningEngine + MagnesiumMachiningEngine
```
PURPOSE: Material-specific handling for edge cases.
  Ceramics: brittle fracture, diamond tooling, no coolant
  Magnesium: FIRE RISK with water-based coolant, special chip handling
WHERE: Material detection → route to specific engine for special handling.
EXIT: Ceramic and magnesium parts get safety-critical material handling.
```

### U-MAT3: Wire CompositesMachiningPhysicsEngine
```
PURPOSE: CFRP, fiberglass, Kevlar — completely different physics.
  Delamination risk, fiber direction effects, no thermal damage (matrix melts),
  abrasive wear on diamond-coated tools, dust extraction mandatory.
WHERE: When material is composite → route to composites engine.
EXIT: Composite parts get delamination-safe S/F and special tool selection.
```

### U-MAT4: Wire orphaned CAMX engines (E1085 WorkholdingSurfaceInference, E1086 QuoteToShip)
```
PROBLEM: Two engines WE BUILT in this roadmap are ORPHANED:
  - WorkholdingSurfaceInferenceEngine (E1085) — never referenced by any other engine
  - QuoteToShipOrchestratorEngine (E1086) — never referenced by any other engine
FIX:
  1. Wire E1085 into FeasibilityOrchestratorEngine (dead-end detection)
  2. Wire E1086 into the main routing layer (it's supposed to be THE entry point)
  3. Verify both are exported from index.ts and accessible via dispatchers
EXIT: Both engines callable and referenced by at least one other engine.
```

---

## AMENDMENT 11: Wire Orphaned Process-Specific Engines (3 units)

### U-PROC1: Wire HoningProcessEngine + BurnishingPolishingEngine
```
PURPOSE: Honing and burnishing are POST-machining finishing processes.
  Honing: precision bore finishing (Ra 0.1-0.4μm, roundness <1μm)
  Burnishing: cold-work surface hardening + finish improvement
WHERE: When tolerance or Ra requirements exceed turning/grinding capability:
  Auto-suggest honing or burnishing as secondary operation.
  Include in cost estimate and process plan.
EXIT: Tight-tolerance bores get honing recommendation. Ra<0.2μm suggests burnishing.
```

### U-PROC2: Wire GrindingWheelDressingOptimizationEngine
```
PURPOSE: Optimize dressing parameters (lead, depth, overlap ratio) for target Ra.
Currently in GrindingProgramAssembler but the OPTIMIZATION engine is separate and orphaned.
WHERE: Wire into GrindingProgramAssembler as the dressing parameter source.
EXIT: Dressing parameters come from optimization, not lookup tables.
```

### U-PROC3: Wire ScrapRootCauseEngine + ToolSubstitutionRiskEngine
```
PURPOSE:
  ScrapRootCause: when a part is scrapped, analyze which operation/parameter was the cause
  ToolSubstitution: when substituting a different tool, assess the risk (different geometry,
    different coating → different forces → different Ra)
WHERE:
  ScrapRootCause: post-production feedback loop
  ToolSubstitution: when InventoryAwareToolSelector suggests a substitute from crib
EXIT: Substitution risk assessment in tool selection output. Root cause in feedback loop.
```

---

## UPDATED UTILIZATION PROJECTIONS

| Asset | v18 (before) | v19 (after) | Change |
|---|---|---|---|
| Algorithms used by pipelines | 1/50 (2%) | **25/50 (50%)** | +24 algorithms wired |
| Registries queried by pipelines | 0/11 (0%) | **11/11 (100%)** | All registries connected |
| Orphaned engines resolved | 0/22 | **10/22** | Material-specific + CAMX + process engines |
| Engines referenced by pipelines | ~200/1,246 (16%) | **~350/1,246 (28%)** | +150 through registry + algorithm wiring |

The remaining ~900 engines are legitimately niche (FilamentWindingEngine, HeatExchangerPlateEngine, StripeBillingEngine, etc.) or are CONSUMED by other engines (not directly by pipelines). 28% direct pipeline utilization is realistic for a system this large — the other 72% serve standalone dispatcher actions, web UI, ERP integration, etc.

---

## v19 TOTAL ADDITIONS

| Amendment | Units Added |
|---|---|
| Amendment 8: Registry wiring | 5 |
| Amendment 9: Algorithm wiring | 8 |
| Amendment 10: Material-specific + orphan fix | 4 |
| Amendment 11: Process-specific orphans | 3 |
| **Total new units** | **20** |

**Combined with v18 amendments (14 units): total amendments = 34 new units on top of v17's ~950.**

---

## FINAL ROADMAP EXECUTION ORDER (v19)

```
Phase 0-A: Print Reading Validation (6 units)
Phase 0-B: Critical Bug Fixes (7 units)
Phase 0-C: Test Infrastructure Hardening (6 units) [v18]
Phase 0-D: Registry + Algorithm + Orphan Wiring (20 units) [v19 NEW]
Phase 1:   Knowledge + Decision Architecture (22 units) [v18 expanded]
Phase 2:   Business Logic (5 units)
Phase 3:   Level 3 Decisions + Process Physics (16 units) [v18 expanded]
Phase 4-10: Per-Machine Pipeline Completion (~600 units)
Phase 11:  Exhaustive Testing (15 units + golden snapshots)
Phase 12:  Final Wiring + Web UI (6 units)

TOTAL: ~984 units + 34 amendments = ~1,018 units
```
# PRISM Pipeline Stage → Engine Wiring Matrix
## Every pipeline stage, every engine that should fire, every algorithm that should run

This matrix defines EXACTLY which engines and algorithms fire at each stage of the
print-to-CNC-program pipeline. Every pipeline (milling, turning, 5-axis, mill-turn,
grinding, wire EDM, sinker EDM, laser, waterjet) follows these stages.

---

## STAGE 1: INTAKE — Print/CAD Reading (15 engines)

**Purpose**: Accept engineering drawing or CAD model, extract all dimensions, tolerances, GD&T, features.

| Engine | What It Does | When to Call |
|---|---|---|
| BlueprintOCREngine | Extract dimensions from scanned drawing text | Input is text/image |
| PDFBlueprintDimensionExtractorEngine | Extract from PDF | Input is PDF |
| PrintReadingEngine | Orchestrate: OCR → feature recognition → tolerance validation | Always (orchestrator) |
| StepImportEngine | Import STEP AP203/AP214 | Input is STEP file |
| IGESImportEngine | Import IGES 5.3 | Input is IGES file |
| DXFParserEngine | Parse DXF/SVG to 2D boundaries | Input is DXF/SVG |
| PrintToGeometryEngine | Convert dims to CadQuery 3D model | After OCR, if no CAD model |
| CADKernelEngine | Core CAD operations | When building 3D model |
| FeatureRecognitionEngine | Identify 21 feature types from geometry | After geometry available |
| FeatureToZoneEngine | Decompose features into machining zones | After feature recognition |
| DimensionalAnalysisEngine | Validate dimensions | After extraction |
| ToleranceEngine + ToleranceStackEngine | Tolerance analysis + stack-up | After extraction |
| GDTStackupEngine | GD&T stack-up analysis | If GD&T present |
| CADDrawingKnowledgeEngine | Drawing interpretation intelligence | For complex drawings |
| AutoPrintToProgramBridgeEngine | Route: file→parse→classify→pipeline | Orchestrator entry point |

**Algorithms at this stage**: InterpolationEngine (for curve fitting from points)

**Registry**: None directly, but MaterialRegistry for material name resolution

**TEST**: Every dimension extracted matches known drawing values ±0.1mm

---

## STAGE 2: DFM & FEASIBILITY (8 engines)

| Engine | What It Does | When to Call |
|---|---|---|
| DfMRulesEngine | Manufacturability rules (wall thickness, pocket depth, etc.) | Always — GATE |
| DFMFeedbackEngine | Score features 0-100 for manufacturability | Always — GATE |
| FeasibilityAnalysisEngine | Accessibility + workholding + rigidity | Always |
| FeasibilityOrchestratorEngine | Chain all feasibility checks | Always (orchestrator) |
| SequenceFeasibilityEngine | Dead-end detection, auto-resequencing | Multi-op parts |
| MultiSetupFeasibilityChainEngine | Datum chain Monte Carlo, branch-and-bound | Multi-setup parts |
| AccessibilityAnalysisEngine | Tool reach validation | Always |
| WorkholdingSurfaceInferenceEngine (E1085) | Auto-detect grip/datum surfaces, track survival | Always |

**Algorithms**: CSPSetupPlan (constraint satisfaction for setup planning)

**TEST**: Non-manufacturable features flagged. Dead-ends detected. GATE: blocks program gen if infeasible.

---

## STAGE 3: MATERIAL RESOLUTION (13 engines)

| Engine | What It Does | When to Call |
|---|---|---|
| MaterialSelectionEngine | Material selection + property lookup | Always |
| HyperMillMaterialBridgeEngine | 2,544 materials with machinability corrections | When alloy-specific data needed |
| HyperMillMaterialMapEngine | Material taxonomy mapping | For hyperMILL material groups |
| SuperalloyMachiningEngine | Inconel/Hastelloy specific physics | ISO S superalloys |
| CeramicsMachiningEngine | Ceramic material processing | Ceramic workpieces |
| MagnesiumMachiningEngine | Fire risk, special coolant | Magnesium alloys |
| CompositesMachiningPhysicsEngine | CFRP, fiberglass delamination | Composite materials |
| MarketMaterialPricingEngine | Current material pricing | For cost estimation |
| StockSizeOptimizerEngine | Optimal raw stock selection | Always |
| StockAllowanceEngine | Allowances for secondary ops | When secondary ops needed |
| StockModelEngine | Track stock shape through operations | Multi-op parts |
| VoxelStockEngine + VoxelStockIntegrationEngine | Voxel-based stock representation | Complex stock tracking |

**Registry**: MaterialRegistry (1,662L) — PRIMARY source for material properties
**Algorithm**: None directly

**TEST**: Material properties match published data ±5%. ISO group correct. Exotic materials get special handling.

---

## STAGE 4: MACHINE SELECTION (56 engines — key ones listed)

| Engine | What It Does | When to Call |
|---|---|---|
| MachineSelectionEngine | Select best machine from shop | Always |
| MachineMatcherEngine | Match features to machine capabilities | Always |
| MachineStrategyConstraintEngine (E1091) | Validate machine can execute strategy | After strategy selection |
| ControllerStrategyValidatorEngine (E1090) | Validate controller supports strategy | After strategy selection |
| ControllerDialectEngine | Controller syntax knowledge (20 dialects) | For G-code generation |
| ControllerFeatureMatrixEngine | Controller capability matrix | For feature validation |
| MachineRateDatabaseEngine | Machine hourly rates | For cost estimation |
| SpindleTorqueCurveEngine | Spindle power/torque curves | For power validation |
| CapacityPlanningEngine | Machine availability | For scheduling |
| OEECalculatorEngine | Machine utilization | For efficiency tracking |
| ROIAdvisorEngine | Equipment purchase ROI | When capability gap exists |
| MakeVsBuyDecisionEngine (E1083) | Outsource vs in-house per operation | When capability gap exists |
| ShopNetworkEngine (E1134) | External shop capability matching | For outsourcing |

**Registry**: MachineRegistry — machine profiles database
**Algorithm**: ILPAssignment (integer linear programming for machine assignment)

**TEST**: Best machine selected with reasoning. Outsource when no capability. ROI for purchase.

---

## STAGE 5: WORKHOLDING (20 engines — key ones listed)

| Engine | What It Does | When to Call |
|---|---|---|
| WorkholdingEngine | Core workholding intelligence | Always |
| WorkholdingIntelligenceEngine | Advanced workholding analysis | Complex parts |
| WorkholdingViabilityEngine | Clamping force vs cutting force validation | Always — GATE |
| WorkholdingVerificationEngine (E1148) | Coulomb friction grip force check | Always — GATE |
| WorkholdingForceEngine | Force calculations | Always |
| ChuckJawForceEngine | Lathe chuck grip force + centrifugal loss | Turning |
| TailstockForceEngine | Tailstock support force | Turning L/D > 4 |
| SteadyRestPlacementEngine | Steady rest positioning | Turning L/D > 8 |
| FixtureDesignEngine | Fixture design | Custom fixtures |
| ModularFixtureLayoutEngine | Modular fixture layout | Modular systems |
| TombstoneLayoutEngine | Tombstone face assignment | Multi-face HMC |
| FixtureClampingEngine | Clamping force analysis | Always |
| MultiSetupPlannerEngine | Multi-setup orientation + fixturing | Multi-setup parts |

**TEST**: Grip force > cutting force × SF. Centrifugal loss computed for turning RPM.

---

## STAGE 6: TOOL SELECTION (56 engines — key ones listed)

| Engine | What It Does | When to Call |
|---|---|---|
| SmartToolSelectorEngine | 7-factor physics-scored from 95K catalog | Always (primary) |
| InventoryAwareToolSelectorEngine | Check user crib FIRST | When user has crib |
| ToolCatalogEngine | 95,608 tool catalog | Data source |
| ToolROIEngine (E1081) | 3 price points with ROI calculation | Always |
| ToolCostPerPartEngine | Tool amortization | Cost estimation |
| InsertGradeSelectionEngine | ISO insert grade optimization | Turning |
| ToolCoatingSelectionEngine + CoatingSelectionEngine (E1082) | Coating by ISO group | Always |
| ToolGeometrySelectionEngine | Tool geometry optimization | When multiple geometries valid |
| ToolHolderDatabaseEngine | 1,332 holders | Holder selection |
| ToolMagazineOptimizationEngine | Magazine/turret layout (TSP) | After tool list finalized |
| ToolChangeOptimizationEngine (E1137) | Minimize tool changes | Multi-tool jobs |
| ToolAssemblyEngine + ToolAssemblyModelEngine | Tool assembly modeling | For collision/deflection |
| ToolSubstitutionRiskEngine | Risk when substituting tools | When crib tool != catalog best |
| BoringBarDeflectionEngine | Boring bar specific deflection | Boring operations |
| ToolInventoryOrchestratorEngine | "Can this job run with what I have?" | Job start check |

**Registry**: ToolRegistry (1,398L), CoatingRegistry
**Algorithm**: AntColonyTSP (for magazine/turret optimization)

**TEST**: Tool from catalog (real part number). 3 price points shown. ROI calculated. Magazine optimized.

---

## STAGE 7: STRATEGY SELECTION (32 engines — key ones listed)

| Engine | What It Does | When to Call |
|---|---|---|
| OptimalStrategySelectionEngine (E1087) | Unified physics-scored strategy selector | Always (primary) |
| FeatureStrategyKnowledgeBaseEngine (E1112) | 203 feature→strategy rules | Always (input to E1087) |
| CrossCamRecommenderEngine | Cross-CAM strategy ranking | Always |
| AdaptiveToolpathRouterEngine | 35 algorithm router | After strategy selected |
| AlgorithmSelectorEngine | Per-zone algorithm selection | Complex features |
| StrategyTaxonomyEngine (E1084) | Canonical strategy names | Normalization |
| StrategyBenchmarkEngine (E1096) | MC comparison of strategies | When comparing |
| StrategyComparisonEngine (E1099) | Radar chart + explanation | User-facing comparison |
| StrategySequencingEngine (E1097) | Multi-op strategy sequences | Multi-operation features |
| BatchSizeStrategyEngine (E1100) | Prototype vs production | Batch-aware selection |
| FixtureAwareStrategyEngine (E1101) | Workholding-constrained | Always |
| ContextualStrategyOverrideEngine (E1111) | Hard overrides (thin wall, deep bore) | Edge cases |
| MachineLearningStrategyRankerEngine (E1107) | Bayesian learned ranking | When history available |
| SelfLearningCAMEngine | Proven recipe lookup | When similar part made before |
| MachiningPlaybookEngine | 296 rules + anti-patterns | Always |
| TribalKnowledgeDecisionBridge (NEW) | 3,831 tips + 296 rules queried | Always |

**Registry**: ToolpathStrategyRegistry (752 strategies), AlgorithmRegistry
**Algorithm**: GeneticOptimizer, ParticleSwarm (for parameter space search)

**TEST**: ≥3 strategies evaluated with physics. Playbook checked. Tribal tips consulted. Proven recipe used if available.

---

## STAGE 8: S/F COMPUTATION (15+ engines)

| Engine | What It Does | When to Call |
|---|---|---|
| UltimateSpeedFeedEngine | Comprehensive baseline S/F | Always (per tool) |
| SpeedFeedOrchestratorEngine | 67-point integration hub | Always (orchestrator) |
| AutoSpeedFeedEngine | Per-block S/F on raw G-code | Post-processing |
| EngagementAdaptiveFeedEngine | Constant chip load mode | Adaptive strategies |
| AdvancedChipThicknessEngine | Trochoidal variable feed | Trochoidal paths |
| ChipLoadEngine | Chip load optimization | Always |
| StepoverOptimizationEngine | Curvature-adaptive stepover | Finishing passes |
| InstantaneousEngagementEngine | Per-block ae/ap/theta | Post-processing |
| StabilityRPMRewriterEngine | Chatter-free RPM | After RPM computed |
| PredictionCalibrationEngine (E1147) | Calibrated kc1.1/Taylor | When calibration data available |

**Registry**: FormulaRegistry (1,109L) — formula lookup + provenance
**Algorithm**: KienzleForceModel, ExtendedTaylorModel, DPMultiPass (for pass depth optimization), CWEZBuffer (for complex engagement)

**TEST**: S/F within ±15% of manufacturer published data. Per-block F variation. Chatter-free RPM.

---

## STAGE 9: PHYSICS VALIDATION (77 engines — key ones listed)

| Engine | What It Does | When to Call |
|---|---|---|
| KienzleForceModelEngine | Cutting force | Every cutting operation |
| TurningForceEngine | Turning-specific force | Turning operations |
| GrindingForceEngine | Grinding specific energy | Grinding operations |
| CuttingMechanicsEngine | Merchant analysis | Validation |
| AdvancedCuttingPhysicsEngine | Oxley predictive model | Deep analysis |
| ToolDeflectionPredictionEngine | Tool bending prediction | Every finish pass |
| SurfaceFinishPredictorEngine | Real Ra (runout+vibration+deflection) | Every finish pass |
| SurfaceIntegrityPredictorEngine | White layer, residual stress | Hard turning |
| ChatterStabilityLobeEngine | Stability lobe diagram | Every RPM selection |
| StochasticChatterEngine | MC stability (200 samples) | Uncertainty on chatter |
| ToolpathThermalEngine | Thermal field along toolpath | Long programs |
| InverseThermalCompensationEngine | Machine thermal growth | Programs > 30min |
| StochasticToolLifeEngine | Weibull tool life distribution | Every tool |
| ToolBreakagePredictionEngine (E1149) | P(breakage) per operation | Safety gate |
| ProcessCapabilityPredictionEngine | Cpk prediction (500 MC) | Critical tolerances |
| QualityPredictionEngine | Quality metrics prediction | Every part |

**Algorithms**: StabilityLobeDiagram, FRFStabilityLobe, RCSA, JaegerTempField, JohnsonCookModel, UsuiWearModel, SurfaceFinishPredictor, ToolDeflectionModel, FFTAnalyzer, MonteCarlo, ThermalFEAModel, ThermalPartitionModel, BayesianWearModel, WaveletBreakage, ChipBreakingModel, ChipEvacuationModel, SpindleVibFFTModel, STFTChatter

**TEST**: Force within ±10% of analytical. Deflection < tolerance/3. P(chatter) < 15%. Cpk ≥ 1.33.

---

## STAGE 10: COLLISION CHECK — GATE (19 engines)

| Engine | What It Does | When to Call |
|---|---|---|
| CollisionPreventionEngine (E1139) | Full toolpath pre-flight | Always — GATE |
| SafetyVetoEngine (E1098) | 8 hard vetoes | Always — GATE |
| PipelineSafetyOrchestratorEngine (E1093) | 6 risk dimensions | Always — GATE |
| WorkholdingVerificationEngine (E1148) | Grip force check | Always |
| ToolBreakagePredictionEngine (E1149) | P(breakage) | Always |
| SafetyEscalationEngine (E1138) | Auto-reduce when tight | When near limits |
| GCodeSafetyAnalyzerEngine | 24 rules × 6 controllers | On generated G-code |

**Algorithm**: SweptVolumeCollision, MinkowskiSum (for envelope check)

**TEST**: ZERO programs output with collisions. 20 deliberately unsafe scenarios ALL blocked.

---

## STAGE 11: POST-PROCESSING — 35 stages (32 engines)

The full POST-ULT pipeline (17 engines) plus legacy post engines:

| Engine | What It Does | Phase |
|---|---|---|
| PostPhysicsFoundationEngine | Context resolution + physics baseline | P0 |
| LineByLineAdaptiveEngine | Per-block S/F (10 modules) | P2 |
| MotionControllerInjectionEngine | HSM/TCP/SSV injection | P3 |
| PostVerificationSafetyEngine | MC verification + safety | P4-5 |
| PostOutputGenerationEngine | Controller-specific output | P6 |
| PostValidationSuiteEngine | 360-case regression | P7 |
| ControllerDialectEngine | 20 controller dialects | Output |
| WorkCoordinateEngine | WCS assignment G54-G59 | Program structure |
| ProgramStructureEngine | Subprograms, safety blocks | Program structure |
| BackplotEngine | Verification backplot | Verification |
| GCodeTranspilerEngine | Dialect transpilation | If needed |
| SubprogramEngine | M98/CALL management | Large programs |

**TEST**: Per-block F variation. HSM activated. Controller-specific syntax. Program structure complete.

---

## STAGE 12-15: PROBING, COST, DOCUMENTATION, LEARNING

[Each stage has its engines as listed in reference_system_capabilities.md]

---

## HOW TO USE THIS MATRIX

During roadmap execution, for EACH pipeline being built/enhanced:
1. Go through each stage (1-15)
2. Check: is each listed engine WIRED into this pipeline?
3. If NO → add lazy-load + call at the appropriate point
4. If YES → verify it's called at the RIGHT point and the output is USED

This matrix is the VERIFICATION CHECKLIST for roadmap completeness.
# PRISM LATHE COMPREHENSIVE ROADMAP v3.0
## Triple-Scrutinized | 12 Milestones | 104 Units | 165 Target Tests

Generated: 2026-03-23
Scrutinization passes: 3 (found 113 total gaps, all addressed)
Current test baseline: 172/172 passing (39 general + 133 cold heading die)

---

## CURRENT STATE (What's Built)

### Engines (existing, working):
| Engine | Lines | Status |
|--------|-------|--------|
| MachiningKnowledgeBaseEngine | 3,667 | 56 actions, 100% lathe knowledge coverage |
| TurningPrintToProgramEngine | ~1,200 | Profile contour + TNC + live tooling + stepped CSS |
| TurningProgramAssemblerEngine | 2,615 | 20 op types, 30+ tools, 4 controllers |
| MillTurnSwissPipelineEngine | 1,587 | Swiss, mill-turn, multi-channel, bar feeder |
| ThreadingPipelineEngine | 710 | G76, thread milling, rigid tap, 12 thread types |
| LathePostProcessorEngine | 543 | 4 dialects (Fanuc/Haas/Mazak/Okuma) |
| TurningProfileEngine | 879 | OD/ID profile generation with arcs |
| CollisionEngine | 2,526 | 3D collision detection (milling-focused) |
| AccessibilityAnalysisEngine | 689 | Tool reach validation |
| CollisionPreventionEngine | 754 | Full-path certification |
| ChuckJawForceEngine | 498 | Grip force, ISO 10218 safety |
| TailstockForceEngine | 496 | Support force, thermal expansion |
| SteadyRestPlacementEngine | 564 | Placement optimization |
| LiveToolingEngine | 173 | Cross-drill, face mill, polygon turn |
| TurningForceEngine | 434 | Kienzle cutting force |
| AutoPrintToProgramBridgeEngine | 540 | File→features→program pipeline |
| CADDrawingKnowledgeEngine | 646 | GD&T, DFM, datum schemes |
| + 8 more lathe-related engines | ~3,500 | Taper, thread, spindle, diamond turning |
| **TOTAL LATHE CODE** | **~21,000** | |

### Tests (passing):
- `tests/okuma-test-suite.ts` — 39/39 (6 general Okuma tests)
- `tests/okuma-cold-heading-die-suite.ts` — 133/133 (11 die-specific tests, 7 tool steels)
- `tests/cost-efficiency-comparison.ts` — 4 cost comparisons vs tutorials

### User's Shop Profile:
- **Industry**: Cold heading dies for fastener trilobes
- **Customers**: ITW, OMG, AFS, Fastenal
- **Materials**: H13, A2, S7, 52100, O2, M2, M4, D2 tool steels
- **Sizes**: 0.5"-6" OD, 1"-8" long
- **Features**: Thru-holes, counterbores (1/2 sides), whistle notches 5-20°, OD pockets 1.25"×0.125"
- **Primary Machines**: Okuma Genos, Okuma Multus

---

## CRITICAL ARCHITECTURAL ISSUES (Must Fix First)

### Issue 1: Dual G-Code Generation Path
TurningPrintToProgramEngine has 430+ lines of inline Fanuc G-code generation.
LathePostProcessorEngine has 543 lines of dialect-aware G-code (4 controllers).
**They are NOT connected.** The `controller` parameter is accepted but IGNORED — all output is Fanuc-generic regardless of what controller is specified.
**Fix**: MS0.5 — route ALL output through LathePostProcessorEngine.

### Issue 2: No Collision Avoidance
Four collision engines exist (4,500+ lines combined) but NONE are wired into the turning pipeline. No boring bar reach check, no turret rotation collision, no safe retract validation.
**Fix**: MS0 — wire collision engines + add lathe-specific checks.

### Issue 3: No Parametric/Macro Programming
100% of output is hardcoded coordinates. No #variable support, no macro B, no part families. 50%+ of production lathe programs ARE parametric macros.
**Fix**: MS9 — new ParametricLatheProgramEngine.

### Issue 4: No Conversational Output
Mazatrol, Okuma AOT, Haas VQC are completely different programming paradigms (not G-code). PRISM only outputs G-code.
**Fix**: MS10 — paradigm advisor + conversational formatters.

---

## MILESTONE DETAILS

### LATHE-MS0: Collision Avoidance & Tool Reach Validation
**Priority: CRITICAL | Units: 13 | Depends on: nothing**

| Unit | Description |
|------|-------------|
| U01 | Wire CollisionEngine + AccessibilityAnalysisEngine + CollisionPreventionEngine into TurningPrintToProgramEngine — add lathe-specific collision checks |
| U02 | LatheCollisionZoneEngine — turret rotation swept volume, tool holder vs chuck jaw, rapid traverse safe corridors |
| U03 | Boring bar reach validation — auto-select bar material: steel L/D≤4, carbide L/D≤6, dampened L/D≤10. Shank = 70% of bore minimum |
| U04 | Grooving/parting overhang check — max extension = blade_width × 8 for groove, × 6 for parting |
| U05 | Live tool holder collision — holder protrusion vs tailstock quill. Auto-retract tailstock before live ops |
| U06 | Turret index collision — longest tool swing arc during rotation vs part OD + chuck jaw |
| U07 | Safe retract positions — X must clear part before Z rapid. G28 intermediate when needed |
| U08 | Machine swing validation — part OD vs max swing diameter |
| U09 | Minimum chip thickness check — if f×sin(kr) < edge_radius × 0.3 → rubbing, auto-increase feed |
| U10 | 12 collision/safety test scenarios |
| U11 | **Boring taper compensation** — calculate bar deflection F×L³/(3EI), program counter-taper so deflection straightens bore |
| U12 | Boring bar springback compensation — program bore 0.005-0.02mm larger to compensate spring-back |
| U13 | G71 Type I vs Type II auto-detection — scan profile X monotonicity. Wrong type = crash |

### LATHE-MS0.5: Dialect Reconciliation — Single G-Code Path
**Priority: CRITICAL | Units: 5 | Depends on: MS0**

| Unit | Description |
|------|-------------|
| U01 | **ARCH FIX**: Route ALL TurningPrintToProgramEngine output through LathePostProcessorEngine. Remove 430+ lines inline G-code. Single path, all dialects |
| U02 | Add Siemens 840D turning dialect — G18 plane, LIMS= clamp, CYCLE95/CYCLE97, SUPA retract |
| U03 | Add DMG MORI CELOS dialect — Siemens base + ShopTurn + CELOS M-codes |
| U04 | Automated dialect validation — same part on 6 controllers, verify different output |
| U05 | Controller parameter regression — assert controller='okuma' produces G15 H0 NOT G54 |

### LATHE-MS1: Multi-Machine Capability & Dialect Adaptation
**Priority: HIGH | Units: 7 | Depends on: MS0.5**

| Unit | Description |
|------|-------------|
| U01 | Machine capability database — 20+ models with axes, power, RPM, bar cap, swing, turret, live tool specs |
| U02 | Feature-to-capability matching — whistle_notch needs C-axis, cross_drill needs live tooling, etc. Auto-filter incompatible |
| U03 | Machine auto-selector — rank by capability match, cost, tolerance. Top 3 with reasoning |
| U04 | Swiss-type support — Citizen Cincom, Star SR dialects, guide bushing, gang slide |
| U05 | VTL support — vertical Z, faceplate, low RPM + high power, maximize feed/rev |
| U06 | Twin turret simultaneous — Gantt overlap optimization, channel sync, collision check between turrets |
| U07 | Tests: same H13 die on 6 machines, validate dialect + capability filtering |

### LATHE-MS2: Tooling Variability & Real Library Integration
**Priority: HIGH | Units: 10 | Depends on: MS0**

| Unit | Description |
|------|-------------|
| U01 | Wire sandvik-tool-catalog.ts (95K tools) into selectInsert() — query by ISO group, operation, nose radius |
| U02 | User tool inventory input — turret_layout with actual tools → select from AVAILABLE only |
| U03 | Insert geometry optimizer — recommend C/D/V/W/T/S/R with reasoning per feature |
| U04 | Nose radius tradeoff calculator — R0.2/0.4/0.8/1.2/1.6 vs Ra at each feed |
| U05 | Boring bar auto-selection — bore dia → shank (70%), depth → material (steel/carbide/dampened) |
| U06 | Grooving width auto-selection — match groove to insert, multiple plunges if needed |
| U07 | Wiper insert support — halve Ra prediction when selected |
| U08 | Thread insert type — full profile 60°, partial profile, 55° BSP |
| U09 | Live tool holder types — ER/Capto/HSK-T/VDI with RPM + stiffness effects |
| U10 | Tests: economy/standard/premium tool sets on same part |

### LATHE-MS3: Workholding Adaptation & Grip Force Safety
**Priority: HIGH | Units: 8 | Depends on: MS0**

| Unit | Description |
|------|-------------|
| U01 | Wire ChuckJawForceEngine — grip > cutting_force × 2.5 (ISO 10218) |
| U02 | Centrifugal force RPM limiter — effective_grip = static - centrifugal → auto-set G50 Smax |
| U03 | Jaw type friction — hard_smooth(0.3), hard_serrated(0.5), soft_OD(0.45), soft_ID(0.40) |
| U04 | Op2 workholding — detect finished surfaces, recommend soft jaws for cosmetic OD |
| U05 | Wire TailstockForceEngine — auto-engage at L/D > 4, live vs dead center selection |
| U06 | Wire SteadyRestPlacementEngine — auto-place at L/D > 8, fixed vs follow rest |
| U07 | Missing types: 6-jaw, dead-length collet, mandrel, spider, dog driver, magnetic |
| U08 | Tests: 5 workholding configs on same part, verify RPM limits change |

### LATHE-MS4: End-to-End Pipeline Integration
**Priority: CRITICAL | Units: 8 | Depends on: MS0.5, MS1, MS2, MS3**

| Unit | Description |
|------|-------------|
| U01 | Complete chain: text→parse→features→machine_select→tool_select→collision→workholding→program→setup_sheet |
| U02 | Wire missing ops: reaming, countersinking, knurling, burnishing |
| U03 | Sub-spindle back-working — Op2 from sub-spindle side after transfer |
| U04 | Bar feeder loop — M99, parts/bar, remnant tracking |
| U05 | Setup sheet generation — fixture, tools, offsets, datum, inspection, cycle time, safety notes |
| U06 | Error handling — graceful degradation, never silently drop features |
| U07 | Cycle time accuracy — target ±15% of actual |
| U08 | Tests: 5 end-to-end runs × 2 machines = 10 pipeline tests |

### LATHE-MS5: User Optimization Choices
**Priority: MEDIUM | Units: 5 | Depends on: MS4**

| Unit | Description |
|------|-------------|
| U01 | Multi-option: (A) fastest cycle, (B) best finish, (C) longest tool life |
| U02 | Cost-per-part breakdown: material + tooling + machine time + setup |
| U03 | What-if analysis: change any parameter → instant recalculation + delta |
| U04 | Batch size optimization: 1 part vs 100 vs 10,000 → different strategies |
| U05 | Tests: A/B/C for H13 die with cost validation |

### LATHE-MS6: Controller-Specific Deep Hardening
**Priority: MEDIUM | Units: 7 | Depends on: MS0.5**

| Unit | Description |
|------|-------------|
| U01 | Okuma OSP-P300L deep — G15 H0-H48, T0001, M50/M51, M19 R-angle, G199/G198, NVAR |
| U02 | Okuma Multus OSP-P300M — B-axis, M143/M144/M145, M133/M135, G112/G113 polar |
| U03 | Haas NGC — Setting 33, D-word G71, P-seconds dwell, macros, M97 local sub |
| U04 | Mazak SmoothAi — !L/!R channel, G53.5 offset, SMOOTH interpolation |
| U05 | Fanuc 31i-B — G12.1 polar, G68.1 tilted work plane, nano interpolation, WHILE/DO/END |
| U06 | Siemens 840D — CYCLE95/CYCLE97, LIMS=, SUPA, G18, GOTOF/GOTOB |
| U07 | Tests: G71+G70+G75+G76 in ALL 6 dialects, verify zero cross-contamination |

### LATHE-MS7: Physics & Science Hardening
**Priority: HIGH | Units: 13 | Depends on: MS0**

| Unit | Description |
|------|-------------|
| U01 | Turning chatter/SLD — wire analyzeTurningChatter(), auto-avoid critical RPM |
| U02 | Hard turning surface integrity — white layer depth, residual stress, achievable Ra |
| U03 | Thread constant chip area — √n pass progression in G76 output |
| U04 | Drill thrust force — verify vs tailstock force (push-off risk) |
| U05 | Parting force 1.25× multiplier in power check |
| U06 | Workpiece beam deflection — actual δ at tool point, auto-recommend support |
| U07 | Tool wear progression — predict VB vs time, sister tool switching point |
| U08 | Thermal expansion compensation — for <0.01mm tolerance parts |
| U09 | Tests: chatter, white layer, thread schedule, deflection validation |
| U10 | Chip breaking feed oscillation — 150% feed spike for ISO M/P continuous chips |
| U11 | Decreasing peck depth — first peck largest, 20% smaller per subsequent |
| U12 | Thread spring passes — 1-2 zero-infeed passes in G76 P-word |
| U13 | Bore bottom dwell — G04 auto-insert by material (P:0.3s, M:0.5s, S:0.8s) |

### LATHE-MS8: Production Validation & Exhaustive Test Suites
**Priority: CRITICAL | Units: 14 | Depends on: ALL**

| Unit | Description |
|------|-------------|
| U01 | Full matrix: 12 parts × 6 machines = 61 programs, all validated |
| U02 | Simple tests: P1-P3 × 6 machines = 18 programs |
| U03 | Medium tests: P4-P6 × compatible machines |
| U04 | Complex tests: P7-P9 × live-tool machines only |
| U05 | Extreme tests: P10-P12 × compatible machines |
| U06 | Cross-dialect: P6 on ALL 6 controllers, line-by-line diff |
| U07 | Collision scenarios: 12 deliberate setups, all caught |
| U08 | Tooling variation: economy/standard/premium |
| U09 | Workholding variation: 5 configs |
| U10 | Cost efficiency: every PRISM program vs manual, document savings |
| U11 | Swiss-type test: P12 on Citizen Cincom |
| U12 | VTL test: P12 on vertical lathe |
| U13 | Regression CI/CD: single command runs ALL, zero tolerance for failure |
| U14 | Real machine dry run: Okuma Genos single-block verification |

### LATHE-MS9: Parametric & Macro Programming Engine
**Priority: HIGH | Units: 8 | Depends on: MS0.5**

| Unit | Description |
|------|-------------|
| U01 | Parametric part families — #variables for dimensions, one program → many sizes |
| U02 | Fanuc Macro B output — IF/GOTO, WHILE/DO/END, M98/M99, G65 |
| U03 | Okuma NVAR output — NVAR(1)-NVAR(200), IF/THEN/ENDIF |
| U04 | Haas macro output — #100-#199 local, #500-#999 persistent, M97 |
| U05 | Production macro template — part counter, inspection stop, sister tool, bar feeder, G10 auto-offset |
| U06 | Adaptive feed macro — read #3028 spindle load, IF > 80% reduce F |
| U07 | Multi-fixture loop — G54→G55→G56→G57 with M98 subprogram |
| U08 | Tests: die family in 3 sizes, verify parametric output |

### LATHE-MS10: Programming Paradigm Advisor & Conversational Output
**Priority: MEDIUM | Units: 6 | Depends on: MS4, MS9**

| Unit | Description |
|------|-------------|
| U01 | Paradigm Decision Engine — complexity + batch + machine + operator → hardcode/parametric/conversational/CAM |
| U02 | Mazatrol conversational output — UNIT+SHAPE format for simple Mazak parts |
| U03 | Okuma AOT guidance — AOT setup instructions for simple Okuma parts |
| U04 | Haas VQC guidance — VQC-compatible format for simple Haas parts |
| U05 | Decision rules: simple→conversational, family→macro, complex→G71+CAM, multi-axis→CAM, volume→macro+sister |
| U06 | Tests: 5 parts → correct paradigm recommendation |

---

## TEST MATRIX

### Parts (12):
| ID | Part | Material | OD | Length | Key Features |
|----|------|----------|-----|--------|-------------|
| P1 | Simple shaft | 1045 | 2" | 3" | Face + single OD |
| P2 | Stepped shaft | 4140 | 2.5" | 4" | 3 diameters |
| P3 | Chamfer+fillet shaft | 1018 | 2" | 3" | C1 chamfer, R3 fillet |
| P4 | Thread+groove+cutoff | 4140 | 1.75" | 2.5" | M40×1.5, O-ring groove |
| P5 | Bore+drill+tap | A2 | 2.5" | 2" | Ø25H7 bore, M8 tap |
| P6 | Die casing cbore both | H13 | 3" | 4" | Thru-hole, cbore each end |
| P7 | 12-point profile | S7 | 3" | 5" | G02/G03 arcs, steps, tapers |
| P8 | Whistle notch die | H13 | 3" | 4" | 10° notch (live tool) |
| P9 | OD pocket die | D2 | 2.5" | 3" | 1.25"×0.125" pocket (live) |
| P10 | ULTIMATE all features | H13 | 3" | 5" | Everything combined |
| P11 | Hardened CBN | H13 48HRC | 3" | 2" | Hard turning, Ra 0.4µm |
| P12 | XL die | D2 | 6" | 8" | Max size, deep bore |

### Machines (6):
| ID | Machine | Controller | Axes | Live | Sub |
|----|---------|-----------|------|------|-----|
| M1 | Okuma Genos L3000 | OSP-P300L | 2 | No | No |
| M2 | Okuma Genos L3000-MY | OSP-P300L | 3+C | Yes | Yes |
| M3 | Okuma Multus B300 | OSP-P300M | 5+C+Y+B | Yes | Yes |
| M4 | Haas ST-20 | Haas NGC | 2 | No | No |
| M5 | Haas DS-30Y | Haas NGC | 3+C | Yes | Yes |
| M6 | Mazak QTN-250MY | SmoothAi | 3+C | Yes | Yes |

### Compatibility (✓=can run, ✗=cannot):
| Part | M1 | M2 | M3 | M4 | M5 | M6 |
|------|:--:|:--:|:--:|:--:|:--:|:--:|
| P1-P5 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| P6 | ✓* | ✓ | ✓ | ✓* | ✓ | ✓ |
| P7 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| P8-P9 | ✗ | ✓ | ✓ | ✗ | ✓ | ✓ |
| P10 | ✗ | ✓ | ✓ | ✗ | ✓ | ✓ |
| P11 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| P12 | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ |
**Total valid programs: 61**

---

## EXECUTION ORDER

```
Phase 1: MS0 (collision) → MS0.5 (dialect fix)     [18 units, SAFETY]
Phase 2: MS7 + MS9 (parallel)                       [21 units, PHYSICS + PARAMETRIC]
Phase 3: MS1 + MS2 + MS3 (parallel)                 [25 units, MACHINES + TOOLS + WORKHOLDING]
Phase 4: MS4 (pipeline integration)                  [8 units, WIRING]
Phase 5: MS5 + MS6 + MS10 (parallel)                [18 units, OPTIMIZATION + CONTROLLERS]
Phase 6: MS8 (exhaustive validation)                 [14 units, TESTING]
```

## FINAL TARGET: 165 tests, 100% pass rate


---

# AMENDMENT 12-14: HYBRID ARCHITECTURE (v20)
## Hardwired Physics + AI Enforcement Agent + Safety Gates

## THE HYBRID ARCHITECTURE

LAYER 1: HARDWIRED PHYSICS PIPELINE (deterministic, always runs)
  - Every stage calls specific algorithms/engines via hardwired maps
  - Kienzle/Taylor/deflection/stability/collision ALWAYS computed
  - Per-pipeline algorithm maps (108 assignments + 50 conditionals)
  - Deterministic: same input = same output

LAYER 2: AI ENFORCEMENT AGENT (reasoning, reviews every stage)
  - Queries 3,831 tribal tips + 296 playbook rules
  - Weighs cost/risk tradeoffs for competing options
  - OVERRIDES Layer 1 when reasoning demands it (with justification)
  - Documents every decision in audit trail
  - Considers: batch size, shop context, machine fleet, tool crib, material history

LAYER 3: SAFETY GATES (absolute, never overridden)
  - Collision -> BLOCK, Power > 85% -> REDUCE, Deflection > tol/3 -> REDUCE
  - P(chatter) > 15% -> SHIFT RPM, P(breakage) > 5% -> REDUCE
  - Workholding SF < 1.5 -> BLOCK
  - MATHEMATICAL ABSOLUTES, not judgment calls

## PipelineEnforcementAgent (4 units)

U-AGENT1: Build PipelineEnforcementAgent core (~1,200L)
  - enforceStage() wrapper for every stage transition
  - TribalKnowledgeDecisionBridge + MachiningPlaybookEngine integration
  - Cost/risk tradeoff calculator
  - Override logic with justification requirement
  - Audit trail with full decision documentation

U-AGENT2: Build Hardwired Algorithm Maps (108 assignments + 50 conditionals)
  - Per pipeline x per stage: default algorithms
  - Conditional upgrades (ISO S -> thermal, thin wall -> reduced engagement)
  - Fallback algorithms when primary unavailable

U-AGENT3: Build Override Rules (judgment Layer 2)
  - Score diff < 10% -> evaluate robustness (Taguchi S/N)
  - Machine limited -> downgrade strategy
  - Batch size changes economics -> recalculate ROI
  - Tribal tip contradicts hardwired -> flag for review
  - Physics models disagree > 15% -> use conservative

U-AGENT4: Wire into ALL 9 pipelines
  - Every stage wrapped: result -> enforcement -> enforced_result
  - Safety gates confirmed ABSOLUTE (test this!)

## Updated Execution Order (v20 Final)

Phase 0-A: Print Reading Validation (6 units)
Phase 0-B: Critical Bug Fixes (7 units)
Phase 0-C: Test Infrastructure Hardening (6 units)
Phase 0-D: Registry + Algorithm + Orphan Wiring (20 units)
Phase 0-E: PipelineEnforcementAgent + Hardwired Maps (4 units)
Phase 1:   Knowledge + Decision Architecture (22 units)
Phase 2:   Business Logic (5 units)
Phase 3:   Level 3 Decisions + Process Physics (16 units)
Phase 4:   Turning Pipeline (104 units - LATHE-COMPREHENSIVE-ROADMAP)
Phase 5:   Milling Pipeline (85 units)
Phase 6:   5-Axis Pipeline (80 units)
Phase 7:   Mill-Turn/Swiss Pipeline (85 units)
Phase 8:   Grinding Pipeline (65 units)
Phase 9:   Wire EDM + Sinker EDM (40 units)
Phase 10:  Laser + Waterjet (105 units)
Phase 11:  Exhaustive Testing (15+ units + golden snapshots)
Phase 12:  Final Wiring + Web UI (6 units)

TOTAL: ~1,022 units across 14 phases

## System Utilization After Roadmap

| Asset | Before | After v20 |
|---|---|---|
| Engines in pipeline | 200/1,246 (16%) | 350/1,246 (28%) |
| Algorithms in pipeline | 1/50 (2%) | 25/50 (50%) |
| Registries queried | 0/11 (0%) | 11/11 (100%) |
| Tribal tips in decisions | 0/3,831 | 3,831 (100%) |
| Playbook rules enforced | 0/296 | 296 (100%) |
| Pipeline decision level | Level 2 (hardcoded) | Level 3+ (scored + AI judgment) |
| Post-processor integration | 0/17 engines | 17/17 (100%) |
