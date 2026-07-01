---
type: "chat-session"
source: "claude-code-cli"
session_id: "928a8226-c5d3-489a-a7f0-3c0167726623"
title: "You are synthesizing an exact build spec for U-QP-BLUEPRINT-OCR-BRIDGE-ADAPTER ("
date: "2026-06-10"
first_ts: "2026-06-10T00:05:12.016Z"
last_ts: "2026-06-10T00:06:59.251Z"
cwd: "H:\\prism"
messages: 7
user_msgs: 3
assistant_msgs: 4
raw_file: "H:/.claude/projects/H--prism/928a8226-c5d3-489a-a7f0-3c0167726623/subagents/workflows/wf_8da40cea-18a/agent-aad12da85c444f9a8.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:18"
---

# You are synthesizing an exact build spec for U-QP-BLUEPRINT-OCR-BRIDGE-ADAPTER (

> **claude-code-cli** | 2026-06-10 | 7 msgs (3 user / 4 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/928a8226-c5d3-489a-a7f0-3c0167726623/subagents/workflows/wf_8da40cea-18a/agent-aad12da85c444f9a8.jsonl`

## Transcript

### User | 2026-06-10T00:05:12.016Z

You are synthesizing an exact build spec for U-QP-BLUEPRINT-OCR-BRIDGE-ADAPTER (PRISM charlie). Four investigators returned findings.

[OCR TYPES]
I have everything needed. The tests assert field-by-field but never serialize a complete `BlueprintAnalysis` literal — the closest concrete populated examples are the input fixtures plus the field-level assertions. Here is the exhaustive field map.

---

# `BlueprintAnalysis` — Exhaustive Field Map

Source file: `H:/prism/mcp-server/src/engines/BlueprintOCREngine.ts`
Output type emitted by: `analyzeBlueprint(text, options?)` → `BlueprintAnalysis` (singleton `blueprintOCREngine.analyzeBlueprint`, file:566) and embedded as `IngestedBlueprintRow.analysis` (file:687).

## ROOT — `BlueprintAnalysis` (file:102–116)

```ts
export interface BlueprintAnalysis {
  dimensions: ExtractedDimension[];
  gdt_frames: ExtractedGDT[];
  title_block: TitleBlockData;
  notes: ExtractedNote[];
  summary: {
    total_dimensions: number;
    total_gdt: number;
    total_notes: number;
    tightest_tolerance_mm: number;
    critical_features: string[];
    material: string;
    has_gdt: boolean;
  };
}
```

| Field | TS type | Semantic |
|---|---|---|
| `dimensions` | `ExtractedDimension[]` | All dimension callouts parsed from text (linear/dia/radius/angular/thread/chamfer/depth/cbore/csink). |
| `gdt_frames` | `ExtractedGDT[]` | All GD&T feature-control frames parsed (symbol + tolerance + datums). |
| `title_block` | `TitleBlockData` | Single title-block metadata object (always present, fields optional). |
| `notes` | `ExtractedNote[]` | Numbered/bulleted drawing notes, categorized. |
| `summary` | inline object (below) | Roll-up stats; NOT a named type — inline literal on the interface. |

## `summary` (inline object, file:107–115) — never `undefined`, always fully built (file:609–618)

| Field | TS type | Semantic |
|---|---|---|
| `total_dimensions` | `number` | `dimensions.length`. |
| `total_gdt` | `number` | `gdt_frames.length`. |
| `tota
... [+32612 chars truncated]

### Assistant | 2026-06-10T00:05:15.514Z

I'll synthesize the exact build spec from the four investigator findings. Let me verify the load-bearing facts before committing them to the spec.

### Assistant | 2026-06-10T00:05:16.922Z

[tool_use: Read]

### Assistant | 2026-06-10T00:05:17.396Z

[tool_use: Read]

### User | 2026-06-10T00:05:18.091Z

[tool_result] 1	/**
2	 * BlueprintToQuoteBridgeEngine — Connects BlueprintOCR extraction → QuoteEstimator input.
3	 *
4	 * Bridges the gap between "upload a drawing" and "get an instant quote" by translating
5	 * extracted blueprint data (dimensions, GD&T, title block, notes) into a fully populated
6	 * QuoteEstimateInput. This is the key pathway for competing with Xometry's upload→quote flow.
7	 *
8	 * Pipelin
... [+1737 chars truncated]

### User | 2026-06-10T00:05:18.413Z

[tool_result] 1470	          result = { ok: true, count: items.length, items };
1471	          break;
1472	        }
1473	
1474	        // U-EMPLOYEE-MOBILE-PORTAL W3 (slot:hotel, 2026-05-24) ───────────────
1475	        // Print-to-program chain — phone-triggered blueprint → quote → CAD → CAM → G-code.
1476	        case "emp_blueprint_to_quote": {
1477	          const { blueprintToQuoteBridgeEngine } = await i
... [+1156 chars truncated]

### Assistant | 2026-06-10T00:06:59.251Z

The two load-bearing facts are confirmed: the bridge's local `BlueprintAnalysis` (`.ts:17-49`) and the broken caller (`shopDispatcher.ts:1474-1484`, including the `QuoteEstimateInput` type-alias error at `:1479`). I have enough to emit the verbatim spec.

---

# BUILD SPEC — U-QP-BLUEPRINT-OCR-BRIDGE-ADAPTER

## 1. DEDUP VERDICT: **BUILD-NEW** (adapter method). No correct OCR→bridge path exists in either dispatcher.

Both production call sites feed the **OCR engine's** `BlueprintAnalysis` (`BlueprintOCREngine.ts:102-116`) into `bridge()`, which reads a **structurally different local** `BlueprintAnalysis` (`BlueprintToQuoteBridgeEngine.ts:18-49`). The two interfaces collide by name only.

- `shopDispatcher.ts:1481` — `emp_blueprint_to_quote` → `bridge(p.analysis, p.overrides)` — **fails tsc** (TS2345 at `:1481`, TS2694 at `:1479`).
- `businessDispatcher.ts:3072` — `blueprint_to_quote` → `bridge(params.analysis ?? params, ...)` — type-checks ONLY because `params` is `z.record(z.string(), z.any())` (`businessDispatcher.ts:1579`); same latent runtime mis-read, invisible to tsc.

Grep for `fromOCR|normalizeBlueprint|toQuoteInput|ocrToBridge|adaptAnalysis|fromBlueprintAnalysis` → **0 matches**. No existing adapter to route through. `AutoPrintToProgramBridgeEngine` (`shopDispatcher.ts:1486`), `QuoteToShipOrchestratorEngine.ts:1313`, and `BlueprintToAllCADsOrchestratorEngine` are confirmed-unrelated (different pipelines / different OCR engine). **Build a new normalizer; do NOT re-route, do NOT just re-annotate types — the runtime fields genuinely differ.**

---

## 2. FIELD-BY-FIELD MAPPING — OCR `BlueprintAnalysis` → bridge-local `BlueprintAnalysis`

Adapter signature: `fromOCRAnalysis(ocr: BlueprintOCREngine.BlueprintAnalysis): BridgeLocal.BlueprintAnalysis`. Only emit fields `bridge()` actually consumes (everything else is dead weight). Map **only** the consumed surface:

### `dimensions[]` — OCR `ExtractedDimension[]` → bridge `{type, value, unit, tolerance?, text}[]`
|
... [+17155 chars truncated]
