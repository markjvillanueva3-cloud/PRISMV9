---
type: "chat-session"
source: "claude-code-cli"
session_id: "358cf225-d753-40b9-9ef5-8ea38cf462fa"
title: "Reviewer C (analyst, weighted to silent breakage + regression risk) of a 3-of-3 "
date: "2026-06-22"
first_ts: "2026-06-22T13:26:03.326Z"
last_ts: "2026-06-22T13:29:39.996Z"
cwd: "H:\\prism"
messages: 56
user_msgs: 21
assistant_msgs: 35
raw_file: "H:/.claude/projects/H--prism/358cf225-d753-40b9-9ef5-8ea38cf462fa/subagents/agent-a5c6b0f8bf3eff456.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:10"
---

# Reviewer C (analyst, weighted to silent breakage + regression risk) of a 3-of-3 

> **claude-code-cli** | 2026-06-22 | 56 msgs (21 user / 35 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/358cf225-d753-40b9-9ef5-8ea38cf462fa/subagents/agent-a5c6b0f8bf3eff456.jsonl`

## Transcript

### User | 2026-06-22T13:26:03.326Z

Reviewer C (analyst, weighted to silent breakage + regression risk) of a 3-of-3 gate. Review commit `6d8fbd50f9` (`git -C H:/prism show 6d8fbd50f9`), a small ~8-line follow-up to `2d787d6091`.

This adds `generate-core-inventory.mjs` to regen-viz.mjs FAST[] (so it runs every regen) and adds a deterministic tiebreak to the classNameIndex in merge-augmentations.mjs.

Hunt for:
1. REGEN-PIPELINE RISK — does adding core-inventory to FAST introduce any failure into the ~3-min regen? Verify the generator: does it write ONLY its augmentation JSON (not the merged graph directly)? Does it depend on graph state that may not exist? Run `cd H:/prism && node --check scripts/regen-viz.mjs` and confirm the FAST array still parses. Where in FAST order was it placed (after generate-knowledge-inventory) — any ordering dependency?
2. STALE-FOLD vs FRESH — confirm the claim that core-inventory was stale-folded since 2026-05-09: its merge consumer (coreInventory at merge ~line 616) reads core-inventory-augmentation.json; before this commit nothing refreshed it. Is the fix correct (FAST-add refreshes it)?
3. TIEBREAK — `(prev.startsWith("eng.") && id.startsWith("eng.") && id < prev)` — any edge case where this picks a wrong/worse node than before, or breaks the existing 185/210 echo-roost edge recovery? 
4. Did the revert of the vault-atomic edits (per the commit message, vault-atomic was investigated then deferred) leave any dangling reference in merge-augmentations.mjs? Grep for `vaultAtomic` — it should NOT appear.

FIRST line MUST be 'VERDICT: PASS' or 'VERDICT: FAIL'. Then BLOCKER: lines (file:line) for P0/P1, then ≤3 notes.

### Assistant | 2026-06-22T13:26:07.057Z

I'll investigate this commit thoroughly, hunting for silent breakage in the regen pipeline.

### Assistant | 2026-06-22T13:26:08.006Z

[tool_use: Bash]

### Assistant | 2026-06-22T13:26:08.735Z

[tool_use: Bash]

### User | 2026-06-22T13:26:09.481Z

[tool_result] Bash result cached (<3min) for this command. The result is already in session context — summarize from it instead of re-running. If you need fresh data, modify the command (different flags, different path).

### User | 2026-06-22T13:26:19.660Z

[tool_result] PARSE_OK regen-viz
PARSE_OK merge-augmentations

### Assistant | 2026-06-22T13:26:21.906Z

Both files parse. Let me get the actual diff content.

### Assistant | 2026-06-22T13:26:22.677Z

[tool_use: Bash]

### User | 2026-06-22T13:26:32.839Z

[tool_result] commit 6d8fbd50f903053be0a4148cde6684008cea42d5
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Mon Jun 22 08:25:14 2026 -0500

    [MAIN-FORCE] [SIERRA-VIZ]/U-VIZ-ORPHAN-WIRE (slot:sierra): FAST-add core-inventory (674 stale-folded nodes) + deterministic eng.* resolver tiebreak
    
    Closes 2 findings from the U-VIZ-DUALREG-AUDIT auditor (iter1):
    
    1. generate-core-i
... [+4275 chars truncated]

### Assistant | 2026-06-22T13:26:37.967Z

The diff is clear. Now let me examine the generator and the FAST array context, plus verify the deferred vault-atomic left no dangling references.

### Assistant | 2026-06-22T13:26:39.791Z

[tool_use: Bash]

### User | 2026-06-22T13:26:45.051Z

[tool_result] ===== vaultAtomic grep in merge-augmentations =====
NO_VAULTATOMIC_REFS
===== FAST array order context =====
92:  "generate-engine-domain-inventory.mjs",
93:  "generate-knowledge-inventory.mjs",
94:  "generate-core-inventory.mjs",  // U-VIZ-ORPHAN-WIRE (sierra 2026-06-22): was half-wired -- merge folds coreInventory (~line 616) but FAST[] never ran it -> 674 core.* nodes stale-folded since 2026-05
... [+112 chars truncated]

### Assistant | 2026-06-22T13:26:48.460Z

No `vaultAtomic` references (finding 4 clean). Now let me examine the generator itself to verify it writes only its augmentation JSON and doesn't depend on graph state.

### Assistant | 2026-06-22T13:26:48.749Z

[tool_use: Read]

### User | 2026-06-22T13:26:49.898Z

[tool_result] read-once-guard: 'H:\prism\scripts\generate-core-inventory.mjs' was already read 19s ago in this session and is unchanged (mtime 1778358340088). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-22T13:26:56.200Z

A read-once guard fired, but I haven't actually seen this file's content this session. Let me work around the guard with a targeted Grep to verify the generator's write behavior and graph dependencies.

### Assistant | 2026-06-22T13:26:58.086Z

[tool_use: Grep]

### User | 2026-06-22T13:26:59.827Z

[tool_result] 5: * The 10 L6 placeholders in system-graph.json (core.algos, core.schemas, …)
10: * Output: state/shared/system-viz/core-inventory-augmentation.json
13: * folds it into system-graph.json. We deliberately do NOT touch
48:    try { ents = fs.readdirSync(cur, { withFileTypes: true }); } catch { continue; }
56:        try { size = fs.statSync(p).size; } catch {}
190:const outPath = path.join(VIZ_DIR,
... [+101 chars truncated]

### Assistant | 2026-06-22T13:27:03.045Z

[tool_use: Bash]

### User | 2026-06-22T13:27:10.898Z

[tool_result] ===== file size / line count =====
197 scripts/generate-core-inventory.mjs
===== does it read the 548MB graph anywhere? =====
5: * The 10 L6 placeholders in system-graph.json (core.algos, core.schemas, …)
13: * folds it into system-graph.json. We deliberately do NOT touch
===== output target =====
10: * Output: state/shared/system-viz/core-inventory-augmentation.json
12: * The merge step in script
... [+394 chars truncated]

### Assistant | 2026-06-22T13:27:17.678Z

The generator: writes ONLY `core-inventory-augmentation.json` (line 192), never touches `system-graph.json` (explicit comment line 13), does a pure FS-walk with per-entry `try/catch` (lines 48, 56), and gracefully handles missing dirs (line 43 `if (!fs.existsSync(dir)) return out`). No graph parse. Let me verify the FAST siblings around it use the same write-only contract pattern (so the ordering is independent), and confirm the merge consumer reads the augmentation file the generator writes.

### Assistant | 2026-06-22T13:27:18.314Z

[tool_use: Read]

### User | 2026-06-22T13:27:19.726Z

[tool_result] 88	  process.exit(fail ? 1 : 0);
89	}
90	
91	const FAST = [
92	  "generate-engine-domain-inventory.mjs",
93	  "generate-knowledge-inventory.mjs",
94	  "generate-core-inventory.mjs",  // U-VIZ-ORPHAN-WIRE (sierra 2026-06-22): was half-wired -- merge folds coreInventory (~line 616) but FAST[] never ran it -> 674 core.* nodes stale-folded since 2026-05-09. Healthy 0s FS-walk, no graph parse. Dual-reg
... [+10132 chars truncated]

### Assistant | 2026-06-22T13:27:23.811Z

The FAST array invokes generators by spawning each as a subprocess (each emits its own augmentation JSON independently). Let me verify the runner's per-generator execution contract (is a generator crash isolated, or does it abort the whole regen?), and confirm the merge consumer reads exactly the file the generator writes.

### Assistant | 2026-06-22T13:27:26.168Z

[tool_use: Bash]

### Assistant | 2026-06-22T13:27:27.111Z

[tool_use: Bash]

### User | 2026-06-22T13:27:31.191Z

[tool_result] ===== how FAST entries are executed in regen-viz =====
23:import { spawnSync } from "node:child_process";
63:    const dd = spawnSync(process.execPath, [path.join(ROOT, "scripts", "detect-system-viz-drift.mjs")], {
64:      stdio: "inherit", cwd: ROOT,
66:    if (dd.status !== 0) {
231:// sequentially (one spawnSync at a time), so peak is one 24GB process. If 24GB still
239:for (const s of scripts
... [+2223 chars truncated]

### User | 2026-06-22T13:27:33.303Z

[tool_result] ===== coreInventory consumer in merge =====
153:const coreInventory  = loadOptional("core-inventory-augmentation.json");
284:if (coreInventory)   versions.coreInventory   = coreInventory.generatedAt   ?? "present";
626:let coreInventoryChildren = 0;
627:if (coreInventory?.newNodes && coreInventory?.newEdges) {
629:  for (const node of coreInventory.newNodes) {
633:    coreInventoryChildren++;
638:
... [+2513 chars truncated]

### Assistant | 2026-06-22T13:27:37.031Z

Key finding on regen-pipeline risk: at line 244, a FAST generator exiting non-zero triggers `console.error` — let me confirm whether that aborts the whole regen or just continues. This is the critical question for finding #1.

### Assistant | 2026-06-22T13:27:37.983Z

[tool_use: Read]

### Assistant | 2026-06-22T13:27:38.622Z

[tool_use: Read]

### User | 2026-06-22T13:27:39.526Z

[tool_result] 239	for (const s of scripts) {
240	  const abs = path.join(ROOT, "scripts", s);
241	  const start = Date.now();
242	  const r = spawnSync(process.execPath, [...NODE_ARGS, abs], { stdio: "inherit", cwd: ROOT });
243	  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
244	  if (r.status !== 0) {
245	    console.error(`[regen-viz] ✗ ${s} failed (exit ${r.status}, ${elapsed}s)`);
246	    faile
... [+254 chars truncated]

### User | 2026-06-22T13:27:40.071Z

[tool_result] 626	let coreInventoryChildren = 0;
627	if (coreInventory?.newNodes && coreInventory?.newEdges) {
628	  const existingIds = new Set(G.nodes.map(n => n.id));
629	  for (const node of coreInventory.newNodes) {
630	    if (existingIds.has(node.id)) continue;
631	    G.nodes.push(node);
632	    existingIds.add(node.id);
633	    coreInventoryChildren++;
634	  }
635	  G.edges ??= [];
636	  const edgeKey 
... [+1281 chars truncated]

### Assistant | 2026-06-22T13:27:47.504Z

Confirmed: the FAST loop (line 239-250) is **fail-soft per generator** — a non-zero exit logs `console.error` + `failed++` but does NOT `break`/`exit`; the loop continues. So even in the worst case (a hypothetical core-inventory crash), it cannot abort the regen. And the generator does a pure FS-walk with no graph dependency, so a crash is highly unlikely.

The merge consumer (line 627) correctly reads `core-inventory-augmentation.json` via `loadOptional` (line 153) and dedups by id (`if (existingIds.has(node.id)) continue`, line 630) — so the freshly-regenerated augmentation will fold cleanly. The stale-fold claim holds: nothing in FAST refreshed it before this commit, so the file was last written 2026-05-09 and merge folded stale data every regen.

Now let me verify the augmentation file's actual freshness on disk and that the generator output shape matches what the merge expects (`newNodes`/`newEdges`/`byParent`), plus deeply analyze the tiebreak edge cases.

### Assistant | 2026-06-22T13:27:51.066Z

[tool_use: Bash]

### User | 2026-06-22T13:27:56.953Z

[tool_result] ===== augmentation file mtime + generatedAt =====
-rw-r--r-- 1 wompu 197611 633404 2026-06-22 08:27 state/shared/system-viz/core-inventory-augmentation.json
===== generatedAt field =====
"generatedAt": "2026-06-22T13:27:20.081Z"
===== top-level keys (shape match newNodes/newEdges/byParent?) =====
keys: schemaVersion, generatedAt, byParent, newNodes, newEdges, stats
newNodes: 674
newEdges: 674
byPa
... [+15 chars truncated]

### Assistant | 2026-06-22T13:28:04.175Z

This validates the entire fix. The augmentation file is now dated **2026-06-22 08:27** (regenerated, was 2026-05-09 stale), with exactly **674 newNodes** matching the commit message claim. The output shape (`newNodes`/`newEdges`/`byParent`) exactly matches the merge consumer's expectations (line 627: `coreInventory?.newNodes && coreInventory?.newEdges`, line 644: `coreInventory.byParent`). The fix is verified end-to-end on live data.

Now the deep tiebreak analysis. Let me see the full `classNameIndex` function context and find its consumers to assess whether the new lexicographic tiebreak could pick a worse node or break the echo-roost edge recovery (185/210).

### Assistant | 2026-06-22T13:28:04.453Z

[tool_use: Read]

### Assistant | 2026-06-22T13:28:05.306Z

[tool_use: Bash]

### User | 2026-06-22T13:28:06.292Z

[tool_result] 1048	// to these 3 roosts; the older sibling blocks stay inline (no risky refactor of working code).
1049	// Lazily-built class-name -> node-id index (last id-segment lowercased -> id, prefer eng.*), used to
1050	// resolve roost bridge edges whose endpoints are bare engine CLASS NAMES (the documented generator
1051	// bug: "to":"MasterPostProcessorEngine" instead of "eng.cam.masterpostprocessoren
... [+1239 chars truncated]

### User | 2026-06-22T13:28:10.722Z

[tool_result] ===== classNameIndex consumers =====
1053:let _classNameIndex = null;
1054:function classNameIndex() {
1055:  if (_classNameIndex) return _classNameIndex;
1071:  _classNameIndex = idx;
1079:  const hit = classNameIndex().get(String(ref).toLowerCase());
===== echo-roost / 185 / 210 references =====
194:// U-VIZ-ECHO-ROOST-SPLICE (slot:sierra 2026-06-22): 3 echo POST-PDF-NODE-MS0 roosts were added t
... [+729 chars truncated]

### Assistant | 2026-06-22T13:28:19.165Z

Now I have the complete picture. The tiebreak only fires when **both** `prev` and `id` are `eng.*` AND they share the same lowercased class-name segment (same engine class dual-registered across galaxies, e.g. `eng.mill.foo` vs `eng.cam.foo`). The resolution target is just a node-id to attach a roost bridge edge to — both candidates are the same engine class, so either is a valid endpoint; the tiebreak only makes the *choice* deterministic across regens (the P2 churn fix).

Let me reason about whether this could regress the 185/210 echo-roost recovery. The critical question: **before** this commit, when two `eng.*` shared a key, the first-seen `eng.*` won (insertion order over `G.nodes`). **After**, the lexicographically-smallest `eng.*` wins. Could this change which key resolves and thereby *drop* an edge that previously resolved?

The answer is no for edge-count: the key is *present* in the index either way (an `eng.*` value is stored regardless of which one wins), so `resolveRef` still returns a hit — the edge still resolves. Only the chosen endpoint id changes, never hit-vs-miss. So the 185/210 count is invariant. Let me confirm `resolveRef`'s drop logic and check the test file referenced (12/12) to validate.

### Assistant | 2026-06-22T13:28:20.568Z

[tool_use: Read]

### User | 2026-06-22T13:28:22.095Z

[tool_result] 1074	// Resolve an edge endpoint to a live node-id: pass-through if already an id, else map a bare
1075	// class-name via the index. Returns null when unresolvable (-> caller drops the edge, never folds a dangler).
1076	function resolveEndpoint(ref, ids) {
1077	  if (ref == null) return null;
1078	  if (ids.has(ref)) return ref;
1079	  const hit = classNameIndex().get(String(ref).toLowerCase());
1
... [+1907 chars truncated]

### Assistant | 2026-06-22T13:28:22.861Z

[tool_use: Bash]

### User | 2026-06-22T13:28:29.219Z

[tool_result] ===== test file for this change =====
scripts/lib/augmentation-freshness.test.mjs
scripts/lib/cnc-program-gt-lib.test.mjs
scripts/lib/hybrid-retrieval.test.mjs
scripts/lib/pareto-frontier-emit.test.mjs
scripts/lib/tribal-graph-clusters.test.mjs

### Assistant | 2026-06-22T13:28:38.107Z

`resolveEndpoint` (line 1076-1081) confirms my analysis definitively. The function returns `hit && ids.has(hit) ? hit : null`. The `hit` is the index value (a single `eng.*` id). Whether the tiebreak picks `eng.cam.foo` or `eng.mill.foo`, the value is **always a live `eng.*` node** that exists in `ids` (it came from `G.nodes`), so `ids.has(hit)` is always true → the edge resolves either way. The tiebreak cannot convert a resolve into a drop. **The 185/210 recovery count is invariant** — only the chosen endpoint id changes deterministically, which is exactly the P2 churn-stability goal.

One subtle edge case worth checking: could the tiebreak ever pick a node that exists in the index but NOT in the final `ids` set at fold time, where the old first-seen would have picked one that does? No — both candidates come from the same `G.nodes` snapshot; the index is built once over `G.nodes`, and `ids` in `foldRoostAug` is also `new Set(G.nodes.map(...))` plus newly-added nodes. Both `eng.*` candidates are in `ids`. So no regression path exists.

Let me run the dual-reg audit test and verify the auditor claim (orphans 3→2) and the test count (12/12), and double-check the staleness-overlay sibling that runs immediately after core-inventory has no ordering coupling.

### Assistant | 2026-06-22T13:28:41.931Z

[tool_use: Bash]

### User | 2026-06-22T13:28:48.995Z

[tool_result] ===== does staleness-overlay (FAST line 95, runs right after) read core-inventory output? =====
NO_COUPLING_staleness
===== does core-inventory read any sibling FAST output? (ordering dep) =====
12: * The merge step in scripts/merge-augmentations.mjs picks this up and
===== dual-reg audit lib test exists? =====
scripts/lib/viz-dual-registration-audit.mjs
scripts/lib/viz-dual-registration-audit.tes
... [+5 chars truncated]

### Assistant | 2026-06-22T13:28:53.370Z

Confirmed — **no ordering coupling**. `generate-core-inventory.mjs` reads no sibling FAST output (only its own `outPath`), and the next FAST entry (`generate-staleness-overlay.mjs`) does not read core-inventory output. The placement at line 94 (after `generate-knowledge-inventory`, before `generate-staleness-overlay`) is positionally irrelevant — each generator is an independent FS-walk emitting its own augmentation JSON, all merged at the end. Position-independence verified.

Let me run the dual-reg audit test to validate the 12/12 claim and that the auditor confirms core-inventory is now properly registered.

### Assistant | 2026-06-22T13:28:54.312Z

[tool_use: Bash]

### User | 2026-06-22T13:29:03.424Z

[tool_result]   ...
# Subtest: extractGeneratorOutputs: convention fallback captures *-augmentation.json const
ok 11 - extractGeneratorOutputs: convention fallback captures *-augmentation.json const
  ---
  duration_ms: 0.1222
  ...
# Subtest: extractGeneratorOutputs: read-only input augmentation is NOT counted as output
ok 12 - extractGeneratorOutputs: read-only input augmentation is NOT counted as output
  --
... [+133 chars truncated]

### Assistant | 2026-06-22T13:29:07.642Z

**12/12 tests pass** — matches the commit claim exactly. Let me do one final adversarial check on the tiebreak: confirm `id < prev` lexicographic comparison is well-defined for the actual `eng.*` id namespace (no surprise with mixed case, since keys are lowercased but ids are compared raw), and run a quick sanity simulation of the resolver.

### Assistant | 2026-06-22T13:29:16.707Z

[tool_use: Bash]

### User | 2026-06-22T13:29:21.985Z

[tool_result] order A (mill first): eng.cam.fooengine
order B (cam first): eng.cam.fooengine
eng beats ghost (eng-first): eng.zulu.barengine
eng beats ghost (ghost-first): eng.zulu.barengine

### Assistant | 2026-06-22T13:29:39.996Z

The simulation confirms the tiebreak is fully deterministic:
- **Both insertion orders** (mill-first / cam-first) resolve to the same `eng.cam.fooengine` (lexicographically smaller) — the P2 churn fix works.
- **`eng.*` still beats `ghost.*`** regardless of order — the pre-existing prefer-eng behavior is preserved (no regression to the documented class-name resolution scheme).

I have completed all four hunt vectors with live verification. Here is my verdict.

---

VERDICT: PASS

summary: A clean ~8-line follow-up. The FAST-add of `generate-core-inventory.mjs` is safe — the generator is a pure FS-walk that writes ONLY its own augmentation JSON (line 192), never touches the 548MB graph (explicit comment line 13), wraps every FS op in try/catch, and the FAST loop is fail-soft per-generator (regen-viz.mjs:244-250 logs+counts but never aborts), so it cannot break the ~3-min regen. The stale-fold claim is verified on live data (augmentation now dated 2026-06-22 08:27, 674 newNodes, shape `newNodes`/`newEdges`/`byParent` exactly matches the merge consumer at line 627/644). The lexicographic tiebreak cannot drop an edge (resolveEndpoint always returns a live `eng.*` id either way) so the 185/210 echo-roost recovery is invariant; it only makes endpoint selection deterministic across regens. No `vaultAtomic` dangler. 12/12 dual-reg tests pass.

findings: none

Consumers / edge-paths traced (auditable PASS):
- **Regen pipeline** — `scripts/regen-viz.mjs:239-250`: FAST loop is per-generator fail-soft (non-zero exit → `console.error` + `failed++`, NO `break`/`exit`). Even a hypothetical core-inventory crash is isolated. `node --check` parses clean.
- **Generator contract** — `scripts/generate-core-inventory.mjs`: writes only `core-inventory-augmentation.json` (line 192); no graph read (grep confirmed); FS-walk fail-soft (lines 43, 48, 56). No sibling-FAST input → position-independent (line 94 placement irrelevant). Next FAST entry `generate-staleness-overlay.mjs` does not read 
... [+976 chars truncated]
