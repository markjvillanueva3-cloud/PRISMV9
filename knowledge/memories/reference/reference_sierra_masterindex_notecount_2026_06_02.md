---
name: reference_sierra_masterindex_notecount_2026_06_02
description: "SHIPPED 2026-06-02 (commit 1b1325b38c): searchGraphHits in master-index-search-lib.mjs now attaches an additive noteCount (full wiki+memory edge count) to every hit — brain-coverage parity with the find-cache, available to ALL search-first consumers. Consumer-surfacing of (N docs) DEFERRED (logical order: substrate first)."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.938Z
aliases: reference_sierra_masterindex_notecount_2026_06_02
---


# sierra: noteCount on the master-index search substrate — SHIPPED 2026-06-02

> **U-SV-MASTERINDEX-NOTECOUNT, commit `1b1325b38c` (slot:sierra, cad-fusion-live-ms0).**
> The SECOND brain-coverage substrate (after the find-cache one — [[reference_sierra_notecount_bridge_plan_2026_06_02]]).
> `searchGraphHits` (`scripts/lib/master-index-search-lib.mjs`) now attaches an
> **additive `noteCount`** to every returned hit = `wikiEntries.length + memoryEntries.length`
> (FULL totals, NOT the truncated `wiki`(slice 3)/`memory`(slice 2) display arrays).

## Why this is the right substrate
`master-index-search-lib.mjs` is the shared keyword-search lib behind the ENTIRE search-first surface:
the 4 `pre-{bash,grep,read,write}-graph-inject.mjs` hooks + the subagent per-task pre-search
(`spawned-agent-context-lib.mjs`) + `master-index-precheck-inject.mjs`. Putting `noteCount` on its
hits makes structural brain-coverage available to ALL of them at once — context-retention routing
(prefer documented nodes) across every search surface, not just Glob/Grep (which the find-cache
bridge already covers via viz-first-redirect).

## Contract nuances (verified by 2 reviewers)
- **Same arithmetic** as the find-cache `projectForFind` noteCount (`scripts/lib/system-viz-graph.mjs`),
  but the **presence contract differs**: this in-memory hit ALWAYS emits the field (incl. 0); the sparse
  find-cache OMITS it when 0 (sidecar-bloat avoidance). Both are correct for their context. (Reviewer-B P2:
  the original comment overclaimed "the two substrates agree" — corrected to "same arithmetic, presence differs".)
- **Additive / zero-risk**: every consumer reads NAMED fields (`h.label/h.id/h.wiki/h.memory/h.layer/h.status`);
  none do `Object.keys`/`JSON.stringify(hit)`/deepEqual/fixed-shape-spread, and the pre-graph dedup hashes
  the RENDERED string, not the hit object. An unknown extra field is inert.
- Test (`master-index-search-lib.test.mjs`): a **deterministic inline-graph** case (hand-built `inverted`
  Map, label-substring scoring) proves `noteCount=6` while `wiki.length=3 + memory.length=2 = 5` → the
  field is the FULL count, not the truncated arrays. Fails on revert. 53/53 green. (Lesson: the fixture's
  `["engine"]`/`["unrelated"]` tokens are NOT in the inverted index — STOPWORD / no camelCase split; the
  existing `respects topK` test passes trivially on `[]`. Don't assert against unverified tokens — use an
  inline graph you control. R12/R9.)

## NEXT (logical order — substrate done, surfacing next)
Surface ` (N docs)` in the 4 pre-*-graph-inject hooks' `renderInject` (read `h.noteCount`, append when >0,
gated legend) — mirrors the find-path `formatInjection` pattern from [[reference_sierra_notecount_bridge_plan_2026_06_02]].
NOTE: those hooks are `.claude/hooks/*.mjs` = **cross-worktree HARD-blocked harness-exec** from a slot
worktree CWD — needs the Write-temp + Bash `cp` placement dance (see the bridge-plan memory's mechanism
note) + per-hook scrutiny. Defer to a fresh-budget fire; ~4 hot hooks → do incrementally, not all at once.
