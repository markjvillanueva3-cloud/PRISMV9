# SFC-JM-ACCURACY/U-OSC-JM-DATASET-EXPORT — [MAIN-FORCE] [SFC-JM-ACCURACY]/U-OSC-JM-DATASET-EXPORT (slot:oscar): --dataset JSONL export of the JM-accuracy comparison for india LoRA/GNN

**Commit:** `2dea43bb33c1` · **By:** markjvillanueva3-cloud · **At:** 2026-06-25T03:32:50-05:00
**Tags:** sfc-jm-accuracy, u-osc-jm-dataset-export, auto-distilled

## Subject
[MAIN-FORCE] [SFC-JM-ACCURACY]/U-OSC-JM-DATASET-EXPORT (slot:oscar): --dataset JSONL export of the JM-accuracy comparison for india LoRA/GNN

## Body
```
[MAIN-FORCE] [SFC-JM-ACCURACY]/U-OSC-JM-DATASET-EXPORT (slot:oscar): --dataset JSONL export of the JM-accuracy comparison for india LoRA/GNN

Bridges priority 3 (test PRISM vs ALL JM parts) -> priority 4 (feed the dataset to india). Adds a pure
exported toDatasetRows(rows) mapper + a `--dataset` CLI mode that emits the comparable PRISM-vs-JM configs
as flat JSONL (one per line): iso/operation/op_class, jm_css_mpm + prism_css_band + css_verdict +
css_delta_pct, jm_feed_mm_rev + prism_feed_band + feed_verdict + feed_delta_pct, classification, confidence,
sample_count. Verified units (css SFM*0.3048, feed IPR*25.4). JM labels are the GUIDELINE-to-test-against
(not trusted); the PRISM-vs-JM verdicts are the supervised signal.

Additive: DATASET branch precedes the unchanged --json + text paths. 19/19 tests (+1: the flat schema +
verified-unit values). Live: emits clean JSONL (P od_roughing -> jm_css 61 conservative, jm_feed 0.127
in-band, 496 samples). Per-unit reviewer deferred to the Stop 3-of-3 (token budget; pure additive mapper).
```

## Files touched (3)
- mcp-server/scripts/sfc-jm-proven-divergence.mjs      | 18 +++++++++++++++++-
- mcp-server/scripts/sfc-jm-proven-divergence.test.mjs | 21 ++++++++++++++++++++-
- 2 files changed, 37 insertions(+), 2 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 2dea43bb33c1`
- Milestone envelope: `mcp-server/data/milestones/SFC-JM-ACCURACY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._