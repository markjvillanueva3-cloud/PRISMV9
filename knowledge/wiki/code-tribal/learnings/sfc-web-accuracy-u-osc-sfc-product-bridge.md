# SFC-WEB-ACCURACY/U-OSC-SFC-PRODUCT-BRIDGE — [MAIN-FORCE] [SFC-WEB-ACCURACY]/U-OSC-SFC-PRODUCT-BRIDGE (slot:oscar): SFC web calculator was non-functional -- prism_product:sfc_calculate false-blocked EVERY web calc at the pre-machine-completeness-gate. The page (web/src/components/sfc/buildSfcRequest.ts) posts FLAT machine_max_rpm/machine_power_kw; the gate reads NESTED machine.spindle.* -- calcDispatcher bridged its sf_* actions but productDispatcher did not, so the gate saw no spindle and blocked. Live-verified on :3100: flat->blocked, nested->full correct result (1045 slot 10mm 4FL carbide: Vc 200 m/min, rpm 6366, fz 0.137mm, Fc 2889N, 9.63kW, life 8.9min, Ra 1.47um). Fix: centralize the flat->nested bridge into one shared applySfcMachineBridge() + SFC_BRIDGE_ACTIONS (utils/sfcMachineBridge.ts); wire into productDispatcher before pre-calculation hooks; refactor calcDispatcher inline block to the shared helper (behavior-identical for sf_orchestrate/sf_quick). Additive + non-destructive: SFC compute actions only, never overwrites an explicit machine, genuinely-incomplete data STILL blocks (no safety softening). Tests: +6 unit vs the real gate (15/15) + new dispatcher round-trip (gate registered live: no-machine blocks, flat-bridged passes -- reverting the productDispatcher hunk turns it red). 0 new tsc errors; per-file 2-arm scrutiny PASS.

**Commit:** `dec03327cd5c` · **By:** markjvillanueva3-cloud · **At:** 2026-06-25T08:37:47-05:00
**Tags:** sfc-web-accuracy, u-osc-sfc-product-bridge, auto-distilled

## Subject
[MAIN-FORCE] [SFC-WEB-ACCURACY]/U-OSC-SFC-PRODUCT-BRIDGE (slot:oscar): SFC web calculator was non-functional -- prism_product:sfc_calculate false-blocked EVERY web calc at the pre-machine-completeness-gate. The page (web/src/components/sfc/buildSfcRequest.ts) posts FLAT machine_max_rpm/machine_power_kw; the gate reads NESTED machine.spindle.* -- calcDispatcher bridged its sf_* actions but productDispatcher did not, so the gate saw no spindle and blocked. Live-verified on :3100: flat->blocked, nested->full correct result (1045 slot 10mm 4FL carbide: Vc 200 m/min, rpm 6366, fz 0.137mm, Fc 2889N, 9.63kW, life 8.9min, Ra 1.47um). Fix: centralize the flat->nested bridge into one shared applySfcMachineBridge() + SFC_BRIDGE_ACTIONS (utils/sfcMachineBridge.ts); wire into productDispatcher before pre-calculation hooks; refactor calcDispatcher inline block to the shared helper (behavior-identical for sf_orchestrate/sf_quick). Additive + non-destructive: SFC compute actions only, never overwrites an explicit machine, genuinely-incomplete data STILL blocks (no safety softening). Tests: +6 unit vs the real gate (15/15) + new dispatcher round-trip (gate registered live: no-machine blocks, flat-bridged passes -- reverting the productDispatcher hunk turns it red). 0 new tsc errors; per-file 2-arm scrutiny PASS.

## Body
```
[MAIN-FORCE] [SFC-WEB-ACCURACY]/U-OSC-SFC-PRODUCT-BRIDGE (slot:oscar): SFC web calculator was non-functional -- prism_product:sfc_calculate false-blocked EVERY web calc at the pre-machine-completeness-gate. The page (web/src/components/sfc/buildSfcRequest.ts) posts FLAT machine_max_rpm/machine_power_kw; the gate reads NESTED machine.spindle.* -- calcDispatcher bridged its sf_* actions but productDispatcher did not, so the gate saw no spindle and blocked. Live-verified on :3100: flat->blocked, nested->full correct result (1045 slot 10mm 4FL carbide: Vc 200 m/min, rpm 6366, fz 0.137mm, Fc 2889N, 9.63kW, life 8.9min, Ra 1.47um). Fix: centralize the flat->nested bridge into one shared applySfcMachineBridge() + SFC_BRIDGE_ACTIONS (utils/sfcMachineBridge.ts); wire into productDispatcher before pre-calculation hooks; refactor calcDispatcher inline block to the shared helper (behavior-identical for sf_orchestrate/sf_quick). Additive + non-destructive: SFC compute actions only, never overwrites an explicit machine, genuinely-incomplete data STILL blocks (no safety softening). Tests: +6 unit vs the real gate (15/15) + new dispatcher round-trip (gate registered live: no-machine blocks, flat-bridged passes -- reverting the productDispatcher hunk turns it red). 0 new tsc errors; per-file 2-arm scrutiny PASS.
```

## Files touched (6)
- mcp-server/src/__tests__/sfc-product-bridge-roundtrip.test.ts | 90 +++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/tools/dispatchers/calcDispatcher.ts            |  7 ++--
- mcp-server/src/tools/dispatchers/productDispatcher.ts         | 13 +++++++
- mcp-server/src/utils/sfcMachineBridge.test.ts                 | 54 +++++++++++++++++++++++++++-
- mcp-server/src/utils/sfcMachineBridge.ts                      | 44 +++++++++++++++++++++++
- 5 files changed, 203 insertions(+), 5 deletions(-)

## Lessons surfaced in commit body
- tils/sfcMachineBridge.ts); wire into productDispatcher before pre-calculation hooks; refactor calcDispatcher inline block to the shared helper (behavior-identical for sf_orchestrate/sf_quick). Additive + non-destructive: SFC compute actions only, never overwrites an explicit machine, genuinely-incomplete data STILL blocks (no safety softening). Tests: +6 unit vs the real gate (15/15) + new dispatcher

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show dec03327cd5c`
- Milestone envelope: `mcp-server/data/milestones/SFC-WEB-ACCURACY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._