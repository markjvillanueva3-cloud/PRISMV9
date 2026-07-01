---
type: "chat-session"
source: "claude-code-cli"
session_id: "2a305e00-e356-4b4c-9010-951ae7d41845"
title: "Review a new resumable drain script end-to-end. Grade PASS or FAIL with P0/P1/P2"
date: "2026-06-25"
first_ts: "2026-06-25T15:21:52.352Z"
last_ts: "2026-06-25T15:25:07.200Z"
cwd: "H:\\prism"
messages: 47
user_msgs: 18
assistant_msgs: 29
raw_file: "H:/.claude/projects/H--prism/2a305e00-e356-4b4c-9010-951ae7d41845/subagents/agent-a5bbf0c64529964b2.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:08"
---

# Review a new resumable drain script end-to-end. Grade PASS or FAIL with P0/P1/P2

> **claude-code-cli** | 2026-06-25 | 47 msgs (18 user / 29 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/2a305e00-e356-4b4c-9010-951ae7d41845/subagents/agent-a5bbf0c64529964b2.jsonl`

## Transcript

### User | 2026-06-25T15:21:52.352Z

Review a new resumable drain script end-to-end. Grade PASS or FAIL with P0/P1/P2 findings and file:line citations.

FILE: H:\prism\scripts\drain-local-transcripts-tribal.mjs  (+ its test H:\prism\scripts\drain-local-transcripts-tribal.test.mjs)

WHAT IT IS: a sibling of the PROVEN, cron-running drain H:\prism\scripts\drain-resources-tribal.mjs. It drains on-disk lecture-video transcripts (.vtt/.srt) into the shared tribal-knowledge index. It deliberately CLONES the proven drain's structure (cursor, run-lock with dead-PID steal, SIGTERM release, per-file checkpoint, generate+embed downstream). Read drain-resources-tribal.mjs first and confirm this clone preserves the proven safety properties.

CONTRACT it must satisfy:
- Resumable: per-file attempted cursor checkpointed after EACH file; a kill mid-run resumes next run with no re-work and no data loss.
- Run-lock: must NOT block forever on a dead-PID lock (the PDF drain had that exact bug, froze 48 min). Confirm acquireLock steals a dead-PID/stale lock but yields to a LIVE fresh peer.
- Must NOT collide with the PDF drain: separate WORK_DIR / CURSOR / NODES_DIR / LOCK. Confirm the paths are distinct from drain-resources-tribal's (which uses state/shared/pdf-tribal-tips/...). Both embed into the SAME shared tribal index via embed-pdf-tribal-tips-into-index.mjs -- that is intended (hash-skip dedup); confirm there is no shared MUTABLE cursor/nodes dir.
- It reuses extractTranscriptFile from ./lib/transcript-file-extract.mjs (pure, already reviewed) and classify from ./build-cad-cam-resources-pdf-index.mjs (confirm importing the latter is side-effect-free: it runs main() only under an invokedDirectly basename guard).
- The per-file flow writes a one-row jsonl in the PDF-extractor shape, then shells `node scripts/chunk-pdf-text-to-nodes.mjs --in <jsonl> --out-dir NODES_DIR --domain <d> --software <s>`. Confirm chunk-pdf-text-to-nodes accepts --software (read it) and the row shape is correct.

Focus on: cursor/lock correctn
... [+362 chars truncated]

### Assistant | 2026-06-25T15:22:02.288Z

I'll review this drain script end-to-end. Let me start by reading the proven sibling it clones, then the new script, its dependencies, and the test.

### Assistant | 2026-06-25T15:22:02.725Z

[tool_use: Read]

### Assistant | 2026-06-25T15:22:02.882Z

[tool_use: Read]

### Assistant | 2026-06-25T15:22:03.154Z

[tool_use: Read]

### User | 2026-06-25T15:22:05.450Z

[tool_result] read-once-guard: 'H:\prism\scripts\drain-resources-tribal.mjs' was already read 21m ago in this session and is unchanged (mtime 1782274179297). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-25T15:22:07.200Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * drain-local-transcripts-tribal.mjs -- autonomous, resumable bulk drain of the
4	 * ON-DISK lecture-VIDEO transcripts (.vtt / .srt) into tribal knowledge.
5	 *
6	 * CAD-LEARNING-AI/U-CAD-LEARN-VIDEO-TRANSCRIPT-DRAIN (slot:india 2026-06-25).
7	 *
8	 * The operator wants the /learn pipeline to "include videos and other reputable
9	 * sources ... from MIT and other col
... [+13299 chars truncated]

### User | 2026-06-25T15:22:07.247Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * Tests for drain-local-transcripts-tribal.mjs (CAD-LEARNING-AI/U-CAD-LEARN-VIDEO-TRANSCRIPT-DRAIN).
4	 * Pure-fn coverage: enumeration (real temp-dir walk), domain resolution, candidate
5	 * ordering, cursor-aware pickNext, run-lock pid probe. Reference-value asserts (R9).
6	 * Run: node scripts/drain-local-transcripts-tribal.test.mjs
7	 */
8	import { test } from "n
... [+4666 chars truncated]

### Assistant | 2026-06-25T15:22:11.743Z

I have the new script and its test. The proven sibling `drain-resources-tribal.mjs` is in my context from earlier. Let me now read the dependencies the contract requires me to verify: the transcript extractor, the classify import (side-effect guard), the chunk subprocess (does it accept `--software`?), and re-confirm the proven drain's lock/cursor structure.

### Assistant | 2026-06-25T15:22:12.693Z

[tool_use: Read]

### Assistant | 2026-06-25T15:22:12.746Z

[tool_use: Read]

### User | 2026-06-25T15:22:13.540Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\transcript-file-extract.mjs' was already read 8m ago in this session and is unchanged (mtime 1782400332834). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-25T15:22:13.782Z

[tool_result] read-once-guard: 'H:\prism\scripts\chunk-pdf-text-to-nodes.mjs' was already read 17m ago in this session and is unchanged (mtime 1782268631983). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-25T15:22:17.701Z

The read-once guard says these were read earlier this session, but I want to verify the specific load-bearing facts rather than rely on stale recall. Let me bypass the cache and read the exact parts I need to cite, plus confirm the `classify` side-effect guard and the proven drain's structure.

### Assistant | 2026-06-25T15:22:18.643Z

[tool_use: Bash]

### Assistant | 2026-06-25T15:22:19.971Z

[tool_use: Grep]

### User | 2026-06-25T15:22:24.655Z

[tool_result]      1	#!/usr/bin/env node
     2	/**
     3	 * transcript-file-extract.mjs -- pure VTT/SRT subtitle file -> clean prose extractor.
     4	 *
     5	 * CAD-LEARNING-AI/U-CAD-LEARN-VIDEO-TRANSCRIPT-DRAIN (slot:india 2026-06-25).
     6	 *
     7	 * The operator wants the /learn pipeline to "include videos and other reputable
     8	 * sources." The MIT-OCW + college course corpus under H:/PRISM/res
... [+9055 chars truncated]

### User | 2026-06-25T15:22:26.521Z

[tool_result] 17: * buildUserPrompt read): { sha8, text, domain, software, title, source, chunk }.
83:export function rowToNodes(row, { domain = "manufacturing", software = null, chunkChars = DEFAULT_CHUNK_CHARS, maxChunksPerDoc = Infinity } = {}) {
93:    software,
100:export function main(argv = process.argv.slice(2)) {
101:  const flags = { in: null, outDir: null, domain: "manufacturing", software: null, chu
... [+633 chars truncated]

### Assistant | 2026-06-25T15:22:32.681Z

`chunk-pdf-text-to-nodes.mjs` accepts `--software` (line 107) and stamps it into each node (line 93). The transcript extractor emits the row shape `{path, text, ok, chars, format, segments}`, matching the PDF extractor shape. Now let me confirm the `classify` side-effect guard in `build-cad-cam-resources-pdf-index.mjs` and re-confirm the proven drain's lock/cursor for clone-fidelity.

### Assistant | 2026-06-25T15:22:34.620Z

[tool_use: Grep]

### Assistant | 2026-06-25T15:22:35.145Z

[tool_use: Read]

### User | 2026-06-25T15:22:36.065Z

[tool_result] 88:export function classifyJmDie(rel) {
133:export function classify(rel) {
238:function main() {
257:// Run main() when invoked directly as a script.
259:const invokedDirectly = process.argv[1]
260:  && path.basename(process.argv[1]) === 'build-cad-cam-resources-pdf-index.mjs';
261:if (invokedDirectly) main();

### User | 2026-06-25T15:22:36.298Z

[tool_result] 80	}
81	
82	/** One extractor row -> array of node objects (one per chunk). Pure. */
83	export function rowToNodes(row, { domain = "manufacturing", software = null, chunkChars = DEFAULT_CHUNK_CHARS, maxChunksPerDoc = Infinity } = {}) {
84	  if (!row || row.ok === false || !row.text) return [];
85	  const src = row.path || row.source || "";
86	  const title = titleFromPath(src);
87	  let chunks = c
... [+2167 chars truncated]

### Assistant | 2026-06-25T15:22:43.155Z

Key verifications confirmed:

1. `classify` is side-effect-free: `build-cad-cam-resources-pdf-index.mjs:259-261` guards `main()` behind `invokedDirectly = path.basename(process.argv[1]) === 'build-cad-cam-resources-pdf-index.mjs'`. Importing it from the drain (whose argv[1] basename is `drain-local-transcripts-tribal.mjs`) will NOT run main(). Good.

2. `chunk-pdf-text-to-nodes.mjs` accepts `--software` (line 107) and stamps it (line 93). Good. Note: the chunk script reads `row.text` and skips `row.ok === false` (line 121) — the drain only writes a row when `row.ok` is true, so consistent.

Now let me re-confirm the proven sibling drain's exact lock/cursor/path structure to verify clone fidelity. I'll bypass the cache to get precise line cites.

### Assistant | 2026-06-25T15:22:44.725Z

[tool_use: Bash]

### User | 2026-06-25T15:22:52.659Z

[tool_result]      1	#!/usr/bin/env node
     2	/**
     3	 * drain-resources-tribal.mjs -- autonomous, resumable bulk tribal-knowledge drain.
     4	 *
     5	 * PDF-TRIBAL-HERMES/U-TRIBAL-OVERNIGHT-DRAIN (slot:zulu 2026-06-24).
     6	 *
     7	 * Drives the FULL resources-PDF -> tribal-tip -> L1-index pipeline in BOUNDED,
     8	 * RESUMABLE batches so a scheduled task can run it every ~20 min overnight and

... [+5277 chars truncated]

### Assistant | 2026-06-25T15:22:56.045Z

Now let me read the proven drain's lock acquisition and signal handling to compare the clone fidelity precisely, then I'll have everything I need.

### Assistant | 2026-06-25T15:22:57.103Z

[tool_use: Bash]

### User | 2026-06-25T15:23:02.696Z

[tool_result]     90	    out.push(c);
    91	    if (out.length >= maxPdfs) break;
    92	  }
    93	  return out;
    94	}
    95	
    96	function readJson(p, fallback) {
    97	  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return fallback; }
    98	}
    99	function writeJsonAtomic(p, obj) {
   100	  const tmp = `${p}.tmp-${process.pid}`;
   101	  fs.writeFileSync(tmp, JSON.stringify(obj, n
... [+8305 chars truncated]

### Assistant | 2026-06-25T15:23:08.176Z

I now have a complete picture. The clone is faithful to the proven drain in all the safety-critical mechanics. Let me verify the remaining contract claims: path distinctness, the `generate-pdf-tribal-tips-hermes.mjs` env contract (does it honor `PRISM_TRIBAL_SOURCE_DIR`?), and whether the embedder reads from a fixed nodes dir or the per-drain `NODES_DIR` (to confirm no shared-mutable-cursor collision and that transcript nodes actually get embedded).

### Assistant | 2026-06-25T15:23:10.088Z

[tool_use: Grep]

### Assistant | 2026-06-25T15:23:11.869Z

[tool_use: Grep]

### User | 2026-06-25T15:23:12.183Z

[tool_result] 3: * generate-pdf-tribal-tips-hermes.mjs
14: * Output: state/shared/pdf-tribal-tips/tips.jsonl  (one row per node, append-only)
18: * RESUMABLE: done sha8s are derived from the existing tips.jsonl on startup, so a
23: *   node scripts/generate-pdf-tribal-tips-hermes.mjs            # all nodes (Hermes-first)
24: *   node scripts/generate-pdf-tribal-tips-hermes.mjs --limit 5  # first 5 (sample)
25: 
... [+595 chars truncated]

### User | 2026-06-25T15:23:14.946Z

[tool_result] 3: * embed-pdf-tribal-tips-into-index.mjs
40: *   node scripts/embed-pdf-tribal-tips-into-index.mjs --dry-run     # count, no write
41: *   node scripts/embed-pdf-tribal-tips-into-index.mjs --limit 5     # sample (prove non-clobber)
42: *   node scripts/embed-pdf-tribal-tips-into-index.mjs               # full run (all sources)
43: *   node scripts/embed-pdf-tribal-tips-into-index.mjs --source pdf
... [+918 chars truncated]

### Assistant | 2026-06-25T15:23:25.258Z

This confirms the critical wiring. Important findings from the downstream contract:

1. The generator (`generate-pdf-tribal-tips-hermes.mjs:37`) honors `PRISM_TRIBAL_SOURCE_DIR` to point at the transcript `NODES_DIR` — the transcript drain passes it (line 229). Good.

2. **But the generator's OUTPUT (`tips.jsonl`) is SHARED** — `OUT_JSONL` defaults to `state/shared/pdf-tribal-tips/tips.jsonl` (line 39) and the transcript drain does NOT set `PRISM_TRIBAL_OUT`. So the transcript tips append to the SAME `tips.jsonl` the PDF drain uses. This is by design (both feed the shared index via hash-skip dedup), and the generator's resume-set is derived from sha8s in that file (line 18/125), so transcript nodes whose sha8 isn't yet in tips.jsonl get processed. The embedder reads that same `PDF_TIPS` (line 63). So transcript nodes DO get embedded. This is the intended shared-immutable-via-append path, not a mutable-cursor collision.

Let me verify one concurrency concern: the generator's `tips.jsonl` is append-only and shared. If the PDF drain and transcript drain run concurrently (separate locks, so they CAN run at the same time), do they both write `tips.jsonl` and the embed index concurrently? Let me check the generator's write mode and the embedder's index write for concurrent-safety, and confirm the sha8 namespace can't collide destructively.

### Assistant | 2026-06-25T15:23:26.057Z

[tool_use: Read]

### User | 2026-06-25T15:23:28.553Z

[tool_result] 120	    }
121	  }
122	  return out.sort();
123	}
124	
125	/** Resume set: sha8s already in tips.jsonl. */
126	function loadDoneSet() {
127	  const done = new Set();
128	  if (!fs.existsSync(OUT_JSONL)) return done;
129	  for (const line of fs.readFileSync(OUT_JSONL, "utf-8").split("\n")) {
130	    if (!line.trim()) continue;
131	    try { const r = JSON.parse(line); if (r && r.sha8) done.add(r.sha
... [+2538 chars truncated]

### Assistant | 2026-06-25T15:23:40.028Z

I have everything I need to evaluate the concurrency consideration. Let me check how the generator's `main()` writes to `tips.jsonl` (append vs rewrite) and how the chunk script's sha8 is derived, to assess the one real concern: concurrent runs of the PDF drain and transcript drain both writing the shared `tips.jsonl` and shared nodes-base namespace.

### Assistant | 2026-06-25T15:23:41.193Z

[tool_use: Read]

### User | 2026-06-25T15:23:43.294Z

[tool_result] 179	  const limit = limArg >= 0 ? Number(args[limArg + 1]) : Infinity;
180	  const maxCharsArg = args.indexOf("--max-chars");
181	  const maxChars = maxCharsArg >= 0 ? Number(args[maxCharsArg + 1]) : 8000;
182	  const maxTokArg = args.indexOf("--max-tokens");
183	  const maxTokens = maxTokArg >= 0 ? Number(args[maxTokArg + 1]) : 600;
184	  const ollamaOnly = args.includes("--ollama-only");
185	  c
... [+3122 chars truncated]

### Assistant | 2026-06-25T15:24:01.768Z

I now have a complete, verified picture of the whole pipeline. Let me consolidate the analysis.

**Verified facts:**

1. **Cursor correctness / resumability** — `drain-local-transcripts-tribal.mjs:224` checkpoints `writeJsonAtomic(CURSOR, cursor)` after EACH file inside the loop, with the cursor entry set at line 209 BEFORE the chunk subprocess runs. So even if chunk fails or the process is killed mid-file, the file is recorded as attempted (`ok:true/false`) and won't be re-walked. `writeJsonAtomic` (128-132) uses pid-keyed tmp + rename — atomic, no torn cursor. Identical to the proven drain (96-103, 199). PASS.

2. **Lock correctness** — `acquireLock` (146-156) is byte-identical in logic to the proven drain (119-129): steals a stale OR dead-PID lock immediately, yields only to a fresh+live peer. `pidAlive` (135-138) is identical. SIGTERM/SIGINT release via `onSignal` (196-198) + `finally releaseLock()` (245-247). The 48-min freeze bug is correctly avoided. PASS.

3. **Path distinctness from PDF drain** — All four working paths are distinct:
   - WORK_DIR: `transcript-tribal-tips` (53) vs PDF's `pdf-tribal-tips` (40)
   - CURSOR: `transcript-drain-cursor.json` (54) vs `resources-drain-cursor.json` (41)
   - NODES_DIR: `transcript-drain-nodes` (55) vs `resources-drain-nodes` (42)
   - LOCK: `transcript-drain.lock` (57) vs `resources-drain.lock` (44)
   No shared mutable cursor or nodes dir. PASS.

4. **classify side-effect-free** — guarded by basename check (`build-cad-cam-resources-pdf-index.mjs:259-261`); importing from the transcript drain will not run main(). PASS.

5. **chunk subprocess args** — `--software` is accepted (107) and stamped (93). Row shape `{path, text, ok, chars}` (line 215) matches what `rowToNodes`/`main` read (`row.ok`, `row.text`, `row.path`). PASS.

Now the issues I did find. Let me check one more thing — whether `--max-files`/`--max-chunks-per-doc` parsing can yield NaN that breaks behavior, and the shared-`tips.jsonl` concurrency considerat
... [+1053 chars truncated]

### Assistant | 2026-06-25T15:24:03.429Z

[tool_use: Grep]

### User | 2026-06-25T15:24:10.899Z

[tool_result] state\token-economy-session.json:309:      "file": "H:\\prism\\scripts\\drain-local-transcripts-tribal.mjs"
state\token-economy-session.json:316:      "file": "H:\\prism\\scripts\\drain-local-transcripts-tribal.test.mjs"
mcp-server\data\state\TEST_COVERAGE_INDEX.json:1:[Omitted long matching line]
mcp-server\data\state\session-file-ownership.json:319:    "scripts/drain-local-transcripts-tribal.mjs
... [+4160 chars truncated]

### Assistant | 2026-06-25T15:24:22.529Z

The transcript drain is NOT yet wired into any cron/scheduled-task (`.ps1`) — there is no scheduled task registration for `drain-local-transcripts-tribal.mjs`. It exists as a script + test only. This is worth noting for R15 (wiring), but the task framing is to review the script/test correctness, and the PDF drain's own cron runs `--no-embed`, so a future wiring should match that. The embed-race is not a regression introduced here.

Now let me close the loop on a few concrete correctness points in the code itself, particularly the arg-parsing NaN edge and the unused-import / dead-flag-default behavior.

**Arg parsing edge:** `main` line 168 `flags.maxFiles = parseInt(argv[++i], 10)` — if `--max-files` is passed with no value (last arg), `parseInt(undefined,10)` → NaN, and `pickNext`'s `out.length >= maxFiles` with `maxFiles=NaN` is always false → picks the ENTIRE candidate list (all 351 transcripts) in one batch. The proven sibling has the identical pattern (`--max-pdfs`), so this is an inherited, pre-existing weakness, not new. Same for `--max-chunks-per-doc`. Worth a P2 note since it's a clone, but consistent with the proven parent.

Let me verify the one thing I haven't confirmed: that `c.software` is always truthy for resources (so the `|| "lecture-transcript"` fallback at line 216 is reachable/correct) and that `classify` returns a `software` field. I'll check the classify return shape.

### Assistant | 2026-06-25T15:24:23.036Z

[tool_use: Read]

### User | 2026-06-25T15:24:26.111Z

[tool_result] 133	export function classify(rel) {
134	  // Normalize to forward slashes; relative parts.
135	  const norm = rel.split(/[\\/]/).filter(Boolean);
136	  const top = norm[0] || '';
137	  const hit = DIR_MAP[top];
138	  if (hit) return { ...hit, top };
139	  // Filename heuristics for top-level loose files.
140	  const fn = (norm[norm.length - 1] || '').toLowerCase();
141	  if (/winmax|hurco/.test(fn
... [+2524 chars truncated]

### Assistant | 2026-06-25T15:25:07.200Z

`classify` always returns both `domain` and `software` (never undefined — falls through to `{domain:'training', software:'misc'}` at line 148). So for `source==="resources"`, `c.software` is always a non-empty string; the `|| "lecture-transcript"` fallback at line 216 only fires for the jm-die branch (which already sets `software:"lecture-transcript"` at line 96, so it's redundant-but-harmless there). The fallback is defensive and correct.

I now have a thorough, verified review. Let me also note the test-integrity assessment and the one real coverage gap, then deliver the verdict.

**Test integrity (R9):** The test file uses real reference-value asserts (deepEqual on names, exact `software` strings, exact pickNext output, exact size-ordering). No `toBeDefined`-style stubs, no `.skip`/`.only`. The walk test uses a real temp-dir tree. `pidAlive` test asserts the live pid is true and bogus/0/NaN are false. These would genuinely fail if logic broke. Good.

**Coverage gap:** The test covers all 5 exported pure functions, but does NOT cover `acquireLock`/`releaseLock` (the exact mechanism the contract flags as the historically-buggy spot — the 48-min freeze). The proven sibling's test file added lock coverage (per the wiki entry `pdf-tribal-hermes-u-tribal-drain-lock-pidlive.md:24` — "drain-resources-tribal.test.mjs | 10 +++++"). `acquireLock` is not exported here so it can't be directly tested, and `pidAlive` (the core of the dead-PID-steal decision) IS tested. The lock logic is byte-identical to the proven, already-lock-tested sibling. This is a P2 (the steal-vs-yield branch has no direct regression test in THIS file, though pidAlive — its decision primitive — does).

Here is my review.

---

VERDICT: PASS

summary: `drain-local-transcripts-tribal.mjs` is a faithful clone of the proven `drain-resources-tribal.mjs`, preserving every safety-critical property: per-file atomic cursor checkpoint, dead-PID-aware lock steal that yields only to a fresh live peer, SIGTERM/final
... [+4809 chars truncated]
