# PRISM GSD Core v8.0
## Get Shit Done - 277 MCP Tools | Hook-First Architecture
## Updated: 2026-02-02

### SESSION START
```
1. prism_gsd_core → Instructions (THIS)
2. prism_hook_fire("STATE-BEFORE-MUTATE-001") → Fire state hook
3. Desktop Commander → C:\PRISM\state\CURRENT_STATE.json
4. prism_todo_update → Anchor attention
```

### 4 LAWS (HARD REQUIREMENTS)
| Law | Rule | Consequence |
|-----|------|-------------|
| **S(x)≥0.70** | Safety score must pass | OUTPUT BLOCKED |
| **No placeholders** | 100% complete or N/A | REJECTED |
| **New≥Old** | Never lose data | BLOCKED |
| **MCP First** | 277 tools before files | EFFICIENCY |

### HOOK-FIRST WORKFLOW
```
BRAINSTORM → PLAN → EXECUTE → REVIEW → COMPLETE
    ↓         ↓        ↓         ↓        ↓
 CALC-001  BATCH-001 AGENT-001 FORMULA-001 Ω(x)
 (hooks)   (hooks)   (hooks)   (hooks)    ≥0.70
```

### BUFFER ZONES
| Zone | Calls | Action |
|------|-------|--------|
| 🟢 GREEN | 0-8 | Normal |
| 🟡 YELLOW | 9-14 | Plan checkpoint |
| 🔴 RED | 15-18 | IMMEDIATE checkpoint |
| ⚫ CRITICAL | 19+ | STOP ALL WORK |

### CONTEXT PRESSURE
| Level | % | Action |
|-------|---|--------|
| GREEN | 0-60 | Normal |
| YELLOW | 60-75 | Batch operations |
| ORANGE | 75-85 | Checkpoint NOW |
| RED | 85-92 | Prepare handoff |
| CRITICAL | >92 | STOP |

### MASTER EQUATION
```
Ω(x) = 0.25·R + 0.20·C + 0.15·P + 0.30·S + 0.10·L
S(x) ≥ 0.70 = HARD BLOCK | Ω(x) ≥ 0.70 = Release
```

### KEY MCP TOOLS (277 total, v2.9)

**GSD (6)**
| Tool | Use |
|------|-----|
| prism_gsd_core | Full instructions |
| prism_gsd_quick | Minimal essentials |
| prism_quick_resume | Fast continuation |
| prism_dev_protocol | Development workflow |
| prism_resources_summary | Resource counts |
| prism_gsd_get | Get specific section |

**Master (6)**
| Tool | Use |
|------|-----|
| prism_master_status | System status |
| prism_master_context | Context pressure |
| prism_master_batch | Batch 2+ operations |
| prism_master_checkpoint | Create checkpoint |
| prism_master_swarm | Multi-agent execution |
| prism_master_call | Call any tool |

**Hook Tools (18) - HOOK-FIRST**
| Tool | Use |
|------|-----|
| prism_hook_fire | Fire single hook |
| prism_hook_chain_v2 | Fire hook chain |
| prism_hook_status | Current hook state |
| prism_hook_list | List all hooks |
| prism_hook_search | Search hooks |
| prism_hook_get | Get hook details |
| prism_hook_enable | Enable hook |
| prism_hook_disable | Disable hook |
| prism_hook_coverage | Coverage report |
| prism_hook_gaps | Find gaps |

**Development Protocol (24)**
| Tool | Use |
|------|-----|
| prism_sp_brainstorm | MANDATORY pre-impl |
| prism_sp_plan | Create task plan |
| prism_sp_execute | Execute with monitoring |
| prism_sp_review_spec | Spec compliance |
| prism_sp_review_quality | Quality + Safety gate |
| prism_sp_debug | 4-phase debugging |
| prism_cognitive_init | Initialize session |
| prism_cognitive_check | Compute Ω(x) |

**Context Engineering (14) - Manus 6**
| Tool | Use |
|------|-----|
| prism_todo_update | Attention anchor (every 5-8) |
| prism_error_preserve | Keep errors |
| prism_memory_externalize | File system = memory |
| prism_kv_sort_json | Deterministic JSON |
| prism_vary_response | Prevent mimicry |

**Data Access**
| Tool | Data |
|------|------|
| prism_material_get/search | 1,047 materials × 127 params |
| prism_machine_get/search | 824 machines × 43 mfrs |
| prism_alarm_search | 9,200 codes × 12 families |
| prism_skill_read/list | 153 skills (all content) |
| prism_formula_apply/list | 490 formulas |
| prism_agent_list/select | 69 agents (21/39/9) |

### PHASE 0 HOOKS (41 total)
| Category | Count | Key Hooks |
|----------|-------|-----------|
| CALC | 12 | CALC-SAFETY-VIOLATION-001 blocks S(x)<0.70 |
| FILE | 8 | FILE-VALIDATION-FAIL-001 |
| STATE | 6 | STATE-ANTI-REGRESSION-001 |
| AGENT | 5 | AGENT-TIER-VALIDATE-001 |
| BATCH | 6 | BATCH-CHECKPOINT-001 |
| FORMULA | 4 | FORMULA-MAPE-EXCEED-001 |

### 9 VALIDATION GATES
| Gate | Check | Block |
|------|-------|-------|
| G1-G7 | Standard checks | ❌ |
| **G8** | **S(x) ≥ 0.70** | **HARD BLOCK** |
| G9 | Ω(x) ≥ 0.70 | WARN |

### EVIDENCE LEVELS
| Level | Name | Min for Complete |
|-------|------|------------------|
| L1 | Claim | ❌ |
| L2 | Listing | ❌ |
| **L3** | **Sample** | **✅ MINIMUM** |
| L4 | Reproducible | ✅ |
| L5 | Verified | ✅ |

### SESSION END
```
1. prism_cognitive_check → Final Ω(x)
2. prism_evidence_level → Verify L3+
3. prism_master_checkpoint → Final save
4. Desktop Commander → Update CURRENT_STATE.json
5. prism_session_end_full → Complete protocol
```

### COMPACTION RECOVERY
```
prism_compaction_detect → view /mnt/transcripts/[latest].txt → prism_state_reconstruct
```

### STATE FILES
- `C:\PRISM\state\CURRENT_STATE.json`
- `C:\PRISM\state\ROADMAP_TRACKER.json`
- `C:\PRISM\state\HOOK_REGISTRY.json`
- `C:\PRISM\state\HOOK_AGENT_MATRIX.json`

### RESOURCE INVENTORY (v2.9)
| Resource | Count |
|----------|-------|
| MCP Tools | 277 |
| Skills | 153 |
| Agents | 69 (21 OPUS, 39 SONNET, 9 HAIKU) |
| Hooks | 7,114 (41 Phase0) |
| Formulas | 490 |
| Materials | 1,047 × 127 params |
| Machines | 824 × 43 mfrs |
| Alarms | 9,200 × 12 families |

---
**v8.0** | 277 MCP Tools | 25 Categories | Hook-First | S(x)≥0.70 HARD BLOCK
