---
name: feedback-safety-gate-veto-on-fail-flag-not-severity
description: "A safety gate must veto on the boolean FAIL flag, not on the producer's advisory severity label -- gating SAFE only on severity==='critical' let a FAILED check grade SAFE (fleet-wide doctrine, slot:whiskey 2026-06-26)"
type: feedback
slot: whiskey
galaxy: lathe
source: prism-memory
synced: 2026-06-27T20:30:46.442Z
aliases: feedback_safety_gate_veto_on_fail_flag_not_severity
---


# A safety gate vetoes on the FAIL FLAG, never on the advisory severity LABEL

**Why:** Building the lathe closed-loop safety scorer (`scripts/lib/lathe-safety-efficiency-score.mjs`,
U-W2D), the SAFE/UNSAFE verdict gated collision failures on `passed === false && severity === "critical"`.
But `LatheCollisionZoneEngine` emits `passed:false, severity:"warning"` for REAL conflicts
(live-tool-vs-tailstock CONFLICT, grooving/parting overhang). So a program with a genuinely FAILED
collision check graded **SAFE** -- a never-soften violation. The first two scrutiny arms (physics-reviewer
+ reviewer) both PASSED it; the independent 3rd arm (code-analyzer) caught it. The producer's `severity`
is an ADVISORY risk hint; the `passed` boolean is the actual verdict. Gating on the label discards the
fact that the check failed.

**How to apply (any safety/veto gate, any galaxy):**
1. Veto on the FAIL FLAG: if a check reports `passed === false` (or `ok === false` / `violated === true`),
   the gate must NOT grade SAFE -- regardless of the severity/priority label attached. Err toward UNSAFE
   on a non-pass; that is the safe direction.
2. Treat the severity label as REPORTING detail (breakdown / triage ordering), not as the gate condition.
3. A present-but-non-finite or malformed signal (NaN/Infinity, missing `passed`) is UNVERIFIABLE -> degrade
   to PARTIAL/UNKNOWN, never an implicit pass (R12 -- no fail-open on a safety axis).
4. Test it: a failing-first test with `passed:false` at the LOWEST non-passing severity must assert NOT SAFE.
   If your tests only use the highest severity, the label-gating bug hides (exactly what happened here --
   all 9 original tests used `severity:"critical"`).

This is the safety-gate form of "never soften safety thresholds" and pairs with the per-file + 3-of-3
scrutiny gates (the independent analyst arm is what catches a label-gating SAFE-on-fail that holistic
reviewers wave through). Wiki: [[lathe-closed-loop-test]]. Sibling: [[feedback_safety_critical_tests]].
