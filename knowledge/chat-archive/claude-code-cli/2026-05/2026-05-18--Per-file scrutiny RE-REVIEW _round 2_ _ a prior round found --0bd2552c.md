---
type: "chat-session"
source: "claude-code-cli"
session_id: "0bd2552c-f488-4919-a1de-61b8dee1f055"
title: "Per-file scrutiny RE-REVIEW (round 2) — a prior round found issues; verify they "
date: "2026-05-18"
first_ts: "2026-05-18T02:35:15.906Z"
last_ts: "2026-05-18T02:36:09.990Z"
cwd: "H:\\prism"
messages: 7
user_msgs: 3
assistant_msgs: 4
raw_file: "H:/.claude/projects/H--prism/0bd2552c-f488-4919-a1de-61b8dee1f055/subagents/agent-aa42c88b0034404d8.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:05"
---

# Per-file scrutiny RE-REVIEW (round 2) — a prior round found issues; verify they 

> **claude-code-cli** | 2026-05-18 | 7 msgs (3 user / 4 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/0bd2552c-f488-4919-a1de-61b8dee1f055/subagents/agent-aa42c88b0034404d8.jsonl`

## Transcript

### User | 2026-05-18T02:35:15.906Z

Per-file scrutiny RE-REVIEW (round 2) — a prior round found issues; verify they are fully closed and check for regressions introduced by the fix.

FILES:
1. H:\PRISM\scripts\ask-ollama.mjs
2. H:\PRISM\scripts\__tests__\ask-ollama.test.mjs

PRIOR FINDINGS that were supposed to be fixed:
- P1 (both reviewers): no real-data E2E — the loadGraph→runRequest seam was
  fake-only ("hermetic fakes don't prove wiring" class).
- P1 (arm B): `loadGraph` had NO size cap — the fallback `system-graph.json`
  is ~370 MB; readFileSync+JSON.parse on it would OOM, not fail loud.
- P2: `--model` with no value silently swallowed; `readFileCapped` doc-claim
  mismatch; viz --synth "up" test didn't assert Ollama was called nor that
  the timeout threaded through.

WHAT CHANGED:
- ask-ollama.mjs: added `MAX_GRAPH_BYTES` (80 MB) + `BYTES_PER_MB`; `loadGraph`
  now takes an injectable `statImpl`, statSizes each candidate, SKIPS any
  over-cap file (never reads it), and fails loud with an actionable message
  if all candidates are missing or over-cap. `--model` now errors on a
  missing value.
- ask-ollama.test.mjs: loadGraph tests pass `statImpl`; added an over-cap
  "SKIPPED, never read" test, a stat-failure test, and TWO skip-loud
  real-data E2E tests (real on-disk architecture-graph.json through
  `loadGraph()` and through `runRequest` viz with no injected deps). The
  --synth test now asserts Ollama was called + the timeout threaded.
  54 tests, all passing (the 2 real-data E2E ran, not skipped).

VERIFY:
- The size-cap logic is correct: an over-cap candidate is SKIPPED (continue),
  never readFileSync'd; if every candidate is missing-or-over-cap the error
  is explicit and actionable; a normal-size architecture-graph.json still
  loads. No off-by-one, no path where an over-cap file still gets read.
- `statImpl` injection did not break the real CLI path (real `statSync`
  default) or the `runRequest` viz wiring `(deps.loadGraph || loadGraph)(deps)`.
- The two real-data E2E tests genuine
... [+305 chars truncated]

### Assistant | 2026-05-18T02:35:27.936Z

I'll review both files thoroughly to verify the prior findings are fully closed.

### Assistant | 2026-05-18T02:35:28.468Z

[tool_use: Read]

### Assistant | 2026-05-18T02:35:28.512Z

[tool_use: Read]

### User | 2026-05-18T02:35:30.265Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * ask-ollama.mjs — local Ollama query service (OLLAMA-EXPAND-MS0/U-OE01)
4	 *
5	 * Routes token-heavy work to a LOCAL Ollama model so it never enters the
6	 * Claude context window. Claude invokes this via Bash; only the compact
7	 * answer returns. Heavy inputs — the ~27 MB system-viz graph, large source
8	 * files, build-error dumps — are processed here in the subp
... [+22165 chars truncated]

### User | 2026-05-18T02:35:30.472Z

[tool_result] 1	/**
2	 * ask-ollama.test.mjs — unit + integration tests for scripts/ask-ollama.mjs
3	 * (OLLAMA-EXPAND-MS0/U-OE01). Run: node --test scripts/__tests__/ask-ollama.test.mjs
4	 *
5	 * Strategy: every pure helper is asserted against real expected values
6	 * (no toBeDefined() stubs). The impure shell (loadGraph, callOllama,
7	 * runRequest) is exercised with injected deps; readFileCapped runs agains
... [+21436 chars truncated]

### Assistant | 2026-05-18T02:36:09.990Z

Both files read in full. Let me verify each prior finding and check for regressions.

## Verification of Prior Findings

### P1 — Real-data E2E (loadGraph→runRequest seam)

**CLOSED.** Two real-data E2E tests added:

- `loadGraph: REAL on-disk architecture graph parses (E2E)` (test file lines 277-285) — calls `loadGraph()` with **no arguments**, so it uses the real `existsSync`/`statSync`/`readFileSync` defaults against `REPO_ROOT`. Genuinely exercises the production path.
- `runRequest viz: REAL graph end-to-end, no injected loadGraph (E2E)` (lines 420-432) — calls `runRequest(parsed, {})` with an **empty deps object**. In `runRequest`, `(deps.loadGraph || loadGraph)(deps)` → `deps.loadGraph` is `undefined` → real `loadGraph` is invoked with `deps = {}`, which means real `readFileSync`/`existsSync`/`statSync`. The seam is genuinely proven.

Both are **skip-loud**: `{ skip: HAVE_REAL_GRAPH ? false : "architecture-graph.json not present" }` — `HAVE_REAL_GRAPH = existsSync(REAL_GRAPH)` (line 47). When the graph is absent, the test reports a skip reason rather than silently passing. The prompt states both ran (not skipped), confirming the disk graph is present.

One subtle correctness check: the `runRequest` E2E passes `{}` as `deps`. Inside `loadGraph`, `deps = {}` destructures to all defaults (`root = REPO_ROOT`, `readImpl = readFileSync`, etc.) — correct, because `loadGraph` is called as `(deps.loadGraph || loadGraph)(deps)` and `{}` has no `root`/`readImpl` keys. Verified correct.

### P1 — loadGraph size cap

**CLOSED and correct.** The logic in `ask-ollama.mjs` lines 290-337:

```
for (const name of GRAPH_CANDIDATES) {
  const path = join(root, ...);
  if (!existsImpl(path)) continue;          // missing → next candidate
  try { size = statImpl(path).size; }
  catch (e) { return {ok:false, error:`cannot stat...`}; }   // stat fail → loud
  if (size > MAX_GRAPH_BYTES) {
    tooLarge.push(...); continue;            // over-cap → SKIP, never readImpl
  }
  ... readI
... [+5444 chars truncated]
