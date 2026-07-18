# JM-FUSION-TOOLS-MS0/U-JFT-MATGROUP-COMPAT-GATE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [JM-FUSION-TOOLS-MS0]/U-JFT-MATGROUP-COMPAT-GATE (slot:romeo): gate per-material presets by tool-material compatibility

**Commit:** `e61630374c8d` · **By:** markjvillanueva3-cloud · **At:** 2026-06-01T12:03:02-05:00
**Tags:** jm-fusion-tools-ms0, u-jft-matgroup-compat-gate, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [JM-FUSION-TOOLS-MS0]/U-JFT-MATGROUP-COMPAT-GATE (slot:romeo): gate per-material presets by tool-material compatibility

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [JM-FUSION-TOOLS-MS0]/U-JFT-MATGROUP-COMPAT-GATE (slot:romeo): gate per-material presets by tool-material compatibility

Adds coatingSelectionAdapter.compatibleIsoGroups(coating, substrate) - the
canonical material-domain gate (ASM/Sandvik coating-application chemistry):
Al-bearing PVD (TiAlN/AlTiN/ti-coated) -> P/M/K/S/H, NOT aluminum N (Al affinity
-> built-up edge); PCD -> N only; CBN -> H/K; uncoated -> N/K; HSS substrate ->
P/M/N (no S/H); ceramic -> K/S. 10/10 unit tests.

Generator now emits per-material preset rows ONLY for compatible ISO groups
(operator constraint: only populate material types compatible with the tool).
1526 -> 1234 rows; 292 incompatible-domain presets correctly gated out
(ti-coated end mills lose N; HSS twist drills lose K/S/H). Reusable by the coming
hyperMILL + Mastercam exports. tsc-clean, regenerated outputs included.
```

## Files touched (16)
- mcp-server/scripts/generate-jm-fusion-tool-libraries.ts          |  39 +++++--
- .../src/__tests__/CoatingSelectionAdapter.compatibility.test.ts  |  82 +++++++++++++
- mcp-server/src/engines/CoatingSelectionAdapter.ts                |  50 ++++++++
- ...ILLS - PURPLE COATING (CHANGE SFM TO 75 FOR GOLD)-6groups.csv |  51 --------
- .../180 DEG. INSERT DRILLS (FLAT)-6groups.csv                    |  51 --------
- .../BORING  BARS - FINISHING-6groups.csv                         |  14 ---
- .../material-group-libraries/BORING BARS - ROUGHING-6groups.csv  |  14 ---
- .../material-group-libraries/END MILLS FOR MACHINE 4-6groups.csv |   5 -
- state/shared/jm-fusion-tools/material-group-libraries/README.md  |  19 +--
- .../material-group-libraries/TURNING TOOLS-6groups.csv           |  30 -----
_(+6 more)_


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e61630374c8d`
- Milestone envelope: `mcp-server/data/milestones/JM-FUSION-TOOLS-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._