---
name: prism-tdd-enhanced
description: Enhanced Test-Driven Development for PRISM with RED-GREEN-REFACTOR cycle, manufacturing-specific test patterns, testing anti-patterns to avoid, and integration with PRISM quality gates. Use when implementing features, fixing bugs, writing tests, or refactoring code.
---

# PRISM Enhanced TDD Skill
## Test-Driven Development for Manufacturing Intelligence

### Overview

This skill enforces rigorous TDD practices adapted for manufacturing software where **incorrect calculations can cause machine crashes, tool breakage, or operator injury**. Standard TDD saves debugging time; PRISM TDD saves lives.

**Core Principle:** Never write implementation code without a failing test first. If you didn't watch the test fail, you don't know if it actually tests anything.

---

## The RED-GREEN-REFACTOR Cycle

```
┌─────────────────────────────────────────────────────────────────────┐
│                     PRISM TDD CYCLE                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌─────────┐     ┌─────────┐     ┌───────────┐     ┌─────────┐   │
│   │   RED   │────▶│ VERIFY  │────▶│   GREEN   │────▶│ VERIFY  │   │
│   │ Write   │     │ Fails   │     │ Minimal   │     │ Passes  │   │
│   │ Test    │     │ Right?  │     │ Code      │     │ All?    │   │
│   └─────────┘     └────┬────┘     └───────────┘     └────┬────┘   │
│        ▲               │                                  │        │
│        │          wrong│failure                           │        │
│        │               ▼                                  ▼        │
│        │         ┌─────────┐                        ┌──────────┐  │
│        │         │ Fix the │                        │ REFACTOR │  │
│        │         │  TEST   │                        │ Clean Up │  │
│        │         └─────────┘                        └────┬─────┘  │
│        │                                                 │        │
│        └─────────────────────────────────────────────────┘        │
│                         NEXT FEATURE                               │
└─────────────────────────────────────────────────────────────────────┘
```

### Phase 1: RED - Write Failing Test

Write ONE minimal test showing what should happen:

```typescript
// PRISM Example: Cutting force calculation
test('calculates Kienzle cutting force with valid parameters', async () => {
  const material = {
    kienzleK11: 1800,  // N/mm² - 4140 Steel
    kienzleMc: 0.25,   // dimensionless
  };
  
  const params = {
    chipThickness: 0.15,  // mm
    chipWidth: 2.0,       // mm
  };
  
  const result = calculateKienzleCuttingForce(material, params);
  
  // Kienzle formula: Fc = K11 * h^(1-mc) * b
  // Expected: 1800 * 0.15^(1-0.25) * 2.0 = 1800 * 0.244 * 2.0 = 878.4 N
  expect(result.force).toBeCloseTo(878.4, 1);
  expect(result.confidence).toBeGreaterThan(0.8);
  expect(result.unit).toBe('N');
});
```

**RED Phase Checklist:**
- [ ] Test name describes expected behavior
- [ ] Test is minimal (tests ONE thing)
- [ ] Assertion is specific and measurable
- [ ] For PRISM: includes physics units validation
- [ ] For PRISM: includes confidence interval check

### Phase 2: VERIFY RED - Confirm Correct Failure

**CRITICAL:** Run the test and verify it fails FOR THE RIGHT REASON.

```bash
# Run single test
npm test -- --grep "calculates Kienzle"

# Expected output:
# ✗ calculates Kienzle cutting force with valid parameters
#   ReferenceError: calculateKienzleCuttingForce is not defined
```

**Wrong Failure Examples (Go back to RED):**
- Syntax error in test file
- Import path wrong
- Test setup incomplete
- Wrong assertion (testing something else)

**Right Failure Examples (Proceed to GREEN):**
- Function not defined
- Function returns undefined/null
- Function returns wrong value
- Function throws expected error

### Phase 3: GREEN - Minimal Implementation

Write the **smallest amount of code** to make the test pass:

```typescript
// MINIMAL - just enough to pass
function calculateKienzleCuttingForce(
  material: KienzleMaterial,
  params: CuttingParams
): CuttingForceResult {
  const force = material.kienzleK11 
    * Math.pow(params.chipThickness, 1 - material.kienzleMc) 
    * params.chipWidth;
    
  return {
    force,
    confidence: 0.85,  // Hardcoded for now - will add calculation later
    unit: 'N'
  };
}
```

**GREEN Phase Rules:**
- [ ] Don't add features beyond what test requires
- [ ] Don't refactor yet
- [ ] Don't "improve" untested code
- [ ] If test fails, fix code NOT test
- [ ] If OTHER tests fail, fix NOW before continuing

### Phase 4: VERIFY GREEN - All Tests Pass

```bash
# Run full test suite
npm test

# Expected: ALL GREEN
# ✓ calculates Kienzle cutting force with valid parameters
# ✓ [all previous tests still pass]
```

### Phase 5: REFACTOR - Clean Up (Stay Green)

Now improve code quality while keeping tests green:

```typescript
// REFACTORED with validation and better structure
function calculateKienzleCuttingForce(
  material: KienzleMaterial,
  params: CuttingParams
): CuttingForceResult {
  // Validate inputs
  validateKienzleParameters(material);
  validateCuttingParams(params);
  
  // Kienzle formula: Fc = K11 * h^(1-mc) * b
  const exponent = 1 - material.kienzleMc;
  const thicknessFactor = Math.pow(params.chipThickness, exponent);
  const force = material.kienzleK11 * thicknessFactor * params.chipWidth;
  
  // Calculate confidence based on parameter quality
  const confidence = calculateConfidence(material, params);
  
  return { force, confidence, unit: 'N' };
}
```

**REFACTOR Rules:**
- [ ] Run tests after EVERY change
- [ ] If tests fail, undo last change
- [ ] Don't add new features (needs new failing test first)
- [ ] Extract helpers if repeated
- [ ] Improve names if unclear

---

## PRISM-Specific Test Categories

### 1. Physics Validation Tests

Every calculation must verify physical plausibility:

```typescript
describe('Physics Validation', () => {
  test('cutting force within physical limits', () => {
    const result = calculateCuttingForce(params);
    
    // Force must be positive
    expect(result.force).toBeGreaterThan(0);
    
    // Force must be below machine capacity
    expect(result.force).toBeLessThan(machine.maxSpindleForce);
    
    // Specific cutting force should match material class
    const kc = result.force / (params.chipThickness * params.chipWidth);
    expect(kc).toBeGreaterThan(material.kcMin);
    expect(kc).toBeLessThan(material.kcMax);
  });
  
  test('rejects physically impossible parameters', () => {
    const impossibleParams = {
      chipThickness: -0.1,  // Negative impossible
      chipWidth: 0,         // Zero impossible
    };
    
    expect(() => calculateCuttingForce(impossibleParams))
      .toThrow(PhysicsViolationError);
  });
});
```

### 2. Safety Boundary Tests

PRISM code must validate safety limits:

```typescript
describe('Safety Boundaries', () => {
  test('applies safety factor to recommended parameters', () => {
    const result = recommendCuttingParams(material, tool, machine);
    
    // Must include safety margin
    expect(result.maxSpindleSpeed).toBeLessThanOrEqual(
      tool.maxRpm * PRISM_SAFETY_FACTOR  // 0.85
    );
    
    // Must not exceed machine limits
    expect(result.maxFeedRate).toBeLessThanOrEqual(machine.maxFeedRate);
    
    // Must have confidence interval
    expect(result.confidenceInterval).toBeDefined();
    expect(result.confidenceInterval.lower).toBeLessThan(result.value);
    expect(result.confidenceInterval.upper).toBeGreaterThan(result.value);
  });
  
  test('warns on parameters near safety limits', () => {
    const nearLimit = {
      spindleSpeed: machine.maxSpindleSpeed * 0.95,
    };
    
    const result = validateParameters(nearLimit);
    
    expect(result.warnings).toContain('APPROACHING_SPINDLE_LIMIT');
    expect(result.safetyScore).toBeLessThan(0.9);
  });
});
```

### 3. Database Utilization Tests

Verify complete database usage per 10 Commandments:

```typescript
describe('Database Utilization', () => {
  test('uses all relevant material parameters', () => {
    const material = getMaterial('AISI_4140');
    const usedParams = trackParameterUsage(() => {
      calculateOptimalParams(material, tool, machine);
    });
    
    // Must use Kienzle coefficients
    expect(usedParams).toContain('kienzleK11');
    expect(usedParams).toContain('kienzleMc');
    
    // Must use thermal properties for speed calc
    expect(usedParams).toContain('thermalConductivity');
    expect(usedParams).toContain('specificHeat');
    
    // Must consider machinability
    expect(usedParams).toContain('machinabilityRating');
  });
  
  test('warns on missing material parameters', () => {
    const incompleteMaterial = {
      name: 'Unknown Steel',
      yieldStrength: 275,
      // Missing: kienzleK11, kienzleMc, etc.
    };
    
    const result = calculateOptimalParams(incompleteMaterial, tool, machine);
    
    expect(result.warnings).toContain('INCOMPLETE_MATERIAL_DATA');
    expect(result.confidence).toBeLessThan(0.6);
    expect(result.estimatedParams).toHaveLength(greaterThan(0));
  });
});
```

### 4. Confidence Interval Tests

All calculations must include uncertainty:

```typescript
describe('Confidence Intervals', () => {
  test('provides confidence bounds for all outputs', () => {
    const result = calculateCuttingParams(material, tool, machine);
    
    // Every numeric output needs confidence
    expect(result.spindleSpeed.confidence).toBeDefined();
    expect(result.feedRate.confidence).toBeDefined();
    expect(result.depthOfCut.confidence).toBeDefined();
    
    // Confidence must be 0-1
    expect(result.spindleSpeed.confidence).toBeGreaterThanOrEqual(0);
    expect(result.spindleSpeed.confidence).toBeLessThanOrEqual(1);
  });
  
  test('widens confidence with estimated parameters', () => {
    const fullData = calculateCuttingParams(completeMaterial, tool, machine);
    const partialData = calculateCuttingParams(incompleteMaterial, tool, machine);
    
    // Less data = wider confidence interval
    expect(partialData.spindleSpeed.confidence)
      .toBeLessThan(fullData.spindleSpeed.confidence);
  });
});
```

---

## Testing Anti-Patterns to AVOID

### ❌ Anti-Pattern 1: Tests Written After Code

```typescript
// BAD: Wrote implementation first, then "verified" with test
function add(a, b) { return a + b; }  // Written first

test('add works', () => {
  expect(add(1, 2)).toBe(3);  // Written to match existing code
});
// Problem: Test passes immediately - never saw it fail
```

**Why It's Wrong:** Tests written after code are biased to match the implementation, not the requirements. They pass immediately, proving nothing.

### ❌ Anti-Pattern 2: Testing Implementation Details

```typescript
// BAD: Testing HOW, not WHAT
test('uses forEach to iterate materials', () => {
  const spy = jest.spyOn(Array.prototype, 'forEach');
  processMaterials(materials);
  expect(spy).toHaveBeenCalled();
});
// Problem: Breaks when implementation changes, even if behavior correct
```

**Better:**
```typescript
// GOOD: Testing behavior/output
test('processes all materials in list', () => {
  const materials = [material1, material2, material3];
  const results = processMaterials(materials);
  expect(results).toHaveLength(3);
  expect(results.every(r => r.processed)).toBe(true);
});
```

### ❌ Anti-Pattern 3: Mocking Everything

```typescript
// BAD: So many mocks, not testing real behavior
test('calculates cutting force', () => {
  const mockMaterial = { kienzleK11: 1800 };  // Fake
  const mockParams = { chipThickness: 0.1 };  // Fake
  const mockCalculator = jest.fn(() => 500);  // Fake calculation!
  
  const result = calculateForce(mockMaterial, mockParams, mockCalculator);
  
  expect(mockCalculator).toHaveBeenCalled();
  // Problem: Never tested actual Kienzle formula!
});
```

**Better:**
```typescript
// GOOD: Use real objects, mock only external dependencies
test('calculates cutting force using Kienzle formula', () => {
  const material = createTestMaterial({  // Real structure
    kienzleK11: 1800,
    kienzleMc: 0.25,
  });
  const params = { chipThickness: 0.15, chipWidth: 2.0 };
  
  const result = calculateKienzleCuttingForce(material, params);
  
  // Verify actual physics calculation
  expect(result.force).toBeCloseTo(878.4, 1);
});
```

### ❌ Anti-Pattern 4: Overly Specific Assertions

```typescript
// BAD: Fragile test
test('returns formatted result', () => {
  const result = formatCuttingParams(params);
  expect(result).toBe('Speed: 1500 RPM, Feed: 0.15 mm/rev, DOC: 2.0 mm');
  // Problem: Breaks if formatting changes even slightly
});
```

**Better:**
```typescript
// GOOD: Test structure, not exact format
test('result contains all cutting parameters', () => {
  const result = formatCuttingParams(params);
  expect(result).toContain('1500');
  expect(result).toContain('RPM');
  expect(result).toContain('0.15');
  expect(result).toContain('2.0');
});
```

### ❌ Anti-Pattern 5: Async Tests Without Proper Waiting

```typescript
// BAD: Race condition
test('loads material database', () => {
  loadMaterialDatabase();
  expect(getMaterial('4140')).toBeDefined();
  // Problem: Test might check before load completes
});
```

**Better:**
```typescript
// GOOD: Proper async handling
test('loads material database', async () => {
  await loadMaterialDatabase();
  const material = await getMaterial('4140');
  expect(material).toBeDefined();
  expect(material.name).toBe('AISI 4140');
});
```

### ❌ Anti-Pattern 6: Test Pollution

```typescript
// BAD: Tests affect each other
let globalCalculator;

beforeAll(() => {
  globalCalculator = new CuttingCalculator();
});

test('first calculation', () => {
  globalCalculator.setState({ material: '4140' });
  // ...
});

test('second calculation', () => {
  // Problem: Still has state from first test!
  const result = globalCalculator.calculate();
});
```

**Better:**
```typescript
// GOOD: Fresh instance per test
describe('CuttingCalculator', () => {
  let calculator;
  
  beforeEach(() => {
    calculator = new CuttingCalculator();  // Fresh each test
  });
  
  afterEach(() => {
    calculator.dispose();  // Clean up
  });
  
  test('first calculation', () => { /* ... */ });
  test('second calculation', () => { /* ... */ });
});
```

---

## Common Rationalizations (And Why They're Wrong)

| Rationalization | Why It's Wrong |
|-----------------|----------------|
| "I'll write tests after" | Tests written after code pass immediately, proving nothing. You won't catch the bugs TDD would have. |
| "This is too simple to test" | Simple code becomes complex code. Untested simple code becomes untested complex code. |
| "I already tested manually" | Manual testing is ad-hoc and unrepeatable. You'll forget cases. Automated tests catch regression. |
| "Deleting code I wrote is wasteful" | Sunk cost fallacy. The time is gone. Keep untested code = technical debt. |
| "TDD is too slow" | TDD is slower initially, but debugging time saved is 10x the test writing time. |
| "I'm confident the code works" | Overconfidence causes bugs. Your confidence != proof. |
| "It's just a prototype" | Prototypes become production code. Untested prototypes become production bugs. |

---

## TDD Completion Checklist

Before claiming any feature is done:

```
□ Every public function has at least one test
□ Every test was seen to fail before implementation
□ All edge cases covered:
  □ Empty/null inputs
  □ Boundary values (min, max, zero)
  □ Invalid inputs (wrong type, out of range)
  □ Error conditions
□ PRISM-specific:
  □ Physics validation tests exist
  □ Safety boundary tests exist
  □ Confidence intervals tested
  □ Database utilization verified
□ All tests pass
□ No skipped/commented tests
□ Test coverage > 80% for new code
```

---

## Integration with PRISM Workflow

```
SESSION START
     │
     ▼
┌──────────────────┐
│ prism-sp-plan    │ ◄── Task includes: "Write failing test for X"
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ prism-tdd-       │ ◄── THIS SKILL
│ enhanced         │     RED → VERIFY → GREEN → VERIFY → REFACTOR
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ prism-sp-review  │ ◄── Verify test coverage, anti-patterns avoided
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ prism-sp-verify  │ ◄── Level 5 evidence: Tests prove functionality
└──────────────────┘
```

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────┐
│                    TDD QUICK REFERENCE                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. RED    - Write ONE failing test                        │
│  2. VERIFY - Run it, confirm RIGHT failure                 │
│  3. GREEN  - Write MINIMAL code to pass                    │
│  4. VERIFY - Run ALL tests, confirm ALL green              │
│  5. REFACTOR - Clean up, RUN TESTS after each change       │
│  6. REPEAT                                                  │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  PRISM ADDITIONS:                                          │
│  • Physics validation in every calculation test            │
│  • Safety boundary verification                            │
│  • Confidence interval requirements                        │
│  • Database utilization tracking                           │
│  • Anti-pattern avoidance                                  │
├─────────────────────────────────────────────────────────────┤
│  IRON LAW: If you didn't watch it fail, you didn't test it │
└─────────────────────────────────────────────────────────────┘
```

---

## References

- obra/superpowers test-driven-development skill
- Steve McConnell, Code Complete 2nd Edition, Chapter 22
- Kent Beck, Test-Driven Development: By Example
- PRISM Life Safety Mindset (prism-life-safety-mindset)
- PRISM Quality Master (prism-quality-master)
