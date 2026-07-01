# CAD-DRAW-MAX-MS0/P1-U06 — [MAIN] [CAD-DRAW-MAX-MS0]/P1-U06 (slot:delta): CADOperationDecoderEngine - generative head (intent + sequence templates)

**Commit:** `bc672ebdc015` · **By:** markjvillanueva3-cloud · **At:** 2026-05-21T12:06:27-05:00
**Tags:** cad-draw-max-ms0, p1-u06, auto-distilled

## Subject
[MAIN] [CAD-DRAW-MAX-MS0]/P1-U06 (slot:delta): CADOperationDecoderEngine - generative head (intent + sequence templates)

## Body
```
[MAIN] [CAD-DRAW-MAX-MS0]/P1-U06 (slot:delta): CADOperationDecoderEngine - generative head (intent + sequence templates)

Generative head closure. LP04 only *scores* op sequences via v=θ·φ — it
can rank but cannot emit. This decoder closes the gap: given an op-stream
context plus a natural-language intent string, propose the next
CADOperation (or top-K candidates) for the AI to ship through
HyperCADSLiveBridgeEngine.

Phase 1: deterministic rule-based decoder with three priority tiers.
Interface stays stable; Phase 2 back-replaces proposeNextOpInternal
with an autoregressive head conditioned on NN01.encodeFull + LP04
per-head value scores. Callers (hypercads_live_* orchestration,
cad_design_plan downstream) bind once.

Priority 1 — intent override (10 rules):
  - fillet/chamfer/revolve/hole-drill/shell-hollow/pattern-array/export-step
  - sketch/extrude-boss-protrusion/cut-pocket
  - Number parser pulls first match from intent string for arg defaults
  - Score 0.95, source: "intent"

Priority 2 — sequence templates (4 rules):
  - empty history → sketch_create (score 0.85)
  - after sketch_create → feature_extrude new_body distance=10 (0.80)
  - after feature_extrude → feature_fillet radius=1 (0.60)
  - ≥5 feature_* ops → export_step (0.55)
  - Score range 0.55-0.85, source: "sequence-template"

Priority 3 — fallback (opt-out via useFallback=false):
  - feature_extrude default args, score 0.30, source: "fallback"

4 dispatcher actions:
- cad_decoder_propose       (single best next op)
- cad_decoder_propose_topk  (top-K candidates, deduped by kind)
- cad_decoder_vocab         (forwarded CAD_OPERATION_KINDS for NN01 symmetry)
- cad_decoder_stats         (counters per source bucket)

19/19 vitest PASS:
- empty context → sketch_create on XY (sequence template)
- after sketch_create → feature_extrude new_body distance=10
- after feature_extrude → feature_fillet
- intent "fillet 2.5mm radius" → feature_fillet radius=2.5 (intent
  wins over template)
- intent "drill 6mm hole" → feature_hole diameter=6
- intent "extrude 25 boss" → feature_extrude new_body distance=25
- intent "cut pocket 3" → feature_extrude OP=cut distance=3
- intent without number → kind matched, args use default
- intent "export to step" → export_step
- ≥5 feature_* → export_step (sequence threshold)
- useFallback=false + nothing matches → null + totalNullProposals++
- useFallback=true (default) + nothing matches → feature_extrude
  fallback score=0.30
- R12: non-array history throws TypeError
- topK ordering: scores descending, kinds unique (deduped)
- topK with multi-intent ("fillet then chamfer") → both matched in
  intent priority
- topK R12: k=0 / negative / NaN → throws TypeError
- getVocabulary forwards CAD_OPERATION_KINDS verbatim (NN01 symmetry)
- stats track 5 counters: proposals/intent/template/fallback/null
- pattern intent count=1 clipped to ≥2

Files: engine (+225), test (+170, 19 cases), schema (+22, 4 entries),
dispatcher (+28, 4 cases).

Refs: CADFoundationEncoderEngine (NN01, U-CADC-NN01); CADArgEncoderEngine
(P1-U04, this milestone); MasterBrainBackpropPropagatorEngine (LP04).
```

## Files touched (5)
- .../__tests__/CADOperationDecoderEngine.test.ts    | 171 ++++++++++++++
- .../src/engines/CADOperationDecoderEngine.ts       | 263 +++++++++++++++++++++
- mcp-server/src/schemas/cadActionSchemas.ts         |  24 ++
- mcp-server/src/tools/dispatchers/cadDispatcher.ts  |  27 +++
- 4 files changed, 485 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show bc672ebdc015`
- Milestone envelope: `mcp-server/data/milestones/CAD-DRAW-MAX-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._