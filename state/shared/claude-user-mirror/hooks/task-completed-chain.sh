#!/bin/bash
# TaskCompleted hook — suggests next PRISM milestone when a task finishes
# Reads ROADMAP_QUEUE.json to find available milestones

INPUT=$(cat)
. ~/.claude/hooks/lib/common.sh

QUEUE_FILE="C:/PRISM/PRISMV9/ROADMAP_QUEUE.json"
[ ! -f "$QUEUE_FILE" ] && exit 0

# Check if completed task was PRISM-related and suggest next milestone
RESULT=$(python3 -c "
import sys,json

d = json.load(sys.stdin)
subject = (d.get('task_subject','') or d.get('subject','') or '').lower()

# Only trigger for PRISM-related tasks
prism_keywords = ['prism', 'milestone', 'layer', 'l0', 'l1', 'l2', 'l3', 'l4', 'l5',
                  'l6', 'l7', 'l8', 'l9', 'l10', 'mcp-server', 'dispatcher', 'engine']
if not any(kw in subject for kw in prism_keywords):
    sys.exit(0)

# Read roadmap queue
try:
    with open('$QUEUE_FILE') as f:
        queue = json.load(f)
except:
    sys.exit(0)

available = queue.get('columns', {}).get('available', [])
if available:
    next_ms = available[0]
    ms_id = next_ms.get('id', '?')
    title = next_ms.get('title', '?')[:40]
    units = next_ms.get('units', '?')
    sessions = next_ms.get('sessions', '?')
    print(f'PRISM task done! Next available: {ms_id} ({title}) — {units} units, ~{sessions} sessions')
else:
    claimed = queue.get('columns', {}).get('claimed', [])
    if claimed:
        print(f'PRISM task done! No available milestones — {len(claimed)} claimed, check roadmap for blockers')
" <<< "$INPUT" 2>/dev/null)

[ -n "$RESULT" ] && hint "$RESULT" "TaskCompleted"

exit 0
