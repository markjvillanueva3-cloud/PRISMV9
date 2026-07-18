# PRISM Code Review Rules

## Physics Formula Correctness (CRITICAL)
- Kienzle force: Fc = kc1_1 * ap * fz^(1-mc) — verify exponent sign and units
- Taylor tool life: T = (C/Vc)^(1/n) — verify C and n are material/tool specific
- Deflection: delta = FL^3/(3EI) — verify boundary conditions match (cantilever vs supported)
- Merchant shear angle: phi = pi/4 - beta/2 + gamma/2 — verify sign convention
- Chip thinning: hm = fz * (ae/D) * sqrt(1 - (ae/D)^2) — verify radial engagement ratio
- Surface roughness: Ra = fz^2 / (32 * r_nose) — verify nose radius units match
- Stability lobes: omega_c = (2*pi*n)/60 — verify RPM to rad/s conversion
- Any constants must reference src/physics/constants.ts — no hardcoded physics values
- Dimensional analysis: forces in N, lengths in mm, pressures in MPa, speeds in m/min
- Temperature in Celsius unless explicitly Kelvin for thermodynamic formulas
- Angular values: radians internally, degrees only at user-facing boundaries

## Dispatcher Wiring (HIGH)
- New engines MUST be wired to a dispatcher with z.enum entry + case statement
- Schema file must exist for new action groups
- Action names must be snake_case and unique across all dispatchers
- Lazy imports required: `const { Engine } = await import('path')`
- Never decrease total action count (anti-regression)
- Cross-dispatcher collision check: no two dispatchers may share an action name
- z.enum arrays must be sorted alphabetically for maintainability
- Every case must return a result — no fall-through without explicit comment

## Test Coverage (HIGH)
- Every new engine needs a companion test file in __tests__/
- Minimum 10 test cases per engine
- Physics tests must verify dimensional consistency (output units match expected)
- Use toBeCloseTo for floating-point comparisons, never toEqual for decimals
- Edge cases required: zero inputs, extreme values, boundary conditions
- Negative input handling: forces, speeds, dimensions cannot be negative
- NaN/Infinity propagation tests for division-heavy formulas
- Monte Carlo tests must use seeded PRNG for reproducibility

## Code Quality (MEDIUM)
- No @ts-nocheck or @ts-ignore without justification comment
- No z.any() in schemas — use specific Zod types
- No console.log in production code — use structured logger
- Functions > 100 lines should be decomposed into helpers
- Exported functions require JSDoc with @param and @returns
- Prefer const over let; never use var
- Switch statements must have default case
- Avoid nested ternaries deeper than one level

## Security (HIGH)
- No hardcoded API keys, passwords, or tokens
- No eval() or new Function() with user input
- File paths must be sanitized (no path traversal via ../)
- External URLs must be validated against allowlist
- User-supplied G-code must be parsed, never executed directly
- Regex patterns from user input must be wrapped in try/catch (ReDoS)
- No prototype pollution: avoid Object.assign from untrusted sources

## Performance (MEDIUM)
- Large catalogs (>1000 entries) must use lazy loading via dynamic import
- Avoid synchronous file reads in hot paths — use async/await
- Cache expensive calculations with appropriate TTL
- Monte Carlo defaults: 500 trials minimum for CI95, 1000 for CI99
- Avoid O(n^2) or worse in loops over tool catalogs (95K+ entries)
- Matrix operations: verify dimensions before multiply to fail fast
- Dispatcher switch statements: most-frequent actions first for JIT optimization

## Backward Compatibility (HIGH)
- Never remove exported symbols without deprecation period (minimum 1 minor version)
- Never rename dispatcher actions (breaks existing integrations)
- Schema changes must be additive (new optional fields only)
- Catalog field removals require migration path documented in PR
- Engine constructor signature changes require backward-compatible overloads
- CLI command flags: deprecated flags must still parse (warn, don't error)
- MCP tool names are immutable once published

## PRISM-Specific Patterns (MEDIUM)
- Engine files: class name must match filename (FooEngine in FooEngine.ts)
- Catalog files: must export a typed array, not untyped JSON
- Hook rules: must have unique rule ID, no collisions with existing 213 rules
- Skill files: must include argument-hint in frontmatter
- Tribal tips: must have unique ID within their CAM system prefix
- Formula references: prefer FormulaRegistry linkage over inline citations
