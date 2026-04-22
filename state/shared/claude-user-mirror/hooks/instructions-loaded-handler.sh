#!/bin/bash
# InstructionsLoaded hook -- validate MEMORY.md freshness on session start
INPUT=$(</dev/stdin)
. ~/.claude/hooks/lib/common.sh
export _IL_INPUT="$INPUT"
RESULT=$(python3 ~/.claude/hooks/lib/instructions_loaded_logic.py 2>/dev/null)
unset _IL_INPUT
[ -n "$RESULT" ] && hint "$RESULT" "InstructionsLoaded"
exit 0
