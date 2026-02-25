#!/usr/bin/env bash
# PostToolUseFailure hook: inject recovery hints on tool failures.
# Logs error patterns and provides actionable suggestions.
# Always exits 0 (never blocks — informational only).

set -euo pipefail

CACHE_DIR="/tmp/prism-cache"
ERROR_LOG="$CACHE_DIR/error-log"
mkdir -p "$CACHE_DIR" 2>/dev/null || true

tool_name="${TOOL_NAME:-unknown}"
tool_input="${TOOL_INPUT_command:-${TOOL_INPUT_file_path:-${TOOL_INPUT_pattern:-}}}"

# Log the error
echo "$(date +%s) $tool_name $tool_input" >> "$ERROR_LOG" 2>/dev/null || true

hint=""

# ============================================================
# BUILD FAILURES
# ============================================================
if [[ "$tool_name" == "Bash" && "$tool_input" == *"npm run build"* ]]; then
  hint="BUILD FAILED: Try 'npx tsc --noEmit' to see TypeScript errors. Check for import/export mismatches. Last successful build log in /tmp/prism-cache/build-size."
fi

# ============================================================
# TEST FAILURES
# ============================================================
if [[ "$tool_name" == "Bash" && ("$tool_input" == *"vitest"* || "$tool_input" == *"npm test"*) ]]; then
  hint="TESTS FAILED: Run specific test with 'npx vitest run {file}' to isolate. Check test output for assertion details. Previous test count: 111."
fi

# ============================================================
# FILE NOT FOUND (Read/Write/Edit)
# ============================================================
if [[ "$tool_name" == "Read" || "$tool_name" == "Write" || "$tool_name" == "Edit" ]]; then
  if [[ -n "$tool_input" ]]; then
    basename_file=$(basename "$tool_input" 2>/dev/null || echo "")
    if [[ -n "$basename_file" ]]; then
      hint="FILE ERROR on '$basename_file': Search with Glob tool: '**/$basename_file'. PRISM source is in mcp-server/src/. Config in .claude/."
    fi
  fi
fi

# ============================================================
# SEARCH FAILURES (Glob/Grep)
# ============================================================
if [[ "$tool_name" == "Glob" || "$tool_name" == "Grep" ]]; then
  hint="SEARCH FAILED: Try broadening the pattern. PRISM source is in C:\\PRISM\\mcp-server\\src\\. Check if path exists. For content search use Grep; for file names use Glob."
fi

# ============================================================
# GIT FAILURES
# ============================================================
if [[ "$tool_name" == "Bash" && "$tool_input" == *"git "* ]]; then
  hint="GIT ERROR: Check 'git status' for current state. If merge conflict, resolve with 'git checkout --theirs' or '--ours'. If detached HEAD, run 'git checkout main'."
fi

# ============================================================
# JSON PARSE FAILURES
# ============================================================
if [[ "$tool_name" == "Bash" && "$tool_input" == *"JSON.parse"* ]]; then
  hint="JSON PARSE ERROR: Validate with 'node -e \"JSON.parse(require(\\\"fs\\\").readFileSync(\\\"file\\\",\\\"utf8\\\"))\"'. Check for trailing commas, missing quotes, or BOM characters."
fi

# ============================================================
# PERMISSION DENIED
# ============================================================
if [[ "$tool_name" == "Bash" && "$tool_input" == *"permission denied"* ]]; then
  hint="PERMISSION DENIED: Check file-protect.sh blocklist. Protected files: BASELINE_INVENTORY.json, HEALTH_CHECK_REPORT.json. Use 'chmod +x' for scripts."
fi

# Output JSON if we have a hint
if [[ -n "$hint" ]]; then
  hint_escaped=$(echo "$hint" | sed 's/\\/\\\\/g; s/"/\\"/g; s/\t/\\t/g' | tr '\n' ' ')
  echo "{\"additionalContext\": \"RECOVERY HINT: $hint_escaped\"}"
else
  echo "{}"
fi

exit 0
