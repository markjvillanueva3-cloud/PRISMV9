---
title: PRISM pipeline — /program-perfect (gen -> optimize -> validate -> loop -> ship)
slug: program-perfect
kind: pipeline
status: shipped
date: 2026-05-17
milestone: COMMAND-KERNEL-MS0
unit: U-CK23
author: claude-2d30710b (slot hotel, /loop command-kernel)
trigger: command
composed_of: [/program-gen, /program-optimize, /program-validate, /program-simulate, safety-physics-oracle, operator-gate, /setup-sheet-generate]
stages: [gen, optimize, validate, loop, operator-gate, ship]
consumes:
  - .claude/commands/program-gen.md
  - PrintToProgramOrchestratorEngine
  - safety-physics-oracle
produces:
  - nc-program
  - setup-sheet
  - perfection-iter-log
  - safety-physics-verdict
downgrade:
  mode: hard-stop
  fallback_to: manual-program-without-oracle
telemetry:
  ledger: state/shared/pipeline-telemetry.jsonl
  fields: [fire_ts, chain_id, step_id, latency_ms, outcome, session_id, slot]
---

# `/program-perfect` — Part-Program Perfection Loop (U-CK23)

Composed front-end for iterative program perfection. Gen → optimize
→ validate (incl. safety-physics S(x) floor 0.70) → loop until
convergence or max iter → operator gate → ship. R8: adds 0 logic.

This IS the perfection loop the DOMAIN-PIPELINE-MS0 18-stage
pipeline (per `knowledge/wiki/architecture/domain-pipeline-ms0.md`)
runs internally at stages 11 (TOOLPATH_GEN) + 12 (SAFETY_VALIDATE)
+ 14 (SIMULATE) + 15 (OPERATOR_GATE). This skill is the operator
entry when the deliverable IS the program (not the full
print-to-part chain).

## Stage table

| # | Stage | What | Stop-on-fail |
|---|-------|------|--------------|
| 1 | gen | /program-gen → first-pass G-code from part input | yes — no compatible CAM bails |
| 2 | optimize | /program-optimize → speed-feed / toolpath / sequence deltas | yes — "no improvement" jumps to operator-gate |
| 3 | validate | /program-validate (post/syntax) + /program-simulate (collision) + safety-physics S(x) | yes — S(x) < 0.70 HARD BLOCKS |
| 4 | loop | if pass AND delta < tol OR iter >= MAX: exit; else feed back to optimize | warn — MAX reached without convergence surfaces honestly |
| 5 | operator-gate | surface program + S(x) + deltas; operator types ship | iterate <hint> | abort | block — per CLAUDE.md operator-in-the-loop |
| 6 | ship | write program + /setup-sheet-generate; close-out if --unit | yes — output write retries with alternate path |

## Safety invariants (load-bearing)

- **S(x) ≥ 0.70 HARD BLOCK** — physics oracle returns FAIL; never weaken. Per CLAUDE.md safety rule.
- **Operator-in-the-loop unconditional** — stage 5 cannot be bypassed by any knob. Per CLAUDE.md.
- **No inline physics constants** — Kienzle / Taylor / material constants imported from `physics/constants.ts`; checked at GEN stage.
- **Per-tier safety threshold** — `state/shared/omega-thresholds.json` governs (shop_floor: Ω≥0.95, S(x)≥0.98 unless explicit).

## Rollback chain

| Failed stage | Rollback |
|--------------|----------|
| 1 gen | no-op (output to /tmp; not yet anywhere durable) |
| 2 optimize | revert to prior iter's program |
| 3 validate | revert to prior pass program; surface S(x) trace |
| 4 loop | exit loop with last-pass program; never silent-fail |
| 5 operator-gate | abort → leave program in /tmp; do NOT write to JM DIE |
| 6 ship | retry write with alternate path; surface error |

## Inputs

| Flag | Default | Purpose |
|------|---------|---------|
| `<part>` | (required) | part id or path |
| `--domain` | auto | mill / lathe / wedm / grinder |
| `--machine` | best-fit | force machine |
| `--max-iter` | 3 | LOOP budget (envelope U-CK23: "<=3 iteration loop then ship") |
| `--tolerance` | 0.05 | convergence threshold (5%) |
| `--out` | JM DIE/programs/<part>/ | ship destination |
| `--no-ship` | false | stop after stage 5 |

## Composes-with

Composed BY:

- `/session-cycle` (U-CK17) BUILD when deliverable is program-class
- `/loop` autonomous-iter perfection sweeps
- `/pipeline execute program-perfect` (U-CK25)
- `/print-to-program` (the full 18-stage pipeline calls this for stages 11-15 internally)
- direct operator invocation

Composes:

- `/program-gen`, `/program-optimize`, `/program-validate`, `/program-simulate` — leaves
- `safety-physics` oracle agent — S(x) gate
- `PrintToProgramOrchestratorEngine` — backbone
- `/setup-sheet-generate` — ship companion

## Karpathy discipline pins

- **R8** — GEN reads part + machine + material before toolpath
- **R10** — every LOOP iter restates {iter, S(x), delta, findings}
- **R12** — S(x) HARD BLOCK at 0.70; convergence-failed surfaces honestly; ship NEVER auto-runs past operator gate
- **safety-physics is source of truth** — knob to override exists but requires PRISM_SAFETY_OVERRIDE_REASON env var, logged

## Knobs

- `PRISM_PROGRAM_PERFECT_MAX_ITER=N`, `_TOLERANCE=N`, `_NO_SHIP=1`
- `PRISM_PROGRAM_PERFECT_SX_FLOOR=N` — DANGEROUS; requires `PRISM_SAFETY_OVERRIDE_REASON` set; logged to safety-audit ledger
- Operator gate is NON-disable-able

## Related

- [[session-cycle]] — fires program-perfect in BUILD for program-class units
- [[domain-pipeline-ms0]] — 18-stage chain; program-perfect IS stages 11-15
- [[pipeline]] — meta-command (U-CK25)
- [[loop]] — autonomous-iter wrapper

## See also

- `.claude/commands/program-perfect.md` — operator skill spec (gitignored mirror)
- `mcp-server/src/engines/PrintToProgramOrchestratorEngine.ts` — orchestrator backbone
- `state/shared/omega-thresholds.json` — per-tier safety threshold table
- `mcp-server/data/milestones/COMMAND-KERNEL-MS0.json` U-CK23 — envelope
