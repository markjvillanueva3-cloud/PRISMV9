---
type: "chat-session"
source: "claude-code-cli"
session_id: "54a75f3b-6a1a-45fa-9e6f-d10e71cf0be6"
title: "Read-and-report (plain prose, NO JSON). Map the xray↔india LoRA SEAM in H:/prism"
date: "2026-06-04"
first_ts: "2026-06-04T17:55:24.447Z"
last_ts: "2026-06-04T17:57:42.253Z"
cwd: "H:\\prism"
messages: 10
user_msgs: 4
assistant_msgs: 6
raw_file: "H:/.claude/projects/H--prism/54a75f3b-6a1a-45fa-9e6f-d10e71cf0be6/subagents/workflows/wf_2ac1be26-d2f/agent-a273e256a5fae4648.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:12"
---

# Read-and-report (plain prose, NO JSON). Map the xray↔india LoRA SEAM in H:/prism

> **claude-code-cli** | 2026-06-04 | 10 msgs (4 user / 6 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/54a75f3b-6a1a-45fa-9e6f-d10e71cf0be6/subagents/workflows/wf_2ac1be26-d2f/agent-a273e256a5fae4648.jsonl`

## Transcript

### User | 2026-06-04T17:55:24.447Z

Read-and-report (plain prose, NO JSON). Map the xray↔india LoRA SEAM in H:/prism.
Read mcp-server/src/engines/BlueprintLoRABridgeEngine.ts FULLY and the blueprint_lora_* cases in mcp-server/src/tools/dispatchers/cadDispatcher.ts (blueprint_lora_prepare_set, blueprint_lora_export, blueprint_lora_register_endpoint, blueprint_lora_history — around lines 244-245 + 3251-3290).
REPORT EXACTLY:
1. What input does blueprint_lora_prepare_set expect (precomputedPairs[] shape, confidenceTier)? What does it OUTPUT (a LoRA dataset — in what format/path)?
2. blueprint_lora_export: what providers/formats does it emit, to what outputPath, what is the bundle shape?
3. Does the bridge expect (image, dims) VISION pairs or text pairs? Is it REAL (does work) or a stub/placeholder?
4. CRITICAL: my new trainset is state/shared/ocr-training-loop/trainset.jsonl with rows {part, image, n_models, labels:[{type,value_mm,corroboration,n_models,agreement_fraction,tier,expected_accuracy,trainable}], source:"ensemble-distillation"}. How would THIS map onto blueprint_lora_prepare_set's expected precomputedPairs input? Name the exact field mapping + any gap.
Be concrete with line numbers + verbatim field names. Flag anything that is a stub.

### Assistant | 2026-06-04T17:55:50.110Z

I'll read the bridge engine and the dispatcher cases to map this seam concretely.

### Assistant | 2026-06-04T17:55:51.337Z

[tool_use: Read]

### Assistant | 2026-06-04T17:55:51.678Z

[tool_use: Read]

### User | 2026-06-04T17:56:02.979Z

[tool_result] 1	/**
2	 * BlueprintLoRABridgeEngine — BLUEPRINT-OCR-TRAINING-MS1/U-MS1-U8
3	 *
4	 * LoRA export bundle producer. Selects ground-truth training pairs from the
5	 * GroundTruthRegistryEngine + anonymizes (scrubs customer names, part numbers,
6	 * program content per [[feedback_no_public_h_drive]]) + formats per the target
7	 * fine-tune provider's spec + writes a sealed bundle.
8	 *
9	 * HARD RULE 
... [+13765 chars truncated]

### User | 2026-06-04T17:56:03.615Z

[tool_result] 3230	            const data = blueprintExtractionRAGEngine.explain(
3231	              params as Parameters<typeof blueprintExtractionRAGEngine.explain>[0],
3232	            );
3233	            result = { success: true, data };
3234	            break;
3235	          }
3236	          case "blueprint_rag_compare_to_baseline": {
3237	            if (!params.ragExtraction || !Array.isArray(params.base
... [+6789 chars truncated]

### Assistant | 2026-06-04T17:56:11.254Z

I have everything I need. The bridge engine read fully (343 lines) and the dispatcher cases (3251-3343). Let me confirm the action enum registration around line 244-245.

### Assistant | 2026-06-04T17:56:12.287Z

[tool_use: Read]

### User | 2026-06-04T17:56:31.816Z

[tool_result] 238	  // BLUEPRINT-OCR-TRAINING-MS1/U-MS1-U6 — BlueprintCorpusHarvestEngine
239	  "corpus_harvest_mit", "corpus_harvest_vendor", "corpus_harvest_online",
240	  "corpus_enumerate", "corpus_verify_fresh", "corpus_build_index",
241	  // BLUEPRINT-OCR-TRAINING-MS1/U-MS1-U7 — BlueprintExtractionRAGEngine (centerpiece)
242	  "blueprint_rag_extract", "blueprint_rag_explain", "blueprint_rag_compare_to_bas
... [+991 chars truncated]

### Assistant | 2026-06-04T17:57:42.253Z

Map complete. Here is the xray↔india LoRA SEAM report.

## xray↔india LoRA SEAM — `BlueprintLoRABridgeEngine`

Engine: `H:/prism/mcp-server/src/engines/BlueprintLoRABridgeEngine.ts` (343 lines, real impl, milestone BLUEPRINT-OCR-TRAINING-MS1/U-MS1-U8). Dispatcher: `prism_cad` via `cadDispatcher.ts`, action enum at lines 244-245, case bodies at 3251-3301.

### 1. `blueprint_lora_prepare_set` — input/output

**Input (dispatcher, lines 3251-3265):** requires `confidenceTier` (string) AND `precomputedPairs[]` (array; else `dispatcherError`). Optional `sizeCap` (number). The dispatcher wraps `precomputedPairs` into the engine's injected loader: `io: { loadTrainingPairs: async () => params.precomputedPairs }` (line 3262). So `precomputedPairs[]` IS the training-pair feed.

**Expected pair shape** — `LoRATrainingPair` (engine lines 34-43), every field a `string` except none numeric:
- `pairId: string`
- `customer: string`
- `partNumber: string`
- `pdfPath: string`
- `extractionType: string`
- `groundTruthValue: string`
- `context: string` (free-text — "sources cited, etc.")

**`confidenceTier`** must be one of `LORA_CONFIDENCE_TIERS` (line 31): `"operator_verified" | "ensemble_consensus" | "single_backend"`. Invalid → engine throws (line 132-134).

**Output** — a `TrainingSetSelection` (lines 85-90), NOT a file. In-memory only:
```
{ setId, pairs: LoRATrainingPair[] (anonymized), confidenceTier, anonymized: true }
```
`setId` format = `set:<confidenceTier>:<Date.now()>:<pairCount>` (line 157). It stamps the selection into an in-memory `Map` (line 164) keyed by `setId`. NO file is written by `prepare_set` — anonymization runs here (customer→`ANON-CUSTOMER`, partNumber→`ANON-PN`, path/context scrubbed; lines 148-156), and `anonymize` is FORCED true regardless of the input flag (lines 145-147, 122-124). File emission is `export`'s job.

### 2. `blueprint_lora_export` — providers/format/path/bundle

**Input (dispatcher, lines 3267-3279):** requires `setId` + `provider` + `outp
... [+7018 chars truncated]
