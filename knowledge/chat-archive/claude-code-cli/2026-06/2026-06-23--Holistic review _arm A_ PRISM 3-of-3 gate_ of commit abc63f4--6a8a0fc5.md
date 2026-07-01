---
type: "chat-session"
source: "claude-code-cli"
session_id: "6a8a0fc5-4275-43b0-b847-449c590c706b"
title: "Holistic review (arm A, PRISM 3-of-3 gate) of commit abc63f4874 on cad-fusion-li"
date: "2026-06-23"
first_ts: "2026-06-23T08:33:49.215Z"
last_ts: "2026-06-23T08:35:53.505Z"
cwd: "H:\\prism"
messages: 37
user_msgs: 13
assistant_msgs: 24
raw_file: "H:/.claude/projects/H--prism/6a8a0fc5-4275-43b0-b847-449c590c706b/subagents/agent-a92ad82c82da690db.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:14"
---

# Holistic review (arm A, PRISM 3-of-3 gate) of commit abc63f4874 on cad-fusion-li

> **claude-code-cli** | 2026-06-23 | 37 msgs (13 user / 24 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/6a8a0fc5-4275-43b0-b847-449c590c706b/subagents/agent-a92ad82c82da690db.jsonl`

## Transcript

### User | 2026-06-23T08:33:49.215Z

Holistic review (arm A, PRISM 3-of-3 gate) of commit abc63f4874 on cad-fusion-live-ms0.

Diff: `git -C H:/prism show abc63f4874`

UNIT U-XRAY-GDT-LABEL-TIER: makes the closed-loop OCR corpus capture trainable GD&T labels (was dimension-only). `buildTrainsetRow` (ocr-training-loop-lib.mjs) emits `gdt_labels[]` tiered by the SAME corroboration gate + assignLabelTier as dims, each with a `buildFcfText` FCF ground-truth string + `calibration_basis:"dimension-agreement"` honesty flag; the runner (blueprint-ocr-training-loop.mjs) persists trainable gdt_labels to the trainset JSONL + report; the LoRA pair builder (trainset-to-lora-pairs.mjs) emits a `{extractionType:"gdt", groundTruthValue:fcf_text}` pair per trainable gdt_label.

Grade PASS/FAIL + P0/P1/P2 + file:line. Focus: overall correctness; strictly additive (dim path + existing consumers unaffected); reaches the LoRA destination without orphan; R12 honesty (counts a borrowed dimension-calibration, never claims GD&T-specific accuracy). Context: 38/38 + 12/12 + 43/43 tests green; live proof: a real GD&T frame -> trainable label -> LoRA pair gt="position 0.1mm MMC [A|B]". Do not run tests. End with PASS or FAIL.

### Assistant | 2026-06-23T08:33:54.193Z

I'll review commit abc63f4874 holistically. Let me start by reading the diff and the changed files end to end.

### Assistant | 2026-06-23T08:33:54.550Z

[tool_use: Bash]

### User | 2026-06-23T08:33:57.391Z

[tool_result] commit abc63f4874c636d58e574e4de4ebcf4224896cc6
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Tue Jun 23 03:33:27 2026 -0500

    [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-GDT-LABEL-TIER (slot:xray): tier GD&T frames as trainable LoRA labels (image -> FCF text) -- buildTrainsetRow -> runner JSONL -> LoRA pairs
    
    The closed-loop OCR corpus was DIMENSION-ONLY: U-XRAY-EN
... [+2770 chars truncated]

### Assistant | 2026-06-23T08:34:00.654Z

Let me read the full diff and the complete files.

### Assistant | 2026-06-23T08:34:00.743Z

[tool_use: Bash]

### User | 2026-06-23T08:34:04.354Z

[tool_result] commit abc63f4874c636d58e574e4de4ebcf4224896cc6
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Tue Jun 23 03:33:27 2026 -0500

    [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-GDT-LABEL-TIER (slot:xray): tier GD&T frames as trainable LoRA labels (image -> FCF text) -- buildTrainsetRow -> runner JSONL -> LoRA pairs
    
    The closed-loop OCR corpus was DIMENSION-ONLY: U-XRAY-EN
... [+23954 chars truncated]

### Assistant | 2026-06-23T08:34:07.758Z

Now let me read the full files end to end to verify the surrounding contracts, not just the diff hunks.

### Assistant | 2026-06-23T08:34:07.802Z

[tool_use: Read]

### User | 2026-06-23T08:34:08.552Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\ocr-training-loop-lib.mjs' was already read 13m ago in this session and is unchanged (mtime 1782202769261). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-23T08:34:11.811Z

The read-once guard claims it's in context, but I don't actually have the full file content for this fresh review. Let me bypass with a different offset to get the full file.

### Assistant | 2026-06-23T08:34:12.396Z

[tool_use: Read]

### User | 2026-06-23T08:34:13.646Z

[tool_result] 1	// scripts/lib/ocr-training-loop-lib.mjs
2	//
3	// U-XRAY-OCR-TRAINING-LOOP — closed-loop OCR training-data engine (pure core).
4	//
5	// WHY (ready-now, no delta): the full print→CAD→gcode→CAD-gen loop is gated on delta's CAD-gen,
6	// but the print-READING stage trains TODAY. The multi-VLM ensemble (vision-ensemble-fuse.mjs) is a
7	// TEACHER: run it over real prints and the dims models corrob
... [+17084 chars truncated]

### Assistant | 2026-06-23T08:34:16.917Z

I have the full lib file now. Let me read the rest of the trainset-to-lora-pairs.mjs file and the runner around the changed sections to verify the surrounding contract.

### Assistant | 2026-06-23T08:34:17.055Z

[tool_use: Read]

### User | 2026-06-23T08:34:17.613Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\trainset-to-lora-pairs.mjs' was already read 6m ago in this session and is unchanged (mtime 1782203142574). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-23T08:34:20.103Z

[tool_use: Read]

### User | 2026-06-23T08:34:21.038Z

[tool_result] 1	// scripts/lib/trainset-to-lora-pairs.mjs
2	//
3	// U-XRAY-BLUEPRINT-LORA-STAGE — pure adapter: closed-loop OCR trainset rows → the
4	// BlueprintLoRABridgeEngine's LoRATrainingPair[] contract (the xray→india LoRA seam).
5	//
6	// This is the ONLY genuinely-new code in the staging unit: the bridge CONSUMES LoRATrainingPair[]
7	// (anonymize → per-provider serialize → staging-gated export) but do
... [+5296 chars truncated]

### Assistant | 2026-06-23T08:34:23.807Z

Now let me read the runner around the changed sections to verify the persistence path and the report contract.

### Assistant | 2026-06-23T08:34:24.615Z

[tool_use: Read]

### User | 2026-06-23T08:34:25.677Z

[tool_result] 290	  if (opts.fresh) {
291	    for (const p of [trainsetPath, queuePath, cursorPath]) { try { writeFileSync(p, ""); } catch { /* best-effort */ } }
292	  }
293	  let doneSet = new Set();
294	  if (!opts.fresh && existsSync(cursorPath)) {
295	    try { doneSet = parseCursorDoneSet(readFileSync(cursorPath, "utf8"), { retryFailed: opts.retryFailed }); }
296	    catch (e) { console.error(`  ⚠ cursor 
... [+16593 chars truncated]

### Assistant | 2026-06-23T08:34:30.413Z

I now have the full runner context. Let me verify the downstream consumer that reads the trainset JSONL (the `xray-trainset-to-lora.mjs` dedup path referenced in comments) actually feeds into `trainsetRowToPairs`, to confirm the GD&T labels reach the LoRA destination without an orphan, and that the dedup logic handles the new `gdt_labels` field.

### Assistant | 2026-06-23T08:34:32.015Z

[tool_use: Bash]

### User | 2026-06-23T08:34:35.957Z

[tool_result] 30:import { trainsetToLoRAPairs } from "./lib/trainset-to-lora-pairs.mjs";
45: * Last-wins dedup identity for a trainset row. The resumable runner appends per-page rows BEFORE the
47: * The runner promises these are deduped here last-wins by key+page (runner report note). Falls back to
49: * collapsed; a legacy row without key/page dedups by its image path.
63:  // Last-wins dedup: a later row for
... [+686 chars truncated]

### Assistant | 2026-06-23T08:34:39.355Z

Let me read the `xray-trainset-to-lora.mjs` dedup row identity and how it parses rows to confirm the new `gdt_labels` field survives the dedup intact (it dedups by `key+page`, so the whole row including `gdt_labels` is preserved).

### Assistant | 2026-06-23T08:34:44.385Z

[tool_use: Read]

### User | 2026-06-23T08:34:45.687Z

[tool_result] 40	    json: args.includes("--json"),
41	  };
42	}
43	
44	/**
45	 * Last-wins dedup identity for a trainset row. The resumable runner appends per-page rows BEFORE the
46	 * per-print cursor, so a reaper kill mid-print leaves duplicate rows on resume (same page re-emitted).
47	 * The runner promises these are deduped here last-wins by key+page (runner report note). Falls back to
48	 * image, then p
... [+2634 chars truncated]

### Assistant | 2026-06-23T08:34:51.074Z

The full destination path is confirmed: dedup preserves the whole row (so `gdt_labels` survives last-wins), then `trainsetToLoRAPairs` → `trainsetRowToPairs` emits the GD&T pairs. The destination is reached without an orphan.

Now let me verify the `fused.gdt` shape that `buildTrainsetRow` consumes actually carries `corroboration`/`n_models`/`hallucination_candidate` per-frame, since the GD&T tiering depends entirely on those fields existing on each `fused.gdt[]` entry. Let me check `vision-ensemble-fuse.mjs` (the producer referenced in the commit as `U-XRAY-ENSEMBLE-NONDIM-UNION`).

### Assistant | 2026-06-23T08:34:52.090Z

[tool_use: Bash]

### User | 2026-06-23T08:34:56.409Z

[tool_result] 23://   This is the exact noisy-OR corroboration doctrine PRISM already uses for cross-SOURCE
60:// corroboration yields literal certainty (1.0): a residual ~1% reserves the possibility
111: * One-vote-per-model: a cluster never contains two dims from the SAME model — corroboration
113: * instances, not self-corroboration. A candidate joins the FEASIBLE cluster (type-compatible
182:// NON-DIMENSIO
... [+3035 chars truncated]

### Assistant | 2026-06-23T08:35:00.824Z

This confirms the producer contract. Each `fused.gdt[]` entry from `fuseNonDimField` carries `corroboration`, `n_models`, and `hallucination_candidate` — exactly the fields `buildTrainsetRow`'s GD&T path reads at lines 182-191. Let me confirm the exact emitted entry shape (the `out.push` block around line 253-261) to verify field names like `symbol`, `tolerance_value`, `tolerance_unit`, `material_condition`, `datum_references`, `raw_text` are actually carried through.

### Assistant | 2026-06-23T08:35:01.238Z

[tool_use: Read]

### User | 2026-06-23T08:35:02.237Z

[tool_result] 200	/** Stringify a numeric key part (null/undefined/NaN -> "" so it never reads as a value). */
201	function numKeyPart(n) {
202	  return Number.isFinite(n) ? String(n) : "";
203	}
204	
205	// FCF identity: geometric characteristic + tolerance + material condition + datum refs + feature.
206	// datum_references are order-insensitive (A,B == B,A), so they are sorted into the key.
207	function gdtK
... [+3664 chars truncated]

### Assistant | 2026-06-23T08:35:10.815Z

The producer contract is fully confirmed. `fuseNonDimField` spreads `...g.rep` (the representative GD&T frame, preserving `symbol`/`tolerance_value`/`tolerance_unit`/`material_condition`/`datum_references`/`raw_text` from the VLM extraction) and adds `corroboration`/`n_models`/`hallucination_candidate`. This is exactly the shape `buildTrainsetRow` and `buildFcfText` consume.

Now let me verify two edge-correctness concerns I want to nail down:

1. The `gdtKey` identity uses `tolerance_value` and `material_condition` but NOT `tolerance_unit`. This means two frames with the same tolerance value but different units (e.g. `0.1mm` vs `0.1in`) would collapse to the same cluster. Let me check whether this is a real issue for the GD&T-label path or out of scope (it's a pre-existing producer behavior, not introduced by this commit).

2. Verify the `assignLabelTier` "uncalibrated" tier path — if `calibration` is uncalibrated, GD&T frames get `tier:"uncalibrated"`, `trainable:false`, which is correct and matches the dim path.

Let me check the test file fully to confirm the tests actually assert intent (R9), and confirm there are no `.skip`/`.only`.

### Assistant | 2026-06-23T08:35:13.269Z

[tool_use: Bash]

### User | 2026-06-23T08:35:16.329Z

[tool_result] H:/prism/scripts/lib/ocr-training-loop-lib.test.mjs:3:// toBeDefined() stubs. The calibration decides which pseudo-labels are TRUSTED enough to train a
H:/prism/scripts/lib/ocr-training-loop-lib.test.mjs:440:  assert.equal(r.skippedCursorDone, 1, "b.pdf is in the cursor (genuine prior-run progress)");
H:/prism/scripts/lib/ocr-training-loop-lib.test.mjs:441:  assert.equal(r.skippedWorklistDup, 2, "
... [+645 chars truncated]

### Assistant | 2026-06-23T08:35:53.505Z

No `.skip`/`.only`/`toBeDefined` stubs (the only matches are a comment explaining the test rejects stubs, and legitimate `skipped*` data-field assertions). The `CAL` fixture (`f:0.5→0.70` silver, `f:1.0→0.92` gold) is a real reference-value calibration, and the GD&T tests assert concrete tier outcomes (`agreement_fraction`, `tier`, `fcf_text`, `calibration_basis`) — these are intent-verifying (R9): they fail if the tiering math or FCF rendering breaks.

Let me verify my one remaining correctness concern — the `assignLabelTier` `corr/nm` math when `f > 1` (a defensive edge: could `corroboration > n_models` ever happen, producing `f > 1`?). And confirm `expectedAccuracyForFraction` handles `f > 1` via the clamp-high path. The producer sets `n_models = nModels` (ensemble size) and `corroboration = g.models.size` (a subset of models), so `corr ≤ n_models` always holds. The math is sound.

Let me also confirm `buildFcfText`'s tolerance-zero edge: `tolerance_value: 0` is `Number.isFinite(0)===true`, so `tol = "0"` which is truthy as a string — it would be included. Good, a zero-tolerance frame is rendered, not dropped. Let me verify there's no falsy-`0` bug.

The key check: `const tol = Number.isFinite(g.tolerance_value) ? String(g.tolerance_value) : "";` — for `tolerance_value: 0`, `tol = "0"`, and `if (tol)` treats `"0"` as truthy (non-empty string). Correct. The only dropped case is when `tolerance_value` is absent/NaN.

I have everything I need. Let me do a final check on whether the runner persists the FULL `gdt_labels` (with `fcf_text`) into the JSONL — confirming the LoRA builder downstream actually receives `fcf_text`. Looking at line 404: the appended row includes `gdt_labels: trainableGdt` where `trainableGdt` is filtered from `trainsetRow.gdt_labels` (each carries `fcf_text`). Confirmed — `fcf_text` survives to disk and into `trainsetRowToPairs`.

All paths verified end to end. Let me compose the verdict.

## Review complete

I read all five changed files end t
... [+4684 chars truncated]
