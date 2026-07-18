---
type: "chat-session"
source: "claude-code-cli"
session_id: "6a8a0fc5-4275-43b0-b847-449c590c706b"
title: "Review the consumer-wiring half (files 2 + 3) of PRISM unit U-XRAY-GDT-LABEL-TIE"
date: "2026-06-23"
first_ts: "2026-06-23T08:28:05.913Z"
last_ts: "2026-06-23T08:29:18.924Z"
cwd: "H:\\prism"
messages: 22
user_msgs: 9
assistant_msgs: 13
raw_file: "H:/.claude/projects/H--prism/6a8a0fc5-4275-43b0-b847-449c590c706b/subagents/agent-a05b9ba086cb077fd.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:14"
---

# Review the consumer-wiring half (files 2 + 3) of PRISM unit U-XRAY-GDT-LABEL-TIE

> **claude-code-cli** | 2026-06-23 | 22 msgs (9 user / 13 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/6a8a0fc5-4275-43b0-b847-449c590c706b/subagents/agent-a05b9ba086cb077fd.jsonl`

## Transcript

### User | 2026-06-23T08:28:05.913Z

Review the consumer-wiring half (files 2 + 3) of PRISM unit U-XRAY-GDT-LABEL-TIER. Arm A — holistic correctness + does it reach the destination without orphaning or breaking back-compat.

FILE 2 (runner): H:\prism\scripts\blueprint-ocr-training-loop.mjs
FILE 3 (LoRA pair builder): H:\prism\scripts\lib\trainset-to-lora-pairs.mjs  (+ test H:\prism\scripts\lib\trainset-to-lora-pairs.test.mjs)

WHAT CHANGED:
- File 1 (already PASS) made buildTrainsetRow emit trainable `gdt_labels` (each with fcf_text, tier, trainable, corroboration metadata).
- File 2 runner: computes `trainableGdt = (trainsetRow.gdt_labels||[]).filter(l=>l.trainable)`, writes `gdt_labels: trainableGdt` into the trainset JSONL row, appends the row when `trainable.length>0 OR trainableGdt.length>0` (was dim-trainable only), accumulates `trainableGdtTotal`, and adds `this_run_trainable_gdt_labels` to the report.
- File 3 pair builder: `trainsetRowToPairs` no longer early-returns when `labels` is absent but `gdt_labels` present; the dim loop guards `Array.isArray(row.labels)`; a new loop emits a `{extractionType:"gdt", groundTruthValue: fcf_text, context:...}` pair per trainable gdt_label with non-empty fcf_text.

VERIFY (PASS/FAIL + P0/P1/P2 + file:line):
1. BACK-COMPAT: existing dim-only rows produce identical pairs as before; existing edge-case tests ({}, {labels:"nope"}, no-value) still return []. The runner's dim-only behavior is unchanged when there are no gdt_labels.
2. NO ORPHAN: the gdt_labels persisted by the runner are actually consumed by the pair builder (the destination). Confirm the JSONL row key name `gdt_labels` matches what the pair builder reads.
3. RUNNER CORRECTNESS: appending the row for gdt-only pages (trainable dims=0 but trainable gdt>0) is correct and does not break the cursor/reaper-survivable append invariants or printTrainable/anyPageOk logic. groundTruthValue is always a string.
4. pairId uniqueness: gdt pairs (`:gdt:${gi}`) cannot collide with dim pairs (`:${type}:${i}`).
5. 
... [+266 chars truncated]

### Assistant | 2026-06-23T08:28:13.943Z

I'll review the consumer-wiring half of U-XRAY-GDT-LABEL-TIER. Let me read all three files end-to-end.

### Assistant | 2026-06-23T08:28:14.510Z

[tool_use: Read]

### Assistant | 2026-06-23T08:28:14.870Z

[tool_use: Read]

### Assistant | 2026-06-23T08:28:15.250Z

[tool_use: Read]

### User | 2026-06-23T08:28:16.380Z

[tool_result] 1	// scripts/lib/trainset-to-lora-pairs.mjs
2	//
3	// U-XRAY-BLUEPRINT-LORA-STAGE — pure adapter: closed-loop OCR trainset rows → the
4	// BlueprintLoRABridgeEngine's LoRATrainingPair[] contract (the xray→india LoRA seam).
5	//
6	// This is the ONLY genuinely-new code in the staging unit: the bridge CONSUMES LoRATrainingPair[]
7	// (anonymize → per-provider serialize → staging-gated export) but do
... [+5296 chars truncated]

### User | 2026-06-23T08:28:16.390Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/blueprint-ocr-training-loop.mjs
3	//
4	// U-XRAY-OCR-TRAINING-LOOP — the closed-loop OCR training-data engine (runner).
5	//
6	// Trains the print-READING stage TODAY, without delta's CAD-gen. Three phases:
7	//   1. CALIBRATE — generate perfect-GT synthetic prints (mixed difficulty) → multi-VLM ensemble →
8	//      measure P(consensus dim CORRECT | corroboration
... [+37194 chars truncated]

### User | 2026-06-23T08:28:16.659Z

[tool_result] 1	// scripts/lib/trainset-to-lora-pairs.test.mjs
2	// Tests for the U-XRAY-BLUEPRINT-LORA-STAGE pure adapter. Reference values + invariants — the
3	// adapter feeds india's LoRA trainset, so a wrong mapping = silently training on malformed/leaked
4	// labels. Each test encodes WHY a mapping rule matters (string coercion, trainable-gate, context fold).
5	
6	import { test } from "node:test";
7	impor
... [+7032 chars truncated]

### Assistant | 2026-06-23T08:28:24.070Z

I have all three files read end-to-end. Let me verify the downstream consumer of the JSONL key name and the buildTrainsetRow contract to confirm no orphaning and key-name matching, since the runner persists `gdt_labels` and File 3 reads `row.gdt_labels`.

### Assistant | 2026-06-23T08:28:25.491Z

[tool_use: Grep]

### User | 2026-06-23T08:28:26.822Z

[tool_result] scripts\blueprint-ocr-training-loop.mjs:402:          const trainableGdt = (trainsetRow.gdt_labels || []).filter((l) => l.trainable);
scripts\blueprint-ocr-training-loop.mjs:404:            try { appendFileSync(trainsetPath, JSON.stringify({ key, page, part: trainsetRow.part, image: pageImage, n_models: trainsetRow.n_models, labels: trainable, gdt_labels: trainableGdt, gdt_count: trainsetRow.gdt_c
... [+5362 chars truncated]

### Assistant | 2026-06-23T08:28:26.868Z

[tool_use: Grep]

### User | 2026-06-23T08:28:28.152Z

[tool_result] 19://      is trainable ONLY if its print had n_models≥2 (real corroboration) AND it clears the trust floor.
35:// trainable (routed to active-learning instead).
121: * Deterministic (no Math.random); used both to stamp fcf_text on the label and as the pair groundTruth.
150: * self-agreement) can NEVER mint trainable labels.
157:export function buildTrainsetRow(part, fused, calibration, opts = {})
... [+2503 chars truncated]

### Assistant | 2026-06-23T08:28:31.798Z

I have confirmed the producer (File 1, `buildTrainsetRow`), the runner (File 2), the pair builder (File 3), and the final consumer (`xray-trainset-to-lora.mjs`). Let me read the relevant slices of the producer lib and the final consumer to fully verify the key-name chain and the per-label field contract that File 3's gdt loop relies on.

### Assistant | 2026-06-23T08:28:33.354Z

[tool_use: Read]

### Assistant | 2026-06-23T08:28:33.706Z

[tool_use: Read]

### User | 2026-06-23T08:28:34.573Z

[tool_result] 110	  else if (acc >= th.silver) tier = "silver";
111	  else if (acc >= th.bronze) tier = "bronze";
112	  else tier = "reject";
113	  return { tier, expectedAccuracy: acc, f };
114	}
115	
116	/**
117	 * Pure: render a GD&T feature-control-frame entry to a canonical ASCII ground-truth string for the
118	 * LoRA pair (the GD&T analogue of a dimension's value_mm). Format:
119	 *   "<symbol> <toleranc
... [+7232 chars truncated]

### User | 2026-06-23T08:28:34.771Z

[tool_result] 60	  if (!existsSync(path)) return { rows: [], error: `trainset not found: ${path}` };
61	  let raw;
62	  try { raw = readFileSync(path, "utf8"); } catch (e) { return { rows: [], error: `read failed: ${e instanceof Error ? e.message : String(e)}` }; }
63	  // Last-wins dedup: a later row for the same key+page supersedes an earlier (resume-duplicate) one.
64	  // A row with no usable identity is ke
... [+3156 chars truncated]

### Assistant | 2026-06-23T08:28:38.621Z

I now have the full chain end-to-end. Let me verify the dedup key in `xray-trainset-to-lora.mjs` (whether a gdt-only persisted row gets a stable key+page identity, so last-wins dedup doesn't drop gdt-only rows) and the `trainsetRowDedupKey` definition.

### Assistant | 2026-06-23T08:28:39.142Z

[tool_use: Read]

### User | 2026-06-23T08:28:40.115Z

[tool_result] 30	import { trainsetToLoRAPairs } from "./lib/trainset-to-lora-pairs.mjs";
31	
32	const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
33	const STAGING_DIR = "mcp-server/data/training/lora/staging"; // bridge DEFAULT_STAGING_DIR (no marker needed)
34	const OUT_DIR = join(REPO_ROOT, "state", "shared", "ocr-training-loop");
35	
36	function parseArgs(args) {
37	  const get = (f, 
... [+1104 chars truncated]

### Assistant | 2026-06-23T08:29:18.924Z

I have verified the entire chain end-to-end: producer (`buildTrainsetRow`) → runner (File 2 persist) → JSONL → reader/dedup (`xray-trainset-to-lora.mjs`) → pair builder (File 3) → bridge. Here is my Arm A verdict.

---

VERDICT: PASS

summary: The consumer-wiring half is correct and reaches its destination without orphaning or breaking back-compat. The runner persists `gdt_labels` under the exact key the pair builder reads; gdt-only pages are now appended and correctly flow through dedup → pairs → the LoRA bridge; existing dim-only behavior, edge-case returns, and pairId uniqueness are all preserved. I verified the full chain across `ocr-training-loop-lib.mjs` (producer), `blueprint-ocr-training-loop.mjs` (runner), `trainset-to-lora-pairs.mjs` (pair builder), and `xray-trainset-to-lora.mjs` (reader/consumer).

findings:
  - none (P0/P1). Two P2 observations below are deferrable and not blockers.

Verification detail (so the PASS is auditable):

1. BACK-COMPAT — VERIFIED.
   - Dim-only rows: File 3 `trainset-to-lora-pairs.mjs:42` iterates `Array.isArray(row.labels) ? row.labels : []` and `:44-58` is byte-identical logic to before (same pairId `:${type}:${i}`, same `Number(value_mm)` finite-guard, same context string). For a row with no `gdt_labels`, the new loop at `:64` iterates `[]` and emits nothing, so output is identical to pre-change.
   - Edge cases: `:36` guard `(!Array.isArray(row.labels) && !Array.isArray(row.gdt_labels))` still returns `[]` for `null`, `{}`, and `{labels:"nope"}` (neither array present in all three). Tests at `test.mjs:70-77` confirm. `{labels:"nope"}` → `labels` not an array, `gdt_labels` absent → `[]`. Correct.
   - Runner dim-only path: `blueprint-ocr-training-loop.mjs:402` `trainableGdt` resolves to `[]` when `gdt_labels` absent/empty; `:403` append condition `trainable.length > 0 || trainableGdt.length > 0` reduces to the old `trainable.length > 0` when no gdt; `:407` `trainableGdtTotal += 0`. Unchanged behavior with no gdt_labels. Ve
... [+4772 chars truncated]
