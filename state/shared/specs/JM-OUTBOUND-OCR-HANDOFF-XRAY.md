# JM OUTBOUND PRICING OCR HANDOFF — charlie → xray (blueprint-vision OCR)

> **Cross-galaxy work-order, JM-PRIORITY.** charlie (quoting) proved the JM outbound-pricing corpus is locked behind OCR; **xray (blueprint-vision) owns the OCR pipeline.** Unblocking this feeds the quoting galaxy's #1 bottleneck (iter59 quote-vs-actual data-ceiling — DocuStrata was inbound-only). Generated 2026-05-30, slot:charlie, VENDOR-NETWORK-MS0/U-VDN-JM-ORDERS.

## The corpus (Docustrata, JM = J.M. Tool & Die, the vendor on these POs)
- **`H:/PRISM/Docustrata/JMD Orders Closed/` — 12,761 PDFs** — customer POs to JM with **real sold pricing** (PO#, customer, QTY / PART# / UNIT PRICE / EXT PRICE, date, quote ref). **THE high-value target.**
- **`H:/PRISM/Docustrata/JMD Sales Orders/` — 21,515 PDFs** — "Scanned-Document" image scans, same pricing shape. Need OCR more than Orders-Closed.
- (`JMD Quotes/` — 955 PDFs — are customer part DRAWINGS, not pricing → that's delta/xray blueprint corpus, separate.)

## Why charlie couldn't do it (the measurement, R12)
charlie's `scripts/extract-jm-sold-orders.mjs` parsed the **pypdf text layer** of a 1,000-order batch: only **~2.5% (25 orders) yielded reliable qty×unit=ext line-items**; distribution high:2 / medium:295 / low:565 / none:138. The pricing IS present (56% have a price-table header) but the **scanned-OCR text layer mangles the digits** enough that qty×unit≠ext. A text parse is the wrong tool — these need real OCR (the JM STEP/scans are also INCH, normalize accordingly).

## What xray should produce (the schema charlie consumes)
Per order, the `jm-sold-orders` record shape charlie already defined:
```
{ file, po_number, customer, quote_ref, order_date,
  line_items: [{ qty, part_number, unit_price, ext_price }],
  order_ext_total, confidence }
```
- OCR each PDF (xray's `cad_pdf_blueprint_extract` / lima pypdf-with-OCR / the blueprint OCR engine — per the xray atlas), parse the PO table region, validate `ext ≈ qty×unit` (±5%) as the confidence gate charlie uses.
- Emit to `state/shared/quoting/jm-sold-orders-ocr.jsonl` (one record/order) — charlie's `extract-jm-sold-orders.mjs` will then aggregate it into the profile + feed quote-vs-actual.

## Why it matters (charlie's stake)
These are JM's **actual sold prices per part/customer** — the real quote-vs-actual training signal the quoting bootstrap distribution has lacked (it's been synth-only, MAPE 71.1%). Even 40-60% reliable extraction across 12,761 orders = thousands of real price points keyed by (customer, part) → directly lifts quote accuracy. charlie owns the downstream consumption; xray owns the OCR.

## Coordination
Posted to `AGENT_CHAT`. charlie's text-layer harvest of the recoverable ~2.5% is in `state/shared/quoting/jm-sold-orders.json` (interim). Full text cache (all 12,761, text-layer) is being extracted to `.cache/jm-orders-full.jsonl` — xray can diff against it to target the OCR-needed subset.
