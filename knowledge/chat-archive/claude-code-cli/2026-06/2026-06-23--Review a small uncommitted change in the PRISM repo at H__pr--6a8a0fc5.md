---
type: "chat-session"
source: "claude-code-cli"
session_id: "6a8a0fc5-4275-43b0-b847-449c590c706b"
title: "Review a small uncommitted change in the PRISM repo at H:\\prism. Grade PASS or F"
date: "2026-06-23"
first_ts: "2026-06-23T00:36:48.720Z"
last_ts: "2026-06-23T00:38:45.556Z"
cwd: "H:\\prism"
messages: 32
user_msgs: 12
assistant_msgs: 20
raw_file: "H:/.claude/projects/H--prism/6a8a0fc5-4275-43b0-b847-449c590c706b/subagents/agent-a3f0624d9ebb511ca.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:14"
---

# Review a small uncommitted change in the PRISM repo at H:\prism. Grade PASS or F

> **claude-code-cli** | 2026-06-23 | 32 msgs (12 user / 20 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/6a8a0fc5-4275-43b0-b847-449c590c706b/subagents/agent-a3f0624d9ebb511ca.jsonl`

## Transcript

### User | 2026-06-23T00:36:48.720Z

Review a small uncommitted change in the PRISM repo at H:\prism. Grade PASS or FAIL with file:line. Run `git -C H:/prism diff -- scripts/lib/region-glue-lib.mjs scripts/lib/region-glue-lib.test.mjs` and read the diff + the two referenced source functions.

CONTEXT: P1.5 (slot:xray). `buildRegionRoutedFused(mergedDimensions, fullPageFused)` builds a hybrid fused object (region-routed dims + the full-page floor's non-dimension schema) for the training cron's buildTrainsetRow/classifyActiveLearning. A prior scrutiny P2 noted: the hybrid kept the full-page `summary`, so a region-ONLY hallucination candidate (a singleton a region crop recovers) wouldn't be counted in `summary.n_hallucination_candidates`, and `classifyActiveLearning` (ocr-training-loop-lib.mjs:173) could miss routing it to active-learning review. This change RECOMPUTES `summary.n_hallucination_candidates` over the UNION dims.

VERIFY:
1. CORRECTNESS of the recompute: it counts union dims with `d.hallucination_candidate === true`. Compare to the canonical count in `scripts/lib/vision-ensemble-fuse.mjs:291` (`dimensions.filter(d => d.hallucination_candidate).length`) and the per-dim flag definition at :238 (`corroboration===1 && nModels>=2`). Does the recompute mirror it correctly? Do union dims actually PRESERVE the `hallucination_candidate` field (mergeTiledDimensions `...dim` spread)?
2. PURITY: does it mutate the input `fullPageFused.summary`? (It spreads `out.summary = {...out.summary, ...}` -- confirm no in-place mutation; a test asserts this.)
3. EDGE: no summary on the full-page fused -> does it correctly NOT synthesize one (so classifyActiveLearning falls to the n_models=0 default -> still routes to AL)? Is `=== true` (strict) correct vs truthy (a stray truthy value shouldn't inflate the count)?
4. HONEST LIMIT: n_ambiguous_pairs stays the full-page value (pairwise, not per-dim derivable) -- is that documented + acceptable?
5. Tests: real assertions covering the recompute (region-only candidate cou
... [+129 chars truncated]

### Assistant | 2026-06-23T00:36:52.366Z

I'll investigate this change. Let me start by reading the diff and the referenced source functions.

### Assistant | 2026-06-23T00:36:53.047Z

[tool_use: Bash]

### User | 2026-06-23T00:36:56.978Z

[tool_result] diff --git a/scripts/lib/region-glue-lib.mjs b/scripts/lib/region-glue-lib.mjs
index 2daa7b7596..9cb2157018 100644
--- a/scripts/lib/region-glue-lib.mjs
+++ b/scripts/lib/region-glue-lib.mjs
@@ -173,5 +173,17 @@ export function buildRegionRoutedFused(mergedDimensions, fullPageFused) {
   if (!fullPageFused || typeof fullPageFused !== "object") {
     return { dimensions: dims };
   }
-  return { .
... [+3794 chars truncated]

### Assistant | 2026-06-23T00:37:04.429Z

Now let me read the full source function in context, plus the referenced helpers and consumers.

### Assistant | 2026-06-23T00:37:04.633Z

[tool_use: Read]

### User | 2026-06-23T00:37:06.643Z

[tool_result] 1	// scripts/lib/region-glue-lib.mjs
2	//
3	// BLUEPRINT-VISION-OCR P1.5 step 2 -- pure orchestration core for the region-routing glue
4	// (scripts/region-classify.mjs). Turns the layout decision from region-classifier-lib into the
5	// concrete inputs the live pipeline needs: PIXEL crop specs for crop-image-tiles.py and the
6	// merge inputs for vision-tiling-lib mergeTiledDimensions. PURE (no f
... [+10495 chars truncated]

### Assistant | 2026-06-23T00:37:14.596Z

Now let me verify the canonical count, the per-dim flag definition, the merge field-preservation, and the consumer (classifyActiveLearning).

### Assistant | 2026-06-23T00:37:15.604Z

[tool_use: Read]

### Assistant | 2026-06-23T00:37:16.371Z

[tool_use: Read]

### User | 2026-06-23T00:37:18.216Z

[tool_result] 225	    else if (corroboration === 1) status = "singleton";
226	    else status = "partial";
227	    return {
228	      type: cl.resolvedType || "unknown",
229	      value_mm,
230	      value_spread_mm,
231	      corroboration,
232	      n_models: nModels,
233	      agreement_confidence,
234	      // the lift this dim gets from independent corroboration vs trusting its single best model
235	      
... [+3671 chars truncated]

### User | 2026-06-23T00:37:19.005Z

[tool_result] 150	    corroboration_possible: corroborationPossible,
151	    labels,
152	    trainable_label_count: labels.filter((l) => l.trainable).length,
153	    tier_counts: counts,
154	    source: "ensemble-distillation",
155	  };
156	}
157	
158	/**
159	 * Pure: should this print go to the operator active-learning queue (not auto-trained)?
160	 * Triggers: single-model run (no corroboration possible), ANY
... [+3103 chars truncated]

### Assistant | 2026-06-23T00:37:22.268Z

Now let me verify that `mergeTiledDimensions` actually preserves the `hallucination_candidate` field via the `...dim` spread (this is load-bearing for finding #1).

### Assistant | 2026-06-23T00:37:23.868Z

[tool_use: Bash]

### User | 2026-06-23T00:37:28.857Z

[tool_result] 65:    return {
98:  return { tiles, page: { width, height }, opts: { rows, cols, overlapFrac, addCenter: !!(addCenter && rows > 1 && cols > 1) } };
175:export function mergeTiledDimensions(perTile, opts = {}) {
249:  return {

### Assistant | 2026-06-23T00:37:31.614Z

[tool_use: Read]

### User | 2026-06-23T00:37:33.711Z

[tool_result] 175	export function mergeTiledDimensions(perTile, opts = {}) {
176	  const valueTolMm = isPosFinite(opts.valueTolMm) ? opts.valueTolMm : DEFAULT_MERGE_VALUE_TOL_MM;
177	  const tileMap = new Map();
178	  if (Array.isArray(opts.tiles)) for (const t of opts.tiles) if (t && t.id != null) tileMap.set(String(t.id), t);
179	
180	  // Flatten to instances {dim, tileId}. Tolerate a missing tileId (legacy 
... [+4219 chars truncated]

### Assistant | 2026-06-23T00:37:39.115Z

Confirmed: line 245 `merged.push({ ...instances[rep].dim, tileAgreement, sourceTiles })` — the `...dim` spread preserves `hallucination_candidate` on the surviving representative dim. This verifies finding #1's preservation claim.

Now let me check an important edge case: when the merge collapses two instances (a full-page singleton + a region singleton that corroborate), the representative is the highest-confidence one. Let me verify the recompute correctly handles the de-dup case and check the buildTrainsetRow consumer to confirm whether it also reads `summary.n_hallucination_candidates` (potential second consumer). Let me also confirm the test helper `linear`.

### Assistant | 2026-06-23T00:37:40.693Z

[tool_use: Bash]

### User | 2026-06-23T00:37:47.152Z

[tool_result] H:/prism/scripts/lib/ocr-training-loop-lib.mjs:173:  if ((summary.n_hallucination_candidates || 0) > 0) reasons.push(`${summary.n_hallucination_candidates} hallucination candidate(s)`);
H:/prism/scripts/region-classify.mjs:38:import { buildRegionCropSpecs, mergeRegionResults, buildRegionRoutedFused } from "./lib/region-glue-lib.mjs";
H:/prism/scripts/region-classify.mjs:187:    fused: buildRegionR
... [+41 chars truncated]

### Assistant | 2026-06-23T00:37:50.394Z

Let me look at the consumer site `region-classify.mjs:187` and confirm how the fused object flows into buildTrainsetRow/classifyActiveLearning, and check whether buildTrainsetRow reads `n_hallucination_candidates` anywhere.

### Assistant | 2026-06-23T00:37:51.333Z

[tool_use: Read]

### Assistant | 2026-06-23T00:37:52.234Z

[tool_use: Bash]

### User | 2026-06-23T00:37:53.467Z

[tool_result] 175	  if (!opts.keep && opts.workDir == null && existsSync(workDir)) {
176	    try { rmSync(workDir, { recursive: true, force: true }); } catch { /* best-effort cleanup */ }
177	  }
178	
179	  const fullFused = fullRes && fullRes.fused ? fullRes.fused : null;
180	  return {
181	    route: "region_route", page: { width, height }, decision,
182	    dimensions: merged.dimensions, merged,
183	    full
... [+1335 chars truncated]

### User | 2026-06-23T00:37:57.508Z

[tool_result] 12://      AGREEMENT FRACTION f = k/n_models). Calibrating on the FRACTION (not raw count k) is the key
16://      (more agreement ⇒ not less accurate). Only prints with n_models≥2 contribute (a 1-model run
19://      is trainable ONLY if its print had n_models≥2 (real corroboration) AND it clears the trust floor.
24:// and per-dim {corroboration, n_models} for tiering.
34:// "agreement" is the mo
... [+1678 chars truncated]

### Assistant | 2026-06-23T00:38:02.378Z

The flow is confirmed. The fused object from `buildRegionRoutedFused` (region-classify.mjs:187) carries `summary`, which feeds `classifyActiveLearning` via `summary.n_hallucination_candidates`. `buildTrainsetRow` reads only `summary.n_models` (not the hallucination count), so the recompute change is correctly targeting the single consumer that uses it. Let me run the test suite to confirm green and read the test helper `linear`.

### Assistant | 2026-06-23T00:38:03.702Z

[tool_use: Bash]

### User | 2026-06-23T00:38:08.538Z

[tool_result] 93:const linear = (mm, raw, conf) => ({ type: "linear", nominal_mm: mm, raw_text: raw, confidence: conf });
101:    linear(25.4, "1.000", 0.9),        // ALSO found by full-page -> must collapse
105:    linear(25.4, "1.000", 0.8),        // shared with r0
106:    linear(50.8, "2.000", 0.85),       // full-page-only -> must NEVER be lost
129:    { id: "r0", dimensions: [linear(25.4, "1.000", 0.9)] 
... [+1295 chars truncated]

### Assistant | 2026-06-23T00:38:12.795Z

All 18 tests pass. Let me verify the full test output didn't skip anything and confirm the prior test that was modified (the `assert.deepEqual(out.summary, ...)` -> split into two asserts) wasn't weakened in a way that loses coverage.

### Assistant | 2026-06-23T00:38:13.458Z

[tool_use: Read]

### User | 2026-06-23T00:38:15.273Z

[tool_result] 144	
145	test("mergeRegionResults: ADVERSARIAL -- empty everything -> empty result, no throw", () => {
146	  const res = mergeRegionResults([], [], [], 1000, 800);
147	  assert.equal(res.dimensions.length, 0);
148	});
149	
150	// ---------- buildRegionRoutedFused (the step-3b unblock: hybrid fused, no dropped labels) ----------
151	
152	test("buildRegionRoutedFused: keeps the full-page non-dimensi
... [+2537 chars truncated]

### Assistant | 2026-06-23T00:38:45.556Z

I have everything I need. Let me work through each verification point against the verified evidence.

**1. CORRECTNESS of recompute** — Canonical count (vision-ensemble-fuse.mjs:291) is `dimensions.filter(d => d.hallucination_candidate).length`. The recompute (region-glue-lib.mjs:185) is `dims.reduce((n, d) => n + (d && d.hallucination_candidate === true ? 1 : 0), 0)`. The per-dim flag (:238) is a pure boolean `corroboration === 1 && nModels >= 2`, so over union dims the strict `=== true` matches every dim the canonical filter would count (the flag is always `true`/`false`, never a stray truthy value). Field preservation is verified: `mergeTiledDimensions` line 245 `merged.push({ ...instances[rep].dim, ... })` keeps `hallucination_candidate` on the representative. Correct.

One subtle de-dup nuance I checked: when a region singleton corroborates a full-page singleton and they merge, the representative is the highest-confidence instance (vision-tiling-lib.mjs:241). That rep still carries whatever stale `hallucination_candidate` flag it had at fuse time (the merge does NOT recompute corroboration across tiles). This is a pre-existing imprecision in the per-dim flag under tiling, NOT introduced by this change, and it is conservative-toward-review (a now-corroborated dim may still be flagged → over-routes to AL, the safe direction). Not a regression.

**2. PURITY** — `out.summary = { ...out.summary, n_hallucination_candidates: nHall }` (:186) creates a new summary object; the parent `out` is already a shallow clone (`{ ...fullPageFused }` :176). No in-place mutation of input. Test at :172/:185-189 asserts `fullPageFused.summary.n_hallucination_candidates === 0` post-call. Verified pure.

**3. EDGE (no summary)** — Guard `if (out.summary && typeof out.summary === "object")` (:184) means an absent summary is left absent; `classifyActiveLearning` (:168/:170) then falls to `n_models=0` default → `nModels < MIN_ENSEMBLE` → routes to AL. Correct, no synthesized summary. Test 
... [+3504 chars truncated]
