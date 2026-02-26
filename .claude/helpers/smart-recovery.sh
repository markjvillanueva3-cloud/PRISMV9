#!/usr/bin/env bash
# PostToolUseFailure hook: enhanced pattern-based auto-recovery.
# Goes beyond basic hints — analyzes error patterns and provides
# specific file paths and code fixes when possible.
# Always exits 0 (never blocks — informational only).

set -euo pipefail

CACHE_DIR="/tmp/prism-cache"
ERROR_LOG="$CACHE_DIR/error-log"
mkdir -p "$CACHE_DIR" 2>/dev/null || true

tool_name="${TOOL_NAME:-unknown}"
tool_input="${TOOL_INPUT_command:-${TOOL_INPUT_file_path:-${TOOL_INPUT_pattern:-}}}"
tool_error="${TOOL_ERROR:-}"

# Count consecutive failures of this tool
if [[ -f "$ERROR_LOG" ]]; then
  consecutive=$(tail -5 "$ERROR_LOG" 2>/dev/null | grep -c "$tool_name" 2>/dev/null || true)
else
  consecutive=0
fi

hint=""

# ============================================================
# REPEATED FAILURES (3+ of same tool) — deep analysis
# ============================================================
if (( consecutive >= 3 )); then
  hint="REPEATED FAILURE: '$tool_name' has failed $consecutive times consecutively. Consider: 1) Different approach entirely 2) Check prerequisites (is the file/path correct?) 3) Read the error output carefully — the pattern may reveal a systemic issue."
fi

# ============================================================
# TSC ERROR PATTERNS — specific TS fixes
# ============================================================
if [[ "$tool_error" == *"TS2"* || "$tool_error" == *"error TS"* ]]; then
  if [[ "$tool_error" == *"TS2307"* ]]; then
    hint="TS2307 (Cannot find module): Check import path. Did the file move? Is the package installed? Run: npm install"
  elif [[ "$tool_error" == *"TS2345"* ]]; then
    hint="TS2345 (Type mismatch): Argument type doesn't match parameter type. Check the function signature and ensure proper type casting."
  elif [[ "$tool_error" == *"TS2339"* ]]; then
    hint="TS2339 (Property doesn't exist): The property/method doesn't exist on this type. Check interface definition or add type assertion."
  elif [[ "$tool_error" == *"TS2304"* ]]; then
    hint="TS2304 (Cannot find name): Variable/type not imported or defined. Add missing import or type declaration."
  fi
fi

# ============================================================
# NPM ERRORS
# ============================================================
if [[ "$tool_error" == *"ENOENT"* ]]; then
  hint="ENOENT: File or directory not found. Check path spelling. Common: forgot to cd into mcp-server/, or file was moved/renamed."
fi

if [[ "$tool_error" == *"EACCES"* || "$tool_error" == *"permission denied"* ]]; then
  hint="Permission denied. File may be read-only or protected by file-protect.sh. Check: ls -la on the file."
fi

if [[ "$tool_error" == *"heap"* || "$tool_error" == *"JavaScript heap"* ]]; then
  hint="Heap overflow. For builds: use 'npm run build:fast' (esbuild only, skips tsc). Or increase: NODE_OPTIONS=--max-old-space-size=16384"
fi

# Output
if [[ -n "$hint" ]]; then
  hint_escaped=$(echo "$hint" | sed 's/\\/\\\\/g; s/"/\\"/g; s/\t/\\t/g' | tr '\n' ' ')
  echo "{\"additionalContext\": \"SMART RECOVERY: $hint_escaped\"}"
else
  echo "{}"
fi

exit 0
