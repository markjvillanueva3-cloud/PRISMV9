---
type: "chat-session"
source: "claude-code-cli"
session_id: "a803c8fa-8407-40f0-81d9-0a56f2031bb5"
title: "Review TWO new files end-to-end for correctness, non-destructiveness, and honest"
date: "2026-06-18"
first_ts: "2026-06-18T01:41:15.046Z"
last_ts: "2026-06-18T01:43:59.664Z"
cwd: "H:\\prism-slot-india"
messages: 59
user_msgs: 22
assistant_msgs: 37
raw_file: "H:/.claude/projects/H--prism-slot-india/a803c8fa-8407-40f0-81d9-0a56f2031bb5/subagents/agent-a363fec3970570ccd.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:57"
---

# Review TWO new files end-to-end for correctness, non-destructiveness, and honest

> **claude-code-cli** | 2026-06-18 | 59 msgs (22 user / 37 assistant) | cwd: H:\prism-slot-india
> Raw: `H:/.claude/projects/H--prism-slot-india/a803c8fa-8407-40f0-81d9-0a56f2031bb5/subagents/agent-a363fec3970570ccd.jsonl`

## Transcript

### User | 2026-06-18T01:41:15.046Z

Review TWO new files end-to-end for correctness, non-destructiveness, and honesty. Grade PASS or FAIL with P0/P1/P2 findings and file:line citations. Read BOTH files fully.

FILES:
1. H:/prism/scripts/measure-codebase-wired-refpool-auroc.mjs
2. H:/prism/scripts/measure-codebase-wired-refpool-auroc.test.mjs

CONTEXT: This is a NON-DESTRUCTIVE measurement harness (slot:india, U-GNN-CODEBASE-WIRED-APPLY). Its job: measure whether adding ~3206 "codebase-wired" reference ghosts to the GNN tier-5 direct-embed pool improves the deployed selective-deploy posture, WITHOUT writing the shared 542MB system-graph.json or the deployed ghost-node-embeddings.jsonl. It loads the real graph, runs a BASELINE assessment, injects the 3206 ghosts IN MEMORY + uses a merged temp embeddings file, runs an ENRICHED assessment, and prints a verdict. The measured result was: baseline AUROC 0.7891 deploy-ready-selective; enriched AUROC 0.7716 no-deployable-operating-point -> APPLY-RECOMMENDED: NO.

VERIFY SPECIFICALLY (cite file:line):
- NON-DESTRUCTIVE GUARANTEE: confirm it NEVER writes state/shared/system-viz/system-graph.json or state/shared/nn-graph/ghost-node-embeddings.jsonl. Only temp files + an optional side-cache (.cwref-newemb.jsonl) should be written. Flag ANY path that could mutate the deployed graph/embeddings.
- MEASUREMENT CORRECTNESS: the baseline runs on the pristine graph BEFORE the 3206 nodes are pushed (order matters - baseline must not see the injected nodes). Verify the inject happens AFTER the baseline runAssessment. Verify edges are intentionally omitted (direct-embed is pure cosine kNN over embeddings, no model/structure).
- mergeEmbeddingBodies (the pure helper): one __meta header kept, id-dedup base-wins, blank/garbage-line skip. Cross-check the test asserts real values (not stubs). 
- VERDICT HONESTY (R12): does the printed verdict over-claim or soften? The harness must NOT claim the apply is safe/good when the gate is not held. Confirm APPLY-RECOMMENDED gates on (enr
... [+226 chars truncated]

### Assistant | 2026-06-18T01:41:17.805Z

I'll review both files end-to-end. Let me read them fully.

### Assistant | 2026-06-18T01:41:18.748Z

[tool_use: Read]

### Assistant | 2026-06-18T01:41:18.804Z

[tool_use: Read]

### User | 2026-06-18T01:41:20.363Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * measure-codebase-wired-refpool-auroc.mjs -- NON-DESTRUCTIVE deploy-gate measurement for the
4	 * U-GNN-CODEBASE-WIRED-APPLY lever (slot:india 2026-06-18). Answers ONE question with real
5	 * metrics, never an assumption: does adding the ~3206 codebase-wired reference ghosts (engine
6	 * imported by exactly one dispatcher -> confidence 1.0 label) to the GNN tier-5 d
... [+12369 chars truncated]

### User | 2026-06-18T01:41:20.401Z

[tool_result] 1	// Tests for measure-codebase-wired-refpool-auroc.mjs -- the pure embeddings-merge helper.
2	// The eval math is the already-tested nn-graph-eval lib; here we pin the merge invariants the
3	// non-destructive measurement depends on: one __meta header, id-dedup (base wins), honest counts.
4	import { test } from "node:test";
5	import assert from "node:assert/strict";
6	import { mergeEmbeddingBodie
... [+3073 chars truncated]

### Assistant | 2026-06-18T01:41:24.630Z

I have both files. Now let me verify the key claims by tracing the dependencies — the imported functions, the assessment behavior, and the build-node-embeddings child path. Let me trace the blast radius.

### Assistant | 2026-06-18T01:41:25.093Z

[tool_use: Read]

### Assistant | 2026-06-18T01:41:25.503Z

[tool_use: Read]

### User | 2026-06-18T01:41:25.674Z

[tool_result] read-once-guard: 'H:\prism\scripts\wired-engines-to-refpool.mjs' was already read 16m ago in this session and is unchanged (mtime 1781726072068). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-18T01:41:26.608Z

[tool_result] 1	/**
2	 * scripts/lib/graph-io.mjs — streaming read+write for `system-graph.json`
3	 *
4	 * Bypasses V8's ~512MB max-string-length ceiling that crashes legacy
5	 * `JSON.parse(fs.readFileSync(p, "utf8"))` (read) and `JSON.stringify(G)`
6	 * (write) calls once the graph passes ~512MB serialized.
7	 *
8	 * Discovered: papa /loop 2026-05-23, U-PSN-VIZ-REGEN, on the 541MB graph.
9	 * Memory: `referen
... [+15898 chars truncated]

### Assistant | 2026-06-18T01:41:32.299Z

`readGraphStreaming` is read-only (no writes). Good. Now let me check the wired-engines-to-refpool.mjs functions (it's in context from 16m ago, but I need to verify the exact behavior of `extractWiredEngines`, `buildGhostFromWiredEngine`, and confirm importing the module doesn't trigger side effects). Let me grep for its main-guard and exports, plus check `runAssessment` for any write paths and the `--apply` path.

### Assistant | 2026-06-18T01:41:34.308Z

[tool_use: Grep]

### User | 2026-06-18T01:41:35.714Z

[tool_result] 37: *   node scripts/wired-engines-to-refpool.mjs --apply    # merge ghosts into system-graph.json
48:import { readGraphStreaming, writeGraphStreamingAtomic } from "./lib/graph-io.mjs";
55:const GRAPH_PATH = path.join(ROOT, "state", "shared", "system-viz", "system-graph.json");
77:export function extractWiredEngines(engineDispatcherMap) {
98:export function buildGhostFromWiredEngine(w) {
131:    i
... [+566 chars truncated]

### Assistant | 2026-06-18T01:41:35.800Z

[tool_use: Grep]

### User | 2026-06-18T01:41:38.970Z

[tool_result] 13: *      confidence is at or above refMinConf.
48:const GHOST_KIND = "ghost.unwired-engine";
57:  refMinConf: 0.8,     // a ghost is a reference + holdout candidate at/above this
454:export function buildHoldout(graph, opts = {}) {
455:  const refMinConf = Number.isFinite(opts.refMinConf) ? opts.refMinConf : HARNESS_DEFAULTS.refMinConf;
468:    if (!Number.isFinite(n.confidence) || n.confidence 
... [+935 chars truncated]

### Assistant | 2026-06-18T01:41:42.496Z

There's a `fs.writeFileSync` at nn-graph-eval.mjs:865. I need to verify what that writes — it could be a write path triggered by `runAssessment`. Let me read that region, and verify the wired-engines export functions are pure (no write side-effects when imported), plus check the `assessHoldout` directEmbed path reads `directEmbedPath` read-only.

### Assistant | 2026-06-18T01:41:43.438Z

[tool_use: Read]

### Assistant | 2026-06-18T01:41:44.020Z

[tool_use: Read]

### User | 2026-06-18T01:41:44.382Z

[tool_result] 840	  for (let i = 0; i < args.length; i++) {
841	    const a = args[i];
842	    if (a === "--help" || a === "-h") out.help = true;
843	    else if (a === "--no-write") out.noWrite = true;
844	    else if (a === "--checkpoint") out.checkpoint = args[++i];
845	    else if (a === "--graph") out.graphPath = args[++i];
846	    else if (a === "--out-dir") out.outDir = args[++i];
847	    else if (a === 
... [+3216 chars truncated]

### User | 2026-06-18T01:41:45.107Z

[tool_result] 77	export function extractWiredEngines(engineDispatcherMap) {
78	  const wirings = [];
79	  const conflicts = [];
80	  if (!engineDispatcherMap || typeof engineDispatcherMap.entries !== "function") {
81	    return { wirings, conflicts };
82	  }
83	  for (const [engine, nsSet] of engineDispatcherMap.entries()) {
84	    if (typeof engine !== "string" || !engine.trim()) continue;
85	    const dispatc
... [+6029 chars truncated]

### Assistant | 2026-06-18T01:41:51.132Z

Key verifications so far:
- `extractWiredEngines` and `buildGhostFromWiredEngine` are pure (no I/O). Importing `wired-engines-to-refpool.mjs` only runs `main()` under `isMain` guard, which is false when imported. No import-time side effect.
- `runAssessment` itself does NOT write — the write path is `writeAssessment`/`atomicWriteFileSync`, which the harness never calls. `runAssessment` is read-only of `directEmbedPath`.

Now I need to confirm `runAssessment(opts)` does NOT internally call `writeAssessment`, and that `assessHoldout` with `directEmbed` only READS the `directEmbedPath`. Let me read the `runAssessment` body and the direct-embed read path.

### Assistant | 2026-06-18T01:41:51.577Z

[tool_use: Read]

### User | 2026-06-18T01:41:52.481Z

[tool_result] 601	export function runAssessment(opts = {}) {
602	  let graph = opts.graph;
603	  if (!graph) {
604	    // U-NN-PREDICTOR-EMBED-WIRE follow-up (2026-05-24, slot papa): the live
605	    // system-viz graph crossed V8's ~512MB max-string-length. Use the streaming
606	    // reader for any graph >256MB. Preserve the test seam (readFileImpl) so
607	    // unit tests that inject smaller graphs still t
... [+6420 chars truncated]

### Assistant | 2026-06-18T01:41:58.089Z

Confirmed: `runAssessment` returns the result object and NEVER calls `writeAssessment`. Writing only happens in `writeAssessment`/`atomicWriteFileSync`, which the harness never calls. The harness's `runAssessment` calls are pure-read of `directEmbedPath`.

Now let me verify the `assessHoldout` direct-embed read path reads `directEmbedPath` read-only, and confirm `buildHoldout` pulls in the injected nodes by kind (so the enriched run actually sees them). Let me also confirm the test file path and that the test imports the module without triggering main.

### Assistant | 2026-06-18T01:41:59.129Z

[tool_use: Read]

### User | 2026-06-18T01:42:00.051Z

[tool_result] 454	export function buildHoldout(graph, opts = {}) {
455	  const refMinConf = Number.isFinite(opts.refMinConf) ? opts.refMinConf : HARNESS_DEFAULTS.refMinConf;
456	  const seed = Number.isInteger(opts.seed) ? opts.seed : HARNESS_DEFAULTS.seed;
457	  const requested = Number.isInteger(opts.holdout) && opts.holdout > 0 ? opts.holdout : HARNESS_DEFAULTS.holdout;
458	
459	  const nodes = graph && Arra
... [+4586 chars truncated]

### Assistant | 2026-06-18T01:42:06.430Z

This confirms the measurement correctness claim:
- `buildHoldout` builds its pool from `graph.nodes` filtered by `n.kind === GHOST_KIND` (`ghost.unwired-engine`) with `confidence >= refMinConf` (0.8). The injected `ghost.codebase-wired.*` nodes have `kind: "ghost.unwired-engine"` and `confidence: 1.0`, so the ENRICHED run picks them up — but ONLY after they're pushed into `graph.nodes` (line 169). The baseline at line 163 runs before the inject loop at line 167-169. Order is correct: baseline does NOT see injected nodes.

Now the critical concern: the harness reuses the SAME `graph` object across baseline and enriched. The baseline `runAssessment` is synchronous and completes (returns `base`) before the inject. `runAssessment`/`buildHoldout`/`assessHoldout` don't mutate `graph.nodes` (they build a new `pool` array, read-only). Good. Let me confirm `classifyUnknownGhosts` directEmbed path reads `directEmbedPath` read-only and doesn't write. Let me grep it.

### Assistant | 2026-06-18T01:42:08.248Z

[tool_use: Grep]

### User | 2026-06-18T01:42:10.857Z

[tool_result] 539:    directEmbedPath: opts.directEmbedPath,
865:    fs.writeFileSync(tmp, data);

### Assistant | 2026-06-18T01:42:14.246Z

`directEmbedPath` is forwarded into `classifyUnknownGhosts`. Let me find where it's actually consumed (the read of the embeddings file) — it may be in a sibling lib. And verify no mutation of `graph.nodes` happens anywhere in the eval path.

### Assistant | 2026-06-18T01:42:16.093Z

[tool_use: Grep]

### User | 2026-06-18T01:42:17.351Z

[tool_result] <persisted-output>
Output too large (28.9KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism-slot-india\a803c8fa-8407-40f0-81d9-0a56f2031bb5\tool-results\toolu_01FWq5xwKMVrUqxizJ3atT1g.txt

Preview (first 2KB):
H:\prism\scripts\lib\blueprint-vl-train-runner.test.mjs:6:import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
H:\prism\scripts\lib\blueprint-vl-train-runner.test.m
... [+1824 chars truncated]

### Assistant | 2026-06-18T01:42:20.124Z

Too broad. Let me narrow to where `directEmbedPath` is consumed — the function that reads the embeddings for direct-embed mode (likely `classifyUnknownGhosts` or a vote helper).

### Assistant | 2026-06-18T01:42:21.169Z

[tool_use: Grep]

### User | 2026-06-18T01:42:22.734Z

[tool_result] H:\prism\scripts\measure-binary-auroc.mjs:63:  const base = runAssessment({ graph, directEmbed: true, directEmbedPath: REAL_EMBED });
H:\prism\scripts\measure-binary-auroc.mjs:70:    bin = runAssessment({ graph, directEmbed: true, directEmbedPath: sign.path });
H:\prism\scripts\measure-codebase-wired-refpool-auroc.mjs:163:    const base = summarize("baseline", runAssessment({ graph, directEmbed: t
... [+1091 chars truncated]

### Assistant | 2026-06-18T01:42:31.111Z

The direct-embed read happens in `seed-ghost-gnn-classify.mjs` via `loadDirectEmbeddings`. The `directEmbedPath` flows: harness → `runAssessment` → `assessHoldout` → `classifyUnknownGhosts`. Let me confirm `classifyUnknownGhosts` (used in nn-graph-eval) routes `directEmbedPath` to `loadDirectEmbeddings` and that `loadDirectEmbeddings` is read-only. The harness passes `directEmbedPath: mergedPath` (a temp file) and `REAL_EMBED` for baseline. Let me verify `loadDirectEmbeddings` only reads.

### Assistant | 2026-06-18T01:42:32.030Z

[tool_use: Read]

### User | 2026-06-18T01:42:32.924Z

[tool_result] 490	    // tier handles all. Unscoped (standalone) zero-UNKNOWN is a benign no-op.
491	    const scoped = opts.targetNames instanceof Set && opts.targetNames.size > 0;
492	    return empty(scoped, scoped ? "no-targets-matched" : "no-targets",
493	      { targets: 0, references: references.length });
494	  }
495	  if (references.length === 0) {
496	    return empty(true, "no-references", { targets:
... [+2082 chars truncated]

### Assistant | 2026-06-18T01:42:33.127Z

[tool_use: Grep]

### User | 2026-06-18T01:42:34.319Z

[tool_result] 190:export function loadDirectEmbeddings(filePath, neededIds, { readFileImpl = fs.readFileSync } = {}) {
655:  fs.writeFileSync(tmp, content);
658:    try { fs.renameSync(tmp, filePath); return; }

### Assistant | 2026-06-18T01:42:38.163Z

`loadDirectEmbeddings` at line 190 uses `readFileImpl = fs.readFileSync` — read-only. The `fs.writeFileSync` at line 655 is in a different function (an atomic write helper not reached via the classify/eval read path). Let me confirm line 190's body is purely a read, and that the write at 655 isn't on the `classifyUnknownGhosts` → `loadDirectEmbeddings` path.

### Assistant | 2026-06-18T01:42:39.676Z

[tool_use: Read]

### User | 2026-06-18T01:42:40.639Z

[tool_result] 190	export function loadDirectEmbeddings(filePath, neededIds, { readFileImpl = fs.readFileSync } = {}) {
191	  const out = new Map();
192	  let raw;
193	  try {
194	    raw = readFileImpl(filePath, "utf8");
195	  } catch {
196	    return out;
197	  }
198	  for (const line of raw.split(/\r?\n/)) {
199	    const t = line.trim();
200	    if (t.length === 0 || t.startsWith('{"__meta')) continue;
201	 
... [+1451 chars truncated]

### Assistant | 2026-06-18T01:42:40.808Z

[tool_use: Read]

### User | 2026-06-18T01:42:42.250Z

[tool_result] 640	    graph = readGraph(opts.graphPath ?? GRAPH_PATH, opts.readFileImpl);
641	  } catch (err) {
642	    return {
643	      skipped: true,
644	      reason: `graph-load-failed: ${err && err.message ? err.message : err}`,
645	      classifications: [],
646	      stats: {},
647	    };
648	  }
649	  const targetNames = new Set(unknowns.map((u) => u && u.name).filter((x) => typeof x === "string"));
6
... [+713 chars truncated]

### Assistant | 2026-06-18T01:42:51.070Z

Confirmed:
- `loadDirectEmbeddings` (190-211) is purely a read; the `atomicWrite` (653) is only used by the `--apply`-style CLI of seed-ghost-gnn-classify, NOT on the classify/eval read path the harness exercises.
- `partitionGhosts` reads `graph.nodes` filtered by `kind === GHOST_KIND` — confirming injected `ghost.codebase-wired.*` nodes (kind `ghost.unwired-engine`) are picked up by the enriched run.

The non-destructive guarantee holds end-to-end. The full read path from the harness:
- baseline: `runAssessment({graph, directEmbed, directEmbedPath: REAL_EMBED})` — reads `REAL_EMBED` (deployed embeddings) but never writes it.
- enriched: `runAssessment({graph, directEmbed, directEmbedPath: mergedPath})` — reads the temp merged file.
- The only writes in the entire harness are: `tmpDir` (mkdtemp), `tmpGraph`, `tmpNew`, `mergedPath` (all inside tmpDir), and the side-cache `NEWEMB_CACHE` (`.cwref-newemb.jsonl`). All are non-deployed paths. The child `build-node-embeddings` writes only `tmpNew` (`--out tmpNew`).

Now let me verify one residual risk: does `build-node-embeddings.mjs` with `--ghosts-only --out <temp>` write ONLY to the `--out` path, or could it touch the deployed `ghost-node-embeddings.jsonl`? This is the one external child process. Let me check its `--out` handling and whether it has a default write location it might hit.

### Assistant | 2026-06-18T01:42:52.511Z

[tool_use: Grep]

### User | 2026-06-18T01:42:53.489Z

[tool_result] 6: * state/shared/system-viz/system-graph-normalized.json (output of U1's
57:const GRAPH_PATH = path.join(REPO_ROOT, "state/shared/system-viz/system-graph-normalized.json");
58:const OUT_PATH = path.join(REPO_ROOT, "state/shared/system-viz/_node-embeddings.jsonl");
59:const PARTIAL_PATH = `${OUT_PATH}.partial`;
73:// GNN-F0 macroF1-lift: in --ghosts-only mode, enrich each ghost's embed text with a
... [+1324 chars truncated]

### Assistant | 2026-06-18T01:42:58.635Z

Confirmed: `build-node-embeddings.mjs` with `--out <tmpNew>` writes only `outPath` (= `args.out` = tmpNew) and `partialPath` (= `tmpNew.partial`). With `--out` supplied, `OUT_PATH` (the default `_node-embeddings.jsonl`) is never written. The harness passes `--out tmpNew` (inside tmpDir). The `.partial` lands next to `tmpNew` (inside tmpDir) — cleaned by `fs.rmSync(tmpDir)`. It never touches `ghost-node-embeddings.jsonl` or `system-graph.json`. Also `--graph tmpGraph` overrides `GRAPH_PATH` so the deployed graph isn't even read by the child.

I have everything I need. Let me run the test file to confirm the merge helper tests actually pass (R9 — verify intent, not stub), then finalize.

### Assistant | 2026-06-18T01:43:01.023Z

[tool_use: Bash]

### User | 2026-06-18T01:43:04.898Z

[tool_result]   ...
# Subtest: mergeEmbeddingBodies -- id dedup: a deployed embedding is NEVER overwritten by a fresh one
ok 2 - mergeEmbeddingBodies -- id dedup: a deployed embedding is NEVER overwritten by a fresh one
  ---
  duration_ms: 0.2731
  ...
# Subtest: mergeEmbeddingBodies -- skips blank + unparseable lines, tolerates a meta-less base
ok 3 - mergeEmbeddingBodies -- skips blank + unparseable lines, t
... [+346 chars truncated]

### Assistant | 2026-06-18T01:43:14.890Z

All 4 tests pass. Now let me trace the two residual concerns I want to nail down for honesty/correctness:

1. **Verdict honesty edge case**: the verdict block (line 175-191) only prints inside `if (base && enr)`. If either `runAssessment` returns DEFERRED/SKIPPED, `summarize` returns `null` and the verdict block is silently skipped — but `main()` still returns 0 (success). Is that a silent-success failure (R12)? Let me re-examine.

2. **`spansMore`/`covUp` with NaN/undefined**: `summarize` returns `classesEmitted`/`coverage` from `sel.operatingPoint`. If `sel` is falsy, these are `undefined`. The verdict uses `Number.isFinite()` guards — good. Let me confirm the gate logic once more against the stated contract.

Let me look at lines 183-190 closely again and the return semantics.

The verdict gate (line 183-186):
- `gateHeld = Number.isFinite(enr.auroc) && enr.auroc >= 0.78 && enr.verdict === "deploy-ready-selective"`
- `spansMore = ... enr.classesEmitted > base.classesEmitted`
- `covUp = ... enr.coverage > base.coverage`
- `APPLY-RECOMMENDED: gateHeld && (spansMore || covUp) ? "YES" : "NO"`

This exactly matches the required contract: `(enriched AUROC>=0.78 AND verdict==deploy-ready-selective) AND (spans-more-classes OR coverage-up)`. The measured result (enriched 0.7716, `no-deployable-operating-point`) → `gateHeld=false` → `NO`. Correct and honest — it does not over-claim.

Let me verify the DEFERRED-path behavior — whether a deferred run silently returns success.

### Assistant | 2026-06-18T01:43:15.514Z

[tool_use: Read]

### User | 2026-06-18T01:43:18.908Z

[tool_result] 86	
87	/** Compact one runAssessment result to the decision-relevant fields. */
88	function summarize(tag, r) {
89	  if (!r || r.deferred || r.skipped) {
90	    console.log(`  ${tag}: DEFERRED/SKIPPED -- ${r && (r.reason || r.skipReason)}`);
91	    return null;
92	  }
93	  const m = r.metrics || {};
94	  const sel = r.selective && r.selective.deployGrade;
95	  console.log(`  ${tag}: AUROC ${m.auro
... [+855 chars truncated]

### Assistant | 2026-06-18T01:43:23.554Z

One thing to verify against the actual `selective` shape: `summarize` reads `r.selective.deployGrade`, but `runAssessment` returns `selective: { curve, deployPoint, deployGrade }` (line 686). So `sel = r.selective.deployGrade` = the `gradeSelectiveDeploy(...)` result. The harness reads `sel.verdict`, `sel.productionGate`, `sel.operatingPoint`, `sel.robustAboveGate`. Let me confirm `gradeSelectiveDeploy` returns exactly these fields (`verdict`, `operatingPoint` with `coverage`/`classesEmitted`/`totalClasses`, `productionGate`, `robustAboveGate`) — otherwise the verdict reads `undefined` and the gate silently never fires.

### Assistant | 2026-06-18T01:43:25.053Z

[tool_use: Grep]

### User | 2026-06-18T01:43:27.461Z

[tool_result] 184: * Grade a metrics object against the gates. Returns { pass, verdict, failures }
185: * — verdict is "deploy-ready" when every gate clears, else "shipped-research-only"
203:    verdict: failures.length === 0 ? "deploy-ready" : "shipped-research-only",
253:    classesEmitted: new Set(predicted).size,
272: * the lowest-τ / max-coverage clearing point as the deploy verdict — production
276: * low
... [+2968 chars truncated]

### Assistant | 2026-06-18T01:43:59.664Z

Confirmed the contract is satisfied exactly:
- `gradeSelectiveDeploy` (line 319-351) returns `verdict` (`"deploy-ready-selective"` / `"no-deployable-operating-point"`), `productionGate`, `operatingPoint: { tau, coverage, ..., classesEmitted, totalClasses }`, and `robustAboveGate`. These are precisely the fields `summarize` reads. No drift — the harness reads the real shape, not a guessed one.
- The measured `no-deployable-operating-point` → `gateHeld=false` → `APPLY-RECOMMENDED: NO`, matching the stated result.

I now have full verification. Let me assess the one genuine concern (the DEFERRED path returning success) and finalize.

**On the DEFERRED path (P2, not P0/P1):** If either `runAssessment` defers (e.g., graph load fails, or empty holdout), `summarize` returns `null`, the verdict block is skipped, and `main()` returns `0` (success exit). This is a soft honesty gap — a deferred measurement exits 0 with no `APPLY-RECOMMENDED` line and no non-zero status. However: (a) it loudly prints `DEFERRED/SKIPPED -- <reason>` for each arm, so it does not fabricate a result or claim apply-safe; (b) the consumer is a human reading stdout before manually running `--apply`, not an automated gate keying off exit code; (c) the absence of an `APPLY-RECOMMENDED: YES` line means no apply is triggered. It does not violate the non-destructive guarantee and does not over-claim. This is a P2 robustness nit, not a blocker.

Everything required for a PASS is verified. Final verdict.

---

VERDICT: PASS

summary: This is a genuinely non-destructive measurement harness. I traced every write sink and every read of the deployed graph/embeddings end-to-end: the only writes are to an OS temp dir (`mkdtemp` → ghosts.json / newemb.jsonl / merged.jsonl) and the documented `.cwref-newemb.jsonl` side-cache; the deployed `system-graph.json` and `ghost-node-embeddings.jsonl` are READ-only and never written. Measurement order is correct (baseline runs before the in-memory inject), the verdict gate mat
... [+3706 chars truncated]
