#!/bin/bash
# Hook G: Code quality checks after Edit/Write to TS/JS files
# PostToolUse — checks patterns NOT covered by hookify rules
# NOTE: console.log, debugger, TODO detection MOVED to hookify rules (warn-debug-code, warn-todo-fixme)
# This hook now only handles: excessive 'any' type usage (TypeScript-specific, needs file-level counting)

INPUT=$(cat)
. ~/.claude/hooks/lib/common.sh
parse_hook_input "$INPUT"

# Only TypeScript files (the only check remaining is TS-specific)
case "$FILE_PATH" in
  *.ts|*.tsx) ;;
  *) exit 0 ;;
esac

[ -f "$FILE_PATH" ] || exit 0

# Check for excessive any type usage (TypeScript only — requires file-level count, can't be hookify regex)
ANY_COUNT=$(grep -cE ':\s*any\b' "$FILE_PATH" 2>/dev/null || echo "0")
if [ "$ANY_COUNT" -gt 10 ]; then
  hint "CODE QUALITY: High 'any' type usage (${ANY_COUNT}). Consider adding proper types."
fi

exit 0
