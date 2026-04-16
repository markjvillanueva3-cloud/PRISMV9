# WEDM-CALIBRATE — Wire EDM Calibration & Production Readiness Roadmap

## Track: WEDM-CALIBRATE | Version: 1.0.0 | Created: 2026-04-10 | RGS Pipeline v10
## Goal: Close wire EDM from 72% to 90-100% production readiness by calibrating
##       engine output against REAL shop programs and validating end-to-end flow
## Total Milestones: 5 | Total Units: 21 | Estimated Sessions: 8
## Omega Target: 1.0

---

## CONTEXT — Why This Roadmap Exists

WEDM-UNIFIED M1-M7 (38 units) built the wire EDM feature set to functional completeness.
Current honest assessment: **72/100**. The gap is NOT in engine count or physics coverage
(29 engines, 1,679 tests) — it's in **calibration against real production data**.

### What We Have (Real Shop Data)
- `data/programs/wire-edm/ITW SHAKEPROOF 500-30540-24000-04.NC` — D2, 25.4mm, 4-pass, Mitsubishi M800
  - Offsets: H1=0.0085", H2=0.0064", H3=0.0058", H4=0.0053"
  - Feeds: F0.12, F0.24, F0.21, F0.20 ipm
  - E-codes: E1221-E1224
- `data/programs/wire-edm/NOZE TEST.NC` — SS taper, 5-pass, UV axis, Mitsubishi M800
  - Feeds: F0.16, F0.23, F0.26, F0.30 ipm
  - E-codes: E2821-E2825
  - UV range: ±0.048" U, ±0.003" V
- `C:/Users/Mark Villanueva/Box/WIRE EDM/` — 100+ customer folders, 244 Mastercam files
- `data/reference/WEDM_PUBLISHED_BENCHMARKS.json` — industry benchmark compilation

### Gap Analysis (from 72/100 assessment)
| Gap | Impact | Current | Target |
|-----|--------|---------|--------|
| Parser never tested on real shop NC | 15% | 0% | 100% |
| Engine output never compared to shop params | 15% | 0% | 100% |
| End-to-end DXF→program never validated | 10% | 0% | 100% |
| Mitsubishi M-codes incomplete in post-processor | 5% | 70% | 100% |
| No operator comparison/diff workflow | 5% | 0% | 100% |

Closing these 5 gaps adds +50% → 72% + 50% × effort efficiency → target 90-100%

---

## ENFORCEMENT INTEGRATION (all sessions)

**Hooks active during execution:**
- PRE-LEVEL: knowledge-consult (verify WEDM engine docs read), context-retention
- POST-LEVEL: stub-detector (BLOCKS placeholder returns), test-quality-gate, constants-checker
- COMPACT-LEVEL: review-gate, wiring-gate, forge-triple-gate, session-audit-agent
- POST-COMPACT: Feature Cascade (SESSION_ARTIFACTS.json auto-written)

**MCP Lifecycle:**
```
SESSION START: prism_session:context_boot → dispatcher_map → memory_recall
DURING WORK:   prism_session:auto_checkpoint (every 5-10 calls)
SESSION END:   prism_session:memory_save → system_snapshot → checkpoint_enhanced
```

---

## EXISTING ASSETS (DO NOT REBUILD)

| Asset | Location | Notes |
|-------|----------|-------|
| WireEDMProgramParserEngine | src/engines/WireEDMProgramParserEngine.ts | 5 dialects (Mitsubishi, Fanuc, Sodick, Makino, AgieCharmilles) |
| WEDMFeedbackCalibrationEngine | src/engines/WEDMFeedbackCalibrationEngine.ts | Bayesian update, ±30% per feedback |
| EDMPostProcessGCodeEngine | src/engines/EDMPostProcessGCodeEngine.ts | 5 controller post-processors |
| WEDMPrintToProgramEngine | src/engines/WEDMPrintToProgramEngine.ts | DXF→Settings→MultiPass→GCode pipeline |
| DXFGeometryParserEngine | src/engines/DXFGeometryParserEngine.ts | Arc-preserving parser for WEDM |
| EDMEngine | src/engines/EDMEngine.ts | Core wireEDM() calculator |
| Published benchmarks | data/reference/WEDM_PUBLISHED_BENCHMARKS.json | Industry data compilation |
| Real NC programs | data/programs/wire-edm/*.NC | 3 programs from shop |

---

## MILESTONE 0: REAL PROGRAM PARSER VALIDATION
**ID:** WEDM-CAL-MS0 | **Units:** 4 | **Sessions:** 1-2
**Intent:** Prove WireEDMProgramParserEngine correctly extracts parameters from real shop NC programs

### SESSION 1: Parse & Validate Real Programs (U-CAL01..U-CAL04)
SMART CONFIG: Role=WEDM Calibration Engineer | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=70%
KNOWLEDGE:
  - WireEDMProgramParserEngine.ts — parser implementation
  - data/programs/wire-edm/*.NC — real shop programs
  - src/engines/EDMPostProcessGCodeEngine.ts — Mitsubishi dialect config
  - mitsubishi-wedm-knowledge.json — controller knowledge

INTENT: After this session, we can parse ANY Mitsubishi NC program and extract exact cutting parameters.

WORK:

  **U-CAL01: Parse ITW SHAKEPROOF — Parameter Extraction Test**
  → 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  - Read ITW SHAKEPROOF NC file
  - Call WireEDMProgramParserEngine.parse() on it
  - Write test: extracted offsets MUST match H1=0.0085, H2=0.0064, H3=0.0058, H4=0.0053
  - Write test: extracted feeds MUST match F0.12, F0.24, F0.21, F0.20
  - Write test: extracted E-codes MUST be E1221-E1224
  - Write test: 4 passes detected, correct pass types (rough/skim)
  - Write test: M-codes extracted (M20, M21, M78, M58, M80-M85, M90, M91)
  - Fix any parser bugs found — real data is the truth
  FILES_CREATED: src/__tests__/wedm-real-program-parse.test.ts
  FILES_MODIFIED: src/engines/WireEDMProgramParserEngine.ts (if fixes needed)
  ABORT_CRITERIA: Parser extracts <50% of parameters correctly | Build breaks | >3 test failures
  ROLLBACK: git checkout -- src/engines/WireEDMProgramParserEngine.ts

  **U-CAL02: Parse NOZE TEST — Taper & UV Extraction Test**
  → 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  - Parse NOZE TEST NC file
  - Write test: UV axis moves detected (taper program)
  - Write test: 5 passes with E2821-E2825
  - Write test: feed rate progression F0.16→F0.30
  - Write test: UV range ±0.048" U, ±0.003" V extracted
  - Validate taper angle calculation from UV data
  FILES_MODIFIED: src/__tests__/wedm-real-program-parse.test.ts (add tests)
  ABORT_CRITERIA: Taper detection fails | UV extraction wrong by >10%
  ROLLBACK: git checkout -- src/__tests__/wedm-real-program-parse.test.ts

  **U-CAL03: Expand NC Program Corpus**
  → 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  - Scan C:/Users/Mark Villanueva/Box/WIRE EDM/ for .NC files
  - Copy 5-10 diverse programs (different materials, thicknesses, pass counts)
  - Catalog each: material, thickness, passes, controller, special features
  - Write data/reference/SHOP_NC_PROGRAM_CATALOG.json with metadata
  FILES_CREATED: data/programs/wire-edm/[5-10 NC files], data/reference/SHOP_NC_PROGRAM_CATALOG.json
  ABORT_CRITERIA: <3 usable NC programs found | All programs same material/thickness
  ROLLBACK: rm data/programs/wire-edm/[new files]

  **U-CAL04: Parser Regression Suite**
  → 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  - Parse ALL programs in data/programs/wire-edm/
  - Create golden snapshot: for each program, save extracted parameters to JSON
  - Write regression test: parser output matches golden snapshot exactly
  - Any parser fix from U-CAL01/02 must not break other programs
  FILES_CREATED: data/state/PARSER_GOLDEN_SNAPSHOTS.json
  FILES_MODIFIED: src/__tests__/wedm-real-program-parse.test.ts (add regression suite)
  ABORT_CRITERIA: >2 programs fail to parse | Regression breaks existing parser tests
  ROLLBACK: git checkout -- src/__tests__/wedm-real-program-parse.test.ts

EXIT GATE: ✓ ITW offsets extracted within 0.0001" | ✓ NOZE UV extracted within 0.001" | ✓ 5+ programs parsed | ✓ Golden snapshots saved | omega_floor >= 0.85

FORGE-TRIPLE:
  PROTECTIVE HOOK: wedm-parser-regression (blocks parser changes that break golden snapshots)
  MCP ACTION: prism_edm:wedm_parse_real_program (parse any NC file and return structured data)
  SKILL: /wedm-parse (parse a real NC program and display extracted parameters)

/compact checkpoint

---

## MILESTONE 1: ENGINE CALIBRATION VS SHOP DATA
**ID:** WEDM-CAL-MS1 | **Units:** 5 | **Sessions:** 2
**Intent:** Calibrate PRISM engine constants so output matches real shop parameters within 15%
**Depends on:** WEDM-CAL-MS0

### SESSION 2: Offset & Speed Calibration (U-CAL05..U-CAL07)
SMART CONFIG: Role=WEDM Calibration Engineer | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=70%
KNOWLEDGE:
  - WEDMFeedbackCalibrationEngine.ts — Bayesian calibration
  - EDMEngine.ts — wireEDM() core calculator
  - WireEDMSettingsEngine.ts — speed/offset models
  - EDMMultiPassStrategyEngine.ts — pass energy cascade
  - data/reference/WEDM_PUBLISHED_BENCHMARKS.json — industry data
  - PARSER_GOLDEN_SNAPSHOTS.json — real shop parameters

INTENT: After this session, engine predictions for D2 25mm match ITW SHAKEPROOF within 15%.

WORK:

  **U-CAL05: Map Real Offsets to Engine Kerf Model**
  → 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  - ITW SHAKEPROOF real offsets: 0.216mm, 0.163mm, 0.147mm, 0.135mm (converted from inches)
  - Run EDMEngine.wireEDM({thickness: 25.4, iso: "H", wire: 0.25, num_cuts: 4})
  - Compare engine kerf/offset prediction vs real offsets
  - Write test: deviation < 20% for each pass
  - If deviation > 20%: feed into WEDMFeedbackCalibrationEngine with real data
  - Write calibration test: post-calibration deviation < 15%
  FILES_CREATED: src/__tests__/wedm-calibration-vs-shop.test.ts
  FILES_MODIFIED: src/engines/WEDMFeedbackCalibrationEngine.ts (if calibration params need tuning)
  ABORT_CRITERIA: Deviation >50% pre-calibration | Calibration diverges | Build breaks
  ROLLBACK: git checkout -- src/engines/WEDMFeedbackCalibrationEngine.ts

  **U-CAL06: Map Real Feed Rates to Engine Speed Model**
  → 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  - ITW real feeds: 3.05, 6.10, 5.33, 5.08 mm/min (converted from ipm)
  - Run engine: compare cutting_speed predictions per pass
  - NOZE TEST feeds: 4.06, 5.84, 6.60, 7.62 mm/min — validate speed-vs-pass pattern
  - Write test: engine speed within 20% of real for each pass
  - If outside: use WEDMFeedbackCalibrationEngine.calibrate() with real observations
  FILES_MODIFIED: src/__tests__/wedm-calibration-vs-shop.test.ts (add feed tests)
  ABORT_CRITERIA: Speed deviation >60% | Calibration doesn't converge
  ROLLBACK: git checkout -- src/__tests__/wedm-calibration-vs-shop.test.ts

  **U-CAL07: Calibration Validation — Cross-Material**
  → 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  - After calibrating on D2 (ITW) and SS (NOZE), validate on other ISO groups
  - Run engine for P, M, K, N groups with published benchmark ranges
  - Verify calibration on H/M didn't break P/K/N/S predictions
  - Write test: all 6 ISO groups within 30% of published range (from WEDM_PUBLISHED_BENCHMARKS.json)
  FILES_MODIFIED: src/__tests__/wedm-calibration-vs-shop.test.ts
  ABORT_CRITERIA: Any ISO group >50% off published | Regression in existing benchmark tests
  ROLLBACK: git checkout -- src/__tests__/wedm-calibration-vs-shop.test.ts

/compact checkpoint

### SESSION 3: Multi-Pass & Energy Calibration (U-CAL08..U-CAL09)
SMART CONFIG: Role=WEDM Physics Engineer | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=70%

WORK:

  **U-CAL08: Multi-Pass Energy Cascade Validation**
  → 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  - ITW 4-pass energy progression: E1221→E1224 (E-code = condition set)
  - Map E-code groups to pulse parameters using Mitsubishi knowledge base
  - Run EDMMultiPassStrategyEngine for D2/25mm/4-pass
  - Compare predicted energy cascade (Toenshoff γ=0.20-0.35) vs real E-code progression
  - Validate: pass 1 highest energy, each subsequent pass lower
  - Write test: energy ratio between passes within 25% of Toenshoff model
  FILES_MODIFIED: src/__tests__/wedm-calibration-vs-shop.test.ts
  ABORT_CRITERIA: Energy cascade inverted | >40% deviation from Toenshoff
  ROLLBACK: git checkout -- src/__tests__/wedm-calibration-vs-shop.test.ts

  **U-CAL09: Calibration Report Generator**
  → 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  - Create WEDM_CALIBRATION_REPORT.json summarizing:
    - Per-parameter deviation (offset, speed, energy) pre and post calibration
    - Per-ISO-group benchmark compliance
    - Calibration constants applied (k_ra, eta_mrr adjustments)
    - Confidence intervals from Bayesian updates
  - Write engine: WEDMCalibrationReportEngine.generate()
  - Wire to dispatcher: prism_edm:wedm_calibration_report
  FILES_CREATED: src/engines/WEDMCalibrationReportEngine.ts, data/state/WEDM_CALIBRATION_REPORT.json
  FILES_MODIFIED: src/tools/dispatchers/edmDispatcher.ts
  ABORT_CRITERIA: Report shows >30% deviation on any critical parameter
  ROLLBACK: git checkout -- src/engines/WEDMCalibrationReportEngine.ts src/tools/dispatchers/edmDispatcher.ts

EXIT GATE: ✓ D2 offset deviation < 15% | ✓ D2 speed deviation < 20% | ✓ All 6 ISO groups within published ±30% | ✓ Calibration report generated | omega_floor >= 0.85

FORGE-TRIPLE:
  PROTECTIVE HOOK: wedm-calibration-regression (blocks engine changes that worsen calibration)
  MCP ACTION: prism_edm:wedm_calibration_report (generate calibration deviation report)
  SKILL: /wedm-calibrate (run calibration against shop data and show results)

/compact checkpoint

---

## MILESTONE 2: MITSUBISHI DIALECT HARDENING
**ID:** WEDM-CAL-MS2 | **Units:** 4 | **Sessions:** 1-2
**Intent:** Generated Mitsubishi G-code matches real shop programs in format and conventions
**Depends on:** WEDM-CAL-MS0

### SESSION 4: Mitsubishi Post-Processor Enhancement (U-CAL10..U-CAL13)
SMART CONFIG: Role=CNC Post-Processor Engineer | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=70%
KNOWLEDGE:
  - EDMPostProcessGCodeEngine.ts — current post-processor
  - data/programs/wire-edm/ITW SHAKEPROOF*.NC — real Mitsubishi output
  - data/programs/wire-edm/NOZE TEST.NC — real Mitsubishi taper output
  - mitsubishi-wedm-knowledge.json — controller knowledge base

INTENT: After this session, generated Mitsubishi programs would be accepted by a Mitsubishi M800 controller without edits.

WORK:

  **U-CAL10: Complete Mitsubishi M-Code Coverage**
  → 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  - Audit real programs for M-codes not in post-processor:
    - M20 (thread wire), M21 (cut wire) — verify these are in post-processor
    - M78 (fill tank), M58 (drain tank) — add if missing
    - M80/M81 (water on/off), M82/M83 (wire on/off), M84/M85 (power on/off)
    - M90/M91 (adaptive control on/off)
  - Add all missing M-codes to Mitsubishi ControllerPostConfig
  - Write test: generated program includes correct M-code sequence
  FILES_MODIFIED: src/engines/EDMPostProcessGCodeEngine.ts
  FILES_CREATED: src/__tests__/wedm-mitsubishi-dialect.test.ts
  ABORT_CRITERIA: >2 M-codes can't be mapped | Build breaks
  ROLLBACK: git checkout -- src/engines/EDMPostProcessGCodeEngine.ts

  **U-CAL11: E-Code Group Selection Logic**
  → 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  - Real programs show E-code groups are material/thickness dependent:
    - E122X = D2 tool steel group
    - E282X = stainless steel taper group
  - Implement E-code group selection: material + thickness + cut type → E-group
  - Use Mitsubishi technology table references from knowledge base
  - Write test: D2/25mm selects E122X range, SS/taper selects E282X range
  FILES_MODIFIED: src/engines/EDMPostProcessGCodeEngine.ts, src/__tests__/wedm-mitsubishi-dialect.test.ts
  ABORT_CRITERIA: E-code mapping covers <3 material groups
  ROLLBACK: git checkout -- src/engines/EDMPostProcessGCodeEngine.ts

  **U-CAL12: Program Structure Match**
  → 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  - Real Mitsubishi program structure:
    ```
    (HEADER)
    M78 M78          ; fill tank twice
    M82 M84 M80      ; wire on, power on, water on
    M90               ; adaptive on
    G90               ; absolute
    H175=...          ; master offset
    H1=... + H175     ; pass offset
    E____             ; cutting condition
    G42 H1            ; wire comp right, offset register
    [GEOMETRY]
    G40               ; cancel comp
    G4 X5.0           ; dwell
    M91               ; adaptive off
    M85 M81 M83       ; power off, water off, wire off
    M21               ; cut wire
    [REPEAT for each pass]
    M58               ; drain tank
    M02               ; program end
    ```
  - Generate a program for D2/25mm/4-pass and compare structure to ITW SHAKEPROOF
  - Write test: generated structure matches real program section-by-section
  FILES_MODIFIED: src/__tests__/wedm-mitsubishi-dialect.test.ts
  ABORT_CRITERIA: Structural mismatch >3 sections
  ROLLBACK: git checkout -- src/__tests__/wedm-mitsubishi-dialect.test.ts

  **U-CAL13: UV Taper Program Generation**
  → 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  - Real NOZE TEST uses G1 X... Y... U... V... for taper
  - Verify EDMPostProcessGCodeEngine generates UV coordinates for taper cuts
  - Compare generated UV values to NOZE TEST reference
  - Write test: taper program has UV on every cutting move
  - Write test: UV magnitudes within 20% of reference for similar taper angle
  FILES_MODIFIED: src/__tests__/wedm-mitsubishi-dialect.test.ts, src/engines/EDMPostProcessGCodeEngine.ts (if UV generation needs fixing)
  ABORT_CRITERIA: UV generation missing or inverted
  ROLLBACK: git checkout -- src/engines/EDMPostProcessGCodeEngine.ts

EXIT GATE: ✓ All 14 Mitsubishi M-codes present | ✓ E-code groups for 3+ materials | ✓ Program structure matches real | ✓ UV taper generates correctly | omega_floor >= 0.85

FORGE-TRIPLE:
  PROTECTIVE HOOK: wedm-mitsubishi-format (blocks post-processor changes that break Mitsubishi format)
  MCP ACTION: prism_edm:wedm_generate_mitsubishi_program (Mitsubishi-specific program generation)
  SKILL: /wedm-mitsubishi (generate Mitsubishi M800 program from part specs)

/compact checkpoint

---

## MILESTONE 3: END-TO-END PIPELINE VALIDATION
**ID:** WEDM-CAL-MS3 | **Units:** 4 | **Sessions:** 2
**Intent:** Prove the full DXF→PRISM→NC program pipeline produces operator-acceptable output
**Depends on:** WEDM-CAL-MS0, WEDM-CAL-MS1, WEDM-CAL-MS2

### SESSION 5: Pipeline vs Shop Output (U-CAL14..U-CAL15)
SMART CONFIG: Role=WEDM Applications Engineer | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=70%
KNOWLEDGE:
  - WEDMPrintToProgramEngine.ts — full pipeline
  - DXFGeometryParserEngine.ts — DXF input
  - PARSER_GOLDEN_SNAPSHOTS.json — real program parameters
  - WEDM_CALIBRATION_REPORT.json — calibrated constants

INTENT: After this session, running a DXF through PRISM produces a program that an operator would recognize.

WORK:

  **U-CAL14: Pipeline Run — D2 Blanking Die (vs ITW SHAKEPROOF)**
  → 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  - Create a simple DXF matching ITW SHAKEPROOF geometry (hex profile + bore)
  - Run through WEDMPrintToProgramEngine with D2/25.4mm/4-pass/Mitsubishi
  - Compare generated program to ITW SHAKEPROOF NC:
    - Pass count matches (4)
    - Offset values within 20%
    - Feed rates within 25%
    - E-code group correct (E122X)
    - M-code sequence correct
    - G-code structure (G90, G42, G40, G4) correct
  - Write comprehensive comparison test
  FILES_CREATED: data/test-dxf/itw-shakeproof-profile.dxf, src/__tests__/wedm-pipeline-vs-shop.test.ts
  ABORT_CRITERIA: Pass count wrong | Offsets off by >50% | M-code sequence wrong
  ROLLBACK: git checkout -- src/__tests__/wedm-pipeline-vs-shop.test.ts

  **U-CAL15: Pipeline Run — Taper Part (vs NOZE TEST)**
  → 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  - Create DXF for NOZE TEST geometry with taper specification
  - Run through pipeline with SS/taper/5-pass/Mitsubishi
  - Compare generated program to NOZE TEST NC:
    - 5 passes detected
    - UV axis present in output
    - Feed rate pattern matches (increasing)
    - E-code group correct (E282X)
  - Write comparison test
  FILES_MODIFIED: src/__tests__/wedm-pipeline-vs-shop.test.ts
  ABORT_CRITERIA: UV axis missing | Pass count wrong | E-code group wrong
  ROLLBACK: git checkout -- src/__tests__/wedm-pipeline-vs-shop.test.ts

/compact checkpoint

### SESSION 6: Multi-Part Pipeline Benchmark (U-CAL16..U-CAL17)
SMART CONFIG: Role=WEDM Validation Engineer | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=70%

WORK:

  **U-CAL16: 5-Part Pipeline Benchmark**
  → 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  - Run pipeline for 5 diverse scenarios:
    1. D2 25mm, 4-pass, Mitsubishi (ITW reference)
    2. SS taper, 5-pass, Mitsubishi (NOZE reference)
    3. Carbide 10mm, 6-pass, Sodick (published BM-003)
    4. Aluminum 25mm, 2-pass, Fanuc (published BM-002)
    5. Ti-6Al-4V 5mm, 3-pass, Makino (published BM-005)
  - For each: validate pass count, speed range, finish prediction, program structure
  - Create pipeline benchmark report: data/state/PIPELINE_BENCHMARK_REPORT.json
  FILES_CREATED: src/__tests__/wedm-pipeline-benchmark.test.ts, data/state/PIPELINE_BENCHMARK_REPORT.json
  ABORT_CRITERIA: >1 pipeline fails completely | >2 scenarios off by >40%
  ROLLBACK: git checkout -- src/__tests__/wedm-pipeline-benchmark.test.ts

  **U-CAL17: Pipeline Error Handling**
  → 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  - Test pipeline with edge cases:
    - Non-conductive material (ceramic) → should fail with clear error
    - Blind pocket (no through-cut) → should fail with explanation
    - Thickness beyond max (>300mm) → should warn
    - Wire diameter mismatch (0.05mm with 100mm thickness) → should reject
    - Empty DXF → should fail gracefully
    - Malformed G-code in parsed program → should report issues
  - Write error handling tests
  FILES_CREATED: src/__tests__/wedm-pipeline-errors.test.ts
  ABORT_CRITERIA: Any edge case causes crash instead of clean error
  ROLLBACK: git checkout -- src/__tests__/wedm-pipeline-errors.test.ts

EXIT GATE: ✓ D2 pipeline matches ITW within 25% | ✓ Taper pipeline generates UV | ✓ 5-part benchmark all pass | ✓ 6 error cases handled | omega_floor >= 0.85

FORGE-TRIPLE:
  PROTECTIVE HOOK: wedm-pipeline-regression (blocks pipeline changes that break benchmark)
  MCP ACTION: prism_edm:wedm_pipeline_benchmark (run full pipeline benchmark)
  SKILL: /wedm-benchmark (run pipeline benchmark and show results)

/compact checkpoint

---

## MILESTONE 4: OPERATOR TOOLS & PRODUCTION GATE
**ID:** WEDM-CAL-MS4 | **Units:** 4 | **Sessions:** 2
**Intent:** Give operators tools to compare PRISM output to their programs and close the final gap to 90+
**Depends on:** WEDM-CAL-MS3

### SESSION 7: Comparison & Feedback Tools (U-CAL18..U-CAL19)
SMART CONFIG: Role=WEDM Applications Engineer + UI | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=70%
KNOWLEDGE:
  - WireEDMProgramParserEngine.ts — parsing
  - WEDMFeedbackCalibrationEngine.ts — calibration loop
  - WEDMSetupSheetEngine.ts — operator-facing output
  - WEDM_CALIBRATION_REPORT.json — current calibration state

INTENT: After this session, an operator can load their program, compare to PRISM output, and give feedback.

WORK:

  **U-CAL18: Program Comparison Engine**
  → 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  - Create WEDMProgramComparisonEngine:
    - Input: real NC program (text) + PRISM pipeline output
    - Parse both into structured WireEDMProgram
    - Compare: pass count, offsets, feeds, E-codes, M-codes, geometry, UV
    - Output: per-parameter deviation (%), overall match score, recommendations
    - Highlight: "Your program uses F0.12 for rough, PRISM suggests F0.08 — 33% deviation"
  - Wire to dispatcher: prism_edm:wedm_compare_programs
  - Write 10+ tests
  FILES_CREATED: src/engines/WEDMProgramComparisonEngine.ts, src/__tests__/wedm-program-comparison.test.ts
  FILES_MODIFIED: src/tools/dispatchers/edmDispatcher.ts, src/schemas/wedmPipelineActionSchemas.ts
  ABORT_CRITERIA: Comparison misses >2 parameter types | Build breaks
  ROLLBACK: git checkout -- src/engines/WEDMProgramComparisonEngine.ts src/tools/dispatchers/edmDispatcher.ts

  **U-CAL19: Deviation Dashboard Data**
  → 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  - Create web panel: WireEdmCalibrationPanel.tsx
    - Shows: per-parameter deviation chart (bar chart like CostBreakdown)
    - Color coding: <10% green, 10-25% yellow, >25% red
    - Shows calibration history (when last calibrated, confidence intervals)
    - "Calibrate from program" button → triggers feedback loop
  - Add to CalculatorPage under wire_edm mode
  FILES_CREATED: web/src/components/calculator/WireEdmCalibrationPanel.tsx
  FILES_MODIFIED: web/src/pages/CalculatorPage.tsx
  ABORT_CRITERIA: Panel doesn't render | Deviation data incorrect
  ROLLBACK: git checkout -- web/src/pages/CalculatorPage.tsx

/compact checkpoint

### SESSION 8: Final Production Gate (U-CAL20..U-CAL21)
SMART CONFIG: Role=WEDM Production Validation | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=70%

WORK:

  **U-CAL20: Tighten Benchmark Tolerances**
  → 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  - Current benchmark tests use 30-70% tolerance bands
  - After calibration, tighten:
    - Area rate: ±30% → ±20%
    - Kerf width: ±20% → ±15%
    - Surface finish: ±70% → ±30%
    - D2 25mm speed: ±70% → ±25%
  - Update wedm-benchmark-vs-published.test.ts with tighter bands
  - Run full test suite — all must pass with tightened tolerances
  FILES_MODIFIED: src/__tests__/wedm-benchmark-vs-published.test.ts
  ABORT_CRITERIA: >3 tests fail with tightened tolerances | Regression in 30-part suite
  ROLLBACK: git checkout -- src/__tests__/wedm-benchmark-vs-published.test.ts

  **U-CAL21: Final Production Readiness Score**
  → 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  - Run complete validation:
    1. All 1,679+ WEDM tests pass
    2. Benchmark tests pass with tightened tolerances
    3. Pipeline benchmark: 5/5 scenarios pass
    4. Real program parsing: all golden snapshots match
    5. Calibration: all ISO groups within 20% of published
    6. Mitsubishi programs match real shop format
    7. Error handling: all edge cases clean
  - Generate data/state/WEDM_FINAL_READINESS.json:
    - Overall score (target: 90+)
    - Per-dimension scores
    - Calibration confidence intervals
    - Known limitations / future work
  - Update data/state/WEDM_PRODUCTION_READINESS.json with final numbers
  FILES_CREATED: data/state/WEDM_FINAL_READINESS.json
  FILES_MODIFIED: data/state/WEDM_PRODUCTION_READINESS.json
  ABORT_CRITERIA: Overall score < 85 | Any dimension < 70
  ROLLBACK: git checkout -- data/state/WEDM_PRODUCTION_READINESS.json

EXIT GATE: ✓ Overall score >= 90 | ✓ All benchmark tests pass at tightened tolerances | ✓ Pipeline 5/5 | ✓ Parser golden match | ✓ Mitsubishi format match | omega_floor >= 0.90

FORGE-TRIPLE:
  PROTECTIVE HOOK: wedm-production-gate (blocks WEDM changes that drop readiness below 90)
  MCP ACTION: prism_edm:wedm_production_readiness (compute current readiness score)
  SKILL: /wedm-readiness (show current wire EDM production readiness dashboard)

---

## DEPENDENCY GRAPH

```
WEDM-CAL-MS0 (Parser Validation)
    ├──→ WEDM-CAL-MS1 (Engine Calibration)
    │        └──→ WEDM-CAL-MS3 (End-to-End Pipeline)
    └──→ WEDM-CAL-MS2 (Mitsubishi Dialect)
              └──→ WEDM-CAL-MS3 (End-to-End Pipeline)
                        └──→ WEDM-CAL-MS4 (Operator Tools + Gate)
```

## SCORING PROJECTION

| Dimension | Before (72) | After MS0 | After MS1 | After MS2 | After MS3 | After MS4 |
|-----------|-------------|-----------|-----------|-----------|-----------|-----------|
| Parser tested on real | 0% | 95% | 95% | 95% | 95% | 95% |
| Engine calibrated | 0% | 0% | 90% | 90% | 90% | 95% |
| E2E pipeline validated | 0% | 0% | 0% | 0% | 90% | 95% |
| Mitsubishi format | 70% | 70% | 70% | 95% | 95% | 95% |
| Operator tools | 0% | 0% | 0% | 0% | 0% | 85% |
| **Overall** | **72** | **79** | **84** | **87** | **91** | **94** |
