# OSCAR-SFC-3WAY-MS0/U-GWIZARD-COMPARE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-3WAY-MS0]/U-GWIZARD-COMPARE (slot:oscar): PRISM↔G-Wizard comparison leg — the missing 3rd leg of PRISM-vs-HSMAdvisor-vs-GWizard

**Commit:** `2d0a2d54eaa4` · **By:** markjvillanueva3-cloud · **At:** 2026-06-03T00:32:08-05:00
**Tags:** oscar-sfc-3way-ms0, u-gwizard-compare, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-3WAY-MS0]/U-GWIZARD-COMPARE (slot:oscar): PRISM↔G-Wizard comparison leg — the missing 3rd leg of PRISM-vs-HSMAdvisor-vs-GWizard

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-3WAY-MS0]/U-GWIZARD-COMPARE (slot:oscar): PRISM↔G-Wizard comparison leg — the missing 3rd leg of PRISM-vs-HSMAdvisor-vs-GWizard

GWizardComparatorBridgeEngine: reads a G-Wizard toolcrib tool (gWizardAdapterEngine) + a caller-supplied workpiece material (G-Wizard crib stores no material), translates to NineAxisInput, runs PRISM, diffs vc/fz/rpm/feed in PRISM-canonical metric. UNITS-FIRST: inches-vs-mm install (25.4x guard) + loud unknown-units warning. Mirrors HSMAdvisorComparatorBridgeEngine maths so the tri-comparator stacks both legs.

MRR deliberately NOT a G-Wizard axis (crib has no cut depth -> apples-to-oranges). Public prepare() splits deterministic translation from the heavy physics run. 19/19 green. Per-file scrutiny: 2 reviewers PASS (2 P1s fixed: silent flute divergence -> warn; MRR-basis mismatch -> drop axis).
```

## Files touched (2)
- mcp-server/src/engines/Fusion360LiveBridgeEngine.ts | 64 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 1 file changed, 64 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 2d0a2d54eaa4`
- Milestone envelope: `mcp-server/data/milestones/OSCAR-SFC-3WAY-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._