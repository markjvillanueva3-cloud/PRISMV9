#!/usr/bin/env bash
# WorktreeCreate hook: track active worktrees for parallel execution.
# Outputs JSON with additionalContext showing active worktree count.
# Always exits 0.

set -euo pipefail

WORKTREE_FILE="/tmp/prism-worktrees"
timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
name="${TOOL_INPUT_name:-unnamed}"

# Append new worktree entry
echo "$timestamp $name" >> "$WORKTREE_FILE" 2>/dev/null || true

# Count active worktrees
count=$(wc -l < "$WORKTREE_FILE" 2>/dev/null || echo "1")

echo "{\"additionalContext\": \"Worktree '$name' created. $count active worktree(s) tracked.\"}"
exit 0
