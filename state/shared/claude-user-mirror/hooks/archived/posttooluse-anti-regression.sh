#!/bin/bash
# Hook F: Anti-regression guard for dispatcher action counts
# PostToolUse on Edit/Write — warns if action count decreased in dispatcher files

INPUT=$(cat)
. ~/.claude/hooks/lib/common.sh
parse_hook_input "$INPUT"

# Only check dispatcher files
case "$FILE_PATH" in
  *mcp-server/src/tools/dispatchers/*Dispatcher.ts) ;;
  *) exit 0 ;;
esac

[ -f "$FILE_PATH" ] || exit 0

CACHE_DIR="/tmp/prism-action-counts"
mkdir -p "$CACHE_DIR"
BASENAME=$(basename "$FILE_PATH")
CACHE_FILE="$CACHE_DIR/${BASENAME}.count"

# Count current actions: case "action_name": patterns
CURRENT_COUNT=$(grep -cE '^\s*case\s+"[a-z_]+"' "$FILE_PATH" 2>/dev/null || echo "0")

if [ -f "$CACHE_FILE" ]; then
  PREV_COUNT=$(cat "$CACHE_FILE")

  if [ "$CURRENT_COUNT" -lt "$PREV_COUNT" ] 2>/dev/null; then
    DIFF=$((PREV_COUNT - CURRENT_COUNT))
    hint "ANTI-REGRESSION WARNING: ${BASENAME} action count decreased from ${PREV_COUNT} to ${CURRENT_COUNT} (-${DIFF}). Verify no actions were accidentally removed."
  fi
fi

# Update cache with new count
echo "$CURRENT_COUNT" > "$CACHE_FILE"

exit 0
