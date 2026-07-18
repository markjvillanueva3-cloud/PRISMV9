#!/bin/bash
# PreToolUse guard for Read tool: Prevent reading huge files without limits
# Also blocks reading known-wasteful paths (node_modules, dist, .git)

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_name',''))" 2>/dev/null)

[ "$TOOL_NAME" != "Read" ] && exit 0

python3 -c "
import json, sys, os

data = json.loads(sys.stdin.read())
tool_input = data.get('tool_input', {})
file_path = tool_input.get('file_path', '')
limit = tool_input.get('limit')
offset = tool_input.get('offset')

# Normalize path
fp = file_path.replace('\\\\', '/').lower()

# === DENY: Known wasteful paths ===
wasteful = ['node_modules/', '/dist/', '/.git/objects/', '/package-lock.json', '/yarn.lock', '/pnpm-lock.yaml', '.min.js', '.min.css', '.map']
for w in wasteful:
    if w in fp:
        print(json.dumps({'hookSpecificOutput': {
            'hookEventName': 'PreToolUse',
            'permissionDecision': 'deny',
            'permissionDecisionReason': f'Reading {w.strip(\"/\")} files wastes tokens. These are auto-generated/vendored. Use Grep to search within them instead.'
        }}))
        sys.exit(0)

# === REWRITE: Large files without limit ===
# If no limit set, check file size and add one for known-large files
if limit is None and offset is None and os.path.isfile(file_path):
    try:
        size = os.path.getsize(file_path)
        if size > 50000:  # >50KB = definitely needs a limit
            print(json.dumps({'hookSpecificOutput': {
                'hookEventName': 'PreToolUse',
                'additionalContext': f'WARNING: File is {size//1024}KB. Consider using offset/limit params or Grep to find specific sections. Full read will consume many tokens.'
            }}))
            sys.exit(0)
    except:
        pass

# === DENY: Re-reading same file within short window ===
TRACKER = '/tmp/claude-read-tracker.json'
import time
try:
    with open(TRACKER) as f:
        tracker = json.load(f)
except:
    tracker = {}

now = time.time()
# Clean entries older than 120s
tracker = {k: v for k, v in tracker.items() if now - v < 120}

if file_path in tracker and (now - tracker[file_path]) < 30:
    # Same file read within 30 seconds - warn
    print(json.dumps({'hookSpecificOutput': {
        'hookEventName': 'PreToolUse',
        'additionalContext': 'NOTE: This file was just read seconds ago. Use the content from the previous read instead of re-reading.'
    }}))

# Track this read
tracker[file_path] = now
try:
    with open(TRACKER, 'w') as f:
        json.dump(tracker, f)
except:
    pass
" <<< "$INPUT"

exit 0
