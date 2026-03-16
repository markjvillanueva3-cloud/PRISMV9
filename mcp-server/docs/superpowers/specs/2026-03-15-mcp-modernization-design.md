# PRISM MCP Modernization — Design Spec

**Date**: 2026-03-15
**Status**: COMPLETE (All 4 waves delivered)
**Approach**: Hybrid Sprint (4 waves)

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

## Build Verification

- TypeScript: 0 new errors (3 pre-existing in cli/tungaloy)
- esbuild: 38.4MB bundle
- All existing tests unaffected
- 8 new files in src/mcp/
