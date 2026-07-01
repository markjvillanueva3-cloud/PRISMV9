# JM-DIE-LATHE-UPGRADE-MS0/U-PROGRAM-LIBRARY-FRONTEND-SPEC — [MAIN] [JM-DIE-LATHE-UPGRADE-MS0]/U-PROGRAM-LIBRARY-FRONTEND-SPEC (slot:whiskey iter22): turnkey frontend wiring spec for jm_die_lathe_program_library across 5 frontend nodes (lathe-wizard + lathe-studio + shop-mgmt + biz-mgmt + employee-portal) + camera-recognition bridge contract. [BOOTSTRAP-SLOT-ENFORCE]. Backend shipped this session (engine + tests + schema + dispatcher case in HEAD); spec gives the next 5 frontend slots a turnkey hand-off — exact zod query shape, complete result-binding contract, 5x frontend-matrix mapping each UI affordance to a result field, partNumber recognition entry point, USB-export wiring via variant.downloadPath, build-order recommendation. Forward-compat hook documented for mike's MIKE-LATHE-CAPABILITY-MS0 merge once golf integrates slot/mike (b3a0d1ea76) — surfaces per-machine spindleRpmMax/hasLiveTool/hasSubSpindle on dispatchableMachines[].

**Commit:** `23e4cadb2a16` · **By:** markjvillanueva3-cloud · **At:** 2026-05-25T01:26:48-05:00
**Tags:** jm-die-lathe-upgrade-ms0, u-program-library-frontend-spec, auto-distilled

## Subject
[MAIN] [JM-DIE-LATHE-UPGRADE-MS0]/U-PROGRAM-LIBRARY-FRONTEND-SPEC (slot:whiskey iter22): turnkey frontend wiring spec for jm_die_lathe_program_library across 5 frontend nodes (lathe-wizard + lathe-studio + shop-mgmt + biz-mgmt + employee-portal) + camera-recognition bridge contract. [BOOTSTRAP-SLOT-ENFORCE]. Backend shipped this session (engine + tests + schema + dispatcher case in HEAD); spec gives the next 5 frontend slots a turnkey hand-off — exact zod query shape, complete result-binding contract, 5x frontend-matrix mapping each UI affordance to a result field, partNumber recognition entry point, USB-export wiring via variant.downloadPath, build-order recommendation. Forward-compat hook documented for mike's MIKE-LATHE-CAPABILITY-MS0 merge once golf integrates slot/mike (b3a0d1ea76) — surfaces per-machine spindleRpmMax/hasLiveTool/hasSubSpindle on dispatchableMachines[].

## Body
```
[MAIN] [JM-DIE-LATHE-UPGRADE-MS0]/U-PROGRAM-LIBRARY-FRONTEND-SPEC (slot:whiskey iter22): turnkey frontend wiring spec for jm_die_lathe_program_library across 5 frontend nodes (lathe-wizard + lathe-studio + shop-mgmt + biz-mgmt + employee-portal) + camera-recognition bridge contract. [BOOTSTRAP-SLOT-ENFORCE]. Backend shipped this session (engine + tests + schema + dispatcher case in HEAD); spec gives the next 5 frontend slots a turnkey hand-off — exact zod query shape, complete result-binding contract, 5x frontend-matrix mapping each UI affordance to a result field, partNumber recognition entry point, USB-export wiring via variant.downloadPath, build-order recommendation. Forward-compat hook documented for mike's MIKE-LATHE-CAPABILITY-MS0 merge once golf integrates slot/mike (b3a0d1ea76) — surfaces per-machine spindleRpmMax/hasLiveTool/hasSubSpindle on dispatchableMachines[].
```

## Files touched (2)
- ...GRAM-LIBRARY-FRONTEND-WIRING-SPEC-2026-05-25.md | 174 +++++++++++++++++++++
- 1 file changed, 174 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 23e4cadb2a16`
- Milestone envelope: `mcp-server/data/milestones/JM-DIE-LATHE-UPGRADE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._