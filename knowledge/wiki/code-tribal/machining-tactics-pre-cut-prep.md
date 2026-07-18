---
schema: ideablock-v1
title: "Pre-cut prep — first-piece prove-out, dry run, single-block, the discipline before cycle-start"
domain: "Machining tactics"
category: machining-tactics
version_state: Current
confidence: 0.96
cluster_size: 1
canonical_sha256: authored-2026-05-21-hotel
sources:
  - Machinery's Handbook 31e §Setup & Prove-Out
  - Sandvik Coromant — Operator handbook §First piece
  - Haas / Fanuc operator manuals (single-block + dry-run feature docs)
  - 4245-tribal corpus machining-tactics subset (n=339)
extracted_via: human-authored
extracted_at: 2026-05-21T04:00:00Z
authored_by: claude-8ed50f0a (slot:hotel, U-WIKI-MACHTACT-PRECUT)
---

## Question

What do I do between "program loaded" and "first cycle-start" so the first piece isn't a scrap-and-restart?

## Answer (canonical — prove out before cutting, not on the part)

### The cost asymmetry behind every prove-out

A 30-minute prove-out costs $40 in machine time. A crashed spindle costs $5,000–$50,000 in repair + downtime. **The asymmetry is 100×–1000×.** Every minute of prove-out is leveraged against catastrophic failure — it's the cheapest insurance the floor has, *if you do it before the crash*, not after.

### The 7-step pre-cut sequence (in order, no skipping)

1. **Read the program top to bottom.** Look for: tool changes, WCS calls (G54-G57), unusual rapids, large Z moves, M-codes you don't recognize. Anything that says "interesting" goes into the prove-out punch list.

2. **Verify tools in the magazine match the tool list.** Tool number ↔ tool length ↔ tool diameter. A T05 that was a Ø10 endmill yesterday and a Ø20 face mill today is the source of most crashes attributed to "program error". Confirm with the setup sheet, not memory.

3. **Verify WCS.** G54 X/Y/Z = where the program expects part-zero. Manually jog to G54 zero (M00 + zero return) and visually confirm position matches your part's datum-A intersection. 5 seconds of looking saves a 5-minute crash.

4. **Dry run with Z lifted ~20 mm above stock.** Spindle off (M00 or override), Z-axis offset positive by ~20 mm, feed at rapid-suppress (e.g. 50 %). The toolpath traces in the air above the part. Watch the X/Y path — does it look like the toolpath you expected? Does any rapid move toward a clamp / fixture / wall?

5. **Single-block first 5-10 lines.** Spindle on, real Z, feed override at 20 %. Press Cycle-Start once per line. Look at the entry: did the tool slow into the cut as expected? Is the chip forming? Is the spindle load reasonable? The first cut is the highest-risk moment — single-block lets you abort between any two lines.

6. **First cut at reduced feed (50-75 %).** Once the first features cut cleanly under single-block, run the rest at reduced feed. The first full piece is a calibration cycle, not a production cycle.

7. **Measure the first part fully.** Don't measure "the dimensions you remember from the print" — measure *every* toleranced feature, against the print, with the correct gauge / micrometer / CMM. The first piece is the only one whose dimensions you don't yet trust.

### Dry-run modes — what each one tests

| Mode | What it tests | What it doesn't catch |
|---|---|---|
| **Air cut (Z +20mm)** | Toolpath geometry, fixture clearance, rapid moves | Cutting forces, real Z-rapids, spindle load |
| **Spindle-off real Z** | Real Z motion + collision with fixtures | Cutting forces, BUE, surface finish |
| **Spindle-on, no part** | Spindle motion + tool runout + acoustic baseline | Cutting forces |
| **Single-block first part** | Everything, one move at a time | Production-rate behavior (thermal drift over time) |
| **First-piece full run at 50% feed** | Cutting forces, chip evac, surface finish at half-aggression | Production-rate thermal behavior |
| **First-piece at 100% feed** | Production-rate behavior | (this IS production-rate; can only catch trends across N parts) |

Each mode catches a different failure class. Skipping early modes to "save time" is the inverse of the cost asymmetry — you trade $5/min savings for a $5000 risk.

### Probe-cycle pre-cut verification (the modern equivalent of indicator-dial setup)

If the machine has a tool-setter + work probe:

```
G65 P9810 — touch-off datum A face        → verify Z0
G65 P9814 — bore-center pickup            → verify X0 Y0 from feature
G65 P9811 — measure tool length           → confirm T05 isn't really T15
```

Probe-cycle verification catches the same errors as manual prove-out, in ~30 s, with sub-0.01 mm accuracy. If you have a probe, USE IT — the operator dial-indicating in 2026 is a tradition, not a strategy. The exception: extremely high-confidence pallet systems with proven dowel repeatability < 0.005 mm + tool-presetter offsets pre-validated.

### Climb vs conventional — the per-cut decision

Often left to default in CAM, but the right call varies per situation:

| Use **climb** (tool rotation + feed direction same on cutting edge) when | Use **conventional** when |
|---|---|
| Rigid setup (no backlash, modern CNC) | Old machine with axis backlash (climb pulls the part into the cut) |
| Surface finish matters (climb produces cleaner finish) | Cast / forged skin (conventional pushes into the skin from underneath, away from chip flow) |
| Tool life matters (climb runs cooler, longer life) | Hot-rolled scale or oxide (skin removal pass before any climb) |
| Aluminum / non-ferrous (always climb) | Manual milling machine without anti-backlash |
| HSM strategies (climb is required for ae > 0.5D) | Heavy interrupted cuts where climb-entry forces shock the spindle |

Modern CNC + clean stock + finish-quality cut = climb is the default. The only real cases for conventional are skin-removal first-pass and manual machines.

### Anti-patterns from the floor

- **"It worked last time, just run it."** Tool wear since last run, magazine changes since last run, fixture re-clamps since last run — none are guaranteed zero. "Last time" isn't a verification, it's a memory. Run the prove-out anyway; the cost is < $50, the safety net is 10×.

- **"Single-block is for new operators."** No — single-block is for the *first* cut of *any* program on *any* operator's shift. The most experienced operators in the shop use it religiously because they've all crashed enough times to know better.

- **"I trust the CAM."** CAM is a translator from CAD intent to G-code. It doesn't know your tool magazine layout, your fixture geometry beyond what you imported, or that you swapped a tool yesterday. Trust + verify; verify > trust.

- **"Dry run is a waste of cycle time."** It is — *during production*. Before production, it's the cheapest part of the cycle. Distinguish prove-out (one-time per setup) from production (every part).

- **"Spindle load is in the green, all is well."** Spindle load measures torque, not collision or wrong-feature-cut. A spindle that's cutting air at 100 % feed has 0 % load and is still wrong. Spindle load is *one* signal — visual confirmation of where the tool is, is the load-bearing one.

- **"I measured the first part — it's good — run 100."** Measure parts 1, 5, 25, 100 at minimum. Thermal drift, tool wear progression, and stochastic chip events appear after part 1 is long done. A good first piece is necessary, not sufficient.

### When prove-out can be compressed

- **Repeat job within 1 week, same setup, same tools, same operator** — compress to step 3 (WCS verify) + step 7 (first-piece measurement). Skip dry-run + single-block.
- **Probe-cycle-validated setup on pallet system** — compress to step 1 (program read) + step 7 (measure). The probe handles 2-6 automatically.
- **Brand-new program, new tool, new material, new fixture** — DO ALL 7 STEPS. This is the highest-risk scenario; compression here is gambling.

### Tie-ins

- [[machining-tactics-in-cut-adjustments]] — sibling layer; this entry happens before cycle-start, that one happens during the cut
- [[part-setup-multi-op-planning]] — setup-sheet from that entry feeds steps 2-3 here
- [[workholding-clamp-force-and-selection]] — torque-and-confirm of the holder is part of step 3 (verify WCS) — the fixture must be at production torque before zero is set
- [[operation-ordering-hole-sequence]] — first-piece measurement order should match the operation order to catch upstream errors before measuring downstream features

## Provenance

Distilled from the 339 machining-tactics tips in the 4245-tribal corpus + Machinery's Handbook 31e §Setup & Prove-Out + Sandvik §First piece + Haas / Fanuc operator manuals (single-block + dry-run feature docs). Authored 2026-05-21 by slot:hotel under U-WIKI-MACHTACT-PRECUT — second canonical machining-tactics entry, sibling to [[machining-tactics-in-cut-adjustments]]. Pre-cut tactics (this entry) + in-cut tactics (sibling) + post-cut diagnostics (operation-ordering anti-patterns) now form the complete tactical-decisions surface.

System injection: `tribal-by-domain-inject` (UserPromptSubmit hook) auto-surfaces on `prove-out`, `first piece`, `dry run`, `single-block`, `feed hold`, `air cut`, `tool setter`, `work probe`, `climb`, `conventional`, `cycle start`, `pre-cut`, `verify`, `WCS verify` keywords. Zero wiring required.

## Cross-references

- [[machining-tactics-in-cut-adjustments]] — sibling; this is pre-cut, that is in-cut
- [[part-setup-multi-op-planning]] — setup-sheet feeds the prove-out checklist
- [[workholding-clamp-force-and-selection]] — torque verification is part of WCS prove-out
- [[operation-ordering-hole-sequence]] — first-piece measurement order matches cut order
- [[reference_tribal_coverage_audit_2026_05_18]] — coverage audit; machining-tactics now has 2 canonical entries
- [[feedback_do_optional_high_roi_work]] — standing rule honored
