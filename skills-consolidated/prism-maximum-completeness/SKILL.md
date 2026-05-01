---
name: prism-maximum-completeness
description: |
  Enforces 100% theoretical, mathematical, and statistical completeness in all work.
  No partial implementations. No "good enough" approximations. No orphaned features.
  Every task must be done to its fullest with complete implementation and utilization.
  Applies to PRISM features, R&D, algorithms, databases, and all development work.
---

# PRISM Maximum Completeness
## 100% Theoretical, Mathematical, and Statistical Fullness

---

## THE PRINCIPLE

> **"A task is done to the fullest at the theoretical, mathematical, and statistical level. It must be done to 100% with the ability to be fully implemented and utilized. This applies to PRISM features, building, research, and development - creating the app to its maximum potential."**

Partial work is technical debt that compounds.
Incomplete theory is a bug waiting to manifest.
Unused capability is wasted potential.

---

## THREE PILLARS OF COMPLETENESS

### 1. THEORETICAL COMPLETENESS

Every feature must be grounded in complete theory:

```
□ Full derivation from first principles documented
□ All assumptions explicitly stated
□ Boundary conditions identified
□ Edge cases enumerated
□ Failure modes understood
□ Relationships to other theories mapped
□ Source literature cited (peer-reviewed preferred)
□ Alternative approaches considered and documented
```

### 2. MATHEMATICAL COMPLETENESS

Every calculation must cover the full mathematical space:

```
□ All variables defined with units
□ Domain and range specified
□ Singularities identified and handled
□ Numerical stability ensured
□ Precision requirements documented
□ Error propagation calculated
□ Inverse functions provided where applicable
□ Derivatives provided for optimization
□ Integration with related calculations
```

### 3. STATISTICAL COMPLETENESS

Every data-driven element must have statistical rigor:

```
□ Sample size documented and justified
□ Distribution identified or assumed
□ Central tendency (mean, median, mode as appropriate)
□ Dispersion (std dev, range, IQR)
□ Confidence intervals calculated
□ Outliers identified and handled
□ Correlation with other variables examined
□ Regression quality metrics (R², RMSE, residuals)
□ Validation against holdout data
□ Uncertainty quantified at every output
```

---

## IMPLEMENTATION COMPLETENESS

Building something means building it **completely**:

### Feature Completeness Checklist

```
□ Core functionality implemented
□ All configuration options exposed
□ Default values scientifically justified
□ Edge cases handled
□ Error messages are actionable
□ Logging captures decision points
□ Performance meets requirements
□ Memory usage acceptable
□ Tested at boundaries
□ Documentation complete
□ Examples provided
□ Integration points defined
□ Backward compatibility addressed
□ Forward compatibility considered
□ Deprecation path defined (if replacing something)
```

### The 100% Rule

| Aspect | Requirement |
|--------|-------------|
| Parameters | 100% of applicable parameters implemented |
| Ranges | 100% of valid input range handled |
| Outputs | 100% of meaningful outputs provided |
| Errors | 100% of failure modes caught and reported |
| Tests | 100% of critical paths tested |
| Docs | 100% of public interfaces documented |

---

## UTILIZATION COMPLETENESS

**IF YOU BUILD IT, IT MUST BE USED.**

This is Commandment #1: "IF IT EXISTS, USE IT EVERYWHERE"

```
□ Every database is consumed by all applicable consumers
□ Every algorithm is available to all applicable products
□ Every calculation feeds into all dependent calculations
□ Every feature is accessible through all applicable interfaces
□ No orphaned code
□ No unused tables
□ No dead parameters
□ No isolated features
```

---

## COMPLETENESS METRICS

### Quantifying "Done"

| Metric | Minimum | Target |
|--------|---------|--------|
| Theory documentation | 90% | 100% |
| Math derivation coverage | 95% | 100% |
| Statistical uncertainty quantified | 90% | 100% |
| Parameter coverage | 95% | 100% |
| Test coverage (critical paths) | 90% | 100% |
| Consumer utilization | 95% | 100% |
| Documentation completeness | 90% | 100% |

### Completeness Score

```
Completeness = (Σ implemented_items / Σ required_items) × 100

Minimum acceptable: 95%
Target: 100%
Ship threshold: 98% (with documented exceptions)
```

---

## ANTI-PATTERNS

### Never Do These

| Anti-Pattern | Why It Fails |
|--------------|--------------|
| "We'll add that later" | Later never comes |
| "That's an edge case" | Edge cases are production cases |
| "Good enough for now" | Now becomes forever |
| "Nobody will use that" | Somebody always does |
| "It's just a v1" | v1 sets the standard |
| "We can refactor" | Refactoring never gets prioritized |
| Partial formula implementation | Creates silent errors |
| Missing uncertainty | False confidence in outputs |
| Unused database fields | Wasted potential, confusion |
| Undocumented assumptions | Bugs in disguise |

---

## THE COMMITMENT

> I will not consider a task done until it is theoretically grounded,
> mathematically complete, statistically rigorous, fully implemented,
> and completely utilized.
>
> Partial work is not work—it's debt.
> Incomplete theory is not theory—it's guessing.
> Unused capability is not capability—it's waste.
>
> I build to 100%, or I document exactly why not.

---

## REMEMBER

- 80% complete is 0% shippable
- Unused features are failed features
- Theory without implementation is academic
- Implementation without theory is dangerous
- Math without statistics is overconfident
- Statistics without math is meaningless

**Do it completely, or document why you can't. There is no middle ground.**

---

**Version 1.0 | Created 2026-01-24 | PRISM v9.0 Maximum Completeness Protocol**
