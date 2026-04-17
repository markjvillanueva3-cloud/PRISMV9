#!/bin/bash
# PostCompact hook -- restore critical facts after context compaction
INPUT=$(</dev/stdin)
. ~/.claude/hooks/lib/common.sh
export _PC_INPUT="$INPUT"
RESULT=$(python3 ~/.claude/hooks/lib/postcompact_logic.py 2>/dev/null)
unset _PC_INPUT
[ -n "$RESULT" ] && hint "$RESULT" "PostCompact"
exit 0
