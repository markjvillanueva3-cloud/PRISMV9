---
name: prism-sp-debugging
description: |
  4-phase debugging process. Evidence collection, root cause, hypothesis testing, fix with prevention.
---

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           4-PHASE DEBUGGING QUICK REFERENCE                             │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  PHASE 1: EVIDENCE COLLECTION                                                           │
│  ☐ Reproduce issue 3+ times                                                             │
│  ☐ Log data at every boundary                                                           │
│  ☐ Capture full stack trace                                                             │
│  ☐ Document environment                                                                 │
│                                                                                         │
│  PHASE 2: ROOT CAUSE TRACING                                                            │
│  ☐ Trace backward through call chain                                                    │
│  ☐ Find FIRST corruption point                                                          │
│  ☐ Document root cause with evidence                                                    │
│                                                                                         │
│  PHASE 3: HYPOTHESIS TESTING                                                            │
│  ☐ Form clear hypothesis                                                                │
│  ☐ Create minimal test                                                                  │
│  ☐ Validate hypothesis                                                                  │
│                                                                                         │
│  PHASE 4: FIX + PREVENTION                                                              │
│  ☐ Fix at root cause location                                                           │
│  ☐ Add Layer 1: Input validation                                                        │
│  ☐ Add Layer 2: Invariant check                                                         │
│  ☐ Add Layer 3: Output validation                                                       │
│  ☐ Add Layer 4: Regression test                                                         │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 2.2 Process Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           MANDATORY 4-PHASE DEBUGGING FLOW                              │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  BUG REPORTED                                                                           │
│       │                                                                                 │
│       ▼                                                                                 │
│  ╔═══════════════════════════════════════════════════════════════════════════════════╗ │
│  ║ PHASE 1: EVIDENCE COLLECTION                                                      ║ │
│  ║ • Reproduce issue consistently (minimum 3 times)                                  ║ │
│  ║ • Log data at EVERY module boundary                                               ║ │
│  ║ • Capture FULL error stack trace                                                  ║ │
│  ║ • Document environment state                                                      ║ │
│  ║                                                                                   ║ │
│  ║ EXIT: Issue reproduced, boundaries logged, evidence documented                    ║ │
│  ╚═══════════════════════════════════════════════════════════════════════════════════╝ │
│       │                                                                                 │
│       │ ⛔ CHECKPOINT: Phase 1 exit criteria met?                                       │
│       │    ☐ YES → Continue    ☐ NO → Complete Phase 1 first                           │
│       ▼                                                                                 │
│  ╔═══════════════════════════════════════════════════════════════════════════════════╗ │
│  ║ PHASE 2: ROOT CAUSE TRACING                                                       ║ │
│  ║ • Trace BACKWARD through call chain                                               ║ │
│  ║ • Find FIRST point where data becomes corrupted                                   ║ │
│  ║ • Don't stop at symptoms - keep tracing to origin                                 ║ │
│  ║ • Document root cause with evidence                                               ║ │
│  ║                                                                                   ║ │
│  ║ EXIT: Root cause identified with evidence                                         ║ │
│  ╚═══════════════════════════════════════════════════════════════════════════════════╝ │
│       │                                                                                 │
│       │ ⛔ CHECKPOINT: Phase 2 exit criteria met?                                       │
│       │    ☐ YES → Continue    ☐ NO → Complete Phase 2 first                           │
│       ▼                                                                                 │
│  ╔═══════════════════════════════════════════════════════════════════════════════════╗ │
│  ║ PHASE 3: HYPOTHESIS TESTING                                                       ║ │
│  ║ • Form clear hypothesis: "The bug is caused by X"                                 ║ │
│  ║ • Create MINIMAL test that proves/disproves                                       ║ │
│  ║ • Execute test                                                                    ║ │
│  ║                                                                                   ║ │
│  ║ If DISPROVED → Return to Phase 2, trace deeper                                    ║ │
│  ║ If CONFIRMED → Continue to Phase 4                                                ║ │
│  ║                                                                                   ║ │
│  ║ EXIT: Hypothesis validated with evidence                                          ║ │
│  ╚═══════════════════════════════════════════════════════════════════════════════════╝ │
│       │                                                                                 │
│       │ ⛔ CHECKPOINT: Hypothesis confirmed?                                            │
│       │    ☐ YES → Continue    ☐ NO → Return to Phase 2                                │
│       ▼                                                                                 │
│  ╔═══════════════════════════════════════════════════════════════════════════════════╗ │
│  ║ PHASE 4: FIX + PREVENTION (Defense-in-Depth)                                      ║ │
│  ║ • Fix at ROOT CAUSE location (not at symptom)                                     ║ │
│  ║ • Add Layer 1: Input validation BEFORE root cause                                 ║ │
│  ║ • Add Layer 2: Invariant check AT processing                                      ║ │
│  ║ • Add Layer 3: Output validation AFTER                                            ║ │
│  ║ • Add Layer 4: Regression test                                                    ║ │
│  ║                                                                                   ║ │
│  ║ EXIT: Fix applied, 3+ prevention layers, regression test                          ║ │
│  ╚═══════════════════════════════════════════════════════════════════════════════════╝ │
│       │                                                                                 │
│       ▼                                                                                 │
│  ╔═══════════════════════════════════════════════════════════════════════════════════╗ │
│  ║ VERIFICATION                                                                      ║ │
│  ║ • Original issue no longer reproduces                                             ║ │
│  ║ • All prevention layers in place                                                  ║ │
│  ║ • Regression test passes                                                          ║ │
│  ║                                                                                   ║ │
│  ║ → Bug resolved, proceed to SP.1.7 verification                                    ║ │
│  ╚═══════════════════════════════════════════════════════════════════════════════════╝ │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 2.3 Phase Exit Criteria

Each phase has strict exit criteria. You CANNOT proceed until ALL criteria are met.

### Phase 1 Exit Criteria
| Criterion | Required | Evidence |
|-----------|----------|----------|
| Issue reproduced | ≥3 times consistently | Reproduction log |
| Boundaries logged | Every module boundary | Log output |
| Stack trace captured | Complete trace | Error output |
| Environment documented | Full context | Snapshot |

### Phase 2 Exit Criteria
| Criterion | Required | Evidence |
|-----------|----------|----------|
| Call chain traced | Backward from error | Trace diagram |
| First corruption found | Specific location | Data comparison |
| Root cause documented | Clear statement | Written explanation |
| Evidence provided | Proof of root cause | Code/data snapshot |

### Phase 3 Exit Criteria
| Criterion | Required | Evidence |
|-----------|----------|----------|
| Hypothesis formed | Clear, testable | Written statement |
| Minimal test created | Isolates issue | Test code |
| Test executed | With result | Test output |
| Hypothesis status | Confirmed or disproved | Evidence |

### Phase 4 Exit Criteria
| Criterion | Required | Evidence |
|-----------|----------|----------|
| Fix applied | At root cause | Code diff |
| Layer 1 added | Input validation | Code |
| Layer 2 added | Invariant check | Code |
| Layer 3 added | Output validation | Code |
| Regression test | Catches bug | Test code |
| Issue resolved | No longer reproduces | Verification |

## 2.4 Time Allocation Guidance

| Phase | Typical Time | Purpose |
|-------|--------------|---------|
| Phase 1 | 20-30% | Collect complete evidence |
| Phase 2 | 30-40% | Find TRUE root cause |
| Phase 3 | 10-15% | Validate hypothesis |
| Phase 4 | 20-30% | Fix + prevention |

**Key Insight:** Most debugging time should be in Phases 1-2 (evidence and tracing). If you're spending most time in Phase 4 (fixing), you probably skipped phases and are fixing symptoms.

## 2.5 Bug Report Template

Before starting Phase 1, document what you know:

```markdown
## BUG REPORT: [BRIEF TITLE]

**Reported:** [YYYY-MM-DD HH:MM]
**Reporter:** [who found it]
**Severity:** ☐ Critical / ☐ High / ☐ Medium / ☐ Low

### Observed Behavior
[What actually happened - be specific]

### Expected Behavior
[What should have happened]

### Reproduction Steps (if known)
1. [Step 1]
2. [Step 2]
3. [Step 3]
4. [Observe error]

### Error Output
```
[Paste full error message / stack trace if available]
```

### Environment
- Files involved: [list]
- Recent changes: [list any recent modifications]
- State: [relevant application state]

### Initial Observations
[Any immediate thoughts - but remember, these are NOT conclusions]
```

# SECTION 4: PHASE 2 - ROOT CAUSE TRACING

## 4.1 Purpose

Find where the data FIRST becomes corrupted. The error you see is a symptom. The root cause is upstream.

**Mindset:** "The error location is NOT the root cause. I must trace backward."

## 4.2 The Trace-Backward Method

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           TRACE-BACKWARD METHOD                                         │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  START HERE: Error thrown                                                               │
│       │                                                                                 │
│       ▼                                                                                 │
│  ┌─────────────────────────────────────────┐                                            │
│  │ SYMPTOM: "Cannot read property 'x'"     │ ← You SEE the error here                  │
│  │ Location: processor.js:156              │                                            │
│  └─────────────────────────────────────────┘                                            │
│       │                                                                                 │
│       │ Ask: "Where did this data come from?"                                           │
│       ▼                                                                                 │
│  ┌─────────────────────────────────────────┐                                            │
│  │ Data came from: validator.js:89         │                                            │
│  │ Was data corrupted here? CHECK          │                                            │
│  └─────────────────────────────────────────┘                                            │
│       │                                                                                 │
│       │ Data was already bad? Keep tracing backward                                     │
│       ▼                                                                                 │
│  ┌─────────────────────────────────────────┐                                            │
│  │ Data came from: loader.js:45            │                                            │
│  │ Was data corrupted here? CHECK          │                                            │
│  └─────────────────────────────────────────┘                                            │
│       │                                                                                 │
│       │ Data was already bad? Keep tracing backward                                     │
│       ▼                                                                                 │
│  ┌─────────────────────────────────────────┐                                            │
│  │ Data came from: parser.js:23            │                                            │
│  │ Was data corrupted here? CHECK          │                                            │
│  │                                         │                                            │
│  │ ★ DATA FIRST BECOMES WRONG HERE ★       │ ← ROOT CAUSE                              │
│  └─────────────────────────────────────────┘                                            │
│                                                                                         │
│  RULE: Keep tracing until you find where GOOD data becomes BAD data.                    │
│        That transition point is the root cause.                                         │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 4.3 Root Cause Tracing Steps

### Step 1: Start at the Error
```markdown
### Starting Point: Error Location

**Error thrown at:** [file:line]
**Error message:** [exact message]
**Variable/data that caused error:** [what was null/undefined/wrong]

**Current value:** [what the data IS]
**Expected value:** [what the data SHOULD BE]
```

### Step 2: Trace One Level Back
```markdown
### Trace Level 1

**Current location:** [file:line]
**Data came from:** [where did this data originate]

**Check: Was data already wrong when it arrived here?**

Method: Add log BEFORE this function processes the data
```javascript
console.log('[TRACE L1] Input data:', JSON.stringify(data));
```

**Result:**
- Input was already wrong: ☐ YES → Trace deeper
- Input was correct, output wrong: ☐ → Bug is HERE
```

### Step 3: Continue Until Root Found
```markdown
### Trace Level N

**Current location:** [file:line]
**Data came from:** [source]

**Input data at this point:**
```
[log output showing input]
```

**Output data at this point:**
```
[log output showing output]
```

**Analysis:**
- Input correct: ☐ YES / ☐ NO
- Output correct: ☐ YES / ☐ NO
- Corruption happens HERE: ☐ YES / ☐ NO
```

### Step 4: Identify Root Cause
```markdown
### ROOT CAUSE IDENTIFIED

**Location:** [file:line:function]

**What happens:**
[Description of what the code does wrong]

**Before this point:**
Data is: [correct state]

**After this point:**
Data is: [corrupted state]

**Why this is the ROOT cause (not a symptom):**
[Explanation of why this is the FIRST point of corruption]
```

## 4.4 Root Cause Tracing Template

```markdown
## PHASE 2: ROOT CAUSE TRACING

### Error Starting Point
- **Error:** [error message]
- **Location:** [file:line]
- **Bad data:** [what's wrong]

### Call Chain (Backward Trace)

```
ERROR: [file:line] ← SYMPTOM (we see error here)
    ↑
    │ Data came from:
    │
LEVEL 1: [file:line]
    Input: [was it already wrong?] ☐ YES / ☐ NO
    ↑
    │ Data came from:
    │
LEVEL 2: [file:line]
    Input: [was it already wrong?] ☐ YES / ☐ NO
    ↑
    │ Data came from:
    │
LEVEL 3: [file:line]
    Input: [was it already wrong?] ☐ YES / ☐ NO
    ↑
    │
★ ROOT CAUSE: [file:line]
    Input was CORRECT
    Output is WRONG
    Corruption happens HERE
```

### Root Cause Analysis

**Root Cause Location:** [file:line:function]

**What the code does:**
```javascript
// The problematic code
[code snippet]
```

**Why it's wrong:**
[Explanation]

**Evidence:**
- Input to this function: [show correct input]
- Output from this function: [show corrupted output]
- The transformation that corrupts: [what happens]

### Root Cause Statement

"The bug is caused by **[SPECIFIC CAUSE]** in **[LOCATION]** because **[REASON]**."

Example: "The bug is caused by **missing null check** in **parser.js:23** because **the API sometimes returns null for optional fields, but the parser assumes all fields are present**."

### EXIT CRITERIA CHECK
- [ ] Traced backward through entire call chain
- [ ] Found FIRST point of data corruption
- [ ] Root cause documented with code reference
- [ ] Evidence shows input correct, output wrong at root cause
- [ ] Root cause statement is clear and actionable

**PHASE 2 COMPLETE:** ☐ YES - Proceed to Phase 3
```

## 4.5 Root Cause Patterns

### Pattern 1: Missing Validation
```
Root cause: Data enters system without validation
Symptom: Crash later when bad data is used
Trace: Error → Processing → Loading → ★ Input (no validation)
```

### Pattern 2: Incorrect Transformation
```
Root cause: Function transforms data incorrectly
Symptom: Wrong output downstream
Trace: Error → Consumer → ★ Transformer (wrong logic)
```

### Pattern 3: State Corruption
```
Root cause: Shared state modified incorrectly
Symptom: Intermittent errors, race conditions
Trace: Error → Reader → ★ Writer (corrupts shared state)
```

### Pattern 4: Assumption Violation
```
Root cause: Code assumes condition that isn't always true
Symptom: Works sometimes, fails others
Trace: Error → User → ★ Assumption (not validated)
```

### Pattern 5: Missing Error Handling
```
Root cause: Error not caught, propagates
Symptom: Unhandled exception
Trace: Error → Caller → ★ Callee (throws without handling)
```

## 4.6 Tracing Tools

### Add Trace Logging
```javascript
// Temporary trace logging
function traceFunction(name, fn) {
  return function(...args) {
    const inputStr = JSON.stringify(args);
    console.log(`[TRACE] ${name} INPUT:`, inputStr.slice(0, 500));
    
    const result = fn.apply(this, args);
    
    const outputStr = JSON.stringify(result);
    console.log(`[TRACE] ${name} OUTPUT:`, outputStr.slice(0, 500));
    
    return result;
  };
}
```

### Check Data at Point
```javascript
// Quick data validation check
function checkData(label, data, expected) {
  const actual = typeof data;
  const hasRequired = expected.every(key => key in data);
  console.log(`[CHECK ${label}]`, {
    type: actual,
    hasRequired,
    keys: Object.keys(data || {}),
    sample: JSON.stringify(data).slice(0, 200)
  });
}
```

## 4.7 Common Phase 2 Mistakes

| Mistake | Problem | Correct Approach |
|---------|---------|------------------|
| Stopping at symptom | Bug recurs | Trace to FIRST corruption |
| Assuming root cause | May be wrong | Follow evidence, not assumptions |
| Not checking inputs | Miss where data went wrong | Log input AND output at each level |
| Tracing forward | Inefficient, may miss branch | Always trace BACKWARD from error |
| Skipping levels | Miss intermediate corruption | Check EVERY level in call chain |

## 4.8 When Root Cause Isn't Obvious

If you can't find the root cause:
1. Add MORE boundary logging
2. Check for race conditions (timing issues)
3. Look for external factors (file system, network, user input)
4. Consider state that persists between calls
5. Check for differences in environment
6. Ask: "What assumption am I making that might be wrong?"

# SECTION 6: PHASE 4 - FIX + PREVENTION (Defense-in-Depth)

## 6.1 Purpose

Fix the bug at its ROOT CAUSE and add multiple prevention layers so it can NEVER happen again.

**Mindset:** "One fix is not enough. I need defense-in-depth."

## 6.2 Defense-in-Depth Strategy

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           DEFENSE-IN-DEPTH LAYERS                                       │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  DATA FLOW:                                                                             │
│                                                                                         │
│  Input ──► [LAYER 1] ──► Processing ──► [LAYER 2] ──► Output ──► [LAYER 3]             │
│              │                            │                        │                    │
│              ▼                            ▼                        ▼                    │
│         Input                        Invariant                 Output                   │
│         Validation                   Checking                  Validation               │
│                                                                                         │
│                                    + [LAYER 4]                                          │
│                                    Regression                                           │
│                                    Test                                                 │
│                                                                                         │
│  ═══════════════════════════════════════════════════════════════════════════════════   │
│                                                                                         │
│  LAYER 1: PREVENT bad data from entering                                                │
│           Validate ALL inputs before processing                                         │
│           Reject invalid data at the door                                               │
│                                                                                         │
│  LAYER 2: DETECT corruption during processing                                           │
│           Assert invariants that should always be true                                  │
│           Catch problems as they happen                                                 │
│                                                                                         │
│  LAYER 3: VERIFY output is valid before returning                                       │
│           Don't return garbage data                                                     │
│           Fail gracefully if output is bad                                              │
│                                                                                         │
│  LAYER 4: CATCH regression if bug returns                                               │
│           Automated test that triggers the exact bug                                    │
│           Fails CI/CD if bug reappears                                                  │
│                                                                                         │
│  MINIMUM REQUIREMENT: 3 layers after every bug fix                                      │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 6.3 The Fix

### Fix Location Rule
**FIX AT THE ROOT CAUSE, NOT AT THE SYMPTOM**

```
❌ WRONG: Fix at symptom location
   Error at line 100 → Add null check at line 100
   Problem: Data was already corrupted before line 100

✅ RIGHT: Fix at root cause location
   Root cause at line 45 → Fix the actual problem at line 45
   Result: Data is never corrupted, line 100 never sees bad data
```

### Fix Documentation Template

```markdown
## THE FIX

### Root Cause Location
**File:** [filename]
**Line:** [line number]
**Function:** [function name]

### Problem
[What the code does wrong]

### Solution
[What the fix does]

### Before (Buggy Code)
```javascript
// The problematic code
[old code]
```

### After (Fixed Code)
```javascript
// The corrected code
[new code]
```

### Why This Fix Works
[Explanation of why this addresses the root cause]
```

## 6.4 Layer 1: Input Validation

Add validation BEFORE the root cause point to prevent bad data from ever reaching it.

### Input Validation Template

```javascript
// LAYER 1: Input Validation
// Location: BEFORE root cause point
// Purpose: Prevent bad data from entering

function processData(input) {
  // === LAYER 1: INPUT VALIDATION ===
  
  // Check for null/undefined
  if (input === null || input === undefined) {
    throw new ValidationError('Input cannot be null or undefined');
  }
  
  // Check type
  if (typeof input !== 'object') {
    throw new ValidationError(`Expected object, got ${typeof input}`);
  }
  
  // Check required fields
  const required = ['id', 'name', 'value'];
  for (const field of required) {
    if (!(field in input)) {
      throw new ValidationError(`Missing required field: ${field}`);
    }
  }
  
  // Check value ranges
  if (input.value < 0 || input.value > 1000) {
    throw new ValidationError(`Value ${input.value} out of range [0, 1000]`);
  }
  
  // === Input validated, proceed with processing ===
  // ...
}
```

### Layer 1 Checklist

```markdown
## LAYER 1: INPUT VALIDATION

**Location added:** [file:line]
**Validates against bug:** [how it would have caught this bug]

**Validation checks added:**
- [ ] Null/undefined check
- [ ] Type check
- [ ] Required fields check
- [ ] Value range check
- [ ] Format validation (if applicable)

**Code added:**
```javascript
[validation code]
```
```

## 6.5 Layer 2: Invariant Checking

Add assertions AT the processing point to catch corruption as it happens.

### Invariant Checking Template

```javascript
// LAYER 2: Invariant Checking
// Location: AT processing point
// Purpose: Catch corruption during processing

function transform(data) {
  // Process the data
  const result = doTransformation(data);
  
  // === LAYER 2: INVARIANT CHECK ===
  
  // Assert result has expected structure
  console.assert(result !== null, 'Transform result should never be null');
  console.assert('output' in result, 'Transform result must have output field');
  
  // Assert result values are sane
  console.assert(
    isFinite(result.output),
    `Transform output must be finite, got ${result.output}`
  );
  
  // Assert invariants that should always be true
  console.assert(
    result.output >= 0,
    `Transform output must be non-negative, got ${result.output}`
  );
  
  return result;
}

// For production, use a proper assertion function
function invariant(condition, message) {
  if (!condition) {
    throw new InvariantViolationError(message);
  }
}
```

### Layer 2 Checklist

```markdown
## LAYER 2: INVARIANT CHECKING

**Location added:** [file:line]
**Validates against bug:** [how it would have caught this bug]

**Invariants asserted:**
- [ ] Result not null/undefined
- [ ] Result has expected structure
- [ ] Values are within expected ranges
- [ ] Relationships between values hold

**Code added:**
```javascript
[invariant checking code]
```
```

## 6.6 Layer 3: Output Validation

Verify the output is valid BEFORE returning it to callers.

### Output Validation Template

```javascript
// LAYER 3: Output Validation
// Location: AFTER processing, BEFORE return
// Purpose: Don't return bad data

function computeResult(input) {
  // Process
  const result = doComputation(input);
  
  // === LAYER 3: OUTPUT VALIDATION ===
  
  // Validate result before returning
  if (!isValidResult(result)) {
    // Log for debugging
    console.error('Invalid computation result:', {
      input,
      result,
      validation: validateResult(result)
    });
    
    // Either throw or return safe default
    throw new OutputValidationError('Computation produced invalid result');
    // OR: return SAFE_DEFAULT_RESULT;
  }
  
  return result;
}

function isValidResult(result) {
  return (
    result !== null &&
    result !== undefined &&
    typeof result.value === 'number' &&
    isFinite(result.value) &&
    result.value >= 0
  );
}
```

### Layer 3 Checklist

```markdown
## LAYER 3: OUTPUT VALIDATION

**Location added:** [file:line]
**Validates against bug:** [how it would have caught this bug]

**Output checks added:**
- [ ] Result not null/undefined
- [ ] Result type correct
- [ ] Result values in valid range
- [ ] Result structure complete

**Failure handling:**
- [ ] Throws error with context
- [ ] OR returns safe default
- [ ] Logs failure for debugging

**Code added:**
```javascript
[output validation code]
```
```

## 6.7 Layer 4: Regression Test

Create a test that specifically triggers this bug. If the bug ever returns, the test fails.

### Regression Test Template

```javascript
// LAYER 4: Regression Test
// Location: Test suite
// Purpose: Fail if this specific bug ever returns

describe('Bug #123: [Brief description]', () => {
  it('should handle [condition that caused bug]', () => {
    // ARRANGE: Set up the exact conditions that triggered the bug
    const buggyInput = {
      // The specific input that caused the original bug
    };
    
    // ACT: Call the function that had the bug
    const result = functionThatHadBug(buggyInput);
    
    // ASSERT: Verify correct behavior (not the buggy behavior)
    expect(result).toBeDefined();
    expect(result.value).toBeGreaterThanOrEqual(0);
    // ... more assertions specific to this bug
  });
  
  it('should not throw on [edge case that caused bug]', () => {
    // Test the specific edge case
    expect(() => {
      functionThatHadBug(null);
    }).not.toThrow();
  });
});
```

### Layer 4 Checklist

```markdown
## LAYER 4: REGRESSION TEST

**Test file:** [path to test file]
**Test name:** "Bug #[ID]: [description]"

**Test covers:**
- [ ] Exact conditions that triggered original bug
- [ ] Edge cases related to the bug
- [ ] Boundary conditions

**Test assertions:**
- [ ] Correct behavior verified
- [ ] No throw/crash verified
- [ ] Output validity verified

**Test code:**
```javascript
[test code]
```
```

## 6.8 Phase 4 Complete Template

```markdown
## PHASE 4: FIX + PREVENTION (Defense-in-Depth)

### Bug: [TITLE]
### Root Cause: [from Phase 2]
### Confirmed: [from Phase 3]

### DEFENSE-IN-DEPTH LAYERS

#### Layer 1: Input Validation
**Location:** [file:line]
**What it catches:** [description]
```javascript
[validation code]
```

#### Layer 2: Invariant Check
**Location:** [file:line]
**What it catches:** [description]
```javascript
[invariant code]
```

#### Layer 3: Output Validation
**Location:** [file:line]
**What it catches:** [description]
```javascript
[output validation code]
```

#### Layer 4: Regression Test
**Location:** [test file]
**What it catches:** [description]
```javascript
[test code]
```

# SECTION 7: COMMON BUG PATTERNS

## 7.1 Purpose

Learn from common bugs. These patterns appear repeatedly in PRISM development. Recognizing them speeds up root cause identification.

## 7.2 PRISM-Specific Bug Patterns

### Pattern 1: Missing Material Property

**Symptom:** TypeError when accessing material property
**Root Cause:** Material doesn't have expected property (database incomplete)

```javascript
// BUG: Assumes all materials have Kienzle coefficients
const Kc11 = material.kienzle.Kc11;  // TypeError: Cannot read 'Kc11' of undefined

// FIX: Check before access, use fallback
const Kc11 = material.kienzle?.Kc11 ?? DEFAULT_KC11;
// Also: Add validation at material load time
```

**Prevention Layers:**
1. Input: Validate material has required properties before calculation
2. Invariant: Assert material structure at database load
3. Output: Verify calculation result is sensible
4. Test: Test with materials missing optional properties

### Pattern 2: Unit Mismatch

**Symptom:** Calculations produce wrong order of magnitude
**Root Cause:** Mixing mm and inches, or MPa and psi

```javascript
// BUG: Mixing units without conversion
const force = material.hardness * feedRate;  // hardness in HRC, feedRate in mm
// Result: Meaningless number

// FIX: Standardize units at boundaries
const hardnessHV = convertToVickers(material.hardness, material.hardnessUnit);
const feedRateMM = convertToMM(feedRate, feedRateUnit);
const force = calculateForce(hardnessHV, feedRateMM);  // Units known
```

**Prevention Layers:**
1. Input: Require unit specification on all measurements
2. Invariant: Assert units are consistent before calculation
3. Output: Include units in output, sanity check magnitude
4. Test: Test with mixed unit inputs

### Pattern 3: Consumer Not Wired

**Symptom:** Feature works in isolation but not in product
**Root Cause:** Module exists but consumer doesn't call it

```javascript
// BUG: Database enhanced but calculator still uses old method
// In materials-db.js:
export function getEnhancedMaterial(id) { /* new, better */ }

// In calculator.js (NOT UPDATED):
import { getMaterial } from './materials-db.js';  // Old method
const material = getMaterial(id);  // Doesn't use enhanced version

// FIX: Wire the consumer
import { getEnhancedMaterial } from './materials-db.js';
const material = getEnhancedMaterial(id);  // Now uses enhanced
```

**Prevention Layers:**
1. Input: Deprecation warning on old methods
2. Invariant: Audit consumer wiring (prism-utilization skill)
3. Output: Log which method consumers actually use
4. Test: Integration test verifying consumer uses correct method

### Pattern 4: Stale State

**Symptom:** Changes don't take effect, old values persist
**Root Cause:** Cached data not invalidated when source changes

```javascript
// BUG: Cache not invalidated
const cache = {};
function getMaterial(id) {
  if (!cache[id]) {
    cache[id] = loadFromDatabase(id);
  }
  return cache[id];  // Returns stale data if database updated
}

// FIX: Invalidate cache on updates
function updateMaterial(id, data) {
  saveToDatabase(id, data);
  delete cache[id];  // Invalidate cache
}
// Or: Use timestamp-based cache invalidation
```

**Prevention Layers:**
1. Input: Track cache age, reject stale requests
2. Invariant: Assert cache consistency with source
3. Output: Include cache metadata (age, source version)
4. Test: Test cache invalidation on updates

### Pattern 5: Async Race Condition

**Symptom:** Works sometimes, fails randomly
**Root Cause:** Operations complete in unexpected order

```javascript
// BUG: Race condition
async function loadAndProcess() {
  fetchMaterial(id);  // Missing await!
  const result = processMaterial(material);  // material not loaded yet
}

// FIX: Proper await
async function loadAndProcess() {
  const material = await fetchMaterial(id);  // Wait for load
  const result = processMaterial(material);  // Now safe
}
```

**Prevention Layers:**
1. Input: Validate data is loaded before processing
2. Invariant: Assert expected state at each step
3. Output: Include timing metadata for debugging
4. Test: Test with artificial delays to expose race conditions

## 7.3 General Bug Patterns

### Pattern 6: Null/Undefined Access

**Symptom:** "Cannot read property X of undefined/null"
**Root Cause:** Accessing property on null/undefined value

```javascript
// BUG: No null check
const name = user.profile.name;  // Crashes if user or profile is null

// FIX: Optional chaining + default
const name = user?.profile?.name ?? 'Unknown';
// Or: Explicit validation
if (!user?.profile) {
  throw new Error('Invalid user: missing profile');
}
```

### Pattern 7: Off-by-One Error

**Symptom:** Missing first or last item, array out of bounds
**Root Cause:** Wrong loop bounds or index calculation

```javascript
// BUG: Off by one
for (let i = 0; i <= array.length; i++) {  // <= should be <
  process(array[i]);  // Accesses undefined on last iteration
}

// FIX: Correct bounds
for (let i = 0; i < array.length; i++) {
  process(array[i]);
}
```

### Pattern 8: Floating Point Comparison

**Symptom:** Equality check fails for "equal" numbers
**Root Cause:** Floating point precision issues

```javascript
// BUG: Direct equality
if (0.1 + 0.2 === 0.3) {  // FALSE! (0.30000000000000004)
  // Never executes
}

// FIX: Epsilon comparison
const EPSILON = 1e-10;
if (Math.abs((0.1 + 0.2) - 0.3) < EPSILON) {
  // Works correctly
}
```

### Pattern 9: Mutation of Shared State

**Symptom:** Unexpected changes, "works in isolation but not together"
**Root Cause:** Multiple functions modifying same object

```javascript
// BUG: Mutating shared object
function addDiscount(order) {
  order.total *= 0.9;  // Mutates original
  return order;
}
// Later, original order is wrong

// FIX: Return new object
function addDiscount(order) {
  return {
    ...order,
    total: order.total * 0.9
  };
}
```

### Pattern 10: Type Coercion

**Symptom:** Unexpected behavior with == or string concatenation
**Root Cause:** JavaScript type coercion surprises

```javascript
// BUG: Type coercion
if (value == 0) {  // True for "", [], false, null (sometimes)
  // Unexpected branch
}
"Price: " + price + tax  // If price=10, tax=5: "Price: 105" not "Price: 15"

// FIX: Strict equality and explicit types
if (value === 0) {  // Only true for actual 0
  // Predictable
}
"Price: " + (price + tax)  // "Price: 15"
```

## 7.4 Bug Pattern Quick Reference

| Pattern | Symptom | Quick Check |
|---------|---------|-------------|
| Missing property | TypeError: cannot read X | Check object structure |
| Unit mismatch | Wrong magnitude | Check units at boundaries |
| Consumer not wired | Feature not used | Audit imports/calls |
| Stale state | Changes not reflected | Check cache invalidation |
| Race condition | Intermittent failures | Check async/await |
| Null access | Cannot read of undefined | Check null handling |
| Off-by-one | Missing/extra item | Check loop bounds |
| Float comparison | Equality fails | Use epsilon compare |
| Mutation | Unexpected changes | Check for object spread |
| Type coercion | Weird behavior | Use === and explicit types |

# SECTION 9: EXAMPLES

## 9.1 Example 1: Cutting Force Calculation Error

### Bug Report
**Title:** Cutting force returns NaN for titanium materials
**Severity:** High
**Observed:** calculateCuttingForce() returns NaN for Ti-6Al-4V
**Expected:** Should return force value in Newtons

### Phase 2: Root Cause Tracing

**Trace Backward:**
```
NaN at: calculateForce() line 45
    ↑
Uses: material.kienzle.Kc11 → undefined.Kc11 → NaN in calculation
    ↑
LEVEL 1: getMaterial() line 23
    Returns material object with kienzle: undefined
    Input was: 'Ti-6Al-4V'
    ↑
LEVEL 2: Database lookup
    Material exists but lacks kienzle property
    ↑
★ ROOT CAUSE: Material database entry for Ti-6Al-4V missing Kienzle coefficients
```

**Root Cause Statement:**
"The bug is caused by **missing Kienzle coefficients** in **titanium_alloys.json for Ti-6Al-4V** because **the material was added without complete parameter set**."

**Phase 2 Complete:** ✓

### Phase 4: Fix + Prevention

**The Fix:**
Add Kienzle coefficients to Ti-6Al-4V in database:
```json
{
  "id": "Ti-6Al-4V",
  "name": "Titanium 6Al-4V",
  "kienzle": {
    "Kc11": 1650,
    "mc": 0.23,
    "source": "Machining Data Handbook"
  }
}
```

**Layer 1: Input Validation (in calculateCuttingForce)**
```javascript
function calculateCuttingForce(materialId, feedRate, depthOfCut) {
  const material = getMaterial(materialId);
  
  // LAYER 1: Validate material has required coefficients
  if (!material.kienzle?.Kc11) {
    throw new ValidationError(
      `Material ${materialId} missing Kienzle coefficients (Kc11 required)`
    );
  }
  // ... continue with calculation
}
```

**Layer 2: Invariant Check (in getMaterial)**
```javascript
function getMaterial(id) {
  const material = database.get(id);
  
  // LAYER 2: Assert critical fields exist
  if (material && !material.kienzle) {
    console.warn(`[INVARIANT] Material ${id} missing kienzle coefficients`);
  }
  
  return material;
}
```

**Layer 3: Output Validation (in calculateCuttingForce)**
```javascript
function calculateCuttingForce(materialId, feedRate, depthOfCut) {
  // ... calculation ...
  
  // LAYER 3: Validate output is sensible
  if (!isFinite(result) || result < 0 || result > 100000) {
    throw new CalculationError(
      `Invalid force result: ${result} (expected 0-100000 N)`
    );
  }
  
  return result;
}
```

**Layer 4: Regression Test**
```javascript
describe('Bug: Ti-6Al-4V NaN force', () => {
  it('should calculate force for Ti-6Al-4V', () => {
    const force = calculateCuttingForce('Ti-6Al-4V', 0.2, 2.0);
    expect(force).toBeGreaterThan(0);
    expect(isFinite(force)).toBe(true);
  });
  
  it('should throw on material without Kienzle coefficients', () => {
    expect(() => {
      calculateCuttingForce('MATERIAL-NO-KIENZLE', 0.2, 2.0);
    }).toThrow('missing Kienzle coefficients');
  });
});
```

**Verification:** Bug no longer reproduces, all tests pass.

**Phase 4 Complete:** ✓ Bug Fixed

### Phase 1: Evidence Collection

**Reproduction:**
```
Attempt 1: Save state → Success
Attempt 2: Save state → Success
Attempt 3: Save state → File unchanged (failure)
Attempt 4: Save state → Success
Attempt 5: Save state → File unchanged (failure)
Consistent: INTERMITTENT (3/5 success, 2/5 fail)
```

**Boundary Logging:**
```
[BOUNDARY: saveState] Input: { version: '3.21', session: {...} }
[BOUNDARY: saveState] Called writeFile()
[BOUNDARY: saveState] Output: undefined (no error thrown)

# But file shows old content!
```

**Environment:**
- Running multiple save operations quickly
- File system: Box sync enabled

**Phase 1 Complete:** ✓ (Intermittent suggests race condition)

### Phase 3: Hypothesis Testing

**Hypothesis:** "File write fails because writeFile isn't awaited"

**Minimal Test:**
```javascript
// WITHOUT await (buggy)
async function saveWithoutAwait(data) {
  fs.writeFile('test.json', data);  // No await
  console.log('Save "complete"');
}

// Test
await saveWithoutAwait('{"test": 1}');
const content = fs.readFileSync('test.json', 'utf8');
console.log('Content:', content);  // May be old content!

// WITH await (fixed)
async function saveWithAwait(data) {
  await fs.writeFile('test.json', data);  // With await
  console.log('Save complete');
}

// Test
await saveWithAwait('{"test": 2}');
const content = fs.readFileSync('test.json', 'utf8');
console.log('Content:', content);  // Always correct
```

**Hypothesis Status:** CONFIRMED
- Without await, file content inconsistent
- With await, file content always correct

**Phase 3 Complete:** ✓

## 9.3 Example 3: Material Count Mismatch

### Bug Report
**Title:** Spec review says 125 materials but database has 127
**Severity:** Medium
**Observed:** Audit reports different counts
**Expected:** Counts should match exactly

### Phase 2: Root Cause Tracing

**Trace:**
```
Count mismatch: 127 vs 125
    ↑
Counted database entries
    ↑
LEVEL 1: Where did extra 2 come from?
    Compare lists...
    Extra entries: Ti-6Al-4V-ELI (duplicate variant), Ti-TEST (test entry)
    ↑
★ ROOT CAUSE: 
    1. Ti-6Al-4V-ELI was added as separate entry (should be variant)
    2. Ti-TEST was added for testing and not removed
```

**Root Cause Statement:**
"The bug is caused by **2 extra entries** in **titanium_alloys.json** because **a variant was added as separate material and a test entry was not cleaned up**."

**Phase 2 Complete:** ✓

### Phase 4: Fix + Prevention

**The Fix:**
1. Remove Ti-TEST (test entry)
2. Merge Ti-6Al-4V-ELI as variant of Ti-6Al-4V

**Layer 1: Input Validation (on database add)**
```javascript
function addMaterial(material) {
  // LAYER 1: Check for duplicates before adding
  const existing = materials.filter(m => 
    m.name.toLowerCase().includes(material.name.toLowerCase())
  );
  if (existing.length > 0) {
    throw new DuplicateWarning(`Similar materials exist: ${existing.map(m => m.id)}`);
  }
  // LAYER 1b: Check for test entries
  if (material.id.includes('TEST')) {
    throw new ValidationError('Test entries not allowed in production database');
  }
}
```

**Layer 2: Invariant Check (database load)**
```javascript
function loadDatabase() {
  const materials = JSON.parse(fs.readFileSync(DB_PATH));
  
  // LAYER 2: Check for test entries
  const testEntries = materials.filter(m => m.id.includes('TEST'));
  if (testEntries.length > 0) {
    console.warn('[INVARIANT] Test entries found in database:', testEntries);
  }
  
  return materials;
}
```

**Layer 3: Count Verification (on spec review)**
```javascript
function verifyDatabaseCount(expectedCount) {
  const actual = materials.length;
  if (actual !== expectedCount) {
    return {
      pass: false,
      error: `Count mismatch: expected ${expectedCount}, got ${actual}`,
      delta: actual - expectedCount
    };
  }
  return { pass: true };
}
```

**Layer 4: Regression Test**
```javascript
describe('Bug: Material count mismatch', () => {
  it('should have exactly 125 titanium alloys', () => {
    const titaniumDb = loadTitaniumAlloys();
    expect(titaniumDb.length).toBe(125);
  });
  
  it('should not contain test entries', () => {
    const titaniumDb = loadTitaniumAlloys();
    const testEntries = titaniumDb.filter(m => m.id.includes('TEST'));
    expect(testEntries).toHaveLength(0);
  });
  
  it('should not have duplicate names', () => {
    const titaniumDb = loadTitaniumAlloys();
    const names = titaniumDb.map(m => m.name.toLowerCase());
    const uniqueNames = new Set(names);
    expect(names.length).toBe(uniqueNames.size);
  });
});
```

**Phase 4 Complete:** ✓ Bug Fixed

### PHASE 1: EVIDENCE COLLECTION
- [ ] Issue reproduced (☐ 1 / ☐ 2 / ☐ 3+ times)
- [ ] Module boundaries logged
- [ ] Full stack trace captured
- [ ] Environment documented
- [ ] First abnormal point identified

**Phase 1 Exit:** ☐ COMPLETE

### PHASE 3: HYPOTHESIS TESTING
- [ ] Clear hypothesis formed
- [ ] Minimal test designed
- [ ] Test executed
- [ ] Hypothesis: ☐ CONFIRMED / ☐ DISPROVED

**If disproved:** ☐ Return to Phase 2

**Phase 3 Exit:** ☐ COMPLETE (hypothesis confirmed)

### VERIFICATION
- [ ] Original bug no longer occurs
- [ ] Regression test passes
- [ ] No new bugs introduced
- [ ] Documentation complete

**BUG STATUS:** ☐ FIXED - Proceed to SP.1.7
```
