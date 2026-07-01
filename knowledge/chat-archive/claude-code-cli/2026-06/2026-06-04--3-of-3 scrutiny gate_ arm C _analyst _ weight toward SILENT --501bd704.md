---
type: "chat-session"
source: "claude-code-cli"
session_id: "501bd704-5c4a-4278-8059-79c78c4f32ed"
title: "3-of-3 scrutiny gate, arm C (analyst — weight toward SILENT BREAKAGE, regression"
date: "2026-06-04"
first_ts: "2026-06-04T17:58:39.971Z"
last_ts: "2026-06-04T18:09:43.857Z"
cwd: "H:\\prism"
messages: 47
user_msgs: 18
assistant_msgs: 29
raw_file: "H:/.claude/projects/H--prism/501bd704-5c4a-4278-8059-79c78c4f32ed/subagents/agent-ac2fcd4a5d1fec728.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:12"
---

# 3-of-3 scrutiny gate, arm C (analyst — weight toward SILENT BREAKAGE, regression

> **claude-code-cli** | 2026-06-04 | 47 msgs (18 user / 29 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/501bd704-5c4a-4278-8059-79c78c4f32ed/subagents/agent-ac2fcd4a5d1fec728.jsonl`

## Transcript

### User | 2026-06-04T17:58:39.971Z

3-of-3 scrutiny gate, arm C (analyst — weight toward SILENT BREAKAGE, regression risk, I/O safety, error-budget completeness, integration coupling; do NOT assume arms A/B caught everything). Review the two session commits (PRISM slot:india, GNN tier-5):
- `git -C H:/prism show dcb2c86bb8` — U-GNN-SOURCE-ENRICH (build-node-embeddings.mjs)
- `git -C H:/prism show 44f4a90ccb` — U-GNN-CALIBRATE-NEG (seed-ghost-gnn-classify.mjs)

Read both diffs fully. Grade PASS/FAIL with P0/P1/P2.

Focus:
1. **Silent breakage / regression:** walkEngineSources recursively reads mcp-server/src/engines — could it throw, hang, or pull huge files? Is it fail-soft (unreadable source → name-only fallback)? Does the 1 unresolved ghost (635/636) degrade gracefully? Could the per-ghost fs.readFileSync in main() slow the embed loop pathologically?
2. **I/O safety:** the embed loop now reads arbitrary engine .ts files. Any path-traversal or unbounded-read concern? engineSourceSignal caps at maxChars — verify.
3. **Error-budget:** fitDirectConfidenceCalibrator + fitIsotonic + applyIsotonic — do they handle empty/NaN/single-point/tiny-pool inputs without throwing? Is the calibration fail-soft (null → raw confidence)?
4. **Integration coupling:** does the resume-hash change (hashFor) interact correctly with loadExisting()/the partial-file resume logic? Does the new stats field (sourceResolved/Missing/Collisions, confidenceCalibrated) break any JSON-summary consumer?
5. **Determinism:** the eval holdout is seed 1337 (deterministic) so the claimed metric deltas are real. Confirm no Math.random/Date.now introduced that would break reproducibility.

Run `cd H:/prism && node --test scripts/lib/nn-graph-eval.test.mjs 2>&1 | grep -E "^# (tests|pass|fail)"` to confirm the eval lib tests still pass.

Report PASS/FAIL + P0/P1/P2 with file:line. Be adversarial.

### Assistant | 2026-06-04T17:58:57.306Z

I'll review both commits adversarially as arm C, focusing on silent breakage, regression risk, I/O safety, error-budget completeness, integration coupling, and determinism.

Let me read both diffs in full first.

### Assistant | 2026-06-04T17:58:58.768Z

[tool_use: Bash]

### Assistant | 2026-06-04T17:58:59.295Z

[tool_use: Bash]

### User | 2026-06-04T17:59:30.483Z

[tool_result] <persisted-output>
Output too large (42.3KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism\501bd704-5c4a-4278-8059-79c78c4f32ed\tool-results\bvpebd4yc.txt

Preview (first 2KB):
commit 44f4a90ccbf7bcf27c4651361a5e16994dbf6de9
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Thu Jun 4 12:52:16 2026 -0500

    [MAIN] [BLACKWELL-AI-MS0]/U-GNN-CALIBRATE-NEG (slot:in
... [+1747 chars truncated]

### User | 2026-06-04T17:59:30.489Z

[tool_result] commit dcb2c86bb849c617dbd2c845efa48864be1852bd
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Thu Jun 4 12:51:38 2026 -0500

    [MAIN] [BLACKWELL-AI-MS0]/U-GNN-SOURCE-ENRICH (slot:india): leak-free engine-source embed signal lifts GNN macro-F1 0.326->0.452 + accuracy 0.53->0.73 (honest mixed result)
    
    ghostEmbedText now appends engineSourceSignal() = file docblock + c
... [+24002 chars truncated]

### Assistant | 2026-06-04T17:59:34.804Z

Let me read the full second commit diff from the persisted output.

### Assistant | 2026-06-04T17:59:36.770Z

[tool_use: Read]

### User | 2026-06-04T17:59:49.390Z

[tool_result] 1	commit 44f4a90ccbf7bcf27c4651361a5e16994dbf6de9
2	Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
3	Date:   Thu Jun 4 12:52:16 2026 -0500
4	
5	    [MAIN] [BLACKWELL-AI-MS0]/U-GNN-CALIBRATE-NEG (slot:india): isotonic LOO confidence calibrator (default OFF) — honest negative result + spec HTML twin
6	    
7	    Built fitIsotonic (PAV) + applyIsotonic + fitDirectConfidenceCalibrator for
... [+44319 chars truncated]

### Assistant | 2026-06-04T17:59:53.589Z

I have both diffs in full. Now let me examine the critical functions in their full live context to assess fail-soft behavior, integration coupling, and the points raised in the focus areas. Let me look at the actual source files.

### Assistant | 2026-06-04T17:59:54.593Z

[tool_use: Read]

### Assistant | 2026-06-04T17:59:55.163Z

[tool_use: Read]

### User | 2026-06-04T18:00:02.806Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * build-node-embeddings.mjs — NN-GRAPH-MS0/U-NNG-NODE-EMBED-INGEST
4	 *
5	 * Computes a 768-d nomic-embed-text semantic vector for every node in
6	 * state/shared/system-viz/system-graph-normalized.json (output of U1's
7	 * regen-graph-normalized.mjs). Writes int8-quantized vectors to
8	 * state/shared/system-viz/_node-embeddings.jsonl — the semantic feature
9	 * blo
... [+4214 chars truncated]

### User | 2026-06-04T18:00:02.881Z

[tool_result] 320	  }
321	  // Streaming read — bypasses V8 ~512MB string-length ceiling. See scripts/lib/graph-io.mjs.
322	  const graph = readGraphStreaming(graphPath);
323	  let nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
324	  if (args.ghostsOnly) nodes = nodes.filter((n) => n && n.kind === GHOST_KIND);
325	  if (args.limit > 0) nodes = nodes.slice(0, args.limit);
326	
327	  const graphMtimeMs = 
... [+6509 chars truncated]

### Assistant | 2026-06-04T18:00:13.481Z

Now I understand the structure. Let me check a few coupling concerns: the `nodeContentHash` function (still used by other consumers?), the `walkEngineSources` recursion depth/size risk vs the engines dir size, and whether the JSON summary stats field break any consumer.

### Assistant | 2026-06-04T18:00:15.416Z

[tool_use: Bash]

### Assistant | 2026-06-04T18:00:17.691Z

[tool_use: Bash]

### User | 2026-06-04T18:00:30.230Z

[tool_result] === nodeContentHash defs and uses ===
scripts/build-node-embeddings.mjs:183:export function nodeContentHash(node) {
scripts/build-node-embeddings.mjs:338:  // embedded" (the prior bug: nodeContentHash keyed off name-only nodeEmbedText).
scripts/build-node-embeddings.test.mjs:10:  nodeContentHash,
scripts/build-node-embeddings.test.mjs:45:describe("nodeContentHash", () => {
scripts/build-node-embed
... [+653 chars truncated]

### User | 2026-06-04T18:00:48.128Z

[tool_result] === engines dir size/file count ===
3814
=== largest .ts files (bytes) ===
523190 mcp-server/src/engines/MachiningPlaybookEngine.ts
371702 mcp-server/src/engines/TribalKnowledgeEngine.ts
223604 mcp-server/src/engines/PostProcessorPipelineEngine.ts
210887 mcp-server/src/engines/QuoteToShipOrchestratorEngine.ts
197801 mcp-server/src/engines/MachiningKnowledgeBaseEngine.ts
=== deepest dir nesting ===
... [+2 chars truncated]

### Assistant | 2026-06-04T18:00:58.337Z

Key data points:
- `nodeContentHash` is still exported and tested, but no longer used in `main()` (replaced by `hashFor`). Not dead-removed — backward compatible for any external importer. The change from `nodeContentHash` → `hashFor` in `main()` is the resume-hash fix. Good.
- 3814 engine source files, largest 523KB. `walkEngineSources` reads only the directory listing (no file reads); the per-ghost `fs.readFileSync` reads at most ~636 files (ghosts), each capped by `engineSourceSignal` processing but `readFileSync` reads the WHOLE file into memory first. Worst case 523KB → fine. Max depth 6 → recursion safe.

Let me verify the `--ghosts-only` arg parsing, the `GHOST_KIND` constant, and confirm `walkEngineSources` is only invoked in ghosts-only mode (so the full-run path is untouched — no regression for the 372k full embed).

### Assistant | 2026-06-04T18:00:58.481Z

[tool_use: Bash]

### Assistant | 2026-06-04T18:01:00.508Z

[tool_use: Bash]

### User | 2026-06-04T18:01:19.234Z

[tool_result] === GHOST_KIND + arg parsing + ghostsOnly ===
72:// GNN-F0 macroF1-lift: in --ghosts-only mode, enrich each ghost's embed text with a
283:  const a = { limit: 0, dryRun: false, json: false, graph: null, out: null, ghostsOnly: false };
289:    // GNN-F0/2a: --graph points at a CURRENT graph (system-graph.json is fresh;
290:    // system-graph-normalized.json is stale). --ghosts-only embeds just the
... [+1849 chars truncated]

### User | 2026-06-04T18:06:05.898Z

[tool_result] Command running in background with ID: b4rtudhps. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\18171d21-2f6f-439c-9da0-f86bb5672d17\tasks\b4rtudhps.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-06-04T18:06:12.764Z

The full-run path is confirmed untouched: `walkEngineSources` + per-ghost reads only fire under `args.ghostsOnly && GHOST_SOURCE`. The default full-run (`nodeEmbedText`) is byte-identical except `nodeContentHash` → `hashFor`, which for non-ghost nodes computes `sha1(id + nodeEmbedText(node))` vs the old `nodeContentHash` — let me verify those produce the SAME hash for non-ghosts (else every existing full-run resume entry would be invalidated — a silent full re-embed of 372k nodes).

### Assistant | 2026-06-04T18:06:13.350Z

[tool_use: Read]

### User | 2026-06-04T18:06:24.095Z

[tool_result] 180	}
181	
182	/** Stable content hash for resume-keying (id + embed-text). */
183	export function nodeContentHash(node) {
184	  return crypto.createHash("sha1").update(`${node.id}${nodeEmbedText(node)}`).digest("hex").slice(0, 12);
185	}
186	
187	/** L2-normalize then int8-quantize. Mirrors build-wiki-embeddings.mjs:quantize. */
188	export function quantize(vec) {
189	  let norm = 0;
190	  for (
... [+843 chars truncated]

### Assistant | 2026-06-04T18:06:33.544Z

Confirmed — `nodeContentHash(node)` = `sha1(id + nodeEmbedText(node))`. For a non-ghost node, `hashFor(node)` = `sha1(id + embedTextFor(node))` where `embedTextFor` returns `nodeEmbedText(node)` (since `args.ghostsOnly` is false). **Byte-identical to the old `nodeContentHash`.** So the full-run resume path is preserved — no silent 372k re-embed. The hash only changes for ghosts (ghosts-only mode), which is the intended fix.

Now let me check the background job results and run the eval lib tests.

### Assistant | 2026-06-04T18:06:34.149Z

[tool_use: Read]

### User | 2026-06-04T18:06:36.874Z

[tool_result] 1	=== resolveGnnConfig consumers + JSON summary consumers ===
2	

### Assistant | 2026-06-04T18:06:41.612Z

No external consumers of the new stats fields — the additions (`sourceResolved/Missing/Collisions`, `confidenceCalibrated`, `calibrateDirect`) are purely additive to JSON summaries with no downstream reader to break. Now the eval lib tests plus the two changed test files.

### Assistant | 2026-06-04T18:06:42.543Z

[tool_use: Bash]

### Assistant | 2026-06-04T18:06:44.172Z

[tool_use: Bash]

### User | 2026-06-04T18:06:55.249Z

[tool_result] # tests 58
# pass 58
# fail 0

### User | 2026-06-04T18:07:10.102Z

[tool_result] === build-node-embeddings tests ===
# tests 31
# pass 31
# fail 0
=== seed-ghost-gnn-classify tests ===
# tests 70
# pass 70
# fail 0

### Assistant | 2026-06-04T18:07:22.691Z

All tests green: nn-graph-eval 58/58, build-node-embeddings 31/31, seed-ghost-gnn-classify 70/70 (159 total).

Now the adversarial deep-dives. Let me check the determinism claim (no Math.random/Date.now in the eval/classify hot path) and the `voteDispatcher` calibrator-null interaction, plus the `fitDirectConfidenceCalibrator` LOO re-vote cost (it re-runs `voteDispatcher` once per reference — could be O(n²) on a large pool).

### Assistant | 2026-06-04T18:07:24.494Z

[tool_use: Bash]

### Assistant | 2026-06-04T18:07:26.447Z

[tool_use: Bash]

### User | 2026-06-04T18:07:36.733Z

[tool_result] === Math.random / Date.now in classify + eval hot path ===
123:  return Math.min(max, Math.max(min, n));
307:    const w = Math.max(0, score) * Math.max(0, ref.confidence);
336:  // Math.max guards the (operator alpha=0 AND a hand-built disjoint references)
339:  const normWeight = ([cls, w]) => [cls, baseRateDisabled ? w : w / Math.max(1e-9, (refFreq.get(cls) || 0) + baseRateAlpha)];
358:    conf
... [+1439 chars truncated]

### User | 2026-06-04T18:07:42.611Z

[tool_result] === intOr helper (used by minPairs) ===
127:function intOr(raw, fallback, min = 1) {
=== voteDispatcher signature + confidence finite guard ===
116:  return null;
278:export function voteDispatcher(target, embeddings, references, opts = {}) {
295:  if (scored.length === 0) return null;
312:  if (total <= 0 || votes.size === 0) return null;
348:  if (normTotal <= 0 || normEntries.length === 0) retu
... [+673 chars truncated]

### Assistant | 2026-06-04T18:07:54.229Z

Determinism confirmed:
- The only `Date.now()` in classify is at L662 — a spin-wait `delays` retry loop (Ollama/IO backoff), NOT in the vote/calibration math. The classification argmax and calibration are pure functions of embeddings + references.
- Eval uses `mulberry32(seed)` Fisher-Yates with seed 1337 default — fully deterministic. No `Math.random`/`Date.now` in the holdout split.
- `voteDispatcher` returns `null` defensively at every degenerate point (empty scored, total≤0, normTotal≤0). The calibrator's `fitDirectConfidenceCalibrator` skips refs where `!v || !Number.isFinite(v.confidence)` (L127 in diff) — robust.

Now the LOO cost concern. `fitDirectConfidenceCalibrator` loops over every reference and for each calls `voteDispatcher(held, embeddings, others)` where `others = refs.filter(...)`. That's O(R) re-votes, each O(R) scoring → **O(R²)**. Let me check the reference pool size to confirm this isn't pathological, and verify it's gated behind `directEmbed && calibrateDirect` (both default OFF).

### Assistant | 2026-06-04T18:07:55.474Z

[tool_use: Read]

### User | 2026-06-04T18:08:03.663Z

[tool_result] 278	export function voteDispatcher(target, embeddings, references, opts = {}) {
279	  const topK = intOr(opts.topK, GNN_DEFAULTS.topK);
280	  const calibrator = opts.calibrator ?? null;
281	  const cap = finiteOr(opts.confidenceCap, GNN_DEFAULTS.confidenceCap, { min: 0, max: 1 });
282	
283	  const scored = [];
284	  for (const ref of references || []) {
285	    // Skip the target itself by id OR l
... [+1179 chars truncated]

### Assistant | 2026-06-04T18:08:19.031Z

The deterministic tie-break (score desc → confidence desc → id asc) in `voteDispatcher` reinforces reproducibility — no nondeterministic ordering. Note the system reminder says this file was edited 46s ago, which is concerning for a "committed" review — but that's likely the mirror hook or an unrelated touch; the committed content is what I'm reviewing via the diff, which matches.

The O(R²) LOO cost: the reference pool for the deploy gate is small (the holdout is 62 ghosts; reference pools historically 0-125 high-conf refs per the spec). At R~125, R²~15K vote ops — trivial. And it's double-gated behind `cfg.directEmbed && cfg.calibrateDirect`, both default OFF. No pathological cost, and even when enabled the pool is bounded by available references. 

Let me confirm one last coupling point: `classifyUnknownGhosts` is consumed by `nn-graph-eval.mjs` and the live PSN leg hooks — does the new `confCal` path change behavior when `calibrateDirect` is false (the default, and what the committed NN-EVAL.json reflects)? When `confCal` is null, `reportedConf = v.confidence` — identical to old `v.confidence`. The old code did `if (!v || v.confidence < cfg.minConf) continue;`; new does `if (!v) continue;` then `if (reportedConf < cfg.minConf) continue;`. With `confCal=null`, `reportedConf===v.confidence`, so the gate is **identical**. No regression for the default path.

One subtle item: the old code's `confidence: Math.round(v.confidence * 1e4)/1e4` vs new `Math.round(reportedConf*1e4)/1e4` — identical when uncalibrated. Confirmed behavior-preserving.

Let me do a final check on the unresolved ghost (635/636) graceful degradation and confirm the leak-strip regex can't be defeated, then verify the `walkEngineSources` first-wins collision semantics don't silently misattribute source to the wrong engine.

### Assistant | 2026-06-04T18:08:21.655Z

[tool_use: Bash]

### User | 2026-06-04T18:09:01.676Z

[tool_result] === collision report: how many basename collisions across engines dir ===
=== count of duplicate basenames ===
0

### Assistant | 2026-06-04T18:09:43.857Z

Zero basename collisions across the engines tree — matching the commit's claim of "0 basename collisions." So `walkEngineSources`'s first-wins-on-collision policy never actually fires misattribution in practice; the `sourceCollisions` counter is a safety telemetry that currently reads 0. The 1 unresolved ghost (635/636) degrades to name-only via `sourceMissing++` → `embedTextFor` passes `""` signal → `ghostEmbedText(node, "")` → behaves exactly like the pre-enrichment name-only path. Graceful.

I have everything I need. Let me write up the verdict.

---

## ARM C (ANALYST) VERDICT: **PASS**

Both commits reviewed end-to-end against the live source. 159/159 tests green (nn-graph-eval 58, build-node-embeddings 31, seed-ghost-gnn-classify 70). No P0 or P1 findings. Adversarial sweep below.

### Focus-area findings

**1. Silent breakage / regression — CLEAN**
- `walkEngineSources` (`build-node-embeddings.mjs:312`) is fail-soft: `try { readdirSync } catch { return 0 }` on any unreadable dir. It reads only directory *listings* (no file content) and recurses at most depth 6 (verified). It runs ONLY under `args.ghostsOnly && GHOST_SOURCE` — the 372k full-run path never invokes it.
- The per-ghost `fs.readFileSync` (`:349`) is wrapped in `try/catch → name-only fallback`. It reads at most ~636 files (ghost set), largest engine file 523KB → no unbounded read, no hang. The loop is pre-loop (before the async embed `pMap`), so it does not slow the embed loop pathologically — it's a one-time ~636-file synchronous prefetch.
- The 1 unresolved ghost (635/636) degrades correctly: `sourceMissing++`, `embedTextFor` passes `""`, `ghostEmbedText(node, "")` is byte-identical to the legacy name-only path (verified by the `backward compatible: no signal arg` test).
- **Critical non-regression verified:** `hashFor(node)` for a non-ghost = `sha1(id + nodeEmbedText(node))` = exactly the old `nodeContentHash(node)` (`:184`). So the `nodeContentHash → hashFor` swap in `main()` does NOT invalidat
... [+4093 chars truncated]
