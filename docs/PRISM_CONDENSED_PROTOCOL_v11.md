# PRISM CONDENSED PROTOCOL v11.0
## Quick Reference | Mathematical Certainty | ENFORCEMENT ENABLED
---

# 🔴 MANDATORY: EVERY SESSION - DO THIS FIRST

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║  ⛔ ENFORCEMENT v11.0 - MATHEMATICAL CERTAINTY REQUIRED                       ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  1. READ: C:\PRISM\state\CURRENT_STATE.json                                   ║
║  2. QUOTE: quickResume field exactly                                          ║
║  3. CHECK: IN_PROGRESS? → Resume. COMPLETE? → New task.                       ║
║  4. LOAD: C:\PRISM\data\FORMULA_REGISTRY.json                                 ║
║  5. LOAD: C:\PRISM\data\COEFFICIENT_DATABASE.json                             ║
║  6. CHECK: Calibration staleness (>30 days = alert)                           ║
║  7. MATHPLAN: Complete gate before ANY execution                              ║
║  8. SKILLS: Load relevant from C:\PRISM\skills\                               ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

# ⚡ 8 ALWAYS-ON LAWS

| # | Law | Test |
|---|-----|------|
| 1 | LIFE-SAFETY | "Would I trust this with MY life?" |
| 2 | MICROSESSIONS | Decompose BEFORE execution (15-25 items) |
| 3 | COMPLETENESS | C(T) = 1.0, no partial credit |
| 4 | ANTI-REGRESSION | New ≥ Old, always |
| 5 | PREDICTIVE | 3 failure modes + mitigations |
| 6 | CONTINUITY | State in CURRENT_STATE.json |
| 7 | VERIFICATION | 4-level chain, 95% confidence |
| 8 | **MATH EVOLUTION** | Formulas evolve, predictions logged, coefficients calibrate |

---

# 📐 MATHPLAN GATE (MANDATORY)

```
□ SCOPE:        S = [n₁ × n₂] = [EXACT TOTAL]
□ COMPLETENESS: C(T) = Σ Done(i) / n = 1.0
□ DECOMPOSE:    Σ|dᵢ| = S (prove it sums)
□ EFFORT:       [value] ± [uncertainty] calls (95% CI)
□ TIME:         [value] ± [uncertainty] min (95% CI)
□ MS_COUNT:     ⌈EFFORT/15⌉ = [N] microsessions
□ CONSTRAINTS:  C1: [math], C2: [math]...
□ ORDER:        [1,2,3...], checkpoints at [X]
□ SUCCESS:      [mathematical criteria]

ALL CHECKED? → Execute    UNCHECKED? → STOP
```

---

# 🔢 UNCERTAINTY FORMAT (MANDATORY)

```
✓ 412 ± 85 tool calls (95% CI)
✓ 27.3 ± 5.5 minutes (95% CI)
✓ 1,540 ± 0 materials (exact)

✗ 412 calls              ← NO UNCERTAINTY
✗ About 400              ← VAGUE
```

**ERROR PROPAGATION:**
- Add/Sub: σ_z = √(σ_x² + σ_y²)
- Mult/Div: σ_z/z = √[(σ_x/x)² + (σ_y/y)²]

---

# 📋 15 COMMANDMENTS

| # | Rule |
|---|------|
| 1 | USE EVERYWHERE - Min 6-8 consumers per DB |
| 2 | FUSE - Cross-domain concepts |
| 3 | WIRE FIRST - 100% consumers before import |
| 4 | VERIFY ×3 - Physics + empirical + historical |
| 5 | **UNCERTAINTY** - Value ± error (CI%) ALWAYS |
| 6 | EXPLAIN - XAI for recommendations |
| 7 | FAIL GRACEFUL - Fallbacks for everything |
| 8 | PROTECT - Validate, sanitize, backup |
| 9 | DEFENSIVE - Handle ALL edge cases |
| 10 | PERFORM - <2s load, <500ms calc |
| 11 | OPTIMIZE - Measure first |
| 12 | USER-OBSESS - 3-click rule |
| 13 | NEVER LOSE - Auto-save, undo, recover |
| 14 | LEARN - Feed _LEARNING pipeline |
| 15 | IMPROVE - Extract patterns |

---

# 📐 MASTER EQUATION (Ω v2.0)

```
Ω = 0.20·R + 0.18·C + 0.12·P + 0.28·S + 0.08·L + 0.14·M

HARD CONSTRAINTS:
  S(x) ≥ 0.70 (safety)
  M(x) ≥ 0.60 (rigor)  ← NEW

M(x) = (Uncertainty + Dimensional + Evolution + Verification) / 4
```

---

# 📍 CRITICAL PATHS

```
ROOT:           C:\PRISM\
STATE:          C:\PRISM\state\CURRENT_STATE.json
FORMULA_REG:    C:\PRISM\data\FORMULA_REGISTRY.json
COEFF_DB:       C:\PRISM\data\COEFFICIENT_DATABASE.json
PRED_LOG:       C:\PRISM\state\learning\PREDICTION_LOG.json
SKILLS:         C:\PRISM\skills\
```

**⚠️ NEVER /home/claude/ - RESETS EVERY SESSION**

---

# 🛠️ TOOLS

| Task | Tool |
|------|------|
| Read C: | `Filesystem:read_file` |
| Write C: | `Filesystem:write_file` |
| Large file | `Desktop Commander:read_file` (offset/length) |
| Append | `Desktop Commander:write_file` (mode:"append") |
| Search | `Desktop Commander:start_search` |
| Python | `Desktop Commander:start_process` |

---

# 🎯 92 SKILLS

| Level | Count | Key Skills |
|-------|-------|------------|
| L0 Always-On | 4 | deep-learning, **formula-evolution**, **uncertainty-propagation**, **mathematical-planning** |
| L1 Cognitive | 6 | universal-formulas, safety-framework, master-equation |
| L2 Workflow | 8 | sp-brainstorm, sp-execution, sp-debugging |
| L3 Domain | 16 | material-schema, monolith-extractor, session-master |
| L4 Reference | 20 | fanuc-programming, api-contracts, expert-roles |

---

# 🛡️ BUFFER ZONES

| Zone | Calls | Action |
|------|-------|--------|
| 🟢 GREEN | 0-8 | Work freely |
| 🟡 YELLOW | 9-14 | Checkpoint soon |
| 🟠 ORANGE | 15-18 | Checkpoint NOW |
| 🔴 RED | 19+ | EMERGENCY STOP |

---

# 📊 FORMULA CALIBRATION ALERTS

| Alert | Condition | Action |
|-------|-----------|--------|
| 🔴 CRITICAL | MAPE > 50% or \|Bias\| > 25% | Halt formula use |
| 🟠 WARNING | MAPE > 20% or \|Bias\| > 10% | Recalibrate in 3 sessions |
| 🟡 NOTICE | Calibration > 30 days | Review needed |
| 🟢 HEALTHY | Metrics in bounds | Continue |

---

# 📝 PREDICTION LOGGING

**EVERY estimate → Log to PREDICTION_LOG.json**

```json
{
  "predicted": {"effort": 412, "uncertainty": 85, "ci": 0.95},
  "actual": null,
  "status": "PENDING_ACTUAL"
}
```

**After completion → Record actual, compute residual**

---

# 🚀 PYTHON ORCHESTRATORS

```powershell
# Intelligent swarm (56 agents)
py -3 C:\PRISM\scripts\prism_unified_system_v4.py --intelligent "Task"

# Manufacturing analysis
py -3 C:\PRISM\scripts\prism_orchestrator_v2.py --manufacturing "Material" "Op"
```

---

# 🔄 AUTO-SKILL LOADING

| Keywords | Skills |
|----------|--------|
| brainstorm, plan | sp-brainstorm, **mathematical-planning** |
| extract, monolith | monolith-extractor |
| material, alloy | material-schema, material-physics |
| debug, fix | sp-debugging |
| formula, calibrate | **formula-evolution** |
| uncertainty, error | **uncertainty-propagation** |
| estimate, predict | **mathematical-planning** |

---

# 🚨 EMERGENCIES

| Situation | Action |
|-----------|--------|
| Context compacted | Read CURRENT_STATE.json, resume |
| Task restarting | STOP, read state, resume from checkpoint |
| S(x) < 0.70 | STOP, get more data |
| **M(x) < 0.60** | **STOP, add uncertainties, check units, verify formulas** |
| MAPE > 20% | Flag for recalibration, increase uncertainty ×1.5 |

---

# 📊 SYSTEM v11.0

```
╔════════════════════════════════════════════════════════════════╗
║  PRISM v11.0 | C:\PRISM\                                       ║
║  Skills: 92 | Agents: 56 | Materials: 1,540                    ║
║  Formulas: 15+ | Coefficients: 23+ | Monolith: 986K lines      ║
║  Enforcement: 8 Laws + 15 Commandments + Ω v2.0 + MATHPLAN     ║
║  NEW: Mathematical certainty required on ALL outputs           ║
╚════════════════════════════════════════════════════════════════╝
```

---

**MATHEMATICS IS NOT OPTIONAL. IT IS THE FOUNDATION OF CERTAINTY.**


---

# 🔗 HOOK SYSTEM v1.1 (AUTOMATIC ENFORCEMENT)

## 147 Hook Points | 25 Categories | 15 System Hooks

**Hooks transform manual discipline into AUTOMATIC enforcement.**

### 15 System Hooks (CANNOT DISABLE)

| Hook | Enforces | Action |
|------|----------|--------|
| SYS-LAW1-SAFETY | Law 1 | Blocks S(x) < 0.70 |
| SYS-LAW2-MICROSESSION | Law 2 | Requires MATHPLAN |
| SYS-LAW3-COMPLETENESS | Law 3 | Requires C(T) = 1.0 |
| SYS-LAW4-REGRESSION | Law 4 | Blocks data loss |
| SYS-LAW6-CONTINUITY | Law 6 | Loads state, enforces resume |
| SYS-LAW7-VERIFICATION | Law 7 | Requires 95% confidence |
| SYS-LAW8-MATH-EVOLUTION | Law 8 | Requires M(x) >= 0.60 |
| SYS-CMD1-WIRING | Cmd 1 | Min 6-8 consumers |
| SYS-CMD5-UNCERTAINTY | Cmd 5 | Injects uncertainty |
| SYS-BUFFER-ZONE | Law 2 | Enforces checkpoints |

### Key Hook Points by Operation

| Operation | Hooks Triggered |
|-----------|-----------------|
| Session Start | `session:preStart`, `session:postStart` |
| Task Plan | `task:prePlan`, `task:mathPlanValidate` |
| Task Execute | `task:start`, `task:checkpoint`, `task:complete` |
| DB Write | `db:preValidate`, `db:antiRegressionCheck`, `db:consumerWiringCheck` |
| Calculation | `calc:dimensionalCheck`, `calc:safetyBoundsCheck`, `calc:uncertaintyInject` |
| Formula Use | `formula:preUse`, `formula:calibrationCheck` |
| Swarm Run | `swarm:preStart`, `swarm:progress`, `swarm:synthesize` |

### Planning Formulas (Hook-Aware v2.0)

```
F-PLAN-002: EFFORT = Base × Complexity × Risk × HOOK_FACTOR × COORD_FACTOR × VERIFY_FACTOR
F-PLAN-005: TIME = EFFORT × AVG_TIME × BUFFER + LATENCY_OVERHEAD
```

### Hook Coefficients (9 new)

| ID | Name | Value |
|----|------|-------|
| K-HOOK-001 | Hook Execution Time | 5 ± 2 ms |
| K-HOOK-002 | Hooks Per Operation | 3.2 ± 0.8 |
| K-COORD-001 | Agent Coordination | 0.05 ± 0.02 |
| K-VERIFY-001 | Verification Level | 0.08 ± 0.03 |

### Files

```
C:\PRISM\src\core\hooks\
├── HookSystem.types.ts     # 1,905 lines
├── HookSystem.extended.ts  # 684 lines
├── HookManager.ts          # 739 lines
├── index.ts
```

### Quick Usage

```typescript
import { executeHooks } from '@prism/core/hooks';

// Before task - will BLOCK if no MATHPLAN
const result = await executeHooks('task:prePlan', payload, context);
if (result.aborted) { /* Handle */ }
```

---

# 📊 SYSTEM v11.1 (UPDATED)

```
╔════════════════════════════════════════════════════════════════╗
║  PRISM v11.1 | C:\PRISM\                                       ║
║  Skills: 92 | Agents: 56 | Materials: 1,540                    ║
║  Formulas: 15 | Coefficients: 32 | Monolith: 944K lines        ║
║  HOOKS: 147 points | 25 categories | 15 system hooks           ║
║  Enforcement: 8 Laws + 15 Commandments + Ω v2.0 + MATHPLAN     ║
║  NEW: Hook System v1.1 - AUTOMATIC enforcement of ALL Laws     ║
╚════════════════════════════════════════════════════════════════╝
```

---

**HOOKS MAKE ENFORCEMENT AUTOMATIC. DISCIPLINE IS NOW ARCHITECTURE.**
