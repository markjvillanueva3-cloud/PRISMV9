# OSCAR-SFC-9AXIS-MS0/U-OSC-AXIS-LIVENESS-LIFE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-AXIS-LIVENESS-LIFE (slot:oscar): add tool_life_min to the axis-liveness probe — closes the runout loophole

**Commit:** `d03458fff141` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T11:49:47-05:00
**Tags:** oscar-sfc-9axis-ms0, u-osc-axis-liveness-life, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-AXIS-LIVENESS-LIFE (slot:oscar): add tool_life_min to the axis-liveness probe — closes the runout loophole

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-AXIS-LIVENESS-LIFE (slot:oscar): add tool_life_min to the axis-liveness probe — closes the runout loophole

The first probe measured Vc/RPM/feed/MRR only; holder runout IS forwarded to the engine (translateToUltimate:730) so it might have moved tool_life unmeasured. Measured: tool_holder.type runout = 1.00x on tool_life too -> runout reaches the engine but does NOT affect ANY recommendation output (genuine engine-side life-model gap, not just a probe blind spot). spindle.hp / workholding.type / controller also 1.00x on life.

Strengthens the map: tool_material life-spread 111x on steel (vs 7.14x Vc — the wired axis is bigger than the Vc number showed); machine.max_rpm 10.9x, balance_class 65.5x on life. CONCLUSION: the 4 inert axes are inert on all 5 outputs (Vc/RPM/feed/MRR/life) — each needs a real physics build (no already-live-on-another-output shortcut), each a model decision (workholding friction-vs-form-closure, power clamp-vs-warn, runout->life wear model, controller default-mode feed) that regresses if naive -> physics-reviewer-in-the-loop-on-the-MODEL, logical-order next units.
```

## Files touched (2)
- mcp-server/scripts/sfc-orchestrator-axis-liveness.ts | 16 ++++++++--------
- 1 file changed, 8 insertions(+), 8 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show d03458fff141`
- Milestone envelope: `mcp-server/data/milestones/OSCAR-SFC-9AXIS-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._