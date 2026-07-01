# OSCAR-SFC-9AXIS-MS0/U-OSC-AXIS-LIVENESS — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-AXIS-LIVENESS (slot:oscar): evidence-based live-vs-inert map of every goal-named axis through the orchestrator

**Commit:** `c48829e331cf` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T11:41:11-05:00
**Tags:** oscar-sfc-9axis-ms0, u-osc-axis-liveness, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-AXIS-LIVENESS (slot:oscar): evidence-based live-vs-inert map of every goal-named axis through the orchestrator

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-AXIS-LIVENESS (slot:oscar): evidence-based live-vs-inert map of every goal-named axis through the orchestrator

Empirical probe driving each of the goal's ~15 axes through speedFeedNineAxisOrchestratorEngine.run() on 2 bases (aluminum Ø6 HSM high-RPM corner + steel Ø20 heavy-roughing high-force corner), measuring recommendation.{Vc,RPM,feed,MRR} spread. Read-only (no engine change).

CORRECTS the prior "machine/spindle/holder/workholding all inert" framing with numbers:
  LIVE:  iso_group 62-359x, tool_material 7.1x, tool_diameter 9x, coolant 3.4x(MRR), flutes 3x, rigidity 1.57x, machine.max_rpm 3.0x, tool_holder.balance_class 6.92x
  INERT (the real remaining gap, exactly): tool_holder.type(runout/clamp), spindle.hp(power/torque), workholding.type(clamp-force), controller.high_speed_machining (live only in aggressive_rush, not the default PRISM-optimized recommendation), optimize_for(mode)

Key R8 payoff: machine.max_rpm + holder balance_class are ALREADY live (BALANCE_CLASS_MAX_RPM clamp at buildModeRecommendation:809-820) -- reading the recommendation builder prevented duplicating working clamp code. The genuine campaign remainder is 4 force/power/clamp-force axes (each safety-critical -> physics-reviewer + S(x) gated, logical-order next units), NOT the whole axis space.
```

## Files touched (2)
- mcp-server/scripts/sfc-orchestrator-axis-liveness.ts | 92 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 1 file changed, 92 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show c48829e331cf`
- Milestone envelope: `mcp-server/data/milestones/OSCAR-SFC-9AXIS-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._