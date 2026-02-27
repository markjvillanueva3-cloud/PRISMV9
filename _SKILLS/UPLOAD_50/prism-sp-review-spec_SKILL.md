---
name: prism-sp-review-spec
description: |
  Specification compliance gate. Verifies output matches approved design.
---

```
☐ PHASE 1: LOAD SPECIFICATION - Extract requirements from approved design
☐ PHASE 2: CHECK DELIVERABLES - Verify all promised items exist
☐ PHASE 3: CHECK STRUCTURE - Confirm organization matches spec
☐ PHASE 4: CHECK CONTRACTS - Validate API signatures match design
☐ PHASE 5: VERDICT - Render pass/fail decision with evidence
```

## 2.2 Process Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           SPEC REVIEW FLOW                                              │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  INPUT: Execution output + Approved design document                                     │
│         │                                                                               │
│         ▼                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │ PHASE 1: LOAD SPECIFICATION                                                     │   │
│  │ • Retrieve approved design from brainstorm session                              │   │
│  │ • Extract ALL explicit requirements                                             │   │
│  │ • Build comprehensive checklist of deliverables                                 │   │
│  │ • Identify counts, structures, contracts specified                              │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│         │                                                                               │
│         ▼                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │ PHASE 2: CHECK DELIVERABLES                                                     │   │
│  │ • Each promised file exists?                                                    │   │
│  │ • Each promised function/component present?                                     │   │
│  │ • Counts match exactly (e.g., "127 parameters" = 127?)                          │   │
│  │ • Document evidence for each check                                              │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│         │                                                                               │
│         ▼                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │ PHASE 3: CHECK STRUCTURE                                                        │   │
│  │ • File organization matches spec?                                               │   │
│  │ • Directory structure correct?                                                  │   │
│  │ • Naming conventions followed?                                                  │   │
│  │ • File locations as specified?                                                  │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│         │                                                                               │
│         ▼                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │ PHASE 4: CHECK CONTRACTS                                                        │   │
│  │ • API signatures match design?                                                  │   │
│  │ • Input/output types correct?                                                   │   │
│  │ • Dependencies as specified?                                                    │   │
│  │ • Interface compliance verified?                                                │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│         │                                                                               │
│         ▼                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │ PHASE 5: VERDICT                                                                │   │
│  │ • Tally all checks (passed vs failed)                                           │   │
│  │ • Any failure = OVERALL FAIL                                                    │   │
│  │ • All pass = SPEC APPROVED                                                      │   │
│  │ • Document decision with full evidence                                          │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│         │                                                                               │
│         ├─────────────────────────────────┬─────────────────────────────────────────   │
│         ▼                                 ▼                                             │
│  ┌─────────────┐                   ┌─────────────┐                                     │
│  │ SPEC        │                   │ SPEC        │                                     │
│  │ APPROVED    │                   │ VIOLATION   │                                     │
│  │             │                   │             │                                     │
│  │ → SP.1.5    │                   │ → SP.1.3    │                                     │
│  │   Quality   │                   │   Fix then  │                                     │
│  │   Review    │                   │   re-review │                                     │
│  └─────────────┘                   └─────────────┘                                     │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 2.3 Phase 1: Load Specification

### Purpose
Extract every verifiable requirement from the approved design document.

### Actions

```markdown
## PHASE 1: LOAD SPECIFICATION

### Step 1.1: Locate Design Document
- Find approved brainstorm output
- Sources: CURRENT_STATE.json reference, session logs, design docs folder
- If not found: STOP - cannot review without specification

### Step 1.2: Extract Explicit Requirements
For each statement in the design, ask:
- Is this verifiable? (Can I check if it's true?)
- Is this a deliverable? (Something that should exist)
- Is this a count? (A specific number)
- Is this a structure? (Organization, naming, location)
- Is this a contract? (API, interface, signature)

### Step 1.3: Build Requirements Checklist
| ID | Requirement | Type | Verifiable | Source Quote |
|----|-------------|------|------------|--------------|
| R1 | [requirement] | DELIVERABLE | ☐ | "[exact text]" |
| R2 | [requirement] | COUNT | ☐ | "[exact text]" |
| R3 | [requirement] | STRUCTURE | ☐ | "[exact text]" |
| R4 | [requirement] | CONTRACT | ☐ | "[exact text]" |

### Step 1.4: Add Standard Requirements
PRISM deliverables have implicit requirements:
- [ ] File exists at specified path
- [ ] File is not empty (size > 0)
- [ ] Required sections present (for skills, configs)
- [ ] Naming follows conventions
```

### Completion Criteria
- [ ] Design document located
- [ ] All explicit requirements extracted
- [ ] Each requirement categorized by type
- [ ] Each requirement has source quote
- [ ] Standard requirements added

## 2.4 Phase 2: Check Deliverables

### Purpose
Verify every promised item exists and meets basic existence criteria.

### Actions

```markdown
## PHASE 2: CHECK DELIVERABLES

### For each DELIVERABLE requirement:

#### Step 2.1: Existence Check
Command: `ls -la [path]` or `dir [path]`
Expected: File/directory exists
Evidence: File listing output

#### Step 2.2: Non-Empty Check
Command: `wc -c [path]` or file size from listing
Expected: Size > 0
Evidence: Byte count

#### Step 2.3: Count Verification (if applicable)
Command: `grep -c [pattern] [file]` or custom count
Expected: Count matches specification exactly
Evidence: Command output showing count

### Deliverable Check Record:
| ID | Deliverable | Exists? | Non-Empty? | Count OK? | Evidence |
|----|-------------|---------|------------|-----------|----------|
| D1 | [item] | ☐ YES/NO | ☐ YES/NO | ☐ N/A/YES/NO | [ref] |
```

### Completion Criteria
- [ ] Every deliverable checked for existence
- [ ] Every deliverable checked for non-empty
- [ ] All counts verified against spec
- [ ] Evidence captured for each check

## 2.5 Phase 3: Check Structure

### Purpose
Verify file organization, naming, and locations match the specification.

### Actions

```markdown
## PHASE 3: CHECK STRUCTURE

### For each STRUCTURE requirement:

#### Step 3.1: Path Verification
Specified path: [from design]
Actual path: [from file system]
Match: ☐ YES / ☐ NO

#### Step 3.2: Naming Convention Check
Specified name pattern: [from design]
Actual name: [from file system]
Follows pattern: ☐ YES / ☐ NO

#### Step 3.3: Directory Structure Check
Command: `tree [path]` or `dir /s [path]`
Expected structure: [from design]
Actual structure: [from command]
Match: ☐ YES / ☐ NO

### Structure Check Record:
| ID | Structure Requirement | Specified | Actual | Match? | Evidence |
|----|----------------------|-----------|--------|--------|----------|
| S1 | [requirement] | [spec] | [actual] | ☐ | [ref] |
```

### Completion Criteria
- [ ] All paths verified
- [ ] All naming conventions checked
- [ ] Directory structure matches spec
- [ ] Evidence captured for each check

## 2.6 Phase 4: Check Contracts

### Purpose
Verify API signatures, interfaces, and dependencies match the design.

### Actions

```markdown
## PHASE 4: CHECK CONTRACTS

### For each CONTRACT requirement:

#### Step 4.1: Signature Extraction
From design: [specified signature]
From implementation: `grep -A5 "function|export|class" [file]`

#### Step 4.2: Signature Comparison
| Aspect | Specified | Actual | Match? |
|--------|-----------|--------|--------|
| Name | [x] | [y] | ☐ |
| Parameters | [x] | [y] | ☐ |
| Return type | [x] | [y] | ☐ |
| Modifiers | [x] | [y] | ☐ |

#### Step 4.3: Dependency Check
Specified dependencies: [from design]
Actual imports: `grep "import\|require" [file]`
All present: ☐ YES / ☐ NO
No extras: ☐ YES / ☐ NO

### Contract Check Record:
| ID | Contract | Specified | Actual | Match? | Evidence |
|----|----------|-----------|--------|--------|----------|
| C1 | [function/interface] | [spec] | [actual] | ☐ | [ref] |
```

### Completion Criteria
- [ ] All API signatures compared
- [ ] All parameter types verified
- [ ] All return types verified
- [ ] All dependencies checked
- [ ] Evidence captured for each check

## 2.7 Phase 5: Verdict

### Purpose
Render final pass/fail decision based on all checks.

### Decision Logic

```
IF (any check failed)
  THEN verdict = SPEC VIOLATION
  ELSE verdict = SPEC APPROVED
```

**There is no partial pass. One failure = overall failure.**

### Actions

```markdown
## PHASE 5: VERDICT

### Step 5.1: Tally Results
| Phase | Total Checks | Passed | Failed |
|-------|--------------|--------|--------|
| Deliverables | [N] | [X] | [Y] |
| Structure | [N] | [X] | [Y] |
| Contracts | [N] | [X] | [Y] |
| **TOTAL** | [N] | [X] | [Y] |

### Step 5.2: Render Verdict
☐ **SPEC APPROVED** - All [N] checks passed
☐ **SPEC VIOLATION** - [Y] of [N] checks failed

### Step 5.3: Document Decision
If APPROVED:
- Record approval timestamp
- Prepare handoff to SP.1.5 (prism-sp-review-quality)

If VIOLATION:
- List all failures with required fixes
- Prioritize by complexity (quick fix vs major rework)
- Prepare handoff back to SP.1.3 (prism-sp-execution)
```

### Completion Criteria
- [ ] All phases tallied
- [ ] Verdict rendered (APPROVED or VIOLATION)
- [ ] Decision documented with timestamp
- [ ] Next action identified

### EXPLICIT REQUIREMENTS

Requirements stated directly in the design:

| ID | Requirement Text | Type | Quote from Design |
|----|-----------------|------|-------------------|
| R1 | | DELIVERABLE / COUNT / STRUCTURE / CONTRACT | "[exact text]" |
| R2 | | | |
| R3 | | | |

### DERIVED REQUIREMENTS

Requirements inferred from context:

| ID | Derived From | Requirement | Confidence |
|----|--------------|-------------|------------|
| D1 | [source requirement] | [derived requirement] | HIGH / MEDIUM |

Note: Only HIGH confidence derived requirements should be checked.
MEDIUM confidence should be flagged but not cause failure.

# SECTION 4: CHECK TEMPLATES

## 4.1 Overview

Use these reusable templates to perform each type of compliance check. Copy the appropriate template, fill in the specifics, and document the evidence.

## 4.2 Deliverable Existence Check

```markdown
## DELIVERABLE CHECK: [ITEM NAME]

### Requirement
**ID:** [R#]
**Source:** "[exact quote from spec]"
**Type:** File / Directory / Component / Function

### Expected
- Path: [expected path]
- Type: [file/directory]
- Minimum size: [N bytes, or "> 0"]

### Verification

**Command:**
```bash
ls -la "[path]"
# or for Windows:
dir "[path]"
```

**Output:**
```
[paste actual output here]
```

### Evidence Summary
| Check | Expected | Actual | Pass? |
|-------|----------|--------|-------|
| Exists | YES | [YES/NO] | ☐ |
| Type | [file/dir] | [actual] | ☐ |
| Size | > 0 | [N bytes] | ☐ |

### Verdict: ☐ PASS / ☐ FAIL

**If FAIL, reason:** [explanation]
```

## 4.3 Count Verification Check

```markdown
## COUNT CHECK: [WHAT'S BEING COUNTED]

### Requirement
**ID:** [R#]
**Source:** "[exact quote from spec]"
**Expected Count:** [N]

### Verification

**Method:** [grep count / wc / custom script / manual count]

**Command:**
```bash
grep -c "[pattern]" "[file]"
# or
wc -l "[file]"
# or
[custom command]
```

**Output:**
```
[paste actual output here]
```

### Comparison
| Metric | Expected | Actual | Delta |
|--------|----------|--------|-------|
| Count | [N] | [M] | [±X] |

### Verdict: ☐ PASS / ☐ FAIL

**Pass Criteria:** Expected = Actual (delta must be 0)
**If FAIL, reason:** Expected [N], got [M] (off by [X])
```

## 4.4 Structure Verification Check

```markdown
## STRUCTURE CHECK: [STRUCTURE ELEMENT]

### Requirement
**ID:** [R#]
**Source:** "[exact quote from spec]"
**Type:** Path / Naming / Organization

### Specified Structure
```
[expected structure from design]
```

### Actual Structure

**Command:**
```bash
tree "[path]" -L 2
# or for Windows:
dir /s "[path]"
```

**Output:**
```
[paste actual output here]
```

### Comparison
| Element | Specified | Actual | Match? |
|---------|-----------|--------|--------|
| [item1] | [spec] | [actual] | ☐ |
| [item2] | [spec] | [actual] | ☐ |
| [item3] | [spec] | [actual] | ☐ |

### Verdict: ☐ PASS / ☐ FAIL

**If FAIL, reason:** [explanation of mismatch]
```

## 4.5 Contract/API Verification Check

```markdown
## CONTRACT CHECK: [FUNCTION/INTERFACE NAME]

### Requirement
**ID:** [R#]
**Source:** "[exact quote from spec]"

### Specified Signature
```javascript
// From design:
[specified function/interface signature]
```

### Actual Signature

**Command:**
```bash
grep -A 10 "function [name]\|export.*[name]\|class [name]" "[file]"
```

**Output:**
```javascript
// From implementation:
[actual function/interface signature]
```

### Signature Comparison
| Aspect | Specified | Actual | Match? |
|--------|-----------|--------|--------|
| Name | [x] | [y] | ☐ |
| Param 1 | [type] | [type] | ☐ |
| Param 2 | [type] | [type] | ☐ |
| Return | [type] | [type] | ☐ |
| Async | [yes/no] | [yes/no] | ☐ |

### Verdict: ☐ PASS / ☐ FAIL

**If FAIL, reason:** [specific mismatch]
```

## 4.6 Section Presence Check (for Skills/Docs)

```markdown
## SECTION PRESENCE CHECK: [DOCUMENT NAME]

### Requirement
**ID:** [R#]
**Source:** "[exact quote from spec]"
**Required Sections:** [list from spec]

### Verification

**Command:**
```bash
grep -n "^#" "[file]" | head -30
# Shows all headers
```

**Output:**
```
[paste actual output here]
```

### Section Checklist
| Required Section | Found? | Line # |
|-----------------|--------|--------|
| [Section 1] | ☐ YES / ☐ NO | [N] |
| [Section 2] | ☐ YES / ☐ NO | [N] |
| [Section 3] | ☐ YES / ☐ NO | [N] |
| [Section 4] | ☐ YES / ☐ NO | [N] |

### Verdict: ☐ PASS / ☐ FAIL

**If FAIL, missing sections:** [list]
```

## 4.7 PRISM-Specific Check Templates

### Material Database Check
```markdown
## MATERIAL DATABASE CHECK: [DATABASE NAME]

### Requirements from Spec
- Material count: [N]
- Parameters per material: [127 or as specified]
- Categories: [list]

### Verification

**Material Count:**
```bash
grep -c "materialId\|\"id\":" "[file]"
```
Result: [N]

**Parameter Count (sample material):**
```bash
# Count fields in first material entry
[command to count parameters]
```
Result: [N]

**Categories Present:**
```bash
grep -o "category.*:" "[file]" | sort | uniq
```
Result: [list]

### Summary
| Metric | Specified | Actual | Pass? |
|--------|-----------|--------|-------|
| Materials | [N] | [M] | ☐ |
| Parameters | [N] | [M] | ☐ |
| Categories | [list] | [list] | ☐ |

### Verdict: ☐ PASS / ☐ FAIL
```

### Skill File Check
```markdown
## SKILL FILE CHECK: [SKILL NAME]

### Requirements from Spec
- Location: [path]
- Size: ~[N]KB
- Sections: [list]

### Verification

**YAML Frontmatter Valid:**
```bash
head -20 "[file]" | grep -E "^---|^name:|^description:"
```
Result: [output]

**Required Fields in Frontmatter:**
| Field | Present? |
|-------|----------|
| name | ☐ |
| description | ☐ |

**File Size:**
```bash
wc -c "[file]"
```
Result: [N] bytes (~[N/1024]KB)

**Sections Present:**
```bash
grep "^# SECTION" "[file]"
```
Result: [output]

### Verdict: ☐ PASS / ☐ FAIL
```

# SECTION 6: VERDICT PROTOCOL

## 6.1 Purpose

The verdict is the final output of spec review. It must be clear, documented, and actionable.

## 6.2 Verdict Decision Tree

```
START
  │
  ▼
┌─────────────────────────┐
│ Count all checks        │
│ - Deliverables: N       │
│ - Structure: N          │
│ - Contracts: N          │
│ - Counts: N             │
│ - TOTAL: N              │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Any failures?           │
└───────────┬─────────────┘
            │
      ┌─────┴─────┐
      │           │
      ▼           ▼
    YES          NO
      │           │
      ▼           ▼
┌──────────┐  ┌──────────┐
│   SPEC   │  │   SPEC   │
│VIOLATION │  │ APPROVED │
└──────────┘  └──────────┘
      │           │
      ▼           ▼
  Document     Proceed to
  failures     SP.1.5
  Return to    
  SP.1.3       
```

## 6.3 SPEC APPROVED Protocol

When all checks pass:

```markdown
## SPEC REVIEW VERDICT: ✅ APPROVED

**Review Date:** [YYYY-MM-DD HH:MM]
**Deliverable:** [what was reviewed]
**Specification Source:** [reference to design doc]

### Summary
| Phase | Checks | Passed | Failed |
|-------|--------|--------|--------|
| Deliverables | [N] | [N] | 0 |
| Structure | [N] | [N] | 0 |
| Contracts | [N] | [N] | 0 |
| Counts | [N] | [N] | 0 |
| **TOTAL** | [N] | [N] | **0** |

### Verdict
**SPEC APPROVED** - All [N] specification requirements verified.

### Next Action
Proceed to **prism-sp-review-quality** (SP.1.5) for code quality review.

### Handoff Data
- Deliverable path: [path]
- Spec reference: [reference]
- Evidence report: [this document]
```

## 6.4 SPEC VIOLATION Protocol

When any check fails:

```markdown
## SPEC REVIEW VERDICT: ❌ VIOLATION

**Review Date:** [YYYY-MM-DD HH:MM]
**Deliverable:** [what was reviewed]
**Specification Source:** [reference to design doc]

### Summary
| Phase | Checks | Passed | Failed |
|-------|--------|--------|--------|
| Deliverables | [N] | [X] | [Y] |
| Structure | [N] | [X] | [Y] |
| Contracts | [N] | [X] | [Y] |
| Counts | [N] | [X] | [Y] |
| **TOTAL** | [N] | [X] | **[Y]** |

### Verdict
**SPEC VIOLATION** - [Y] of [N] specification requirements failed.

### Failed Requirements

| ID | Requirement | Expected | Actual | Fix Required |
|----|-------------|----------|--------|--------------|
| [R#] | [requirement] | [expected] | [actual] | [what to do] |
| [R#] | [requirement] | [expected] | [actual] | [what to do] |

### Prioritized Fix List

**Priority 1 - Quick Fixes (< 5 min each):**
1. [Fix description]
2. [Fix description]

**Priority 2 - Medium Fixes (5-15 min each):**
1. [Fix description]

**Priority 3 - Major Rework (> 15 min):**
1. [Fix description]

### Next Action
Return to **prism-sp-execution** (SP.1.3) to address violations.
After fixes, re-run spec review.

### Handoff Data
- Deliverable path: [path]
- Violations: [count]
- Fix list: [above]
```

## 6.5 Verdict Report Location

Save the verdict report:
1. **Inline** in session - Always include in conversation
2. **CURRENT_STATE.json** - Update with review result
3. **Session log** - If detailed logging enabled

### State Update on APPROVED
```json
{
  "specReview": {
    "status": "APPROVED",
    "date": "2026-01-24T08:00:00Z",
    "checksTotal": 15,
    "checksPassed": 15,
    "nextSkill": "prism-sp-review-quality"
  }
}
```

### State Update on VIOLATION
```json
{
  "specReview": {
    "status": "VIOLATION",
    "date": "2026-01-24T08:00:00Z",
    "checksTotal": 15,
    "checksPassed": 12,
    "checksFailed": 3,
    "violations": ["R3", "R7", "R12"],
    "nextSkill": "prism-sp-execution"
  }
}
```

# SECTION 8: EXAMPLES

## 8.1 Example 1: Skill File Spec Review

### Scenario
After SP.1.3 execution, review the new prism-sp-review-spec skill against its design.

### Phase 1: Load Specification

**Source:** Brainstorm session SP.1.4
**Approval:** User confirmed "lets continue"

**Extracted Requirements:**

| ID | Requirement | Type |
|----|-------------|------|
| R1 | Create skill file at prism-sp-review-spec/SKILL.md | DELIVERABLE |
| R2 | Size approximately 25-30KB | COUNT |
| R3 | Contains 9 sections | COUNT |
| R4 | 5-phase review process documented | STRUCTURE |
| R5 | Has YAML frontmatter | STRUCTURE |
| R6 | Hands off to SP.1.5 on pass | CONTRACT |
| R7 | Hands off to SP.1.3 on fail | CONTRACT |

### Phase 2: Check Deliverables

**R1: File exists**
```
Command: dir "C:\...\prism-sp-review-spec\SKILL.md"
Output:  01/24/2026  08:15 AM    29,876 SKILL.md
Verdict: ✅ PASS
```

### Phase 3: Check Structure

**R5: YAML frontmatter**
```
Command: head -15 SKILL.md
Output:
Verdict: ✅ PASS
```

### Phase 4: Check Counts

**R2: Size ~25-30KB**
```
Command: wc -c SKILL.md
Output: 29876 SKILL.md
Verdict: ✅ PASS (29.8KB is within 25-30KB)
```

**R3: Contains 9 sections**
```
Command: grep -c "^# SECTION" SKILL.md
Output: 9
Verdict: ✅ PASS
```

### Phase 5: Verdict

| Phase | Checks | Passed | Failed |
|-------|--------|--------|--------|
| Deliverables | 1 | 1 | 0 |
| Structure | 2 | 2 | 0 |
| Counts | 2 | 2 | 0 |
| Contracts | 2 | 2 | 0 |
| **TOTAL** | 7 | 7 | 0 |

**VERDICT: ✅ SPEC APPROVED**

## 8.3 Example 3: Engine Module Contract Review

### Scenario
Review extracted cutting force engine against spec.

### Phase 1: Load Specification

**Extracted Requirements:**

| ID | Requirement | Type |
|----|-------------|------|
| R1 | Export calculateCuttingForce function | CONTRACT |
| R2 | Accepts (material, toolParams, conditions) | CONTRACT |
| R3 | Returns { Fc, Ft, Fr, power, torque } | CONTRACT |
| R4 | Located in _ENGINES/cutting_force_engine.js | STRUCTURE |

### Phase 4: Check Contracts

**R1 & R2: Function signature**
```
Command: grep -A 5 "export.*calculateCuttingForce" cutting_force_engine.js
Output:
export function calculateCuttingForce(material, toolParams, conditions) {
  // ...
}
Verdict: ✅ PASS
```

**R3: Return type**
```
Command: grep -B 2 "return {" cutting_force_engine.js
Output:
  return {
    Fc: tangentialForce,
    Ft: thrustForce,
    Fr: radialForce,
    power: cuttingPower,
    torque: spindleTorque
  };
Verdict: ✅ PASS - All 5 expected properties present
```

### Phase 5: Verdict

**VERDICT: ✅ SPEC APPROVED**

# APPENDIX A: CHECKLIST TEMPLATES

## A.1 Full Spec Review Checklist

```markdown
## SPEC REVIEW CHECKLIST

**Deliverable:** [name]
**Date:** [YYYY-MM-DD]
**Reviewer:** Claude

### Phase 1: Load Specification
- [ ] Design document located
- [ ] Requirements extracted
- [ ] Requirements categorized
- [ ] Checklist built

### Phase 2: Deliverables
| ID | Deliverable | Exists? | Non-Empty? | Evidence |
|----|-------------|---------|------------|----------|
| D1 | | ☐ | ☐ | |

### Phase 3: Structure
| ID | Structure Req | Correct? | Evidence |
|----|---------------|----------|----------|
| S1 | | ☐ | |

### Phase 4: Contracts
| ID | Contract | Matches? | Evidence |
|----|----------|----------|----------|
| C1 | | ☐ | |

### Phase 5: Counts
| ID | Count Req | Expected | Actual | Pass? |
|----|-----------|----------|--------|-------|
| N1 | | | | ☐ |

### Verdict
- [ ] SPEC APPROVED - Proceed to SP.1.5
- [ ] SPEC VIOLATION - Return to SP.1.3

**Total:** [X] of [Y] checks passed
```

## A.2 Minimal Quick Check

For simple deliverables:

```markdown
## QUICK SPEC CHECK: [DELIVERABLE]

☐ File exists at specified path
☐ File non-empty
☐ In correct location
☐ Matches naming convention

Verdict: ☐ PASS / ☐ FAIL
```

# DOCUMENT END

**Skill:** prism-sp-review-spec
**Version:** 1.0
**Total Sections:** 9 + 2 Appendices
**Part of:** SP.1 Core Development Workflow (SP.1.4 of 8)
**Created:** Session SP.1.4
**Status:** COMPLETE

---
