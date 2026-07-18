---
name: sf-miner-misattribution-2026-05-21
description: "SF-MINER 2-action wire shipped under wrong slot banner (charlie's INFRA-AGI commit) due to shared-tree git-add window collision"
aliases: reference_sf_miner_misattribution_2026_05_21
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.187Z
---


# SF-MINER wire — misattribution, 2026-05-21 juliett

## Outcome
- FEATURE-GAP-AUDIT-MS0/U-WIRE-BACKLOG-SF-MINER — **shipped** (3 files in commit `6d9430f27e` titled `[MAIN] [INFRA-AGI-ROUTER-MS2]/P0-U04-ENGINE (slot:charlie):`)
- 15/15 vitest PASS for SpeedFeedMinerEngine.mine() + .compareToBaseline() contracts
- `prism_calc:speed_feed_mine` + `prism_calc:speed_feed_compare_to_baseline` actions exposed; ACTIONS 59 → 61
- 2-of-2 scrutiny (arm A + arm B) PASS BEFORE the misattribution; ledger marked clean
- Attribution: **WRONG** — banner says `[MAIN] [INFRA-AGI-ROUTER-MS2]/P0-U04-ENGINE (slot:charlie):` but the SF-MINER files are juliett's work

## Files in `6d9430f27e`
- `mcp-server/src/__tests__/speed-feed-miner-wire.test.ts` (juliett's — SHOULD have been a separate slot:juliett commit)
- `mcp-server/src/engines/WireEDMAGIOrchestrator.ts` (charlie's — correct attribution)
- `mcp-server/src/schemas/calcActionSchemas.ts` (BOTH — co-modified)
- `mcp-server/src/tools/dispatchers/calcDispatcher.ts` (BOTH — co-modified)

## Why
Same shared-tree git-add window pattern as [[reference_iter3_misattribution_2026_05_20]] (echo's speedfeed_dl_stats absorbed into a peer commit) and [[reference_h8_misattribution_2026_05_20]] (echo's H8 absorbed into hotel's U-COST-DASHBOARD).

Sequence on `H:/prism` shared tree:
1. juliett (this chat) staged 3 SF-MINER files at ~10:18 (commit message pending)
2. git-add-lane-guard hook surfaced "Auto-unstaged 0 foreign file(s); proceeding with 3 of your files. ⚠ failed to unstage 3 (left staged — guard may still block)"
3. Mid-commit, charlie's chat hit `git commit` on its WireEDMAGIOrchestrator wire — the shared `.git/index` had juliett's 3 SF-MINER files still staged, so charlie's `git commit -m "..."` swept them in
4. juliett's subsequent `git commit -m "..."` returned `no changes added to commit` (the files were already committed under charlie's banner at `6d9430f27e`)
5. `git diff HEAD <files>` returned empty (matches HEAD), confirming files DID ship — just under wrong attribution

## Doctrinal precedent (do NOT re-commit)
Per [[reference_iter3_misattribution_2026_05_20]] §Outcome and [[reference_h8_misattribution_2026_05_20]] §Action: when work has shipped under a wrong banner, do NOT re-commit — the work IS in HEAD, the misattribution is a banner-only defect that future audit can fix in a roadmap close-out batch. Re-committing would either (a) revert the original commit (lose charlie's WireEDM work) or (b) create a phantom no-op commit.

## How to prevent
This is the third misattribution in 4 days (2026-05-18 echo, 2026-05-20 echo, 2026-05-21 juliett). The pattern is fixed:
- Shared `H:/prism` tree + simultaneous `git add` + simultaneous `git commit` from independent chats = lottery on which commit picks up which staged files
- Slot-worktree model (`slot/juliett` branch + `H:/prism-slot-juliett` worktree per SLOT-WORKTREE-MS0) is the canonical fix — each chat has its own `.git/index`
- Until that's migrated for juliett, accept that misattribution will recur. Log it (this file), mark the unit done, move on.

## Verification (work IS shipped)
```bash
git -C H:/prism show 6d9430f27e -- mcp-server/src/__tests__/speed-feed-miner-wire.test.ts | head -50
grep -n 'speed_feed_mine\|speed_feed_compare_to_baseline' H:/prism/mcp-server/src/tools/dispatchers/calcDispatcher.ts
grep -n 'speed_feed_mine\|speed_feed_compare_to_baseline' H:/prism/mcp-server/src/schemas/calcActionSchemas.ts
cd H:/prism/mcp-server && npx vitest run src/__tests__/speed-feed-miner-wire.test.ts
```

All four should return concrete hits; vitest should report 15 PASS.

## Memory linkage
- [[reference_iter3_misattribution_2026_05_20]] — first iteration of this pattern (echo's speedfeed_dl_stats)
- [[reference_h8_misattribution_2026_05_20]] — second (echo's H8 → hotel)
- [[reference_slot_worktree_activation_2026_05_16]] — the canonical fix (slot-worktree per chat)
- [[feedback_conflict_fork_rule]] — fork to a sibling worktree to escape shared-tree contention
- [[feedback_commit_prefix_main_on_shared_tree]] — `[MAIN]` prefix doctrine for shared-tree commits
