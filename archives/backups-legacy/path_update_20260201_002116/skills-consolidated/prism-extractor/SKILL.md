---
name: prism-extractor
description: |
  Enhanced module extraction from PRISM v8.89.002 monolith (986,621 lines) with 
  automatic dependency detection, code quality scoring, and pattern recognition.
  Use when extracting databases, engines, knowledge bases, or any module.
  
  MIT Foundation: 6.001 (SICP), 6.005 (Software Construction), 6.830 (Databases)
---

# PRISM Module Extractor v2.0 (Enhanced)

> ⚡ **BEFORE EXTRACTING:** Check `prism-monolith-index` for pre-indexed line numbers
> 🔍 **NEW:** Auto-generates dependency graphs and quality scores

---

## Source & Output Paths

```
SOURCE:  C:\PRISM REBUILD...\PRISM_v8_89_002_TRUE_100_PERCENT.html
OUTPUT:  C:\PRISM REBUILD...\EXTRACTED\[category]\
INDEX:   C:\PRISM REBUILD...\EXTRACTED\MODULE_INDEX.json
```

---

## 🔴 ENHANCED EXTRACTION WORKFLOW

### Phase 1: PRE-EXTRACTION ANALYSIS (NEW)

Before extracting, generate a Pre-Extraction Report:

```markdown
═══════════════════════════════════════════════════════════════════════════
PRE-EXTRACTION REPORT: [MODULE_NAME]
═══════════════════════════════════════════════════════════════════════════

LOCATION:
  Start Line: [LINE]
  Estimated Size: [X] lines (~[Y] KB)
  Category: [DATABASE | ENGINE | SYSTEM | etc.]

DIFFICULTY RATING: [EASY | MEDIUM | HARD | COMPLEX]
  - Size factor: [1-5]
  - Dependency factor: [1-5]  
  - Complexity factor: [1-5]

PREDICTED DEPENDENCIES: (from pattern analysis)
  IMPORTS:
    - PRISM_CONSTANTS (likely)
    - PRISM_VALIDATOR (detected pattern)
    - [other modules]
  
  EXTERNAL:
    - Math.js functions
    - DOM APIs
    - [libraries]

PREDICTED OUTPUTS:
  EXPORTS:
    - getMaterial() → Material object
    - calculateForce() → Force value + confidence
    - [other exports]
  
  EVENTS:
    - 'material:updated'
    - 'calculation:complete'

EXTRACTION TIME ESTIMATE: [X] minutes
RECOMMENDED CHUNK SIZE: [X] lines per read

═══════════════════════════════════════════════════════════════════════════
```

### Phase 2: EXTRACTION

```javascript
// Step 1: Read module
Desktop Commander:read_file({
  path: "C:\\...\\PRISM_v8_89_002_TRUE_100_PERCENT.html",
  offset: LINE_NUMBER,
  length: ESTIMATED_SIZE + 500  // Buffer for safety
})

// Step 2: Parse and analyze (mental model)
// - Identify module boundaries (const MODULE_NAME = {...})
// - Find all PRISM_* references (dependencies)
// - Find all exports/returns (outputs)
// - Detect patterns (factory, observer, etc.)

// Step 3: Write with enhanced header
Filesystem:write_file({
  path: "C:\\...\\EXTRACTED\\[category]\\[module].js",
  content: enhanced_output_with_analysis
})
```

### Phase 3: POST-EXTRACTION ANALYSIS (NEW)

```markdown
═══════════════════════════════════════════════════════════════════════════
POST-EXTRACTION ANALYSIS: [MODULE_NAME]
═══════════════════════════════════════════════════════════════════════════

QUALITY SCORE: [0-100]
  ├─ Documentation: [0-25] pts
  ├─ Error Handling: [0-25] pts
  ├─ Naming: [0-25] pts
  └─ Complexity: [0-25] pts

VERIFIED DEPENDENCIES:
  ✓ PRISM_CONSTANTS (line 45: constants.MACHINE_TYPES)
  ✓ PRISM_VALIDATOR (line 123: validator.checkMaterial())
  ✗ PRISM_THERMAL_ENGINE (referenced but not found)

VERIFIED OUTPUTS:
  ✓ getMaterial(id) → Material | null
  ✓ getAllMaterials() → Material[]
  ✓ updateMaterial(id, props) → boolean

PATTERNS DETECTED:
  ✓ Factory Pattern (createMaterial function)
  ✓ Observer Pattern (event emitter)
  ⚠ God Function at line 89 (calculateEverything - 150 lines)

CONSUMERS (from cross-reference):
  - PRISM_SPEED_FEED_CALCULATOR uses getMaterial()
  - PRISM_FORCE_ENGINE uses kc1_1, mc properties
  - [8 more consumers...]

REFACTORING SUGGESTIONS:
  1. Extract calculateEverything() into smaller functions
  2. Add JSDoc for getMaterial()
  3. Add try-catch around external calls

═══════════════════════════════════════════════════════════════════════════
```

---

## 📊 CODE QUALITY SCORING SYSTEM (NEW)

### Scoring Rubric (0-100)

| Category | Max Points | Criteria |
|----------|------------|----------|
| **Documentation** | 25 | JSDoc, comments, README |
| **Error Handling** | 25 | try-catch, validation, fallbacks |
| **Naming** | 25 | Clear names, consistent style |
| **Complexity** | 25 | Low cyclomatic, small functions |

### Documentation Score (0-25)
```
+5: Module header comment exists
+5: All public functions have JSDoc
+5: Parameters documented with types
+5: Return values documented
+5: Usage examples included
```

### Error Handling Score (0-25)
```
+5: Input validation on public functions
+5: Try-catch on external calls
+5: Meaningful error messages
+5: Fallback values for failures
+5: Error events/callbacks
```

### Naming Score (0-25)
```
+5: Functions describe action (verb + noun)
+5: Variables are descriptive
+5: Constants are UPPER_CASE
+5: No single-letter vars (except i, j)
+5: Consistent naming style
```

### Complexity Score (0-25)
```
+5: No function > 50 lines
+5: No cyclomatic complexity > 10
+5: Max 3 levels of nesting
+5: No more than 5 parameters
+5: Clear single responsibility
```

---

## 🔍 DEPENDENCY DETECTION PATTERNS (NEW)

### Auto-Detect Dependencies

Claude should scan for these patterns:

```javascript
// PATTERN 1: Direct references
PRISM_MATERIALS_MASTER.getMaterial()
→ Dependency: PRISM_MATERIALS_MASTER

// PATTERN 2: Gateway calls
PRISM_GATEWAY.route('getMaterial', {...})
→ Dependency: PRISM_GATEWAY + target module

// PATTERN 3: Event subscriptions
PRISM_EVENT_BUS.subscribe('material:updated')
→ Dependency: PRISM_EVENT_BUS + event source

// PATTERN 4: Import-style references
const { validator } = PRISM_VALIDATOR;
→ Dependency: PRISM_VALIDATOR

// PATTERN 5: Conditional loading
if (PRISM_AI_ENGINE) { ... }
→ Optional Dependency: PRISM_AI_ENGINE
```

### Dependency Classification

| Type | Symbol | Meaning |
|------|--------|---------|
| Required | `[REQ]` | Module fails without it |
| Optional | `[OPT]` | Enhanced if present |
| Runtime | `[RT]` | Loaded dynamically |
| Event | `[EVT]` | Event-based coupling |

---

## 🎯 PATTERN RECOGNITION (NEW)

### Design Patterns to Detect

| Pattern | Signature | Quality Impact |
|---------|-----------|----------------|
| **Factory** | `createX()` returns object | ✅ Good |
| **Singleton** | `getInstance()` | ⚠️ Check necessity |
| **Observer** | `subscribe/emit` | ✅ Good |
| **Strategy** | Function parameter for algorithm | ✅ Good |
| **Facade** | Wraps multiple modules | ✅ Good |

### Anti-Patterns to Flag

| Anti-Pattern | Signature | Action |
|--------------|-----------|--------|
| **God Object** | >500 lines, >20 methods | 🔴 Flag for refactor |
| **God Function** | >100 lines | 🔴 Flag for split |
| **Deep Nesting** | >4 levels | 🟡 Simplify |
| **Magic Numbers** | Hardcoded values | 🟡 Extract constants |
| **Callback Hell** | >3 nested callbacks | 🔴 Use async/await |

---

## 📋 OUTPUT FILE TEMPLATE (Enhanced)

```javascript
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PRISM MODULE: [NAME]
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * @extracted   [DATE]
 * @source      PRISM_v8_89_002 lines [START]-[END]
 * @category    [DATABASE | ENGINE | SYSTEM | etc.]
 * @quality     [SCORE]/100
 * 
 * DEPENDENCIES:
 *   [REQ] PRISM_CONSTANTS      - Core constants
 *   [REQ] PRISM_VALIDATOR      - Input validation
 *   [OPT] PRISM_AI_ENGINE      - AI enhancement (optional)
 * 
 * OUTPUTS:
 *   - getMaterial(id: string) → Material | null
 *   - calculateForce(params: ForceParams) → { value: number, confidence: number }
 * 
 * CONSUMERS:
 *   - PRISM_SPEED_FEED_CALCULATOR (getMaterial)
 *   - PRISM_FORCE_ENGINE (kc1_1, mc)
 *   - [+8 more]
 * 
 * PATTERNS:
 *   ✓ Factory (createMaterial)
 *   ✓ Observer (event emitter)
 * 
 * REFACTORING NOTES:
 *   - Line 89: Consider splitting calculateEverything()
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

// Original module code below (with minimal modifications)...
```

---

## Key Module Locations (Quick Reference)

| Module | Line | Size Est. | Difficulty |
|--------|------|-----------|------------|
| PRISM_GATEWAY | 11,888 | 2,000 | MEDIUM |
| PRISM_MATERIALS_MASTER | 611,225 | 8,000 | HARD |
| PRISM_TOOL_DATABASE_V7 | 467,398 | 15,000 | COMPLEX |
| PRISM_KNOWLEDGE_BASE | 101,390 | 5,000 | MEDIUM |

**Full index: See `prism-monolith-index` skill**

---

## Extraction Difficulty Ratings

| Rating | Size | Dependencies | Nesting | Time Est. |
|--------|------|--------------|---------|-----------|
| **EASY** | <500 | <3 | <2 | 5-10 min |
| **MEDIUM** | 500-2000 | 3-6 | 2-3 | 15-30 min |
| **HARD** | 2000-5000 | 6-10 | 3-4 | 30-60 min |
| **COMPLEX** | >5000 | >10 | >4 | 60+ min |

---

## Verification Checklist

### Extraction Complete
- [ ] All functions present (compare to source)
- [ ] All data/constants present
- [ ] No syntax errors (mental parse)
- [ ] Module boundaries correct

### Analysis Complete
- [ ] Dependencies documented with types
- [ ] Outputs documented with signatures
- [ ] Quality score calculated
- [ ] Patterns identified
- [ ] Anti-patterns flagged

### Integration Ready
- [ ] Added to MODULE_INDEX.json
- [ ] Consumer mapping started
- [ ] Refactoring notes for Stage 3

---

## Integration

| Skill | Role |
|-------|------|
| `prism-monolith-index` | Line number lookups |
| `prism-auditor` | Completeness verification |
| `prism-consumer-mapper` | Consumer identification |
| `prism-utilization` | 100% wiring enforcement |

---

## Version History

| Ver | Date | Changes |
|-----|------|---------|
| **2.0** | 2026-01-23 | Auto-dependency, quality scoring, patterns |
| 1.1 | 2026-01-22 | Integration with extraction-index |
| 1.0 | 2026-01-21 | Initial version |
