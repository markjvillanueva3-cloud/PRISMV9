---
type: "chat-session"
source: "claude-code-cli"
session_id: "4a47dc50-9f3c-45be-bfa5-4f1e58b72cad"
title: "Third independent review (analyst arm) of git commit 5d9dbbc91c (PRISM repo H:/p"
date: "2026-06-25"
first_ts: "2026-06-25T03:59:22.024Z"
last_ts: "2026-06-25T04:03:57.805Z"
cwd: "H:\\prism"
messages: 67
user_msgs: 23
assistant_msgs: 44
raw_file: "H:/.claude/projects/H--prism/4a47dc50-9f3c-45be-bfa5-4f1e58b72cad/subagents/agent-a8f196968f6e13b2b.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:11"
---

# Third independent review (analyst arm) of git commit 5d9dbbc91c (PRISM repo H:/p

> **claude-code-cli** | 2026-06-25 | 67 msgs (23 user / 44 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/4a47dc50-9f3c-45be-bfa5-4f1e58b72cad/subagents/agent-a8f196968f6e13b2b.jsonl`

## Transcript

### User | 2026-06-25T03:59:22.024Z

Third independent review (analyst arm) of git commit 5d9dbbc91c (PRISM repo H:/prism), weighted toward SILENT BREAKAGE, REGRESSION RISK, I/O safety, error-budget completeness, and integration coupling. Do NOT assume arms A/B caught everything. Run `git -C H:/prism show 5d9dbbc91c`.

Files: scripts/tribal-corpus-to-lora-dataset.mjs (new), its .test.mjs, and the build-fleet-training-corpus-inventory.mjs edit (registers tribal-knowledge-lora).

Hunt specifically for:
1. REGRESSION on the REUSED module: this converter imports from scripts/domain-corpus-to-lora-dataset.mjs (loop-owned, actively used). Does importing it cause any side effect at import time? Does the new code mutate any shared state? (It must be purely additive — a new script + one inventory source.)
2. SILENT DATA CORRUPTION: the streaming/resume cursor writes to state/shared/lora/tribal-knowledge-dataset.jsonl + a .cursor.jsonl. Could a kill mid-write tear a row? Could the cursor (keyed by slug) conflate two entries? Is the fresh-run truncate vs resume-append logic correct (no stale-row duplication, the class of bug the domain-corpus converter's resume was built to avoid)?
3. I/O safety: all fs reads wrapped (graceful on missing/unreadable)? Windows path handling (backslash source normalization)? pdftotext failures handled (the converter must skip, not crash)?
4. ERROR BUDGET: what happens on an empty corpus, a corpus with all-overlapped slugs, a missing domain-knowledge-dataset.jsonl (overlap keys empty)? 
5. INTEGRATION: does folding 398 advisory rows (w=0.5) into the fleet corpus risk diluting/skewing the training mix? Is advisory:true correct?

Grade PASS or FAIL with P0/P1/P2 findings + file:line citations. Read-only.

### Assistant | 2026-06-25T03:59:26.692Z

I'll start by examining the commit and the files involved.

### Assistant | 2026-06-25T03:59:27.544Z

[tool_use: Bash]

### User | 2026-06-25T03:59:31.694Z

[tool_result] commit 5d9dbbc91c5493ed6ae37e44b7c038153ee429f3
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Wed Jun 24 22:56:53 2026 -0500

    [MAIN-FORCE] [DOMAIN-KNOWLEDGE]/U-PAPA-TRIBAL-CORPUS-LORA (slot:papa): feed per-domain *-tribal-corpus.jsonl source PDFs into LoRA
    
    The *-tribal-corpus.jsonl tips are POINTERS ('read the source PDF') -- so all ~1310
    per-domain tribal en
... [+1167 chars truncated]

### Assistant | 2026-06-25T03:59:34.360Z

Let me read the new files in full and the imported module.

### Assistant | 2026-06-25T03:59:35.316Z

[tool_use: Read]

### Assistant | 2026-06-25T03:59:35.370Z

[tool_use: Read]

### User | 2026-06-25T03:59:37.758Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * tribal-corpus-to-lora-dataset.mjs  (slot:papa 2026-06-25)
4	 *
5	 * SIBLING of domain-corpus-to-lora-dataset.mjs. The per-domain `state/shared/*-tribal-corpus.jsonl`
6	 * files (cam 809, tooling 313, mill 71, post-processor 63, lathe 18, cad 12, speed-feed 8,
7	 * database-expansion 7, blueprint-vision 7, wedm 2 -- ~1310 entries) are POINTER tips: every
8	 * `tip` 
... [+14078 chars truncated]

### User | 2026-06-25T03:59:37.844Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * Tests for tribal-corpus-to-lora-dataset.mjs (slot:papa 2026-06-25).
4	 *
5	 * R9 intent under test (each test fails if the business rule breaks):
6	 *  - the POINTER tip is NEVER the LoRA output -- the output comes from the source PDF text, so a
7	 *    "read X.md" tribal tip can never poison a training row (the whole reason this converter exists);
8	 *  - the over
... [+10927 chars truncated]

### Assistant | 2026-06-25T03:59:41.765Z

Now let me read the imported module to understand the reused primitives and verify the contracts (the most important risk: silent breakage from a reused-module contract mismatch).

### Assistant | 2026-06-25T03:59:41.902Z

[tool_use: Read]

### User | 2026-06-25T03:59:43.154Z

[tool_result] read-once-guard: 'H:\prism\scripts\domain-corpus-to-lora-dataset.mjs' was already read 12m ago in this session and is unchanged (mtime 1782357815456). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-25T03:59:45.882Z

The guard says it's already in context, but I want the actual content. Let me grep for the specific exported symbols and their signatures since this is the load-bearing contract.

### Assistant | 2026-06-25T03:59:48.153Z

[tool_use: Grep]

### User | 2026-06-25T03:59:49.702Z

[tool_result] 41:export const ROOT = path.resolve(__dirname, "..");
42:export const SCHEMA_VERSION = "1.0.0";
44:export const SOURCE_TAG = "domain-corpus-to-lora-dataset.mjs";
45:export const MIN_TEXT_CHARS = 200;   // below this the extraction is garbage/empty -> skip (GIGO)
53:export const MAX_DISTILL_ATTEMPTS = Number(process.env.PRISM_DISTILL_MAX_ATTEMPTS) > 0
85:export function parseCursorState(cursorText)
... [+418 chars truncated]

### Assistant | 2026-06-25T03:59:53.029Z

Let me read the key functions in the imported module to verify the contracts the new code depends on: `pdfToText`, `buildPairsForEntry`, `toAlpacaPairs`, `parseCursorState`, `partitionForDistill`, `partitionByResumeCursor`.

### Assistant | 2026-06-25T03:59:53.943Z

[tool_use: Read]

### User | 2026-06-25T03:59:55.204Z

[tool_result] 85	export function parseCursorState(cursorText) {
86	  const state = new Map();
87	  if (typeof cursorText !== "string") return state;
88	  for (const line of cursorText.split("\n")) {
89	    const s = line.trim();
90	    if (!s) continue;
91	    let o; try { o = JSON.parse(s); } catch { continue; } // torn last line -> skip (slug re-processes; safe)
92	    if (!o || typeof o.slug !== "string" || 
... [+17395 chars truncated]

### Assistant | 2026-06-25T04:00:00.554Z

Now I understand the imported module's full contract. Let me verify a few critical things. First, the import-time side-effect question (Risk #1): the imported module's top-level — does importing it trigger `main()`? The `isMain` guard at line 367-368 of the domain module uses `process.argv[1]` realpath comparison, so importing it from the tribal script won't fire `main()`. Good. But let me check the top of the domain module for any other top-level side effects (file reads/writes at module load).

### Assistant | 2026-06-25T04:00:01.165Z

[tool_use: Read]

### User | 2026-06-25T04:00:02.308Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * domain-corpus-to-lora-dataset.mjs  (slot:papa 2026-06-24)
4	 *
5	 * THE MISSING PLUMBING: turn the rescued per-domain knowledge (the resource-pdf specs
6	 * that reclassify-domain-feeders-ollama.mjs lifted out of the keyword-unclassified
7	 * residual) into ACTUAL LoRA training data.
8	 *
9	 * getDomainCorpus + the per-domain tribal corpora are a POINTER/orchestrat
... [+4777 chars truncated]

### Assistant | 2026-06-25T04:00:09.393Z

Confirmed: the imported module has no top-level file I/O at import time (lines 1-58 are pure const/regex definitions; `main()` is guarded by `isMain`). Import is side-effect-free. Risk #1 (import-time side effect / shared-state mutation) is clean — both modules export pure functions, and the new module defines its own `SOURCE_TAG`/`DEFAULT_OUT` rather than mutating the imported ones.

Now let me verify the `advisory:true` and `weight` propagation. Notice: `toAlpacaPairs` (the imported function) sets `advisory: true` and `weight: ADVISORY_WEIGHT` (0.5) directly on the pairs. The test at line 164 asserts `p.advisory === true`. So Risk #5 (advisory correctness) — the new code inherits advisory:true from the reused `toAlpacaPairs`. Good.

Now the inventory registration edit. Let me read the build-fleet-training-corpus-inventory.mjs change and the assemble step to verify integration.

### Assistant | 2026-06-25T04:00:10.590Z

[tool_use: Bash]

### User | 2026-06-25T04:00:15.359Z

[tool_result] commit 5d9dbbc91c5493ed6ae37e44b7c038153ee429f3
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Wed Jun 24 22:56:53 2026 -0500

    [MAIN-FORCE] [DOMAIN-KNOWLEDGE]/U-PAPA-TRIBAL-CORPUS-LORA (slot:papa): feed per-domain *-tribal-corpus.jsonl source PDFs into LoRA
    
    The *-tribal-corpus.jsonl tips are POINTERS ('read the source PDF') -- so all ~1310
    per-domain tribal en
... [+2749 chars truncated]

### Assistant | 2026-06-25T04:00:19.007Z

Now I need to verify how `assemble-fleet-lora-corpus.mjs` consumes these sources — specifically: does it require the file to EXIST? If the registered `tribal-knowledge-dataset.jsonl` does not exist yet (e.g., on a fresh checkout, or before `--out` is run), does assemble crash or skip gracefully? And does it dedupe by `instruction+output`? Let me examine the assemble step.

### Assistant | 2026-06-25T04:00:19.366Z

[tool_use: Read]

### User | 2026-06-25T04:00:20.629Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * assemble-fleet-lora-corpus.mjs -- the MANIFEST CONSUMER (U-LORA-CORPUS-ASSEMBLE,
4	 * slot:india 2026-06-10).
5	 *
6	 * THE DORMANCY THIS CLOSES: the vault -> LoRA chain dead-ended at the manifest.
7	 * scripts/vault-to-lora-dataset.mjs PRODUCES Alpaca-triple datasets and
8	 * build-fleet-training-corpus-inventory.mjs REGISTERS them as
9	 * kind:'lora-training-json
... [+17438 chars truncated]

### Assistant | 2026-06-25T04:00:26.533Z

Key integration finding: `selectLoraSources` (line 105) filters on `s.status === "present"`. So a registered source whose file doesn't exist yet won't be assembled (the inventory builder must stamp `status`). This means the registration is safe even if the dataset file isn't written yet — assemble skips it. Let me verify the inventory builder stamps `status: "present"` based on file existence, so the new source's status behaves correctly.

### Assistant | 2026-06-25T04:00:27.479Z

[tool_use: Bash]

### User | 2026-06-25T04:00:33.363Z

[tool_result] 28:// Per-machine LoRA datasets produced by scripts/build-machine-lora-datasets.mjs. status
294:  if (!fs.existsSync(p)) return null;
325:  if (!fs.existsSync(d)) return null;
342:  const result = { ...src, status: 'unknown' };
346:    const p = src.path && fs.existsSync(src.path) ? src.path : src.fallbackPath;
348:    result.resolvedPath = p;
351:      result.status = 'present';
355:      result.
... [+359 chars truncated]

### Assistant | 2026-06-25T04:00:36.537Z

Let me read the status-stamping block (lines 340-370) to confirm a `lora-training-jsonl` source is stamped present/missing by file existence, and what happens to a `missing` one.

### Assistant | 2026-06-25T04:00:37.476Z

[tool_use: Read]

### User | 2026-06-25T04:00:39.570Z

[tool_result] 338	  return n;
339	}
340	
341	function inspectSource(src) {
342	  const result = { ...src, status: 'unknown' };
343	  delete result.fallbackPath;
344	  delete result.pattern;
345	  if (src.path || src.fallbackPath) {
346	    const p = src.path && fs.existsSync(src.path) ? src.path : src.fallbackPath;
347	    const stat = p ? statPath(p) : null;
348	    result.resolvedPath = p;
349	    result.file
... [+1447 chars truncated]

### Assistant | 2026-06-25T04:00:49.355Z

Integration confirmed clean: the new source has a `path` (line of the diff), so `inspectSource` stamps `present` if the file exists, else `missing`. `assembleCorpus` only reads `present` sources. So registering the source before the dataset file exists is safe — assemble simply skips it until `--out` produces the file and the inventory is re-run. No crash, no clobber.

Now let me focus on the critical resume/cursor correctness (Risk #2). I'll trace the streaming logic carefully against the domain-corpus reference it's mirroring. There's one notable structural difference in the new module I need to verify. Let me re-examine the `todo` partitioning at lines 159-163 and the slug-find mapping for a possible silent drop.

The new module groups by **slug** but a slug can span multiple corpus files (cad + cam both contain the same slug). The cursor is keyed by slug. Let me verify there's no possibility of two *different* signals under the same slug colliding, and that the `entries.find(e => e.entry.slug === t.slug)` lookup is correct.

Let me also check: are there other consumers of the domain-corpus module that the new import could perturb, and is the `tribal-knowledge-dataset.jsonl` gitignored (so the registered path won't be a missing-file failure on fresh checkout)?

### Assistant | 2026-06-25T04:00:51.517Z

[tool_use: Bash]

### User | 2026-06-25T04:00:57.316Z

[tool_result] 270:state/shared/lora/bridge-reasoning/
271:state/shared/lora/adapters/
286:state/shared/lora/*.meta.json
---check existing lora dir gitignore---
270:state/shared/lora/bridge-reasoning/
271:state/shared/lora/adapters/
272:.venv-lora/
286:state/shared/lora/*.meta.json
---does the dataset file exist---
-rw-r--r-- 1 wompu 197611 1234669 Jun 24 22:55 state/shared/lora/tribal-knowledge-dataset.jsonl

### Assistant | 2026-06-25T04:01:01.341Z

The dataset file exists (1.2MB, committed-time) and is NOT gitignored (only specific subdirs/patterns are). Let me check whether this 1.2MB dataset got committed in this commit or is left untracked/uncommitted — that matters for whether a fresh checkout has it.

### Assistant | 2026-06-25T04:01:03.801Z

[tool_use: Bash]

### User | 2026-06-25T04:01:08.875Z

[tool_result] no commit touches it
---is it tracked?---
error: pathspec 'state/shared/lora/tribal-knowledge-dataset.jsonl' did not match any file(s) known to git
---status---
---is dir-level gitignored via parent rule?---
.gitignore:20:*.jsonl	state/shared/lora/tribal-knowledge-dataset.jsonl

### Assistant | 2026-06-25T04:01:13.611Z

Good — there IS a `.gitignore:20:*.jsonl` global rule that ignores the dataset (and the cursor sidecar). So the dataset is regenerable data, untracked, and a fresh checkout won't have it — the inventory will stamp it `missing` and assemble skips it. That's the correct, safe contract (mirrors how `domain-knowledge-dataset.jsonl` and every other lora-training-jsonl source behaves). No fresh-checkout breakage.

Now let me run the new test suite to confirm it actually passes (the commit claims 16/16).

### Assistant | 2026-06-25T04:01:14.334Z

[tool_use: Bash]

### User | 2026-06-25T04:01:18.856Z

[tool_result]   ...
# Subtest: integration: raw pairs use the PDF body as output, NEVER the pointer tip (anti-GIGO)
ok 14 - integration: raw pairs use the PDF body as output, NEVER the pointer tip (anti-GIGO)
  ---
  duration_ms: 0.3779
  ...
# Subtest: integration: unusable PDF text emits NOTHING (GIGO -- short/garbage extraction)
ok 15 - integration: unusable PDF text emits NOTHING (GIGO -- short/garbage extr
... [+338 chars truncated]

### Assistant | 2026-06-25T04:01:32.946Z

16/16 pass. Now let me hunt the silent-failure edge cases the tests don't cover. I'll focus on the resume/cursor correctness deeply (Risk #2), since that's the most consequential class.

Let me trace a specific scenario carefully. The `todo` computation at lines 159-163:

```js
const todo = !resume ? entries
  : distill ? partitionForDistill(entries.map((e) => e.entry), cursorState).todo
    .map((t) => entries.find((e) => e.entry.slug === t.slug)).filter(Boolean)
  : partitionByResumeCursor(entries.map((e) => e.entry), new Set(cursorState.keys())).todo
    .map((t) => entries.find((e) => e.entry.slug === t.slug)).filter(Boolean);
```

`entries.find((e) => e.entry.slug === t.slug)` — `entries` is the result of `loadTribalEntries`, which dedupes by slug into a Map, so each slug is unique in `entries`. The `find` returns the correct unique entry. No collision. Good.

Now the subtle one: the **multi-domain hold within a single cursor row**. In the domain-corpus reference, `isFinal` for a distilled entry commits ALL its domain pairs at once (lines 333-338 of the reference). The tribal version mirrors this (lines 188-191). Let me verify the partial-distill case: if an entry has 2 domains and distill produces 1 distilled + 1 raw-fallback pair, what's `distilledN`? It's `> 0`, so `isFinal = true`, and BOTH pairs commit — one distilled, one raw. That matches the reference. Consistent.

Let me now check one I/O concern the tests don't cover: the **fresh-run truncate guard interplay with `--out <custompath>`**. Let me check a subtle resume re-entry corner: what if `--out` is passed a path but `--distill` is NOT and `--resume` is NOT — does `resume` stay false (single-write, truncate via line 210)?

### Assistant | 2026-06-25T04:01:37.566Z

[tool_use: Bash]

### User | 2026-06-25T04:01:38.323Z

[tool_result] 🛑 BLOCKED: rm -rf on absolute root path
  Command: rm -rf /tmp/ttt && mkdir -p /tmp/ttt && cat > /tmp/ttt/run.mjs <<'EOF'
// simulate the arg() + resume gating logic from tribal-corpus-to-lora-dataset.mjs main()
function makeArg(argv){ return function arg(name, dflt){ const i = argv.indexOf("--"+name); if(i<0) return dflt; const v = argv[i+1]; return v && !v.startsWith("--") ? v : true; }; }
funct
... [+735 chars truncated]

### Assistant | 2026-06-25T04:01:41.698Z

The sandbox blocked the `rm -rf`. Let me use a temp dir under the repo's tmp area without rm.

### Assistant | 2026-06-25T04:01:45.983Z

[tool_use: Bash]

### User | 2026-06-25T04:01:52.041Z

[tool_result] --out only: {"write":true,"distill":false,"resume":false,"outPath":"DEFAULT_OUT"}
--out path: {"write":true,"distill":false,"resume":false,"outPath":"/x/y.jsonl"}
--distill --out: {"write":true,"distill":true,"resume":true,"outPath":"DEFAULT_OUT"}
--out --resume: {"write":true,"distill":false,"resume":true,"outPath":"DEFAULT_OUT"}
(no out) --distill: {"write":false,"distill":true,"resume":false,"o
... [+104 chars truncated]

### Assistant | 2026-06-25T04:02:13.146Z

Gating logic verified. `--out` (raw) → resume=false → single-write truncate path (line 208-211). `--distill --out` and `--out --resume` → resume=true → streaming/cursor path. This matches the documented contract and the reference module.

Now the most important silent-failure hunt for Risk #2: the **raw `--out --resume` re-entry stale-row duplication**. In raw resume mode (`distill=false`, `resume=true`), `partitionByResumeCursor` skips slugs already in the cursor. A processed slug commits its rows AND appends a cursor line. On re-entry, that slug is skipped. But consider: a raw resume run that's killed AFTER `appendFileSync(outPath,...)` (line 189) but BEFORE `appendFileSync(cursorPath,...)` (line 192) — the rows are written but the cursor isn't. On resume, the slug isn't in the cursor → reprocessed → its rows appended AGAIN → **duplicate rows in the dataset**.

The reference module documents this exact at-least-once window (lines 334-336): "a kill in the 1-syscall window re-processes the slug (assemble-fleet-lora-corpus de-dupes raw by instruction+output) rather than dropping it." So the duplicate is absorbed by `assembleCorpus`'s dedup on `(instruction, output)` (rowKey, line 156-158). 

Let me verify the tribal rows actually dedup correctly there: two re-processed raw pairs for the same (slug, domain) produce identical `instruction` + `output` (synthInstruction is deterministic given domain/title/kind; output is the cleaned PDF text — deterministic). So they collide on rowKey → deduped. Good — the at-least-once window is safe **for raw**. 

Now the distill case: a re-processed distilled pair would have a DIFFERENT instruction/output (Ollama is non-deterministic) → would NOT dedup → duplicate row survives. But in distill mode, `isFinal` rows commit and the cursor records `distilled`. The kill window is the same 1-syscall gap. If killed between row-append and cursor-append for a distilled entry, resume via `partitionForDistill` checks `cursorState` — the slug has 
... [+1295 chars truncated]

### Assistant | 2026-06-25T04:02:14.466Z

[tool_use: Bash]

### User | 2026-06-25T04:02:20.247Z

[tool_result] tribal corpora: (none) | entries: 0 | overlap-skipped vs domain-knowledge: keys=102 | pages/pdf: 6 | limit: all
processed 0 PDFs | committed -> 0 pairs | specs: distilled 0, raw-fallback 0, no-text 0
dry-run (no write). Re-run with --out (raw) or --distill --out (Q&A) to emit the jsonl.
=== EXIT: 0 ===

### Assistant | 2026-06-25T04:02:23.903Z

Empty corpus → graceful exit 0, 0 pairs, no crash. Now let me test the empty-write path (all overlapped or empty entries with `--out`) to verify it doesn't write a degenerate file or clobber. I'll write to a temp path so I don't touch the real dataset.

### Assistant | 2026-06-25T04:02:26.653Z

[tool_use: Bash]

### User | 2026-06-25T04:02:31.407Z

[tool_result] tribal corpora: (none) | entries: 0 | overlap-skipped vs domain-knowledge: keys=102 | pages/pdf: 6 | limit: all
processed 0 PDFs | committed -> 0 pairs | specs: distilled 0, raw-fallback 0, no-text 0
wrote 0 pairs -> C:\Users\wompu\AppData\Local\Temp\tribal-empty-test.jsonl
=== EXIT: 0 ===
--- file content (should be empty, no trailing newline) ---
len=0 content=""

### Assistant | 2026-06-25T04:02:40.464Z

Empty-write produces a 0-byte file (line 210: `pairs.map(...).join("\n") + (pairs.length ? "\n" : "")` → `"" + ""` = empty). `assembleCorpus` reads it as 0 rows, no invalid. Clean. No degenerate trailing-newline single-empty-line.

Now let me verify the real cad+cam dry-run actually works end-to-end (the commit claims 398 pairs, overlap keys=102 above). Let me dry-run the default (cad,cam) to confirm the live path doesn't crash and produces a sensible count.

### Assistant | 2026-06-25T04:02:41.268Z

[tool_use: Bash]

### User | 2026-06-25T04:02:45.253Z

[tool_result] tribal corpora: cad,cam | entries: 821 | overlap-skipped vs domain-knowledge: keys=102 | pages/pdf: 6 | limit: 8
processed 8 PDFs | committed -> 6 pairs | specs: distilled 0, raw-fallback 6, no-text 2
     6  cad
dry-run (no write). Re-run with --out (raw) or --distill --out (Q&A) to emit the jsonl.
=== EXIT: 0 ===

### Assistant | 2026-06-25T04:02:55.358Z

Live path works: 821 grouped entries from cad+cam, 102 overlap keys loaded, 8 PDFs processed → 6 pairs (2 no-text GIGO-gated). All cad here (cam slugs may sort later). The pipeline is functional end-to-end.

Now let me hunt a subtle integration concern (Risk #5 — training mix dilution). The `assembleCorpus` dedups across ALL sources by `(instruction, output)`. The tribal converter's `synthInstruction` is the SAME function as the domain-corpus converter's (imported, identical). So for the SAME slug+domain+title+kind, the raw instruction would be IDENTICAL between the two datasets. The overlap-guard prevents the SAME (slug,domain) from being emitted by both. But — could a DIFFERENT slug in the tribal set collide with a domain-corpus row on identical instruction+output? Only if both have identical title+domain+kind AND identical PDF text. That's the legitimate "same source PDF" case, which dedup correctly collapses. Not a skew risk; if anything dedup protects the mix. 

Let me verify one more thing on the dilution question: the 398 advisory rows (w=0.5) fold into a 6513-row corpus. Both domain-knowledge-lora and tribal-knowledge-lora are advisory:true. Let me check the actual composition impact by examining whether assemble already shows the new source folding without dominating. Let me run assemble in dry-run JSON.

### Assistant | 2026-06-25T04:02:58.424Z

[tool_use: Bash]

### User | 2026-06-25T04:03:02.639Z

[tool_result] totalRows: 6513 | verified: 343 | advisory: 6170 | dup-dropped: 23 | invalid: 0
tribal-knowledge-lora source: {"rows":398,"added":398,"duplicates":0,"invalid":0,"weight":0.5,"advisory":true}

### Assistant | 2026-06-25T04:03:10.765Z

The commit's claims are verified live: tribal-knowledge-lora folds 398 rows (w=0.5, advisory:true, 0 dup, 0 invalid). Total 6513 rows. The advisory weighting is correctly carried (`weight:0.5`), so a downstream trainer can down-weight these heuristic rows — no silent skew, the trust signal is preserved per row.

One note on the integration: the corpus is now 6170 advisory / 343 verified. That's a heavily advisory-dominated mix, but that's a pre-existing property (domain-knowledge-lora + machine-lathe + galaxy-synthesis are all advisory) — this commit adds 398 to an already-advisory-heavy corpus, and every row carries its `weight`/`advisory` flag for the trainer to handle. Not a regression introduced by this commit; the `--cap-per-galaxy` knob and per-row weighting are the existing mitigations.

Now let me verify there are no OTHER consumers of the domain-corpus module that this commit's new import could perturb (it shouldn't, since import is side-effect-free, but let me confirm the import graph).

### Assistant | 2026-06-25T04:03:11.854Z

[tool_use: Grep]

### User | 2026-06-25T04:03:14.034Z

[tool_result] scripts\domain-corpus-to-lora-dataset.test.mjs:10:} from "./domain-corpus-to-lora-dataset.mjs";
scripts\tribal-corpus-to-lora-dataset.test.mjs:18:import { buildPairsForEntry } from "./domain-corpus-to-lora-dataset.mjs";
scripts\tribal-corpus-to-lora-dataset.mjs:45:} from "./domain-corpus-to-lora-dataset.mjs";

### Assistant | 2026-06-25T04:03:21.404Z

Only the converter's own test, the new tribal converter, and the new tribal test import the domain-corpus module. The new tribal converter is purely additive — no existing consumer touches it. Importing the domain module is side-effect-free (verified: lines 1-58 of that module are const-only; `main()` is `isMain`-guarded). So the reused, loop-owned `domain-corpus-to-lora-dataset.mjs` is in no way mutated or perturbed. Risk #1 fully clean.

Let me do a final verification on one corner I want to be certain about: the `--out --resume` raw re-entry actually skips a previously-cursored slug and doesn't double-write. And confirm the run-as-main `isMain` guard won't false-fire on import. Let me also confirm the domain-corpus reference test still passes (no regression from the new sibling sharing the module).

### Assistant | 2026-06-25T04:03:22.114Z

[tool_use: Bash]

### User | 2026-06-25T04:03:26.170Z

[tool_result] # pass 31
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 17.4195

### Assistant | 2026-06-25T04:03:57.805Z

Reference module's 31 tests still pass — no regression to the loop-owned module. Let me do one final targeted check on the resume cursor's `partitionForDistill` interplay with the tribal grouping: I want to confirm `entries.map((e)=>e.entry)` passes objects with `.slug` (since `partitionForDistill` keys on `e.slug`). Looking at `loadTribalEntries` line 125: each entry is `{ entry: { slug, domains }, signal }`. So `entries.map(e=>e.entry)` yields `{slug, domains}` — `partitionForDistill` reads `e.slug`. Correct. And the `entries.find(e=>e.entry.slug===t.slug)` reverse-maps back to the full `{entry,signal}`. The grouping/cursor contract is internally consistent.

I have thoroughly traced all five risk areas plus the blast radius. Let me compile the verdict.

## VERDICT: PASS

**summary:** This commit is strictly additive: a new `tribal-corpus-to-lora-dataset.mjs` that reuses (never mutates) the loop-owned `domain-corpus-to-lora-dataset.mjs` primitives via side-effect-free imports, plus one inventory source registration. I traced the import graph, the streaming/cursor resume contract, the overlap-guard, the at-least-once kill window, the assemble-step integration, gitignore/fresh-checkout behavior, and the empty/all-overlapped/missing-PDF error paths — all hold. Live-verified: 16/16 new tests pass, the reference module's 31 tests still pass, and assemble folds exactly 398 advisory rows (w=0.5, 0 dup, 0 invalid) into the 6513-row corpus as the commit claims.

**findings:**

- **[PASS — Risk #1, import-time side effect]** `scripts/tribal-corpus-to-lora-dataset.mjs:41-45` imports only `const`/regex/pure-function exports from the domain module; that module's `main()` is `isMain`-guarded (`domain-corpus-to-lora-dataset.mjs:367-368`) and its top-level (lines 1-58) does zero file I/O. The new module defines its OWN `SOURCE_TAG`/`DEFAULT_OUT`/`DEFAULT_DOMAINS` (`tribal-corpus-to-lora-dataset.mjs:48-53`) rather than mutating shared state. `retagTribal` spreads into new objects 
... [+3268 chars truncated]
