# PROJECT KNOWLEDGE UPDATE PACKAGE
## Files to Upload to Claude Project
### Created: 2026-01-25 | Replaces v3.0 files with v7.0

---

## WHAT TO DO

The files in `/mnt/project/` are READ-ONLY from Claude's perspective. To update them:

1. **Go to Claude Project Settings**
2. **Replace** these files with the updated versions below
3. **Verify** the updates took effect by asking Claude to read them

---

## FILE 1: 00_CONDENSED_PROTOCOL.md (Replace Existing)

**Current version**: v3.0 (outdated)
**New version**: v7.0 (matches _PRISM_MASTER)

```markdown
# PRISM CONDENSED PROTOCOL v7.0
## Quick Reference - Single Source of Truth
### Updated: 2026-01-25 | WITH ENFORCEMENT

---

## ⛔ MANDATORY SESSION START (Cannot Skip)

```
1. READ:  Filesystem:read_file → C:\PRISM REBUILD...\CURRENT_STATE.json
2. QUOTE: quickResume field out loud (proves you read it)
3. CHECK: currentTask.status
   • "IN_PROGRESS" → RESUME from checkpoint (NO restart!)
   • "COMPLETE" → May start new task
4. LOAD:  Relevant skill from _PRISM_MASTER\SKILLS\
5. WORK:  Begin task
```

**ENFORCEMENT**: Skipping step 1-3 is a PROTOCOL VIOLATION.

---

## 📍 PATHS (SINGLE SOURCE OF TRUTH)

```
MASTER:     C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\_PRISM_MASTER\
STATE:      C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\CURRENT_STATE.json
SKILLS:     _PRISM_MASTER\SKILLS\ (manifest + critical combined)
SCRIPTS:    _PRISM_MASTER\SCRIPTS\ (organized by function)
AGENTS:     _PRISM_MASTER\AGENTS\AGENT_MANIFEST.json
MONOLITH:   _BUILD\PRISM_v8_89_002_TRUE_100_PERCENT\ (986,621 lines)
EXTRACTED:  EXTRACTED\
```

**⚠️ NEVER save to /home/claude/ - RESETS EVERY SESSION**

---

## 🛠️ TOOL REFERENCE

| Task | Tool | Key Params |
|------|------|------------|
| Read file | `Filesystem:read_file` | path |
| Write file | `Filesystem:write_file` | path, content |
| List dir | `Filesystem:list_directory` | path |
| Large file | `Desktop Commander:read_file` | path, offset, length |
| Append | `Desktop Commander:write_file` | mode:"append" |
| Search | `Desktop Commander:start_search` | searchType:"content" |
| Run script | `Desktop Commander:start_process` | command, timeout_ms |

---

## 🛡️ BUFFER ZONES

| Zone | Tool Calls | Action |
|------|------------|--------|
| 🟢 GREEN | 0-8 | Work freely |
| 🟡 YELLOW | 9-14 | Plan checkpoint |
| 🟠 ORANGE | 15-18 | CHECKPOINT NOW |
| 🔴 RED | 19+ | EMERGENCY STOP |

---

## ⚡ THE 4 LAWS (Always Active)

1. **LIFE-SAFETY**: "Would I trust this with my own safety?"
2. **COMPLETENESS**: "Is every field populated? Every case handled?"
3. **ANTI-REGRESSION**: "Is new version as complete as old?"
4. **PREDICTIVE**: "What are 3 ways this fails?"

---

## 📋 THE 10 COMMANDMENTS

1. USE EVERYWHERE - 100% DB/engine utilization
2. FUSE - Cross-domain concepts
3. VERIFY - Physics + empirical + historical (min 3)
4. LEARN - Every interaction → ML pipeline
5. UNCERTAINTY - Confidence intervals on ALL values
6. EXPLAIN - XAI for all recommendations
7. GRACEFUL - Fallbacks for every failure
8. PROTECT - Validate, sanitize, backup
9. PERFORM - <2s load, <500ms calc
10. USER-OBSESS - 3-click rule

---

## 🚀 API SWARM COMMANDS

```powershell
python prism_unified_system_v4.py --intelligent "task"
python prism_unified_system_v4.py --manufacturing "material" "operation"
python prism_unified_system_v4.py --ralph role "prompt" iterations
python prism_unified_system_v4.py --list
```

56 AGENTS: 15 OPUS | 32 SONNET | 9 HAIKU

---

## 🎯 37 SKILLS BY CATEGORY

**ALWAYS-ON (5)**: life-safety | completeness | regression | predictive | orchestrator
**WORKFLOW (8)**: brainstorm | planning | execution | review-spec | review-quality | debugging | verification | handoff
**MONOLITH (4)**: index | extractor | navigator | codebase-packaging
**MATERIALS (5)**: schema | physics | lookup | validator | enhancer
**MASTERS (7)**: session | quality | code | knowledge | expert | controller | dev-utils
**QUALITY (2)**: tdd-enhanced | root-cause-tracing
**REFS (10)**: api-contracts | error-catalog | mfg-tables | wiring | calculators | post-processor | fanuc | siemens | heidenhain | gcode

---

## ❌ HARD STOPS (Never Do These)

- ❌ Work without reading state first
- ❌ Restart IN_PROGRESS task (MUST resume)
- ❌ Skip checkpoint at orange/red zone
- ❌ Save to /home/claude/
- ❌ Module without 6+ consumers
- ❌ Calculation with <6 data sources
- ❌ Replacement without regression audit

---

## 📊 SYSTEM STATUS

- Materials: 1,512 @ 127 parameters (143% of target)
- Monolith: 986,621 lines | 831 modules
- Skills: 37 active | Agents: 56 ready
- Status: System audit COMPLETE, consolidated to _PRISM_MASTER
```

---

## FILE 2: 07_REFERENCE_PATHS.md (Replace or Update)

```markdown
# PRISM REFERENCE PATHS v7.0
## Single Source of Truth
### Updated: 2026-01-25

---

## PRIMARY LOCATION

**ALL PRISM resources are now in:**
```
C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\_PRISM_MASTER\
```

---

## DIRECTORY STRUCTURE

```
_PRISM_MASTER/
├── PROTOCOL/           ← Session & workflow protocols
│   ├── 00_SESSION_START.md      ← READ FIRST EVERY SESSION
│   ├── 01_ALWAYS_ON_LAWS.md     ← 4 immutable laws
│   ├── 02_CONDENSED_PROTOCOL_v7.md
│   └── 03_RESTART_PREVENTION.md
│
├── SKILLS/             ← Skill definitions
│   ├── SKILL_MANIFEST.json      ← All 37 skills
│   └── CRITICAL_SKILLS_COMBINED.md  ← Essential content
│
├── SCRIPTS/            ← Python tools
│   ├── orchestrators/  ← API system
│   ├── generators/     ← Data generators
│   ├── validators/     ← Quality checking
│   └── utilities/      ← Helpers
│
├── AGENTS/             ← API agents
│   └── AGENT_MANIFEST.json  ← All 56 agents
│
├── DOCS/               ← Documentation
│   └── QUICK_REFERENCE.md
│
├── STATE/              ← State backups
├── LEARNING/           ← ML pipeline
└── INDEX.md            ← Directory guide
```

---

## KEY FILE PATHS

| Purpose | Path |
|---------|------|
| Session State | `C:\PRISM REBUILD...\CURRENT_STATE.json` |
| Session Protocol | `_PRISM_MASTER\PROTOCOL\00_SESSION_START.md` |
| Quick Reference | `_PRISM_MASTER\DOCS\QUICK_REFERENCE.md` |
| Skill Manifest | `_PRISM_MASTER\SKILLS\SKILL_MANIFEST.json` |
| Agent Manifest | `_PRISM_MASTER\AGENTS\AGENT_MANIFEST.json` |
| API Orchestrator | `_PRISM_MASTER\SCRIPTS\orchestrators\prism_unified_system_v4.py` |
| Session Enforcer | `_PRISM_MASTER\SCRIPTS\utilities\session_enforcer.py` |

---

## LEGACY LOCATIONS (Reference Only)

| Location | Status |
|----------|--------|
| `_SKILLS/` | Full skill content (still valid) |
| `_SCRIPTS/` | All scripts (not all copied to _PRISM_MASTER) |
| `_DOCS/` | Additional documentation |

**Use _PRISM_MASTER for new work. Legacy for full skill/script content.**
```

---

## UPLOAD INSTRUCTIONS

1. Go to your Claude Project
2. Edit project knowledge
3. Delete or replace `00_CONDENSED_PROTOCOL.md` with v7.0 above
4. Delete or replace `07_REFERENCE_PATHS.md` with v7.0 above
5. Save changes
6. Test by starting new chat and asking Claude to read the protocol

---

## VERIFICATION

After uploading, ask Claude:
> "What version is the condensed protocol?"

Claude should respond: **"v7.0"**

If it says v3.0, the upload didn't work - try again.
