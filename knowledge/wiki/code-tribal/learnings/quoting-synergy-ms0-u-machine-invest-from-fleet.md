# QUOTING-SYNERGY-MS0/U-MACHINE-INVEST-FROM-FLEET — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-MACHINE-INVEST-FROM-FLEET (slot:charlie /goal-20 iter18): machine investment ROI w/ payback from JM fleet. New MachineInvestmentROIEngine.evaluate(proposal, opts): given candidate machine (family/domain/cost/rate/power/util) vs incumbent_family + migration_fraction + monthly_target_hours, computes per_hour_savings + monthly_migration_savings + annual + payback_months + buy/consider/skip per <=12/12-24/>24mo thresholds (matches CrossPartToolingSynergyEngine recommendation bands). Composes: ShopProfileTemplateEngine (incumbent rate lookup w/ default_machine_rate fallback + warning), JMDieScanLedgerEngine (eligibility gut-check — count of candidate_domain rows in fleet). Operator iter11 directive: 'roi investments on tooling or machines to improve cost efficiency for future orders'. New dispatcher action quoting_machine_invest_roi. 11/11 tests covering buy/consider/skip paths, candidate>=incumbent (no savings), zero migration_fraction, unknown incumbent (default + warn), zero domain-matching rows (warn), custom monthly_target_hours override, listIncumbentsByDomain helper. Total session 10 new quoting dispatcher actions across iters 11-15+17+18.

**Commit:** `60c9fbd8c7a1` · **By:** markjvillanueva3-cloud · **At:** 2026-05-25T21:32:49-05:00
**Tags:** quoting-synergy-ms0, u-machine-invest-from-fleet, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-MACHINE-INVEST-FROM-FLEET (slot:charlie /goal-20 iter18): machine investment ROI w/ payback from JM fleet. New MachineInvestmentROIEngine.evaluate(proposal, opts): given candidate machine (family/domain/cost/rate/power/util) vs incumbent_family + migration_fraction + monthly_target_hours, computes per_hour_savings + monthly_migration_savings + annual + payback_months + buy/consider/skip per <=12/12-24/>24mo thresholds (matches CrossPartToolingSynergyEngine recommendation bands). Composes: ShopProfileTemplateEngine (incumbent rate lookup w/ default_machine_rate fallback + warning), JMDieScanLedgerEngine (eligibility gut-check — count of candidate_domain rows in fleet). Operator iter11 directive: 'roi investments on tooling or machines to improve cost efficiency for future orders'. New dispatcher action quoting_machine_invest_roi. 11/11 tests covering buy/consider/skip paths, candidate>=incumbent (no savings), zero migration_fraction, unknown incumbent (default + warn), zero domain-matching rows (warn), custom monthly_target_hours override, listIncumbentsByDomain helper. Total session 10 new quoting dispatcher actions across iters 11-15+17+18.

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-MACHINE-INVEST-FROM-FLEET (slot:charlie /goal-20 iter18): machine investment ROI w/ payback from JM fleet. New MachineInvestmentROIEngine.evaluate(proposal, opts): given candidate machine (family/domain/cost/rate/power/util) vs incumbent_family + migration_fraction + monthly_target_hours, computes per_hour_savings + monthly_migration_savings + annual + payback_months + buy/consider/skip per <=12/12-24/>24mo thresholds (matches CrossPartToolingSynergyEngine recommendation bands). Composes: ShopProfileTemplateEngine (incumbent rate lookup w/ default_machine_rate fallback + warning), JMDieScanLedgerEngine (eligibility gut-check — count of candidate_domain rows in fleet). Operator iter11 directive: 'roi investments on tooling or machines to improve cost efficiency for future orders'. New dispatcher action quoting_machine_invest_roi. 11/11 tests covering buy/consider/skip paths, candidate>=incumbent (no savings), zero migration_fraction, unknown incumbent (default + warn), zero domain-matching rows (warn), custom monthly_target_hours override, listIncumbentsByDomain helper. Total session 10 new quoting dispatcher actions across iters 11-15+17+18.
```

## Files touched (5)
- .../src/__tests__/MachineInvestmentROI.test.ts     | 189 +++++++++++++++++++
- .../src/engines/MachineInvestmentROIEngine.ts      | 204 +++++++++++++++++++++
- mcp-server/src/schemas/quotingActionSchemas.ts     |  17 ++
- .../src/tools/dispatchers/quotingDispatcher.ts     |   9 +
- 4 files changed, 419 insertions(+)

## Lessons surfaced in commit body
- til) vs incumbent_family + migration_fraction + monthly_target_hours, computes per_hour_savings + monthly_migration_savings + annual + payback_months + buy/consider/skip per <=12/12-24/>24mo thresholds (matches CrossPartToolingSynergyEngine recommendation bands). Composes: ShopProfileTemplateEngine (incumbent rate lookup w/ default_machine_rate fallback + warning), JMDieScanLedgerEngine (eligibility

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 60c9fbd8c7a1`
- Milestone envelope: `mcp-server/data/milestones/QUOTING-SYNERGY-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._