---
title: Conformal coverage audit -- the false-green --strict gate trap
type: lesson
slot: india
date: 2026-06-16
tags: [conformal-prediction, ci-gating, false-green, india-discipline, R12]
commit: cad-fusion-live-ms0 (scripts/nn-graph-conformal-audit.mjs)
---

# False-green --strict gate (slot:india 2026-06-16)

A surprisingly subtle CI-gating trap, caught by per-file scrutiny on a new conformal coverage audit (`scripts/nn-graph-conformal-audit.mjs`).

## The trap
A conformal coverage audit reports two orthogonal things:
- `marginalGuaranteeMet`: empirical coverage >= target (1 - alpha) - tolerance.
- `trustworthy`: the coverage NUMBER is a real signal, not an artifact of degenerate inputs.

The "trivially full-set" path (tiny calibration N such that ceil((N+1)(1-alpha)) > N -> `qHat = 1` -> threshold (1-qHat) = 0 -> EVERY class enters the prediction set) makes empirical coverage trivially 1.0. So:
- `marginalGuaranteeMet = true` (1.0 >= 0.9)
- `trustworthy = false` (the 1.0 is meaningless)

If the CI `--strict` mode gates ONLY on `!marginalGuaranteeMet`, a known-untrustworthy run **passes CI silently** -- a textbook false-green. The warning prints to stderr, but exit is 0 and the gate is fooled. This is precisely the failure mode india's "never a misleading metric" invariant exists to prevent, so emitting an exit-0 here is *worse* than failing.

## The rule
**A CI gate on a statistical artifact must fail closed on UNTRUSTWORTHY, not just on FAIL.** An honest FAIL is recoverable; a silent untrustworthy PASS is a corrupted ground truth that propagates.

Applied: `--strict + ok + !trustworthy -> exit 2 (REFUSED)`, not exit 0. Exit codes:
- `0` = ok + guarantee met + trustworthy
- `1` = ok + trustworthy + !guarantee-met (under `--strict` only)
- `2` = refused, load failure, OR `--strict + ok + !trustworthy`

## Sibling pattern: refuse-gate at the input
Same family of rule, one step earlier: refuse to emit a number when the holdout n is below the meaningful-N floor (here `MIN_MEANINGFUL_N = 20`, matching `ConformalCalibrationMonitorEngine.MIN_WINDOW_SIZE`). At n=13, p=0.9 the binomial 95% CI is ~+-0.16 -- a coverage rate is not a signal. The fix is to **grow the holdout**, not to lower the floor.

## Pinning the fix with a non-circular test
The regression test must invoke the real CLI (`child_process.spawnSync(process.execPath, [cli, "--strict", "--json", ...])`) and assert `r.status === 2`. An in-process function-level assertion would not catch a regression that lives in `main()`'s exit-code branch. Cost: ~150ms per test; benefit: a future contributor cannot revert the gate without the suite going red.

## Lessons
- Statistical-tool authors: separate `guaranteeMet` (the math result) from `trustworthy` (was the math even applicable?), and CI must fail closed on BOTH.
- Reviewers: when a CI gate looks at just one boolean, ask "is there a way for ok=true to also be a known-bad result?" If yes, gate on both.
- Test discipline: a CLI exit-code regression must be spawn-tested, not function-tested -- the bug lives in `main()` and the harness must exercise it. (operator fix-inline doctrine [[feedback_auto_fix_and_blackwell_fleet_enforced]].)

## Verify
`cd /h/prism && node --test scripts/nn-graph-conformal-audit.test.mjs` -> 13/13 (incl. `CLI --strict on an untrustworthy run exits 2`).
Memory: [[reference_conformal_audit_tool_2026_06_16]].
