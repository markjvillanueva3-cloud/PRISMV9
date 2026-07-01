---
type: "chat-session"
source: "claude-code-cli"
session_id: "fe461853-fb09-4525-a8b5-4e88c1ebdb81"
title: "RE-REVIEW of `H:/prism/scripts/lib/graphsage-trainer.mjs` after the per-file scr"
date: "2026-05-16"
first_ts: "2026-05-16T22:59:00.629Z"
last_ts: "2026-05-16T23:00:10.117Z"
cwd: "H:\\prism"
messages: 19
user_msgs: 7
assistant_msgs: 12
raw_file: "H:/.claude/projects/H--prism/fe461853-fb09-4525-a8b5-4e88c1ebdb81/subagents/agent-ad4e79b43e77783a7.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:33"
---

# RE-REVIEW of `H:/prism/scripts/lib/graphsage-trainer.mjs` after the per-file scr

> **claude-code-cli** | 2026-05-16 | 19 msgs (7 user / 12 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/fe461853-fb09-4525-a8b5-4e88c1ebdb81/subagents/agent-ad4e79b43e77783a7.jsonl`

## Transcript

### User | 2026-05-16T22:59:00.629Z

RE-REVIEW of `H:/prism/scripts/lib/graphsage-trainer.mjs` after the per-file scrutiny gate's P1 fix round. Read the whole file end-to-end again — do NOT assume the other reviewer caught anything.

Your first-round verdict was **FAIL** with 3 P1 findings. They've been adopted:

1. **P1-1 fix (cross-type shortcut re-injection)**: the `(1-pHard)` tail is no longer uniform-over-nodes. It now draws each endpoint's type INDEPENDENTLY ∝ marginal (could be intra- or cross-type, but the *type* distribution mirrors the positive endpoint marginal). pHard is now genuinely a concentration-vs-pairing knob, not a shortcut on/off switch. The `0.7` literal is deduped to `DEFAULT_NEG_PHARD`.

2. **P1-2 fix (bucket-size inversion)**: when a `typeMarginal` Map is supplied at all, missing/non-finite/≤0 types get weight 0 (excluded); bucket-size fallback applies ONLY when no marginal Map is supplied. `totalAny===0` → uniform fallback. `train()` adds `useStratified = !!(nodeType && typeMarginal && typeMarginal.size > 0)` so an empty marginal from `positiveTypeMarginal` (no positive edge touched a typed node) drops back to the legacy uniform sampler instead of silently size-biased "stratification".

3. **P1-3 (R9 testability)**: empirical validation now passes — on a heterophilous fixture (500 nodes A:300/B:150/C:50, marginal A:100/B:10/C:1) the uniform sampler produces endpoint freq A:0.607 B:0.297 C:0.095 sameType:0.46, the stratified sampler produces A:0.906 B:0.085 C:0.009 sameType:0.948 — i.e. the negative endpoint distribution mirrors the positive marginal to 3 decimal places. The unit test (File 3) will encode this invariant directly.

VERIFY specifically for THIS round (weight your second-pass toward what reviewer A is less likely to catch):
- The statistical claim above — does the math + the code actually deliver per-endpoint marginal matching, or is there a subtle integer/float bias?
- `pickBucket(total, hardOnly)` filters `weighted[]` by `canHard`; with `hardOnly=true` the itera
... [+849 chars truncated]

### Assistant | 2026-05-16T22:59:05.342Z

I'll re-review the file end-to-end, focusing on the second-pass concerns.

### Assistant | 2026-05-16T22:59:05.480Z

[tool_use: Read]

### User | 2026-05-16T22:59:06.145Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\graphsage-trainer.mjs' was already read 18s ago in this session and is unchanged (mtime 1778972029727). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-16T22:59:08.736Z

The read-once-guard says I already have this file in context. Let me search for the specific code sections to verify.

### Assistant | 2026-05-16T22:59:10.496Z

[tool_use: Grep]

### User | 2026-05-16T22:59:11.240Z

[tool_result] 42:const DEFAULT_NEG_PHARD = 0.7;
51:  negPHard: DEFAULT_NEG_PHARD,
119:export function sampleNegativeEdges(nodeIds, edgeSet, count, rng) {
147:export function positiveTypeMarginal(edges, nodeType) {
176: * holding >=2 nodes) it returns exactly `sampleNegativeEdges(...)`.
191:    return sampleNegativeEdges(nodeIds, edgeSet, count, rng);
208:  if (buckets.size === 0) return sampleNegativeEdges(node
... [+978 chars truncated]

### Assistant | 2026-05-16T22:59:13.945Z

Acknowledged. Continuing the review — I need to see the negative sampling block fully to verify the statistical claim.

### Assistant | 2026-05-16T22:59:14.788Z

[tool_use: Read]

### User | 2026-05-16T22:59:15.625Z

[tool_result] 170	 * endpoints the same type), the type chosen proportional to `typeMarginal`
171	 * (the positive-edge type frequency) so the negative type distribution
172	 * mirrors the positive one and the shortcut carries no signal. The remaining
173	 * (1 - pHard) stay uniform — preserves cross-type coverage and avoids a
174	 * degenerate collapse on a genuinely homophilous graph. Deterministic given
175	
... [+5515 chars truncated]

### Assistant | 2026-05-16T22:59:18.704Z

[tool_use: Read]

### User | 2026-05-16T22:59:19.494Z

[tool_result] 289	      const ea = pickBucket(totalAny, false);
290	      const eb = pickBucket(totalAny, false);
291	      if (!ea || !eb) continue;
292	      a = ea.arr[Math.floor(rng() * ea.arr.length)];
293	      b = eb.arr[Math.floor(rng() * eb.arr.length)];
294	    }
295	    if (a === b) continue;
296	    const key = edgeKey(a, b);
297	    if (edgeSet.has(key) || seen.has(key)) continue;
298	    seen.add(
... [+2430 chars truncated]

### Assistant | 2026-05-16T22:59:21.611Z

Now let me check the train() integration and how `nodeType` flows through.

### Assistant | 2026-05-16T22:59:24.520Z

[tool_use: Read]

### User | 2026-05-16T22:59:26.298Z

[tool_result] 505	      const b = pair[1];
506	      if (a == null || b == null || a === b) continue;
507	      edgeSet.add(edgeKey(a, b));
508	    }
509	  }
510	
511	  const nodeIds = [...feat.keys()];
512	  const rng = mulberry32(opt.seed);
513	  const negCount = Math.round(opt.batchSize * opt.negRatio);
514	  const lossHistory = [];
515	
516	  // U-NEG-SAMPLE-STRATIFIED: when the caller supplies a per-node t
... [+1998 chars truncated]

### Assistant | 2026-05-16T22:59:29.037Z

Acknowledged — I have enough context now. Let me check `positiveTypeMarginal` to verify what marginal it computes.

### Assistant | 2026-05-16T22:59:29.771Z

[tool_use: Read]

### User | 2026-05-16T22:59:30.566Z

[tool_result] 119	export function sampleNegativeEdges(nodeIds, edgeSet, count, rng) {
120	  const out = [];
121	  const n = Array.isArray(nodeIds) ? nodeIds.length : 0;
122	  if (n < 2 || count <= 0) return out;
123	  const seen = new Set();
124	  const maxAttempts = count * NEG_SAMPLE_ATTEMPT_FACTOR;
125	  let attempts = 0;
126	  while (out.length < count && attempts < maxAttempts) {
127	    attempts++;
128	  
... [+2224 chars truncated]

### Assistant | 2026-05-16T23:00:10.117Z

Acknowledged — I have enough now to finalize the second-pass review. Let me reason through the verification points without further reads.

## Second-pass review verdict

**Statistical claim verification (per-endpoint marginal matching):**

The math holds. In the `(1 - pHard)` per-endpoint branch:
- `pickBucket(totalAny, false)` selects a type `T` with probability `w(T) / totalAny`
- When a `typeMarginal` Map is supplied, `w(T) = marginal.get(T)` (excluding non-finite/≤0) → endpoint type distribution exactly mirrors positive-edge marginal mass
- Within the picked bucket, the node is drawn uniformly via `e.arr[Math.floor(rng() * e.arr.length)]`
- Both endpoints are drawn *independently* (separate `pickBucket` + separate uniform pick), so the joint type distribution is `P(T_a) × P(T_b)` — could be intra or cross, but each marginal mirrors the positives'.

The expected empirical numbers (A:0.906/B:0.085/C:0.009 sameType:0.948) line up with the theoretical breakdown: `pHard=0.7` of draws are intra-type ∝ marginal, `0.3` are the per-endpoint product. `sameType` ≈ `pHard + (1-pHard) * Σ p_t²` = `0.7 + 0.3 * ((100/111)² + (10/111)² + (1/111)²)` = `0.7 + 0.3 * (0.8115 + 0.0081 + 0.0001)` ≈ `0.7 + 0.246` = `0.946` ✓ (matches 0.948 to MC noise). Type-A marginal ≈ `0.7 * 100/111 + 0.3 * 100/111` = `100/111` = `0.9009` — matches the claimed 0.906 within MC slack. **The claim is consistent with the implementation.**

**`pickBucket` correctness:**
- `hardOnly=true` branch: iterates `weighted[]`, skips non-canHard, decrements `r` by `e.w` only on canHard entries. `total=totalHard` precomputed by summing `e.w` only for `canHard` entries (line 244). The traversal-sum equals `total` exactly. ✓
- `hardOnly=false` branch: no skips, `total=totalAny` matches the unfiltered sum. ✓
- Trailing `return last` handles float drift on the final entry. ✓

**`totalHard === 0` corner:**
The gate `if (totalHard > 0 && rng() < pHard)` short-circuits when no bucket has ≥2 nodes, sending every draw to t
... [+4523 chars truncated]
