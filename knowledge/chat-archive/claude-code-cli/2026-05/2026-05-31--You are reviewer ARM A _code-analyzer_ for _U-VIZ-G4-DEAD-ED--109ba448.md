---
type: "chat-session"
source: "claude-code-cli"
session_id: "109ba448-4d7d-43ac-9e0c-1355c726e220"
title: "You are reviewer ARM A (code-analyzer) for \"U-VIZ-G4-DEAD-EDGE-ENG\" — a new edge"
date: "2026-05-31"
first_ts: "2026-05-31T05:15:06.368Z"
last_ts: "2026-05-31T05:29:38.795Z"
cwd: "H:\\prism-slot-sierra"
messages: 54
user_msgs: 19
assistant_msgs: 35
raw_file: "H:/.claude/projects/H--prism-slot-sierra/109ba448-4d7d-43ac-9e0c-1355c726e220/subagents/agent-ae9d59ebf90ab382b.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:10"
---

# You are reviewer ARM A (code-analyzer) for "U-VIZ-G4-DEAD-EDGE-ENG" — a new edge

> **claude-code-cli** | 2026-05-31 | 54 msgs (19 user / 35 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/109ba448-4d7d-43ac-9e0c-1355c726e220/subagents/agent-ae9d59ebf90ab382b.jsonl`

## Transcript

### User | 2026-05-31T05:15:06.368Z

You are reviewer ARM A (code-analyzer) for "U-VIZ-G4-DEAD-EDGE-ENG" — a new edge-target canonicalization pass added to PRISM's system-viz merge keystone. Weight your review on ALGORITHM CORRECTNESS.

PROBLEM: ~10,291 dead edges in the merged system-graph target `engine.<ClassName>` (PascalCase) — a node id that does NOT exist in the merged graph (the `engine-node-extractor.mjs` that mints that scheme is wired only into regen-graph-normalized.mjs, NOT the live regen-viz pipeline). The live per-engine nodes use `eng.<domain>.<name>` (lowercase). The fix canonicalizes `engine.<Pascal>` edge targets → `eng.<domain>.<name>` at merge time (the only place with the full node set + the single graph writer).

CRITICAL — read from these EXACT ABSOLUTE PATHS (your CWD may be a git worktree H:/prism-slot-sierra where these edits are ABSENT — you MUST read the H:/prism main-tree copies):
- H:/prism/scripts/lib/viz-engine-node-id-canon.mjs  (NEW pure lib — buildEngineAliasIndex + canonicalizeEngineEdgeTargets)
- H:/prism/scripts/lib/viz-engine-node-id-canon.test.mjs  (NEW, 13 cases, all pass)
- H:/prism/scripts/merge-augmentations.mjs  (the wiring: import near line ~52; the pass runs just before writeGraphStreaming — search for "U-VIZ-G4-DEAD-EDGE-ENG" and "engineEdgeCanon")

Verify rigorously + report P0/P1/P2 + final PASS/FAIL:
1. DEAD→LIVE INVARIANT: confirm the pass can NEVER repoint a live edge. The claim is `engine.<Pascal>` nodes never exist in the merged graph, so only-dead edges are touched. Is the prefix match (`startsWith("engine.")`) safe — could it accidentally match a LIVE node id that legitimately starts with `engine.` (vs `eng.`)? Are there any real merged-graph node ids of the form `engine.<...>`?
2. ALIAS DETERMINISM: buildEngineAliasIndex multi-domain pick (fewest segments → non-eng.other → lexicographic). Is it a TOTAL order (never order-dependent / never throws on ties)? Does the ≥3-segment guard correctly exclude the 2-segment L5 cluster nodes (eng.other, eng
... [+1340 chars truncated]

### Assistant | 2026-05-31T05:15:22.972Z

I'll review the new edge-target canonicalization pass rigorously, reading from the H:/prism main-tree absolute paths as instructed.

### Assistant | 2026-05-31T05:15:24.365Z

[tool_use: Read]

### Assistant | 2026-05-31T05:15:24.628Z

[tool_use: Read]

### User | 2026-05-31T05:15:49.139Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * viz-engine-node-id-canon.mjs — canonicalize `engine.<ClassName>` edge targets
4	 * to the merged-graph engine node id `eng.<domain>.<name>` at assembly time.
5	 *
6	 * BACKGROUND (the second G4 dead-edge class, sierra):
7	 * Several producers emit graph edges to `engine.<ClassName>` (PascalCase) — the
8	 * scheme minted by `engine-node-extractor.mjs` (NN-GRAPH-MS0)
... [+5975 chars truncated]

### User | 2026-05-31T05:15:49.878Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * Tests for viz-engine-node-id-canon.mjs — engine.<ClassName> → eng.<domain>.<name>
4	 * edge-target canonicalization. Real assertions (reference values + the live
5	 * dead-edge scenario that motivated it), NOT toBeDefined stubs.
6	 */
7	import { test } from "node:test";
8	import assert from "node:assert/strict";
9	
10	import { buildEngineAliasIndex, canonicalizeEng
... [+6916 chars truncated]

### Assistant | 2026-05-31T05:15:52.331Z

Now let me read the wiring in merge-augmentations.mjs.

### Assistant | 2026-05-31T05:15:54.278Z

[tool_use: Grep]

### User | 2026-05-31T05:16:13.814Z

[tool_result] 47-    process.exit(r.status ?? 1);
48-  }
49-}
50-
51-import { readGraphStreaming, writeGraphStreaming } from "./lib/graph-io.mjs";
52:import { canonicalizeEngineEdgeTargets } from "./lib/viz-engine-node-id-canon.mjs";
53-
54-const __dirname = path.dirname(fileURLToPath(import.meta.url));
55-const ROOT = path.resolve(__dirname, "..");
56-const VIZ_DIR = path.join(ROOT, "state", "shared", "system-
... [+2478 chars truncated]

### Assistant | 2026-05-31T05:16:20.847Z

I notice line 2704 in the grep output shows a backslash `\ dead→live` instead of `//` — this could be a syntax error in the comment block. Let me verify by reading that exact region directly.

### Assistant | 2026-05-31T05:16:21.312Z

[tool_use: Read]

### User | 2026-05-31T05:16:39.617Z

[tool_result] 2696	}
2697	
2698	// U-VIZ-G4-DEAD-EDGE-ENG (2026-05-30 sierra): canonicalize `engine.<ClassName>`
2699	// edge targets → `eng.<domain>.<name>`. Producers (pdf-course-bridge feeds-training/
2700	// bridge-to-engine, the engine-node-extractor scheme) emit PascalCase `engine.*`
2701	// targets that never exist as merged-graph nodes (~10.3K dead edges). This is the
2702	// only place holding the full
... [+852 chars truncated]

### Assistant | 2026-05-31T05:16:44.496Z

Good — line 2704 is actually `// dead→live` (the grep `\ ` was a display artifact of the `→` arrow). The actual file is correct. Now let me verify the claims rigorously.

First, the central correctness claim: that `engine.<Pascal>` node ids never exist in the merged graph. Let me check the live graph and the merge file's own edgeKey convention.

### Assistant | 2026-05-31T05:16:46.280Z

[tool_use: Grep]

### User | 2026-05-31T05:16:55.182Z

[tool_result] 575:  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}`;
576:  const existingEdges = new Set(G.edges.map(edgeKey));
578:    if (existingEdges.has(edgeKey(edge))) continue;
620:  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}`;
621:  const existingEdges = new Set(G.edges.map(edgeKey));
623:    if (existingEdges.has(edgeKey(edge))) continue;
660:  const edgeKey = e =>
... [+2123 chars truncated]

### Assistant | 2026-05-31T05:16:59.900Z

Important finding: the merge file has TWO edgeKey conventions. The earlier ones (lines 575-796) use 2-field `${e.from || e.source}|${e.to || e.target}` (NO type), while later ones (line 820+) use the 3-field `${e.from || e.source}|${e.to || e.target}|${e.type ?? ""}` which matches the new lib. Let me confirm whether ALL edge-producing blocks now use the 3-field form, and find any 2-field ones that coexist, since the dedup-drop semantics depend on consistency. Let me also empirically check the live graph for `engine.<Pascal>` node ids.

### Assistant | 2026-05-31T05:17:01.842Z

[tool_use: Bash]

### Assistant | 2026-05-31T05:17:03.049Z

[tool_use: Bash]

### User | 2026-05-31T05:18:36.129Z

[tool_result] 6
---2field above, 3field below---
59

### User | 2026-05-31T05:20:10.948Z

[tool_result] MERGE-SYNTAX-OK
LIB-SYNTAX-OK

### Assistant | 2026-05-31T05:20:14.487Z

Both files syntax-check clean. Now there are 6 two-field edgeKey sites and 59 three-field sites. The new lib uses the 3-field form. Let me empirically verify the core claim that no `engine.<Pascal>` nodes exist in the live merged graph, and examine the live graph's edge structure to confirm the dead-edge population.

### Assistant | 2026-05-31T05:20:15.639Z

[tool_use: Bash]

### User | 2026-05-31T05:21:19.298Z

[tool_result] state/shared/system-viz/system-graph.json  546.7M
---size above---

### Assistant | 2026-05-31T05:21:22.561Z

The graph is 546.7 MB — too large for `JSON.parse`. Let me stream-scan it for `"id":"engine.` node ids (Pascal scheme) vs `"id":"eng.` and check edge targets. I'll use a streaming approach to avoid OOM.

### Assistant | 2026-05-31T05:21:31.193Z

[tool_use: Bash]

### User | 2026-05-31T05:21:52.752Z

[tool_result] <--- Last few GCs --->

[112280:0000027430211000]     2367 ms: Scavenge 302.5 (522.1) -> 301.9 (527.1) MB, pooled: 0 MB, 1.00 / 0.00 ms  (average mu = 0.876, current mu = 0.669) allocation failure; 
[112280:0000027430211000]     2380 ms: Mark-Compact 304.9 (527.1) -> 303.0 (531.1) MB, pooled: 12 MB, 9.37 / 0.00 ms  (average mu = 0.852, current mu = 0.615) allocation failure; scavenge might not 
... [+159 chars truncated]

### Assistant | 2026-05-31T05:22:00.616Z

This is a critical empirical finding. The streaming scan of the live 546 MB graph reveals:

- `"id":"engine.` → **6 occurrences** — there ARE node ids of the form `engine.<...>` in the merged graph (not zero, as the central correctness claim asserts)
- `"id":"eng.` → 16,223 (the canonical lowercase per-engine + cluster nodes)
- `"target":"engine.` → 10,287 dead edge targets (matches the ~10.3K claim)
- `"to":"engine.` → 16
- `"source":"engine.` / `"from":"engine.` → 0

The claim "engine.* nodes never exist, so nothing live is ever repointed" is **empirically false** — there are 6 `engine.<...>` node ids. I must determine what those 6 nodes are: if any matches the `startsWith("engine.")` + has a lowercase-class alias, the pass could repoint a LIVE edge to a different node, or — worse — those 6 nodes are themselves live and the dead-edge claim's safety basis is wrong. Let me extract those 6 ids.

### Assistant | 2026-05-31T05:22:03.233Z

[tool_use: Bash]

### User | 2026-05-31T05:23:48.010Z

[tool_result] engine.* NODE IDS (6):
  engine.validate-command-frontmatter
  engine.u-vault01-knowledge-vault-schema
  engine.reference-u-ck06-command-frontmatter-schema
  engine.u-vault01-loop-flush
  engine.fleet-alpha-loop-ended-ready-for-commit-handoff
  engine.forgetripleupgradeverifynode

### Assistant | 2026-05-31T05:23:55.999Z

Now I need to analyze whether these 6 `engine.<...>` nodes can be wrongly repointed. The pass logic: for each edge endpoint `v` starting with `"engine."`, it computes `cls = v.slice("engine.".length).toLowerCase()` and looks up `alias.get(cls)`. The alias index is built ONLY from `eng.<domain>.<name>` (≥3 segment) node ids, keyed by the last segment (lowercased class name).

The key question for the DEAD→LIVE invariant: these 6 nodes are NODE IDS, not edge endpoints. The pass rewrites EDGE ENDPOINTS, not node ids. So the real risk is: **is there an EDGE whose endpoint is one of these 6 `engine.*` ids, AND does that class name resolve to an `eng.*` alias?** If yes, the pass would repoint an edge that currently points at a LIVE node (one of these 6) to a DIFFERENT node (`eng.<domain>.<name>`) — silently breaking a live edge.

Let me check: do any of the 10,287+16 `engine.*` edge endpoints reference these 6 live ids, and do these 6 class names have aliases? The class-name extraction lowercases after `engine.`, so `engine.forgetripleupgradeverifynode` → cls `forgetripleupgradeverifynode`. Let me check whether any of these 6 suffixes exist as an `eng.<domain>.<name>` last-segment.

### Assistant | 2026-05-31T05:24:02.065Z

[tool_use: Bash]

### User | 2026-05-31T05:25:42.470Z

[tool_result] Does any of the 6 engine.* node-id suffixes have an eng.* alias (would be repointable)?
  validate-command-frontmatter -> alias? no
  u-vault01-knowledge-vault-schema -> alias? no
  reference-u-ck06-command-frontmatter-schema -> alias? no
  u-vault01-loop-flush -> alias? no
  fleet-alpha-loop-ended-ready-for-commit-handoff -> alias? no
  forgetripleupgradeverifynode -> alias? no

### Assistant | 2026-05-31T05:25:51.042Z

None of the 6 `engine.*` node-id suffixes have an `eng.*` alias — so even if an edge endpoint references one of these 6 live nodes, the lookup `alias.get(cls)` returns `undefined` and the endpoint is left unchanged (counted as `unresolved`). So in the CURRENT live graph, the DEAD→LIVE invariant holds *by data*, but NOT *by the structural claim* in the code comment. The claim "engine.* nodes never exist" is empirically false (6 exist).

This is the central correctness concern. Let me reason about whether it's a real defect or a latent one. These 6 `engine.*` nodes are clearly NOT engine nodes — they're misclassified ghost/loop/vault nodes that happen to have been minted with an `engine.` prefix (e.g. `engine.fleet-alpha-loop-ended-ready-for-commit-handoff`). They are L10 ghost-type artifacts, not the `engine.<ClassName>` PascalCase scheme the pass targets. The pass's safety actually rests on a NARROWER true invariant: *an `engine.<X>` endpoint is only rewritten when `X.toLowerCase()` matches an `eng.<domain>.<name>` last-segment.* Let me verify whether any edge actually points TO one of these 6 nodes (to assess live-edge blast radius if a future alias collision arose), and confirm the `to`-endpoint=16 population is dead.

### Assistant | 2026-05-31T05:25:56.150Z

[tool_use: Bash]

### User | 2026-05-31T05:26:16.115Z

[tool_result] edges with an endpoint pointing at one of the 6 engine.* LIVE nodes: 0

### Assistant | 2026-05-31T05:26:23.928Z

Zero edges point at the 6 live `engine.*` nodes — they are orphan/leaf ghost nodes with no inbound engine-style edges. So in the current graph there is genuinely no live edge at risk, and the pass is safe in practice. The defect is purely in the **comment's claim** (over-broad), not the runtime behavior, which is correctly gated by the alias lookup. This is a P2 (documentation/correctness-of-stated-invariant) not a P0.

Now let me verify the dedup-drop logic carefully (point 3). Let me trace point 3(a): can a dead edge be falsely dropped against its OWN stale old key? The `seen` set is built from ALL original edges' keys BEFORE any rewrite. A dead edge's original key contains `engine.X` in the target. After rewrite, its new key contains `eng.domain.x`. The check is `seen.has(newKey)`. Since `seen` was built from original keys (which include this edge's OWN original `engine.X` key, not its new key), the edge's own old key is different from its new key — so it cannot match itself. Let me verify this reasoning holds and confirm 3(d) — whether `graph.edges` is only reassigned on drops.

### Assistant | 2026-05-31T05:26:33.911Z

[tool_use: Bash]

### User | 2026-05-31T05:26:47.180Z

[tool_result] 3a single dead edge: {"remapped":1,"dropped":0,"unresolved":0,"distinctMissing":0} kept=1 target=eng.calc.foo
3b two dead -> same canon: {"remapped":1,"dropped":1,"unresolved":0,"distinctMissing":0} kept=1
3c dead collides w/ live: {"remapped":0,"dropped":1,"unresolved":0,"distinctMissing":0} kept=1 survivor.live=true
3d no-drop array identity preserved: true
ALL POINT-3 TRACE ASSERTIONS PASSED

### Assistant | 2026-05-31T05:26:55.299Z

All point-3 dedup traces pass correctly:
- 3(a): A dead edge with no collision is remapped+kept; never dropped against its own stale key (confirmed — `seen` built from original keys, new key differs).
- 3(b): Two dead edges → same canonical: exactly one survives (remapped=1, dropped=1).
- 3(c): Dead collides with pre-existing live: dead dropped, **live untouched** (`live:true` survivor). Note `remapped=0` here — the dead edge IS rewritten (its `e[f]` is mutated to `eng.calc.foo`) but because it collides, `dropped++` runs and `continue` skips the `remapped++`. The mutated-but-dropped edge is correctly excluded from `keep`.
- 3(d): No drops → array identity preserved (no reassignment).

One subtle observation in 3(c): the dead edge's endpoint IS mutated in place before the drop decision. Since it's dropped (not pushed to `keep`), the mutation is harmless. Good.

Now let me check point 6 (stats honesty) more carefully — there's a subtle interaction. Consider an edge with `target=engine.Missing` (unresolved) AND `from=engine.Foo` (resolvable). Let me also check the `unresolved` double-count behavior and a both-endpoints-mixed case.

### Assistant | 2026-05-31T05:27:04.891Z

[tool_use: Bash]

### User | 2026-05-31T05:27:15.236Z

[tool_result] mixed edge: {"remapped":1,"dropped":0,"unresolved":1,"distinctMissing":1} from=eng.calc.foo to=engine.Missing
both-resolvable one edge: {"remapped":1,"dropped":0,"unresolved":0,"distinctMissing":0}
self-loop after canon: eng.calc.foo eng.calc.foo {"remapped":1,"dropped":0,"unresolved":0,"distinctMissing":0} kept=1
ALL POINT-6 STATS ASSERTIONS PASSED

### Assistant | 2026-05-31T05:27:23.349Z

Stats semantics confirmed:
- `remapped` is **edge-level** (an edge with ≥1 endpoint rewritten counts once, even with both endpoints rewritten).
- `unresolved` is **endpoint-level** (counts each missing endpoint).

This is a mild inconsistency in counting unit (edges vs endpoints) but it matches the documented contract in the lib header (lines 101-104: "remapped — edges with ≥1 endpoint rewritten and kept" vs "unresolved — engine.* endpoints with no alias"). The doc is honest about the distinction. R12-compliant.

One real subtle stats concern: in the mixed case (`from` resolves, `to` missing), the edge is counted as `remapped=1` even though it still has a dead `to=engine.Missing` endpoint. The edge is NOT fully live. But the doc says "edges with ≥1 endpoint rewritten and kept" — so "remapped" doesn't claim "now fully live." Acceptable per the contract, though an operator reading "10287 remapped" might assume all became live. This is a P2 honesty nuance.

Now let me verify point 2 (alias determinism — total order) and the ≥3-segment guard with adversarial nested cases, plus point 5 (from/source rewriting safety — already partly answered: 0 live `source`/`from` engine.* endpoints exist).

### Assistant | 2026-05-31T05:27:34.724Z

[tool_use: Bash]

### User | 2026-05-31T05:27:43.398Z

[tool_result] order-independence pick: eng.calc.foo eng.calc.foo eng.calc.foo stable=true
3-seg beats 4-seg nested: eng.zzz.child
only-nested fallback: eng.ai.parent.child
lex tie: eng.aaa.x
empty-last skip: 1 eng.calc.real
ALL POINT-2 DETERMINISM ASSERTIONS PASSED

### Assistant | 2026-05-31T05:27:52.462Z

Point 2 fully confirmed:
- **Total order / order-independence**: identical pick (`eng.calc.foo`) across 3 different input orderings — the comparator `nseg → other-flag → localeCompare` is a strict total order (localeCompare on distinct ids never returns 0, so `sort` is deterministic; on truly-identical ids the pick is the same id anyway). Never throws on ties.
- **≥3-segment guard**: 2-seg cluster nodes (`eng.calc`) excluded; 3-seg top-level correctly beats 4-seg nested (`eng.zzz.child` beats `eng.ai.parent.child` because nseg 3 < 4 — answering the explicit concern "Could a nested sub-engine ever be wrongly preferred?" → **NO**).
- Only-nested fallback still resolves (dead→live wins even via a nested node).
- Empty-last-segment (`eng.calc.`) is correctly skipped (`!last` guard at line 70).

Now let me verify point 1's prefix-match safety precisely and point 4 (edgeKey consistency with the merge file). The concern in point 1: could `startsWith("engine.")` match a LIVE node id? The answer hinges on the alias lookup, not the prefix. But let me also confirm the merge file's OWN dedup that the new graph will later feed — i.e., that the new lib's 3-field edgeKey matches the dominant convention so no double-counting drift. Let me also run the test suite to confirm the 13 cases pass.

### Assistant | 2026-05-31T05:27:53.083Z

[tool_use: Bash]

### User | 2026-05-31T05:28:08.667Z

[tool_result]   ...
# Subtest: multiple distinct missing engines counted once each
ok 13 - multiple distinct missing engines counted once each
  ---
  duration_ms: 0.1485
  ...
1..13
# tests 13
# suites 0
# pass 13
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 160.6573

### Assistant | 2026-05-31T05:28:18.576Z

All 13 tests pass. Now the final consistency check (point 4): the new lib's edgeKey is `${e.from || e.source}|${e.to || e.target}|${e.type ?? ""}`. The merge file has BOTH a 2-field form (6 sites, lines 575-796) and the 3-field form (59 sites). Let me assess whether the 2-field/3-field divergence creates a dedup inconsistency that matters for THIS pass. The pass runs at the very end (line 2709), AFTER all augmentation blocks have already deduped. The pass's own `seen` set is internal and self-consistent (it uses its own 3-field edgeKey for both the initial population and the collision check). So internal consistency is guaranteed. The question is only whether the 3-field choice could let a remapped edge slip past as a "non-duplicate" when the downstream graph/renderer would treat it as a duplicate. Let me check what the live graph's edges look like — do they carry a `type` field, and is the canonical post-merge dedup 2-field or 3-field?

### Assistant | 2026-05-31T05:28:20.849Z

[tool_use: Bash]

### User | 2026-05-31T05:28:46.804Z

[tool_result] sample dead edges:
  {"source":"pdf-extract.1_basic_training_day_1_2d_drawing_pdf","target":"engine.PdfBlueprintDimensionExtractorEngine","type":"bridge-to-engine"}
  {"source":"pdf-extract.1_basic_training_day_1_2d_drawing_pdf","target":"engine.CADGeometryEngine","type":"bridge-to-engine"}
  {"source":"pdf-extract.ac1337_handout_1337_ac1377_20_20mighty_20macros_20_2013_1115_pdf","target":"engine.
... [+53 chars truncated]

### Assistant | 2026-05-31T05:28:52.700Z

The dead edges carry `source`/`target`/`type` (3 fields, `type:"bridge-to-engine"`). The new lib's 3-field edgeKey (`from||source | to||target | type`) correctly captures all three, matching the dominant 3-field convention used at the splice sites that produce these edges (line 820+ form). The 2-field sites (575-796) are older blocks producing different edge classes; they don't affect this pass's internal consistency. The pass's `seen` set is self-consistent regardless. **edgeKey consistency: PASS.**

Let me verify one more empirical thing — whether the targets that resolve will actually find aliases (sanity check that the pass will do real work and that `PdfBlueprintDimensionExtractorEngine` → has an `eng.*` alias), confirming the fix is functional not a no-op.

### Assistant | 2026-05-31T05:28:57.125Z

[tool_use: Bash]

### User | 2026-05-31T05:29:04.587Z

[tool_result] Will these dead targets resolve to a live eng.* alias?
  pdfblueprintdimensionextractorengine -> RESOLVES (dead->live)
  cadgeometryengine -> unresolved (honest dead pixel)
  pdfgenericextractorengine -> unresolved (honest dead pixel)
  airesourcelearningengine -> RESOLVES (dead->live)

### Assistant | 2026-05-31T05:29:38.795Z

The pass does real work — some dead targets resolve to live aliases (dead→live), others remain honest dead pixels (engine genuinely not in the merged graph, e.g. `CADGeometryEngine` exists in source but isn't an `eng.<domain>.<name>` merged node — left unchanged per R12). This confirms the fix is functional and the `unresolved` residue is honest.

I have all the evidence I need. Let me consolidate the review.

## ARM A REVIEW — U-VIZ-G4-DEAD-EDGE-ENG (weighted: ALGORITHM CORRECTNESS)

Reviewed from H:/prism main-tree copies (my CWD `H:/prism-slot-sierra` lacked the edits, as warned). Both files syntax-check clean (`node --check`); 13/13 tests pass; verified empirically against the live 546.7 MB `system-graph.json`.

### Point-by-point verdict

**1. DEAD→LIVE INVARIANT — finding (P2).** The code comment (lib lines 21-24, merge line 2703-2704) claims *"`engine.<Pascal>` nodes never exist… nothing live is ever repointed."* **Empirically false:** the live graph contains **6** `engine.<...>` node ids (`engine.validate-command-frontmatter`, `engine.u-vault01-loop-flush`, `engine.fleet-alpha-loop-ended-…`, `engine.forgetripleupgradeverifynode`, etc.). These are misclassified ghost/loop/vault nodes that happen to carry an `engine.` prefix — NOT the PascalCase `engine.<ClassName>` engine scheme.
   - **Runtime is still safe**, because the rewrite is gated by `alias.get(cls)`, not by the prefix alone. I verified none of the 6 suffixes has an `eng.*` alias (all 6 → `unresolved`), and **0 edges point at any of the 6**. So no live edge is at risk in the current graph.
   - The TRUE invariant is narrower than stated: *an `engine.<X>` endpoint is rewritten only when `X.toLowerCase()` matches an existing `eng.<domain>.<name>` last-segment.* That is the real safety property — and it IS sound. The comment overstates it. **Latent risk:** if a future ghost node `engine.<foo>` is minted whose lowercased suffix collides with a real engine class last-segment AND an edge points to it, the 
... [+3995 chars truncated]
