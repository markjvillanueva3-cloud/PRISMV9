---
name: reference_post_ship_quoting-synergy-ms0-u-qp-bootstrap-remediation
description: Auto-distilled learnings from shipping QUOTING-SYNERGY-MS0/U-QP-BOOTSTRAP-REMEDIATION (commit 8235c3c72). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.722Z
aliases: reference_post_ship_quoting-synergy-ms0-u-qp-bootstrap-remediation
---


# QUOTING-SYNERGY-MS0/U-QP-BOOTSTRAP-REMEDIATION

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-BOOTSTRAP-REMEDIATION (slot:charlie /goal-yolo iter34): executed iter33 remediation, regenerated baseline + surfaced 2 NEW real findings per R12 fail-loud. Ran 'node scripts/quoting-baseline-bootstrap.mjs --limit 30 --scan-archive --scan-max-depth 4 --scan-max-files 2000 --summary'. Result: WROTE 30 records, time_bucket_s spreads 3 ways (600:8 + 1800:19 + 3600:3 — iter13 + iter16 working correctly when input has variety). New findings: F1 iter9 NON_CUSTOMER_SUBDIRS regex is whole-segment-anchored (^_?(...) $) so 'PRISM MODIFIED POST PROCESSORS' and 'HURCO CNC PROGRAMS' slip through despite containing POST PROCESSORS / CNC PROGRAMS substrings — needs word-boundary \b matching OR explicit JM-Die-prefix patterns; F2 JM Die archive top-level layout doesn't match iter9's /JM DIE/CUSTOMER/MACHINE/file assumption — top-level subdirs at depth<=4 are configuration directories, real customers (ALCOA, ITW, etc.) likely deeper. Both tracked as P1+P2 small follow-up units: U-QP-BOOTSTRAP-FILTER-EXTEND-V2 + U-QP-JM-DIE-LAYOUT-AUDIT. iter32+iter33+iter34 consecutive real-data findings prove the substrate's self-auditing capability is the load-bearing dividend of iter9-31 build-out. Total iter9-34: 25 code units + 8 doc surfaces + 281 verified tests + 3 live-run evidence files + 4 documented real findings.

**Shipped:** 2026-05-26T04:50:04-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[quoting-synergy-ms0-u-qp-bootstrap-remediation]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._