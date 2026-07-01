# POST PROCESSOR REVENUE MAXIMIZATION ROADMAP
## PP-REV-MS0 through PP-REV-MS7 | 8 Milestones | 42 Units | 13 Sessions | Est. 20-30 Session-Hours

> **🗄️ ARCHIVED (2026-04-17) — SUPERSEDED BY MASTER ROADMAP**
>
> All 8 PP-REV milestones + 42 units + 4-tier pricing ($0/$79/$199/$499) consolidated into Stage 9.
> **Current canonical roadmap:** `H:/prism/PP-MASTER-UNIFIED-ROADMAP-2026-04-16.md` (v1.1).
>
> Consolidation record: PP-MASTER §XXIII.3 — all PP-REV work → Stage 9 (Revenue + Tiers).

**Authority (historical):** This roadmap governed post-processor product commercialization.
**Owner:** Claude (backend + wiring) | Codex (frontend + visualization)
**Target:** Turn existing 16+ PP engines into a paid product with demo-able value per milestone.
**Pricing:** Free ($0) → Pro ($79/mo) → Production ($199/mo) → Enterprise ($499/mo+)
**Cross-Track Dependency:** Requires PP-MS0 through PP-MS8 COMPLETE (original PP track)

---

## MCP SESSION PROTOCOL (MANDATORY — EVERY SESSION)

SESSION START: `context_boot → dispatcher_map → memory_recall("pp-revenue") → system_snapshot → action_search "<goal>"`
DURING WORK: `auto_checkpoint (every 5-10 calls) → action_search → tool_route_best`
SESSION END: `memory_save → system_snapshot → checkpoint_enhanced`
REVIEW: `/prism-review` at every session exit + `/scrutinize` for engine modifications
TESTING: `npx vitest run [file]` after every test file creation
COMPACT: `/compact` after every 3 units (enforced by hook)
4-LOOP: Every unit follows BUILD → SCRUTINIZE → GAP FILL → TIE UP

---

## UNIVERSAL UNIT TEMPLATE (applies to ALL 42 units)

Every unit MUST include:
- FILES_CREATED and/or FILES_MODIFIED
- ABORT_CRITERIA (≥3 measurable conditions that trigger automatic stop)
- ROLLBACK: `git checkout [files] && npx vitest run` to restore baseline

## UNIVERSAL EXIT GATE TEMPLATE (applies to ALL 8 milestones)

Every exit gate MUST include:
- `[ ] All pre-existing PP tests (764+) still passing` (regression)
- `[ ] npx tsc --noEmit = 0 errors` (build)
- `[ ] New tests ≥ [N] passing` (coverage)
- `[ ] Action completes in < 5s for programs under 5,000 lines` (performance)
- OMEGA_FLOOR: ≥ 1.0 (per user preference)

---

## DEPENDENCY GRAPH (OPTIMIZED per scrutiny agent #8)
```
PP-REV-MS0 (The Demo — Before/After Report) ← ROOT
    ↓
PP-REV-MS1 (Setup Sheet + Cycle Time) ← PAYWALL GATE: ship Pro tier here
    ↓                 ↓
PP-REV-MS2            PP-REV-MS6 (Program Diff — relaxed from MS3)
(Tool Opt)                ↓
    ↓                     |
PP-REV-MS3                |
(HSM+Probing)             |
    ↓                     |
PP-REV-MS4                |
(Prove-Out)               |
    ↓                     ↓
PP-REV-MS7 (Pricing + Paywall + Launch) ← depends on ALL
    ↑
PP-REV-MS5 (Cross-CAM + AI — relaxed from MS2, now depends on MS0)
```

---

## EXISTING ENGINE ASSETS (DON'T REBUILD — WIRE THESE)
| Engine | LOC | Purpose | Wire To |
|--------|-----|---------|---------|
| PostProcessorPipelineEngine | 3,300 | 45-stage per-block physics | Core pipeline |
| PostProcessorFeedOptimizerEngine | 400 | Chip thin, arc, plunge | Feed overlay |
| SetupSheetFromGCodeEngine | 1,156 | Tool list, ops, markdown | Setup sheet API |
| CycleTimeEstimatorEngine | 800+ | 6 controllers, trapezoidal | Cycle time API |
| ToolChangeOptimizationEngine | 400+ | Resequence, sharing | Tool opt API |
| ToolMagazineOptimizationEngine | 200+ | Pocket placement | Magazine API |
| PostValidationSuiteEngine | 1,200 | Diff, backplot, A/B | Before/after |
| AdvancedPostProcessorEngine | 600+ | HSM, NURBS, adaptive | HSM injection |
| ProbeRoutineGeneratorEngine | 400+ | Renishaw, CYCLE977, TCH | Probing API |
| SubprogramStructureEngine | 500+ | Pattern detect, extract | Subprogram API |
| ProveOutModeEngine | 471 | Derating, optional stops | Prove-out API |
| MasterPostProcessorEngine | 846 | Cross-CAM injection | Cross-CAM API |
| RLPostProcessorEngine | 300+ | Q-learning, feedback | AI learning API |
| PostSelectionEngine | 597 | 15-feature auto-select | Feature toggle |
| GCodeOptimizationEngine | 304 | General G-code opt | Optimization layer |
| ProgramCompareEngine | 300+ | Diff analysis | Program diff |

---

# PP-REV-MS0: THE DEMO — Before/After Optimization Report
**Sessions: 3 | Units: 6 | Priority: P0-CRITICAL | DEPENDS_ON: none (ROOT)**
**Revenue tier: PRO — this is the #1 sales pitch**

The single highest-ROI feature: take any G-code, run it through the pipeline, produce a one-page report showing exactly what PRISM improved and by how much.

### SESSION PP-REV-MS0-S1: Optimization Report Engine
**SMART CONFIG:** Role=R2-Engine + R7-Product | Model=OPUS | Effort=MAX | Context_Budget=80K

**KNOWLEDGE SOURCES:**
- PostProcessorPipelineEngine (45 stages, per-block physics)
- PostValidationSuiteEngine (computeDiff, runABComparison, runBackplot)
- CycleTimeEstimatorEngine (per-controller kinematics)
- PostProcessorFeedOptimizerEngine (feed optimization overlay)

**INTENT:** User uploads G-code → gets a report: "23% cycle time saved, 3 tool life risks found, 47s of air cutting detected, 2 missing HSM codes inserted."

**WORK:**
U-REV01: OptimizationReportEngine — aggregates pipeline results into structured report
  - Input: original G-code + pipeline output
  - Sections: Executive Summary, Per-Tool Breakdown, Feed/Speed Changes (histogram), Force Analysis, Cycle Time Delta, Recommendations
  - Uses: PostValidationSuiteEngine.computeDiff() for line-level changes
  - Uses: PostValidationSuiteEngine.runABComparison() for cycle time delta
  - Uses: CycleTimeEstimatorEngine for accurate per-machine timing
  - Output: OptimizationReport { summary, per_tool, cycle_time, recommendations }
  - FILES_CREATED: [src/engines/OptimizationReportEngine.ts]
  - ABORT_CRITERIA: [report has zero data, cycle time estimate is NaN, force data missing]

U-REV02: Report format: Markdown + JSON + one-page HTML
  - Markdown: printable summary with tables
  - JSON: structured data for web UI consumption
  - HTML: self-contained one-page report with inline CSS (no external deps)
  - Include: PRISM logo, date, machine/material context, confidence scores
  - FILES_MODIFIED: [src/engines/OptimizationReportEngine.ts]

U-REV03: Wire to productDispatcher + tests
  - Action: ppg_optimization_report (input: gcode, machine, material, tools)
  - Returns: { report_markdown, report_json, report_html, summary }
  - Key-value extractor: cycle_time_saved_pct, tools_analyzed, recommendations_count
  - Tests: 15+ covering all report sections, edge cases (empty program, no material)
  - FILES_MODIFIED: [src/tools/dispatchers/productDispatcher.ts]
  - FILES_CREATED: [src/__tests__/pp-optimization-report.test.ts]

**EXIT GATE PP-REV-MS0-S1:**
- [ ] Report engine produces markdown/JSON/HTML for any valid G-code input
- [ ] Cycle time delta is within 15% of CycleTimeEstimatorEngine's standalone prediction
- [ ] Per-tool breakdown shows S/F changes with reasons
- [ ] ppg_optimization_report action returns report in all 3 formats
- [ ] All pre-existing PP tests (764+) still passing (regression gate)
- [ ] Action completes in < 5s for programs under 5,000 lines (performance)
- OMEGA_FLOOR: >= 1.0

### SESSION PP-REV-MS0-S2: Web UI — Report Page
**SMART CONFIG:** Role=R5-Frontend + R7-Product | Model=OPUS | Effort=MAX | Context_Budget=80K

**WORK:**
U-REV04: OptimizationReportPage.tsx — upload G-code → see report
  - File upload dropzone (accept .nc, .tap, .mpf, .h, .eia, .gcode)
  - Machine selector (brand → model → controller auto-populated from 549-machine catalog)
  - Material selector (ISO group → specific material from 2,957-material DB)
  - "Optimize" button → calls ppg_optimization_report
  - FILES_CREATED: [web/src/pages/OptimizationReportPage.tsx]

U-REV05: Report display components
  - SummaryCard: cycle time saved %, force reduction %, tool life improvement %
  - FeedHistogram: bar chart of original vs optimized feeds per block
  - ToolBreakdown: table per tool (T1, T2...) with S/F changes and force data
  - RecommendationList: actionable items (missing HSM, TSC needed, etc.)
  - DownloadButton: download optimized program + report PDF
  - FILES_CREATED: [web/src/components/optimization-report/]

U-REV06: Route wiring + integration test
  - Add /optimize route to shellCatalog.ts
  - Add to navigation sidebar
  - E2E test: upload sample program → verify report renders → download works
  - FILES_MODIFIED: [web/src/components/shell/shellCatalog.ts, web/src/routes/]

**EXIT GATE PP-REV-MS0-S2:**
- [ ] User can upload G-code, select machine/material, click Optimize, see report
- [ ] Report shows real cycle time savings (not zero, not NaN)
- [ ] Download produces optimized .nc + report .html
- [ ] Works for Haas, Fanuc, Siemens controllers minimum
- [ ] All pre-existing PP tests (764+) still passing (regression gate)
- [ ] Action completes in < 5s for programs under 5,000 lines (performance)
- OMEGA_FLOOR: >= 1.0
- FORGE-TRIPLE: hook=enforce-report-accuracy | action=ppg_optimization_report | skill=/optimize

---

# PP-REV-MS1: Setup Sheet + Cycle Time
**Sessions: 3 | Units: 6 | Priority: P0 | DEPENDS_ON: PP-REV-MS0**
**Revenue tier: PRO — every shop needs setup sheets**

### SESSION PP-REV-MS1-S1: Wire SetupSheetFromGCodeEngine
**SMART CONFIG:** Role=R2-Engine | Model=OPUS | Effort=MAX | Context_Budget=60K

**WORK:**
U-REV07: Wire SetupSheetFromGCodeEngine to productDispatcher
  - Action: ppg_setup_sheet_auto (input: gcode, controller, machine_brand, machine_model)
  - Engine extracts: tools, operations, work offsets, feeds/speeds, coolant needs
  - Output: SetupSheetResult { tools[], operations[], offsets[], markdown, metadata }
  - FILES_MODIFIED: [src/tools/dispatchers/productDispatcher.ts]

U-REV08: Wire CycleTimeEstimatorEngine to productDispatcher
  - Action: ppg_cycle_time (input: gcode, controller, machine_kinematics?)
  - Uses per-controller block processing time, spindle accel, tool change time
  - Returns: CycleTimeResult { total_sec, cutting_sec, rapid_sec, tool_change_sec, bottlenecks[] }
  - Action: ppg_cycle_time_compare (input: gcode, machines[]) — compare across machines
  - Returns: MachineCompareResult { entries[], fastest, recommendation }
  - FILES_MODIFIED: [src/tools/dispatchers/productDispatcher.ts]

U-REV09: Tests for setup sheet + cycle time
  - 20+ tests: tool extraction accuracy, cycle time vs hand calculation, multi-machine compare
  - FILES_CREATED: [src/__tests__/pp-setup-sheet-cycletime.test.ts]

### SESSION PP-REV-MS1-S2: Enhanced Setup Sheet Output
**SMART CONFIG:** Role=R2-Engine + R7-Product | Model=OPUS | Effort=HIGH | Context_Budget=60K

**WORK:**
U-REV10: Setup sheet enhancements
  - Add cycle time estimate to setup sheet
  - Add "machine comparison" section (if multiple machines available)
  - Add coolant requirements per operation
  - Add minimum tool lengths (from Z-depth analysis)
  - FILES_MODIFIED: [src/engines/SetupSheetFromGCodeEngine.ts]

U-REV11: Integrate into optimization report
  - Optimization report now includes: setup sheet section, cycle time section
  - "What you need before you start" = tools + offsets + coolant
  - "How long it will take" = cycle time with breakdown
  - FILES_MODIFIED: [src/engines/OptimizationReportEngine.ts]

U-REV12: Web UI — Setup Sheet tab in report page
  - Add "Setup Sheet" tab to OptimizationReportPage
  - Printable format with tool table, offset table, operation sequence
  - Download as standalone PDF/markdown
  - FILES_MODIFIED: [web/src/pages/OptimizationReportPage.tsx]

**EXIT GATE PP-REV-MS1:**
- [ ] Setup sheet auto-extracts tools, offsets, coolant from any G-code
- [ ] Cycle time prediction within 15% of manual estimate for 3-axis programs
- [ ] Machine comparison shows fastest machine for a given program
- [ ] Setup sheet integrated into optimization report
- [ ] All pre-existing PP tests (764+) still passing (regression gate)
- [ ] Action completes in < 5s for programs under 5,000 lines (performance)
- OMEGA_FLOOR: >= 1.0
- FORGE-TRIPLE: hook=enforce-setup-accuracy | action=ppg_setup_sheet_auto,ppg_cycle_time | skill=/setup-sheet

---

# PP-REV-MS2: Tool Optimization + Magazine Layout
**Sessions: 2 | Units: 4 | Priority: P1 | DEPENDS_ON: PP-REV-MS1**
**Revenue tier: PRODUCTION — saves real money per part**

### SESSION PP-REV-MS2-S1: Tool Change + Magazine Engines
**SMART CONFIG:** Role=R2-Engine | Model=OPUS | Effort=MAX | Context_Budget=60K

**WORK:**
U-REV13: Wire ToolChangeOptimizationEngine to productDispatcher
  - Action: ppg_tool_change_optimize (input: gcode, machine_config)
  - Resequences operations to minimize tool changes
  - Returns: ToolChangeResult { optimized_sequence[], changes_saved, time_saved_sec }

U-REV14: Wire ToolMagazineOptimizationEngine to productDispatcher
  - Action: ppg_magazine_layout (input: tools[], magazine_type, capacity)
  - Optimal pocket placement for minimum rotation time
  - Sister tool placement for automatic swap
  - Returns: MagazineLayout { assignments[], sister_placements[], rotation_time_sec }

U-REV15: Add tool optimization section to optimization report
  - "Tool Change Analysis: 4 unnecessary changes found, saving 16 seconds"
  - "Magazine Layout: optimal pocket assignment for your Haas VF-2 (20-tool carousel)"
  - FILES_MODIFIED: [src/engines/OptimizationReportEngine.ts]

U-REV16: Tests + web UI integration
  - 15+ tests for tool change optimization and magazine layout
  - Add "Tool Optimization" tab to report page
  - FILES_CREATED: [src/__tests__/pp-tool-optimization.test.ts]

**EXIT GATE PP-REV-MS2:**
- [ ] Tool change optimization reduces changes by ≥1 on multi-tool programs
- [ ] Magazine layout produces valid pocket assignments
- [ ] Optimization report shows tool change savings
- [ ] All pre-existing PP tests (764+) still passing (regression gate)
- [ ] Action completes in < 5s for programs under 5,000 lines (performance)
- OMEGA_FLOOR: >= 1.0
- FORGE-TRIPLE: hook=enforce-tool-opt | action=ppg_tool_change_optimize,ppg_magazine_layout | skill=/tool-optimize

---

# PP-REV-MS3: HSM + Probing + Sister Tooling
**Sessions: 3 | Units: 6 | Priority: P1 | DEPENDS_ON: PP-REV-MS2**
**Revenue tier: PRODUCTION**

### SESSION PP-REV-MS3-S1: Controller-Specific HSM Auto-Injection (90% built)
**SMART CONFIG:** Role=R2-Engine | Model=OPUS | Effort=MAX | Context_Budget=80K
**KNOWLEDGE:** AdvancedPostProcessorEngine.SMOOTHING_CODES, PostSelectionEngine.FEATURE_DATABASE, ProbeRoutineGeneratorEngine (Renishaw/CYCLE977/TCH PROBE), constants.ts (kienzleForce, taylorLife)
**INTENT:** User selects machine → features auto-recommended → HSM/probing/sister tools appear in output G-code

**WORK:**
U-REV17: Wire PostSelectionEngine into pipeline auto-config
  - Pipeline accepts `features: string[]` and auto-configures StageConfig
  - PostSelectionEngine.compute() result → stages map
  - User can override: enable/disable any feature
  - FILES_MODIFIED: [src/engines/PostProcessorPipelineEngine.ts]

U-REV18: Wire AdvancedPostProcessorEngine HSM/smoothing codes into output
  - Read AdvancedPostProcessorEngine.SMOOTHING_CODES per controller
  - Inject correct codes: G187 P{n} (Haas), CYCLE832 (Siemens), G05.1 Q1 (Fanuc)
  - Operation-aware: roughing=P1, semi=P2, finishing=P3
  - FILES_MODIFIED: [src/engines/PostProcessorPipelineEngine.ts]

U-REV19: Wire ProbeRoutineGeneratorEngine into pipeline
  - Stage 6.2 calls real engine instead of hardcoded G65 P9810
  - Controller-specific: Renishaw (Fanuc/Haas), CYCLE977 (Siemens), TCH PROBE (Heidenhain)
  - Auto-probe on tight-tolerance features (tolerance < 0.02mm)
  - FILES_MODIFIED: [src/engines/PostProcessorPipelineEngine.ts]

### SESSION PP-REV-MS3-S2: Sister Tooling + Tool Life
**SMART CONFIG:** Role=R2-Engine + R5-Frontend | Model=OPUS | Effort=MAX | Context_Budget=80K

**WORK:**
U-REV20: Wire AdvancedPostProcessorEngine tool management into pipeline
  - Sister tool call-up logic (T+100 pattern)
  - Tool life monitoring macro injection (Fanuc M-codes, Haas T-group)
  - Break detection probe call after each tool
  - FILES_MODIFIED: [src/engines/PostProcessorPipelineEngine.ts]

U-REV21: Feature toggle UI
  - Web component: FeatureTogglePanel with 15 features from PostSelectionEngine
  - Each feature: name, description, auto-score, enabled/disabled toggle, risk level
  - Auto-recommendation: green/yellow/red based on job context
  - FILES_CREATED: [web/src/components/ppg/FeatureTogglePanel.tsx]

U-REV22: Tests covering HSM + probing + sister tools
  - Verify G187 injected for Haas when tolerance < 0.05mm
  - Verify CYCLE977 for Siemens probing
  - Verify sister tool T+100 pattern in output
  - FILES_CREATED: [src/__tests__/pp-advanced-features.test.ts]

**EXIT GATE PP-REV-MS3:**
- [ ] HSM codes injected per controller for finishing operations
- [ ] Probe routines generated with controller-correct syntax
- [ ] Sister tool logic produces valid G-code for Fanuc/Haas
- [ ] Feature toggle panel shows 15 features with auto-recommendations
- [ ] All pre-existing PP tests (764+) still passing (regression gate)
- [ ] Action completes in < 5s for programs under 5,000 lines (performance)
- OMEGA_FLOOR: >= 1.0
- FORGE-TRIPLE: hook=enforce-feature-injection | action=ppg_feature_configure | skill=/features

---

# PP-REV-MS4: Prove-Out Workflow + Air-Cut Detection
**Sessions: 3 | Units: 6 | Priority: P1 | DEPENDS_ON: PP-REV-MS3**
**Revenue tier: PRODUCTION**

### SESSION PP-REV-MS4-S1: Prove-Out to Production Workflow
**SMART CONFIG:** Role=R2-Engine | Model=OPUS | Effort=MAX | Context_Budget=80K
**KNOWLEDGE:** ProveOutModeEngine (ISO_GROUP_DERATING), RapidRepositionOptEngine.detectAirCuts() (existing air-cut detection), constants.ts (taylorLife, kienzleForce)
**INTENT:** Programmer clicks "Create Prove-Out" → gets safe first-article program. After running → clicks "Promote" → gets production program. Air cuts highlighted.

**WORK:**
U-REV23: Prove-out → production promotion engine
  - "Promote" action strips prove-out modifications (M01, feed derating, comments)
  - A/B comparison: prove-out vs production side-by-side
  - Operator sign-off field in report
  - FILES_CREATED: [src/engines/ProveOutPromotionEngine.ts]

U-REV24: Air-cut detection engine
  - Analyze G-code for cutting moves through air (tool above stock, retract-level cutting)
  - Z-level tracking: infer stock surface from cutting history
  - Detect: consecutive cuts at same Z with no material removal (spiral exit moves)
  - Report: total air-cut time, line numbers, suggested optimizations
  - FILES_CREATED: [src/engines/AirCutDetectionEngine.ts]

U-REV25: Wire both to report + dispatcher
  - Add air-cut section to optimization report
  - Actions: ppg_prove_out_promote, ppg_air_cut_detect
  - Tests: 20+

### SESSION PP-REV-MS4-S2: Web UI — Prove-Out + Air-Cut
**SMART CONFIG:** Role=R5-Frontend + R7-Product | Model=SONNET | Effort=HIGH | Context_Budget=60K

**WORK:**
U-REV26: Prove-out workflow page
  - Upload optimized program → click "Create Prove-Out" → download prove-out version
  - After first article success → click "Promote to Production" → download production version
  - Side-by-side compare view
  - FILES_CREATED: [web/src/pages/ProveOutWorkflowPage.tsx]

U-REV27: Air-cut visualization
  - Highlight air-cut blocks in program listing (red background)
  - Show total time wasted: "47 seconds of air cutting found"
  - "Remove air cuts" button → generates optimized program
  - FILES_MODIFIED: [web/src/pages/OptimizationReportPage.tsx]

U-REV28: Integration tests
  - E2E: upload → prove-out → promote → verify programs match
  - Air-cut detection on real-world programs (pocket, profile, drilling patterns)
  - FILES_CREATED: [src/__tests__/pp-prove-out-aircut.test.ts]

**EXIT GATE PP-REV-MS4:**
- [ ] Prove-out promotion strips all derating without losing program structure
- [ ] Air-cut detection identifies ≥ 90% of obvious air cuts on test programs
- [ ] Web UI workflow: upload → prove-out → first article → promote
- [ ] All pre-existing PP tests (764+) still passing (regression gate)
- [ ] Action completes in < 5s for programs under 5,000 lines (performance)
- OMEGA_FLOOR: >= 1.0
- FORGE-TRIPLE: hook=enforce-prove-out-accuracy | action=ppg_prove_out_promote,ppg_air_cut_detect | skill=/prove-out

---

# PP-REV-MS5: Cross-CAM Feature Injection + AI Learning
**Sessions: 3 | Units: 6 | Priority: P2 | DEPENDS_ON: PP-REV-MS2**
**Revenue tier: ENTERPRISE — unique PRISM moat**

### SESSION PP-REV-MS5-S1: Cross-CAM Feature Engine
**SMART CONFIG:** Role=R2-Engine | Model=OPUS | Effort=MAX | Context_Budget=80K
**KNOWLEDGE:** MasterPostProcessorEngine.CrossCamFeatureSet, RLPostProcessorEngine (Q-learning), constants.ts (seededNormalRNG — replace Math.random())
**INTENT:** PRISM detects which CAM system generated the G-code and injects best-of-breed features from OTHER CAM systems. RL feedback loop makes posts smarter over time.

**WORK:**
U-REV29: Wire MasterPostProcessorEngine cross-CAM features
  - Detect CAM source from G-code comments/structure
  - Inject best-of-breed features: SolidCAM chip thinning, hyperMILL collision, Fusion adaptive
  - Generate "features injected from [CAM system]" report section
  - FILES_MODIFIED: [src/engines/PostProcessorPipelineEngine.ts]

U-REV30: Wire RLPostProcessorEngine feedback loop
  - "Rate this program" button after running a part
  - Feedback: tool_broke/surface_rough/ran_great/too_slow
  - Q-learning updates formatting preferences per machine
  - FILES_MODIFIED: [src/engines/RLPostProcessorEngine.ts]

U-REV31: Tests + cross-CAM demo scenarios
  - Test: Mastercam input → PRISM adds SolidCAM-style chip thinning
  - Test: Fusion input → PRISM adds hyperMILL-style collision check
  - Test: RL feedback improves next optimization run
  - FILES_CREATED: [src/__tests__/pp-cross-cam-rl.test.ts]

### SESSION PP-REV-MS5-S2: AI Learning Dashboard
**SMART CONFIG:** Role=R2-Engine + R5-Frontend + R7-Product | Model=OPUS | Effort=MAX | Context_Budget=80K

**WORK:**
U-REV32: Learning dashboard web UI
  - Per-machine learning history: "Haas VF-2 — 47 programs optimized, learning score 78/100"
  - Feedback history: successful programs, failed programs, adjustments made
  - "What PRISM learned" explainer per machine
  - FILES_CREATED: [web/src/pages/LearningDashboardPage.tsx]

U-REV33: SubprogramStructureEngine integration
  - Auto-detect repeating patterns in G-code
  - Offer: "Convert 12 repeated bolt-circle patterns to M98 subprograms? Saves 340 lines."
  - Controller-native subprogram syntax (M98/M99, CALL/RET, CALL PGM)
  - FILES_MODIFIED: [src/engines/PostProcessorPipelineEngine.ts]

U-REV34: API endpoints for external integration
  - REST API: POST /api/v1/optimize — accepts G-code, returns optimized + report
  - REST API: POST /api/v1/feedback — accepts program ID + rating
  - REST API: GET /api/v1/machines/{id}/learning — returns learning state
  - FILES_CREATED: [src/routes/api-v1.ts]

**EXIT GATE PP-REV-MS5:**
- [ ] Cross-CAM injection detects source and applies relevant features
- [ ] RL feedback loop updates Q-values and measurably improves next run
- [ ] Subprogram extraction reduces program size by ≥ 10% on repetitive programs
- [ ] API endpoints return valid responses for all 3 routes
- [ ] All pre-existing PP tests (764+) still passing (regression gate)
- [ ] Action completes in < 5s for programs under 5,000 lines (performance)
- OMEGA_FLOOR: >= 1.0
- FORGE-TRIPLE: hook=enforce-cross-cam | action=ppg_cross_cam_inject,ppg_rl_feedback | skill=/cross-cam

---

# PP-REV-MS6: Program Diff + Revision Control
**Sessions: 2 | Units: 4 | Priority: P2 | DEPENDS_ON: PP-REV-MS3**
**Revenue tier: PRO**

### SESSION PP-REV-MS6-S1: Semantic Diff + Versioning
**SMART CONFIG:** Role=R2-Engine + R5-Frontend | Model=OPUS | Effort=MAX | Context_Budget=80K
**KNOWLEDGE:** ProgramCompareEngine, PostVersioningEngine (already wired: ppg_version_store/diff/history/retrieve in camDispatcher), constants.ts

**WORK:**
U-REV35: Wire ProgramCompareEngine + PostVersioningEngine
  - Action: ppg_program_diff (input: gcode_a, gcode_b)
  - Semantic diff: understands F500→F650 is a "feed rate increase", not just text change
  - Safety flags: highlight changes that cross safety thresholds (RPM > machine max, etc.)
  - FILES_MODIFIED: [src/tools/dispatchers/productDispatcher.ts]

U-REV36: Version history per machine
  - Store program versions with content-addressable hashes
  - History: "Haas VF-2 — PART_001: v1 (original), v2 (PRISM optimized), v3 (prove-out)"
  - Diff any two versions
  - FILES_MODIFIED: [src/engines/PostVersioningEngine.ts]

U-REV37: Web UI — diff viewer + version history
  - Side-by-side diff view with syntax highlighting
  - Feed/speed changes highlighted in green (increased) / red (decreased)
  - Safety warnings inline
  - VERSION HISTORY timeline per machine
  - FILES_CREATED: [web/src/pages/ProgramDiffPage.tsx]

U-REV38: Tests for diff + versioning
  - Semantic diff accuracy on feed/speed/tool changes
  - Version storage and retrieval
  - FILES_CREATED: [src/__tests__/pp-diff-versioning.test.ts]

**EXIT GATE PP-REV-MS6:**
- [ ] Semantic diff correctly identifies feed/speed/tool changes
- [ ] Safety flags highlight threshold violations
- [ ] Version history stores and retrieves program revisions
- [ ] All pre-existing PP tests (764+) still passing (regression gate)
- [ ] Action completes in < 5s for programs under 5,000 lines (performance)
- OMEGA_FLOOR: >= 1.0
- FORGE-TRIPLE: hook=enforce-diff-accuracy | action=ppg_program_diff | skill=/program-diff

---

# PP-REV-MS7: Pricing Tiers + Paywall + Launch
**Sessions: 2 | Units: 4 | Priority: P0 | DEPENDS_ON: PP-REV-MS0 through PP-REV-MS6**
**Revenue tier: ALL — this ships the product**

### SESSION PP-REV-MS7-S1: Feature Gating + Pricing
**SMART CONFIG:** Role=R2-Engine + R5-Frontend + R7-Product | Model=OPUS | Effort=MAX | Context_Budget=80K
**KNOWLEDGE:** Existing tierGate.ts middleware, product-catalog.ts pricing data, ALL PP-REV engines from MS0-MS6
**INTENT:** Revenue collection starts. Free users see teaser report, Pro users get full optimization, Production users get advanced features.

**WORK:**
U-REV39: Feature tier engine
  - Free: basic G-code generation, 1 controller, no optimization report
  - Pro: per-block optimization, setup sheet, HSM injection, prove-out, 11 controllers
  - Production: + air-cut elimination, sister tools, probing, cross-CAM, tool optimization
  - Enterprise: + RL learning, fleet management, API access
  - FILES_CREATED: [src/engines/FeatureTierEngine.ts]

U-REV40: Paywall middleware
  - Check user tier before executing premium actions
  - Free users: show "upgrade to Pro to unlock optimization report" with sample preview
  - Graceful degradation: free tier still works, just limited
  - FILES_CREATED: [src/middleware/featureGate.ts]

U-REV41: Landing page + pricing display
  - Pricing page with tier comparison table
  - Feature checklist per tier
  - CTA buttons: "Start Free", "Go Pro", "Contact Sales"
  - FILES_CREATED: [web/src/pages/PricingPage.tsx]

U-REV42: Launch checklist
  - All 11 controllers produce valid output
  - Optimization report works for milling, turning, 5-axis
  - Setup sheet extracts tools correctly
  - Cycle time within 15% accuracy
  - Prove-out → promote workflow complete
  - Feature toggles work
  - Download package includes: optimized program + report + setup sheet
  - FILES_MODIFIED: [src/engines/PostDownloadEngine.ts — add report to manifest]

**EXIT GATE PP-REV-MS7 (FINAL):**
- [ ] Free tier: upload G-code → get basic post with 1 controller
- [ ] Pro tier: upload → get optimization report + setup sheet + HSM + prove-out for 11 controllers
- [ ] Production tier: + tool optimization + probing + cross-CAM + air-cut removal
- [ ] Pricing page renders with correct feature lists
- [ ] Paywall blocks premium features for free users with upgrade prompt
- [ ] All 764+ PP tests still passing
- OMEGA_FLOOR: >= 1.0
- FORGE-TRIPLE: hook=enforce-tier-access | action=ppg_check_tier | skill=/pricing

---

## MILESTONE SUMMARY

| ID | Title | Sessions | Units | Tier | Status |
|----|-------|----------|-------|------|--------|
| PP-REV-MS0 | The Demo — Before/After Report | 2 | 6 | PRO | not_started |
| PP-REV-MS1 | Setup Sheet + Cycle Time | 3 | 6 | PRO | not_started |
| PP-REV-MS2 | Tool Optimization + Magazine | 2 | 4 | PRODUCTION | not_started |
| PP-REV-MS3 | HSM + Probing + Sister Tools | 3 | 6 | PRODUCTION | not_started |
| PP-REV-MS4 | Prove-Out + Air-Cut Detection | 3 | 6 | PRODUCTION | not_started |
| PP-REV-MS5 | Cross-CAM + AI Learning | 3 | 6 | ENTERPRISE | not_started |
| PP-REV-MS6 | Program Diff + Revision | 2 | 4 | PRO | not_started |
| PP-REV-MS7 | Pricing + Paywall + Launch | 2 | 4 | ALL | not_started |
| **TOTAL** | | **20** | **42** | | |

## ESTIMATED REVENUE IMPACT
- **MS0 alone** (before/after report) justifies Pro pricing at $49-99/mo
- **MS0 + MS1** (report + setup sheet + cycle time) covers 80% of CIMCO Edit functionality
- **MS0-MS4** (full Pro + Production) covers Vericut Force value prop at 1/10th the price
- **MS5** (cross-CAM + AI) is unique — no competitor has this
- **MS7** (launch) enables revenue collection on day 1
