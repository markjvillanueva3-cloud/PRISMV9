---
name: "verify-loop"
description: "Build + Test + Review pipeline in one command"
effort: high
maxTurns: 20
policy:
  tier: 1
  triggers:
    - events:
      - "UserPromptSubmit"
      keywords:
      - "verify loop"
      - "build test review"
  mode: "suggest"
  priority: 50
  timeout_ms: 2000
  token_budget: 400
---

# Verify Loop — Build + Test + Review Pipeline

Run the full verification pipeline: build check, test run, and optional review. Ensures code is correct, tested, and reviewed before proceeding.

## Advisor Strategy (`advisor_20260301`)
- **Executor**: Sonnet 4.6 (runs build, tests, review checks)
- **Advisor**: none — this command IS the verification layer. Adding an advisor on top of verification creates circular overhead with no quality gain.

## Args: $ARGUMENTS
- Empty: full loop (build + test + review)
- `build`: build check only
- `test`: build + test only (skip review)
- `quick`: build only, fast exit
- `[file-path]`: scope verification to files related to this path

## Step 1: Build Check
```bash
cd H:/prism/mcp-server && npx tsc --noEmit
```

If build fails:
- Report error count and first 5 errors
- Stop here — no point testing broken code
- Suggest: "Fix build errors before continuing"

## Step 2: Run Tests (skip if `build` or `quick` arg)

Before running tests, verify that the selected tests are legitimate for the code you changed:
- Changed files must map to the tests being run
- Route/workflow changes must include upstream/downstream continuity assertions on concrete URL params
- Weak "link exists" tests do not count

Determine which tests to run based on changed files:
```bash
cd H:/prism/mcp-server && git diff --name-only HEAD | grep '\.ts$'
```

For each changed file, find its test file:
- `src/engines/FooEngine.ts` → `src/engines/__tests__/FooEngine.test.ts`
- `src/tools/dispatchers/fooDispatcher.ts` → look for related test

Run targeted tests:
```bash
cd H:/prism/mcp-server && npx vitest run --reporter=verbose [test-files]
```

If no specific test files found, run the full suite:
```bash
cd H:/prism/mcp-server && npx vitest run
```

Report: pass count, fail count, duration.

If tests fail:
- Report failing test names and first assertion error
- Stop here — don't review broken tests
- Suggest: "Fix failing tests before review"

## Step 3: Review (skip if `build` or `test` arg)

Only runs if build passes AND tests pass.

Run a quick inline review (no agent dispatch — save tokens):
- Check changed files for obvious issues
- Verify imports resolve
- Check for `console.log` in production code
- Check for `any` types
- Verify engine conventions (static methods, AtomicValue returns)

## Step 4: Report

```
Verify Loop Report
==================
Build:    PASS/FAIL ([N] errors)
Tests:    PASS/FAIL ([N] passed, [N] failed, [N] skipped)
Review:   PASS/WARN ([N] issues found)

Duration: [N]s

Status: READY TO PROCEED / BLOCKED — [reason]
```

## Chaining
- After engine creation: `/verify-loop` → confirms everything works
- Before commit: `/verify-loop test` → build + test
- Quick sanity check: `/verify-loop quick` → just build
- In roadmap sessions: part of the 4-LOOP protocol (LOOP 1=BUILD, LOOP 2=SCRUTINIZE, LOOP 3=GAP FILL)
