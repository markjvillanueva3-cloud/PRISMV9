# Run-All-Documents Pipeline — build plan + real-data findings (2026-06-12, slot:charlie)

> Operator directive: *"build everything we need so we can run all documents and pdfs through it"* (it = the quoting + closed-loop training system). Goal: run the **entire JM document/PDF corpus** through extraction -> (quoted,actual) pairs / actual prices -> closed-loop training so quoting accuracy improves at scale.

## Corpus (verified this session, per "all means all" enumeration)
- **JM DIE**: 317,139 files / 85,346 PDFs
- **Docustrata**: 257,992 files / 257,723 PDFs (the JMD quote/order folders live HERE under `H:/PRISM/Docustrata/`, NOT under `JM DIE/`)
- **resources**: 1,256 PDFs
- **Total ~344,325 PDFs.**
- JMD folders (foldersRoot=`H:/PRISM/Docustrata`): **JMD Quotes 955 · JMD Sales Orders 21,515 · JMD Orders Closed 12,761 · JMD Packing Slips ~1,149**. All born-digital (pypdf, no GPU).

## Honest state (R12)
The OCR/run-all orchestrator (`scripts/docustrata-run-all-documents.mjs` + `scripts/lib/docustrata-doc-pipeline-lib.mjs`, 30 tests) shipped **today** (U-QP-DOCUSTRATA-RUN-ALL `635b41af76`) and is correct + resumable. The PoC ran only ~5 docs. The genuine gap is a build chain of data-correctness + scaling units, **not** the OCR engine.

## Key real-data findings (ground truth, read this session)
1. **`documents-text-extracted-v3.jsonl` (73,506 rows) has 0 targeted-role rows WITH text.** The $-bearing docs (Orders Closed) are un-OCR'd scans not in this index. Real text only reaches the pipeline via `--from-folders` (the `.index` has 0 records inside JMD folders).
2. **Orders Closed = PURCHASE ORDERS** (customer -> JM Die the vendor). They carry $ as per-line `Amount: $X` / `Unit Cost: $Y` + an `Order Number`/`PO Number`, NOT an `INVOICE TOTAL` line. Real samples: Elite Fasteners PO #28469 ($347.50/$173.75 lines), Elgin PO #134368.
3. **Quotes folder = engineering drawings** — only ~8/374 carry a $ (the quoted price is NOT reliably in the Quotes folder). **Where the QUOTED price lives is an OPEN question** — likely the historical baseline corpus / PRISM predictions, not the Quote PDFs. The document pipeline's primary value is extracting **ACTUAL prices** (Orders Closed) at scale.
4. The orchestrator's **merge stage (Stage 5) merges onto the classified index, not the folder workset** — observed CLOSED_ORDER folder docs not surfacing with CLOSED_ORDER role in the merged output (a plumbing gap; see U-QP-FOLDER-COVERAGE).

## SHIPPED this session (all on cad-fusion-live-ms0 trunk via [MAIN-FORCE])
- **U-QP-CLOSEDORDER-ROUTING-FIX** (`scripts/lib/docustrata-outcome-extract-lib.mjs` + test, refactored `extract-docustrata-outcomes.mjs`). The pair-killing bug: CLOSED_ORDER was mis-filed as a quote; now it's an ACTUAL source (actual_source provenance). 19 tests + 2-reviewer PASS.
- **U-QP-DOCTYPE-FIELD-MINING** (`17e0cb39c6`). `mineOrderTotal`/`mineOrderNumber`/`mineDollarAmounts` extract $ from the real PO format. **LIVE-VALIDATED: 80 real Orders Closed -> 25 (31%) yield an actual $ (was 0%), matching the ~35%-carry-$ ceiling.** 24 tests.

## REMAINING build units (dependency order, R13) — from the 8-agent understanding workflow
1. **U-QP-FOLDER-COVERAGE-EXTEND** (M) — FOLDER_ROLE_MAP +INVOICE +`JMD Acct RecPay`->ACCOUNTING; fix the Stage-5 merge to preserve folder-workset roles (the observed plumbing gap); per-folder coverage ledger (processed-vs-total, auditable at 35K scale); force OCR route for scan folders.
2. **U-QP-OCR-WORKER-POOL** (M) — sequential OCR ~49s/page -> ~117 days for 138K scans; N-worker pool (semaphore spawn fan-out) on Blackwell 96GB -> 15-29 days. N=1 = byte-identical legacy. Keep-alive + retry-once (silent ok:false data-loss today). Pure pool + injected spawn.
3. **U-QP-TRAINCYCLE-FEED** (M) — `quoting-docustrata-extractor.mjs` DROPS predicted_quote_usd; preserve both $ through the assembler. Flip `docustrata_invoices` consumed:true ONLY on real non-placeholder pairs (R12 fail-loud). NEVER soften PLACEHOLDER_MARKERS provenance gate. Point OODA corpus at real extracted pairs. Closes the 40% coverage ceiling.
4. **U-QP-DISPATCHER-WIRE** (S) — wire `docustrata_run_documents` / `docustrata_extract_outcomes` / `docustrata_coverage` into `quotingDispatcher` (execFileSync subprocess delegation, R8). Round-trip E2E test through the real z.enum gate (MockMCPServer-bypass false-green class).
5. **U-QP-RUN-ALL-EXECUTE** (L) — the actual all-docs run: `--from-folders --routes both --ocr-workers N --ocr-time-budget-min <overnight>`, resumable. Order: Orders Closed + Acct RecPay (actuals) FIRST, then Sales Orders + Quotes. Scale guards: chunk pypdf worklist (30-min timeout), stream Stage-5 merge (OOM at 344K), raise/stream the Stage-6 extractor 64MB maxBuffer. Emit coverage funnel report; feed pairs to OODA; report PRE/POST MAPE with numbers.

## Risks / doctrine pins
- OCR scanned-fraction of full 344K is unquantified; the folder coverage ledger must report route_text_layer vs route_ocr BEFORE committing the overnight OCR budget.
- Customer/part join-key extraction from PO letterhead is weak (JM Die is the *vendor*; the customer is the issuer) — order# is the stronger key now captured; refine before relying on customer|part pairing.
- NEVER inline shop-rate/margin constants; the train-cycle 1.4x markup is a SYNTHETIC stub that real pairs replace — do not hard-code a real margin to make MAPE look good (R12).
- Charlie quoting galaxy develops on the **cad-fusion-live-ms0 trunk** (commits route [MAIN-FORCE], slot/charlie is 3486 behind and lacks the dependency chain).

## Resume
`/checkin-charlie /loop` -> pick U-QP-FOLDER-COVERAGE-EXTEND (unblocks a clean folder run) then U-QP-TRAINCYCLE-FEED, then OCR-pool, dispatcher-wire, and the full run. Full agent maps: this session's workflow transcript `wf_d584c0f9-900`.
