# WEDM-PHASE-A/U-WMD-ZERO-INVESTIGATE — [MAIN] [WEDM-PHASE-A]/U-WMD-ZERO-INVESTIGATE (slot:charlie iter44): 18 zero-wmd manifests are Mastercam default-machine-def projects (no operator customization). Sampled 3 (af102-05, 0137471, 12270_gage). Strings dominated by framework noise (Stream N not used x8, Main Viewsheet, MastercamPlanes). 0137471 reveals workflow: top string is 'Original Import File name = C:\Users\Milling\Downloads\0137471.IGS' - operator imports geometry, never customizes machine def. Default machine ref lives in X8 compressed region (iter-40 proved opaque). Phase-A coverage confirmed at ceiling: explicit machine-def 79/97 + default-via-opacity 18/97 = 97/97 accounted for. R12: PRISM cannot recover default machine-def selection from these 18 files without Mastercam SDK or operator interview. The conservative assumption is Mitsubishi FA-class default (matches 88pct corpus signal). Side-finding: MACHINE_MODEL_NUM_RE matched binary garbage '|?Z)u8)K' on 0137471 - regex too greedy on partial-noise; documented for future tightening but not engine-blocking. Files: scripts/wedm-mcx-zero-wmd-investigate.mjs +130 + state/shared/wedm-mcx-zero-wmd-investigation.json +new. Memory: reference_phase_a_3iter_progression_2026_05_23.

**Commit:** `7479f60460fc` · **By:** markjvillanueva3-cloud · **At:** 2026-05-23T02:56:13-05:00
**Tags:** wedm-phase-a, u-wmd-zero-investigate, auto-distilled

## Subject
[MAIN] [WEDM-PHASE-A]/U-WMD-ZERO-INVESTIGATE (slot:charlie iter44): 18 zero-wmd manifests are Mastercam default-machine-def projects (no operator customization). Sampled 3 (af102-05, 0137471, 12270_gage). Strings dominated by framework noise (Stream N not used x8, Main Viewsheet, MastercamPlanes). 0137471 reveals workflow: top string is 'Original Import File name = C:\Users\Milling\Downloads\0137471.IGS' - operator imports geometry, never customizes machine def. Default machine ref lives in X8 compressed region (iter-40 proved opaque). Phase-A coverage confirmed at ceiling: explicit machine-def 79/97 + default-via-opacity 18/97 = 97/97 accounted for. R12: PRISM cannot recover default machine-def selection from these 18 files without Mastercam SDK or operator interview. The conservative assumption is Mitsubishi FA-class default (matches 88pct corpus signal). Side-finding: MACHINE_MODEL_NUM_RE matched binary garbage '|?Z)u8)K' on 0137471 - regex too greedy on partial-noise; documented for future tightening but not engine-blocking. Files: scripts/wedm-mcx-zero-wmd-investigate.mjs +130 + state/shared/wedm-mcx-zero-wmd-investigation.json +new. Memory: reference_phase_a_3iter_progression_2026_05_23.

## Body
```
[MAIN] [WEDM-PHASE-A]/U-WMD-ZERO-INVESTIGATE (slot:charlie iter44): 18 zero-wmd manifests are Mastercam default-machine-def projects (no operator customization). Sampled 3 (af102-05, 0137471, 12270_gage). Strings dominated by framework noise (Stream N not used x8, Main Viewsheet, MastercamPlanes). 0137471 reveals workflow: top string is 'Original Import File name = C:\Users\Milling\Downloads\0137471.IGS' - operator imports geometry, never customizes machine def. Default machine ref lives in X8 compressed region (iter-40 proved opaque). Phase-A coverage confirmed at ceiling: explicit machine-def 79/97 + default-via-opacity 18/97 = 97/97 accounted for. R12: PRISM cannot recover default machine-def selection from these 18 files without Mastercam SDK or operator interview. The conservative assumption is Mitsubishi FA-class default (matches 88pct corpus signal). Side-finding: MACHINE_MODEL_NUM_RE matched binary garbage '|?Z)u8)K' on 0137471 - regex too greedy on partial-noise; documented for future tightening but not engine-blocking. Files: scripts/wedm-mcx-zero-wmd-investigate.mjs +130 + state/shared/wedm-mcx-zero-wmd-investigation.json +new. Memory: reference_phase_a_3iter_progression_2026_05_23.
```

## Files touched (3)
- scripts/wedm-mcx-zero-wmd-investigate.mjs         | 133 ++++++++++++++++++
- state/shared/wedm-mcx-zero-wmd-investigation.json | 160 ++++++++++++++++++++++
- 2 files changed, 293 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 7479f60460fc`
- Milestone envelope: `mcp-server/data/milestones/WEDM-PHASE-A.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._