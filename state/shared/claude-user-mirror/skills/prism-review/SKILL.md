---
name: prism-review
description: Run PRISM-specific code review on recent changes. Dispatches physics, wiring, and test review agents sequentially.
model: sonnet
effort: high
argument-hint: "[--pr <number>|--files <path>|--last-commit]"
allowed-tools: ["Agent", "Bash", "Read", "Grep", "Glob", "Write", "Edit"]
---

# PRISM Code Review Skill

Run domain-aware code review for PRISM changes, covering physics formulas, dispatcher wiring, and test coverage.

## Usage
- /prism-review --last-commit    Review changes in the last commit
- /prism-review --files src/engines/NewEngine.ts    Review specific files
- /prism-review --pr 42    Review a GitHub PR (requires gh CLI)

## Procedure

### 1. Determine Review Scope

**If --pr <number>:**
Run: gh pr diff <number> --name-only
Get the list of changed files from the PR.

**If --files <path>:**
Use the provided file path(s) directly. Supports glob patterns.

**If --last-commit (default):**
Run: git diff --name-only HEAD~1
Get files changed in the most recent commit.

Filter to relevant files:
- Engine files: src/engines/**/*Engine.ts
- Dispatcher files: src/tools/dispatchers/*.ts
- Schema files: src/schemas/*.ts
- Physics files: src/physics/*.ts
- Test files: src/__tests__/**/*.test.ts
- Route files: src/routes/*.ts

### 2. Perform Review (INLINE by default)

**DEFAULT: Inline review** — do all 3 review passes yourself without spawning agents.
This avoids API rate limits and is faster for typical review scopes (< 10 files).
Read the files directly using Read/Grep tools and check each domain.

**Only use Agent tool for large scopes** (> 10 engine files) where inline would be too slow.
If you do use agents, use `model: "haiku"` and run them sequentially.
If ANY agent returns incomplete or errors, do that pass inline immediately — never retry.

**Pass 1: Physics Review**
- Read each engine file in the change set
- Check: Formula correctness, constants references (should import from constants.ts not inline),
  dimensional analysis (units match), safety factors present
- For non-physics engines (UI, data aggregation, business logic): note "N/A" and skip
- Grep for hardcoded physics values that should be canonical imports

**Pass 2: Wiring Review**
- Grep engines/index.ts for each engine's export
- Grep dispatchers/ for each engine's import and case statement
- Check z.enum includes the action name
- Verify schema exists for new actions
- Check action names are unique across dispatchers

**Pass 3: Test Review**
- Check each engine has a test file in __tests__/
- Verify new features/methods have test coverage
- Check edge cases: unknown inputs, fallback paths, boundary values
- Verify test count is adequate for complexity

### 3. Aggregate Findings

Collect findings from all three agents and merge into a unified report.

Sort findings by severity: CRITICAL > HIGH > MEDIUM > LOW

Deduplicate findings that multiple agents may have flagged.

Severity guide:
- **CRITICAL**: Wrong physics formula, missing safety check, data corruption risk
- **HIGH**: Missing dispatcher wiring, no tests, hardcoded constants that should be canonical
- **MEDIUM**: Missing index.ts export, static data instead of registry, no integration tests
- **LOW**: Missing JSDoc, minor style issues, optional improvements

### 4. Output Unified Report

Format:

## PRISM Code Review Report

**Scope**: [description of what was reviewed]
**Files Reviewed**: [count]
**Engines Analyzed**: [count]

### CRITICAL Findings (blocking)
[list or "None"]

### HIGH Findings (blocking)
[list or "None"]

### MEDIUM Findings (informational)
[list or "None"]

### LOW Findings (informational)
[list or "None"]

### Summary
- Physics: [pass/fail] ([count] findings)
- Wiring: [pass/fail] ([count] findings)
- Tests: [pass/fail] ([count] findings)
- **Overall**: [PASS / NEEDS CHANGES]

PASS = no CRITICAL or HIGH findings
NEEDS CHANGES = any CRITICAL or HIGH finding present

### 5. Save Findings for Validation Loop (4-LOOP SUPPORT)
Write the findings count and severity breakdown to `C:/PRISM/state/last-review-findings.json`:
```json
{
  "timestamp": "<ISO>",
  "scope": "<files reviewed>",
  "critical": <count>,
  "high": <count>,
  "medium": <count>,
  "low": <count>,
  "total": <count>,
  "verdict": "PASS|NEEDS CHANGES"
}
```
This file is read by LOOP 4 (VALIDATE) to confirm that a re-review shows findings decreased after fixes.

### 6. Reset Review Gate
After completing the review, reset the engine edit counter so the review-gate hook allows further edits:
- Update `C:/PRISM/state/session-edit-counter.json`: set `engine_edits_since_review` to 0, increment `prism_review_count`

### 7. Metrics (if telemetry enabled)
Append review results to ~/.prism/telemetry/review-metrics.jsonl via the review-metrics.py script.
