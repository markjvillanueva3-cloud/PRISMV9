# PRISM FORMULA EVOLUTION SKILL v1.0
## Codename: FORMULA-EVO
## Level: 0 (Always-On - Mathematical Learning Never Stops)
## Triggers: ALL sessions, ALL formulas, ALL estimates

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 0: CORE AXIOM
# ════════════════════════════════════════════════════════════════════════════════

> **"A formula that doesn't learn from its errors is not a formula—it's a guess."**

Every equation, coefficient, and constant in PRISM:
1. MUST have a version and unique ID
2. MUST have uncertainty bounds
3. MUST track prediction vs actual
4. MUST evolve based on evidence
5. MUST be validated before deployment

---

# QUICK REFERENCE

## Formula Lifecycle
```
INVENT → REGISTER → CALIBRATE → DEPLOY → MONITOR → EVOLVE → DEPRECATE
```

## Calibration Triggers
```
1. dataPoints ≥ 10 since last calibration
2. MAPE > 20%
3. |Bias| > 10%
4. Days since calibration > 30
```

## Alert Levels
```
🔴 CRITICAL: MAPE > 50% or |Bias| > 25% → Halt formula use
🟠 WARNING:  MAPE > 20% or |Bias| > 10% → Recalibrate in 3 sessions
🟡 NOTICE:   Calibration > 30 days → Review needed
🟢 HEALTHY:  All metrics in bounds → Continue
```

## Files
```
FORMULA_REGISTRY:   C:\PRISM\data\FORMULA_REGISTRY.json
COEFFICIENT_DB:     C:\PRISM\data\COEFFICIENT_DATABASE.json
PREDICTION_LOG:     C:\PRISM\state\learning\PREDICTION_LOG.json
RESOURCE_REGISTRY:  C:\PRISM\data\coordination\RESOURCE_REGISTRY.json
CAPABILITY_MATRIX:  C:\PRISM\data\coordination\CAPABILITY_MATRIX.json
SYNERGY_MATRIX:     C:\PRISM\data\coordination\SYNERGY_MATRIX.json
```

## 7 COORDINATION Formulas (NEW v6.0)
```
F-PSI-001     Master Combination Equation Ψ(T,R) - ILP optimal selection
F-RESOURCE-001 Capability Score Cap(r,T) - fuzzy matching [0-1]
F-SYNERGY-001  Synergy Calculator Syn(R) - interaction bonuses
F-COVERAGE-001 Task Coverage - requirement completeness
F-SWARM-001    Swarm Efficiency - multi-agent performance
F-AGENT-001    Agent Selection A*(T) - cost optimization
F-PROOF-001    Optimality Proof - Lagrangian certificate
```

## Session Protocol
```
START:
  □ Load FORMULA_REGISTRY.json
  □ Load COEFFICIENT_DATABASE.json
  □ Check staleness (>30 days)

DURING:
  □ Log ALL predictions
  □ Record actuals when known

END:
  □ Update performance tracking
  □ Trigger recalibration if needed
```

---

**FULL DOCUMENTATION:** See C:\PRISM\skills\prism-formula-evolution.md
