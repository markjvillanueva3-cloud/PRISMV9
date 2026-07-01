# QUOTING-SYNERGY-MS0/U-SPEED-FEED-TO-QUOTE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-SPEED-FEED-TO-QUOTE (slot:charlie /goal-20 iter12)

**Commit:** `7d9d97a39a1e` · **By:** markjvillanueva3-cloud · **At:** 2026-05-25T19:34:14-05:00
**Tags:** quoting-synergy-ms0, u-speed-feed-to-quote, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-SPEED-FEED-TO-QUOTE (slot:charlie /goal-20 iter12)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-SPEED-FEED-TO-QUOTE (slot:charlie /goal-20 iter12)

Physics-backed cycle-time bridge — closes the gap iter11 left where
WizardToQuoteBridgeEngine accepted operator-supplied cycle_min as-is.
Operator directive iter11: "synergize the quoting feature to the 3
machine domain wizards, speed and feed calculator and full print to
cnc program pipelines to get more accurate run times".

* SpeedFeedToQuoteBridgeEngine — per-op physics-backed cycle enrichment
  - InputOperation extended with optional `physics` context block
    (volume_to_remove_cm3 | path_length_mm + material + machine + tool
    geometry + axial/radial DoC + operation + cut_type)
  - For each op WITH physics context: lazy-call SpeedFeedOrchestratorEngine.compute()
    → cycle = volume_cm3 / mrr_cm3min (vol-bound, roughing)
    → OR cycle = path_mm / feed_rate_mmmin (path-bound, finishing)
    → multiplied by op.passes
  - For each op WITHOUT physics context: pass through wizard cycle_min
    with source="wizard_passthrough" + note explaining why
  - Output: EnrichedOperation[] drops directly into WizardToQuoteBridge
    operations[] field — zero contract churn for callers
  - Provenance: source in {physics_mrr | physics_feed_rate | wizard_passthrough},
    confidence from orchestrator (0..1), original_wizard_cycle_min for diff
    visibility, operator-facing note for audit trail
  - Graceful fallback: orchestrator unavailable → all passthrough +
    warning. Orchestrator throws → log warning + passthrough. MRR≤0 →
    passthrough rather than divide-by-zero.

* quoting_speed_feed_to_cycle dispatcher action
  - Zod schema with operations[].physics nested optional shape
  - Lazy-imported engine in case branch
  - Round-trip test covers: action enum membership, schema parse, engine
    invocation, numeric result equality, source classification

16/16 tests PASS (5.8s including real SpeedFeedOrchestrator compute):
  - reject empty / non-array
  - passthrough no-physics / missing volume + path
  - physics_mrr from volume_to_remove_cm3
  - passes scaling (multi-pass ≈ N× single-pass)
  - physics_feed_rate from path_length_mm (finishing)
  - preserve tool_ids + passes through enrichment
  - aggregate total_cycle_min across mixed-source ops
  - mix physics-backed + passthrough in single batch
  - clamp negative wizard cycle to 0
  - source always ∈ {physics_mrr, physics_feed_rate, wizard_passthrough}
  - non-empty note for every op (audit trail enforced)
  - dispatcher round-trip (action enum + schema parse + engine invoke)
  - dispatcher rejects missing/empty operations

Composes with QUOTING-SYNERGY-MS0 chain:
  WizardToQuoteBridge ← SpeedFeedToQuoteBridge (cycle enrichment)
                     ← ShopProfileTemplate (rate tables)
  PrintToProgramToQuoteBridge ← same enrichment pattern available

Template-first preserved: bridge calls orchestrator with the op's own
material/machine context — same code path for every shop profile.
```

## Files touched (5)
- .../src/__tests__/SpeedFeedToQuoteBridge.test.ts   | 252 +++++++++++++++++++++
- .../src/engines/SpeedFeedToQuoteBridgeEngine.ts    | 227 +++++++++++++++++++
- mcp-server/src/schemas/quotingActionSchemas.ts     |  23 ++
- .../src/tools/dispatchers/quotingDispatcher.ts     |   6 +
- 4 files changed, 508 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 7d9d97a39a1e`
- Milestone envelope: `mcp-server/data/milestones/QUOTING-SYNERGY-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._