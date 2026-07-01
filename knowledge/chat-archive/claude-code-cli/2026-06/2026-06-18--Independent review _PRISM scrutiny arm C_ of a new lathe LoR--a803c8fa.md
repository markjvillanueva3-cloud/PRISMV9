---
type: "chat-session"
source: "claude-code-cli"
session_id: "a803c8fa-8407-40f0-81d9-0a56f2031bb5"
title: "Independent review (PRISM scrutiny arm C) of a new lathe LoRA corpus producer + "
date: "2026-06-18"
first_ts: "2026-06-18T18:47:23.778Z"
last_ts: "2026-06-18T18:52:47.093Z"
cwd: "H:\\prism-slot-india"
messages: 45
user_msgs: 17
assistant_msgs: 28
raw_file: "H:/.claude/projects/H--prism-slot-india/a803c8fa-8407-40f0-81d9-0a56f2031bb5/subagents/agent-aa4edbb23efd3cf8f.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:57"
---

# Independent review (PRISM scrutiny arm C) of a new lathe LoRA corpus producer + 

> **claude-code-cli** | 2026-06-18 | 45 msgs (17 user / 28 assistant) | cwd: H:\prism-slot-india
> Raw: `H:/.claude/projects/H--prism-slot-india/a803c8fa-8407-40f0-81d9-0a56f2031bb5/subagents/agent-aa4edbb23efd3cf8f.jsonl`

## Transcript

### User | 2026-06-18T18:47:23.778Z

Independent review (PRISM scrutiny arm C) of a new lathe LoRA corpus producer + its quality gate (slot:india, U-LORA-LATHE-CORPUS-POPULATE, commit 7ebf954622). Read END TO END:

1. H:/prism/scripts/build-lathe-lora-dataset.ts (NEW — tsx runner: runs LatheLoRADatasetBuilderEngine.buildDataset against the real JM CNC LATHE archive, applies a QUALITY GATE, writes galaxy-tagged Alpaca rows)
2. H:/prism/scripts/build-lathe-lora-dataset.test.ts (NEW — 8 node:test cases for the gate, all passing)
3. The diff in H:/prism/scripts/build-fleet-training-corpus-inventory.mjs (search "machine-lathe-lora" — the new SOURCES entry)

CONTEXT: The lathe builder (whiskey's engine) generates ~25-31% broken/low-signal LoRA pairs: (a) code_review examples whose "...performs:" analysis section is EMPTY (header-only .MIN snippets), (b) "sequence" operation-order examples that hallucinate ops not in the input, (c) too-short outputs. India must NOT register poison into the GPU fine-tune corpus (fleet-lora-combined.jsonl). So the runner curates: getExamples() -> filter via isQualityExample()/hasAnalysisContent() -> write only training-grade rows. Live run: 735 of 1060 kept (325 dropped), fleet corpus 1469->1601, lathe galaxy 20->150 after the assembler's dedup.

WEIGHTED REVIEW (weight toward correctness of the gate + no-poison guarantee):
- GATE CORRECTNESS: Does hasAnalysisContent() correctly return false ONLY for the empty-"performs:" pattern and true for grounded (>=1 bullet) AND for non-code_review outputs (no "performs:" section)? Could it FALSE-DROP a grounded example or FALSE-KEEP a broken one? Check the regex `/performs:\s*([\s\S]*?)\*\*Suggestions/i` + the bullet test `/^[ \t]*-\s+\S/m`.
- NO-FABRICATION / NO-POISON: confirm the runner writes ONLY filtered real-archive-grounded rows, fails loud + writes nothing if 0 kept (R12), and never synthesizes. Confirm it does NOT write an empty/poison file.
- IMPORT-SAFETY: confirm main() is guarded behind isMain so importing the module (the t
... [+632 chars truncated]

### Assistant | 2026-06-18T18:47:28.507Z

I'll review this lathe LoRA corpus producer end-to-end, weighted toward gate correctness and the no-poison guarantee.

### Assistant | 2026-06-18T18:47:28.984Z

[tool_use: Read]

### Assistant | 2026-06-18T18:47:29.285Z

[tool_use: Read]

### User | 2026-06-18T18:47:31.426Z

[tool_result] 1	#!/usr/bin/env -S npx tsx
2	/**
3	 * build-lathe-lora-dataset.ts -- producer: JM CNC LATHE archive -> Alpaca LoRA dataset
4	 * (U-LORA-LATHE-CORPUS-POPULATE, slot:india 2026-06-18).
5	 *
6	 * The LATHE sibling of build-machine-lora-datasets.mjs. LatheLoRADatasetBuilderEngine is a
7	 * DIFFERENT shape from the 8 BaseLoRADatasetBuilder wrappers -- it is a self-contained
8	 * archive-scanner (async
... [+6534 chars truncated]

### User | 2026-06-18T18:47:31.504Z

[tool_result] 1	/**
2	 * build-lathe-lora-dataset.test.ts -- U-LORA-LATHE-CORPUS-POPULATE (slot:india).
3	 * Run via tsx: npx tsx --test scripts/build-lathe-lora-dataset.test.ts
4	 *
5	 * Hermetic R9 tests for the CORPUS QUALITY GATE (the part india owns). Real reference values
6	 * pinned to the actual lathe-builder output shapes observed in the live run:
7	 *  - empty code-analysis ("performs:\n\n**Suggestion
... [+2575 chars truncated]

### Assistant | 2026-06-18T18:47:33.864Z

Now let me examine the engine that produces the examples, to verify the gate's assumptions against the real output shapes. This is the critical dependency.

### Assistant | 2026-06-18T18:47:34.423Z

[tool_use: Read]

### User | 2026-06-18T18:47:35.795Z

[tool_result] 1	/**
2	 * LatheLoRADatasetBuilderEngine — LATHE-LORA-MS0 U-LLR05
3	 * ======================================================
4	 *
5	 * Builds training datasets for LatheLoRA fine-tuning from JM Die program archive.
6	 * Converts raw Okuma .MIN programs into instruction-tuning format suitable for
7	 * Unsloth/PEFT LoRA training.
8	 *
9	 * Pipeline:
10	 *   1. Scan JM DIE archive (5,297 .MIN lathe 
... [+25203 chars truncated]

### Assistant | 2026-06-18T18:47:42.608Z

Now I have the engine. This is the critical dependency. Let me verify several gate-correctness questions against the real engine output shapes, and check the inventory diff plus the sibling for convention conformance.

Key observations from the engine:
- `generateCodeExplanation` (line 420) is the `code_review` output. The empty case: header `"This G-code segment performs:"` with NO bullets when snippet contains none of G71/G72/G70/G96/G50, then `"**Suggestions:**"`. This matches `BROKEN` constant.
- `generateSequenceResponse` (line 396) is the `sequence` output. Its template has hardcoded rationale bullets that hallucinate (e.g. "Threading after roughing" even when no threading op).
- `generateSpeedFeedResponse` (line 373) is the `speed_feed` output — uses `**Analysis:**` not `**...performs:**`.

Now let me check the gate's regex carefully against the `code_review` empty case and the `sequence`/`speed_feed` outputs, plus examine the inventory diff and sibling.

### Assistant | 2026-06-18T18:47:43.036Z

[tool_use: Read]

### User | 2026-06-18T18:47:45.413Z

[tool_result] 1	#!/usr/bin/env node
2	// build-fleet-training-corpus-inventory.mjs
3	//
4	// Aggregates every training-relevant corpus gathered across the fleet
5	// (kilo CAD/CAM PDF nodes, lima academy courses, india MIT-OCW extractions,
6	// charlie quoting baseline, foxtrot vendor PDFs, PSN legs, etc.) into one
7	// inventory the training pipeline can iterate over.
8	//
9	// Reference-only — does NOT duplic
... [+19743 chars truncated]

### Assistant | 2026-06-18T18:47:49.102Z

Now let me check the sibling for convention conformance and verify how the assembler consumes the galaxy-tagged rows (to confirm the `galaxy: "lathe"` tag and `source` field are correct and not silently dropped). Let me also verify the `arg()` parsing logic and the empty-`performs` regex edge case more carefully.

### Assistant | 2026-06-18T18:47:49.702Z

[tool_use: Read]

### User | 2026-06-18T18:47:51.125Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * build-machine-lora-datasets.mjs -- producer: per-machine RawJobs -> Alpaca LoRA datasets
4	 * (U-LORA-MACHINE-CORPUS-PRODUCER, slot:india 2026-06-18).
5	 *
6	 * THE REACH-DESTINATION CLOSURE for the MachineLoRABaseEngine family. The 8
7	 * BaseLoRADatasetBuilder wrappers (milling/5axis/millturn/wedm/sinker/laser/waterjet/
8	 * grinding) are dispatcher-reachable (`*
... [+11480 chars truncated]

### Assistant | 2026-06-18T18:47:55.461Z

Now let me verify how the assembler (`assemble-fleet-lora-corpus.mjs`) consumes these rows — specifically whether the `galaxy` and `source` fields on the row are honored, and whether the assembler reads the inventory or the file directly. This is the critical integration-coupling check: does the runner's row shape actually reach the GPU corpus correctly tagged?

### Assistant | 2026-06-18T18:47:55.496Z

[tool_use: Glob]

### User | 2026-06-18T18:47:58.002Z

[tool_result] scripts\assemble-fleet-lora-corpus.mjs

### Assistant | 2026-06-18T18:48:00.549Z

[tool_use: Read]

### User | 2026-06-18T18:48:01.677Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * assemble-fleet-lora-corpus.mjs -- the MANIFEST CONSUMER (U-LORA-CORPUS-ASSEMBLE,
4	 * slot:india 2026-06-10).
5	 *
6	 * THE DORMANCY THIS CLOSES: the vault -> LoRA chain dead-ended at the manifest.
7	 * scripts/vault-to-lora-dataset.mjs PRODUCES Alpaca-triple datasets and
8	 * build-fleet-training-corpus-inventory.mjs REGISTERS them as
9	 * kind:'lora-training-json
... [+14665 chars truncated]

### Assistant | 2026-06-18T18:48:08.079Z

The assembler confirms the integration contract: `normalizeAlpacaRow` preserves `o.galaxy` (line 137), and `assembleCorpus` carries `r.galaxy` through the union (line 189). So the runner's `galaxy: "lathe"` tag DOES reach the combined corpus correctly. The `source` field the runner sets ("machine-lathe-lora") is overwritten by the assembler with `src.id` (line 188) — but `src.id` IS `"machine-lathe-lora"` per the inventory entry (line 48), so they match. Good.

Now let me carefully verify the gate's regex against the empty `code_review` case and the `arg()` parsing edge cases. Let me also confirm the live output file exists and matches the test constants (R12 — verify, don't assert).

### Assistant | 2026-06-18T18:48:18.911Z

[tool_use: Bash]

### Assistant | 2026-06-18T18:48:23.214Z

[tool_use: Bash]

### User | 2026-06-18T18:48:27.208Z

[tool_result] EMPTY code_review hasAnalysisContent (want false): false
GROUNDED code_review hasAnalysisContent (want true): true
speed_feed (no performs:) hasAnalysisContent (want true): true
speed_feed contentLen: 237 isQuality (want true): true
EMPTY review contentLen: 143 (>=120 means floor would NOT catch it, gate relies on hasAnalysisContent)
lowercase suggestions match (case-insensitive regex): false

### User | 2026-06-18T18:48:32.788Z

[tool_result] arg(max) default: 500
parseInt of default: 500
---
max=750 -> "500"
out path -> "C:/Users/wompu/AppData/Local/Temp/x.jsonl"

### Assistant | 2026-06-18T18:48:37.401Z

Interesting finding on `arg()`. The `--max=` parsing returned "500" (the default) instead of "750" in my repro — but that's because my repro's `arg()` used `process.argv.slice(2)` while the real code uses `process.argv` (unsliced). Let me verify the REAL code's `arg()` behavior precisely, because the offset `slice(name.length + 3)` is the load-bearing part. `--max=` = 2 (`--`) + 3 (`max`) + 1 (`=`) = 6 chars. `name.length + 3` = 3 + 3 = 6. Correct offset. My repro's discrepancy was the `slice(2)`. Let me confirm against the actual module.

### Assistant | 2026-06-18T18:48:40.693Z

[tool_use: Bash]

### Assistant | 2026-06-18T18:48:43.692Z

[tool_use: Bash]

### User | 2026-06-18T18:48:46.708Z

[tool_result] max -> "750"
out -> "C:/Users/wompu/AppData/Local/Temp/lathe.jsonl"
--- check the 'out' (length 3) too: name.length+3 = 6, '--out=' = 6 chars. correct ---

### User | 2026-06-18T18:48:54.118Z

[tool_result] -rw-r--r-- 1 wompu 197611 362068 Jun 18 13:41 state/shared/lora/machine-lathe-dataset.jsonl
--- row count ---
735 state/shared/lora/machine-lathe-dataset.jsonl
--- first row ---
keys: [ 'instruction', 'input', 'output', 'galaxy', 'source' ]
galaxy: lathe source: machine-lathe-lora
output head: "Based on the program parameters (S800, F0.005):\n\n**Analysis:**\n- Spindle speed: "

### Assistant | 2026-06-18T18:48:57.730Z

The live file confirms: 735 rows, keys `[instruction, input, output, galaxy, source]`, `galaxy: lathe`, `source: machine-lathe-lora`. The `arg()` offset is correct. Now let me run the test suite to confirm it passes, and verify whether any poison (empty-analysis rows) leaked into the actual output file — the no-poison guarantee in live data.

### Assistant | 2026-06-18T18:48:58.670Z

[tool_use: Bash]

### Assistant | 2026-06-18T18:49:03.424Z

[tool_use: Bash]

### User | 2026-06-18T18:51:18.192Z

[tool_result]   ...
# Subtest: isQualityExample: too-short output -> dropped
ok 7 - isQualityExample: too-short output -> dropped
  ---
  duration_ms: 0.0942
  ...
# Subtest: isQualityExample: grounded general op above content floor -> kept
ok 8 - isQualityExample: grounded general op above content floor -> kept
  ---
  duration_ms: 0.043
  ...
1..8
# tests 8
# suites 0
# pass 8
# fail 0
# cancelled 0
# skipped
... [+33 chars truncated]

### User | 2026-06-18T18:51:23.846Z

[tool_result] total live rows: 735
LEAKED empty-analysis poison (want 0): 0
LEAKED too-short poison (want 0): 0
sequence-template rows present (want 0, gate drops operation_type=sequence): 0

### Assistant | 2026-06-18T18:51:29.409Z

All 8 tests pass and the live output has ZERO leaked poison (0 empty-analysis, 0 too-short, 0 sequence-template rows). The no-poison guarantee holds against live data.

Now let me probe the one subtle correctness concern I want to nail down: the `sequence`-hallucination drop. The gate drops on `operation_type === "sequence"` (metadata-keyed), NOT on the output's `**Recommended Operation Sequence:**` text. That's the correct, robust key. But let me verify there's no OTHER operation_type whose output ALSO contains the hallucinated sequence template — and confirm `getExamples()` returns the same array `buildDataset` populated (no double-scan / no staleness between the two calls).

### Assistant | 2026-06-18T18:51:38.429Z

[tool_use: Bash]

### User | 2026-06-18T18:51:44.177Z

[tool_result] structural analysis confirmed by engine read
--- verify getExamples() is the SAME populated array buildDataset filled (no re-scan) ---
engine: buildDataset sets this.examples (line 528,578); getExamples returns [...this.examples] (line 678). No re-scan. Caller calls buildDataset THEN getExamples on same singleton -> same data.
--- check operation_type distribution in live file by re-deriving from 
... [+75 chars truncated]

### Assistant | 2026-06-18T18:51:48.711Z

Live distribution: 239 code_review + 496 speed_feed = 735, 0 "other". This confirms the gate dropped all sequence rows and all empty code_review rows. The engine's `getExamples()` returns the same populated array `buildDataset` filled (no re-scan, line 528/578/678).

Now let me do the final checks: ASCII-only on changed lines, and a check for one potential concurrency/atomic-write concern plus the `metadata` strip path the comment claims (line 80-81).

### Assistant | 2026-06-18T18:51:54.103Z

[tool_use: Bash]

### User | 2026-06-18T18:51:59.728Z

[tool_result] === non-ASCII bytes in the two new files (want none) ===
grep: -P supports only unibyte and UTF-8 locales
CLEAN: no non-ASCII

=== non-ASCII in the inventory diff region (lines 41-54) ===
grep: -P supports only unibyte and UTF-8 locales
CLEAN: no non-ASCII in changed region

=== confirm metadata strip claim: toAlpacaFormat strips metadata (engine 691-697) so filter must use getExamples (full) BEFO
... [+355 chars truncated]

### Assistant | 2026-06-18T18:52:02.860Z

The `grep -P` failed due to locale (not a clean result). Let me re-run the ASCII check with a reliable method.

### Assistant | 2026-06-18T18:52:07.294Z

[tool_use: Bash]

### User | 2026-06-18T18:52:13.703Z

[tool_result] scripts/build-lathe-lora-dataset.ts: CLEAN
scripts/build-lathe-lora-dataset.test.ts: CLEAN
inventory lines 41-54: CLEAN

### Assistant | 2026-06-18T18:52:47.093Z

All ASCII-clean. I have everything I need for a complete verdict. Let me compile the findings.

## Summary of verification performed

**Gate correctness** — verified `hasAnalysisContent()` against the engine's EXACT output shapes:
- Empty `code_review` (engine `generateCodeExplanation` with no G71/G72/G70/G96/G50) → `false` (dropped). ✓
- Grounded `code_review` (≥1 bullet) → `true` (kept). ✓
- `speed_feed` / `general` outputs (use `**Analysis:**`, no `performs:` section) → `true` (kept, not false-dropped). ✓
- The regex `/performs:\s*([\s\S]*?)\*\*Suggestions/i` + bullet test `/^[ \t]*-\s+\S/m` correctly isolates the bullet region between `performs:` and `**Suggestions`. The empty case content-length (143) exceeds the 120 floor, so the gate genuinely depends on `hasAnalysisContent` — and it fires. ✓

**No-poison / no-fabrication** — Live audit of the 735-row output file: 0 leaked empty-analysis, 0 too-short, 0 sequence-template rows. The runner writes ONLY filtered real-archive rows, returns `1` + writes nothing when `kept.length === 0` (R12, line 85-88), and never synthesizes. ✓

**Sequence-hallucination drop** — keyed on `metadata.operation_type === "sequence"` (line 56), which is robust: the engine only emits `generateSequenceResponse` for that one operation_type (line 320-332), so the hallucinated-ops template can never reach a non-sequence row. Structurally complete. ✓

**Import-safety** — `isMain` guard (line 107-114) correctly gates `main()`; the test imports `hasAnalysisContent`/`isQualityExample` without triggering the 5,297-program archive scan. ✓

**Integration coupling** — confirmed the assembler (`normalizeAlpacaRow` line 137 + `assembleCorpus` line 189) preserves the `galaxy: "lathe"` tag through the union; the runner's `source` field is overwritten by `src.id` but they match (`machine-lathe-lora`). ✓

**Test integrity (R9)** — 8 tests pinned to real observed constants (BROKEN/GROUNDED/NON_REVIEW), exercise each drop reason (empty-analysis, sequence-ev
... [+4198 chars truncated]
