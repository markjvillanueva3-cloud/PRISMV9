---
type: "chat-session"
source: "claude-code-cli"
session_id: "ad9c3041-c806-4424-9eed-fea97a4fc64b"
title: "Review a routing-brain change for PRISM CLOUD-OVERFLOW-MS0 (slot:alpha). Read bo"
date: "2026-06-15"
first_ts: "2026-06-15T16:38:42.899Z"
last_ts: "2026-06-15T16:41:06.309Z"
cwd: "H:\\prism"
messages: 24
user_msgs: 9
assistant_msgs: 15
raw_file: "H:/.claude/projects/H--prism/ad9c3041-c806-4424-9eed-fea97a4fc64b/subagents/agent-a3cc2179c7859fdae.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:21"
---

# Review a routing-brain change for PRISM CLOUD-OVERFLOW-MS0 (slot:alpha). Read bo

> **claude-code-cli** | 2026-06-15 | 24 msgs (9 user / 15 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/ad9c3041-c806-4424-9eed-fea97a4fc64b/subagents/agent-a3cc2179c7859fdae.jsonl`

## Transcript

### User | 2026-06-15T16:38:42.899Z

Review a routing-brain change for PRISM CLOUD-OVERFLOW-MS0 (slot:alpha). Read both end-to-end:
- H:\prism\scripts\lib\model-routing-policy.mjs (the per-prompt model-routing verdict; routePrompt is called by .claude/hooks/model-tier-advisor.mjs on EVERY UserPromptSubmit)
- H:\prism\scripts\lib\model-routing-policy.test.mjs (19/19 pass)

The change adds a NEW cloud-long-context tier (routeCloudLongContext) that routes to OpenRouter Nemotron-3 (engine:"openrouter"). CONTRACT (must hold, this changes routing fleet-wide):
1. Safety ALWAYS wins -- a safety-critical prompt must NEVER route to the cloud, even with an explicit "use nemotron" (isSafetyCritical is checked first in routePrompt).
2. The cloud tier must NOT steal quality work: a BUILD/codegen task with no cloud signal must stay on opus; deep reasoning must stay on fable. Building + a long-context signal must be VETOED to opus (CLOUD_VETO).
3. EXPLICIT "use nemotron/openrouter" beats the Ollama offload (operator named it); an IMPLICIT long-context signal is honored only AFTER the Ollama check (free-local beats free-cloud for proven-mechanical).
4. The default behavior for prompts with NO cloud signal must be byte-identical to before (regression: existing fable/opus/ollama/sonnet/haiku routing unchanged).

You are arm C: weighted toward SILENT BREAKAGE + regression risk + integration coupling. Specifically:
- Trace routePrompt's new control flow: is the order safety -> explicit-cloud -> ollama -> implicit-cloud -> claude EXACTLY right? Any prompt that now routes differently than before when it shouldn't?
- Are the CLOUD_EXPLICIT / CLOUD_LONGCTX / CLOUD_VETO regexes over-broad? Could a normal build/reason/everyday prompt accidentally trigger the cloud tier (a quality regression -- the operator's hard requirement is "without losing quality")? Test mentally: "review the entire function", "read all the tests", "summarize this file", "analyze the bug".
- Could CLOUD_VETO fail to veto a real build that also has a long-co
... [+243 chars truncated]

### Assistant | 2026-06-15T16:38:47.334Z

I'll read both files end-to-end and trace the routing control flow.

### Assistant | 2026-06-15T16:38:47.348Z

[tool_use: Read]

### Assistant | 2026-06-15T16:38:47.364Z

[tool_use: Read]

### User | 2026-06-15T16:38:54.155Z

[tool_result] 1	/**
2	 * model-routing-policy.mjs -- pure: the SINGLE per-prompt model-routing verdict that fuses the
3	 * Claude-tier decision with the MEASURED Ollama capability matrix (U-MODEL-ROUTE-POLICY, slot:india
4	 * 2026-06-11). This is the brain the advisor hook calls.
5	 *
6	 * OPERATOR POLICY (2026-06-11, "fable demolished session limits") -> one verdict per prompt:
7	 *   - ollama  : mechanical ta
... [+8402 chars truncated]

### User | 2026-06-15T16:38:54.213Z

[tool_result] 1	// scripts/lib/model-routing-policy.test.mjs
2	// Tests for U-MODEL-ROUTE-POLICY: per-prompt verdict fusing tier-router + capability matrix.
3	
4	import { describe, it } from "node:test";
5	import assert from "node:assert/strict";
6	import { ollamaSafeClassModels, routePrompt, routeCloudLongContext, BATTERY_TO_CLASS } from "./model-routing-policy.mjs";
7	
8	// A matrix shaped like ollama-capabil
... [+6790 chars truncated]

### Assistant | 2026-06-15T16:39:01.161Z

I have both files end-to-end. Let me verify the two dependency contracts the new code couples to: `classifyTaskClass`/`isSafetyCritical` (does "review/summarize/analyze the entire X" classify as a mechanical Ollama class that would shadow the implicit cloud route?) and `DEFAULT_MODEL_SLUG` (the test asserts a hardcoded literal).

### Assistant | 2026-06-15T16:39:01.163Z

[tool_use: Read]

### Assistant | 2026-06-15T16:39:01.172Z

[tool_use: Read]

### User | 2026-06-15T16:39:04.758Z

[tool_result] 1	/**
2	 * openrouter-client.mjs -- OpenRouter cloud LLM client
3	 * (CLOUD-OVERFLOW-MS0/U-OPENROUTER-CLIENT, slot:alpha 2026-06-15).
4	 *
5	 * Operator directive (2026-06-15): "wire cloud version, network is 1gb/sec". After the
6	 * gpt-oss:120b vs local-87GB-nemo vs OpenRouter assessment, route long-context /
7	 * deep-research / free-overflow work to NVIDIA Nemotron-3 on OpenRouter (1M context,
... [+14350 chars truncated]

### User | 2026-06-15T16:39:04.811Z

[tool_result] 1	// tier: T4
2	// HERMES-EFFICIENCY-ROUTER / U1 (keystone) — Local-LLM task-routing brain.
3	//
4	// composes: ollama-cost-router (routeModelForTask) + host-aware-synthesis-model
5	//   (fetchInstalledModels) + host-class (detectHostClass). It is a COMPOSER, not a
6	//   new policy — model-tier selection is DELEGATED to routeModelForTask (the
7	//   canonical, Blackwell-tuned, install-truthful pi
... [+13405 chars truncated]

### Assistant | 2026-06-15T16:39:10.231Z

Now I have the full picture. Let me trace the critical regression path carefully — the interaction between `CLOUD_LONGCTX` and the existing `classifyTaskClass` ordering, since the contract says implicit cloud is honored ONLY after the Ollama check. The key risk: a prompt that the operator thinks is "everyday" but that now classifies as `reason`/`summarize` AND matches a cloud regex.

Let me verify the four mentioned test prompts against the actual regexes.

### Assistant | 2026-06-15T16:39:14.566Z

[tool_use: Bash]

### User | 2026-06-15T16:39:22.288Z

[tool_result] null            | review the entire function
null            | read all the tests
null            | summarize this file
null            | analyze the bug
CLOUD-IMPLICIT  | review the whole module
CLOUD-IMPLICIT  | analyze every file in the codebase
CLOUD-IMPLICIT  | read the entire log
CLOUD-IMPLICIT  | summarize the whole document
null            | review all the code changes
CLOUD-IMPLICIT  | sc
... [+416 chars truncated]

### Assistant | 2026-06-15T16:39:26.301Z

The four prompts the operator named are all safely `null`. But several everyday-sounding prompts DO trigger CLOUD-IMPLICIT. The critical question: does the Ollama check shadow them first (no regression), or do they fall through to cloud? Let me trace the full `routePrompt` with a realistic matrix and check what classes those implicit-cloud prompts get, plus whether CLOUD_VETO has a gap.

### Assistant | 2026-06-15T16:39:32.296Z

[tool_use: Bash]

### User | 2026-06-15T16:39:40.584Z

[tool_result] openrouter/nvidia/nemotron-3-super-120b-a12b:free cls=unknown     | review the whole module
openrouter/nvidia/nemotron-3-super-120b-a12b:free cls=document    | summarize the whole document
openrouter/nvidia/nemotron-3-super-120b-a12b:free cls=unknown     | read the entire log
openrouter/nvidia/nemotron-3-super-120b-a12b:free cls=unknown     | scan all logs
openrouter/nvidia/nemotron-3-super-120b-a
... [+778 chars truncated]

### Assistant | 2026-06-15T16:39:43.981Z

This confirms two real regressions. Let me verify what these prompts routed to BEFORE the change (the no-regression baseline) by simulating the pre-change path: safety → classify → ollama → claude-tier. The key cases are the ones that now route to `openrouter` but previously would have routed to `claude` (opus/sonnet/fable).

### Assistant | 2026-06-15T16:39:50.960Z

[tool_use: Bash]

### User | 2026-06-15T16:40:18.769Z

[tool_result] BEFORE=claude/sonnet    AFTER=openrouter       | review the whole module   <-- REGRESSION
BEFORE=claude/sonnet    AFTER=openrouter       | summarize the whole document   <-- REGRESSION
BEFORE=claude/sonnet    AFTER=openrouter       | read the entire log   <-- REGRESSION
BEFORE=claude/sonnet    AFTER=openrouter       | scan all logs   <-- REGRESSION
BEFORE=claude/sonnet    AFTER=openrouter       | 
... [+557 chars truncated]

### Assistant | 2026-06-15T16:40:25.837Z

The regressions are confirmed empirically. Note that "create the engine across the whole codebase" and "rewrite the whole codebase" are genuine BUILD/codegen work that CLOUD_VETO fails to catch (`create`/`rewrite` are not in the veto list), and "analyze every file" / "design the architecture across the whole codebase" are deep-reasoning that BEFORE went to `fable` and now go to cloud. These directly violate contract requirements 2 and 4.

Let me confirm one more subtle point: contract 3 says explicit beats Ollama but implicit is honored only AFTER Ollama. Let me verify the `cloud` variable is computed once and the explicit-vs-implicit fork is correct, plus check the CLOUD_VETO ordering interaction (does an explicit cloud request that's ALSO a build still go to cloud — i.e. does explicit correctly bypass the veto, since the veto check comes after explicit inside `routeCloudLongContext`).

### Assistant | 2026-06-15T16:40:29.423Z

[tool_use: Bash]

### User | 2026-06-15T16:40:33.647Z

[tool_result] explicit+build: {"engine":"openrouter","model":"nvidia/nemotron-3-super-120b-a12b:free","tier":"cloud-long-context","taskClass":"deep_research","reason":"explicit cloud/nemotron request -> OpenRouter (1M ctx, $0 free tier)","explicit":true}
create+longctx: {"engine":"openrouter","model":"nvidia/nemotron-3-super-120b-a12b:free","tier":"cloud-long-context","taskClass":"deep_research","reason":"long-
... [+119 chars truncated]

### Assistant | 2026-06-15T16:41:06.309Z

My analysis is complete and empirically verified against the live code. Here is my verdict.

---

VERDICT: FAIL

summary: The new cloud tier silently steals quality work the contract explicitly forbids. CLOUD_LONGCTX is over-broad — everyday `review/summarize/read/analyze ... the whole/entire/all/every <module|log|document|codebase|transcript>` prompts that today route to sonnet/fable now route to OpenRouter Nemotron instead, a fleet-wide quality regression that violates "without losing quality" (contract 4). Separately, CLOUD_VETO is under-broad: real codegen using `create`/`rewrite` is NOT vetoed, so a genuine build with a long-context phrase goes to the cloud instead of staying on Opus (contract 2). The safety-wins, explicit-beats-Ollama, and compute-once mechanics are all correct.

findings:
- [P1] `scripts/lib/model-routing-policy.mjs:40-41` (CLOUD_LONGCTX) -- **silent quality regression, contract 2+4.** The `(analyze|read|review|summari[sz]e|...)...(entire|whole|all|every) <noun>` pattern fires on common everyday prompts. Empirically (full `routePrompt` with a classify+extract matrix, pre-vs-post diff): "review the whole module", "summarize the whole document", "read the entire log", "scan all logs", "digest the entire transcript", "comb through every module" ALL regressed sonnet->openrouter; "analyze every file in the codebase" and "design the architecture across the whole codebase" regressed **fable->openrouter** (deep reasoning the contract says must stay on fable). These are not long-context-research intents — they are routine summarize/explain/reason work that previously stayed on Claude. The Ollama check does NOT shadow them (they classify as `unknown`/`summarize`/`document`/`reason`, none matrix-proven), so they fall straight through to the cloud branch at line 146-148. -- Fix: require an UNAMBIGUOUS long-context signal: drop `module`/`log`/`document`/`doc`/`file` from the noun list (keep `codebase|repo|repository|corpus|transcript|session|history`), an
... [+4011 chars truncated]
