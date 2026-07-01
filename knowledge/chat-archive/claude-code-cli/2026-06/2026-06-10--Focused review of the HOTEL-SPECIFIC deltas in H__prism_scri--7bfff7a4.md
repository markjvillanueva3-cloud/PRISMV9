---
type: "chat-session"
source: "claude-code-cli"
session_id: "7bfff7a4-521b-41bc-9719-fe5a0f593d86"
title: "Focused review of the HOTEL-SPECIFIC deltas in H:/prism/scripts/mine-hotel-trans"
date: "2026-06-10"
first_ts: "2026-06-10T01:41:19.998Z"
last_ts: "2026-06-10T01:42:14.436Z"
cwd: "H:\\prism"
messages: 15
user_msgs: 6
assistant_msgs: 9
raw_file: "H:/.claude/projects/H--prism/7bfff7a4-521b-41bc-9719-fe5a0f593d86/subagents/agent-a91323942a052d7f6.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:15"
---

# Focused review of the HOTEL-SPECIFIC deltas in H:/prism/scripts/mine-hotel-trans

> **claude-code-cli** | 2026-06-10 | 15 msgs (6 user / 9 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/7bfff7a4-521b-41bc-9719-fe5a0f593d86/subagents/agent-a91323942a052d7f6.jsonl`

## Transcript

### User | 2026-06-10T01:41:19.998Z

Focused review of the HOTEL-SPECIFIC deltas in H:/prism/scripts/mine-hotel-transcripts.mjs. The MCP routing overlay itself is a verbatim clone of an overlay already 2-arm-reviewed and PASSed on the galaxy miner — do NOT re-litigate the overlay shape. Focus ONLY on what is new/different for hotel:

1. **Main-guard correctness.** A new guard was added at the file tail:
   `const __isMain = (() => { try { return import.meta.url === pathToFileURL(process.argv[1] || "").href; } catch { return false; } })();`
   `if (__isMain) main().catch(...)`
   Previously the file called `main()` UNCONDITIONALLY (a latent bug — no function was importable without running the CLI). Verify: (a) `pathToFileURL` is now imported from "node:url" (a new import was added). (b) When run as `node scripts/mine-hotel-transcripts.mjs`, __isMain is true and main() still runs. (c) When IMPORTED (as the test does), __isMain is false and main() does NOT run. (d) No OTHER top-level I/O runs on import (scan the module top-level for mkdirSync/readdirSync/writeFileSync/fetch calls that execute at import time, outside any function). The test passing (6/6, no hang) is evidence (c)+(d) hold, but confirm by reading.

2. **`export` + 2-arg call-site backward-compat.** `ollama` changed from `async function ollama(prompt, model = MODEL)` to `export async function ollama(prompt, model = MODEL, opts = {})`. Grep every call site of `ollama(` inside the file (MAP, REDUCE, synthesis/combine). Confirm EVERY existing call passes 2 args `ollama(prompt, model)` so `opts` defaults to `{}` and the live defaults (mcpRoutingEnabled()/callViaMcp/fetch) apply. If ANY call site already passed a 3rd arg, that's a P0 collision — report it. 

3. **Clone fidelity vs the approved galaxy/india version.** The hotel overlay forwards `{ numCtx: NUM_CTX, numPredict: MCP_NUM_PREDICT, timeoutMs: GEN_TIMEOUT_MS }` and fails soft on falsy/ok:false/empty-text. Confirm NUM_CTX=32768, MCP_NUM_PREDICT=16384, the R12 empty-200/non-2xx fail-loud gu
... [+452 chars truncated]

### Assistant | 2026-06-10T01:41:23.714Z

I'll review the hotel-specific deltas. Let me read the target file and its test.

### Assistant | 2026-06-10T01:41:23.828Z

[tool_use: Read]

### Assistant | 2026-06-10T01:41:24.202Z

[tool_use: Read]

### User | 2026-06-10T01:41:25.256Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * mine-hotel-transcripts.mjs -- Ollama-powered miner for slot:hotel session transcripts.
4	 *
5	 * WHY: hotel session .jsonl transcripts (4-55 MB each) hold dense conversational context --
6	 * operator directives, dead-ends, un-promoted tribal knowledge -- that never reaches wiki/memory.
7	 * Reading them raw into the Claude context window is infeasible (hundreds of
... [+13628 chars truncated]

### User | 2026-06-10T01:41:25.596Z

[tool_result] 1	// mine-hotel-transcripts-routing.test.mjs -- LOCAL-LLM-MS1/U-NUMCTX-HOTEL-MINER-ROUTE
2	// Verifies the hotel transcript miner's `ollama` MCP overlay (the third + last live per-domain
3	// miner to get the proven india/galaxy routing -- completes the fleet-wide apply-to-all). When the
4	// gate is on it routes through prism_local local_generate (forwarding numCtx so the 32768-sized
5	// slices 
... [+4093 chars truncated]

### Assistant | 2026-06-10T01:41:28.195Z

Both files read end-to-end. Let me verify the call sites of `ollama(` and confirm the `ask-ollama.mjs` main-guard claim.

### Assistant | 2026-06-10T01:41:29.701Z

[tool_use: Grep]

### Assistant | 2026-06-10T01:41:30.377Z

[tool_use: Grep]

### User | 2026-06-10T01:41:33.857Z

[tool_result] 145:export async function ollama(prompt, model = MODEL, opts = {}) {
211:  for (const sl of slices) partSummaries.push(await ollama(MAP_PROMPT(sl)));
212:  const digest = partSummaries.length === 1 ? partSummaries[0] : await ollama(REDUCE_PROMPT(row.id, partSummaries));

### User | 2026-06-10T01:41:33.956Z

[tool_result] 54:const HERE = dirname(fileURLToPath(import.meta.url));
788:async function main() {
801:  process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
803:  void main().catch((e) => {

### Assistant | 2026-06-10T01:41:36.192Z

Let me verify the exact `ask-ollama.mjs` main-guard region to confirm the import comment's claim.

### Assistant | 2026-06-10T01:41:36.599Z

[tool_use: Read]

### User | 2026-06-10T01:41:39.550Z

[tool_result] 798	
799	// Run only as a CLI, never on import (keeps the test harness clean).
800	const INVOKED_DIRECTLY =
801	  process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
802	if (INVOKED_DIRECTLY) {
803	  void main().catch((e) => {
804	    console.error(`[ask-ollama] fatal: ${e && e.stack ? e.stack : e}`);
805	    process.exit(1);
806	  });
807	}

### Assistant | 2026-06-10T01:42:14.436Z

All four review axes verified by reading. Here is the focused report on the hotel-specific deltas.

## Code Quality Analysis Report — mine-hotel-transcripts.mjs (hotel deltas only)

### Summary
- Files Analyzed: 2 (`mine-hotel-transcripts.mjs`, routing test) + 1 cross-ref (`ask-ollama.mjs`)
- Scope: hotel-specific deltas only; MCP overlay shape not re-litigated
- P0: 0 · P1: 0 · P2: 0 · P3: 1 (non-blocking nit)

### 1. Main-guard correctness — PASS
- **(a) Import present:** `pathToFileURL` is imported from `node:url` at `mine-hotel-transcripts.mjs:29`. New import, correct module.
- **(b) Runs as CLI:** `mine-hotel-transcripts.mjs:251` — `import.meta.url === pathToFileURL(process.argv[1] || "").href`. When invoked as `node scripts/mine-hotel-transcripts.mjs`, `process.argv[1]` is the absolute script path, `pathToFileURL(...).href` equals `import.meta.url` → `__isMain` true → `main()` runs (`:252`). Correct.
- **(c) No run on import:** when imported, `process.argv[1]` is the test runner, not this file → URLs differ → `__isMain` false → `main()` does not run. The `try/catch` defends a malformed `argv[1]` (returns false, fail-closed — does not run). Confirmed by reading, consistent with the 6/6 no-hang result.
- **(d) No other top-level I/O:** scanned every top-level statement (`:26-49` imports/consts, `:41-57` arg parsing — pure, no I/O). Every `mkdirSync`/`readdirSync`/`writeFileSync`/`readFileSync`/`createReadStream`/`fetch` is inside a function body (`hotelShortIds`, `resolveTranscripts`, `extractSpine`, `mineOne`, `main`). `mkdirSync(OUT_DIR...)` is at `main():221`, not top-level. The only top-level side-effect-free evaluation is the `__isMain` IIFE, which performs no I/O. Correct — fixes the prior unconditional-`main()` latent bug.

### 2. `export` + 2-arg call-site backward-compat — PASS
- Signature `export async function ollama(prompt, model = MODEL, opts = {})` at `:145`.
- Every in-file call site passes exactly 2 args:
  - `:211` `await ollama(MAP_PROMPT(sl))`
... [+3771 chars truncated]
