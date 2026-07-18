## SESSION END — 3 mandatory calls + checklist

### Step 1: Save State
```
prism_session action=state_save
```
Persists session number, current task, progress, quality gates, recent decisions.

### Step 2: Log Work
```
prism_doc action=append name=ACTION_TRACKER.md
```
Content: what was completed, what's pending, files modified, known issues.

### Step 3: Final Anchor
```
prism_context action=todo_update
```
Update with final status for next session's boot to read.

### After Build — Phase Checklist (MANDATORY)
If a build was done this session, verify synchronization:
1. Skills: Any new skills registered? Skill content updated?
2. Hooks: Hook count ≥ previous? New hooks registered?
3. GSD: gsd_sync ran? Section files current? (auto-fires on build success)
4. Memories: Claude memory entries reflect current state?
5. Orchestrators: Agent/swarm configs updated?
6. State: CURRENT_STATE.json reflects latest?
7. Scripts: New scripts registered in ScriptRegistry?

### Auto-Fire at End (zero cost)
- graceful_shutdown.py: Captures WIP, clean termination
- on-session-end hook chain: Final state persistence
- autoCompactionSurvival: Emergency save if high pressure

### What to Include in ACTION_TRACKER
Good: "✅ Fixed computationCache import in autoHookWrapper.ts (line 22, added import)"
Bad: "Fixed some stuff"
Always: completed items, pending items, files changed with line counts, blocking issues.

## Changelog
- 2026-02-10: v3.0 — Content-optimized. Phase checklist details. ACTION_TRACKER guidance.
- 2026-02-10: v2.0 — File-based. Added end auto-fire details.
