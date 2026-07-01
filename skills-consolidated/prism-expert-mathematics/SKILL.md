---
name: prism-expert-mathematics
description: |
  AI Domain Expert for Applied Mathematics & Computation. Provides matrix operations,
  numerical methods, interpolation, root finding, integration, and statistical analysis.
  Covers condition numbers, pivoting strategies, and spline methods.
---

# PRISM Expert: Mathematics Savant
## AI Domain Expert Skill for Applied Mathematics & Computation

---

## Expert Profile

| Attribute | Value |
|-----------|-------|
| **ID** | `math_savant` |
| **Name** | Mathematics Savant |
| **Domain** | Applied Mathematics & Computation |
| **Source** | PRISM_PHASE8_EXPERTS.MathematicsSavant |
| **Lines** | 590369-590502 |
| **Confidence** | 1.0 |

---

## Knowledge Base

### Matrix Operations
- Determinant calculation (recursive cofactor expansion)
- Matrix inverse (Gaussian elimination with augmented matrix)
- Eigenvalues (Power iteration for dominant eigenvalue)

### Numerical Methods
- Integration (Simpson's rule, n=1000 intervals)
- Curve fitting (Linear regression with R² calculation)
- Optimization (Gradient descent, lr=0.01, 1000 iterations)

---

## Analysis Patterns (JavaScript)

### Determinant (Recursive)
```javascript
function determinant(matrix) {
    const n = matrix.length;
    if (n === 1) return matrix[0][0];
    if (n === 2) return matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];

    let det = 0;
    for (let j = 0; j < n; j++) {
        const minor = matrix.slice(1).map(row => 
            [...row.slice(0, j), ...row.slice(j + 1)]
        );
        det += Math.pow(-1, j) * matrix[0][j] * determinant(minor);
    }
    return det;
}
```

### Matrix Inverse (Gaussian Elimination)
```javascript
function matrixInverse(matrix) {
    const n = matrix.length;
    const augmented = matrix.map((row, i) => 
        [...row, ...Array(n).fill(0).map((_, j) => i === j ? 1 : 0)]
    );

    for (let i = 0; i < n; i++) {
        let pivot = augmented[i][i];
        if (Math.abs(pivot) < 1e-10) return null; // Singular

        for (let j = 0; j < 2 * n; j++) augmented[i][j] /= pivot;

        for (let k = 0; k < n; k++) {
            if (k !== i) {
                const factor = augmented[k][i];
                for (let j = 0; j < 2 * n; j++) {
                    augmented[k][j] -= factor * augmented[i][j];
                }
            }
        }
    }
    return augmented.map(row => row.slice(n));
}
```

### Eigenvalues (Power Iteration)
```javascript
function eigenvalues(matrix) {
    const n = matrix.length;
    let v = Array(n).fill(1);

    for (let iter = 0; iter < 100; iter++) {
        const Av = matrix.map(row => 
            row.reduce((s, val, j) => s + val * v[j], 0)
        );
        const norm = Math.sqrt(Av.reduce((s, x) => s + x * x, 0));
        v = Av.map(x => x / norm);
    }
    
    const Av = matrix.map(row => row.reduce((s, val, j) => s + val * v[j], 0));
    const lambda = Av.reduce((s, x, i) => s + x * v[i], 0);

    return { dominant: lambda.toFixed(6), vector: v.map(x => x.toFixed(4)) };
}
```

### Numerical Integration (Simpson's Rule)
```javascript
function integrate(fn, a, b) {
    const n = 1000;
    const h = (b - a) / n;
    let sum = fn(a) + fn(b);

    for (let i = 1; i < n; i++) {
        const x = a + i * h;
        sum += (i % 2 === 0 ? 2 : 4) * fn(x);
    }
    return (h / 3 * sum).toFixed(6);
}
```

### Linear Regression with R²
```javascript
function curveFit(points) {
    const n = points.length;
    const sumX = points.reduce((s, p) => s + p.x, 0);
    const sumY = points.reduce((s, p) => s + p.y, 0);
    const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
    const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const yMean = sumY / n;
    const ssTotal = points.reduce((s, p) => s + Math.pow(p.y - yMean, 2), 0);
    const ssRes = points.reduce((s, p) => 
        s + Math.pow(p.y - (slope * p.x + intercept), 2), 0
    );
    const r2 = 1 - ssRes / ssTotal;

    return { slope: slope.toFixed(4), intercept: intercept.toFixed(4), r2: r2.toFixed(4) };
}
```

### Gradient Descent Optimization
```javascript
function optimize(objective) {
    let x = objective.initial || [0, 0];
    const lr = 0.01;

    for (let iter = 0; iter < 1000; iter++) {
        const grad = objective.gradient(x);
        x = x.map((xi, i) => xi - lr * grad[i]);
    }
    return { optimum: x.map(v => v.toFixed(4)), value: objective.fn(x).toFixed(4) };
}
```

---

## Integration Points

### PRISM Modules Using This Expert
1. **PRISM_OPTIMIZATION_ENGINE** - Multi-variable optimization
2. **PRISM_REGRESSION_ANALYZER** - Data fitting and prediction
3. **PRISM_STABILITY_LOBES** - Eigenvalue calculation for chatter
4. **PRISM_KINEMATICS_SOLVER** - Transformation matrices
5. **PRISM_MONTE_CARLO** - Numerical integration

### Input Requirements
```javascript
{
  problem: {
    matrix: [[values]],           // For matrix operations
    operation: 'inverse' | 'determinant' | 'eigenvalues',
    function: fn,                 // For integration
    bounds: { a, b },
    points: [{ x, y }],           // For curve fitting
    objective: { fn, gradient }   // For optimization
  }
}
```

---

## Quick Consultation

### When to Consult
- Solving system of equations
- Fitting empirical data
- Numerical optimization problems
- Stability analysis (eigenvalues)
- Area/volume calculations

---

## MIT Course References
- **18.06** - Linear Algebra
- **18.03** - Differential Equations
- **6.046J** - Introduction to Algorithms
- **18.085** - Computational Science & Engineering
