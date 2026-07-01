#!/bin/bash
# UNIFIED SessionStart hook — injects efficiency rules + restores post-compact context
# Replaces: session-start-compact.sh + post-compact-restore.sh

. ~/.claude/hooks/lib/common.sh

# Detect Cowork/Dispatch mode
COWORK_MODE=$(python3 "$HOME/.claude/hooks/lib/detect_cowork.py" 2>/dev/null)
if echo "$COWORK_MODE" | python3 -c "import sys,json; m=json.load(sys.stdin); print('compact' if m.get('mode',{}).get('compact_output') else '')" 2>/dev/null | grep -q "compact"; then
  export PRISM_COMPACT_OUTPUT=1
fi

SAVE_FILE="/tmp/claude-precompact-context.json"
CONTEXT="$TOKEN_RULES"

# Cleanup stale temp files from previous sessions
find /tmp -maxdepth 1 -name 'claude-ws-*' -mmin +1440 -delete 2>/dev/null
find /tmp -maxdepth 1 -name '.claude-hook-vars-*' -mmin +60 -delete 2>/dev/null
find /tmp -maxdepth 1 -name '.claude-lint-content-*' -mmin +60 -delete 2>/dev/null
find /tmp -maxdepth 1 -name 'prism-tsc-lastrun' -mmin +1440 -delete 2>/dev/null
find /tmp -maxdepth 1 -name 'claude-wf-*' -mmin +1440 -delete 2>/dev/null
find /tmp -maxdepth 1 -name 'claude-read-*' -mmin +60 -delete 2>/dev/null
find /tmp -maxdepth 1 -name 'prism-action-counts' -type d -mmin +1440 -exec rm -rf {} + 2>/dev/null
find /tmp -maxdepth 1 -name 'claude-arch-regen' -mmin +1440 -delete 2>/dev/null
find /tmp -maxdepth 1 -name 'claude-glob-*' -mmin +60 -delete 2>/dev/null
find /tmp -maxdepth 1 -name 'claude-grep-*' -mmin +60 -delete 2>/dev/null
find /tmp -maxdepth 1 -name 'claude-session-chars' -mmin +1440 -delete 2>/dev/null
find /tmp -maxdepth 1 -name 'claude-session-warn-*' -mmin +1440 -delete 2>/dev/null
rm -f /tmp/claude-tools-loaded 2>/dev/null

# Check for saved post-compact context
if [ -f "$SAVE_FILE" ]; then
  AGE=$(python3 -c "import os,time;print(int(time.time()-os.path.getmtime('$SAVE_FILE')))" 2>/dev/null)
  if [ "${AGE:-9999}" -lt 600 ] 2>/dev/null; then
    RESTORE=$(python3 -c "
import json
try:
    with open('$SAVE_FILE') as f: ctx=json.load(f)
    parts=['TOKEN RULES: '+'; '.join(ctx.get('reminders',[])[: 4])]
    s=ctx.get('prism_survival',{})
    if s.get('task'): parts.append('TASK: '+s['task'])
    if s.get('next_action'): parts.append('NEXT: '+s['next_action'])
    if s.get('active_files'): parts.append('FILES: '+', '.join(s['active_files'][:3]))
    st=ctx.get('prism_state',{})
    if st.get('quick_resume'): parts.append('RESUME: '+st['quick_resume'][:200])
    m=ctx.get('recovery_manifest',{})
    if m.get('task') and not s.get('task'): parts.append('TASK: '+m['task'])
    if ctx.get('recent_git_changes'): parts.append('GIT: '+', '.join(ctx['recent_git_changes'][:5]))
    print(' | '.join(parts))
except: print('Post-compact: no context')
" 2>/dev/null)
    rm -f "$SAVE_FILE"
    CONTEXT="POST-COMPACT RESTORE: $RESTORE"
  else
    rm -f "$SAVE_FILE"
  fi
fi

# Add digest system awareness
if [ "${PRISM_COMPACT_OUTPUT:-0}" = "1" ]; then
  CONTEXT="$CONTEXT | COMPACT MODE ON. /digest-all for system map, /navigate for lookup. Cowork/Dispatch detected."
else
  CONTEXT="$CONTEXT | DIGEST SYSTEM: Use /digest-all (~1100 tokens) to load full system map, /navigate <topic> for zero-IO file location, /code-index <shortcode> for DSL lookup (1865 files indexed). Avoid Glob/Grep for codebase exploration."
fi

# Session orchestrator � health/telemetry/optimizer insights
ORCH_OUT=$(python3 "$HOME/.claude/hooks/lib/session_orchestrator.py" 2>/dev/null)
if [ -n "$ORCH_OUT" ]; then
  CONTEXT="$CONTEXT | $ORCH_OUT"
fi

hint "$CONTEXT" "SessionStart"
