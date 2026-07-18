#!/bin/bash
# SubagentStart hook -- track agent spawns and warn on high count
INPUT=$(</dev/stdin)
. ~/.claude/hooks/lib/common.sh
export _SAS_INPUT="$INPUT"
RESULT=$(python3 ~/.claude/hooks/lib/subagent_start_logic.py 2>/dev/null)
unset _SAS_INPUT
[ -n "$RESULT" ] && hint "$RESULT" "SubagentStart"
exit 0
