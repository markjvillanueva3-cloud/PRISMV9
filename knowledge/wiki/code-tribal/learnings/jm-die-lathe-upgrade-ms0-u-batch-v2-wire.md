# JM-DIE-LATHE-UPGRADE-MS0/U-BATCH-V2-WIRE — [MAIN] [JM-DIE-LATHE-UPGRADE-MS0]/U-BATCH-V2-WIRE (slot:whiskey iter10): batch CLI V2 version-switching. [BOOTSTRAP-SLOT-ENFORCE] mid-/loop; prior whiskey commits this MS landed on shared tree (e66d99f2d0). PRISM_LATHE_UPGRADER_VERSION env routes V1 hardcoded vs V2 physics-driven; default V2. loadUpgrader env-read, async Promise wrap (V2 lazy-loads UltimateSpeedFeedEngine), header field normalization. Unblocks 115k variant re-run.

**Commit:** `70291ce9265a` · **By:** markjvillanueva3-cloud · **At:** 2026-05-23T22:59:59-05:00
**Tags:** jm-die-lathe-upgrade-ms0, u-batch-v2-wire, auto-distilled

## Subject
[MAIN] [JM-DIE-LATHE-UPGRADE-MS0]/U-BATCH-V2-WIRE (slot:whiskey iter10): batch CLI V2 version-switching. [BOOTSTRAP-SLOT-ENFORCE] mid-/loop; prior whiskey commits this MS landed on shared tree (e66d99f2d0). PRISM_LATHE_UPGRADER_VERSION env routes V1 hardcoded vs V2 physics-driven; default V2. loadUpgrader env-read, async Promise wrap (V2 lazy-loads UltimateSpeedFeedEngine), header field normalization. Unblocks 115k variant re-run.

## Body
```
[MAIN] [JM-DIE-LATHE-UPGRADE-MS0]/U-BATCH-V2-WIRE (slot:whiskey iter10): batch CLI V2 version-switching. [BOOTSTRAP-SLOT-ENFORCE] mid-/loop; prior whiskey commits this MS landed on shared tree (e66d99f2d0). PRISM_LATHE_UPGRADER_VERSION env routes V1 hardcoded vs V2 physics-driven; default V2. loadUpgrader env-read, async Promise wrap (V2 lazy-loads UltimateSpeedFeedEngine), header field normalization. Unblocks 115k variant re-run.
```

## Files touched (6)
- scripts/build-memory-index-sidecar.mjs             |   5 +
- scripts/lib/memory-index-search-lib.mjs            |  74 ++++++++++-
- scripts/lib/memory-index-search-lib.test.mjs       | 116 +++++++++++++++++
- scripts/upgrade-jm-die-lathe-batch.mjs             |  41 ++++--
- .../PSN-DEEP-RESEARCH-SYNTHESIS-2026-05-23.md      | 141 +++++++++++++++++++++
- 5 files changed, 362 insertions(+), 15 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 70291ce9265a`
- Milestone envelope: `mcp-server/data/milestones/JM-DIE-LATHE-UPGRADE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._