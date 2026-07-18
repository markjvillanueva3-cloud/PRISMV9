---
name: reference-whiskey-academy-lathe-bridge-2026-05-26
description: "Academy→lathe-wizard bridge — 6 turning priors extracted from course-5 with insert codes (CNMG/WNMG/SNMG/RCMT), DOC/feed/RPM ranges, G71/G96/G50 canned cycles, and authored heuristic rules. Bridges PRISM-Academy's authored lesson corpus into LatheAITrainingEngine as expert-prior validation baselines alongside the JM-Die archive."
type: reference
slot: whiskey
source: prism-memory
synced: 2026-06-27T20:30:47.255Z
aliases: reference_whiskey_academy_lathe_bridge_2026_05_26
---


# Academy → Lathe Wizard bridge (WHISKEY-ACADEMY-LATHE-BRIDGE-MS0/U-EXTRACT-PRIORS)

## Finding

Lima's PRISM-Academy (`mcp-server/src/data/academy/course-*.ts`) contains 7+ lathe-applicable courses (course-2/3/5/17/22/29-34) totaling ~250K of authored TypeScript lesson content. ZERO `Lathe*` engine imported `CurriculumEngine` or read course data before this unit — the [[KnowledgeCurriculumBridgeEngine]] only flows the OTHER direction (PRISM knowledge → curriculum problems).

Course-5 (`course-5-turning-operations.ts`) alone covers the 6 canonical lathe ToolTypes the trainer recognizes:
- **OD Roughing** — CNMG/WNMG/SNMG inserts, DOC 1-5mm, feed 0.15-0.35 mm/rev, G71 canned cycle
- **OD Finishing** — RCMT wiper insert, DOC 0.1-0.3mm, feed 0.05-0.15 mm/rev, G96+G50, M03
- **Facing**
- **Grooving & Parting**
- **Threading (Single-Point)**
- **Boring**

These are real expert-authored validation baselines (param ranges + heuristic rules + canned-cycle pairings) that complement the JM-Die archive corpus the trainer already consumes.

## Bridge built (3 files, 15/15 tests PASS)

```
scripts/lib/lathe-academy-priors.mjs              # pure-fn extractor (9 exports)
scripts/lib/__tests__/lathe-academy-priors-test.mjs   # real-data integration tests
scripts/extract-lathe-academy-priors.mjs          # CLI wrapper
mcp-server/data/lathe-academy-priors.json         # emitted bundle (6 priors)
```

Pure-fn extractor is text-based (parses .ts source via regex — no TS compile step). Module-title → ToolType map mirrors `LatheAITrainingEngine.ToolType` (od_rough / od_finish / face / od_groove / od_thread / boring_bar). Output bundle is `schemaVersion`-tagged JSON.

## Why expert-priors not training-tuples

Academy lessons are *authored teaching content*, not real-program extractions. They belong in the trainer pipeline as **validation priors**: when `LatheAITrainingEngine` parses a JM-Die `.MIN` program and sees DOC=8mm on a roughing operation, the prior at `academy/course-5/mod-1` says "expected 1-5mm range" → `ValidationIssue.physics_basis` cites the lesson.

## Next units (proposed)

- **U-LATHE-ACADEMY-PRIORS-WIRE** — wire the bundle into `LatheAITrainingEngine` as a new validation source alongside the JM-Die archive (no engine change to the trainer's ToolType enum needed; the prior shape already matches).
- **U-EXTRACT-MORE-COURSES** — extend `LATHE_COURSES` to course-2 (speed/feed math) and course-17 (tooling codes) once whiskey's slot worktree rebases onto main to access lima's latest authoring.
- **U-WIZARD-PRIORS-LOOKUP** — surface the priors via `prism_lathe` dispatcher action so the lathe-studio wizard UI can show "the academy says: rough between 1-5mm DOC" when the operator picks an OD roughing strategy.

## Files on slot/whiskey (commit U-EXTRACT-PRIORS)

| File | Bytes | Notes |
|------|-------|-------|
| `scripts/lib/lathe-academy-priors.mjs` | ~7.5K | 9 pure exports — `extractInserts`, `extractParamRanges`, `extractGMCodes`, `extractHeuristicRules`, `extractTitleBodyPairs`, `extractModuleTitleMap`, `buildPriorsForCourse`, `buildPriorBundle`, `TITLE_TO_TOOLTYPE` |
| `scripts/lib/__tests__/lathe-academy-priors-test.mjs` | ~5K | 15 cases, real course-5 source, no stubs |
| `scripts/extract-lathe-academy-priors.mjs` | ~2.5K | CLI: default emits to `mcp-server/data/lathe-academy-priors.json` |
| `mcp-server/data/lathe-academy-priors.json` | 6.3K | 6 priors from course-5 (slot worktree base predates lima's 17/22/29-34 ships) |
