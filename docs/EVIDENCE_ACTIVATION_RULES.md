# PRISM EVIDENCE & ACTIVATION RULES
## Standards for Skill Activation and Evidence Capture
### Version 1.0 | SP.0.4 Deliverable | January 24, 2026

---

# PART 1: OVERVIEW

## 1.1 Purpose

This document defines two critical systems:
1. **Activation Rules** - How and when skills are triggered and loaded
2. **Evidence Standards** - What constitutes proof of task completion

These systems work together: Activation rules determine WHICH skills guide work, Evidence standards determine WHEN work is complete.

## 1.2 Document Scope

| System | Defines | Used By |
|--------|---------|---------|
| Activation Rules | Trigger patterns, precedence, loading | Claude (skill selection) |
| Evidence Standards | Capture methods, levels, verification | Claude (completion proof) |

---

# PART 2: ACTIVATION RULES ENGINE

## 2.1 Activation Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SKILL ACTIVATION FLOW                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  USER REQUEST                                                               │
│       │                                                                     │
│       ▼                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ TIER 1: PROMPT PATTERN MATCHING                                     │   │
│  │ ─────────────────────────────────────────────────────────────────── │   │
│  │ Check for trigger keywords in request                               │   │
│  │ "debug" → debugging skills | "extract" → extraction skills          │   │
│  └────────────────────────────────┬────────────────────────────────────┘   │
│                                   │                                        │
│                                   ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ PRECEDENCE RESOLUTION                                               │   │
│  │ ─────────────────────────────────────────────────────────────────── │   │
│  │ 1. Explicit skill name (highest)                                    │   │
│  │ 2. Development workflow triggers                                    │   │
│  │ 3. Application guidance triggers                                    │   │
│  │ 4. Domain expertise triggers                                        │   │
│  │ 5. Anti-pattern triggers                                            │   │
│  │ 6. Context inference (lowest)                                       │   │
│  └────────────────────────────────┬────────────────────────────────────┘   │
│                                   │                                        │
│                                   ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ SKILL LOADING                                                       │   │
│  │ ─────────────────────────────────────────────────────────────────── │   │
│  │ Load 1-3 skills via: view("/mnt/skills/user/prism-X/SKILL.md")     │   │
│  │ Read COMPLETE skill before acting                                   │   │
│  └────────────────────────────────┬────────────────────────────────────┘   │
│                                   │                                        │
│                                   ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ EXECUTE WITH GUIDANCE                                               │   │
│  │ ─────────────────────────────────────────────────────────────────── │   │
│  │ Follow skill's process, collect evidence, verify completion         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 2.2 Trigger Categories

### Category 1: Explicit Skill Names (Precedence: 1 - Highest)

User directly names a skill:
```
"use prism-sp-debugging"
"load prism-material-template"
"apply prism-expert-master-machinist"
```
**Action:** Load that exact skill immediately

### Category 2: Development Workflow Triggers (Precedence: 2)

| Trigger Words | Maps To | Purpose |
|---------------|---------|---------|
| brainstorm, design, plan feature | prism-sp-brainstorm | Socratic design |
| plan, schedule, break down | prism-sp-planning | Task decomposition |
| execute, implement, build, create | prism-sp-execution | Checkpointed execution |
| review spec, does it match | prism-sp-review-spec | Specification review |
| review quality, code quality | prism-sp-review-quality | Quality review |
| debug, fix, error, bug, broken | prism-sp-debugging | 4-phase debugging |
| verify, prove, evidence, done | prism-sp-verification | Evidence capture |
| handoff, end session, transition | prism-sp-handoff | Session transition |

### Category 3: Application Guidance Triggers (Precedence: 3)

| Trigger Words | Maps To | Purpose |
|---------------|---------|---------|
| select material, which material | prism-app-material-guide | Material selection |
| speed and feed, cutting parameters | prism-app-speed-feed | Speed/feed calc |
| select tool, which tool | prism-app-tool-select | Tool selection |
| setup machine, configure | prism-app-machine-setup | Machine setup |
| toolpath, cutting strategy | prism-app-toolpath | Toolpath strategy |
| troubleshoot, chatter, vibration | prism-app-troubleshoot | Problem solving |
| quality, inspection | prism-app-quality | Quality assurance |
| cost, quote, estimate | prism-app-cost | Cost estimation |
| post processor, G-code debug | prism-app-post-debug | Post debugging |
| fixture, workholding | prism-app-fixture | Fixture design |
| cycle time, reduce time | prism-app-cycle-time | Cycle optimization |

### Category 4: Domain Expertise Triggers (Precedence: 4)

| Trigger Words | Maps To | Purpose |
|---------------|---------|---------|
| CAD, model, DFM, feature | prism-expert-cad-expert | CAD expertise |
| CAM, toolpath strategy | prism-expert-cam-programmer | CAM expertise |
| shop floor, practical, machining problem | prism-expert-master-machinist | Practical knowledge |
| metallurgy, heat treat, alloy | prism-expert-materials-scientist | Materials science |
| matrix, numerical, algorithm | prism-expert-mathematics | Math operations |
| stress, deflection, FEA | prism-expert-mechanical-engineer | Mechanical analysis |
| post, G-code generation | prism-expert-post-processor | Post processing |
| SPC, Cpk, inspection | prism-expert-quality-control | Quality control |
| ISO, PPAP, audit | prism-expert-quality-manager | Quality management |
| thermal, heat transfer | prism-expert-thermodynamics | Thermal analysis |

### Category 5: Anti-Pattern Triggers (Precedence: 5)

| Trigger Words | Maps To | Purpose |
|---------------|---------|---------|
| extraction mistake, don't extract | prism-sp-anti-extraction | Extraction errors |
| wiring mistake, don't wire | prism-sp-anti-wiring | Wiring errors |
| state mistake, don't manage state | prism-sp-anti-state | State errors |
| testing mistake, bad test | prism-sp-anti-testing | Testing errors |
| machining mistake, don't machine | prism-app-anti-machining | Machining errors |

### Category 6: Context Inference (Precedence: 6 - Lowest)

When no explicit trigger but context implies:
- Working in materials phase → prism-sp-materials
- Working in extraction → prism-sp-extraction
- After test failure → prism-sp-debugging
- End of session → prism-sp-handoff

## 2.3 Multi-Skill Loading Rules

```
RULE 1: MAXIMUM THREE ACTIVE SKILLS
─────────────────────────────────────
Never load more than 3 skills simultaneously
More than 3 → context overload → mistakes

RULE 2: LEAD + SUPPORT + REFERENCE PATTERN
─────────────────────────────────────────────
LEAD:      Controls workflow (usually SP.1 or SP.2 skill)
SUPPORT:   Provides domain knowledge (usually existing skill)
REFERENCE: Provides data/values (usually reference skill)

RULE 3: ANTI-PATTERN IMPLICIT
───────────────────────────────
For every major task category, relevant anti-pattern is implicitly available
Don't count toward the 3-skill limit
Check BEFORE critical steps

RULE 4: COMPOSITION PRIORITY
──────────────────────────────
If skills give conflicting guidance:
1. Safety wins over all
2. Workflow wins over domain
3. More specific wins over general
4. If still tied → ask user
```

## 2.4 Trigger Conflict Resolution

| Scenario | Resolution |
|----------|------------|
| Multiple triggers match | Use highest precedence |
| Same precedence, different skills | Load most specific first |
| User request ambiguous | Ask clarifying question |
| Context contradicts trigger | Trigger wins |
| Trigger matches anti-pattern | Load both skill AND anti-pattern |

---

# PART 3: EVIDENCE STANDARDS

## 3.1 Five-Level Evidence System

```
╔═════════════════════════════════════════════════════════════════════════════╗
║                         EVIDENCE LEVEL HIERARCHY                             ║
╠═════════════════════════════════════════════════════════════════════════════╣
║                                                                             ║
║  LEVEL 5: USER ACCEPTANCE ──────────────────────────── Highest Confidence   ║
║  ┌─────────────────────────────────────────────────────────────────────┐   ║
║  │ User explicitly confirms: "yes", "approved", "looks good", "done"   │   ║
║  │ Required for: Feature complete, major deliverables                  │   ║
║  └─────────────────────────────────────────────────────────────────────┘   ║
║                                      ▲                                      ║
║                                      │                                      ║
║  LEVEL 4: EXECUTION ────────────────────────────────── Functional Proof     ║
║  ┌─────────────────────────────────────────────────────────────────────┐   ║
║  │ Code runs without error, tests pass, integration works              │   ║
║  │ Required for: Bug fixes, module extraction, wiring                  │   ║
║  └─────────────────────────────────────────────────────────────────────┘   ║
║                                      ▲                                      ║
║                                      │                                      ║
║  LEVEL 3: VALIDATION ───────────────────────────────── Quality Verified     ║
║  ┌─────────────────────────────────────────────────────────────────────┐   ║
║  │ Schema valid, values in range, references resolve, structure OK     │   ║
║  │ Required for: Database entries, code writing                        │   ║
║  └─────────────────────────────────────────────────────────────────────┘   ║
║                                      ▲                                      ║
║                                      │                                      ║
║  LEVEL 2: CONTENT ──────────────────────────────────── Content Verified     ║
║  ┌─────────────────────────────────────────────────────────────────────┐   ║
║  │ Head/tail sample correct, line count matches, parses OK             │   ║
║  │ Required for: File creation, documentation                          │   ║
║  └─────────────────────────────────────────────────────────────────────┘   ║
║                                      ▲                                      ║
║                                      │                                      ║
║  LEVEL 1: EXISTENCE ────────────────────────────────── Minimum Proof        ║
║  ┌─────────────────────────────────────────────────────────────────────┐   ║
║  │ File exists at path, size non-zero, directory created               │   ║
║  │ Required for: Quick checks, intermediate steps                      │   ║
║  └─────────────────────────────────────────────────────────────────────┘   ║
║                                                                             ║
╚═════════════════════════════════════════════════════════════════════════════╝
```

## 3.2 Evidence Requirements by Task Type

| Task Type | Min Level | Required Evidence |
|-----------|-----------|-------------------|
| Quick check | 1 | File/directory exists |
| File creation | 2 | Path + size + head/tail sample |
| Documentation | 2 | Path + line count + structure check |
| Code writing | 3 | Parse check + structure + imports resolve |
| Database entry | 3 | Schema validation + range check |
| Configuration | 3 | Syntax valid + values in range |
| Module extraction | 4 | Runs + imports resolve + no errors |
| Bug fix | 4 | Repro steps fail→pass + regression test |
| Wiring complete | 4 | All consumers connected + test passes |
| Feature complete | 5 | User acceptance + all tests pass |
| Session handoff | 5 | User confirms state file accurate |

## 3.3 Evidence Capture Methods

### Level 1: Existence Evidence

```javascript
// CAPTURE METHOD
const evidence = {
  level: 1,
  type: "existence",
  captured: new Date().toISOString(),
  data: {
    path: "C:\\PRISM REBUILD...\\file.md",
    exists: true,
    isFile: true,
    size: 45678  // bytes, non-zero confirms content
  }
};

// HOW TO CAPTURE
// 1. list_directory or get_file_info
// 2. Confirm exists: true
// 3. Confirm size > 0
```

### Level 2: Content Evidence

```javascript
// CAPTURE METHOD
const evidence = {
  level: 2,
  type: "content",
  captured: new Date().toISOString(),
  data: {
    path: "C:\\PRISM REBUILD...\\file.md",
    size: 45678,
    lineCount: 1234,
    headSample: "# DOCUMENT TITLE...",  // First 5-10 lines
    tailSample: "**END OF DOCUMENT**",  // Last 5-10 lines
    structureValid: true
  }
};

// HOW TO CAPTURE
// 1. get_file_info for size and lineCount
// 2. read_file offset=0, length=10 for head
// 3. read_file offset=-10 for tail
// 4. Verify expected content present
```

### Level 3: Validation Evidence

```javascript
// CAPTURE METHOD
const evidence = {
  level: 3,
  type: "validation",
  captured: new Date().toISOString(),
  data: {
    path: "C:\\PRISM REBUILD...\\data.json",
    schemaValid: true,
    fieldCount: 127,
    requiredFields: ["id", "name", "category"],
    requiredPresent: true,
    rangeChecks: [
      {field: "hardness", value: 250, min: 100, max: 700, valid: true},
      {field: "density", value: 7.85, min: 1.0, max: 25.0, valid: true}
    ],
    referencesResolved: true
  }
};

// HOW TO CAPTURE
// 1. read_file and parse content
// 2. Check all required fields present
// 3. Validate values against known ranges
// 4. Verify cross-references resolve
```

### Level 4: Execution Evidence

```javascript
// CAPTURE METHOD
const evidence = {
  level: 4,
  type: "execution",
  captured: new Date().toISOString(),
  data: {
    command: "node test.js",
    exitCode: 0,
    stdout: "All 47 tests passed",
    stderr: "",
    duration: "2.3s",
    testsRun: 47,
    testsPassed: 47,
    testsFailed: 0
  }
};

// HOW TO CAPTURE
// 1. Run the code/tests
// 2. Capture exit code (0 = success)
// 3. Parse output for pass/fail counts
// 4. Document any errors
```

### Level 5: User Evidence

```javascript
// CAPTURE METHOD
const evidence = {
  level: 5,
  type: "user_acceptance",
  captured: new Date().toISOString(),
  data: {
    userMessage: "Yes, this looks correct. Approved.",
    accepted: true,
    keywords: ["yes", "correct", "approved"],
    context: "User confirmed deliverable meets requirements"
  }
};

// HOW TO CAPTURE
// 1. Present deliverable to user
// 2. Ask for explicit confirmation
// 3. Look for acceptance keywords
// 4. Document user's exact response
```



## 3.4 Evidence Documentation Format

### In-Chat Evidence Report

```markdown
## ✓ EVIDENCE CAPTURED: [Task Name]

**Level:** [1-5] ([Level Name])
**Captured:** [Timestamp]
**Status:** VERIFIED

### Evidence Items

| # | Type | Data | Verified |
|---|------|------|----------|
| E1 | [Type] | [Summary] | ✓ |
| E2 | [Type] | [Summary] | ✓ |
| E3 | [Type] | [Summary] | ✓ |

### Details

**E1: [Evidence Name]**
- Path: [file path]
- Size: [X bytes]
- Verified: [specific check passed]

**E2: [Evidence Name]**
- [Relevant details]

### Conclusion
[Brief statement confirming task completion based on evidence]
```

### State File Evidence Entry

```json
{
  "currentSession": {
    "evidence": {
      "level": 3,
      "status": "VERIFIED",
      "items": [
        {
          "id": "E1",
          "type": "content",
          "path": "C:\\PRISM REBUILD...\\file.md",
          "verified": true,
          "data": {
            "size": 45678,
            "lineCount": 1234
          }
        },
        {
          "id": "E2",
          "type": "validation",
          "verified": true,
          "data": {
            "schemaValid": true,
            "rangeChecksPass": true
          }
        }
      ],
      "capturedAt": "2026-01-24T07:00:00Z"
    }
  }
}
```

### Session Log Evidence Entry

```markdown
## SESSION LOG: [Session ID]

### Evidence Log

#### Task: [Task Name]
**Required Level:** [X]
**Achieved Level:** [Y]
**Status:** [VERIFIED | PARTIAL | FAILED]

##### E1: File Creation
- **Type:** Content (Level 2)
- **Path:** C:\PRISM...\file.md
- **Size:** 45,678 bytes
- **Lines:** 1,234
- **Head:** "# DOCUMENT TITLE..."
- **Tail:** "**END OF DOCUMENT**"
- **Verified:** ✓

##### E2: Structure Validation
- **Type:** Validation (Level 3)
- **Schema:** Skill Template v1.0
- **Fields:** 127/127 present
- **Ranges:** All within bounds
- **Verified:** ✓

##### Conclusion
Task verified complete with Level 3 evidence.
```

---

# PART 4: ACTIVATION + EVIDENCE INTEGRATION

## 4.1 Skill → Evidence Mapping

Each skill type has expected evidence levels:

| Skill Category | Skills | Min Evidence | Typical Evidence |
|----------------|--------|--------------|------------------|
| Dev Workflow (SP.1) | brainstorm, planning, execution | 2-3 | 3-4 |
| Dev Workflow (SP.1) | debugging, verification | 4 | 4-5 |
| Specialized (SP.2) | extraction, materials, machines | 3-4 | 4 |
| Specialized (SP.2) | wiring, testing, migration | 4 | 4-5 |
| Anti-Pattern (SP.3) | all anti-* skills | N/A | Reference only |
| App Workflow (SP.4) | speed-feed, toolpath, quality | 3 | 3-4 |
| App Assistance (SP.5) | explain, confidence, safety | 2 | 2-3 |

## 4.2 Evidence-Gated Workflow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      EVIDENCE-GATED WORKFLOW                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────┐                                                                │
│  │  START  │                                                                │
│  └────┬────┘                                                                │
│       │                                                                     │
│       ▼                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ SKILL ACTIVATION                                                    │   │
│  │ ─────────────────────────────────────────────────────────────────── │   │
│  │ Load skill → Read evidence requirements → Note minimum level        │   │
│  └────────────────────────────────┬────────────────────────────────────┘   │
│                                   │                                        │
│                                   ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ EXECUTE TASK                                                        │   │
│  │ ─────────────────────────────────────────────────────────────────── │   │
│  │ Follow skill process → Capture evidence at each step                │   │
│  └────────────────────────────────┬────────────────────────────────────┘   │
│                                   │                                        │
│                                   ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ EVIDENCE GATE                                                       │   │
│  │ ─────────────────────────────────────────────────────────────────── │   │
│  │ Check: Evidence level ≥ Required level?                             │   │
│  └────────────────────────────────┬────────────────────────────────────┘   │
│                                   │                                        │
│                    ┌──────────────┴──────────────┐                        │
│                    │                             │                        │
│                    ▼                             ▼                        │
│              ┌──────────┐                  ┌──────────┐                   │
│              │   PASS   │                  │   FAIL   │                   │
│              │  ✓ Done  │                  │  ✗ More  │                   │
│              └────┬─────┘                  └────┬─────┘                   │
│                   │                             │                         │
│                   ▼                             ▼                         │
│           Document evidence            Collect more evidence              │
│           Update state file            Return to execution                │
│           Report completion            ──────────┘                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 4.3 Never Claim Done Without Evidence

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                           ABSOLUTE RULE                                        ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║   NEVER claim "done", "complete", "finished" without:                         ║
║                                                                               ║
║   1. ☐ At least one evidence item captured                                    ║
║   2. ☐ Evidence meets minimum level for task type                             ║
║   3. ☐ Evidence documented (in chat or state file)                            ║
║   4. ☐ Verification step performed                                            ║
║                                                                               ║
║   WRONG:                                                                      ║
║   ✗ "Done! I created the file."                                               ║
║   ✗ "Complete - the database is updated."                                     ║
║   ✗ "Finished with the extraction."                                           ║
║                                                                               ║
║   RIGHT:                                                                      ║
║   ✓ "Done! Evidence: File exists at [path], 45KB, 1234 lines.                ║
║      Head sample shows correct title, tail shows END marker."                 ║
║                                                                               ║
║   ✓ "Complete - Evidence captured:                                            ║
║      - E1: File created (32KB, 890 lines) ✓                                   ║
║      - E2: Schema validation passed (127/127 fields) ✓                        ║
║      - E3: Range checks passed ✓"                                             ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

# PART 5: QUICK REFERENCE

## 5.1 Activation Quick Reference

```
TRIGGER PRECEDENCE (high to low):
1. Explicit skill name → Load exact skill
2. Dev workflow words → SP.1 skills
3. App guidance words → SP.4-5 skills  
4. Domain expertise → Expert skills
5. Anti-pattern words → SP.3 skills
6. Context inference → Best match

LOADING RULES:
• Max 3 active skills
• Lead + Support + Reference pattern
• Anti-pattern implicitly available
• Read COMPLETE skill before acting

CONFLICT RESOLUTION:
Safety > Workflow > Specific > General > Ask
```

## 5.2 Evidence Quick Reference

```
EVIDENCE LEVELS:
1. Existence:  File exists, size > 0
2. Content:    Head/tail sample, line count
3. Validation: Schema valid, ranges OK
4. Execution:  Code runs, tests pass
5. User:       Explicit acceptance

MINIMUM BY TASK:
File creation   → Level 2
Code writing    → Level 3
Database entry  → Level 3
Bug fix         → Level 4
Module extract  → Level 4
Feature done    → Level 5

CAPTURE PATTERN:
1. Note required level for task
2. Perform work
3. Capture evidence at each step
4. Verify evidence meets level
5. Document in chat + state file
6. THEN claim done
```

## 5.3 Common Trigger → Skill Mapping

```
DEVELOPMENT:
debug/fix/error     → prism-sp-debugging
brainstorm/design   → prism-sp-brainstorm
extract/pull        → prism-sp-extraction + prism-monolith-index
verify/prove        → prism-sp-verification
handoff/end         → prism-sp-handoff

APPLICATION:
speed/feed          → prism-app-speed-feed + prism-product-calculators
troubleshoot        → prism-app-troubleshoot + prism-expert-master-machinist
material select     → prism-app-material-guide + prism-material-template

DOMAIN:
G-code/post         → prism-gcode-reference + prism-expert-post-processor
Fanuc               → prism-fanuc-programming
stress/deflection   → prism-expert-mechanical-engineer
```

## 5.4 Evidence Capture Commands

```
LEVEL 1 (Existence):
  Filesystem:list_directory → check file present
  Desktop Commander:get_file_info → check size > 0

LEVEL 2 (Content):
  Desktop Commander:get_file_info → size, lineCount
  Desktop Commander:read_file offset=0 length=10 → head
  Desktop Commander:read_file offset=-10 → tail

LEVEL 3 (Validation):
  Filesystem:read_file → get content
  Parse JSON/code → check structure
  Validate fields → check ranges

LEVEL 4 (Execution):
  Desktop Commander:start_process → run tests
  Check exit code = 0
  Parse output for pass/fail

LEVEL 5 (User):
  Present deliverable
  Ask "Does this look correct?"
  Wait for "yes"/"approved"
```

---

# PART 6: EXAMPLES

## 6.1 Example: Skill Activation for Debugging

**User Request:** "There's an error in the material database - some hardness values seem wrong"

**Activation Process:**
1. Trigger detected: "error" → prism-sp-debugging
2. Context: "material database" → prism-sp-materials (support)
3. Domain: "hardness values" → prism-expert-materials-scientist (reference)

**Skills Loaded:**
- Lead: prism-sp-debugging (4-phase process)
- Support: prism-sp-materials (material DB knowledge)
- Reference: prism-expert-materials-scientist (valid ranges)

**Evidence Required:** Level 4 (bug fix)
- Reproduction documented
- Root cause identified
- Fix verified by test

## 6.2 Example: Evidence Capture for File Creation

**Task:** Create SKILL_TEMPLATE.md

**Evidence Captured:**

```markdown
## ✓ EVIDENCE CAPTURED: SKILL_TEMPLATE.md Creation

**Level:** 2 (Content)
**Captured:** 2026-01-24T06:50:00Z
**Status:** VERIFIED

### Evidence Items

| # | Type | Data | Verified |
|---|------|------|----------|
| E1 | Existence | File at _DOCS\SKILL_TEMPLATE.md | ✓ |
| E2 | Size | 32,580 bytes | ✓ |
| E3 | Structure | 1,181 lines, 10 sections | ✓ |
| E4 | Content | Head: "# PRISM SUPERPOWERS SKILL TEMPLATE" | ✓ |
| E5 | Content | Tail: "**END OF TEMPLATE DOCUMENT**" | ✓ |

### Conclusion
File created successfully with complete template structure.
```

## 6.3 Example: Multi-Skill Composition

**User Request:** "Extract the force calculation engine from the monolith and verify it works"

**Activation:**
```
Triggers: "extract" + "verify" + "engine"
         ↓
Skills:  prism-sp-extraction (lead - extraction workflow)
         prism-monolith-index (support - line numbers)
         prism-auditor (reference - completeness check)
         
Anti-pattern: prism-sp-anti-extraction (implicit)

Evidence Required: Level 4 (extraction must run)
```

**Workflow:**
1. prism-monolith-index → Find force engine location
2. prism-sp-extraction → Guide extraction process
3. prism-sp-anti-extraction → Check for common mistakes
4. prism-auditor → Verify completeness
5. Level 4 evidence → Run extracted module, confirm no errors

---

# DOCUMENT METADATA

```
Document:     EVIDENCE_ACTIVATION_RULES.md
Version:      1.0.0
Created:      2026-01-24
Session:      SP.0.4
Author:       Claude (PRISM Development)
Size:         ~40KB
Sections:     6 Parts

Purpose:      Define skill activation rules and evidence
              standards for the Superpowers framework

Related:      PRISM_SKILL_FRAMEWORK.md
              SKILL_TEMPLATE.md
              DOT_STANDARDS.md

Next:         SP.1.1 - prism-sp-brainstorm skill
```

---

**END OF DOCUMENT**

