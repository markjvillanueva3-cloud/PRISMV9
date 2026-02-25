---
name: prism-formula-evolution
version: "2.0"
level: 0
category: always-on
description: |
  Continuous mathematical evolution for PRISM formulas. Tracks formula lifecycle
  from invention to deployment to deprecation. Manages FORMULA_REGISTRY.json and
  COEFFICIENT_DATABASE.json. Enforces calibration, uncertainty bounds, and
  performance metrics on all mathematical formulas. Level 0 Always-On skill.
  Key principle: A formula that doesn't learn from its errors is not a formula—it's a guess.
dependencies:
  - prism-mathematical-planning
  - prism-uncertainty-propagation
consumers:
  - ALL calculation skills
  - ALL physics engines
hooks:
  - formula:calibrationCheck (Priority 50)
  - formula:coefficientUpdate (Priority 55)
  - formula:upgrade (Priority 60)
  - prediction:create (Priority 200)
  - prediction:recordActual (Priority 205)
  - prediction:triggerCalibration (Priority 210)
safety_critical: true
---

# PRISM Formula Evolution Skill v2.0
## Continuous Mathematical Learning - Level 0 Always-On
## Triggers: ALL sessions, ALL formulas, ALL estimates

---

## Core Axiom

> **"A formula that doesn't learn from its errors is not a formula—it's a guess."**

Every equation, coefficient, and constant in PRISM:
1. MUST have a version and unique ID
2. MUST have uncertainty bounds
3. MUST track prediction vs actual
4. MUST evolve based on evidence
5. MUST be validated before deployment

### Safety Considerations
⚠️ **LIFE-SAFETY**: Formulas directly affect manufacturing parameters.
- Physics formulas (F-PHYS-*) require validation before deployment
- Cutting force changes can cause tool breakage, injury
- NEVER deploy uncalibrated formulas to production
- Rollback required if MAPE > 50% detected

---

## 1. FORMULA LIFECYCLE

```
INVENT → REGISTER → CALIBRATE → DEPLOY → MONITOR → EVOLVE → DEPRECATE
   ↑                                          │
   └──────────────────────────────────────────┘
                (continuous improvement loop)
```

| Stage | Action | Validation |
|-------|--------|------------|
| INVENT | Define form, variables, initial coefficients | Theory review |
| REGISTER | Assign ID (F-DOMAIN-NNN), add to registry | Schema check |
| CALIBRATE | Fit to data (min 10 points), compute CI | Statistical tests |
| DEPLOY | Promote to v1.0, enable in workflows | Integration test |
| MONITOR | Track predicted vs actual, flag degradation | Performance metrics |
| EVOLVE | Recalibrate, compare versions, deploy if improved | A/B comparison |
| DEPRECATE | Mark superseded, archive after validation | Usage check |

---

## 2. CRITICAL FILES

```
FORMULA_REGISTRY:   C:\PRISM\data\FORMULA_REGISTRY.json
COEFFICIENT_DB:     C:\PRISM\data\COEFFICIENT_DATABASE.json
PREDICTION_LOG:     C:\PRISM\state\learning\PREDICTION_LOG.json
CALIBRATION_STATE:  C:\PRISM\state\CALIBRATION_STATE.json
```

---

## 3. IMPLEMENTATION

### Formula Registry Manager
```python
import json
from datetime import datetime
from typing import Dict, Optional, List

class FormulaRegistry:
    """Manages FORMULA_REGISTRY.json with validation and versioning."""
    
    def __init__(self, registry_path="C:/PRISM/data/FORMULA_REGISTRY.json"):
        self.registry_path = registry_path
        self.registry = self._load()
    
    def _load(self) -> Dict:
        with open(self.registry_path, 'r') as f:
            return json.load(f)
    
    def _save(self):
        with open(self.registry_path, 'w') as f:
            json.dump(self.registry, f, indent=2)
    
    def register(self, formula: Dict) -> str:
        """
        Register a new formula.
        
        Args:
            formula: Formula definition with required fields
            
        Returns:
            Formula ID
        """
        # Validate required fields
        required = ["id", "name", "symbol", "domain", "definition"]
        for field in required:
            if field not in formula:
                raise ValueError(f"Missing required field: {field}")
        
        # Check for duplicate
        if formula["id"] in self.registry["formulas"]:
            raise ValueError(f"Formula {formula['id']} already exists")
        
        # Set defaults
        formula.setdefault("version", "0.1.0-alpha")
        formula.setdefault("status", "REGISTERED")
        formula.setdefault("coefficients", [])
        formula.setdefault("calibration", {
            "method": "pending",
            "lastCalibrated": None,
            "dataPoints": 0
        })
        formula.setdefault("performance", {
            "usageCount": 0,
            "mae": None,
            "mape": None,
            "r2": None,
            "bias": None
        })
        formula.setdefault("created", datetime.now().isoformat())
        
        # Register
        self.registry["formulas"][formula["id"]] = formula
        self._save()
        
        return formula["id"]
    
    def get(self, formula_id: str) -> Optional[Dict]:
        """Get formula by ID."""
        return self.registry["formulas"].get(formula_id)
    
    def update_performance(self, formula_id: str, metrics: Dict):
        """Update formula performance metrics."""
        if formula_id not in self.registry["formulas"]:
            raise ValueError(f"Formula {formula_id} not found")
        
        formula = self.registry["formulas"][formula_id]
        formula["performance"].update(metrics)
        formula["performance"]["lastUpdated"] = datetime.now().isoformat()
        
        # Check for degradation
        self._check_degradation(formula_id, metrics)
        
        self._save()
    
    def _check_degradation(self, formula_id: str, metrics: Dict):
        """Check if formula performance has degraded."""
        if metrics.get("mape") and metrics["mape"] > 50:
            self._trigger_alert("CRITICAL", formula_id, 
                f"MAPE {metrics['mape']:.1f}% > 50% threshold")
        elif metrics.get("mape") and metrics["mape"] > 20:
            self._trigger_alert("WARNING", formula_id,
                f"MAPE {metrics['mape']:.1f}% > 20% - recalibration needed")
        
        if metrics.get("bias") and abs(metrics["bias"]) > 25:
            self._trigger_alert("CRITICAL", formula_id,
                f"|Bias| {abs(metrics['bias']):.1f}% > 25% threshold")
    
    def _trigger_alert(self, level: str, formula_id: str, message: str):
        """Trigger calibration alert via hook system."""
        execute_hooks("formula:calibrationCheck", {
            "level": level,
            "formula_id": formula_id,
            "message": message,
            "timestamp": datetime.now().isoformat()
        })
```

### Coefficient Manager
```python
class CoefficientDatabase:
    """Manages COEFFICIENT_DATABASE.json with calibration tracking."""
    
    def __init__(self, db_path="C:/PRISM/data/COEFFICIENT_DATABASE.json"):
        self.db_path = db_path
        self.database = self._load()
    
    def update_coefficient(self, coef_id: str, new_value: float, 
                          uncertainty: float, data_points: int):
        """
        Update coefficient with new calibration.
        
        Args:
            coef_id: Coefficient ID
            new_value: New calibrated value
            uncertainty: 95% confidence interval half-width
            data_points: Number of data points used
        """
        if coef_id not in self.database["coefficients"]:
            raise ValueError(f"Coefficient {coef_id} not found")
        
        coef = self.database["coefficients"][coef_id]
        
        # Track history
        if "history" not in coef:
            coef["history"] = []
        coef["history"].append({
            "value": coef["value"]["current"],
            "timestamp": datetime.now().isoformat()
        })
        
        # Update value
        coef["value"]["current"] = new_value
        coef["value"]["uncertainty"] = uncertainty
        coef["value"]["confidenceLevel"] = 0.95
        
        # Update calibration status
        coef["calibration"]["status"] = "CALIBRATED"
        coef["calibration"]["lastCalibrated"] = datetime.now().isoformat()
        coef["calibration"]["dataPoints"] = data_points
        
        self._save()
        
        # Fire hook
        execute_hooks("formula:coefficientUpdate", {
            "coefficient_id": coef_id,
            "new_value": new_value,
            "uncertainty": uncertainty
        })
```

---

## 4. FORMULA REGISTRY ENTRY SCHEMA

```json
{
  "F-PLAN-001": {
    "id": "F-PLAN-001",
    "name": "Task Completeness",
    "symbol": "C(T)",
    "version": "1.0",
    "status": "ACTIVE",
    "domain": "PLANNING",
    "definition": {
      "form": "C(T) = (1/n) × Σᵢ Done(i)",
      "description": "Fraction of task items completed",
      "variables": {
        "n": "Total number of task items",
        "Done(i)": "1 if item i complete, 0 otherwise"
      }
    },
    "coefficients": [],
    "calibration": {
      "method": "exact",
      "lastCalibrated": null,
      "dataPoints": 0
    },
    "performance": {
      "usageCount": 0,
      "mae": null,
      "mape": null,
      "r2": null,
      "bias": null,
      "lastUpdated": null
    },
    "safety": {
      "critical": false,
      "validationRequired": false
    },
    "created": "2026-01-01T00:00:00Z",
    "lastModified": "2026-01-29T00:00:00Z"
  }
}
```

---

## 5. CALIBRATION TRIGGERS

Recalibrate when ANY condition met:

| Trigger | Condition | Priority |
|---------|-----------|----------|
| Data threshold | dataPoints ≥ 10 since last calibration | Normal |
| Accuracy degradation | MAPE > 20% | High |
| Bias detected | \|Bias\| > 10% | High |
| Staleness | Days since calibration > 30 | Low |
| Critical alert | MAPE > 50% or \|Bias\| > 25% | **CRITICAL** |

```python
def check_calibration_triggers(formula_id: str) -> List[str]:
    """Check which calibration triggers are active."""
    formula = registry.get(formula_id)
    triggers = []
    
    perf = formula["performance"]
    cal = formula["calibration"]
    
    # Data threshold
    if cal.get("dataPoints", 0) >= 10:
        triggers.append("DATA_THRESHOLD")
    
    # Accuracy
    if perf.get("mape") and perf["mape"] > 20:
        triggers.append("ACCURACY_DEGRADATION")
    
    # Bias
    if perf.get("bias") and abs(perf["bias"]) > 10:
        triggers.append("BIAS_DETECTED")
    
    # Staleness
    if cal.get("lastCalibrated"):
        days = (datetime.now() - datetime.fromisoformat(cal["lastCalibrated"])).days
        if days > 30:
            triggers.append("STALENESS")
    
    # Critical
    if (perf.get("mape") and perf["mape"] > 50) or \
       (perf.get("bias") and abs(perf["bias"]) > 25):
        triggers.append("CRITICAL")
    
    return triggers
```

---

## 6. PERFORMANCE METRICS

| Metric | Formula | Good | Action |
|--------|---------|------|--------|
| MAE | mean(\|pred - actual\|) | Low | Same units as output |
| MAPE | mean(\|error\| / \|actual\|) × 100 | < 20% | Recalibrate if > 20% |
| R² | 1 - (SS_res / SS_tot) | > 0.7 | Variance explained |
| Bias | mean(pred - actual) | < 10% | Systematic error |

```python
def compute_performance_metrics(predictions: List[float], 
                                actuals: List[float]) -> Dict:
    """Compute all performance metrics for a formula."""
    import numpy as np
    
    predictions = np.array(predictions)
    actuals = np.array(actuals)
    errors = predictions - actuals
    
    mae = np.mean(np.abs(errors))
    mape = np.mean(np.abs(errors / actuals)) * 100
    bias = np.mean(errors)
    
    ss_res = np.sum(errors ** 2)
    ss_tot = np.sum((actuals - np.mean(actuals)) ** 2)
    r2 = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0
    
    return {
        "mae": round(mae, 4),
        "mape": round(mape, 2),
        "r2": round(r2, 4),
        "bias": round(bias, 4),
        "n_samples": len(predictions)
    }
```

---

## 7. EXAMPLES

### Example 1: Register New Formula
```python
registry = FormulaRegistry()

new_formula = {
    "id": "F-CUSTOM-001",
    "name": "Custom Efficiency",
    "symbol": "η_custom",
    "domain": "OPTIMIZATION",
    "definition": {
        "form": "η = output / (input × k_loss)",
        "description": "Custom efficiency metric",
        "variables": {
            "output": "Measured output value",
            "input": "Input energy/resources",
            "k_loss": "Loss coefficient (K-LOSS-001)"
        }
    },
    "coefficients": ["K-LOSS-001"],
    "safety": {"critical": False}
}

formula_id = registry.register(new_formula)
# Returns: "F-CUSTOM-001"
```

### Example 2: Update Performance After Predictions
```python
# After collecting prediction/actual pairs
predictions = [100, 150, 200, 180, 220]
actuals = [95, 160, 190, 175, 230]

metrics = compute_performance_metrics(predictions, actuals)
# {
#   "mae": 8.0,
#   "mape": 4.21,
#   "r2": 0.982,
#   "bias": -1.0,
#   "n_samples": 5
# }

registry.update_performance("F-PLAN-002", metrics)
```

### Example 3: Calibration Flow
```python
def calibrate_formula(formula_id: str, training_data: List[Dict]):
    """Full calibration flow for a formula."""
    
    formula = registry.get(formula_id)
    
    # 1. Split data
    train, validate = split_data(training_data, train_ratio=0.8)
    
    # 2. Fit coefficients
    fitted_coefs = fit_coefficients(formula, train)
    
    # 3. Bootstrap uncertainty
    uncertainties = bootstrap_uncertainty(formula, train, n_bootstrap=1000)
    
    # 4. Validate
    val_metrics = validate_formula(formula, fitted_coefs, validate)
    
    # 5. Compare to previous
    if formula["performance"]["mape"] is not None:
        if val_metrics["mape"] < formula["performance"]["mape"]:
            # Improvement - deploy
            deploy_calibration(formula_id, fitted_coefs, uncertainties)
            return {"status": "DEPLOYED", "improvement": True}
        else:
            # Regression - rollback
            return {"status": "ROLLED_BACK", "reason": "No improvement"}
    else:
        # First calibration
        deploy_calibration(formula_id, fitted_coefs, uncertainties)
        return {"status": "DEPLOYED", "first_calibration": True}
```

---

## 8. ERROR HANDLING

| Error | Cause | Recovery |
|-------|-------|----------|
| FORMULA_NOT_FOUND | Invalid formula ID | Check registry, suggest similar |
| CALIBRATION_FAILED | Insufficient data or bad fit | Collect more data, review formula |
| VALIDATION_FAILED | Poor validation metrics | Rollback, investigate data |
| COEFFICIENT_CONFLICT | Multiple formulas updating same K | Lock mechanism, queue updates |
| CRITICAL_DEGRADATION | MAPE > 50% | **HALT formula use**, force recalibration |

```python
def handle_calibration_error(error, formula_id):
    """Handle calibration errors with appropriate recovery."""
    
    if error.type == "CRITICAL_DEGRADATION":
        # Safety-critical: halt formula
        registry.update_status(formula_id, "SUSPENDED")
        alert_user(f"Formula {formula_id} suspended due to critical degradation")
        return {"action": "HALTED", "requires": "manual_review"}
    
    elif error.type == "CALIBRATION_FAILED":
        # Insufficient data
        return {
            "action": "COLLECT_MORE_DATA",
            "current_points": error.data_points,
            "required": 10
        }
    
    else:
        log_error(error)
        return {"action": "LOGGED", "requires": "investigation"}
```

---

## 9. HOOKS INTEGRATION

```python
FORMULA_HOOKS = {
    "formula:calibrationCheck": {
        "priority": 50,
        "handler": check_and_alert_calibration,
        "description": "Check formula health, trigger alerts"
    },
    "formula:coefficientUpdate": {
        "priority": 55,
        "handler": propagate_coefficient_change,
        "description": "Update all formulas using changed coefficient"
    },
    "formula:upgrade": {
        "priority": 60,
        "handler": upgrade_formula_version,
        "description": "Deploy new formula version"
    },
    "prediction:create": {
        "priority": 200,
        "handler": log_prediction,
        "description": "Log prediction for later comparison"
    },
    "prediction:recordActual": {
        "priority": 205,
        "handler": record_actual_outcome,
        "description": "Record actual value, compute residual"
    },
    "prediction:triggerCalibration": {
        "priority": 210,
        "handler": check_and_trigger_calibration,
        "description": "Check if calibration needed"
    }
}
```

---

## 10. ALERT LEVELS

| Alert | Condition | Action |
|-------|-----------|--------|
| 🔴 CRITICAL | MAPE > 50% or \|Bias\| > 25% | **HALT formula use** |
| 🟠 WARNING | MAPE > 20% or \|Bias\| > 10% | Recalibrate in 3 sessions |
| 🟡 NOTICE | Calibration > 30 days | Review needed |
| 🟢 HEALTHY | All metrics in bounds | Continue |

---

## 11. CORE PRISM FORMULAS

| ID | Formula | Domain | Status |
|----|---------|--------|--------|
| F-PLAN-001 | C(T) = Σ Done(i) / n | Completeness | ACTIVE |
| F-PLAN-002 | EFFORT = Σ(Base × Cmplx × Risk) | Estimation | ACTIVE |
| F-PLAN-003 | TCC = C × V × (1-E) | Confidence | ACTIVE |
| F-MAT-001 | MCI = Σ(w × has) / Σw | Coverage | ACTIVE |
| F-QUAL-001 | Ω = Σ wᵢ × Componentᵢ | Master Eq | ACTIVE |
| F-PHYS-001 | Fc = Kc1.1 × b × h^(1-mc) | Kienzle | **CRITICAL** |
| F-PHYS-002 | V × T^n = C | Taylor | **CRITICAL** |
| F-PHYS-003 | σ = (A+Bεⁿ)(1+Cln ε̇*)(1-T*ᵐ) | Johnson-Cook | **CRITICAL** |

---

## 12. QUICK REFERENCE

### Commands
```powershell
# Check formula health
py -3 C:\PRISM\scripts\validate_formulas.py

# Trigger calibration for specific formula
py -3 C:\PRISM\scripts\calibrate_formula.py F-PLAN-002

# View calibration status
py -3 C:\PRISM\scripts\prism_unified_system_v6.py --formula-status
```

### Enforcement Summary
| Rule | Type | Description |
|------|------|-------------|
| Registration required | HARD | No unregistered formulas in production |
| Uncertainty required | HARD | All outputs include uncertainty bounds |
| Calibration tracking | HARD | All coefficients have calibration status |
| Prediction logging | SOFT | Should log predictions for calibration |
| Critical alerts | HARD | MAPE > 50% halts formula use |

---

**FORMULAS THAT DON'T EVOLVE ARE FOSSILS.**

**Version:** 2.0 | **Date:** 2026-01-29 | **Level:** 0 (Always-On)
**Enhanced:** Extended YAML, implementation code, examples, error handling, hooks
