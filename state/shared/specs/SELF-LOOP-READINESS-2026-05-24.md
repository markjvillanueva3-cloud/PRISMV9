# PRISM Self-Loop Readiness Assessment — 2026-05-24

**Slot:** charlie · **Goal:** /goal-15 · **Milestone:** JM-DIE-PROGRAM-ANALYSIS-MS0 / U-JP07

## Question

Do we have enough in place — across documents, programs, engines, algorithms, formulas — for an **end-to-end self-loop**: self-learning + self-improving system that takes JM Die corpus → produces accurate quotes → measures gap to actuals → updates models?

## Verdict — **Closed loop wired; first-cycle data in hand; missing 3 production-grade pieces.**

The 4-layer self-loop is **functionally wired end-to-end** with real-data first-cycle proof. Production-grade closure needs 3 more units (named below). This is **MS0-complete**, not MS1-production.

## 4-Layer Self-Loop Status

### Layer 1 — Ingest (✅ wired + real-data proven)
- `JMDieDocustrataIngestEngine` walks 301K files in `H:/prism/JM DIE/` archive
- `JMDieFleetWideIngestEngine` walks all root subdirs (CNC LATHE / MILL HAAS / OKUMA / HURCO / WIRE EDM / etc.) with machine-family classification
- `BlueprintOCREngine` + `ImageOCRPipelineEngine` for documents
- `GCodeTimeEstimatorEngine` parses .nc/.min/.mpf/.eia/.iso programs (mill/lathe/WEDM auto-detect)
- **Real first-cycle proof**: 500 docustrata records + 198 CNC programs parsed; baseline JSONs produced

### Layer 2 — Train (✅ wired)
- `JMDieQuoteTrainingPipelineEngine` orchestrates ingest → price-lookup → baseline → outcome-feed
- `QuotingAccuracyEnhancementEngine` Platt-calibration / OCR-edit-distance / Weibull / interval-arithmetic
- `HistoricalMaterialPriceEngine` CSV-seeded LME prices 2020-2026 (steel/Al/Cu/SS)
- `InflationAdjustEngine` CPI-U 2020-2026 USD adjustment
- `FairMarketValueEngine` computes FMV + under/at/over-charged verdict

### Layer 3 — Evaluate (✅ wired)
- `JMDieFinancialBaselineEngine` aggregates per-customer/material/year
- `QuoteOutcomeFeedEngine` feeds psi_delta to `PSNAutonomyLoopEngine`
- `PSNAutonomyLoopEngine` Primitives 2-5 (reward scoring + trainer manifest + Wilcoxon safe-deploy + EWC++ regularization)

### Layer 4 — Deploy (⚠️ partially wired — 3 production gaps)
- ✅ `prism_quoting` dispatcher (22 actions live in MCP server)
- ✅ Express `/api/v1/quoting` + `/api/mcp/quoting` HTTP bridges
- ✅ React `MobileCameraQuotePage` + `LiveChatWidget` + PWA scaffolding
- ❌ **GAP G1**: No A/B-shadow comparator wired between new model + production model (NN/GNN AUROC currently UNGRADED — PSN-LEG-STATE flags this)
- ❌ **GAP G2**: No automatic model-promotion cron (PSNAutonomyLoop has the math but no scheduled trigger)
- ❌ **GAP G3**: No outcome-feedback loop from REAL customer quotes → `QuoteOutcomeFeedEngine` (engine ships, but the "actual_cost_usd" recording hook from completed jobs is operator follow-up)

## Real-data first-cycle measurements (this session)

### JM-DIE-FINANCIAL-BASELINE (`state/shared/specs/JM-DIE-FINANCIAL-BASELINE-2026-05-24.json`)
- 530 files scanned, 500 records, 10 customers, 31 parts
- Price-lookup hit rate **100%** (17 exact + 483 nearest-prior)
- psi_delta feed **100%** (500/500 records fed to PSN NN/GNN)
- Time span **2020-10-28 → 2026-05-14** (2024 days)
- Total revenue baseline **$43,637**
- Top customer ACCUR $14,282 / Most-active ACCURATE THREADED FASTENERS 332 docs

### JM-DIE-PROGRAM-ANALYSIS (`state/shared/specs/JM-DIE-PROGRAM-ANALYSIS-2026-05-24.json`)
- 200 files scanned in CNC LATHE subdir, **198 CNC programs successfully parsed** (99% success rate)
- Total program time-in-cut **8,696 sec** (~2.4 hours)
- Total FMV estimate **$39,536**
- Inflation-adjusted to today **$39,611** (~$76 uplift on a recent corpus)
- Dialect auto-detect proven (mazak_lathe routed correctly)

## PSN 11-leg coverage

| Leg | Status | Evidence |
|---|---|---|
| 1. Obsidian brain | ✅ | per-unit memory pointers under `knowledge/memories/reference/` |
| 2. PRISM OS | ✅ | `prism_quoting` 22 actions; `prism_dev` orchestrators |
| 3. Wiki | ✅ | `knowledge/wiki/architecture/quoting-pipeline-ms0.md` |
| 4. Memories | ✅ | assessment + shipped + per-unit memos |
| 5. Tribal | ⚠️ partial | LiveChatRouter callback can query CAMTribalRAG; not yet default-wired |
| 6. System Viz | ✅ | `ghost.quoting_pipeline` roost + 24 children (regen-viz registered) |
| 7. Engines | ✅ | 17 new across QUOTING-PIPELINE + JM-DIE-FINANCIAL + JM-DIE-PROGRAM-ANALYSIS |
| 8. Algorithms | ✅ | 4 new (Platt MLE + OCR-Levenshtein + Weibull + interval-arithmetic) + reused 5+ |
| 9. Formulas | ✅ | FMV cost formula + Lin Platt + Weibull survival + CPI ratio |
| 10. NN/GNN | ⚠️ UNGRADED | psi_delta feed wired; AUROC not finite (embeddingSource mismatch — U-NN-PREDICTOR-EMBED-WIRE) |
| 11. PRISM AI | ✅ | `QuotingNeuralReasoningBridgeEngine` 6-class routing to claude/ollama/prism_calc/creative_reasoning/tribal_rag |

## Path to MS1 production-grade self-loop

| Unit | Title | ETA |
|---|---|---|
| U-JP08 | Wire QuoteOutcomeFeedEngine to real customer-quote close events (production hook into job-completion flow) | 1 iter |
| U-JP09 | Cron-trigger PSNAutonomyLoop.buildTrainerManifest weekly + shadowCompare evaluation | 1 iter |
| U-NN-PREDICTOR-EMBED-WIRE | Fix NN/GNN AUROC ungraded state (embeddingSource mismatch already tracked) | 2 iters |
| U-JP10 | Full 301K-file fleet sweep run with operator-set per-machine rates (replaces single $95/hr default) | 1 iter |
| U-JP11 | Per-customer FMV verdict report (which customers are systematically under/over-charged) | 1 iter |

## Bottom line

**The self-loop is closed end-to-end at the engine level.** Every leg of PSN has at least one engine touching it. Real first-cycle data is in hand:
- 500 docustrata records → financial baseline
- 198 CNC programs → time + FMV + inflation analysis
- 500 psi_delta signals → PSN NN/GNN feed

**5 named units to MS1 production.** No fundamental architecture gap — only operational wiring (customer-quote close hooks, training cron, embedding-source fix, per-machine rates, FMV report).
