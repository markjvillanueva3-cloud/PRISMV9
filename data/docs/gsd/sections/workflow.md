## SUPERPOWERS WORKFLOW — When to Use Each Phase

### BRAINSTORM (prism_sp action=brainstorm)
WHEN: Starting ANY new feature, refactor, or complex fix
HOW: Provide problem + context. Returns 7-lens analysis grounded in PRISM data.
RULE: Present results to user. AWAIT APPROVAL before implementing.
SKIP IF: Simple bug fix, typo correction, config change

### PLAN (prism_sp action=plan)  
WHEN: After brainstorm approval for tasks >50 lines
HOW: Define steps, checkpoints, dependencies, quality gates
OUTPUT: Numbered step list with completion criteria

### EXECUTE (prism_sp action=execute)
WHEN: Plan approved, implementation begins
HOW: Follow plan steps. Monitor buffer zones. Checkpoint at milestones.
RULE: If diverging from plan, pause and update plan first.

### REVIEW (prism_sp action=review_spec + review_quality)
WHEN: Implementation complete, before declaring done
HOW: review_spec checks requirements coverage, review_quality checks S(x)
RULE: S(x)<0.70 = HARD BLOCK. Do not proceed until resolved.

### DEBUG (prism_sp action=debug)
WHEN: Tests fail, unexpected behavior, or quality gate fails
HOW: Provide error context. System analyzes with D3 error patterns.
TIP: Check prism_guard→failure_library first — the error may be known.

### RALPH LOOPS — Layered Validation
Quick sanity check → prism_ralph→scrutinize (1 API call, ~10s)
Full validation → prism_ralph→loop (4-7 API calls, ~60s)
Final assessment → prism_ralph→assess (Opus reviewer, definitive grade)

Use scrutinize for: code changes, config updates, small features
Use loop for: infrastructure changes, safety-related code, new engines
Use assess for: release candidates, milestone completions

### DECISION SHORTCUT
Is it a 5-minute fix? → Just do it. Skip brainstorm.
Is it touching safety calcs? → Full workflow + Ralph loop. No shortcuts.
Is it a new feature? → Brainstorm first. Always.
Am I unsure? → Ask the user. Don't assume.

## Changelog
- 2026-02-10: v3.0 — Content-optimized. When-to-use guidance. Ralph tier descriptions. Decision shortcuts.
- 2026-02-10: v2.0 — File-based.
