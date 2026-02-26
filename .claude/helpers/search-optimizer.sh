#!/usr/bin/env bash
# PreToolUse Glob|Grep hook: suggest search path optimizations.
# Never blocks searches — only adds additionalContext hints.
# Always exits 0.

set -euo pipefail

pattern="${TOOL_INPUT_pattern:-}"
path="${TOOL_INPUT_path:-}"

[[ -z "$pattern" ]] && exit 0

hint=""

# ============================================================
# BROAD SEARCH WARNING — searching from root or no path
# ============================================================
if [[ -z "$path" || "$path" == "/" || "$path" == "/c/PRISM" || "$path" == "C:\\PRISM" || "$path" == "." ]]; then
  hint="SEARCH HINT: PRISM source code is in mcp-server/src/. Tests in mcp-server/src/**/__tests__/. Helpers in .claude/helpers/. Consider narrowing the search path to avoid node_modules/dist noise."
fi

# ============================================================
# COMMON PATTERN → DIRECT PATH SUGGESTIONS
# ============================================================
case "$pattern" in
  *"dispatcher"*|*"Dispatcher"*)
    hint="SEARCH HINT: Dispatchers are in mcp-server/src/dispatchers/. 32 dispatchers total."
    ;;
  *"schema"*|*"Schema"*)
    hint="SEARCH HINT: Schemas are in mcp-server/src/schemas/. Key file: roadmapSchema.ts."
    ;;
  *"engine"*|*"Engine"*)
    hint="SEARCH HINT: Engines are in mcp-server/src/engines/. 75 engine files total."
    ;;
  *"registry"*|*"Registry"*)
    hint="SEARCH HINT: Registries are in mcp-server/src/registries/. 14 registries total."
    ;;
  *"hook"*|*"Hook"*)
    hint="SEARCH HINT: Hook scripts are in .claude/helpers/. Hook config in .claude/settings.json."
    ;;
  *"test"*|*"spec"*)
    hint="SEARCH HINT: Tests are in mcp-server/src/**/__tests__/. 111 tests total."
    ;;
  *"roadmap"*|*"Roadmap"*)
    hint="SEARCH HINT: Roadmap docs in mcp-server/data/docs/roadmap/. Active roadmap in plans/sleepy-chasing-prism.md."
    ;;
esac

if [[ -n "$hint" ]]; then
  hint_escaped=$(echo "$hint" | sed 's/\\/\\\\/g; s/"/\\"/g' | tr '\n' ' ')
  echo "{\"additionalContext\": \"$hint_escaped\"}"
else
  echo "{}"
fi

exit 0
