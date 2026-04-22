#!/bin/bash
# Post-Compact restoration hook (runs via SessionStart matcher)
# Re-injects critical context that may have been lost during compaction
# Enhanced: includes PRISM survival data, task context, and recovery info

SAVE_FILE="/tmp/claude-precompact-context.json"

# Check if we have saved context from a recent compaction
if [ -f "$SAVE_FILE" ]; then
  # Check if save file is recent (less than 10 minutes old)
  FILE_AGE=$(python3 -c "
import os, time
try:
    age = time.time() - os.path.getmtime('$SAVE_FILE')
    print(int(age))
except:
    print(9999)
" 2>/dev/null)

  if [ "$FILE_AGE" -lt 600 ] 2>/dev/null; then
    # Read saved context and inject rich PRISM recovery data
    CONTEXT=$(python3 -c "
import json
try:
    with open('$SAVE_FILE') as f:
        ctx = json.load(f)
    parts = []

    # Standard reminders
    if ctx.get('reminders'):
        parts.append('TOKEN RULES: ' + '; '.join(ctx['reminders'][:4]))

    # PRISM task/phase from survival data
    surv = ctx.get('prism_survival', {})
    if surv.get('task'):
        parts.append('TASK: ' + surv['task'])
    if surv.get('next_action'):
        parts.append('NEXT: ' + surv['next_action'])
    if surv.get('active_files'):
        parts.append('FILES: ' + ', '.join(surv['active_files'][:3]))
    if surv.get('recent_decisions'):
        parts.append('DECISIONS: ' + '; '.join(str(d) for d in surv['recent_decisions'][:2]))

    # PRISM state quick resume
    state = ctx.get('prism_state', {})
    if state.get('quick_resume'):
        parts.append('RESUME: ' + state['quick_resume'][:200])

    # Recovery manifest
    manifest = ctx.get('recovery_manifest', {})
    if manifest.get('task') and not surv.get('task'):
        parts.append('TASK: ' + manifest['task'])
    if manifest.get('next_action') and not surv.get('next_action'):
        parts.append('NEXT: ' + manifest['next_action'])

    # Recent git changes
    if ctx.get('recent_git_changes'):
        parts.append('GIT: ' + ', '.join(ctx['recent_git_changes'][:5]))

    print(' | '.join(parts))
except Exception as e:
    print('Post-compact: no saved context available')
" 2>/dev/null)

    # Clean up the save file
    rm -f "$SAVE_FILE"

    python3 -c "
import json
print(json.dumps({
  'hookSpecificOutput': {
    'hookEventName': 'SessionStart',
    'additionalContext': '''POST-COMPACT RESTORE: $CONTEXT'''
  }
}))
"
    exit 0
  else
    # Stale file, clean up
    rm -f "$SAVE_FILE"
  fi
fi

# No saved context - just inject standard rules
python3 -c "
import json
print(json.dumps({
  'hookSpecificOutput': {
    'hookEventName': 'SessionStart',
    'additionalContext': 'TOKEN EFFICIENCY RULES: (1) Never echo raw tool output back to user - summarize. (2) Use dedicated tools (Read/Grep/Glob/Edit/Write) instead of Bash equivalents. (3) Run independent tool calls in parallel. (4) For PRISM: load skills via TRIGGER_MAP auto-matching before manual search.'
  }
}))
"
