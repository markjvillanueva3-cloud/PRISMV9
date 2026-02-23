---
name: prism-sp-brainstorm
description: |
  Socratic design methodology with chunked approval for PRISM development.
  HOOK-FIRST v8.0: Auto-fires CALC-BEFORE-EXEC-001, CALC-RANGE-CHECK-001,
  AGENT-TIER-VALIDATE-001 during execution. Use when: brainstorm, design,
  plan feature, think through, explore options. 7-step process with hooks.
  Part of SP.1 Core Development Workflow.
---
# PRISM-SP-BRAINSTORM v8.0
## Socratic Design Methodology with Hook Integration
### Version 8.0 | Hook-First Architecture | Development Workflow

---

# HOOK INTEGRATION (v8.0)

## Hooks Fired Automatically
| Phase | Hook | Purpose |
|-------|------|---------|
| Start | CALC-BEFORE-EXEC-001 | Validate goal decomposition |
| Scope | CALC-RANGE-CHECK-001 | Check constraints within valid ranges |
| Approach | AGENT-TIER-VALIDATE-001 | Assign correct agent tiers |
| Details | BATCH-BEFORE-EXEC-001 | Validate planned operations |
| Complete | STATE-BEFORE-MUTATE-001 | Track state changes |

## Manual Hook Usage
```javascript
// Validate constraints explicitly
prism_hook_fire("CALC-RANGE-CHECK-001", {
  constraints: ["Safety critical", "Sub-second response"],
  taskComplexity: "COMPLEX"
});

// Check agent tier assignment
prism_hook_fire("AGENT-TIER-VALIDATE-001", {
  tier: "OPUS",
  safetyRequired: true,
  taskType: "design_validation"
});
```

## Hook-Enabled Workflow
```
PAUSE → UNDERSTAND → SCOPE → APPROACH → DETAILS → ALTERNATIVES → CONFIRM
  ↓         ↓          ↓         ↓          ↓           ↓           ↓
 CALC-001  CALC-001  RANGE-001  TIER-001  BATCH-001  CALC-001   STATE-001
```

---

# SECTION 1: OVERVIEW

## 1.1 Purpose

This skill provides a systematic methodology for exploring and validating design decisions BEFORE implementation begins. It uses Socratic questioning to uncover requirements, chunked approval to prevent scope creep, and mandatory alternative exploration to ensure the best solution is selected. The goal is to prevent costly rework by getting alignment early.

## 1.2 When to Use

**Explicit Triggers:**
- When user says "brainstorm this"
- When user says "let's design..."
- When user says "plan this feature"
- When user says "think through..."
- When task involves creating something new

**Contextual Triggers:**
- At the start of any complex task (>30 min estimated)
- When requirements are ambiguous
- When multiple approaches are possible
- Before any irreversible action
- When user seems uncertain about what they want

**NOT for:**
- Simple factual questions
- Tasks with clear, unambiguous requirements
- Continuing already-approved work
- Emergency fixes (use prism-sp-debugging instead)
- Tasks user explicitly wants done without discussion

## 1.3 Prerequisites

**Required State:**
- [ ] Task or feature has been identified
- [ ] User is available for interactive discussion
- [ ] No implementation has started yet

**NOT Required:**
- Detailed specifications (we'll develop those)
- Technical decisions made (we'll explore options)

## 1.4 Outputs

**Primary Outputs:**
- Approved Scope Definition
- Approved Technical Approach
- Approved Implementation Details
- List of Alternatives Considered

**Secondary Outputs:**
- Clarified requirements
- Identified risks/constraints
- Dependencies mapped

**State Changes:**
- currentTask updated with approved design
- Ready for prism-sp-planning handoff

---

# SECTION 2: THE PROCESS

## 2.1 Quick Reference Checklist

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

---

### Step 2: UNDERSTAND

**Purpose:** Clarify the actual goal before designing solutions

**Duration:** 2-5 minutes

**Actions:**
1. Restate the request in your own words
2. Ask clarifying questions using Socratic method
3. Identify the REAL goal (not just the stated task)
4. Uncover constraints and requirements

**Socratic Questions to Ask:**
```
GOAL CLARIFICATION:
• "What problem are we trying to solve?"
• "What does success look like?"
• "Who will use this and how?"

CONSTRAINT DISCOVERY:
• "Are there any limitations I should know about?"
• "What's the timeline/urgency?"
• "What resources are available?"

SCOPE BOUNDARIES:
• "What should this definitely include?"
• "What should this definitely NOT include?"
• "Are there related things we should consider?"
```

**Decision Point:**
- IF user's goal is clear → Proceed to Chunk 1
- IF user's goal is unclear → Ask more questions
- IF user wants to skip brainstorming → Confirm, then proceed to execution

**Verification:**
- [ ] Can articulate the goal in one sentence
- [ ] Know the key constraints
- [ ] Understand success criteria

**Common Issues:**
| Issue | Cause | Solution |
|-------|-------|----------|
| User frustrated by questions | Too many questions at once | Ask 1-2 questions, then summarize |
| Goal keeps shifting | User discovering requirements | That's good! Document the evolution |
| User says "just do it" | Impatience | Acknowledge, offer quick brainstorm or skip |

---

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

---

### Step 4: CHUNK 2 - APPROACH

**Purpose:** Define and get approval for HOW it will be done

**Duration:** 3-5 minutes

**Actions:**
1. Present high-level technical approach
2. Explain key decisions and trade-offs
3. Mention major technologies/patterns
4. Wait for user approval

**Approach Presentation Template:**
```markdown
## CHUNK 2: APPROACH

### Strategy:
[1-2 sentence summary of overall approach]

### Key Decisions:
1. **[Decision 1]:** [Choice] because [reason]
2. **[Decision 2]:** [Choice] because [reason]
3. **[Decision 3]:** [Choice] because [reason]

### Technologies/Patterns:
- [Technology 1]: Used for [purpose]
- [Pattern 1]: Applied because [reason]

### Trade-offs Accepted:
- [Trade-off]: [What we gain] vs [What we lose]

**Does this approach make sense?**
```

**If User Questions Approach:**
1. Explain reasoning in more detail
2. Offer alternative approaches (see Step 6)
3. Let user choose
4. Document the decision

**Verification:**
- [ ] Approach clearly stated
- [ ] Key decisions explained
- [ ] Trade-offs acknowledged
- [ ] User said "yes" or equivalent

**CRITICAL: Do NOT proceed to Chunk 3 without Chunk 2 approval**

---

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

---

### Step 6: ALTERNATIVES

**Purpose:** Ensure best solution by exploring options

**Duration:** 2-3 minutes

**Actions:**
1. Identify at least 2 alternative approaches
2. Briefly explain each alternative
3. Explain why the chosen approach is preferred
4. Document for future reference

**When to Present Alternatives:**
- ALWAYS before final confirmation
- When user seems uncertain
- When multiple valid approaches exist
- When trade-offs are significant

**Alternatives Template:**
```markdown
## ALTERNATIVES CONSIDERED

### Option A (Chosen): [Name]
- Pros: [advantages]
- Cons: [disadvantages]
- Why chosen: [reason]

### Option B: [Name]
- Pros: [advantages]
- Cons: [disadvantages]
- Why not chosen: [reason]

### Option C: [Name]
- Pros: [advantages]
- Cons: [disadvantages]
- Why not chosen: [reason]

**Proceeding with Option A unless you prefer another?**
```

**Verification:**
- [ ] At least 2 alternatives identified
- [ ] Pros/cons documented
- [ ] Rationale for choice explained

---

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

---

## 2.3 Process Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        BRAINSTORM WORKFLOW                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────┐                                                                │
│  │ REQUEST │                                                                │
│  └────┬────┘                                                                │
│       │                                                                     │
│       ▼                                                                     │
│  ╔═════════════════════════════════════════════════════════════════════╗   │
│  ║ STEP 1: PAUSE - No implementation yet!                              ║   │
│  ╚════════════════════════════════╤════════════════════════════════════╝   │
│                                   │                                        │
│                                   ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ STEP 2: UNDERSTAND - Socratic questioning                           │   │
│  │ "What's the real goal?" "What are the constraints?"                 │   │
│  └────────────────────────────────┬────────────────────────────────────┘   │
│                                   │                                        │
│       ┌───────────────────────────┼───────────────────────────┐           │
│       │                           │                           │           │
│       ▼                           ▼                           ▼           │
│  ╔═════════════╗           ╔═════════════╗           ╔═════════════╗      │
│  ║  CHUNK 1    ║           ║  CHUNK 2    ║           ║  CHUNK 3    ║      │
│  ║   SCOPE     ║──────────▶║  APPROACH   ║──────────▶║  DETAILS    ║      │
│  ║  (What)     ║  Approved ║  (How)      ║  Approved ║  (Specifics)║      │
│  ╚══════╤══════╝           ╚══════╤══════╝           ╚══════╤══════╝      │
│         │                         │                         │             │
│         │ Not approved            │ Not approved            │ Not approved│
│         ▼                         ▼                         ▼             │
│    [Revise]                  [Revise]                  [Revise]           │
│                                                                             │
│                                   │ All approved                           │
│                                   ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ STEP 6: ALTERNATIVES - Document 2+ options considered               │   │
│  └────────────────────────────────┬────────────────────────────────────┘   │
│                                   │                                        │
│                                   ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ STEP 7: CONFIRM - Final go-ahead                                    │   │
│  └────────────────────────────────┬────────────────────────────────────┘   │
│                                   │                                        │
│                                   ▼                                        │
│                          ┌───────────────┐                                 │
│                          │   IMPLEMENT   │                                 │
│                          │ (sp-execution)│                                 │
│                          └───────────────┘                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```



---

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

---

## 3.2 Example 2: Ambiguous Request (Clarification Needed)

**Context:**
- User: "Fix the calculation problem"
- Situation: Vague request, needs clarification
- Challenge: Multiple possible interpretations

**Process Applied:**

### Step 2: UNDERSTAND (Extended)
```
Claude: "I want to make sure I address the right issue. When you say 
'calculation problem,' could you tell me:
1. Which calculation is affected? (speed/feed, forces, tool life?)
2. What's happening vs what should happen?
3. Is this affecting specific materials or all materials?"

User: "Oh, the speed/feed calculator is giving values that are too 
aggressive for aluminum. Users are getting tool breakage."

Claude: "Got it - so the issue is specifically aluminum materials in 
the speed/feed calculator producing aggressive values that cause tool 
breakage. Is this all aluminum alloys or specific ones?"

User: "Mainly the 6000 and 7000 series."
```

**Outcome:** Vague "fix the calculation problem" → Specific "reduce speed/feed aggressiveness for 6xxx and 7xxx aluminum alloys"

---

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

---

# SECTION 4: ANTI-PATTERNS

## 4.1 Overview of Mistakes

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                    TOP 5 BRAINSTORMING MISTAKES                                ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  ❌ MISTAKE 1: Implementing Before Approval                                    ║
║     Impact: HIGH - Wasted work, rework required                               ║
║     Frequency: COMMON                                                         ║
║                                                                               ║
║  ❌ MISTAKE 2: Skipping Chunks                                                 ║
║     Impact: MEDIUM - Scope creep, misalignment                                ║
║     Frequency: COMMON                                                         ║
║                                                                               ║
║  ❌ MISTAKE 3: Not Exploring Alternatives                                      ║
║     Impact: MEDIUM - Suboptimal solutions                                     ║
║     Frequency: VERY COMMON                                                    ║
║                                                                               ║
║  ❌ MISTAKE 4: Asking Too Many Questions                                       ║
║     Impact: LOW - User frustration                                            ║
║     Frequency: OCCASIONAL                                                     ║
║                                                                               ║
║  ❌ MISTAKE 5: Vague Scope Definitions                                         ║
║     Impact: HIGH - Scope creep, endless changes                               ║
║     Frequency: COMMON                                                         ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

## 4.2 Detailed Anti-Patterns

### ❌ Mistake 1: Implementing Before Approval

**What Happens:**
Claude receives a request and immediately starts coding/creating files without confirming scope, approach, or details with the user.

**Why It's Wrong:**
- Assumptions may be incorrect
- User may have different expectations
- Work may need to be completely redone
- Wastes time and context

**Real Example:**
```
User: "Create a post processor for Mazak"

WRONG:
Claude: "Creating MAZAK_POST_PROCESSOR.js now..."
[Creates 500 lines of code]
[User wanted a different machine model]
[All work wasted]

RIGHT:
Claude: "Before I create the Mazak post processor, let me confirm:
- Which Mazak model? (Integrex, Quick Turn, VCN?)
- Which controller? (Mazatrol, FANUC?)
- Any special options or cycles needed?"
```

**Consequences:**
- Wasted implementation time
- User frustration
- Potential data loss if overwriting
- Context wasted on wrong path

**Detection Signs:**
- Writing code before asking questions
- Creating files without showing plan first
- Assuming requirements without confirming

**Correct Approach:**
1. PAUSE before any implementation
2. Ask clarifying questions
3. Present chunked design
4. Get approval at each stage
5. THEN implement

**Prevention:**
- [ ] Always start with UNDERSTAND step
- [ ] Present SCOPE chunk before writing code
- [ ] Wait for explicit "yes" before implementing

---

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

---

### ❌ Mistake 3: Not Exploring Alternatives

**What Happens:**
Claude picks the first viable solution without considering other options.

**Why It's Wrong:**
- May miss better solutions
- User doesn't know trade-offs
- Can't make informed decision
- May regret choice later

**Real Example:**
```
WRONG:
Claude: "I'll implement this using a recursive algorithm."
[Implements recursive solution]
[Turns out iterative would be 10x faster for this use case]

RIGHT:
Claude: "## ALTERNATIVES CONSIDERED

Option A: Recursive algorithm
- Pros: Elegant code, natural for tree structures
- Cons: Stack overflow risk for deep structures

Option B: Iterative algorithm  
- Pros: Better performance, no stack limits
- Cons: More verbose code

For this case with potentially 10,000+ nodes, I recommend 
Option B. Thoughts?"
```

**Detection Signs:**
- Presenting only one solution
- Not mentioning trade-offs
- User asks "why not X?" after implementation

**Prevention:**
- [ ] Always identify 2+ alternatives
- [ ] Document pros/cons of each
- [ ] Explain why chosen option is preferred

---

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

---

### ❌ Mistake 5: Vague Scope Definitions

**What Happens:**
Claude presents scope in unclear terms that could mean multiple things.

**Why It's Wrong:**
- User and Claude may have different interpretations
- No clear completion criteria
- Scope can expand indefinitely
- Arguments about what was agreed

**Real Example:**
```
WRONG:
Claude: "I'll improve the database."
User: "OK"
[Claude adds 3 fields]
[User expected complete restructuring]
[Misalignment discovered after work done]

RIGHT:
Claude: "## CHUNK 1: SCOPE

### What I'll Change:
- Add 5 specific fields: thermal_conductivity, specific_heat,
  thermal_expansion, melting_point, service_temp
- Update 100 existing materials with these values
- Add validation for new fields

### What's NOT Included:
- Schema restructuring
- New materials
- UI changes

This is bounded to ~500 lines of changes across 101 files."
```

**Detection Signs:**
- Scope uses vague words like "improve", "enhance", "fix"
- No specific deliverables listed
- No explicit exclusions stated
- No size/effort estimate

**Prevention:**
- [ ] List specific deliverables
- [ ] State explicit exclusions
- [ ] Provide size/effort estimates
- [ ] Use concrete, measurable terms

---

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

---

## 5.2 User Rejects All Alternatives

**Scenario:** User doesn't like any of the proposed approaches.

**Challenge:** Need to find a path forward.

**Solution:**
1. Ask what they would prefer
2. Explore their suggested approach
3. If their approach has issues, explain diplomatically
4. Find middle ground

**Example:**
```
Claude: [Presents 3 alternatives]
User: "None of these work for me."

Claude: "I appreciate the feedback. What approach did you have in mind?
Or what aspects of these options don't work for your situation?
Understanding your constraints will help me propose something better."
```

---

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

---

## 5.4 Technical User vs Non-Technical User

**Scenario:** Need to adjust chunk detail level based on user expertise.

**Solution:**

**For Technical Users:**
- Include code snippets in Chunk 3
- Use technical terminology
- Discuss implementation trade-offs
- Shorter explanations

**For Non-Technical Users:**
- Focus on outcomes, not implementation
- Use analogies and plain language
- Longer explanations of why
- Visual representations when helpful

---

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



---

# SECTION 7: SKILL INTEGRATION

## 7.1 Works Well With

| Skill | Integration Pattern | When to Combine |
|-------|---------------------|-----------------|
| prism-sp-planning | Brainstorm → Planning handoff | After approval, before execution |
| prism-sp-execution | Planning → Execution handoff | When starting implementation |
| prism-expert-* | Domain expertise for alternatives | When technical options exist |
| prism-debugging | If brainstorm reveals issue | When problem-solving mode needed |

### Primary Integration: prism-sp-brainstorm → prism-sp-planning

```
BRAINSTORM                    PLANNING
    │                             │
    ▼                             ▼
┌─────────────────┐         ┌─────────────────┐
│ Approved Design │────────▶│ Detailed Tasks  │
│ - Scope ✓       │         │ - Exact steps   │
│ - Approach ✓    │         │ - Time estimates│
│ - Details ✓     │         │ - Dependencies  │
└─────────────────┘         └─────────────────┘

HANDOFF DATA:
- Approved scope definition
- Approved technical approach
- Approved implementation details
- Alternatives considered
- User preferences noted
```

### Integration: Using Expert Skills During Brainstorm

When exploring alternatives, domain experts provide options:

```
BRAINSTORM PROCESS
       │
       │ "What are the options for thermal calculation?"
       ▼
┌─────────────────────────────────────────────────────────┐
│ prism-expert-thermodynamics                             │
│ ─────────────────────────────────────────────────────── │
│ Option A: Analytical solution (fast, approximate)       │
│ Option B: FEA-based (accurate, slow)                    │
│ Option C: Empirical correlation (fast, good accuracy)   │
└─────────────────────────────────────────────────────────┘
       │
       │ Options fed back to brainstorm
       ▼
PRESENT ALTERNATIVES TO USER
```

## 7.2 Conflicts With

| Skill | Conflict Reason | Resolution |
|-------|-----------------|------------|
| prism-sp-execution | Can't brainstorm AND execute simultaneously | Complete brainstorm first |
| prism-sp-debugging | Different modes (design vs fix) | Choose based on user need |

## 7.3 Prerequisite Chain

```
[No prerequisites]
        │
        ▼
   BRAINSTORM (this skill)
        │
        ▼
  prism-sp-planning
        │
        ▼
  prism-sp-execution
        │
        ▼
  prism-sp-verification
```

## 7.4 Composition Examples

### Composition 1: New Feature Development

**Skills Combined:**
- Lead: prism-sp-brainstorm (design phase)
- Support: prism-expert-cam-programmer (if CAM-related)
- Reference: prism-coding-patterns (for approach options)

**Flow:**
1. Brainstorm activates on "design new feature"
2. During alternatives, consult expert skill for domain options
3. Reference coding patterns for implementation approaches
4. Complete brainstorm with all 3 chunks approved
5. Hand off to planning

### Composition 2: Architecture Decision

**Skills Combined:**
- Lead: prism-sp-brainstorm
- Support: prism-dependency-graph
- Reference: prism-algorithm-selector

**Flow:**
1. Brainstorm the high-level design
2. Use dependency-graph to understand impact
3. Use algorithm-selector to choose best approach
4. Document alternatives with technical justification

---

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
║  RESOURCES: Call F-PSI-001 to select optimal skills/agents/formulas           ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

# SECTION 9: CHANGELOG

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0.0 | 2026-01-24 | Initial creation | Claude (SP.1.1) |

---

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

---

# DOCUMENT METADATA

```
Skill:        prism-sp-brainstorm
Version:      1.0.0
Created:      2026-01-24
Session:      SP.1.1
Author:       Claude (PRISM Development)
Category:     Development Workflow (SP.1)

Purpose:      Socratic design methodology with chunked
              approval to prevent premature implementation

Triggers:     brainstorm, design, plan feature, think through
Evidence:     Level 5 (User approval at each chunk)

Next Skill:   prism-sp-planning (SP.1.2)
Resources:    F-PSI-001 selects optimal skills/agents/formulas
Integrates:   prism-sp-planning, prism-sp-execution, prism-combination-engine, prism-expert-*
```

---

**END OF SKILL DOCUMENT**

