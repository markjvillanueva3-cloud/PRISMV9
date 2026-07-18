#!/usr/bin/env bash
# teammate-idle-handler.sh
# Hook: TeammateIdle - runs when a teammate agent goes idle after completing its task.
# Logs the idle event to telemetry and hints which task the idle agent should pick up.

source "$HOME/.claude/hooks/lib/common.sh"

# Parse hook input from stdin
INPUT=$(</dev/stdin)
parse_hook_input "$INPUT"
TEAMMATE_NAME="${TOOL_NAME:-unknown}"
# Fallback: try agent_name field if tool_name was empty
if [ "$TEAMMATE_NAME" = "" ] || [ "$TEAMMATE_NAME" = "unknown" ]; then
    TEAMMATE_NAME=$(echo "$INPUT" | python3 -c "
import json, sys
try:
    d = json.load(sys.stdin)
    print(d.get('teammate_name', d.get('agent_name', 'unknown')))
except:
    print('unknown')
" 2>/dev/null || echo "unknown")
fi

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Sanitize variables for safe interpolation into Python strings
# Remove single quotes and backslashes to prevent injection
TEAMMATE_NAME_SAFE="${TEAMMATE_NAME//\'/}"
TEAMMATE_NAME_SAFE="${TEAMMATE_NAME_SAFE//\\/}"
TIMESTAMP_SAFE="${TIMESTAMP//\'/}"

# --- 1. Log idle event to telemetry ---
TELEMETRY_DIR="$HOME/.prism/telemetry"
mkdir -p "$TELEMETRY_DIR"

IDLE_LOG="$TELEMETRY_DIR/teammate-idle.jsonl"
export _HOOK_TEAMMATE="$TEAMMATE_NAME_SAFE"
export _HOOK_TIMESTAMP="$TIMESTAMP_SAFE"
python3 -c "
import json, os
entry = {
    'event': 'teammate_idle',
    'teammate': os.environ.get('_HOOK_TEAMMATE', 'unknown'),
    'timestamp': os.environ.get('_HOOK_TIMESTAMP', '')
}
print(json.dumps(entry))
" >> "$IDLE_LOG" 2>/dev/null || true

# --- 2. Check for pending team tasks ---
PENDING_TASK=""
TEAM_NAME=""

# Check each team for incomplete steps
for team in forge test pipeline; do
    STEP1="C:/tmp/prism-team-${team}-step1.json"
    STEP2="C:/tmp/prism-team-${team}-step2.json"
    STEP3="C:/tmp/prism-team-${team}-step3.json"

    if [ -f "$STEP1" ] && [ ! -f "$STEP2" ]; then
        TEAM_NAME="$team"
        PENDING_TASK="Step 2 of $team-team is pending (step 1 complete)"
        break
    elif [ -f "$STEP2" ] && [ ! -f "$STEP3" ]; then
        TEAM_NAME="$team"
        PENDING_TASK="Step 3 of $team-team is pending (steps 1-2 complete)"
        break
    fi
done

# --- 3. Check TASK_DAG_STATE for non-team tasks ---
TASK_DAG="$HOME/.prism/state/TASK_DAG_STATE.json"
if [ -z "$PENDING_TASK" ] && [ -f "$TASK_DAG" ]; then
    export _HOOK_TASK_DAG="$TASK_DAG"
    DAG_INFO=$(python3 -c "
import json, os
try:
    dag_path = os.environ.get('_HOOK_TASK_DAG', '')
    with open(dag_path) as f:
        state = json.load(f)
    completed = state.get('completed_count', 0)
    total = state.get('total_count', 0)
    pending = state.get('pending_tasks', [])
    if pending:
        print(f'Task DAG: {completed}/{total} complete. Next: {pending[0]}')
    elif completed < total:
        print(f'Task DAG: {completed}/{total} complete. Check for unblocked tasks.')
    else:
        print('')
except:
    print('')
" 2>/dev/null || echo "")
    if [ -n "$DAG_INFO" ]; then
        PENDING_TASK="$DAG_INFO"
    fi
fi

# --- 4. Output advisory hint ---
PENDING_TASK_SAFE="${PENDING_TASK//\'/}"
PENDING_TASK_SAFE="${PENDING_TASK_SAFE//\\/}"
export _HOOK_TEAMMATE="$TEAMMATE_NAME_SAFE"
export _HOOK_PENDING="$PENDING_TASK_SAFE"

if [ -n "$PENDING_TASK" ]; then
    python3 -c "
import json, os
teammate = os.environ.get('_HOOK_TEAMMATE', 'unknown')
pending = os.environ.get('_HOOK_PENDING', '')
hint = {
    'hookSpecificOutput': {
        'hookEventName': 'TeammateIdle',
        'additionalContext': f'IDLE: {teammate}. {pending}. Assign this agent to the pending step or dismiss if phase complete.'
    }
}
print(json.dumps(hint))
"
else
    python3 -c "
import json, os
teammate = os.environ.get('_HOOK_TEAMMATE', 'unknown')
hint = {
    'hookSpecificOutput': {
        'hookEventName': 'TeammateIdle',
        'additionalContext': f'IDLE: {teammate}. No pending team tasks found. Lead agent should assign new work or dismiss.'
    }
}
print(json.dumps(hint))
"
fi

exit 0
