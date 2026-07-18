# QUOTING-SYNERGY-MS0/U-QP-PART-MINER — [MAIN] [QUOTING-SYNERGY-MS0]/U-QP-PART-MINER (slot:charlie): PO-aware part-number extraction (reliable join keys) [MAIN-FORCE]

**Commit:** `73ccad32e0cd` · **By:** markjvillanueva3-cloud · **At:** 2026-06-13T09:33:08-05:00
**Tags:** quoting-synergy-ms0, u-qp-part-miner, auto-distilled

## Subject
[MAIN] [QUOTING-SYNERGY-MS0]/U-QP-PART-MINER (slot:charlie): PO-aware part-number extraction (reliable join keys) [MAIN-FORCE]

## Body
```
[MAIN] [QUOTING-SYNERGY-MS0]/U-QP-PART-MINER (slot:charlie): PO-aware part-number extraction (reliable join keys) [MAIN-FORCE]

The PO part code often sits on the line AFTER the 'Part Number' label, and the generic
RE_PART grabbed a stray word ('use') -> noisy join keys. minePartNumber: label-on-own-line
(Part Number\n250-360LZBCAP) + NNN-XXXX inline shape + digit-gate that rejects word-noise.
Wired into classifyRow. +1 test (real JM part codes 250-360LZBCAP/WIDGET-7/96261; 'use'
rejected). 28/28 pass. Improves the standalone-actuals join keys for downstream prediction-match.
```

## Files touched (3)
- scripts/lib/docustrata-outcome-extract-lib.mjs      | 23 ++++++++++++++++++++++-
- scripts/lib/docustrata-outcome-extract-lib.test.mjs | 10 ++++++++++
- 2 files changed, 32 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 73ccad32e0cd`
- Milestone envelope: `mcp-server/data/milestones/QUOTING-SYNERGY-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._