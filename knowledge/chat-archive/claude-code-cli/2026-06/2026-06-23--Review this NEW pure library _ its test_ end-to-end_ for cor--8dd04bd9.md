---
type: "chat-session"
source: "claude-code-cli"
session_id: "8dd04bd9-222f-490f-aef6-8e4e2308de01"
title: "Review this NEW pure library + its test, end-to-end, for correctness and silent "
date: "2026-06-23"
first_ts: "2026-06-23T22:43:21.919Z"
last_ts: "2026-06-23T22:45:16.232Z"
cwd: "H:\\prism"
messages: 30
user_msgs: 11
assistant_msgs: 19
raw_file: "H:/.claude/projects/H--prism/8dd04bd9-222f-490f-aef6-8e4e2308de01/subagents/agent-a45e1529994665e19.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:17"
---

# Review this NEW pure library + its test, end-to-end, for correctness and silent 

> **claude-code-cli** | 2026-06-23 | 30 msgs (11 user / 19 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/8dd04bd9-222f-490f-aef6-8e4e2308de01/subagents/agent-a45e1529994665e19.jsonl`

## Transcript

### User | 2026-06-23T22:43:21.919Z

Review this NEW pure library + its test, end-to-end, for correctness and silent breakage. Read both files fully:
- H:/prism/scripts/lib/cad-dimension-gt-lib.mjs
- H:/prism/scripts/lib/cad-dimension-gt-lib.test.mjs

Context/contract it must satisfy (U-XRAY-CAD-GT-SCORE, slot xray): it derives a CALLOUT-CLASS dimensional ground-truth set from a neutral STEP file's geometry (radii->diameters + envelope bbox), all normalized to MILLIMETRES, then scores OCR dims (mm) against it for the recall measurement harness (validate-perfect-parts.mjs), and triangulates vs program GT (which is INCH: programGT.calloutDimsIn). It reuses extractRadiiMm/extractBboxMm from ./step-dimension-extract.mjs and clusterDiameters from ./cnc-program-gt-lib.mjs.

Verify rigorously, citing file:line:
1. UNITS correctness — no 25.4x double-convert anywhere; mm-vs-mm in the scorer; inch->mm only in triangulateGT for programGT.calloutDimsIn.
2. The callout-class over-count guard (CAD_CALLOUT_FLOOR_MM, clustering) actually filters fillet-class radii; reliability classification (cadGtClass/gtReliable) is correct for unknown-unit, no-callout-geometry, ok.
3. triangulateGT greedy 1:1 matching — confirm one CAD dim cannot corroborate two program dims; confidence enum (high/program-only/cad-only/none) is correct for every branch.
4. scorePartAgainstCadGT recall/precision math + GT de-dup + divide-by-zero guards.
5. Edge cases: empty/null/NaN/negative inputs; degenerate (planar) bbox dropped.
6. Tests are REAL reference-value assertions (not toBeDefined stubs); each is load-bearing (would fail if the logic broke). Flag any test that would pass even if the function were wrong.
7. Any inlined physics constants (MM_PER_INCH 25.4 is a definitional unit conversion, not a physics constant — acceptable, but flag any actual physics constant).

Report P0/P1/P2 findings with file:line, then a single verdict line: PASS or FAIL. Do NOT edit files — review only.

### Assistant | 2026-06-23T22:43:25.606Z

I'll review both files end-to-end. Let me read them along with their dependencies.

### Assistant | 2026-06-23T22:43:26.559Z

[tool_use: Read]

### Assistant | 2026-06-23T22:43:26.661Z

[tool_use: Read]

### User | 2026-06-23T22:43:28.659Z

[tool_result] 1	/**
2	 * cad-dimension-gt-lib.mjs -- pure: derive CALLOUT-CLASS dimensional ground truth from a part's
3	 * neutral STEP model + score/triangulate OCR dims against it (U-XRAY-CAD-GT-SCORE, slot:xray).
4	 *
5	 * WHY (the P2.7 measurement-backbone gap): `validate-perfect-parts.mjs` scores OCR recall against the
6	 * posted CNC PROGRAM only (`cnc-program-gt-lib.mjs`). On the 91-part `perfect-print-
... [+15139 chars truncated]

### User | 2026-06-23T22:43:29.021Z

[tool_result] 1	// scripts/lib/cad-dimension-gt-lib.test.mjs
2	// Tests for U-XRAY-CAD-GT-SCORE: derive callout-class dimensional GT from a neutral STEP model,
3	// score OCR dims against it, triangulate vs program GT, and adapt to the reconcile-engine candidate
4	// shape. Real STEP entity syntax (mirrors step-dimension-extract.test.mjs). Reference values computed
5	// from the documented contract; revert-the-
... [+9017 chars truncated]

### Assistant | 2026-06-23T22:43:32.896Z

Now let me verify the dependencies the lib reuses — the actual contracts of `extractRadiiMm`/`extractBboxMm` and `clusterDiameters` — since silent breakage often hides in a wrong assumption about a reused function's return shape.

### Assistant | 2026-06-23T22:43:33.846Z

[tool_use: Read]

### Assistant | 2026-06-23T22:43:33.945Z

[tool_use: Read]

### User | 2026-06-23T22:43:34.896Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\step-dimension-extract.mjs' was already read 9m ago in this session and is unchanged (mtime 1781269431226). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-23T22:43:35.831Z

[tool_result] 1	// scripts/lib/cnc-program-gt-lib.mjs
2	//
3	// U-XRAY-PERFECT-PARTS-TRUETEST — extract objective ground-truth dimensions from a CNC program, to
4	// validate what the OCR pipeline reads off the matching blueprint. The program is the STRONGEST GT
5	// available: it encodes the ACTUAL machined coordinates (what the part is literally cut to), in plain
6	// text, no STEP kernel / GPU / MCP needed. 
... [+40533 chars truncated]

### Assistant | 2026-06-23T22:43:40.689Z

I have `clusterDiameters` and `extractProgramGT` confirmed. Now I need the exact return contract of `extractRadiiMm` and `extractBboxMm` — the read-once guard says I already read it, but it's not in my visible context. Let me grep the specific signatures and return shapes to verify the lib's assumptions about `unit`, `scaleToMm`, `radiiMm`, and `bbox.dims`.

### Assistant | 2026-06-23T22:43:41.965Z

[tool_use: Grep]

### User | 2026-06-23T22:43:43.423Z

[tool_result] 14: * yields radiiMm:[] + unit:'unknown' so the caller SKIPS the file (never fabricate dims in an
27:  if (/CONVERSION_BASED_UNIT\s*\(\s*'INCH'/i.test(t)) return { unit: "inch", scaleToMm: INCH_TO_MM };
28:  if (/CONVERSION_BASED_UNIT\s*\(\s*'(FOOT|FEET)'/i.test(t)) return { unit: "foot", scaleToMm: FOOT_TO_MM };
30:  if (/SI_UNIT\s*\(\s*\.MILLI\.\s*,\s*\.METRE\./i.test(t)) return { unit: "mm", sc
... [+1490 chars truncated]

### Assistant | 2026-06-23T22:43:47.519Z

I need to verify the exact bbox ordering (descending vs not) and the `dims` sort, plus the bbox point-count threshold. Let me read the relevant slice of `extractBboxMm` to confirm `dims` is descending-sorted (the lib assumes `dims[2]` is the smallest) and how the `< 2 points` case behaves.

### Assistant | 2026-06-23T22:43:48.806Z

[tool_use: Read]

### User | 2026-06-23T22:43:49.949Z

[tool_result] 100	}
101	
102	const POINT_RE = /CARTESIAN_POINT\s*\(\s*'[^']*'\s*,\s*\(\s*(-?[0-9]+(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?)\s*,\s*(-?[0-9]+(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?)\s*,\s*(-?[0-9]+(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?)\s*\)/g;
103	
104	/**
105	 * Extract the axis-aligned bounding-box EXTENTS (part envelope) from STEP CARTESIAN_POINT coords,
106	 * unit-normalized to mm. Returns { dims:[L,W,H] sort
... [+2640 chars truncated]

### Assistant | 2026-06-23T22:43:53.556Z

I now have all dependency contracts confirmed. Let me also check how the consumer `validate-perfect-parts.mjs` actually calls these new functions, to verify the integration contract (the classic silent-break vector — a consumer reading the old name or wrong shape).

### Assistant | 2026-06-23T22:43:55.846Z

[tool_use: Grep]

### User | 2026-06-23T22:43:58.462Z

[tool_result] scripts\lib\cad-dimension-gt-lib.test.mjs:1:// scripts/lib/cad-dimension-gt-lib.test.mjs
scripts\lib\cad-dimension-gt-lib.test.mjs:10:  extractCadGT,
scripts\lib\cad-dimension-gt-lib.test.mjs:11:  dimMatchesCadGT,
scripts\lib\cad-dimension-gt-lib.test.mjs:12:  scorePartAgainstCadGT,
scripts\lib\cad-dimension-gt-lib.test.mjs:13:  triangulateGT,
scripts\lib\cad-dimension-gt-lib.test.mjs:14:  cadGtTo
... [+6061 chars truncated]

### Assistant | 2026-06-23T22:44:03.114Z

The lib is currently only referenced by its own test (the consumer `validate-perfect-parts.mjs` does not yet call it — this is a new pure lib not yet wired). That's a wiring-completeness note, not silent breakage, since the contract docstring says it's destined for `validate-perfect-parts.mjs`. Let me verify whether the consumer integration is in scope by checking if `validate-perfect-parts.mjs` exists and already imports the program-GT lib.

### Assistant | 2026-06-23T22:44:04.407Z

[tool_use: Grep]

### User | 2026-06-23T22:44:06.187Z

[tool_result] 32:import { extractProgramGT, extractMillProgramGT, scorePartAgainstProgram, isParsableNcText, programGtAgreementSamples } from "./lib/cnc-program-gt-lib.mjs";
313:                const score = scorePartAgainstProgram(ocrDimsMm, gt, { relTol: opts.relTol });

### Assistant | 2026-06-23T22:44:23.918Z

Confirmed: this is a new pure lib that is not yet consumed by `validate-perfect-parts.mjs` (only its own test imports it). The contract docstring frames it as feeding that harness, but the wiring is a separate (future) unit. Scope of this review is correctness of the lib + test in isolation, which is what I'll grade. Now I have everything needed to trace each item rigorously.

Let me work through the verification points against the verified dependency contracts.

**Dependency contracts confirmed:**
- `extractRadiiMm(text)` → `{unit, scaleToMm, radiiMm}`; `radiiMm:[]` and `scaleToMm:null` on unknown unit (step-dimension-extract.mjs:44-54).
- `extractBboxMm(text)` → `{dims:[L,W,H] sorted DESCENDING, maxExtentMm, pointCount}` or `null` (unknown unit OR `n<2` points) (step-dimension-extract.mjs:109-127). `dims[2]` is the smallest extent — the lib's assumption at line 110 is correct.
- `clusterDiameters(sortedAsc, relTol)` → ascending cluster reps (cluster MAX), filters non-finite/≤0 internally (cnc-program-gt-lib.mjs:192-207).
- `extractProgramGT` emits `calloutDimsIn` in INCH (cnc-program-gt-lib.mjs:255-256).

Now let me trace each verification item.

**1. UNITS — no double-convert.**
- `extractCadGT`: `radiiMm` is already mm (extractRadiiMm applied `scaleToMm`). Line 102 `r * 2` → diameter mm. No re-scale. ✓
- mm part test: 6.35 mm radius → 12.7 mm diameter, no ×25.4 (line 57-61). ✓
- `dimMatchesCadGT` / `scorePartAgainstCadGT`: mm-vs-mm, no conversion (lines 144, 171). ✓
- `triangulateGT`: only `programGT.calloutDimsIn` is ×`MM_PER_INCH` (line 244); `cadGT.calloutDimsMm` is NOT converted (line 247). ✓ Inch→mm applied exactly once, only to the inch source.

**2. Callout-floor / clustering / reliability classification.**
- Floor filter at line 103 (`d >= floor`) drops 0.508 mm (r0.01in fillet). Cluster then collapses. Test line 40-44 verifies `[12.7, 25.4]`, dropping 0.508. ✓
- `unknown-unit`: line 90-97 returns early, `gtReliable:false`. ✓
- `no-callout-geometry`: lin
... [+689 chars truncated]

### Assistant | 2026-06-23T22:44:24.670Z

[tool_use: Read]

### User | 2026-06-23T22:44:26.521Z

[tool_result] 263	  const cadOnlyMm = cadAvailable.filter((c) => !c.used).map((c) => c.v);
264	
265	  let confidence;
266	  if (corroboratedMm.length > 0) confidence = "high";
267	  else if (programMm.length > 0 && cadMm.length === 0) confidence = "program-only";
268	  else if (cadMm.length > 0 && programMm.length === 0) confidence = "cad-only";
269	  else confidence = "none";
270	
271	  return {
272	    corrob
... [+196 chars truncated]

### Assistant | 2026-06-23T22:44:47.625Z

I've confirmed the confidence branch. There's a subtle case worth flagging: **both sources non-empty but zero corroboration** (e.g. program=[12.7], cad=[99.0]). None of the four branches matches its intent cleanly:
- `corroboratedMm.length > 0` → false
- `programMm>0 && cadMm===0` → false (cad is non-empty)
- `cadMm>0 && programMm===0` → false (program is non-empty)
- → falls to `none`

So two disjoint non-empty sources return `confidence:"none"`, with `programOnlyMm=[12.7]` and `cadOnlyMm=[99.0]`. That is a defensible (conservative) result — "neither corroborated, no confident GT" — but it is NOT exercised by any test, and the enum docstring (`'high'|'program-only'|'cad-only'|'none'`) makes `none` ambiguously mean both "both-empty" and "both-present-but-disjoint". This is a P2 (semantic clarity / test-coverage gap), not a correctness bug.

Now let me verify the remaining items against the de-dup/divide-by-zero math and the test load-bearingness.

**4. scorePartAgainstCadGT math + de-dup + divide-by-zero.**
- De-dup: line 167 `[...new Set(gtRaw.map(v => +v.toFixed(3)))].filter(v => v > 0)`. For INCH_PART `calloutDimsMm = [12.7, 25.4, 50.8, 25.4, 12.7]` → distinct `{12.7, 25.4, 50.8}` = 3. Test line 126-129 asserts `gtCount===3`. ✓
- Recall: line 182 guarded by `gtDistinct.length ?` → 0 when empty (no div-by-zero). ✓
- Precision: line 185 guarded by `ocr.length ?` → 0 when empty. Test line 140-144. ✓
- Partial: OCR `[12.7, 99.0]` vs distinct `{12.7,25.4,50.8}`: gtMatched=1 → recall 1/3=0.3333; ocrMatched=1 (12.7) → precision 1/2=0.5. Test line 133-138 asserts exactly these. ✓

One thing to verify: the gtMatched loop (line 170-172) divides `Math.abs(d - g) / g`. `g` comes from `gtDistinct` which is `.filter(v => v > 0)`, so `g>0` always — no div-by-zero. And `ocr` is pre-filtered `d > 0`. ✓

**5. Edge cases.**
- empty/null/NaN/negative OCR: line 165 filters `Number.isFinite(d) && d > 0` — drops NaN, negative, zero. ✓
- null `cadGT`: line 166 `cadGT && Array.isArray(..
... [+1434 chars truncated]

### Assistant | 2026-06-23T22:44:48.383Z

[tool_use: Read]

### User | 2026-06-23T22:44:50.904Z

[tool_result] 201	export function cadGtToCandidates(cadGT, opts = {}) {
202	  if (!cadGT || !Array.isArray(cadGT.calloutDimsMm)) return [];
203	  const conf = Number.isFinite(opts.confidence)
204	    ? opts.confidence
205	    : (cadGT.gtReliable ? 0.95 : 0.5);
206	  const diam = Array.isArray(cadGT.featureDiametersMm) ? cadGT.featureDiametersMm : [];
207	  const env = Array.isArray(cadGT.envelopeMm) ? cadGT.env
... [+403 chars truncated]

### Assistant | 2026-06-23T22:45:16.232Z

Confirmed. `cadGtToCandidates` guards `calloutDimsMm` for the gate but builds output from `featureDiametersMm`+`envelopeMm` (both independently `Array.isArray`-guarded, lines 206-207). Since `extractCadGT` always emits all three fields together, real objects are consistent. The test at line 200-203 (`{}` → `[]`) covers the missing-`calloutDimsMm` gate. Defensive and correct.

One subtle behavioral note worth flagging on the test suite (R9 rigor): the `cadGtToCandidates` empty test asserts `{}` → `[]`. But an object with `calloutDimsMm:[]` and no `featureDiametersMm`/`envelopeMm` would also correctly return `[]` — that path is covered implicitly. No issue.

I've now traced every verification item against verified dependency contracts and run the arithmetic by hand. Let me record my findings.

---

VERDICT: PASS

summary: This new pure lib is units-correct end-to-end — diameters/envelope stay mm-vs-mm in the scorer, and inch→mm (`×25.4`) is applied exactly once, only to `programGT.calloutDimsIn` in `triangulateGT`; no double-convert anywhere. The over-count guard (floor + `clusterDiameters`), reliability classification, greedy 1:1 triangulation, recall/precision math (with de-dup and divide-by-zero guards), and all edge-case handling match the documented contract and the verified contracts of the three reused dependencies. The tests are real reference-value assertions (12.7/25.4/50.8/0.3333/0.5), each load-bearing. The lib is not yet consumed by `validate-perfect-parts.mjs` (only its own test imports it) — that wiring is a separate future unit, not a silent break of this diff.

findings:
- [P2] `H:/prism/scripts/lib/cad-dimension-gt-lib.mjs:265-269` -- `triangulateGT` confidence: when BOTH sources are non-empty but DISJOINT (zero corroboration, e.g. program=[12.7], cad=[99.0]), all three positive branches fail and it returns `confidence:"none"` — the same value as the truly-empty `{}` case. The result is correct/conservative (`programOnlyMm` + `cadOnlyMm` both populat
... [+1770 chars truncated]
