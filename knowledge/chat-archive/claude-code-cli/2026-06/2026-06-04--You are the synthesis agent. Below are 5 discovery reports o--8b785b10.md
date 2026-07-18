---
type: "chat-session"
source: "claude-code-cli"
session_id: "8b785b10-fc31-4613-8c28-594f7533b4f2"
title: "You are the synthesis agent. Below are 5 discovery reports on PRISM's existing A"
date: "2026-06-04"
first_ts: "2026-06-04T17:01:30.638Z"
last_ts: "2026-06-04T17:06:31.242Z"
cwd: "H:\\prism"
messages: 12
user_msgs: 5
assistant_msgs: 7
raw_file: "H:/.claude/projects/H--prism/8b785b10-fc31-4613-8c28-594f7533b4f2/subagents/workflows/wf_c89ffb0e-9fc/agent-a4f7c988f274c5017.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:17"
---

# You are the synthesis agent. Below are 5 discovery reports on PRISM's existing A

> **claude-code-cli** | 2026-06-04 | 12 msgs (5 user / 7 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/8b785b10-fc31-4613-8c28-594f7533b4f2/subagents/workflows/wf_c89ffb0e-9fc/agent-a4f7c988f274c5017.jsonl`

## Transcript

### User | 2026-06-04T17:01:30.638Z

You are the synthesis agent. Below are 5 discovery reports on PRISM's existing AI-routing / Ollama-offload / knowledge-selection / Hermes-orchestration infrastructure, plus a gap analysis. Produce a SINGLE dependency-ordered BUILD PLAN for a "Hermes efficiency-router" system meeting the operator goal:

  "skills/scripts/hooks/slash-command pipelines (keyword-triggered for Hermes) that use Ollama/local-LLMs to do as much work as possible without degraded quality; an agent reviews their work then enhances+gap-fills; full autonomous work; Hermes knows the optimal {tool, skill, memory, tribal, llm-model, prism-feature} for ANY task."

Requirements for the plan:
- REUSE existing infra (cite the exact engines/hooks/skills from the reports); only build genuinely-new connective tissue. Call out anything that would duplicate an existing asset and route to the existing one instead.
- Dependency-ordered units (U1, U2, …) each with: title, what it builds, which files (new/modified), what it reuses, acceptance test (real reference-value/invariant), and the dispatcher/hook/skill wiring.
- The FIRST unit must be the KEYSTONE (highest leverage). The dead-offloader fix (ollama-route-pretooluse decideRoute suggest→reroute) should be early since it directly serves "use Ollama as much as possible".
- Include the reviewer/gap-fill agent design (local-LLM does the draft → Claude reviewer agent verifies + enhances + gap-fills; how it's invoked autonomously; quality-gate so no degraded output ships).
- Include how Hermes is taught the routing (a single "what should I use for task X" advisor surface + keyword triggers).
- Keep local: NO cloud models (manufacturing IP must not leave the box).

Write the plan to H:/prism/state/shared/specs/HERMES-EFFICIENCY-ROUTER-PLAN-2026-06-04.md (use the Write tool). Then return a concise summary: the keystone unit + the ordered unit list (titles only) + the top 3 reuse-not-rebuild callouts.

=== LENS A (AI routing) ===
I now have a complete, verified pic
... [+70211 chars truncated]

### Assistant | 2026-06-04T17:01:48.096Z

I'll synthesize the 5 lens reports into a single dependency-ordered build plan. Let me first verify a couple of the load-bearing facts the plan hinges on, then write it.

### Assistant | 2026-06-04T17:01:53.705Z

[tool_use: Bash]

### Assistant | 2026-06-04T17:01:54.024Z

[tool_use: Bash]

### Assistant | 2026-06-04T17:01:57.998Z

[tool_use: Bash]

### User | 2026-06-04T17:02:21.173Z

[tool_result] {
  "_comment": "GPU-OFFLOAD-MAXIMIZE-MS0/U2 (2026-05-22, slot:sierra): flipped 'suggest'->'auto' per safe-rollout gate. Telemetry confirms 'byHook.ollama-route-pretooluse.fired'=177 (verified in ollama-offload-stats.json). Reroute now active: Read targets >=24KB classified as bulk-data summarize+route to qwen2.5-coder:7b. EXEMPT_BASENAMES in the hook prevents self-substitution on load-bearing sta
... [+390 chars truncated]

### User | 2026-06-04T17:03:00.300Z

[tool_result] INSTALLED: qwen3-vl:8b-instruct, qwen3-vl:8b, qwen2.5vl:7b, moondream:1.8b, llama3.2-vision:11b, nomic-embed-text:latest, qwen2.5-coder:32b

### User | 2026-06-04T17:03:21.498Z

[tool_result] H:/prism/.claude/hooks/lib/ollama-cost-router.mjs
H:/prism/.claude/hooks/ollama-reviewer-second-opinion.mjs*
H:/prism/.claude/hooks/ollama-task-offloader.mjs
H:/prism/mcp-server/src/engines/AISystemRouterEngine.ts
H:/prism/mcp-server/src/engines/HermesParallelFanoutPlannerEngine.ts
H:/prism/mcp-server/src/engines/HermesSelfCorrectionEngine.ts
H:/prism/mcp-server/src/engines/PRISMSelfAwarenessEngin
... [+143 chars truncated]

### Assistant | 2026-06-04T17:03:29.886Z

All three load-bearing facts are confirmed: config model is the deleted `qwen2.5-coder:7b` (only `qwen2.5-coder:32b` installed among coders), the Read-route hook is dead (5589 fired / 0 offloaded), the prompt-level offloader works (377 offloaded / 347929 tokens), and every reuse file exists on disk. Now writing the plan.

### Assistant | 2026-06-04T17:05:58.462Z

[tool_use: Write]

### User | 2026-06-04T17:06:11.964Z

[tool_result] File created successfully at: H:/prism/state/shared/specs/HERMES-EFFICIENCY-ROUTER-PLAN-2026-06-04.md (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-04T17:06:31.242Z

Plan written to `H:/prism/state/shared/specs/HERMES-EFFICIENCY-ROUTER-PLAN-2026-06-04.md`.

## Summary

**KEYSTONE — U1: `LocalLLMTaskRouterEngine` + `prism_ai:route_task`** — one composer engine returning a single routing verdict `{taskClass, runLocal, ollamaModel, escalateTo, qualityBar, tool, dispatcherAction, reason}`, delegating to the four existing routers (zero new policy). Bundled with the dead-offloader fix the operator named: config `model:"qwen2.5-coder:7b"` (deleted from host) → `qwen2.5-coder:32b`, plus resolving via `routeModelForTask` so no static tag is ever trusted again — kills the live 5589-fired/0-offloaded bug and retires the stale tags in `OllamaHookBridgeEngine`/`AISystemRouterEngine`. It is the contract every other unit consumes.

**Ordered units (titles only):**
- U1 — Unified `LocalLLMTaskRouterEngine` + `prism_ai:route_task` (keystone; includes dead-offloader config fix + stale-tag retire)
- U2 — `local-first-execute` script + `/local-do` skill (keyword-triggered local execution)
- U3 — `local-output-reviewer` + `ollama-work-review.mjs` (reviewer → enhance/gap-fill loop)
- U4 — `HermesAssetBundleEngine` + `prism_ai:asset_bundle` + `/optimal-assets` (the optimal `{tool,skill,memory,tribal,llm,feature}` advisor)
- U5 — `hermes-asset-brief-inject` (fold routing into Hermes slot-briefs at dispatch time)
- U6 — `route-conversion-loop` (convert high-conf routes from 0.8%-ignored nudge → auto-invoke action)
- U7 — `HermesAutonomousDriver` (chains decompose→route→execute→review→aggregate→self-correct)

**Top 3 reuse-not-rebuild callouts:**
1. **No new model/tier selector** — `routeModelForTask` (`.claude/hooks/lib/ollama-cost-router.mjs`) is canonical, current, install-truthful; the keystone delegates to it and retires the two stale hardcodes. Forking re-creates the "two routing brains disagree" disease.
2. **No new reviewer agent type** — reuse `reviewer`/`code-analyzer` (grade) + `implementer` (fix) + `parseOllamaReviewVerdict`/`decideOllamaRevi
... [+741 chars truncated]
