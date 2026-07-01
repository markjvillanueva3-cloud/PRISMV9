---
type: "chat-session"
source: "claude-code-cli"
session_id: "339c8ff7-73f9-4ab2-9d68-2e10d32f5267"
title: "You're auditing PRISM's AI/local-compute stack as part of a /forge-audit-v2 pass"
date: "2026-05-16"
first_ts: "2026-05-16T20:00:37.594Z"
last_ts: "2026-05-16T20:02:51.048Z"
cwd: "H:\\prism"
messages: 64
user_msgs: 28
assistant_msgs: 36
raw_file: "H:/.claude/projects/H--prism/339c8ff7-73f9-4ab2-9d68-2e10d32f5267/subagents/agent-aab38b4ff849be3be.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:10"
---

# You're auditing PRISM's AI/local-compute stack as part of a /forge-audit-v2 pass

> **claude-code-cli** | 2026-05-16 | 64 msgs (28 user / 36 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/339c8ff7-73f9-4ab2-9d68-2e10d32f5267/subagents/agent-aab38b4ff849be3be.jsonl`

## Transcript

### User | 2026-05-16T20:00:37.594Z

You're auditing PRISM's AI/local-compute stack as part of a /forge-audit-v2 pass. Report in under 600 words with concrete findings (file paths + counts + status).

I need to know what's WIRED vs DARK vs UNDERUTILIZED across:

1. **Ollama usage.** Run `node H:/prism/scripts/ollama-offload-dashboard.mjs --json 2>&1 | head -80` and report: current offload rate (%), tokens-saved-recent, total events recorded, top-5 hooks by fire-count. Then check `H:/prism/state/shared/system-viz/system-graph.json` first 30 lines for the Ollama-related node counts (just grep for "ollama" / "Ollama" anywhere in `meta.headline`). List Ollama hooks via `ls H:/prism/.claude/hooks/ollama-*.mjs` (count them). Is `ollama-pipeline-injector.mjs` wired in `H:/.claude/settings.json`? grep for it.

2. **Docker / local services.** Run `node H:/prism/scripts/ollama-docker-health.mjs --text 2>&1` and report the one-line health. Are Qdrant + Postgres + Prometheus containers running? Read `H:/prism/state/shared/DOCKER_RUNTIME_STATE.json` first 30 lines if it exists.

3. **Neural-network / Deep-learning / ML engines.** Count engines via `ls H:/prism/mcp-server/src/engines/*Neural*.ts H:/prism/mcp-server/src/engines/*DeepLearning*.ts H:/prism/mcp-server/src/engines/*ML*.ts 2>&1`. Read the first 30 lines of `H:/prism/mcp-server/data/docs/ENGINE_DIGEST.md` to get the headline. Specifically look for engines that exist but might be unwired (check digest for "NEEDS_WIRING").

4. **PRISM AI / creative reasoning.** Read the first 50 lines of `H:/prism/mcp-server/src/engines/PRISMCreativeReasoningEngine.ts` (or `.js` in dist) — does it have an `explore()` method? Read `H:/prism/mcp-server/src/engines/AISystemRouterEngine.ts` first 50 lines — what routing decisions does it make today?

5. **Tribal knowledge.** Read `H:/prism/state/shared/system-viz/system-graph.json` first 30 lines for `tribal` node counts in `meta.headline`. Check `H:/prism/knowledge/wiki/architecture/` for tribal-tip wiki entries — count them wi
... [+696 chars truncated]

### Assistant | 2026-05-16T20:00:39.567Z

I'll systematically audit PRISM's AI/local-compute stack. Let me gather the data.

### Assistant | 2026-05-16T20:00:39.860Z

[tool_use: Bash]

### User | 2026-05-16T20:00:44.557Z

[tool_result] {
  "totals": {
    "offloaded": 63,
    "keptOnClaude": 181,
    "estimatedTokensSaved": 14625,
    "silentSuggestions": 100,
    "injectedSuggestions": 1
  },
  "byHook": {
    "ollama-task-offloader": {
      "fired": 305,
      "offloaded": 61,
      "kept": 181,
      "suggested": 63,
      "tokensSaved": 14325
    },
    "ollama-engine-api-extractor": {
      "fired": 2,
      "offloaded": 2
... [+696 chars truncated]

### Assistant | 2026-05-16T20:00:45.968Z

Good start. Now let me gather the rest of the data in parallel.

### Assistant | 2026-05-16T20:00:46.428Z

[tool_use: Read]

### Assistant | 2026-05-16T20:00:46.882Z

[tool_use: Bash]

### Assistant | 2026-05-16T20:00:47.390Z

[tool_use: Bash]

### Assistant | 2026-05-16T20:00:47.736Z

[tool_use: Bash]

### Assistant | 2026-05-16T20:00:47.900Z

[tool_use: Read]

### User | 2026-05-16T20:00:48.835Z

[tool_result] 1	{
2	  "schemaVersion": "2.1.0",
3	  "generatedAt": "2026-05-16T19:00:19.529Z",
4	  "meta": {
5	    "counts": {
6	      "engines": 3256,
7	      "dispatchers": 97,
8	      "actions": 7683,
9	      "algorithms": 53,
10	      "registries": 27,
11	      "tests": 3673,
12	      "srcHooks": 54,
13	      "claudeHooks": 604,
14	      "scripts": 833,
15	      "slashLocal": 184,
16	      "slashUser": 394,
... [+326 chars truncated]

### User | 2026-05-16T20:00:52.389Z

[tool_result] 17

### User | 2026-05-16T20:00:53.678Z

[tool_result]             "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/ollama-pipeline-injector.mjs",

### User | 2026-05-16T20:01:14.264Z

[tool_result] local-compute: ✓ Ollama 5 models · 1 warm · ✗ Docker spawnSync docker ETIMEDOUT · ✗ Qdrant · ✗ Postgres · ✗ Prometheus

### User | 2026-05-16T20:01:17.082Z

[tool_result] 1	{
2	  "schemaVersion": 1,
3	  "startedAt": "2026-05-16T19:59:40.122Z",
4	  "services_requested": [
5	    "ollama"
6	  ],
7	  "models_requested": [],
8	  "steps": {
9	    "ollama_direct_probe": {
10	      "ok": true,
11	      "port": 11434,
12	      "models": [
13	        "qwen2.5-coder:14b",
14	        "deepseek-r1:14b",
15	        "nomic-embed-text:latest",
16	        "qwen2.5-coder:32b",
17	  
... [+329 chars truncated]

### Assistant | 2026-05-16T20:01:18.576Z

Let me continue efficiently with local offload for large files.

### Assistant | 2026-05-16T20:01:19.206Z

[tool_use: Bash]

### Assistant | 2026-05-16T20:01:19.653Z

[tool_use: Read]

### Assistant | 2026-05-16T20:01:19.899Z

[tool_use: Bash]

### Assistant | 2026-05-16T20:01:20.328Z

[tool_use: Bash]

### Assistant | 2026-05-16T20:01:20.515Z

[tool_use: Bash]

### Assistant | 2026-05-16T20:01:20.808Z

[tool_use: Bash]

### User | 2026-05-16T20:01:22.906Z

[tool_result] 1	# ENGINE DIGEST
2	## 3217 engines indexed
3	## Auto-generated: 2026-05-12 (manually appended 4 entries for TRAINING-LEARNING-MS0/U-TL-U5..U6)
4	
5	- **AbrasiveJetMachiningEngine**: Physics-Based Abrasive Waterjet Prediction
6	- **AbsorptionChillerEngine**: Absorption refrigeration cycle analysis
7	- **AbstractionHierarchyEngine**: Multi-level tip→principle→law generalization
8	- **AccessControlL
... [+1749 chars truncated]

### User | 2026-05-16T20:01:27.208Z

[tool_result] H:/prism/mcp-server/src/engines/AIMLEngine.ts
H:/prism/mcp-server/src/engines/AIMLFormulasEngine.ts
H:/prism/mcp-server/src/engines/AdvancedMLStatisticsEngine.ts
H:/prism/mcp-server/src/engines/CAMDeepLearningEngine.ts
H:/prism/mcp-server/src/engines/CAMDeepLearningOrchestratorEngine.ts
H:/prism/mcp-server/src/engines/CAMLoRAAdapterTrainerEngine.ts
H:/prism/mcp-server/src/engines/CAMLoRAEngine.ts

... [+4647 chars truncated]

### User | 2026-05-16T20:01:28.089Z

[tool_result] 238

### User | 2026-05-16T20:01:28.242Z

[tool_result] H:/prism/state/shared/ADAPTIVE-VARIABILITY-FRAMEWORK-PROPOSAL.md
H:/prism/state/shared/AI-AWARE-HARDEN-CROSS-ROADMAP-SCRUTINY-2026-04-17.md
H:/prism/state/shared/CLOSE-OUT-CANDIDATES.json
H:/prism/state/shared/CLOSE-OUT-CANDIDATES.md
H:/prism/state/shared/CLOSE-OUT-DEFERRED.md
H:/prism/state/shared/CRASH-DIAGNOSIS-2026-05-08.md
H:/prism/state/shared/DESKTOP-CLAUDE-SYSTEM-PROMPT-PROPOSAL.md
H:/pris
... [+392 chars truncated]

### User | 2026-05-16T20:01:28.358Z

[tool_result] H:/prism/state/shared/PRISM_CAPABILITY_MANIFEST.md
H:/prism/state/shared/PRISM_SHARED_INDEX_SURFACES.md

### User | 2026-05-16T20:01:28.466Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-05-16T20:01:29.802Z

Now let me check PRISM Creative Reasoning and AISystemRouter, then dispatcher digest.

### Assistant | 2026-05-16T20:01:30.231Z

[tool_use: Read]

### Assistant | 2026-05-16T20:01:30.445Z

[tool_use: Read]

### Assistant | 2026-05-16T20:01:30.862Z

[tool_use: Read]

### Assistant | 2026-05-16T20:01:31.096Z

[tool_use: Bash]

### User | 2026-05-16T20:01:31.515Z

[tool_result] 1	/**
2	 * PRISMCreativeReasoningEngine — Creative Problem Solving & Novel Approach Discovery
3	 *
4	 * This engine enables PRISM to:
5	 * - Think outside conventional machining norms
6	 * - Discover hybrid approaches combining multiple techniques
7	 * - Invent novel solutions by cross-referencing knowledge domains
8	 * - Make mathematically optimal decisions using all available data
9	 * - Maximi
... [+1718 chars truncated]

### User | 2026-05-16T20:01:31.794Z

[tool_result] 1	/**
2	 * AISystemRouterEngine
3	 *
4	 * Routes incoming AI work to the most appropriate execution system based on
5	 * task class. Spec from /forge Phase 0 Self-Awareness Protocol:
6	 *
7	 *   | Task                | System                       |
8	 *   |---------------------|------------------------------|
9	 *   | Physics validation  | Docker: physics-agent        |
10	 *   | Engine building 
... [+1283 chars truncated]

### User | 2026-05-16T20:01:31.986Z

[tool_result] 1	# PRISM Dispatcher Digest
2	
3	**97 dispatchers** route MCP actions to engines.
4	Each dispatcher handles a specific manufacturing/system domain.
5	Auto-generated: 2026-05-16 (by `scripts/generate-dispatcher-digest.mjs` — re-run after dispatcher edits).
6	Total actions across all dispatchers: **10268**.
7	
8	## Dispatcher Map
9	
10	| Dispatcher | Domain | Actions |
11	|-----------|--------|-----
... [+5215 chars truncated]

### User | 2026-05-16T20:01:36.867Z

[tool_result] Exit code 2
ls: cannot access 'H:/prism/state/shared/PRISM_OS*.md': No such file or directory

### Assistant | 2026-05-16T20:01:38.500Z

Let me now check the remaining items and compile findings.

### Assistant | 2026-05-16T20:01:39.157Z

[tool_use: Bash]

### Assistant | 2026-05-16T20:01:39.568Z

[tool_use: Bash]

### Assistant | 2026-05-16T20:01:40.198Z

[tool_use: Bash]

### Assistant | 2026-05-16T20:01:40.815Z

[tool_use: Bash]

### Assistant | 2026-05-16T20:01:41.211Z

[tool_use: Bash]

### User | 2026-05-16T20:01:46.129Z

[tool_result] | Dispatcher | Domain | Actions |
|-----------|--------|---------|
| adaptiveControlDispatcher | prism_adaptive_control — Adaptive Control & Digital Twin dispatcher — real-time fe... | 43 |
| agentDispatcher | prism_agent — PRISM Agent — Intelligent manufacturing agent exposing me... | 21 |
| aiReasoningDispatcher | (no server.tool found) | 426 |
| algorithmDispatcher | prism_algorithm — Algorithm
... [+2625 chars truncated]

### User | 2026-05-16T20:01:46.565Z

[tool_result] (Bash completed with no output)

### User | 2026-05-16T20:01:50.043Z

[tool_result] | weldingJoiningDispatcher | prism_welding — Welding & joining: adhesive bonding, brazing/soldering, u... | 12 |
| vibrationPhysicsDispatcher | prism_vibration_physics — Vibration, dynamics & cutting physics: VAM, vibration dam... | 36 |
| validationDispatcher | prism_validate — Validation dispatcher. Actions: material, kienzle, taylor... | 18 |
| turningProgramDispatcher | prism_turning_program —
... [+283 chars truncated]

### User | 2026-05-16T20:01:55.488Z

[tool_result]       "unwired": 836,

### User | 2026-05-16T20:01:55.744Z

[tool_result] H:/prism/.claude/hooks/tribal-autowire.mjs*
H:/prism/.claude/hooks/tribal-by-domain-inject.mjs*
H:/prism/.claude/hooks/tribal-by-domain-inject.test.mjs*
H:/prism/.claude/hooks/tribal-inject-on-edit.mjs*
H:/prism/.claude/hooks/tribal-spike.mjs*

### Assistant | 2026-05-16T20:01:57.344Z

Perfect. Now let me get the top-5 dispatchers by action count and verify the remaining pieces.

### Assistant | 2026-05-16T20:01:58.199Z

[tool_use: Bash]

### Assistant | 2026-05-16T20:01:58.854Z

[tool_use: Bash]

### Assistant | 2026-05-16T20:01:59.136Z

[tool_use: Bash]

### User | 2026-05-16T20:02:01.828Z

[tool_result] prism_welding — Welding & joining: adhesive bonding, brazing/soldering, u... 
prism_vibration_physics — Vibration, dynamics & cutting physics: VAM, vibration dam... 
prism_validate — Validation dispatcher. Actions: material, kienzle, taylor... 
prism_turning_program — Turning Print-to-Program — generates CNC lathe programs f... 
prism_turning — Turning-specific dispatcher â€” SAFETY CRITICAL. Chuc
... [+7 chars truncated]

### User | 2026-05-16T20:02:06.259Z

[tool_result] 80

### User | 2026-05-16T20:02:06.335Z

[tool_result] # PRISM Capability Manifest
## Token-Efficient System Awareness (Updated: 2026-04-12)

### WHAT PRISM IS
Manufacturing Intelligence Platform — AI-powered CNC programming, quoting, scheduling, quality control.
Test shop: JM Die Company (cold heading dies for fastener industry).

### WHAT'S BUILT (Counts)
```
82 dispatchers | 4,891 actions | 1,538 engines | 52 algorithms
23 registries | 50
... [+1514 chars truncated]

### Assistant | 2026-05-16T20:02:07.764Z

Let me fix that and get the precise dispatcher top-5.

### Assistant | 2026-05-16T20:02:08.746Z

[tool_use: Bash]

### User | 2026-05-16T20:02:13.862Z

[tool_result]  prism_validate — Validation dispatcher. Actions: material, kienzle, taylor...
 prism_turning — Turning-specific dispatcher â€” SAFETY CRITICAL. Chuck ja...
 prism_toolpath — Toolpath strategy engine: strategy selection, parameter c...
 prism_thread — Threading calculations: tap drill, thread milling, depth,...
 prism_tenant — Multi-tenant isolation with Shared Learning Bus. Tenant n...

### Assistant | 2026-05-16T20:02:15.102Z

Let me try a cleaner approach on the dispatcher digest.

### Assistant | 2026-05-16T20:02:16.130Z

[tool_use: Bash]

### Assistant | 2026-05-16T20:02:16.418Z

[tool_use: Bash]

### User | 2026-05-16T20:02:19.337Z

[tool_result]  camDispatcher  2221
 calcDispatcher  1321
 ppDispatcher  801
 devDispatcher  474
 businessDispatcher  458

### User | 2026-05-16T20:02:22.588Z

[tool_result] | awarenessMiddleware | (no server.tool found) | 0 |
| cplDispatcher | (no server.tool found) | 54 |
| intakeDispatcher | (no server.tool found) | 1 |

### Assistant | 2026-05-16T20:02:51.048Z

Perfect. Now I have all the data needed. Let me compile the audit report.

---

## PRISM AI/Local-Compute Stack Audit (2026-05-16)

### 1. OLLAMA USAGE — WIRED, MODERATELY UTILIZED
**Status:** ✓ Direct integration active. 5 models loaded (qwen2.5-coder 7b/14b/32b, deepseek-r1:14b, nomic-embed-text).

**Offload Metrics:**
- **Offload rate:** 25.8% (63/244 tasks routed to Ollama in 24h window)
- **Tokens saved:** 14,625 recent (24h: 14,325)
- **Events recorded:** 342 recent (7-day baseline: 244 kept locally, 63 offloaded)
- **Top-5 hooks by fire-count:** 
  1. `ollama-task-offloader`: 305 fires (61 offloaded, 181 kept)
  2. `fleet-reaper-coordinator`: 38 fires (suggestions only)
  3. `ollama-engine-api-extractor`: 2 fires (2 offloaded)

**Hooks:** 17 Ollama-prefixed hooks in `H:/prism/.claude/hooks/ollama-*.mjs`.  
**Wiring:** ✓ `ollama-pipeline-injector.mjs` confirmed in `H:/.claude/settings.json` via grep.  
**Finding:** Moderate underutilization — 74.2% of routable tasks stay on Claude (81/244 actually offloaded vs 74% staying). Silent suggestions high (100/342 events). Consider tuning task-offloader threshold or expanding eligible task classes.

---

### 2. DOCKER / LOCAL SERVICES — DEGRADED
**Health:** `✓ Ollama 5 models · 1 warm · ✗ Docker spawnSync ETIMEDOUT · ✗ Qdrant · ✗ Postgres · ✗ Prometheus`

**Status:** 
- Ollama: Direct mode, port 11434 ✓ (native, not containerized)
- Qdrant: Dark (down/unreachable)
- Postgres: Dark (down/unreachable)
- Prometheus: Dark (down/unreachable)
- Docker daemon: Unresponsive (ETIMEDOUT on spawn)

**DOCKER_RUNTIME_STATE.json:** Recorded 2026-05-16T19:59:40Z; only Ollama direct probe succeeded. No container orchestration active.

**Finding:** Local services layer is **DARK**. Physics-agent and batch-processor Docker backends unavailable, degrading AISystemRouterEngine's dispatch options (fallback to Claude-only).

---

### 3. NEURAL-NETWORK / DEEP-LEARNING / ML ENGINES — WIRED BUT UNDERUTILIZED
**Count:** 80 engine files matchin
... [+5182 chars truncated]
