---
type: "chat-session"
source: "claude-code-cli"
session_id: "501bd704-5c4a-4278-8059-79c78c4f32ed"
title: "Review the change to `H:\\prism\\scripts\\seed-ghost-gnn-classify.mjs` (function `v"
date: "2026-06-04"
first_ts: "2026-06-04T13:46:31.519Z"
last_ts: "2026-06-04T13:55:34.875Z"
cwd: "H:\\prism"
messages: 32
user_msgs: 11
assistant_msgs: 21
raw_file: "H:/.claude/projects/H--prism/501bd704-5c4a-4278-8059-79c78c4f32ed/subagents/agent-ae3963095f3fe291a.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:12"
---

# Review the change to `H:\prism\scripts\seed-ghost-gnn-classify.mjs` (function `v

> **claude-code-cli** | 2026-06-04 | 32 msgs (11 user / 21 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/501bd704-5c4a-4278-8059-79c78c4f32ed/subagents/agent-ae3963095f3fe291a.jsonl`

## Transcript

### User | 2026-06-04T13:46:31.519Z

Review the change to `H:\prism\scripts\seed-ghost-gnn-classify.mjs` (function `voteDispatcher` + `GNN_DEFAULTS` + `resolveGnnConfig` + the voteDispatcher call site in `classifyUnknownGhosts`). Use `git -C H:/prism diff scripts/seed-ghost-gnn-classify.mjs` to see the exact diff.

CONTEXT: This is GNN-F0 fix part 1 — "base-rate vote normalization." The NN/GNN tier-5 had an AUROC-0.500 constant-vote collapse where `voteDispatcher` summed `w = score*confidence` per dispatcher class with NO normalization, so the class with the most references in the pool (prism_turning, 60/125) always won for every target. The fix divides each class's accumulated weight by its FULL reference-pool frequency (+ Laplace alpha) so the residual cosine signal, not the class prior, picks the winner. A `minClassRefs` support floor (with empty-ballot fallback) guards against a single noisy rare-class reference flipping the vote. `baseRateDisabled` (env PRISM_NNG_BASE_RATE_DISABLE) reproduces the legacy raw-sum path byte-for-byte as a rollback.

IMPORTANT HONEST CONTEXT: empirically this change alone does NOT clear the degeneracy (the binding root is uniform embeddings from an 8-d checkpoint under edgeless inference; that's a separate follow-up 2a/2d). This is a necessary FOUNDATION commit, not the full fix. 60/60 existing tests pass.

FOCUS:
1. CORRECTNESS of the base-rate normalization math: is `w / (refFreq[cls] + alpha)` the right normalization? Is `refFreq` computed over the FULL `references` (correct base rate) not the top-K? Is the winner/voteShare/margin computed consistently on the NORMALIZED weights?
2. The minClassRefs floor + empty-ballot fallback: can it ever return a wrong/empty result? Does the fallback (`if normEntries.length === 0`) correctly relax the floor? Any path that returns null when it shouldn't, or a class with too-few refs winning?
3. baseRateDisabled rollback: does it TRULY reproduce the legacy behavior byte-for-byte (raw votes, raw total, same ranking, same voteShare/m
... [+400 chars truncated]

### Assistant | 2026-06-04T13:46:48.741Z

I'll review the diff for the GNN base-rate vote normalization fix.

### Assistant | 2026-06-04T13:46:54.362Z

[tool_use: Bash]

### User | 2026-06-04T13:47:02.337Z

[tool_result] diff --git a/scripts/seed-ghost-gnn-classify.mjs b/scripts/seed-ghost-gnn-classify.mjs
index 6b1a917122..1f69dbe243 100644
--- a/scripts/seed-ghost-gnn-classify.mjs
+++ b/scripts/seed-ghost-gnn-classify.mjs
@@ -66,6 +66,14 @@ export const GNN_DEFAULTS = Object.freeze({
   topK: 15,             // nearest references that vote per target
   maxNodes: 2000,       // subgraph embedding cap (the ghost 
... [+4876 chars truncated]

### Assistant | 2026-06-04T13:47:09.588Z

Let me read the full `voteDispatcher` function and surrounding helpers to verify the math against the complete context.

### Assistant | 2026-06-04T13:47:10.368Z

[tool_use: Read]

### User | 2026-06-04T13:47:13.734Z

[tool_result] 100	}
101	
102	/** Parse `raw` to an integer >= min, else `fallback`. */
103	function intOr(raw, fallback, min = 1) {
104	  const n = toNumberOrNull(raw);
105	  if (n === null || !Number.isInteger(n) || n < min) return fallback;
106	  return n;
107	}
108	
109	/**
110	 * Resolve runtime config from env + explicit overrides. Overrides win over
111	 * env, env wins over GNN_DEFAULTS. Garbage env valu
... [+7703 chars truncated]

### Assistant | 2026-06-04T13:47:36.376Z

Now let me see the rest of the function (lines 259-300) to confirm the normalization block end-to-end.

### Assistant | 2026-06-04T13:47:37.174Z

[tool_use: Read]

### User | 2026-06-04T13:47:40.686Z

[tool_result] 259	  // reference from flipping the vote; it relaxes if the floor would empty the
260	  // ballot (tiny pool) so a confident call is still produced. `baseRateDisabled`
261	  // reproduces the legacy raw-sum path byte-for-byte (rollback knob).
262	  const baseRateDisabled = opts.baseRateDisabled === true;
263	  const baseRateAlpha = finiteOr(opts.baseRateAlpha, GNN_DEFAULTS.baseRateAlpha, { min: 0
... [+1776 chars truncated]

### Assistant | 2026-06-04T13:48:12.104Z

Now let me verify the existing tests to understand what behavior is locked in, and check whether they assert raw vs normalized vote shares (to confirm baseRateDisabled byte-for-byte equivalence is actually exercised).

### Assistant | 2026-06-04T13:48:13.477Z

[tool_use: Bash]

### User | 2026-06-04T13:53:18.809Z

[tool_result] Command running in background with ID: b4e1a3xlu. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\18171d21-2f6f-439c-9da0-f86bb5672d17\tasks\b4e1a3xlu.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-06-04T13:53:22.150Z

Let me use Grep to find the test file and callers.

### Assistant | 2026-06-04T13:53:22.736Z

[tool_use: Grep]

### User | 2026-06-04T13:53:46.426Z

[tool_result] Found 55 files
knowledge\memories\reference\reference_sierra_dead_edge_id_mismatch_2026_05_30.md
knowledge\memories\reference\reference_nn_predictor_embed_wire_followup_2026_05_24.md
knowledge\memories\reference\reference_nn_graph_ms2_u1_2026_05_17.md
knowledge\memories\reference\reference_nn_graph_ms0_2026_05_16.md
knowledge\memories\reference\reference_nn_graded_schema_read_fix_2026_06_03.md
scr
... [+2375 chars truncated]

### Assistant | 2026-06-04T13:53:49.398Z

Let me look at the test file to verify the locked-in behavior, especially around base-rate and rollback equivalence.

### Assistant | 2026-06-04T13:53:50.809Z

[tool_use: Grep]

### User | 2026-06-04T13:53:54.283Z

[tool_result] 30:  voteDispatcher,
76:  // 6 high-confidence references spanning prism_cam / prism_calc / prism_turning
80:    ["Turn1", "prism_turning", 0.86], ["Turn2", "prism_turning", 0.84],
100:  for (const d of ["prism_cam", "prism_calc", "prism_turning", "prism_5axis", "prism_skill_script"]) {
234:      makeGhost("g.ok", "OkEngine", "prism_turning", 0.9),
299:// --- voteDispatcher -----------------------
... [+1688 chars truncated]

### Assistant | 2026-06-04T13:53:58.687Z

Let me read the key test cases to verify what behavior is locked, particularly the voteShare assertions which depend on the normalization math.

### Assistant | 2026-06-04T13:53:59.839Z

[tool_use: Read]

### User | 2026-06-04T13:54:02.923Z

[tool_result] 299	// --- voteDispatcher --------------------------------------------------------
300	
301	const emb = (...xs) => new Float64Array(xs);
302	
303	test("voteDispatcher picks the dispatcher of the nearest references", () => {
304	  const target = { id: "t", label: "TEngine" };
305	  const refs = [
306	    { id: "c1", label: "C1", proposed_wiring: "prism_cam", confidence: 0.9 },
307	    { id: "c2", l
... [+4759 chars truncated]

### Assistant | 2026-06-04T13:54:12.096Z

Now I have full context. Let me verify a couple of correctness concerns by tracing through the math carefully, particularly the test at line 303-317 (the "picks nearest references" test). I need to confirm the normalization doesn't break the existing `voteShare > 0.5` assertion.

Let me run the test suite to confirm the "60/60 pass" claim and check determinism around the in-place `.sort()`.

### Assistant | 2026-06-04T13:54:12.550Z

[tool_use: Bash]

### User | 2026-06-04T13:54:19.937Z

[tool_result]   ...
# Subtest: parseArgs sets help and rejects a garbage --limit gracefully
ok 59 - parseArgs sets help and rejects a garbage --limit gracefully
  ---
  duration_ms: 0.167
  ...
# Subtest: main returns 0 for --help and 2 for an unknown argument
ok 60 - main returns 0 for --help and 2 for an unknown argument
  ---
  duration_ms: 1.0441
  ...
1..60
# tests 60
# suites 0
# pass 60
# fail 0
# cancel
... [+49 chars truncated]

### Assistant | 2026-06-04T13:54:32.408Z

60/60 pass confirmed. Now let me trace the math carefully for the key test (line 303) and the divide-by-zero / NaN edge cases.

Let me trace the test at line 303 under the new normalization:
- refs: 2× prism_cam (c1, c2 at emb(1,0), aligned with target), 1× prism_calc (k1 at emb(-1,0), anti-aligned).
- `refFreq`: prism_cam=2, prism_calc=1.
- After scoring, all 3 score (calibratedScore finite). Say cam refs get high weight, calc ref low/zero.
- votes (raw): prism_cam = w_cam (high), prism_calc = w_calc (low, possibly 0 → filtered by `w<=0`).
- `minClassRefs`=2 default. Filter: prism_cam (freq 2 ≥ 2) kept; prism_calc (freq 1 < 2) DROPPED.
- normEntries = [prism_cam]. normTotal = w_cam/(2+1). voteShare = 1.0. ✓ `> 0.5` holds, dispatcher = prism_cam. ✓

Good — this passes because prism_cam happens to have freq 2. But this exposes a subtle behavioral concern. Let me examine the `intOr` signature and the `finiteOr` helper to confirm the guard semantics.

### Assistant | 2026-06-04T13:54:33.501Z

[tool_use: Read]

### User | 2026-06-04T13:54:36.258Z

[tool_result] 78	
79	/** True when `label` is a syntactically valid prism_* dispatcher name. */
80	export function isValidDispatcher(label) {
81	  return typeof label === "string" && DISPATCHER_RE.test(label);
82	}
83	
84	/**
85	 * Coerce `raw` to a number, or `null` when it is not a meaningful numeric
86	 * input. Guards the `Number("")===0` / `Number(null)===0` footgun: an empty
87	 * or blank env var must fa
... [+537 chars truncated]

### Assistant | 2026-06-04T13:54:54.138Z

Now I have everything needed. Let me trace the edge cases for divide-by-zero and the `refFreq` null path.

**Divide-by-zero analysis on `w / ((refFreq.get(cls) || 0) + baseRateAlpha)`:**
- `refFreq` is only read inside `normWeight` and the filter — both only execute in the `!baseRateDisabled` branch (refFreq is non-null there). ✓ No null deref.
- Denominator = `(refFreq.get(cls) || 0) + baseRateAlpha`. Can it be 0?
  - A class `cls` is in `votes` only because some top-K ref had `proposed_wiring === cls`. That same ref is also in `references`, so `refFreq.get(cls) >= 1`. So `refFreq.get(cls)` is always ≥ 1 for any voted class. The `|| 0` is dead-but-safe.
  - `baseRateAlpha` defaults to 1.0, clamped `min: 0`. **If an operator sets `PRISM_NNG_BASE_RATE_ALPHA=0`, denominator = refFreq.get(cls) ≥ 1 ≠ 0.** Safe. ✓
  - Even the fallback path (`normEntries.length===0` → map all votes) uses the same `normWeight`, same guarantee. ✓

So no divide-by-zero, no NaN. Now let me check one more thing — whether `voteDispatcher` is called anywhere else that might pass hand-built `references` where a voted class is NOT in references (which WOULD allow refFreq.get(cls)=0 and, with alpha=0, divide-by-zero).

### Assistant | 2026-06-04T13:54:54.139Z

[tool_use: Grep]

### User | 2026-06-04T13:54:56.176Z

[tool_result] scripts\seed-ghost-gnn-classify.test.mjs:313:  const v = voteDispatcher(target, embeddings, refs, { topK: 5 });
scripts\seed-ghost-gnn-classify.test.mjs:326:  const v = voteDispatcher(target, embeddings, refs, { topK: 5, confidenceCap: 0.8 });
scripts\seed-ghost-gnn-classify.test.mjs:346:  const v = voteDispatcher(target, embeddings, refs, { topK: 2 });
scripts\seed-ghost-gnn-classify.test.mjs:355
... [+1018 chars truncated]

### Assistant | 2026-06-04T13:55:34.875Z

The only production caller is at line 379 (`classifyUnknownGhosts`), which passes the same `references` array that the votes were computed from — so the `refFreq.get(cls) ≥ 1` invariant holds in production. The invariant only relies on votes being a subset of references' classes, which is guaranteed because votes are populated exclusively from `top` (a slice of `scored`, which is filtered from `references`).

I have everything needed for a complete review. Let me consolidate my findings.

## Code Quality Analysis Report — GNN-F0 base-rate vote normalization

### Summary
- Scope: `voteDispatcher` + `GNN_DEFAULTS` + `resolveGnnConfig` + call site in `classifyUnknownGhosts`, file `H:\prism\scripts\seed-ghost-gnn-classify.mjs`
- Tests: 60/60 pass (re-ran, confirmed)
- Verdict: **PASS** (0 P0, 0 P1; 3 P2 advisories)

### 1. Base-rate normalization math — CORRECT
- `w / (refFreq[cls] + alpha)` is the right shape: dividing accumulated vote weight by the class's full-pool frequency removes the class prior, leaving the residual cosine signal to pick the winner. Laplace `alpha` smooths the divisor (default 1.0). This is a standard prior-correction.
- `refFreq` is computed over the **FULL `references`** array (lines 268-272), not the top-K — correct base rate. The top-K (`top`) drives the numerator (`votes`/`w`); the full pool drives the denominator. The numerator/denominator split is exactly right.
- winner / voteShare / margin (lines 288-295) are all computed on the **normalized** weights and **normTotal** consistently. No mixing of raw and normalized.

### 2. minClassRefs floor + empty-ballot fallback — CORRECT
- Filter (line 279): keeps only classes with `refFreq ≥ minClassRefs` (default 2). If that empties the ballot (line 280), it falls back to normalizing ALL voted classes — so it can never wrongly return null due to the floor. The `normTotal <= 0 || normEntries.length === 0` guard (line 283) only triggers when there are genuinely no votes, which is already impossible p
... [+3613 chars truncated]
