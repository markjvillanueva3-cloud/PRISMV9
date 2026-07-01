---
name: reference_post_ship_quoting-synergy-ms0-u-qp-extractor-depth2
description: Auto-distilled learnings from shipping QUOTING-SYNERGY-MS0/U-QP-EXTRACTOR-DEPTH2 (commit 491ed8602). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.009Z
aliases: reference_post_ship_quoting-synergy-ms0-u-qp-extractor-depth2
---


# QUOTING-SYNERGY-MS0/U-QP-EXTRACTOR-DEPTH2

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-EXTRACTOR-DEPTH2 (slot:charlie /goal-yolo iter37): close iter34/iter36 follow-up — add HYBRID_NON_CUSTOMER + MACHINE_NON_CUSTOMER filters to isLikelyCustomer. Closes 2 leakage classes the iter9+iter35 regexes missed: (1) 2-word `<name> programs?` patterns like "MATTHEW programs" (internal programmer collections); (2) compound machine-class names like "WIRE EDM", "CNC OKUMA MULTUS", "CNC MILL HAAS", "HAAS-HURCO", "ROKU-ROKU", "OKUMA" (top-level dirs that hold real customers at depth=2, per iter36 layout audit). LIVE RESULT: top customers shifted from {WIRE EDM:15, CNC OKUMA MULTUS:9, ALLFAST:8, ATF:5, AGRATI:3} (iter36 pre-fix) to {ATF:14, ALLFAST:13, AGRATI:9, JM DIE COMPANY:4, GENERAL BANDAGES:4} — ALL real customers, ZERO machine-dir leakage. 22/22 tests PASS (18 anti-regression + 4 iter37 new — machine-compound + hybrid + path-extract + anti-FP). Conservative — `Acme Corp`, `Holo-Krome`, `ACUMENT GLOBAL TECHNOLOGIES`, `MANUFACTURING PROGRAMS LLC` all still accept as customers. machine_class variance collapsed back to mill-only (sampling artifact — most depth=4 files happen to be in mill dirs); subsequent iter could broaden sampling. Total iter9-37: 28 code units + 9 doc surfaces + 307 verified tests + 6 documented real findings + iter37 confirms iter36 structural finding.

**Shipped:** 2026-05-26T05:21:32-05:00 by markjvillanueva3-cloud
**Files:** 4 touched

Full distillation: [[quoting-synergy-ms0-u-qp-extractor-depth2]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._