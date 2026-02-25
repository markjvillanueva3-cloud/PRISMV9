---
name: prism-sp-debugging
description: |
  4-phase mandatory debugging process with root cause tracing and defense-in-depth.
  Use when: errors occur, unexpected behavior, bugs found, something broken.
  4-phase process: EVIDENCE COLLECTION, ROOT CAUSE TRACING, HYPOTHESIS TESTING,
  FIX + PREVENTION. Phases CANNOT be skipped - must complete N before N+1.
  Requires minimum 3 defense-in-depth layers after every fix.
  Part of SP.1 Core Development Workflow.
---
# PRISM-SP-DEBUGGING
## 4-Phase Mandatory Debugging Process
### Version 1.0 | Development Workflow | ~50KB

---

# SECTION 1: OVERVIEW

## 1.1 Purpose

This skill enforces a **MANDATORY 4-phase debugging process** when errors or unexpected behavior occur. No shortcuts. No skipping phases. Find and fix the ROOT CAUSE, not symptoms.

**The Problem:** Without systematic debugging:
- Developers jump straight to "fixing" what they see
- Root causes remain hidden, bugs keep recurring
- No evidence collected for learning
- Quick fixes create technical debt
- Same bugs appear again and again

**The Solution:** A disciplined 4-phase process that:
- Collects evidence before theorizing
- Traces to the TRUE root cause
- Validates hypotheses before fixing
- Adds defense-in-depth to prevent recurrence

## 1.2 The Debugging Mindset

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           THE DEBUGGING MINDSET                                         │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  ❌ WRONG MINDSET:                                                                      │
│  "I see the error, I'll just fix it"                                                    │
│  "I know what's wrong"                                                                  │
│  "Quick fix, move on"                                                                   │
│  "No time for this process"                                                             │
│                                                                                         │
│  ✅ RIGHT MINDSET:                                                                      │
│  "What evidence do I have?"                                                             │
│  "Where did the data FIRST become corrupted?"                                           │
│  "Can I PROVE my hypothesis?"                                                           │
│  "How do I prevent this from EVER happening again?"                                     │
│                                                                                         │
│  KEY INSIGHT:                                                                           │
│  ────────────                                                                           │
│  The error you SEE is rarely the root cause.                                            │
│  It's a SYMPTOM of something that went wrong earlier.                                   │
│  If you fix symptoms, the bug WILL return.                                              │
│  If you fix root causes, the bug is gone FOREVER.                                       │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 1.3 The Cardinal Rule: NO PHASE SKIPPING

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                         │
│  ⛔⛔⛔ CRITICAL: PHASES CANNOT BE SKIPPED ⛔⛔⛔                                        │
│                                                                                         │
│  Phase 1 → Phase 2 → Phase 3 → Phase 4                                                  │
│                                                                                         │
│  • You MUST complete Phase 1 before starting Phase 2                                    │
│  • You MUST complete Phase 2 before starting Phase 3                                    │
│  • You MUST complete Phase 3 before starting Phase 4                                    │
│  • Each phase has EXIT CRITERIA that must be met                                        │
│                                                                                         │
│  NO EXCEPTIONS. NO SHORTCUTS. NO "I ALREADY KNOW."                                      │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### Why Skipping Fails

| Skip Attempt | Why It Fails |
|--------------|--------------|
| "I know what's wrong" | If you knew, the bug wouldn't exist. You're looking at a symptom. |
| "It's obvious" | Obvious bugs get fixed immediately. This one didn't. Not obvious. |
| "Quick fix needed" | Quick fixes = technical debt. You'll spend 10x time later. |
| "No time for process" | You don't have time to NOT follow the process. Recurring bugs cost more. |
| "Just this once" | Every recurring bug started with "just this once." |

## 1.4 When to Use This Skill

**Explicit Triggers:**
- "debug", "debugging"
- "bug", "error", "crash"
- "not working", "broken"
- "unexpected behavior"
- "fix issue", "fix bug"

**Contextual Triggers:**
- Runtime error occurs
- Test fails unexpectedly
- Output doesn't match expectations
- User reports problem
- Data appears corrupted

**NOT for:**
- Design decisions (use prism-sp-brainstorm)
- Code quality issues without bugs (use prism-sp-review-quality)
- Spec compliance (use prism-sp-review-spec)

## 1.5 Prerequisites

**Required:**
- [ ] Bug report or error description
- [ ] Access to code where error occurs
- [ ] Ability to reproduce (or attempt to reproduce)

**Helpful:**
- [ ] Stack trace / error output
- [ ] Recent changes list
- [ ] Environment details

## 1.6 Outputs

**Phase Outputs:**
- Phase 1: Evidence collection report
- Phase 2: Root cause identification with proof
- Phase 3: Validated hypothesis
- Phase 4: Fix + prevention layers documented

**Final Outputs:**
- Bug resolved at root cause
- Minimum 3 prevention layers added
- Regression test created
- Documentation for future reference

## 1.7 Key Principles

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                          DEBUGGING PRINCIPLES                                           │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  PRINCIPLE 1: EVIDENCE BEFORE THEORY                                                    │
│  ───────────────────────────────────────                                                │
│  Collect facts first. Don't theorize until you have data.                               │
│  "I think..." is worthless. "The log shows..." is valuable.                             │
│                                                                                         │
│  PRINCIPLE 2: TRACE TO THE SOURCE                                                       │
│  ───────────────────────────────────────                                                │
│  The error location is NOT the root cause.                                              │
│  Trace BACKWARD to find where data FIRST became corrupted.                              │
│  The root cause is upstream of the symptom.                                             │
│                                                                                         │
│  PRINCIPLE 3: PROVE BEFORE FIXING                                                       │
│  ───────────────────────────────────────                                                │
│  Form a hypothesis. Test it. If it fails, you're wrong.                                 │
│  Don't fix based on guesses. Fix based on proof.                                        │
│                                                                                         │
│  PRINCIPLE 4: DEFENSE-IN-DEPTH                                                          │
│  ───────────────────────────────────────                                                │
│  One fix is not enough. Add multiple prevention layers.                                 │
│  If one layer fails, another catches the bug.                                           │
│  Minimum 3 layers after every fix.                                                      │
│                                                                                         │
│  PRINCIPLE 5: LEARN FROM EVERY BUG                                                      │
│  ───────────────────────────────────────                                                │
│  Document what happened and why.                                                        │
│  Every bug is a lesson. Don't waste it.                                                 │
│  Add to error catalog for future reference.                                             │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 1.8 Position in Workflow

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              SP.1 CORE WORKFLOW                                         │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  SP.1.1        SP.1.2        SP.1.3        SP.1.4        SP.1.5        SP.1.6           │
│  ┌──────┐     ┌──────┐     ┌──────┐     ┌──────┐     ┌──────┐     ┌──────┐            │
│  │BRAIN │────▶│PLAN  │────▶│EXEC  │────▶│SPEC  │────▶│QUAL  │────▶│DEBUG │            │
│  │STORM │     │      │     │      │     │REVIEW│     │REVIEW│     │      │            │
│  └──────┘     └──────┘     └──────┘     └──────┘     └──────┘     └──┬───┘            │
│                                                                       │                 │
│                                            Bugs found? ───────────────┘                 │
│                                                                       │                 │
│                                                                       ▼                 │
│                                                                   SP.1.7                │
│                                                                   ┌──────┐              │
│                                                                   │VERIFY│              │
│                                                                   │      │              │
│                                                                   └──────┘              │
│                                                                                         │
│  ENTRY POINTS:                                                                          │
│  • After SP.1.5 quality review (if testing reveals bugs)                                │
│  • Any time an error occurs during development                                          │
│  • When unexpected behavior is reported                                                 │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

# SECTION 2: THE 4-PHASE PROCESS

## 2.1 Quick Reference

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

---

# SECTION 3: PHASE 1 - EVIDENCE COLLECTION

## 3.1 Purpose

Collect all evidence BEFORE forming theories. Your job in Phase 1 is to be a detective gathering facts, not a doctor prescribing cures.

**Mindset:** "I don't know what's wrong yet. I'm just collecting data."

## 3.2 The Four Evidence Tasks

### Task 1: Reproduce the Issue (3+ times)

You can't fix what you can't reproduce. Reproduction proves the bug is real and gives you a controlled environment.

```markdown
## REPRODUCTION LOG

### Attempt 1
**Time:** [HH:MM]
**Steps:**
1. [exact step]
2. [exact step]
3. [exact step]

**Result:** ☐ Bug reproduced / ☐ Bug not reproduced
**Notes:** [any observations]

### Attempt 2
**Time:** [HH:MM]
**Steps:**
1. [same or modified steps]
2. [...]

**Result:** ☐ Bug reproduced / ☐ Bug not reproduced
**Notes:** [any observations]

### Attempt 3
**Time:** [HH:MM]
**Steps:**
1. [same or modified steps]
2. [...]

**Result:** ☐ Bug reproduced / ☐ Bug not reproduced
**Notes:** [any observations]

### Reproduction Summary
- Successful reproductions: [N] / 3
- Consistent: ☐ YES / ☐ NO / ☐ INTERMITTENT
- Minimal steps to reproduce: [list]
```

**If bug doesn't reproduce:**
- Document the attempts anyway
- Note what's different from reported conditions
- Check if environment differs
- Consider timing/race condition issues

### Task 2: Log Data at Module Boundaries

The bug travels through your code. Logging at boundaries shows where data goes wrong.

```javascript
// BOUNDARY LOGGING EXAMPLE
// Add temporary logging at input/output of each module

// Module A → Module B boundary
console.log('[BOUNDARY A→B] Input:', JSON.stringify(data, null, 2));
const result = moduleB.process(data);
console.log('[BOUNDARY A→B] Output:', JSON.stringify(result, null, 2));

// Module B → Module C boundary
console.log('[BOUNDARY B→C] Input:', JSON.stringify(result, null, 2));
const final = moduleC.process(result);
console.log('[BOUNDARY B→C] Output:', JSON.stringify(final, null, 2));
```

```markdown
## BOUNDARY LOG ANALYSIS

### Boundary: [Module A] → [Module B]
**Input:**
```
[logged input data]
```
**Output:**
```
[logged output data]
```
**Data OK:** ☐ YES / ☐ NO
**Notes:** [observations]

### Boundary: [Module B] → [Module C]
**Input:**
```
[logged input data]
```
**Output:**
```
[logged output data]
```
**Data OK:** ☐ YES / ☐ NO
**Notes:** [observations]

### First Abnormal Boundary
The data first appears wrong at: [boundary name]
Before this boundary, data was: [description]
After this boundary, data is: [description]
```

### Task 3: Capture Full Stack Trace

The stack trace shows exactly where the error was thrown and the call path that led there.

```markdown
## STACK TRACE CAPTURE

### Full Stack Trace
```
[PASTE COMPLETE STACK TRACE - DO NOT TRUNCATE]

Error: [error message]
    at functionName (file.js:123:45)
    at callerFunction (file2.js:67:12)
    at anotherCaller (file3.js:89:23)
    ...
```

### Stack Trace Analysis
| Level | Function | File:Line | Notes |
|-------|----------|-----------|-------|
| 0 (error) | [function] | [file:line] | Where error thrown |
| 1 | [function] | [file:line] | Immediate caller |
| 2 | [function] | [file:line] | ... |
| N (origin) | [function] | [file:line] | Entry point |

### Error Message Breakdown
- Error type: [TypeError, ReferenceError, custom, etc.]
- Error message: [exact message]
- Key information: [what the message tells us]
```

### Task 4: Document Environment

Context matters. The same code can behave differently in different environments.

```markdown
## ENVIRONMENT SNAPSHOT

### Files Involved
| File | Last Modified | Size | Notes |
|------|---------------|------|-------|
| [file1.js] | [timestamp] | [size] | [notes] |
| [file2.js] | [timestamp] | [size] | [notes] |
| [data.json] | [timestamp] | [size] | [notes] |

### Recent Changes
| When | What Changed | Who | Relevant? |
|------|--------------|-----|-----------|
| [time] | [description] | [who] | ☐ YES / ☐ NO |

### Application State
- Current session: [state info]
- Relevant global state: [state info]
- Database state: [if applicable]

### Runtime Environment
- Node version: [version]
- OS: [os info]
- Memory: [if relevant]
- Other: [relevant details]
```

## 3.3 Phase 1 Complete Template

```markdown
## PHASE 1: EVIDENCE COLLECTION - COMPLETE

### Bug: [BRIEF TITLE]
**Date:** [YYYY-MM-DD]
**Time spent on Phase 1:** [duration]

### Reproduction Results
- Attempts: [N]
- Successes: [N]
- Consistent: ☐ YES / ☐ NO
- Minimal reproduction steps:
  1. [step]
  2. [step]
  3. [observe bug]

### Boundary Log Summary
| Boundary | Data OK? |
|----------|----------|
| [A → B] | ☐ YES / ☐ NO |
| [B → C] | ☐ YES / ☐ NO |
| [C → D] | ☐ YES / ☐ NO |

**First abnormal boundary:** [where data first goes wrong]

### Stack Trace
- Error type: [type]
- Error location: [file:line]
- Call depth: [N levels]

### Environment
- Files involved: [count]
- Recent changes: [summary]
- State captured: ☐ YES / ☐ NO

### EXIT CRITERIA CHECK
- [x] Issue reproduced consistently (3+ times)
- [x] All module boundaries logged
- [x] Full stack trace captured
- [x] Environment documented

### Key Evidence Summary
[2-3 sentences summarizing the most important evidence collected]

**PHASE 1 COMPLETE:** ☐ YES - Proceed to Phase 2
```

## 3.4 Evidence Collection Commands

### JavaScript/Node.js
```javascript
// Add to every function entry/exit
function debugWrap(name, fn) {
  return function(...args) {
    console.log(`[ENTER] ${name}`, JSON.stringify(args));
    try {
      const result = fn.apply(this, args);
      console.log(`[EXIT] ${name}`, JSON.stringify(result));
      return result;
    } catch (e) {
      console.log(`[ERROR] ${name}`, e.message, e.stack);
      throw e;
    }
  };
}

// Quick state dump
console.log('[STATE]', JSON.stringify({
  timestamp: new Date().toISOString(),
  key1: value1,
  key2: value2
}, null, 2));
```

### File System Evidence
```bash
# List files with timestamps
ls -la --time-style=full-iso

# Show recent modifications
find . -mmin -60 -type f

# Check file contents
cat [file] | head -50
```

### PRISM-Specific Evidence
```javascript
// Dump CURRENT_STATE.json
console.log('[PRISM STATE]', JSON.stringify(CURRENT_STATE, null, 2));

// Log database query results
console.log('[DB QUERY]', query, JSON.stringify(result, null, 2));

// Log calculation inputs/outputs
console.log('[CALC]', {
  function: 'calculateCuttingForce',
  inputs: { material, feedRate, depthOfCut },
  output: result
});
```

## 3.5 Common Phase 1 Mistakes

| Mistake | Problem | Correct Approach |
|---------|---------|------------------|
| Skipping reproduction | Can't verify fix works | Reproduce 3+ times first |
| Partial logging | Miss where data corrupts | Log EVERY boundary |
| Truncated stack trace | Lose call chain info | Capture FULL trace |
| Ignoring environment | Miss context-dependent bugs | Document everything |
| Theorizing too early | Bias your evidence collection | Just collect facts |

---

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

---

# SECTION 5: PHASE 3 - HYPOTHESIS TESTING

## 5.1 Purpose

Validate your root cause theory BEFORE fixing. If your hypothesis is wrong, your fix will be wrong too.

**Mindset:** "I think I know the root cause. Can I PROVE it?"

## 5.2 The Scientific Method for Debugging

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           HYPOTHESIS TESTING FLOW                                       │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  From Phase 2: Root cause identified                                                    │
│       │                                                                                 │
│       ▼                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │ STEP 1: FORM HYPOTHESIS                                                         │   │
│  │ "The bug is caused by [X] because [Y]"                                          │   │
│  │                                                                                 │   │
│  │ Must be: Specific, Testable, Falsifiable                                        │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│       │                                                                                 │
│       ▼                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │ STEP 2: DESIGN MINIMAL TEST                                                     │   │
│  │ Create the SMALLEST test that proves or disproves the hypothesis               │   │
│  │                                                                                 │   │
│  │ If hypothesis TRUE: Test should [expected behavior]                             │   │
│  │ If hypothesis FALSE: Test should [different behavior]                           │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│       │                                                                                 │
│       ▼                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │ STEP 3: EXECUTE TEST                                                            │   │
│  │ Run the minimal test and observe results                                        │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│       │                                                                                 │
│       ├───────────────────────────────┬─────────────────────────────────────────────   │
│       ▼                               ▼                                                 │
│  ┌────────────────┐            ┌────────────────┐                                      │
│  │ HYPOTHESIS     │            │ HYPOTHESIS     │                                      │
│  │ CONFIRMED      │            │ DISPROVED      │                                      │
│  │                │            │                │                                      │
│  │ → Phase 4:     │            │ → Return to    │                                      │
│  │   Fix the      │            │   Phase 2:     │                                      │
│  │   root cause   │            │   Trace deeper │                                      │
│  └────────────────┘            └────────────────┘                                      │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 5.3 Forming a Good Hypothesis

### Hypothesis Requirements

| Requirement | Description | Example |
|-------------|-------------|---------|
| **Specific** | Identifies exact cause | "The parser doesn't handle null values" |
| **Testable** | Can be verified with a test | "Passing null should trigger the bug" |
| **Falsifiable** | Can be proven wrong | "If bug doesn't occur with null, hypothesis is wrong" |

### Good vs Bad Hypotheses

```markdown
### ❌ BAD HYPOTHESES

"Something is wrong with the data"
- Not specific: What data? What's wrong?

"The function doesn't work"
- Not testable: How do we test "doesn't work"?

"It's a timing issue"
- Too vague: What timing? Where?

### ✅ GOOD HYPOTHESES

"The parseValue() function throws when input is null because it calls .toString() without null check"
- Specific: Exact function, exact operation
- Testable: Pass null, observe throw
- Falsifiable: If no throw with null, hypothesis wrong

"The race condition occurs because fetchData() doesn't await the database connection"
- Specific: Exact location and cause
- Testable: Add await, see if issue resolves
- Falsifiable: If issue persists with await, hypothesis wrong
```

### Hypothesis Template

```markdown
## HYPOTHESIS STATEMENT

**Hypothesis:** "The bug is caused by **[SPECIFIC CAUSE]** in **[LOCATION]** because **[MECHANISM]**"

**Breakdown:**
- WHAT: [What exactly is wrong]
- WHERE: [Exact file:line:function]
- WHY: [Why this causes the observed behavior]

**Prediction:**
- If I [test action], then [expected result]
- If hypothesis is wrong, instead [alternative result]
```

## 5.4 Designing a Minimal Test

The test should be the SMALLEST possible code that proves/disproves your hypothesis.

### Minimal Test Principles

1. **Isolate the suspected code** - Don't test the whole system
2. **Control the inputs** - Use specific inputs that trigger the issue
3. **Clear expected outcome** - Know exactly what should happen
4. **Quick to run** - Should take seconds, not minutes

### Minimal Test Template

```javascript
// MINIMAL TEST: [Hypothesis description]
// 
// Expected if hypothesis TRUE: [behavior]
// Expected if hypothesis FALSE: [behavior]

// Setup - minimal required context
const testInput = /* specific input that triggers issue */;

// Execute - call the suspected code
try {
  const result = suspectedFunction(testInput);
  console.log('RESULT:', result);
  console.log('HYPOTHESIS: ???'); // Fill in after running
} catch (error) {
  console.log('ERROR:', error.message);
  console.log('HYPOTHESIS: ???'); // Fill in after running
}
```

### Example Minimal Tests

```javascript
// EXAMPLE 1: Testing null handling hypothesis
// Hypothesis: parseValue() throws on null because no null check

const result = parseValue(null);
// If throws → Hypothesis CONFIRMED
// If returns → Hypothesis DISPROVED

// EXAMPLE 2: Testing missing await hypothesis
// Hypothesis: Race condition because fetchData doesn't await

async function test() {
  const conn = await getConnection(); // Force await
  const data = await fetchData(conn);
  console.log('Data:', data);
}
// If works → Hypothesis CONFIRMED
// If still fails → Hypothesis DISPROVED

// EXAMPLE 3: Testing boundary condition hypothesis
// Hypothesis: Calculation overflows when value > MAX_INT

const result = calculate(Number.MAX_SAFE_INTEGER + 1);
console.log('Result:', result, 'isFinite:', isFinite(result));
// If NaN/Infinity → Hypothesis CONFIRMED
// If valid number → Hypothesis DISPROVED
```

## 5.5 Phase 3 Complete Template

```markdown
## PHASE 3: HYPOTHESIS TESTING

### Hypothesis
"The bug is caused by **[CAUSE]** in **[LOCATION]** because **[MECHANISM]**"

### Minimal Test Design

**Test Objective:** Prove/disprove that [cause] is the root cause

**Test Code:**
```javascript
// [minimal test code]
```

**Expected Results:**
- If hypothesis TRUE: [expected behavior]
- If hypothesis FALSE: [expected behavior]

### Test Execution

**Test Run:** [timestamp]

**Actual Result:**
```
[actual output]
```

### Hypothesis Verdict

**Status:** ☐ CONFIRMED / ☐ DISPROVED

**Evidence:**
[Explain how the test result confirms or disproves the hypothesis]

### Next Steps

**If CONFIRMED:**
- [ ] Proceed to Phase 4
- [ ] Fix will address: [what the fix will do]

**If DISPROVED:**
- [ ] Return to Phase 2
- [ ] New direction: [where to look next]
- [ ] Alternative hypothesis: [new theory]

### EXIT CRITERIA CHECK
- [ ] Clear, specific hypothesis formed
- [ ] Minimal test created
- [ ] Test executed
- [ ] Result documented
- [ ] Hypothesis confirmed OR new direction identified

**PHASE 3 COMPLETE:** ☐ YES - Proceed to Phase 4 (or return to Phase 2)
```

## 5.6 When Hypothesis is Disproved

Don't be discouraged - a disproved hypothesis is valuable information!

```markdown
## HYPOTHESIS DISPROVED - WHAT NOW?

### What We Learned
The bug is NOT caused by: [disproved hypothesis]

### Why It Seemed Like the Cause
[Why we initially thought this was it]

### What This Tells Us
[New information gained from the disproof]

### New Direction
Based on the disproof, we should now look at:
1. [New area to investigate]
2. [Alternative hypothesis]

### Return to Phase 2
- [ ] Go back to root cause tracing
- [ ] Focus on: [new focus area]
- [ ] New boundary to log: [where]
```

## 5.7 Common Phase 3 Mistakes

| Mistake | Problem | Correct Approach |
|---------|---------|------------------|
| Vague hypothesis | Can't be tested | Be specific: what, where, why |
| Test too complex | Doesn't isolate cause | Use MINIMAL test |
| Ignoring disproof | Chase wrong fix | Accept it, return to Phase 2 |
| Confirmation bias | See what you want | Design test that CAN disprove |
| Skipping test | Fix wrong thing | ALWAYS test before fixing |

## 5.8 Multiple Hypotheses

Sometimes you have several possible causes. Test them in order:

```markdown
## MULTIPLE HYPOTHESES

### Hypothesis A (Most Likely)
[Description]
Test result: ☐ CONFIRMED / ☐ DISPROVED

### Hypothesis B (If A Fails)
[Description]
Test result: ☐ CONFIRMED / ☐ DISPROVED

### Hypothesis C (If B Fails)
[Description]
Test result: ☐ CONFIRMED / ☐ DISPROVED

### Winning Hypothesis
[Which one was confirmed, or need to return to Phase 2]
```

---

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

---

### THE FIX

**Location:** [file:line]

**Before:**
```javascript
[old code]
```

**After:**
```javascript
[new code]
```

**Why this fixes root cause:** [explanation]

---

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

---

### VERIFICATION

- [ ] Original bug no longer reproduces
- [ ] All 4 prevention layers in place
- [ ] Regression test passes
- [ ] No new bugs introduced

### EXIT CRITERIA CHECK
- [ ] Fix applied at root cause location
- [ ] Layer 1: Input validation added
- [ ] Layer 2: Invariant check added
- [ ] Layer 3: Output validation added
- [ ] Layer 4: Regression test created
- [ ] Bug verified as fixed
- [ ] All layers documented

**PHASE 4 COMPLETE:** ☐ YES - Bug fixed, proceed to SP.1.7 verification
```

## 6.9 Common Phase 4 Mistakes

| Mistake | Problem | Correct Approach |
|---------|---------|------------------|
| Fixing at symptom | Bug recurs elsewhere | Fix at root cause |
| One layer only | Bug can slip through | Add 3+ layers |
| No regression test | Bug returns later | Always add test |
| Untested fix | Fix may not work | Verify fix works |
| No documentation | Knowledge lost | Document everything |

---

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

---

# SECTION 8: ANTI-PATTERNS

## 8.1 Purpose

Learn what NOT to do. These debugging anti-patterns make bugs harder to find and fix.

## 8.2 Debugging Anti-Patterns

### Anti-Pattern 1: Fix and Pray

```
❌ WRONG: "I changed something, let's see if it works"
   - No understanding of root cause
   - No evidence the change addresses the issue
   - Bug likely to recur

✅ RIGHT: Follow 4-phase process
   - Understand root cause before fixing
   - Validate hypothesis with test
   - Fix addresses proven root cause
```

### Anti-Pattern 2: Shotgun Debugging

```
❌ WRONG: Make multiple changes hoping one fixes it
   - Can't tell which change worked
   - May introduce new bugs
   - No learning from the fix

✅ RIGHT: One change at a time
   - Make one targeted change
   - Test if it fixes the issue
   - If not, revert and try different approach
```

### Anti-Pattern 3: Print Statement Chaos

```
❌ WRONG: Add random console.log everywhere
   console.log("here");
   console.log("here2");
   console.log("wtf");
   console.log(data);

✅ RIGHT: Structured boundary logging
   console.log('[BOUNDARY A→B] Input:', JSON.stringify(input));
   console.log('[BOUNDARY A→B] Output:', JSON.stringify(output));
   // Clear, labeled, at specific points
```

### Anti-Pattern 4: Blame the Framework

```
❌ WRONG: "It must be a bug in Node/React/the library"
   - Extremely rarely true
   - Wastes time looking in wrong place
   - The bug is almost always in your code

✅ RIGHT: Assume it's your bug
   - Start by assuming your code is wrong
   - Only blame framework after exhaustive proof
   - Check your usage of the framework first
```

### Anti-Pattern 5: Quick Fix Accumulation

```
❌ WRONG: Layer quick fixes on top of each other
   // Fix attempt 1
   if (data == null) data = {};
   // Fix attempt 2
   if (data.value == null) data.value = 0;
   // Fix attempt 3
   if (isNaN(data.value)) data.value = 0;
   // Eventual result: Unmaintainable mess

✅ RIGHT: Find and fix root cause properly
   // One proper fix that addresses the actual problem
   const data = validateAndNormalize(rawData);
```

### Anti-Pattern 6: Works On My Machine

```
❌ WRONG: "It works on my machine, must be your setup"
   - Ignores environment differences
   - Doesn't solve the actual problem
   - User still has a broken product

✅ RIGHT: Investigate the difference
   - Document both environments
   - Find what's different
   - Make code handle both cases
   - Or fix the environment requirement
```

### Anti-Pattern 7: Suppressing Errors

```
❌ WRONG: Make the error go away without understanding it
   try {
     riskyOperation();
   } catch (e) {
     // Ignore - it works anyway
   }

✅ RIGHT: Handle errors appropriately
   try {
     riskyOperation();
   } catch (e) {
     logger.error('riskyOperation failed', e);
     return fallbackResult();  // Or re-throw with context
   }
```

### Anti-Pattern 8: Debugging Production

```
❌ WRONG: Debug directly in production
   - Can affect real users
   - Hard to add logging safely
   - High pressure, easy to make mistakes

✅ RIGHT: Reproduce in development first
   - Get production state/data if possible
   - Reproduce in safe environment
   - Debug without user impact
```

### Anti-Pattern 9: Fixing Symptoms Only

```
❌ WRONG: Fix where the error appears
   // Error at line 100: Cannot read 'name' of undefined
   if (user) {  // Add null check where error is
     process(user.name);
   }
   // But WHY is user undefined? Root cause not addressed.

✅ RIGHT: Fix where the corruption starts
   // Find where user BECOMES undefined and fix THERE
   function loadUser(id) {
     const user = database.get(id);
     if (!user) {
       throw new UserNotFoundError(id);  // Fail fast at source
     }
     return user;
   }
```

### Anti-Pattern 10: Skipping Phases

```
❌ WRONG: "I know what's wrong, skip to fix"
   Phase 1 (Evidence): Skip - "I can see the error"
   Phase 2 (Tracing): Skip - "Obviously it's here"
   Phase 3 (Testing): Skip - "No need to test"
   Phase 4 (Fix): Guess → Incorrect fix → Bug recurs

✅ RIGHT: Complete all 4 phases in order
   Phase 1: Collect evidence, reproduce 3x
   Phase 2: Trace to root cause
   Phase 3: Validate hypothesis
   Phase 4: Fix + defense-in-depth
```

## 8.3 Anti-Pattern Detection

Ask yourself these questions:

| Question | If YES, You Might Be... |
|----------|------------------------|
| Am I guessing what's wrong? | Fix and Pray |
| Am I changing multiple things at once? | Shotgun Debugging |
| Are my logs labeled and at boundaries? | Print Statement Chaos |
| Am I assuming framework bug without proof? | Blame the Framework |
| Am I adding another quick fix? | Quick Fix Accumulation |
| Am I dismissing environment differences? | Works On My Machine |
| Am I silencing an error? | Suppressing Errors |
| Am I debugging in production? | Debugging Production |
| Am I fixing where the error APPEARS? | Fixing Symptoms Only |
| Am I skipping phases to save time? | Skipping Phases |

---

# SECTION 9: EXAMPLES

## 9.1 Example 1: Cutting Force Calculation Error

### Bug Report
**Title:** Cutting force returns NaN for titanium materials
**Severity:** High
**Observed:** calculateCuttingForce() returns NaN for Ti-6Al-4V
**Expected:** Should return force value in Newtons

---

### Phase 1: Evidence Collection

**Reproduction:**
```
Attempt 1: calculateCuttingForce('Ti-6Al-4V', 0.2, 2.0) → NaN ✓
Attempt 2: calculateCuttingForce('Ti-6Al-4V', 0.3, 1.5) → NaN ✓
Attempt 3: calculateCuttingForce('Ti-6Al-4V', 0.1, 3.0) → NaN ✓
Consistent: YES (3/3)
```

**Boundary Logging:**
```
[BOUNDARY: getMaterial] Input: 'Ti-6Al-4V'
[BOUNDARY: getMaterial] Output: { id: 'Ti-6Al-4V', name: 'Titanium...', kienzle: undefined }

[BOUNDARY: calculateForce] Input: { material: {...}, feedRate: 0.2, depthOfCut: 2.0 }
[BOUNDARY: calculateForce] Output: NaN
```

**First Abnormal Point:** getMaterial returns material with `kienzle: undefined`

**Phase 1 Complete:** ✓

---

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

---

### Phase 3: Hypothesis Testing

**Hypothesis:** "Calculation fails because Ti-6Al-4V lacks kienzle.Kc11 property"

**Minimal Test:**
```javascript
// Test: Does Ti-6Al-4V have kienzle coefficients?
const material = getMaterial('Ti-6Al-4V');
console.log('Has kienzle:', 'kienzle' in material);
console.log('Kienzle value:', material.kienzle);

// Result:
// Has kienzle: true
// Kienzle value: undefined
```

**Test with material that DOES have kienzle:**
```javascript
const steel = getMaterial('AISI-1045');
console.log('Steel kienzle:', steel.kienzle);
const force = calculateCuttingForce('AISI-1045', 0.2, 2.0);
console.log('Steel force:', force);  // Works: 1245.6 N
```

**Hypothesis Status:** CONFIRMED
- Ti-6Al-4V has `kienzle: undefined`
- Materials with kienzle work correctly

**Phase 3 Complete:** ✓

---

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

---

## 9.2 Example 2: Intermittent File Save Failure

### Bug Report
**Title:** CURRENT_STATE.json sometimes not saved
**Severity:** High
**Observed:** State changes lost randomly
**Expected:** All state changes should persist

---

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

---

### Phase 2: Root Cause Tracing

**Trace Backward:**
```
File unchanged after save
    ↑
writeFile() returns without error
    ↑
LEVEL 1: saveState() calls fs.writeFile
    Code: fs.writeFile(path, data)  // No await!
    ↑
★ ROOT CAUSE: Missing await on fs.writeFile
    - Function returns before write completes
    - Subsequent operations may overwrite or interfere
```

**Root Cause Statement:**
"The bug is caused by **missing await on fs.writeFile** in **state-manager.js:45** because **the async operation isn't awaited, so function returns before write completes**."

**Phase 2 Complete:** ✓

---

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

---

### Phase 4: Fix + Prevention

**The Fix:**
```javascript
// Before (buggy)
async function saveState(state) {
  fs.writeFile(STATE_PATH, JSON.stringify(state, null, 2));
}

// After (fixed)
async function saveState(state) {
  await fs.writeFile(STATE_PATH, JSON.stringify(state, null, 2));
}
```

**Layer 1: Input Validation**
```javascript
async function saveState(state) {
  // LAYER 1: Validate state before saving
  if (!state || typeof state !== 'object') {
    throw new ValidationError('Invalid state: must be non-null object');
  }
  if (!state.version) {
    throw new ValidationError('Invalid state: missing version');
  }
  // ...
}
```

**Layer 2: Invariant Check**
```javascript
async function saveState(state) {
  // ... save ...
  
  // LAYER 2: Verify file was written correctly
  const saved = JSON.parse(await fs.readFile(STATE_PATH, 'utf8'));
  if (saved.version !== state.version) {
    throw new InvariantError('State save verification failed');
  }
}
```

**Layer 3: Output Confirmation**
```javascript
async function saveState(state) {
  await fs.writeFile(STATE_PATH, JSON.stringify(state, null, 2));
  
  // LAYER 3: Confirm write succeeded
  const stats = await fs.stat(STATE_PATH);
  if (stats.mtime < Date.now() - 5000) {
    throw new WriteError('File modification time not updated');
  }
  
  return { success: true, timestamp: stats.mtime };
}
```

**Layer 4: Regression Test**
```javascript
describe('Bug: State save race condition', () => {
  it('should persist state immediately', async () => {
    const testState = { version: 'test', data: Math.random() };
    await saveState(testState);
    
    const loaded = JSON.parse(fs.readFileSync(STATE_PATH));
    expect(loaded.data).toBe(testState.data);
  });
  
  it('should handle rapid successive saves', async () => {
    for (let i = 0; i < 10; i++) {
      await saveState({ version: 'test', count: i });
    }
    const loaded = JSON.parse(fs.readFileSync(STATE_PATH));
    expect(loaded.count).toBe(9);
  });
});
```

**Phase 4 Complete:** ✓ Bug Fixed

---

## 9.3 Example 3: Material Count Mismatch

### Bug Report
**Title:** Spec review says 125 materials but database has 127
**Severity:** Medium
**Observed:** Audit reports different counts
**Expected:** Counts should match exactly

---

### Phase 1: Evidence Collection

**Reproduction:**
```
Spec says: 125 materials
grep -c '"id":' materials.json → 127
Difference: +2 materials
Consistent: YES
```

**Boundary Logging:**
```
[AUDIT] Spec document: "125 titanium alloys"
[AUDIT] Database count: 127 entries
[AUDIT] Entries list: Ti-1, Ti-2, ..., Ti-127
```

**Phase 1 Complete:** ✓

---

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

---

### Phase 3: Hypothesis Testing

**Hypothesis:** "Remove Ti-6Al-4V-ELI and Ti-TEST to get correct count of 125"

**Minimal Test:**
```bash
# Count without the extra entries
grep -c '"id":' materials.json  # 127
grep -v 'Ti-6Al-4V-ELI\|Ti-TEST' materials.json | grep -c '"id":'  # 125 ✓
```

**Hypothesis Status:** CONFIRMED

**Phase 3 Complete:** ✓

---

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

---

# SECTION 10: INTEGRATION

## 10.1 Skill Metadata

```yaml
skill_id: prism-sp-debugging
version: 1.0.0
category: development-core
priority: CRITICAL

triggers:
  keywords:
    - "debug", "debugging"
    - "bug", "error", "crash"
    - "not working", "broken"
    - "unexpected behavior"
    - "fix issue", "fix bug"
    - "why isn't this working"
  contexts:
    - When errors occur during development
    - When tests fail unexpectedly
    - When output doesn't match expectations
    - After quality review, when testing reveals bugs

activation_rule: |
  IF (error or unexpected behavior occurs)
  THEN activate prism-sp-debugging
  AND enforce 4-phase process
  AND require exit criteria at each phase

outputs:
  - Bug report with evidence
  - Root cause identification
  - Validated fix
  - Defense-in-depth layers
  - Regression test

next_skills:
  on_complete: prism-sp-verification
```

## 10.2 Handoff Protocols

### Entry Points

**From SP.1.5 (Quality Review):**
```json
{
  "from": "prism-sp-review-quality",
  "status": "QUALITY_APPROVED",
  "bugFound": true,
  "bugDescription": "Calculation returns NaN for titanium",
  "timestamp": "2026-01-24T10:00:00Z"
}
```

**From Runtime Error:**
```json
{
  "from": "runtime",
  "type": "ERROR",
  "error": "TypeError: Cannot read property 'Kc11' of undefined",
  "location": "cutting-force-engine.js:45",
  "stack": "...",
  "timestamp": "2026-01-24T10:00:00Z"
}
```

### Handoff to SP.1.7 (Verification)

**On Bug Fixed:**
```json
{
  "from": "prism-sp-debugging",
  "status": "BUG_FIXED",
  "bug": {
    "title": "NaN force for titanium",
    "rootCause": "Missing Kienzle coefficients in database",
    "rootCauseLocation": "titanium_alloys.json"
  },
  "fix": {
    "description": "Added Kienzle coefficients",
    "location": "titanium_alloys.json"
  },
  "defenseLayers": {
    "layer1": "Input validation in calculateCuttingForce",
    "layer2": "Invariant check in getMaterial",
    "layer3": "Output validation in calculateCuttingForce",
    "layer4": "Regression test for Ti-6Al-4V"
  },
  "timestamp": "2026-01-24T11:00:00Z"
}
```

## 10.3 State Management

### State During Debugging

```javascript
{
  "debugging": {
    "active": true,
    "bug": {
      "title": "...",
      "severity": "High",
      "reported": "2026-01-24T10:00:00Z"
    },
    "currentPhase": 2,  // 1-4
    "phases": {
      "phase1": {
        "status": "COMPLETE",
        "reproductions": 3,
        "boundariesLogged": true
      },
      "phase2": {
        "status": "IN_PROGRESS",
        "rootCause": null
      },
      "phase3": {
        "status": "PENDING"
      },
      "phase4": {
        "status": "PENDING"
      }
    }
  }
}
```

### State After Fix

```javascript
{
  "debugging": {
    "active": false,
    "lastBug": {
      "title": "...",
      "resolved": "2026-01-24T11:00:00Z",
      "rootCause": "...",
      "fix": "...",
      "defenseLayers": 4
    }
  }
}
```

## 10.4 Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                     PRISM-SP-DEBUGGING QUICK REFERENCE                                  │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  ⛔ CRITICAL: PHASES CANNOT BE SKIPPED ⛔                                               │
│                                                                                         │
│  PHASE 1: EVIDENCE COLLECTION                                                           │
│  ───────────────────────────                                                            │
│  ☐ Reproduce 3+ times                                                                   │
│  ☐ Log at every boundary                                                                │
│  ☐ Capture full stack trace                                                             │
│  ☐ Document environment                                                                 │
│  EXIT: Evidence documented                                                              │
│                                                                                         │
│  PHASE 2: ROOT CAUSE TRACING                                                            │
│  ──────────────────────────                                                             │
│  ☐ Trace backward from error                                                            │
│  ☐ Find FIRST corruption point                                                          │
│  ☐ Document root cause with evidence                                                    │
│  EXIT: Root cause identified                                                            │
│                                                                                         │
│  PHASE 3: HYPOTHESIS TESTING                                                            │
│  ──────────────────────────                                                             │
│  ☐ Form clear hypothesis                                                                │
│  ☐ Create minimal test                                                                  │
│  ☐ Execute test                                                                         │
│  ☐ If disproved → back to Phase 2                                                       │
│  EXIT: Hypothesis confirmed                                                             │
│                                                                                         │
│  PHASE 4: FIX + PREVENTION                                                              │
│  ────────────────────────                                                               │
│  ☐ Fix at root cause location                                                           │
│  ☐ Layer 1: Input validation                                                            │
│  ☐ Layer 2: Invariant check                                                             │
│  ☐ Layer 3: Output validation                                                           │
│  ☐ Layer 4: Regression test                                                             │
│  EXIT: Bug fixed, 3+ layers added                                                       │
│                                                                                         │
│  REMEMBER:                                                                              │
│  • Error location ≠ Root cause                                                          │
│  • Evidence before theory                                                               │
│  • Prove before fixing                                                                  │
│  • Defense-in-depth (min 3 layers)                                                      │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 10.5 Full Debugging Checklist

```markdown
## DEBUGGING CHECKLIST: [BUG TITLE]

**Bug ID:** [ID]
**Date:** [YYYY-MM-DD]
**Severity:** ☐ Critical / ☐ High / ☐ Medium / ☐ Low

---

### PHASE 1: EVIDENCE COLLECTION
- [ ] Issue reproduced (☐ 1 / ☐ 2 / ☐ 3+ times)
- [ ] Module boundaries logged
- [ ] Full stack trace captured
- [ ] Environment documented
- [ ] First abnormal point identified

**Phase 1 Exit:** ☐ COMPLETE

---

### PHASE 2: ROOT CAUSE TRACING
- [ ] Traced backward through call chain
- [ ] Checked data at each level
- [ ] Found FIRST corruption point
- [ ] Root cause documented with evidence
- [ ] Root cause is actionable

**Root Cause:** _______________________________________________

**Phase 2 Exit:** ☐ COMPLETE

---

### PHASE 3: HYPOTHESIS TESTING
- [ ] Clear hypothesis formed
- [ ] Minimal test designed
- [ ] Test executed
- [ ] Hypothesis: ☐ CONFIRMED / ☐ DISPROVED

**If disproved:** ☐ Return to Phase 2

**Phase 3 Exit:** ☐ COMPLETE (hypothesis confirmed)

---

### PHASE 4: FIX + PREVENTION
- [ ] Fix applied at root cause location
- [ ] Layer 1: Input validation added
- [ ] Layer 2: Invariant check added
- [ ] Layer 3: Output validation added
- [ ] Layer 4: Regression test created
- [ ] Bug no longer reproduces
- [ ] All layers documented

**Phase 4 Exit:** ☐ COMPLETE

---

### VERIFICATION
- [ ] Original bug no longer occurs
- [ ] Regression test passes
- [ ] No new bugs introduced
- [ ] Documentation complete

**BUG STATUS:** ☐ FIXED - Proceed to SP.1.7
```

---

# DOCUMENT END

**Skill:** prism-sp-debugging
**Version:** 1.0
**Total Sections:** 10
**Part of:** SP.1 Core Development Workflow (SP.1.6 of 8)
**Created:** Session SP.1.6
**Status:** COMPLETE

**Key Features:**
- 4-phase mandatory process (no skipping)
- Root cause tracing (not symptom fixing)
- Defense-in-depth (minimum 3 layers)
- Bug pattern library (10+ patterns)
- Anti-pattern detection

---
