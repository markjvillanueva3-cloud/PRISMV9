#!/usr/bin/env bash
# Notification idle_prompt hook: remind about current task when idle.
# Injects roadmap position + uncommitted file count.
# Always exits 0.

set -euo pipefail

PRISM_DIR="/c/PRISM"
POSITION_FILE="$PRISM_DIR/mcp-server/data/docs/roadmap/CURRENT_POSITION.md"
CACHE_DIR="/tmp/prism-cache"

# Read position
position="unknown"
if [[ -f "$POSITION_FILE" ]]; then
  position=$(head -3 "$POSITION_FILE" 2>/dev/null | tr '\n' ' ' | cut -c1-120)
fi

# Count uncommitted files
uncommitted=0
if cd "$PRISM_DIR" 2>/dev/null; then
  uncommitted=$(timeout 2 git status --porcelain 2>/dev/null | wc -l | tr -d ' ' || echo "0")
fi

# Get last tool from history
last_tool="unknown"
if [[ -f "$CACHE_DIR/tool-history" ]]; then
  last_tool=$(tail -1 "$CACHE_DIR/tool-history" 2>/dev/null | cut -d: -f1 || echo "unknown")
fi

msg="IDLE REMINDER: Position: $position. $uncommitted uncommitted files. Last action: $last_tool."
msg_escaped=$(echo "$msg" | sed 's/\\/\\\\/g; s/"/\\"/g' | tr '\n' ' ')

echo "{\"additionalContext\": \"$msg_escaped\"}"
exit 0
