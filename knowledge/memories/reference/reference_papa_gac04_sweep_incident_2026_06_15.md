---
name: reference_papa_gac04_sweep_incident_2026_06_15
description: "INCIDENT (2026-06-15, slot:papa commit 7389585b5f): papa's U-WIRE-SLOTSESSION git-add SWEPT sierra's uncommitted GAC04 dual_channel_dispatch wiring (sessionDispatcher+sessionActionSchemas hunks) because the keyword-grep diff-verify gave a false-clean. The swept case imports an UNTRACKED DualChannelContextEngine.ts -> latent dangling dynamic import in shared HEAD. ROOT FIX: git status --porcelain <file> BEFORE editing a shared file; if already ' M' a peer owns uncommitted work -> never git-add the whole file."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.722Z
aliases: reference_papa_gac04_sweep_incident_2026_06_15
---


# git-add-sweep incident: papa swept sierra's GAC04 wiring (2026-06-15)

A concrete recurrence of [[reference_git_add_sweeps_pretracked_changes_2026_06_08]] — logged so the fix sticks.

## What happened
Wiring U-WIRE-SLOTSESSION (slot:papa, 8th of the v2 run), I edited `sessionDispatcher.ts` +
`sessionActionSchemas.ts` and committed with `git add <those files>`. Both files were **already `M`**
in the shared tree — sierra had uncommitted `GRAPH-AS-LLM-CONTEXT-MS0/U-GAC04` work there
(`dual_channel_dispatch` action: 1 ACTIONS entry @185, 1 schema @786, 1 case @2011). My `git add`
swept all three hunks into papa commit `7389585b5f`.

## Why the diff-verify guard failed
I "verified only-my-hunks" with a **keyword grep**: `git diff <file> | grep '^+' | grep -viE "<my keywords>"`.
The filter included GENERIC terms (`passthrough`, `describe`, `ok(`, `success: true`, `z.(object|enum|number)`)
that ALSO matched sierra's GAC04 lines -> false "0 non-mine". Keyword-grep is unreliable for sweep detection.

## Damage (bounded — no work lost)
- Sierra's GAC04 wiring is LIVE + functional in HEAD `7389585b5f` (just misattributed to papa's commit).
- The swept case does `await import("../../engines/DualChannelContextEngine.js")` and that engine is **UNTRACKED**
  (sierra's uncommitted WIP) -> my commit has a **latent dangling dynamic import**: the current working tree
  builds (file on disk; tsc 638 unchanged, dynamic import not hard-checked), but a FRESH clone would fail when
  `dual_channel_dispatch` runs, until sierra commits the engine.
- NOT remediated by history-rewrite: sierra's hunks exist ONLY in `7389585b5f`; a `reset --hard` would lose them
  (never stashed). Committing sierra's untested engine myself would violate no-stub. -> chose: leave commit +
  chat-bus alert sierra to commit `DualChannelContextEngine.ts` + GAC04 test ASAP (resolves the dangling ref;
  do NOT re-add the dispatcher/schema hunks). Posted to `state/shared/AGENT_CHAT.jsonl`.

## ROOT FIX (durable — adopt fleet-wide for shared-tree edits)
1. **`git status --porcelain <file>` BEFORE editing any shared dispatcher/schema file.** If it is already `' M'`
   (or `M `), a PEER has uncommitted work in it -> do NOT `git add <file>` (you will sweep their hunks).
2. If a peer owns the file: commit to YOUR slot worktree instead, OR wait for them to commit, OR (last resort)
   isolate your hunks via a patch. NEVER `git add <peer-dirty-shared-file>`.
3. The post-edit diff-verify must be **hunk-line-range based, not keyword-based**: `git diff <file> | grep '^@@'`
   and confirm EVERY hunk's `@@ -<line>` falls at YOUR known insertion points. An unexpected hunk location =
   a peer change = STOP. (Keyword greps false-negate.)

Related: [[reference_git_add_sweeps_pretracked_changes_2026_06_08]] · [[reference_papa_wire_unwired_v2_7wire_2026_06_15]] · [[feedback_papa_cross_galaxy_work_commit_to_their_worktrees]]. Sierra's GAC04 series: GAC01 (graphContextLens), GAC02 (GraphRAG), GAC03 (CodeGraphProjection) all committed; GAC04 (DualChannelContext) was the in-flight WIP swept.
