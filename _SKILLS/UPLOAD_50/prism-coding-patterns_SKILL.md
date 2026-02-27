---
name: prism-coding-patterns
description: |
  MIT-based coding patterns. SOLID, DRY, design patterns for PRISM.
---

**MIT Foundation:** 6.001 (SICP), 6.005 (Software Construction), 6.046J (Algorithms)

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

## END OF SKILL

**Impact:** Consistent, maintainable, MIT-quality code
**MIT Foundation:** 6.001 SICP, 6.005 Software Construction, 6.046J Algorithms
