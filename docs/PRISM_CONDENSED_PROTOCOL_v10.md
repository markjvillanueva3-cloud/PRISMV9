# PRISM CONDENSED PROTOCOL v10.0
## Quick Reference | Lives at Stake | ENFORCEMENT ENABLED
---

# 🔴 MANDATORY: EVERY SESSION - DO THIS FIRST

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║  ⛔ ENFORCEMENT ENABLED - THESE ARE NOT SUGGESTIONS                           ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  1. READ: C:\PRISM\state\CURRENT_STATE.json                                   ║
║  2. QUOTE: quickResume field exactly                                          ║
║  3. CHECK: IN_PROGRESS? → Resume. COMPLETE? → New task.                       ║
║  4. DECOMPOSE: Task → Microsessions (15-25 items each)                        ║
║  5. LOAD: Relevant skills from C:\PRISM\skills\                               ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

# ⚡ 7 ALWAYS-ON LAWS

| # | Law | Test |
|---|-----|------|
| 1 | LIFE-SAFETY | "Would I trust this with MY life?" |
| 2 | MICROSESSIONS | Decompose BEFORE execution (15-25 items) |
| 3 | COMPLETENESS | 100% coverage, no "good enough" |
| 4 | ANTI-REGRESSION | New ≥ Old, always |
| 5 | PREDICTIVE | 3 failure modes + mitigations |
| 6 | CONTINUITY | State in CURRENT_STATE.json |
| 7 | VERIFICATION | 4-level chain, 95% confidence |

---

# 📋 15 COMMANDMENTS

| # | Commandment | Rule |
|---|-------------|------|
| 1 | USE EVERYWHERE | Min 6-8 consumers per DB |
| 2 | FUSE | Cross-domain concepts |
| 3 | WIRE FIRST | 100% consumers before import |
| 4 | VERIFY ×3 | Physics + empirical + historical |
| 5 | UNCERTAINTY | Value ± error (confidence%) |
| 6 | EXPLAIN | XAI for all recommendations |
| 7 | FAIL GRACEFUL | Fallbacks for everything |
| 8 | PROTECT | Validate, sanitize, backup |
| 9 | DEFENSIVE | Handle ALL edge cases |
| 10 | PERFORM | <2s load, <500ms calc |
| 11 | OPTIMIZE | Measure first, cache smart |
| 12 | USER-OBSESS | 3-click rule |
| 13 | NEVER LOSE | Auto-save, undo, recover |
| 14 | LEARN | Feed _LEARNING pipeline |
| 15 | IMPROVE | Extract patterns continuously |

---

# 📍 CRITICAL PATHS

```
ROOT:       C:\PRISM\
STATE:      C:\PRISM\state\CURRENT_STATE.json
SCRIPTS:    C:\PRISM\scripts\
SKILLS:     C:\PRISM\skills\
DATA:       C:\PRISM\data\
MATERIALS:  C:\PRISM\data\materials\
MACHINES:   C:\PRISM\data\machines\
LOGS:       C:\PRISM\state\logs\
```

**⚠️ NEVER /home/claude/ - RESETS EVERY SESSION**

---

# 🛠️ TOOLS

| Task | Tool |
|------|------|
| Read C: | `Filesystem:read_file` |
| Write C: | `Filesystem:write_file` |
| Large file | `Desktop Commander:read_file` (offset/length) |
| Append | `Desktop Commander:write_file` (mode:"append") |
| Search | `Desktop Commander:start_search` |
| Python | `Desktop Commander:start_process` |

---

# 🚀 PYTHON ORCHESTRATORS

```powershell
# Intelligent swarm (56 agents)
py -3 C:\PRISM\scripts\prism_unified_system_v4.py --intelligent "Task"

# Manufacturing analysis
py -3 C:\PRISM\scripts\prism_orchestrator_v2.py --manufacturing "Material" "Op"

# Ralph loop
py -3 C:\PRISM\scripts\prism_unified_system_v4.py --ralph agent "Prompt" 10

# List agents
py -3 C:\PRISM\scripts\prism_unified_system_v4.py --list
```

---

# 🎯 89 SKILLS

| Level | Count | Examples |
|-------|-------|----------|
| L0 Always-On | 1 | deep-learning |
| L1 Cognitive | 6 | universal-formulas, safety-framework, master-equation |
| L2 Workflow | 8 | sp-brainstorm, sp-execution, sp-debugging |
| L3 Domain | 16 | material-schema, monolith-extractor, session-master |
| L4 Reference | 20 | fanuc-programming, api-contracts, expert-roles |
| Unclassified | 38 | Various utilities |

---

# 🤖 56 AGENTS

- **OPUS (15):** architect, materials_scientist, machinist, physics_validator, debugger, root_cause_analyst
- **SONNET (32):** extractor, validator, coder, analyst, cam_specialist, code_reviewer
- **HAIKU (9):** cutting_calculator, formula_lookup, material_lookup

---

# 🛡️ BUFFER ZONES

| Zone | Calls | Action |
|------|-------|--------|
| 🟢 GREEN | 0-8 | Work freely |
| 🟡 YELLOW | 9-14 | Checkpoint soon |
| 🟠 ORANGE | 15-18 | Checkpoint NOW |
| 🔴 RED | 19+ | EMERGENCY STOP |

---

# 📐 MASTER EQUATION

```
Ω(x) = 0.25·R + 0.20·C + 0.15·P + 0.30·S + 0.10·L

HARD CONSTRAINT: S(x) ≥ 0.70

Ω ≥ 0.90: RELEASE | 0.70-0.89: WARN | <0.70: BLOCK | S<0.70: BLOCK
```

---

# 🔄 AUTO-SKILL LOADING

| Keywords | Skills |
|----------|--------|
| brainstorm, design | sp-brainstorm |
| extract, monolith | monolith-extractor |
| material, alloy | material-schema, material-physics |
| debug, fix, error | sp-debugging |
| gcode, fanuc | fanuc-programming |
| verify, validate | sp-verification |

---

# 🚨 EMERGENCIES

| Situation | Action |
|-----------|--------|
| Context compacted | Read CURRENT_STATE.json, resume |
| Task restarting | STOP, read state, resume from checkpoint |
| S(x) < 0.70 | STOP, announce, get more data |
| Buffer overflow | Checkpoint immediately |

---

# 📊 SYSTEM

```
╔════════════════════════════════════════════════════════╗
║  PRISM v10.0 | C:\PRISM\                               ║
║  Skills: 89 | Agents: 56 | Materials: 1,512            ║
║  Monolith: 986,621 lines | 831 modules                 ║
║  Enforcement: 7 Laws + 15 Commandments + Ω Equation    ║
╚════════════════════════════════════════════════════════╝
```

**THIS IS MANUFACTURING INTELLIGENCE. LIVES DEPEND ON THOROUGHNESS.**
