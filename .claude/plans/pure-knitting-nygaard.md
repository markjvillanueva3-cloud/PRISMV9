# U-DOCU-04 — Persist the print↔program join into a queryable engine + lookup actions + auto-ingest

## Context

The chat working the **u-docu roadmap** (`claude-d0905490`, slot alpha) crashed. Recovery trail:
`claude-419e02ba` (crashed AM) → `claude-745cce01` (shipped ITER-4..8) → `claude-d0905490` (closed out **MS-DOCU-FINISH** at commit `cd1a0fc16`, then **crashed mid-U-DOCU-04**).

**MS-DOCU-FINISH** (U-DOCU-01/02/03) is fully closed out — verified in envelope + roadmap-index. The next unit, **`MS-DOCU-INGEST` / U-DOCU-04**, is `not_started` in the envelope but the crashed chat already built most of it:

> **Recovered uncommitted work** — `H:/prism-docu-print-loop/mcp-server/src/engines/BlueprintProgramJoinEngine.ts` has **+508 uncommitted lines**: a complete, well-built "QUERY LAYER" tagged `(U-DOCU-04 / MS-DOCU-INGEST)` — types, `loadJoinIndex()`, `programForPrint()`, `printForProgram()`, cached `getJoinIndex()` singleton, `clearJoinIndexCache()`, `normalizeProgramPathKey()`, all wired into the class wrapper + singleton export. FAIL-LOUD policy applied, full JSDoc. The crashed chat finished the BUILD step but committed nothing and never did the wiring/tests/auto-ingest/close-out.

**Goal:** recover + verify that engine code, then finish U-DOCU-04 — dispatcher wiring, tests, auto-ingest, build/test, commit, close-out.

### Design deviation from the envelope (intentional, documented)
The envelope says *"de-stub `PairedPrintProgramBundleEngine`"*. **That engine is NOT a stub** — `grep` for its claimed annotation (`"Pipeline pending — bundle stub retained"`) returns nothing; it's a fully-built test-fixture signature validator (a different concern). The crashed chat correctly put the query layer in `BlueprintProgramJoinEngine.ts` — the engine that *already produces* the join. We keep that decision and record it in the close-out note (CLAUDE.md R7: surface the conflict, pick the correct path).

## Scope & lane

- **Worktree:** `H:/prism-docu-print-loop` · **branch:** `work/docu-print-loop-ms0` (where the uncommitted file lives; the docu lane). Commit there; later reverse-merge → ff-only into `cad-fusion-live-ms0` per `reference_reverse_merge_then_ff_only`.
- **Slot:** bravo (`claude-fba58390`).
- **Data files confirmed present:** `Docustrata/.index/blueprint-program-join-full-v6.jsonl` (59.8 MB) + `training-triples-v4.jsonl` (73.9 KB). Row shapes verified against the recovered type guards — they match.

## Implementation

Multi-file build → **per-file scrutiny gate** (2 parallel reviewer agents after *each* file, fix all P0/P1) per CLAUDE.md.

### File 1 — `mcp-server/src/engines/BlueprintProgramJoinEngine.ts` (RECOVER + verify)
The +508-line query layer is already written (uncommitted). Action: re-read end-to-end, confirm it typechecks against the committed producer code (`normalizePartNumber` is exported at :158 — the new code reuses it ✓). No rewrite expected; fix only what the scrutiny pass + `tsc` flag.

### File 2 — `mcp-server/src/tools/dispatchers/devDispatcher.ts` (`prism_dev`)
Add 2 actions next to the existing `print_program_join` (line ~1199):
- `ACTIONS` array += `"program_for_print"`, `"print_for_program"`.
- Handler cases follow the existing lazy-import → guard → call → `result = { success:true, data:{...} }` pattern. **Critical:** the recovered `programForPrint(pn, index)` / `printForProgram(path, index)` take a `JoinIndex` *object*, not a number — so each case does `const idx = await blueprintProgramJoinEngine.getJoinIndex();` first, then calls the sync fn with `idx`. Wrap `getJoinIndex()`'s fail-loud throw with `dispatcherError(...)`.

### File 3 — `mcp-server/src/schemas/devActionSchemas.ts`
Add Zod schemas to `ACTION_DEV_SCHEMAS` for both new actions (`part_number: z.string()` / `program_path: z.string()`, both `.describe(...)`). The existing `print_program_join` has no schema, but U-DOCU-04's exit condition explicitly requires "Zod schema all match" — adding schemas is strictly-better, not a style fork.

### File 4 — `mcp-server/src/tools/dispatchers/camDispatcher.ts` (`prism_cam`)
Mirror File 2 next to `cam_print_program_lookup` (line ~2095), with cam's `cam_` prefix convention: `cam_program_for_print`, `cam_print_for_program`.

### File 5 — `mcp-server/src/schemas/camActionSchemas.ts`
Mirror File 3 into `ACTION_CAM_SCHEMAS` for the 2 cam actions.

### File 6 — `mcp-server/src/__tests__/BlueprintProgramJoinEngine.test.ts` (append)
Real-value assertions (no `toBeDefined()` stubs):
- **Engine-direct:** `loadJoinIndex` on a tiny temp fixture JSONL; `programForPrint` exact + loose-normalized hit + miss; `printForProgram` slash/case-agnostic match; `getJoinIndex` cache hit + mtime-invalidation + `clearJoinIndexCache`; **fail-loud** — `loadJoinIndex` throws on missing join file.
- **Dispatcher round-trip** (the exit condition — through the dispatcher, not just the singleton): `MockMCPServer` + `call()` helper pattern; `registerDevDispatcher` → invoke `program_for_print` / `print_for_program`; `registerCamDispatcher` → invoke `cam_program_for_print` / `cam_print_for_program`; assert `success`, `data` shape, and the missing-required-param error path.

### File 7 — `.claude/hooks/blueprint-join-index-stale-check.mjs` (CREATE — SessionStart auto-ingest part 1)
Ultra-light (`fs.statSync` mtime only, no streaming, <300 ms): emits `additionalContext` warning if the v6 join JSONL is missing or >7 days stale. Wire into the existing **`sessionstart-bundle.mjs`** (designed for lightweight injectors — avoids the fork-storm class documented in `reference_harness_hang_prevention`), not a new top-level SessionStart entry.

### File 8 — `scripts/system-health/<NN>-blueprint-join-refresh.ps1` (CREATE — cron auto-ingest part 2)
Weekly off-peak PowerShell task modeled on `scripts/system-health/08-envelope-drift.ps1`: re-runs `scripts/docustrata/phase20-verified-prints-index.py` then `phase16-blueprint-program-join-v6.py`, validates the output JSONL (line count + schema sample), logs result to a state JSON. Companion scheduled-task installer following the `install-*-task.ps1` pattern; register in the cron registry (`state/shared/golf-cron-registry.json`).

### Build / test gate
`cd mcp-server && npm run build` (full tsc + esbuild) · `npx tsc --noEmit` · `npx vitest run src/__tests__/BlueprintProgramJoinEngine.test.ts` (+ any dispatcher test files touched). All must be green before commit.

### Close-out (U-DOCU-04 — one of MS-DOCU-INGEST's 2 units)
- `mcp-server/data/milestones/MS-DOCU-INGEST.json`: U-DOCU-04 → done, `completed_units: 1`, milestone `status: in_progress` (U-DOCU-05 still pending), add a `closeout_note` recording the `PairedPrintProgramBundleEngine` deviation.
- `mcp-server/data/roadmap-index.json`: MS-DOCU-INGEST `completed_units: 1`, `status: in_progress`.
- Regen `state/shared/MILESTONE_PROGRESS.{md,json}` + `BUILD_STATE.{md,json}`; post chat-bus.
- Doc-backflow: wiki entry under `knowledge/wiki/architecture/` for the query layer; digest/system-viz per the unit's `doc_propagation`.
- Commit in `H:/prism-docu-print-loop`: `[MS-DOCU-INGEST]/U-DOCU-04: persist print↔program join query layer + prism_dev/prism_cam lookup actions + auto-ingest`.
- Update this chat's handoff (`HANDOFF-bravo-docu.md`) with U-DOCU-05 as the next unit.

### End-of-task 3-of-3 scrutiny gate
`node .claude/scripts/scrutiny-3way.mjs` → 3 parallel reviewer agents → record all 3 verdicts.

## Critical files

| File | Action |
|---|---|
| `mcp-server/src/engines/BlueprintProgramJoinEngine.ts` | recover +508 uncommitted lines, verify |
| `mcp-server/src/tools/dispatchers/devDispatcher.ts` | +2 actions (`program_for_print`, `print_for_program`) |
| `mcp-server/src/tools/dispatchers/camDispatcher.ts` | +2 actions (`cam_program_for_print`, `cam_print_for_program`) |
| `mcp-server/src/schemas/devActionSchemas.ts` · `camActionSchemas.ts` | Zod schemas for the 4 new actions |
| `mcp-server/src/__tests__/BlueprintProgramJoinEngine.test.ts` | engine-direct + dispatcher round-trip tests |
| `.claude/hooks/blueprint-join-index-stale-check.mjs` + `sessionstart-bundle.mjs` | SessionStart stale-check |
| `scripts/system-health/<NN>-blueprint-join-refresh.ps1` + installer + cron registry | weekly rebuild cron |
| `mcp-server/data/milestones/MS-DOCU-INGEST.json` · `roadmap-index.json` | U-DOCU-04 close-out |

## Verification

1. `cd mcp-server && npm run build` — 0 tsc errors, esbuild OK.
2. `npx vitest run src/__tests__/BlueprintProgramJoinEngine.test.ts` — all green, incl. dispatcher round-trip + fail-loud cases.
3. Live dispatcher smoke: `prism_dev` action `program_for_print` with `{ part_number: "UP-504-BLK" }` → expect a join/triple hit (that PN is in `training-triples-v4.jsonl`); `print_for_program` with a `.MIN` path from the v6 join → expect `found:true`. Same via `prism_cam` `cam_*` actions.
4. Stale-check hook: run `node .claude/hooks/blueprint-join-index-stale-check.mjs` — exits fast, no warning (index is fresh, 2026-05-14).
5. Cron script dry-run: `pwsh scripts/system-health/<NN>-blueprint-join-refresh.ps1 -DryRun` — validates without rebuilding.
6. Close-out surfaces: `MS-DOCU-INGEST.json` shows 1/2, `MILESTONE_PROGRESS.md` reflects U-DOCU-04 shipped, chat-bus posted.
7. 3-of-3 scrutiny ledger: arms A+B+C all PASS for the session.
