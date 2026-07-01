---
name: reference_charlie_cost_index_wire_2026_06_01
description: VendorCostIndexEngine — wired the real $10M JM AP cost-basis (jm-vendor-cost-index.json) into prism_quoting (was built-but-unwired, 0 consumers)
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.508Z
aliases: reference_charlie_cost_index_wire_2026_06_01
---


QUOTING-SYNERGY-MS0/U-QP-COST-BASIS-WIRE (slot:charlie, 2026-06-01, /loop, commit `aed1967ad7`). The "use the new data" half of "continue training the quoting system."

**Finding:** `state/shared/quoting/jm-vendor-cost-index.json` (20,736 real AP line-items, $10.02M net spend, 174 vendors, 7 category priors) was a BUILT-BUT-UNWIRED data artifact — ZERO engine consumers. The QUOTING-DATA-INDEX "consumed by should_cost/secondary-ops/DocustrataAccountingBridge" note was aspirational (matches awareness "16 cost-bridge hooks, 0 wired").

**Shipped (R13 verifiable core):** `mcp-server/src/engines/VendorCostIndexEngine.ts` — loads the index (cached, fail-soft, robust cwd+module walk-up path resolution) and exposes `getCategoryPrior(category)`, `listCategories()`, `getVendorSpend(name)` (case-insensitive), `getTotals()`, `categoryForQuoteSlot(slot)`, and a `prior()` convenience. Wired `cost_index_prior` into `prism_quoting` (enum + schema + lazy-import switch in quotingActionSchemas.ts + quotingDispatcher.ts). NO inline rate/margin constants — every cost number is READ from the AP-derived file. 14 vitest tests (hermetic synthetic fixture + real-corpus oracle pinning all 7 real medians + dispatcher safeParse→engine round-trip). build:fast + tsc clean. 2-reviewer per-file scrutiny PASS (0 P0/P1).

**Real per-category median unit costs** (the usable cost prior, from the AP ledger): material $3.39, outside-process $3.25, freight-shipping $17.27, tooling-consumable $33.87, inspection-quality $160, overhead-utility $58.96, misc $38.14.

**Deferred P2s (2-reviewer, logged):** cached result is a shared reference (Object.freeze hardening — latent, read-only today); `prior("")` falls to all-categories branch (unreachable via the wired enum); `vendors[].categories` inner values not Number-coerced.

**UNITS-SAFETY FINDING (U-QP-COST-BASIS-CONSUME, same day, R12 + units-first rail — the planned consumer-wire is UNSAFE):** I scouted the consumer-integration (inject `getCategoryPrior` into a quote cost slot) and STOPPED — it would be a units error. The cost-index `unitCost.median` is a BLENDED-ACROSS-HETEROGENEOUS-UNITS line-item statistic, NOT a per-unit price. Verified vs `jm-vendor-ap-ledger.jsonl`: `material` rows mix $/bar ($157 @ qty1), $/foot ($1.46 @ qty202), $/piece ($51 @ qty8), per-order; `outside-process` rows are per-ORDER with the piece-count buried in the free-text description ("38PCS"); freight is sometimes mis-categorized into material. So $3.39 (material) / $3.25 (outside-process) are coarse spend-analysis central tendencies. **Guardrail baked into the engine** — `getCategoryPrior` JSDoc now carries a UNITS WARNING; DO NOT inject the median into a customer quote as a per-unit cost. SAFE uses: spend/vendor-concentration analysis, cold-start sanity range, advisory context.

**CORRECTED NEXT (the real path):** a unit-safe per-quote prior requires the AP ledger to be NORMALIZED first — parse units + piece-counts out of the free-text descriptions, split per-piece, de-mix freight — which is a DATA unit (juliett owns the AP ledger / databases per the slot-domain map), NOT a charlie quick-wire. AFTER normalization, a unit-safe per-category $/normalized-unit prior can feed `CostEstimationEngine`. The calibration TARGET (outbound pricing) separately stays OCR-locked (xray). See [[reference_charlie_quoting_data_ceiling]], [[reference_charlie_guard_volume_synth_2026_06_01]]. Wiki: [[quoting-cost-basis-wire]].
