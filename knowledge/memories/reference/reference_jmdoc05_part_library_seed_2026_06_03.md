---
name: reference_jmdoc05_part_library_seed_2026_06_03
description: "U-JMDOC05 shipped — PartsLibraryEngine.seedFromJMCorpus seeds the 30,890 structural part_library/other JM rows as a metadata parts catalog (468 customers); JM-DOC-POPULATION-MS0 coverage 61.4%→67.0%, gate GREEN."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.165Z
aliases: reference_jmdoc05_part_library_seed_2026_06_03
---


U-JMDOC05 (JM-DOC-POPULATION-MS0, slot:hotel, 2026-06-03) shipped the part_library/other → metadata seed bridge.

**What:** `PartsLibraryEngine.seedFromJMCorpus(records)` + exported helpers `isStructuralPartLibraryOther` / `derivePartIdentity`; dispatcher action `prism_parts:part_seed_jm_corpus` (test path `params.records`; live path streams `state/shared/databases/jm-file-inventory.jsonl`); schema `part_seed_jm_corpus`; test `PartsLibraryEngine.jm-corpus-seed.test.ts` (19/19); real-data check `scripts/verify-jm-part-library-seed.ts`.

**Key facts (verified against the real 555K-row inventory):**
- Structural filter is a byte-for-byte mirror of `scripts/build-jm-document-ledger.mjs` `classify()` part_library|other branch: `basename==="part.json"` OR path matches `/R\d+/` rev folder. Streamed count reconciles EXACTLY: 31,023 total − 133 non-structural(deferred) = **30,890 structural**.
- Seeds **30,890 parts across 468 customers**, 0 invalid, 0 out-of-scope, idempotent (re-seed → all skipped_existing).
- part.json files are GONE from disk (inventory is a 2026-05-27 snapshot) → identity derived from PATH + inventory `customer` field, never part.json content.
- part_number namespaced `<CUSTOMER>/<PART>` (prevents cross-customer collision in the global index); `customer_id=jm:<CUSTOMER>` (NOT a UUID — metadata catalog; future unit can cross-link to seeded CustomerManagementEngine UUIDs); raw customer also a search tag.
- R7 CORRECTION: the ledger named JobTravelerEngine (work-routing, wrong); the bridge registry corrected the home to PartsLibraryEngine (revision-controlled catalog). Followed the registry.

**Accountability:** 5 counters PARTITION every row — `total_records === parts_created + revisions_added + skipped_existing + skipped_out_of_scope + skipped_invalid` (zero silent drops). Two parallel reviewers caught a P0 double-count (a new part carrying a non-A rev bumped both parts_created AND revisions_added) — fixed so revisions_added counts only revs added to PRE-EXISTING parts. Gate `scripts/jm-doc-accountability-gate.mjs` stays GREEN; coverage 61.444%→67.034%; bridge registry tuple flipped pending→shipped; `jm-population-status.json` dashboard regenerated (closed-loop `inbox_population_status` query reflects it).

**Remaining JM-DOC-POPULATION-MS0 pending (NOT hotel — lane discipline):** U-JMDOC03 programs (echo+kilo), U-JMDOC04 cad (delta), U-JMDOC06 setup (foxtrot), U-JMDOC09 manifest packing_slip (charlie). See [[feedback_psn_definition]].
