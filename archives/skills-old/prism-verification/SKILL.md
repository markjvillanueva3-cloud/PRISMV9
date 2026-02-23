---
name: prism-verification
description: |
  Verification-before-completion skill adapted from obra/superpowers for PRISM
  quality assurance. NEVER mark anything complete without verification. Use when:
  finishing extractions, completing materials, wiring consumers, or ending sessions.
  Prevents incomplete work from being marked done. Triggers: completing extraction,
  finishing materials, wiring completion, session end, marking done.
---

# PRISM VERIFICATION SKILL v1.0
## Verification Before Completion
### Adapted from obra/superpowers for PRISM quality assurance

---

## CORE PRINCIPLE

**NOTHING IS COMPLETE UNTIL VERIFIED.**

Every piece of work must pass verification before being marked done:
1. Define verification criteria BEFORE starting
2. Execute verification checks AFTER finishing
3. Only mark complete when ALL checks pass
4. Document any exceptions

---

## 🛡️ VERIFICATION PROTOCOL

### Pre-Completion Checklist

```markdown
BEFORE marking ANYTHING as complete, verify:

☐ Work matches original objective?
☐ All success criteria met?
☐ Output exists and is accessible?
☐ Output is valid (no corruption)?
☐ No regressions introduced?
☐ Documentation updated?
☐ State file updated?
```

---

## VERIFICATION BY WORK TYPE

### Material Entry Verification

```markdown
## MATERIAL [ID] VERIFICATION

### Structure Checks
☐ Has all 127 parameters
☐ All required fields present (id, name, category)
☐ No null/undefined in required fields

### Data Validity
☐ Composition sums to 100% (±0.1%)
☐ kc1_1 in range 500-5000 MPa
☐ mc in range 0.1-0.5
☐ taylor_n in range 0.1-0.5
☐ density > 0 kg/m³
☐ temperatures in reasonable ranges

### Consistency Checks
☐ Solidus ≤ Liquidus
☐ Properties consistent with material family
☐ No copy-paste errors from template

### Format Checks
☐ JSON/JS syntax valid
☐ No trailing commas
☐ Proper encoding (UTF-8)

VERIFICATION RESULT: PASS / FAIL
```

### Module Extraction Verification

```markdown
## MODULE [NAME] VERIFICATION

### Completeness
☐ All functions extracted
☐ All data tables extracted
☐ No truncation
☐ Dependencies documented
☐ Consumers identified (min 6)

### Syntax
☐ No JavaScript errors
☐ All brackets matched
☐ No undefined references

### Functionality
☐ Module initializes without error
☐ Main functions callable
☐ Returns expected types

### Documentation
☐ Header comments present
☐ Function descriptions
☐ Parameter types documented
☐ Consumer list documented

VERIFICATION RESULT: PASS / FAIL
```

### Consumer Wiring Verification

```markdown
## WIRING [DATABASE → CONSUMER] VERIFICATION

### Connection
☐ Consumer registered with Gateway
☐ Route defined correctly
☐ Event subscriptions active

### Data Flow
☐ Request reaches database
☐ Response reaches consumer
☐ Data format matches expectation

### Error Handling
☐ Null/missing data handled
☐ Invalid input handled
☐ Timeout handled

### Performance
☐ Response time acceptable (<500ms)
☐ No memory leaks
☐ No infinite loops

VERIFICATION RESULT: PASS / FAIL
```

### Session Completion Verification

```markdown
## SESSION [ID] VERIFICATION

### Objectives
☐ All planned tasks attempted
☐ Success criteria checked
☐ Blockers documented

### Files
☐ All files saved to C: drive
☐ Files readable/not corrupted
☐ File sizes reasonable

### State
☐ CURRENT_STATE.json updated
☐ Session log written
☐ Next session planned

### Quality
☐ No known bugs left unfixed
☐ No partial work unmarked
☐ Documentation current

VERIFICATION RESULT: PASS / FAIL
```

---

## VERIFICATION COMMANDS

### Quick Verification Functions

```javascript
// Verify file exists and has content
async function verifyFile(path) {
  const info = await getFileInfo(path);
  return {
    exists: info !== null,
    size: info?.size || 0,
    readable: info?.size > 0,
    path: path
  };
}

// Verify material has required parameters
function verifyMaterial(material) {
  const required = ['id', 'name', 'category', 'kc1_1', 'mc', 'physical', 'thermal'];
  const missing = required.filter(f => !material[f]);
  const paramCount = countAllParameters(material);
  
  return {
    valid: missing.length === 0 && paramCount >= 127,
    missing: missing,
    parameterCount: paramCount,
    complete: paramCount >= 127
  };
}

// Verify module extraction
function verifyModule(module) {
  const checks = {
    exists: module !== null,
    hasFunctions: typeof module.init === 'function',
    hasData: Object.keys(module).length > 5,
    hasDependencies: Array.isArray(module._dependencies),
    hasConsumers: Array.isArray(module._consumers) && module._consumers.length >= 6
  };
  
  return {
    valid: Object.values(checks).every(v => v),
    checks: checks
  };
}

// Verify state file is current
function verifyState(state) {
  const now = new Date();
  const lastUpdate = new Date(state.meta.lastUpdated);
  const hoursSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60);
  
  return {
    current: hoursSinceUpdate < 1,
    lastUpdated: state.meta.lastUpdated,
    hoursSinceUpdate: hoursSinceUpdate
  };
}
```

---

## VERIFICATION WORKFLOW

### During Work

```markdown
1. Complete atomic unit of work
2. Run verification for that unit
3. If PASS: Mark complete, continue
4. If FAIL: Fix issues, re-verify
5. Never proceed with failed verification
```

### At Session End

```markdown
1. List all work completed this session
2. Run verification for EACH item
3. Compile verification report
4. Only mark session complete if ALL pass
5. Document any exceptions
```

---

## VERIFICATION REPORT TEMPLATE

```markdown
# VERIFICATION REPORT
## Session: [ID]
## Date: [DATE]

### Summary
- Items verified: [N]
- Passed: [P]
- Failed: [F]
- Overall: PASS / FAIL

### Detailed Results

| Item | Type | Result | Notes |
|------|------|--------|-------|
| P-CS-031 | Material | PASS | 127/127 params |
| P-CS-032 | Material | FAIL | Missing thermal |
| PRISM_MATERIALS | Module | PASS | All checks OK |

### Failed Items
[List any failures with details]

### Remediation
[What was done to fix failures]

### Final Status
☐ All items verified
☐ All failures resolved
☐ Session can be marked complete
```

---

## VERIFICATION GATES

### Gate 1: Save Gate
Before saving any file:
```
☐ Content is complete
☐ Format is valid
☐ Path is correct
```

### Gate 2: Completion Gate
Before marking work complete:
```
☐ All verification checks pass
☐ No known issues
☐ Documentation updated
```

### Gate 3: Session Gate
Before ending session:
```
☐ All work verified
☐ State file updated
☐ Session log written
```

---

## ANTI-PATTERNS (DON'T DO THIS)

❌ Marking complete without verification
❌ Skipping verification "to save time"
❌ Ignoring failed verifications
❌ Partial verification (only checking some items)
❌ Verification without documented criteria
❌ Proceeding after failed gate
❌ "It probably works" assumption

---

## ESCALATION FOR VERIFICATION FAILURES

```markdown
IF verification fails and cannot be fixed:

1. Document the failure in detail
2. Mark item as INCOMPLETE (not failed)
3. Add to blockers in CURRENT_STATE.json
4. Continue with other work
5. Return to failed items in future session

NEVER mark failed items as complete.
```

---

## INTEGRATION WITH PRISM SKILLS

- **prism-tdd**: TDD provides verification criteria
- **prism-planning**: Plan includes verification steps
- **prism-debugging**: Debug verification failures
- **prism-auditor**: Audit is comprehensive verification

---

**END OF PRISM VERIFICATION SKILL**
