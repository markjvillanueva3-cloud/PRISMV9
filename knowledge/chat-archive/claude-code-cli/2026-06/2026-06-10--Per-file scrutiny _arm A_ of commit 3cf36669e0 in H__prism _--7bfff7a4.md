---
type: "chat-session"
source: "claude-code-cli"
session_id: "7bfff7a4-521b-41bc-9719-fe5a0f593d86"
title: "Per-file scrutiny (arm A) of commit 3cf36669e0 in H:/prism — `git show 3cf36669e"
date: "2026-06-10"
first_ts: "2026-06-10T00:11:27.231Z"
last_ts: "2026-06-10T00:14:06.152Z"
cwd: "H:\\prism"
messages: 32
user_msgs: 11
assistant_msgs: 21
raw_file: "H:/.claude/projects/H--prism/7bfff7a4-521b-41bc-9719-fe5a0f593d86/subagents/agent-a1a7ec272b4b7df5d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:15"
---

# Per-file scrutiny (arm A) of commit 3cf36669e0 in H:/prism — `git show 3cf36669e

> **claude-code-cli** | 2026-06-10 | 32 msgs (11 user / 21 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/7bfff7a4-521b-41bc-9719-fe5a0f593d86/subagents/agent-a1a7ec272b4b7df5d.jsonl`

## Transcript

### User | 2026-06-10T00:11:27.231Z

Per-file scrutiny (arm A) of commit 3cf36669e0 in H:/prism — `git show 3cf36669e0`. It adds an opt-in MCP-routing overlay to the india transcript miner's `ollamaCall` (scripts/mine-india-transcripts.mjs) + a hermetic test (scripts/__tests__/mine-india-transcripts-routing.test.mjs).

Design intent: when `PRISM_LOCAL_LLM_VIA_MCP` is on, `ollamaCall` routes through `callViaMcp` (prism_local local_generate) with `numCtx: NUM_CTX` (32768) so the chunked transcript slices aren't truncated, then FAILS SOFT to the existing direct `/api/generate` path on any MCP failure. The direct path must be UNCHANGED (uncapped output, num_ctx, R12 empty-response fail-loud).

Weight toward FAITHFULNESS + fail-soft correctness. Verify:
1. The direct `/api/generate` path is byte-identical to before (same body, same num_ctx, same fail-loud on empty + non-2xx). The overlay is purely additive.
2. Fail-soft is total: MCP transport failure AND ok-but-empty-text both fall through to direct (no phantom-ok, no silent truncation).
3. Gate OFF (default) is byte-identical legacy behavior — `callViaMcp` is never invoked.
4. `mcpEnabled = mcpRoutingEnabled()` defaults correctly (reads PRISM_LOCAL_LLM_VIA_MCP); the seams (callViaMcpImpl/fetchImpl) don't change production behavior.
5. The internal caller `ollama(prompt, model)` (the rate-limited wrapper) still works with the new optional 3rd opts arg (backward compatible).
6. MCP_NUM_PREDICT=8192 — is capping the MCP route's output (while the direct path is uncapped) a reasonable, non-truncating choice for terse digests? Any risk a large REDUCE digest exceeds 8192 tokens and truncates ONLY on the MCP route?

Read both files. Flag P0/P1 with file:line. End with `VERDICT: PASS` or `VERDICT: FAIL`.

### Assistant | 2026-06-10T00:11:30.853Z

I'll perform a faithful per-file scrutiny of commit 3cf36669e0. Let me read both files and the commit diff.

### Assistant | 2026-06-10T00:11:31.608Z

[tool_use: Bash]

### User | 2026-06-10T00:11:42.548Z

[tool_result] commit 3cf36669e0a78a92be5d551c339a1f617225f36d
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Tue Jun 9 19:10:42 2026 -0500

    [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [LOCAL-LLM-MS1]/U-NUMCTX-MINER-ROUTE (slot:india): route the india transcript miner through MCP (opt-in, fail-soft, num_ctx-safe) -- completes the directive's local-LLM-through-MCP for india
    
    R15 apply-to-all 
... [+1258 chars truncated]

### Assistant | 2026-06-10T00:11:45.258Z

Let me read the full diff and both files.

### Assistant | 2026-06-10T00:11:45.997Z

[tool_use: Bash]

### User | 2026-06-10T00:11:54.715Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
commit 3cf36669e0a78a92be5d551c339a1f617225f36d
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Tue Jun 9 19:10:42 2026 -0500

    [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [LOCAL-LLM-MS1]/U-NUMCTX-MINER-ROUTE (slot:india): route the india transcript miner through MCP (opt-in, fail-soft, num_ctx-safe) -- complete
... [+4085 chars truncated]

### Assistant | 2026-06-10T00:11:59.000Z

Now let me read the full current file to see the complete `ollamaCall` and the `ollama` wrapper context.

### Assistant | 2026-06-10T00:11:59.877Z

[tool_use: Read]

### User | 2026-06-10T00:12:01.110Z

[tool_result] 185	    const { fn, resolve, reject } = queue.shift();
186	    Promise.resolve().then(fn).then(resolve, reject).finally(() => { active--; pump(); });
187	  };
188	  return (fn) => new Promise((resolve, reject) => { queue.push({ fn, resolve, reject }); pump(); });
189	}
190	
191	// All Ollama generate calls flow through ONE limiter so concurrent slices/transcripts never exceed
192	// OLLAMA_NUM_PAR
... [+3864 chars truncated]

### Assistant | 2026-06-10T00:12:04.554Z

Now let me check what `OLLAMA` constant is (used in the direct path) and confirm it was unchanged, plus read the imported `ask-ollama.mjs` to verify the `callViaMcp`/`mcpRoutingEnabled` contract.

### Assistant | 2026-06-10T00:12:05.966Z

[tool_use: Bash]

### User | 2026-06-10T00:12:36.895Z

[tool_result] async function ollamaCall(prompt, model) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), GEN_TIMEOUT_MS);
  try {
    const res = await fetch(OLLAMA, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model, prompt, stream: false, keep_alive: "10m", options: { num_ctx: NUM_CTX, temperature: 0.2 } }),
  
... [+736 chars truncated]

### Assistant | 2026-06-10T00:12:40.065Z

The direct path body is byte-identical except `fetch` → `fetchImpl` (which defaults to `fetch`). Now let me verify the `ask-ollama.mjs` contract — `callViaMcp` return shape and `mcpRoutingEnabled` default.

### Assistant | 2026-06-10T00:12:40.965Z

[tool_use: Bash]

### User | 2026-06-10T00:12:55.841Z

[tool_result] 323:      return { ok: false, error: `cannot stat ${name}: ${e.message}` };
328:      return { ok: false, error: `cannot determine the size of ${name}` };
338:      return { ok: false, error: `cannot read ${name}: ${e.message}` };
344:      return { ok: false, error: `${name} is not valid JSON: ${e.message}` };
347:      return { ok: false, error: `${name} has no nodes array` };
349:    return { o
... [+2306 chars truncated]

### Assistant | 2026-06-10T00:12:58.044Z

Let me read the `callViaMcp` and `mcpRoutingEnabled` definitions in full to verify the return-shape contract and default behavior.

### Assistant | 2026-06-10T00:12:58.740Z

[tool_use: Read]

### User | 2026-06-10T00:13:01.729Z

[tool_result] 543	/**
544	 * True when local-LLM calls should route through the PRISM MCP server. Reads
545	 * PRISM_LOCAL_LLM_VIA_MCP (1/true/yes/on). Default OFF -> the direct Ollama
546	 * /api/generate path is byte-identical to the pre-MCP behavior. Pure.
547	 */
548	export function mcpRoutingEnabled(env = process.env) {
549	  const v = String((env && env.PRISM_LOCAL_LLM_VIA_MCP) || "").trim().toLowerCase()
... [+4310 chars truncated]

### Assistant | 2026-06-10T00:13:05.802Z

`callViaMcp` confirms: it `Never throws` — returns `{ok:false, error, source:"mcp"}` on any failure (transport, payload shape, or `d.success && text` false at line 635-638). The `ollamaCall` overlay only returns when `r.ok && typeof r.text === "string" && r.text.trim()` — so MCP-empty/failed both fall through. Now the test file.

### Assistant | 2026-06-10T00:13:06.086Z

[tool_use: Read]

### User | 2026-06-10T00:13:08.680Z

[tool_result] 1	// mine-india-transcripts-routing.test.mjs -- LOCAL-LLM-MS1/U-NUMCTX-MINER-ROUTE
2	// Verifies the india transcript miner's ollamaCall MCP overlay: when the gate is on it
3	// routes through prism_local local_generate (with numCtx so the 32768-sized slices are not
4	// truncated) and FAILS SOFT to the direct /api/generate path on any MCP failure; the gate
5	// OFF path is byte-identical to the l
... [+3736 chars truncated]

### Assistant | 2026-06-10T00:13:12.472Z

Now let me run the test to confirm it passes (R12 — don't claim "tests pass" without verifying), and check the `OLLAMA` constant + `ask-ollama.mjs` main-guard claim (the import-doesn't-run-CLI faithfulness point).

### Assistant | 2026-06-10T00:13:13.335Z

[tool_use: Bash]

### User | 2026-06-10T00:13:18.655Z

[tool_result]   ...
# Subtest: ollamaCall: direct-path empty 200-OK FAILS LOUD (R12 silent-data-loss guard preserved)
ok 5 - ollamaCall: direct-path empty 200-OK FAILS LOUD (R12 silent-data-loss guard preserved)
  ---
  duration_ms: 0.3207
  ...
# Subtest: ollamaCall: direct-path non-2xx FAILS LOUD with the HTTP status
ok 6 - ollamaCall: direct-path non-2xx FAILS LOUD with the HTTP status
  ---
  duration_ms: 0
... [+111 chars truncated]

### Assistant | 2026-06-10T00:13:20.933Z

6/6 pass. Now verify the `ask-ollama.mjs` main-guard claim (import must not run its CLI) and the `OLLAMA` constant definition in the miner.

### Assistant | 2026-06-10T00:13:22.496Z

[tool_use: Bash]

### User | 2026-06-10T00:13:28.637Z

[tool_result] scripts/mine-india-transcripts.mjs:66:const OLLAMA = process.env.OLLAMA_URL ? `${process.env.OLLAMA_URL}/api/generate` : "http://127.0.0.1:11434/api/generate";
scripts/mine-india-transcripts.mjs:382:const __isMain = (() => { try { return import.meta.url === pathToFileURL(process.argv[1] || "").href; } catch { return false; } })();
scripts/ask-ollama.mjs:54:const HERE = dirname(fileURLToPath(import
... [+130 chars truncated]

### Assistant | 2026-06-10T00:13:35.305Z

Both files have proper `import.meta.url`-based main-guards (miner line 382, ask-ollama line 801), so importing `ask-ollama.mjs` from the miner does not run its CLI — the diff comment is accurate. The `OLLAMA` constant (line 66) is unchanged and still drives the direct path.

Let me verify the test confirms a subtle faithfulness point: in the gate-ON success test, `mcpArgs.opts` doesn't assert `timeoutMs`, but the production code passes `timeoutMs: GEN_TIMEOUT_MS`. Let me confirm `GEN_TIMEOUT_MS` is 240000 and that `callViaMcp`'s default `numPredict` wouldn't matter (it's overridden). Already confirmed `MCP_NUM_PREDICT=8192` and `GEN_TIMEOUT_MS=240_000` from the diff. Let me do a final check on whether a REDUCE digest could realistically exceed 8192 tokens (point 6).

### Assistant | 2026-06-10T00:13:36.201Z

[tool_use: Read]

### User | 2026-06-10T00:13:39.373Z

[tool_result] 260	    return { id: row.id, status: "empty", spineKB: 0 };
261	  }
262	  const slices = chunk(spine, CHUNK_CHARS);
263	  // Concurrent per-slice MAP (the global ollama limiter caps in-flight calls to CONCURRENCY).
264	  const partSummaries = await Promise.all(slices.map((sl) => ollama(MAP_PROMPT(sl), MAP_MODEL)));
265	  const digest = partSummaries.length === 1 ? partSummaries[0] : await ollama(R
... [+2328 chars truncated]

### Assistant | 2026-06-10T00:14:06.152Z

I now have everything needed. Let me assess point 6 (the 8192 cap) with the full picture of what flows through `ollamaCall`.

The `ollamaCall` / `ollama()` wrapper handles three prompt types, all routed through the same `MCP_NUM_PREDICT=8192` cap when the gate is on:
- **MAP** (per-slice): terse bullets from a ~24K-token slice. 8192 output tokens is generous.
- **REDUCE** (`REDUCE_PROMPT`): merges N slice-summaries into one deduplicated digest, explicitly "Terse bullets, drop duplicates". Inputs are already-terse summaries, output is bounded below input.
- **SYNTHESIS** (`SYNTHESIS_PROMPT` / `SYNTHESIS_MERGE_PROMPT`): cross-session merge, also "Terse bullets". The largest input case (`joined.length > CHUNK_CHARS`) is pre-chunked so each synthesis call sees ≤90K chars and emits one terse digest.

All three are deduplicating, terse-bullet digests whose output is bounded well under 8192 tokens (~32KB) by design. The cap only applies to the MCP route; the direct path stays uncapped, so the worst case is graceful: an unusually verbose digest would truncate ONLY on the opt-in MCP route. This is an asymmetry worth noting but low-risk given the terse-digest contract.

## Scrutiny findings

**Faithfulness verification (all confirmed):**

1. **Direct `/api/generate` path byte-identical** — VERIFIED. Compared `3cf36669e0^` vs current (`mine-india-transcripts.mjs:209-227`). The only change is `fetch` → `fetchImpl` where `fetchImpl = fetch` (default). Body (`num_ctx: NUM_CTX`, `temperature: 0.2`, `stream: false`, `keep_alive: "10m"`), the `!res.ok` non-2xx throw, the empty-`trim()` R12 fail-loud throw, and the `finally`/timeout are unchanged. Overlay is purely additive (inserted before the `AbortController`).

2. **Fail-soft is total** — VERIFIED. `mine-india-transcripts.mjs:204-208`: the MCP branch returns only when `r && r.ok && typeof r.text === "string" && r.text.trim()`. `callViaMcp` (`ask-ollama.mjs:613-638`) `Never throws` and returns `{ok:false,...}` on transport failure
... [+2629 chars truncated]
