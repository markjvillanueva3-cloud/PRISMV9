# OBSIDIAN-VAULT-OPS/U-VAULT-SYNC-RESILIENT — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-OPS]/U-VAULT-SYNC-RESILIENT (slot:sierra): per-file write retry — fix C:->H: sync data-loss bug

**Commit:** `168c20264632` · **By:** markjvillanueva3-cloud · **At:** 2026-06-08T11:10:08-05:00
**Tags:** obsidian-vault-ops, u-vault-sync-resilient, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-OPS]/U-VAULT-SYNC-RESILIENT (slot:sierra): per-file write retry — fix C:->H: sync data-loss bug

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-OPS]/U-VAULT-SYNC-RESILIENT (slot:sierra): per-file write retry — fix C:->H: sync data-loss bug

Gap-B1/P0 from the vault audit. obsidian-memory-sync.mjs type-routed write was a
bare fs.writeFileSync; one transient Windows file lock (UNKNOWN -4094/EBUSY/EPERM/
EACCES, OneDrive/AV handle contention) THREW and aborted the entire memory-sync
pass, silently skipping every alphabetically-later memory (data loss).

Fix: new exported writeWithRetry() — 3x100ms backoff on transient codes ONLY
(non-transient like ENOSPC fails immediately); injectable IO mirroring
syncGalaxyMemories. Type-routed write routes through it; final failure -> errors++,
log, CONTINUE (fail-loud, never abort batch, R12). ensureDir folded into !dryRun
guard (dry-run now side-effect-free). syncSleep reuses exclusive-file-lock Atomics.

Tests: obsidian-memory-sync.resilience.test.mjs 6/6 node:test pass. 2-reviewer
scrutiny PASS (live-probed EBUSY recovery 308ms; 2 P3 nits fixed).
```

## Files touched (3)
- scripts/obsidian-memory-sync.mjs                 |  69 ++++++++++++++++++++++++++++++++++++++++++++---
- scripts/obsidian-memory-sync.resilience.test.mjs | 120 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 186 insertions(+), 3 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 168c20264632`
- Milestone envelope: `mcp-server/data/milestones/OBSIDIAN-VAULT-OPS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._