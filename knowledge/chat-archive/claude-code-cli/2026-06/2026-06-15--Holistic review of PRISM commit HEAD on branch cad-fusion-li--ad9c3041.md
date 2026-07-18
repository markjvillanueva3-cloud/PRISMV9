---
type: "chat-session"
source: "claude-code-cli"
session_id: "ad9c3041-c806-4424-9eed-fea97a4fc64b"
title: "Holistic review of PRISM commit HEAD on branch cad-fusion-live-ms0 (CLOUD-OVERFL"
date: "2026-06-15"
first_ts: "2026-06-15T16:55:12.800Z"
last_ts: "2026-06-15T17:04:57.820Z"
cwd: "H:\\prism"
messages: 54
user_msgs: 20
assistant_msgs: 34
raw_file: "H:/.claude/projects/H--prism/ad9c3041-c806-4424-9eed-fea97a4fc64b/subagents/agent-a3df80d6f944c1ac0.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:21"
---

# Holistic review of PRISM commit HEAD on branch cad-fusion-live-ms0 (CLOUD-OVERFL

> **claude-code-cli** | 2026-06-15 | 54 msgs (20 user / 34 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/ad9c3041-c806-4424-9eed-fea97a4fc64b/subagents/agent-a3df80d6f944c1ac0.jsonl`

## Transcript

### User | 2026-06-15T16:55:12.800Z

Holistic review of PRISM commit HEAD on branch cad-fusion-live-ms0 (CLOUD-OVERFLOW-MS0/U-OPENROUTER-WIRE, slot:alpha). Run `git -C H:/prism show HEAD` to see the full diff (8 files, ~1105 insertions). It wires OpenRouter Nemotron-3 as a cloud long-context tier.

Files: scripts/lib/openrouter-client.mjs (+test), scripts/ask-openrouter.mjs (+test), scripts/lib/model-routing-policy.mjs (+test), .claude/hooks/model-tier-advisor.mjs, state/shared/specs/FEATURE-ROUTING-GRAPH.md.

Review for correctness, completeness, and convention conformance. Key invariants that MUST hold:
1. The cloud client NEVER throws, FAILS LOUD without OPENROUTER_API_KEY (no faked success, no network), and never leaks the key into any error.
2. The routing policy must NOT regress existing routing: build->opus, deep-think->fable, safety->frontier Claude, proven-mechanical->Ollama. The cloud tier fires only on explicit "use nemotron" or unambiguous deep-research/1M-context signals; routine read/summarize work must stay on Claude.
3. NC/G-code is refused for cloud egress.
4. Model slugs match what OpenRouter actually serves (verified live: nvidia/nemotron-3-super-120b-a12b:free etc.).
5. Tests are real reference-value asserts (R9), not stubs; no .skip/.only.

Grade PASS or FAIL with P0/P1/P2 + file:line. Terse. Note: an earlier per-file pass already fixed a P1 over-broad-match regression in the policy and a P1 redact case-sensitivity in the client -- confirm those are actually fixed in the committed code.

### Assistant | 2026-06-15T16:55:21.938Z

I'll review this commit. Let me start by examining the full diff and reading the changed files end-to-end.

### Assistant | 2026-06-15T16:55:22.729Z

[tool_use: Bash]

### User | 2026-06-15T16:56:20.035Z

[tool_result] commit cab3c1efbcceef7fa7b4d48d829d5a2caa11b663
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Mon Jun 15 11:54:14 2026 -0500

    [MAIN-FORCE] [CLOUD-OVERFLOW-MS0]/U-OPENROUTER-WIRE (slot:alpha): wire OpenRouter Nemotron-3 cloud long-context tier (1M ctx, $0 free)
    
    Operator: 'wire cloud version, network is 1gb/sec'. After the gpt-oss:120b vs local-87GB-nemo
    vs Ope
... [+3520 chars truncated]

### Assistant | 2026-06-15T16:56:23.280Z

Let me read all the changed files end-to-end. Starting with the core client and the routing policy.

### Assistant | 2026-06-15T16:56:23.708Z

[tool_use: Read]

### Assistant | 2026-06-15T16:56:24.221Z

[tool_use: Read]

### User | 2026-06-15T16:56:50.726Z

[tool_result] 1	/**
2	 * model-routing-policy.mjs -- pure: the SINGLE per-prompt model-routing verdict that fuses the
3	 * Claude-tier decision with the MEASURED Ollama capability matrix (U-MODEL-ROUTE-POLICY, slot:india
4	 * 2026-06-11). This is the brain the advisor hook calls.
5	 *
6	 * OPERATOR POLICY (2026-06-11, "fable demolished session limits") -> one verdict per prompt:
7	 *   - ollama  : mechanical ta
... [+9127 chars truncated]

### User | 2026-06-15T16:56:50.743Z

[tool_result] 1	/**
2	 * openrouter-client.mjs -- OpenRouter cloud LLM client
3	 * (CLOUD-OVERFLOW-MS0/U-OPENROUTER-CLIENT, slot:alpha 2026-06-15).
4	 *
5	 * Operator directive (2026-06-15): "wire cloud version, network is 1gb/sec". After the
6	 * gpt-oss:120b vs local-87GB-nemo vs OpenRouter assessment, route long-context /
7	 * deep-research / free-overflow work to NVIDIA Nemotron-3 on OpenRouter (1M context,
... [+14350 chars truncated]

### Assistant | 2026-06-15T16:56:53.370Z

Now let me read the CLI, the advisor hook, the spec, and the two test files.

### Assistant | 2026-06-15T16:56:53.837Z

[tool_use: Read]

### Assistant | 2026-06-15T16:56:54.214Z

[tool_use: Read]

### User | 2026-06-15T16:57:26.241Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * ask-openrouter.mjs -- OpenRouter cloud query service
4	 * (CLOUD-OVERFLOW-MS0/U-ASK-OPENROUTER, slot:alpha 2026-06-15).
5	 *
6	 * Operator directive (2026-06-15): "wire cloud version, network is 1gb/sec". The
7	 * executable counterpart to ask-ollama.mjs, but for the CLOUD long-context tier:
8	 * routes deep-research / huge-document / free-overflow work to NVIDIA N
... [+15178 chars truncated]

### User | 2026-06-15T16:57:26.380Z

[tool_result] 1	// tier: T2
2	/**
3	 * model-tier-advisor.mjs -- UserPromptSubmit hook (U-MODEL-TIER-ADVISOR, slot:india 2026-06-11).
4	 *
5	 * THE OPERATOR GOAL (2026-06-11, "fable demolished session limits"): auto-enforced model switching --
6	 * fable for deep planning/reasoning, opus for building/coding, ollama for verified-100% mechanical,
7	 * sonnet/haiku for capable tasks. The main-loop model CANNOT be 
... [+5342 chars truncated]

### Assistant | 2026-06-15T16:57:40.440Z

Now let me read the two test files and the spec, plus verify the `looksLikeNcProgram` import contract from ask-ollama.

### Assistant | 2026-06-15T16:57:40.701Z

[tool_use: Read]

### Assistant | 2026-06-15T16:57:40.781Z

[tool_use: Read]

### User | 2026-06-15T16:58:54.626Z

[tool_result] 1	// scripts/ask-openrouter.test.mjs
2	// Tests for U-ASK-OPENROUTER pure functions + runRequest (injected deps). R9 reference-value asserts.
3	import { test } from "node:test";
4	import assert from "node:assert/strict";
5	import {
6	  parseArgs, systemPromptFor, capForMode, buildFallbackSignal, renderModels, readCapped, runRequest,
7	  MAX_SUMMARIZE_BYTES, MAX_LONGREAD_BYTES, MAX_INPUT_CEILING,
8
... [+8435 chars truncated]

### User | 2026-06-15T16:58:54.681Z

[tool_result] 1	// scripts/lib/openrouter-client.test.mjs
2	// Tests for U-OPENROUTER-CLIENT pure functions + the injected-fetch shell. Real
3	// reference-value asserts (R9): each pins exact request/response shaping behaviour.
4	//
5	// NOTE: fake test keys are assembled at runtime (KP + "...") so the literal
6	// "sk-or-..." token never appears in source -- the anti-pattern secret detector
7	// (correctly) bl
... [+13151 chars truncated]

### Assistant | 2026-06-15T16:59:07.260Z

Now let me read the routing-policy test, the spec, and verify the `looksLikeNcProgram`/`readStdin` exports from ask-ollama, plus check what `routeClaudeTier` and `classifyTaskClass` return for verb-overlap regression concerns.

### Assistant | 2026-06-15T16:59:07.261Z

[tool_use: Read]

### Assistant | 2026-06-15T16:59:07.289Z

[tool_use: Read]

### User | 2026-06-15T16:59:29.823Z

[tool_result] 1	// scripts/lib/model-routing-policy.test.mjs
2	// Tests for U-MODEL-ROUTE-POLICY: per-prompt verdict fusing tier-router + capability matrix.
3	
4	import { describe, it } from "node:test";
5	import assert from "node:assert/strict";
6	import { ollamaSafeClassModels, routePrompt, routeCloudLongContext, BATTERY_TO_CLASS } from "./model-routing-policy.mjs";
7	
8	// A matrix shaped like ollama-capabil
... [+7977 chars truncated]

### User | 2026-06-15T16:59:29.981Z

[tool_result] 1	# PRISM Feature-Routing Graph — the followable "what to use, when" policy
2	
3	> **FEATURE-ROUTING-GRAPH-MS0 / U-ROUTING-GRAPH** (slot:alpha, 2026-06-15).
4	> Operator directive: *"build a graph for you to follow on the most token-efficient way to do
5	> every tool call and every task we've ever done"* + *"auto-invoke [commands] in a session without
6	> me having to type them in."*
7	>
8	> This 
... [+13715 chars truncated]

### Assistant | 2026-06-15T16:59:35.721Z

Now let me verify the two upstream dependencies that are load-bearing for the no-regression invariant: `looksLikeNcProgram`/`readStdin` exports from ask-ollama, and the `routeClaudeTier` + `classifyTaskClass` + `isSafetyCritical` contracts. Let me also check the CLOUD_VETO verb overlap against build/think classification.

### Assistant | 2026-06-15T16:59:37.732Z

[tool_use: Bash]

### Assistant | 2026-06-15T16:59:39.250Z

[tool_use: Bash]

### User | 2026-06-15T17:00:10.663Z

[tool_result] === ask-ollama exports ===
365:export function looksLikeNcProgram(text) {
=== looksLikeNcProgram body ===
365:export function looksLikeNcProgram(text) {
366-  const lines = String(text == null ? "" : text).split(/\r?\n/);
367-  let nonBlank = 0;
368-  let strong = 0;
369-  let cont = 0;
370-  for (const line of lines) {
371-    if (!line.trim()) continue;
372-    nonBlank += 1;
373-    if (NC_BLOC
... [+703 chars truncated]

### User | 2026-06-15T17:00:23.698Z

[tool_result] === routeClaudeTier signature ===
69:export function routeClaudeTier({ task }) {
70-  const text = typeof task === "string" ? task : "";
71-  if (isSafetyCritical(text)) return { tier: SAFETY_TIER, reason: "safety-critical -> frontier (opus)", taskClass: "safety_critical" };
72-  const { taskClass, category } = classifyTaskClass(text);
73-  // THINK -> fable (keyword or inherently-think class).
74
... [+594 chars truncated]

### Assistant | 2026-06-15T17:00:27.194Z

The exports are confirmed. Now let me verify the `readStdin` export exists (it's imported but my first grep only matched `looksLikeNcProgram`), and verify model slugs more carefully, and check the `SAFETY_PATTERNS` to confirm "safety" beats explicit cloud. Let me also run the tests to confirm they pass and check for `.skip`/`.only`.

### Assistant | 2026-06-15T17:00:29.518Z

[tool_use: Bash]

### User | 2026-06-15T17:01:06.901Z

[tool_result] === readStdin export ===
791:export async function readStdin({ stream = process.stdin, maxBytes = MAX_FILE_BYTES } = {}) {
=== .skip/.only check ===
NONE FOUND (good)
=== SAFETY_PATTERNS sample ===
48:export const SAFETY_PATTERNS = [
49-  /\bS\(x\)\b/i,
50-  /\b(omega|Ω)\s*(gate|threshold|score)/i,
51-  /\b(safety|S\(x\))\s*(gate|validat|review|check)/i,
52-  // speeds & feeds — any single machine
... [+625 chars truncated]

### Assistant | 2026-06-15T17:01:09.688Z

All upstream contracts verified. Now let me run the three test files to confirm 87/87 and that they actually pass against the committed code.

### Assistant | 2026-06-15T17:01:11.509Z

[tool_use: Bash]

### User | 2026-06-15T17:01:25.860Z

[tool_result]   ...
# Subtest: callOpenRouter: invalid messages fails before network
ok 46 - callOpenRouter: invalid messages fails before network
  ---
  duration_ms: 0.1963
  ...
# Subtest: callOpenRouter: a registry KEY is resolved to its slug before the request (no 400 foot-gun)
ok 47 - callOpenRouter: a registry KEY is resolved to its slug before the request (no 400 foot-gun)
  ---
  duration_ms: 0.2851
  
... [+337 chars truncated]

### Assistant | 2026-06-15T17:01:30.618Z

64 pass, 0 fail, 0 skipped. (The "87/87" in the commit msg counts tests differently — node's `# tests 64` counts top-level subtests; 25+18+ the policy tests reconcile to the commit's count once `describe`-nested `it`s are tallied. All pass, none skipped.) Let me verify the two specific fixes mentioned, and check the `redactKey` Bearer-rule ordering for any leak edge case, plus confirm the over-broad-match regression fix is actually in the committed code (vs only in tests).

### Assistant | 2026-06-15T17:01:34.173Z

[tool_use: Bash]

### User | 2026-06-15T17:01:39.629Z

[tool_result] === confirm the over-broad pattern is GONE from policy source (was the regression) ===
38:// The earlier generic "(analyze|read|review|summarize) ... (entire|whole|all) <noun>" pattern
39:// was a fleet-wide quality regression -- it stole routine "review the whole module" /
40:// "summarize the whole document" work from sonnet/fable. When in doubt, Claude quality wins;

=== confirm redactKey is /g
... [+212 chars truncated]

### Assistant | 2026-06-15T17:01:46.232Z

Both pre-noted P1 fixes are confirmed in the committed code: the over-broad `(analyze|read|review|summarize)...(entire|whole|all)` pattern is genuinely gone from `CLOUD_LONGCTX` (only referenced in the comment explaining its removal; the live patterns at lines 42-46 are narrow), and all three `redactKey` rules carry the `gi` (case-insensitive) flag.

Now let me probe two adversarial edge cases I want to verify directly: (1) does the implicit `CLOUD_LONGCTX` `research (across|the entire|the whole|all)` pattern leak into routine "summarize across the team" style prompts, and (2) does the `routePrompt` non-mechanical longctx path correctly defer to Claude when there is NO matrix (the `cloud` branch fires before the Claude tier branch — confirm it doesn't steal `fix`/`recall` work). Let me also verify the model slugs against a live source if reachable.

### Assistant | 2026-06-15T17:01:54.394Z

[tool_use: Bash]

### User | 2026-06-15T17:02:26.698Z

[tool_result] node:internal/modules/esm/load:217
    throw new ERR_UNSUPPORTED_ESM_URL_SCHEME(parsed, schemes);
          ^

Error [ERR_UNSUPPORTED_ESM_URL_SCHEME]: Only URLs with a scheme in: file, data, and node are supported by the default ESM loader. On Windows, absolute paths must be valid file:// URLs. Received protocol 'h:'
    at throwIfUnsupportedURLScheme (node:internal/modules/esm/load:217:11)

... [+499 chars truncated]

### Assistant | 2026-06-15T17:02:32.727Z

Windows ESM needs `file://` URLs. Let me use a relative import path from cwd instead.

### Assistant | 2026-06-15T17:02:32.967Z

[tool_use: Bash]

### User | 2026-06-15T17:02:59.171Z

[tool_result] "research across the team's preferences" -> CLOUD(explicit=false)
"research the whole supplier list" -> CLOUD(explicit=false)
"summarize across the three quotes" -> null
"fix the failing test in the cloud module" -> null
"deploy to the cloud tier" -> CLOUD(explicit=true)
"what did we decide about the openrouter wiring" -> null
--- routePrompt full (no matrix) ---
"deep research across the entire c
... [+220 chars truncated]

### Assistant | 2026-06-15T17:03:04.629Z

This surfaces two real findings. Let me confirm the second one (`fix ... cloud tier handler` → cloud, vetoless) is genuinely a routing problem by checking whether `fix` verbs are in `CLOUD_VETO` — they are not. The `CLOUD_EXPLICIT` rule `/\bcloud\s+(model|llm|tier)\b/i` matches any prompt containing the phrase "cloud tier"/"cloud model" regardless of intent, and is treated as `explicit=true`, which beats even the Ollama offload and is NOT subject to `CLOUD_VETO`.

Let me confirm the exact veto/explicit ordering and that `fix`/`debug` are absent from the veto list.

### Assistant | 2026-06-15T17:03:07.302Z

[tool_use: Bash]

### User | 2026-06-15T17:03:15.611Z

[tool_result] === CLOUD_VETO contents (does it cover fix/debug/explain/recall?) ===
52:const CLOUD_VETO = [
53-  /\b(build|implement|create|rewrite|wire\s+(up|the|in)|scaffold|refactor|generate|write\s+the\s+(code|engine|test|hook|dispatcher)|add\s+(the|a)\s+(engine|test|hook|dispatcher|action))\b/i,
54-  /\b(design|architect|brainstorm|plan\s+(the|a|out)\b|strateg(y|ize))\b/i,
55-];

=== Is the explicit-cloud 
... [+231 chars truncated]

### Assistant | 2026-06-15T17:03:29.091Z

Confirmed. The behavior is as designed in the code, but the design has a quality gap. Let me assess severity precisely against the stated invariant #2 ("routine read/summarize work must stay on Claude... cloud tier fires only on explicit 'use nemotron' or unambiguous deep-research/1M-context signals").

The two findings:

1. **`/\bcloud\s+(model|llm|tier)\b/i` over-matches incidental phrasing as `explicit=true`.** A prompt like "fix the bug in the cloud tier handler" or "deploy to the cloud tier" matches `CLOUD_EXPLICIT` rule (b), is classified `explicit=true`, and therefore routes to OpenRouter — bypassing the `CLOUD_VETO` (which only fires after the explicit check) AND beating the Ollama offload AND beating the Claude `fix`/`session` tier. "cloud tier" / "cloud model" are common phrases that name a *topic* ("the cloud tier handler", "deploy to the cloud tier", "our cloud model pricing"), not a routing request. This is the same class of regression the per-file pass fixed in `CLOUD_LONGCTX`, but it lives in `CLOUD_EXPLICIT` and was not narrowed. The intended trigger is "use/via/route to the cloud" — covered by rule (a) and the nemotron-named rule (b's first regex). Rule (c) `\bcloud\s+(model|llm|tier)\b` is the over-broad one.

2. **`research (across|the entire|the whole|all)` fires on non-research "research" prompts** — "research across the team's preferences", "research the whole supplier list" route to cloud (`explicit=false`). These are arguably legitimate research, and they are `explicit=false` so they are gated behind the Ollama offload + are NOT safety — lower severity than #1, but worth noting the `CLOUD_LONGCTX` `research` arm is broader than "deep research".

Let me verify the model slugs against the live OpenRouter API since the invariant calls it out explicitly (network is available per operator "1gb/sec"), and confirm there is no NC-refusal gap on the text modes (ask/research).

### Assistant | 2026-06-15T17:03:30.105Z

[tool_use: Bash]

### User | 2026-06-15T17:04:00.791Z

[tool_result] "nvidia/nemotron-3-super-120b-a12b"
"nvidia/nemotron-3-super-120b-a12b:free"
"nvidia/nemotron-3-ultra-550b-a55b"
"nvidia/nemotron-3-ultra-550b-a55b:free"

### Assistant | 2026-06-15T17:04:08.505Z

All four model slugs are confirmed live-served by OpenRouter as of today. The slug invariant (#4) holds.

Now let me confirm one more thing on the text-mode (ask/research) path: the NC-refusal only guards the **file** modes (`summarize`/`longread`), not `ask`/`research`. That is acceptable since text-mode input comes directly from the operator's typed query (not a piped file/program), but I want to confirm there is no path where program content reaches `ask`/`research`. Reviewing the code: text modes take `input` from positional argv only — no file/stdin read — so a G-code program can't arrive there unless the operator literally types it, which `--allow-unsafe` philosophy already covers. This is consistent and not a gap.

Let me do a final check on the `redactKey` Bearer-rule ordering for a subtle leak: if a token appears as `sk-or-...` *and* the first rule rewrites it, does the bare-`sk-` rule still operate correctly without re-exposing anything.

### Assistant | 2026-06-15T17:04:14.695Z

[tool_use: Bash]

### User | 2026-06-15T17:04:32.328Z

[tool_result] 1 bearer: ok
2 bare  : ok
3 upper : ok
4 json  : ok
5 rawscrub: ok
6 shortkey-nomangle: hello world

### Assistant | 2026-06-15T17:04:57.820Z

All six redaction leak vectors pass — no key material survives any error path, and short secrets don't mangle the string. Invariant #1 (never throws, fails loud without key, never leaks the key) is fully satisfied. (The re-anchor reminder is for the host session, not this review task; my objective remains the review.)

I have everything needed. Final assessment.

---

VERDICT: FAIL

summary: The OpenRouter cloud tier is well-engineered — fail-loud, never-throws, key never leaks (6 leak vectors verified clean), slugs confirmed live against the OpenRouter API today, NC/G-code refused on the file path, real R9 reference-value tests (64 pass, 0 skip/only), and the two pre-noted P1 fixes (over-broad `CLOUD_LONGCTX` removal + case-insensitive `redactKey`) are genuinely in the committed code. However, the same over-broad-match class the per-file pass fixed in `CLOUD_LONGCTX` survives uncorrected in `CLOUD_EXPLICIT`: the phrase "cloud tier"/"cloud model" is matched as an explicit cloud request, so incidental topic-mentions ("fix the bug in the cloud tier handler", "deploy to the cloud tier") route to OpenRouter as `explicit=true`, bypassing the veto and stealing build/fix/session work from Claude — a direct violation of invariant #2.

findings:
- [P1] scripts/lib/model-routing-policy.mjs:34 — `CLOUD_EXPLICIT` rule `/\bcloud\s+(model|llm|tier)\b/i` matches incidental phrasing ("the cloud tier handler", "deploy to the cloud tier", "our cloud model pricing") and classifies it `explicit=true`. Because the explicit branch (line 71) runs BEFORE `CLOUD_VETO` (line 74) and beats the Ollama offload + the Claude tier, a `fix`/`build`/`session` prompt that merely *names* a cloud tier gets routed to OpenRouter. Verified live: `routePrompt({prompt:"fix the bug in the cloud tier handler"})` → `openrouter`. This is the exact over-broad-match quality regression the per-file pass narrowed in `CLOUD_LONGCTX` (lines 38-41 comment), left unfixed in the sibling rule, and it violates the stated 
... [+2457 chars truncated]
