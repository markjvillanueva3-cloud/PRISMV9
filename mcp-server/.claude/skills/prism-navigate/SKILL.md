# /navigate — Zero-IO PRISM File Routing

## Trigger
User asks "where is X", "find the file for Y", "what engine handles Z", or any file/component location question.

## Protocol
1. **DO NOT glob or grep.** Use the reference files below to resolve the path instantly.
2. Read the minimum reference file needed:
   - For engines: `H:\PRISM\mcp-server\SYSTEM_ARCHITECTURE.json` → `.engines[]`
   - For dispatchers: `H:\PRISM\mcp-server\SYSTEM_ARCHITECTURE.json` → `.dispatchers{}`
   - For algorithms: `H:\PRISM\mcp-server\SYSTEM_ARCHITECTURE.json` → `.algorithms[]`
   - For registries: `H:\PRISM\mcp-server\SYSTEM_ARCHITECTURE.json` → `.registries[]`
   - For hooks: `H:\PRISM\mcp-server\SYSTEM_ARCHITECTURE.json` → `.hooks[]`
   - For MCP tools: `H:\PRISM\mcp-server\TOOL_REGISTRY.md`
   - For slash commands: `H:\PRISM\SLASH_COMMANDS.md`
   - For schemas: `H:\PRISM\mcp-server\schemas\SCHEMA_INDEX.json`
   - For paths: `H:\PRISM\PATH_CONFIG.json`
   - For counts/status: `H:\PRISM\mcp-server\data\quick-ref.json`
3. Return the exact file path. Format: `H:\PRISM\mcp-server\src\engines\{FileName}.ts`

## Path Templates
- Engine: `H:\PRISM\mcp-server\src\engines\{name}.ts`
- Dispatcher: `H:\PRISM\mcp-server\src\tools\dispatchers\{file}`
- Algorithm: `H:\PRISM\mcp-server\src\algorithms\{file}`
- Registry: `H:\PRISM\mcp-server\src\registries\{file}`
- Hook: `H:\PRISM\mcp-server\src\hooks\{file}`
- Test: `H:\PRISM\mcp-server\src\__tests__\{file}`
- Schema: `H:\PRISM\mcp-server\schemas\{file}`
- Skill: `H:\PRISM\mcp-server\.claude\skills\{name}\SKILL.md`
- Command: `H:\PRISM\mcp-server\.claude\commands\{name}.md`

## Zero-Tool-Call Routing (from memory)
If the component is in auto-memory (prism_dispatcher_map.md), resolve without ANY tool calls.
