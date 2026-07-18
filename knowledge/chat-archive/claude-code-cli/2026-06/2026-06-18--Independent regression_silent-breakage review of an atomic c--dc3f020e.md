---
type: "chat-session"
source: "claude-code-cli"
session_id: "dc3f020e-9a94-4310-adf2-a60d9533cfec"
title: "Independent regression/silent-breakage review of an atomic change (PRISM SIERRA-"
date: "2026-06-18"
first_ts: "2026-06-18T09:20:17.023Z"
last_ts: "2026-06-18T09:23:15.214Z"
cwd: "H:\\prism-slot-sierra"
messages: 48
user_msgs: 19
assistant_msgs: 29
raw_file: "H:/.claude/projects/H--prism-slot-sierra/dc3f020e-9a94-4310-adf2-a60d9533cfec/subagents/agent-aba3b82fc000ba7d7.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:11"
---

# Independent regression/silent-breakage review of an atomic change (PRISM SIERRA-

> **claude-code-cli** | 2026-06-18 | 48 msgs (19 user / 29 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/dc3f020e-9a94-4310-adf2-a60d9533cfec/subagents/agent-aba3b82fc000ba7d7.jsonl`

## Transcript

### User | 2026-06-18T09:20:17.023Z

Independent regression/silent-breakage review of an atomic change (PRISM SIERRA-VAULT-OPS/U-VAULT-NLI-BUDGET). Read each file END-TO-END:

1. H:/prism/scripts/lint-wiki-contradictions.mjs  (the shared NLI lint engine `runNliLint` — focus the new wall-clock-budget block)
2. H:/prism/scripts/lint-memory-contradictions.mjs (consumer: resolveBudgetMs + plumbing)
3. H:/prism/scripts/__tests__/lint-wiki-contradictions.test.mjs (4 new budget tests)
4. H:/prism/scripts/lint-memory-contradictions.test.mjs (2 new resolveBudgetMs tests)

CONTRACT TO VERIFY:
- `runNliLint` gains `budgetMs` (default 0 = unbounded, byte-identical legacy), `minCallTimeoutMs` (floor), `nowFn` (injectable clock). When budgetMs>0: the loop STOPS STARTING new pairs once `nowFn()-startMs >= budgetMs` (SOFT budget — the in-flight pair, incl its confirm resamples, completes), and the per-call timeout is shrunk to `max(minCallTimeoutMs, min(timeoutMs, budgetMs - elapsed))`. On break it emits `budgetExceeded:true`, `totals.budgetMs`, `totals.notAttempted` (= pairs.length - checked - unchecked), `budgetReason`. Motivation: a full ~18min run is harness-killed at ~100s BEFORE its end-of-run write, producing NO report; the budget lets an interactive run write a PARTIAL honest report and exit.
- Default budgetMs=0 must be byte-identical to the prior shape (no budget fields, callTimeout==timeoutMs). Bravo's shared wiki lint calls runNliLint WITHOUT budgetMs — confirm unaffected.
- This composes with the existing `confirmSamples` (majority-confirm) AND the circuit breaker — verify all three coexist correctly.
- Live-validated already: a `--budget-ms 70000` run checked 16/150 pairs, wrote `budgetExceeded:true notAttempted:134`, exited at 74s; vault-health went WARN->OK.

VERIFY SPECIFICALLY (cite file:line):
- The budget is SOFT correctly: a pair that passes the loop-top check completes its primary + confirm calls even if that overshoots budgetMs. Bounded overshoot? The callTimeout floor (minCallTimeoutMs) means a
... [+1292 chars truncated]

### Assistant | 2026-06-18T09:20:20.127Z

I'll review this atomic change end-to-end, focusing on the budget-block contract. Let me read all four files.

### Assistant | 2026-06-18T09:20:20.920Z

[tool_use: Read]

### Assistant | 2026-06-18T09:20:21.421Z

[tool_use: Read]

### User | 2026-06-18T09:20:21.748Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * lint-wiki-contradictions.mjs  (OLLAMA-SYNERGY / U-WIKI-NLI-LINT)
4	 *
5	 * Advisory pairwise natural-language-inference (NLI) lint over CURATED wiki
6	 * entries: finds page PAIRS whose core claims CONTRADICT each other, using a
7	 * local Ollama model (gpt-oss:20b by default) for the NLI judgment. Nothing
8	 * else in PRISM catches "lesson A says X, lesson B says 
... [+22835 chars truncated]

### Assistant | 2026-06-18T09:20:22.150Z

[tool_use: Read]

### Assistant | 2026-06-18T09:20:22.204Z

[tool_use: Read]

### User | 2026-06-18T09:20:22.364Z

[tool_result] 1	#!/usr/bin/env node
2	// SIERRA-VAULT-OPS/U-VAULT-CONTRADICT-MEMORY -- memory-vault contradiction lint (slot:sierra, 2026-06-17).
3	//
4	// Extends the proven wiki NLI contradiction-linter (lint-wiki-contradictions.mjs,
5	// OLLAMA-SYNERGY/U-WIKI-NLI-LINT) to the MEMORY vault -- the assessment's named #2
6	// 2nd-brain gap ("no dedicated contradiction-detector" for memories). REUSES that
7	// to
... [+13770 chars truncated]

### User | 2026-06-18T09:20:23.111Z

[tool_result] 1	// Tests for scripts/lint-wiki-contradictions.mjs (OLLAMA-SYNERGY / U-WIKI-NLI-LINT).
2	// Hermetic: every LLM/network dependency is injected (callImpl / fetchModelsFn).
3	import { test } from "node:test";
4	import assert from "node:assert/strict";
5	import {
6	  tokenizeForTopic,
7	  parsePage,
8	  selectClaim,
9	  candidatePairs,
10	  buildNliPrompt,
11	  parseNliVerdict,
12	  runNliLint,
13	 
... [+19900 chars truncated]

### User | 2026-06-18T09:20:23.198Z

[tool_result] 1	// Tests for lint-memory-contradictions.mjs (SIERRA-VAULT-OPS/U-VAULT-CONTRADICT-MEMORY).
2	// node --test scripts/lint-memory-contradictions.test.mjs
3	//
4	// Hermetic: fs is injected (no real vault) and the NLI call is injected (no Ollama/GPU).
5	// Verifies the NEW memory loader (parse + the superseded/pointer exclusions) and that it
6	// feeds the REUSED wiki NLI engine (runNliLint) correct
... [+9150 chars truncated]

### Assistant | 2026-06-18T09:20:28.028Z

I've read all four files end-to-end. Now let me trace the contract claims adversarially, starting with the consumer (vault-health) to verify the coverage-honesty claim, and confirming bravo's shared wiki lint truly passes no budgetMs.

### Assistant | 2026-06-18T09:20:29.468Z

[tool_use: Grep]

### User | 2026-06-18T09:20:30.581Z

[tool_result] No matches found

### Assistant | 2026-06-18T09:20:30.606Z

[tool_use: Grep]

### User | 2026-06-18T09:20:31.591Z

[tool_result] scripts\cimco-post-proof.mjs:182:    let pairsChecked = 0;
scripts\cimco-post-proof.mjs:186:      if (pairsChecked >= maxDriftPairs) break;
scripts\cimco-post-proof.mjs:217:        pairsChecked++;

### Assistant | 2026-06-18T09:20:34.586Z

The first Grep returned no matches, which is suspicious — it should at least match the two lint files themselves. The glob with brace expansion may have failed. Let me retry and also find the vault-health consumer and any bravo shared wiki-lint caller.

### Assistant | 2026-06-18T09:20:35.440Z

[tool_use: Grep]

### Assistant | 2026-06-18T09:20:35.918Z

[tool_use: Grep]

### Assistant | 2026-06-18T09:20:36.473Z

[tool_use: Grep]

### User | 2026-06-18T09:20:38.331Z

[tool_result] No matches found

### User | 2026-06-18T09:20:38.400Z

[tool_result] No files found

### User | 2026-06-18T09:20:38.754Z

[tool_result] No files found

### Assistant | 2026-06-18T09:20:42.241Z

The Grep tool is returning "No files found" even for `lint-wiki-contradictions` which definitely exists (I just read it, and it's imported by the memory lint). The Grep tool appears to be malfunctioning or scoped oddly. Let me verify with Glob and use Bash git grep as a fallback.

### Assistant | 2026-06-18T09:20:42.729Z

[tool_use: Glob]

### User | 2026-06-18T09:20:43.814Z

[tool_result] No files found

### Assistant | 2026-06-18T09:20:44.777Z

[tool_use: Bash]

### User | 2026-06-18T09:20:48.110Z

[tool_result] scripts/vault-health.mjs:16://   lint-memory-contradictions  -> memory-contradictions.json  (doctrine NLI conflicts)
scripts/vault-health.mjs:66:    key: "contradiction", file: "memory-contradictions.json", title: "doctrine contradictions",

### Assistant | 2026-06-18T09:20:52.951Z

git grep works (the Grep/Glob tools seem to have a path-resolution issue in this worktree, likely the `H:` drive casing). The consumer is `scripts/vault-health.mjs`. Let me read it to verify the coverage-honesty claim (that vault-health derives coverage from pairsChecked, not the report's `coverage` field), and check the bravo shared wiki-lint caller and any cron/scheduled invocation of the wiki lint.

### Assistant | 2026-06-18T09:20:53.397Z

[tool_use: Read]

### User | 2026-06-18T09:20:54.594Z

[tool_result] 1	#!/usr/bin/env node
2	// SIERRA-VAULT-OPS/U-VAULT-HEALTH (slot:sierra, 2026-06-17) -- unified vault-health dashboard.
3	//
4	// A 2nd-brain needs ONE health surface, not five scattered advisory reports. This
5	// AGGREGATES the four vault advisory detectors built across the SIERRA-VAULT-OPS
6	// arc into a single operator-facing rollup (per-detector headline + freshness +
7	// an overall status)
... [+12350 chars truncated]

### Assistant | 2026-06-18T09:20:55.955Z

[tool_use: Bash]

### User | 2026-06-18T09:20:59.800Z

[tool_result] scripts/__tests__/lint-wiki-contradictions.test.mjs
scripts/lint-memory-contradictions.mjs
scripts/lint-memory-contradictions.test.mjs
scripts/lint-wiki-contradictions.mjs
scripts/vault-health.mjs
---SHARED-WIKI-LINT-CALLERS---
scripts/lint-memory-contradictions.mjs:25:// state/shared/memory-contradictions.json.
scripts/lint-memory-contradictions.mjs:27:// CLI (the report at state/shared/memory-co
... [+404 chars truncated]

### Assistant | 2026-06-18T09:21:04.563Z

I now have the full consumer picture. The only callers of `runNliLint` are the wiki lint's own `main()` (line 424, no budgetMs) and the memory lint's `main()` (line 200, passes budgetMs). The only consumer of the report is `vault-health.mjs`. Let me verify the "bravo's shared wiki lint" claim by checking how the wiki lint is invoked (cron/scheduled task), and confirm no other code path passes budgetMs to the wiki lint.

### Assistant | 2026-06-18T09:21:06.391Z

[tool_use: Bash]

### User | 2026-06-18T09:21:10.387Z

[tool_result] ===scheduled/cron invocations of the wiki lint===
mcp-server/data/state/session-file-ownership.json:527:    "scripts/lint-wiki-contradictions.mjs": {
mcp-server/data/state/session-file-ownership.json:531:    "scripts/lint-memory-contradictions.mjs": {
mcp-server/data/state/session-file-ownership.json:535:    "scripts/__tests__/lint-wiki-contradictions.test.mjs": {
mcp-server/data/state/session-fil
... [+1226 chars truncated]

### Assistant | 2026-06-18T09:21:31.153Z

Confirmed the key facts. The wiki lint is invoked by the night-batch registry at `state/shared/ollama-night-batch-registry.json:64` as `["node", "scripts/lint-wiki-contradictions.mjs", "--limit", "30"]` — **no `--budget-ms`**, and the wiki lint's `main()` doesn't even parse `--budget-ms` (it's only in the memory lint). The wiki `runNliLint` call at line 424 passes only `{model, limit}`, so `budgetMs=0` for the cron path. Back-compat is preserved.

Now let me adversarially trace each contract claim against the code.

**1. SOFT budget + bounded overshoot.** Lines 304–315: the loop-top check `if (budgetMs > 0 && nowFn() - startMs >= budgetMs) break` fires *before* a pair starts. A pair that passes runs its primary (line 315) + `confirmSamples` confirm calls (lines 340–346), all using `callTimeout`. The overshoot bound: `callTimeout = max(minCallTimeoutMs, min(timeoutMs, budgetMs - elapsed))`. When `budgetMs - elapsed` is small/negative, the floor `minCallTimeoutMs` (20s) wins. So a single primary can run up to `minCallTimeoutMs` past budget. But **confirm calls multiply this**: with `confirmSamples=2`, the worst case is primary + 2 confirms, each capped at `callTimeout`. Since `callTimeout` is computed *once* before the primary (line 310) and reused for all confirms (line 342), the confirm calls do **not** recompute against a now-more-elapsed clock — they reuse the same `callTimeout`. So overshoot ≈ `(1 + confirmSamples) × callTimeout` worst case, not `1 × floor`. Let me verify the documentation's claim of "bounds budget overshoot to ~this [floor]".

Line 63 says `MIN_CALL_TIMEOUT_MS` "bounds budget overshoot to ~this". Lines 307–312 comment says "a single full-timeout call cannot overshoot the budget by more than the floor." But confirm resampling means up to `(1+confirmSamples)` calls each at `callTimeout`. With the memory lint's default `confirmSamples=2`, that is up to **3 × 20s = 60s** of overshoot past budget in the pathological all-slow-confirm case, not 20s. Le
... [+586 chars truncated]

### Assistant | 2026-06-18T09:21:32.552Z

[tool_use: Bash]

### User | 2026-06-18T09:21:35.995Z

[tool_result]   ...
# Subtest: resolveConfirmSamples: custom default honored
ok 47 - resolveConfirmSamples: custom default honored
  ---
  duration_ms: 0.039
  ...
# Subtest: resolveBudgetMs: unset/empty/garbage/negative -> default 0 (unbounded cron run)
ok 48 - resolveBudgetMs: unset/empty/garbage/negative -> default 0 (unbounded cron run)
  ---
  duration_ms: 0.0473
  ...
# Subtest: resolveBudgetMs: valid ms 
... [+272 chars truncated]

### Assistant | 2026-06-18T09:21:59.358Z

All 49 tests pass. Now let me adversarially trace the remaining contract claims by examining the exact arithmetic.

**2. `notAttempted` math (lines 373).** `notAttempted = pairs.length - checked - unchecked`. Is it always ≥1 when budgetExceeded? The break at line 304 fires inside the `for...of pairs` loop, *before* processing a pair. The break can only execute if the loop is still iterating, i.e. there's a current pair `{i,j,shared}` that has NOT yet incremented `checked` or `unchecked`. So at least that one pair (and any after it) is unprocessed → `notAttempted ≥ 1`. 

But wait — adversarial edge: what if the budget check fires on the **first** iteration (elapsed already ≥ budgetMs at t=startMs)? That requires `nowFn()-startMs >= budgetMs` immediately. With `budgetMs>0` and a clock that hasn't advanced, `0 >= budgetMs` is false (budgetMs>0), so it won't fire on iteration 1 unless the injected clock is already past budget. In that degenerate case `checked=0, unchecked=0, notAttempted = pairs.length ≥ 1` (if pairs is non-empty). If `pairs.length===0` the loop never iterates, break never fires, `budgetExceeded` stays false → no `notAttempted` field. **No negative path.** The math is sound: `checked + unchecked` only ever counts fully-processed pairs, and break leaves ≥1 unprocessed. Correct.

**3. Dynamic callTimeout bounds (lines 310–312).** `Math.max(minCallTimeoutMs, Math.min(timeoutMs, budgetMs - elapsed))`. Trace:
- `budgetMs - elapsed` can go negative (if a confirm-heavy prior pair overshot, the next loop-top check would break first — but the *first* pair after budget consumption: line 304 breaks when `elapsed >= budgetMs`, so any pair that passes line 304 has `elapsed < budgetMs`, hence `budgetMs - elapsed > 0`). So inside the body, `budgetMs - elapsed` is strictly positive.
- `Math.min(timeoutMs, positive)` ≤ timeoutMs. Good — never exceeds full timeout.
- `Math.max(minCallTimeoutMs, ...)` ≥ floor. So callTimeout ∈ [minCallTimeoutMs, timeoutMs] when `budgetMs 
... [+2207 chars truncated]

### Assistant | 2026-06-18T09:22:04.360Z

[tool_use: Bash]

### User | 2026-06-18T09:22:07.908Z

[tool_result] node:internal/modules/run_main:122
    triggerUncaughtException(
    ^

Error [ERR_MODULE_NOT_FOUND]: Cannot find module 'C:\Users\wompu\AppData\Local\Temp\scripts\lint-wiki-contradictions.mjs' imported from C:\Users\wompu\AppData\Local\Temp\shape-check.mjs
Did you mean to import "../../../../../../H:/prism/scripts/lint-wiki-contradictions.mjs"?
    at finalizeResolution (node:internal/modul
... [+677 chars truncated]

### Assistant | 2026-06-18T09:22:10.197Z

The temp file resolves relative to /tmp. Let me write it into the prism scripts dir with an absolute import.

### Assistant | 2026-06-18T09:22:19.031Z

[tool_use: Bash]

### User | 2026-06-18T09:22:22.371Z

[tool_result] LEGACY KEYS: ["schemaVersion","model","totals","contradictions"]
LEGACY totals KEYS: ["pages","pairsConsidered","pairsChecked","unchecked","contradictions"]
EQUAL legacy === budgetMs:0,confirm:0 ? true
CONFIRM+BUDGET: checked= 1 unchecked= 0 notAttempted= 5 budgetExceeded= true considered= 6
notAttempted == considered-checked-unchecked ? true
notAttempted >= 1 ? true

### Assistant | 2026-06-18T09:22:29.054Z

Empirically confirmed:
- **Byte-identical legacy shape**: `budgetMs=0, confirmSamples=0` produces a report `JSON.stringify`-equal to a call with neither option. Back-compat is exact.
- **notAttempted math under confirm+budget**: A confirm-heavy pair (primary + 2 confirms, each advancing the clock 30s = 90s for one pair against a 5000ms budget) checked exactly 1 pair, then the budget break left `notAttempted=5`, always `>= 1`, and the math `considered - checked - unchecked` holds.

Now let me verify the overshoot-bound honesty point concretely: with `confirmSamples=2` and slow confirms, how far past the budget does one pair run? In the test above, one pair consumed 90000ms against a 5000ms budget. Let me quantify the timeout each call was allowed, to confirm the "bounded to ~floor" comment is understated when confirms are in play.

### Assistant | 2026-06-18T09:22:35.078Z

[tool_use: Bash]

### User | 2026-06-18T09:22:38.422Z

[tool_result] timeouts granted to the ONE in-flight pair (primary+2 confirms): [20000,20000,20000]
total wall-clock consumed PAST a 1000ms budget by that single pair: 60000 ms
doc claims overshoot bounded to ~floor(20000ms); actual worst-case overshoot: 59000 ms

### Assistant | 2026-06-18T09:23:15.214Z

Confirmed the overshoot-bound documentation gap empirically. With the memory lint's **default `confirmSamples=2`**, a single in-flight CONTRADICT pair near budget-end can run primary + 2 confirms, each granted the full `minCallTimeoutMs` floor (20000ms), so the worst-case overshoot is **~60000ms (3×floor), not ~20000ms** as the comments at lines 63 and 307–312 claim.

This is a documentation/honesty inaccuracy, not a correctness bug — the budget is still bounded (it cannot blow to the full 90s×N), and the *practical* effect on the live interactive run is benign because:
- The motivation is the ~100s harness kill. A 75s budget + up to 60s overshoot = up to 135s, which would **exceed** the ~100s harness kill window in the pathological case. But this only triggers if (a) the last-started pair is a CONTRADICT primary AND (b) all confirm calls run to the full 20s floor (i.e., Ollama is timing out, which would more likely trip `ok:false` paths quickly in practice, not hang to the floor). The live validation (16/150 pairs, exited 74s) didn't hit it.

Still, the comment "bounds budget overshoot to ~this [floor]" is materially wrong when `confirmSamples>0` (the default), and the precise overshoot bound is `(1+confirmSamples)×minCallTimeoutMs`. That's worth flagging so a future tuner who sets `--budget-ms 95000` doesn't get harness-killed by a 60s overshoot.

Let me confirm one last thing: the test at line 340–351 only exercises `confirmSamples=0` (default) for the timeout-shrink test, so it does **not** cover the confirm-call timeout reuse. Let me verify the budget tests' coverage of the confirm interaction.

Looking at the 4 budget tests (lines 309–351):
- Test 1 (309): `CONSISTENT` verdicts, no confirms → checked=3, notAttempted=3. Real deterministic clock injection, asserts exact values. **Would fail if break logic wrong.**
- Test 2 (321): budget large → completes, no budgetExceeded. **Would fail if break fired wrongly.**
- Test 3 (331): budgetMs=0 → no fields. **Guards b
... [+4848 chars truncated]
