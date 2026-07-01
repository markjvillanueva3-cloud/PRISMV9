# OBSIDIAN-VAULT-SYNERGY/U-OBS-RECALL-COUNTER-SERIALIZE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-SYNERGY]/U-OBS-RECALL-COUNTER-SERIALIZE (slot:alpha): serialize the recall-counter RMW — fix lost-update race under the 26-chat fleet (context-retention)

**Commit:** `01c3b15f5655` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T05:45:11-05:00
**Tags:** obsidian-vault-synergy, u-obs-recall-counter-serialize, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-SYNERGY]/U-OBS-RECALL-COUNTER-SERIALIZE (slot:alpha): serialize the recall-counter RMW — fix lost-update race under the 26-chat fleet (context-retention)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-SYNERGY]/U-OBS-RECALL-COUNTER-SERIALIZE (slot:alpha): serialize the recall-counter RMW — fix lost-update race under the 26-chat fleet (context-retention)

Discovery queue item #4 (the cleanest remaining context-retention win); the race
was specced + scrutiny-flagged 2026-05-16 ([[reference_recall_counter_concurrency_finding_2026_05_16]]).
recall-counter-track.mjs (Read) + wiki-recall-on-write.mjs (Write/Edit) both do an
unlocked load->mutate->writeStateAtomic on the SAME wiki-recall-counts.json. The
atomic temp+rename guards CORRUPTION but NOT lost increments: under 26 concurrent
chats, A loads count=5, B loads 5, A writes 6, B writes 6 -> one increment silently
dropped. The recall counter sizes /system-viz L10 nodes (log10(count+1)) + feeds
weekly-synthesis hot-entry review, so dropped counts clip the compounding recall
signal (context-retention degradation).

Fix: wrap BOTH hooks' RMW in withExclusiveLock (scripts/lib/exclusive-file-lock.mjs)
on a SHARED lock path (STATE_FILE + '.lock') so the two fleet-concurrent writers
mutually exclude. ran:false (lock held through the 2.5s retry window) -> skip one
increment (acceptable vs corruption) / preserve the {ok:false} contract.

R15 VALIDATE caught a real bug mid-build: withExclusiveLock returns {ran,value} not
the raw fn result -> had to unwrap .value or the {ok,key,count} caller-contract
breaks (count=[object Object]). Fixed + pinned by a regression-oracle test. 4/4
R9 tests (unwrap-contract + sequential-accumulate + distinct-keys + cheap-guard);
functional: 2x recordWriteEvent -> count=2, lock released.

RESIDUAL (honest, R12): WikiRecallCounterEngine.ts (rarer MCP-process writer of the
same file) is NOT yet on the shared lock — needs a .ts build. The DOMINANT race
(hook-vs-hook, every Read/Write x 26 chats) is closed; the engine-vs-hook race is
rare. Follow-up: lock the engine's recordRecall on the same path + build.
```

## Files touched (4)
- .claude/hooks/recall-counter-track.mjs           | 38 ++++++++++++++++++++++++++------------
- .claude/hooks/wiki-recall-on-write.lock.test.mjs | 72 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- .claude/hooks/wiki-recall-on-write.mjs           | 34 ++++++++++++++++++++++------------
- 3 files changed, 120 insertions(+), 24 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 01c3b15f5655`
- Milestone envelope: `mcp-server/data/milestones/OBSIDIAN-VAULT-SYNERGY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._