# JM-DOC-POPULATION-MS0 — Master Campaign Plan

> **Goal (operator):** populate EVERY PRISM app feature with real JM Die document data, with **every document accounted for**.
> Owner: slot **hotel** (claude-d7f7d3ce). Tracked as task **#76**. Mode: YOLO autonomous.
> Accountability principle: every document in both corpora resolves to a disposition — either *consumed* by a feature/engine, or an **explicit** named non-consumed disposition (indexed-only / viewer-only / metadata / unrouted-misc / malformed). **Zero silent drops.** A reconciliation gate asserts `total == accounted + explicit-orphan`.

## The two corpora (total 666,744 documents)

| Corpus | Count | Source | What | Owner build |
|---|---:|---|---|---|
| **A — Part/CAD/Program files** | 554,999 | `state/shared/databases/jm-file-inventory.jsonl` (113 MB) | buckets: program / cad / print / scan / setup / doc / other | foundation workflow `w5e2kp2y6` ledger |
| **B — DocuStrata business docs** | 111,745 | `H:/PRISM/Docustrata/` (manifest.json 69MB + `.index/documents-classified-v3.jsonl` 66MB) | OCR'd + AI-classified transactional ERP docs | **this plan (hotel domain)** |

Corpus A and B are **disjoint sources** — A is the engineering file tree (`JM DIE/_PART LIBRARY/...`), B is the DocuStrata document-management export (Evernote/scan ingest). Account separately; do not double-count.

---

## Corpus A routing (foundation workflow `w5e2kp2y6`)
Per-document ledger `scripts/build-jm-document-ledger.mjs` → `state/shared/databases/jm-document-ledger-summary.json`. Routing:
- `program` → program library / post-processor (consumed)
- `cad` → CAD feature-recognition / parts (consumed)
- `print` → BlueprintOCR / drawing archive (consumed)
- `setup` → shop-floor / job setup (consumed)
- `scan`, `doc` → scanned-document archive (indexed-only)
- `other` → part metadata (`part.json`) or **unrouted-misc** (explicit, counted)
- cross-cutting: `customer` → CRM linkage **[DONE: 470 seeded]** · `material` → materials registry · `machine_class` → machine/routing.

## ⚠ RECONCILED 2026-06-02 (R7 conflict resolved — soul-critical)
My initial draft proposed ingesting the 21,544 SALES_ORDER + 12,773 CLOSED_ORDER + 972 QUOTE docs as **discrete** SalesOrderEngine/PurchaseOrderEngine/EstimateEngine records (direction-detected). The foundation workflow `w5e2kp2y6` routing agent took a **more conservative stance, which SUPERSEDES this draft**: ALL DocuStrata financial docs are routed **`indexed-only` / link-only with `financial_guard:true`, NEVER discrete ERP/AR/AP records**, and the ledger asserts `count(consumed AND financial_guard) === 0`.
**Why the conservative call wins (financial-discipline soul):** DocuStrata OCR confidence runs 40–60% (classification-summary: 59.8% of docs at 0.4–0.59); minting 34K live AR/AP records from low-confidence OCR risks silent-financial-clobber + softening invariants. Discrete financial documents *genuinely exist*, but the campaign's job is to **LINK/INDEX them as searchable evidence attached to a customer/job**, not to post them to the books. Posting specific verified invoices to AR/AP stays a **separate, operator-gated** path through the financial engines — out of scope for this bulk campaign. The extracted `{total, po_number, customer, vendor, line_items}` fields + direction-detect (JM-buyer vs JM-seller) are preserved as ledger **side-fields** for that future gated path, not acted on here.

## Corpus B routing — DocuStrata (hotel) — AUTHORITATIVE (matches ledger)
Per-doc record carries `inferred_role` + an `extracted{}` block (schema observed on `Sales_Order_951.pdf`: `{date, due_date, terms, fob, ship_via, tax, subtotal, total, po_number, vendor{name,address}, customer{name,address}, summary, line_items[{unit,amount,quantity,parsed{grade,od,wall,length}}]}`). DocuStrata has TWO sub-sources in the ledger: `docustrata_organized` (foldered) + `docustrata_manifest` (the 111,745 pre-OCR'd manifest — **NEVER re-OCR; pointer only = `metadata` disposition**).

| Role / bucket | Count | Consuming engine | Disposition | Notes |
|---|---:|---|---|---|
| sales_orders | 21,531 | DocumentControlEngine (link) | **indexed-only `financial_guard`** | NO discrete AR/SO. Side-fields kept for gated path. |
| closed_orders | 12,763 | DocumentControlEngine (link) | **indexed-only `financial_guard`** | order-history reference |
| packing_slips | 2,294 | DocumentControlEngine | indexed-only | shipment/doc archive |
| quotes / quote | 971 + 65 | charlie quoting (reference) | indexed-only / metadata | **OWNED BY charlie + chat e75608b8 — link only** |
| tax_financial | 93 | DocumentControlEngine (link) | **indexed-only `financial_guard`** | NO GL synthesis |
| accounting | 52 | DocumentControlEngine (link) | **indexed-only `financial_guard`** | NO GL synthesis |
| invoices / invoice | 5 + 4 | DocumentControlEngine (link) | **indexed-only/metadata `financial_guard`** | NO synthetic AR |
| customer_po / acknowledgment | 2 + 2 | manifest link | metadata `financial_guard` | order reference |
| prints / scans / notes / laser_sheets / shipping / imported | 109,534 | DocumentControlEngine / DocumentInboxEngine | indexed-only | non-financial doc archive |
| manifest `doc` | 111,658 | DocuStrataMaterialPriorEngine (manifest search) | **metadata** | pointer; never re-OCR |
| unclassified | 1,358 | none | **unrouted-misc** (explicit, counted) | |

Total financial-guarded (no synthetic ERP): **34,452**. Customer attribution already built: `Docustrata/.index/phase23-customer-folder-index.json` (240 customers, 53,998 blueprint→customer links). Authoritative counts + 31-tuple breakdown: `state/shared/databases/jm-document-ledger-summary.json`.

---

## SOUL RULES (hotel financial-discipline — non-negotiable)
1. **No fabrication from aggregates** — only ingest discrete records that genuinely exist as documents (DocuStrata docs qualify; charlie's aggregate spend MD does NOT).
2. **No GL synthesis** — seed bridges ingest the *source document records* (orders, quotes, packing slips) ONLY. Posting to GL (journal entries, debits=credits) is a SEPARATE explicit operator/engine step, never auto-fabricated during seeding.
3. **Direction detection mandatory** — never assume a "Sales Order" is a sale; detect JM-buyer vs JM-seller from customer/vendor before routing AR vs AP.
4. **PII redaction** on any export (last4 SSN, masked card, role-only names).
5. **AR/AP (ACCOUNTING/INVOICE/TAX)** are sparse + sensitive → index/link only this phase; discrete-record ingest needs explicit operator sign-off.

## ACCOUNTABILITY GATE
`scripts/jm-doc-population-coverage.mjs` (to build) asserts:
- Corpus A: `554,999 == sum(by_disposition)` (from ledger-summary.json)
- Corpus B: `111,745 == sum(role counts routed)` — every role has a live seed bridge OR explicit deferred disposition
- Every routed doc class with `disposition=consumed` has a shipped seed bridge + passing tests.
Gate stays GREEN = "every document accounted for" holds.

## Seed-bridge PATTERN (proven on customers — replicate)
corpus JSONL → `engine.seedFromX(records)` (pure, idempotent dedup, fail-soft) → thin dispatcher action (`params.records` for test / fail-loud file read for live) → vitest in `mcp-server/src/__tests__/` (happy/idempotent/dedup/invalid/adversarial + dispatcher round-trip) → `scripts/verify-*.ts` real-data check. **Pathspec-commit** (shared tree); `[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [JM-DOC-POPULATION-MS0]/U-ID (slot:hotel):`.

## ORDERED UNIT LIST (R13 logical order — from foundation roadmap `w5e2kp2y6`, AUTHORITATIVE)
`businessDispatcher.ts` is the single-writer bottleneck — units adding actions to it run **SERIAL** (claim file + post AGENT_CHAT first). Units on other dispatchers (cam/post, cad) are parallel-safe.

| U-ID | Domain | Ledger class (count) | Engine.method → dispatcher | Parallel-safe | Status |
|---|---|---|---|---|---|
| U-JM-CUSTOMER-CORPUS-SEED | customers (cross-cut) | crm_link 147,791 | CustomerManagementEngine.seedFromJMCorpus → business | — | **DONE (470)** |
| U-JMDOC-LEDGER | accountability backbone | all 554,999 | scripts/build-jm-document-ledger.mjs | y | **DONE (invariant_ok)** |
| **U-JMDOC01** | accountability gate | meta (whole ledger) | scripts/jm-doc-accountability-gate.mjs | **y (standalone)** | **NEXT #1** |
| **U-JMDOC02** | bridge registry | meta (31 tuples) | state/shared/databases/jm-doc-bridge-registry.json | y | **NEXT #1** |
| U-JMDOC03 | programs/NC (166,191) | consumed | ProgramLibrary seed → prism_cam/prism_post | **y (non-business)** | NEXT #2 — coord echo+kilo |
| U-JMDOC04 | parts/geometry (12,994) | consumed | CadPartLibraryEngine.seedFromJMCorpus → prism_cad | y (non-business) | pending — coord delta |
| U-JMDOC06 | setup-sheets (16) | consumed | SetupSheetLibraryEngine → prism_cam/mill | y (non-business) | pending — coord foxtrot |
| U-JMDOC07 | doc-archive index (109,534) | indexed-only | DocumentControlEngine.seedFromJMCorpus → business | n (serial) | NEXT #3 — opens business chain |
| U-JMDOC08 | scan-viewer archive (85,345) | viewer-only | DocumentControlEngine.seedViewerArchive → business | n (after 07) | pending |
| U-JMDOC05 | parts catalog (30,890) | metadata | PartsLibraryEngine.seedFromJMCorpus → prism_parts:part_seed_jm_corpus | y (non-business) | **SHIPPED** (2026-06-03: 30,890 parts / 468 customers; R7-corrected from JobTravelerEngine → PartsLibraryEngine; gate GREEN 67.0%) |
| U-JMDOC09 | docustrata manifest (111,732) | metadata | DocuStrataMaterialPriorEngine.seedManifestPointers → business/quote | n | pending — **coord charlie** |
| U-JMDOC10 | financial-doc link (34,452) | indexed-only `financial_guard` | DocumentControlEngine.seedFinancialPointers → business | n (last in chain) | pending — §SOUL HARD |
| U-JMDOC11 | campaign close-out | meta | gate GREEN + envelope/MILESTONE/BUILD_STATE/roadmap-index | y | pending |

**3 highest-ROI next builds:** ① **U-JMDOC01+02** (gate + registry — verifiable core, standalone scripts, no dispatcher contention; nothing ships without the gate proving "every doc accounted for") → ② **U-JMDOC03** (166,191 docs = 30% of corpus in one bridge, cam/post dispatcher = parallel-safe) → ③ **U-JMDOC07** (109,534 docs, opens the business-dispatcher serial chain). Combined: 0% → ~50% shipped primary-disposition coverage while the gate keeps the rest honest.

## Coordination
- slot **charlie** owns vendors + quoting-MODEL training — DocuStrata vendor names (PO-AP side) feed charlie's vendor catalog; coordinate, do not duplicate vendor engines.
- slot **delta/echo/kilo** own CAD/CAM/post — corpus A program/cad routing references their engines; hotel only wires the ERP-side linkage.
