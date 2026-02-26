#!/usr/bin/env bash
# PreToolUse Task hook: rewrite Task prompt to prepend PRISM context.
# Uses updatedInput to modify the actual tool parameter.
# Always exits 0.

set -euo pipefail

POSITION_FILE="/c/PRISM/mcp-server/data/docs/roadmap/CURRENT_POSITION.md"

original_prompt="${TOOL_INPUT_prompt:-}"
[[ -z "$original_prompt" ]] && exit 0

# Read condensed position
position="unknown"
if [[ -f "$POSITION_FILE" ]]; then
  position=$(head -3 "$POSITION_FILE" 2>/dev/null | tr '\n' ' ' | cut -c1-100)
fi

# Build context prefix (under 200 chars)
prefix="PRISM CONTEXT: Project at C:\\\\PRISM\\\\mcp-server. Build: npm run build. Tests: npx vitest run. 32 dispatchers, 111 tests. Position: $position"
prefix="${prefix:0:200}"

# Escape for JSON
prefix_escaped=$(echo "$prefix" | sed 's/\\/\\\\/g; s/"/\\"/g; s/\t/\\t/g' | tr '\n' ' ')
prompt_escaped=$(echo "$original_prompt" | sed 's/\\/\\\\/g; s/"/\\"/g; s/\t/\\t/g')

echo "{\"updatedInput\": {\"prompt\": \"$prefix_escaped\\n\\n$prompt_escaped\"}}"
exit 0
