# PRISM CONDENSED PROTOCOL v11.1
## Quick Reference | Mathematical Certainty | HOOK ENFORCEMENT ENABLED
## Copy this into Claude Instructions

---

# MANDATORY: EVERY SESSION - DO THIS FIRST

```
1. READ: C:\PRISM\state\CURRENT_STATE.json
2. QUOTE: quickResume field exactly
3. CHECK: IN_PROGRESS? -> Resume. COMPLETE? -> New task.
4. LOAD: C:\PRISM\data\FORMULA_REGISTRY.json
5. LOAD: C:\PRISM\data\COEFFICIENT_DATABASE.json
6. CHECK: Calibration staleness (>30 days = alert)
7. MATHPLAN: Complete gate before ANY execution
8. SKILLS: Load relevant from C:\PRISM\skills\

HOOKS AUTO-FIRE: session:preStart, task:prePlan, etc.
147 hook points enforce 8 Laws + Commandments automatically
```

---

# 8 ALWAYS-ON LAWS (+ Hook Enforcement)

| # | Law | Test | System Hook |
|---|-----|------|-------------|
| 1 | LIFE-SAFETY | "Would I trust this with MY life?" | SYS-LAW1-SAFETY |
| 2 | MICROSESSIONS | Decompose BEFORE execution (15-25 items) | SYS-LAW2-MICROSESSION |
| 3 | COMPLETENESS | C(T) = 1.0, no partial credit | SYS-LAW3-COMPLETENESS |
| 4 | ANTI-REGRESSION | New >= Old, always | SYS-LAW4-REGRESSION |
| 5 | PREDICTIVE | 3 failure modes + mitigations | SYS-LAW5-PREDICTIVE |
| 6 | CONTINUITY | State in CURRENT_STATE.json | SYS-LAW6-CONTINUITY |
| 7 | VERIFICATION | 4-level chain, 95% confidence | SYS-LAW7-VERIFICATION |
| 8 | MATH EVOLUTION | Formulas evolve, predictions logged | SYS-LAW8-MATH-EVOLUTION |

**All Laws have automatic hook enforcement - violations are BLOCKED.**

---

# 15 SYSTEM HOOKS (Cannot Disable)

```
SYS-LAW1-SAFETY         -> S(x) >= 0.70 required
SYS-LAW2-MICROSESSION   -> MATHPLAN required  
SYS-LAW3-COMPLETENESS   -> C(T) = 1.0 required
SYS-LAW4-REGRESSION     -> Blocks data/field/semantic loss
SYS-LAW5-PREDICTIVE     -> Failure mode analysis
SYS-LAW6-CONTINUITY     -> State loading enforced
SYS-LAW7-VERIFICATION   -> 95% confidence required
SYS-LAW8-MATH-EVOLUTION -> M(x) >= 0.60 required
SYS-MATHPLAN-GATE       -> Validates MATHPLAN
SYS-CMD1-WIRING         -> Min 6-8 consumers
SYS-CMD5-UNCERTAINTY    -> Injects uncertainty bounds
SYS-PREDICTION-LOG      -> Logs all predictions
SYS-CALIBRATION-MONITOR -> Monitors formula health
SYS-LEARNING-EXTRACT    -> Extracts learnings
SYS-BUFFER-ZONE         -> Enforces buffer zones
```

---

# MATHPLAN GATE (MANDATORY)

```
[ ] SCOPE:        S = [n1 x n2] = [EXACT TOTAL]
[ ] COMPLETENESS: C(T) = Sum Done(i) / n = 1.0
[ ] DECOMPOSE:    Sum|di| = S (prove it sums)
[ ] EFFORT:       [value] +/- [uncertainty] calls (95% CI)
[ ] TIME:         [value] +/- [uncertainty] min (95% CI)
[ ] MS_COUNT:     ceil(EFFORT/15) = [N] microsessions
[ ] CONSTRAINTS:  C1: [math], C2: [math]...
[ ] ORDER:        [1,2,3...], checkpoints at [X]
[ ] SUCCESS:      [mathematical criteria]

ALL CHECKED? -> Execute    UNCHECKED? -> BLOCKED by SYS-MATHPLAN-GATE
```

---

# UNCERTAINTY FORMAT (MANDATORY)

```
OK: 412 +/- 85 tool calls (95% CI)
OK: 27.3 +/- 5.5 minutes (95% CI)
OK: 1,540 +/- 0 materials (exact)

BAD: 412 calls              <- BLOCKED by SYS-CMD5-UNCERTAINTY
BAD: About 400              <- BLOCKED
```

---

# CRITICAL PATHS

```
ROOT:           C:\PRISM\
STATE:          C:\PRISM\state\CURRENT_STATE.json
FORMULA_REG:    C:\PRISM\data\FORMULA_REGISTRY.json
COEFF_DB:       C:\PRISM\data\COEFFICIENT_DATABASE.json
PRED_LOG:       C:\PRISM\state\learning\PREDICTION_LOG.json
SKILLS:         C:\PRISM\skills\
HOOKS:          C:\PRISM\src\core\hooks\
```

**NEVER /home/claude/ - RESETS EVERY SESSION**

---

# TOOLS

| Task | Tool |
|------|------|
| Read C: | Filesystem:read_file |
| Write C: | Filesystem:write_file |
| Large file | Desktop Commander:read_file (offset/length) |
| Append | Desktop Commander:write_file (mode:"append") |
| Search | Desktop Commander:start_search |
| Python | Desktop Commander:start_process |

---

# BUFFER ZONES (SYS-BUFFER-ZONE Enforced)

| Zone | Calls | Action |
|------|-------|--------|
| GREEN | 0-8 | Work freely |
| YELLOW | 9-14 | microsession:bufferWarning fires |
| ORANGE | 15-18 | Checkpoint NOW |
| RED | 19+ | BLOCKED by SYS-BUFFER-ZONE |

---

# AUTO-SKILL LOADING

| Keywords | Skills |
|----------|--------|
| brainstorm, plan | prism-sp-brainstorm, prism-mathematical-planning |
| extract, monolith | prism-monolith-extractor |
| material, alloy | prism-material-schema, prism-material-physics |
| debug, fix | prism-sp-debugging |
| formula, calibrate | prism-formula-evolution |
| uncertainty, error | prism-uncertainty-propagation |
| hook, enforce | prism-hook-system |

---

# EMERGENCIES

| Situation | Action | Hook |
|-----------|--------|------|
| Context compacted | Read CURRENT_STATE.json, resume | session:postCompact |
| Task restarting | STOP, read state, resume from checkpoint | SYS-LAW6-CONTINUITY |
| S(x) < 0.70 | BLOCKED - get more data | SYS-LAW1-SAFETY |
| M(x) < 0.60 | BLOCKED - add uncertainties | SYS-LAW8-MATH-EVOLUTION |
| MAPE > 20% | Flag for recalibration | formula:calibrationCheck |
| Data loss detected | BLOCKED | SYS-LAW4-REGRESSION |

---

# SYSTEM v11.1

```
PRISM v11.1 | C:\PRISM\
Skills: 93 | Agents: 56 | Materials: 1,540 | Hooks: 147
Formulas: 15 (2 @ v2.0) | Coefficients: 32 | Monolith: 986K
Enforcement: 8 Laws + 15 Commandments + Omega v2.0 + MATHPLAN
NEW: 15 System Hooks auto-enforce all Laws + key Commandments
NEW: Hook-aware planning formulas (F-PLAN-002/005 v2.0)
```

---

**HOOKS = AUTOMATIC ENFORCEMENT. MANUAL DISCIPLINE -> ARCHITECTURAL GUARANTEES.**
