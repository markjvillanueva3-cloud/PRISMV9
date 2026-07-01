---
type: "chat-session"
source: "claude-code-cli"
session_id: "0608af86-d78e-46a9-9265-45445ecb3f23"
title: "Review a 3-file change on branch slot/sierra that wires a DORMANT node-type back"
date: "2026-06-12"
first_ts: "2026-06-12T14:23:54.774Z"
last_ts: "2026-06-12T14:25:02.394Z"
cwd: "H:\\prism-slot-sierra"
messages: 19
user_msgs: 7
assistant_msgs: 12
raw_file: "H:/.claude/projects/H--prism-slot-sierra/0608af86-d78e-46a9-9265-45445ecb3f23/subagents/agent-aab72eb43b04f4d0d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:10"
---

# Review a 3-file change on branch slot/sierra that wires a DORMANT node-type back

> **claude-code-cli** | 2026-06-12 | 19 msgs (7 user / 12 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/0608af86-d78e-46a9-9265-45445ecb3f23/subagents/agent-aab72eb43b04f4d0d.jsonl`

## Transcript

### User | 2026-06-12T14:23:54.774Z

Review a 3-file change on branch slot/sierra that wires a DORMANT node-type backfill into PRISM's system-viz graph regen pipeline. Focus on SILENT FAILURES and fleet-pipeline-breakage risk. Read the whole of each file.

Files (all under H:/prism-slot-sierra/):
1. scripts/lib/system-viz-type-backfill.mjs — added 9 entries to PREFIX_TO_TYPE (ms-envelope, scriptlib, tribal-tip, college, training-source, extracted, pdf-extract, pdf-coverage, memory_galaxies). The lib's applyTypeBackfill(graph,{onUnknown}) already existed (modes: throw|allow|skip).
2. scripts/lib/system-viz-type-backfill.test.mjs — added 2 tests for the new prefixes.
3. scripts/merge-augmentations.mjs — THE WIRING. Added `import { applyTypeBackfill }` after the canonicalizeGraphEdgeTargets import, and a block right after `G.meta.augmentationVersions = versions;` (before `G.schemaVersion = "2.29.0";`) that calls `applyTypeBackfill(G, { onUnknown: "skip" })`, stamps G.meta.typeBackfill, logs a summary, guarded by `if (process.env.PRISM_VIZ_TYPE_BACKFILL_DISABLE !== "1")`.

Context that matters:
- merge-augmentations.mjs is the ONE canonical writer of the 700MB+ system-graph.json. A throw here breaks fleet-wide graph regen (every slot's master-index/awareness search degrades).
- V8 has a ~512MiB max-string-length cap. Post-merge stages that did JSON.stringify(G) have broken regen before (the graph hit 660MB). applyTypeBackfill iterates G.nodes in-memory and does NOT stringify — claimed cap-safe.
- The block runs at the graph's LARGEST point (after all merges, ~711MB / 336K nodes).
- "skip" mode: unknown id-prefix → node left untyped + counted in report.unknownPrefixes; NEVER throws.
- Live-validated: on 336,405 real node ids, 0%→99.9% typed, 246 left untyped, no errors.

Specifically hunt for:
- Any path where applyTypeBackfill could THROW in the mandatory pass (breaking regen) despite onUnknown:"skip".
- Whether mutating node.type on 336K nodes could corrupt anything downstream (it's additive; lib skips al
... [+370 chars truncated]

### Assistant | 2026-06-12T14:23:58.745Z

I'll review this 3-file change. Let me read all three files in full, plus verify the lib's internal contract (inferType + applyTypeBackfill).

### Assistant | 2026-06-12T14:23:59.705Z

[tool_use: Read]

### Assistant | 2026-06-12T14:23:59.796Z

[tool_use: Read]

### User | 2026-06-12T14:24:03.439Z

[tool_result] 1	// SYSTEM-VIZ-HIGH-ROI-AUDIT-2026-05-20 G1: pure node-type backfill from id-prefix.
2	// R12 fail-loud on unknown prefix unless opts.onUnknown is "allow" or "skip".
3	
4	export const PREFIX_TO_TYPE = Object.freeze({
5	  fs: "filesystem_leaf",
6	  wiki: "wiki_entry",
7	  datacat: "data_catalog_entry",
8	  vault: "vault_entry",
9	  disp: "dispatcher_router",
10	  ghost: "ghost",
11	  formula: "for
... [+8365 chars truncated]

### User | 2026-06-12T14:24:03.678Z

[tool_result] 1	// Tests for scripts/lib/system-viz-type-backfill.mjs
2	
3	import { test } from "node:test";
4	import assert from "node:assert/strict";
5	import {
6	  PREFIX_TO_TYPE,
7	  inferType,
8	  applyTypeBackfill,
9	  countTypeCoverage,
10	} from "./system-viz-type-backfill.mjs";
11	
12	// -------- PREFIX_TO_TYPE table ----------------------------------------------
13	
14	test("PREFIX_TO_TYPE: frozen + n
... [+11133 chars truncated]

### Assistant | 2026-06-12T14:24:05.702Z

Now the critical file — the wiring. Let me read merge-augmentations.mjs in full.

### Assistant | 2026-06-12T14:24:06.485Z

[tool_use: Read]

### User | 2026-06-12T14:24:11.165Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-1022 of 2853 total (59267 tokens, cap 25000). Call Read with offset=1023 limit=1022 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	#!/usr/bin/env node
2	/**
3	 * merge-augmentations.mjs — fold per-augmentation JSONs back into system-
... [+54071 chars truncated]

### Assistant | 2026-06-12T14:24:16.230Z

The file is 2853 lines. I need to find the actual wiring block (after `G.meta.augmentationVersions = versions;` and before `G.schemaVersion = "2.29.0";`). Let me grep for those anchors and the new code.

### Assistant | 2026-06-12T14:24:17.949Z

[tool_use: Grep]

### User | 2026-06-12T14:24:19.070Z

[tool_result] 14: *   - Top-level meta gains: .augmentationVersions = { obsidian, awareness, novelty, businessValue }
30:// writeGraphStreaming stringify with "Reached heap limit Allocation failed".
51:import { readGraphStreaming, writeGraphStreaming } from "./lib/graph-io.mjs";
52:import { canonicalizeGraphEdgeTargets } from "./lib/viz-engine-node-id-canon.mjs";
53:import { applyTypeBackfill } from "./lib/syst
... [+1041 chars truncated]

### Assistant | 2026-06-12T14:24:22.019Z

Now let me read the exact wiring block and surrounding context (the edgeCanon block before it, and the write path after).

### Assistant | 2026-06-12T14:24:22.588Z

[tool_use: Read]

### User | 2026-06-12T14:24:24.328Z

[tool_result] 2795	  G.meta.ghostSummary = { ghostNodes, ghostEdges };
2796	}
2797	
2798	// U-VIZ-G4-DEAD-EDGE (2026-05-30 sierra): canonicalize mis-prefixed edge targets
2799	// in the assembled graph. The merged graph is CUMULATIVE (merge reads the
2800	// persistent system-graph.json + adds, never removes stale-target edges), so a
2801	// producer-side fix only affects NEW edges — the ~2.7K `dispatcher.prism
... [+6524 chars truncated]

### Assistant | 2026-06-12T14:24:31.445Z

I have read every relevant path end-to-end: the lib (`inferType` + `applyTypeBackfill` lines 100-200), the test file, and the wiring block (lines 2815-2843) plus the write path. Let me verify the one remaining claim that matters for cap-safety and throw-safety: that `writeGraphStreaming` does not `JSON.stringify(G)` whole, and that nothing in the added path serializes the graph. Let me also confirm there is no other writer/serializer downstream.

### Assistant | 2026-06-12T14:24:31.514Z

[tool_use: Read]

### User | 2026-06-12T14:24:32.878Z

[tool_result] 1	/**
2	 * scripts/lib/graph-io.mjs — streaming read+write for `system-graph.json`
3	 *
4	 * Bypasses V8's ~512MB max-string-length ceiling that crashes legacy
5	 * `JSON.parse(fs.readFileSync(p, "utf8"))` (read) and `JSON.stringify(G)`
6	 * (write) calls once the graph passes ~512MB serialized.
7	 *
8	 * Discovered: papa /loop 2026-05-23, U-PSN-VIZ-REGEN, on the 541MB graph.
9	 * Memory: `referen
... [+6349 chars truncated]

### Assistant | 2026-06-12T14:25:02.394Z

I now have everything needed. I've read all three changed files end-to-end plus both dependencies the wiring relies on (`graph-io.mjs` write path, and the lib's `inferType`/`applyTypeBackfill`). Here is my assessment focused on silent failures and fleet-pipeline-breakage.

## Verification performed

**Throw-safety in the mandatory pass** — Traced every throw site in `applyTypeBackfill` (`system-viz-type-backfill.mjs`):
- L147-151 (invalid `onUnknown`): the call site passes a hardcoded literal `{ onUnknown: "skip" }` (merge-augmentations.mjs:2829) — always in the allowlist, cannot throw.
- L152-154 (`graph.nodes[]` required): `G` came from `readGraphStreaming`, and the script has already iterated `G.nodes` dozens of times upstream (e.g. L91, L318). If `G.nodes` were missing the script would have crashed long before line 2829, so this guard cannot newly break regen here.
- L183-187 (unknown → throw): unreachable under `onUnknown:"skip"` — the `if (onUnknown === "throw")` branch is gated out. Unknown prefixes fall through to L189-197 (count + skip), never throw.
- `inferType` (L100-116) is pure, has no throw site, and defensively handles non-object/`no-id`/empty-prefix/leading-dot. Confirmed by the leading-dot test (test L98-101) and non-object test (L91-96). **No throw path reachable in this pass.**

**Mutation safety on 336K nodes** — `applyTypeBackfill` only ever does `node.type = inf.type` for `status==="mapped"` (L176). The `already-typed` branch (`inferType` L104-106, requires `typeof node.type === "string" && length > 0`) returns before any write, so existing types are never overwritten — additive-only claim verified. `skip` branch does not touch the node at all (L194-197). Idempotency is covered by test L127-134.

**Cap-safety** — The added block (2828-2838) does zero serialization: `applyTypeBackfill` is an in-memory walk; `G.meta.typeBackfill` stores only scalars + an 8-entry `unknownTop` array; the `console.log` interpolates only counts and the ≤8 truncated 
... [+2732 chars truncated]
