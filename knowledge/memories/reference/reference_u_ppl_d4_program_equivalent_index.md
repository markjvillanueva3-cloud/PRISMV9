---
name: reference_u_ppl_d4_program_equivalent_index
description: "U-PPL-D4 — ProgramEquivalentIndexEngine ships 2026-05-15 by echo. Pure composition over UniversalCADIndexEngine MasterIndex (CAD-as-program for mill jobs) + lathe .MIN JMDieDiskIndexEntry[] (lathe-gcode program-of-record) → unified ProgramEquivalentIndex. Adds prism_cad:program_equivalent_index_compose action. MS-PRINT-PROGRAM-LOOP completed_units 3→4. Composes does NOT duplicate UniversalCADIndexEngine / CADFileIndexerEngine."
aliases: reference_u_ppl_d4_program_equivalent_index
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.241Z
---


# U-PPL-D4 — ProgramEquivalentIndexEngine

Shipped 2026-05-15 by claude-2081f435 (slot echo, post-/compact /loop iter 4) across 2 commits:
- `81ead2a7b` — peer-absorbed: engine + test + schema + dispatcher (shared-tree collision absorption, same pattern as D1/D3 data mirror)
- `5b50aba16` — my own: envelope close-out (status=completed, exit_evidence, closeout_note, completed_units 3→4)

## What it does

Bridges the existing CAD master-index (from `UniversalCADIndexEngine`) with the lathe `.MIN` half of the archive into a single **ProgramEquivalentIndex** keyed by normalized JM-Die part-number.

The brief's directive *"check cad_registry_scan first"* was well-founded: `UniversalCADIndexEngine` (U-CADC01, CAD-COMPLETE-MS0) **already** covers 15 CAD formats including `.ipt/.iam/.f3d/.SLDPRT`, and `cad_registry_scan` action **already** writes `data/state/cad-file-index/master-index.json` via `CADFileIndexerEngine`. D4 does NOT rebuild any of that.

What D4 fills: the `.MIN` gap (not in `TARGET_CAD_FORMATS`). The output is a **SIBLING** file `program-equivalent-index.json` — never clobbers the CAD master-index.json.

## Output shape

```ts
{
  schemaVersion: 1,
  generatedAt: ISO string,
  cad_source: { totalFiles, byFormat: {.ipt: N, .iam: M, ...} },
  lathe_source: { totalEntries, recognized, skipped_not_lathe, skipped_no_pn },
  entries: ProgramEquivalentEntry[],     // unified, kind-tagged
  byKind: { "cad-as-program": N, "lathe-gcode": M },
  byCustomer: Record<string, number>,
  byPartNumber: Record<string, number>,  // normalized PN → count
  linked: number,                        // entries with print_ref
}
```

Each entry: `{ kind, path, format, customer?, machine_category?, size_bytes?, last_modified?, part_number_normalized?, pn_candidates?, print_ref? }`.

## File-by-file ship

| File | Role |
|------|------|
| `mcp-server/src/engines/ProgramEquivalentIndexEngine.ts` (~395 LOC) | Pure transform. Exports `buildProgramEquivalentIndex`, `compose`, `programEquivalentIndexEngine` singleton + `ProgramEquivalentIndexEngine` class. No `fs.*` calls in build path; `compose` is the only async surface (atomic write when `dryRun: false`). |
| `mcp-server/src/__tests__/ProgramEquivalentIndexEngine.test.ts` (~427 LOC, 21 cases) | Happy paths, PN extraction edges (T8047D3 ITW → 8047D3, dotless ext, basename fallback), link enrichment via DI `lookupFn`, input rejection, dryRun safety, write atomicity, wiring. 21/21 PASS. |
| `mcp-server/src/schemas/cadActionSchemas.ts` (+53 LOC) | `programEquivalentIndexComposeSchema` with `.passthrough()` pattern. Wired into `ACTION_CAD_SCHEMAS` map. |
| `mcp-server/src/tools/dispatchers/cadDispatcher.ts` (+79 LOC) | Case handler with lazy-import + optional `loadLinkIndex` when `join_jsonl_path` / `input_program_paths` supplied. Action enum + case both updated. |
| `mcp-server/data/milestones/MS-PRINT-PROGRAM-LOOP.json` | U-PPL-D4 status=completed + exit_evidence + closeout_note. `completed_units` 3→4. |

## Composes (does NOT duplicate)

Per [[duplicationGuardEngine]] mandate:

- **`UniversalCADIndexEngine` / `CADFileIndexerEngine`** — accepted as input via `MasterIndex` type (or null for lathe-only mode). NOT forked. CAD scanning is the existing engine's job; D4 only consumes its output.
- **`ProgramPrintLinkIndexEngine`** (U-PPL-D1) — imports `lookupPrintForProgram`, `extractJMDieCandidates`, `normalizeJMDiePN`. NOT forked. PN normalization rules live in D1.
- **`JMDieDiskIndexEntry`** — imported as a type from `JMDieArchiveBackAnnotationEngine`. NOT redeclared.
- **`cadFileIndexSchema`** — imports `MasterIndex` + `CADFileEntry` types. NOT redeclared.

## DI lookupFn pattern (test isolation breakthrough)

The first 2-test failure cycle taught me: the `ProgramPrintLinkIndex` internal shape (`seedLinksByPath: Map<string, ProgramSeedLink[]>` keyed by a private `normalizeProgramPathKey` function) is too brittle to fixture in a unit test. Fix: engine accepts an injected `lookupFn?: PrintRefLookupFn` parameter that production-bypasses to `buildLookupFromIndex(linkIndex)` when only `linkIndex` is supplied. Tests inject a deterministic stub:

```ts
function makeLookupFn(programPath: string, printId: string, confidence: string) {
  return (queryPath: string) =>
    queryPath === programPath
      ? { print_id: printId, match_confidence: confidence }
      : undefined;
}
```

Production callers still pass `linkIndex` and route through the real `lookupPrintForProgram`. Lesson: **when a downstream type has private/internal normalization, expose a DI hook over the typed result rather than fixturing the internal shape.** Generalize to future engines that consume PrintRefs.

## Safety properties

- **Pure-transform `buildProgramEquivalentIndex`** — no I/O. Async `compose` is the only fs surface (atomic write).
- **`dryRun: true` default** — `compose()` returns the diagnostic without writing.
- **FAIL-LOUD on non-array `latheProgramEntries`** — runtime type fuzz (`null` / string) throws immediately.
- **Limit cap honored** — `limit: 2` of 5 entries processes exactly 2 (`counted = recognized + skipped_not_lathe + skipped_no_pn === 2`).
- **Sibling output path** — `data/state/cad-file-index/program-equivalent-index.json` is a SIBLING of the CAD master-index.json. Never clobbers it. Constant: `DEFAULT_PROGRAM_EQUIVALENT_OUTPUT`.
- **Lathe ext discovery** — `LATHE_GCODE_EXTENSIONS = new Set([".min", ".mac"])`; dotless `"min"` also accepted via `normalizeExt()`.
- **PN floor** — `MIN_PN_REMAINDER_LENGTH = 4`; entries with shorter normalized PN are surfaced as `skipped_no_pn`.

## Shared-tree commit absorption (4th in the docustra series)

Same pattern as:
- D1 data mirror absorbed by peer `9a807803a` (later corrected — peer did NOT absorb the data mirror, but the envelope's first close-out optimistically said they did)
- D3 single clean commit `b0266be5d` (the only docustra unit so far with NO peer absorption)
- D4 source files absorbed by peer `81ead2a7b [CHECKIN-UPGRADE-MS0]/P6-SCRUTINY-FIXES-FOLLOWUP` — title understates scope but files correct + tracked

`git show 81ead2a7b --stat` shows the 4 D4 files unambiguously: `ProgramEquivalentIndexEngine.ts` (+515), `.test.ts` (+427), `cadActionSchemas.ts` (+53), `cadDispatcher.ts` (+79). Composes [[reference_blueprint_ocr_training_ms1_collision]] + [[feedback_conflict_fork_rule]].

Operational note: when the shared tree has 4+ active peers, **stage + commit in one `git commit` invocation, not in sequence**. A lock-blocked retry cycle drops staged files. The D4 absorption happened because my `git add ... && git commit` race-collided with peer activity — the peer's commit absorbed my files, leaving only the envelope flip to commit separately.

## Tests — 21/21 PASS

`mcp-server/src/__tests__/ProgramEquivalentIndexEngine.test.ts`:
- 3 happy paths: CAD-only, lathe-only, joined (T8047D3 ITW + 9082526 AGRATI + BU-1365-0000-002 TFI + C2500-2497 SCREWS — covers all 4 PN-normalizer canonical examples)
- 5 PN edge cases: customer suffix strip, dotless ext, non-program ext skip, sub-MIN_PN floor, basename fallback when stem missing
- 4 link enrichment: lathe via DI, no-match returns undefined, CAD via DI, no-lookupFn path
- 4 input rejection / adversarial: non-array throws, null cadMasterIndex safe, empty entries safe, limit cap honored
- 2 dryRun + write atomicity: dryRun: true does NOT write, dryRun: false writes valid JSON with PROGRAM_EQUIVALENT_INDEX_SCHEMA_VERSION
- 3 wiring: constants exported, singleton delegates, class wrapper

## Session context (4-unit /loop)

This was iter 4 of /loop target=8 for slot echo (claude-2081f435), continuing post-/compact docustra work:

1. **iter 1** — U-PPL-D1 prism_data mirror (`a045840af`)
2. **iter 2** — U-PPL-D2 envelope flip (`188e07729`)
3. **iter 3** — U-PPL-D3 (`b0266be5d`) — ArchiveToPartsCatalogIngesterEngine
4. **iter 4** — U-PPL-D4 (`81ead2a7b` absorbed + `5b50aba16` envelope) — ProgramEquivalentIndexEngine

## Follow-ups (not blocking)

- **U-PPL-D5** — `.mcx-8` binary parser (the highest-leverage unit per envelope §brief — unlocks mill back-annotation + a real MILL_AI_TRAINING_REPORT, currently cold at 27 programs). Requires Mastercam-API automation OR reverse-engineering effort.
- **Tracks A (7 units), B (4 units), C (7 units)** — Phase 0 of MS-PRINT-PROGRAM-LOOP has 4 tracks total; Track D now 4/5, Tracks A/B/C still 0 shipped.
- **First-run on real archive** — once operator has UniversalCADIndexEngine MasterIndex + JMDieArchiveBackAnnotation lathe disk-index populated, invoke `prism_cad:program_equivalent_index_compose` with `dryRun: true` first to see the expected counts, then `dryRun: false` to write the sibling index.
- **Schema bump path** — when adding more `kind` values (e.g., `wedm-gcode`, `sinker-edm-program`), bump `PROGRAM_EQUIVALENT_INDEX_SCHEMA_VERSION` and ship a migration.

## Companion memories

- [[reference_u_ppl_d1_program_print_link_index]] — D1 link-index engine (normalizer + lookup foundation, imported here)
- [[reference_u_ppl_d2_print_pointer_fields]] — D2 print-pointer field flips on ProgramMemoryEngine + LatheProgramCatalogEngine
- [[reference_u_ppl_d3_archive_to_parts_catalog]] — D3 sibling unit that bridges archive → PartsLibraryEngine; same composition pattern
- [[reference_jm_die_program_save_practice]] — the `.MIN` lathe-gcode convention + `.ipt/.iam/.f3d/.SLDPRT` CAD-as-program convention this engine encodes
- [[feedback_conflict_fork_rule]] — companion to the shared-tree commit-absorption pattern observed here
