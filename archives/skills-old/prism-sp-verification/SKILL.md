---
name: prism-sp-verification
description: |
  Evidence-based completion proof with Level 5 verification standards.
  Use when: claiming work complete, before handoff, need to prove done.
  5 evidence levels: Claim(L1), Reference(L2), Listing(L3), Sample(L4), Verified(L5).
  Minimum for "complete" is Level 5 on all deliverables.
  6-step process: gather deliverables, verify each, verify counts, verify integration,
  compile evidence report, verdict.
  Part of SP.1 Core Development Workflow.
---

# PRISM-SP-VERIFICATION
## Evidence-Based Completion Proof
### Version 1.0 | Development Workflow | ~40KB

---

# SECTION 1: OVERVIEW

## 1.1 Purpose

This skill ensures work is PROVEN complete, not just claimed complete. Every assertion must have verifiable evidence. No assumptions. No "I think it's done." Only proof.

**The Problem:** Without verification:
- "Done" means different things to different people
- Work declared complete still has gaps
- No proof for audits or reviews
- Quality depends on who's checking
- Claims made without evidence

**The Solution:** Evidence-based verification requiring Level 5 proof for all deliverables before any work is declared "complete."

## 1.2 The Verification Mindset

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           THE VERIFICATION MINDSET                                      │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  ❌ WRONG MINDSET:                                                                      │
│  "I created the files"                                                                  │
│  "It should be there"                                                                   │
│  "I'm pretty sure it's complete"                                                        │
│  "Trust me, it's done"                                                                  │
│                                                                                         │
│  ✅ RIGHT MINDSET:                                                                      │
│  "Here's the directory listing showing the files exist"                                 │
│  "Here's the file info showing correct size"                                            │
│  "Here's the content sample showing correct structure"                                  │
│  "Here's the count verification matching the spec"                                      │
│                                                                                         │
│  KEY INSIGHT:                                                                           │
│  ────────────                                                                           │
│  A claim without evidence is just an opinion.                                           │
│  Evidence transforms opinion into fact.                                                 │
│  Level 5 evidence = indisputable proof.                                                 │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 1.3 The Cardinal Rule: No Claim Without Proof

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                         │
│  ⛔⛔⛔ CRITICAL: NO CLAIM WITHOUT PROOF ⛔⛔⛔                                          │
│                                                                                         │
│  Every completion claim MUST have verifiable evidence.                                  │
│                                                                                         │
│  ❌ "I created 125 materials"                                                           │
│     Evidence: None                                                                      │
│     Status: UNVERIFIED CLAIM                                                            │
│                                                                                         │
│  ✅ "Created 125 materials - Evidence:"                                                 │
│     • ls titanium_alloys.json: 45,230 bytes                                             │
│     • grep -c '"id":' titanium_alloys.json: 125                                         │
│     • Sample: Ti-6Al-4V, Ti-5Al-2.5Sn, Ti-6Al-2Sn-4Zr-2Mo                               │
│     Status: VERIFIED (Level 5)                                                          │
│                                                                                         │
│  RULE: If you can't show the evidence, you can't claim it's done.                       │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 1.4 When to Use This Skill

**Explicit Triggers:**
- "verify", "verification"
- "prove complete", "prove done"
- "evidence", "proof"
- "is it done", "is it complete"
- "check completion"

**Contextual Triggers:**
- After debugging (SP.1.6) completes
- Before handoff (SP.1.8) to next session
- When claiming any work is complete
- When user asks for proof of completion
- Before major milestones

**NOT for:**
- Spec compliance checking (use prism-sp-review-spec)
- Code quality review (use prism-sp-review-quality)
- Bug fixing (use prism-sp-debugging)

## 1.5 Prerequisites

**Required:**
- [ ] Work to verify (from SP.1.3 execution or SP.1.6 debugging)
- [ ] Spec/plan defining what "complete" means
- [ ] Access to files/systems to gather evidence

**From Previous Skills:**
- [ ] Spec review passed (SP.1.4)
- [ ] Quality review passed (SP.1.5)
- [ ] Debugging complete if needed (SP.1.6)

## 1.6 Outputs

**Primary Output:**
- Verification report with Level 5 evidence for all deliverables

**On VERIFIED COMPLETE:**
- Evidence report documenting proof
- Ready for handoff (SP.1.8)

**On INCOMPLETE:**
- Gap analysis listing what's missing
- Action items to achieve completion
- Return to execution or debugging

## 1.7 Position in Workflow

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              SP.1 CORE WORKFLOW                                         │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  SP.1.1   SP.1.2   SP.1.3   SP.1.4   SP.1.5   SP.1.6   SP.1.7   SP.1.8                 │
│  ┌────┐  ┌────┐  ┌────┐  ┌────┐  ┌────┐  ┌────┐  ┌────┐  ┌────┐                        │
│  │BRNS│─▶│PLAN│─▶│EXEC│─▶│SPEC│─▶│QUAL│─▶│DBG │─▶│VER │─▶│HAND│                        │
│  │TORM│  │    │  │    │  │REV │  │REV │  │    │  │IFY │  │OFF │                        │
│  └────┘  └────┘  └────┘  └────┘  └────┘  └────┘  └─┬──┘  └────┘                        │
│                                                     │                                   │
│                                              ┌──────┴──────┐                            │
│                                              │             │                            │
│                                              ▼             ▼                            │
│                                          VERIFIED      INCOMPLETE                       │
│                                          COMPLETE      (gaps found)                     │
│                                              │             │                            │
│                                              ▼             ▼                            │
│                                          SP.1.8        Return to                        │
│                                          Handoff       SP.1.3/SP.1.6                    │
│                                                                                         │
│  THIS SKILL ANSWERS: "Can we PROVE it's done?"                                          │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 1.8 Key Principles

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                          VERIFICATION PRINCIPLES                                        │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  PRINCIPLE 1: EVIDENCE OVER CLAIMS                                                      │
│  ───────────────────────────────────                                                    │
│  A claim is worthless without evidence.                                                 │
│  Always show the proof, not just state the conclusion.                                  │
│                                                                                         │
│  PRINCIPLE 2: LEVEL 5 OR NOT COMPLETE                                                   │
│  ───────────────────────────────────                                                    │
│  Level 5 is the minimum for "complete."                                                 │
│  Anything less is "in progress."                                                        │
│                                                                                         │
│  PRINCIPLE 3: VERIFY EVERYTHING                                                         │
│  ───────────────────────────────────                                                    │
│  Don't assume. Don't skip. Don't trust.                                                 │
│  Verify every deliverable, every count, every connection.                               │
│                                                                                         │
│  PRINCIPLE 4: SHOW YOUR WORK                                                            │
│  ───────────────────────────────────                                                    │
│  Include the actual command output.                                                     │
│  Include the actual file listing.                                                       │
│  Make it reproducible and auditable.                                                    │
│                                                                                         │
│  PRINCIPLE 5: GAPS ARE NORMAL                                                           │
│  ───────────────────────────────────                                                    │
│  Finding gaps during verification is SUCCESS, not failure.                              │
│  Better to find gaps now than after handoff.                                            │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

# SECTION 2: THE 5 EVIDENCE LEVELS

## 2.1 Overview

Evidence is not binary. There are degrees of proof. This section defines the 5 levels of evidence, from weakest (Level 1) to strongest (Level 5).

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           EVIDENCE LEVEL HIERARCHY                                      │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  L5 ████████████████████████████████████████████ VERIFIED (Required for "Complete")    │
│  L4 ██████████████████████████████████ SAMPLE                                          │
│  L3 ████████████████████████ LISTING                                                   │
│  L2 ████████████████ REFERENCE                                                         │
│  L1 ████████ CLAIM                                                                      │
│                                                                                         │
│  ◄─────────────────────────────────────────────────────────────────────────────────►   │
│  Weakest                                                            Strongest           │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 2.2 Level 1: CLAIM

**Definition:** A statement with no supporting evidence.

**Example:**
```
"I created the materials database."
```

**What's Missing:** No proof the database exists, no path, no content verification.

**Trust Level:** ❌ NOT ACCEPTABLE

**When It Occurs:**
- Quick updates without verification
- Assumptions based on intent
- Memory of what was done

**Problem:** Claims can be wrong, incomplete, or outdated.

## 2.3 Level 2: REFERENCE

**Definition:** A path or location is mentioned, but not verified.

**Example:**
```
"The materials database is at C:\PRISM\databases\materials.json"
```

**What's Missing:** No proof the file actually exists at that path.

**Trust Level:** ⚠️ WEAK

**When It Occurs:**
- Providing expected locations
- Referencing planned outputs
- Copying paths from documentation

**Problem:** The path might not exist, file might be missing, or location might be wrong.

## 2.4 Level 3: LISTING

**Definition:** Evidence from directory listing or file info commands.

**Example:**
```bash
$ ls -la materials.json
-rw-r--r-- 1 user user 45230 Jan 24 10:30 materials.json

$ wc -l materials.json
2500 materials.json
```

**What's Proven:**
- File exists ✓
- File has size ✓
- File was modified at specific time ✓
- Line count known ✓

**What's Missing:** No verification of CONTENT - file could exist but be wrong.

**Trust Level:** ✓ MODERATE

**When It Occurs:**
- After file creation commands
- Directory structure verification
- Size/count checks

**Good For:** Proving existence and basic properties.

## 2.5 Level 4: SAMPLE

**Definition:** Content samples showing structure and representative data.

**Example:**
```bash
$ head -20 materials.json
{
  "version": "2.0",
  "materials": [
    {
      "id": "Ti-6Al-4V",
      "name": "Titanium 6Al-4V",
      "category": "titanium_alloy",
      ...
    }
  ]
}

$ grep -c '"id":' materials.json
125

$ grep '"id":' materials.json | head -5
    "id": "Ti-6Al-4V",
    "id": "Ti-5Al-2.5Sn",
    "id": "Ti-6Al-2Sn-4Zr-2Mo",
    "id": "Ti-6Al-6V-2Sn",
    "id": "Ti-3Al-2.5V",
```

**What's Proven:**
- File exists ✓
- Has expected structure ✓
- Contains expected content type ✓
- Count of items verified ✓
- Sample items shown ✓

**What's Missing:** User confirmation, full content review for edge cases.

**Trust Level:** ✓✓ GOOD

**When It Occurs:**
- After content creation
- Structure verification
- Count validation

**Good For:** Proving content is correct type and structure.

## 2.6 Level 5: VERIFIED

**Definition:** Full verification with multiple evidence types plus user confirmation.

**Example:**
```markdown
## VERIFICATION: materials.json

### Evidence Collected

1. **Existence:**
   ```
   $ ls -la materials.json
   -rw-r--r-- 1 user user 45230 Jan 24 10:30 materials.json
   ```
   ✓ File exists

2. **Size:**
   ```
   $ wc -l materials.json
   2500 lines
   $ stat materials.json
   Size: 45230 bytes
   ```
   ✓ Size consistent with expected content

3. **Structure:**
   ```
   $ head -20 materials.json
   [Shows valid JSON structure with version, materials array]
   ```
   ✓ Structure correct

4. **Count:**
   ```
   $ grep -c '"id":' materials.json
   125
   ```
   ✓ Count matches spec (expected: 125)

5. **Content Sample:**
   ```
   $ grep '"id":' materials.json | shuf | head -5
   Ti-6Al-4V, Ti-5Al-2.5Sn, CP-Ti-Grade-2, Ti-6Al-2Sn-4Zr-2Mo, Ti-3Al-8V-6Cr-4Mo-4Zr
   ```
   ✓ Content looks correct

6. **User Confirmation:**
   User approved: "Looks good, proceed"
   ✓ User verified

### VERDICT: Level 5 VERIFIED ✓✓✓
```

**What's Proven:**
- File exists ✓
- Size is correct ✓
- Structure is correct ✓
- Count matches spec ✓
- Content is correct type ✓
- User has confirmed ✓

**Trust Level:** ✓✓✓ COMPLETE

**Required For:** Any claim of "complete"

## 2.7 Evidence Level Summary

| Level | Name | Evidence | Trust | Acceptable? |
|-------|------|----------|-------|-------------|
| L1 | Claim | Statement only | ❌ None | NO |
| L2 | Reference | Path mentioned | ⚠️ Weak | NO |
| L3 | Listing | ls/dir output | ✓ Moderate | For existence only |
| L4 | Sample | Content shown | ✓✓ Good | For structure |
| L5 | Verified | Full + approval | ✓✓✓ Complete | YES - Required |

## 2.8 Upgrading Evidence Levels

### From L1 → L2
Add the file path:
```
L1: "I created the database"
L2: "I created the database at C:\PRISM\materials.json"
```

### From L2 → L3
Run existence check:
```bash
L2: "Database is at C:\PRISM\materials.json"
L3: $ ls -la C:\PRISM\materials.json
    -rw-r--r-- 1 user user 45230 Jan 24 materials.json
```

### From L3 → L4
Show content samples:
```bash
L3: File exists, 45230 bytes
L4: $ head -10 materials.json
    [Shows structure and sample content]
    $ grep -c '"id":' materials.json
    125
```

### From L4 → L5
Add comprehensive checks + user confirmation:
```
L4: Structure and samples look correct
L5: All checks passed:
    - Existence ✓
    - Size ✓
    - Structure ✓
    - Count ✓
    - Samples ✓
    - User confirmed ✓
```

## 2.9 Quick Reference

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                     EVIDENCE LEVEL QUICK REFERENCE                                      │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  L1 CLAIM      "I did it"                    → Not acceptable                           │
│  L2 REFERENCE  "It's at path/to/file"        → Not acceptable                           │
│  L3 LISTING    "ls shows: file.js 45KB"      → OK for existence                         │
│  L4 SAMPLE     "head shows: [content]"       → OK for structure                         │
│  L5 VERIFIED   "All checks + user approved"  → Required for "complete"                  │
│                                                                                         │
│  MINIMUM FOR COMPLETION: Level 5 on ALL deliverables                                    │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

# SECTION 3: VERIFICATION PROCESS

## 3.1 Overview

Verification follows a systematic 6-step process. Each step builds on the previous, culminating in a verdict.

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           6-STEP VERIFICATION PROCESS                                   │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │ STEP 1: GATHER DELIVERABLES LIST                                                 │  │
│  │ What was supposed to be created? Source from spec/plan.                          │  │
│  └──────────────────────────────────────────────────────────────────────────────────┘  │
│                                           │                                             │
│                                           ▼                                             │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │ STEP 2: VERIFY EACH DELIVERABLE                                                  │  │
│  │ For each item: exists? size? structure? content?                                 │  │
│  └──────────────────────────────────────────────────────────────────────────────────┘  │
│                                           │                                             │
│                                           ▼                                             │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │ STEP 3: VERIFY COUNTS                                                            │  │
│  │ Do quantities match expectations?                                                │  │
│  └──────────────────────────────────────────────────────────────────────────────────┘  │
│                                           │                                             │
│                                           ▼                                             │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │ STEP 4: VERIFY INTEGRATION                                                       │  │
│  │ Is work connected? Imports/exports/consumers correct?                            │  │
│  └──────────────────────────────────────────────────────────────────────────────────┘  │
│                                           │                                             │
│                                           ▼                                             │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │ STEP 5: COMPILE EVIDENCE REPORT                                                  │  │
│  │ Collect all evidence into verification report.                                   │  │
│  └──────────────────────────────────────────────────────────────────────────────────┘  │
│                                           │                                             │
│                                           ▼                                             │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │ STEP 6: VERDICT                                                                  │  │
│  │ All Level 5? → COMPLETE. Gaps? → INCOMPLETE with action items.                   │  │
│  └──────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 3.2 Step 1: Gather Deliverables List

### Purpose
Know what you're verifying. Get the list of expected deliverables from the spec or plan.

### Sources
- SP.1.1 Brainstorm output (what was designed)
- SP.1.2 Planning output (what was planned)
- SP.1.3 Execution checkpoints (what was done)
- CURRENT_STATE.json (current session deliverables)

### Template

```markdown
## STEP 1: DELIVERABLES LIST

**Source:** [spec document / plan / execution log]
**Date:** [YYYY-MM-DD]

### Expected Deliverables

| # | Deliverable | Type | Expected Location |
|---|-------------|------|-------------------|
| 1 | [name] | [file/dir/code] | [path] |
| 2 | [name] | [file/dir/code] | [path] |
| 3 | [name] | [file/dir/code] | [path] |

### Expected Counts

| Item Type | Expected Count | Source |
|-----------|----------------|--------|
| [type] | [N] | [where specified] |

### Deliverables Gathered
- [ ] All expected deliverables listed
- [ ] All expected counts noted
- [ ] Sources documented

**Step 1 Complete:** ☐ YES
```

## 3.3 Step 2: Verify Each Deliverable

### Purpose
Check each deliverable exists and has correct properties.

### Checks Per Deliverable
1. **Exists** - File/directory present at expected location
2. **Size** - File has reasonable size (not empty, not unexpectedly large)
3. **Structure** - Content has expected format/sections
4. **Content** - Contains expected data/code

### Template

```markdown
## STEP 2: DELIVERABLE VERIFICATION

### Deliverable 1: [NAME]

**Expected:** [description]
**Path:** [full path]

| Check | Method | Result | Evidence Level |
|-------|--------|--------|----------------|
| Exists | ls/dir | ☐ YES / ☐ NO | L3 |
| Size | file info | [N bytes] | L3 |
| Structure | head/grep | ☐ OK / ☐ WRONG | L4 |
| Content | samples | ☐ OK / ☐ WRONG | L4 |

**Evidence:**
```
[paste actual command output]
```

**Deliverable 1 Status:** ☐ L5 Verified / ☐ Issues found

---

### Deliverable 2: [NAME]
[repeat for each deliverable]

---

### Step 2 Summary

| # | Deliverable | Exists | Size | Structure | Content | Level |
|---|-------------|--------|------|-----------|---------|-------|
| 1 | [name] | ✓/✗ | ✓/✗ | ✓/✗ | ✓/✗ | L? |
| 2 | [name] | ✓/✗ | ✓/✗ | ✓/✗ | ✓/✗ | L? |

**Step 2 Complete:** ☐ YES (all L4+) / ☐ NO (issues found)
```

## 3.4 Step 3: Verify Counts

### Purpose
Confirm quantities match specifications. Off-by-one errors and missing items are common.

### Common Count Checks
- Number of files created
- Lines of code written
- Materials in database
- Machines in database
- Functions implemented
- Tests written

### Template

```markdown
## STEP 3: COUNT VERIFICATION

### Count 1: [ITEM TYPE]

**Expected:** [N] (from [source])

**Verification Method:**
```bash
[command to count]
```

**Result:**
```
[command output]
```

**Actual Count:** [N]
**Match:** ☐ YES / ☐ NO (delta: [±N])

---

### Count 2: [ITEM TYPE]
[repeat for each count]

---

### Step 3 Summary

| Item | Expected | Actual | Match |
|------|----------|--------|-------|
| [type1] | [N] | [N] | ✓/✗ |
| [type2] | [N] | [N] | ✓/✗ |

**Step 3 Complete:** ☐ YES (all match) / ☐ NO (mismatches found)

**If Mismatches:**
- [item]: Expected [N], got [N]. Missing: [list] / Extra: [list]
```

## 3.5 Step 4: Verify Integration

### Purpose
Confirm work is connected to the rest of the system, not orphaned.

### Integration Checks
- Imports pointing to correct files
- Exports available for consumers
- Consumers wired to use new code
- No broken references

### Template

```markdown
## STEP 4: INTEGRATION VERIFICATION

### Imports Check

| New File | Imports From | Import Exists? |
|----------|--------------|----------------|
| [file] | [dependency] | ☐ YES / ☐ NO |

**Evidence:**
```
[grep for import statements]
```

### Exports Check

| New File | Exports | Exported Correctly? |
|----------|---------|---------------------|
| [file] | [what] | ☐ YES / ☐ NO |

**Evidence:**
```
[grep for export statements]
```

### Consumer Wiring Check

| Consumer | Should Use | Actually Uses? |
|----------|------------|----------------|
| [consumer] | [new module] | ☐ YES / ☐ NO |

**Evidence:**
```
[grep showing consumer imports]
```

### Step 4 Summary

| Check | Status |
|-------|--------|
| Imports correct | ☐ ✓ / ☐ ✗ |
| Exports correct | ☐ ✓ / ☐ ✗ |
| Consumers wired | ☐ ✓ / ☐ ✗ |

**Step 4 Complete:** ☐ YES / ☐ NO (integration issues found)
```

## 3.6 Step 5: Compile Evidence Report

### Purpose
Collect all evidence into a single, comprehensive verification report.

### Template

```markdown
## STEP 5: EVIDENCE REPORT

### Work Item
**Description:** [what was done]
**Session:** [session ID]
**Date:** [YYYY-MM-DD]

### Evidence Summary

#### Deliverables (from Step 2)
| # | Deliverable | Level | Evidence |
|---|-------------|-------|----------|
| 1 | [name] | L5 | [brief] |
| 2 | [name] | L5 | [brief] |

#### Counts (from Step 3)
| Item | Expected | Actual | Match |
|------|----------|--------|-------|
| [type] | [N] | [N] | ✓ |

#### Integration (from Step 4)
| Check | Status |
|-------|--------|
| Imports | ✓ |
| Exports | ✓ |
| Consumers | ✓ |

### All Evidence Artifacts

[Include all command outputs, listings, samples from previous steps]

### Step 5 Complete:** ☐ YES
```

## 3.7 Step 6: Verdict

### Purpose
Render final verdict based on collected evidence.

### Decision Logic

```
IF (all deliverables at Level 5)
AND (all counts match)
AND (integration verified)
THEN verdict = VERIFIED COMPLETE
ELSE verdict = INCOMPLETE
```

### Template

```markdown
## STEP 6: VERDICT

### Verification Summary

| Category | Status | Issues |
|----------|--------|--------|
| Deliverables | ☐ All L5 / ☐ Gaps | [list] |
| Counts | ☐ All match / ☐ Mismatch | [list] |
| Integration | ☐ Verified / ☐ Issues | [list] |

### Verdict

☐ **VERIFIED COMPLETE**
  - All deliverables at Level 5
  - All counts match
  - Integration verified
  - Ready for handoff (SP.1.8)

☐ **INCOMPLETE**
  - Gaps found: [list]
  - Action needed: [list]
  - Return to: SP.1.3 (execution) or SP.1.6 (debugging)

### User Confirmation

**Verification presented to user:** ☐ YES
**User approved:** ☐ YES / ☐ NO / ☐ PENDING

### Final Status
**Work Item:** [name]
**Verdict:** VERIFIED COMPLETE / INCOMPLETE
**Date:** [YYYY-MM-DD]
**Evidence Level:** L5
```

## 3.8 Process Quick Reference

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                     VERIFICATION PROCESS QUICK REFERENCE                                │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  STEP 1: GATHER LIST                                                                    │
│  ☐ List all expected deliverables                                                       │
│  ☐ Note all expected counts                                                             │
│  ☐ Document sources                                                                     │
│                                                                                         │
│  STEP 2: VERIFY DELIVERABLES                                                            │
│  ☐ Check each: exists, size, structure, content                                         │
│  ☐ Collect evidence (ls, head, grep)                                                    │
│  ☐ Achieve Level 4+ for each                                                            │
│                                                                                         │
│  STEP 3: VERIFY COUNTS                                                                  │
│  ☐ Count each item type                                                                 │
│  ☐ Compare to expected                                                                  │
│  ☐ Identify any mismatches                                                              │
│                                                                                         │
│  STEP 4: VERIFY INTEGRATION                                                             │
│  ☐ Check imports correct                                                                │
│  ☐ Check exports correct                                                                │
│  ☐ Check consumers wired                                                                │
│                                                                                         │
│  STEP 5: COMPILE REPORT                                                                 │
│  ☐ Gather all evidence                                                                  │
│  ☐ Create verification report                                                           │
│                                                                                         │
│  STEP 6: VERDICT                                                                        │
│  ☐ All L5? Counts match? Integration OK?                                                │
│  ☐ → COMPLETE or INCOMPLETE                                                             │
│  ☐ Get user confirmation                                                                │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

# SECTION 4: EVIDENCE COLLECTION METHODS

## 4.1 Purpose

This section provides specific commands and methods for collecting evidence. Use these to upgrade from lower evidence levels to Level 5.

## 4.2 File Existence Evidence

### Windows (PowerShell)

```powershell
# Check if file exists
Test-Path "C:\path\to\file.js"

# Get file info
Get-Item "C:\path\to\file.js" | Select-Object Name, Length, LastWriteTime

# List directory contents
Get-ChildItem "C:\path\to\directory" | Format-Table Name, Length, LastWriteTime
```

### Linux/Mac (Bash)

```bash
# Check if file exists
ls -la /path/to/file.js

# Get file info
stat /path/to/file.js

# List directory contents
ls -la /path/to/directory/
```

### Evidence Output Example

```
Name          Length LastWriteTime
----          ------ -------------
materials.json 45230 1/24/2026 10:30:00 AM
```

**This proves:** File exists, has specific size, was modified at specific time.

## 4.3 File Size Evidence

### Windows (PowerShell)

```powershell
# Get file size in bytes
(Get-Item "file.js").Length

# Get file size with formatting
Get-Item "file.js" | Select-Object Name, @{N='Size(KB)';E={[math]::Round($_.Length/1KB,2)}}

# Count lines
(Get-Content "file.js" | Measure-Object -Line).Lines
```

### Linux/Mac (Bash)

```bash
# Get file size
ls -la file.js | awk '{print $5}'

# Get file size in human-readable format
du -h file.js

# Count lines
wc -l file.js
```

### Evidence Output Example

```
File: materials.json
Size: 45,230 bytes (44.2 KB)
Lines: 2,500
```

**This proves:** File has specific size consistent with expected content.

## 4.4 Structure Evidence

### Check JSON Structure

```powershell
# PowerShell: Check JSON is valid
Get-Content "file.json" | ConvertFrom-Json | Out-Null
if ($?) { "Valid JSON" } else { "Invalid JSON" }

# Show first 20 lines
Get-Content "file.json" -Head 20
```

```bash
# Bash: Check JSON is valid
cat file.json | python -m json.tool > /dev/null && echo "Valid JSON"

# Show first 20 lines
head -20 file.json
```

### Check Markdown Structure

```powershell
# PowerShell: Find all headers
Select-String -Path "file.md" -Pattern "^#+" | Select-Object LineNumber, Line
```

```bash
# Bash: Find all headers
grep -n "^#" file.md
```

### Evidence Output Example

```
# Markdown headers found:
1: # SECTION 1: OVERVIEW
45: ## 1.1 Purpose
60: ## 1.2 The Mindset
98: # SECTION 2: THE PROCESS
```

**This proves:** File has expected section structure.

## 4.5 Count Evidence

### Count Items in JSON

```powershell
# PowerShell: Count items with specific pattern
(Select-String -Path "file.json" -Pattern '"id":' | Measure-Object).Count
```

```bash
# Bash: Count items with specific pattern
grep -c '"id":' file.json
```

### Count Files

```powershell
# PowerShell: Count files in directory
(Get-ChildItem "directory" -File | Measure-Object).Count

# Count files matching pattern
(Get-ChildItem "directory" -Filter "*.js" | Measure-Object).Count
```

```bash
# Bash: Count files in directory
ls -1 directory | wc -l

# Count files matching pattern
ls -1 directory/*.js | wc -l
```

### Count Lines of Code

```powershell
# PowerShell: Total lines across files
(Get-ChildItem "*.js" | Get-Content | Measure-Object -Line).Lines
```

```bash
# Bash: Total lines across files
wc -l *.js | tail -1
```

### Evidence Output Example

```
Count verification:
- Materials in database: 125
- Command: grep -c '"id":' materials.json
- Result: 125
- Expected: 125
- Match: ✓
```

**This proves:** Quantity matches specification.

## 4.6 Content Sample Evidence

### Sample JSON Content

```powershell
# PowerShell: Get sample of IDs
Select-String -Path "file.json" -Pattern '"id":' | Select-Object -First 5 | ForEach-Object { $_.Line.Trim() }
```

```bash
# Bash: Get sample of IDs
grep '"id":' file.json | head -5

# Random sample of IDs
grep '"id":' file.json | shuf | head -5
```

### Sample Code Functions

```powershell
# PowerShell: Find function definitions
Select-String -Path "*.js" -Pattern "function \w+" | Select-Object -First 10
```

```bash
# Bash: Find function definitions
grep -h "function " *.js | head -10
```

### Evidence Output Example

```
Content sample:
- Random sample of 5 material IDs:
  1. "id": "Ti-6Al-4V"
  2. "id": "Ti-5Al-2.5Sn"
  3. "id": "CP-Ti-Grade-2"
  4. "id": "Ti-6Al-2Sn-4Zr-2Mo"
  5. "id": "Ti-3Al-8V-6Cr-4Mo-4Zr"
```

**This proves:** Content contains expected data types.

## 4.7 Integration Evidence

### Check Imports

```powershell
# PowerShell: Find import statements
Select-String -Path "consumer.js" -Pattern "import.*from" | Select-Object Line
```

```bash
# Bash: Find import statements
grep "import.*from" consumer.js
```

### Check Exports

```powershell
# PowerShell: Find export statements
Select-String -Path "module.js" -Pattern "export" | Select-Object Line
```

```bash
# Bash: Find export statements
grep "export" module.js
```

### Check Consumer Usage

```powershell
# PowerShell: Check if specific module is imported
Select-String -Path "*.js" -Pattern "from.*'./materials'" | Select-Object Filename, Line
```

```bash
# Bash: Check if specific module is imported
grep -r "from.*'./materials'" *.js
```

### Evidence Output Example

```
Integration check:
- Module: materials-db.js
- Consumers importing:
  1. calculator.js: import { getMaterial } from './materials-db'
  2. optimizer.js: import { queryMaterials } from './materials-db'
  3. reporter.js: import { getAllMaterials } from './materials-db'
- Consumer count: 3
```

**This proves:** Module is connected to consumers.

## 4.8 Evidence Collection Checklist

```markdown
## EVIDENCE COLLECTION CHECKLIST

### For Each Deliverable

☐ **Existence Evidence**
  Command: `ls -la [path]` or `Get-Item [path]`
  Output: [paste]
  
☐ **Size Evidence**
  Command: `wc -l [file]` or `(Get-Content [file] | Measure-Object -Line).Lines`
  Output: [paste]
  
☐ **Structure Evidence**
  Command: `head -20 [file]` or `Get-Content [file] -Head 20`
  Output: [paste]
  
☐ **Count Evidence**
  Command: `grep -c [pattern] [file]`
  Output: [paste]
  Expected: [N]
  Match: ☐ YES / ☐ NO
  
☐ **Content Sample**
  Command: `grep [pattern] [file] | head -5`
  Output: [paste]

☐ **Integration Evidence** (if applicable)
  Command: `grep "import.*[module]" *.js`
  Output: [paste]
```

## 4.9 Quick Reference Commands

| Evidence Type | PowerShell | Bash |
|---------------|------------|------|
| File exists | `Test-Path file` | `ls -la file` |
| File size | `(Get-Item file).Length` | `stat file` |
| Line count | `(Get-Content file \| Measure-Object -Line).Lines` | `wc -l file` |
| First N lines | `Get-Content file -Head N` | `head -N file` |
| Last N lines | `Get-Content file -Tail N` | `tail -N file` |
| Find pattern | `Select-String -Path file -Pattern pat` | `grep pat file` |
| Count pattern | `(Select-String file -Pattern pat \| Measure-Object).Count` | `grep -c pat file` |
| List directory | `Get-ChildItem dir` | `ls -la dir` |
| Count files | `(Get-ChildItem dir \| Measure-Object).Count` | `ls -1 dir \| wc -l` |

---

# SECTION 5: VERIFICATION CATEGORIES

## 5.1 Overview

Different types of work require different verification approaches. This section covers the 6 verification categories and how to verify each.

## 5.2 Category 1: Existence Verification

### Purpose
Prove that files, directories, or artifacts actually exist.

### What to Check
- File/directory present at expected path
- File has non-zero size
- Modification timestamp is recent/expected
- File permissions allow access

### Evidence Template

```markdown
## EXISTENCE VERIFICATION: [ITEM]

**Expected Path:** [path]
**Expected Type:** ☐ File / ☐ Directory

### Evidence

```
[ls/dir output]
```

### Verification

| Check | Result |
|-------|--------|
| Exists | ☐ YES / ☐ NO |
| Non-empty | ☐ YES / ☐ NO |
| Recent timestamp | ☐ YES / ☐ NO |
| Accessible | ☐ YES / ☐ NO |

**Existence Status:** ☐ VERIFIED / ☐ MISSING
```

### Common Issues
- File exists but wrong location
- File empty (0 bytes)
- Old file (not updated)
- Permissions block access

## 5.3 Category 2: Size Verification

### Purpose
Prove that files have expected/reasonable size.

### What to Check
- File size in bytes/KB/lines
- Size consistent with expected content
- Not unexpectedly small (truncated)
- Not unexpectedly large (duplicate content)

### Evidence Template

```markdown
## SIZE VERIFICATION: [FILE]

**Expected Size:** ~[N] KB or ~[N] lines
**Source of Expectation:** [spec, estimate, previous version]

### Evidence

```
[file info showing size]
[line count output]
```

### Verification

| Metric | Expected | Actual | Status |
|--------|----------|--------|--------|
| Bytes | ~[N] | [N] | ☐ OK / ☐ ISSUE |
| Lines | ~[N] | [N] | ☐ OK / ☐ ISSUE |

**Size Status:** ☐ VERIFIED / ☐ ISSUE ([too small/large])
```

### Size Guidelines (PRISM)

| Content Type | Expected Size |
|--------------|---------------|
| Skill file (SKILL.md) | 30-150KB, 800-3000 lines |
| Material entry (JSON) | 2-5KB per material |
| Machine entry (JSON) | 3-8KB per machine |
| Engine module (JS) | 10-50KB, 200-1000 lines |
| Database file | Varies by count |

## 5.4 Category 3: Structure Verification

### Purpose
Prove that content has expected organization and format.

### What to Check
- Expected sections/headers present
- Correct nesting/hierarchy
- Valid format (JSON, Markdown, etc.)
- Required fields present

### Evidence Template

```markdown
## STRUCTURE VERIFICATION: [FILE]

**Expected Structure:**
- Section 1: [name]
- Section 2: [name]
- Section N: [name]

### Evidence

**Headers Found:**
```
[grep output showing headers/sections]
```

**Format Validation:**
```
[format check output - JSON parse, MD lint, etc.]
```

### Verification

| Section | Present |
|---------|---------|
| [Section 1] | ☐ YES / ☐ NO |
| [Section 2] | ☐ YES / ☐ NO |
| [Section N] | ☐ YES / ☐ NO |

**Format Valid:** ☐ YES / ☐ NO

**Structure Status:** ☐ VERIFIED / ☐ ISSUE
```

### Structure Checks by File Type

| File Type | Structure Checks |
|-----------|------------------|
| Markdown | Headers (# ## ###), sections complete |
| JSON | Valid JSON, required keys present |
| JavaScript | Exports defined, functions present |
| YAML | Valid YAML, required fields |

## 5.5 Category 4: Count Verification

### Purpose
Prove that quantities match specifications exactly.

### What to Check
- Item count matches expected
- No missing items
- No extra/duplicate items
- Counts at multiple levels match

### Evidence Template

```markdown
## COUNT VERIFICATION: [ITEM TYPE]

**Expected Count:** [N]
**Source:** [spec document, plan]

### Evidence

**Count Command:**
```
[command used]
```

**Count Result:**
```
[output showing count]
```

### Verification

| Level | Expected | Actual | Delta |
|-------|----------|--------|-------|
| [level] | [N] | [N] | [±N] |

**Match:** ☐ EXACT / ☐ MISMATCH

**If Mismatch:**
- Missing: [list items]
- Extra: [list items]
- Action: [what to do]

**Count Status:** ☐ VERIFIED / ☐ MISMATCH
```

### Count Verification Methods

| Item Type | Count Method |
|-----------|--------------|
| JSON entries | `grep -c '"id":'` |
| Files | `ls -1 \| wc -l` |
| Lines | `wc -l` |
| Functions | `grep -c "function "` |
| Sections | `grep -c "^# "` |

## 5.6 Category 5: Content Verification

### Purpose
Prove that actual content is correct, not just present.

### What to Check
- Sample content matches expected
- Data values are valid/sensible
- No placeholder/TODO content
- Formatting correct

### Evidence Template

```markdown
## CONTENT VERIFICATION: [FILE]

**Expected Content Type:** [description]

### Evidence

**Sample Extraction:**
```
[head/grep output showing sample content]
```

**Random Sample:**
```
[random sample to avoid cherry-picking]
```

### Verification

| Check | Result |
|-------|--------|
| Content type correct | ☐ YES / ☐ NO |
| Values sensible | ☐ YES / ☐ NO |
| No placeholders | ☐ YES / ☐ NO |
| Format correct | ☐ YES / ☐ NO |

**Content Status:** ☐ VERIFIED / ☐ ISSUE
```

### Content Red Flags
- "TODO" or "FIXME" comments
- Placeholder values: "xxx", "TBD", "placeholder"
- Empty strings where data expected
- Unrealistic values (negative where positive expected)
- Duplicate content (copy-paste errors)

## 5.7 Category 6: Integration Verification

### Purpose
Prove that work is connected to the system, not orphaned.

### What to Check
- Exports are defined
- Imports point to correct files
- Consumers are wired
- No broken references

### Evidence Template

```markdown
## INTEGRATION VERIFICATION: [MODULE]

### Exports Check

**Module exports:**
```
[grep showing export statements]
```

**Exports defined:** ☐ YES / ☐ NO

### Imports Check

**Module imports:**
```
[grep showing import statements]
```

**Imports valid:** ☐ YES / ☐ NO

### Consumer Wiring Check

**Expected consumers:** [list]

**Consumers importing this module:**
```
[grep across codebase for imports]
```

| Consumer | Imports Module? |
|----------|-----------------|
| [consumer1] | ☐ YES / ☐ NO |
| [consumer2] | ☐ YES / ☐ NO |

**Integration Status:** ☐ VERIFIED / ☐ NOT WIRED
```

### Integration Commands

```bash
# Find what a module exports
grep "export" module.js

# Find what imports a module
grep -r "from.*'./module'" *.js

# Check for broken imports
# (imports that reference non-existent files)
```

## 5.8 Category Summary

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                     VERIFICATION CATEGORIES SUMMARY                                     │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  CATEGORY 1: EXISTENCE                                                                  │
│  Question: Does it exist?                                                               │
│  Evidence: File listing with size/date                                                  │
│                                                                                         │
│  CATEGORY 2: SIZE                                                                       │
│  Question: Is it the right size?                                                        │
│  Evidence: Byte count, line count                                                       │
│                                                                                         │
│  CATEGORY 3: STRUCTURE                                                                  │
│  Question: Is it organized correctly?                                                   │
│  Evidence: Section headers, format validation                                           │
│                                                                                         │
│  CATEGORY 4: COUNT                                                                      │
│  Question: Are there the right number?                                                  │
│  Evidence: Count command output                                                         │
│                                                                                         │
│  CATEGORY 5: CONTENT                                                                    │
│  Question: Is the content correct?                                                      │
│  Evidence: Sample extraction, spot checks                                               │
│                                                                                         │
│  CATEGORY 6: INTEGRATION                                                                │
│  Question: Is it connected?                                                             │
│  Evidence: Import/export grep, consumer audit                                           │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

# SECTION 6: EVIDENCE REPORT TEMPLATE

## 6.1 Purpose

The evidence report is the final artifact proving work is complete. It compiles all verification evidence into a single, auditable document.

## 6.2 Full Evidence Report Template

```markdown
# VERIFICATION REPORT

## Header

**Work Item:** [name/description]
**Session:** [session ID, e.g., SP.1.6]
**Date:** [YYYY-MM-DD]
**Verified By:** Claude

---

## 1. DELIVERABLES SUMMARY

### Expected Deliverables

| # | Deliverable | Type | Location | Status |
|---|-------------|------|----------|--------|
| 1 | [name] | File | [path] | ☐ ✓ / ☐ ✗ |
| 2 | [name] | File | [path] | ☐ ✓ / ☐ ✗ |
| N | [name] | File | [path] | ☐ ✓ / ☐ ✗ |

**Deliverables Complete:** [N] / [N]

---

## 2. EXISTENCE EVIDENCE

### Deliverable 1: [NAME]

**Path:** [full path]

**Evidence:**
```
[ls/dir output showing file exists with size and date]
```

**Status:** ☐ EXISTS / ☐ MISSING

---

### Deliverable 2: [NAME]

[repeat for each deliverable]

---

## 3. SIZE EVIDENCE

| Deliverable | Expected | Actual | Status |
|-------------|----------|--------|--------|
| [name1] | ~[N]KB | [N]KB | ☐ ✓ / ☐ ✗ |
| [name2] | ~[N] lines | [N] lines | ☐ ✓ / ☐ ✗ |

**Size Evidence Commands:**
```
[commands and outputs used to verify sizes]
```

---

## 4. STRUCTURE EVIDENCE

### [FILE 1]

**Expected Sections:**
1. [Section name]
2. [Section name]
N. [Section name]

**Evidence:**
```
[grep showing sections found]
```

| Section | Found |
|---------|-------|
| [Section 1] | ☐ ✓ / ☐ ✗ |
| [Section 2] | ☐ ✓ / ☐ ✗ |
| [Section N] | ☐ ✓ / ☐ ✗ |

**Structure Status:** ☐ CORRECT / ☐ ISSUES

---

## 5. COUNT EVIDENCE

### [ITEM TYPE 1]

**Expected:** [N]
**Source:** [where expected count came from]

**Verification:**
```
[count command and output]
```

**Actual:** [N]
**Match:** ☐ YES / ☐ NO (delta: [±N])

---

### [ITEM TYPE 2]

[repeat for each count]

---

### Count Summary

| Item Type | Expected | Actual | Match |
|-----------|----------|--------|-------|
| [type1] | [N] | [N] | ☐ ✓ / ☐ ✗ |
| [type2] | [N] | [N] | ☐ ✓ / ☐ ✗ |

---

## 6. CONTENT EVIDENCE

### [FILE 1] Content Sample

**Sample:**
```
[head/grep output showing representative content]
```

**Content Checks:**
- [ ] Content type correct
- [ ] Values sensible
- [ ] No placeholders
- [ ] Format correct

**Content Status:** ☐ VERIFIED / ☐ ISSUES

---

## 7. INTEGRATION EVIDENCE

### Exports

**Module:** [module name]
```
[grep showing exports]
```

### Imports

**Module imports from:**
```
[grep showing imports]
```

### Consumer Wiring

**Consumers of this module:**
```
[grep showing consumers]
```

| Consumer | Wired? |
|----------|--------|
| [consumer1] | ☐ ✓ / ☐ ✗ |
| [consumer2] | ☐ ✓ / ☐ ✗ |

**Integration Status:** ☐ VERIFIED / ☐ NOT WIRED

---

## 8. EVIDENCE LEVEL ASSESSMENT

| Category | Evidence Level | Minimum | Status |
|----------|----------------|---------|--------|
| Existence | L[N] | L3 | ☐ ✓ / ☐ ✗ |
| Size | L[N] | L3 | ☐ ✓ / ☐ ✗ |
| Structure | L[N] | L4 | ☐ ✓ / ☐ ✗ |
| Content | L[N] | L4 | ☐ ✓ / ☐ ✗ |
| Counts | L[N] | L4 | ☐ ✓ / ☐ ✗ |
| Integration | L[N] | L4 | ☐ ✓ / ☐ ✗ |

**Overall Evidence Level:** L[N]

---

## 9. GAPS & ISSUES

### Issues Found

| # | Issue | Severity | Resolution |
|---|-------|----------|------------|
| 1 | [description] | [High/Med/Low] | [what to do] |

### Missing Items

- [ ] [item 1]
- [ ] [item 2]

**Gaps Found:** [N] (☐ None / ☐ Blocking / ☐ Non-blocking)

---

## 10. VERDICT

### Verification Result

☐ **VERIFIED COMPLETE (Level 5)**
  - All deliverables exist and verified
  - All counts match
  - All content verified
  - Integration confirmed
  - Ready for handoff

☐ **INCOMPLETE**
  - Gaps: [list]
  - Blocking issues: [list]
  - Action required: [list]
  - Return to: ☐ SP.1.3 (Execution) / ☐ SP.1.6 (Debugging)

### User Confirmation

**Verification presented:** [timestamp]
**User response:** ☐ APPROVED / ☐ REJECTED / ☐ PENDING

---

## 11. SIGN-OFF

**Work Item:** [name]
**Final Status:** ☐ COMPLETE / ☐ INCOMPLETE
**Evidence Level:** L5
**Date:** [YYYY-MM-DD]
**Next Step:** ☐ SP.1.8 Handoff / ☐ Return to [phase]

---
```

## 6.3 Minimal Evidence Report (Quick Version)

For smaller work items, use this condensed format:

```markdown
# QUICK VERIFICATION: [WORK ITEM]

**Date:** [YYYY-MM-DD]

## Deliverables

| Deliverable | Exists | Size | Content | Level |
|-------------|--------|------|---------|-------|
| [file1] | ✓ | [N]KB | ✓ | L5 |
| [file2] | ✓ | [N]KB | ✓ | L5 |

## Counts

| Item | Expected | Actual | ✓/✗ |
|------|----------|--------|-----|
| [type] | [N] | [N] | ✓ |

## Evidence Artifacts

```
[Key command outputs proving existence/content]
```

## Verdict

☐ **COMPLETE** - All L5, ready for handoff
☐ **INCOMPLETE** - Gaps: [list]

**User Approved:** ☐ YES
```

## 6.4 Report Checklist

Before finalizing any verification report:

```markdown
## REPORT COMPLETENESS CHECK

☐ All deliverables listed
☐ Existence evidence for each deliverable
☐ Size evidence included
☐ Structure evidence included
☐ Count verification with actual command output
☐ Content samples shown
☐ Integration checked (if applicable)
☐ Evidence level assessed for each category
☐ Gaps/issues documented
☐ Verdict clearly stated
☐ User confirmation obtained
```

---

# SECTION 7: COMMON VERIFICATION PATTERNS

## 7.1 PRISM-Specific Patterns

### Pattern 1: Skill File Verification

```markdown
## SKILL FILE VERIFICATION: [SKILL NAME]

**File:** [skill-name]/SKILL.md
**Expected:** 10 sections, ~[N]KB

### Evidence

**Existence:**
```
$ ls -la SKILL.md
-rw-r--r-- 1 user user 45230 Jan 24 10:30 SKILL.md
```
✓ Exists, 45KB

**Section Count:**
```
$ grep -c "^# SECTION" SKILL.md
10
```
✓ 10 sections found

**Sections Present:**
```
$ grep "^# SECTION" SKILL.md
# SECTION 1: OVERVIEW
# SECTION 2: ...
...
# SECTION 10: INTEGRATION
```
✓ All sections present

**Line Count:**
```
$ wc -l SKILL.md
2500 SKILL.md
```
✓ 2,500 lines

**YAML Frontmatter:**
```
$ head -15 SKILL.md
---
name: [skill-name]
description: |
  [description]
---
```
✓ Frontmatter valid

**Status:** L5 VERIFIED
```

### Pattern 2: Database File Verification

```markdown
## DATABASE VERIFICATION: [DATABASE NAME]

**File:** [database].json
**Expected:** [N] entries

### Evidence

**Existence:**
```
$ ls -la [database].json
-rw-r--r-- 1 user user 125000 Jan 24 10:30 [database].json
```
✓ Exists, 125KB

**Valid JSON:**
```
$ cat [database].json | python -m json.tool > /dev/null && echo "Valid"
Valid
```
✓ Valid JSON

**Entry Count:**
```
$ grep -c '"id":' [database].json
125
```
✓ 125 entries (expected: 125)

**Sample Entries:**
```
$ grep '"id":' [database].json | shuf | head -5
    "id": "Ti-6Al-4V",
    "id": "AISI-1045",
    "id": "Al-7075-T6",
    "id": "Inconel-718",
    "id": "SS-316L",
```
✓ Entries look correct

**Required Fields Check:**
```
$ grep -c '"name":' [database].json
125
$ grep -c '"category":' [database].json
125
```
✓ All entries have name and category

**Status:** L5 VERIFIED
```

### Pattern 3: Module Wiring Verification

```markdown
## MODULE WIRING VERIFICATION: [MODULE NAME]

**Module:** [module].js
**Expected Consumers:** [list]

### Evidence

**Module Exports:**
```
$ grep "export" [module].js
export function getMaterial(id) { ... }
export function queryMaterials(filter) { ... }
export const MATERIAL_CATEGORIES = [ ... ];
```
✓ 3 exports defined

**Consumer Imports:**
```
$ grep -r "from.*'./[module]'" *.js
calculator.js: import { getMaterial } from './[module]';
optimizer.js: import { queryMaterials } from './[module]';
reporter.js: import { getMaterial, MATERIAL_CATEGORIES } from './[module]';
```
✓ 3 consumers wired

**Consumer Check:**
| Consumer | Expected | Found |
|----------|----------|-------|
| calculator.js | ✓ | ✓ |
| optimizer.js | ✓ | ✓ |
| reporter.js | ✓ | ✓ |

✓ All expected consumers wired

**Status:** L5 VERIFIED
```

### Pattern 4: Multi-File Deliverable Verification

```markdown
## MULTI-FILE VERIFICATION: [DELIVERABLE NAME]

**Expected Files:** [N]
**Location:** [directory]

### Evidence

**Directory Listing:**
```
$ ls -la [directory]/
total 125
-rw-r--r-- 1 user user 15000 file1.js
-rw-r--r-- 1 user user 22000 file2.js
-rw-r--r-- 1 user user 18000 file3.js
```
✓ 3 files present

**File Count:**
```
$ ls -1 [directory]/*.js | wc -l
3
```
✓ 3 files (expected: 3)

**Individual File Checks:**
| File | Size | Lines | Status |
|------|------|-------|--------|
| file1.js | 15KB | 450 | ✓ |
| file2.js | 22KB | 680 | ✓ |
| file3.js | 18KB | 520 | ✓ |

**Total Lines:**
```
$ wc -l [directory]/*.js | tail -1
1650 total
```
✓ 1,650 total lines

**Status:** L5 VERIFIED
```

## 7.2 General Patterns

### Pattern 5: Count Mismatch Investigation

When counts don't match:

```markdown
## COUNT MISMATCH INVESTIGATION

**Expected:** 125
**Actual:** 127
**Delta:** +2

### Investigation

**Find all IDs:**
```
$ grep '"id":' file.json | sort > actual_ids.txt
$ cat expected_ids.txt | sort > expected_sorted.txt
```

**Find extras:**
```
$ comm -13 expected_sorted.txt actual_ids.txt
"id": "Ti-TEST"
"id": "Ti-6Al-4V-DUPLICATE"
```
✓ Found 2 extra entries

**Analysis:**
- Ti-TEST: Test entry not removed
- Ti-6Al-4V-DUPLICATE: Duplicate of existing entry

**Resolution:**
- Remove Ti-TEST (test data)
- Remove Ti-6Al-4V-DUPLICATE (duplicate)
- Re-verify count = 125
```

### Pattern 6: Empty/Stub Detection

```markdown
## STUB DETECTION CHECK

**File:** [file]

### Check for Placeholders

```
$ grep -n "TODO\|FIXME\|XXX\|placeholder\|TBD" [file]
45:  // TODO: Implement validation
123: const value = "placeholder";
```

**Issues Found:**
- Line 45: TODO comment (incomplete implementation)
- Line 123: Placeholder value (not real data)

**Status:** ☐ INCOMPLETE - Stubs found

**Action:** Complete implementation before marking done
```

---

# SECTION 8: EXAMPLES

## 8.1 Example 1: Skill File Verification

### Scenario
Verify completion of prism-sp-debugging skill (SP.1.6).

### Verification Report

```markdown
# VERIFICATION REPORT: prism-sp-debugging

**Session:** SP.1.6
**Date:** 2026-01-24
**Verified By:** Claude

---

## DELIVERABLES

| # | Deliverable | Status |
|---|-------------|--------|
| 1 | prism-sp-debugging/SKILL.md | ✓ |

---

## EXISTENCE EVIDENCE

**Path:** C:\PRISM REBUILD\_SKILLS\prism-sp-debugging\SKILL.md

**Evidence:**
```
$ Get-Item "SKILL.md" | Select Name, Length, LastWriteTime

Name     Length  LastWriteTime
----     ------  -------------
SKILL.md 109242  1/24/2026 1:32:30 PM
```

✓ File exists, 109KB

---

## SIZE EVIDENCE

**Expected:** ~50KB (from design spec)
**Actual:** 109KB, 2,949 lines

```
$ (Get-Content SKILL.md | Measure-Object -Line).Lines
2949
```

✓ Size exceeds minimum (comprehensive coverage)

---

## STRUCTURE EVIDENCE

**Expected:** 10 sections

```
$ Select-String -Path SKILL.md -Pattern "^# SECTION"

SKILL.md:1:# SECTION 1: OVERVIEW
SKILL.md:211:# SECTION 2: THE 4-PHASE PROCESS
SKILL.md:410:# SECTION 3: PHASE 1 - EVIDENCE COLLECTION
SKILL.md:699:# SECTION 4: PHASE 2 - ROOT CAUSE TRACING
SKILL.md:992:# SECTION 5: PHASE 3 - HYPOTHESIS TESTING
SKILL.md:1284:# SECTION 6: PHASE 4 - FIX + PREVENTION
SKILL.md:1731:# SECTION 7: COMMON BUG PATTERNS
SKILL.md:1911:# SECTION 8: ANTI-PATTERNS
SKILL.md:2159:# SECTION 9: EXAMPLES
SKILL.md:2671:# SECTION 10: INTEGRATION
```

✓ All 10 sections present

---

## CONTENT EVIDENCE

**YAML Frontmatter:**
```
---
name: prism-sp-debugging
description: |
  4-phase mandatory debugging process with root cause tracing...
---
```
✓ Valid frontmatter

**Key Content Sample:**
```
## 1.3 The Cardinal Rule: NO PHASE SKIPPING

⛔⛔⛔ CRITICAL: PHASES CANNOT BE SKIPPED ⛔⛔⛔

Phase 1 → Phase 2 → Phase 3 → Phase 4
```
✓ Core concept present

---

## VERDICT

☐ **VERIFIED COMPLETE (Level 5)**
  - File exists: ✓
  - Size correct: ✓ (109KB)
  - Structure complete: ✓ (10 sections)
  - Content verified: ✓
  - Ready for handoff

**User Approved:** ✓
```

## 8.2 Example 2: Database Count Verification

### Scenario
Verify materials database has exactly 125 titanium alloys.

### Verification Report

```markdown
# VERIFICATION REPORT: Titanium Alloys Database

**Work Item:** Add 125 titanium alloys to materials database
**Date:** 2026-01-24

---

## COUNT VERIFICATION

**Expected:** 125 materials
**Source:** Materials expansion spec, Section 3.2

**Verification Command:**
```
$ grep -c '"id":' titanium_alloys.json
125
```

✓ Count matches exactly

**Sample IDs (random):**
```
$ grep '"id":' titanium_alloys.json | shuf | head -5
    "id": "Ti-6Al-4V",
    "id": "Ti-5Al-2.5Sn",
    "id": "CP-Ti-Grade-2",
    "id": "Ti-6Al-2Sn-4Zr-2Mo",
    "id": "Ti-3Al-8V-6Cr-4Mo-4Zr",
```

✓ IDs look correct (titanium alloys)

---

## STRUCTURE VERIFICATION

**Required fields per material:**
- id, name, category
- density, hardness
- kienzle coefficients

**Field Count Check:**
```
$ grep -c '"density":' titanium_alloys.json
125
$ grep -c '"hardness":' titanium_alloys.json
125
$ grep -c '"kienzle":' titanium_alloys.json
125
```

✓ All 125 materials have required fields

---

## VERDICT

☐ **VERIFIED COMPLETE (Level 5)**
  - Count: 125 (exact match)
  - Structure: All required fields present
  - Content: Sample verification passed

**User Approved:** ✓
```

## 8.3 Example 3: Incomplete Verification (Gaps Found)

### Scenario
Verification reveals missing items.

### Verification Report

```markdown
# VERIFICATION REPORT: Machine Database Enhancement

**Work Item:** Add CAD mappings to 50 Haas machines
**Date:** 2026-01-24

---

## COUNT VERIFICATION

**Expected:** 50 machines with CAD mappings
**Source:** Machine enhancement plan

**Verification:**
```
$ grep -c '"cadMapping":' haas_machines.json
47
```

⚠️ Count mismatch: Expected 50, found 47

---

## GAP ANALYSIS

**Missing Machines:**
```
$ # Cross-reference expected vs actual
Missing CAD mappings:
1. Haas-VF-4SS
2. Haas-UMC-1000
3. Haas-ST-35Y
```

**Reason:** These 3 machines were added recently and CAD files not yet available.

---

## VERDICT

☐ **INCOMPLETE**
  - Count: 47/50 (missing 3)
  - Missing: Haas-VF-4SS, Haas-UMC-1000, Haas-ST-35Y
  
**Action Required:**
1. Obtain CAD files for missing machines
2. Add CAD mappings
3. Re-verify

**Return to:** SP.1.3 (Execution)
```

---

# SECTION 9: INTEGRATION

## 9.1 Skill Metadata

```yaml
skill_id: prism-sp-verification
version: 1.0.0
category: development-core
priority: CRITICAL

triggers:
  keywords:
    - "verify", "verification"
    - "prove complete", "prove done"
    - "evidence", "proof"
    - "is it done", "is it complete"
    - "check completion"
  contexts:
    - After debugging (SP.1.6)
    - Before handoff (SP.1.8)
    - When claiming work is complete
    - When user asks for proof

activation_rule: |
  IF (work claimed complete)
  OR (ready for handoff)
  OR (user asks "is it done")
  THEN activate prism-sp-verification
  AND require Level 5 evidence

outputs:
  - Verification report with evidence
  - Gaps list (if incomplete)
  - User approval (for Level 5)

next_skills:
  on_complete: prism-sp-handoff
  on_incomplete: prism-sp-execution OR prism-sp-debugging
```

## 9.2 Handoff Protocols

### Entry Points

**From SP.1.6 (Debugging):**
```json
{
  "from": "prism-sp-debugging",
  "status": "BUG_FIXED",
  "fix": {
    "description": "...",
    "location": "..."
  },
  "defenseLayers": 4,
  "timestamp": "2026-01-24T12:00:00Z"
}
```

**From SP.1.5 (Quality Review):**
```json
{
  "from": "prism-sp-review-quality",
  "status": "APPROVED",
  "findings": {
    "issues": 0,
    "recommendations": 3
  },
  "timestamp": "2026-01-24T12:00:00Z"
}
```

### Handoff to SP.1.8 (Handoff)

**On VERIFIED COMPLETE:**
```json
{
  "from": "prism-sp-verification",
  "status": "VERIFIED_COMPLETE",
  "evidenceLevel": 5,
  "deliverables": [
    {
      "name": "prism-sp-debugging",
      "type": "skill",
      "size": "109KB",
      "lines": 2949,
      "sections": 10
    }
  ],
  "counts": {
    "verified": true,
    "details": {}
  },
  "userApproved": true,
  "timestamp": "2026-01-24T13:00:00Z"
}
```

### Return to Previous Phase

**On INCOMPLETE:**
```json
{
  "from": "prism-sp-verification",
  "status": "INCOMPLETE",
  "gaps": [
    {
      "type": "missing_file",
      "description": "...",
      "action": "..."
    }
  ],
  "returnTo": "prism-sp-execution",
  "timestamp": "2026-01-24T13:00:00Z"
}
```

## 9.3 State Management

### State During Verification

```javascript
{
  "verification": {
    "active": true,
    "workItem": "prism-sp-debugging",
    "started": "2026-01-24T12:30:00Z",
    "steps": {
      "deliverablesList": "COMPLETE",
      "existenceCheck": "COMPLETE",
      "sizeCheck": "COMPLETE",
      "structureCheck": "COMPLETE",
      "countCheck": "IN_PROGRESS",
      "contentCheck": "PENDING",
      "integrationCheck": "PENDING",
      "userApproval": "PENDING"
    },
    "evidenceCollected": {
      "existence": [...],
      "size": [...],
      "structure": [...]
    }
  }
}
```

### State After Verification

```javascript
{
  "verification": {
    "active": false,
    "lastVerification": {
      "workItem": "prism-sp-debugging",
      "result": "VERIFIED_COMPLETE",
      "evidenceLevel": 5,
      "completed": "2026-01-24T13:00:00Z",
      "userApproved": true
    }
  }
}
```

## 9.4 Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                     PRISM-SP-VERIFICATION QUICK REFERENCE                               │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  ⛔ CARDINAL RULE: NO CLAIM WITHOUT PROOF ⛔                                            │
│                                                                                         │
│  5 EVIDENCE LEVELS                                                                      │
│  ─────────────────                                                                      │
│  L1 Claim      "I did it"              → NOT ACCEPTABLE                                 │
│  L2 Reference  "It's at path X"        → NOT ACCEPTABLE                                 │
│  L3 Listing    "ls shows file exists"  → OK for existence                               │
│  L4 Sample     "Content looks correct" → OK for structure                               │
│  L5 Verified   "All checks + approved" → REQUIRED FOR COMPLETE                          │
│                                                                                         │
│  6-STEP PROCESS                                                                         │
│  ─────────────────                                                                      │
│  1. Gather deliverables list                                                            │
│  2. Verify each deliverable (exists, size, structure, content)                          │
│  3. Verify counts (expected vs actual)                                                  │
│  4. Verify integration (imports, exports, consumers)                                    │
│  5. Compile evidence report                                                             │
│  6. Verdict (COMPLETE or INCOMPLETE)                                                    │
│                                                                                         │
│  6 VERIFICATION CATEGORIES                                                              │
│  ─────────────────                                                                      │
│  Existence  → ls/dir showing file                                                       │
│  Size       → byte count, line count                                                    │
│  Structure  → sections, headers, format                                                 │
│  Count      → expected vs actual                                                        │
│  Content    → samples, spot checks                                                      │
│  Integration → imports, exports, consumers                                              │
│                                                                                         │
│  REMEMBER:                                                                              │
│  • Evidence over claims                                                                 │
│  • Level 5 or not complete                                                              │
│  • Show actual command output                                                           │
│  • User approval required for L5                                                        │
│  • Gaps found = success (better now than later)                                         │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 9.5 Full Verification Checklist

```markdown
## VERIFICATION CHECKLIST: [WORK ITEM]

**Date:** [YYYY-MM-DD]
**Work Item:** [description]

---

### STEP 1: DELIVERABLES LIST
- [ ] All expected deliverables identified
- [ ] Sources documented (spec, plan)
- [ ] Expected counts noted

### STEP 2: VERIFY EACH DELIVERABLE
For each deliverable:
- [ ] Existence verified (ls/dir output)
- [ ] Size verified (bytes, lines)
- [ ] Structure verified (sections, format)
- [ ] Content verified (samples)

### STEP 3: VERIFY COUNTS
- [ ] All counts verified
- [ ] Expected vs actual documented
- [ ] Any mismatches investigated

### STEP 4: VERIFY INTEGRATION
- [ ] Exports defined
- [ ] Imports correct
- [ ] Consumers wired

### STEP 5: COMPILE EVIDENCE
- [ ] All evidence collected
- [ ] Report created
- [ ] No gaps in evidence

### STEP 6: VERDICT
- [ ] All deliverables at Level 5
- [ ] All counts match
- [ ] Integration verified
- [ ] User approved

---

**VERDICT:** ☐ VERIFIED COMPLETE / ☐ INCOMPLETE

**Next Step:** ☐ SP.1.8 Handoff / ☐ Return to [phase]
```

---

# DOCUMENT END

**Skill:** prism-sp-verification
**Version:** 1.0
**Total Sections:** 9
**Part of:** SP.1 Core Development Workflow (SP.1.7 of 8)
**Created:** Session SP.1.7
**Status:** COMPLETE

**Key Features:**
- 5 evidence levels (L5 required for completion)
- No-claim-without-proof rule
- 6-step verification process
- 6 verification categories
- Evidence collection commands
- Full report templates
- PRISM-specific patterns

---
