---
name: prism-ode-solvers
description: |
  ODE solvers from MIT 2.086. Euler forward/backward, RK4, adaptive step. For dynamics simulation, thermal transients, wear evolution.

  MIT 2.086 (Computational Science), MIT 2.158J
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "ODE", "differential equation", "Runge-Kutta", "RK4", "Euler method", "initial value problem", "dynamics simulation", "transient"
- Source: `C:/PRISM/extracted/algorithms/PRISM_ODE_SOLVERS_MIT.js`
- Category: numerical-methods

### How To Use
1. Load skill: `prism_skill_script->skill_content(id="prism-ode-solvers")`
2. Functions available: eulerForward, eulerBackward, rk4, rk4System
3. Cross-reference with dispatchers:
   - prism_calc

### What It Returns
- **Format**: Structured computation results with parameters and formulas
- **Location**: Loaded into context via skill_content
- **Source Code**: `C:/PRISM/extracted/algorithms/PRISM_ODE_SOLVERS_MIT.js`

### Examples
**Example 1**: Direct function call
-> Load skill -> Apply eulerForward() with parameters -> Return result

**Example 2**: Auto-triggered by context
-> User mentions keyword -> Skill auto-loads -> Relevant functions available

# Prism Ode Solvers

## Source
**MIT 2.086 (Computational Science), MIT 2.158J**

## Functions
eulerForward, eulerBackward, rk4, rk4System

## Integration
- Extracted from: `PRISM_ODE_SOLVERS_MIT.js`
- Mapped engines: See ALGORITHM_REGISTRY.json
- Auto-load triggers: ODE, differential equation, Runge-Kutta, RK4, Euler method
