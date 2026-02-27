---
name: prism-expert-mathematics
description: |
  Numerical methods and mathematical modeling expert.
---

- Determinant calculation (recursive cofactor expansion)
- Matrix inverse (Gaussian elimination with augmented matrix)
- Eigenvalues (Power iteration for dominant eigenvalue)

### Numerical Methods
- Integration (Simpson's rule, n=1000 intervals)
- Curve fitting (Linear regression with R² calculation)
- Optimization (Gradient descent, lr=0.01, 1000 iterations)

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

## MIT Course References
- **18.06** - Linear Algebra
- **18.03** - Differential Equations
- **6.046J** - Introduction to Algorithms
- **18.085** - Computational Science & Engineering
