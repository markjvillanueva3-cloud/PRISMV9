---
type: "chat-session"
source: "claude-code-cli"
session_id: "0bd2552c-f488-4919-a1de-61b8dee1f055"
title: "Per-file scrutiny review (PRISM per-file gate, arm B — independent second pass)."
date: "2026-05-18"
first_ts: "2026-05-18T02:28:39.749Z"
last_ts: "2026-05-18T02:30:24.846Z"
cwd: "H:\\prism"
messages: 18
user_msgs: 7
assistant_msgs: 11
raw_file: "H:/.claude/projects/H--prism/0bd2552c-f488-4919-a1de-61b8dee1f055/subagents/agent-a3ae4a8aff9f03e5b.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:05"
---

# Per-file scrutiny review (PRISM per-file gate, arm B — independent second pass).

> **claude-code-cli** | 2026-05-18 | 18 msgs (7 user / 11 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/0bd2552c-f488-4919-a1de-61b8dee1f055/subagents/agent-a3ae4a8aff9f03e5b.jsonl`

## Transcript

### User | 2026-05-18T02:28:39.749Z

Per-file scrutiny review (PRISM per-file gate, arm B — independent second pass). Do NOT assume arm A caught everything; weight your review toward what a correctness-focused reviewer is LIKELY TO MISS.

REVIEW THESE TWO FILES END-TO-END:
1. H:\PRISM\scripts\ask-ollama.mjs (the implementation)
2. H:\PRISM\scripts\__tests__\ask-ollama.test.mjs (its 50-case test suite)

CONTEXT: `ask-ollama.mjs` is a new CLI (OLLAMA-EXPAND-MS0/U-OE01) that
offloads token-heavy work to a LOCAL Ollama model so heavy inputs never
enter the Claude context window. It is invoked via Bash by Claude Code.
Modes: viz (local ranked search of the system-viz graph, --synth adds an
Ollama answer), summarize/explain/triage (file → Ollama), ask (question →
Ollama). Single model qwen2.5-coder:3b; keep_alive holds it warm.

WEIGHT YOUR REVIEW TOWARD:
- TEST INTEGRITY: would each test FAIL if the corresponding logic were
  silently broken? Flag any test that is tautological or that asserts a
  hardcoded value the function trivially returns. Is the Ollama-down
  degrade path genuinely exercised? Is the real cold-load timeout class
  represented?
- INTEGRATION REALITY: this is a "pure core + injected readers" design —
  PRISM's recurring lesson is that such designs must ship at least one
  REAL-data E2E, not only injected-fake tests. Is the real path (real
  graph file, real Ollama call) actually proven anywhere? If only fakes
  are tested, that is a P1 finding.
- SECURITY / I/O SAFETY: readFileCapped path handling; the viz query is
  user/Claude text that flows into a graph search and an Ollama prompt —
  any injection or unbounded-resource risk? maxBuffer / file-size caps
  adequate? Could a hostile graph file (huge, deeply nested) cause OOM?
- HONEST SCOPE / NO OVERCLAIM: does the savingsFooter / viz footer
  overclaim token savings? Does any comment or output assert something
  the code does not deliver (R12)?
- CONVENTION CONFORMANCE: ESM style, naming, error-message format
  consistency with the rest
... [+144 chars truncated]

### Assistant | 2026-05-18T02:28:47.838Z

I'll review both files end-to-end.

### Assistant | 2026-05-18T02:28:48.241Z

[tool_use: Read]

### Assistant | 2026-05-18T02:28:48.710Z

[tool_use: Read]

### User | 2026-05-18T02:28:48.981Z

[tool_result] read-once-guard: 'H:\PRISM\scripts\ask-ollama.mjs' was already read 3s ago in this session and is unchanged (mtime 1779070968544). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-18T02:28:49.200Z

[tool_result] read-once-guard: 'H:\PRISM\scripts\__tests__\ask-ollama.test.mjs' was already read 2s ago in this session and is unchanged (mtime 1779071082979). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-18T02:28:53.292Z

The read-once guard says the files are already in my context, but I don't actually see their content in this conversation — the guard fired on a prior read I don't have. Let me read them with the cache disabled.

### Assistant | 2026-05-18T02:28:54.153Z

[tool_use: Bash]

### Assistant | 2026-05-18T02:28:54.432Z

[tool_use: Bash]

### User | 2026-05-18T02:28:58.851Z

[tool_result] #!/usr/bin/env node
/**
 * ask-ollama.mjs — local Ollama query service (OLLAMA-EXPAND-MS0/U-OE01)
 *
 * Routes token-heavy work to a LOCAL Ollama model so it never enters the
 * Claude context window. Claude invokes this via Bash; only the compact
 * answer returns. Heavy inputs — the ~27 MB system-viz graph, large source
 * files, build-error dumps — are processed here in the subprocess and
 * di
... [+18815 chars truncated]

### User | 2026-05-18T02:28:59.551Z

[tool_result] /**
 * ask-ollama.test.mjs — unit + integration tests for scripts/ask-ollama.mjs
 * (OLLAMA-EXPAND-MS0/U-OE01). Run: node --test scripts/__tests__/ask-ollama.test.mjs
 *
 * Strategy: every pure helper is asserted against real expected values
 * (no toBeDefined() stubs). The impure shell (loadGraph, callOllama,
 * readFileCapped, runRequest) is exercised with injected deps so the full
 * orchestrat
... [+16892 chars truncated]

### Assistant | 2026-05-18T02:29:04.535Z

I have both files. Now let me verify a few claims against reality before finalizing — the test count, the real graph paths, and whether a real E2E exists.

### Assistant | 2026-05-18T02:29:07.489Z

[tool_use: Bash]

### User | 2026-05-18T02:29:13.772Z

[tool_result] === test() count ===
50
=== graph files present ===
state/shared/system-viz/architecture-graph.json  26.8M
state/shared/system-viz/system-graph.json  370.4M
=== ollama reachable? ===
{"models":[{"name":"mistral:7b","model":"mistral:7b","modified_at":"2026-04-19T03:17:46.3792204Z","size":4372824384,"dig
=== run the suite ===
  ...
# Subtest: runRequest summarize: missing file is exit 2 (usage), not
... [+355 chars truncated]

### Assistant | 2026-05-18T02:29:18.179Z

50/50 pass. Now let me verify two specific concerns: the `system-graph.json` is 370 MB (a real OOM risk for the implementation), and whether `qwen2.5-coder:3b` is actually installed.

### Assistant | 2026-05-18T02:29:20.226Z

[tool_use: Bash]

### User | 2026-05-18T02:29:26.034Z

[tool_result] === installed models ===
"name":"mistral:7b"
"name":"codellama:7b"
"name":"qwen2.5-coder:3b"
"name":"nomic-embed-text:latest"
=== node default heap (MB) ===
4144
=== string length max test ===
Max string length: 512 MB chars

### Assistant | 2026-05-18T02:30:24.846Z

I have everything I need. Both files reviewed end-to-end, the suite verified (50/50 pass), and I confirmed the real environment: `architecture-graph.json` is 26.8 MB, `system-graph.json` is 370.4 MB, `qwen2.5-coder:3b` is installed, default node heap is ~4 GB.

---

## Review: ask-ollama.mjs + ask-ollama.test.mjs (arm B — independent second pass)

### P1 findings

**P1-1 — No real-data E2E test. The "pure core + injected readers" design ships only injected fakes.**
This is PRISM's explicitly-named recurring lesson (RGS-TOOL-AUTOINVOKE-MS1, FLEET-REAPER service-restart, NN-GRAPH — all in CLAUDE.md `## Recent regressions`): *"a 'pure core + injected readers' design MUST ship one real-data E2E test — hermetic fakes do not prove production wiring."* Every `loadGraph`, `callOllama`, `runRequest` test injects `existsImpl`/`readImpl`/`fetchImpl`/`callOllama`/`loadGraph`. Not one test:
- calls `loadGraph()` with **no deps** against the real `state/shared/system-viz/architecture-graph.json` on disk;
- calls `runRequest` for `viz` with no `deps.loadGraph`, exercising the real `GRAPH_CANDIDATES` path-join + the real 26.8 MB `JSON.parse`.

The injected `FIXTURE_GRAPH` has 3 nodes; the real graph has ~20K–370K. The seam between `runRequest`'s real `loadGraph` default and the real file is **completely untested**. A path-join bug, a `state/shared/system-viz/` directory rename, or an encoding quirk in the real graph would 50/50-pass and 100%-fail in production. At minimum add one test: `loadGraph()` with no args, assert `ok===true` and `graph.nodes` is a non-empty array (skip-loud if the file is absent, per the PRISM skip-loud convention). A real `callOllama` E2E is harder to gate in CI but the *graph* E2E is cheap and is the higher-risk seam.

**P1-2 — `loadGraph` will read the entire 370 MB `system-graph.json` into a single string with no size cap → real OOM / silent-degrade risk.**
`readFileCapped` caps file modes at `MAX_FILE_BYTES` (256 KB). `loadGraph` has **no equivalent cap
... [+7392 chars truncated]
