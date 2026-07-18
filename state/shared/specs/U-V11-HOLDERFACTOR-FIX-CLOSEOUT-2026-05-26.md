# U-V11-HOLDERFACTOR-FIX — close-out (iter22, slot echo, 2026-05-26)

**Milestone:** POST-BRIDGE-SYNERGY-MS0 · **Unit:** #1 of 135 in envelope

## Bug evidence

Operator's `JM DIE/HURCO CNC PROGRAMS/v11 test.hnc` line 70:
```
(PRISM: Calculation error holderFactor is not defined - using Fusion defaults)
```

## Root cause (acorn-verifiable)

In the JM Die customer-deployed copy `JM DIE/PRISM MODIFIED POST PROCESSORS/HURCO_VM30i_PRISM_v11.cps`, the `calculateOptimizedSpeed()` function (line 12396) was refactored during v10→v11 holder→TIR rewrite. A local `var tirFactor` is declared at line 12453 (`= Math.max(0.85, Math.min(1.0, 1.0 - (holderData.tir * 100)))`), but the returned `factors` object literal at line 12513 still names `holderFactor`. JavaScript ReferenceError at runtime; Fusion's `warning(…)` wrapper catches the exception and emits the comment + falls back to Fusion defaults. The post silently ships a downgraded program.

The mainline `mcp-server/data/posts/prism-enhanced/HURCO_VM30i_PRISM_v11.cps` already carries `tirFactor` at line 12474 — so the bug is **a drift between mainline and the JM Die deployed copy**, not a mainline defect. The JM Die copy received a hot-fix that wasn't backported through the mainline pipeline.

## Fix

Edit applied to `JM DIE/PRISM MODIFIED POST PROCESSORS/HURCO_VM30i_PRISM_v11.cps` line 12513:
```diff
-        holder: holderFactor,
+        holder: tirFactor,  // U-V11-HOLDERFACTOR-FIX (iter22 2026-05-26): renamed from holderFactor → tirFactor (variable was renamed at line 12453 during v10→v11 TIR refactor but factors object never updated; runtime ReferenceError fell back to Fusion defaults — see JM DIE/HURCO CNC PROGRAMS/v11 test.hnc line 70)
```

## Verification

`mcp-server/src/__tests__/cps-scope-linter.test.ts` (U-SH01, acorn-AST-based JavaScript scope linter, designed for **zero false positives on clean CPS**) run against the fixed JM Die copy:
```
PASS (20) FAIL (0)
```
All 20 assertions pass — no remaining undeclared identifier violations.

The mainline copy `mcp-server/data/posts/prism-enhanced/HURCO_VM30i_PRISM_v11.cps` is unchanged and already correct.

## Why this isn't a git diff

`JM DIE/` is `.gitignore`d (customer data). The fix is applied **in place** on the deployed copy. This close-out doc + the existing acorn linter cover regression discipline for the in-place edit.

## Follow-up units (still queued in envelope)

- **U-V11-CPS-DRIFT-MONITOR**: add `cps-scope-linter` cron against ALL deployed `JM DIE/PRISM MODIFIED POST PROCESSORS/*.cps` so any future in-place hot-fix bug surfaces within 5 minutes.
- **U-V11-MAINLINE-DEPLOY-PIPELINE**: when mainline CPS ships, auto-sync to customer dirs (or refuse the deploy if customer has drifted) so a fix here is permanent and a regression in JM Die's copy can't silently re-emerge.

## Next iter (per envelope priority)

**U-V11-AUTO-POCKET-FROM-LIBRARY** (#2 of 135): read `UserTool.magazine_position` at post emit so operators don't have to fill out tool-pocket data manually — the iter12-confirmed v10/v11 tedium killer.
