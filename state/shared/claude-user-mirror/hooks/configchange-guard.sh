#!/bin/bash
# ConfigChange hook — guards against accidental disabling of security infrastructure
# Fires when settings.json or settings.local.json change during a session

INPUT=$(cat)
. ~/.claude/hooks/lib/common.sh
parse_hook_input "$INPUT"

# Extract changed file path from input
CHANGED_FILE=$(python3 -c "
import sys,json
d=json.load(sys.stdin)
print(d.get('file_path','') or d.get('config_path','') or '')
" <<< "$INPUT" 2>/dev/null)

# Only care about settings files
case "$CHANGED_FILE" in
  *settings.json|*settings.local.json) ;;
  *) exit 0 ;;
esac

[ ! -f "$CHANGED_FILE" ] && exit 0

# Check for dangerous changes
WARNINGS=$(python3 -c "
import json,sys

try:
    with open(sys.argv[1]) as f:
        cfg = json.load(f)
except:
    sys.exit(0)

warns = []

# Check if hooks are disabled
if cfg.get('disableAllHooks'):
    warns.append('disableAllHooks is TRUE — all hook protections are off')

# Check if critical hooks are missing
hooks = cfg.get('hooks', {})
for event in ['PreToolUse', 'PostToolUse', 'PermissionRequest']:
    if event not in hooks or not hooks[event]:
        warns.append(f'{event} hooks are empty or missing')

# Check if security plugins were disabled
plugins = cfg.get('enabledPlugins', {})
if plugins.get('hookify@claude-plugins-official') is False:
    warns.append('hookify plugin was DISABLED — no rule enforcement')

if warns:
    print(' | '.join(warns))
" "$CHANGED_FILE" 2>/dev/null)

[ -n "$WARNINGS" ] && hint "CONFIG GUARD: $WARNINGS — Verify this was intentional."

exit 0
