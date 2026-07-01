---
type: "chat-session"
source: "claude-code-cli"
session_id: "5c91e392-f5b8-473b-bddc-c0de161b8ee0"
title: "Final Stop-gate review (ARM B — weighted to TEST INTEGRITY + inlined-constants; "
date: "2026-06-08"
first_ts: "2026-06-08T18:08:06.013Z"
last_ts: "2026-06-08T18:09:36.758Z"
cwd: "H:\\prism"
messages: 28
user_msgs: 12
assistant_msgs: 16
raw_file: "H:/.claude/projects/H--prism/5c91e392-f5b8-473b-bddc-c0de161b8ee0/subagents/agent-a550a96598acaebcd.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:13"
---

# Final Stop-gate review (ARM B — weighted to TEST INTEGRITY + inlined-constants; 

> **claude-code-cli** | 2026-06-08 | 28 msgs (12 user / 16 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/5c91e392-f5b8-473b-bddc-c0de161b8ee0/subagents/agent-a550a96598acaebcd.jsonl`

## Transcript

### User | 2026-06-08T18:08:06.013Z

Final Stop-gate review (ARM B — weighted to TEST INTEGRITY + inlined-constants; independent of arm A) for slot xray's OCR work in H:/prism.

Read:
- scripts/lib/ocr-training-loop-lib.test.mjs (8 resume-cursor tests) + the fns they test in scripts/lib/ocr-training-loop-lib.mjs
- scripts/build-print-corpus-manifest.test.mjs (9 classifyDoc tests) + scripts/build-print-corpus-manifest.mjs
- scripts/xray-trainset-to-lora.test.mjs (3 dedup tests) + the trainsetRowDedupKey fn

Judge (R9): would each test FAIL if its logic broke? Specifically the re-OCR=0 resume invariant, torn-line fail-soft, business-role-stays-excluded, and key+page dedup-distinctness tests. Any tautological tests? Any magic numbers that should be named consts (MAX_PAGES_PER_PRINT, RASTER_DPI, tier thresholds, ALARM_DRAWING_MAX, print-score floor)? Confirm the run-as-main guard exists on the 3 entrypoint scripts (build-print-corpus-manifest.mjs, xray-trainset-to-lora.mjs, blueprint-ocr-training-loop.mjs) so importing them in a test does no I/O.

SHORT verdict: PASS or FAIL + P0/P1 (file:line).

### Assistant | 2026-06-08T18:08:18.619Z

I'll review the three test files and their corresponding source functions. Let me read them in parallel.

### Assistant | 2026-06-08T18:08:18.917Z

[tool_use: Read]

### Assistant | 2026-06-08T18:08:19.838Z

[tool_use: Read]

### Assistant | 2026-06-08T18:08:20.300Z

[tool_use: Read]

### Assistant | 2026-06-08T18:08:20.817Z

[tool_use: Read]

### User | 2026-06-08T18:08:21.227Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\ocr-training-loop-lib.test.mjs' was already read 5m ago in this session and is unchanged (mtime 1780933147092). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-08T18:08:21.287Z

[tool_use: Read]

### Assistant | 2026-06-08T18:08:21.550Z

[tool_use: Read]

### User | 2026-06-08T18:08:22.259Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\ocr-training-loop-lib.mjs' was already read 5m ago in this session and is unchanged (mtime 1780933851938). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-08T18:08:22.638Z

[tool_result] read-once-guard: 'H:\prism\scripts\build-print-corpus-manifest.test.mjs' was already read 5m ago in this session and is unchanged (mtime 1780934385252). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0
... [+1 chars truncated]

### User | 2026-06-08T18:08:23.164Z

[tool_result] read-once-guard: 'H:\prism\scripts\build-print-corpus-manifest.mjs' was already read 5m ago in this session and is unchanged (mtime 1780935085743). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-08T18:08:23.596Z

[tool_result] read-once-guard: 'H:\prism\scripts\xray-trainset-to-lora.test.mjs' was already read 5m ago in this session and is unchanged (mtime 1780935277271). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-08T18:08:23.884Z

[tool_result] read-once-guard: 'H:\prism\scripts\xray-trainset-to-lora.mjs' was already read 5m ago in this session and is unchanged (mtime 1780935327249). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-08T18:08:29.999Z

The files are already in my context from a prior read this session. I'll work from that content rather than re-reading. Let me reconstruct my analysis from what I have, but I need to verify I actually have the full content. Let me grep for the specific functions and tests to confirm exact line numbers for findings.

### Assistant | 2026-06-08T18:08:32.560Z

[tool_use: Grep]

### User | 2026-06-08T18:08:35.296Z

[tool_result] scripts\blueprint-ocr-training-loop.mjs:45:  parseCursorDoneSet,
scripts\blueprint-ocr-training-loop.mjs:47:  partitionByResumeCursor,
scripts\blueprint-ocr-training-loop.mjs:50:const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
scripts\blueprint-ocr-training-loop.mjs:95:const RASTER_DPI = "300";
scripts\blueprint-ocr-training-loop.mjs:101:const MAX_PAGES_PER_PRINT = 12;
scr
... [+10378 chars truncated]

### Assistant | 2026-06-08T18:08:41.144Z

Good — the grep confirms the key structural facts. All three magic-number candidates the prompt asks about are already named consts: `RASTER_DPI` (line 95), `MAX_PAGES_PER_PRINT` (line 101), `ALARM_DRAWING_MAX` (line 154). All three entrypoint scripts have run-as-main guards. Now let me verify the dedup-key implementation and the partition logic exactly, since those are the load-bearing R9 checks. Let me read the precise function bodies.

### Assistant | 2026-06-08T18:08:42.175Z

[tool_use: Read]

### Assistant | 2026-06-08T18:08:43.118Z

[tool_use: Read]

### User | 2026-06-08T18:08:44.326Z

[tool_result] 45	 * Last-wins dedup identity for a trainset row. The resumable runner appends per-page rows BEFORE the
46	 * per-print cursor, so a reaper kill mid-print leaves duplicate rows on resume (same page re-emitted).
47	 * The runner promises these are deduped here last-wins by key+page (runner report note). Falls back to
48	 * image, then part. Two genuinely-different pages of one print carry distinct
... [+2341 chars truncated]

### User | 2026-06-08T18:08:45.284Z

[tool_result] 230	
231	/**
232	 * Pure: parse cursor-file CONTENTS (the full text of processed-cursor.jsonl) into a Set of done
233	 * keys. Each line is a JSON object `{key, ...}` — a malformed/blank line is SKIPPED (fail-soft: a
234	 * torn final line from a kill mid-write must not abort resume), never throws. A line missing a
235	 * usable key is ignored. This is the inverse of formatCursorLine.
236	 * @para
... [+3083 chars truncated]

### Assistant | 2026-06-08T18:09:00.322Z

Now I have the exact function bodies. Let me cross-check the three load-bearing R9 invariants against the test assertions and the dedup-key against the runner's actual emit shape. One thing to verify: the dedup key in `trainsetRowDedupKey` uses `${row.key}#p${row.page}` but the test at line 35 asserts the modern key differs from a legacy `image:"k.pdf#page=0"`. Let me confirm those are distinct and check whether the runner actually emits rows with `key`+`page` fields so the dedup is non-tautological against real data.

### Assistant | 2026-06-08T18:09:02.500Z

[tool_use: Grep]

### Assistant | 2026-06-08T18:09:03.283Z

[tool_use: Read]

### User | 2026-06-08T18:09:04.622Z

[tool_result] 14://   3. EMIT — trainset.jsonl (for india), active-learning-queue.jsonl, and a run report.
27:import { existsSync, mkdirSync, writeFileSync, readdirSync, readFileSync, appendFileSync, rmSync } from "node:fs";
118: * @returns {{pages:Array<{page:number,png:string}>, pageCount:number, capped:boolean, cleanup:Function}|{error:string}}
121:  if (!/\.pdf$/i.test(entry)) return { pages: [{ page: 0, pn
... [+3094 chars truncated]

### User | 2026-06-08T18:09:05.438Z

[tool_result] 200	  assert.equal(printCursorKey("H:\\PRISM\\Docustrata\\x\\PART_A.PDF"), "part_a.pdf");
201	  assert.equal(printCursorKey("part_a.pdf"), printCursorKey("other/dir/PART_A.pdf"));
202	  // blank / null → null (caller never cursor-skips a keyless entry)
203	  assert.equal(printCursorKey(""), null);
204	  assert.equal(printCursorKey("   "), null);
205	  assert.equal(printCursorKey(null), null);
206	
... [+3888 chars truncated]

### Assistant | 2026-06-08T18:09:36.758Z

I now have everything needed for a rigorous R9 verdict. Let me trace each load-bearing invariant against the real producer shape.

**Critical cross-check — does the dedup key match the runner's real emit?**
- Runner emits (line 274): `{key, page, part, image, ...}` — both `key` and `page` present.
- `trainsetRowDedupKey` (line 53): `if (row.key != null && row.page != null) return \`${row.key}#p${row.page}\``.
- So a modern row dedups by `key#p<page>` and `image` is the runner's `${entry}#page=${page}` (different separator `#page=` vs `#p`). The test at line 35 (`legacy = trainsetRowDedupKey({ image: "k.pdf#page=0" })` → `"k.pdf#page=0"`) vs modern `"k.pdf#p0"` confirms the two are genuinely distinct strings — the dedup-distinctness test is non-tautological and matches the producer.

**R9 verdict on each named invariant:**

1. **re-OCR=0 resume invariant** (test L253-255): asserts `partitionByResumeCursor(worklist, allDone).todo.length === 0`. If the partition logic broke (e.g. forgot the `doneSet.has(k)` check at L296, or `printCursorKey` stopped canonicalizing), todo would be non-empty → test FAILS. Genuine.

2. **torn-line fail-soft** (test L224-238): asserts `done.size === 2` and `!done.has("c.png")` with a deliberately truncated final JSON line. If the `try/catch continue` at L246 were removed (or replaced with a throw), `JSON.parse` on the torn line would throw and the test would error/fail. Genuine — and it negatively asserts the torn key is absent, so it can't pass by accident.

3. **business-role-stays-excluded** (manifest test L34): `classifyDoc({ role: "SALES_ORDER", print_score: 30, ... }).bucket === "excluded"`. High print_score + drawing-like mime; if BUSINESS_ROLES were dropped from the exclusion path, the high score would route it to "drawing" → test FAILS. Genuine. The loop test (L28-31) over all BUSINESS_ROLES with `print_score: 0` is the broader guard.

4. **key+page dedup-distinctness** (lora test L13-19, L34-35): asserts `p0 !== p1` and `modern !
... [+3059 chars truncated]
