---
type: "chat-session"
source: "claude-code-cli"
session_id: "a803c8fa-8407-40f0-81d9-0a56f2031bb5"
title: "Read-only review (math correctness / silent breakage). Grade PASS or FAIL with f"
date: "2026-06-18"
first_ts: "2026-06-18T15:19:01.413Z"
last_ts: "2026-06-18T15:20:13.225Z"
cwd: "H:\\prism-slot-india"
messages: 22
user_msgs: 9
assistant_msgs: 13
raw_file: "H:/.claude/projects/H--prism-slot-india/a803c8fa-8407-40f0-81d9-0a56f2031bb5/subagents/agent-a0a0c8ee8c1d130ea.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:57"
---

# Read-only review (math correctness / silent breakage). Grade PASS or FAIL with f

> **claude-code-cli** | 2026-06-18 | 22 msgs (9 user / 13 assistant) | cwd: H:\prism-slot-india
> Raw: `H:/.claude/projects/H--prism-slot-india/a803c8fa-8407-40f0-81d9-0a56f2031bb5/subagents/agent-a0a0c8ee8c1d130ea.jsonl`

## Transcript

### User | 2026-06-18T15:19:01.413Z

Read-only review (math correctness / silent breakage). Grade PASS or FAIL with file:line.

CONTEXT: slot:india, NN-GRAPH tier-5. New NON-DESTRUCTIVE supervised diagonal-LDA (Fisher) per-dimension embedding reweighter. Computes per-dim Fisher weights w[d]=sqrt(S_B[d]/(S_W[d]+floor)) from labeled vectors (engine->dispatcher), reweights a ghost embedding cache (dequantize -> scale per-dim -> re-quantize), writes a NEW cache. Goal: emphasize dispatcher-discriminative dimensions for cosine k-NN. Measured: refs-only AUROC 0.7453->0.7505 (marginal), did NOT clear the gate.

FILES (read end-to-end):
- H:/prism/scripts/fisher-reweight-embeddings.mjs
- H:/prism/scripts/fisher-reweight-embeddings.test.mjs

VERIFY SPECIFICALLY:
1. FISHER MATH (fisherDimWeights): is S_B (between-class scatter = sum_c n_c (mu_c - globalMean)^2) and S_W (within-class scatter = sum_c sum_{i in c} (x_i - mu_c)^2) computed CORRECTLY? Is the ratio + sqrt right? Is the floor (relative to mean S_W) sound to avoid div-by-zero on a near-constant dim? Is the percentile clip + mean-1 normalization correct (no off-by-one in the percentile index)?
2. Does it correctly handle: empty input, labels.length != vectors.length (returns []), a single class (S_B=0 -> all weights ~0 -> after mean-1 normalize, what happens? mw could be ~0 -> division. Check the `|| 1` guard).
3. CACHE REWRITE (main): dequantize -> applyDimWeights -> quantize round-trip. Is the __meta line preserved + flagged? Are dim-mismatched rows passed through verbatim (not corrupted)? Is the row shape preserved ({...o, s, q})?
4. NON-DESTRUCTIVE: confirm it only writes --out (never the deployed ghost-node-embeddings.jsonl or the input --emb).
5. Any NaN/Infinity path (e.g., S_W=0 AND S_B=0 -> 0/floor=0, fine; a dim with all-zero -> globalMean 0, fine). Confirm no NaN can enter the written vectors.

Report P0/P1 with file:line. Tests (5/5) pass + live-validated; focus on the math + the round-trip.

### Assistant | 2026-06-18T15:19:07.877Z

I'll review both files end-to-end, focusing on the Fisher math and the round-trip correctness.

### Assistant | 2026-06-18T15:19:08.363Z

[tool_use: Read]

### Assistant | 2026-06-18T15:19:08.490Z

[tool_use: Read]

### User | 2026-06-18T15:19:10.510Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * fisher-reweight-embeddings.mjs -- SUPERVISED diagonal-LDA (Fisher) per-dimension reweighting of
4	 * the ghost embedding cache (slot:india, NN-GRAPH tier-5 coverage lever #19).
5	 *
6	 * WHY: the UNSUPERVISED sharp-text lever (PRISM_NNG_GHOST_SHARP) RAISED the global separability
7	 * margin but REGRESSED the deploy gate ([[reference_gnn_sharp_embed_lever_2026_06_1
... [+8058 chars truncated]

### User | 2026-06-18T15:19:10.698Z

[tool_result] 1	// Tests for fisher-reweight-embeddings.mjs -- the pure diagonal-LDA dimension-weighting helpers.
2	// Run: node --test scripts/fisher-reweight-embeddings.test.mjs
3	import { test } from "node:test";
4	import assert from "node:assert/strict";
5	import { fisherDimWeights, applyDimWeights } from "./fisher-reweight-embeddings.mjs";
6	
7	test("fisherDimWeights -- discriminative dim gets HIGH weight,
... [+2211 chars truncated]

### Assistant | 2026-06-18T15:19:13.859Z

Now let me trace the dependencies to verify the contracts the script relies on. I need to check `quantize`/`dequantize`, `loadLabeledVectors`, and the engine-mapper exports.

### Assistant | 2026-06-18T15:19:14.822Z

[tool_use: Read]

### Assistant | 2026-06-18T15:19:15.839Z

[tool_use: Grep]

### User | 2026-06-18T15:19:16.433Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * build-node-embeddings.mjs — NN-GRAPH-MS0/U-NNG-NODE-EMBED-INGEST
4	 *
5	 * Computes a 768-d nomic-embed-text semantic vector for every node in
6	 * state/shared/system-viz/system-graph-normalized.json (output of U1's
7	 * regen-graph-normalized.mjs). Writes int8-quantized vectors to
8	 * state/shared/system-viz/_node-embeddings.jsonl — the semantic feature
9	 * blo
... [+6615 chars truncated]

### User | 2026-06-18T15:19:18.277Z

[tool_result] 295:export function quantize(vec) {
296-  let norm = 0;
297-  for (const x of vec) norm += x * x;
298-  norm = Math.sqrt(norm) || 1;
299-  const unit = vec.map((x) => x / norm);
300-  let maxAbs = 0;
301-  for (const x of unit) { const a = Math.abs(x); if (a > maxAbs) maxAbs = a; }
302-  const scale = (maxAbs || 1) / 127;
303-  const q = unit.map((x) => Math.max(-127, Math.min(127, Math.round(x / 
... [+1053 chars truncated]

### Assistant | 2026-06-18T15:19:21.238Z

I've confirmed the `quantize`/`dequantize` contract. Now let me verify `loadLabeledVectors` (the input to the Fisher fit) and the engine-mapper exports, plus check whether `--out` could accidentally collide with the deployed store.

### Assistant | 2026-06-18T15:19:22.656Z

[tool_use: Grep]

### Assistant | 2026-06-18T15:19:23.644Z

[tool_use: Grep]

### User | 2026-06-18T15:19:23.833Z

[tool_result] 41:export function loadLabeledVectors(embText) {
42-  const out = new Map(); // engine -> Float64Array unit vector
43-  for (const line of embText.split(/\r?\n/)) {
44-    const t = line.trim();
45-    if (t.length === 0 || t.startsWith('{"__meta')) continue;
46-    let o; try { o = JSON.parse(t); } catch { continue; }
47-    if (!Array.isArray(o.q) || o.q.length === 0) continue;
48-    const s = 
... [+1244 chars truncated]

### User | 2026-06-18T15:19:24.687Z

[tool_result] H:\prism\scripts\lib\wired-engine-mapper.mjs:82:export function buildEngineDispatcherMap(dispatchersDir) {
H:\prism\scripts\lib\wired-engine-mapper.mjs-83-  const map = new Map();
H:\prism\scripts\lib\wired-engine-mapper.mjs-84-  if (!fs.existsSync(dispatchersDir)) return map;
H:\prism\scripts\lib\wired-engine-mapper.mjs-85-  const files = fs.readdirSync(dispatchersDir).filter(
H:\prism\scripts\li
... [+1298 chars truncated]

### Assistant | 2026-06-18T15:19:24.911Z

[tool_use: Grep]

### User | 2026-06-18T15:19:25.944Z

[tool_result] H:\prism\scripts\analyze-ghost-embed-separability.mjs:24: *   default --emb = state/shared/nn-graph/.cwref-newemb.jsonl (the 3206 codebase-wired cache)
H:\prism\scripts\analyze-ghost-embed-separability.mjs:36:const DEFAULT_EMB = path.join(ROOT, "state", "shared", "nn-graph", ".cwref-newemb.jsonl");
H:\prism\scripts\bench-embed-quantize-recall.mjs:25:  const out = { file: path.join(ROOT, "state", "
... [+2380 chars truncated]

### Assistant | 2026-06-18T15:19:31.384Z

Now I have the full picture of the contracts. Let me verify the dequantize dimension-mismatch guard math carefully and trace one concern about the single-class case and a potential silent-correctness issue with the `loadLabeledVectors` reading the input row's `q*s` vs what `dequantize` returns. Let me also double-check the percentile-clip index for off-by-one and a subtle issue with the single-class path.

Let me verify the exact line numbers in the main file and re-examine the single-class normalization path mathematically.

### Assistant | 2026-06-18T15:19:32.004Z

[tool_use: Read]

### User | 2026-06-18T15:19:33.670Z

[tool_result] 55	import { extractWiredEngines, buildGhostFromWiredEngine } from "./wired-engines-to-refpool.mjs";
56	import { loadLabeledVectors, classSeparability } from "./analyze-ghost-embed-separability.mjs";
57	
58	const __dirname = path.dirname(fileURLToPath(import.meta.url));
59	const ROOT = path.resolve(__dirname, "..");
60	const GRAPH = path.join(ROOT, "state", "shared", "system-viz", "system-graph.jso
... [+949 chars truncated]

### Assistant | 2026-06-18T15:20:13.225Z

I now have everything I need to render a verdict. Let me reason through each verification point.

**1. Fisher math** — `globalMean` (L50-52): sum all N vectors, divide by N. Correct. Per-class `mu` (L58-60): sum class members, divide by `nc`. Correct. `SB[d] += nc * (mu[d]-globalMean[d])^2` (L61): between-class scatter, correct (weighted by class size). `SW[d] += (v[d]-mu[d])^2` summed over members (L62): within-class scatter, correct. `w[d]=sqrt(SB/(SW+floor))` (L68): correct diagonal-LDA Fisher ratio (the sqrt makes it a per-dim *scale* factor, which is what `applyDimWeights` multiplies — sound: scaling a dim by `w` multiplies its variance contribution by `w^2 = SB/SW`, the Fisher ratio).

**Floor (L65-66)**: `meanSW` is the mean of `SW` across dims; `floor = eps + meanSW*1e-6`. Relative, robust against div-by-zero on a near-constant dim. Sound.

**Percentile clip (L70-71)**: `sorted` ascending. Index = `Math.floor(clip * len)` clamped to `[0, len-1]`. For `clipPct=0.99, len=768`: `floor(0.99*768)=760`, valid index. No off-by-one that would throw; the `|| 1` guards a 0/undefined cap. Minor: at `clipPct=1.0`, `floor(1.0*len)=len` → clamped to `len-1` (the max), so nothing is clipped — correct intent.

**Mean-1 normalize (L74-75)**: `mw = (sum/D) || 1`. Correct.

**2. Edge cases** — Empty/mismatched → `[]` (L42), tested. **Single class**: `globalMean == mu` for the one class, so `SB[d]=0` for all d → `w[d]=sqrt(0/(SW+floor))=0` → all weights 0 → `mw=(0/D)||1 = 0||1 = 1` (the `|| 1` guard fires because `0` is falsy) → `w[d]/=1` → all-zero weights returned. Then `applyDimWeights` produces an all-zero vector → `quantize` of all-zeros: `norm=0||1=1`, `unit` all 0, `maxAbs=0`, `scale=(0||1)/127=1/127`, `q` all 0. So a single-class fit zeroes every vector. This is a degenerate-but-defined outcome (no NaN, no throw), and the main guard requires `vectors.length >= 2` but NOT `classCount >= 2`. Worth noting but not a silent corruption — see findings.

**3. Cache rewrite roun
... [+4706 chars truncated]
