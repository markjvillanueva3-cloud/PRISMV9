#!/bin/bash
# StopFailure hook -- handle stop failures with appropriate guidance
INPUT=$(</dev/stdin)
. ~/.claude/hooks/lib/common.sh
export _SF_INPUT="$INPUT"
RESULT=$(python3 ~/.claude/hooks/lib/stop_failure_logic.py 2>/dev/null)
unset _SF_INPUT
[ -n "$RESULT" ] && hint "$RESULT" "StopFailure"
exit 0
