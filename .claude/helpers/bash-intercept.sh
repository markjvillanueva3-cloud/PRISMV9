#!/usr/bin/env bash
# PreToolUse hook: skip builds/tests when results are cached.
# Exit 0 = allow, Exit 2 = block (cached result still valid).

set -euo pipefail

cmd="${1:-}"
[[ -z "$cmd" ]] && exit 0

SRC_DIR="/c/PRISM/mcp-server/src"
BUILD_CACHE="/tmp/prism-build-cache"
TEST_CACHE="/tmp/prism-test-cache"

# --- Build commands ---
if [[ "$cmd" == *"npm run build"* ]]; then
  if [[ -f "$BUILD_CACHE" ]]; then
    changed=$(find "$SRC_DIR" -name "*.ts" -newer "$BUILD_CACHE" -print -quit 2>/dev/null)
    if [[ -z "$changed" ]]; then
      echo "Build already passed — no source files changed since last successful build. To force rebuild, delete $BUILD_CACHE" >&2
      exit 2
    fi
  fi
  exit 0
fi

# --- Test commands ---
if [[ "$cmd" == *"vitest"* || "$cmd" == *"npm test"* || "$cmd" == *"npm run test"* ]]; then
  if [[ -f "$TEST_CACHE" ]]; then
    changed=$(find "$SRC_DIR" -name "*.ts" -newer "$TEST_CACHE" -print -quit 2>/dev/null)
    if [[ -z "$changed" ]]; then
      echo "Tests already passed — no source changes since last successful test run. To force retest, delete $TEST_CACHE" >&2
      exit 2
    fi
  fi
  exit 0
fi

# --- Everything else: passthrough ---
exit 0
