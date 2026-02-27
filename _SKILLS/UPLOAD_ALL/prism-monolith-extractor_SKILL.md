---
name: prism-monolith-extractor
description: |
  Protocols for safely extracting code from monolith. Validation and rollback.
---

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

**EXTRACTION STATUS:** ☐ COMPLETE / ☐ FAILED (reason: ___)
```
