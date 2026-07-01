#!/bin/bash
# PreToolUse guard for WebFetch/WebSearch: Track duplicate fetches, warn about token cost

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_name',''))" 2>/dev/null)

case "$TOOL_NAME" in
  WebFetch|WebSearch) ;;
  *) exit 0 ;;
esac

python3 -c "
import json, sys, time

data = json.loads(sys.stdin.read())
tool_input = data.get('tool_input', {})

# Track duplicate web fetches
TRACKER = '/tmp/claude-web-tracker.json'
try:
    with open(TRACKER) as f:
        tracker = json.load(f)
except:
    tracker = {}

now = time.time()
tracker = {k: v for k, v in tracker.items() if now - v < 300}  # 5 min window

if data.get('tool_name') == 'WebFetch':
    url = tool_input.get('url', '')
    if url in tracker and (now - tracker[url]) < 120:
        print(json.dumps({'hookSpecificOutput': {
            'hookEventName': 'PreToolUse',
            'additionalContext': 'NOTE: This URL was fetched recently (WebFetch has a 15-min cache). The cached result will be used, but consider if you already have the info you need.'
        }}))
    tracker[url] = now

elif data.get('tool_name') == 'WebSearch':
    query = tool_input.get('query', '')
    if query in tracker and (now - tracker[query]) < 60:
        print(json.dumps({'hookSpecificOutput': {
            'hookEventName': 'PreToolUse',
            'permissionDecision': 'deny',
            'permissionDecisionReason': 'This exact search was just performed. Use the previous results.'
        }}))
        sys.exit(0)
    tracker[query] = now

try:
    with open(TRACKER, 'w') as f:
        json.dump(tracker, f)
except:
    pass
" <<< "$INPUT"

exit 0
