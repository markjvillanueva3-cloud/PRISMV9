---
name: prism-planning
description: |
  General planning utilities and templates.
---

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
