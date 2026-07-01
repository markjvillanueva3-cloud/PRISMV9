---
type: "chat-session"
source: "claude-code-cli"
session_id: "087e5978-f3ed-4657-820e-aed49ae8aa0d"
title: "Search the PRISM repo at H:/PRISM for existing, reusable mechanisms I can COMPOS"
date: "2026-06-14"
first_ts: "2026-06-14T05:58:36.937Z"
last_ts: "2026-06-14T06:02:41.182Z"
cwd: "H:\\PRISM"
messages: 67
user_msgs: 29
assistant_msgs: 38
raw_file: "H:/.claude/projects/H--prism/087e5978-f3ed-4657-820e-aed49ae8aa0d/subagents/agent-a2d592f1a815ccf05.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:04"
---

# Search the PRISM repo at H:/PRISM for existing, reusable mechanisms I can COMPOS

> **claude-code-cli** | 2026-06-14 | 67 msgs (29 user / 38 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/087e5978-f3ed-4657-820e-aed49ae8aa0d/subagents/agent-a2d592f1a815ccf05.jsonl`

## Transcript

### User | 2026-06-14T05:58:36.937Z

Search the PRISM repo at H:/PRISM for existing, reusable mechanisms I can COMPOSE WITH (not rebuild) for a new "strategic stack-utilization router" that will be injected on /loop and /goal. I need to know what already exists so I don't duplicate it.

Find and report (with file:path and a 1-line description of the exported API for each):

1. **Task/intent classifiers** — any code that classifies a prompt or task into a category/bucket (e.g. code vs data vs design vs search). Likely candidates: scripts/ollama-offload.mjs (classify mode), scripts/lib/cag-router.mjs, .claude/hooks/skill-auto-trigger.mjs, scripts/lib/rgs-pipeline-rules.mjs, anything with "classify"/"intent"/"route"/"bucket".

2. **Tool/subsystem-selection registries** — any existing mapping of "task type -> which PRISM tools/dispatchers/subsystems to use". Likely: scripts/lib/rgs-pipeline-rules.mjs (RGS-TOOL-AUTOINVOKE), aiSystemRouterEngine, learning-routing.json, anything that recommends which tool for which job.

3. **The canonical synergy/substrate catalog** — read knowledge/memories/feedback/feedback_synergy_definition.md (or wherever it lives) and report its structure + the full list of substrates it names. Also check feedback_psn_definition.md for the 11-leg PSN list.

4. **injection-dedup + safe-truncate helpers** — confirm the exact exported API of scripts/lib/loop-inject-dedup.mjs (recordAndCheck signature) and any scripts/lib/injection-dedup.mjs / safe-truncate.mjs.

Report concisely: for each, the file path, exported function signatures, and whether it's a good reuse target for an intent-classify + subsystem-select router. Do NOT propose a design — just report what exists.

### Assistant | 2026-06-14T05:58:39.271Z

I'll search the PRISM repo systematically to find reusable mechanisms for your strategic stack-utilization router. Let me start with targeted searches.

### Assistant | 2026-06-14T05:58:39.508Z

[tool_use: Glob]

### Assistant | 2026-06-14T05:58:39.729Z

[tool_use: Glob]

### Assistant | 2026-06-14T05:58:40.091Z

[tool_use: Glob]

### User | 2026-06-14T05:58:55.252Z

[tool_result] scripts\materials_rebuild\generate.mjs
scripts\convert_to_ts.mjs
scripts\fix_imports.mjs
scripts\_archive\materials-legacy\fix_and_build.mjs
scripts\_archive\materials-legacy\fix_buffer_zones.mjs
scripts\extract-machines.mjs
scripts\gap-analysis.mjs
scripts\regen-code-index.mjs
scripts\extract-core-machines.mjs
scripts\index\build-shared-index-surfaces.mjs
scripts\_archive\audit\build-hook-skill-c
... [+3630 chars truncated]

### User | 2026-06-14T05:58:55.332Z

[tool_result] No files found

### User | 2026-06-14T05:58:55.414Z

[tool_result] knowledge\memories\uncategorized\devops_improvements.md
knowledge\memories\uncategorized\distributed_locking.md
knowledge\memories\uncategorized\handoff_pp_road_map.md
knowledge\memories\uncategorized\h_drive_master.md
knowledge\memories\uncategorized\jm-die-shop.md
knowledge\memories\uncategorized\plugin_architecture.md
knowledge\memories\uncategorized\prism_commands.md
knowledge\memories\uncateg
... [+5633 chars truncated]

### Assistant | 2026-06-14T05:58:59.606Z

I'll search more precisely for the key files you mentioned. Let me look for the specific mechanisms:

### Assistant | 2026-06-14T05:59:00.473Z

[tool_use: Grep]

### Assistant | 2026-06-14T05:59:00.761Z

[tool_use: Bash]

### Assistant | 2026-06-14T05:59:00.853Z

[tool_use: Read]

### User | 2026-06-14T05:59:04.127Z

[tool_result] EISDIR: illegal operation on a directory, read 'H:\PRISM\knowledge\memories'

### User | 2026-06-14T05:59:04.287Z

[tool_result] Found 51 files
scripts\lib\task-substrate-router.mjs
scripts\lib\docustrata-outcome-extract-lib.mjs
scripts\lib\memory-namespace-classifier.mjs
scripts\lib\docustrata-doc-pipeline-lib.mjs
scripts\lib\forge-worthiness.mjs
scripts\lib\local-llm-task-router.mjs
scripts\lib\model-routing-policy.mjs
scripts\lib\claude-tier-router.mjs
scripts\lib\wiki-domain-classifier.mjs
scripts\lib\forge-route.mjs
sc
... [+1515 chars truncated]

### User | 2026-06-14T05:59:29.791Z

[tool_result] H:\PRISM/.cache/npm/_npx/09002f125df728b2/node_modules/@claude-flow/mcp/.claude/helpers/router.js
H:\PRISM/.cache/npm/_npx/09002f125df728b2/node_modules/@claude-flow/mcp/node_modules/express/lib/router
H:\PRISM/.cache/npm/_npx/09002f125df728b2/node_modules/@claude-flow/neural/dist/moe-router.d.ts
H:\PRISM/.cache/npm/_npx/09002f125df728b2/node_modules/@claude-flow/neural/dist/moe-router.d.ts.map
H:
... [+2841 chars truncated]

### Assistant | 2026-06-14T05:59:31.413Z

Excellent! The graph identified some key files. Let me now read the specific routers and classifiers:

### Assistant | 2026-06-14T05:59:31.827Z

[tool_use: Read]

### Assistant | 2026-06-14T05:59:32.286Z

[tool_use: Read]

### Assistant | 2026-06-14T05:59:32.343Z

[tool_use: Read]

### Assistant | 2026-06-14T05:59:32.555Z

[tool_use: Read]

### Assistant | 2026-06-14T05:59:32.834Z

[tool_use: Bash]

### User | 2026-06-14T05:59:43.388Z

[tool_result] 1	// RGS-PLANNING-LOOP-BRIDGE-MS0/U2 (2026-06-11, slot:tango)
2	// Per-task substrate-routing matrix: given a task + phase + context, decide the
3	// PRIMARY executor and emit the 5-substrate plan (Ollama / Obsidian / Hermes /
4	// Master-graph / PSN) with when/how/max-out for each. The "max out their
5	// capabilities" answer (U-SPEC-V2 section 4), made deterministic + testable.
6	//
7	// DEDUP: 
... [+6197 chars truncated]

### User | 2026-06-14T05:59:44.217Z

[tool_result] 1	// tier: T4
2	// HERMES-EFFICIENCY-ROUTER / U1 (keystone) — Local-LLM task-routing brain.
3	//
4	// composes: ollama-cost-router (routeModelForTask) + host-aware-synthesis-model
5	//   (fetchInstalledModels) + host-class (detectHostClass). It is a COMPOSER, not a
6	//   new policy — model-tier selection is DELEGATED to routeModelForTask (the
7	//   canonical, Blackwell-tuned, install-truthful pi
... [+13405 chars truncated]

### User | 2026-06-14T05:59:44.268Z

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

### User | 2026-06-14T05:59:44.509Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/lib/memory-namespace-classifier.mjs
3	// U-GALAXY-MS1-B2 (2026-05-27, slot:alpha — sierra-territory alpha-skeleton):
4	// HMEMV05 memory-router intercept per SCOPE-EXPANSION §Q6 #2.
5	//
6	// Pure-function classifier that maps {key, value, context} → namespace target.
7	// Designed for memoryStoreEngine to call BEFORE writing to its SQLite table —
8	// the engine
... [+6216 chars truncated]

### User | 2026-06-14T05:59:52.708Z

[tool_result] <persisted-output>
Output too large (57.9KB). Full output saved to: C:\Users\wompu\.claude\projects\H--PRISM\087e5978-f3ed-4657-820e-aed49ae8aa0d\tool-results\bjnoopanp.txt

Preview (first 2KB):
H:\PRISM\knowledge\memories/feedback/feedback_psn_definition.md
H:\PRISM\knowledge\memories/feedback/feedback_synergy_definition.md
H:\PRISM\knowledge\memories/galaxies/cad/reference_delta_cad_galaxy_syner
... [+1766 chars truncated]

### Assistant | 2026-06-14T05:59:54.643Z

Now let me read the synergy/PSN definitions:

### Assistant | 2026-06-14T05:59:54.858Z

[tool_use: Read]

### Assistant | 2026-06-14T05:59:55.272Z

[tool_use: Read]

### Assistant | 2026-06-14T05:59:55.977Z

[tool_use: Grep]

### User | 2026-06-14T06:00:07.420Z

[tool_result] Found 2 files
scripts\lib\injection-dedup-fs.mjs
scripts\lib\loop-inject-dedup.mjs

### User | 2026-06-14T06:00:08.276Z

[tool_result] 1	---
2	name: feedback_synergy_definition
3	description: "Canonical operator definition of \"synergy\"/\"synergize\"/\"synergized\" -- it means EVERY PRISM substrate working together in unison, optimally and strategically. The all-systems directive. Sibling of [[feedback_psn_definition]]."
4	type: feedback
5	source: prism-memory
6	synced: 2026-06-14T05:57:43.218Z
7	aliases: feedback_synergy_defini
... [+3564 chars truncated]

### User | 2026-06-14T06:00:08.399Z

[tool_result] 1	---
2	name: psn-definition
3	description: The PRISM Synergy Network — canonical 11-leg taxonomy. Every PSN-aware tool/hook/skill refers here for the leg list. Fixes the broken pointer referenced in MEMORY.md since at least 2026-05-19.
4	aliases: feedback_psn_definition
5	type: feedback
6	source: prism-memory
7	synced: 2026-06-14T05:57:43.212Z
8	---
9	
10	
11	# PSN — PRISM Synergy Network (canoni
... [+4448 chars truncated]

### Assistant | 2026-06-14T06:00:10.795Z

Perfect. Let me read the dedup libraries:

### Assistant | 2026-06-14T06:00:11.030Z

[tool_use: Read]

### Assistant | 2026-06-14T06:00:11.777Z

[tool_use: Read]

### Assistant | 2026-06-14T06:00:11.976Z

[tool_use: Grep]

### User | 2026-06-14T06:00:29.647Z

[tool_result] Found 10 files
scripts\lib\task-substrate-router.mjs
scripts\lib\local-llm-task-router.mjs
scripts\lib\model-routing-policy.mjs
scripts\lib\claude-tier-router.mjs
scripts\lib\gnn-active-pool-select.mjs
scripts\lib\vision-model-select.mjs
scripts\lib\multi-provider-router.mjs
scripts\lib\catalog-extraction-router.mjs
scripts\lib\orchestrator-method-router.mjs
scripts\lib\course-data-router-lib.mjs

### User | 2026-06-14T06:00:31.576Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * loop-inject-dedup.mjs — SESSION-SCOPED dedup for UserPromptSubmit context
4	 * injection. When a hook would inject the SAME content it already injected
5	 * earlier in this session (after volatile-token normalization), the hook emits
6	 * a compact pointer instead — the model already holds the block.
7	 *
8	 * FOXTROT-WORK 2026-05-18 — realizes the dedup gate recom
... [+7563 chars truncated]

### User | 2026-06-14T06:00:31.640Z

[tool_result] 1	// scripts/lib/injection-dedup-fs.mjs
2	// -----------------------------------
3	// U-ALPHA-INJECT-DEDUP-FS (2026-06-11, slot:alpha) -- FS wrapper around the PURE injection-dedup
4	// lib so a UserPromptSubmit hook can adopt per-session dedup in ONE call instead of copy-pasting the
5	// 22-line sidecar dance (currently duplicated across 8 adopters). The pure lib stays FS-free + unit-
6	// testab
... [+4158 chars truncated]

### Assistant | 2026-06-14T06:00:35.742Z

Let me read the injection-dedup.mjs and safe-truncate.mjs core libraries:

### Assistant | 2026-06-14T06:00:36.223Z

[tool_use: Read]

### Assistant | 2026-06-14T06:00:36.229Z

[tool_use: Read]

### Assistant | 2026-06-14T06:00:36.904Z

[tool_use: Read]

### User | 2026-06-14T06:00:58.057Z

[tool_result] 1	// scripts/lib/injection-dedup.mjs
2	// ---------------------------------
3	// TOKEN-SAVINGS-EXPAND/U-PSN-INJECTION-DEDUP-LIB (2026-05-23, slot:alpha)
4	//
5	// Generic per-session injection deduper. UserPromptSubmit hooks fire ~14-16
6	// context blocks per prompt; many are byte-identical to prior emissions in
7	// the same session (wiki precheck, master-index, memory vault, slot soul).
8	// A 
... [+3855 chars truncated]

### User | 2026-06-14T06:00:58.138Z

[tool_result] 1	/**
2	 * safe-truncate.mjs -- UTF-8 + UTF-16-surrogate-safe string truncation + a
3	 * lone-surrogate sanitizer for anything that lands in a hook's injected
4	 * additionalContext (or any JSON body sent to an API).
5	 *
6	 * WHY (2026-06-10, slot:golf): a peer chat (bravo) hard-blocked with
7	 *   400 "The request body is not valid JSON: no low surrogate in string"
8	 * Root cause class: an inje
... [+5170 chars truncated]

### User | 2026-06-14T06:00:58.658Z

[tool_result] 1	// FORGE-PIPELINE-ROUTING-MS0/U-FORGE-ROUTE (2026-06-11, slot:tango)
2	// Makes the whole forge slash-command family token-optimal BY CONSTRUCTION.
3	//
4	// Every forge pipeline is a sequence of PHASES. Most phases are MECHANICAL
5	// (scout / enumerate / dedup / docstring / summarize / lint / html-emit) and
6	// must NOT run on the session's Opus/Fable model -- they route to the local
7	// Oll
... [+4972 chars truncated]

### Assistant | 2026-06-14T06:01:02.236Z

Perfect. Now let me check for tool-selection registries and the RGS rules:

### Assistant | 2026-06-14T06:01:02.682Z

[tool_use: Bash]

### Assistant | 2026-06-14T06:01:03.023Z

[tool_use: Read]

### User | 2026-06-14T06:01:07.017Z

[tool_result] 1	/**
2	 * model-routing-policy.mjs -- pure: the SINGLE per-prompt model-routing verdict that fuses the
3	 * Claude-tier decision with the MEASURED Ollama capability matrix (U-MODEL-ROUTE-POLICY, slot:india
4	 * 2026-06-11). This is the brain the advisor hook calls.
5	 *
6	 * OPERATOR POLICY (2026-06-11, "fable demolished session limits") -> one verdict per prompt:
7	 *   - ollama  : mechanical ta
... [+4086 chars truncated]

### User | 2026-06-14T06:01:13.874Z

[tool_result] H:\PRISM\scripts\lib/database-registry.mjs
H:\PRISM\scripts\lib/galaxy-mining-registry.mjs
H:\PRISM\scripts\lib/rgs-calibration-adapter.mjs
H:\PRISM\scripts\lib/rgs-calibration-adapter.test.mjs
H:\PRISM\scripts\lib/rgs-complexity.mjs
H:\PRISM\scripts\lib/rgs-complexity.test.mjs
H:\PRISM\scripts\lib/rgs-pipeline-rules.mjs
H:\PRISM\scripts\lib/rgs-pipeline-rules.test.mjs
H:\PRISM\scripts\lib/rgs-pla
... [+432 chars truncated]

### Assistant | 2026-06-14T06:01:15.462Z

Let me read the key RGS files:

### Assistant | 2026-06-14T06:01:15.875Z

[tool_use: Read]

### Assistant | 2026-06-14T06:01:16.302Z

[tool_use: Read]

### Assistant | 2026-06-14T06:01:16.721Z

[tool_use: Bash]

### User | 2026-06-14T06:01:30.485Z

[tool_result] 1	/**
2	 * rgs-unit-enum.mjs
3	 * Enumerates every OPEN (not-yet-shipped) roadmap unit across all milestone envelopes.
4	 *
5	 * Real data shapes found (verified 2026-05-15):
6	 *   - 384 envelopes: envelope.phases[].units[]  (phases take precedence when BOTH present)
7	 *   - 254 envelopes: envelope.units[]           (top-level, no phases)
8	 *   -   7 envelopes: BOTH phases and top-level units →
... [+3422 chars truncated]

### User | 2026-06-14T06:01:30.552Z

[tool_result] 1	/**
2	 * rgs-pipeline-rules.mjs
3	 * Pure, no-I/O rule table mapping roadmap unit text -> PRISM dev pipeline skills + review agents.
4	 * Frozen rule arrays — mutation throws in strict mode (deep-frozen via deepFreezeArray
5	 * per U-DOMAIN-RULES Arm A scrutiny P0-2; the docstring's contract now actually holds).
6	 *
7	 * Exports:
8	 *   matchPipelines(unit) -> {skill, why, confidence}[]  (alway
... [+7146 chars truncated]

### User | 2026-06-14T06:01:37.838Z

[tool_result] H:\PRISM\scripts\lib/galaxy-salience.test.mjs
H:\PRISM\scripts\lib/holder-geometry.mjs
H:\PRISM\scripts\lib/kip-lora-rotation.mjs
H:\PRISM\scripts\lib/ollama-bridge-telemetry.mjs
H:\PRISM\scripts\lib/orchestrator-pipeline-shell.mjs
H:\PRISM\scripts\lib/orchestrator-toolpath-context.mjs
H:\PRISM\scripts\lib/rgs-calibration-adapter.mjs
H:\PRISM\scripts\lib/rgs-pipeline-rules.mjs
H:\PRISM\scripts\lib
... [+69 chars truncated]

### Assistant | 2026-06-14T06:01:39.776Z

Let me search for tool-selection and subsystem routing directly:

### Assistant | 2026-06-14T06:01:40.281Z

[tool_use: Bash]

### Assistant | 2026-06-14T06:01:40.631Z

[tool_use: Read]

### Assistant | 2026-06-14T06:01:41.075Z

[tool_use: Bash]

### User | 2026-06-14T06:01:53.252Z

[tool_result] 1	/**
2	 * claude-tier-router.mjs -- pure: decide WHICH CLAUDE TIER (fable/opus/sonnet/haiku) a Claude-bound
3	 * task uses (U-CLAUDE-TIER-ROUTE, slot:india 2026-06-11). The MISSING LAYER above the canonical
4	 * executor contract.
5	 *
6	 * WHAT ALREADY EXISTS (reused here, NOT re-derived -- R7/R8):
7	 *   - [[local-llm-task-router]] classifyTaskClass(task) -> {taskClass, category} + isSafetyCrit
... [+4969 chars truncated]

### User | 2026-06-14T06:01:58.975Z

[tool_result] H:\PRISM\scripts\lib/kip-lora-rotation.mjs: * RGS-TOOL-AUTOINVOKE-MS1 lesson — "pure core + injected readers MUST ship
H:\PRISM\scripts\lib/rgs-calibration-adapter.mjs: * Why this exists (U-LIMA-A7 / RGS-TOOL-AUTOINVOKE-MS1 P1 item #5):
H:\PRISM\scripts\lib/rgs-pipeline-rules.mjs:    // U-DOMAIN-RULES tightening (RGS-TOOL-AUTOINVOKE-MS1): the original bare
H:\PRISM\scripts\lib/rgs-pipeline-rules.m
... [+770 chars truncated]

### User | 2026-06-14T06:01:59.059Z

[tool_result] H:\PRISM\scripts\lib/rgs-pipeline-rules.mjs
H:\PRISM\scripts\lib/rgs-pipeline-rules.test.mjs
H:\PRISM\scripts\lib/rgs-signal-fusion.mjs
H:\PRISM\scripts\lib/rgs-signal-fusion.test.mjs
H:\PRISM\scripts\lib/rgs-transfer-priors-adapter.mjs

### Assistant | 2026-06-14T06:02:41.182Z

Excellent! Now I have a comprehensive map. Let me compile my findings into a concise report:

---

## COMPOSITION INVENTORY: PRISM Strategic Stack-Utilization Router

Based on a thorough search of `H:\PRISM`, here are the **reusable mechanisms** you can compose for your `/loop` and `/goal` injected router—all with verified export APIs:

---

### 1. TASK/INTENT CLASSIFIERS

| File | Exported API | 1-line description |
|------|--------------|-------------------|
| **scripts/lib/local-llm-task-router.mjs** | `classifyTaskClass(task)` → `{taskClass, category}`; `isSafetyCritical(task)` → `boolean`; `routeTask(args)` → async verdict | Routes tasks to local-vs-Claude + picks Ollama model; safety-critical gates to Claude; classes: classify/codegen/reason/synthesize/extract/explain/format/document/git_summary/unknown |
| **scripts/lib/cag-router.mjs** | `classifyQuery(query, options?)` → `{tier, confidence, evidence, coldSources[], hotSources[], scores, normalizedQuery, truncated}`; `coldSourcesFor(query)` → `string[]` | Cache-Augmented Generation router: COLD (static doctrine) / HOT (live state) / HYBRID; classifies queries for prompt-cache optimization; 64KB truncation guard |
| **scripts/lib/memory-namespace-classifier.mjs** | `classifyNamespace({key, value, slot, sessionId})` → `{namespace, target, confidence, reason}` | Classifies memory writes to: universal / galaxy:<name> / slot-soul:<slot> / ephemeral:<sessionId>; 13 galaxy keywords (mill/lathe/wedm/cam/cad/quoting/etc.) |
| **scripts/lib/model-routing-policy.mjs** | `routePrompt({prompt, matrix, threshold})` → `{engine, model, tier, taskClass, reason}`; `ollamaSafeClassModels(matrix, threshold)` → `Map<class, model>` | Fuses task classification + capability matrix to route ollama/fable/opus/sonnet/haiku; BATTERY_TO_CLASS maps probe tasks → classes |
| **scripts/lib/claude-tier-router.mjs** | `routeClaudeTier({task})` → `{tier, reason, taskClass}`; `refineTopTier({claudeModel, task?, taskClass?})` → `string` | Split
... [+7950 chars truncated]
