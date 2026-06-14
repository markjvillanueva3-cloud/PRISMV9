---
name: reference_charlie_outbound_price_prior_2026_06_01
description: OutboundPriceIndexEngine — wires the real JM outbound sold-price distribution (jm-sold-orders.json) into prism_quoting as the calibration TARGET prior (was built-but-unwired)
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.054Z
aliases: reference_charlie_outbound_price_prior_2026_06_01
---


QUOTING-SYNERGY-MS0/U-QP-OUTBOUND-PRICE-PRIOR (slot:charlie, 2026-06-01, /loop /goal /yolo, commit `6efc2749bb`). The OUTBOUND half of "continue training the quoting system with more data" — symmetric sibling of [[reference_charlie_cost_index_wire_2026_06_01]] (the inbound cost-basis wire).

**Finding:** `state/shared/quoting/jm-sold-orders.json` (12,761 customer POs to J.M. Die mined by VENDOR-NETWORK-MS0/U-VDN-JM-ORDERS = what JM CHARGED; 240 verified line-items, $47,142.12 confirmed ext-revenue, OCR-noisy) was a BUILT-BUT-UNWIRED data artifact — ZERO engine consumers. This is the calibration TARGET data (what JM charges) that the training loop was missing; the cost-index is only the cost-basis FEATURE side. Last session I'd concluded outbound was juliett-blocked — WRONG: charlie's own VENDOR-NETWORK-MS0 already mined it.

**Why a distribution, not a join:** the iter59 real-revenue overlay got `match_pct=0` because it tried to JOIN orders to synthetic baseline records by a key that doesn't exist (po_number mostly null, quote_ref OCR garbage). A DISTRIBUTION prior sidesteps the join: calibrate the model's output price distribution against JM's real sold-price distribution. See [[reference_charlie_quoting_data_ceiling]], [[reference_quoting_pipeline_iter58_iter59_2026_05_27]].

**Units — CLEAN (unlike the AP cost-ledger):** each sold-order line is `qty × unit_price = ext_price`, so `unit_price` is a genuine per-PIECE outbound price (spot-verified for most high-confidence rows). Unlike the AP cost-index (which blends $/bar $157/$/foot $1.46/$/piece $51 — the units error that made me STOP the cost-basis consume), the sold-order unit_price is unit-homogeneous. Cross-part spread is wide ($1–$575/piece) → a sanity band + aggregate calibration target, NOT a per-part price.

**Shipped (R13 verifiable core):** `mcp-server/src/engines/OutboundPriceIndexEngine.ts` — loads (cached, fail-soft, walk-up resolution), exposes `pricePrior({minConfidence})` (per-piece + per-order distributions: n/min/p5/p10/p25/median/p75/p90/p95/max/mean), `sanityBand()`, `getTotals()`. Wired `outbound_price_prior` into prism_quoting (enum + schema + lazy-import switch). NO inline price constants. 19 vitest (hermetic exact-quantile + monotone gate + fail-soft + header-vs-persisted honesty + real-corpus oracle pinning header counts + fail-on-revert 40-high-orders pin + dispatcher round-trip). build:fast + tsc clean. 2-reviewer per-file scrutiny PASS.

**Confidence gating (safety):** source rule "never feed low-confidence prices into a live quote" → engine defaults to {high,medium}, NEVER low/none by default. `minConfidence:"high"` = cleanest 40-order verified subset (fully persisted).

**Header-vs-persisted honesty (R12 — scrutiny P1 fix):** the mined file persists a CURATED ~500-record top-value subset (all high-confidence + ~all $47K verified revenue) while its header reports full-corpus ordersProcessed:12761 / byConfidence totals. Result surfaces `recordsAvailable` (persisted, distribution source) DISTINCT from `ordersProcessed` (header) + the file's `advisoryOnly`/`caveat` self-flags — so a consumer never mistakes the partial sample for full-corpus ground truth.

**Boundary:** READ-ONLY prior, NOT a quote emitter — a downstream emitter consuming this MUST still apply the margin-floor gate (soul refusal).

**NEXT (the real training step, R13 logical order):** a calibration unit that compares the model's output price distribution to `outbound_price_prior({minConfidence:"high"})` and grounds the calibration factor on the REAL distribution instead of the synthetic bootstrap (`factor 0.5845 / MAPE 71.1%` self-consistency). Wiki: [[quoting-outbound-price-prior]].
