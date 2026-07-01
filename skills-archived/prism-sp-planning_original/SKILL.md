---
name: prism-sp-planning
description: |
  Detailed task planning with exact paths, code outlines, and 2-5 minute tasks.
  Use when: plan tasks, break down work, create task list, prepare execution.
  Transforms approved designs into executable task lists with zero ambiguity.
  Requires approved brainstorm output. Hands off to prism-sp-execution.
  Part of SP.1 Core Development Workflow.
---
# PRISM-SP-PLANNING
## Detailed Task Planning with Exact Specifications
### Version 1.0 | Development Workflow | ~40KB

---

# SECTION 1: OVERVIEW

## 1.1 Purpose

This skill transforms approved designs from brainstorming into granular, executable task lists. Every task is completable in 2-5 minutes with zero ambiguity - exact paths, exact code structures, exact verification steps. The goal is to enable flawless execution by removing all interpretation from the implementation phase.

## 1.2 When to Use

**Explicit Triggers:**
- When user says "plan this"
- When user says "break down the work"
- When user says "create task list"
- When user says "prepare for execution"
- After brainstorm approval, before implementation

**Contextual Triggers:**
- After receiving approved design from prism-sp-brainstorm
- When task is too large to execute in one step
- When multiple files/components need coordination
- When dependencies need explicit ordering

**NOT for:**
- Design decisions (use prism-sp-brainstorm)
- Actual implementation (use prism-sp-execution)
- Simple single-file tasks (can execute directly)
- Emergency fixes (use prism-sp-debugging)

## 1.3 Prerequisites

**Required State:**
- [ ] Approved scope from brainstorm (Chunk 1 ✓)
- [ ] Approved approach from brainstorm (Chunk 2 ✓)
- [ ] Approved details from brainstorm (Chunk 3 ✓)

**Required Information:**
- What will be created/modified
- Technical approach decided
- File paths identified
- Size estimates available

## 1.4 Outputs

**Primary Outputs:**
- Ordered task list with 2-5 minute tasks
- Exact paths for every file operation
- Code outlines for every creation task
- Checkpoint schedule
- Dependency map

**Secondary Outputs:**
- Time estimates per task and total
- Risk identification
- Verification criteria per task

**State Changes:**
- currentTask updated with plan details
- Ready for prism-sp-execution handoff

## 1.5 Key Principles

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           PLANNING PRINCIPLES                                            │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  PRINCIPLE 1: ZERO AMBIGUITY                                                            │
│  ─────────────────────────────                                                          │
│  Every task must be executable without asking questions.                                │
│  If you need to interpret → the plan is incomplete.                                     │
│                                                                                         │
│  PRINCIPLE 2: 2-5 MINUTE TASKS                                                          │
│  ─────────────────────────────                                                          │
│  No task should take longer than 5 minutes.                                             │
│  If longer → break it down further.                                                     │
│  If shorter than 2 minutes → consider combining.                                        │
│                                                                                         │
│  PRINCIPLE 3: EXACT PATHS                                                               │
│  ─────────────────────────────                                                          │
│  Full paths, not relative. No "somewhere in the project."                               │
│  Example: C:\PRISM...\EXTRACTED\materials\steel_1045.json                       │
│                                                                                         │
│  PRINCIPLE 4: CODE OUTLINES INCLUDED                                                    │
│  ─────────────────────────────                                                          │
│  Skeleton code in the plan, not just descriptions.                                      │
│  Execution should be "fill in the blanks" not "figure it out."                          │
│                                                                                         │
│  PRINCIPLE 5: DEPENDENCY-FIRST ORDERING                                                 │
│  ─────────────────────────────                                                          │
│  Tasks ordered by what must exist before what.                                          │
│  Blocked tasks clearly marked with blockers listed.                                     │
│                                                                                         │
│  PRINCIPLE 6: BUILT-IN CHECKPOINTS                                                      │
│  ─────────────────────────────                                                          │
│  Checkpoint every 3-5 tasks.                                                            │
│  Checkpoint = save state + verify progress + can stop safely.                           │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

# SECTION 2: THE PROCESS

## 2.1 Quick Reference Checklist

```
☐ STEP 1: RECEIVE - Accept approved design from brainstorm
☐ STEP 2: RESOURCES - Select optimal resources via F-PSI-001 (Combination Engine)
☐ STEP 3: DECOMPOSE - Break into atomic tasks
☐ STEP 4: SPECIFY - Add exact paths, sizes, code outlines
☐ STEP 5: ORDER - Arrange by dependencies
☐ STEP 6: CHECKPOINT - Insert save points every 3-5 tasks
☐ STEP 7: VALIDATE - Review plan completeness
☐ VERIFY: All tasks have paths, outlines, verification criteria + optimal resources assigned
```

## 2.2 Detailed Process

### Step 1: RECEIVE

**Purpose:** Accept and validate approved design input

**Duration:** 1-2 minutes

**Actions:**
1. Confirm all 3 brainstorm chunks were approved
2. Extract key deliverables from approved design
3. Note any constraints or preferences mentioned
4. Identify the scope boundaries

**Input Validation Checklist:**
- [ ] Scope clearly defined (what's included/excluded)
- [ ] Approach decided (how it will be done)
- [ ] Details specified (paths, structures, patterns)
- [ ] User gave explicit approval

**If Input Incomplete:**
- Return to prism-sp-brainstorm
- Get missing approvals before planning

**Verification:**
- [ ] All 3 chunks documented
- [ ] Clear deliverables list
- [ ] Boundaries understood

---

### Step 2: RESOURCES (NEW - v2.0)

**Purpose:** Select optimal resources via F-PSI-001 Combination Engine

**Duration:** 2-3 minutes

**Actions:**
1. Load RESOURCE_REGISTRY.json (691 catalogued resources)
2. Load CAPABILITY_MATRIX.json (fuzzy matching scores)
3. Load SYNERGY_MATRIX.json (pairwise interactions)
4. Execute F-PSI-001: Ψ(T,R) = Σ Cap(ri,T) × w_i + Σ Syn(ri,rj) - Σ Cost(ri)
5. Receive optimal resource set R* with proof certificate

**F-PSI-001 Integration:**
```
INPUT:
  - Task requirements from brainstorm (deliverables, complexity)
  - Available resources: 99 skills, 64 agents, 22 formulas, 32+ coefficients, 147 hooks

OUTPUT:
  - Optimal resource selection R* (skills + agents + formulas)
  - Capability coverage score
  - Synergy bonus calculation
  - Optimality proof (Lagrangian certificate)
```

**Resource Selection Criteria:**

| Task Type | Recommended Resources |
|-----------|----------------------|
| Material work | prism-material-schema, prism-material-physics, materials_scientist agent |
| Code creation | prism-code-master, prism-coding-patterns, coder agent |
| Extraction | prism-monolith-extractor, monolith_navigator agent |
| Physics calc | F-PHYS-001/002/003, physics_validator agent |
| Planning | F-PLAN-001 through F-PLAN-005, estimator agent |
| Coordination | prism-combination-engine, combination_optimizer agent |

**Verification:**
- [ ] Optimal resources selected via F-PSI-001
- [ ] Coverage score >= 0.80
- [ ] Synergy effects calculated
- [ ] Resources documented for execution phase

---

### Step 3: DECOMPOSE

**Purpose:** Break approved design into atomic tasks

**Duration:** 3-5 minutes

**Actions:**
1. List all deliverables (files, changes, outputs)
2. For each deliverable, identify discrete actions
3. Split any action >5 minutes into smaller tasks
4. Combine any action <2 minutes with related tasks

**Decomposition Rules:**

```
DELIVERABLE → TASKS

One file creation:
├── Task: Create file with structure
├── Task: Add content section A
├── Task: Add content section B
└── Task: Verify and finalize

One file modification:
├── Task: Read and understand current state
├── Task: Make change A
├── Task: Make change B
└── Task: Verify changes

Multi-file feature:
├── Task: Create file 1
├── Task: Create file 2
├── Task: Wire files together
└── Task: Verify integration
```

**Task Sizing Guide:**

| Task Type | Typical Size | If Larger |
|-----------|--------------|-----------|
| Create small file (<100 lines) | 3-5 min | OK as single task |
| Create medium file (100-300 lines) | Split | 2-3 tasks |
| Create large file (300+ lines) | Split | 3-5+ tasks |
| Modify existing file | 2-4 min | Usually OK |
| Extract from monolith | 3-5 min | Per module |
| Wire consumer | 2-3 min | Per consumer |
| Validate/verify | 2-3 min | Per component |

**Verification:**
- [ ] All deliverables have tasks
- [ ] No task exceeds 5 minutes
- [ ] No task under 2 minutes (unless necessary)

---

### Step 4: SPECIFY

**Purpose:** Add exact details to every task

**Duration:** 5-10 minutes

**Actions:**
1. Add full path for every file operation
2. Add size estimate (lines, KB) for every creation
3. Add code outline for every creation task
4. Add verification criteria for every task

**Specification Requirements:**

| Field | Required | Example |
|-------|----------|---------|
| Task ID | ✓ | T1, T2, T3... |
| Task Name | ✓ | "Create material template" |
| Type | ✓ | create / modify / extract / wire / validate |
| Path | ✓ | Full path with filename |
| Size | ✓ for create | ~150 lines, ~8KB |
| Time | ✓ | 3 minutes |
| Dependencies | ✓ | T1, T2 or "none" |
| Description | ✓ | 1-2 sentences |
| Code Outline | ✓ for create | Skeleton structure |
| Verification | ✓ | How to confirm done |

**Code Outline Depth:**
- Show structure (sections, functions, classes)
- Show key signatures and parameters
- Show data structures/schemas
- Do NOT write full implementation

**Verification:**
- [ ] Every task has full path
- [ ] Every create task has code outline
- [ ] Every task has verification criteria
- [ ] Time estimates are realistic

---

### Step 5: ORDER

**Purpose:** Arrange tasks by dependencies

**Duration:** 2-3 minutes

**Actions:**
1. Identify what each task depends on
2. Build dependency graph
3. Order tasks so dependencies come first
4. Mark any blocked tasks

**Dependency Types:**

```
FILE DEPENDENCY:
Task B needs file created in Task A
→ A must complete before B starts

DATA DEPENDENCY:
Task B uses output from Task A
→ A must complete before B starts

LOGICAL DEPENDENCY:
Task B builds on concepts from Task A
→ A should complete before B for clarity

NO DEPENDENCY:
Tasks can run in any order
→ Group related tasks together
```

**Ordering Algorithm:**
1. Find tasks with no dependencies → these go first
2. Find tasks depending only on first group → these go second
3. Continue until all tasks ordered
4. Circular dependencies = planning error, break the cycle

**Blocked Task Notation:**
```
TASK T5: Wire material consumer
BLOCKED BY: T2, T3 (material files must exist first)
```

**Verification:**
- [ ] All dependencies identified
- [ ] No task scheduled before its dependencies
- [ ] Blocked tasks clearly marked
- [ ] No circular dependencies

---

### Step 5: CHECKPOINT

**Purpose:** Insert save points for safe interruption

**Duration:** 1-2 minutes

**Actions:**
1. Insert checkpoint every 3-5 tasks
2. Ensure checkpoints are at logical boundaries
3. Define what to verify at each checkpoint
4. Define what to save at each checkpoint

**Checkpoint Placement Rules:**

```
GOOD CHECKPOINT LOCATIONS:
✓ After completing a logical unit (one file done)
✓ After all dependencies for next phase resolved
✓ At natural pause points
✓ Before risky/complex operations

BAD CHECKPOINT LOCATIONS:
✗ Mid-file (half-written content)
✗ Between tightly coupled operations
✗ Right before trivial tasks
```

**Checkpoint Format:**
```
═══ CHECKPOINT [N] after T[X] ═══
Completed: T1, T2, T3, T4, T5
Verify:
☐ [File 1] exists at [path], ~[size]
☐ [File 2] exists at [path], ~[size]
☐ No syntax errors
Save: Update CURRENT_STATE.json with progress
Next: T6, T7, T8...
═════════════════════════════════
```

**Verification:**
- [ ] Checkpoint every 3-5 tasks
- [ ] Checkpoints at logical boundaries
- [ ] Each checkpoint has verification steps
- [ ] Each checkpoint has save instructions

---

### Step 6: VALIDATE

**Purpose:** Review plan for completeness

**Duration:** 2-3 minutes

**Actions:**
1. Walk through plan mentally
2. Check for gaps or ambiguities
3. Verify all deliverables covered
4. Confirm plan matches approved design

**Validation Checklist:**

```
COMPLETENESS:
☐ All deliverables from brainstorm have tasks
☐ All tasks have required fields filled
☐ No placeholder text remaining
☐ No "TBD" or "figure out later"

EXECUTABILITY:
☐ Can execute task 1 right now without questions
☐ Each task leads clearly to the next
☐ Verification criteria are testable

SAFETY:
☐ Checkpoints allow safe interruption
☐ No irreversible actions without verification
☐ Rollback possible at each checkpoint

ALIGNMENT:
☐ Plan matches approved scope
☐ Plan matches approved approach
☐ Plan matches approved details
☐ No scope creep introduced
```

**If Validation Fails:**
- Identify the gap
- Add missing specifications
- Re-validate

**Verification:**
- [ ] All checks pass
- [ ] Plan is ready for execution
- [ ] Can hand off to prism-sp-execution

---

## 2.3 Process Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           PLANNING WORKFLOW                                              │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  FROM BRAINSTORM                                                                        │
│        │                                                                                │
│        ▼                                                                                │
│  ┌───────────────────┐                                                                  │
│  │ STEP 1: RECEIVE   │                                                                  │
│  │ Approved design   │                                                                  │
│  └─────────┬─────────┘                                                                  │
│            │                                                                            │
│            ▼                                                                            │
│  ┌───────────────────┐     ┌─────────────────────────────────────────────┐              │
│  │ STEP 2: DECOMPOSE │     │ Deliverable → Tasks                        │              │
│  │ Break into tasks  │────▶│ • File 1 → Create, populate, verify        │              │
│  └─────────┬─────────┘     │ • File 2 → Create, populate, verify        │              │
│            │               │ • Integration → Wire, test                 │              │
│            │               └─────────────────────────────────────────────┘              │
│            ▼                                                                            │
│  ┌───────────────────┐     ┌─────────────────────────────────────────────┐              │
│  │ STEP 3: SPECIFY   │     │ Task Card:                                 │              │
│  │ Add exact details │────▶│ • ID, Name, Type                           │              │
│  └─────────┬─────────┘     │ • Path, Size, Time                         │              │
│            │               │ • Code Outline                             │              │
│            │               │ • Verification                             │              │
│            │               └─────────────────────────────────────────────┘              │
│            ▼                                                                            │
│  ┌───────────────────┐     ┌─────────────────────────────────────────────┐              │
│  │ STEP 4: ORDER     │     │ T1 (no deps)                               │              │
│  │ By dependencies   │────▶│ T2 (no deps)                               │              │
│  └─────────┬─────────┘     │ T3 (needs T1)                              │              │
│            │               │ T4 (needs T1, T2)                          │              │
│            │               └─────────────────────────────────────────────┘              │
│            ▼                                                                            │
│  ┌───────────────────┐     ┌─────────────────────────────────────────────┐              │
│  │ STEP 5: CHECKPOINT│     │ T1, T2, T3 ──▶ CHECKPOINT 1                │              │
│  │ Insert save points│────▶│ T4, T5, T6 ──▶ CHECKPOINT 2                │              │
│  └─────────┬─────────┘     │ T7, T8     ──▶ FINAL                       │              │
│            │               └─────────────────────────────────────────────┘              │
│            ▼                                                                            │
│  ┌───────────────────┐                                                                  │
│  │ STEP 6: VALIDATE  │                                                                  │
│  │ Review & confirm  │                                                                  │
│  └─────────┬─────────┘                                                                  │
│            │                                                                            │
│            ▼                                                                            │
│  TO EXECUTION                                                                           │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```



---

# SECTION 3: TASK TEMPLATES

## 3.1 Universal Task Card Format

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ TASK [ID]: [Name]                                                                       │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Type:     [create | modify | extract | wire | validate]                                 │
│ Path:     [Full path including filename]                                                │
│ Size:     ~[X] lines, ~[Y]KB                                                            │
│ Time:     [N] minutes                                                                   │
│ Depends:  [Task IDs] or "none"                                                          │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Description:                                                                            │
│ [1-2 sentences explaining what to do]                                                   │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Code Outline:                                                                           │
│ [Skeleton code or structure - enough to execute without interpretation]                 │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Verification:                                                                           │
│ ☐ [Specific check 1]                                                                    │
│ ☐ [Specific check 2]                                                                    │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 3.2 Task Type: CREATE

**Use When:** Creating a new file from scratch

**Template:**
```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ TASK T[N]: Create [filename]                                                            │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Type:     create                                                                        │
│ Path:     C:\\PRISM\[subpath]\[filename]           │
│ Size:     ~[X] lines, ~[Y]KB                                                            │
│ Time:     [N] minutes                                                                   │
│ Depends:  [dependencies or "none"]                                                      │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Description:                                                                            │
│ Create [filename] containing [what]. This file will [purpose].                          │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Code Outline:                                                                           │
│ ```[language]                                                                           │
│ // [Section 1 name]                                                                     │
│ [structure/signature]                                                                   │
│                                                                                         │
│ // [Section 2 name]                                                                     │
│ [structure/signature]                                                                   │
│                                                                                         │
│ // [Section 3 name]                                                                     │
│ [structure/signature]                                                                   │
│ ```                                                                                     │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Verification:                                                                           │
│ ☐ File exists at specified path                                                         │
│ ☐ File size approximately [Y]KB                                                         │
│ ☐ Contains all sections from outline                                                    │
│ ☐ No syntax errors                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

**Example - Create JavaScript Module:**
```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ TASK T3: Create STEEL_1045_MATERIAL.js                                                  │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Type:     create                                                                        │
│ Path:     C:\PRISM...\EXTRACTED\materials\enhanced\STEEL_1045_MATERIAL.js       │
│ Size:     ~180 lines, ~12KB                                                             │
│ Time:     4 minutes                                                                     │
│ Depends:  T1 (template), T2 (directory)                                                 │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Description:                                                                            │
│ Create enhanced material file for AISI 1045 carbon steel with all 127 parameters.      │
│ This provides complete cutting data for the speed/feed calculator.                      │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Code Outline:                                                                           │
│ ```javascript                                                                           │
│ // PRISM Material: AISI 1045 Carbon Steel                                               │
│ const STEEL_1045 = {                                                                    │
│   // Section 1: Identification                                                          │
│   id: "STEEL_1045",                                                                     │
│   name: "AISI 1045 Carbon Steel",                                                       │
│   category: "carbon_steel",                                                             │
│                                                                                         │
│   // Section 2: Physical Properties                                                     │
│   physical: {                                                                           │
│     density: 7850,        // kg/m³                                                      │
│     hardness: { hb: 180, hrc: null },                                                   │
│     // ... thermal, elastic properties                                                  │
│   },                                                                                    │
│                                                                                         │
│   // Section 3: Cutting Parameters (Kienzle)                                            │
│   cutting: {                                                                            │
│     kc1_1: 1820,          // N/mm²                                                      │
│     mc: 0.26,                                                                           │
│     // ... by operation type                                                            │
│   },                                                                                    │
│                                                                                         │
│   // Section 4: Tool Recommendations                                                    │
│   tooling: { /* grades, coatings, geometries */ },                                      │
│                                                                                         │
│   // Section 5: Metadata                                                                │
│   meta: { sources: [], confidence: 0.95 }                                               │
│ };                                                                                      │
│ export default STEEL_1045;                                                              │
│ ```                                                                                     │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Verification:                                                                           │
│ ☐ File exists at .../materials/enhanced/STEEL_1045_MATERIAL.js                          │
│ ☐ File ~12KB                                                                            │
│ ☐ All 5 sections present                                                                │
│ ☐ kc1_1 value is 1820 (verified from handbook)                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 3.3 Task Type: MODIFY

**Use When:** Changing an existing file

**Template:**
```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ TASK T[N]: Modify [filename] - [change description]                                     │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Type:     modify                                                                        │
│ Path:     [Full path to existing file]                                                  │
│ Change:   +[X] lines / -[Y] lines / ~[Z] lines modified                                 │
│ Time:     [N] minutes                                                                   │
│ Depends:  [dependencies]                                                                │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Description:                                                                            │
│ Modify [filename] to [what change]. This enables [purpose].                             │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Current State:                                                                          │
│ ```                                                                                     │
│ [relevant portion of current file]                                                      │
│ ```                                                                                     │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Target State:                                                                           │
│ ```                                                                                     │
│ [what it should look like after]                                                        │
│ ```                                                                                     │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Verification:                                                                           │
│ ☐ Change applied correctly                                                              │
│ ☐ Surrounding code undamaged                                                            │
│ ☐ File still valid (no syntax errors)                                                   │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

**Example - Modify Configuration:**
```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ TASK T7: Modify MATERIAL_INDEX.js - Add steel_1045 entry                                │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Type:     modify                                                                        │
│ Path:     C:\PRISM...\EXTRACTED\materials\MATERIAL_INDEX.js                     │
│ Change:   +3 lines                                                                      │
│ Time:     2 minutes                                                                     │
│ Depends:  T3 (steel_1045 file must exist)                                               │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Description:                                                                            │
│ Add STEEL_1045 import and export to material index so consumers can access it.          │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Current State (lines 15-20):                                                            │
│ ```javascript                                                                           │
│ import STEEL_1020 from './enhanced/STEEL_1020_MATERIAL.js';                             │
│ import STEEL_1040 from './enhanced/STEEL_1040_MATERIAL.js';                             │
│ // ... more imports                                                                     │
│ export { STEEL_1020, STEEL_1040, /* ... */ };                                           │
│ ```                                                                                     │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Target State:                                                                           │
│ ```javascript                                                                           │
│ import STEEL_1020 from './enhanced/STEEL_1020_MATERIAL.js';                             │
│ import STEEL_1040 from './enhanced/STEEL_1040_MATERIAL.js';                             │
│ import STEEL_1045 from './enhanced/STEEL_1045_MATERIAL.js';  // NEW                     │
│ // ... more imports                                                                     │
│ export { STEEL_1020, STEEL_1040, STEEL_1045, /* ... */ };    // UPDATED                 │
│ ```                                                                                     │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Verification:                                                                           │
│ ☐ Import line added in alphabetical position                                            │
│ ☐ Export includes STEEL_1045                                                            │
│ ☐ No duplicate entries                                                                  │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 3.4 Task Type: EXTRACT

**Use When:** Pulling code/data from the monolith

**Template:**
```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ TASK T[N]: Extract [module name] from monolith                                          │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Type:     extract                                                                       │
│ Source:   [Monolith path] lines [start]-[end]                                           │
│ Target:   [Output path]                                                                 │
│ Size:     ~[X] lines, ~[Y]KB                                                            │
│ Time:     [N] minutes                                                                   │
│ Depends:  [dependencies]                                                                │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Description:                                                                            │
│ Extract [module] from monolith. Located at lines [X]-[Y]. Contains [what].              │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Extraction Notes:                                                                       │
│ • Start marker: [how to find start]                                                     │
│ • End marker: [how to find end]                                                         │
│ • Dependencies to include: [list]                                                       │
│ • Dependencies to leave: [list]                                                         │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Post-Extraction Modifications:                                                          │
│ • [Change 1: e.g., update imports]                                                      │
│ • [Change 2: e.g., add exports]                                                         │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Verification:                                                                           │
│ ☐ All code from lines [X]-[Y] captured                                                  │
│ ☐ Imports updated for standalone use                                                    │
│ ☐ Exports added                                                                         │
│ ☐ No syntax errors in extracted file                                                    │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

**Example - Extract Engine:**
```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ TASK T12: Extract KIENZLE_FORCE_ENGINE from monolith                                    │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Type:     extract                                                                       │
│ Source:   C:\...\PRISM_v8_89_002.html lines 45230-45890                                 │
│ Target:   C:\PRISM...\EXTRACTED\engines\physics\KIENZLE_FORCE_ENGINE.js         │
│ Size:     ~660 lines, ~35KB                                                             │
│ Time:     5 minutes                                                                     │
│ Depends:  none                                                                          │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Description:                                                                            │
│ Extract Kienzle cutting force calculation engine. Core physics engine used by           │
│ speed/feed calculator and tool life predictor.                                          │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Extraction Notes:                                                                       │
│ • Start marker: "// ═══ KIENZLE FORCE ENGINE ═══"                                       │
│ • End marker: "// ═══ END KIENZLE FORCE ENGINE ═══"                                     │
│ • Dependencies to include: unit conversion helpers (inline)                             │
│ • Dependencies to leave: material lookups (will wire separately)                        │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Post-Extraction Modifications:                                                          │
│ • Add: import { getMaterial } from '../materials/MATERIAL_INDEX.js';                    │
│ • Add: export { calculateKienzleForce, calculateSpecificForce };                        │
│ • Remove: inline material data (use import instead)                                     │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Verification:                                                                           │
│ ☐ File created at target path                                                           │
│ ☐ All functions present: calculateKienzleForce, calculateSpecificForce, etc.            │
│ ☐ Material lookup converted to import                                                   │
│ ☐ No hardcoded material data remaining                                                  │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 3.5 Task Type: WIRE

**Use When:** Connecting a database/engine to consumers

**Template:**
```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ TASK T[N]: Wire [source] to [consumer]                                                  │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Type:     wire                                                                          │
│ Source:   [Database/engine path]                                                        │
│ Consumer: [Consumer module path]                                                        │
│ Change:   ~[X] lines in consumer                                                        │
│ Time:     [N] minutes                                                                   │
│ Depends:  [source task], [consumer task]                                                │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Description:                                                                            │
│ Wire [source] to [consumer] so [consumer] uses [source] data instead of [old source].   │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Wiring Pattern:                                                                         │
│ ```javascript                                                                           │
│ // Add import                                                                           │
│ import { [functions/data] } from '[source path]';                                       │
│                                                                                         │
│ // Replace usage                                                                        │
│ // OLD: const data = hardcodedData[id];                                                 │
│ // NEW: const data = getFromSource(id);                                                 │
│ ```                                                                                     │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Verification:                                                                           │
│ ☐ Import added to consumer                                                              │
│ ☐ Old data source removed/commented                                                     │
│ ☐ Consumer uses new source                                                              │
│ ☐ Consumer still functions correctly                                                    │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 3.6 Task Type: VALIDATE

**Use When:** Verifying work is complete and correct

**Template:**
```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ TASK T[N]: Validate [component/feature]                                                 │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Type:     validate                                                                      │
│ Target:   [What to validate]                                                            │
│ Time:     [N] minutes                                                                   │
│ Depends:  [all tasks being validated]                                                   │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Description:                                                                            │
│ Validate that [component] is complete, correct, and integrated properly.                │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Validation Checks:                                                                      │
│ ☐ [Check 1: Existence] - File(s) exist at expected paths                                │
│ ☐ [Check 2: Size] - Files are expected sizes                                            │
│ ☐ [Check 3: Content] - Key content present                                              │
│ ☐ [Check 4: Integration] - Wiring complete                                              │
│ ☐ [Check 5: Function] - Component works as expected                                     │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Evidence to Capture:                                                                    │
│ • File listing showing paths and sizes                                                  │
│ • Sample content verification                                                           │
│ • Integration test result                                                               │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ If Validation Fails:                                                                    │
│ • Document which check failed                                                           │
│ • Identify root cause                                                                   │
│ • Create fix task before proceeding                                                     │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

# SECTION 4: TIME ESTIMATION

## 4.1 Base Time by Task Type

| Task Type | Base Time | Notes |
|-----------|-----------|-------|
| **create** (small, <100 lines) | 3 min | Single focused file |
| **create** (medium, 100-300 lines) | 5 min per chunk | Split into chunks |
| **create** (large, 300+ lines) | 5 min per chunk | Multiple chunks required |
| **modify** (small change) | 2 min | <10 lines changed |
| **modify** (medium change) | 3 min | 10-50 lines changed |
| **modify** (large change) | 5 min | >50 lines changed |
| **extract** | 4 min | Per module |
| **wire** | 3 min | Per consumer |
| **validate** | 2 min | Per component |

## 4.2 Complexity Multipliers

Apply these multipliers to base time:

| Factor | Multiplier | When to Apply |
|--------|------------|---------------|
| **New pattern** | 1.5x | First time using a pattern |
| **Complex logic** | 1.3x | Algorithms, calculations |
| **Many dependencies** | 1.2x | >3 dependencies |
| **Unfamiliar code** | 1.4x | Code not seen before |
| **Error-prone area** | 1.3x | History of issues |
| **Critical path** | 1.2x | Blocking other work |

## 4.3 Buffer Rules

```
BUFFER ALLOCATION:

Per-task buffer:     +20% (built into estimates)
Per-checkpoint:      +2 minutes (for save/verify)
End-of-plan buffer:  +15% of total (unexpected issues)

EXAMPLE:
Raw tasks:           45 minutes
Per-task buffer:     +9 minutes (20%)
Checkpoints (3):     +6 minutes
End buffer:          +9 minutes (15%)
────────────────────────────────
Total estimate:      69 minutes
```

## 4.4 Time Estimation Formula

```
Task Time = Base Time × Complexity Multiplier × (1 + Buffer%)

Plan Time = Σ(Task Times) + (Checkpoints × 2 min) + (Total × 15%)
```

## 4.5 Estimation Examples

**Example 1: Create Material File**
```
Base: 3 min (small create)
Multipliers: 1.0 (standard pattern)
Buffer: 20%
─────────────────
Task Time: 3 × 1.0 × 1.2 = 3.6 min ≈ 4 min
```

**Example 2: Extract Complex Engine**
```
Base: 4 min (extract)
Multipliers: 1.3 (complex logic) × 1.2 (many deps) = 1.56
Buffer: 20%
─────────────────
Task Time: 4 × 1.56 × 1.2 = 7.5 min ≈ 8 min
```

**Example 3: Full Plan (10 tasks)**
```
Tasks: T1(3) + T2(4) + T3(4) + T4(3) + T5(5) + T6(3) + T7(2) + T8(4) + T9(3) + T10(2) = 33 min
Checkpoints: 2 × 2 min = 4 min
End buffer: 33 × 0.15 = 5 min
─────────────────
Total: 33 + 4 + 5 = 42 minutes
```

## 4.6 Red Flags in Estimates

| Red Flag | Problem | Solution |
|----------|---------|----------|
| Single task >5 min | Task too large | Break into smaller tasks |
| Total >60 min | Plan too ambitious | Split into multiple sessions |
| No buffer | Overconfident | Add 20% minimum |
| All tasks same time | Lazy estimation | Estimate each individually |
| Multipliers ignored | Underestimating complexity | Apply relevant multipliers |



---

# SECTION 5: DEPENDENCY MAPPING

## 5.1 Dependency Types

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           DEPENDENCY TYPES                                               │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  TYPE 1: FILE DEPENDENCY                                                                │
│  ────────────────────────                                                               │
│  Task B needs a file that Task A creates.                                               │
│  Example: T5 (wire material) needs T3 (create material file)                            │
│  Notation: T5 → T3                                                                      │
│                                                                                         │
│  TYPE 2: DATA DEPENDENCY                                                                │
│  ────────────────────────                                                               │
│  Task B uses data/output from Task A.                                                   │
│  Example: T8 (validate) needs output from T6 and T7                                     │
│  Notation: T8 → T6, T7                                                                  │
│                                                                                         │
│  TYPE 3: LOGICAL DEPENDENCY                                                             │
│  ────────────────────────                                                               │
│  Task B builds on understanding from Task A.                                            │
│  Example: T4 (populate section B) after T3 (populate section A)                         │
│  Notation: T4 ~> T3 (soft dependency)                                                   │
│                                                                                         │
│  TYPE 4: STRUCTURAL DEPENDENCY                                                          │
│  ────────────────────────                                                               │
│  Task B needs directory/structure from Task A.                                          │
│  Example: T2 (create file) needs T1 (create directory)                                  │
│  Notation: T2 → T1                                                                      │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 5.2 Dependency Discovery Process

### Step 1: List All Tasks
```
T1: Create materials directory
T2: Create material template
T3: Create STEEL_1045 file
T4: Create STEEL_4140 file
T5: Create material index
T6: Wire to speed/feed calculator
T7: Validate materials
```

### Step 2: For Each Task, Ask "What Must Exist First?"

| Task | Needs | Dependency |
|------|-------|------------|
| T1 | Nothing | none |
| T2 | Directory | T1 |
| T3 | Template, directory | T1, T2 |
| T4 | Template, directory | T1, T2 |
| T5 | Material files | T3, T4 |
| T6 | Index | T5 |
| T7 | Everything | T6 |

### Step 3: Build Dependency Graph

```
T1 (directory)
├──▶ T2 (template)
│    ├──▶ T3 (steel_1045)
│    │    └──▶ T5 (index)
│    │         └──▶ T6 (wire)
│    │              └──▶ T7 (validate)
│    └──▶ T4 (steel_4140)
│         └──▶ T5 (index)
```

### Step 4: Determine Execution Order

**Level 0 (no dependencies):** T1
**Level 1 (depends on L0):** T2
**Level 2 (depends on L1):** T3, T4 (can run in parallel)
**Level 3 (depends on L2):** T5
**Level 4 (depends on L3):** T6
**Level 5 (depends on L4):** T7

**Final Order:** T1 → T2 → T3 → T4 → T5 → T6 → T7

## 5.3 Handling Circular Dependencies

**Detection:**
If Task A needs Task B AND Task B needs Task A → Circular dependency

**Resolution Strategies:**

```
STRATEGY 1: BREAK THE CYCLE
─────────────────────────────
Original: A needs B, B needs A
Fix: Extract common element C
New: A needs C, B needs C
Order: C → A → B (or C → B → A)

STRATEGY 2: STUB FIRST
─────────────────────────────
Original: A needs B's interface, B needs A's data
Fix: Create stub/interface first
Order: A-stub → B → A-complete

STRATEGY 3: REDEFINE SCOPE
─────────────────────────────
Original: Circular due to bad decomposition
Fix: Merge into single task or redefine boundaries
```

**Example - Breaking a Cycle:**
```
PROBLEM:
T3 (material file) needs T5 (index for validation)
T5 (index) needs T3 (to list materials)

SOLUTION:
T3a: Create material file (without validation)
T5: Create index (lists T3a)
T3b: Add validation to material file (uses T5)

NEW ORDER: T3a → T5 → T3b
```

## 5.4 Dependency Notation in Plans

**In Task Cards:**
```
│ Depends:  T1, T2              │  ← Hard dependencies (must complete)
│ Suggests: T3                  │  ← Soft dependencies (helpful if done)
│ Blocks:   T5, T6              │  ← What this task unblocks
```

**In Plan Overview:**
```
DEPENDENCY MAP:
───────────────
T1 ──┬──▶ T2 ──┬──▶ T3 ──▶ T5 ──▶ T6 ──▶ T7
     │         └──▶ T4 ──┘
     │
     └──▶ T8 (independent branch)

CRITICAL PATH: T1 → T2 → T3 → T5 → T6 → T7 (6 tasks, ~25 min)
PARALLEL WORK: T4, T8 can run alongside critical path
```

## 5.5 Blocked Task Handling

**Marking Blocked Tasks:**
```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ TASK T6: Wire materials to calculator                                                   │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ ⚠️ BLOCKED - Cannot start until:                                                        │
│ • T3 (STEEL_1045) - IN PROGRESS                                                         │
│ • T4 (STEEL_4140) - PENDING                                                             │
│ • T5 (index) - PENDING                                                                  │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ UNBLOCKS: T7 (validation)                                                               │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

**Tracking Blockers:**
```
BLOCKER STATUS:
──────────────────────────────────────────────────────────
Task    Status        Blocked By    Unblocks
──────────────────────────────────────────────────────────
T1      ✅ DONE       -             T2, T8
T2      ✅ DONE       T1            T3, T4
T3      🔄 ACTIVE     T2            T5
T4      ⏳ PENDING    T2            T5
T5      🚫 BLOCKED    T3, T4        T6
T6      🚫 BLOCKED    T5            T7
T7      🚫 BLOCKED    T6            -
T8      ⏳ PENDING    T1            -
──────────────────────────────────────────────────────────
```

---

# SECTION 6: CODE OUTLINE PATTERNS

## 6.1 Purpose of Code Outlines

Code outlines provide enough structure that execution becomes "fill in the blanks" rather than "figure it out." They should include:
- Overall structure (sections, functions, classes)
- Key signatures with parameters
- Data structure shapes
- Critical comments for guidance
- Placeholder markers for content

## 6.2 JavaScript Module Outline

```javascript
// ═══════════════════════════════════════════════════════════════════════════
// [MODULE NAME]
// [Brief description]
// ═══════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1: IMPORTS
// ─────────────────────────────────────────────────────────────────────────────
import { /* dependencies */ } from '[path]';

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2: CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const CONFIG = {
  // [constant 1]: [value],
  // [constant 2]: [value],
};

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3: DATA STRUCTURES
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @typedef {Object} [TypeName]
 * @property {[type]} [propName] - [description]
 */

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4: CORE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────
/**
 * [Function description]
 * @param {[type]} [param] - [description]
 * @returns {[type]} [description]
 */
function [functionName]([params]) {
  // TODO: Implement
  // Step 1: [what]
  // Step 2: [what]
  // Step 3: [what]
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5: EXPORTS
// ─────────────────────────────────────────────────────────────────────────────
export {
  [functionName],
  [otherExports],
};

export default [mainExport];
```

## 6.3 JSON Data File Outline

```json
{
  "_metadata": {
    "type": "[data type]",
    "version": "1.0.0",
    "created": "[ISO date]",
    "description": "[what this data represents]"
  },
  
  "section1_name": {
    "field1": "[value or type placeholder]",
    "field2": "[value or type placeholder]",
    "nested": {
      "subfield1": "[value]",
      "subfield2": "[value]"
    }
  },
  
  "section2_name": [
    {
      "id": "[unique identifier]",
      "property1": "[value]",
      "property2": "[value]"
    }
  ],
  
  "section3_name": {
    "// TODO": "Fill with [what data]"
  }
}
```

## 6.4 Material Database Entry Outline

```javascript
// ═══════════════════════════════════════════════════════════════════════════
// PRISM Material: [MATERIAL NAME]
// Category: [category]
// ═══════════════════════════════════════════════════════════════════════════

const [MATERIAL_ID] = {
  // ─────────────────────────────────────────────────────────────────────────
  // IDENTIFICATION (5 fields)
  // ─────────────────────────────────────────────────────────────────────────
  id: "[MATERIAL_ID]",
  name: "[Full Material Name]",
  category: "[category]",
  subcategory: "[subcategory]",
  alternateNames: ["[alias1]", "[alias2]"],

  // ─────────────────────────────────────────────────────────────────────────
  // PHYSICAL PROPERTIES (15 fields)
  // ─────────────────────────────────────────────────────────────────────────
  physical: {
    density: 0,                    // kg/m³
    meltingPoint: 0,               // °C
    thermalConductivity: 0,        // W/(m·K)
    specificHeat: 0,               // J/(kg·K)
    thermalExpansion: 0,           // µm/(m·K)
    elasticModulus: 0,             // GPa
    poissonsRatio: 0,              // dimensionless
    // ... [remaining physical properties]
  },

  // ─────────────────────────────────────────────────────────────────────────
  // MECHANICAL PROPERTIES (20 fields)
  // ─────────────────────────────────────────────────────────────────────────
  mechanical: {
    tensileStrength: { min: 0, typ: 0, max: 0, unit: "MPa" },
    yieldStrength: { min: 0, typ: 0, max: 0, unit: "MPa" },
    elongation: { min: 0, typ: 0, max: 0, unit: "%" },
    hardness: {
      brinell: { min: 0, typ: 0, max: 0 },
      rockwellC: { min: null, typ: null, max: null },
      vickers: { min: 0, typ: 0, max: 0 }
    },
    // ... [remaining mechanical properties]
  },

  // ─────────────────────────────────────────────────────────────────────────
  // CUTTING PARAMETERS - KIENZLE (25 fields)
  // ─────────────────────────────────────────────────────────────────────────
  cutting: {
    machinability: 0,              // % relative to reference
    kc1_1: 0,                      // N/mm² - specific cutting force
    mc: 0,                         // Kienzle exponent
    
    byOperation: {
      turning: {
        kc1_1: 0, mc: 0,
        speedRange: { min: 0, max: 0, unit: "m/min" },
        feedRange: { min: 0, max: 0, unit: "mm/rev" }
      },
      milling: {
        kc1_1: 0, mc: 0,
        speedRange: { min: 0, max: 0, unit: "m/min" },
        feedRange: { min: 0, max: 0, unit: "mm/tooth" }
      },
      drilling: {
        kc1_1: 0, mc: 0,
        speedRange: { min: 0, max: 0, unit: "m/min" },
        feedRange: { min: 0, max: 0, unit: "mm/rev" }
      }
    }
  },

  // ─────────────────────────────────────────────────────────────────────────
  // JOHNSON-COOK PARAMETERS (12 fields)
  // ─────────────────────────────────────────────────────────────────────────
  johnsonCook: {
    A: 0,                          // MPa - yield stress
    B: 0,                          // MPa - hardening modulus
    n: 0,                          // strain hardening exponent
    C: 0,                          // strain rate coefficient
    m: 0,                          // thermal softening exponent
    refStrainRate: 0,              // 1/s
    meltTemp: 0,                   // °C
    refTemp: 0                     // °C
  },

  // ─────────────────────────────────────────────────────────────────────────
  // TOOL RECOMMENDATIONS (30 fields)
  // ─────────────────────────────────────────────────────────────────────────
  tooling: {
    recommendedGrades: ["[grade1]", "[grade2]"],
    recommendedCoatings: ["[coating1]", "[coating2]"],
    recommendedGeometry: {
      rakeAngle: { min: 0, max: 0, unit: "deg" },
      reliefAngle: { min: 0, max: 0, unit: "deg" },
      noseRadius: { min: 0, max: 0, unit: "mm" }
    },
    avoidMaterials: ["[material1]"],
    coolantRecommendation: "[type]"
  },

  // ─────────────────────────────────────────────────────────────────────────
  // TAYLOR TOOL LIFE (10 fields)
  // ─────────────────────────────────────────────────────────────────────────
  taylorCoefficients: {
    C: 0,                          // Taylor constant
    n: 0,                          // Taylor exponent
    validRange: {
      speedMin: 0,
      speedMax: 0,
      unit: "m/min"
    }
  },

  // ─────────────────────────────────────────────────────────────────────────
  // METADATA (10 fields)
  // ─────────────────────────────────────────────────────────────────────────
  meta: {
    sources: [
      { name: "[source]", year: 0, confidence: 0 }
    ],
    lastUpdated: "[ISO date]",
    version: "1.0.0",
    reviewStatus: "draft",
    overallConfidence: 0
  }
};

export default [MATERIAL_ID];
```

## 6.5 Engine Module Outline

```javascript
// ═══════════════════════════════════════════════════════════════════════════
// PRISM Engine: [ENGINE NAME]
// Category: [Physics | AI/ML | Optimization | etc.]
// ═══════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// IMPORTS
// ─────────────────────────────────────────────────────────────────────────────
import { /* material lookup */ } from '../materials/MATERIAL_INDEX.js';
import { /* machine specs */ } from '../machines/MACHINE_INDEX.js';
import { /* utilities */ } from '../utils/[utility].js';

// ─────────────────────────────────────────────────────────────────────────────
// ENGINE CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────
const ENGINE_CONFIG = {
  name: "[ENGINE NAME]",
  version: "9.0.0",
  category: "[category]",
  
  // Input requirements
  requiredInputs: ["[input1]", "[input2]"],
  optionalInputs: ["[input3]"],
  
  // Output specification
  outputs: ["[output1]", "[output2]"],
  
  // Performance targets
  maxCalculationTime: 500,         // ms
  cacheable: true
};

// ─────────────────────────────────────────────────────────────────────────────
// CORE CALCULATION FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Main calculation function
 * @param {Object} inputs - Calculation inputs
 * @returns {Object} Calculation results with confidence
 */
function calculate(inputs) {
  // Step 1: Validate inputs
  const validated = validateInputs(inputs);
  
  // Step 2: Fetch required data
  // TODO: Get material data
  // TODO: Get machine data
  
  // Step 3: Core calculation
  // TODO: Implement [algorithm name]
  
  // Step 4: Apply corrections
  // TODO: Temperature correction
  // TODO: Tool wear correction
  
  // Step 5: Calculate confidence
  const confidence = calculateConfidence(/* factors */);
  
  // Step 6: Return results
  return {
    result: /* calculated value */,
    confidence: confidence,
    warnings: [],
    meta: {
      calculatedAt: new Date().toISOString(),
      engine: ENGINE_CONFIG.name,
      version: ENGINE_CONFIG.version
    }
  };
}

/**
 * Input validation
 */
function validateInputs(inputs) {
  // TODO: Check required inputs present
  // TODO: Check input ranges
  // TODO: Check input types
}

/**
 * Confidence calculation
 */
function calculateConfidence(factors) {
  // TODO: Implement confidence model
}

// ─────────────────────────────────────────────────────────────────────────────
// SUPPORTING FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

// TODO: Add helper functions as needed

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────
export {
  calculate,
  validateInputs,
  ENGINE_CONFIG
};

export default { calculate, config: ENGINE_CONFIG };
```

## 6.6 Markdown Documentation Outline

```markdown
# [DOCUMENT TITLE]
## [Subtitle/Version]
### [Date/Author if applicable]

---

# SECTION 1: [FIRST MAJOR TOPIC]

## 1.1 [Subtopic]

[Content placeholder - describe what goes here]

## 1.2 [Subtopic]

[Content placeholder]

---

# SECTION 2: [SECOND MAJOR TOPIC]

## 2.1 [Subtopic]

[Content placeholder]

### [Sub-subtopic if needed]

[Content placeholder]

---

# SECTION 3: [THIRD MAJOR TOPIC]

## 3.1 [Subtopic]

| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| [data]   | [data]   | [data]   |

## 3.2 [Subtopic]

```
[Code block placeholder]
```

---

# APPENDIX A: [REFERENCE MATERIAL]

[Reference content]

---

**Document Metadata**
- Version: 1.0.0
- Created: [date]
- Last Updated: [date]
```

## 6.7 Outline Usage Rules

```
RULE 1: MATCH OUTLINE DEPTH TO TASK COMPLEXITY
─────────────────────────────────────────────────
Simple task (2-3 min):   Section headers only
Medium task (3-4 min):   Headers + function signatures
Complex task (5 min):    Full outline with TODOs

RULE 2: INCLUDE ALL CRITICAL DECISIONS
─────────────────────────────────────────────────
If a decision affects implementation, include it.
Don't leave architectural decisions for execution.

RULE 3: MARK TODOS CLEARLY
─────────────────────────────────────────────────
Use consistent markers:
  // TODO: [action]
  // FILL: [data needed]
  // DECIDE: [choice to make]

RULE 4: SHOW DATA SHAPES
─────────────────────────────────────────────────
For data structures, show example with realistic
values, not just type annotations.

RULE 5: INDICATE SOURCES
─────────────────────────────────────────────────
If data comes from specific source, note it:
  kc1_1: 1820,  // Source: Machining Data Handbook p.245
```



---

# SECTION 7: EXAMPLES

## 7.1 Example 1: Planning a Materials Database Task

**Context:**
- Approved design: Create 3 new material files for carbon steels
- Scope: STEEL_1045, STEEL_1050, STEEL_1055 with 127 parameters each
- Approach: Use template, batch create, wire to index

**Complete Plan:**

```
═══════════════════════════════════════════════════════════════════════════════════════════
                    PLAN: Carbon Steel Materials (1045, 1050, 1055)
═══════════════════════════════════════════════════════════════════════════════════════════

OVERVIEW:
─────────
Total Tasks:     8
Estimated Time:  28 minutes
Checkpoints:     2
Critical Path:   T1 → T2 → T3,T4,T5 → T6 → T7 → T8

DEPENDENCY MAP:
───────────────
T1 (verify dir) ──▶ T2 (verify template)
                         │
                    ┌────┼────┐
                    ▼    ▼    ▼
                   T3   T4   T5  (material files - parallel)
                    │    │    │
                    └────┼────┘
                         ▼
                   T6 (update index)
                         │
                         ▼
                   T7 (wire consumers)
                         │
                         ▼
                   T8 (validate)

═══════════════════════════════════════════════════════════════════════════════════════════
                                    TASK LIST
═══════════════════════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ TASK T1: Verify materials directory exists                                              │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Type:     validate                                                                      │
│ Path:     C:\PRISM...\EXTRACTED\materials\enhanced\                             │
│ Time:     2 minutes                                                                     │
│ Depends:  none                                                                          │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Description:                                                                            │
│ Verify the enhanced materials directory exists. Create if missing.                      │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Verification:                                                                           │
│ ☐ Directory exists at path                                                              │
│ ☐ Directory is writable                                                                 │
└─────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ TASK T2: Verify material template available                                             │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Type:     validate                                                                      │
│ Path:     /mnt/skills/user/prism-material-template/SKILL.md                             │
│ Time:     2 minutes                                                                     │
│ Depends:  T1                                                                            │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Description:                                                                            │
│ Read the 127-parameter template to ensure we have the correct structure.                │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Verification:                                                                           │
│ ☐ Template skill accessible                                                             │
│ ☐ 127-parameter structure confirmed                                                     │
└─────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ TASK T3: Create STEEL_1045_MATERIAL.js                                                  │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Type:     create                                                                        │
│ Path:     C:\PRISM...\EXTRACTED\materials\enhanced\STEEL_1045_MATERIAL.js       │
│ Size:     ~200 lines, ~14KB                                                             │
│ Time:     4 minutes                                                                     │
│ Depends:  T2                                                                            │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Description:                                                                            │
│ Create complete 127-parameter material file for AISI 1045 medium carbon steel.          │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Code Outline:                                                                           │
│ const STEEL_1045 = {                                                                    │
│   id: "STEEL_1045",                                                                     │
│   name: "AISI 1045 Medium Carbon Steel",                                                │
│   physical: { density: 7850, ... },      // 15 fields                                   │
│   mechanical: { tensileStrength: {...}, ... },  // 20 fields                            │
│   cutting: { kc1_1: 1820, mc: 0.26, ... },      // 25 fields                            │
│   johnsonCook: { A: 553, B: 600, ... },         // 12 fields                            │
│   tooling: { recommendedGrades: [...], ... },   // 30 fields                            │
│   taylorCoefficients: { C: 250, n: 0.25, ... }, // 10 fields                            │
│   meta: { sources: [...], ... }                 // 10 fields                            │
│ };                                                                                      │
│ export default STEEL_1045;                                                              │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Verification:                                                                           │
│ ☐ File exists at path                                                                   │
│ ☐ All 7 sections present                                                                │
│ ☐ kc1_1 = 1820 (verified from handbook)                                                 │
│ ☐ Density = 7850 kg/m³                                                                  │
└─────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ TASK T4: Create STEEL_1050_MATERIAL.js                                                  │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Type:     create                                                                        │
│ Path:     C:\PRISM...\EXTRACTED\materials\enhanced\STEEL_1050_MATERIAL.js       │
│ Size:     ~200 lines, ~14KB                                                             │
│ Time:     4 minutes                                                                     │
│ Depends:  T2                                                                            │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Description:                                                                            │
│ Create complete 127-parameter material file for AISI 1050 medium carbon steel.          │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Code Outline:                                                                           │
│ [Same structure as T3 with 1050-specific values]                                        │
│ Key differences: kc1_1: 1880, tensileStrength.typ: 690 MPa                              │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Verification:                                                                           │
│ ☐ File exists at path                                                                   │
│ ☐ Values differ from 1045 appropriately                                                 │
│ ☐ kc1_1 = 1880 (higher carbon = higher force)                                           │
└─────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ TASK T5: Create STEEL_1055_MATERIAL.js                                                  │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Type:     create                                                                        │
│ Path:     C:\PRISM...\EXTRACTED\materials\enhanced\STEEL_1055_MATERIAL.js       │
│ Size:     ~200 lines, ~14KB                                                             │
│ Time:     4 minutes                                                                     │
│ Depends:  T2                                                                            │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Description:                                                                            │
│ Create complete 127-parameter material file for AISI 1055 medium carbon steel.          │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Code Outline:                                                                           │
│ [Same structure as T3 with 1055-specific values]                                        │
│ Key differences: kc1_1: 1920, tensileStrength.typ: 720 MPa                              │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Verification:                                                                           │
│ ☐ File exists at path                                                                   │
│ ☐ Values differ from 1045/1050 appropriately                                            │
│ ☐ Progressive increase in kc1_1 (1820 → 1880 → 1920)                                    │
└─────────────────────────────────────────────────────────────────────────────────────────┘

═══ CHECKPOINT 1 after T5 ═══
Completed: T1, T2, T3, T4, T5
Verify:
☐ STEEL_1045_MATERIAL.js exists, ~14KB
☐ STEEL_1050_MATERIAL.js exists, ~14KB
☐ STEEL_1055_MATERIAL.js exists, ~14KB
☐ All have 127 parameters
Save: Update CURRENT_STATE.json with progress
═════════════════════════════

┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ TASK T6: Update MATERIAL_INDEX.js                                                       │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Type:     modify                                                                        │
│ Path:     C:\PRISM...\EXTRACTED\materials\MATERIAL_INDEX.js                     │
│ Change:   +6 lines                                                                      │
│ Time:     3 minutes                                                                     │
│ Depends:  T3, T4, T5                                                                    │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Description:                                                                            │
│ Add imports and exports for the 3 new materials to the master index.                    │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Current State:                                                                          │
│ import STEEL_1040 from './enhanced/STEEL_1040_MATERIAL.js';                             │
│ export { STEEL_1040, ... };                                                             │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Target State:                                                                           │
│ import STEEL_1040 from './enhanced/STEEL_1040_MATERIAL.js';                             │
│ import STEEL_1045 from './enhanced/STEEL_1045_MATERIAL.js';                             │
│ import STEEL_1050 from './enhanced/STEEL_1050_MATERIAL.js';                             │
│ import STEEL_1055 from './enhanced/STEEL_1055_MATERIAL.js';                             │
│ export { STEEL_1040, STEEL_1045, STEEL_1050, STEEL_1055, ... };                         │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Verification:                                                                           │
│ ☐ All 3 imports added in alphabetical order                                             │
│ ☐ All 3 exports added                                                                   │
│ ☐ No syntax errors                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ TASK T7: Wire materials to speed/feed calculator                                        │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Type:     wire                                                                          │
│ Source:   MATERIAL_INDEX.js                                                             │
│ Consumer: C:\PRISM...\products\speed-feed\SPEED_FEED_CALCULATOR.js              │
│ Change:   ~5 lines                                                                      │
│ Time:     3 minutes                                                                     │
│ Depends:  T6                                                                            │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Description:                                                                            │
│ Ensure speed/feed calculator can access the new materials via index.                    │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Wiring Pattern:                                                                         │
│ // Verify import exists                                                                 │
│ import { getMaterial } from '../materials/MATERIAL_INDEX.js';                           │
│                                                                                         │
│ // New materials automatically available via getMaterial('STEEL_1045')                  │
│ // No code changes needed if dynamic lookup exists                                      │
│ // Otherwise add to material dropdown/selector                                          │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Verification:                                                                           │
│ ☐ Calculator can resolve STEEL_1045, STEEL_1050, STEEL_1055                             │
│ ☐ Material selector includes new materials                                              │
└─────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ TASK T8: Validate complete integration                                                  │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Type:     validate                                                                      │
│ Target:   All 3 materials + index + wiring                                              │
│ Time:     3 minutes                                                                     │
│ Depends:  T7                                                                            │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Description:                                                                            │
│ Comprehensive validation of all created materials and their integration.                │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Validation Checks:                                                                      │
│ ☐ All 3 files exist with correct sizes                                                  │
│ ☐ All files have 127 parameters                                                         │
│ ☐ Index exports all 3 materials                                                         │
│ ☐ Calculator can use each material                                                      │
│ ☐ kc1_1 values form logical progression (1820, 1880, 1920)                              │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Evidence to Capture:                                                                    │
│ • File listing with sizes                                                               │
│ • Sample property verification                                                          │
│ • Consumer access test                                                                  │
└─────────────────────────────────────────────────────────────────────────────────────────┘

═══ CHECKPOINT 2 (FINAL) after T8 ═══
Completed: All tasks T1-T8
Verify:
☐ 3 material files created (~42KB total)
☐ Index updated with 3 new entries
☐ Calculator wired successfully
☐ All validation checks pass
Save: Update CURRENT_STATE.json - mark task COMPLETE
═════════════════════════════════════════

PLAN SUMMARY:
─────────────
Tasks: 8
Time: 28 minutes (with buffers)
Files created: 3
Files modified: 1
Wiring: 1 consumer
Checkpoints: 2

Ready for execution.
```

---

## 7.2 Example 2: Planning an Engine Extraction

**Context:**
- Approved design: Extract Kienzle force engine from monolith
- Scope: Lines 45230-45890, convert to standalone module
- Approach: Extract, modify imports, wire to consumers

**Complete Plan:**

```
═══════════════════════════════════════════════════════════════════════════════════════════
                    PLAN: Extract KIENZLE_FORCE_ENGINE
═══════════════════════════════════════════════════════════════════════════════════════════

OVERVIEW:
─────────
Total Tasks:     6
Estimated Time:  24 minutes
Checkpoints:     2
Critical Path:   T1 → T2 → T3 → T4 → T5 → T6

═══════════════════════════════════════════════════════════════════════════════════════════
                                    TASK LIST
═══════════════════════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ TASK T1: Locate engine in monolith                                                      │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Type:     validate                                                                      │
│ Source:   C:\...\PRISM_v8_89_002.html                                                   │
│ Time:     3 minutes                                                                     │
│ Depends:  none                                                                          │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Description:                                                                            │
│ Verify exact line numbers for Kienzle engine, confirm boundaries.                       │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Search For:                                                                             │
│ • Start: "// ═══ KIENZLE FORCE ENGINE ═══"                                              │
│ • End: "// ═══ END KIENZLE FORCE ENGINE ═══"                                            │
│ • Expected: ~660 lines                                                                  │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Verification:                                                                           │
│ ☐ Start line confirmed: 45230                                                           │
│ ☐ End line confirmed: 45890                                                             │
│ ☐ Size matches expectation                                                              │
└─────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ TASK T2: Create target directory                                                        │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Type:     create                                                                        │
│ Path:     C:\PRISM...\EXTRACTED\engines\physics\                                │
│ Time:     1 minute                                                                      │
│ Depends:  T1                                                                            │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Description:                                                                            │
│ Ensure physics engines directory exists for extracted module.                           │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Verification:                                                                           │
│ ☐ Directory created/exists                                                              │
└─────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ TASK T3: Extract raw engine code                                                        │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Type:     extract                                                                       │
│ Source:   Monolith lines 45230-45890                                                    │
│ Target:   C:\PRISM...\EXTRACTED\engines\physics\KIENZLE_FORCE_ENGINE.js         │
│ Size:     ~660 lines, ~35KB                                                             │
│ Time:     5 minutes                                                                     │
│ Depends:  T2                                                                            │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Description:                                                                            │
│ Copy engine code from monolith to standalone file.                                      │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Extraction Notes:                                                                       │
│ • Include: All functions within boundaries                                              │
│ • Include: Inline constants and helpers                                                 │
│ • Exclude: Material data (will import)                                                  │
│ • Exclude: Global state references                                                      │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Verification:                                                                           │
│ ☐ File created at target                                                                │
│ ☐ ~660 lines captured                                                                   │
│ ☐ No HTML artifacts                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────────┘

═══ CHECKPOINT 1 after T3 ═══
Completed: T1, T2, T3
Verify:
☐ Engine file exists at path
☐ ~35KB, ~660 lines
☐ Contains calculateKienzleForce function
Save: Update CURRENT_STATE.json
═════════════════════════════

┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ TASK T4: Modify for standalone use                                                      │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Type:     modify                                                                        │
│ Path:     C:\PRISM...\EXTRACTED\engines\physics\KIENZLE_FORCE_ENGINE.js         │
│ Change:   +15 lines imports, +5 lines exports, -50 lines inline data                    │
│ Time:     5 minutes                                                                     │
│ Depends:  T3                                                                            │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Description:                                                                            │
│ Add imports, exports, remove hardcoded material data.                                   │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Modifications:                                                                          │
│ 1. Add at top:                                                                          │
│    import { getMaterial } from '../../materials/MATERIAL_INDEX.js';                     │
│    import { getUnitConverter } from '../../utils/UNIT_CONVERTER.js';                    │
│                                                                                         │
│ 2. Remove: Inline material lookup table (~50 lines)                                     │
│                                                                                         │
│ 3. Replace: Direct material access with getMaterial() calls                             │
│                                                                                         │
│ 4. Add at bottom:                                                                       │
│    export { calculateKienzleForce, calculateSpecificForce, ENGINE_CONFIG };             │
│    export default { calculate: calculateKienzleForce, config: ENGINE_CONFIG };          │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Verification:                                                                           │
│ ☐ Imports added                                                                         │
│ ☐ No hardcoded material data                                                            │
│ ☐ Exports present                                                                       │
│ ☐ No syntax errors                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ TASK T5: Wire to consumers                                                              │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Type:     wire                                                                          │
│ Source:   KIENZLE_FORCE_ENGINE.js                                                       │
│ Consumers: SPEED_FEED_CALCULATOR.js, TOOL_LIFE_PREDICTOR.js                             │
│ Change:   ~10 lines per consumer                                                        │
│ Time:     5 minutes                                                                     │
│ Depends:  T4                                                                            │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Description:                                                                            │
│ Connect extracted engine to its 2 primary consumers.                                    │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Wiring:                                                                                 │
│ Consumer 1 - SPEED_FEED_CALCULATOR.js:                                                  │
│   import { calculateKienzleForce } from '../engines/physics/KIENZLE_FORCE_ENGINE.js';   │
│   // Replace inline force calculation with imported function                            │
│                                                                                         │
│ Consumer 2 - TOOL_LIFE_PREDICTOR.js:                                                    │
│   import { calculateSpecificForce } from '../engines/physics/KIENZLE_FORCE_ENGINE.js';  │
│   // Replace inline specific force with imported function                               │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Verification:                                                                           │
│ ☐ Both consumers updated                                                                │
│ ☐ Old inline code removed/commented                                                     │
│ ☐ Both consumers use imported engine                                                    │
└─────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ TASK T6: Validate extraction complete                                                   │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Type:     validate                                                                      │
│ Target:   Engine + consumers                                                            │
│ Time:     3 minutes                                                                     │
│ Depends:  T5                                                                            │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Validation Checks:                                                                      │
│ ☐ Engine file standalone (~620 lines after trimming)                                    │
│ ☐ No monolith dependencies remain                                                       │
│ ☐ Imports resolve correctly                                                             │
│ ☐ Exports match consumer expectations                                                   │
│ ☐ Both consumers wired                                                                  │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Evidence:                                                                               │
│ • File listing                                                                          │
│ • Import/export verification                                                            │
│ • Consumer wiring check                                                                 │
└─────────────────────────────────────────────────────────────────────────────────────────┘

═══ CHECKPOINT 2 (FINAL) ═══
All tasks complete.
Update CURRENT_STATE.json - mark extraction COMPLETE.
═════════════════════════════
```

---

## 7.3 Example 3: Planning a Multi-Session Feature

**Context:**
- Approved design: Create complete post processor skill
- Scope: Too large for single session (~120KB total)
- Approach: Split into 4 sessions, plan first session in detail

**Session Split Plan:**

```
═══════════════════════════════════════════════════════════════════════════════════════════
                    PLAN: Post Processor Skill (Multi-Session)
═══════════════════════════════════════════════════════════════════════════════════════════

TOTAL SCOPE:
────────────
Estimated size: ~120KB
Sessions needed: 4
This plan: Session 1 only (detailed)
Sessions 2-4: High-level outline for future planning

SESSION BREAKDOWN:
──────────────────
Session 1: Core structure + G-code reference (~30KB)
Session 2: Controller-specific sections (FANUC, SIEMENS) (~35KB)  
Session 3: Controller-specific sections (HEIDENHAIN, MAZAK) (~30KB)
Session 4: Examples, anti-patterns, integration (~25KB)

═══════════════════════════════════════════════════════════════════════════════════════════
                    SESSION 1 DETAIL (This Plan)
═══════════════════════════════════════════════════════════════════════════════════════════

OVERVIEW:
─────────
Tasks: 6
Time: 35 minutes
Output: prism-post-processor/SKILL.md (partial, ~30KB)

TASKS:
──────

T1: Create skill directory (2 min)
    Path: C:\PRISM..\_SKILLS\prism-post-processor\
    
T2: Write YAML + Overview section (5 min)
    ~100 lines, ~5KB
    
T3: Write Universal G-code reference (8 min)
    ~300 lines, ~12KB
    All standard G/M codes
    
T4: Write Code generation patterns (6 min)
    ~150 lines, ~7KB
    Templates for common operations

T5: Write Safety/validation section (5 min)
    ~100 lines, ~5KB
    Collision avoidance, limit checking
    
T6: Checkpoint and handoff notes (3 min)
    Document stopping point
    Prepare for Session 2

CHECKPOINT:
───────────
After T6: Save partial skill file
Mark: "Session 1 of 4 complete"
Next: Session 2 - Controller-specific sections

═══════════════════════════════════════════════════════════════════════════════════════════
                    SESSIONS 2-4 OUTLINE (Future)
═══════════════════════════════════════════════════════════════════════════════════════════

SESSION 2 (Future):
───────────────────
T7-T12: FANUC section (~15KB)
T13-T18: SIEMENS section (~15KB)
Checkpoint: Controllers 1-2 complete

SESSION 3 (Future):
───────────────────
T19-T24: HEIDENHAIN section (~15KB)
T25-T30: MAZAK section (~15KB)
Checkpoint: All controllers complete

SESSION 4 (Future):
───────────────────
T31-T35: Examples (3 complete examples)
T36-T40: Anti-patterns (5 mistakes)
T41-T44: Integration + quick reference
Final: Complete skill file
```

---

# SECTION 8: ANTI-PATTERNS

## 8.1 Overview of Planning Mistakes

```
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    TOP 5 PLANNING MISTAKES                                                 ║
╠═══════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                           ║
║  ❌ MISTAKE 1: Vague Task Descriptions                                                    ║
║     Impact: HIGH - Tasks can't be executed without interpretation                         ║
║     Frequency: VERY COMMON                                                                ║
║                                                                                           ║
║  ❌ MISTAKE 2: Missing Dependencies                                                       ║
║     Impact: HIGH - Blocked execution, wasted context                                      ║
║     Frequency: COMMON                                                                     ║
║                                                                                           ║
║  ❌ MISTAKE 3: Tasks Too Large                                                            ║
║     Impact: MEDIUM - Context pressure, difficult checkpointing                            ║
║     Frequency: VERY COMMON                                                                ║
║                                                                                           ║
║  ❌ MISTAKE 4: No Code Outlines                                                           ║
║     Impact: MEDIUM - Execution requires design decisions                                  ║
║     Frequency: COMMON                                                                     ║
║                                                                                           ║
║  ❌ MISTAKE 5: Optimistic Time Estimates                                                  ║
║     Impact: LOW-MEDIUM - Schedule pressure, incomplete work                               ║
║     Frequency: VERY COMMON                                                                ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
```

## 8.2 Detailed Anti-Patterns

### ❌ Mistake 1: Vague Task Descriptions

**What Happens:**
Task descriptions use ambiguous language that requires interpretation during execution.

**Examples:**
```
WRONG:
T3: "Create the material file"
T5: "Fix the integration"
T8: "Update the relevant files"

RIGHT:
T3: "Create STEEL_1045_MATERIAL.js at C:\...\materials\enhanced\ with 127 parameters"
T5: "Add STEEL_1045 import to MATERIAL_INDEX.js at line 23"
T8: "Update SPEED_FEED_CALCULATOR.js lines 145-150 to use getMaterial()"
```

**Why It's Wrong:**
- "The material file" - which one?
- "Fix" - what's broken? what's the fix?
- "Relevant files" - which files?

**Consequences:**
- Execution stops to ask questions
- Wrong interpretation leads to rework
- Context wasted on clarification

**How to Detect:**
- Task uses "the" without prior definition
- Task uses vague verbs: "fix", "update", "improve", "handle"
- Task doesn't include full path
- Task doesn't include expected outcome

**How to Fix:**
- Include full path for every file
- Specify exact change (add X, remove Y, change Z to W)
- Define "done" criteria explicitly

---

### ❌ Mistake 2: Missing Dependencies

**What Happens:**
Tasks are ordered without considering what each task needs to exist first.

**Example:**
```
WRONG:
T1: Wire material to calculator
T2: Create material file
T3: Create index
[T1 can't run - material doesn't exist yet!]

RIGHT:
T1: Create material file
T2: Create/update index
T3: Wire material to calculator
[Each task has what it needs]
```

**Why It's Wrong:**
- Task 1 needs a file that Task 2 creates
- Execution will fail or produce wrong result
- Must reorder mid-execution, wasting context

**Consequences:**
- Blocked execution
- Wasted tool calls on impossible tasks
- Confusion about what went wrong

**How to Detect:**
- Task creates file after task that uses file
- Wire/integration tasks before component tasks
- Validation before creation

**How to Fix:**
- For each task, ask "what must exist first?"
- Build dependency graph
- Order by dependency level

---

### ❌ Mistake 3: Tasks Too Large

**What Happens:**
Tasks are scoped to take 10, 20, or 30+ minutes instead of 2-5 minutes.

**Example:**
```
WRONG:
T1: "Create all 10 material files" (40 min)
T2: "Extract all physics engines" (60 min)

RIGHT:
T1: Create STEEL_1045_MATERIAL.js (4 min)
T2: Create STEEL_1050_MATERIAL.js (4 min)
T3: Create STEEL_1055_MATERIAL.js (4 min)
...
[Each material is a separate task]
```

**Why It's Wrong:**
- Can't checkpoint mid-task
- If interrupted, lose all progress
- Hard to track what's done vs pending
- Context pressure builds

**Consequences:**
- Context compaction mid-task = lost work
- No safe stopping points
- Progress invisible until task complete

**How to Detect:**
- Task takes >5 minutes
- Task creates multiple files
- Task has multiple distinct actions

**How to Fix:**
- Split by file (one file = one task)
- Split by action (create, then populate, then verify)
- Target 2-5 minutes per task

---

### ❌ Mistake 4: No Code Outlines

**What Happens:**
Create tasks describe what to make but not what it should look like.

**Example:**
```
WRONG:
T3: Create STEEL_1045_MATERIAL.js
Description: Create material file for 1045 steel
[No structure provided - executor must design]

RIGHT:
T3: Create STEEL_1045_MATERIAL.js
Code Outline:
const STEEL_1045 = {
  id: "STEEL_1045",
  physical: { density: 7850, ... },
  cutting: { kc1_1: 1820, ... },
  // ... sections outlined
};
export default STEEL_1045;
```

**Why It's Wrong:**
- Execution becomes design + implementation
- Different executions produce different structures
- Inconsistency across files
- Time estimate unreliable

**Consequences:**
- Slower execution
- Inconsistent outputs
- May not match integration expectations

**How to Detect:**
- Create task with no code block
- Description only says "create X with Y"
- Structure left to executor's discretion

**How to Fix:**
- Include skeleton code for every create task
- Show section headers at minimum
- Include key values if known

---

### ❌ Mistake 5: Optimistic Time Estimates

**What Happens:**
Estimates assume everything goes perfectly with no issues or verification.

**Example:**
```
WRONG:
T1: Create 127-parameter material file (2 min)
T2: Extract 660-line engine (3 min)
T3: Wire 5 consumers (5 min)
[Actual times: 5 min, 8 min, 15 min]

RIGHT:
T1: Create 127-parameter material file (4 min)
    Base: 3 min, Buffer: 20%, Complexity: 1.1x
T2: Extract 660-line engine (8 min)
    Base: 4 min, Complexity: 1.5x (unfamiliar code)
T3: Wire 5 consumers (15 min = 3 min each)
    Split into 5 separate tasks
```

**Why It's Wrong:**
- Underestimates create false deadline pressure
- No buffer for inevitable issues
- Leads to incomplete work or rushing

**Consequences:**
- Schedule slips
- Quality compromised
- Frustration

**How to Detect:**
- All tasks estimated at minimum possible time
- No buffers in plan
- Complex tasks estimated same as simple ones

**How to Fix:**
- Use time estimation formulas (Section 4)
- Apply complexity multipliers
- Add 20% per-task buffer + 15% plan buffer



---

# SECTION 9: SKILL INTEGRATION

## 9.1 Input from prism-sp-brainstorm

This skill receives approved designs from the brainstorm phase. The handoff data includes:

**Required Input:**
```
From prism-sp-brainstorm:
├── Approved Scope (Chunk 1)
│   ├── What will be created/changed
│   ├── What is NOT included
│   └── Estimated size/effort
│
├── Approved Approach (Chunk 2)
│   ├── Technical strategy
│   ├── Key decisions with rationale
│   └── Trade-offs accepted
│
├── Approved Details (Chunk 3)
│   ├── File paths
│   ├── Structure/schema
│   └── Implementation order
│
└── Alternatives Considered
    ├── Options evaluated
    └── Why chosen approach selected
```

**Validation Before Planning:**
- [ ] All 3 chunks have explicit user approval
- [ ] Scope boundaries are clear
- [ ] Technical decisions are finalized
- [ ] File paths are specified

**If Input Missing:**
Return to prism-sp-brainstorm to get missing approvals before planning.

## 9.2 Output to prism-sp-execution

This skill produces a complete task list for the execution phase.

**Output Package:**
```
To prism-sp-execution:
├── Task List
│   ├── Ordered by dependencies
│   ├── Each task 2-5 minutes
│   ├── Full paths specified
│   ├── Code outlines included
│   └── Verification criteria defined
│
├── Checkpoint Schedule
│   ├── Checkpoint every 3-5 tasks
│   ├── Verification steps per checkpoint
│   └── Save instructions
│
├── Dependency Map
│   ├── What blocks what
│   ├── Critical path identified
│   └── Parallel opportunities noted
│
├── Time Estimates
│   ├── Per-task estimates
│   ├── Total with buffers
│   └── Checkpoint timing
│
└── Risk Notes
    ├── Complex tasks flagged
    └── Potential issues identified
```

**Handoff Trigger:**
Plan is ready for execution when:
- [ ] All tasks have required fields
- [ ] Dependencies are ordered correctly
- [ ] Checkpoints are placed
- [ ] Validation passes

## 9.3 Integration with Other Skills

### Primary Integration Chain:
```
prism-sp-brainstorm ──▶ prism-sp-planning ──▶ prism-sp-execution
                             │
                             ├── Uses: prism-material-template (for material outlines)
                             ├── Uses: prism-coding-patterns (for code structure)
                             └── Uses: prism-monolith-index (for extraction line numbers)
```

### Skills to Reference During Planning:

| Situation | Reference Skill | Why |
|-----------|-----------------|-----|
| Material file tasks | prism-material-template | Get 127-parameter structure |
| Code creation tasks | prism-coding-patterns | Get standard patterns |
| Extraction tasks | prism-monolith-index | Get line numbers |
| Physics calculations | prism-physics-formulas | Get formula structures |
| Time estimation | prism-manufacturing-tables | Get complexity data |

### Skills NOT Used During Planning:

| Skill | Phase |
|-------|-------|
| prism-sp-debugging | Only if plan fails |
| prism-sp-verification | After execution |
| prism-expert-* | During brainstorm, not planning |

## 9.4 State File Updates

When planning completes, update CURRENT_STATE.json:

```json
{
  "currentTask": {
    "id": "[task ID]",
    "name": "[task name]",
    "status": "PLANNED",
    "phase": "ready-for-execution",
    "plan": {
      "totalTasks": 8,
      "estimatedTime": "28 minutes",
      "checkpoints": 2,
      "criticalPath": ["T1", "T2", "T3", "T5", "T6", "T7"]
    }
  },
  "planDetails": {
    "created": "[ISO timestamp]",
    "source": "prism-sp-planning",
    "brainstormApproval": {
      "scope": true,
      "approach": true,
      "details": true
    }
  },
  "nextStep": {
    "action": "Execute plan",
    "skill": "prism-sp-execution",
    "startWith": "T1"
  }
}
```

---

# SECTION 10: QUICK REFERENCE CARD

```
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    PRISM-SP-PLANNING - QUICK REFERENCE                                     ║
╠═══════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                           ║
║  TRIGGERS: plan tasks, break down work, create task list, after brainstorm approval       ║
║                                                                                           ║
║  PROCESS:                                                                                 ║
║  ─────────                                                                                ║
║  1. RECEIVE ──────────────────────────────────▶ Validate brainstorm approval              ║
║  2. DECOMPOSE ────────────────────────────────▶ Break into 2-5 min tasks                  ║
║  3. SPECIFY ──────────────────────────────────▶ Add paths, outlines, verification         ║
║  4. ORDER ────────────────────────────────────▶ Arrange by dependencies                   ║
║  5. CHECKPOINT ───────────────────────────────▶ Insert save points (every 3-5)            ║
║  6. VALIDATE ─────────────────────────────────▶ Review completeness                       ║
║                                                                                           ║
║  TASK CARD FORMAT:                                                                        ║
║  ─────────────────                                                                        ║
║  TASK T[N]: [Name]                                                                        ║
║  Type:     [create|modify|extract|wire|validate]                                          ║
║  Path:     [full path]                                                                    ║
║  Size:     ~[X] lines, ~[Y]KB                                                             ║
║  Time:     [N] minutes                                                                    ║
║  Depends:  [task IDs or "none"]                                                           ║
║  Description: [1-2 sentences]                                                             ║
║  Code Outline: [skeleton]                                                                 ║
║  Verification: [how to verify]                                                            ║
║                                                                                           ║
║  TIME ESTIMATION:                                                                         ║
║  ────────────────                                                                         ║
║  Base times: create(3-5), modify(2-3), extract(4), wire(3), validate(2)                   ║
║  Multipliers: new pattern(1.5x), complex(1.3x), unfamiliar(1.4x)                          ║
║  Buffers: per-task(20%), per-checkpoint(2min), end(15%)                                   ║
║                                                                                           ║
║  DEPENDENCY NOTATION:                                                                     ║
║  ────────────────────                                                                     ║
║  T5 → T3, T4    Hard dependency (must complete T3 and T4 first)                           ║
║  T5 ~> T3       Soft dependency (helpful if done)                                         ║
║  BLOCKED BY:    Mark tasks that can't start yet                                           ║
║                                                                                           ║
║  ❌ DON'T: Vague descriptions, missing deps, tasks >5min, no outlines                     ║
║  ✓ DO: Exact paths, code skeletons, dependency order, checkpoints                         ║
║                                                                                           ║
║  INPUT:  Approved brainstorm (scope + approach + details)                                 ║
║  OUTPUT: Executable task list with checkpoints                                            ║
║  NEXT:   prism-sp-execution                                                               ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
```

---

# SECTION 11: VALIDATION CHECKLIST

## 11.1 Structure Validation

- [x] YAML frontmatter complete and valid
- [x] All 10+ sections present
- [x] Section numbering consistent
- [x] No placeholder text remaining
- [x] No instructional comments remaining

## 11.2 Content Validation

- [x] Purpose clearly stated (Section 1.1)
- [x] At least 3 trigger keywords defined
- [x] Process has 6 steps with verification points
- [x] 5 task templates provided (create, modify, extract, wire, validate)
- [x] 3 complete examples (Section 7)
- [x] 5 anti-patterns documented (Section 8)
- [x] Quick reference card present (Section 10)

## 11.3 Quality Validation

- [x] Examples are realistic and complete
- [x] Anti-patterns include real failure scenarios
- [x] Time estimation formulas provided
- [x] Dependency mapping process documented
- [x] Code outline patterns for multiple file types

## 11.4 Integration Validation

- [x] Input from prism-sp-brainstorm defined
- [x] Output to prism-sp-execution defined
- [x] State file update format specified
- [x] Handoff criteria documented

---

# DOCUMENT METADATA

```
Skill:        prism-sp-planning
Version:      1.0.0
Created:      2026-01-24
Session:      SP.1.2
Author:       Claude (PRISM Development)
Category:     Development Workflow (SP.1)

Purpose:      Transform approved designs into granular,
              executable task lists with zero ambiguity

Triggers:     plan tasks, break down work, create task list
Prerequisites: Approved brainstorm output (all 3 chunks)
Outputs:      Ordered task list, checkpoints, dependency map

Input Skill:  prism-sp-brainstorm
Output Skill: prism-sp-execution

Key Principles:
  1. Zero ambiguity - every task executable without questions
  2. 2-5 minute tasks - small enough to checkpoint safely
  3. Exact paths - full paths, no relative references
  4. Code outlines included - execution is fill-in-the-blanks
  5. Dependency-first ordering - never blocked by missing prereqs
  6. Built-in checkpoints - safe interruption every 3-5 tasks
```

---

**END OF SKILL DOCUMENT**

