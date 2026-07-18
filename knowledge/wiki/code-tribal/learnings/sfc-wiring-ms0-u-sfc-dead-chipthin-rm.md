# SFC-WIRING-MS0/U-SFC-DEAD-CHIPTHIN-RM — [MAIN-FORCE] [SFC-WIRING-MS0]/U-SFC-DEAD-CHIPTHIN-RM (slot:oscar): remove dead millingMaxChipThickness + record gap#4 false-gap ruling (chip-thinning already correct)

**Commit:** `3debadddc97a` · **By:** markjvillanueva3-cloud · **At:** 2026-06-19T22:36:03-05:00
**Tags:** sfc-wiring-ms0, u-sfc-dead-chipthin-rm, auto-distilled

## Subject
[MAIN-FORCE] [SFC-WIRING-MS0]/U-SFC-DEAD-CHIPTHIN-RM (slot:oscar): remove dead millingMaxChipThickness + record gap#4 false-gap ruling (chip-thinning already correct)

## Body
```
[MAIN-FORCE] [SFC-WIRING-MS0]/U-SFC-DEAD-CHIPTHIN-RM (slot:oscar): remove dead millingMaxChipThickness + record gap#4 false-gap ruling (chip-thinning already correct)

Closes SFC-WIRING-MS0 gap #4 -- as a FALSE GAP, not a wiring. physics-reviewer ruling: the audit's
"replace inline chip-thinning with the canonical ChipThinningCompensationEngine" is a SAFETY TRAP. The
canonical engine computes AVERAGE chip thickness (fz*sqrt(ae/D)) for FEED compensation; the SFC force path
needs MAX chip thickness (hmax) for the Kienzle PEAK force. A swap under-reports peak Fc ~37% at 10% radial
-> under-sized power/workholding/deflection clamps (CRITICAL). The SFC ALREADY has both, correctly separated:
hmax inline at STEP 9 (force) + a CTF feed comp via chipThinningFactor() at STEP 7 (feed) -- wiring the
singleton as a feed axis would DOUBLE-COUNT.

Actionable residue: deleted the DEAD `millingMaxChipThickness()` helper (zero call sites, a redundant 3rd
hmax form whose presence invited exactly the unsafe swap) -- replaced with a NOTE pointing to the live STEP 9
hmax + the do-not-reintroduce-average-into-force-path rule. Behavior unchanged (never called); 224 SFC tests
green (206 gauntlet + 9 immersion + 9 deflection).

Also corrected the committed audit spec (RE-VERIFY ADDENDUM): gap #4 false-gap, gap #1 mostly false-gap
(InstantaneousEngagementEngine uses the same hmax; value is per-block toolpath only, not the single-point
SFC; CWEZBuffer does not exist), gap #8 infeasible (EffectiveDiameterCompensator does not exist). The ~96
count needs this per-gap re-verification before being trusted. Memory: reference_oscar_sfc_wiring_tier1_2026_06_19.
```

## Files touched (3)
- mcp-server/src/engines/UltimateSpeedFeedEngine.ts              |  26 +++-------
- state/shared/specs/SFC-WIRING-COMPLETENESS-AUDIT-2026-06-19.md | 133 +++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 139 insertions(+), 20 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 3debadddc97a`
- Milestone envelope: `mcp-server/data/milestones/SFC-WIRING-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._