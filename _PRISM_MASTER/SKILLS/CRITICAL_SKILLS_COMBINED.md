# PRISM CRITICAL SKILLS COMBINED
## Essential Content from Always-On Skills
### Version 1.0 | 2026-01-25 | SINGLE FILE REFERENCE

---

# ⛔ THE 4 IMMUTABLE LAWS

These laws are ALWAYS ACTIVE. They cannot be disabled, overridden, or ignored.

---

## LAW 1: LIFE-SAFETY MINDSET

**Core Principle**: Manufacturing intelligence controls machines that can injure or kill.

### The Test
Before every action, ask: **"Would I trust this output with MY OWN physical safety?"**

### Implications
- Every incomplete task is a potential failure point
- Every placeholder could become an undetected gap
- Every shortcut could lead to material failure, tool breakage, or operator injury
- "Good enough" is NEVER acceptable

### Application
```
BEFORE: "The cutting parameters are approximately 300 m/min..."
AFTER:  "The cutting parameters are 300 m/min (±15 m/min, 95% confidence)
         based on Kienzle model, validated against Sandvik data,
         cross-referenced with Taylor equation predictions.
         SAFETY MARGIN: 20% reduction applied for first operation."
```

### Checklist
- [ ] All numerical values have uncertainty bounds
- [ ] Safety margins are explicitly documented
- [ ] Failure modes are identified and mitigated
- [ ] Data sources are verified (min 3 independent sources)
- [ ] Would I use this if MY safety depended on it?

---

## LAW 2: MAXIMUM COMPLETENESS

**Core Principle**: 100% theoretical, mathematical, and statistical completeness in ALL work.

### The Standard
- No partial implementations
- No "good enough" approximations
- No orphaned features
- No missing parameters

### For Materials Database
```
INCOMPLETE (REJECTED):
{
  "id": "AL_6061_T6",
  "hardness": 95,  // Missing units, uncertainty
  // Missing 120+ other parameters
}

COMPLETE (REQUIRED):
{
  "id": "AL_6061_T6",
  "hardness": {
    "brinell": { "value": 95, "uncertainty": 5, "unit": "HB", "source": "ASM" },
    "rockwellB": { "value": 60, "uncertainty": 2, "unit": "HRB", "source": "ASTM" },
    "vickers": { "value": 107, "uncertainty": 5, "unit": "HV", "source": "measured" }
  },
  // All 127 parameters populated with values, uncertainties, units, sources
}
```

### Checklist
- [ ] Every parameter has a value
- [ ] Every value has an uncertainty
- [ ] Every uncertainty has units
- [ ] Every entry has a source
- [ ] No placeholder comments ("TODO", "FIXME", "TBD")

---

## LAW 3: ANTI-REGRESSION

**Core Principle**: Every update/replacement must be as complete as what it replaces.

### The Protocol
1. **INVENTORY OLD**: Count everything (lines, params, features, consumers)
2. **INVENTORY NEW**: Count everything in replacement
3. **COMPARE**: If new < old, JUSTIFY every removed item
4. **VERIFY**: After replacement, verify nothing lost

### Size Heuristics
```
If new_size < old_size * 0.95:
    → REGRESSION WARNING: Potential content loss
    → MUST inventory what was removed
    → MUST justify each removal
    → User approval required before proceeding

If new_size > old_size * 1.2:
    → Verify no duplication introduced
    → Check for bloat
```

### Checklist
- [ ] Old version fully inventoried
- [ ] New version fully inventoried
- [ ] All differences documented
- [ ] Removals justified
- [ ] Regression checker script passed

---

## LAW 4: PREDICTIVE THINKING

**Core Principle**: Anticipate failures BEFORE they happen.

### The 3-Failure Question
Before any action, identify:
1. **Way it could fail #1**: [specific failure mode]
2. **Way it could fail #2**: [different failure mode]
3. **Way it could fail #3**: [edge case or unexpected failure]

### Application
```
TASK: Extract materials database from monolith

FAILURE 1: Incomplete extraction - missing nested dependencies
MITIGATION: dependency_analyzer agent, recursive extraction, count verification

FAILURE 2: Data corruption during parsing
MITIGATION: Validate JSON, compare checksums, backup before operation

FAILURE 3: Loss of cross-references to consumers
MITIGATION: Consumer mapping before extraction, wire verification after
```

### Checklist
- [ ] 3 failure modes identified
- [ ] Each has a mitigation strategy
- [ ] Fallback plan exists for total failure
- [ ] Recovery procedure documented

---

# 🔄 SESSION MANAGEMENT ESSENTIALS

## Session Start (MANDATORY)

```
1. READ:   Filesystem:read_file → CURRENT_STATE.json
2. QUOTE:  quickResume field (proves you read it)
3. CHECK:  currentTask.status
           • IN_PROGRESS → RESUME from checkpoint
           • COMPLETE → May start new task
4. LOAD:   Relevant skill from SKILL_MANIFEST.json
5. WORK:   Begin task
```

## Buffer Zones

| Zone | Tool Calls | Action |
|------|------------|--------|
| 🟢 GREEN | 0-8 | Work freely |
| 🟡 YELLOW | 9-14 | Plan checkpoint |
| 🟠 ORANGE | 15-18 | CHECKPOINT NOW |
| 🔴 RED | 19+ | EMERGENCY STOP |

## Checkpoint Types

**Micro** (every 5-10 ops): Update step counter only
```json
{"currentTask": {"step": 5}}
```

**Standard** (yellow zone): Task + checkpoint block
```json
{
  "currentTask": {"step": 5, "lastCompleted": "...", "nextToDo": "..."},
  "checkpoint": {"timestamp": "...", "toolCallsSinceCheckpoint": 0}
}
```

**Full** (session end): Complete state + quickResume

## 5-Second Resume Format

```
DOING:   [one-line what we were doing]
STOPPED: [one-line where we stopped]
NEXT:    [one-line what to do immediately]
```

---

# 📋 THE 10 COMMANDMENTS

1. **USE EVERYWHERE** - 100% database/engine utilization (min 6 consumers)
2. **FUSE** - Cross-domain concepts (materials + physics + tooling + limits)
3. **VERIFY** - Minimum 3 validation sources (physics + empirical + historical)
4. **LEARN** - Every interaction → ML pipeline → patterns extracted
5. **UNCERTAINTY** - ALWAYS confidence intervals, NEVER bare numbers
6. **EXPLAIN** - XAI for all recommendations, show reasoning chain
7. **GRACEFUL** - Fallbacks for every failure, degrade gracefully
8. **PROTECT** - Validate inputs, sanitize outputs, backup before changes
9. **PERFORM** - <2s load, <500ms calculations
10. **USER-OBSESS** - 3-click rule for any action

---

# 🛠️ QUICK TOOL REFERENCE

| Task | Tool | Parameters |
|------|------|------------|
| Read file | `Filesystem:read_file` | path |
| Write file | `Filesystem:write_file` | path, content |
| Edit file | `Filesystem:edit_file` | path, edits |
| List dir | `Filesystem:list_directory` | path |
| Large file | `Desktop Commander:read_file` | path, offset, length |
| Append | `Desktop Commander:write_file` | path, content, mode:"append" |
| Search | `Desktop Commander:start_search` | searchType:"content", pattern |
| Run script | `Desktop Commander:start_process` | command, timeout_ms |

---

# 📍 CRITICAL PATHS

```
MASTER:     C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\_PRISM_MASTER\
STATE:      C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\CURRENT_STATE.json
SKILLS:     _PRISM_MASTER\SKILLS\ (manifest) + _SKILLS\ (full content)
SCRIPTS:    _PRISM_MASTER\SCRIPTS\ (organized by function)
AGENTS:     _PRISM_MASTER\AGENTS\AGENT_MANIFEST.json
MONOLITH:   _BUILD\PRISM_v8_89_002_TRUE_100_PERCENT\ (986,621 lines)
EXTRACTED:  EXTRACTED\ (materials, machines, engines)
LEARNING:   _PRISM_MASTER\LEARNING\
```

**⚠️ NEVER save PRISM work to /home/claude/ - RESETS EVERY SESSION**

---

# 🚀 API SWARM QUICK COMMANDS

```powershell
# Intelligent mode (auto-everything)
python prism_unified_system_v4.py --intelligent "Your task"

# Manufacturing analysis with verification
python prism_unified_system_v4.py --manufacturing "Ti-6Al-4V" "pocket milling"

# Ralph loop (iterate until complete)
python prism_unified_system_v4.py --ralph architect "Design X. Complete when done." 10

# List all 56 agents
python prism_unified_system_v4.py --list
```

---

# ❌ HARD STOPS

- ❌ Work without reading state first → PROTOCOL VIOLATION
- ❌ Restart IN_PROGRESS task → MUST RESUME
- ❌ Skip checkpoint at orange/red zone → CONTEXT LOSS
- ❌ Save to /home/claude/ → DATA LOSS
- ❌ Module without 6+ consumers → UTILIZATION FAILURE
- ❌ Calculation with <6 data sources → VERIFICATION FAILURE
- ❌ Replacement without regression audit → REGRESSION RISK

---

# 🎯 SKILL LOADING BY TASK

| Task Type | Skills to Load |
|-----------|----------------|
| Session start | prism-session-master |
| Extraction | prism-monolith-extractor, prism-monolith-navigator |
| Materials work | prism-material-schema, prism-material-physics |
| Code writing | prism-code-master, prism-sp-execution |
| Debugging | prism-sp-debugging, prism-root-cause-tracing |
| Quality check | prism-quality-master, prism-sp-verification |
| G-code work | prism-controller-quick-ref, prism-gcode-reference |
| Testing | prism-tdd-enhanced |

---

# 🔗 ENFORCEMENT SCRIPTS

```powershell
# Session enforcement
python session_enforcer.py --check    # Verify state read
python session_enforcer.py --resume   # Get resume instructions
python session_enforcer.py --verify   # Check protocol compliance

# Regression checking
python regression_checker.py --before old.py --after new.py

# Materials validation
python verify_materials.py --path "..\..\EXTRACTED\materials"
```

---

**Document**: CRITICAL_SKILLS_COMBINED.md
**Location**: _PRISM_MASTER\SKILLS\CRITICAL_SKILLS_COMBINED.md
**Purpose**: Single-file reference for all essential skill content
**For full skill details**: See _SKILLS\ directory
