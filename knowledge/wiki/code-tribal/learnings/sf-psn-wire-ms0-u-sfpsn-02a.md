# SF-PSN-WIRE-MS0/U-SFPSN-02A — [MAIN] [SF-PSN-WIRE-MS0]/U-SFPSN-02A (slot:juliett): KienzleForceModel shim — bit-equivalent across 180 fixtures

**Commit:** `d46733d24527` · **By:** markjvillanueva3-cloud · **At:** 2026-05-22T18:11:19-05:00
**Tags:** sf-psn-wire-ms0, u-sfpsn-02a, auto-distilled

## Subject
[MAIN] [SF-PSN-WIRE-MS0]/U-SFPSN-02A (slot:juliett): KienzleForceModel shim — bit-equivalent across 180 fixtures

## Body
```
[MAIN] [SF-PSN-WIRE-MS0]/U-SFPSN-02A (slot:juliett): KienzleForceModel shim — bit-equivalent across 180 fixtures

Replaces inline kienzleCuttingForce() in UltimateSpeedFeedEngine.ts:848 with a
delegate to KienzleForceModel.calculate(). Shim reconciles 4 engine-vs-module
semantic differences: rake reference (6 deg vs 0 deg) -> pass rake_angle_deg+6;
edge-radius trigger -> pass edge_radius_mm=0.001 (never fires for h>0.003mm);
rake clamp [0.7, 1.3] -> apply on shim side; Kc rake-folded vs bare -> multiply
on shim side.

Documented gap: shim diverges from inline for h in [0.001, 0.01) because the
module clamps at 0.01 vs inline floor 0.001. Every engine call site already
uses Math.max(0.01, ...) so the gap is degenerate-input territory.

NEW src/__tests__/KienzleShimEquivalence.test.ts: 9 cases, 180 fixtures (6 ISO
groups x 5 chip thicknesses x 2 widths x 3 rake angles). All Fc/Kc/Kc_uncorrected
bit-equivalent (REL_TOLERANCE 1e-12) to frozen oldKienzleCuttingForce baseline
verbatim from df730c2f3a:848-863. Rake clamp engages bit-identically at
gamma=+/-50 (outside [-30, 30]).

Existing UltimateSpeedFeedEngine.test.ts: 46 pass, 6 pre-existing fail
(RPM unit string, drilling Ff field engine never populated, Gilbert ordering,
stability stiffness gate, getMaterialProfile/stats undefined field) - none
touch Kienzle/Fc/Kc; last test-file code change was 5e780e623b 2026-04-25.

Files (2, pathspec to avoid shared-tree misattribution that swept the U-02-
DECOMPOSE commit into peer delta's c1b6428a62 earlier this loop):
- engines/UltimateSpeedFeedEngine.ts (+56/-9): import + shim + JSDoc, fn exported
- __tests__/KienzleShimEquivalence.test.ts (+220): frozen-baseline pattern

Composed algorithm modules: 2 -> 3 of 59. SF-PSN-WIRE-MS0 unit complete.
Remains: U-02B Taylor reconciliation, U-02C lift remaining inline physics.
```

## Files touched (3)
- .../src/__tests__/KienzleShimEquivalence.test.ts   | 220 +++++++++++++++++++++
- mcp-server/src/engines/UltimateSpeedFeedEngine.ts  |  65 +++++-
- 2 files changed, 276 insertions(+), 9 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show d46733d24527`
- Milestone envelope: `mcp-server/data/milestones/SF-PSN-WIRE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._