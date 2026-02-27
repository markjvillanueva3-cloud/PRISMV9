---
name: prism-session-handoff
description: |
  Session transition and handoff protocols. Quick resume preparation.
---

**Time Savings: 50% session overhead reduction (up from 30%)**

> **MIT Foundation:** 6.033 (Systems), 16.400 (Human Factors - Info Priority)

## 🚀 5-SECOND RESUME (NEW v2.0)

### The Principle
**Any new chat should understand context in 5 seconds.** Not 5 minutes reading logs.

### 5-Second Resume Format
```markdown
═══════════════════════════════════════════════════════════════════════════
5-SECOND RESUME
═══════════════════════════════════════════════════════════════════════════
DOING:   [One-line: What we were doing]
STOPPED: [One-line: Where we stopped]
NEXT:    [One-line: What to do immediately]
═══════════════════════════════════════════════════════════════════════════
```

### Examples

**Materials Work:**
```
DOING:   Creating carbon steels P-CS-031 to P-CS-040 with 127-param schema
STOPPED: After P-CS-035 (AISI 1040 Hot Rolled) - file has 5 materials
NEXT:    Append P-CS-036 (AISI 1040 Cold Drawn) to carbon_steels_031_040.js
```

**Extraction Work:**
```
DOING:   Extracting PRISM_MATERIALS_MASTER from monolith (lines 45000-52000)
STOPPED: At line 48500 - completed getMaterial() function
NEXT:    Continue with updateMaterial() function at line 48501
```

**Skill Enhancement:**
```
DOING:   Enhancing skills for context continuity (SKL-02 through SKL-06)
STOPPED: After completing SKL-02 (prism-state-manager enhanced)
NEXT:    Start SKL-03 - enhance prism-session-handoff
```

## 📝 SESSION ESSENCE FORMAT (NEW v2.0)

### What It Is
A compressed, machine-readable session summary that captures critical context in <20 lines.

### Session Essence Template
```markdown
═══════════════════════════════════════════════════════════════════════════
SESSION ESSENCE: [SESSION_ID]
═══════════════════════════════════════════════════════════════════════════

MISSION: [1-line mission statement]
OUTCOME: [COMPLETE | PARTIAL | BLOCKED] - [1-line summary]

CREATED:
  - [file1.js] (XX KB, X items)
  - [file2.js] (XX KB, X items)

KEY DECISIONS:
  - [Decision 1]: [Why]
  - [Decision 2]: [Why]

GOTCHAS:
  - [Issue 1]: [Resolution]
  - [Issue 2]: [Resolution]

PATTERN USED: [workflow pattern]
SKILLS USED: [list of skills]

HANDOFF:
  NEXT_SESSION: [ID]
  NEXT_MISSION: [1-line]
  FIRST_ACTION: [Specific action]
  
═══════════════════════════════════════════════════════════════════════════
```

### Example Session Essence
```markdown
═══════════════════════════════════════════════════════════════════════════
SESSION ESSENCE: MAT-003
═══════════════════════════════════════════════════════════════════════════

MISSION: Create carbon steels P-CS-021 to P-CS-030 with 127-param schema
OUTCOME: COMPLETE - 10 materials created, 60KB file verified

CREATED:
  - carbon_steels_021_030.js (60KB, 10 materials)

KEY DECISIONS:
  - Used chunked write (append mode): Single write truncated >50KB
  - Compact JSON format: Reduced file size by 40%

GOTCHAS:
  - Filesystem:write_file truncates at ~50KB: Use Desktop Commander append
  - Johnson-Cook params: Source from ALGORITHM_REGISTRY not material lookup

PATTERN USED: template → modify → validate → chunk-write → verify
SKILLS USED: prism-material-templates, prism-validator, prism-large-file-writer

HANDOFF:
  NEXT_SESSION: MAT-004
  NEXT_MISSION: Create carbon steels P-CS-031 to P-CS-040
  FIRST_ACTION: Filesystem:write_file header for carbon_steels_031_040.js
  
═══════════════════════════════════════════════════════════════════════════
```

## CHECKPOINT TEMPLATE

### Micro-Checkpoint (Every 5-10 ops)
```javascript
// Just update progress counter - fast
Desktop Commander:edit_block({
  file_path: "C:\\...\\CURRENT_STATE.json",
  old_string: '"completed": 3',
  new_string: '"completed": 4'
})
// NO announcement needed
```

### Standard Checkpoint (Yellow zone)
```markdown
✓ CHECKPOINT: [what completed]
  Files: [list]
  Next: [immediate action]
```

### Full Checkpoint (Orange/Red zone)
```markdown
═══════════════════════════════════════════════════════════════════════════
🔶 CHECKPOINT - SAVING ALL PROGRESS
═══════════════════════════════════════════════════════════════════════════
DONE:  [list completed items]
SAVED: [files with sizes]
NEXT:  [exact next action]
STATE: CURRENT_STATE.json updated ✓
═══════════════════════════════════════════════════════════════════════════
```

## RECOVERY TEMPLATES

### After Compaction (Priority-Ranked)
```javascript
// TIER 1: Always do this (10 sec)
Filesystem:read_file("C:\\...\\CURRENT_STATE.json")
// Check: quickResume, currentTask

// TIER 2: If currentTask exists (30 sec)
// Read last 20 lines of targetFile
Desktop Commander:read_file({ path: targetFile, offset: -20 })

// TIER 3: If still unclear (2 min)
// Read latest session log
Filesystem:read_file("C:\\...\\SESSION_LOGS\\SESSION_[latest]_LOG.md")

// TIER 4: After major gap (1 min)
// Read context DNA
Filesystem:read_file("C:\\...\\CONTEXT_DNA\\[latest].json")
```

### After New Chat
```markdown
## NEW CHAT QUICK START

1. ⚡ Read `quickResume` from CURRENT_STATE.json
2. 📋 Check if `currentTask` is IN_PROGRESS
3. 🎯 Either RESUME task or START nextSession
4. 🚀 Begin working (don't waste time on verbose announcements)
```

## HANDOFF COMMUNICATION

### For Same User (Next Session)
Use 5-Second Resume format (see above)

### For Different Context (Cross-Reference)
Use Session Essence format (see above)

### Status Report (User Request)
```markdown
## PRISM STATUS

**Progress:** ${completed}/${total} (${percentage}%)
**Phase:** ${phase}
**Last:** ${lastSession.name} - ${lastSession.status}
**Next:** ${nextSession.name}

**Recent:**
- ${accomplishment1}
- ${accomplishment2}

**Blockers:** ${blockers || "None"}
```

## INTEGRATION

| Skill | Role |
|-------|------|
| `prism-state-manager` | Handles state file updates |
| `prism-context-dna` | Generates session fingerprints |
| `prism-context-pressure` | Triggers checkpoints |
| `prism-quick-start` | Ultra-minimal startup |
| `prism-task-continuity` | Anti-restart logic |

---

## VERSION HISTORY

| Ver | Date | Changes |
|-----|------|---------|
| **2.0** | 2026-01-23 | 5-second resume, essence format, priority reading |
| 1.0 | 2026-01-22 | Initial templates |
