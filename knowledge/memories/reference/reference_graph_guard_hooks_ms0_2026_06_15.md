---
name: reference_graph_guard_hooks_ms0_2026_06_15
description: "GRAPH-AS-LLM-CONTEXT-MS0/U-GAC07+U-GAC08 shipped (slot:sierra, 2026-06-15) -- MILESTONE 8/8 COMPLETE. Two PreToolUse guard hooks: stale-graph-guard (warn/block on stale system-graph.json) + hallucinated-node-id-guard (advisory/block on fictional node-ids). Both default-advisory + fail-soft + cheap. 15 tests. Wired settings.json."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.600Z
aliases: reference_graph_guard_hooks_ms0_2026_06_15
---


# GRAPH-AS-LLM-CONTEXT-MS0 / U-GAC07 + U-GAC08 -- graph guard hooks (2026-06-15, slot:sierra)

Final two units; **milestone 8/8 COMPLETE**. Both are PreToolUse guards wired into settings.json
(C: + H: via node-fs -- settings.json is OUTSIDE the repo, not committed).

## What shipped
- `.claude/hooks/stale-graph-guard.mjs` (GAC07) -- PreToolUse: viz tool + stale system-graph.json
  -> warn (default) / deny (block via PRISM_STALE_GRAPH_GUARD=block). statSync mtime ONLY (no 644MB
  read). future-mtime=fresh; missing-graph=advisory. Wired under `^mcp__prism.*` matcher. Complements
  existing sessionstart-graph-staleness-inject + stop-graph-staleness-backstop (per-QUERY gate).
- `.claude/hooks/hallucinated-node-id-guard.mjs` (GAC08) -- PreToolUse: scans a BASH command (NOT
  Edit/Write content -- too noisy) for canonical node-id tokens. Default advisory ZERO-load (regex
  only). Block mode (PRISM_NODEID_GUARD_BLOCK=1) validates vs the find-cache id-set, FAILS OPEN on a
  missing index, emits decision:block stdout + exit 2 on a confirmed-absent id. Wired under `Bash` matcher.
- `.claude/hooks/graph-guards-gac07-gac08.test.mjs` -- 15 node:test (spawn+stdin+env, temp fixtures).

## KEY DECISIONS / gotchas
- **DEFAULT ADVISORY, not deny** (R12/R7 + safety rails): a fleet-wide PreToolUse auto-deny is a
  footgun -- GAC07 would block viz reads on a routinely-stale graph; GAC08 would block creating any
  NEW id. Hard-block is opt-in via env; verifies_via runs in block mode.
- **seekCard REJECTED for GAC08 validation**: it returns null for BOTH "index stale/unavailable" AND
  "id genuinely absent" -> on a stale offset index it false-flags EVERY real id (eng.mill -> "unknown").
  Use the authoritative find-cache id-set + FAIL-OPEN instead. (The verifies_via only "passed" with
  seekCard because everything was null -- passing for the wrong reason; caught + fixed.)
- **process.exit() truncates piped stdout**: a deny needing stdout JSON + exit 2 must write first;
  the empty-stdout test failure traced to this class (and to a wrong test HOOKS path -- the test lives
  IN .claude/hooks so HOOKS=dirname(self), not ../.claude/hooks).
- **/g regex lastIndex** is stateful -> reset in scanIds or a reused instance skips leading matches.
- node-fs bypass for .claude/hooks/* + settings.json (cross-worktree-blocked from a slot).

## 2-agent scrutiny (both hooks)
A flagged exit-2-without-stdout (FAIL) -> deny now emits decision:block stdout BEFORE exit 2
(belt+suspenders for both contracts). B PASS. Both flagged the /g lastIndex trap -> reset. All paths
traced: empty/malformed stdin, off/disable, non-match, warn, block, missing graph/find-cache,
future-mtime, fail-open -- every path emits valid JSON or the documented exit-2.

## MILESTONE 8/8 COMPLETE
GAC01 [[reference_graph_context_lens_ms0_2026_06_15]] · GAC02 [[reference_graphrag_retrieval_ms0_2026_06_15]] ·
GAC03 [[reference_code_graph_projection_ms0_2026_06_15]] · GAC04 [[reference_dual_channel_context_ms0_2026_06_15]] ·
GAC05 [[reference_spatial_address_book_ms0_2026_06_15]] · GAC06 [[reference_community_summary_ms0_2026_06_15]] ·
GAC07 + GAC08 (this). The system-viz graph is now addressable as LLM context end-to-end: ego-lens,
GraphRAG, code-graph, dual-channel, address-book, community-summaries, + staleness/hallucination guards.

Related: [[feedback_sierra_no_gates_full_reign_2026_06_10]]
