---
name: prism-testing-strategy
description: |
  Comprehensive testing strategy for PRISM: what to test, how to test, when to test.
  Test pyramid, coverage targets, manufacturing-specific test patterns.
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "testing", "strategy", "comprehensive", "test", "pyramid", "coverage", "targets"
- Safety validation required, collision risk assessment, or safe parameter verification needed.

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-testing-strategy")`
2. Apply relevant knowledge to current task context
3. Cross-reference with related dispatchers:
   - prism_safety→[relevant_check] for safety validation
   - prism_skill_script→skill_content(id="prism-testing-strategy") for safety reference
   - prism_validate→safety for S(x)≥0.70 gate

### What It Returns
- **Format**: Structured markdown reference with formulas, tables, and decision criteria
- **Location**: Loaded into context via skill_content (not a file output)
- **Success**: Safety criteria, validation rules, and threshold values
- **Failure**: S(x)<0.70 → operation BLOCKED, must resolve before proceeding

### Examples
**Example 1**: Pre-operation safety check needed
→ Load skill → Run safety criteria against current parameters → Return S(x) score → BLOCK if <0.70

**Example 2**: User overriding recommended limits
→ Load skill → Flag risk factors → Require explicit acknowledgment → Log override decision

# PRISM Testing Strategy
## What, How, When to Test in Safety-Critical Manufacturing Software

## Test Pyramid

```
         /  E2E  \         Few, slow, high-value
        / Integration \    Cross-dispatcher workflows
       / Unit Tests     \  Many, fast, isolated
      / Static Analysis   \ TypeScript strict, lint
```

| Layer | Count Target | Speed | What It Catches |
|-------|-------------|-------|-----------------|
| Static | 100% | Instant | Type errors, lint issues |
| Unit | ≥80% coverage | <1s each | Logic bugs, edge cases |
| Integration | Key workflows | <5s each | Wiring, data flow |
| E2E | Critical paths | <30s each | Full system behavior |

## Coverage Targets

| Code Category | Coverage | Rationale |
|--------------|----------|-----------|
| Safety-critical calculations | **100%** | Lives depend on correctness |
| Dispatcher routing | **100%** | Every action must be reachable |
| Formula implementations | **100%** | Mathematical correctness mandatory |
| Business logic | **≥80%** | High confidence, practical |
| Utility/helpers | **≥60%** | Lower risk, still valuable |

## Test Patterns for Manufacturing

### Formula Verification Tests
```typescript
test('Kienzle cutting force matches textbook', () => {
  // Known values from Altintas (2012), Table 3.2
  const result = kienzleCuttingForce({ kc1_1: 1500, mc: 0.25, b: 3, h: 0.1 });
  expect(result.Fc).toBeCloseTo(798.6, 0); // ±1N tolerance
});
```

### Bounds Checking Tests
```typescript
test('rejects speed above physical limit', () => {
  const result = validateCuttingSpeed(99999); // m/min
  expect(result.success).toBe(false);
  expect(result.error).toContain('exceeds maximum');
});
```

### Cross-Check Consistency Tests
```typescript
test('power equals force × speed / 60000', () => {
  const force = calcForce(params);
  const power = calcPower(params);
  expect(power.value).toBeCloseTo(force.Fc * params.Vc / 60000, 1); // ±15%
});
```

### Anti-Regression Tests
```typescript
test('material database count never decreases', () => {
  const count = getAllMaterials().length;
  expect(count).toBeGreaterThanOrEqual(3518); // baseline count
});
```

## When to Write Tests
| Trigger | Action |
|---------|--------|
| New function | Write test BEFORE implementation (TDD) |
| Bug found | Write reproducing test BEFORE fixing |
| Formula added | Verify against 3+ known-good values |
| Refactoring | Full test suite must pass before AND after |
| Safety change | 100% coverage mandatory, no exceptions |

## Test Infrastructure
- **Runner:** Built into `npm run build` (test:critical)
- **Location:** `src/__tests__/` or `*.test.ts` alongside source
- **Assertion:** Standard expect/assert patterns
- **CI gate:** Build fails if critical tests fail
