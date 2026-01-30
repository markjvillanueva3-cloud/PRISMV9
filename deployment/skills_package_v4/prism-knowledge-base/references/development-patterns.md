# Development Quick Reference

## Patterns & Best Practices from MIT Courses

---

## 💻 CODING PATTERNS

### From 6.001 - SICP

**Abstraction Barrier Pattern**
```
✓ Define abstract interface
✓ Hide implementation details
✓ Clients use only interface
✓ Can change implementation freely

Example: Database layer provides get/set,
         hides whether memory, IndexedDB, or file
```

**Wishful Thinking Pattern**
```
✓ Assume helper functions exist
✓ Write high-level code first
✓ Implement helpers later
✓ Top-down decomposition

Example: Write processJob() assuming 
         calculateTime(), checkMaterial() exist
```

**Data-Directed Programming**
```
✓ Dispatch on data type
✓ Extensible without modifying core
✓ Table lookup for operations
✓ Supports new types easily

Example: PRISM_GATEWAY routes by operation type
```

### From 6.005 - Software Construction

**Specification Pattern**
```
✓ REQUIRES: preconditions (what caller must ensure)
✓ MODIFIES: what may be changed
✓ EFFECTS: what the function does
✓ Write spec BEFORE implementation

Example:
/**
 * REQUIRES: material exists in database
 * MODIFIES: nothing
 * EFFECTS: returns cutting speed in m/min
 */
function getCuttingSpeed(materialId) { ... }
```

**Testing Strategy**
```
✓ Partition inputs into equivalence classes
✓ Test boundaries
✓ Test special cases (empty, null, negative)
✓ Test combinations of inputs

Example for calculateForce(depth, feed, speed):
- depth: 0, small, typical, max, beyond max
- feed: 0, small, typical, max
- speed: 0, small, typical, max
- Combinations: all zeros, all max, typical
```

**Fail Fast Pattern**
```
✓ Check preconditions immediately
✓ Throw descriptive errors
✓ Don't continue with bad state
✓ Easier debugging

Example:
function calculateSpeed(material) {
  if (!material) throw new Error('Material required');
  if (!material.kc) throw new Error('Material missing kc');
  // ... proceed safely
}
```

**Immutability Pattern**
```
✓ Never modify input parameters
✓ Return new objects instead
✓ Prevents aliasing bugs
✓ Thread-safe by default

Example:
// BAD
function addOperation(job, op) {
  job.operations.push(op);
  return job;
}

// GOOD  
function addOperation(job, op) {
  return {
    ...job,
    operations: [...job.operations, op]
  };
}
```

### From 6.033 - Computer Systems

**End-to-End Principle**
```
✓ Put functionality at endpoints
✓ Keep middle layers simple
✓ Complexity belongs at edges
✓ More reliable, more flexible

Example: Validation at UI AND at database,
         not relying on middleware
```

**Modularity Pattern**
```
✓ Small, focused modules
✓ One responsibility each
✓ Clear interfaces between
✓ Limit blast radius of changes

Example: Separate modules for
         parsing, calculating, formatting, storing
```

**Logging Strategy**
```
✓ Log at module boundaries
✓ Include context (user, operation, data)
✓ Log errors with stack traces
✓ Log enough to reconstruct what happened

Example:
logger.info('Speed calculation', {
  userId, materialId, toolId,
  inputs: { depth, feed },
  result: { speed, confidence }
});
```

---

## 🧮 ALGORITHM SELECTION

### From 6.046J - Algorithms

**When to Use Dynamic Programming**
```
✓ Optimal substructure (optimal solution uses optimal sub-solutions)
✓ Overlapping subproblems (same subproblems solved repeatedly)
✓ Can define recurrence relation
✓ Bottom-up often faster than recursion

PRISM uses: Multi-pass optimization, toolpath sequencing
```

**When to Use Greedy**
```
✓ Local optimal leads to global optimal
✓ Greedy choice property holds
✓ Fast O(n log n) typical
✓ May need proof of correctness

PRISM uses: Tool selection, operation ordering
```

**When to Use Divide & Conquer**
```
✓ Problem divisible into independent subproblems
✓ Subproblems same type as original
✓ Can combine solutions efficiently
✓ Often O(n log n)

PRISM uses: Toolpath segmentation, mesh processing
```

**Graph Algorithm Selection**
| Problem | Algorithm | Complexity |
|---------|-----------|------------|
| Shortest path (positive) | Dijkstra | O((V+E) log V) |
| Shortest path (negative) | Bellman-Ford | O(VE) |
| All pairs shortest | Floyd-Warshall | O(V³) |
| Minimum spanning tree | Prim/Kruskal | O(E log V) |
| Topological sort | DFS | O(V+E) |
| Strongly connected | Tarjan | O(V+E) |
| Max flow | Ford-Fulkerson | O(VE²) |

---

## 🤖 ML IMPLEMENTATION

### From 6.867 - Machine Learning

**Model Selection Checklist**
```
✓ Define success metric first
✓ Start with simple baseline
✓ Cross-validate (k-fold)
✓ Watch for overfitting (train vs test gap)
✓ Consider interpretability needs
✓ Check data distribution assumptions
```

**Feature Engineering Tips**
```
✓ Normalize/standardize numerical features
✓ One-hot encode categoricals
✓ Handle missing values explicitly
✓ Create interaction features if physics suggests
✓ Use domain knowledge for features

PRISM example: machiningIndex = speed * feed / depth
              (physics-motivated feature)
```

**Regularization Guidelines**
```
L1 (Lasso): Sparse solutions, feature selection
L2 (Ridge): All features used, prevents large weights
ElasticNet: Combination of both

Start with L2, switch to L1 if need sparse
```

**Uncertainty Quantification**
```
✓ Report confidence intervals
✓ Use ensemble for variance estimate
✓ Bayesian methods for full posterior
✓ Flag low-confidence predictions

Example output:
{
  speed: 150,
  confidence: 0.87,
  range_95: [140, 160]
}
```

---

## 📊 OPTIMIZATION IMPLEMENTATION

### From 6.079 / 6.251J

**Problem Formulation Checklist**
```
1. Define objective (minimize/maximize what?)
2. Identify decision variables
3. List constraints (equality, inequality, bounds)
4. Check convexity (if yes, global optimum guaranteed)
5. Choose appropriate solver
```

**Solver Selection**
| Problem Type | Solver/Method |
|--------------|---------------|
| Linear (LP) | Simplex, Interior Point |
| Quadratic (QP) | Interior Point, Active Set |
| Convex | CVX, CVXPY, MOSEK |
| Nonlinear | IPOPT, SLSQP, Newton |
| Integer (MIP) | Branch & Bound, Gurobi |
| Black-box | Bayesian Opt, PSO, GA |

**Constraint Handling**
```
Equality: Use substitution or Lagrangian
Inequality: Use barrier/penalty or KKT
Bounds: Often handled directly by solver
Soft constraints: Add to objective with weight
```

---

## 🔧 MANUFACTURING CALCULATIONS

### From 2.810

**Cutting Force (Kienzle)**
```
F_c = k_c1.1 × b × h^(1-m_c)

Where:
  k_c1.1 = specific cutting force at h=b=1mm
  b = chip width (mm)
  h = chip thickness (mm)  
  m_c = Kienzle exponent

Get k_c1.1, m_c from PRISM_MATERIALS_MASTER
```

**Tool Life (Taylor)**
```
V × T^n = C

Where:
  V = cutting speed (m/min)
  T = tool life (min)
  n = Taylor exponent (material dependent)
  C = Taylor constant

Rearranged: T = (C/V)^(1/n)
```

**Surface Finish (Ra)**
```
Ra_theoretical = f² / (32 × r)

Where:
  f = feed per rev (mm)
  r = nose radius (mm)

Actual Ra ≈ Ra_theoretical × (1.5 to 2.5)
(multiplier from PRISM_SURFACE_FINISH_ENGINE)
```

**Power Requirement**
```
P = F_c × V / (60 × 1000 × η)

Where:
  P = power (kW)
  F_c = cutting force (N)
  V = cutting speed (m/min)
  η = machine efficiency (0.7-0.9)
```

---

## 🎨 UI IMPLEMENTATION

### From 16.400 - Human Factors

**Error Message Guidelines**
```
✓ Say what went wrong (specifically)
✓ Say why it matters
✓ Say how to fix it
✓ Use plain language
✓ Don't blame the user

BAD:  "Error: Invalid input"
GOOD: "Feed rate 0.5 mm/rev exceeds tool limit of 0.3 mm/rev. 
       Reduce feed or select a stronger tool."
```

**Feedback Timing**
```
< 100ms: Feels instantaneous, no feedback needed
100-1000ms: Show activity indicator
> 1000ms: Show progress bar with estimate
> 10s: Allow cancellation, show detailed progress
```

**Progressive Disclosure**
```
✓ Show most common options first
✓ Hide advanced options behind "Advanced"
✓ Default to safe/recommended values
✓ Explain non-obvious options

Example: Speed/feed calculator shows basics,
         "Advanced" reveals specific force coefficients
```

---

## 🔒 SECURITY PATTERNS

### From 6.857 / 6.858

**Input Validation**
```
✓ Validate on client AND server
✓ Whitelist, don't blacklist
✓ Escape output contextually
✓ Use parameterized queries

Example:
// Client
if (!isNumeric(feed)) showError('Feed must be number');

// Server (still validate!)
const safeFeed = parseFloat(feed);
if (isNaN(safeFeed) || safeFeed < 0) throw ValidationError();
```

**Authentication Checklist**
```
✓ Hash passwords (bcrypt, argon2)
✓ Use secure random for tokens
✓ Expire sessions appropriately
✓ Rate limit login attempts
✓ Use HTTPS only
```

---

## 📐 NUMERICAL METHODS

### From 10.34 / 2.086

**ODE Solver Selection**
| Problem Type | Method |
|--------------|--------|
| Non-stiff | RK4, RK45 (adaptive) |
| Stiff | Implicit (BDF, Radau) |
| Conservative | Symplectic |

**Convergence Checking**
```
✓ Use relative tolerance, not absolute
✓ Compare consecutive iterations
✓ Set reasonable max iterations
✓ Check against known solutions

Example:
while (relError > tol && iter < maxIter) {
  newVal = iterate(oldVal);
  relError = Math.abs((newVal - oldVal) / newVal);
  oldVal = newVal;
  iter++;
}
```

**Numerical Stability**
```
✓ Avoid subtracting similar numbers
✓ Watch for overflow/underflow
✓ Use stable algorithms (e.g., Kahan summation)
✓ Scale variables to similar magnitudes
```

---

## Quick Lookup by Task

| If You're Doing... | Reference Section |
|--------------------|-------------------|
| Writing a function | Specification Pattern (6.005) |
| Designing a module | Modularity Pattern (6.033) |
| Choosing algorithm | Algorithm Selection (6.046J) |
| Building ML feature | ML Implementation (6.867) |
| Optimization problem | Optimization Implementation (6.079) |
| Force/power calc | Manufacturing Calculations (2.810) |
| UI error messages | UI Implementation (16.400) |
| Security validation | Security Patterns (6.857) |
| Numerical accuracy | Numerical Methods (10.34) |
