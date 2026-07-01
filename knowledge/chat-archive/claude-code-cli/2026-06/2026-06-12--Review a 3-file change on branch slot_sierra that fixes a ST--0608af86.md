---
type: "chat-session"
source: "claude-code-cli"
session_id: "0608af86-d78e-46a9-9265-45445ecb3f23"
title: "Review a 3-file change on branch slot/sierra that fixes a STALE-REFRESH bug in P"
date: "2026-06-12"
first_ts: "2026-06-12T15:09:45.263Z"
last_ts: "2026-06-12T15:11:57.418Z"
cwd: "H:\\prism-slot-sierra"
messages: 27
user_msgs: 10
assistant_msgs: 17
raw_file: "H:/.claude/projects/H--prism-slot-sierra/0608af86-d78e-46a9-9265-45445ecb3f23/subagents/agent-a36aec16cfbb1c233.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:10"
---

# Review a 3-file change on branch slot/sierra that fixes a STALE-REFRESH bug in P

> **claude-code-cli** | 2026-06-12 | 27 msgs (10 user / 17 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/0608af86-d78e-46a9-9265-45445ecb3f23/subagents/agent-a36aec16cfbb1c233.jsonl`

## Transcript

### User | 2026-06-12T15:09:45.263Z

Review a 3-file change on branch slot/sierra that fixes a STALE-REFRESH bug in PRISM's system-viz per-slot heat map. The risky part is a node DELETE inside the canonical graph regen pipeline. Read each file fully + the surrounding merge context.

Files (under H:/prism-slot-sierra/):
1. scripts/generate-slot-touch-augmentation.mjs — REMOVED line `if (existingIds.has(slotId)) continue;` (the emit-once skip that froze the 7d window). Kept `if (seenSlotIds.has(slotId)) continue;` (intra-batch dedup). The generator emits `slot.activity.<slot>` nodes + `touched-fs` edges to real `fs.deep.*` nodes (resolved against existingIds; null = skipped).
2. scripts/generate-slot-touch-augmentation.test.mjs — flipped the old "idempotent/skipped" test to assert RE-EMISSION (slotsEmitted=1 + fresh edge) when the node pre-exists. 32 tests pass.
3. scripts/merge-augmentations.mjs — THE SENSITIVE CHANGE. Inserted a refresh-drop block immediately BEFORE `const [slotTouchN, slotTouchE] = mergeIndexedAugmentation(slotTouchAug, "slotTouch");`. The block: when slotTouchAug has newNodes, it `G.nodes = G.nodes.filter(...)` dropping every `slot.activity.*` node AND `byId.delete(n.id)` for each, then `G.edges = G.edges.filter(...)` dropping every edge whose from/to (or source/target) startsWith "slot.activity.". Then the existing mergeIndexedAugmentation re-adds the fresh augmentation.

Critical context:
- merge-augmentations.mjs is the ONE canonical writer of system-graph.json (700MB+). A corruption here degrades fleet-wide search.
- `byId` is a module-level `const byId = new Map()` (line ~89); mergeIndexedAugmentation dedups via `if (byId.has(node.id)) continue;` and addNodeIndexed re-populates byId. So the re-add of fresh slot.activity nodes works ONLY if byId no longer has those ids (the block deletes them — verify this is correct + complete).
- The goal: slot.activity is a 7d SLIDING window; mergeIndexedAugmentation is ADD-only, so stale nodes/edges must be dropped before re-splice or the win
... [+1113 chars truncated]

### Assistant | 2026-06-12T15:09:49.050Z

I'll start by reading all three files fully, then examine the surrounding merge context to verify the byId/edge invariants.

### Assistant | 2026-06-12T15:09:50.110Z

[tool_use: Read]

### Assistant | 2026-06-12T15:09:50.462Z

[tool_use: Read]

### Assistant | 2026-06-12T15:09:50.937Z

[tool_use: Read]

### User | 2026-06-12T15:09:53.641Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-1022 of 2889 total (60033 tokens, cap 25000). Call Read with offset=1023 limit=1022 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	#!/usr/bin/env node
2	/**
3	 * merge-augmentations.mjs — fold per-augmentation JSONs back into system-
... [+54071 chars truncated]

### User | 2026-06-12T15:09:53.667Z

[tool_result] 1	// generate-slot-touch-augmentation.test.mjs
2	// Run: node --test H:/prism/scripts/generate-slot-touch-augmentation.test.mjs
3	//
4	// Real-value assertions only. No git, no fs reads of the 405 MB live graph.
5	// Covers slugify / normalizeRel / resolveFsNodeId pure helpers + generate()
6	// against fixture graphs + fixture slotCommits.
7	//
8	// ≥3 failure modes (graph-missing, slot-commits-mi
... [+15892 chars truncated]

### User | 2026-06-12T15:09:53.672Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * generate-slot-touch-augmentation.mjs — system-viz augmentation: per-slot
4	 * 7-day FILE ACTIVITY heat map.
5	 *
6	 * SYSTEM-VIZ-HIGH-ROI-MS0 — G6 (post fleet-expansion to 26).
7	 *
8	 * Sister to scripts/generate-slot-synergy-features.mjs (which maps slots to
9	 * SUBSYSTEMS as a static doctrine view). G6 covers the complementary dynamic
10	 * signal: which filesy
... [+15994 chars truncated]

### Assistant | 2026-06-12T15:09:57.151Z

I have the two generator files fully. Now I need the critical part of merge-augmentations.mjs: the refresh-drop block and the slotTouch merge call. Let me find them and read the surrounding context, plus the `mergeIndexedAugmentation` helper definition.

### Assistant | 2026-06-12T15:09:58.651Z

[tool_use: Grep]

### User | 2026-06-12T15:10:02.259Z

[tool_result] 193:const slotTouchAug    = loadOptional("slot-touch-augmentation.json");
295:if (slotTouchAug)    versions.slotTouch       = slotTouchAug.generatedAt    ?? "present";
2708:function mergeIndexedAugmentation(aug, name) {
2730:const [hookNodes,    hookEdges]    = mergeIndexedAugmentation(hooksAtomic,    "hooksAtomic");
2731:const [testNodes,    testEdges]    = mergeIndexedAugmentation(testsAtomic,  
... [+2580 chars truncated]

### Assistant | 2026-06-12T15:10:05.632Z

Now let me read the refresh-drop block in full detail, plus the `mergeIndexedAugmentation` helper definition to verify the byId desync claims.

### Assistant | 2026-06-12T15:10:06.263Z

[tool_use: Read]

### User | 2026-06-12T15:10:08.496Z

[tool_result] 2700	  G.meta.actionsAtomic = {
2701	    generatedAt: actionsAtomic.generatedAt,
2702	    stats: actionsAtomic.stats,
2703	  };
2704	}
2705	
2706	// Generic indexed-merge helper for the 4th-wave generators. All emit
2707	// {newNodes, newEdges} so the merge logic is identical.
2708	function mergeIndexedAugmentation(aug, name) {
2709	  if (!aug?.newNodes) return [0, 0];
2710	  let nodeCount = 0, ed
... [+4257 chars truncated]

### Assistant | 2026-06-12T15:10:14.192Z

I have the core change. Now I need to verify a few critical things about the merge ordering. The drop block is at line 2745, and `slotTouch` is merged at line 2771. But the slot.activity nodes/edges are emitted by the *generator* — I need to check whether any merge block BEFORE line 2745 (the obsidian/awareness/staleness per-node loops, or molecules, etc.) processes slot.activity nodes, and whether `byIdMulti` desyncs. Let me also check `byIdMulti` handling and whether anything references slot.activity AFTER line 2771.

Key concern: the drop deletes from `byId` but NOT from `byIdMulti`. Let me check whether `byIdMulti` is consulted for slot.activity ids anywhere, and check the final write + canonicalize/backfill steps.

### Assistant | 2026-06-12T15:10:15.879Z

[tool_use: Grep]

### User | 2026-06-12T15:10:17.848Z

[tool_result] 30:// writeGraphStreaming stringify with "Reached heap limit Allocation failed".
51:import { readGraphStreaming, writeGraphStreaming } from "./lib/graph-io.mjs";
52:import { canonicalizeGraphEdgeTargets } from "./lib/viz-engine-node-id-canon.mjs";
53:import { applyTypeBackfill } from "./lib/system-viz-type-backfill.mjs";
67:// >512MB files should migrate to readGraphStreaming/writeGraphStreaming f
... [+765 chars truncated]

### Assistant | 2026-06-12T15:10:23.802Z

`byIdMulti` is consulted only at lines 678 and 718 (engineDomain + knowledgeInv parent lookups, keyed by L5/L8 parent ids, never slot.activity ids), so the byIdMulti desync from the drop block is harmless. Let me verify the two remaining concerns: (1) whether any pre-line-2745 block stamps slot.activity nodes (it would be re-emitted fresh anyway, so harmless, but I want to confirm no edges survive), and (2) the canonicalize + backfill tail at 2847-2879 to confirm no slot.activity re-reference after the re-splice.

### Assistant | 2026-06-12T15:10:24.828Z

[tool_use: Read]

### User | 2026-06-12T15:10:26.875Z

[tool_result] 2840	// separate rewriting script would be a 2nd writer). Both remaps are gated so they
2841	// are strictly dead→live: engine.<X>→eng.<domain>.<name> only when X matches a live
2842	// eng.* node (graph-alias); dispatcher.<X>→disp.<file-id> only when the resolved
2843	// disp.* node EXISTS. Unmatched targets stay honest dead pixels (R12). Reverts with
2844	// PRISM_VIZ_ENGINE_CANON_DISABLE=1.
284
... [+5937 chars truncated]

### Assistant | 2026-06-12T15:10:34.080Z

Now let me verify the most subtle concern: whether the `slotTouch` re-splice (line 2771) runs BEFORE the edge-dedup `existingEdges` set could be polluted, and critically — whether `canonicalizeGraphEdgeTargets` could touch slot.activity edges. The drop happens at 2745, re-splice at 2771, then canon/backfill at 2847/2865. But I want to confirm the generator emits the roost node `ghost.slot_activity` only if absent — and whether the drop block touches `ghost.slot_activity` (it should NOT, since that's `ghost.` not `slot.activity.`). Let me also check the `node-card` offset sidecar concern and whether anything between 2745 and 2771 references slot edges. Let me look at what `mergeEdgesOnly` / canon does and confirm ordering is the only consumer. Let me check the canon lib briefly for the startsWith filter on edges.

### Assistant | 2026-06-12T15:10:34.601Z

[tool_use: Read]

### User | 2026-06-12T15:10:37.079Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * viz-engine-node-id-canon.mjs — canonicalize `engine.<ClassName>` edge targets
4	 * to the merged-graph engine node id `eng.<domain>.<name>` at assembly time.
5	 *
6	 * BACKGROUND (the second G4 dead-edge class, sierra):
7	 * Several producers emit graph edges to `engine.<ClassName>` (PascalCase) — the
8	 * scheme minted by `engine-node-extractor.mjs` (NN-GRAPH-MS0)
... [+2814 chars truncated]

### Assistant | 2026-06-12T15:10:46.378Z

This confirms `canonicalizeGraphEdgeTargets` only rewrites `engine.*`/`dispatcher.*` prefixed endpoints, never `slot.activity.*` or `fs.deep.*` — so the re-spliced fresh edges are untouched by canon. The backfill is an in-memory node-type walk (fail-soft).

I now have full confidence on every concern raised. Let me do a final verification of the one remaining subtle point: the comment claims "16 stale nodes, 3,880 touches" — and the drop block deletes from `byId` but the re-splice via `mergeIndexedAugmentation` checks `byId.has(node.id)`. I've confirmed the drop deletes every `slot.activity.*` from `byId` (line 2749), so re-add at 2712-2713 succeeds. Let me confirm there's no path where the generator emits a slot.activity id that the drop block's `startsWith` wouldn't catch (e.g. a node whose id is exactly `slot.activity` with no trailing segment, or `ghost.slot_activity`).

The generator emits ids of the form `slot.activity.${slot}` (line 213) — all start with `slot.activity.` (with the trailing dot). The roost is `ghost.slot_activity` (underscore, different prefix) — correctly NOT dropped, and re-created only if absent. Consistent.

Let me run the test suite to confirm the claim "32 tests pass" and that nothing regressed.

### Assistant | 2026-06-12T15:10:47.306Z

[tool_use: Bash]

### User | 2026-06-12T15:11:18.398Z

[tool_result]   ...
# Subtest: generate: augmentation envelope has merge-augmentations contract shape
ok 31 - generate: augmentation envelope has merge-augmentations contract shape
  ---
  duration_ms: 0.0649
  ...
# Subtest: generate: intensity is clamped to [0.05, 0.5]
ok 32 - generate: intensity is clamped to [0.05, 0.5]
  ---
  duration_ms: 15.3535
  ...
1..32
# tests 32
# suites 0
# pass 32
# fail 0
# canc
... [+50 chars truncated]

### Assistant | 2026-06-12T15:11:57.418Z

32/32 pass, confirmed. Now let me address the one genuinely subtle correctness concern I want to nail down: the **edge-dedup interaction between the drop and the re-splice**. 

When `mergeIndexedAugmentation(slotTouchAug, "slotTouch")` runs at 2771, it builds `existingEdges` by scanning ALL `G.edges` (line 2718). Since the drop at 2758 already removed all `slot.activity.*` edges, the fresh edges won't be deduped against stale ones — good. But I should verify there's no OTHER block between the obsidian per-node loops and line 2745 that could have ALREADY merged a copy of the current slotTouchAug edges into G.edges (which would then be deduped away as "existing"). The slotTouchAug is only consumed at 2771. Confirmed by the grep (only refs at 193, 295, 2745, 2771).

One last check — could a stale slot.activity edge survive because it uses a shape the drop filter misses? The drop filter checks `e.from ?? e.source` and `e.to ?? e.target` (line 2760-2761), covering both edge shapes. The generator emits `{from, to}` (line 249-250). Covered.

Let me write up the findings.

I have read all three files end-to-end plus the load-bearing merge context (the `mergeIndexedAugmentation` helper at 2708, the `byId`/`byIdMulti`/`addNodeIndexed` index machinery at 89-101, the two `byIdMulti` consumers at 678/718, the canonicalize lib, and the write tail at 2847-2879). Here is my verdict.

## Review: STALE-REFRESH fix for slot.activity 7d window (slot/sierra)

### Concern-by-concern verification (all PASS)

**byId desync (the headline risk) — CORRECT.** The drop block (`merge-augmentations.mjs:2747-2754`) calls `byId.delete(n.id)` for every node it filters out, so after the drop no `slot.activity.*` id remains in `byId`. The re-splice at 2771 → `mergeIndexedAugmentation` → `if (byId.has(node.id)) continue;` (2712) therefore does NOT short-circuit, and `addNodeIndexed` (2713) re-adds the fresh node + re-populates `byId`. The delete is complete (covers every `slot.activity.*` node via `sta
... [+5122 chars truncated]
