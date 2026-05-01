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

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 1: FORMULA LIFECYCLE
# ════════════════════════════════════════════════════════════════════════════════

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FORMULA LIFECYCLE                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   INVENT → REGISTER → CALIBRATE → DEPLOY → MONITOR → EVOLVE → DEPRECATE   │
│      ↑                                          │                          │
│      └──────────────────────────────────────────┘                          │
│                     (continuous improvement loop)                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

STAGE 1: INVENT
  - Identify need for formula
  - Define mathematical form
  - Specify variables and units
  - Estimate initial coefficients

STAGE 2: REGISTER
  - Assign unique ID (F-DOMAIN-NNN)
  - Add to FORMULA_REGISTRY.json
  - Document derivation
  - Set initial version (v0.1-beta)

STAGE 3: CALIBRATE
  - Collect calibration data (min 10 points)
  - Fit coefficients via regression
  - Calculate confidence intervals
  - Validate on held-out data

STAGE 4: DEPLOY
  - Promote to production (v1.0)
  - Enable in workflows
  - Begin tracking predictions

STAGE 5: MONITOR
  - Track predicted vs actual
  - Compute performance metrics
  - Flag degradation
  - Collect new calibration data

STAGE 6: EVOLVE
  - Recalibrate with new data
  - Test new version
  - Compare to current version
  - Deploy if improved

STAGE 7: DEPRECATE
  - Mark as deprecated when superseded
  - Maintain for rollback capability
  - Archive after validation period
```

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 2: FORMULA REGISTRY SCHEMA
# ════════════════════════════════════════════════════════════════════════════════

```json
{
  "formulaRegistry": {
    "metadata": {
      "version": "1.0",
      "lastUpdated": "ISO-8601",
      "totalFormulas": 0,
      "activeFormulas": 0,
      "deprecatedFormulas": 0
    },
    "formulas": {
      "F-PLAN-001": {
        "id": "F-PLAN-001",
        "name": "Task Completeness",
        "symbol": "C(T)",
        "version": "1.0",
        "status": "ACTIVE",
        "domain": "PLANNING",
        "category": "COMPLETENESS",
        
        "definition": {
          "form": "C(T) = (1/n) × Σᵢ Done(i)",
          "latex": "C(T) = \\frac{1}{n} \\sum_{i=1}^{n} \\text{Done}(i)",
          "description": "Fraction of task items completed"
        },
        
        "variables": [
          {
            "symbol": "n",
            "name": "Total items",
            "unit": "items",
            "type": "integer",
            "range": "[1, ∞)"
          },
          {
            "symbol": "Done(i)",
            "name": "Item completion status",
            "unit": "dimensionless",
            "type": "binary",
            "range": "{0, 1}"
          }
        ],
        
        "output": {
          "symbol": "C(T)",
          "name": "Completeness",
          "unit": "dimensionless",
          "type": "float",
          "range": "[0, 1]"
        },
        
        "coefficients": [],
        
        "calibration": {
          "method": "exact",
          "dataPoints": null,
          "lastCalibrated": null,
          "nextCalibration": null
        },
        
        "performance": {
          "usageCount": 0,
          "predictions": [],
          "actuals": [],
          "mae": null,
          "mape": null,
          "r2": null,
          "bias": null
        },
        
        "metadata": {
          "created": "ISO-8601",
          "author": "PRISM",
          "derivation": "Definition of task completion",
          "references": [],
          "dependencies": [],
          "dependents": ["F-PLAN-003"]
        }
      }
    }
  }
}
```

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 3: COEFFICIENT DATABASE SCHEMA
# ════════════════════════════════════════════════════════════════════════════════

```json
{
  "coefficientDatabase": {
    "metadata": {
      "version": "1.0",
      "lastUpdated": "ISO-8601",
      "totalCoefficients": 0
    },
    "coefficients": {
      "K-EFFORT-001": {
        "id": "K-EFFORT-001",
        "name": "File I/O Complexity Factor",
        "symbol": "k_io",
        "usedIn": ["F-PLAN-002"],
        
        "value": {
          "current": 0.5,
          "uncertainty": 0.15,
          "confidenceLevel": 0.95,
          "unit": "dimensionless"
        },
        
        "calibration": {
          "method": "linear_regression",
          "dataPoints": 47,
          "lastCalibrated": "2026-01-26T00:00:00Z",
          "r2": 0.78,
          "pValue": 0.001
        },
        
        "history": [
          {
            "version": "0.1",
            "value": 0.5,
            "uncertainty": null,
            "source": "initial_estimate",
            "date": "2026-01-26T00:00:00Z"
          }
        ],
        
        "trend": {
          "direction": "stable",
          "slope": 0.001,
          "volatility": 0.05
        }
      }
    }
  }
}
```

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 4: CALIBRATION PROTOCOLS
# ════════════════════════════════════════════════════════════════════════════════

## CALIBRATION TRIGGER CONDITIONS:

```
TRIGGER CALIBRATION IF:
  1. New data points ≥ 10 since last calibration
  2. MAPE > 20% (predictions are 20%+ off)
  3. |Bias| > 10% (systematic over/under prediction)
  4. Time since calibration > 30 days
  5. Domain conditions changed significantly
```

## CALIBRATION PROCESS:

```
CALIBRATION ALGORITHM:
────────────────────────────────────────────────────────────────

INPUT:
  - Formula F with coefficients K = {k₁, k₂, ..., kₘ}
  - Calibration data D = {(x₁,y₁), (x₂,y₂), ..., (xₙ,yₙ)}
  - Validation split ratio r (default: 0.2)

PROCESS:
  1. SPLIT data into train (1-r) and validation (r)
  
  2. FIT coefficients on training data:
     K* = argmin_K Σᵢ (F(xᵢ; K) - yᵢ)²
     
  3. COMPUTE uncertainty via bootstrap:
     For b = 1 to B (B=1000):
       Sample with replacement
       Fit K_b
     σ(k) = std({K_b})
     
  4. VALIDATE on held-out data:
     MAE_val = mean(|F(x_val; K*) - y_val|)
     MAPE_val = mean(|F(x_val; K*) - y_val| / |y_val|)
     
  5. COMPARE to current version:
     IF MAPE_new < MAPE_old:
       DEPLOY new coefficients
     ELSE:
       ROLLBACK (keep old)
       FLAG for review

OUTPUT:
  - Updated coefficients K* with uncertainties σ(K*)
  - Performance metrics
  - Deployment decision
```

## CALIBRATION METHODS BY FORMULA TYPE:

```
┌────────────────────┬─────────────────────────────────────────────┐
│ Formula Type       │ Calibration Method                          │
├────────────────────┼─────────────────────────────────────────────┤
│ Linear             │ Ordinary Least Squares (OLS)                │
│ Power law          │ Log-transform + OLS                         │
│ Exponential        │ Log-transform + OLS                         │
│ Nonlinear          │ Levenberg-Marquardt optimization            │
│ Categorical        │ Maximum Likelihood Estimation               │
│ Bayesian           │ MCMC posterior sampling                     │
│ Exact (no coeffs)  │ Not applicable                              │
└────────────────────┴─────────────────────────────────────────────┘
```

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 5: PERFORMANCE METRICS
# ════════════════════════════════════════════════════════════════════════════════

## MANDATORY METRICS FOR ALL FORMULAS:

```
1. MEAN ABSOLUTE ERROR (MAE)
   MAE = (1/n) × Σᵢ |predicted_i - actual_i|
   
   INTERPRETATION:
   - Average magnitude of errors
   - Same units as output variable
   - Lower is better
   
2. MEAN ABSOLUTE PERCENTAGE ERROR (MAPE)
   MAPE = (100/n) × Σᵢ |predicted_i - actual_i| / |actual_i|
   
   INTERPRETATION:
   - Percentage error (scale-independent)
   - MAPE < 10%: Excellent
   - MAPE 10-20%: Good
   - MAPE 20-50%: Acceptable
   - MAPE > 50%: Poor (recalibrate!)
   
3. COEFFICIENT OF DETERMINATION (R²)
   R² = 1 - (SS_res / SS_tot)
   SS_res = Σᵢ (actual_i - predicted_i)²
   SS_tot = Σᵢ (actual_i - mean(actual))²
   
   INTERPRETATION:
   - Variance explained by model
   - R² > 0.9: Excellent
   - R² 0.7-0.9: Good
   - R² 0.5-0.7: Moderate
   - R² < 0.5: Poor
   
4. BIAS
   Bias = mean(predicted - actual)
   
   INTERPRETATION:
   - Positive: Systematic overprediction
   - Negative: Systematic underprediction
   - |Bias| < 5%: Acceptable
   - |Bias| > 10%: Recalibrate!
   
5. ROOT MEAN SQUARED ERROR (RMSE)
   RMSE = √[(1/n) × Σᵢ (predicted_i - actual_i)²]
   
   INTERPRETATION:
   - Penalizes large errors more than MAE
   - Same units as output variable

6. PREDICTION INTERVAL COVERAGE
   PIC = (# actuals within predicted CI) / n
   
   INTERPRETATION:
   - Should be ≈ confidence level
   - PIC for 95% CI should be ~0.95
   - PIC < 0.8: Uncertainty underestimated
   - PIC > 0.99: Uncertainty overestimated
```

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 6: EVOLUTION RULES
# ════════════════════════════════════════════════════════════════════════════════

## VERSION NUMBERING:

```
FORMAT: vMAJOR.MINOR.PATCH-STATUS

MAJOR: Breaking changes (form change, variable change)
MINOR: Coefficient recalibration, uncertainty update
PATCH: Documentation, metadata only
STATUS: alpha, beta, rc, (none for stable)

EXAMPLES:
v0.1-alpha    Initial creation, untested
v0.5-beta     Some calibration data, testing
v1.0          Production ready
v1.1          Recalibrated coefficients
v2.0          Formula form changed
```

## EVOLUTION TRIGGERS:

```
COEFFICIENT UPDATE (MINOR version):
  - New calibration data improves fit
  - Uncertainty bounds refined
  - No change to formula structure

FORMULA REVISION (MAJOR version):
  - Mathematical form changed
  - Variables added/removed
  - Domain extended/restricted

DEPRECATION:
  - Superseded by better formula
  - No longer applicable to domain
  - Persistent poor performance
```

## ROLLBACK PROTOCOL:

```
IF new version performs worse:
  1. HALT deployment
  2. RESTORE previous version
  3. INVESTIGATE cause:
     - Overfitting?
     - Data quality issue?
     - Domain shift?
  4. DOCUMENT failure
  5. RETRY with corrections
```

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 7: LEARNING INTEGRATION
# ════════════════════════════════════════════════════════════════════════════════

## EVERY SESSION MUST:

```
SESSION START:
  □ Load FORMULA_REGISTRY.json
  □ Load COEFFICIENT_DATABASE.json
  □ Check for stale calibrations (>30 days)
  □ Review flagged formulas

DURING EXECUTION:
  □ Log all predictions with timestamps
  □ Record actual outcomes when known
  □ Note any anomalies

SESSION END:
  □ Compute session metrics
  □ Append to calibration data
  □ Update performance tracking
  □ Trigger recalibration if thresholds exceeded
```

## DATA LOGGING FORMAT:

```json
{
  "predictionLog": {
    "id": "PL-20260126-001",
    "sessionId": "SESSION-ABC123",
    "timestamp": "2026-01-26T00:45:00Z",
    "formulaId": "F-PLAN-002",
    "inputs": {
      "n_files": 44,
      "complexity": 2.34
    },
    "predicted": {
      "value": 412,
      "uncertainty": 82,
      "confidenceLevel": 0.95
    },
    "actual": {
      "value": null,
      "measuredAt": null
    },
    "status": "PENDING_ACTUAL"
  }
}
```

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 8: FORMULA DEPENDENCY MANAGEMENT
# ════════════════════════════════════════════════════════════════════════════════

## DEPENDENCY GRAPH:

```
WHEN formula F depends on formula G:
  - F must use G's output correctly
  - G's uncertainty propagates to F
  - G's recalibration may require F's recalibration

DEPENDENCY DECLARATION:
  "dependencies": ["F-PLAN-001", "F-PLAN-002"]
  "dependents": ["F-PLAN-005", "F-VERIFY-001"]

PROPAGATION RULE:
  IF G recalibrated AND |ΔG| > threshold:
    THEN trigger recalibration of all F where G ∈ dependencies(F)
```

## CIRCULAR DEPENDENCY CHECK:

```
ALGORITHM: Detect cycles in dependency graph
  1. Build directed graph from dependencies
  2. Run topological sort
  3. IF cycle detected → ERROR
  4. Cycles indicate logical flaw in formula design
```

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 9: PRISM CORE FORMULAS REGISTERED
# ════════════════════════════════════════════════════════════════════════════════

## INITIAL REGISTRY (to be populated):

```
PLANNING DOMAIN (F-PLAN-XXX):
  F-PLAN-001: Task Completeness C(T)
  F-PLAN-002: Effort Estimation EFFORT(T)
  F-PLAN-003: Task Completion Confidence TCC(T)
  F-PLAN-004: Microsession Count MS_COUNT
  F-PLAN-005: Time Estimation TIME(T)

MATERIAL DOMAIN (F-MAT-XXX):
  F-MAT-001: Material Coverage Index MCI(m)
  F-MAT-002: Database Utilization Factor DUF(db)
  
QUALITY DOMAIN (F-QUAL-XXX):
  F-QUAL-001: Master Equation Ω(x)
  F-QUAL-002: Safety Score S(x)
  F-QUAL-003: Mathematical Rigor Score M(x)

PHYSICS DOMAIN (F-PHYS-XXX):
  F-PHYS-001: Kienzle Cutting Force Fc
  F-PHYS-002: Taylor Tool Life T
  F-PHYS-003: Johnson-Cook Flow Stress σ

VERIFICATION DOMAIN (F-VERIFY-XXX):
  F-VERIFY-001: Verification Chain Score
  F-VERIFY-002: Confidence Level Calculator
```

---

# ════════════════════════════════════════════════════════════════════════════════
# SECTION 10: ENFORCEMENT
# ════════════════════════════════════════════════════════════════════════════════

## HARD RULES:

```
1. NO unregistered formulas in production
2. NO formulas without uncertainty bounds
3. NO coefficients without calibration data (or explicit "estimated" flag)
4. NO predictions logged without actual follow-up
5. NO version deployed without comparison to previous
6. NO deprecation without successor identified
```

## ALERTS:

```
🔴 CRITICAL: MAPE > 50% or |Bias| > 25%
   → Halt use, immediate recalibration

🟠 WARNING: MAPE > 20% or |Bias| > 10% or PIC < 0.8
   → Schedule recalibration within 3 sessions

🟡 NOTICE: Calibration > 30 days old
   → Review and decide on recalibration

🟢 HEALTHY: All metrics within bounds
   → Continue monitoring
```

---

**FORMULAS THAT DON'T EVOLVE ARE FOSSILS.**

**Version:** 1.0 | **Created:** 2026-01-26 | **Author:** PRISM Development


## COORDINATION Formulas (v13.0 - Combination Engine)

| ID | Name | Purpose | Category |
|----|------|---------|----------|
| F-PSI-001 | Master Combination Equation | ILP optimization for resource selection | COORDINATION |
| F-RESOURCE-001 | Capability Score | Fuzzy matching resources to requirements | COORDINATION |
| F-SYNERGY-001 | Synergy Calculator | Pairwise resource interaction effects | COORDINATION |
| F-COVERAGE-001 | Task Coverage | Requirement completeness verification | COORDINATION |
| F-SWARM-001 | Swarm Efficiency | Multi-agent performance measurement | COORDINATION |
| F-AGENT-001 | Agent Selection | Cost-optimized agent assignment | COORDINATION |
| F-PROOF-001 | Optimality Proof | Mathematical certificate generation | COORDINATION |

### F-PSI-001: Master Combination Equation
```
Ψ(T,R) = Σᵢ[Cap(rᵢ,T) × w_coverage] + Σⱼₖ[Syn(rⱼ,rₖ) × w_synergy] - Σᵢ[Cost(rᵢ) × w_cost]

WHERE:
  T = Task specification with requirements
  R = Set of selected resources {skills, agents, formulas, coefficients}
  Cap(r,T) = Capability match score [0-1] from F-RESOURCE-001
  Syn(rⱼ,rₖ) = Synergy bonus from SYNERGY_MATRIX
  Cost(r) = Resource cost (API tier, complexity)
  w_* = Weights (default: 0.5, 0.3, 0.2)

CONSTRAINTS:
  Coverage(R,T) ≥ 0.95
  |R| ≤ budget
  Conflicts(R) = ∅

SOLVED VIA: PuLP ILP solver with warm-start heuristics
```
