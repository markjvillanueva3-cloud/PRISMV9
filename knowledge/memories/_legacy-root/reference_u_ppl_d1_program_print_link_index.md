---
name: reference_u_ppl_d1_program_print_link_index
description: "U-PPL-D1 — ProgramPrintLinkIndexEngine ships 2026-05-15 (commit 21854fed0 + absorbed 9a807803a). MS-PRINT-PROGRAM-LOOP Track D first unit complete. Composite link index over BlueprintProgramJoinEngine with enhanced JM-Die PN normalizer + program-side seed augmentation."
source: prism-memory
synced: 2026-05-18T01:02:10.148Z
aliases: reference_u_ppl_d1_program_print_link_index
---


# U-PPL-D1 — Program/Print Link Index Engine

Shipped 2026-05-15 in 3 commits:
- `21854fed0` — charlie/claude-339c8ff7: engine + test + claim
- `9a807803a` — peer ALPHA absorption: schema + prism_dev case-blocks ONLY (NOT data mirror — the earlier version of this memo overstated peer's reach; `git show --stat 9a807803a` does not touch `dataDispatcher.ts` or `dataActionSchemas.ts`)
- `a045840af` — **echo/claude-2081f435 (this session, 2026-05-15 post-/compact)**: genuinely ships the prism_data mirror that the previous closeout_note optimistically claimed. +2 Zod schemas + 2 enum entries + 2 case blocks + 12-test round-trip suite (`dataDispatcher.uppl-d1.test.ts`). dataDispatcher action count 140→142. Tests: 66/66 engine + 12/12 dispatcher = 78/78 PASS.

**Both prism_dev AND prism_data surfaces now genuinely live.** Per [[feedback_roadmap_close_out]] all 4 surfaces touched (envelope unit-level status, roadmap-index completed_units, MILESTONE_PROGRESS regen, BUILD_STATE regen, chat-bus posted at entry chat-1778863897348).

Coordinated with bravo (claude-2081f435) on MS-PRINT-PROGRAM-LOOP per 15:02 chat-bus message: bravo owns Track B (U-PPL-B1..B4 re-optimization), I own Track D (U-PPL-D1 the back-annotation lineage). Non-overlapping tracks.

## What it does

`ProgramPrintLinkIndexEngine` (`mcp-server/src/engines/ProgramPrintLinkIndexEngine.ts`, ~580 LOC) extends `BlueprintProgramJoinEngine` (U-DOCU-04, the v6 query layer) with two augmentations that the parent's blueprint-side seed doesn't catch:

1. **Enhanced JM-Die PN normalizer** — `normalizeJMDiePN(raw)` handles the wild customer-suffixed forms that the parent's `normalizePartNumber` misses:
   - `T8047D3 ITW` → `8047D3` (strip " ITW" suffix + leading "T" prefix)
   - `C2500-2497 SCREWS` → `2500-2497`
   - `9082526 AGRATI` → `9082526`
   - `BU-1365-0000-002 TFI` → `1365-0000-002` (multi-letter prefix BU- tried before single-letter)
   - Shop-floor descriptors: SETUP / SIDE-A / SIDE-B / REWORK / space-separated OP10
   - File extensions stripped as step 1 (so `L-2845-D2.MIN` → `2845`)
   - Fixed-point loop + `MIN_PN_REMAINDER_LENGTH = 4` gate preserves 4+ char PNs

2. **Program-side seed augmentation** — `buildProgramSeedAugmentation(joinIndex, programPaths)` walks every `.MIN/.mcx/.ipt/.iam/.f3d/.SLDPRT` filename in the archive, extracts JM-Die PN candidates, normalizes each, and emits new links for programs the join missed (because the program filename used a customer-prefixed form the blueprint side never saw). Dedupes within a single program by `matched_normalized_pn` + preserves strongest `match_kind` (`filename_exact` > `filename_loose`).

Plus composite API:
- `lookupPrintForProgram(path, idx)` — hits parent's `printForProgram` + `seedLinksByPath`. Returns composite `LookupResult` with stable source ordering `join_v6 → training_triple → program_seed`.
- `lookupProgramsForPrint(pn, idx)` — hits parent's `programForPrint` + falls back to enhanced normalizer + seed lookup.
- `coverageReport(idx, { archiveProgramPaths })` — confidence breakdown (5 known values + `confidence_unknown` FAIL-LOUD bucket for v6-producer schema drift) + disk-side gap walk with invariant `in_v6 + rescued + still_orphan === archive_paths_scanned`.

## Wiring

Two surfaces on `prism_dev` (envelope target) + `prism_data` (peer-mirrored bonus per the brief's `+ prism_data mirror` line):

| Action (both dispatchers) | Purpose |
|--------|---------|
| `program_print_link_lookup` | Composite resolver — `direction:print_for_program` or `direction:program_for_print` + query + optional `input_program_paths` for seed augmentation + optional `join_jsonl_path` override. |
| `program_print_link_coverage` | Coverage report — optional `archive_program_paths` for disk-side gap walk + optional seed inputs. Returns confidence breakdown + disk-side counts. |

Schemas: `mcp-server/src/schemas/devActionSchemas.ts` (lines 103-134) + `dataActionSchemas.ts` (mirrored in commit `a045840af`, this session).

## Safety properties

- **Pure-transform engine** — zero `fs.*` / `path.resolve` calls in the engine itself (path-traversal test verifies opaque-string handling). All I/O delegated to parent's `loadJoinIndex`.
- **FAIL-LOUD per CLAUDE.md R12** — `loadLinkIndex` propagates parent's throw on missing/corrupt v6 JSONL (no success-shaped empty index); `coverageReport` counts malformed `match_confidence` values into `confidence_unknown` bucket instead of silently dropping.
- **Idempotent normalizer** — fixed-point loop; `normalizeJMDiePN(normalizeJMDiePN(x)) === normalizeJMDiePN(x)` for all inputs (asserted in tests).
- **Trust-boundary preserved** — operates on opaque string paths; downstream consumers (e.g. `JMDieArchiveBackAnnotationEngine`) clamp via their own `isPathUnderAllowedRoot` validator before any disk mutation.
- **No parent-cache mutation** — calls `loadJoinIndex` (allocates fresh Maps), not the cached `getJoinIndex` singleton; composite holds its own Maps for `seedLinksByPath` / `seedLinksByPN`.

## Tests — 66/66 PASS

`mcp-server/src/__tests__/ProgramPrintLinkIndexEngine.test.ts` covers:
- 22 normalizer cases (4 envelope-brief wild forms + idempotence-fixed-point + `MIN_PN_REMAINDER_LENGTH` boundary + 15 customer-suffix coverage + shop-floor descriptors + multi-letter-before-single-letter prefix order)
- 8 extractor cases (superset over parent, dedupe, empty-string guards)
- 11 seed augmentation cases (rescue path, already-joined skip, orphan, non-program extension, non-array runtime fuzz, filename_exact vs filename_loose, multi-link emission, path-traversal adversarial)
- 7 composite lookup cases (case-insensitive paths, source-order stability, enhanced-normalizer fallback, found:false negative paths)
- 5 coverage report cases (5 known confidence values + FAIL-LOUD `confidence_unknown` bucket + disk-side invariant + 0-input edge + ISO-8601 timestamp shape)
- 6 tmp-JSONL integration cases via `loadLinkIndex` (no-paths / with-paths / non-array guard / FAIL-LOUD missing-file throw / type export / end-to-end downstream lookup)
- 3 class wrapper convention cases

Sibling tests `BlueprintProgramJoinEngine.test.ts` (59 cases) + `JMDieArchiveBackAnnotationEngine.test.ts` (41 cases) all pass — no regression.

## Per-file scrutiny gate (CLAUDE.md, 2026-05-12)

Run on every file in this multi-file build:
- **File 1 (engine)**: 2 parallel reviewers. Reviewer A PASS with 3 P1; Reviewer B FAIL with 3 P0 + 5 P1. The 3 P0s triaged INVALID (B speculatively guessed about parent-cache mutation / Map-key leak / arithmetic invariant without re-reading the actual code — all three concerns were already mitigated by design). 5 real P1s fixed before File 2: FAIL-LOUD `confidence_unknown` bucket, `MIN_PN_REMAINDER_LENGTH` named constant, runtime non-array guard, single-find refactor in lookup, JSDoc gap.
- **File 2 (test)**: 2 parallel reviewers. Reviewer A PASS; Reviewer B FAIL with 1 P0 (zero coverage on `loadLinkIndex`) + 4 P1. All 4 valid concerns landed: 6-case tmp-JSONL integration block + path-traversal test + `makeIndex` now uses parent's `normalizeProgramPathKey` + non-array fuzz on `loadLinkIndex`.
- **File 3+4 (schema + dispatcher contract pair)**: wiring-review-agent PASS with 0 P0/P1 + 2 P2-P3 deferrables (pre-existing `read_print_pointer` try/catch gap; cosmetic Zod fallback default). Reviewer B rate-limited — replayed in end-of-task 3-of-3.

## 3-of-3 scrutiny (Stop gate)

Session `ppl-d1-339c8ff7`, target commit `21854fed0`:
- Arm A (holistic): **PASS** — 6 acceptance criteria met, FAIL-LOUD discipline preserved end-to-end, no inlined physics constants, dispatcher wiring verified on absorbed peer commit.
- Arm B (independent): **PASS** — tests carry real-value invariants (sum-identity, idempotence, source-ordering, FAIL-LOUD bucket, dedupe-upgrade); 1 P2 cosmetic on fixture path-key duplication.
- Arm C (analyst): **PASS** — no silent breakage / regression / I/O security / error-budget / integration coupling concerns. Sibling tests 100/100 confirm no regression.

## Shared-tree commit collision

Same pattern as [[reference_blueprint_ocr_training_ms1_collision]] and [[reference_training_learning_ms0_u1_collision]]: my schema (`devActionSchemas.ts`) + dispatcher (`devDispatcher.ts`) edits were absorbed into peer ALPHA's commit `9a807803a` titled `[MAIN] [OBSIDIAN-PRISM-OS-MS0]/U-ORPHAN-RESCUE-REVERSE-INDEX`. Files correct + tracked; commit message understates scope.

**CORRECTION (2026-05-15 echo)**: the previous version of this memo said peer's commit ALSO shipped the prism_data mirror. That was wrong — `git show --stat 9a807803a` confirms it did not touch the data files. The prism_data mirror landed separately in commit `a045840af` (echo session, this 2026-05-15 post-/compact iter). Lesson: closeout_note claims should be verified against `git show --stat` before they're encoded as memory.

Per [[feedback_conflict_fork_rule]]: I could have forked to `H:/prism-slot-charlie` after the first commit was hollowed, but the wiring made it into peer's commit before I retried — `git status` after merge confirmed working tree clean. Future U-PPL-D* chats should fork to `H:/prism-slot-charlie` from the start if working under bravo's lane churn.

## Companion memories

- [[reference_milestone_progress_surface]] — MS-PRINT-PROGRAM-LOOP now shows U-PPL-D1 shipped.
- [[reference_build_state_surface]] — engine count +1.
- [[reference_u_docu_05_jm_die_back_annotation]] — U-DOCU-05 (this engine's prerequisite) shipped earlier in the same chat-cycle.
- [[reference_blueprint_ocr_training_ms1_collision]] — sister collision pattern.
- [[feedback_roadmap_close_out]] — 4-surface close-out applied.

## Follow-ups (not blocking)

- **U-PPL-D2**: Add print-pointer fields (`linkedBlueprintPath` / `linkedBlueprintConfidence` / `linkedBlueprintPage`) to `ProgramMemoryEngine.ProgramRecord` + `LatheProgramCatalogEngine` entries. Auto-populate from `ProgramPrintLinkIndexEngine` on `box_program_memory_save` / catalog ingest. New action `prism_data:box_program_memory_link_print`.
- **U-PPL-D3**: `ArchiveToPartsCatalogIngesterEngine` (walks JM-Die archive, creates/updates `prism_parts` entries keyed by normalized PN, attaches program + print file refs via the link index).
- **U-PPL-D4**: Rebuild `cad-file-index/master-index.json` from the CAD half of the archive (`.ipt/.iam/.f3d/.SLDPRT/.MIN` as program-equivalent for mill jobs).
- **Operator first-run**: Once the operator has supplied a list of archive program paths (e.g. from `jm-die-index-v2.json`), invoke `prism_dev:program_print_link_coverage` to see the disk-side gap stats — expected ~31K still-orphan from the FAIL-LOUD count documented in U-DOCU-05's envelope.


## Related
[[engines/ProgramPrintLinkIndexEngine|ProgramPrintLinkIndexEngine]] • [[engines/BlueprintProgramJoinEngine|BlueprintProgramJoinEngine]] • [[engines/JMDieArchiveBackAnnotationEngine|JMDieArchiveBackAnnotationEngine]] • [[engines/ProgramMemoryEngine|ProgramMemoryEngine]] • [[engines/LatheProgramCatalogEngine|LatheProgramCatalogEngine]] • [[engines/ArchiveToPartsCatalogIngesterEngine|ArchiveToPartsCatalogIngesterEngine]] • [[dispatchers/prism_dev|prism_dev]] • [[dispatchers/prism_data|prism_data]] • [[dispatchers/prism_parts|prism_parts]] • [[skills/claude-|/claude-]]