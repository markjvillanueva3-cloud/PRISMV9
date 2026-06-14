---
name: reference-psn-shop-wire-misattribution-2026-05-22
description: PSN-SYNERGY/U-SHOP-WIRE — 8 dormant Shop engines wired (50% to 100%) but ABSORBED into peer commit c469efd4bc due to shared-tree index-saturation
aliases: reference_psn_shop_wire_misattribution_2026_05_22
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.900Z
---


# PSN-SYNERGY / U-SHOP-WIRE — 8 Shop engines wired + peer-absorption misattribution

**Shipped:** 2026-05-22 slot oscar (claude-c5942427), `/checkin-oscar /loop next batch` continuation of the PSN-SYNERGY run from `reference_psn_outcome_wire_2026_05_22`.

**Misattribution:** the 4-file change-set ended up absorbed into peer commit `c469efd4bc [MAIN] [SF-PSN-WIRE-MS0]/U-SFPSN-05-CLOSE (slot:juliett)` instead of landing under `[MAIN] [PSN-SYNERGY]/U-SHOP-WIRE (slot:oscar)`. The work is correct + tracked, attribution is wrong. Same hazard class as [[reference_git_index_saturation_camx11_2026_05_18]] and [[reference_h8_misattribution_2026_05_20]].

## What shipped

`prism_shop` MCP dispatcher — 53 actions across 8 previously-dormant Shop-domain engines (Shop domain went 50% → 100% wired per AWARENESS-SNAPSHOT):

| Engine | Singleton type | Action count |
|--------|----------------|--------------|
| ShopDataCompletenessEngine | instance | 3 |
| ShopFloorCostEngine | static class | 7 |
| ShopFloorDashboardEngine | static class | 5 |
| ShopFloorJobEngine | static class | 7 |
| ShopFloorQuoteEngine | static class | 5 |
| ShopFloorScheduleEngine | static class | 7 |
| ShopMachineOverlayEngine | instance | 12 |
| ShopStateEngine | instance (async) | 17 |

Files in tree (verified via `git ls-files`):
- `mcp-server/src/tools/dispatchers/shopDispatcher.ts` (35.7K)
- `mcp-server/src/schemas/shopActionSchemas.ts` (16.9K)
- `mcp-server/src/__tests__/shopDispatcher.test.ts` (26.5K, 60 tests, 60/60 passing)
- `mcp-server/src/index.ts` (+6 lines — `registerShopDispatcher` adjacent to `registerOutcomeDispatcher`)

Domain status post-ship per AWARENESS-SNAPSHOT projection:
- Outcome: 0% → 100% (commit `0fd90359de`)
- Shop: 50% → 100% (absorbed in `c469efd4bc`)

## How the misattribution happened

1. Wrote 4 files + ran `git add` on them. Got `7 files changed, 2088 insertions(+), 11 deletions(-)` back (peer churn caused some additional files to fall into the staged set).
2. `git commit` failed repeatedly with `Unable to create H:/prism/.git/index.lock: File exists` — heavy fleet activity (12 peers online, 4 foreign claims) meant another git process held the lock for several seconds at a time.
3. Tried a `rm -f` retry loop in Bash. The PowerShell variant of the loop failed because `git` isn't on the PS PATH on this machine (only on Bash PATH).
4. Eventually `git status` reported "nothing to commit, working tree clean" — meaning a peer's `git commit -a` (or wide pathspec) had swept up my staged files between my retries. The peer was `juliett` shipping `[SF-PSN-WIRE-MS0]/U-SFPSN-05-CLOSE` — commit `c469efd4bc`.
5. `git log -- <my files>` confirms they all trace to `c469efd4bc`, not to any `oscar`-attributed commit.

## How to avoid next time (compounding lesson)

The PRISM pattern for shared-tree commits documented in [[reference_git_index_saturation_camx11_2026_05_18]] §"git index saturation under fleet load" is: **commit via pathspec on the same `git commit` invocation that runs `git add`**, OR **use a slot worktree** so the index is private. The slot-worktree migration via SLOT-WORKTREE-MS0 is the canonical fix for oscar (CLAUDE.md §LANE DISCIPLINE + §PER-CHAT HANDOFF references). Until oscar is migrated to `H:/prism-slot-oscar` on `slot/oscar`:

- Prefer `git commit -m "..." -- <pathspec>` so even if a peer's `git add -A` runs concurrently, your commit message is bound to *your* files.
- If lock contention causes >2 retries, STOP retrying with `git commit` — peer absorption risk dominates. Instead, write a memory like THIS one recording the attribution drift, and let the work land where it landed.
- The audit script `node scripts/audit-close-out-candidates.mjs` ignores commit message scope — your work counts toward MILESTONE_PROGRESS regardless of which commit-prefix landed it.

## Cross-references

- Outcome ship (same playbook, no lock contention): [[reference_psn_outcome_wire_2026_05_22]] · commit `0fd90359de`
- Misattribution doctrine: [[reference_git_index_saturation_camx11_2026_05_18]] · [[reference_h8_misattribution_2026_05_20]] · [[reference_iter2_html_adopt_misattribution_2026_05_18]] · [[feedback_commit_prefix_main_on_shared_tree]]
- Slot-worktree canonical fix: [[reference_slot_worktree_activation_2026_05_16]] · CLAUDE.md §LANE DISCIPLINE
- Doctrine: [[feedback_conflict_fork_rule]] — fork to sibling worktree after the first hollow commit
