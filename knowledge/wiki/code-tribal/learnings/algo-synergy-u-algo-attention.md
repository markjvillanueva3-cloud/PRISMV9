# ALGO-SYNERGY/U-ALGO-ATTENTION — [MAIN] [ALGO-SYNERGY]/U-ALGO-ATTENTION: ScaledDotProductAttention (Transformer) + prism_algorithm ml_attention (slot:tango)

**Commit:** `2b0993e197e1` · **By:** markjvillanueva3-cloud · **At:** 2026-05-29T11:02:48-05:00
**Tags:** algo-synergy, u-algo-attention, auto-distilled

## Subject
[MAIN] [ALGO-SYNERGY]/U-ALGO-ATTENTION: ScaledDotProductAttention (Transformer) + prism_algorithm ml_attention (slot:tango)

## Body
```
[MAIN] [ALGO-SYNERGY]/U-ALGO-ATTENTION: ScaledDotProductAttention (Transformer) + prism_algorithm ml_attention (slot:tango)

Algorithm-gen /loop next-batch: NEW deep-learning primitive (#4 priority). softmax(QK^T/sqrt(d_k)+mask)V — pure deterministic operator, numerically-stable row-wise max-shift softmax, optional causal + additive masking. Composes with the ml_activation softmax. Algorithm<I,O> (validate/calculate/getMetadata), Vaswani 2017 ref. Wired ml_attention (validate-then-calculate -> err not crash). 36/36 tests PASS (16 algorithm hand-verified reference: uniform/sharp/causal/mask + 5 failure + 3 adversarial incl. fully-masked-row stays finite; 20 synergy incl. z.enum membership). ml_* group 10->11.
```

## Files touched (5)
- mcp-server/src/algorithms/ScaledDotProductAttention.test.ts          | 142 ++++++++++++++++++++++++++++++++++++++
- mcp-server/src/algorithms/ScaledDotProductAttention.ts               | 229 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/tools/dispatchers/algorithmDispatcher.synergy.test.ts |  22 ++++++
- mcp-server/src/tools/dispatchers/algorithmDispatcher.ts              |  24 ++++++-
- 4 files changed, 416 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 2b0993e197e1`
- Milestone envelope: `mcp-server/data/milestones/ALGO-SYNERGY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._