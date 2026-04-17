#!/bin/bash
# PreToolUse guard for Glob tool: Prevent overly broad patterns that waste tokens

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_name',''))" 2>/dev/null)

[ "$TOOL_NAME" != "Glob" ] && exit 0

python3 -c "
import json, sys

data = json.loads(sys.stdin.read())
tool_input = data.get('tool_input', {})
pattern = tool_input.get('pattern', '')
path = tool_input.get('path', '')

# === DENY: Patterns that match everything ===
overly_broad = ['**/*', '**', '*', '**/**']
if pattern in overly_broad and not path:
    print(json.dumps({'hookSpecificOutput': {
        'hookEventName': 'PreToolUse',
        'permissionDecision': 'deny',
        'permissionDecisionReason': f'Pattern \"{pattern}\" without a path matches every file in the tree. Add a path or use a narrower pattern like **/*.ts or src/**/*.'
    }}))
    sys.exit(0)

# === WARN: node_modules could be in results ===
if not path or path in ['.', './', 'C:\\\\PRISM', 'C:/PRISM']:
    if '**' in pattern and not any(ext in pattern for ext in ['.ts', '.js', '.json', '.md', '.sh', '.py', '.yaml', '.yml']):
        print(json.dumps({'hookSpecificOutput': {
            'hookEventName': 'PreToolUse',
            'additionalContext': 'TIP: Glob with ** and no file extension filter may match thousands of files including node_modules. Add an extension filter like **/*.ts.'
        }}))
        sys.exit(0)
" <<< "$INPUT"

exit 0
