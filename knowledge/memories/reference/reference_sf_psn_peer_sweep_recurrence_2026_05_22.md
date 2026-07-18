---
name: reference-sf-psn-peer-sweep-recurrence-2026-05-22
description: Recurring shared-tree peer-sweep misattribution observed 3x in one SF-PSN /loop session — pattern, signal, and what to do when it happens
metadata:
  type: reference
---

# SF-PSN-WIRE-MS0 — recurring peer-sweep misattribution (3× in one session)

2026-05-22..23 juliett `claude-a8894112` /loop iters 3+8.

## What happened

Three times in one /loop session, my U-SFPSN-02 / U-SFPSN-02B work was swept into a peer's commit during the 30-229s `index.lock` contention window in the shared `H:/prism` main tree:

1. **iter 3** — U-SFPSN-02 decomposition (envelope + memory finding) → swept into `c1b6428a62` (peer slot delta, CAD commit)
2. **iter 8** — U-SFPSN-02B module + engine + spec.md → swept into `18cc9e3f1a` (slot mike, COMMAND-KERNEL-MS0/U-CK11-PHASE2BC-V2-1 "gitignore exception")
3. **iter 8** — U-SFPSN-02B spec.html → swept into `8c96ebb8b4` (slot whiskey, NODE-MEM-POINTER/U-NMP-CORE)

Only the 5th file (TaylorShimEquivalence.test.ts) landed clean under the correct slot banner (`4d8e8ece4a`) — committed alone after the peer-sweep dust had settled, with no other staged files for peers to scoop up.

## Mechanism

When a chat in the shared `H:/prism` main tree has `git add`-staged files and is waiting for `index.lock` to release, ANY peer's `git add -A` (or even targeted `git add` followed by `git commit`) during that window can scoop up the waiting chat's staged files into the peer's index. The peer's `git commit` then ships the combined diff under the peer's commit message.

Three reinforcing factors made this worse:
- **3+ minute 0-byte index.lock** from a crashed peer process (existed silently with no growth) blocked my `git add` for ~4 retry cycles. Each retry widened the peer-add window.
- **`git add --` pathspec is NOT atomic with `git commit`** — the staging window between them is when peers can sweep.
- **File-claim-guard is per-file but not per-staging-session** — it blocks edits to peer-claimed files, but my files were not peer-claimed; peers swept them as collateral.

## Signal

The first sign was `git diff HEAD -- <my-file>` returning EMPTY for a file I'd just edited and not yet committed — the file matched HEAD because someone else's commit had landed my changes.

`rtk git log --oneline -1 -- <my-file>` then reveals the misattributing commit. `git log --oneline -S "<my-unique-string>" -- <my-file>` confirms by searching the diff content.

## What to do (per CLAUDE.md doctrine)

- **DO NOT amend the peer commit.** "Never amend a peer commit" is explicit in CLAUDE.md.
- **Accept attribution loss.** The work is shipped under the wrong banner but it IS shipped.
- **Document the truth** in three places (this session did all three):
  1. The envelope: `closedCommitsSplit` field naming each swept commit
  2. A reference memory (this file): so future audits can correlate
  3. The companion commit that DID land clean (the test file here): commit body names the swept commits explicitly
- **DO NOT retry the same add+commit chain** — the peer-add window will keep racing.

## Prevention for next time

1. **Slot-worktree migration**: per SLOT-WORKTREE-MS0 (already shipped 2026-05-16), juliett should be in `H:/prism-slot-juliett` on branch `slot/juliett` — peers cannot sweep from a worktree they don't share. `/checkin-juliett` does the migration at §2c.
2. **Stage-and-commit in ONE command** with `git add -- <files> && git commit -m "..."` — eliminates the staging window. Failed this session because `index.lock` blocked the `git add` and the chain never completed in one go.
3. **Commit ONE FILE AT A TIME during peer-churn windows** — the test-only commit landed clean precisely because there was nothing else for peers to scoop. Multi-file commits invite peer-sweep.
4. **Detect 0-byte index.lock early**: a 0-byte lock >120s old IS a crashed peer (vs partial-index which is multi-MB). Remove on detection — don't wait the 229s I waited this session.

## Cost paid this session

- 3 commits misattributed (envelope-mutation, module+engine+spec, spec-html)
- 6+ retry cycles burning ~5 minutes wall-clock
- ~5K tokens on lock-contention diagnosis + recovery
- Net: U-SFPSN-02B work shipped successfully, but the commit graph carries permanent slot-attribution drift that has to be navigated by every future audit.

## See also

- [[reference_sf_psn_u02_semantic_gap_2026_05_22]] — the spec finding that triggered U-02 decomposition (also misattributed)
- [[feedback_conflict_fork_rule]] — sister doctrine on shared-tree multi-chat hazards
- [[reference_slot_worktree_activation_2026_05_16]] — the slot-worktree migration that PREVENTS this in the first place
- [[reference_iter3_misattribution_2026_05_20]] — slot bravo's 2026-05-20 misattribution; same mechanism
- CLAUDE.md §"PER-CHAT HANDOFF" → "Lane discipline + conflict-fork rule" — the SLOT-WORKTREE-MS0 migration is the durable fix

## Decision retroactive

Spec U-SFPSN-02B is closed at iter 8 with `closedCommitsSplit` in the envelope. The fragmentation across 3 commits is permanent. Future audits of SF-PSN-WIRE-MS0 should follow the `closedCommitsSplit` map, not the literal `git log --grep` for the unit ID — only `4d8e8ece4a` carries the unit ID in its subject.
