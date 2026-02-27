---
name: prism-extractor
description: |
  Core extraction utilities and patterns.
---

> ⚡ **BEFORE EXTRACTING:** Check `prism-monolith-index` for pre-indexed line numbers
> 🔍 **NEW:** Auto-generates dependency graphs and quality scores

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

## Extraction Difficulty Ratings

| Rating | Size | Dependencies | Nesting | Time Est. |
|--------|------|--------------|---------|-----------|
| **EASY** | <500 | <3 | <2 | 5-10 min |
| **MEDIUM** | 500-2000 | 3-6 | 2-3 | 15-30 min |
| **HARD** | 2000-5000 | 6-10 | 3-4 | 30-60 min |
| **COMPLEX** | >5000 | >10 | >4 | 60+ min |

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
