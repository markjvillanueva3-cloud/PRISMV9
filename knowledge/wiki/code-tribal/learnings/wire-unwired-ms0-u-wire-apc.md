# WIRE-UNWIRED-MS0/U-WIRE-APC — wire AutomaticPipelineComposerEngine into prism_dev (3 actions)

**Commit:** `9c66996e20e9` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T05:06:33-05:00
**Tags:** wire-unwired-ms0, u-wire-apc, auto-distilled

## Subject
[WIRE-UNWIRED-MS0]/U-WIRE-APC: wire AutomaticPipelineComposerEngine into prism_dev (3 actions)

## Body
```
[WIRE-UNWIRED-MS0]/U-WIRE-APC: wire AutomaticPipelineComposerEngine into prism_dev (3 actions)

Composes pipelines from 3 in-memory templates (speed_feed, tool_selection,
quality_prediction). Template-lookup + adapt + validate; pure aside from
idempotent template init.

- apc_compose: {objective, inputs?, required_outputs?, constraints?}
  → ComposedPipeline with stages, totalEstimatedDuration, confidence, warnings
- apc_list_templates: returns the 3 known template ids
- apc_get_template: name → PipelineStage[] | null (found:true|false)

DEFERRED:
- initialize() — pure side-effect setter that compose() calls implicitly;
  no wire value
- reset() — wipes the shared templates map; LLM-triggered reset would
  break every subsequent compose() across all sessions

Wire-safety doctrine:
- snake_case ↔ camelCase normalization at the dispatcher boundary
  (objective + inputs + required_outputs + constraints.{max_stages,
  max_duration, preferred_assets} → engine's CompositionRequest shape).
  Per the dispatchers CLAUDE.md 'Parameter normalization happens in
  dispatcher, NOT engine' rule.
- found:true|false discriminator on get_template (slimResponse strips null)
- stage_count + warnings_count + count survivors alongside arrays
- DoS guards: ≤4096-char objective, ≤50 inputs/outputs/preferred_assets,
  ≤100 max_stages cap, ≤1e6 max_duration

Tests: 20/20 PASS (7 schema gates incl. all DoS bounds + variability
across all 3 templates + 2 ROUTING PROOFs (list parity + per-field
stage equality) + duration-sum invariant + max_stages cap honored +
required-output warning surfaced + 2 schema-reject envelope checks).
```

## Files touched (4)
- .../dispatcher.automaticPipelineComposer.test.ts   | 230 +++++++++++++++++++++
- mcp-server/src/schemas/devActionSchemas.ts         |  33 +++
- mcp-server/src/tools/dispatchers/devDispatcher.ts  |  50 ++++-
- 3 files changed, 312 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 9c66996e20e9`
- Milestone envelope: `mcp-server/data/milestones/WIRE-UNWIRED-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._