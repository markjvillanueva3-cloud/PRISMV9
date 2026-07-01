# R2 SAFETY — CODE-NATIVE EXECUTION PLAN
## Mode: HYBRID (60% Code / 40% Chat)
## Switch points marked with 🔄

---

## MS0: 50-Calc Test Matrix

### Step 1 — CODE
Create test matrix script with 50 material+operation combos.
Materials: 4140, 316L, Ti-6Al-4V, 7075-T6, Inconel 718, 1018, A2 tool steel,
6061-T6, 304SS, D2, S7, 4340, 17-4PH, Copper C110, Brass 360, Cast Iron FC300,
Tungsten, Monel 400, Hastelloy X, Magnesium AZ31B (+ 30 more from registry).
Operations: milling, turning, drilling, boring, threading, tapping.
Output: JSON file at `tests/r2/golden-benchmarks.json` with empty expected values.

### 🔄 SWITCH TO CHAT
Run prism_calc→speed_feed for all 50 combos.
Run prism_calc→cutting_force for the top 20 combos.
Run prism_calc→tool_life for 10 representative combos.
Capture all results → write to `tests/r2/golden-benchmarks.json`.

### Step 3 — CODE
Create regression test runner that loads golden-benchmarks.json,
calls the calc engines, compares results within tolerance (±2% for speed/feed,
±5% for force, ±10% for tool life). Report PASS/FAIL per combo.
Run it. Fix any failures.

### 🔄 SWITCH TO CHAT
Verify fixes via prism_calc. Confirm S(x) ≥ 0.70 on all safety calcs.

---

## MS1: Safety Engine Activation (29 actions)

### Step 1 — CODE
Create test harness at `tests/r2/safety-engine-tests.ts`.
29 actions across 5 engines: collision, coolant, spindle, tool, workholding.
Define test inputs for each action (use registry data from golden benchmarks).

### 🔄 SWITCH TO CHAT
Run all 29 prism_safety actions with test inputs.
Capture results → write to `tests/r2/safety-engine-results.json`.
Check: each action returns valid response (no crashes, no undefined).

### Step 3 — CODE
Create validator that checks safety-engine-results.json for:
- All 29 actions responded (no crashes)
- Safety scores present and ≥ 0.70
- No "not implemented" or placeholder responses
Fix any failing engines.

### 🔄 SWITCH TO CHAT
Re-run failed actions. Confirm all 29 pass.

---

## MS1.5: Calc Regression Suite

### Step 1 — CODE (no switch needed)
Lock golden-benchmarks.json as immutable test fixture.
Create `tests/r2/regression-runner.ts` that:
1. Loads golden benchmarks
2. Calls calc engines directly (importing from src/engines/)
3. Compares within tolerance
4. Reports pass/fail with diffs
5. Exits non-zero on any failure

Wire into package.json as `npm run test:regression`.
Add to pre-commit hook.

---

## MS2: Edge Cases

### Step 1 — CODE
Generate 20 edge case scenarios:
- Exotic materials (tungsten, titanium aluminide, ceramics)
- Extreme params (0.01mm DOC, 500mm/min feed, 40000 RPM)
- Boundary conditions (tool diameter = workpiece width, zero clearance)
- Material-machine mismatches (aluminum params on Inconel)

### 🔄 SWITCH TO CHAT
Run edge cases through prism_calc + prism_safety.
Expected: graceful handling (warnings, clamped values, rejection) — NOT crashes.

### Step 3 — CODE
Fix any crashes or unhandled edge cases.

### 🔄 SWITCH TO CHAT
Re-validate. All edge cases must either produce valid results or explicit rejections.

---

## MS3: Fix Cycle

### CODE (no switch needed)
Fix all remaining failures from MS0-MS2.
Build after each fix. Run regression suite.
This is pure implementation work.

### 🔄 SWITCH TO CHAT (only if safety engines need re-testing)
Re-run any safety engine actions that were fixed.

---

## MS4: Build Gate

### Step 1 — CODE
Final build. Run full regression suite. Run verify-build.ps1.
Commit all R2 work.

### 🔄 SWITCH TO CHAT
Run prism_omega→compute for Ω score.
Run prism_ralph→loop for full 4-phase validation (if API available).
Run prism_validate→safety for final S(x) check.
Confirm: Ω ≥ 0.70, S(x) ≥ 0.70, all regression tests pass.

### Step 3 — CODE
Update CURRENT_POSITION.md for R3.
Git tag: `r2-complete`.

---

## SWITCH SUMMARY

| When you see... | Do this |
|-----------------|---------|
| 🔄 SWITCH TO CHAT | Toggle to Chat mode, run the MCP queries listed |
| 🔄 SWITCH TO CODE | Toggle to Code mode, continue implementation |
| Code says "Switch to Chat" | It needs MCP validation it can't do itself |
| Chat says "Switch to Code" | Implementation work needed |
| Code writes SWITCH_SIGNAL.md | Read it for the reason, switch to Chat |
