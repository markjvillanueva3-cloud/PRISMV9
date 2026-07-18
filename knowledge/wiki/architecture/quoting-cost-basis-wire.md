---
title: Quoting cost-basis wire (VendorCostIndexEngine)
type: architecture
domain: quoting
slot: charlie
created: 2026-06-01
commit: aed1967ad7
tags: [quoting, cost-basis, vendor, should-cost, dispatcher, U-QP-COST-BASIS-WIRE]
---

# Quoting cost-basis wire — VendorCostIndexEngine

`QUOTING-SYNERGY-MS0/U-QP-COST-BASIS-WIRE` (slot:charlie, 2026-06-01). Makes the real JM vendor cost-basis usable by the quote cost path.

## Before
`state/shared/quoting/jm-vendor-cost-index.json` — 20,736 real AP line-items, $10.02M net spend, 174 vendors, 7 per-category unit-cost priors — was **built but UNWIRED**. Zero engine consumers (the "consumed by should_cost/secondary-ops/DocustrataAccountingBridge" note in QUOTING-DATA-INDEX was aspirational; matches the awareness "16 cost-bridge hooks, 0 wired").

## After
`VendorCostIndexEngine` (`mcp-server/src/engines/VendorCostIndexEngine.ts`) loads the index (cached, fail-soft, robust cwd + module walk-up path resolution) and exposes:
- `getCategoryPrior(category)` → `{count, spend, vendorCount, unitCost{min,median,max,n}}`
- `listCategories()`, `getTotals()`, `getVendorSpend(name)` (case-insensitive), `categoryForQuoteSlot(slot)`, `prior({category?})`

Wired as **`prism_quoting:cost_index_prior`** (enum + schema + lazy-import switch). NO inline rate/margin constants — every cost number is read from the AP-derived file.

## Real per-category median unit cost (from the AP ledger)
| category | median $/unit | n |
|---|---:|---:|
| material | 3.39 | 5,613 |
| outside-process | 3.25 | 2,817 |
| freight-shipping | 17.27 | 127 |
| tooling-consumable | 33.87 | 7,122 |
| inspection-quality | 160 | 118 |
| overhead-utility | 58.96 | 323 |
| misc | 38.14 | 4,506 |

## ⚠ Units caveat (R12 finding — the median is NOT a per-unit quote price)

`unitCost.median` is a **blended-across-heterogeneous-units line-item statistic**, not a clean per-unit price. Verified against `jm-vendor-ap-ledger.jsonl`: `material` rows mix $/bar ($157 @ qty1), $/foot ($1.46 @ qty202), $/piece ($51 @ qty8) and per-order; `outside-process` rows are per-ORDER with the real piece-count buried in the free-text description ("38PCS"); freight is sometimes mis-categorized into material. **Do NOT inject a category median into a customer quote as a per-unit cost** — that is a units error (the units-first safety rail). The `getCategoryPrior` JSDoc carries this guardrail in-code.

**Safe uses:** spend / vendor-concentration analysis, cold-start sanity range, advisory context.

**Corrected consumer path:** a unit-safe per-quote prior requires the AP ledger to be NORMALIZED first (parse units + piece-counts from descriptions, de-mix freight) — a data prerequisite owned by **juliett** (AP ledger / databases) — *before* any per-quote cost wire into `CostEstimationEngine`.

## Tests
14 vitest — hermetic synthetic fixture + a real-corpus oracle pinning all 7 medians (skip-safe) + a dispatcher `safeParse → engine.prior()` round-trip. `build:fast` + `tsc` clean. 2-reviewer per-file scrutiny PASS (0 P0/P1).

## Next
Consumer integration (next iteration, R13): feed `getCategoryPrior` into `DocuStrataMaterialPriorEngine` (material prior) + `CostEstimationEngine` (should-cost decomposition) so cost decomposition grounds on real medians instead of guessed defaults. The calibration TARGET (outbound pricing) stays OCR-locked (xray pipeline). See [[reference_charlie_quoting_data_ceiling]] · `reference_charlie_cost_index_wire_2026_06_01`.
