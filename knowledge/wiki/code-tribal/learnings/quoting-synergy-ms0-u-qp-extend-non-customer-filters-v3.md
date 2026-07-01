# QUOTING-SYNERGY-MS0/U-QP-EXTEND-NON-CUSTOMER-FILTERS-V3 — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-EXTEND-NON-CUSTOMER-FILTERS-V3 (slot:charlie iter41 2026-05-26): close iter40 regen R12 findings. iter40 NUMBERED_PRISM filter closed iter39 R12 but iter40 regen of baseline surfaced 6 NEW leak classes: TRIBAL+WIKI (15 records), TOOLING CAD FILES (9), OldVersions, CHAT-GPT TEST PROMPT PARTS, mill-turn / MILLTURN concat (machine-class iter37 pattern missed TURN trailing alt + no-separator concat form), POSTS AND MACHINES. Added PROJECT_DIR_NON_CUSTOMER regex covering corpus/test-scaffolding dirs + extended MACHINE_NON_CUSTOMER with MILLTURN/LATHETURN first-alt literals + TURN/TURNING trailing alt. 5 false-positive guards admit legitimate customers with OLD/TEST/TURN/CAD substrings (HOLOTEST CORP / OLDFIELD INDUSTRIES / TURNTECH PRECISION / CADWORKS LLC). 29/29 tests PASS in 113ms (24 iter40 anti-regression + 5 iter41 new). LIVE: regenerated baseline-records.json — 75 records, 75 unique pairs, ZERO leaks of any iter41 class verified by post-regen Grep.

**Commit:** `c83111d8936b` · **By:** markjvillanueva3-cloud · **At:** 2026-05-26T14:52:38-05:00
**Tags:** quoting-synergy-ms0, u-qp-extend-non-customer-filters-v3, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-EXTEND-NON-CUSTOMER-FILTERS-V3 (slot:charlie iter41 2026-05-26): close iter40 regen R12 findings. iter40 NUMBERED_PRISM filter closed iter39 R12 but iter40 regen of baseline surfaced 6 NEW leak classes: TRIBAL+WIKI (15 records), TOOLING CAD FILES (9), OldVersions, CHAT-GPT TEST PROMPT PARTS, mill-turn / MILLTURN concat (machine-class iter37 pattern missed TURN trailing alt + no-separator concat form), POSTS AND MACHINES. Added PROJECT_DIR_NON_CUSTOMER regex covering corpus/test-scaffolding dirs + extended MACHINE_NON_CUSTOMER with MILLTURN/LATHETURN first-alt literals + TURN/TURNING trailing alt. 5 false-positive guards admit legitimate customers with OLD/TEST/TURN/CAD substrings (HOLOTEST CORP / OLDFIELD INDUSTRIES / TURNTECH PRECISION / CADWORKS LLC). 29/29 tests PASS in 113ms (24 iter40 anti-regression + 5 iter41 new). LIVE: regenerated baseline-records.json — 75 records, 75 unique pairs, ZERO leaks of any iter41 class verified by post-regen Grep.

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-EXTEND-NON-CUSTOMER-FILTERS-V3 (slot:charlie iter41 2026-05-26): close iter40 regen R12 findings. iter40 NUMBERED_PRISM filter closed iter39 R12 but iter40 regen of baseline surfaced 6 NEW leak classes: TRIBAL+WIKI (15 records), TOOLING CAD FILES (9), OldVersions, CHAT-GPT TEST PROMPT PARTS, mill-turn / MILLTURN concat (machine-class iter37 pattern missed TURN trailing alt + no-separator concat form), POSTS AND MACHINES. Added PROJECT_DIR_NON_CUSTOMER regex covering corpus/test-scaffolding dirs + extended MACHINE_NON_CUSTOMER with MILLTURN/LATHETURN first-alt literals + TURN/TURNING trailing alt. 5 false-positive guards admit legitimate customers with OLD/TEST/TURN/CAD substrings (HOLOTEST CORP / OLDFIELD INDUSTRIES / TURNTECH PRECISION / CADWORKS LLC). 29/29 tests PASS in 113ms (24 iter40 anti-regression + 5 iter41 new). LIVE: regenerated baseline-records.json — 75 records, 75 unique pairs, ZERO leaks of any iter41 class verified by post-regen Grep.
```

## Files touched (4)
- scripts/quoting-baseline-bootstrap.filter.test.mjs | 128 +++++
- scripts/quoting-baseline-bootstrap.mjs             |  25 +-
- state/shared/quoting/baseline-records.json         | 548 ++++++++++++---------
- 3 files changed, 456 insertions(+), 245 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show c83111d8936b`
- Milestone envelope: `mcp-server/data/milestones/QUOTING-SYNERGY-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._