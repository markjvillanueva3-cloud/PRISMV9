# CTX-RESUME: Quick Resume Protocol Hooks
# Ensures new sessions are productive in <5 seconds

---

## CTX-RESUME-001: Session Start Context Injection

**Trigger Conditions:**
- New chat/session started
- First message from user
- After compaction recovery
- gsd_startup.py runs

**Actions:**
1. Call `prism_context_inject` with STANDARD level
2. Parse quick resume text
3. Identify immediate actions
4. Load recommended skills
5. Begin work immediately

**Implementation:**
```python
# At session start - AUTOMATIC
from resume_mcp import ResumeMCP

mcp = ResumeMCP()
result = mcp.call("prism_context_inject", {
    "format": "TEXT",
    "max_tokens": 2000,
    "include_roadmap": True,
    "include_skills": True
})

if result["success"]:
    # Context is ready - start working
    print(result["context"])
```

**Context Levels:**
- MINIMAL: Just quick resume text (~200 tokens)
- STANDARD: State + roadmap + skills (~1000 tokens)
- FULL: All context including WIP (~3000 tokens)
- DEEP: Full + historical context (~5000 tokens)

**Target Time:** <5 seconds from session start to productive work

---

## CTX-RESUME-002: Scenario Detection and Adaptation

**Trigger Conditions:**
- Session start
- Context recovery needed
- Manual resume request

**Scenarios:**
| Scenario | Detection | Response |
|----------|-----------|----------|
| CONTINUATION | State <5min old | Continue immediately |
| RESUME_FRESH | Valid state, new chat | Load standard context |
| RESUME_COMPACTED | Transcript exists | Read transcript first |
| RESUME_INTERRUPTED | WIP files exist | Check WIP, maybe rollback |
| NEW_START | No valid state | Initialize fresh |

**Implementation:**
```python
from resume_validator import ResumeValidator

validator = ResumeValidator()
scenario, confidence, reasons = validator.detect_scenario()

if scenario == ResumeScenario.CONTINUATION:
    # Continue without reload
    pass
elif scenario == ResumeScenario.RESUME_COMPACTED:
    # Read transcript first
    transcript = validator._check_transcripts()
    # view transcript
elif scenario == ResumeScenario.RESUME_INTERRUPTED:
    # Check WIP and possibly rollback
    wip_files = validator._check_wip()
    # Process WIP files
else:
    # Standard resume
    context = validator.generate_resume_context()
```

**Confidence Thresholds:**
- ≥0.9: High confidence, proceed automatically
- 0.7-0.9: Medium confidence, verify with user if unclear
- <0.7: Low confidence, prompt for clarification

---

## CTX-RESUME-003: Skill Preloading Optimization

**Trigger Conditions:**
- Session start
- Task switch
- Manual skill request

**Actions:**
1. Detect current task from roadmap
2. Match skills to task keywords
3. Prioritize by usage frequency
4. Load within token budget
5. Record usage for learning

**Implementation:**
```python
from skill_preloader import SkillPreloader

preloader = SkillPreloader()

# Auto-detect from state
skills, source = preloader.select_auto(max_skills=5)

# Or manual task-based selection
skills = preloader.select_for_task("Build MCP tools", max_skills=5)

# Generate load commands
commands = preloader.generate_load_commands(skills)
for cmd in commands:
    print(f"{cmd['step']}. [{cmd['priority']}] {cmd['skill']}")
    print(f"   {cmd['command']}")

# Record usage for future optimization
preloader.record_usage([s.name for s in skills])
```

**Skill Priority:**
1. CRITICAL: Always load (prism-quick-start, prism-session-master)
2. HIGH: Load early if space
3. MEDIUM: Load if token budget allows
4. LOW: Load on demand only

**Token Budget:**
- Default: 10,000 tokens for skills
- Adjust based on context pressure
- Defer LOW priority if over budget

---

## CTX-RESUME-004: LKG (Last Known Good) Management

**Trigger Conditions:**
- After successful task completion
- Periodic (every 100 events)
- Before risky operations
- Manual mark request

**Actions:**
1. Validate current state
2. Mark as LKG if valid
3. Update LKG history
4. Use for recovery if needed

**Implementation:**
```python
from lkg_tracker import LKGTracker

tracker = LKGTracker()

# Validate current state
validation = tracker.validate_state()
if validation["valid"]:
    # Mark as LKG
    result = tracker.mark_lkg(reason="Task completed successfully")
    print(f"Marked LKG: {result['lkg_id']}")

# Auto-mark (only if state is clean)
result = tracker.auto_mark_if_valid()

# Restore to LKG on failure
if state_corrupted:
    tracker.restore_lkg(reason="State corruption detected")
```

**Validation Criteria:**
- Required fields present (version, lastUpdated, currentSession)
- No corruption markers
- Valid timestamps
- Meaningful quickResume

**Recovery Chain:**
1. Try current state
2. If invalid → restore to LKG
3. If no LKG → rebuild from checkpoint
4. If no checkpoint → rebuild from events
5. If no events → initialize fresh

---

## Quick Reference

### MCP Tools

| Tool | Purpose |
|------|---------|
| prism_session_resume | Generate quick resume context |
| prism_context_inject | Inject context for rapid startup |

### CLI Commands

```bash
# Resume validation
py -3 resume_validator.py detect              # Detect scenario
py -3 resume_validator.py validate            # Validate state
py -3 resume_validator.py generate --level STANDARD
py -3 resume_validator.py actions             # Get action list

# Skill preloading
py -3 skill_preloader.py --auto               # Auto-select skills
py -3 skill_preloader.py --task "Build MCP"   # Task-based selection
py -3 skill_preloader.py --session 0.3        # Session-based

# LKG tracking
py -3 lkg_tracker.py mark                     # Mark current as LKG
py -3 lkg_tracker.py validate                 # Validate current state
py -3 lkg_tracker.py restore                  # Restore to LKG
py -3 lkg_tracker.py compare                  # Compare with current
```

### Session Start Protocol

```
1. Read ROADMAP_TRACKER.json    (CRITICAL - always first)
2. Read CURRENT_STATE.json      (CRITICAL - always second)
3. Detect scenario              (resume_validator.py detect)
4. Load recommended skills      (skill_preloader.py --auto)
5. Begin work                   (follow roadmap.quick_resume.next_action)
```

### Integration with gsd_startup.py

```python
# In gsd_startup.py v4.0+
from resume_validator import ResumeValidator
from skill_preloader import SkillPreloader

# Step 1: Detect scenario
validator = ResumeValidator()
validation = validator.validate()

# Step 2: Get skills
preloader = SkillPreloader()
skills, _ = preloader.select_auto()

# Step 3: Generate context
context = validator.generate_resume_context()

# Step 4: Output for Claude
print(context["quickResume"]["oneLiner"])
print(f"NEXT: {context['quickResume']['next']}")
```

---

## Success Criteria

✓ Session productive in <5 seconds
✓ Correct scenario detected automatically
✓ Relevant skills preloaded
✓ LKG available for recovery
✓ Context level appropriate to situation
✓ No manual intervention needed for standard resume

---

**Version:** 1.0.0
**Created:** 2026-02-01
**Hook IDs:** CTX-RESUME-001, CTX-RESUME-002, CTX-RESUME-003, CTX-RESUME-004
