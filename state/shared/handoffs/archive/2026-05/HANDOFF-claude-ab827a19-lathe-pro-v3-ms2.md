# LATHE-PRO-V3-MS2 — Session Handoff (chat ab827a19)

**Updated:** 2026-05-05
**Session ID:** `ab827a19-54e1-402f-b704-57a8e546ebfa`  ·  **Stable terminal:** `claude-ab827a19`
**Topic:** `lathe-pro-v3-ms2`

## RESUME

Continue **LATHE-PRO-V3-MS2 / U-LPT02** (machine warmup strategy, 8 sub-units, independent of U-LPT01) in `H:/prism-lathe-pro-v3` on `work/lathe-pro-v3-ms2`. U-LPT01 already shipped — commit `3481bdfce`. Read this entire handoff before any tool call.

## Lane (CRITICAL — do not stray)

- **Worktree:** `H:/prism-lathe-pro-v3`
- **Branch:** `work/lathe-pro-v3-ms2`
- **Forked from:** `main` at `a4488b69e` (USSH-P0.25/U-SCI04 PageRankEngine — clean root)
- **DO NOT USE** `H:/prism` — the `cam-exhaust-ms0` branch on the main worktree has 3.14MB of pre-existing orphan uncommitted edits from a crashed prior lathe chat (Opus triage said safe but it is NOT my work and NOT this lane).

## What shipped this session

### Commit `3481bdfce` — `[LATHE-PRO-V3-MS2]/U-LPT01: LatheOffsetSuperpositionEngine`

3 files, 787 insertions, 26 tests green, 0 new tsc errors.

| File | LOC | Purpose |
|---|---|---|
| `mcp-server/src/engines/LatheOffsetSuperpositionEngine.ts` | 407 | Composes delta_total = delta_wear + delta_thermal_spindle + delta_thermal_part + delta_geometric |
| `mcp-server/src/__tests__/LatheOffsetSuperpositionEngine.test.ts` | 371 | 26 tests covering identity, VB resolution, lead-angle projection (0/90/95 deg), safety cap, RSS uncertainty, error paths |
| `mcp-server/src/tools/dispatchers/turningDispatcher.ts` | +9 | Action `turning_offset_compensation` wired in ACTIONS enum + switch case |

### Engine design — composition over new physics

- **delta_wear:** `VB · |sin(kappa_r)|` flank-wear radial projection. ISO 8688-1 default VB_max=0.3mm, default kappa_r=95 deg. Resolution order: measured `vb_current_mm` > linearised Taylor (`cumulative_time / expected_life × VB_max`) > `no_wear_data` fallback with explicit warning.
- **delta_thermal_spindle:** spindle+holder+tool growth chain via `thermalGrowthCompensationEngine.calculate()`. RSS combines uncertainties from the three internal contributions.
- **delta_thermal_part:** workpiece CTE expansion, same engine, separated for provenance.
- **delta_geometric:** pre-computed pass-through in micrometres (consumer feeds from `MachineGeometricAccuracyEngine` 21-error model or ball-bar calibration). 20% relative uncertainty.
- **Safety:** 50um hard cap mirrors U-LPT04 max single-adjustment rule. `is_within_safety_cap=false` flag tells consumer to require operator review before G10 emission.
- **Uncertainty:** RSS of independent components.

## Scrutiny gate state

`mcp-server/data/state/SCRUTINY_LEDGER.json` entry for session `ab827a19-54e1-402f-b704-57a8e546ebfa`:

| Reviewer | Verdict | Notes |
|---|---|---|
| codex | fail | ENV_FAIL — exit 1, empty stdout. Not a code complaint. |
| gemini | fail | ENV_FAIL — `chcp not recognized`, `Ripgrep is not available`. CLI crashed before any review. |
| **opus** | **pass** | Substantive review of `3481bdfce` — `COMMIT_DECISION: ship`. Physics sound (kappa_r projection correct per Altintas / ISO 3002-1), 50um cap intact, RSS uncertainty correct, 0 inline constants, 26/26 tests green. |

`blockCount: 3` — escape hatch armed; next Stop auto-passes per documented policy.

### Opus review nits (file as follow-up unit `U-LPT01b`)

1. **Sign-convention block in JSDoc** — explicit "wear pushes part radius outward → consumer applies negative correction" note.
2. **kappa_r range clamp** to `[0deg, 180deg]` (currently accepts any finite value; physically nonsense at e.g. 270 deg).
3. **kappa_r=180 deg boundary test** (mirror of kappa_r=0 deg symmetry assertion).
4. **AC#9 sign-additivity test:** combined wear+thermal produce additive delta_total in typical ISO turning convention.

## Side-effect: orphan untracked file copy

The shared husky pre-commit at `H:/PRISM/.husky/pre-commit` runs:

```
node mcp-server/scripts/hooks/cam-phase5-impl-gate.mjs || exit 1
```

That script lives **untracked in main only**. Forked worktrees do not have it, so the hook fails. **Workaround applied:** copied the script into `H:/prism-lathe-pro-v3/mcp-server/scripts/hooks/cam-phase5-impl-gate.mjs` (still untracked there). **Owner action needed:** whoever owns CAM-Phase-5 should track the script in main so worktrees inherit it via `git worktree add`. Filed externally — not in scope for U-LPT02.

## Lathe roadmap state (verified 2026-05-05)

| Milestone | Status | Units | Notes |
|---|---|---|---|
| LATHE-MASTER | **complete** | 62 | Final `U-LTH62-REG` at `cb0ef0eba`. `H:/prism/state/shared/LATHE-MASTER-HANDOFF.md` says DO NOT RESUME. |
| LATHE-PROD-READY-MS0 | complete | — | Audit memory `feedback_lathe_audit_2026_05_05.md` confirms. |
| LATHE-LORA-MS0 | active | — | Master orchestrator wired `a0ac48107` (`U-LLR-MASTER-WIRE`). 22 engines restored from ARCHIVE-FORGE-ORPHANS in `a910f74c6`. |
| **LATHE-PRO-v3** | **active** | 17 milestones | **MS-1 closed** (`dde197e5b` U-LPI-MS1-VERIFY). MS-2..MS12 = 138 units of greenfield. |

### LATHE-PRO-v3 milestone list (in dependency order)

1. ✅ `LATHE-PRO-MS-1` (12u) Input Pipeline — Photo/CAD to Structured Features — **complete**
2. `LATHE-PRO-MS-2` (8u) Zero-Experience UI & Guided Workflow — depends MS-1
3. `LATHE-PRO-MS0` (14u) Enhanced Orchestrator (35 Stages + 5 Safety) — root for downstream
4. `LATHE-PRO-MS1` (8u) Insert Wear Intelligence & Life Prediction — MS2 nominally depends on this
5. **`LATHE-PRO-MS2` (10u) Offset + Thermal + GD&T Compensation — IN PROGRESS, 1/10 done**
6. `LATHE-PRO-MS3..MS12`: Sequence/MultiOp/Workholding (14u), Threading Deep (8u), Grooving Deep (8u), Hard Turning (8u), Multi-Channel G-Code (8u), Swiss Production (8u), Chip Control (6u), GD&T+Inspection (8u), AS9100/FDA (6u), Cost+Batch (8u), Shop Floor (8u), Sim/Verify (8u)

## MS2 unit slate (per LATHE-PRO-v2-ROADMAP.md line 457+, v3 says "as defined in v2.0")

| Unit | Title | Status |
|---|---|---|
| **U-LPT01** | Wear-to-offset superposition (`delta_total = delta_wear + delta_thermal_spindle + delta_thermal_part + delta_geometric`) | **DONE** |
| U-LPT02 | Machine warmup strategy (50% RPM × 15-20min, cold-machine bias, seasonal drift) | **NEXT** |
| U-LPT03 | Probing cycle generator (Renishaw G65 P9811/9812/9814, Haas WIPS, Fanuc, Okuma) | pending |
| U-LPT04 | Macro-based auto-offset (Fanuc/Okuma/Haas/Mazak — 0.05mm hard cap) | pending |
| U-LPT05 | GD&T-to-process mapper (concentricity → single-chuck, runout → datum, position → C-axis) | pending |
| U-LPT06 | Tolerance-to-strategy decision (±0.5/0.1/0.025/0.005 → roughing/+finish/+thermal/+grinding) | pending |
| U-LPT07 | Machine geometric error profile (backlash, reversal, unidirectional approach) | pending |
| U-LPT08 | Dimensional accuracy predictor per batch | pending |
| U-LPT09 | Wire turningDispatcher + SPC (15+ tests; ProcessCapabilityPredictionEngine wired) | pending |
| U-LPT10 | Measurement frequency optimizer (Cpk-driven gating + economic model) | pending |

### MS2 FORGE-TRIPLE (lands across multiple units)

- **HOOK:** `thermal-offset-gate` — blocks programs missing thermal compensation for tight tolerances (lands later in MS2)
- **ACTION:** `prism_turning:turning_offset_compensation` — ✅ wired by U-LPT01
- **SKILL:** `/lathe-offset` (lands later in MS2, likely U-LPT09)

## NEXT PICKUP — U-LPT02 (machine warmup strategy)

**Independent of U-LPT01** (no shared engine surface). Spec from `LATHE-PRO-v2-ROADMAP.md` line 462+:

- Generate warmup cycle (spindle at 50% max RPM for 15-20 min; ramp from 1000 → max in steps)
- First-part offset bias (compensate cold machine — leverages `InverseThermalCompensationEngine` time-constant model)
- Ambient temperature correction input (delta_T from ISO reference 20 deg C)
- Seasonal drift model (winter/summer ambient delta)

### Suggested implementation approach

1. Author `LatheMachineWarmupEngine.ts` — generates G-code stub (M3 S<rpm> + G4 P<dwell> sequence) and offset bias prediction.
2. Compose with `ThermalGrowthCompensationEngine` to predict steady-state delta vs cold-start delta — bias = `(ss - cold) × adjustment_factor`.
3. Tests: identity (cold = warm at infinite time), bias direction sign correctness, seasonal delta (10 deg C swing in steel CTE = ~12um/100mm), ramp profile soundness.
4. Wire `prism_turning:turning_warmup_plan` action.

## Key files for U-LPT02 author

- Roadmap detail: `H:/prism-lathe-pro-v3/mcp-server/data/milestones/LATHE-PRO-v2-ROADMAP.md` line 462 (`**U-LPT02**: Machine warmup strategy`)
- Existing engines to compose:
  - `ThermalGrowthCompensationEngine` — has `calculate()` method, returns spindle/tool/holder/workpiece growth in um plus `time_to_stability_min`.
  - `InverseThermalCompensationEngine` — real-time correction with 21-param machine model + environmental thermal model. Has `time_constant_min` (warm-up time-constant for thermal equilibrium).
- Reference: Bryan (1990), ISO 230-3 thermal testing, Mayr et al. (2012) CIRP Annals (thermal issues in machine tools).
- Pattern to mirror: `LatheOffsetSuperpositionEngine.ts` (this session's U-LPT01) — singleton pattern, AtomicValue outputs, structured throw on invalid input, RSS uncertainty, no inline physics constants.
- Dispatcher edit pattern: `turningDispatcher.ts` lines 178-181 (ACTIONS array entry) and 2509-2514 (case clause with lazy import).

## Pre-commit hook gotcha (if forking another worktree)

After `git worktree add`, you MUST copy `H:/prism/mcp-server/scripts/hooks/cam-phase5-impl-gate.mjs` to your new fork's `mcp-server/scripts/hooks/` directory. If absent, husky pre-commit fails with `MODULE_NOT_FOUND` and reverts your staged changes. This file is currently untracked in main (orphan from someone else's WIP) — track it once that owner commits.

## cam-exhaust-ms0 lane status (NOT touched this session)

3.14MB of orphan uncommitted edits on `work/cam-exhaust-ms0` (CLAUDE.md additions, schema bumps, count walks, test files) — Opus reviewed: `PASS_PARTIAL, 0 landmines, NO lathe-crash signature, RECOMMENDATION: commit-as-is`. Whoever picks up that lane can commit safely. Not my work, not in scope here.

## Doctrine reminders for next chat

- Commit format: `[LATHE-PRO-V3-MS2]/U-LPT##: title`
- Physics constants from `src/physics/constants.ts` only (U-LPT01 follows; U-LPT02 likely needs `STEEL_CTE`, `ALUMINUM_CTE` etc — they are already there)
- Singleton export convention: `export const xEngine = new XEngine();`
- AtomicValue: `{ value, unit, uncertainty, source, warning? }` — never raw primitives
- Tests use vitest `describe/it/expect`, `toBeCloseTo` for floats, minimum 10 cases per engine
- Engine wires to `prism_turning` minimum (per ENGINE WIRING — WIRE TO ALL SOURCES rule). Consider `prism_calc` as secondary if U-LPT02 produces a physics result consumed by other dispatchers.
- No TODO/FIXME/empty-catch — every line traceable to spec
- Run `npx vitest run` after authoring; run `npx tsc --noEmit` to confirm 0 new errors

## Verification commands for the next chat

```bash
# Confirm lane
cd H:/prism-lathe-pro-v3 && rtk git status && rtk git log --oneline -3

# Re-run U-LPT01 tests (sanity)
cd H:/prism-lathe-pro-v3/mcp-server && npx vitest run src/__tests__/LatheOffsetSuperpositionEngine.test.ts

# Verify dispatcher wired
grep -n "turning_offset_compensation" H:/prism-lathe-pro-v3/mcp-server/src/tools/dispatchers/turningDispatcher.ts

# Check chat-bus for any peer claims on lathe files before editing
node H:/prism/.claude/helpers/per-agent-handoff.mjs read --terminal claude-ab827a19
```

## Open task list at end of session

| ID | Status | Subject |
|---|---|---|
| 1 | done | Read LATHE-PRO-MS2 unit list |
| 2 | done | Verify MS2 not already claimed |
| 3 | done | Fork lathe worktree on work/lathe-pro-v3-ms2 |
| 4 | done | Claim MS2 + start first unit |
| 5 | done | U-LPT01: Author LatheOffsetSuperpositionEngine |
| 6 | done | U-LPT01: Tests (26/26 green) |
| 7 | done | U-LPT01: Wire into turningDispatcher |
| 8 | done | U-LPT01: Build verify + commit (3481bdfce) |
