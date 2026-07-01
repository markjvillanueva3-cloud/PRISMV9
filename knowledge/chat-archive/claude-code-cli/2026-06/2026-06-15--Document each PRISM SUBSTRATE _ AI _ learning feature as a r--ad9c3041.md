---
type: "chat-session"
source: "claude-code-cli"
session_id: "ad9c3041-c806-4424-9eed-fea97a4fc64b"
title: "Document each PRISM SUBSTRATE / AI / learning feature as a routing-graph node. F"
date: "2026-06-15"
first_ts: "2026-06-15T05:45:15.910Z"
last_ts: "2026-06-15T05:58:36.657Z"
cwd: "H:\\prism"
messages: 60
user_msgs: 27
assistant_msgs: 33
raw_file: "H:/.claude/projects/H--prism/ad9c3041-c806-4424-9eed-fea97a4fc64b/subagents/agent-af843beb45a72a1f5.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:21"
---

# Document each PRISM SUBSTRATE / AI / learning feature as a routing-graph node. F

> **claude-code-cli** | 2026-06-15 | 60 msgs (27 user / 33 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/ad9c3041-c806-4424-9eed-fea97a4fc64b/subagents/agent-af843beb45a72a1f5.jsonl`

## Transcript

### User | 2026-06-15T05:45:15.910Z

Document each PRISM SUBSTRATE / AI / learning feature as a routing-graph node. For EACH item below give: whatItIs (1 line), whenToUse (the trigger condition that makes it the right choice over alternatives), howToInvoke (exact command/script/dispatcher/env), costTier (free|low|mid|high), governingRouter (the EXISTING router/hook/engine that governs it — R8 so we compose not duplicate; or NONE), taskClasses (array from: locate|build|plan|recall|learn|quote|physics|review|fix|orchestrate|session|domain).

Items (every one must appear):
ollama-offload (scripts/ask-ollama.mjs, OllamaHookBridgeEngine), model-switching (/model + .claude/hooks/model-tier-advisor.mjs + Ollama→Sonnet→Opus ladder), hermes (scripts/ask-hermes.mjs proxy :8645), hermes-agents (prism_hermes dispatcher / zulu fleet orchestrator), obsidian-vault (C:/Users/wompu/.claude/projects/H--prism/memory + knowledge/memories auto-feed), psn (11-leg PRISM Synergy Network — see knowledge/memories/feedback/feedback_psn_definition.md), prism-ai (aiSystemRouterEngine + prism_ai/prism_intelligence dispatchers), prism-learning-systems (closed-loop outcome ledger + GNN retrain + LoRA), crons (CronCreate tool + PRISM scheduled tasks), loops (/loop + prism_atcs), harnessed-loops (Workflow tool + /checkin Step12 autonomous loop), cag (scripts/lib/cag-router.mjs prompt-cache), rag (prism_memory semantic_search / scripts/lib/hybrid-retrieval), lora (adapter training pipeline), second-brain (the Obsidian memory namespace as cross-session brain), wikis (knowledge/wiki + /wiki-query), memories (prism_memory + auto-memory stop hook), tribal-knowledge (tribal-rerank.mjs injection).

Ground the governingRouter + howToInvoke fields by READING scripts/lib/task-substrate-router.mjs and scripts/lib/cag-router.mjs. Verify file/script existence with Glob before asserting a path (R12 — mark UNVERIFIED if you can't confirm).

Return ONLY a single fenced ```json block:
{"substrates":[{"name":"","whatItIs":"","whenToUse":"","howToInvoke"
... [+58 chars truncated]

### Assistant | 2026-06-15T05:45:20.738Z

[tool_use: Glob]

### Assistant | 2026-06-15T05:45:20.739Z

[tool_use: Glob]

### User | 2026-06-15T05:45:51.262Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-15T05:45:51.320Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-06-15T05:45:54.370Z

[tool_use: Bash]

### Assistant | 2026-06-15T05:45:54.408Z

[tool_use: Bash]

### User | 2026-06-15T05:46:34.290Z

[tool_result] __pycache__
__tests__
advisory-decay.mjs
advisory-decay.test.mjs
agent-overlay.mjs
ai-synergy-audit-lib.mjs
ai-synergy-audit-lib.test.mjs
alpha-backlog-extract.mjs
atomic-json.mjs
atomic-json.test.mjs
autostart-bus.mjs
autostart-bus.test.mjs
ball-nose-css-optimizer.mjs
ball-nose-css-optimizer.test.mjs
batch-self-nice.mjs
batch-self-nice.test.mjs
bg-app-throttle.mjs
blueprint-accuracy-consumer-lib.
... [+986 chars truncated]

### User | 2026-06-15T05:46:35.323Z

[tool_result] __fixtures__
__pycache__
__tests__
_archive
_audit-foxtrot-mill-cam.mjs
_classify-hooks.mjs
_completed_utilities
_emergency-unwire-yolo-25.mjs
_fix_ref_hb.js
_hook-audit-report.mjs
_memsync-commit.mjs
_oneshot-rename-last-night.mjs
_prep-hook-slices.mjs
_prism_paths.py
_restore-3-critical-hooks.mjs
_restore-continuity-hooks.mjs
_sfc-probe.mjs
_temp-orphan-scan.mjs
_tmp_tb_diff.txt
_tmp_tb_review.m
... [+837 chars truncated]

### Assistant | 2026-06-15T05:46:38.995Z

Good, the files exist. Let me read both router files and key scripts in parallel.

### Assistant | 2026-06-15T05:46:39.382Z

[tool_use: Read]

### Assistant | 2026-06-15T05:46:39.414Z

[tool_use: Read]

### User | 2026-06-15T05:47:02.987Z

[tool_result] 1	// RGS-PLANNING-LOOP-BRIDGE-MS0/U2 (2026-06-11, slot:tango)
2	// Per-task substrate-routing matrix: given a task + phase + context, decide the
3	// PRIMARY executor and emit the 5-substrate plan (Ollama / Obsidian / Hermes /
4	// Master-graph / PSN) with when/how/max-out for each. The "max out their
5	// capabilities" answer (U-SPEC-V2 section 4), made deterministic + testable.
6	//
7	// DEDUP: 
... [+6197 chars truncated]

### User | 2026-06-15T05:47:03.333Z

[tool_result] 1	// scripts/lib/cag-router.mjs
2	//
3	// CAG-Router — Classify a query as COLD (cache-augmented), HOT (retrieval-augmented),
4	// or HYBRID (both layers). Implements the Cache-Augmented Generation pattern
5	// (akshay_pachaar X tweet 2056714042455343160, 2026-05-19; foundational paper
6	// Chan et al. 2024 "Don't Do RAG: When Cache-Augmented Generation is All You Need").
7	//
8	// PURPOSE
9	// PR
... [+24660 chars truncated]

### Assistant | 2026-06-15T05:47:06.712Z

Now let me verify the existence of all the key scripts and files referenced for each substrate item.

### Assistant | 2026-06-15T05:47:07.960Z

[tool_use: Bash]

### Assistant | 2026-06-15T05:47:08.623Z

[tool_use: Bash]

### Assistant | 2026-06-15T05:47:08.994Z

[tool_use: Bash]

### Assistant | 2026-06-15T05:47:09.949Z

[tool_use: Bash]

### User | 2026-06-15T05:48:18.493Z

[tool_result] H:/prism/scripts/ask-hermes.mjs
H:/prism/scripts/ask-ollama.mjs
EXISTS

### User | 2026-06-15T05:48:18.614Z

[tool_result] H:/prism/scripts/lib/hybrid-retrieval.mjs
H:/prism/scripts/lib/hybrid-retrieval.test.mjs
H:/prism/scripts/lib/tribal-rerank-spawn.mjs
H:/prism/scripts/lib/tribal-rerank-spawn.test.mjs
EXISTS

### User | 2026-06-15T05:48:20.569Z

[tool_result] H:/prism/knowledge/memories:
_index
_legacy-root
connections
dreams
feedback
galaxies
inbox
MEMORY.md
MEMORY-ARCHIVE.md
mistakes
patterns
project
reference
reference_ocr_batch_task_stale_diagnosis_2026_06_09.md
reference_psn_mcp_manifest_2026_05_24.md
reference_psn_qdrant_revive_2026_05_24.md
references
scrutiny
uncategorized
user
weekly-hermes-reflection-2026-06-07.md
weekly-hermes-reflection-202
... [+718 chars truncated]

### User | 2026-06-15T05:48:20.951Z

[tool_result] <persisted-output>
Output too large (246.5KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism\ad9c3041-c806-4424-9eed-fea97a4fc64b\tool-results\bqlx2vyqo.txt

Preview (first 2KB):
feedback_adopt_ollama_offload_directives.md
feedback_agent_fanout_gate_on_fleet_load.md
feedback_ai_training_first_before_revenue.md
feedback_ai_upgrade_broadcast_protocol.md
feedback_all_means_all.md
fee
... [+1792 chars truncated]

### Assistant | 2026-06-15T05:48:23.840Z

Good. Now let me verify the remaining key paths.

### Assistant | 2026-06-15T05:48:24.335Z

[tool_use: Bash]

### Assistant | 2026-06-15T05:48:25.863Z

[tool_use: Bash]

### Assistant | 2026-06-15T05:48:26.680Z

[tool_use: Bash]

### Assistant | 2026-06-15T05:48:27.211Z

[tool_use: Bash]

### User | 2026-06-15T05:49:13.204Z

[tool_result] H:/prism/.claude/hooks/model-tier-advisor.mjs
EXISTS

### User | 2026-06-15T05:49:14.817Z

[tool_result] H:/prism/knowledge/memories/feedback/feedback_psn_definition.md
EXISTS

### User | 2026-06-15T05:49:15.566Z

[tool_result] H:/prism/mcp-server/src/engines/OllamaCAMIntegrationEngine.ts
H:/prism/mcp-server/src/engines/OllamaContextFloorEngine.ts
H:/prism/mcp-server/src/engines/OllamaHookBridgeEngine.ts
H:/prism/mcp-server/src/schemas/devActionSchemas.ts
H:/prism/mcp-server/src/tools/dispatchers/devDispatcher.ts

### User | 2026-06-15T05:49:17.047Z

[tool_result] DONE

### Assistant | 2026-06-15T05:49:22.897Z

Now let me verify the remaining substrate-specific paths.

### Assistant | 2026-06-15T05:49:22.898Z

[tool_use: Bash]

### Assistant | 2026-06-15T05:49:23.971Z

[tool_use: Bash]

### Assistant | 2026-06-15T05:49:24.644Z

[tool_use: Bash]

### Assistant | 2026-06-15T05:49:25.395Z

[tool_use: Bash]

### User | 2026-06-15T05:49:55.668Z

[tool_result] H:/prism/mcp-server/src/tools/dispatchers/hermesDispatcher.test.ts
H:/prism/mcp-server/src/tools/dispatchers/hermesDispatcher.ts

### User | 2026-06-15T05:49:57.227Z

[tool_result] H:/prism/mcp-server/src/config/dslAbbreviations.ts
H:/prism/mcp-server/src/data/product-catalog.ts
H:/prism/mcp-server/src/engines/AgentSpecializationProfileEngine.ts
H:/prism/mcp-server/src/engines/AIDeepKnowledgeIntegrationEngine.ts
H:/prism/mcp-server/src/engines/AIFeatureAutoRegistryEngine.ts

### User | 2026-06-15T05:49:57.717Z

[tool_result] H:/prism/scripts/lib/lora-training-pipeline.mjs
H:/prism/scripts/lib/lora-training-pipeline.test.mjs
H:/prism/scripts/lib/rag-hyde.mjs
H:/prism/scripts/lib/rag-hyde.test.mjs
H:/prism/scripts/lib/rag-llm-rerank.mjs
H:/prism/scripts/lib/rag-llm-rerank.test.mjs

### User | 2026-06-15T05:49:57.861Z

[tool_result] H:/prism/scripts/account-switch-restart-coordinator.mjs
H:/prism/scripts/ai-training-awareness.mjs
H:/prism/scripts/append-cad-corrections-to-fix-ledger.mjs
H:/prism/scripts/append-closed-loop-india-section.mjs
H:/prism/scripts/audit-closed-loop-training-coverage.mjs

### Assistant | 2026-06-15T05:50:02.370Z

Now let me check the remaining items — auto-memory stop hook, prism_atcs, Workflow tool loop, and the aiSystemRouterEngine dispatcher names.

### Assistant | 2026-06-15T05:50:03.438Z

[tool_use: Bash]

### Assistant | 2026-06-15T05:50:04.804Z

[tool_use: Bash]

### Assistant | 2026-06-15T05:50:06.201Z

[tool_use: Bash]

### Assistant | 2026-06-15T05:50:07.143Z

[tool_use: Bash]

### User | 2026-06-15T05:50:59.155Z

[tool_result] H:/prism/.claude/hooks/architecture-scanner.py
H:/prism/.claude/hooks/bundles/stop-bundle.mjs
H:/prism/.claude/hooks/commit-pressure-stop-gate.mjs
H:/prism/.claude/hooks/h-to-c-obsidian-mirror.mjs
H:/prism/.claude/hooks/handoff-memory-seed-stop.mjs

### User | 2026-06-15T05:50:59.283Z

[tool_result] H:/prism/mcp-server/src/tools/dispatchers/atcsDispatcher.ts
H:/prism/mcp-server/src/tools/dispatchers/autonomousDispatcher.ts
H:/prism/mcp-server/src/tools/dispatchers/devDispatcher.ts

### User | 2026-06-15T05:51:01.169Z

[tool_result] H:/prism/mcp-server/src/tools/dispatchers/aiDispatcher.ts
H:/prism/mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts
H:/prism/mcp-server/src/tools/dispatchers/camDispatcher.ts
H:/prism/mcp-server/src/tools/dispatchers/intelligenceDispatcher.ts
H:/prism/mcp-server/src/tools/dispatchers/outcomeDispatcher.ts

### User | 2026-06-15T05:55:38.351Z

[tool_result] Command running in background with ID: buyo63jg4. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\ad9c3041-c806-4424-9eed-fea97a4fc64b\tasks\buyo63jg4.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-06-15T05:55:42.476Z

Good. Let me check the auto-memory stop hook and get the exact dispatcher names for prism_ai and hermes.

### Assistant | 2026-06-15T05:55:42.477Z

[tool_use: Bash]

### Assistant | 2026-06-15T05:55:43.866Z

[tool_use: Bash]

### Assistant | 2026-06-15T05:55:43.887Z

[tool_use: Bash]

### Assistant | 2026-06-15T05:55:43.906Z

[tool_use: Bash]

### User | 2026-06-15T05:56:56.538Z

[tool_result] H:/prism/.claude/hooks/bundles/stop-bundle.mjs
H:/prism/.claude/hooks/handoff-memory-seed-stop.mjs

### User | 2026-06-15T05:56:57.959Z

[tool_result] /**
 * hermesDispatcher -- prism_hermes MCP tool. Bridge A of the bidirectional
 * Claude Code <-> Hermes integration: lets Claude Code drive the locally
 * installed Hermes Agent CLI (Nous Research) in a sandboxed, mock-by-default
 * way via HermesAutomationBridge.
 *
 * Carved out as its own dispatcher (prism_hermes) following the cimcoDispatcher
 * precedent. Actions are `hermes_*` prefixed for
... [+609 chars truncated]

### User | 2026-06-15T05:56:57.988Z

[tool_result] /**
 * AI Dispatcher
 * Handles model routing and intelligent task delegation between local and cloud models.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerAIDispatcher(server: McpServer): void {
  (server as any).tool(
    "prism_ai",
    "AI model routing and task delegation. Actions: route_task, classify_co
... [+349 chars truncated]

### User | 2026-06-15T05:57:01.201Z

[tool_result] /**
 * ATCS Dispatcher - Autonomous Task Completion System
 * Dispatcher #23: File-system-driven state machine for autonomous multi-session task execution
 * 
 * Tool: prism_atcs
 * Actions: task_init, task_resume, task_status, queue_next, unit_complete,
 *          batch_validate, checkpoint, replan, assemble, stub_scan
 * 
 * Architecture:
 *   State lives on disk (TASK_MANIFEST.json) — not in c
... [+526 chars truncated]

### Assistant | 2026-06-15T05:58:36.657Z

I now have all the information needed. Here is the complete routing-graph node documentation:

```json
{
  "substrates": [
    {
      "name": "ollama-offload",
      "whatItIs": "Local Ollama inference bridge that offloads mechanical text/code tasks from Claude via OllamaHookBridgeEngine and ask-ollama.mjs.",
      "whenToUse": "Task is mechanical (explain, summarize, classify, lint, docstring, diff, triage, graph-search) and NOT safety-critical G-code; use to hit >=30% Claude offload target.",
      "howToInvoke": "node H:/prism/scripts/ask-ollama.mjs <mode> <input> [--synth --json]; engine: H:/prism/mcp-server/src/engines/OllamaHookBridgeEngine.ts; hook: H:/prism/.claude/hooks/model-tier-advisor.mjs governs tier selection.",
      "costTier": "free",
      "governingRouter": "routeForgePhase() in scripts/lib/forge-route.mjs (consumed by task-substrate-router.mjs routeTask); OllamaHookBridgeEngine enforces at hook layer.",
      "taskClasses": ["locate", "recall", "review", "fix", "domain"]
    },
    {
      "name": "model-switching",
      "whatItIs": "Three-tier model ladder (Ollama -> Sonnet -> Opus) governed by model-tier-advisor hook and selectable via /model command.",
      "whenToUse": "Task complexity or token budget justifies escalating from local to cloud; model-tier-advisor fires on every UserPromptSubmit to recommend the appropriate tier.",
      "howToInvoke": "/model <tier> in Claude Code CLI; automatic via H:/prism/.claude/hooks/model-tier-advisor.mjs on each prompt; Ollama fallback through H:/prism/scripts/ask-ollama.mjs.",
      "costTier": "free",
      "governingRouter": "H:/prism/.claude/hooks/model-tier-advisor.mjs (UserPromptSubmit hook); routeForgePhase() in scripts/lib/forge-route.mjs supplies the lane/model fields consumed by routeTask().",
      "taskClasses": ["orchestrate", "plan", "build", "fix", "session"]
    },
    {
      "name": "hermes",
      "whatItIs": "Managed OAuth inference proxy at :8645 (Nous/xAI models) exposed via ask
... [+14995 chars truncated]
