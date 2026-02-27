#!/usr/bin/env bash
# completion-gate.sh — PreToolUse hook for Bash
# Blocks git commit unless verification has been run on modified files.
# Tracks what was created/modified and checks:
#   1. New .ts files compile (present in dist/)
#   2. New .sh hooks produce valid JSON output
#   3. New exported functions are actually imported somewhere
#   4. Build passes (dist/index.js is fresh)
# Always exits 0 but outputs block decision when verification fails.

set -euo pipefail

TOOL_INPUT="${TOOL_INPUT_command:-}"
TRACK_FILE="/tmp/prism-completion-gate-files"
VERIFY_FLAG="/tmp/prism-verified"
REPO_ROOT="/c/PRISM"
MCP_ROOT="/c/PRISM/mcp-server"
HELPERS="/c/PRISM/.claude/helpers"

# ── Only intercept git commit commands ──────────────────────────
if ! echo "$TOOL_INPUT" | grep -qE '^\s*git\s+commit|^\s*cd.*&&\s*git\s+commit'; then
  # Not a commit — pass through
  echo "{}"
  exit 0
fi

# ── Check if verification was already done this session ─────────
if [[ -f "$VERIFY_FLAG" ]]; then
  flag_age=$(( $(date +%s) - $(stat -c %Y "$VERIFY_FLAG" 2>/dev/null || echo 0) ))
  # Valid for 10 minutes
  if (( flag_age < 600 )); then
    echo "{}"
    exit 0
  fi
fi

# ── Collect modified files from git (use repo root for correct paths) ──
cd "$REPO_ROOT" 2>/dev/null || { echo "{}"; exit 0; }

modified_ts=$(git diff --name-only --cached --diff-filter=AM 2>/dev/null | grep '\.ts$' || true)
modified_sh=$(git diff --name-only --cached --diff-filter=AM 2>/dev/null | grep '\.sh$' || true)

if [[ -z "$modified_ts" && -z "$modified_sh" ]]; then
  # No tracked code files staged — allow commit (docs, json, etc.)
  echo "{}"
  exit 0
fi

# ── Verification checks ─────────────────────────────────────────
failures=()

# Check 1: dist/index.js is newer than any modified source file
if [[ -f "$MCP_ROOT/dist/index.js" ]]; then
  dist_time=$(stat -c %Y "$MCP_ROOT/dist/index.js" 2>/dev/null || echo 0)
  for f in $modified_ts; do
    if [[ -f "$REPO_ROOT/$f" ]]; then
      src_time=$(stat -c %Y "$REPO_ROOT/$f" 2>/dev/null || echo 0)
      if (( src_time > dist_time )); then
        failures+=("BUILD_STALE: $f is newer than dist/index.js — run 'npm run build' first")
        break
      fi
    fi
  done
else
  failures+=("NO_BUILD: dist/index.js missing — run 'npm run build' first")
fi

# Check 2: New .sh hooks produce valid JSON
for f in $modified_sh; do
  full_path="$REPO_ROOT/$f"
  [[ -f "$full_path" ]] || continue

  # Only test hooks that should output JSON (helpers dir)
  if echo "$full_path" | grep -q "helpers"; then
    test_output=$(timeout 3 bash "$full_path" "test prompt" 2>/dev/null </dev/null || true)
    if [[ -n "$test_output" ]]; then
      if ! python3 -c "import json; json.loads('''$test_output''')" 2>/dev/null; then
        failures+=("HOOK_BAD_JSON: $f outputs invalid JSON: ${test_output:0:80}")
      fi
    fi
  fi
done

# Check 3: New exported functions in .ts files are imported somewhere
for f in $modified_ts; do
  [[ -f "$REPO_ROOT/$f" ]] || continue
  # Find new exports in this file
  new_exports=$(grep -oP 'export\s+(?:async\s+)?function\s+\K\w+' "$REPO_ROOT/$f" 2>/dev/null || true)
  for exp in $new_exports; do
    # Skip if it's a type/interface export
    grep -qP "export\s+(?:type|interface)\s+$exp" "$REPO_ROOT/$f" 2>/dev/null && continue
    # Check if imported anywhere else
    other_imports=$(grep -rl "$exp" "$MCP_ROOT/src/" 2>/dev/null | grep -v "$f" | head -1 || true)
    if [[ -z "$other_imports" ]]; then
      # Check if it's a deprecated alias or internal-only
      if ! grep -qP "(deprecated|internal|private)" "$REPO_ROOT/$f" 2>/dev/null; then
        failures+=("UNWIRED: $exp exported from $f but not imported anywhere")
      fi
    fi
  done
done

# ── Decision ─────────────────────────────────────────────────────
if [ ${#failures[@]} -eq 0 ]; then
  # All checks pass — set verified flag and allow
  date +%s > "$VERIFY_FLAG"
  echo "{}"
else
  # Build failure message
  msg="COMPLETION GATE BLOCKED: ${#failures[@]} issue(s) found before commit:\\n"
  for fail in "${failures[@]}"; do
    msg+="  - ${fail}\\n"
  done
  msg+="Fix these issues, then retry the commit."

  # Escape for JSON
  msg_escaped=$(echo -e "$msg" | sed 's/\\/\\\\/g; s/"/\\"/g' | tr '\n' ' ')
  echo "{\"decision\": \"block\", \"reason\": \"${msg_escaped}\"}"
fi

exit 0
