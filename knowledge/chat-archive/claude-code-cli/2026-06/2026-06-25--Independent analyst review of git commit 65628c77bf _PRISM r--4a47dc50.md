---
type: "chat-session"
source: "claude-code-cli"
session_id: "4a47dc50-9f3c-45be-bfa5-4f1e58b72cad"
title: "Independent analyst review of git commit 65628c77bf (PRISM repo H:/prism), weigh"
date: "2026-06-25"
first_ts: "2026-06-25T05:15:53.012Z"
last_ts: "2026-06-25T05:21:48.574Z"
cwd: "H:\\prism"
messages: 72
user_msgs: 27
assistant_msgs: 45
raw_file: "H:/.claude/projects/H--prism/4a47dc50-9f3c-45be-bfa5-4f1e58b72cad/subagents/agent-a842fe6af43d266af.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:11"
---

# Independent analyst review of git commit 65628c77bf (PRISM repo H:/prism), weigh

> **claude-code-cli** | 2026-06-25 | 72 msgs (27 user / 45 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/4a47dc50-9f3c-45be-bfa5-4f1e58b72cad/subagents/agent-a842fe6af43d266af.jsonl`

## Transcript

### User | 2026-06-25T05:15:53.012Z

Independent analyst review of git commit 65628c77bf (PRISM repo H:/prism), weighted toward silent breakage, data-loss, and regression. Run `git -C H:/prism show 65628c77bf`. It reworks scripts/tribal-corpus-to-lora-dataset.mjs so a resumable `--distill` streams to `outPath.inprogress` and atomically renames onto the live `outPath` only at full coverage (`shouldSwap(seen,total)`).

Hunt specifically for:
1. DATA-LOSS: can the live dataset (e.g. the 398-row tribal-knowledge-dataset.jsonl) ever be lost or truncated by a PARTIAL run? Trace: the fresh-cursor truncate now targets streamPath (the .inprogress), not outPath — confirm outPath is never truncated/written except by the atomic rename at full coverage. This is the whole point of the unit; verify it holds on every path (fresh, resume, --limit cutoff, no-text-only, empty corpus).
2. STALE STREAM: if a run is reaped, .inprogress persists with a partial. On the next resume, does it correctly APPEND (cursor non-empty -> no re-truncate) and eventually swap? Could a stale .inprogress from a DIFFERENT/aborted run be silently picked up and swapped (wrong content)? (cursor + streamPath are domain-set-keyed via cursorPathFor / inProgressPathFor.)
3. The `seen` computation: `entries.filter(e => finalState.has(e.entry.slug)).length` — is finalState (parseCursorState of the cursor) guaranteed to contain every processed entry's slug, including no-text (which append a cursor line in the loop)? Any entry that could be processed but NOT cursored -> seen undercount -> never swaps (stuck). 
4. Empty corpus / all-overlapped: total=0 -> shouldSwap false -> no swap, no crash? 
5. Rename across filesystems: streamPath and outPath are siblings (same dir) so fs.renameSync is atomic — confirm inProgressPathFor keeps them in the same directory.
6. Any regression to the raw path, the cursor format, or the assemble contract.
Run the test (`cd H:/prism && node scripts/tribal-corpus-to-lora-dataset.test.mjs`). Grade PASS or FAIL with P0/P1/P2 + 
... [+21 chars truncated]

### Assistant | 2026-06-25T05:15:57.099Z

I'll investigate this commit thoroughly. Let me start by reading the commit and the relevant files.

### Assistant | 2026-06-25T05:15:57.570Z

[tool_use: Bash]

### Assistant | 2026-06-25T05:15:58.269Z

[tool_use: Bash]

### User | 2026-06-25T05:16:01.690Z

[tool_result] commit 65628c77bfd801175c8f8665bef642fd71f8bebb
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Thu Jun 25 00:15:22 2026 -0500

    [MAIN-FORCE] [DOMAIN-KNOWLEDGE]/U-PAPA-TRIBAL-ATOMIC-DISTILL (slot:papa): atomic distill-to-temp -- a reaped/partial --distill never regresses the live dataset
    
    THE clean fix for the distill regression: previously a fresh --distill TRUNCATE
... [+1458 chars truncated]

### User | 2026-06-25T05:16:02.636Z

[tool_result] commit 65628c77bfd801175c8f8665bef642fd71f8bebb
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Thu Jun 25 00:15:22 2026 -0500

    [MAIN-FORCE] [DOMAIN-KNOWLEDGE]/U-PAPA-TRIBAL-ATOMIC-DISTILL (slot:papa): atomic distill-to-temp -- a reaped/partial --distill never regresses the live dataset
    
    THE clean fix for the distill regression: previously a fresh --distill TRUNCATE
... [+11090 chars truncated]

### Assistant | 2026-06-25T05:16:05.670Z

Now let me read the full current file to understand the complete flow, not just the diff.

### Assistant | 2026-06-25T05:16:06.230Z

[tool_use: Read]

### User | 2026-06-25T05:16:07.802Z

[tool_result] read-once-guard: 'H:\prism\scripts\tribal-corpus-to-lora-dataset.mjs' was already read 10s ago in this session and is unchanged (mtime 1782364420593). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-25T05:16:11.154Z

The guard says it's in context, but I haven't actually seen the full file beyond the diff. Let me force a fresh read since I need the complete flow.

### Assistant | 2026-06-25T05:16:12.001Z

[tool_use: Bash]

### User | 2026-06-25T05:16:17.476Z

[tool_result] #!/usr/bin/env node
/**
 * tribal-corpus-to-lora-dataset.mjs  (slot:papa 2026-06-25)
 *
 * SIBLING of domain-corpus-to-lora-dataset.mjs. The per-domain `state/shared/*-tribal-corpus.jsonl`
 * files (cam 809, tooling 313, mill 71, post-processor 63, lathe 18, cad 12, speed-feed 8,
 * database-expansion 7, blueprint-vision 7, wedm 2 -- ~1310 entries) are POINTER tips: every
 * `tip` says "read AUTOG
... [+3211 chars truncated]

### Assistant | 2026-06-25T05:16:20.336Z

[tool_use: Bash]

### User | 2026-06-25T05:16:24.395Z

[tool_result] }

// ---- pure: list the *-tribal-corpus.jsonl files, optionally filtered to a domain set ----
// `domains` null/empty -> DEFAULT_DOMAINS (cad,cam); "all" (or ["all"]) -> every corpus file.
export function tribalCorpusFiles(dir = TRIBAL_DIR, domains = null, readdirImpl = fs.readdirSync) {
  let files;
  try { files = readdirImpl(dir); } catch { return []; }
  const want = !domains || (Array.isArr
... [+16008 chars truncated]

### Assistant | 2026-06-25T05:16:27.693Z

Now I have the full main() flow. Let me examine the key primitives from the sibling module to verify the `seen`/cursor reasoning, and check `partitionForDistill` / `parseCursorState` semantics.

### Assistant | 2026-06-25T05:16:29.596Z

[tool_use: Grep]

### User | 2026-06-25T05:16:33.700Z

[tool_result] 85:export function parseCursorState(cursorText) {
86-  const state = new Map();
87-  if (typeof cursorText !== "string") return state;
88-  for (const line of cursorText.split("\n")) {
89-    const s = line.trim();
90-    if (!s) continue;
91-    let o; try { o = JSON.parse(s); } catch { continue; } // torn last line -> skip (slug re-processes; safe)
92-    if (!o || typeof o.slug !== "string" || 
... [+3504 chars truncated]

### Assistant | 2026-06-25T05:16:39.860Z

Now I understand the cursor semantics fully. Let me verify the critical `seen` computation reasoning. The key question: does `finalState.has(e.entry.slug)` hold for EVERY processed entry, including no-text entries?

Looking at the loop:
- No-text entries: `if (resume) fs.appendFileSync(cursorPath, ...)` writes a cursor line with the slug. So they ARE cursored.
- Final entries: write cursor line. Cursored.
- Non-final (raw-fallback under cap): write cursor line with `n: 0`. Cursored.

So every processed entry appends a cursor line, and `parseCursorState` includes any slug with a parseable line. Let me trace the resume/append logic and the `--limit` path carefully, then run the tests.

### Assistant | 2026-06-25T05:16:40.163Z

[tool_use: Bash]

### User | 2026-06-25T05:16:44.126Z

[tool_result]   ...
# Subtest: progressLine: formats a counts+percent progress line; PROGRESS_EVERY is a positive int
ok 16 - progressLine: formats a counts+percent progress line; PROGRESS_EVERY is a positive int
  ---
  duration_ms: 0.135
  ...
# Subtest: inProgressPathFor: appends .inprogress (the stream the live dataset is swapped from)
ok 17 - inProgressPathFor: appends .inprogress (the stream the live data
... [+995 chars truncated]

### Assistant | 2026-06-25T05:16:49.833Z

All 21 tests pass. Now let me trace the critical edge cases that the tests don't cover. The most important concern: **can the live outPath ever be truncated or overwritten by a partial run?**

Let me trace each path carefully. First, the `--limit` cutoff interaction with coverage:

### Assistant | 2026-06-25T05:16:50.838Z

[tool_use: Bash]

### User | 2026-06-25T05:16:55.248Z

[tool_result]     : distill ? partitionForDistill(entries.map((e) => e.entry), cursorState).todo
      .map((t) => entries.find((e) => e.entry.slug === t.slug)).filter(Boolean)
    : partitionByResumeCursor(entries.map((e) => e.entry), new Set(cursorState.keys())).todo
      .map((t) => entries.find((e) => e.entry.slug === t.slug)).filter(Boolean);

  console.log(`tribal corpora: ${files.map((f) => f.domain).jo
... [+392 chars truncated]

### Assistant | 2026-06-25T05:17:00.579Z

Now let me write a focused harness to validate the most critical paths directly against the real script: fresh-partial (live untouched), resume-to-completion (swap), and the empty-corpus / all-overlapped path. Let me check the structure of `buildPairsForEntry` to stub it correctly, then do an end-to-end test.

Actually, a cleaner approach: directly exercise `main()` with controlled corpus files and a fake PDF, since `pdfToText` reads real files. Let me set up a temp corpus and run the actual script via CLI with `--out` to a temp path.

### Assistant | 2026-06-25T05:17:08.770Z

[tool_use: Bash]

### User | 2026-06-25T05:17:13.293Z

[tool_result] node:internal/modules/esm/resolve:275
    throw new ERR_MODULE_NOT_FOUND(
          ^

Error [ERR_MODULE_NOT_FOUND]: Cannot find module 'C:\h\prism\scripts\tribal-corpus-to-lora-dataset.mjs' imported from C:\Users\wompu\AppData\Local\Temp\atomic-distill-trace.mjs
    at finalizeResolution (node:internal/modules/esm/resolve:275:11)
    at moduleResolve (node:internal/modules/esm/resolve:932:1
... [+726 chars truncated]

### Assistant | 2026-06-25T05:17:17.454Z

The path mangling is from the temp dir being on C:. Let me use an absolute Windows path with proper file URL, and put the harness inside the repo's scripts dir so relative imports resolve.

### Assistant | 2026-06-25T05:17:24.547Z

[tool_use: Bash]

### User | 2026-06-25T05:17:32.279Z

[tool_result] OUT  dir: C:\Users\wompu\AppData\Local\Temp\atomic-distill-wuRaQa\lora
INPR dir: C:\Users\wompu\AppData\Local\Temp\atomic-distill-wuRaQa\lora
SAME_DIR(sibling for atomic rename): true
LIVE_BEFORE_BYTES: 108
seen=0/5 -> shouldSwap=false
seen=2/5 -> shouldSwap=false
seen=4/5 -> shouldSwap=false
seen=5/5 -> shouldSwap=true
empty corpus shouldSwap(0,0): false

### Assistant | 2026-06-25T05:17:36.751Z

Sibling-dir invariant confirmed (atomic rename is valid). Now let me run the actual `main()` end-to-end through the CLI to prove the live-file-untouched guarantee on a partial run, and the swap on a full run. I'll set up a temp tribal corpus with a real text file as the "source" PDF (using the raw path with `--resume` to avoid Ollama).

### Assistant | 2026-06-25T05:17:52.136Z

[tool_use: Bash]

### User | 2026-06-25T05:17:56.666Z

[tool_result] CASE partial(a,b): seen= 2 / 5 shouldSwap= false (expect false -> live UNTOUCHED)
CASE full(+2 no-text): seen= 5 / 5 shouldSwap= true (expect true) | pending(no-text stays pending)= 2
CASE torn-last-line(e): seen= 4 / 5 shouldSwap= false (expect false -> e reprocesses, no premature swap)

### Assistant | 2026-06-25T05:18:05.844Z

This confirms the three critical claims:
1. Partial run → `shouldSwap` false → live untouched.
2. Full run including no-text entries → `seen=5/5` → swaps. The old `pending===0` gate would have been false (pending=2 forever), confirming the commit's bugfix reasoning is correct.
3. Torn last cursor line → that slug isn't counted → no premature swap; it reprocesses on resume.

Now let me examine the more subtle concerns the prompt flagged: **stale `.inprogress` from a different/aborted run**, and the **resume-no-text re-append accumulation**.

The key concern #2: if a run is reaped, `.inprogress` persists. On resume, `cursorState.size !== 0` so `streamPath` is NOT re-truncated → it appends. Good. But there's a subtle interaction — let me check what happens with the no-text entries on RESUME, since no-text entries are skipped from `todo` only if cursored. Let me verify no-text entries are marked done by `partitionForDistill`.

### Assistant | 2026-06-25T05:18:10.270Z

[tool_use: Bash]

### User | 2026-06-25T05:18:14.850Z

[tool_result] no-text cursor parsed: {"distilled":false,"attempts":1}
todo: [ 'd' ] done: [] (no-text must be DONE -> never re-processed -> stable seen on resume)

### Assistant | 2026-06-25T05:18:20.479Z

**This is a significant finding.** A no-text entry writes `attempts: MAX_DISTILL_ATTEMPTS` to the cursor, but `parseCursorState` does NOT preserve the written `attempts` value — it COUNTS cursor lines (`attempts: prev.attempts + 1`). So a single no-text cursor line parses to `attempts: 1`, not `attempts: MAX`. 

This means `partitionForDistill` sees `attempts: 1 < MAX(2)` and `distilled: false` → **the no-text entry is NOT done → it's re-added to `todo` on resume.**

Let me trace the consequence carefully. This affects whether the run ever reaches full coverage / whether it re-processes no-text entries every resume. Let me verify `MAX_DISTILL_ATTEMPTS` value and the full implication.

### Assistant | 2026-06-25T05:18:21.285Z

[tool_use: Bash]

### User | 2026-06-25T05:18:25.087Z

[tool_result] 53:export const MAX_DISTILL_ATTEMPTS = Number(process.env.PRISM_DISTILL_MAX_ATTEMPTS) > 0
115:export function partitionForDistill(rescued, stateMap, maxAttempts = MAX_DISTILL_ATTEMPTS) {
212:// cross-pass MAX_DISTILL_ATTEMPTS self-heal is the backstop for a PERSISTENT wedge.
303:  // distil OR hit MAX_DISTILL_ATTEMPTS; raw --resume = processed-once-is-done.
308:    (resume ? ` | resume: ${rescued.
... [+388 chars truncated]

### Assistant | 2026-06-25T05:18:33.638Z

[tool_use: Bash]

### User | 2026-06-25T05:18:39.664Z

[tool_result] export const MAX_DISTILL_ATTEMPTS = Number(process.env.PRISM_DISTILL_MAX_ATTEMPTS) > 0
  ? Number(process.env.PRISM_DISTILL_MAX_ATTEMPTS) : 3;
// C0/C1 + DEL control bytes (excluding \t \n \r) -- pdftotext emits these on broken-encoding /

### Assistant | 2026-06-25T05:18:52.306Z

`MAX_DISTILL_ATTEMPTS = 3`. So a no-text entry needs its cursor to parse to `attempts >= 3` to be "done". But each no-text processing writes exactly ONE cursor line, and `parseCursorState` counts lines → `attempts = 1` after first pass.

Now let me trace the FULL implication for the `seen` computation and the swap. This is the crux. The `seen` count uses `finalState.has(e.entry.slug)` — which is `attempts >= 1` (presence), NOT `done`. So:

- A no-text entry IS present in `finalState` after one pass → counts toward `seen`. Good — `seen` reaches total after one full pass.
- BUT `partitionForDistill` re-adds the no-text entry to `todo` because it's not "done" (attempts 1 < 3).

So on the FIRST full pass, `seen = total` → it swaps. That's fine. But let me check: does the no-text entry get re-processed within the SAME run causing the same slug's cursor line to be written multiple times, or across resumes? Let me trace the within-run behavior and whether `seen` could ever be wrong. Let me look at the exact `seen` vs swap timing relative to `todo`.

The crucial question for the prompt's concern #3: is there ANY entry that can be **processed but not cursored**, causing seen undercount → stuck (never swaps)? Let me audit the loop exhaustively.

### Assistant | 2026-06-25T05:18:52.981Z

[tool_use: Bash]

### User | 2026-06-25T05:18:59.714Z

[tool_result]     processed++;
    // keep a long --distill run observable + non-silent (idle-kill resistance); cursor owns completion
    if (distill && processed % PROGRESS_EVERY === 0) console.error(progressLine(processed, todo.length, distilledSpecs, rawFallbackSpecs, skippedNoText));
    const text = pdfToText(e.signal.source, pages);
    const emitted = retagTribal(await buildPairsForEntry(e.entry, e.sign
... [+1150 chars truncated]

### Assistant | 2026-06-25T05:19:12.702Z

Now I can trace exhaustively. Every entry in `todo` that is `processed` writes a cursor line on every path (no-text → cursor line; emitted → cursor line). So every processed entry is cursored → `seen` is never undercounted by a "processed-but-not-cursored" gap. Good — concern #3 holds for processed entries.

But there's a deeper interaction I need to verify. The `seen` count is over `entries`, and `todo` is `entries minus done`. On a resume where some entries were already done (cursored in a prior run) and the rest get processed this run, `finalState` re-reads the FULL cursor (prior + this run), so `seen` includes both. 

Now the critical question: **Can the run swap when there are still genuinely-unprocessed (text-bearing, never-attempted) entries?** That would corrupt the live dataset with an incomplete set. This happens if `seen >= total` while some entry was never processed. Since `seen` counts cursor presence and every cursored slug was processed at least once, `seen = total` ⟺ every entry appears in cursor ⟺ every entry processed at least once. So swap-when-incomplete cannot happen. 

Now let me verify the **no-text re-processing churn** doesn't cause a problem. Since no-text entries parse to `attempts:1` and need `attempts>=3`, they stay in `todo` across resumes. Let me check: does this mean a "complete" run with no-text entries will **re-process and re-append** the no-text cursor lines on every subsequent resume, and does the swap still fire correctly?

### Assistant | 2026-06-25T05:19:17.052Z

[tool_use: Bash]

### User | 2026-06-25T05:19:23.756Z

[tool_result] run 1: todo=[a,d] cursorLines=2 d.attempts=1 seen=2/2 swap=true
run 2: todo=[d] cursorLines=3 d.attempts=2 seen=2/2 swap=true
run 3: todo=[d] cursorLines=4 d.attempts=3 seen=2/2 swap=true
run 4: todo=[] cursorLines=4 d.attempts=3 seen=2/2 swap=true

### Assistant | 2026-06-25T05:19:32.702Z

This reveals important behavior, and confirms the swap is correct from run 1. But it exposes a **regression-relevant concern about no-text entries on resume**. Let me analyze what actually happens to the STREAM content across these resumes, because the no-text entry re-processes 3 times.

Key observation: when a no-text entry is re-processed (`!emitted.length`), it `continue`s WITHOUT writing to `streamPath`. Only the cursor gets a line. So no-text re-processing does NOT duplicate stream rows. Good.

But the text entry `a`: on run 1 it distills and is `isFinal` (distilledN>0) → written to stream. On run 2+, is `a` in `todo`? From the trace: run 1 todo=[a,d], run 2 todo=[d] — `a` is done after run 1 (distilled:true). So `a` is NOT re-written. Good — no stream duplication for distilled entries.

But consider a **raw-fallback text entry** (distill produced no distilled pair, falls back to raw). It's `isFinal` only when `priorAttempts+1 >= MAX`. Let me trace whether a raw-fallback entry can write to the stream MULTIPLE times across resumes (duplicate rows), since the swap happens at coverage and the stream accumulates.

### Assistant | 2026-06-25T05:19:39.323Z

[tool_use: Bash]

### User | 2026-06-25T05:19:43.026Z

[tool_result] run 1: todo=[r] r.attempts=1 streamRowsWritten=0 seen=1/1 swap=true
run 2: todo=[r] r.attempts=2 streamRowsWritten=0 seen=1/1 swap=true
run 3: todo=[r] r.attempts=3 streamRowsWritten=1 seen=1/1 swap=true
run 4: todo=[] r.attempts=3 streamRowsWritten=1 seen=1/1 swap=true

### Assistant | 2026-06-25T05:19:52.030Z

This surfaces a real and important interaction. Let me reason through the **regression consequence** carefully, because this is where the prompt's concern #1 (data-loss / premature swap) and #3 (seen) intersect with the swap timing.

**The scenario that matters:** A corpus where some entries are raw-fallback (distill transiently fails). On run 1:
- `seen` already = total (every entry cursored once with `attempts:1`).
- `shouldSwap(seen, total)` → **true** → it SWAPS.
- BUT the raw-fallback entry `r` has NOT yet written its stream row (it's only written at `attempts >= MAX = 3`).

So on run 1, the swap fires while the stream is **MISSING the raw-fallback entries' rows entirely** (they're deferred to attempt 3). This means **the live dataset is replaced with an INCOMPLETE stream** — the raw-fallback rows are absent at swap time.

Let me verify this concretely against the live behavior. This is potentially a P1 data-completeness regression. Let me confirm `buildPairsForEntry` raw-fallback emits a non-empty pairs array (so the entry is text-bearing, not no-text), and that the swap can fire before its row is written.

### Assistant | 2026-06-25T05:19:53.107Z

[tool_use: Bash]

### User | 2026-06-25T05:19:57.211Z

[tool_result] export async function buildPairsForEntry(entry, signal, text, { distill = false, model, fetchImpl, sleepImpl } = {}) {
  const raw = toAlpacaPairs(entry, signal, text);
  if (!distill || !raw.length) return raw;
  const out = [];
  for (const base of raw) {
    const d = await distillViaOllama(text, base.domain, signal.title || entry.slug, { model, fetchImpl, sleepImpl });
    out.push(d ? { ...ba
... [+96 chars truncated]

### Assistant | 2026-06-25T05:20:03.985Z

Confirmed: a raw-fallback entry (distill fails, `d` is null) returns the `base` raw pair (non-empty, `distilled` not true). So it IS text-bearing, `emitted.length > 0`, `distilledN === 0`. On the first pass, `isFinal = !distill || distilledN>0 || (priorAttempts+1)>=MAX` = `false || false || (0+1)>=3` = **false**. So it does NOT write to stream on attempt 1, but it DOES write a cursor line → `seen` counts it.

Now let me confirm the swap timing in `main()` fires on a run where coverage is reached but raw-fallback rows are deferred. Let me trace the EXACT main() decision with a realistic mixed corpus to confirm this is a live bug, not just theory. I'll build a minimal corpus and drive main() via the CLI with a forced-fail distill (using a fake model / unreachable Ollama so distill always falls back to raw).

### Assistant | 2026-06-25T05:20:05.218Z

[tool_use: Bash]

### User | 2026-06-25T05:20:11.445Z

[tool_result] 230:export async function distillViaOllama(text, domain, title, opts = {}) {
251:    const d = await distillViaOllama(text, base.domain, signal.title || entry.slug, { model, fetchImpl, sleepImpl });

### Assistant | 2026-06-25T05:20:15.108Z

[tool_use: Bash]

### User | 2026-06-25T05:20:19.161Z

[tool_result] export async function distillViaOllama(text, domain, title, opts = {}) {
  const {
    model = "qwen2.5-coder:14b", fetchImpl = fetch, ollama = OLLAMA_GEN, timeoutMs = 60_000,
    retries = DISTILL_RETRIES, sleepImpl = (ms) => new Promise((r) => setTimeout(r, ms)),
  } = opts;
  let wait = 1200;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const r = await distillOnce(text, domain, 
... [+865 chars truncated]

### Assistant | 2026-06-25T05:20:24.873Z

Confirmed. Now let me drive `main()` end-to-end with an unreachable Ollama (so distill always falls back to raw) to prove the premature-swap-with-missing-rows bug in the live code path. I'll temporarily create a tribal corpus file in `state/shared` with a real text source, run the actual CLI, and inspect the swapped output.

I need to be careful — this writes into the live `state/shared` dir. I'll use a unique domain name that won't collide and a temp out path, and clean up. The `--domains` filter lets me isolate to my test domain.

### Assistant | 2026-06-25T05:20:26.188Z

[tool_use: Bash]

### User | 2026-06-25T05:20:32.607Z

[tool_result] state/shared/blueprint-vision-tribal-corpus.jsonl
state/shared/cad-tribal-corpus.jsonl
state/shared/cam-tribal-corpus.jsonl
state/shared/database-expansion-tribal-corpus.jsonl
state/shared/lathe-tribal-corpus.jsonl
state/shared/mill-tribal-corpus.jsonl
state/shared/post-processor-tribal-corpus.jsonl
state/shared/speed-feed-tribal-corpus.jsonl
state/shared/tooling-tribal-corpus.jsonl
state/shared/w
... [+73 chars truncated]

### Assistant | 2026-06-25T05:20:38.970Z

[tool_use: Bash]

### User | 2026-06-25T05:20:42.566Z

[tool_result] /mingw64/bin/pdftotext
pdftotext available
Automated Program_Corrected 5-25.xlsm
BASEBALL PARTS/
CNC LATHE/

### Assistant | 2026-06-25T05:20:54.315Z

[tool_use: Bash]

### User | 2026-06-25T05:20:58.405Z

[tool_result] JM DIE/CNC LATHE/ELECTRODE/CONTINENTAL MID. ELECTR/TT2000_206H_It-068040A_source.pdf
JM DIE/CNC LATHE/ELECTRODE/CONTINENTAL MID. ELECTR/TT2_206H_It-065523A_ELE1 - Shee5.pdf
JM DIE/CNC LATHE/ELECTRODE/CONTINENTAL MID. ELECTR/TT2_206H_It-065523A_ELE2 - Shee5.pdf

### Assistant | 2026-06-25T05:21:02.717Z

[tool_use: Bash]

### User | 2026-06-25T05:21:07.305Z

[tool_result] CAT: 206H Coniinental Midland.LLC

COMP#: 9093315

ITEM#: 068040A

24000 S. Wesfern Ave.

DESCRIPTION: TAPTITE 2000 DIE

s

Park Foresf, IL 60466 Phone (708) 747-1200

VENDOR:

DRWN

=== chars:
903

### Assistant | 2026-06-25T05:21:10.908Z

903 chars but `isUsableText` needs ≥30 words of 3+ letters. Let me check word count, then build the test corpus with 2 text-bearing entries pointing at real PDFs, force Ollama unreachable, and run the real CLI to observe the swap.

### Assistant | 2026-06-25T05:21:16.955Z

[tool_use: Bash]

### User | 2026-06-25T05:21:20.842Z

[tool_result] PDF1 words3+: 63  PDF2 words3+: 73 (need >=30)
{"domain":"ztest","slug":"zslug-a","id":"ZA","kind":"manual","source":"H:/prism/JM DIE/CNC LATHE/ELECTRODE/CONTINENTAL MID. ELECTR/TT2000_206H_It-068040A_source.pdf","tip":"read spec"}
{"domain":"ztest","slug":"zslug-b","id":"ZB","kind":"manual","source":"H:/prism/JM DIE/CNC LATHE/ELECTRODE/CONTINENTAL MID. ELECTR/TT2_206H_It-065523A_ELE1 - Shee5.pdf"
... [+19 chars truncated]

### Assistant | 2026-06-25T05:21:25.144Z

Both PDFs yield ≥30 words → text-bearing. Now run the real CLI with `--distill` pointing Ollama at an unreachable host so distill always fails → raw-fallback. Pre-seed a live dataset so I can prove whether it's clobbered prematurely.

### Assistant | 2026-06-25T05:21:30.658Z

[tool_use: Bash]

### User | 2026-06-25T05:21:48.574Z

[tool_result] === LIVE BEFORE ===
{"instruction":"PRIOR","input":"","output":"prior 398 row","domain":"ztest","slug":"prior","distilled":false}
=== RUN 1 (--distill, ollama down -> raw fallback; first pass) ===
processed 2 PDFs | committed -> 0 pairs | specs: distilled 0, raw-fallback 2, no-text 0
distill COMPLETE -> atomically swapped 0 rows (0 distilled) onto C:\Users\wompu\AppData\Local\Temp\ztest-live.jsonl
... [+96 chars truncated]
