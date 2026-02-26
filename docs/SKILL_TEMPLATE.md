# PRISM SUPERPOWERS SKILL TEMPLATE
## Standard Template for All Superpowers Skills
### Version 1.0 | SP.0.2 Deliverable | January 24, 2026

---

# HOW TO USE THIS TEMPLATE

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              SKILL CREATION PROCESS                                      │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  1. COPY this entire template                                                           │
│  2. RENAME to prism-[sp|app]-[name].md                                                  │
│  3. FILL IN all sections marked with [PLACEHOLDER]                                      │
│  4. DELETE all instructional comments (lines starting with //)                          │
│  5. VALIDATE against checklist in Section 10                                            │
│  6. SAVE to /mnt/skills/user/prism-[name]/SKILL.md                                      │
│                                                                                         │
│  SIZE TARGETS:                                                                          │
│  • Development Workflow (SP.1): 30-50KB                                                 │
│  • Specialized Development (SP.2): 25-45KB                                              │
│  • Anti-Patterns (SP.3): 15-30KB                                                        │
│  • App Workflows (SP.4): 30-55KB                                                        │
│  • App Assistance (SP.5): 20-40KB                                                       │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

# ═══════════════════════════════════════════════════════════════════════════════
# TEMPLATE BEGINS HERE - COPY EVERYTHING BELOW THIS LINE
# ═══════════════════════════════════════════════════════════════════════════════

```yaml
---
name: prism-[sp|app]-[skill-name]
version: 1.0.0
created: [YYYY-MM-DD]
updated: [YYYY-MM-DD]
author: Claude (PRISM Development)
session: [SP.X.Y]

category: [development-workflow | specialized-dev | anti-patterns | app-workflow | app-assistance]
type: [workflow | domain | reference | anti-pattern | guidance]

size_target: ~[XX]KB
actual_size: [filled after creation]

triggers:
  primary:
    - "[keyword1]"
    - "[keyword2]"
  secondary:
    - "[phrase1]"
    - "[phrase2]"
  context:
    - "[contextual trigger]"

requires:
  skills: []  # Skills that should be loaded first
  state: []   # State conditions required
  
provides:
  capabilities:
    - "[capability1]"
    - "[capability2]"
  outputs:
    - "[output1]"
    - "[output2]"

evidence:
  minimum_level: [1-5]
  required:
    - "[evidence item 1]"
    - "[evidence item 2]"

integrates_with:
  primary:
    - "[skill1]"
    - "[skill2]"
  secondary:
    - "[skill3]"

anti_pattern_pair: prism-sp-anti-[topic]  # Leave empty if N/A
---
```

# [SKILL NAME IN CAPS]
## [Subtitle - What This Skill Enables]
### Version [X.X] | [Category] | ~[XX]KB

---

# SECTION 1: OVERVIEW

## 1.1 Purpose

// [2-3 sentences describing what this skill accomplishes]
// Be specific about the value it provides
// Example: "This skill provides a systematic 4-phase debugging methodology..."

[PLACEHOLDER: Write purpose statement]

## 1.2 When to Use

// List specific scenarios that trigger this skill
// Include both explicit triggers and contextual situations

**Explicit Triggers:**
- When user says "[trigger phrase 1]"
- When user says "[trigger phrase 2]"
- When task involves "[activity]"

**Contextual Triggers:**
- During [phase/activity] work
- When [condition] is detected
- After [preceding action] completes

**NOT for:**
- [Scenario where this skill should NOT be used]
- [Another exclusion]

## 1.3 Prerequisites

// What must be true before this skill can be effectively used

**Required State:**
- [ ] [Prerequisite 1]
- [ ] [Prerequisite 2]

**Required Skills Loaded:**
- [skill-name] for [reason]

**Required Context:**
- [Context requirement]

## 1.4 Outputs

// What this skill produces when successfully applied

**Primary Outputs:**
- [Output 1]: [Description]
- [Output 2]: [Description]

**Secondary Outputs:**
- [Output 3]: [Description]

**State Changes:**
- [State field] updated to [value]

---

# SECTION 2: THE PROCESS

## 2.1 Quick Reference Checklist

// Condensed version for rapid execution
// Each item should be actionable in 1-2 minutes

```
☐ STEP 1: [Brief action] → [Expected result]
☐ STEP 2: [Brief action] → [Expected result]
☐ STEP 3: [Brief action] → [Expected result]
☐ STEP 4: [Brief action] → [Expected result]
☐ STEP 5: [Brief action] → [Expected result]
☐ VERIFY: [Verification action]
```

## 2.2 Detailed Process

### Step 1: [Step Name]

**Purpose:** [Why this step is necessary]

**Duration:** [Estimated time: X-Y minutes]

**Actions:**
1. [Specific action with exact details]
   ```
   [Code/command example if applicable]
   ```
2. [Next action]
3. [Next action]

**Decision Point:**
- IF [condition A] → [action A]
- IF [condition B] → [action B]
- IF [unclear] → [ask user / default action]

**Verification:**
- [ ] [Check 1]
- [ ] [Check 2]

**Common Issues:**
| Issue | Cause | Solution |
|-------|-------|----------|
| [Issue 1] | [Cause] | [Fix] |
| [Issue 2] | [Cause] | [Fix] |

---

### Step 2: [Step Name]

**Purpose:** [Why this step is necessary]

**Duration:** [Estimated time: X-Y minutes]

**Actions:**
1. [Specific action]
2. [Next action]

**Dependencies:**
- Requires Step 1 output: [specific output needed]

**Verification:**
- [ ] [Check 1]
- [ ] [Check 2]

---

// Continue for all steps...
// Typical skill has 4-8 major steps

### Step N: [Final Step Name]

**Purpose:** [Why this step is necessary]

**Actions:**
1. [Final actions]

**Completion Criteria:**
- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] All evidence captured

---

## 2.3 Process Flow Diagram

```
┌─────────────┐
│   START     │
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌─────────────┐
│   Step 1    │────▶│  Decision   │
└─────────────┘     └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
        ┌─────────┐  ┌─────────┐  ┌─────────┐
        │ Path A  │  │ Path B  │  │ Path C  │
        └────┬────┘  └────┬────┘  └────┬────┘
              │            │            │
              └────────────┼────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   Step N    │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   VERIFY    │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │    END      │
                    └─────────────┘
```

---

# SECTION 3: EXAMPLES

## 3.1 Example 1: [Scenario Name - Happy Path]

// Show the skill being used successfully in a typical scenario

**Context:**
- Situation: [Describe the starting situation]
- Goal: [What needs to be accomplished]
- Constraints: [Any limitations]

**Input:**
```
[Exact input that triggered this skill]
```

**Process Applied:**

**Step 1: [Name]**
- Action taken: [What was done]
- Result: [What happened]
```
[Any code/output generated]
```

**Step 2: [Name]**
- Action taken: [What was done]
- Result: [What happened]

// Continue for relevant steps...

**Output:**
```
[Final output/deliverable]
```

**Evidence Captured:**
- [Evidence type]: [Specific evidence]
- [Evidence type]: [Specific evidence]

**Time Taken:** [X minutes]

---

## 3.2 Example 2: [Scenario Name - Edge Case]

// Show handling of a more complex or unusual situation

**Context:**
- Situation: [Describe the edge case]
- Challenge: [What makes this different/harder]

**Input:**
```
[Input that triggered this scenario]
```

**Process Applied:**

[Show how the skill handled the edge case, including any decision points where non-standard paths were taken]

**Key Decisions:**
- At Step [X]: Chose [option] because [reason]
- At Step [Y]: Deviated from standard because [reason]

**Output:**
```
[Final output]
```

**Lessons:**
- [What this example teaches]

---

## 3.3 Example 3: [Scenario Name - Recovery]

// Show recovering from a problem mid-process

**Context:**
- Situation: [Starting point]
- Problem Encountered: [What went wrong]

**Recovery Process:**
1. Detected issue: [How it was noticed]
2. Diagnosed cause: [What caused it]
3. Applied fix: [What was done]
4. Resumed from: [Where process continued]

**Final Output:**
```
[Successful completion despite problem]
```

---

# SECTION 4: ANTI-PATTERNS

## 4.1 Overview of Mistakes

// Summarize the most dangerous mistakes

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                    TOP [N] MISTAKES TO AVOID                                   ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  ❌ MISTAKE 1: [Name]                                                          ║
║     Impact: [Severity - High/Medium/Low]                                      ║
║     Frequency: [Common/Occasional/Rare]                                       ║
║                                                                               ║
║  ❌ MISTAKE 2: [Name]                                                          ║
║     Impact: [Severity]                                                        ║
║     Frequency: [Frequency]                                                    ║
║                                                                               ║
║  ❌ MISTAKE 3: [Name]                                                          ║
║     Impact: [Severity]                                                        ║
║     Frequency: [Frequency]                                                    ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

## 4.2 Detailed Anti-Patterns

### ❌ Mistake 1: [Descriptive Name]

**What Happens:**
[Describe the mistake in detail - what someone does wrong]

**Why It's Wrong:**
[Explain the root cause and why this leads to problems]

**Real Example:**
```
[Show an actual example of this mistake]
```

**Consequences:**
- [Consequence 1]
- [Consequence 2]
- [Worst case scenario]

**Detection Signs:**
- [How to know you're making this mistake - sign 1]
- [Sign 2]
- [Sign 3]

**Correct Approach:**
```
[Show the right way to do it]
```

**Prevention:**
- [ ] [Preventive measure 1]
- [ ] [Preventive measure 2]

---

### ❌ Mistake 2: [Descriptive Name]

// Same structure as Mistake 1

---

### ❌ Mistake 3: [Descriptive Name]

// Same structure as Mistake 1

---

// Include 3-5 anti-patterns per skill



---

# SECTION 5: EDGE CASES

## 5.1 [Edge Case Category 1]

### Scenario: [Name]

**Description:**
[Describe the unusual situation]

**Challenge:**
[What makes this difficult or different from normal]

**Detection:**
[How to recognize this edge case]

**Solution:**
1. [Step 1 to handle]
2. [Step 2 to handle]
3. [Step 3 to handle]

**Example:**
```
[Concrete example of this edge case and its handling]
```

---

### Scenario: [Name]

// Same structure for additional edge cases in this category

---

## 5.2 [Edge Case Category 2]

// Different category of edge cases

### Scenario: [Name]

**Description:**
[Describe the situation]

**Solution:**
[How to handle]

---

## 5.3 Boundary Conditions

// Specific limits and boundaries

| Condition | Limit | What Happens | How to Handle |
|-----------|-------|--------------|---------------|
| [Condition 1] | [Limit] | [Behavior] | [Action] |
| [Condition 2] | [Limit] | [Behavior] | [Action] |
| [Condition 3] | [Limit] | [Behavior] | [Action] |

---

# SECTION 6: EVIDENCE REQUIREMENTS

## 6.1 Evidence Levels for This Skill

// Reference the framework's 5-level system

```
THIS SKILL REQUIRES: Level [X] Evidence

Level 1 (Existence):     ☐ Required / ☑ Required
Level 2 (Content):       ☐ Required / ☑ Required  
Level 3 (Validation):    ☐ Required / ☑ Required
Level 4 (Execution):     ☐ Required / ☑ Required
Level 5 (User):          ☐ Required / ☑ Required
```

## 6.2 Specific Evidence Checklist

// Concrete items that must be captured

**Before Starting:**
- [ ] [Pre-condition evidence 1]
- [ ] [Pre-condition evidence 2]

**During Process:**
- [ ] [Progress evidence 1]
- [ ] [Progress evidence 2]
- [ ] [Checkpoint evidence]

**At Completion:**
- [ ] [Completion evidence 1]
- [ ] [Completion evidence 2]
- [ ] [Completion evidence 3]

## 6.3 Evidence Capture Templates

### Template 1: [Evidence Type]

```markdown
## EVIDENCE: [Type Name]
**Captured:** [Timestamp]
**Step:** [Which step this relates to]

### Data
[Actual evidence data]

### Verification
- [ ] [Verification check 1]
- [ ] [Verification check 2]

### Status: [CAPTURED | VERIFIED | FAILED]
```

### Template 2: [Evidence Type]

```markdown
## EVIDENCE: [Type Name]
**Captured:** [Timestamp]

### Data
[Evidence data]

### Status: [STATUS]
```

## 6.4 Evidence Storage

// Where evidence should be stored

**Session Log Entry:**
```markdown
### Evidence Log: [Task Name]

#### E1: [Evidence Item]
- Type: [Level X]
- Data: [Summary]
- Verified: ✓/✗

#### E2: [Evidence Item]
- Type: [Level X]
- Data: [Summary]
- Verified: ✓/✗
```

**State File Update:**
```json
{
  "evidence": {
    "level": [X],
    "items": [
      {"type": "[type]", "verified": true},
      {"type": "[type]", "verified": true}
    ],
    "complete": true
  }
}
```

---

# SECTION 7: SKILL INTEGRATION

## 7.1 Works Well With

// Skills that combine effectively with this one

| Skill | Integration Pattern | When to Combine |
|-------|---------------------|-----------------|
| prism-[skill1] | [How they work together] | [Scenario] |
| prism-[skill2] | [How they work together] | [Scenario] |
| prism-[skill3] | [How they work together] | [Scenario] |

### Detailed Integration: [Skill 1]

**Pattern:**
```
THIS SKILL          +          [OTHER SKILL]
     │                              │
     ▼                              ▼
[This provides]              [Other provides]
     │                              │
     └──────────────┬───────────────┘
                    │
                    ▼
            [Combined result]
```

**Example:**
[Show how these skills work together in practice]

---

## 7.2 Conflicts With

// Skills that should NOT be used simultaneously

| Skill | Conflict Reason | Resolution |
|-------|-----------------|------------|
| prism-[skill] | [Why they conflict] | [How to resolve] |

---

## 7.3 Prerequisite Chain

// What must be done before this skill

```
[Prerequisite Skill 1]
         │
         ▼
[Prerequisite Skill 2] (optional)
         │
         ▼
    THIS SKILL
         │
         ▼
[Follow-up Skill 1]
         │
         ▼
[Follow-up Skill 2]
```

---

## 7.4 Composition Examples

### Composition 1: [Task Name]

**Skills Combined:**
- Lead: [This skill]
- Support: [Skill 2]
- Reference: [Skill 3]

**Flow:**
1. [This skill] initiates with [action]
2. [Skill 2] provides [data/guidance]
3. [This skill] continues with [action]
4. [Skill 3] validates [aspect]
5. [This skill] completes with [action]

---

# SECTION 8: QUICK REFERENCE CARD

// Condensed to fit on one screen for rapid recall
// Maximum 30 lines

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                    [SKILL NAME] - QUICK REFERENCE                              ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  TRIGGERS: [keyword1], [keyword2], [phrase1]                                  ║
║                                                                               ║
║  PROCESS:                                                                     ║
║  ─────────                                                                    ║
║  1. [Step 1 summary] ──────────────────────────▶ [Output 1]                   ║
║  2. [Step 2 summary] ──────────────────────────▶ [Output 2]                   ║
║  3. [Step 3 summary] ──────────────────────────▶ [Output 3]                   ║
║  4. [Step 4 summary] ──────────────────────────▶ [Output 4]                   ║
║  5. VERIFY ────────────────────────────────────▶ Evidence captured            ║
║                                                                               ║
║  KEY DECISIONS:                                                               ║
║  ──────────────                                                               ║
║  • IF [condition] → [action]                                                  ║
║  • IF [condition] → [action]                                                  ║
║                                                                               ║
║  EVIDENCE REQUIRED: Level [X]                                                 ║
║  • [Evidence item 1]                                                          ║
║  • [Evidence item 2]                                                          ║
║                                                                               ║
║  ❌ DON'T: [Top mistake to avoid]                                             ║
║  ✓ DO: [Correct approach]                                                     ║
║                                                                               ║
║  INTEGRATES: [skill1], [skill2], [skill3]                                     ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

# SECTION 9: CHANGELOG

// Track changes to this skill over time

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0.0 | [YYYY-MM-DD] | Initial creation | Claude |
| | | | |

---

# SECTION 10: VALIDATION CHECKLIST

// Use this to verify the skill is complete and correct

## 10.1 Structure Validation

- [ ] YAML frontmatter complete and valid
- [ ] All 9 sections present (or marked N/A with reason)
- [ ] Section numbering consistent
- [ ] No placeholder text remaining (no [PLACEHOLDER])
- [ ] No instructional comments remaining (no // lines)

## 10.2 Content Validation

- [ ] Purpose clearly stated (Section 1.1)
- [ ] At least 3 trigger keywords defined
- [ ] Process has 4-8 steps with verification points
- [ ] At least 2 complete examples (Section 3)
- [ ] At least 3 anti-patterns documented (Section 4)
- [ ] Evidence requirements specified (Section 6)
- [ ] Quick reference card is ≤30 lines (Section 8)

## 10.3 Quality Validation

- [ ] Examples are realistic and complete
- [ ] Anti-patterns include real failure scenarios
- [ ] Edge cases cover boundary conditions
- [ ] Integration patterns are tested
- [ ] Evidence checklist is actionable

## 10.4 Size Validation

- [ ] File size within target range for category
- [ ] No unnecessary repetition
- [ ] No missing critical content

## 10.5 Integration Validation

- [ ] Triggers don't conflict with other skills
- [ ] Composition patterns documented
- [ ] Anti-pattern pair identified (if applicable)

---

# ═══════════════════════════════════════════════════════════════════════════════
# TEMPLATE ENDS HERE
# ═══════════════════════════════════════════════════════════════════════════════



---

# APPENDIX A: COMPLETE EXAMPLE SKILL

// This is a fully filled-out example showing how the template should look when complete

```yaml
---
name: prism-sp-debugging
version: 1.0.0
created: 2026-01-24
updated: 2026-01-24
author: Claude (PRISM Development)
session: SP.1.6

category: development-workflow
type: workflow

size_target: ~50KB
actual_size: 48KB

triggers:
  primary:
    - "debug"
    - "fix bug"
    - "troubleshoot"
  secondary:
    - "error"
    - "not working"
    - "broken"
  context:
    - "after failed test"
    - "during issue resolution"

requires:
  skills: []
  state:
    - "issue identified or reported"
    
provides:
  capabilities:
    - "systematic issue diagnosis"
    - "root cause identification"
    - "verified fix implementation"
  outputs:
    - "fixed code/configuration"
    - "regression test"
    - "documentation of fix"

evidence:
  minimum_level: 4
  required:
    - "reproduction steps documented"
    - "root cause identified"
    - "fix verified by test"
    - "regression test passes"

integrates_with:
  primary:
    - "prism-error-catalog"
    - "prism-expert-master-machinist"
  secondary:
    - "prism-tdd"

anti_pattern_pair: prism-sp-anti-debugging
---
```

# PRISM-SP-DEBUGGING
## Systematic 4-Phase Debugging Methodology
### Version 1.0 | Development Workflow | ~50KB

---

# SECTION 1: OVERVIEW

## 1.1 Purpose

This skill provides a mandatory 4-phase debugging methodology that ensures bugs are fixed at their root cause rather than having symptoms masked. It enforces evidence collection before diagnosis, prevents premature fixes, and ensures fixes include prevention measures.

## 1.2 When to Use

**Explicit Triggers:**
- When user says "debug this"
- When user says "fix this error"
- When user says "it's not working"
- When task involves resolving unexpected behavior

**Contextual Triggers:**
- After a test fails
- When code produces incorrect output
- When system behaves unexpectedly
- After user reports an issue

**NOT for:**
- Feature requests (use prism-sp-brainstorm)
- Performance optimization (use prism-sp-performance)
- Code refactoring without bugs (use prism-sp-refactoring)

## 1.3 Prerequisites

**Required State:**
- [ ] Issue can be described or reproduced
- [ ] Access to relevant code/system

**Required Context:**
- Understanding of expected vs actual behavior

## 1.4 Outputs

**Primary Outputs:**
- Fixed code/configuration
- Regression test
- Fix documentation

**State Changes:**
- currentTask updated with fix details
- SESSION_LOG updated with debugging trace

---

# SECTION 2: THE PROCESS

## 2.1 Quick Reference Checklist

```
☐ PHASE 1: EVIDENCE - Reproduce 3x, document steps, capture errors
☐ PHASE 2: ROOT CAUSE - Trace backward, find FIRST corruption point
☐ PHASE 3: HYPOTHESIS - Form theory, design minimal test, validate
☐ PHASE 4: FIX - Fix root cause, add validation, create regression test
☐ VERIFY: Repro steps now pass, regression test passes
```

## 2.2 Detailed Process

### Phase 1: Evidence Collection

**Purpose:** Gather objective data before forming any theories

**Duration:** 5-15 minutes

**Actions:**
1. Reproduce the issue at least 3 times
2. Document exact steps to reproduce
3. Capture error messages verbatim
4. Note what WAS working before
5. Identify when issue first appeared

**MANDATORY: Complete Phase 1 before proceeding**

...

[ABBREVIATED FOR TEMPLATE EXAMPLE]
```

---

# APPENDIX B: SECTION-BY-SECTION GUIDANCE

## Section 1: Overview

**Purpose Statement Guidelines:**
- 2-3 sentences maximum
- Start with "This skill provides/enables/ensures..."
- Include the primary value delivered
- Mention what makes this skill unique

**Good Example:**
> "This skill provides a systematic 4-phase debugging methodology that ensures bugs are fixed at their root cause rather than having symptoms masked."

**Bad Example:**
> "This skill is for debugging." (Too vague, no value statement)

---

## Section 2: The Process

**Step Structure Guidelines:**
- Each step should take 2-10 minutes
- Include exact commands/code where applicable
- Always include verification criteria
- Include decision points for branching

**Step Naming:**
- Use action verbs: "Collect", "Analyze", "Validate", "Execute"
- Be specific: "Validate Schema" not "Check Things"

---

## Section 3: Examples

**Example Requirements:**
- Minimum 2 examples, recommend 3
- Example 1: Happy path (typical use)
- Example 2: Edge case or complex scenario
- Example 3: Recovery from problem

**Example Quality:**
- Use real-world scenarios
- Show complete input and output
- Include timestamps where relevant
- Show evidence captured

---

## Section 4: Anti-Patterns

**Anti-Pattern Requirements:**
- Minimum 3, recommend 5
- Include real failure scenarios
- Show consequences clearly
- Provide detection methods

**Anti-Pattern Structure:**
1. What happens (the mistake)
2. Why it's wrong (root cause)
3. Real example (concrete failure)
4. Consequences (what goes wrong)
5. Detection (how to notice)
6. Correct approach (what to do instead)

---

## Section 5: Edge Cases

**Edge Case Categories:**
- Boundary conditions (limits, extremes)
- Unusual inputs (empty, null, huge)
- Environment issues (permissions, network)
- Timing issues (race conditions, timeouts)
- State issues (corrupted, missing)

---

## Section 6: Evidence Requirements

**Evidence Level Selection:**
| Task Type | Minimum Level |
|-----------|---------------|
| File creation | 2 |
| Code writing | 3 |
| Database change | 3 |
| Bug fix | 4 |
| Feature complete | 5 |

---

## Section 7: Integration

**Document All Integration Points:**
- Skills that commonly combine
- Data flow between skills
- Conflict scenarios
- Composition patterns

---

## Section 8: Quick Reference

**Quick Reference Rules:**
- Maximum 30 lines
- Must fit on one screen
- Include most critical information only
- Use consistent visual formatting

---

# APPENDIX C: COMMON MISTAKES IN SKILL CREATION

## C.1 Template Mistakes

| Mistake | Impact | Fix |
|---------|--------|-----|
| Leaving [PLACEHOLDER] text | Skill incomplete | Search and replace all |
| Leaving // comments | Confusion | Delete all instructional lines |
| Missing YAML frontmatter | Activation fails | Add complete frontmatter |
| Wrong category | Wrong triggers | Verify category matches content |

## C.2 Content Mistakes

| Mistake | Impact | Fix |
|---------|--------|-----|
| Vague purpose | Skill not loaded when needed | Be specific about value |
| Missing examples | Hard to apply | Add 2-3 real examples |
| No anti-patterns | Mistakes repeated | Document common failures |
| Generic evidence | Can't verify completion | List specific evidence |

## C.3 Quality Mistakes

| Mistake | Impact | Fix |
|---------|--------|-----|
| Too short (<15KB) | Insufficient guidance | Expand examples and edge cases |
| Too long (>150KB) | Context overload | Split into multiple skills |
| Repetitive content | Wasted tokens | Consolidate or reference |
| Missing integration | Skills don't compose | Document combinations |

---

# APPENDIX D: SKILL NAMING CONVENTIONS

## D.1 Naming Patterns

```
DEVELOPMENT WORKFLOW:
  prism-sp-[verb/noun]
  Examples: prism-sp-brainstorm, prism-sp-debugging, prism-sp-verification

SPECIALIZED DEVELOPMENT:
  prism-sp-[domain]
  Examples: prism-sp-extraction, prism-sp-materials, prism-sp-wiring

ANTI-PATTERNS:
  prism-sp-anti-[topic]
  Examples: prism-sp-anti-extraction, prism-sp-anti-state

APPLICATION WORKFLOWS:
  prism-app-[function]
  Examples: prism-app-speed-feed, prism-app-troubleshoot

APPLICATION ASSISTANCE:
  prism-app-[type]
  Examples: prism-app-explain-physics, prism-app-confidence
```

## D.2 Naming Rules

1. Always lowercase
2. Use hyphens, not underscores
3. Be descriptive but concise
4. Match trigger keywords where possible
5. Avoid abbreviations unless universal

---

# APPENDIX E: FILE SIZE GUIDELINES

## E.1 Size Targets by Category

| Category | Target | Min | Max | Typical Sections |
|----------|--------|-----|-----|------------------|
| Dev Workflow | 35KB | 25KB | 50KB | All 9 |
| Specialized | 35KB | 25KB | 45KB | All 9 |
| Anti-Pattern | 22KB | 15KB | 30KB | 1, 4, 6, 8 |
| App Workflow | 42KB | 30KB | 55KB | All 9 |
| App Assist | 30KB | 20KB | 40KB | 1-3, 6, 8 |

## E.2 What to Include/Exclude

**Include:**
- Essential process steps
- Critical examples (2-3)
- Key anti-patterns (3-5)
- Evidence requirements
- Quick reference

**Exclude:**
- Redundant explanations
- Generic advice (put in framework)
- Overly detailed edge cases (reference other docs)
- Repeated content from other skills

---

# DOCUMENT METADATA

```
Document:     SKILL_TEMPLATE.md
Version:      1.0.0
Created:      2026-01-24
Session:      SP.0.2
Author:       Claude (PRISM Development)

Purpose:      Provide the standard template for all 
              Superpowers skills (42 planned)

Related:      PRISM_SKILL_FRAMEWORK.md (architecture)
              
Next:         SP.0.3 - DOT Diagram Standards
```

---

**END OF TEMPLATE DOCUMENT**

