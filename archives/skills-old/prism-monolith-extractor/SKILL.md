---
name: prism-monolith-extractor
description: |
  Protocols for safely extracting code/data from the v8.89 monolith.
  Use when: Extracting modules, databases, algorithms from legacy codebase.
  Provides: Step-by-step extraction protocols, isolation patterns,
  dependency handling, validation checklists, rollback procedures.
  Key principle: Extract safely, validate thoroughly, never lose data.
  Part of SP.2 Monolith Navigation.
---

# PRISM-MONOLITH-EXTRACTOR
## Safe Extraction Protocols for v8.89 Monolith
### Version 1.0 | Monolith Navigation | ~35KB

---

# SECTION 1: OVERVIEW

## 1.1 Purpose

This skill provides **safe extraction protocols** for pulling code and data from the v8.89 monolith. Extraction is risky - this skill minimizes that risk.

**The Risks:**
- Missing dependencies (broken code)
- Incomplete data (missing records)
- Lost functionality (features that worked but don't after extraction)
- Circular dependencies (infinite loops)
- State corruption (partial extraction)

**This Skill Provides:**
- Step-by-step extraction protocols
- Safe isolation patterns
- Dependency tracing and handling
- Validation checklists
- Rollback procedures

## 1.2 The Extraction Mindset

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           THE EXTRACTION MINDSET                                        │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  ❌ WRONG APPROACH:                                                                     │
│  "I'll just copy the file"                                                              │
│  "It looks self-contained"                                                              │
│  "I'll fix dependencies later"                                                          │
│  "We can always go back"                                                                │
│                                                                                         │
│  ✅ RIGHT APPROACH:                                                                     │
│  "Trace ALL dependencies first"                                                         │
│  "Validate before AND after"                                                            │
│  "Extract complete units, not fragments"                                                │
│  "Document everything for rollback"                                                     │
│                                                                                         │
│  KEY INSIGHT:                                                                           │
│  ────────────                                                                           │
│  The monolith has 25+ years of hidden dependencies.                                     │
│  What looks simple is often deeply interconnected.                                      │
│  Safe extraction requires systematic protocols.                                         │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 1.3 The Cardinal Rule: TRACE → ISOLATE → VALIDATE → EXTRACT

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                         │
│  🔒🔒🔒 THE TIVE PROTOCOL 🔒🔒🔒                                                        │
│                                                                                         │
│  T - TRACE all dependencies (upstream and downstream)                                   │
│  I - ISOLATE the extraction unit (define boundaries)                                    │
│  V - VALIDATE completeness (nothing missing)                                            │
│  E - EXTRACT with documentation (enable rollback)                                       │
│                                                                                         │
│  NEVER skip a step. NEVER assume "it's simple."                                         │
│                                                                                         │
│  If you can't trace it → Don't extract it                                               │
│  If you can't isolate it → Don't extract it                                             │
│  If you can't validate it → Don't extract it                                            │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 1.4 When to Use This Skill

**Explicit Triggers:**
- "extract", "extraction", "pull out"
- "isolate", "separate", "remove from monolith"
- "migrate", "move to v9"
- "copy from legacy"

**Contextual Triggers:**
- After consulting prism-monolith-index
- When beginning Stage 1 extraction work
- When moving databases to new structure
- When isolating algorithms

## 1.5 Prerequisites

**Required Before Extraction:**
- [ ] Consulted prism-monolith-index (SP.2.1)
- [ ] Identified target module(s)
- [ ] Know extraction priority
- [ ] Have dependency graph available

**From Previous Skills:**
- Module location (from prism-monolith-index)
- Category classification
- Known dependencies

## 1.6 Outputs

**Primary Outputs:**
1. Extracted code/data
2. Dependency manifest
3. Validation report
4. Rollback documentation

**Extraction Package:**
```
extracted/
├── [module_name]/
│   ├── code/           ← Extracted code
│   ├── data/           ← Extracted data
│   ├── MANIFEST.md     ← What was extracted
│   ├── DEPENDENCIES.md ← All dependencies
│   ├── VALIDATION.md   ← Validation results
│   └── ROLLBACK.md     ← How to undo
```

## 1.7 Position in Workflow

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              SP.2 MONOLITH NAVIGATION                                   │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  SP.2.1              SP.2.2              SP.2.3                                         │
│  ┌────────┐         ┌────────┐         ┌────────┐                                       │
│  │ INDEX  │────────▶│EXTRACT │────────▶│NAVIGATE│                                       │
│  │        │         │        │         │        │                                       │
│  └────────┘         └────────┘         └────────┘                                       │
│  Where is it?       How to safely      Find specific                                    │
│                     extract?           things fast                                      │
│                     ▲                                                                   │
│                     │                                                                   │
│                     └── THIS SKILL                                                      │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 1.8 Extraction Categories

| Category | Complexity | Typical Size | Example |
|----------|------------|--------------|---------|
| **Data** | LOW | 1-5 files | Material properties |
| **Database** | MEDIUM | 5-20 files | Full materials DB |
| **Algorithm** | MEDIUM-HIGH | 3-10 files | Cutting force engine |
| **Subsystem** | HIGH | 20-50 files | Full optimization suite |
| **Module Group** | VERY HIGH | 50+ files | All CAM modules |

---

# SECTION 2: EXTRACTION PROTOCOLS

## 2.1 Overview

Extraction follows a strict protocol to ensure safety and completeness. Different extraction types have different protocols.

## 2.2 The TIVE Protocol (All Extractions)

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           TIVE EXTRACTION PROTOCOL                                      │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │ STEP 1: TRACE                                                                   │   │
│  │ Identify ALL dependencies - upstream and downstream                             │   │
│  │ • What does this module import?                                                 │   │
│  │ • What imports this module?                                                     │   │
│  │ • What data does it read?                                                       │   │
│  │ • What data does it write?                                                      │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                           │                                             │
│                                           ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │ STEP 2: ISOLATE                                                                 │   │
│  │ Define clear boundaries for what to extract                                     │   │
│  │ • Mark extraction boundary                                                      │   │
│  │ • Identify interface points                                                     │   │
│  │ • Document external dependencies                                                │   │
│  │ • Create stub interfaces if needed                                              │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                           │                                             │
│                                           ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │ STEP 3: VALIDATE                                                                │   │
│  │ Verify extraction unit is complete                                              │   │
│  │ • All imports resolvable?                                                       │   │
│  │ • All data available?                                                           │   │
│  │ • All functions present?                                                        │   │
│  │ • Test cases pass?                                                              │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                           │                                             │
│                                           ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │ STEP 4: EXTRACT                                                                 │   │
│  │ Perform the extraction with full documentation                                  │   │
│  │ • Copy files to new location                                                    │   │
│  │ • Create extraction manifest                                                    │   │
│  │ • Document all modifications                                                    │   │
│  │ • Create rollback instructions                                                  │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 2.3 Protocol: Data Extraction (LOW Complexity)

**Use for:** Single data files, property lists, constants

### Steps

```markdown
## DATA EXTRACTION PROTOCOL

### 1. TRACE
☐ Identify source file(s)
☐ Check for dynamic data sources
☐ Verify data format (JSON, JS object, etc.)
☐ Note any computed/derived values

### 2. ISOLATE
☐ Define data boundaries
☐ Separate data from code (if mixed)
☐ Identify any embedded logic
☐ Note data validation rules

### 3. VALIDATE
☐ Count records (expected vs actual)
☐ Verify data types
☐ Check for null/undefined values
☐ Validate relationships/references

### 4. EXTRACT
☐ Copy data to new location
☐ Convert format if needed
☐ Create data manifest
☐ Document schema
```

### Example: Extracting Kienzle Coefficients

```markdown
## EXTRACTION: kienzle_coefficients.js

### TRACE
- Source: /src/data/materials/props/kienzle_coefficients.js
- Imports: None (pure data)
- Imported by: cutting_force_engine.js, 12 others
- Data format: JavaScript object

### ISOLATE
- Boundary: Single file, 2,500 lines
- Contains: 350 material-coefficient pairs
- No embedded logic (pure data)
- Dependencies: None

### VALIDATE
- Expected records: 350 materials
- Actual records: 350 ✓
- All required fields present ✓
- No null values ✓

### EXTRACT
- Copied to: /v9/databases/materials/kienzle.json
- Format converted: JS → JSON
- Manifest created ✓
- Schema documented ✓
```

## 2.4 Protocol: Database Extraction (MEDIUM Complexity)

**Use for:** Complete databases (materials, machines, tools)

### Steps

```markdown
## DATABASE EXTRACTION PROTOCOL

### 1. TRACE
☐ Identify all database files
☐ Map relationships between files
☐ Find all consumers (who uses this?)
☐ Identify lookup functions
☐ Note any caching mechanisms

### 2. ISOLATE
☐ Define database boundary
☐ List all tables/collections
☐ Document relationships
☐ Identify shared utilities
☐ Note external dependencies

### 3. VALIDATE
☐ Count all records per table
☐ Verify referential integrity
☐ Check for orphan records
☐ Validate required fields
☐ Test lookup functions

### 4. EXTRACT
☐ Extract all tables/files
☐ Extract relationships
☐ Extract lookup functions
☐ Convert to target format
☐ Create comprehensive manifest
☐ Document complete schema
```

### Database Extraction Checklist

```markdown
## DATABASE EXTRACTION CHECKLIST

**Database:** [name]
**Files:** [count]
**Records:** [count]

### Files Extracted
| File | Records | Size | Status |
|------|---------|------|--------|
| [file1] | [n] | [kb] | ☐ |
| [file2] | [n] | [kb] | ☐ |

### Relationships Verified
| From | To | Type | Status |
|------|----|----- |--------|
| [table1] | [table2] | [1:N] | ☐ |

### Consumers Updated
| Consumer | Update Type | Status |
|----------|-------------|--------|
| [module1] | [import path] | ☐ |

### Validation
☐ All files extracted
☐ Record counts match
☐ Relationships intact
☐ Lookups functional
☐ No orphan records
```

## 2.5 Protocol: Algorithm Extraction (MEDIUM-HIGH Complexity)

**Use for:** Calculation engines, physics models, optimization algorithms

### Steps

```markdown
## ALGORITHM EXTRACTION PROTOCOL

### 1. TRACE
☐ Identify core algorithm file(s)
☐ Map ALL imports (recursive)
☐ Identify data dependencies
☐ Find all callers
☐ Note configuration options
☐ Identify test cases

### 2. ISOLATE
☐ Define algorithm boundary
☐ List all helper functions
☐ Identify shared utilities
☐ Document input/output contracts
☐ Create interface definitions
☐ Handle circular dependencies

### 3. VALIDATE
☐ Unit tests pass
☐ Integration tests pass
☐ Edge cases handled
☐ Performance acceptable
☐ Outputs match expected values
☐ No missing dependencies

### 4. EXTRACT
☐ Extract core algorithm
☐ Extract required helpers
☐ Extract or stub utilities
☐ Extract test cases
☐ Document all interfaces
☐ Create usage examples
```

### Algorithm Extraction Template

```markdown
## EXTRACTION: [Algorithm Name]

### Core Files
| File | Lines | Purpose |
|------|-------|---------|
| [main.js] | [n] | Main algorithm |
| [helper1.js] | [n] | Helper function |

### Dependencies
| Dependency | Type | Action |
|------------|------|--------|
| [module1] | Required | Extract |
| [module2] | Optional | Stub |
| [module3] | Utility | Reference |

### Interfaces
**Input:**
```typescript
interface AlgorithmInput {
  // Document all inputs
}
```

**Output:**
```typescript
interface AlgorithmOutput {
  // Document all outputs
}
```

### Test Cases
| Test | Input | Expected | Status |
|------|-------|----------|--------|
| [test1] | [input] | [output] | ☐ |
```

## 2.6 Protocol: Subsystem Extraction (HIGH Complexity)

**Use for:** Multiple related modules, complete functional areas

### Steps

```markdown
## SUBSYSTEM EXTRACTION PROTOCOL

### 1. TRACE (Extended)
☐ Map entire subsystem
☐ Identify all modules
☐ Create full dependency graph
☐ Find all external interfaces
☐ Identify shared state
☐ Note initialization order

### 2. ISOLATE (Extended)
☐ Define subsystem boundary
☐ Create interface layer
☐ Abstract external dependencies
☐ Handle shared resources
☐ Plan migration path

### 3. VALIDATE (Extended)
☐ All modules accounted for
☐ Dependency graph complete
☐ Interfaces fully defined
☐ Integration tests pass
☐ Performance benchmarked

### 4. EXTRACT (Phased)
☐ Phase 1: Core modules
☐ Phase 2: Supporting modules
☐ Phase 3: Integration layer
☐ Phase 4: Tests and docs
☐ Create full manifest
☐ Document migration path
```

## 2.7 Protocol Quick Reference

| Extraction Type | Steps | Validation | Risk |
|-----------------|-------|------------|------|
| Data | TIVE basic | Count, types | LOW |
| Database | TIVE + relations | Integrity, lookups | MEDIUM |
| Algorithm | TIVE + tests | Unit tests, outputs | MEDIUM-HIGH |
| Subsystem | TIVE phased | Integration tests | HIGH |

---

# SECTION 3: SAFE ISOLATION PATTERNS

## 3.1 Overview

Isolation is the art of drawing boundaries around code to extract. Poor isolation leads to broken dependencies and incomplete extractions.

## 3.2 Isolation Patterns

### Pattern 1: Clean Cut

**Use when:** Module has minimal external dependencies

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           CLEAN CUT PATTERN                                             │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  BEFORE                                    AFTER                                        │
│  ──────                                    ─────                                        │
│                                                                                         │
│  ┌─────────────────────┐                  ┌─────────────────────┐                      │
│  │     MONOLITH        │                  │     MONOLITH        │                      │
│  │  ┌───────────────┐  │                  │                     │                      │
│  │  │   MODULE A    │  │      ───▶        │  (Module A removed) │                      │
│  │  │   (extract)   │  │                  │                     │                      │
│  │  └───────────────┘  │                  └─────────────────────┘                      │
│  └─────────────────────┘                                                               │
│                                            ┌───────────────┐                           │
│                                            │   MODULE A    │                           │
│                                            │ (standalone)  │                           │
│                                            └───────────────┘                           │
│                                                                                         │
│  WHEN TO USE:                                                                           │
│  • Pure data files                                                                      │
│  • Self-contained utilities                                                             │
│  • Modules with only outbound dependencies                                              │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### Pattern 2: Interface Extraction

**Use when:** Module has both importers and exports

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           INTERFACE EXTRACTION PATTERN                                  │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  BEFORE                                    AFTER                                        │
│  ──────                                    ─────                                        │
│                                                                                         │
│  ┌─────────────────────┐                  ┌─────────────────────┐                      │
│  │     MONOLITH        │                  │     MONOLITH        │                      │
│  │                     │                  │  ┌───────────────┐  │                      │
│  │  B ──▶ A ──▶ C      │      ───▶        │  │   INTERFACE   │  │                      │
│  │                     │                  │  │   (adapter)   │  │                      │
│  └─────────────────────┘                  │  └───────┬───────┘  │                      │
│                                           │          │          │                      │
│                                           └──────────│──────────┘                      │
│                                                      │                                 │
│                                           ┌──────────▼──────────┐                      │
│                                           │      MODULE A       │                      │
│                                           │    (extracted)      │                      │
│                                           └─────────────────────┘                      │
│                                                                                         │
│  STEPS:                                                                                 │
│  1. Extract module A                                                                    │
│  2. Create interface/adapter in monolith                                                │
│  3. Interface calls extracted module                                                    │
│  4. B and C continue using interface                                                    │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### Pattern 3: Dependency Bundle

**Use when:** Module has required dependencies that must come along

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           DEPENDENCY BUNDLE PATTERN                                     │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  BEFORE                                    AFTER                                        │
│  ──────                                    ─────                                        │
│                                                                                         │
│  ┌─────────────────────┐                  ┌─────────────────────┐                      │
│  │     MONOLITH        │                  │     MONOLITH        │                      │
│  │  ┌───┐              │                  │                     │                      │
│  │  │ A │──▶ D1        │      ───▶        │  (A, D1, D2 removed)│                      │
│  │  │   │──▶ D2        │                  │                     │                      │
│  │  └───┘              │                  └─────────────────────┘                      │
│  └─────────────────────┘                                                               │
│                                            ┌─────────────────────┐                     │
│                                            │      BUNDLE         │                     │
│                                            │  ┌───┐              │                     │
│                                            │  │ A │──▶ D1        │                     │
│                                            │  │   │──▶ D2        │                     │
│                                            │  └───┘              │                     │
│                                            └─────────────────────┘                     │
│                                                                                         │
│  WHEN TO USE:                                                                           │
│  • Module needs specific dependencies                                                   │
│  • Dependencies are not shared elsewhere                                                │
│  • Clean bundle boundary exists                                                         │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### Pattern 4: Stub Replacement

**Use when:** Module has dependencies that shouldn't be extracted

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           STUB REPLACEMENT PATTERN                                      │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  BEFORE                                    AFTER                                        │
│  ──────                                    ─────                                        │
│                                                                                         │
│  ┌─────────────────────┐                  ┌─────────────────────┐                      │
│  │     MONOLITH        │                  │   EXTRACTED MODULE  │                      │
│  │  ┌───┐              │                  │  ┌───┐              │                      │
│  │  │ A │──▶ Legacy    │      ───▶        │  │ A │──▶ Stub      │                      │
│  │  │   │              │                  │  │   │              │                      │
│  │  └───┘              │                  │  └───┘              │                      │
│  └─────────────────────┘                  └─────────────────────┘                      │
│                                                                                         │
│  STUB TYPES:                                                                            │
│  • Mock: Returns fake data for testing                                                  │
│  • Adapter: Calls new implementation                                                    │
│  • Bridge: Temporarily calls back to monolith                                           │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 3.3 Isolation Boundary Definition

### Template: Defining Boundaries

```markdown
## ISOLATION BOUNDARY: [Module Name]

### Inside Boundary (EXTRACT)
| Item | Type | Size | Notes |
|------|------|------|-------|
| [file1] | Code | [kb] | Main module |
| [file2] | Data | [kb] | Required data |
| [file3] | Helper | [kb] | Required helper |

### Outside Boundary (LEAVE/STUB)
| Item | Type | Action | Reason |
|------|------|--------|--------|
| [dep1] | Utility | Stub | Shared with others |
| [dep2] | Legacy | Bridge | Being phased out |
| [dep3] | Core | Leave | Framework code |

### Interface Points
| Point | Direction | Data Type |
|-------|-----------|-----------|
| [func1] | IN | [type] |
| [func2] | OUT | [type] |

### Boundary Validation
☐ All required code inside boundary
☐ All stubs defined for external deps
☐ Interface points documented
☐ No circular dependencies across boundary
```

## 3.4 Handling Common Isolation Challenges

### Challenge 1: Shared Utilities

**Problem:** Module uses utility functions shared across monolith

**Solutions:**
| Approach | When to Use | Pros | Cons |
|----------|-------------|------|------|
| Copy utility | Small, stable | Simple | Duplication |
| Reference v9 utils | v9 has equivalent | Clean | Dependency on v9 |
| Create minimal stub | Utility complex | Isolated | Extra code |
| Extract utility too | Many users | Complete | Larger scope |

### Challenge 2: Global State

**Problem:** Module reads/writes global state

**Solutions:**
| Approach | When to Use |
|----------|-------------|
| Pass state as parameter | Pure functions possible |
| Create state interface | State is simple |
| Extract state management | State is complex |
| Document and defer | v9 will handle differently |

### Challenge 3: Circular Dependencies

**Problem:** A imports B, B imports A

**Solutions:**
| Approach | When to Use |
|----------|-------------|
| Extract both together | Tightly coupled |
| Create shared interface | Can be decoupled |
| Break cycle with events | Loose coupling OK |
| Refactor before extract | Time available |

## 3.5 Isolation Checklist

```markdown
## ISOLATION CHECKLIST

### Boundary Definition
☐ All files inside boundary identified
☐ All files outside boundary identified
☐ Interface points documented
☐ Stub requirements defined

### Dependency Analysis
☐ No missing dependencies
☐ No unnecessary dependencies
☐ Circular dependencies handled
☐ Shared utilities addressed

### Interface Contracts
☐ All inputs documented
☐ All outputs documented
☐ Error conditions defined
☐ Edge cases covered

### Validation
☐ Extracted code compiles
☐ Tests pass in isolation
☐ No runtime dependency errors
☐ Performance acceptable

**Isolation Ready:** ☐ YES / ☐ NO (blocking: ___)
```

---

# SECTION 4: DEPENDENCY HANDLING

## 4.1 Overview

Dependencies are the #1 cause of failed extractions. This section covers systematic dependency handling.

## 4.2 Dependency Types

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           DEPENDENCY TYPES                                              │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  TYPE 1: IMPORT DEPENDENCIES                                                            │
│  ────────────────────────────                                                           │
│  What this module imports from elsewhere.                                               │
│  Example: import { utils } from './helpers'                                             │
│                                                                                         │
│  TYPE 2: EXPORT DEPENDENCIES                                                            │
│  ────────────────────────────                                                           │
│  What other modules import from this one.                                               │
│  Example: cutting_force_engine is imported by 45 modules                                │
│                                                                                         │
│  TYPE 3: DATA DEPENDENCIES                                                              │
│  ────────────────────────────                                                           │
│  What data this module needs to function.                                               │
│  Example: needs materials_database at runtime                                           │
│                                                                                         │
│  TYPE 4: RUNTIME DEPENDENCIES                                                           │
│  ────────────────────────────                                                           │
│  What must exist at runtime (not import time).                                          │
│  Example: expects global config object                                                  │
│                                                                                         │
│  TYPE 5: TRANSITIVE DEPENDENCIES                                                        │
│  ────────────────────────────                                                           │
│  Dependencies of dependencies.                                                          │
│  Example: A imports B, B imports C → A transitively depends on C                        │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 4.3 Dependency Tracing Process

### Step 1: Direct Import Analysis

```bash
# Find all imports in a file
grep -E "^import|^const.*require|^from" module.js

# Find all exports
grep -E "^export|module.exports" module.js
```

### Step 2: Build Dependency Tree

```markdown
## DEPENDENCY TREE: cutting_force_engine.js

### Level 0 (Target Module)
- cutting_force_engine.js

### Level 1 (Direct Imports)
├── materials_database.js
├── kienzle_coefficients.js
├── tool_database.js
├── math_utils.js
└── config.js

### Level 2 (Transitive)
├── materials_database.js
│   ├── material_properties.js
│   └── unit_converter.js
├── kienzle_coefficients.js
│   └── (none)
├── tool_database.js
│   ├── tool_properties.js
│   └── unit_converter.js [SHARED]
├── math_utils.js
│   └── (none)
└── config.js
    └── (none)
```

### Step 3: Identify Critical Path

```markdown
## CRITICAL DEPENDENCIES

### Must Extract (Required for function)
| Dependency | Reason | Size |
|------------|--------|------|
| kienzle_coefficients.js | Core calculation data | 2.5KB |
| math_utils.js | Mathematical operations | 1.2KB |

### Should Extract (Recommended)
| Dependency | Reason | Size |
|------------|--------|------|
| materials_database.js | Runtime data source | 8.5KB |

### Can Stub (Optional)
| Dependency | Stub Type | Reason |
|------------|-----------|--------|
| config.js | Default values | Simple config |
| unit_converter.js | Reference v9 utils | Already in v9 |
```

## 4.4 Dependency Handling Strategies

### Strategy 1: Extract Together

**When:** Dependencies are closely coupled, both needed in v9

```markdown
DECISION: Extract kienzle_coefficients.js WITH cutting_force_engine.js

Rationale:
- Always used together
- No other consumers outside extraction scope
- Both needed in v9
- Clean extraction boundary
```

### Strategy 2: Create Adapter

**When:** Dependency is in v9, need to connect

```javascript
// adapter_materials_db.js
// Bridges legacy code to v9 materials database

import { getMaterial } from '@prism-v9/materials';

// Legacy interface
export function getMaterialProperties(materialId) {
  // Call v9 implementation
  const material = getMaterial(materialId);
  
  // Transform to legacy format if needed
  return {
    kc11: material.kienzle.kc11,
    mc: material.kienzle.mc,
    // ... map other properties
  };
}
```

### Strategy 3: Create Stub

**When:** Dependency not needed for core function, testing only

```javascript
// stub_config.js
// Stub for config during extraction testing

export const config = {
  defaultUnits: 'metric',
  precision: 4,
  debug: false,
  // Minimal defaults for testing
};
```

### Strategy 4: Inline Small Dependencies

**When:** Dependency is small, only used here

```javascript
// BEFORE: import { clamp } from './math_utils'

// AFTER: Inline the function
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
```

## 4.5 Dependency Decision Matrix

| Dependency Size | Used Elsewhere? | In v9 Scope? | Strategy |
|-----------------|-----------------|--------------|----------|
| Small (<100 lines) | No | Yes | Inline or Extract |
| Small (<100 lines) | No | No | Inline |
| Small (<100 lines) | Yes | Yes | Extract |
| Small (<100 lines) | Yes | No | Stub |
| Medium (100-500) | No | Yes | Extract |
| Medium (100-500) | No | No | Stub |
| Medium (100-500) | Yes | Yes | Extract |
| Medium (100-500) | Yes | No | Adapter |
| Large (>500) | Any | Yes | Extract |
| Large (>500) | Any | No | Adapter/Bridge |

## 4.6 Dependency Documentation Template

```markdown
## DEPENDENCY MANIFEST: [Module Name]

### Summary
- Total dependencies: [N]
- Extract: [N]
- Stub: [N]
- Adapter: [N]
- Inline: [N]

### Detailed Dependency List

| # | Dependency | Type | Lines | Strategy | Status |
|---|------------|------|-------|----------|--------|
| 1 | [name] | Import | [n] | Extract | ☐ |
| 2 | [name] | Import | [n] | Stub | ☐ |
| 3 | [name] | Data | [n] | Adapter | ☐ |
| 4 | [name] | Runtime | [n] | Inline | ☐ |

### Stub Definitions
```javascript
// [stub_name].js
// Purpose: [why this stub exists]
export const stubFunction = () => { /* ... */ };
```

### Adapter Definitions
```javascript
// [adapter_name].js
// Purpose: [what this adapts]
// Maps: [legacy interface] → [v9 interface]
```

### Validation
☐ All dependencies accounted for
☐ Strategies assigned to all
☐ Stubs implemented
☐ Adapters implemented
☐ No missing dependencies at runtime
```

## 4.7 Common Dependency Pitfalls

| Pitfall | Symptom | Solution |
|---------|---------|----------|
| **Missing transitive** | Runtime error on nested call | Trace to depth 3+ |
| **Circular dependency** | Stack overflow or undefined | Extract both or break cycle |
| **Hidden global** | Undefined variable at runtime | Search for global usage |
| **Dynamic import** | Module not found at runtime | Search for dynamic requires |
| **Config dependency** | Wrong defaults or missing | Create config stub |
| **Side effect on import** | Unexpected behavior | Document and handle |

---

# SECTION 5: VALIDATION CHECKLISTS

## 5.1 Overview

Validation happens at multiple stages: before extraction, during extraction, and after extraction. Each stage has specific checks.

## 5.2 Pre-Extraction Validation

```markdown
## PRE-EXTRACTION VALIDATION CHECKLIST

### Module Identification
☐ Target module(s) identified
☐ Module exists in monolith-index
☐ Module path verified
☐ Module size/lines known

### Dependency Analysis Complete
☐ All imports traced
☐ All exports identified
☐ Transitive dependencies mapped
☐ Circular dependencies checked
☐ Data dependencies identified
☐ Runtime dependencies identified

### Extraction Plan Ready
☐ Extraction type determined (data/db/algo/subsystem)
☐ Isolation pattern selected
☐ Boundary defined
☐ Stub requirements documented
☐ Adapter requirements documented

### Resources Available
☐ Source code accessible
☐ Target location prepared
☐ Backup taken
☐ Rollback plan documented

**PRE-EXTRACTION READY:** ☐ YES / ☐ NO (blocking: ___)
```

## 5.3 During-Extraction Validation

```markdown
## DURING-EXTRACTION VALIDATION CHECKLIST

### File Copy Verification
☐ All files copied
☐ File sizes match
☐ No truncation
☐ Line counts preserved

### Dependency Resolution
☐ All imports resolvable
☐ No missing modules
☐ Stubs in place
☐ Adapters functional

### Syntax Validation
☐ No syntax errors
☐ No undefined references
☐ No circular import errors
☐ Linting passes

### Basic Function Check
☐ Module loads without error
☐ Exports accessible
☐ Basic call succeeds
☐ No runtime crashes

**EXTRACTION PROCEEDING:** ☐ YES / ☐ NO (blocking: ___)
```

## 5.4 Post-Extraction Validation

```markdown
## POST-EXTRACTION VALIDATION CHECKLIST

### Completeness Verification
☐ All planned files extracted
☐ All data records present
☐ No missing functions
☐ No missing exports

### Count Verification
| Item | Expected | Actual | Match |
|------|----------|--------|-------|
| Files | [n] | [n] | ☐ |
| Functions | [n] | [n] | ☐ |
| Records | [n] | [n] | ☐ |
| Lines | [n] | [n] | ☐ |

### Functional Verification
☐ Unit tests pass
☐ Integration tests pass
☐ Edge cases handled
☐ Error handling works

### Data Integrity
☐ All records valid
☐ Relationships intact
☐ No orphan references
☐ Lookups return correct data

### Performance Verification
☐ Load time acceptable
☐ Execution time acceptable
☐ Memory usage acceptable
☐ No performance regression

### Documentation Complete
☐ Manifest created
☐ Dependencies documented
☐ Interfaces documented
☐ Rollback documented

**POST-EXTRACTION COMPLETE:** ☐ YES / ☐ NO (issues: ___)
```

## 5.5 Data Validation Templates

### Template: Record Count Validation

```markdown
## RECORD COUNT VALIDATION: [Database Name]

### Expected Counts (from monolith)
| Table/File | Expected Records |
|------------|------------------|
| [table1] | [n] |
| [table2] | [n] |
| **TOTAL** | **[n]** |

### Actual Counts (extracted)
| Table/File | Actual Records | Match? |
|------------|----------------|--------|
| [table1] | [n] | ☐ |
| [table2] | [n] | ☐ |
| **TOTAL** | **[n]** | ☐ |

### Discrepancies
| Table | Expected | Actual | Difference | Reason |
|-------|----------|--------|------------|--------|
| [table] | [n] | [n] | [+/-n] | [explanation] |

### Resolution
☐ All counts match OR
☐ All discrepancies explained and acceptable
```

### Template: Data Integrity Validation

```markdown
## DATA INTEGRITY VALIDATION: [Database Name]

### Required Fields Check
| Table | Field | Required | % Present |
|-------|-------|----------|-----------|
| [table] | [field] | YES | [%] |

### Referential Integrity
| From Table | To Table | Relationship | Valid % |
|------------|----------|--------------|---------|
| [table1] | [table2] | [1:N] | [%] |

### Data Type Validation
| Table | Field | Expected Type | Violations |
|-------|-------|---------------|------------|
| [table] | [field] | [type] | [n] |

### Value Range Validation
| Table | Field | Valid Range | Violations |
|-------|-------|-------------|------------|
| [table] | [field] | [min-max] | [n] |

### Integrity Summary
☐ All required fields present
☐ All references valid
☐ All types correct
☐ All values in range
```

## 5.6 Algorithm Validation Templates

### Template: Algorithm Output Validation

```markdown
## ALGORITHM OUTPUT VALIDATION: [Algorithm Name]

### Test Cases
| # | Test Case | Input | Expected Output | Actual Output | Match |
|---|-----------|-------|-----------------|---------------|-------|
| 1 | [name] | [input] | [expected] | [actual] | ☐ |
| 2 | [name] | [input] | [expected] | [actual] | ☐ |
| 3 | [name] | [input] | [expected] | [actual] | ☐ |

### Edge Cases
| # | Edge Case | Input | Expected | Actual | Handled |
|---|-----------|-------|----------|--------|---------|
| 1 | Zero input | [0] | [expected] | [actual] | ☐ |
| 2 | Max value | [max] | [expected] | [actual] | ☐ |
| 3 | Invalid input | [invalid] | [error] | [actual] | ☐ |

### Regression Check
☐ All existing tests pass
☐ Output matches monolith version
☐ Performance within bounds
☐ No new errors introduced

### Validation Summary
- Tests passed: [n]/[total]
- Edge cases handled: [n]/[total]
- Regressions: [n]
```

## 5.7 Quick Validation Commands

### For JavaScript/TypeScript

```bash
# Syntax check
node --check extracted_module.js

# Find undefined references
grep -r "undefined" extracted/ | grep -v "node_modules"

# Find missing imports
grep -E "^import.*from" extracted/*.js | while read line; do
  # Verify each import path exists
  echo "Checking: $line"
done

# Run tests
npm test -- --testPathPattern="extracted"
```

### For Data Files (JSON)

```bash
# Validate JSON syntax
python -m json.tool extracted_data.json > /dev/null

# Count records
grep -c '"id":' extracted_data.json

# Check for required fields
jq 'map(select(.required_field == null)) | length' extracted_data.json
```

## 5.8 Validation Failure Handling

| Failure Type | Severity | Action |
|--------------|----------|--------|
| Missing file | CRITICAL | Abort, investigate |
| Count mismatch | HIGH | Investigate, may continue |
| Syntax error | CRITICAL | Fix before proceeding |
| Test failure | HIGH | Analyze and fix |
| Performance regression | MEDIUM | Document, may defer |
| Minor data issue | LOW | Document, continue |

---

# SECTION 6: ROLLBACK PROCEDURES

## 6.1 Overview

Every extraction must be reversible. This section covers rollback planning and execution.

## 6.2 Rollback Planning

### Before Extraction

```markdown
## ROLLBACK PLAN: [Extraction Name]

### Backup Locations
| Item | Original Location | Backup Location |
|------|-------------------|-----------------|
| Source files | [path] | [backup_path] |
| Data files | [path] | [backup_path] |
| Config files | [path] | [backup_path] |

### Rollback Steps
1. Stop v9 services using extracted module
2. Remove extracted files from v9
3. Restore backup files to original location
4. Restart monolith services
5. Verify monolith functions correctly

### Rollback Decision Criteria
☐ Critical bug in extracted code
☐ Missing functionality discovered
☐ Performance degradation unacceptable
☐ Integration failure with v9
☐ User-requested rollback

### Estimated Rollback Time: [minutes/hours]
```

## 6.3 Rollback Execution

### Step-by-Step Rollback

```markdown
## ROLLBACK EXECUTION: [Extraction Name]

### 1. Stop Affected Services
☐ Identify services using extracted code
☐ Stop services gracefully
☐ Verify services stopped

### 2. Remove Extracted Code
☐ Delete extracted files from v9
☐ Remove stubs/adapters from monolith
☐ Clear any caches

### 3. Restore Original
☐ Copy backup to original location
☐ Verify file integrity
☐ Verify file permissions

### 4. Restart Services
☐ Restart monolith services
☐ Verify monolith startup clean
☐ Run smoke tests

### 5. Verify Rollback
☐ Original functionality works
☐ No error logs
☐ Performance normal

**ROLLBACK COMPLETE:** ☐ YES / ☐ NO (issues: ___)
```

## 6.4 Rollback Documentation Template

```markdown
## ROLLBACK DOCUMENTATION: [Extraction Name]

### Extraction Info
- Extracted: [date]
- Version: [v9 version]
- Modules: [list]

### To Rollback:

**Step 1:** Stop services
```bash
# Commands to stop services
systemctl stop prism-v9
```

**Step 2:** Remove extracted files
```bash
# Commands to remove
rm -rf /v9/modules/extracted_module/
```

**Step 3:** Restore backup
```bash
# Commands to restore
cp -r /backups/[extraction_name]/* /monolith/src/
```

**Step 4:** Restart and verify
```bash
# Commands to restart
systemctl start prism-monolith
# Verify
curl http://localhost:8080/health
```

### Backup Manifest
| File | Backup Path | MD5 Hash |
|------|-------------|----------|
| [file1] | [path] | [hash] |
| [file2] | [path] | [hash] |
```

---

# SECTION 7: EXAMPLES

## 7.1 Example 1: Data Extraction (Kienzle Coefficients)

### Scenario
Extract Kienzle cutting force coefficients for v9 materials database.

### TRACE

```markdown
## DEPENDENCY TRACE: kienzle_coefficients.js

### Target
- File: /monolith/src/data/materials/props/kienzle_coefficients.js
- Size: 2,500 lines
- Records: 350 materials

### Imports (this file imports)
- None (pure data file)

### Exports (used by)
1. cutting_force_engine.js
2. power_calculator.js
3. optimization_engine.js
4. (12 more modules)

### Decision: Clean Cut pattern (no dependencies)
```

### ISOLATE

```markdown
## ISOLATION BOUNDARY

### Inside (Extract)
- kienzle_coefficients.js (2,500 lines)

### Outside (Leave)
- All consumers (they will use v9 import)

### Interface
- Export: getKienzleCoefficients(materialId)
- Return: { kc11, mc, kc_correction_factors }
```

### VALIDATE

```markdown
## VALIDATION

### Pre-Extraction
☑ File exists: /monolith/src/data/materials/props/kienzle_coefficients.js
☑ Record count: 350 materials
☑ No dependencies to trace

### During Extraction
☑ File copied: 2,500 lines
☑ JSON converted: valid syntax
☑ Records preserved: 350

### Post-Extraction
☑ Expected: 350 records
☑ Actual: 350 records
☑ All required fields present
☑ Sample lookups return correct values
```

### EXTRACT

```markdown
## EXTRACTION RESULT

### Source
/monolith/src/data/materials/props/kienzle_coefficients.js

### Target
/v9/databases/materials/kienzle-coefficients.json

### Transformation
- Format: JavaScript object → JSON
- Structure: Preserved
- Records: 350

### Manifest
- Extracted: 2026-01-24
- By: SP.2.2 Protocol
- Files: 1
- Records: 350
- Status: COMPLETE
```

---

## 7.2 Example 2: Algorithm Extraction (Cutting Force Engine)

### Scenario
Extract the cutting force calculation engine for v9.

### TRACE

```markdown
## DEPENDENCY TRACE: cutting_force_engine.js

### Target
- File: /monolith/src/algorithms/forces/cutting_force_engine.js
- Size: 6,500 lines

### Imports (Direct - Level 1)
1. materials_database.js → ADAPTER (v9 has materials)
2. kienzle_coefficients.js → ALREADY EXTRACTED
3. tool_database.js → ADAPTER (v9 has tools)
4. math_utils.js → INLINE (small)
5. config.js → STUB (defaults)

### Imports (Transitive - Level 2)
- materials_database imports unit_converter → REFERENCE V9
- tool_database imports tool_properties → EXTRACT

### Exports (Used by)
1. power_torque_engine.js (later extraction)
2. tool_life_engine.js (later extraction)
3. surface_finish_engine.js (later extraction)
4. optimization_engine.js (later extraction)

### Decision: Interface Extraction with adapters
```

### ISOLATE

```markdown
## ISOLATION BOUNDARY

### Inside (Extract)
| File | Lines | Action |
|------|-------|--------|
| cutting_force_engine.js | 6,500 | Extract |
| kienzle_model.js | 2,800 | Extract |
| chip_thickness_calc.js | 1,200 | Extract |
| math_utils (subset) | 200 | Inline |

### Outside (Stub/Adapter)
| File | Action |
|------|--------|
| materials_database.js | Adapter to v9 |
| tool_database.js | Adapter to v9 |
| config.js | Stub with defaults |

### Interface
```typescript
interface CuttingForceInput {
  material: MaterialId;
  tool: ToolId;
  doc: number;      // depth of cut (mm)
  feed: number;     // feed rate (mm/rev)
  speed: number;    // cutting speed (m/min)
}

interface CuttingForceOutput {
  Fc: number;       // main cutting force (N)
  Ff: number;       // feed force (N)
  Fp: number;       // passive force (N)
  power: number;    // cutting power (kW)
}
```
```

### VALIDATE

```markdown
## VALIDATION

### Test Cases
| # | Material | DOC | Feed | Speed | Expected Fc | Actual Fc | Match |
|---|----------|-----|------|-------|-------------|-----------|-------|
| 1 | AISI 4140 | 2.0 | 0.25 | 200 | 1,847 N | 1,847 N | ☑ |
| 2 | Ti-6Al-4V | 1.0 | 0.15 | 60 | 2,234 N | 2,234 N | ☑ |
| 3 | Al 6061 | 3.0 | 0.30 | 400 | 423 N | 423 N | ☑ |

### Edge Cases
| # | Case | Expected | Actual | ☑ |
|---|------|----------|--------|---|
| 1 | Zero DOC | 0 N | 0 N | ☑ |
| 2 | Max DOC | Error | Error | ☑ |
| 3 | Unknown material | Error | Error | ☑ |

### Regression: All 47 existing tests pass ☑
```

### EXTRACT

```markdown
## EXTRACTION RESULT

### Files Extracted
| File | Lines | Target Path |
|------|-------|-------------|
| cutting_force_engine.js | 6,500 | /v9/engines/cutting-force/ |
| kienzle_model.js | 2,800 | /v9/engines/cutting-force/ |
| chip_thickness_calc.js | 1,200 | /v9/engines/cutting-force/ |

### Adapters Created
| Adapter | Purpose |
|---------|---------|
| materials_adapter.js | Bridge to v9 materials |
| tools_adapter.js | Bridge to v9 tools |

### Stubs Created
| Stub | Purpose |
|------|---------|
| config_stub.js | Default configuration |

### Manifest
- Extracted: 2026-01-24
- Files: 6 (3 core + 2 adapters + 1 stub)
- Lines: 10,700
- Tests: 47 passing
- Status: COMPLETE
```

---

## 7.3 Example 3: Failed Extraction & Rollback

### Scenario
Attempted extraction of optimization_engine.js but discovered critical missing dependency.

### TRACE (Incomplete)

```markdown
## DEPENDENCY TRACE: optimization_engine.js

### Target
- File: /monolith/src/optimization/speed_feed_optimizer.js
- Size: 5,500 lines

### Imports (Direct)
1. cutting_force_engine.js → EXTRACTED ☑
2. tool_life_engine.js → NOT YET EXTRACTED ☐ ← PROBLEM
3. materials_database.js → ADAPTER
4. constraint_engine.js → NOT TRACED ← PROBLEM

### ISSUE DISCOVERED
tool_life_engine.js must be extracted BEFORE optimization_engine
constraint_engine.js has 15 sub-dependencies not traced
```

### FAILED VALIDATION

```markdown
## VALIDATION FAILURE

### Error
Runtime error: Cannot find module 'tool_life_engine'

### Root Cause
Extraction order violated. Tool life engine is a prerequisite.

### Decision: ABORT and ROLLBACK
```

### ROLLBACK EXECUTION

```markdown
## ROLLBACK: optimization_engine extraction

### Rollback Steps Executed
☑ Stopped v9 optimization service
☑ Removed /v9/engines/optimization/
☑ Removed adapters from monolith
☑ Verified monolith still works
☑ Updated extraction plan

### Post-Rollback Status
- Monolith: Functional ☑
- v9: Running without optimization ☑
- No data loss ☑

### Lessons Learned
1. Must extract tool_life_engine first
2. Need complete trace of constraint_engine
3. Update extraction order in prism-monolith-index
```

---

# SECTION 8: INTEGRATION

## 8.1 Skill Metadata

```yaml
skill_id: prism-monolith-extractor
version: 1.0.0
category: monolith-navigation
priority: HIGH

triggers:
  keywords:
    - "extract", "extraction", "pull out"
    - "isolate", "separate", "remove from monolith"
    - "migrate", "move to v9"
    - "copy from legacy"
  contexts:
    - After consulting prism-monolith-index
    - When beginning Stage 1 extraction work
    - When moving databases to new structure
    - When isolating algorithms

activation_rule: |
  IF (need to extract from monolith)
  THEN activate prism-monolith-extractor
  AND follow TIVE protocol

outputs:
  - Extracted code/data
  - Dependency manifest
  - Validation report
  - Rollback documentation

related_skills:
  - prism-monolith-index (consult BEFORE extraction)
  - prism-monolith-navigator (for finding code)
```

## 8.2 Workflow Integration

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           EXTRACTION WORKFLOW                                           │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  1. PLAN                         2. TRACE                       3. ISOLATE              │
│  ────────                        ─────────                      ──────────              │
│  ┌─────────────┐                ┌─────────────┐                ┌─────────────┐          │
│  │  Consult    │                │   Map all   │                │   Define    │          │
│  │  monolith-  │────────────────│ dependencies│────────────────│  boundary   │          │
│  │   index     │                │             │                │             │          │
│  └─────────────┘                └─────────────┘                └─────────────┘          │
│                                                                                         │
│  4. VALIDATE                    5. EXTRACT                      6. DOCUMENT             │
│  ────────────                   ───────────                     ──────────              │
│  ┌─────────────┐                ┌─────────────┐                ┌─────────────┐          │
│  │   Verify    │                │    Copy &   │                │   Create    │          │
│  │ completeness│────────────────│  transform  │────────────────│  manifest   │          │
│  │             │                │             │                │             │          │
│  └─────────────┘                └─────────────┘                └─────────────┘          │
│                                                                                         │
│  IF VALIDATION FAILS ──────────────────────────────────▶ ROLLBACK                       │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 8.3 Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                     PRISM-MONOLITH-EXTRACTOR QUICK REFERENCE                            │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  🔒 TIVE PROTOCOL - Never skip a step! 🔒                                               │
│                                                                                         │
│  T - TRACE all dependencies                                                             │
│  I - ISOLATE the extraction unit                                                        │
│  V - VALIDATE completeness                                                              │
│  E - EXTRACT with documentation                                                         │
│                                                                                         │
│  EXTRACTION TYPES                                                                       │
│  ─────────────────                                                                      │
│  Data:      LOW complexity    - Clean cut, count validation                             │
│  Database:  MEDIUM complexity - Relations, integrity checks                             │
│  Algorithm: MED-HIGH complex  - Tests, adapters, stubs                                  │
│  Subsystem: HIGH complexity   - Phased extraction                                       │
│                                                                                         │
│  ISOLATION PATTERNS                                                                     │
│  ─────────────────                                                                      │
│  Clean Cut:        No deps → Just copy                                                  │
│  Interface:        Has consumers → Create adapter                                       │
│  Dependency Bundle: Has required deps → Extract together                                │
│  Stub Replacement: Has legacy deps → Create stub                                        │
│                                                                                         │
│  VALIDATION STAGES                                                                      │
│  ─────────────────                                                                      │
│  PRE:    Plan ready? Deps traced? Boundary defined?                                     │
│  DURING: Files copied? Syntax valid? Basic function?                                    │
│  POST:   Counts match? Tests pass? Documented?                                          │
│                                                                                         │
│  ROLLBACK RULE                                                                          │
│  ─────────────────                                                                      │
│  Every extraction must be reversible.                                                   │
│  Document rollback BEFORE extracting.                                                   │
│  Test rollback procedure.                                                               │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 8.4 Complete Extraction Checklist

```markdown
## COMPLETE EXTRACTION CHECKLIST

**Extraction:** [name]
**Date:** [date]
**Type:** [data/database/algorithm/subsystem]

---

### PHASE 1: PLANNING
☐ Consulted prism-monolith-index
☐ Target module(s) identified
☐ Extraction type determined
☐ Isolation pattern selected

### PHASE 2: TRACE
☐ All imports traced (Level 1)
☐ Transitive dependencies mapped (Level 2+)
☐ All exports identified
☐ Data dependencies documented
☐ Runtime dependencies checked
☐ Circular dependencies handled

### PHASE 3: ISOLATE
☐ Boundary defined
☐ Inside boundary files listed
☐ Outside boundary actions defined
☐ Interface points documented
☐ Stubs designed
☐ Adapters designed

### PHASE 4: VALIDATE (PRE)
☐ All files accessible
☐ Dependencies resolvable
☐ Extraction plan complete
☐ Rollback plan documented

### PHASE 5: EXTRACT
☐ Files copied to target
☐ Format conversions complete
☐ Stubs implemented
☐ Adapters implemented

### PHASE 6: VALIDATE (POST)
☐ File counts match
☐ Record counts match
☐ Syntax validation passes
☐ Tests pass
☐ Performance acceptable

### PHASE 7: DOCUMENT
☐ Manifest created
☐ Dependencies documented
☐ Interfaces documented
☐ Rollback instructions complete

---

**EXTRACTION STATUS:** ☐ COMPLETE / ☐ FAILED (reason: ___)
```

---

# DOCUMENT END

**Skill:** prism-monolith-extractor
**Version:** 1.0
**Total Sections:** 8
**Part of:** SP.2 Monolith Navigation (SP.2.2 of 3)
**Created:** Session SP.2.2
**Status:** COMPLETE

**Key Features:**
- TIVE Protocol (Trace → Isolate → Validate → Extract)
- 4 extraction protocols by complexity level
- 4 isolation patterns (Clean Cut, Interface, Bundle, Stub)
- Complete dependency handling system
- Pre/During/Post validation checklists
- Rollback planning and execution
- 3 worked examples (success, algorithm, failed rollback)

**Safety First:**
- Every extraction is reversible
- Validation at every stage
- Dependencies traced before extraction
- No assumptions about "simple" code

---
