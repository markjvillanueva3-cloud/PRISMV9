# HOTEL/U-INVOICE-X12-PARSERS — [MAIN] [HOTEL]/U-INVOICE-X12-PARSERS (slot:hotel iter20) [BOOTSTRAP-SLOT-ENFORCE]: G2+G6 parser halves close-out — post-OCR invoice text parser + X12 EDI segment parser (pure-string algorithms; external runtimes still deferred)

**Commit:** `f76700a28277` · **By:** markjvillanueva3-cloud · **At:** 2026-05-24T20:04:23-05:00
**Tags:** hotel, u-invoice-x12-parsers, auto-distilled

## Subject
[MAIN] [HOTEL]/U-INVOICE-X12-PARSERS (slot:hotel iter20) [BOOTSTRAP-SLOT-ENFORCE]: G2+G6 parser halves close-out — post-OCR invoice text parser + X12 EDI segment parser (pure-string algorithms; external runtimes still deferred)

## Body
```
[MAIN] [HOTEL]/U-INVOICE-X12-PARSERS (slot:hotel iter20) [BOOTSTRAP-SLOT-ENFORCE]: G2+G6 parser halves close-out — post-OCR invoice text parser + X12 EDI segment parser (pure-string algorithms; external runtimes still deferred)

TWO NEW PURE-STRING ALGORITHMS shipped — the parsers consume output from external runtimes (Tesseract OCR for G2, AS2/SFTP/VAN for G6). PRISM no longer needs to wait on the external infrastructure to start ingesting OCR text and X12 messages from any source.

InvoiceTextParserFormula.ts (G2 parser half):
- parseInvoiceText(text) extracts invoice_number / invoice_date / due_date / vendor_name_guess / line_items / subtotal / tax / grand_total
- Hotel-soul financial-invariant gate: line_sum + tax ≈ grand_total within $0.05 OCR-tolerance; surfaces variance in parser_warnings, never silently absorbs
- Defensive: returns null fields when patterns don't match — never fabricates
- Smart parsing: ISO date conversion (mm/dd/yyyy, Mon DD YYYY), liberal regex for OCR noise, invoice_number digit-or-hyphen requirement (rejects pure-alpha false positives like 'fields')
- Tests 15/15: clean MSC reference invoice (2 line items $132.07), noisy Acme OCR (3 line items $270.09 with double-spaces + month-name dates), ledger-variance surfacing on broken invoice, defensive null-returns on minimal text, R12 fail-loud

X12EdiSegmentParserFormula.ts (G6 parser half):
- parseX12Interchange(raw) sniffs delimiters from ISA fixed-position bytes (positions 4/105/106 per X12.5 spec), builds full AST: ISA → GS[] → ST[] → segments[] with composite sub-element parsing
- Hotel-soul structural-invariant gate: ISA/IEA control match, GS/GE control match, ST/SE control match — throws on tampered or truncated envelope (never silently parses a corrupted message)
- findSegments(transaction, tag) convenience for extracting PO1 lines from 850, BIG headers from 810, etc.
- Tests 15/15: reference 850 PO with 2 PO1 line items, delimiter sniffing, composite sub-elements, structural-invariant gate (ISA/IEA tampered → throws, GS/GE tampered → throws, ST/SE tampered → throws), degenerate empty-groups envelope, R12 fail-loud

Bugs found + fixed in this iter (R12 — never weakened assertions):
- InvoiceTextParser: bare 'total' regex alternative matched 'Subtotal:' first. Fixed via line-by-line fallback that skips subtotal-containing lines.
- InvoiceTextParser: invoice_number regex captured pure-alpha words ('fields'). Fixed via post-match digit-or-hyphen requirement.

DISPATCHER WIRING: businessDispatcher.ts (+2 actions: invoice_text_parse / x12_parse_interchange)
PHONE-APP/PWA: prismBusiness.ts (+2 typed REST wrappers + 2 result interfaces)

EXTERNAL RUNTIMES STILL DEFERRED (legitimate boundaries):
- G2-runtime: Tesseract OCR (or AWS Textract/Azure Form Recognizer) docker container — text production is out-of-scope for an in-context algorithm loop, but parser is now ready to consume any source
- G6-runtime: AS2/SFTP/VAN EDI transport library — message production/delivery is out-of-scope, but parser is now ready to consume any incoming X12 stream

PSN synergy: Algorithms leg (canonical text-parsing primitives) + Wiki leg (ANSI X12.5/X12.6 standards + Goldsmith document-extraction refs) + System Viz (2 new dispatcher actions) + PRISM AI (cross-domain reasoning can now consume OCR + EDI streams).

Closes G2-parser + G6-parser from 13-gap ERP-comparison audit. Session final total: 13 of 13 gaps closed — 9 pure algorithms + 5 stateful engines + 380 new tests + 45+ dispatcher actions + 45+ REST wrappers, all PSN-leg integrated. The 2 external-runtime pieces (G2-OCR, G6-transport) remain explicitly deferred to dedicated infrastructure cycles per their own CLOSE-OUT-DEFERRED entries, but the PRISM-side parser surfaces that consume them are now complete + tested + dispatcher-wired.
```

## Files touched (7)
- .../src/__tests__/InvoiceTextParserFormula.test.ts | 148 ++++++++++++++
- .../__tests__/X12EdiSegmentParserFormula.test.ts   | 131 ++++++++++++
- .../src/algorithms/InvoiceTextParserFormula.ts     | 226 +++++++++++++++++++++
- .../src/algorithms/X12EdiSegmentParserFormula.ts   | 218 ++++++++++++++++++++
- .../src/tools/dispatchers/businessDispatcher.ts    |  16 ++
- mcp-server/web/src/api/prismBusiness.ts            |  32 +++
- 6 files changed, 771 insertions(+)

## Lessons surfaced in commit body
- till deferred)
- TILL DEFERRED (legitimate boundaries):

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show f76700a28277`
- Milestone envelope: `mcp-server/data/milestones/HOTEL.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._