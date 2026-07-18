---
type: "chat-session"
source: "claude-code-cli"
session_id: "4a47dc50-9f3c-45be-bfa5-4f1e58b72cad"
title: "Rigorously review git commit 65628c77bf (PRISM repo H:/prism, branch cad-fusion-"
date: "2026-06-25"
first_ts: "2026-06-25T05:15:42.834Z"
last_ts: "2026-06-25T05:20:52.271Z"
cwd: "H:\\prism"
messages: 58
user_msgs: 20
assistant_msgs: 38
raw_file: "H:/.claude/projects/H--prism/4a47dc50-9f3c-45be-bfa5-4f1e58b72cad/subagents/agent-a3e7e26503c8e0cad.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:11"
---

# Rigorously review git commit 65628c77bf (PRISM repo H:/prism, branch cad-fusion-

> **claude-code-cli** | 2026-06-25 | 58 msgs (20 user / 38 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/4a47dc50-9f3c-45be-bfa5-4f1e58b72cad/subagents/agent-a3e7e26503c8e0cad.jsonl`

## Transcript

### User | 2026-06-25T05:15:42.834Z

Rigorously review git commit 65628c77bf (PRISM repo H:/prism, branch cad-fusion-live-ms0). Run `git -C H:/prism show 65628c77bf`. It adds "atomic distill-to-temp" to scripts/tribal-corpus-to-lora-dataset.mjs: a resumable `--distill` run now streams to `outPath.inprogress` (pure `inProgressPathFor`) instead of the live `outPath`, leaving the live dataset's prior content UNTOUCHED, and atomically `fs.renameSync(streamPath, outPath)` ONLY when `shouldSwap(seen, total)` is true (seen = entries whose slug is in the final cursor; full coverage). Read the whole file end-to-end, plus the reused primitives in scripts/domain-corpus-to-lora-dataset.mjs (parseCursorState, partitionForDistill).

Verify specifically:
1. CORRECTNESS of the swap gate: `shouldSwap(seen, total)` = seen>=total>0. The commit msg says the first cut wrongly used `pending===0` (no-text entries stay pending forever because parseCursorState counts cursor LINES). Confirm the coverage-based gate is correct and that `seen = entries.filter(e => finalState.has(e.entry.slug)).length` correctly counts processed entries (including no-text, which DO write a cursor line).
2. NO-REGRESSION invariant: on a partial/reaped run (seen<total), the live outPath is never written/renamed — confirm by tracing every write site (the loop appends to streamPath, not outPath; the swap is gated).
3. The RAW (non-resume) path: confirm streamPath === outPath when !resume, so raw `--out` still writes outPath directly (unchanged behavior).
4. The clobber-guard relocated to swap-time: correct? Does it warn before renaming a narrower-set stream over a wider live dataset?
5. Idempotency / edge: after a complete swap, streamPath no longer exists — a re-run with a full cursor should not crash (the `fs.existsSync(streamPath)` guard on the swap).
6. Could a crash BETWEEN the cursor-append and the rename leave an inconsistent state? (rename is atomic; the stream + cursor persist across reaps.)
Run `cd H:/prism && node scripts/tribal-corpus-to-lo
... [+95 chars truncated]

### Assistant | 2026-06-25T05:15:46.354Z

I'll review commit 65628c77bf rigorously. Let me start by examining the commit and the relevant files.

### Assistant | 2026-06-25T05:15:46.865Z

[tool_use: Bash]

### User | 2026-06-25T05:15:52.893Z

[tool_result] commit 65628c77bfd801175c8f8665bef642fd71f8bebb
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Thu Jun 25 00:15:22 2026 -0500

    [MAIN-FORCE] [DOMAIN-KNOWLEDGE]/U-PAPA-TRIBAL-ATOMIC-DISTILL (slot:papa): atomic distill-to-temp -- a reaped/partial --distill never regresses the live dataset
    
    THE clean fix for the distill regression: previously a fresh --distill TRUNCATE
... [+11090 chars truncated]

### Assistant | 2026-06-25T05:15:55.630Z

Now let me read the full file end-to-end to understand the surrounding contract.

### Assistant | 2026-06-25T05:15:56.046Z

[tool_use: Read]

### User | 2026-06-25T05:15:58.217Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * tribal-corpus-to-lora-dataset.mjs  (slot:papa 2026-06-25)
4	 *
5	 * SIBLING of domain-corpus-to-lora-dataset.mjs. The per-domain `state/shared/*-tribal-corpus.jsonl`
6	 * files (cam 809, tooling 313, mill 71, post-processor 63, lathe 18, cad 12, speed-feed 8,
7	 * database-expansion 7, blueprint-vision 7, wedm 2 -- ~1310 entries) are POINTER tips: every
8	 * `tip` 
... [+20715 chars truncated]

### Assistant | 2026-06-25T05:16:01.952Z

Now let me read the reused primitives in the sibling file to verify `parseCursorState` and `partitionForDistill` behavior.

### Assistant | 2026-06-25T05:16:02.066Z

[tool_use: Read]

### User | 2026-06-25T05:16:03.632Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * domain-corpus-to-lora-dataset.mjs  (slot:papa 2026-06-24)
4	 *
5	 * THE MISSING PLUMBING: turn the rescued per-domain knowledge (the resource-pdf specs
6	 * that reclassify-domain-feeders-ollama.mjs lifted out of the keyword-unclassified
7	 * residual) into ACTUAL LoRA training data.
8	 *
9	 * getDomainCorpus + the per-domain tribal corpora are a POINTER/orchestrat
... [+22573 chars truncated]

### Assistant | 2026-06-25T05:16:07.677Z

Now let me run the test suite to verify the claimed 21 passes.

### Assistant | 2026-06-25T05:16:09.029Z

[tool_use: Bash]

### User | 2026-06-25T05:16:15.624Z

[tool_result]   ...
# Subtest: progressLine: formats a counts+percent progress line; PROGRESS_EVERY is a positive int
ok 16 - progressLine: formats a counts+percent progress line; PROGRESS_EVERY is a positive int
  ---
  duration_ms: 0.1499
  ...
# Subtest: inProgressPathFor: appends .inprogress (the stream the live dataset is swapped from)
ok 17 - inProgressPathFor: appends .inprogress (the stream the live dat
... [+996 chars truncated]

### Assistant | 2026-06-25T05:16:20.157Z

All 21 tests pass. Now let me verify the specific claims in the review. Let me trace the key invariants carefully.

First, let me verify the coverage-counting logic — specifically whether the no-text path writes a cursor line (so `finalState.has(slug)` is true).

### Assistant | 2026-06-25T05:16:21.209Z

[tool_use: Read]

### User | 2026-06-25T05:16:22.622Z

[tool_result] 241	  for (const e of todo) {
242	    if (processed >= limit) break;
243	    processed++;
244	    // keep a long --distill run observable + non-silent (idle-kill resistance); cursor owns completion
245	    if (distill && processed % PROGRESS_EVERY === 0) console.error(progressLine(processed, todo.length, distilledSpecs, rawFallbackSpecs, skippedNoText));
246	    const text = pdfToText(e.signal.sou
... [+1664 chars truncated]

### Assistant | 2026-06-25T05:16:30.956Z

Now I have the full picture. Let me trace through each verification point carefully, paying close attention to a critical interaction: the `limit` parameter and the coverage gate.

Let me verify a subtle concern — what happens when `--limit` is used with `--distill`. Let me trace the `seen` calculation against `entries.length` (full corpus) vs `todo` (processed subset).

### Assistant | 2026-06-25T05:16:32.005Z

[tool_use: Read]

### User | 2026-06-25T05:16:35.180Z

[tool_result] 270	  if (write && resume) {
271	    const fileRows = fs.existsSync(streamPath) ? fs.readFileSync(streamPath, "utf8").split("\n").filter(Boolean) : [];
272	    const distilledRows = fileRows.filter((l) => /"distilled":\s*true/.test(l)).length;
273	    const finalState = fs.existsSync(cursorPath) ? parseCursorState(fs.readFileSync(cursorPath, "utf8")) : new Map();
274	    const pending = partitionF
... [+1641 chars truncated]

### Assistant | 2026-06-25T05:16:38.496Z

Now let me examine the test file for the two new tests to verify they are real assertions (not stubs), and check the whole test file's integrity.

### Assistant | 2026-06-25T05:16:39.094Z

[tool_use: Read]

### User | 2026-06-25T05:16:41.296Z

[tool_result] 195	  assert.ok(Number.isInteger(PROGRESS_EVERY) && PROGRESS_EVERY > 0);
196	});
197	
198	// ---- atomic distill-to-temp: stream to .inprogress, swap onto live outPath only when complete ----
199	test("inProgressPathFor: appends .inprogress (the stream the live dataset is swapped from)", () => {
200	  assert.equal(inProgressPathFor("/x/tribal-knowledge-dataset.jsonl"), "/x/tribal-knowledge-dataset
... [+1273 chars truncated]

### Assistant | 2026-06-25T05:16:43.607Z

Now let me verify there are no `.skip` / `.only` in the test file and confirm the full test count.

### Assistant | 2026-06-25T05:16:45.016Z

[tool_use: Grep]

### Assistant | 2026-06-25T05:16:45.672Z

[tool_use: Grep]

### User | 2026-06-25T05:16:46.614Z

[tool_result] No matches found

### User | 2026-06-25T05:16:47.219Z

[tool_result] scripts\tribal-corpus-to-lora-dataset.test.mjs:21

Found 21 total occurrences across 1 file.

### Assistant | 2026-06-25T05:16:54.972Z

No `.skip`/`.only`, 21 real tests. Now let me trace the critical edge case the review asks about — point 5 (idempotency after a complete swap) and point 6 (crash between cursor-append and rename). Let me think through the re-run scenario after a successful swap.

After a complete swap: `streamPath` was renamed to `outPath`, so `streamPath` (`.inprogress`) no longer exists. The cursor file still exists with full coverage. On a re-run:
- `resume = true`, `cursorState` loads with full coverage (`size > 0`)
- The fresh-truncate block at line 225 is skipped (cursorState.size != 0), so `streamPath` is NOT created
- `todo` = `partitionForDistill(...).todo` — re-run only retries non-distilled raw-fallback entries (those under attempts cap)

Let me verify a potential edge: if the re-run's `todo` is empty (everything distilled/capped), the loop appends nothing to `streamPath`. Then at the swap block, `fs.existsSync(streamPath)` is false → swap is skipped, falls to the IN-PROGRESS branch which reads `fileRows` from non-existent `streamPath` = `[]`. Let me confirm this doesn't crash and check the messaging implications.

### Assistant | 2026-06-25T05:17:06.173Z

[tool_use: Bash]

### User | 2026-06-25T05:17:12.153Z

[tool_result] Exit code 1
node:internal/modules/run_main:122
    triggerUncaughtException(
    ^

Error [ERR_MODULE_NOT_FOUND]: Cannot find module 'C:\Users\wompu\AppData\Local\Temp\scripts\tribal-corpus-to-lora-dataset.mjs' imported from C:\Users\wompu\AppData\Local\Temp\edge-test.mjs
Did you mean to import "../../../../../../H:/prism/scripts/tribal-corpus-to-lora-dataset.mjs"?
    at finalizeResolution 
... [+702 chars truncated]

### Assistant | 2026-06-25T05:17:15.934Z

The temp file is in a different directory. Let me use absolute import paths.

### Assistant | 2026-06-25T05:17:28.879Z

[tool_use: Bash]

### User | 2026-06-25T05:17:34.165Z

[tool_result] SCENARIO A: seen = 3 total = 3 shouldSwap = true
  pending(retryable) = 1
SCENARIO B: no-text in finalState? true coverage-count: 1
SCENARIO C (reaped): seen = 1 total = 3 shouldSwap = false (must be false)
SCENARIO D (full coverage, b retryable): seen = 2 shouldSwap = true pending = 1 -> swaps WITH a retryable still pending

### Assistant | 2026-06-25T05:17:43.212Z

This confirms the logic and surfaces a subtle but important behavioral point (Scenario D). Let me analyze each verification point now.

**Scenario D is the key behavioral interaction**: a raw-fallback entry (Ollama transiently failed, `distilled:0`, `attempts < cap`) writes a cursor line (line 262) AND writes its raw rows to the stream (`isFinal` is true only when distilled or capped — wait, let me re-check). Let me verify whether a non-final raw-fallback writes a cursor line that counts toward coverage.

Looking at line 257: `isFinal = !distill || distilledN > 0 || (priorAttempts + 1) >= MAX_DISTILL_ATTEMPTS`. For a raw-fallback under cap in distill mode: `isFinal = false`. Then line 262 **always** appends a cursor line (outside the `if (isFinal)` block) with `n: 0`. So the slug IS in `finalState`, counting toward `seen`/coverage — but `partitionForDistill` returns it as `todo` (retryable since attempts < cap and not distilled).

This means **the swap fires at full coverage even when retryable raw-fallback entries remain** — but those non-final entries wrote NO rows to the stream. Let me verify this is correct/intended and trace the consequence.

### Assistant | 2026-06-25T05:17:51.324Z

[tool_use: Bash]

### User | 2026-06-25T05:17:55.756Z

[tool_result] RUN1: seen 2 / 2 shouldSwap true | b retryable? true
  => swap happens with a's rows only; b had 0 rows written this run.
  => Is b's prior content preserved? NO -- live had 398 raw; swap replaces ALL of it with stream (a only).

### Assistant | 2026-06-25T05:18:08.454Z

This is a real finding worth examining closely. Let me re-read the relevant lines to confirm whether a non-final raw-fallback truly produces a cursor line but no stream row, and whether this constitutes a regression in the actual distill workflow.

Let me re-verify line 262 — the cursor append is unconditional (outside `if (isFinal)`):

Lines 255-262:
```
if (resume) {
  const priorAttempts = (cursorState.get(e.entry.slug) || { attempts: 0 }).attempts;
  const isFinal = !distill || distilledN > 0 || (priorAttempts + 1) >= MAX_DISTILL_ATTEMPTS;
  if (isFinal) {
    fs.appendFileSync(streamPath, ...);   // rows ONLY when final
    ...
  }
  fs.appendFileSync(cursorPath, ...);      // cursor line ALWAYS (n:0 when non-final)
}
```

So a non-final raw-fallback: cursor line written (counts toward `seen`), no stream rows. Now the critical question — can a non-final raw-fallback exist at swap time on the SAME run that achieves full coverage?

For a slug to be non-final raw-fallback, `buildPairsForEntry` must return rows (emitted.length > 0) but with `distilledN === 0` and `priorAttempts+1 < cap`. This happens when the PDF has usable text but Ollama failed to distill. In that case `emitted` is the raw pairs (which exist). So **the entry DOES have raw rows available**, but they're deliberately withheld from the stream (`isFinal` false) to retry distillation later. The cursor line still counts toward coverage.

Let me confirm this is the same behavior as the sibling (pre-existing, not introduced by this commit) to determine if it's a new regression or inherited design.

### Assistant | 2026-06-25T05:18:09.562Z

[tool_use: Bash]

### User | 2026-06-25T05:18:14.187Z

[tool_result] === Parent version of the swap/coverage block (pre-commit) ===
      const isFinal = !distill || distilledN > 0 || (priorAttempts + 1) >= MAX_DISTILL_ATTEMPTS;
      if (isFinal) {
        fs.appendFileSync(outPath, emitted.map((p) => JSON.stringify(p)).join("\n") + "\n");
        for (const p of emitted) { pairs.push(p); perDomain[p.domain] = (perDomain[p.domain] || 0) + 1; }
      }
      fs.app
... [+2279 chars truncated]

### Assistant | 2026-06-25T05:18:27.775Z

This is the crucial comparison. In the **pre-commit** version, rows were appended directly to `outPath` as the run progressed (data-first streaming). The end block was purely a status report — no swap/truncate. So in the old design, raw-fallback entries that weren't yet final simply hadn't contributed rows yet, but the rows ALREADY committed (from prior runs/final entries) stayed in `outPath`.

In the **new** design, the swap REPLACES the entire live `outPath` with the stream content at full coverage. Now I need to determine the practical reachability of the "swap fires while a raw-fallback is still retryable" scenario. Let me reason precisely:

The swap fires when `seen >= total` (every entry has a cursor line). An entry gets a cursor line when it is *processed* in the loop. A raw-fallback-under-cap entry processed THIS run gets a non-final cursor line (counts toward `seen`) but writes no rows. For full coverage to be reached on the run where such an entry is processed, ALL other entries must also already be cursored. This is entirely reachable: e.g. a corpus where on the final run, the last entry processed is a raw-fallback (Ollama contended). Coverage hits 100%, swap fires, and that entry's grounding is absent from the swapped dataset — **but it was absent because distillation is deferred, and re-running will retry it.**

The key question for regression: **does the swapped dataset ever have FEWER total rows than the prior live dataset for already-completed entries?** Let me trace whether stream accumulates across runs.

### Assistant | 2026-06-25T05:18:37.222Z

[tool_use: Bash]

### User | 2026-06-25T05:18:41.699Z

[tool_result] CRITICAL TRACE: re-run after complete swap, one retryable entry now distills:
 run-N: full swap done. live outPath = full set (say 4 rows). .inprogress GONE. cursor FULL.
 run-N+1: cursorState.size>0 -> NO truncate, .inprogress NOT pre-created.
   todo = [b] (was raw-fallback, attempts<cap). b distills now -> isFinal -> appendFileSync(.inprogress, b-rows)
   => .inprogress now EXISTS with ONLY b's
... [+208 chars truncated]

### Assistant | 2026-06-25T05:18:51.386Z

I've identified a potential P0 regression. Let me verify this is actually reachable by checking the exact precondition: can a raw-fallback entry exist at full-coverage AND survive to a subsequent run that re-processes only it?

The chain requires:
1. Run N completes with full coverage (all entries cursored), swap fires → live = full set, `.inprogress` gone.
2. At least one entry `b` was a raw-fallback with `attempts < MAX_DISTILL_ATTEMPTS` and NOT distilled (so `partitionForDistill` still returns it as `todo`).
3. Run N+1: `cursorState.size > 0` → no truncate. `streamPath` (`.inprogress`) does NOT exist yet (was renamed away). `todo = [b]`.
4. `b` is processed. If it produces `emitted` (raw rows exist) and now distills OR hits cap → `isFinal=true` → `fs.appendFileSync(streamPath, ...)` **creates a fresh `.inprogress` with only b's rows**.
5. End block: `seen` = full coverage (b still has its run-N cursor line; plus the new one). `shouldSwap` true. `streamPath` exists (just created). → `fs.renameSync` replaces the full live dataset with **b-only**.

This is a genuine data-loss regression. But wait — for swap to fire in run N (step 1), can a non-distilled-under-cap raw-fallback have been part of "full coverage"? Yes, as proven in Scenario D. Let me confirm the precondition that swap actually fired in run N while `b` was retryable. Let me re-verify by actually executing the script end-to-end with injected conditions rather than reasoning alone.

### Assistant | 2026-06-25T05:19:10.414Z

[tool_use: Bash]

### User | 2026-06-25T05:19:15.832Z

[tool_result] PRIOR live rows: 4
RUN N coverage: 2 / 2 shouldSwap: true
  RUN N SWAPPED. live rows now: 1 (was 4 -> now a-only=1; ALREADY a regression because b deferred)
  .inprogress exists after swap? false
RUN N+1 cursorState.size: 2 (>0 -> no truncate, .inprogress NOT recreated)
  todo: [ 'b' ]
RUN N+1 coverage: 2 / 2 shouldSwap: true | .inprogress exists: true
  .inprogress rows: 1
  RUN N+1 SWAPPED -> li
... [+37 chars truncated]

### Assistant | 2026-06-25T05:19:24.702Z

I've now reproduced the regression with the real file-state machine. This is a confirmed P0. Let me note two distinct findings emerged:

**Finding 1 (the more severe, multi-run):** After a complete swap, a re-run that processes only retryable raw-fallback entries creates a fresh `.inprogress` containing ONLY those entries' rows, and since coverage is still "full" (their cursor lines persist), it swaps that narrow stream over the full live dataset — destroying all previously-swapped rows.

**Finding 2 (single-run):** Even within a single run, the swap fires at full coverage while raw-fallback entries are still retryable and contributed zero rows — so the swapped dataset omits the still-deferred entries' grounding. This is less severe (those entries genuinely have no final rows yet), but combined with the truncate-on-fresh behavior it means the "atomic" swap can publish an incomplete set as "COMPLETE".

Let me confirm the multi-run scenario isn't prevented by some guard I missed — specifically, is there any condition under which the cursor would be re-zeroed or the stream re-truncated to include `a`'s prior rows on run N+1? Let me re-examine line 221-226 carefully.

### Assistant | 2026-06-25T05:19:25.762Z

[tool_use: Read]

### User | 2026-06-25T05:19:27.696Z

[tool_result] 210	  // Reap-resumable streaming (same contract as domain-corpus): --distill is a long Ollama run the
211	  // harness backgrounds + the reaper can kill mid-flight -> stream each entry's pairs + a cursor line
212	  // so a killed run resumes with re-distill=0. The non-streaming raw path stays single-write.
213	  const resume = write && (distill || arg("resume", false) !== false);
214	  const curs
... [+2105 chars truncated]

### Assistant | 2026-06-25T05:19:39.447Z

Confirmed. On run N+1, `cursorState.size > 0` (the full cursor from run N persists), so the truncate block (line 225) is skipped — `streamPath` is NOT reset and, critically, the prior run's `a` rows are NOT re-streamed. The previously-distilled entries are NOT in `todo` (they're `done` per `partitionForDistill`), so they never re-append. The new `.inprogress` created on run N+1 contains ONLY the newly-finalized retryable entries' rows. The swap then renames that partial stream over the full live dataset.

This is exactly the multi-turn count-regression the commit set out to PREVENT, re-introduced through a different path. Let me now verify there is genuinely no `MAX_DISTILL_ATTEMPTS`-cap escape that prevents reaching this. With the default `MAX_DISTILL_ATTEMPTS=3`, a raw-fallback entry stays retryable for up to 3 runs. As long as Ollama is contended on the run that hits full coverage (very plausible — the whole reason for retry-resume exists), the scenario triggers.

Let me also verify the single-run severity precisely and check whether the COMPLETE message would mislead. Let me also double-check point 3 (raw path) and point 4 (clobber-guard) which I want to confirm are correct.

### Assistant | 2026-06-25T05:19:48.886Z

[tool_use: Bash]

### User | 2026-06-25T05:19:54.375Z

[tool_result] Point 3: raw non-resume -> streamPath===outPath (resume=false); end uses the `else if (write)` single-write. CORRECT.
Point 4: clobber-guard reads live outPath, warns before rename. Warn-only (consistent w/ prior). CORRECT.

### Assistant | 2026-06-25T05:19:58.827Z

Let me clean up any leftover temp files and do a final check that I haven't left orphans, then verify the LIVE-PROOF claim in the commit message (cad run 12/12) doesn't contradict my finding — the commit's live proof used a corpus where everything distilled in one pass, which wouldn't trigger the multi-run path.

### Assistant | 2026-06-25T05:20:00.514Z

[tool_use: Bash]

### User | 2026-06-25T05:20:04.407Z

[tool_result] -rw-r--r-- 1 wompu 197611 2112 Jun 25 00:17 /tmp/edge-test.mjs
cleanup done
 M scripts/embed-pdf-tribal-tips-into-index.mjs
 M scripts/embed-pdf-tribal-tips-into-index.test.mjs
 M scripts/lib/advisory-decay.mjs
 M scripts/lib/advisory-decay.test.mjs
?? scripts/.gitignore
?? scripts/PLAN_deep_accuracy_v2.md
?? scripts/README.md
?? scripts/SESSION_START_TEMPLATES.md
?? scripts/TOOLKIT_ROADMAP.md
?? 
... [+55 chars truncated]

### Assistant | 2026-06-25T05:20:19.128Z

Cleanup confirmed (the unrelated `M`/`??` entries are pre-existing session state, not from my read-only review). The two committed files for 65628c77bf are unmodified by me.

Let me do a final confirmation of the single-run severity and whether the `.inprogress` is gitignored (affecting whether a stranded partial is visible), to scope finding severity accurately.

### Assistant | 2026-06-25T05:20:22.451Z

[tool_use: Bash]

### User | 2026-06-25T05:20:26.423Z

[tool_result] === is the lora dir / .inprogress gitignored? ===
.gitignore:20:*.jsonl	state/shared/lora/tribal-knowledge-dataset.jsonl
exit: 0
=== current live dataset state ===
-rw-r--r-- 1 wompu 197611 1234669 Jun 24 23:46 state/shared/lora/tribal-knowledge-dataset.jsonl

### Assistant | 2026-06-25T05:20:52.271Z

The live dataset (`*.jsonl`) is gitignored — so a regression is NOT caught by git and feeds directly into the fleet training corpus via `assemble-fleet-lora-corpus.mjs`. This makes the data-loss silent and consequential (it corrupts LoRA training input), raising the stakes of Finding 1.

I have completed my rigorous review. Here is my verdict.

---

VERDICT: FAIL

summary: The atomic distill-to-temp refactor is mostly sound — the swap gate `shouldSwap(seen,total)` correctly uses coverage instead of the broken `pending===0` gate, no-text entries correctly count toward coverage (they write a cursor line), the raw non-resume path is unchanged, and the clobber-guard is correctly relocated to swap time. All 21 tests pass with real assertions (no `.skip`/`.only`/stubs). However, the swap's coverage gate interacts with the deferred-raw-fallback design to RE-INTRODUCE the exact multi-turn count-regression this commit set out to eliminate: a re-run after a complete swap that re-processes only retryable raw-fallback entries builds a fresh narrow `.inprogress` and renames it over the full live dataset, destroying all previously-published rows. Because the live dataset is gitignored and feeds the fleet LoRA corpus, this loss is silent.

findings:
- [P0] `scripts/tribal-corpus-to-lora-dataset.mjs:259,262,276,283` -- Multi-run swap regression. A raw-fallback-under-cap entry writes a cursor line (line 262, unconditional) but NO stream rows (line 259 is gated on `isFinal`), so it counts toward `seen`/coverage while `partitionForDistill` still returns it as retryable `todo`. After a COMPLETE swap (`.inprogress` renamed away, cursor full), a re-run finds `cursorState.size>0` (no truncate, line 225) and processes ONLY the still-retryable entry; if it now finalizes, `appendFileSync` (line 259) creates a FRESH `.inprogress` containing ONLY that one entry's rows. `seen` is still full coverage (its prior cursor line persists), so `shouldSwap` is true and `fs.renameSync` (line 283) replace
... [+2745 chars truncated]
