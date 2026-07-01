#!/bin/bash
# Stop hook — checks last_assistant_message for incomplete work signals
# Uses the new last_assistant_message field available in Stop events

INPUT=$(cat)
. ~/.claude/hooks/lib/common.sh

# Extract last_assistant_message and check for incomplete signals
RESULT=$(python3 -c "
import sys,json,re

d = json.load(sys.stdin)
msg = d.get('last_assistant_message', '') or ''
if not msg:
    sys.exit(0)

msg_lower = msg.lower()
warns = []

# Check for incomplete task signals
incomplete_patterns = [
    (r'\b(still need|still have|remaining|left to do|not yet|haven.t finished)\b', 'incomplete work mentioned'),
    (r'\b(will (do|finish|complete|implement) (this|that|it) (later|next|soon))\b', 'deferred work'),
    (r'\b(TODO|FIXME|HACK)\b.*\b(added|left|remaining)\b', 'TODOs were added'),
    (r'task.*(pending|blocked|in.progress)', 'pending tasks remain'),
]

for pattern, label in incomplete_patterns:
    if re.search(pattern, msg, re.IGNORECASE):
        warns.append(label)

# Check for error signals in last message
error_patterns = [
    (r'(failed|error|broken|not working)', 'errors mentioned'),
    (r'(could not|unable to|cannot)\s+(find|read|write|access)', 'access issues'),
]

for pattern, label in error_patterns:
    if re.search(pattern, msg_lower):
        warns.append(label)

if warns:
    print(' | '.join(warns[:3]))
" <<< "$INPUT" 2>/dev/null)

[ -n "$RESULT" ] && hint "STOP CHECK: $RESULT — Consider addressing before ending session." "Stop"

exit 0
