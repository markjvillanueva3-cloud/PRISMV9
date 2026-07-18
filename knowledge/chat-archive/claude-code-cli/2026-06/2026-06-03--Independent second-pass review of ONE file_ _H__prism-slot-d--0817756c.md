---
type: "chat-session"
source: "claude-code-cli"
session_id: "0817756c-0693-4484-b131-7f7a38627b5b"
title: "Independent second-pass review of ONE file: `H:/prism-slot-delta/scripts/lib/cad"
date: "2026-06-03"
first_ts: "2026-06-03T20:35:11.458Z"
last_ts: "2026-06-03T20:36:55.462Z"
cwd: "H:\\prism"
messages: 10
user_msgs: 4
assistant_msgs: 6
raw_file: "H:/.claude/projects/H--prism/0817756c-0693-4484-b131-7f7a38627b5b/subagents/agent-aa25983cf18a72ea7.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:04"
---

# Independent second-pass review of ONE file: `H:/prism-slot-delta/scripts/lib/cad

> **claude-code-cli** | 2026-06-03 | 10 msgs (4 user / 6 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/0817756c-0693-4484-b131-7f7a38627b5b/subagents/agent-aa25983cf18a72ea7.jsonl`

## Transcript

### User | 2026-06-03T20:35:11.458Z

Independent second-pass review of ONE file: `H:/prism-slot-delta/scripts/lib/cad-fusion-feature-correction.mjs`. Also read its test `H:/prism-slot-delta/scripts/lib/cad-fusion-feature-correction.test.mjs` (the 5 new quarantine/ROTATIONAL_ONLY_KINDS tests).

Do NOT assume the other reviewer caught everything. Weight your review toward: TEST INTEGRITY (do the new tests actually encode intent and would FAIL if the guard logic were wrong — not toBeDefined-style stubs?), hidden coupling, and whether the quarantine design is SOUND.

Context: this is a training-data-quality (R9 garbage-in) guard. The live system trains a blind-CAD-gen model from a compounding JSONL corpus. A ground-truth fixture `cad-prototype-plate-2026-05-19.json` is mislabeled (it lists rotational turbine-blade features but `part_class:"plate"`). The guard marks training data from such a topologically-inconsistent fixture as `quarantine:true` so the trainer filters it instead of learning a false "plate" archetype.

Specifically verify:
1. The tests would genuinely fail if `fixtureInconsistent` were computed wrong (e.g. if it quarantined a revolve part, or failed to quarantine the plate case, or dropped the back-compat default).
2. Is whole-fixture quarantine (flag ALL datums when ANY rotational-only feature appears on a prismatic part) the right call vs per-feature? Argue it.
3. Any R12 violation — does quarantine silently hide/drop a real signal? (It should KEEP the datum + flag it.)
4. Naming/convention conformance with the surrounding file.

Report P0/P1 with line refs, then `VERDICT: PASS` or `VERDICT: FAIL`. Terse.

### Assistant | 2026-06-03T20:35:46.980Z

I'll review the file and its test. Let me read both.

### Assistant | 2026-06-03T20:35:48.056Z

[tool_use: Read]

### Assistant | 2026-06-03T20:35:48.103Z

[tool_use: Read]

### User | 2026-06-03T20:36:01.986Z

[tool_result] 1	// Tests for cad-fusion-feature-correction.mjs — missing functional feature → concrete CAD build op (the auto-correct half).
2	//
3	// Load-bearing intents (R9/R12): (1) each DETECTABLE missing feature → a build op + the expected face-geometry delta;
4	// (2) bevel_face_chamfer is NEVER proposed (undetectable — buildable:false WITH a reason, no silent fake); (3) unknown
5	// kinds skipped with a
... [+16244 chars truncated]

### User | 2026-06-03T20:36:01.991Z

[tool_result] 1	// cad-fusion-feature-correction.mjs — the INVERSE of the feature-alias: missing functional feature → a concrete
2	// CAD build operation that will produce the geometry the alias recognizes. The auto-correction half of the loop.
3	//
4	// U-CADTP-FEATURE-CORRECTION. The closed loop so far DETECTS gaps (diffXrayPrints → missing[]) but does not CLOSE
5	// them. This lib maps each missing xray func
... [+11802 chars truncated]

### Assistant | 2026-06-03T20:36:09.812Z

Both files are read. Let me verify the coupling claims — specifically the `summarizeFaceGeometry` producer contract that the verify rung depends on, and whether `aliasFunctionalFeatures`/`diffXrayPrints` behave as the PAYOFF test assumes.

### Assistant | 2026-06-03T20:36:10.340Z

[tool_use: Read]

### User | 2026-06-03T20:36:20.188Z

[tool_result] 1	// cad-fusion-face-geometry-probe.mjs — extract per-face ANALYTIC GEOMETRY (radius/axis/origin/internal) + structure it.
2	//
3	// U-CADTP-FACE-GEOMETRY-PROBE. The disambiguation layer face-type-probe deferred. The surfaceType histogram says "a
4	// cylindrical void is present" but can't say WHICH functional feature — central bore vs cross-drilled, taper vs
5	// drill-tip. The resolver is per-fa
... [+7773 chars truncated]

### Assistant | 2026-06-03T20:36:55.462Z

The producer contract is confirmed. The verify rung's metric keys (`internalCoaxialCylinders`, `internalRadialCylinders`, `externalDistinctDiameters`, `externalCones`) are all really emitted by `summarizeFaceGeometry`, and the coaxial/radial granularity is real (lines 111-112). The E2E tests at lines 114-142 genuinely couple to the producer.

I have everything needed. Here is my independent second-pass review.

---

**Independent review — `cad-fusion-feature-correction.mjs` + `.test.mjs` (quarantine / ROTATIONAL_ONLY_KINDS)**

**Specific-question answers:**

**(1) Would the tests fail if `fixtureInconsistent` were computed wrong?** YES — genuinely fault-discriminating, not stubs:
- Quarantine a revolve part: line 186-191 asserts `"quarantine" in d === false` for `prismatic:false` + the same rotational features. If the `!!prismatic` guard (line 142) were dropped, this test goes RED.
- Fail to quarantine the plate: line 169-184 asserts `d.quarantine===true` AND `quarantineReason` matches `/fixture-topology-inconsistent.*prismatic part_class 'plate'/`. If `cs.some(... ROTATIONAL_ONLY_KINDS.has)` were inverted/broken, RED.
- Drop the back-compat default: line 201-205 asserts default opts (no `prismatic`) never adds the key. The negative tests at 193-199 (prismatic + only slab-valid features) and 165-166 (`ROTATIONAL_ONLY_KINDS.has` excludes `central_oil_hole`/`bevel_face_chamfer`) pin the *boundary* of the set — so a too-broad `ROTATIONAL_ONLY_KINDS` (e.g. adding `central_oil_hole`) would fail 193-199. These are intent-encoding tests in the R9 sense, not `toBeDefined` stubs. They use distinct partClass strings (`plate`/`bracket`/`die`) and real `proposeFeatureCorrections` output, not hand-built objects.
- R12 honesty check at line 183 verifies quarantine does not corrupt the `verified` flag — exactly the right thing to assert.

**(2) Whole-fixture vs per-feature quarantine — whole-fixture is correct.** The mislabel is a property of the *fixture's `part_class` label*, no
... [+2983 chars truncated]
