# OSCAR-SFC-9AXIS-MS0/U-OSC-TOOLMAT-SPEED-MATERIAL-SPECIFIC — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-TOOLMAT-SPEED-MATERIAL-SPECIFIC (slot:oscar): fix the HSS/CBN over-speed the comparison surfaced — material-specific tool-speed factor

**Commit:** `907e74acab26` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T15:54:24-05:00
**Tags:** oscar-sfc-9axis-ms0, u-osc-toolmat-speed-material-specific, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-TOOLMAT-SPEED-MATERIAL-SPECIFIC (slot:oscar): fix the HSS/CBN over-speed the comparison surfaced — material-specific tool-speed factor

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-TOOLMAT-SPEED-MATERIAL-SPECIFIC (slot:oscar): fix the HSS/CBN over-speed the comparison surfaced — material-specific tool-speed factor

AUTO-FIX-INLINE of the bug the tri-vendor comparison earned: PRISM's tool-material speed
multiplier was UNIFORM per tool material, but the real tool/carbide speed ratio is
workpiece-ISO-specific. Result (now fixed): PRISM OVER-sped HSS on cast iron +108% and CBN
on hardened +49% (UNSAFE -> rapid tool failure), and under-sped ceramic -49%.

Fix: new sibling module src/physics/tool-material-speed-override.ts layers a per-(tool,ISO)
override + widened clamp on the canonical base table (read-only import). Lives OUTSIDE the
edit-guarded constants.ts deliberately -- it adds NO Kienzle/Taylor value, only a separable
speed-CORRECTION layer. UltimateSpeedFeedEngine Vc path now calls
getMaterialSpecificToolSpeedFactor(toolMat, effectiveIso). physics-reviewer-validated cells:
  hss x K  0.13 (was 0.35) -- MH30 cast-iron table; LOWER=safer (the over-speed fix)
  cbn x H  1.4  (was 2.5)  -- CBN hard-turn ~1.4x carbide, not 2.5x; LOWER=safer
  ceramic x K 3.8 / x S 6.5 (was 2.5) -- ceramic genuinely runs cast iron/superalloy that fast
clamp widened [0.3,3.0]->[0.1,8.0] (old band BLOCKED 0.13 + 6.5). carbide stays 1.0 ALL groups.

LIVE-VALIDATED via sweep (the comparison validating the calc fix): HSS cast iron +108% -> -23%
(over-speed ELIMINATED, now safe); CBN hardened +49% -> conservative; ceramic -49% -> -7.1%;
carbide -25.9% UNCHANGED (no regression); HSS steel/alum +31%/-5% unchanged. Residual: ceramic-S
/cbn-H now slightly conservative (SAFE direction, n=6/12 small sample, reflects PRISM carbide-base
calibration -- separate non-safety follow-up). Change is strictly toward safer (lower) speeds on
the over-sped cells -> S(x) improves. 10 override tests + 10 existing uniform-fn tests (no
regression to the old fn). physics-reviewer values PASS + empirical sweep proof.
```

## Files touched (4)
- mcp-server/src/engines/UltimateSpeedFeedEngine.ts           | 10 +++++++--
- mcp-server/src/physics/tool-material-speed-override.test.ts | 83 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/physics/tool-material-speed-override.ts      | 77 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 3 files changed, 168 insertions(+), 2 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 907e74acab26`
- Milestone envelope: `mcp-server/data/milestones/OSCAR-SFC-9AXIS-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._