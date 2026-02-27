# PRISM CLAUDE CODE STARTER
## Read this file at the start of EVERY Claude Code session

---

# 🎯 WHO YOU ARE

You are helping Mark rebuild PRISM Manufacturing Intelligence from v8.89 to v9.0.
- 986,621 line monolith → modern modular architecture
- Materials databases, machine specs, cutting tools, CAM algorithms
- Goal: 100% database utilization across all consumers

---

# 📍 KEY PATHS (Use These Exactly)

```
STATE FILE:     C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\CURRENT_STATE.json
MONOLITH:       C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\_BUILD\PRISM_v8_89_002_TRUE_100_PERCENT\
EXTRACTED:      C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\EXTRACTED\
SKILLS:         C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\_SKILLS\
SESSION LOGS:   C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\SESSION_LOGS\
```

---

# ⚡ THE 4 IRON LAWS (Never Violate)

1. **LIFE-SAFETY**: "Would I trust this with my own safety?" - Manufacturing controls machines that can kill
2. **COMPLETENESS**: "Is every field populated? Every case handled?" - No partial implementations
3. **ANTI-REGRESSION**: "Is the new version as complete as the old?" - Never lose data/features
4. **PREDICTIVE**: "What are 3 ways this fails?" - Think ahead

---

# 📋 THE 10 COMMANDMENTS

1. **USE EVERYWHERE** - If a database/engine exists, 100% of consumers must use it
2. **FUSE** - Cross-domain concepts (materials + physics + tooling)
3. **VERIFY** - Physics + empirical + historical validation
4. **LEARN** - Every interaction feeds ML pipeline
5. **UNCERTAINTY** - Always provide confidence intervals
6. **EXPLAIN** - XAI for all recommendations
7. **GRACEFUL** - Fallbacks for every failure mode
8. **PROTECT** - Validate, sanitize, backup
9. **PERFORM** - <2s load, <500ms calculations
10. **USER-OBSESS** - 3-click rule for any action

---

# 🔴 EVERY SESSION START - DO THIS

1. **READ**: `CURRENT_STATE.json` - Check what's in progress
2. **CHECK**: Is there an incomplete task? → Resume it, don't restart
3. **CONFIRM**: Tell Mark what you found and what you recommend

---

# 🟢 EVERY SESSION END - DO THIS

1. **UPDATE**: `CURRENT_STATE.json` with:
   - What was accomplished
   - What's next
   - Any blockers or decisions needed
2. **CONFIRM**: Tell Mark the state is saved

---

# 🛡️ ANTI-REGRESSION PROTOCOL

Before replacing/updating ANY file:
1. Count items in old version
2. Count items in new version
3. If new < old → STOP and justify every removal
4. List what was added/removed/changed

---

# 📊 SKILL FILES (Read When Needed)

Located in: `C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\_SKILLS\`

| Task | Read This Skill First |
|------|----------------------|
| Materials work | `prism-material-schema.md` |
| Extraction | `prism-monolith-extractor.md` |
| Code writing | `prism-code-master.md` |
| Debugging | `prism-sp-debugging.md` + `prism-root-cause-tracing.md` |
| Testing | `prism-tdd-enhanced.md` |
| Session management | `prism-session-master.md` |

---

# ⚠️ THINGS YOU CANNOT DO (vs Desktop App)

- ❌ Web search - Can't search internet
- ❌ Memory - Don't remember past sessions (that's why we use CURRENT_STATE.json)
- ❌ Google Drive - Can't access cloud files
- ✅ CAN: Read/write local files, run Python, run npm, use git, execute code

---

# 🎯 WORKFLOW SUMMARY

```
1. Read CURRENT_STATE.json
2. Resume or start task
3. Work (read skills as needed)
4. Checkpoint frequently
5. Update CURRENT_STATE.json before ending
```

---

# 💡 QUICK COMMANDS FOR MARK

Say these exact phrases when needed:

| Need | Say This |
|------|----------|
| Start session | "Read CLAUDE_CODE_START.md and CURRENT_STATE.json" |
| Check state | "What's in CURRENT_STATE.json?" |
| Read a skill | "Read the [skill-name] skill and apply it" |
| Checkpoint | "Update CURRENT_STATE.json with progress" |
| End session | "Save state and summarize what we did" |
| Emergency | "STOP. Read the anti-regression protocol." |

---

# 🚨 RED FLAGS - STOP IMMEDIATELY IF:

- About to delete/replace a file without counting items first
- New file is smaller than old file without explanation
- Skipping a database or engine that should be used
- Making assumptions without reading the actual data
- Task seems to duplicate already-completed work

---

# ✅ READY TO WORK

After reading this file and CURRENT_STATE.json, tell Mark:
1. Current task status (in progress / none)
2. Current phase (Stage 0/1/2/3)
3. Your recommendation for this session
