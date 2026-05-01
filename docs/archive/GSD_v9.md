# PRISM GSD (Get Shit Done) v9.0 - Hook-First Architecture

## 🎯 START HERE - Session Initialization

### MANDATORY 3-STEP START
```
1. prism:prism_gsd_core              → Load this document
2. Desktop Commander: CURRENT_STATE.json → Session context
3. prism:prism_todo_update           → Anchor attention
```

## 🔥 5 HARD LAWS (Non-Negotiable)

| Law | Rule | Enforcement |
|-----|------|-------------|
| 1. **S(x)≥0.70** | Safety score HARD BLOCK | prism:validate_safety |
| 2. **No placeholders** | 100% complete deliverables | Evidence Level ≥ L3 |
| 3. **New≥Old** | Never lose data on updates | prism:validate_anti_regression |
| 4. **MCP First** | 277 tools before file operations | Tool priority list |
| 5. **HOOK EVERYTHING** | Every operation fires hooks | prism:prism_hook_fire |

## 🪝 HOOK-FIRST ARCHITECTURE

Every operation triggers validation hooks automatically:

### Hook Lifecycle
```
BEFORE → Validation, safety checks, range verification
DURING → Monitoring, progress tracking, resource usage
AFTER  → Logging, metrics, dependent system updates
ERROR  → Recovery, rollback, escalation, preservation
```

### Hook Categories (25 Available)

| Category | Count | Purpose | Tools |
|----------|-------|---------|-------|
| System | 5 | Core infrastructure | SYS-LAW1 through SYS-LAW6 |
| Cognitive | 5 | AI/ML patterns | BAYES-001, OPT-001, RL-001 |
| Context | 4 | Memory management | CTX-*, RES-* |
| Data | 3 | Database operations | - |
| Agent | 3 | Multi-agent coordination | - |
| External | 5 | Tool integrations | - |

### Hook Firing Tools

```
prism:prism_hook_fire        → Manual hook execution with data
prism:prism_hook_chain_v2    → Sequence with rollback support
prism:prism_hook_status      → Active hooks dashboard + metrics
prism:prism_hook_coverage    → Coverage % by domain
prism:prism_hook_gaps        → Find unhooked operations
prism:prism_hook_enable      → Enable with audit trail
prism:prism_hook_disable     → Disable with required reason
prism:prism_hook_history     → Recent execution history (last 50)
prism:prism_hook_failures    → Debug failure patterns
```

## 🚀 SUPERPOWERS WORKFLOW (Development Protocol)

### The 6-Phase Process

```
BRAINSTORM → PLAN → EXECUTE → REVIEW-SPEC → REVIEW-QUALITY → VERIFY
```

#### Phase 1: BRAINSTORM (MANDATORY STOP)
```
Tool: prism:prism_sp_brainstorm {goal, constraints, context}
```
- **7 Superpowers Lenses Applied:**
  1. CHALLENGE - Question assumptions
  2. MULTIPLY - Generate 3+ alternatives
  3. INVERT - Consider opposite approaches
  4. FUSE - Cross-domain solutions
  5. TENX - 10x improvement thinking
  6. SIMPLIFY - Minimum viable approach
  7. FUTURE - Adaptability and scale

- **Hooks Fired:**
  - OPT-001: Optimization analysis
  - CALC-BEFORE-EXEC-001: Pre-execution validation

- **Output:** 3-chunk design (Scope → Approach → Details)
- **Gate:** WAIT FOR APPROVAL before proceeding

#### Phase 2: PLAN
```
Tool: prism:prism_sp_plan {approved_scope, approved_approach, complexity}
```
- Creates task list with 2-5 minute chunks
- Adds checkpoints every 5-8 operations
- Estimates tool calls and buffer zones
- **Hooks Fired:** BATCH-BEFORE-EXEC-001

#### Phase 3: EXECUTE
```
Tool: prism:prism_sp_execute {task, checkpoint_data, current_tool_calls}
```
- Monitors buffer zones (GREEN/YELLOW/RED/CRITICAL)
- Auto-checkpoints at thresholds
- Evidence capture (≥L3 required)
- **Hooks Fired:** AGENT-BEFORE-SPAWN-001, STATE-CHECKPOINT-001

#### Phase 4: REVIEW-SPEC (Specification Compliance)
```
Tool: prism:prism_sp_review_spec {deliverables, requirements, scope_check}
```
- Verifies output matches requirements
- Detects scope creep (too much/too little)
- **Hooks Fired:** CALC-AFTER-EXEC-001

#### Phase 5: REVIEW-QUALITY (Code & Safety)
```
Tool: prism:prism_sp_review_quality {code_structured, patterns, safety_score}
```
- Code quality checks
- Pattern consistency (MIT standards)
- **S(x) ≥ 0.70 HARD BLOCK** enforcement
- **Hooks Fired:** CALC-SAFETY-VIOLATION-001 (if S(x)<0.70)

#### Phase 6: VERIFY (Completion Proof)
```
Tool: prism:prism_sp_verification {claims, deliverables}
```
- Evidence Level ≥ L3 required
- Count verification (anti-regression)
- L5 verification for "COMPLETE" status

## 📊 MASTER EQUATION

**Ω(x) = 0.25R + 0.20C + 0.15P + 0.30S + 0.10L**

### Components

| Symbol | Component | Weight | Computed By | Threshold |
|--------|-----------|--------|-------------|-----------|
| R(x) | Reasoning | 0.25 | Evidence quality, logic validity | - |
| C(x) | Code Quality | 0.20 | Patterns, structure, clarity | - |
| P(x) | Process | 0.15 | Workflow efficiency | - |
| **S(x)** | **Safety** | **0.30** | **Physics validation** | **≥0.70 BLOCK** |
| L(x) | Learning | 0.10 | Pattern extraction | - |
| **Ω(x)** | **Overall** | **1.00** | **Weighted sum** | **≥0.70 Release** |

### Quality Computation
```
Tool: prism:prism_cognitive_check {overrides optional}
Returns: All component scores + Ω(x)
```

## 🎛️ BUFFER ZONES (Context Pressure)

| Zone | Tool Calls | Color | Action | Tool |
|------|------------|-------|--------|------|
| GREEN | 0-8 | 🟢 | Normal operation | Continue |
| YELLOW | 9-14 | 🟡 | Plan checkpoint | Alert + prepare |
| RED | 15-18 | 🔴 | IMMEDIATE checkpoint | prism:prism_state_checkpoint |
| CRITICAL | 19+ | ⚫ | STOP ALL WORK | prism:prism_handoff_prepare |

### Checkpoint Protocol
```
Every 5-8 operations:
1. prism:prism_todo_update {progress, next_action}
2. prism:prism_state_checkpoint {completed, next}
3. Desktop Commander: Save critical files
```

## 🛠️ KEY TOOLS BY CATEGORY (277 Total)

### Calculations (8 tools) - Physics Engine
```
prism:calc_cutting_force    # Kienzle model: Fc = kc1.1 × h^mc × b
prism:calc_tool_life        # Taylor: VT^n = C
prism:calc_mrr              # Material removal rate
prism:calc_power            # Spindle power requirements
prism:calc_surface_finish   # Ra prediction
prism:calc_deflection       # Tool deflection analysis
prism:calc_stability        # Chatter stability lobes
prism:calc_thermal          # Temperature effects
```

### Data Access (Registries)
```
prism:alarm_search          # 10,033 alarms across 12 controllers
prism:alarm_decode          # Detailed alarm information
prism:material_search       # 818 materials (3,518 target)
prism:agent_list            # 75 agents (21 OPUS, 39 SONNET, 9 HAIKU)
prism:skill_list            # 153 skills consolidated
prism:hook_list             # 25 hooks available
prism:script_search         # 322 automation scripts
```

### Session Management
```
prism:prism_gsd_core        # Load instructions (THIS FILE)
prism:prism_gsd_quick       # Quick reference
prism:prism_quick_resume    # Fast session continuation
prism:prism_todo_update     # Attention anchoring (every 5-8 ops)
prism:prism_state_load      # Load CURRENT_STATE.json
prism:prism_state_save      # Save state before handoff
prism:prism_cognitive_check # Compute Ω(x)
```

### AutoPilot Suite (Orchestration)
```
prism:prism_autopilot_v2    # Task classification → tool selection
prism:prism_autopilot       # Full: GSD→STATE→BRAINSTORM→EXECUTE→RALPH
prism:prism_autopilot_quick # Minimal workflow for simple tasks
```

### Development Protocol (Superpowers)
```
prism:prism_sp_brainstorm      # 7 lenses + 3-chunk design
prism:prism_sp_plan            # Task breakdown
prism:prism_sp_execute         # Monitored execution
prism:prism_sp_review_spec     # Specification gate
prism:prism_sp_review_quality  # Quality + S(x) gate
prism:prism_sp_verification    # Completion proof (L3-L5)
prism:prism_sp_debug           # 4-phase debugging
```

### Validation
```
prism:validate_material        # Comprehensive validation
prism:validate_safety          # S(x) computation
prism:validate_anti_regression # Count check before replace
prism:validate_kienzle         # Coefficient range validation
prism:validate_taylor          # Taylor parameter validation
```

## 🎭 MANUS 6 LAWS (Context Engineering)

### Law 1: KV-Cache Stability
```
Tool: prism:prism_kv_sort_json {data}
Rule: Alphabetic key sorting for deterministic serialization
Why: Stable prefix → maximum KV-cache reuse
```

### Law 2: Mask Don't Remove
```
Tool: prism:prism_tool_mask_state {current_state}
Rule: Tools masked by workflow state, never deleted
Why: Prevents hallucinated tool calls
```

### Law 3: File System as Context
```
Tool: prism:prism_memory_externalize {content, type}
Rule: Unlimited memory via filesystem
Types: event, decision, error, snapshot
```

### Law 4: Attention Anchoring
```
Tool: prism:prism_todo_update {current_focus, next_action}
Rule: Update todo.md every 5-8 operations
Why: Recent context = highest attention weight
```

### Law 5: Keep Wrong Stuff
```
Tool: prism:prism_error_preserve {error, context, parameters}
Rule: NEVER clean errors from context
Why: Errors are learning signals for model
```

### Law 6: Don't Get Few-Shotted
```
Tool: prism:prism_vary_response {content, variation_level}
Rule: Introduce structured variation
Why: Prevents pattern mimicry instead of reasoning
```

## 📋 EVIDENCE LEVELS

| Level | Name | Description | Valid for Complete? |
|-------|------|-------------|---------------------|
| L1 | Claim | "I did X" | ❌ Never |
| L2 | Reference | "See file Y" | ❌ Never |
| L3 | Listing | "Items: A, B, C" | ⚠️ Minimum |
| L4 | Sample | Actual content excerpt | ✅ Better |
| L5 | Verified | Reproducible proof | ✅ Best |

**Rule:** Minimum L3 across ALL deliverables to claim "COMPLETE"

## 🚪 9 VALIDATION GATES

```
Tool: prism:prism_validate_gates_full {all_parameters}
```

| Gate | Check | Threshold | Consequence |
|------|-------|-----------|-------------|
| G1 | C: accessible | TRUE | BLOCK if false |
| G2 | State valid | Valid JSON | BLOCK if invalid |
| G3 | Input understood | No ambiguity | BLOCK if unclear |
| G4 | Skills available | Required present | BLOCK if missing |
| G5 | Output on C: | C:\PRISM\* | BLOCK if elsewhere |
| G6 | Evidence exists | ≥ L3 | BLOCK if L1/L2 |
| G7 | New ≥ Old | No data loss | BLOCK if smaller |
| G8 | S(x) ≥ 0.70 | Safety score | **HARD BLOCK** |
| G9 | Ω(x) ≥ 0.70 | Overall quality | WARN if <0.70 |

## 🔄 WORKFLOW PATTERNS

### Pattern 1: Physics Calculation
```
1. prism:calc_cutting_force {material_id, depth, width, feed}
2. prism:validate_safety {material_data}
3. If S(x) < 0.70 → BLOCK
4. prism:calc_power {force, speed, diameter}
5. Validate against machine spindle capacity
```

### Pattern 2: Development Task
```
1. prism:prism_sp_brainstorm {goal, constraints}
2. WAIT FOR APPROVAL
3. prism:prism_sp_plan {approved_scope}
4. prism:prism_sp_execute {tasks}
5. prism:prism_sp_review_spec {deliverables}
6. prism:prism_sp_review_quality {code_metrics}
7. prism:prism_sp_verification {evidence}
```

### Pattern 3: Data Query
```
1. prism:alarm_search {query, controller}
2. prism:alarm_decode {code, controller}
3. Extract fix procedure
```

### Pattern 4: AutoPilot Task
```
Option A - Classification:
  prism:prism_autopilot_v2 {task, format: "compact"}

Option B - Full Workflow:
  prism:prism_autopilot {task}

Option C - Quick:
  prism:prism_autopilot_quick {task}
```

## 🎯 CURRENT SESSION STATUS

**Session:** 26 (2026-02-04)  
**Phase:** AutoPilot V2 Operational  
**Status:** ✅ COMPLETE  
**Tools:** 277 operational  
**Registries:** Alarms(10,033✅), Materials(818⚠️), Skills(153✅), Agents(75✅)

## 🔜 PRIORITIES

| P | Task | Status |
|---|------|--------|
| P0 | Material_id generation (2,700 remaining) | ⏳ Next |
| P1 | TypeScript errors (~300 non-blocking) | 📋 Planned |
| P2 | Hook performance optimization | 📋 Later |

---
**Version:** 9.0 - Hook-First Architecture  
**Updated:** 2026-02-04 Session 26  
**Tools:** 277 MCP | 25 Hooks | 153 Skills | 10,033 Alarms