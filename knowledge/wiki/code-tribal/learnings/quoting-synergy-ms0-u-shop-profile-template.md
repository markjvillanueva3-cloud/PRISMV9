# QUOTING-SYNERGY-MS0/U-SHOP-PROFILE-TEMPLATE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-SHOP-PROFILE-TEMPLATE+U-WIZARD-TO-QUOTE+U-PRINT-TO-PROGRAM-TO-QUOTE (slot:charlie /goal-20 iter11)

**Commit:** `bbb27cd5e7c5` · **By:** markjvillanueva3-cloud · **At:** 2026-05-25T18:46:55-05:00
**Tags:** quoting-synergy-ms0, u-shop-profile-template, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-SHOP-PROFILE-TEMPLATE+U-WIZARD-TO-QUOTE+U-PRINT-TO-PROGRAM-TO-QUOTE (slot:charlie /goal-20 iter11)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-SHOP-PROFILE-TEMPLATE+U-WIZARD-TO-QUOTE+U-PRINT-TO-PROGRAM-TO-QUOTE (slot:charlie /goal-20 iter11)

Synergize quoting with 3 machine domain wizards + full print-to-CNC pipeline
through a template-first shop-profile store. JM Die is THE first profile;
same engines drive every future shop with no code change.

3 new engines + 22/22 tests + 5 dispatcher actions:

* ShopProfileTemplateEngine — template-first shop rate-table store
  - Loads from state/shared/shop-profiles/<id>.json with 60s cache + JM Die
    fallback (5 machines: haas_vf2/okuma_lb3000/sodick_aq537l/ag_charm_form20/
    studer_s33, 5 labor tiers: apprentice/operator/senior/master/programmer,
    \$0.13/kWh US industrial 2024, 15% overhead, \$85/hr setup rate)
  - getMachineRate(family) → matched|default with rate+power_kw+utilization
  - getLaborRate(tier) → \$/hr fully loaded
  - electricityCost(input) → kWh × \$/kWh × load_factor (default 0.65)
  - getProfile/listProfiles/refresh

* WizardToQuoteBridgeEngine — 3-domain wizard → quote
  - Accepts mill/lathe/wedm wizard output (operations[], cycle_min,
    tool_ids[], passes, setup_min, machine_family, material, qty,
    operator_tier)
  - Aggregates cycle + tools + wall-clock hours (cycle ÷ utilization_pct)
  - Emits machine_cost + setup_cost + labor_cost + electricity_cost +
    overhead + cost_per_part with warnings (machine-fallback flag)

* PrintToProgramToQuoteBridgeEngine — full pipeline (CAD+CAM+G-code) → quote
  - Accepts pipeline summary (estimated_cycle_min, estimated_setup_min,
    tool_ids[], op_count, programming_hours, cad_generation_hours, qty)
  - Adds programming_cost + cad_generation_cost (programmer-tier rate)
    that the wizard path skips
  - Emits full cost breakdown with all hidden-cost axes operator named

5 new prism_quoting dispatcher actions:
  * quoting_shop_profile_get / quoting_shop_profile_list
  * quoting_shop_electricity_cost
  * quoting_wizard_to_quote
  * quoting_print_to_program_to_quote

Template-first design: JM Die hardcoded defaults are the first instance,
but any shop's profile in state/shared/shop-profiles/<id>.json overrides
them. Same wizard/pipeline → quote bridges drive every future profile —
no per-shop engine duplication.

22/22 tests PASS (87ms) covering profile fallback, custom-profile load,
machine/labor lookups, electricity calc, unknown profile, mill/lathe/wedm
wizard bridges, rejections, machine-fallback warnings, qty inverse,
pipeline bridge with/without programming hours, tier override, overhead.

Follow-up unit candidate: U-SPEED-FEED-TO-QUOTE — wire
SpeedFeedOrchestratorEngine into the wizard bridge for physics-backed
cycle times (operator named "speed and feed calculator" in directive).
```

## Files touched (7)
- .../src/__tests__/QuotingSynergyBridges.test.ts    | 263 +++++++++++++++++++++
- .../engines/PrintToProgramToQuoteBridgeEngine.ts   | 153 ++++++++++++
- .../src/engines/ShopProfileTemplateEngine.ts       | 211 +++++++++++++++++
- .../src/engines/WizardToQuoteBridgeEngine.ts       | 167 +++++++++++++
- mcp-server/src/schemas/quotingActionSchemas.ts     |  63 +++++
- .../src/tools/dispatchers/quotingDispatcher.ts     |  38 +++
- 6 files changed, 895 insertions(+)

## Lessons surfaced in commit body
- tilization
- tilization_pct)

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show bbb27cd5e7c5`
- Milestone envelope: `mcp-server/data/milestones/QUOTING-SYNERGY-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._