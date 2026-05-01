# /lookup — PRISM Reference-First Data Lookup

## Trigger
User asks about materials, tools, machines, formulas, algorithms, alarms, or any data lookup.

## Protocol — Reference Files First, MCP Tools Second
The goal is MINIMUM tool calls. Use cached reference files before hitting the MCP server.

### Tier 1: Zero-Cost (from auto-memory)
Check auto-memory first for:
- Dispatcher routing → prism_dispatcher_map.md
- Slash command routing → prism_slash_commands.md
- File paths → prism_architecture.md
- Hook behavior → prism_hooks_autofire.md

### Tier 2: One-Read Reference Files
| Question | Read This File | Lines |
|----------|---------------|-------|
| System counts | `data/quick-ref.json` | 34 |
| All MCP tools | `TOOL_REGISTRY.md` | 183 |
| All components | `SYSTEM_ARCHITECTURE.json` | 589 |
| All schemas | `schemas/SCHEMA_INDEX.json` | 130 |
| All paths | `PATH_CONFIG.json` | 123 |
| All slash commands | `SLASH_COMMANDS.md` | 324 |
| Roadmap | `PRISM-UNIFIED-ROADMAP.md` | 427 |

### Tier 3: MCP Server Tools (only when reference files don't have the answer)
Use Desktop Commander to read specific source files:
- Material data: `H:\PRISM\mcp-server\src\registries\MaterialRegistry.ts`
- Machine data: `H:\PRISM\mcp-server\src\registries\MachineRegistry.ts`
- Tool data: `H:\PRISM\mcp-server\src\registries\ToolRegistry.ts`
- Formula data: `H:\PRISM\mcp-server\src\registries\FormulaRegistry.ts`
- Algorithm data: `H:\PRISM\mcp-server\src\algorithms\{name}.ts`

### Tier 4: Full MCP Tool Invocation
Only when you need computed results (calculations, searches, cross-queries).
The PRISM MCP server must be running for this. Check with:
```
Start: cd H:\PRISM\mcp-server && node dist/index.js
```

## DSL Abbreviations
PRISM supports 300 DSL abbreviations. Use `prism_data` → `dsl_lookup` action to resolve.

## DO NOT
- Read MASTER_INDEX.json directly (945KB, will overflow)
- Glob/grep when a reference file has the answer
- Make multiple tool calls when one reference file read suffices
