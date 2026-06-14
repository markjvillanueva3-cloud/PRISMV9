---
name: reference_post_ship_jm-die-lathe-upgrade-ms0-u-audit-findings-brief
description: Auto-distilled learnings from shipping JM-DIE-LATHE-UPGRADE-MS0/U-AUDIT-FINDINGS-BRIEF (commit d99d41cdd). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.516Z
aliases: reference_post_ship_jm-die-lathe-upgrade-ms0-u-audit-findings-brief
---


# JM-DIE-LATHE-UPGRADE-MS0/U-AUDIT-FINDINGS-BRIEF

[MAIN] [JM-DIE-LATHE-UPGRADE-MS0]/U-AUDIT-FINDINGS-BRIEF (slot:whiskey iter13): operator briefing on 32K-variant audit results. [BOOTSTRAP-SLOT-ENFORCE]. 99.9% FAIL rate (32,722 of 32,756). Root-cause analysis identifies 3 distinct gaps: (1) U-UPGRADE-BODY-RESCALE — V2 doesn't body-rescale toolpaths per target envelope (primary safety gap); (2) U-GCANALYZER-MODAL-F-TRACK — false-positive on modal F-rate; (3) U-GCANALYZER-OKUMA-START-BLOCK — controller-dialect false-positive. Operator action: pull no variant onto shop floor until U-UPGRADE-BODY-RESCALE ships. Audit pipeline now standing safety net + canonical template for U-UPGRADE-MILL/WEDM/WELDER.

**Shipped:** 2026-05-24T17:34:27-05:00 by markjvillanueva3-cloud
**Files:** 2 touched

Full distillation: [[jm-die-lathe-upgrade-ms0-u-audit-findings-brief]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._