---
name: prism-coding-patterns
description: |
  MIT-based best practices for PRISM development. Covers SICP abstraction patterns,
  software construction principles, algorithm complexity, and error handling.
  Every pattern links back to MIT course material for academic foundation.

  MIT Foundation: 6.001 (SICP), 6.005 (Software Construction), 6.046J (Algorithms)
---

# PRISM Coding Patterns Skill
## MIT-Based Best Practices for PRISM Development
**MIT Foundation:** 6.001 (SICP), 6.005 (Software Construction), 6.046J (Algorithms)

---

## PURPOSE

Consistent, high-quality code across all PRISM modules using proven academic patterns. Every pattern links back to MIT course material.

---

# SECTION 1: SICP PATTERNS (6.001)

## 1.1 Abstraction Barriers

**Principle:** Create clear boundaries between interface and implementation.

```javascript
// ❌ BAD: Exposing internal structure
const material = MATERIALS_ARRAY[5];
const hardness = material.properties.mechanical.hardness.value;

// ✅ GOOD: Abstraction barrier
const material = PRISM_MATERIALS.get('P-CS-005');
const hardness = PRISM_MATERIALS.getProperty(material, 'hardness');

// The abstraction:
const PRISM_MATERIALS = {
  // INTERFACE (stable, documented)
  get: (id) => /* hidden */,
  getProperty: (material, prop) => /* hidden */,
  setProperty: (material, prop, value) => /* hidden */,
  
  // IMPLEMENTATION (can change)
  _storage: new Map(),
  _index: {},
  _validate: (m) => /* hidden */
};
```

**PRISM Application:**
- All databases expose `get()`, `set()`, `query()` methods
- Internal storage structure can change without breaking consumers
- Validation happens inside the barrier

---

## 1.2 Higher-Order Functions

**Principle:** Functions that take or return functions for flexibility.

```javascript
// ❌ BAD: Repeated validation logic
function validateMaterial(m) { /* ... */ }
function validateTool(t) { /* ... */ }
function validateMachine(m) { /* ... */ }

// ✅ GOOD: Higher-order validator factory
function createValidator(schema, rules) {
  return function(item) {
    const errors = [];
    for (const [field, rule] of Object.entries(rules)) {
      if (!rule.validate(item[field])) {
        errors.push({ field, message: rule.message });
      }
    }
    return { valid: errors.length === 0, errors };
  };
}

// Usage
const validateMaterial = createValidator(MATERIAL_SCHEMA, MATERIAL_RULES);
const validateTool = createValidator(TOOL_SCHEMA, TOOL_RULES);
```

**PRISM Application:**
- Validator factories for different entity types
- Calculator factories with configurable parameters
- Formatter factories for different output formats

---

## 1.3 Data Abstraction

**Principle:** Define data by operations, not representation.

```javascript
// A "Material" is defined by what you can DO with it, not how it's stored

// CONSTRUCTORS (create materials)
const material = Material.create(id, properties);
const material = Material.fromCSV(row);
const material = Material.fromJSON(data);

// SELECTORS (extract data)
Material.getId(material);
Material.getProperty(material, 'hardness');
Material.getCategory(material);

// OPERATIONS (compute/transform)
Material.calculateMachinability(material);
Material.compareTo(material1, material2);
Material.merge(baseMaterial, overrides);

// PREDICATES (test conditions)
Material.isHardMaterial(material);  // > 45 HRC
Material.isComplete(material);       // all 127 params
Material.isCompatibleWith(material, tool);
```

**PRISM Application:**
- Every entity type (Material, Tool, Machine) has defined operations
- Internal representation can be JSON, array, or any structure
- All access goes through defined operations

---

## 1.4 Wishful Thinking

**Principle:** Write code as if helper functions already exist, then implement them.

```javascript
// ✅ GOOD: Write the ideal code first
function calculateOptimalSpeed(material, tool, machine) {
  const baseSpeed = getRecommendedSpeed(material, tool);
  const adjustedSpeed = applyMachineConstraints(baseSpeed, machine);
  const safeSpeed = applyStabilityLimits(adjustedSpeed, getSetup());
  const finalSpeed = applyAIAdjustment(safeSpeed, getHistoricalData());
  
  return {
    value: finalSpeed,
    confidence: calculateConfidence(/* ... */),
    explanation: generateExplanation(/* ... */)
  };
}

// THEN implement the helpers:
function getRecommendedSpeed(material, tool) { /* ... */ }
function applyMachineConstraints(speed, machine) { /* ... */ }
// etc.
```

**PRISM Application:**
- Design high-level flow first
- Implement helpers as needed
- Easier to understand, test, and modify

---

# SECTION 2: SOFTWARE CONSTRUCTION (6.005)

## 2.1 Specifications

**Principle:** Every function has a contract: requires, modifies, effects.

```javascript
/**
 * Calculate Kienzle cutting force coefficient.
 * 
 * @requires material !== null
 * @requires material.kienzle.kc1_1 > 0
 * @requires chipThickness > 0 && chipThickness <= 10
 * 
 * @modifies nothing
 * 
 * @effects Returns specific cutting force in N/mm²
 *          Throws InvalidParameterError if inputs invalid
 *          
 * @example calculateKc(material, 0.1) => 2450
 */
function calculateKc(material, chipThickness) {
  // Validate @requires
  if (!material) throw new InvalidParameterError('material required');
  if (!material.kienzle?.kc1_1) throw new InvalidParameterError('kc1_1 required');
  if (chipThickness <= 0 || chipThickness > 10) {
    throw new InvalidParameterError('chipThickness must be 0-10mm');
  }
  
  // Implementation
  const { kc1_1, mc } = material.kienzle;
  return kc1_1 * Math.pow(chipThickness, -mc);
}
```

**PRISM Application:**
- ALL public functions have JSDoc with requires/modifies/effects
- Input validation enforces @requires
- Tests verify @effects

---

## 2.2 Testing Patterns

**Principle:** Test partitions and boundaries systematically.

```javascript
// PARTITION: Material hardness values
// - Soft: < 200 HB
// - Medium: 200-350 HB  
// - Hard: > 350 HB
// BOUNDARIES: 0, 200, 350, max

describe('calculateSpeedFactor', () => {
  // Partition: Soft materials
  test('soft material (150 HB)', () => {
    expect(calculateSpeedFactor(150)).toBe(1.2);
  });
  
  // Boundary: At soft/medium boundary
  test('boundary soft/medium (200 HB)', () => {
    expect(calculateSpeedFactor(200)).toBe(1.0);
  });
  
  // Partition: Medium materials
  test('medium material (275 HB)', () => {
    expect(calculateSpeedFactor(275)).toBe(0.85);
  });
  
  // Boundary: At medium/hard boundary
  test('boundary medium/hard (350 HB)', () => {
    expect(calculateSpeedFactor(350)).toBe(0.7);
  });
  
  // Partition: Hard materials
  test('hard material (500 HB)', () => {
    expect(calculateSpeedFactor(500)).toBe(0.5);
  });
  
  // Edge cases
  test('zero hardness throws', () => {
    expect(() => calculateSpeedFactor(0)).toThrow();
  });
  
  test('negative hardness throws', () => {
    expect(() => calculateSpeedFactor(-100)).toThrow();
  });
});
```

**PRISM Application:**
- Identify partitions for each input
- Test at every boundary
- Include error cases

---

## 2.3 Defensive Programming

**Principle:** Validate early, fail fast, never trust input.

```javascript
// ✅ GOOD: Defensive input handling
function processMaterial(input) {
  // 1. Validate type
  if (typeof input !== 'object' || input === null) {
    throw new TypeError('Material must be an object');
  }
  
  // 2. Validate required fields
  const required = ['id', 'name', 'category'];
  for (const field of required) {
    if (!(field in input)) {
      throw new ValidationError(`Missing required field: ${field}`);
    }
  }
  
  // 3. Validate field types
  if (typeof input.id !== 'string' || !input.id.match(/^P-[A-Z]{2}-\d{3}$/)) {
    throw new ValidationError('Invalid material ID format');
  }
  
  // 4. Sanitize strings
  const sanitized = {
    ...input,
    name: sanitizeString(input.name),
    notes: input.notes ? sanitizeString(input.notes) : ''
  };
  
  // 5. Deep copy to prevent mutation
  return JSON.parse(JSON.stringify(sanitized));
}
```

**PRISM Application:**
- Validate at every entry point
- Type check, range check, format check
- Sanitize user input
- Deep copy when storing

---

## 2.4 Immutability

**Principle:** Prefer immutable data; make mutations explicit.

```javascript
// ❌ BAD: Mutation hidden in function
function updateMaterial(material, property, value) {
  material[property] = value;  // Mutates original!
  return material;
}

// ✅ GOOD: Explicit immutability
function updateMaterial(material, property, value) {
  return {
    ...material,
    [property]: value,
    _modified: new Date().toISOString()
  };
}

// ✅ GOOD: Deep immutable update
function updateNestedProperty(material, path, value) {
  const result = JSON.parse(JSON.stringify(material));  // Deep copy
  let current = result;
  const parts = path.split('.');
  
  for (let i = 0; i < parts.length - 1; i++) {
    current = current[parts[i]];
  }
  current[parts[parts.length - 1]] = value;
  
  return result;
}
```

**PRISM Application:**
- Database operations return new objects
- Original data never mutated
- History tracking enabled

---

# SECTION 3: PRISM-SPECIFIC PATTERNS

## 3.1 Material Creation Pattern

```
FLOW: template → customize → validate → write → verify

STEPS:
1. Load template from prism-material-templates
2. Set identification fields (ID, name, aliases)
3. Set composition (elements, percentages)
4. Set physical properties (density, melting, conductivity)
5. Set mechanical properties (hardness, strength, elongation)
6. Calculate derived values (Kc, Taylor, J-C)
7. Validate with prism-validator
8. Write with appropriate method (small: single, large: chunked)
9. Verify file saved correctly
```

---

## 3.2 Module Extraction Pattern

```
FLOW: locate → read → parse → document → write → audit

STEPS:
1. Find line number in prism-monolith-index
2. Read section with Desktop Commander (offset + length)
3. Parse to identify:
   - Function boundaries
   - Data structures
   - Dependencies (imports, calls)
   - Outputs (exports, events)
4. Add documentation header
5. Write to EXTRACTED/[category]/
6. Audit with prism-auditor
7. Update extraction index
```

---

## 3.3 Calculation Pattern (6+ Sources)

```
FLOW: gather → physics → ai → confidence → explain

STEPS:
1. GATHER (6+ sources):
   - Material database
   - Tool database
   - Machine database
   - Physics engine
   - Historical data
   - AI recommendation

2. PHYSICS CALCULATION:
   - Apply Kienzle, Taylor, or appropriate model
   - Include uncertainty from parameter ranges

3. AI ADJUSTMENT:
   - Bayesian update with historical data
   - Apply learned corrections

4. CONFIDENCE INTERVAL:
   - Combine uncertainties
   - Generate min/typical/max

5. EXPLANATION:
   - Which sources contributed
   - Key assumptions
   - Limiting factors
```

---

## 3.4 Gateway Route Pattern

```javascript
// Every gateway route follows this pattern:

PRISM_GATEWAY.registerRoute({
  path: '/materials/get/:id',
  method: 'GET',
  
  // Input validation
  validate: (params) => {
    return isValidMaterialId(params.id);
  },
  
  // Main handler
  handler: async (params, context) => {
    const material = await PRISM_MATERIALS.get(params.id);
    return {
      success: true,
      data: material,
      meta: { cached: false, source: 'database' }
    };
  },
  
  // Error handling
  onError: (error, params) => {
    logError('materials/get', error, params);
    return {
      success: false,
      error: error.message,
      code: error.code || 'UNKNOWN'
    };
  },
  
  // Metadata
  meta: {
    description: 'Get material by ID',
    consumers: ['PRISM_SPEED_FEED', 'PRISM_FORCE_CALC', '...'],
    rateLimit: 100
  }
});
```

---

# SECTION 4: ERROR HANDLING PATTERNS

## 4.1 Error Hierarchy

```javascript
// Base error class
class PRISMError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'PRISMError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

// Specific error types
class ValidationError extends PRISMError {
  constructor(message, field, value) {
    super(message, 'VALIDATION_ERROR', { field, value });
    this.name = 'ValidationError';
  }
}

class NotFoundError extends PRISMError {
  constructor(entityType, id) {
    super(`${entityType} not found: ${id}`, 'NOT_FOUND', { entityType, id });
    this.name = 'NotFoundError';
  }
}

class CalculationError extends PRISMError {
  constructor(message, inputs, partialResult) {
    super(message, 'CALCULATION_ERROR', { inputs, partialResult });
    this.name = 'CalculationError';
  }
}
```

## 4.2 Graceful Degradation

```javascript
function calculateWithFallback(material, tool, machine) {
  try {
    // Primary: Full calculation with AI
    return fullAICalculation(material, tool, machine);
  } catch (aiError) {
    logWarning('AI calculation failed, using physics-only', aiError);
    
    try {
      // Fallback 1: Physics only
      return physicsOnlyCalculation(material, tool, machine);
    } catch (physicsError) {
      logWarning('Physics calculation failed, using handbook', physicsError);
      
      try {
        // Fallback 2: Handbook lookup
        return handbookLookup(material, tool);
      } catch (handbookError) {
        logError('All calculations failed', handbookError);
        
        // Fallback 3: Conservative defaults
        return {
          value: getConservativeDefault(material),
          confidence: 0.3,
          warning: 'Using conservative defaults - verify before use',
          failedMethods: ['ai', 'physics', 'handbook']
        };
      }
    }
  }
}
```

---

# SECTION 5: QUICK REFERENCE

## Code Quality Checklist

```
☐ Has JSDoc with @requires, @modifies, @effects
☐ Validates all inputs (type, range, format)
☐ Uses immutable patterns (no hidden mutation)
☐ Has clear abstraction barriers
☐ Includes error handling with graceful degradation
☐ Has tests for partitions and boundaries
☐ Follows PRISM naming conventions
☐ Documented dependencies and consumers
```

## Naming Conventions

```
MODULES:     PRISM_[CATEGORY]_[NAME]        → PRISM_MATERIALS_MASTER
FUNCTIONS:   verbNoun()                     → getMaterial(), calculateForce()
CONSTANTS:   UPPER_SNAKE_CASE               → MAX_RPM, DEFAULT_CONFIDENCE
VARIABLES:   camelCase                      → materialId, toolDiameter
PRIVATE:     _prefixedCamelCase             → _internalCache, _validate()
EVENTS:      entity:action                  → material:created, tool:updated
ROUTES:      /entity/action/:param          → /materials/get/:id
```

## MIT Course Quick Links

| Pattern | Course | Topic |
|---------|--------|-------|
| Abstraction | 6.001 | Lecture 2-3 |
| Higher-order | 6.001 | Lecture 4-5 |
| Specifications | 6.005 | Lecture 3 |
| Testing | 6.005 | Lecture 5 |
| Defensive | 6.005 | Lecture 9 |
| Algorithms | 6.046J | Full course |

---

## END OF SKILL

**Impact:** Consistent, maintainable, MIT-quality code
**MIT Foundation:** 6.001 SICP, 6.005 Software Construction, 6.046J Algorithms
