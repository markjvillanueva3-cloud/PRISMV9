# PRISM MCP Server - Project Overview

## Purpose
PRISM (Manufacturing Intelligence) MCP Server - provides manufacturing domain tools via Model Context Protocol.
45 dispatchers, 684 verified actions covering: materials, machines, calculations, safety, toolpath, threading, compliance, telemetry, and more.
38/65 milestones complete (S0-S2, L0-L10). Ω = 0.912. Build: 4.2MB clean.

## Tech Stack
- TypeScript (Node.js 24)
- MCP SDK (@modelcontextprotocol/sdk)
- Zod for validation
- Express for HTTP transport
- esbuild for bundling
- Vitest for testing

## Key Paths
- Entry point: `src/index.ts`
- Dispatchers: `src/tools/dispatchers/` (45 dispatchers)
- Engines: `src/engines/` (74 engines)
- Roadmap: `data/roadmap-index.json` (v4.0.0) + `data/milestones/*.json` (65 envelopes)
- Registries: loaded via `src/registries/index.ts`
- Config: `src/config/`
- Types: `src/types/`

## Commands
- Build: `npm run build` (tsc --noEmit + esbuild). NEVER standalone tsc (needs 16GB+ heap)
- Test: `npx vitest`
- Start: `node dist/index.js` or `START_MCP_SERVER.bat`
- Fast build: `npm run build:fast`

## Architecture
- Dispatcher pattern: each dispatcher registers one `prism_*` tool with multiple actions via switch/case or Set-based routing
- Auto-hook proxy wraps all dispatchers with universal hooks + Λ/Φ safety validation on calc tools
- Registry manager loads material, machine, tool, alarm, formula data at startup
