# KNOWLEDGE-CONVERSION-MS0/U-COURSE-FORGE-EXPR — [MAIN] [KNOWLEDGE-CONVERSION-MS0]/U-COURSE-FORGE-EXPR: SafeExpressionEvaluator — Option A keystone (sandboxed expr compiler)

**Commit:** `47e93d03fa1a` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T14:52:27-05:00
**Tags:** knowledge-conversion-ms0, u-course-forge-expr, auto-distilled

## Subject
[MAIN] [KNOWLEDGE-CONVERSION-MS0]/U-COURSE-FORGE-EXPR: SafeExpressionEvaluator — Option A keystone (sandboxed expr compiler)

## Body
```
[MAIN] [KNOWLEDGE-CONVERSION-MS0]/U-COURSE-FORGE-EXPR: SafeExpressionEvaluator — Option A keystone (sandboxed expr compiler)

Implements Option A from U-COURSE-FORGE-DISPATCHER-WIRING-DESIGN.md: the
security-reviewed expression-evaluator that unblocks full MCP dispatcher
wiring for the closure-input course-forge nodes (GradientDescent
objective, ODEIntegrator derivative, LagrangianMechanics Lagrangian,
FEM source, etc.). Dispatcher params will carry expression STRINGS;
this module compiles them to the closures those algorithms need.

mcp-server/src/algorithms/SafeExpressionEvaluator.ts:
- compileExpression(source, allowedVars) → CompiledExpression with a
  pure evaluate(scope) closure. Pipeline: tokenizer → recursive-descent
  parser → AST → hand-walked evaluator. NO eval, NO Function ctor, NO with.
- grammar: + - * / % ^ (^ right-assoc), unary ±, parens, scientific
  notation, scalar + vector[index] vars, whitelisted unary (24) + binary
  (6) math fns, constants pi/e/tau
- compileObjective(src, varName) → (x:number[])=>number — the
  GradientDescent ObjectiveFn-shaped adapter

SECURITY (P0 surface):
- every identifier must resolve to an allowed var / whitelisted const /
  whitelisted fn — else throws at COMPILE time
- FORBIDDEN_NAMES hard-rejected even if caller-allowed: constructor,
  __proto__, prototype, process, require, eval, Function, global,
  globalThis, import, module, exports, this, arguments, window, self
- grammar has NO '.' member access at all — only numeric [index]
- MAX_SOURCE_LEN 4096 + MAX_DEPTH 128 recursion cap (DoS guards)
- caller var-name collision with reserved fn/const rejected

mcp-server/src/algorithms/SafeExpressionEvaluator.test.ts — 60 vitest:
- arithmetic: precedence, ^ right-assoc (2^3^2=512), unary, sci-notation
- 30 math fns + 3 constants + nested composition
- scalar + vector[i] + computed-index vars; reusable across scopes
- **SECURITY block (~25 cases)**: rejects all 11 dangerous identifiers
  bare AND as foolishly-allowed vars, constructor() call, .member
  access, unknown fn/var, oversized source, deep nesting, backtick,
  reserved-name collision
- fail-loud errors: unbalanced parens, trailing op, arity, OOB index,
  missing var, scalar/vector misuse, malformed number, non-string src
- compileObjective: paraboloid, Rosenbrock, math-fn objectives

60/60 PASS first try. tsc clean (Array.from not spread — target-safe).

Self-contained — no peer-claimed files touched. Enables a future
U-COURSE-FORGE-P1-DISPATCHER to wire all 7 nodes safely.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (3)
- .../src/algorithms/SafeExpressionEvaluator.test.ts | 259 +++++++++++
- .../src/algorithms/SafeExpressionEvaluator.ts      | 486 +++++++++++++++++++++
- 2 files changed, 745 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 47e93d03fa1a`
- Milestone envelope: `mcp-server/data/milestones/KNOWLEDGE-CONVERSION-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._