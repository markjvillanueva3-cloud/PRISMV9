---
type: "chat-session"
source: "claude-code-cli"
session_id: "087e5978-f3ed-4657-820e-aed49ae8aa0d"
title: "Search the PRISM repo at H:/PRISM and report concretely (file:path + exported AP"
date: "2026-06-14"
first_ts: "2026-06-14T05:58:47.308Z"
last_ts: "2026-06-14T06:02:50.746Z"
cwd: "H:\\PRISM"
messages: 64
user_msgs: 28
assistant_msgs: 36
raw_file: "H:/.claude/projects/H--prism/087e5978-f3ed-4657-820e-aed49ae8aa0d/subagents/agent-a8df2cb32638f67bd.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:04"
---

# Search the PRISM repo at H:/PRISM and report concretely (file:path + exported AP

> **claude-code-cli** | 2026-06-14 | 64 msgs (28 user / 36 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/087e5978-f3ed-4657-820e-aed49ae8aa0d/subagents/agent-a8df2cb32638f67bd.jsonl`

## Transcript

### User | 2026-06-14T05:58:47.308Z

Search the PRISM repo at H:/PRISM and report concretely (file:path + exported API) on these mechanisms that a new /loop+/goal "stack-utilization router" must compose with:

1. **Automatic model-switching / model-routing** — there is a hook that injects "MODEL-ROUTING ... recommended tier: sonnet" on prompts. Find it (likely .claude/hooks/model-routing-inject.mjs or similar) and report: how it decides the tier, what tiers/models it knows, and whether there's a programmatic resolveExecutor / model-router lib (e.g. scripts/lib/ or an engine). Also find the canonical Ollama model roster (qwen2.5-coder:32b, gpt-oss:120b, gpt-oss:20b, :1.5b) — which file documents which model for which job (e.g. state/shared/specs/CANONICAL-HOST-FACTS-*.md, feedback_ollama_token_routing.md).

2. **The verified-offload + ask-ollama contract** — confirm exported API of scripts/lib/ollama-verified-offload.mjs (verifiedOffload signature) and scripts/ask-ollama.mjs (modes: explain/summarize/classify/triage/ask) and scripts/lib/ollama-offload.mjs.

3. **Cheap search/nav primitives** — confirm the exact CLI for: system-viz-query.mjs (find + node-card), checkin-recall.mjs, prism_session:master_index_query. These are the "search-first" substrates the router will recommend.

4. **loop-state.mjs** — report its full CLI subcommands (start/tick/next/end/read/list) and what fields a loop-state record carries (iter, target, task, slot, status) — the router needs the iter number to do "variable spotlight rotation".

5. **The /smart executor contract** — the goal-discipline block mentions "the /smart executor contract (resolveExecutor -> ask-ollama.mjs)". Find resolveExecutor and report where it lives + signature.

Report what EXISTS with concrete signatures. Do NOT design anything.

### Assistant | 2026-06-14T05:58:48.982Z

I'll conduct a systematic search of the PRISM repo to find these mechanisms. Let me start by locating the key files and understanding their APIs.

### Assistant | 2026-06-14T05:58:49.201Z

[tool_use: Glob]

### Assistant | 2026-06-14T05:58:49.647Z

[tool_use: Bash]

### Assistant | 2026-06-14T05:58:49.884Z

[tool_use: Bash]

### User | 2026-06-14T05:58:59.010Z

[tool_result] .claude/hooks/.deprecated/awareness-2026-05-13/ai-command-awareness.mjs
.claude/hooks/.deprecated/awareness-2026-05-13/awareness-snapshot.mjs
.claude/hooks/.deprecated/awareness-2026-05-13/cog-bridge-awareness-rebuild.mjs
.claude/hooks/.deprecated/awareness-2026-05-13/cross-session-awareness.mjs
.claude/hooks/.deprecated/awareness-2026-05-13/multi-computer-awareness.mjs
.claude/hooks/.deprecated/a
... [+1172 chars truncated]

### User | 2026-06-14T05:59:05.342Z

[tool_result] .git\backup-untracked\mcp-server\generate-dispatchers.mjs
generate-dispatchers.mjs
mcp-server\generate-dispatchers.mjs
scripts\materials_rebuild\generate.mjs
.git\backup-untracked\mcp-server\scripts\convert_to_ts.mjs
mcp-server\scripts\convert_to_ts.mjs
scripts\convert_to_ts.mjs
.git\backup-untracked\mcp-server\scripts\fix_imports.mjs
mcp-server\scripts\fix_imports.mjs
scripts\fix_imports.mjs
.git
... [+5277 chars truncated]

### User | 2026-06-14T05:59:19.119Z

[tool_result] ./.cache/ollama-serve.log
./.cache/ollama-serve.err
./.cache/npm/_npx/09002f125df728b2/node_modules/agentic-flow/dist/router/providers/ollama.d.ts
./.cache/npm/_npx/09002f125df728b2/node_modules/agentic-flow/dist/router/providers/ollama.d.ts.map
./.cache/npm/_npx/09002f125df728b2/node_modules/agentic-flow/dist/router/providers/ollama.js
./.cache/npm/_npx/09002f125df728b2/node_modules/agentic-flow/
... [+579 chars truncated]

### Assistant | 2026-06-14T05:59:20.716Z

I'll conduct a targeted search for these mechanisms. Let me refine my approach to find the specific files.

### Assistant | 2026-06-14T05:59:21.135Z

[tool_use: Bash]

### Assistant | 2026-06-14T05:59:21.559Z

[tool_use: Bash]

### Assistant | 2026-06-14T05:59:21.812Z

[tool_use: Bash]

### Assistant | 2026-06-14T05:59:22.120Z

[tool_use: Bash]

### User | 2026-06-14T05:59:33.823Z

[tool_result] .claude/hooks/autonomous-loop-defer.mjs
.claude/hooks/autonomous-loop-watchdog.mjs
.claude/hooks/bundles/lib/ollama-fuse.mjs
.claude/hooks/claudemd-ollama-enforcer.mjs
.claude/hooks/lib/ollama-cost-router.mjs
.claude/hooks/lib/ollama-hook-bridge.mjs
.claude/hooks/lib/ollama-stats.mjs
.claude/hooks/lib/__tests__/ollama-hook-bridge-format.test.mjs
.claude/hooks/localhost-ollama-hardcode-guard.mjs
.c
... [+2030 chars truncated]

### User | 2026-06-14T05:59:40.272Z

[tool_result] adapt-router-thresholds.mjs
add-ollama-skill-policy-frontmatter.mjs
add-ollama-skill-policy-frontmatter.test.mjs
append-closed-loop-india-section.mjs
ask-ollama.mjs
ask-ollama.test.mjs
ask-ollama-fallback.test.mjs
audit-closed-loop-training-coverage.mjs
audit-closed-loop-training-coverage.test.mjs
batch-ollama-vision-extract.mjs
batch-ollama-vision-extract.test.mjs
blueprint-ocr-training-loop.mjs

... [+1559 chars truncated]

### User | 2026-06-14T05:59:40.336Z

[tool_result] scripts/lib/advisory-decay.mjs
scripts/lib/advisory-decay.test.mjs
scripts/lib/agent-overlay.mjs
scripts/lib/ai-synergy-audit-lib.mjs
scripts/lib/ai-synergy-audit-lib.test.mjs
scripts/lib/alpha-backlog-extract.mjs
scripts/lib/atomic-json.mjs
scripts/lib/atomic-json.test.mjs
scripts/lib/autostart-bus.mjs
scripts/lib/autostart-bus.test.mjs
scripts/lib/ball-nose-css-optimizer.mjs
scripts/lib/ball-nos
... [+26722 chars truncated]

### User | 2026-06-14T05:59:40.815Z

[tool_result] ./.swarm/model-router-state.json

### Assistant | 2026-06-14T05:59:42.652Z

Let me now read the key files to understand the APIs and mechanisms.

### Assistant | 2026-06-14T05:59:42.913Z

[tool_use: Read]

### Assistant | 2026-06-14T05:59:43.091Z

[tool_use: Read]

### Assistant | 2026-06-14T05:59:43.330Z

[tool_use: Read]

### Assistant | 2026-06-14T05:59:43.776Z

[tool_use: Read]

### User | 2026-06-14T05:59:46.889Z

[tool_result] File does not exist. Note: your current working directory is H:\PRISM.

### User | 2026-06-14T05:59:53.521Z

[tool_result] 1	// scripts/lib/ollama-verified-offload.mjs
2	// U-VERIFIED-OFFLOAD (2026-06-09, slot:alpha): the keystone that makes Ollama
3	// AUTO-offload safe at "100% accuracy". Spec: state/shared/specs/OLLAMA-VERIFIED-OFFLOAD.md
4	//
5	// THE INSIGHT: a local LLM is NOT 100% accurate generatively. You get 100% NET
6	// accuracy only by WRAPPING the offload in code that VERIFIES the output, with a
7	// fai
... [+5476 chars truncated]

### User | 2026-06-14T05:59:53.579Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * ask-ollama.mjs — local Ollama query service (OLLAMA-EXPAND-MS0/U-OE01)
4	 *
5	 * Routes token-heavy work to a LOCAL Ollama model so it never enters the
6	 * Claude context window. Claude invokes this via Bash; only the compact
7	 * answer returns. Heavy inputs — the ~27 MB system-viz graph, large source
8	 * files, build-error dumps — are processed here in the subp
... [+51768 chars truncated]

### User | 2026-06-14T05:59:54.616Z

[tool_result] 1	// tier: T2
2	/**
3	 * model-tier-advisor.mjs -- UserPromptSubmit hook (U-MODEL-TIER-ADVISOR, slot:india 2026-06-11).
4	 *
5	 * THE OPERATOR GOAL (2026-06-11, "fable demolished session limits"): auto-enforced model switching --
6	 * fable for deep planning/reasoning, opus for building/coding, ollama for verified-100% mechanical,
7	 * sonnet/haiku for capable tasks. The main-loop model CANNOT be 
... [+4626 chars truncated]

### Assistant | 2026-06-14T05:59:56.609Z

Let me continue reading the remaining key files.

### Assistant | 2026-06-14T05:59:57.074Z

[tool_use: Read]

### Assistant | 2026-06-14T05:59:57.496Z

[tool_use: Read]

### Assistant | 2026-06-14T05:59:57.913Z

[tool_use: Bash]

### Assistant | 2026-06-14T05:59:58.227Z

[tool_use: Bash]

### User | 2026-06-14T06:00:05.341Z

[tool_result] File does not exist. Note: your current working directory is H:\PRISM.

### User | 2026-06-14T06:00:09.071Z

[tool_result] 1	/**
2	 * model-routing-policy.mjs -- pure: the SINGLE per-prompt model-routing verdict that fuses the
3	 * Claude-tier decision with the MEASURED Ollama capability matrix (U-MODEL-ROUTE-POLICY, slot:india
4	 * 2026-06-11). This is the brain the advisor hook calls.
5	 *
6	 * OPERATOR POLICY (2026-06-11, "fable demolished session limits") -> one verdict per prompt:
7	 *   - ollama  : mechanical ta
... [+4637 chars truncated]

### User | 2026-06-14T06:00:24.873Z

[tool_result] scripts/checkin-recall.mjs

### User | 2026-06-14T06:00:33.328Z

[tool_result] ./.claude/helpers/loop-state-decide.test.mjs
./.claude/helpers/loop-state-eval.test.mjs
./.claude/helpers/loop-state-fleet-fallback.test.mjs
./.claude/helpers/loop-state-next.test.mjs
./.claude/helpers/loop-state.mjs
./.claude/helpers/precompact-handoff-loop-state.test.mjs
./.claude/helpers/__tests__/loop-state-narrate.test.mjs
./knowledge/memories/reference/reference_post_ship_high-value-wiki-u-l
... [+415 chars truncated]

### Assistant | 2026-06-14T06:00:36.597Z

Let me read the critical loop-state and system-viz-query files now.

### Assistant | 2026-06-14T06:00:36.870Z

[tool_use: Read]

### Assistant | 2026-06-14T06:00:37.172Z

[tool_use: Read]

### Assistant | 2026-06-14T06:00:37.516Z

[tool_use: Read]

### Assistant | 2026-06-14T06:00:37.812Z

[tool_use: Bash]

### User | 2026-06-14T06:00:58.640Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * loop-state.mjs — Per-session /loop iteration state helper.
4	 *
5	 * Why: `/loop` runs N iterations of a task. If a chat crashes mid-loop, the next
6	 * chat has no idea the loop was running. This helper persists iteration metadata
7	 * so /loop can resume cleanly + surface "you have a paused loop" warnings on /checkin.
8	 *
9	 * Layout: state/shared/loop-state/loo
... [+10013 chars truncated]

### User | 2026-06-14T06:00:58.687Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * system-viz-query — programmatic adapter for the live system graph.
4	 *
5	 * Lets rgs / forge / roadmap tools consume system-graph.json without
6	 * embedding parsing logic. Read-only.
7	 *
8	 * Usage:
9	 *   node scripts/system-viz-query.mjs roadmap-candidates       # unwired + pending + drift
10	 *   node scripts/system-viz-query.mjs blast-radius <nodeId>    # do
... [+7884 chars truncated]

### User | 2026-06-14T06:00:58.704Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * checkin-recall.mjs — local-compute recall + Ollama distill for the /checkin pipeline.
4	 *
5	 * WHY THIS EXISTS
6	 * The /checkin pipeline's Steps 8-11 + High-ROI table NAMED many capability
7	 * surfaces but never INVOKED them ("named-not-invoked" regression class,
8	 * CLAUDE.md). The user directive (2026-05-16) is: auto-invoke every named
9	 * surface, BUT keep 
... [+4536 chars truncated]

### User | 2026-06-14T06:01:04.527Z

[tool_result] scripts/lib/claude-tier-router.mjs: *   - .claude/hooks/lib/ollama-cost-router.mjs resolveExecutor + claudeFallbackModel(category)
scripts/lib/claude-tier-router.mjs: * only refines the top. Use this when you already hold a resolveExecutor verdict's `claudeModel`.
scripts/lib/forge-route.mjs:// fallback ladder shipped in U-FLOR-CLAUDE-TIER (resolveExecutor) -- the same
scripts/lib/forge-route.mjs:
... [+977 chars truncated]

### Assistant | 2026-06-14T06:01:07.023Z

Excellent! Now let me read the resolveExecutor contract and a few more critical files.

### Assistant | 2026-06-14T06:01:07.458Z

[tool_use: Read]

### Assistant | 2026-06-14T06:01:07.920Z

[tool_use: Read]

### Assistant | 2026-06-14T06:01:08.165Z

[tool_use: Bash]

### User | 2026-06-14T06:01:12.245Z

[tool_result] 1	// tier: T4
2	// SYSTEM-VIZ-BRAIN-MS0/U-P4-OLLAMA-COST-ROUTING — Cost-aware Ollama model selection
3	//
4	// Replaces hardcoded "first-of-preference-list" model selection with a
5	// category → tier → model decision. Smaller / faster models for trivial
6	// tasks (classify, format-convert, prism-inventory); larger / more
7	// capable models for complex codegen / multi-step reasoning.
8	//
9	// C
... [+11463 chars truncated]

### User | 2026-06-14T06:01:13.648Z

[tool_result] 1	// tier: T4
2	// HERMES-EFFICIENCY-ROUTER / U1 (keystone) — Local-LLM task-routing brain.
3	//
4	// composes: ollama-cost-router (routeModelForTask) + host-aware-synthesis-model
5	//   (fetchInstalledModels) + host-class (detectHostClass). It is a COMPOSER, not a
6	//   new policy — model-tier selection is DELEGATED to routeModelForTask (the
7	//   canonical, Blackwell-tuned, install-truthful pi
... [+7191 chars truncated]

### User | 2026-06-14T06:01:37.534Z

[tool_result] ./.sessions/claude/projects/H--prism/memory/feedback_ollama_token_routing.md
./knowledge/memories/feedback/feedback_ollama_token_routing.md
./knowledge/memories/_legacy-root/feedback_ollama_token_routing.md
./prism-test-6d0595/knowledge/memories/feedback/feedback_ollama_token_routing.md
./state/shared/specs/CANONICAL-HOST-FACTS-2026-06-09.html
./state/shared/specs/CANONICAL-HOST-FACTS-2026-06-09.m
... [+1 chars truncated]

### Assistant | 2026-06-14T06:01:39.916Z

Now let me read the canonical host facts and feedback file, then compile my findings.

### Assistant | 2026-06-14T06:01:40.481Z

[tool_use: Read]

### Assistant | 2026-06-14T06:01:40.919Z

[tool_use: Read]

### Assistant | 2026-06-14T06:01:41.430Z

[tool_use: Bash]

### User | 2026-06-14T06:01:52.819Z

[tool_result] 1	# Canonical Host Facts + Ollama Routing — DESKTOP-N7MI1VB (2026-06-09, slot:papa)
2	
3	> **Single source of truth** for this host's hardware + local-LLM roster. Verified LIVE 2026-06-09 (`os.cpus/totalmem/freemem`, `nvidia-smi`, `ollama /api/tags`). Every doc/skill/CLAUDE.md that cites specs or Ollama models should reference THIS file, not re-state numbers (that is how the drift this campaign ta
... [+4731 chars truncated]

### User | 2026-06-14T06:01:54.188Z

[tool_result] 1	---
2	name: Ollama/qwen reroutes cost-heavy work to save Claude tokens
3	description: PRISM uses local Ollama (qwen2.5-coder:32b default; gpt-oss:120b for deep local reasoning) to reroute tool calls, hook injections, and routine LLM tasks away from Claude API tokens. Always prefer Ollama for tasks that don't need Claude-class reasoning.
4	type: feedback
5	originSessionId: 9c056864-b507-4e43-9c29
... [+3047 chars truncated]

### User | 2026-06-14T06:01:59.111Z

[tool_result] .claude/hooks/lib/ollama-cost-router.mjs:export function resolveExecutor({
.claude/hooks/lib/ollama-cost-router.mjs-  category,
.claude/hooks/lib/ollama-cost-router.mjs-  available = [],
.claude/hooks/lib/ollama-cost-router.mjs-  hardware,
.claude/hooks/lib/ollama-cost-router.mjs-  vllmEnabled = false,
.claude/hooks/lib/ollama-cost-router.mjs-  vllmAvailable = false,

### Assistant | 2026-06-14T06:02:01.068Z

Perfect! Let me read the full resolveExecutor signature.

### Assistant | 2026-06-14T06:02:01.528Z

[tool_use: Read]

### Assistant | 2026-06-14T06:02:01.728Z

[tool_use: Bash]

### User | 2026-06-14T06:02:06.399Z

[tool_result] 200	  const startIdx = TIER_ORDER.indexOf(requestedTier);
201	  // startIdx is always >=0 because CATEGORY_TIER values are constrained to
202	  // TIER_ORDER entries, but the bounds check costs ~nothing and protects
203	  // against a future typo in the constants table.
204	  if (startIdx < 0) {
205	    return { model: av[0], tier: "fallback", reason: `unknown tier "${requestedTier}"` };
206	  }
2
... [+7649 chars truncated]

### User | 2026-06-14T06:02:06.913Z

[tool_result]  *   Claude: "opus" for judgment/reasoning/heavy-codegen (CLAUDE_LANE_CATEGORIES),
 *   "sonnet"/"haiku" for a MECHANICAL task that fell back from an unreachable
 *   Ollama. null on the prism_calc / ollama / vllm lanes (no Claude spend). The
 *   anti-leak invariant: a mechanical offload-miss NEVER yields "opus".
 */
export function resolveExecutor({
  category,
  available = [],
  hardware,
  vl
... [+558 chars truncated]

### Assistant | 2026-06-14T06:02:50.746Z

Perfect! I now have all the information needed. Let me compile a comprehensive report.

---

## RESEARCH FINDINGS: Stack-Utilization Router Composition Mechanisms

### 1. **Automatic Model-Switching / Model-Routing**

**Hook Location:** `.claude/hooks/model-tier-advisor.mjs`

**Decision Logic:**
- **Source:** `scripts/lib/model-routing-policy.mjs` → `routePrompt({ prompt, matrix })`
- **Tier Decision:** Fuses `classifyTaskClass(prompt)` + `routeClaudeTier(prompt)` + capability matrix
- **Output:** `{ engine: "ollama"|"claude", model, tier, taskClass, reason }`

**Known Tiers/Models:**
The system uses **5 model tiers** (not just Sonnet):
- **Fable** — deep planning/reasoning/gap-filling (frontier, reserved)
- **Opus** — lighter reasoning + heavy building/coding
- **Sonnet** — capable mid-tier (explain/summarize/document)
- **Haiku** — trivial mechanical tasks
- **Ollama** — verified 100%-accurate mechanical tasks routed to local ($0)

**Programmatic Model Router:**
- **File:** `.claude/hooks/lib/ollama-cost-router.mjs`
- **Export:** `resolveExecutor(opts)` 
- **Signature:**
```javascript
resolveExecutor({
  category,              // task category (string)
  available = [],        // Ollama /api/tags model names (host-injected)
  hardware,              // HardwareProfile (e.g. "home_blackwell")
  vllmEnabled = false,   // PRISM_VLLM_ENABLE flag
  vllmAvailable = false, // vLLM health check result
  ollamaAvailable = true // /api/tags reachable
})
// Returns:
// { lane: "prism_calc"|"claude"|"vllm"|"ollama", model, tier, reason, claudeModel }
```

**Canonical Ollama Model Roster** (Blackwell RTX PRO 6000, 96 GB VRAM):
- **Best tier (32B+):** `gpt-oss:120b` (65 GB, deep reasoning), `qwen3:32b`, `qwen2.5-coder:32b` (19.9 GB, code)
- **Strong tier (14-20B):** `gpt-oss:20b` (13.8 GB, mid-tier reasoning)
- **Balanced tier (7B):** *all retired per 2026-06-04 Blackwell migration*
- **Cheap tier (<4B):** `qwen2.5-coder:1.5b` (1 GB, trivial)

**Documentation Files:**
- `state/s
... [+10465 chars truncated]
