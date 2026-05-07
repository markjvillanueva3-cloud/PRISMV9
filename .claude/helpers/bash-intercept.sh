#!/usr/bin/env bash
# PreToolUse hook: skip redundant bash commands when cached results are valid.
# Exit 0 = allow, Exit 2 = block (cached result returned via stderr).

set -euo pipefail

cmd="${1:-}"
[[ -z "$cmd" ]] && exit 0

# Strip rtk/rtk.exe prefix for pattern matching (RTK TOKEN-OPT integration)
cmd_clean="$cmd"
cmd_clean="${cmd_clean#rtk }"
cmd_clean="${cmd_clean#rtk.exe }"

SRC_DIR="/h/prism/mcp-server/src"
DIST_FILE="/h/prism/mcp-server/dist/index.js"
CACHE_DIR="/tmp/prism-cache"
BUILD_CACHE="/tmp/prism-build-cache"
TEST_CACHE="/tmp/prism-test-cache"
GIT_STATUS_CACHE="$CACHE_DIR/git-status"
GIT_LOG_CACHE="$CACHE_DIR/git-log"
GIT_DIFF_CACHE="$CACHE_DIR/git-diff"
BUILD_SIZE_CACHE="$CACHE_DIR/build-size"
JSON_VALID_CACHE="$CACHE_DIR/json-valid"

mkdir -p "$CACHE_DIR" 2>/dev/null || true

# ============================================================
# GIT SAFETY — block dangerous operations (P4 enhancement)
# ============================================================
if [[ "$cmd" == *"git push"*"--force"* || "$cmd" == *"git push"*"-f "* || "$cmd" == *"git push -f" ]]; then
  echo "BLOCKED: Force push is disabled. Use 'git push' without --force. Force push can destroy remote history." >&2
  exit 2
fi

if [[ "$cmd" == *"git reset --hard"* ]]; then
  echo "BLOCKED: Hard reset destroys uncommitted work. Use 'git stash' to save changes, or 'git reset --soft' to keep them staged." >&2
  exit 2
fi

if [[ "$cmd" == "git checkout ." || "$cmd" == "git checkout -- ." ]]; then
  echo "BLOCKED: 'git checkout .' discards ALL unstaged changes. Use 'git stash' to save them first." >&2
  exit 2
fi

if [[ "$cmd" == "git restore ." || "$cmd" == "git restore -- ." ]]; then
  echo "BLOCKED: 'git restore .' discards ALL unstaged changes. Use 'git stash' to save them first." >&2
  exit 2
fi

if [[ "$cmd" == *"git clean -f"* && "$cmd" != *"git clean -n"* ]]; then
  echo "BLOCKED: 'git clean -f' permanently deletes untracked files. Review first with 'git clean -n' (dry run)." >&2
  exit 2
fi

# Helper: check if cache file is younger than N seconds
cache_fresh() {
  local file="$1" max_age="$2"
  [[ -f "$file" ]] || return 1
  local now age file_time
  now=$(date +%s)
  file_time=$(stat -c %Y "$file" 2>/dev/null || stat -f %m "$file" 2>/dev/null || echo 0)
  age=$(( now - file_time ))
  (( age < max_age ))
}

# ============================================================
# BUILD COMMANDS — cache until source files change
# ============================================================
if [[ "$cmd_clean" == *"npm run build"* || "$cmd_clean" == *"npm run build:fast"* ]]; then
  if [[ -f "$BUILD_CACHE" ]]; then
    changed=$(find "$SRC_DIR" -name "*.ts" -newer "$BUILD_CACHE" -print -quit 2>/dev/null)
    if [[ -z "$changed" ]]; then
      echo "Build already passed — no .ts files changed since last successful build. To force: rm $BUILD_CACHE" >&2
      exit 2
    fi
  fi
  exit 0
fi

# ============================================================
# TEST COMMANDS — cache until source files change
# RTK rewrite: when cache stale, run through rtk for 99% compression
# ============================================================
if [[ "$cmd_clean" == *"vitest"* || "$cmd_clean" == *"npm test"* || "$cmd_clean" == *"npm run test"* ]]; then
  legitimacy_output=$(TOOL_INPUT_command="$cmd" node /h/prism/.claude/helpers/test-run-gate.mjs 2>/dev/null || true)
  if [[ -n "$legitimacy_output" && "$legitimacy_output" != "{}" ]]; then
    echo "$legitimacy_output"
    exit 0
  fi
  if [[ -f "$TEST_CACHE" ]]; then
    changed=$(find "$SRC_DIR" -name "*.ts" -newer "$TEST_CACHE" -print -quit 2>/dev/null)
    if [[ -z "$changed" ]]; then
      echo "Tests already passed — no source changes since last run. To force: rm $TEST_CACHE" >&2
      exit 2
    fi
  fi
  # Cache stale — auto-rewrite through RTK if available and not already prefixed
  if command -v rtk &>/dev/null && [[ "$cmd" != rtk* ]]; then
    echo '{"additionalContext":"TOKEN-OPT: Use rtk prefix for this test command (99% output compression). Example: rtk vitest run"}'
    exit 0
  fi
  exit 0
fi

# ============================================================
# TSC --noEmit — cache until source files change (like build)
# ============================================================
if [[ "$cmd_clean" == *"tsc --noEmit"* || "$cmd_clean" == *"tsc -noEmit"* || "$cmd_clean" == *"npx tsc --noEmit"* ]]; then
  TSC_CACHE="/tmp/prism-tsc-cache"
  if [[ -f "$TSC_CACHE" ]]; then
    changed=$(find "$SRC_DIR" -name "*.ts" -newer "$TSC_CACHE" -print -quit 2>/dev/null)
    if [[ -z "$changed" ]]; then
      echo "tsc --noEmit already passed — no .ts files changed since last check. To force: rm $TSC_CACHE" >&2
      exit 2
    fi
  fi
  exit 0
fi

# ============================================================
# GIT STATUS — cache for 10 seconds (rapid re-checks)
# ============================================================
if [[ "$cmd_clean" == "git status"* ]]; then
  if cache_fresh "$GIT_STATUS_CACHE" 10; then
    cached=$(cat "$GIT_STATUS_CACHE")
    echo "git status (cached 10s): $cached" >&2
    exit 2
  fi
  exit 0
fi

# ============================================================
# GIT LOG — cache until next commit; rewrite to --oneline -20
# ============================================================
if [[ "$cmd_clean" == "git log"* ]]; then
  if [[ -f "$GIT_LOG_CACHE" ]]; then
    cached_head=$(head -1 "$GIT_LOG_CACHE" 2>/dev/null)
    current_head=$(cd /h/prism && git rev-parse HEAD 2>/dev/null || echo "unknown")
    if [[ "$cached_head" == "$current_head" ]]; then
      tail -n +2 "$GIT_LOG_CACHE" >&2
      echo "(cached — HEAD unchanged since last git log)" >&2
      exit 2
    fi
  fi
  # TOKEN-OPT: rewrite bare git log to compact format
  if [[ "$cmd_clean" == "git log" ]]; then
    echo '{"additionalContext":"TOKEN-OPT: Use git log --oneline -15 for compact output (95% smaller)."}'
    exit 0
  fi
  exit 0
fi

# ============================================================
# GIT DIFF — cache for 10s; advise --stat for overview
# ============================================================
if [[ "$cmd_clean" == "git diff"* ]]; then
  if cache_fresh "$GIT_DIFF_CACHE" 10; then
    echo "(git diff cached 10s — no changes since last check)" >&2
    cat "$GIT_DIFF_CACHE" >&2
    exit 2
  fi
  # TOKEN-OPT: advise --stat for overview, full diff for specific files
  if [[ "$cmd_clean" == "git diff" ]]; then
    echo '{"additionalContext":"TOKEN-OPT: Use git diff --stat for overview (80% smaller), then git diff -- <file> for specific changes."}'
    exit 0
  fi
  exit 0
fi

# ============================================================
# BUILD SIZE CHECK (du -h dist/index.js) — same lifetime as build cache
# ============================================================
if [[ "$cmd" == *"du -h"*"dist/index.js"* || "$cmd" == *"du -h"*"dist/"* ]]; then
  if [[ -f "$BUILD_SIZE_CACHE" ]] && [[ -f "$BUILD_CACHE" ]]; then
    cached_size=$(cat "$BUILD_SIZE_CACHE")
    echo "Build size (cached): $cached_size" >&2
    exit 2
  fi
  exit 0
fi

# ============================================================
# JSON VALIDATION — cache per file until file changes
# ============================================================
if [[ "$cmd" == *"JSON.parse"* && "$cmd" == *"settings.json"* ]]; then
  settings_file="/h/prism/.claude/settings.json"
  if [[ -f "$JSON_VALID_CACHE" ]] && [[ -f "$settings_file" ]]; then
    if [[ "$JSON_VALID_CACHE" -nt "$settings_file" ]]; then
      echo "settings.json already validated — no changes since last check" >&2
      exit 2
    fi
  fi
  exit 0
fi

# ============================================================
# NPM LIST — cache for 1 hour (until npm install)
# ============================================================
if [[ "$cmd_clean" == "npm list"* || "$cmd_clean" == "npm ls"* ]]; then
  NPM_LIST_CACHE="$CACHE_DIR/npm-list"
  if cache_fresh "$NPM_LIST_CACHE" 3600; then
    echo "npm list (cached 1hr):" >&2
    cat "$NPM_LIST_CACHE" >&2
    exit 2
  fi
  exit 0
fi

# ============================================================
# WC -L — cache by file path + mtime
# ============================================================
if [[ "$cmd_clean" == "wc -l "* ]]; then
  target_file=$(echo "$cmd" | sed 's/^wc -l //' | tr -d '"' | tr -d "'")
  if [[ -f "$target_file" ]]; then
    file_hash=$(echo -n "$target_file" | md5sum 2>/dev/null | cut -d' ' -f1 || echo "")
    wc_cache="$CACHE_DIR/wc-$file_hash"
    if [[ -f "$wc_cache" ]] && [[ "$wc_cache" -nt "$target_file" ]]; then
      cached_count=$(cat "$wc_cache")
      echo "wc -l (cached): $cached_count" >&2
      exit 2
    fi
  fi
  exit 0
fi

# ============================================================
# CAT package.json / tsconfig.json — cache until file changes
# ============================================================
if [[ "$cmd_clean" == "cat "* ]]; then
  target_file=$(echo "$cmd" | sed 's/^cat //' | tr -d '"' | tr -d "'")
  if [[ "$target_file" == *"package.json" || "$target_file" == *"tsconfig.json" ]]; then
    if [[ -f "$target_file" ]]; then
      file_hash=$(echo -n "$target_file" | md5sum 2>/dev/null | cut -d' ' -f1 || echo "")
      cat_cache="$CACHE_DIR/cat-$file_hash"
      if [[ -f "$cat_cache" ]] && [[ "$cat_cache" -nt "$target_file" ]]; then
        echo "cat (cached — file unchanged):" >&2
        cat "$cat_cache" >&2
        exit 2
      fi
    fi
  fi
  exit 0
fi

# ============================================================
# NPM INSTALL — advise RTK wrapping for output compression
# ============================================================
if [[ "$cmd_clean" == "npm install"* || "$cmd_clean" == "npm ci"* || "$cmd_clean" == "pnpm install"* ]]; then
  if command -v rtk &>/dev/null && [[ "$cmd" != rtk* ]]; then
    echo '{"additionalContext":"TOKEN-OPT: Use rtk prefix for install commands (70-90% output compression). Example: rtk npm install"}'
    exit 0
  fi
  exit 0
fi

# ============================================================
# REFERENCE-FIRST: advise on grep/find/rg/fd in mcp-server/src
# ============================================================
if [[ "$cmd" == *"grep "* || "$cmd" == *"rg "* || "$cmd" == *"find "* || "$cmd" == *"fd "* || "$cmd" == *"ag "* ]]; then
  if [[ "$cmd" == *"mcp-server"* || "$cmd" == *"/h/prism"* || "$cmd" == *"H:/prism"* || "$cmd" == *"src/engines"* || "$cmd" == *"src/tools"* ]]; then
    echo '{"additionalContext":"REFERENCE-FIRST: Before using bash grep/find on the codebase, check digest files. ENGINE_DIGEST.md (mcp-server/data/docs/) has all 1,304 engines. DISPATCHER_DIGEST.md has all 79 dispatchers. Use Read on these instead of shell search."}'
    exit 0
  fi
fi

# ============================================================
# EVERYTHING ELSE: passthrough
# ============================================================
exit 0
