# PP-HARDENING-ROADMAP

> Post Processor Hardening Roadmap -- generated from 20-agent scrutiny audit
> Audit date: 2026-04-02 | Avg score: 60/100 | 358 findings (58 CRIT, 101 HIGH, 119 MED, 80 LOW)
> 7 milestones | 29 units | Priority: P0 safety -> P1 validation -> P2+ polish

## Authority

This roadmap remediates findings from the PP-MAXIMIZATION-ROADMAP audit (12 milestones, 48 units, 100% complete).
It is a CHILD of PRISM-UNIFIED-ROADMAP.md and inherits its execution protocol.

## Execution Rules

- **4-LOOP per unit**: BUILD -> SCRUTINIZE -> GAP-FILL -> COMMIT
- **Build gate**: `npx tsc --noEmit` must pass after every unit
- **Test gate**: `npx vitest run <affected-tests>` must pass with 0 regressions
- **Safety-first**: PP-H0 must complete before any other milestone starts
- **Compact every 2-3 units** -- never exceed 3 without compacting

---

## Milestone Index

| ID    | Title                                  | Units | Priority | Deps   | Status      |
|-------|----------------------------------------|-------|----------|--------|-------------|
| PP-H0 | Safety & M-Code Fixes                 | 4     | P0-CRIT  | none   | not_started |
| PP-H1 | Validation Layer                      | 5     | P1-HIGH  | PP-H0  | not_started |
| PP-H2 | API & Error Handling                  | 4     | P1-HIGH  | PP-H0  | not_started |
| PP-H3 | Type Unification & Consistency        | 4     | P2-MED   | PP-H0  | not_started |
| PP-H4 | Performance & State Management        | 4     | P2-MED   | PP-H0  | not_started |
| PP-H5 | Test Hardening                        | 5     | P2-MED   | PP-H1  | not_started |
| PP-H6 | Product & UX Polish                   | 3     | P3-LOW   | PP-H3  | not_started |

---

## PP-H0: Safety & M-Code Fixes (P0-CRITICAL)

**Smart Config**: Role=CNC Safety Engineer + Physics Validator | Model=OPUS | Effort=MAXIMUM

### Context
20-agent audit found CRITICAL safety issues in CoolantControlConfigEngine M-code mappings,
physics formula errors in PostProcessorPipelineEngine, and division-by-zero paths that could
produce dangerous G-code output on real machines.

### Knowledge Sources
- Haas NGC programming manual (M-code table)
- Siemens 840D function manual (M-code assignments)
- Mazak Smooth Ai programming guide (M-code table)
- Heidenhain TNC640 programming manual (MQL syntax)
- PRISM canonical constants: src/physics/constants.ts

### SESSION PP-H0-S1: M-Code Safety + Physics + Div-by-Zero

#### WORK

##### U-PPH01: Fix CoolantControlConfigEngine M-code conflicts
**Target**: `src/engines/CoolantControlConfigEngine.ts`
**Findings** (4 agents flagged):
- Haas: M13 mapped as "air_blast" -- WRONG. M13 = spindle CW + coolant on. Air blast is typically P-COOL or M88
- Siemens: M7 mapped as "air_blast" -- WRONG. M7 = mist coolant (ISO standard). Air blast varies by machine
- Mazak: M30 mapped as "chip_conveyor" -- WRONG. M30 = program end (universal). Chip conveyor is M57 on Smooth
- Mazak: M29 appears as a coolant code -- WRONG. M29 = rigid tapping mode
- Heidenhain: "M7.1" used for MQL -- WRONG. Heidenhain uses M3.1/M4.1 or FUNCTION COOLANT syntax
**Fix**:
1. Audit every M-code against manufacturer programming manuals
2. Replace M13 with correct Haas air blast (M88 P-COOL or shop-configurable M-code)
3. Replace M7 air blast with correct Siemens air blast (M-code varies, typically M-function or compressed air valve)
4. Remove M30 from chip conveyor mapping, use Mazak M57
5. Remove M29 from coolant codes entirely
6. Replace M7.1 with correct Heidenhain FUNCTION COOLANT or TCH PROBE coolant syntax
7. Add manufacturer reference comments to every M-code mapping
**Tests**: Verify each controller's M-code table against manufacturer specs
**Exit**: No M-code in the engine conflicts with a safety-critical function

##### U-PPH02: Fix PostProcessorPipelineEngine physics errors
**Target**: `src/engines/PostProcessorPipelineEngine.ts`
**Findings** (3 agents flagged):
- Stage 4.2 deflection formula has unit mismatch (mixing mm and m in same equation)
- Stages 1.2/2.7 use hardcoded 10mm diameter for Vc calculation instead of actual tool diameter
- Heidenhain arc handling: G2/G3 both emit "CC" (should be different arc directions)
**Fix**:
1. Fix deflection formula units -- ensure consistent mm throughout or add explicit conversion
2. Replace hardcoded 10mm with actual tool diameter from block context
3. Fix Heidenhain arc emission -- G2=CC+CR or C/CP syntax, G3 is opposite direction
4. Import constants from src/physics/constants.ts where applicable
**Tests**: Numerical validation against hand-calculated deflection values
**Exit**: All physics formulas use correct units and actual tool geometry

##### U-PPH03: Add division-by-zero guards
**Target**: `src/engines/PostProcessorPipelineEngine.ts`
**Findings** (3 agents flagged):
- flute_count=0 causes NaN in per-tooth feed calculations
- effective_diameter=0 causes Infinity in cutting speed calculations
- No guards on spindle_speed=0 in feed-per-rev calculations
**Fix**:
1. Add guard: if flute_count <= 0, throw descriptive error or use safe default (1)
2. Add guard: if effective_diameter <= 0, throw descriptive error
3. Add guard: if spindle_speed <= 0 in feed calculations, throw or skip optimization
4. Ensure all division operations have denominator checks
**Tests**: Test with zero/negative values for all division-prone parameters
**Exit**: No NaN or Infinity possible in any pipeline calculation

##### U-PPH04: Fix EDMPostProcessorExtension wire length estimation
**Target**: `src/engines/EDMPostProcessorExtension.ts`
**Findings** (4 agents flagged):
- Wire length estimation uses absolute coordinates instead of incremental segment distances
- This produces incorrect wire consumption estimates (overstates for far-from-origin paths)
- AgieCharmilles M50/M51 conflict between wire and sinker modes
**Fix**:
1. Compute wire length as sum of incremental segment distances (sqrt of dx^2+dy^2)
2. Fix M50/M51 to be mode-specific (wire-only vs sinker-only code paths)
3. Add sinker EDM validation -- reject sinker code for wire-only controllers (Robocut)
**Tests**: Wire length for known path geometries, M-code validation per controller
**Exit**: Wire length matches manual calculation within 0.1%, no cross-mode M-code conflicts

#### EXIT GATE
- [ ] All M-codes verified against manufacturer manuals
- [ ] No division-by-zero possible in pipeline calculations
- [ ] Physics units consistent (mm throughout)
- [ ] Wire EDM length uses incremental distances
- [ ] Build PASS, PP tests PASS (151+new)

---

## PP-H1: Validation Layer (P1-HIGH)

**Smart Config**: Role=API Security Engineer + TypeScript Architect | Model=OPUS | Effort=HIGH
**Deps**: PP-H0

### Context
Zero input validation exists on any PPG route. Raw req.body is forwarded directly to engines.
Zod is available in the project but no schemas are defined for PP inputs.

### SESSION PP-H1-S1: Zod Schemas + Route Validation

#### WORK

##### U-PPH05: Define Zod schemas for core PPG actions
**Target**: New file `src/schemas/ppg-schemas.ts`
**Scope**: Create Zod schemas for the 15 most-used ppg_ actions:
- ppg_generate, ppg_optimize, ppg_analyze, ppg_template
- ppg_edm_generate, ppg_laser_generate, ppg_waterjet_generate
- ppg_coolant_config, ppg_probe_wcs, ppg_probe_tool, ppg_probe_inspect
- ppg_subprogram_analyze, ppg_subprogram_detect
- ppg_edm_controllers, ppg_sheet_controllers
**Validation rules**:
- gcode: z.string().min(1).max(500_000) (500KB limit)
- controller: z.enum([...valid controllers])
- thickness_mm: z.number().positive().max(500)
- power_pct: z.number().min(0).max(100)
- quality_level: z.number().int().min(1).max(5)
**Exit**: All schemas compile, cover all required/optional fields

##### U-PPH06: Wire Zod validation into ppg.ts route handlers
**Target**: `src/routes/ppg.ts`
**Fix**:
1. Import schemas from ppg-schemas.ts
2. Add middleware or per-route validation: schema.parse(req.body)
3. Catch ZodError and return 422 with structured error details
4. Remove raw req.body forwarding
**Exit**: Every PPG route validates input before engine execution

##### U-PPH07: Add bounds checking for numerical parameters
**Target**: `src/engines/PostProcessorPipelineEngine.ts` + PP engines
**Fix**:
1. Validate spindle_speed: 0-100,000 RPM
2. Validate feed_rate: 0-50,000 mm/min
3. Validate depth_of_cut: 0-100mm
4. Validate tool diameter: 0.1-500mm
5. Reject physically impossible combinations (e.g., 50mm DOC with 1mm endmill)
**Exit**: No physically impossible parameters reach the physics stages

##### U-PPH08: Add controller_family validation
**Target**: `src/engines/CoolantControlConfigEngine.ts`, `UnifiedProbingDialectEngine.ts`, `SubprogramStructureEngine.ts`
**Fix**:
1. Each engine validates controller_family against its supported list
2. Unknown controllers get descriptive error (not silent fallback to generic)
3. Log unrecognized controllers for future coverage
**Exit**: Invalid controller produces clear error, not silent wrong output

##### U-PPH09: Add input size limits and sanitization
**Target**: `src/routes/ppg.ts`
**Fix**:
1. Limit G-code input to 500KB (configurable)
2. Strip null bytes and control characters from G-code input
3. Limit array parameters (tool_numbers, features) to 1000 items
4. Add rate limiting consideration (document, don't implement)
**Exit**: Oversized inputs rejected with 413, malformed inputs rejected with 422

#### EXIT GATE
- [ ] Zod schemas exist for 15+ ppg_ actions
- [ ] Every route validates before forwarding to engine
- [ ] Bounds checking prevents physically impossible parameters
- [ ] Controller family validated per engine
- [ ] Build PASS, tests PASS

---

## PP-H2: API & Error Handling (P1-HIGH)

**Smart Config**: Role=Backend API Architect | Model=OPUS | Effort=HIGH
**Deps**: PP-H0

### SESSION PP-H2-S1: Error Differentiation + Response Shape

#### WORK

##### U-PPH10: Differentiate HTTP error codes
**Target**: `src/routes/ppg.ts`
**Current**: All errors -> 500
**Fix**:
1. 400: Malformed request (missing required fields)
2. 404: Unknown action or controller
3. 422: Validation error (Zod failures, out-of-range)
4. 500: Actual internal server errors only
5. Wrap engine errors in typed error classes
**Exit**: Error responses include {error, code, details} structure

##### U-PPH11: Fix response shape mismatch
**Target**: `src/routes/ppg.ts` + `web/src/api/client.ts`
**Current**: Server returns {ok, data}, client expects {result, safety, meta}
**Fix**:
1. Standardize server response: {ok, data, meta?, safety?}
2. Update client API functions to match server shape
3. Add response type definitions shared between server and client
**Exit**: Client correctly parses all PP server responses

##### U-PPH12: Wire orphan dispatcher actions to routes
**Target**: `src/routes/ppg.ts` + `src/tools/dispatchers/camDispatcher.ts`
**Current**: 19 ppg_ dispatcher actions have no route
**Fix**:
1. Audit all ppg_ actions in camDispatcher.ts
2. Create routes for the 19 orphan actions (or document why they're MCP-only)
3. Remove duplicate route targets (/ppg/template = /ppg/program)
**Exit**: Every ppg_ action accessible via either HTTP route or documented as MCP-only

##### U-PPH13: Abstract route handler boilerplate
**Target**: `src/routes/ppg.ts`
**Current**: Each route repeats try/catch/JSON parse/error handling
**Fix**:
1. Create ppgRouteHandler(schema, action) wrapper
2. Handles: parse body -> validate -> dispatch -> format response -> error handling
3. Each route becomes a 1-liner: router.post('/ppg/generate', ppgRouteHandler(generateSchema, 'ppg_generate'))
**Exit**: Route file reduced by 50%+, consistent error handling everywhere

#### EXIT GATE
- [ ] Error codes differentiated (400/404/422/500)
- [ ] Response shape consistent server<->client
- [ ] Orphan actions documented or routed
- [ ] Build PASS, route tests PASS

---

## PP-H3: Type Unification & Consistency (P2-MED)

**Smart Config**: Role=TypeScript Architect | Model=SONNET | Effort=MEDIUM
**Deps**: PP-H0

### SESSION PP-H3-S1: Controller Types + Method Naming

#### WORK

##### U-PPH14: Unify ControllerFamily type
**Current**: Pipeline uses 11 coarse families, dialect engine uses 24 granular families
**Fix**:
1. Create canonical ControllerFamily type in a shared types file
2. Map granular dialects to families: fanuc_31i -> fanuc, siemens_840d -> siemens, etc.
3. Pipeline accepts family OR dialect, normalizes internally
4. Export type from index for consumer use
**Exit**: Single source of truth for controller identification

##### U-PPH15: Standardize execute/process method naming
**Target**: PostProcessorTelemetryEngine, SubprogramStructureEngine
**Current**: Some engines use process(), some use execute(), some use both
**Fix**:
1. All PP engines use execute() as the primary entry point (per PRISM convention)
2. process() becomes internal/private if needed
3. Update all callers
**Exit**: Consistent execute() interface across all PP engines

##### U-PPH16: Fix return type shapes
**Target**: All PP engines
**Current**: Some return {gcode, ...}, some return {program, ...}, some return {result, ...}
**Fix**:
1. Define PPResult interface: {gcode: string, controller: string, process_type: string, meta: {...}}
2. All PP engines return PPResult or a typed extension of it
3. Update tests to validate against PPResult shape
**Exit**: Type-safe return values from all PP engines

##### U-PPH17: Remove unsafe type casts
**Target**: `src/tools/dispatchers/camDispatcher.ts`
**Current**: 150+ `let _xxx: any` lazy vars, `as unknown as` casts
**Fix**:
1. Replace `any` with proper engine types for PP lazy vars
2. Remove `as unknown as` casts where possible
3. For genuinely dynamic returns, use typed discriminated unions
**Exit**: Zero `as any` in PP-related dispatcher sections

#### EXIT GATE
- [ ] ControllerFamily unified type exists and is used everywhere
- [ ] All PP engines use execute() consistently
- [ ] Return types defined and enforced
- [ ] No `as any` in PP dispatcher code
- [ ] Build PASS, tests PASS

---

## PP-H4: Performance & State Management (P2-MED)

**Smart Config**: Role=Performance Engineer + Systems Architect | Model=SONNET | Effort=MEDIUM
**Deps**: PP-H0

### SESSION PP-H4-S1: Memory + Algorithm + Determinism

#### WORK

##### U-PPH18: Cap PostProcessorTelemetryEngine memory
**Target**: `src/engines/PostProcessorTelemetryEngine.ts`
**Current**: Unbounded in-memory event array, data lost on restart
**Fix**:
1. Implement ring buffer with configurable max (default: 10,000 events)
2. Add oldest-first eviction when buffer full
3. Make reset() atomic (swap reference, don't mutate)
4. Add event count to funnel() output
**Exit**: Memory bounded, reset is safe, event count visible

##### U-PPH19: Fix SubprogramStructureEngine O(n^2) algorithm
**Target**: `src/engines/SubprogramStructureEngine.ts`
**Current**: Sliding window pattern detection is O(n^2) -- slow for large programs
**Fix**:
1. Replace with rolling hash (Rabin-Karp) for pattern detection -- O(n) average
2. Add early termination when no patterns found in first N lines
3. Implement Heidenhain LBL 0 and Siemens MCALL for detected patterns
4. Add canned cycle detection (G81-G89 patterns)
**Exit**: O(n) average complexity, Heidenhain + Siemens syntax correct

##### U-PPH20: Add pipeline stage timeouts
**Target**: `src/engines/PostProcessorPipelineEngine.ts`
**Current**: No timeouts -- a stuck stage blocks forever
**Fix**:
1. Add per-stage timeout (default: 5s per stage, 30s total pipeline)
2. If stage times out, return partial result with warning
3. Add timing metadata to pipeline output
**Exit**: Pipeline always returns within bounded time

##### U-PPH21: Add seeded PRNG for Monte Carlo reproducibility
**Target**: `src/engines/PostProcessorPipelineEngine.ts`
**Current**: Uses Math.random() -- non-deterministic Monte Carlo results
**Fix**:
1. Add optional seed parameter to pipeline config
2. Use seeded PRNG (mulberry32 or similar) when seed provided
3. Default behavior unchanged (Math.random for production randomness)
4. Tests always provide seed for reproducibility
**Exit**: Same seed produces identical Monte Carlo results

#### EXIT GATE
- [ ] Telemetry engine memory bounded at 10K events
- [ ] Subprogram detection is O(n) average
- [ ] Pipeline has stage timeouts
- [ ] Monte Carlo is reproducible with seed
- [ ] Build PASS, tests PASS

---

## PP-H5: Test Hardening (P2-MED)

**Smart Config**: Role=QA Engineer + CNC Domain Expert | Model=SONNET | Effort=HIGH
**Deps**: PP-H1

### SESSION PP-H5-S1: Assertion Quality + Negative Paths

#### WORK

##### U-PPH22: Upgrade shallow assertions in PostProcessorMS7.test.ts
**Target**: `src/__tests__/PostProcessorMS7.test.ts`
**Current**: Many tests only assert toBeDefined() -- passes even if result is wrong
**Fix**:
1. Replace all toBeDefined() with meaningful value assertions
2. Verify M-code values match manufacturer specs
3. Verify probe routine structure (not just "it exists")
4. Remove conditional-if patterns that can never fail
**Exit**: Every test asserts on specific values, not just existence

##### U-PPH23: Upgrade shallow assertions in PostProcessorMS8.test.ts
**Target**: `src/__tests__/PostProcessorMS8.test.ts`
**Current**: Zero negative-path tests, conditional assertions mask failures
**Fix**:
1. Add negative-path tests: invalid controller, missing gcode, bad thickness
2. Add process auto-detection tests (wire vs sinker from G-code analysis)
3. Replace (result.x || result.y).toBeTruthy() with specific field checks
4. Add cross-controller consistency checks
**Exit**: At least 1 negative test per engine action, no conditional assertions

##### U-PPH24: Add E2E pipeline tests for EDM/laser/waterjet
**Target**: New test file `src/__tests__/pp-hardening-e2e.test.ts`
**Scope**:
1. Full pipeline: G-code input -> PostProcessorPipelineEngine -> validated output
2. EDM path: wire EDM program -> EDMPostProcessorExtension -> verify wire-specific codes
3. Laser path: sheet program -> LaserWaterjetPostExtension -> verify pierce sequence
4. Waterjet path: sheet program -> LaserWaterjetPostExtension -> verify quality mapping
5. Cross-validate: same program through multiple controllers, verify output differs appropriately
**Exit**: 10+ E2E tests covering all non-traditional processes

##### U-PPH25: Add physics validation tests
**Target**: New test file `src/__tests__/pp-hardening-physics.test.ts`
**Scope**:
1. Deflection formula: hand-calculated values for known tool geometries
2. Cutting speed: verify Vc = pi*D*N/1000 with actual tool diameter (not hardcoded 10mm)
3. Feed per tooth: verify Fz = F/(N*z) with z>0 guard
4. Monte Carlo: verify seeded runs produce identical results
5. Arc interpolation: verify G2/G3 produce correct arc direction per controller
**Exit**: Physics validated against hand calculations within 1% tolerance

##### U-PPH26: Add input validation tests
**Target**: New test file `src/__tests__/pp-hardening-validation.test.ts`
**Scope**:
1. Every Zod schema: valid input passes, invalid input throws ZodError
2. Boundary values: max/min for each numerical parameter
3. Oversized G-code: 500KB+ input rejected
4. Missing required fields: proper error message
5. Unknown controller: proper error message
**Exit**: 100% schema coverage in tests

#### EXIT GATE
- [ ] Zero toBeDefined-only assertions in PP tests
- [ ] Negative-path tests for every PP engine action
- [ ] E2E tests for EDM, laser, waterjet pipelines
- [ ] Physics validated against hand calculations
- [ ] Input validation tests cover all schemas
- [ ] Build PASS, all PP tests PASS

---

## PP-H6: Product & UX Polish (P3-LOW)

**Smart Config**: Role=Product Manager + UX Engineer | Model=SONNET | Effort=MEDIUM
**Deps**: PP-H3

### SESSION PP-H6-S1: Credibility + Accessibility

#### WORK

##### U-PPH27: Fix ROI calculator credibility
**Target**: `web/src/pages/PostProcessorPage.tsx`
**Current**: ROI assumes 100% machine utilization -> $321K/year (fantasy number)
**Fix**:
1. Default utilization to 65% (industry average for job shops)
2. Add utilization slider (50%-95%) with industry benchmarks
3. Show range: conservative/moderate/optimistic scenarios
4. Add "Assumptions" disclosure below calculator
5. Cap annual savings at reasonable bounds per machine count
**Exit**: ROI numbers are defensible in a customer conversation

##### U-PPH28: Fix number contradictions across pages
**Target**: `web/src/pages/PostProcessorPage.tsx` + `web/src/pages/PostProcessorGeneratorPage.tsx`
**Current**: Landing page says 20 dialects, generator says 25. Landing says 38 stages, generator says 45. Landing says 6 safety checks, generator says 7.
**Fix**:
1. Create shared constants: PP_STATS = { dialects: 24, stages: 38, safety_checks: 7 }
2. Both pages import from PP_STATS
3. Numbers reflect actual code (count dialects in engine, count stages in pipeline)
4. Add build-time validation: if stage count changes, constant must be updated
**Exit**: Zero contradictions between landing page and generator page

##### U-PPH29: Fix accessibility and pricing alignment
**Target**: `web/src/pages/PostProcessorPage.tsx` + `web/src/pages/PostProcessorGeneratorPage.tsx`
**Fix**:
1. Add aria-labels to ROI calculator sliders
2. Fix FAQ aria-controls pointing to unmounted elements
3. Add loading indicators for API calls (currently silent)
4. Replace silent .catch(()=>{}) with user-visible error states
5. Align pricing model between landing page and generator page
**Exit**: a11y audit passes, no silent failures, pricing consistent

#### EXIT GATE
- [ ] ROI calculator uses 65% default utilization
- [ ] All numbers match between pages and match code
- [ ] Accessibility labels on all interactive elements
- [ ] No silent API failure swallowing
- [ ] Build PASS, web build PASS

---

## Summary

| Milestone | Units | P0 Fixes | P1 Fixes | P2 Fixes | P3 Fixes |
|-----------|-------|----------|----------|----------|----------|
| PP-H0     | 4     | 18 CRIT  | 0        | 0        | 0        |
| PP-H1     | 5     | 0        | 15 HIGH  | 0        | 0        |
| PP-H2     | 4     | 0        | 10 HIGH  | 0        | 0        |
| PP-H3     | 4     | 0        | 0        | 12 MED   | 0        |
| PP-H4     | 4     | 0        | 0        | 11 MED   | 0        |
| PP-H5     | 5     | 0        | 0        | 15 MED   | 0        |
| PP-H6     | 3     | 0        | 0        | 0        | 10 LOW   |
| **Total** | **29**| **18**   | **25**   | **38**   | **10**   |

**Estimated sessions**: 5-7 (2-3 units per session, compact between)
**Target audit score**: 80+/100 (up from 60/100)
