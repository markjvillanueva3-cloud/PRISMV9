#!/usr/bin/env bash
# file-protect.sh — PreToolUse hook guard that blocks edits to frozen files
# Exit 0 = allow, Exit 2 = block
# Usage: file-protect.sh <file_path>

FILE_PATH="$1"

# No path provided — allow
[[ -z "$FILE_PATH" ]] && exit 0

BASENAME=$(basename "$FILE_PATH")

# Protected file list (frozen for anti-regression)
case "$BASENAME" in
  BASELINE_INVENTORY.json|HEALTH_CHECK_REPORT.json)
    echo "BLOCKED: Protected file '$FILE_PATH' is frozen for anti-regression. To modify, use the 'override' keyword in your prompt." >&2
    exit 2
    ;;
esac

exit 0
