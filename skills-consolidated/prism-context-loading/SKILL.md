---
name: prism-context-loading
description: Step-by-step procedure for loading codebase into Claude's context — token counting, 4-step reduction pipeline, module splitting strategy, and session loading workflow
---
# Context Loading Procedure

## When To Use
- Starting a session that needs codebase context (refactoring, extraction, architecture review)
- "How do I get this code into Claude?" / "Codebase is too large for context"
- After repomix pack, when the output exceeds Claude's token limit
- When deciding which modules to load for the current task
- NOT for: repomix command syntax (use prism-repomix-patterns)
- NOT for: managing context pressure during a session (use prism-context-pressure)

## How To Use
**STEP 1: ASSESS TOKEN BUDGET**
  Run `repomix --token-count-tree` on the packed output.
  Claude context limits (approximate usable for code):
    Opus: ~150K tokens available for code (200K total minus system + conversation)
    Sonnet: ~150K tokens available
    Haiku: ~150K tokens available
  If packed output < 50% of available: load directly, proceed.
  If packed output > 50% of available: apply reduction pipeline.

**STEP 2: REDUCTION PIPELINE (apply in order, stop when under budget)**
  Priority 1: Filter to relevant files only
    `repomix --include "src/materials/**"` — module-level filtering
    Typical reduction: 60-90% depending on codebase size
  Priority 2: Compress
    `repomix --compress` — whitespace removal, identifier shortening
    Typical reduction: ~70% of remaining
  Priority 3: Remove comments
    `repomix --remove-comments` — strips all comments/JSDoc
    Typical reduction: ~20% additional
  Priority 4: Remove line numbers
    `repomix --no-line-numbers` — saves ~10% additional
  Combined: filter + compress + remove-comments typically achieves 90%+ reduction.

**STEP 3: SPLIT IF STILL OVER BUDGET**
  Split by module boundaries (not arbitrary line counts):
    Materials pack: src/materials/** → ~25K tokens
    Engines pack: src/engines/** → ~30K tokens
    Safety pack: src/safety/**, src/validate/** → ~15K tokens
    Tools pack: src/tools/** → ~15K tokens
    Core pack: src/core/**, src/dispatchers/** → ~20K tokens
  Load the module relevant to current task. Cross-reference across sessions.
  Rule: never split mid-file. Always split at directory boundaries.

**STEP 4: SESSION LOADING WORKFLOW**
  1. Identify task scope: which modules does this task touch?
  2. Does task need codebase context? (architecture work = yes, skill writing = no)
  3. If yes: run repomix with appropriate filters (Pattern 1-5 from repomix-patterns)
  4. Check token count against budget
  5. Under limit? → upload directly to Claude
  6. Over limit? → apply reduction pipeline, then split if needed
  7. Prime Claude: "Here is the [module] source. I need to [task]. Focus on [specific area]."

**WHAT NOT TO LOAD:**
  Test files (unless debugging tests): --exclude "**/*.test.ts,**/*.spec.ts"
  Node modules: automatically excluded by repomix
  Build artifacts: --exclude "dist/**,build/**"
  Generated files: --exclude "**/*.generated.ts"

## What It Returns
- A right-sized code context loaded into Claude's working memory
- Token utilization: code takes up 30-50% of context, leaving room for conversation
- Module isolation: only relevant code loaded, reducing noise and token waste
- Clear loading record: which modules are in context, which are not

## Examples
- Input: "Starting architecture review of PRISM materials system"
  Step 1: `repomix --token-count-tree` → full monolith is 200K tokens. Over budget.
  Step 2: Filter → `--include "src/materials/**,src/engines/material*.ts"` → 25K tokens. Under 50%.
  Step 3: not needed (25K < 75K threshold).
  Step 4: Upload materials pack. Prime: "This is the materials engine. Map dependencies and suggest extraction boundaries."

- Input: "Need to compare safety module before and after refactor"
  Pack old: `repomix --include "src/safety/**" --style json -o old-safety.json` → 15K
  Pack new: same command on new codebase → 18K
  Combined: 33K tokens. Under budget. Upload both. Compare.

- Edge case: "Need full codebase context for cross-cutting refactor"
  Can't filter to one module — refactor touches everything.
  Strategy: load core + dispatchers first (20K). Do architecture mapping.
  Then load each module in follow-up messages as needed.
  Never try to load 200K tokens at once — quality degrades past ~100K.
SOURCE: Split from prism-codebase-packaging (18.6KB)
RELATED: prism-repomix-patterns, prism-context-pressure
