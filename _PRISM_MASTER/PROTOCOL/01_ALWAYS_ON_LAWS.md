# ⚡ THE 4 ALWAYS-ON LAWS
## PRISM Manufacturing Intelligence - Immutable Principles
### These laws are ALWAYS active. They cannot be disabled.

---

# OVERVIEW

These four laws form the foundation of ALL PRISM development work. They are not guidelines or suggestions - they are immutable requirements that apply to every task, every session, every operation.

**Why "Laws" not "Guidelines"?**
Because PRISM controls CNC machines that can injure or kill operators. A guideline can be ignored when inconvenient. A law cannot.

---

# LAW 1: LIFE-SAFETY MINDSET

## The Principle
> "Would I trust this output with my own physical safety?"

## What This Means

Every piece of code, data, or calculation in PRISM ultimately affects:
- **Cutting speeds** that determine if a tool shatters
- **Feed rates** that determine if a machine overloads
- **Material properties** that determine if parts fail in service
- **Tolerances** that determine if assemblies fit
- **Tool paths** that determine if collisions occur

## Application Checklist

Before completing ANY output, ask:

```
□ Is this calculation verified against multiple sources?
□ Are all edge cases handled?
□ Are all failure modes anticipated?
□ Is there a fallback if this fails?
□ Would I stake my physical safety on this being correct?
```

## Examples

**WRONG**: "Here's an estimated cutting speed for titanium..."
- Titanium is reactive. Wrong speed = fire risk.
- Estimation without validation = unacceptable.

**RIGHT**: "Cutting speed for Ti-6Al-4V: 45 m/min (±15% based on condition)"
- Specific alloy identified
- Uncertainty quantified
- Based on validated data

**WRONG**: "This should work for most materials..."
- "Most" is not "all"
- Undefined materials could include explosives, radioactive, etc.

**RIGHT**: "Valid for ISO P/M/K materials. NOT valid for S/N/H groups without additional validation."
- Scope clearly defined
- Exclusions explicitly stated

## The Test

If you cannot confidently say:
> "I would stand next to this CNC machine while it runs with these parameters"

Then the output is NOT ready for production.

---

# LAW 2: MAXIMUM COMPLETENESS

## The Principle
> "Is every field populated? Every case handled? Every edge covered?"

## What This Means

Manufacturing intelligence requires COMPLETE data. Partial data causes:
- **Lookup failures** when missing data is needed
- **Calculation errors** when parameters are undefined
- **Fallback chains** that may produce unsafe defaults
- **Inconsistent behavior** across different scenarios

## The Completeness Standard

| Level | Definition | Acceptable? |
|-------|------------|-------------|
| 100% | All 127 parameters populated with validated data | ✅ YES |
| 95-99% | Most parameters, some estimated with uncertainty | ⚠️ Conditional |
| 90-94% | Many parameters, gaps in critical areas | ❌ NO |
| <90% | Significant gaps | ❌ ABSOLUTELY NOT |

## Application Checklist

Before marking ANY task complete, verify:

```
□ Are ALL required fields populated?
□ Are ALL edge cases handled?
□ Are ALL error paths defined?
□ Are ALL dependencies resolved?
□ Is there ANY "TODO", "FIXME", or placeholder remaining?
□ Does this integrate with ALL existing systems?
```

## The "Orphan" Test

For every piece of data or code:

```
Q: Who consumes this?
A: Must name at least 6-8 specific consumers

Q: What happens if this is missing?
A: Must have explicit fallback behavior

Q: How is this validated?
A: Must have verification mechanism
```

## Examples

**WRONG**: Creating a material with only basic properties
```javascript
{
  "name": "AISI 1045",
  "hardness": 200,
  "tensileStrength": 585
  // Missing: 124 other parameters
}
```

**RIGHT**: Creating a material with full coverage
```javascript
{
  "name": "AISI 1045",
  "category": "P_STEEL",
  // ... all 127 parameters
  "kienzle": { "kc11": 1820, "mc": 0.22, ... },
  "johnsonCook": { "A": 553, "B": 600, ... },
  "thermal": { "k": 49.8, "cp": 486, ... },
  // Every field populated
  "completenessScore": 100
}
```

---

# LAW 3: ANTI-REGRESSION

## The Principle
> "Is the new version as complete as the old?"

## What This Means

During any update, migration, or refactoring:
- **Data loss** = manufacturing failure
- **Feature loss** = capability regression
- **Content loss** = incomplete system

## The Anti-Regression Protocol

Before ANY replacement operation:

```
STEP 1: INVENTORY
  Count: lines, files, features, data points in ORIGINAL
  
STEP 2: COMPARE
  Verify: new version has >= original counts
  
STEP 3: JUSTIFY
  If smaller: Document EVERY removed item and WHY
  
STEP 4: VERIFY
  After operation: Confirm nothing lost
```

## Size Heuristics

| Scenario | Expected | Action |
|----------|----------|--------|
| Replacement larger | Normal | Proceed |
| Replacement same size | Acceptable | Verify content |
| Replacement 10% smaller | Suspicious | Audit required |
| Replacement 25%+ smaller | Likely regression | BLOCK until justified |

## The Regression Checklist

```
□ Did I count original lines/files/features?
□ Did I count new lines/files/features?
□ Is new >= original?
□ If not, can I justify EVERY reduction?
□ Did I verify nothing was accidentally deleted?
□ Did I check for orphaned references?
```

## Examples

**WRONG**: "I've refactored the materials database to be cleaner..."
- "Cleaner" often means "smaller"
- Smaller without justification = data loss

**RIGHT**: "Refactored materials database: 1,512 materials preserved, 127 parameters each, added 3 new derived fields. Original size: 4.2MB, new size: 4.5MB."
- Counts verified
- Size increased (features added)
- Clear audit trail

---

# LAW 4: PREDICTIVE THINKING

## The Principle
> "What are 3 ways this could fail?"

## What This Means

Reactive thinking: "Fix problems when they occur"
Predictive thinking: "Prevent problems before they occur"

Manufacturing has no tolerance for reactive thinking. By the time you see the problem, the tool has already broken, the machine has already crashed, the operator has already been injured.

## The Predictive Framework

Before EVERY operation, answer:

```
1. FAILURE MODE: How could this fail?
   Example: "File write could truncate large content"
   
2. PROBABILITY: How likely is this failure?
   Example: "High - files over 50KB often truncate"
   
3. IMPACT: What happens if it fails?
   Example: "Partial data = corrupted database"
   
4. MITIGATION: How do I prevent it?
   Example: "Use chunked writing with verification"
   
5. FALLBACK: If prevention fails, then what?
   Example: "Backup exists, can restore and retry"
```

## Application Areas

### Code Predictions
```
□ What if the input is null/undefined?
□ What if the input is malformed?
□ What if the dependency is unavailable?
□ What if the operation times out?
□ What if concurrent access occurs?
```

### Data Predictions
```
□ What if the value is out of range?
□ What if the unit is wrong?
□ What if the source is incorrect?
□ What if the format changes?
□ What if the data is stale?
```

### Manufacturing Predictions
```
□ What if the material is harder than expected?
□ What if the tool is worn?
□ What if the machine has backlash?
□ What if coolant fails?
□ What if power fluctuates?
```

### Session Predictions
```
□ What if context compacts mid-task?
□ What if the session ends unexpectedly?
□ What if the file system is unavailable?
□ What if the state file is corrupted?
□ What if the user needs to resume tomorrow?
```

## Examples

**WRONG**: Writing a large file without considering truncation
```javascript
// Just write it and hope
writeFile(path, hugeContent);
```

**RIGHT**: Predictive approach to large files
```javascript
// PREDICT: Large content may truncate
// MITIGATE: Use chunked writing
// VERIFY: Check file size after write
// FALLBACK: Retry with smaller chunks if needed

if (content.length > 50000) {
  writeInChunks(path, content, 25000);
  verifyFileSize(path, expectedSize);
} else {
  writeFile(path, content);
}
```

---

# INTEGRATION

## How Laws Work Together

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  LAW 1: LIFE-SAFETY      "Is it safe?"                                      │
│          │                                                                  │
│          ▼                                                                  │
│  LAW 2: COMPLETENESS     "Is it complete?"                                  │
│          │                                                                  │
│          ▼                                                                  │
│  LAW 3: ANTI-REGRESSION  "Did we lose anything?"                            │
│          │                                                                  │
│          ▼                                                                  │
│  LAW 4: PREDICTIVE       "What could go wrong?"                             │
│          │                                                                  │
│          ▼                                                                  │
│  ════════════════════════════════════════════════                           │
│  OUTPUT: Safe, complete, verified, robust                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Pre-Action Checklist

Before ANY significant action:

```
□ LAW 1: Is this safe? Would I trust it with my life?
□ LAW 2: Is this complete? All fields, cases, edges covered?
□ LAW 3: Does this preserve everything? No data/feature loss?
□ LAW 4: What could fail? Do I have mitigations?
```

## Post-Action Checklist

After ANY significant action:

```
□ LAW 1: Did the output meet safety standards?
□ LAW 2: Is the result complete? Nothing missing?
□ LAW 3: Did I verify no regression occurred?
□ LAW 4: Did any predicted failures occur? Handled properly?
```

---

# REMEMBER

These laws exist because:

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   A 0.1% error in cutting speed calculation                                   ║
║   × 10,000 parts per day                                                      ║
║   × 250 working days per year                                                 ║
║   = 2.5 MILLION potentially dangerous operations                              ║
║                                                                               ║
║   We cannot afford to be wrong.                                               ║
║   We cannot afford to be incomplete.                                          ║
║   We cannot afford to lose data.                                              ║
║   We cannot afford to be surprised.                                           ║
║                                                                               ║
║   THESE LAWS ARE NON-NEGOTIABLE.                                              ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

**Document Version:** 1.0
**Created:** 2026-01-25
**Location:** C:\PRISM REBUILD...\_PRISM_MASTER\PROTOCOL\01_ALWAYS_ON_LAWS.md
**Status:** IMMUTABLE - Cannot be disabled or overridden
