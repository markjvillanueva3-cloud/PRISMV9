#!/bin/bash
# WorktreeCreate hook -- log worktree creation events
INPUT=$(</dev/stdin)
. ~/.claude/hooks/lib/common.sh
export _WT_INPUT="$INPUT"
python3 ~/.claude/hooks/lib/worktree_logic.py created 2>/dev/null
unset _WT_INPUT
exit 0
