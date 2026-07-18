# ALGO-SYNERGY/U-ALGO-VITERBI — [MAIN] [ALGO-SYNERGY]/U-ALGO-VITERBI: ViterbiDecoder (HMM MAP decoding) + prism_algorithm ml_viterbi (slot:tango)

**Commit:** `df9ddeafa118` · **By:** markjvillanueva3-cloud · **At:** 2026-05-29T11:26:41-05:00
**Tags:** algo-synergy, u-algo-viterbi, auto-distilled

## Subject
[MAIN] [ALGO-SYNERGY]/U-ALGO-VITERBI: ViterbiDecoder (HMM MAP decoding) + prism_algorithm ml_viterbi (slot:tango)

## Body
```
[MAIN] [ALGO-SYNERGY]/U-ALGO-VITERBI: ViterbiDecoder (HMM MAP decoding) + prism_algorithm ml_viterbi (slot:tango)

Algorithm-gen /loop next-batch: NEW deep-reasoning primitive (#6). Exact maximum-a-posteriori hidden-state-sequence decoding via the Viterbi DP in log space (underflow-safe, log(0)=-Inf for impossible transitions). O(T*N^2), no convergence/precision risk. Wireable pure-data I/O (unlike MCTS callbacks). Canonical deep-reasoning primitive: alarm/phase/regime decoding from telemetry, OCR disambiguation. Algorithm<I,O>, prob+logInput modes, empty-seq + impossible-path + non-stochastic-row handling. Wired ml_viterbi (validate-then-calculate -> err). 40/40 tests PASS (14 algorithm: textbook healthy/fever HMM path [0,0,1] P=0.01512, single-obs argmax, logInput parity, impossible-transition, determinism + 4 failure + 2 adversarial; 26 synergy incl. z.enum membership). ml_* group 12->13.
```

## Files touched (5)
- mcp-server/src/algorithms/ViterbiDecoder.test.ts                     | 118 +++++++++++++++++++++++++++++
- mcp-server/src/algorithms/ViterbiDecoder.ts                          | 251 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/tools/dispatchers/algorithmDispatcher.synergy.test.ts |  25 ++++++
- mcp-server/src/tools/dispatchers/algorithmDispatcher.ts              |  23 +++++-
- 4 files changed, 416 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show df9ddeafa118`
- Milestone envelope: `mcp-server/data/milestones/ALGO-SYNERGY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._