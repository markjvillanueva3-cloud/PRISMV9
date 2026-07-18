---
title: Logistics dispatcher (seed — U-VICTOR-B1)
type: dispatcher
status: seed
created: 2026-05-27
slot: victor
related:
  - knowledge/wiki/architecture/dispatcher-shop-floor.md
  - knowledge/wiki/architecture/dispatcher-erp.md
  - knowledge/wiki/architecture/business-quickbooks-connector.md
tags: [logistics, shipping, receiving, dispatcher, seed]
---

# Logistics dispatcher — seed

Operator-named PRISM domain (per /goal 2026-05-27) with **zero prior coverage** (0 wiki / 0 tribal / 0 memory at iter-1 audit). This entry is the entry point — engine layer pending until the shop's logistics ops have concrete volume to justify it (PRISM is pre-revenue per [[reference_pivot_wiki_tribal_2026_05_21]] discipline).

## Scope

PRISM's logistics surface covers four flows, each with a downstream/upstream connection inside PRISM:

| Flow | Upstream | Downstream |
|------|----------|------------|
| **Inbound material receiving** | purchase order (purchasing dispatcher) | tool crib + raw-stock inventory; ERP-E2 receiving record |
| **Outbound finished parts** | shop-floor traveler completion | customer shipment (UPS/FedEx); invoice (QuickBooks via accounting dispatcher) |
| **Tool returns / cribs** | shop-floor request | tool crib inventory; vendor return-to-grind cycle |
| **Carrier coordination** | scheduling dispatcher | manifest / BOL / tracking emit |

## Engine inventory — pending

No engines exist yet. When built:
- `LogisticsInboundReceivingEngine` — reconcile incoming material against PO + flag short-ships
- `LogisticsOutboundShipEngine` — package + manifest + carrier rate-shop
- `LogisticsToolReturnEngine` — close the tool-life loop (worn → vendor → re-ground → back-in-crib)
- `LogisticsCarrierAPIEngine` — UPS/FedEx/DHL/local courier API bridges

All must respect Ω≥0.95 / S(x)≥0.98 (shop_floor tier; safety-critical because lost/wrong shipments cost real cash + customer trust).

## Tribal seeds — when extracted from JM Die corpus

Pending. The JM Die corpus (`JM DIE/`) contains 7+ years of receiving records, BOLs, and FedEx tracking; once `pdf-parse-extract.mjs` (whiskey) is pointed at the logistics subdir, tribal tips will land here.

## Closed-loop wiring (when engines ship)

1. Inbound receiving → updates `RawStockInventoryEngine`
2. Outbound shipping → updates `JobCostEngine` (actual freight vs quoted)
3. Tool-return cycle → feeds `ToolLifeEngine` regrind-history
4. Carrier APIs → emit telemetry to `prism_intelligence` for delivery-window confidence

## References

- [[feedback_psn_definition]] — PSN leg taxonomy; logistics sits inside PSN leg #2 (PRISM OS) under `prism_operating_system` shop-floor role
- [[reference_existing_tribal_wiki_pipeline_2026_05_27]] — promote tribal tips through the existing pipeline once they land
