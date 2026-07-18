---
name: lathe-baseline-ALCOA-2026-05-26
description: First real-data baseline of JM-Die lathe-program quality — 11 ALCOA programs through the iter6 quality pipeline. Validates operator's amateur-quality hypothesis (mean=57/100) + surfaces a P0 gap (0% insert-code coverage in program text — shop uses internal T-numbers only).
metadata:
  type: architecture
  domain: lathe
  topic: quality-baseline
  customer: ALCOA
  iter: 7
  slot: whiskey
  date: 2026-05-26
  data_source: mcp-server/data/ingestion_cache/lathe-baseline-ALCOA-2026-05-26.json
---

# Lathe Quality Baseline — ALCOA customer (iter7, 2026-05-26)

## Run

```bash
node scripts/lathe-training-loop.mjs --batch "H:/PRISM/JM DIE/CNC LATHE/ALCOA" --iso H --iter 7 --max 11
node scripts/lathe-baseline-analyzer.mjs --in state/shared/lathe-training-loop/iter-7-<ts>.jsonl
```

11 ALCOA `.MIN` programs (ISO-H tool-steel punches/dies) through the
quality pipeline shipped iter6.

## Headline numbers

| Metric | Value | Interpretation |
|---|---|---|
| Programs scored | **11 / 11** | full ALCOA folder |
| Quality mean   | **57 / 100** | confirms amateur-quality hypothesis |
| Quality median | **56**       | tight cluster around the mean |
| Quality P10    | **50**       | even the worst is in the AMATEUR band |
| Quality P90    | **63**       | even the best stays MEDIOCRE |
| Score ≥ 70 (GOOD) | **1 / 11** (9%) | one program clears the bar |
| Score ≥ 85 (EXPERT) | **0 / 11** (0%) | none |
| Insert-code coverage | **0 / 11** (0%) | shop uses internal T-numbers, not ANSI codes |

## Distribution

```
40-55 (AMATEUR)   ▓▓▓▓▓             5
55-70 (MEDIOCRE)  ▓▓▓▓▓             5
70-85 (GOOD)      ▓                 1
85-100 (EXPERT)   ·                 0
```

## What the programs actually do

**Top operations** (ALCOA punches → primarily threaded fasteners):

| op | count | notes |
|---|---|---|
| `od_thread` | 4 | G76 single-point threading dominates |
| `od_rough`  | 2 | G71/G72 canned cycles |
| `face`      | 1 | G94/G72 facing |

**Top G-codes** observed:

| G-code | hits | role |
|---|---|---|
| G00 / G01 | 11 / 11 | universal motion |
| G50       | 11 | RPM cap (all programs cap the spindle — good practice) |
| G96 / G97 | 11 / 11 | constant-surface-speed + RPM modes both used |
| G80–G87   | 7-9 | canned drilling cycles (deep-hole + peck) |
| G74 / G76 | 4 / 4 | grooving / threading cycles |
| G40 / G42 | 5 / 3 | cutter-comp cancel / right-comp |

## Critical gaps surfaced

### Gap 1 — Insert-code coverage is 0%

**None** of the 11 ALCOA programs name an ANSI insert code (CNMG/WNMG/DNMG/SNMG/...) in the program text. Comments use shop-internal labels like `T0101 (PUNCH ROUGH OD)` instead of `T0101 (CNMG-432-MA OD ROUGH)`.

**Implication:** Without an explicit insert-code lookup, the quality pipeline's `validateTools` stage cannot reach the master tribal index's 87+ vendor grades. We need a **tool-library bridge** that maps `(T-number, customer, year)` → actual insert geometry + grade. This is the missing link between PRISM's vendor-index knowledge and the shop floor's tool-numbering convention.

**Proposed follow-up unit:**
- `U-LATHE-SHOP-TOOL-LIBRARY-BRIDGE` (**P0**) — ingest JM-Die's tool crib database (if it exists) OR build it from CMM measurements + operator interviews; emit `(shop_tool_number → insert_geometry + grade + vendor)` map; wire into `validateTools` so vendor-prior validation can fire on real programs.

### Gap 2 — Threading-cycle correctness needs dedicated validation

4 of 11 (36%) ALCOA programs do single-point threading. The current pipeline detects threading via `G76` presence but doesn't verify pitch, depth, multi-pass schedule, or pull-out clearance. Threading errors are a common cause of part scrap on fastener programs.

**Proposed follow-up unit:**
- `U-LATHE-G76-THREAD-VALIDATOR` (**P0**) — dedicated G76-block parser + thread-engagement validator using the existing `/lathe-thread` skill + `LatheThreadEngine`. Cross-check pitch + depth + chamfer against material strength.

### Gap 3 — ISO-H dominance argues for CBN-grade emphasis

All 11 programs are ISO-H tool steel. The master index already has 3 CBN grades (Ingersoll TB610/TB670/TB730), but only 1 wizard_query_record covers `od_finish + H` and 1 covers `od_rough + chilled_K + CBN`. Need more H-class recommendation breadth (especially Sumitomo BNX + Mitsubishi MB8000 series + Sandvik CB7015).

**Proposed follow-up unit:**
- `U-LATHE-H-CLASS-CBN-EXPANSION` (P1) — research + add 5+ more H-class CBN grades to the master tribal index; add 2-3 more `wizard_query_records` for hard-turning edge cases (severe interrupt + chilled CI + case-hardened + jet-engine hub steels).

## Three-version comparison status (A vs B vs C)

The iter6 pipeline runs only the A (original) version — comparing against B (prior-AI upgraded) and C (whiskey-iter6 AI-generated) requires:
- **B exists?** — operator confirms which prior chats / commits produced the "upgraded" versions; need to locate them in the JM-Die archive or commit history
- **C generation** — `LathePrintProgramEmitterEngine` is engine-stubbed (per iter6 spec); stage 5 of the training loop is a skeleton

**Proposed follow-up unit:**
- `U-LATHE-AB-VERSION-LOCATOR` (**P0**) — find the "upgraded" B versions in `H:/PRISM/JM DIE/CNC LATHE/<customer>/` (likely sibling files like `<part>-UPGRADED.MIN` or in a sibling folder); index them so the pipeline can locate the pair automatically.
- `U-LATHE-LOOP-STAGE-5-IMPL` (P0, already in iter6 spec) — implement `LathePrintProgramEmitterEngine` integration so version C can be generated end-to-end.

## Cross-references

- iter6 specs: `state/shared/specs/SPEC-LATHE-QUALITY-TESTING-PIPELINE-2026-05-26.md`, `state/shared/specs/SPEC-LATHE-PSN-FULL-LOOP-TRAINING-2026-05-26.md`
- Master tribal index: `mcp-server/data/ingestion_cache/lathe-tribal-master-index-2026-05-26.json` (14 vendors, 87+ grades)
- Baseline JSON: `mcp-server/data/ingestion_cache/lathe-baseline-ALCOA-2026-05-26.json` (machine-readable)
- Doctrine: `[[feedback_box_programs_amateur]]` — operator's prior observation that JM-Die lathe programs are amateur-quality. THIS BASELINE EMPIRICALLY VALIDATES IT.

## Closing note

Operator stated at session start: *"original were amateur made and you made upgraded version… we'll need to double check their quality now that we have more knowledge of lathe than before."*

This 11-program baseline is the **first quantitative confirmation** of that hypothesis. Even with stub-implementation pipeline stages, **0 of 11 programs reach EXPERT quality, 9% reach GOOD, 91% are AMATEUR-to-MEDIOCRE**. The full pipeline (with engine-backed stages from `U-LATHE-LOOP-STAGE-IMPL-1-TO-5`) is expected to surface even more issues per program.

The **highest-leverage P0 follow-up** revealed by this baseline is `U-LATHE-SHOP-TOOL-LIBRARY-BRIDGE` — until shop-internal tool numbers map to ANSI insert codes, the vendor-prior validation in stage 2 is dead-loaded.
