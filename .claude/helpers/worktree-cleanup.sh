#!/usr/bin/env bash
# WorktreeRemove hook: clean up worktree tracking.
# Always exits 0.

set -euo pipefail

WORKTREE_FILE="/tmp/prism-worktrees"
name="${TOOL_INPUT_name:-unnamed}"

# Remove matching entry
if [[ -f "$WORKTREE_FILE" ]]; then
  grep -v "$name" "$WORKTREE_FILE" > "${WORKTREE_FILE}.tmp" 2>/dev/null || true
  mv "${WORKTREE_FILE}.tmp" "$WORKTREE_FILE" 2>/dev/null || true
  # Clean up empty file
  [[ ! -s "$WORKTREE_FILE" ]] && rm -f "$WORKTREE_FILE" 2>/dev/null || true
fi

remaining=0
[[ -f "$WORKTREE_FILE" ]] && remaining=$(wc -l < "$WORKTREE_FILE" 2>/dev/null || echo "0")

echo "{\"additionalContext\": \"Worktree '$name' removed. $remaining active worktree(s) remaining.\"}"
exit 0
