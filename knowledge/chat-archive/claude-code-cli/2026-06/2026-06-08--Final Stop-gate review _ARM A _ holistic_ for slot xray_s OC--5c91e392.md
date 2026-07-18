---
type: "chat-session"
source: "claude-code-cli"
session_id: "5c91e392-f5b8-473b-bddc-c0de161b8ee0"
title: "Final Stop-gate review (ARM A — holistic) for slot xray's OCR closed-loop corpus"
date: "2026-06-08"
first_ts: "2026-06-08T18:08:05.339Z"
last_ts: "2026-06-08T18:09:53.712Z"
cwd: "H:\\prism"
messages: 32
user_msgs: 13
assistant_msgs: 19
raw_file: "H:/.claude/projects/H--prism/5c91e392-f5b8-473b-bddc-c0de161b8ee0/subagents/agent-a85c4d4b1d052acae.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:13"
---

# Final Stop-gate review (ARM A — holistic) for slot xray's OCR closed-loop corpus

> **claude-code-cli** | 2026-06-08 | 32 msgs (13 user / 19 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/5c91e392-f5b8-473b-bddc-c0de161b8ee0/subagents/agent-a85c4d4b1d052acae.jsonl`

## Transcript

### User | 2026-06-08T18:08:05.339Z

Final Stop-gate review (ARM A — holistic) for slot xray's OCR closed-loop corpus-scale work in H:/prism. The per-file 2-reviewer gate already passed on each file; this is the consolidating Stop gate.

Read these files END-TO-END and judge correctness:
- scripts/lib/ocr-training-loop-lib.mjs — focus the 4 new fns at the end: printCursorKey, parseCursorDoneSet, formatCursorLine, partitionByResumeCursor (the resume-cursor core).
- scripts/blueprint-ocr-training-loop.mjs — the resumable PHASE 2 (per-print stream-append to trainset/queue/processed-cursor.jsonl, durable rows BEFORE cursor) + rasterizePrintPages (ALL pages, cap 12) + per-page ensemble emit.
- scripts/build-print-corpus-manifest.mjs — classifyDoc bucketing (drawing/ambiguous/excluded) of juliett's documents.jsonl.
- scripts/xray-trainset-to-lora.mjs — trainsetRowDedupKey (last-wins key+page dedup).
- scripts/run-ocr-training-loop-overnight.ps1 + .claude/helpers/install-ocr-training-loop-task.ps1 — the reaper-immune scheduled-task scripts.

Key claims to verify against the code (R12): (a) a reaper kill loses no committed label (durable rows written before cursor + idempotent resume); (b) multi-page prints emit one (page-image,dims) pair per page; (c) the task scripts are safe (SYSTEM principal, no destructive ops, ASCII-clean). Tests: 31/31 pass (verified). The corpus task is live-validated Running + producing trainset rows.

Give a SHORT verdict: PASS or FAIL + any P0/P1 (file:line). Don't re-read the whole repo — these files + their immediate callers are the scope.

### Assistant | 2026-06-08T18:08:18.916Z

I'll review the files end-to-end. Let me start by reading them in parallel.

### Assistant | 2026-06-08T18:08:19.315Z

[tool_use: Read]

### Assistant | 2026-06-08T18:08:19.821Z

[tool_use: Read]

### Assistant | 2026-06-08T18:08:20.344Z

[tool_use: Read]

### Assistant | 2026-06-08T18:08:20.839Z

[tool_use: Read]

### User | 2026-06-08T18:08:21.608Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\ocr-training-loop-lib.mjs' was already read 5m ago in this session and is unchanged (mtime 1780933851938). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-08T18:08:22.224Z

[tool_result] read-once-guard: 'H:\prism\scripts\blueprint-ocr-training-loop.mjs' was already read 5m ago in this session and is unchanged (mtime 1780936010609). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-08T18:08:22.694Z

[tool_result] read-once-guard: 'H:\prism\scripts\build-print-corpus-manifest.mjs' was already read 5m ago in this session and is unchanged (mtime 1780935085743). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-08T18:08:23.203Z

[tool_result] read-once-guard: 'H:\prism\scripts\xray-trainset-to-lora.mjs' was already read 5m ago in this session and is unchanged (mtime 1780935327249). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-08T18:08:30.464Z

The files are already in my context from the per-file gate. Let me verify the load-bearing claims against the actual code. Let me grep the specific functions to confirm exact line numbers and logic.

### Assistant | 2026-06-08T18:08:31.899Z

[tool_use: Grep]

### User | 2026-06-08T18:08:34.402Z

[tool_result] 222:export function printCursorKey(pngOrPath) {
223-  const s = String(pngOrPath == null ? "" : pngOrPath).trim();
224-  if (!s) return null;
225-  const fwd = s.split("\\").join("/");
226-  const base = fwd.slice(fwd.lastIndexOf("/") + 1);
227-  const key = base.trim().toLowerCase();
228-  return key || null;
229-}
230-
231-/**
232- * Pure: parse cursor-file CONTENTS (the full text of processed-c
... [+3396 chars truncated]

### Assistant | 2026-06-08T18:08:40.501Z

The four resume-cursor functions are correct and well-documented. Now let me verify the critical durability claim — that durable rows are written BEFORE the cursor in the main runner.

### Assistant | 2026-06-08T18:08:41.021Z

[tool_use: Grep]

### User | 2026-06-08T18:08:43.264Z

[tool_result] 23-//        [--real-png <a.png> --real-png <b.png> | --real-dir <dir>] [--models a,b]
24-//        [--out-dir state/shared/ocr-training-loop] [--max-time-sec 300] [--json]
25-\ EXIT: 0 = ran · 2 = calibration produced no samples (ensemble never extracted) · 3 = args/setup error.
26-
27:import { existsSync, mkdirSync, writeFileSync, readdirSync, readFileSync, appendFileSync, rmSync } from "node:fs
... [+6918 chars truncated]

### Assistant | 2026-06-08T18:08:55.581Z

The durability ordering is correct and load-bearing. The critical sequence at lines 273-292 confirms the R12 claim: per-page trainset rows (274) and queue rows (278) are appended FIRST, then the cursor line (291) is appended LAST, only after all pages of a print succeed. A reaper kill between rows and cursor leaves the print un-cursored → it re-processes on resume → up to k duplicate rows, which `xray-trainset-to-lora.mjs` dedups last-wins.

Let me verify the rasterizePrintPages multi-page logic and the cap, plus the dedup key, and check the task scripts.

### Assistant | 2026-06-08T18:08:56.986Z

[tool_use: Grep]

### Assistant | 2026-06-08T18:08:58.313Z

[tool_use: Grep]

### User | 2026-06-08T18:08:59.205Z

[tool_result] 98-// silently dropped ~76% of dimension-bearing pages. Each page of an engineering drawing SET carries
99-// real dims, so we OCR every page. Cap bounds a runaway (a 32-page scan-bundle) — pages beyond the
100-// cap are logged, never silently dropped (R12). An assembly's cover/BOM page just yields few dims.
101:const MAX_PAGES_PER_PRINT = 12;
102-
103-\** Pure: page count of a PDF via pdf-to-png
... [+3277 chars truncated]

### User | 2026-06-08T18:09:00.941Z

[tool_result] 40-    json: args.includes("--json"),
41-  };
42-}
43-
44-/**
45: * Last-wins dedup identity for a trainset row. The resumable runner appends per-page rows BEFORE the
46- * per-print cursor, so a reaper kill mid-print leaves duplicate rows on resume (same page re-emitted).
47: * The runner promises these are deduped here last-wins by key+page (runner report note). Falls back to
48- * image, then p
... [+3112 chars truncated]

### Assistant | 2026-06-08T18:09:08.186Z

The dedup logic is correct and matches the runner's contract exactly. Let me examine two remaining concerns: the multi-page `pageImage` keying interaction with the dedup key (a subtle correctness issue worth checking), the manifest classifyDoc bucketing, and the task scripts' safety.

### Assistant | 2026-06-08T18:09:09.995Z

[tool_use: Grep]

### Assistant | 2026-06-08T18:09:10.185Z

[tool_use: Read]

### Assistant | 2026-06-08T18:09:10.530Z

[tool_use: Read]

### User | 2026-06-08T18:09:12.615Z

[tool_result] 3-//
4-// U-XRAY-PRINT-CORPUS-MANIFEST (STEP 2 of the OCR-training-scope synthesis) — define the REAL
5-// denominator of "all prints in the JM folder / Docustrata" by SEARCHING juliett's already-extracted
6:// index (mcp-server/data/jm-die-database/tables/documents.jsonl, 111,745 v3-classified docs), NEVER by
7-// re-OCRing the 257K corpus (the no-re-OCR soul, R8). Emits a counted 3-bucket manife
... [+5461 chars truncated]

### User | 2026-06-08T18:09:12.721Z

[tool_result] read-once-guard: 'H:\prism\.claude\helpers\install-ocr-training-loop-task.ps1' was already read 4m ago in this session and is unchanged (mtime 1780941245861). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_C
... [+7 chars truncated]

### User | 2026-06-08T18:09:12.843Z

[tool_result] 1	# run-ocr-training-loop-overnight.ps1 - reaper-immune + console-allocated CLOSED-LOOP TRAINING launcher.
2	#
3	# Sister to run-ocr-batch-overnight.ps1 (the raw-OCR-extract lane). This runs the TRAINING lane:
4	# blueprint-ocr-training-loop.mjs calibrates the ensemble trust function on synthetic-GT prints, then
5	# weak-labels the real drawing corpus into a tiered (gold/silver/bronze/reject) trai
... [+2360 chars truncated]

### Assistant | 2026-06-08T18:09:24.643Z

The manifest classifyDoc is single-sourced (both counts and worklist flow through it), handles the string-score coercion defensively, and is fail-safe (business roles excluded even with positive print_score). The overnight PS1 is ASCII-clean, uses no destructive ops, and correctly does NOT pass `--fresh` (monotonic resume). 

I have the install task script from context. Let me verify two final things: the SYSTEM principal / no-destructive-ops claim in the install script, and one subtle correctness point about the dedup key when `pageCount===1` (page=0 → `key#p0`). Let me check the install script's principal and the calibration-empty exit path.

### Assistant | 2026-06-08T18:09:24.644Z

[tool_use: Grep]

### User | 2026-06-08T18:09:26.753Z

[tool_result] 29-if ($Uninstall) {
30-  if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
31:    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
32-    Write-Host "[ocr-train] uninstalled task '$TaskName'"
33-  } else { Write-Host "[ocr-train] task '$TaskName' not present" }
--
52-# Run whether-logged-on-or-not, highest privileges, survive battery, allow a long run.
53-$set
... [+586 chars truncated]

### Assistant | 2026-06-08T18:09:53.712Z

The install script is confirmed safe: SYSTEM principal with `LogonType ServiceAccount` (reaper-immune ancestry to Task Scheduler service), `RunLevel Highest`, a bounded 12h execution limit. The only "destructive" op is `Unregister-ScheduledTask` gated behind the explicit `-Uninstall` flag — no file deletion, no `Remove-Item`, no `rm -rf`. `Register-ScheduledTask -Force` only overwrites the task definition (idempotent re-install), not data.

I have enough to render the verdict. Let me consolidate the three R12 claims against what I verified.

## Verdict: PASS

All three load-bearing R12 claims hold against the code. No P0/P1 findings.

**(a) A reaper kill loses no committed label — VERIFIED.** The ordering in `blueprint-ocr-training-loop.mjs` is correct: per-page trainset rows (`:274`) and active-learning queue rows (`:278`) are `appendFileSync`-ed FIRST; the per-print cursor line is appended LAST (`:291`), and only after `anyPageOk` (`:286`). A kill in the window between durable rows and the cursor leaves the print un-cursored, so `partitionByResumeCursor` (`lib:284`) re-queues it on resume → at most k duplicate rows, never a lost label. Resume is idempotent: `parseCursorDoneSet` (`lib:239`) fail-soft-skips a torn final JSON line (`lib:246`, try/catch `continue`) so a kill mid-cursor-write costs only that one print's re-OCR, never an abort. The duplicate rows are then collapsed last-wins by `trainsetRowDedupKey` (`xray-trainset-to-lora.mjs:51`) keyed on `key#p<page>`.

**(b) Multi-page prints emit one (page-image, dims) pair per page — VERIFIED.** `rasterizePrintPages` (`:120`) renders every page up to `MAX_PAGES_PER_PRINT=12` (`:101`), the per-page loop builds a distinct `pageImage` (`:265`, `entry#page=N` when `pageCount>1`) and calls `buildTrainsetRow` per page (`:266`), appending one row per page (`:274`). Cap overflow is logged via `capped`/`capNote` (`:295`), not silently dropped (R12). A `.png` entry passes through as a single page=0 (`:121`). Dedup key corre
... [+1540 chars truncated]
