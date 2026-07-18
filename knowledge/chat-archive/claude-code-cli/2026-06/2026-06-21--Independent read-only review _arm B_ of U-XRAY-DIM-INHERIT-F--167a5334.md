---
type: "chat-session"
source: "claude-code-cli"
session_id: "167a5334-51e0-44fa-a725-0b1efccb4ef7"
title: "Independent read-only review (arm B) of U-XRAY-DIM-INHERIT-FINISH (slot xray). G"
date: "2026-06-21"
first_ts: "2026-06-21T05:45:13.808Z"
last_ts: "2026-06-21T05:50:20.314Z"
cwd: "H:\\prism\\mcp-server"
messages: 89
user_msgs: 33
assistant_msgs: 56
raw_file: "H:/.claude/projects/H--prism/167a5334-51e0-44fa-a725-0b1efccb4ef7/subagents/agent-a1f799a7bd0ed6dd1.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:07"
---

# Independent read-only review (arm B) of U-XRAY-DIM-INHERIT-FINISH (slot xray). G

> **claude-code-cli** | 2026-06-21 | 89 msgs (33 user / 56 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/167a5334-51e0-44fa-a725-0b1efccb4ef7/subagents/agent-a1f799a7bd0ed6dd1.jsonl`

## Transcript

### User | 2026-06-21T05:45:13.808Z

Independent read-only review (arm B) of U-XRAY-DIM-INHERIT-FINISH (slot xray). Grade PASS/FAIL + P0/P1/P2 + file:line. Do NOT edit. Don't assume arm A caught everything.

CHANGE: BlueprintVisionOCREngine now makes a dimension lacking its own surface_finish_ra INHERIT the single unambiguous all-over/unless-noted part-level finish (new pure selectPartDefaultFinish in src/utils/surfaceFinishNormalize.ts; new optional ExtractedDimension.surface_finish_ra_inherited flag in src/engines/BlueprintOCREngine.ts). This CLOSES the part-level surface_finishes orphan (the field now has a consumer) AND mutates dimensions.

YOUR weighting (cost-safety + integration + what A won't catch):
- COST/SAFETY BLAST RADIUS: surface_finish_ra feeds downstream cost/process. More dimensions now carry a finish value (inherited). Trace the actual readers of ExtractedDimension.surface_finish_ra across src/ (esp. quote / WEDM skim-pass / lathe). Could a wrongly-inherited finish inflate/deflate a quote or change a process decision? Does any reader treat surface_finish_ra uniformly (ignoring the new inherited flag) such that an over-applied default corrupts a downstream number? Is the conservative selection (single all-over only) tight enough to be safe, or should inheritance be OFF by default / flag-gated?
- DESIGN: is inheriting silently (even if flagged) the right call, or should it require operator-confirm given the OCR per-field confidence floor (0.70) doctrine? Is the inherited finish given a confidence/provenance so it isn't mistaken for a high-confidence drawn callout?
- BLAST RADIUS of the type change: ExtractedDimension has 13 importers; is the new optional field purely additive (no break)?
- TEST INTEGRITY (R9): are the selectPartDefaultFinish tests real reference values; do they cover the over-application failure mode (location-specific NOT applied, 2 all-over -> null)? Is the ENGINE inheritance loop itself tested (or only the pure selector)? If the loop is untested, is that a gap?
- HON
... [+154 chars truncated]

### Assistant | 2026-06-21T05:45:17.968Z

I'll review U-XRAY-DIM-INHERIT-FINISH. Let me start by locating the changed files and reading them end-to-end.

### Assistant | 2026-06-21T05:45:18.478Z

[tool_use: Glob]

### Assistant | 2026-06-21T05:45:18.947Z

[tool_use: Glob]

### Assistant | 2026-06-21T05:45:19.055Z

[tool_use: Glob]

### User | 2026-06-21T05:45:20.144Z

[tool_result] src\utils\surfaceFinishNormalize.ts

### User | 2026-06-21T05:45:20.547Z

[tool_result] src\engines\BlueprintOCREngine.ts

### User | 2026-06-21T05:45:20.690Z

[tool_result] src\engines\BlueprintVisionOCREngine.ts

### Assistant | 2026-06-21T05:45:22.965Z

Let me read the changed files and the git diff to understand the actual change.

### Assistant | 2026-06-21T05:45:24.100Z

[tool_use: Bash]

### Assistant | 2026-06-21T05:45:24.350Z

[tool_use: Read]

### User | 2026-06-21T05:45:24.825Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\utils\surfaceFinishNormalize.ts' was already read 18s ago in this session and is unchanged (mtime 1782010552375). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACH
... [+4 chars truncated]

### User | 2026-06-21T05:45:27.612Z

[tool_result] 4c7c558ede [MAIN-FORCE] [AI-LATHE-FIX]/U-LATHE-AI-BRIDGE-RED (slot:india): clear 3 RED in the Lathe AI-bridge pair -- incomplete material aliases (2) + a FP rounding-boundary test bug (1)
d040acddf6 [MAIN-FORCE] [AI-REASONING-FIX]/U-P5-DIAGNOSE-SOURCE-CANONICAL (slot:india): P5 diagnose_failure test sent non-canonical Symptom.source "machine" -> schema correctly rejected it BEFORE the engine, drop
... [+590 chars truncated]

### Assistant | 2026-06-21T05:45:32.257Z

The read-once guard says I already read surfaceFinishNormalize.ts but it's not in my context (this is a fresh thread). Let me bypass the cache and read both changed files plus the diff.

### Assistant | 2026-06-21T05:45:33.567Z

[tool_use: Bash]

### User | 2026-06-21T05:45:36.868Z

[tool_result] commit 4c7c558ede24c0454747f8716d6b9074dd0f4d4c
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Sun Jun 21 00:38:18 2026 -0500

    [MAIN-FORCE] [AI-LATHE-FIX]/U-LATHE-AI-BRIDGE-RED (slot:india): clear 3 RED in the Lathe AI-bridge pair -- incomplete material aliases (2) + a FP rounding-boundary test bug (1)
    
    LatheSpeedFeedDeepLearningAdvisorEngine.test.ts (2 fails) -- r
... [+2931 chars truncated]

### Assistant | 2026-06-21T05:45:40.010Z

The unit U-XRAY-DIM-INHERIT-FINISH is not yet committed — it's a working-tree change. Let me look at the uncommitted diff and read both files in full.

### Assistant | 2026-06-21T05:45:41.472Z

[tool_use: Bash]

### User | 2026-06-21T05:45:46.513Z

[tool_result] <persisted-output>
Output too large (295.7KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism\167a5334-51e0-44fa-a725-0b1efccb4ef7\tool-results\blx8l8qck.txt

Preview (first 2KB):
 .../__tests__/mcp-bridge-enforce-pretool.test.mjs  |     96 +-
 .claude/hooks/auto-consensus-userprompt.mjs        |     26 +-
 .claude/hooks/auto-consensus-userprompt.test.mjs   |     41 +
 .claude/hook
... [+1801 chars truncated]

### Assistant | 2026-06-21T05:45:48.896Z

The working tree has many unrelated changes. Let me narrow to just the two files in the change description and verify their git status, then read each end to end.

### Assistant | 2026-06-21T05:45:51.256Z

[tool_use: Bash]

### User | 2026-06-21T05:45:55.223Z

[tool_result]  M mcp-server/src/engines/BlueprintOCREngine.ts
 M mcp-server/src/engines/BlueprintVisionOCREngine.ts
 M mcp-server/src/utils/surfaceFinishNormalize.ts
=== finish-related test files ===
 M knowledge/memories/reference/reference_jm_lathe_finishing_allowances_carbide_pressfit_2026_06_01.md
 M knowledge/memories/reference/reference_post_ship_high-roi-wiki-tribal-u-wiki-oporder-rough-finish.md
 M know
... [+5058 chars truncated]

### Assistant | 2026-06-21T05:45:58.091Z

The change touches these modified files: `surfaceFinishNormalize.ts`, `surfaceFinishNormalize.test.ts`, `BlueprintOCREngine.ts`, `BlueprintVisionOCREngine.ts`. Let me get the exact diffs for the three core files and read them fully.

### Assistant | 2026-06-21T05:45:59.507Z

[tool_use: Bash]

### User | 2026-06-21T05:46:02.448Z

[tool_result] diff --git a/mcp-server/src/utils/__tests__/surfaceFinishNormalize.test.ts b/mcp-server/src/utils/__tests__/surfaceFinishNormalize.test.ts
index 7512cd39c6..99cde55eac 100644
--- a/mcp-server/src/utils/__tests__/surfaceFinishNormalize.test.ts
+++ b/mcp-server/src/utils/__tests__/surfaceFinishNormalize.test.ts
@@ -5,6 +5,9 @@ import { describe, it, expect } from "vitest";
 import {
   normalizeSurf
... [+7888 chars truncated]

### Assistant | 2026-06-21T05:46:04.849Z

Now let me read the full surfaceFinishNormalize.ts to understand `normalizeSurfaceFinish`, `SurfaceFinishSystem`, and the `assumed` field semantics.

### Assistant | 2026-06-21T05:46:05.262Z

[tool_use: Read]

### User | 2026-06-21T05:46:05.682Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\utils\surfaceFinishNormalize.ts' was already read 59s ago in this session and is unchanged (mtime 1782010552375). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACH
... [+4 chars truncated]

### Assistant | 2026-06-21T05:46:09.329Z

The guard is blocking but the content is NOT in my context (stale guard from a prior thread). Let me read with the cache disabled via Bash.

### Assistant | 2026-06-21T05:46:10.166Z

[tool_use: Bash]

### User | 2026-06-21T05:46:13.543Z

[tool_result]      1	/**
     2	 * Surface-finish callout normalization.
     3	 *
     4	 * TS port of the canonical pure normalizer in
     5	 * `scripts/lib/ollama-vision-extract-lib.mjs` (`normalizeSurfaceFinish`,
     6	 * U-XRAY-SURFACE-FINISH-NORMALIZE). The MCP/TS bundle cannot cleanly import the
     7	 * scripts/.mjs (separate runtime, untyped, node-only sibling imports), so this is a
     8	 * docume
... [+6576 chars truncated]

### Assistant | 2026-06-21T05:46:16.499Z

Now I have the full pure-utility picture. Let me look at the engine changes — both BlueprintOCREngine.ts (type change + inheritance loop) and BlueprintVisionOCREngine.ts.

### Assistant | 2026-06-21T05:46:17.329Z

[tool_use: Bash]

### User | 2026-06-21T05:46:20.306Z

[tool_result] diff --git a/mcp-server/src/engines/BlueprintOCREngine.ts b/mcp-server/src/engines/BlueprintOCREngine.ts
index 5a7f925fdc..623902d69a 100644
--- a/mcp-server/src/engines/BlueprintOCREngine.ts
+++ b/mcp-server/src/engines/BlueprintOCREngine.ts
@@ -51,6 +51,9 @@ export interface ExtractedDimension {
   };
   fit_class?: string;
   surface_finish_ra?: number;
+  /** true when surface_finish_ra was IN
... [+247 chars truncated]

### Assistant | 2026-06-21T05:46:22.126Z

Now the BlueprintVisionOCREngine.ts diff — this is where the inheritance loop likely lives.

### Assistant | 2026-06-21T05:46:23.108Z

[tool_use: Bash]

### User | 2026-06-21T05:46:26.354Z

[tool_result] diff --git a/mcp-server/src/engines/BlueprintVisionOCREngine.ts b/mcp-server/src/engines/BlueprintVisionOCREngine.ts
index c50202f9f8..4816022153 100644
--- a/mcp-server/src/engines/BlueprintVisionOCREngine.ts
+++ b/mcp-server/src/engines/BlueprintVisionOCREngine.ts
@@ -43,7 +43,7 @@ import type {
   GDTSymbol,
   ToleranceType,
 } from "./BlueprintOCREngine.js";
-import { resolveSurfaceFinishRa }
... [+3018 chars truncated]

### Assistant | 2026-06-21T05:46:30.032Z

Now let me read the surrounding context of the inheritance loop in BlueprintVisionOCREngine.ts to verify the `dimensions` variable and `convertDimensions` (does each dim already have `surface_finish_ra` resolved before the loop, and is `null` vs `undefined` handled correctly).

### Assistant | 2026-06-21T05:46:31.370Z

[tool_use: Bash]

### User | 2026-06-21T05:46:34.950Z

[tool_result]     // Resolve image
    const { data, media_type } = this.resolveImage(input.image);

    // Build prompt
    let prompt = BLUEPRINT_ANALYSIS_PROMPT;
    if (input.blueprint_type === "wire_edm") {
      prompt += WIRE_EDM_PROMPT_SUFFIX;
    }
    if (input.expected_units) {
      prompt += `\n\nThe drawing uses ${input.expected_units === "mm" ? "metric (millimeters)" : "imperial (inches)"} units.
... [+3359 chars truncated]

### system

... [9 middle messages omitted -- see raw_file] ...

### User | 2026-06-21T05:47:02.805Z

[tool_result] src\engines\BlueprintVisionOCREngine.ts:440:          d.surface_finish_ra_inherited = true;
src\engines\BlueprintOCREngine.ts:56:  surface_finish_ra_inherited?: boolean;

### Assistant | 2026-06-21T05:47:08.572Z

Important finding for the HONESTY check: `surface_finish_ra_inherited` is read by NO consumer anywhere in the repo — only written at `BlueprintVisionOCREngine.ts:440` and declared at `BlueprintOCREngine.ts:56`. So the inherited flag is itself a new orphan (write-only). Every downstream reader of `surface_finish_ra` sees the inherited value uniformly with no way to distinguish it from a drawn callout. This is the core risk the task asked about.

Now I need to determine whether `BlueprintVisionOCREngine`'s `ExtractedDimension` results actually flow downstream into quote/process decisions (real blast radius), or whether this engine's output is isolated. Let me trace consumers of `BlueprintVisionOCREngine` and check the actual readers of `surface_finish_ra` that affect cost/process. Let me check the most cost-relevant ones.

### Assistant | 2026-06-21T05:47:10.075Z

[tool_use: Grep]

### User | 2026-06-21T05:47:11.113Z

[tool_result] 33-  /** GD&T datum scheme — bumps cost when multiple datums required. */
34-  datum_count?: number;
35-  /** Surface finish Ra in μm if specified for THIS dim. */
36:  surface_finish_ra_um?: number;
37-  /** Optional explicit class override (otherwise inferred from band_mm). */
38-  class_override?: ToleranceClass;
39-}
--
122-      const datumTerm = c.datum_count && c.datum_count > 1 ? 1 + (c.da
... [+595 chars truncated]

### Assistant | 2026-06-21T05:47:11.497Z

[tool_use: Grep]

### User | 2026-06-21T05:47:12.545Z

[tool_result] 29-  /** Smallest internal radius (mm) — wire-radius constraint */
30-  min_radius_mm: number;
31-  tolerance_class?: string;
32:  surface_finish_ra_um?: number;
33-  /** Wire diameter on hand (default 0.25mm brass) */
34-  wire_diameter_mm?: number;
35-  /** Controller dialect */
--
85-    const main = { ie: mainIE, on_time_us: 8, off_time_us: 18, servo_v: 50 };
86-    const trim1 = { ie: mainIE 
... [+318 chars truncated]

### Assistant | 2026-06-21T05:47:21.502Z

This confirms the cost/process blast radius is real and material:

1. `TolerancePricingImpactEngine.ts:125-128` — a finish `<= 0.4 um` multiplies machining cost by **1.30** (grind needed), `<= 1.6 um` by **1.10**. An over-applied inherited tight finish would inflate the quote.
2. `WireEDMPunchDieAdapterEngine.ts:88` — a finish `<= 0.4 um` triggers a **3rd trim pass** (`needTrim3`) in the WEDM skim-pass plan — a real process/time decision (extra machining pass).

These readers use the field named `surface_finish_ra_um` (not `surface_finish_ra`), so they are not directly wired to `ExtractedDimension.surface_finish_ra` — there's an adapter boundary. Both readers treat the finish value **uniformly** regardless of inherited provenance. The question is whether `ExtractedDimension.surface_finish_ra` actually flows into these. Let me check the print-to-program pipeline and turning print intake, which are the natural bridges from OCR dimensions to process/quote.

### Assistant | 2026-06-21T05:47:22.128Z

[tool_use: Grep]

### Assistant | 2026-06-21T05:47:22.390Z

[tool_use: Grep]

### User | 2026-06-21T05:47:23.267Z

[tool_result] 729-
730-    // Apply surface finish from dimension
731:    if (dim.surface_finish_ra !== undefined && dim.surface_finish_ra !== null) {
732:      feature.surface_finish_Ra_um = dim.surface_finish_ra;
733-    }
734-  }

### User | 2026-06-21T05:47:23.375Z

[tool_result] 187-      material_hardness_hrc: input.workpiece_hardness_HRC,
188-      overall_thickness_mm: Math.max(...input.features.map((f) => f.dimensions_mm.depth ?? 0), 0) || undefined,
189:      target_ra_um: Math.min(...input.features.map((f) => f.surface_finish_ra_um ?? Infinity)),
190-    };
191-    const drawing = this.drawingEngine.interpret(drawingInput);
--
236-        workpiece_hardness_HRC:
237
... [+593 chars truncated]

### Assistant | 2026-06-21T05:47:30.850Z

This is the load-bearing finding. `TurningPrintIntakeEngine.ts:731-732` reads `dim.surface_finish_ra` directly and copies it into `feature.surface_finish_Ra_um` — the lathe process feature finish target. It checks `!== undefined && !== null` but does NOT inspect `surface_finish_ra_inherited`. So an inherited part-default finish becomes a per-feature finish target indistinguishably from a drawn callout.

Then `SinkerEDMPrintToProgramEngine.ts:189` does `target_ra_um: Math.min(...features.map(f => f.surface_finish_ra_um ?? Infinity))` — the **tightest** feature finish drives the part-level EDM target, and line 267-269 picks per-stage Ra. If inheritance over-applies a tight all-over finish to every dimension, the `Math.min` is unaffected (the all-over value is the floor anyway), but inheritance making MORE features carry the value is benign there. The real risk is in the cost/trim-pass readers.

Let me confirm whether `TurningPrintIntakeEngine` is actually fed by `BlueprintVisionOCREngine` output (the `dim` type), and check the dim type it reads. Let me also verify the `ExtractedDimension` importers count (the type-change blast radius).

### Assistant | 2026-06-21T05:47:32.316Z

[tool_use: Bash]

### Assistant | 2026-06-21T05:47:33.415Z

[tool_use: Bash]

### User | 2026-06-21T05:47:36.528Z

[tool_result]         feature.length_mm = Math.max(feature.length_mm, val);
        break;
      case "radius":
        // Could be a fillet, contour radius, or nose radius ref
        if (!feature.od_mm) feature.od_mm = val * 2;
        break;
      case "angular":
        feature.taper_angle_deg = val;
        break;
      case "chamfer":
        // Chamfers don't change primary dimensions but set the contour
... [+712 chars truncated]

### User | 2026-06-21T05:47:39.131Z

[tool_result] === ExtractedDimension importers ===
37
src/engines/BlueprintOCRAdapter.ts
src/engines/BlueprintOCREngine.ts
src/engines/BlueprintToCADGenerationEngine.ts
src/engines/BlueprintVisionOCREngine.ts
src/engines/CADFeatureCompletenessLedgerEngine.ts
src/engines/CADLiveBlueprintOcrAdapter.ts
src/engines/DocumentInboxEngine.ts
src/engines/MachineTypeClassifierEngine.ts
src/engines/PDFBlueprintDimensionEx
... [+1335 chars truncated]

### Assistant | 2026-06-21T05:47:44.984Z

The type change is purely additive (new optional `surface_finish_ra_inherited?: boolean`), so it cannot break any of the 37 `ExtractedDimension` importers — confirmed safe (P0-safe). Adding an optional field to an interface is non-breaking in TS.

Now the critical chain is confirmed: `BlueprintVisionOCREngine` (inheritance) → `ExtractedDimension.surface_finish_ra` → `TurningPrintIntakeEngine:731` → `feature.surface_finish_Ra_um` → downstream lathe process + (via the same `surface_finish_ra_um` field convention) cost/trim-pass decisions. None of these readers consult `surface_finish_ra_inherited`.

Let me verify the test file for the engine inheritance loop (is the loop itself tested, or only the pure selector?), and check whether `BlueprintVisionOCREngine` has a test.

### Assistant | 2026-06-21T05:47:48.013Z

[tool_use: Bash]

### User | 2026-06-21T05:47:52.041Z

[tool_result]  M mcp-server/src/engines/BlueprintOCRAdapter.ts
 M mcp-server/src/engines/BlueprintOCREngine.ts
 M mcp-server/src/engines/BlueprintVisionOCREngine.ts
?? knowledge/wiki/architecture/combos/combo-blueprintocrengine.md
?? knowledge/wiki/architecture/combos/combo-blueprintvisionocrengine.md
?? knowledge/wiki/architecture/engines/print/blueprintocradapter.md
?? knowledge/wiki/architecture/engines/prin
... [+685 chars truncated]

### Assistant | 2026-06-21T05:47:56.975Z

`BlueprintOCRAdapter.ts` is also modified but wasn't in the change description. Let me check whether that's part of this unit (relevant to the orphan-closure / inheritance flow). Also, the grep for the inheritance-loop test terms returned only files that happen to contain `surface_finish` generally — let me verify none of them actually test the new `surface_finish_ra_inherited` flag or the engine loop.

### Assistant | 2026-06-21T05:48:03.113Z

[tool_use: Bash]

### Assistant | 2026-06-21T05:48:03.658Z

[tool_use: Bash]

### User | 2026-06-21T05:48:06.153Z

[tool_result] diff --git a/mcp-server/src/engines/BlueprintOCRAdapter.ts b/mcp-server/src/engines/BlueprintOCRAdapter.ts
index 351cdf72d1..8e1bb2f5a3 100644
--- a/mcp-server/src/engines/BlueprintOCRAdapter.ts
+++ b/mcp-server/src/engines/BlueprintOCRAdapter.ts
@@ -1,3 +1,4 @@
+// WIRE-EXEMPT: contract/interface module for blueprint-OCR backends, consumed by concrete impls, not an MCP dispatcher action.
 /**
  *
... [+96 chars truncated]

### User | 2026-06-21T05:48:09.616Z

[tool_result] === inherited flag asserted anywhere? ===
NONE
=== loop test: surface_finishes raw input fed to vision engine in tests? ===
NONE in vision engine tests

### Assistant | 2026-06-21T05:48:19.134Z

Confirmed two important gaps:

1. The `BlueprintOCRAdapter.ts` change is just a `// WIRE-EXEMPT:` comment (unrelated to the finish logic — likely added to silence an unwired-asset audit). Cosmetic, non-breaking.

2. **The engine inheritance loop itself is NOT tested.** Only the pure `selectPartDefaultFinish`/`mapSurfaceFinishes` selectors have tests. There is no test that:
   - feeds a `RawVisionResponse` with `surface_finishes: ["63 RMS all over"]` + dimensions through `analyzeBlueprint`/`convertDimensions`,
   - asserts that dimensions lacking a finish get `surface_finish_ra` set AND `surface_finish_ra_inherited === true`,
   - asserts a dimension WITH its own drawn finish is NOT overwritten,
   - asserts the inherited flag is absent on already-finished dims.

The `surface_finish_ra_inherited` flag is asserted in ZERO tests. The R9 question: would a test fail if the loop broke? No engine-level test exists, so the loop's behavior (the actual mutation that creates the blast radius) is unverified by the test suite. Per R15, the requirement is to round-trip through the consumer, not just test the singleton/pure-helper.

Let me verify the pure-selector tests are real reference values (they look strong) and double-check one subtle correctness concern: the `selectPartDefaultFinish` filter uses `typeof f.ra_um === "number"` — but `mapSurfaceFinishCallout` can produce `ra_um: null`. Let me also verify the over-application failure-mode coverage and the regex behavior against a tricky location string.

### Assistant | 2026-06-21T05:48:20.397Z

[tool_use: Bash]

### User | 2026-06-21T05:48:23.373Z

[tool_result]     expect(resolveSurfaceFinishRa(0.8)).toBe(0.8);
    expect(resolveSurfaceFinishRa(1.6)).toBe(1.6);
  });
  it("string callout normalized", () => {
    expect(resolveSurfaceFinishRa("63 RMS")).toBe(1.6002);
    expect(resolveSurfaceFinishRa("N6")).toBe(0.8);
    expect(resolveSurfaceFinishRa("125 " + MU + "in")).toBe(3.175);
  });
  it("null / unresolvable -> undefined (no silent guess)", () => 
... [+3454 chars truncated]

### Assistant | 2026-06-21T05:48:32.926Z

The pure-selector tests are genuinely strong (real reference values, cover over-application: location-specific NOT applied, 2 all-over → null, null ra_um ineligible, one all-over + one specific → the all-over). R9-compliant for the pure layer.

Now let me examine one subtle correctness concern in `selectPartDefaultFinish`: it filters `typeof f.ra_um === "number"`. A callout with `ra_um: null` is correctly excluded. Good. But there is a more subtle issue — the all-over regex. Consider a single location-specific finish whose location text happens to contain an all-over word, e.g. `"typical bore"` or `"all 4 holes"`. The regex `\btyp(?:ical)?\b` and `\ball\b` would match, making a genuinely location-scoped finish be treated as the part-wide default. Let me verify the regex word-boundary behavior on a realistic adversarial location and check there's no false-positive coverage in the tests.

The regex is `/\b(?:all|overall|unless\s+(?:otherwise\s+)?(?:noted|specified)|u\.?o\.?s\.?|typ(?:ical)?|every|throughout)\b/i`. Note `"all 4 holes"` contains the word `all` → would match → a location-specific 4-hole finish would be treated as all-over. There's no test covering this false-positive direction. Let me check the `assumed` provenance concern and confirm the inherited finish carries no confidence/`assumed` propagation onto the dimension.

### Assistant | 2026-06-21T05:48:39.841Z

[tool_use: Bash]

### User | 2026-06-21T05:48:43.237Z

[tool_result] === does the inherited dim carry assumed/confidence provenance? (loop only copies ra_um) ===
    if (partDefaultFinish && partDefaultFinish.ra_um != null) {
      for (const d of dimensions) {
        if (d.surface_finish_ra == null) {
          d.surface_finish_ra = partDefaultFinish.ra_um;
          d.surface_finish_ra_inherited = true;
        }
      }

=== node quick-check: regex false-positi
... [+192 chars truncated]

### Assistant | 2026-06-21T05:48:52.128Z

The regex confirms several false-positive concerns:
- `"all 4 holes"` → true (a location-specific finish on 4 holes would be treated as the part-wide default)
- `"typical bore"` → true (a bore-typical finish, location-scoped, treated as all-over)
- `"overall length"` → true (a finish callout located near "overall length" — though finishes rarely attach to length, the `overall` token is in the vocabulary)

The good news: `selectPartDefaultFinish` requires **exactly ONE** all-over callout. If a drawing has one genuine all-over finish plus one of these false-positive location-specific finishes, both would count as "all-over" → `allOver.length === 2` → returns null (no inheritance). So the false positive degrades to "no inheritance" (safe) when a real all-over also exists. The dangerous case is a drawing with a SINGLE finish that is location-specific but whose location string contains an all-over word (e.g. only `"typical bore Ra 0.4"`) → it would be wrongly applied to every dimension. This is an edge but real, and it feeds the cost (1.30x) / WEDM trim-pass (extra pass) readers. It is narrow, so I rate it P2 rather than P1.

Now let me verify the build compiles (the type change + import) to rule out a P0 break, and run the surfaceFinishNormalize tests.

### Assistant | 2026-06-21T05:48:53.116Z

[tool_use: Bash]

### User | 2026-06-21T05:48:56.942Z

[tool_result]  RUN  v4.1.5 H:/PRISM/mcp-server

 ✓ src/utils/__tests__/surfaceFinishNormalize.test.ts (32 tests) 7ms

 Test Files  1 passed (1)
      Tests  32 passed (32)
   Start at  00:48:56
   Duration  123ms (transform 21ms, setup 0ms, import 30ms, tests 7ms, environment 0ms)

### Assistant | 2026-06-21T05:48:59.973Z

All 32 pure-selector tests pass. Now let me do a quick tsc type-check on just the two engine files to confirm the additive type change and import compile cleanly (no P0 break).

### Assistant | 2026-06-21T05:49:01.390Z

[tool_use: Bash]

### User | 2026-06-21T05:49:28.648Z

[tool_result] === exit grep done (empty = no errors in these files) ===

### Assistant | 2026-06-21T05:49:34.005Z

No tsc errors in any of the three changed files — the additive type change, the new exports, and the import all compile cleanly. The type-change blast radius across the 37 importers is safe.

Let me do one final check: confirm whether the `BlueprintVisionResult.surface_finishes` field (the part-level orphan being closed) actually now has a consumer, or whether closing one orphan just created the new `surface_finish_ra_inherited` write-only orphan. I've already confirmed `surface_finish_ra_inherited` has zero readers. Let me confirm `BlueprintVisionResult.surface_finishes` (the part-level channel) also has no reader, to assess the "genuinely closes the orphan" honesty claim precisely.

### Assistant | 2026-06-21T05:49:34.873Z

[tool_use: Grep]

### User | 2026-06-21T05:49:35.866Z

[tool_result] src\engines\BlueprintVisionOCREngine.ts:434:    const surfaceFinishes = mapSurfaceFinishes(raw.surface_finishes);
src\tools\dispatchers\cadDispatcher.ts:2981:              surface_finishes: [...base.surface_finishes, ...rescue.surface_finishes],
src\__tests__\file-format-engines.test.ts:548:    expect(result.surface_finishes.length).toBeGreaterThanOrEqual(2);
src\__tests__\file-format-engines.test
... [+6367 chars truncated]

### Assistant | 2026-06-21T05:50:20.314Z

This is the decisive honesty finding. The `surface_finishes` references in those readers (`LathePrintIngestPipelineEngine`, `LatheTurningFeatureRecognizerEngine`, `MultiProcessCAMRouterEngine`, `PDFBlueprintDimensionExtractorEngine`, etc.) are a **DIFFERENT** `surface_finishes` shape — they use fields `.ra`, `.unit`, `.feature_id`, `.confidence` — those belong to other engines' result types (PDF/Lathe intake pipelines), NOT `BlueprintVisionResult.surface_finishes` (which is the new `SurfaceFinishCallout[]` with `ra_um`/`location`/`raw_text`/`finish_system`). 

The only reader of `BlueprintVisionOCREngine`'s own `raw.surface_finishes` is the engine itself at line 434. So:
- `BlueprintVisionResult.surface_finishes` (the new part-level output field): **no external consumer** — it's surfaced on the result but nothing reads it.
- `surface_finish_ra_inherited`: **no consumer** (write-only).

The orphan claim needs precision: the change closes the orphan in the sense that the part-level `surface_finishes` data now FEEDS the dimension inheritance (an internal consumer), and the inherited Ra DOES flow to real downstream readers via `surface_finish_ra`. So the part-level finish data is no longer fully dropped — that part of the claim is honest. But the NEW provenance flag `surface_finish_ra_inherited` is itself an orphan (no consumer can act on the inherited-vs-drawn distinction it was created to enable), and the `BlueprintVisionResult.surface_finishes` result field has no external reader yet.

I have enough to render a verdict. Let me compile the findings.

## VERDICT: FAIL

**summary:** The pure layer (`selectPartDefaultFinish`/`mapSurfaceFinishes`/`mapSurfaceFinishCallout` in `src/utils/surfaceFinishNormalize.ts`) is well-designed, conservative (single unambiguous all-over only), and has genuine R9 reference-value tests (32/32 pass, including the over-application failure modes). The additive type change is non-breaking across all 37 `ExtractedDimension` importers and tsc-c
... [+5949 chars truncated]
