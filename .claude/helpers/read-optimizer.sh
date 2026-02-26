#!/usr/bin/env bash
# PreToolUse Read hook: warn about large files, suggest optimizations.
# Never blocks reads — only adds additionalContext hints.
# Always exits 0.

set -euo pipefail

file_path="${TOOL_INPUT_file_path:-}"
offset="${TOOL_INPUT_offset:-}"
limit="${TOOL_INPUT_limit:-}"

[[ -z "$file_path" ]] && exit 0

# Normalize path for checking
normalized=$(echo "$file_path" | sed 's|\\|/|g')

# ============================================================
# LARGE FILE WARNING
# ============================================================
if [[ -f "$normalized" && -z "$offset" && -z "$limit" ]]; then
  line_count=$(wc -l < "$normalized" 2>/dev/null || echo "0")
  if (( line_count > 2000 )); then
    hint="LARGE FILE: $file_path has $line_count lines. Consider using offset/limit parameters to read specific sections. First 100 lines: offset=0, limit=100."
    hint_escaped=$(echo "$hint" | sed 's/\\/\\\\/g; s/"/\\"/g' | tr '\n' ' ')
    echo "{\"additionalContext\": \"$hint_escaped\"}"
    exit 0
  fi
fi

# ============================================================
# KNOWN FILE REDIRECTS (moved/renamed files)
# ============================================================
# Example: old state files that moved
case "$normalized" in
  */state/CURRENT_STATE.json)
    echo "{\"additionalContext\": \"NOTE: CURRENT_STATE.json is a legacy file. Current state is in mcp-server/data/state/HEALTH_CHECK_REPORT.json.\"}"
    exit 0
    ;;
  */SESSION_MEMORY.json)
    echo "{\"additionalContext\": \"NOTE: SESSION_MEMORY.json is legacy. Session memory is now managed by MEMORY.md (auto-synced).\"}"
    exit 0
    ;;
esac

# ============================================================
# PASSTHROUGH
# ============================================================
echo "{}"
exit 0
