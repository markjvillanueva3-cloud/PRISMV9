---
type: "chat-session"
source: "claude-code-cli"
session_id: "5c91e392-f5b8-473b-bddc-c0de161b8ee0"
title: "3-of-3 Stop-gate review (ARM B — weighted toward TEST INTEGRITY + inlined-consta"
date: "2026-06-08"
first_ts: "2026-06-08T18:02:47.015Z"
last_ts: "2026-06-08T18:04:52.239Z"
cwd: "H:\\prism"
messages: 39
user_msgs: 15
assistant_msgs: 24
raw_file: "H:/.claude/projects/H--prism/5c91e392-f5b8-473b-bddc-c0de161b8ee0/subagents/agent-abeab9ba11728fa53.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:13"
---

# 3-of-3 Stop-gate review (ARM B — weighted toward TEST INTEGRITY + inlined-consta

> **claude-code-cli** | 2026-06-08 | 39 msgs (15 user / 24 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/5c91e392-f5b8-473b-bddc-c0de161b8ee0/subagents/agent-abeab9ba11728fa53.jsonl`

## Transcript

### User | 2026-06-08T18:02:47.015Z

3-of-3 Stop-gate review (ARM B — weighted toward TEST INTEGRITY + inlined-constant detection + wiring completeness; do NOT assume arm A caught everything). Session: slot xray, OCR closed-loop corpus-scale-ready, in H:/prism.

Read these test + source files END-TO-END:
- scripts/lib/ocr-training-loop-lib.test.mjs (8 new resume-cursor tests) + scripts/lib/ocr-training-loop-lib.mjs (the 4 new fns: printCursorKey/parseCursorDoneSet/formatCursorLine/partitionByResumeCursor)
- scripts/build-print-corpus-manifest.test.mjs (9 classifyDoc tests) + scripts/build-print-corpus-manifest.mjs
- scripts/xray-trainset-to-lora.test.mjs (3 dedup tests) + scripts/xray-trainset-to-lora.mjs (trainsetRowDedupKey)
- scripts/blueprint-ocr-training-loop.mjs (the consumer wiring all 4 lib fns + rasterizePrintPages)

Focus:
1. R9 — would each test FAIL if the logic it covers broke? Or are any tautological? Specifically: the re-OCR=0 resume invariant test, the torn-line fail-soft test, the business-role-stays-excluded leak test, the key+page dedup-distinctness test.
2. Inlined constants — are MAX_PAGES_PER_PRINT, RASTER_DPI, the tier thresholds, ALARM_DRAWING_MAX named consts (not magic numbers buried in logic)? Any duplicated/inlined value that should be single-sourced?
3. Wiring completeness — does blueprint-ocr-training-loop.mjs actually import + USE all 4 resume fns + rasterizePrintPages? Is the run-as-main guard present on all 3 entrypoint scripts (manifest builder, lora-stager, runner)?
4. Run `rtk node --test scripts/lib/ocr-training-loop-lib.test.mjs scripts/build-print-corpus-manifest.test.mjs scripts/xray-trainset-to-lora.test.mjs` and confirm 31/31 pass.

Verdict: PASS or FAIL with P0/P1 (file:line).

### Assistant | 2026-06-08T18:02:57.525Z

I'll review this OCR closed-loop corpus-scale work as ARM B, focused on test integrity, inlined constants, and wiring completeness. Let me start by reading all the files end-to-end.

### Assistant | 2026-06-08T18:02:57.985Z

[tool_use: Read]

### Assistant | 2026-06-08T18:02:58.428Z

[tool_use: Read]

### User | 2026-06-08T18:02:59.418Z

[tool_result] 1	// scripts/lib/ocr-training-loop-lib.test.mjs
2	// Tests for U-XRAY-OCR-TRAINING-LOOP pure core. Reference values + algebraic invariants — no
3	// toBeDefined() stubs. The calibration decides which pseudo-labels are TRUSTED enough to train a
4	// model on, so each test encodes WHY a trust verdict matters (a wrong calibration = silently
5	// training on garbage labels — the exact "garbage in, gar
... [+15406 chars truncated]

### User | 2026-06-08T18:03:00.594Z

[tool_result] 1	// scripts/lib/ocr-training-loop-lib.mjs
2	//
3	// U-XRAY-OCR-TRAINING-LOOP — closed-loop OCR training-data engine (pure core).
4	//
5	// WHY (ready-now, no delta): the full print→CAD→gcode→CAD-gen loop is gated on delta's CAD-gen,
6	// but the print-READING stage trains TODAY. The multi-VLM ensemble (vision-ensemble-fuse.mjs) is a
7	// TEACHER: run it over real prints and the dims models corrob
... [+16916 chars truncated]

### Assistant | 2026-06-08T18:03:04.380Z

Now let me read the manifest builder and its test, plus the lora-stager and its test.

### Assistant | 2026-06-08T18:03:05.229Z

[tool_use: Read]

### Assistant | 2026-06-08T18:03:05.232Z

[tool_use: Read]

### User | 2026-06-08T18:03:06.441Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/build-print-corpus-manifest.mjs
3	//
4	// U-XRAY-PRINT-CORPUS-MANIFEST (STEP 2 of the OCR-training-scope synthesis) — define the REAL
5	// denominator of "all prints in the JM folder / Docustrata" by SEARCHING juliett's already-extracted
6	// index (mcp-server/data/jm-die-database/tables/documents.jsonl, 111,745 v3-classified docs), NEVER by
7	// re-OCRing the 25
... [+10455 chars truncated]

### User | 2026-06-08T18:03:07.977Z

[tool_result] 1	// scripts/build-print-corpus-manifest.test.mjs
2	// Tests for the print-corpus bucketing (STEP 2). classifyDoc is the SINGLE source of the
3	// drawing/ambiguous/excluded rule — both the manifest counts and the VLM worklist flow through it,
4	// so a wrong verdict here = either burning VLM time on a sales order (excluded leaking to drawing)
5	// or silently dropping a real print (drawing leakin
... [+4684 chars truncated]

### Assistant | 2026-06-08T18:03:12.321Z

Now the lora-stager and its test, plus the consumer runner.

### Assistant | 2026-06-08T18:03:12.879Z

[tool_use: Read]

### Assistant | 2026-06-08T18:03:13.113Z

[tool_use: Read]

### User | 2026-06-08T18:03:14.108Z

[tool_result] 1	// scripts/xray-trainset-to-lora.test.mjs
2	// Tests the resume-duplicate dedup identity. The resumable OCR runner appends per-page trainset rows
3	// BEFORE the per-print cursor, so a reaper kill mid-print leaves duplicate rows on resume. This loader
4	// is where the runner's promised "last-wins dedup by key+page" actually happens — without it a kill
5	// double-weights a print's labels in the
... [+2245 chars truncated]

### User | 2026-06-08T18:03:15.633Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/xray-trainset-to-lora.mjs
3	//
4	// U-XRAY-BLUEPRINT-LORA-STAGE — the xray→india LoRA seam (staging runner).
5	//
6	// Reads the closed-loop OCR trainset, maps it to the BlueprintLoRABridgeEngine's LoRATrainingPair[]
7	// contract (via the pure adapter), then routes through the REAL bridge (prepareTrainingSet →
8	// exportBundle) to drop a provider-formatted bund
... [+9584 chars truncated]

### Assistant | 2026-06-08T18:03:21.680Z

Now the consumer runner — the critical wiring check. Let me read it, plus the trainset-to-lora-pairs adapter it references.

### Assistant | 2026-06-08T18:03:22.178Z

[tool_use: Read]

### User | 2026-06-08T18:03:24.416Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/blueprint-ocr-training-loop.mjs
3	//
4	// U-XRAY-OCR-TRAINING-LOOP — the closed-loop OCR training-data engine (runner).
5	//
6	// Trains the print-READING stage TODAY, without delta's CAD-gen. Three phases:
7	//   1. CALIBRATE — generate perfect-GT synthetic prints (mixed difficulty) → multi-VLM ensemble →
8	//      measure P(consensus dim CORRECT | corroboration
... [+22545 chars truncated]

### Assistant | 2026-06-08T18:03:28.769Z

Now I have all the files end-to-end. Let me verify the dedup wiring claim — the runner writes trainset rows with `key`+`page`+`image`, and the dedup key uses `key`+`page`. Let me check the trainset-to-lora-pairs adapter to confirm what fields it consumes, and run the tests.

### Assistant | 2026-06-08T18:03:29.276Z

[tool_use: Read]

### Assistant | 2026-06-08T18:03:30.742Z

[tool_use: Bash]

### User | 2026-06-08T18:03:32.114Z

[tool_result] 1	// scripts/lib/trainset-to-lora-pairs.mjs
2	//
3	// U-XRAY-BLUEPRINT-LORA-STAGE — pure adapter: closed-loop OCR trainset rows → the
4	// BlueprintLoRABridgeEngine's LoRATrainingPair[] contract (the xray→india LoRA seam).
5	//
6	// This is the ONLY genuinely-new code in the staging unit: the bridge CONSUMES LoRATrainingPair[]
7	// (anonymize → per-provider serialize → staging-gated export) but do
... [+3938 chars truncated]

### User | 2026-06-08T18:03:35.725Z

[tool_result]   ...
# Subtest: partitionByResumeCursor: skips done keys, keeps todo order, NEVER re-runs a processed print
ok 26 - partitionByResumeCursor: skips done keys, keeps todo order, NEVER re-runs a processed print
  ---
  duration_ms: 0.1805
  ...
# Subtest: partitionByResumeCursor: a print listed twice in the worklist is processed once (in-worklist de-dup)
ok 27 - partitionByResumeCursor: a print list
... [+1101 chars truncated]

### Assistant | 2026-06-08T18:03:43.973Z

31/31 pass confirmed. Now let me run the focused R9 invariant tests — I want to verify each of the 4 named tests genuinely FAILS when the logic breaks. Let me probe the two highest-risk ones: the dedup key+page distinctness and the torn-line fail-soft. I'll mutate the source in-memory via a quick adversarial check rather than editing files.

Let me trace the critical wiring concern: the dedup-distinctness claim. The runner writes `key` = `printCursorKey(entry)` (basename, e.g. `part.pdf`) and `page` per page. So two pages of one print get `key="part.pdf"` with `page=0` and `page=1` → dedup keys `part.pdf#p0` vs `part.pdf#p1`. Distinct. But the runner sets `key` to the **basename** — so two genuinely DIFFERENT prints sharing a basename (the JM "same drawing at many paths" reality the cursor key intentionally collapses) would collide in the trainset dedup. Let me check whether that's a real risk.

### Assistant | 2026-06-08T18:03:45.293Z

[tool_use: Grep]

### User | 2026-06-08T18:03:47.766Z

[tool_result] 241:      const key = printCursorKey(entry);
274:          try { appendFileSync(trainsetPath, JSON.stringify({ key, page, part: trainsetRow.part, image: pageImage, n_models: trainsetRow.n_models, labels: trainable, source: "ensemble-distillation" }) + "\n"); }
278:          try { appendFileSync(queuePath, JSON.stringify({ key, page, part: trainsetRow.part, image: pageImage, reasons: activeLearning
... [+61 chars truncated]

### Assistant | 2026-06-08T18:03:53.965Z

[tool_use: Bash]

### User | 2026-06-08T18:03:58.500Z

[tool_result] REAL torn-line: size 2 (test asserts 2)
BROKEN impl (no try/catch) throws on torn line: true → test would catch the regression: true
REAL re-OCR after all done: todo.length 0 (test asserts 0)
BROKEN impl (ignores doneSet): todo.length 4 → test (asserts 0) catches it: true

### Assistant | 2026-06-08T18:04:06.653Z

Both R9 invariant probes confirmed mutation-sensitive (not tautological). Now the key wiring concern I flagged: the runner sets `key = printCursorKey(entry)` = **basename**. Let me verify the dedup-key collision risk between two genuinely-different prints that share a basename — this is the exact "JM stores one print at many paths, AND different prints can share a filename" reality.

### Assistant | 2026-06-08T18:04:11.305Z

[tool_use: Bash]

### User | 2026-06-08T18:04:15.276Z

[tool_result] Exit code 127
[rtk: batch file arguments are invalid]

### Assistant | 2026-06-08T18:04:18.536Z

RTK choked on the multiline. Let me run it plainly.

### Assistant | 2026-06-08T18:04:20.432Z

[tool_use: Bash]

### User | 2026-06-08T18:04:25.136Z

[tool_result] dedupA part.pdf#p0 dedupB part.pdf#p0 COLLIDE true

### Assistant | 2026-06-08T18:04:38.313Z

Confirmed a real collision: two genuinely-different prints sharing a basename (e.g. `custA/part.pdf` and `custB/part.pdf`) produce identical trainset dedup keys (`part.pdf#p0`), so last-wins drops one print's labels. Now I need to assess severity. The key question: does the worklist (from the manifest builder) carry full `disk_path`s where basename collisions across different prints are plausible in the JM corpus? Let me verify the image field carries the full path (which would distinguish them) but the dedup uses key+page first.

The crucial detail: `trainsetRowDedupKey` checks `key`+`page` FIRST, and only falls to `image` if key+page absent. Since the runner always writes both `key` and `page`, the full-path `image` (which WOULD distinguish custA from custB) is never consulted. Let me confirm the corpus realistically has cross-print basename collisions by sampling the documents.jsonl disk paths.

### Assistant | 2026-06-08T18:04:42.440Z

[tool_use: Bash]

### User | 2026-06-08T18:04:47.375Z

[tool_result] drawing-ish docs sampled: 7418 distinct basenames: 7142 cross-path-same-basename hits: 0

### Assistant | 2026-06-08T18:04:52.239Z

API Error: Server is temporarily limiting requests (not your usage limit) · Rate limited
