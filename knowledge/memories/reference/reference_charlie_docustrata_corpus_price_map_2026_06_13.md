---
name: reference_charlie_docustrata_corpus_price_map_2026_06_13
description: Which JMD Docustrata folders actually carry dollar amounts (only Orders-Closed) — prevents re-running 22K price-free PDFs expecting prices
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.508Z
aliases: reference_charlie_docustrata_corpus_price_map_2026_06_13
---


**JMD Docustrata corpus price-map (slot charlie, 2026-06-13, eval-gate verified on real samples).** When the goal is price / quote-vs-actual closed-loop training, only ONE of the four `H:/PRISM/Docustrata/JMD *` folders carries dollar amounts. Verified by bounded textLayer samples (`docustrata-run-all-documents.mjs --from-folders --folder-roles <ROLE> --routes textLayer --limit N`) + reading the raw extracted text:

| Folder | Files | Content | Born-digital? | Dollar amounts? |
|---|---|---|---|---|
| **JMD Orders Closed** | 12,761 | Purchase Orders with settled prices | mixed | **YES** -> 6,718 actuals = $355,028,170.89 (53% yield, 98% high-conf). The ONLY priced corpus. |
| JMD Quotes | 955 | engineering drawings / blueprints (dims, tolerances, "TOOL PART #", "DRAWN BY") | NO (scanned, OCR-garbled) | none |
| JMD Sales Orders | 21,515 | "Job Tracking Sheets" (P.O. No., Ship-To customer, Line/Due-Date, Description=part, Quantity) | YES (clean text, customer 40/40, date 40/40, part 26/40) | **none** ($0 dollar-signs in samples) |
| JMD Packing Slips | 1,149 | packing slips | - | none (excluded by design in FOLDER_ROLE_MAP) |

**Consequence:** the quote-vs-actual *pairing* (`pairQuotesToActuals` in `scripts/lib/docustrata-outcome-extract-lib.mjs`) cannot be sourced from a separate priced-quote PDF corpus — none exists. The settled-price ground truth is entirely in Orders-Closed, already extracted to `state/shared/quoting/orders-closed-actuals.jsonl` and wired into `quoting-train-cycle.mjs` as the ADVISORY `docustrata_actuals_match` (U-QP-TRAINCYCLE-FEED, commit c26605117d), surfaced via `prism quoting:training_status` (snapshot pass-through).

**Do NOT** run the full Quotes/Sales-Orders folders expecting prices — you get job metadata, not $. Sales Orders DO have rich per-job metadata (customer+part+qty+P.O.#+due-date for 21,515 jobs) usable for a SEPARATE metadata-enrichment unit (join P.O.# -> Orders-Closed actuals), but that is NOT the price closed-loop.

**Where real quote prices might live (path forward, needs operator):** the commercial quote $ are likely in the accounting/ERP system (QuickBooks -> hotel/business galaxy, QB-PARITY done), not the PDF corpus. A future quote-vs-actual pairing would join ERP quote records to the Orders-Closed actuals. See [[reference_charlie_orders_closed_355m_2026_06_12]].
