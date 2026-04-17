#!/bin/bash
# Hook H: Compress large MCP tool results to save context tokens
# PostToolUse — fires only on mcp__* tool calls with large output

INPUT=$(cat)

# Fast exit: check approximate size before parsing JSON
RESP_LEN=${#INPUT}
[ "$RESP_LEN" -lt 5000 ] && exit 0

. ~/.claude/hooks/lib/common.sh
parse_hook_input "$INPUT"

# Only process MCP plugin results
case "$TOOL_NAME" in
  mcp__*) ;;
  *) exit 0 ;;
esac

# Get precise response length
PRECISE_LEN=$(python3 -c "
import sys,json
d=json.load(sys.stdin)
r=d.get('tool_response','') or d.get('tool_output','')
if isinstance(r,dict): print(len(str(r)))
elif isinstance(r,str): print(len(r))
else: print(0)
" <<< "$INPUT" 2>/dev/null)

[ -z "$PRECISE_LEN" ] && exit 0

if [ "$PRECISE_LEN" -gt 20000 ] 2>/dev/null; then
  hint "LARGE MCP RESULT (${PRECISE_LEN} chars from ${TOOL_NAME}). Summarize key findings only — do not echo raw output."
elif [ "$PRECISE_LEN" -gt 10000 ] 2>/dev/null; then
  hint "MCP result from ${TOOL_NAME} is ${PRECISE_LEN} chars. Extract only relevant sections for the current task."
fi

exit 0
