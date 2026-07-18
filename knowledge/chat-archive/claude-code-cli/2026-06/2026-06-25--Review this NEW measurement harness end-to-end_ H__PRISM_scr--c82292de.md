---
type: "chat-session"
source: "claude-code-cli"
session_id: "c82292de-3196-443a-9079-0b9c268968eb"
title: "Review this NEW measurement harness end-to-end: H:\\PRISM\\scripts\\measure-structu"
date: "2026-06-25"
first_ts: "2026-06-25T10:00:32.982Z"
last_ts: "2026-06-25T10:03:20.433Z"
cwd: "H:\\PRISM"
messages: 38
user_msgs: 14
assistant_msgs: 24
raw_file: "H:/.claude/projects/H--prism/c82292de-3196-443a-9079-0b9c268968eb/subagents/agent-aad787933c6462c6a.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:26"
---

# Review this NEW measurement harness end-to-end: H:\PRISM\scripts\measure-structu

> **claude-code-cli** | 2026-06-25 | 38 msgs (14 user / 24 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/c82292de-3196-443a-9079-0b9c268968eb/subagents/agent-aad787933c6462c6a.jsonl`

## Transcript

### User | 2026-06-25T10:00:32.982Z

Review this NEW measurement harness end-to-end: H:\PRISM\scripts\measure-structural-augmentation-separability.mjs and its test H:\PRISM\scripts\measure-structural-augmentation-separability.test.mjs

CONTEXT: it is a NON-DESTRUCTIVE measurement (no graph write, no GPU). It loads labeled engine text embeddings (loadLabeledVectors from analyze-ghost-embed-separability.mjs), the engine->dispatcher label map (buildEngineDispatcherMap + extractWiredEngines), and an engine->engine import adjacency (from the already-reviewed lib node-structural-features.mjs). For each labeled engine it builds an augmented vector concatWeighted(textVec, structuralVector, alpha) and scores per-class separability via classSeparability (intra - inter cosine). It sweeps alpha and ablates a degree dimension, then prints a verdict.

A live run already produced: baseline meanMargin 0.0526 (23/43 separable), best alpha=0.75 -> meanMargin ~0.094-0.099 (27-30/43 separable, dMargin +0.041..+0.046), structCoverage 19.6%, alpha=1 struct-only collapses to 6/43. The author's interpretation: a REAL but PARTIAL separability lift bounded by 20% coverage, necessary-not-sufficient (a runAssessment LOO is the unrun confirmatory step), justifying NO apply/retrain.

Verify specifically (cite file:line):
1. LEAKAGE in augmentedSeparability: byClass groups augmented vectors by an engine's OWN dispatcher label (that is the metric's class axis -- legitimate). Confirm the engine's own label never enters its own FEATURE vector (only its neighbours', via the lib). Is the separability lift possibly an artifact of the engine's own label leaking into its struct vector? Trace it.
2. Is the verdict logic correct? The structCoverage<0.05 INCONCLUSIVE branch, the `lifts = dSep>0 || dMargin>0.01` branch, the best-run selection (dSep*1000+dMargin). Does it overclaim? At 19.6% coverage, is calling this "the lever is REAL" defensible, or should the verdict be more guarded about coverage / necessary-not-sufficient?
3. alpha=0 dedup 
... [+570 chars truncated]

### Assistant | 2026-06-25T10:00:36.915Z

I'll analyze this measurement harness end-to-end. Let me start by reading the main file, its test, and the dependencies it relies on.

### Assistant | 2026-06-25T10:00:37.386Z

[tool_use: Read]

### Assistant | 2026-06-25T10:00:37.623Z

[tool_use: Read]

### User | 2026-06-25T10:00:38.621Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * measure-structural-augmentation-separability.mjs -- NON-DESTRUCTIVE measurement of whether
4	 * LEAKAGE-SAFE STRUCTURAL features sharpen the GNN tier-5 dispatcher-class separability of the
5	 * deployed nomic embeddings (U-GNN-STRUCT-FEATURES, slot:india 2026-06-25).
6	 *
7	 * WHY (the lever, measured not guessed). analyze-ghost-embed-separability.mjs proved the 76
... [+12073 chars truncated]

### User | 2026-06-25T10:00:38.827Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * measure-structural-augmentation-separability.test.mjs -- R9 intent tests for the pure measurement
4	 * core augmentedSeparability (U-GNN-STRUCT-FEATURES, slot:india 2026-06-25).
5	 *
6	 * The intent the harness must encode: when the TEXT embeddings are non-separable but same-class
7	 * engines form import cliques (the structural signal), augmenting LIFTS the per-cl
... [+5934 chars truncated]

### Assistant | 2026-06-25T10:00:42.042Z

Now let me trace the dependencies. The leakage question hinges entirely on `structuralVector` in the lib and `classSeparability` semantics. Let me read both.

### Assistant | 2026-06-25T10:00:42.985Z

[tool_use: Read]

### Assistant | 2026-06-25T10:00:43.107Z

[tool_use: Read]

### User | 2026-06-25T10:00:43.929Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * node-structural-features.mjs -- leakage-safe STRUCTURAL feature augmentation for the GNN
4	 * tier-5 direct-embed dispatcher classifier (U-GNN-STRUCT-FEATURES, slot:india 2026-06-25).
5	 *
6	 * THE PROBLEM (measured, not guessed). analyze-ghost-embed-separability.mjs proved the deployed
7	 * 768-d nomic TEXT embeddings barely separate engines by dispatcher class: o
... [+17556 chars truncated]

### User | 2026-06-25T10:00:44.111Z

[tool_result] read-once-guard: 'H:\PRISM\scripts\analyze-ghost-embed-separability.mjs' was already read 24m ago in this session and is unchanged (mtime 1781752142368). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=
... [+2 chars truncated]

### Assistant | 2026-06-25T10:00:52.481Z

The read-once guard claims `analyze-ghost-embed-separability.mjs` is already in context, but it isn't in my actual context window for this task (I'm a fresh analyst arm). I must verify `classSeparability` and `loadLabeledVectors` semantics directly — they're load-bearing for the leakage and verdict questions. Let me grep the specific functions.

### Assistant | 2026-06-25T10:00:53.913Z

[tool_use: Grep]

### User | 2026-06-25T10:00:55.305Z

[tool_result] 41:export function loadLabeledVectors(embText) {
81:export function classSeparability(byClass, minClass = MIN_CLASS_DEFAULT) {

### Assistant | 2026-06-25T10:01:00.186Z

Let me read the actual bodies of these two functions to verify their semantics precisely.

### Assistant | 2026-06-25T10:01:01.030Z

[tool_use: Read]

### User | 2026-06-25T10:01:02.883Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * analyze-ghost-embed-separability.mjs -- diagnose the GNN tier-5 COVERAGE ceiling (slot:india
4	 * 2026-06-18). The cap-sweep (afeac9e1f4) proved ref-pool growth is a RANKING lever, not a COVERAGE
5	 * lever (every gate-holding cap narrows the emitted band to 1 class). The standing PSN-leg #10
6	 * limitation ("spans 2/13 classes -- full-coverage pending ref-pool gr
... [+8759 chars truncated]

### Assistant | 2026-06-25T10:01:11.972Z

Now I have the full picture. Let me carefully verify the critical leakage claim by tracing the data flow. The key question: does an engine's OWN dispatcher label enter its OWN feature vector?

Let me trace `structuralVector(engine, ...)`:
- It calls `neighborDispatcherHistogram(engine, adjacency, engineToDisp, opts)` (line 191)
- That iterates `adjacency.get(engine)` = the engine's neighbors `n` (line 160)
- For each neighbor `n`, it reads `engineToDisp.get(n)` (line 164) — the **neighbor's** label, never `engineToDisp.get(engine)`
- Self-edges are skipped at both the adjacency builder (line 98) and the histogram (line 161)

So the engine's own label is structurally never read into its own feature. That's confirmed clean at the lib level. But the adversarial question is subtler: can the engine's own label leak **transitively** through the clique structure? Let me think hard about this and verify the test corpus and the dedup/sweep logic.

Let me verify a couple of edge cases in the actual data flow — whether `loadLabeledVectors` could produce a vector whose neighbors form a same-class clique that effectively reconstructs the held-out label. Let me also check `cosineSim` for the NaN path and verify `extractWiredEngines` map shape.

### Assistant | 2026-06-25T10:01:13.383Z

[tool_use: Grep]

### Assistant | 2026-06-25T10:01:14.364Z

[tool_use: Grep]

### User | 2026-06-25T10:01:14.955Z

[tool_result] 77:export function extractWiredEngines(engineDispatcherMap) {
78-  const wirings = [];
79-  const conflicts = [];
80-  if (!engineDispatcherMap || typeof engineDispatcherMap.entries !== "function") {
81-    return { wirings, conflicts };
82-  }
83-  for (const [engine, nsSet] of engineDispatcherMap.entries()) {
84-    if (typeof engine !== "string" || !engine.trim()) continue;
85-    const dispatc
... [+1503 chars truncated]

### User | 2026-06-25T10:01:16.983Z

[tool_result] 93:export function cosineSim(a, b) {
94-  if (a.length !== b.length) throw new RangeError(`cosineSim: length mismatch ${a.length} vs ${b.length}`);
95-  let dot = 0, na = 0, nb = 0;
96-  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
97-  const denom = Math.sqrt(na) * Math.sqrt(nb);
98-  return denom === 0 ? 0 : dot / denom;
99-}
100-
101-/**
102- 
... [+756 chars truncated]

### Assistant | 2026-06-25T10:01:21.347Z

I now have everything needed. `cosineSim` returns 0 on a zero-norm vector (line 98) — no NaN. `extractWiredEngines` produces a `Map<engine, dispatcher>` single-label (multi-wired engines are dropped as conflicts, not labeled). Let me run the tests to confirm they pass as written, and do the leakage analysis math.

### Assistant | 2026-06-25T10:01:22.277Z

[tool_use: Bash]

### User | 2026-06-25T10:01:26.930Z

[tool_result]   ...
# Subtest: augmentedSeparability: structCoverage reflects fraction with a non-zero struct block
ok 2 - augmentedSeparability: structCoverage reflects fraction with a non-zero struct block
  ---
  duration_ms: 0.2934
  ...
# Subtest: augmentedSeparability: ZERO structural coverage -> augmented == text-only baseline (graceful)
ok 3 - augmentedSeparability: ZERO structural coverage -> augmented
... [+605 chars truncated]

### Assistant | 2026-06-25T10:01:35.298Z

All 5 tests pass. Now let me do the rigorous adversarial leakage analysis — the central question. Let me also verify the live run's degree-ablation claim and the dedup arithmetic by examining the sweep more carefully.

Let me trace the **leakage math** precisely with the test's clique corpus to confirm whether the "lift" is a leakage/clique artifact:

In `cliqueCorpus()`: every A engine imports 2 other A engines; every B engine imports 2 other B engines. `structuralVector(A1)` = histogram over A1's neighbors {A2,A3}, whose labels are `prism_calc`. So A1's struct block = one-hot on `prism_calc`. **But A1's own label is also `prism_calc`.** The structural vector reconstructs A1's own class — not by reading A1's own label, but because its neighbors share its class (homophily). This is the crux of the adversarial concern. Let me verify whether this is leakage or legitimate generalizable signal in the LOO context the harness is a proxy for.

### Assistant | 2026-06-25T10:01:44.335Z

[tool_use: Bash]

### User | 2026-06-25T10:01:47.642Z

[tool_result] Exit code 1
node:internal/modules/esm/load:217
    throw new ERR_UNSUPPORTED_ESM_URL_SCHEME(parsed, schemes);
          ^

Error [ERR_UNSUPPORTED_ESM_URL_SCHEME]: Only URLs with a scheme in: file, data, and node are supported by the default ESM loader. On Windows, absolute paths must be valid file:// URLs. Received protocol 'h:'
    at throwIfUnsupportedURLScheme (node:internal/modules/esm/lo
... [+511 chars truncated]

### Assistant | 2026-06-25T10:01:50.741Z

Windows ESM needs a file:// URL. Let me fix the import path.

### Assistant | 2026-06-25T10:01:56.030Z

[tool_use: Bash]

### User | 2026-06-25T10:01:59.840Z

[tool_result] A1 hist: [ [ 'prism_calc', 2 ] ]
A1 struct (no deg): [ 1, 0 ]
A1 struct w/ A1 OWN label REMOVED: [ 1, 0 ]
A2 hist (reads A1's label): [ [ 'prism_calc', 2 ] ]

### Assistant | 2026-06-25T10:02:09.502Z

This is the decisive confirmation. The probe proves:

1. **`A1 struct` is identical with and without A1's own label** (`[1,0]` both ways) — the feature is structurally independent of the engine's own label. **No self-leak.** Confirmed at lib level (lines 160-164) and now empirically.

2. **But the deeper concern is real and the author addresses it honestly**: A1's struct vector = `[1,0]` = one-hot on `prism_calc` = A1's OWN class. This is NOT because A1's label was read, but because of **homophily** (A1's neighbors share A1's class). This is exactly the GNN neighbourhood-aggregation signal the author intends — it's legitimate IF the homophily generalizes to genuinely-unwired engines. The author's docstring (lib lines 16-27) is precise about this distinction.

The critical adversarial nuance: in the test corpus, homophily is **perfect and synthetic** (100% same-class cliques). That's what produces the +0.3 margin lift in test 1. On the **real corpus**, structCoverage is only 19.6%, and import-homophily is far weaker. The +0.041 live margin lift is over a 19.6%-covered subset. Let me verify the verdict logic handles this honestly. Let me re-examine the verdict branch arithmetic and the dedup logic once more, then check one subtle issue in `concatWeighted`'s effect on the cosine ranking.

### Assistant | 2026-06-25T10:02:15.529Z

[tool_use: Bash]

### User | 2026-06-25T10:02:20.251Z

[tool_result] total runs: 9
a=0/off  a=0.25/off  a=0.5/off  a=0.75/off  a=1/off  a=0.25/on  a=0.5/on  a=0.75/on  a=1/on
alpha=0 runs in sweep: 1 [{"alpha":0,"degree":"off"}]

### Assistant | 2026-06-25T10:02:31.344Z

Sweep arithmetic confirmed:
- **9 runs total** (5 off-degree alphas + 4 on-degree alphas; the `alpha=0/on` correctly deduped). No off-by-one, no missing config.
- The `alpha=0/off` run **is** computed redundantly in the sweep (it duplicates the separate `baseline` computation), but it's **correctly excluded** from `best` selection via `if (r.alpha === 0) continue;` (line 155). The only cost is one extra redundant `augmentedSeparability` call and a redundant printed table row (`a=0 deg=off` shows `meanMargin (+0.0000)` — cosmetic, harmless). Not a correctness bug.
- `baseline` uses `{alpha:0, includeDegree:false}` (line 140) and `dMargin`/`dSep` are computed against it (lines 156-157). Correct.

Now let me verify the remaining concern in the verdict logic and `concatWeighted`'s cosine-ranking claim (the docstring asserts kNN ranking "stays monotone in alpha" — that's a load-bearing correctness claim because the harness's whole proxy validity rests on it).

The `concatWeighted` docstring (lib lines 218-231) claims the dot product of two concatenations = `(1-alpha)^2 * cos(text,text') + alpha^2 * cos(struct,struct')`, and that the per-vector norm "cancels in kNN ranking, which stays monotone in alpha." Let me scrutinize: the harness does NOT do kNN — it computes `classSeparability` = mean intra/inter **cosine** via `cosineSim`, which **re-normalizes each augmented vector**. So the per-vector norm does NOT cancel; `cosineSim` divides by the actual norm of each augmented vector. Let me verify this matters.

### Assistant | 2026-06-25T10:02:39.429Z

[tool_use: Bash]

### User | 2026-06-25T10:02:45.414Z

[tool_result] alpha=0: cosineSim(aug,aug)=1.0000 len=5
alpha=0.25: cosineSim(aug,aug)=1.0000 len=5
alpha=0.5: cosineSim(aug,aug)=1.0000 len=5
alpha=0.75: cosineSim(aug,aug)=1.0000 len=5
alpha=1: cosineSim(aug,aug)=1.0000 len=5
--- text-differs case ---
alpha=0: cos=0.9231
alpha=0.5: cos=0.9615
alpha=0.75: cos=0.9923
alpha=1: cos=1.0000
--- inter-class (struct orthogonal) ---
alpha=0: cos=0.9231
alpha=0.5: cos=0
... [+48 chars truncated]

### Assistant | 2026-06-25T10:03:20.433Z

This is well-behaved and the metric is sound:
- **Intra-class** (same struct, text differs): cosine rises with alpha (0.92 → 1.0) — augmentation pulls same-class together.
- **Inter-class** (orthogonal struct): cosine falls with alpha (0.92 → 0.0) — augmentation pushes different-class apart.
- So `margin = intra - inter` grows with alpha. The mechanism is correct and the `concatWeighted` fusion does what the harness claims, **measured via `cosineSim` on the actual augmented vectors** (the per-vector norm re-normalization is fine — it's a true cosine, and the separability metric is exactly intra-minus-inter cosine, internally consistent with the baseline diagnostic).

I have now verified every claim. Let me do a final check on one verdict-logic edge: the `lifts` threshold `dMargin > 0.01` combined with the rounding, and whether the "REAL lever" verdict is defensible at 19.6% coverage. Let me also confirm there's no NaN/empty crash path in `augmentedSeparability` when `summary.meanMargin` is null.

The `classSeparability` returns `meanMargin: null` when no class clears `minClass`. In `main`, `baseMargin = baseline.summary.meanMargin ?? 0` (line 151) and run deltas use `?? 0` (lines 156-157) — null-safe. The `report.best` guards with `best ?` (line 177). `structCoverage` divides by `labeled` only when `labeled > 0` (line 93). No NaN/empty crash path.

I have completed the full trace. Here is my verdict.

---

VERDICT: PASS

summary: The leakage discipline is sound and empirically verified — an engine's own dispatcher label never enters its own structural feature vector (proven: `A1 struct` is byte-identical with and without A1's own label present; only neighbours' labels at `node-structural-features.mjs:160-164` are read, self-edges dropped at `:98` and `:161`). The measured "lift" is a genuine **homophily** signal (neighbours share class), not self-leak; the author correctly bounds it as partial (19.6% coverage), necessary-not-sufficient, and explicitly defers the con
... [+3975 chars truncated]
