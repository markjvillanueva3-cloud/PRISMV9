#!/usr/bin/env bash
# SessionEnd hook: final cleanup when session truly ends.
# Handles: clear, logout, prompt_input_exit, other.
# Distinct from Stop (which fires when Claude stops generating).
# Always exits 0 (never blocks session end).

set -euo pipefail

PRISM_DIR="/c/PRISM"
CACHE_DIR="/tmp/prism-cache"
SESSION_LOG="$CACHE_DIR/session-log"

mkdir -p "$CACHE_DIR" 2>/dev/null || true

matcher="${HOOK_MATCHER:-other}"
timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Log session end event
echo "$timestamp SESSION_END matcher=$matcher" >> "$SESSION_LOG" 2>/dev/null || true

# For 'clear' — history is about to be wiped, ensure state is saved
if [[ "$matcher" == "clear" ]]; then
  # Run sync-memory as backup
  bash "$PRISM_DIR/.claude/helpers/sync-memory.sh" 2>/dev/null || true
  # Run compaction survival as backup
  bash "$PRISM_DIR/.claude/helpers/compaction-survival.sh" 2>/dev/null || true
  echo "$timestamp CLEAR: State saved to MEMORY.md + .compaction-survival.md" >> "$SESSION_LOG" 2>/dev/null || true
fi

# For all end types — count session stats
if [[ -f "$CACHE_DIR/tool-history" ]]; then
  tool_count=$(wc -l < "$CACHE_DIR/tool-history" 2>/dev/null || echo "0")
  echo "$timestamp STATS: $tool_count tool calls this session" >> "$SESSION_LOG" 2>/dev/null || true
fi

if [[ -f "$CACHE_DIR/error-log" ]]; then
  error_count=$(wc -l < "$CACHE_DIR/error-log" 2>/dev/null || echo "0")
  echo "$timestamp STATS: $error_count errors this session" >> "$SESSION_LOG" 2>/dev/null || true
fi

# Clean up session-specific temp files (not caches — those persist)
rm -f "$CACHE_DIR/tool-history" "$CACHE_DIR/files-read" 2>/dev/null || true

exit 0
