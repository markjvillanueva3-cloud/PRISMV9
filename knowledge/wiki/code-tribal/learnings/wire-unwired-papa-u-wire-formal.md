# WIRE-UNWIRED-PAPA/U-WIRE-FORMAL — [MAIN-FORCE] [WIRE-UNWIRED-PAPA]/U-WIRE-FORMAL (slot:papa): wire FormalVerificationEngine (Z3 SAT/SMT) -> prism_dev (formal_prove/formal_satisfy/formal_ready) + FIX silent SAT-degradation bug. BUG: extractModel called model.get(v.name) with a STRING but z3-solver Model.get takes the variable EXPRESSION -> threw -> swallowed by prove/satisfy try/catch -> every SAT result silently degraded to 'unknown'. FIX: pass vars Map, model.get(expr). DRY _formalBoundedIntVar/_formalLinearConstraint sub-schemas. 18/18 tests incl LIVE round-trip + real Z3 reference values (provable->unsat, disprovable->sat+counterexample in [5,7], multi-var, satisfy sat/unsat) + validation throws + undeclared-var fail-soft. Per-file scrutiny 2/2 PASS (both verified the fix vs z3-solver Model.get(Expr) overload), 0 P0/P1. 0 tsc errors attributable.

**Commit:** `4b144ce6def2` · **By:** markjvillanueva3-cloud · **At:** 2026-06-14T00:22:20-05:00
**Tags:** wire-unwired-papa, u-wire-formal, auto-distilled

## Subject
[MAIN-FORCE] [WIRE-UNWIRED-PAPA]/U-WIRE-FORMAL (slot:papa): wire FormalVerificationEngine (Z3 SAT/SMT) -> prism_dev (formal_prove/formal_satisfy/formal_ready) + FIX silent SAT-degradation bug. BUG: extractModel called model.get(v.name) with a STRING but z3-solver Model.get takes the variable EXPRESSION -> threw -> swallowed by prove/satisfy try/catch -> every SAT result silently degraded to 'unknown'. FIX: pass vars Map, model.get(expr). DRY _formalBoundedIntVar/_formalLinearConstraint sub-schemas. 18/18 tests incl LIVE round-trip + real Z3 reference values (provable->unsat, disprovable->sat+counterexample in [5,7], multi-var, satisfy sat/unsat) + validation throws + undeclared-var fail-soft. Per-file scrutiny 2/2 PASS (both verified the fix vs z3-solver Model.get(Expr) overload), 0 P0/P1. 0 tsc errors attributable.

## Body
```
[MAIN-FORCE] [WIRE-UNWIRED-PAPA]/U-WIRE-FORMAL (slot:papa): wire FormalVerificationEngine (Z3 SAT/SMT) -> prism_dev (formal_prove/formal_satisfy/formal_ready) + FIX silent SAT-degradation bug. BUG: extractModel called model.get(v.name) with a STRING but z3-solver Model.get takes the variable EXPRESSION -> threw -> swallowed by prove/satisfy try/catch -> every SAT result silently degraded to 'unknown'. FIX: pass vars Map, model.get(expr). DRY _formalBoundedIntVar/_formalLinearConstraint sub-schemas. 18/18 tests incl LIVE round-trip + real Z3 reference values (provable->unsat, disprovable->sat+counterexample in [5,7], multi-var, satisfy sat/unsat) + validation throws + undeclared-var fail-soft. Per-file scrutiny 2/2 PASS (both verified the fix vs z3-solver Model.get(Expr) overload), 0 P0/P1. 0 tsc errors attributable.
```

## Files touched (5)
- mcp-server/src/__tests__/devDispatcher.uwireFormal.test.ts | 237 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/FormalVerificationEngine.ts         |  19 ++++++----
- mcp-server/src/schemas/devActionSchemas.ts                 |  25 +++++++++++++
- mcp-server/src/tools/dispatchers/devDispatcher.ts          |  23 ++++++++++++
- 4 files changed, 297 insertions(+), 7 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 4b144ce6def2`
- Milestone envelope: `mcp-server/data/milestones/WIRE-UNWIRED-PAPA.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._