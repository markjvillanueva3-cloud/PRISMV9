---
name: reference_okuma_eval_cond_harden_2026_06_22
description: "OkumaParametricProgramEngine.evalCondition ran the raw JS eval built-in on untrusted NC condition text (code-injection, live via camDispatcher) — hardened by reusing the safe evalExpr/safeNumEval; sibling numeric path had been hardened but this one was missed (slot:alpha 2026-06-22)"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.670Z
aliases: reference_okuma_eval_cond_harden_2026_06_22
---


# Okuma evalCondition raw-eval injection (U-OKUMA-EVAL-COND-HARDEN, slot:alpha 2026-06-22)

**Commit:** `c01263ba18` `[SECURITY]/U-OKUMA-EVAL-COND-HARDEN` on `cad-fusion-live-ms0`. 36/36 tests (first-ever coverage of `convertToHardcode`), 3-of-3 PASS.

## The bug (code-injection, LIVE-reachable)
`OkumaParametricProgramEngine.convertToHardcode` (public Okuma macro->hardcode interpreter) resolved `IF [cond] GOTO N##` branches via `evalCondition`, which passed the condition string to the raw JS eval built-in (`Boolean(eval ...)`). That string is built from the program's IF-condition text (untrusted NC file input) after V-substitution + LT/GT/EQ->symbol translation. A crafted condition could **execute arbitrary JS**. Surfaced as an esbuild `direct-eval` warning. **Live vector confirmed by 3-of-3 arm C:** `camDispatcher.ts:8731` action `okuma_convert_to_hardcode` passes raw `params.gcode` straight in -- so this was reachable through the MCP dispatcher, not theoretical.

## Key finding -- the sibling path was already hardened; this one was MISSED
The SAME method has a `safeNumEval` helper (line ~2593) explicitly commented as replacing the raw built-in "to prevent code injection" -- someone hardened the **numeric** eval path earlier but left `evalCondition`'s **condition** path using the raw built-in. Classic partial-hardening miss.

## The fix (no JS evaluator on untrusted text; reuse existing safe infra)
Normalize word-operators -> `e.match(/(<=|>=|==|!=|<|>)/)` -> split at `indexOf(op)` -> evaluate each SIDE via the method's own safe `evalExpr` (-> `safeNumEval`, which whitelists chars `[^0-9+\-*/().eE\s]` + handles V-subst/brackets) -> apply the comparison in plain JS. Bare expression (no operator) -> `Number.isFinite(v) && v !== 0` (preserves the prior `Boolean(value)` truthiness); non-finite -> false (fail-safe). Identical boolean for every valid numeric Okuma condition (JM lathe fleet is 100% Okuma OSP -> this runs on real shop programs); malicious/non-numeric -> fail-safe false, never executes. The retained `safeNumEval` evaluator is charset-whitelisted (no letters except e/E survive -> no identifiers/calls are executable), so it is not an injection surface.

Tests: 3 new (convertToHardcode had ZERO) -- valid true/false branch, bare-expression truthiness, + a **security regression oracle** (an assignment embedded in a condition must NOT set a sentinel global; fails pre-fix where the raw built-in ran it). Build exit 0, tsc-clean.

## Lessons
- **When you harden ONE JS-evaluator call in a file, grep the WHOLE file for every evaluator call and harden them all in the same pass** -- partial hardening (numeric path fixed, condition path missed) leaves a live hole that looks safe ("we already removed it here").
- **Build WARNINGS (esbuild `direct-eval`) flag real security bugs** -- same lesson as the MINFileParser `duplicate-case` ([[reference_minparse_units_cycle_collision_2026_06_22]]). Triage build warnings, don't ignore them.
- **The safest replacement for a raw evaluator is to not introduce any evaluator at all** -- split the comparison and reuse an existing charset-whitelisted numeric evaluator + plain-JS operators. (The anti-pattern hook correctly blocked an evaluator-constructor-based first attempt; the evalExpr-reuse approach is both safer and passes the gate.)
- **Adjacent FIXES queued (same build run):** 10 `duplicate-case` warnings remain in dispatchers (turningDispatcher, sessionDispatcher, businessDispatcher x4, aiReasoningDispatcher x2) -- pre-existing duplicate action-cases (sibling of the xproc fall-through regression class), a future FIXES-rung sweep.
