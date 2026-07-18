# SECURITY/U-OKUMA-EVAL-COND-HARDEN — [MAIN-FORCE] [SECURITY]/U-OKUMA-EVAL-COND-HARDEN (slot:alpha): OkumaParametricProgramEngine.evalCondition ran raw eval() on untrusted NC condition text -- code-injection vector

**Commit:** `c01263ba189a` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T08:27:24-05:00
**Tags:** security, u-okuma-eval-cond-harden, auto-distilled

## Subject
[MAIN-FORCE] [SECURITY]/U-OKUMA-EVAL-COND-HARDEN (slot:alpha): OkumaParametricProgramEngine.evalCondition ran raw eval() on untrusted NC condition text -- code-injection vector

## Body
```
[MAIN-FORCE] [SECURITY]/U-OKUMA-EVAL-COND-HARDEN (slot:alpha): OkumaParametricProgramEngine.evalCondition ran raw eval() on untrusted NC condition text -- code-injection vector

ROOT CAUSE: convertToHardcode (the public Okuma macro->hardcode interpreter) resolved IF/GOTO
branches via evalCondition, which did `Boolean(eval(e))` where `e` is built from the program`s
IF-condition text (untrusted file input) after V-substitution + LT/GT/EQ translation. A crafted
condition (e.g. `IF [(globalThis.x = 1) GT 0] GOTO N..`) would execute arbitrary JS. The sibling
NUMERIC path (safeNumEval, same method) was already hardened "to prevent code injection" -- this
condition path was MISSED. Surfaced as an esbuild direct-eval warning.

FIX (no eval / Function-constructor on untrusted text; reuses the existing safe evaluator):
normalize the word-operators, split the condition into lhs/op/rhs, evaluate each SIDE with the
method`s own safe numeric evaluator (evalExpr -> safeNumEval, which whitelists chars + handles
V-subst/brackets), then apply the comparison in plain JS. A bare expression (no operator) keeps
the prior Boolean(value) truthiness (non-zero -> true); non-finite -> false (fail-safe).

Identical result for every valid numeric Okuma condition; a malicious/non-numeric condition is
fail-safe false and NEVER executes. JM lathe fleet is 100% Okuma OSP -> this interpreter runs on
real shop programs. convertToHardcode previously had ZERO tests; added 3 (first coverage): valid
true/false branch, bare-expression truthiness, + a SECURITY regression oracle (an assignment
embedded in a condition must not set a sentinel -- fails pre-fix). 36/36; build exit 0, tsc-clean.
Mem reference_okuma_eval_cond_harden_2026_06_22.
```

## Files touched (3)
- mcp-server/src/__tests__/OkumaParametricProgramEngine.test.ts | 40 ++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/OkumaParametricProgramEngine.ts        | 32 +++++++++++++++++++++++++++++---
- 2 files changed, 69 insertions(+), 3 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show c01263ba189a`
- Milestone envelope: `mcp-server/data/milestones/SECURITY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._