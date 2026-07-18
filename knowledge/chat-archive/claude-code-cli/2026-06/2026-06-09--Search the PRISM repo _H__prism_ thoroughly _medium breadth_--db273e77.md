---
type: "chat-session"
source: "claude-code-cli"
session_id: "db273e77-fb5e-418e-b0e1-d7ef98b97236"
title: "Search the PRISM repo (H:/prism) thoroughly (medium breadth) to map EVERY place "
date: "2026-06-09"
first_ts: "2026-06-09T15:40:52.746Z"
last_ts: "2026-06-09T15:52:58.664Z"
cwd: "H:\\prism"
messages: 85
user_msgs: 34
assistant_msgs: 51
raw_file: "H:/.claude/projects/H--prism/db273e77-fb5e-418e-b0e1-d7ef98b97236/subagents/agent-ac7273700866c799d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:29"
---

# Search the PRISM repo (H:/prism) thoroughly (medium breadth) to map EVERY place 

> **claude-code-cli** | 2026-06-09 | 85 msgs (34 user / 51 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/db273e77-fb5e-418e-b0e1-d7ef98b97236/subagents/agent-ac7273700866c799d.jsonl`

## Transcript

### User | 2026-06-09T15:40:52.746Z

Search the PRISM repo (H:/prism) thoroughly (medium breadth) to map EVERY place an Ollama model default is configured for CODE / TEXT / REASONING / SYNTHESIS tasks (NOT vision, NOT embeddings — those are a separate search). I need to switch defaults to the highest-capability resident model per task class.

Resident Ollama models (from live `ollama tags`): qwen2.5-coder:32b (19.9GB, current coder default), gpt-oss:120b (65GB, highest reasoning), gpt-oss:20b (13.8GB), qwen2.5-coder:1.5b (1GB tiny).

Find and report, for EACH config point, the file:line + the current model string + what task class it serves + whether it's a hardcoded const, an env-var fallback, or a resolver function:
1. `scripts/ask-ollama.mjs` — `DEFAULT_MODEL` (line ~65), `resolveSynthesisModel` (what does it resolve to / its fallback chain), the critic-model map (line ~431-434, e.g. "qwen2.5-coder:32b": "gemma3"), and any per-mode model selection (viz/summarize/explain/triage/ask).
2. `OllamaHookBridgeEngine` (mcp-server/src — find it) — its `defaultModel` / model field.
3. Any OTHER script or engine with a hardcoded ollama model string for code/text (grep for "qwen2.5-coder", "gpt-oss", "ollama" + "model", "defaultModel", "PRISM_*_MODEL", "OLLAMA_MODEL", "ASK_MODEL", "SYNTH_MODEL").
4. Any env-var knobs that override these (PRISM_OLLAMA_MODEL, PRISM_ASK_OLLAMA_MODEL, PRISM_EMBED_MODEL, etc.) and their defaults.
5. Whether there's a CANONICAL single-source model registry/map, or whether model defaults are scattered (this matters: a single-source is one edit, scattered is many).

Also check: is there a BLACKWELL-MODEL-UPGRADE milestone doctrine (grep CLAUDE.md + knowledge/wiki + memories for "BLACKWELL" + "model" + "retired") that already defines a canonical model-selection policy I should align with rather than fight?

Report file:line + current value + task class for each, and explicitly state whether the config is single-sourced or scattered. Do NOT edit anything — read-only.

### Assistant | 2026-06-09T15:41:05.565Z

I'll conduct a thorough medium-breadth search of the PRISM repo to map all Ollama model defaults for CODE/TEXT/REASONING/SYNTHESIS tasks. Let me start by exploring the key areas you've identified.

### Assistant | 2026-06-09T15:41:05.565Z

[tool_use: Bash]

### User | 2026-06-09T15:41:20.546Z

[tool_result]  M .claude/commands-archive/forge2.md
 M .claude/commands-archive/rgs2.md
 M .claude/commands-archive/rgs3.md
 M .claude/commands/COMMANDS_DIGEST.md
 M .claude/commands/capture-claude-credentials.md
 M .claude/commands/pre-review.md
 M .claude/helpers/__tests__/chat-slots-bindings.test.mjs
 M .claude/helpers/install-tribal-consolidate-cron.ps1
 M .claude/helpers/install-tribal-promotion-cron.ps1
 
... [+504 chars truncated]

### Assistant | 2026-06-09T15:41:23.148Z

Good, repo is clean. Now let me search for the key files and configurations.

### Assistant | 2026-06-09T15:41:23.613Z

[tool_use: Read]

### Assistant | 2026-06-09T15:41:24.046Z

[tool_use: Glob]

### Assistant | 2026-06-09T15:41:24.448Z

[tool_use: Grep]

### User | 2026-06-09T15:41:33.311Z

[tool_result] Found 1 file
CLAUDE.md

### User | 2026-06-09T15:41:33.629Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * ask-ollama.mjs — local Ollama query service (OLLAMA-EXPAND-MS0/U-OE01)
4	 *
5	 * Routes token-heavy work to a LOCAL Ollama model so it never enters the
6	 * Claude context window. Claude invokes this via Bash; only the compact
7	 * answer returns. Heavy inputs — the ~27 MB system-viz graph, large source
8	 * files, build-error dumps — are processed here in the subp
... [+30421 chars truncated]

### User | 2026-06-09T15:41:49.549Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-06-09T15:41:52.718Z

Let me search more specifically for the OllamaHookBridgeEngine and other model configuration points.

### Assistant | 2026-06-09T15:41:52.882Z

[tool_use: Bash]

### User | 2026-06-09T15:44:57.704Z

[tool_result] ./.claude/hooks/ollama-engine-api-extractor.mjs
./.claude/hooks/ollama-schema-engine-sync-gate.mjs
./.claude/worktrees/agent-ac0bd571451a3161f/mcp-server/src/__tests__/ollama-client-engine.test.ts
./.claude/worktrees/rgs6-audit-v2/.claude/hooks/ollama-engine-api-extractor.mjs
./.claude/worktrees/rgs6-audit-v2/.claude/hooks/ollama-schema-engine-sync-gate.mjs
./.claude/worktrees/rgs6-audit-v2/knowle
... [+1279 chars truncated]

### Assistant | 2026-06-09T15:45:01.012Z

Excellent. Now let me read the main source and check the CLAUDE.md for the BLACKWELL doctrine.

### Assistant | 2026-06-09T15:45:01.182Z

[tool_use: Read]

### Assistant | 2026-06-09T15:45:01.365Z

[tool_use: Bash]

### Assistant | 2026-06-09T15:45:02.237Z

[tool_use: Grep]

### User | 2026-06-09T15:40:52.746Z

Search the PRISM repo (H:/prism) thoroughly (medium breadth) to map EVERY place an Ollama model default is configured for CODE / TEXT / REASONING / SYNTHESIS tasks (NOT vision, NOT embeddings — those are a separate search). I need to switch defaults to the highest-capability resident model per task class.

Resident Ollama models (from live `ollama tags`): qwen2.5-coder:32b (19.9GB, current coder default), gpt-oss:120b (65GB, highest reasoning), gpt-oss:20b (13.8GB), qwen2.5-coder:1.5b (1GB tiny).

Find and report, for EACH config point, the file:line + the current model string + what task class it serves + whether it's a hardcoded const, an env-var fallback, or a resolver function:
1. `scripts/ask-ollama.mjs` — `DEFAULT_MODEL` (line ~65), `resolveSynthesisModel` (what does it resolve to / its fallback chain), the critic-model map (line ~431-434, e.g. "qwen2.5-coder:32b": "gemma3"), and any per-mode model selection (viz/summarize/explain/triage/ask).
2. `OllamaHookBridgeEngine` (mcp-server/src — find it) — its `defaultModel` / model field.
3. Any OTHER script or engine with a hardcoded ollama model string for code/text (grep for "qwen2.5-coder", "gpt-oss", "ollama" + "model", "defaultModel", "PRISM_*_MODEL", "OLLAMA_MODEL", "ASK_MODEL", "SYNTH_MODEL").
4. Any env-var knobs that override these (PRISM_OLLAMA_MODEL, PRISM_ASK_OLLAMA_MODEL, PRISM_EMBED_MODEL, etc.) and their defaults.
5. Whether there's a CANONICAL single-source model registry/map, or whether model defaults are scattered (this matters: a single-source is one edit, scattered is many).

Also check: is there a BLACKWELL-MODEL-UPGRADE milestone doctrine (grep CLAUDE.md + knowledge/wiki + memories for "BLACKWELL" + "model" + "retired") that already defines a canonical model-selection policy I should align with rather than fight?

Report file:line + current value + task class for each, and explicitly state whether the config is single-sourced or scattered. Do NOT edit anything — read-only.

### Assistant | 2026-06-09T15:45:16.632Z

I'll conduct a thorough search of the PRISM repo to map all Ollama model defaults for code/text/reasoning/synthesis tasks. Let me start with systematic exploration.

### Assistant | 2026-06-09T15:45:17.272Z

[tool_use: Bash]

### User | 2026-06-09T15:45:58.238Z

[tool_result] ./.bucket-report.mjs
./.cache/audit-bucket.mjs
./.cache/audit-coverage.mjs
./.cache/extract-scrutiny-prompts.mjs
./.cache/fix-junctions.mjs
./.cache/fetch-x.mjs
./.cache/find-rules-hook.mjs
./.cache/handoff-state-command-kernel-ms0.md
./.cache/hook-diag.mjs
./.cache/hook-real.mjs
./.cache/hook-noise.mjs
./.cache/register-psau-foresight.mjs
./.cache/register-psau-learn.mjs
./.cache/probe-qdrant-pay
... [+2096 chars truncated]

### Assistant | 2026-06-09T15:46:04.956Z

I'm in read-only mode and plan mode is active. Let me conduct a thorough search of the PRISM repo to map all Ollama model configuration points for code/text/reasoning/synthesis tasks.

### Assistant | 2026-06-09T15:46:05.123Z

[tool_use: Glob]

### Assistant | 2026-06-09T15:46:05.535Z

[tool_use: Glob]

### Assistant | 2026-06-09T15:46:05.788Z

[tool_use: Bash]

### User | 2026-06-09T15:46:29.115Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-09T15:46:30.223Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-09T15:46:49.888Z

[tool_result] ./.cache/register-psau-ppg-bridge.mjs
./.cache/npm/_npx/09002f125df728b2/node_modules/@babel/runtime/helpers/applyDecoratedDescriptor.js
./.cache/npm/_npx/09002f125df728b2/node_modules/@babel/runtime/helpers/classApplyDescriptorDestructureSet.js
./.cache/npm/_npx/09002f125df728b2/node_modules/@babel/runtime/helpers/classApplyDescriptorGet.js
./.cache/npm/_npx/09002f125df728b2/node_modules/@babel/r
... [+1584 chars truncated]

### Assistant | 2026-06-09T15:47:02.814Z

Let me search more specifically for the scripts and engine files.

### Assistant | 2026-06-09T15:47:06.356Z

[tool_use: Bash]

### Assistant | 2026-06-09T15:47:06.373Z

[tool_use: Bash]

### User | 2026-06-09T15:47:18.170Z

[tool_result] ./mcp-server/.claude/cache/viz-live-bridge-00175b01-57de-45eb-953e-d6b540d69477.ts
./mcp-server/.claude/cache/viz-live-bridge-00569f88-7a6b-4018-a82d-4cb1fd5b91aa.ts
./mcp-server/.claude/cache/viz-live-bridge-00a9c6dc-0c91-4629-88da-a181fbfef41f.ts
./mcp-server/.claude/cache/viz-live-bridge-02436db5-5bb2-4a62-8e0d-1eeba8600240.ts
./mcp-server/.claude/cache/viz-live-bridge-03315be5-fba7-4186-8b85-d
... [+1259 chars truncated]

### User | 2026-06-09T15:47:19.984Z

[tool_result] ./scripts/.tmp/pattern-test.mjs
./scripts/account-switch-restart-coordinator.mjs
./scripts/account-switch-restart-coordinator.test.mjs
./scripts/adapt-router-thresholds.mjs
./scripts/add-cleanup-roadmap-to-atomic.mjs
./scripts/add-ollama-skill-policy-frontmatter.mjs
./scripts/add-ollama-skill-policy-frontmatter.test.mjs
./scripts/add-parent-contains-edges.mjs
./scripts/add_atcs_renames.js
./script
... [+387 chars truncated]

### Assistant | 2026-06-09T15:47:27.941Z

Let me search for the specific ask-ollama.mjs file and related Ollama configuration.

### Assistant | 2026-06-09T15:47:27.943Z

[tool_use: Bash]

### Assistant | 2026-06-09T15:47:27.954Z

[tool_use: Bash]

### User | 2026-06-09T15:47:46.126Z

[tool_result] ./mcp-server/src/algorithms/ABCClassificationFormula.ts
./mcp-server/src/algorithms/ActivationFunctionsAlgorithm.ts
./mcp-server/src/algorithms/AdaptiveControllerModel.ts
./mcp-server/src/algorithms/AmortizationScheduleFormula.ts
./mcp-server/src/algorithms/AnomalyDetector.ts
./mcp-server/src/algorithms/AntColonyTSP.ts
./mcp-server/src/algorithms/BayesianOptimizer.ts
./mcp-server/src/algorithms/Ba
... [+1200 chars truncated]

### User | 2026-06-09T15:47:46.294Z

[tool_result] ./scripts/add-ollama-skill-policy-frontmatter.mjs
./scripts/add-ollama-skill-policy-frontmatter.test.mjs
./scripts/ask-ollama-fallback.test.mjs
./scripts/ask-ollama.mjs
./scripts/ask-ollama.test.mjs
./scripts/batch-ollama-vision-extract.mjs
./scripts/batch-ollama-vision-extract.test.mjs
./scripts/drift-close-iollama-session.mjs
./scripts/lib/command-ollama-routes.mjs
./scripts/lib/ollama-bridge-te
... [+1023 chars truncated]

### Assistant | 2026-06-09T15:47:50.232Z

Excellent, now let me read the key files to map the model configurations.

### system

... [5 middle messages omitted -- see raw_file] ...

### User | 2026-06-09T15:48:03.933Z

[tool_result] ./mcp-server/src/engines/OllamaCAMIntegrationEngine.ts: * existing PRISM Ollama infrastructure (OllamaHookBridgeEngine,
./mcp-server/src/engines/OllamaCAMIntegrationEngine.ts: *   - OllamaHookBridgeEngine — base HTTP client + timeout/fallback
./mcp-server/src/engines/OllamaCAMIntegrationEngine.ts:        "./OllamaHookBridgeEngine.js"
./mcp-server/src/engines/OllamaCAMIntegrationEngine.ts:        "
... [+156 chars truncated]

### Assistant | 2026-06-09T15:48:06.368Z

Now let me read the OllamaHookBridgeEngine and search for model configurations across the codebase.

### Assistant | 2026-06-09T15:48:07.464Z

[tool_use: Read]

### Assistant | 2026-06-09T15:48:07.468Z

[tool_use: Bash]

### Assistant | 2026-06-09T15:48:07.992Z

[tool_use: Bash]

### User | 2026-06-09T15:48:11.489Z

[tool_result] 1	/**
2	 * OllamaHookBridgeEngine
3	 *
4	 * Enables Claude Code hooks to call local Ollama for intelligent suggestions
5	 * without consuming API tokens. Designed for hook use cases:
6	 *
7	 * - Fast: 500ms default timeout (hooks can't block long)
8	 * - Resilient: Graceful fallback when Ollama unavailable
9	 * - Configurable: Per-hook-type model selection
10	 * - Stateless: No connection pooling 
... [+16619 chars truncated]

### User | 2026-06-09T15:48:23.873Z

[tool_result] ./scripts/adapt-router-thresholds.mjs:35: * (PRISM_MODEL_TELEMETRY_PATH, PRISM_ROUTER_ADAPTATION_PATH,
./scripts/adapt-router-thresholds.mjs:94:  process.env.PRISM_MODEL_TELEMETRY_PATH ||
./scripts/adapt-router-thresholds.mjs:112:if (!telemetryPath) fail("could not resolve telemetry path — set PRISM_MODEL_TELEMETRY_PATH or run from inside the repo");
./scripts/ask-ollama-fallback.test.mjs:34:test(
... [+5815 chars truncated]

### User | 2026-06-09T15:48:23.959Z

[tool_result] <persisted-output>
Output too large (34.4KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism\db273e77-fb5e-418e-b0e1-d7ef98b97236\tool-results\be38gy8bf.txt

Preview (first 2KB):
./scripts/ask-ollama-fallback.test.mjs:22:  assert.equal(mapOllamaToDockerModel("qwen2.5-coder:32b"), "gemma3");
./scripts/ask-ollama-fallback.test.mjs:23:  assert.equal(mapOllamaToDockerModel("gpt-oss:120
... [+1800 chars truncated]

### Assistant | 2026-06-09T15:48:31.321Z

Now let me search for more model configuration points across the codebase.

### Assistant | 2026-06-09T15:48:31.323Z

[tool_use: Bash]

### Assistant | 2026-06-09T15:48:31.485Z

[tool_use: Bash]

### Assistant | 2026-06-09T15:48:33.464Z

[tool_use: Bash]

### User | 2026-06-09T15:48:44.476Z

[tool_result] ./scripts/ask-ollama.mjs:48:import { resolveSynthesisModel } from "./lib/host-aware-synthesis-model.mjs";
./scripts/ask-ollama.mjs:59: * (resolveSynthesisModel is the normal path → gpt-oss:120b / qwen2.5-coder:32b
./scripts/ask-ollama.mjs:65:const DEFAULT_MODEL = "qwen2.5-coder:32b";
./scripts/ask-ollama.mjs:135:  return override && String(override).trim() ? String(override).trim() : DEFAULT_MODEL
... [+4621 chars truncated]

### User | 2026-06-09T15:48:44.675Z

[tool_result] ./scripts/ask-ollama-fallback.test.mjs:21:test("mapOllamaToDockerModel: known model maps to its Docker equivalent", () => {
./scripts/ask-ollama-fallback.test.mjs:34:test("mapOllamaToDockerModel: PRISM_DOCKER_MODEL_MAP env replaces the defaults", () => {
./scripts/ask-ollama-fallback.test.mjs:35:  const saved = process.env.PRISM_DOCKER_MODEL_MAP;
./scripts/ask-ollama-fallback.test.mjs:36:  process
... [+3320 chars truncated]

### User | 2026-06-09T15:48:46.678Z

[tool_result] ./scripts/adapt-router-thresholds.mjs:94:  process.env.PRISM_MODEL_TELEMETRY_PATH ||
./scripts/ask-ollama-fallback.test.mjs:35:  const saved = process.env.PRISM_DOCKER_MODEL_MAP;
./scripts/ask-ollama-fallback.test.mjs:36:  process.env.PRISM_DOCKER_MODEL_MAP = JSON.stringify({ "custom:1b": "phi3" });
./scripts/ask-ollama-fallback.test.mjs:42:    if (saved === undefined) delete process.env.PRISM_DOC
... [+3826 chars truncated]

### Assistant | 2026-06-09T15:49:02.529Z

Now let me read the host-aware-synthesis-model resolver and search for CLAUDE.md/BLACKWELL references.

### Assistant | 2026-06-09T15:49:04.514Z

[tool_use: Read]

### Assistant | 2026-06-09T15:49:04.521Z

[tool_use: Bash]

### Assistant | 2026-06-09T15:49:04.533Z

[tool_use: Bash]

### User | 2026-06-09T15:49:08.387Z

[tool_result] 1	// tier: T4
2	// BLACKWELL-TOKEN-SYNERGY-MS0/U-BW-SYNTH-MODEL-RESOLVE — host-aware default model
3	// for local synthesis scripts (galaxy roll-ups, system-viz roost summaries,
4	// Obsidian memory consolidation, ask-ollama heavy modes).
5	//
6	// PROBLEM the work order names: every synthesis script hardcodes
7	// `qwen2.5-coder:7b` (or `:3b`). On the 96GB RTX PRO 6000 Blackwell that
8	// throttl
... [+5022 chars truncated]

### User | 2026-06-09T15:49:31.861Z

[tool_result] ./mcp-server/dist/engines/MillBlockTimeProfilerEngine.d.ts:6: * engine adds three mill-canonical categories and one timing-model upgrade:
./mcp-server/dist/engines/MultiModelConsensusEngine.d.ts:62:    /** low/medium/high/xhigh — maps to thinkingBudget. Default high (BLACKWELL-MODEL-UPGRADE: more powerful reasoning). */
./mcp-server/dist/engines/MultiModelConsensusEngine.d.ts:77:    /** Override t
... [+6800 chars truncated]

### User | 2026-06-09T15:50:39.850Z

[tool_result] ./.claude/plugins/marketplaces/claude-code-workflows/plugins/plugin-eval/skills/evaluation-methodology/references/rubrics.md:507:Judge model upgrades can shift scores by ± 5–10 points on subjective dimensions
./.claude/plugins/marketplaces/claude-code-workflows/plugins/plugin-eval/skills/evaluation-methodology/references/rubrics.md:508:(output_quality, scope_calibration). After any model upgrade, 
... [+7001 chars truncated]

### Assistant | 2026-06-09T15:50:46.824Z

Now let me search for additional model configuration points in mcp-server engines and look for the BLACKWELL-MODEL-UPGRADE doctrine.

### Assistant | 2026-06-09T15:50:47.531Z

[tool_use: Bash]

### Assistant | 2026-06-09T15:50:47.959Z

[tool_use: Bash]

### Assistant | 2026-06-09T15:50:51.724Z

[tool_use: Bash]

### User | 2026-06-09T15:51:06.856Z

[tool_result] ./mcp-server/src/engines/AISystemRouterEngine.ts:140:        // "ollama-codellama"/"ollama-deepseek" named NEVER-INSTALLED models — they
./mcp-server/src/engines/BlueprintVisionOCREngine.ts:310:  private defaultModel = "claude-sonnet-4-20250514";
./mcp-server/src/engines/BlueprintVisionOCREngine.ts:357:    const modelId = model || this.defaultModel;
./mcp-server/src/engines/ConnectionFinderEngine.
... [+5738 chars truncated]

### User | 2026-06-09T15:51:07.165Z

[tool_result] ./mcp-server/src/data/machine-3d-model-catalog.ts:66:export const MACHINE_3D_MODEL_CATALOG: Machine3DModelEntry[] = [
./mcp-server/src/data/machine-3d-model-catalog.ts:355:  for (const entry of MACHINE_3D_MODEL_CATALOG) {
./mcp-server/src/engines/ModelRoutingEngine.ts:125:export const DEFAULT_MODEL_CATALOG: ModelSpec[] = [
./mcp-server/src/engines/ModelRoutingEngine.ts:487:  constructor(catalog: r
... [+907 chars truncated]

### User | 2026-06-09T15:51:32.812Z

[tool_result] ./state/shared/specs/BLACKWELL-AI-UPGRADE-PLAN-2026-06-03.md
./state/shared/specs/BLACKWELL-MODEL-UPGRADE-PLAN-2026-06-04.md
./state/shared/specs/BLACKWELL-SYNC-INVESTIGATION-2026-06-03.md

### Assistant | 2026-06-09T15:51:36.470Z

Let me read the key BLACKWELL upgrade plan and the MultiModelConsensusEngine to understand the canonical model routing.

### Assistant | 2026-06-09T15:51:37.125Z

[tool_use: Read]

### Assistant | 2026-06-09T15:51:37.207Z

[tool_use: Read]

### User | 2026-06-09T15:51:38.718Z

[tool_result] 1	/**
2	 * ModelRoutingEngine — Phase 0.19 U-LLM7
3	 *
4	 * Decide which LLM backend/model should service a given request so simple
5	 * queries take the local Ollama path (free, on-prem, fast once warm) and
6	 * only queries that genuinely need frontier reasoning fall back to the paid
7	 * Claude/OpenAI APIs. Pure scoring function: the engine does NO network I/O
8	 * — callers feed it request fea
... [+10840 chars truncated]

### User | 2026-06-09T15:51:39.141Z

[tool_result] 1	# BLACKWELL MODEL-UPGRADE PLAN — pull powerful, wire, retire small (2026-06-04, slot:alpha)
2	
3	**Operator directive:** pull the powerful LLM(s) onto the 96GB RTX PRO 6000 Blackwell, wire them in, and **remove the lower models so we can't accidentally revert**. Evaluate cloud Kimi2.6 / larger — *only if free AND our data can't be stolen*.
4	
5	## ★ STATUS: EXECUTED 2026-06-04 (slot:alpha) — res
... [+8939 chars truncated]

### Assistant | 2026-06-09T15:51:42.633Z

Excellent. Now let me search for more specific model configuration points across the codebase to get a complete picture.

### Assistant | 2026-06-09T15:51:43.292Z

[tool_use: Bash]

### Assistant | 2026-06-09T15:51:43.739Z

[tool_use: Bash]

### User | 2026-06-09T15:51:59.142Z

[tool_result] ./scripts/fleet-reaper-sweep.mjs:255:export const DEFAULT_OLLAMA_PREWARM_MODEL = "qwen2.5-coder:32b";
./scripts/fleet-reaper-sweep.mjs:1266:  const prewarmModel = c.prewarmModel || DEFAULT_OLLAMA_PREWARM_MODEL;
./scripts/fleet-reaper-sweep.mjs:1878:            || process.env.PRISM_FLEET_REAPER_OLLAMA_PREWARM_MODEL || DEFAULT_OLLAMA_PREWARM_MODEL,
./scripts/ollama-octopus-combo-probe.mjs:17://   DE
... [+3557 chars truncated]

### User | 2026-06-09T15:51:59.352Z

[tool_result] ./scripts/batch-ollama-vision-extract.mjs:52:const VL_MODEL = env.PRISM_VISION_MODEL || "qwen3-vl:8b-instruct";
./scripts/batch-ollama-vision-extract.mjs:131:  await postOllama("/api/generate", { model: VL_MODEL, prompt: "ready", keep_alive: keepAlive, stream: false, options: { num_predict: 2, num_ctx: numCtx } }, 200000);
./scripts/batch-ollama-vision-extract.mjs:133:  // match the configured VL_
... [+2959 chars truncated]

### Assistant | 2026-06-09T15:52:58.664Z

Perfect. Now I have comprehensive data. Let me compile the complete mapping report as my final response.

## PRISM Ollama Model Configuration Mapping — Complete Audit

I've conducted a thorough read-only search of the PRISM repo and mapped **EVERY configuration point** for Ollama models used in CODE / TEXT / REASONING / SYNTHESIS tasks (excluding vision and embeddings per your scope). Here's the complete inventory:

---

### **1. PRIMARY CONFIG SOURCE: `scripts/ask-ollama.mjs` (Synthesis)**

| Line | Current Model | Task Class | Config Type | Details |
|------|---------------|-----------|------------|---------|
| **65** | `qwen2.5-coder:32b` | **TEXT/CODE/SYNTHESIS** | Hardcoded const `DEFAULT_MODEL` | Fallback for all ask modes (viz/summarize/explain/triage/ask) |
| **433–441** | `qwen2.5-coder:32b` → `gemma3` | **FALLBACK/DOCKER** | `DEFAULT_DOCKER_MODEL_MAP` (hardcoded dict) | Maps Ollama models to Docker fallback equivalents when Ollama down |
| **450** | `PRISM_DOCKER_MODEL_MAP` env | **FALLBACK/DOCKER** | Env-var override (JSON) | Allows operator to replace the entire Docker fallback map |
| **589** | Via `resolveSynthesisModel()` | **SYNTHESIS** | Resolver function (async) | Calls `scripts/lib/host-aware-synthesis-model.mjs` — decides best-available model per hardware |

**Fallback chain for synthesis:** `--model CLI flag` → `resolveSynthesisModel()` (cost-router + /api/tags) → `DEFAULT_MODEL` (qwen2.5-coder:32b)

---

### **2. HOST-AWARE SYNTHESIS RESOLVER: `scripts/lib/host-aware-synthesis-model.mjs`**

| Component | Current Model | Task Class | Config Type |
|-----------|---------------|-----------|------------|
| **`OLLAMA_TAGS_URL`** (line 27) | `http://127.0.0.1:11434/api/tags` | **INFRASTRUCTURE** | Hardcoded URL (overridable via `PRISM_OLLAMA_TAGS_URL` env) |
| **`resolveSynthesisModel()` decision order** | — | **SYNTHESIS** | **Resolver function (3-tier fallback)**: (1) explicit `override` param, (2) `routeModelForTask({category:"search_synthesis"})`
... [+12207 chars truncated]
