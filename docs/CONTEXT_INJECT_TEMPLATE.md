# CONTEXT INJECT TEMPLATE v1.0
# Auto-generated context for rapid session resume
# Fill variables with actual values before injection

---

## QUICK RESUME

```
SESSION: {{SESSION_ID}}
STATUS:  {{SESSION_STATUS}}
DOING:   {{DOING_WHEN_STOPPED}}
NEXT:    {{NEXT_ACTION}}
```

---

## ROADMAP POSITION

```
TIER:    {{TIER_NUMBER}} - {{TIER_NAME}}
SESSION: {{SESSION_NUMBER}} - {{SESSION_NAME}}
STATUS:  {{SESSION_STATUS}}
PROGRESS: {{COMPLETED}}/{{TOTAL}} ({{PERCENTAGE}}%)
```

---

## IMMEDIATE CONTEXT

### Current Task
{{TASK_DESCRIPTION}}

### Progress
- Completed: {{COMPLETED_ITEMS}}
- Current: {{CURRENT_ITEM}}
- Next: {{NEXT_ITEM}}
- Blockers: {{BLOCKERS}}

### Recent Decisions
{{RECENT_DECISIONS}}

---

## LOAD ORDER

1. **CRITICAL** - State Files
   ```
   Desktop Commander:read_file "C:\PRISM\state\ROADMAP_TRACKER.json"
   Desktop Commander:read_file "C:\PRISM\state\CURRENT_STATE.json"
   ```

2. **HIGH** - Essential Skills
   {{SKILL_LOAD_COMMANDS}}

3. **MEDIUM** - Data Files (if needed)
   {{DATA_FILE_COMMANDS}}

---

## LKG (Last Known Good)

```
Checkpoint: {{LKG_CHECKPOINT_ID}}
Sequence:   {{LKG_SEQUENCE}}
Validated:  {{LKG_VALIDATED_AT}}
```

---

## CONTEXT PRESSURE

```
Level:     {{CONTEXT_PRESSURE}}
Estimated: {{ESTIMATED_TOKENS}} tokens
Available: {{AVAILABLE_TOKENS}} tokens
Action:    {{PRESSURE_ACTION}}
```

---

## SESSION ACTIONS

### If CONTINUATION (same session):
1. Continue from {{CURRENT_ITEM}}
2. No reload needed

### If RESUME_FRESH (new chat, state intact):
1. Load state files (step 1 above)
2. Load essential skills (step 2 above)
3. Continue from {{NEXT_ACTION}}

### If RESUME_COMPACTED (context was compacted):
1. Read transcript: `view "/mnt/transcripts/{{TRANSCRIPT_FILE}}"`
2. Run recovery: `prism_state_reconstruct`
3. Load state files
4. Continue from last checkpoint

### If RESUME_INTERRUPTED (crashed mid-task):
1. Check WIP: `py -3 wip_saver.py load {{TASK_ID}}`
2. Load state files
3. Resume from WIP or rollback to LKG

### If NEW_START (fresh session):
1. Run: `py -3 gsd_startup.py --json`
2. Follow roadmap: Session {{SESSION_NUMBER}}
3. Load recommended skills

---

## VERIFICATION CHECKLIST

Before starting work:
- [ ] State files loaded
- [ ] Quick resume understood
- [ ] Roadmap position confirmed
- [ ] Essential skills loaded
- [ ] No blockers active

---

## TEMPLATE VARIABLES

| Variable | Description | Source |
|----------|-------------|--------|
| SESSION_ID | Current session ID | CURRENT_STATE.currentSession.id |
| SESSION_STATUS | Session status | CURRENT_STATE.currentSession.status |
| DOING_WHEN_STOPPED | Last action | CURRENT_STATE.quickResume |
| NEXT_ACTION | Immediate next step | ROADMAP_TRACKER.quick_resume.next_action |
| TIER_NUMBER | Current tier | ROADMAP_TRACKER.current_tier |
| TIER_NAME | Tier name | ROADMAP_TRACKER.tiers[tier].name |
| SESSION_NUMBER | Session number | ROADMAP_TRACKER.current_session |
| SESSION_NAME | Session name | ROADMAP_TRACKER.current_session_name |
| COMPLETED | Items done | CURRENT_STATE.progress.completed |
| TOTAL | Total items | CURRENT_STATE.progress.total |
| PERCENTAGE | Completion % | Calculated |
| TASK_DESCRIPTION | What we're doing | ROADMAP_TRACKER.sessions[session].deliverables |
| COMPLETED_ITEMS | Done items list | CURRENT_STATE.completedItems |
| CURRENT_ITEM | Working on | CURRENT_STATE.progress.currentItem |
| NEXT_ITEM | Coming next | CURRENT_STATE.progress.nextItem |
| BLOCKERS | What's blocking | CURRENT_STATE.blockers |
| RECENT_DECISIONS | Key decisions | CURRENT_STATE.decisions (last 3) |
| SKILL_LOAD_COMMANDS | Skill load cmds | Generated from skills list |
| DATA_FILE_COMMANDS | Data load cmds | Generated from data files list |
| LKG_CHECKPOINT_ID | Last good checkpoint | checkpoint_index.last_checkpoint_id |
| LKG_SEQUENCE | Checkpoint sequence | checkpoint.sequence |
| LKG_VALIDATED_AT | When validated | checkpoint.timestamp |
| CONTEXT_PRESSURE | Pressure level | Calculated from token usage |
| ESTIMATED_TOKENS | Tokens needed | Calculated |
| AVAILABLE_TOKENS | Tokens free | Context limit - used |
| PRESSURE_ACTION | What to do | Based on pressure level |
| TRANSCRIPT_FILE | Latest transcript | From /mnt/transcripts/ |
| TASK_ID | Current task ID | CURRENT_STATE.currentTask.id |

---

**Version:** 1.0.0
**Purpose:** Template for rapid context injection at session start
**Usage:** Filled by skill_preloader.py or resume_validator.py
