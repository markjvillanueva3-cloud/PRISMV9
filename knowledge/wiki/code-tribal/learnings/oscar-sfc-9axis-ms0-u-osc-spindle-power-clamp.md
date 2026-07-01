# OSCAR-SFC-9AXIS-MS0/U-OSC-SPINDLE-POWER-CLAMP — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-SPINDLE-POWER-CLAMP (slot:oscar): wire the inert spindle.hp axis live -- power-achievability feed derate

**Commit:** `7dc77980337e` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T12:26:59-05:00
**Tags:** oscar-sfc-9axis-ms0, u-osc-spindle-power-clamp, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-SPINDLE-POWER-CLAMP (slot:oscar): wire the inert spindle.hp axis live -- power-achievability feed derate

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-SPINDLE-POWER-CLAMP (slot:oscar): wire the inert spindle.hp axis live -- power-achievability feed derate

Makes the previously-INERT spindle.hp axis move the SFC recommendation (9 live axes -> 10). When required cutting power P = Fc x Vc / 60000 exceeds the LIMITING of machine.power_kw vs spindle.hp (x 0.85 drivetrain eff), feed/fz/MRR are derated so the recommended cut is ACHIEVABLE. Engages only when a power input is supplied (no regression otherwise -- the core engine keeps its own power advisory). SAFE direction only; speed/RPM untouched (power caps chip load).

PHYSICS (2-agent per-file scrutiny PASS):
- required power recomputed at the CURRENT (post-RPM-clamp, post-workholding-derate) operating point: Fc scaled from sfc.forces.tangential_force_N by (fz/fzOrig)^(1-mc), P = Fc x Vc / 60000 (matches UltimateSpeedFeedEngine:2288)
- available = min(machine.power_kw, spindle.hp x HP_TO_KW) x SPINDLE_POWER_EFFICIENCY (0.85, matches engine); HP_TO_KW=0.745699872 (definitional SI), both named+cited
- if reqKw>availKw: fz *= (availKw/reqKw)^(1/(1-mc)), mc from CANONICAL_KIENZLE (imported, never inlined) -- exponent proven to bring P to the envelope exactly
- composes correctly with the workholding derate above it (Fc recomputed at the already-derated fz -> binding constraint wins, no double-count)

VALIDATED LIVE (R15): axis-liveness probe now shows spindle.hp LIVE 1.13x (Al light) / 5.41x (steel heavy) on feed/MRR, 1.00x on Vc/RPM. 12 tests (regression guard no-power==over-spec, positive derate, monotonic 5<15<=50hp, machine.power_kw path, limiting-element machine-vs-spindle min, speed-untouched, 2 adversarial NaN/0/negative, composes-with-workholding, + 2 mode-coverage aggressive_rush/cost_batch) all PASS; no SFC regression.

Per-file scrutiny: physics-reviewer PASS (zero P0/P1 -- exponents correct, no inlined constants, safe-direction, fully guarded, composes w/ workholding) + independent reviewer (1 P1 = mode-coverage gap, FIXED by the 2 added mode tests; no P0). Inert axis count 3 -> 2 (remaining: tool_holder.type runout->life, controller default-mode feed).
```

## Files touched (3)
- mcp-server/src/__tests__/spindlePowerClamp.test.ts            | 139 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/SpeedFeedNineAxisOrchestratorEngine.ts |  46 +++++++++++++++++++++++
- 2 files changed, 185 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 7dc77980337e`
- Milestone envelope: `mcp-server/data/milestones/OSCAR-SFC-9AXIS-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._