#!/usr/bin/env bash
# compaction-survival.sh — Write critical state for compaction recovery
# Called by: Periodically during session (every N tool calls via cadence)
# Purpose: If context compaction happens, MEMORY.md + this file have everything needed

set -euo pipefail

SURVIVAL_FILE="/c/PRISM/.claude/helpers/.compaction-survival.md"
PRISM_ROOT="/c/PRISM"
MCP_DIR="$PRISM_ROOT/mcp-server"
POSITION_FILE="$MCP_DIR/data/docs/roadmap/CURRENT_POSITION.md"

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Current phase
PHASE="unknown"
if [ -f "$POSITION_FILE" ]; then
  PHASE=$(grep "^\*\*Phase:\*\*" "$POSITION_FILE" 2>/dev/null | head -1 | sed 's/\*\*Phase:\*\* //' || echo "unknown")
fi

# Recent commits (what was done this session)
RECENT=$(cd "$PRISM_ROOT" && git log --oneline -10 --since="8 hours ago" 2>/dev/null || echo "none")

# Build/test status
BUILD_OK="unknown"
if [ -f "$MCP_DIR/dist/index.js" ]; then
  BUILD_SIZE=$(du -h "$MCP_DIR/dist/index.js" 2>/dev/null | cut -f1 || echo "?")
  BUILD_OK="$BUILD_SIZE"
fi

cat > "$SURVIVAL_FILE" << EOF
# Compaction Survival — ${TIMESTAMP}
## DO NOT DELETE — Read this after context compaction

## Current Position
${PHASE}

## This Session's Work
\`\`\`
${RECENT}
\`\`\`

## Build Status
Last build size: ${BUILD_OK}

## Key Instruction
- Roadmap: C:\Users\Admin.DIGITALSTORM-PC\.claude\plans\sleepy-chasing-prism.md
- YOLO mode: autonomous, auto-commit
- Omega target: 1.0
- Read MEMORY.md for full context
EOF

echo "OK: compaction survival written"
