# PRISM MCP Modernization — Design Spec

**Date**: 2026-03-15 (updated 2026-03-20)
**Status**: COMPLETE (9 waves delivered)
**Approach**: Hybrid Sprint (9 waves)

## Problem

PRISM exposes 67 dispatchers with 2474+ actions as MCP tools only.
Zero usage of MCP Resources, Prompts, Completions, Logging,
Tool Annotations, Progress Tracking, Tasks, Elicitation, or Sampling.
This limits PRISM to Claude Code — no portability to other MCP clients.

## Architecture

```
src/mcp/
├── index.ts              — Barrel export
├── toolAnnotations.ts    — 67 dispatcher annotation map
├── mcpLogging.ts         — Structured logging (RFC 5424)
├── resources.ts          — 5 resource types (1 static + 4 templates)
├── prompts.ts            — 7 MCP prompts for key workflows
├── completions.ts        — Autocomplete for resources/prompts
├── progressTracker.ts    — Progress notifications for long ops
├── taskTools.ts          — Async task-based simulation
└── agentConfig.ts        — Agent SDK configs (full/quick/batch)
```

## Wave 1: Tool Annotations + Logging + Progress (COMPLETE)

### Tool Annotations (`toolAnnotations.ts`)
- Maps all 67 dispatchers to `ToolAnnotations` hints
- Categories: read-only (28), compute (idempotent), mutating (14),
  external (3), autonomous (3), generators (7)
- Fields: `readOnlyHint`, `destructiveHint`, `idempotentHint`,
  `openWorldHint`, `title`
- Safety classification function: `getToolSafetyClass()`

### MCP Logging (`mcpLogging.ts`)
- Wraps `notifications/message` (RFC 5424 severity levels)
- Domain helpers: `logPhysics()`, `logSafety()`, `logSpeedFeed()`,
  `logSimulation()`, `logPipeline()`, `logPlaybook()`, `logCatalog()`
- Min-level filtering via `setMinLogLevel()`

### Progress Tracking (`progressTracker.ts`)
- `sendProgress(token, progress, total, message)`
- Pre-built reporters: simulation, monteCarlo, pipeline,
  feasibility, batch
- `createProgressReporter()` for custom multi-step operations

## Wave 2: Resources + Prompts + Completions (COMPLETE)

### MCP Resources (`resources.ts`)
- `prism://system/overview` — Static system summary
- `prism://machine/{machineId}` — 910 machine profiles
- `prism://material/{materialId}` — 2957 materials
- `prism://tool/{toolId}` — 94K cutting tools
- `prism://alarm/{alarmCode}` — 10K alarm decode

### MCP Prompts (`prompts.ts`)
7 prompts exposing key PRISM workflows to any MCP client:
1. `speed-feed` — 67-point Kienzle/Taylor analysis
2. `quote-job` — Physics-backed manufacturing quote
3. `cnc-simulate` — Vericut-class G-code simulation
4. `feasibility-check` — 7-engine machining feasibility
5. `machining-playbook` — 296-rule best practice advisor
6. `alarm-decode` — 10K alarm decode across 12 families
7. `tool-select` — 94K tool catalog with physics ranking

### Completions (`completions.ts`)
- Material autocomplete: 28 common materials
- Machine autocomplete: 25 common machines
- Operation types: 27 operations
- CAM systems: 18 systems
- Playbook categories: 29 categories
- `filterSuggestions()` with starts-with priority ranking

## Wave 3: Tasks + Progress (COMPLETE)

### MCP Task Tools (`taskTools.ts`)
- `prism_simulate_task`: Async CNC simulation via experimental Tasks API
  - `taskSupport: "required"` — always runs as async task
  - In-memory task state store with TTL cleanup
  - Background execution with taskStore.updateTask progress
  - Graceful fallback if experimental API not available
- Task state machine: working → completed/failed

### MCP Progress Tracking (`progressTracker.ts`)
- `sendProgress(token, progress, total, message)` notifications
- Pre-built reporters: simulation, monteCarlo, pipeline, feasibility, batch
- `createProgressReporter()` factory for custom multi-step operations

### MCP Elicitation (DEFERRED)
- Requires client-side support (form/URL mode)
- Will add when Claude Code/Desktop clients support elicitation

## Wave 4: Agent SDK Configuration (COMPLETE)

### agentConfig.ts — 3 Agent Configurations

**PRISM_AGENT_CONFIG** (Full autonomous):
```
Coordinator Agent (Opus, $5 budget, 50 turns)
├── speed-feed-expert (Haiku) — Kienzle/Taylor 67-point
├── feasibility-checker (Sonnet) — 7-engine feasibility
├── cnc-simulator (Sonnet) — 8-layer simulation stack
├── cam-strategist (Sonnet) — 433 strategies, 20 CAMs
└── quote-estimator (Haiku) — physics-backed costing
```

**PRISM_QUICK_CONFIG** (Fast calculations):
- Haiku model, $0.50 budget, 10 turns
- prism_calc + prism_data tools only

**PRISM_BATCH_CONFIG** (Headless structured output):
- Sonnet model, $2 budget, 30 turns
- JSON Schema output validation
- All PRISM tools, no explanations

### Features
- Budget caps ($0.50 / $2 / $5 per tier)
- Structured output (JSON Schema validation)
- Subagent context isolation (focused tool scoping)
- Safety hooks (PreToolUse on prism_safety)
- MCP server auto-start via stdio transport

## Wiring

All MCP primitives registered in `registerTools()` in `index.ts`:
```typescript
registerResources(server);
registerPrompts(server);
initMcpLogging((server as any).server);
```

## Wave 8b: MTConnect + MQTT + Bundle + Resource Links (COMPLETE)

### MTConnectAdapterEngine (~1043L)
- HTTP/XML adapter for MTConnect-enabled CNC machines
- 9 actions: probe, current, sample, assets, spindle_load,
  feed_override, machine_status, alarms
- Lightweight XML parsing (no external dependency)
- Spindle load trend analysis with Kienzle comparison
- Wired to machineLiveDispatcher (8 mtconnect_* actions)

### MqttBridgeEngine (~850L)
- MQTT IoT bridge for shop-floor sensor integration
- 9 actions: connect, subscribe, latest, history,
  set_alert, check_alerts, aggregate, vibration, temperature
- Vibration analysis with simple DFT (chatter detection)
- Thermal compensation (α × ΔT × L expansion calculation)
- Wired to machineLiveDispatcher (9 mqtt_* actions)

### MCP Bundle (manifest.json)
- .mcpb manifest for one-click Claude Desktop install
- Declares all tools, resources, prompts, capabilities
- Node.js 18+ runtime requirement

### Resource Links (resourceLinks.ts)
- materialLink(), machineLink(), toolLink(), alarmLink()
- extractResourceLinks() scans dispatcher results for linkable IDs
- Exported from src/mcp/index.ts barrel

## Wave 9: Sampling + Discovery (COMPLETE)

### Sampling with Tools (sampling.ts)
- Server requests LLM completions with PRISM tools available
- Pre-built tool sets: materialResolve, speedFeedValidate, machineSelect
- High-level helpers: resolveMaterial(), selectMachine()
- Model preferences: cost/speed/intelligence priority
- Enables autonomous multi-step manufacturing analysis

### PostCompact Restore
- Already handled by session-start-unified.sh
- Reads precompact-save output, re-injects PRISM state

## Build Verification

- TypeScript: 0 new errors
- esbuild: 50.8MB bundle
- All existing tests unaffected
- 19 files in src/mcp/ + manifest.json
