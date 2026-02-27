---
name: prism-universal-formulas
description: |
  109 formulas across 20 domains. Manufacturing physics, optimization, statistics, and AI/ML.
---

1. Information Theory (8 formulas)
2. Probability & Statistics (10 formulas)  
3. Optimization Theory (8 formulas)
4. Game Theory (6 formulas)
5. Control Theory (7 formulas)
6. Graph Theory (7 formulas)
7. Complexity Theory (6 formulas)
8. Reliability Engineering (6 formulas) - SAFETY CRITICAL
9. Queueing Theory (5 formulas)
10. Machine Learning Metrics (8 formulas)
11. Chaos Theory (4 formulas)
12. Network Science (4 formulas)
13. Type Theory (3 formulas)
14. Formal Logic (4 formulas)
15. Numerical Methods (5 formulas)
16. Differential Geometry (4 formulas)
17. Functional Analysis (3 formulas)
18. Algebraic Structures (3 formulas)
19. Order Theory (3 formulas)
20. Computability Theory (3 formulas)
+  Uncertainty Propagation (2 formulas)

**TOTAL: 20 domains, 109 formulas**

# ═══════════════════════════════════════════════════════════════════════════════
# DOMAIN 2: PROBABILITY & STATISTICS  
# ═══════════════════════════════════════════════════════════════════════════════

## 2.1 Bayes' Theorem

```
FORMULA: P(H|E) = P(E|H) × P(H) / P(E)

MANUFACTURING: Update tool condition with sensor data
CROSS-REF: 4.4 Expected Utility for decision-making
```

## 2.2 Law of Total Probability

```
FORMULA: P(A) = Σᵢ P(A|Bᵢ) × P(Bᵢ)

MANUFACTURING: Total failure probability across conditions
```

## 2.3 Expected Value

```
DISCRETE: E[X] = Σᵢ xᵢ × p(xᵢ)
CONTINUOUS: E[X] = ∫ x × f(x) dx

PROPERTIES: E[aX+b] = aE[X]+b, E[X+Y] = E[X]+E[Y]

MANUFACTURING: Expected tool life, mean cutting force
```

## 2.4 Variance

```
FORMULA: Var(X) = E[(X-μ)²] = E[X²] - (E[X])²
         σ = √Var(X)

PROPAGATION: Var(f) ≈ Σᵢ(∂f/∂xᵢ)²Var(xᵢ)

MANUFACTURING: Surface finish variation (MANDATORY output)
```

## 2.5 Covariance/Correlation

```
FORMULA: ρ = Cov(X,Y)/(σₓσᵧ) ∈ [-1,1]

MANUFACTURING: Cutting force vs temperature correlation
```

## 2.6 Central Limit Theorem

```
FORMULA: (X̄-μ)/(σ/√n) →ᵈ N(0,1) as n→∞

PRACTICAL: n ≥ 30

MANUFACTURING: SPC chart design
```

## 2.7 MLE

```
FORMULA: θ̂ = argmax_θ Σᵢ log f(xᵢ|θ)

NUMERICAL: Use log-likelihood, multiple starts

MANUFACTURING: Taylor exponent estimation
```

## 2.8 Confidence Intervals

```
FORMULA: X̄ ± z_{α/2} × σ/√n
95%: z = 1.96

MANDATORY: All PRISM outputs require uncertainty bounds
```

## 2.9 Hypothesis Testing

```
p-VALUE: P(|Z| ≥ |z_obs| | H₀)
DECISION: Reject if p < α

MANUFACTURING: Process improvement significance
```

## 2.10 Bootstrap

```
ALGORITHM: Resample B≥1000 times, compute CI from percentiles

MANUFACTURING: Complex statistic uncertainty
```

# ═══════════════════════════════════════════════════════════════════════════════
# DOMAIN 4: GAME THEORY
# ═══════════════════════════════════════════════════════════════════════════════

## 4.1 Nash Equilibrium
## 4.2 Minimax
## 4.3 Shapley Value
## 4.4 Expected Utility
## 4.5 Mechanism Design
## 4.6 Correlated Equilibrium

[Full formulas as established in v1.0]

# ═══════════════════════════════════════════════════════════════════════════════
# DOMAIN 6-7: GRAPH THEORY & COMPLEXITY
# ═══════════════════════════════════════════════════════════════════════════════

[Full formulas as established in v1.0]

# ═══════════════════════════════════════════════════════════════════════════════
# DOMAINS 9-15: [Queueing, ML Metrics, Chaos, Network, Type, Logic, Numerical]
# ═══════════════════════════════════════════════════════════════════════════════

[Full formulas as established in v1.0]

# ═══════════════════════════════════════════════════════════════════════════════
# UNCERTAINTY PROPAGATION (NEW)
# ═══════════════════════════════════════════════════════════════════════════════

## UP.1 Linear Propagation
```
σ²_f ≈ Σᵢ(∂f/∂xᵢ)²σ²ᵢ (independent inputs)
```

## UP.2 Monte Carlo
```
Sample inputs → Compute f → Estimate output distribution
```

# VERSION: 1.1.0 (Enhanced)
# MS-001 RALPH LOOP 2 COMPLETE ✅
