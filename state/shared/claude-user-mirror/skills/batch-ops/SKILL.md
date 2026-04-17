---
name: batch-ops
description: Run batch operations across PRISM domains - parallel skill updates, test sweeps, catalog enrichment using /batch infrastructure.
model: sonnet
effort: medium
argument-hint: "[update-skills|test-sweep|catalog-refresh]"
---

# PRISM Batch Operations

Run parallelized batch operations across PRISM subsystems. Each operation uses worktrees or sequential batching for isolation.

## Commands

### update-skills
Update skill frontmatter across all PRISM skills in parallel.

1. Find all SKILL.md files under C:/Users/Admin.DIGITALSTORM-PC/.claude/skills/
2. For each skill file:
   - Parse the YAML frontmatter
   - Validate required fields: name, description, model, effort
   - Check argument-hint is present for skills that take arguments
   - Report any missing or malformed frontmatter
3. If --fix flag given, auto-correct:
   - Add missing effort: low default
   - Normalize model names (haiku/sonnet/opus)
   - Ensure description ends with period
4. Output: table of skills with validation status

### test-sweep
Run PRISM test suites in batched groups to identify failures.

1. Define test groups:
   - **engines**: C:/PRISM/mcp-server/src/__tests__/engines/**/*.test.ts
   - **dispatchers**: C:/PRISM/mcp-server/src/tools/**/*.test.ts
   - **pipelines**: C:/PRISM/mcp-server/src/__tests__/engines/*Pipeline*.test.ts
   - **schemas**: C:/PRISM/mcp-server/src/tools/schemas/*.test.ts
   - **algorithms**: C:/PRISM/mcp-server/src/algorithms/**/*.test.ts

2. For each group, run:
   cd C:/PRISM/mcp-server && npx vitest run <pattern> --reporter=verbose 2>&1 | tail -30

3. Collect results per group: total, passed, failed, skipped
4. Generate summary table with pass rates
5. List all failing test names grouped by file
6. Save results to ~/.prism/telemetry/batch-test-sweep.jsonl

### catalog-refresh
Re-validate all PRISM catalog data files.

1. Identify catalog files in C:/PRISM/mcp-server/src/data/:
   - machine-profiles-catalog*.ts (910 machines)
   - *-tool-catalog*.ts (95K+ tools)
   - *-holder*.ts (1332 holders)
   - material*.ts (2957 materials)
   - workholding-catalog.ts (44 entries)
   - machine-kinematics*.ts (250 machines)

2. For each catalog file:
   - Check file exists and is non-empty
   - Count exported array entries (grep for object patterns)
   - Compare count against known baselines from MEMORY.md
   - Flag any significant decreases (>5% drop = potential data loss)

3. Output: catalog name | entry count | baseline | status (OK/WARN/DRIFT)
4. Save to ~/.prism/telemetry/catalog-refresh.jsonl

## Output Format
Always produce compact tables. Save structured results to telemetry. Report anomalies prominently at the top.
