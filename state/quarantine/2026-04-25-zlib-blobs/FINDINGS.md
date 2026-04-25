# Backup-Restore Corruption Sweep — 2026-04-25

## Scope

Discovered during forge-audit corruption sweep after a 60GB backup-restore. The backup-restore replaced source-file contents with two distinct kinds of binary garbage at random paths:

- **zlib-deflated git blob bodies** (78 01 magic) whose decompressed content is unrelated G-code from past lathe programs (e.g., `$WAFER-ID.MIN`, `$A9099772.MIN`)
- **NTFS journal fragments** (`\x05\x02..!` then FILETIME bytes) and **truncated gzip streams** (1f 8b 08 truncated mid-deflate) and **`{}{}` zero-padded stubs**

Original content is unrecoverable — even origin/main contains the corrupt blobs.

## Files quarantined (46 total)

### `tests/` (16) — mcp-server/src/__tests__/
Each was an active vitest test file replaced with a zlib blob containing a lathe G-code program:
- calculatorProgrammingCatalog.test.ts
- cwedm-live-ship-test.test.ts
- lathe-grooving-parting.test.ts
- lathe-hard-turning.test.ts
- lathe-swiss-multichannel.test.ts
- lathe-threading.test.ts
- ppg-comparison-report.test.ts
- ppg-dmg-brother-doosan-dialect.test.ts
- ppg-e2e-journey-a.test.ts
- ppg-e2e-journey-b.test.ts
- ppg-haas-hurco-dialect.test.ts
- ppg-machinist-trust.test.ts
- ppg-mazak-okuma-dialect.test.ts
- ppg-performance.test.ts
- ppg-validation-harness.test.ts
- wedm-calculator-panels.test.ts

### `binary-fragments/` (9) — mixed corruption
- 6 test files (NTFS fragments, gzip fragments, `{}\n` + NUL pad)
- 1 cert (NTFS fragment)
- `state/todo.md` (`{}{}` + NUL pad)
- `state/shared/TASK_COORDINATION_SPEC.md` (truncated gzip — 5139b stream cuts off mid-deflate)

### `docs/` (3) — mcp-server/data/docs/
- PPG_CONTROLLER_MATRIX.md
- PPG_ROLLBACK_PROCEDURES.md
- PPG_SAFETY_AUDIT.md

### `handoffs/` (13) — state/shared/handoffs/archive/
Archived handoffs from past sessions; safely losable since superseded by per-chat handoffs.

### Misc (5)
- `commands/biz-health.md` (.claude/commands/)
- `misc/launch.json` (mcp-server/.claude/)
- `scripts/generate_machine_mode_media.py` (mcp-server/web/scripts/)
- `certs/2026-04-09_dbdb38ea-...json` (mcp-server/state/certificates/)
- `milestones/MILL-HARD-MS0-FINDINGS.md` (sourcemap-prefix corruption — different mode but same root cause)

## Recovery status

| Path | Tracked? | Origin clean? | Recoverable? |
|------|----------|---------------|--------------|
| 16 tests | untracked | also corrupt | NO — rewrite from scratch needed |
| 6 binary tests | untracked | n/a | NO |
| 3 PPG docs | untracked | n/a | NO |
| 13 archived handoffs | untracked | n/a | NO — but acceptable loss |
| state/todo.md | TRACKED | also corrupt | NO — was probably empty `{}` anyway |
| state/shared/TASK_COORDINATION_SPEC.md | **TRACKED** | also corrupt | **NO — needs reconstruction** |
| MILL-HARD-MS0-FINDINGS.md | untracked | n/a | NO |
| 2 certs | untracked | n/a | NO |

## Critical follow-ups

1. **TASK_COORDINATION_SPEC.md** — referenced in `CLAUDE.md` and `CLAUDE-CODEX-TASK-QUEUE-DIRECTIVE.md` as the canonical task-queue spec. Its loss leaves the task-queue protocol implicit. Reconstruct from `task-queue.mjs` source + the TASK_QUEUE.md format observed in coordination-status output.

2. **PPG safety/rollback/controller docs** — `data/docs/PPG_*.md` triplet covered safety audits and rollback procedures. Likely regeneratable from `PostProcessorPipelineEngine` and dispatcher actions; mark as TODO for forge-docs follow-up.

3. **16 dead vitest files** — these were never committed to current branch. Their loss removes test coverage for: PPG dialect translation (DMG/Brother/Doosan/Haas/Hurco/Mazak/Okuma), PPG e2e journeys A+B, PPG performance, PPG validation harness, lathe grooving/parting/hard-turning/swiss/threading, calculator catalog, WEDM live-ship, WEDM calculator panels. Coverage gap should be tracked under a follow-up unit.

## Build/test impact

- `npx vitest run` no longer crashes parse-failing on these 22 files (16 zlib + 6 binary).
- TypeScript build won't try to typecheck them.
- Build cache may still flag `older than config files` until next `build:incremental`.

## What was NOT touched

- `.claude/worktrees/agent-*/` — 198 zlib + 65 sourcemap-prefix corruptions left in place; these are agent-isolated worktree copies that get cleaned up by ExitWorktree. Cleaning them risks racing concurrent agents.
- `resources/HYPERMILL/.../MacroDB_sqlserver.sql` and `Tool Database/.../sqlserver.sql` — flagged as binary-in-text but are legitimate SQL Server backup binaries from hyperMILL distribution.
- `mcp-server/data/docs/roadmap/.lint-baseline.json` and `.token-baseline.json` — parse fine with utf-8-sig (BOM); ignored as legacy roadmap directory per CLAUDE.md.
- `mcp-server/data/state/AUTOMATION_CENSUS.json` — has live JSON delimiter error at line 118 col 113 but was claimed by peer chat `claude-0377686b`; coordination defers to that chat.
- `mcp-server/data/hypermill/HyperMillParameterCatalog.json` — flagged in last session's pending list but already fixed by another chat (parses cleanly now).

## Process verification

Live-corruption rescan post-quarantine:
- LIVE zlib: **0** (was 36)
- LIVE sourcemap-prefix: **0** (was 1)
- LIVE binary-in-text outside `resources/`: **0** (was 9)
