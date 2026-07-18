# SELF-COMPACTION/U-ZULU-OPT-IN-CLI — [MAIN] [SELF-COMPACTION]/U-ZULU-OPT-IN-CLI (slot:alpha): reusable opt-in/opt-out CLI for the zulu self-compaction actuator + opt in all 21 work slots

**Commit:** `6dec5d327785` · **By:** markjvillanueva3-cloud · **At:** 2026-06-11T21:05:36-05:00
**Tags:** self-compaction, u-zulu-opt-in-cli, auto-distilled

## Subject
[MAIN] [SELF-COMPACTION]/U-ZULU-OPT-IN-CLI (slot:alpha): reusable opt-in/opt-out CLI for the zulu self-compaction actuator + opt in all 21 work slots

## Body
```
[MAIN] [SELF-COMPACTION]/U-ZULU-OPT-IN-CLI (slot:alpha): reusable opt-in/opt-out CLI for the zulu self-compaction actuator + opt in all 21 work slots

Builds the /zulu-opt-in tool the patch-sibling assumed existed: lock-guarded atomic RMW (reuses chat-slots.mjs withLock -- the SAME lock the heartbeat path holds, so no clobber) sets slots[name].zuluOptIn + zuluOptInAt. SELF_EXEMPT (zulu,golf) never opted in. Flags: --list / --all-work / --slot <n> / --off. Ran --all-work: opted IN all 21 work slots (golf+zulu exempt). VALIDATED live: dry-run sweep now reports picked=21, per-slot pressure-driven decisions, gate=dry-run on every slot (typed nothing). SAFETY -- triple gate to live-fire: 24h zuluOptInAt grace + scheduled-task --dry-run + PRISM_ZULU_DRY_RUN env. Activating live SendKeys is the operator final switch (remove --dry-run after reviewing the dry-run log).
```

## Files touched (2)
- scripts/zulu-opt-in.mjs | 87 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 1 file changed, 87 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 6dec5d327785`
- Milestone envelope: `mcp-server/data/milestones/SELF-COMPACTION.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._