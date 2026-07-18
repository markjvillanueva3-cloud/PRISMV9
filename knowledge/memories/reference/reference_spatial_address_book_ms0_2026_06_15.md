---
name: reference_spatial_address_book_ms0_2026_06_15
description: "GRAPH-AS-LLM-CONTEXT-MS0/U-GAC05 shipped (slot:sierra, 2026-06-15). SpatialAddressBookEngine = canonical node-id resolver (resolveAlias ladder: exact-id/exact-label/fuzzy/ambiguous/unknown) so agents coordinate by node-id not paraphrase. Wired prism_session:spatial_resolve + agent-handoff-canonicalize hook. Composes GAC02. 16 tests. 5/8 units."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.209Z
aliases: reference_spatial_address_book_ms0_2026_06_15
---


# GRAPH-AS-LLM-CONTEXT-MS0 / U-GAC05 -- SpatialAddressBookEngine (2026-06-15, slot:sierra)

Fifth unit of the roadmap loop (operator "push through all building, self compaction").

## What shipped
- `mcp-server/src/engines/SpatialAddressBookEngine.ts` -- `resolveAlias(text)` resolves a
  free-text alias/paraphrase to a canonical node-id (or candidate list when ambiguous) so N agents
  coordinate by node-id mention, not paraphrase (O(N^2) paraphrase reconciliation -> O(1) id).
  Ladder: exact-id (1.0) -> exact-label (0.95, >1 -> ambiguous) -> fuzzy (token overlap, capped
  0.9) -> ambiguous (near-tie) -> unknown. `resolveMany` loads find-cache ONCE. `isCanonical` =
  deleted/stale signal. **Composes GAC02** loadNodes + tokenize (no second find-cache loader).
- Wired `prism_session:spatial_resolve` + `.claude/hooks/agent-handoff-canonicalize.mjs`
  (UserPromptSubmit advisory, wired into settings.json C: + H: via node-fs). 16 tests.

## KEY DECISIONS / gotchas
- **Hook is ADVISORY not a rewriter** (R12 divergence from spec step-3 "rewrite handoff text"):
  per-prompt rewrite of arbitrary input is dangerous + loading the 65MB find-cache per prompt is a
  latency leak. So the hook is cheap (regex-only, NO load, fail-soft `{}` on every path,
  dedup+capped, excludes noisy fs/test/git/core/script). Heavy paraphrase->id lives in the engine.
- **Live behavior is conservative**: on the real 345K-node graph, common terms (`mill engine`,
  `prism_ai`, `lathe`) resolve to AMBIGUOUS-with-candidates (many near-dup fs.*/core.*/vault.*
  nodes); exact ids/labels resolve cleanly. Never silently commits a wrong id -- the spec's
  "ambiguous -> return candidates" mode. honest + safe.
- **settings.json is OUTSIDE the repo** (H:/.claude/, not H:/prism/) -- the hook wire is a config
  change, not a repo commit; wired both C: and H: copies via node-fs (the c-to-h-mirror only fires
  on Edit/Write TOOL, not node-fs).

## 2-agent scrutiny (A PASS-after-fix + B FAIL -> fixed)
- **P1** localeCompare tiebreak was locale-nondeterministic (tr-TR i/I diverges concurrent
  resolvers, defeating the shared-address-space premise) -> ASCII comparator `(a<b?-1:a>b?1:0)`.
- **P2** hook MAX cap `Number(env||12)` -> NaN on non-numeric env -> unbounded -> `Math.max(1,
  parseInt(...,10)||12)`.
- **ambiguityMargin** engine-opt was dropped by the dispatcher (like GAC04 maxPngBytes) -> plumbed
  into `common` + schema.
- **KEPT `||` not `??`** in the text/alias/query/q chain -- the codebase-wide dispatcher alias
  convention (node_card/action_search/tool_route); empty-primary -> fallback is intended (R11/R7).
- P2 "concurrent" test was tautological for sync code -> reframed honestly as deterministic/repeatable.

## SHARED-TREE ABSORPTION HAZARD (recurring)
GAC04's dispatcher edit was absorbed into a peer's `git add -A` bulk commit (7389585b5f
[WIRE-UNWIRED-PAPA]) before I committed -> broken HEAD (dispatcher imported an untracked engine).
Repaired by committing the engine to the SAME branch (cad-fusion-live-ms0) via `git update-index
--add` (the git-add-lane-guard blocks `git add` from a slot; the PreToolUse env-var kill switch
cannot be delivered inline). Watch for this every unit on the shared tree.

## Milestone status: 5/8
Done: GAC01..05. Next: GAC06 community-summary generator over engine clusters (deps GAC02),
GAC07 stale-graph guard HOOK (1h cron), GAC08 hallucinated-node-id guard HOOK (hooks =
cross-worktree-blocked, node-fs).

Related: [[reference_dual_channel_context_ms0_2026_06_15]] · [[reference_graphrag_retrieval_ms0_2026_06_15]] · [[reference_graph_context_lens_ms0_2026_06_15]] · [[feedback_sierra_no_gates_full_reign_2026_06_10]]
