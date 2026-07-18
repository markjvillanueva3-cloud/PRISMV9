# HM Training Wiring Plan — /forge7 /yolo-mode

> Companion to `HM-TRAINING-EXHAUSTION-AUDIT-2026-05-20.md`. Plan generated via `/forge7` (Boris loop+agent discipline, verification feedback hard-gated). `/yolo-mode` = autonomous build, all units claim-and-go.
>
> Baseline measurement: `scripts/hm-extraction-coverage.mjs --json` (the META artifact). Re-run after each unit lands to confirm baseline shift.
>
> Status: **PLAN** — units not yet claimed. Wire to milestone envelope `CAD-FUSION-LIVE-MS0` (existing) on first claim.

## Unit table (build order = leverage order)

| # | Unit ID | Lane | Effort | Leverage |
|---|---------|------|--------|----------|
| 1 | U-HMT-HMACOLOR-EXTRACT | Lane A direct-wire | 1 session | **HIGH** — 36 unprocessed PDFs → est 600-1200 new tips (hmAutoColor workflow recipes are dense). Unblocks F3 + headline-gap. |
| 2 | U-HMT-EMBED-INDEX-WIRE | Lane A | 1 session | **CRITICAL** — closes F4. Re-embeds existing 3 544 + new tips. Single biggest fleet-wide AI lift; tribal-by-domain-inject becomes HM-aware in every chat. |
| 3 | U-HMT-HYPERCAD-REEXTRACT | Lane C forge-queue | 1 session | **HIGH** — closes F1. CAD AI training source. Replace failing extractor on doc-cad-manual-en-us; investigate why 0-tip (encrypted PDF? bad page-stream? extractor regex too narrow?). |
| 4 | U-HMT-V31-EXTRACT | Lane A | 1 session | **MEDIUM** — closes F3. v31.0 hyperMILL + hyperCAD-S manuals as `*-vol31*` suffix. Older idioms still appear in JM-Die templates. |
| 5 | U-HMT-FUSION-CAD-FIX | Lane A | 0.5 session | **MEDIUM** — closes part of F2. doc-fusion-cad zero-tip; investigate+fix. |
| 6 | U-HMT-GRAPHSAGE-SEED-HM | NN-GRAPH-MS2 follow-up | 1 session | **HIGH** — closes F7. Ghost-seed GraphSAGE with HM tips as reference pool (≥500). Lifts `poolSize` 0→≥500 + `deferred:false`. |
| 7 | U-HMT-CONSUMER-MEASURE | Verification | 0.5 session | **MEDIUM** — closes F6. Add measurement-verified load count to each of the 8 consumer engines (HyperMillDeepLearningEngine et al.). Stops the "grep-wired" false-confidence pattern. |

## Build doctrine (per CLAUDE.md / Boris)

Each unit MUST:
1. **Pre-flight** — `duplicationGuardEngine.mustCheckBeforeCreating()` THROW-on-dup check
2. **Verification channel** declared per-finding in unit envelope (yaml: tool/expected_signal/re_run_cost/baseline)
3. **Per-file scrutiny** (2 parallel reviewers, every file before next)
4. **3-of-3 Stop gate** at session close
5. **CLAUDE.md back-flow** — append to `## Recent regressions` if any rot found mid-build
6. **Re-run META** — `node scripts/hm-extraction-coverage.mjs --json` BEFORE + AFTER to prove the dial moved (the hard-gate verification this audit imposes)

## Unit details

### U-HMT-HMACOLOR-EXTRACT (#1 — start here)

**Goal:** extract 36 unprocessed hmAutoColor PDFs into `cad-engine/knowledge_store/doc-hmautocolor-*.json`.

**Method:** reuse the existing `cad-engine/extractor` pipeline used for the 47 docs already extracted; batch via `node cad-engine/extract.mjs --batch --pattern "Resources/OPEN MIND/hyperMILL/*/AddIns/hmAutoColor/**/*.pdf"`.

**Acceptance:**
- 36 new `doc-hmautocolor-*.json` files in knowledge_store
- combined `.tips.length` ≥ 600
- `hm-extraction-coverage.mjs --json` reports `unprocessed_count ≤ 6` (allowing for genuinely tip-poor batch-converter readmes)

### U-HMT-EMBED-INDEX-WIRE (#2 — biggest lever)

**Goal:** embed all HM tips (3 544 baseline + new from #1) into `tribal-embed-index.json` so vector recall returns them.

**Method:** existing embed pipeline (`scripts/embed-wiki-into-tribal-index.mjs` already wires the wiki side, per CLAUDE.md `reference_tribal_embed_gap_2026_05_18`). Add a sister pass `scripts/embed-knowledge-store-into-tribal-index.mjs` that walks `cad-engine/knowledge_store/doc-*.json` and emits `{text, embedding, source}` per tip.

**Acceptance:**
- `embed_index_hm_count` ≥ 2 500 (allowing for embed failures + dedup)
- spot-check: `tribal-by-domain-inject` hook surfaces an HM tip when prompted with a hyperMILL-domain query

### U-HMT-HYPERCAD-REEXTRACT (#3)

**Goal:** investigate why `doc-cad-manual-en-us.json` is zero-tip + fix.

**Method:** read the PDF directly, try alternate extractor, inspect for encryption / image-only pages / extractor regex mismatch. If genuinely image-heavy, route to OCR via `/pdf-learn`.

**Acceptance:**
- `doc-cad-manual-en-us.json` tip count ≥ 200 (parity with hyperMILL CAM Manual's 488)
- `baselines_for_audit.F1_hypercad_zero_tip` non-zero

### U-HMT-V31-EXTRACT (#4)

**Goal:** extract v31.0 hyperMILL + hyperCAD-S + AUTOMATION Center manuals as suffix `*-vol31*`.

**Method:** same extractor, output to `doc-*-vol31.json`.

**Acceptance:** 3 new files, combined tips ≥ 500.

### U-HMT-FUSION-CAD-FIX (#5)

**Goal:** investigate + fix `doc-fusion-cad.json` zero-tip.

### U-HMT-GRAPHSAGE-SEED-HM (#6)

**Goal:** seed GraphSAGE GNN reference pool from HM tribal corpus.

**Method:** add HM ghost-seed lane to `scripts/seed-ghost-from-unwired.mjs` (existing seeder, per CLAUDE.md NN-GRAPH-MS2/U1) — emit one `ghost.hm-tribal-tip` reference node per tip with `confidence ≥ 0.80`.

**Acceptance:** `state/shared/nn-graph/NN-EVAL.json` `poolSize ≥ 500`, lifecycle can train+evaluate (deploy gate still data-side until heterophily addressed per NN-1).

### U-HMT-CONSUMER-MEASURE (#7)

**Goal:** add real load-count measurement to each consumer engine.

**Method:** each consumer gains a `.knowledgeStats(): {tipsLoaded, sourceFiles, lastRefresh}` accessor; one round-trip test per consumer in `__tests__/` that instantiates the engine + asserts `tipsLoaded > 0`.

**Acceptance:** ≥3 consumers (HyperMillDeepLearningEngine, HyperMillStrategyKnowledgeEngine, MillingAIUnificationEngine) return `tipsLoaded > 0`.

## Schedule

`/loop 5m /forge-audit-v2 ...` (active per operator directive) means the audit re-runs every 5 minutes while these units land. Each unit ship should drop one of the baseline numbers in the META artifact — the audit's next pass will catch the dial moving and progressively narrow the finding list.

Long-term cadence (after units land): the standard `/forge-audit-v2 /loop 7d` re-run resumes.
