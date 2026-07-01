#!/bin/bash
# SessionStart hook: Inject token-saving instructions + recent actions at session start

RULES='TOKEN EFFICIENCY RULES: (1) Never echo raw tool output back to user - summarize. (2) Use dedicated tools (Read/Grep/Glob/Edit/Write) instead of Bash equivalents. (3) Run independent tool calls in parallel. (4) For PRISM: load skills via TRIGGER_MAP auto-matching before manual search.'

# Surface recent actions for session continuity
RECENT_FILE="C:/PRISM/state/RECENT_ACTIONS.json"
RECENT=""
if [ -f "$RECENT_FILE" ]; then
  RECENT=$(python3 -c "
import json
try:
    with open(r'C:\PRISM\state\RECENT_ACTIONS.json', encoding='utf-8') as f:
        data = json.load(f)
    actions = data.get('actions', [])[-5:]
    if actions:
        lines = []
        for a in actions:
            status = 'OK' if a.get('success') else 'FAIL'
            lines.append(f\"  {a.get('tool','?')}:{a.get('action','?')} {status} {a.get('duration_ms',0)}ms\")
        print(' | PREVIOUS SESSION ACTIONS (last 5): ' + '; '.join(lines))
except:
    pass
" 2>/dev/null)
fi

python3 -c "
import json, sys
rules = sys.argv[1]
recent = sys.argv[2] if len(sys.argv) > 2 else ''
msg = rules + recent
print(json.dumps({
  'hookSpecificOutput': {
    'hookEventName': 'SessionStart',
    'additionalContext': msg
  }
}))
" "$RULES" "$RECENT"
