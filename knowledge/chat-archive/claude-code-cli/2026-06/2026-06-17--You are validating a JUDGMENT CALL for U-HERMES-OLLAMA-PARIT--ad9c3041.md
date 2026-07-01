---
type: "chat-session"
source: "claude-code-cli"
session_id: "ad9c3041-c806-4424-9eed-fea97a4fc64b"
title: "You are validating a JUDGMENT CALL for U-HERMES-OLLAMA-PARITY-L3 (slot:alpha). T"
date: "2026-06-17"
first_ts: "2026-06-17T19:24:23.388Z"
last_ts: "2026-06-17T19:25:58.603Z"
cwd: "H:\\prism"
messages: 43
user_msgs: 18
assistant_msgs: 25
raw_file: "H:/.claude/projects/H--prism/ad9c3041-c806-4424-9eed-fea97a4fc64b/subagents/agent-a96ac930c08a0fc6b.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:21"
---

# You are validating a JUDGMENT CALL for U-HERMES-OLLAMA-PARITY-L3 (slot:alpha). T

> **claude-code-cli** | 2026-06-17 | 43 msgs (18 user / 25 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/ad9c3041-c806-4424-9eed-fea97a4fc64b/subagents/agent-a96ac930c08a0fc6b.jsonl`

## Transcript

### User | 2026-06-17T19:24:23.388Z

You are validating a JUDGMENT CALL for U-HERMES-OLLAMA-PARITY-L3 (slot:alpha). The task was "make the offload-routing layer Hermes-aware." The chat decided NOT to add Hermes to two of three routers, and added only a documentation note. Your job: confirm this is correct engineering, NOT under-delivery/rationalization. Be adversarial — if Hermes SHOULD be wired somewhere it isn't, say so (FAIL).

The three routing surfaces:
1. H:/prism/scripts/lib/task-substrate-router.mjs — ALREADY Hermes-aware: read it; confirm it has a dedicated `hermes` substrate row (gated by shouldUseWorkflow from hermes-workflow-planner.mjs) AND surfaces `ask-hermes.mjs` in the ollama lane's `how` field. Live E2E confirmed: a scale-signal task (itemCount:40, openEnded, needsVerification) yields hermesGated:true + the hermes lane present.
2. H:/prism/.claude/hooks/ollama-task-offloader.mjs — when Ollama is DOWN it emits buildClaudeFallbackDirective (route the mechanical task to CHEAP Claude haiku/sonnet, per the fleet ladder Ollama->Sonnet/Haiku->Opus). The chat did NOT insert Hermes here. Rationale: Hermes is PAID (xai grok); making it the DEFAULT fallback whenever Ollama is down would spend money on every mechanical task. Read buildClaudeFallbackDirective + the ollama-down branch (~line 534-556). Is leaving it as cheap-Claude correct, or should Hermes be an option here?
3. H:/prism/scripts/lib/local-llm-task-router.mjs — the chat added ONLY a comment (~after isSafetyCritical, search "HERMES-PARITY/U-HERMES-OLLAMA-PARITY-L3 NOTE") explaining it stays LOCAL-ONLY. Rationale: this router's charter is invariant #3 "IP-STAYS-LOCAL" + memory reference_hermes_router_u1_2026_06_04 says "LOCAL ONLY -- manufacturing IP never leaves the box." Adding a cloud (Hermes) escalation would philosophy-fork it (R7/R11). Read the file header + the 3 invariants + the new note. Is declining to add Hermes here correct, or a cop-out?

Key question to answer decisively: Is "offload-routing Hermes-parity" genuinely SATIS
... [+387 chars truncated]

### Assistant | 2026-06-17T19:24:26.946Z

I'll investigate all three routing surfaces end-to-end to validate this judgment call.

### Assistant | 2026-06-17T19:24:27.415Z

[tool_use: Read]

### Assistant | 2026-06-17T19:24:27.892Z

[tool_use: Read]

### Assistant | 2026-06-17T19:24:28.099Z

[tool_use: Read]

### User | 2026-06-17T19:24:29.206Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\task-substrate-router.mjs' was already read 4m ago in this session and is unchanged (mtime 1781363442088). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-17T19:24:29.430Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\ollama-task-offloader.mjs' was already read 4m ago in this session and is unchanged (mtime 1781295882042). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-17T19:24:30.332Z

[tool_result] 1	// tier: T4
2	// HERMES-EFFICIENCY-ROUTER / U1 (keystone) — Local-LLM task-routing brain.
3	//
4	// composes: ollama-cost-router (routeModelForTask) + host-aware-synthesis-model
5	//   (fetchInstalledModels) + host-class (detectHostClass). It is a COMPOSER, not a
6	//   new policy — model-tier selection is DELEGATED to routeModelForTask (the
7	//   canonical, Blackwell-tuned, install-truthful pi
... [+14169 chars truncated]

### Assistant | 2026-06-17T19:24:33.691Z

The read-once guard confirms I already read task-substrate-router.mjs and ollama-task-offloader.mjs this session. Let me re-read them now to verify the specific claims, plus the supporting files.

### Assistant | 2026-06-17T19:24:34.188Z

[tool_use: Read]

### User | 2026-06-17T19:24:34.648Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\task-substrate-router.mjs' was already read 4m ago in this session and is unchanged (mtime 1781363442088). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-17T19:24:34.835Z

[tool_use: Read]

### User | 2026-06-17T19:24:35.914Z

[tool_result] 480	    return;
481	  }
482	
483	  const prompt = payload.prompt || "";
484	  if (!prompt.trim() || prompt.length < 20) {
485	    console.log(JSON.stringify({ continue: true }));
486	    return;
487	  }
488	
489	  const classification = classifyPrompt(prompt);
490	
491	  if (!classification.offloadable) {
492	    recordOllamaEvent({
493	      hook: HOOK_NAME, decision: "keep", category: classifica
... [+5075 chars truncated]

### Assistant | 2026-06-17T19:24:40.831Z

The read-once guard is blocking my re-read of the two files I read earlier this session, but their content is in my context from those earlier reads. Let me verify the specific claims by grepping for the key structures in task-substrate-router.mjs (the hermes substrate, ask-hermes, shouldUseWorkflow), the supporting files, and the buildClaudeFallbackDirective definition.

### Assistant | 2026-06-17T19:24:42.271Z

[tool_use: Grep]

### Assistant | 2026-06-17T19:24:43.552Z

[tool_use: Grep]

### User | 2026-06-17T19:24:45.188Z

[tool_result] 3:// PRIMARY executor and emit the 5-substrate plan (Ollama / Obsidian / Hermes /
9:// Hermes gate from hermes-workflow-planner.mjs (shouldUseWorkflow). It NEVER
12:// ctx CONTRACT (U-SPEC-V2 fix-P2): the Hermes lane only appears when ctx carries
13:// the scale hints shouldUseWorkflow needs ({itemCount, openEnded, needsVerification}),
18:import { shouldUseWorkflow } from "./hermes-workflow-planne
... [+1321 chars truncated]

### User | 2026-06-17T19:24:45.292Z

[tool_result] 34:import { routeModelForTask, claudeFallbackModel } from "./lib/ollama-cost-router.mjs";
35-\ BLACKWELL-TOKEN-SYNERGY-MS0\U-BW-OFFLOAD-TIER: resolve THIS host's GPU class
36-// so the cost-router can promote balanced→strong on the 96GB Blackwell (the
37-// 14B is free there) — fed into routeModelForTask below.
--
458:// claudeFallbackModel() (the single source of truth in ollama-cost-router.mjs).
... [+631 chars truncated]

### Assistant | 2026-06-17T19:24:48.645Z

Verified the key structures. Now let me read the full task-substrate-router.mjs header and the hermes substrate rows in detail, the buildClaudeFallbackDirective body, the hermes-workflow-planner, and the cited memory file to confirm the note's factual claims and the philosophy of the local-llm router.

### Assistant | 2026-06-17T19:24:49.596Z

[tool_use: Read]

### Assistant | 2026-06-17T19:24:50.542Z

[tool_use: Read]

### Assistant | 2026-06-17T19:24:51.002Z

[tool_use: Read]

### User | 2026-06-17T19:24:52.964Z

[tool_result] 1	// RGS-PLANNING-LOOP-BRIDGE-MS0/U2 (2026-06-11, slot:tango)
2	// Per-task substrate-routing matrix: given a task + phase + context, decide the
3	// PRIMARY executor and emit the 5-substrate plan (Ollama / Obsidian / Hermes /
4	// Master-graph / PSN) with when/how/max-out for each. The "max out their
5	// capabilities" answer (U-SPEC-V2 section 4), made deterministic + testable.
6	//
7	// DEDUP: 
... [+6197 chars truncated]

### User | 2026-06-17T19:24:53.072Z

[tool_result] 440	  }
441	  return [
442	    `💡 OFFLOAD OPPORTUNITY (${category})`,
443	    `This "${category}" task could run on local Ollama (${model})`,
444	    `Est. token savings: ~${savedTokens} tokens (${savingsPct}%)`,
445	    `Total saved this session: ~${totalSaved} tokens`,
446	    "",
447	    "To use: the prompt-rewriter-ollama hook may already handle this.",
448	    "Or manually: ask Claude to dele
... [+1754 chars truncated]

### User | 2026-06-17T19:24:54.053Z

[tool_result] 1	// scripts/lib/hermes-workflow-planner.mjs
2	//
3	// Hermes Dynamic-Workflow Planner — the "coder brain" that makes Hermes (the
4	// PRISM fleet orchestrator) behave like a skilled Claude Code coder who reaches
5	// for Dynamic Workflows instead of hand-chaining 50 prompts.
6	//
7	// Source doctrine: 0xCodez, "How to master Dynamic Workflows in Claude Code:
8	// 6 patterns and 14 steps Anthropic
... [+37612 chars truncated]

### Assistant | 2026-06-17T19:24:57.839Z

I now have all three routers and the supporting files fully verified. Let me confirm the cited memory file and verify the `ask-hermes.mjs` claims (does it really exist with the modes the note implies, and does it auto-fall-back to ollama).

### Assistant | 2026-06-17T19:25:00.199Z

[tool_use: Bash]

### Assistant | 2026-06-17T19:25:01.630Z

[tool_use: Bash]

### User | 2026-06-17T19:25:04.889Z

[tool_result] ---
name: reference_hermes_router_u1_2026_06_04
description: HERMES-EFFICIENCY-ROUTER U1 keystone — local-llm-task-router.mjs composer (runLocal vs Claude decision + model pick); plan + dead-offloader fix shipped
metadata: 
  node_type: memory
  type: reference
  originSessionId: 8b785b10-fc31-4613-8c28-594f7533b4f2
---

# HERMES-EFFICIENCY-ROUTER — U1 keystone shipped (2026-06-04, slot:alpha)

Op
... [+3960 chars truncated]

### User | 2026-06-17T19:25:07.934Z

[tool_result] -rwxr-xr-x 1 wompu 197611 26278 Jun 17 14:02 scripts/ask-hermes.mjs*
===MODES/FALLBACK===
3: * ask-hermes.mjs -- PRISM bridge to the local Hermes OpenAI-compatible proxy
10: * a compact request/response, the same way ask-ollama.mjs reaches local Ollama.
12: * Why a bridge and not a dispatcher: ask-ollama.mjs is the canonical
14: * router / smart executor can route a task to Hermes the same way it 
... [+2786 chars truncated]

### Assistant | 2026-06-17T19:25:13.704Z

Everything is verified. Let me do a final adversarial check: confirm that no OTHER router in the repo is a natural Hermes consumer that was missed, and verify the note's specific factual claim that task-substrate-router surfaces "both the ask-hermes inference path and the Hermes fan-out, gated by shouldUseWorkflow."

I have already verified all three of those in task-substrate-router.mjs:
- Line 69 (ollama lane `how`): surfaces `ask-hermes.mjs ... (Hermes proxy :8645, auto-falls-back to ollama)` — the inference path.
- Lines 78-83 (hermes substrate row): gated by `wf.useWorkflow` (= `shouldUseWorkflow`), shows the fan-out AND `ask-hermes.mjs` direct inference.
- Line 102: `hermesGated: wf.useWorkflow`.

Let me confirm there's no fourth "offload-routing" surface that should route to Hermes but doesn't.

### Assistant | 2026-06-17T19:25:15.588Z

[tool_use: Grep]

### Assistant | 2026-06-17T19:25:16.534Z

[tool_use: Grep]

### User | 2026-06-17T19:25:17.751Z

[tool_result] Found 9 files
.claude\hooks\ollama-task-offloader.mjs
.claude\hooks\__tests__\ollama-task-offloader-autoexec.test.mjs
.claude\hooks\lib\ollama-stats.mjs
.claude\hooks\__tests__\ollama-cost-router.test.mjs
.claude\hooks\lib\ollama-cost-router.mjs
.claude\hooks\ollama-engine-api-extractor.mjs
.claude\hooks\ollama-reviewer-second-opinion.mjs
.claude\hooks\ollama-obsidian-rag.mjs
.claude\hooks\ollama-
... [+22 chars truncated]

### User | 2026-06-17T19:25:18.671Z

[tool_result] Found 22 files
scripts\lib\local-llm-task-router.mjs
scripts\lib\effort-tier-router.mjs
scripts\lib\effort-tier-router.test.mjs
scripts\lib\openrouter-client.test.mjs
scripts\lib\openrouter-client.mjs
scripts\lib\task-substrate-router.mjs
scripts\lib\local-llm-task-router.test.mjs
scripts\lib\claude-tier-router.test.mjs
scripts\lib\claude-tier-router.mjs
scripts\lib\task-substrate-router.test.mjs

... [+503 chars truncated]

### Assistant | 2026-06-17T19:25:22.999Z

There are several other router files. The task scoped the review to the three named "offload-routing" surfaces, but to be adversarial I want to confirm none of the others (`multi-provider-router`, `effort-tier-router`, `claude-tier-router`, `openrouter-client`) is the natural "offload-routing layer" that should be Hermes-aware and is the real missed home. Let me check the two most likely candidates — `multi-provider-router` (sounds like it already routes across providers including possibly cloud) and `effort-tier-router`.

### Assistant | 2026-06-17T19:25:23.952Z

[tool_use: Read]

### Assistant | 2026-06-17T19:25:24.893Z

[tool_use: Grep]

### User | 2026-06-17T19:25:24.987Z

[tool_result] 1	#!/usr/bin/env node
2	// U-PSN-MULTI-PROVIDER-ROUTER-2026-05-24 — classification + telemetry library
3	// for PRISM's multi-provider AI routing layer (Brij "AI Infrastructure Master
4	// Tree" layer 02 — Frontier Models).
5	//
6	// PURPOSE: When Claude rate-limits, the operator or any automation layer needs
7	// a deterministic answer to "which provider should handle THIS task?" without
8	// mak
... [+2042 chars truncated]

### Assistant | 2026-06-17T19:25:25.665Z

[tool_use: Read]

### User | 2026-06-17T19:25:26.753Z

[tool_result] 513:// reactive rate-limit fallback. It is the answer to "how will Hermes know when

### User | 2026-06-17T19:25:27.060Z

[tool_result] 1	/**
2	 * effort-tier-router.mjs -- pure: decide the EFFORT TIER (xhigh / high / low) a prompt should run
3	 * at, the missing axis above the model router (U-EFFORT-TIER-ROUTE, slot:golf 2026-06-15).
4	 *
5	 * WHY (operator 2026-06-15, "API server limiting requests with only 9 chats open"): a fleet-wide
6	 * settings.json `effortLevel: "xhigh"` makes EVERY chat auto-fan-out a Workflow/subagents p
... [+2001 chars truncated]

### Assistant | 2026-06-17T19:25:58.603Z

I have everything I need. Let me synthesize the verdict.

The `multi-provider-router.mjs` is a frontier-model PROVIDER picker (claude vs gemini vs gpt-4 vs deepseek), not an OFFLOAD-routing surface — and it explicitly references Hermes at line 513 (rate-limit fallback). The `effort-tier-router` is orthogonal (effort level, not target). Neither is the missed "offload-routing" home. The three surfaces named in the task are exactly the offload-routing layer.

VERDICT: PASS

summary: The judgment call is sound engineering, not under-delivery. "Offload-routing Hermes-parity" is genuinely satisfied: `task-substrate-router.mjs` is the correct and verified home for Hermes-aware OFFLOAD routing, and the other two surfaces are correctly Hermes-free for principled, code-grounded reasons (one is a cost-tier fallback where paid Hermes-by-default would burn money on every mechanical task; the other has a charter-level IP-stays-local invariant that a cloud rung would philosophy-fork). The new doc note's factual claims all check out against the actual code. No real router that SHOULD route to Hermes was left un-wired.

findings: none

Auditable basis for the PASS (all verified by reading the code end-to-end, not just diff hunks):

1. Surface 1 — `task-substrate-router.mjs` IS the Hermes-aware offload router (confirmed):
   - `H:/prism/scripts/lib/task-substrate-router.mjs:69` — the `ollama` lane's `how` surfaces `node scripts/ask-hermes.mjs <mode> <input> ... (Hermes proxy :8645, auto-falls-back to ollama)` — the direct managed-OAuth inference path.
   - `task-substrate-router.mjs:78-83` — a dedicated `hermes` substrate row, conditionally emitted via `...(wf.useWorkflow ? [{...}] : [])`, surfacing both the agent fan-out AND `ask-hermes.mjs` direct inference.
   - `task-substrate-router.mjs:59` and `:102` — `wf = shouldUseWorkflow(hermesTask)` and `hermesGated: wf.useWorkflow`. The gate is imported from `hermes-workflow-planner.mjs:18`. I read `shouldUseWorkflow` (`hermes-workflow-p
... [+3856 chars truncated]
