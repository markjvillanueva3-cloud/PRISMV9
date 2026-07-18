#!/bin/bash
# Hook I: Pre-edit linting hints for new content
# PreToolUse on Edit/Write — checks for formatting/style issues before they land

INPUT=$(cat)
. ~/.claude/hooks/lib/common.sh
parse_hook_input "$INPUT"

# Only TS/JS/TSX files
case "$FILE_PATH" in
  *.ts|*.js|*.tsx) ;;
  *) exit 0 ;;
esac

# Extract content to temp file for safe analysis (avoids shell escaping issues)
# Use Python's tempfile to get a path both bash and python agree on
export _HOOK_INPUT="$INPUT"
export _HOOK_BASH_PID="$$"
CONTENT_FILE=$(python3 << 'PYEOF' 2>/dev/null
import json,os,tempfile
raw = os.environ.get("_HOOK_INPUT","")
d = json.loads(raw) if raw else {}
ti = d.get("tool_input",{})
nc = ti.get("new_string","") or ti.get("content","")
pid = os.environ.get("_HOOK_BASH_PID","0")
fpath = os.path.join(tempfile.gettempdir(), f".claude-lint-content-{pid}")
with open(fpath, "w", encoding="utf-8") as f:
    f.write(nc)
print(fpath)
PYEOF
)
unset _HOOK_INPUT _HOOK_BASH_PID

# Override hint to also clean up temp file
lint_hint() { rm -f "$CONTENT_FILE"; hint "$1" "PreToolUse"; }

# Ensure we have content to lint
[ -f "$CONTENT_FILE" ] || exit 0
CONTENT_SIZE=$(wc -c < "$CONTENT_FILE" 2>/dev/null | tr -d ' ')
[ "${CONTENT_SIZE:-0}" -lt 2 ] && { rm -f "$CONTENT_FILE"; exit 0; }

WARNINGS=""

# Check for very long lines (>150 chars)
LONG_LINES=$(awk 'length > 150 { count++ } END { print count+0 }' "$CONTENT_FILE" 2>/dev/null)
if [ "$LONG_LINES" -gt 3 ] 2>/dev/null; then
  WARNINGS="${WARNINGS}${LONG_LINES} lines >150 chars. Consider wrapping. "
fi

# Check for mixed tabs and spaces indentation
HAS_TABS=$(grep -cP '^\t' "$CONTENT_FILE" 2>/dev/null || echo "0")
HAS_SPACES=$(grep -cP '^ {2,}' "$CONTENT_FILE" 2>/dev/null || echo "0")
if [ "$HAS_TABS" -gt 0 ] && [ "$HAS_SPACES" -gt 0 ] 2>/dev/null; then
  WARNINGS="${WARNINGS}Mixed tabs and spaces detected. "
fi

# Check for trailing whitespace
TRAILING=$(grep -cE '[[:blank:]]+$' "$CONTENT_FILE" 2>/dev/null || echo "0")
if [ "$TRAILING" -gt 2 ] 2>/dev/null; then
  WARNINGS="${WARNINGS}${TRAILING} lines with trailing whitespace. "
fi

rm -f "$CONTENT_FILE"

if [ -n "$WARNINGS" ]; then
  hint "LINT: $WARNINGS" "PreToolUse"
fi

exit 0
