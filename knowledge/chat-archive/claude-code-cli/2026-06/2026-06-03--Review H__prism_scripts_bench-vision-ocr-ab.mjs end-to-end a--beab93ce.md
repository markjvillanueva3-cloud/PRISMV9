---
type: "chat-session"
source: "claude-code-cli"
session_id: "beab93ce-1457-474c-b6f8-bb8723757910"
title: "Review H:/prism/scripts/bench-vision-ocr-ab.mjs end-to-end as a content-speciali"
date: "2026-06-03"
first_ts: "2026-06-03T20:00:42.551Z"
last_ts: "2026-06-03T20:05:53.025Z"
cwd: "H:\\prism"
messages: 25
user_msgs: 10
assistant_msgs: 15
raw_file: "H:/.claude/projects/H--prism/beab93ce-1457-474c-b6f8-bb8723757910/subagents/agent-adfe3c4531427e604.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:25"
---

# Review H:/prism/scripts/bench-vision-ocr-ab.mjs end-to-end as a content-speciali

> **claude-code-cli** | 2026-06-03 | 25 msgs (10 user / 15 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/beab93ce-1457-474c-b6f8-bb8723757910/subagents/agent-adfe3c4531427e604.jsonl`

## Transcript

### User | 2026-06-03T20:00:42.551Z

Review H:/prism/scripts/bench-vision-ocr-ab.mjs end-to-end as a content-specialist (CLI orchestrator). It is a paired A/B blueprint-OCR benchmark: generates N synthetic prints once, runs each vision model over the SAME prints (warm-first), then produces an upgrade verdict via the pure core in H:/prism/scripts/lib/vision-ab-compare.mjs and a recommendation that plugs into H:/prism/scripts/lib/vision-model-select.mjs. It reuses generateSyntheticPrint/ocrPngWithModel/runModelOverPrints/summarizeModelRun/pairedF1Delta/determineWinner/buildUpgradeRecommendation from vision-ab-compare, and selectVisionModel/fetchAvailableVisionModels/probeTotalVramGB/isThinkingTrap from vision-model-select.

Read those two libs too so you can verify the call shapes are correct.

VERIFY (flag every P0/P1, grade PASS or FAIL):
1. CORRECTNESS of the orchestration flow: paired prints generated ONCE and reused for all models (fair comparison); warm-first actually warms before timed runModelOverPrints; paired data is supplied to determineWinner so the per-print win-rate gate is active; baseline always included; thinking-traps excluded; availability gate (only pulled models run).
2. CALL-SHAPE correctness against the reused libs: generateSyntheticPrint({seed,workDir,difficulty,python,gen}), ocrPngWithModel({png,model,workDir,seed,ollamaUrl,maxTimeSec}), runModelOverPrints({model,prints,ollamaUrl,maxTimeSec,onCase}), summarizeModelRun(run), pairedF1Delta(baselinePerPrintScores, candidatePerPrintScores), determineWinner(summaries,{baselineModel,marginF1,minWinRate,minCoverage,paired}), buildUpgradeRecommendation(verdict, selectVisionModel(...)). Are field names + arg order right?
3. R12 HONESTY: can a partial/failed run look clean? exit codes (0 ran / 2 nothing-ran / 3 setup-error) correct? Is the synthetic-capability caveat surfaced? If baseline isn't pulled does it fail loud?
4. EDGE CASES: 0 prints generated, only baseline runnable, ollama down (empty available[]), all OCR fails, --models with 
... [+291 chars truncated]

### Assistant | 2026-06-03T20:00:51.221Z

I'll review the orchestrator end-to-end against the two libs it reuses. Let me read all three files.

### Assistant | 2026-06-03T20:00:52.391Z

[tool_use: Read]

### Assistant | 2026-06-03T20:00:51.670Z

[tool_use: Read]

### Assistant | 2026-06-03T20:00:52.142Z

[tool_use: Read]

### User | 2026-06-03T20:01:15.345Z

[tool_result] 1	// scripts/lib/vision-ab-compare.mjs
2	//
3	// U-XRAY-VISION-AB — paired A/B comparison + upgrade verdict for blueprint-OCR
4	// vision models. THIS is the empirical gate that vision-model-select.mjs
5	// references in its header ("answered by the A/B benchmark bench-vision-ocr-ab.mjs,
6	// NOT by an assumed ranking baked in here") but which was never built. Without it,
7	// the Blackwell big-VR
... [+24682 chars truncated]

### User | 2026-06-03T20:01:17.107Z

[tool_result] 1	// scripts/lib/vision-model-select.mjs
2	//
3	// U-XRAY-VISION-PROFILE — profile/VRAM-aware vision-model selection for blueprint OCR.
4	//
5	// WHY THIS EXISTS
6	//   ollama-vision-extract-lib.mjs pins DEFAULT_VISION_MODEL = "qwen3-vl:8b-instruct"
7	//   because the old RTX 4080 SUPER (16GB) could not fit a larger vision model
8	//   GPU-resident alongside the chat fleet's coder offload (qwen2.5
... [+17610 chars truncated]

### User | 2026-06-03T20:01:17.464Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/bench-vision-ocr-ab.mjs
3	//
4	// U-XRAY-VISION-AB — paired A/B blueprint-OCR benchmark across vision models.
5	//
6	// THE GATE vision-model-select.mjs REFERENCES. It answers, with evidence on real
7	// prints, the question that file declares EMPIRICAL: does a bigger GPU-resident
8	// vision model (now affordable on the 96GB RTX 6000 Blackwell) actually beat the
... [+13276 chars truncated]

### Assistant | 2026-06-03T20:01:32.262Z

I have all three files. Let me verify the call shapes against the lib signatures carefully, checking each against the exact parameter names and arg order.

Let me also confirm the `summarizeModelRun` field that the orchestrator depends on (`s.coverage`, `s.maeMm`, `s.p95LatencyMs`, `s.ran`, `s.f1`, `s.recall`, `s.precision`) and the `cases`/`onCase` shapes.

Let me check `scoreDimensionSet` and `aggregateScores` output fields to verify the `cases` log line in the orchestrator (`c.recall`, `c.precision`, `c.mae_mm`) matches what `runModelOverPrints` puts into `cases`.

### Assistant | 2026-06-03T20:01:32.263Z

[tool_use: Read]

### Assistant | 2026-06-03T20:01:32.510Z

[tool_use: Glob]

### User | 2026-06-03T20:01:37.708Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\dimension-set-score.mjs' was already read 16m ago in this session and is unchanged (mtime 1780344911454). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-03T20:01:58.312Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-06-03T20:02:02.801Z

The dimension-set-score.mjs was already read in this session. Let me grep the specific functions to confirm field names, and verify the synthetic-print-gen.py CLI contract.

### Assistant | 2026-06-03T20:02:04.322Z

[tool_use: Grep]

### Assistant | 2026-06-03T20:02:05.533Z

[tool_use: Grep]

### User | 2026-06-03T20:02:26.603Z

[tool_result] 96:export function scoreDimensionSet(extracted, truth, opts = {}) {
97-  const typeAware = opts.typeAware === undefined ? DEFAULT_TYPE_AWARE : !!opts.typeAware;
98-  const exT = (Array.isArray(extracted) ? extracted : []).map((d) => ({ mm: dimToMm(d), type: dimType(d) })).filter((e) => e.mm !== null);
99-  const trT = (Array.isArray(truth) ? truth : []).map((d) => ({ mm: dimToMm(d), type: dimType(
... [+414 chars truncated]

### User | 2026-06-03T20:02:26.605Z

[tool_result] 6:// OCR read the print: precision / recall / F1 / mean-abs-error, plus the explicit
58:// OCR extraction would score matched=0 against typed ground truth — silently zeroing the training
91: * @returns {{precision:number|null, recall:number|null, f1:number|null,
92: *            mae_mm:number|null, matched:number, n_extracted:number, n_truth:number,
105:  // (truth [100,100.9] vs got [100.5,101.4]
... [+1685 chars truncated]

### Assistant | 2026-06-03T20:02:48.093Z

[tool_use: Bash]

### Assistant | 2026-06-03T20:02:46.857Z

I now have everything I need. The `scoreDimensionSet` output (`precision`, `recall`, `f1`, `mae_mm`, `matched`, `n_extracted`, `n_truth`) and `aggregateScores` output (`micro_f1`, `micro_recall`, `micro_precision`, `mean_mae_mm`) confirm the field names used downstream. Let me verify the synthetic-print-gen.py CLI contract since the orchestrator's prints carry `truth.title_block.part_number` and `truth.dimensions`, and the gen invokes `--out --seed --units in --difficulty`.

### User | 2026-06-03T20:03:28.295Z

[tool_result] 7:# truth, then emits the PNG plus a <png>.truth.json sidecar listing the true dims
13:# truth nominal_mm = inches * 25.4 so it lines up with the code-side inch->mm
129:    # (x25.4). Recorded in truth.gdt[]; the dimension scorer does NOT grade GD&T (orthogonal — for
150:    # bed scan does — the truth dims are unchanged; only the rendering is harder.
160:    truth = {"seed": seed, "units": "in", 
... [+653 chars truncated]

### Assistant | 2026-06-03T20:03:39.503Z

The python contract confirms: `--out --seed --units --difficulty` (matches the orchestrator's gen invocation in vision-ab-compare line 390), and the truth sidecar carries `title_block.part_number` + `dimensions` (matches `runModelOverPrints` line 451/455). The truth `units` is `"in"`, matching `parseVisionResponse(raw, {assumeUnits:"in"})`.

I now have full verification of every call shape and the data flow. Let me update the task and deliver the review.

### Assistant | 2026-06-03T20:03:39.505Z

[tool_use: TaskUpdate]

### User | 2026-06-03T20:04:27.839Z

[tool_result] Updated task #3 

### Assistant | 2026-06-03T20:05:53.025Z

# Code Quality Analysis Report — `bench-vision-ocr-ab.mjs`

## Summary
- Overall Quality Score: 9/10
- Files Analyzed: 4 (orchestrator + 2 reused libs + score/gen contract verification)
- Issues Found: 5 (0 P0, 1 P1, 4 P2/P3)
- Verdict: **PASS** — the orchestration is correct, the call shapes are right, and the R12 honesty seams hold. One P1 (a latency-bias hole in the design's own warm-first invariant) and a few P2/P3 polish items.

The CLI is a faithful, fair, paired A/B harness. Every claim in the header docstring is actually delivered by the code. Below I verify each of the 5 axes you named, then list concrete findings.

---

## Axis 1 — Orchestration flow CORRECTNESS: PASS

- **Paired prints generated ONCE and reused** — confirmed. The `prints[]` array is built once in step 3 (`bench:165-172`) and the same array object is passed to `runModelOverPrints` for every model in the step-4 loop (`bench:189-190`). Same seeds → byte-identical PNGs → genuine within-subjects design. ✔
- **Warm-first actually warms before the timed run** — confirmed. The throwaway `ocrPngWithModel` call (`bench:185`) precedes `runModelOverPrints` (`bench:189`) inside the same per-model iteration, and the warm call's latency is discarded (logged, not pushed into any list). ✔ (But see P1 below — it only warms ONE of two cold paths.)
- **Paired data supplied → per-print win-rate gate active** — confirmed. `paired[r.model] = pairedF1Delta(baselineRun.perPrintScores, r.perPrintScores)` (`bench:203`) is built for every non-baseline run and passed as `opts.paired` into `determineWinner` (`bench:210`). In the lib, `beatsPaired` then becomes load-bearing (`vision-ab-compare:271`). ✔
- **Baseline always included** — confirmed at two layers: `resolveModels` unshifts the baseline if absent (`bench:121`), and a hard FATAL exit(3) fires if the baseline isn't pulled (`bench:153-156`). ✔
- **Thinking-traps excluded** — confirmed. `resolveModels` drops any `isThinkingTrap(m)` tag with a logged note (`bench:
... [+10859 chars truncated]
