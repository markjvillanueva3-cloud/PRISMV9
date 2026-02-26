#!/usr/bin/env bash
# PreToolUse WebFetch hook: hint when same URL was fetched recently.
# Never blocks — just injects a reminder via additionalContext.
# Always exits 0.

set -euo pipefail

CACHE_DIR="/tmp/prism-cache/web"
mkdir -p "$CACHE_DIR" 2>/dev/null || true

url="${TOOL_INPUT_url:-}"
[[ -z "$url" ]] && exit 0

# Hash URL to cache key
hash=$(echo -n "$url" | md5sum 2>/dev/null | cut -d' ' -f1 || echo "")
[[ -z "$hash" ]] && exit 0

cache_file="$CACHE_DIR/$hash"

if [[ -f "$cache_file" ]]; then
  now=$(date +%s)
  file_time=$(stat -c %Y "$cache_file" 2>/dev/null || stat -f %m "$cache_file" 2>/dev/null || echo 0)
  age=$(( now - file_time ))

  if (( age < 900 )); then  # 15 minutes
    echo "{\"additionalContext\": \"WEB CACHE: This URL was fetched ${age}s ago (within 15 min TTL). Content likely unchanged.\"}"
    exit 0
  fi
fi

# Mark this URL as fetched (will be updated by PostToolUse too)
touch "$cache_file"

echo "{}"
exit 0
