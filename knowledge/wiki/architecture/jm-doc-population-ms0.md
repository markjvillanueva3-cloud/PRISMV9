---
node_type: architecture
title: JM-DOC-POPULATION-MS0 — accountability-ledger-first population of every PRISM feature with all JM documents
status: population-built-visible-synergy-in-progress
slot: hotel
created: 2026-06-02
related:
  - psn-octopus-fleet-synergy-ms0
  - vendor-catalog-db
  - jm-die-profile
  - knowledge-vault-schema
---

# JM-DOC-POPULATION-MS0

Populate **every PRISM app feature with real JM Die document data**, with **every document
accounted for** — then wire/bridge/synergize that data across backend + AI + Obsidian + Hermes +
awareness + memories + wikis, so a closed-loop app-user test sees populated data everywhere.

Owner: slot **hotel** (`claude-d7f7d3ce`), tracked as task **#76**, mode YOLO autonomous.
Plan of record: [`state/shared/JM-DOC-POPULATION-PLAN.md`](../../../state/shared/JM-DOC-POPULATION-PLAN.md).
Campaign memory: [[reference_jm_doc_population_ms0_2026_06_02]].

## What / Why

JM Die is PRISM's canonical test shop (24,545+ archive files, 100+ customers). For the platform's
app features to be usefully *exercised* — and for a closed-loop "real user" test to mean anything —
they must be loaded with the shop's actual document corpus, not synthetic fixtures. The operator's
bar is exacting: **every document accounted for.** That phrase needs a *verifiable* completion
criterion, which is why this campaign is **accountability-ledger-first**, not ad-hoc seeding. Nothing
ships unless a deterministic gate can prove that each of the corpus's documents resolves to an
explicit disposition — consumed by a feature, or an explicitly-named non-consumed disposition — with
**zero silent drops.**

## Accountability-first architecture (the keystone)

Three coupled artifacts make "every document accounted for" a checkable invariant rather than a
claim:

- **The ledger** — `scripts/build-jm-document-ledger.mjs` streams the real **554,999-file**
  `jm-file-inventory.jsonl` (4 sources × **31 `(source,bucket)` tuples**) and routes every file to one
  of five dispositions — `consumed` / `indexed-only` / `viewer-only` / `metadata` / `unrouted-misc`
  (plus `malformed-line` = 0). Output: `state/shared/databases/jm-document-ledger-summary.json`.
  Current disposition split: consumed **179,201** · indexed-only **144,973** · viewer-only **85,345**
  · metadata **142,622** · unrouted-misc **2,858**. `invariant_ok: true` with all four sub-checks
  green: `disposition_sum_eq_total`, `tuple_sum_eq_total`, `accounted_plus_orphan_eq_total`
  (552,141 accounted + 2,858 explicit unrouted-misc = 554,999), and `no_consumed_financial`. The
  2,858 unrouted-misc are **not** dropped — they are an *explicit, counted* disposition with per-tuple
  reasons (`no_route_for(...)`), the honest residual.

- **The gate** — `scripts/jm-doc-accountability-gate.mjs` (U-JMDOC01) joins the ledger against the
  registry and asserts six checks: **G1** ledger integrity (the four invariants above) · **G2** every
  tuple is tracked in the registry · **G3** every `deferred` tuple carries a reason · **G4**
  unrouted is explicit · **G5** financial tuples are link-only (`no_consumed_financial`) · **G6**
  coverage. Default *progress mode* reports GREEN as coverage advances; `--strict` stays RED until
  100%. Each shipped seed bridge must keep the gate GREEN.

- **The bridge registry** — `state/shared/databases/jm-doc-bridge-registry.json` (U-JMDOC02) maps
  every `(source,bucket)` tuple to a `bridge_status`: `shipped` (live seed bridge + tests) /
  `deferred` (explicit reason, intentionally not ingested) / `pending` (planned, not built). It is the
  single source of truth the gate reads to decide whether a routed class is honestly covered.

## The proven seed-bridge pattern (replicated across the inbox seeds)

Each population unit follows the same shape, proven first on the customer CRM seed and replicated:

```
corpus JSONL
  → engine.seedFromX(records)          # pure, allowlist-gated, idempotent dedup-by-path, fail-soft, no async/OCR
  → thin dispatcher action             # params.records (test path) | fail-loud file read (live path)
  → vitest in mcp-server/src/__tests__/ # happy / idempotent / dedup / out-of-scope / invalid / financial-guard + dispatcher round-trip
  → scripts/verify-*.ts                 # real-data check, reconciled vs the ledger
  → flip registry tuple → shipped
  → gate GREEN
  → pathspec-commit (shared tree, [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [JM-DOC-POPULATION-MS0]/U-ID (slot:hotel))
```

The three inbox seeds (`seedFromJMCorpus` / `seedViewerArchive` / `seedManifestPointers`) plus the
financial `seedFinancialPointers` share a **single DRY private helper, `seedArchiveItems`**, in
`mcp-server/src/engines/DocumentInboxEngine.ts`. Each is fronted by its **own disjoint allowlist** —
four allowlists with **no overlapping buckets** — so a document's `(source,bucket)` tuple deterministically
selects exactly one path and can never be double-counted or leak across archives. This disjointness is
also what makes the financial-discipline soul (below) enforceable *by construction*: a financial bucket
simply is not present in the doc/viewer/manifest allowlists.

## Shipped units

The population is **built and visible** today. Coverage from the live dashboard
(`state/shared/dashboards/jm-population-status.json`, `gate_green: true`):

| Coverage | Value |
|---|---:|
| Shipped coverage | **67.034%** |
| Shipped volume | **372,036** docs |
| Deferred volume | 1,036 docs |
| Pending volume | 179,202 docs |
| Tuples shipped / deferred / pending | **21 / 2 / 6** |
| Distinct customers | **474** (473 corpus + 1) |
| Financial-guarded docs | **34,452** |

| Unit | Disposition | Real count | Engine.method → dispatcher action |
|---|---|---:|---|
| **U-JM-CUSTOMER-CORPUS-SEED** | crm-link (cross-cut) | 470 customers / 147,791 docs | `CustomerManagementEngine.seedFromJMCorpus` → `businessDispatcher:customer_seed_jm_corpus` |
| **U-JMDOC07** doc-archive | indexed-only | 109,534 (prints 42,084 · scans 34,409 · notes 30,417 · packing_slips 2,294 · laser_sheets 178 · shipping 117 · imported 35 · jm_die doc 24) | `DocumentInboxEngine.seedFromJMCorpus` → `inboxDispatcher:inbox_seed_jm_corpus` |
| **U-JMDOC08** viewer archive | viewer-only | 85,345 (part_library scan 85,009 · jm_die scan 329 · jm_die print 7) | `DocumentInboxEngine.seedViewerArchive` → `inboxDispatcher:inbox_seed_jm_viewer` |
| **U-JMDOC09** manifest pointer | metadata | 111,658 manifest docs (104,587 seeded as pointers + 7,071 deduped vs organized/viewer; never re-OCR) | `DocumentInboxEngine.seedManifestPointers` → `inboxDispatcher:inbox_seed_jm_manifest` |
| **U-JMDOC10** financial link | indexed-only / metadata `financial_guard` | 34,452 (sales_orders 21,531 · closed_orders 12,763 · tax_financial 93 · accounting 52 · invoices 5 + manifest invoice/ack/customer_po 8) | `DocumentInboxEngine.seedFinancialPointers` → `inboxDispatcher:inbox_seed_jm_financial` |
| **U-JMDOC05** parts catalog | metadata | 30,890 structural `part_library/other` rows → **30,890 parts / 468 customers** | `PartsLibraryEngine.seedFromJMCorpus` → `partsLibraryDispatcher:part_seed_jm_corpus` |

> **U-JMDOC05 is the first seed bridge OUTSIDE the inbox family** — it lands in the revision-controlled
> `PartsLibraryEngine` (not `DocumentInboxEngine`), so the seeded JM parts are queryable through
> `prism_parts:part_search` / `part_get` / `part_find_similar` / `part_stats`. Same proven contract
> (idempotent, fail-soft, row-accounted), with a 5-way counter PARTITION
> (`parts_created + revisions_added + skipped_existing + skipped_out_of_scope + skipped_invalid === total_records`).

> The customer-CRM cross-cut seeded **470 distinct customers** while attaching a `crm_link` side-field
> to **147,791** documents; the ledger reports **474 distinct customers** present in the corpus. The
> two numbers measure different things (customers *materialized as CRM records* vs customers *observed
> in the document stream*) and are not in conflict.

The four `inbox_seed_jm_*` dispatcher actions are the runtime entry points. Live-runtime seeding into a
running MCP server is a separate runtime operation — the *population layer* (engines, allowlists,
dispatcher actions, tests, verify, ledger, gate) is shipped and proven; actually pushing records into a
live :3100 server instance is an operator-invoked runtime op, not part of this build.

## Financial-discipline soul (load-bearing — never soften)

All DocuStrata financial documents — sales_orders (21,531), closed_orders (12,763), invoices, tax,
accounting, and the manifest invoice/acknowledgment/customer_po pointers, **34,452 total** — are
ingested as **`financial_guard` link-only pointers, NEVER discrete AR/AP records.**

**Why** (the soul rule, R7-reconciled and superseding the initial draft): DocuStrata OCR confidence
runs **40–60%** (59.8% of docs at 0.4–0.59). Minting tens of thousands of live AR/AP records from
low-confidence OCR would risk **silent-financial-clobber** and would soften the system's financial
invariants. The discrete financial documents *genuinely exist*, so the campaign **links/indexes them
as searchable evidence attached to a customer/job** — it does not post them to the books. Posting a
specific, verified invoice to AR/AP remains a **separate, operator-gated path** through the financial
engines, explicitly out of scope for this bulk campaign. Enforcement is two-layer: the four allowlists
**exclude financial buckets by construction** (a financial doc cannot enter the doc/viewer/manifest
archives), and gate check **G5** (`no_consumed_financial`) asserts `count(consumed AND financial_guard) === 0`.
The extracted `{total, po_number, customer, vendor, line_items}` fields plus JM-buyer/JM-seller
direction-detect are preserved as ledger **side-fields** for that future gated path — kept, not acted on.

## Pending + cross-lane coordination

Six tuples (**179,202** docs) are `pending`, handed to the owning domain lanes rather than ingested
unilaterally — the consuming engines live in those galaxies (R8/R11 lane discipline):

| Pending tuple | Count | Unit | Lane |
|---|---:|---|---|
| `jm_die_category/program` | 140,215 | U-JMDOC03 | coord **echo + kilo** (CAM/post) |
| `part_library/program` | 25,976 | U-JMDOC03 | coord **echo + kilo** |
| `jm_die_category/cad` | 7,285 | U-JMDOC04 | coord **delta** |
| `part_library/cad` | 5,709 | U-JMDOC04 | coord **delta** |
| `jm_die_category/setup` | 16 | U-JMDOC06 | coord **foxtrot** (mill) |
| `docustrata_manifest/packing_slip` | 1 | U-JMDOC09 | coord **charlie** |

Two tuples are **deferred** to slot **charlie**: `docustrata_organized/quotes` (971) and
`docustrata_manifest/quote` (65) — quoting ingest is charlie's lane (chat `e75608b8`); JM-DOC keeps
**links only** and must not duplicate charlie's quoting-model path. See [[vendor-catalog-db]] for the
charlie-owned vendor/quoting corpus. Four small `unrouted` tuples (1,358 + 1,354 + 133 + 13 = 2,858)
are deferred with explicit `no_route_for(...)` reasons — counted, awaiting reclassification, never
silently dropped.

> **U-JMDOC05 (R7-corrected, SHIPPED 2026-06-03):** the ledger originally routed `part_library/other`
> to `JobTravelerEngine` (a work-routing engine — wrong home); the shipped target is the
> revision-controlled `PartsLibraryEngine`. `part.json` files are transient on disk (the inventory is a
> 2026-05-27 snapshot), so customer/part/rev are derived from the **path** + inventory customer field,
> not `part.json` content. The structural filter mirrors the ledger's classifier byte-for-byte
> (`part.json` basename OR `/R\d+/` rev folder), reconciling exactly to **30,890 = 31,023 − 133
> non-structural** (the 133 stay deferred/unrouted). part_number is namespaced `<CUSTOMER>/<PART>`
> (no cross-customer collision); `customer_id=jm:<CUSTOMER>`. Real-data proof:
> `scripts/verify-jm-part-library-seed.ts` (30,890 parts / 468 customers, idempotent). Memory:
> [[reference_jmdoc05_part_library_seed_2026_06_03]].

## Synergy phase (the "synergized throughout … wikis" leg)

With ~341K documents seeded and 474 customers materialized, the new operator emphasis is to make that
data **flow into PRISM's intelligence + visibility surfaces** so a closed-loop app-user test sees
populated data everywhere:

- **Visibility — shipped:** `state/shared/dashboards/jm-population-status.json` is the live coverage
  surface (coverage %, volumes, per-tuple pending detail, customer/financial counts, `gate_green`).
- **This entry** closes the **wikis** leg of the synergy goal — the architecture record of the
  campaign in the Karpathy LLM-wiki.
- **Remaining synergy work:** flow the seeded inbox stats into AI/awareness surfaces
  (`inbox_stats` → dashboards), the Obsidian brain, Hermes agent context, and PRISM awareness, so the
  population is discoverable across all 11 PSN legs (see [[psn-octopus-fleet-synergy-ms0]] for the
  fleet-wide PSN/Obsidian/octopus synergy substrate this rides on).

## References

- Plan: `state/shared/JM-DOC-POPULATION-PLAN.md`
- Ledger: `state/shared/databases/jm-document-ledger-summary.json` (`scripts/build-jm-document-ledger.mjs`)
- Gate: `scripts/jm-doc-accountability-gate.mjs`
- Registry: `state/shared/databases/jm-doc-bridge-registry.json`
- Dashboard: `state/shared/dashboards/jm-population-status.json`
- Engine: `mcp-server/src/engines/DocumentInboxEngine.ts` (seed methods + 4 disjoint allowlists + `seedArchiveItems` helper)
- Memory: [[reference_jm_doc_population_ms0_2026_06_02]]
