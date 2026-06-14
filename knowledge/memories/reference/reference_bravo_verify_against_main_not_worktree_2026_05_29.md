---
name: reference_bravo_verify_against_main_not_worktree_2026_05_29
description: "Verify assets against the canonical MAIN tree (H:/prism), not the stale slot worktree, before flagging an engine/hook as missing or hallucinated. A stale worktree checkout nearly caused deletion of a correct 9-engine table."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.036Z
aliases: reference_bravo_verify_against_main_not_worktree_2026_05_29
---


2026-05-29 (slot:bravo, GALAXY-KIT-MS0 dogfood, /loop 1-3): backfilled bravo's own `hermes-zulu` galaxy from `FAIL(2)` → `PASS (16/16)` — the **2nd fully-populated exemplar** after `post-processor`. Commit `0ce8340275` on `slot/bravo` (2 files: `mcp-server/src/engines/hermes-zulu/MEMORY.md` `## Initial state` birth-snapshot + `knowledge/wiki/index.md` 3 real wiki entries cataloged → wiki hits 0→8).

**The near-miss / lesson:** while writing the honest Initial-state snapshot I searched the **slot/bravo worktree** for the 9 `Hermes*/Zulu*` engines that `CLAUDE.md` cites as "verified" — found **none**, and almost concluded the engine table was asset-hallucination (bravo's own #1 policed sin) and rewrote it. Before deleting, I checked the **canonical MAIN tree** (`H:/prism/mcp-server/src/engines/`) — **all 9 exist**, wired via `sessionDispatcher.ts` + `SoulAwareFanoutExtenderEngine`, with `__tests__/HermesParallelFanoutPlannerEngine.test.ts`. The table was 100% accurate. The worktree is simply a **stale checkout** (branched off `slot/bravo` before those engines landed on main).

**Rule (R8 read-before-write + anti-hallucination duty):** a slot worktree drifts from main in BOTH directions — it can LACK assets main has (engines/hooks built after the branch point) AND CARRY content main lacks (this galaxy's populated docs were committed to slot/bravo but never merged up; main still has the 4.3K alpha scaffold). So before flagging any cited engine/script/hook as "missing" or "hallucinated," `find`/`ls` it under **`H:/prism/mcp-server/src`** (canonical), not just the worktree. The galaxy-verify divergence proves it: `PRISM_REPO=H:/prism-slot-bravo` → PASS, default `H:/prism` → FAIL(4).

**Golf follow-up (chat-bus):** slot/bravo→main is a **superset** merge — main needs the populated galaxy docs (worktree side), worktree needs the engines (main side). Naive merge in either direction reverts one. Keep the larger doc, keep the engines.

Related: [[reference_galaxy_kit_ms0_shipped_2026_05_29]] · [[reference_galaxy_canonical_kit_2026_05_29]] · [[feedback_bravo_verify_cited_paths_before_enshrining]] · [[feedback_bravo_complete_not_clobber_galaxy]] · [[reference_slot_worktree_command_gap_2026_05_29]].
