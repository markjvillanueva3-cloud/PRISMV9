---
name: prism-tdd
description: |
  Enhanced Test-Driven Development with RED-GREEN-REFACTOR cycle for manufacturing.
---

```javascript
// Define what we expect BEFORE extracting
const EXTRACTION_TESTS = {
  moduleName: 'PRISM_MATERIALS_MASTER',
  tests: [
    { test: 'Module exists', expected: true },
    { test: 'Line count', expected: { min: 500 } },
    { test: 'Has getMaterial()', expected: true },
    { test: 'Has getAllMaterials()', expected: true },
    { test: 'Has searchMaterials()', expected: true },
    { test: 'Material count', expected: { min: 618 } },
    { test: 'Has all required fields', expected: REQUIRED_FIELDS },
    { test: 'No syntax errors', expected: true },
    { test: 'Dependencies documented', expected: true },
    { test: 'Consumers identified', expected: { min: 15 } }
  ]
};
```

### For Material Entries
```javascript
// Define validation BEFORE creating material
const MATERIAL_TESTS = {
  materialId: 'P-CS-031',
  tests: [
    { test: 'Has all 127 parameters', expected: true },
    { test: 'composition sums to 100%', expected: true },
    { test: 'kc1_1 in valid range', expected: { min: 500, max: 5000 } },
    { test: 'taylor_n in valid range', expected: { min: 0.1, max: 0.5 } },
    { test: 'physical.density > 0', expected: true },
    { test: 'thermal properties consistent', expected: true },
    { test: 'Has cutting recommendations', expected: true },
    { test: 'Has statistical metadata', expected: true }
  ]
};
```

### For Database Wiring
```javascript
// Define consumer requirements BEFORE wiring
const WIRING_TESTS = {
  database: 'PRISM_MATERIALS_MASTER',
  tests: [
    { test: 'Consumer count', expected: { min: 15 } },
    { test: 'PRISM_SPEED_FEED_CALCULATOR connected', expected: true },
    { test: 'PRISM_FORCE_CALCULATOR connected', expected: true },
    { test: 'PRISM_THERMAL_ENGINE connected', expected: true },
    { test: 'PRISM_TOOL_LIFE_ENGINE connected', expected: true },
    { test: 'PRISM_AI_LEARNING_PIPELINE connected', expected: true },
    { test: 'Gateway routes registered', expected: { min: 5 } },
    { test: 'All consumers receive data', expected: true }
  ]
};
```

## 🔵 REFACTOR: OPTIMIZE WITHOUT BREAKING

### When All Tests Pass

```
1. Look for code duplication → Extract common patterns
2. Look for complexity → Simplify logic
3. Look for performance issues → Optimize hot paths
4. Look for clarity issues → Improve naming/structure

CRITICAL: Re-run ALL tests after each refactor
```

### Refactor Checklist

```
☐ All tests still pass?
☐ No new warnings/errors?
☐ Performance maintained or improved?
☐ Code more readable?
☐ Documentation updated?
```

## TDD WORKFLOW FOR PRISM SESSIONS

### Before Starting Work

```markdown
## TDD PREPARATION
1. List what needs to be created/modified
2. Write validation criteria for EACH item
3. Create test functions or checklists
4. Verify tests would FAIL with current state
```

### During Work

```markdown
## TDD EXECUTION
FOR EACH item:
  1. Confirm test fails (RED)
  2. Implement minimum to pass (GREEN)
  3. Verify test passes
  4. Optimize if needed (REFACTOR)
  5. Move to next item
```

### After Work

```markdown
## TDD VERIFICATION
1. Run ALL tests again
2. Document any failures
3. Fix any regressions
4. Update test suite if needed
```

## ANTI-PATTERNS (DON'T DO THIS)

❌ Writing code before defining success criteria
❌ Adding features without tests
❌ Skipping the RED phase
❌ Not re-running tests after changes
❌ Marking tests as "pass" without verification
❌ Implementing beyond what tests require
❌ Refactoring without test coverage

## INTEGRATION WITH PRISM SKILLS

- **prism-planning**: Define tests during planning phase
- **prism-debugging**: Use tests to isolate issues
- **prism-verification**: Tests are the verification criteria
- **prism-auditor**: Audit uses TDD test results

---

**END OF PRISM TDD SKILL**
