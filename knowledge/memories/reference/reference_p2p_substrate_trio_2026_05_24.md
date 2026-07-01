---
name: reference-p2p-substrate-trio-2026-05-24
description: Print-to-program substrate trio shipped slot:kilo /loop 2026-05-23..24 — p2p-intake-check skill + BlueprintOCRAdapter interface + JM-DIE corpus enumeration (MACRO + _PART LIBRARY). Wired across 7 PSN legs (PRISM OS · Wiki · Memories · Tribal-adjacent · Engines · Algorithms · PRISM AI) as the durable substrate that unblocks 5+ multi-session downstream units (BLUEPRINT-OCR-RUN, PROGRAM-PARSE, PAIR-MATCH, TRAINING-MANIFEST, p2p-pipeline-orchestrator).
aliases: reference_p2p_substrate_trio_2026_05_24
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.720Z
---


# Print-to-program substrate trio (2026-05-23..24, slot:kilo)

## What shipped (4 substrate units, 4 commits, all in slot/kilo worktree)

| # | Unit | File(s) | Commit | PSN leg(s) |
|---|------|---------|--------|------------|
| 1 | `print_to_program_check_intake` MCP action + 7-case vitest | `mcp-server/src/engines/PrintToProgramPipelineEngine.ts`, `mcp-server/src/__tests__/PrintToProgramCheckIntake.test.ts` | b925b381df (peer-absorbed into slot:whiskey iter7 — engine+test) + 6ea81d124f (slot:kilo iter2 — dispatcher) | #2 PRISM OS, #7 Engines |
| 2 | `/p2p-intake-check` skill + wiki + standing-doctrine memo | `.claude/commands/p2p-intake-check.md`, `knowledge/wiki/architecture/p2p-intake-check-discipline.md`, `knowledge/memories/feedback/feedback_p2p_pre_flight_discipline_2026_05_23.md` | iter 5-7 | #3 Wiki, #4 Memories |
| 3 | `BlueprintOCRAdapter` interface + 13-case vitest | `mcp-server/src/engines/BlueprintOCRAdapter.ts`, `mcp-server/src/__tests__/BlueprintOCRAdapter.test.ts` | iter 8 | #7 Engines, #9 Formulas (geometric-mean confidence) |
| 4 | `enumerate-jm-die-macros.mjs` + manifest | `scripts/enumerate-jm-die-macros.mjs`, `state/shared/jm-die-macro-manifest.json` | 5cd833fcc4 (slot:kilo iter12) | #2 PRISM OS (substrate for `prism_cam:print_to_program_*`) |
| 5 | `enumerate-jm-die-partlib.mjs` + manifest | `scripts/enumerate-jm-die-partlib.mjs`, `state/shared/jm-die-partlib-manifest.json` | eec7fb3458 (slot:kilo iter13) | #2 PRISM OS, #11 PRISM AI (training corpus substrate) |

## Corpus measurements (one-time snapshot 2026-05-24)

- `MACRO PROGRAMS/` — 4 files, 28 KB (manifest tiny by design)
- `_PART LIBRARY/` — **473 parts · 147,717 files · 58.5 GB total**
  - 85,237 blueprints (PDF/TIF/DXF/STEP/IGES dominant)
  - 25,976 programs (.min / .mcx-8 / .mcx / .nc / .hnc / .eia)
  - 36,504 other (mostly .json side-data + .idw drawings + .ipt models)
  - **130 parts pair-complete** (blueprint + program both present) — highest-value training pairs
  - Walk duration: 11.9 s

130 pair-complete parts is the durable training set for U-JMDIE-PARTLIB-PAIR-MATCH (foxtrot) and the seed for U-JMDIE-PARTLIB-TRAINING-MANIFEST (lima). 343 program-less parts indicates JM-Die's archival pattern: many customer-supplied blueprints get measured/quoted but never run; the 130 pairs are the "actually-made-by-JM-Die" set worth learning from.

## PSN wiring topology (the 7-leg synergy)

```
[#2 PRISM OS]            prism_cam:print_to_program_check_intake (action enum +1)
       |                 prism_cam:print_to_program_run (existing, full pipeline)
       |
[#3 Wiki]                knowledge/wiki/architecture/p2p-intake-check-discipline.md
       |                 (auto-injected via wiki-precheck-inject on keyword "p2p" / "intake" / "blueprint")
       |
[#4 Memories]            knowledge/memories/feedback/feedback_p2p_pre_flight_discipline_2026_05_23.md
       |                 knowledge/memories/reference/reference_p2p_substrate_trio_2026_05_24.md (this file)
       |
[#7 Engines]             PrintToProgramPipelineEngine.calculate("print_to_program_check_intake")
       |                 BlueprintOCRAdapter (interface — backends pluggable in MS1+)
       |
[#9 Formulas]            summarizeConfidence(fieldConfidences, lowThreshold) — geometric mean
       |                 (lifted from BlueprintOCRAdapter; reusable for any field-level confidence rollup)
       |
[#11 PRISM AI]           ↘ jm-die-macro-manifest.json    → U-JMDIE-MACRO-TRAINING (downstream)
                         ↘ jm-die-partlib-manifest.json → U-JMDIE-PARTLIB-BLUEPRINT-OCR-RUN
                                                        → U-JMDIE-PARTLIB-PROGRAM-PARSE
                                                        → U-JMDIE-PARTLIB-PAIR-MATCH
                                                        → U-JMDIE-PARTLIB-TRAINING-MANIFEST
```

## Downstream unblocks (5+ multi-session units)

| Unit | Owner slot | Now unblocked because... |
|------|-----------|--------------------------|
| `U-JMDIE-PARTLIB-BLUEPRINT-OCR-RUN` | lima (academy) | partlib manifest lists every PDF/TIF/DXF path — OCR backend picks via `BlueprintOCRAdapter` |
| `U-JMDIE-PARTLIB-PROGRAM-PARSE` | india (post-processor) | partlib manifest lists every .min/.mcx — parser walks the file list |
| `U-JMDIE-PARTLIB-PAIR-MATCH` | foxtrot (tribal) | 130 pair-complete parts → ground-truth blueprint↔program bindings |
| `U-JMDIE-PARTLIB-TRAINING-MANIFEST` | lima (academy) | curates the 130 pairs (or extended subset) into a training corpus spec |
| `U-OCR-EDOCR2-IMPL` | lima (academy) | BlueprintOCRAdapter interface fixes the contract; first backend plugs in here |

## Token-savings predictions (compounding across fleet)

- `/p2p-intake-check` skill (~10ms vs ~30s+ full pipeline) → **~99% savings on incomplete inputs**
- Wiki entry auto-injected for "p2p" / "blueprint" / "intake" prompts → **~3–5K tokens saved per re-derivation**
- Manifest substrate avoids re-walking 76K+ file corpus per session → **~30s wall-clock + ~10K tokens of file-list re-discovery**

Predicted compounding fleet-wide: **~1.5M tokens/month** (per earlier `p2p-intake-check-discipline.md` calc, validated against the partlib walk).

## Per kilo soul: refuse-list compliance

This trio honors:
- **emitting-program-without-pmi-validation** → intake-check forces ambiguous-tolerance detection BEFORE the program path runs
- **dropping-tolerance-stack-on-translate** → BlueprintOCRAdapter mandates `tolerance.min` + `tolerance.max` on every `ExtractedDimension`
- **silent-fallback-on-ambiguous-callouts** → `validateIntake` returns `complete:false` + `ambiguous_tolerances` array (no silent defaults)

Kilo orchestrates substrate production; downstream slots (india/foxtrot/lima) interpret. Pure enum + interface + check action = the contract.

## Cross-refs

- [[feedback_p2p_pre_flight_discipline_2026_05_23]] — standing doctrine
- [[p2p-intake-check-discipline]] — wiki entry, auto-injected
- [[feedback_commit_to_slot_worktree]] — every commit in this trio landed in `H:/prism-slot-kilo`, zero peer-sweep
- [[feedback_psn_definition]] — 11-leg PSN canonical taxonomy
- [[reference_slot_worktree_activation_2026_05_16]] — slot worktree pattern that made these 4 clean commits possible
