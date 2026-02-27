---
name: prism-quality-gates
description: |
  Gate definitions and pass/fail criteria. Blocking vs warning gates.
---

> 🛑 **PRINCIPLE:** No module, feature, or phase advances without passing ALL gates

## GATE DEFINITIONS

### GATE 1: EXTRACTION QUALITY

Before a module is considered "extracted":

| Check | Requirement | Tool |
|-------|-------------|------|
| **Completeness** | All functions present | prism-auditor |
| **Syntax** | No parse errors | Node.js parse |
| **Dependencies** | All documented | prism-extractor |
| **Outputs** | All documented | prism-extractor |
| **Header** | Standard header present | Manual check |

**Pass Criteria:** ALL checks ✅
**Fail Action:** Re-extract or fix issues

```javascript
// Gate 1 Verification
const extractionGate = {
  moduleName: "PRISM_MATERIALS_MASTER",
  checks: {
    completeness: { pass: true, functionsFound: 25, functionsExpected: 25 },
    syntax: { pass: true, errors: 0 },
    dependencies: { pass: true, documented: 8 },
    outputs: { pass: true, documented: 12 },
    header: { pass: true }
  },
  overallPass: true,
  gatePassedAt: "2026-01-23T12:00:00Z"
};
```

### GATE 3: FEATURE QUALITY

Before a feature is marked complete:

| Check | Requirement | Tool |
|-------|-------------|------|
| **Functionality** | Works as specified | Manual test |
| **Edge Cases** | Handles boundaries | prism-tdd |
| **Error Handling** | Graceful failures | prism-debugging |
| **Performance** | <500ms calculations | Profiling |
| **UI** | 3-click rule met | Manual check |

**Pass Criteria:** ALL checks ✅
**Fail Action:** Fix issues before marking complete

## GATE STATUS TRACKING

Add to CURRENT_STATE.json:

```json
{
  "qualityGates": {
    "extraction": {
      "passed": 48,
      "failed": 0,
      "pending": 783,
      "lastGateCheck": "2026-01-23"
    },
    "migration": {
      "passed": 0,
      "failed": 0,
      "pending": 48,
      "lastGateCheck": null
    },
    "features": {
      "speedFeedCalc": "PASSED",
      "postProcessor": "PENDING",
      "quoting": "NOT_STARTED"
    },
    "release": {
      "v9.0.0": "NOT_STARTED"
    }
  }
}
```

## QUICK REFERENCE

### Before Extraction:
```
□ Check prism-monolith-index for line numbers
□ Read prism-extractor skill
□ Prepare output path
```

### After Extraction:
```
□ Run completeness check (compare function counts)
□ Verify syntax (mental parse)
□ Document dependencies and outputs
□ Add standard header
□ Mark extraction gate PASSED in state
```

### Before Migration:
```
□ Verify extraction gate passed
□ Wire ALL consumers (use prism-consumer-mapper)
□ Ensure 6+ sources for calculations
□ Register gateway routes
□ Create unit tests
□ Add XAI explanation capability
□ Mark migration gate PASSED in state
```

### Before Release:
```
□ All modules extracted (831/831)
□ All modules migrated (831/831)
□ All tests passing
□ Performance targets met
□ Security validated
□ Documentation complete
□ Mark release gate PASSED
```

## MIT FOUNDATION

**6.005 - Software Construction:**
- Testing and verification
- Specifications as contracts

**16.355J - Software Engineering:**
- Quality assurance processes
- Gate reviews and checkpoints

**2.830 - Quality Control:**
- Statistical process control
- Acceptance criteria

---

## VERSION HISTORY

| Ver | Date | Changes |
|-----|------|---------|
| 1.0 | 2026-01-23 | Initial creation with 4 gate types |
