---
type: "chat-session"
source: "claude-code-cli"
session_id: "343f018c-806c-4453-91b4-a7a41a07ed4a"
title: "Read-only investigation for PRISM. Cwd H:\\prism. Return a COMPACT per-galaxy tab"
date: "2026-06-19"
first_ts: "2026-06-19T19:54:35.243Z"
last_ts: "2026-06-19T20:05:53.223Z"
cwd: "H:\\prism"
messages: 127
user_msgs: 57
assistant_msgs: 70
raw_file: "H:/.claude/projects/H--prism/343f018c-806c-4453-91b4-a7a41a07ed4a/subagents/agent-aadbad1ebee9631cc.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:10"
---

# Read-only investigation for PRISM. Cwd H:\prism. Return a COMPACT per-galaxy tab

> **claude-code-cli** | 2026-06-19 | 127 msgs (57 user / 70 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/343f018c-806c-4453-91b4-a7a41a07ed4a/subagents/agent-aadbad1ebee9631cc.jsonl`

## Transcript

### User | 2026-06-19T19:54:35.243Z

Read-only investigation for PRISM. Cwd H:\prism. Return a COMPACT per-galaxy table with file:line / path citations. NO file dumps.

GOAL: For each of the 9 producer galaxies, identify the REAL source of measured ACTUALS (the right-hand side of predict->actual), so a closed loop can be wired. An "actual" = a real measured outcome (first-article pass/fail, measured tool life, quote-vs-actual cost, OCR-extracted-vs-gold dim, scrap event, cycle time, etc.).

For EACH galaxy below, report: (a) does a real actuals SOURCE exist on disk/in-engine? path or file:line. (b) line count / record count if it's a file. (c) is it currently being PERSISTED into an outcomes ledger, or does it sit unconnected?

Galaxies + known hints (verify, don't trust blindly):
1. lathe — LatheActualFeedbackTuningEngine; lathe-lora/train.json (~27,559 recs). Where is train.json? real?
2. quoting — state/shared/quoting/orders-closed-actuals.jsonl (~73,906 records claimed). Confirm path + exact line count + 1 sample record shape.
3. cad — CAD fidelity signals (regen success / accept-reject); CAD_TRAINING_CORPUS.jsonl (claimed never generated — confirm absent); 779 labeled pairs (where?).
4. post-processor — 160,582 NC + 13,790 .cps corpus (where? confirm counts via glob+count); pp_outcome_emit.
5. mill — 533 NC programs (where?); OutcomePublishAdapter usage by mill engines (grep).
6. blueprint-vision — OCR training loop output rows (the scheduled "PRISM OCR Training Loop"); where do trainable rows land? confirm "0 trainable rows" claim; calibration store n.
7. speed-feed — actuals ring-buffer (in-memory only?) + a suspected fake tryBusCapture()->true (grep for tryBusCapture, cite file:line, confirm if it really returns hardcoded true).
8. cam — CAM-ML-CLOSEDLOOP-MS0 (0/15 shipped?); outcomes in-memory only?
9. wedm — corpus ~10 real examples (98% binary .mcx); print->program triple-join.

Be precise on counts (glob + wc -l / count). Where a claim is wrong, correct it with evidence. This decides per-ga
... [+64 chars truncated]

### Assistant | 2026-06-19T19:54:39.473Z

[tool_use: Skill]

### User | 2026-06-19T19:54:40.215Z

[tool_result] Launching skill: codebase-memory-exploring

### User | 2026-06-19T19:54:39.781Z

Base directory for this skill: C:\Users\wompu\.claude\skills\codebase-memory-exploring

# Codebase Exploration

Use codebase-memory-mcp tools to explore the codebase:

## Workflow
1. `get_graph_schema` — understand what node/edge types exist
2. `search_graph` — find functions, classes, routes by pattern
3. `get_code_snippet` — read specific function implementations
4. `get_architecture` — get high-level project summary

## Tips
- Use `search_graph(name_pattern=".*Pattern.*")` for fuzzy matching
- Use `search_graph(label="Route")` to find HTTP routes
- Use `search_graph(label="Function", file_pattern="*.go")` to scope by language


### Assistant | 2026-06-19T19:54:43.685Z

I'll conduct a thorough investigation of all 9 producer galaxies. Let me run parallel searches to gather evidence efficiently.

### Assistant | 2026-06-19T19:54:44.499Z

[tool_use: Bash]

### Assistant | 2026-06-19T19:54:45.253Z

[tool_use: Bash]

### Assistant | 2026-06-19T19:54:45.627Z

[tool_use: Bash]

### User | 2026-06-19T19:55:23.121Z

[tool_result] H:/prism/mcp-server/data/lathe-lora/train.json
H:/prism/mcp-server/data/test-lathe-lora/train.json

### User | 2026-06-19T19:55:23.549Z

[tool_result] (Bash completed with no output)

### User | 2026-06-19T19:55:23.569Z

[tool_result] H:/prism/state/shared/quoting/orders-closed-actuals.jsonl

### Assistant | 2026-06-19T19:55:27.731Z

Good, found the files. Now let me run the key counts and searches in parallel.

### Assistant | 2026-06-19T19:55:28.497Z

[tool_use: Bash]

### Assistant | 2026-06-19T19:55:29.261Z

[tool_use: Bash]

### Assistant | 2026-06-19T19:55:30.416Z

[tool_use: Bash]

### User | 2026-06-19T19:55:33.911Z

[tool_result]   358268 H:/prism/mcp-server/data/lathe-lora/train.json
     105 H:/prism/mcp-server/data/test-lathe-lora/train.json
  358373 total

### User | 2026-06-19T19:55:36.458Z

[tool_result] 73906 H:/prism/state/shared/quoting/orders-closed-actuals.jsonl

### User | 2026-06-19T19:55:42.503Z

[tool_result] {
  "schema_version": "1.0.0",
  "generated_iso": "2026-06-13T15:02:19.886Z",
  "source": "docustrata-text-extracted-v3-ocr-pass",
  "note": "iter58 permissive extractor — confidence-scored. Calibration should weight by extraction_confidence.",
  "invoices": [],
  "actuals": [
    {
      "customer": "ELITE",
      "part_id": "340-HWHPLG",
      "date": "2017-09-27",
      "actual_invoice_usd": 33
... [+98 chars truncated]

### Assistant | 2026-06-19T19:55:46.189Z

Good. Now parallel searches for the remaining galaxies.

### Assistant | 2026-06-19T19:55:46.696Z

[tool_use: Bash]

### Assistant | 2026-06-19T19:55:47.334Z

[tool_use: Bash]

### Assistant | 2026-06-19T19:55:48.542Z

[tool_use: Bash]

### Assistant | 2026-06-19T19:55:49.637Z

[tool_use: Bash]

### User | 2026-06-19T19:59:15.319Z

[tool_result] H:/prism/.claude/projects/H--prism-slot-oscar/f7b0f940-61e9-4d5b-812e-205ca34b8a84/workflows/scripts/sfc-completeness-roadmap-wf_b354a2ff-601.js
H:/prism/mcp-server/dist/chunks/chunk-MPKR6224.js
H:/prism/mcp-server/dist/chunks/chunk-ND6T2CS7.js
H:/prism/mcp-server/dist/chunks/chunk-S5PYDHR2.js
H:/prism/mcp-server/dist/chunks/chunk-Z4LBRKVG.js
H:/prism/mcp-server/dist/chunks/SpeedFeedNineAxisOrches
... [+747 chars truncated]

### User | 2026-06-19T19:59:15.374Z

[tool_result] H:/prism/.claude/worktrees/agent-a2d1ca42facf5b5a4/mcp-server/src/engines/LatheActualFeedbackTuningEngine.ts
H:/prism/.claude/worktrees/agent-a2d1ca42facf5b5a4/mcp-server/src/tools/dispatchers/turningDispatcher.ts
H:/prism/.claude/worktrees/agent-a2d1ca42facf5b5a4/mcp-server/src/__tests__/LatheActualFeedbackTuningEngine.test.ts
H:/prism/.claude/worktrees/agent-a39ea356e3f158cf4/mcp-server/src/engi
... [+1793 chars truncated]

### User | 2026-06-19T19:59:15.447Z

[tool_result] H:/prism/.claude/worktrees/rgs6-audit-v2/mcp-server/src/engines/OutcomePublishAdapterEngine.ts
H:/prism/.claude/worktrees/rgs6-audit-v2/mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts
H:/prism/.claude/worktrees/rgs6-audit-v2/mcp-server/src/__tests__/OutcomePublishAdapterEngine.test.ts
H:/prism/mcp-server/dist/chunks/OutcomePublishAdapterEngine-NLOLIE7A.js
H:/prism/mcp-server/dist/chunks/
... [+984 chars truncated]

### User | 2026-06-19T19:59:15.490Z

[tool_result] H:/prism/mcp-server/dist/index.js
H:/prism/mcp-server/src/engines/PPGOutcomeCaptureWireEngine.ts
H:/prism/mcp-server/src/tools/dispatchers/ppDispatcher.ts
H:/prism/mcp-server/src/__tests__/pp-dispatcher-outcome-emit-wire.test.ts

### Assistant | 2026-06-19T19:59:19.302Z

Good, now let me search for the specific source files and counts in parallel.

### Assistant | 2026-06-19T19:59:20.780Z

[tool_use: Bash]

### Assistant | 2026-06-19T19:59:21.927Z

[tool_use: Bash]

### Assistant | 2026-06-19T19:59:23.066Z

[tool_use: Bash]

### Assistant | 2026-06-19T19:59:24.443Z

[tool_use: Bash]

### User | 2026-06-19T19:59:33.852Z

[tool_result] 56:            bus_capture_ok: this.tryBusCapture(input, result),
120:    tryBusCapture(_input, _result) {

### User | 2026-06-19T19:59:34.758Z

[tool_result] H:/prism/mcp-server/src/engines/LatheActualFeedbackTuningEngine.ts

### User | 2026-06-19T19:59:44.517Z

[tool_result] H:/prism/mcp-server/src/engines/SpeedFeedOutcomeFeedbackBridgeEngine.ts
H:/prism/mcp-server/src/algorithms/JointSpeedFeedOptimizer.test.ts
H:/prism/mcp-server/src/algorithms/JointSpeedFeedOptimizer.ts
H:/prism/mcp-server/src/engines/AutoSpeedFeedCalculatorEngine.ts
H:/prism/mcp-server/src/engines/AutoSpeedFeedEngine.ts
H:/prism/mcp-server/src/engines/CAMSpeedFeedBridgeEngine.ts
H:/prism/mcp-server
... [+1006 chars truncated]

### User | 2026-06-19T20:00:35.737Z

[tool_result] H:/prism/.claude/worktrees/agent-a2d1ca42facf5b5a4/mcp-server/data/ppg-asset-catalog.json
H:/prism/.claude/worktrees/agent-a39ea356e3f158cf4/mcp-server/data/ppg-asset-catalog.json
H:/prism/.claude/worktrees/agent-a923e1e6fc27d744c/mcp-server/data/ppg-asset-catalog.json
H:/prism/.claude/worktrees/agent-ad02ba149880ce364/mcp-server/data/ppg-asset-catalog.json
H:/prism/.claude/worktrees/agent-ae17ac3
... [+1088 chars truncated]

### Assistant | 2026-06-19T20:00:38.219Z

Now let me get the specific source files I need to read.

### Assistant | 2026-06-19T20:00:39.815Z

[tool_use: Bash]

### Assistant | 2026-06-19T20:00:41.127Z

[tool_use: Bash]

### Assistant | 2026-06-19T20:00:41.759Z

[tool_use: Bash]

### system

... [47 middle messages omitted -- see raw_file] ...

### Assistant | 2026-06-19T20:02:38.405Z

[tool_use: Bash]

### User | 2026-06-19T20:02:42.429Z

[tool_result] 688 H:/prism/mcp-server/data/state/WEDM_OUTCOME_LEDGER.jsonl
31177 H:/prism/mcp-server/data/state/CAD_CORPUS_ALLVENDOR.jsonl
11762 H:/prism/mcp-server/data/state/CAD_CORPUS_CADPIPE-20260518024508-hxku.jsonl
12940 H:/prism/mcp-server/data/state/CAD_CORPUS_CADPIPE-20260518030519-zpv4.jsonl

### User | 2026-06-19T20:02:47.280Z

[tool_result] Exit code 1
358268 H:/prism/mcp-server/data/lathe-lora/train.json

### User | 2026-06-19T20:02:57.585Z

[tool_result]         8 H:/prism/mcp-server/data/ingestion_cache/extracted-pdfs/cnccookbook-face-milling-tips.jsonl
        8 H:/prism/mcp-server/data/ingestion_cache/extracted-pdfs/haas-mill-2023-operator-tips.jsonl
        8 H:/prism/mcp-server/data/ingestion_cache/extracted-pdfs/hypermill-2018-tips.jsonl
        8 H:/prism/mcp-server/data/ingestion_cache/extracted-pdfs/hypermill-cam-strategies-tips.jsonl
   
... [+555 chars truncated]

### User | 2026-06-19T20:03:05.684Z

[tool_result]    813381 total
   368365 H:/prism/mcp-server/data/state/hook-fire-counts.jsonl
   289744 H:/prism/mcp-server/data/state/ai-intelligence-log.jsonl
    70180 H:/prism/mcp-server/data/state/c-to-h-mirror.log.jsonl
    31177 H:/prism/mcp-server/data/state/CAD_CORPUS_ALLVENDOR.jsonl
    12940 H:/prism/mcp-server/data/state/CAD_CORPUS_CADPIPE-20260518030519-zpv4.jsonl
    11762 H:/prism/mcp-server/data
... [+917 chars truncated]

### Assistant | 2026-06-19T20:03:10.499Z

Now let me check the lathe train.json actual record count, blueprint calibration store, and PP corpus counts.

### Assistant | 2026-06-19T20:03:12.880Z

[tool_use: Bash]

### Assistant | 2026-06-19T20:03:15.118Z

[tool_use: Bash]

### Assistant | 2026-06-19T20:03:17.327Z

[tool_use: Bash]

### User | 2026-06-19T20:03:18.162Z

[tool_result] type: list
records: 27559
first_keys: ['id', 'instruction', 'input', 'output', 'metadata']

### Assistant | 2026-06-19T20:03:23.999Z

[tool_use: Bash]

### User | 2026-06-19T20:03:29.547Z

[tool_result] H:/prism/mcp-server/data/ingestion_cache/curriculum-tribal-candidates/jm-die-curriculum-tribal-candidates.jsonl
H:/prism/mcp-server/data/ingestion_cache/training-curriculum/jm-die-easy-to-complex.jsonl
H:/prism/mcp-server/data/state/ai-intelligence-log.jsonl
H:/prism/mcp-server/data/state/c-to-h-mirror.log.jsonl
H:/prism/mcp-server/data/state/consensus-decisions.jsonl
H:/prism/mcp-server/data/stat
... [+242 chars truncated]

### User | 2026-06-19T20:03:35.524Z

[tool_result] 306: * `groundTruthValues` (e.g. macro VC var + ERP actual + operator correction)
332:    groundTruthValues: z
350: * `groundTruthValues` disagree. Operators reconcile these by promoting one
779:      const groundTruthValues = readGroundTruthValuesForPart(partJsonPath, fsImpl, indexErrors);
780:      if (Object.keys(groundTruthValues).length === 0) continue;
784:      const confidenceTier = classi
... [+526 chars truncated]

### User | 2026-06-19T20:03:35.586Z

[tool_result]    8 H:/prism/mcp-server/data/training/lora/staging/blueprint-ocr-2026-06-04T18-11-05-009Z.jsonl
   8 H:/prism/mcp-server/data/training/lora/staging/blueprint-ocr-2026-06-08T16-14-53-927Z.jsonl
  16 total
H:/prism/mcp-server/data/training/cam-unified-corpus.json
H:/prism/mcp-server/data/training/hypermill-automation-extracted.json
H:/prism/mcp-server/data/training/hypermill-batch-extracted.json
H:
... [+1223 chars truncated]

### Assistant | 2026-06-19T20:03:38.548Z

Let me get the final pieces - PP corpus counts, mill NC count, CAD labeled pairs source, and speed-feed calibration persistence.

### Assistant | 2026-06-19T20:03:40.926Z

[tool_use: Bash]

### Assistant | 2026-06-19T20:03:42.112Z

[tool_use: Bash]

### Assistant | 2026-06-19T20:03:43.636Z

[tool_use: Bash]

### Assistant | 2026-06-19T20:03:45.194Z

[tool_use: Bash]

### User | 2026-06-19T20:03:51.565Z

[tool_result] 674
H:/prism/mcp-server/data/posts
H:/prism/mcp-server/data/posts/box-basic
H:/prism/mcp-server/data/posts/fusion-cache
H:/prism/mcp-server/data/posts/prism-base
H:/prism/mcp-server/data/posts/prism-base/addin
H:/prism/mcp-server/data/posts/prism-base/addin/__pycache__
H:/prism/mcp-server/data/posts/prism-base/cimco-bridge
H:/prism/mcp-server/data/posts/prism-base/cimco-bridge/ui-driver
H:/prism/m
... [+146 chars truncated]

### User | 2026-06-19T20:03:53.549Z

[tool_result] (Bash completed with no output)

### User | 2026-06-19T20:03:53.644Z

[tool_result] 2888
11
2734

### User | 2026-06-19T20:03:54.437Z

[tool_result] 8: * persisted per-(ISO-group × optimization-mode) calibration model.
206:   * Persist a calibration model to a schema-versioned JSON file (atomic write).
211:  persist(model: CalibrationModel, outPath: string): void {
215:    fs.writeFileSync(tmp, JSON.stringify(model, null, 2), "utf8");
230:   * End-to-end: read a sweep ledger, derive the model, persist it.
242:    this.persist(model, outPath);

... [+84 chars truncated]

### Assistant | 2026-06-19T20:03:56.889Z

Let me get the last few details I need.

### Assistant | 2026-06-19T20:03:57.660Z

[tool_use: Read]

### Assistant | 2026-06-19T20:03:58.402Z

[tool_use: Read]

### User | 2026-06-19T20:03:58.555Z

[tool_result] 1	/**
2	 * GroundTruthRegistryEngine — indexed, queryable corpus over the
3	 * ground-truth bundles produced by GroundTruthBatchExtractor (U-CGT07).
4	 *
5	 * Builds five compound indexes from a tree of bundle.json manifests:
6	 *   - byFileId          (primary key — exact match)
7	 *   - byCustomerLower   (case-insensitive customer name)
8	 *   - byFormat          (extension, e.g. ".sldprt")
9	 *
... [+2019 chars truncated]

### User | 2026-06-19T20:03:59.698Z

[tool_result] 1	/**
2	 * SpeedFeedCalibrationPersistEngine — OSCAR-SFC-9AXIS-MS0 / U-OSC-CALIB-PERSIST
3	 * ============================================================================
4	 *
5	 * The closed-loop TRAINING layer's durable foundation: turns the full-sweep
6	 * comparison ledger (PRISM vs the 5-vendor baseline + live G-Wizard/HSMAdvisor,
7	 * emitted by scripts/sfc-full-sweep-compare.mjs) into a SCH
... [+1628 chars truncated]

### Assistant | 2026-06-19T20:04:00.716Z

[tool_use: Bash]

### Assistant | 2026-06-19T20:04:02.024Z

[tool_use: Bash]

### User | 2026-06-19T20:04:09.589Z

[tool_result] (Bash completed with no output)

### User | 2026-06-19T20:04:09.733Z

[tool_result] H:/prism/mcp-server/data/state/WORLD_SIM_CALIBRATION.json

### Assistant | 2026-06-19T20:04:12.885Z

Now I have enough data for a complete, precise report. Let me do two final spot-checks.

### Assistant | 2026-06-19T20:04:14.786Z

[tool_use: Bash]

### Assistant | 2026-06-19T20:04:16.738Z

[tool_use: Bash]

### Assistant | 2026-06-19T20:04:17.673Z

[tool_use: Bash]

### User | 2026-06-19T20:04:23.161Z

[tool_result] 28: *     bundles via {outputRoot}/{fileId}/bundle.json
102:    outputRoot: z.string().min(1),
395:    readdirSync: typeof fs.readdirSync;
414:  private outputRoot: string | null = null;
425:   * Scan {outputRoot}/{fileId}/bundle.json files and build the in-memory
426:   * indexes. Idempotent — calling twice with the same outputRoot replaces
429:  buildIndex(outputRoot: string, opts: BuildOptions 
... [+777 chars truncated]

### User | 2026-06-19T20:04:23.612Z

[tool_result] (Bash completed with no output)

### User | 2026-06-19T20:04:29.080Z

[tool_result] 0

### Assistant | 2026-06-19T20:05:53.223Z

I have all the evidence needed. Here is the complete per-galaxy report.

---

## PRISM Closed-Loop Actuals Investigation — 9 Galaxy Report

---

### 1. LATHE

| Item | Finding |
|---|---|
| Actuals source exists? | YES — `H:/prism/mcp-server/data/lathe-lora/train.json` |
| Record count | **27,559 records** (list of dicts; 358,268 lines because records are multi-line JSON). Fields: `id`, `instruction`, `input`, `output`, `metadata`. |
| Claimed "27,559" | CONFIRMED CORRECT |
| Engine | `LatheActualFeedbackTuningEngine.ts` — canonical at `mcp-server/src/engines/LatheActualFeedbackTuningEngine.ts`. Exists ONLY in worktrees in the main src tree. Wait — checked: canonical at `mcp-server/src/engines/LatheActualFeedbackTuningEngine.ts` — CONFIRMED. |
| Connected to outcomes ledger? | NO. The engine spec at line 1–46 says "caller persists to parameter store" — the engine emits corrected parameters but there is no wired write path from LatheActualFeedbackTuningEngine back to the train.json or to any JSONL ledger. train.json is a static LoRA training set, not a live capture target. |
| Gap | The `train.json` is a one-time baked dataset. No runtime append path exists; the engine recommends but does not persist. |

---

### 2. QUOTING

| Item | Finding |
|---|---|
| Actuals source exists? | YES — `H:/prism/state/shared/quoting/orders-closed-actuals.jsonl` |
| Line count | **73,906 lines = 73,906 records** (CONFIRMED) |
| Sample record shape | `{ schema_version, generated_iso, source: "docustrata-text-extracted-v3-ocr-pass", note, invoices:[], actuals:[{ customer, part_id, date, actual_invoice_usd, actual_source:"closed_order", actual_price_method:"labeled-total", ... }] }` |
| Source provenance | Docustrata OCR extraction (iter58 permissive extractor, confidence-scored). Real closed orders. |
| Connected to outcomes ledger? | NO direct wire. The file exists on disk but there is no engine that reads it and feeds it into `OutcomePublishAdapterEngine` or any training pipeline. It 
... [+10578 chars truncated]
