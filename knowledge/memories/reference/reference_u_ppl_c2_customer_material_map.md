---
name: reference_u_ppl_c2_customer_material_map
description: "U-PPL-C2 — CustomerMaterialMapEngine ships 2026-05-15 (commit 7e1ad610b on slot/bravo, merged to cad-fusion-live-ms0 as 173f6305b by claude-339c8ff7, slot bravo /loop iter 3/4 post-/compact). Pure-transform engine producing learned customer→material distribution from program samples + filename heuristics + back-annotated blueprint. Composes MATERIAL_KEYWORDS via single-source export from MaterialResolverForProgramsEngine (anti-fork). 2 prism_data actions + 75/75 tests + 3-of-3 scrutiny PASS (A holistic + B independent + C analyst all PASS after 4 blocker fixes). MS-PRINT-PROGRAM-LOOP completed_units 4→5."
aliases: reference_u_ppl_c2_customer_material_map
type: reference
source: prism-memory
synced: 2026-06-09T14:54:11.011Z
---


# U-PPL-C2 — CustomerMaterialMapEngine

Shipped 2026-05-15 by claude-339c8ff7 (slot bravo, /loop iter 3/4 post-/compact) at commit `7e1ad610b` on `slot/bravo` branch in `H:/prism-slot-bravo` worktree. Merged to `cad-fusion-live-ms0` as `173f6305b` (resolved D1+C2 coexistence in dataActionSchemas + dataDispatcher).

## What it closes

`MaterialResolverForProgramsEngine._resolveFromCustomer()` had an explicit inline comment: *"Known customer → material associations (shop tribal knowledge) — These would ideally come from a persistent database, but we encode common patterns from the Box drive folder structure."* The current implementation only fires when the FOLDER NAME ITSELF contains a material keyword (rare — JM-Die customers are names like "ALCOA", "TOPURA", "JACOBSON" with no material signal). The miss rate is structural.

U-PPL-C2 ships THAT "persistent database" — a LEARNED customer→material distribution from real evidence:
1. **Filename heuristic** — alloy codes embedded in filenames ("4140-ROLLER.MIN", "HRC52-DIE.MIN", "303SS-SHAFT.MIN")
2. **Back-annotated blueprint material** — when a print is joined to the program via U-PPL-D1 + the print has been back-annotated (material 57% of cases per JMDieArchiveBackAnnotationEngine)
3. **Customer folder fallback** — preserves the existing inline-pattern signal as a low-confidence catch-all

## File-by-file ship

| File | Role | LOC |
|------|------|-----|
| `mcp-server/src/engines/CustomerMaterialMapEngine.ts` | Pure-transform engine + class + singleton + Zod schema | 660 |
| `mcp-server/src/__tests__/CustomerMaterialMapEngine.test.ts` | 64 engine tests | 690 |
| `mcp-server/src/__tests__/dataDispatcher.uppl-c2.test.ts` | 11 dispatcher round-trip tests | 220 |
| `mcp-server/src/engines/MaterialResolverForProgramsEngine.ts` | Single-line `export` keyword addition + FUTURE-REFACTOR note | 18 added |
| `mcp-server/src/schemas/dataActionSchemas.ts` | `programSampleEntryShape` + 2 schemas + 2 ACTION_DATA_SCHEMAS entries | 50 added |
| `mcp-server/src/tools/dispatchers/dataDispatcher.ts` | +2 z.enum entries + 2 case blocks + action count 142→144 | 70 added |

## Engine surface

```ts
// Pure functions
export function extractMaterialFromFilename(filename): MaterialHit | null
export function extractMaterialFromCustomerFolder(customer): MaterialHit | null
export function resolveEntryMaterial(entry: ProgramSampleEntry): MaterialHit | null
export function buildCustomerMaterialMap(entries: ProgramSampleEntry[]): CustomerMaterialMap
export function lookupMaterialDistribution(map, customer): CustomerMaterialDistribution | null

// Schema + constants
export const ProgramSampleEntrySchema (Zod)
export const ISO_GROUP_SCHEMA = z.enum(["P","M","K","N","S","H"])
export const SOURCE_CONFIDENCE = { blueprint: 0.90, filename: 0.70, folder: 0.50 }

// Engine class wrapper
export class CustomerMaterialMapEngine { buildMap, lookup, extractFromFilename, ... }
export const customerMaterialMapEngine = new CustomerMaterialMapEngine();
```

## Defensive guards (P0/P1 fixes from scrutiny iterations)

- **MAX_FILENAME_LEN = 1024 bytes** — ReDoS floor (Reviewer B P1-4)
- **Module-load assertion** — throws if any MATERIAL_KEYWORDS pattern carries `/g` flag (Reviewer A P0-1; idempotence invariant)
- **Zero-width match defense** — if `matched.length === 0`, `scanFrom += 1` to prevent infinite loop on a future lookahead-only pattern (Reviewer C P0)
- **Thread-context disambiguation** — rejects M2/M5/S7/P20 alloy codes when filename contains SCREW/BOLT/TAPTITE/THREAD context (Reviewer A P0-2). Without this, TOPURA's real bestProgram "C-159-7-M5-TAPTITE2000-CASE.min" would false-positive as M5 tool steel when M5 is actually a thread spec. JM-Die runs heavy fastener work (TOPURA TAPTITE, NATHANS USB, SEMBLEX) where these collisions are frequent.
- **FAIL-LOUD TypeError on non-array input** — engine never returns silent empty result
- **Lock tests** — pin MATERIAL_KEYWORDS catalog order + no-/g-flag at unit-test time

## Dispatcher actions (prism_data)

- `customer_material_map_build` — full envelope `{ success, data: { map } }`
- `customer_material_lookup` — single customer envelope `{ success, data: { customer, distribution, map_stats } }`

**slimResponse consumer-contract caveat**: lookup miss returns `distribution: null` engine-side, but `slimResponse` strips null fields → consumers see `distribution: undefined`. Check `data.distribution == null` (loose equality) to handle both shapes. `map_stats.customer_count > 0` confirms the build ran.

**WIRE-EXEMPT(prism_turning, prism_machining_kb)** — documented in engine header. Data-engine surface; downstream consumers (U-PPL-B3 ArchiveReoptimizationBatchEngine + U-PPL-A5 MillPartClassifierEngine) integrate via `prism_data:customer_material_lookup` directly. Wiring to every dispatcher would create dead actions. Mirrors U-PPL-D3 ArchiveToPartsCatalogIngester precedent (prism_parts only, not also prism_turning).

## Scrutiny gate findings

### Per-file gate (engine — 2 reviewer passes)
- Agent A (code-analyzer) FAIL → 2 P0:
  - P0-1: regex `lastIndex` state contamination on future /g patterns → fixed (module-load assertion)
  - P0-2: thread-spec false positive (M2/M5/S7 vs alloy codes) → fixed (thread-context regex + AMBIGUOUS_FASTENER_TOKENS set + inner re-scan loop)
- Agent B (reviewer) PASS WITH P1 → 4 P1 fixed: Zod schema export, instance-method waiver note, lock test for MATERIAL_KEYWORDS order, MAX_FILENAME_LEN guard

### Per-file gate (tests — 2 reviewer passes)
- Agent A (test-review-agent) PASS — 46 it()s, real-value assertions, JM-Die reference data, ≥3 failure modes
- Agent B (reviewer) PASS WITH 2 P1 → both fixed:
  - P1-1: "ISO_GROUPS iteration breaks ties" test could pass even with reversed ISO_GROUPS due to "P" seed → added M-vs-N tie test
  - P1-2: misleading "medium-carbon default" comment → renamed to "P group"

### Per-file gate (wiring batch — 2 reviewer passes)
- Agent A (wiring-review-agent) PASS WITH 1 P2 (redundant early-return on empty customer — harmless)
- Agent B (reviewer) PASS WITH 1 P1 → fixed: added CONSUMER CONTRACT NOTE JSDoc explaining slimResponse null-strip

### End-of-task 3-of-3 gate (session uppl-c2-339c8ff7)
- Arm A (holistic): PASS first try
- Arm B (independent): FAIL → 2 BLOCKER fixed:
  - MaterialResolverForProgramsEngine has no FUTURE-REFACTOR note for U-PPL-C2 integration → added inline comment at top of _resolveFromCustomer documenting deferred integration
  - Dispatcher validation flow not explicit → added VALIDATION FLOW JSDoc explaining ACTION_DATA_SCHEMAS upstream Zod safeParse + as-cast safety + engine FAIL-LOUD defense in depth
- Arm C (analyst): FAIL → 2 BLOCKER fixed:
  - Zero-width regex match infinite-loop risk → added `if (matched.length === 0) scanFrom += 1; continue;` defense
  - Engine not wired to all dispatchers → added WIRE-EXEMPT(prism_turning, prism_machining_kb) tag with reason

All 3 marked PASS after fixes verified by 75/75 retest.

## Tests: 75/75 PASS

- 64 engine tests (CustomerMaterialMapEngine.test.ts): lock tests (2) + happy paths (9) + path/case/boundary (7) + thread-context (6) + MAX_FILENAME_LEN (2) + folder source (3) + source-priority (5) + FAIL-LOUD/invalid (3) + distribution math (7) + lookup (4) + class wrapper (3) + Zod boundary (6) + adversarial (4) + integration (1)
- 11 dispatcher round-trip tests (dataDispatcher.uppl-c2.test.ts): action enum (1) + map_build envelope (3) + lookup envelope (4) + Zod boundary (3)

## Operational learnings

- **System-viz query BEFORE picking unit catches the duplicate-engine class.** Query `MaterialResolver` surfaced the existing `MaterialResolverForProgramsEngine` which has `_resolveFromCustomer()` — the natural integration point. Without this query, U-PPL-C2 might have been built as a sibling rather than complement. [[feedback_system_viz_first_audit]]
- **Slot rebound via terminal-pin works as designed.** Previous iter (U-PPL-D4-EXT) was in slot delta; this iter post-/compact terminal-pin re-bound to slot bravo. `alreadyOwned: true` in chat-slots claim confirms binding stability. Per-chat handoff topic prefix updated `delta-docu-print-o → bravo-docu-print-org`.
- **slot/bravo worktree was behind main when starting; reverse-merge is the recovery.** slot/bravo branched from older HEAD (cbead168d). Main has D1/D2/D3/D4 commits slot/bravo doesn't. The merge to cad-fusion-live-ms0 conflicts in dataActionSchemas.ts + dataDispatcher.ts — resolved by keeping BOTH D1 (program_print_link_*) AND C2 (customer_material_*) schemas + actions. Action count 140 → 142 (D1) → 144 (C2). Same pattern as U-PPL-D4-EXT's earlier conflict resolution.
- **Lock-test on the catalog you depend on is cheap insurance.** Adding a unit test that asserts MATERIAL_KEYWORDS.length + first-N entries catches future PRs that silently re-prioritize the regex match order. The 2-line lock-test prevents an entire class of hidden-coupling regression.

## Related

- [[reference_u_ppl_d1_program_print_link_index]] — sibling D1 (the print↔program join surface this could enrich)
- [[reference_u_ppl_d2_print_pointer_fields]] — sibling D2 (back-annotated print pointers; future C2 enhancement)
- [[reference_u_ppl_d3_archive_to_parts_catalog]] — sibling D3 (parts catalog ingest; precedent for WIRE-EXEMPT pattern)
- [[reference_u_ppl_d4_program_equivalent_index]] — sibling D4 (program-equivalent index)
- [[reference_u_ppl_d4_ext_cad_archive_join_augmenter]] — my previous iter (U-PPL-D4-EXT)
- [[feedback_system_viz_first_audit]] — visual-first audit doctrine (saved a duplicate this iter)
- [[feedback_conflict_fork_rule]] — slot-tree branching pattern that enabled the reverse-merge
- [[feedback_parallel_scrutiny_per_file]] — per-file scrutiny gate (applied at engine + tests + wiring batches)
- [[feedback_scrutiny_3of3_readonly]] — end-of-task 3-of-3 gate (all 3 PASS after fixes)
