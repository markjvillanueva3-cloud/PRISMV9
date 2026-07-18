---
name: reference-quoting-synergy-ms0-iter11-19-2026-05-25
description: QUOTING-SYNERGY-MS0 iter11-19 arc — template-first shop profile + 8 engines + 11 dispatcher actions + 73 tests wiring quote-time costing to existing physics/CAM/G-code/JM-fleet substrate
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.143Z
aliases: reference_quoting_synergy_ms0_iter11_14_2026_05_25
---


# QUOTING-SYNERGY-MS0 — iter11-iter19 arc (charlie /goal-20, 2026-05-25)

## Operator directive
"synergize the quoting feature to the 3 machine domain wizards, speed and feed calculator and full print to cnc program (cad generation and cam programming factored in) pipelines to get more accurate run times, setup time, tooling required, machine hours, overhead, employee pay rate, electricity used, cost of secondary operations based off jm documents if there are any. **remember to build with template in mind since what we build now for JM will carry over to other shops.**"

Plus iter11 gap-audit added axes: cross-part tooling/machine ROI · machine investment payback · dynamic shop rate.

## What shipped (9 iters, 8 clean commits + 1 absorbed wiki)
| Iter | Commit | Unit | Tests |
|------|--------|------|-------|
| 11 | `bbb27cd5e7` | U-SHOP-PROFILE-TEMPLATE + WIZARD-TO-QUOTE + PRINT-TO-PROGRAM-TO-QUOTE | 22 |
| 12 | `7d9d97a39a` | U-SPEED-FEED-TO-QUOTE (physics cycles) | 16 |
| 13 | `7de74cf2f6` | U-GCODE-TO-CYCLE-FOR-PRINT-PIPELINE | 28 |
| 14 | `37320cd594` | U-SECONDARY-OPS-PROFILE-OVERRIDE | 33 |
| 15 | `d76df4dc2f` | U-UTILITY-COSTS-EXTENDED (water/air/gas) | 41 |
| 16 | absorbed `4d031b5e69` | wiki entry | — |
| 17 | `909b4025ff` | U-CROSS-PART-SYNERGY-FROM-JM-FLEET | 48 |
| 18 | `60c9fbd8c7` | U-MACHINE-INVEST-FROM-FLEET | 11 (new file) |
| 19 | `b9c6ac1b55` | U-DYNAMIC-SHOP-RATE | 14 (new file) |

**Total: 8 new engines/extensions, 11 new prism_quoting dispatcher actions, 73 tests across 3 files.**

## 11 new prism_quoting dispatcher actions
- `quoting_shop_profile_get` — load shop profile by id (defaults to "jm-die")
- `quoting_shop_profile_list` — list available profile ids
- `quoting_shop_electricity_cost` — electricity cost for one machine cycle
- `quoting_shop_utilities_cost` — aggregate electricity + water + air + gas
- `quoting_wizard_to_quote` — 3-domain wizard output → quote breakdown
- `quoting_print_to_program_to_quote` — full pipeline → quote + programming + CAD costs (+ gcode_text auto-estimate)
- `quoting_speed_feed_to_cycle` — physics-backed cycle enrichment via SpeedFeedOrchestrator
- `quoting_secondary_ops_price_for_profile` — secondary-op pricing using profile.secondary_op_overrides
- `quoting_cross_part_synergy_from_fleet` — cross-part tooling ROI with JM fleet ledger corpus
- `quoting_machine_invest_roi` — candidate-machine payback with fleet eligibility check
- `quoting_dynamic_shop_rate` — utilization-band rate adjustment + rush-lead uplift

## Synergy chain (closes operator directive end-to-end)
```
WIZARD path                       PRINT-TO-CNC path
─────────────                     ───────────────────
3-machine wizard                  Full pipeline summary
(mill / lathe / wedm)             (CAD → CAM → G-code)
       │                                 │
       ▼                                 ▼
SpeedFeedToQuoteBridge (iter12)   GCodeTimeEstimatorEngine (iter13)
─ enrich cycle_min from           ─ gcode_text → cycle_min
  SpeedFeedOrchestrator           ─ tool_ids from T-words
  (MRR or feed-rate path)         ─ op_count from blocks
       │                                 │
       ▼                                 ▼
WizardToQuoteBridge ──────┬── PrintToProgramToQuoteBridge
(iter11)                          (iter11 + iter13)
─ machine_cost +                  ─ machine_cost + setup +
  setup + labor +                 ─ programming_cost + cad_gen_cost +
  electricity +                   ─ labor + utilities + overhead
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
                          │
                          ▼
              DynamicShopRateEngine (iter19)
              ─ wraps shop rates with capacity-band multipliers
                (rush+20% / busy+5% / baseline / capture-8% / deep-15%)
              ─ rush-lead uplift +10% when delivery < 7 days
              ─ ±50% total adjustment clamp

INVESTMENT side (iter17 + iter18):
  CrossPartToolingSynergyEngine (iter17)
    ─ analyzeFromJMFleet: corpus from real JM ledger (6,474 rows)
    ─ "what other parts benefit from this tool"
  MachineInvestmentROIEngine (iter18)
    ─ candidate machine vs incumbent: payback months + buy/consider/skip
    ─ Fleet eligibility gut-check from ledger
```

## Template-first discipline (THE design rule)
JM Die is the **first** profile, not the **only** profile. All hardcoded values live as `JM_DIE_FALLBACK` in `ShopProfileTemplateEngine.ts`. Any future shop adds `state/shared/shop-profiles/<shop-id>.json` — zero engine code change. Validated multiple ways:
- iter14 tests where ACME-shaped test profile overrides JM laser_marking rates without touching pricing-engine code
- iter17 customer/machine filters work against any ledger format
- iter18 incumbent_family lookup falls back to default_machine_rate with explicit warning
- iter19 bands fully configurable via constructor

## Caller-precedence rule (universal across all 6 bridges)
Caller-supplied values ALWAYS win over auto-estimated/profile-defaulted values. Bridges only fill **gaps** (estimated_cycle_min=0, tool_ids=[], op_count=0). CAM-supplied truth never gets overwritten by inferior auto-derivation.

## What did NOT need to be rebuilt (R8 read-before-write)
- SpeedFeedOrchestratorEngine (4000-LOC physics — `compute()` reused)
- GCodeTimeEstimatorEngine (4-dialect parser — `analyze()` reused)
- JMDieScanLedgerEngine (6,474-row ledger — extended with `readAllRows()`)
- SecondaryOpsQuotePricingEngine (11-op DEFAULT_CATALOG already JM-calibrated — extended with `priceOpsForProfile()`)
- CrossPartToolingSynergyEngine (extended with `analyzeFromJMFleet()`)
- LeadTimePricingTierEngine, TolerancePricingImpactEngine — already shipped earlier session

## Per-utility consumption (JM Die first profile)
| Machine | Water gph | Air cfh | Gas |
|---------|-----------|---------|-----|
| haas_vf2 (mill) | 3 | 20 | — |
| okuma_lb3000 (lathe) | 4 | 25 | — |
| sodick_aq537l (WEDM) | 12 (dielectric heavy) | 5 | — |
| ag_charm_form20 (sinker EDM) | 0 (dielectric oil) | 5 | — |
| studer_s33 (grinder) | 8 | 15 | — |

Load factor only derates **electricity** (Watt-hours-style). Water/air/gas are demand-driven and applied at full hourly rate × cycle_time (matches operator's utility bill).

## Dynamic shop rate bands (iter19)
| Loading | Multiplier | Band |
|---------|-----------|------|
| ≥ 0.85 | +20% | rush |
| 0.70-0.85 | +5% | busy |
| 0.50-0.70 | baseline | (none) |
| 0.25-0.50 | -8% | capture |
| < 0.25 | -15% | deep_discount |

Rush-lead uplift (+10%) stacks when delivery < 7 days. Total clamped to ±50% from baseline. All thresholds configurable via constructor.

## Follow-up units (NOT built — for future chats)
- **U-QP-OUTSOURCE-UI** — wire OutsourceRecommendEngine into QuotingWorkbenchPage
- **U-QP-DOC-LEVEL-TRAINING** — per-document calibration in DocustrataHistoricalPricingTrainerEngine
- **/system-viz roost** for the synergy chain — visualize the bridges + their wiring
- **QuotingWorkbenchPage** wire-in of the 11 new actions (UI is built but bridges aren't surfaced)
- **Smoothing window** for DynamicShopRateEngine (prevent hour-to-hour rate flapping)
- **Loading source integration** for dynamic shop rate (currently operator-supplied; future tick reads from scheduler/Capacity engine)

## Lessons
- **Peer absorption inevitable on shared tree** — iter16 wiki absorbed into alpha's COMBO-EFFICIENCY commit despite `[BOOTSTRAP-SLOT-ENFORCE]` prefix. File present, attribution lost. Per [[feedback_commit_to_slot_worktree]] this is the cost of working in `H:/prism` instead of `H:/prism-slot-charlie`.
- **Stale git locks** routinely needed `rm -f .git/index.lock` waits of 15-30s when peer slots held them mid-commit.
- **Test-legitimacy gate strict on weak assertions** — `toBeDefined()` blocked twice; replaced with concrete value checks.
- **Vitest workers can't `process.chdir()`** — for tests of singleton engines reading cwd-relative profile dirs, write profile JSON to canonical dir with unique test ids + cleanup in finally.

## See also
- [[reference_quoting_pipeline_ms0_assessment_2026_05_24]] — earlier charlie assessment that scoped these axes
- [[feedback_commit_to_slot_worktree]] — peer absorption doctrine
- [[reference_quoting_calibration_u_qt10_2026_05_25]] — calibration loop close (different scope, same domain)
- `knowledge/wiki/architecture/quoting-synergy-ms0.md` — full architecture writeup
