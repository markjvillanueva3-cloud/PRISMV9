#!/bin/bash
# SessionEnd hook -- aggregate session metrics and clean up
INPUT=$(</dev/stdin)
. ~/.claude/hooks/lib/common.sh
export _SE_INPUT="$INPUT"
python3 ~/.claude/hooks/lib/session_end_logic.py 2>/dev/null
unset _SE_INPUT
rm -f /tmp/prism-agent-count 2>/dev/null
rm -f /tmp/prism-session-* 2>/dev/null
exit 0
