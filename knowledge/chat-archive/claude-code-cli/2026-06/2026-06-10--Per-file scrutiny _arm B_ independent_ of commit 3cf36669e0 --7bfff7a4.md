---
type: "chat-session"
source: "claude-code-cli"
session_id: "7bfff7a4-521b-41bc-9719-fe5a0f593d86"
title: "Per-file scrutiny (arm B, independent) of commit 3cf36669e0 in H:/prism — `git s"
date: "2026-06-10"
first_ts: "2026-06-10T00:11:37.064Z"
last_ts: "2026-06-10T00:15:51.549Z"
cwd: "H:\\prism"
messages: 41
user_msgs: 14
assistant_msgs: 27
raw_file: "H:/.claude/projects/H--prism/7bfff7a4-521b-41bc-9719-fe5a0f593d86/subagents/agent-a4657daf911c71eac.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:15"
---

# Per-file scrutiny (arm B, independent) of commit 3cf36669e0 in H:/prism — `git s

> **claude-code-cli** | 2026-06-10 | 41 msgs (14 user / 27 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/7bfff7a4-521b-41bc-9719-fe5a0f593d86/subagents/agent-a4657daf911c71eac.jsonl`

## Transcript

### User | 2026-06-10T00:11:37.064Z

Per-file scrutiny (arm B, independent) of commit 3cf36669e0 in H:/prism — `git show 3cf36669e0`. Do NOT assume arm A caught everything. The india transcript miner (scripts/mine-india-transcripts.mjs) gains an opt-in MCP overlay on `ollamaCall` (route via callViaMcp from ask-ollama.mjs with numCtx, fail-soft to direct). Test: scripts/__tests__/mine-india-transcripts-routing.test.mjs (6 tests).

Weight toward: import-safety, test integrity (mutation-style — would the tests fail on a real regression?), and hidden coupling. Verify:
1. IMPORT SAFETY: the miner now `import { callViaMcp, mcpRoutingEnabled } from "./ask-ollama.mjs"`. Confirm (a) no import cycle (ask-ollama must NOT import the miner), (b) importing ask-ollama doesn't run its CLI (it has an INVOKED_DIRECTLY main-guard), (c) importing the miner for the test doesn't run its `main()` (it has a `__isMain` guard). Run the test yourself: `node --test scripts/__tests__/mine-india-transcripts-routing.test.mjs`.
2. TEST INTEGRITY: do the 6 tests genuinely assert behavior? In particular, would the "fail-soft to direct" test fail if the fall-through were removed; would the "gate OFF never calls MCP" test fail if the gate were inverted; would the "fail loud on empty" test fail if the guard were dropped? Spot any assertion that passes against broken code.
3. The exported `ollamaCall` signature change (added opts) — does any OTHER caller in the miner break? (the `ollama()` wrapper calls it with 2 args.)
4. Does the overlay preserve the GEN_TIMEOUT_MS semantics (the MCP route gets timeoutMs: GEN_TIMEOUT_MS; the direct path keeps its own AbortController timer)?
5. Any silent-failure or resource-leak vector (the direct path's setTimeout/clearTimeout in try/finally; does the MCP branch leak anything)?

Read both files + run the test. Flag P0/P1 with file:line. End with `VERDICT: PASS` or `VERDICT: FAIL`.

### Assistant | 2026-06-10T00:11:41.128Z

I'll perform an independent (arm B) scrutiny of commit 3cf36669e0, weighting toward import-safety, test integrity, and hidden coupling. Let me start by examining the commit and both files.

### Assistant | 2026-06-10T00:11:41.911Z

[tool_use: Bash]

### User | 2026-06-10T00:11:52.777Z

[tool_result] commit 3cf36669e0a78a92be5d551c339a1f617225f36d
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Tue Jun 9 19:10:42 2026 -0500

    [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [LOCAL-LLM-MS1]/U-NUMCTX-MINER-ROUTE (slot:india): route the india transcript miner through MCP (opt-in, fail-soft, num_ctx-safe) -- completes the directive's local-LLM-through-MCP for india
    
    R15 apply-to-all 
... [+1258 chars truncated]

### Assistant | 2026-06-10T00:11:58.545Z

I'll proceed with reading the full files directly rather than the diff, since I need to verify the complete picture.

### Assistant | 2026-06-10T00:11:59.018Z

[tool_use: Bash]

### User | 2026-06-10T00:12:08.350Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
commit 3cf36669e0a78a92be5d551c339a1f617225f36d
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Tue Jun 9 19:10:42 2026 -0500

    [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [LOCAL-LLM-MS1]/U-NUMCTX-MINER-ROUTE (slot:india): route the india transcript miner through MCP (opt-in, fail-soft, num_ctx-safe) -- complete
... [+8359 chars truncated]

### Assistant | 2026-06-10T00:12:10.802Z

Let me see the rest of the diff and read the full miner file.

### Assistant | 2026-06-10T00:12:11.219Z

[tool_use: Read]

### User | 2026-06-10T00:12:15.876Z

[tool_result] 180	  let active = 0;
181	  const queue = [];
182	  const pump = () => {
183	    if (active >= max || queue.length === 0) return;
184	    active++;
185	    const { fn, resolve, reject } = queue.shift();
186	    Promise.resolve().then(fn).then(resolve, reject).finally(() => { active--; pump(); });
187	  };
188	  return (fn) => new Promise((resolve, reject) => { queue.push({ fn, resolve, reject }); 
... [+4679 chars truncated]

### Assistant | 2026-06-10T00:12:18.738Z

The `ollama()` wrapper at line 231-233 calls `ollamaCall(prompt, model)` with 2 args — the new `opts = {}` default handles that. Good. Let me verify the `__isMain` guard and the imports at the top of the miner.

### Assistant | 2026-06-10T00:12:19.474Z

[tool_use: Read]

### User | 2026-06-10T00:12:22.414Z

[tool_result] 270	  return { id: row.id, status: "mined", spineKB: +(spine.length / 1024).toFixed(0), slices: slices.length };
271	}
272	
273	const SYNTHESIS_PROMPT = (text) =>
274	  `Synthesize MULTIPLE PRISM AI-systems (NN/GNN/GraphSAGE/LoRA/RAG/PSN/system-viz/deep-learning) session ` +
275	  `digests into ONE cross-session knowledge digest. Deduplicate aggressively across sessions. Output exactly ` +
276	  `
... [+5879 chars truncated]

### Assistant | 2026-06-10T00:12:25.388Z

Now let me see the `__isMain` guard at the bottom of the miner.

### Assistant | 2026-06-10T00:12:26.403Z

[tool_use: Read]

### User | 2026-06-10T00:12:30.930Z

[tool_result] 360	  console.log(`[mine-india] DONE -- ${results.filter((r) => r.status === "mined").length} mined, ${results.filter((r) => r.status.startsWith("skipped")).length} skipped, ${results.filter((r) => r.status === "error").length} error. Combined: ${OUT_DIR}/_COMBINED.md`);
361	
362	  // CROSS-SESSION SYNTHESIS + Obsidian vault feed -- the "fully synergized with Obsidian" deliverable:
363	  // merge 
... [+1359 chars truncated]

### Assistant | 2026-06-10T00:12:38.616Z

The `__isMain` guard (line 382-383) is sound — `main()` only runs when invoked directly. The miner's top imports look clean. Now let me read `ask-ollama.mjs` to verify the imported `callViaMcp` and `mcpRoutingEnabled`, its own main-guard, and check for an import cycle.

### Assistant | 2026-06-10T00:12:38.941Z

[tool_use: Read]

### User | 2026-06-10T00:12:43.057Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * ask-ollama.mjs — local Ollama query service (OLLAMA-EXPAND-MS0/U-OE01)
4	 *
5	 * Routes token-heavy work to a LOCAL Ollama model so it never enters the
6	 * Claude context window. Claude invokes this via Bash; only the compact
7	 * answer returns. Heavy inputs — the ~27 MB system-viz graph, large source
8	 * files, build-error dumps — are processed here in the subp
... [+37517 chars truncated]

### Assistant | 2026-06-10T00:12:49.704Z

I've now read both files fully. Key verifications:

**Import safety (1a, 1b):**
- `ask-ollama.mjs` imports only: `node:fs`, `node:url`, `node:path`, `node:child_process`, `node:util`, `./lib/host-aware-synthesis-model.mjs`, `./lib/mcp-streamable-client.mjs`. It does **NOT** import `mine-india-transcripts.mjs` → **no import cycle**. ✓
- `ask-ollama.mjs` has the `INVOKED_DIRECTLY` main-guard (line 800-807) → importing it never runs the CLI. ✓
- `callViaMcp` (line 613) and `mcpRoutingEnabled` (line 548) are both exported. ✓

Let me check the two transitive imports of ask-ollama for any top-level side effects, then run the test.

### Assistant | 2026-06-10T00:12:51.566Z

[tool_use: Bash]

### User | 2026-06-10T00:13:01.622Z

[tool_result] ---HOST-AWARE---
23:import { detectHostClass } from "../../.claude/hooks/lib/host-class.mjs";
24:import { routeModelForTask } from "../../.claude/hooks/lib/ollama-cost-router.mjs";

### Assistant | 2026-06-10T00:13:09.210Z

No `process.argv`/`main()`/cycle in the transitive imports. Now let me run the test (point 1, mandatory) — and pre-emptively check whether `mcp-streamable-client.mjs` makes a real network call at module load (it shouldn't, but the test must prove it).

### Assistant | 2026-06-10T00:13:09.834Z

[tool_use: Bash]

### User | 2026-06-10T00:13:16.601Z

[tool_result]   ...
# Subtest: ollamaCall: MCP ok-but-empty text falls through to direct (not a phantom-ok)
ok 3 - ollamaCall: MCP ok-but-empty text falls through to direct (not a phantom-ok)
  ---
  duration_ms: 0.1574
  ...
# Subtest: ollamaCall: gate OFF uses the direct path only, never calls MCP, still sets num_ctx (byte-identical legacy)
ok 4 - ollamaCall: gate OFF uses the direct path only, never calls MC
... [+586 chars truncated]

### Assistant | 2026-06-10T00:13:29.782Z

All 6 pass, 0 fail. The import resolves cleanly (no cycle, no CLI execution, no module-load network call). Now let me do the mutation-style test-integrity analysis. I'll verify each claim by mentally reverting the guard and checking the assertion would actually fail.

**Test integrity (point 2) — mutation analysis:**

Test 2 ("MCP failure FAILS SOFT to direct"): `callViaMcpImpl` returns `{ok:false}`. The guard at line 206 is `if (r && r.ok && typeof r.text === "string" && r.text.trim())`. If the fall-through were removed (e.g. the code `return` on the MCP branch unconditionally), `fetchCalled` would be `false` and `out` would not equal `"DIRECT-FALLBACK"` → **both asserts fail**. Genuine. ✓

Test 3 ("MCP ok-but-empty falls through"): returns `{ok:true, text:"   "}`. The `.trim()` check is the precise guard under test. If `.trim()` were dropped (just `typeof r.text === "string"`), the empty `"   "` would return early, `fetchCalled` stays `false`, `out` becomes `"   ".trim()` = `""` ≠ `"RECOVERED"` → **fails**. This specifically kills the phantom-ok mutant. ✓

Test 4 ("gate OFF never calls MCP"): `mcpEnabled:false`. If the gate were inverted (`if (!mcpEnabled)`), `mcpCalled` would become `true` → **assert.equal(mcpCalled, false) fails**. Also asserts `num_ctx: 32768` and `temperature: 0.2` in the direct body. Genuine. ✓

Tests 5 & 6 (R12 fail-loud): both use `assert.rejects` with a regex on the message. If line 223's empty-guard were dropped, test 5 would resolve to `""` instead of rejecting → `assert.rejects` **fails**. If line 218's `!res.ok` throw were dropped, test 6 would proceed to `res.json()` → `{}` → `(undefined ?? "").trim()` → empty throw, message `/empty response/` not `/ollama HTTP 503/` → **fails on the regex**. Both genuine. ✓

Let me now verify one subtle integrity concern: whether test 1's MCP-route assertions would survive a regression where `numCtx`/`numPredict`/`timeoutMs` are dropped from the opts object passed to `callViaMcpImpl`.

### Assistant | 2026-06-10T00:13:30.407Z

[tool_use: Read]

### User | 2026-06-10T00:13:33.082Z

[tool_result] 8	import assert from "node:assert/strict";
9	import { ollamaCall } from "../mine-india-transcripts.mjs";
10	
11	test("ollamaCall: MCP overlay ON routes via callViaMcp with numCtx=32768 + numPredict (no direct fetch)", async () => {
12	  let mcpArgs = null;
13	  let fetchCalled = false;
14	  const callViaMcpImpl = async (model, prompt, opts) => { mcpArgs = { model, prompt, opts }; return { ok: true
... [+854 chars truncated]

### Assistant | 2026-06-10T00:13:47.035Z

Test 1 captures `mcpArgs.opts` and asserts `numCtx === 32768` and `numPredict === 8192`. If the production code dropped `numCtx` from the opts object (the truncation guard — the entire point of this commit), `mcpArgs.opts.numCtx` would be `undefined ≠ 32768` → **fails**. This is the load-bearing assertion that protects the commit's core purpose. Genuine. ✓

Now let me address the remaining structured points (3, 4, 5).

**Point 3 (other callers of `ollamaCall`):** The only internal caller is `ollama()` at line 231-232: `ollamaLimit(() => ollamaCall(prompt, model))` — 2 args. The new third param `opts = {}` defaults, so `mcpEnabled` resolves to `mcpRoutingEnabled()` (live env), `callViaMcpImpl`/`fetchImpl` to the real impls. **No break.** ✓ No other caller exists in the miner (verified — `ollamaCall` is called only by `ollama()`; all mining goes through `ollama()`).

**Point 4 (GEN_TIMEOUT_MS semantics):**
- MCP route (line 205): passes `timeoutMs: GEN_TIMEOUT_MS` (240000). Inside `callViaMcp`, this becomes the inner Ollama `timeoutMs` and the MCP envelope gets `timeoutMs + MCP_ENVELOPE_MARGIN_MS` (line 628) = 245000. Correct — the inner generate gets the full 240s; the transport waits 5s longer. ✓
- Direct path (line 209-210): keeps its own `AbortController` + `setTimeout(GEN_TIMEOUT_MS)`. Unchanged. ✓

**Point 5 (silent-failure / resource-leak):**
- Direct path: `setTimeout`/`clearTimeout` in try/finally (line 209-227) — timer always cleared. Unchanged. ✓
- MCP branch (line 204-208): no timer, no AbortController of its own. `callViaMcp` is documented "Never throws" and internally manages its own timer in `callOllama`/`mcpCallStreamable` with its own finally. The MCP branch creates **no resource** in the miner that needs cleanup → no leak. ✓
- One subtle correctness check: the MCP branch is **outside** the try/finally. If `callViaMcpImpl` *did* throw (contract says it never does, but defensively), no timer leaks because the timer isn't created until after the MCP bra
... [+197 chars truncated]

### Assistant | 2026-06-10T00:13:48.510Z

[tool_use: Bash]

### User | 2026-06-10T00:13:59.767Z

[tool_result] 52:  if (!text.trim()) return { ok: false, error: "MCP response body is empty" };
54:    try {
56:      return { ok: true, envelope: env };
57:    } catch (e) {
58:      return { ok: false, error: `MCP response is not valid JSON: ${e && e.message ? e.message : e}` };
69:      try {
72:          return { ok: true, envelope: env };
74:      } catch {
78:    return { ok: false, error: "MCP SSE stream
... [+913 chars truncated]

### Assistant | 2026-06-10T00:14:08.794Z

`mcpCallStreamable` wraps its `fetch` in try/catch (line 119-149) and returns `{ok:false}` on every path — it never throws. So `callViaMcp` never throws, and the miner's MCP branch is safe even though it sits outside the try/finally. The fail-soft chain is airtight.

Now one final integrity check — a potential **hidden-coupling / silent-failure** concern that arm A may have missed. The MCP branch's fall-through comment says "unchanged behavior," but there's a subtle behavioral difference worth flagging: when `mcpEnabled` is true and MCP returns ok-but-empty (or fails), the code falls through to the direct path — but the direct path's empty-response throws. So a *real* generation failure on both routes still fails loud. That's correct, not a regression. Let me confirm there's no double-consumption or shared-state issue between the gate-on path and the limiter.

The `ollama()` wrapper (line 231) wraps `ollamaCall` in `ollamaLimit(...)`. When MCP is enabled, the MCP call **and** any fall-through direct call both happen inside one limiter slot — so concurrency is still bounded correctly (the whole `ollamaCall` invocation, MCP + possible fallback, counts as one in-flight unit). No limiter bypass. ✓

Let me verify there are no other references to `ollamaCall` across the repo that could be a hidden external caller now affected by the signature change.

### Assistant | 2026-06-10T00:14:09.258Z

[tool_use: Grep]

### User | 2026-06-10T00:14:23.362Z

[tool_result] Found 19 files
knowledge\wiki\code-tribal\learnings\local-llm-ms1-u-numctx-miner-route.md
state\HANDOFF.md
scripts\__tests__\mine-india-transcripts-routing.test.mjs
scripts\mine-india-transcripts.mjs
knowledge\wiki\code-tribal\learnings\local-llm-ms1-u-numctx-askollama-propagate.md
scripts\__tests__\ask-ollama.test.mjs
state\shared\galaxy-transcript-mining\cam\86373eb3.md
scripts\mine-galaxy-trans
... [+696 chars truncated]

### Assistant | 2026-06-10T00:14:28.965Z

`ollamaCall` is a common name — these are independent definitions in different files (`mine-galaxy-transcripts.mjs`, `generate-personal-brief.mjs`, the hooks, the consensus engine each have their own `ollamaCall`). The only file that *imports* `ollamaCall` from `mine-india-transcripts.mjs` is the new test (line 9). Let me confirm `mine-galaxy-transcripts.mjs` defines its own and does not import from the india miner (no coupling).

### Assistant | 2026-06-10T00:14:30.849Z

[tool_use: Bash]

### User | 2026-06-10T00:15:01.224Z

[tool_result] 351:async function ollamaCall(prompt, model, timeoutMs = GEN_TIMEOUT_MS) {
---callers of india ollamaCall (import only)---
scripts/mine-india-transcripts.test.mjs:7:import { isIndiaTopic, isNoise, INDIA_TOPIC_RE, makeLimiter, buildVaultDoc, parseCoverage } from "./mine-india-transcripts.mjs";
scripts/__tests__/mine-india-transcripts-routing.test.mjs:9:import { ollamaCall } from "../mine-india-tran
... [+13 chars truncated]

### Assistant | 2026-06-10T00:15:05.882Z

Confirmed:
- `mine-galaxy-transcripts.mjs` has its **own** local `ollamaCall` (line 351, not exported, signature `(prompt, model, timeoutMs)`) — entirely independent, unaffected by this commit.
- The only importer of the india miner's `ollamaCall` is the new routing test. The pre-existing `mine-india-transcripts.test.mjs` imports other exports (`isIndiaTopic`, `makeLimiter`, etc.) but **not** `ollamaCall` — so it cannot be broken by the signature change. No hidden external caller exists.

Let me run the pre-existing india miner test to confirm the signature change didn't break the established suite.

### Assistant | 2026-06-10T00:15:06.453Z

[tool_use: Bash]

### User | 2026-06-10T00:15:24.317Z

[tool_result] # tests 12
# suites 0
# pass 12
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 221.891

### Assistant | 2026-06-10T00:15:51.549Z

The pre-existing 12-test suite still passes (no regression from the export/signature change). Both suites green: 6/6 new + 12/12 existing.

## Scrutiny Report — commit 3cf36669e0 (arm B, independent)

### Summary
Opt-in MCP overlay on the india transcript miner's `ollamaCall`. The design is additive, fail-soft, and the gate-off path is byte-identical to legacy. All claims verified against live code + live test runs.

### Verification results (all 5 requested axes + extras)

**1. Import safety — PASS**
- (a) No import cycle: `H:/prism/scripts/ask-ollama.mjs` imports only node builtins + `./lib/host-aware-synthesis-model.mjs` + `./lib/mcp-streamable-client.mjs`. It never imports the miner. Transitive imports have no `process.argv`/`main()`/network at module load. (`ask-ollama.mjs:43-49`)
- (b) `ask-ollama.mjs` CLI is guarded by `INVOKED_DIRECTLY` (`ask-ollama.mjs:800-807`) — import never runs the CLI.
- (c) Miner `main()` is guarded by `__isMain` (`mine-india-transcripts.mjs:382-383`) — import never runs `main()`.
- Test run: `node --test scripts/__tests__/mine-india-transcripts-routing.test.mjs` → **6 pass / 0 fail** (importing the miner produced no side effects, no network).

**2. Test integrity (mutation-style) — PASS.** Each guard was mentally reverted; every test fails on the corresponding broken code:
- "fail-soft to direct" (test 2): drop the fall-through → `fetchCalled=false`, `out≠"DIRECT-FALLBACK"` → fails.
- "gate OFF never calls MCP" (test 4): invert the gate → `mcpCalled=true` → fails; also pins `num_ctx:32768` + `temperature:0.2` in the direct body.
- "fail loud on empty" (test 5): drop `mine-india-transcripts.mjs:223` guard → resolves `""` instead of rejecting → `assert.rejects` fails.
- "phantom-ok" (test 3): drop `.trim()` at `:206` → empty `"   "` returns early → fails.
- Test 1 pins `mcpArgs.opts.numCtx===32768` (the commit's entire purpose — the truncation guard) and `numPredict===8192`. Drop `numCtx` from the opts → fails. No assertion passes agai
... [+2432 chars truncated]
