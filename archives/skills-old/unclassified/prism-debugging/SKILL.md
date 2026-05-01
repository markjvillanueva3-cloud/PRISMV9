---
name: prism-debugging
description: |
  Systematic debugging skill adapted from obra/superpowers for PRISM troubleshooting.
  Use when: module extraction fails, calculations produce wrong results, wiring
  doesn't connect, or any unexpected behavior occurs. Enforces methodical diagnosis
  over random trial-and-error. Triggers: extraction failure, calculation errors,
  wiring issues, unexpected behavior, validation failures.
---

# PRISM DEBUGGING SKILL v1.0
## Systematic Debugging for Manufacturing Intelligence
### Adapted from obra/superpowers for PRISM troubleshooting

---

## CORE PRINCIPLE

**DIAGNOSE BEFORE YOU FIX.**

Never make random changes hoping they'll work. Instead:
1. Understand the symptom completely
2. Form a hypothesis about the cause
3. Test the hypothesis
4. Apply targeted fix
5. Verify the fix didn't break anything else

---

## 🔍 DEBUGGING PROTOCOL

### Phase 1: OBSERVE
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

---

## PRISM-SPECIFIC DEBUG SCENARIOS

### Extraction Failure

```markdown
SYMPTOM: Module not extracting correctly

CHECKLIST:
☐ Is the source file accessible?
☐ Are we searching for the right module name?
☐ Is the line number range correct?
☐ Are there multiple definitions of the same module?
☐ Is the regex pattern matching correctly?
☐ Is the output path writable?

COMMON CAUSES:
1. Module name variation (PRISM_X vs PRISM_X_V2)
2. Module split across non-contiguous lines
3. Unicode/encoding issues in source
4. Write permission to output directory
5. Disk space full
```

### Calculation Error

```markdown
SYMPTOM: Physics/math calculation producing wrong results

CHECKLIST:
☐ Are input values correct?
☐ Are units consistent?
☐ Is the formula implemented correctly?
☐ Are there division-by-zero possibilities?
☐ Are there overflow/underflow issues?
☐ Are database lookups returning expected values?

DEBUG APPROACH:
1. Log intermediate values at each step
2. Compare with hand calculation
3. Check edge cases (zero, negative, very large)
4. Verify database values being used
5. Check unit conversions
```

### Wiring/Connection Issue

```markdown
SYMPTOM: Consumer not receiving data from database

CHECKLIST:
☐ Is the database registered with Gateway?
☐ Is the consumer registered with Gateway?
☐ Is the route defined correctly?
☐ Are the data field names matching?
☐ Is the event bus connected?
☐ Are there any error handlers swallowing errors?

DEBUG APPROACH:
1. Trace data flow step by step
2. Add logging at each junction
3. Verify Gateway route table
4. Check event bus subscriptions
5. Test with minimal consumer
```

### Validation Failure

```markdown
SYMPTOM: Material/module failing validation

CHECKLIST:
☐ Which specific validation is failing?
☐ What value is causing the failure?
☐ Is the validation rule correct?
☐ Is the data correctly formatted?
☐ Are there type mismatches?

DEBUG APPROACH:
1. Get exact validation error message
2. Inspect the failing value
3. Check validation rule definition
4. Compare with passing example
5. Test rule with known-good data
```

---

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

---

## DEBUG DOCUMENTATION TEMPLATE

```markdown
## DEBUG SESSION: [ID]

### SYMPTOM
[Exact description of what's wrong]

### EXPECTED BEHAVIOR
[What should happen instead]

### EVIDENCE
- Error: [error message]
- Input: [input values]
- Output: [output values]
- State: [relevant state]

### HYPOTHESES
1. [Most likely cause] - TESTED ✓/✗
2. [Second possibility] - TESTED ✓/✗
3. [Third possibility] - NOT TESTED

### ROOT CAUSE
[What actually caused the problem]

### FIX APPLIED
[What was changed]

### VERIFICATION
- [x] Original symptom resolved
- [x] No new issues introduced
- [x] Related tests pass

### PREVENTION
[How to prevent recurrence]
```

---

## ANTI-PATTERNS (DON'T DO THIS)

❌ Making random changes hoping something works
❌ Changing multiple things at once
❌ Not understanding the symptom before fixing
❌ Assuming you know the cause without testing
❌ Ignoring error messages
❌ "Fixing" things that aren't broken
❌ Not verifying the fix
❌ Not documenting the solution

---

## WHEN TO ESCALATE

Sometimes the problem is beyond what can be debugged in session:

```markdown
ESCALATE IF:
- Problem persists after 3 hypothesis tests
- Root cause appears to be in unfamiliar code
- Fix would require major architectural change
- Problem might be in tool/environment

ESCALATION STEPS:
1. Document everything discovered so far
2. Save current state
3. Create detailed bug report
4. Mark as blocker in CURRENT_STATE.json
5. Move to different task
```

---

## INTEGRATION WITH PRISM SKILLS

- **prism-planning**: Include debug time in estimates
- **prism-tdd**: Tests help isolate bugs
- **prism-verification**: Verification catches bugs early
- **prism-auditor**: Audit prevents bugs in extraction

---

**END OF PRISM DEBUGGING SKILL**
