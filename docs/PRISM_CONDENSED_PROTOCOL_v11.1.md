# PRISM CONDENSED PROTOCOL v11.1
## Quick Reference | Mathematical Certainty | HOOK ENFORCEMENT ENABLED
---

# 🔴 MANDATORY: EVERY SESSION - DO THIS FIRST

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║  ⛔ ENFORCEMENT v11.1 - MATHEMATICAL CERTAINTY + HOOKS ACTIVE                 ║
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
║  📍 HOOKS AUTO-FIRE: session:preStart, task:prePlan, etc.                     ║
║  📍 147 hook points enforce 8 Laws + Commandments automatically               ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

# ⚡ 8 ALWAYS-ON LAWS (+ Hook Enforcement)

| # | Law | Test | System Hook |
|---|-----|------|-------------|
| 1 | LIFE-SAFETY | "Would I trust this with MY life?" | SYS-LAW1-SAFETY |
| 2 | MICROSESSIONS | Decompose BEFORE execution (15-25 items) | SYS-LAW2-MICROSESSION |
| 3 | COMPLETENESS | C(T) = 1.0, no partial credit | SYS-LAW3-COMPLETENESS |
| 4 | ANTI-REGRESSION | New ≥ Old, always | SYS-LAW4-REGRESSION |
| 5 | PREDICTIVE | 3 failure modes + mitigations | SYS-LAW5-PREDICTIVE |
| 6 | CONTINUITY | State in CURRENT_STATE.json | SYS-LAW6-CONTINUITY |
| 7 | VERIFICATION | 4-level chain, 95% confidence | SYS-LAW7-VERIFICATION |
| 8 | **MATH EVOLUTION** | Formulas evolve, predictions logged | SYS-LAW8-MATH-EVOLUTION |

**All 8 Laws have automatic hook enforcement - violations are BLOCKED, not just warned.**

---

# 🔗 HOOK SYSTEM v1.1 (AUTO-ENFORCEMENT)

## 147 Hook Points | 25 Categories | 15 System Hooks

### Key Hook Triggers (Automatic)

| When | Hooks Fire | Enforcement |
|------|-----------|-------------|
| Session start | `session:preStart` | State loading, resume check |
| Before task | `task:prePlan`, `task:mathPlanValidate` | MATHPLAN required |
| During work | `microsession:bufferWarning` | Buffer zone alerts |
| DB changes | `db:antiRegressionCheck` | Blocks data loss |
| Calculations | `calc:uncertaintyInject` | Adds uncertainty |
| Task complete | `verification:chainComplete` | 95% confidence |
| Learning | `learning:extract` | Pattern capture |

### 15 System Hooks (Cannot Disable)

```
SYS-LAW1-SAFETY         → S(x) ≥ 0.70 required
SYS-LAW2-MICROSESSION   → MATHPLAN required  
SYS-LAW3-COMPLETENESS   → C(T) = 1.0 required
SYS-LAW4-REGRESSION     → Blocks data/field/semantic loss
SYS-LAW5-PREDICTIVE     → Failure mode analysis
SYS-LAW6-CONTINUITY     → State loading enforced
SYS-LAW7-VERIFICATION   → 95% confidence required
SYS-LAW8-MATH-EVOLUTION → M(x) ≥ 0.60 required
SYS-MATHPLAN-GATE       → Validates MATHPLAN
SYS-CMD1-WIRING         → Min 6-8 consumers
SYS-CMD5-UNCERTAINTY    → Injects uncertainty bounds
SYS-PREDICTION-LOG      → Logs all predictions
SYS-CALIBRATION-MONITOR → Monitors formula health
SYS-LEARNING-EXTRACT    → Extracts learnings
SYS-BUFFER-ZONE         → Enforces buffer zones
```

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

ALL CHECKED? → Execute    UNCHECKED? → BLOCKED by SYS-MATHPLAN-GATE
```

---

# 🔢 UNCERTAINTY FORMAT (MANDATORY)

```
✓ 412 ± 85 tool calls (95% CI)
✓ 27.3 ± 5.5 minutes (95% CI)
✓ 1,540 ± 0 materials (exact)

✗ 412 calls              ← BLOCKED by SYS-CMD5-UNCERTAINTY
✗ About 400              ← BLOCKED
```

**SYS-CMD5-UNCERTAINTY auto-injects if missing.**

---

# 📐 PLANNING FORMULAS v2.0 (Hook-Aware)

### F-PLAN-002: Effort
```
EFFORT = Base × Complexity × Risk × HOOK_FACTOR × COORD_FACTOR × VERIFY_FACTOR

HOOK_FACTOR = 1 + (3.2 hooks × 5ms / 3000ms)     ≈ 1.005
COORD_FACTOR = 1 + (agents-1) × 0.05             ≈ 1.05 per agent
VERIFY_FACTOR = 1 + (levels × 0.08)              ≈ 1.08 per level
```

### F-PLAN-005: Time
```
TIME = EFFORT × AVG_TIME × BUFFER + LATENCY_OVERHEAD

LATENCY_OVERHEAD = 50ms + 100ms + (levels × 200ms) + 150ms
                 ≈ 300ms base + 200ms per verification level
```

---

# 📋 15 COMMANDMENTS

| # | Rule | Hook Enforcement |
|---|------|-----------------|
| 1 | USE EVERYWHERE - Min 6-8 consumers per DB | SYS-CMD1-WIRING |
| 2 | FUSE - Cross-domain concepts | - |
| 3 | WIRE FIRST - 100% consumers before import | SYS-CMD1-WIRING |
| 4 | VERIFY ×3 - Physics + empirical + historical | verification:* |
| 5 | **UNCERTAINTY** - Value ± error (CI%) ALWAYS | SYS-CMD5-UNCERTAINTY |
| 6 | EXPLAIN - XAI for recommendations | calc:xaiExplain |
| 7 | FAIL GRACEFUL - Fallbacks for everything | circuit:* |
| 8 | PROTECT - Validate, sanitize, backup | db:antiRegressionCheck |
| 9 | DEFENSIVE - Handle ALL edge cases | - |
| 10 | PERFORM - <2s load, <500ms calc | health:* |
| 11 | OPTIMIZE - Measure first | cache:* |
| 12 | USER-OBSESS - 3-click rule | - |
| 13 | NEVER LOSE - Auto-save, undo, recover | transaction:rollback |
| 14 | LEARN - Feed _LEARNING pipeline | SYS-LEARNING-EXTRACT |
| 15 | IMPROVE - Extract patterns | learning:* |

---

# 📐 MASTER EQUATION (Ω v2.0)

```
Ω = 0.20·R + 0.18·C + 0.12·P + 0.28·S + 0.08·L + 0.14·M

HARD CONSTRAINTS (Enforced by hooks):
  S(x) ≥ 0.70 (SYS-LAW1-SAFETY)
  M(x) ≥ 0.60 (SYS-LAW8-MATH-EVOLUTION)

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
HOOKS:          C:\PRISM\src\core\hooks\
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

# 🎯 92 SKILLS + HOOK SKILL

| Level | Count | Key Skills |
|-------|-------|------------|
| L0 Always-On | 4 | deep-learning, formula-evolution, uncertainty-propagation, mathematical-planning |
| L1 Cognitive | 6 | universal-formulas, safety-framework, master-equation |
| L2 Workflow | 8 | sp-brainstorm, sp-execution, sp-debugging |
| L3 Domain | 16 | material-schema, monolith-extractor, session-master |
| L4 Reference | 20 | fanuc-programming, api-contracts, expert-roles |
| **NEW** | 1 | **prism-hook-system** (147 hooks, 25 categories) |

---

# 🛡️ BUFFER ZONES (SYS-BUFFER-ZONE Enforced)

| Zone | Calls | Action |
|------|-------|--------|
| 🟢 GREEN | 0-8 | Work freely |
| 🟡 YELLOW | 9-14 | `microsession:bufferWarning` fires |
| 🟠 ORANGE | 15-18 | Checkpoint NOW |
| 🔴 RED | 19+ | BLOCKED by SYS-BUFFER-ZONE |

---

# 📊 FORMULA CALIBRATION ALERTS

| Alert | Condition | Hook |
|-------|-----------|------|
| 🔴 CRITICAL | MAPE > 50% | formula:calibrationCheck |
| 🟠 WARNING | MAPE > 20% | prediction:triggerCalibration |
| 🟡 NOTICE | Calibration > 30 days | SYS-CALIBRATION-MONITOR |
| 🟢 HEALTHY | Metrics in bounds | - |

---

# 📝 PREDICTION LOGGING (SYS-PREDICTION-LOG Enforced)

**EVERY estimate → Logged automatically by `prediction:create` hook**

```json
{
  "predicted": {"effort": 412, "uncertainty": 85, "ci": 0.95},
  "actual": null,
  "status": "PENDING_ACTUAL"
}
```

**After completion → `prediction:recordActual` computes residual**

---

# 🚀 PYTHON ORCHESTRATORS

```powershell
# Intelligent swarm (56 agents) - fires agent:* and swarm:* hooks
py -3 C:\PRISM\scripts\prism_unified_system_v5.py --intelligent "Task"

# Manufacturing analysis - fires agent:* hooks
py -3 C:\PRISM\scripts\prism_orchestrator_v2.py --manufacturing "Material" "Op"
```

---

# 🔄 AUTO-SKILL LOADING

| Keywords | Skills |
|----------|--------|
| brainstorm, plan | sp-brainstorm, mathematical-planning |
| extract, monolith | monolith-extractor |
| material, alloy | material-schema, material-physics |
| debug, fix | sp-debugging |
| formula, calibrate | formula-evolution |
| uncertainty, error | uncertainty-propagation |
| estimate, predict | mathematical-planning |
| **hook, enforce** | **prism-hook-system** |

---

# 🚨 EMERGENCIES

| Situation | Action | Hook |
|-----------|--------|------|
| Context compacted | Read CURRENT_STATE.json, resume | session:postCompact |
| Task restarting | STOP, read state, resume from checkpoint | SYS-LAW6-CONTINUITY |
| S(x) < 0.70 | BLOCKED - get more data | SYS-LAW1-SAFETY |
| M(x) < 0.60 | BLOCKED - add uncertainties | SYS-LAW8-MATH-EVOLUTION |
| MAPE > 20% | Flag for recalibration | formula:calibrationCheck |
| Data loss detected | BLOCKED | SYS-LAW4-REGRESSION |

---

# 📊 SYSTEM v11.1

```
╔════════════════════════════════════════════════════════════════╗
║  PRISM v11.1 | C:\PRISM\                                       ║
║  Skills: 93 | Agents: 56 | Materials: 1,540 | Hooks: 147       ║
║  Formulas: 15 (2 @ v2.0) | Coefficients: 32 | Monolith: 986K   ║
║  Enforcement: 8 Laws + 15 Commandments + Ω v2.0 + MATHPLAN     ║
║  NEW: 15 System Hooks auto-enforce all Laws + key Commandments ║
║  NEW: Hook-aware planning formulas (F-PLAN-002/005 v2.0)       ║
╚════════════════════════════════════════════════════════════════╝
```

---

**HOOKS = AUTOMATIC ENFORCEMENT. MANUAL DISCIPLINE → ARCHITECTURAL GUARANTEES.**
