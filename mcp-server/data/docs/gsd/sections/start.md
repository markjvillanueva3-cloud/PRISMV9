## SESSION START — 2 mandatory calls

### Step 1: Boot
```
prism_dev action=session_boot
```
Returns: session number, quick_resume, warm_start data, recent errors, roadmap status.
Auto-fires (zero cost): autoPreTaskRecon, autoWarmStartData, autoKnowledgeCrossQuery, autoScriptRecommend, autoContextRehydrate.

### Step 2: Anchor Attention
```
prism_context action=todo_update
```
Loads current task, focus, progress, blocking issues, quality gates.
Sets attention anchor for Manus Law 4 (recency = highest weight).

### After Boot — Decision Flow
IF quick_resume says "COMPACTION_RECOVERY" → follow recovery instructions immediately
IF recent_errors has patterns → address before starting new work
IF roadmap_next has items → use as starting point
IF todo has CURRENT step → continue from there
ELSE → ask user what to work on

### Compaction Recovery (automatic)
If >300s since last call, system detects compaction:
1. COMPACTION_SURVIVAL.json auto-loaded during boot
2. Next 3 responses include _COMPACTION_RECOVERY
3. Follow instruction field — don't ask user
4. If unclear: prism_gsd→quick_resume → prism_context→todo_read → continue

### What NOT to Do at Start
- Don't call prism_gsd→core (too large, wastes context)
- Don't read full GSD_v20.md (700+ lines, unnecessary)
- Don't call multiple state-loading tools (boot does it all)
- Don't ask user "what should I do?" if todo/resume exists

## Changelog
- 2026-02-10: v3.0 — Content-optimized. Decision flow after boot. Anti-patterns.
- 2026-02-10: v2.0 — File-based. Added boot auto-fire details.
