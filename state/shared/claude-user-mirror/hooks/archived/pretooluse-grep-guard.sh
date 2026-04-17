#!/bin/bash
# PreToolUse guard for Grep tool: Add default limits to prevent unbounded searches
# Also warns about overly broad patterns

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_name',''))" 2>/dev/null)

[ "$TOOL_NAME" != "Grep" ] && exit 0

python3 -c "
import json, sys

data = json.loads(sys.stdin.read())
tool_input = data.get('tool_input', {})
pattern = tool_input.get('pattern', '')
path = tool_input.get('path', '')
head_limit = tool_input.get('head_limit')
output_mode = tool_input.get('output_mode', 'files_with_matches')

fp = (path or '').replace('\\\\', '/').lower()

# === DENY: Searching inside node_modules/dist without specific path ===
if not path or path in ['.', './']:
    # Top-level search — could hit node_modules
    # Just warn, don't deny (Grep handles this internally)
    pass

# === WARN: Overly broad patterns (literal single-char or wildcard-only) ===
import re
truly_broad = [r'^\.[\*\+]?$', r'^\.\*$', r'^\.\+$', r'^\\s\*$', r'^\*$']
for bp in truly_broad:
    if re.match(bp, pattern):
        print(json.dumps({'hookSpecificOutput': {
            'hookEventName': 'PreToolUse',
            'additionalContext': f'WARNING: Pattern \"{pattern}\" is very broad and will match nearly everything. Use a more specific pattern to save tokens.'
        }}))
        sys.exit(0)

# === ADVISE: No head_limit on content mode searches ===
if output_mode == 'content' and head_limit is None:
    print(json.dumps({'hookSpecificOutput': {
        'hookEventName': 'PreToolUse',
        'additionalContext': 'TIP: Content-mode Grep without head_limit can return huge results. Consider adding head_limit: 50 to cap output.'
    }}))
    sys.exit(0)

# === TRACK: Duplicate grep with same pattern ===
import time
TRACKER = '/tmp/claude-grep-tracker.json'
try:
    with open(TRACKER) as f:
        tracker = json.load(f)
except:
    tracker = {}

now = time.time()
tracker = {k: v for k, v in tracker.items() if now - v < 120}
key = f'{pattern}|{path}|{output_mode}'

if key in tracker and (now - tracker[key]) < 30:
    print(json.dumps({'hookSpecificOutput': {
        'hookEventName': 'PreToolUse',
        'additionalContext': 'NOTE: This exact search was just run seconds ago. Use the previous results instead of re-searching.'
    }}))

tracker[key] = now
try:
    with open(TRACKER, 'w') as f:
        json.dump(tracker, f)
except:
    pass
" <<< "$INPUT"

exit 0
