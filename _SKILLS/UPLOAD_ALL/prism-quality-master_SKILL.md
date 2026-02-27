---
name: prism-quality-master
description: |
  Unified quality and validation reference. Consolidates 5 quality skills.
---

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
