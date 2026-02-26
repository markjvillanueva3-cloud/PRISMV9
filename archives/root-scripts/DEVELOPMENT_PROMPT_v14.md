# PRISM DEVELOPMENT PROMPT v14.0
## FOR CLAUDE'S INSTRUCTIONS - MASTER RESOURCE COORDINATION
## v14.0: ILP-BASED OPTIMAL COMBINATION ENGINE + 699 RESOURCES + LAW 9
---

# CRITICAL CONTEXT

You are developing PRISM Manufacturing Intelligence v9.0+ - a system that controls CNC machines where **LIVES ARE AT STAKE**. This version introduces the **Master Resource Coordination System** using Integer Linear Programming (ILP) for mathematically optimal resource selection.

**NEW IN v14.0:**
- **LAW 9: PROMPT ENGINEERING (PQS >= 0.85)** - Meta-skill wrapping ALL interactions
- prism-prompt-engineering skill with 5 SYS-PROMPT hooks (Priority 0)
- 100 skills (99 existing + 1 new meta-skill)
- 64 agents with tier-specific PE templates
- 25 formulas (22 existing + 3 new F-PROMPT formulas)
- 152 hooks (147 existing + 5 new SYS-PROMPT hooks)
- 699 total resources

---

# MANDATORY FIRST ACTIONS (EVERY SESSION)

```
+===============================================================================+
|  ENFORCEMENT v14.0 - MATHEMATICAL CERTAINTY + ILP + PROMPT ENGINEERING        |
+===============================================================================+
|                                                                               |
|  1. READ: C:\PRISM\state\CURRENT_STATE.json                                   |
|     -> HOOK: session:preStart fires                                           |
|     -> HOOK: SYS-PROMPT-002 fires (PE context injection)                      |
|                                                                               |
|  2. QUOTE: "State verified. quickResume: [exact content]"                     |
|                                                                               |
|  3. CHECK STATUS:                                                             |
|     IF IN_PROGRESS -> RESUME from checkpoint                                  |
|     IF COMPLETE -> May start new task                                         |
|                                                                               |
|  4. LOAD COORDINATION INFRASTRUCTURE:                                         |
|     -> C:\PRISM\data\coordination\RESOURCE_REGISTRY.json (699 resources)      |
|     -> C:\PRISM\data\coordination\CAPABILITY_MATRIX.json                      |
|     -> C:\PRISM\data\coordination\SYNERGY_MATRIX.json (150+ pairs)            |
|     -> C:\PRISM\data\FORMULA_REGISTRY.json (25 formulas)                      |
|                                                                               |
|  5. ACTIVATE LEVEL 0 SKILLS (11 total):                                       |
|     -> prism-prompt-engineering (Law 9) ★ NEW                                 |
|     -> prism-life-safety-mindset (Law 1)                                      |
|     -> prism-mandatory-microsession (Law 2)                                   |
|     -> prism-maximum-completeness (Law 3)                                     |
|     -> prism-anti-regression (Law 4)                                          |
|     -> prism-combination-engine (F-PSI-001)                                   |
|     -> prism-deep-learning                                                    |
|     -> prism-formula-evolution                                                |
|     -> prism-mathematical-planning (MATHPLAN)                                 |
|     -> prism-uncertainty-propagation                                          |
|     -> prism-hook-system (152 hooks)                                          |
|                                                                               |
|  6. RUN COMBINATION ENGINE for new tasks:                                     |
|     -> Parse task requirements (domains, operations, complexity)              |
|     -> Compute capability scores (F-RESOURCE-001)                             |
|     -> Solve ILP optimization (F-PSI-001)                                     |
|     -> Generate optimality proof (F-PROOF-001)                                |
|     -> Apply PE 7-step protocol (F-PROMPT-001)                                |
|     -> Present plan for approval                                              |
|                                                                               |
|  7. COMPLETE MATHPLAN GATE                                                    |
|                                                                               |
+===============================================================================+
```

---

# THE 9 ALWAYS-ON LAWS

| # | Law | Threshold | Hook |
|---|-----|-----------|------|
| 1 | LIFE-SAFETY | S(x) >= 0.70 | SYS-LAW1-SAFETY |
| 2 | MICROSESSIONS | 15-25 items | SYS-LAW2-MICROSESSION |
| 3 | COMPLETENESS | C(T) = 1.0 | SYS-LAW3-COMPLETENESS |
| 4 | ANTI-REGRESSION | New >= Old | SYS-LAW4-REGRESSION |
| 5 | PREDICTIVE | 3 failure modes | SYS-LAW5-PREDICTIVE |
| 6 | CONTINUITY | state file | SYS-LAW6-CONTINUITY |
| 7 | VERIFICATION | 95% confidence | SYS-LAW7-VERIFICATION |
| 8 | MATH EVOLUTION | M(x) >= 0.60 | SYS-LAW8-MATH-EVOLUTION |
| **9** | **PROMPT ENGINEERING** | **PQS >= 0.85** | **SYS-PROMPT-001 to 005** |

---

# LAW 9: PROMPT ENGINEERING (NEW)

## System Hooks (Priority 0 - Fire First)

| Hook | Point | Effect |
|------|-------|--------|
| SYS-PROMPT-001 | agent:preExecute | All 64 agents optimized |
| SYS-PROMPT-002 | skill:preLoad | All 100 skills optimized |
| SYS-PROMPT-003 | api:preCall | External APIs optimized |
| SYS-PROMPT-004 | conversation:turn | Context maintained |
| SYS-PROMPT-005 | output:preGenerate | Format enforced |

## 7-Step Protocol

```
1. ANALYZE    → Key elements, outcomes, constraints
2. CRAFT      → Select framework (Direct/CRAFT/RISEN/CoT)
3. CALIBRATE  → Balance specificity vs flexibility
4. CONTEXTUALIZE → Role + context + format
5. AMBIGUITY  → Resolve or state assumptions
6. FORMAT     → Code block ready
7. EXPLAIN    → Document reasoning
```

## Prompt Quality Score (F-PROMPT-001)

```
PQS = (G1 + G2 + G3 + G4 + G5 + G6) / 6

Gates: Clarity, Completeness, Format, Constraints, Safety, Injection

>= 0.85: OPTIMAL (proceed)
0.50-0.84: WARNING (proceed with logging)
< 0.50: BLOCKED (must improve)
```

## Agent Templates by Tier

| Tier | Template Style |
|------|---------------|
| OPUS | Full CoT, comprehensive context, quality gates |
| SONNET | Efficient, focused context, clear output |
| HAIKU | Minimal, single task, structured I/O |

---

# MASTER COMBINATION EQUATION (F-PSI-001)

```
Ψ(T,R) = argmax    [ Σᵢ Cap(rᵢ,T) × Syn(R) × Ω(R) / Cost(R) ]
         R⊆ALL

Subject to:
  |R_skills| ≤ 8           (max 8 skills)
  |R_agents| ≤ 8           (max 8 agents)  
  |R_execution| = 1         (exactly 1 execution mode)
  S(R) ≥ 0.70              (safety constraint)
  M(R) ≥ 0.60              (rigor constraint)
  PQS(R) ≥ 0.85            (prompt quality constraint) ★ NEW
  Coverage(R,T) = 1.0       (full coverage required)
```

---

# 25 FORMULAS

## Coordination (7)
| ID | Purpose |
|----|---------|
| F-PSI-001 | Master Combination (ILP) |
| F-RESOURCE-001 | Capability scoring |
| F-SYNERGY-001 | Pairwise interactions |
| F-COVERAGE-001 | Task completeness |
| F-SWARM-001 | Swarm efficiency |
| F-AGENT-001 | Agent selection |
| F-PROOF-001 | Optimality proof |

## Prompt (3 NEW)
| ID | Purpose |
|----|---------|
| F-PROMPT-001 | Prompt Quality Score |
| F-PROMPT-002 | Token Efficiency |
| F-PROMPT-003 | Iteration Predictor |

## Other (15)
- Planning: F-PLAN-001 to 005
- Materials: F-MAT-001, 002
- Quality: F-QUAL-001 to 003
- Physics: F-PHYS-001 to 003
- Verification: F-VERIFY-001

---

# RESOURCE INVENTORY (699 total)

| Category | Count | Notes |
|----------|-------|-------|
| Skills | 100 | 99 existing + 1 PE meta-skill |
| Agents | 64 | With tier-specific PE templates |
| Formulas | 25 | 22 existing + 3 F-PROMPT |
| Coefficients | 32 | Including 7 coordination |
| Hooks | 152 | 147 existing + 5 SYS-PROMPT |
| Databases | 4 | Materials, Machines, Tools, Knowledge |
| Swarm Patterns | 8 | Pre-defined multi-agent patterns |
| Execution Modes | 4 | single, swarm, intelligent, ralph |

---

# SKILL LEVELS

| Level | Count | Purpose |
|-------|-------|---------|
| L0 | 11 | Always-On Laws (including PE) |
| L1 | 10 | Cognitive patterns |
| L2 | 9 | Workflow skills |
| L3 | 16 | Domain specialists |
| L4 | 20 | Reference libraries |
| L5 | 34 | Archives/specialized |

---

# CRITICAL PATHS

```
STATE:           C:\PRISM\state\CURRENT_STATE.json
COORDINATION:    C:\PRISM\data\coordination\
  ├── RESOURCE_REGISTRY.json
  ├── CAPABILITY_MATRIX.json
  ├── SYNERGY_MATRIX.json
  └── AGENT_REGISTRY.json
FORMULAS:        C:\PRISM\data\FORMULA_REGISTRY.json
COEFFICIENTS:    C:\PRISM\data\COEFFICIENT_DATABASE.json
CALIBRATION:     C:\PRISM\state\CALIBRATION_STATE.json
SKILLS:          C:\PRISM\skills-consolidated\
ORCHESTRATOR:    C:\PRISM\scripts\prism_unified_system_v6.py
TESTING:         C:\PRISM\scripts\testing\
```

---

# ORCHESTRATOR COMMANDS (v6)

```powershell
# ILP-optimized intelligent swarm (uses CombinationEngine + PE)
py -3 C:\PRISM\scripts\prism_unified_system_v6.py --intelligent "Task"

# Specific swarm pattern
py -3 C:\PRISM\scripts\prism_unified_system_v6.py --swarm deep_extraction_swarm "Task"

# Single agent (with PE template)
py -3 C:\PRISM\scripts\prism_unified_system_v6.py --single architect "Task"

# Ralph improvement loop
py -3 C:\PRISM\scripts\prism_unified_system_v6.py --ralph validator "Task" 3

# List all resources
py -3 C:\PRISM\scripts\prism_unified_system_v6.py --list
```

---

# SYSTEM SUMMARY v14.0

```
+========================================================================+
|  PRISM v14.0 | C:\PRISM\ | MASTER COORDINATION + PROMPT ENGINEERING    |
|  Skills: 100 | Agents: 64 | Formulas: 25 | Hooks: 152 | Resources: 699 |
|                                                                        |
|  NEW IN v14.0:                                                         |
|  - LAW 9: Prompt Engineering (PQS >= 0.85)                            |
|  - prism-prompt-engineering meta-skill (Level 0)                       |
|  - 5 SYS-PROMPT hooks (Priority 0 - fires first)                      |
|  - 3 F-PROMPT formulas (PQS, Token Efficiency, Iteration)             |
|  - Tier-specific agent templates (OPUS/SONNET/HAIKU)                  |
|  - 7-step protocol for all prompts                                     |
|                                                                        |
|  ENFORCEMENT: 9 Laws + 15 Commandments + MATHPLAN + ILP + PE + Hooks  |
+========================================================================+
```

---

**LIVES DEPEND ON MATHEMATICAL CERTAINTY.**
**v14.0 | 2026-01-29 | ILP + PROMPT ENGINEERING ACTIVE**
