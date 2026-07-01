# HURCO-VM30I-FULL-PSN-MS0/U-HURCO-ROUNDTRIP-TSX-SIDECAR — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HURCO-VM30I-FULL-PSN-MS0]/U-HURCO-ROUNDTRIP-TSX-SIDECAR (slot:echo iter11 2026-05-24): UNBLOCK roundtrip end-to-end. Sidecar scripts/hurco-jmdie-roundtrip.ts is the actual TS payload; wrapper .mjs just spawns 'npx tsx <ts-file>' with shell:true (no inline -e payload, no quoting trap). FIRST SUCCESSFUL JM-DIE ROUNDTRIP: 1001.hnc parsed 4 ops via new inline-G-code path → V11 re-emit 218 lines (5.6K) with full UltiMotion smoothing (G05.3 P35) + tool length comp + spindle ramp + WCS. Re-emit at state/shared/hurco-jmdie-roundtrip-tsx/reemit/1001.reemit.hnc - OPERATOR CAN LOAD THIS IN WINMAX RIGHT NOW. Other 2 files (0520396.hnc, SACMA CUTOFF.hnc) still no_ops - their annotation patterns differ from 1001.hnc; tunes-as-discovered in HURCO-PARSER-MS1.

**Commit:** `ed8fedb2c5a7` · **By:** markjvillanueva3-cloud · **At:** 2026-05-24T22:42:45-05:00
**Tags:** hurco-vm30i-full-psn-ms0, u-hurco-roundtrip-tsx-sidecar, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HURCO-VM30I-FULL-PSN-MS0]/U-HURCO-ROUNDTRIP-TSX-SIDECAR (slot:echo iter11 2026-05-24): UNBLOCK roundtrip end-to-end. Sidecar scripts/hurco-jmdie-roundtrip.ts is the actual TS payload; wrapper .mjs just spawns 'npx tsx <ts-file>' with shell:true (no inline -e payload, no quoting trap). FIRST SUCCESSFUL JM-DIE ROUNDTRIP: 1001.hnc parsed 4 ops via new inline-G-code path → V11 re-emit 218 lines (5.6K) with full UltiMotion smoothing (G05.3 P35) + tool length comp + spindle ramp + WCS. Re-emit at state/shared/hurco-jmdie-roundtrip-tsx/reemit/1001.reemit.hnc - OPERATOR CAN LOAD THIS IN WINMAX RIGHT NOW. Other 2 files (0520396.hnc, SACMA CUTOFF.hnc) still no_ops - their annotation patterns differ from 1001.hnc; tunes-as-discovered in HURCO-PARSER-MS1.

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HURCO-VM30I-FULL-PSN-MS0]/U-HURCO-ROUNDTRIP-TSX-SIDECAR (slot:echo iter11 2026-05-24): UNBLOCK roundtrip end-to-end. Sidecar scripts/hurco-jmdie-roundtrip.ts is the actual TS payload; wrapper .mjs just spawns 'npx tsx <ts-file>' with shell:true (no inline -e payload, no quoting trap). FIRST SUCCESSFUL JM-DIE ROUNDTRIP: 1001.hnc parsed 4 ops via new inline-G-code path → V11 re-emit 218 lines (5.6K) with full UltiMotion smoothing (G05.3 P35) + tool length comp + spindle ramp + WCS. Re-emit at state/shared/hurco-jmdie-roundtrip-tsx/reemit/1001.reemit.hnc - OPERATOR CAN LOAD THIS IN WINMAX RIGHT NOW. Other 2 files (0520396.hnc, SACMA CUTOFF.hnc) still no_ops - their annotation patterns differ from 1001.hnc; tunes-as-discovered in HURCO-PARSER-MS1.
```

## Files touched (6)
- scripts/hurco-jmdie-roundtrip-tsx.mjs              | 301 +++------------------
- scripts/hurco-jmdie-roundtrip.ts                   | 267 ++++++++++++++++++
- state/shared/hurco-jmdie-roundtrip-tsx-report.json | 151 +++++++++++
- state/shared/hurco-jmdie-roundtrip-tsx-report.md   |  30 ++
- .../reemit/1001.reemit.hnc                         | 218 +++++++++++++++
- 5 files changed, 699 insertions(+), 268 deletions(-)

## Lessons surfaced in commit body
- till no_ops - their annotation patterns differ from 1001.hnc; tunes-as-discovered in HURCO-PARSER-MS1.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show ed8fedb2c5a7`
- Milestone envelope: `mcp-server/data/milestones/HURCO-VM30I-FULL-PSN-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._