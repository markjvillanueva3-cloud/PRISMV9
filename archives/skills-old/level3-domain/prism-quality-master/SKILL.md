---
name: prism-quality-master
version: 1.0.0
description: |
  UNIFIED quality and validation reference for PRISM v9.0 development.
  Consolidates 5 existing quality skills into one comprehensive resource:
  - prism-quality-gates (263 lines) - Gate definitions
  - prism-validator (402 lines) - Validation patterns
  - prism-tdd (328 lines) - Test patterns
  - prism-error-recovery (296 lines) - Recovery strategies
  - prism-review (377 lines) - Review standards
  
  Use this INSTEAD of loading individual quality skills.
  Complements SP.1 workflow skills (sp-debugging, sp-verification, sp-review-quality).
  
triggers:
  - "quality gate"
  - "validate"
  - "test"
  - "TDD"
  - "review"
  - "error recovery"
  - "quality check"
  
integrates_with:
  - prism-sp-debugging (4-phase debugging process)
  - prism-sp-verification (evidence-based verification)
  - prism-sp-review-quality (code quality review)
  - prism-sp-review-spec (specification compliance)
  - prism-error-catalog (comprehensive error reference)
---

# PRISM QUALITY MASTER
## Unified Quality & Validation Reference
### Version 1.0 | Consolidates 5 Skills | SP.5

---

## TABLE OF CONTENTS

1. [Quick Reference](#1-quick-reference)
2. [Quality Gates](#2-quality-gates)
3. [Validation Patterns](#3-validation-patterns)
4. [TDD Methodology](#4-tdd-methodology)
5. [Review Standards](#5-review-standards)
6. [Error Recovery](#6-error-recovery)
7. [Integration Map](#7-integration-map)

---

# 1. QUICK REFERENCE

## The Quality Triangle

```
                    ┌─────────────┐
                    │   GATES     │
                    │  (Pass/Fail)│
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
       ┌──────────┐  ┌──────────┐  ┌──────────┐
       │VALIDATION│  │   TDD    │  │  REVIEW  │
       │ (Data)   │  │ (Process)│  │ (Human)  │
       └──────────┘  └──────────┘  └──────────┘
              │            │            │
              └────────────┼────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  RECOVERY   │
                    │(When Fails) │
                    └─────────────┘
```

## Quick Decision Tree

```
WHAT DO YOU NEED?
│
├─► "Is this ready to proceed?" ──────► QUALITY GATES (Section 2)
│
├─► "Is this data correct?" ──────────► VALIDATION (Section 3)
│
├─► "How do I build this right?" ─────► TDD (Section 4)
│
├─► "Is this good enough?" ───────────► REVIEW (Section 5)
│
└─► "Something broke!" ───────────────► ERROR RECOVERY (Section 6)
```

## Universal Quality Checklist

```
BEFORE ANY DELIVERABLE:
□ Gate requirements known?
□ Validation criteria defined?
□ Tests written first (TDD)?
□ Review checklist ready?
□ Recovery plan if it fails?
```

---

# 2. QUALITY GATES

> 🛑 **PRINCIPLE:** No module, feature, or phase advances without passing ALL gates

## 2.1 Four Gate Types

### GATE 1: EXTRACTION QUALITY

Before a module is considered "extracted":

| Check | Requirement | Verification |
|-------|-------------|--------------|
| **Completeness** | All functions present | Count vs monolith |
| **Syntax** | No parse errors | `node --check` |
| **Dependencies** | All documented | Header check |
| **Outputs** | All documented | Header check |
| **Header** | Standard header present | Visual check |

**Pass:** ALL checks ✅ | **Fail:** Re-extract or fix

### GATE 2: MIGRATION QUALITY

Before a module imports to new architecture:

| Check | Requirement | Verification |
|-------|-------------|--------------|
| **Consumers** | Min consumers wired | prism-consumer-mapper |
| **6+ Sources** | Calcs use 6+ sources | prism-utilization |
| **Gateway Routes** | All routes registered | Route check |
| **Tests** | Unit tests exist | Test count |
| **XAI** | Explanation available | XAI check |

**Pass:** ALL checks ✅ | **Fail:** Wire consumers, add tests

### GATE 3: FEATURE QUALITY

Before a feature is marked complete:

| Check | Requirement | Verification |
|-------|-------------|--------------|
| **Functionality** | Works as specified | Manual test |
| **Edge Cases** | Boundaries handled | Test suite |
| **Error Handling** | Graceful failures | Error injection |
| **Performance** | <500ms calculations | Profiling |
| **UI** | 3-click rule met | UX check |

**Pass:** ALL checks ✅ | **Fail:** Fix before marking complete

### GATE 4: RELEASE QUALITY

Before a build is released:

| Check | Requirement | Verification |
|-------|-------------|--------------|
| **Extraction** | 100% modules extracted | Audit |
| **Utilization** | 100% for all DBs | prism-utilization |
| **Tests** | All passing | Test suite |
| **Performance** | <2s page load | Lighthouse |
| **Security** | Input validation | prism-validator |
| **Documentation** | Up to date | Manual check |

**Pass:** ALL checks ✅ | **Fail:** Fix all issues

## 2.2 Gate Status Tracking

Add to CURRENT_STATE.json:

```json
{
  "qualityGates": {
    "extraction": { "passed": 48, "failed": 0, "pending": 783 },
    "migration": { "passed": 0, "failed": 0, "pending": 48 },
    "features": {
      "speedFeedCalc": "PASSED",
      "postProcessor": "PENDING"
    },
    "release": { "v9.0.0": "NOT_STARTED" }
  }
}
```

## 2.3 Gate Verification Template

```javascript
const gateCheck = {
  gate: "EXTRACTION",
  module: "PRISM_MATERIALS_MASTER",
  timestamp: new Date().toISOString(),
  checks: {
    completeness: { pass: true, found: 25, expected: 25 },
    syntax: { pass: true, errors: 0 },
    dependencies: { pass: true, count: 8 },
    outputs: { pass: true, count: 12 },
    header: { pass: true }
  },
  overallPass: true,
  reviewer: "Claude"
};
```

---

# 3. VALIDATION PATTERNS

## 3.1 Quick Validation Commands

```javascript
// JavaScript syntax check
node --check [filename].js

// JSON validation
node -e "JSON.parse(require('fs').readFileSync('[file]', 'utf8'))"

// Material structure validation
validateMaterial(material);  // Returns { valid, errors, warnings }
```

## 3.2 Material File Structure (14 Required Sections)

```
✓ identification       (8 params)    ✓ friction           (10 params)
✓ composition          (varies)      ✓ thermalMachining   (14 params)
✓ physicalProperties   (12 params)   ✓ surfaceIntegrity   (12 params)
✓ mechanicalProperties (15 params)   ✓ machinability      (8 params)
✓ kienzle              (9 params)    ✓ recommendedParams  (20+ params)
✓ johnsonCook          (13 params)   ✓ statisticalData    (8 params)
✓ taylorToolLife       (12 params)
✓ chipFormation        (12 params)
```

## 3.3 Value Range Reference

### Physical Properties
| Parameter | Min | Max | Unit |
|-----------|-----|-----|------|
| density | 1,500 | 20,000 | kg/m³ |
| meltingPoint.solidus | 200 | 3,500 | °C |
| specificHeat | 100 | 2,000 | J/(kg·K) |
| thermalConductivity | 5 | 430 | W/(m·K) |
| elasticModulus | 10 | 450 | GPa |

### Mechanical Properties
| Parameter | Min | Max | Unit |
|-----------|-----|-----|------|
| tensileStrength | 50 | 3,500 | MPa |
| yieldStrength | 25 | 3,000 | MPa |
| hardness.brinell | 30 | 750 | HB |
| hardness.rockwellC | -20 | 70 | HRC |

### Kienzle Parameters
| Parameter | Min | Max | Unit |
|-----------|-----|-----|------|
| Kc11_tangential | 400 | 5,000 | N/mm² |
| Kc11_feed | 100 | 2,000 | N/mm² |
| mc_tangential | 0.10 | 0.45 | - |

### Johnson-Cook Parameters
| Parameter | Min | Max | Unit |
|-----------|-----|-----|------|
| A | 50 | 2,500 | MPa |
| B | 100 | 3,000 | MPa |
| n | 0.05 | 0.80 | - |
| C | 0.001 | 0.100 | - |

## 3.4 Relationship Validation Rules

```javascript
// MUST HOLD TRUE:

// 1. Yield < Tensile (ratio 0.50-0.95)
yieldStrength < tensileStrength

// 2. Solidus < Liquidus (gap 20-100°C typical)
meltingPoint.solidus < meltingPoint.liquidus

// 3. Modulus relationship (E ≈ 2.5 × G)
elasticModulus > shearModulus

// 4. Kienzle force ordering
Kc11_tangential > Kc11_feed > Kc11_radial

// 5. Kienzle exponent ordering
mc_tangential < mc_feed < mc_radial

// 6. Taylor tool ordering
C_ceramic > C_carbide > C_HSS
n_ceramic > n_carbide > n_HSS

// 7. Johnson-Cook A ≈ Yield (±20%)
Math.abs(A - yieldStrength) / yieldStrength < 0.20
```

## 3.5 Quick Validation Checklist

```
□ ID matches pattern: [ISO]-[SUB]-[###]
□ All 14 sections present
□ Composition adds to ~100%
□ Yield < Tensile
□ Solidus < Liquidus  
□ Kc1.1 in range (400-5000 N/mm²)
□ Kc ordering correct
□ Taylor n/C ordering correct
□ J-C A ≈ yield strength
□ Machinability consistent with hardness
```

## 3.6 Validation Function

```javascript
function validateMaterial(material) {
  const errors = [], warnings = [];
  
  // 1. Check sections
  const required = ['identification', 'composition', 'physicalProperties', 
    'mechanicalProperties', 'kienzle', 'johnsonCook', 'taylorToolLife',
    'chipFormation', 'friction', 'thermalMachining', 'surfaceIntegrity',
    'machinability', 'recommendedParameters', 'statisticalData'];
  required.forEach(s => { if (!material[s]) errors.push(`Missing: ${s}`); });
  
  // 2. ID format
  const id = material.identification?.prismId;
  if (!id?.match(/^[PMKNSH]-[A-Z]{2}-\d{3}$/)) 
    errors.push(`Invalid ID: ${id}`);
  
  // 3. Yield < Tensile
  const y = material.mechanicalProperties?.yieldStrength?.value;
  const t = material.mechanicalProperties?.tensileStrength?.value;
  if (y && t && y >= t) errors.push(`Yield (${y}) >= Tensile (${t})`);
  
  // 4. Solidus < Liquidus
  const sol = material.physicalProperties?.meltingPoint?.solidus;
  const liq = material.physicalProperties?.meltingPoint?.liquidus;
  if (sol && liq && sol >= liq) errors.push(`Solidus >= Liquidus`);
  
  // 5. Kc ordering
  const kc_t = material.kienzle?.Kc11_tangential?.value;
  const kc_f = material.kienzle?.Kc11_feed?.value;
  if (kc_t && kc_f && kc_t <= kc_f) 
    warnings.push(`Kc ordering: tangential should > feed`);
  
  return { valid: errors.length === 0, errors, warnings };
}
```

---

# 4. TDD METHODOLOGY

> **RED → GREEN → REFACTOR** - Never code without a failing test first

## 4.1 TDD for PRISM

```
1. RED:    Define success criteria BEFORE implementing
2. GREEN:  Implement minimum to pass criteria
3. REFACTOR: Optimize without breaking criteria
```

## 4.2 Test Templates by Task Type

### Material Entry Tests
```javascript
const MATERIAL_TESTS = {
  materialId: 'P-CS-031',
  tests: [
    { test: 'Has all 127 parameters', expected: true },
    { test: 'Composition sums to 100%', expected: true },
    { test: 'kc1_1 in range [500-5000]', expected: true },
    { test: 'Yield < Tensile', expected: true },
    { test: 'Has cutting recommendations', expected: true }
  ]
};
```

### Module Extraction Tests
```javascript
const EXTRACTION_TESTS = {
  moduleName: 'PRISM_MATERIALS_MASTER',
  tests: [
    { test: 'Module exists', expected: true },
    { test: 'Line count >= 500', expected: true },
    { test: 'Has getMaterial()', expected: true },
    { test: 'Has getAllMaterials()', expected: true },
    { test: 'No syntax errors', expected: true },
    { test: 'Dependencies documented', expected: true },
    { test: 'Consumers >= 15', expected: true }
  ]
};
```

### Consumer Wiring Tests
```javascript
const WIRING_TESTS = {
  database: 'PRISM_MATERIALS_MASTER',
  tests: [
    { test: 'Consumer count >= 15', expected: true },
    { test: 'SPEED_FEED_CALCULATOR connected', expected: true },
    { test: 'FORCE_CALCULATOR connected', expected: true },
    { test: 'THERMAL_ENGINE connected', expected: true },
    { test: 'Gateway routes >= 5', expected: true }
  ]
};
```

## 4.3 TDD Workflow

```
BEFORE WORK:
□ List items to create/modify
□ Write validation criteria for EACH
□ Verify criteria would FAIL currently

DURING WORK:
FOR EACH item:
  1. Confirm test fails (RED)
  2. Implement minimum to pass (GREEN)
  3. Verify test passes
  4. Optimize if needed (REFACTOR)

AFTER WORK:
□ Run ALL tests again
□ Document any failures
□ Fix any regressions
```

## 4.4 TDD Anti-Patterns

```
❌ Writing code before defining success criteria
❌ Adding features without tests
❌ Skipping the RED phase
❌ Not re-running tests after changes
❌ Implementing beyond what tests require
```

---

# 5. REVIEW STANDARDS

> **REVIEW CATCHES WHAT VERIFICATION MISSES** - Quality beyond correctness

## 5.1 Review Types

| Type | Scope | When | Time |
|------|-------|------|------|
| **Quick** | Single item | After creation | 2-5 min |
| **Standard** | Module/file | After extraction | 10-20 min |
| **Deep** | Architecture | Major decisions | 30-60 min |
| **Audit** | Full system | Periodically | 1-2 hours |

## 5.2 Quick Review (2-5 minutes)

For individual items (materials, functions, entries):

```
☐ Correct?    Works as intended?
☐ Complete?   All required parts present?
☐ Consistent? Follows existing patterns?
☐ Clear?      Understandable without explanation?
☐ Clean?      No obvious improvements needed?

→ APPROVE or REQUEST CHANGES
```

## 5.3 Standard Review (10-20 minutes)

For modules and files:

```
CORRECTNESS
☐ Functions work as documented
☐ Data is accurate
☐ Edge cases handled
☐ Error handling present

COMPLETENESS
☐ All functions extracted/implemented
☐ All data present
☐ Dependencies documented
☐ Consumers identified (min 6)

CONSISTENCY
☐ Naming follows conventions
☐ Structure matches similar modules
☐ API consistent with peers

10 COMMANDMENTS ALIGNMENT
☐ 1. Used everywhere? (consumers wired)
☐ 2. Fuses concepts? (cross-domain)
☐ 3. Verified? (validation present)
☐ 4. Learns? (feeds ML pipeline)
☐ 5. Uncertainty? (confidence intervals)
☐ 6. Explainable? (XAI ready)
☐ 7. Fails gracefully? (fallbacks)
☐ 8. Protected? (validation, sanitization)
☐ 9. Performs? (<500ms calculations)
☐ 10. User-focused? (good defaults)

→ APPROVE / REQUEST CHANGES / MAJOR REWORK
```

## 5.4 Deep Review (30-60 minutes)

For architectural decisions:

```
PROBLEM UNDERSTANDING
☐ Problem clearly defined
☐ Requirements documented
☐ Constraints identified
☐ Success criteria measurable

SOLUTION EVALUATION
☐ Multiple options considered
☐ Tradeoffs documented
☐ Best option selected with rationale
☐ Risks identified and mitigated

TECHNICAL QUALITY
☐ Design is sound
☐ Implementation is feasible
☐ Scalability considered
☐ Maintainability considered

INTEGRATION
☐ Fits with existing architecture
☐ No breaking changes
☐ Migration path clear
☐ Documentation complete

→ APPROVE / CONDITIONAL / REJECT
```

## 5.5 Review Severity Levels

| Level | Icon | Description | Action |
|-------|------|-------------|--------|
| Critical | 🔴 | Blocks release, causes failure | Must fix |
| Major | 🟠 | Significant issue | Should fix |
| Minor | 🟡 | Improvement opportunity | Nice to fix |
| Note | 🟢 | Observation | Optional |

## 5.6 Review Report Template

```markdown
# REVIEW REPORT
## Subject: [What]
## Type: Quick / Standard / Deep
## Date: [DATE]

### Summary
[2-3 sentences overall assessment]

### Result
☐ APPROVED - Ready for use
☐ CONDITIONAL - Approve with minor fixes
☐ REQUEST CHANGES - Major issues found
☐ REJECT - Fundamental problems

### Findings
#### Critical (Must Fix)
[List]

#### Major (Should Fix)
[List]

#### Minor (Nice to Fix)
[List]

### Recommendations
[Specific actions]
```

## 5.7 Good vs Bad Review Comments

```
✓ GOOD:
"Kc1.1 value (2847) seems high for this family. Similar steels 
typically range 1800-2200. Source?"

"Consider extracting this repeated pattern into a helper function."

"Fallback returns undefined. Should return default per Commandment 7."

✗ BAD:
"This is wrong." (No explanation)
"Fix this." (No guidance)
"I would do it differently." (Subjective)
```

---

# 6. ERROR RECOVERY

> 🔴 **FIRST RULE: DON'T PANIC, DON'T RESTART**

## 6.1 Recovery Protocol

```
When something breaks:
1. CHECKPOINT - Save current progress immediately
2. DIAGNOSE - What actually went wrong?
3. LOOKUP - Check recovery patterns below
4. FIX - Apply the fix
5. VERIFY - Confirm fix worked
6. CONTINUE - Resume from where you were
7. LOG - Note issue for future reference
```

## 6.2 Common Errors & Fixes

### File/Path Errors

| Error | Fix |
|-------|-----|
| "Parent directory does not exist" | Create directory first: `Filesystem:create_directory` |
| "File not found (ENOENT)" | Verify path spelling, check parent exists |
| "Permission denied (EACCES)" | Close file in other programs, wait and retry |

### State File Issues

| Issue | Fix |
|-------|-----|
| JSON parse error | Read as text, find syntax error, use edit_block to fix |
| State file missing | Check SESSION_LOGS for last known state, recreate |
| State corrupted | Rebuild from session log entries |

### Extraction Errors

| Issue | Fix |
|-------|-----|
| Partial extraction (cut off) | Find where stopped, extract remainder, append |
| Module not found | Try alternative patterns, check naming variations |
| Wrong version | Search for ALL occurrences, use latest (highest line #) |

### Write Errors

| Issue | Fix |
|-------|-----|
| File empty after write | Verify with immediate read, retry |
| File truncated | Use chunked writing (<25KB per chunk) |
| Write timeout | Increase timeout_ms, retry |

## 6.3 Recovery Patterns

### Pattern 1: Checkpoint Before Risky Operations
```
BEFORE large writes, multi-step operations:
1. Update CURRENT_STATE.json with current progress
2. Note what you're about to attempt
3. Then proceed
```

### Pattern 2: Verify After Every Write
```javascript
// Write
Filesystem:write_file({ path: "...", content: "..." })

// Immediately verify
Filesystem:read_file({ path: "...", head: 10 })
```

### Pattern 3: Incremental Extraction
```
Instead of extracting entire module at once:
1. Extract first 500 lines → Verify
2. Extract next section → Append, verify
3. Continue until complete
```

### Pattern 4: State File Backup
```
Before major state changes:
1. Read current state
2. Note key values in session log
3. Then update state
→ If corrupts, rebuild from log
```

## 6.4 When to Ask User

**DO ask when:**
- ❓ File permissions won't resolve
- ❓ Path doesn't exist unexpectedly
- ❓ Multiple conflicting versions, unclear which
- ❓ State corrupted beyond recovery
- ❓ Error you haven't seen before

**DON'T restart without asking when:**
- ❌ You made a mistake (fix it instead)
- ❌ Tool failed once (retry first)
- ❌ Unsure what went wrong (diagnose first)

## 6.5 Emergency Recovery Checklist

```
If everything seems broken:

1. BREATHE - It's rarely as bad as it seems

2. LIST ROOT:
   Filesystem:list_directory({ path: "C:\\PRISM REBUILD..." })

3. CHECK WHAT EXISTS:
   □ CURRENT_STATE.json?
   □ SESSION_LOGS folder?
   □ EXTRACTED folder?

4. READ LAST SESSION LOG:
   Find most recent, read for context

5. REBUILD STATE from logs if needed

6. ASK USER if still stuck
```

---

# 7. INTEGRATION MAP

## 7.1 How This Skill Integrates

```
┌────────────────────────────────────────────────────────────────┐
│                    QUALITY ECOSYSTEM                            │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  WORKFLOW SKILLS (SP.1)           THIS SKILL (SP.5)           │
│  ═══════════════════════          ═════════════════════        │
│  prism-sp-debugging ────────────► Error Recovery (Sec 6)      │
│  prism-sp-verification ─────────► Gates & TDD (Sec 2,4)       │
│  prism-sp-review-quality ───────► Review Standards (Sec 5)    │
│  prism-sp-review-spec ──────────► Gates (Sec 2)               │
│                                                                │
│  REFERENCE SKILL                                               │
│  ═══════════════                                               │
│  prism-error-catalog ───────────► Detailed error lookup        │
│  (Keep separate - 123KB)          when recovery fails          │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

## 7.2 Skill Selection Guide

| Situation | Use This Skill | Use SP.1 Skill |
|-----------|----------------|----------------|
| Define pass/fail criteria | ✅ Section 2 | |
| Validate data | ✅ Section 3 | |
| Test-first development | ✅ Section 4 | |
| Review for quality | ✅ Section 5 | prism-sp-review-quality |
| Debug an issue | | prism-sp-debugging |
| Prove completion | | prism-sp-verification |
| Check spec compliance | ✅ Section 2 | prism-sp-review-spec |
| Recover from error | ✅ Section 6 | |
| Look up specific error | | prism-error-catalog |

## 7.3 Consumer Mapping

| Section | Primary Consumers |
|---------|-------------------|
| Quality Gates | All phase transitions, CURRENT_STATE.json |
| Validation | Material database, module extraction |
| TDD | New feature development, migrations |
| Review | Code review, architecture decisions |
| Error Recovery | All error situations |

## 7.4 Database Consumer Requirements

```
MINIMUM CONSUMERS PER DATABASE:
─────────────────────────────────
PRISM_MATERIALS_MASTER     → 15+ consumers
PRISM_MACHINES_DATABASE    → 12+ consumers
PRISM_TOOLS_DATABASE       → 10+ consumers
PRISM_WORKHOLDING_DATABASE →  8+ consumers
PRISM_CONTROLLER_DATABASE  →  8+ consumers

RULE: No database enters v9.0 without ALL consumers wired.
```

---

# 8. MIT FOUNDATION

This skill draws from:

| Course | Topic |
|--------|-------|
| **6.005** | Software Construction - Testing, specifications |
| **16.355J** | Software Engineering - QA processes, gate reviews |
| **2.830** | Quality Control - Statistical process control |

---

# 9. VERSION HISTORY

| Ver | Date | Changes |
|-----|------|---------|
| 1.0 | 2026-01-24 | Initial consolidation of 5 skills |

**Source Skills Consolidated:**
- prism-quality-gates (263 lines)
- prism-validator (402 lines)
- prism-tdd (328 lines)
- prism-error-recovery (296 lines)
- prism-review (377 lines)

**Total Source:** 1,666 lines
**Consolidated Result:** ~900 lines (46% more efficient)

---

**END OF PRISM QUALITY MASTER SKILL**
