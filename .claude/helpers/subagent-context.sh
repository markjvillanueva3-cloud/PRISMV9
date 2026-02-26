#!/usr/bin/env bash
# SubagentStart hook: inject condensed PRISM context into subagents.
# Outputs JSON with additionalContext so spawned agents know the project.
# Always exits 0 (never blocks agent spawning).

set -euo pipefail

PRISM_DIR="/c/PRISM"
MCP_DIR="$PRISM_DIR/mcp-server"
POSITION_FILE="$MCP_DIR/data/docs/roadmap/CURRENT_POSITION.md"

agent_type="${TOOL_INPUT_subagent_type:-unknown}"

# Read condensed position (first 3 lines)
position="unknown"
if [[ -f "$POSITION_FILE" ]]; then
  position=$(head -3 "$POSITION_FILE" 2>/dev/null | tr '\n' ' ' | cut -c1-120)
fi

# Build compact context (under 500 chars to minimize token cost)
context="PRISM CONTEXT (auto-injected for $agent_type agent): Project: PRISM MCP Server at C:\\\\PRISM\\\\mcp-server. Build: npm run build (in mcp-server/). Tests: npx vitest run (in mcp-server/). 32 dispatchers, 541 actions, 111 tests. Position: $position"

# Trim to 500 chars max
context="${context:0:500}"

# Escape for JSON
context_escaped=$(echo "$context" | sed 's/\\/\\\\/g; s/"/\\"/g; s/\t/\\t/g' | tr '\n' ' ')

echo "{\"additionalContext\": \"$context_escaped\"}"
exit 0
