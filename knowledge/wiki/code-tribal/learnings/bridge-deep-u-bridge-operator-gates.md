# BRIDGE-DEEP/U-BRIDGE-OPERATOR-GATES — [MAIN-FORCE] [BRIDGE-DEEP]/U-BRIDGE-OPERATOR-GATES (slot:india): fix operator_gate_* result-envelope contract in prism_safety + land orphaned test

**Commit:** `cf33b41a81dd` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T18:54:50-05:00
**Tags:** bridge-deep, u-bridge-operator-gates, auto-distilled

## Subject
[MAIN-FORCE] [BRIDGE-DEEP]/U-BRIDGE-OPERATOR-GATES (slot:india): fix operator_gate_* result-envelope contract in prism_safety + land orphaned test

## Body
```
[MAIN-FORCE] [BRIDGE-DEEP]/U-BRIDGE-OPERATOR-GATES (slot:india): fix operator_gate_* result-envelope contract in prism_safety + land orphaned test

6th orphaned-test closure (a CONTRACT fix, not a wire -- the 7 operator_gate_* actions were
already wired into prism_safety, but their 15-case test was UNTRACKED and 15/15 failed on a
result-shape mismatch).

ROOT CAUSE (R8): the handlers returned the RAW ApprovalGate (`result = oag.openGate(...)`), but
the U-BRIDGE-OPERATOR-GATES test contract is a {success,data} envelope: every operator_gate_*
result is {success:true, data:<gate>} on success and {success:false, error} on an engine
fail-loud throw. The sibling chatter/spindle/coolant gate results already carry a `success`
field (their engines return it); the operator-gate engine returns a bare gate object (no
success) OR throws to enforce invariants -- so the dispatcher must supply the envelope.

FIX (localized to the operator_gate branch + the unknown-action return):
- Wrap the operator_gate if/else-if in try/catch: success -> {success:true, data:<gate>};
  engine throw (blocked item / unassigned operator / unknown gate / empty checklist|operators)
  -> {success:false, error:e.message}. Engine messages already match the test patterns
  (BLOCKED / not assigned / unknown gate / at least one checklist item|assigned operator).
- Unknown-action return: + success:false (the z.enum-typo test asserts res.success===false on
  an unrecognized action; additive -- the error field is unchanged).

VALIDATION (R12, shared safety dispatcher): operator-gate 15/15 green; full safety regression
sweep 1352/1355 across 63 safety test files (the 3 remaining failures -- safety-quality-handbook
machine-limit/alarm resolution + WireEDM print-to-program safety envelope -- are PRE-EXISTING and
do NOT reference operator_gate or the unknown-action path, so unrelated to this change). tsc clean.
Closes the operator-gate item in [[reference_orphaned_dispatcher_wire_backlog_2026_06_22]].
```

## Files touched (3)
- mcp-server/src/__tests__/operator-gate-dispatcher.test.ts | 298 ++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/tools/dispatchers/safetyDispatcher.ts      |  69 +++++++------
- 2 files changed, 338 insertions(+), 29 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show cf33b41a81dd`
- Milestone envelope: `mcp-server/data/milestones/BRIDGE-DEEP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._