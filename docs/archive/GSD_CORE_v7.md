# PRISM GSD Core v7.0
## Get Shit Done - 190 MCP Tools Edition

### SESSION START
```
1. prism_gsd_core → Instructions (THIS FILE)
2. Desktop Commander → C:\PRISM\state\CURRENT_STATE.json
3. prism_cognitive_init → Initialize Bayesian priors
4. prism_todo_update → Anchor attention
```

### 4 LAWS (HARD REQUIREMENTS)
| Law | Rule | Consequence |
|-----|------|-------------|
| **S(x)≥0.70** | Safety score must pass | OUTPUT BLOCKED |
| **No placeholders** | 100% complete or N/A | REJECTED |
| **New≥Old** | Never lose data | BLOCKED |
| **MCP First** | 190 tools before files | EFFICIENCY |

### SUPERPOWERS WORKFLOW
```
BRAINSTORM → PLAN → EXECUTE → REVIEW → COMPLETE
    ↓         ↓        ↓         ↓
 APPROVAL  CHECKPOINTS  BUFFER   Ω(x)
 REQUIRED  ASSIGNED    MONITOR   ≥0.70
```

**Tools:**
- `prism_sp_brainstorm` - MANDATORY STOP before implementation
- `prism_sp_plan` - Create checkpointed plan
- `prism_sp_execute` - Execute with buffer monitoring
- `prism_sp_review_spec` - Stage 1: Requirements
- `prism_sp_review_quality` - Stage 2: Quality + Safety
- `prism_sp_debug` - 4-phase: EVIDENCE→ROOT→HYPOTHESIS→FIX

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

R = Reasoning (completeness, logic)
C = Code quality (patterns, style)
P = Process adherence (checkpoints, workflow)
S = Safety (HARD BLOCK if <0.70)
L = Learning (patterns, improvements)
```

### KEY MCP TOOLS (190 total)

**GSD (4)**
| Tool | Use |
|------|-----|
| prism_gsd_core | Full instructions |
| prism_gsd_quick | Minimal essentials |
| prism_dev_protocol | Development workflow |
| prism_resources_summary | Resource counts |

**Master (6)**
| Tool | Use |
|------|-----|
| prism_master_status | System status |
| prism_master_context | Context pressure |
| prism_master_batch | Batch 2+ operations |
| prism_master_checkpoint | Create checkpoint |
| prism_master_swarm | Multi-agent execution |
| prism_master_call | Call any tool |

**Development Protocol (24)**
| Tool | Use |
|------|-----|
| prism_sp_brainstorm | MANDATORY pre-implementation |
| prism_sp_plan | Create task plan |
| prism_sp_execute | Execute with monitoring |
| prism_sp_review_spec | Spec compliance |
| prism_sp_review_quality | Quality + Safety gate |
| prism_sp_debug | 4-phase debugging |
| prism_cognitive_init | Initialize session |
| prism_cognitive_check | Compute all metrics |
| prism_cognitive_bayes | Bayesian hooks |
| prism_cognitive_rl | RL policy hooks |
| prism_combination_ilp | ILP resource optimization |
| prism_session_start_full | Complete session start |
| prism_session_end_full | Complete session end |
| prism_evidence_level | Track evidence L1-L5 |
| prism_validate_gates_full | All 9 gates |
| prism_validate_mathplan | MATHPLAN gate |

**Context Engineering (14) - Manus 6 Laws**
| Tool | Law | Use |
|------|-----|-----|
| prism_kv_sort_json | 1 | Deterministic JSON |
| prism_kv_check_stability | 1 | Check prefix stability |
| prism_tool_mask_state | 2 | Tool availability |
| prism_memory_externalize | 3 | Write to file system |
| prism_memory_restore | 3 | Restore from file |
| prism_todo_update | 4 | Attention anchoring |
| prism_todo_read | 4 | Read current focus |
| prism_error_preserve | 5 | Keep errors for learning |
| prism_error_patterns | 5 | Analyze error patterns |
| prism_vary_response | 6 | Prevent mimicry |
| prism_team_spawn | TT | Create agent team |
| prism_team_broadcast | TT | Team message |
| prism_team_create_task | TT | Task with dependencies |
| prism_team_heartbeat | TT | 30s heartbeat |

**Data Access**
| Tool | Data |
|------|------|
| prism_material_get | 1,047 materials × 127 params |
| prism_machine_get | 824 machines × 43 mfrs |
| prism_alarm_search | 9,200 alarm codes |
| prism_skill_read | 146 skills |
| prism_formula_apply | 490 formulas |
| prism_hook_search | 6,917 hooks |
| prism_agent_list | 64 agents |

### MANUS 6 LAWS
1. **KV-Cache Stability** - Timestamps at END, sorted JSON
2. **Mask Don't Remove** - Tools masked, not removed
3. **File System as Context** - Files = unlimited memory
4. **Attention via Recitation** - Update todo.md every 5-8 calls
5. **Keep Wrong Stuff** - Errors are learning signals
6. **Don't Get Few-Shotted** - Vary responses

### EVIDENCE LEVELS
| Level | Name | Requirement |
|-------|------|-------------|
| L1 | CLAIM | Just stated |
| L2 | LISTING | Items listed |
| L3 | SAMPLE | Content shown |
| L4 | REPRODUCIBLE | Steps provided |
| L5 | VERIFIED | Independently confirmed |

**Minimum for COMPLETE: L3**

### 9 VALIDATION GATES
| Gate | Check | Block |
|------|-------|-------|
| G1 | C: accessible | ❌ |
| G2 | State valid | ❌ |
| G3 | Input understood | ❌ |
| G4 | Skills available | ❌ |
| G5 | Output on C: | ❌ |
| G6 | Evidence exists | ❌ |
| G7 | New ≥ Old | ❌ |
| **G8** | **S(x) ≥ 0.70** | **HARD BLOCK** |
| G9 | Ω(x) ≥ 0.70 | WARN |

### SESSION END
```
1. prism_cognitive_check → Final Ω(x)
2. prism_evidence_level → Verify L3+
3. prism_master_checkpoint → Final checkpoint
4. Desktop Commander → Update CURRENT_STATE.json
5. prism_session_end_full → Complete protocol
```

### COMPACTION RECOVERY
```
prism_compaction_detect → Check if compacted
view /mnt/transcripts/[latest].txt → Read history
prism_state_reconstruct → Rebuild from transcript
prism_session_resume → Continue work
```

### QUICK REFERENCE
```
BATCH:      prism_master_batch (2+ similar ops)
SWARM:      prism_master_swarm (multi-agent)
CHECKPOINT: prism_master_checkpoint (>60% context)
PRESSURE:   prism_master_context (check level)
SKILLS:     prism_skill_select (optimal skill)
FORMULAS:   prism_formula_apply (physics)
ILP:        prism_combination_ilp (resource optimization)
```

---
**v7.0** | 190 MCP Tools | 25 Categories | S(x)≥0.70 HARD BLOCK
