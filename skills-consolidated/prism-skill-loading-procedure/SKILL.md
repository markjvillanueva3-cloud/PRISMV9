---
name: prism-skill-loading-procedure
description: How to decide which skills to load at session boot and during execution — 5 loading levels, trigger pattern matching, and the priority cascade
---
# Skill Loading Procedure

## When To Use
- At session start when deciding which skills to load into context
- "Which skills do I need for this task?" / "How do I load the right skills?"
- When building the phase_skill_auto_loader cadence function (MS11)
- When a user message contains trigger words that should activate domain skills
- NOT for: how to author or split skills (use skill-authoring-checklist)
- NOT for: hook system details (use prism-hook-authoring)
- NOT for: the PSI combination equation math (use prism-psi-equation)

## How To Use
Skills load at 5 priority levels. Higher levels load first, lower levels on-demand.

**LEVEL 0 — ALWAYS-ON (load every session, no decision needed):**
  These are the session infrastructure skills. Auto-loaded at boot by phase_skill_auto_loader.
  Includes: session-lifecycle, context-pressure, anti-regression-process, error-taxonomy,
  hook-enforcement, code-review-checklist, session-recovery
  Size budget: ~25KB total (7 skills x ~3.5KB avg)
  These never unload. They're the operating system.

**LEVEL 1 — COGNITIVE (load for complex tasks):**
  Loaded when task requires multi-step reasoning, planning, or debugging.
  Trigger: prism_sp brainstorm/plan/execute/review actions
  Includes: sp-brainstorm, sp-planning, sp-execution, sp-review-quality, sp-verification
  Size budget: ~20KB

**LEVEL 2 — WORKFLOW (load by current phase):**
  Loaded based on CURRENT_POSITION.md phase. Phase doc header lists RECOMMENDED_SKILLS.
  DA phase: skill-authoring-checklist, wiring-procedure, batch-execution
  R1 phase: data-pipeline, registry-hydrator, wiring-validation
  R2 phase: material validation skills, physics skills, safety skills
  R6+ phase: all domain skills available
  Auto-loader reads phase → loads matching L2 skills

**LEVEL 3 — DOMAIN (load by task content):**
  Loaded when user message or current action matches trigger patterns:
  "material|127 param|kc1" → material skills
  "speed|feed|calc|cutting" → calculation skills
  "fanuc|0i|30i" → fanuc-programming
  "siemens|840D|sinumerik" → siemens-programming
  "validate|check|verify" → validation skills
  "gcode|g-code|post" → gcode skills
  skill_context_matcher cadence function handles this at runtime

**LEVEL 4 — REFERENCE (load on explicit request only):**
  Large reference skills that shouldn't auto-load (knowledge dumps, not procedures).
  Load only when user explicitly asks or task specifically requires deep reference.
  Includes: solid-principles (30KB reference), design-patterns (16KB reference),
  fanuc-programming (54KB reference), gcode-reference (62KB reference)
  These stay on disk until explicitly called.

**LOADING DECISION TREE:**
  Session starts → L0 always loads (infrastructure)
  Complex task detected → L1 loads (cognitive)
  Phase checked → L2 loads (workflow for current phase)
  User message parsed → L3 loads (domain triggers matched)
  Explicit request → L4 loads (reference on demand)

**CONTEXT BUDGET:**
  Total skill budget: ~80KB of context window
  L0: 25KB (always). L1: 20KB (when active). L2: 15KB. L3: 15KB. L4: 5KB (one at a time).
  If pressure enters ORANGE zone: unload L3/L4 skills first, keep L0/L1.

## What It Returns
- At boot: L0 + L2 skills loaded (infrastructure + phase-appropriate)
- During task: L1 loaded if complex, L3 loaded on trigger match
- On demand: L4 loaded for specific reference needs
- Budget tracking: total loaded KB vs 80KB budget, with unload recommendations at pressure
- The cadence functions phase_skill_auto_loader and skill_context_matcher automate L0-L3

## Examples
- Input: "Starting a new session in DA-MS10 phase"
  L0: auto-load 7 infrastructure skills (session, error, anti-regression, hooks)
  L2: auto-load DA workflow skills (skill-authoring-checklist, wiring-procedure)
  Total loaded: ~35KB. Well within budget. L1/L3/L4 on standby.

- Input: "User asks about calculating cutting forces for 4140 steel"
  L3 trigger match: "cutting forces" + "4140 steel" → load material skills + calculation skills
  skill_context_matcher fires → loads prism-error-taxonomy (force calc can fail),
  prism-python-validation-scripts (may need to validate material data)

- Edge case: "Context pressure hits ORANGE at 75% with 6 L3 skills loaded"
  Action: unload L3 domain skills (they can be re-loaded later)
  Keep: L0 (infrastructure, never unload) + L1 (if task active)
  Announce: "Unloaded 4 domain skills to reduce pressure. Will reload on demand."
SOURCE: Split from prism-skill-orchestrator (22.4KB)
RELATED: prism-context-pressure, prism-session-lifecycle, prism-skill-activation
