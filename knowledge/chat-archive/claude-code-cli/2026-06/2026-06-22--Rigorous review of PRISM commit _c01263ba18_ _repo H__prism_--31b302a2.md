---
type: "chat-session"
source: "claude-code-cli"
session_id: "31b302a2-1334-4b15-87f3-6aa6d7d85dfa"
title: "Rigorous review of PRISM commit `c01263ba18` (repo H:/prism, branch cad-fusion-l"
date: "2026-06-22"
first_ts: "2026-06-22T13:28:03.306Z"
last_ts: "2026-06-22T13:29:41.545Z"
cwd: "H:\\prism"
messages: 24
user_msgs: 9
assistant_msgs: 15
raw_file: "H:/.claude/projects/H--prism/31b302a2-1334-4b15-87f3-6aa6d7d85dfa/subagents/agent-aaf880d06f032e355.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:09"
---

# Rigorous review of PRISM commit `c01263ba18` (repo H:/prism, branch cad-fusion-l

> **claude-code-cli** | 2026-06-22 | 24 msgs (9 user / 15 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/31b302a2-1334-4b15-87f3-6aa6d7d85dfa/subagents/agent-aaf880d06f032e355.jsonl`

## Transcript

### User | 2026-06-22T13:28:03.306Z

Rigorous review of PRISM commit `c01263ba18` (repo H:/prism, branch cad-fusion-live-ms0). Read the diff: `cd H:/prism && git show c01263ba18`, and the surrounding code in `mcp-server/src/engines/OkumaParametricProgramEngine.ts` — the `evalCondition` closure + the sibling `evalExpr` (~line 2580) and `safeNumEval` (~line 2593) it now reuses.

UNIT: U-OKUMA-EVAL-COND-HARDEN — a SECURITY fix. `evalCondition` (inside the public `convertToHardcode` Okuma macro→hardcode interpreter) used raw `Boolean(eval(e))` on untrusted NC-program condition text → code-injection. The fix removes eval: normalize word-operators (LT/GT/EQ…→symbols), split into lhs/op/rhs, evaluate each side with the existing safe `evalExpr` (→ `safeNumEval`), apply the comparison in plain JS. Bare expression (no operator) → truthy iff non-zero; non-finite → false.

VERIFY (cite file:line):
1. NO `eval(`/`new Function(` remains in the new evalCondition (the only `new Function` is the pre-existing safeNumEval it delegates to, which is charset-whitelisted). Confirm untrusted text can no longer reach a JS evaluator un-sanitized.
2. BEHAVIOR-PRESERVING for valid Okuma conditions: trace `V80 LT 0.05`, `V1 EQ 0`, `V1 GT 0`, a negative rhs like `V1 GE -5` — do they yield the same boolean as the old eval? Check the operator-match regex `(<=|>=|==|!=|<|>)` picks the correct (leftmost, 2-char-before-1-char) operator and `indexOf(op)` splits at the right place.
3. The 3 new tests (first-ever coverage of convertToHardcode) — is the SECURITY test a genuine oracle (would it FAIL pre-fix because raw eval executes the embedded assignment, setting the sentinel)? Are the branch-behavior tests correct given the IF/GOTO loop (line ~2688)?
4. Edge: compound/garbage conditions don't crash (fail-safe false), no infinite loop, no throw out of convertToHardcode.

Grade PASS or FAIL with P0/P1/P2 + file:line. Be concise.

### Assistant | 2026-06-22T13:28:08.301Z

I'll review commit `c01263ba18` rigorously. Let me start by reading the diff and surrounding code.

### Assistant | 2026-06-22T13:28:08.750Z

[tool_use: Bash]

### User | 2026-06-22T13:28:14.825Z

[tool_result] commit c01263ba189ac53d9c8e1329158bb83f3208ea87
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Mon Jun 22 08:27:24 2026 -0500

    [MAIN-FORCE] [SECURITY]/U-OKUMA-EVAL-COND-HARDEN (slot:alpha): OkumaParametricProgramEngine.evalCondition ran raw eval() on untrusted NC condition text -- code-injection vector
    
    ROOT CAUSE: convertToHardcode (the public Okuma macro->hardcod
... [+9398 chars truncated]

### Assistant | 2026-06-22T13:28:17.988Z

I have the diff. Now let me read the surrounding code in the engine to verify the `evalExpr` and `safeNumEval` siblings, and understand the IF/GOTO loop context.

### Assistant | 2026-06-22T13:28:18.868Z

[tool_use: Read]

### User | 2026-06-22T13:28:19.758Z

[tool_result] 2560	  // --------------------------------------------------------------------------
2561	  // PUBLIC: Convert macro program to hardcoded G-code (ported from Python)
2562	  // --------------------------------------------------------------------------
2563	  /**
2564	   * Convert an Okuma macro program with V-variables to clean hardcoded G-code.
2565	   * Evaluates all expressions, resolves IF/GOTO
... [+7282 chars truncated]

### Assistant | 2026-06-22T13:28:23.400Z

Now let me read the rest of the IF/GOTO loop to verify the branch behavior and check for the `else` fall-through, plus confirm there are no other `eval(` usages.

### Assistant | 2026-06-22T13:28:24.949Z

[tool_use: Read]

### Assistant | 2026-06-22T13:28:25.654Z

[tool_use: Grep]

### User | 2026-06-22T13:28:26.043Z

[tool_result] 2708	    while (cur < lines.length && iter < maxIter) {
2709	      iter++;
2710	      const stripped = lines[cur].trim();
2711	      if (varDefLines.has(cur)) { cur++; continue; }
2712	      if (!stripped) { cur++; continue; }
2713	      // IF [cond] GOTO N##
2714	      const ifM = stripped.match(/IF\s*\[([^\]]+)\]\s*GOTO\s*N(\d+)/i);
2715	      if (ifM) {
2716	        if (evalCondition(ifM[1])) {
... [+3594 chars truncated]

### User | 2026-06-22T13:28:28.218Z

[tool_result] 2592:      // Safe numeric evaluation helper — replaces raw eval() to prevent code injection
2598:          return new Function(`"use strict"; return (${cleaned});`)() as number;

### Assistant | 2026-06-22T13:28:32.008Z

The only `new Function` is the pre-existing charset-whitelisted `safeNumEval` (line 2598). No `eval(` remains. Now let me verify the operator-match regex behavior carefully and trace the test cases. Let me confirm the test file context and check the engine's singleton export.

### Assistant | 2026-06-22T13:28:33.439Z

[tool_use: Grep]

### Assistant | 2026-06-22T13:28:34.384Z

[tool_use: Read]

### User | 2026-06-22T13:28:35.410Z

[tool_result] 1	/**
2	 * OkumaParametricProgramEngine — MS0-U3 additions (wafer-insert + top-hat).
3	 *
4	 * Covers the new MACRO-PROGRAM-PIPELINE-MS0/MS0-U3 deliverables:
5	 *   - generateWaferInsert (BASE WAFER INSERT MACRO O1001)
6	 *   - generateTopHatCasing (BASIC TOP HAT CASING WITH SINGLE COUNTERBORE)
7	 *   - getWaferInsertDefaults / getTopHatCasingDefaults
8	 *
9	 * SAFETY-CRITICAL invariants asserted 
... [+1145 chars truncated]

### User | 2026-06-22T13:28:35.474Z

[tool_result] 470:class OkumaParametricProgramEngineImpl {
4026:export const okumaParametricProgramEngine = new OkumaParametricProgramEngineImpl();

### Assistant | 2026-06-22T13:28:48.644Z

Now I have everything I need. Let me trace each verification point carefully.

**Trace `V80 LT 0.05`** (V80=some value): normalize ` LT ` → ` < ` giving `V80 < 0.05`. Regex `/(<=|>=|==|!=|<|>)/` matches `<` (alternation is leftmost-match in the string, and at position of `<` only `<` can match since `<=` requires a following `=`). `cut = indexOf("<")`. lhs = `evalExpr("V80 ")` → resolves V80. rhs = `evalExpr(" 0.05")` → 0.05. Correct.

**Trace `V1 EQ 0`**: ` EQ ` → ` == `, giving `V1 == 0`. Regex matches `==` (the alternation tries `<=`,`>=`,`==` in order; `==` matches before `<`/`>`). `op="=="`, lhs=V1, rhs=0, uses `===`. Correct.

**Trace `V1 GT 0`**: ` GT ` → ` > `, matches `>`, correct.

**Trace `V1 GE -5`**: ` GE ` → ` >= `, gives `V1 >= -5`. Regex: at the `>` position, `>=` is tried before `>` in alternation and matches. `op=">="`, `cut=indexOf(">=")`. rhs = `evalExpr(" -5")` → safeNumEval allows `-` → -5. Correct.

Now the critical regex-ordering concern: for `V1 <= 5`, does `.match(/(<=|>=|==|!=|<|>)/)` correctly pick `<=` not `<`? Regex alternation is ordered, and at the same start position the engine tries `<=` first — but JS regex `.match` finds the leftmost *position* first, then at that position tries alternatives in order. The `<` of `<=` is the leftmost matching char; at that position `<=` is tried first and succeeds. So `<=` wins. Correct. The `indexOf(op)` then splits on the 2-char operator. Good.

Let me verify one edge: the operator extraction uses `e.indexOf(op)` — if a comparison operator character could appear earlier in the LHS expression. Okuma expressions use `[ ]`, `V##`, arithmetic `+-*/`, functions. No `<>=!` chars appear except from the normalized comparison. So `indexOf` finds the real operator. Confirmed safe.

Let me verify the build/tsc claim and that tests pass, to make the PASS auditable.

### Assistant | 2026-06-22T13:28:49.712Z

[tool_use: Bash]

### User | 2026-06-22T13:29:00.454Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
 RUN  v4.1.5 H:/PRISM/mcp-server
 ✓ src/__tests__/OkumaParametricProgramEngine.test.ts (36 tests) 184ms
 Test Files  1 passed (1)
      Tests  36 passed (36)
   Start at  08:28:56
   Duration  447ms (transform 188ms, setup 0ms, import 83ms, tests 184ms, environment 0ms)
stderr | src/__tests__/OkumaParametricProgramEngine.t
... [+1242 chars truncated]

### Assistant | 2026-06-22T13:29:14.722Z

36/36 pass, matching the commit claim. Now let me verify the SECURITY test is a genuine oracle — that it would have FAILED against pre-fix code. Let me confirm the old code did `Boolean(eval(e))` and that the injected assignment in the test would execute pre-fix.

Pre-fix code (from diff):
```js
e = e.replace(/V(\d+)/gi, (_, n) => String(variables[parseInt(n)] ?? 0));
e = e.replace(/\[/g, "(").replace(/\]/g, ")");
try { return Boolean(eval(e)); } catch { return false; }
```

The malicious condition is `(globalThis.__OKUMA_INJ__ = 7) GT 0`. Pre-fix: ` GT ` → ` > `, V-subst (no V## inside), `[`→`(` (none here). Result: `(globalThis.__OKUMA_INJ__ = 7) > 0` → `eval` runs the assignment, sets sentinel to 7, returns `Boolean(7 > 0)` = true. So pre-fix `g.__OKUMA_INJ__` would be `7`, and the test asserts `toBeUndefined()` → **fails pre-fix**. Genuine oracle. Post-fix: no operator-side eval; `evalExpr("(globalThis.__OKUMA_INJ__ = 7) ")` → safeNumEval strips non-numeric chars → `( = 7)`-ish garbage → returns 0 (NaN guard) → lhs non-finite → false → falls through → `X9.` emitted. The test asserts both. Correct.

Let me verify the branch-behavior test against the IF/GOTO loop semantics — confirming `taken` (V1>0 true) skips `G0 X9.` and `fell` (V1=0) emits it.

In the `taken` case: V1=5, `IF [V1 GT 0] GOTO N100` → evalCondition true → `cur = labels[100]` (the `N100 G0 X1.` line). So `G0 X9.` is never reached → gcode contains `X1.` not `X9.`. Correct. In `fell`: V1=0 → false → `cur++` falls through → emits `G0 X9.`, then reaches `N100 G0 X1.` → emits `X1.`. Both present. Correct.

One subtlety to verify: in the `taken` case, when `cur` jumps to the `N100` label line, the loop strips the N-label and emits `X1.`. The substituteVars on `N100 G0 X1.` — does it emit `X1.`? The N-label stripping regex `^N\d+\s+(.+)$` → `G0 X1.` Correct. The test passing (36/36) confirms this empirically.

Let me do a final check for edge cases: compound/garbage conditions, infinite-loop guard, and no
... [+7 chars truncated]

### Assistant | 2026-06-22T13:29:15.778Z

[tool_use: Read]

### User | 2026-06-22T13:29:16.687Z

[tool_result] 2631	      let e = cond.trim();
2632	      const ops: Record<string, string> = { " LT ": " < ", " GT ": " > ", " EQ ": " == ", " NE ": " != ", " LE ": " <= ", " GE ": " >= " };
2633	      for (const [ok, py] of Object.entries(ops)) e = e.replace(new RegExp(ok.replace(/\s/g, "\\s"), "gi"), py);
2634	      const m = e.match(/(<=|>=|==|!=|<|>)/);
2635	      if (!m) {
2636	        // bare expression, 
... [+865 chars truncated]

### Assistant | 2026-06-22T13:29:41.545Z

Edge analysis complete:

- **Garbage/compound condition**: `evalCondition` does no `try/catch` itself, but `evalExpr` wraps `safeNumEval` in try/catch returning 0, and `safeNumEval` itself catches and returns 0. So no path throws out of `evalCondition`. Non-finite (NaN/Infinity) → `return false`. Fail-safe. A compound condition with two operators (e.g. `V1 GT 0 LT 5` → `V1 > 0 < 5`) matches the leftmost `>`, `lhs=evalExpr("V1 ")`, `rhs=evalExpr(" 0 < 5")` → safeNumEval strips `<` → `0  5` → `new Function("return (0  5)")` throws → caught → 0. Result is a defined boolean, no crash.
- **Infinite loop**: unchanged — the `maxIter = lines.length * 10` guard at line 2706/2708 bounds the flow loop; a backward GOTO can't hang. `evalCondition` is non-recursive and operator-free internally.
- **No throw out of convertToHardcode**: confirmed — all evaluator paths are catch-guarded.

One minor observation (P2, not a defect in this diff): a bare-expression LHS like `V1 GT V2` where V2 is undefined pushes an "Undefined variable" error but still resolves to 0 — pre-existing behavior, unchanged by this fix. Comment density and convention (closure-style helpers, inline comments) match the surrounding `evalExpr`/`safeNumEval` idiom. No physics constants involved. No dispatcher wiring changes (the engine was already wired; `convertToHardcode` is a public method, not a new action).

---

VERDICT: PASS

summary: The fix correctly eliminates the `eval()` code-injection vector in `OkumaParametricProgramEngine.evalCondition` by normalizing word-operators, splitting on a comparison operator, and evaluating each side through the pre-existing charset-whitelisted `safeNumEval` (via `evalExpr`). It is behavior-preserving for all valid numeric Okuma conditions, fail-safe (false) on malicious/non-numeric input, and never throws or loops. The 3 new tests give genuine coverage including a real security regression oracle. All 4 verification points confirmed; 36/36 tests pass.

findings:
- none

Audi
... [+2197 chars truncated]
