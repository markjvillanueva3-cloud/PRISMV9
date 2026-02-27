# PRISM MCP Server - Project Overview

## Purpose
PRISM (Manufacturing Intelligence) MCP Server - provides manufacturing domain tools via Model Context Protocol.
32 dispatchers, 670+ actions covering: materials, machines, calculations, safety, toolpath, threading, compliance, telemetry, and more.

## Tech Stack
- TypeScript (Node.js 24)
- MCP SDK (@modelcontextprotocol/sdk)
- Zod for validation
- Express for HTTP transport
- esbuild for bundling
- Vitest for testing

## Key Paths
- Entry point: `src/index.ts`
- Dispatchers: `src/tools/dispatchers/` (32 files)
- Engines: `src/engines/` (73+ engines)
- Registries: loaded via `src/registries/index.ts`
- Config: `src/config/`
- Types: `src/types/`

## Commands
- Build: `npx tsc --noEmit` (type check) + esbuild for bundling
- Test: `npx vitest`
- Start: `node dist/index.js` or `START_MCP_SERVER.bat`
- Fast build: `npm run build:fast`

## Architecture
- Dispatcher pattern: each dispatcher registers one `prism_*` tool with multiple actions via switch/case or Set-based routing
- Auto-hook proxy wraps all dispatchers with universal hooks + Λ/Φ safety validation on calc tools
- Registry manager loads material, machine, tool, alarm, formula data at startup
