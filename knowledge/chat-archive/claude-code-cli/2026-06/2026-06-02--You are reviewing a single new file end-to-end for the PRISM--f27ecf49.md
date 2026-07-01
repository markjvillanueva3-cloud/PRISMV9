---
type: "chat-session"
source: "claude-code-cli"
session_id: "f27ecf49-ca75-4d3e-b761-aa4fa25998f6"
title: "You are reviewing a single new file end-to-end for the PRISM CAD slot (delta). R"
date: "2026-06-02"
first_ts: "2026-06-02T00:34:00.968Z"
last_ts: "2026-06-02T00:37:02.632Z"
cwd: "H:\\prism-slot-delta"
messages: 32
user_msgs: 13
assistant_msgs: 19
raw_file: "H:/.claude/projects/H--prism-slot-delta/f27ecf49-ca75-4d3e-b761-aa4fa25998f6/subagents/agent-a70ffdf725886d1ec.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:42"
---

# You are reviewing a single new file end-to-end for the PRISM CAD slot (delta). R

> **claude-code-cli** | 2026-06-02 | 32 msgs (13 user / 19 assistant) | cwd: H:\prism-slot-delta
> Raw: `H:/.claude/projects/H--prism-slot-delta/f27ecf49-ca75-4d3e-b761-aa4fa25998f6/subagents/agent-a70ffdf725886d1ec.jsonl`

## Transcript

### User | 2026-06-02T00:34:00.968Z

You are reviewing a single new file end-to-end for the PRISM CAD slot (delta). Read the WHOLE file and its test.

FILE: H:/prism-slot-delta/scripts/lib/cad-fusion-feature-correction.mjs
TEST: H:/prism-slot-delta/scripts/lib/cad-fusion-feature-correction.test.mjs

CONTEXT — this is the INVERSE of an existing alias lib (H:/prism-slot-delta/scripts/lib/cad-fusion-feature-alias.mjs, read it for the contract it must invert). The alias maps recognized geometry → xray functional feature names. This new lib maps a MISSING functional feature (from diffXrayPrints' .missing[]) → a concrete CAD build op + the face-geometry signature to EXPECT after building, so a live runner can build→diff→propose→apply→re-probe→VERIFY→re-diff (close the gap, not just name it).

UNIT CONTRACT to verify:
- proposeFeatureCorrections(diff|array, opts) → ordered [{kind, buildable, op|null, expectGeometry|null, reason|null}]. Detectable features get a build op + expectGeometry; bevel_face_chamfer is NEVER buildable (undetectable by the face-geometry probe — must carry an explicit reason, no fake); unknown kinds skipped with a caveat (never guessed/dropped).
- verifyCorrectionApplied(before, after, expect) → MEASURES the result; an absent after-count must be NOT satisfied (never assume a correction worked — R12 / §measure-before-claim). externalDistinctDiameters is an absolute ≥target; others are +N deltas.
- correctionsToTrainingData → one dual-training datum per correction (print-reading side: missingFeature; cad/cam side: buildOp; verified flag).

Verify against the delta soul: NEVER silent feature-recognition fallback; topology-correct; honest (R12). Check: correctness of the inverse rule table vs the alias's forward table; edge cases (empty/null/malformed, absent counts); the verify logic's delta-vs-absolute branch; whether the expectGeometry metric keys actually match what summarizeFaceGeometry emits (read H:/prism-slot-delta/scripts/lib/cad-fusion-face-geometry-probe.mjs — does summarizeFaceGe
... [+324 chars truncated]

### Assistant | 2026-06-02T00:34:13.638Z

I'll review this file end-to-end. Let me start by reading the target file, its test, and the three dependency files that define the contract it must satisfy.

### Assistant | 2026-06-02T00:34:14.590Z

[tool_use: Read]

### Assistant | 2026-06-02T00:34:15.064Z

[tool_use: Read]

### Assistant | 2026-06-02T00:34:15.506Z

[tool_use: Read]

### Assistant | 2026-06-02T00:34:16.056Z

[tool_use: Read]

### User | 2026-06-02T00:34:26.062Z

[tool_result] 1	// cad-fusion-feature-correction.mjs — the INVERSE of the feature-alias: missing functional feature → a concrete
2	// CAD build operation that will produce the geometry the alias recognizes. The auto-correction half of the loop.
3	//
4	// U-CADTP-FEATURE-CORRECTION. The closed loop so far DETECTS gaps (diffXrayPrints → missing[]) but does not CLOSE
5	// them. This lib maps each missing xray func
... [+8642 chars truncated]

### User | 2026-06-02T00:34:26.223Z

[tool_result] 1	// Tests for cad-fusion-feature-correction.mjs — missing functional feature → concrete CAD build op (the auto-correct half).
2	//
3	// Load-bearing intents (R9/R12): (1) each DETECTABLE missing feature → a build op + the expected face-geometry delta;
4	// (2) bevel_face_chamfer is NEVER proposed (undetectable — buildable:false WITH a reason, no silent fake); (3) unknown
5	// kinds skipped with a
... [+8103 chars truncated]

### User | 2026-06-02T00:34:28.141Z

[tool_result] 1	// cad-fusion-feature-alias.mjs — map recognized geometry → xray FUNCTIONAL feature names (the confidence-gated alias).
2	//
3	// U-CADTP-FEATURE-ALIAS. The payoff layer. The three recognition layers produce GEOMETRIC facts:
4	//   • primitive-recognize → form (rectangular_block / cylindrical_body / …)
5	//   • face-type-probe      → surfaceType evidence (a cylindrical void is present)
6	//   • 
... [+6517 chars truncated]

### User | 2026-06-02T00:34:28.667Z

[tool_result] 1	// cad-fusion-face-geometry-probe.mjs — extract per-face ANALYTIC GEOMETRY (radius/axis/origin/internal) + structure it.
2	//
3	// U-CADTP-FACE-GEOMETRY-PROBE. The disambiguation layer face-type-probe deferred. The surfaceType histogram says "a
4	// cylindrical void is present" but can't say WHICH functional feature — central bore vs cross-drilled, taper vs
5	// drill-tip. The resolver is per-fa
... [+5402 chars truncated]

### Assistant | 2026-06-02T00:34:40.632Z

I have all four files. The critical P0 candidate is the metric-name match between `verifyCorrectionApplied`'s `expectGeometry` keys and what `summarizeFaceGeometry` actually emits in `.counts`. Let me verify this carefully.

`summarizeFaceGeometry` emits `counts` with EXACTLY these keys (lines 88-91):
- `internalCylinders`
- `externalCylinders`
- `internalCones`
- `externalCones`

It does NOT emit `internalCoaxialCylinders`, `internalRadialCylinders`, or `externalDistinctDiameters`.

Now let me trace `verifyCorrectionApplied`'s METRIC map (lines 88-93). This is the load-bearing question the review flags. Let me also confirm the diff lib's shape to validate the PAYOFF test and confirm there isn't an alternate summarizer that emits the richer counts.

### Assistant | 2026-06-02T00:34:41.672Z

[tool_use: Read]

### Assistant | 2026-06-02T00:34:42.477Z

[tool_use: Grep]

### User | 2026-06-02T00:34:45.465Z

[tool_result] 1	// cad-fusion-xray-print-diff.mjs — compare two xray-schema feature-presence prints (the print↔print axis for REAL OCR output).
2	//
3	// U-CADTP-XRAY-PRINT-DIFF. xray's BlueprintVision OCR emits a feature-PRESENCE print, NOT a dimensioned geom summary:
4	//   { part_class, prints:[ { pdf_path, cad_source, dimensions:[ {kind, presence_only, evidence_count, evidence_ratio} ] } ] }
5	// (verified 
... [+7315 chars truncated]

### User | 2026-06-02T00:34:47.211Z

[tool_result] scripts\lib\cad-fusion-feature-correction.test.mjs:43:  assert.equal(m.stepped_revolved_axis.expectGeometry.externalDistinctDiameters, 2);
scripts\lib\cad-fusion-feature-correction.test.mjs:79:  const v = verifyCorrectionApplied({ internalRadialCylinders: 0 }, { internalRadialCylinders: 1 }, { internalRadialCyl: 1 });
scripts\lib\cad-fusion-feature-correction.test.mjs:85:  const v = verifyCorrecti
... [+1568 chars truncated]

### Assistant | 2026-06-02T00:34:54.666Z

This confirms the central P0 concern. The grep shows the metric names `internalCoaxialCylinders`, `internalRadialCylinders`, `externalDistinctDiameters` exist ONLY in the correction lib and its test — nowhere in any producer. `summarizeFaceGeometry.counts` (the documented `before`/`after` source, per lines 80-81 of the correction lib) emits only `internalCylinders`, `externalCylinders`, `internalCones`, `externalCones`.

Let me run the test to confirm whether it actually passes (the test feeds fabricated `before`/`after` shapes, not real `summarizeFaceGeometry.counts` output), and check for any other producer of these counts across the whole repo.

### Assistant | 2026-06-02T00:34:55.642Z

[tool_use: Bash]

### Assistant | 2026-06-02T00:34:56.820Z

[tool_use: Grep]

### User | 2026-06-02T00:35:03.285Z

[tool_result]   ...
# Subtest: correctionsToTrainingData: one dual-training datum per correction (print side + cad side + verified flag)
ok 13 - correctionsToTrainingData: one dual-training datum per correction (print side + cad side + verified flag)
  ---
  duration_ms: 0.2484
  ...
# Subtest: PAYOFF: correcting the 2 missing detectable features raises the die diff 3/5 → 4/5 (chamfer stays missing)
ok 14 - PAY
... [+242 chars truncated]

### User | 2026-06-02T00:35:10.017Z

[tool_result] Found 2 files
scripts\lib\cad-fusion-feature-correction.test.mjs
scripts\lib\cad-fusion-feature-correction.mjs

### Assistant | 2026-06-02T00:35:23.667Z

The test passes 14/14, but that PROVES the P0 — the test never exercises real `summarizeFaceGeometry.counts` output. It hand-feeds fabricated objects with the rich metric names (`{ internalRadialCylinders: 1 }`, `{ externalDistinctDiameters: 2 }`) that the real producer never emits. The grep across all `.mjs` confirms: `internalCoaxialCylinders` / `internalRadialCylinders` / `externalDistinctDiameters` appear ONLY in the correction lib + its test, in zero producers.

Let me confirm my key chains end-to-end. The `internalCoaxialCyl` and `externalCone` keys deserve a precise trace, because the METRIC map handles them asymmetrically.

`verifyCorrectionApplied` METRIC map (lines 88-93):
- `internalCoaxialCyl` → `internalCoaxialCylinders` (producer emits `internalCylinders` — MISMATCH)
- `internalRadialCyl` → `internalRadialCylinders` (producer emits `internalCylinders` — MISMATCH)
- `externalCone` → `externalCones` (producer emits `externalCones` — MATCH)
- `externalDistinctDiameters` → `externalDistinctDiameters` (producer never emits this at all — MISMATCH)

So 3 of the 4 expectGeometry metrics map to count keys that `summarizeFaceGeometry` never emits. Since the verify logic does `Number(a[metric])` → `NaN` → `Number.isFinite(afterN)` false → `satisfied=false`, in production EVERY correction whose expect key is one of those three will be reported `applied:false` no matter how correctly the build op worked — the exact silent-never-satisfy P0 the review brief named.

There's a deeper modeling issue too: even `summarizeFaceGeometry.counts.internalCylinders` is a flat total, not split by coaxial vs radial. There is no count that distinguishes a coaxial bore from a radial bore. So the verify metrics aren't merely misnamed — the producer doesn't compute coaxial/radial/distinct-diameter counts at all. The runner would need a richer summarizer that doesn't exist yet.

Let me verify there's no live runner that produces these counts, and check what consumes `verifyCorrectionAp
... [+31 chars truncated]

### Assistant | 2026-06-02T00:35:25.081Z

[tool_use: Grep]

### Assistant | 2026-06-02T00:35:26.578Z

[tool_use: Grep]

### User | 2026-06-02T00:35:31.926Z

[tool_result] scripts\lib\cad-fusion-face-geometry-probe.mjs:88:  out.counts = {
scripts\lib\cad-fusion-face-geometry-probe.test.mjs:51:  assert.equal(s.counts.internalCylinders, 2);
scripts\lib\cad-fusion-face-geometry-probe.test.mjs:52:  assert.equal(s.counts.externalCylinders, 0);
scripts\lib\cad-fusion-face-geometry-probe.test.mjs:53:  assert.equal(s.counts.internalCones, 1);
scripts\lib\cad-fusion-face-geo
... [+1948 chars truncated]

### User | 2026-06-02T00:35:50.464Z

[tool_result] Found 5 files
scripts\lib\cad-fusion-feature-correction.test.mjs
scripts\lib\cad-fusion-feature-correction.mjs
scripts\cad-fusion-die-roundtrip.mjs
scripts\lib\cad-fusion-feature-alias.mjs
scripts\lib\cad-fusion-face-geometry-probe.test.mjs

### Assistant | 2026-06-02T00:35:54.648Z

This nails the analysis. Let me check the live runner `cad-fusion-die-roundtrip.mjs` to confirm whether it actually wires `summarizeFaceGeometry.counts` into `verifyCorrectionApplied` (the production path that would expose the P0).

### Assistant | 2026-06-02T00:35:56.725Z

[tool_use: Bash]

### User | 2026-06-02T00:36:04.109Z

[tool_result] rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
4 matches in 2 files:

78:0:[], { partAxis: PART_AXIS });
scripts/cad-fusion-die-roundtrip.mjs:7://   build (revolve) → probeFaceGeometry → summarizeFaceGeometry(partAxis) → ...
scripts/cad-fusion-die-roundtrip.mjs:23:import { probeFaceGeometry, summarizeFaceGeometry } from "./lib/cad-fusion-fa...
scri
... [+68 chars truncated]

### Assistant | 2026-06-02T00:36:11.979Z

The live runner `cad-fusion-die-roundtrip.mjs` imports `summarizeFaceGeometry` and assigns `out.faceGeometry = fgSum.counts` (line 79). It does NOT yet import or call `verifyCorrectionApplied`/`proposeFeatureCorrections` — so the correction lib isn't wired into the runner yet. But the lib's own docstring (lines 80-81) explicitly declares `before`/`after` are `summarizeFaceGeometry(...).counts`, and that `.counts` object is exactly the 4-key shape (`internalCylinders`, `externalCylinders`, `internalCones`, `externalCones`). When a runner does wire it — which is the entire stated purpose ("a live runner can build→diff→propose→apply→re-probe→VERIFY") — 3 of 4 metrics will silently never satisfy.

Let me read the roundtrip runner's relevant section to be precise about the documented contract and confirm there's no richer counts shape produced elsewhere.

### Assistant | 2026-06-02T00:36:12.913Z

[tool_use: Read]

### User | 2026-06-02T00:36:15.674Z

[tool_result] 60	
61	  let runFailed = null;
62	  try {
63	    // BUILD the die-like part live (a fresh /new doc named with the run prefix → reapable)
64	    await post("/new", { name: DOC_PREFIX + "1" });
65	    await post("/sketch", { plane: "XY", shapes: [{ type: "line", points: DIE_PROFILE }] });
66	    const rv = await post("/revolve", { axis: "X", angle_deg: 360, operation: "new" });
67	    out.revolve = 
... [+2731 chars truncated]

### Assistant | 2026-06-02T00:37:02.632Z

Confirmed. The runner emits `out.faceGeometry = fgSum.counts` — the 4-key shape. That is precisely the object the correction lib's docstring (lines 80-81) names as the `before`/`after` source. The mismatch is real and load-bearing.

I now have everything I need. Let me also note one secondary correctness point: even if the metric names were fixed to `internalCylinders`, that flat count cannot distinguish a coaxial bore (`central_oil_hole`) from a radial bore (`cross_drilled_relief_holes`) — both increment the same `internalCylinders` total. So building a radial hole would also "satisfy" a coaxial-bore expectation, and vice-versa. The correction model fundamentally needs counts the producer doesn't compute. This makes the fix more than a rename.

Let me write up the findings.

---

## Review: `cad-fusion-feature-correction.mjs`

### Summary
Clean, pure, well-documented inverse of the alias lib. The propose/skip/honesty logic is correct and the inverse rule table is faithful to the alias's forward table. The test suite passes 14/14. **However, `verifyCorrectionApplied` is broken against the real producer it documents as its input** — a P0 that the test suite masks by hand-feeding fabricated count shapes that no producer emits.

---

### P0 — `verifyCorrectionApplied` metric keys do not match what `summarizeFaceGeometry.counts` emits → silently never-satisfies in production

**`cad-fusion-feature-correction.mjs:88-93`** (the METRIC map) vs **`cad-fusion-face-geometry-probe.mjs:88-91`** (the producer).

The lib's own docstring declares the input contract (`cad-fusion-feature-correction.mjs:80-81`):
> `before/after = summarizeFaceGeometry(...).counts shape: { internalCylinders, externalCylinders, internalCones, externalCones, internalCoaxialCylinders?, internalRadialCylinders?, externalDistinctDiameters? }`

But `summarizeFaceGeometry` (probe lib lines 88-91) emits `counts` with EXACTLY four keys and never the three "?" ones:
```
internalCylinders, externalCylinders, int
... [+5988 chars truncated]
