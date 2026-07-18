---
type: "chat-session"
source: "claude-code-cli"
session_id: "9dc60ef7-7881-491c-b1ee-fda1e99bc5bf"
title: "Independent analyst review (arm C / second pass) of a new FREE multimodal substr"
date: "2026-06-19"
first_ts: "2026-06-19T19:50:50.749Z"
last_ts: "2026-06-19T19:55:23.103Z"
cwd: "H:\\prism"
messages: 69
user_msgs: 26
assistant_msgs: 43
raw_file: "H:/.claude/projects/H--prism/9dc60ef7-7881-491c-b1ee-fda1e99bc5bf/subagents/agent-aa07e108be86c64fa.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:19"
---

# Independent analyst review (arm C / second pass) of a new FREE multimodal substr

> **claude-code-cli** | 2026-06-19 | 69 msgs (26 user / 43 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/9dc60ef7-7881-491c-b1ee-fda1e99bc5bf/subagents/agent-aa07e108be86c64fa.jsonl`

## Transcript

### User | 2026-06-19T19:50:50.749Z

Independent analyst review (arm C / second pass) of a new FREE multimodal substrate, committed 3f7df39916. The first reviewer (wiring) PASSED it; you must NOT assume they caught everything. Weight toward silent breakage, regression risk, cost/security correctness. Read end-to-end:
- `H:/prism/mcp-server/src/engines/LLMEngine.ts` (new `queryVision` + helpers `_normalizeImage`, `_visionAnswerAdequate`, `_defaultOllamaVisionGenerate`, `_callClaudeVision`, `_generateOfflineVisionResponse`; new `LLMConfig.ollama_vision_model`; `LLMDeps.ollamaVisionGenerate`/`claudeVisionCall`; types `VisionImage`/`LLMVisionQuery`)
- `H:/prism/mcp-server/src/engines/OllamaClientEngine.ts` (`images?: readonly string[]` + `generate()` conditional passthrough)
- `H:/prism/mcp-server/src/__tests__/LLMEngine.queryVision.test.ts` (9 cases)

WHAT IT IS: `queryVision` = free print-to-CNC/CAD-drawing path -- ollama vision first (free), Claude vision backup (paid; only on inadequate local read OR ollama-down AND api_key set), then offline. Mirrors the proven text query() ladder (8 text consumers shipped on it). Images base64 (with/without data: prefix) -> raw base64 for ollama, {data,media_type} blocks for Claude. NOT cached. tsc clean (10 project-wide errors all pre-existing elsewhere); 41/41 tests pass incl. text-path regression.

Focus on:
- REGRESSION: is the existing text query()/_ollamaAnswerAdequate/_callClaude/_defaultOllamaGenerate path byte-UNCHANGED? Does adding the REQUIRED `ollama_vision_model` to LLMConfig break ANY consumer that constructs a full LLMConfig object literal (grep for `: LLMConfig =` / `new LLMEngine({` with a complete config)? Does the OllamaClientEngine `images` change affect its 4 other importers (IdeaBlockExtractor, LocalModelOrchestrator, MultiModelConsensus, OllamaIntegration)?
- COST/SECURITY: can queryVision spuriously pay (escalate to Claude) when Ollama answered adequately? Is prefer:"ollama" a hard guarantee of no paid call? Is api_key ever logged/leaked? Is t
... [+666 chars truncated]

### Assistant | 2026-06-19T19:50:56.196Z

I'll start by reading the three changed files end-to-end, then trace the blast radius of the contract changes.

### Assistant | 2026-06-19T19:50:56.671Z

[tool_use: Read]

### User | 2026-06-19T19:50:57.099Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\LLMEngine.ts' was already read 5m ago in this session and is unchanged (mtime 1781898075502). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-19T19:50:57.161Z

[tool_use: Read]

### Assistant | 2026-06-19T19:50:57.606Z

[tool_use: Read]

### User | 2026-06-19T19:50:57.632Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\OllamaClientEngine.ts' was already read 4m ago in this session and is unchanged (mtime 1781894499462). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0
... [+1 chars truncated]

### User | 2026-06-19T19:50:58.208Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\__tests__\LLMEngine.queryVision.test.ts' was already read 2m ago in this session and is unchanged (mtime 1781898509009). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_RE
... [+11 chars truncated]

### Assistant | 2026-06-19T19:51:01.202Z

The read-once guard is firing but the content isn't actually in my context (this is a fresh agent thread). Let me disable the cache and read.

### Assistant | 2026-06-19T19:51:02.868Z

[tool_use: Bash]

### User | 2026-06-19T19:51:07.727Z

[tool_result] reading via offset to bypass
  858 H:/prism/mcp-server/src/engines/LLMEngine.ts
  214 H:/prism/mcp-server/src/engines/OllamaClientEngine.ts
  139 H:/prism/mcp-server/src/__tests__/LLMEngine.queryVision.test.ts
 1211 total

### Assistant | 2026-06-19T19:51:11.906Z

[tool_use: Read]

### User | 2026-06-19T19:51:12.746Z

[tool_result] 1	/**
2	 * LLMEngine — AI-Powered Manufacturing Intelligence
3	 *
4	 * Ollama-first LLM client for natural language queries about manufacturing,
5	 * quote explanations, process advice, and G-code annotation. Routes to a FREE
6	 * local Ollama model by default (so product features cost $0 at launch), with
7	 * an adaptive fallback ladder to the paid Claude API and then a deterministic
8	 * offline
... [+20424 chars truncated]

### Assistant | 2026-06-19T19:51:15.357Z

Now let me read the rest of LLMEngine.ts (the vision path and remaining helpers).

### Assistant | 2026-06-19T19:51:16.259Z

[tool_use: Read]

### User | 2026-06-19T19:51:17.114Z

[tool_result] 430	        // Claude failed -> fall through to the offline response.
431	      }
432	    }
433	
434	    // All configured providers exhausted -> deterministic, context-grounded
435	    // offline response. NOT cached: offline can be a transient degraded fallback
436	    // (Ollama + Claude both momentarily down), so the next call must re-probe a
437	    // recovered provider rather than be pinned
... [+18267 chars truncated]

### Assistant | 2026-06-19T19:51:20.769Z

Now let me read the OllamaClientEngine and the test file.

### Assistant | 2026-06-19T19:51:21.310Z

[tool_use: Read]

### User | 2026-06-19T19:51:21.795Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\OllamaClientEngine.ts' was already read 5m ago in this session and is unchanged (mtime 1781894499462). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0
... [+1 chars truncated]

### Assistant | 2026-06-19T19:51:21.966Z

[tool_use: Read]

### User | 2026-06-19T19:51:22.417Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\__tests__\LLMEngine.queryVision.test.ts' was already read 2m ago in this session and is unchanged (mtime 1781898509009). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_RE
... [+11 chars truncated]

### Assistant | 2026-06-19T19:51:25.324Z

The guard keeps blocking even though I haven't actually read these (fresh thread). Let me read with offset to bypass.

### Assistant | 2026-06-19T19:51:26.250Z

[tool_use: Read]

### Assistant | 2026-06-19T19:51:26.914Z

[tool_use: Read]

### User | 2026-06-19T19:51:27.631Z

[tool_result] 1	/**
2	 * OllamaClientEngine — Thin client around the `ollama` npm package
3	 *
4	 * Phase external-infra. Wraps Ollama's local LLM runtime so PRISM callers
5	 * can request chat completions, plain-text generation, and embeddings
6	 * without importing the Ollama SDK directly. The real daemon must be
7	 * running (either via `docker compose up -d ollama` or a host install);
8	 * this engine is a 
... [+8112 chars truncated]

### User | 2026-06-19T19:51:28.197Z

[tool_result] 1	/**
2	 * LLMEngine.queryVision substrate test (FREE-AI-MIGRATION/U-LLM-QUERY-VISION, slot:india).
3	 *
4	 * queryVision is the FREE multimodal (image+text) path -- the keystone for the operator's
5	 * print-to-CNC / CAD-drawing features (ollama vision model first, Claude vision backup, then
6	 * offline), mirroring the proven text query() ladder. These tests exercise every rung:
7	 *  - offline 
... [+7909 chars truncated]

### Assistant | 2026-06-19T19:51:32.414Z

I have all three files. Now let me trace the blast radius. First, the regression concern: does adding the REQUIRED `ollama_vision_model` to LLMConfig break any consumer constructing a full LLMConfig literal? Let me check the git diff and grep for consumers.

### Assistant | 2026-06-19T19:51:33.802Z

[tool_use: Bash]

### Assistant | 2026-06-19T19:51:35.182Z

[tool_use: Grep]

### User | 2026-06-19T19:51:37.548Z

[tool_result] commit 3f7df399166a78d466cd805fa09343d60a604e33
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Fri Jun 19 14:45:44 2026 -0500

    [MAIN-FORCE] [FREE-AI-MIGRATION]/U-LLM-QUERY-VISION (slot:india): add free Ollama-first queryVision substrate (vision ladder + ollama image passthrough) -- keystone for print-to-CNC/CAD-drawing vision engines

 .../src/__tests__/LLMEngine.queryVisi
... [+209 chars truncated]

### User | 2026-06-19T19:51:39.136Z

[tool_result] mcp-server\src\engines\LLMEngine.ts:167:  private config: LLMConfig;
mcp-server\src\engines\LLMEngine.ts:827:export const llmEngine = new LLMEngine();
mcp-server\src\__tests__\llm-engine.test.ts:9:    const engine = new LLMEngine();
mcp-server\src\__tests__\llm-engine.test.ts:14:    const engine = new LLMEngine();
mcp-server\src\__tests__\llm-engine.test.ts:23:    const engine = new LLMEngine();
m
... [+4931 chars truncated]

### Assistant | 2026-06-19T19:51:46.017Z

Critical finding so far: the constructor takes `Partial<LLMConfig>` and supplies a default for `ollama_vision_model`, so existing `new LLMEngine(...)` callers won't break at the constructor. But the `LLMConfig` interface change makes `ollama_vision_model` REQUIRED. Any code that builds a complete `LLMConfig` object literal (not via the constructor) and assigns it to a `: LLMConfig`-typed variable, or passes a non-Partial LLMConfig, would fail tsc. The grep shows only `private config: LLMConfig` (internal) and constructor calls (all Partial). Let me confirm there's no full-literal LLMConfig anywhere, and check the diff of the actual interface change to confirm whether `ollama_vision_model` was newly added as required vs pre-existing.

### Assistant | 2026-06-19T19:51:47.199Z

[tool_use: Bash]

### User | 2026-06-19T19:51:51.791Z

[tool_result] commit 3f7df399166a78d466cd805fa09343d60a604e33
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Fri Jun 19 14:45:44 2026 -0500

    [MAIN-FORCE] [FREE-AI-MIGRATION]/U-LLM-QUERY-VISION (slot:india): add free Ollama-first queryVision substrate (vision ladder + ollama image passthrough) -- keystone for print-to-CNC/CAD-drawing vision engines

diff --git a/mcp-server/src/engines/LL
... [+5512 chars truncated]

### Assistant | 2026-06-19T19:51:57.611Z

The text-path diff confirms: text `query()`, `_ollamaAnswerAdequate`, `_callClaude`, `_defaultOllamaGenerate`, `_withTimeout` are byte-UNCHANGED (the diff shows only additions, no `-` lines except the contiguous hunk markers). The only mutation to existing code is the constructor adding the `ollama_vision_model` default line — additive, defaulted, so existing constructor callers are safe.

Now the key regression question: `ollama_vision_model: string` is REQUIRED in the interface. Let me verify NO consumer constructs a full `LLMConfig` literal that would now fail tsc, and check the 4 other OllamaClientEngine importers.

### Assistant | 2026-06-19T19:51:58.956Z

[tool_use: Grep]

### Assistant | 2026-06-19T19:52:00.455Z

[tool_use: Grep]

### User | 2026-06-19T19:52:00.489Z

[tool_result] Found 16 files
mcp-server\src\engines\LLMEngine.ts
mcp-server\src\engines\AgentExecutor.ts
mcp-server\src\tools\dispatchers\atcsDispatcher.ts
mcp-server\src\tools\dispatchers\ralphDispatcher.ts
mcp-server\src\tools\dispatchers\manusDispatcher.ts
mcp-server\src\engines\ManusATCSBridge.ts
mcp-server\src\engines\ElectrodeAIReasoningEngine.ts
mcp-server\src\engines\PRISMIntelligenceLayer.ts
mcp-server
... [+399 chars truncated]

### User | 2026-06-19T19:52:01.823Z

[tool_result] H:\prism\mcp-server\src\__tests__\IdeaBlockExtractor.test.ts-3- *
mcp-server\src\__tests__\IdeaBlockExtractor.test.ts-4- * Covers the E1 exit conditions:
H:\prism\mcp-server\src\__tests__\IdeaBlockExtractor.test.ts-5- *   - IdeaBlock schema validates the engine's output shape.
mcp-server\src\__tests__\IdeaBlockExtractor.test.ts:6: *   - Ollama is invoked via OllamaClientEngine.generate (mocked).
H
... [+3960 chars truncated]

### Assistant | 2026-06-19T19:52:08.443Z

The OllamaClientEngine `images` change is purely additive — an optional field on `OllamaGenerateOptions`, with a conditional spread in `generate()` that only adds `images` when non-empty. The 4 other importers all call `generate()` without `images`, so the conditional spread evaluates to `{}` for them — behavior is byte-identical. No regression for IdeaBlockExtractor / LocalModelOrchestrator / MultiModelConsensus / OllamaIntegration.

Now let me verify there is no full `LLMConfig` object literal anywhere that would fail tsc on the new required field. Let me check the non-test consumers and confirm tsc actually compiles. Let me also check the `min_answer_chars: 0` edge case and the regex backtracking concern.

### Assistant | 2026-06-19T19:52:09.912Z

[tool_use: Bash]

### User | 2026-06-19T19:52:19.067Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-19T19:52:22.745Z

No external full-`LLMConfig` literal exists — every consumer goes through the `Partial<LLMConfig>` constructor. The required field is safe. Now let me run tsc on the engine file and the full vision test to confirm the claims (tsc clean, 9/9 pass, no test timeout despite the triage hook's warning).

### Assistant | 2026-06-19T19:52:24.103Z

[tool_use: Bash]

### User | 2026-06-19T19:52:30.523Z

[tool_result]  RUN  v4.1.5 H:/PRISM/mcp-server

·······································stderr | src/__tests__/llm-engine.test.ts > LLMEngine > processAdvice returns structured advice
[INFO] [TribalKnowledge] Categorizing static tips (lazy init)...
[INFO] [TribalKnowledge] Loaded 4234 raw static tips
[INFO] [TribalKnowledge] Categorized 4234 static tips
[INFO] [TribalKnowledge] Loaded 326 extracted tips from aut
... [+245 chars truncated]

### Assistant | 2026-06-19T19:52:35.433Z

41/41 pass (9 vision + 9 text + 23 routing), 1.38s, no timeout. The PostToolUse error-triage hook's "test_timeout" warning was a false positive on the diff-grep output. Now let me verify test integrity — do the assertions actually fail on revert (real reference values, not stubs)? Let me probe the two highest-value cost/security claims by inverting the logic: the strict-free no-pay guarantee and the capability-escalation path.

### Assistant | 2026-06-19T19:52:40.558Z

[tool_use: Bash]

### User | 2026-06-19T19:52:45.953Z

[tool_result] mutation applied: false

### Assistant | 2026-06-19T19:52:48.858Z

The exact-string match failed (whitespace). Let me apply the mutation more robustly with a targeted line edit, run the test, then restore.

### Assistant | 2026-06-19T19:52:53.532Z

[tool_use: Bash]

### User | 2026-06-19T19:53:00.626Z

[tool_result] mutated queryVision strict-free guard
       |                        ^
    101|     expect(res.model).toBe("qwen2.5vl:7b (ollama)");
    102|   });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  1 failed | 8 passed (9)
   Start at  14:52:59
   Duration  249ms (transform 132ms, setup 0ms, import 52ms, tests 14ms, environment 0ms)

RESTORED

### Assistant | 2026-06-19T19:53:04.898Z

The strict-free test is real: dropping the `_providerOrder().includes("claude")` guard makes the strict-free test fail (it throws "strict-free must never call Claude"). The no-pay guarantee is genuinely enforced and genuinely tested. Restored confirmed.

Let me now verify the regex backtracking concern and the `min_answer_chars: 0` edge case, then check the floating-promise / unhandled-rejection question in the `_withTimeout` race for the vision path.

### Assistant | 2026-06-19T19:53:11.834Z

[tool_use: Bash]

### User | 2026-06-19T19:53:17.201Z

[tool_result] n=100000  no-match=1ms  full-match=0ms
n=500000  no-match=1ms  full-match=1ms
n=1000000  no-match=1ms  full-match=1ms
floor when min=0: 0
floor when min=undefined,low: 1

### Assistant | 2026-06-19T19:53:25.948Z

No catastrophic backtracking — the regex is linear (the `[a-z0-9.+/-]+` group is anchored with `^` and a single-pass `[\s\S]*` tail; no nested/overlapping quantifiers). A 1MB malformed payload resolves in ~1ms. Safe.

Now a subtle finding: `min_answer_chars: 0` makes `floor = 0` (nullish coalescing keeps 0). Then `text.length < 0` is always false, so an empty-after-trim answer (e.g. all-whitespace) would pass the floor. But upstream the `r.value !== "" ` guard only checks the raw value before trim — a whitespace-only `" "` value passes `!== ""` and then `_visionAnswerAdequate` with `floor=0` returns adequate. This is a low-severity edge (P2 at most), and identical behavior exists in the unchanged text path, so it's not a regression. Let me verify whether whitespace-only slips through and confirm the offline path's no-cache behavior plus check for floating promises in the timeout race.

### Assistant | 2026-06-19T19:53:38.424Z

[tool_use: Bash]

### User | 2026-06-19T19:53:42.440Z

[tool_result] /usr/bin/bash: line 69: warning: here-document at line 39 delimited by end-of-file (wanted `"'EOF'"')

### Assistant | 2026-06-19T19:53:45.676Z

The heredoc quoting got mangled. Let me write the probe file directly with the Write-free approach using a node script that writes it.

### Assistant | 2026-06-19T19:53:52.769Z

[tool_use: Bash]

### User | 2026-06-19T19:54:00.093Z

[tool_result] probe written
WS-EDGE model= qwen2.5vl:7b (ollama) answerLen= 3
R1 model= offline
R2 model= offline ans= "No vision AI provider availab
 Test Files  1 passed (1)
      Tests  2 passed (2)
probe removed

### Assistant | 2026-06-19T19:54:18.677Z

Both probes confirmed:
- **Whitespace-floor edge (P2):** `min_answer_chars: 0` accepts a whitespace-only `"   "` local read as adequate (`floor=0`, `length 3 >= 0`, no leading-refusal). A vision model returning padding/whitespace would be returned as a "successful" read. Low severity, opt-in (caller must explicitly pass `0`), and the same behavior exists in the unchanged text path — not a regression introduced by this commit. Worth a one-line note, not a blocker.
- **Offline no-cache:** confirmed correct. R1 offline, R2 still offline only because the adaptive cooldown is active (a transient outage is NOT pinned by the cache; offline results are never written to `this.cache`). The `query()`/`queryVision()` only `cache.set` on the Ollama-adequate and Claude-success paths, never on offline.

Now let me confirm the offline-not-cached claim by inspecting whether `queryVision` writes to cache at all (it should not — the text path caches, vision does not) and that there are no floating promises. The `_withTimeout` race wraps the provider promise in `.catch` and clears the timer in `.finally` — the timer is `unref`'d. The Claude vision path is awaited inside try/catch. No floating promise in `queryVision`. Let me do a final cross-check: verify the cache-key collision concern is N/A for vision (it never caches) and confirm media_type from a malicious data: prefix can't inject anything into the Claude request body.

### Assistant | 2026-06-19T19:54:19.533Z

[tool_use: Grep]

### User | 2026-06-19T19:54:22.968Z

[tool_result] 402:            this.cache.set(cacheKey, { response: result, expires: Date.now() + 300_000 });
427:        this.cache.set(cacheKey, { response: result, expires: Date.now() + 300_000 });

### Assistant | 2026-06-19T19:54:24.940Z

[tool_use: Bash]

### User | 2026-06-19T19:54:32.006Z

[tool_result] evil prefix match: NO MATCH (falls to default image/png)
caller media_type is JSON.stringify-escaped -> no body injection, but unvalidated value forwarded

### Assistant | 2026-06-19T19:54:40.013Z

Confirmed:
- Both `cache.set` calls are at lines 402 and 427 — both inside `query()` (text path). `queryVision()` (lines 458-539) NEVER caches. The doc claim "NOT cached" is true and verified.
- The data: prefix regex is injection-safe: a malicious prefix with embedded JSON-breaking chars simply fails the `[a-z0-9.+/-]+` group and falls to the default `image/png`. A caller-supplied `media_type` is forwarded verbatim but `JSON.stringify`-escaped into the request body, so no body injection is possible. (An invalid media_type would just make the Anthropic API reject the request — fail-loud, paid call would 4xx, no silent cost.)

I have traced every requested concern. Let me do one last verification: confirm api_key is never logged/leaked. The `_callClaudeVision` puts it only in the `x-api-key` header (not in any thrown error message or log), and `stats()` returns only `has_api_key: !!this.config.api_key` (boolean, not the value). Let me grep for any logging of the key.

### Assistant | 2026-06-19T19:54:40.745Z

[tool_use: Bash]

### User | 2026-06-19T19:54:57.140Z

[tool_result] 30:  api_key?: string;
179:      api_key: config?.api_key ?? process.env.ANTHROPIC_API_KEY,
392:            !!this.config.api_key && this._providerOrder().includes("claude");
415:      if (!this.config.api_key) continue; // no key -> skip to offline
495:            !!this.config.api_key && this._providerOrder().includes("claude");
514:      if (!this.config.api_key) continue; // no key -> skip to 
... [+177 chars truncated]

### Assistant | 2026-06-19T19:55:23.103Z

All `api_key` uses are safe: truthiness gates (392, 415, 495, 514), the two `x-api-key` headers (606 vision, 763 text — never logged), and `has_api_key: !!...` boolean in `stats()` (745). The key is never logged, never thrown in an error message, never surfaced in any return value. No leakage.

I have completed the full independent analysis. Here is my verdict.

---

VERDICT: PASS

summary: The vision path is a clean, additive mirror of the proven text `query()` ladder. The existing text path (`query`/`_ollamaAnswerAdequate`/`_callClaude`/`_defaultOllamaGenerate`/`_withTimeout`) is byte-UNCHANGED (diff shows pure additions); the only mutation to existing code is one defaulted constructor line for `ollama_vision_model`, so no consumer breaks. Cost-safety, no-leak, no-cache, and regex-backtracking are all verified by live execution, and the 9 vision tests are real (the strict-free no-pay test fails on a deliberate mutation).

findings:
  - [P2] `LLMEngine.ts:555` (and the unchanged text twin at `:225`) -- `min_answer_chars: 0` makes the adequacy `floor` = 0 (nullish coalescing keeps the 0), so a whitespace-only local read (e.g. `"   "`) passes `text.length < 0 === false` and is returned as an adequate `(ollama)` answer (verified live: model `qwen2.5vl:7b (ollama)`, answerLen 3). Opt-in only (caller must pass `0`), identical to the pre-existing text path, so NOT a regression -- but a caller using `0` to mean "accept anything non-empty" gets whitespace treated as a real read. -- Fix (optional): clamp floor to `Math.max(1, input.min_answer_chars ?? ...)`, or document that `0` disables the floor entirely.
  - [P2] `LLMEngine.ts:543-548` / `_callClaudeVision:599` -- a caller-supplied `VisionImage.media_type` is forwarded verbatim into the Claude request `source.media_type` with no allowlist validation (only the data:-prefix-derived media_type is regex-constrained). It is `JSON.stringify`-escaped so there is NO body/JSON injection and NO silent cost (an invalid type yields 
... [+2408 chars truncated]
