# WEDM Full Launch Roadmap — 100/100 Chargeable Product

## Context

20-agent scrutiny audit (3 parallel Explore agents, 20-role stakeholder analysis) completed. Current state: **42/100** (62/100 for Mitsubishi straight die cut narrow scope). Target: **85/100 by Friday April 11, 100/100 by May 2.**

Key audit findings that changed the plan:
- `WEDMCompleteOrchestrationEngine.ts` (1,502 LOC, 30 stages) is MORE complete than `WEDMPrintToProgramEngine.ts` (7 stages) — the dispatcher already calls it via `wedm_generate_complete_program`. Main pipeline should switch to using CompleteOrchestration.
- `WireEdmStudioPage.tsx` already exists as a 6-step wizard at `/wire-edm`. Adding to "calculator page" means adding to `EdmPage.tsx` (the quick EDM tab panel), NOT the 12,851-line `CalculatorPage.tsx`.
- `EdmPage.tsx` already has Wire EDM quick-calc tab — needs to call `wedm_generate_complete_program` action and show NC output, not just MRR/finish.
- 50+ EDM dispatcher actions already wired. Main gap is `WEDMPrintToProgramEngine` never being called by the dispatcher (orphaned engine) — `WEDMCompleteOrchestrationEngine` is the real entry point.
- U-W100-34 and U-W100-35 (Sodick + AgieCharmilles condition codes) are not started and block 40% of the addressable machine base.
- Feedback calibration endpoint (U-W100-27) has no rate limiting or audit trail — security/compliance blocker.

---

## Friday Sprint — Score 42→72 (9 units, 3 sessions)

### SESSION 1: Wednesday April 8 — Validation Proof

**U-WLAUNCH01** — `src/__tests__/cwedm-validation-d2-multithick.test.ts`
- Use `WEDMPrintToProgramEngine.generate()` with pre-parsed contours (D2 at 25.4mm / 50mm / 100mm)
- Assert per case: feed within 10-15% of Lemhunter (4.5/3.0/2.0 mm/min), E-pack E12X1-E12X4, H-offsets monotonically decreasing, Ra±20% Klocke, confidence≥75, 100mm passes>50mm passes
- Run: `npx vitest run src/__tests__/cwedm-validation-d2-multithick.test.ts`
- If any fail: fix root cause in piecewise feed model or E-pack resolver — NOT test adjustments

**U-WLAUNCH02** — `src/__tests__/cwedm-validation-multimaterial.test.ts`
- 304SS / 6061-T6 / WC / Inconel at 25.4mm
- Assert: correct E-pack group (2/3/5/7), feed hierarchy Al>C_steel>SS>Inconel, WC≥5 passes for Ra 0.8µm, Inconel feed <D2×0.7, confidence≥65
- Run: `npx vitest run src/__tests__/cwedm-validation-multimaterial.test.ts`

**Session 1 gate:** 7 material/thickness combos pass all assertions. Zero engine changes (test-only, physics already calibrated). 216+ Wire EDM tests still passing.

---

### SESSION 2: Thursday April 9 — Real-World Proof + Gaps

**U-WLAUNCH03** — Read Box Drive 5-inch square NC + catalog
- `cmd.exe /c type "C:\Users\wompu\Box\WIRE EDM\Wire Program - 5 inch square.NC"`
- Catalog: material, thickness, E-pack codes, feeds, H-offsets, pass count
- Generate equivalent with `WEDMPrintToProgramEngine`, compare to real — classify differences
- Add data point to `src/data/wedm-published-conditions.ts`

**U-WLAUNCH04** — Extend E-pack condition codes 1→9 (CHOCTAW uses condition 8)
- `src/engines/WEDMPrintToProgramEngine.ts` — `resolveEPackConditionCode()` function
- Add conditions 6 (Ra 0.05-0.1µm), 7 (Ra 0.02-0.05µm), 8 (Ra 0.01-0.02µm), 9 (Ra≤0.01µm)
- Invariant: condition 2 must still cover Ra 0.4-3.2µm (ITW SHAKEPROOF calibration anchor)
- Update `src/__tests__/wedm-epack-generator.test.ts` — add 6-9 condition tests, keep 75+ passing

**U-WLAUNCH05** — Taper skim cascade split (increasing vs decreasing)
- `src/engines/EDMMultiPassStrategyEngine.ts` — 2 locations with skim speed formula
- Add: `if (input.taper_angle_deg && input.taper_angle_deg > 0)` → `1.5 + 0.15*(p-2)` (NOZE TEST pattern: increasing)
- Else: existing `max(2.0 - 0.15*(p-2), 1.2)` (ITW SHAKEPROOF pattern: decreasing)
- Update `src/__tests__/cwedm-e2e-validation.test.ts` — add taper vs straight cascade tests

**U-WLAUNCH06** — Setup sheet HTML verify + operator restart procedure
- Call `WEDMPrintToProgramEngine.generate()` for D2 25.4mm, capture `result.setup_sheet`
- Verify `setup_sheet` contains per-pass table as renderable HTML (not just JSON blob)
- If only JSON: add `formatSetupSheetHTML()` to `WEDMPrintToProgramEngine.ts`
- Audit finds: setup sheet missing "if wire breaks at N1100, re-thread here" restart procedure
- Add restart procedure section to setup sheet output using N-block markers from program

**Session 2 gate:** 5-inch square cataloged. Conditions 1-9 working. Taper split tested. Setup sheet HTML verified with restart procedure. All 216+ tests pass.

---

### SESSION 3: Friday April 10 — Calculator Page + Launch Gate

**U-WLAUNCH07** — Wire WEDM into EdmPage.tsx (the "calculator page" for EDM)
- `EdmPage.tsx` already has Wire EDM tab with quick form (material, thickness, wire, pulse params)
- Change: Wire EDM tab "Calculate" button calls `POST /api/v1/edm/calculator-solve` → `wedm_generate_complete_program` 
- Show result: NC program text (copyable), setup sheet HTML (printable), confidence score badge, per-pass table
- Reuse existing `WireEdmOptimizeCards` and `WireEdmPassChart` components (already exist)
- Add DXF file upload input (hidden file input, read as text, pass as `dxf_content`)
- Backend already has `/api/v1/edm/calculator-solve` route calling `wedm_calculator_solve` dispatcher action
- Wire: `wedm_calculator_solve` → `WEDMCompleteOrchestrationEngine.generateCompleteProgram()` (currently calls wrong engine — fix dispatch)
- Files: `web/src/pages/EdmPage.tsx`, `src/tools/dispatchers/edmDispatcher.ts` (fix calculator_solve wiring)

**U-WLAUNCH08** — Scope guard + V1 limitation messages
- `src/engines/WEDMPrintToProgramEngine.ts` generate() method top:
  - taper_angle_deg > 5° → structured error "V1: UV taper support in V2 (Q2 2026)"
  - controller !== "mitsubishi" → warning "Technology codes require operator verification in V1"
  - geometry with re-entrant angles > 120° → warning "Complex geometry detected — reduce predicted feed by 40%"
- Add scope guard messages to setup sheet header

**U-WLAUNCH09** — Launch gate: 5-case smoke test + LAUNCH-GATE-PASS.md
- End-to-end: DXF-equivalent input → NC + setup sheet HTML + confidence score in <5 seconds
- 5 cases: D2 25.4mm ✓, D2 50mm ✓, 304SS 25.4mm ✓, 6061 25.4mm ✓, D2 taper 15° → error ✓
- Write `mcp-server/data/docs/LAUNCH-GATE-PASS.md` when 5/5 pass
- Write `mcp-server/data/docs/WEDM-V1-SCOPE.md` — honest 1-page capability statement

**Session 3 gate:** EdmPage shows NC output + setup sheet + confidence. 5/5 smoke tests pass. Score 72/100.

---

## Full 100/100 Roadmap — 4 Weeks Beyond Friday

Based on 20-role stakeholder audit. Ranked by combined revenue × safety impact.

### PHASE A: Multi-Controller Completion (Score +10, 2 sessions, ~24h)
**U-W100-34** — Sodick + Makino condition codes
- Sodick C### code generator (C001-C999 format, material group + thickness lookup)
- Makino HYPER-i condition mapper (HI×× format)
- Validate: both produce parseable output, correct M-code threading (M50/M51 Sodick, M60/M61 Makino)
- Files: `src/engines/EDMPostProcessGCodeEngine.ts`

**U-W100-35** — AgieCharmilles + Fanuc condition codes
- AgieCharmilles ISPG code mapper + TAPER-EXPERT cycle for taper (NOT raw UV on G1)
- Fanuc tech register mapper + G61.1 corner control
- Note: AgieCharmilles taper uses proprietary TAPER-EXPERT cycle — UV on G1 is Mitsubishi-specific
- Files: `src/engines/EDMPostProcessGCodeEngine.ts`

### PHASE B: Compliance & Traceability (Score +8, 2 sessions, ~24h)
**U-WCOMP01** — Rate limit + timestamp + audit trail for feedback calibration endpoint
- `src/routes/edm.ts` — add rate limiting (max 100/hour per token), timestamp per k_ra adjustment
- Link calibration record to job_id + lot_number from request body
- Files: `src/routes/edm.ts`, `src/engines/WEDMFeedbackCalibrationEngine.ts`

**U-WCOMP02** — AS9102 Form 1 FAI export (balloons + recast attestation)
- Parse DXF GD&T callouts → structured dimension list
- Generate AS9102 Form 1 JSON + CSV (dimension, tolerance, nominal, material, process)
- Include AMS 2628 recast attestation if recast_depth_um < 50µm (per spec)
- Files: `src/engines/WEDMFAIExportEngine.ts` (new), `src/routes/edm.ts`

### PHASE C: Production Operations (Score +8, 2 sessions, ~20h)
**U-WOPS01** — Operator restart procedure in setup sheet (step-by-step wire break recovery)
- Per N-block: "If wire breaks at N1100, re-thread at X213.4 Y88.2 (start hole 1), approach from N1050, press CYCLE START"
- Tied to N-block markers already in G-code output
- Files: `src/engines/WEDMPrintToProgramEngine.ts` (setup sheet section)

**U-WOPS02** — Slug draft angle support + drop sequence sequencing
- U-W100-32 calculates slug weight assuming vertical walls; add draft_angle parameter
- Tab placement adjusted for tapered cavities
- Drop sequence: cut tabs last, heavy slugs flagged for fixture support
- Files: `src/engines/EDMToolpathStrategyEngine.ts`, `src/engines/WEDMCompleteOrchestrationEngine.ts`

**U-WOPS03** — Machine capacity + thermal duty cycle validation
- Query MachineRegistry for thermal_duty_cycle_ratio per machine model
- Warn if job pulse_energy × duty_cycle exceeds 85% of machine thermal spec
- Add "next available slot" suggestion if machine is at thermal capacity
- Files: `src/engines/WEDMCompleteOrchestrationEngine.ts`

### PHASE D: Physics Depth (Score +7, 2 sessions, ~22h)
**U-WPHYS01** — Material-specific recast model (phase transitions, secondary hardness)
- Carslaw&Jaeger model with alloy-specific thermal diffusivity from MaterialRegistry
- Add phase transition temperature flag (D2: martensite at 1400°F, Inconel: gamma prime dissolution)
- Output: recast_depth_um + secondary_hardness_hrc + fatigue_risk_flag
- Files: `src/engines/EDMMonitorSurfaceIntegrityEngine.ts`, `src/data/wedm-published-conditions.ts`

**U-WPHYS02** — Cycle time with 95% CI + constraint chain export
- Monte Carlo (1000 samples) on feed rate uncertainty → cycle time distribution
- Return: cycle_time_min_p5, cycle_time_median, cycle_time_p95
- Export constraint chain to result: "feed limited by: wire_break_threshold at 2.8 mm/min (Ra not limiting)"
- Files: `src/engines/WEDMPrintToProgramEngine.ts`, `src/engines/EDMMultiPassStrategyEngine.ts`

### PHASE E: Backplot SVG + Visual Preview (Score +5, 1 session, ~10h)
**U-WVIZ01** — Server-side SVG rendering from G-code backplot
- `BackplotEngine` already parses G-code → move list; add `toSVG()` method
- SVG: wire path per pass (colored by pass number), start holes, tabs, bounding box
- Integrate into `WEDMCompleteOrchestrationEngine` result as `backplot_svg: string`
- Files: `src/engines/EDMBackplotEngine.ts` (add SVG renderer), `WEDMCompleteOrchestrationEngine.ts`

### PHASE F: Shop Floor Integration (Score +5, 2 sessions, ~20h)
**U-WSHOP01** — Consumables inventory check + wire lot traceability
- Query tool_crib endpoint for wire stock (brass_0.25 → available_meters + backorder_date)
- Return: wire_needed_m, wire_available_m, spool_count_needed, backorder_risk
- Files: `src/engines/WEDMCompleteOrchestrationEngine.ts` + tool crib API

**U-WSHOP02** — SPC measurement plan + control chart template
- From DXF GD&T: extract critical dimensions → measurement plan (feature, nominal, tolerance, measurement method)
- Generate Xbar-R chart template (50 samples, UCL/LCL from EDM historical Cp)
- Files: `src/engines/WEDMSPCPlanEngine.ts` (new)

**U-WSHOP03** — Cost estimator calibration (hidden overhead inclusion)
- Add: machine warm-up (5 min), tank fill (2 min), wire threading loss (7%), wire break contingency (4%)
- Add: queue time from capacity planner (Phase C)
- Return: cost_estimate with itemized breakdown + ±15% confidence interval
- Files: `src/engines/WEDMCompleteOrchestrationEngine.ts` (cost stage)

---

## Critical Files Summary

| File | Priority | Change |
|---|---|---|
| `src/__tests__/cwedm-validation-d2-multithick.test.ts` | Friday S1 | **NEW** — D2 multi-thickness proof |
| `src/__tests__/cwedm-validation-multimaterial.test.ts` | Friday S1 | **NEW** — Multi-material proof |
| `src/data/wedm-published-conditions.ts` | Friday S2 | Add 5-inch square data point |
| `src/engines/WEDMPrintToProgramEngine.ts` | Friday S2/S3 | Condition codes 1-9, setup sheet HTML, scope guard, restart procedure |
| `src/__tests__/wedm-epack-generator.test.ts` | Friday S2 | Tests for conditions 6-9 |
| `src/engines/EDMMultiPassStrategyEngine.ts` | Friday S2 | Taper cascade split |
| `src/__tests__/cwedm-e2e-validation.test.ts` | Friday S2 | Taper cascade tests |
| `web/src/pages/EdmPage.tsx` | Friday S3 | Add NC output + setup sheet + DXF upload |
| `src/tools/dispatchers/edmDispatcher.ts` | Friday S3 | Fix `wedm_calculator_solve` → CompleteOrchestration wiring |
| `src/engines/EDMPostProcessGCodeEngine.ts` | Week 2 | Sodick C###, Makino HYPER-i, AgieCharmilles ISPG, Fanuc tech registers |
| `src/routes/edm.ts` | Week 2 | Rate limiting + audit trail on feedback endpoint |
| `src/engines/WEDMFAIExportEngine.ts` | Week 2 | **NEW** — AS9102 Form 1 FAI export |
| `src/engines/EDMMonitorSurfaceIntegrityEngine.ts` | Week 3 | Material-specific recast model |
| `src/engines/EDMBackplotEngine.ts` | Week 3 | Add `toSVG()` renderer |

---

## Verification

**After each Friday session:**
```bash
cd H:/prism/mcp-server && npx vitest run src/__tests__/cwedm-e2e-validation.test.ts src/__tests__/wedm-epack-generator.test.ts src/__tests__/wedm-shop-inputs.test.ts src/__tests__/wedm-live-output.test.ts
```
Must stay ≥216 passing throughout.

**Friday launch gate:**
```bash
npx vitest run src/__tests__/cwedm-validation-d2-multithick.test.ts src/__tests__/cwedm-validation-multimaterial.test.ts
```
All cases must pass. Then write `LAUNCH-GATE-PASS.md`.

**Web UI verification:**
1. Navigate to `/edm` → Wire EDM tab
2. Select D2 tool steel, 25.4mm, upload/paste a simple square contour DXF
3. Click Generate — should show NC program, per-pass table, confidence score badge, printable setup sheet
4. Verify confidence score ≥75
5. Taper angle 15° → should show scope error message, not silently generate wrong output

---

## Score Trajectory

| Date | Score | What changes |
|---|---|---|
| April 8 (now) | 42/100 | Bugs fixed this session (feed rate, E-pack, L001, skim cascade) |
| April 10 (Friday) | 72/100 | +30: validation proof, real programs, condition 1-9, taper split, EdmPage integration, scope guard |
| April 17 | 82/100 | +10: Sodick+Makino+AgieCharmilles+Fanuc condition codes |
| April 24 | 88/100 | +6: FAI export, feedback security, SPC plan, operator restart |
| May 2 | 94/100 | +6: Material-specific recast, SVG backplot, consumables, cost calibration |
| May 15 | 100/100 | +6: Full compliance package, machine capacity, slug draft angles, CI bands |

---

## What "Calculator Page" Means

**Correct interpretation:** `EdmPage.tsx` (at `/edm`) is the EDM calculator. It already has Wire EDM, Sinker EDM, Laser tabs. The milling `CalculatorPage.tsx` (12,851 lines) is for cutting tools — not the right place.

**U-WLAUNCH07 changes `EdmPage.tsx`:**
- Wire EDM tab currently shows: MRR, cutting speed, surface finish (quick estimates only)
- After: Wire EDM tab shows NC program text (copyable), HTML setup sheet (printable), confidence score, per-pass table (E-pack, H-offset, feed, Ra)
- Adds: DXF file upload button (hidden file input, reads as text, sends as `dxf_content`)
- Keeps: existing material/thickness/wire diameter/pulse inputs

**Full wizard stays at `/wire-edm`** (WireEdmStudioPage.tsx — already exists, 6-step DXF wizard). The calculator tab is the quick-generate path; the studio is the full workflow.
