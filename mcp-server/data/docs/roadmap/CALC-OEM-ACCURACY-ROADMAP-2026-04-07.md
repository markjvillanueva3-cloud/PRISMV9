# CALC OEM Accuracy Roadmap

Generated: 2026-04-07
Mode: `/rgs generate`
Scope: Full calculator trust across the entire machine database, with release-critical accuracy depth for `mill`, `lathe`, and `wire_edm`, and hard legality / hydration coverage for every other selectable machine row.
Roadmap gate: `finish-current-backend-and-frontend-work-first`

## Intent

Ship a calculator that a working machinist can trust across all machine rows in the database, not just representative OEM samples.

That means:
- every machine row hydrates legal calculator selections
- every CAM toolpath is categorized, licensed, and mapped to the right physics / constraint profile
- every holder / tooling / workholding combination is either legal and wired or blocked explicitly
- `mill`, `lathe`, and `wire_edm` get published-data-backed accuracy validation
- non-release-critical machine families are still covered by honest limited-mode behavior instead of fake full optimization

The free tier must stay better than generic competitor calculators by keeping machine-aware, material-aware, and legality-aware outputs. Paid PRISM mode keeps the full optimization edge, richer diagnostics, broader search depth, and deeper setup refinement.

## Machine Database Baseline

Current machine corpus snapshot:
- `1,941` machine rows
- `1,082` unique brand-model pairs
- `49` brands

Current type distribution:
- `VMC`: `802`
- `5axis`: `362`
- `lathe`: `353`
- `HMC`: `173`
- `mill_turn`: `147`
- `swiss`: `68`
- `bridge`: `26`
- `edm_wire`: `5`
- `edm_sinker`: `3`
- `router`: `2`

Release-critical solver families in this roadmap:
- `VMC`
- `HMC`
- `5axis`
- `bridge`
- `router`
- `lathe`
- `mill_turn`
- `swiss`
- `edm_wire`

Limited-mode but still mandatory selection-surface coverage:
- `edm_sinker`

## Current Constraints

- Workholding on the calculator page is still curated rather than fully live-backed from a dedicated backend route.
- The calculator already uses the real speed/feed path, but the explicit free-tier vs paid-tier solve contract is not yet formalized end to end.
- Several calculator-native speed/feed surfaces exist in the backend but are still not fully surfaced on the calculator page: `stochastic`, `resolve/machine`, `resolve/tool`, `compare`, `optimize`, and `inventory-select`.
- The active roadmap gate is `finish-current-delivery-first`, so the early sessions must produce precise reports, tests, and non-destructive hardening before any broad visible-surface expansion.

## Milestone CALC-OEM-MS0

Title: Database-wide coverage truth and execution gate
Track: CALC
Dependencies: `CALC-HARDEN-MS0`, `QA-MS0`

### Session 0A

SMART CONFIG: `ROLE=Manufacturing QA + Catalog Auditor | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=30%`
KNOWLEDGE:
- `machine-profiles-catalog*.ts`
- `machineConfigurationOptions.test.ts`
- `calculator-machinist-allout-sanity.test.ts`
- `benchmark-extended-machine-sweep.test.ts`
- `calculatorWorkspace.ts`
INTENT: Replace focus-OEM language with an exact full-database baseline and support-tier map.

WORK:
- `U-CALC00`: Generate a durable machine-corpus report with current counts by brand, type, and brand-model pair
- `U-CALC01`: Classify every machine row into `release-critical solver`, `limited-mode`, or `blocked / unsupported` status with explicit reasons
- `U-CALC02`: Replace all roadmap language that could be read as “major OEM sample coverage” with “all machines in database”

EXIT GATE:
- Coverage report artifact written with live counts and type totals
- `100%` of machine rows assigned to an explicit support tier
- No milestone or exit gate still uses “requested OEMs” or “representative OEMs” as the finish condition

ARTIFACTS:
- `state/calculator-machine-corpus-baseline.json`
- `state/calculator-machine-corpus-baseline.md`

### Session 0B

SMART CONFIG: `ROLE=Roadmap Protocol Auditor + Release Planner | MODEL=opus | EFFORT=HIGH | CONTEXT_BUDGET=25%`
KNOWLEDGE:
- `CLAUDE-CODEX-ROADMAP-EXECUTION-DIRECTIVE.md`
- `ROADMAP_COLLABORATION_STATE.md`
- `CALC-OEM-ACCURACY-ROADMAP-2026-04-07.md`
INTENT: Make the roadmap executable under the current finish-first gate instead of aspirational.

WORK:
- `U-CALC03`: Split large milestones into compaction-safe sessions with explicit boundaries
- `U-CALC04`: Create the roadmap status hook / action / command that reports all-machine calculator coverage progress

EXIT GATE:
- No milestone session exceeds one realistic execution slice without a compaction boundary
- The coverage status triple has single ownership and explicit build steps
- Frontend/backend coordination gates are declared before visible calculator or tier-behavior changes

FORGE-TRIPLE:
- Protective hook: `calculator-oem-regression-gate` built in `U-CALC04`
- MCP action: `prism_dev:calculator_oem_status` built in `U-CALC04`
- Skill/command: `/calculator-oem-sweep` built in `U-CALC04`

FEATURE CASCADE:
- NEW_HOOKS: `calculator-oem-regression-gate`
- NEW_ACTIONS: `prism_dev:calculator_oem_status`
- NEW_SKILLS: `/calculator-oem-sweep`
- AVAILABLE_TO: `CALC-OEM-MS1`, `CALC-OEM-MS2`, `CALC-OEM-MS3`

## Milestone CALC-OEM-MS1

Title: All-machine calculator-surface legality and hydration
Track: CALC
Dependencies: `CALC-OEM-MS0`
Soft coordination gates:
- active frontend delivery lane approval before visible calculator-surface changes
- active backend delivery lane approval before adding new calculator data routes

### Session 1A

SMART CONFIG: `ROLE=Calculator Wiring Engineer + CAM Taxonomist | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=35%`
KNOWLEDGE:
- `CalculatorPage.tsx`
- `calculatorData.ts`
- `calculatorCatalogCoverage.test.ts`
- `calculatorToolpathTaxonomy.test.ts`
- `calculatorWorkspace.ts`
INTENT: Every programming/CAM toolpath row is categorized, licensed, machine-legal, and bound to the right physics profile.

WORK:
- `U-CALC10`: Materialize a source-of-truth CAM toolpath classification table for the full programming corpus
- `U-CALC11`: Add regressions proving zero uncategorized, mislicensed, or machine-incompatible toolpaths across the full programming corpus
- `U-CALC12`: Bind each toolpath family to a named physics / constraint profile and validate the mapping with real output checks

EXIT GATE:
- `0` uncategorized CAM toolpaths in the programming corpus
- `0` toolpaths surfaced under the wrong machine family or license tier
- `100%` of categorized toolpath families mapped to a named physics / constraint profile

ARTIFACTS:
- `state/calculator-toolpath-classification.json`
- `state/calculator-toolpath-classification.md`

### Session 1B

SMART CONFIG: `ROLE=Tooling Systems Engineer + Compatibility Auditor | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=35%`
KNOWLEDGE:
- `calculator-tool-holder-catalog.test.ts`
- `calculatorCatalogCoverage.test.ts`
- tool/holder catalogs
- machine tooling layouts
INTENT: Every machine row resolves to at least one legal holder/tooling posture, and no illegal generic fallback survives.

WORK:
- `U-CALC13`: Materialize full-corpus holder/tooling legality across CAT/BT/HSK, VDI/BMT/CAPTO, live-tool, milling-head, Swiss, and wire-guide families
- `U-CALC14`: Add regressions proving every machine row resolves to at least one legal holder/tooling posture
- `U-CALC15`: Add explicit tool-class / insert-geometry validation lanes for solid carbide, HSS/cobalt, indexables/inserts, and premium tool materials where supported

EXIT GATE:
- `100%` of release-critical machine rows resolve to at least one legal holder/tooling posture
- `0` machine rows rely on an illegal generic holder fallback
- Published-value validation exists for each supported tool class / insert family lane

ARTIFACTS:
- `state/calculator-holder-tooling-legality.json`

### Session 1C

SMART CONFIG: `ROLE=Backend Data Engineer + Shop Process Planner | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=40%`
KNOWLEDGE:
- data routes
- calculator data layer
- workholding/workspace tests
- page selection rebasing tests
INTENT: Every machine row hydrates a legal calculator surface, and workholding is honest.

WORK:
- `U-CALC16`: Build the backend workholding route / schema contract required by the calculator page
- `U-CALC17`: Wire workholding end to end into the calculator and add a temporary explicit blocked/limited-mode warning path for any family not yet live-backed
- `U-CALC18`: Add a full calculator-selection hydration matrix across the entire machine corpus, with hard failure on empty or illegal controller, spindle, coolant, holder, tooling, workholding, CAM, feature, or toolpath states
- `U-CALC19`: Add all-machine rebasing regressions so machine changes deterministically rebase controller, spindle, coolant, holder, tooling, workholding, features, and toolpaths without stale selections surviving

EXIT GATE:
- `100%` of machine rows hydrate a non-empty, legal calculator selection surface for their support tier
- Workholding is live-backed for release-critical machine families or the family remains explicitly blocked
- `0` stale-selection survival defects in the all-machine rebase matrix

FORGE-TRIPLE:
- Protective hook: `calculator-selection-legality-gate` built in `U-CALC19`
- MCP action: `prism_calc:selection_legality_audit` built in `U-CALC19`
- Skill/command: `/calculator-solve-matrix` built in `U-CALC19`

FEATURE CASCADE:
- NEW_HOOKS: `calculator-selection-legality-gate`
- NEW_ACTIONS: `prism_calc:selection_legality_audit`
- NEW_SKILLS: `/calculator-solve-matrix`
- AVAILABLE_TO: `CALC-OEM-MS2`, `CALC-OEM-MS3`

## Milestone CALC-OEM-MS2

Title: PRISM tier contract from page to backend
Track: CALC
Dependencies: `CALC-OEM-MS1`
Soft coordination gates:
- pricing/product lane approval before tier-behavior rollout

### Session 2A

SMART CONFIG: `ROLE=Product Physicist + Revenue Systems Engineer | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=30%`
KNOWLEDGE:
- `calculatorSpeedFeedContract.ts`
- `CalculatorPage.tsx`
- `SpeedFeedOrchestratorEngine.ts`
- `calculatorPrismMode.ts`
- `product-catalog.ts`
- `PHASE_R11_PRODUCT.md`
INTENT: Free vs paid behavior is an explicit contract, not implied product copy.

WORK:
- `U-CALC20`: Define calculator tier state at the page level and thread it through request contracts
- `U-CALC21`: Define backend response-shape and optimization-depth rules for `free`, `paid-standard`, and `paid-premium` calculator tiers
- `U-CALC22`: Keep free-tier outputs machine-aware, material-aware, and legality-aware while reserving deeper optimization and richer diagnostics for paid PRISM tiers

EXIT GATE:
- Page, request contract, and backend response shape all carry explicit tier state
- Free-tier outputs remain legal and materially useful for shop-floor decisions
- Paid-tier outputs expose more optimization depth than free tier by explicit contract

### Session 2B

SMART CONFIG: `ROLE=Frontend Validation Engineer + Product QA | MODEL=opus | EFFORT=HIGH | CONTEXT_BUDGET=30%`
KNOWLEDGE:
- `calculatorPrismMode.test.ts`
- `CalculatorPage.prismMode.test.tsx`
- speed/feed contract tests
INTENT: The same setup behaves differently by design across free and paid tiers, and the tests prove it.

WORK:
- `U-CALC23`: Add same-setup comparison tests across free and paid tiers for representative mill, lathe, and wire jobs
- `U-CALC24`: Add page tests that prove tier behavior is visible end to end on the calculator page
- `U-CALC25`: Add tier-coverage reports for all support tiers and machine families

EXIT GATE:
- Tier delta tests pass across mill, lathe, and wire representative jobs
- Free tier is never crippled to generic math-only behavior
- Paid tiers measurably expose richer optimization, diagnostics, or setup refinement than free tier

FORGE-TRIPLE:
- Protective hook: `calculator-tier-contract-gate` built in `U-CALC25`
- MCP action: `prism_calc:calculator_tier_preview` built in `U-CALC25`
- Skill/command: `/calculator-tier-audit` built in `U-CALC25`

FEATURE CASCADE:
- NEW_HOOKS: `calculator-tier-contract-gate`
- NEW_ACTIONS: `prism_calc:calculator_tier_preview`
- NEW_SKILLS: `/calculator-tier-audit`
- AVAILABLE_TO: `CALC-OEM-MS3`

### Session 2C

SMART CONFIG: `ROLE=Frontend Systems Integrator + Manufacturing UX Architect | MODEL=opus | EFFORT=HIGH | CONTEXT_BUDGET=30%`
KNOWLEDGE:
- `web/src/api/speedfeed.ts`
- `web/src/pages/CalculatorPage.tsx`
- `src/routes/speedfeed.ts`
- `src/engines/SpeedFeedOrchestratorEngine.ts`
- `data/docs/roadmap/CALCULATOR-FEATURE-LEVERAGE-AUDIT-2026-04-07.md`
INTENT: Every calculator-native backend route that improves machinist-grade decisions is either surfaced on the page or intentionally gated.

WORK:
- `U-CALC26`: Surface `resolve/machine` and `resolve/tool` as calculator preflight checks before final solve
- `U-CALC27`: Add calculator what-if scenario compare using the backend `compare` route for machine, tool, holder, coolant, and strategy deltas
- `U-CALC28`: Use `inventory-select` whenever a tool crib is present so the calculator answers "what can I run with what I already own?" before purchase advice
- `U-CALC29`: Use backend `optimize` and `stochastic` routes for paid PRISM-mode optimization depth, uncertainty bands, and process-risk context

EXIT GATE:
- Every calculator-grade speed/feed route is either wired to the calculator or intentionally gated with an explicit product reason
- Preflight capability checks exist for machine and tool changes
- Inventory-aware tooling selection runs before tooling ROI when a crib is available
- PRISM paid mode uses deeper backend optimization or uncertainty, not just richer wording around the same solve

## Milestone CALC-OEM-MS3

Title: Physics validation matrix and release gate
Track: CALC
Dependencies: `CALC-OEM-MS2`

### Session 3A

SMART CONFIG: `ROLE=Manufacturing Physicist + Tooling Specialist | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=40%`
KNOWLEDGE:
- `ultimate-speed-feed*.test.ts`
- `physics-pipeline-handbook-integration.test.ts`
- published milling data already represented in current suites
INTENT: Milling outputs match tool class, material family, and machine family realities across the full database-supported mill families.

WORK:
- `U-CALC30`: Add published-value validation for steel, tool steel, stainless, aluminum, cast iron, titanium, nickel alloys, and copper/brass across the supported mill machine families
- `U-CALC31`: Validate tool-class deltas for carbide, HSS/cobalt, indexables/inserts, and premium tool materials where supported
- `U-CALC32`: Validate setup-stiffness / workholding posture effects for vise, zero-point, tombstone/pallet, chuck, collet, tailstock, and steady-rest support where relevant
- `U-CALC32A`: Run cross-path verification with `UnifiedPhysicsVerifierEngine` for release-critical mill scenarios so the calculator solve stays numerically aligned with the other physics paths

EXIT GATE:
- Published-data checks exist across primary and staged secondary material families
- Tool-class and setup-stiffness effects materially change DOC/WOC/feed/warnings where expected
- Mill release-critical families pass the expanded physics suite

### Session 3B

SMART CONFIG: `ROLE=Turning Specialist + Process Engineer | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=35%`
KNOWLEDGE:
- turning engines/tests
- tribal knowledge consumer tests
- published turning tables
INTENT: Lathe, mill-turn, and Swiss outputs behave like a real turning process planner expects.

WORK:
- `U-CALC33`: Add turning-specific validations for CSS vs RPM clamp, chuck vs collet vs bar-fed posture, boring-bar L/D derates, wiper vs standard inserts, and live-tool constraints
- `U-CALC34`: Add published-data validations for OD/ID rough, finish, groove, part-off, drill, bore, and live-tool operations

EXIT GATE:
- Separate turning acceptance gates exist for OD, ID, groove, part-off, drill, bore, and live-tool flows
- Turning outputs derate correctly for weak boring bars and weak support posture
- Lathe / mill-turn / Swiss suites pass against published or canonical targets

### Session 3C

SMART CONFIG: `ROLE=Wire EDM Physicist + Verification Lead | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=35%`
KNOWLEDGE:
- `wedm-feed-rate-validation.test.ts`
- `cwedm-e2e-validation.test.ts`
- `cwedm-full-chain-100.test.ts`
- published wire machine tables and safety limits already in current validation lanes
INTENT: Wire outputs are trustworthy across thickness, taper, wire, flushing, and geometry limits.

WORK:
- `U-CALC35`: Expand wire validation across thickness ladders, taper angles, wire diameters, submerged/open flushing posture, and skim-pass time/accuracy tradeoffs
- `U-CALC36`: Add geometry safety validations for min corner radius vs wire size, current-density safety, and machine taper limits

EXIT GATE:
- Wire validations cover thickness, taper, wire family, and flushing posture
- Geometry safety limits are enforced by tests, not implied by positive outputs
- Wire release-critical suites pass with published-value tolerances

### Session 3D

SMART CONFIG: `ROLE=Release Manager + Manufacturing QA | MODEL=opus | EFFORT=HIGH | CONTEXT_BUDGET=25%`
KNOWLEDGE:
- all calculator/manufacturing regression suites
- coverage reports from prior milestones
INTENT: One combined release gate proves the calculator is trustworthy across the database-defined support tiers.

WORK:
- `U-CALC37`: Run the combined all-machine selection-hydration, toolpath, holder/tooling, tier-contract, and mill/lathe/wire physics suites
- `U-CALC38`: Emit a release coverage report showing pass/fail by machine family, brand, support tier, toolpath family, tool class, and workholding class

EXIT GATE:
- Combined release batch passes for all release-critical families
- Coverage report shows `100%` machine-row hydration coverage by support tier
- Mill, lathe, and wire remain green together under one release batch

FORGE-TRIPLE:
- Protective hook: `calculator-release-accuracy-gate` built in `U-CALC38`
- MCP action: `prism_dev:calculator_release_gate` built in `U-CALC38`
- Skill/command: `/calculator-release-check` built in `U-CALC38`

FEATURE CASCADE:
- NEW_HOOKS: `calculator-release-accuracy-gate`
- NEW_ACTIONS: `prism_dev:calculator_release_gate`
- NEW_SKILLS: `/calculator-release-check`
- AVAILABLE_TO: downstream calculator release work and paid-tier launch work

## Sequencing Reminder

The acceptance bar is no longer “representative machines look good.” It is:
- every machine row is classified
- every selectable machine row hydrates legally
- every CAM toolpath row is categorized and mapped to the right physics profile
- every release-critical family is validated against real machining expectations

Accuracy and legality truth come first. Only after those gates are hard should the UI broaden visible machine surfaces further.
