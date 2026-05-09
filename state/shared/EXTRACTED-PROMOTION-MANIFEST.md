# Extracted Asset Promotion Manifest

**Generated:** 2026-05-09
**Source:** `H:/prism/extracted/` (819 files, ~89 MB)
**Plus sibling-worktree orphans:** 272 engine.ts files across 46 sibling worktrees

The user explicitly named `H:\PRISM\extracted` as priority. Below is the
mapping of each extracted bucket to its canonical destination in main +
the action class.

## Action classes

- **DATA-INGEST** — copy `.js` flat data into `mcp-server/data/<bucket>/` (no code change). Add a registry loader if not present.
- **TS-CONVERT** — rewrite `.js` engine/algorithm into TS + tests + dispatcher wiring. One-at-a-time per existing pattern.
- **CONSTANTS-MERGE** — values must be merged into `mcp-server/src/physics/constants.ts` after canonicality check.
- **KB-INGEST** — knowledge bases → `knowledge/wiki/` markdown via `/wiki-ingest`.
- **DEFER** — backup/archive duplicates, do not promote.

## Bucket-by-bucket plan

| Bucket | Count | Action | Destination |
|--------|------:|--------|-------------|
| `extracted/engines/` | 255 | TS-CONVERT (one-at-a-time, dedup-guard each) | `mcp-server/src/engines/` |
| `extracted/algorithms/` | 52 | TS-CONVERT (mostly already in main as .ts — diff first) | `mcp-server/src/algorithms/` |
| `extracted/formulas/` | 12 | CONSTANTS-MERGE (verify against canonical kc1.1, Taylor) | `mcp-server/src/physics/constants.ts` |
| `extracted/constants/` | 1 | CONSTANTS-MERGE (single source of truth check) | `mcp-server/src/physics/constants.ts` |
| `extracted/materials/` | 46 | DATA-INGEST | `mcp-server/data/materials/` |
| `extracted/materials_enhanced/` | 14 | DATA-INGEST (supersedes plain materials) | `mcp-server/data/materials/enhanced/` |
| `extracted/materials_v9_complete/` | 17 | DATA-INGEST (latest version) | `mcp-server/data/materials/v9/` |
| `extracted/materials_complete/` | 2 | DATA-INGEST (full extract) | `mcp-server/data/materials/complete/` |
| `extracted/materials_backup_*` (×3) | 126 | DEFER (timestamped backups) | — |
| `extracted/_ARCHIVE_OLD_MATERIALS/` | 27 | DEFER (legacy) | — |
| `extracted/machines/` | 109 | DATA-INGEST | `mcp-server/data/machines/` |
| `extracted/controllers/` | 147 | DATA-INGEST (.py = dialect references, .json = config) | `mcp-server/data/controllers/` |
| `extracted/catalogs/` | 6 | DATA-INGEST | `mcp-server/data/catalogs/` |
| `extracted/knowledge_bases/` | 10 | KB-INGEST | `knowledge/wiki/extracted-kb/` |
| `extracted/mit/` | 5 | KB-INGEST (MIT course extractions) | `knowledge/wiki/mit/` |
| `extracted/business/` | 7 | TS-CONVERT (ERP-class engines) | `mcp-server/src/engines/` |
| `extracted/workholding/` | 3 | TS-CONVERT | `mcp-server/src/engines/` |
| `extracted/tools/` | 2 | DATA-INGEST | `mcp-server/data/tools/` |
| `extracted/units/` | 3 | DATA-INGEST | `mcp-server/data/units/` |
| `extracted/integration/` | 14 | TS-CONVERT (cross-system bridges) | `mcp-server/src/engines/` |
| `extracted/learning/` | 6 | TS-CONVERT (training pipeline) | `mcp-server/src/engines/` |
| `extracted/infrastructure/` | 5 | TS-CONVERT | `mcp-server/src/engines/` |
| `extracted/systems/` | 7 | TS-CONVERT | `mcp-server/src/engines/` |
| `extracted/core/` | 11 | TS-CONVERT (likely already exists — diff first) | `mcp-server/src/engines/` |

## Phasing (suggested order, easiest → hardest)

1. **Phase 1 — DATA-INGEST** (safe, no code change, no test impact)
   - `tools/` (2), `units/` (3), `catalogs/` (6), `materials/` newest (46+14+17+2 = 79), `machines/` (109), `controllers/` (147)
   - Add `MaterialRegistry`, `MachineRegistry`, `ControllerRegistry` loaders if not present. Many already exist in main.
   - **Net:** ~365 files copied to `mcp-server/data/` with manifests.
2. **Phase 2 — KB-INGEST** (knowledge enrichment)
   - `knowledge_bases/` (10), `mit/` (5) → `/wiki-ingest`
3. **Phase 3 — CONSTANTS-MERGE** (high-care, requires canonicality check)
   - `formulas/` (12), `constants/` (1) — diff against `physics/constants.ts`. Reject duplicates, merge novel.
4. **Phase 4 — TS-CONVERT** (largest, hardest, must dedup-guard each)
   - `algorithms/` (52) first — most likely overlap with main's existing 53.
   - `core/` (11), `infrastructure/` (5), `systems/` (7) — likely overlap.
   - `engines/` (255) — heaviest sweep. Run `duplicationGuardEngine.checkBeforeCreating()` on every file before promotion.
   - `business/` (7), `workholding/` (3), `integration/` (14), `learning/` (6).
5. **Phase 5 — Sibling-worktree orphans** (272 .ts engines)
   - Already TS, just copy + dedup-guard + wire. See `state/shared/orphan-sweep-2026-05-09.json`.
   - Top targets that exist in 15+ worktrees: `LatheAGICoreEngine`, `PPMachineSpecificPostEngine`, `PPMachineVectorEncoderEngine`, `SolidCAMiMachiningEngine` (already shipped as `PrismPathConstantEngagementEngine` — DEFER), `WEDM*` cluster from `prism-ai-aware`.

## Ground rules (CLAUDE.md enforced)

- Every TS-CONVERT runs `duplicationGuardEngine.mustCheckBeforeCreating()` first.
- Every promotion ships test + dispatcher wiring in the same commit.
- Physics constants only via `src/physics/constants.ts` — never inline.
- Commit format: `[MAIN] [CAD-FUSION-LIVE-MS0]/U-PROMOTE-EXTRACTED-<BUCKET>-<NN>: title`
- DEFER backups (`materials_backup_*`, `_ARCHIVE_OLD_MATERIALS`) — they are timestamped duplicates.

## Companion data files

- `state/shared/orphan-sweep-2026-05-09.json` — sibling-worktree engine orphans (272)
- `state/shared/true-orphan-engines-2026-05-09.json` — archive-dir orphans (0; all stale copies)
- `scripts/scan-extracted-dirs.mjs` — re-scan helper

## Live coordination notes (2026-05-09)

- Peer chat `claude-99eca613` is writing `agent-findings-v3/*` for system-viz domain layers — DO NOT touch those JSON files.
- Peer chat `claude-cee63f1f` is editing `scripts/generate-system-viz.mjs` — DO NOT edit.
- Peer chat `claude-845cf238` claims `prism-xproc-neural-aci/CrossProcessNeuralLearningEngine.ts` — different repo path, no conflict.
- Engine promotion 1/4 (`PPMacroFlowValidatorEngine`) shipped commit `0a43c1bca`, 29/29 tests pass.
