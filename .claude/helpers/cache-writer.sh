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
# TSC --noEmit — mark successful type check timestamp
# ============================================================
if [[ "$cmd" == *"tsc --noEmit"* || "$cmd" == *"tsc -noEmit"* ]]; then
  touch "/tmp/prism-tsc-cache"
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

# ============================================================
# NPM INSTALL — invalidate npm list + build + tsc caches
# ============================================================
if [[ "$cmd" == *"npm install"* || "$cmd" == *"npm add"* || "$cmd" == *"npm ci"* || "$cmd" == *"npm update"* || "$cmd" == *"npm remove"* ]]; then
  rm -f "$CACHE_DIR/npm-list" "$BUILD_CACHE" "$TEST_CACHE" "/tmp/prism-tsc-cache" 2>/dev/null || true
fi

# ============================================================
# NPM LIST — cache output
# ============================================================
if [[ "$cmd" == "npm list"* || "$cmd" == "npm ls"* ]]; then
  # Save last npm list output (interceptor reads from this)
  cd /c/PRISM/mcp-server 2>/dev/null && npm list --depth=0 2>/dev/null > "$CACHE_DIR/npm-list" || true
fi

# ============================================================
# WC -L — cache line count by file
# ============================================================
if [[ "$cmd" == "wc -l "* ]]; then
  target_file=$(echo "$cmd" | sed 's/^wc -l //' | tr -d '"' | tr -d "'")
  if [[ -f "$target_file" ]]; then
    file_hash=$(echo -n "$target_file" | md5sum 2>/dev/null | cut -d' ' -f1 || echo "")
    if [[ -n "$file_hash" ]]; then
      wc -l "$target_file" 2>/dev/null > "$CACHE_DIR/wc-$file_hash" || true
    fi
  fi
fi

# ============================================================
# CAT package.json / tsconfig.json — cache content
# ============================================================
if [[ "$cmd" == "cat "* ]]; then
  target_file=$(echo "$cmd" | sed 's/^cat //' | tr -d '"' | tr -d "'")
  if [[ "$target_file" == *"package.json" || "$target_file" == *"tsconfig.json" ]]; then
    if [[ -f "$target_file" ]]; then
      file_hash=$(echo -n "$target_file" | md5sum 2>/dev/null | cut -d' ' -f1 || echo "")
      if [[ -n "$file_hash" ]]; then
        cat "$target_file" 2>/dev/null > "$CACHE_DIR/cat-$file_hash" || true
      fi
    fi
  fi
fi

exit 0
