#!/usr/bin/env bash
# TaskCompleted hook: verify build+test pass before task completion.
# Outputs JSON with decision:"block" if caches are stale.
# Exit 0 with empty JSON = allow. Exit 0 with decision:block = block.

set -euo pipefail

BUILD_CACHE="/tmp/prism-build-cache"
TEST_CACHE="/tmp/prism-test-cache"
SRC_DIR="/c/PRISM/mcp-server/src"

build_ok=false
test_ok=false

# Check build cache — fresh if no .ts files newer than cache
if [[ -f "$BUILD_CACHE" ]]; then
  changed=$(find "$SRC_DIR" -name "*.ts" -newer "$BUILD_CACHE" -print -quit 2>/dev/null || echo "")
  [[ -z "$changed" ]] && build_ok=true
fi

# Check test cache — fresh if no source files newer than cache
if [[ -f "$TEST_CACHE" ]]; then
  changed=$(find "$SRC_DIR" -name "*.ts" -newer "$TEST_CACHE" -print -quit 2>/dev/null || echo "")
  [[ -z "$changed" ]] && test_ok=true
fi

if $build_ok && $test_ok; then
  echo "{}"
  exit 0
fi

# Build the block message
msg="TASK GATE: "
if ! $build_ok; then
  msg+="Build not verified (run: npm run build in mcp-server/). "
fi
if ! $test_ok; then
  msg+="Tests not verified (run: npx vitest run in mcp-server/). "
fi
msg+="Both must pass before task completion."

msg_escaped=$(echo "$msg" | sed 's/\\/\\\\/g; s/"/\\"/g' | tr '\n' ' ')
echo "{\"decision\": \"block\", \"additionalContext\": \"$msg_escaped\"}"
exit 0
