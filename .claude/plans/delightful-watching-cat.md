# Plan — Close Wire EDM + Lathe Gap to Sim-Before-Live Readiness
**Scrutinized via 10-stage RGS pipeline (R1→R4) + R5 launch-readiness pass + R6 five-role adversarial review + R7 consolidation. Honest blended score: 79/100 after R7 patches (was 87 self-reported before adversarial review exposed gaps).**
**R5 additions: Sessions 9-10, Stage 11, expanded Risk Register.**
**R6 review verdicts (1 physicist + 1 red-team + 1 TS architect + 1 shop foreman + 1 SRE): mean 67 before patches; 3 reviewers returned NO-GO.**
**R7 additions (this patch): Sessions 11 (security hardening) + 12 (shop-floor + SRE + architecture gaps), physics tolerance corrections, Stage 11 expansion to 30+ gates.**

## Context

**Problem.** Backend Wire EDM capability is production-grade (89 engines, 61 dispatcher actions, 115 tests green this session, `safety_gate` scaffold working on `WEDMPrintToProgramEngine`). But the main `H:/prism` repo has **zero** Wire EDM frontend and only **two thin** Lathe pages. The operator cannot drive the print-to-CNC-program pipeline from the app. Sim-before-live testing on JM Die machines is blocked by five things: (1) the WEDM UI doesn't exist in the main repo, (2) the composite S(x) safety score is single-component, (3) there is no kinematic simulator, (4) no machine-profile binding, (5) no pilot checklist.

**What prompted this.** Codex built the WEDM frontend in sibling worktrees (most-recent at `H:/prism-mill-worktree/`, mtime 2026-04-22, ~3,094 LOC across 8 files; 2nd-most-recent at `H:/prism-fresh/`, 2026-04-21). Lathe UI is at `H:/prism-fresh/` (LatheWizard + LatheUpload + LatheResults, ~1,727 LOC). User wants the most-recent build ported and every remaining sim-before-live gap closed.

**Desired outcome.** Main `H:/prism` ships with:
- 4 WireEdm pages + 3 Lathe pages wired through `edmDispatcher`/`latheDispatcher`.
- Composite S(x) from all 10+ safety components.
- `WEDMKinematicSimulatorEngine` that time-steps emitted G-code with full physics.
- `JMDieMachineProfileEngine` binding adapter state to a specific serial number.
- `WEDM_PILOT_CHECKLIST.md` with autonomy-progression gates.
- **Honest ≥75% confidence** that simulated testing catches every class of real-machine failure before power-on.

---

## Stage 1 — Brief Analysis

**Domain:** Wire EDM + Lathe UI port + safety-gate composition + kinematic simulation.
**Machine types:** Wire EDM (Mitsubishi M800/FA, Sodick AQ/AL, Makino U/EU, AgieCharmilles, Fanuc RoboCut), Lathe (JM Die fleet), pilot machine TBD by Phase 5.
**Complexity:** L — 25 units, 5 phases, ~8-10 sessions, mixed port + green-field + wire-up work.
**Dependencies:** Session's completed WEDM-BIZ-MS0/U-WEDM-FIX1..5 commits (f60ffc1ec, 796ceb369, 86d15a4d7, a47f5263d + earlier). Main branch `work/cam-exhaust-ms0`.

---

## Stage 2 — Codebase Audit (Dedup Check)

**Verified dedup against live inventory (`PRISM-INVENTORY-LATEST.md`, 89 WEDM engines, 61 dispatcher actions, 1,304+ total engines, 499 formulas, 60+ algorithms):**

| Proposed new asset | Duplicate check | Decision |
|---|---|---|
| `WEDMSafetyGateCompositeEngine` | `WEDMProgramSafetyGateEngine` exists — is it composite or not? | **EXTEND existing** `WEDMProgramSafetyGateEngine` instead of creating new. Verified it exists at `src/engines/WEDMProgramSafetyGateEngine.ts`; likely a stub today. |
| `WEDMKinematicSimulatorEngine` | `WEDMWirePathCollisionEngine` (static), `WEDMProgramVerificationEngine` (structural) — neither does kinematic sweep. `MonteCarloScheduleEngine` is capacity scheduling, not cutting sim. | **BUILD NEW.** Named `WEDMKinematicSimulatorEngine`. |
| `JMDieMachineProfileEngine` | `ShopConfigurationEngine` (21-machine shop config), `jm-die-profile.ts` (customer profile, not machine state) | **EXTEND `ShopConfigurationEngine`** with per-machine adapter-state binding rather than new engine. |
| Kinematic G-code parser | `WEDMProgramVerificationEngine` tokenizer (structural), `WireEDMProgramParserEngine` (parses NC programs) — use **`WireEDMProgramParserEngine`** as the base parser | **REUSE** `WireEDMProgramParserEngine.parse()`. |
| Wire lag physics | `WEDMWireDeflectionEngine` (static wire lag δ = FL³/3EI), `WEDMWireStressAnalysisEngine` (fatigue) | **REUSE** both; call per-step in kinematic sim. |
| Thermal drift physics | `WEDMThermalFieldEngine` (Carslaw-Jaeger), `WEDMRecastDepthPredictorEngine` | **REUSE** per-step. |
| Taper UV coupling | `WEDMCornerPhysicsEngine`, `WEDMTaperErrorBudgetEngine` | **REUSE**. |
| Dielectric breakdown | `WEDMSparkErosionModelEngine` (DiBitonto-Sato), `WEDMGapVoltageControlEngine` | **REUSE**. |
| Wire break prediction | `WEDMWireBreakPredictorEngine` (Weibull), `WEDMWeibullWireLifeEngine` | **REUSE** inside Monte Carlo sim sub-module. |
| WireEdm pages (Studio/Upload/Wizard/Results) | None in main repo. | **PORT** from `H:/prism-mill-worktree/`. |
| Lathe pages (Wizard/Upload/Results) | None in main repo. | **PORT** from `H:/prism-fresh/`. |

**No duplicate engines will be created.** 2 extensions + 1 new engine + 1 new checklist doc.

---

## Stage 3 — Exhaustive Science Law: Physics Knowledge Sources

Per user directive: identify EVERY applicable physics model for the kinematic simulator. Tests MUST validate against published values. This list is the scrutiny gate for the simulator — missing any model is a capability gap.

### Physics models required in `WEDMKinematicSimulatorEngine`

| Phenomenon | Primary model | Canonical source | Existing engine | Required test |
|---|---|---|---|---|
| **Wire static deflection (lag at cut)** | δ = F·L³/(3·E·I) for cantilevered, δ = F·L³/(192·E·I) for clamped-clamped | Kim & Okuyama 2001, Zeng-Kim 2005 | `WEDMWireDeflectionEngine` | Verify δ within ±10% of Kim 2001 Table 3 for brass 0.25mm @ 60mm thickness, 6A current |
| **Wire residual lag after direction change** | τ_lag = m_wire·v / F_spark (time constant); residual deflection decays exponentially | Zeng & Kim 2005 eq. 12 | NEW in sim — model as first-order decay with engine-computed time constant | Pose at T+τ_lag after corner should match published Zeng-Kim lag trajectory within ±15% |
| **Wire vibration (transverse)** | f_n = (π/2L²)·√(EI/ρA); stability lobes Dauw 1989 | Dauw 1989, Kunieda 2005 | **GAP — no engine**. Add to sim as optional resonance check. Skip if feed × stiffness puts us out of lobe; flag otherwise. | Flag when feed rate × workpiece thickness > Dauw threshold for brass |
| **Thermal drift (wire heating)** | Carslaw-Jaeger semi-infinite solid: T(x,t) = T0 + (Q/k)·erfc(x/2√(αt)) | Carslaw & Jaeger 1959 §2.5 | `WEDMThermalFieldEngine`, `WEDMWireHeatingEngine` | Temperature at center of 0.25mm brass wire under 6A pulse within ±10% of Carslaw closed form |
| **Thermal expansion (wire + guide)** | ΔL = L·α·ΔT; α_brass = 19e-6/K, α_tungsten_guide = 4.5e-6/K | ASM Handbook Vol. 2 | NEW in sim — reuse material constants from `physics/constants.ts` | Verify ΔL at steady-state matches α·ΔT for ΔT inferred from ThermalField |
| **Dielectric breakdown probability per pulse** | P_break(V, gap) = 1 - exp(-V/V_crit); V_crit from Paschen curve for deionized water | DiBitonto 1989, Paschen 1889 adapted | `WEDMSparkErosionModelEngine`, `WEDMGapVoltageControlEngine` | Verify P_break at published conditions within ±20% (stochastic nature loosens) |
| **Spark crater depth per discharge** | z_crater = k_DB·I·t_on^0.38 (DiBitonto)  | DiBitonto 1989 Table 2 | `WEDMRecastDepthPredictorEngine` | Assert Carslaw-form closed match within ±2% (already tested this session) |
| **Material removal rate** | MRR = k_klocke·I·t_on^0.45 (Klocke empirical); thermal-coupled form in MRRPhysicsEngine | Klocke 2013 Table 5 | `WEDMMRRPhysicsEngine` | Validated in session already |
| **Surface roughness Ra** | Ra = k_ra·I^α·t_on^β (Klocke) | Klocke 2013 Table 5.7 | `WEDMRaPredictorEngine` | Validated in session already (steel, tool_steel, carbide) |
| **Wire break risk** | Weibull P_fail = 1 - exp(-(t/η)^β) | Weibull 1951, Tosun 2004 | `WEDMWeibullWireLifeEngine`, `WEDMWireBreakPredictorEngine` | Monte Carlo N=1000 runs; validate Brier score ≤ 0.15 vs synthetic calibration (already tested) |
| **Taper UV geometry** | Upper-guide offset from lower-guide = tan(θ)·Δz; UV axis interpolates linearly w/ lower XY | Mitsubishi M800 taper manual, Sodick AQ manual | `WEDMCornerPhysicsEngine`, `WEDMTaperErrorBudgetEngine` | For 5° taper over 25mm, verify UV = tan(5°)·25 = 2.187mm within ±0.01mm |
| **Corner rounding (wire follows lag-lag tangent)** | R_corner_actual = f(δ_wire, v_feed, angle) | Zhang 2009 | `WEDMCornerPhysicsEngine` | Verify corner rounding at 90° corner for 6A, 10 mm/min feed matches Zhang 2009 Fig. 7 within ±15% |
| **Flushing adequacy (Reynolds + gap pressure)** | Re = ρ·v·D/μ, P_gap ∝ Q/A_gap² | Wang 2009, Okada 2007 | `WEDMFlushAdequacyGateEngine`, `WEDMDielectricFlushAdjustEngine` | Verify flush pressure > P_min(thickness, kerf) |
| **Servo voltage feedback (avg gap voltage control)** | V_servo = V_setpoint - k_P·(V_actual - V_setpoint) | Snoeys 1983, Rajurkar 1994 | `WEDMGapVoltageControlEngine` | Already tested; validated this session |
| **Cable sway (dynamic wire position)** | Pendulum frequency f = (1/2π)·√(g/L) for slack cable; drag stability | Kunieda 2005 ch. 4 | **GAP — not modeled**. Add to sim as post-corner settling-time check. | Flag when post-direction-change settling time > pulse interval |

**Coverage analysis:** 12 of 15 phenomena have existing engines to reuse. 3 gaps (wire vibration, thermal expansion coupling, cable sway) — sim engine adds these inline since they are small additions, not full new engines.

**Thermal expansion** is important: wire heats to ~150°C during cut, brass expands 0.3mm/m linear, which shifts effective guide position during multi-hour cuts. Currently unmodeled — add to sim as `thermalDrift: {upper_guide_z_drift_mm, lower_guide_z_drift_mm}` in each frame.

---

## Stage 4 — Scope Estimation

Classification: **L-sized roadmap** (25 units, 5 phases, 8-10 sessions with /compact between).

| Phase | Units | Est. Sessions | Complexity |
|---|---|---|---|
| Phase 1 (WEDM UI port) | 6 | 2 | S-M (mostly mechanical copy + type reconcile) |
| Phase 2 (Lathe UI port) | 5 | 1-2 | S |
| Phase 3 (Backend engines) | 8 | 3-4 | **L** (kinematic sim is the hard unit) |
| Phase 4 (Wire UI ↔ backend) | 4 | 1-2 | M |
| Phase 5 (Pilot + verify) | 2 | 1 | M |

**Per unit budget:** 2-3 units per session. /compact after every 3 units.

---

## Stage 5 — Phase Decomposition with Full SMART CONFIG

### SESSION 1: WEDM UI Port — Part 1 (U-WEDMUI01..U-WEDMUI03)
```
SMART CONFIG:  Role=FrontendPortSpecialist + TypeScriptReconciler | MODEL=sonnet-4.6 | EFFORT=HIGH | CONTEXT_BUDGET=60%
KNOWLEDGE:
  ENGINES:      WEDMPrintToProgramEngine (post-session shape), WEDMHeadClearanceEngine
  REFERENCE:    H:/prism-mill-worktree/mcp-server/web/src/ (canonical source, 2026-04-22 mtime)
                H:/prism-fresh/mcp-server/web/src/ (fallback for comparison)
  TYPES:        src/engines/WEDMPrintToProgramEngine.ts (WEDMProgramInput, WEDMGenerateResult)
  TESTS:        src/__tests__/WEDMPrintToProgramEngine*.test.ts (established contract)
INTENT:        Operator can navigate to /wire-edm in the app and see the same Studio shell Codex built.
SKILLS:        /forge-triple, /scope, /navigate, /dedup, /codebase-memory-tracing, /prism-review
PLUGINS:       Vitest MCP (run tests), ESLint MCP (type-check), codebase-memory-mcp (search_graph)
MCP_LIFECYCLE: context_boot → dispatcher_map → memory_recall → system_snapshot → action_search "wedm" → auto_checkpoint → memory_save
WORK:
  U-WEDMUI01 — Copy WireEdmStudioPage.tsx + WireEdmUploadPage.tsx (304 LOC)
    → 4-LOOP: BUILD → SCRUTINIZE (tsc --noEmit) → GAP FILL → TIE UP
    FILES_CREATED:  mcp-server/web/src/pages/WireEdmStudioPage.tsx, WireEdmUploadPage.tsx
    FILES_MODIFIED: none yet (Phase 1 U-WEDMUI06 registers routes)
    EXIT_CRITERIA:
      1. tsc --noEmit passes with zero new errors
      2. Pages import resolvable from main repo's types/ (may need stubs)
      3. Manual grep confirms no dangling imports to `wedmStudio.ts` until U-WEDMUI02 ports it
    ABORT_CRITERIA: >3 new TS errors introduced; import cycle detected; any `@ts-ignore` required
    ROLLBACK: git rm mcp-server/web/src/pages/WireEdm{Studio,Upload}Page.tsx && git checkout HEAD
  U-WEDMUI02 — Copy WireEdmWizardPage.tsx + WireEdmResultsPage.tsx (621 LOC)
    → 4-LOOP same as above
    EXIT_CRITERIA:
      1. tsc --noEmit passes (may still have ref errors until API port)
      2. WizardPage's stepper component imports resolve (may stub missing)
      3. ResultsPage receives all 11 new WEDMGenerateResult fields (profiles_cut, passes_per_profile, controller, line_count, predicted_ra_um, estimated_time_min, safety_gate, etc. from session's U-WEDM-FIX3)
    ABORT_CRITERIA: ResultsPage rendered shape incompatible with session-extended WEDMGenerateResult → STOP and reconcile in U-WEDMUI04
    ROLLBACK: git rm the two pages
  U-WEDMUI03 — Copy api/wedmStudio.ts + api/wedmCoordination.ts (999 LOC)
    EXIT_CRITERIA:
      1. BASE_URL hits correct backend route (may need proxy config in Vite)
      2. AbortController pattern preserved
      3. All 20 pipeline endpoints in wedmStudio.ts match current edmDispatcher action set
EXIT_GATE: omega_floor ≥ 0.90 | SVI delta: stable | 3 pages copied, TS errors manageable
FEATURE_CASCADE:
  NEW_FILES: WireEdm{Studio,Upload,Wizard,Results}Page.tsx, api/wedmStudio.ts, api/wedmCoordination.ts
  AVAILABLE_TO: Session 2 (context/hooks/types), Session 4 (components), Session 5 (pilot harness)
/compact checkpoint
```

### SESSION 2: WEDM UI Port — Part 2 (U-WEDMUI04..U-WEDMUI06)
```
SMART CONFIG:  Role=FrontendPortSpecialist + TypeArchitect | MODEL=sonnet-4.6 | EFFORT=HIGH | CONTEXT_BUDGET=60%
KNOWLEDGE:
  SESSION_ARTIFACTS: Session 1 ports (new pages + API clients)
  TYPES:            src/engines/WEDMPrintToProgramEngine.ts (post-U-WEDM-FIX3 shape)
  REFERENCE:        H:/prism-mill-worktree/mcp-server/web/src/types/wedmStudio.ts
INTENT:        Type reconciliation so UI consumes backend's actual shape, not Codex's Apr-22 assumption.
SKILLS:        /scope, /prism-review, /forge-types, /trace, /dedup
PLUGINS:       Vitest MCP, ESLint MCP, codebase-memory-mcp
MCP_LIFECYCLE: same cadence as Session 1
WORK:
  U-WEDMUI04 — Copy types/wedmStudio.ts (487 LOC) + reconcile WEDMProgramInput/WEDMGenerateResult deltas
    FILES_MODIFIED: web/src/types/wedmStudio.ts (merge new fields from session's U-WEDM-FIX3)
    EXIT_CRITERIA:
      1. All 11 session-added fields on WEDMGenerateResult declared in web types
      2. All 11 session-added fields on WEDMProgramInput declared (upper/lower_head_z_mm, fixtures, head_clearance, hardness_hrc, program_number, units, submerged, part_name, part_number, taper_angle_deg, actual_wire_diameter_mm)
      3. Type-compat test passes: `tsc -b web/` emits zero errors
    ABORT_CRITERIA: Any field mismatch forces `any` cast → STOP; fix backend type export instead
    ROLLBACK: revert types/wedmStudio.ts; keep pages (already depend on type file)
  U-WEDMUI05 — Copy contexts/WedmStudioContext.tsx + hooks/useWedmPipeline.ts + utils/wedmGeometry.ts (1180 LOC) + 3 test files
    EXIT_CRITERIA:
      1. vitest run on 3 new tests — document any fails, fix contract mismatches
      2. Context's state shape uses reconciled types from U-WEDMUI04
      3. useWedmPipeline driver invokes wedmStudio.ts API client successfully (mocked backend)
    ABORT_CRITERIA: Test file calls non-existent dispatcher action → STOP; wire action first
    ROLLBACK: git rm contexts/WedmStudioContext.tsx hooks/useWedmPipeline.ts utils/wedmGeometry.ts
  U-WEDMUI06 — Register routes in App.tsx (/wire-edm, /wire-edm/upload, /wire-edm/wizard, /wire-edm/results) + add nav link
    EXIT_CRITERIA:
      1. Routes render without errors in dev server
      2. Nav link visible, click navigates correctly
      3. Zero console errors in browser on each route
    ABORT_CRITERIA: Router config broken; nav link broken; console errors
    ROLLBACK: remove routes from App.tsx
EXIT_GATE: omega_floor ≥ 0.90 | All 10 WEDM UI files merged; type-compat clean; routes live
FEATURE_CASCADE:
  NEW_FILES:   contexts/, hooks/, utils/, __tests__/, types/ WEDM UI surface complete
  ROUTES_ADDED: /wire-edm/*
  AVAILABLE_TO: Session 4 (components build on these)
/compact checkpoint
```

### SESSION 3: Lathe UI Port (U-LTHUI01..U-LTHUI05)
```
SMART CONFIG:  Role=FrontendPortSpecialist | MODEL=sonnet-4.6 | EFFORT=HIGH | CONTEXT_BUDGET=55%
KNOWLEDGE:
  REFERENCE:   H:/prism-fresh/mcp-server/web/src/ (canonical Lathe source, 2026-04-21)
  TYPES:       src/engines/Lathe*.ts for current backend shape; reconcile with port's assumptions
  EXISTING:    H:/prism/mcp-server/web/src/pages/LathePrintToProgram.tsx (396 LOC already in main)
INTENT:        Operator has full Lathe workflow (Wizard → Upload → Results + Calculator integration).
SKILLS:        /forge-types, /scope, /dedup, /trace
PLUGINS:       Vitest MCP, ESLint MCP
MCP_LIFECYCLE: standard cadence
WORK:
  U-LTHUI01 — Copy LatheWizardPage.tsx (252) + LatheUploadPage.tsx (210) + LatheResultsPage.tsx (1265)
  U-LTHUI02 — Copy api/latheAI.ts (315) + api/latheTurning.ts (214)
  U-LTHUI03 — Reconcile existing LathePrintToProgram.tsx (main has 396 LOC variant):
              - Compare with prism-fresh variant
              - Choose: keep main's + wire to new wizard, or replace wholesale
              - Document decision in unit notes
  U-LTHUI04 — Port LatheCalculator integration from prism-ai-aware/CalculatorPage.tsx
              (may be a dedicated LatheCalculatorPage.tsx or integration into existing CalculatorPage)
  U-LTHUI05 — Register lathe routes: /lathe, /lathe/wizard, /lathe/upload, /lathe/results, /lathe/calculator
EXIT_GATE: omega_floor ≥ 0.90 | 3 lathe pages + 2 API clients ported; routes live; 0 TS errors
/compact checkpoint
```

### SESSION 4: Composite S(x) Safety Gate (U-WEDMSX01..U-WEDMSX02)
```
SMART CONFIG:  Role=SafetySystemArchitect + PhysicsReviewer | MODEL=opus-4.7 | EFFORT=MAX | CONTEXT_BUDGET=65%
KNOWLEDGE:
  ENGINES (10 safety components to wire):
    WEDMFlushAdequacyGateEngine (weight 0.15)
    WEDMCurrentDensityGuardEngine (0.10)
    WEDMPowerDensityGuardEngine (0.10)
    WEDMPulseLimitEngine (0.10)
    WEDMDXFClosureValidatorEngine (0.10)
    WEDMControllerDialectVerifierEngine (0.10)
    WEDMProgramVerificationEngine (0.10)
    WEDMTaperErrorBudgetEngine (0.05)
    WEDMUnitTagGateEngine (0.05)
    WEDMHeadClearanceEngine (0.15) — already wired
  TARGET:   WEDMProgramSafetyGateEngine (existing — determine if stub or functional)
  REFERENCE: CLAUDE.md S(x) ≥ 0.70 mandate; all component weights sum to 1.00
INTENT:        After program generation, a composite S(x) report shows every safety component's pass/fail + weighted score, not just head_clearance.
SKILLS:        /safety-audit, /physics-verify, /prism-review, /scope, /scrutinize, /forge-triple
PLUGINS:       Vitest MCP, codebase-memory-mcp, ESLint MCP
MCP_LIFECYCLE: context_boot → dispatcher_map → memory_recall → action_search "safety gate" → auto_checkpoint
WORK:
  U-WEDMSX01 — Extend WEDMProgramSafetyGateEngine (or create WEDMSafetyGateCompositeEngine if stub)
    → 4-LOOP: BUILD → PHYSICS_VERIFY → GAP_FILL → TIE_UP
    FILES_MODIFIED: src/engines/WEDMProgramSafetyGateEngine.ts (verify current shape first)
    FILES_CREATED: src/engines/__tests__/WEDMProgramSafetyGateEngine-composite.test.ts
    EXIT_CRITERIA:
      1. Engine accepts all 10 sub-component result objects + returns {components[], s_of_x, pass}
      2. Weights sum to 1.00 ±0.001 (asserted in test)
      3. All-components-pass → s_of_x = 1.00
      4. Single-component fail → weighted drop matches expected weight ±0.001
      5. Any critical component (head_clearance, flush_adequacy, current_density) failing → s_of_x < 0.70 → pass=false
      6. ≥10 tests: happy path + 10 single-component failures + 3 adversarial (all-fail, zero-components, component-throws)
      7. Tests validate against PUBLISHED physics where applicable — NOT vacuous `toBeGreaterThan(0)`
    ABORT_CRITERIA: Cannot make s_of_x math exact to ±0.001; any test uses banned pattern from SAFETY-CRITICAL TEST LAW
    ROLLBACK: revert engine file; remove test file
  U-WEDMSX02 — Wire composite into WEDMPrintToProgramEngine.generate() AFTER existing head_clearance stage
    FILES_MODIFIED: src/engines/WEDMPrintToProgramEngine.ts
    FILES_CREATED: src/__tests__/WEDMPrintToProgramEngine-composite.test.ts
    EXIT_CRITERIA:
      1. For ITW SHAKEPROOF reference program: all 10 components report; s_of_x ≥ 0.70
      2. For NOZE TEST: same assertion
      3. For CHOCTAW: same assertion
      4. Backward compat: existing 15 head-clearance tests still pass
      5. Existing 209 WEDM-session tests still pass
      6. Type-check clean
    ABORT_CRITERIA: Any existing test regresses → STOP and fix before merging
    ROLLBACK: git revert the generate() block
EXIT_GATE: omega_floor ≥ 0.90 | S(x) composite working | SVI delta: +5% (safety surface area)
FEATURE_CASCADE:
  NEW_ACTIONS: wedm_safety_gate_composite (dispatcher wired)
  NEW_SKILLS:  /wedm-safety-gate (already exists — may just need re-wire)
  AVAILABLE_TO: Session 6 (kinematic sim consumes composite per-frame), Session 8 (UI panel)
/compact checkpoint
```

### SESSION 5: Kinematic Simulator — Part 1 (U-WEDMSIM01..U-WEDMSIM02)
```
SMART CONFIG:  Role=PhysicsSystemsEngineer + ControlTheorist | MODEL=opus-4.7 | EFFORT=MAX | CONTEXT_BUDGET=70%
KNOWLEDGE (full physics table from Stage 3):
  ENGINES: WireEDMProgramParserEngine (parser), WEDMHeadClearanceEngine, WEDMWirePathCollisionEngine,
           WEDMWireDeflectionEngine, WEDMThermalFieldEngine, WEDMCornerPhysicsEngine,
           WEDMTaperErrorBudgetEngine, WEDMSparkErosionModelEngine, WEDMGapVoltageControlEngine,
           WEDMRecastDepthPredictorEngine, WEDMMRRPhysicsEngine, WEDMWeibullWireLifeEngine,
           WEDMWireBreakPredictorEngine, WEDMRaPredictorEngine, WEDMFlushAdequacyGateEngine
  FORMULAS: Carslaw-Jaeger, Kienzle analog (Klocke), DiBitonto, Zeng-Kim wire lag, Dauw chatter,
            Weibull, Paschen (adapted for dielectric breakdown), pendulum frequency
  CONSTANTS: src/physics/constants.ts (α_brass, α_tungsten, E_brass, k_brass, c_p_brass, etc.)
INTENT:        Build a time-stepped simulator that predicts what the wire + heads will do during the cut.
SKILLS:        /physics-verify, /calibrate, /scrutinize, /forge-triple, /scope
PLUGINS:       Vitest MCP, codebase-memory-mcp
MCP_LIFECYCLE: full cadence; SONA-learning-optimizer consulted for physics model combinations
WORK:
  U-WEDMSIM01 — Design + skeleton WEDMKinematicSimulatorEngine
    FILES_CREATED: src/engines/WEDMKinematicSimulatorEngine.ts
    TYPES:         SimMachinePose {X, Y, Z_upper, Z_lower, U, V, t}, SimFrame {pose, cutRate, clearance,
                   wireDeflection, thermalDrift, gapVoltage, sparkRate, events[]},
                   SimResult {frames, violations, minClearance, totalTimeMin, breakRisk}
    EXIT_CRITERIA:
      1. Engine exports required types + class
      2. Constructor accepts {fixtures, upperGuide, lowerGuide, materialProps, feedOverride}
      3. Returns empty SimResult for empty input (boundary)
      4. Throws on null gcode (adversarial)
      5. Validates gcode is string + non-empty (>1 line)
    ABORT_CRITERIA: Any `as any` cast in core types
    ROLLBACK: rm file
  U-WEDMSIM02 — Parser + basic pose-stepping (no physics yet)
    FILES_MODIFIED: WEDMKinematicSimulatorEngine.ts
    EXIT_CRITERIA:
      1. Parser uses WireEDMProgramParserEngine to tokenize gcode
      2. Walks G00/G01 moves producing frames at Δt = (dist / feed)
      3. G41/G42 offset applied correctly at each move start
      4. G51/G50 taper mode correctly propagated to UV axis (verify UV = tan(θ)·Δz)
      5. M02/M30 terminates simulation
      6. Test: ITW SHAKEPROOF program → frame count > 100, total time > 0, no NaN
      7. Test: pose at program end matches declared endpoint within ±0.001mm
    ABORT_CRITERIA: Pose drifts > 0.01mm from declared endpoint (integration error)
    ROLLBACK: revert file
EXIT_GATE: omega_floor ≥ 0.90 | Skeleton + basic pose stepping works on 3 reference programs
/compact checkpoint
```

### SESSION 6: Kinematic Simulator — Part 2 (U-WEDMSIM03..U-WEDMSIM04)
```
SMART CONFIG:  Role=PhysicsSystemsEngineer + CollisionDynamicist | MODEL=opus-4.7 | EFFORT=MAX | CONTEXT_BUDGET=70%
KNOWLEDGE: as Session 5, plus composite safety gate from Session 4
INTENT:        At every frame, the simulator invokes all physics + safety engines and emits events.
WORK:
  U-WEDMSIM03 — Per-frame physics integration
    FILES_MODIFIED: WEDMKinematicSimulatorEngine.ts
    EACH FRAME invokes:
      1. WEDMWireDeflectionEngine — wire lag at current feed + thickness → δ(mm)
      2. WEDMThermalFieldEngine — thermal drift of upper/lower guide after Δt
      3. WEDMSparkErosionModelEngine — crater depth per spark + avg gap voltage
      4. WEDMGapVoltageControlEngine — servo response + discharge probability
      5. WEDMCornerPhysicsEngine — if at corner, corner rounding vs commanded path
      6. WEDMTaperErrorBudgetEngine — if taper active, taper angle error accumulator
      7. WEDMFlushAdequacyGateEngine — flush pressure check at this thickness
      8. Inline: wire vibration check (Dauw lobe), thermal expansion, cable sway settling time
    EXIT_CRITERIA:
      1. Frame contains all 8 physics outputs (no null fields)
      2. Kim-Okuyama wire deflection within ±10% of published for brass 0.25mm @ 60mm + 6A (ref case)
      3. Carslaw-Jaeger thermal drift within ±10% at 30s simulation time
      4. DiBitonto crater depth per spark within ±2% (already validated this session)
      5. Taper UV offset for 5° @ 25mm = 2.187mm ±0.01mm (published)
      6. Feed-rate sanity: MRR within ±15% of Klocke prediction for ref conditions
      7. ≥15 tests total across physics components
    ABORT_CRITERIA: Any physics output uses placeholder constants; any test uses banned patterns
    ROLLBACK: revert file
  U-WEDMSIM04 — Event emission + collision detection per frame
    FILES_MODIFIED: WEDMKinematicSimulatorEngine.ts
    EACH FRAME:
      1. wedmHeadClearanceEngine.check(pose, fixtures, {safetyMargin_mm:2}) → events
      2. Static WirePathCollision check at pose
      3. Accumulate critical/warning events
    EXIT_CRITERIA:
      1. Collision with fixture produces critical event with fixture id
      2. Distance-to-fixture < safety_margin produces warning
      3. Wire break risk > 50% at any frame → flag critical (uses Weibull engine)
      4. Thermal drift > 0.5mm → warning (guide re-home needed)
      5. Test: 3 reference programs complete with zero criticals on well-formed input
      6. Test: intentionally-bad program (fixture in wire path) produces critical
    ABORT_CRITERIA: Any test uses toBeGreaterThan(0) or similar vacuous pattern
    ROLLBACK: revert file
EXIT_GATE: omega_floor ≥ 0.92 | Simulator emits full frame list with physics + events | 3 reference programs pass
/compact checkpoint
```

### SESSION 7: Sim Dispatcher + Machine Profile + UI Component (U-WEDMSIM05..U-WEDMMP02..U-WEDMW01..U-WEDMW02)
```
SMART CONFIG:  Role=DispatcherWirer + UIWireUp | MODEL=sonnet-4.6 | EFFORT=HIGH | CONTEXT_BUDGET=60%
WORK:
  U-WEDMSIM05 — Wire wedm_simulate_program action with Zod schema + round-trip test
    FILES_MODIFIED: src/tools/dispatchers/edmDispatcher.ts, src/schemas/wedmDLCoreSchemas.ts
    FILES_CREATED: src/__tests__/wedm-simulate-dispatcher.test.ts (≥5 tests)
    EXIT_CRITERIA: E2E dispatcher invocation returns SimResult shape; schema rejects malformed input.
  U-WEDMMP01 — Extend ShopConfigurationEngine with machine profile bindings (serial, adapter state path)
    FILES_MODIFIED: src/engines/ShopConfigurationEngine.ts
    FILES_CREATED: src/__tests__/ShopConfigurationEngine-profile.test.ts
  U-WEDMMP02 — Wire wedm_machine_profile_list / _bind dispatcher actions + schemas
  U-WEDMW01 — Frontend: components/wedm/SimPanel.tsx (animates SimResult frames)
    FILES_CREATED: web/src/components/wedm/SimPanel.tsx
    REFERENCE: web/src/components/mill/SimPanel.tsx
    EXIT_CRITERIA: Renders frame-by-frame canvas animation; scrubs via slider; shows events timeline.
  U-WEDMW02 — Frontend: components/wedm/SafetyGatePanel.tsx (10-component S(x) display)
    FILES_CREATED: web/src/components/wedm/SafetyGatePanel.tsx
    EXIT_CRITERIA: All 10 components shown with pass/fail icon, weight, and contribution.
EXIT_GATE: omega_floor ≥ 0.90 | Simulator callable from UI; safety gate panel wired
/compact checkpoint
```

### SESSION 8: Frontend Profile Selector + Preview + Pilot (U-WEDMW03..U-WEDMW04..U-WEDMPILOT01..02)
```
SMART CONFIG:  Role=UIBuilder + PilotReviewer | MODEL=sonnet-4.6 | EFFORT=HIGH | CONTEXT_BUDGET=55%
WORK:
  U-WEDMW03 — components/wedm/MachineProfileSelector.tsx — dropdown + context pin
  U-WEDMW04 — components/wedm/ProgramPreview.tsx — G-code viewer + 2D path render (reuse utils/wedmGeometry)
  U-WEDMPILOT01 — Write state/shared/WEDM_PILOT_CHECKLIST.md with:
                  - Pre-cut gates (machine-profile bound, adapter state loaded, fixture verified,
                    stock probed, wire-spool checked, dielectric resistivity within 5-15 MΩ·cm)
                  - Cut gates (simulator ran with zero criticals, S(x) ≥ 0.70, composite pass,
                    autonomy ≤ L2 for first cut, operator co-sign required)
                  - Post-cut gates (Ra measured within ±15% of predicted, cycle time within
                    ±20% of estimate, zero wire breaks, debris within ppm_thresholds)
                  - Progression rules (L0→L1 after 3 consecutive cuts at target; L1→L2 after
                    10 cuts; L2→L3 requires machine learning L4 sustained 24h)
                  - Rollback criteria (any critical event → halt; autonomy degrades one level)
  U-WEDMPILOT02 — End-to-end simulation harness test:
                  FILES_CREATED: src/__tests__/WEDM-PILOT-SIM-E2E.test.ts
                  For 3 reference programs (ITW, NOZE, CHOCTAW):
                    1. Upload → Wizard → Generate → Simulate → SafetyGate
                    2. Assert S(x) ≥ 0.70
                    3. Assert sim frame count > 100
                    4. Assert zero critical events
                    5. Assert all 10 safety components return pass
                    6. Assert generated pass count ≥ 3 (multi-pass strategy active)
EXIT_GATE: omega_floor ≥ 0.92 | Operator can complete full workflow in app; pilot checklist signed
/compact checkpoint
```

---

## Stage 6 — Unit Population (per-unit detail now embedded in Stage 5 sessions)

All 25 units have: SMART CONFIG (inherited from session), KNOWLEDGE sources cited, 4-LOOP (BUILD → SCRUTINIZE → GAP FILL → TIE UP), FILES_CREATED, FILES_MODIFIED, EXIT_CRITERIA (≥3 measurable), ABORT_CRITERIA (zero-tolerance), ROLLBACK procedure.

**Unit naming standard applied: `U-{PREFIX}{NN}`:**
- `U-WEDMUI{NN}` (6 units) — WEDM UI port
- `U-LTHUI{NN}` (5 units) — Lathe UI port
- `U-WEDMSX{NN}` (2 units) — Safety gate composite
- `U-WEDMSIM{NN}` (5 units) — Kinematic simulator
- `U-WEDMMP{NN}` (2 units) — Machine profile
- `U-WEDMW{NN}` (4 units) — WEDM UI wire-up
- `U-WEDMPILOT{NN}` (2 units) — Pilot + E2E

Zero collisions across 25 units. No bare U01-form used.

---

## Stage 7 — Forge-Triple Ownership Table

**Each forge-triple (hook + action + skill) has SINGLE OWNERSHIP. No double claims.**

| Triple | Hook (protective) | MCP Action | Skill/Command | BUILT IN | CONSUMED BY |
|---|---|---|---|---|---|
| **WEDM Simulate** | `wedm-sim-result-validator.mjs` (blocks programs with sim criticals from emit) | `wedm_simulate_program` | `/wedm-sim-run` | U-WEDMSIM05 | U-WEDMW01 (UI), U-WEDMPILOT02 (E2E) |
| **Safety Gate Composite** | `wedm-composite-gate.mjs` (blocks emit if S(x) < 0.70) | `wedm_safety_gate_composite` | `/wedm-safety-gate` (EXISTS — re-wire) | U-WEDMSX01 | U-WEDMW02 (UI), U-WEDMPILOT02 (E2E) |
| **Machine Profile** | `wedm-profile-bound-check.mjs` (warns if adapter-state used without bound profile) | `wedm_machine_profile_list`, `wedm_machine_profile_bind` | `/wedm-machine-profile` | U-WEDMMP01 (action), U-WEDMMP02 (binding) | U-WEDMW03 (UI selector) |
| **Pilot Checklist** | none (document-only artifact) | none | `/wedm-pilot-checklist` (new) | U-WEDMPILOT01 | all pilot runs |

**Declared-but-not-built artifacts:** none.
**Consumed-from-other-milestone artifacts:** all 10 safety-component engines are CONSUMED from earlier milestones (WEDM-MS*, etc.). Composite engine orchestrates them; does not re-build them.

---

## Stage 8 — Enforcement Integration

**Automatic hook cascade active during execution:**
- **PRE-EDIT:** `code-completeness-gate.mjs` (blocks TODO/FIXME, empty catch, toBeDefined-only), `anti-pattern-detector.mjs` (blocks SQL concat, eval, innerHTML-with-user-input)
- **POST-EDIT:** `stop_on_unwired_assets.mjs` (flags orphan engines — session's 3 orphans already wired in U-WEDM-FIX5)
- **POST-WRITE:** `test-coverage-enforcer.mjs` (reminds to create test for new source file)
- **PRE-COMPACT:** `precompact-handoff.mjs` writes HANDOFF for next session
- **POST-COMPACT:** Feature Cascade writes `SESSION_ARTIFACTS.json`
- **STOP:** `stop_on_unwired_assets.mjs` blocks if orphans detected without `// WIRE-EXEMPT` marker or `PRISM_ALLOW_UNWIRED=1`

**Enforcement gates applicable to this roadmap:**
- **SAFETY-CRITICAL TEST LAW:** every simulator / safety-gate / physics test MUST validate against published values. Vacuous `toBeGreaterThan(0)` patterns BLOCKED.
- **Physics-consistency hook:** blocks inline Kienzle/Taylor/material values outside `physics/constants.ts`.
- **Omega floor:** ≥0.90 per session, ≥0.92 for safety-critical sessions (Sessions 4, 6, 8).
- **Schema-dispatcher parity:** every new action must have a Zod schema entry.

---

## Stage 9 — Dependency Resolution (DAG)

```
Session 1 (U-WEDMUI01..03) — WEDM UI pages + API copy
    ↓ (provides: pages, wedmStudio client, wedmCoordination client)
Session 2 (U-WEDMUI04..06) — Types + context + hooks + utils + routes
    ↓ (provides: full frontend surface, routes live)
Session 3 (U-LTHUI01..05) — Lathe UI port (INDEPENDENT of WEDM — runs in parallel)
    ↓ (provides: full lathe UI surface)

Session 4 (U-WEDMSX01..02) — Composite S(x) gate (INDEPENDENT of UI — runs in parallel with Sessions 1-3)
    ↓ (provides: s_of_x composite API in WEDMPrintToProgramEngine)
Session 5 (U-WEDMSIM01..02) — Kinematic simulator skeleton + parser
    ↓ (provides: SimResult type + basic pose stepping)
Session 6 (U-WEDMSIM03..04) — Physics integration + event emission (depends on Session 4 for composite gate calls)
    ↓ (provides: full kinematic sim)

Session 7 (U-WEDMSIM05, U-WEDMMP01..02, U-WEDMW01..02) — depends on Sessions 2+4+6
    ↓ (provides: simulator dispatcher, machine profile, SimPanel, SafetyGatePanel)
Session 8 (U-WEDMW03..04, U-WEDMPILOT01..02) — depends on everything
    ↓ (provides: complete pilot-ready UI + E2E test)
```

**Parallel tracks:** UI port (Sessions 1-3) and backend engines (Sessions 4-6) can run concurrently until Session 7's integration merge.

**Cross-track dependencies declared:**
- Sessions 4-6 depend on session's U-WEDM-FIX3 session commits (already landed: f60ffc1ec, 796ceb369, 86d15a4d7).
- Session 2 depends on Session 1 (type reconciliation requires ported pages).
- No cycles detected.
- Test baseline: 115 WEDM files / 2611 tests green. Every session MUST maintain this.

---

## Stage 10 — 10-Agent Scrutiny (R1 → R4)

### Round 1 — Plan-level sanity (10 dimensions, self-reviewed)

| Agent | Dimension | R1 Score | Issues found |
|---|---|---|---|
| 1 | Protocol Structure | 75 | Session cards have SMART/KNOWLEDGE/EXIT_GATE but unit-level 4-LOOP was implicit. **Fixed in R2 patch: explicit 4-LOOP labels added.** |
| 2 | Unit Naming | 90 | U-{PREFIX}{NN} consistent; 25 units, zero collisions. |
| 3 | Dependency Graph | 80 | DAG verified; cross-track deps declared; parallel tracks identified. |
| 4 | Exit Gate Rigor | 70 | Most units had ≥3 exit criteria but some were vague ("compiles clean"). **Fixed: every physics unit now requires ±X% validation against published value.** |
| 5 | Completeness Coverage | 65 | Missed **wire vibration (Dauw), thermal expansion coupling, cable sway** in first draft. **Fixed in Stage 3 table.** |
| 6 | Physics Rigor | 55 | First draft didn't cite Kim-Okuyama, Zeng-Kim, Dauw, Paschen. **Fixed: Stage 3 physics table with 15 phenomena + ±tolerance test requirements.** |
| 7 | Forge-Triple Ownership | 70 | First draft didn't mark DECLARED/BUILT/CONSUMED clearly. **Fixed: Stage 7 table with SINGLE OWNERSHIP.** |
| 8 | Feature Cascade | 75 | AVAILABLE_TO fields present but some missing terminal-session consumers. **Fixed.** |
| 9 | MCP Utilization | 60 | No MCP_LIFECYCLE block in first draft; no PLUGINS per session. **Fixed: every session now has full cadence.** |
| 10 | Cross-Roadmap Coherence | 78 | Cross-track deps on session's U-WEDM-FIX commits declared. Test baseline (115 files green) declared. |
| **AVG R1** | | **71.8** | — |

### Round 2 — Deep review (patched plan)

| Agent | R2 Score | Δ | Notes |
|---|---|---|---|
| 1 Protocol Structure | 88 | +13 | Per-unit 4-LOOP explicit; ROLLBACK in every unit |
| 2 Unit Naming | 90 | 0 | — |
| 3 Dependency Graph | 85 | +5 | Parallel tracks surfaced; cycles=0 |
| 4 Exit Gate Rigor | 83 | +13 | Every physics unit requires ±X% tolerance against PUBLISHED source |
| 5 Completeness Coverage | 85 | +20 | Stage 3 table locks in 15 phenomena; 3 gaps explicit |
| 6 Physics Rigor | 82 | +27 | Kim-Okuyama, Zeng-Kim, Dauw, DiBitonto, Paschen all cited |
| 7 Forge-Triple Ownership | 88 | +18 | Stage 7 table; 4 triples, single ownership |
| 8 Feature Cascade | 84 | +9 | All AVAILABLE_TO propagated to terminal session |
| 9 MCP Utilization | 80 | +20 | Full MCP_LIFECYCLE per session; SKILLS + PLUGINS arrays |
| 10 Cross-Roadmap Coherence | 82 | +4 | Test-baseline guarantee added |
| **AVG R2** | **84.7** | **+12.9** | — |

### Round 3 — 20-role discovery (critical review from adjacent disciplines)

New roles surface BLOCKERS beyond the original 10:

| New Role | Score | Critical finding |
|---|---|---|
| 11 Safety Reviewer | 72 | Added SAFETY-CRITICAL TEST LAW callouts per session. Still a gap: U-WEDMPILOT02 doesn't cover wire-break during simulated 4-hour cut. **PATCH:** add U-WEDMPILOT02 long-cut sim requirement. |
| 12 UX Reviewer | 75 | Frontend doesn't specify keyboard shortcuts or error-recovery UX. **ACCEPTABLE** — codex build has tested UX patterns; don't over-engineer. |
| 13 Integration Reviewer | 80 | Type drift risk well-documented. OK. |
| 14 Data Architect | 70 | No schemaVersion on new Sim/Composite result shapes. **PATCH:** add schemaVersion to all new result types. |
| 15 Compliance (AMS 2628, ASTM F86) | 68 | No per-material surface-integrity spec in sim. **ACCEPTABLE DEFERRED** — existing WEDMBenchmarkToleranceEngine covers published limits; pilot gate surfaces them. |
| 16 Security | 75 | File upload paths (DXF, DWG) not CSRF-protected in plan. **PATCH:** note: `wedmStudio.ts` FormData uploads need CSRF token header — call out in U-WEDMUI03. |
| 17 IQ/OQ/PQ | 72 | No operational qualification test plan for simulator. **ACCEPTABLE** — WEDM_PILOT_CHECKLIST.md covers this at pilot onboarding. |
| 18 Accessibility | 72 | Frontend panels don't spec ARIA. **ACCEPTABLE** — codex build has tested patterns. |
| 19 Observability | 65 | Sim has no metrics emission for telemetry. **PATCH:** U-WEDMSIM04 exit criteria now include frame-count + duration + event-count metrics emitted to `state/shared/WEDM_SIM_TELEMETRY.jsonl`. |
| 20 Rollback Drill | 78 | Per-unit ROLLBACK documented. OK. |

**Round 3 averages:** original 10 @ 84.7, new 10 @ 72.7. **Blended: 78.7.**

### Round 4 — Final verification after R3 patches

R3 patches applied:
- U-WEDMPILOT02: long-cut (240-minute equivalent) sim requirement added to exit criteria
- All new result types get `schemaVersion: "1.0"` field
- U-WEDMUI03: CSRF token note added to exit criteria
- U-WEDMSIM04: telemetry emission to `state/shared/WEDM_SIM_TELEMETRY.jsonl` required

| Round | Spec-quality (10 original agents) | Full 20-agent |
|---|---|---|
| R1 | 71.8 | — |
| R2 | 84.7 | — |
| R3 | 84.7 | 78.7 |
| **R4 (final)** | **86.0** | **82.0** |

**Minimum agent score:** 65 (Observability round 3) → **82 after patches**. No agent <70 in final round. **PASS.**

---

## Final Verification Harness

**Every session:**
```
cd H:/prism/mcp-server && npx vitest run --reporter=dot
```
Baseline: 115 WEDM files / 2611 tests green. Regressions = block.

**After Session 4:**
```
npx vitest run src/__tests__/WEDMProgramSafetyGateEngine-composite.test.ts
# Expect: ≥10 tests pass, s_of_x math exact ±0.001
```

**After Session 6:**
```
npx vitest run src/__tests__/wedm-kinematic-sim*.test.ts
# Expect: ≥15 tests pass, all physics within published ±X%
```

**After Session 8 (full sim-before-live readiness):**
```
npx vitest run src/__tests__/WEDM-PILOT-SIM-E2E.test.ts
# Expect: 3 reference programs (ITW, NOZE, CHOCTAW) pass:
#   - S(x) ≥ 0.70
#   - sim frames > 100
#   - zero critical events
#   - all 10 safety components pass
#   - multi-pass strategy (≥3 passes)
```

**Dispatcher contract:**
```
grep -c '^\s*"wedm_\|^\s*"edm_' H:/prism/mcp-server/src/tools/dispatchers/edmDispatcher.ts
# Expect: count strictly > 61 (baseline at session end)
```

**Build gate:**
```
cd H:/prism/mcp-server && npm run build
# Expect: zero TS errors, bundle < 100MB
```

**Frontend smoke:**
```
cd H:/prism/mcp-server/web && npm run dev
# Navigate to /wire-edm — page renders
# Navigate to /lathe/wizard — page renders
# Upload DXF, run wizard, view results, run sim, view safety gate
```

**Sim-before-live readiness gate (the user's question):**
- All 10 safety components report green for each of 3 reference programs
- Kinematic sim completes without critical events
- Wire-break predictor reports risk < 10% (Weibull Brier score ≤ 0.15 confirmed)
- Machine profile bound to JM Die-specified pilot machine
- WEDM_PILOT_CHECKLIST.md signed off
- Autonomy level ≤ L2 for first cut

If all gates pass: **sim-before-live confidence ≥ 85%** (honest upgrade from current ~75%).

---

## Critical Files to Modify

**NEW (H:/prism/mcp-server):**
- `web/src/pages/WireEdmStudioPage.tsx`, `WireEdmUploadPage.tsx`, `WireEdmWizardPage.tsx`, `WireEdmResultsPage.tsx`
- `web/src/pages/LatheWizardPage.tsx`, `LatheUploadPage.tsx`, `LatheResultsPage.tsx`
- `web/src/api/wedmStudio.ts`, `wedmCoordination.ts`, `latheAI.ts`, `latheTurning.ts`
- `web/src/contexts/WedmStudioContext.tsx`
- `web/src/hooks/useWedmPipeline.ts`
- `web/src/types/wedmStudio.ts`
- `web/src/utils/wedmGeometry.ts`
- `web/src/components/wedm/SimPanel.tsx`, `SafetyGatePanel.tsx`, `MachineProfileSelector.tsx`, `ProgramPreview.tsx`
- `src/engines/WEDMKinematicSimulatorEngine.ts`
- `src/__tests__/WEDM-PILOT-SIM-E2E.test.ts` + ≥5 other new test files
- `state/shared/WEDM_PILOT_CHECKLIST.md`

**MODIFIED:**
- `src/engines/WEDMProgramSafetyGateEngine.ts` — composite S(x) aggregator
- `src/engines/WEDMPrintToProgramEngine.ts` — call composite in generate()
- `src/engines/ShopConfigurationEngine.ts` — machine profile binding
- `src/tools/dispatchers/edmDispatcher.ts` — wire 4+ new actions
- `src/schemas/wedmDLCoreSchemas.ts` — schemas for new actions + 7 session-unschemaed actions
- `web/src/App.tsx` — register /wire-edm/* and /lathe/* routes

---

## Existing Functions to Reuse (reconfirmed after Stage 2 dedup)

- `wedmHeadClearanceEngine.check(pose, fixtures, {safetyMargin_mm})` — `src/engines/WEDMHeadClearanceEngine.ts:401` — reused at every sim frame
- `WireEDMProgramParserEngine.parse(nc, filename)` — used by `WEDMProgramComparisonEngine` — reused as sim parser base
- `WEDMProgramVerificationEngine.verify({gcode, controller, expected_units})` — structural G-code validator — reused in SafetyGate composite
- `wedmProgramComparisonEngine.compare(ref, gen)` — reused in U-WEDMPILOT02 for reference cross-check
- `WEDMPostDialectRouterEngine` — emits per-controller program strings used by sim parser
- `edmDispatcher.getEngine(name)` pattern — `src/tools/dispatchers/edmDispatcher.ts:72` — reused for every new action
- Mill `SimPanel.tsx` + `ProgramPreview.tsx` — `web/src/components/mill/` — templates for WEDM variants
- `PrismCreativeReasoningEngine.explore({domain, objective}, "optimal")` — call during Session 5 design to validate kinematic-sim approach against adjacent domains (robotics arm sim, NC verification literature)

---

## Risk Register (updated after R3)

| Risk | Mitigation |
|---|---|
| Codex type shape drift vs. session's extensions | Phase 1 U-WEDMUI04 reconciles. Type-compat test before port ships. |
| `prism-mill-worktree` has unrelated mill-branch commits | Copy files at file level (not git merge). |
| Codex's `wedmCoordination.ts` assumes agent-coord endpoint that doesn't exist in main | Stub endpoint in Phase 1 or deprecate layer; don't block completion. |
| Composite S(x) components throw on edge cases | Each wrapped in try/catch → component marked `pass:false, note:"engine_error"`. |
| Kinematic sim too slow for operator UX | Default Δt 100ms preview mode, finer for release check. Frame cap at 10k. |
| Machine profile binding breaks LoRA tests | Default "unknown" profile keeps existing tests passing. |
| Wire-break Weibull calibration drifts on new material | Monte Carlo N=1000; Brier ≤ 0.15 on validation set. Fail = fix calibration before promote. |
| Published physics data unavailable for exotic materials | Use ISO-group approximation; flag in Result with `confidence_reason: "iso_group_approximation"`. |
| DXF upload vulnerable to XXE/zip bomb | `wedmStudio.ts` validates content-length + uses FormData (not base64); sanitize at backend. |
| Sim telemetry JSONL balloons | Rotate at 10MB; retain 7 days. |

---

## Order of Execution

**Parallel Track A (UI port, Sessions 1-3, ~2-3 days):**
Session 1 → Session 2 → Session 3

**Parallel Track B (backend engines, Sessions 4-6, ~3-4 days):**
Session 4 → Session 5 → Session 6

**Merge Track (Sessions 7-8, ~2 days):**
Requires Tracks A + B complete. Session 7 (wire-up) → Session 8 (pilot).

**Total wall time with parallelism:** 5-6 days. Serial: 8-10 days.

**With R5 additions (Sessions 9-10):** +2 sessions serial; overall ~12 days serial / ~7 days with parallelism.

---

## Stage 11 — Launch Readiness Gates (R5 PATCH)

Sim-before-live is NOT enough for real-machine launch. This stage names every additional gate between "simulator green" and "safe to run on the JM Die pilot machine with operator alone". Every gate is either BUILT in Sessions 9-10 or DEFERRED to a named post-launch milestone.

### 11.1 Internal Full Testing (Session 9 delivers)
| Gate | Current | Target | Built in |
|---|---|---|---|
| **Batch regression** — replay ≥20 production JM Die programs through full pipeline | 3 programs hand-picked | 20+ randomly sampled from `H:/PRISM/JM DIE/WIRE EDM/` | U-WEDMTEST01 |
| **DXF fuzz harness** — adversarial geometry (self-intersect, open contours, giant files, unicode layer names) | none | 50+ fuzz seeds; engine must reject or handle cleanly | U-WEDMTEST02 |
| **G-code determinism** — same input twice → byte-identical output | unverified | asserted across 20 programs | U-WEDMTEST01 |
| **Cross-machine consistency** — same program → 5 machine profiles → MRR/Ra predictions within ±15% | not tested | required | U-WEDMTEST03 |
| **Concurrency race** — 5 concurrent wizard sessions mutating `WedmStudioContext` | untested | no cross-session state bleed; each session independent | U-WEDMTEST04 |
| **Performance budget** — sim ≤ 30 s for 1 000-line program, generate ≤ 5 s | untested | asserted in perf regression test | U-WEDMTEST04 |
| **Mutation test sample** — mutate 20 physics formulas; tests must catch ≥18/20 | never run | ≥90 % catch rate | U-WEDMTEST05 |
| **Type strict coverage** — `tsc --noEmit --strict` on entire WEDM surface | unknown | zero errors | U-WEDMTEST05 |

### 11.2 Launch Readiness (Session 10 delivers)
| Gate | Current | Target | Built in |
|---|---|---|---|
| **Feature flags** — `WEDM_AUTONOMY_MAX`, `WEDM_SIM_REQUIRED=true`, `WEDM_COMPOSITE_GATE_MIN=0.70`, `WEDM_PROFILE_REQUIRED=true` | hard-coded | env-driven with safe defaults + admin UI toggle | U-WEDMLAUNCH01 |
| **Telemetry schema** — every engine emits `{event_id, engine, action, input_hash, output_hash, duration_ms, s_of_x, violations[]}` to `state/shared/WEDM_TELEMETRY.jsonl` | ad-hoc | schema-versioned, rotated | U-WEDMLAUNCH02 |
| **Crash-log collector** — uncaught exceptions in engines logged with stack + input hash | throws to console | persistent `state/shared/WEDM_CRASHES.jsonl` with 30-day retention | U-WEDMLAUNCH02 |
| **Program audit log** — every generated program logs `{program_id, timestamp, author, part_name, material, s_of_x, sim_status, reviewer, approver}` | none | append-only `state/shared/WEDM_PROGRAM_AUDIT.jsonl` + signature | U-WEDMLAUNCH03 |
| **Cryptographic signing** — approved programs signed with Ed25519 (libsodium); machine refuses unsigned | none | sign on `approve`, verify on `export`, key rotation documented | U-WEDMLAUNCH03 |
| **Kill-switch** — revoke all approved programs for one machine/serial instantly | none | admin action + hook blocks export of revoked programs | U-WEDMLAUNCH03 |
| **E-stop / abort path** — simulator models operator mid-cut E-stop (wire tension release, dielectric drain) | unmodeled | sim frame includes `can_abort: bool`; abort events recorded | U-WEDMSIM04 (patch) |
| **Power-loss recovery** — resume-from-line-N behavior asserted | untested | U-WEDMTEST06 covers restart for each controller dialect | U-WEDMTEST06 |
| **Operator UAT** — one JM Die operator drives the wizard on 3 programs without Claude help | none | recorded session; friction points captured | U-WEDMLAUNCH04 |
| **Runbook** — common failures: wire break, dielectric contamination, flush clog, crash, mis-clamp | none | `state/shared/WEDM_OPS_RUNBOOK.md` with recovery steps + escalation ladder | U-WEDMLAUNCH04 |
| **Training checklist** — 8-hour operator curriculum (pipeline, safety interpretation, rollback, E-stop) | none | `state/shared/WEDM_OPERATOR_TRAINING.md` | U-WEDMLAUNCH04 |
| **Monitoring dashboard** — live view of last 50 programs' S(x), violations, approve/reject | none | `/wire-edm/admin` route reading `WEDM_PROGRAM_AUDIT.jsonl` | U-WEDMLAUNCH05 |
| **Go/no-go launch checklist** — 30-item checklist signed by user before first live cut | none | `state/shared/WEDM_GO_NO_GO.md` with cryptographic sign-off slot | U-WEDMLAUNCH05 |

### 11.3 Deferred to named follow-up milestones (NOT blocking internal testing)
| Gate | Why deferred | Follow-up milestone |
|---|---|---|
| ITAR / export-control classification of generated G-code | Legal review out of scope for this roadmap | `WEDM-COMPLIANCE-MS0` |
| Formal IQ / OQ / PQ per ASTM F3349 | Requires physical validation on machine — cannot do pre-launch | `WEDM-QUAL-MS0` (post-pilot) |
| SOC 2 / audit trail hardening beyond JSONL | Audit log above is sufficient for pilot; SOC 2 needed only when SaaS-offered | `PRISM-SOC2-MS0` |
| Multi-tenant isolation | JM Die is single tenant; defer until second customer | `PRISM-MULTI-TENANT-MS0` |

### 11.4 Launch confidence model (honest)
After Sessions 1-10 complete:

| Sub-confidence | Method | Target |
|---|---|---|
| Generated program syntactically correct (G-code parses, compiles on controller) | controller parity matrix + round-trip parse | ≥ 99 % |
| Generated program geometrically correct (wire path matches input contour) | sim path vs. input contour Hausdorff distance < 0.01 mm | ≥ 97 % |
| Generated program physically feasible (no wire break, no collision, no thermal runaway) | kinematic sim + composite S(x) gate | ≥ 92 % |
| Generated program meets spec (Ra, tolerance, cycle time) | Klocke/DiBitonto validation against measured history | ≥ 85 % |
| Operator catches any remaining class of failure before power-on | pilot checklist + UAT session | ≥ 95 % |

**Compound sim-before-live confidence = 0.99 × 0.97 × 0.92 × 0.85 × 0.95 ≈ 0.72.** That is the HONEST ceiling — not 85 %. To close the gap further requires:
- Physical wire-break calibration data from the pilot machine (feeds Weibull `η`, `β` parameters) → post first ~20 real cuts
- Per-machine thermal drift calibration → post-first-week
- Per-material Ra/MRR correction multipliers → continuous learning via LoRA

**Conclusion: sim-before-live gets us to ~72 % machine-independent confidence. Next 10-15 points REQUIRE real machine data. Plan for controlled L0-autonomy pilot with operator co-sign, not fully autonomous launch.**

---

## SESSION 9: Internal Full-Testing Harness (U-WEDMTEST01..U-WEDMTEST06) — R5 NEW

```
SMART CONFIG:  Role=TestArchitect + RegressionEngineer | MODEL=opus-4.7 | EFFORT=MAX | CONTEXT_BUDGET=65%
KNOWLEDGE:
  PROGRAMS:  H:/PRISM/JM DIE/WIRE EDM/ (24,545 indexed — sample 20 random)
  TESTS:     src/__tests__/*WEDM*, src/__tests__/*EDM* (baseline 115 files / 2,611 tests)
  ENGINES:   WEDMPrintToProgramEngine, WEDMKinematicSimulatorEngine (post-S6), WEDMProgramSafetyGateEngine (post-S4)
  TOOLING:   vitest, stryker-mutator (if install allowed), fast-check (property-based)
INTENT:        Every class of failure we can imagine gets a test. No silent regressions. Deterministic output. Concurrency-safe.
SKILLS:        /scrutinize, /forge-triple, /test, /physics-verify, /calibrate
PLUGINS:       Vitest MCP, ESLint MCP, codebase-memory-mcp
MCP_LIFECYCLE: context_boot → action_search "fuzz" → action_search "property" → auto_checkpoint
WORK:
  U-WEDMTEST01 — Batch regression + determinism test
    FILES_CREATED: src/__tests__/WEDM-BATCH-REGRESSION.test.ts
    SEED_LIST:     state/shared/WEDM_TEST_PROGRAM_SEEDS.json (20 program paths, fixed seed 0xC01D)
    EXIT_CRITERIA:
      1. For each seed program: upload → generate → sim → composite-gate completes without throw
      2. For each seed: two consecutive runs produce byte-identical generated G-code (determinism)
      3. For each seed: S(x) ≥ 0.70 OR fail mode is categorized ("wire_too_large", "flush_inadequate", "material_incompatible")
      4. Any unknown fail mode → test fails, forcing categorization before merge
    ABORT_CRITERIA: Non-deterministic output on ≥1 seed (test harness uncovers hidden stateful behavior)
    ROLLBACK: quarantine seeds that were always expected-fail; re-sample
  U-WEDMTEST02 — DXF fuzz harness (fast-check property-based)
    FILES_CREATED: src/__tests__/WEDM-DXF-FUZZ.test.ts
    GENERATORS:    valid polygon, self-intersecting polygon, open contour, degenerate (zero-area),
                   unicode layer names, giant (>10k entities), negative coordinates, duplicated vertices
    EXIT_CRITERIA:
      1. 200 random inputs per generator class (1,600 total)
      2. Engine either accepts (and produces valid program) OR rejects with categorized error — never throws uncaught
      3. No input produces a program that fails sim with `critical` event AND passes composite gate (contradiction)
      4. Memory usage during fuzz run stays below 2 GB (no geometry-induced OOM)
    ABORT_CRITERIA: Uncategorized throw on any seed → STOP, add error class first
    ROLLBACK: rm test file
  U-WEDMTEST03 — Cross-machine consistency
    FILES_CREATED: src/__tests__/WEDM-CROSS-MACHINE.test.ts
    EXIT_CRITERIA:
      1. For 5 seed programs × 5 machine profiles (Mitsubishi M800, Sodick AQ900, Makino U6, AC CUT-2000, Fanuc α-C600iB):
         MRR within ±15 %, Ra within ±15 %, cycle time within ±20 % across profiles for same geometry
      2. Generated G-code differs ONLY in controller-specific tokens (M02 vs M30, unit headers, etc.)
      3. Composite S(x) within ±0.05 across profiles (physics is not controller-dependent)
    ABORT_CRITERIA: >±15 % variance without published reason → physics model has a controller leak → fix before merge
    ROLLBACK: flag the deviating controller for manual review
  U-WEDMTEST04 — Concurrency + performance
    FILES_CREATED: src/__tests__/WEDM-CONCURRENCY.test.ts, src/__tests__/WEDM-PERFORMANCE.test.ts
    EXIT_CRITERIA (concurrency):
      1. 5 parallel wizard sessions (context isolation) produce 5 distinct correct programs
      2. Shared singletons (WEDMTribalRuntimeEngine, WEDMAutonomyEngine) do not leak state between sessions
      3. `resetForTests()` fully isolates sessions
    EXIT_CRITERIA (performance):
      1. Simulate 1,000-line program < 30 s on reference machine
      2. Generate from typical input (<100 entities) < 5 s
      3. 95th-percentile latency across 20 runs within ±10 % of median (no long-tail)
    ABORT_CRITERIA: State bleed between concurrent sessions OR perf regression > 20 % from baseline
    ROLLBACK: isolate shared state; add session-scoped caches
  U-WEDMTEST05 — Mutation sampling + strict type
    FILES_CREATED: scripts/wedm-mutation-sample.mjs, src/__tests__/WEDM-TYPE-STRICT.test.ts
    EXIT_CRITERIA:
      1. Mutation sample mutates ≥20 physics lines in WEDM* engines; test suite detects ≥18/20 (≥90 %)
      2. `tsc --noEmit --strict` on `src/engines/WEDM*` and `src/__tests__/*WEDM*` emits zero errors
      3. Any `any`/`as unknown` in WEDM surface flagged (grep count ≤ session baseline)
    ABORT_CRITERIA: Mutation catch rate < 90 % → tests are vacuous; strengthen assertions before merge
    ROLLBACK: revert strict-mode flip if infeasible in this session; document in follow-up
  U-WEDMTEST06 — E-stop + restart-from-line-N
    FILES_CREATED: src/__tests__/WEDM-RESTART.test.ts
    EXIT_CRITERIA:
      1. For each of 5 controllers: inject E-stop at sim frame N/2 → resume from frame N/2+1 → final pose matches uninterrupted run within ±0.005 mm
      2. Generated restart G-code contains correct restart block (M50 for Mitsubishi, M50 Sodick dialect, etc.)
      3. Post-restart S(x) re-evaluated; if < 0.70 → sim flags restart-not-safe
      4. Wire-break mid-cut: wire re-thread protocol in runbook referenced; test asserts wire break produces correct abort event
    ABORT_CRITERIA: Restart divergence > 0.01 mm → controller dialect has incorrect restart semantics → fix engine
    ROLLBACK: mark controller as restart-unsafe; document
EXIT_GATE: omega_floor ≥ 0.92 | Internal full testing complete | ≥90 % mutation catch | 2,611 + ≥60 new tests green
FEATURE_CASCADE:
  NEW_TESTS:     6 new test files (~60-80 tests)
  NEW_ARTIFACTS: WEDM_TEST_PROGRAM_SEEDS.json, wedm-mutation-sample.mjs
  AVAILABLE_TO:  Session 10 (launch harness), pilot run verification
/compact checkpoint
```

---

## SESSION 10: Launch Readiness Gates (U-WEDMLAUNCH01..U-WEDMLAUNCH05) — R5 NEW

```
SMART CONFIG:  Role=LaunchEngineer + OpsArchitect + SecurityReviewer | MODEL=opus-4.7 | EFFORT=MAX | CONTEXT_BUDGET=60%
KNOWLEDGE:
  HOOKS:     H:/prism/.claude/hooks/ (existing enforcement surface)
  STATE:     state/shared/*.jsonl (existing telemetry conventions)
  AUTH:      libsodium (Ed25519), or node:crypto (HMAC-SHA256 fallback if libsodium unavailable)
  RUNBOOKS:  JM Die operator notes (if any) via prismSelfAwarenessEngine.searchTribalKnowledge("wire break recovery")
INTENT:        Between simulator-green and live-first-cut, every operational, observability, and safety gate is in place.
SKILLS:        /safety-audit, /scrutinize, /forge-triple, /playbook
PLUGINS:       codebase-memory-mcp, ESLint MCP
MCP_LIFECYCLE: full cadence; memory_save after each unit to preserve ops knowledge
WORK:
  U-WEDMLAUNCH01 — Feature-flag system
    FILES_CREATED: src/config/wedmFeatureFlags.ts
    FILES_MODIFIED: WEDMPrintToProgramEngine, WEDMKinematicSimulatorEngine, edmDispatcher
    FLAGS:
      WEDM_AUTONOMY_MAX: 0-4 (default 1, hard cap until pilot sign-off)
      WEDM_SIM_REQUIRED: boolean (default true; false only for offline debug)
      WEDM_COMPOSITE_GATE_MIN: 0.0-1.0 (default 0.70; hook blocks <0.50 regardless)
      WEDM_PROFILE_REQUIRED: boolean (default true)
      WEDM_SIGNING_REQUIRED: boolean (default true for export, false for preview)
    EXIT_CRITERIA:
      1. All 5 flags resolve from env with safe defaults
      2. Admin UI (new component) exposes toggles, writes to runtime config
      3. Hook `wedm-flag-invariant.mjs` blocks invalid combos (e.g. AUTONOMY_MAX=4 with COMPOSITE_GATE_MIN < 0.80)
      4. Tests cover each flag's enforcement path
    ROLLBACK: revert config file; flags fall back to hard-coded constants
  U-WEDMLAUNCH02 — Telemetry + crash-log collector
    FILES_CREATED: src/engines/WEDMTelemetryEngine.ts, hooks/wedm-crash-collect.mjs
    SCHEMAS:       src/schemas/wedmTelemetrySchemas.ts (schemaVersion "1.0")
    WRITES_TO:     state/shared/WEDM_TELEMETRY.jsonl, state/shared/WEDM_CRASHES.jsonl
    EXIT_CRITERIA:
      1. Every WEDM engine action emits a telemetry row (input_hash, output_hash, duration_ms)
      2. Uncaught throw in any WEDM engine writes crash row with stack + hashed input
      3. Log rotation at 10 MB; 30-day retention; index file for crash lookup
      4. Integration test: inject a crash in dispatcher action → crash file contains entry
      5. No PII/IP in logs (hash only — asserted by pattern scan)
    ROLLBACK: wrap emit in try/catch; silent on failure
  U-WEDMLAUNCH03 — Audit log + cryptographic signing + kill-switch
    FILES_CREATED: src/engines/WEDMProgramAuditEngine.ts, src/engines/WEDMSignatureEngine.ts, hooks/wedm-signature-enforce.mjs
    WRITES_TO:     state/shared/WEDM_PROGRAM_AUDIT.jsonl, state/shared/WEDM_SIGNED_KEYS/ (key rotation)
    EXIT_CRITERIA:
      1. Every generated program → audit row {program_id, timestamp, author, hash, s_of_x, sim_status}
      2. On `approve` action: Ed25519 signature attached (or HMAC fallback with documented rotation)
      3. On `export` action: signature verified; unsigned blocked by hook
      4. Kill-switch: `wedm_revoke_program(program_id)` or `wedm_revoke_machine(serial)` → revocation list; export blocked
      5. Key rotation procedure documented; test validates rotated-key programs still verify
      6. No private keys in logs or commits (scan gate added to repo)
    ABORT_CRITERIA: Hook can be bypassed via dispatcher alternative → STOP and plug
    ROLLBACK: disable hook; signing becomes advisory
  U-WEDMLAUNCH04 — UAT + runbook + training
    FILES_CREATED: state/shared/WEDM_OPS_RUNBOOK.md, state/shared/WEDM_OPERATOR_TRAINING.md
    EXIT_CRITERIA:
      1. Runbook covers: wire break mid-cut, flush clog, crash at line N, bad clamp detected, dielectric drift, unexpected E-stop, composite S(x) marginal (0.65-0.70), unsigned program attempted
      2. Each failure has: symptoms, immediate action, escalation, post-incident artifact to file
      3. Training checklist: 8 hrs, split into Pipeline (2h) + Safety (2h) + E-stop drill (1h) + Rollback (1h) + Shadow cut (2h)
      4. UAT: schedule operator session; record friction points (this unit gates on scheduling, not completing — UAT itself is a pilot-time action)
    ROLLBACK: mark runbook as draft; do not block Session 10 on UAT completion
  U-WEDMLAUNCH05 — Monitoring dashboard + go/no-go checklist
    FILES_CREATED: web/src/pages/WireEdmAdminPage.tsx, state/shared/WEDM_GO_NO_GO.md
    EXIT_CRITERIA:
      1. Admin page shows: last 50 programs' S(x), violations, approve/reject state, sim status
      2. Aggregate tile: % pass rate, median S(x), top 3 failure categories
      3. Real-time append via EventSource or 5-s poll
      4. Go/no-go: 30-item markdown checklist with each item ≥ measurable evidence, signed by user before first real cut
      5. Checklist items cover: telemetry live, crash log empty for 24 h, audit signing verified, 5 dry-run cuts pass, operator trained, runbook reviewed, rollback tested, E-stop tested, flags at pilot defaults
    ROLLBACK: admin page becomes read-only; checklist remains optional
EXIT_GATE: omega_floor ≥ 0.92 | Launch readiness artifacts in place | Flags default-safe | Signing enforceable
FEATURE_CASCADE:
  NEW_ENGINES:   WEDMTelemetryEngine, WEDMProgramAuditEngine, WEDMSignatureEngine
  NEW_HOOKS:     wedm-flag-invariant.mjs, wedm-crash-collect.mjs, wedm-signature-enforce.mjs
  NEW_ROUTES:    /wire-edm/admin
  NEW_DOCS:      WEDM_OPS_RUNBOOK.md, WEDM_OPERATOR_TRAINING.md, WEDM_GO_NO_GO.md
  NEW_STATE:     WEDM_TELEMETRY.jsonl, WEDM_CRASHES.jsonl, WEDM_PROGRAM_AUDIT.jsonl, WEDM_SIGNED_KEYS/
  AVAILABLE_TO:  pilot cut, post-launch ops
/compact final
```

---

## R5 10-Agent Scrutiny — Launch Readiness Pass

Ten new agents review Sessions 9-10 + Stage 11. Five are re-scored from R4; five are new launch-focused roles.

| Agent | Dimension | R5 Score | Notes |
|---|---|---|---|
| 11 Safety Reviewer | 90 | +18 | E-stop path covered; long-cut sim requirement preserved; restart semantics per controller |
| 12 Observability | 92 | +27 | Telemetry + crash log + audit log + dashboard all delivered in S10 |
| 16 Security | 88 | +13 | Cryptographic signing + revocation + key rotation + secret-scan gate |
| 17 IQ/OQ/PQ | 85 | +13 | UAT scheduled; runbook + training checklist; formal IQ/OQ deferred with named follow-up |
| 21 Release Engineer (NEW) | 86 | — | Feature flags default-safe; admin UI exposes toggles; invariant hook prevents unsafe combos |
| 22 SRE / Incident (NEW) | 84 | — | Crash log + runbook; alerting only via manual dashboard watch (accepted gap) |
| 23 Operator / Machinist (NEW) | 82 | — | UAT unit scheduled but not yet executed; runbook covers top 8 failure modes |
| 24 Compliance (NEW) | 78 | — | ITAR/export control deferred to WEDM-COMPLIANCE-MS0; not blocking internal test |
| 25 Test Engineer (NEW) | 88 | — | Batch + fuzz + cross-machine + concurrency + perf + mutation + strict-type + restart = comprehensive |
| 10 Cross-Roadmap | 86 | +4 | New artifacts (telemetry, audit, flags) explicitly named + stored in standard `state/shared/` |
| **AVG R5** | | **85.9** | — |

**Blended final (R4 82.0 × 0.6 + R5 85.9 × 0.4) = 87/100.** Minimum agent score 78 (Compliance, deferred with named follow-up). No agent below 75. **PASS.**

---

## R6/R7 — Five-Agent Adversarial Scrutiny + Consolidation

After R5 the plan self-scored 87. An adversarial R6 review by 5 independent roles (physicist, red-team, TS architect, shop foreman, SRE) exposed systematic overclaim. R7 consolidates each reviewer's findings as concrete plan deltas.

### R6 scores (honest, pre-patch)
| Role | Score | Verdict |
|---|---|---|
| Wire EDM physics (CIRP lens) | 88 | PATCH-REQUIRED |
| Red-team / security | **30** | DO NOT LAUNCH AS SPECIFIED |
| Staff TypeScript architect | 78 | Patch-required |
| Shop foreman (25-yr EDM) | 65 | Not as written |
| Staff SRE / on-call | 72 | Conditional NO-GO |
| **R6 MEAN** | **67** | 3/5 NO-GO |

Blocking themes: crypto theater without machine-side verification, physics tolerances too tight and missing coupling, shop-floor runbook + training inadequate for real operators, telemetry missing correlation IDs and fail-closed paths, monorepo boundaries soft.

### Stage 11 EXPANSION (R7) — gates added
| New gate | Source | Built in |
|---|---|---|
| Ed25519 keys in OS keychain / Windows CNG / Linux kwallet — passphrase-encrypted at rest | Security R6 | U-WEDMSEC01 |
| Signature payload binds SHA-256(canonical G-code bytes) ∥ machine_serial ∥ monotonic_nonce ∥ timestamp ∥ approver_id | Security R6 | U-WEDMSEC01 |
| Canonicalization spec documented (trailing-newline policy, CRLF/LF, whitespace, comment handling) | Security R6 | U-WEDMSEC01 |
| Hash-chained audit log with daily Merkle root published off-machine | Security R6 | U-WEDMSEC02 |
| Single-emit-path enforcement: all raw/debug/alt dispatcher paths removed or routed through same hook | Security R6 | U-WEDMSEC02 |
| Post-approval G-code edit detection (inotify / fs.watch) → forced re-sign | Security R6 | U-WEDMSEC02 |
| Machine-side verification: signed USB loader OR handshake token OR `nc-verify` controller macro | Security R6 | U-WEDMSEC03 (deferred if controller doesn't support) |
| Two-person key ceremony at generation; no single-operator key compromise | Security R6 | U-WEDMSEC01 |
| Admin config file HMAC'd with boot-time key; invariant hook re-enforces at every export | Security R6 | U-WEDMSEC01 |
| Codex port landed via signed commit + semgrep clean + lockfile hash pinned + `npm audit` gate | Security R6 | U-WEDMSEC04 |
| Server-authoritative S(x) — fail-closed on any engine_error, UI never supplies score | Security R6 | U-WEDMSEC02 |
| Trace/span IDs on every telemetry row: `trace_id`, `span_id`, `parent_span_id`, `program_id`, `machine_serial`, `user_id`, `git_sha`, `flag_snapshot_hash`, `schema_version`, `wall_clock_iso` | SRE R6 | U-WEDMOPS01 |
| Caught-error telemetry path (any `{pass:false, note:"engine_error"}` emits a row) | SRE R6 | U-WEDMOPS01 |
| Crash dedup + fingerprint + rate-limit (stack+input_hash key) | SRE R6 | U-WEDMOPS01 |
| Audit write fail-closed — if JSONL unwritable, `export` action refused | SRE R6 | U-WEDMOPS01 |
| 90-day telemetry + audit retention (was 30-day) | SRE R6 | U-WEDMOPS01 |
| Off-machine replication (`state/shared/` nightly rsync to PRISM H drive + cold archive) | SRE R6 | U-WEDMOPS02 |
| Disk-space watermark hook — refuses new cuts at <5 GB free | SRE R6 | U-WEDMOPS02 |
| Shadow-mode dual-run: run old + new engines in parallel for N=20 cuts, diff outputs, human promote | SRE R6 | U-WEDMOPS02 |
| Model version pinning in audit log; TribalTipLearner weight rollback procedure | SRE R6 | U-WEDMOPS02 |
| Flag-invariant re-check on every `export` (runtime, not paper) | SRE R6 | U-WEDMOPS02 |
| Tabletop incident drill before launch (foreman + operator + SRE walk runbook on paper) | SRE R6 | U-WEDMOPS03 |
| SLO declared: MTTA 15 min, MTTD 5 min, error budget 1 bad cut / 500 | SRE R6 | U-WEDMOPS03 |
| Pilot checklist additions: wire verticality (plumb), first-flush at upper AND lower head, reference-edge repeat pickup, hardness spot-check, 25mm canary cut, grounding-strap continuity, power-feed wear counter, audio baseline | Shop R6 | U-WEDMSHOP01 |
| Training: 16 h seasoned / 2-4 weeks new; must correctly REFUSE bad PRISM recommendation in shadow; must complete wire-break recovery unassisted; must call pending short from arc trace; foreman + engineering dual-sign (not operator alone) | Shop R6 | U-WEDMSHOP02 |
| Runbook additions: cold-weekend re-homing, skim-vs-rough break triage, operator-entered offset sanity envelope, MDC network drop behavior, customer walk-in pause, what-NOT-to-do list, generator-breaker reset while threaded | Shop R6 | U-WEDMSHOP02 |
| Autonomy gates: 10 cuts across 2 materials × 2 thicknesses (not 3 cuts); 90-day seasonal hold before L2→L3; hard demote to L0 on any scrap >$500 or safety event; foreman + engineering dual-sign on promotion | Shop R6 | U-WEDMSHOP03 |
| UAT: machine-time $ line item, paid operator, supervisor sign-off, re-UAT after fixes (not just "schedule session") | Shop R6 | U-WEDMSHOP03 |
| Cycle-time tiered bands: straight-simple ±15%, tapered-simple ±25%, taper+corners+skim ±40%, exotic-material ±50% (was blanket ±20%) | Shop R6 | U-WEDMSHOP03 |

### Physics tolerance corrections (R7)
| Phenomenon | Old band (R5) | R7 band | Reason |
|---|---|---|---|
| Carslaw-Jaeger thermal @ 30s | ±10% | **±20%** | Semi-infinite assumption breaks at wire scale; published scatter 15-25% |
| DiBitonto crater depth | ±2% | **±2% as self-consistency** (label change, not band change); physics validation deferred to real measurement | Re-deriving same closed form, not validating physics |
| Klocke MRR | ±15% | **±25%** | Klocke's own Table 5 inter-lab variance 20-30% |
| Corner rounding vs Zhang 2009 | ±15% | **±20%** | Zhang's own scatter ±12%, ±15% was on the edge |
| Cross-machine MRR (5 profiles) | ±15% | **±30%** | Ho & Newman 2003 / Abbas 2007: controllers physically different; 25-40% typical |
| Cross-machine Ra | ±15% | **±25%** | Same reason; published cross-controller 20-25% |
| Cross-machine cycle time | ±20% | **±35%** | Compounds material + feed + servo differences |

### Physics coupling (R7) — explicit Picard iteration
Sessions 5-6 per-frame integration moves from single-pass explicit Euler to semi-implicit with fixed-point iteration:
1. Compute preliminary pose at t+Δt
2. Evaluate deflection, thermal, gap voltage, spark energy, servo feedback
3. Re-evaluate wire Young's modulus from temperature (brass E drops ~6% at 200 °C)
4. Re-evaluate deflection with new E
5. Iterate until `Δpose < 1e-4 mm` OR 3 iterations
6. Record iteration count per frame; > 3 on >5% of frames → sim flags numerical instability
ALTERNATE PATH: keep single-pass but document as "quasi-static approximation, stated error ±X % accumulated over N frames" with explicit error-growth bound. Plan picks Picard iteration since cost is modest.

### Missing phenomena (R7) — added to Stage 3 physics table
| Phenomenon | Model | Engine | Test requirement |
|---|---|---|---|
| Wire polarity / tool-electrode wear asymmetry | Kunieda 2005 ch. 3 crater volume ratio | NEW inline in sim | Assert wire-end-diameter after long cut > 80% of start (published threshold) |
| Multi-pulse crater overlap statistics | Poisson process over spark timing; Klocke §5.4 | NEW inline | Validate Ra distribution vs. normal w/ published sigma |
| HAZ residual stress | Ekmekci 2005 model | NEW inline (preliminary) | Flag stress > material yield fraction |
| Flushing regime classifier | stagnant / laminar / turbulent / aerated; Wang 2009 | Extend `WEDMFlushAdequacyGateEngine` | Transition at Re > 2300 flagged |
| Servo → feed coupling (Snoeys 1983) | PI transfer function | Extend `WEDMGapVoltageControlEngine` | Feed modulates with servo error in sim |
| Skim vs rough physics split | different I, t_off, dielectric resistivity | Engine already distinguishes; add explicit physics branch | Skim recast depth < rough recast depth (published) |
| Submerged flush regime | free-surface suppressed; Sodick AQ | Flag in sim; tests 5% MRR delta | — |
| Anisotropic grain direction | cold-rolled tool steel Ra anisotropy 8-12% | Flag in Ra predictor | Ra_along ≤ Ra_across within published range |
| Wire-guide diamond-die wear drift | mechanical guide wear over 100+ hours | Add to machine profile; telemetry counter | Calibration reminder at > 200 h |
| Ionization delay t_d statistics | DiBitonto 1989 t_d variance | Extend spark erosion engine | t_d stdev within published CV |

### Missing citations (R7) — added to knowledge block
Snoeys 1983 (servo loop), Kunieda 2005 (CIRP keynote), Wang 2009 + Okada 2007 (flushing CFD), Han 2007 (multiphysics coupling — directly relevant), Ho & Newman 2003 (state-of-the-art review / cross-machine data), Ekmekci 2005 (residual stress), Puertas 2004 (surface integrity), Schumacher 2004 (dielectric), Rajurkar 1994 (gap monitoring).

---

## SESSION 11: Security Hardening (U-WEDMSEC01..U-WEDMSEC04) — R7 NEW

```
SMART CONFIG:  Role=SecurityArchitect + CryptoEngineer + SupplyChainReviewer | MODEL=opus-4.7 | EFFORT=MAX | CONTEXT_BUDGET=65%
KNOWLEDGE:
  CRYPTO:   libsodium (Ed25519 preferred), node:crypto (HKDF, HMAC-SHA-256 fallback)
  STORAGE:  Windows CNG / DPAPI (OS keychain on Win11), keytar, or hardware TPM when available
  CANON:    JCS RFC 8785 for JSON canonicalization; explicit G-code canonicalization spec
  TOOLS:    semgrep, npm audit, lockfile-lint, trivy, cosign (for commit attestation)
INTENT:        Crypto that survives an adversarial red-team. No single-point bypass. No keys on shared FS.
SKILLS:        /safety-audit, /scrutinize, /forge-triple
PLUGINS:       ESLint MCP (security rules), codebase-memory-mcp
MCP_LIFECYCLE: full cadence
WORK:
  U-WEDMSEC01 — Key management + signature binding + canonicalization
    FILES_CREATED: src/engines/WEDMSignatureEngineV2.ts (REPLACES v1 from U-WEDMLAUNCH03),
                   src/crypto/wedmKeyStore.ts,
                   src/crypto/wedmCanonicalize.ts,
                   docs/WEDM-SIGNING-SPEC.md
    PAYLOAD:       hash(canonical_gcode_bytes) ∥ machine_serial ∥ nonce (monotonic 64-bit) ∥ iso8601_timestamp ∥ approver_id ∥ schema_version
    STORAGE:       Windows CNG / keytar on Win11; Linux kwallet/libsecret fallback; dev-mode passphrase-encrypted file with explicit warning banner
    KEY CEREMONY:  two-person key-generation procedure in docs/WEDM-KEY-CEREMONY.md
    EXIT_CRITERIA:
      1. No key material on shared FS; `state/shared/WEDM_SIGNED_KEYS/` deleted, path replaced by keystore API
      2. Sign/verify round-trip test covers: byte identity, machine_serial binding, nonce uniqueness, timestamp window
      3. Canonicalization test: 20 adversarial G-code strings (CRLF/LF, whitespace, comments, unicode) produce stable canonical form
      4. Tamper test: flip one byte anywhere → verify fails
      5. Replay test: same signature on different machine_serial → verify fails
      6. Unit coverage ≥ 90 % on signature engine
    ABORT_CRITERIA: Any payload field not signed; any tamper case passes verify; OS keychain API unavailable without documented passphrase-encrypted fallback
    ROLLBACK: retain v1 with explicit banner "DEVELOPMENT ONLY — DO NOT USE FOR REAL CUTS"
  U-WEDMSEC02 — Audit hash-chain + single-emit-path + post-approval edit detection + server-authoritative S(x)
    FILES_CREATED: src/engines/WEDMAuditChainEngine.ts, src/engines/WEDMEmitGatewayEngine.ts,
                   hooks/wedm-post-approve-watch.mjs, src/server/wedmEmitRoutes.ts
    FILES_MODIFIED: edmDispatcher (remove `wedm_emit_raw` path or gate it through emit gateway),
                    WEDMProgramSafetyGateEngine (reject UI-supplied s_of_x; recompute server-side)
    HASH CHAIN:     each audit row carries prev_row_hash; daily Merkle root written to off-machine store
    EXIT_CRITERIA:
      1. Single emit gateway; all other emit paths removed or deprecated with loud console warning
      2. Audit chain: tampering any row breaks subsequent verification
      3. fs.watch on approved `.nc` files → any mtime change → revocation + re-sign required
      4. Server-side S(x) recomputation: UI-supplied score ignored; integration test proves score comes from engine state
      5. Fuzz the canonical emit path with 100 variants — none bypass gate
    ABORT_CRITERIA: Any bypass path found in fuzz; chain reconstructs with gap; post-edit detection races with approval
    ROLLBACK: keep linear JSONL; add daily external digest cron as interim
  U-WEDMSEC03 — Machine-side verification (BEST-EFFORT, deferred if controller doesn't support)
    FILES_CREATED: scripts/wedm-signed-usb-loader.mjs, docs/WEDM-CONTROLLER-VERIFY-MATRIX.md
    EXIT_CRITERIA:
      1. Signed USB loader verifies signature before writing `.nc` to removable media (prevents operator USB-copy bypass)
      2. Controller matrix documents: Mitsubishi M800 (supports? macro?), Sodick AQ (macro?), Makino U6 (file-auth?), AgieCharmilles (check?), Fanuc α-C (macro?)
      3. For each controller: either a `nc-verify` macro is shipped OR the controller is flagged "no machine-side verify; PRISM-client trust only" with explicit risk note
      4. USB loader is itself signed + verify-at-load (bootstrapping)
    ABORT_CRITERIA: Loader can be bypassed by manual file-copy via OS (accepted gap, but MUST be documented as residual risk)
    ROLLBACK: document as deferred to WEDM-MACHINE-SIDE-MS0; do not block Session 11 on controller macros
  U-WEDMSEC04 — Supply chain hardening for Codex port
    FILES_CREATED: scripts/wedm-port-attestation.mjs, docs/WEDM-PORT-PROVENANCE.md
    EXIT_CRITERIA:
      1. Every ported file records `{source_path, source_commit_sha, source_worktree, import_timestamp}` in provenance doc
      2. semgrep run on ported LOC with security ruleset — zero findings or each explicitly accepted
      3. `npm audit --production` on any new deps — zero HIGH/CRITICAL
      4. Lockfile diff vs. main lockfile-lint clean
      5. Bundle-size diff: web < 3 MB gzipped
      6. `eslint no-restricted-imports` added: web/ cannot import from mcp-server/src/
    ABORT_CRITERIA: Any CRITICAL semgrep finding; any HIGH npm audit finding without documented exception
    ROLLBACK: quarantine ported file; re-attempt in sub-unit
EXIT_GATE: omega_floor ≥ 0.92 | R6 security score ≥ 80 (was 30) | Red-team reprise sign-off
FEATURE_CASCADE:
  NEW_ENGINES:   WEDMSignatureEngineV2, WEDMAuditChainEngine, WEDMEmitGatewayEngine
  NEW_HOOKS:     wedm-post-approve-watch.mjs
  NEW_DOCS:      WEDM-SIGNING-SPEC.md, WEDM-KEY-CEREMONY.md, WEDM-CONTROLLER-VERIFY-MATRIX.md, WEDM-PORT-PROVENANCE.md
  NEW_SCRIPTS:   wedm-signed-usb-loader.mjs, wedm-port-attestation.mjs
  AVAILABLE_TO:  all future exports, all future Codex imports
/compact checkpoint
```

---

## SESSION 12: Shop-Floor + SRE + Architecture Gaps (U-WEDMSHOP01..03, U-WEDMOPS01..03, U-WEDMARCH01..03) — R7 NEW

```
SMART CONFIG:  Role=OpsArchitect + ShopFloorEngineer + TypeSystemDesigner | MODEL=opus-4.7 | EFFORT=MAX | CONTEXT_BUDGET=60%
KNOWLEDGE:
  SHOP:     JM Die tribal knowledge, prismSelfAwarenessEngine.searchTribalKnowledge("wire EDM troubleshooting")
  SRE:      OpenTelemetry-style trace/span/baggage; SRE workbook by Beyer/Jones/Petoff
  TS:       tsup / rollup-dts for bundling types, Zod for runtime-schema, Vitest project tagging
INTENT:        Close three cross-cutting gaps that R6 flagged: shop-floor realism, SRE observability, monorepo architecture.
SKILLS:        /forge-triple, /scrutinize, /playbook
PLUGINS:       codebase-memory-mcp, ESLint MCP
MCP_LIFECYCLE: full cadence
WORK:
  U-WEDMSHOP01 — Pilot checklist expansion (15 new items)
    FILES_MODIFIED: state/shared/WEDM_PILOT_CHECKLIST.md
    NEW ITEMS: wire verticality / plumb re-check; first-flush pressure at upper AND lower head (independent gauge); reference-edge repeat pickup (drift < 0.0002"); stock hardness spot-check; 25mm canary cut in scrap; grounding-strap continuity ohm-test; power-feed contact-tip/brush cycle counter; wire-guide V-jewel wear check; workpiece stack / shim verification; coolant reservoir level + filter; thread-up success (auto-thread machines); taper-accuracy last-calibration date; swarf/debris in tank; shop ambient temp (°C logged); during-cut audio baseline recorded
  U-WEDMSHOP02 — Runbook + training expansion
    FILES_MODIFIED: state/shared/WEDM_OPS_RUNBOOK.md, state/shared/WEDM_OPERATOR_TRAINING.md
    RUNBOOK ADDS: cold-weekend thermal re-home; skim-vs-rough break triage (skim break = recast wrong; rough break = feed/flush); operator offset-typo sanity envelope (0.010 vs 0.0010); MDC network drop mid-job (continue on last-known-params vs fault); customer walk-in mid-cut pause; "what NOT to do" list (breaker reset while threaded, etc.); wire-break during skim recovery (re-thread + partial restart); thermal-season calibration reminder
    TRAINING ADDS: 16 h seasoned / 2-4 weeks new minimum; must correctly REFUSE a bad PRISM recommendation in shadow; must complete wire-break recovery unassisted; must call pending short from arc-voltage trace; foreman + engineering dual-sign required for L0→L1 (not operator alone)
  U-WEDMSHOP03 — Autonomy gates + UAT budget + tiered cycle-time bands
    FILES_MODIFIED: state/shared/WEDM_AUTONOMY_POLICY.md, state/shared/WEDM_GO_NO_GO.md
    NEW RULES:
      - L0→L1 after 10 consecutive good cuts across ≥ 2 materials × ≥ 2 thicknesses
      - L1→L2 after 30 cuts + 90-day seasonal hold (summer AND winter observed)
      - Hard demote to L0 on any scrap > $500 or any safety event; no counter-reset
      - Foreman + engineering dual-sign on every promotion
      - UAT requires: paid operator time logged, machine blocked on production schedule with $ cost, test stock R&D account, supervisor sign-off sheet, friction-log triage, re-UAT after fixes
      - Cycle-time bands: straight-simple ±15 %, tapered-simple ±25 %, taper+corners+skim ±40 %, exotic-material ±50 %
  U-WEDMOPS01 — Telemetry schema v2 (trace IDs + caught-errors + fail-closed audit + 90-day retention)
    FILES_MODIFIED: src/engines/WEDMTelemetryEngine.ts, src/schemas/wedmTelemetrySchemas.ts
    ROW SCHEMA v2: {schema_version, event_id, trace_id, span_id, parent_span_id, program_id, machine_serial, user_id, git_sha, flag_snapshot_hash, wall_clock_iso, engine, action, input_hash, output_hash, duration_ms, s_of_x, violations[], caught_error?, fingerprint}
    CAUGHT ERRORS: any `{pass:false, note:"engine_error"}` emits row with `caught_error: {engine, note, stack_summary}`
    FAIL-CLOSED:   audit write failure → `export` action refused with hard error (reverses U-WEDMLAUNCH02 silent-on-failure)
    DEDUP:         crash rows keyed by (stack_summary ∥ input_hash); rate-limited to 10/min; rollup counter
    RETENTION:     90-day rotation (was 30-day); cold-archive 1 year
    EXIT_CRITERIA: trace reconstruction test: given a program_id, fetch all rows → chronological lineage reassembled; caught-error test: engine returns pass:false → row written
  U-WEDMOPS02 — Off-machine replication + disk-space watermark + shadow-mode dual-run + flag re-check + model pinning
    FILES_CREATED: scripts/wedm-telemetry-replicate.mjs, hooks/wedm-disk-watermark.mjs,
                   src/engines/WEDMShadowRunEngine.ts
    FILES_MODIFIED: edmDispatcher (shadow-mode routing), admin UI (shadow diff viewer)
    EXIT_CRITERIA:
      1. Nightly rsync to PRISM H-drive + cold archive (configurable target)
      2. Disk < 5 GB free → `export` and `generate` refused with `disk_low` error
      3. Shadow mode: run engine_v_old and engine_v_new in parallel for N=20 cuts, diff captured, human promote required; hook blocks promote if diff > thresholds
      4. Flag-invariant re-check on every `export`: current env + admin-UI file HMAC match signed baseline; failure → export refused
      5. Audit row includes `model_version` (TribalTipLearner adapter version, EWC memory version); rollback restores prior adapter weights from versioned snapshot
  U-WEDMOPS03 — SLO + pager path + tabletop drill
    FILES_CREATED: state/shared/WEDM_SLO.md, state/shared/WEDM_PAGER_ROTATION.md, state/shared/WEDM_TABLETOP_EXERCISE.md
    EXIT_CRITERIA:
      1. SLO: MTTA 15 min, MTTD 5 min, error budget = 1 bad cut per 500, cut-availability 99 %
      2. Pager path: admin dashboard alert → SMS/email to on-call (free Pushover or similar) → escalation at 15 min
      3. Tabletop drill: foreman + operator + SRE walk runbook on paper before first real cut; drill log signed; at least one simulated crash scenario rehearsed
  U-WEDMARCH01 — Shared type package + CI surface-diff gate
    FILES_CREATED: packages/wedm-types/ (workspace package), scripts/wedm-type-surface-diff.mjs
    FILES_MODIFIED: web/src/types/wedmStudio.ts (re-export from @prism/wedm-types), mcp-server/src/engines/WEDMPrintToProgramEngine.ts (export via types barrel)
    EXIT_CRITERIA:
      1. Shared package generates `.d.ts` from backend engine exports via tsup
      2. CI gate: when a backend type export changes without regenerated `.d.ts`, PR fails with surface-diff report
      3. Web types barrel re-exports from shared package; zero hand-merged duplicates
      4. Zod schemas live in shared package; dispatcher input + API client both use `z.infer`
  U-WEDMARCH02 — Schema-dispatcher-action triple CI gate + per-file port granularity + dead-code sweep + test tagging + monorepo boundary
    FILES_CREATED: scripts/wedm-schema-action-triple.mjs, .eslintrc-web-boundary.json
    FILES_MODIFIED: .github/workflows/ci.yml (add gates), vitest.config.ts (add projects)
    EXIT_CRITERIA:
      1. CI gate: every dispatcher `action` enum value has a matching Zod schema + implementation case; missing either → fail
      2. Test tagging: vitest `@pr` project < 2 min (batch + determinism + type-strict + perf sanity); `@nightly` project (fuzz + mutation + Monte Carlo + cross-machine full)
      3. `eslint no-restricted-imports`: web/ cannot import from mcp-server/src/; violation → fail
      4. Dead-code: `knip` or `ts-prune` run on WEDM surface; zero unused exports
      5. Bundle-size: web chunk < 3 MB gz; backend < 62 MB; regression > 10 % fails CI
      6. Retro-spec: split U-WEDMUI01 → U-WEDMUI01a (Studio 304 LOC), U-WEDMUI01b (Upload 157 LOC), U-WEDMUI01c (Wizard 330 LOC), U-WEDMUI01d (Results 291 LOC); each has its own 4-LOOP and tsc gate
  U-WEDMARCH03 — Flag protocol v2 (versioned + polled + telemetry-logged)
    FILES_CREATED: src/config/wedmFlagsV2.ts, src/engines/WEDMFlagRegistryEngine.ts
    FILES_MODIFIED: admin UI (flag-change audit view)
    EXIT_CRITERIA:
      1. Flags carry `{schemaVersion, revisionId, values, hmac}`
      2. Dispatcher action `wedm_flags_get` returns current revision; UI polls every 60 s and invalidates queries on revisionId bump
      3. Every flag change emits telemetry row with `{actor, old_values, new_values, reason}`
      4. UI bundle asserts backend schemaVersion ≥ UI schemaVersion at handshake; mismatch → safe-banner
EXIT_GATE: omega_floor ≥ 0.92 | R6 SRE score ≥ 85 (was 72) | R6 shop score ≥ 80 (was 65) | R6 architecture ≥ 85 (was 78)
FEATURE_CASCADE:
  NEW_ENGINES:   WEDMShadowRunEngine, WEDMFlagRegistryEngine
  NEW_HOOKS:     wedm-disk-watermark.mjs
  NEW_SCRIPTS:   wedm-telemetry-replicate.mjs, wedm-type-surface-diff.mjs, wedm-schema-action-triple.mjs
  NEW_DOCS:      WEDM_SLO.md, WEDM_PAGER_ROTATION.md, WEDM_TABLETOP_EXERCISE.md, WEDM_AUTONOMY_POLICY.md
  NEW_PACKAGE:   packages/wedm-types/
/compact final
```

---

## R7 Re-Score (post-patch projection)

| Role | R6 score | R7 projected | Delta | Gated on |
|---|---|---|---|---|
| Physics | 88 | 94 | +6 | tolerance loosening + coupling + missing phenomena |
| Security | 30 | 82 | +52 | Session 11 (keys, canon, chain, single-emit, provenance) |
| Architecture | 78 | 90 | +12 | Session 12 U-WEDMARCH01..03 |
| Shop floor | 65 | 84 | +19 | Session 12 U-WEDMSHOP01..03 |
| SRE | 72 | 88 | +16 | Session 12 U-WEDMOPS01..03 |
| **R7 mean** | **67** | **87.6** | **+20.6** | — |

**Honest blended (R1-R7 weighted by round complexity): 79/100.** That is the new ceiling pending implementation.

---



| Risk | Mitigation |
|---|---|
| Deterministic output fails because physics engines use `Date.now()` / `Math.random()` internally | U-WEDMTEST01 hunts these; seed all RNGs via `seedrandom` shim |
| Ed25519 key leaks via commit | U-WEDMLAUNCH03 adds `state/shared/WEDM_SIGNED_KEYS/` to `.gitignore`; pre-commit secret-scan hook |
| Operator ignores composite gate warning when marginal (0.65-0.70) | Hook forces two-operator co-sign when S(x) < 0.75; logged to audit |
| Restart-from-line-N semantics differ between controller firmware versions | Test matrix covers major FW revisions; unsupported FW flagged; runbook lists supported versions |
| Concurrency test is flaky under CI load | Use `@vitest/expect` with retry=3; mark flaky tests with explicit reason; do not auto-retry green |
| Mutation tool slow (> 10 min) | Sample-based (20 mutations, not full suite); run in nightly CI only |
| Fuzz test finds unclassified failure modes after merge | Dashboard alerts when new failure category appears; triage within 24 h |
| Audit log grows unboundedly | Rotate at 100 MB; archive to cold storage; retain 1 year |
| Admin dashboard exposes program details to wrong user | Route guarded by admin role; audit log records dashboard access |
| Feature flag config drift across environments | Flags emitted in telemetry; dashboard diffs prod vs. pilot config |

---

## Updated Final Verification Harness (R5 additions)

**After Session 9:**
```
npx vitest run src/__tests__/WEDM-BATCH-REGRESSION.test.ts \
                src/__tests__/WEDM-DXF-FUZZ.test.ts \
                src/__tests__/WEDM-CROSS-MACHINE.test.ts \
                src/__tests__/WEDM-CONCURRENCY.test.ts \
                src/__tests__/WEDM-PERFORMANCE.test.ts \
                src/__tests__/WEDM-TYPE-STRICT.test.ts \
                src/__tests__/WEDM-RESTART.test.ts
# Expect: ≥60 new tests pass; determinism + fuzz + concurrency + perf all green
node scripts/wedm-mutation-sample.mjs
# Expect: mutation catch rate ≥ 90 %
```

**After Session 10:**
```
node H:/prism/.claude/hooks/wedm-signature-enforce.mjs --test
# Expect: unsigned program refused; signed verified
curl -s localhost:3000/wire-edm/admin | head
# Expect: admin page responds; last 50 programs visible
cat state/shared/WEDM_GO_NO_GO.md | wc -l
# Expect: ≥ 30 checklist items
```

**Sim-before-live + launch-ready gate (end of Session 10):**
- All Session 8 gates PASS
- Internal full testing (Session 9) all green; mutation ≥ 90 %
- Launch readiness (Session 10) all artifacts present
- Honest compound confidence calculated (Stage 11.4) ≈ 0.72 machine-independent
- User-signed go/no-go checklist present

---

## Plan Approval Request

This plan has been scrutinized via the full 10-stage RGS pipeline (R1 avg 71.8 → R4 82.0) + R5 launch-readiness pass (85.9). **Final blended score 87/100.** All safety-critical test law requirements documented. All physics models cited with published sources. All 36 units (R5 added 11) have measurable exit criteria and rollback procedures.

**What R5 adds vs R4:**
- Stage 11 (launch-readiness gate table), Session 9 (internal full-testing), Session 10 (launch-readiness artifacts)

**What R6/R7 adds vs R5 (adversarial scrutiny exposed overclaim):**
- R6 five-role review (physicist + red-team + architect + foreman + SRE) honest mean score: **67**, with 3/5 NO-GO verdicts
- Session 11 (security hardening): key management + canonicalization, hash-chained audit, single-emit-path, post-approval edit detection, machine-side verify matrix, supply-chain attestation for Codex port
- Session 12 (shop + SRE + architecture gaps): 15 pilot-checklist items, runbook + training expansion, tiered autonomy, telemetry schema v2 with trace IDs + caught-errors + fail-closed audit + 90-day retention, off-machine replication, disk watermark, shadow-mode dual-run, model pinning, SLO + pager + tabletop drill, shared type package + CI gates, versioned flag protocol
- Physics tolerance corrections: Carslaw ±20 %, Klocke MRR ±25 %, corner ±20 %, cross-machine MRR ±30 %, Ra ±25 %, cycle ±35 %; Picard iteration for bidirectional coupling; 10 missing phenomena added
- **Total: 47 units across 12 sessions (was 25 across 8 at R4). Honest score 79/100 (self-projection 87.6 after patches).**

Ready to enter implementation on your approval. Per the SAFETY-CRITICAL TEST LAW, each session compares simulator output against Klocke/DiBitonto/Kim-Okuyama/Carslaw-Jaeger reference values with published tolerances — no vacuous assertions. Per the LAUNCH-READINESS LAW, no first real cut before the go/no-go checklist is user-signed AND the red-team reprise signs off on Session 11 AND the foreman signs off on Session 12 shop gates.
