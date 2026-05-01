# PRISM Manufacturing Intelligence - Claude Project Instructions v9.0

## CRITICAL SAFETY
PRISM is **safety-critical CNC software**. Wrong calculations = explosions/injuries/death.
Mathematical certainty required. NO shortcuts. NO placeholders.

## SESSION 26 STATUS (2026-02-04)
✅ AutoPilot V2 WORKING - Full orchestration operational
✅ SkillRegistry/ScriptRegistry bugs FIXED
✅ 277 MCP tools operational (3 autopilot variants)
⏳ Material_id generation for 2,700 materials (next priority)

## WORKING MCP TOOLS (Verified 2026-02-04)

### ✅ CALCULATIONS (8 Tools - Use These!)
```
prism:calc_cutting_force    # Kienzle: Fc = kc1.1 × h^mc × b
prism:calc_tool_life        # Taylor: VT^n = C
prism:calc_mrr              # MRR = ap × ae × Vf
prism:calc_surface_finish   # Ra calculation
prism:calc_power            # Spindle power
prism:calc_deflection       # Tool deflection
prism:calc_stability        # Chatter stability
prism:calc_thermal          # Temperature effects
```

### ✅ DATA ACCESS (Working Registries)
```
prism:alarm_search          # 10,033 alarms loaded ✓
prism:alarm_decode          # Decode by controller/code
prism:material_search       # 818 materials (partial - 3,518 target)
prism:agent_list            # 75 agents across 3 tiers
prism:skill_list            # 153 skills consolidated
prism:hook_list             # 25 hooks registered
prism:script_search         # 322 scripts available
```

### ✅ SESSION MANAGEMENT (Core Workflow)
```
prism:prism_gsd_core        # START HERE - Get instructions
prism:prism_gsd_quick       # Quick reference
prism:prism_quick_resume    # Fast session continuation
prism:prism_todo_update     # Anchor attention every 5-8 ops
prism:prism_cognitive_check # Compute Ω(x) quality score
prism:prism_state_load      # Load CURRENT_STATE.json
prism:prism_state_save      # Save state before handoff
```

### ✅ ORCHESTRATION (AutoPilot Suite)
```
prism:prism_autopilot_v2    # NEW: Task classification → tool selection
prism:prism_autopilot       # Full: GSD→STATE→BRAINSTORM→EXECUTE→RALPH
prism:prism_autopilot_quick # Minimal workflow for simple tasks
prism:prism_sp_brainstorm   # MANDATORY before implementation
prism:prism_ralph_loop      # 3x scrutinize/improve/validate
```

### ✅ SUPERPOWERS WORKFLOW (Development Protocol)
```
prism:prism_sp_brainstorm      # Design with 7 lenses
prism:prism_sp_plan            # Task breakdown with checkpoints
prism:prism_sp_execute         # Monitored execution
prism:prism_sp_review_spec     # Specification compliance
prism:prism_sp_review_quality  # Code quality + S(x) check
prism:prism_sp_debug           # 4-phase debugging
prism:prism_sp_verification    # L5 evidence completion proof
```

### ✅ VALIDATION TOOLS
```
prism:validate_material        # Comprehensive material validation
prism:validate_kienzle         # Kienzle coefficient ranges
prism:validate_taylor          # Taylor coefficient ranges
prism:validate_johnson_cook    # Johnson-Cook parameters
prism:validate_safety          # S(x) safety score computation
prism:validate_completeness    # 127-parameter coverage check
prism:validate_anti_regression # Count verification before replace
```

### ✅ HOOK SYSTEM (25 Hooks Available)
```
prism:prism_hook_fire          # Manual hook execution
prism:prism_hook_chain_v2      # Sequence with rollback
prism:prism_hook_status        # Active hooks dashboard
prism:prism_hook_coverage      # Coverage % by domain
prism:prism_hook_gaps          # Find unhooked operations
prism:prism_hook_enable        # Enable with audit trail
prism:prism_hook_disable       # Disable with reason
```

### ⚠️ PARTIAL/BROKEN
- `prism:material_get` → Empty results (use material_search instead)
- Material registry: 818/3,518 loaded (23% complete)

## SESSION START PROTOCOL (3 Steps)
```
1. prism:prism_gsd_core                    # Get latest instructions
2. Desktop Commander: CURRENT_STATE.json   # Load session context
3. prism:prism_todo_update                 # Anchor attention
```

## 4 HARD LAWS

| Law | Threshold | Action |
|-----|-----------|--------|
| **S(x) Safety** | ≥ 0.70 | HARD BLOCK if below |
| **No Placeholders** | 100% | Complete or don't start |
| **Anti-Regression** | New ≥ Old | Never lose data |
| **prism_sp_brainstorm** | MANDATORY | Before any implementation |

## QUALITY EQUATION

**Ω(x) = 0.25R + 0.20C + 0.15P + 0.30S + 0.10L**

| Component | Weight | Threshold |
|-----------|--------|-----------|
| R - Reasoning | 0.25 | Evidence-based decisions |
| C - Code | 0.20 | MIT patterns, clean |
| P - Process | 0.15 | Efficient workflows |
| **S - Safety** | **0.30** | **≥ 0.70 HARD BLOCK** |
| L - Learning | 0.10 | Pattern extraction |
| **Ω - Overall** | **1.00** | **≥ 0.70 Release, ≥ 0.85 Excellence** |

## BUFFER ZONES

| Zone | Tool Calls | Action | Signal |
|------|------------|--------|--------|
| 🟢 GREEN | 0-8 | Normal operation | Continue |
| 🟡 YELLOW | 9-14 | Plan checkpoint | `prism:prism_state_checkpoint` |
| 🔴 RED | 15-18 | IMMEDIATE checkpoint | `prism:prism_handoff_prepare` |
| ⚫ CRITICAL | 19+ | STOP ALL WORK | Handoff required |

## KEY PATHS
```
State:      C:\PRISM\state\CURRENT_STATE.json
Memory:     C:\PRISM\state\SESSION_MEMORY.json
Todo:       C:\PRISM\state\todo.md
MCP Server: C:\PRISM\mcp-server\
Skills:     C:\PRISM\skills-consolidated\
Scripts:    C:\PRISM\scripts\
Transcripts: /mnt/transcripts/  (compaction recovery)
```

## COMPACTION RECOVERY
```
1. Detect: Check for context gaps in conversation
2. Recover: view /mnt/transcripts/[latest].txt
3. Reconstruct: prism:prism_state_reconstruct
4. Resume: prism:prism_resume_session
```

## REGISTRY STATUS (Session 26)

| Registry | Count | Expected | Status |
|----------|-------|----------|--------|
| Alarms | 10,033 | 10,033 | ✅ Complete |
| Materials | 818 | 3,518 | ⚠️ 23% (ID gen needed) |
| Agents | 75 | 75 | ✅ Complete |
| Skills | 153 | 153 | ✅ Complete |
| Scripts | 322 | 322 | ✅ Complete |
| Hooks | 25 | 25 | ✅ Complete |

**Total MCP Tools:** 277 operational

## WORKFLOW PATTERNS

### For Calculations (Physics-Based):
```
1. prism:calc_cutting_force {material, depth, width, feed}
   → Returns: Fc, Ff, Fp, power, torque
2. prism:calc_tool_life {speed, material}
   → Returns: Tool life in minutes
3. prism:calc_power {force, speed, diameter}
   → Validate against machine spindle capacity
4. prism:validate_safety {material_data}
   → Ensures S(x) ≥ 0.70 before proceeding
```

### For Development Tasks:
```
1. prism:prism_sp_brainstorm {goal, constraints}
   → MANDATORY STOP - Get approval
2. prism:prism_sp_plan {approved_scope}
   → Task list with checkpoints
3. prism:prism_sp_execute {task, checkpoint_data}
   → Execute with buffer monitoring
4. prism:prism_sp_review_spec {deliverables, requirements}
   → Verify meets requirements
5. prism:prism_sp_review_quality {code_metrics}
   → Verify S(x) ≥ 0.70, Ω(x) ≥ 0.70
```

### For Data Lookup:
```
1. prism:alarm_search {query: "spindle", controller: "FANUC"}
   → Returns matching alarms from 10,033 database
2. prism:alarm_decode {code: "PS0001", controller: "FANUC"}
   → Returns: description, causes, fix procedure
3. prism:material_search {iso_group: "P", hardness_min: 200}
   → Returns matching materials with Kienzle coefficients
```

### For AutoPilot Tasks:
```
Option 1 - Task Classification (Recommended):
  prism:prism_autopilot_v2 {task: "description", format: "compact"}
  → Classifies task type, selects tools, executes

Option 2 - Full Workflow:
  prism:prism_autopilot {task: "description"}
  → GSD→STATE→BRAINSTORM→EXECUTE→RALPH (97% token savings)

Option 3 - Quick Tasks:
  prism:prism_autopilot_quick {task: "description"}
  → Minimal workflow, skips swarms/ralph
```

## AUTOPILOT V2 TASK TYPES

| Type | Tools Selected | Use Case |
|------|---------------|----------|
| calculation | calc_* (8 tools) | Physics computations |
| data | alarm/material/agent/skill search | Database queries |
| code | Desktop Commander, skill references | Code creation/editing |
| analysis | Web search, data tools | Research, investigation |
| orchestration | sp_brainstorm/plan/execute | Complex workflows |
| session | gsd_core, todo_update, cognitive_check | Session management |

## MARK'S SYSTEM
- **PC:** DIGITALSTORM-PC
- **Python:** `py` command or full path
- **Shell:** PowerShell (no `&&`, use `;` or cmd for chaining)
- **Working Dir:** C:\PRISM\
- **State Files:** C:\PRISM\state\

## MANUS 6 LAWS (Context Engineering)

1. **KV-Cache Stability** - `prism:prism_kv_sort_json` for deterministic serialization
2. **Mask Don't Remove** - Tools masked by state, not deleted
3. **File System as Context** - `prism:prism_memory_externalize` for unlimited memory
4. **Attention Anchoring** - `prism:prism_todo_update` every 5-8 operations
5. **Keep Wrong Stuff** - `prism:prism_error_preserve` for learning
6. **Don't Get Few-Shotted** - `prism:prism_vary_response` for diversity

## CURRENT PRIORITIES (Session 26+)

| Priority | Task | Status |
|----------|------|--------|
| P0 | Material_id generation (2,700 materials) | ⏳ Next |
| P1 | TypeScript errors (~300 non-blocking) | ⏳ Later |
| P2 | Hook performance optimization | 📋 Planned |
| P3 | Phase 7+ development | 📋 Roadmap |

## EVIDENCE LEVELS (Completion Proof)

| Level | Name | Requirements | Valid for "Complete"? |
|-------|------|--------------|----------------------|
| L1 | Claim | Statement only | ❌ No |
| L2 | Reference | Points to location | ❌ No |
| L3 | Listing | Shows item names | ⚠️ Minimum |
| L4 | Sample | Actual content excerpt | ✅ Better |
| L5 | Verified | Reproducible proof | ✅ Best |

**Minimum for "COMPLETE" = L3 across all deliverables**

## 9 VALIDATION GATES

| Gate | Check | Tool | Threshold |
|------|-------|------|-----------|
| G1 | C: accessible | File system check | PASS |
| G2 | State valid | CURRENT_STATE.json | Valid JSON |
| G3 | Input understood | Brainstorm analysis | No ambiguity |
| G4 | Skills available | prism:skill_list | Required present |
| G5 | Output on C: | Path validation | C:\PRISM\* |
| G6 | Evidence exists | Level check | ≥ L3 |
| G7 | New ≥ Old | Anti-regression | No data loss |
| G8 | S(x) ≥ 0.70 | Safety score | **HARD BLOCK** |
| G9 | Ω(x) ≥ 0.70 | Overall quality | WARN if <0.70 |

**Use:** `prism:prism_validate_gates_full` to check all gates

---
**Version:** 9.0.1 (Updated Session 26)  
**Last Updated:** 2026-02-04  
**Status:** ✅ AutoPilot V2 Operational | 277 Tools | 10,033 Alarms | 153 Skills