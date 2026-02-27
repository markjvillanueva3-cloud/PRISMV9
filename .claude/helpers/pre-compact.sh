#!/usr/bin/env bash
# PreCompact hook: save critical state before context compaction.
# Outputs JSON with additionalContext to inject survival info.
# Always exits 0 (never blocks compaction).

set -euo pipefail

PRISM_DIR="/c/PRISM"
MCP_DIR="$PRISM_DIR/mcp-server"
HELPERS_DIR="$PRISM_DIR/.claude/helpers"
SURVIVAL_FILE="$HELPERS_DIR/.compaction-survival.md"
# Dynamic MEMORY.md resolution — check multiple project paths
MEMORY_FILE=""
for candidate in \
  "$HOME/.claude/projects/C--Users-Admin-DIGITALSTORM-PC/memory/MEMORY.md" \
  "$HOME/.claude/projects/C--PRISM/memory/MEMORY.md" \
  "$HOME/.claude/projects/C--PRISM--mcp-server/memory/MEMORY.md"; do
  if [[ -f "$candidate" ]]; then MEMORY_FILE="$candidate"; break; fi
done
if [[ -z "$MEMORY_FILE" ]]; then
  MEMORY_FILE=$(find "$HOME/.claude/projects" -name "MEMORY.md" -path "*/memory/*" 2>/dev/null | head -1)
fi
POSITION_FILE="$MCP_DIR/data/docs/roadmap/CURRENT_POSITION.md"

# Gather state
position="unknown"
if [[ -f "$POSITION_FILE" ]]; then
  position=$(head -5 "$POSITION_FILE" 2>/dev/null | tr '\n' ' ' | cut -c1-200)
fi

recent_commits=""
if cd "$PRISM_DIR" 2>/dev/null; then
  recent_commits=$(git log --oneline -5 2>/dev/null || echo "no git")
fi

uncommitted=$(cd "$PRISM_DIR" 2>/dev/null && git status --porcelain 2>/dev/null | wc -l | tr -d ' ' || echo "0")

session_summary=""
if [[ -f "$HELPERS_DIR/.session-summary.md" ]]; then
  session_summary=$(cat "$HELPERS_DIR/.session-summary.md" 2>/dev/null | head -10 | tr '\n' ' ' | cut -c1-300)
fi

# Write survival file (consumed by SessionStart compact matcher)
cat > "$SURVIVAL_FILE" << SURVIVAL
# Compaction Survival State
## Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")

## Position
$position

## Recent Commits
$recent_commits

## Uncommitted Files: $uncommitted

## Session Summary
$session_summary

## Key Reminders
- Project: PRISM MCP Server at C:\\PRISM\\mcp-server
- Build: npm run build | Tests: npx vitest run
- 32 dispatchers, 541 actions, 111 tests
- Roadmap: sleepy-chasing-prism.md (ONLY source of truth)
- Memory: MEMORY.md (auto-synced)
SURVIVAL

# Output JSON with additionalContext for Claude
context="COMPACTION IMMINENT — State preserved in .compaction-survival.md. Position: $(echo "$position" | cut -c1-80). $uncommitted uncommitted files. After compaction, read .claude/helpers/.compaction-survival.md to restore context."

# Escape JSON
context_escaped=$(echo "$context" | sed 's/\\/\\\\/g; s/"/\\"/g; s/\t/\\t/g' | tr '\n' ' ')

echo "{\"additionalContext\": \"$context_escaped\"}"
exit 0
