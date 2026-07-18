---
name: reference_post_ship_sfc-web-accuracy-u-osc-sfc-product-bridge
description: Auto-distilled learnings from shipping SFC-WEB-ACCURACY/U-OSC-SFC-PRODUCT-BRIDGE (commit dec03327c). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.039Z
aliases: reference_post_ship_sfc-web-accuracy-u-osc-sfc-product-bridge
---


# SFC-WEB-ACCURACY/U-OSC-SFC-PRODUCT-BRIDGE

[MAIN-FORCE] [SFC-WEB-ACCURACY]/U-OSC-SFC-PRODUCT-BRIDGE (slot:oscar): SFC web calculator was non-functional -- prism_product:sfc_calculate false-blocked EVERY web calc at the pre-machine-completeness-gate. The page (web/src/components/sfc/buildSfcRequest.ts) posts FLAT machine_max_rpm/machine_power_kw; the gate reads NESTED machine.spindle.* -- calcDispatcher bridged its sf_* actions but productDispatcher did not, so the gate saw no spindle and blocked. Live-verified on :3100: flat->blocked, nested->full correct result (1045 slot 10mm 4FL carbide: Vc 200 m/min, rpm 6366, fz 0.137mm, Fc 2889N, 9.63kW, life 8.9min, Ra 1.47um). Fix: centralize the flat->nested bridge into one shared applySfcMachineBridge() + SFC_BRIDGE_ACTIONS (utils/sfcMachineBridge.ts); wire into productDispatcher before pre-calculation hooks; refactor calcDispatcher inline block to the shared helper (behavior-identical for sf_orchestrate/sf_quick). Additive + non-destructive: SFC compute actions only, never overwrites an explicit machine, genuinely-incomplete data STILL blocks (no safety softening). Tests: +6 unit vs the real gate (15/15) + new dispatcher round-trip (gate registered live: no-machine blocks, flat-bridged passes -- reverting the productDispatcher hunk turns it red). 0 new tsc errors; per-file 2-arm scrutiny PASS.

**Shipped:** 2026-06-25T08:37:47-05:00 by markjvillanueva3-cloud
**Files:** 6 touched

Full distillation: [[sfc-web-accuracy-u-osc-sfc-product-bridge]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._