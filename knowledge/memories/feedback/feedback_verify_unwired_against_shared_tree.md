---
name: feedback_verify_unwired_against_shared_tree
description: "ROMEO WIRING discipline (slot:romeo 2026-06-16): a slot worktree can be THOUSANDS of commits behind cad-fusion-live-ms0, so the ROMEO-WIRING-QUEUE.md + any slot-worktree grep for 'is this engine unwired' is UNRELIABLE -- the fleet (papa/november/etc.) wires engines via [MAIN-FORCE] to the shared tree that the slot worktree can't see. ALWAYS verify 'unwired' against cad-fusion-live-ms0 (git grep <branch> + git log --all --grep) BEFORE wiring, or the wire is a duplicate + cross-dispatcher action-name collision."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.451Z
aliases: feedback_verify_unwired_against_shared_tree
---


**RULE — verify "unwired" against the SHARED tree (cad-fusion-live-ms0), never the slot worktree alone.**

**Why:** the slot/romeo worktree was **3,617 commits behind** cad-fusion-live-ms0 (2026-06-16). The fleet wires engines aggressively via `[MAIN-FORCE]` commits to the shared integration tree; a stale slot worktree's files do NOT contain those wires. So:
- `state/shared/ROMEO-WIRING-QUEUE.md` (generated from a 2026-05-07 name-heuristic audit) was **~78% stale** -- of its 9 "wireable" candidates, 7 were ALREADY wired fleet-wide (WetRunRetention->safety, SyncCode->cam, Creo/CATIA->cad, DesignToFloor->dev, Acquisition->dev, WetRunChangeFreeze->safety).
- A deterministic `grep` of the SLOT WORKTREE's dispatchers returned "unwired" for engines that were in fact wired on the shared tree.

**What it cost (this session, caught + reverted):** I wired AcquisitionRecommendationEngine -> prism_business (commit a24709f079, full test + 2-reviewer PASS) believing it unwired. It was ALREADY wired to prism_dev by papa (`6194a764c8`) AND november (`7375e22b43`) with the SAME action names (acquisition_recommend/best/stats/distributor) -> a cross-dispatcher action-name COLLISION (the measure_summary class). Reverted (`60098ae84c`). Also nearly shipped WetRunChangeFreezeEngine -> prism_business; the `[[reference_post_ship_wire-unwired-papa-u-wire-wetfreeze]]` memory-recall caught it already wired to prism_safety (`d9bdfb0079`) -> reverted before commit.

**How to apply (BEFORE any romeo wire):**
1. `git grep -lE "<Engine>|<engineSingleton>" cad-fusion-live-ms0 -- 'mcp-server/src/tools/dispatchers/*.ts'` -> any hit = ALREADY WIRED, skip.
2. `git log --oneline --all --grep="<Engine>|U-WIRE-<...>"` -> any wire commit = skip.
3. Only if BOTH are empty is the engine genuinely unwired fleet-wide.
4. Even then: wiring in a 3617-behind worktree targets a stale dispatcher -> the wire will conflict/not-fit when slot/romeo merges. **Sync slot/romeo with cad-fusion-live-ms0 FIRST** (or wire directly on the shared tree with `[MAIN-FORCE]` like papa/november do), THEN wire.

**Corollary -- the queue's HOME heuristic is also wrong:** the 2026-05-07 audit guessed SyncCodeVerification->prism_dev; the fleet actually wired it to camDispatcher. Don't trust the queue's suggested dispatcher either; the engine's real domain dictates the home.

**Net state:** romeo's clean-wire queue is effectively EXHAUSTED on the shared tree -- the fleet wired all the easy singletons. The 2 genuinely-unwired remainders (NXOpenAssemblyDrawingEngine = constructor-args + CAD/delta domain; PlaywrightAutomationEngine = singleton but browser-dependent) are both refusable per romeo's soul (cross-domain / throws-on-every-call). Next romeo work needs a FRESH audit run against the synced/shared tree, not the stale queue. Sibling: [[reference_romeo_oneshot_mine_2026_06_16]] (same verify-before-headline lesson, different surface). Pairs with [[feedback_each_slot_merges_own_galaxy]].
