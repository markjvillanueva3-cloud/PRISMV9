#!/bin/bash
# UserPromptSubmit hook -- detect skill triggers and inject context hints
INPUT=$(</dev/stdin)
. ~/.claude/hooks/lib/common.sh
export _UP_INPUT="$INPUT"
RESULT=$(python3 ~/.claude/hooks/lib/userpromptsubmit_logic.py 2>/dev/null)
unset _UP_INPUT
[ -n "$RESULT" ] && hint "$RESULT" "UserPromptSubmit"
exit 0
