# BLUEPRINT-VISION-OCR/U-XRAY-GDT-DOMAIN-TAG — [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-GDT-DOMAIN-TAG (slot:xray): parameterize the extractor domain so GD&T-corpus drops tag gdt, not milling

**Commit:** `81ba5e33fbef` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T01:28:52-05:00
**Tags:** blueprint-vision-ocr, u-xray-gdt-domain-tag, auto-distilled

## Subject
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-GDT-DOMAIN-TAG (slot:xray): parameterize the extractor domain so GD&T-corpus drops tag gdt, not milling

## Body
```
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-GDT-DOMAIN-TAG (slot:xray): parameterize the extractor domain so GD&T-corpus drops tag gdt, not milling

Completes the GD&T corpus-ingestion arc (scan-route -> lane-capture -> correct domain tag). pdf-parse-extract hardcoded domain:milling/topic:order-of-operations in its tribal+wiki emitters, so a GD&T textbook dropped in resources/blueprint-gdt-corpus/ was mis-tagged milling -- hiding it from a domain-filtered curation view.

- deriveDomainTopic(pdfPath, --domain, --topic): explicit domain wins (slugged, injection-safe); blueprint-gdt-corpus path -> gdt; else legacy milling default. slugifyDomain strips path-traversal/shell chars (scrutiny P2).
- formatTribalJsonl / formatWikiMarkdown / buildOutputDescriptor are domain-aware: milling path is BYTE-IDENTICAL (legacy id whiskey-mill-oop-, whiskey-milling-oop-<date>.jsonl, bridge_engines last key); gdt path gets pdf-gdt- id, pdf-extract-gdt-<date>.jsonl, NO fabricated bridge_engines (verify-engine-name rule), no Bridge engines wiki section.
- extractOne stamps record.domain/topic; summary surfaces domain (R12). Watcher needs no change (path-derived).
- 12 new reference-value tests (51/51): deriveDomainTopic (gdt/default/explicit/null/injection) + gdt+back-compat variants of all 3 formatters + parseArgs flags. Per-file 2-arm scrutiny (reviewer + code-analyzer): both PASS; arm A 0 findings, arm B 1 P2 (unsanitized domain) FIXED in this commit.
- LIVE: real text PDF with --domain gdt -> pdf-extract-gdt-<date>.jsonl, id pdf-gdt-, domain gdt, 0 bridge_engines, no wiki Bridge section. Milling default proven byte-identical (consumer generate-milling-extracted-pdf-bridge.mjs globs whiskey-milling-* only -> gdt rows correctly excluded).
```

## Files touched (4)
- scripts/lib/pdf-parse-extract-helpers.mjs      | 103 +++++++++++++++++++++++++++++++++++++++++++++++++++++++----------
- scripts/lib/pdf-parse-extract-helpers.test.mjs |  97 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/pdf-parse-extract.mjs                  |   8 +++++
- 3 files changed, 192 insertions(+), 16 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 81ba5e33fbef`
- Milestone envelope: `mcp-server/data/milestones/BLUEPRINT-VISION-OCR.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._