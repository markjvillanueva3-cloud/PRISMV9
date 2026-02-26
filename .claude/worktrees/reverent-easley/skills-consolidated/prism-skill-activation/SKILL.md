---
name: prism-skill-activation
description: Skill activation formula and level tables — decides which skills to load based on context keywords, task fit, and dependency readiness
---
# Skill Activation Logic

## When To Use
- At session start to decide which skills to load (used by phase_skill_auto_loader cadence)
- During mid-session when context changes and new skills may be relevant
- "Which skills should be active right now?" / "Should I load this skill for this task?"
- When skill_context_matcher cadence function evaluates incoming tool calls
- When building auto-pilot logic that needs to select skills programmatically
- NOT for: selecting which agent/model to use (use prism-agent-selection)
- NOT for: the hook system that enforces rules (use prism-hook-enforcement)

## How To Use
**ACTIVATION FORMULA** — score each candidate skill against current context:
```
ACTIVATION_SCORE(skill, context) =
  keyword_match × 0.4 +   // Do current task keywords match skill triggers?
  task_fit × 0.3 +         // Is this skill's purpose aligned with current task type?
  dependency_ready × 0.2 + // Are the skill's prerequisites met (other skills loaded, data available)?
  resource_available × 0.1 // Is there context budget to load this skill?
THRESHOLD: Activate if score > 0.5
```

**LEVEL 0 — ALWAYS-ON (6 skills, score = 1.0, cannot be disabled):**
  prism-life-safety-mindset — safety mindset for all operations
  prism-maximum-completeness — no incomplete work ships
  prism-anti-regression-process — replacement protection (atomic version)
  prism-predictive-thinking — anticipate failures before they happen
  prism-skill-orchestrator — manages which skills are active
  prism-mandatory-microsession — enforces session structure
  These load at session boot regardless of phase or task. Non-negotiable.

**LEVEL 2 — CONTEXT-ACTIVATED (keyword-triggered, task-specific):**
  Workflow skills activate by phase:
    brainstorm: "design", "plan", "brainstorm" → new work
    planning: "tasks", "breakdown", "schedule" → after brainstorm
    execution: "execute", "implement", "build" → actual work
    review: "review", "check", "verify" → quality gates
    handoff: "handoff", "session end" → session end

  Domain skills activate by content:
    prism-material-physics: "Kienzle", "Taylor", "cutting force" → physics work
    prism-hook-authoring: "register hook", "custom hook" → hook wiring
    prism-wiring-procedure: "wire database", "register consumer" → data infra
    prism-error-taxonomy: "throw error", "SafetyError" → error logic

  Session skills activate by state:
    prism-session-recovery: post-compaction or emergency state detected
    prism-context-pressure: tool call count exceeds 8 (yellow zone)

**LEVEL 3 — REFERENCE (loaded on-demand, not auto-activated):**
  Large reference skills loaded only when explicitly needed:
    prism-gcode-reference variants, prism-fanuc-programming, controller-specific skills
  Activation: user explicitly asks about the topic OR phase doc lists it as RECOMMENDED

**EXECUTION PROCEDURE for auto-loader cadence:**
  1. Read CURRENT_POSITION.md → extract phase
  2. Read phase doc → extract RECOMMENDED_SKILLS from header
  3. Load Level 0 skills (always)
  4. Score Level 2 skills against current context keywords
  5. Load all Level 2 skills scoring > 0.5
  6. Level 3 only if explicitly referenced in phase doc or user request

## What It Returns
- A scored list of skills ranked by activation score against current context
- Level 0: always loaded (6 skills), guaranteed present every session
- Level 2: loaded when score > 0.5, typically 3-8 skills per session depending on task
- Level 3: loaded on explicit demand only
- Feeds into: phase_skill_auto_loader (boot-time), skill_context_matcher (per-call)

## Examples
- Input: "Starting a DA session, task is 'split prism-formula-evolution into atomic skills'"
  Level 0: 6 skills loaded automatically
  Level 2 scoring: prism-sp-execution scores 0.85 (keyword "split" = execute). prism-anti-regression-process scores 0.72 (splitting = replacement risk). prism-skill-orchestrator already L0.
  Level 3: prism-formula-evolution loaded as source material (referenced in task)
  Total: 6 L0 + 2 L2 + 1 L3 = 9 skills active

- Input: "R2 session, task is 'implement Kienzle cutting force calculator'"
  Level 0: 6 skills loaded
  Level 2: prism-material-physics 0.95 (keyword "Kienzle" + "cutting force"), prism-error-taxonomy 0.65 (new calculator needs error handling), prism-wiring-procedure 0.60 (new calculator needs data wiring)
  Total: 6 L0 + 3 L2 = 9 skills active

- Edge case: "Post-compaction, no clear task context yet"
  Level 0: 6 skills loaded
  Level 2: prism-session-recovery 0.95 (post-compaction state detected). Nothing else scores above 0.5 yet.
  After recovery: re-evaluate with recovered context, load task-appropriate skills.
SOURCE: Split from prism-process-optimizer (25.2KB)
RELATED: prism-agent-selection
