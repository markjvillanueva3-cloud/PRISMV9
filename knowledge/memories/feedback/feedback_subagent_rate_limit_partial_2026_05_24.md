---
name: subagent-rate-limit-partial-output
description: "When a dispatched subagent is rate-limited mid-flight, files WRITTEN before the limit hit will be on disk but the per-file scrutiny gate the agent would have run is BYPASSED. Parent MUST verify output before committing — confirmed 2 P0 bugs in iter23 D2 output (matchAll non-global regex + isMain argv guard) that the agent's reviewer pass would have caught."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.446Z
aliases: feedback_subagent_rate_limit_partial_2026_05_24
---


# Subagent rate-limit partial output — verify before commit

## Rule

When you dispatch parallel subagents and one (or more) returns with `API Error: Server is temporarily limiting requests` (Anthropic rate-limit), **the files the agent wrote BEFORE the limit hit will be on disk**, but the per-file scrutiny gate the agent would have run AFTER each Write is **bypassed**.

Before committing such output, the parent agent MUST:
1. `git status` to see exactly which files landed
2. Sanity-check syntax / type-check / test-run each file
3. Run the bug-finding pass the rate-limited agent would have run (parseProductUrl direct invocation, parseRobotsAllow against fixtures, etc.)
4. Write any missing test file (the test-coverage hook may have surfaced "no test file found" — that's a real signal, the agent didn't get to that step)
5. Only then commit

**Why:** The per-file scrutiny gate (2 parallel reviewers per file before next file) is designed to catch compound errors. When the agent skips it due to rate-limit, parent inherits the safety responsibility.

## Confirmed examples (iter23, 2026-05-24)

3-parallel-spawn (D2 + D6 + E2 of TOOL-CATALOG-INGEST-MS0):
- **D6 (coder)**: completed both .mjs + test file → 31/31 tests PASS first try. Clean ship.
- **D2 (coder)**: returned a partial result (agent ID `a264d5ec74268cda6`) after writing the .mjs but BEFORE writing the test file. Parent wrote the test, then **discovered 2 P0 bugs**:
  1. `parseProductUrl` regex used `matchAll` with a non-global `/i` regex (matchAll REQUIRES `/g` — TypeError at runtime)
  2. `isMain` detection crashed on `process.argv[1]` being undefined (when imported via `node -e "import(...)"`)
  Both bugs ship-blocked the file. The agent's per-file scrutiny reviewer would have caught them — confirmed because both bugs are visible on first runtime invocation.
- **E2 (code-analyzer)**: similar — .ts file landed clean (tsc PASS), test file missing. Parent wrote 29-case test, no source bugs found (the .ts was actually high-quality, code-analyzer is more careful than coder).

## How to apply

When the operator authorizes parallel-agent dispatch and any returned with `Rate limited`:

```
1. cd <slot worktree> && git status --short    # what landed?
2. For each new file:
   - node --check <script.mjs>                  # syntax
   - npx tsc --noEmit <module.ts>               # types
   - run a minimal smoke invocation             # bugs the gate would have caught
3. If test file missing → parent writes it (see template in iter23 commits)
4. Commit each unit serially with a "subagent-built; parent fixed N P0 bugs" note
5. Record any bug class learned (e.g. matchAll without /g) for future enforcement
```

Speedup math still favors parallel-spawn even with the verification cost: 3 units shipped in iter23 in 1 wallclock window vs. 1 unit per cron-fire serial. Parent's verification time is ~5 min/unit vs. 30+ min serial build/test.

## Related

- [[reference_tool_catalog_ingest_iter20_21_2026_05_24]] — prior session (serial-only)
- [[feedback_parallel_scrutiny_per_file]] — the per-file scrutiny rule that subagent rate-limits cause to be skipped
- [[feedback_always_close_out]] — parent inherits close-out + scrutiny responsibility
