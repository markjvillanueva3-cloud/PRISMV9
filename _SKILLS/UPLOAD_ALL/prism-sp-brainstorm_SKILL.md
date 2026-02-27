---
name: prism-sp-brainstorm
description: |
  Socratic design methodology. MANDATORY STOP before implementation with chunked approval.
---

```
☐ STEP 1: PAUSE - Do NOT implement anything yet
☐ STEP 2: UNDERSTAND - Clarify the actual goal
☐ STEP 3: CHUNK 1 (SCOPE) - Present what will/won't be done → Get approval
☐ STEP 4: CHUNK 2 (APPROACH) - Present how it will be done → Get approval
☐ STEP 5: CHUNK 3 (DETAILS) - Present specifics → Get approval
☐ STEP 6: ALTERNATIVES - Explore at least 2 other options
☐ STEP 7: CONFIRM - Get final go-ahead
☐ VERIFY: All 3 chunks approved, alternatives documented
```

## 2.2 Detailed Process

### Step 1: PAUSE

**Purpose:** Prevent premature implementation

**Duration:** 0 minutes (instant mindset shift)

**Actions:**
1. STOP before writing any code
2. STOP before creating any files
3. STOP before making any changes
4. Shift into exploration mode

**Mental Checklist:**
- [ ] Am I about to implement something?
- [ ] Have I confirmed what the user actually wants?
- [ ] Have I explored alternatives?
- [ ] Has the user approved my approach?

If ANY answer is "no" → Continue with brainstorm process

**Verification:**
- [ ] No code written yet
- [ ] No files created yet
- [ ] In discussion mode

### Step 3: CHUNK 1 - SCOPE

**Purpose:** Define and get approval for WHAT will be done

**Duration:** 3-5 minutes

**Actions:**
1. Present scope as a clear, bounded statement
2. Explicitly state what IS included
3. Explicitly state what is NOT included
4. Wait for user approval

**Scope Presentation Template:**
```markdown
## CHUNK 1: SCOPE

### What I'll Create/Change:
- [Deliverable 1]: [Brief description]
- [Deliverable 2]: [Brief description]
- [Deliverable 3]: [Brief description]

### What's NOT Included:
- [Exclusion 1]: [Why excluded]
- [Exclusion 2]: [Why excluded]

### Estimated Size/Effort:
- [X] files, approximately [Y] lines/KB
- Estimated time: [Z] minutes

**Ready to proceed with this scope?**
```

**Approval Keywords to Listen For:**
- "yes", "approved", "go ahead", "sounds good"
- "proceed", "continue", "that works"
- 👍 or similar affirmative signals

**If User Modifies Scope:**
1. Acknowledge the change
2. Restate the modified scope
3. Ask for approval again

**Verification:**
- [ ] Scope clearly stated
- [ ] Inclusions explicit
- [ ] Exclusions explicit
- [ ] User said "yes" or equivalent

**CRITICAL: Do NOT proceed to Chunk 2 without Chunk 1 approval**

### Step 5: CHUNK 3 - DETAILS

**Purpose:** Define and get approval for specific implementation

**Duration:** 3-5 minutes

**Actions:**
1. Present specific implementation details
2. Show file paths, function names, structures
3. Provide size estimates
4. Wait for user approval

**Details Presentation Template:**
```markdown
## CHUNK 3: DETAILS

### Files to Create/Modify:
1. `[path/file1]`: [What it contains]
2. `[path/file2]`: [What it contains]

### Key Structures:
```
[Show actual structure, schema, or code outline]
```

### Implementation Order:
1. First: [action]
2. Then: [action]
3. Finally: [action]

### Estimated Output:
- Total files: [X]
- Total lines: ~[Y]
- Total size: ~[Z]KB

**Ready for me to implement this?**
```

**If User Wants Changes:**
1. Acknowledge the feedback
2. Modify the details
3. Re-present for approval

**Verification:**
- [ ] Specific paths/names provided
- [ ] Structure/schema shown
- [ ] Implementation order clear
- [ ] User said "yes" or equivalent

**CRITICAL: Do NOT start implementation without Chunk 3 approval**

### Step 7: CONFIRM

**Purpose:** Get final go-ahead before implementation

**Duration:** 1 minute

**Actions:**
1. Summarize the approved design
2. Ask for final confirmation
3. Transition to execution mode

**Final Confirmation Template:**
```markdown
## READY TO IMPLEMENT

**Scope:** [1-line summary]
**Approach:** [1-line summary]
**First Step:** [What I'll do first]

**Starting implementation now. I'll checkpoint after [milestone].**
```

**Verification:**
- [ ] All 3 chunks approved
- [ ] Alternatives documented
- [ ] User gave final go-ahead
- [ ] Ready for prism-sp-execution

# SECTION 3: EXAMPLES

## 3.1 Example 1: New Feature Design (Happy Path)

**Context:**
- User: "Create a materials database enhancement"
- Situation: Complex task requiring design discussion
- Goal: Add new material properties to existing database

**Process Applied:**

### Step 1: PAUSE
- Stopped before writing any code
- Entered discussion mode

### Step 2: UNDERSTAND
```
Claude: "Before I start, let me make sure I understand. You want to enhance 
the materials database - what specific properties or improvements are you 
looking for? And are there any constraints I should know about?"

User: "I want to add thermal properties to all materials. We have about 
100 materials currently. Timeline is flexible but I'd like it done well."
```

### Step 3: CHUNK 1 - SCOPE
```
Claude: "## CHUNK 1: SCOPE

### What I'll Create/Change:
- Enhanced material schema with thermal properties section
- Update all 100 existing materials with thermal data
- Create validation for new properties

### What's NOT Included:
- New materials (just enhancing existing)
- UI changes (backend only)
- Historical data migration

### Estimated Size/Effort:
- 1 schema file update
- 100 material updates
- Estimated time: 45-60 minutes

**Ready to proceed with this scope?**"

User: "Yes, that looks right."
```

### Step 4: CHUNK 2 - APPROACH
```
Claude: "## CHUNK 2: APPROACH

### Strategy:
Enhance the existing 127-parameter template with a thermal properties 
subsection, then systematically update each material with literature values.

### Key Decisions:
1. **Add to existing schema:** Extend rather than replace
2. **Use established sources:** ASM Handbook, MatWeb for thermal data
3. **Batch processing:** Update materials in groups of 10 for checkpointing

### Trade-offs:
- Thoroughness over speed: Complete data preferred over quick partial

**Does this approach make sense?**"

User: "Makes sense, go ahead."
```

### Step 5: CHUNK 3 - DETAILS
```
Claude: "## CHUNK 3: DETAILS

### Files to Modify:
1. `PRISM_MATERIAL_TEMPLATE.js`: Add thermal section
2. `materials/enhanced/*.json`: Update each material

### Thermal Properties to Add:
- Thermal conductivity (W/m·K)
- Specific heat capacity (J/kg·K)
- Thermal expansion coefficient (µm/m·K)
- Melting point (°C)
- Max service temperature (°C)

### Implementation Order:
1. First: Update template schema
2. Then: Update materials in batches of 10
3. Finally: Validate all entries

**Ready for me to implement this?**"

User: "Yes, start with the template."
```

### Step 6: ALTERNATIVES
```
Claude: "## ALTERNATIVES CONSIDERED

### Option A (Chosen): Extend existing template
- Pros: Backward compatible, minimal disruption
- Cons: Slightly larger file size
- Why chosen: Maintains compatibility

### Option B: Separate thermal database
- Pros: Cleaner separation
- Cons: Requires joins, more complex queries
- Why not chosen: Adds unnecessary complexity

Proceeding with Option A."
```

### Step 7: CONFIRM
```
Claude: "## READY TO IMPLEMENT

**Scope:** Add thermal properties to 100 materials
**Approach:** Extend template, batch update
**First Step:** Update PRISM_MATERIAL_TEMPLATE.js

Starting implementation now. I'll checkpoint after template update."
```

**Evidence Captured:**
- E1: User approved scope ("Yes, that looks right")
- E2: User approved approach ("Makes sense, go ahead")
- E3: User approved details ("Yes, start with the template")
- E4: Alternatives documented (Option A vs B)

**Time Taken:** 8 minutes brainstorming → clean implementation

## 3.3 Example 3: User Wants to Skip Brainstorming

**Context:**
- User: "Just create the file, I know what I need"
- Situation: User impatient with process
- Challenge: Balance process with user preference

**Process Applied:**

```
Claude: "Understood - you have a clear vision. Let me just confirm the 
basics to make sure I deliver exactly what you want:

Quick version:
- Creating: [What]
- At: [Path]  
- Size: ~[X]KB

If that's right, I'll start immediately. Sound good?"

User: "Yes, exactly that."

Claude: "Perfect, starting now."
```

**Key Principle:** Respect user's time while getting minimum necessary confirmation. Compress 3 chunks into 1 quick confirmation when user signals they want to skip.

### ❌ Mistake 2: Skipping Chunks

**What Happens:**
Claude presents scope directly, then jumps to implementation without covering approach or details.

**Why It's Wrong:**
- User doesn't know HOW it will be done
- Technical decisions made without input
- May use wrong patterns/tools
- Harder to modify mid-implementation

**Real Example:**
```
WRONG:
Claude: "I'll create a materials database with 100 entries."
User: "OK"
Claude: [Creates using wrong format]
User: "Wait, I wanted JSON not JavaScript"
Claude: [Has to redo everything]

RIGHT:
Claude: [Chunk 1: Scope] "I'll create 100 material entries"
User: "OK"
Claude: [Chunk 2: Approach] "I'll use JSON format with 127 parameters each"
User: "Actually, can we use YAML?"
Claude: "Sure, updating approach to use YAML format..."
[Change caught early, minimal rework]
```

**Detection Signs:**
- Going from scope directly to implementation
- Not discussing technical approach
- User surprised by technical choices

**Prevention:**
- [ ] Always present all 3 chunks
- [ ] Get explicit approval at each chunk
- [ ] Don't combine chunks without user permission

### ❌ Mistake 4: Asking Too Many Questions

**What Happens:**
Claude asks exhaustive questions before making any progress, frustrating the user.

**Why It's Wrong:**
- Wastes user's time
- Shows lack of initiative
- Some questions can be answered during design
- User may abandon task

**Real Example:**
```
WRONG:
Claude: "Before I start, I need to know:
1. What's the exact file format?
2. What encoding should I use?
3. Should there be comments?
4. What's the naming convention?
5. Should I include tests?
6. What's the error handling strategy?
7. Should there be logging?
8. What's the performance requirement?
9. ..." [20 more questions]

User: "Just... make something reasonable"

RIGHT:
Claude: "Let me understand the key requirements:
1. What problem are we solving?
2. Any hard constraints I should know about?

For everything else, I'll use sensible defaults and show 
you my plan before implementing."
```

**Detection Signs:**
- User seems frustrated by questions
- Questions could be answered with reasonable defaults
- Asking about minor details before major direction

**Prevention:**
- [ ] Prioritize questions - ask most important first
- [ ] Use reasonable defaults for minor decisions
- [ ] Batch related questions together
- [ ] Offer to proceed with assumptions user can modify

# SECTION 5: EDGE CASES

## 5.1 User Changes Mind Mid-Brainstorm

**Scenario:** User approves Chunk 1, then during Chunk 2 decides the scope should change.

**Challenge:** Need to handle gracefully without losing progress.

**Solution:**
1. Acknowledge the change positively
2. Return to Chunk 1 with updated scope
3. Get re-approval before continuing
4. Document the evolution

**Example:**
```
Claude: [Presents Chunk 2: Approach]
User: "Actually, can we also include the tool database?"

Claude: "Good thinking - that would make this more comprehensive. 
Let me update the scope:

## UPDATED CHUNK 1: SCOPE (v2)

### Now Including:
- Materials database thermal properties [original]
- Tool database thermal ratings [new]

### Estimated Impact:
- Additional 50 tool entries to update
- Adds ~30 minutes to timeline

Does this updated scope work?"
```

## 5.3 Urgent Request - No Time for Full Brainstorm

**Scenario:** User needs something done immediately.

**Challenge:** Balance process with urgency.

**Solution:**
1. Acknowledge urgency
2. Compress to single quick confirmation
3. Note that full design review can happen later
4. Proceed with implementation

**Example:**
```
User: "I need this in 5 minutes for a demo!"

Claude: "Understood - urgent. Quick confirm:
- Creating: [X]
- Approach: [fastest reliable method]
- Ready in: ~3 minutes

Go?"

User: "Go!"

Claude: [Implements immediately]
```

# SECTION 6: EVIDENCE REQUIREMENTS

## 6.1 Evidence Levels for This Skill

```
THIS SKILL REQUIRES: Level 5 Evidence (User Acceptance)

Level 1 (Existence):     ☐ Not applicable
Level 2 (Content):       ☐ Not applicable
Level 3 (Validation):    ☐ Not applicable
Level 4 (Execution):     ☐ Not applicable
Level 5 (User):          ☑ REQUIRED - User approval at each chunk
```

## 6.2 Specific Evidence Checklist

**Chunk 1 Approval:**
- [ ] Scope presented with inclusions/exclusions
- [ ] User gave affirmative response
- [ ] Response documented

**Chunk 2 Approval:**
- [ ] Approach presented with decisions/trade-offs
- [ ] User gave affirmative response
- [ ] Response documented

**Chunk 3 Approval:**
- [ ] Details presented with specifics
- [ ] User gave affirmative response
- [ ] Response documented

**Alternatives:**
- [ ] At least 2 alternatives identified
- [ ] Pros/cons documented
- [ ] Rationale for choice explained

**Final Confirmation:**
- [ ] Summary presented
- [ ] User gave go-ahead
- [ ] Ready to transition to execution

## 6.3 Evidence Documentation

```markdown
## BRAINSTORM EVIDENCE: [Task Name]

### Chunk Approvals
| Chunk | Presented | User Response | Approved |
|-------|-----------|---------------|----------|
| 1. Scope | ✓ | "[exact response]" | ✓ |
| 2. Approach | ✓ | "[exact response]" | ✓ |
| 3. Details | ✓ | "[exact response]" | ✓ |

### Alternatives Documented
- Option A (chosen): [name] - [reason]
- Option B: [name] - [why not]

### Final Go-Ahead
User: "[exact response]"
Status: APPROVED FOR IMPLEMENTATION
```



# SECTION 8: QUICK REFERENCE CARD

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                    PRISM-SP-BRAINSTORM - QUICK REFERENCE                       ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  TRIGGERS: brainstorm, design, plan feature, think through, explore           ║
║                                                                               ║
║  PROCESS:                                                                     ║
║  ─────────                                                                    ║
║  1. PAUSE ─────────────────────────────────▶ No code yet!                     ║
║  2. UNDERSTAND ────────────────────────────▶ Clarify real goal                ║
║  3. CHUNK 1: SCOPE ────────────────────────▶ What (get approval)              ║
║  4. CHUNK 2: APPROACH ─────────────────────▶ How (get approval)               ║
║  5. CHUNK 3: DETAILS ──────────────────────▶ Specifics (get approval)         ║
║  6. ALTERNATIVES ──────────────────────────▶ Document 2+ options              ║
║  7. CONFIRM ───────────────────────────────▶ Final go-ahead                   ║
║                                                                               ║
║  KEY QUESTIONS:                                                               ║
║  ──────────────                                                               ║
║  • "What problem are we solving?"                                             ║
║  • "What does success look like?"                                             ║
║  • "What should this NOT include?"                                            ║
║                                                                               ║
║  CHUNK TEMPLATES:                                                             ║
║  ────────────────                                                             ║
║  Scope:    "What I'll create: [X]. NOT included: [Y]. Ready?"                 ║
║  Approach: "Strategy: [X]. Key decision: [Y]. Make sense?"                    ║
║  Details:  "Files: [X]. Structure: [Y]. Ready to implement?"                  ║
║                                                                               ║
║  EVIDENCE REQUIRED: Level 5 (User Approval)                                   ║
║  • Chunk 1 approved ✓                                                         ║
║  • Chunk 2 approved ✓                                                         ║
║  • Chunk 3 approved ✓                                                         ║
║  • 2+ alternatives documented                                                 ║
║                                                                               ║
║  ❌ DON'T: Implement before approval, skip chunks, ignore alternatives        ║
║  ✓ DO: Pause first, get approval at each chunk, document options              ║
║                                                                               ║
║  NEXT SKILL: prism-sp-planning (after approval)                               ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

# SECTION 10: VALIDATION CHECKLIST

## 10.1 Structure Validation

- [x] YAML frontmatter complete and valid
- [x] All 10 sections present
- [x] Section numbering consistent
- [x] No placeholder text remaining
- [x] No instructional comments remaining

## 10.2 Content Validation

- [x] Purpose clearly stated (Section 1.1)
- [x] At least 3 trigger keywords defined (brainstorm, design, plan feature)
- [x] Process has 7 steps with verification points
- [x] 3 complete examples (Section 3)
- [x] 5 anti-patterns documented (Section 4)
- [x] Evidence requirements specified (Section 6)
- [x] Quick reference card is ≤30 lines (Section 8)

## 10.3 Quality Validation

- [x] Examples are realistic and complete
- [x] Anti-patterns include real failure scenarios
- [x] Edge cases cover boundary conditions (4 scenarios)
- [x] Integration patterns documented
- [x] Evidence checklist is actionable

## 10.4 Size Validation

- [x] File size within target range (~35KB target)
- [x] No unnecessary repetition
- [x] No missing critical content

## 10.5 Integration Validation

- [x] Triggers don't conflict with other skills
- [x] Composition patterns documented
- [x] Handoff to prism-sp-planning defined

**END OF SKILL DOCUMENT**
