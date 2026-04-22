#!/bin/bash
# SubagentStop hook -- track agent completions and decrement count
INPUT=$(</dev/stdin)
. ~/.claude/hooks/lib/common.sh
export _SAE_INPUT="$INPUT"
python3 ~/.claude/hooks/lib/subagent_stop_logic.py 2>/dev/null
unset _SAE_INPUT
exit 0
