---
type: "chat-session"
source: "claude-code-cli"
session_id: "31b302a2-1334-4b15-87f3-6aa6d7d85dfa"
title: "Independent second-pass review of PRISM commit `43c5a7cbf3` (repo H:/prism), wei"
date: "2026-06-22"
first_ts: "2026-06-22T12:31:02.795Z"
last_ts: "2026-06-22T12:36:31.224Z"
cwd: "H:\\prism"
messages: 63
user_msgs: 22
assistant_msgs: 41
raw_file: "H:/.claude/projects/H--prism/31b302a2-1334-4b15-87f3-6aa6d7d85dfa/subagents/agent-a435040c55fecfc69.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:09"
---

# Independent second-pass review of PRISM commit `43c5a7cbf3` (repo H:/prism), wei

> **claude-code-cli** | 2026-06-22 | 63 msgs (22 user / 41 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/31b302a2-1334-4b15-87f3-6aa6d7d85dfa/subagents/agent-a435040c55fecfc69.jsonl`

## Transcript

### User | 2026-06-22T12:31:02.795Z

Independent second-pass review of PRISM commit `43c5a7cbf3` (repo H:/prism), weighted toward TEST INTEGRITY, the byte-offset/rotation logic, and edge cases that arm A may miss. Do NOT assume arm A caught anything. Read: `cd H:/prism && git show 43c5a7cbf3`.

UNIT: U-PSN-INCREMENTAL-AGGREGATE — incremental offset-checkpoint aggregation for PSN savings telemetry (scripts/lib/psn-savings-aggregate.mjs + .claude/hooks/stop-psn-savings-aggregate.mjs + their 2 test files).

Focus your scrutiny on:
1. TEST QUALITY (R9): are the new tests real reference-value/algebraic-invariant checks, or stubs? Specifically verify there is a test proving incremental == full `aggregateSavings` byte-identical, plus failure modes (shrink/prune, front-rewrite, partial final line) and adversarial (multibyte byte offsets). Any `toBeDefined`-style placeholder, `.skip`/`.only`, or assertion that can't fail when the logic breaks = FAIL.
2. BYTE vs CHAR offsets: confirm `sliceCompleteLines` + `readRangeOf` + checkpoint offsets are BYTE-accurate (multibyte UTF-8 safe). A char-index offset would corrupt deltas.
3. The rotation guard `!head.startsWith(cp.head)`: does it correctly distinguish append (small-file head grows) from front-rewrite? Is the `cp.head.length > 0` guard sound? Could it ever miss a real rotation or false-fire?
4. `sliceCompleteLines` boundary math: off-by-one on endOffset; the no-newline case; dropLeadingPartial path. Trace each branch.
5. Could a partial-final-line ever be double-counted or permanently skipped across runs?

Run the test files yourself if useful: `cd H:/prism && node --test scripts/__tests__/psn-savings-aggregate.test.mjs .claude/hooks/__tests__/stop-psn-savings-aggregate.test.mjs`. Grade PASS or FAIL with P0/P1/P2 + file:line. Be concise.

### Assistant | 2026-06-22T12:31:16.842Z

I'll review commit `43c5a7cbf3` with focus on test integrity and the byte-offset/rotation logic.

### Assistant | 2026-06-22T12:31:17.388Z

[tool_use: Bash]

### User | 2026-06-22T12:31:18.031Z

[tool_result] Bash result cached (<3min) for this command. The result is already in session context — summarize from it instead of re-running. If you need fresh data, modify the command (different flags, different path).

### Assistant | 2026-06-22T12:31:21.128Z

I need to use absolute paths since cwd resets. Let me get the commit details.

### Assistant | 2026-06-22T12:31:21.467Z

[tool_use: Bash]

### User | 2026-06-22T12:31:22.053Z

[tool_result] Bash result cached (<3min) for this command. The result is already in session context — summarize from it instead of re-running. If you need fresh data, modify the command (different flags, different path).

### Assistant | 2026-06-22T12:31:24.578Z

The cache is interfering. Let me work with absolute paths and read the actual files directly.

### Assistant | 2026-06-22T12:31:25.322Z

[tool_use: Bash]

### User | 2026-06-22T12:31:30.681Z

[tool_result] 43c5a7cbf35fe91aebacb76bb7a8e90cb18abd71
markjvillanueva3-cloud
[MAIN-FORCE] [TOKEN-SAVINGS]/U-PSN-INCREMENTAL-AGGREGATE (slot:alpha): offset-checkpoint incremental PSN savings aggregation -- parse only appended bytes, retire the 64MB per-run re-parse
The deferred follow-up to U-PSN-AGGREGATE-TAILREAD-FIX. stop-psn-savings-aggregate
re-parsed every ledger in full (capped 64MB x7) each run; 4 of 7 
... [+1259 chars truncated]

### Assistant | 2026-06-22T12:31:32.868Z

Now let me read all four files end to end. Let me read them in parallel.

### Assistant | 2026-06-22T12:31:33.818Z

[tool_use: Read]

### Assistant | 2026-06-22T12:31:34.150Z

[tool_use: Read]

### User | 2026-06-22T12:31:34.956Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\psn-savings-aggregate.mjs' was already read 27s ago in this session and is unchanged (mtime 1782131239103). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-22T12:31:35.054Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\stop-psn-savings-aggregate.mjs' was already read 21s ago in this session and is unchanged (mtime 1782130963402). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=
... [+2 chars truncated]

### Assistant | 2026-06-22T12:31:38.896Z

The read-once guard claims I read these, but they aren't in my context (this is a fresh agent thread). Let me disable the cache to actually read them.

### Assistant | 2026-06-22T12:31:39.309Z

[tool_use: Bash]

### User | 2026-06-22T12:31:44.793Z

[tool_result]      1	// scripts/lib/psn-savings-aggregate.mjs
     2	// -------------------------------------
     3	// PSN-SAVINGS-AGGREGATE/U-PSA01 (2026-05-24, slot:alpha)
     4	//
     5	// Unifies the 6 token-savings telemetry sidecars shipped this session into
     6	// one PSN-friendly daily summary. Pure-function aggregator; the Stop hook
     7	// calling this owns file I/O.
     8	//
     9	// Tracke
... [+15008 chars truncated]

### Assistant | 2026-06-22T12:31:47.675Z

Now the hook file.

### Assistant | 2026-06-22T12:31:48.809Z

[tool_use: Bash]

### User | 2026-06-22T12:31:58.608Z

[tool_result]      1	#!/usr/bin/env node
     2	// tier: T3
     3	/**
     4	 * stop-psn-savings-aggregate.mjs — Stop hook
     5	 *
     6	 * PSN-SAVINGS-AGGREGATE/U-PSA01 (2026-05-24, slot:alpha)
     7	 *
     8	 * Reads the 6 token-savings telemetry sidecars and writes a unified daily
     9	 * summary to state/shared/dashboards/psn-savings-aggregate.json. Master-index
    10	 * nightly regen picks it up s
... [+7649 chars truncated]

### Assistant | 2026-06-22T12:32:01.457Z

Now let me read the two test files.

### Assistant | 2026-06-22T12:32:02.252Z

[tool_use: Bash]

### User | 2026-06-22T12:32:08.259Z

[tool_result]      1	import { test } from "node:test";
     2	import assert from "node:assert/strict";
     3	import {
     4	  aggregateSavings,
     5	  incrementalAggregate,
     6	  foldStats,
     7	  sliceCompleteLines,
     8	  emptyStats,
     9	} from "../lib/psn-savings-aggregate.mjs";
    10	
    11	// In-memory, byte-accurate fakes for the incrementalAggregate I/O contract. Works in
    12	// Buffer
... [+21377 chars truncated]

### Assistant | 2026-06-22T12:32:13.074Z

Now the hook test file.

### Assistant | 2026-06-22T12:32:14.067Z

[tool_use: Bash]

### User | 2026-06-22T12:32:19.021Z

[tool_result]      1	import { test } from "node:test";
     2	import assert from "node:assert/strict";
     3	import { writeFileSync, rmSync, mkdtempSync } from "node:fs";
     4	import { tmpdir } from "node:os";
     5	import { join } from "node:path";
     6	import { tailRead, MAX_READ_BYTES, statSizeOf, readHeadOf, readRangeOf } from "../stop-psn-savings-aggregate.mjs";
     7	import { aggregateSavings, incr
... [+9861 chars truncated]

### Assistant | 2026-06-22T12:32:23.556Z

I have read all four files end to end. Now let me run the test files to verify they pass and exercise the logic.

### Assistant | 2026-06-22T12:32:24.632Z

[tool_use: Bash]

### User | 2026-06-22T12:32:28.399Z

[tool_result]   ...
# Subtest: incrementalAggregate: an unchanged ledger carries prior stats with NO re-read
ok 30 - incrementalAggregate: an unchanged ledger carries prior stats with NO re-read
  ---
  duration_ms: 0.1774
  ...
# Subtest: incrementalAggregate: a pruned (shrunk) ledger re-baselines to the new full content
ok 31 - incrementalAggregate: a pruned (shrunk) ledger re-baselines to the new full conten
... [+1040 chars truncated]

### Assistant | 2026-06-22T12:32:33.889Z

All 35 tests pass. Now let me trace the critical logic paths carefully to find any latent bugs the tests miss. Let me focus on the scrutiny questions.

**Question 3 — the rotation guard.** The concern: a front-rewrite where the new head's first 128 bytes still START WITH the old head. Let me trace the specific edge case: a small file where `cp.head` is short (file was tiny at checkpoint time), then a front-rewrite produces a new head that coincidentally begins with the same bytes.

Let me verify whether the head probe stores the FULL head or a truncated one, and trace the partial-final-line interaction with the head guard.

### Assistant | 2026-06-22T12:32:45.930Z

[tool_use: Bash]

### User | 2026-06-22T12:32:50.042Z

[tool_result] Exit code 1
node:internal/modules/esm/resolve:275
    throw new ERR_MODULE_NOT_FOUND(
          ^

Error [ERR_MODULE_NOT_FOUND]: Cannot find module 'C:\h\prism\scripts\lib\psn-savings-aggregate.mjs' imported from C:\Users\wompu\AppData\Local\Temp\trace_test.mjs
    at finalizeResolution (node:internal/modules/esm/resolve:275:11)
    at moduleResolve (node:internal/modules/esm/resolve:932:10)
... [+568 chars truncated]

### Assistant | 2026-06-22T12:32:56.130Z

Path issue with the H: drive. Let me fix the import path.

### Assistant | 2026-06-22T12:33:03.240Z

[tool_use: Bash]

### User | 2026-06-22T12:33:10.439Z

[tool_result] v1 hits: 0 offset: 0 head bytes: 90
v2 incremental hits: 0 misses: 0 lines: 0
EXPECTED full hits: 1 misses: 4 lines: 5 (a true front-rewrite preserving line1)

### Assistant | 2026-06-22T12:33:13.814Z

My fake's argument order is wrong (readRange got `start` as the name). Let me fix the fake to match the real contract `readRange(name, start, end)`, `readHead(name, n)`.

### Assistant | 2026-06-22T12:33:21.364Z

[tool_use: Bash]

### User | 2026-06-22T12:33:27.278Z

[tool_result] v1 hits: 3 offset: 90 head bytes: 90
v2 incremental hits: 1 misses: 4 lines: 5
EXPECTED full hits: 1 misses: 4 lines: 5 (true front-rewrite that preserves line1)

### Assistant | 2026-06-22T12:33:33.989Z

Interesting — in this specific case the incremental result HAPPENED to equal the full parse (hits 1, misses 4). Let me reason about why: `cp.head` = full v1 (90 bytes), v2 starts with `{"kind":"hit","est_tokens":1}\n` which is the first 30 bytes, but `cp.head` is 90 bytes (all of v1). v2 does NOT start with the full 90-byte v1 head, so `startsWith(cp.head)` is FALSE → rotation detected → re-baseline. That's why it's correct here.

The real danger is when `cp.head` is SHORTER than the preserved prefix. Let me construct the actual adversarial case: a file whose first line(s) within the 128-byte head window are genuinely preserved, but content AFTER the head window is front-rewritten in a way that shifts line boundaries — causing the delta slice at `prevOffset` to land mid-record or double count.

### Assistant | 2026-06-22T12:33:46.574Z

[tool_use: Bash]

### User | 2026-06-22T12:33:51.233Z

[tool_result] v1: hits 2 misses 1 offset 285 size 285 headbytes 128
v2 incr: hits 2 misses 1
v2 FULL: hits 0 misses 3
size v1 285 size v2 287 prevOffset 285
MATCH: false

### Assistant | 2026-06-22T12:33:57.697Z

I have confirmed a divergence in a constructed case, but let me be precise about whether this is a REAL failure mode or an artificial one that can't occur in practice. The case I built is an in-place rewrite of bytes PAST the 128-byte head window where the file grew (285→287). The incremental path took the DELTA branch and read only bytes [285,287) = `}\n` leftover, folding nothing meaningful onto stale stats, while the file's earlier lines were silently changed.

This is the classic limitation of any head-probe + size-based change detection: an in-place edit of the middle/tail of a file that the head probe doesn't cover, where size doesn't shrink, is invisible. The question is whether this matches the actual producer behavior of these ledgers. Let me check what the actual ledgers do — are they strictly append-only, and what does `stop-ledger-prune` do (the documented shrink trigger)?

### Assistant | 2026-06-22T12:33:59.190Z

[tool_use: Bash]

### User | 2026-06-22T12:34:06.156Z

[tool_result] -rwxr-xr-x 1 wompu 197611 3080 May 24 12:10 H:/prism/.claude/hooks/stop-ledger-prune.mjs*
---
H:/prism/.claude/hooks/HOOK_DIGEST.md
H:/prism/.claude/hooks/stop-ledger-prune.mjs
H:/prism/.claude/hooks/stop-psn-savings-aggregate.mjs

### Assistant | 2026-06-22T12:34:09.224Z

[tool_use: Read]

### User | 2026-06-22T12:34:10.660Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3
3	/**
4	 * stop-ledger-prune.mjs — Stop hook
5	 *
6	 * PSN-LEDGER-HYGIENE/U-LEDGER-PRUNE (2026-05-24, slot:alpha)
7	 *
8	 * Bounded growth for PRISM's JSONL ledgers. When any tracked ledger crosses
9	 * the size cap, drop the head and retain the tail. Runs on Stop; throttled
10	 * 1/30min global so fleet Stop bursts don't thrash the files.
11	 *
12	 * Pure-funct
... [+2924 chars truncated]

### Assistant | 2026-06-22T12:34:18.703Z

This confirms the critical fact: `stop-ledger-prune.mjs` prunes by **dropping the head and retaining the tail** (`pruneTail`). That is exactly the SHRINK case the incremental aggregator handles correctly (size drops below `cp.size` → re-baseline). The producers of these ledgers are append-only writers. So the in-place-middle-rewrite case I constructed does not match any real producer — it is an artificial scenario, not a live failure mode. That keeps the rotation guard sound for the actual data flow.

But let me verify one more realistic concern: the prune retains the TAIL. After a prune, the head changes AND the size shrinks. The shrink guard fires first (`shrunk` is checked in the `if (!prev || shrunk || rotated)` condition). Good. But is there a scenario where prune keeps size roughly the same? No — prune only fires when size > 5MB cap and retains ~1MB, so size always drops sharply. Shrink guard is reliable for the real prune path.

Now let me verify the `cp.head.length > 0` guard soundness and the empty-file checkpoint reset interaction — a subtle path where a ledger goes empty then gets repopulated.

### Assistant | 2026-06-22T12:34:33.543Z

[tool_use: Bash]

### User | 2026-06-22T12:34:39.555Z

[tool_result] step1 hits: 2
step2 (emptied) lines: 0 cp: {"offset":0,"size":0,"head":""}
step3 (repop) incr: {"lines":2,"nudges":0,"hits":1,"misses":1,"savedTokens":9}
step3 FULL:        {"lines":2,"nudges":0,"hits":1,"misses":1,"savedTokens":9}
MATCH: true
---
a1 hits: 5 (expect 5)
a2 incr: {"lines":2,"nudges":0,"hits":0,"misses":2,"savedTokens":0} FULL: {"lines":2,"nudges":0,"hits":0,"misses":2,"savedTokens":
... [+14 chars truncated]

### Assistant | 2026-06-22T12:34:48.140Z

Both edges resolve correctly: empty-then-repopulate folds onto emptyStats (correct), and prune-then-append (size shrinks below cp.size) triggers re-baseline (correct). 

Now let me verify one realistic scenario specific to THIS hook's prune interaction that the tests do NOT cover: a prune that keeps the size > prevOffset is impossible since prune retains 1MB and cap is 5MB while offset tracks the full size, so post-prune size (~1MB) < cp.size (>5MB) — shrink always fires. But what about a prune where the retained tail still has its first 128 bytes coincidentally matching the old head? That can't happen — prune drops the head, so the new head is different content AND the size dropped. Shrink guard dominates regardless. Sound.

Let me now examine the `dropLeadingPartial` re-baseline path and `endOffset` math at the boundary where `start > 0` (tail-capped re-baseline), plus the `lastNl < begin` branch.

### Assistant | 2026-06-22T12:35:00.789Z

[tool_use: Bash]

### User | 2026-06-22T12:35:06.215Z

[tool_result] empty: {"text":"","endOffset":0}
dlp no-nl: {"text":"","endOffset":16}
dlp one-nl-at-end: {"text":"","endOffset":5}
dlp frag+complete+partial: {"text":"FULL\n","endOffset":10}
nodlp complete+partial: {"text":"A\nB\n","endOffset":4}
nodlp ends-nl: {"text":"A\nB\n","endOffset":4}
dlp buffer-starts-with-nl: {"text":"FULL\nB\n","endOffset":8}

### Assistant | 2026-06-22T12:35:20.643Z

I found a real (but bounded) behavioral nuance in case 7, but let me reason about whether it matters. In the re-baseline path, `dropLeadingPartial` is set to `start > 0`. When `start > 0` (tail-capped re-baseline, only when `size > maxReadBytes` i.e. > 64MB), the slice begins at byte `size - maxReadBytes`, which is almost certainly mid-line. The `dropLeadingPartial` logic correctly drops up to and including the first newline so the first parsed line is whole.

Case 7 (buffer starting with `\n`) would only arise if the cut landed exactly one byte before a newline — i.e., `buf[0]` is the trailing newline of the previous record. Then `dropLeadingPartial` drops that empty leading fragment and correctly starts at `FULL`. That is actually CORRECT: the byte before the cut was mid-record, the newline at `buf[0]` terminates that truncated partial record (which we discard), and `FULL` onward is whole. No complete line is wrongly dropped here. The tail-capped re-baseline is documented as undercounting the dropped head anyway, and only fires above 64MB (>> the 13.2MB largest live ledger). So this is a non-issue in practice and correct in principle.

The boundary math is sound across all branches. Now let me confirm the **double-count / permanent-skip** question (scrutiny Q5) by checking the offset advancement precisely: after a delta read defers a partial line, the next run must re-read from the SAME offset (before the partial) and pick it up once completed. The test at lines 287-301 proves this. Let me verify there's no off-by-one where `newCheckpoint.offset = prevOffset + endOffset` could skip past an unconsumed byte.

In the DELTA branch: `buf = readRange(name, prevOffset, size)`, `endOffset` is relative to `buf` start, so absolute offset = `prevOffset + endOffset`. `endOffset` = `lastNl + 1` (byte just past last complete newline). Any bytes after that (the partial) remain unconsumed and `offset` stays before them. Next run reads `[offset, newSize)` which includes the still-
... [+301 chars truncated]

### Assistant | 2026-06-22T12:35:26.159Z

[tool_use: Bash]

### User | 2026-06-22T12:35:30.301Z

[tool_result] === skip/only/toBeDefined scan ===
NONE FOUND (clean)

=== assert count per file ===
H:/prism/scripts/__tests__/psn-savings-aggregate.test.mjs:74
H:/prism/.claude/hooks/__tests__/stop-psn-savings-aggregate.test.mjs:34

=== live ledger sizes ===
rtk-savings-ledger.jsonl: 694104 bytes
pre-tool-savings-multi.jsonl: 13520722 bytes
read-auto-limit-ledger.jsonl: 287659 bytes
rtk-adoption-measure.jsonl: 
... [+88 chars truncated]

### Assistant | 2026-06-22T12:35:33.367Z

No stubs, no skip/only, 108 real assertions. Now the live validation: incremental cold-start must equal full `aggregateSavings` byte-identical on the real ledgers.

### Assistant | 2026-06-22T12:35:46.038Z

[tool_use: Bash]

### User | 2026-06-22T12:35:50.502Z

[tool_result] INCR totals:  {"nudges":4639,"hits":1704,"misses":15498,"savedTokens":565700,"ledgersWithData":6}
FULL totals:  {"nudges":4639,"hits":1704,"misses":15498,"savedTokens":565700,"ledgersWithData":6}
totals MATCH:   true
byLedger MATCH: true
  rtk-savings-ledger: size=694104 offset=694104 (clean boundary)
  prompt-rewrites: size=2503063 offset=2503063 (clean boundary)
  pre-tool-savings-multi: size=13
... [+260 chars truncated]

### Assistant | 2026-06-22T12:35:57.840Z

Live validation confirms the core invariant on the real ledgers: incremental cold-start == full parse, byte-identical (totals AND byLedger), checkpoint offsets land on exact file sizes (clean boundaries), and run2==run1 (no double-count). Note: live `savedTokens` = 565,700 vs commit message's stated 565,400 — a 300-token drift, but that is just the ledgers having grown since the commit was written (the equality between incr and full is what matters, and it holds). 

Now let me clean up my temp files and do a final check on one thing the tests don't cover: the `incrementalAggregate` partial-final-line + delta interaction where a partial line exists at cold-start AND the delta path is later taken. The tests cover this via the nav test. Let me verify there's no scenario where the totals `ledgersWithData` could differ between incremental and full when a ledger has a checkpoint carrying `lines:0` but is present. Actually I already validated byLedger is byte-identical live. Let me clean up.

### Assistant | 2026-06-22T12:35:58.791Z

[tool_use: Bash]

### User | 2026-06-22T12:36:02.804Z

[tool_result] cleaned

### Assistant | 2026-06-22T12:36:31.224Z

I have completed an independent end-to-end review. All four files read fully; all 35 tests run green; the core invariant live-validated on the real ledgers.

---

VERDICT: PASS

summary: U-PSN-INCREMENTAL-AGGREGATE is correct, well-tested, and safe. The incremental offset-checkpoint path produces byte-identical output to a full `aggregateSavings` re-parse — I verified this live on the six real ledgers (totals and byLedger both match exactly; run2==run1 with no double-count; all checkpoint offsets land on clean file-size boundaries). Byte (not char) offsets are used throughout (`readSync` position + Buffer-space slicing), the rotation/shrink guards correctly map to the real producer behavior (append-only writers + `stop-ledger-prune` head-drop = guaranteed shrink), and the tests are real algebraic-invariant checks with no stubs/skips.

findings:
  - [none] Test integrity (R9) — 108 real assertions across the two files, zero `.skip`/`.only`/`toBeDefined`/`todo`. The key invariant test (`scripts/__tests__/psn-savings-aggregate.test.mjs:228-242`) proves delta-fold == full-parse AND asserts the delta read begins exactly at the prior byte offset (reads only new bytes). Failure modes covered: prune-shrink (`:255-267`), front-rewrite-while-grew (`:269-285`), partial-final-line deferred-then-counted (`:287-301`). Adversarial multibyte byte-offset (`:303-315`) and real-fs integration (`.claude/hooks/__tests__/stop-psn-savings-aggregate.test.mjs:145-167`, `:131-143`). These would all fail if the logic broke (verified by tracing the assertions, not just running green).
  - [none] Byte vs char offsets — `readRangeOf`/`readHeadOf` (`stop-psn-savings-aggregate.mjs:95-120`) use `readSync(fd, buf, 0, len, position)` with byte positions; `sliceCompleteLines` (`psn-savings-aggregate.mjs:177-188`) works in Buffer space via `indexOf/lastIndexOf(NEWLINE)` and `buf.toString("utf8", begin, lastNl+1)`. Confirmed multibyte-safe by `readRangeOf` test (`:131-143`, café/中文 sub-range) and live l
... [+2784 chars truncated]
