#!/usr/bin/env bash
# PostToolUse hook: write cache files after successful builds/tests.
# Always exits 0 (never blocks).

set -euo pipefail

cmd="${1:-}"
success="${2:-false}"

# Only cache on success
[[ "$success" != "true" ]] && exit 0

BUILD_CACHE="/tmp/prism-build-cache"
TEST_CACHE="/tmp/prism-test-cache"

# Cache successful builds
if [[ "$cmd" == *"npm run build"* ]]; then
  touch "$BUILD_CACHE"
fi

# Cache successful test runs
if [[ "$cmd" == *"vitest"* || "$cmd" == *"npm test"* || "$cmd" == *"npm run test"* ]]; then
  touch "$TEST_CACHE"
fi

exit 0
