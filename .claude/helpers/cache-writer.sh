#!/usr/bin/env bash
# PostToolUse hook: write cache files after successful command execution.
# Always exits 0 (never blocks).

set -euo pipefail

cmd="${1:-}"
success="${2:-false}"

# Only cache on success
[[ "$success" != "true" ]] && exit 0

CACHE_DIR="/tmp/prism-cache"
BUILD_CACHE="/tmp/prism-build-cache"
TEST_CACHE="/tmp/prism-test-cache"

mkdir -p "$CACHE_DIR" 2>/dev/null || true

# ============================================================
# BUILD — mark successful build timestamp
# ============================================================
if [[ "$cmd" == *"npm run build"* || "$cmd" == *"npm run build:fast"* ]]; then
  touch "$BUILD_CACHE"
  # Also cache build size
  if [[ -f "/c/PRISM/mcp-server/dist/index.js" ]]; then
    du -h "/c/PRISM/mcp-server/dist/index.js" 2>/dev/null | cut -f1 > "$CACHE_DIR/build-size"
  fi
fi

# ============================================================
# TESTS — mark successful test timestamp
# ============================================================
if [[ "$cmd" == *"vitest"* || "$cmd" == *"npm test"* || "$cmd" == *"npm run test"* ]]; then
  touch "$TEST_CACHE"
fi

# ============================================================
# GIT STATUS — cache output for 10s deduplication
# ============================================================
if [[ "$cmd" == "git status"* ]]; then
  cd /c/PRISM 2>/dev/null && git status --porcelain 2>/dev/null > "$CACHE_DIR/git-status" || true
fi

# ============================================================
# GIT LOG — cache output keyed by HEAD commit
# ============================================================
if [[ "$cmd" == "git log"* ]]; then
  head_sha=$(cd /c/PRISM && git rev-parse HEAD 2>/dev/null || echo "unknown")
  # Store HEAD as first line, log output after
  echo "$head_sha" > "$CACHE_DIR/git-log"
  cd /c/PRISM 2>/dev/null && git log --oneline -20 2>/dev/null >> "$CACHE_DIR/git-log" || true
fi

# ============================================================
# GIT DIFF — cache output for 10s deduplication
# ============================================================
if [[ "$cmd" == "git diff"* ]]; then
  cd /c/PRISM 2>/dev/null && git diff --stat 2>/dev/null > "$CACHE_DIR/git-diff" || true
fi

# ============================================================
# GIT COMMIT — invalidate git caches (state changed)
# ============================================================
if [[ "$cmd" == *"git commit"* || "$cmd" == *"git add"* ]]; then
  rm -f "$CACHE_DIR/git-status" "$CACHE_DIR/git-log" "$CACHE_DIR/git-diff" 2>/dev/null || true
fi

# ============================================================
# JSON VALIDATION — mark file as validated
# ============================================================
if [[ "$cmd" == *"JSON.parse"* && "$cmd" == *"settings.json"* ]]; then
  touch "$CACHE_DIR/json-valid"
fi

exit 0
