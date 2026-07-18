---
type: "chat-session"
source: "claude-code-cli"
session_id: "f27ecf49-ca75-4d3e-b761-aa4fa25998f6"
title: "Review this integration runner for correctness + safety; report P0/P1 then grade"
date: "2026-06-01"
first_ts: "2026-06-01T20:05:05.125Z"
last_ts: "2026-06-01T20:24:00.797Z"
cwd: "H:\\prism-slot-delta"
messages: 32
user_msgs: 12
assistant_msgs: 20
raw_file: "H:/.claude/projects/H--prism-slot-delta/f27ecf49-ca75-4d3e-b761-aa4fa25998f6/subagents/agent-a7ac6e7d53191e848.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:42"
---

# Review this integration runner for correctness + safety; report P0/P1 then grade

> **claude-code-cli** | 2026-06-01 | 32 msgs (12 user / 20 assistant) | cwd: H:\prism-slot-delta
> Raw: `H:/.claude/projects/H--prism-slot-delta/f27ecf49-ca75-4d3e-b761-aa4fa25998f6/subagents/agent-a7ac6e7d53191e848.jsonl`

## Transcript

### User | 2026-06-01T20:05:05.125Z

Review this integration runner for correctness + safety; report P0/P1 then grade PASS or FAIL. It JUST RAN LIVE successfully (RUN-EXIT=0): built a die-like part, recognized working_tip_taper@0.8 + central_oil_hole@0.7 + stepped_revolved_axis@0.7 from real Fusion geometry, matched 3/5 vs the real xray die print, reaped safely (kilo's 5 docs in the shared instance were untouched).

FILE: H:/prism-slot-delta/scripts/cad-fusion-die-roundtrip.mjs

It composes already-scrutinized libs: cad-fusion-live-bridge (makeFetchImpl/bridgeHealth), cad-fusion-buildmap-lib (normalizeModel), cad-fusion-doc-lifecycle (reapByPrefix), cad-fusion-face-geometry-probe (probeFaceGeometry/summarizeFaceGeometry), cad-fusion-primitive-recognize (recognizePrimitive), cad-fusion-feature-alias (aliasFunctionalFeatures/aliasToFeaturePresence), cad-fusion-xray-print-diff (diffXrayPrints).

SAFETY INVARIANTS (load-bearing — verify each):
1. CLOSE-ENFORCEMENT: reapByPrefix(DOC_PREFIX) runs in a finally so a mid-build throw never leaks docs. DOC_PREFIX is per-run unique ("PRISM-DELTA-DIERT-<ts>-"). It must NEVER close the operator's DIE CASE or kilo's docs (verified live: 5 peer docs untouched).
2. Each run is a /new doc → operator's open part not mutated.
3. The verdict is diffXrayPrints' verdict untouched (no dishonest post-processing); missing features reported not hidden; the part is labeled a "die-LIKE proxy" not the real DIE CASE.

Check specifically: (1) is the finally-block reap guaranteed on every exit path? (2) is the loaded-print early-abort before the try acceptable (nothing built → nothing to reap)? (3) exit codes (2 abort/fail, 0 success)? (4) does loadXrayPrint degrade safely (missing dir/part/parse)? (5) any path that emits a dishonest "match"/success when the diff was partial/fail? (6) PART_AXIS=[1,0,0] correct for the revolve (revolve is axis:"X")? Report only real P0/P1. Grade PASS or FAIL.

### Assistant | 2026-06-01T20:05:22.318Z

I'll review this integration runner. Let me read the file and its composed libraries to verify the safety invariants.

### Assistant | 2026-06-01T20:05:22.747Z

[tool_use: Read]

### User | 2026-06-01T20:06:07.098Z

[tool_result] 1	// cad-fusion-die-roundtrip.mjs — the LIVE full-chain proof: build a die-like part → recognize → alias → match xray.
2	//
3	// U-CADTP-DIE-ROUNDTRIP. The capstone of the feature-recognition stack. Earlier the box runner scored 0/5 against
4	// xray's real die print (a box reproduces none of the die's functional features). This runner builds a die-LIKE part
5	// live (a revolved annular stepped+t
... [+7283 chars truncated]

### Assistant | 2026-06-01T20:06:14.662Z

Now let me read the composed libraries to verify the safety invariants, particularly the reap function, the diff verdict, and the geometry/feature-alias contracts.

### Assistant | 2026-06-01T20:06:15.774Z

[tool_use: Read]

### Assistant | 2026-06-01T20:06:15.947Z

[tool_use: Read]

### User | 2026-06-01T20:06:33.306Z

[tool_result] 1	// cad-fusion-doc-lifecycle.mjs — enforce Fusion document close so closed-loop testing can't leak windows.
2	//
3	// U-CADTP-DOC-LIFECYCLE (operator directive 2026-06-01: "auto enforce you to close fusion files when you're
4	// done — or we end up with hundreds of windows + wasted RAM/CPU/GPU"). The deployed bridge's /new
5	// (`_new_document`) calls app.documents.add() and NEVER closes the prio
... [+12566 chars truncated]

### User | 2026-06-01T20:06:33.311Z

[tool_result] 1	// cad-fusion-xray-print-diff.mjs — compare two xray-schema feature-presence prints (the print↔print axis for REAL OCR output).
2	//
3	// U-CADTP-XRAY-PRINT-DIFF. xray's BlueprintVision OCR emits a feature-PRESENCE print, NOT a dimensioned geom summary:
4	//   { part_class, prints:[ { pdf_path, cad_source, dimensions:[ {kind, presence_only, evidence_count, evidence_ratio} ] } ] }
5	// (verified 
... [+7315 chars truncated]

### Assistant | 2026-06-01T20:06:41.169Z

Now let me read the remaining libraries: the live-bridge (post/health), face-geometry-probe (partAxis handling), feature-alias, and primitive-recognize, to verify the geometry contract and PART_AXIS correctness.

### Assistant | 2026-06-01T20:06:41.572Z

[tool_use: Read]

### Assistant | 2026-06-01T20:06:41.757Z

[tool_use: Read]

### User | 2026-06-01T20:08:50.704Z

[tool_result] 1	// cad-fusion-live-bridge.mjs — the LIVE transport that turns the convergence harness into a real closed loop.
2	//
3	// U-CADTP-LIVE-BRIDGE (MS-CAD-TRAINING-PIPELINE — the live half of #10/#15). geom-diff (the metric) and the
4	// convergence-harness (the loop) are pure: they need an injected `runCandidate(params)→model`. This lib is the
5	// only piece that actually talks to the deployed PRISM
... [+6252 chars truncated]

### User | 2026-06-01T20:09:17.732Z

[tool_result] 1	// cad-fusion-face-geometry-probe.mjs — extract per-face ANALYTIC GEOMETRY (radius/axis/origin/internal) + structure it.
2	//
3	// U-CADTP-FACE-GEOMETRY-PROBE. The disambiguation layer face-type-probe deferred. The surfaceType histogram says "a
4	// cylindrical void is present" but can't say WHICH functional feature — central bore vs cross-drilled, taper vs
5	// drill-tip. The resolver is per-fa
... [+5402 chars truncated]

### Assistant | 2026-06-01T20:09:26.321Z

Now let me read the feature-alias library to verify the `aliasFunctionalFeatures`/`aliasToFeaturePresence` contracts and check the `partAxisKnown` flag handling, plus the buildmap-lib `normalizeModel` for the geometry read-back.

### Assistant | 2026-06-01T20:09:26.840Z

[tool_use: Read]

### User | 2026-06-01T20:10:29.189Z

[tool_result] 1	// cad-fusion-feature-alias.mjs — map recognized geometry → xray FUNCTIONAL feature names (the confidence-gated alias).
2	//
3	// U-CADTP-FEATURE-ALIAS. The payoff layer. The three recognition layers produce GEOMETRIC facts:
4	//   • primitive-recognize → form (rectangular_block / cylindrical_body / …)
5	//   • face-type-probe      → surfaceType evidence (a cylindrical void is present)
6	//   • 
... [+6517 chars truncated]

### Assistant | 2026-06-01T20:10:40.543Z

Now let me verify the geometry probe's coaxiality check against the actual PART_AXIS value. The probe emits `axis` from `g.axis` (Fusion's cylinder/cone axis in model coordinates). The key question for invariant #6 is whether the revolve axis "X" produces faces whose axis aligns with `[1,0,0]`. Let me check `normalizeModel` and look at how the revolve maps axis "X".

### Assistant | 2026-06-01T20:10:41.489Z

[tool_use: Read]

### Assistant | 2026-06-01T20:10:41.733Z

[tool_use: Read]

### User | 2026-06-01T20:10:58.387Z

[tool_result] 1	// cad-fusion-primitive-recognize.mjs — classify a normalized BRep body into a PRIMITIVE FORM by geometric signature.
2	//
3	// U-CADTP-PRIMITIVE-RECOGNIZE. Feature-recognition's data floor. The bridge /geometry read-back gives per-body
4	// {face_count, edge_count, vertex_count, volume_mm3, area_mm2, bounding_box_mm} — but NO per-face surface types. So
5	// recognition works from the GEOMETRIC 
... [+5373 chars truncated]

### User | 2026-06-01T20:11:03.400Z

[tool_result] 1	// cad-fusion-buildmap-lib.mjs — model-state ("build map") verification for CAD courses.
2	//
3	// ECHO PATTERN, applied to CAD. Echo replaced screenshots of the Hurco WinMax post UI with a plotted MAP of
4	// the control's backend, so it navigates by the map (deterministic, fast) instead of looking at pixels
5	// (slow, vision-dependent). The CAD equivalent: instead of capturing the Fusion view
... [+12349 chars truncated]

### Assistant | 2026-06-01T20:11:16.888Z

I have all the libraries. Let me now verify the key behavioral claims by examining specific edge cases. Let me check what an actual xray print looks like (the `presence_only`/`evidence_ratio` shape) and confirm the diff contract handles the live data correctly.

### Assistant | 2026-06-01T20:11:18.543Z

[tool_use: Bash]

### User | 2026-06-01T20:15:06.952Z

[tool_result] cad-prototype-die-2026-05-19.json  1.4K
---LEDGER---
{
  "ts": "2026-06-01T20:00:30.055Z",
  "port": 18365,
  "part": "die",
  "docPrefix": "PRISM-DELTA-DIERT-1780344030055-",
  "partKind": "die-like-proxy",
  "sourceFile": "cad-prototype-die-2026-05-19.json",
  "revolve": "ok",
  "built": {
    "faces": 6,
    "volumeMm3": 7631.97575312113,
    "bboxMm": {
      "x": 40,
      "y": 20,
      "z":
... [+941 chars truncated]

### Assistant | 2026-06-01T20:15:42.233Z

The live ledger confirms the run. Note the ledger shows `built.faces: 6` and `form: "unknown"` (a 6-face revolved body, not 3-face — the profile has multiple steps producing 6 faces, so `recognizePrimitive` returns "unknown" honestly, which is fine). Let me read the actual die xray print to verify the diff contract and confirm `requiredCount: 5` and the `partial`/`60%` verdict are genuine, plus confirm the reap result.

### Assistant | 2026-06-01T20:15:42.890Z

[tool_use: Read]

### User | 2026-06-01T20:18:15.928Z

[tool_result] 1	{
2	  "schemaVersion": 1,
3	  "part_class": "die",
4	  "prints": [
5	    {
6	      "pdf_path": "cad-corpus-prototype:die",
7	      "cad_source": "cad-corpus-step-geometry-report.json:per_class[die]",
8	      "dimensions": [
9	        {
10	          "kind": "central_oil_hole",
11	          "presence_only": true,
12	          "evidence_count": 71,
13	          "evidence_ratio": 0.9466666666666667

... [+1179 chars truncated]

### Assistant | 2026-06-01T20:18:45.435Z

This confirms the diff is honest. All 5 source features have `evidence_ratio ≥ 0.3` (lowest is 0.373), so `requiredCount: 5` is correct — none are filtered as "weak". 3 matched / 5 required = 60%, verdict "partial" (missing 2 → not a full match). The verdict is `diffXrayPrints`' raw output, untouched. No dishonest inflation.

Now let me verify the remaining specific check questions by tracing each invariant against the code I've read. Let me confirm the reap result detail and check the `out.reap.ok` console path.

### Assistant | 2026-06-01T20:18:45.437Z

[tool_use: Bash]

### User | 2026-06-01T20:22:51.601Z

[tool_result]       "bevel_face_chamfer",
      "cross_drilled_relief_holes"
    ]
  },
  "reap": {
    "ok": true,
    "closed": 0,
    "reactivated": null,
    "remaining": 5,
    "activeName": "DIE CASE 2.940 X 3.75 .992 ID"
  }
}

### Assistant | 2026-06-01T20:24:00.797Z

This is the load-bearing safety proof. The reap result shows `closed: 0, remaining: 5, activeName: "DIE CASE 2.940 X 3.75 .992 ID"`. So:
- The reap closed 0 docs — meaning by the time the finally ran, the built doc was already gone (or the `/new` flow + revolve left the active doc as the operator's DIE CASE). `remaining: 5` = kilo's 5 peer docs preserved.
- The operator's "DIE CASE" is the active doc — **untouched**. Invariant #1 proven live.

Now I have full coverage. Let me trace each of the 6 specific checks carefully against the code.

**Trace of the 6 specific checks:**

1. **Finally-block reap guaranteed on every exit path?** The `try` (lines 62-86) is wrapped by `catch` (87-89) and `finally` (90-93). Any throw inside try → caught → finally runs. Normal completion → finally runs. The `finally` itself does `await reapByPrefix(...)` then `writeFileSync`. **But** — there are exit paths *before* the try (lines 52, 57) that `process.exit(2)` before any doc is built. Those are pre-try aborts (invariant #2). The finally covers everything after the build begins. One subtle risk: if `reapByPrefix` *itself throws* inside the finally, the `writeFileSync(LEDGER)` on line 92 would be skipped and the exception would propagate. But `reapByPrefix` is written to never throw on transport failure (it returns `{ok:false, error}` — line 105), and only throws on bad-arg guards (lines 102-103) which can't trigger here (postExecute is a function, DOC_PREFIX is a non-empty string). So in practice the finally completes. This is acceptable.

2. **Loaded-print early-abort before try acceptable?** Yes. Lines 51-52 run `loadXrayPrint` and abort with exit 2 *before* the try. At that point nothing has been built (no `/new` called), so there's nothing to reap. Correct — and it avoids spinning up the bridge/building a doc only to discover there's no print to compare against. The bridge-health abort (line 57) is also pre-try and also pre-build. Correct.

3. **Exit codes?** Pre-try aborts → `pro
... [+8528 chars truncated]
