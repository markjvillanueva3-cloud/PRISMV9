# PRISM CONDENSED PROTOCOL v8.0
## Quick Reference Card | ENFORCEMENT ENABLED
### Updated: 2026-01-25

---

# 🔴 EVERY SESSION - DO THIS FIRST

```
STEP 1: READ STATE
        Filesystem:read_file → C:\PRISM REBUILD...\CURRENT_STATE.json

STEP 2: QUOTE quickResume field exactly

STEP 3: CHECK STATUS
        IN_PROGRESS → Resume from checkpoint
        COMPLETE → Start new task

STEP 4: DECOMPOSE into microsessions (MANDATORY)

STEP 5: WORK with predictive analysis
```

---

# ⚡ THE 6 ALWAYS-ON LAWS

| # | Law | Check |
|---|-----|-------|
| 1 | **LIFE-SAFETY** | Would I trust this with my own safety? |
| 2 | **MICROSESSIONS** | Is task decomposed into chunks? |
| 3 | **COMPLETENESS** | Every field populated? Every case handled? |
| 4 | **ANTI-REGRESSION** | New ≥ Old in completeness? |
| 5 | **PREDICTIVE** | What are 3 ways this fails? |
| 6 | **CONTINUITY** | State preserved across sessions? |

---

# 🛡️ BUFFER ZONES

| Zone | Calls | Action |
|------|-------|--------|
| 🟢 | 0-8 | Work freely |
| 🟡 | 9-14 | Say "Yellow zone", plan checkpoint |
| 🟠 | 15-18 | **CHECKPOINT NOW** |
| 🔴 | 19+ | **EMERGENCY STOP** |

---

# 📋 MICROSESSION STRUCTURE

```
MICROSESSION MS-XXX START
├── Scope: [What this chunk covers]
├── Items: [Count or range]
├── Target: [Deliverable]
└── Checkpoint: [When to save]

[WORK]

MICROSESSION MS-XXX COMPLETE ✅
├── Delivered: [What was done]
├── Next: MS-XXX+1 or TASK COMPLETE
```

---

# 🛠️ TOOLS QUICK REFERENCE

| Task | Tool |
|------|------|
| Read C: file | `Filesystem:read_file` |
| Write C: file | `Filesystem:write_file` |
| Large file read | `Desktop Commander:read_file` (offset/length) |
| Append to file | `Desktop Commander:write_file` mode:"append" |
| Search content | `Desktop Commander:start_search` |
| Run Python | `Desktop Commander:start_process` |

---

# 📍 KEY PATHS

```
STATE:    C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\CURRENT_STATE.json
MASTER:   C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\_PRISM_MASTER\
SKILLS:   C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\_SKILLS\
MONOLITH: C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\_BUILD\PRISM_v8_89_002_TRUE_100_PERCENT\
```

---

# ⛔ HARD RULES

```
❌ NO work without reading CURRENT_STATE.json
❌ NO task without microsession decomposition  
❌ NO exceeding 18 tool calls without checkpoint
❌ NO replacement without anti-regression audit
❌ NO bare numbers (always value ± uncertainty)
❌ NO restart of IN_PROGRESS tasks
```

---

# 📊 SYSTEM SUMMARY

```
SKILLS: 38 | AGENTS: 56 | MATERIALS: 1,512 @ 127 params
MONOLITH: 986,621 lines | 831 modules
AUTOMATION: Fully configured with enforcement gates
```
