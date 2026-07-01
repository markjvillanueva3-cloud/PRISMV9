---
type: "chat-session"
source: "claude-code-cli"
session_id: "358cf225-d753-40b9-9ef5-8ea38cf462fa"
title: "Reviewer C (analyst, silent-breakage + regression + pipeline-safety) of a 3-of-3"
date: "2026-06-22"
first_ts: "2026-06-22T14:38:21.126Z"
last_ts: "2026-06-22T14:43:38.728Z"
cwd: "H:\\prism"
messages: 62
user_msgs: 22
assistant_msgs: 40
raw_file: "H:/.claude/projects/H--prism/358cf225-d753-40b9-9ef5-8ea38cf462fa/subagents/agent-a361aace5f0793840.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:10"
---

# Reviewer C (analyst, silent-breakage + regression + pipeline-safety) of a 3-of-3

> **claude-code-cli** | 2026-06-22 | 62 msgs (22 user / 40 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/358cf225-d753-40b9-9ef5-8ea38cf462fa/subagents/agent-a361aace5f0793840.jsonl`

## Transcript

### User | 2026-06-22T14:38:21.126Z

Reviewer C (analyst, silent-breakage + regression + pipeline-safety) of a 3-of-3 gate. Review commit `56e461eeee` (`git -C H:/prism show 56e461eeee`). This FAST-adds a previously-hanging generator to the regen pipeline.

Hunt for:
1. **REGEN-PIPELINE RISK** — fs-inventory is now in regen-viz FAST[] (runs every ~3-min regen). It loads the 745MB system-graph.json (via readGraphStreaming) + walks the filesystem. Confirm: (a) it completes in seconds now (the 74,704->88 L9 filter fix), (b) regen-viz spawns FAST generators with a 24GB heap (line ~233 NODE_ARGS), so the graph load won't OOM. Run `cd H:/prism && time node scripts/generate-fs-inventory.mjs` — confirm it finishes quickly and writes valid output. Could it ever hang again (e.g. a single huge fs-dir)? The bounded walk caps (MAX_DEPTH_PER_CHILD=3, MAX_FILES_PER_CHILD=5000) — are they intact?
2. **FILTER CORRECTNESS / silent data loss** — does the new `subgroup prism|h_root` filter silently DROP any legitimate fs-dir parent that was being expanded before? Compare stats.parents (should be ~88). The header says "84 L9 nodes... subgroup=prism / subgroup=h_root" — does the filter match the documented intent?
3. **MAIN-GUARD** — `process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)`. Confirm this correctly runs only on direct execution AND that `node scripts/generate-fs-inventory.mjs` STILL executes (the guard didn't break the production path). Also confirm `fileURLToPath` is imported.
4. **MERGE consumer** — merge-augmentations.mjs folds `fsInventory` (loadOptional line ~155, fold ~672). Confirm FAST-add completes the dual-registration (the augmentation now refreshes every regen instead of folding stale May-9 data).
5. `node --check` both files.

FIRST line MUST be 'VERDICT: PASS' or 'VERDICT: FAIL'. Then BLOCKER: lines (file:line), then ≤4 notes.

### Assistant | 2026-06-22T14:38:23.871Z

I'll start by reading the commit and the relevant files.

### Assistant | 2026-06-22T14:38:24.921Z

[tool_use: Bash]

### User | 2026-06-22T14:38:30.308Z

[tool_result] commit 56e461eeee33615c828eaf869cfc77651841c928
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Mon Jun 22 09:37:21 2026 -0500

    [MAIN-FORCE] [SIERRA-VIZ]/U-VIZ-FS-INVENTORY-WALK-FIX (slot:sierra): fix the >120s hang/OOM (74,704 L9 over-iteration) + FAST-add -> 301 fs.box nodes refreshed
    
    ROOT CAUSE (sharper than the iter5 "slow walk" diagnosis): generate() filtered 
... [+10460 chars truncated]

### Assistant | 2026-06-22T14:38:32.507Z

Let me read the full source files to verify the claims.

### Assistant | 2026-06-22T14:38:33.461Z

[tool_use: Read]

### Assistant | 2026-06-22T14:38:34.414Z

[tool_use: Bash]

### User | 2026-06-22T14:38:34.845Z

[tool_result] read-once-guard: 'H:\prism\scripts\generate-fs-inventory.mjs' was already read 25s ago in this session and is unchanged (mtime 1782138944325). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-22T14:38:39.232Z

[tool_result] 23:import { spawnSync } from "node:child_process";
63:    const dd = spawnSync(process.execPath, [path.join(ROOT, "scripts", "detect-system-viz-drift.mjs")], {
91:const FAST = [
94:  "generate-core-inventory.mjs",  // U-VIZ-ORPHAN-WIRE (sierra 2026-06-22): was half-wired -- merge folds coreInventory (~line 616) but FAST[] never ran it -> 674 core.* nodes stale-folded since 2026-05-09. Healthy 0s F
... [+5792 chars truncated]

### Assistant | 2026-06-22T14:38:43.776Z

The heap config is confirmed: `NODE_ARGS = ["--max-old-space-size=24576", "--stack-size=8192"]` at line 234, and FAST stages are spawned with `[...NODE_ARGS, abs]` at line 243. Now let me verify the imports in the file and run the live tests.

### Assistant | 2026-06-22T14:38:45.202Z

[tool_use: Grep]

### Assistant | 2026-06-22T14:38:46.601Z

[tool_use: Bash]

### User | 2026-06-22T14:38:47.263Z

[tool_result] 18:import fs from "node:fs";
19:import path from "node:path";
20:import { fileURLToPath } from "node:url";
21:import { readGraphStreaming } from "./lib/graph-io.mjs";
23:const __dirname = path.dirname(fileURLToPath(import.meta.url));
217:if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {

### User | 2026-06-22T14:38:56.227Z

[tool_result] fs-inventory: OK
regen-viz: OK
test: OK

### Assistant | 2026-06-22T14:38:58.427Z

`fileURLToPath` is imported (line 20). All three files pass `node --check`. Now let me run the tests and the live generator with timing.

### Assistant | 2026-06-22T14:38:59.009Z

[tool_use: Bash]

### User | 2026-06-22T14:39:03.893Z

[tool_result]     # Subtest: processes ONLY subgroup prism|h_root L9 nodes; ignores deep_subtree/datacat noise
    ok 1 - processes ONLY subgroup prism|h_root L9 nodes; ignores deep_subtree/datacat noise
      ---
      duration_ms: 3.3341
      ...
    # Subtest: a node whose label is not a real dir is counted missing, not walked
    ok 2 - a node whose label is not a real dir is counted missing, not walked
  
... [+279 chars truncated]

### Assistant | 2026-06-22T14:39:06.377Z

6/6 tests pass. Now the critical live run — confirm it finishes quickly at DEFAULT heap and produces valid output with ~88 parents.

### Assistant | 2026-06-22T14:39:07.459Z

[tool_use: Bash]

### User | 2026-06-22T14:39:15.379Z

[tool_result] <--- Last few GCs --->

[50308:0000013B34671000]     3061 ms: Scavenge (interleaved) 381.3 (391.0) -> 380.6 (391.5) MB, pooled: 0 MB, 1.69 / 0.00 ms  (average mu = 0.114, current mu = 0.073) allocation failure; 
[50308:0000013B34671000]     3346 ms: Mark-Compact (reduce) 381.1 (391.5) -> 380.8 (389.5) MB, pooled: 0 MB, 275.09 / 0.00 ms  (+ 0.1 ms in 0 steps since start of marking, biggest step 
... [+858 chars truncated]

### Assistant | 2026-06-22T14:39:19.328Z

This is a critical finding. The commit message claims **"Result: 4s at DEFAULT heap (was OOM/>120s)"** — but the live run **OOMs at DEFAULT heap in 3.5s**. The graph load via `readGraphStreaming(GRAPH)` exceeds the default ~380MB heap ceiling. Let me confirm this and check the graph size and what `readGraphStreaming` does.

### Assistant | 2026-06-22T14:39:21.430Z

[tool_use: Bash]

### User | 2026-06-22T14:39:28.970Z

[tool_result] ---GRAPH const---
25:const VIZ_DIR = path.join(ROOT, "state", "shared", "system-viz");
26:const GRAPH = path.join(VIZ_DIR, "system-graph.json");

### Assistant | 2026-06-22T14:39:32.262Z

[tool_use: Bash]

### User | 2026-06-22T14:39:37.763Z

[tool_result] -rw-r--r-- 1 wompu 197611 780953206 Jun 22 07:49 state/shared/system-viz/system-graph.json
---
size in MB:
744.8 MB

### Assistant | 2026-06-22T14:39:43.078Z

744.8 MB graph. The default heap OOMs. Now the decisive question: **does the FAST[] path actually run with the 24GB heap, or does some other invocation path run at default heap?** Line 243 confirms FAST stages get `[...NODE_ARGS, abs]` = 24GB. So in production via regen-viz, it gets the heap bump. But the commit message claims standalone runs at DEFAULT heap in 4s — that is false on this host. Let me verify the generator runs fine WITH the heap bump (the production path) and produces ~88 parents.

### Assistant | 2026-06-22T14:39:43.819Z

[tool_use: Bash]

### User | 2026-06-22T14:40:00.032Z

[tool_result] wrote H:\prism\state\shared\system-viz\fs-inventory-augmentation.json
  parents=88  expanded=39  skipped=47  missing=2  totalChildren=301
  fs.docustrata                              9 children (from 19 subdirs)
  fs.jm_die                                  9 children (from 26 subdirs)
  fs.archives                                9 children (from 19 subdirs)
  fs.cad-engine                         
... [+520 chars truncated]

### Assistant | 2026-06-22T14:40:05.442Z

With the production 24GB heap it succeeds: **parents=88** (matches the documented intent exactly), 301 fresh fs.box nodes, in ~11s. Now let me verify the merge consumer is intact (the dual-registration claim) and check whether the FAST[] path is truly the only invocation path — i.e., is there any place that runs FAST generators at DEFAULT heap?

### Assistant | 2026-06-22T14:40:07.579Z

[tool_use: Bash]

### User | 2026-06-22T14:40:12.870Z

[tool_result] === merge fsInventory loadOptional + fold ===
155:const fsInventory    = loadOptional("fs-inventory-augmentation.json");
286:if (fsInventory)     versions.fsInventory     = fsInventory.generatedAt     ?? "present";
672:let fsInventoryChildren = 0;
673:if (fsInventory?.newNodes && fsInventory?.newEdges) {
675:  for (const node of fsInventory.newNodes) {
679:    fsInventoryChildren++;
684:  for (con
... [+3048 chars truncated]

### Assistant | 2026-06-22T14:40:18.931Z

The merge consumer is fully intact: `loadOptional` at line 155, full fold logic at lines 672-705 (reads `newNodes`, `newEdges`, `byParent`, sets `G.meta.fsInventory`). The dual-registration is complete — FAST[] now produces it AND merge folds it. The production path (line 243) spawns FAST generators with the 24GB heap, so the production run works (verified: 88 parents, 301 nodes, 11s).

Now let me check the bounded-walk caps are intact and verify the `pathFromLabel` annotation-strip handles edge cases (the windows-backslash + annotation combo).

### Assistant | 2026-06-22T14:40:19.454Z

[tool_use: Bash]

### User | 2026-06-22T14:40:24.043Z

[tool_result] const BUCKET_MIN = 2;              // collapse extras into Misc

// per-child file walk caps (we only sample, not full enumerate)
const MAX_FILES_PER_CHILD = 5000;
const MAX_DEPTH_PER_CHILD = 3;

export function pathFromLabel(label) {
  // labels look like "H:/prism/BOX/ [5/5]" or "H:/Tools/" -- strip the trailing child-count
  // annotation "[N/M]" (added to L9 dir nodes by a decorator) THEN the 
... [+1046 chars truncated]

### Assistant | 2026-06-22T14:40:29.644Z

The caps are intact: `MAX_FILES_PER_CHILD = 5000` (line 39), `MAX_DEPTH_PER_CHILD = 3` (line 40), both enforced in `summarizeDir`'s bounded walk (depth-cap continue, file-cap break). The hang was never from a single huge dir — it was the 74,704-node over-iteration, now filtered to 88. `listSubdirs` is fail-soft (try/catch, existsSync guard). Note the walk only runs over the 88 filtered parents now, each bounded — re-hang risk is structurally eliminated.

Let me verify the output file is valid JSON and check the byParent count matches, then confirm the test fixture's filter assertion is genuinely load-bearing (not a stub).

### Assistant | 2026-06-22T14:40:32.408Z

[tool_use: Bash]

### User | 2026-06-22T14:40:38.585Z

[tool_result] valid JSON. keys: schemaVersion,generatedAt,byParent,newNodes,newEdges,stats
newNodes: 301 newEdges: 301 byParent keys: 39
stats: {"parents":88,"expanded":39,"skipped":47,"totalChildren":301,"missing":2}
generatedAt: 2026-06-22T14:39:58.681Z
sample node parent field: fs.box id: fs.box.fusion_basic_posts

### Assistant | 2026-06-22T14:40:43.868Z

Output is valid: 301 newNodes + 301 newEdges, schemaVersion present, `generatedAt` fresh (2026-06-22, was stale May-9). The merge fold guard at line 673 checks `fsInventory?.newNodes && fsInventory?.newEdges` — both present, so the fold fires. 88 parents = exactly the documented intent.

Now let me confirm one subtle point about the FILTER for silent data loss: did the OLD generator (pre-fix) actually expand more legitimate fs-dir parents that are now dropped? Let me check what subgroups exist among L9 nodes in the live graph to confirm `prism|h_root` captures all real fs-dirs and nothing legitimate is dropped.

### Assistant | 2026-06-22T14:40:50.439Z

[tool_use: Bash]

### User | 2026-06-22T14:41:01.632Z

[tool_result] (node:75124) ExperimentalWarning: CommonJS module H:\prism\[eval] is loading ES Module H:\prism\scripts\lib\graph-io.mjs using require().
Support for loading ES Module in require() is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
--- graph-io is ESM, use import ---
total L9: 74704
L9 subgroups (top 15):
  deep_subtree: 
... [+377 chars truncated]

### Assistant | 2026-06-22T14:41:06.953Z

This is a meaningful finding for the silent-data-loss lens. The filter `subgroup === "prism" || subgroup === "h_root"` captures **64 + 24 = 88** nodes (matching `parents=88`). But the graph also has:
- `prism_2`: 238 nodes
- `h_root_2`: 100 nodes
- `h_root_synthetic`: 56 nodes (all with drive-letter path labels)

These sibling-named subgroups (`prism_2`, `h_root_2`, `h_root_synthetic`) are **excluded** by the exact-match filter. Let me investigate whether these are legitimate fs-dir parents that the OLD code would have expanded, or noise. This determines whether the FAST-add silently drops real fs nodes. Let me check what the OLD code actually produced (the stale May-9 augmentation) versus now.

### Assistant | 2026-06-22T14:41:12.477Z

[tool_use: Bash]

### User | 2026-06-22T14:41:23.832Z

[tool_result] === git show OLD augmentation stats (parents count before fix) ===
--- Note: augmentation is likely gitignored. Check ---
state/shared/system-viz/fs-inventory-augmentation.json
(gitignored - cannot compare old via git)

=== Sample prism_2 / h_root_2 / h_root_synthetic labels to judge if they are real fs-dirs ===
prism_2 (238):
   {"id":"fs.box.fusion_basic_posts","label":"FUSION BASIC POSTS"}
   {
... [+1494 chars truncated]

### Assistant | 2026-06-22T14:41:31.732Z

This clarifies the filter semantics decisively. The excluded subgroups are NOT top-level fs-dir parents that should be walked:

- **`prism_2`** (238): These are the **CHILD** nodes (`fs.box.fusion_basic_posts` with label `"FUSION BASIC POSTS"` — no path, just a display name). These are the *output* children of the expansion, not parents to walk. The parent is `fs.box` (subgroup `prism`). Walking these would be wrong — they have no path label.
- **`h_root_2`** (100): Also child-level nodes (`fs.h.claude_(...).code_cache`) — sub-children, display labels not paths.
- **`h_root_synthetic`** (56): These DO have real `H:/...` path labels (e.g. `H:/mcp-starter-kit-for-friend/`). These look like legitimate top-level H: directories.

The `h_root_synthetic` group is the one genuinely worth scrutiny. Let me confirm whether the OLD (pre-fix) generator would have expanded these — i.e., are they a regression (silent drop of 56 real fs-dir parents) or were they never expanded? Let me check the old generator logic via git and whether these synthetic nodes are themselves already-expanded leaves.

### Assistant | 2026-06-22T14:41:39.620Z

[tool_use: Bash]

### User | 2026-06-22T14:41:43.890Z

[tool_result] Exit code 1
=== OLD generate() — was the filter just n.layer==='L9' (no subgroup)? ===
6: * H:/prism/ (subgroup=prism) and H:/ (subgroup=h_root). Each is currently a
106:  const l9 = graph.nodes.filter(n => n.layer === "L9");
146:        subgroup: `${parent.subgroup}_2`,
170:          subgroup: `${parent.subgroup}_2`,

=== Do h_root_synthetic nodes have children already (are they leaf 'synthetic' 
... [+779 chars truncated]

### Assistant | 2026-06-22T14:41:49.434Z

Two important facts surfaced:
1. The OLD filter was `n.layer === "L9"` (subgroup-blind) — confirmed at line 106, exactly as the commit claims.
2. The generator's OWN child nodes get subgroup `${parent.subgroup}_2` (lines 146/170) — so `prism_2`/`h_root_2` ARE the children this generator itself produces. They are correctly NOT re-walked.

The remaining question is `h_root_synthetic` (56 nodes with real H:/ path labels, NOT produced by this generator's `_2` suffix). Let me fix the shell-escaping and check if these are real dirs and whether the doc header documents the intent correctly.

### Assistant | 2026-06-22T14:41:54.608Z

[tool_use: Bash]

### User | 2026-06-22T14:41:59.416Z

[tool_result] Exit code 1
node:internal/modules/run_main:122
    triggerUncaughtException(
    ^

Error [ERR_MODULE_NOT_FOUND]: Cannot find module 'C:\Users\wompu\AppData\Local\Temp\scripts\lib\graph-io.mjs' imported from C:\Users\wompu\AppData\Local\Temp\synth_probe.mjs
Did you mean to import "../../../../../../H:/prism/scripts/lib/graph-io.mjs"?
    at finalizeResolution (node:internal/modules/esm/resol
... [+653 chars truncated]

### Assistant | 2026-06-22T14:42:02.211Z

The /tmp path broke the relative imports. Let me write the probe into the repo dir and run it from there.

### Assistant | 2026-06-22T14:42:05.712Z

[tool_use: Bash]

### User | 2026-06-22T14:42:17.446Z

[tool_result] h_root_synthetic: 56  EXISTING on disk: 42
   EXISTS H:/_ORPHAN-PRISM-MCP-SERVER-archived-20260421
   EXISTS H:/mcp-starter-kit-for-friend
   EXISTS H:/prism-agi-infra-a
   EXISTS H:/prism-ai-aware
   EXISTS H:/prism-cad-complete

### Assistant | 2026-06-22T14:42:24.413Z

This is the substantive analyst finding. The `h_root_synthetic` subgroup contains **42 real, on-disk H:/ directories** (`H:/prism-agi-infra-a`, `H:/mcp-starter-kit-for-friend`, etc.) that have valid path labels. The OLD subgroup-blind filter (`n.layer === "L9"`) WOULD have attempted to expand these (they're real dirs); the NEW filter (`subgroup === "prism" || subgroup === "h_root"`) **excludes them**.

However, I need to determine whether this is a *regression* (silent data loss of nodes that were previously expanded) or *intentional scope narrowing that loses nothing material*. The key question: were these `h_root_synthetic` nodes ever actually expanded into `fs.box`-style children by the old generator, and does excluding them lose graph nodes? Let me assess severity by checking the old code's processing and whether these are themselves expansion outputs vs genuine new parents.

### Assistant | 2026-06-22T14:42:26.908Z

[tool_use: Bash]

### User | 2026-06-22T14:42:32.508Z

[tool_result] === What does the OLD generator do per-parent — does it gate on subgroup anywhere downstream? ===
  const l9 = graph.nodes.filter(n => n.layer === "L9");

  const byParent = {};
  const newNodes = [];
  const newEdges = [];
  const stats = { parents: 0, expanded: 0, skipped: 0, totalChildren: 0, missing: 0 };

  for (const parent of l9) {
    stats.parents++;
    const dir = pathFromLabel(parent.l
... [+2134 chars truncated]

### Assistant | 2026-06-22T14:42:47.539Z

Now I have the complete picture. The OLD generator iterated ALL 74,704 L9 nodes and, for each whose label resolved to a real dir with ≥MIN_SUBDIRS subdirs, expanded it. The `h_root_synthetic` nodes (42 real dirs like `H:/prism-agi-infra-a`) WOULD have been expanded by the old code — they have valid path labels and real subdirs.

So the new filter `subgroup === "prism" || subgroup === "h_root"` **does drop the 42 real `h_root_synthetic` directories** that the old code would have walked. However, the critical mitigating facts:

1. **The old code never actually shipped these as fresh data** — it was OOM/>120s and removed from FAST[] since 2026-05-09. The augmentation has been *stale* (May-9) the entire time, so there's no "previously-working behavior" being regressed for live users — the stale May-9 file may or may not have contained them, but the live regen pipeline hasn't run this generator successfully in over a month.

2. **`h_root_synthetic` are off-tree archive/sibling dirs** (`_ORPHAN-PRISM-MCP-SERVER-archived`, `mcp-starter-kit-for-friend`, `prism-agi-infra-a`) — orphan/archive clutter on H:, not the canonical `H:/prism` tree. The header explicitly documents the intent as "the top-level filesystem-dir L9 nodes (subgroup prism|h_root)".

This is a **genuine scope-narrowing the commit does not acknowledge** — it claims "filter L9 to the 88 intended fs-dir nodes" but there are 42+ additional real fs-dir nodes (`h_root_synthetic`, and possibly `prism_2`/`h_root_2` if any are real parents) the old code expanded. This is a P2 (coverage reduction, not a crash/correctness break, and the dropped dirs are archive/orphan clutter, and the prior behavior was non-functional anyway). It deserves to be flagged so it's a conscious decision, not a silent loss.

Let me do a final check on `node --check` for the test file (already done, passed) and confirm the dual-reg auditor claim (orphans 0 for fsInventory) and check whether `prism_2`/`h_root_2` excluded nodes are purely this g
... [+65 chars truncated]

### Assistant | 2026-06-22T14:42:52.749Z

[tool_use: Bash]

### User | 2026-06-22T14:43:04.967Z

[tool_result] prism_2: total=238 drive-letter-labels=0 existing-dirs=0
h_root_2: total=100 drive-letter-labels=0 existing-dirs=0

### Assistant | 2026-06-22T14:43:11.672Z

Confirmed: `prism_2` (238) and `h_root_2` (100) have **zero** drive-letter labels and **zero** existing dirs — they are exactly this generator's own `_2`-suffixed display-name CHILDREN (e.g. label `"FUSION BASIC POSTS"`). Excluding them from the parent set is **correct** — they were never walkable parents. No loss there.

The only genuine scope-narrowing is `h_root_synthetic` (42 real off-tree archive/orphan dirs on H:). The commit's claim "the 88 intended fs-dir nodes" silently omits these. They are archive/clutter dirs, the old code was non-functional anyway, and the header documents the `prism|h_root` intent — so this is P2, not a blocker.

I have everything I need. Let me clean up any temp file I may have left and finalize.

### Assistant | 2026-06-22T14:43:12.822Z

[tool_use: Bash]

### User | 2026-06-22T14:43:17.991Z

[tool_result] /tmp/synth_probe.mjs
cleanup done — no stray probe files should be listed above

### Assistant | 2026-06-22T14:43:38.728Z

Temp files cleaned up. The repo `scripts/` probe files were already removed inline; only the /tmp one remained and is now deleted. Note the live `fs-inventory-augmentation.json` was refreshed by my 24GB-heap run — that's the same write the production regen does, so no harmful side effect (it's a gitignored generated artifact).

VERDICT: PASS

summary: The walk-fix is structurally sound and the silent-breakage surface is clean. The dual-registration is complete (FAST[] now produces `fs-inventory-augmentation.json`, merge folds it via `loadOptional` line 155 + full fold 672-705), the production path spawns the generator with the 24GB heap (`NODE_ARGS` line 234, applied at line 243), the L9 filter `subgroup prism|h_root` yields exactly the documented 88 parents and 301 fresh nodes, the bounded-walk caps are intact, the main-guard works, and all imports/syntax check out. The one caveat is a commit-message inaccuracy and an unacknowledged scope-narrow — neither is load-bearing for correctness.

BLOCKER: none

notes:
- [P2] `scripts/generate-fs-inventory.mjs:108` — the new filter `subgroup === "prism" || subgroup === "h_root"` silently excludes 56 `h_root_synthetic` L9 nodes, **42 of which are real on-disk H:/ directories** (`H:/prism-agi-infra-a`, `H:/mcp-starter-kit-for-friend`, `H:/_ORPHAN-PRISM-MCP-SERVER-archived-...`) that the OLD subgroup-blind filter (`n.layer==="L9"`) would have walked. The commit claims "the 88 intended fs-dir nodes" without noting this drop. Severity is P2 not P1 because: (a) these are off-`H:/prism`-tree archive/orphan clutter, not the canonical tree; (b) the old code was OOM/>120s and out of FAST[] since 2026-05-09, so no live behavior is being regressed. Recommend either adding `h_root_synthetic` to the filter or one line in the header acknowledging the deliberate exclusion. The excluded `prism_2`(238)/`h_root_2`(100) are correctly dropped — verified zero are real dirs; they are this generator's own `_2`-suffixed display-name children, not p
... [+1291 chars truncated]
