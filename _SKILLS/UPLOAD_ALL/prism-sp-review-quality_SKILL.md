---
name: prism-sp-review-quality
description: |
  Code quality gate. Patterns, style, API contracts, 10 Commandments verification.
---

```
☐ PREREQUISITE: Spec review (SP.1.4) must be APPROVED
☐ PHASE 1: LOAD QUALITY STANDARDS - Pull from knowledge base skills
☐ PHASE 2: CODE STYLE REVIEW - Naming, formatting, comments
☐ PHASE 3: PATTERN COMPLIANCE - MIT patterns (SICP 6.001, 6.005)
☐ PHASE 4: API & CONTRACT REVIEW - Type safety, response wrappers
☐ PHASE 5: 10 COMMANDMENTS - All 10 checked systematically
☐ PHASE 6: VERDICT - Issues=FAIL, Recommendations-only=PASS
```

## 2.2 Process Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           QUALITY REVIEW FLOW                                           │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  PREREQUISITE CHECK                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │ Is spec review (SP.1.4) APPROVED?                                               │   │
│  │ YES → Continue    NO → STOP, run spec review first                              │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│         │                                                                               │
│         ▼                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │ PHASE 1: LOAD QUALITY STANDARDS                                                 │   │
│  │ • Load prism-coding-patterns (MIT patterns)                                     │   │
│  │ • Load prism-api-contracts (interface standards)                                │   │
│  │ • Reference prism-knowledge-base (course principles)                            │   │
│  │ • Identify which standards apply to this deliverable type                       │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│         │                                                                               │
│         ▼                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │ PHASE 2: CODE STYLE REVIEW                                                      │   │
│  │ • Naming conventions (functions, variables, constants, files)                   │   │
│  │ • Formatting consistency (indentation, line length, brackets)                   │   │
│  │ • Comment quality (headers, function docs, "why" comments)                      │   │
│  │ Findings: Mark as ISSUE or RECOMMENDATION                                       │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│         │                                                                               │
│         ▼                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │ PHASE 3: PATTERN COMPLIANCE (MIT 6.001, 6.005)                                  │   │
│  │ • Abstraction barriers present? (SICP §2.1)                                     │   │
│  │ • Higher-order functions used appropriately? (SICP §1.3)                        │   │
│  │ • Data abstraction followed? (SICP §2.1)                                        │   │
│  │ • SOLID principles applied? (6.005)                                             │   │
│  │ Findings: Mark as ISSUE or RECOMMENDATION                                       │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│         │                                                                               │
│         ▼                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │ PHASE 4: API & CONTRACT REVIEW                                                  │   │
│  │ • Type safety (per prism-api-contracts)                                         │   │
│  │ • Standard response wrapper used? (APIResponse<T>)                              │   │
│  │ • Error handling consistent? (APIError format)                                  │   │
│  │ • Validation present? (input and output)                                        │   │
│  │ Findings: Mark as ISSUE or RECOMMENDATION                                       │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│         │                                                                               │
│         ▼                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │ PHASE 5: 10 COMMANDMENTS ALIGNMENT                                              │   │
│  │ • Check all 10 commandments systematically                                      │   │
│  │ • #1,3,7,8 violations = ISSUE (blocking)                                        │   │
│  │ • #2,4,5,6,9,10 violations = RECOMMENDATION (non-blocking)                      │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│         │                                                                               │
│         ▼                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │ PHASE 6: VERDICT                                                                │   │
│  │ • Count total ISSUES and RECOMMENDATIONS                                        │   │
│  │ • Any ISSUES? → QUALITY FAIL → fix then re-review                               │   │
│  │ • Only RECOMMENDATIONS? → QUALITY APPROVED → proceed                            │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│         │                                                                               │
│         ├───────────────────────────────────┬───────────────────────────────────────   │
│         ▼                                   ▼                                           │
│  ┌─────────────────┐                 ┌─────────────────┐                               │
│  │ QUALITY         │                 │ QUALITY         │                               │
│  │ APPROVED        │                 │ FAILED          │                               │
│  │                 │                 │                 │                               │
│  │ → SP.1.6/SP.1.7 │                 │ → Fix issues    │                               │
│  │   (debug/verify)│                 │ → Re-review     │                               │
│  └─────────────────┘                 └─────────────────┘                               │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 2.3 Phase 1: Load Quality Standards

### Purpose
Identify which quality standards apply to this deliverable and load the relevant skill references.

### Actions

```markdown
## PHASE 1: LOAD QUALITY STANDARDS

### Step 1.1: Identify Deliverable Type
What are we reviewing?
- [ ] JavaScript/TypeScript code
- [ ] Skill file (SKILL.md)
- [ ] Database file (JSON)
- [ ] Documentation (Markdown)
- [ ] Configuration file
- [ ] Other: _______________

### Step 1.2: Load Applicable Standards

| Deliverable Type | prism-coding-patterns | prism-api-contracts | prism-knowledge-base |
|------------------|----------------------|---------------------|---------------------|
| JS/TS Code | Full (all sections) | Full (all sections) | 6.001, 6.005, 6.046J |
| Skill File | §1.1-1.3 (structure) | N/A | 6.005 (documentation) |
| Database JSON | §1.3 (data abstraction) | §1.2 (types) | 6.830 (databases) |
| Documentation | N/A | N/A | 6.005 (writing) |

### Step 1.3: Document Standards in Use
```
Standards loaded for this review:
- prism-coding-patterns: Sections [list]
- prism-api-contracts: Sections [list]
- MIT Courses: [list]
- Other: [list]
```
```

### Completion Criteria
- [ ] Deliverable type identified
- [ ] Applicable standards loaded
- [ ] Standards documented for traceability

## 2.4 Phase 2: Code Style Review

### Purpose
Check naming, formatting, and commenting against established conventions.

### Actions

```markdown
## PHASE 2: CODE STYLE REVIEW

### Step 2.1: Naming Conventions

| Element | Convention | Example | Check |
|---------|------------|---------|-------|
| Functions | camelCase, verb prefix | `calculateForce()` | ☐ |
| Variables | camelCase, descriptive | `materialHardness` | ☐ |
| Constants | UPPER_SNAKE_CASE | `MAX_SPINDLE_SPEED` | ☐ |
| Files | kebab-case | `cutting-force-engine.js` | ☐ |
| Classes | PascalCase | `MaterialDatabase` | ☐ |
| Private | _prefix | `_internalCache` | ☐ |

**Findings:**
- [List any violations]

### Step 2.2: Formatting

| Check | Standard | Status |
|-------|----------|--------|
| Indentation | 2 spaces | ☐ |
| Line length | ≤100 characters | ☐ |
| Bracket style | Same-line opening | ☐ |
| Semicolons | Consistent (all or none) | ☐ |
| Trailing commas | Consistent | ☐ |

**Findings:**
- [List any violations]

### Step 2.3: Comments

| Check | Standard | Status |
|-------|----------|--------|
| File header | Purpose, author, date present | ☐ |
| Function docs | Params, returns, throws documented | ☐ |
| Complex logic | "Why" explained, not just "what" | ☐ |
| No dead code | Commented-out code removed | ☐ |
| No TODO spam | TODOs are actionable or removed | ☐ |

**Findings:**
- [List any violations]
```

### Completion Criteria
- [ ] All naming conventions checked
- [ ] Formatting consistency verified
- [ ] Comment quality assessed
- [ ] Findings documented with severity

## 2.5 Phase 3: Pattern Compliance

### Purpose
Verify code follows MIT-based patterns from prism-coding-patterns.

### Actions

```markdown
## PHASE 3: PATTERN COMPLIANCE (MIT 6.001, 6.005)

### Step 3.1: Abstraction Barriers (SICP §2.1)
Reference: prism-coding-patterns Section 1.1

| Check | Evidence | Status |
|-------|----------|--------|
| Interface separated from implementation | | ☐ PASS / ☐ ISSUE / ☐ N/A |
| Internal structure not exposed | | ☐ PASS / ☐ ISSUE / ☐ N/A |
| Consumers use interface, not internals | | ☐ PASS / ☐ ISSUE / ☐ N/A |

**Findings:**
- [List any violations with code references]

### Step 3.2: Higher-Order Functions (SICP §1.3)
Reference: prism-coding-patterns Section 1.2

| Check | Evidence | Status |
|-------|----------|--------|
| Repeated patterns abstracted to HOF | | ☐ PASS / ☐ REC / ☐ N/A |
| Callbacks used appropriately | | ☐ PASS / ☐ REC / ☐ N/A |
| Factory functions where beneficial | | ☐ PASS / ☐ REC / ☐ N/A |

**Findings:**
- [List any opportunities]

### Step 3.3: Data Abstraction (SICP §2.1)
Reference: prism-coding-patterns Section 1.3

| Check | Evidence | Status |
|-------|----------|--------|
| Data defined by operations, not representation | | ☐ PASS / ☐ ISSUE / ☐ N/A |
| Selectors and constructors used | | ☐ PASS / ☐ ISSUE / ☐ N/A |

**Findings:**
- [List any violations]

### Step 3.4: SOLID Principles (6.005)
Reference: prism-coding-patterns, prism-knowledge-base

| Principle | Check | Status |
|-----------|-------|--------|
| **S**ingle Responsibility | Each function does one thing | ☐ PASS / ☐ ISSUE |
| **O**pen/Closed | Extensible without modification | ☐ PASS / ☐ REC |
| **L**iskov Substitution | Subtypes are substitutable | ☐ PASS / ☐ REC |
| **I**nterface Segregation | No fat interfaces | ☐ PASS / ☐ REC |
| **D**ependency Inversion | Depend on abstractions | ☐ PASS / ☐ ISSUE |

**Findings:**
- [List any violations]
```

### Completion Criteria
- [ ] Abstraction barriers checked
- [ ] HOF opportunities identified
- [ ] Data abstraction verified
- [ ] SOLID principles assessed
- [ ] All findings reference specific code and standard

## 2.6 Phase 4: API & Contract Review

### Purpose
Verify interfaces follow prism-api-contracts standards.

### Actions

```markdown
## PHASE 4: API & CONTRACT REVIEW

Reference: prism-api-contracts

### Step 4.1: Type Safety

| Check | Standard | Status |
|-------|----------|--------|
| All parameters typed | No implicit `any` | ☐ PASS / ☐ ISSUE |
| Return types declared | Explicit return types | ☐ PASS / ☐ ISSUE |
| Measurements use `Measurement` type | {value, unit, uncertainty} | ☐ PASS / ☐ ISSUE |
| Ranges use `Range<T>` type | {min, max, typical, optimal} | ☐ PASS / ☐ REC |

**Findings:**
- [List any violations]

### Step 4.2: Response Wrapper

| Check | Standard | Status |
|-------|----------|--------|
| Uses `APIResponse<T>` | Standard wrapper | ☐ PASS / ☐ ISSUE / ☐ N/A |
| Includes metadata | requestId, timestamp, duration | ☐ PASS / ☐ REC / ☐ N/A |
| Sources tracked | DataSource[] present | ☐ PASS / ☐ REC / ☐ N/A |

**Findings:**
- [List any violations]

### Step 4.3: Error Handling

| Check | Standard | Status |
|-------|----------|--------|
| Errors use `APIError` format | Consistent error structure | ☐ PASS / ☐ ISSUE |
| Error codes defined | Not magic strings | ☐ PASS / ☐ REC |
| Stack traces captured (dev) | For debugging | ☐ PASS / ☐ REC |

**Findings:**
- [List any violations]

### Step 4.4: Validation

| Check | Standard | Status |
|-------|----------|--------|
| Input validation present | Before processing | ☐ PASS / ☐ ISSUE |
| Output validation present | Before return | ☐ PASS / ☐ REC |
| Edge cases handled | Nulls, empty, bounds | ☐ PASS / ☐ ISSUE |
| Sanitization present | No injection vulnerabilities | ☐ PASS / ☐ ISSUE |

**Findings:**
- [List any violations]
```

### Completion Criteria
- [ ] Type safety verified
- [ ] Response wrapper usage checked
- [ ] Error handling consistency confirmed
- [ ] Validation coverage assessed

## 2.7 Phase 5: 10 Commandments Alignment

### Purpose
Systematically check all 10 PRISM commandments.

### Actions

```markdown
## PHASE 5: 10 COMMANDMENTS ALIGNMENT

| # | Commandment | Check | Severity | Status |
|---|-------------|-------|----------|--------|
| 1 | **Use Everywhere** | 6+ consumers identified/planned | ISSUE | ☐ |
| 2 | **Fuse** | Cross-domain integration present | REC | ☐ |
| 3 | **Verify Triple** | 3-layer validation (input, process, output) | ISSUE | ☐ |
| 4 | **Learn** | Feeds ML pipeline or logs for learning | REC | ☐ |
| 5 | **Uncertainty** | Confidence intervals included | REC | ☐ |
| 6 | **Explain** | XAI-ready, explainable outputs | REC | ☐ |
| 7 | **Graceful** | Fallbacks present, fails safely | ISSUE | ☐ |
| 8 | **Protect** | Input sanitization, validation | ISSUE | ☐ |
| 9 | **Perform** | <500ms for calculations | REC | ☐ |
| 10 | **User Obsess** | Good defaults, sensible UX | REC | ☐ |

### Detailed Checks

**#1 Use Everywhere (ISSUE if violated)**
- Consumers identified: [list or "none yet"]
- Consumer count: [N] (need 6+)
- Status: ☐ PASS / ☐ ISSUE

**#3 Verify Triple (ISSUE if violated)**
- Input validation: ☐ YES / ☐ NO
- Process validation: ☐ YES / ☐ NO
- Output validation: ☐ YES / ☐ NO
- Status: ☐ PASS / ☐ ISSUE

**#7 Graceful (ISSUE if violated)**
- Error handling present: ☐ YES / ☐ NO
- Fallback values defined: ☐ YES / ☐ NO
- Fails without crashing: ☐ YES / ☐ NO
- Status: ☐ PASS / ☐ ISSUE

**#8 Protect (ISSUE if violated)**
- Input sanitization: ☐ YES / ☐ NO
- Bounds checking: ☐ YES / ☐ NO
- Type coercion safe: ☐ YES / ☐ NO
- Status: ☐ PASS / ☐ ISSUE
```

### Completion Criteria
- [ ] All 10 commandments checked
- [ ] Blocking violations (#1,3,7,8) identified as ISSUES
- [ ] Non-blocking items (#2,4,5,6,9,10) noted as RECOMMENDATIONS

## 2.8 Phase 6: Verdict

### Purpose
Render final quality verdict based on findings.

### Decision Logic

```
IF (any ISSUE found)
  THEN verdict = QUALITY FAILED
  ELSE verdict = QUALITY APPROVED (with RECOMMENDATIONS noted)
```

### Actions

```markdown
## PHASE 6: VERDICT

### Findings Tally

| Phase | Issues | Recommendations |
|-------|--------|-----------------|
| Code Style | [N] | [N] |
| Pattern Compliance | [N] | [N] |
| API/Contracts | [N] | [N] |
| 10 Commandments | [N] | [N] |
| **TOTAL** | **[N]** | **[N]** |

### Verdict

☐ **QUALITY APPROVED** - 0 Issues, [N] Recommendations
  → Proceed to SP.1.6 (debugging) or SP.1.7 (verification)
  → Recommendations logged for future improvement

☐ **QUALITY FAILED** - [N] Issues found
  → Fix all issues
  → Re-run quality review
  → Cannot proceed until 0 issues
```

### Completion Criteria
- [ ] All findings tallied
- [ ] Verdict rendered (APPROVED or FAILED)
- [ ] Next action identified

# SECTION 4: PATTERN COMPLIANCE (MIT)

## 4.1 Purpose

This section details MIT-based patterns from prism-coding-patterns. These patterns come from:
- **MIT 6.001 (SICP)** - Abstraction, higher-order functions, data abstraction
- **MIT 6.005 (Software Construction)** - SOLID principles, specifications, testing
- **MIT 6.046J (Algorithms)** - Complexity, efficiency patterns

## 4.2 Abstraction Barriers (SICP §2.1)

### Principle
Create clear boundaries between interface and implementation. Consumers use the interface; implementation details are hidden.

### What to Check

```javascript
// ✅ GOOD: Clear abstraction barrier
const PRISM_MATERIALS = {
  // PUBLIC INTERFACE (stable, documented)
  get: (id) => _storage.get(id),
  getProperty: (material, prop) => material.properties?.[prop],
  query: (criteria) => _index.search(criteria),
  
  // PRIVATE IMPLEMENTATION (can change)
  _storage: new Map(),
  _index: new SearchIndex(),
  _validate: (m) => { /* internal validation */ }
};

// Usage - consumers only use interface
const material = PRISM_MATERIALS.get('P-CS-005');
const hardness = PRISM_MATERIALS.getProperty(material, 'hardness');

// ❌ BAD: No abstraction barrier
const MATERIALS = [/* raw array */];
const material = MATERIALS[5];  // Direct array access
const hardness = material.properties.mechanical.hardness.value; // Deep reaching
```

### Check Template

```markdown
## ABSTRACTION BARRIER CHECK

### Interfaces Identified
| Module/Object | Interface Methods | Private Members | Barrier Clear? |
|---------------|-------------------|-----------------|----------------|
| [name] | [list] | [list] | ☐ YES / ☐ NO |

### Violation Check
| Check | Status | Evidence |
|-------|--------|----------|
| Consumers use interface only | ☐ PASS / ☐ ISSUE | [code ref] |
| Internal structure not exposed | ☐ PASS / ☐ ISSUE | [code ref] |
| Implementation changeable without breaking consumers | ☐ PASS / ☐ ISSUE | [analysis] |

### Severity
- Missing barrier on core module: **ISSUE**
- Missing barrier on utility: **RECOMMENDATION**
```

## 4.3 Higher-Order Functions (SICP §1.3)

### Principle
Use functions that take or return functions to abstract common patterns, reduce repetition, and increase flexibility.

### What to Check

```javascript
// ✅ GOOD: HOF abstracts repeated pattern
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

// Usage - create specific validators from general pattern
const validateMaterial = createValidator(MATERIAL_SCHEMA, MATERIAL_RULES);
const validateTool = createValidator(TOOL_SCHEMA, TOOL_RULES);

// ❌ BAD: Repeated code instead of HOF
function validateMaterial(m) {
  const errors = [];
  // Same validation logic copy-pasted
  // ...
}
function validateTool(t) {
  const errors = [];
  // Same validation logic copy-pasted
  // ...
}
```

### Check Template

```markdown
## HIGHER-ORDER FUNCTION CHECK

### Repeated Patterns Found
| Pattern | Occurrences | HOF Candidate? |
|---------|-------------|----------------|
| [describe pattern] | [N] | ☐ YES / ☐ NO |

### HOF Opportunities
| Current Code | Suggested HOF | Benefit |
|--------------|---------------|---------|
| [repetition] | [factory/combinator] | [reduction] |

### Existing HOF Usage
| HOF | Purpose | Well-Implemented? |
|-----|---------|-------------------|
| [name] | [purpose] | ☐ YES / ☐ NO |

### Severity
- Excessive repetition (>3 copies): **RECOMMENDATION**
- Minor repetition (2-3 copies): **RECOMMENDATION** (low priority)
```

## 4.4 Data Abstraction (SICP §2.1)

### Principle
Define data by what operations you can perform on it, not by how it's represented internally.

### What to Check

```javascript
// ✅ GOOD: Data defined by operations
// A "Material" is what you can DO with it
const Material = {
  // Constructors
  create: (id, name, category, properties) => ({ id, name, category, properties }),
  fromJSON: (json) => Material.create(json.id, json.name, json.category, json.props),
  
  // Selectors
  getId: (m) => m.id,
  getName: (m) => m.name,
  getProperty: (m, prop) => m.properties?.[prop]?.value,
  
  // Predicates
  isValid: (m) => m.id && m.name && m.category,
  hasProperty: (m, prop) => prop in (m.properties || {}),
  
  // Mutators (return new, don't modify)
  setProperty: (m, prop, value) => ({
    ...m,
    properties: { ...m.properties, [prop]: value }
  })
};

// ❌ BAD: Data as raw structure
const material = {
  id: 'P-CS-005',
  name: 'Steel 1045',
  // No operations defined - consumers reach into structure directly
};
const hardness = material.properties.mechanical.hardness.value;
```

### Check Template

```markdown
## DATA ABSTRACTION CHECK

### Data Types Identified
| Type | Has Constructors? | Has Selectors? | Has Predicates? |
|------|-------------------|----------------|-----------------|
| [type] | ☐ YES / ☐ NO | ☐ YES / ☐ NO | ☐ YES / ☐ NO |

### Direct Structure Access (Violations)
| Code Location | Violation | Suggested Fix |
|---------------|-----------|---------------|
| [file:line] | [direct access] | [use selector] |

### Severity
- Core data type without abstraction: **ISSUE**
- Utility type without abstraction: **RECOMMENDATION**
```

## 4.5 SOLID Principles (6.005)

### Single Responsibility Principle (SRP)

```javascript
// ✅ GOOD: One responsibility per function/class
function calculateCuttingForce(material, params) {
  // Only calculates force - nothing else
}

function formatForceReport(forceResult) {
  // Only formats - doesn't calculate
}

// ❌ BAD: Multiple responsibilities
function calculateAndDisplayForce(material, params, outputElement) {
  // Calculates AND displays - too much responsibility
}
```

### Open/Closed Principle (OCP)

```javascript
// ✅ GOOD: Open for extension, closed for modification
const forceCalculators = {
  kienzle: (m, p) => { /* Kienzle model */ },
  merchant: (m, p) => { /* Merchant model */ },
  // Easy to add new models without modifying existing code
};

function calculateForce(model, material, params) {
  return forceCalculators[model](material, params);
}

// ❌ BAD: Must modify code to add new model
function calculateForce(model, material, params) {
  if (model === 'kienzle') { /* ... */ }
  else if (model === 'merchant') { /* ... */ }
  // Adding new model requires modifying this function
}
```

### Dependency Inversion Principle (DIP)

```javascript
// ✅ GOOD: Depend on abstractions
function createForceCalculator(database, validator, logger) {
  // Dependencies injected - easy to test, swap implementations
  return {
    calculate: (materialId, params) => {
      const material = database.get(materialId);
      validator.validate(params);
      const result = doCalculation(material, params);
      logger.log(result);
      return result;
    }
  };
}

// ❌ BAD: Hard-coded dependencies
function calculateForce(materialId, params) {
  const material = GLOBAL_DATABASE.get(materialId);  // Hard dependency
  console.log(result);  // Hard dependency on console
}
```

### SOLID Check Template

```markdown
## SOLID PRINCIPLES CHECK

| Principle | Check | Status | Evidence |
|-----------|-------|--------|----------|
| **S**ingle Responsibility | Each function/class has one job | ☐ PASS / ☐ ISSUE | [ref] |
| **O**pen/Closed | Extensible without modification | ☐ PASS / ☐ REC | [ref] |
| **L**iskov Substitution | Subtypes are substitutable | ☐ PASS / ☐ REC | [ref] |
| **I**nterface Segregation | No fat interfaces | ☐ PASS / ☐ REC | [ref] |
| **D**ependency Inversion | Depends on abstractions | ☐ PASS / ☐ ISSUE | [ref] |

### Violations Found
| Principle | Location | Violation | Suggested Fix |
|-----------|----------|-----------|---------------|
| [S/O/L/I/D] | [file:line] | [description] | [fix] |
```

## 4.6 Pattern Compliance Summary Template

```markdown
## PATTERN COMPLIANCE SUMMARY

### MIT Pattern Checks
| Pattern | Source | Status | Findings |
|---------|--------|--------|----------|
| Abstraction Barriers | SICP §2.1 | ☐ PASS / ☐ ISSUE / ☐ REC | [N] |
| Higher-Order Functions | SICP §1.3 | ☐ PASS / ☐ REC | [N] |
| Data Abstraction | SICP §2.1 | ☐ PASS / ☐ ISSUE / ☐ REC | [N] |
| SOLID - SRP | 6.005 | ☐ PASS / ☐ ISSUE | [N] |
| SOLID - OCP | 6.005 | ☐ PASS / ☐ REC | [N] |
| SOLID - LSP | 6.005 | ☐ PASS / ☐ REC | [N] |
| SOLID - ISP | 6.005 | ☐ PASS / ☐ REC | [N] |
| SOLID - DIP | 6.005 | ☐ PASS / ☐ ISSUE | [N] |

### Pattern Findings Summary
| Category | Issues | Recommendations |
|----------|--------|-----------------|
| Abstraction | [N] | [N] |
| HOF | [N] | [N] |
| Data | [N] | [N] |
| SOLID | [N] | [N] |
| **Total** | [N] | [N] |

### Knowledge Base References
- prism-coding-patterns: Sections 1.1, 1.2, 1.3
- prism-knowledge-base: MIT 6.001, 6.005
```

# SECTION 6: 10 COMMANDMENTS CHECKLIST

## 6.1 Purpose

The 10 Commandments are PRISM's core principles. Every deliverable must be checked against all 10. Some are blocking (ISSUE), others are recommendations.

## 6.2 Commandment Severity Classification

| # | Commandment | Severity | Rationale |
|---|-------------|----------|-----------|
| 1 | Use Everywhere | **ISSUE** | Core utilization principle - orphaned code is waste |
| 2 | Fuse | RECOMMENDATION | Ideal but not always applicable |
| 3 | Verify Triple | **ISSUE** | Data integrity is non-negotiable |
| 4 | Learn | RECOMMENDATION | Important for continuous improvement |
| 5 | Uncertainty | RECOMMENDATION | Scientific best practice |
| 6 | Explain | RECOMMENDATION | XAI readiness |
| 7 | Graceful | **ISSUE** | System stability is critical |
| 8 | Protect | **ISSUE** | Security and data integrity |
| 9 | Perform | RECOMMENDATION | Optimization can come later |
| 10 | User Obsess | RECOMMENDATION | UX improvements can iterate |

**Blocking (#1, #3, #7, #8):** System won't be reliable without these.
**Non-blocking (#2, #4, #5, #6, #9, #10):** Important but can iterate.

## 6.3 Detailed Commandment Checks

### Commandment #1: USE EVERYWHERE (ISSUE)

**Principle:** "IF IT EXISTS, USE IT EVERYWHERE" - Every module must have 6+ consumers.

```markdown
## COMMANDMENT #1: USE EVERYWHERE

### Consumer Analysis
| Potential Consumer | Will Use This? | Integration Planned? |
|-------------------|----------------|----------------------|
| [Product 1] | ☐ YES / ☐ NO | ☐ YES / ☐ NO |
| [Product 2] | ☐ YES / ☐ NO | ☐ YES / ☐ NO |
| [Engine 1] | ☐ YES / ☐ NO | ☐ YES / ☐ NO |
| [Engine 2] | ☐ YES / ☐ NO | ☐ YES / ☐ NO |

### Consumer Count
- Identified consumers: [N]
- Required minimum: 6
- Status: ☐ PASS (≥6) / ☐ ISSUE (<6)

### If ISSUE
Document plan to wire additional consumers:
1. [Consumer] - [integration approach]
2. [Consumer] - [integration approach]
```

### Commandment #2: FUSE (RECOMMENDATION)

**Principle:** Cross-domain integration, combining data from multiple sources.

```markdown
## COMMANDMENT #2: FUSE

### Data Sources Used
| Source | Type | Integrated? |
|--------|------|-------------|
| Database | core | ☐ YES / ☐ NO |
| Physics model | derived | ☐ YES / ☐ NO |
| ML prediction | learned | ☐ YES / ☐ NO |
| Historical data | historical | ☐ YES / ☐ NO |
| User input | user | ☐ YES / ☐ NO |

### Fusion Status
- Sources integrated: [N]
- Cross-domain fusion: ☐ YES / ☐ NO
- Status: ☐ PASS / ☐ REC (could add more sources)
```

### Commandment #3: VERIFY TRIPLE (ISSUE)

**Principle:** Three-layer validation - input, process, output.

```markdown
## COMMANDMENT #3: VERIFY TRIPLE

### Validation Layers
| Layer | Present? | Method |
|-------|----------|--------|
| Input validation | ☐ YES / ☐ NO | [describe] |
| Process validation | ☐ YES / ☐ NO | [describe] |
| Output validation | ☐ YES / ☐ NO | [describe] |

### Status
- All 3 layers present: ☐ YES / ☐ NO
- If NO: **ISSUE** - Must add missing validation layers
```

### Commandment #4: LEARN (RECOMMENDATION)

**Principle:** Feed data back to ML pipelines, enable continuous learning.

```markdown
## COMMANDMENT #4: LEARN

### Learning Integration
| Check | Status |
|-------|--------|
| Logs structured for ML ingestion | ☐ YES / ☐ NO |
| Outcomes tracked for feedback | ☐ YES / ☐ NO |
| Feeds into learning pipeline | ☐ YES / ☐ NO / ☐ N/A |

### Status
- Learning-ready: ☐ YES / ☐ NO
- If NO: REC - Add structured logging for future learning
```

### Commandment #5: UNCERTAINTY (RECOMMENDATION)

**Principle:** Include confidence intervals, don't overstate precision.

```markdown
## COMMANDMENT #5: UNCERTAINTY

### Uncertainty Tracking
| Output | Has Uncertainty? | Has Confidence? |
|--------|------------------|-----------------|
| [value1] | ☐ YES / ☐ NO | ☐ YES / ☐ NO |
| [value2] | ☐ YES / ☐ NO | ☐ YES / ☐ NO |

### Status
- Uses Measurement type with uncertainty: ☐ YES / ☐ NO
- Confidence levels included: ☐ YES / ☐ NO
- If NO: REC - Add uncertainty quantification
```

### Commandment #6: EXPLAIN (RECOMMENDATION)

**Principle:** XAI-ready, explainable outputs.

```markdown
## COMMANDMENT #6: EXPLAIN

### Explainability Check
| Check | Status |
|-------|--------|
| Calculation steps traceable | ☐ YES / ☐ NO |
| Sources cited in output | ☐ YES / ☐ NO |
| Human-readable explanations available | ☐ YES / ☐ NO |
| Can answer "why this result?" | ☐ YES / ☐ NO |

### Status
- XAI-ready: ☐ YES / ☐ PARTIAL / ☐ NO
- If not YES: REC - Add explanation capability
```

### Commandment #7: GRACEFUL (ISSUE)

**Principle:** Fail safely, provide fallbacks, don't crash.

```markdown
## COMMANDMENT #7: GRACEFUL

### Failure Handling
| Scenario | Handled? | Fallback? |
|----------|----------|-----------|
| Missing data | ☐ YES / ☐ NO | ☐ YES / ☐ NO |
| Invalid input | ☐ YES / ☐ NO | ☐ YES / ☐ NO |
| Calculation error | ☐ YES / ☐ NO | ☐ YES / ☐ NO |
| External service down | ☐ YES / ☐ NO | ☐ YES / ☐ NO |

### Error Recovery
| Check | Status |
|-------|--------|
| Try/catch blocks present | ☐ YES / ☐ NO |
| Default/fallback values defined | ☐ YES / ☐ NO |
| Fails without crashing system | ☐ YES / ☐ NO |
| Errors logged for debugging | ☐ YES / ☐ NO |

### Status
- Graceful failure: ☐ YES / ☐ NO
- If NO: **ISSUE** - Must add error handling and fallbacks
```

### Commandment #8: PROTECT (ISSUE)

**Principle:** Input sanitization, bounds checking, security.

```markdown
## COMMANDMENT #8: PROTECT

### Protection Checks
| Check | Status |
|-------|--------|
| Input sanitization present | ☐ YES / ☐ NO |
| Bounds checking on numerics | ☐ YES / ☐ NO |
| Type coercion is safe | ☐ YES / ☐ NO |
| No injection vulnerabilities | ☐ YES / ☐ NO |
| Sensitive data protected | ☐ YES / ☐ NO / ☐ N/A |

### Status
- Protected: ☐ YES / ☐ NO
- If NO: **ISSUE** - Must add protection measures
```

### Commandment #9: PERFORM (RECOMMENDATION)

**Principle:** <500ms for calculations, optimize for responsiveness.

```markdown
## COMMANDMENT #9: PERFORM

### Performance Check
| Operation | Expected Time | Actual/Estimated | Status |
|-----------|---------------|------------------|--------|
| [operation1] | <500ms | [time] | ☐ PASS / ☐ REC |
| [operation2] | <500ms | [time] | ☐ PASS / ☐ REC |

### Status
- Meets performance target: ☐ YES / ☐ NO / ☐ UNTESTED
- If NO: REC - Optimize or document known limitations
```

### Commandment #10: USER OBSESS (RECOMMENDATION)

**Principle:** Good defaults, sensible UX, user-focused design.

```markdown
## COMMANDMENT #10: USER OBSESS

### User Experience Check
| Check | Status |
|-------|--------|
| Sensible defaults provided | ☐ YES / ☐ NO |
| Error messages are helpful | ☐ YES / ☐ NO |
| API is intuitive | ☐ YES / ☐ NO |
| Documentation clear | ☐ YES / ☐ NO |

### Status
- User-friendly: ☐ YES / ☐ PARTIAL / ☐ NO
- If not YES: REC - Improve user experience
```

## 6.4 10 Commandments Summary Template

```markdown
## 10 COMMANDMENTS SUMMARY

| # | Commandment | Severity | Status | Finding |
|---|-------------|----------|--------|---------|
| 1 | Use Everywhere | ISSUE | ☐ PASS / ☐ ISSUE | [consumers: N] |
| 2 | Fuse | REC | ☐ PASS / ☐ REC | [sources: N] |
| 3 | Verify Triple | ISSUE | ☐ PASS / ☐ ISSUE | [layers: N/3] |
| 4 | Learn | REC | ☐ PASS / ☐ REC | [learning-ready] |
| 5 | Uncertainty | REC | ☐ PASS / ☐ REC | [has uncertainty] |
| 6 | Explain | REC | ☐ PASS / ☐ REC | [XAI-ready] |
| 7 | Graceful | ISSUE | ☐ PASS / ☐ ISSUE | [fallbacks] |
| 8 | Protect | ISSUE | ☐ PASS / ☐ ISSUE | [sanitization] |
| 9 | Perform | REC | ☐ PASS / ☐ REC | [<500ms] |
| 10 | User Obsess | REC | ☐ PASS / ☐ REC | [defaults] |

### Totals
| Category | Count |
|----------|-------|
| ISSUES (blocking) | [N] |
| RECOMMENDATIONS | [N] |
```

# SECTION 8: VERDICT PROTOCOL

## 8.1 Purpose

The verdict is the final output of quality review. It must be clear, actionable, and properly route to the next step.

## 8.2 Verdict Decision Logic

```
COUNT all findings:
  - Total ISSUES
  - Total RECOMMENDATIONS

IF (ISSUES > 0)
  THEN verdict = QUALITY FAILED
  ELSE verdict = QUALITY APPROVED
```

**Simple rule:** Any ISSUE = FAIL. Only RECOMMENDATIONS = PASS.

## 8.3 QUALITY APPROVED Protocol

When there are 0 ISSUES (may have RECOMMENDATIONS):

```markdown
## QUALITY REVIEW VERDICT: ✅ APPROVED

**Review Date:** [YYYY-MM-DD HH:MM]
**Deliverable:** [what was reviewed]
**Reviewer:** Claude
**Spec Review Reference:** [SP.1.4 approval reference]

### Findings Summary

| Phase | Issues | Recommendations |
|-------|--------|-----------------|
| Code Style | 0 | [N] |
| Pattern Compliance | 0 | [N] |
| API/Contracts | 0 | [N] |
| 10 Commandments | 0 | [N] |
| **TOTAL** | **0** | **[N]** |

### Verdict
**QUALITY APPROVED** - No blocking issues found.
[N] recommendations logged for future improvement.

### Recommendations (Optional Improvements)
| ID | Category | Location | Suggestion | Priority |
|----|----------|----------|------------|----------|
| R1 | [cat] | [loc] | [suggestion] | High/Med/Low |
| R2 | [cat] | [loc] | [suggestion] | High/Med/Low |

### Knowledge Base Standards Applied
- prism-coding-patterns: ✓
- prism-api-contracts: ✓
- prism-knowledge-base: MIT 6.001, 6.005
- 10 Commandments: All checked

### Next Action
Proceed to:
- **SP.1.6 (prism-sp-debugging)** if any runtime testing needed
- **SP.1.7 (prism-sp-verification)** if ready for final verification

### Handoff Data
```json
{
  "from": "prism-sp-review-quality",
  "status": "QUALITY_APPROVED",
  "issues": 0,
  "recommendations": [N],
  "deliverable": "[path]",
  "timestamp": "[ISO date]"
}
```
```

## 8.4 QUALITY FAILED Protocol

When there are 1+ ISSUES:

```markdown
## QUALITY REVIEW VERDICT: ❌ FAILED

**Review Date:** [YYYY-MM-DD HH:MM]
**Deliverable:** [what was reviewed]
**Reviewer:** Claude
**Spec Review Reference:** [SP.1.4 approval reference]

### Findings Summary

| Phase | Issues | Recommendations |
|-------|--------|-----------------|
| Code Style | [N] | [N] |
| Pattern Compliance | [N] | [N] |
| API/Contracts | [N] | [N] |
| 10 Commandments | [N] | [N] |
| **TOTAL** | **[N]** | **[N]** |

### Verdict
**QUALITY FAILED** - [N] blocking issues must be fixed.

### Issues (MUST FIX)

| ID | Category | Location | Problem | Fix Required |
|----|----------|----------|---------|--------------|
| I1 | [cat] | [loc] | [problem] | [fix] |
| I2 | [cat] | [loc] | [problem] | [fix] |

### Prioritized Fix Order

**Fix First (Critical):**
1. [Issue] - [reason it's critical]

**Fix Second (High):**
1. [Issue] - [reason]

**Fix Third (Medium):**
1. [Issue] - [reason]

### Recommendations (Can Address Later)
[List if any - these don't block but should be noted]

### Next Action
1. Fix all [N] issues listed above
2. Re-run quality review (SP.1.5)
3. Cannot proceed until verdict is APPROVED

### Handoff Data
```json
{
  "from": "prism-sp-review-quality",
  "status": "QUALITY_FAILED",
  "issues": [N],
  "issueList": ["I1", "I2", ...],
  "recommendations": [N],
  "deliverable": "[path]",
  "timestamp": "[ISO date]"
}
```
```

## 8.5 State Updates

### On APPROVED
```javascript
updateCurrentState({
  qualityReview: {
    status: 'APPROVED',
    date: new Date().toISOString(),
    issues: 0,
    recommendations: recommendationCount,
    nextSkill: 'prism-sp-verification' // or 'prism-sp-debugging'
  }
});
```

### On FAILED
```javascript
updateCurrentState({
  qualityReview: {
    status: 'FAILED',
    date: new Date().toISOString(),
    issues: issueCount,
    issueList: issueIds,
    recommendations: recommendationCount,
    nextSkill: 'fix-then-re-review'
  }
});
```

## 8.6 Re-Review Protocol

After fixing issues:

1. **Verify fixes** - Each issue has been addressed
2. **Re-run quality review** - Start from Phase 1
3. **Check new issues** - Fixes might introduce new problems
4. **Update verdict** - New pass/fail decision

```markdown
## RE-REVIEW: [DELIVERABLE]

**Original Review:** [date]
**Original Issues:** [N]
**Re-Review Date:** [date]

### Issue Resolution Check
| Original Issue | Fixed? | Evidence |
|----------------|--------|----------|
| I1: [description] | ☐ YES / ☐ NO | [evidence] |
| I2: [description] | ☐ YES / ☐ NO | [evidence] |

### New Issues Found
[List any new issues introduced by fixes, or "None"]

### Re-Review Verdict
☐ QUALITY APPROVED - All issues resolved
☐ QUALITY FAILED - [N] issues remain
```

## 9.2 Example 2: Database Module - FAILED

### Scenario
Quality review of material-lookup.js reveals blocking issues.

### Phase 2: Code Style Review
```
Naming: ✅ PASS
Formatting: ⚠️ REC - Inconsistent spacing
Comments: ❌ ISSUE - No file header at all

Finding I1:
- Category: Documentation (borderline - made ISSUE due to no header at all)
- Actually reclassified as REC after consideration
```

### Phase 3: Pattern Compliance
```
Abstraction Barriers: ❌ ISSUE - Consumers directly access _cache

Finding I1:
- Category: Architecture
- Location: consumer.js:34
- Problem: Uses materialLookup._cache directly
- Impact: Will break when cache implementation changes
- Fix: Use materialLookup.getCached(id) interface method
```

### Phase 4: API & Contract Review
```
Type Safety: ✅ PASS
Response Wrapper: ✅ PASS
Error Handling: ✅ PASS
Validation: ❌ ISSUE - No input validation on getMaterial()

Finding I2:
- Category: Security/Stability
- Location: material-lookup.js:25
- Problem: getMaterial(id) doesn't validate id parameter
- Impact: Could crash on null, execute with undefined
- Fix: Add if (!id || typeof id !== 'string') throw...
```

### Phase 5: 10 Commandments
```
#1 Use Everywhere: ✅ PASS - 12 consumers
#3 Verify Triple: ❌ ISSUE - Only output validation, no input

Finding I3:
- Category: Commandment #3
- Problem: Missing input validation layer
- Fix: Add input validation to all public methods

#7 Graceful: ❌ ISSUE - No fallback when database unavailable

Finding I4:
- Category: Commandment #7
- Location: material-lookup.js:40
- Problem: Database failure causes crash
- Fix: Add try/catch with fallback to cached data or default
```

### Phase 6: Verdict

| Phase | Issues | Recommendations |
|-------|--------|-----------------|
| Code Style | 0 | 1 |
| Pattern Compliance | 1 | 0 |
| API/Contracts | 1 | 0 |
| 10 Commandments | 2 | 0 |
| **TOTAL** | **4** | **1** |

**VERDICT: ❌ QUALITY FAILED**

### Issues to Fix

| ID | Category | Fix Required |
|----|----------|--------------|
| I1 | Architecture | Use interface, not _cache directly |
| I2 | Validation | Add input validation to getMaterial() |
| I3 | Commandment #3 | Add input validation layer |
| I4 | Commandment #7 | Add error handling with fallback |

**Fix Order:**
1. I2 + I3 (related - add input validation)
2. I4 (add error handling)
3. I1 (fix consumer to use interface)

**Next:** Fix issues, then re-run quality review.

# SECTION 10: INTEGRATION

## 10.1 Skill Metadata

```yaml
skill_id: prism-sp-review-quality
version: 1.0.0
category: development-core
priority: CRITICAL

triggers:
  keywords:
    - "review quality"
    - "code review"
    - "quality check"
    - "check patterns"
    - "check style"
    - "did we build it right"
    - "is the code good"
  contexts:
    - After prism-sp-review-spec APPROVED
    - Before prism-sp-debugging or prism-sp-verification
    - When questioning code quality

activation_rule: |
  IF (spec review APPROVED)
  AND (quality review not yet done)
  THEN activate prism-sp-review-quality

prerequisite:
  skill: prism-sp-review-spec
  status: APPROVED

requires:
  - Approved spec review from prism-sp-review-spec
  - Code/content to review accessible
  - Knowledge base skills available

outputs:
  - Quality review report with findings
  - Each finding classified as ISSUE or RECOMMENDATION
  - Pass/fail verdict

next_skills:
  on_approved: prism-sp-verification OR prism-sp-debugging
  on_failed: fix issues, then re-review
```

## 10.2 Knowledge Base Dependencies

This skill references and integrates:

| Skill | Purpose | Sections Used |
|-------|---------|---------------|
| **prism-coding-patterns** | MIT-based coding patterns | All (§1.1-1.3 patterns, SOLID) |
| **prism-api-contracts** | Interface standards, types | All (types, wrappers, validation) |
| **prism-knowledge-base** | Course references | 6.001, 6.005, 6.046J |
| **prism-quality-gates** | Gate criteria | Extraction, migration gates |

**Before running quality review:** Ensure these skills are loaded/referenced for complete standards coverage.

## 10.3 Handoff Protocols

### Receiving Handoff from SP.1.4 (Spec Review)

**Expected Input:**
```json
{
  "from": "prism-sp-review-spec",
  "status": "SPEC_APPROVED",
  "checksTotal": 15,
  "checksPassed": 15,
  "deliverables": ["path/to/file.js"],
  "timestamp": "2026-01-24T08:00:00Z"
}
```

**Activation Checklist:**
- [ ] Spec review status is APPROVED
- [ ] Deliverable paths accessible
- [ ] Knowledge base skills available
- [ ] Ready to begin quality review

### Handoff to SP.1.7 (Verification) - On Approved

**Output:**
```json
{
  "from": "prism-sp-review-quality",
  "status": "QUALITY_APPROVED",
  "issues": 0,
  "recommendations": 4,
  "recommendationList": ["R1", "R2", "R3", "R4"],
  "deliverables": ["path/to/file.js"],
  "knowledgeBaseApplied": ["prism-coding-patterns", "prism-api-contracts"],
  "timestamp": "2026-01-24T08:30:00Z"
}
```

**Message:**
> Quality review PASSED. 0 issues, 4 recommendations logged.
> Code meets PRISM quality standards.
> Proceeding to verification (SP.1.7).

### Handoff to SP.1.6 (Debugging) - If Testing Needed

**Output:**
```json
{
  "from": "prism-sp-review-quality",
  "status": "QUALITY_APPROVED",
  "issues": 0,
  "recommendations": 2,
  "needsDebugging": true,
  "debuggingReason": "Complex logic needs runtime verification",
  "timestamp": "2026-01-24T08:30:00Z"
}
```

### Handoff Back for Fixes - On Failed

**Output:**
```json
{
  "from": "prism-sp-review-quality",
  "status": "QUALITY_FAILED",
  "issues": 3,
  "issueList": [
    {"id": "I1", "category": "Architecture", "location": "file.js:34", "fix": "Use interface"},
    {"id": "I2", "category": "Validation", "location": "file.js:25", "fix": "Add validation"},
    {"id": "I3", "category": "Commandment #7", "location": "file.js:40", "fix": "Add fallback"}
  ],
  "recommendations": 1,
  "timestamp": "2026-01-24T08:30:00Z"
}
```

**Message:**
> Quality review FAILED. 3 issues must be fixed.
> Fix all issues, then re-run quality review.
> Cannot proceed until issues resolved.

## 10.4 Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                     PRISM-SP-REVIEW-QUALITY QUICK REFERENCE                             │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  PREREQUISITE: Spec review (SP.1.4) must be APPROVED                                    │
│                                                                                         │
│  QUESTION: "Did we build it RIGHT?" (quality, not spec compliance)                      │
│                                                                                         │
│  6 PHASES:                                                                              │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                                       │
│  │LOAD │→│STYLE│→│PATT │→│ API │→│ 10  │→│VERD │                                       │
│  │STDS │ │     │ │     │ │     │ │CMD  │ │ICT  │                                       │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘                                       │
│                                                                                         │
│  FINDING TYPES:                                                                         │
│  • ISSUE - Blocking, must fix (security, stability, architecture, #1,3,7,8)             │
│  • RECOMMENDATION - Non-blocking, should fix (style, optimization, #2,4,5,6,9,10)       │
│                                                                                         │
│  VERDICT:                                                                               │
│  • 0 Issues → APPROVED → SP.1.6 or SP.1.7                                               │
│  • 1+ Issues → FAILED → Fix, then re-review                                             │
│                                                                                         │
│  KNOWLEDGE BASE:                                                                        │
│  • prism-coding-patterns (MIT 6.001, 6.005)                                             │
│  • prism-api-contracts (types, wrappers)                                                │
│  • prism-knowledge-base (220+ courses)                                                  │
│                                                                                         │
│  BLOCKING COMMANDMENTS: #1, #3, #7, #8                                                  │
│  NON-BLOCKING: #2, #4, #5, #6, #9, #10                                                  │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

# DOCUMENT END

**Skill:** prism-sp-review-quality
**Version:** 1.0
**Total Sections:** 10 + 1 Appendix
**Part of:** SP.1 Core Development Workflow (SP.1.5 of 8)
**Created:** Session SP.1.5
**Status:** COMPLETE

**Knowledge Base Integration:**
- prism-coding-patterns (MIT 6.001, 6.005, 6.046J)
- prism-api-contracts (6,114 lines of interface standards)
- prism-knowledge-base (220+ MIT/Stanford courses)
- prism-quality-gates (gate criteria)

---
