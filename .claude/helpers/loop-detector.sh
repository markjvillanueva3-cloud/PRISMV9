#!/usr/bin/env bash
# PostToolUse hook (any tool): detect repeated identical tool calls.
# Tracks last 20 calls. Warns on 3+ consecutive identical calls.
# Always exits 0. Runs as async:true.

set -euo pipefail

CACHE_DIR="/tmp/prism-cache"
HISTORY_FILE="$CACHE_DIR/tool-history"
mkdir -p "$CACHE_DIR" 2>/dev/null || true

tool_name="${TOOL_NAME:-unknown}"

# Create a fingerprint from tool name + key inputs
input_sig="${TOOL_INPUT_command:-}${TOOL_INPUT_file_path:-}${TOOL_INPUT_pattern:-}${TOOL_INPUT_prompt:-}"
if [[ -n "$input_sig" ]]; then
  fingerprint=$(echo "${tool_name}:${input_sig}" | md5sum 2>/dev/null | cut -d' ' -f1 || echo "${tool_name}:${input_sig:0:50}")
else
  fingerprint="${tool_name}:no-input"
fi

# Append to history (keep last 20)
echo "$fingerprint" >> "$HISTORY_FILE" 2>/dev/null || true
tail -20 "$HISTORY_FILE" > "${HISTORY_FILE}.tmp" 2>/dev/null && mv "${HISTORY_FILE}.tmp" "$HISTORY_FILE" 2>/dev/null || true

# Count consecutive identical entries from the end
count=0
if [[ -f "$HISTORY_FILE" ]]; then
  while IFS= read -r line; do
    if [[ "$line" == "$fingerprint" ]]; then
      count=$((count + 1))
    else
      count=0
    fi
  done < "$HISTORY_FILE"
fi

# Warn on 3+ consecutive identical calls
if (( count >= 3 )); then
  echo "{\"additionalContext\": \"LOOP WARNING: You have called '$tool_name' with identical inputs $count times consecutively. This may indicate a loop. Consider a different approach or verify the previous calls succeeded.\"}"
else
  echo "{}"
fi

exit 0
