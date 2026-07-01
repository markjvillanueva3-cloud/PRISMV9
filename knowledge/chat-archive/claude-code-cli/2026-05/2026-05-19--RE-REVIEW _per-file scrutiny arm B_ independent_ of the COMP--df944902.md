---
type: "chat-session"
source: "claude-code-cli"
session_id: "df944902-c90f-484b-86ea-6b35b3c9143f"
title: "RE-REVIEW (per-file scrutiny arm B, independent) of the COMPLETE U-FGE03 changes"
date: "2026-05-19"
first_ts: "2026-05-19T00:40:31.754Z"
last_ts: "2026-05-19T00:49:05.341Z"
cwd: "H:\\prism"
messages: 35
user_msgs: 14
assistant_msgs: 21
raw_file: "H:/.claude/projects/H--prism/df944902-c90f-484b-86ea-6b35b3c9143f/subagents/agent-a903552f52f186c68.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:30"
---

# RE-REVIEW (per-file scrutiny arm B, independent) of the COMPLETE U-FGE03 changes

> **claude-code-cli** | 2026-05-19 | 35 msgs (14 user / 21 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/df944902-c90f-484b-86ea-6b35b3c9143f/subagents/agent-a903552f52f186c68.jsonl`

## Transcript

### User | 2026-05-19T00:40:31.754Z

RE-REVIEW (per-file scrutiny arm B, independent) of the COMPLETE U-FGE03 changeset. YOU previously FAILED this on P0-1/P0-2/P1-1 when only the 2 engine files existed. Verify each of your blocking findings is now genuinely resolved — do not rubber-stamp; a fix that looks present but is wrong is worse than the original gap.

YOUR PRIOR BLOCKING FINDINGS + claimed fixes:
- P0-1 (persistLearned unreachable / unit goal unmet): claimed fixed by wiring cadDispatcher — cad_corpus_apply_learned gains optional params.persist===true → persistLearned; new cad_corpus_overlay_status action (enum+case). Plus persistLearned now honors PRISM_CAD_PREVALENCE_OVERLAY_PATH (the latent env-divergence you flagged). VERIFY: is persistLearned now reachable from a real production call path? Does the dispatcher persist branch pass smoothing_alpha correctly? Is the env-override in persistLearned byte-aligned with overlayPathResolved() (same precedence: env.trim() first, else dist/engines→../.. anchor)? Any way writer/reader still diverge?
- P0-2 (zero tests): claimed fixed by 19 tests (8 learner persistLearned + 11 lib overlay/dispatcher). VERIFY against R9: do the tests fail if the behavior regresses? Specifically the backward-compat pin (no overlay → exact static) and the P1-1 drift oracle. Any weak assertions (the legitimacy gate already rejected toBeUndefined; confirm none slipped). Is the dispatcher round-trip a REAL invoke-through-dispatcher (not engine singleton)?
- P1-1 (FGE01 drift-semantics regression — buildSequenceForEvidence used overlay-blended prevalence as drift baseline → corpus-vs-corpus degeneration): claimed fixed by new templateForStatic() (raw LIBRARY, no overlay) with buildSequenceForEvidence rerouted to it; buildSequenceFor/predictVisualFidelity stay overlay-aware. VERIFY: read buildSequenceForEvidence end-to-end — does EVERY use of the template inside it (drift caveat loop, ranked map, ALL fallback branches) now read the STATIC template? Is there any remaining path whe
... [+2201 chars truncated]

### Assistant | 2026-05-19T00:40:42.374Z

I'll perform an independent re-review of the complete U-FGE03 changeset, verifying each prior blocking finding is genuinely resolved.

### Assistant | 2026-05-19T00:40:43.181Z

[tool_use: Read]

### Assistant | 2026-05-19T00:40:43.330Z

[tool_use: Read]

### User | 2026-05-19T00:40:58.565Z

[tool_result] 1	// WIRE-EXEMPT: training surface consumed by scripts/train-class-feature-library.ts
2	// and the print-to-CAD orchestrator (full-cad-ai-pipeline-*.ts). Dispatcher
3	// integration follows in CAD-FUSION-LIVE-MS1 alongside the visual-fidelity gate.
4	/**
5	 * CADClassFeatureLibraryEngine — Class-typical feature taxonomy for the
6	 * print-to-CAD pipeline.
7	 *
8	 * The 1st and 2nd attempts at JM D
... [+45561 chars truncated]

### User | 2026-05-19T00:41:01.047Z

[tool_result] 1	// WIRE-EXEMPT: training surface consumed by scripts/learn-class-feature-prevalence.ts
2	// to refresh the CADClassFeatureLibraryEngine prevalence weights from corpus
3	// evidence. Dispatcher integration follows in CAD-FUSION-LIVE-MS1 once the
4	// learning loop is closed (corpus → weights → live build → outcome → corpus).
5	/**
6	 * CADCorpusFeaturePrevalenceLearnerEngine — Learn class-feature
... [+19281 chars truncated]

### Assistant | 2026-05-19T00:41:03.441Z

Now let me read the dispatcher and test files.

### Assistant | 2026-05-19T00:41:04.733Z

[tool_use: Read]

### Assistant | 2026-05-19T00:41:05.330Z

[tool_use: Read]

### User | 2026-05-19T00:41:12.824Z

[tool_result] 210	  // CAD Geometry Comparison Engine (U-CADC26)
211	  "geometry_compare_files", "geometry_extract_metrics", "geometry_batch_compare",
212	  "geometry_set_thresholds", "geometry_format_detect",
213	  // Universal CAD Registry (U-CADC03)
214	  "cad_registry_scan", "cad_registry_search", "cad_registry_get", "cad_registry_stats",
215	  // NACA Airfoil Engine (U-CADC13)
216	  "naca_generate_4digit",
... [+4374 chars truncated]

### User | 2026-05-19T00:41:12.827Z

[tool_result] 2300	                // U-FGE02: evidence-ranked-build telemetry. When use_corpus_evidence=false
2301	                // (default), every field below is the zero-state — preserves pre-2026-05-18
2302	                // result shape additively (callers reading other fields see unchanged data).
2303	                use_corpus_evidence: useCorpusEvidence,
2304	                evidence_ordered_missing
... [+5576 chars truncated]

### Assistant | 2026-05-19T00:41:16.405Z

Now the test files.

### Assistant | 2026-05-19T00:41:16.764Z

[tool_use: Read]

### User | 2026-05-19T00:41:21.912Z

[tool_result] 1	import { describe, it, expect } from "vitest";
2	import { CADCorpusFeaturePrevalenceLearnerEngine } from "../engines/CADCorpusFeaturePrevalenceLearnerEngine.js";
3	import type { CorpusManifest, CADCorpusEntry } from "../engines/CADCorpusIngestionEngine.js";
4	import type { PartClass } from "../engines/BlueprintVisionOCREngine.js";
5	import type { FeatureTemplate } from "../engines/CADClassFeatur
... [+18045 chars truncated]

### Assistant | 2026-05-19T00:41:25.172Z

Now the second test file.

### Assistant | 2026-05-19T00:41:25.841Z

[tool_use: Read]

### User | 2026-05-19T00:41:32.320Z

[tool_result] 1	import { describe, it, expect, afterEach, beforeAll } from "vitest";
2	import { CADClassFeatureLibraryEngine } from "../engines/CADClassFeatureLibraryEngine.js";
3	
4	const engine = new CADClassFeatureLibraryEngine();
5	
6	describe("CADClassFeatureLibraryEngine.templateFor", () => {
7	  it("returns extrude_punch template with 6 ordered features", () => {
8	    const t = engine.templateFor("extru
... [+31064 chars truncated]

### Assistant | 2026-05-19T00:42:16.803Z

All four files read end-to-end. Now I'll verify each prior blocking finding against the actual code.

## Verification of prior blocking findings

### P0-1 — persistLearned reachability + writer/reader path parity

**Production call path:** `cadDispatcher.ts:2344-2349` — `cad_corpus_apply_learned` with `params.persist === true` calls `persistLearned(blended, { smoothing_alpha: smoothingAlpha })`. The action is in the enum at line 228 (`"cad_corpus_apply_learned", "cad_corpus_overlay_status"`). **REACHABLE — confirmed.**

**smoothing_alpha correctness:** Line 2329 `const smoothingAlpha = params.smoothing_alpha ?? 0.7;` is the *single* source — passed to both `applyLearned` (2333) and `persistLearned` opts (2347). The blend math uses the same alpha that gets recorded into the overlay's `smoothing_alpha` provenance field. **Consistent — no divergence.**

**Writer↔reader env-override byte-alignment:** This is the critical check. Comparing the two resolvers:

- Writer `persistLearned` (CADCorpusFeaturePrevalenceLearnerEngine.ts:327-335): `envPath = process.env.PRISM_CAD_PREVALENCE_OVERLAY_PATH; if (envPath && envPath.trim()) overlayPath = envPath.trim(); else { engineDir = dirname(fileURLToPath(import.meta.url)); mcpRoot = resolve(engineDir, "..", ".."); resolve(mcpRoot, "data/state/cad-learned-prevalence-overlay.json") }`
- Reader `overlayPathResolved` (CADClassFeatureLibraryEngine.ts:633-640): `envPath = process.env.PRISM_CAD_PREVALENCE_OVERLAY_PATH; if (envPath && envPath.trim()) return envPath.trim(); engineDir = dirname(fileURLToPath(import.meta.url)); mcpRoot = resolve(engineDir, "..", ".."); return resolve(mcpRoot, "data/state/cad-learned-prevalence-overlay.json")`

Precedence identical: env `.trim()` first, else `dist/engines → ../.. → mcp-root → data/state/cad-learned-prevalence-overlay.json`. Both engine files compile to `dist/engines/*.js`, so `import.meta.url` anchors to the same `dist/engines/` directory → identical `mcpRoot` → identical default path. The env
... [+5759 chars truncated]

### Assistant | 2026-05-19T00:42:18.066Z

[tool_use: Grep]

### Assistant | 2026-05-19T00:42:19.269Z

[tool_use: Grep]

### User | 2026-05-19T00:42:45.865Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-05-19T00:42:46.723Z

[tool_result] Found 2 files
mcp-server\src\tools\dispatchers\cadDispatcher.ts
mcp-server\src\engines\CADClassFeatureLibraryEngine.ts

### Assistant | 2026-05-19T00:42:50.892Z

The first grep confirms `cad_corpus_apply_learned`/`cad_corpus_overlay_status`/`cad_corpus_learn_prevalence` appear in **only 2 files**: `cadDispatcher.ts` (enum + cases) and `CADClassFeatureLibraryEngine.ts` (the `source` provenance literal `"cad_corpus_apply_learned"`). No `cadActionSchemas.ts` reference, no test referencing these action names for schema parity. Let me confirm there's no enum-vs-schema parity test specifically.

### Assistant | 2026-05-19T00:42:51.821Z

[tool_use: Glob]

### Assistant | 2026-05-19T00:42:52.071Z

[tool_use: Glob]

### User | 2026-05-19T00:43:14.699Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-05-19T00:43:14.702Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-05-19T00:43:18.512Z

[tool_use: Bash]

### User | 2026-05-19T00:45:31.657Z

[tool_result] Command running in background with ID: bnv031k1t. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\h--PRISM\df944902-c90f-484b-86ea-6b35b3c9143f\tasks\bnv031k1t.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-05-19T00:45:36.725Z

[tool_use: Bash]

### User | 2026-05-19T00:47:30.438Z

[tool_result] cadDispatcher-U-AWR19.test.ts
cadDispatcher.6cad.esprit.e2e.test.ts
cadDispatcher.blueprintToAllCads.test.ts
cadDispatcher.cadBridgeStatus.test.ts
cadDispatcher.classDriveBuild.test.ts
cadDispatcher.gear.test.ts
cadDispatcher.inventor.test.ts
cadDispatcher.latheTemplatePlace.test.ts
cadDispatcher.liveBridges.test.ts
cadDispatcher.loftedWing.test.ts
cadDispatcher.naca.test.ts
cadDispatcher.solidwor
... [+299 chars truncated]

### Assistant | 2026-05-19T00:47:33.375Z

Two candidates for an enum↔schema parity test: `dispatcher.actionSchemaCache.test.ts` and `dispatcher.schemaCompact.test.ts`. Let me check whether either enforces every cad action has a schema (which would fail on `cad_corpus_overlay_status`).

### Assistant | 2026-05-19T00:47:35.261Z

[tool_use: Bash]

### User | 2026-05-19T00:48:31.210Z

[tool_result] dispatcher.actionSchemaCache.test.ts:59:    expect(ACTION_DEV_SCHEMAS["asc_get_schema"].safeParse({}).success).toBe(false);
dispatcher.actionSchemaCache.test.ts:60:    expect(ACTION_DEV_SCHEMAS["asc_get_schema"].safeParse({ action_name: "" }).success).toBe(false);
dispatcher.actionSchemaCache.test.ts:61:    expect(ACTION_DEV_SCHEMAS["asc_get_schema"].safeParse({ action_name: "rsg_generate" }).succ
... [+2252 chars truncated]

### Assistant | 2026-05-19T00:49:05.341Z

These tests target `ACTION_DEV_SCHEMAS` (dev-dispatcher schema-cache *engine* behavior) — schema-search/compaction utilities, not a cad-enum↔schema parity gate. None iterate the cad enum asserting every action has a schema entry. The `cad_corpus_*` group has no schema entries by group convention (FGE01 precedent), and no parity test enforces otherwise. **Schema-omission reasoning is sound — no parity test will fail.**

One residual check — confirm no NEW tsc error was introduced by the dispatcher insertions. The evidence claims only the pre-existing BlueprintLoRABridge TS2344 at :3078. The two new cases (`cad_corpus_apply_learned` persist branch, `cad_corpus_overlay_status`) use `params.persist === true` (untyped `params` — consistent with the surrounding dispatcher's untyped param access, R11) and lazy `await import` (R8/dispatcher convention). The `persisted: unknown` typing (2343) avoids leaking `PersistLearnedResult` into the result-shape inference. Structurally clean and convention-conforming.

## Defect hunt — did the fixes introduce new defects?

- **`applyOverlay` `v !== f.prevalence` guard (line 720):** if an overlay value exactly equals the static value, `changed` stays false and the static template returns by identity. This is a correctness optimization, not a bug — the returned prevalence is identical either way; `expected_feature_count` is unchanged because the value didn't change. No invariant break.
- **`overlayStatus().applied` (795):** `ov !== null && !disabled`. When disabled, `loadPrevalenceOverlay` returns `{overlay:null}` early (653-655), so `present` is also false while disabled — test:431-440 asserts `applied:false` + `disabled:true` and passes. Slight semantic quirk (`present` is false even though a file exists, when disabled) but it's *documented behavior* and the test pins it; not a regression.
- **mtime cache + per-test env:** `loadPrevalenceOverlay` keys cache on `path` AND `mtimeMs` (660). The mtime-invalidation test (469-481) sleeps 15m
... [+3826 chars truncated]
