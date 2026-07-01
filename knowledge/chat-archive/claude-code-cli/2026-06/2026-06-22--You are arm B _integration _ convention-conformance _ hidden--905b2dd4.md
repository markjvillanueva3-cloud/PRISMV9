---
type: "chat-session"
source: "claude-code-cli"
session_id: "905b2dd4-3c0c-4201-92ed-f8a0effe134a"
title: "You are arm B (integration / convention-conformance / hidden-coupling / leak-dis"
date: "2026-06-22"
first_ts: "2026-06-22T00:02:15.433Z"
last_ts: "2026-06-22T00:03:28.055Z"
cwd: "H:\\prism"
messages: 22
user_msgs: 9
assistant_msgs: 13
raw_file: "H:/.claude/projects/H--prism/905b2dd4-3c0c-4201-92ed-f8a0effe134a/subagents/agent-a16882b8f0e1deb46.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:17"
---

# You are arm B (integration / convention-conformance / hidden-coupling / leak-dis

> **claude-code-cli** | 2026-06-22 | 22 msgs (9 user / 13 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/905b2dd4-3c0c-4201-92ed-f8a0effe134a/subagents/agent-a16882b8f0e1deb46.jsonl`

## Transcript

### User | 2026-06-22T00:02:15.433Z

You are arm B (integration / convention-conformance / hidden-coupling / leak-discipline) of PRISM's per-file scrutiny gate. Read-only. Grade PASS or FAIL with P0/P1/P2 findings + file:line citations. Do NOT assume the other reviewer caught everything.

CONTEXT: slot:india GNN tier-5 feature. Adds an OPT-IN DEFAULT-OFF dense node feature (engine "action-surface" = the dispatcher action names an engine backs) to the embedding pipeline, to lift the GNN's 1/7-class separability. Reviewed in isolation already as REAL-but-MODEST (action-surface separates 6/18 dispatcher classes vs the name's 5/18). This unit WIRES it into build-node-embeddings, default-OFF.

Review ONLY the uncommitted changes in:
- H:/prism/scripts/build-node-embeddings.mjs
- H:/prism/scripts/build-node-embeddings.test.mjs
Diff: `git -C H:/prism --no-pager diff -- scripts/build-node-embeddings.mjs scripts/build-node-embeddings.test.mjs`

Also skim the helper it imports to confirm the contract: H:/prism/scripts/lib/engine-action-surface.mjs (exports buildActionSurfaceMap, actionSurfaceText; actionSurfaceText returns "" for an engine with no backing action).

VERIFY (cite file:line, PASS/FAIL per item):
1. INTEGRATION: the new glue lives in the `sourceSignalById` builder which is gated `if (args.ghostsOnly && GHOST_SOURCE)`. Confirm `buildActionSurfaceMap(DISPATCHERS_DIR)` is built ONCE (not per-node), and DISPATCHERS_DIR points at mcp-server/src/tools/dispatchers (the dir engine-action-surface parses).
2. CONVENTION: the new flag/const/helper match the file's existing style (the sibling GHOST_SOURCE / GHOST_SHARP flags, engineSourceSignal helper, the `[kind,label,info,sig]` ghostEmbedText join). The append uses an "actions: " tag — confirm it doesn't collide with existing markers and survives ghostEmbedText's 1600-char join cap sensibly.
3. NO ORPHAN / R15: is the feature reachable end-to-end? It's wired into build-node-embeddings --ghosts-only, which the wired-ref embedder (measure-codebase-wired-refpool
... [+1028 chars truncated]

### Assistant | 2026-06-22T00:02:18.471Z

I'll review the uncommitted changes systematically. Let me start by reading the diff and the relevant files.

### Assistant | 2026-06-22T00:02:19.917Z

[tool_use: Bash]

### Assistant | 2026-06-22T00:02:20.878Z

[tool_use: Read]

### User | 2026-06-22T00:02:22.858Z

[tool_result] diff --git a/scripts/build-node-embeddings.mjs b/scripts/build-node-embeddings.mjs
index f91d975061..1419c6ec75 100644
--- a/scripts/build-node-embeddings.mjs
+++ b/scripts/build-node-embeddings.mjs
@@ -49,6 +49,7 @@ import crypto from "node:crypto";
 import { fileURLToPath } from "node:url";
 import { readGraphStreaming } from "./lib/graph-io.mjs";
 import { nicifySelf } from "./lib/batch-self-ni
... [+10154 chars truncated]

### User | 2026-06-22T00:02:23.731Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\engine-action-surface.mjs' was already read 11s ago in this session and is unchanged (mtime 1782081176939). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-22T00:02:26.250Z

The helper read was cached but I need its content. Let me read it and the surrounding context of the main file.

### Assistant | 2026-06-22T00:02:27.181Z

[tool_use: Bash]

### Assistant | 2026-06-22T00:02:28.063Z

[tool_use: Read]

### User | 2026-06-22T00:02:29.268Z

[tool_result] 460	  const graphPath = args.graph || GRAPH_PATH;
461	  const outPath = args.out || OUT_PATH;
462	  const partialPath = `${outPath}.partial`;
463	
464	  if (!fs.existsSync(graphPath)) {
465	    process.stderr.write(`graph missing: ${graphPath}${args.graph ? "" : " — run regen-graph-normalized.mjs first"}\n`);
466	    process.exit(2);
467	  }
468	  // Streaming read — bypasses V8 ~512MB string-leng
... [+8218 chars truncated]

### User | 2026-06-22T00:02:31.068Z

[tool_result] #!/usr/bin/env node
/**
 * engine-action-surface.mjs -- per-engine dispatcher ACTION-SURFACE extractor.
 * (AI-SYSTEMS-GNN, slot:india 2026-06-21.)
 *
 * WHY: the GNN tier-5's 768-d nomic TEXT embeddings separate only 1/7 dispatcher
 * classes (meanMargin 0.0263; only prism_turning clears the bar) -- an engine's
 * DESCRIPTION text is near-non-discriminative for which dispatcher it belongs to
 * (
... [+7530 chars truncated]

### Assistant | 2026-06-22T00:02:34.572Z

Now let me look at the SHARP IDF corpus path to verify the GHOST_SHARP composition (item 6) and confirm how `sourceSignalById` is consumed downstream, plus check the args parsing for `ghostsOnly` and confirm the wired-ref embedder spawns this.

### Assistant | 2026-06-22T00:02:36.403Z

[tool_use: Grep]

### Assistant | 2026-06-22T00:02:37.137Z

[tool_use: Read]

### User | 2026-06-22T00:02:37.739Z

[tool_result] 17: *   2. Embed ONLY those new ghosts to a TEMP file (build-node-embeddings --graph <temp-ghosts>
18: *      --ghosts-only --out <temp>), source-enriched exactly as the deployed embeddings are.
63:const BUILD_EMB = path.join(ROOT, "scripts", "build-node-embeddings.mjs");
210:      console.log(`  embedding ${ghosts.length} new ghosts via build-node-embeddings --ghosts-only (nomic, local)...`);
212
... [+389 chars truncated]

### User | 2026-06-22T00:02:38.208Z

[tool_result] 120	  // Strip the leaking "…proposed wiring: <dispatcher> (confidence …, reason: …)"
121	  // clause entirely (covers prism_* AND the UNKNOWN sentinel) — everything from
122	  // "proposed wiring:" to end-of-string is the keyword-rule's answer + rationale.
123	  info = info.replace(/proposed wiring:[^]*$/i, "").replace(/Unwired engine\s*[—-]?\s*$/i, "").trim();
124	  const sig = typeof sourceSign
... [+5387 chars truncated]

### Assistant | 2026-06-22T00:02:42.152Z

I have what I need to verify all six items. Let me confirm the args parsing for `ghostsOnly` and that the test file imports resolve, then finalize.

### Assistant | 2026-06-22T00:02:44.473Z

[tool_use: Bash]

### Assistant | 2026-06-22T00:02:45.152Z

[tool_use: Bash]

### User | 2026-06-22T00:02:49.415Z

[tool_result] <--- Last few GCs --->

[61004:00000203CC151000]     1671 ms: Scavenge 332.0 (358.4) -> 329.1 (364.1) MB, pooled: 0 MB, 2.72 / 0.00 ms  (average mu = 0.740, current mu = 0.725) allocation failure; 
[61004:00000203CC151000]     1913 ms: Mark-Compact 470.9 (505.8) -> 463.4 (501.9) MB, pooled: 1 MB, 206.93 / 0.00 ms  (+ 0.1 ms in 0 steps since start of marking, biggest step 0.0 ms, walltime since 
... [+821 chars truncated]

### User | 2026-06-22T00:02:52.289Z

[tool_result]     # Subtest: adversarial 2: whitespace/newline-laden surface is normalized to single spaces
    ok 6 - adversarial 2: whitespace/newline-laden surface is normalized to single spaces
      ---
      duration_ms: 0.0291
      ...
    # Subtest: respects the maxChars cap (action tail cannot crowd out the source prose unboundedly)
    ok 7 - respects the maxChars cap (action tail cannot crowd out th
... [+266 chars truncated]

### Assistant | 2026-06-22T00:03:28.055Z

The first command (a one-off dynamic import to introspect exports) OOM'd because importing the module top-level triggers heavy module-load side effects, but that is irrelevant noise. The actual test run is authoritative: **53 tests pass, 0 fail, 0 skipped**, with the `appendActionSurface` suite (suite 15) showing all 7 subtests passing. Exports resolve correctly since the tests import and exercise them.

I have everything needed to grade all six items.

---

VERDICT: PASS

summary: The action-surface lever is wired correctly into `build-node-embeddings.mjs` `--ghosts-only` mode, default-OFF (`PRISM_NNG_GHOST_ACTION_SURFACE=1` to enable), with the map built once and `appendActionSurface`'s empty-surface identity contract holding (verified against the helper). The 7 new tests are real reference-value assertions covering happy + 3 failure + 2 adversarial + a cap test (53/53 pass, 0 skip). No orphans, no convention drift, no hidden coupling with SHARP; the diff genuinely does not retrain, flip the deployed default, or touch the 542MB graph.

findings:
  - [PASS] item 1 INTEGRATION -- `build-node-embeddings.mjs:494` builds `surfaceMap` ONCE outside the `for (const n of nodes)` loop, gated by both `args.ghostsOnly && GHOST_SOURCE` (line 488) and `GHOST_ACTION_SURFACE` (the ternary at 494 yields `null` when off, so `buildActionSurfaceMap` is never even called). `DISPATCHERS_DIR` (line 85) = `mcp-server/src/tools/dispatchers`, exactly the dir `buildActionSurfaceMap` reads via `readdirSync` filtering `.ts` (helper `buildActionSurfaceMap`). Per-node it only calls `actionSurfaceText` (a Map lookup) at line 503 -- O(1), no re-parse. Correct.
  - [PASS] item 2 CONVENTION -- `GHOST_ACTION_SURFACE` (line 91) mirrors the sibling `GHOST_SHARP` env-flag idiom (`=== "1"`, default-off) exactly; `DISPATCHERS_DIR` mirrors `ENGINES_DIR`; `appendActionSurface` mirrors `engineSourceSignal`'s pure-export + `{ maxChars }` opts shape + defensive `prism_*` strip. The `actions: ` tag does not co
... [+3932 chars truncated]
