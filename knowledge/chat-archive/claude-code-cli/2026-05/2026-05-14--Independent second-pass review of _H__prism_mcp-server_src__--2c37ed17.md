---
type: "chat-session"
source: "claude-code-cli"
session_id: "2c37ed17-584a-4913-9d0f-8eb3cdcea8df"
title: "Independent second-pass review of `H:/prism/mcp-server/src/__tests__/SystemVizAd"
date: "2026-05-14"
first_ts: "2026-05-14T02:50:47.817Z"
last_ts: "2026-05-14T02:55:30.477Z"
cwd: "H:\\prism\\mcp-server"
messages: 7
user_msgs: 3
assistant_msgs: 4
raw_file: "H:/.claude/projects/H--prism/2c37ed17-584a-4913-9d0f-8eb3cdcea8df/subagents/agent-ab1055eeadc34a7a6.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:09"
---

# Independent second-pass review of `H:/prism/mcp-server/src/__tests__/SystemVizAd

> **claude-code-cli** | 2026-05-14 | 7 msgs (3 user / 4 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/2c37ed17-584a-4913-9d0f-8eb3cdcea8df/subagents/agent-ab1055eeadc34a7a6.jsonl`

## Transcript

### User | 2026-05-14T02:50:47.817Z

Independent second-pass review of `H:/prism/mcp-server/src/__tests__/SystemVizAddNode.test.ts`. Do not assume the test-review-agent caught everything. Weight your review toward:

- **Integration gaps**: does the test SUFFICIENTLY cover `flushQueue` interaction with `main()`, the order of operations under `--force-flush`, error-code propagation through all three exit codes (0/1/2)?
- **Hidden coverage holes**: are there public exports of `H:/prism/scripts/system-viz-add-node.mjs` (v3, the version that exists right now) that have NO test? Run-down the export list and match to test cases.
- **Mocks discipline**: any mocked filesystem? any spy that doesn't actually intercept what the test claims to verify? (Recall: `vi.spyOn(esm-namespace)` does NOT intercept intra-module calls — was a real bug we caught in v2 of this test.)
- **TYPE casts** — `as never`, `as { ... }` — are they hiding real bugs?
- **Process-mutating tests**: any test that leaks state across files (env vars, listeners, mkdtempSync without cleanup, mocked console.log without restore)?
- **Off-by-one or magic-number couplings**: e.g. test asserts `flushed === 200` only because `MAX_BATCH === 200`. Tests should import the constant, not hardcode.
- **Test naming + organisation**: do `describe` blocks group by method (per H:/.claude/rules/tests.md "Group tests by method in nested describe blocks")?
- **Vitest v4 compat**: any deprecated API used?

Verify against the v3 script at `H:/prism/scripts/system-viz-add-node.mjs` — its exports are: FLUSH_INTERVAL_MS, MAX_BATCH, MAX_QUEUE_BYTES, VALID_LAYERS, DEFAULT_LAYER, ENGINE_SUBGROUP, DASHED_STATUS, DASHED_SIZE, DASHED_COLOR, DEFAULT_SOURCE, SCRIPT_EXTENSIONS_RE, ID_VALIDATION_RE, vizDir, stagingDir, queuePath, lastFlushPath, pidFilePath, graphPath, slugifyLabel, normalizeLayer, validateRawId, buildNodeEntry, readQueue, isDuplicate, atomicWriteJson, atomicWriteText, appendQueue, msSinceLastFlush, acquirePidLock, releasePidLock, computeConcurrentAdds, flushQueue,
... [+100 chars truncated]

### Assistant | 2026-05-14T02:50:53.143Z

I'll perform an independent second-pass review of the test file against the v3 script.

### Assistant | 2026-05-14T02:50:53.593Z

[tool_use: Read]

### Assistant | 2026-05-14T02:50:53.861Z

[tool_use: Read]

### User | 2026-05-14T02:50:54.173Z

[tool_result] 1	/**
2	 * SystemVizAddNode.test.ts — integration + unit tests for
3	 * `H:/prism/scripts/system-viz-add-node.mjs` (U-CLEANUP-C3).
4	 *
5	 * Isolation strategy: each test creates a tmpdir, points
6	 * PRISM_SYSTEM_VIZ_DIR at it, exercises pure helpers + main()
7	 * in-process. No subprocess spawn — script is pure ESM so the
8	 * exports + main() are importable directly into vitest.
9	 *
10	 * Real
... [+29098 chars truncated]

### User | 2026-05-14T02:54:37.774Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * system-viz-add-node.mjs — Incremental dashed-node staging for system-viz.
4	 *
5	 * Spec: CLEANUP-MS0 / U-CLEANUP-C3
6	 *
7	 * Bridges the ~100s latency between full system-viz regenerations
8	 * (`generate-system-viz.mjs` rebuilds the whole 20K-node graph from
9	 * scratch) by appending "dashed" provisional nodes to the live graph
10	 * as soon as new engines / di
... [+25571 chars truncated]

### Assistant | 2026-05-14T02:55:30.477Z

Now I have full context. Performing the independent second-pass review.

## Export Coverage Audit (v3 script)

Cross-checking the 32 named exports against test cases:

| Export | Test? | Notes |
|---|---|---|
| `FLUSH_INTERVAL_MS` | NO direct test | Only referenced indirectly via env override |
| `MAX_BATCH` | YES | Imported (`m.MAX_BATCH`), not hardcoded — good |
| `MAX_QUEUE_BYTES` | YES | Imported (`m.MAX_QUEUE_BYTES`) — good |
| `VALID_LAYERS` | NO direct test | Implicitly tested via `normalizeLayer` |
| `DEFAULT_LAYER` | NO direct test | Implicitly via `buildNodeEntry` (asserts "L5" hardcoded) |
| `ENGINE_SUBGROUP` | YES | `expect(e.subgroup).toBe(m.ENGINE_SUBGROUP)` |
| `DASHED_STATUS`/`SIZE`/`COLOR` | YES | All three asserted |
| `DEFAULT_SOURCE` | YES | Asserted |
| `SCRIPT_EXTENSIONS_RE` | NO direct test | Used implicitly |
| `ID_VALIDATION_RE` | NO direct test | Used implicitly |
| `vizDir`/`stagingDir`/`queuePath`/`lastFlushPath`/`pidFilePath`/`graphPath` | partial | Called but never asserted that they resolve under `PRISM_SYSTEM_VIZ_DIR` |
| `slugifyLabel` | YES | 5 cases |
| `normalizeLayer` | YES | 3 cases |
| `validateRawId` | YES | 4 cases |
| `buildNodeEntry` | YES | 5 cases |
| `readQueue` | YES | 5 cases including __proto__ pollution + tooLarge |
| `isDuplicate` | YES | 4 cases |
| `atomicWriteJson`/`atomicWriteText` | YES | 3 cases |
| `appendQueue` | NO direct test | Only used via flushQueue/main tests |
| `msSinceLastFlush` | YES | 3 cases |
| `acquirePidLock`/`releasePidLock` | YES | 4 cases — covers dead PID reclaim + foreign PID no-op |
| `computeConcurrentAdds` | YES | 4 cases including malformed entries |
| `flushQueue` | YES | 8 cases |
| `parseArgv` | YES | 4 cases |
| `labelFromEngineFile` | YES | 1 case (thin but acceptable) |
| `emit` | NO test | Indirectly via main() JSON output |
| `main` | YES | 9 integration cases |

## Findings

**P1 — Three exit-code-2 paths are untested.** The script header documents exit code 2 ("unexpected ru
... [+7461 chars truncated]
