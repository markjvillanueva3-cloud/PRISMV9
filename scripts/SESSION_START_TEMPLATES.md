# PRISM Quick Start Template
# Copy/paste this to begin any new Claude session
# Total: ~100 tokens instead of 5000+

---

## Minimal Start (50 tokens)
```
Read CURRENT_STATE.json at C:\Users\wompu\Box\PRISM REBUILD\
Continue from last session. What's next?
```

## Standard Start (100 tokens)
```
PRISM Session Start:
1. Read: C:\Users\wompu\Box\PRISM REBUILD\CURRENT_STATE.json
2. Read: C:\Users\wompu\Box\PRISM REBUILD\_PROJECT_FILES\01_CORE_RULES.md
3. Continue session [X.X.X] - Focus: [SPECIFIC TASK]
```

## Detailed Start (150 tokens)
```
PRISM v9.0 Rebuild - Session [ID]

State: C:\Users\wompu\Box\PRISM REBUILD\CURRENT_STATE.json
Rules: C:\Users\wompu\Box\PRISM REBUILD\_PROJECT_FILES\01_CORE_RULES.md

Task: [Describe specific task]
Output: [Where to save files]

Begin.
```

---

## Task-Specific Templates

### Extraction Task
```
PRISM Extraction:
State: CURRENT_STATE.json
Extract: [MODULE_NAME] from monolith lines [START]-[END]
Output: EXTRACTED/[category]/[filename].js
Verify consumers wired.
```

### Code Review Task
```
PRISM Review:
File: [path to file]
Check: All databases utilized, no partial implementations
Report issues only.
```

### Documentation Task
```
PRISM Docs:
Update: [file to update]
Add: [what to document]
Keep existing content.
```

---

## Session End Template
```
End session. Update CURRENT_STATE.json with:
- Completed: [list]
- Files created: [list]
- Next: [what's next]
```
