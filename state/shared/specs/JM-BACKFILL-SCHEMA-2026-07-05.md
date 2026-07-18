# JM-Die 2014-Backfill Record Schema -- DRAFT v0.1 (slot:quebec, 2026-07-05)

> P-D STAGE 1 deliverable (task #142). SOLO DRAFT after 2 silent coordination ticks --
> **juliett (DocuStrata/JM-DB primary) review REQUIRED before any ingestion**; reply on
> AGENT_CHAT or edit this file directly. Nothing ingests until this carries
> `status: agreed` with both slots named.

status: draft-awaiting-juliett
authors: quebec (draft), juliett (pending)

## Purpose

Populate the app's ERP/quoting/job stores as if used since 2014 (operator directive),
sourced EXCLUSIVELY from the Docustrata export (manifest.json + .index/ -- NEVER re-OCR).
Official corpus counts (manifest summary, export 2026-05-08): **111,745 total documents**
(111,500 downloaded / 245 skipped), 20 folders, 2,826 tags. Root categories (10): JMD
{Acct RecPay, AltracsTaptite, Laser Sheets, Orders Closed, Packing Slips, Quotes,
Sales Orders, Scans, TaxesIRS, UPS}.

## Non-negotiables (operator constraints, enforced by schema)

1. **Provenance is MANDATORY and NON-OPTIONAL** -- every record carries a pointer to its
   source document. A record without provenance is invalid and must be rejected at ingest.
2. **Simulated never masquerades as live** -- `provenance.simulated: true` on EVERY
   backfilled record; every consumer surface that renders backfill data must be able to
   badge it (the FE can filter/annotate on this single flag).
3. **No re-OCR** -- content fields come from manifest metadata + existing .index/ extracts
   only. A field we cannot source honestly stays ABSENT (never fabricated). R12.

## BackfillRecord envelope (draft)

```jsonc
{
  "schemaVersion": "0.1.0",             // bump per juliett's migration rules (N-1 compat)
  "record_id": "bf-<category>-<doc_id>",// deterministic from source -> idempotent re-ingest
  "record_type": "order|quote|packing_slip|invoice|sales_order|scan|tax_doc|shipping_doc|misc",
  "business_date": "YYYY-MM-DD",         // from doc metadata; null if underivable (never guessed)
  "customer": null,                       // from tags/folder when derivable; else null
  "amount_usd": null,                      // only when the indexed extract carries it; else null
  "tags": [],                              // verbatim manifest tags (die/insert/wire/station vocab)
  "payload": {},                           // record_type-specific fields, all honestly-sourced
  "provenance": {                          // MANDATORY block
    "source": "docustrata-backfill",
    "doc_id": "<manifest id>",
    "doc_path": "<relative path under H:/PRISM/Docustrata>",
    "folder": "<JMD category dir>",
    "exported_at": "2026-05-08T06:23:59.241Z",
    "backfilled_at": "<ingest ISO>",
    "simulated": true
  }
}
```

Category -> record_type mapping (draft): Orders Closed -> order · JMD Quotes -> quote ·
Packing Slips -> packing_slip · Acct RecPay -> invoice · Sales Orders -> sales_order ·
Scans -> scan · TaxesIRS -> tax_doc · UPS -> shipping_doc · Laser Sheets/AltracsTaptite ->
misc (payload.category preserved) until juliett classifies further.

## Open questions FOR JULIETT (blocking ingestion, not blocking review)

1. Store target: which ERP store(s) accept BackfillRecord -- existing listRecords stores
   with a `simulated` filter, or a parallel backfill store joined at read time?
2. Atomic-ingest requirements: batch size, lockfile/atomicWrite conventions, resume ledger
   shape (quebec proposes a scan-planner-style ledger: total=111,745, per-category counts,
   idempotent by record_id).
3. schemaVersion governance: who bumps, where migrations live (src/migrations/ per repo
   convention), N-1 window.
4. Tag normalization: keep the 2,826 raw tags verbatim in `tags[]` (quebec's position:
   YES, verbatim; normalized views are derived later, never destructive).

## Verification plan (STAGE 2 gate, before any bulk run)

Pilot: 100 records from ONE category (Orders Closed), ingest -> assert every record
carries full provenance + simulated flag -> FE spot-check that a backfill badge is
renderable -> juliett sign-off -> only then the 111,745-doc run (Docker batch lane).
