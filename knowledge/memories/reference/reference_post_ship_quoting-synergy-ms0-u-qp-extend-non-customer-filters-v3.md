---
name: reference_post_ship_quoting-synergy-ms0-u-qp-extend-non-customer-filters-v3
description: Auto-distilled learnings from shipping QUOTING-SYNERGY-MS0/U-QP-EXTEND-NON-CUSTOMER-FILTERS-V3 (commit c83111d89). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.009Z
aliases: reference_post_ship_quoting-synergy-ms0-u-qp-extend-non-customer-filters-v3
---


# QUOTING-SYNERGY-MS0/U-QP-EXTEND-NON-CUSTOMER-FILTERS-V3

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-EXTEND-NON-CUSTOMER-FILTERS-V3 (slot:charlie iter41 2026-05-26): close iter40 regen R12 findings. iter40 NUMBERED_PRISM filter closed iter39 R12 but iter40 regen of baseline surfaced 6 NEW leak classes: TRIBAL+WIKI (15 records), TOOLING CAD FILES (9), OldVersions, CHAT-GPT TEST PROMPT PARTS, mill-turn / MILLTURN concat (machine-class iter37 pattern missed TURN trailing alt + no-separator concat form), POSTS AND MACHINES. Added PROJECT_DIR_NON_CUSTOMER regex covering corpus/test-scaffolding dirs + extended MACHINE_NON_CUSTOMER with MILLTURN/LATHETURN first-alt literals + TURN/TURNING trailing alt. 5 false-positive guards admit legitimate customers with OLD/TEST/TURN/CAD substrings (HOLOTEST CORP / OLDFIELD INDUSTRIES / TURNTECH PRECISION / CADWORKS LLC). 29/29 tests PASS in 113ms (24 iter40 anti-regression + 5 iter41 new). LIVE: regenerated baseline-records.json — 75 records, 75 unique pairs, ZERO leaks of any iter41 class verified by post-regen Grep.

**Shipped:** 2026-05-26T14:52:38-05:00 by markjvillanueva3-cloud
**Files:** 4 touched

Full distillation: [[quoting-synergy-ms0-u-qp-extend-non-customer-filters-v3]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._