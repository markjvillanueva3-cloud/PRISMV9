---
name: prism-planning
description: |
  PRISM session planning and brainstorming skill. Adapted from obra/superpowers for
  manufacturing intelligence development. Use when: starting new extraction sessions,
  planning batch operations, designing module architecture, or making major decisions.
  Enforces structured planning BEFORE any implementation. Triggers: starting new
  session, planning extraction, designing architecture, batch operations, major decisions.
---

# PRISM PLANNING SKILL v1.0
## Structured Planning Before Implementation
### Adapted from obra/superpowers for manufacturing intelligence

---

## CORE PRINCIPLE

**NEVER START CODING WITHOUT A PLAN.**

Every PRISM session should have:
1. Clear objectives (what we're building)
2. Defined scope (what's included/excluded)
3. Success criteria (how we know it's done)
4. Risk assessment (what could go wrong)
5. Rollback plan (how to recover)

---

## 🧠 BRAINSTORMING PROTOCOL

### When to Use
- Starting a new extraction session
- Designing a new module or database
- Making architectural decisions
- Changing existing patterns

### Brainstorm Structure

```markdown
## 🎯 OBJECTIVE
What are we trying to accomplish?

## 📋 REQUIREMENTS
- [ ] Requirement 1
- [ ] Requirement 2
- [ ] Requirement 3

## 🔄 OPTIONS CONSIDERED
| Option | Pros | Cons | Risk |
|--------|------|------|------|
| A      |      |      |      |
| B      |      |      |      |
| C      |      |      |      |

## ✅ SELECTED APPROACH
Which option and why?

## ⚠️ RISKS & MITIGATIONS
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
|      |             |        |            |

## 📊 SUCCESS CRITERIA
- [ ] Criterion 1 (measurable)
- [ ] Criterion 2 (measurable)

## 🔙 ROLLBACK PLAN
If things go wrong, how do we recover?
```

---

## 📝 WRITE-PLAN PROTOCOL

### Session Plan Template

```markdown
# SESSION [ID] PLAN
**Date:** [DATE]
**Duration:** Estimated [X] exchanges
**Status:** PLANNING → IN_PROGRESS → COMPLETE

## 1. OBJECTIVES
Primary: [main goal]
Secondary: [supporting goals]

## 2. SCOPE
### IN SCOPE
- Item 1
- Item 2

### OUT OF SCOPE
- Item A (will do in session Y)
- Item B (not needed)

## 3. TASKS (ordered)
| # | Task | Est. Tool Calls | Dependencies | Checkpoint? |
|---|------|-----------------|--------------|-------------|
| 1 | Read state | 1 | None | No |
| 2 | [Task] | 3 | Task 1 | Yes |
| 3 | [Task] | 5 | Task 2 | Yes |

## 4. CHECKPOINTS
- After Task 2: Save intermediate progress
- After Task 4: Update CURRENT_STATE.json
- At RED ZONE: Stop and save

## 5. SUCCESS CRITERIA
- [ ] [Specific, measurable outcome 1]
- [ ] [Specific, measurable outcome 2]
- [ ] State file updated
- [ ] Session log written

## 6. RISK MITIGATION
- Context compaction: Use chunked writes, frequent saves
- File corruption: Verify after each write
- Tool failure: Have fallback commands ready
```

---

## ▶️ EXECUTE-PLAN PROTOCOL

### Execution Rules

1. **Work through tasks in ORDER**
   - Don't skip ahead
   - Don't start Task N+1 until Task N passes verification

2. **Checkpoint at every marked task**
   - Update CURRENT_STATE.json
   - Verify files saved
   - Announce progress

3. **Handle deviations**
   - If task takes longer than estimated: Update plan
   - If blocker found: Document, decide to proceed or stop
   - If better approach discovered: Complete current task, then reassess

### Execution Checklist

```
☐ Plan approved by user?
☐ State file read?
☐ Starting from correct checkpoint?

FOR EACH TASK:
  ☐ Announce: "Starting Task [N]: [description]"
  ☐ Execute task
  ☐ Verify result
  ☐ If checkpoint: Save state
  ☐ Announce: "✓ Task [N] complete"

AT SESSION END:
  ☐ All tasks complete OR graceful stop?
  ☐ State file updated?
  ☐ Session log written?
  ☐ Next session planned?
```

---

## 🔄 RETROSPECTIVE PROTOCOL

### At Session End

```markdown
## SESSION [ID] RETROSPECTIVE

### ✅ WHAT WENT WELL
- [Success 1]
- [Success 2]

### ⚠️ WHAT COULD IMPROVE
- [Issue 1] → [Improvement]
- [Issue 2] → [Improvement]

### 📊 METRICS
- Tasks planned: [N]
- Tasks completed: [M]
- Tool calls used: [X]
- Files created: [Y]
- Time estimate accuracy: [%]

### 💡 LEARNINGS
- [Learning 1] → Add to skills?
- [Learning 2] → Update protocol?

### ➡️ NEXT SESSION
- ID: [NEXT_ID]
- Focus: [description]
- Carryover: [anything unfinished]
```

---

## INTEGRATION WITH PRISM WORKFLOW

### Session Start
```
1. Read CURRENT_STATE.json
2. Check quickResume for continuation
3. If NEW session: Run BRAINSTORM
4. Create/review SESSION PLAN
5. Get user approval
6. Begin EXECUTE-PLAN
```

### Session End
```
1. Verify all checkpoints saved
2. Run RETROSPECTIVE
3. Update CURRENT_STATE.json with:
   - completedSessions entry
   - nextSession details
   - quickResume instructions
4. Write session log
```

---

## ANTI-PATTERNS (DON'T DO THIS)

❌ Starting extraction without reading state
❌ Making major changes without discussing options
❌ Working past RED ZONE without saving
❌ Skipping checkpoints to "save time"
❌ Not verifying files after writing
❌ Starting next task before current passes
❌ Ending session without retrospective

---

## PRISM-SPECIFIC PLANNING PATTERNS

### For Material Database Sessions
```
1. BRAINSTORM: Which materials? What parameters?
2. PLAN: 10 materials per file, checkpoint every 3
3. EXECUTE: Template → Customize → Validate → Save
4. RETROSPECTIVE: Coverage, accuracy, time per material
```

### For Module Extraction Sessions
```
1. BRAINSTORM: Which modules? Dependencies?
2. PLAN: Extract in dependency order
3. EXECUTE: Locate → Extract → Audit → Document
4. RETROSPECTIVE: Completeness, consumer count
```

### For Architecture Sessions
```
1. BRAINSTORM: Options, tradeoffs, 10 Commandments alignment
2. PLAN: Design document, review points
3. EXECUTE: Draft → Review → Refine → Document
4. RETROSPECTIVE: Decision quality, future flexibility
```

---

**END OF PRISM PLANNING SKILL**
