---
name: reference_post_ship_quoting-synergy-ms0-u-machine-invest-from-fleet
description: Auto-distilled learnings from shipping QUOTING-SYNERGY-MS0/U-MACHINE-INVEST-FROM-FLEET (commit 60c9fbd8c). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.718Z
aliases: reference_post_ship_quoting-synergy-ms0-u-machine-invest-from-fleet
---


# QUOTING-SYNERGY-MS0/U-MACHINE-INVEST-FROM-FLEET

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-MACHINE-INVEST-FROM-FLEET (slot:charlie /goal-20 iter18): machine investment ROI w/ payback from JM fleet. New MachineInvestmentROIEngine.evaluate(proposal, opts): given candidate machine (family/domain/cost/rate/power/util) vs incumbent_family + migration_fraction + monthly_target_hours, computes per_hour_savings + monthly_migration_savings + annual + payback_months + buy/consider/skip per <=12/12-24/>24mo thresholds (matches CrossPartToolingSynergyEngine recommendation bands). Composes: ShopProfileTemplateEngine (incumbent rate lookup w/ default_machine_rate fallback + warning), JMDieScanLedgerEngine (eligibility gut-check — count of candidate_domain rows in fleet). Operator iter11 directive: 'roi investments on tooling or machines to improve cost efficiency for future orders'. New dispatcher action quoting_machine_invest_roi. 11/11 tests covering buy/consider/skip paths, candidate>=incumbent (no savings), zero migration_fraction, unknown incumbent (default + warn), zero domain-matching rows (warn), custom monthly_target_hours override, listIncumbentsByDomain helper. Total session 10 new quoting dispatcher actions across iters 11-15+17+18.

**Shipped:** 2026-05-25T21:32:49-05:00 by markjvillanueva3-cloud
**Files:** 5 touched

Full distillation: [[quoting-synergy-ms0-u-machine-invest-from-fleet]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._