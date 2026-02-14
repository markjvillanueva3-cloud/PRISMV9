## 9 VALIDATION GATES — Ordered Pipeline

### Input Validation (before computation)
G1: Input parameter validation — types, ranges, units correct?
G2: Material property consistency — Kienzle/Taylor/J-C coefficients valid?

### Physics Validation (during computation)
G3: Physics model validation — force balance, energy conservation maintained?
G4: Cross-reference verification — material ↔ tool ↔ machine compatible?

### Output Validation (after computation)
G5: Anti-regression — new output ≥ old output capability?
G6: Completeness — no null/placeholder values, ≥80% fields populated?
G7: Evidence level — ≥L3 for standard release, ≥L4 for safety-critical?

### Release Gates (BLOCKING)
G8: S(x) ≥ 0.70 — HARD BLOCK. Safety score must pass.
G9: Ω(x) ≥ 0.70 — WARN. Overall quality below release threshold.

### How Gates Are Enforced
- G1-G2: autoInputValidation (pre-dispatch, automatic)
- G3-G4: CalcHookMiddleware + safety engine validation
- G5: prism_validate→anti_regression + autoDocAntiRegression
- G6: prism_validate→completeness
- G7: prism_sp→evidence_level
- G8: pre-output BLOCKING hook (cannot bypass)
- G9: prism_omega→compute (advisory, not blocking)

### Quick Validation Recipes
Check one output: prism_validate→safety (returns S(x) score)
Check completeness: prism_validate→completeness (returns % and gaps)
Full gate sweep: prism_sp→validate_gates_full (runs all 9)
Physics check: prism_validate→kienzle/taylor/johnson_cook (model-specific)

## Changelog
- 2026-02-10: v3.0 — Content-optimized. Ordered pipeline. Enforcement mapping. Quick recipes.
- 2026-02-10: v2.0 — File-based. Added descriptions.
