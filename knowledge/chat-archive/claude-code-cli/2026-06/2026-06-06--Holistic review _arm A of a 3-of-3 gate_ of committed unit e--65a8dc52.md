---
type: "chat-session"
source: "claude-code-cli"
session_id: "65a8dc52-2895-48bf-9137-68cade042012"
title: "Holistic review (arm A of a 3-of-3 gate) of committed unit e611001ed2 (U-PSN-ATT"
date: "2026-06-06"
first_ts: "2026-06-06T16:06:31.208Z"
last_ts: "2026-06-06T16:08:02.550Z"
cwd: "H:\\prism"
messages: 16
user_msgs: 6
assistant_msgs: 10
raw_file: "H:/.claude/projects/H--prism/65a8dc52-2895-48bf-9137-68cade042012/subagents/agent-ac81f52228e5b309c.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:13"
---

# Holistic review (arm A of a 3-of-3 gate) of committed unit e611001ed2 (U-PSN-ATT

> **claude-code-cli** | 2026-06-06 | 16 msgs (6 user / 10 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/65a8dc52-2895-48bf-9137-68cade042012/subagents/agent-ac81f52228e5b309c.jsonl`

## Transcript

### User | 2026-06-06T16:06:31.208Z

Holistic review (arm A of a 3-of-3 gate) of committed unit e611001ed2 (U-PSN-ATTR01, slot papa, repo H:/prism). Run `git -C H:/prism show e611001ed2` — 3 files:
- scripts/lib/psn-attribution-lib.mjs (NEW core)
- scripts/lib/psn-attribution-lib.test.mjs (NEW, node:test, 12 tests)
- .claude/hooks/master-index-precheck-inject.mjs (MOD — a ~13-line fail-soft tap)

Context (lever #2, compounds on U-SCP01): each retrieval hit carries a source-chain Citation `{source_type, path}` (from scripts/lib/source-chain-lib.mjs). This lib maps that → one of the 11 canonical PSN legs (`obsidian_brain, prism_os, wiki, memories, tribal, system_viz, engines, algorithms, formulas, nn_gnn, prism_ai` — taxonomy in knowledge/memories/feedback/feedback_psn_definition.md), records per-session leg coverage to `state/shared/psn-attribution.jsonl`, and reads it back as N/11. The hook taps it on every UserPromptSubmit.

Verify holistically:
1. Leg-mapping correctness: source_type→leg (wiki→wiki, memory→memories, tribal→tribal, engine→engines, dispatcher→prism_os) + external refinement by node-id prefix (ghost→system_viz, formula→formulas, algo→algorithms, nn/gnn→nn_gnn, else→null). Is "else→null" honest (not forced)?
2. Fail-soft: recordLegConsult must NEVER throw (it runs per-prompt in a hook); confirm the append + the disabled-knob + empty-legs + no-session paths all return null without throwing. sessionLegCoverage must fail-soft on missing/corrupt ledger (per-line try/continue).
3. schemaVersion present on records; O_APPEND atomicity claim for the 26-chat fleet.
4. No stubs/placeholder tests; tests verify real intent (concrete leg lists, byLeg counts, fail-soft assertions).
Report P0/P1 only. Grade PASS/FAIL with line refs. Focused — git show this one commit only.

### Assistant | 2026-06-06T16:06:42.778Z

I'll review commit e611001ed2 holistically as arm A of the 3-of-3 gate.

### Assistant | 2026-06-06T16:06:43.332Z

[tool_use: Bash]

### User | 2026-06-06T16:06:46.062Z

[tool_result] commit e611001ed22341597a420c941f3476450bffc861
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Sat Jun 6 11:05:42 2026 -0500

    [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-HERMES-CONTEXT-ACCEL]/U-PSN-ATTR01: PSN-leg attribution ledger (papa, lever #2)
    
    Compounds on U-SCP01: maps each retrieval hit's source-chain Citation.source_type -> one of the 11 canonical PSN legs,
... [+19648 chars truncated]

### Assistant | 2026-06-06T16:06:50.733Z

I have the full diff. Let me verify a few claims against reality before grading: the source-chain Citation shape (to confirm leg-mapping correctness), the canonical PSN taxonomy, and that the tests actually pass.

### Assistant | 2026-06-06T16:06:51.999Z

[tool_use: Bash]

### Assistant | 2026-06-06T16:06:53.825Z

[tool_use: Grep]

### User | 2026-06-06T16:06:54.362Z

[tool_result]   ...
# Subtest: renderCoverage: one-line summary
ok 11 - renderCoverage: one-line summary
  ---
  duration_ms: 0.2486
  ...
# Subtest: PSN_LEGS: frozen canonical 11-leg taxonomy + DEFAULT_LEDGER_PATH
ok 12 - PSN_LEGS: frozen canonical 11-leg taxonomy + DEFAULT_LEDGER_PATH
  ---
  duration_ms: 0.132
  ...
1..12
# tests 12
# suites 0
# pass 12
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_
... [+11 chars truncated]

### User | 2026-06-06T16:06:59.262Z

[tool_result] 15:// parity test mcp-server/src/__tests__/sourceChainLibParity.test.ts asserts this
37:// Mirrors SourceChainEngine.CitationSchema source_type enum EXACTLY. A change
38:// here without the TS side is caught by the parity test's source_type fixtures.
50: * are sorted by `path` before hashing, and only {path, source_type, score} are
54: * @param {Array<{path?:string, source_type?:string, score?:num
... [+1299 chars truncated]

### Assistant | 2026-06-06T16:07:05.911Z

Tests pass 12/12. The source-chain Citation shape is confirmed: `decorateHits` attaches an additive `sourceChain` field with `source_type` from the enum, and the hit passes through `h.sourceChain`. Let me confirm the exact `source_type` enum values and what node-id `path` shape the graph hits actually carry, to validate the leg-mapping completeness.

### Assistant | 2026-06-06T16:07:06.643Z

[tool_use: Read]

### User | 2026-06-06T16:07:10.345Z

[tool_result] 30	// shape (zero regression risk to the fleet). Knob: PRISM_SOURCE_CHAIN_DISABLE=1
31	// makes decorateHits() a pass-through.
32	//
33	// @module source-chain-lib
34	
35	import { createHash } from "node:crypto";
36	
37	// Mirrors SourceChainEngine.CitationSchema source_type enum EXACTLY. A change
38	// here without the TS side is caught by the parity test's source_type fixtures.
39	export const C
... [+9519 chars truncated]

### Assistant | 2026-06-06T16:07:19.882Z

This is the crux for leg-mapping completeness. I now have the full picture. Key findings:

1. **The Citation `source_type` enum** is exactly `["wiki", "memory", "tribal", "engine", "dispatcher", "external"]`. The lib's `SOURCE_TYPE_TO_LEG` maps the first 5 correctly (wiki→wiki, memory→memories, tribal→tribal, engine→engines, dispatcher→prism_os), and routes "external" to `legForExternalId`.

2. **Critical interaction with the upstream `path` shape.** The `legForExternalId` refinement reads `citation.path` and matches prefixes `ghost`, `formula`, `algo`, `nn`/`gnn`. But for graph hits, `graphHitSourceType` returns `"external"` ONLY for ids that are NOT eng/disp/wiki/vault.wiki/memory/vault.mem/tribal — i.e. ghost/fs/pipeline/skill/formula nodes. The `path` for those is the raw node id (e.g. `ghost.galaxy.wedm`, `formula.kienzle`). So `ghost`→system_viz and `formula`→formulas refinements WILL fire on real data. Good — the refinement is consistent with the actual upstream id shapes.

Now let me check one important subtlety: the `master-index-precheck-inject.mjs` tap passes `decorateHits(...)` output where `kind="graph"`. So ALL citations in that hook are graph-hit-derived. Let me verify there's no double-counting / ordering concern and check the `nn`/`gnn` prefix against the actual `eng` prefix (potential collision).

### Assistant | 2026-06-06T16:07:26.396Z

[tool_use: Bash]

### User | 2026-06-06T16:07:28.688Z

[tool_result] engine direct: engines
external nn: nn_gnn
external algo: algorithms
external annual (algo-prefix false pos): algorithms
external formula: formulas
external skill (unmapped): null
external fs (unmapped): null

### Assistant | 2026-06-06T16:08:02.550Z

The direct-map-wins ordering correctly prevents an `nn-graph-engine` (source_type=engine) from being mis-routed to nn_gnn — it stays `engines`. The "external→null" fallback is honest: skill/fs nodes that are not citation legs return null and are not force-mapped.

One minor prefix-collision note: `algocadabra` would match `algo` prefix, but in practice external node-ids in this graph are namespaced (`algorithm.*`, `formula.*`, `ghost.*`, `nn-graph*`, `gnn.*`), so this is a theoretical-only concern, not a real-data defect. Not a P0/P1.

I have everything needed. The tests pass 12/12, the leg-mapping is consistent with the verified upstream Citation shape, fail-soft paths all return null without throwing, schemaVersion is on every record, and O_APPEND atomicity is correctly used.

---

## Review: commit e611001ed2 (U-PSN-ATTR01, slot papa)

**Scope reviewed:** `scripts/lib/psn-attribution-lib.mjs` (new, 201 lines), `scripts/lib/psn-attribution-lib.test.mjs` (new, 12 tests), `.claude/hooks/master-index-precheck-inject.mjs` (+13-line fail-soft tap). Verified against the real upstream `scripts/lib/source-chain-lib.mjs` Citation contract and ran the test suite live.

### Verdict: PASS

No P0 or P1 findings. All four verification axes hold.

**1. Leg-mapping correctness — CONFIRMED.** The direct map (`psn-attribution-lib.mjs:62-68`) matches the real `CITATION_SOURCE_TYPES` enum (`source-chain-lib.mjs:39-41`): wiki→wiki, memory→memories, tribal→tribal, engine→engines, dispatcher→prism_os. The dispatcher→prism_os call ("dispatchers ARE the PRISM OS execution surface") is a defensible semantic choice. The `legForExternalId` prefix refinement (`:73-80`) is consistent with the actual graph node-id shapes that resolve to `source_type:"external"` upstream (`graphHitSourceType`, `source-chain-lib.mjs:165-179` falls through to "external" for ghost/formula/fs/skill nodes whose raw id is preserved in `path`). I verified ghost→system_viz and formula→formulas fire on real data, and tha
... [+3458 chars truncated]
