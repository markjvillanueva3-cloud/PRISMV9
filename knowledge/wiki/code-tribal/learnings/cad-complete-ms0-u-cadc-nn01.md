# CAD-COMPLETE-MS0/U-CADC-NN01 — [MAIN] [CAD-COMPLETE-MS0]/U-CADC-NN01 (slot:delta): CADFoundationEncoderEngine - shared CAD tokenizer + foundation encoder

**Commit:** `020f9d1838f0` · **By:** markjvillanueva3-cloud · **At:** 2026-05-20T22:07:01-05:00
**Tags:** cad-complete-ms0, u-cadc-nn01, auto-distilled

## Subject
[MAIN] [CAD-COMPLETE-MS0]/U-CADC-NN01 (slot:delta): CADFoundationEncoderEngine - shared CAD tokenizer + foundation encoder

## Body
```
[MAIN] [CAD-COMPLETE-MS0]/U-CADC-NN01 (slot:delta): CADFoundationEncoderEngine - shared CAD tokenizer + foundation encoder

Final stage of CAD closed-loop NN cluster (LP01->LP02->LP03->LP04->NN01).

Shared tokenizer + deterministic foundation encoder. Token ids derived from
CAD_OPERATION_KINDS (115 ops) in source-order: PAD=0, UNK=1, ops start at 2.
Adding a new op kind at end of CAD_OPERATION_KINDS is forward-compatible
(existing token ids never shift).

Embedding lookup: each tokenId hashes deterministically via LCG seeded on
tokenId*VOCAB_SEED_PRIME (Knuth multiplicative). No learned weights at this
layer - LP04's per-head linear value function rides on top. Same input
ALWAYS produces same embedding across restarts.

Unified embedding (17-d) concatenates:
- OP_EMBED_DIM (8) - mean-pooled, L2-normalized op-stream embedding
- BREP_FEATURE_DIM (5) - log-normalized vertex/edge/face/shell/solid counts
- SKETCH_FEATURE_DIM (4) - log-normalized entity/constraint/dimension/loop

API: encodeOperationStream / encodeBRepSummary / encodeSketchSummary /
encodeFull / tokenOf / getVocabulary / getStats.

Read-only dispatcher actions: cad_encoder_vocab + cad_encoder_stats
(mirror cad_replay_stats / cad_backprop_stats pattern from LP03/LP04).

vitest 16/16 PASS. Closed-form invariants regression-lock the LCG hash
(deterministic embedding determinism), reserved token ids (PAD=0/UNK=1),
sequential vocab order, L2 normalization (norm=1), log1p(1024)/log1p(1024)=1
mapping, monotone log-normalize, NaN/Infinity/negative input handling,
concat order (op|brep|sketch), counter increments, fail-loud TypeError on
non-array ops.

Files: engine (+275), test (+170, 16 cases), schema (+19, 2 actions),
dispatcher (+18, 2 cases).

Refs: BERT-style token embeddings (Devlin et al. 2018); foundation-model
pattern (Bommasani et al. 2021); CAD-specific tokenization (DeepCAD/
SkexGen 2021-2022); Knuth multiplicative hash constant.
```

## Files touched (5)
- .../__tests__/CADFoundationEncoderEngine.test.ts   | 182 +++++++++++++
- .../src/engines/CADFoundationEncoderEngine.ts      | 303 +++++++++++++++++++++
- mcp-server/src/schemas/cadActionSchemas.ts         |  20 ++
- mcp-server/src/tools/dispatchers/cadDispatcher.ts  |  14 +
- 4 files changed, 519 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 020f9d1838f0`
- Milestone envelope: `mcp-server/data/milestones/CAD-COMPLETE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._