# PRISM — Cowork Mode Integration Protocol

## What PRISM Is
CNC manufacturing intelligence platform. MCP Server (TypeScript) + Web App (React/Vite) + CAD Engine (Python).
Root: `H:\PRISM` (portable SSD). MCP Server: `H:\PRISM\mcp-server\`

## Access Method
Cowork accesses PRISM via **Desktop Commander** MCP tools (read_file, read_multiple_files, list_directory, write_file, start_process).
The PRISM MCP server tools are available to **Claude Code** sessions, not directly to Cowork.
## MANDATORY: Reference-First Protocol
**NEVER glob/grep the codebase.** Use these reference files (ordered by cost):

### Tier 0: Auto-Memory (zero tool calls)
- Dispatcher map, slash commands, architecture, hooks — all cached in Cowork auto-memory

### Tier 1: Single-Read References (1 tool call each)
| Need | File | Lines |
|------|------|-------|
| System counts | `mcp-server/data/quick-ref.json` | 34 |
| All MCP tools | `mcp-server/TOOL_REGISTRY.md` | 183 |
| Full component index | `mcp-server/SYSTEM_ARCHITECTURE.json` | 589 |
| Schema index | `mcp-server/schemas/SCHEMA_INDEX.json` | 130 |
| All paths | `PATH_CONFIG.json` | 123 |
| Slash commands | `SLASH_COMMANDS.md` | 324 |
| Roadmap | `PRISM-UNIFIED-ROADMAP.md` | 427 |

### Tier 2: Source Files (only when Tier 0-1 insufficient)
Read specific source files via Desktop Commander.
## Skills Available (H:\PRISM\mcp-server\.claude\skills\)
- **prism-navigate** — Zero-IO file/component routing. Use SYSTEM_ARCHITECTURE.json.
- **prism-status** — System health check. Use quick-ref.json first.
- **prism-roadmap** — Roadmap navigator. PRISM-UNIFIED-ROADMAP.md is authoritative.
- **prism-lookup** — Reference-first data lookup. Tiered: memory → ref files → source.

## Slash Command Routing (132 commands)
When user says a PRISM slash command, look it up in auto-memory (prism_slash_commands.md).
Key combos: `/full-job`, `/first-part-right`, `/cycle-time-crush`, `/bid-to-win`, `/shop-doctor`
Key dev: `/forge-engines`, `/autopilot`, `/scrutinize`, `/test`
Key nav: `/navigate`, `/status`, `/health`, `/engine-browse`

## Hook Awareness
Claude Code sessions have active hooks that auto-fire:
- Pre-edit safety gates block writes to protected files
- Anti-regression gates check for regressions
- TSC type-checker runs after .ts edits (throttled 30s)
- Review gate blocks engine edits after 3 changes without review
- Quality gate runs on task completion
When coordinating with Claude Code, be aware these hooks are enforcing quality.

## Coordination with Claude Code
- Claude Code owns: engines, dispatchers, algorithms, hooks, physics (backend L0-L4)
- Codex owns: web frontend, skills UI (L5)
- Shared state: `H:\PRISM\state\shared\`
  - `backend-status.md` — CLI Claude writes after each unit
  - `frontend-status.md` — Desktop/Codex writes after each task
  - `SYSTEM-CAPABILITIES.md` — full capabilities list
- Cowork role: planning, review, analysis, documentation, coordination

## Roadmap (Unified — March 2026)
MP-0 (foundation) → MP-1A (shop floor) → MP-1B (commercial) → MP-2 (realtime) → MP-3 (business) → MP-4 (simulation)
Side quests gated on main path completion. Machine domains (8) run post-MP-4.
See: `H:\PRISM\PRISM-UNIFIED-ROADMAP.md`

## Critical Rules
- **Never inline physics constants** — import from src/physics/constants.ts
- **Check ENGINE_DIGEST.md** before creating new engines (prevent duplicates)
- **Don't rebuild what exists** — 1,250 engines already built
- **MASTER_INDEX.json is 945KB** — never read it directly, use quick-ref.json or SYSTEM_ARCHITECTURE.json
- **Canonical roadmap** is PRISM-UNIFIED-ROADMAP.md, all v17-v23 are obsolete