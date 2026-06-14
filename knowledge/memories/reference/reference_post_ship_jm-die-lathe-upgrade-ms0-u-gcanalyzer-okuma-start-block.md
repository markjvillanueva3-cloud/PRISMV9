---
name: reference_post_ship_jm-die-lathe-upgrade-ms0-u-gcanalyzer-okuma-start-block
description: Auto-distilled learnings from shipping JM-DIE-LATHE-UPGRADE-MS0/U-GCANALYZER-OKUMA-START-BLOCK (commit ab0a6e0f9). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.520Z
aliases: reference_post_ship_jm-die-lathe-upgrade-ms0-u-gcanalyzer-okuma-start-block
---


# JM-DIE-LATHE-UPGRADE-MS0/U-GCANALYZER-OKUMA-START-BLOCK

[MAIN] [JM-DIE-LATHE-UPGRADE-MS0]/U-GCANALYZER-OKUMA-START-BLOCK (slot:whiskey iter17): okuma controller safe-start drops mill-centric codes (G80/G40/G49/G17) — keeps only G90 absolute positioning (universally required). [BOOTSTRAP-SLOT-ENFORCE]. Okuma OSP-controller lathes default-init to G90+G40+lathe-mode at power-on — Fanuc mill subset (G80 canned cancel, G49 tool offset cancel, G17 XY plane) is dialect-inappropriate for lathe programs. Cuts HIGH-18 false-positive rate 5x on JM Die corpus (5 missing codes per program → 1). Remaining G90 finding is honest lint (declare-explicit-default-state). Follow-up: U-OKUMA-LATHE-G50-CHECK adds dedicated G50 max-RPM-clamp rule.

**Shipped:** 2026-05-24T17:57:57-05:00 by markjvillanueva3-cloud
**Files:** 2 touched

Full distillation: [[jm-die-lathe-upgrade-ms0-u-gcanalyzer-okuma-start-block]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._