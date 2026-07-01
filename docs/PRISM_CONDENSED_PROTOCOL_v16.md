# PRISM MCP-FIRST PROTOCOL v3.0
## Hook-First Architecture | 277 MCP Tools | Updated 2026-02-02

## RULE 1: MCP OVER FILES
277 tools v2.9. NEVER read files when MCP exists.

## SESSION START
```
1. prism_gsd_core → Instructions
2. prism_hook_fire("STATE-BEFORE-MUTATE-001") → Fire hook
3. Desktop Commander → C:\PRISM\state\CURRENT_STATE.json
4. prism_todo_update → Anchor attention
```

## 4 LAWS (HARD REQUIREMENTS)
| # | Law | Consequence |
|---|-----|-------------|
| 1 | S(x)≥0.70 | OUTPUT BLOCKED |
| 2 | No placeholders | REJECTED |
| 3 | New≥Old | BLOCKED |
| 4 | MCP First | 277 tools before files |

## HOOK-FIRST WORKFLOW
```
BRAINSTORM → PLAN → EXECUTE → REVIEW → COMPLETE
     ↓          ↓        ↓        ↓        ↓
  CALC-001  BATCH-001 AGENT-001 FORMULA-001 Ω(x)
  (hooks)   (hooks)   (hooks)   (hooks)    ≥0.70
```

**Workflow Tools:**
- `prism_sp_brainstorm` - MANDATORY before implementation
- `prism_sp_plan` - Create checkpointed plan
- `prism_sp_execute` - Execute with buffer monitoring
- `prism_sp_review_spec` - Stage 1: Requirements (R(x)≥0.80)
- `prism_sp_review_quality` - Stage 2: Quality + Safety gate

**Hook Tools:**
- `prism_hook_fire` - Fire individual hook
- `prism_hook_chain_v2` - Fire hook chain
- `prism_hook_status` - Check hook state
- `prism_hook_coverage` - Coverage report

## BUFFER ZONES
| Zone | Calls | Action |
|------|-------|--------|
| 🟢 | 0-8 | Normal |
| 🟡 | 9-14 | Plan checkpoint |
| 🔴 | 15-18 | IMMEDIATE checkpoint |
| ⚫ | 19+ | **STOP ALL WORK** |

## CONTEXT PRESSURE
| Level | % | Action |
|-------|---|--------|
| GREEN | 0-60 | Normal |
| YELLOW | 60-75 | prism_master_batch |
| ORANGE | 75-85 | prism_master_checkpoint |
| RED | 85-92 | Prepare handoff |
| CRITICAL | >92 | **STOP** |

## MASTER EQUATION
```
Ω(x) = 0.25R + 0.20C + 0.15P + 0.30S + 0.10L
       ↑       ↑       ↑       ↑       ↑
    Reason   Code   Process Safety  Learn
```
**S(x)≥0.70 = HARD BLOCK** | Ω(x)≥0.70 = Release quality

## KEY MCP TOOLS (277 total)

### Master (6)
| Tool | Use |
|------|-----|
| `prism_master_batch` | 2+ similar ops |
| `prism_master_swarm` | Multi-agent |
| `prism_master_checkpoint` | Save progress |
| `prism_master_context` | Check pressure |

### Hooks (18) - HOOK-FIRST ARCHITECTURE
| Tool | Use |
|------|-----|
| `prism_hook_fire` | Fire single hook |
| `prism_hook_chain_v2` | Fire hook chain |
| `prism_hook_status` | Hook state |
| `prism_hook_coverage` | Coverage report |
| `prism_hook_gaps` | Find missing hooks |

### Development Protocol (24)
| Tool | Use |
|------|-----|
| `prism_sp_brainstorm` | MANDATORY pre-impl |
| `prism_sp_plan` | Task plan |
| `prism_cognitive_check` | Compute Ω(x) |
| `prism_validate_gates` | All 9 gates |

### Context Engineering (14) - Manus 6 Laws
| Tool | Law | Use |
|------|-----|-----|
| `prism_todo_update` | 4 | Attention anchor (every 5-8) |
| `prism_error_preserve` | 5 | Keep errors for learning |
| `prism_memory_externalize` | 3 | File system = memory |

### Data Access
| Tool | Data |
|------|------|
| `prism_material_get/search` | 1,047 materials × 127 params |
| `prism_machine_get/search` | 824 machines × 43 mfrs |
| `prism_alarm_search` | 9,200 codes × 12 families |
| `prism_skill_read/list` | 153 skills (all content) |
| `prism_formula_apply/list` | 490 formulas |
| `prism_agent_list/select` | 69 agents (21/39/9) |
| `prism_hook_list/search` | 7,114 hooks |

### GSD (6)
| Tool | Use |
|------|-----|
| `prism_gsd_core` | Full instructions |
| `prism_gsd_quick` | Minimal reference |
| `prism_quick_resume` | Fast continuation |

## PHASE 0 HOOKS (41 total)
| Category | Count | Safety Hook |
|----------|-------|-------------|
| CALC | 12 | CALC-SAFETY-VIOLATION-001 blocks S(x)<0.70 |
| FILE | 8 | FILE-VALIDATION-FAIL-001 |
| STATE | 6 | STATE-ANTI-REGRESSION-001 |
| AGENT | 5 | AGENT-TIER-VALIDATE-001 |
| BATCH | 6 | BATCH-CHECKPOINT-001 |
| FORMULA | 4 | FORMULA-MAPE-EXCEED-001 |

## MANUS 6 LAWS
1. **KV-Cache Stability** - Timestamps at END
2. **Mask Don't Remove** - Tools masked not removed
3. **File System as Context** - Files = unlimited memory
4. **Attention via Recitation** - prism_todo_update every 5-8
5. **Keep Wrong Stuff** - Errors are learning signals
6. **Don't Get Few-Shotted** - Vary responses

## EVIDENCE LEVELS
| Level | Name | Min for Complete |
|-------|------|------------------|
| L1 | Claim | ❌ |
| L2 | Listing | ❌ |
| **L3** | **Sample** | **✅ MINIMUM** |
| L4 | Reproducible | ✅ |
| L5 | Verified | ✅ |

## 9 VALIDATION GATES
| Gate | Check | Block |
|------|-------|-------|
| G1-G7 | Standard | ❌ |
| **G8** | **S(x)≥0.70** | **HARD BLOCK** |
| G9 | Ω(x)≥0.70 | WARN |

## SESSION END
```
1. prism_cognitive_check → Final Ω(x)
2. prism_evidence_level → Verify L3+
3. prism_master_checkpoint → Final save
4. Desktop Commander → Update CURRENT_STATE.json
5. prism_session_end_full → Complete
```

## COMPACTION RECOVERY
```
prism_compaction_detect → view /mnt/transcripts/[latest].txt → prism_state_reconstruct
```

## STATE FILES (Desktop Commander)
- `C:\PRISM\state\CURRENT_STATE.json`
- `C:\PRISM\state\ROADMAP_TRACKER.json`
- `C:\PRISM\state\HOOK_REGISTRY.json`

## RESOURCE INVENTORY (v2.9)
| Resource | Count |
|----------|-------|
| MCP Tools | 277 |
| Skills | 153 (all content) |
| Agents | 69 (21 OPUS, 39 SONNET, 9 HAIKU) |
| Hooks | 7,114 (41 Phase0 + 7,073 domain) |
| Formulas | 490 |
| Materials | 1,047 × 127 params |
| Machines | 824 × 43 mfrs |
| Alarms | 9,200 × 12 families |

---
**PRISM v2.9** | 277 MCP Tools | 25 Categories | Hook-First | Safety-Critical CNC
