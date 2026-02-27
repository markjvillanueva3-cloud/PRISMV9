---
name: prism-sp-verification
description: |
  Evidence-based completion proof. Level 5 verification standards.
---

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

### Deliverable 2: [NAME]
[repeat for each deliverable]

### Count 2: [ITEM TYPE]
[repeat for each count]

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
----          ------ ----------# SECTION 5: VERIFICATION CATEGORIES

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

## 1. DELIVERABLES SUMMARY

### Expected Deliverables

| # | Deliverable | Type | Location | Status |
|---|-------------|------|----------|--------|
| 1 | [name] | File | [path] | ☐ ✓ / ☐ ✗ |
| 2 | [name] | File | [path] | ☐ ✓ / ☐ ✗ |
| N | [name] | File | [path] | ☐ ✓ / ☐ ✗ |

**Deliverables Complete:** [N] / [N]

### Deliverable 2: [NAME]

[repeat for each deliverable]

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

### [ITEM TYPE 2]

[repeat for each count]

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

name: [skill-name]
description: |
  [description]
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

## EXISTENCE EVIDENCE

**Path:** C:\PRISM REBUILD\_SKILLS\prism-sp-debugging\SKILL.md

**Evidence:**
```
$ Get-Item "SKILL.md" | Select Name, Length, LastWriteTime

Name     Length  LastWriteTime
----     ------  ----------## SIZE EVIDENCE

**Expected:** ~50KB (from design spec)
**Actual:** 109KB, 2,949 lines

```
$ (Get-Content SKILL.md | Measure-Object -Line).Lines
2949
```

✓ Size exceeds minimum (comprehensive coverage)

## CONTENT EVIDENCE

**YAML Frontmatter:**
```
```
✓ Valid frontmatter

**Key Content Sample:**
```
## 1.3 The Cardinal Rule: NO PHASE SKIPPING

⛔⛔⛔ CRITICAL: PHASES CANNOT BE SKIPPED ⛔⛔⛔

Phase 1 → Phase 2 → Phase 3 → Phase 4
```
✓ Core concept present

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

**VERDICT:** ☐ VERIFIED COMPLETE / ☐ INCOMPLETE

**Next Step:** ☐ SP.1.8 Handoff / ☐ Return to [phase]
```
