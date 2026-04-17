#!/bin/bash
# PreCompact hook: Save critical context before auto-compaction
# Saves both generic reminders AND rich PRISM state for post-compact restoration

. ~/.claude/hooks/lib/common.sh

SAVE_FILE="/tmp/claude-precompact-context.json"
PRISM_STATE="C:/PRISM/state"

# Read the input from Claude — write to temp file to avoid shell escaping issues (H6 fix)
INPUT=$(cat)
_TMPINPUT="/tmp/.claude-precompact-input-$$"
echo "$INPUT" > "$_TMPINPUT"

# Extract and save comprehensive context
python3 -c "
import json, os, datetime

# Parse hook input from temp file (avoids triple-quote escaping bug)
data = {}
try:
    with open('$_TMPINPUT') as f:
        data = json.load(f)
except:
    pass
os.unlink('$_TMPINPUT') if os.path.exists('$_TMPINPUT') else None

# Build context snapshot
context = {
    'saved_at': datetime.datetime.now().isoformat(),
    'reminders': [
        'TOKEN EFFICIENCY: Use dedicated tools (Read/Grep/Glob/Edit/Write) not bash equivalents',
        'PRISM root: C:/PRISM, MCP server: C:/PRISM/mcp-server/src/index.ts',
        'Skills: C:/PRISM/skills-consolidated/ (253 indexed, TRIGGER_MAP.json)',
        'Registries: C:/PRISM/registries/ (45 JSON files)',
        'Run independent tool calls in parallel',
        'Never echo raw tool output - summarize',
        'Load skills via TRIGGER_MAP auto-matching before manual search'
    ]
}

# Save PRISM COMPACTION_SURVIVAL data if available
survival_path = '$PRISM_STATE/COMPACTION_SURVIVAL.json'
if os.path.exists(survival_path):
    try:
        with open(survival_path) as f:
            survival = json.load(f)
        context['prism_survival'] = {
            'task': survival.get('current_task', ''),
            'phase': survival.get('phase', ''),
            'active_files': survival.get('active_files', [])[:5],
            'next_action': survival.get('next_action', ''),
            'recent_decisions': survival.get('recent_decisions', [])[:3],
            'session_id': survival.get('session_id', ''),
            'pressure_pct': survival.get('pressure_pct', 0)
        }
    except:
        pass

# Save CURRENT_STATE quick resume
state_path = '$PRISM_STATE/CURRENT_STATE.json'
if os.path.exists(state_path):
    try:
        with open(state_path) as f:
            state = json.load(f)
        context['prism_state'] = {
            'quick_resume': state.get('quickResume', ''),
            'phase': state.get('currentSession', {}).get('phase', ''),
            'checkpoint': state.get('lastCheckpoint', '')
        }
    except:
        pass

# Save HOT_RESUME content
hot_path = '$PRISM_STATE/HOT_RESUME.md'
if os.path.exists(hot_path):
    try:
        with open(hot_path) as f:
            context['hot_resume'] = f.read()[:2000]
    except:
        pass

# Save RECOVERY_MANIFEST if available
manifest_path = '$PRISM_STATE/RECOVERY_MANIFEST.json'
if os.path.exists(manifest_path):
    try:
        with open(manifest_path) as f:
            manifest = json.load(f)
        context['recovery_manifest'] = {
            'task': manifest.get('task', ''),
            'next_action': manifest.get('next_action', ''),
            'workflow_step': manifest.get('workflow_step', ''),
            'active_files': manifest.get('active_files', [])[:5]
        }
    except:
        pass

# Check for recently modified files
try:
    import subprocess
    result = subprocess.run(['git', 'diff', '--name-only', 'HEAD~3'],
                          capture_output=True, text=True, timeout=5,
                          cwd='C:/PRISM')
    if result.returncode == 0 and result.stdout.strip():
        context['recent_git_changes'] = result.stdout.strip().split('\n')[:10]
except:
    pass

# Collect file read/write tracking from /tmp/ trackers for session context
try:
    import glob as g
    read_files = []
    for tracker in g.glob('/tmp/claude-read-*') + g.glob('C:/tmp/claude-read-*'):
        age = (datetime.datetime.now() - datetime.datetime.fromtimestamp(os.path.getmtime(tracker))).seconds
        if age < 600:  # files read in last 10 min
            read_files.append(tracker.split('claude-read-')[-1][:12])
    if read_files:
        context['recent_read_hashes'] = read_files[:15]
        context['files_read_count'] = len(read_files)
except:
    pass

with open('$SAVE_FILE', 'w') as f:
    json.dump(context, f, indent=2)
" 2>/dev/null

# Also save agent task tracker state
AGENT_TRACKER="/tmp/claude-agent-tasks.json"
if [ -f "$AGENT_TRACKER" ]; then
  python3 -c "
import json
with open('$SAVE_FILE') as f: ctx = json.load(f)
with open('$AGENT_TRACKER') as f: agents = json.load(f)
running = [a for a in agents if a.get('status') == 'running']
failed = [a for a in agents if a.get('status') == 'failed']
if running: ctx['running_agents'] = [{'desc': a['description'], 'files': a.get('targetFiles',[])} for a in running]
if failed: ctx['failed_agents'] = [{'desc': a['description'], 'files': a.get('targetFiles',[])} for a in failed]
with open('$SAVE_FILE', 'w') as f: json.dump(ctx, f, indent=2)
" 2>/dev/null
fi

hint "PRISM context snapshot saved to $SAVE_FILE for post-compact restoration." "PreCompact"
