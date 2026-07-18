---
name: reference_u_ppl_d5_already_built
description: "U-PPL-D5 (.mcx-8 binary parser) is SUBSTANTIALLY ALREADY BUILT under LATHE-PROD-READY-MS0/U-LPR26 (McxProgramParserEngine) + U-LPR28 (McxBatchExtractorEngine). Honest-scoping in slot echo iter 4/8 (claude-2081f435, 2026-05-15 post-/compact) caught this via duplicationGuardEngine before opening a redundant build. The REAL remaining D5 work is a BRIDGE: wire mcxProgramParserEngine output as a third ProgramEquivalentKind ('mill-gcode') into ProgramEquivalentIndexEngine (D4). High-leverage, low-effort. Defers to next chat with fresh context budget."
source: prism-memory
synced: 2026-05-18T01:02:10.167Z
aliases: reference_u_ppl_d5_already_built
---


# U-PPL-D5 — Mastercam .mcx-8 parser is ALREADY BUILT (honest-scoping catch)

Per the per-chat handoff RESUME directive from D4 close-out, next unit was U-PPL-D5: *"the .mcx-8 binary parser (Mastercam-API automation OR reverse-engineered binary format)"*. Honest scoping per envelope brief required checking for any existing reader BEFORE proposing work. Result: substantial pre-existing implementation already shipped.

## What's already shipped

**`mcp-server/src/engines/McxProgramParserEngine.ts`** (LATHE-PROD-READY-MS0/U-LPR26)
- Format detection: `.mcx`, `.mcx-8`, `.mcx-9`, `.mcam` (extension + magic bytes)
- Version inference from header signature
- Bounded I/O: `MAX_FILE_BYTES = 64 MiB` (JM Die corpus tops out ~1.5 MiB per file)
- Never throws — every exit returns `McxProgramMetadata` with `parse_ok` flag
- Magic-verified flag for downstream strict gating
- Encoding-aware string extraction (ASCII + UTF-16 LE)
- Tool labels (`TOOL ...`, `T\d+ -...`)
- Machine hints (`lathe | mill | router | wire | swiss | millturn`)
- Post-processor hints (`*.PST`)
- Material hints (D2/M2/S7/4140 short tokens)
- Zlib-chunk count (`78 9C` / `78 DA` / `78 5E` / `78 01`)
- Rough operation-count estimate (`zlib chunks ÷ 2`)
- Pure `parseBuffer` (fuzzable); `parseFile` is the only I/O surface

**`mcp-server/src/engines/McxBatchExtractorEngine.ts`** (LATHE-PROD-READY-MS0/U-LPR28)
- Bounded concurrency (`min(cpus-1, 8)`, hand-written async semaphore)
- Atomic checkpoint write (tmp + rename)
- Resume-by-default by `runId`
- Per-file failures never poison the run
- Aggregations: `byFormat`, `byMagicVerified`, `byCustomer`
- Sibling to `MINBatchExtractorEngine` — same checkpoint shape

Together these cover JM Die's **3,713 `.mcx-8` + 1,825 `.MCX`** binary corpus.

## What U-PPL-D5 ACTUALLY needs (the BRIDGE)

The MS-PRINT-PROGRAM-LOOP envelope's `phases` field doesn't even contain a U-PPL-D5 unit (verified via `node -e "json scan"` — `NOT FOUND`). The brief mentions D5 as conceptual high-leverage work; the literal envelope spec doesn't lay it out. So the real shape of D5 is: **wire the existing parser into the unified index**.

**Proposed D5-bridge unit** (high-leverage, low-effort, composition-not-duplication):

1. Verify `McxProgramParserEngine` singleton API surface (`parseFile(path, opts) → McxProgramMetadata` / `parseBuffer(buf, filename) → McxProgramMetadata`)
2. Add `buildMillProgramEntries(mcxOutputs)` helper to `ProgramEquivalentIndexEngine`
3. Extend `ProgramEquivalentKind` union: `"cad-as-program" | "lathe-gcode" | "mill-gcode"`
4. Wire `McxBatchExtractor` output → `ProgramEquivalentIndex` bridge in the `compose()` entry point
5. Update `prism_cad:program_equivalent_index_compose` schema to accept `mcx_entries: McxProgramMetadata[]` (optional, sibling to `lathe_entries`)
6. Ship tests covering: mill-only mode, lathe+mill+CAD mode, PN extraction from `tool_labels` + `embedded_strings`, magic-unverified rows surfaced as `skipped_no_pn`, dryRun safety, atomicity
7. Update `byKind` aggregation (`mill-gcode: N`) and `byFormat` to include `.mcx-8`/`.mcx-9`/`.mcam`

Effort: similar to D4 (~500 LOC engine extension + ~400 LOC test). Same composition pattern.

## Why this matters

The brief said D5 unlocks:
- **Mill back-annotation** (D1's mill seed — currently lathe-only)
- **MILL_AI_TRAINING_REPORT** (currently cold at 27 programs because no mill-archive indexer)
- **Mill archive re-opt** (B3's mill arm)
- **Mill family fingerprinting** (A5)

ALL of these payoffs come from making the parsed mill-archive metadata addressable by JM-Die PN inside the unified `ProgramEquivalentIndex`. That's the BRIDGE, not the parser itself.

## Lesson

**Always run the existing-asset check FIRST.** The handoff's literal RESUME directive said "depends on Mastercam install or a reverse-engineering effort" — implying greenfield. In reality, the RE work was already done in a sibling milestone. Greppping `mcp-server/src/engines` for `mcx|Mastercam[Pp]ars` surfaced both engines in one shot.

This is exactly what `duplicationGuardEngine.mustCheckBeforeCreating()` is for. Skipping that step would have meant ~5h of redundant work building a second, slightly-different `.mcx-8` parser.

Companion lesson to [[reference_u_ppl_d4_program_equivalent_index.md]]: D4 also composed-not-duplicated (`UniversalCADIndexEngine` + `ProgramPrintLinkIndexEngine`). Same discipline applied to D5 caught the LPR26/LPR28 overlap.

## Session note (slot echo, claude-2081f435)

This is iter 4 of a /loop target=8 that was already mid-stream when /compact fired. Post-compact context recovery + watchdog warnings (Bash 79s + Edit 74s from peer contention on shared tree, 12 active peer file-claims) made opening a 5th unit unsafe under "always close out" discipline — a 5th unit means per-file scrutiny gates × 2 reviewer agents per file + 3-of-3 end gate + 4-surface close-out. Honest call: end loop at 4/8 with a clean ledger and a thorough handoff finding for the next chat. The D5-bridge unit is teed up cleanly — fresh chat picks it up with full context budget.

## Follow-up

Next chat starting in slot echo (or wherever) should:
1. Read `HANDOFF-claude-2081f435-echo-docustra-d5-fin.md`
2. Verify the McxProgramParser API surface (the engine has 100+ lines of typed metadata fields)
3. Build the BRIDGE, not a new parser
4. Close out as the real D5 deliverable

## Companion memories

- [[reference_u_ppl_d4_program_equivalent_index]] — the D4 engine this bridge extends
- [[reference_u_ppl_d3_archive_to_parts_catalog]] — D3 sibling, same composition pattern
- [[reference_u_ppl_d1_program_print_link_index]] — D1 normalizer foundation (`extractJMDieCandidates`, `normalizeJMDiePN`, `lookupPrintForProgram`)
- [[feedback_always_close_out]] — the discipline that says "close out cleanly, don't open what you can't finish"
- [[feedback_conflict_fork_rule]] — peer-contention pattern that drove the honest-stop call


## Related
[[engines/McxProgramParserEngine|McxProgramParserEngine]] • [[engines/McxBatchExtractorEngine|McxBatchExtractorEngine]] • [[engines/MINBatchExtractorEngine|MINBatchExtractorEngine]] • [[engines/ProgramEquivalentIndexEngine|ProgramEquivalentIndexEngine]] • [[engines/UniversalCADIndexEngine|UniversalCADIndexEngine]] • [[engines/ProgramPrintLinkIndexEngine|ProgramPrintLinkIndexEngine]] • [[dispatchers/prism_cad|prism_cad]] • [[skills/src|/src]] • [[skills/engines|/engines]] • [[skills/loop|/loop]]