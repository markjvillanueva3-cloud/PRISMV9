# PRISM Project Instructions v16.0
## Safety-Critical CNC Manufacturing Intelligence
## Updated: 2026-02-02

---

## CRITICAL CONTEXT

PRISM is safety-critical CNC machining software where **wrong calculations can cause tool explosions, machine crashes, and operator injuries or death**. Every task requires mathematical certainty. NO shortcuts. NO placeholders. Lives depend on correctness.

---

## SESSION START SEQUENCE

```
1. prism_gsd_core → Get instructions
2. prism_hook_fire("STATE-BEFORE-MUTATE-001") → Fire state hook
3. Desktop Commander → Read C:\PRISM\state\CURRENT_STATE.json
4. prism_todo_update → Anchor attention on current task
```

---

## 4 ABSOLUTE LAWS

| Law | Rule | Consequence |
|-----|------|-------------|
| **1** | S(x) ≥ 0.70 | OUTPUT BLOCKED |
| **2** | No placeholders | REJECTED |
| **3** | New ≥ Old | BLOCKED (anti-regression) |
| **4** | MCP First | 277 tools before file reads |

---

## HOOK-FIRST WORKFLOW

Every operation fires hooks:
```
BRAINSTORM → PLAN → EXECUTE → REVIEW → COMPLETE
    ↓          ↓        ↓         ↓        ↓
 CALC-001   BATCH-001 AGENT-001 FORMULA-001 Ω(x)≥0.70
```

**Mandatory**: `prism_sp_brainstorm` BEFORE any implementation

---

## QUALITY EQUATION

```
Ω(x) = 0.25·R + 0.20·C + 0.15·P + 0.30·S + 0.10·L
```
- R = Reasoning | C = Code | P = Process | S = Safety | L = Learning
- **S(x) ≥ 0.70 = HARD BLOCK** (safety gate)
- **Ω(x) ≥ 0.70 = Release quality**

---

## BUFFER MANAGEMENT

| Zone | Tool Calls | Action |
|------|------------|--------|
| 🟢 GREEN | 0-8 | Normal operation |
| 🟡 YELLOW | 9-14 | Plan checkpoint |
| 🔴 RED | 15-18 | IMMEDIATE checkpoint |
| ⚫ CRITICAL | 19+ | STOP ALL WORK |

Use `prism_todo_update` every 5-8 calls to maintain attention.

---

## KEY MCP TOOLS (277 total, v2.9)

### Priority Tools
- `prism_gsd_core` - Get full instructions
- `prism_sp_brainstorm` - MANDATORY before implementation
- `prism_master_batch` - Batch 2+ similar operations
- `prism_hook_fire` - Fire hooks
- `prism_todo_update` - Anchor attention

### Data Access
- `prism_material_get/search` - 1,047 materials × 127 params
- `prism_machine_get/search` - 824 machines × 43 mfrs
- `prism_alarm_search` - 9,200 codes × 12 families
- `prism_skill_read` - 153 skills
- `prism_formula_apply` - 490 formulas
- `prism_agent_list` - 69 agents

### Hooks (18 tools)
- `prism_hook_fire` - Fire single hook
- `prism_hook_chain_v2` - Fire hook chain
- `prism_hook_status` - Current state
- `prism_hook_coverage` - Coverage report

---

## RESOURCE INVENTORY

| Resource | Count |
|----------|-------|
| MCP Tools | 277 (v2.9) |
| Skills | 153 (all with content) |
| Agents | 69 (21 OPUS, 39 SONNET, 9 HAIKU) |
| Hooks | 7,114 (41 Phase0 + 7,073 domain) |
| Formulas | 490 |
| Materials | 1,047 × 127 params |
| Machines | 824 × 43 mfrs |
| Alarms | 9,200 × 12 families |

---

## PHASE 0 HOOKS (41)

| Category | Count | Key Hook |
|----------|-------|----------|
| CALC | 12 | CALC-SAFETY-VIOLATION-001 |
| FILE | 8 | FILE-VALIDATION-FAIL-001 |
| STATE | 6 | STATE-ANTI-REGRESSION-001 |
| AGENT | 5 | AGENT-TIER-VALIDATE-001 |
| BATCH | 6 | BATCH-CHECKPOINT-001 |
| FORMULA | 4 | FORMULA-MAPE-EXCEED-001 |

---

## EVIDENCE LEVELS

Minimum for COMPLETE: **L3 (Sample)**

| Level | Name | Sufficient |
|-------|------|------------|
| L1 | Claim | ❌ |
| L2 | Listing | ❌ |
| L3 | Sample | ✅ |
| L4 | Reproducible | ✅ |
| L5 | Verified | ✅ |

---

## VALIDATION GATES

| Gate | Check | Consequence |
|------|-------|-------------|
| G1-G7 | Standard checks | ❌ Fail |
| **G8** | **S(x) ≥ 0.70** | **HARD BLOCK** |
| G9 | Ω(x) ≥ 0.70 | WARN |

---

## SESSION END

```
1. prism_cognitive_check → Compute final Ω(x)
2. prism_master_checkpoint → Save progress
3. Desktop Commander → Update CURRENT_STATE.json
4. prism_session_end_full → Complete protocol
```

---

## COMPACTION RECOVERY

```
prism_compaction_detect → view /mnt/transcripts/[latest].txt → prism_state_reconstruct
```

---

## CORE PRINCIPLES

1. **MCP-FIRST**: Use 277 MCP tools before reading files
2. **HOOK-FIRST**: Every operation fires appropriate hooks
3. **SAFETY-FIRST**: S(x) ≥ 0.70 or output blocked
4. **ANTI-REGRESSION**: New ≥ Old always
5. **100% UTILIZATION**: If it exists, use it everywhere
6. **EVIDENCE-BASED**: L3+ required for completion claims

---

## MARK'S SYSTEM

- Python: `C:\Users\Admin.DIGITALSTORM-PC\AppData\Local\Programs\Python\Python312\python.exe`
- PC: DIGITALSTORM-PC
- User: Admin
- Use "py" command or full path for scripts

---

**PRISM v2.9** | 277 MCP Tools | Hook-First | Safety-Critical CNC
