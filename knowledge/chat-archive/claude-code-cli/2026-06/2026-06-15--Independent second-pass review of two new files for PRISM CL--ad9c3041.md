---
type: "chat-session"
source: "claude-code-cli"
session_id: "ad9c3041-c806-4424-9eed-fea97a4fc64b"
title: "Independent second-pass review of two new files for PRISM CLOUD-OVERFLOW-MS0 (sl"
date: "2026-06-15"
first_ts: "2026-06-15T16:17:44.833Z"
last_ts: "2026-06-15T16:24:36.414Z"
cwd: "H:\\prism"
messages: 29
user_msgs: 12
assistant_msgs: 17
raw_file: "H:/.claude/projects/H--prism/ad9c3041-c806-4424-9eed-fea97a4fc64b/subagents/agent-ad011cd3ddc4d2d4a.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:21"
---

# Independent second-pass review of two new files for PRISM CLOUD-OVERFLOW-MS0 (sl

> **claude-code-cli** | 2026-06-15 | 29 msgs (12 user / 17 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/ad9c3041-c806-4424-9eed-fea97a4fc64b/subagents/agent-ad011cd3ddc4d2d4a.jsonl`

## Transcript

### User | 2026-06-15T16:17:44.833Z

Independent second-pass review of two new files for PRISM CLOUD-OVERFLOW-MS0 (slot:alpha). Do NOT assume another reviewer caught everything. Read BOTH end-to-end:
- H:\prism\scripts\lib\openrouter-client.mjs
- H:\prism\scripts\lib\openrouter-client.test.mjs (21/21 pass)

Purpose: a key-gated client to route long-context/deep-research work to NVIDIA Nemotron-3 on OpenRouter (1M ctx, $0 free tier) instead of a local 87GB pull. It will be consumed by a new CLI (ask-openrouter.mjs) and the model-routing policy.

You are weighted toward: integration with already-built code (it mirrors scripts/ask-ollama.mjs -- check the contract matches: callOllama returns {ok,text,...}|{ok:false,error}, never throws), hidden coupling, SECURITY (external egress + secret handling), naming/convention conformance with the surrounding scripts/lib/*.mjs files, inlined constants, and stub assertions in the test.

Specifically:
- Convention conformance: does it match the pure-fn + injected-impl + fail-loud style of ask-ollama.mjs? ASCII-only (the repo has an ascii-guard hook -- flag any non-ASCII in the code)?
- Is the OpenRouter request body OpenAI-compatible-correct (model/messages/max_tokens/temperature/stream)? Are the attribution headers (HTTP-Referer/X-Title) correct for OpenRouter?
- Cost math in costFor: per-1M-token pricing -- is the arithmetic right (e.g. super paid 0.09/0.45 -> 1M+1M = $0.54)?
- Are there failure modes the tests miss (>=3 failure + >=2 adversarial expected)?
- Any quality regression risk if this is forced into the routing path?

Grade PASS or FAIL with P0/P1/P2 findings + file:line. Be terse.

### Assistant | 2026-06-15T16:17:55.271Z

I'll review both files end to end, plus the contract reference (ask-ollama.mjs).

### Assistant | 2026-06-15T16:17:55.272Z

[tool_use: Read]

### Assistant | 2026-06-15T16:17:55.276Z

[tool_use: Read]

### Assistant | 2026-06-15T16:17:55.280Z

[tool_use: Read]

### User | 2026-06-15T16:18:30.989Z

[tool_result] 1	/**
2	 * openrouter-client.mjs -- OpenRouter cloud LLM client
3	 * (CLOUD-OVERFLOW-MS0/U-OPENROUTER-CLIENT, slot:alpha 2026-06-15).
4	 *
5	 * Operator directive (2026-06-15): "wire cloud version, network is 1gb/sec". After the
6	 * gpt-oss:120b vs local-87GB-nemo vs OpenRouter assessment, route long-context /
7	 * deep-research / free-overflow work to NVIDIA Nemotron-3 on OpenRouter (1M context,
... [+12860 chars truncated]

### User | 2026-06-15T16:18:31.243Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * ask-ollama.mjs — local Ollama query service (OLLAMA-EXPAND-MS0/U-OE01)
4	 *
5	 * Routes token-heavy work to a LOCAL Ollama model so it never enters the
6	 * Claude context window. Claude invokes this via Bash; only the compact
7	 * answer returns. Heavy inputs — the ~27 MB system-viz graph, large source
8	 * files, build-error dumps — are processed here in the subp
... [+51768 chars truncated]

### User | 2026-06-15T16:18:31.275Z

[tool_result] 1	// scripts/lib/openrouter-client.test.mjs
2	// Tests for U-OPENROUTER-CLIENT pure functions + the injected-fetch shell. Real
3	// reference-value asserts (R9): each pins exact request/response shaping behaviour.
4	//
5	// NOTE: fake test keys are assembled at runtime (KP + "...") so the literal
6	// "sk-or-..." token never appears in source -- the anti-pattern secret detector
7	// (correctly) bl
... [+10895 chars truncated]

### Assistant | 2026-06-15T16:18:38.365Z

Both files read end to end, plus the contract reference (ask-ollama.mjs). Let me verify a few load-bearing claims: ASCII purity, the cost arithmetic, and whether the consumer (ask-openrouter.mjs) referenced in the header actually exists.

### Assistant | 2026-06-15T16:18:40.407Z

[tool_use: Bash]

### Assistant | 2026-06-15T16:18:42.158Z

[tool_use: Bash]

### User | 2026-06-15T16:18:52.377Z

[tool_result] grep: -P supports only unibyte and UTF-8 locales
ASCII-CLEAN: both files

### User | 2026-06-15T16:19:10.838Z

[tool_result] ask-openrouter.mjs DOES NOT EXIST
---
super paid 1M+1M = 0.54
ultra paid 1M prompt only = 0.5

### Assistant | 2026-06-15T16:19:13.922Z

The grep `-P` failed on locale; let me re-run the non-ASCII check with a portable method, and confirm the redactKey edge case behavior.

### Assistant | 2026-06-15T16:19:19.311Z

[tool_use: Bash]

### Assistant | 2026-06-15T16:19:21.812Z

[tool_use: Bash]

### User | 2026-06-15T16:20:10.254Z

[tool_result] ASCII-CLEAN: scripts/lib/openrouter-client.mjs
ASCII-CLEAN: scripts/lib/openrouter-client.test.mjs

### User | 2026-06-15T16:20:35.395Z

[tool_result] short sk- (7 char): "sk-abc123"
sk-or short: "sk-or-***"
default headers: {"Content-Type":"application/json","Authorization":"Bearer k","HTTP-Referer":"https://github.com/prism","X-Title":"PRISM"}
ultra paid 1M+1M: 3
buildChatBody with KEY not slug -> body.model: nemotron-super-free

### Assistant | 2026-06-15T16:20:39.391Z

I found a real coupling issue. Let me confirm it: `callOpenRouter` defaults `model = DEFAULT_MODEL_SLUG` (a slug) but if a caller passes a registry KEY (like `"nemotron-super-free"`) as `model`, `buildChatBody` ships that key verbatim as `body.model` without resolving it through `resolveModelSlug`. Let me verify whether the contract intends callers to pre-resolve.

### Assistant | 2026-06-15T16:20:40.763Z

[tool_use: Grep]

### Assistant | 2026-06-15T16:20:44.006Z

[tool_use: Bash]

### User | 2026-06-15T16:21:16.402Z

[tool_result] scripts\ask-hermes.mjs:95:export function buildChatBody({ mode, input, model, maxTokens }) {
scripts\ask-hermes.mjs:322:    const body = buildChatBody({ mode: args.mode, input: inp.text, model, maxTokens: args.maxTokens });
scripts\ask-hermes.test.mjs:11:  buildChatBody,
scripts\ask-hermes.test.mjs:35:// --- buildChatBody ---
scripts\ask-hermes.test.mjs:36:test("buildChatBody: builds a valid OpenA
... [+5674 chars truncated]

### User | 2026-06-15T16:22:26.059Z

[tool_result] callOpenRouter sent model = nemotron-super-free (expected the SLUG if it resolves; the KEY if it does not)

### Assistant | 2026-06-15T16:22:30.400Z

Confirmed the coupling issue. Let me check the sibling `ask-hermes.mjs` to compare the contract convention (since it's the closest existing OpenAI-compatible cloud client), and confirm whether `redactKey`'s 8-char floor is a real leak risk for actual OpenRouter keys.

### Assistant | 2026-06-15T16:22:31.219Z

[tool_use: Read]

### Assistant | 2026-06-15T16:22:38.834Z

[tool_use: Bash]

### User | 2026-06-15T16:22:39.287Z

[tool_result] 80	    case "explain":
81	      return "You are a senior engineer. Explain the given code in plain language: what it does, key control flow, and any risk. Be concise.";
82	    case "triage":
83	      return "You are a build/test triage assistant. Given an error or log dump, identify the most likely root cause and the single highest-value fix. Be specific and concise.";
84	    case "classify":
85	 
... [+2319 chars truncated]

### User | 2026-06-15T16:23:47.999Z

[tool_result] raw token no prefix: "deadbeefcafef00ddeadbeef"
nested err no message: "OpenRouter error: {\"code\":429,\"type\":\"rate\"}"
footer paid key: cloud(openrouter nemotron-super): 1000000 prompt + 1000000 completion tok, $0.540000 -- 0 tokens entered the Claude context

### Assistant | 2026-06-15T16:24:36.414Z

I have everything I need. The cost math is exactly right ($0.54 for super-paid 1M+1M, $3.00 for ultra 1M+1M, free tiers $0). ASCII-clean. The contract mirrors `callOllama` (returns `{ok,...}|{ok:false,error}`, never throws) and matches the sibling `ask-hermes.mjs` OpenAI-body convention. Tests are real reference-value asserts, not stubs, with the expected failure + adversarial coverage. Here is my independent verdict.

VERDICT: PASS

summary: `openrouter-client.mjs` is a clean, fail-soft, key-gated cloud client that faithfully mirrors the `callOllama`/`ask-hermes` contract (returns a value on every path, never throws), with correct OpenAI-compatible body shaping, correct OpenRouter attribution headers, and arithmetically correct per-1M cost math ($0.54 super-paid 1M+1M; $3.00 ultra; $0 free). It is ASCII-clean and the 21 tests are genuine reference-value asserts covering >=3 failure modes and >=2 adversarial inputs. No P0/P1 found; the findings below are P2 polish, none blocking.

findings:
- [P2] `scripts/lib/openrouter-client.mjs:130` and `:210-234` -- `callOpenRouter` defaults `model` to a slug and passes it straight to `buildChatBody`, which ships it verbatim as `body.model`. If a future caller (the not-yet-built `ask-openrouter.mjs`) passes a registry KEY like `"nemotron-super-free"` instead of a slug, OpenRouter receives the bogus model id `nemotron-super-free` and 400s. Verified live: `callOpenRouter({model:"nemotron-super-free"})` sends `model=nemotron-super-free`, not the slug. `resolveModelSlug` exists precisely to prevent this but `callOpenRouter` never calls it. Not a bug today (no consumer), but it is a latent foot-gun the moment the CLI wires in. Fix: resolve inside `callOpenRouter` (`model = resolveModelSlug(model)`) or document loudly that the caller MUST pre-resolve. The header at `:18-21` references `ask-openrouter.mjs` as the safety-guarding caller, but that file does not exist yet (verified absent) -- the R15 "wire to all consumers in the same co
... [+3419 chars truncated]
