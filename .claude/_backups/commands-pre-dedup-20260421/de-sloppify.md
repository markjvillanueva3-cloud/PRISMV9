---
name: "de-sloppify"
description: "Focused post-generation quality cleanup"
effort: medium
maxTurns: 15
model: haiku
policy:
  tier: 1
  triggers:
    - events:
      - "UserPromptSubmit"
      keywords:
      - "de-sloppify"
      - "cleanup generation"
      - "tidy output"
  mode: "suggest"
  priority: 45
  timeout_ms: 2000
  token_budget: 400
---

# De-Sloppify — Focused Post-Generation Cleanup

A focused cleanup pass that runs AFTER code generation and review. Catches mechanical issues that creative/review agents tend to miss: formatting, naming inconsistencies, import order, dead code, and style drift.

**Design principle**: "Two focused agents outperform one constrained agent." Generation agents should focus on correctness. This agent focuses on polish.

## Advisor Strategy (`advisor_20260301`)
- **Executor**: Haiku 4.5 (mechanical pattern-matching, import sorting, naming checks)
- **Advisor**: none — no advisor needed for cosmetic cleanup
- Haiku handles this entirely at lowest cost. After cleanup, verify build still passes (`tsc --noEmit`).

## Args: $ARGUMENTS
- Empty: clean up all recently modified files (git diff --name-only)
- `[file-path]`: clean up a specific file
- `staged`: clean up staged files only

## Step 1: Identify Target Files

```bash
# Get files to clean
git diff --name-only HEAD 2>/dev/null || git diff --cached --name-only 2>/dev/null
```

Filter to `.ts`, `.tsx`, `.mjs` files only. Skip test files unless explicitly targeted.

## Step 2: Mechanical Cleanup Checks

For each file, check and fix these categories:

### A. Import Hygiene
- Remove unused imports (imported but never referenced in file body)
- Sort imports: node builtins → external packages → internal (@/ or relative)
- Remove duplicate imports
- Prefer `import type` for type-only imports in TypeScript

### B. Naming Consistency
- Engine files: must be PascalCase matching class name (e.g., `SpeedFeedEngine.ts` → `class SpeedFeedEngine`)
- Variables/functions: camelCase (not snake_case unless matching external API)
- Constants: UPPER_SNAKE_CASE for true constants, camelCase for computed values
- No single-letter variables except loop indices (`i`, `j`, `k`)

### C. Dead Code Removal
- Commented-out code blocks (>3 lines of commented code = dead code)
- Unreachable code after return/throw
- Empty catch blocks (must at least have `// intentionally empty` or error handling)
- Unused local variables (not just imports — local `const`/`let` that are set but never read)

### D. Format Consistency
- Consistent semicolons (match file's dominant style)
- Consistent quotes (match file's dominant style — single vs double)
- No trailing whitespace
- No more than 1 consecutive blank line
- Consistent brace style

### E. TypeScript Strictness
- No `any` type annotations — use `unknown` + type guards or proper types
- No `@ts-ignore` without explanation comment
- No non-null assertions (`!`) without justification
- Prefer `interface` over `type` for object shapes (project convention)

### F. Console/Debug Cleanup
- Remove `console.log` from production code (keep in test files)
- Remove `debugger` statements
- Remove `TODO` comments that reference completed work

## Step 3: Apply Fixes

Use Edit tool to fix each issue. Group fixes by file to minimize edits.

## Step 4: Verify

Run `npx tsc --noEmit` to ensure no type errors were introduced.

## Step 5: Report

```
De-Sloppify Report
==================
Files cleaned: [N]
Issues fixed:  [N]
  Imports:     [N] (unused removed, sorted)
  Dead code:   [N] (commented blocks, unreachable)
  Naming:      [N] (inconsistencies fixed)
  Format:      [N] (whitespace, blank lines)
  TypeScript:  [N] (any→unknown, missing types)
  Console:     [N] (debug output removed)

Build: PASS/FAIL
```

## When to Use
- After `/forge-engines` or any engine creation
- After `/prism-review` fixes (review agents fix logic, de-sloppify fixes style)
- Before `/auto-commit` as a final polish pass
- Anytime code feels "messy but correct"

## When NOT to Use
- On files you didn't modify (don't cleanup the entire codebase)
- On test files (test style is intentionally different)
- Before review (review first, cleanup after)
