---
name: prism-code-complete-integration
description: |
  Integration of Steve McConnell's Code Complete 2nd Edition principles with PRISM.
  13 sub-skills: prerequisites checklist, pseudocode programming, routine/class design,
  control flow, data organization, defensive programming, code layout, quality practices,
  refactoring, integration, performance tuning. Use when writing code, designing routines,
  code review, refactoring, or performance optimization.
---

# PRISM Code Complete Integration
## Steve McConnell's Code Complete 2nd Ed + PRISM Manufacturing Intelligence

---

## QUICK REFERENCE: 13 Sub-Skills

| Sub-Skill | Purpose | PRISM Integration |
|-----------|---------|-------------------|
| CC-01 | Developer Character | Reinforces Life Safety Mindset |
| CC-02 | **192-Line Prerequisites Checklist** | Gates prism-sp-brainstorm |
| CC-03 | Pseudocode Programming Process | 7-step PPP for prism-sp-planning |
| CC-04 | Routine & Class Design | Manufacturing patterns |
| CC-05 | Control Flow Quality | Clean CNC logic |
| CC-06 | Data Organization | 127-param naming |
| CC-07 | Defensive Programming | Safety-critical errors |
| CC-08 | Code Layout & Style | PRISM style guide |
| CC-09 | Quality Practices | Code review checklist |
| CC-10 | Refactoring Guidance | Anti-regression protocol |
| CC-11 | Integration Practices | PRISM v9.0 sequence |
| CC-12 | Performance Tuning | Measure-first approach |
| CC-13 | Master Dispatcher | Routes to sub-skill |

---

## CC-01: Developer Character

```
THE SOFTWARE CRAFTSMAN'S MINDSET
================================
1. INTELLECTUAL HONESTY - Admit what you don't know
2. COMMUNICATION - Code for humans first, computers second
3. CREATIVITY + DISCIPLINE - Creative design, disciplined construction
4. LAZINESS (Good Kind) - Automate, generate, abstract
5. HUMILITY - Assume maintainer knows your address
```

**PRISM Integration:** Reinforces Life-Safety Mindset - manufacturing code controls machines that can injure or kill.

---

## CC-02: Construction Prerequisites Checklist (192 Items)

**Score ≥60 to proceed. Score <40 = STOP.**

### CATEGORY A: Requirements (___/20)

```
□ A1.  All inputs specified?
□ A2.  All outputs specified?
□ A3.  Output formats specified?
□ A4.  External interfaces specified?
□ A5.  Error handling requirements specified?
□ A6.  Response time specified?
□ A7.  Acceptable input values specified?
□ A8.  Unstated customer expectations identified?
□ A9.  Requirements in user language?
□ A10. No conflicting requirements?
□ A11. Requirements testable?
□ A12. Requirements traceable?
□ A13. Requirements stable?
□ A14. Change control procedure exists?
□ A15. Requirements state system behavior?
□ A16. Alternatives explored?
□ A17. Requirements complete?
□ A18. Each requirement attainable?
□ A19. Risk register exists?
□ A20. Requirements prioritized?
```

### CATEGORY B: Architecture (___/25)

```
□ B1.  Overall organization clear?
□ B2.  Major building blocks defined?
□ B3.  All functions covered by blocks?
□ B4.  Critical classes described?
□ B5.  Data design described?
□ B6.  Database organization specified?
□ B7.  Key business rules identified?
□ B8.  UI strategy described?
□ B9.  UI modularized for changes?
□ B10. I/O strategy described?
□ B11. Resource estimates provided?
□ B12. Error handling strategy described?
□ B13. Error handling consistent?
□ B14. Fault tolerance defined?
□ B15. Feasibility demonstrated?
□ B16. Overengineering addressed?
□ B17. Buy-vs-build decisions made?
□ B18. Reuse strategy defined?
□ B19. Architecture designed for change?
□ B20. Risks identified and mitigated?
□ B21. Multiple architecture views?
□ B22. Security strategy exists?
□ B23. Performance strategy exists?
□ B24. Scalability strategy exists?
□ B25. Internationalization strategy exists?
```

### CATEGORY C: Upstream Prerequisites (___/15)

```
□ C1.  Project type identified?
□ C2.  Prerequisites appropriate to type?
□ C3.  Development approach appropriate?
□ C4.  Problem definition clear?
□ C5.  Alternative solutions explored?
□ C6.  Solution approach appropriate?
□ C7.  Key assumptions identified?
□ C8.  Stakeholders identified?
□ C9.  Project plan exists?
□ C10. QA plan exists?
□ C11. Communication plan exists?
□ C12. Adequate staffing?
□ C13. Management support?
□ C14. Development tools appropriate?
□ C15. Coding standard defined?
```

### CATEGORY D: Construction Practices (___/20)

```
□ D1.  Coding conventions defined?
□ D2.  Naming conventions defined?
□ D3.  Formatting standards exist?
□ D4.  Documentation standard exists?
□ D5.  Change control procedure exists?
□ D6.  Code reviews planned?
□ D7.  Unit testing strategy exists?
□ D8.  Integration testing strategy exists?
□ D9.  Debugging strategy exists?
□ D10. Defect tracking defined?
□ D11. Source control strategy exists?
□ D12. Build automation exists?
□ D13. Integration checkpoints defined?
□ D14. Release strategy exists?
□ D15. Metrics being collected?
□ D16. Improvement goals defined?
□ D17. Pair programming considered?
□ D18. Technical reviews scheduled?
□ D19. Learning plan exists?
□ D20. Retrospectives planned?
```

### Scoring Guide

| Score | Status | Action |
|-------|--------|--------|
| 75-80 | ✅ PROCEED | Construction can begin |
| 60-74 | ⚠️ WARNING | Address gaps during construction |
| 40-59 | 🛑 HOLD | Resolve critical gaps first |
| 0-39 | ❌ STOP | Prerequisites not met |

---

## CC-03: Pseudocode Programming Process (PPP)

### The 7-Step Method

```
STEP 1: DESIGN THE ROUTINE
Write high-level description of purpose

STEP 2: CODE THE ROUTINE HEADER
Write function signature with documentation

STEP 3: WRITE PSEUDOCODE FOR BODY
Fill in logic at high level (comments only)

STEP 4: CONVERT PSEUDOCODE TO CODE
Keep pseudocode as comments, write code beneath

STEP 5: CHECK THE CODE
□ Each pseudocode line has corresponding code?
□ Code matches intent?
□ Edge cases handled?
□ Error conditions handled?

STEP 6: CLEAN UP LEFTOVERS
□ Remove obvious comments
□ Keep non-obvious WHY comments
□ Ensure clear naming
□ Extract long blocks to subroutines

STEP 7: REPEAT AS NEEDED
□ Routines to extract?
□ Patterns to abstract?
```

### PRISM Example

```javascript
// PSEUDOCODE: Calculate cutting parameters
// 1. Validate all inputs have required parameters
// 2. Look up base cutting data from Machining Data Handbook
// 3. Apply material correction factors
// 4. Apply tool correction factors
// 5. Apply machine constraints
// 6. Calculate confidence intervals
// 7. Return optimized parameters

function calculateCuttingParams(material, tool, machine) {
  // 1. Validate all inputs have required parameters
  const validation = validateInputs(material, tool, machine);
  if (!validation.isValid) {
    throw new InsufficientDataError(validation.missing);
  }
  
  // 2. Look up base cutting data from Machining Data Handbook
  const baseParams = handbook.lookup(material.category, tool.type);
  
  // ... continue for each pseudocode line
}
```

---

## CC-04: Routine & Class Design

### Routine Quality Checklist

```
COHESION
□ Does one thing well?
□ Name accurately describes function?
□ Could stand alone?

COUPLING
□ Minimal connections to other routines?
□ All parameters necessary?
□ No hidden dependencies?

SIZE
□ Understandable at a glance?
□ Fits on one screen?
□ If >200 lines, can decompose?

PARAMETERS
□ Consistent order (in → modify → out)?
□ ≤7 parameters per function?
□ Defaults provided?
□ Validated at entry?

ERROR HANDLING
□ All error conditions handled?
□ Errors communicated to caller?
□ Resources cleaned up on error?
```

### Class Design Checklist

```
ABSTRACTION
□ Represents coherent abstraction?
□ Responsibility obvious from name?
□ Every public method contributes?

ENCAPSULATION
□ Implementation details hidden?
□ Interface minimal?
□ Implementation can change without affecting clients?

INHERITANCE (If Used)
□ Only for "is-a" relationships?
□ Could composition work instead?
□ Derived class overrides sensibly?
```

---

## CC-05: Control Flow Quality

### Rules

```
IF-THEN-ELSE
□ Normal case first, not exception
□ All cases covered
□ Simplify tests with boolean functions
□ Most common case first in chains

LOOPS
□ Enter from one location only
□ Initialization close to loop
□ Housekeeping at beginning or end
□ One function per loop
□ Termination conditions obvious

CASE/SWITCH
□ Cases ordered meaningfully
□ Default case handled
□ Default only for genuine defaults

GOTO
□ Don't use. Period.
```

### Simplify Complex Conditions

```javascript
// BAD
if (material.hardness > 45 && material.hardness < 65 &&
    (tool.coating === 'TiAlN' || tool.coating === 'AlTiN') &&
    machine.rigidity >= 0.8 && !material.isAbrasive) {

// GOOD
const isHardnessInRange = material.hardness > 45 && material.hardness < 65;
const hasHighTempCoating = ['TiAlN', 'AlTiN'].includes(tool.coating);
const machineIsRigid = machine.rigidity >= 0.8;
const materialIsMachinable = !material.isAbrasive;

const highSpeedAllowed = isHardnessInRange && hasHighTempCoating && 
                          machineIsRigid && materialIsMachinable;
```

---

## CC-06: Data Organization

### Naming Conventions

```
GENERAL
□ Name describes what variable represents
□ Long enough to be clear
□ Short enough to be readable
□ Standard suffixes (Total, Average, Max, Min, Count)
□ Consistent opposites (begin/end, first/last, min/max)

SPECIFIC TYPES
□ Loop indexes: i, j, k OR meaningful for complex loops
□ Status: Named (statusOk), not coded (status = 1)
□ Boolean: Reads as question (isValid, hasData, canMachine)
□ Constants: ALL_CAPS_WITH_UNDERSCORES

SCOPE
□ Short names for short scope
□ Long names for long scope
□ Global names very descriptive
```

### PRISM Material Parameter Naming

```typescript
const material = {
  // Physical: adjective + noun
  yieldStrength: 275,           // MPa
  ultimateTensile: 485,         // MPa
  
  // Cutting: context + measurement
  kienzleK11: 1800,             // N/mm²
  kienzleMc: 0.25,              // dimensionless
  
  // Thermal: thermal + noun
  thermalConductivity: 51.9,    // W/(m·K)
  
  // Flags: is/has/can + condition
  isAbrasive: false,
  hasChipBreaker: true,
  canHighSpeedMachine: true,
  
  // Indices: noun + Index/Rating
  machinabilityRating: 65,      // % relative to B1112
};
```

---

## CC-07: Defensive Programming

### Input Validation Template

```typescript
function calculateCuttingParams(material, tool, machine) {
  // TYPE VALIDATION
  if (!isMaterial(material)) {
    throw new TypeError('material must be PRISMMaterial');
  }
  
  // REQUIRED DATA VALIDATION
  const missing = validateRequired(material, [
    'cutting.kienzle.k11',
    'cutting.kienzle.mc',
    'physical.hardness'
  ]);
  if (missing.length > 0) {
    throw new MissingDataError(`Missing: ${missing.join(', ')}`);
  }
  
  // RANGE VALIDATION
  if (material.physical.hardness < 0 || material.physical.hardness > 70) {
    throw new RangeError(`Hardness ${material.physical.hardness} outside 0-70`);
  }
  
  // BUSINESS RULE VALIDATION
  if (material.isAbrasive && !tool.coating.isWearResistant) {
    console.warn('Abrasive material with non-wear-resistant coating');
  }
  
  // ACTUAL LOGIC (protected by guards)
  // ...
}
```

### PRISM Error Hierarchy

```typescript
class PRISMError extends Error {
  constructor(message, context, recoverable = false) {
    super(message);
    this.context = context;
    this.recoverable = recoverable;
  }
}

class DataQualityError extends PRISMError {
  constructor(msg, ctx) { super(msg, ctx, true); }  // recoverable
}

class PhysicsViolationError extends PRISMError {
  constructor(msg, ctx) { super(msg, ctx, false); } // not recoverable
}

class SafetyLimitError extends PRISMError {
  constructor(msg, ctx) { 
    super(msg, ctx, false);
    safetyAudit.log(this); // ALWAYS log safety issues
  }
}
```

---

## CC-08: Code Layout & Style

```typescript
// 1. BRACE STYLE: K&R
function calculateSpeed(material) {
  if (material.hardness > 45) {
    return reduceSpeed(material);
  }
}

// 2. INDENTATION: 2 spaces

// 3. LINE LENGTH: 100 chars max

// 4. BLANK LINES: Separate logical sections

// 5. COMMENTS: Explain WHY, not WHAT
// BAD: Multiply speed by 0.8
const adjusted = baseSpeed * 0.8;
// GOOD: Reduce 20% for interrupted cuts (tool entry shock)
const adjusted = baseSpeed * INTERRUPTED_CUT_FACTOR;

// 6. SELF-DOCUMENTING CODE
// BAD
const x = a * 0.0254;
// GOOD
const INCHES_TO_METERS = 0.0254;
const depthMeters = depthInches * INCHES_TO_METERS;
```

---

## CC-09: Quality Practices

### Code Review Checklist

```
COMPLETENESS
□ Does what it's supposed to?
□ All requirements addressed?
□ Edge cases handled?
□ All paths tested?

CORRECTNESS
□ Logic correct?
□ Calculations accurate?
□ Units consistent?
□ Physics models appropriate?

CLARITY
□ Readable?
□ Names meaningful?
□ Comments helpful?
□ Structure clear?

CONSISTENCY
□ Follows PRISM coding standards?
□ Follows established patterns?
□ Naming consistent with existing code?
□ Error handling patterns consistent?

PRISM-SPECIFIC
□ All databases utilized? (10 Commandments #1)
□ Confidence intervals provided?
□ Missing data handled gracefully?
□ ML pipeline connected?
□ Safety limits respected?
```

---

## CC-10: Refactoring Guidance

### Safe Refactoring Protocol

```
BEFORE
□ All tests pass
□ Code under version control
□ Understand what code does
□ Specific improvement identified
□ Improvement worth the risk

DURING
□ One change at a time
□ Test after each change
□ Keep changes small and reversible
□ Preserve external behavior

AFTER
□ All tests still pass
□ Performance acceptable
□ Code review completed
□ Documentation updated

PRISM-SPECIFIC
□ NEVER remove database utilization
□ NEVER reduce confidence interval granularity
□ NEVER simplify safety checks
□ ALWAYS maintain backward compatibility
□ ALWAYS preserve audit trail
```

---

## CC-11: Integration Practices

### PRISM v9.0 Integration Sequence

```
PHASE 1: Foundation
├── Material schema validation
├── Database connection layer
└── Error handling framework

PHASE 2: Calculation Engines
├── Kienzle force model
├── Taylor tool life
├── Johnson-Cook thermal
└── Surface finish prediction

PHASE 3: Database Integration
├── Material database (1,047 materials)
├── Machine database (824 machines)
├── Tool database (44 manufacturers)
└── Cross-reference validation

PHASE 4: Consumer Wiring
├── CAM module consumers
├── Simulation consumers
├── Reporting consumers
└── ML training pipeline

PHASE 5: Validation
├── Physics constraint testing
├── Performance benchmarking
├── Security hardening
└── Documentation completion
```

---

## CC-12: Performance Tuning

### Measure First, Optimize Second

```
RULE #1: MEASURE BEFORE OPTIMIZING
Don't guess. Profile first.

OPTIMIZATION PRIORITY
1. Algorithm choice (O(n) vs O(n²))
2. Data structure choice
3. Database query optimization
4. Caching strategies
5. Low-level optimization (LAST RESORT)

PRISM PERFORMANCE TARGETS
- Page load: <2 seconds
- Single calculation: <500ms
- Batch (100 materials): <5 seconds
- Database query: <100ms
- Material lookup: <10ms
```

---

## CC-13: Master Dispatcher

```
"What are you about to do?"

├── PLANNING/DESIGNING
│   ├── New feature? → CC-02 + CC-03
│   ├── New class? → CC-04
│   └── Architecture? → CC-02
│
├── WRITING CODE
│   ├── New routine? → CC-03 + CC-04
│   ├── Control logic? → CC-05
│   ├── Data handling? → CC-06
│   └── Error handling? → CC-07
│
├── REVIEWING CODE
│   ├── Code review? → CC-09
│   ├── Style check? → CC-08
│   └── Refactoring? → CC-10
│
├── INTEGRATING → CC-11
│
├── OPTIMIZING → CC-12
│
└── ALWAYS ACTIVE → CC-01 (Mindset)
```

---

## COMBINED WORKFLOW: PRISM + Code Complete

```
SESSION START
├── Load Always-On (life-safety, completeness, anti-regression)
├── Load CC-01 (mindset)
│
BRAINSTORM (prism-sp-brainstorm)
├── Use CC-02: Prerequisites Checklist
├── Score must be ≥60
│
PLAN (prism-sp-planning)
├── Use CC-03: Pseudocode Programming
│
EXECUTE (prism-sp-execution)
├── CC-04: Routine & Class Design
├── CC-05: Control Flow
├── CC-06: Data Organization
├── CC-07: Defensive Programming
├── CC-08: Code Layout
│
REVIEW (prism-sp-review-*)
├── CC-09: Quality Practices
│
REFACTOR (if needed)
├── CC-10 + prism-anti-regression
│
INTEGRATE → CC-11
│
OPTIMIZE → CC-12
│
HANDOFF (prism-sp-handoff)
```

---

## QUICK REFERENCE CARD

```
╔═══════════════════════════════════════════════════════════╗
║         CODE COMPLETE + PRISM QUICK REFERENCE             ║
╠═══════════════════════════════════════════════════════════╣
║ BEFORE CODING                                             ║
║ □ Prerequisites checklist score ≥60                       ║
║ □ Pseudocode written for main routines                    ║
║ □ Class/routine design reviewed                           ║
║                                                           ║
║ WHILE CODING                                              ║
║ □ One thing per routine                                   ║
║ □ ≤7 parameters per function                              ║
║ □ Validate all inputs                                     ║
║ □ Handle all error paths                                  ║
║ □ Names describe purpose                                  ║
║ □ Comments explain WHY                                    ║
║                                                           ║
║ AFTER CODING                                              ║
║ □ All tests pass                                          ║
║ □ Code review completed                                   ║
║ □ No regression detected                                  ║
║                                                           ║
║ PRISM-SPECIFIC                                            ║
║ □ All databases utilized (10 Commandments #1)             ║
║ □ Confidence intervals provided                           ║
║ □ Safety limits respected                                 ║
╚═══════════════════════════════════════════════════════════╝
```

---

*Source: Code Complete, 2nd Edition by Steve McConnell (Microsoft Press, 2004)*
*Integration: PRISM Manufacturing Intelligence v9.0*
