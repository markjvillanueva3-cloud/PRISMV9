# OSCAR-SFC-9AXIS-MS0/U-OSC-COMPARE-PER-VENDOR — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-COMPARE-PER-VENDOR (slot:oscar): surface explicit PRISM-vs-G-Wizard(CNCCookbook published) + PRISM-vs-HSMAdvisor(published) per-vendor deltas

**Commit:** `4c544db4aed2` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T18:44:27-05:00
**Tags:** oscar-sfc-9axis-ms0, u-osc-compare-per-vendor, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-COMPARE-PER-VENDOR (slot:oscar): surface explicit PRISM-vs-G-Wizard(CNCCookbook published) + PRISM-vs-HSMAdvisor(published) per-vendor deltas

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-COMPARE-PER-VENDOR (slot:oscar): surface explicit PRISM-vs-G-Wizard(CNCCookbook published) + PRISM-vs-HSMAdvisor(published) per-vendor deltas

Additive baseline_detail{per_source} on TriCompareResult (type derived from the
comparator, no union dup, no behavior change) -- the tri-comparator already computed
per_source for the median and discarded it. sfc-full-sweep-compare.mjs extracts the
cnccookbook(=G-Wizard publisher) + hsmadvisor rows into an explicit by-vendor section
+ ledger fields. Published reference, NOT the live closed-app calculator (operator-gated,
verified: no API/local cutting-data file). Finding surfaced: PRISM fz uniformly +67-91%
vs all 4 published sources -- valid aggressive-roughing chip load (0.00525in/tooth, in band),
post-derate, low-speed/high-feed strategy; NOT a defect (R12 surface, don't blind-detune).
10/10 tri-comparator tests green.
```

## Files touched (4)
- mcp-server/scripts/sfc-full-sweep-compare.mjs                 | 75 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++-
- mcp-server/src/__tests__/SpeedFeedTriComparatorEngine.test.ts | 66 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/SpeedFeedTriComparatorEngine.ts        | 32 ++++++++++++++++++++++++++++++++
- 3 files changed, 172 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 4c544db4aed2`
- Milestone envelope: `mcp-server/data/milestones/OSCAR-SFC-9AXIS-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._