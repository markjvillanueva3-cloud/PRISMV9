---
name: prism-linalg-mit
description: |
  Linear algebra from MIT 18.06. LU decomposition with pivoting, linear system solving, QR factorization, least squares.

  MIT 18.06 (Linear Algebra)
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "linear algebra", "LU decomposition", "matrix", "least squares", "QR factorization", "eigenvalue", "SVD", "pivoting"
- Source: `C:/PRISM/extracted/algorithms/PRISM_LINALG_MIT.js`
- Category: numerical-methods

### How To Use
1. Load skill: `prism_skill_script->skill_content(id="prism-linalg-mit")`
2. Functions available: luDecomposition, solveLU, leastSquaresQR
3. Cross-reference with dispatchers:
   - prism_calc

### What It Returns
- **Format**: Structured computation results with parameters and formulas
- **Location**: Loaded into context via skill_content
- **Source Code**: `C:/PRISM/extracted/algorithms/PRISM_LINALG_MIT.js`

### Examples
**Example 1**: Direct function call
-> Load skill -> Apply luDecomposition() with parameters -> Return result

**Example 2**: Auto-triggered by context
-> User mentions keyword -> Skill auto-loads -> Relevant functions available

# Prism Linalg Mit

## Source
**MIT 18.06 (Linear Algebra)**

## Functions
luDecomposition, solveLU, leastSquaresQR

## Integration
- Extracted from: `PRISM_LINALG_MIT.js`
- Mapped engines: See ALGORITHM_REGISTRY.json
- Auto-load triggers: linear algebra, LU decomposition, matrix, least squares, QR factorization
