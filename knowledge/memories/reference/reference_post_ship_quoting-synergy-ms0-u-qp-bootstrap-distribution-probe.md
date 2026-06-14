---
name: reference_post_ship_quoting-synergy-ms0-u-qp-bootstrap-distribution-probe
description: Auto-distilled learnings from shipping QUOTING-SYNERGY-MS0/U-QP-BOOTSTRAP-DISTRIBUTION-PROBE (commit 15b09088a). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.721Z
aliases: reference_post_ship_quoting-synergy-ms0-u-qp-bootstrap-distribution-probe
---


# QUOTING-SYNERGY-MS0/U-QP-BOOTSTRAP-DISTRIBUTION-PROBE

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-BOOTSTRAP-DISTRIBUTION-PROBE (slot:charlie /goal-yolo iter16): bootstrap --summary flag + summarizeRecordsDistribution pure function + 12-case test. Operators can confirm iter13 variance injection actually produced diverse records vs single-point collapse. Pure fn returns {total, machineClassHisto (desc by count), timeBucketHisto (asc by seconds), topCustomers (top-K by count), rateRange, materialRange}. main() --summary flag prints all 4 histograms to stderr after WROTE line. Tests: 5-record mixed cohort with 4 machine classes + 4 time buckets + 4 customers + rate range 75-110 + material range 20-60; empty records yields zeroed; null/non-array yields zeroed; topK respected with fractional flooring + topK=0 = empty; missing machine_class -> 'unknown' bucket; NaN/Infinity rate filtered from range; non-object rows skipped without throw; stable 6-key shape; time histo sorted asc; class histo sorted desc by count. iter9+iter13 anti-regression 43/43 PASS. Total iter9-16 quoting pipeline: 120 tests passing.

**Shipped:** 2026-05-26T02:59:24-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[quoting-synergy-ms0-u-qp-bootstrap-distribution-probe]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._