---
name: prism-debugging
description: |
  General debugging patterns and techniques.
---

```markdown
## 1. DOCUMENT THE SYMPTOM
- What exactly is happening?
- What should be happening instead?
- When did it start failing?
- What was the last successful state?

## 2. GATHER EVIDENCE
- Error messages (exact text)
- Stack traces
- Input values
- Output values
- State file contents
- Related file contents
```

### Phase 2: HYPOTHESIZE
```markdown
## 3. FORM HYPOTHESES
List ALL possible causes (don't stop at the first one):

| # | Hypothesis | Probability | Evidence For | Evidence Against |
|---|-----------|-------------|--------------|------------------|
| 1 |           |             |              |                  |
| 2 |           |             |              |                  |
| 3 |           |             |              |                  |

## 4. RANK BY LIKELIHOOD
Consider:
- What changed recently?
- What's the simplest explanation?
- What has failed before?
```

### Phase 3: TEST
```markdown
## 5. TEST MOST LIKELY HYPOTHESIS
- Design a test that proves/disproves hypothesis
- Execute test
- Record results
- If disproved, move to next hypothesis

## 6. ISOLATE THE PROBLEM
- Minimum reproduction case
- Remove unrelated complexity
- Pinpoint exact location
```

### Phase 4: FIX
```markdown
## 7. APPLY TARGETED FIX
- Change ONLY what's needed
- Don't "clean up" unrelated code
- Document what you changed

## 8. VERIFY FIX
- Does original symptom disappear?
- Do all related tests pass?
- No new symptoms introduced?
```

### Phase 5: PREVENT
```markdown
## 9. ROOT CAUSE ANALYSIS
- Why did this happen?
- How can we prevent recurrence?
- Should we add a test?

## 10. UPDATE DOCUMENTATION
- Add to known issues if recurring
- Update relevant skill files
- Share learnings
```

## DEBUG TOOLS & TECHNIQUES

### Logging Strategy

```javascript
// Structured logging for debugging
function debugLog(context, message, data) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${context}] ${message}`, data);
}

// Usage
debugLog('EXTRACTION', 'Starting module extraction', { moduleName, lineStart });
debugLog('CALCULATION', 'Force calculation', { input, output, intermediate });
debugLog('WIRING', 'Consumer registration', { consumer, database, route });
```

### Assertion Pattern

```javascript
// Fail fast with clear messages
function assertValid(condition, message, context) {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}\nContext: ${JSON.stringify(context)}`);
  }
}

// Usage
assertValid(material.kc1_1 > 0, 'kc1_1 must be positive', { material: material.id });
assertValid(consumers.length >= 6, 'Minimum 6 consumers required', { count: consumers.length });
```

### Binary Search Isolation

```markdown
When problem is in large code/data:

1. Divide the suspect area in half
2. Test each half independently
3. Problem is in the failing half
4. Repeat until isolated to smallest unit

Example for extraction:
- Extract first half of module
- Does it work? Yes → problem in second half
- Does it work? No → problem in first half
- Continue halving until exact line found
```

### Diff Analysis

```markdown
When something stopped working:

1. Find last known-good state
2. Compare current state to known-good
3. Identify all differences
4. Evaluate which differences could cause symptom
5. Test reverting suspicious differences
```

## ANTI-PATTERNS (DON'T DO THIS)

❌ Making random changes hoping something works
❌ Changing multiple things at once
❌ Not understanding the symptom before fixing
❌ Assuming you know the cause without testing
❌ Ignoring error messages
❌ "Fixing" things that aren't broken
❌ Not verifying the fix
❌ Not documenting the solution

## INTEGRATION WITH PRISM SKILLS

- **prism-planning**: Include debug time in estimates
- **prism-tdd**: Tests help isolate bugs
- **prism-verification**: Verification catches bugs early
- **prism-auditor**: Audit prevents bugs in extraction

---

**END OF PRISM DEBUGGING SKILL**
