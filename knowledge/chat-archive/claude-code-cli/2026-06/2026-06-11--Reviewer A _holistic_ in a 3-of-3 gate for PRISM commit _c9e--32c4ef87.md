---
type: "chat-session"
source: "claude-code-cli"
session_id: "32c4ef87-567e-4db1-aef8-17e4186ddcf6"
title: "Reviewer A (holistic) in a 3-of-3 gate for PRISM commit `c9ea46b9f1` (GNN galaxy"
date: "2026-06-11"
first_ts: "2026-06-11T01:28:25.407Z"
last_ts: "2026-06-11T01:31:04.319Z"
cwd: "H:\\PRISM"
messages: 55
user_msgs: 22
assistant_msgs: 33
raw_file: "H:/.claude/projects/H--prism/32c4ef87-567e-4db1-aef8-17e4186ddcf6/subagents/agent-a9d7373d851d962b0.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:10"
---

# Reviewer A (holistic) in a 3-of-3 gate for PRISM commit `c9ea46b9f1` (GNN galaxy

> **claude-code-cli** | 2026-06-11 | 55 msgs (22 user / 33 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/32c4ef87-567e-4db1-aef8-17e4186ddcf6/subagents/agent-a9d7373d851d962b0.jsonl`

## Transcript

### User | 2026-06-11T01:28:25.407Z

Reviewer A (holistic) in a 3-of-3 gate for PRISM commit `c9ea46b9f1` (GNN galaxy node-features), repo root H:/prism. Read end-to-end:
- scripts/lib/galaxy-node-embedding-row.mjs (buildGalaxyEmbeddingRow/galaxyNodeId/mergeRows)
- scripts/build-galaxy-node-embeddings.mjs (mergeGalaxyNodeFeatures + CLI)
- scripts/lib/graph-node-embedding-bridge.mjs (the REUSED aggregateEmbeddings/quantizeInt8 -- confirm format match)
- scripts/lib/graphsage-train-pipeline.mjs around loadEmbeddingFeatures (the trainer's reader -- confirm {n,q} + q/127 contract)
- scripts/nn-graph-retrain-lifecycle.mjs (the wiring at "2c. Galaxy node-features")

CONTEXT: the GraphSAGE trainer's embedding source covered 0 galaxy roost nodes; this embeds each galaxy's doctrine and merges 768d node-features for `ghost.galaxy.<g>` into the source, wired into the retrain lifecycle so it regenerates before each retrain.

JUDGE:
1. FORMAT MATCH: does buildGalaxyEmbeddingRow produce EXACTLY what the trainer's loadEmbeddingFeatures expects — row {n: nodeId, q: int8[]}, L2-normalized then quantizeInt8 (q[i]=round(unit*127)), so q[i]/127 recovers the unit component? Is the node-id form `ghost.galaxy.<g>` the actual graph node id the GNN classifies? (cross-check the cross-substrate edge work / system graph)
2. ADDITIVE SAFETY: does mergeRows preserve ALL existing (771 engine) rows and only add/replace galaxy rows? Could the merge ever DROP or corrupt existing rows? Is the write atomic (tmp+rename)?
3. R8 DEDUP: are aggregateEmbeddings + quantizeInt8 genuinely reused (not reimplemented)? Is the L2->mean->L2 convention matched (not double-normalized or skipped)?
4. R15 WIRE: is the lifecycle wiring correct — runs AFTER the base embedding build, merges into the same source, fail-soft (never aborts retrain)?

Optionally run `cd /h/prism && node --test scripts/lib/galaxy-node-embedding-row.test.mjs`. Report file:line per finding (P0/P1). End with `VERDICT: PASS` or `VERDICT: FAIL`.

### Assistant | 2026-06-11T01:28:29.258Z

I'll review this commit end-to-end. Let me start by reading all the files in scope.

### Assistant | 2026-06-11T01:28:29.734Z

[tool_use: Read]

### Assistant | 2026-06-11T01:28:30.216Z

[tool_use: Read]

### Assistant | 2026-06-11T01:28:30.562Z

[tool_use: Read]

### User | 2026-06-11T01:28:32.031Z

[tool_result] 1	/**
2	 * galaxy-node-embedding-row.mjs -- build GNN node-feature rows for the 34 galaxy roost
3	 * nodes (AI-SYNERGY-AUDIT-MS0/U-AISYN-GNN-NODEFEAT, slot:charlie, operator-authorized
4	 * cross-galaxy build into india's NN/GNN substrate).
5	 *
6	 * The GraphSAGE trainer (graphsage-train-pipeline.mjs loadEmbeddingFeatures) consumes a
7	 * 768-d node-feature source state/shared/nn-graph/node-embed
... [+3142 chars truncated]

### User | 2026-06-11T01:28:32.659Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * build-galaxy-node-embeddings.mjs -- mint 768d GNN node-features for the 34 galaxy roost
4	 * nodes and MERGE them into the GraphSAGE trainer's embedding source
5	 * (AI-SYNERGY-AUDIT-MS0/U-AISYN-GNN-NODEFEAT, slot:charlie, operator-authorized cross-galaxy
6	 * build into india's NN/GNN substrate).
7	 *
8	 * The trainer's --embedding-source (state/shared/nn-graph/no
... [+6582 chars truncated]

### User | 2026-06-11T01:28:32.874Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * graph-node-embedding-bridge.mjs — RAG-UPGRADE-MS0 / U-GNN-NODE-EMBED-BRIDGE
4	 *                                   (2026-05-23, slot golf).
5	 *
6	 * Closes the missing mapping layer that the empirical NN-GRAPH retrain
7	 * (commit-cluster 2026-05-22, `graphsage-checkpoint-768d-rag-upgrade.json`)
8	 * exposed: `embeddingHitCount=0`. The trainer's `loadEmbeddingFeat
... [+28114 chars truncated]

### Assistant | 2026-06-11T01:28:35.462Z

Now let me read the trainer's reader and the lifecycle wiring. Let me also check the test file and the cross-substrate edge work to verify the node-id form.

### Assistant | 2026-06-11T01:28:36.409Z

[tool_use: Read]

### Assistant | 2026-06-11T01:28:36.577Z

[tool_use: Read]

### User | 2026-06-11T01:28:37.876Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * graphsage-train-pipeline.mjs — end-to-end GraphSAGE link-prediction training
4	 * pipeline. Component (d), the training-script CLI orchestrator, of unit
5	 * U-NNG-GRAPHSAGE-TRAIN (U4) of NN-GRAPH-MS0.
6	 *
7	 * Composes the U1-U4 libs into one runnable pipeline:
8	 *   loadGraph (system-viz-graph)          load the system-viz graph from disk
9	 *   normalizeGraph 
... [+45956 chars truncated]

### User | 2026-06-11T01:28:38.712Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * nn-graph-retrain-lifecycle.mjs — NN-GRAPH-MS2 / U2-SELF-RETRAIN-LIFECYCLE
4	 *
5	 * The autonomous half of the GNN tier-5 wiring classifier. Runs as a Windows
6	 * scheduled task (see .claude/helpers/install-nn-graph-retrain-task.ps1),
7	 * independent of any Claude session, on a periodic poll:
8	 *
9	 *   1. FINGERPRINT  — read system-graph.json, summarize {nodeCo
... [+39939 chars truncated]

### Assistant | 2026-06-11T01:28:41.245Z

Now I have the full picture of the data flow. Let me verify the node-id form against the cross-substrate edge work and check the test file. Let me cross-reference these in parallel.

### Assistant | 2026-06-11T01:28:42.347Z

[tool_use: Read]

### User | 2026-06-11T01:28:43.106Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\galaxy-node-embedding-row.test.mjs' was already read 5s ago in this session and is unchanged (mtime 1781140894345). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE
... [+3 chars truncated]

### Assistant | 2026-06-11T01:28:43.159Z

[tool_use: Grep]

### Assistant | 2026-06-11T01:28:44.127Z

[tool_use: Grep]

### User | 2026-06-11T01:28:44.818Z

[tool_result] Found 15 files
scripts\nn-graph-retrain-lifecycle.mjs
scripts\build-galaxy-node-embeddings.mjs
scripts\lib\galaxy-node-embedding-row.mjs
scripts\lib\galaxy-node-embedding-row.test.mjs
scripts\audit-ai-synergy.mjs
scripts\generate-cross-substrate-edges.mjs
scripts\ollama-nav-rerank.test.mjs
scripts\lib\edge-predict-candidates.test.mjs
scripts\lib\psn-attribution-lib.test.mjs
scripts\lib\source-chai
... [+204 chars truncated]

### User | 2026-06-11T01:28:45.622Z

[tool_result] No matches found

### Assistant | 2026-06-11T01:28:48.870Z

The test file was already read (it's in my context from a recent read). Let me verify the node-id form against the cross-substrate edge generator (the authoritative source for `ghost.galaxy.<g>`), and check how galaxy roost nodes are actually created in the system graph.

### Assistant | 2026-06-11T01:28:50.320Z

[tool_use: Grep]

### Assistant | 2026-06-11T01:28:51.538Z

[tool_use: Grep]

### User | 2026-06-11T01:28:51.905Z

[tool_result] 273-  \ --- galaxy-roost nodes + owned-by-slot edges: lift coverage to ALL 34 galaxies ---
274-  // Each PSN galaxy becomes a first-class roost node (nested under the existing
275:  // ghost.galaxy_federation parent) linked to its soul-owning Hermes slot. This
276-  // covers the 27 meta/infra galaxies that have no eng.<name> domain node, so
277-  // EVERY galaxy is reachable from its slot. The ro
... [+1313 chars truncated]

### User | 2026-06-11T01:28:53.234Z

[tool_result] 202- * Resolve a graph node id to a known galaxy name. Galaxy nodes appear in the
203- * augmentation under TWO forms -- `eng.<galaxy>` (engine-canonical, 8 galaxies) and
204: * `ghost.galaxy.<galaxy>` (roost, all 34). Matching only the first form silently
205- * under-counts cross-substrate coverage by 26 galaxies (verified 2026-06-10). Gate
206- * on the known-galaxy set so `eng.SomeSpecificEngi
... [+307 chars truncated]

### Assistant | 2026-06-11T01:28:59.505Z

This confirms the node-id form. The cross-substrate edge generator (`generate-cross-substrate-edges.mjs:289`) emits roost nodes as `ghost.galaxy.${galaxy}`, and the audit (`audit-ai-synergy.mjs:211`) matches exactly that prefix. So `galaxyNodeId(g) = ghost.galaxy.${g}` matches the authoritative graph node id form.

Now there's a critical question: **are these galaxy roost nodes actually IN the system graph the trainer fingerprints/evaluates?** The roosts are emitted by `generate-cross-substrate-edges.mjs` into a *cross-substrate-edges-augmentation.json* and merged into the graph. Let me verify the galaxy roosts land in `system-graph.json` (so the GNN actually has them as nodes to classify) and check the test file content plus the `gatherGalaxyDocs`/`embedText` contracts.

### Assistant | 2026-06-11T01:28:59.985Z

[tool_use: Read]

### User | 2026-06-11T01:29:00.818Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\galaxy-node-embedding-row.test.mjs' was already read 23s ago in this session and is unchanged (mtime 1781140894345). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACH
... [+4 chars truncated]

### Assistant | 2026-06-11T01:29:01.866Z

[tool_use: Grep]

### Assistant | 2026-06-11T01:29:03.150Z

[tool_use: Grep]

### User | 2026-06-11T01:29:03.290Z

[tool_result] 84:export function gatherGalaxyDocs(galaxy, root = DEFAULT_ROOT) {
147:      const chunks = docs.flatMap((d) => chunkMarkdown(d.text, d.source, { maxChars: RAG_CHUNK_MAX_CHARS }));
151:        text: c.text,
184:      lines.push(r.text);
256:        return { galaxy: context.galaxy, ok: true, degraded: false, cached: true, model, answer: hit.answer, sources: hit.sources || context.sources };
269:   
... [+499 chars truncated]

### User | 2026-06-11T01:29:04.960Z

[tool_result] 100:export async function embedText(text, opts = {}) {
101-  const model = opts.model || DEFAULT_EMBED_MODEL;
102-  const url = opts.url || OLLAMA_URL;
103-  const timeoutMs = opts.timeoutMs || DEFAULT_EMBED_TIMEOUT_MS;
104-  const ctrl = new AbortController();
105-  const t = setTimeout(() => ctrl.abort(), timeoutMs);
106-  try {
107-    const res = await fetch(`${url}/api/embeddings`, {
108-    
... [+654 chars truncated]

### Assistant | 2026-06-11T01:29:09.599Z

The `embedText` and `gatherGalaxyDocs` contracts are confirmed: `embedText` returns a `number[]` (the raw embedding) or null, and `gatherGalaxyDocs` returns objects with `.text`. Both match the build script's usage.

The test file is in my context already (read 23s ago) but I don't actually see its content in what was returned to me — the read-once guard blocked it before I captured it. Let me get the test content via Grep and run the tests, plus verify the galaxy roosts actually land in `system-graph.json`.

### Assistant | 2026-06-11T01:29:10.924Z

[tool_use: Grep]

### User | 2026-06-11T01:29:11.783Z

[tool_result] 1:/**
2: * Tests for galaxy-node-embedding-row.mjs (AI-SYNERGY-AUDIT-MS0/U-AISYN-GNN-NODEFEAT).
3: * Reference-value tests for the GNN node-feature row builder (reuses india's
4: * aggregateEmbeddings + quantizeInt8). Run:
5: *   node --test scripts/lib/galaxy-node-embedding-row.test.mjs
6: */
7:import { test } from "node:test";
8:import assert from "node:assert/strict";
9:import { galaxyNodeId, b
... [+3496 chars truncated]

### Assistant | 2026-06-11T01:29:14.264Z

Now let me run the tests and verify the galaxy roosts actually land in the live `system-graph.json` (the trainer's input) — that's the load-bearing question for whether this feature actually does anything.

### Assistant | 2026-06-11T01:29:15.780Z

[tool_use: Bash]

### Assistant | 2026-06-11T01:29:19.346Z

[tool_use: Bash]

### User | 2026-06-11T01:29:19.512Z

[tool_result]   ...
# Subtest: mergeRows: preserves existing engine rows + adds galaxy rows, dedups by n (new wins)
ok 7 - mergeRows: preserves existing engine rows + adds galaxy rows, dedups by n (new wins)
  ---
  duration_ms: 0.1492
  ...
# Subtest: mergeRows: ADVERSARIAL null/empty inputs -> safe array (no throw)
ok 8 - mergeRows: ADVERSARIAL null/empty inputs -> safe array (no throw)
  ---
  duration_ms: 0
... [+112 chars truncated]

### User | 2026-06-11T01:29:23.885Z

[tool_result] META: {"__meta":true,"model":"nomic-embed-text:latest","dim":768,"count":805,"generatedAt":"2026-06-11T01:23:39.928Z","schemaVersion":1,"source":"graph-node-bridge","galaxyNodesCovered":34,"lastGalaxyMergeBy":"build-galaxy-node-embeddings"}
total rows: 805 galaxy: 34 eng: 0

### Assistant | 2026-06-11T01:29:31.912Z

8/8 tests pass. The live source shows it actually ran: 805 total rows, **34 galaxy roosts covered** (`galaxyNodesCovered:34`), proving the merge worked on live data and the additive merge preserved the base rows.

One important observation: the live source shows `eng: 0` rows but 771 non-galaxy rows. The CONTEXT/header says "771 engine rows" — but the row ids aren't `eng.*` prefixed. Let me verify what the base 771 rows look like and confirm the merge truly preserved them (additive safety, finding #2). Let me also confirm the galaxy roosts actually exist as nodes in the live `system-graph.json` so the trainer can classify them, and check `q` length is 768.

### Assistant | 2026-06-11T01:29:36.063Z

[tool_use: Bash]

### User | 2026-06-11T01:29:40.445Z

[tool_result] id prefixes (top): [
  [ 'wiki.code-tribal', 406 ],
  [ 'vault.wiki', 166 ],
  [ 'reg.toolpathstrategyregistry', 47 ],
  [ 'ghost.galaxy', 34 ],
  [ 'wiki.architecture', 18 ],
  [ 'wiki.lessons', 7 ],
  [ 'extracted.extracted', 4 ],
  [ 'ghost.ms', 3 ],
  [ 'schema.cadcreoribbonschema', 3 ],
  [ 'schema.tolerances', 3 ],
  [ 'reg.cadfunctioncatalog', 3 ],
  [ 'datacat.tool_catalog', 3 ]
]
rows wit
... [+100 chars truncated]

### Assistant | 2026-06-11T01:29:40.485Z

[tool_use: Bash]

### User | 2026-06-11T01:29:44.729Z

[tool_result] (node:69404) ExperimentalWarning: CommonJS module H:\prism\[eval] is loading ES Module H:\prism\scripts\lib\graph-io.mjs using require().
Support for loading ES Module in require() is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
  code: 'ERR_MODULE_NOT_FOUND',
  url: 'file:///C:/Users/wompu/AppData/Local/Temp/scripts/
... [+40 chars truncated]

### Assistant | 2026-06-11T01:29:48.296Z

The `/tmp` path broke the relative import. Let me run the probe from inside the repo with the script placed in-repo (the relative path in graph-io resolves from cwd, but the script's own dir matters). Let me write it to the repo's scripts dir temporarily.

### Assistant | 2026-06-11T01:29:51.769Z

[tool_use: Bash]

### User | 2026-06-11T01:29:59.439Z

[tool_result] graph total nodes: 336397 ghost.galaxy.* roosts: 34
sample: ghost.galaxy.token-optimization, ghost.galaxy.hermes-zulu, ghost.galaxy.business, ghost.galaxy.quoting, ghost.galaxy.post-processor

### Assistant | 2026-06-11T01:30:12.564Z

This is the decisive validation. The live `system-graph.json` contains exactly **34 `ghost.galaxy.*` roost nodes** — the same node ids the build script mints features for. So the GNN actually has these as graph nodes to classify, and now (post-this-commit) has a 768d semantic feature for each. The loop is closed end-to-end on live data.

Now let me verify the format-match contract precisely (finding #1): the trainer reads `q[i]/127`. The build does `quantizeInt8(L2unit) = round(unit*127)`. So `q[i]/127 ≈ unit[i]`. The test at line 35-39 proves the round-trip. One subtlety to check: the trainer's `loadEmbeddingFeatures` validates rows against the `__meta` `dim` header. The build writes `dim: EXPECT_DIM` (768) in meta and the rows are all 768 — confirmed (badQ=0). 

Let me check one R8 concern: does the build's meta `model` field (`${EMBED_MODEL}:latest` = `nomic-embed-text:latest`) stay consistent with the bridge's meta, and does the bridge's `count` field meaning match? Also verify the bridge already wrote a valid base source before the galaxy merge runs in the lifecycle ordering. Let me check the lifecycle ordering one more time and confirm the `mergeRows` cannot drop the meta row.

The lifecycle ordering (lines 571-616) is: **2b** build base source (bridge) → **2c** galaxy merge (spawns build-galaxy-node-embeddings.mjs). The galaxy merge's `readSource()` reads what 2b wrote. Confirmed correct ordering. Let me verify one edge: 2c only runs `if (embeddingSourcePath && ...)` — i.e., only when the base build succeeded with matched>0. Good — galaxy merge never runs against a non-existent base. And `readSource()` in the build script independently re-reads the file, so even spawned as a separate process it sees 2b's output.

Let me do a final check on a potential meta-preservation issue and the `was`/`merged` accounting, then check git to confirm scope.

### Assistant | 2026-06-11T01:30:13.915Z

[tool_use: Bash]

### User | 2026-06-11T01:30:18.000Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
commit c9ea46b9f1b4466e8155821b1fade33c96dcccbb
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Wed Jun 10 20:28:00 2026 -0500

    [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [AI-SYNERGY-AUDIT-MS0]/U-AISYN-GNN-NODEFEAT (slot:charlie): give the GNN 768d node-features for all 34 galaxy roosts -- real NN/GNN substrat
... [+2239 chars truncated]

### Assistant | 2026-06-11T01:30:27.616Z

Scope is exactly the 4 files in review plus the test — clean, additive (324 insertions, 0 deletions), nothing else touched. The `~771 → 805` claim matches my live observation (805 total, 34 galaxy). 

Let me do one final adversarial check on `mergeRows` meta preservation. In the build script `readSource()` separates `meta` from `rows`, so `mergeRows(rows, galaxyRows)` operates only on non-meta rows (the meta is filtered out at line 72-73 by the `obj.n` check — `__meta` rows have no `n`). Then the write reconstructs `[newMeta, ...merged]`. So the meta is rebuilt fresh, never lost. But let me verify one subtle thing: a `__meta` line that ALSO happened to have an `n` field — could it leak into `rows`? In `readSource`, line 72: `if (obj && obj.__meta) meta = obj; else if (...n...)` — the `else` makes it exclusive, so a `__meta` row never enters `rows`. Safe.

Now the round-trip magnitude check the commit claims (|v|~1.0). Let me verify a galaxy row dequantizes to ~unit norm, confirming the L2 convention end-to-end through the actual trainer reader.

### Assistant | 2026-06-11T01:30:30.948Z

[tool_use: Bash]

### User | 2026-06-11T01:30:34.903Z

[tool_result] dim: 768 hit: 4 scanned: 806
ghost.galaxy.mill len 768 |v|= 1.0024
ghost.galaxy.lathe len 768 |v|= 1.0031
ghost.galaxy.academy len 768 |v|= 1.0055
ghost.galaxy.business len 768 |v|= 1.0014

### Assistant | 2026-06-11T01:31:04.319Z

Decisive end-to-end proof. The trainer's **own** `loadEmbeddingFeatures` reads all 4 sampled galaxy nodes at dim=768, and the dequantized `q/127` vectors recover to `|v| ≈ 1.0024–1.0055` — exactly unit-L2 within int8 quantization error (≤1/127 per component). This proves the format-match contract holds end-to-end: the build's `L2 → quantizeInt8(round(unit*127))` is correctly inverted by the trainer's `q[i]/127`.

All four review axes verified. Let me compile the verdict.

---

## REVIEWER A (HOLISTIC) — VERDICT

**Commit `c9ea46b9f1` — GNN galaxy node-features (U-AISYN-GNN-NODEFEAT)**

### 1. FORMAT MATCH — PASS (verified live)
- `buildGalaxyEmbeddingRow` (`galaxy-node-embedding-row.mjs:34-53`) produces `{n, q:int8[]}` exactly as the trainer's `loadEmbeddingFeatures` (`graphsage-train-pipeline.mjs:228-293`) expects: it reads `obj.n` (string) + `obj.q` (array), dequantizes `q[i]/127` (line 280), validates against `__meta.dim`.
- Quantization contract: build does `quantizeInt8(L2unit)` → `round(unit_i*127)` clamped to ±127 (`graph-node-embedding-bridge.mjs:178-192`); trainer recovers `q[i]/127`. **Proven live**: the trainer's own reader recovered `|v|≈1.0024–1.0055` (unit-L2 within int8 error) for 4 sampled galaxy rows.
- Node-id form: `galaxyNodeId(g) = ghost.galaxy.${g}` (`:21-23`) matches the authoritative graph node id — `generate-cross-substrate-edges.mjs:289` emits roosts as `ghost.galaxy.${galaxy}`; `audit-ai-synergy.mjs:211` matches the same prefix. **Proven live**: `system-graph.json` (336,397 nodes) contains exactly **34 `ghost.galaxy.*` roost nodes** — the GNN genuinely has these as classification targets, so the feature is not orphaned.

### 2. ADDITIVE SAFETY — PASS
- `mergeRows` (`:63-72`) Map-dedups by `n`, new wins; iterates all existing rows first → **never drops** an existing row, only adds/replaces galaxy rows. Tested (`test:55-69`).
- `__meta` cannot be corrupted: `readSource` (`build-galaxy-node-embeddings.mjs:63-74`) separates meta (exclusive `if
... [+2439 chars truncated]
