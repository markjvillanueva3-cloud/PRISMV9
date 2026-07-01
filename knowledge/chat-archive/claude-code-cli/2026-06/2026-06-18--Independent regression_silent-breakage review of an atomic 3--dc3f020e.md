---
type: "chat-session"
source: "claude-code-cli"
session_id: "dc3f020e-9a94-4310-adf2-a60d9533cfec"
title: "Independent regression/silent-breakage review of an atomic 3-file change (PRISM "
date: "2026-06-18"
first_ts: "2026-06-18T08:47:07.761Z"
last_ts: "2026-06-18T08:48:22.775Z"
cwd: "H:\\prism-slot-sierra"
messages: 22
user_msgs: 9
assistant_msgs: 13
raw_file: "H:/.claude/projects/H--prism-slot-sierra/dc3f020e-9a94-4310-adf2-a60d9533cfec/subagents/agent-a60971b24d5c216a6.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:11"
---

# Independent regression/silent-breakage review of an atomic 3-file change (PRISM 

> **claude-code-cli** | 2026-06-18 | 22 msgs (9 user / 13 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/dc3f020e-9a94-4310-adf2-a60d9533cfec/subagents/agent-a60971b24d5c216a6.jsonl`

## Transcript

### User | 2026-06-18T08:47:07.761Z

Independent regression/silent-breakage review of an atomic 3-file change (PRISM SIERRA-VAULT-OPS/U-VAULT-NLI-VOTE). Read each file END-TO-END:

1. H:/prism/scripts/lint-wiki-contradictions.mjs  (the shared NLI lint engine — `runNliLint`)
2. H:/prism/scripts/lint-memory-contradictions.mjs (consumer that passes the new option)
3. H:/prism/scripts/__tests__/lint-wiki-contradictions.test.mjs (6 new vote tests)

WHAT THE CHANGE DOES (the contract to verify):
- Adds `confirmSamples` (default 0) to `runNliLint`. gpt-oss:20b is a SAMPLING model; for borderline pairs it intermittently emits CONTRADICT vs CONSISTENT, producing flaky false-positive contradictions. When `confirmSamples>0`, a CONTRADICT *primary* verdict is re-sampled `confirmSamples` more times and recorded ONLY if a STRICT MAJORITY of the (1+confirmSamples) total votes agree. Confirm fires ONLY on a contradict primary (cost asymmetry: a missed contradiction is cheap; a spurious WARN drives an operator memo-decision).
- `lint-memory-contradictions.mjs` passes `confirmSamples` (default 2 => 2-of-3; env PRISM_NLI_CONFIRM_SAMPLES; CLI `--confirm N`).
- Attaches `votes:{contradict,total}` per finding + `totals.confirmSamples`/`totals.confirmCalls` ONLY when confirmSamples>0 (back-compat: default 0 must be byte-identical to the prior output shape — the shared wiki lint that bravo consumes must be unaffected).

VERIFY SPECIFICALLY (cite file:line):
- confirmSamples=0 path is truly byte-identical (no `votes` field, no new totals keys, confirmRequired==1, confirm loop skipped). Bravo's wiki lint calls `runNliLint` WITHOUT this option — confirm it is unchanged.
- Strict-majority math: confirmRequired = floor((1+confirmSamples)/2)+1. Check it for confirmSamples 0,1,2 (expect 1, 2, 2). Is an EVEN total handled correctly (1-of-2 must NOT record)?
- A failed/empty confirm call: is it a conservative non-contradict vote? Does it correctly NOT feed the circuit-breaker `consecutive` counter, NOT increment `unchecked`, and still
... [+599 chars truncated]

### Assistant | 2026-06-18T08:47:10.967Z

I'll review this atomic 3-file change end-to-end. Let me start by reading all three files.

### Assistant | 2026-06-18T08:47:11.457Z

[tool_use: Read]

### Assistant | 2026-06-18T08:47:11.915Z

[tool_use: Read]

### Assistant | 2026-06-18T08:47:12.227Z

[tool_use: Read]

### User | 2026-06-18T08:47:12.313Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * lint-wiki-contradictions.mjs  (OLLAMA-SYNERGY / U-WIKI-NLI-LINT)
4	 *
5	 * Advisory pairwise natural-language-inference (NLI) lint over CURATED wiki
6	 * entries: finds page PAIRS whose core claims CONTRADICT each other, using a
7	 * local Ollama model (gpt-oss:20b by default) for the NLI judgment. Nothing
8	 * else in PRISM catches "lesson A says X, lesson B says 
... [+20051 chars truncated]

### User | 2026-06-18T08:47:12.875Z

[tool_result] 1	#!/usr/bin/env node
2	// SIERRA-VAULT-OPS/U-VAULT-CONTRADICT-MEMORY -- memory-vault contradiction lint (slot:sierra, 2026-06-17).
3	//
4	// Extends the proven wiki NLI contradiction-linter (lint-wiki-contradictions.mjs,
5	// OLLAMA-SYNERGY/U-WIKI-NLI-LINT) to the MEMORY vault -- the assessment's named #2
6	// 2nd-brain gap ("no dedicated contradiction-detector" for memories). REUSES that
7	// to
... [+11504 chars truncated]

### User | 2026-06-18T08:47:13.122Z

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
... [+16444 chars truncated]

### Assistant | 2026-06-18T08:47:16.324Z

I have all three files. Now let me verify the critical claims carefully, then trace the consumers to confirm nothing silently breaks. Let me first verify the helper imports the memory consumer depends on, and check who calls `runNliLint` so I can trace the back-compat blast radius.

### Assistant | 2026-06-18T08:47:17.269Z

[tool_use: Grep]

### Assistant | 2026-06-18T08:47:18.747Z

[tool_use: Grep]

### User | 2026-06-18T08:47:20.163Z

[tool_result] 209:export function isSupersededMemory(body) {
210-  if (typeof body !== "string" || body.length === 0) return false;
211-  return SUPERSEDED_DECL_RE.test(body);
212-}
213-
214-// Default-ON exclusion; PRISM_MEMORY_INDEX_KEEP_SUPERSEDED=1 retains superseded
215-// memories in the recall corpus (reversible escape hatch — never deletes a file,
216-// just stops the recall skip). Per [[feedback_never
... [+921 chars truncated]

### User | 2026-06-18T08:47:21.998Z

[tool_result] H:\prism\knowledge\memories\reference\reference_sierra_vault_health_reasongate_2026_06_18.md:19:returns `verdict:"contradict"` with `reason:""`. `runNliLint` counts ANY contradict verdict, so an
H:\prism\knowledge\memories\reference\reference_sierra_vault_health_reasongate_2026_06_18.md:36:the shared `lint-wiki-contradictions.mjs` runNliLint -- avoids a blast radius to bravo's wiki lint while
H:\p
... [+6394 chars truncated]

### Assistant | 2026-06-18T08:47:25.063Z

The only two non-test consumers of `runNliLint` are the wiki CLI (line 386, no `confirmSamples`) and the memory CLI (line 174, passes it). There's also a separate memory test file `lint-memory-contradictions.test.mjs`. Let me read that test file to confirm the integration tests aren't broken by the change, and verify the exact `isSupersededMemory`/`isNodePointerStub` signatures the consumer uses.

### Assistant | 2026-06-18T08:47:26.000Z

[tool_use: Read]

### Assistant | 2026-06-18T08:47:26.511Z

[tool_use: Read]

### User | 2026-06-18T08:47:26.831Z

[tool_result] 1	// Tests for lint-memory-contradictions.mjs (SIERRA-VAULT-OPS/U-VAULT-CONTRADICT-MEMORY).
2	// node --test scripts/lint-memory-contradictions.test.mjs
3	//
4	// Hermetic: fs is injected (no real vault) and the NLI call is injected (no Ollama/GPU).
5	// Verifies the NEW memory loader (parse + the superseded/pointer exclusions) and that it
6	// feeds the REUSED wiki NLI engine (runNliLint) correct
... [+6640 chars truncated]

### User | 2026-06-18T08:47:27.458Z

[tool_result] 220	
221	// MEMORY-RECALL-NODE-POINTER-EXCLUDE (2026-06-09 slot:alpha): the `reference`
222	// namespace is 72% auto-generated `node_*`/`node-*` POINTER STUBS (9,571 of
223	// 13,229 corpus files) — thin "Node-indexed pointer — X → wiki <path>" records,
224	// NOT substantive memos. They dilute BM25 precision (real memos rank lower), and
225	// in the live-scan fallback they cost 9,571 needless st
... [+700 chars truncated]

### Assistant | 2026-06-18T08:47:56.956Z

I now have everything needed. Let me work through each verification point precisely against the code.

**1. confirmSamples=0 byte-identical back-compat (lines 277-279, 309-321, 335-338):**
- `confirmTotal = 1 + Math.max(0, 0) = 1`; `confirmRequired = Math.floor(1/2)+1 = 0+1 = 1`. Correct.
- Confirm loop `for (let s = 0; s < confirmSamples; s++)` → `s < 0` is false, loop never runs. `confirmCalls` stays 0. Correct.
- `contradictVotes = 1`, `1 >= 1` → records. `if (confirmSamples > 0)` is false → no `votes` field added (line 319). Correct.
- Lines 335-338: `if (confirmSamples > 0)` false → no `confirmSamples`/`confirmCalls` totals keys. Correct.
- The `totals` object (lines 326-332) is constructed with the exact prior key set; the new keys are only conditionally appended. **Byte-identical output shape confirmed for confirmSamples=0.** Test at line 281-287 asserts `"votes" in ...` false, `"confirmSamples" in totals` false, `"confirmCalls" in totals` false.

**Bravo's wiki lint (line 386):** `runNliLint(pages, { model: resolved.model, limit })` — no `confirmSamples`, defaults to 0. Unaffected. Confirmed.

**2. Strict-majority math:** `confirmRequired = floor((1+confirmSamples)/2)+1`:
- confirmSamples=0: floor(1/2)+1 = 1 ✓
- confirmSamples=1: floor(2/2)+1 = 2 ✓ (even total=2, needs both — 1-of-2 must NOT record)
- confirmSamples=2: floor(3/2)+1 = 2 ✓ (2-of-3)
Even-total handling: confirmSamples=1, total=2, required=2 → a 1/1 split drops. Test at lines 289-296 verifies exactly this (`[C,C]`→records votes{2,2}; `[C,K]`→0 contradictions). Correct, and this is the conservative direction (an even split does NOT record a contradiction, matching the cost-asymmetry intent).

**3. Failed/empty confirm call (lines 310-316):** `try/catch` sets `cr = null`; `confirmCalls++` always runs; the vote only increments if `cr && cr.ok && cr.text && verdict === "contradict"`. A failed confirm is a conservative non-contradict vote. It does NOT touch `consecutive`, does NOT touch `unchecked`, 
... [+3403 chars truncated]

### Assistant | 2026-06-18T08:47:57.931Z

[tool_use: Read]

### User | 2026-06-18T08:47:58.806Z

[tool_result] 298	    consecutive = 0;
299	    checked++;
300	    const { verdict, reason } = parseNliVerdict(r.text);
301	    if (verdict !== "contradict") continue;
302	    // CONTRADICT primary -> confirm-resample to a strict majority (stochastic
303	    // stabilization; see the STOCHASTIC-VERDICT note). confirmSamples == 0 skips the
304	    // loop and confirmRequired == 1, so a single CONTRADICT records e
... [+962 chars truncated]

### Assistant | 2026-06-18T08:48:22.775Z

Confirmed. The confirm loop (lines 309-316) never writes `consecutive`, `unchecked`, or `aborted`. The only state it touches is `contradictVotes` (loop-local) and `confirmCalls`. After the loop, the next pair's primary call re-enters at line 285 and the breaker logic at 289-298 operates on the fresh primary result. The breaker isolation claim holds. No path in the confirm loop can throw (call wrapped in try/catch → null; `parseNliVerdict` null-safe).

One final adversarial check: the prompt notes a missed contradiction is "cheap" because the next run catches it. But consider — if the **primary** verdict is contradict and the confirm loop drops it (e.g. 1/3), the pair is counted `checked` but produces no finding and no `unchecked`. That's intentional and correct (it WAS examined). There is no count corruption: `checked` + `unchecked` + (breaker-aborted remainder) accounting is unchanged on the primary axis. The `confirmCalls` counter is purely informational and only surfaces when `confirmSamples>0`.

I've traced every consumer and edge path. Here is my verdict.

---

VERDICT: PASS

summary: The `confirmSamples` addition is correctly back-compatible — at the default 0 the output shape is byte-identical (no `votes`, no new totals keys, `confirmRequired==1`, confirm loop skipped), so bravo's wiki lint at `lint-wiki-contradictions.mjs:386` (which omits the option) is provably unaffected. Strict-majority math, even-total handling, conservative-drop-on-confirm-failure, circuit-breaker isolation, and the consumer's NaN/negative/float guard all check out, and the 6 new tests are real exact-count record-or-drop assertions that fail if the majority logic is wrong.

findings: none

Consumers / edge-paths traced (audit trail):
- **Back-compat blast radius:** Grepped all `runNliLint` call sites. Only two non-test consumers exist — `lint-wiki-contradictions.mjs:386` (bravo's wiki lint, no `confirmSamples` → default 0 → unchanged) and `lint-memory-contradictions.mjs:174` (the new c
... [+2175 chars truncated]
