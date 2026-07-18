---
name: reference_post_ship_wire-unwired-papa-u-wire-formal
description: Auto-distilled learnings from shipping WIRE-UNWIRED-PAPA/U-WIRE-FORMAL (commit 4b144ce6d). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.107Z
aliases: reference_post_ship_wire-unwired-papa-u-wire-formal
---


# WIRE-UNWIRED-PAPA/U-WIRE-FORMAL

[MAIN-FORCE] [WIRE-UNWIRED-PAPA]/U-WIRE-FORMAL (slot:papa): wire FormalVerificationEngine (Z3 SAT/SMT) -> prism_dev (formal_prove/formal_satisfy/formal_ready) + FIX silent SAT-degradation bug. BUG: extractModel called model.get(v.name) with a STRING but z3-solver Model.get takes the variable EXPRESSION -> threw -> swallowed by prove/satisfy try/catch -> every SAT result silently degraded to 'unknown'. FIX: pass vars Map, model.get(expr). DRY _formalBoundedIntVar/_formalLinearConstraint sub-schemas. 18/18 tests incl LIVE round-trip + real Z3 reference values (provable->unsat, disprovable->sat+counterexample in [5,7], multi-var, satisfy sat/unsat) + validation throws + undeclared-var fail-soft. Per-file scrutiny 2/2 PASS (both verified the fix vs z3-solver Model.get(Expr) overload), 0 P0/P1. 0 tsc errors attributable.

**Shipped:** 2026-06-14T00:22:20-05:00 by markjvillanueva3-cloud
**Files:** 5 touched

Full distillation: [[wire-unwired-papa-u-wire-formal]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._