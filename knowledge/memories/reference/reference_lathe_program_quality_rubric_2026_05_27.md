---
name: reference-lathe-program-quality-rubric-2026-05-27
description: 10-point lathe-program quality rubric distilled from iter40-iter105 corpus. Maps to ALCOA baseline scoring + extends with controller-specific + production-discipline checks. Direct input to lathe-quality-pipeline.mjs aggregateQualityScore.
type: reference
slot: whiskey
source: prism-memory
synced: 2026-06-27T20:30:46.640Z
aliases: reference_lathe_program_quality_rubric_2026_05_27
---


# Lathe-program quality rubric (10-point)

Each item scored 0/5/10. Total /100. Programs ≥80 = EXPERT, 60-79 = GOOD, 40-59 = MEDIOCRE, 20-39 = AMATEUR, <20 = POOR.

## A. Setup & coordinate-system (20 pts)
1. **G54 work-offset explicitly set + Z-zero discipline** — face-touch-off vs reference-feature. Bad: implicit zero, manual coordinate handle-jog.
2. **G50 max-RPM cap matches material + chuck-rating** — protects against G96 overspeed at small-diameter finish passes. Bad: no G50, or G50 set to absolute machine max.

## B. Speed-feed & physics (20 pts)
3. **G96 vs G97 mode selection rational** — G96 for >2× diameter variation, G97 fixed-RPM for short single-diameter cuts.
4. **Feed-per-rev (F-value) inside published vendor envelope** — neither under (timid → tool-rub) nor over (chatter + chipped insert).

## C. Tooling (20 pts)
5. **Insert ANSI-code commented in tool-call preamble** — `(T0101 CNMG-431 KCM35 ROUGHING)`. Bad: bare `T0101` with no insert context.
6. **Insert-edge rotation strategy implied or stated** — multi-edge utilization plan; not single-tip cycling.

## D. Canned-cycle discipline (20 pts)
7. **Roughing cycle (G71/G72/G73) selected per geometry** — G71 axial profiles, G72 facing-heavy, G73 cast/forged stock-removal with even DOC. Bad: G71 for every part regardless.
8. **Finish-pass G70 with separate feeds + speed change** — bad: rough-feed used for finish (kills surface finish + accelerates wear).

## E. Safety + recovery (20 pts)
9. **Safe-Z + clearance-X retract policy** — every tool block returns to a safe rapid clearance, not home-position-by-default.
10. **G04 dwell minimized** — only at thread-bottom + part-off recovery; not as a "safety pause" between every block.

## Subtractive penalties (program-killers)

- **❌ G50 missing on a G96 program**: -20 (overspeed crash risk)
- **❌ Negative DOC in G71 P/Q block**: -15 (positioning error)
- **❌ Feed in IPM (Haas) vs IPR (Fanuc default) confusion**: -25 (10× feed mistake = broken insert or worse)
- **❌ Threading cycle without G92 → G76 conversion when modern controller available**: -10 (G92 is the old single-block thread; G76 is modern roughing+finish canned-cycle)
- **❌ Tool-change at center-line crash position**: -25 (collision-risk programming)

## Wizard application

```
parseProgram(text)
  → extractTBlocks + extractCannedCycles + extractFeedSpeedValues
  → scoreByCategory({setup, physics, tooling, cycles, safety})
  → applySubtractivePenalties(programKillers[])
  → return QualityReport{score, tier, perCategoryBreakdown, violations[], suggestions[]}
```

The wizard surfaces every violation + the magnitude per category. Operator decides which to accept. Never silently rewrites — R12 fail-loud.

## ALCOA baseline (iter7) re-mapped to this rubric

The 11 ALCOA programs scored as:
- Setup&CS: ~10/20 (G54 set but no explicit G50)
- Speed-feed: ~12/20 (G96 used but inside conservative envelope)
- Tooling: ~0/20 (no ANSI codes documented)
- Canned-cycle: ~8/20 (G71 used uniformly without geometry-fit selection)
- Safety: ~14/20 (safe-Z mostly used)
- Total: ~44/100 = MEDIOCRE tier (matches operator's "amateur" framing)

Wizard target: lift each program to ≥80 (EXPERT) via remediation pipeline.

## Related

- [[lathe-baseline-ALCOA-2026-05-26]] — first quantitative quality measurement
- [[reference_lathe_cycle_time_levers_2026_05_27]] — Tier-1/2/3 cycle-time levers; overlaps category B + D
- [[reference_insert_edge_rotation_strategy_2026_05_27]] — directly feeds category C
- [[reference_mazatrol_vs_gmcode_paradigm_2026_05_27]] — Mazatrol programs scored differently (process-record based, not G/M-code line based)
- [[reference_whiskey_lathe_corpus_state_2026_05_27_iter101]] — full session corpus
- `scripts/lathe-quality-pipeline.mjs aggregateQualityScore` — this rubric goes there
