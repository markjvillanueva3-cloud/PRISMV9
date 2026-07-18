---
name: prism-dev-accelerator
description: |
  Meta-skill that fundamentally accelerates PRISM development by orchestrating
  the 5 most powerful development dispatchers together: prism_autopilot (workflow),
  prism_atcs (task decomposition), prism_autonomous (background execution),
  prism_manus (research + sandboxing), prism_sp (superpowers phases).
  Turns what takes 5 sessions into 1-2. Use when: starting any development task
  that touches multiple files, requires research, or has >3 subtasks.
  Key insight: These 5 dispatchers have 60 combined actions but are almost
  never used together. Their synergy is multiplicative, not additive.
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "dev", "accelerator", "meta", "fundamentally", "accelerates", "development", "orchestrating"
- Quality gate check, anti-regression validation, or release readiness assessment.

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-dev-accelerator")`
2. Apply relevant knowledge to current task context
3. Cross-reference with related dispatchers:
   - prism_validate→[relevant_action] for validation checks
   - prism_omega→compute for quality scoring
   - prism_ralph→loop for full validation cycle

### What It Returns
- **Format**: Structured markdown reference with formulas, tables, and decision criteria
- **Location**: Loaded into context via skill_content (not a file output)
- **Success**: Reference knowledge applicable to current task
- **Failure**: Content not found → verify skill exists in index

### Examples
**Example 1**: User asks about dev
→ Load skill: skill_content("prism-dev-accelerator") → Apply relevant knowledge → Provide structured response

**Example 2**: Task requires accelerator guidance
→ Load skill → Extract applicable section → Cross-reference with related skills → Deliver recommendation

# PRISM Development Accelerator
## 5 Development Dispatchers → Multiplicative Velocity

## THE VELOCITY PROBLEM

Current development pattern:
1. Read requirements → manual
2. Research approach → manual or web search
3. Plan implementation → manual
4. Write code → manual, one file at a time
5. Test → manual
6. Validate → manual ralph call
7. Document → manual

Each step is sequential. Each uses 1-2 dispatchers at most.
With 60 development actions across 5 dispatchers, we're using <15%.

## THE ACCELERATED PATTERN

### Step 1: DECOMPOSE (prism_atcs)
Turn any task into executable units.

```
prism_atcs→task_init({
  task_id: "descriptive-name",
  description: "Full task description",
  constraints: { safety: true, max_units: 20 }
})
```

ATCS creates a manifest with work units, dependencies, and quality gates.
Each unit is independently executable and validateable.

### Step 2: RESEARCH (prism_manus)
Parallel research while planning.

```
prism_manus→web_research({
  query: "best practices for [specific technical topic]",
  depth: "focused"
})
```

Use for: API patterns, library docs, manufacturing standards,
competitive analysis, algorithm comparisons. Don't reinvent what exists.

```
prism_manus→code_sandbox({
  language: "typescript",
  code: "// Prototype approach before committing",
  test: true
})
```

Use for: Quick validation of approach before full implementation.
Catch design errors in minutes, not hours.

### Step 3: PLAN (prism_sp→plan + prism_autopilot)
Structured planning with automated sequencing.

```
prism_sp→plan({
  task: "task description from ATCS",
  constraints: "from task manifest",
  complexity: "high"
})
```

SP generates a phased plan with dependencies, risk assessment,
and estimated effort. Feed this into autopilot:

```
prism_autopilot_d→autopilot({
  task: "from SP plan",
  mode: "execute"
})
```

Autopilot parses GSD, applies routing rules, and generates the
optimal dispatcher sequence.

### Step 4: EXECUTE (prism_autonomous + prism_dev)
Execute work units, some autonomously.

For units that are well-defined and low-risk:
```
prism_autonomous→auto_execute({
  task_id: "from ATCS",
  unit_ids: ["unit-1", "unit-2", "unit-3"],
  budget: { max_calls: 50 }
})
```

For units requiring judgment or safety-critical decisions:
```
prism_dev→file_write (manual, with human oversight)
prism_sp→execute (structured execution with gates)
```

### Step 5: VALIDATE (prism_ralph + prism_validate)
Batch validation of all completed units.

```
prism_atcs→batch_validate({
  task_id: "task-name",
  validation_type: "comprehensive"
})
```

Then:
```
prism_ralph→loop({
  content: "completed implementation",
  domain: "manufacturing"
})
```

### Step 6: ASSEMBLE (prism_atcs)
Combine validated units into final deliverable.

```
prism_atcs→assemble({
  task_id: "task-name",
  output_format: "merged"
})
```

## ACCELERATION RECIPES

### Recipe: NEW DISPATCHER (Currently ~3 sessions → 1 session)
```
1. ATCS→task_init: Decompose into [scaffold, actions, tests, wiring, docs]
2. Manus→web_research: Check MCP patterns, similar implementations
3. SP→plan: Generate implementation plan
4. Autonomous→auto_execute: Scaffold + boilerplate units
5. Dev→file_write: Complex action logic (human-guided)
6. Manus→code_sandbox: Prototype edge cases
7. Ralph→loop: Full validation
8. ATCS→assemble: Final integration
```

### Recipe: NEW SKILL (Currently ~1 session → 30 minutes)
```
1. Knowledge→cross_query: What exists in this domain?
2. Skill_script→skill_search: Overlapping skills?
3. SP→brainstorm: Deep analysis of skill gap
4. SP→plan: Structure + content plan
5. Dev→file_write: Create SKILL.md
6. Ralph→scrutinize: Quick validation
7. Build + test
```

### Recipe: BUG FIX (Currently ~45 min → 15 min)
```
1. Guard→error_capture: Structured error info
2. Guard→pattern_scan: Known pattern?
3. If known: Guard→learning_query → apply known fix
4. If new: SP→debug → root cause analysis
5. Dev→file_write: Fix
6. Manus→code_sandbox: Regression test
7. Guard→learning_save: Save pattern for future
```

### Recipe: REGISTRY HYDRATION (Currently ~5 sessions → 2 sessions)
```
1. Knowledge→stats: What's missing?
2. ATCS→task_init: Create units per data batch
3. Manus→web_research: Source data (standards, catalogs)
4. Autonomous→auto_execute: Batch data entry units
5. Validate→completeness: Check coverage
6. ATCS→batch_validate: Cross-validation
7. ATCS→assemble: Merge into registries
```

### Recipe: MAJOR REFACTOR (Currently ~4 sessions → 2 sessions)
```
1. SP→brainstorm: Impact analysis
2. ATCS→task_init: Decompose into safe atomic changes
3. Guard→pre_write_gate: Anti-regression check per unit
4. Autonomous→auto_execute: Safe mechanical changes
5. Dev→file_write: Complex structural changes (human)
6. Ralph→loop: Full validation
7. Build + smoke test
```

## KEY PRINCIPLES

1. **Decompose first.** ATCS task_init before ANY implementation.
   Small units = parallelizable, testable, reversible.

2. **Research before building.** 5 minutes of manus→web_research
   saves hours of wrong-direction implementation.

3. **Sandbox before committing.** manus→code_sandbox catches design
   errors before they're embedded in the codebase.

4. **Automate the boring parts.** Scaffolding, boilerplate, test stubs,
   documentation templates → autonomous execution.

5. **Validate continuously.** Don't batch validation to the end.
   Validate each unit as it completes.

6. **Learn from everything.** Every bug fix → guard→learning_save.
   Every pattern → guard→learning_save. Build institutional memory.

## DISPATCHER SYNERGY MAP

```
prism_atcs (decompose) ──→ prism_autonomous (execute units)
     │                           │
     ├──→ prism_sp (plan)        ├──→ prism_ralph (validate)
     │         │                 │
     │         ├──→ prism_dev    └──→ prism_atcs (assemble)
     │         │    (implement)
     │         │
     └──→ prism_manus (research + sandbox)
              │
              └──→ prism_guard (learn from results)
```

Every arrow is a data flow. Every node is a dispatcher.
This is the development orchestra.
