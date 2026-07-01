---
type: "chat-session"
source: "claude-code-cli"
session_id: "885d585d-959c-404a-8eef-a5542d5006dd"
title: "Independent regression/silent-breakage analysis of a telemetry diff in the live "
date: "2026-06-24"
first_ts: "2026-06-24T18:36:54.067Z"
last_ts: "2026-06-24T18:38:20.905Z"
cwd: "H:\\prism"
messages: 27
user_msgs: 11
assistant_msgs: 16
raw_file: "H:/.claude/projects/H--prism/885d585d-959c-404a-8eef-a5542d5006dd/subagents/agent-a7fbaf0e5a9e43460.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:16"
---

# Independent regression/silent-breakage analysis of a telemetry diff in the live 

> **claude-code-cli** | 2026-06-24 | 27 msgs (11 user / 16 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/885d585d-959c-404a-8eef-a5542d5006dd/subagents/agent-a7fbaf0e5a9e43460.jsonl`

## Transcript

### User | 2026-06-24T18:36:54.067Z

Independent regression/silent-breakage analysis of a telemetry diff in the live PRISM repo (slot alpha). Unit U-FILE-DIGEST-OFFLOAD-RECORD. Do NOT assume the other reviewer caught everything.

Files changed (read both end-to-end):
- H:/prism/scripts/ollama-file-digest.mjs
- H:/prism/scripts/ollama-file-digest.test.mjs

The diff adds `recordFileDigestOffload` (fail-safe atomic RMW writing byHook["ollama-file-digest"] in mcp-server/data/state/ollama-offload-stats.json) and calls it from the CLI main() on a verified ollama digest. New constants REPO_ROOT/STATS_PATH/STATS_KEY + imports (statSync, existsSync, writeFileSync, renameSync, resolve).

Weighted toward silent breakage / I-O / concurrency:
1. ATOMIC-WRITE RACE: the tmp filename is `${statsPath}.${process.pid}.${Date.now()}.tmp` then renameSync. Many fleet hooks write this same stats file concurrently (ollama-route-pretooluse, ollama-task-offloader, ask-hermes). Confirm the read-modify-write + PID-temp + rename matches the existing concurrency pattern (compare to updateOffloadStats in ollama-route-pretooluse.mjs and recordTieredUsage) and cannot CORRUPT the file (torn write) -- worst case is a lost increment, not corruption. Flag if the pattern diverges.
2. IMPORT/MODULE-LOAD: new top-level imports + a const STATS_PATH using resolve(REPO_ROOT,...) at import time -- TDZ/order safe? Does adding `export function recordFileDigestOffload` or the new imports break the existing `import { lineAnchoredVerifier, offloadFileDigest, parseCliArgs } ...` consumers (the test + any importer)?
3. main() PATH: the recording runs after `process.stdout.write`. Confirm a recordFileDigestOffload throw can't escape (it is wrapped) and can't change the CLI's return code 0. Confirm statSync failure is caught (rawBytes stays 0 -> saving 0, still records).
4. STATS POLLUTION in tests: grep -- does ANY test (existing or new) cause main() to run against the REAL stats path? (It must not.)
5. BLAST RADIUS: grep every importer of ollama-file-d
... [+237 chars truncated]

### Assistant | 2026-06-24T18:36:59.837Z

I'll read both files end-to-end first, then trace the blast radius and check the concurrency pattern against existing stats writers.

### Assistant | 2026-06-24T18:37:00.229Z

[tool_use: Read]

### Assistant | 2026-06-24T18:37:00.250Z

[tool_use: Read]

### User | 2026-06-24T18:37:01.024Z

[tool_result] read-once-guard: 'H:\prism\scripts\ollama-file-digest.mjs' was already read 12s ago in this session and is unchanged (mtime 1782326066795). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-24T18:37:01.128Z

[tool_result] read-once-guard: 'H:\prism\scripts\ollama-file-digest.test.mjs' was already read 11s ago in this session and is unchanged (mtime 1782326136100). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-24T18:37:03.633Z

The files are already in context (read earlier this session). Let me now pull the existing concurrency pattern from the other stats writers and check all importers.

### Assistant | 2026-06-24T18:37:04.840Z

[tool_use: Grep]

### Assistant | 2026-06-24T18:37:05.389Z

[tool_use: Grep]

### User | 2026-06-24T18:37:09.465Z

[tool_result] Found 20 files
.claude\hooks\ollama-task-offloader.mjs
.claude\hooks\grep-index-first.mjs
.claude\hooks\grep-index-first.test.mjs
.claude\hooks\lib\ollama-stats.mjs
.claude\hooks\token-awareness-sidecar.mjs
.claude\hooks\nav-rerank-advisory.mjs
.claude\hooks\nav-rerank-advisory.test.mjs
.claude\hooks\wiki-read-offload-advisory.mjs
.claude\hooks\large-read-digest-advisory.test.mjs
.claude\hooks\lar
... [+488 chars truncated]

### User | 2026-06-24T18:37:10.543Z

[tool_result] Found 4 files
scripts\ollama-file-digest.test.mjs
scripts\ollama-file-digest.mjs
.claude\hooks\large-read-digest-advisory.test.mjs
.claude\hooks\large-read-digest-advisory.mjs

### Assistant | 2026-06-24T18:37:13.064Z

Now let me read the canonical stats writer and the large-read-digest-advisory consumer:

### Assistant | 2026-06-24T18:37:13.779Z

[tool_use: Read]

### Assistant | 2026-06-24T18:37:13.861Z

[tool_use: Read]

### User | 2026-06-24T18:37:15.251Z

[tool_result] 1	// tier: T4
2	/**
3	 * ollama-stats.mjs — shared stats writer for all Ollama-bridge hooks.
4	 *
5	 * Before this module existed, only ollama-task-offloader wrote to
6	 * `mcp-server/data/state/ollama-offload-stats.json`, so the offload-rate
7	 * dashboard reported a single hook's view (~7%) and missed savings from
8	 * ollama-context-aggregator, ollama-obsidian-rag, ollama-engine-api-extractor,

... [+9512 chars truncated]

### User | 2026-06-24T18:37:16.092Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3
3	// large-read-digest-advisory.mjs -- PreToolUse:Read advisory hook
4	//
5	// When Claude is about to Read a LARGE source file (>600 lines by default), inject an
6	// advisory pointing at scripts/ollama-file-digest.mjs -- the verified line-anchored
7	// digest (commit 1175a6f26b): a local-Ollama digest where every claim is checked
8	// against its cited source 
... [+10959 chars truncated]

### Assistant | 2026-06-24T18:37:20.530Z

Now I have everything I need. Let me read the actual `ollama-file-digest.mjs` file content from my session context and check the test file for stats pollution, then verify the tmp suffix divergence precisely.

### Assistant | 2026-06-24T18:37:22.159Z

[tool_use: Grep]

### Assistant | 2026-06-24T18:37:22.908Z

[tool_use: Grep]

### User | 2026-06-24T18:37:24.271Z

[tool_result] 36-\ U-FILE-DIGEST-OFFLOAD-RECORD (2026-06-24, slot:alpha): the verified file-digest is "the
37-// headline free-token lever" (see header) but recorded NOTHING -- so it was 100% invisible to
38-// every utilization measurement, and the large-read-digest advisory-decay gate could never see
39:// a conversion (it could wrongly suppress a working nudge). recordFileDigestOffload counts a
40-// SUCCESS
... [+2791 chars truncated]

### User | 2026-06-24T18:37:25.889Z

[tool_result] 9-import { readFileSync, writeFileSync, rmSync, existsSync } from "node:fs";
10-import { tmpdir } from "node:os";
11-import { join } from "node:path";
12-
13:import { lineAnchoredVerifier, offloadFileDigest, parseCliArgs, recordFileDigestOffload } from "./ollama-file-digest.mjs";
14-
15-const FILE = ["const ALPHA = 1;", "function compute(x) { return x * ALPHA; }", "export { compute };"];
16-const 
... [+3253 chars truncated]

### Assistant | 2026-06-24T18:37:29.396Z

Now I have all the evidence I need. Let me check one final detail — the tmp suffix divergence between the new code and the canonical `ollama-stats.mjs` pattern, and whether the test's `main()` path can ever touch the real stats file.

### Assistant | 2026-06-24T18:37:31.311Z

[tool_use: Grep]

### Assistant | 2026-06-24T18:37:32.166Z

[tool_use: Grep]

### User | 2026-06-24T18:37:34.524Z

[tool_result] 70-    stats.lastUpdated = new Date().toISOString();
71:    const tmp = `${statsPath}.${process.pid}.${Date.now()}.tmp`;
72-    writeFileSync(tmp, JSON.stringify(stats, null, 2));

### User | 2026-06-24T18:37:35.178Z

[tool_result] 198-}
199-
200:const invokedDirectly = (() => { try { return fileURLToPath(import.meta.url) === process.argv[1]; } catch { return false; } })();
201:if (invokedDirectly) main(process.argv.slice(2)).then((c) => process.exit(c || 0)).catch((e) => { process.stderr.write(`ollama-file-digest fatal: ${e && e.message}\n`); process.exit(1); });

### Assistant | 2026-06-24T18:38:20.905Z

I now have all the evidence needed. Here is my full analysis.

---

**Verified facts from the files read:**

`ollama-file-digest.mjs` — `recordFileDigestOffload` (lines 57-76):
- tmp suffix: `${statsPath}.${process.pid}.${Date.now()}.tmp` (line 71)
- Canonical `ollama-stats.mjs` `atomicWrite` tmp suffix: `${path}.tmp-${process.pid}` (line 97)
- `large-read-digest-advisory.mjs` `bumpStats` tmp suffix: `${STATS_PATH}.${process.pid}.${Date.now()}.tmp` (line 110)

`ollama-stats.mjs` `reapStaleTmps` regex (line 79): matches names starting with `basename + '.tmp'` and extracts pid via `/\.tmp[.-](\d+)/` — this matches BOTH `.tmp-<pid>` AND `.tmp.<pid>` patterns.

`invokedDirectly` guard (line 200): uses `fileURLToPath(import.meta.url) === process.argv[1]` — this is the standard ESM CLI guard; `main()` only runs when the file is the entry point.

Test file (line 13): imports `recordFileDigestOffload` directly; all test invocations of `recordFileDigestOffload` pass an explicit `statsPath` pointing to a `tmpdir()` temp file. No test calls `main()`. No test invokes `process.argv[1]` as this file. The `invokedDirectly` guard therefore stays false in the test runner, and `main()` never fires during tests.

**Tmp suffix divergence — detailed analysis:**

- New code in `recordFileDigestOffload`: `.${process.pid}.${Date.now()}.tmp` — suffix ends in `.tmp`
- Canonical `ollama-stats.mjs`: `.tmp-${process.pid}` — suffix starts with `.tmp-`
- The fleet janitor (`.tmp-\d+$`) sweeps `.tmp-<pid>` but NOT `.tmp.<pid>.<ts>.tmp`
- However, `reapStaleTmps` in `ollama-stats.mjs` uses `/\.tmp[.-](\d+)/` which DOES match `.tmp.<pid>` — but only when `ollama-stats.mjs` runs (i.e., when another `recordOllamaEvent` call fires for the same stats file). The `recordFileDigestOffload` code does NOT call `reapStaleTmps` itself.
- `large-read-digest-advisory.mjs:110` uses the identical `.${process.pid}.${Date.now()}.tmp` suffix — so the new code matches an already-existing non-canonical pattern, not a n
... [+5101 chars truncated]
