# PRISM MCP Server - Integration Map
## Complete Tool-Resource Connection Documentation
### Version 1.0 | 2026-01-31

---

## 📊 RESOURCE SUMMARY

| Category | Resource | Count | Details |
|----------|----------|-------|---------|
| **Databases** | Materials | 1,047 | 127 parameters each |
| | Machines | 824 | 4 data layers |
| | Tools | 500 | 85 parameters each |
| | Alarms | 2,500 | 12 controller families |
| | Fixtures | 200 | Workholding data |
| | G-codes | 800 | Controller-specific |
| | Posts | 150 | Post processors |
| **Knowledge** | Skills | 135 | ~50,000 lines |
| | Modules | 950 | 154 MB extracted |
| | Knowledge Bases | 10 | Algorithms, MFG, AI |
| **Orchestration** | Agents | 64 | 3 tiers |
| | Formulas | 109 | 20 domains |
| | Hooks | 162 | 5 patterns |
| | Workflows | 12 | - |
| | Swarm Patterns | 8 | - |

**TOTAL: 1,735 resources → 117 MCP tools**

---

## 🔗 DATA FLOW ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────┐
│                    MCP TOOLS (117)                              │
│  Data(15) │ Calc(12) │ Agent(10) │ Knowledge(10) │ State(10)   │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    REGISTRIES (8)                               │
│  Material │ Machine │ Tool │ Alarm │ Formula │ Agent │ Hook    │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              4-LAYER DATA HIERARCHY                             │
│     LEARNED → USER → ENHANCED → CORE                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ TOOL-RESOURCE MAPPINGS

### 1️⃣ DATA ACCESS TOOLS (15)

| Tool | Databases | Formulas | Hooks | Skills |
|------|-----------|----------|-------|--------|
| `prism_material_get` | materials | - | BAYES-001 | prism-material-physics |
| `prism_material_search` | materials | - | - | prism-material-lookup |
| `prism_material_compare` | materials | - | - | prism-material-physics |
| `prism_material_add` | materials | - | BAYES-002, SYS-LAW4 | prism-material-validator |
| `prism_material_enhance` | materials | - | BAYES-002, SYS-LAW3 | prism-material-enhancer |
| `prism_machine_get` | machines | - | - | - |
| `prism_machine_search` | machines | - | - | - |
| `prism_machine_capabilities` | machines | F-KINEMATICS-001 | - | - |
| `prism_tool_get` | tools | - | - | prism-cutting-tools |
| `prism_tool_search` | tools | - | - | prism-cutting-tools |
| `prism_tool_recommend` | tools, materials | F-TOOL-SELECT-001 | OPT-001 | prism-cutting-tools |
| `prism_alarm_decode` | alarms | - | - | prism-error-catalog |
| `prism_alarm_search` | alarms | - | - | prism-error-catalog |
| `prism_fixture_get` | fixtures | - | - | - |
| `prism_fixture_search` | fixtures | - | - | - |

### 2️⃣ CALCULATION TOOLS (12)

| Tool | Databases | Formulas | Safety Gate |
|------|-----------|----------|-------------|
| `prism_speed_feed` | materials, tools, machines | F-KIENZLE-001, F-TAYLOR-001, F-MRR-001 | **S(x) ≥ 0.70** |
| `prism_cutting_force` | materials | F-KIENZLE-001/002/003 | - |
| `prism_tool_life` | materials, tools | F-TAYLOR-001/002 | - |
| `prism_surface_finish` | materials, tools | F-SURFACE-001/002 | - |
| `prism_power_calc` | materials, machines | F-POWER-001/002 | power ≤ spindle |
| `prism_mrr_calc` | - | F-MRR-001 | - |
| `prism_chip_calc` | materials | F-CHIP-001, F-MERCHANT-001 | - |
| `prism_thermal_calc` | materials, tools | F-THERMAL-001/002 | - |
| `prism_deflection_calc` | tools, fixtures | F-DEFLECT-001/002 | - |
| `prism_chatter_predict` | materials, tools, machines | F-STABILITY-001/002 | stability > 1.0 |
| `prism_formula_calc` | - | ALL 109 | - |
| `prism_formula_list` | - | - | - |

### 3️⃣ AGENT ORCHESTRATION TOOLS (10)

| Tool | Agents | Formulas | Hooks | Patterns |
|------|--------|----------|-------|----------|
| `prism_agent_list` | ALL 64 | - | - | - |
| `prism_agent_get` | ANY | - | - | - |
| `prism_agent_invoke` | ANY | - | RL-001 | - |
| `prism_agent_swarm` | Multiple | F-PSI-001 | OPT-001, MULTI-001 | 8 patterns |
| `prism_ralph_loop` | Validators | - | BAYES-003, SYS-LAW7 | - |
| `prism_quality_check` | - | - | ALL_QUALITY | - |
| `prism_safety_check` | - | - | SYS-LAW1 | - |
| `prism_regression_check` | - | - | BAYES-002, SYS-LAW4 | - |
| `prism_ilp_optimize` | - | F-PSI-001 | OPT-001/002 | - |

**Swarm Patterns:**
1. PARALLEL_EXTRACTION - Independent parallel tasks
2. SEQUENTIAL_VALIDATION - Chain validation
3. HIERARCHICAL_REVIEW - Tier-based review
4. CONSENSUS_BUILDING - Agent voting
5. DIVIDE_CONQUER - Task splitting
6. EXPERT_ENSEMBLE - Domain collaboration
7. COMPETITIVE_OPTIMIZATION - Solution competition
8. COOPERATIVE_LEARNING - Knowledge sharing

### 4️⃣ HOOK SYSTEM TOOLS (8)

| Tool | Hooks | Skills |
|------|-------|--------|
| `prism_hook_list` | ALL 162 | prism-cognitive-core |
| `prism_hook_trigger` | ANY | prism-cognitive-core |
| `prism_hook_status` | - | prism-cognitive-core |
| `prism_bayes_update` | BAYES-001/002/003 | prism-cognitive-core |
| `prism_quality_compute` | ALL_QUALITY | prism-master-equation |

**Hook Patterns (5):**
- BAYESIAN - Prior updates, change detection
- OPTIMIZATION - Solution search
- MULTI_OBJECTIVE - Pareto optimization
- GRADIENT - Continuous improvement
- REINFORCEMENT - Learning from feedback

### 5️⃣ KNOWLEDGE ACCESS TOOLS (10)

| Tool | Resources | Count |
|------|-----------|-------|
| `prism_skill_list` | All skills | 135 |
| `prism_skill_load` | Single skill | - |
| `prism_skill_search` | Skill content | - |
| `prism_module_list` | All modules | 950 |
| `prism_module_load` | Single module | - |
| `prism_module_search` | Module content | - |
| `prism_kb_query` | Knowledge bases | 10 |
| `prism_course_lookup` | MIT/Stanford courses | 220 |

### 6️⃣ SESSION STATE TOOLS (10)

| Tool | File | Purpose |
|------|------|---------|
| `prism_state_load` | CURRENT_STATE.json | Load session |
| `prism_state_save` | CURRENT_STATE.json | Save session |
| `prism_state_checkpoint` | CURRENT_STATE.json | Progress checkpoint |
| `prism_state_diff` | - | Compare versions |
| `prism_handoff_prepare` | CURRENT_STATE.json | Prepare handoff |
| `prism_resume_session` | CURRENT_STATE.json | Resume session |
| `prism_memory_save` | SESSION_MEMORY.json | Persist key data |
| `prism_memory_recall` | SESSION_MEMORY.json | Recall data |
| `prism_buffer_status` | - | Check context zone |
| `prism_compaction_prepare` | - | Prepare for compaction |

---

## 📐 FORMULA MAPPING

### Domain → Tools

| Domain | Formulas | Primary Tools |
|--------|----------|---------------|
| KIENZLE | F-KIENZLE-001/002/003 | prism_cutting_force, prism_speed_feed |
| TAYLOR | F-TAYLOR-001/002 | prism_tool_life, prism_speed_feed |
| MRR | F-MRR-001 | prism_mrr_calc, prism_speed_feed |
| POWER | F-POWER-001/002 | prism_power_calc |
| SURFACE | F-SURFACE-001/002 | prism_surface_finish |
| THERMAL | F-THERMAL-001/002 | prism_thermal_calc |
| CHIP | F-CHIP-001, F-MERCHANT-001 | prism_chip_calc |
| STABILITY | F-STABILITY-001/002 | prism_chatter_predict |
| DEFLECTION | F-DEFLECT-001/002 | prism_deflection_calc |
| OPTIMIZATION | F-PSI-001 | prism_ilp_optimize, prism_agent_swarm |

---

## 🤖 AGENT TIER MAPPING

| Tier | Agents | Tool Integration |
|------|--------|------------------|
| **OPUS** | 8 | Complex reasoning, architecture, safety validation |
| **SONNET** | 32 | General development, documentation, analysis |
| **HAIKU** | 24 | Quick validations, formatting, simple tasks |

---

## ⚠️ SAFETY GATES

### Hard Blocks (S(x) ≥ 0.70)

| Tool | Safety Check | Reason |
|------|--------------|--------|
| `prism_speed_feed` | S(x) ≥ 0.70 | Cutting parameters affect operator safety |
| `prism_alarm_fix` | S(x) ≥ 0.70 | Fix procedures must be verified |
| `prism_power_calc` | power ≤ machine.spindle.power | Prevent spindle damage |
| `prism_chatter_predict` | stability_ratio > 1.0 | Prevent resonance failures |
| `prism_collision_check` | no_collision | Prevent machine crashes |

### Quality Gates (Ω(x) ≥ 0.70)

All tools are subject to quality gate warnings:
```
Ω(x) = 0.25·R + 0.20·C + 0.15·P + 0.30·S + 0.10·L
```

---

## 🔄 CROSS-TOOL DEPENDENCIES

### Speed/Feed Calculation Chain
```
prism_material_get ──┐
                     ├──► prism_speed_feed ──► Safety Gate
prism_tool_get ──────┤                              │
                     │                              ▼
prism_machine_get ───┘                        prism_power_calc
```

### Agent Swarm Chain
```
prism_agent_list ──► prism_ilp_optimize ──► prism_agent_swarm
                                                    │
                                                    ▼
                                           prism_ralph_loop
                                                    │
                                                    ▼
                                           prism_quality_check
```

### Material Enhancement Chain
```
prism_material_get ──► prism_material_enhance ──► prism_regression_check
                              │
                              ▼
                       prism_state_save
```

---

## 📁 FILE PATHS

| Resource | Path |
|----------|------|
| State File | `C:\PRISM...\CURRENT_STATE.json` |
| Session Memory | `C:\PRISM\state\SESSION_MEMORY.json` |
| Materials DB | `C:\PRISM...\EXTRACTED\materials\` |
| Machines DB | `C:\PRISM...\EXTRACTED\machines\` |
| Alarms DB | `C:\PRISM...\EXTRACTED\controllers\alarms\` |
| Skills | `C:\PRISM\skills-consolidated\` |
| Modules | `C:\PRISM\extracted_modules\` |
| Formulas | `C:\PRISM\data\coordination\FORMULA_REGISTRY.json` |
| Agents | `C:\PRISM\data\coordination\AGENT_REGISTRY.json` |

---

## ✅ DATABASE CONSUMER COUNT

Following **"IF IT EXISTS, USE IT EVERYWHERE"**:

| Database | Consumers | Status |
|----------|-----------|--------|
| Materials | 11 tools | ✅ Well-utilized |
| Machines | 9 tools | ✅ Well-utilized |
| Tools | 9 tools | ✅ Well-utilized |
| Alarms | 3 tools | ⚠️ Add more |
| Fixtures | 3 tools | ⚠️ Add more |

---

**LIVES DEPEND ON CORRECT DATA. NO SHORTCUTS.**
