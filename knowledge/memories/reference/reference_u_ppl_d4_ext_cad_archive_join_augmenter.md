---
name: reference_u_ppl_d4_ext_cad_archive_join_augmenter
description: "U-PPL-D4-EXT — CADArchiveJoinAugmenterEngine ships 2026-05-15 (commit f98b13933 on slot/delta by claude-339c8ff7) as a COMPLEMENTARY engine to echo's already-shipped U-PPL-D4 ProgramEquivalentIndexEngine. Different architectural approach to the same gap (38 print→CAM-project hits): extends the existing v6 join via buildProgramSeedAugmentation composition (vs echo's sibling program-equivalent-index.json). 2 new prism_cad actions + 51/51 tests + 3-of-3 scrutiny PASS (with Arms B+C catching 2 P1 silent-breakage bugs that got fixed before mark)."
aliases: reference_u_ppl_d4_ext_cad_archive_join_augmenter
type: reference
source: prism-memory
synced: 2026-06-09T14:54:11.015Z
---


# U-PPL-D4-EXT — CADArchiveJoinAugmenterEngine

Shipped 2026-05-15 by claude-339c8ff7 (slot delta, post-/compact /loop iter 2 of 4 target) at commit `f98b13933` on `slot/delta` branch in `H:/prism-slot-delta` worktree.

## Why "-EXT" (not a D4 claim)

Echo (claude-2081f435) ALREADY shipped U-PPL-D4 as `ProgramEquivalentIndexEngine` — envelope `completed_units: 4` is from their commit. The memory recall `[[reference_u_ppl_d4_program_equivalent_index]]` surfaced AFTER I had already invested ~1500 LOC because the memo hadn't been indexed when /checkin and the dup-guard ran.

The work is NOT discarded because the two engines take **architecturally distinct approaches** to the same problem (closing the 38 print→CAM-project hits gap from the envelope brief):

| Aspect | Echo's `ProgramEquivalentIndexEngine` | This commit's `CADArchiveJoinAugmenterEngine` |
|---|---|---|
| Approach | Synthesizes a NEW sibling index | EXTENDS the existing v6 join |
| Output | `program-equivalent-index.json` | `ProgramSeedLink[]` enriched with cad_* fields |
| Pattern | Pure transform, DI lookupFn | Pure transform, composes `buildProgramSeedAugmentation` |
| Consumer impact | Callers must read the new index | Existing v6-join callers get CAD-side hits automatically |
| Lathe `.MIN` | Included (joins CAD + lathe view) | Excluded (already in v6 producer) |

Both compose existing kernels, both pass duplication-guard rules. Operator can decide which becomes canonical or keep both for distinct consumer paths.

## File-by-file ship

| File | Role | LOC |
|------|------|-----|
| `mcp-server/src/engines/CADArchiveJoinAugmenterEngine.ts` | Pure-transform bridge engine + BaseEngine class + singleton | 604 |
| `mcp-server/src/__tests__/CADArchiveJoinAugmenterEngine.test.ts` | 41 engine tests (reference values + variability + adversarial + FAIL-LOUD) | 578 |
| `mcp-server/src/__tests__/cadDispatcher.uppl-d4.test.ts` | 10 dispatcher round-trip tests | 285 |
| `mcp-server/src/tools/dispatchers/cadDispatcher.ts` | +2 actions in z.enum + 2 case blocks + 1 lazy import | 33 modified |
| `mcp-server/src/schemas/cadActionSchemas.ts` | `cadArchiveJoinAugmentSchema` Zod schema + 2 ACTION_CAD_SCHEMAS entries | 41 added |

## Engine surface

```ts
// Constants
export const MILL_PROGRAM_FORMATS: ReadonlySet<CADFormat>
  // = {.ipt, .iam, .f3d, .f3z, .sldprt, .sldasm} — JM Die mill-authoring CAD only

// Module-load anti-drift assertion: every MILL_PROGRAM_FORMATS element MUST be
// in BOTH CAD_FORMATS AND PROGRAM_EQUIVALENT_EXTENSIONS, else throw at startup.

// Pure functions
export function filterMillEligibleEntries(entries, opts?: FilterOptions): CADFileEntry[]
export function augmentJoinFromCADIndex(joinIndex, masterIndex, opts?: FilterOptions): AugmentResult

// Engine class
export class CADArchiveJoinAugmenterEngine extends BaseEngine {
  async loadAndAugment(opts?: LoadAndAugmentOptions): Promise<AugmentResult>
}
export const cadArchiveJoinAugmenterEngine = new CADArchiveJoinAugmenterEngine();
```

## Dispatcher actions (prism_cad)

- `cad_archive_join_augment` — full envelope `{ success, stats, newLinks }`
- `cad_archive_join_augment_dry` — stats-only `{ success, stats, newLinkCount }` (no payload for prod dashboards)

## Scrutiny gate findings

### Per-file scrutiny gate (2 reviewers per file, before next file)

**Engine file** — Agent A (code-analyzer) PASS, Agent B (reviewer) FAIL:
- P0-1: `CADAugmentedLink extends ProgramSeedLink` brittle if parent flips to z.infer → added CONTRACT-LOCK comment
- P1-1: `MILL_PROGRAM_FORMATS` triple-duplication risk → added module-load anti-drift assertion
- P1-2: `isUsableEntry` over-narrows to `CADFileEntry` (only checked 4 of 8 fields) → widened to validate all 8
- P1-3: `zipMisses` folded into `stillOrphan` hides engine-bug signal → added dedicated `cadZipMisses` field
- P1-4: Convention conformance with U-PPL-D3 sibling → fixed stale JSDoc, kept BaseEngine (matches CADFileIndexerEngine input producer)
- P2-1: Trust-boundary doc → added at top of `augmentJoinFromCADIndex`

**Test file** — Agent A (test-review-agent) PASS, Agent B (reviewer) PASS with 1 P1:
- P1-2: Windows backslash path round-trip not tested → added test

### End-of-task 3-of-3 scrutiny gate

- Arm A (reviewer, holistic): PASS
- Arm B (reviewer, independent): FAIL → fixed → mark PASS
  * Dispatcher tests used empty `join.jsonl` fixtures; `loadJoinIndex` rejects 0-row files → `if (r.success === true)` branches were dead code → replaced with minimal 1-row v6 join fixture
- Arm C (code-analyzer, analyst): FAIL → fixed → mark PASS  
  * Silent-breakage on `formats:` override: Zod declared `z.array(z.string())` but engine called `.has()` (Set method). Array.has() = undefined → every entry silently rejected. Fix: engine coerces array→Set at top of `augmentJoinFromCADIndex`; FilterOptions.formats widened to `Set | Array` union; 2 new dispatcher tests pin the array-path behavior.

All 3 marked PASS at session `uppl-d4-339c8ff7` after fixes verified by 51/51 PASS.

## Tests: 51/51 PASS

- 4 reference-value pinned cases (T8047D3 ITW / C2500-2497 SCREWS / 9082526 AGRATI / BU-1365-0000-002 TFI) — concrete `matched_normalized_pn` + `match_kind` assertions
- 3-customer × 3-format × 4-complexity × 3-mill-category variability spans
- 8 adversarial: NaN / Infinity / negative sizeBytes / wrong-length fileId / out-of-enum complexityHint / out-of-enum machineCategory / 1000-entry oversize / UNC path
- 4 FAIL-LOUD throws + Windows backslash path round-trip
- Dispatcher: envelope shape, action enum registration, Zod schema rejection, array→Set coercion validation

## Knobs / extension points

- `opts.millOnly: boolean` — restrict to mill/hurco/hypermill machine categories (default false)
- `opts.formats: Set | Array` — override the format allowlist (test fixtures use this)
- `opts.masterIndexPath` — point at a custom master-index.json (test fixtures use this)
- `opts.joinJsonlPath / triplesJsonlPath / maxLineBytes` — forwarded to `blueprintProgramJoinEngine.loadJoinIndex()`

## Operational learning

- **Run /system-viz query BEFORE /checkin pipeline** — [[feedback_system_viz_first_audit]] would have surfaced echo's in-flight D3+D4 work before I invested the LOC.
- **Memory recall fires AFTER the file is written** — the `[[reference_u_ppl_d4_program_equivalent_index]]` memo (score 2) only surfaced when I edited the engine file, not when I picked the unit. The pick-prefresh hook DID surface "CLOSE-OUT candidates: 4" but didn't enumerate which units were close-out candidates.
- **Empty file ≠ valid fixture** — `loadJoinIndex` rejects 0-row JSONL files. Always use a minimal real row when building test fixtures for the v6 join pipeline.
- **Zod `z.array(z.string())` ≠ Set** — when a schema field crosses the MCP boundary, the engine MUST tolerate the array form. Either coerce at the schema-deserialization point or at the engine entry. Don't trust the in-process Set shape.

## Related

- [[reference_u_ppl_d4_program_equivalent_index]] — echo's competing/sibling engine (ProgramEquivalentIndexEngine)
- [[reference_u_ppl_d3_archive_to_parts_catalog]] — sibling milestone unit (D3, echo)
- [[reference_u_ppl_d2_print_pointer_fields]] — sibling milestone unit (D2, this slot's previous loop iter)
- [[feedback_conflict_fork_rule]] — anti-collision pattern
- [[reference_reverse_merge_then_ff_only]] — merge strategy from slot worktree back to integration branch
- [[feedback_system_viz_first_audit]] — visual-first audit doctrine (would have flagged duplicate work)
