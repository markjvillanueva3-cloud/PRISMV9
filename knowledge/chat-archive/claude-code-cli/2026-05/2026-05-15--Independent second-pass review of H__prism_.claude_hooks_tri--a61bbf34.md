---
type: "chat-session"
source: "claude-code-cli"
session_id: "a61bbf34-4093-44f3-a8af-e68d61dc41a9"
title: "Independent second-pass review of H:/prism/.claude/hooks/tribal-by-domain-inject"
date: "2026-05-15"
first_ts: "2026-05-15T18:58:08.015Z"
last_ts: "2026-05-15T18:59:42.077Z"
cwd: "H:\\prism"
messages: 15
user_msgs: 6
assistant_msgs: 9
raw_file: "H:/.claude/projects/H--prism/a61bbf34-4093-44f3-a8af-e68d61dc41a9/subagents/agent-accf7dbc4124833bf.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:20"
---

# Independent second-pass review of H:/prism/.claude/hooks/tribal-by-domain-inject

> **claude-code-cli** | 2026-05-15 | 15 msgs (6 user / 9 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/a61bbf34-4093-44f3-a8af-e68d61dc41a9/subagents/agent-accf7dbc4124833bf.jsonl`

## Transcript

### User | 2026-05-15T18:58:08.015Z

Independent second-pass review of H:/prism/.claude/hooks/tribal-by-domain-inject.mjs (132 LOC, UserPromptSubmit injector, SYSTEM-VIZ-BRAIN-MS0/U-P1-TRIBAL-BY-DOMAIN-INJECT) AND its test file H:/prism/.claude/hooks/tribal-by-domain-inject.test.mjs (220 LOC, node:test, 36 tests passing).

Read both files end-to-end. Do NOT assume Reviewer A caught everything — weight your review on what they're likely to miss:
1. **Test quality** — are tests asserting real behavior or shallow stubs? Edge cases for `extractPrompt` (XSS-like nested objects, prototype pollution via `__proto__`)? Coverage gap for the subprocess-call path (no mock for runRerank — that's intentional, but is the parseRerankOutput contract test sufficient)?
2. **Inlined constants** — `DOMAIN_MAP` is a hardcoded 5-row table of word→domain. Is it complete? Does it match the 6 domains tribal-rerank actually accepts (`mill|lathe|wedm|cad|cam|general`)? Any token miss that would surprise an operator?
3. **Silent breakage / regression risk** — if `wiki-domain-bias.mjs` ever changes its export signature, this hook breaks silently (no integration test exercises the helper). Worth a brittle-coupling note?
4. **Error budget** — every failure path is `{continue:true}` (advisory-only). Confirm that. Look for any path that could throw and propagate out of `main()` without the trailing `.catch(() => approve())`.
5. **I/O security** — pattern `--query <prompt>` passed to execFileSync as separate arg (not shell). Confirm no command injection surface. Any path where prompt content could break out?
6. **Integration coupling** — sits in UserPromptSubmit chain after master-index-precheck-inject. Could 5s timeout add tail latency to every user prompt?

Smoke test passed live, 36/36 tests green. Grade PASS/FAIL with P0/P1/P2 findings. Under 400 words.

### Assistant | 2026-05-15T18:58:18.038Z

I'll read both files end-to-end before reviewing.

### Assistant | 2026-05-15T18:58:19.022Z

[tool_use: Read]

### Assistant | 2026-05-15T18:58:19.502Z

[tool_use: Read]

### User | 2026-05-15T18:58:21.905Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\tribal-by-domain-inject.mjs' was already read 19s ago in this session and is unchanged (mtime 1778871115229). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-15T18:58:27.802Z

[tool_result] 1	#!/usr/bin/env node
2	// tribal-by-domain-inject.test.mjs — hermetic node:test suite
3	//
4	// Pure-function tests for extractPrompt / inferTribalDomain /
5	// parseRerankOutput / formatInjection. No Ollama / no subprocess.
6	//
7	// Run: node --test H:/prism/.claude/hooks/tribal-by-domain-inject.test.mjs
8	
9	import { describe, it } from "node:test";
10	import assert from "node:assert/strict";

... [+9471 chars truncated]

### Assistant | 2026-05-15T18:58:31.025Z

I have both files fully in context. Proceeding to review.

### Assistant | 2026-05-15T18:58:32.398Z

[tool_use: Read]

### User | 2026-05-15T18:58:34.843Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\tribal-by-domain-inject.mjs' was already read 32s ago in this session and is unchanged (mtime 1778871115229). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-15T18:58:38.079Z

The guard says I have it in context, but I don't actually see the .mjs file content in my context window — only the test file. Let me work around the cache.

### Assistant | 2026-05-15T18:58:39.234Z

[tool_use: Bash]

### User | 2026-05-15T18:58:49.488Z

[tool_result] Exit code 127
/usr/bin/bash: line 1: :PRISM_READ_CACHE=0: command not found
/usr/bin/bash: line 1: Get-Content: command not found
/usr/bin/bash: line 1: Out-String: command not found

### Assistant | 2026-05-15T18:58:52.037Z

[tool_use: PowerShell]

### User | 2026-05-15T18:59:08.539Z

[tool_result] #!/usr/bin/env node
// tier: T2
// tribal-by-domain-inject.mjs — UserPromptSubmit
//
// SYSTEM-VIZ-BRAIN-MS0/U-P1-TRIBAL-BY-DOMAIN-INJECT.
//
// Sibling of U-P1-WIKI-PRELOAD-BY-DOMAIN: the wiki-precheck-inject hook
// already biases wiki-entry ranking toward the active chat-slot's milestone
// domain (mill/lathe/wedm/cad/cam). This hook does the SAME for tribal
// knowledge — surfaces top-K tribal
... [+7573 chars truncated]

### Assistant | 2026-05-15T18:59:42.077Z

Now I have the full hook source. Reviewing both files end-to-end as the independent second-pass reviewer.

## Review Verdict: PASS (with P1/P2 findings)

### P1 findings (fix before next file)

**P1-A — `extractPrompt` is vulnerable to prototype-pollution-style truthy coercion.** Line `const p = input.prompt || input.user_prompt || (input.hook_input && input.hook_input.prompt) || ...` — if a caller passes `{prompt: ""}` (empty string, falsy), it falls through to `user_prompt`, etc. That's the right behavior. BUT: `Object.create(null)` style inputs with `__proto__: { prompt: "evil" }` won't trigger here (good — `||` reads own+inherited equally, but `typeof p !== "string"` filters). However, the test suite has **zero coverage for prototype pollution or `__proto__`-injected keys**. Add one negative test: `extractPrompt(JSON.parse('{"__proto__":{"prompt":"x"}}'))` should return null. Not a security hole (downstream is execFile-with-args, not eval), but worth a regression assert.

**P1-B — `DOMAIN_MAP` token set is materially incomplete vs. real PRISM milestone vocab.** Missing common tokens from active milestones: `swiss`, `5axis`, `grinder` / `grinding` (mill domain?), `sinker` (wedm), `pcd` (wedm), `print-to-program` (cad), `solidcam`, `powermill`, `nx` (cam), `catia` (cad), `blueprint-ocr` (cad). Real milestone slugs like `CAD-FUSION-LIVE-MS0`, `WEDM-JM-DIE-MS1`, `LATHE-AGI-MS0` will tokenize through `getDomainTokens` and may produce tokens that miss the map entirely → silent fall-through to `"general"` (defeats the whole point of the hook on those exact milestones). The `cad-fusion-live-ms0` branch we're sitting on right now contains `cad` + `fusion` so it works — but `wedm-jm-die-ms1` would split to `wedm`+`jm`+`die`+`ms1` and only `wedm` matches.

### P2 findings (deferrable, log in handoff)

**P2-A — Brittle coupling to `wiki-domain-bias.mjs` exports unprotected.** Hook imports `getDomainTokens` + `chatIdFromInput` from helper but no integration test exercises th
... [+2694 chars truncated]
