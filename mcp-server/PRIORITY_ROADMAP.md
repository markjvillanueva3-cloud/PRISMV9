# PRISM PRIORITY ROADMAP v1.0
## Authoritative Implementation Roadmap
## Updated: 2026-02-03

---

## 📊 CURRENT STATUS

| Metric | Current | Target | Gap |
|--------|---------|--------|-----|
| **MCP Tools** | 55 | 277 | 222 (80%) |
| **Hooks** | 25 | 7,114 | 7,089 (99.6%) |
| **Materials** | 818 | 3,518 | 2,700 (77%) |
| **Machines** | 0 | 824 | 824 (100%) |
| **Formulas** | 10 | 490 | 480 (98%) |

**Current Session:** 22  
**Current Phase:** P0 - Critical Infrastructure  
**Overall Progress:** 0/26 tasks (0%)

---

## 🔴 P0: CRITICAL INFRASTRUCTURE (Sessions 22-24)
**Priority:** CRITICAL | **Est. Hours:** 9

### P0-001: Fix Dual Hook System Bridge
**Status:** ⬜ NOT STARTED | **Sessions:** 1

**Problem:** Python MCP server has cognitive hooks (BAYES-*, CTX-*, OPT-*), TypeScript MCP server has Phase 0 hooks (CALC-*, FILE-*, STATE-*). They don't communicate.

**Deliverables:**
- [ ] Hook bridge implementation (`src/hooks/hookBridge.ts`)
- [ ] `prism_hook_fire` works on ALL hook types
- [ ] Test coverage for bridge

---

### P0-002: Load Machines Registry
**Status:** ⬜ NOT STARTED | **Sessions:** 1

**Problem:** 824 machines across 43 manufacturers not accessible via MCP.

**Deliverables:**
- [ ] 824 machines accessible via `prism:machine_get/search`
- [ ] Machine capability queries working
- [ ] Update `MachineRegistry.ts`

---

### P0-003: Complete Formulas Registry
**Status:** ⬜ NOT STARTED | **Sessions:** 1

**Problem:** Only 10/490 formulas loaded. 98% missing.

**Deliverables:**
- [ ] 490 formulas accessible via `prism:formula_get/calculate`
- [ ] All physics formulas working (Kienzle, Taylor, Johnson-Cook, etc.)

---

## 🟡 P1: CONTEXT ENGINEERING (Sessions 25-29)
**Priority:** HIGH | **Est. Hours:** 15

### P1-001: Context Compression Tools (Law 3)
**Status:** ⬜ NOT STARTED | **Sessions:** 2

**Problem:** Sessions end prematurely due to context overflow. No compression mechanism.

**Deliverables:**
- [ ] `prism_context_compress` - externalize at 80% threshold
- [ ] `prism_context_expand` - restore on demand
- [ ] `prism_context_size` - monitor usage
- [ ] Auto-trigger at 80% context

---

### P1-002: ILP Combination Engine (F-PSI-001)
**Status:** ⬜ NOT STARTED | **Sessions:** 3 | **Depends:** P0-003

**Problem:** No programmatic resource optimization. Manual skill/agent selection.

**Formula:**
```
Ψ(T,R) = argmax [ Σᵢ Cap(rᵢ,T) × Syn(R) × Ω(R) × K(R) / Cost(R) ]
```

**Deliverables:**
- [ ] `prism_combination_optimize` - optimal resource selection
- [ ] `F-RESOURCE-001` capability scoring
- [ ] `F-SYNERGY-001` synergy calculation
- [ ] `F-COVERAGE-001` coverage scoring
- [ ] Optimality proof certificates (OPTIMAL/NEAR_OPTIMAL/GOOD/HEURISTIC)

---

## 🟢 P2: STATE & WORKFLOW (Sessions 30-33)
**Priority:** MEDIUM | **Est. Hours:** 12

### P2-001: Append-Only State Pattern
**Status:** ⬜ NOT STARTED | **Sessions:** 2

**Problem:** Current state overwrites previous. Work lost on compaction.

**Deliverables:**
- [ ] `prism_state_append` - add immutable entry
- [ ] `prism_state_restore` - restore from any point
- [ ] `prism_state_replay` - replay decision chain
- [ ] Full recovery in <30 seconds

---

### P2-002: Tool Masking State Machine (Law 2)
**Status:** ⬜ NOT STARTED | **Sessions:** 2 | **Depends:** P0-001

**Problem:** All tools available all the time. No safety by workflow phase.

**State Machine:**
```
BRAINSTORM  → read-only tools
PLANNING    → read + plan tools  
EXECUTION   → ALL tools
VALIDATION  → safety + read only
ERROR       → recovery tools only
```

**Deliverables:**
- [ ] `prism_tool_mask` - set tool availability
- [ ] `prism_workflow_phase` - transition phases
- [ ] Phase-based tool masking

---

## 🔵 P3: INTELLIGENCE EXTRACTION (Sessions 34-41)
**Priority:** NORMAL | **Est. Hours:** 24

### P3-001: rules_engine.js → prism-rules-engine
**Status:** ⬜ NOT STARTED | **Sessions:** 2

Extract 5,500 lines of domain-specific decision logic from monolith.

---

### P3-002: machining_rules.js → prism-manufacturing-wisdom
**Status:** ⬜ NOT STARTED | **Sessions:** 2

Extract 4,200 lines of 25+ years machining heuristics.

---

### P3-003: constraint_engine.js → prism-constraint-validator
**Status:** ⬜ NOT STARTED | **Sessions:** 1

Extract 2,400 lines of validation logic.

---

### P3-004: operation_sequencer.js → prism-workflow-optimizer
**Status:** ⬜ NOT STARTED | **Sessions:** 1

Extract 3,200 lines of workflow optimization.

---

### P3-005: Complete Material IDs
**Status:** ⬜ NOT STARTED | **Sessions:** 2

Generate material_id for remaining 2,700 materials.

---

## ⚪ P4: EXTERNAL INTEGRATIONS (Sessions 42-45)
**Priority:** LOW | **Est. Hours:** 12

### P4-001: Obsidian Integration
- [ ] `prism_obsidian_sync`
- [ ] `prism_obsidian_create`
- [ ] `prism_obsidian_search`

### P4-002: Excel/DuckDB Integration
- [ ] `prism_excel_read/write/sync`
- [ ] `prism_db_query/analyze`

---

## 📋 SESSION START PROTOCOL

```
1. prism:prism_gsd_core                    # Get instructions
2. Desktop Commander: Read PRIORITY_ROADMAP.json
3. Find current task (status: NOT_STARTED in current phase)
4. prism:prism_sp_brainstorm               # MANDATORY before implementation
5. Execute task
6. Update PRIORITY_ROADMAP.json status
7. prism:prism_cognitive_check             # Verify Ω(x) ≥ 0.70
```

---

## 🔄 UPDATING THIS ROADMAP

### Mark Task Complete
```json
// In PRIORITY_ROADMAP.json, change:
"status": "NOT_STARTED"
// to:
"status": "COMPLETE",
"completedDate": "2026-02-XX",
"completedSession": XX
```

### Add Blocker
```json
"blockers": ["Description of blocker"]
```

### Update Progress
```json
"overallProgress": {
  "completed": X,
  "total": 26,
  "percentage": XX
}
```

---

## 📁 FILE LOCATIONS

| File | Purpose |
|------|---------|
| `C:\PRISM\mcp-server\PRIORITY_ROADMAP.json` | Programmatic tracking |
| `C:\PRISM\mcp-server\PRIORITY_ROADMAP.md` | Human-readable |
| `C:\PRISM\state\CURRENT_STATE.json` | Session state |

---

**Last Updated:** 2026-02-03 | **Version:** 1.0.0
