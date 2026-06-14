---
name: reference_u_ppl_d3_archive_to_parts_catalog
description: "U-PPL-D3 — ArchiveToPartsCatalogIngesterEngine ships 2026-05-15 (commit b0266be5d) by echo. Bridges JM-Die archive disk-index → in-memory PartsLibraryEngine catalog. Pure transform, composes U-PPL-D1 + U-DOCU-05 + PartsLibraryEngine. New action prism_parts:part_ingest_from_archive (17→18 dispatcher actions). MS-PRINT-PROGRAM-LOOP completed_units 2→3."
aliases: reference_u_ppl_d3_archive_to_parts_catalog
type: reference
source: prism-memory
synced: 2026-06-09T14:54:11.014Z
---


# U-PPL-D3 — ArchiveToPartsCatalogIngesterEngine

Shipped 2026-05-15 by claude-2081f435 (slot echo, post-/compact /loop iter 3) at commit `b0266be5d` — single clean commit, no peer collisions.

## What it does

Bridges the JM-Die archive disk-index (the v2 enumeration of every program file in `JM DIE/`) to the in-memory `PartsLibraryEngine` catalog (the prism_parts dispatcher's revision-controlled Parts store). For each program file:

1. Extracts a normalized JM-Die part-number from the filename via U-PPL-D1's `extractJMDieCandidates` + `normalizeJMDiePN` (the canonical normalizer — handles T8047D3 ITW / C2500-2497 SCREWS / 9082526 AGRATI / BU-1365-0000-002 TFI).
2. Optionally looks up a matching blueprint via U-PPL-D1's `lookupPrintForProgram` (when caller supplies a `ProgramPrintLinkIndex`).
3. Calls `partsLibraryEngine.create()` to register the Part, attaching the program file path AND (when link-enriched) the print PDF as `drawing_file_id` + match_confidence as a `link:<conf>` tag.

This makes the parts catalog the **join hub** for archive-driven workflows — once ingested, quote/schedule/traveler/ERP skills all query `prism_parts:part_search` by normalized PN and get the program + print + customer + match confidence as a single record.

## File-by-file ship

| File | Role |
|------|------|
| `mcp-server/src/engines/ArchiveToPartsCatalogIngesterEngine.ts` | ~340 LOC engine. Exports `ingestArchive(opts)`, `groupByNormalizedPN(entries)`, `DEFAULT_INGEST_LIMIT`, class wrapper + singleton. Pure transform — no `fs.*` calls. |
| `mcp-server/src/__tests__/ArchiveToPartsCatalogIngesterEngine.test.ts` | 14/14 PASS suite (happy/variability/rejection/adversarial/wiring). |
| `mcp-server/src/schemas/partsLibraryActionSchemas.ts` | +1 Zod schema (`part_ingest_from_archive`). |
| `mcp-server/src/tools/dispatchers/partsLibraryDispatcher.ts` | +1 enum entry + 1 case block with optional link-enrichment branch. ACTIONS 17→18. |
| `mcp-server/data/milestones/MS-PRINT-PROGRAM-LOOP.json` | U-PPL-D3 status=completed + exit_evidence + closeout_note. Milestone `completed_units` 2→3. |

## Composes, does not duplicate

Per [[duplicationGuardEngine]] mandate:

- **U-PPL-D1's normalizer + extractor + lookup** — imported as module-level functions, not forked. The 4 customer-prefix-stripping rules (T8047D3 ITW etc.) live in U-PPL-D1; this engine never touches them.
- **U-DOCU-05's JMDieDiskIndexEntry** — imported as a type, not redeclared. Disk-side walking is U-DOCU-05's domain; this engine accepts the already-enumerated array.
- **PartsLibraryEngine.create** — called directly. No re-implementation of part-number uniqueness, no shadow Map.

**Adjacent to but NOT a duplicate of** [[reference_u_docu_05_jm_die_back_annotation]]: that engine writes filesystem sidecars at `<archiveRoot>/Docustrata/.index/prism_parts/<pn-norm>.json`; this engine writes in-memory `PartsLibraryEngine` records (the prism_parts dispatcher's catalog). Complementary surfaces — disk vs in-memory — not duplicates.

## Wiring

**prism_parts:part_ingest_from_archive** params:
- `entries: JMDieDiskIndexEntry[]` (required) — typically the contents of `Docustrata/.index/jm-die-index-v2.json`
- `join_jsonl_path?: string` — optional v6 join JSONL for link enrichment
- `input_program_paths?: string[]` — optional seed augmentation for the link index
- `dryRun?: boolean` (default `true`) — safety gate
- `limit?: number` — operator-incremental ingest cap
- `tagFromEntry?: boolean` (default `true`) — surface customer + machine as Part tags

When `join_jsonl_path` OR `input_program_paths` is supplied, the dispatcher lazy-imports `loadLinkIndex` from `ProgramPrintLinkIndexEngine` and feeds the composite link index to the engine. FAIL-LOUD on missing/corrupt v6 join — surfaced via dispatcher try/catch as structured error envelope.

## Safety properties

- **Pure-transform engine** — no `fs.*` calls. Archive enumeration is the caller's job.
- **dryRun: true default** — first call returns the diagnostic without mutating; operator sets `dryRun: false` to actually populate the catalog.
- **Idempotent** — re-ingest of same archive list does not duplicate. The first call's `created` outcomes become `skipped_already_present` on the second call. Same `part_id` returned both times.
- **FAIL-LOUD on non-array input** — runtime type fuzz (`entries: null` or `entries: "string"`) throws immediately rather than silently producing zero-count noise.
- **Group-by-PN preserves first-seen order** — deterministic test output across runs.
- **Multi-program-per-PN handled** — `program_count` field surfaces the count; the primary program (first seen) gets the print-link lookup; secondaries are recorded but not link-enriched (D4 concern).

## Tests — 14/14 PASS

`src/__tests__/ArchiveToPartsCatalogIngesterEngine.test.ts`:
- 3 happy paths: single-entry create, multi-PN grouping (T8047D3 ITW + 8047D3-R collapse to PN 8047D3), link-enriched (drawing_file_id flows through)
- 3 variability spans: non-program extensions skipped (.txt/.pdf/.doc), multi-customer span (ITW/ALCOA/OPTIMAS tags preserved), dotless extension recognized
- 3 input rejection: non-array fuzz throws, missing stem+name → skipped_no_pn, sub-MIN_PN_REMAINDER_LENGTH → skipped_no_pn
- 3 adversarial: empty entries[] safe, limit cap honored (limit=2 of 5), idempotent re-run preserves part_id
- 2 wiring: singleton delegates, class wrapper exposes

**1 fixture bug caught pre-test-pass.** Test fixture's `ProgramToPrintLink` shape was wrong — used a nested `prints[{print_id, doc_id}]` array instead of top-level `print_id` + `print_doc_ids[]` (the real `BlueprintProgramJoinEngine.ProgramToPrintLink` shape). Engine ALSO had to be updated: now extracts `top.print_id` (top-level) first, falls back to `top.print_doc_ids[0]`, accepts both `match_confidence` (v6/triple) and `match_kind` (seed). This is the kind of fixture/engine drift that 14/14 happy-path passes can mask — caught by careful type-grounded fixture review.

## Session context (3-unit /loop)

This was iter 3 of /loop target=8 for slot echo (claude-2081f435), continuing post-/compact docustra work:

1. **iter 1** — U-PPL-D1 prism_data mirror (commit `a045840af`). The previous envelope iteration claimed peer commit 9a807803a absorbed the data mirror; `git show --stat 9a807803a` proved that wrong. Genuinely shipped the missing mirror. See [[reference_u_ppl_d1_program_print_link_index]] for the correction note.
2. **iter 2** — U-PPL-D2 envelope flip (commit `188e07729`). Implementation was complete across prior peer commits but envelope wasn't flipped; pure verification close-out. 63/63 PASS.
3. **iter 3** — U-PPL-D3 this engine (commit `b0266be5d`). 14/14 PASS, single clean commit.

## Follow-ups (not blocking)

- **U-PPL-D4**: Rebuild `cad-file-index/master-index.json` from the CAD half of the archive (`.ipt`/`.iam`/`.f3d`/`.SLDPRT`/`.MIN` as program-equivalent for mill jobs). Per envelope: "May overlap MS-RES-MACHINE-MODELS / RES-MS10 — check cad_registry_scan first." Don't rebuild a CAD scanner without confirming there isn't already one.
- **U-PPL-D5**: Track D fifth unit — not read in detail yet by this session.
- **Tracks A (7 units), B (4 units), C (7 units)** — Phase 0 of MS-PRINT-PROGRAM-LOOP has 4 tracks total; only Track D has any units shipped (3/5 done). Tracks A/B/C are not_started.
- **Multi-program-per-PN revision** — D3 records `program_count` but does NOT call `addRevision` for the secondary programs. When a PN has 3 programs (OP10/OP20/OP30), only the first becomes the Part's primary `cad_file_id` association. A future unit may decide to fan these out as revisions OR as separate part records keyed by PN+OP.
- **First-run on real archive** — once the operator has `jm-die-index-v2.json` populated (the disk-side walk from U-DOCU-05), call `prism_parts:part_ingest_from_archive` with `entries: <those entries>, dryRun: true` first to see the expected create count, then `dryRun: false` to populate the in-memory catalog.

## Companion memories

- [[reference_u_ppl_d1_program_print_link_index]] — D1 link-index engine (the normalizer + lookup foundation).
- [[reference_u_docu_05_jm_die_back_annotation]] — D's archive walker + filesystem sidecar writer (complementary, not duplicate).
- [[reference_milestone_progress_surface]] — MS-PRINT-PROGRAM-LOOP now shows 3/23 shipped.
- [[reference_build_state_surface]] — engine count +1.
- [[feedback_roadmap_close_out]] — 4-surface close-out applied for all 3 commits.
