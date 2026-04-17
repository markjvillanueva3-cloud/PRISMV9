#!/bin/bash
# PostToolUseFailure hook -- classify errors and log to telemetry
INPUT=$(</dev/stdin)
. ~/.claude/hooks/lib/common.sh
export _PTF_INPUT="$INPUT"
RESULT=$(python3 ~/.claude/hooks/lib/posttooluse_failure_logic.py 2>/dev/null)
unset _PTF_INPUT
[ -n "$RESULT" ] && hint "$RESULT" "PostToolUseFailure"
exit 0
