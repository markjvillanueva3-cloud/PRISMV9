#!/usr/bin/env bash
# Stop hook: check for uncommitted changes and block stopping.
# Outputs JSON with decision:"block" if uncommitted work exists.
# 3s timeout protection to never hang the stop flow.

set -euo pipefail

PRISM_DIR="/c/PRISM"

# Timeout protection — run git status with 3s limit
uncommitted=""
if cd "$PRISM_DIR" 2>/dev/null; then
  uncommitted=$(timeout 3 git status --porcelain 2>/dev/null || echo "")
fi

if [[ -z "$uncommitted" ]]; then
  # Clean working tree — allow stop
  echo "{}"
  exit 0
fi

# Count files
file_count=$(echo "$uncommitted" | wc -l | tr -d ' ')

# Build file list (truncated to first 5)
file_list=$(echo "$uncommitted" | head -5 | tr '\n' ', ' | sed 's/, $//')
if (( file_count > 5 )); then
  file_list="$file_list ... and $((file_count - 5)) more"
fi

msg="UNCOMMITTED WORK: $file_count files with changes: $file_list. Consider committing or stashing before stopping."
msg_escaped=$(echo "$msg" | sed 's/\\/\\\\/g; s/"/\\"/g' | tr '\n' ' ')

echo "{\"decision\": \"allow\", \"reason\": \"$msg_escaped\"}"
exit 0
