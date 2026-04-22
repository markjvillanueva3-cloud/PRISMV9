---
name: forge-team
description: >
  3-agent team for feature development — architect plans, implementer codes,
  reviewer validates. Use for any non-trivial feature or engine creation.
agents:
  - code-archaeologist
  - dispatcher-wirer
  - physics-reviewer
model: sonnet
---

# Forge Team — Feature Development Pipeline

3-agent sequential team that takes a feature brief from concept to verified implementation.

## Orchestration Flow

### Step 1: Architecture Exploration (code-archaeologist)
- **Mode**: plan (read-only)
- **Model**: sonnet
- **Goal**: Explore codebase, identify patterns, suggest architecture
- **Input**: The feature brief
- **Process**:
  1. Read MASTER_INDEX_COMPACT.md and ENGINE_DIGEST.md for context
  2. Identify existing engines in the target domain
  3. Map dispatcher wiring patterns for similar engines
  4. Find test file conventions for the domain
  5. Propose: file locations, engine API surface, dispatcher target, schema shape
- **Output**: Write findings to `C:/tmp/prism-team-forge-step1.json`:
  ```json
  {
    "step": 1,
    "agent": "code-archaeologist",
    "status": "complete",
    "architecture": {
      "engine_path": "src/engines/...",
      "dispatcher": "calcDispatcher|camDispatcher|...",
      "action_names": ["action_one", "action_two"],
      "schema_file": "src/tools/schemas/...",
      "test_file": "tests/...",
      "similar_engines": ["ExistingEngine1", "ExistingEngine2"],
      "patterns_to_follow": ["lazy import", "z.enum sorted", "..."],
      "dependencies": ["engine1", "engine2"]
    },
    "notes": "..."
  }
  ```

### Step 2: Implementation (dispatcher-wirer)
- **Mode**: code (read-write)
- **Model**: sonnet
- **Goal**: Create engine, wire to dispatcher, add schema, export
- **Input**: Architecture from step 1 + original brief
- **Process**:
  1. Read `C:/tmp/prism-team-forge-step1.json` for architecture plan
  2. Create the engine file following patterns from similar engines
  3. Add action schema with Zod validation
  4. Wire to dispatcher: z.enum entry + case statement with lazy import
  5. Export from index.ts
  6. Run `npm run build:fast` to verify compilation
- **Output**: Write findings to `C:/tmp/prism-team-forge-step2.json`:
  ```json
  {
    "step": 2,
    "agent": "dispatcher-wirer",
    "status": "complete",
    "files_created": ["path1", "path2"],
    "files_modified": ["path3", "path4"],
    "actions_added": ["action_one", "action_two"],
    "build_status": "pass|fail",
    "build_errors": []
  }
  ```

### Step 3: Validation (physics-reviewer)
- **Mode**: plan (read-only)
- **Model**: opus
- **Goal**: Check formulas, run tests, verify build
- **Input**: Implementation from step 2 + original brief
- **Process**:
  1. Read `C:/tmp/prism-team-forge-step2.json` for created files
  2. Review every physics formula against canonical constants.ts
  3. Run existing tests: `npx vitest run <test-file> --reporter=verbose`
  4. Check for dimensional consistency in all formulas
  5. Verify constants are within published ranges
  6. Check that dispatcher wiring follows conventions
- **Output**: Write findings to `C:/tmp/prism-team-forge-step3.json`:
  ```json
  {
    "step": 3,
    "agent": "physics-reviewer",
    "status": "complete",
    "verdict": "PASS|WARN|BLOCK",
    "formulas_checked": 0,
    "findings": [
      {"severity": "CRITICAL|WARNING|INFO", "file": "...", "line": 0, "message": "..."}
    ],
    "test_results": {"total": 0, "passed": 0, "failed": 0},
    "build_verified": true
  }
  ```

## Handoff Protocol

Each agent writes its findings to `/tmp/prism-team-forge-{step}.json` (Windows: `C:/tmp/`).
The next agent in sequence reads the previous step output before starting.
If any step produces a BLOCK verdict, the pipeline halts and reports the blocking issue.

## Budget Guidelines

| Agent | Model | Max Turns | Estimated Tokens |
|-------|-------|-----------|-----------------|
| code-archaeologist | sonnet | 50 | ~15K |
| dispatcher-wirer | sonnet | 35 | ~25K |
| physics-reviewer | opus | 30 | ~20K |
| **Total** | | **115** | **~60K** |
