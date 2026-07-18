# PFP Dispatcher Action Subset Audit
## QA-MS6 P0-U05: PFP Engine Action Subset Audit

**Generated:** 2026-04-12T23:05:00Z

---

## Summary

| Metric | Count | Status |
|--------|-------|--------|
| Total Actions | 6 | Inventoried |
| Action Groups | 3 | Categorized |
| Engines Used | 1 | PFPEngine |
| Feature ID | F1 | Predictive Failure Prevention |

---

## Action Distribution

| Group | Count | Domain |
|-------|-------|--------|
| Dashboard & Overview | 1 | System status |
| Risk Assessment | 3 | Failure prediction |
| Configuration | 2 | Settings & control |

---

## Detailed Action Inventory

### Dashboard & Overview (1 action)
| Action | Purpose | Parameters |
|--------|---------|------------|
| get_dashboard | PFP system overview | None |

**Returns:**
- Top failure patterns
- SLO check status
- Pattern statistics
- Recent predictions

### Risk Assessment (3 actions)
| Action | Purpose | Parameters |
|--------|---------|------------|
| assess_risk | Risk assessment for proposed action | dispatcher, action, params |
| get_patterns | View extracted failure patterns | type, limit, min_confidence |
| get_history | View action history records | session_id, limit |

### Configuration (2 actions)
| Action | Purpose | Parameters |
|--------|---------|------------|
| force_extract | Trigger immediate pattern extraction | None |
| update_config | Modify PFP settings | config object |

---

## Engine Mapping

| Engine | Actions | Purpose |
|--------|---------|---------|
| PFPEngine | 6 | Predictive Failure Prevention |

### PFPEngine Methods
| Method | Used By |
|--------|---------|
| getDashboard() | get_dashboard |
| checkSLOs() | get_dashboard |
| assessRisk() | assess_risk |
| getPatterns() | get_patterns |
| getHistory() | get_history |
| forceExtract() | force_extract |
| updateConfig() | update_config |

---

## Pattern Types

| Type | Description |
|------|-------------|
| action_failure | Action-specific failures |
| dispatcher_failure | Dispatcher-level failures |
| parameter_failure | Invalid parameter patterns |
| sequence_failure | Failure sequences |
| timing_failure | Timing-related failures |

---

## Risk Assessment Flow

```
[Proposed Action] → assess_risk()
        ↓
[Pattern Matching] → Extract similar past actions
        ↓
[Confidence Calculation] → Bayesian inference
        ↓
[Risk Score] → 0.0 (safe) to 1.0 (high risk)
        ↓
[Recommendation] → proceed / caution / block
```

---

## SLO Definitions

| SLO | Threshold | Metric |
|-----|-----------|--------|
| pattern_freshness | <24h | Time since last extraction |
| prediction_accuracy | >80% | Correct predictions |
| false_positive_rate | <5% | Incorrect blocks |
| coverage | >90% | Actions with risk data |

---

## Usage Patterns

### Get Dashboard
```json
{
  "action": "get_dashboard"
}
```

### Assess Risk Before Action
```json
{
  "action": "assess_risk",
  "params": {
    "dispatcher": "prism_calc",
    "action": "speed_feed",
    "params": { "material": "Ti-6Al-4V" }
  }
}
```

### Get Failure Patterns
```json
{
  "action": "get_patterns",
  "params": {
    "type": "action_failure",
    "min_confidence": 0.7,
    "limit": 20
  }
}
```

---

## Verification

| Check | Status |
|-------|--------|
| All 6 actions inventoried | YES |
| Action groups mapped | YES |
| Engine methods verified | YES |
| Parameter schemas valid | YES |
| SLOs documented | YES |

---

## Conclusion

**QA-MS6 P0-U05 is COMPLETE** — The prism_pfp dispatcher has
6 actions in 3 groups, all served by the PFPEngine.

This is a compact, focused dispatcher implementing Feature F1
(Predictive Failure Prevention) with actions for dashboard viewing,
risk assessment, pattern analysis, and configuration management.

---

*QA-MS6 P0-U05 — PFP engine action subset audit complete*
