#!/usr/bin/env bash
# session-breadcrumb.sh — Write breadcrumb after significant actions (git commits)
# Called by: PostToolUse hook (after Bash commands that include "git commit")
# Purpose: Captures session progress so sync-memory.sh has fresh data

set -euo pipefail

BREADCRUMB_FILE="/c/PRISM/.claude/helpers/.session-breadcrumb.json"
PRISM_ROOT="/c/PRISM"

# Get latest commit info
LAST_HASH=$(cd "$PRISM_ROOT" && git log -1 --format="%h" 2>/dev/null || echo "unknown")
LAST_MSG=$(cd "$PRISM_ROOT" && git log -1 --format="%s" 2>/dev/null || echo "unknown")
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Write breadcrumb
cat > "$BREADCRUMB_FILE" << EOF
{"timestamp":"${TIMESTAMP}","commit":"${LAST_HASH}","note":"${LAST_MSG}"}
EOF

echo "OK: breadcrumb written"
