---
title: QUOTING-SYNERGY-MS0 — template-first quote-time costing chain
type: architecture
created: 2026-05-25
slot: charlie
related:
  - [[shop-profile-template-engine]]
  - [[wizardtoquotebridgeengine]]
  - [[print-to-program-to-quote-bridge-engine]]
  - [[speedfeedtoquotebridgeengine]]
  - [[reference_quoting_synergy_ms0_iter11_14_2026_05_25]]
---

# QUOTING-SYNERGY-MS0

Template-first quote-time costing chain. Five iterations (charlie /goal-20, 2026-05-25) wired existing PRISM physics/CAM/G-code substrate to quote outputs, with JM Die as the FIRST shop profile, not the only one.

## Operator directive
> "synergize the quoting feature to the 3 machine domain wizards, speed and feed calculator and full print to cnc program (cad generation and cam programming factored in) pipelines to get more accurate run times, setup time, tooling required, machine hours, overhead, employee pay rate, electricity used, cost of secondary operations based off jm documents if there are any. **remember to build with template in mind since what we build now for JM will carry over to other shops.**"

## The 5 commits (iter11 → iter15)
| Iter | Commit  | Unit                                       | Surface |
|------|---------|--------------------------------------------|---------|
| 11   | bbb27cd5e7 | U-SHOP-PROFILE-TEMPLATE + U-WIZARD-TO-QUOTE + U-PRINT-TO-PROGRAM-TO-QUOTE | 3 engines, 22 tests |
| 12   | 7d9d97a39a | U-SPEED-FEED-TO-QUOTE                     | physics-backed cycles, 16 tests |
| 13   | 7de74cf2f6 | U-GCODE-TO-CYCLE-FOR-PRINT-PIPELINE        | G-code → cycle auto-estimate, 28 tests |
| 14   | 37320cd594 | U-SECONDARY-OPS-PROFILE-OVERRIDE           | per-shop secondary-op rates, 33 tests |
| 15   | d76df4dc2f | U-UTILITY-COSTS-EXTENDED                   | water+air+gas utilities, 41 tests |

## Synergy chain
```
WIZARD path                          PRINT-TO-CNC path
─────────────                        ───────────────────
3-machine wizard                     Full pipeline summary
(mill / lathe / wedm)                (CAD → CAM → G-code)
       │                                    │
       ▼                                    ▼
SpeedFeedToQuoteBridge (iter12)      GCodeTimeEstimatorEngine (iter13)
─ enrich cycle_min from              ─ gcode_text → cycle_min
  SpeedFeedOrchestrator              ─ tool_ids from T-words
  (MRR or feed-rate path)            ─ op_count from blocks
       │                                    │
       ▼                                    ▼
WizardToQuoteBridge ─────┬─── PrintToProgramToQuoteBridge
(iter11)                       (iter11 + iter13)
─ machine_cost +               ─ machine_cost + setup +
  setup + labor +              ─ programming_cost + cad_gen_cost +
  electricity +                ─ labor + utilities + overhead
  overhead
                         │
                         ▼
            ShopProfileTemplateEngine (iter11+15)
            ─ machines: rate $/hr, power_kw, util_pct,
              utility consumption (water_gph, air_cfh, gas_thr)
            ─ labor: 5 tiers $/hr
            ─ electricity_usd_per_kwh + water + air + gas
            ─ overhead_pct + setup_rate
            ─ secondary_op_overrides → SecondaryOpsQuotePricingEngine (iter14)
            ─ JM_DIE_FALLBACK as first instance;
              state/shared/shop-profiles/<id>.json overrides everything
```

## 8 new dispatcher actions
All exposed under `prism_quoting`:
- `quoting_shop_profile_get` — load shop profile by id (defaults to "jm-die")
- `quoting_shop_profile_list` — list available profile ids
- `quoting_shop_electricity_cost` — electricity cost for one machine cycle
- `quoting_shop_utilities_cost` — aggregate electricity + water + air + gas
- `quoting_wizard_to_quote` — 3-domain wizard output → quote breakdown
- `quoting_print_to_program_to_quote` — full pipeline → quote + programming + CAD costs
- `quoting_speed_feed_to_cycle` — physics-backed cycle enrichment
- `quoting_secondary_ops_price_for_profile` — secondary-op pricing using profile overrides

## Template-first discipline (THE design rule)
JM Die is the **first** profile, not the **only** profile. All hardcoded values live as `JM_DIE_FALLBACK` in `ShopProfileTemplateEngine.ts`. Any future shop adds `state/shared/shop-profiles/<shop-id>.json` — zero engine code change. Validated by iter14 tests where ACME-shaped test profile overrides JM laser_marking rates without touching pricing-engine code.

## Caller-precedence rule (universal across all 5 bridges)
Caller-supplied values ALWAYS win over auto-estimated/profile-defaulted values. Bridges only fill **gaps** (estimated_cycle_min=0, tool_ids=[], op_count=0). CAM-supplied truth never gets overwritten by inferior auto-derivation.

## What did NOT need to be rebuilt (R8 read-before-write)
- SpeedFeedOrchestratorEngine (4000-LOC physics — `compute()` reused)
- GCodeTimeEstimatorEngine (4-dialect parser — `analyze()` reused)
- SecondaryOpsQuotePricingEngine (11-op DEFAULT_CATALOG already JM-calibrated — extended with `priceOpsForProfile()`)
- LeadTimePricingTierEngine, TolerancePricingImpactEngine, CrossPartToolingSynergyEngine — already shipped earlier session

## Per-utility consumption (JM Die first profile)
| Machine | Water gph | Air cfh | Gas |
|---------|-----------|---------|-----|
| haas_vf2 (mill) | 3 | 20 | — |
| okuma_lb3000 (lathe) | 4 | 25 | — |
| sodick_aq537l (WEDM) | 12 (dielectric heavy) | 5 | — |
| ag_charm_form20 (sinker EDM) | 0 (dielectric oil) | 5 | — |
| studer_s33 (grinder) | 8 | 15 | — |

Load factor only derates **electricity** (Watt-hours-style). Water/air/gas are demand-driven and applied at full hourly rate × cycle_time (matches operator's utility bill).

## Follow-up units (NOT yet built — for future chats)
- **U-QP-MACHINE-INVEST** — given candidate machine upgrade, payback period using profile + CrossPartToolingSynergyEngine
- **U-QP-OUTSOURCE-UI** — wire OutsourceRecommendEngine into QuotingWorkbenchPage
- **U-QP-DYNAMIC-SHOP-RATE** — utilization-decay rate adjustment over time
- **U-QP-DOC-LEVEL-TRAINING** — per-document calibration in DocustrataHistoricalPricingTrainerEngine
- **/system-viz roost** for the synergy chain — visualize the 5 bridges
- **QuotingWorkbenchPage** wire-in of the 8 new actions (UI is built but bridges aren't surfaced)

## See also
- [[reference_quoting_synergy_ms0_iter11_14_2026_05_25]] — session memo (iter11-14 detail; iter15 follow-up)
- [[reference_quoting_pipeline_ms0_assessment_2026_05_24]] — earlier charlie assessment that scoped these axes
- [[feedback_commit_to_slot_worktree]] — peer absorption avoided via [BOOTSTRAP-SLOT-ENFORCE] prefix
- [[reference_quoting_calibration_u_qt10_2026_05_25]] — calibration loop close (different scope, same domain)
