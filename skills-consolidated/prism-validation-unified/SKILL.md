---
name: prism-validation-unified
description: |
  Complete validation pyramid: TDD → Automated Checks → Quality Gates → Ralph Loop.
  Covers test-driven development, parameter validation, phase gates, and API-based review.
  Consolidates: quality-gates, ralph-validation, validator, tdd-enhanced.
  Note: prism-anti-regression remains separate (different concern).
---

## Quick Reference (Operational)

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-validation-unified")`
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
**Example 1**: User asks about validation
→ Load skill: skill_content("prism-validation-unified") → Apply relevant knowledge → Provide structured response

**Example 2**: Task requires unified guidance
→ Load skill → Extract applicable section → Cross-reference with related skills → Deliver recommendation

# PRISM Validation Unified
## 4-Layer Quality Pyramid

```
Layer 4: RALPH LOOP      ← API-based independent review, Omega scoring
Layer 3: QUALITY GATES   ← Phase-specific pass/fail criteria
Layer 2: AUTOMATED       ← Parameter ranges, syntax, physical consistency
Layer 1: TDD             ← Unit tests, RED-GREEN-REFACTOR cycle
```

## 1. TDD (Test-Driven Development)

### The Iron Law
**Write tests BEFORE implementation code. No exceptions.**

### RED-GREEN-REFACTOR Cycle
```
RED:     Write a failing test that defines desired behavior
GREEN:   Write MINIMUM code to make the test pass
REFACTOR: Clean up while keeping tests green
REPEAT:  Next behavior increment
```

### Test Structure
```typescript
describe('calculateCuttingForce', () => {
  it('returns correct Fc for 4140 steel milling', () => {
    const result = calculateCuttingForce({ kc1_1: 1800, mc: 0.25, b: 3, h: 0.1 });
    expect(result.success).toBe(true);
    expect(result.value.Fc).toBeCloseTo(1350, -1); // ±10N
  });

  it('returns error for missing kc1_1', () => {
    const result = calculateCuttingForce({ mc: 0.25, b: 3, h: 0.1 });
    expect(result.success).toBe(false);
  });

  it('returns error for h=0', () => {
    const result = calculateCuttingForce({ kc1_1: 1800, mc: 0.25, b: 3, h: 0 });
    expect(result.success).toBe(false);
  });
});
```

### Coverage Requirements
| Code Type | Minimum Coverage |
|-----------|-----------------|
| Safety-critical calculations | 100% branch |
| Dispatcher actions | 90% statement |
| Utility functions | 80% statement |
| UI/formatting | 60% statement |

### Test Categories
- **Unit:** Individual functions, isolated with mocks
- **Integration:** Dispatcher → engine → data flow
- **Smoke:** `npm run test:critical` — must pass before build
- **Regression:** Tests for every bug found (never regress)

## 2. AUTOMATED VALIDATION

### Parameter Range Checks (prism_validate dispatcher)
```typescript
prism_validate→material({ material_id: "4140_steel" })
// Checks: all params within valid ranges, required fields present

prism_validate→kienzle({ kc1_1: 1800, mc: 0.25 })
// Checks: kc1_1 in [300,4500], mc in [0.10,0.45]

prism_validate→johnson_cook({ A: 806, B: 614, n: 0.168, C: 0.0089, m: 1.1 })
// Checks: all positive, n < 1, C < 0.1, m in [0.5,2.0]

prism_validate→safety({ content: "...", threshold: 0.70 })
// S(x) ≥ 0.70 or BLOCKED
```

### Syntax Validation
- JSON schema compliance for all data files
- TypeScript strict mode (no implicit any, strict null checks)
- Lint clean (ESLint with PRISM ruleset)

### Physical Consistency
- Power ≈ Fc × Vc / 60000 (±15%)
- Torque ≈ Power × 9549 / RPM (±10%)
- MRR ≈ ap × ae × Vf (±5%)
- Cross-check violations → recalculate from first principles

## 3. QUALITY GATES

### Phase Gate Definitions
| Phase | Gate | Pass Criteria |
|-------|------|--------------|
| **Design** | G1 | Requirements documented, architecture reviewed |
| **Implementation** | G2 | Tests written (RED), code passes (GREEN), lint clean |
| **Integration** | G3 | Dispatcher wired, smoke tests pass, no regressions |
| **Validation** | G4 | S(x) ≥ 0.70, Ω ≥ 0.65, anti-regression passed |
| **Release** | G5 | Ω ≥ 0.70, Ralph grade ≥ B+, documentation complete |

### Gate Enforcement
```
prism_validate→completeness({ content: "...", threshold: 80 })
// Must score ≥80% to pass gate

prism_validate→anti_regression({ new_count, old_count })
// new_count ≥ old_count or BLOCKED
```

### Blocking Rules
- S(x) < 0.70 → **HARD BLOCK** (safety failure)
- Ω < 0.40 → **HARD BLOCK** (quality failure)
- anti_regression fail → **HARD BLOCK** (data loss prevention)
- completeness < 50% → **SOFT BLOCK** (warning, needs justification)

## 4. RALPH LOOP (API-Based Review)

### 4-Phase Protocol
```
SCRUTINIZE → IMPROVE → VALIDATE → ASSESS
```

| Phase | Agent | Purpose |
|-------|-------|---------|
| Scrutinize | Sonnet | Find issues, rate severity |
| Improve | Sonnet | Apply fixes based on scrutiny |
| Validate | Sonnet | Verify fixes, check for new issues |
| Assess | Opus | Final grade, Omega score, release decision |

### Execution
```javascript
prism_ralph→loop({
  content: "code or document to review",
  context: "what this is and why it matters"
})
// Returns: { grade: "A-", omega: 0.89, issues: [...], improved: "..." }
```

### Grading Scale
| Grade | Omega | Meaning |
|-------|-------|---------|
| A/A+ | ≥ 0.90 | Release ready, excellent |
| A-/B+ | ≥ 0.80 | Release ready, minor polish |
| B/B- | ≥ 0.70 | Acceptable, address feedback |
| C | ≥ 0.60 | Needs significant work |
| D/F | < 0.60 | Major revision required |

### When to Use Ralph
- New dispatcher or engine (always before merge)
- Safety-critical code changes
- Major refactors affecting >100 lines
- Pre-release validation
- When unsure about quality

## Omega Quality Equation
```
Ω(x) = 0.25R + 0.20C + 0.15P + 0.30S + 0.10L
```
R=Reasoning, C=Code quality, P=Performance, S=Safety, L=Learning.
**HARD CONSTRAINT: S(x) ≥ 0.70 or entire output BLOCKED regardless of Ω.**
