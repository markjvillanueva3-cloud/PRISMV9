---
type: "chat-session"
source: "claude-code-cli"
session_id: "a803c8fa-8407-40f0-81d9-0a56f2031bb5"
title: "Independent review (PRISM scrutiny arm) of a new LoRA corpus producer (slot:indi"
date: "2026-06-18"
first_ts: "2026-06-18T17:54:15.303Z"
last_ts: "2026-06-18T17:56:53.561Z"
cwd: "H:\\prism-slot-india"
messages: 49
user_msgs: 18
assistant_msgs: 31
raw_file: "H:/.claude/projects/H--prism-slot-india/a803c8fa-8407-40f0-81d9-0a56f2031bb5/subagents/agent-a9085f0364b565960.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:57"
---

# Independent review (PRISM scrutiny arm) of a new LoRA corpus producer (slot:indi

> **claude-code-cli** | 2026-06-18 | 49 msgs (18 user / 31 assistant) | cwd: H:\prism-slot-india
> Raw: `H:/.claude/projects/H--prism-slot-india/a803c8fa-8407-40f0-81d9-0a56f2031bb5/subagents/agent-a9085f0364b565960.jsonl`

## Transcript

### User | 2026-06-18T17:54:15.303Z

Independent review (PRISM scrutiny arm) of a new LoRA corpus producer (slot:india, unit U-LORA-MACHINE-CORPUS-PRODUCER, committed 4756e77c8b + 16bc1440f8). Read END TO END:

1. H:/prism/scripts/build-machine-lora-datasets.mjs  (NEW producer)
2. H:/prism/scripts/build-machine-lora-datasets.test.mjs  (NEW, 8 node:test cases — all passing)
3. The diff region in H:/prism/scripts/build-fleet-training-corpus-inventory.mjs (search "U-LORA-MACHINE-CORPUS-PRODUCER" — it imports MACHINES + outPathFor from the producer and spreads generated SOURCES entries)

CONTEXT: The producer is the "reach-destination" closure for 8 machine LoRA dataset builders (TS engines compiled to mcp-server/dist). It reads real per-machine RawJobs from state/shared/training/machine-jobs/<type>.jsonl, routes each to its builder's buildDataset(), writes state/shared/lora/machine-<type>-dataset.jsonl, and the inventory registers those outputs. HONESTY CONTRACT: it must NEVER fabricate jobs — a machine with no/empty/all-malformed job file is skipped with 0 rows (synthetic data would poison the GPU fine-tune). The pure core (buildMachineDatasets) takes an injected resolveBuilder + fs so it's testable without dist.

WEIGHTED REVIEW (you are arm C — assume nothing was caught; weight toward silent breakage / data-integrity / I-O):
- DATA INTEGRITY: confirm there is NO path by which a machine with no real jobs produces a non-empty dataset (no fabrication/fallback/synthetic). Confirm malformed JSONL lines are counted, never silently written as rows. Confirm parseJobsJsonl rejects non-object / missing-features-or-actual lines.
- SILENT BREAKAGE: does a builder that throws abort the whole run, or is it isolated per-machine? Does the default distResolver fail LOUD (non-zero exit) when dist is missing, or silently emit nothing? Is the async main()'s rejection handled (no silent unhandled-rejection success)?
- REGISTRATION CORRECTNESS: do the inventory SOURCES paths generated from outPathFor() actually match where 
... [+524 chars truncated]

### Assistant | 2026-06-18T17:54:19.399Z

I'll review this LoRA corpus producer end-to-end, weighted toward silent breakage and data integrity.

### Assistant | 2026-06-18T17:54:19.865Z

[tool_use: Read]

### Assistant | 2026-06-18T17:54:20.120Z

[tool_use: Read]

### User | 2026-06-18T17:54:20.938Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * build-machine-lora-datasets.mjs -- producer: per-machine RawJobs -> Alpaca LoRA datasets
4	 * (U-LORA-MACHINE-CORPUS-PRODUCER, slot:india 2026-06-18).
5	 *
6	 * THE REACH-DESTINATION CLOSURE for the MachineLoRABaseEngine family. The 8
7	 * BaseLoRADatasetBuilder wrappers (milling/5axis/millturn/wedm/sinker/laser/waterjet/
8	 * grinding) are dispatcher-reachable (`*
... [+10865 chars truncated]

### User | 2026-06-18T17:54:21.232Z

[tool_result] 1	/**
2	 * build-machine-lora-datasets.test.mjs -- U-LORA-MACHINE-CORPUS-PRODUCER (slot:india).
3	 *
4	 * Hermetic: the producer's routing/IO core (buildMachineDatasets) takes injected fs +
5	 * resolveBuilder, so we test it WITHOUT dist or the real TS engines. Real-behavior
6	 * asserts (R9): per-machine routing, atomic write content, the no-fabrication 0-row
7	 * skips (no file / empty / all-mal
... [+7600 chars truncated]

### Assistant | 2026-06-18T17:54:23.740Z

Now let me read the inventory diff region and verify the registration path matching.

### Assistant | 2026-06-18T17:54:25.354Z

[tool_use: Grep]

### User | 2026-06-18T17:54:26.833Z

[tool_result] 1-#!/usr/bin/env node
2-// build-fleet-training-corpus-inventory.mjs
3-//
4-// Aggregates every training-relevant corpus gathered across the fleet
5-// (kilo CAD/CAM PDF nodes, lima academy courses, india MIT-OCW extractions,
6-// charlie quoting baseline, foxtrot vendor PDFs, PSN legs, etc.) into one
7-// inventory the training pipeline can iterate over.
8-//
9-// Reference-only — does NOT duplic
... [+1909 chars truncated]

### Assistant | 2026-06-18T17:54:29.459Z

Now let me check how SOURCES paths are consumed by the inventory — specifically whether the path format matters, and verify the consumer `assemble-fleet-lora-corpus.mjs` reads these paths correctly.

### Assistant | 2026-06-18T17:54:32.118Z

[tool_use: Read]

### User | 2026-06-18T17:54:34.826Z

[tool_result] 41	const SOURCES = [
42	  ...MACHINE_LORA_SOURCES,
43	  // Existing PSN 11-leg manifest (referenced, not duplicated).
44	  {
45	    id: 'psn-corpus-manifest',
46	    kind: 'aggregate-manifest',
47	    path: 'H:/prism/state/shared/training/psn-corpus-manifest.json',
48	    description: 'PSN 11-leg training corpus manifest (obsidian/wiki/memories/tribal/system-viz/engines/algorithms/formulas/prism-a
... [+7999 chars truncated]

### Assistant | 2026-06-18T17:54:39.375Z

Now let me verify how the SOURCES paths are statted/consumed, to confirm the path normalization is correct for the consumer. Let me find `statPath` and how the inventory's `path` field is read downstream.

### Assistant | 2026-06-18T17:54:40.901Z

[tool_use: Grep]

### User | 2026-06-18T17:54:41.960Z

[tool_result] 85:  // so statPath() returns null on a fresh checkout (handled like every source).
238:function statPath(p) {
239:  if (!fs.existsSync(p)) return null;
241:    const st = fs.statSync(p);
270:  if (!fs.existsSync(d)) return null;
290:  if (src.path || src.fallbackPath) {
291:    const p = src.path && fs.existsSync(src.path) ? src.path : src.fallbackPath;
292:    const stat = p ? statPath(p) : null
... [+45 chars truncated]

### Assistant | 2026-06-18T17:54:46.995Z

The inventory uses forward-slash paths everywhere (the `OUT` constant is `H:/prism/...` and `statPath` uses `fs.existsSync` which on Windows accepts forward slashes). The producer writes with `path.join` (OS separators = backslash on Windows), and the inventory normalizes with `.replace(/\\/g, '/')` at line 35 — so the registered path is forward-slash, matching the rest of SOURCES. `fs.existsSync` accepts both on Windows. Good, consistent.

Now let me verify the consumer `assemble-fleet-lora-corpus.mjs` reads the SOURCES path the same way, and confirm there's no drift between where the producer writes and where the assembler reads.

### Assistant | 2026-06-18T17:54:49.209Z

[tool_use: Grep]

### User | 2026-06-18T17:54:50.353Z

[tool_result] 9: * kind:'lora-training-jsonl' sources -- but NOTHING read the manifest to actually
13: * every PRESENT lora-training-jsonl source into ONE deduped, weighted, staged
90:export function loadInventory(p = INVENTORY_PATH, readImpl = fs.readFileSync) {
102:/** Select the PRESENT lora-training-jsonl sources from the inventory. */
105:  return sources.filter((s) => s && s.kind === "lora-training-jsonl"
... [+545 chars truncated]

### Assistant | 2026-06-18T17:54:54.223Z

The assembler at line 105 filters `s.kind === "lora-training-jsonl" && s.status === "present"`. The producer's MACHINE_LORA_SOURCES set `kind: 'lora-training-jsonl'` (line 33), and `status` is computed by the inventory's `statPath` (`present` when the file exists). At line 174 the assembler reads `src.resolvedPath || src.path`. Let me confirm how `status` and `resolvedPath` get set in the inventory's source-stat pass, to ensure the machine sources flow through correctly.

### Assistant | 2026-06-18T17:54:54.828Z

[tool_use: Read]

### User | 2026-06-18T17:54:58.116Z

[tool_result] 238	function statPath(p) {
239	  if (!fs.existsSync(p)) return null;
240	  try {
241	    const st = fs.statSync(p);
242	    return { exists: true, sizeBytes: st.isFile() ? st.size : null, mtime: st.mtime.toISOString() };
243	  } catch { return null; }
244	}
245	
246	function countJsonRows(p) {
247	  try {
248	    const j = JSON.parse(fs.readFileSync(p, 'utf8'));
249	    // Heuristics for common sh
... [+2753 chars truncated]

### Assistant | 2026-06-18T17:55:05.179Z

The registration chain is sound: producer writes `machine-<type>-dataset.jsonl` (path.join, OS sep) → inventory registers `path: machineLoraOutPath(m.type).replace(/\\/g,'/')` (forward-slash) → `inspectSource` statSyncs it (Windows accepts forward slash) → sets `status:'present'` + `resolvedPath` → assembler reads `resolvedPath || path` with `kind==='lora-training-jsonl' && status==='present'`. No path drift; single-sourced from MACHINES so id/path can't diverge.

Now let me trace the actual builder contract to verify the one assumption arm C must not take on faith: that the REAL `buildDataset` honors the no-fabrication contract (i.e., a builder fed real jobs won't itself synthesize rows, and that `examples` is where rows live). Let me read the base engine.

### Assistant | 2026-06-18T17:55:05.652Z

[tool_use: Glob]

### Assistant | 2026-06-18T17:55:06.019Z

[tool_use: Glob]

### User | 2026-06-18T17:55:08.384Z

[tool_result] mcp-server\src\engines\MachineLoRABaseEngine.ts

### User | 2026-06-18T17:55:08.413Z

[tool_result] mcp-server\src\engines\WEDMLoRADatasetBuilderEngine.ts

### Assistant | 2026-06-18T17:55:12.363Z

[tool_use: Grep]

### User | 2026-06-18T17:55:13.529Z

[tool_result] 62-  };
63-}
64-
65:export interface DatasetSplitConfig {
66-  trainRatio: number;
67-  valRatio: number;
68-  testRatio: number;
--
72-  stratifyBy?: string;
73-}
74-
75:export interface DatasetBuildResult {
76:  examples: {
77-    train: LoRAExample[];
78-    val: LoRAExample[];
79-    test: LoRAExample[];
80-  };
81:  stats: {
82-    totalJobs: number;
83:    validJobs: number;
84-    geometryH
... [+2043 chars truncated]

### Assistant | 2026-06-18T17:55:18.016Z

Important: the base engine's contract method is `build(jobs, split)` (line 182), not `buildDataset(jobs)`. The producer calls `builder.buildDataset(jobs)` (line 147) and the test's `fakeBuilder` defines `buildDataset`. I need to confirm the wrapper singletons (e.g. `wedmLoRADatasetBuilderEngine`) actually expose a `buildDataset` method — otherwise every real machine would hit the `builder-has-no-buildDataset` error path and silently produce 0 rows fleet-wide. Let me check the wrapper engine.

### Assistant | 2026-06-18T17:55:18.368Z

[tool_use: Read]

### User | 2026-06-18T17:55:23.354Z

[tool_result] 1	/**
2	 * WEDMLoRADatasetBuilderEngine -- CAM-ML-CLOSEDLOOP-MS0 (slot:india, U-LORA-WEDM-DATASET)
3	 * =====================================================================================
4	 *
5	 * Builds LoRA fine-tuning datasets for wire-EDM operations by wrapping
6	 * {@link BaseLoRADatasetBuilder} with a WEDM-specific render function and
7	 * validation policy. WEDM was the ONE machine-type 
... [+4964 chars truncated]

### Assistant | 2026-06-18T17:55:29.322Z

Confirmed: `wedmLoRADatasetBuilderEngine` exposes `buildDataset` (line 71) which delegates to `builder.build()`. The singleton export name matches the MACHINES registry (`wedmLoRADatasetBuilderEngine`). The wrapper's `validate` returns non-null to SKIP a job (drops it), so the base builder honors the no-fabrication contract — only real, schema-valid jobs become rows. A machine fed real-but-all-invalid jobs would produce `examples.length === 0`, writing an empty file (0 rows). 

Let me verify the remaining 7 singleton names + the `buildDataset` signature match across all wrappers, since a single mismatched export name would silently route to the `builder-has-no-buildDataset` or `resolve-failed` path for that machine.

### Assistant | 2026-06-18T17:55:31.691Z

[tool_use: Bash]

### User | 2026-06-18T17:55:37.007Z

[tool_result] === MillingLoRADatasetBuilderEngine ===
60:  buildDataset(jobs: RawJob[], split: DatasetSplitConfig = DEFAULT_SPLIT): DatasetBuildResult {
109:export const millingLoRADatasetBuilderEngine = new MillingLoRADatasetBuilderEngineImpl();
=== FiveAxisLoRADatasetBuilderEngine ===
55:  buildDataset(jobs: RawJob[], split: DatasetSplitConfig = DEFAULT_SPLIT): DatasetBuildResult {
117:export const fiveAxisLo
... [+1241 chars truncated]

### Assistant | 2026-06-18T17:55:40.420Z

All 8 singleton names + `buildDataset` signatures match the MACHINES registry exactly. No silent routing break. Now let me run the test suite to confirm the 8 tests actually pass (R12 — don't take "all passing" on faith) and verify the changed lines are ASCII-only.

### Assistant | 2026-06-18T17:55:41.370Z

[tool_use: Bash]

### Assistant | 2026-06-18T17:55:42.505Z

[tool_use: Bash]

### User | 2026-06-18T17:55:48.863Z

[tool_result]   ...
# Subtest: buildMachineDatasets: a builder that throws is isolated, run continues
ok 7 - buildMachineDatasets: a builder that throws is isolated, run continues
  ---
  duration_ms: 0.2627
  ...
# Subtest: buildMachineDatasets: requires a resolveBuilder (fail-loud)
ok 8 - buildMachineDatasets: requires a resolveBuilder (fail-loud)
  ---
  duration_ms: 0.4607
  ...
1..8
# tests 8
# suites 0
# 
... [+73 chars truncated]

### User | 2026-06-18T17:55:55.881Z

[tool_result] grep: -P supports only unibyte and UTF-8 locales
ASCII-CLEAN (both producer + test)

### Assistant | 2026-06-18T17:55:58.780Z

8/8 tests pass (independently verified). Let me re-run the ASCII check properly without the LC_ALL/-P conflict, and check the one inventory line that was changed for ASCII cleanliness too.

### Assistant | 2026-06-18T17:56:00.435Z

[tool_use: Bash]

### User | 2026-06-18T17:56:06.309Z

[tool_result] grep: -P supports only unibyte and UTF-8 locales
ALL THREE FILES ASCII-CLEAN

### Assistant | 2026-06-18T17:56:10.943Z

The grep is erroring on locale, not actually scanning. Let me use a reliable byte-level check.

### Assistant | 2026-06-18T17:56:12.479Z

[tool_use: Bash]

### User | 2026-06-18T17:56:18.511Z

[tool_result] scripts/build-machine-lora-datasets.mjs: 0 non-ASCII line(s)
scripts/build-machine-lora-datasets.test.mjs: 0 non-ASCII line(s)

### Assistant | 2026-06-18T17:56:26.692Z

Both new files are confirmed ASCII-clean (0 non-ASCII lines). The pre-existing inventory file line 12 has a stray `\` (a typo in a comment `\ Per kilo \checkin-kilo`), but that's pre-existing, outside the diff region, and not load-bearing.

Now let me close the remaining error-budget questions by examining a few edge paths carefully:

1. **`buildDataset` is sync in the wrappers but the producer `await`s it** (line 147) — `await` on a non-Promise is safe, resolves to the value. No issue.
2. **Atomic write tmp collision under concurrency** — `tmp-${process.pid}` is per-process; two concurrent processes writing the same machine would use different pids. Within one process, machines write sequentially. Safe.
3. **`flattenExamples` on a result where `examples` is null** — `(result && result.examples) || {}` handles it; spreads of `undefined` arrays default to `[]`. Safe.

Let me verify one subtle data-integrity edge: what happens if a real `buildDataset` returns a result but `examples` arrays are present yet ALL jobs were dropped as invalid (rows.length === 0) with `write:true` — does it write an empty file that then registers as `present` with 0 rows? That's the one place an "empty but present" file could mislead the assembler.

### Assistant | 2026-06-18T17:56:27.609Z

[tool_use: Read]

### User | 2026-06-18T17:56:28.712Z

[tool_result] 160	/**
161	 * Assemble the combined corpus from an inventory object. Reads each present
162	 * lora-training-jsonl source, dedupes across ALL sources by (instruction,output),
163	 * tags each row with its source weight/advisory flag. Pure w.r.t. the injected
164	 * readImpl so it is hermetically testable (no disk).
165	 */
166	export function assembleCorpus(inventory, { readImpl = fs.readFileSync
... [+1822 chars truncated]

### Assistant | 2026-06-18T17:56:53.561Z

The downstream is safe: an empty-but-present machine file produces `parseAlpacaJsonl` → 0 rows → 0 added; it contributes nothing to the corpus and cannot poison the fine-tune. The empty file is a benign no-op for the assembler.

I have traced the full chain end-to-end. Let me compile my findings.

## Investigation summary (auditable trace)

**Files read end-to-end:** `H:/prism/scripts/build-machine-lora-datasets.mjs`, `H:/prism/scripts/build-machine-lora-datasets.test.mjs`, the diff region + `inspectSource`/`statPath` in `H:/prism/scripts/build-fleet-training-corpus-inventory.mjs`.

**Consumers traced (blast radius):**
- All 8 wrapper engines (`{Milling,FiveAxis,MillTurn,WEDM,SinkerEDM,Laser,Waterjet,Grinding}LoRADatasetBuilderEngine.ts`) — confirmed every singleton export name + `buildDataset(jobs, split)` signature **exactly matches** the `MACHINES` registry rows. No silent routing break to the `builder-has-no-buildDataset` path.
- `MachineLoRABaseEngine.ts` — confirmed `buildDataset` delegates to `build()`, which only emits rows for jobs that pass `validate()` (returns non-null = drop). The no-fabrication contract holds at the engine layer: all-invalid jobs → `examples.length===0`.
- `assemble-fleet-lora-corpus.mjs` — confirmed it reads `resolvedPath || path` filtered on `kind==='lora-training-jsonl' && status==='present'`; an empty-but-present machine file contributes 0 rows (benign).

**Verified, not asserted:**
- Ran the test suite: **8/8 pass** (independently re-run, 0 skipped).
- Both new files are **byte-level ASCII-clean** (0 non-ASCII lines).
- Path registration: producer writes via `path.join` (OS sep) → inventory normalizes `.replace(/\\/g,'/')` → `fs.existsSync`/`statSync` accept forward-slash on Windows → matches every other SOURCES entry. **No path drift; id+path single-sourced from `MACHINES`.**

**Data-integrity verdict:** There is no path by which a machine with no/empty/all-malformed jobs produces a non-empty dataset. `parseJobsJsonl` rejects non
... [+2552 chars truncated]
