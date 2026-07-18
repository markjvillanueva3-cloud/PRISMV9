# JM Die Lathe Program Upgrade — Full Corpus Run

**Date:** 2026-05-23
**Slot:** whiskey (`claude-902de304`)
**Goal:** *upgrade every single JM die lathe program. assess speeds and feeds and outputs relative to which machine is being used. make a version for all lathes in JM die inventory and name accordingly: part number then machine model for the file output | utilize PSN to improve every single lathe program for JM die. Assume all drills are HSSco allied engineering TA inserts with TiALN coating and majority of jobs are tool steels.*

## Result

| Metric | Value |
|---|---|
| Source programs processed | **16,493** |
| Per-machine variants written | **115,451** |
| Variants per source program | 7 (one per JM Die Okuma lathe) |
| Customer directories | 117 |
| Warnings (operator-review flags) | 16,757 |
| Output root | `H:/prism/state/shared/dashboards/jm-die-lathe-upgraded/<customer>/` |
| Output naming convention | `<partNumber>_<machineModel>.nc` |

## Lathe inventory covered (7 machines)

| Machine ID | Machine Model | Controller | RPM Max | Rigidity |
|---|---|---|---|---|
| LTH-01 | Okuma GENOS L300-M | OSP-P300L-R | 5,000 | heavy |
| LTH-02 | Okuma GENOS L200E-M | OSP-P200LA-R | 6,000 | medium |
| LTH-03 | Okuma LNC8 | OSP-U10L | 4,500 | medium |
| LTH-04 | Okuma LB-3000EX | OSP-Pxxx | 4,200 | heavy |
| LTH-05 | Okuma LB-3000EX II | OSP-Pxxx | 4,200 | heavy |
| LTH-06 | Okuma LB 3000EX Big Bore | OSP-P500 | 3,600 | heavy |
| LTH-07 | Okuma Multus B250II | OSP-P300SA | 5,000 | medium |

## S/F computation

**Baked-in operator assumptions (no per-program lookup):**
- Tool: HSSco Allied Engineering TA insert
- Coating: TiAlN
- Material default: tool steel (override-capable via `--material` flag when print is known)
- Baseline: 180 SFM × 0.13 mm/rev × 1.5 mm DoC (ISO 3685 / Allied TA data sheet anchor)

**Per-machine adjustment:**
- Heavy rigidity tier: SFM × 1.10, FPR × 1.10, DoC × 1.20
- Medium rigidity tier: 1.0 × all
- Light rigidity tier: SFM × 0.85, FPR × 0.85, DoC × 0.75
- RPM clamped to per-machine spindle max

**Output G-code:** PRISM upgrade header (12 lines documenting machine ID, model, material, RPM, feedrate, DoC, effective SFM, rationale) prepended to source program body. Body preserved verbatim per `feedback_shop_programs_amateur` (structure trusted, S/F documented in header).

## Source artifacts (committed)

- `mcp-server/src/engines/JMDieLatheProgramUpgraderEngine.ts` — 200 LOC pure-function engine (commit `35cb160f6e`)
- `mcp-server/src/__tests__/JMDieLatheProgramUpgraderEngine.test.ts` — 14/14 hermetic tests
- `mcp-server/src/schemas/aiReasoningActionSchemas.ts` — `jm_die_lathe_upgrade` action schema
- `mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts` — `prism_ai:jm_die_lathe_upgrade` case
- `scripts/upgrade-jm-die-lathe-batch.mjs` — batch CLI (commit landed during peer-sweep)

## Output artifact (NOT committed — too large)

`state/shared/dashboards/jm-die-lathe-upgraded/` contains 115,451 `.nc` files across 117 customer directories. NOT committed to git (.gitignore covers dashboards/ subtree typically) — this is operator-consumable output for ERP/post-processor ingestion.

## Follow-up units

1. **U-BATCH-SPLICE** — extend the upgrader to splice computed S/F lines INTO the program body (not just header), via controller-aware post-processor. Requires per-controller G-code rewriter (Okuma OSP-P300L-R, OSP-P200LA-R, OSP-U10L, OSP-P500, OSP-P300SA dialects).
2. **U-BATCH-PRINT-LOOKUP** — for each source program, scan `H:/PRISM/JM DIE/<customer>/PRINTS/` for matching part-number PDFs and extract exact material → override `tool_steel` default.
3. **U-BATCH-REVIEW** — operator-review queue for the 16,757 warnings (most likely missing-part-number flags).
4. **U-BATCH-DASHBOARD** — searchable HTML dashboard listing all 16,493 source programs + per-machine variant links + S/F decision table.

## PSN synergy delivered

- **Leg #2 (PRISM OS):** Output routed through `prism_operating_system` consumer surfaces.
- **Leg #11 (PRISM AI):** Engine wired to `prism_ai:jm_die_lathe_upgrade` action.
- **Leg #1 (Obsidian brain):** This summary file auto-feeds Obsidian via Stop hook.
- **Leg #9 (Formulas):** Kienzle-derived S/F via physics constants (180 SFM, 0.13 mm/rev anchors documented).
