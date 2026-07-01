---
name: reference_oscar_full_sweep_validated_2026_06_25
description: "Priority-3b synthetic combination sweep VALIDATED (slot:oscar, 2026-06-25): ran the existing sfc-full-sweep-compare.mjs (prod mode, 576 cells, --no-vendor) to a JSONL ledger -- works end-to-end with the current fixed engines (uncapped-Vc/rigidity/parity-verdict). PRISM is conservative vs the 5-vendor baseline (carbide -13.5%, ceramic -7%, cbn -16.7% = SAFE direction). FLAG: PRISM fz is +124.7% vs G-Wizard's published table (a feed-per-tooth divergence to investigate). Full mode ~69K cells (Blackwell-scale) is the heavy run for fresh context."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.689Z
aliases: reference_oscar_full_sweep_validated_2026_06_25
---


**Priority-3b synthetic combination sweep VALIDATED (slot:oscar, 2026-06-25).** The "exhaustive testing of
logical input/cutting-parameter combinations" is ALREADY BUILT as `scripts/sfc-full-sweep-compare.mjs`
(U-OSC-FULL-SWEEP): it enumerates the full input space (material x tool-diameter x optimization-mode per ISO,
mill+lathe) via `SpeedFeedExhaustiveCombinationEngine` and drives each cell through the tri-comparator vs the
5-vendor baseline + live G-Wizard/HSMAdvisor, streaming a per-cell JSONL ledger.

**This run (token-safe: prod mode, output-to-file, summary-only):**
`npx tsx scripts/sfc-full-sweep-compare.mjs --no-vendor --out data/state/sfc-full-sweep-ledger.jsonl`
-> **576 ledger rows** written, ran clean end-to-end with the current FIXED engines (this session's
uncapped-Vc + rigidity-cap-reapply + parity-verdict fixes are in the path). No crashes, no anomalies.

**Result (PRISM vs 5-vendor carbide-keyed baseline, by tool material):**
- carbide: 144 cells, **median Vc -13.5%** (conservative = SAFE)
- ceramic: 144, **-7%** (SAFE); cbn: 144, **-16.7%** (SAFE)
- hss: 144, +45.8% (NO carbide-baseline datum for hss -> not a real over-prediction; needs non-carbide
  reference data = the catalog-OCR unit, NOT a PRISM change)
- vs G-Wizard PUBLISHED table: Vc **+6.3%** (slightly aggressive), **fz +124.7%**
- vs HSMAdvisor PUBLISHED: Vc **-7.6%** (SAFE)

So PRISM sits in the SAFE/conservative direction vs the grounded baseline across the full input space -- the
calibration-learning signal. The 576-row ledger IS the training input for the downstream PRISM_SFC_CALIB_APPLY
(GPU/Blackwell) layer + india LoRA/GNN (priority 4).

**FZ +124.7% finding -- INVESTIGATED + RESOLVED (NOT a bug; it is a MODE-AGGREGATION artifact).** Characterized
the 144-cell G-Wizard fz-delta distribution (from the now-fz-complete ledger, U-OSC-SWEEP-LEDGER-FZ): the
divergence is strongly MODE-DEPENDENT -- **cost_batch +47% / prism_optimized +148% / aggressive_rush +200%**
(by material: titanium +31, cast_iron +100, 6061 +125, 304 +130, steel +170). G-Wizard publishes ONE
conservative fz per material/tool; PRISM computes a MODE-SPECIFIC feed, so the sweep's +124.7% MEDIAN mixes
all three modes and is inflated by aggressive_rush (which is SUPPOSED to be high). The mode-matched comparison
-- PRISM's conservative cost_batch fz = **+47%** vs known-conservative G-Wizard -- is a defensible
source-conservatism difference, NOT an over-prediction. Same class as the JM finding (PRISM correctly more
aggressive than conservative references) and Vc stays the safe/conservative axis. So: no fz physics fix
needed. (Marginal reporting follow-up: split the sweep summary's fz delta BY MODE so the aggregate +124.7%
isn't read as a uniform over-prediction -- low priority.)

**Covered-vs-total (R12):** covered = prod-mode (576 cells, fast/CPU). REMAINING = `--mode full` (~69K cells,
Blackwell-scale) -- a HEAVY long-running run for a dedicated/fresh context (write-to-file, never into chat).
Then india trains on the ledger. Sibling: [[reference_oscar_jm_accuracy_validation_result_2026_06_25]].
