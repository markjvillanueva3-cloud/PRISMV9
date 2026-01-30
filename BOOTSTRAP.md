# PRISM BOOTSTRAP v13.0
## Instant Session Activation | 30-Second Startup
## Lives at Stake - Manufacturing Intelligence
---

# ⛔ MANDATORY FIRST ACTIONS

## 1. READ STATE
```
Filesystem:read_file
path: C:\PRISM\state\CURRENT_STATE.json
```

## 2. QUOTE quickResume
Say: "State verified. quickResume: [exact content]"

## 3. CHECK STATUS
- `IN_PROGRESS` → **RESUME from checkpoint. DO NOT restart.**
- `COMPLETE` → May start new task.

## 4. LOAD MATH INFRASTRUCTURE
```
FORMULA_REGISTRY.json    (22 formulas)
COEFFICIENT_DATABASE.json (40+ coefficients)
RESOURCE_REGISTRY.json   (691 resources)
```

## 5. RUN F-PSI-001 (Optimal Resource Selection)
```
Input:  Task requirements
Output: R* = optimal {skills, agents, formulas} with PROOF
```

## 6. DECOMPOSE (MATHPLAN Gate)
```
[ ] SCOPE:      S = [exact total]
[ ] DECOMPOSE:  Σ|dᵢ| = S
[ ] EFFORT:     [X] ± [Y] calls (95% CI)
[ ] RESOURCES:  R* = F-PSI-001(T)
[ ] SUCCESS:    [criteria]
```

---

# 📍 CRITICAL PATHS

```
ROOT:        C:\PRISM\
STATE:       C:\PRISM\state\CURRENT_STATE.json
FORMULAS:    C:\PRISM\data\FORMULA_REGISTRY.json
COEFF:       C:\PRISM\data\COEFFICIENT_DATABASE.json
RESOURCES:   C:\PRISM\data\coordination\RESOURCE_REGISTRY.json
SCRIPTS:     C:\PRISM\scripts\
SKILLS:      C:\PRISM\skills\
DATA:        C:\PRISM\data\
MATERIALS:   C:\PRISM\data\materials\
MACHINES:    C:\PRISM\data\machines\
TOOLS:       C:\PRISM\data\tools\
```

**⚠️ NEVER /home/claude/ - RESETS**

---

# 🛠️ TOOLS

| Task | Tool |
|------|------|
| Read file | `Filesystem:read_file` path |
| Write file | `Filesystem:write_file` path, content |
| List dir | `Filesystem:list_directory` path |
| Large file | `Desktop Commander:read_file` path, offset, length |
| Append | `Desktop Commander:write_file` path, content, mode:"append" |
| Search | `Desktop Commander:start_search` searchType, pattern, path |
| Python | `Desktop Commander:start_process` command, timeout_ms |

---

# 🚀 PYTHON ORCHESTRATORS (v6.0)

```powershell
# OPTIMAL (ILP-based) - RECOMMENDED
py -3 C:\PRISM\scripts\prism_unified_system_v6.py --optimal "Task"

# Intelligent swarm (64 agents)
py -3 C:\PRISM\scripts\prism_unified_system_v6.py --intelligent "Task"

# Manufacturing analysis (8 experts)
py -3 C:\PRISM\scripts\prism_orchestrator_v2.py --manufacturing "Material" "Op"

# Ralph loop (iterate until perfect)
py -3 C:\PRISM\scripts\prism_unified_system_v6.py --ralph agent "Prompt" 10

# List all agents
py -3 C:\PRISM\scripts\prism_unified_system_v6.py --list
```

---

# ⚡ 8 LAWS (ALWAYS-ON)

| # | Law | Hook |
|---|-----|------|
| 1 | LIFE-SAFETY - S(x) ≥ 0.70 | SYS-LAW1-SAFETY |
| 2 | MICROSESSIONS - 15-25 items max | SYS-LAW2-MICROSESSION |
| 3 | COMPLETENESS - C(T) = 1.0 | SYS-LAW3-COMPLETENESS |
| 4 | ANTI-REGRESSION - New ≥ Old | SYS-LAW4-REGRESSION |
| 5 | PREDICTIVE - 3 failure modes | SYS-LAW5-PREDICTIVE |
| 6 | CONTINUITY - State file | SYS-LAW6-CONTINUITY |
| 7 | VERIFICATION - 95% confidence | SYS-LAW7-VERIFICATION |
| 8 | MATH EVOLUTION - M(x) ≥ 0.60 | SYS-LAW8-MATH-EVOLUTION |

---

# 📋 15 COMMANDMENTS

1. USE EVERYWHERE (6-8 consumers/DB)
2. FUSE (cross-domain)
3. WIRE FIRST (100% consumers)
4. VERIFY ×3 (physics+empirical+historical)
5. UNCERTAINTY (value±error)
6. EXPLAIN (XAI)
7. FAIL GRACEFUL
8. PROTECT (validate/sanitize/backup)
9. DEFENSIVE (all edge cases)
10. PERFORM (<2s/<500ms)
11. OPTIMIZE (measure first)
12. USER-OBSESS (3-click)
13. NEVER LOSE DATA
14. LEARN (feed pipeline)
15. IMPROVE (extract patterns)

---

# 🛡️ BUFFER ZONES

| Zone | Calls | Action |
|------|-------|--------|
| 🟢 | 0-8 | Work |
| 🟡 | 9-14 | Checkpoint soon |
| 🟠 | 15-18 | Checkpoint NOW |
| 🔴 | 19+ | EMERGENCY STOP |

---

# 📐 Ω MASTER EQUATION

```
Ω = 0.20R + 0.18C + 0.12P + 0.28S + 0.08L + 0.14M

HARD CONSTRAINTS:
  S(x) ≥ 0.70 (Safety)
  M(x) ≥ 0.60 (Math Rigor)

≥0.90: RELEASE | 0.70-0.89: WARN | <0.70: BLOCK
```

---

# 🎯 99 SKILLS (6 Levels)

| Level | Count | Examples |
|-------|-------|----------|
| L0 Always-On | 6 | combination-engine, hook-system, formula-evolution |
| L1 Cognitive | 10 | reasoning-engine, swarm-coordinator, agent-selector |
| L2 Workflow | 9 | sp-brainstorm, sp-planning, sp-execution |
| L3 Domain | 16 | monolith-*, material-*, *-master |
| L4 Reference | 20 | fanuc/siemens/heidenhain-programming |
| Unclassified | 38 | Various utilities |

---

# 🔄 AUTO-LOAD SKILLS

| Keywords | Skills |
|----------|--------|
| optimal, combination | combination-engine, resource-optimizer |
| swarm, coordinate | swarm-coordinator |
| brainstorm, plan | sp-brainstorm, mathematical-planning |
| extract, monolith | monolith-extractor |
| material, steel | material-schema, material-physics |
| debug, error | sp-debugging, error-catalog |
| verify, validate | sp-verification |
| formula | formula-evolution |
| gcode, fanuc | fanuc-programming |

---

# 🤖 64 AGENTS (3 Tiers)

**OPUS (18):** architect, coordinator↑, materials_scientist, machinist, physics_validator, domain_expert, synthesizer, debugger, root_cause_analyst, task_decomposer, learning_extractor↑, verification_chain, uncertainty_quantifier, meta_analyst↑, **combination_optimizer★**, **synergy_analyst★**, **proof_generator★**

**SONNET (37):** extractor, validator, merger, coder, analyst, researcher, tool_engineer, cam_specialist, quality_engineer, process_engineer, machine_specialist, gcode_expert, monolith_navigator, schema_designer, api_designer, completeness_auditor, regression_checker, code_reviewer, optimizer, **resource_auditor★**, **calibration_engineer★**, **test_orchestrator★**

**HAIKU (9):** state_manager, cutting_calculator, surface_calculator, standards_expert, formula_lookup, material_lookup, tool_lookup, call_tracer, knowledge_graph_builder

★ = NEW in v13, ↑ = UPGRADED

---

# 📊 22 FORMULAS

| Category | IDs |
|----------|-----|
| PLANNING (5) | F-PLAN-001 to F-PLAN-005 |
| MATERIALS (2) | F-MAT-001, F-MAT-002 |
| QUALITY (3) | F-QUAL-001 to F-QUAL-003 |
| PHYSICS (3) | F-PHYS-001 to F-PHYS-003 |
| VERIFICATION (1) | F-VERIFY-001 |
| **COORDINATION (7)** | F-PSI-001, F-RESOURCE-001, F-SYNERGY-001, F-COVERAGE-001, F-SWARM-001, F-AGENT-001, F-PROOF-001 |

---

# 🚨 EMERGENCIES

| Issue | Action |
|-------|--------|
| Compacted | Read state, resume from quickResume |
| Restarting | STOP, read state, resume checkpoint |
| S < 0.70 | BLOCKED - get more verification |
| M < 0.60 | BLOCKED - add uncertainties |
| Buffer overflow | Checkpoint NOW |

---

# 📊 SYSTEM v13.0

```
╔═══════════════════════════════════════════════════════╗
║  PRISM v13.0 | C:\PRISM\                             ║
║  Skills: 99 | Agents: 64 | Hooks: 147                 ║
║  Formulas: 22 (7 COORDINATION) | Coefficients: 40+    ║
║  Resources: 691 cataloged                             ║
║                                                       ║
║  Materials: 3,518 | Machines: 824 | Tools: 1,944      ║
║  Monolith: 986,621 lines                              ║
║                                                       ║
║  8 Laws | 15 Commandments | MATHPLAN Gate             ║
║  F-PSI-001 ILP Optimization | Ω Master Equation       ║
╚═══════════════════════════════════════════════════════╝
```

---

# 📁 KEY FILES

| File | Purpose |
|------|---------|
| CURRENT_STATE.json | Session state |
| DEVELOPMENT_PROMPT_v13.md | Complete reference |
| CONDENSED_PROTOCOL_v8.md | Quick reference |
| DEVELOPMENT_ROADMAP_v7.md | Phase tracking |
| FORMULA_REGISTRY.json | 22 formulas |
| RESOURCE_REGISTRY.json | 691 resources |

---

**LIVES AT STAKE. MATHEMATICAL CERTAINTY REQUIRED.**
**F-PSI-001 AUTO-SELECTS OPTIMAL RESOURCES FOR EVERY TASK.**

---
**Version:** 13.0 | **Date:** 2026-01-27
