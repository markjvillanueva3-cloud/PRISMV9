---
name: prism-verification
description: |
  Verification protocols and evidence requirements.
---

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

## ANTI-PATTERNS (DON'T DO THIS)

❌ Marking complete without verification
❌ Skipping verification "to save time"
❌ Ignoring failed verifications
❌ Partial verification (only checking some items)
❌ Verification without documented criteria
❌ Proceeding after failed gate
❌ "It probably works" assumption

## INTEGRATION WITH PRISM SKILLS

- **prism-tdd**: TDD provides verification criteria
- **prism-planning**: Plan includes verification steps
- **prism-debugging**: Debug verification failures
- **prism-auditor**: Audit is comprehensive verification

---

**END OF PRISM VERIFICATION SKILL**
