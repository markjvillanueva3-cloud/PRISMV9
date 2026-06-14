---
name: reference_post_ship_quoting-synergy-ms0-u-cross-part-synergy-from-jm-fleet
description: Auto-distilled learnings from shipping QUOTING-SYNERGY-MS0/U-CROSS-PART-SYNERGY-FROM-JM-FLEET (commit 909b4025f). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.717Z
aliases: reference_post_ship_quoting-synergy-ms0-u-cross-part-synergy-from-jm-fleet
---


# QUOTING-SYNERGY-MS0/U-CROSS-PART-SYNERGY-FROM-JM-FLEET

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-CROSS-PART-SYNERGY-FROM-JM-FLEET (slot:charlie /goal-20 iter17): cross-part tooling/machine ROI auto-runs over JM Die fleet ledger (6,474 rows). CrossPartToolingSynergyEngine +analyzeFromJMFleet(proposal, opts) reads state/shared/scan-tracking/jm-die-scan-ledger.jsonl via JMDieScanLedgerEngine +readAllRows() method. Maps LedgerRow.abs_path -> customer (path-token extraction after JM DIE/CNC X/) + part_id (filename) + process (mill->milling, lathe->turning, wedm/sinker/grinder). Optional customerFilter + machineFamilyFilter narrow corpus. Default annualVolumePerPart=100 (operator overrides). Fail-soft: missing ledger -> empty corpus +warning, malformed -> ok:false. Dedup on (customer, part_id) — same part across multiple files counts once. Closes operator iter11 directive: 'additional benefits for other parts that can utilize tooling or machine upgrade for higher cost efficiency'. New dispatcher action quoting_cross_part_synergy_from_fleet. 48/48 tests (+7: ledger-corpus build, customer filter, machine_family filter, dedup, missing-ledger fallback, bad-proposal reject, mixed slash/backslash paths).

**Shipped:** 2026-05-25T21:23:07-05:00 by markjvillanueva3-cloud
**Files:** 6 touched

Full distillation: [[quoting-synergy-ms0-u-cross-part-synergy-from-jm-fleet]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._