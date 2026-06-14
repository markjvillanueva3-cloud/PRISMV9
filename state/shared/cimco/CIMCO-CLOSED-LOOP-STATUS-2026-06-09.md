# CIMCO CLOSED-LOOP TESTING — status + operator handoff
**Date:** 2026-06-09 · **Slot:** echo · **Goal:** begin closed-loop testing of post-processors using CIMCO as the editor to check (a) code is correct and (b) simulations.

## Bottom line (UPDATED 2026-06-09 PM — all-fleet live drive this session: 1 arm operational, 1 with 2 verified blockers)
Closed-loop testing has **BEGUN on both arms**. The **code-correctness arm is OPERATIONAL today** on all 15 machines (post-proof drift audit, no operator). The **simulation arm's autonomous launch+invoke is PROVEN + reliable**; this session's all-fleet live drive then surfaced **two verified blockers** gating the full-fidelity all-15 live sweep -- characterized precisely below (R12: neither "operational" nor "broken").

### Live proof (this session) -- what WORKS, reproduced
- `--op map --launch --nc <real NC>` -> **2337 named controls** realized cold (floor=50); "Machine Simulation" found + invocable, no operator. (Supersedes the stale UIA-era "needs operator-opened CIMCO" claim `ca4ca2826e`; MSAA driver `ff2a968587` reads cold.)
- `--op invoke --name "Machine Simulation" --launch --keep` -> CIMCO launched + sim view engaged. **`invokeOk:true` reproduced across runs** (LTH-01, LTH-03) once the orphan-kill fix landed.
- `--op read-report` (manual, human-paced) -> **found the live report grid**: "Report" table (r24), columns `Start Time (Line)/Type/Message/Action` + `Report Row` (r28). Ground truth: `live-report-structure.json`.

### Blocker status (R12 -- characterized, not assumed)
1. **SOLVED -- single-process `invoke-read` C# op.** Added `--op invoke-read --name "Machine Simulation" --then "Simulate"` to `PrismCimcoUI.exe` (`Program.cs`): in ONE process it launches CIMCO -> opens the sim view -> fires the **"Simulate"** RUN control (so the collision-check actually executes -- invoking the sim tab alone left the report empty) -> settles -> reads the populated report grid, holding the frame handle throughout. **Proven LIVE** (witness: `state/shared/cimco/invoke-read-live-capture-2026-06-09.json`): `{found:true, invokeState:"open=fired;run=fired", container:{name:"Report"}}` -- the populated Report grid (columns `Start Time (Line)/Type/Message/Action`) read in a single process. This removes both the two-process attach race AND the collision-run-trigger gap. `cimco-fleet-drive.mjs` rewired to use it (one exe call per machine). The clean lathe program reads header-only (0 findings) -> correctly labeled `report-header-only` (non-clearing).
2. **CLOSED -- reaper-safe per-machine sweep.** The long node `cimco-fleet-drive.mjs` wrapper got reaped mid-drive by golf's `node-orphan-cleaner.mjs` (the ~125s/machine drive looks like a long orphan). Solved in echo's lane WITHOUT touching golf's reaper: `scripts/cimco-fleet-sweep.ps1` drives each machine from a **PowerShell** loop (PowerShell isn't a reapable node orphan; each ~80-125s `invoke-read` call completes under the reaper's confirm window) -> raw envelopes to a JSONL -> `cimco-fleet-drive.mjs --from-envelopes` classifies them through the real safety gate (fast, no CIMCO -> also reaper-safe). **The all-15 sweep RAN TO COMPLETION:** 12/12 sim-able machines `found=true, invokeState=open=fired;run=fired` (every one launched CIMCO, ran the sim, read the report) + 3 EDM routed. Results: `state/shared/cimco/fleet-drive-results.{json,md}`.

### All-15 fleet sweep result (LIVE, this session)
Every sim-able machine read **header-only** (`report-header-only`, 0 data rows, `cleared=false`) -- correct + honest: the test NCs (one lathe `9007405.MIN`, one mill `CH425-10-PLATE.MIN`) are sim-clean (0 collisions), and the `.mcfg` machine-load is not yet wired (each sim runs against CIMCO's default machine, not the JM-mapped kinematics). So the loop is PROVEN end-to-end on all 15, but full-fidelity per-machine verdicts (collision rows, machine-specific kinematics, inch-vs-mm) need: (a) the `.mcfg` machine-load per machine, (b) a KNOWN-BAD NC to exercise collision-row extraction, (c) per-machine production NCs. These are fidelity wires, not loop-completeness gaps.

### Real-data refinement SHIPPED this session
The normalizer now distinguishes a **header-only report** (column headers realized, 0 data rows -- AMBIGUOUS between clean-run and collision-pass-not-triggered) from genuinely opaque nodes: new `report-header-only` source, deliberately NON-clearing (`CLEARANCE_CAPABLE` excludes it -- a header-only grid must NEVER clear a live run; my earlier "treat header-only as CLEAN" note was WRONG and is corrected). Grounded in `live-report-structure.json`; +3 tests (18 normalizer / 87 total green).

## Arm A — "check if code is correct" (STATIC) — OPERATIONAL NOW
Runs with zero operator involvement. Demonstrated this session:
- `node scripts/cimco-post-proof.mjs` -> **15 machines, 9191 goldens byte-compared, 240 true copy-drift + 7 name-collisions** flagged (`state/shared/cimco/jm-post-proof.json`).
- Byte-equivalence comparator: `scripts/lib/nc-normalize.mjs` (shipped, tested) — normalizes non-semantic diffs, fails on real drift.
- Dialect lint: `cimco_dialect_lint` / `scripts/post-nc-dialect-lint.mjs` — flags G/M codes a post emits that JM's goldens never used.
- Golden round-trip classifier: `scripts/lib/nc-dialect-masks.mjs` — byte-identical | volatile-header-only | semantic-drift.

This IS closed-loop code-correctness testing: emit/golden -> normalize -> compare -> drift verdict, across the fleet.

## Arm B — "for simulations" (LIVE) — BUILT + autonomous-invoke PROVEN; full-fidelity sweep gated by 2 blockers
The full chain composes in code AND the autonomous launch+invoke ran live this session (see "Live proof" + "blockers" above):
- **SIM-1A** `--op read-report` (C# MSAA reader) + `cimco-report-normalize.mjs` (rows + fail-closed ladder) — commits `01c53f6872`, `679565fcb5`.
- **FSM-LIVE-DRIVE** `driveLiveFsm` — navigate (ui-map FSM) -> run Machine Sim -> poll read-report to quiescence -> `assessReadReport` verdict, fail-closed at every hop — commit `dba50eb3da`.
- **CLEARANCE-COMPOSE** `composeClearanceInput` — maps the drive result into `prism_cimco:cimco_live_run_clearance` (the TS 5-gate: bound + units + kinematics + sim-cleared + run-complete) — this commit.
- Fleet rollup: `cimco-sim-fleet.mjs` already classifies the fleet (12 sim-able mill/lathe + 3 EDM-routed).

87 tests green across the loop (69 `cimco-sim-driver` + 18 normalizer incl. the new header-only cases). NOTE: the new `cimco-fleet-drive.mjs` batch driver itself has NO unit tests -- it is I/O-bound (launches real CIMCO) and exercised live, not unit-tested; its pure logic (cursor/readiness/EDM-routing) is a test-coverage follow-up.

### How to run it (autonomous — no operator)
```
PrismCimcoUI.exe --op invoke --name "Machine Simulation" --launch --nc <posted.nc> --keep --allow-actions
PrismCimcoUI.exe --op read-report            # SEPARATE process -- attaches to the --keep CIMCO. RELIABLE only
                                             # human-paced; in tight batch returns no-read (BLOCKER 1).
# then: composeClearanceInput(driveResult) -> prism_cimco:cimco_live_run_clearance (5-gate go/no-go)
PrismCimcoUI.exe ... (kill BOTH CIMCOEdit.exe AND PrismCimcoUI.exe at end -- R14; the --keep driver lingers)
```
Batch driver: `node scripts/cimco-fleet-drive.mjs [--ids LTH-03,VMC-03] [--limit N] [--fresh]` -- resumable (per-machine flush + cursor), one CIMCO launch per short-lived process. Run ONE machine per process (blocker 2) until reaper coordination lands.

### Operator value (not a blocker)
The remaining operator involvement is OPTIONAL/scheduling: which JM programs to prove out, and the `U-LEGAL-13` provenance sign-off before any post ships to a PHYSICAL machine. Neither blocks autonomous sim-testing of code.

## Remaining CIMCO work
| item | state |
|------|-------|
| All SPINE-1 + SIM-2..7 + SIM-1A + FSM-LIVE-DRIVE + CLEARANCE-COMPOSE + fleet-drive batch | SHIPPED |
| Static code-correctness arm | OPERATIONAL (runs today, all 15) |
| Sim arm: autonomous CIMCO launch + Machine-Sim invoke | PROVEN + reliable (orphan-kill fix) |
| Normalizer: header-only -> distinct NON-clearing `report-header-only` source | SHIPPED this session (+3 tests) |
| **BLOCKER 1** -- single-process C# `invoke-read --then "Simulate"` (sim run + report read in one process) | SHIPPED + PROVEN LIVE (found:true, Report grid read) |
| **BLOCKER 2** -- reaper-safe all-15 sweep (PowerShell-per-machine + `--from-envelopes` finalize) | CLOSED -- ran to completion (12/12 sim-able + 3 EDM, all found=true) |
| `.mcfg` machine-load per machine + known-bad NC for collision-row extraction + per-machine production NCs | fidelity wires (loop is complete; these sharpen per-machine verdicts) |
| Data-row cell extraction vs a known-bad NC that collides in sim | pending (gated by blocker 1) |
| `U-LEGAL-13` (public-manuals-only provenance) before shipping to a PHYSICAL machine | OPERATOR-GATED (legal; does NOT block sim-testing) |

## Method note (per operator directive)
Ollama (local `qwen2.5-coder:32b`) did the bulk corpus deep-dive (17 slices) for the forge roadmap; Claude built the safety-critical clearance/orchestration logic and exact-signature reads (where local-model accuracy is insufficient for a CNC safety gate). Roadmap: `state/shared/specs/ECHO-FORGE-ROADMAP-2026-06-09.md`.
