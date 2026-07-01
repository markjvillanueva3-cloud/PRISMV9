---
name: prism-code-quality
description: |
  Unified code quality standards for PRISM Manufacturing Intelligence.
  12 quality metrics (C(x) component), MIT coding patterns, McConnell's Code Complete principles.
  Consolidates: code-perfection, coding-patterns, code-complete-integration.
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "code", "quality", "unified", "standards", "manufacturing", "intelligence", "metrics"
- Quality gate check, anti-regression validation, or release readiness assessment.

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-code-quality")`
2. Apply relevant knowledge to current task context
3. Cross-reference with related dispatchers:
   - prism_validate→[relevant_action] for validation checks
   - prism_omega→compute for quality scoring
   - prism_ralph→loop for full validation cycle

### What It Returns
- **Format**: Structured markdown reference with formulas, tables, and decision criteria
- **Location**: Loaded into context via skill_content (not a file output)
- **Success**: Reference knowledge applicable to current task
- **Failure**: Content not found → verify skill exists in index

### Examples
**Example 1**: User asks about code
→ Load skill: skill_content("prism-code-quality") → Apply relevant knowledge → Provide structured response

**Example 2**: Task requires quality guidance
→ Load skill → Extract applicable section → Cross-reference with related skills → Deliver recommendation

# PRISM Code Quality
## Metrics, Patterns & Principles for Manufacturing Code

## C(x) Quality Metrics (12 Dimensions)

| # | Metric | Weight | Measurement |
|---|--------|--------|-------------|
| 1 | Correctness | 0.15 | Tests pass, physics validated |
| 2 | Completeness | 0.12 | No stubs, all paths handled |
| 3 | Consistency | 0.08 | Naming, patterns, style uniform |
| 4 | Clarity | 0.10 | Readable without comments |
| 5 | Conciseness | 0.06 | No dead code, minimal duplication |
| 6 | Coupling | 0.08 | Low module interdependence |
| 7 | Cohesion | 0.08 | High within-module relatedness |
| 8 | Coverage | 0.10 | Test coverage ≥80%, safety paths 100% |
| 9 | Complexity | 0.07 | Cyclomatic <10/function |
| 10 | Configurability | 0.05 | Magic numbers eliminated |
| 11 | Composability | 0.06 | Functions compose cleanly |
| 12 | Compliance | 0.05 | Lint clean, type-safe |

**C(x) = Σ(metric_i × weight_i)** — Target: C(x) ≥ 0.80

## MIT Foundation Patterns (6.001, 6.005, 6.046J)

### Abstraction Principles (SICP)
- **Data abstraction:** Separate representation from use. Constructors + selectors.
- **Procedural abstraction:** Functions as black boxes. Contract: precondition → postcondition.
- **Wishful thinking:** Write code assuming helpers exist, then implement them.
- **Closure property:** Combine primitive elements → compound → higher-order compounds.

### Software Construction (6.005)
- **Specification:** Every public function has: requires, modifies, effects.
- **Rep invariant:** Document and check internal representation constraints.
- **Abstraction function:** Map from concrete representation to abstract value.
- **Testing strategy:** Partition input space, test boundaries, test special cases.
- **Immutability default:** Prefer `const`, `readonly`. Mutate only when measured need.

### Algorithm Design (6.046J)
- **Complexity awareness:** Know Big-O of every operation. O(n²) is red flag for >1000 items.
- **Space-time tradeoffs:** Cache when computation >> memory cost.
- **Divide and conquer:** Break large problems into independent subproblems.

## McConnell's Code Complete Principles

### Prerequisites Checklist
Before writing code: ☐ Requirements clear ☐ Architecture decided ☐ Key classes identified ☐ Error strategy defined ☐ Security considered ☐ Performance targets set

### Pseudocode Programming Process (PPP)
1. Write function purpose as plain English comment
2. Decompose into pseudocode steps
3. Check pseudocode for errors (cheaper than code)
4. Convert each line to real code
5. Clean up: remove scaffolding, verify against spec

### Routine Design
- **One purpose:** Each function does one thing. If "and" in name, split.
- **7±2 parameters max.** More = design problem. Use objects.
- **Defensive returns:** Guard clauses at top, single purpose in body.
- **Naming:** `verb_noun` for functions, `adjective_noun` for booleans, descriptive for all.

### Control Flow
- Simplify nested conditions: extract to named booleans/functions
- Limit nesting to 3 levels (use early returns, guard clauses)
- Switch/case: always have default. Document fallthrough.
- Loop: single exit point preferred. Know exact termination condition.

### Defensive Programming
- **Assert preconditions** in development, handle gracefully in production
- **Validate all external inputs** (user, API, file, database)
- **Fail fast:** Detect errors close to source, not downstream
- **Error messages:** Include context (what failed, what was expected, what was received)

### Refactoring Triggers
| Smell | Response |
|-------|----------|
| Duplicated code | Extract shared function |
| Long function (>30 lines) | Decompose |
| Long parameter list (>5) | Create parameter object |
| Divergent change | Split class |
| Shotgun surgery | Consolidate |
| Feature envy | Move method to correct class |

## Manufacturing-Specific Quality Rules

### Safety-Critical Code
- **100% branch coverage** for any code path that produces cutting parameters
- **Bounds checking mandatory** on all physical values (speed, force, temperature)
- **Units always explicit** — never bare numbers for physical quantities
- **Result types over exceptions** — explicit success/failure, never silent errors
- **Validation at boundaries** — validate on input AND before output

### PRISM Naming Conventions
```typescript
// Dispatchers: verbNoun or nounVerb
material_get, tool_search, alarm_decode

// Functions: camelCase, descriptive
calculateCuttingForce, validateMaterialParams

// Constants: UPPER_SNAKE
MAX_SPINDLE_SPEED, DEFAULT_SAFETY_FACTOR

// Types/Interfaces: PascalCase
MaterialParams, CuttingResult, SafetyScore
```
