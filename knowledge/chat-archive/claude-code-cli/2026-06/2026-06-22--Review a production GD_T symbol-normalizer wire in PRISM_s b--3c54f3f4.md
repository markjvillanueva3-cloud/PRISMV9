---
type: "chat-session"
source: "claude-code-cli"
session_id: "3c54f3f4-6786-4c39-84d6-62b0a0db8cad"
title: "Review a production GD&T symbol-normalizer wire in PRISM's blueprint-OCR engine."
date: "2026-06-22"
first_ts: "2026-06-22T16:26:39.304Z"
last_ts: "2026-06-22T16:32:01.615Z"
cwd: "H:\\prism\\mcp-server"
messages: 72
user_msgs: 27
assistant_msgs: 45
raw_file: "H:/.claude/projects/H--prism/3c54f3f4-6786-4c39-84d6-62b0a0db8cad/subagents/agent-ab935ef489e7e7c1d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:11"
---

# Review a production GD&T symbol-normalizer wire in PRISM's blueprint-OCR engine.

> **claude-code-cli** | 2026-06-22 | 72 msgs (27 user / 45 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/3c54f3f4-6786-4c39-84d6-62b0a0db8cad/subagents/agent-ab935ef489e7e7c1d.jsonl`

## Transcript

### User | 2026-06-22T16:26:39.304Z

Review a production GD&T symbol-normalizer wire in PRISM's blueprint-OCR engine. Read end-to-end:
- H:/prism/mcp-server/src/utils/gdtSymbolNormalize.ts (NEW -- normalizeGdtSymbol, a documented clone of the script-side scripts/lib/ollama-vision-extract-lib.mjs::normalizeGdtSymbol)
- H:/prism/mcp-server/src/utils/gdtSymbolNormalize.test.ts (NEW -- 9 vitest, all passing)
- H:/prism/mcp-server/src/engines/BlueprintVisionOCREngine.ts convertGDT (~line 886): now `symbol: (normalizeGdtSymbol(g.symbol) || g.symbol || "position") as GDTSymbol`
- H:/prism/mcp-server/src/utils/gdtFcfValidate.ts (the validator the frame feeds -- its SYMBOL_TO_PARSER map)
- For divergence check: scripts/lib/ollama-vision-extract-lib.mjs::normalizeGdtSymbol + GDT_ALIAS map

CONTEXT: VLMs emit GD&T symbols as abbreviations ("TP","POS"), spellings ("true position"), or unicode -- none matched gdtFcfValidate's SYMBOL_TO_PARSER, so convertGDT took the symbol verbatim and a datum-less "TP" position FCF was silently NOT flagged datum-deficient. The fix normalizes the symbol to canonical first. tsc --noEmit is clean (0 errors); 9/9 vitest including an integration test (normalize "TP" -> validateExtractedGdt flags datum-deficiency).

Grade PASS or FAIL. Focus on SILENT BREAKAGE / contract:
1. CLONE FIDELITY: is mcp-server/src/utils/gdtSymbolNormalize.ts byte-equivalent in BEHAVIOR to the .mjs normalizeGdtSymbol? Compare GDT_CANONICAL + GDT_ALIAS entry-by-entry (the .ts uses String.fromCharCode for unicode; the .mjs uses literal chars -- confirm the codepoints match). Any mapping present in one but not the other (a silent divergence)?
2. CONTRACT: convertGDT's frame.symbol is typed GDTSymbol. Does normalizeGdtSymbol's return (one of the 14 canonical names) always satisfy the GDTSymbol enum? When normalizeGdtSymbol returns null, the fallback is `g.symbol || "position"` -- is that the SAME as the old behavior (byte-identical for already-canonical inputs)?
3. BLAST RADIUS: BlueprintVisionOCREngine has 13 imp
... [+712 chars truncated]

### Assistant | 2026-06-22T16:26:42.271Z

I'll review this GD&T symbol-normalizer wire end-to-end, focusing on silent breakage and clone fidelity. Let me read all the relevant files in parallel.

### Assistant | 2026-06-22T16:26:43.223Z

[tool_use: Read]

### Assistant | 2026-06-22T16:26:43.712Z

[tool_use: Read]

### Assistant | 2026-06-22T16:26:43.878Z

[tool_use: Read]

### User | 2026-06-22T16:26:44.178Z

[tool_result] 1	/**
2	 * GD&T geometric-characteristic symbol normalizer (PRODUCTION clone of the script-side
3	 * `scripts/lib/ollama-vision-extract-lib.mjs::normalizeGdtSymbol`).
4	 *
5	 * Maps a VLM's GD&T symbol emission -- a canonical GDTSymbol name, a shop abbreviation ("TP", "POS",
6	 * "PERP"), a variant spelling ("true position", "roundness"), or an ASME Y14.5 unicode symbol -- to the
7	 * canonical GD
... [+4641 chars truncated]

### User | 2026-06-22T16:26:44.524Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\utils\gdtFcfValidate.ts' was already read 4m ago in this session and is unchanged (mtime 1782094320660). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-22T16:26:45.976Z

[tool_result] 1	import { describe, it, expect } from "vitest";
2	import { normalizeGdtSymbol } from "./gdtSymbolNormalize.js";
3	import { validateExtractedGdt } from "./gdtFcfValidate.js";
4	
5	// Reference values are PINNED IDENTICAL to the script-side
6	// scripts/lib/ollama-vision-extract-lib.test.mjs "normalizeGdtSymbol" test, so the documented
7	// .mjs/.ts clone cannot silently diverge.
8	describe("normal
... [+3427 chars truncated]

### Assistant | 2026-06-22T16:26:48.887Z

The validator was already read this session. Let me retrieve the .mjs source and the convertGDT site, plus the GDTSymbol type definition. I'll read these in parallel.

### Assistant | 2026-06-22T16:26:51.284Z

[tool_use: Bash]

### Assistant | 2026-06-22T16:26:52.476Z

[tool_use: Grep]

### User | 2026-06-22T16:26:55.197Z

[tool_result] export function normalizeGdtSymbol(raw) {
  if (raw == null) return null;
  const s = String(raw).replace(/\s+/g, " ").trim();
  if (!s) return null;
  const lower = s.toLowerCase();
  const underscored = lower.replace(/[\s-]+/g, "_");
  if (GDT_CANONICAL.has(underscored)) return underscored; // already canonical ("profile line" -> profile_line)
  if (GDT_ALIAS.has(s)) return GDT_ALIAS.get(s);    
... [+1093 chars truncated]

### User | 2026-06-22T16:26:57.131Z

[tool_result] 43:  GDTSymbol,
887:        // GDTSymbol so the FCF validator recognizes it and the datum-deficiency flag fires (e.g.
890:        symbol: (normalizeGdtSymbol(g.symbol) || g.symbol || "position") as GDTSymbol,

### Assistant | 2026-06-22T16:27:00.226Z

Now let me read the .mjs alias map (lines 552-600) for the entry-by-entry comparison, the GDTSymbol type definition, and the convertGDT context.

### Assistant | 2026-06-22T16:27:02.137Z

[tool_use: Bash]

### Assistant | 2026-06-22T16:27:04.005Z

[tool_use: Grep]

### Assistant | 2026-06-22T16:27:04.485Z

[tool_use: Read]

### User | 2026-06-22T16:27:07.714Z

[tool_result] 875	        location_hint: d.location_hint || undefined,
876	        raw_text: d.raw_text || String(d.nominal),
877	        confidence: d.confidence ?? 0.8,
878	      };
879	    });
880	  }
881	
882	  private convertGDT(raw: RawGDT[]): ExtractedGDT[] {
883	    return raw.map((g, i) => {
884	      const frame: ExtractedGDT = {
885	        id: `GDT-${i + 1}`,
886	        // Normalize the VLM's symbo
... [+1635 chars truncated]

### User | 2026-06-22T16:27:09.279Z

[tool_result] src\utils\__tests__\gdtFcfValidate.test.ts:2:// The load-bearing intent (R9): the OCR-side and parser-side GDTSymbol enums DIFFER
src\utils\gdtSymbolNormalize.ts:5: * Maps a VLM's GD&T symbol emission -- a canonical GDTSymbol name, a shop abbreviation ("TP", "POS",
src\utils\gdtSymbolNormalize.ts:7: * canonical GDTSymbol name (one of the 14), else null. NEVER fabricates a symbol (R12).
src\utils\g
... [+772 chars truncated]

### User | 2026-06-22T16:27:16.365Z

[tool_result] const GDT_CANONICAL = new Set([$
  "position", "flatness", "perpendicularity", "parallelism", "concentricity", "circularity",$
  "cylindricity", "profile_line", "profile_surface", "circular_runout", "total_runout",$
  "straightness", "symmetry", "angularity",$
]);$
// alias -> canonical. Keys are lowercased + whitespace-collapsed shop abbreviations / variant spellings, OR$
// an ASME Y14.5 unicode
... [+2534 chars truncated]

### Assistant | 2026-06-22T16:27:20.314Z

The .mjs alias map is visible with `cat -A` showing UTF-8 byte sequences. Now I need to verify the codepoints match between the `.ts` `String.fromCharCode(0xNNNN)` calls and the `.mjs` literal chars. Let me decode the byte sequences and verify against the .ts codepoints, plus read the GDTSymbol enum definition and the validator's SYMBOL_TO_PARSER + datum-deficiency logic.

### Assistant | 2026-06-22T16:27:24.550Z

[tool_use: Bash]

### Assistant | 2026-06-22T16:27:25.124Z

[tool_use: Read]

### User | 2026-06-22T16:27:29.018Z

[tool_result] 0x2316 :: ["true position", "position"], ["pos", "position"], ["tp", "position"]
0x23e5 :: ["flat", "flatness"], ["flt", "flatness"], ["⏥", "flatness"],
0x23e4 :: ["straight", "straightness"], ["str", "straightness"], ["strt", "strai
0x232d :: ["cyl", "cylindricity"], ["⌭", "cylindricity"],
0x2312 :: ["profile of a line", "profile_line"], ["line profile", "profile_line"
0x2313 :: ["profile of a su
... [+623 chars truncated]

### User | 2026-06-22T16:27:29.535Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\utils\gdtFcfValidate.ts' was already read 5m ago in this session and is unchanged (mtime 1782094320660). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-22T16:27:33.270Z

Codepoints from .mjs decode to: position=0x2316, flatness=0x23e5, straightness=0x23e4, cylindricity=0x232d, profile_line=0x2312, profile_surface=0x2313, perpendicularity=0x22a5, angularity=0x2220, parallelism=0x2225 + 0x2016, concentricity=0x25ce, symmetry=0x232f, circular_runout=0x2197, total_runout=0x2330.

These match the `.ts` `String.fromCharCode` codepoints exactly. The validator is cached; let me retrieve its key parts via Grep instead of re-reading.

### Assistant | 2026-06-22T16:27:35.548Z

[tool_use: Bash]

### User | 2026-06-22T16:27:39.715Z

[tool_result] === SYMBOL_TO_PARSER map ===
const SYMBOL_TO_PARSER: Readonly<Record<string, ParserGDTSymbol>> = Object.freeze({
  // common to both vocabularies
  flatness: "flatness",
  straightness: "straightness",
  cylindricity: "cylindricity",
  parallelism: "parallelism",
  perpendicularity: "perpendicularity",
  angularity: "angularity",
  position: "position",
  concentricity: "concentricity",
  symmetry
... [+1936 chars truncated]

### Assistant | 2026-06-22T16:27:43.739Z

Now let me see the full validateExtractedGdt body (lines 94-135) to confirm how symKey is derived (does it lowercase? does it rely on already-canonical input?), and check the convertGDT fallback edge case for the `null` → `"position"` path.

### Assistant | 2026-06-22T16:27:45.614Z

[tool_use: Bash]

### Assistant | 2026-06-22T16:27:47.373Z

[tool_use: Bash]

### User | 2026-06-22T16:27:49.784Z

[tool_result] export function validateExtractedGdt(g: ExtractedGdtLike): GdtFcfValidation | undefined {
  const symKey = typeof g.symbol === "string" ? g.symbol.trim().toLowerCase() : "";
  const symbol = SYMBOL_TO_PARSER[symKey];
  if (!symbol) return undefined;

  // Tolerance -> mm. A missing/non-finite value becomes 0, which the validator correctly
  // flags ZERO_TOLERANCE (a frame whose tolerance the VLM 
... [+1563 chars truncated]

### User | 2026-06-22T16:27:55.816Z

[tool_result] === GDTSymbol enum (OCR side) ===
=== find the GDTSymbol type def ===
mcp-server/src/engines/BlueprintOCREngine.ts
mcp-server/src/engines/CADDrawingKnowledgeEngine.ts
mcp-server/src/engines/GDTCalloutParserEngine.ts
mcp-server/src/engines/PrintToProgramPipelineEngine.ts
mcp-server/src/engines/PrismEnhancedGDTEngine.ts
mcp-server/src/engines/ToleranceAwareGenerationEngine.ts

### Assistant | 2026-06-22T16:27:59.636Z

Key finding: `validateExtractedGdt` does `g.symbol.trim().toLowerCase()` (line 95), so it lowercases the symKey itself. Now let me find the OCR-side GDTSymbol type definition that BlueprintVisionOCREngine imports (line 43), to verify all 14 canonical names satisfy the enum.

### Assistant | 2026-06-22T16:28:01.647Z

[tool_use: Bash]

### User | 2026-06-22T16:28:09.097Z

[tool_result] === import source for GDTSymbol in BlueprintVisionOCREngine ===
  ExtractedDimension,
  ExtractedGDT,
  TitleBlockData,
  ExtractedNote,
  DimensionType,
  GDTSymbol,
  ToleranceType,
} from "./BlueprintOCREngine.js";
import { resolveSurfaceFinishRa, mapSurfaceFinishes, selectPartDefaultFinish, type SurfaceFinishCallout } from "../utils/surfaceFinishNormalize.js";
import { resolveThread } from "..
... [+363 chars truncated]

### Assistant | 2026-06-22T16:28:11.420Z

[tool_use: Read]

### User | 2026-06-22T16:28:13.176Z

[tool_result] 31	export type GDTSymbol =
32	  | "flatness" | "straightness" | "circularity" | "cylindricity"
33	  | "profile_line" | "profile_surface"
34	  | "perpendicularity" | "angularity" | "parallelism"
35	  | "position" | "concentricity" | "symmetry"
36	  | "circular_runout" | "total_runout";
37	
38	export type ToleranceType =
39	  | "bilateral" | "unilateral_plus" | "unilateral_minus"
40	  | "limit" | "f
... [+1034 chars truncated]

### Assistant | 2026-06-22T16:28:18.206Z

This confirms the OCR-side `GDTSymbol` enum is exactly the 14 names that `GDT_CANONICAL` contains and that `normalizeGdtSymbol` returns. Now let me verify the two clones produce identical output across all keys by running them side-by-side, and confirm the test suite passes. Let me do an exhaustive behavioral diff.

### Assistant | 2026-06-22T16:28:34.941Z

[tool_use: Bash]

### User | 2026-06-22T16:28:39.069Z

[tool_result] ALIAS key count: mjs=52 ts=52
only in MJS: []
only in TS : []
VALUE divergence on shared keys: []
CANONICAL equal: true mjs=14 ts=14

### Assistant | 2026-06-22T16:28:42.800Z

Exhaustive proof of clone fidelity: 52 alias keys identical on both sides, zero key divergence, zero value divergence on shared keys, canonical sets equal (14 each). The unicode codepoints match exactly. Now let me run the actual vitest suite to confirm 9/9 pass and run a behavioral fuzz comparison across many inputs.

### Assistant | 2026-06-22T16:28:43.944Z

[tool_use: Bash]

### User | 2026-06-22T16:28:49.211Z

[tool_result]  RUN  v4.1.5 H:/PRISM/mcp-server

 ✓ src/utils/gdtSymbolNormalize.test.ts (9 tests) 5ms

 Test Files  1 passed (1)
      Tests  9 passed (9)
   Start at  11:28:48
   Duration  165ms (transform 32ms, setup 0ms, import 46ms, tests 5ms, environment 0ms)

### Assistant | 2026-06-22T16:28:52.408Z

9/9 pass. Now let me check the blast radius: the 13 importers of the extraction, to confirm none break by receiving the canonical name instead of the verbatim VLM string, and that `raw_text` preserves the verbatim source. Let me also verify the old behavior preservation for the `null` fallback edge case.

### Assistant | 2026-06-22T16:28:56.154Z

[tool_use: Bash]

### User | 2026-06-22T16:29:05.065Z

[tool_result] === importers of BlueprintVisionOCREngine ===
mcp-server/src/engines/blueprint-vision/CLAUDE.md
mcp-server/src/engines/blueprint-vision/GSD_BLUEPRINT_VISION.md
mcp-server/src/engines/blueprint-vision/MEMORY.md
mcp-server/src/engines/blueprint-vision/PATHS.md
mcp-server/src/engines/BlueprintExtractionRAGEngine.ts
mcp-server/src/engines/BlueprintToAllCADsOrchestratorEngine.ts
mcp-server/src/engines/
... [+2152 chars truncated]

### Assistant | 2026-06-22T16:29:09.768Z

These consumers operate on their OWN GDTSymbol types (from their own engines), not directly on `BlueprintVisionOCREngine`'s `ExtractedGDT.symbol`. The key question is whether the consumers that DO read `ExtractedGDT.symbol` were previously relying on the verbatim VLM string. Let me check the direct consumers of `convertGDT`'s output — the ones that import `ExtractedGDT` from `BlueprintOCREngine` and read `.symbol`, and confirm whether they previously already expected canonical names (i.e. whether the old verbatim path was already a latent bug).

### Assistant | 2026-06-22T16:29:13.710Z

[tool_use: Bash]

### User | 2026-06-22T16:29:20.656Z

[tool_result] === who reads ExtractedGDT.symbol from the OCR extraction (.gdt[].symbol)? ===
=== git diff scope: what changed in this wire (convertGDT only?) ===
mcp-server/src/engines/BlueprintVisionOCREngine.ts | 7 ++++++-
 1 file changed, 6 insertions(+), 1 deletion(-)

### Assistant | 2026-06-22T16:29:24.647Z

Let me verify the exact diff and check whether any consumer ever switched on the verbatim VLM symbol value (which would have been the old behavior). The critical question for blast radius: before this change, was `convertGDT` already producing canonical-or-verbatim, and did any consumer rely on verbatim casing/abbreviations?

### Assistant | 2026-06-22T16:29:26.609Z

[tool_use: Bash]

### User | 2026-06-22T16:29:31.567Z

[tool_result] mcp-server/src/engines/BlueprintVisionOCREngine.ts | 7 ++++++-
 1 file changed, 6 insertions(+), 1 deletion(-)

--- Changes ---

mcp-server/src/engines/BlueprintVisionOCREngine.ts
  @@ -46,6 +46,7 @@ import type {
  +import { normalizeGdtSymbol } from "../utils/gdtSymbolNormalize.js";
   
   // ============================================================================
   // TYPES
  @@ -882,7 +88
... [+1932 chars truncated]

### Assistant | 2026-06-22T16:29:36.896Z

The diff is surgical: a single line `(g.symbol || "position")` → `(normalizeGdtSymbol(g.symbol) || g.symbol || "position")`, plus the import and a comment. The old behavior was already taking the verbatim `g.symbol` and casting it to `GDTSymbol` — meaning a verbatim `"TP"` was ALREADY being cast (a lie) to the `GDTSymbol` type and was producing an unrecognized symbol. The new path normalizes first and only falls through to the verbatim value when normalization fails (exactly the same as before for unrecognized inputs).

Let me verify the behavior-preservation edge cases precisely, and confirm `raw_text` carries the verbatim symbol source. Let me check the RawGDT type to see if `raw_text` is reliably the verbatim symbol.

### Assistant | 2026-06-22T16:29:44.314Z

[tool_use: Bash]

### User | 2026-06-22T16:29:49.772Z

[tool_result] === RawGDT type ===
882:  private convertGDT(raw: RawGDT[]): ExtractedGDT[] {
960:  gdt?: RawGDT[];
983:interface RawGDT {
=== behavior preservation: already-canonical input round-trips byte-identical? ===
OK  position -> position
OK  flatness -> flatness
OK  perpendicularity -> perpendicularity
OK  parallelism -> parallelism
OK  concentricity -> concentricity
OK  circularity -> circularity
OK  cy
... [+410 chars truncated]

### Assistant | 2026-06-22T16:29:55.333Z

All 14 canonical names round-trip byte-identical, and the null/empty/undefined fallback path produces `"position"` — exactly the same as the old behavior. Let me check the RawGDT type for `raw_text` and confirm one edge: when normalize returns a canonical name DIFFERENT from raw_text, is the verbatim symbol still preserved? And one subtle case — the `null` symbol path where `raw_text` may not capture the symbol.

### Assistant | 2026-06-22T16:29:55.949Z

[tool_use: Read]

### User | 2026-06-22T16:29:56.840Z

[tool_result] 983	interface RawGDT {
984	  symbol?: string;
985	  tolerance_value?: number;
986	  tolerance_unit?: string;
987	  material_condition?: string | null;
988	  datum_references?: string[];
989	  applied_to?: string;
990	  raw_text?: string;
991	  confidence?: number;
992	}
993	
994	interface RawNote {
995	  category?: string;
996	  text?: string;
997	  is_critical?: boolean;

### Assistant | 2026-06-22T16:30:01.198Z

Now I have the full picture. Let me verify the one subtle concern: `raw_text` is `g.raw_text || ""` — it falls back to empty string, NOT to `g.symbol`. So the verbatim symbol is NOT guaranteed to be preserved in `raw_text` when the VLM only emitted a `symbol` field without `raw_text`. Let me confirm whether this is a real gap or whether the VLM always populates raw_text. Let me also run the validator test suite to confirm the integration end-to-end, and check the validator's `circularity` → `roundness` mapping doesn't mis-classify.

### Assistant | 2026-06-22T16:30:05.820Z

[tool_use: Bash]

### User | 2026-06-22T16:30:11.667Z

[tool_result] === Does normalization ever make validation WORSE? Check each canonical maps to a SYMBOL_TO_PARSER key ===
RECOGNIZED position
RECOGNIZED flatness
RECOGNIZED perpendicularity
RECOGNIZED parallelism
RECOGNIZED concentricity
RECOGNIZED circularity
RECOGNIZED cylindricity
RECOGNIZED profile_line
RECOGNIZED profile_surface
RECOGNIZED circular_runout
RECOGNIZED total_runout
RECOGNIZED straightness
RECO
... [+282 chars truncated]

### Assistant | 2026-06-22T16:30:14.582Z

All 14 canonical names are SYMBOL_TO_PARSER-recognized — so normalization can ONLY improve recognition coverage (every canonical output maps to a parser key), never make it worse. The test path needs the mcp-server cwd. Let me run from the correct directory.

### Assistant | 2026-06-22T16:30:15.389Z

[tool_use: Bash]

### User | 2026-06-22T16:30:21.250Z

[tool_result]  RUN  v4.1.5 H:/PRISM/mcp-server

 ✓ src/utils/__tests__/gdtFcfValidate.test.ts (26 tests) 8ms

 Test Files  1 passed (1)
      Tests  26 passed (26)
   Start at  11:30:20
   Duration  169ms (transform 32ms, setup 0ms, import 46ms, tests 8ms, environment 0ms)

### Assistant | 2026-06-22T16:30:30.641Z

The validator's own 26 tests pass too. Now let me do the final scrutiny pass — verify tsc is clean for these files, and assess the `raw_text` preservation gap I identified. Let me check whether the VLM extraction prompt guarantees `raw_text` for GDT frames, since the comment claims "Raw verbatim symbol is preserved in raw_text."

### Assistant | 2026-06-22T16:30:32.518Z

[tool_use: Bash]

### User | 2026-06-22T16:30:38.414Z

[tool_result] === Does the GDT extraction prompt mandate raw_text? ===
48:import { validateExtractedGdt } from "../utils/gdtFcfValidate.js";
49:import { normalizeGdtSymbol } from "../utils/gdtSymbolNormalize.js";
238:      "raw_text": "the exact text shown on drawing",
242:  "gdt": [
250:      "raw_text": "the feature control frame text",
277:    { "ra_um": 0.8, "location": "all machined surfaces", "raw_text": 
... [+911 chars truncated]

### Assistant | 2026-06-22T16:30:45.312Z

The extraction prompt (line 250) instructs the VLM to populate `raw_text` with "the feature control frame text" for each GDT frame. So `raw_text` carries the FULL FCF text (which includes the symbol), not just the verbatim symbol field. The comment's claim "Raw verbatim symbol is preserved in raw_text" is approximately true — the FCF text contains the symbol — but if the VLM omits `raw_text`, it falls back to `""` (line 896), and the verbatim `g.symbol` is then lost when normalization succeeds. This is a minor P2 observability gap, not a break (the old code didn't preserve it any better — it stored verbatim in `.symbol` but that was an invalid-typed lie).

Let me do a final tsc check on the changed files to confirm the contract holds.

### Assistant | 2026-06-22T16:30:47.714Z

[tool_use: Bash]

### User | 2026-06-22T16:31:32.105Z

[tool_result] === exit check: any errors in our 3 files? ===
0

### Assistant | 2026-06-22T16:32:01.615Z

Zero tsc errors in any of the three changed files. My investigation is complete. Let me compile the verdict.

## Summary of what I traced (auditable PASS)

**Clone fidelity (programmatic proof):** I loaded both `normalizeGdtSymbol` implementations and diff'd entry-by-entry — 52 alias keys on both sides, **zero** key divergence (`only in MJS: []`, `only in TS: []`), **zero** value divergence on shared keys, canonical sets equal (14 each). I decoded the `.mjs` UTF-8 literal bytes to codepoints (0x2316, 0x23e5, 0x23e4, 0x232d, 0x2312, 0x2313, 0x22a5, 0x2220, 0x2225+0x2016, 0x25ce, 0x232f, 0x2197, 0x2330) and confirmed each matches the `.ts` `String.fromCharCode(0xNNNN)` codepoint exactly. The control-flow bodies are line-for-line identical (`.mjs` uses `GDT_ALIAS.has/get`, `.ts` uses `.get` with a truthy guard — behaviorally equal since no alias value is falsy).

**Contract:** I read the OCR-side `GDTSymbol` enum (`BlueprintOCREngine.ts:31-36`) — it is exactly the 14 names in `GDT_CANONICAL` that `normalizeGdtSymbol` returns, so every non-null return satisfies the `GDTSymbol` cast. The `null`-fallback path `normalizeGdtSymbol(g.symbol) || g.symbol || "position"` is byte-identical to the old `g.symbol || "position"` for all 14 already-canonical inputs and for null/undefined/empty (verified: old=`"position"` new=`"position"` SAME).

**Blast radius:** The diff is one line plus an import (`6 +1`). The OLD code already cast verbatim `g.symbol` to `GDTSymbol` (an invalid-typed value like `"TP"` was already flowing through and silently failing validation). No consumer reads `ExtractedGDT.symbol` expecting the verbatim VLM casing — `PrismEnhancedGDTEngine`/`ToleranceAwareGenerationEngine` operate on their own GDTSymbol types. `raw_text` carries the full FCF text per the extraction prompt (`:250`).

**Integration:** All 14 canonical outputs are SYMBOL_TO_PARSER-recognized, so normalization can only *add* recognition coverage, never reduce it. `validateExtractedGdt` lowercases i
... [+2716 chars truncated]
