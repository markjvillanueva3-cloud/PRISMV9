# USE-IT-ALL Fleet Campaign -- 2026-06-28 (dispatched by slot:charlie)

> Operator: "do it all including all cross session work." This is the dependency-ordered,
> per-owner work-order spec for the fleet-scale directive (utilize ALL JM data + courses +
> monolith modules; train/reason/price/print-to-quote/ROI; synergize+pipeline+wire to FE;
> validate everything built). Honest scope (R12): charlie owns the quoting slice (DONE this
> session); the rest is cross-galaxy and dispatched to owning slots via the chat bus.

## Ground truth (enumerated, ALL-MEANS-ALL real counts)
- JM corpus: **317,141 files** (119K NC, 85K PDF, 35K Hurco .min, 15K Mastercam, 10K Inventor, 2K STEP)
- Quoting/training/print-to-quote/ROI/similar engines: **~110 built** (15 FE pages, 5 routes, ~17 actions)
- Business/lean/ERP/finance/math course entries: **2,626**
- Monolith/extracted-module wiki entries: **1,680**
- Test surface: **5,189 files** (123 dispatchers)

## DONE this session (charlie)
- Levers 1/2/3 (stock-volume resolver, live-MAPE feed, calibration-aware CI): `b6f088939d`, `0e64fc2d45`, `c084c2dc40`
- WIRE-EXEMPT marker: `4921cfd27b`
- Simulated-quote E2E validation (11/11, backend HEALTHY): `e1ee851969`
- All 3-of-3 scrutiny PASS.

## Cross-galaxy work orders (dependency-ordered, per owner)

### W1 -- [xray] OCR 12,761 Orders-Closed POs -> real (pred,actual) pairs  [HIGHEST LEVERAGE]
The DATA unblock. charlie shipped the wire (Lever 2 live-MAPE feed) that auto-tightens the
calibration band as real pairs accumulate -- but the band runs theory-only until pairs exist.
OCR the POs, extract (quoted, actual) -> feed QuoteOutcomeFeedEngine -> closed-loop MAPE drops
-> the live CI band tightens automatically. Blocks: nothing. Unblocks: real quote accuracy.

### W2 -- [india + juliett] Train on the 317K JM corpus
Engines exist (JMDieFleetWideIngest, QuotingTrainingOrchestrator, JMDieProgramRAG). Scale the
ingest from sample to the full 119K NC + 35K .min + 85K PDF. juliett owns ingestion/schema;
india owns the NN/GNN/LoRA/RAG training. Feeds: speeds/feeds priors, tool sequences, real pricing.

### W3 -- [charlie DONE: the no-OCR adapter] + [juliett: the OCR upgrade]
**charlie shipped the v1 adapter** (`2d97fa8857`, U-QP-JM-PARTSPEC-ADAPTER): JMDiePartSpecAdapterEngine
maps a JMDiePartRecord -> a PARTIAL PartSpec (machine_type/operations/material from the file-join
index; geometry left undefined, not fabricated) + wired as prism_quoting:quoting_find_similar_jm_parts.
So PartSimilarity now ranks a new part against the LIVE 30,890-record corpus on material+machine+ops.
**W3+ upgrade (juliett):** add the print-OCR path (BlueprintVisionOCR/PDFBlueprintDimensionExtractor)
so the adapter also fills dimensions/features/tolerances from the linked prints -- a full geometric
spec, not just the file-join signal. That OCR extraction is juliett/delta domain.

### W4 -- [lima + hotel] Expose the 2,626 course entries to quoting reasoning
Business mgmt / lean / ERP / finance / advanced-math course knowledge exists in the vault. Wire
it through the knowledge dispatcher (knowledgeDispatcher / documentLearningDispatcher) so the
quoting + ROI reasoning can cite lean/finance/costing principles. lima owns courses; hotel owns
business/ERP framing. charlie's ROIAdvisor/MakeVsBuy consume.

### W5 -- [tango + sierra] Monolith / extracted-module re-integration audit
1,680 monolith-module wiki entries. tango (algorithm/engine discovery) audits which extracted
modules are wired vs orphaned; sierra (system-viz/integration) re-wires the valuable orphans.

### W6 -- [quebec] Dead-panel sweep across the 15 quoting FE pages
QuoteBuilderPage, CostEstimatorPage, MarketPricingIntelligencePage, RFQInboxPage, etc. -- live
browser probe each, confirm its /api/v1 route returns real data (not a dead/empty panel). charlie
fixed several envelope/redaction/shape bugs already; quebec owns the FE polish + remaining panels.

## Coordination
- This spec + the chat-bus dispatch (`AGENT_CHAT.jsonl`, type:campaign-dispatch) notify the fleet.
- Each slot picks up its W# in its own worktree/branch; charlie does NOT execute other slots'
  sessions (separate processes). charlie remains available to consume W3/W4 outputs into quoting.
- Done-signal: each W# committed + 3-of-3 scrutiny by its owner; campaign closed when W1-W6 land.
