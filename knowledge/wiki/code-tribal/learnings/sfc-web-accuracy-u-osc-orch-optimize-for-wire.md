# SFC-WEB-ACCURACY/U-OSC-ORCH-OPTIMIZE-FOR-WIRE — [MAIN-FORCE] [SFC-WEB-ACCURACY]/U-OSC-ORCH-OPTIMIZE-FOR-WIRE (slot:oscar): wire the DEAD optimize_for slider into SpeedFeedOrchestratorEngine -- cost/balanced/productivity returned byte-identical Vc/life on the sf_orchestrate path (SpeedFeedPage /speed-feed + CalculatorPage /calculator).

**Commit:** `49251eff15cd` · **By:** markjvillanueva3-cloud · **At:** 2026-06-25T20:04:17-05:00
**Tags:** sfc-web-accuracy, u-osc-orch-optimize-for-wire, auto-distilled

## Subject
[MAIN-FORCE] [SFC-WEB-ACCURACY]/U-OSC-ORCH-OPTIMIZE-FOR-WIRE (slot:oscar): wire the DEAD optimize_for slider into SpeedFeedOrchestratorEngine -- cost/balanced/productivity returned byte-identical Vc/life on the sf_orchestrate path (SpeedFeedPage /speed-feed + CalculatorPage /calculator).

## Body
```
[MAIN-FORCE] [SFC-WEB-ACCURACY]/U-OSC-ORCH-OPTIMIZE-FOR-WIRE (slot:oscar): wire the DEAD optimize_for slider into SpeedFeedOrchestratorEngine -- cost/balanced/productivity returned byte-identical Vc/life on the sf_orchestrate path (SpeedFeedPage /speed-feed + CalculatorPage /calculator).

Root cause: the engine DECLARED optimize_for (input type line 231) but NEVER consumed it -- verified live on :3100 (cost==balanced==productivity, all Vc=300/life=2min). The slider on both main SFC pages did nothing.

Fix (DERATE-ONLY, Vc-only): new physics/optimize-for-factor.ts optimizeForVcFactor(goal)->multiplier<=1.0 (cost 0.85, tool_life 0.80; balanced/productivity/time/surface_finish/unknown 1.0), applied as the last factor in the orchestrator Vc chain. vc_base is a single carbide-anchored nominal (not a band), so raising Vc above it is the un-safe-leaning operator-gated direction (mirrors toolMaterialSpeedFactor Math.min(1.0,...)); cost/tool_life DERATE (Taylor min-cost Vc ~0.8-0.85x max-production, Boothroyd&Knight/Kalpakjian). Live-confirmed: balanced 300/2min, cost 255/4min, tool_life 240/5min, productivity==balanced. Touches NO canonical Kienzle/Taylor constant -> S(x) monotonically non-degrading.

Scope (R12): surface_finish -> neutral 1.0 (fz lever Ra~fz^2 overridden downstream by chip-thinning + U-SFC-DEFLECTION-VC-LEVER feed re-derivation; real finish lever must apply AFTER fz finalization -- documented follow-up). productivity>balanced (Vc RAISE) is operator-gated. Complements the sfc_calculate optimize_for slice (U-SFC-OPTIMIZE-FOR-REQUEST/UI) for the OTHER engine.

Tests: optimize-for-factor.test.ts 9/9 (factor map, never-raise invariant, prototype-pollution adversarial -- caught a real NaN bug, + 4 compute() integration). tsc-clean. physics-reviewer + reviewer PASS (live magnitude probe).
```

## Files touched (4)
- mcp-server/src/__tests__/optimize-for-factor.test.ts  | 109 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/SpeedFeedOrchestratorEngine.ts |  13 +++++++++++--
- mcp-server/src/physics/optimize-for-factor.ts         |  68 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 3 files changed, 188 insertions(+), 2 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 49251eff15cd`
- Milestone envelope: `mcp-server/data/milestones/SFC-WEB-ACCURACY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._