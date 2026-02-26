---
name: prism-tdd
description: |
  Test-Driven Development skill adapted from obra/superpowers for PRISM module
  validation. Enforces RED-GREEN-REFACTOR cycle for all module development.
  Use when: creating new modules, modifying existing modules, validating database
  entries, or ensuring extraction completeness. Triggers: creating modules,
  modifying code, validating databases, extraction verification, quality assurance.
---

# PRISM TDD SKILL v1.0
## Test-Driven Development for Manufacturing Intelligence
### Adapted from obra/superpowers for PRISM validation

---

## CORE PRINCIPLE

**RED → GREEN → REFACTOR**

Never write production code without first writing a test that fails.

For PRISM, this means:
1. **RED**: Define what success looks like (validation criteria)
2. **GREEN**: Implement just enough to pass validation
3. **REFACTOR**: Optimize without breaking validation

---

## 🔴 RED: WRITE FAILING TESTS FIRST

### For Module Extraction
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

---

## 🟢 GREEN: IMPLEMENT TO PASS

### Only Implement What's Needed

```
✓ If test requires 127 parameters, add exactly 127
✓ If test requires getMaterial(), add that function
✓ If test requires 15 consumers, wire exactly 15

✗ Don't add "nice to have" features
✗ Don't optimize before tests pass
✗ Don't add untested functionality
```

### Implementation Order

1. Make the simplest test pass first
2. Then the next simplest
3. Build up complexity gradually
4. Commit/save after each test passes

---

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

---

## PRISM-SPECIFIC TDD PATTERNS

### Material Validation Pattern

```javascript
// 1. RED: Define what valid material looks like
function validateMaterial(material) {
  const errors = [];
  
  // Required fields
  if (!material.id) errors.push('Missing id');
  if (!material.name) errors.push('Missing name');
  if (!material.category) errors.push('Missing category');
  
  // Parameter count
  const paramCount = countParameters(material);
  if (paramCount < 127) {
    errors.push(`Only ${paramCount}/127 parameters`);
  }
  
  // Composition check
  if (material.composition) {
    const sum = Object.values(material.composition)
      .reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 100) > 0.1) {
      errors.push(`Composition sums to ${sum}%, not 100%`);
    }
  }
  
  // Range checks
  if (material.kc1_1 < 500 || material.kc1_1 > 5000) {
    errors.push(`kc1_1 ${material.kc1_1} outside valid range`);
  }
  
  return { valid: errors.length === 0, errors };
}

// 2. GREEN: Create material that passes
const material = {
  id: 'P-CS-031',
  name: 'AISI 1055 Carbon Steel',
  // ... all 127 parameters
};

// 3. Verify
const result = validateMaterial(material);
console.assert(result.valid, result.errors);
```

### Module Extraction Pattern

```javascript
// 1. RED: Define extraction test
function testModuleExtraction(module) {
  const tests = [];
  
  // Existence
  tests.push({
    name: 'Module exists',
    pass: module !== null && module !== undefined
  });
  
  // Required functions
  const requiredFunctions = ['init', 'get', 'set', 'query'];
  for (const fn of requiredFunctions) {
    tests.push({
      name: `Has ${fn}()`,
      pass: typeof module[fn] === 'function'
    });
  }
  
  // Dependencies documented
  tests.push({
    name: 'Dependencies documented',
    pass: module._dependencies && module._dependencies.length > 0
  });
  
  // Consumers identified
  tests.push({
    name: 'Consumers identified',
    pass: module._consumers && module._consumers.length >= 6
  });
  
  return tests;
}

// 2. GREEN: Extract module that passes all tests
// 3. REFACTOR: Clean up extraction, improve structure
```

---

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

---

## TEST CATEGORIES

### Unit Tests (Individual Items)
- Single material validation
- Single function correctness
- Single parameter range check

### Integration Tests (Connections)
- Database → Consumer wiring
- Module → Module communication
- Gateway route resolution

### System Tests (End-to-End)
- Full calculation chain
- Complete user workflow
- Performance under load

---

## ANTI-PATTERNS (DON'T DO THIS)

❌ Writing code before defining success criteria
❌ Adding features without tests
❌ Skipping the RED phase
❌ Not re-running tests after changes
❌ Marking tests as "pass" without verification
❌ Implementing beyond what tests require
❌ Refactoring without test coverage

---

## QUICK VALIDATION COMMANDS

```javascript
// Validate material structure
validateMaterial(material);

// Validate module completeness
testModuleExtraction(module);

// Validate wiring
verifyConsumerWiring(database);

// Validate 127-parameter compliance
countParameters(material) >= 127;

// Validate composition
validateComposition(material.composition);
```

---

## INTEGRATION WITH PRISM SKILLS

- **prism-planning**: Define tests during planning phase
- **prism-debugging**: Use tests to isolate issues
- **prism-verification**: Tests are the verification criteria
- **prism-auditor**: Audit uses TDD test results

---

**END OF PRISM TDD SKILL**
