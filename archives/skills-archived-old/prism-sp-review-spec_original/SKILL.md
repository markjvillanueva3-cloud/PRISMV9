---
name: prism-sp-review-spec
description: |
  Specification compliance gate - verify output matches approved design.
  Use when: after execution, before quality review, check spec compliance.
  5-phase process: LOAD SPEC, CHECK DELIVERABLES, CHECK STRUCTURE,
  CHECK CONTRACTS, VERDICT. Binary PASS/FAIL gate with evidence.
  Requires completed execution from prism-sp-execution.
  Hands off to prism-sp-review-quality (pass) or back to execution (fail).
  Part of SP.1 Core Development Workflow.
---
# PRISM-SP-REVIEW-SPEC
## Specification Compliance Gate
### Version 1.0 | Development Workflow | ~25KB

---

# SECTION 1: OVERVIEW

## 1.1 Purpose

This skill verifies that executed work matches the approved design from brainstorm. It answers the question: **"Did we build the RIGHT THING?"** - not "Did we build it right?" (that's quality review).

This is a **BINARY PASS/FAIL GATE**. Nothing proceeds to quality review until specification compliance is confirmed. No partial passes. No exceptions.

**Core Philosophy:** The approved design is the contract. Execution must fulfill that contract exactly. Any deviation is a violation that must be fixed before proceeding.

## 1.2 When to Use

**Explicit Triggers:**
- When user says "review spec" or "check specification"
- When user says "did we build the right thing"
- When user says "verify against spec"
- When user says "specification review"
- After execution completes, before quality review

**Contextual Triggers:**
- After prism-sp-execution reports completion
- When transitioning from execution to review phase
- When user questions if output matches design

**NOT for:**
- Code quality checks (use prism-sp-review-quality)
- Bug detection (use prism-sp-debugging)
- Final completion proof (use prism-sp-verification)
- Design decisions (design phase is over)

## 1.3 Prerequisites

**Required Input:**
- [ ] Approved design document from prism-sp-brainstorm
- [ ] Completed execution from prism-sp-execution
- [ ] Evidence of completion (file listings, counts)

**Required State:**
- [ ] CURRENT_STATE.json shows execution complete
- [ ] All deliverable paths accessible
- [ ] Design document retrievable

## 1.4 Outputs

**Primary Outputs:**
- Spec compliance report with evidence
- Pass/fail verdict for each requirement
- Overall pass/fail decision

**On PASS:**
- Spec approval documentation
- Handoff to prism-sp-review-quality (SP.1.5)

**On FAIL:**
- Prioritized violation list
- Required fixes documented
- Handoff back to prism-sp-execution (SP.1.3)

## 1.5 Key Principles

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                         SPEC REVIEW PRINCIPLES                                          │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  PRINCIPLE 1: DESIGN IS THE CONTRACT                                                    │
│  ───────────────────────────────────                                                    │
│  The approved brainstorm design is the specification.                                   │
│  Every explicit requirement must be fulfilled.                                          │
│  "Close enough" is not enough.                                                          │
│                                                                                         │
│  PRINCIPLE 2: BINARY VERDICT                                                            │
│  ───────────────────────────────────                                                    │
│  Either PASS (100% compliant) or FAIL (any violation).                                  │
│  No partial passes. No "mostly done."                                                   │
│  One failure = entire review fails.                                                     │
│                                                                                         │
│  PRINCIPLE 3: EVIDENCE REQUIRED                                                         │
│  ───────────────────────────────────                                                    │
│  Every check must produce proof.                                                        │
│  "File exists" → show listing with path and size.                                       │
│  "Count matches" → show command output.                                                 │
│                                                                                         │
│  PRINCIPLE 4: TRACEABLE TO SPEC                                                         │
│  ───────────────────────────────────                                                    │
│  Every check links back to a specific design requirement.                               │
│  Quote the exact specification text.                                                    │
│  No invented requirements.                                                              │
│                                                                                         │
│  PRINCIPLE 5: ACTIONABLE FAILURES                                                       │
│  ───────────────────────────────────                                                    │
│  If something fails, explain exactly what's wrong.                                      │
│  Provide the fix needed.                                                                │
│  Prioritize violations (all are blocking, but some are quick fixes).                    │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 1.6 Position in Workflow

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              SP.1 CORE WORKFLOW                                         │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  SP.1.1              SP.1.2              SP.1.3              SP.1.4                     │
│  ┌─────────┐        ┌─────────┐        ┌─────────┐        ┌─────────┐                  │
│  │BRAINSTORM│──────▶│PLANNING │──────▶│EXECUTION│──────▶│REVIEW   │                  │
│  │         │        │         │        │         │        │  SPEC   │                  │
│  │ Design  │        │ Tasks   │        │ Do Work │        │         │                  │
│  └─────────┘        └─────────┘        └─────────┘        └────┬────┘                  │
│                                                                │                        │
│                                              ┌─────────────────┴─────────────────┐     │
│                                              │                                   │     │
│                                              ▼                                   ▼     │
│                                         ┌─────────┐                         ┌───────┐ │
│                                         │  PASS   │                         │ FAIL  │ │
│                                         └────┬────┘                         └───┬───┘ │
│                                              │                                   │     │
│                                              ▼                                   │     │
│                                         SP.1.5                                   │     │
│                                         ┌─────────┐                              │     │
│                                         │REVIEW   │◀─────────────────────────────┘     │
│                                         │QUALITY  │     (after fixes in SP.1.3)        │
│                                         └─────────┘                                    │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

**This skill answers:** "Did we build what we said we would build?"
**Next skill answers:** "Did we build it well?" (quality, style, patterns)

---

# SECTION 2: THE 5-PHASE PROCESS

## 2.1 Quick Reference Checklist

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

---

# SECTION 3: SPEC EXTRACTION

## 3.1 Purpose

Before checking compliance, you must know what to check against. This section provides templates and guidance for extracting verifiable requirements from approved designs.

## 3.2 Where to Find the Specification

### Primary Sources (in order of authority)

1. **Approved Brainstorm Output**
   - Location: Session where design was approved
   - Look for: "APPROVED" or "proceed to planning" confirmation
   - Contains: Scope, approach, details chunks

2. **CURRENT_STATE.json Reference**
   - Field: `currentSession.designApproval` or similar
   - May reference: Design document path

3. **Session Logs**
   - Location: `_LOGS/SESSION_*.md`
   - Look for: Brainstorm phase with user approval

4. **Design Documents Folder**
   - Location: `_DOCS/` or `_DESIGNS/`
   - Look for: Documents matching current task

### If No Specification Found

```
⛔ STOP - CANNOT PROCEED

No approved specification found for this work.

Options:
1. Locate the original brainstorm session
2. Ask user for specification reference
3. Run prism-sp-brainstorm to create specification

DO NOT review without a specification to check against.
```

## 3.3 Spec Extraction Template

```markdown
## SPEC EXTRACTION: [DELIVERABLE NAME]

**Source Document:** [path or session reference]
**Approval Date:** [when user approved]
**Approver:** [user who approved - typically "Mark"]

---

### EXPLICIT REQUIREMENTS

Requirements stated directly in the design:

| ID | Requirement Text | Type | Quote from Design |
|----|-----------------|------|-------------------|
| R1 | | DELIVERABLE / COUNT / STRUCTURE / CONTRACT | "[exact text]" |
| R2 | | | |
| R3 | | | |

---

### IMPLICIT REQUIREMENTS

Standard PRISM requirements that apply:

| ID | Standard Requirement | Applies to This Deliverable? |
|----|---------------------|------------------------------|
| I1 | File exists at specified path | ☐ YES / ☐ NO |
| I2 | File is non-empty | ☐ YES / ☐ NO |
| I3 | YAML frontmatter valid (if skill) | ☐ YES / ☐ NO |
| I4 | Required sections present | ☐ YES / ☐ NO |
| I5 | Naming convention followed | ☐ YES / ☐ NO |
| I6 | In correct directory | ☐ YES / ☐ NO |

---

### DERIVED REQUIREMENTS

Requirements inferred from context:

| ID | Derived From | Requirement | Confidence |
|----|--------------|-------------|------------|
| D1 | [source requirement] | [derived requirement] | HIGH / MEDIUM |

Note: Only HIGH confidence derived requirements should be checked.
MEDIUM confidence should be flagged but not cause failure.

---

### REQUIREMENTS SUMMARY

| Type | Count |
|------|-------|
| Explicit | [N] |
| Implicit | [N] |
| Derived (HIGH) | [N] |
| **TOTAL CHECKS** | [N] |
```

## 3.4 Requirement Types Guide

### DELIVERABLE Requirements
Things that must exist.

**Identification:** Look for:
- "Create [X]"
- "Build [X]"
- "Extract [X]"
- "Output: [X]"
- "Deliverable: [X]"

**Example:**
> "Create a skill file at prism-sp-review-spec/SKILL.md"

**Check:** File existence, non-empty

### COUNT Requirements
Specific numbers that must match.

**Identification:** Look for:
- Numbers: "127 parameters", "6 databases", "8 sections"
- Ranges: "5-10 items", "at least 3"
- Exact matches: "exactly 4", "must have 12"

**Example:**
> "Material must have 127 parameters"

**Check:** Count command output = specified number

### STRUCTURE Requirements
Organization, naming, location requirements.

**Identification:** Look for:
- Paths: "in the _SKILLS folder"
- Names: "named prism-[category]-[name]"
- Organization: "one file per section"

**Example:**
> "Skill file should be in prism-sp-review-spec/SKILL.md"

**Check:** Path verification, directory listing

### CONTRACT Requirements
API signatures, interfaces, dependencies.

**Identification:** Look for:
- Functions: "function X(a, b) returns Y"
- Interfaces: "must export [interface]"
- Dependencies: "requires prism-sp-planning"

**Example:**
> "Handoff to prism-sp-review-quality on pass"

**Check:** Code inspection, grep for signatures

## 3.5 Common Extraction Mistakes

### ❌ Mistake 1: Inventing Requirements
```
WRONG: "Code should be well-commented"
       (Not in spec - this is quality review territory)

RIGHT: Only check what was explicitly specified
```

### ❌ Mistake 2: Vague Requirements
```
WRONG: "Good performance" - not verifiable

RIGHT: "Execution under 500ms" - verifiable
       (If spec says "good performance", flag as unverifiable)
```

### ❌ Mistake 3: Missing Implicit Standards
```
WRONG: Only check explicit requirements

RIGHT: Also check PRISM standard requirements
       (File existence, naming, location, etc.)
```

### ❌ Mistake 4: Over-Derivation
```
WRONG: "Since we're building a skill, it should have examples"
       (Derived, but not specified)

RIGHT: Only enforce derived requirements if HIGH confidence
       Flag others for quality review
```

---

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

---

# SECTION 5: EVIDENCE CAPTURE

## 5.1 Purpose

Every compliance check must produce evidence. "I checked it" is not evidence. Show the actual output, file listing, or command result.

## 5.2 Evidence Requirements by Check Type

| Check Type | Required Evidence |
|------------|-------------------|
| Deliverable Exists | File listing with path, size, date |
| Count Matches | Command output showing exact count |
| Structure Correct | Directory tree or file listing |
| Contract Matches | Code snippet showing actual signature |
| Section Present | Grep output with line numbers |

## 5.3 Evidence Quality Standards

### ✅ GOOD Evidence
```
**Deliverable Check: SKILL.md exists**
Command: dir "C:\PRISM...\prism-sp-review-spec\SKILL.md"
Output:
    01/24/2026  07:45 AM           28,543 SKILL.md
               1 File(s)         28,543 bytes
Verdict: PASS - File exists, 28,543 bytes
```

### ❌ BAD Evidence
```
**Deliverable Check: SKILL.md exists**
I checked and the file is there.
Verdict: PASS
```

## 5.4 Evidence Capture Commands

### File Existence
```bash
# Windows
dir "[full path]"

# Linux/Mac
ls -la "[full path]"
```

### Count Verification
```bash
# Count lines
wc -l "[file]"

# Count pattern occurrences
grep -c "[pattern]" "[file]"

# Count with context
grep -n "[pattern]" "[file]" | wc -l
```

### Structure Verification
```bash
# Directory tree (Windows)
dir /s "[path]"

# Directory tree (Linux/Mac)
tree "[path]" -L 2

# File listing with sizes
ls -laR "[path]"
```

### Signature Extraction
```bash
# Find function definitions
grep -n "function\|export\|class" "[file]"

# Get function with context
grep -A 10 "function [name]" "[file]"
```

### Header/Section Detection
```bash
# Find markdown headers
grep -n "^#" "[file]"

# Find YAML frontmatter
head -30 "[file]"
```

## 5.5 Evidence Storage

Evidence should be:
1. **Inline** - In the review report itself
2. **Timestamped** - When was the check performed
3. **Reproducible** - Command can be re-run to verify

### Evidence Block Format
```markdown
### Evidence: [CHECK NAME]

**Timestamp:** [YYYY-MM-DD HH:MM]
**Command:** `[exact command]`
**Output:**
```
[exact output, no modifications]
```
**Interpretation:** [what this proves]
```

---

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

---

# SECTION 7: FAILURE HANDLING

## 7.1 Purpose

When spec violations are found, handle them systematically. Don't panic, don't skip, don't rationalize. Document and fix.

## 7.2 Failure Categories

| Category | Description | Action |
|----------|-------------|--------|
| **Missing Deliverable** | Promised file/component doesn't exist | Create it |
| **Wrong Count** | Number doesn't match spec | Add/remove items |
| **Wrong Structure** | Organization doesn't match | Move/rename |
| **Wrong Contract** | API signature mismatch | Update signature |
| **Partial Implementation** | Some parts missing | Complete implementation |

## 7.3 Failure Response Protocol

```
FAILURE DETECTED
      │
      ▼
┌─────────────────────────┐
│ 1. DOCUMENT the failure │
│    - What was expected  │
│    - What was found     │
│    - Exact evidence     │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 2. CLASSIFY the failure │
│    - Missing?           │
│    - Wrong?             │
│    - Incomplete?        │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 3. ESTIMATE fix effort  │
│    - Quick (< 5 min)    │
│    - Medium (5-15 min)  │
│    - Major (> 15 min)   │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 4. PRIORITIZE fixes     │
│    - All are blocking   │
│    - Order by effort    │
│    - Quick wins first   │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 5. HANDOFF to execution │
│    - Clear fix list     │
│    - Expected outcomes  │
│    - Return for re-review│
└─────────────────────────┘
```

## 7.4 Common Failures and Fixes

### Missing File
```markdown
**Failure:** Required file does not exist
**Evidence:** `dir [path]` returns "File Not Found"
**Fix:** Create the file with required content
**Effort:** Depends on content complexity
```

### Count Mismatch
```markdown
**Failure:** Expected 127 items, found 125
**Evidence:** `grep -c [pattern]` returns 125
**Fix:** Add 2 missing items
**Effort:** Quick if items are simple
```

### Wrong Location
```markdown
**Failure:** File at wrong path
**Evidence:** File exists at [wrong], spec says [correct]
**Fix:** Move file to correct location
**Effort:** Quick - just a move command
```

### Missing Sections
```markdown
**Failure:** Required section not found
**Evidence:** `grep "^# SECTION X"` returns nothing
**Fix:** Add the missing section
**Effort:** Medium - need to write section content
```

### Signature Mismatch
```markdown
**Failure:** Function signature doesn't match spec
**Evidence:** Spec says `func(a, b)`, code has `func(a)`
**Fix:** Update function signature
**Effort:** Medium - may affect callers
```

## 7.5 DO NOT

❌ **DO NOT rationalize failures**
> "Well, 125 is close enough to 127..."
> NO. Spec says 127. We need 127.

❌ **DO NOT defer to quality review**
> "We can fix this in quality review..."
> NO. Spec compliance is checked HERE.

❌ **DO NOT change the spec to match implementation**
> "Let's update the spec to say 125..."
> NO. Implementation must match spec, not vice versa.

❌ **DO NOT partial pass**
> "13 of 15 checks passed, that's pretty good..."
> NO. All checks must pass. One failure = overall failure.

---

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
---
name: prism-sp-review-spec
description: |
  Specification compliance gate...
---
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

---

## 8.2 Example 2: Material Database with Violation

### Scenario
Review extracted materials database against spec.

### Phase 1: Load Specification

**Extracted Requirements:**

| ID | Requirement | Type |
|----|-------------|------|
| R1 | Create titanium_alloys.json | DELIVERABLE |
| R2 | Contains 45 materials | COUNT |
| R3 | Each material has 127 parameters | COUNT |
| R4 | Located in _MATERIALS/metals/ | STRUCTURE |

### Phase 2: Check Deliverables

**R1: File exists**
```
Command: dir "_MATERIALS\metals\titanium_alloys.json"
Output:  01/24/2026  07:30 AM    156,234 titanium_alloys.json
Verdict: ✅ PASS
```

### Phase 3: Check Structure

**R4: Correct location**
```
Expected: _MATERIALS/metals/titanium_alloys.json
Actual: _MATERIALS/metals/titanium_alloys.json
Verdict: ✅ PASS
```

### Phase 4: Check Counts

**R2: Material count**
```
Command: grep -c '"materialId"' titanium_alloys.json
Output: 43
Expected: 45
Verdict: ❌ FAIL (missing 2 materials)
```

**R3: Parameters per material (sample)**
```
Command: [count parameters in first material]
Output: 127
Verdict: ✅ PASS
```

### Phase 5: Verdict

| Phase | Checks | Passed | Failed |
|-------|--------|--------|--------|
| Deliverables | 1 | 1 | 0 |
| Structure | 1 | 1 | 0 |
| Counts | 2 | 1 | **1** |
| **TOTAL** | 4 | 3 | **1** |

**VERDICT: ❌ SPEC VIOLATION**

### Violation Report

| ID | Expected | Actual | Fix |
|----|----------|--------|-----|
| R2 | 45 materials | 43 materials | Add Ti-6Al-4V-ELI, Ti-6Al-2Sn-4Zr-2Mo |

**Priority:** Quick fix - add 2 material entries
**Next Action:** Return to SP.1.3, add missing materials, re-review

---

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

---

# SECTION 9: INTEGRATION

## 9.1 Skill Metadata

```yaml
skill_id: prism-sp-review-spec
version: 1.0.0
category: development-core
priority: CRITICAL

triggers:
  keywords:
    - "review spec"
    - "check specification"
    - "spec compliance"
    - "did we build the right thing"
    - "verify against spec"
    - "specification review"
  contexts:
    - After prism-sp-execution completes
    - Before prism-sp-review-quality
    - When questioning if output matches design

activation_rule: |
  IF (execution complete)
  AND (design document exists)
  AND (not yet spec reviewed)
  THEN activate prism-sp-review-spec

requires:
  - Approved design from prism-sp-brainstorm
  - Completed execution from prism-sp-execution

outputs:
  - Spec compliance report
  - Pass/fail verdict
  - If fail: violation list with fixes

next_skills:
  on_pass: prism-sp-review-quality
  on_fail: prism-sp-execution
```

## 9.2 Handoff Protocols

### Receiving Handoff from SP.1.3 (Execution)

**Expected Input:**
```json
{
  "from": "prism-sp-execution",
  "status": "EXECUTION_COMPLETE",
  "deliverables": [
    {"path": "...", "type": "...", "evidence": "..."}
  ],
  "designReference": "...",
  "timestamp": "..."
}
```

**Activation Checklist:**
- [ ] Execution reports complete
- [ ] Deliverable paths accessible
- [ ] Design document retrievable
- [ ] Ready to begin spec review

### Handoff to SP.1.5 (Quality Review) - On Pass

**Output:**
```json
{
  "from": "prism-sp-review-spec",
  "status": "SPEC_APPROVED",
  "checksTotal": 15,
  "checksPassed": 15,
  "deliverables": [...],
  "evidenceReport": "...",
  "timestamp": "..."
}
```

**Message to Next Skill:**
> Spec review PASSED. All [N] specification requirements verified.
> Proceeding to quality review (SP.1.5).
> Deliverable ready for style, pattern, and quality checks.

### Handoff to SP.1.3 (Execution) - On Fail

**Output:**
```json
{
  "from": "prism-sp-review-spec",
  "status": "SPEC_VIOLATION",
  "checksTotal": 15,
  "checksPassed": 12,
  "checksFailed": 3,
  "violations": [
    {"id": "R3", "expected": "...", "actual": "...", "fix": "..."},
    {"id": "R7", "expected": "...", "actual": "...", "fix": "..."}
  ],
  "timestamp": "..."
}
```

**Message to Execution:**
> Spec review FAILED. [3] of [15] requirements violated.
> Returning to execution to fix violations.
> After fixes, will re-run spec review.

## 9.3 State Management

### Reading State
```javascript
// Check if spec review needed
const state = readCurrentState();
if (state.execution?.status === 'COMPLETE' && !state.specReview) {
  // Activate spec review
}
```

### Updating State on Pass
```javascript
updateCurrentState({
  specReview: {
    status: 'APPROVED',
    date: new Date().toISOString(),
    checksTotal: totalChecks,
    checksPassed: passedChecks,
    nextSkill: 'prism-sp-review-quality'
  }
});
```

### Updating State on Fail
```javascript
updateCurrentState({
  specReview: {
    status: 'VIOLATION',
    date: new Date().toISOString(),
    checksTotal: totalChecks,
    checksPassed: passedChecks,
    checksFailed: failedChecks,
    violations: violationList,
    nextSkill: 'prism-sp-execution'
  }
});
```

## 9.4 Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                     PRISM-SP-REVIEW-SPEC QUICK REFERENCE                                │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  WHEN: After execution (SP.1.3), before quality review (SP.1.5)                         │
│                                                                                         │
│  QUESTION: "Did we build the RIGHT THING?"                                              │
│                                                                                         │
│  5 PHASES:                                                                              │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                                               │
│  │LOAD │→│DELIV│→│STRUCT│→│CONTR│→│VERD │                                               │
│  │SPEC │ │CHECK│ │CHECK │ │CHECK│ │ICT  │                                               │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘                                               │
│                                                                                         │
│  VERDICT:                                                                               │
│  • All pass → SPEC APPROVED → SP.1.5                                                    │
│  • Any fail → SPEC VIOLATION → SP.1.3                                                   │
│                                                                                         │
│  KEY RULES:                                                                             │
│  • Binary pass/fail (no partial passes)                                                 │
│  • Evidence required for every check                                                    │
│  • Quote exact spec text                                                                │
│  • Implementation matches spec, never vice versa                                        │
│                                                                                         │
│  EVIDENCE COMMANDS:                                                                     │
│  • Exists: dir [path] / ls -la [path]                                                   │
│  • Count: grep -c [pattern] [file]                                                      │
│  • Structure: tree [path] / dir /s [path]                                               │
│  • Signature: grep -A 5 "function" [file]                                               │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

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

---

# APPENDIX B: TROUBLESHOOTING

## B.1 Common Issues

### "Can't find the specification"
1. Check CURRENT_STATE.json for design reference
2. Search session logs for brainstorm phase
3. Look in _DOCS folder for design documents
4. Ask user for specification reference

### "Requirement is vague, can't verify"
1. Document requirement as "UNVERIFIABLE"
2. Flag for user clarification
3. Don't fail or pass - escalate

### "Count is close but not exact"
1. Verify count method is correct
2. Check for duplicates or exclusions
3. If truly different: FAIL (close is not pass)

### "Structure exists but slightly different"
1. Document exact difference
2. Determine if difference is meaningful
3. If spec says X and we have Y: FAIL

---

# DOCUMENT END

**Skill:** prism-sp-review-spec
**Version:** 1.0
**Total Sections:** 9 + 2 Appendices
**Part of:** SP.1 Core Development Workflow (SP.1.4 of 8)
**Created:** Session SP.1.4
**Status:** COMPLETE

---
