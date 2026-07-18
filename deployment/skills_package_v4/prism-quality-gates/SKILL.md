---
name: prism-quality-gates
description: |
  Quality gates for PRISM development stages. Defines pass/fail criteria before 
  progressing to next phase. Use when completing extractions, migrations, or 
  features to verify readiness before proceeding.
  
  MIT Foundation: 6.005 (Software Construction), 16.355J (Software Engineering), 2.830 (Quality Control)
---

# PRISM Quality Gates Skill

> 🛑 **PRINCIPLE:** No module, feature, or phase advances without passing ALL gates

---

## PURPOSE

Quality gates enforce minimum standards at key development checkpoints:
1. **Extraction Gates** - Verify modules extracted completely
2. **Migration Gates** - Verify 100% utilization before import
3. **Feature Gates** - Verify features work correctly
4. **Release Gates** - Verify build is production-ready

---

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

---

### GATE 2: MIGRATION QUALITY

Before a module is imported to new architecture:

| Check | Requirement | Tool |
|-------|-------------|------|
| **Consumers** | Min consumers wired | prism-consumer-mapper |
| **6+ Sources** | Calculations use 6+ sources | prism-utilization |
| **Gateway Routes** | All routes registered | Manual check |
| **Tests** | Unit tests exist | prism-tdd |
| **XAI** | Explanation available | Manual check |

**Pass Criteria:** ALL checks ✅
**Fail Action:** Wire more consumers or add missing requirements

```javascript
// Gate 2 Verification
const migrationGate = {
  moduleName: "PRISM_MATERIALS_MASTER",
  checks: {
    consumers: { pass: true, count: 15, required: 15 },
    sixSources: { pass: true, calculations: 8, allUseSix: true },
    gatewayRoutes: { pass: true, routes: 12 },
    tests: { pass: true, coverage: "85%" },
    xai: { pass: true }
  },
  overallPass: true,
  gatePassedAt: "2026-01-25T12:00:00Z"
};
```

---

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

---

### GATE 4: RELEASE QUALITY

Before a build is released:

| Check | Requirement | Tool |
|-------|-------------|------|
| **All Modules** | 100% extraction complete | prism-auditor |
| **Utilization** | 100% for all DBs | prism-utilization |
| **Tests** | All passing | Test suite |
| **Performance** | <2s page load | Lighthouse |
| **Security** | Input validation | prism-validator |
| **Documentation** | Up to date | Manual check |

**Pass Criteria:** ALL checks ✅
**Fail Action:** Fix all issues before release

---

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

---

## CONSUMER MAPPING (Utilization Matrix)

This skill integrates with prism-utilization and prism-consumer-mapper.

### Skill → Consumer Mapping

| Skill | Primary Consumers | Min Uses |
|-------|------------------|----------|
| prism-quality-gates | Stage transitions, CURRENT_STATE.json | 4 |
| prism-extractor | All 831 module extractions | 831 |
| prism-auditor | All extracted modules | 831 |
| prism-utilization | All migrations | 831 |
| prism-consumer-mapper | All DB wiring | 62 |

### Gate → Action Mapping

| Gate | Triggers When | Actions |
|------|--------------|---------|
| Extraction | Module extracted | Update extraction progress |
| Migration | Module to be imported | Verify consumers, update migration progress |
| Feature | Feature complete | Update feature status |
| Release | Build candidate | Full validation suite |

---

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

---

## INTEGRATION

| Skill | Relationship |
|-------|--------------|
| `prism-auditor` | Provides extraction verification |
| `prism-utilization` | Provides consumer counts |
| `prism-consumer-mapper` | Wires consumers |
| `prism-tdd` | Provides test coverage |
| `prism-state-manager` | Stores gate status |

---

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
