#!/usr/bin/env bash
# PostToolUse Read hook (async): track which files were read this session.
# Used by session-summary.sh for richer summaries.
# Always exits 0. Runs as async:true — never blocks Read operations.

set -euo pipefail

CACHE_DIR="/tmp/prism-cache"
TRACKER_FILE="$CACHE_DIR/files-read"
mkdir -p "$CACHE_DIR" 2>/dev/null || true

file_path="${TOOL_INPUT_file_path:-}"
[[ -z "$file_path" ]] && exit 0

# Deduplicated append
if [[ -f "$TRACKER_FILE" ]]; then
  grep -qF "$file_path" "$TRACKER_FILE" 2>/dev/null || echo "$file_path" >> "$TRACKER_FILE"
else
  echo "$file_path" > "$TRACKER_FILE"
fi

exit 0
