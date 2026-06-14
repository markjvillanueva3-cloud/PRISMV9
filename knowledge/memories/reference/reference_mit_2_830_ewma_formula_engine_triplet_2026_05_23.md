---
name: mit-2-830-ewma-formula-engine-triplet-2026-05-23
description: Memory node linking MIT 2.830 (Control of Manufacturing Processes) → EWMA control-chart formula → EWMAEngine.ts → prism_calc dispatcher. Closes the course→formula→engine→action lineage gap for one of the 5 MIT-OCW courses already integrated into PRISM. India proof-of-life delivery for MIT-courses /goal.
aliases: reference_mit_2_830_ewma_formula_engine_triplet_2026_05_23
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.220Z
---


# MIT 2.830 → EWMA formula → EWMAEngine triplet (2026-05-23)

## Course

**MIT 2.830 — Control of Manufacturing Processes** (MechE / Sloan).
Wiki: [[mit-2-830-control-of-manufacturing-processes]].
The course wiki entry explicitly names "Shewhart/EWMA/CUSUM control-chart formulas, DOE factorial designs, EWMA run-to-run controller, Cpk acceptance gates" as the extracted content set.

## Formula (the canonical algorithm extracted from 2.830)

**EWMA control chart** (Exponentially Weighted Moving Average):

```
z_i = λ·x_i + (1 − λ)·z_{i−1},        z_0 = μ
UCL_i / LCL_i = μ ± L·σ·√(λ/(2−λ) · (1 − (1−λ)^{2i}))
```

Where:
- `λ ∈ (0, 1]` — smoothing constant (typical 0.1–0.3)
- `L > 0` — control-limit multiplier (typical 2.7–3.0)
- `μ, σ` — process target mean + stddev

Steady-state half-width: `L·σ·√(λ/(2−λ))`.

Algorithmic family: recursive smoothing filter (first-order IIR) + Shewhart-style 3-sigma limits.

## Engine implementation

**`H:/prism/mcp-server/src/engines/EWMAEngine.ts`** (109 LOC, milestone PP-0.22-U-SPC3):

- `class EWMAEngine` — stateful filter holding `z` + `stepIndex`
- `step(value)` — single-sample update returning `{index, value, z, ucl, lcl, alarm}`
- `analyze(values[])` — batch-mode returning `{points[], alarms[], firstAlarm}`
- `steadyStateHalfWidth()` — useful for offline limit configuration
- `validateConfig()` — fail-loud on bad params (R12-conformant: `stddev > 0`, `λ ∈ (0,1]`, `L > 0`, finite `mean`)

**Engine-side citation:** Roberts (1959) "Control Chart Tests Based on Geometric Moving Averages".
**Course-side citation (THIS memory):** MIT 2.830 names EWMA in its extracted-content list — Roberts is the *original* primary source; 2.830 is the *course* that teaches the modern run-to-run application.

## Triplet lineage gap closed

Before this memory, the chain was:
```
MIT 2.830 wiki entry  ─── (broken link) ───  EWMAEngine.ts
```
The course wiki said "EWMA is extracted" but did not point at the engine; the engine cited Roberts 1959 but not 2.830. PRISM's MIT-course-knowledge-graph engines (`MITCourseKnowledgeEngine`, `MITCourseIntegrationEngine`) had no concrete formula-node to wire.

After this memory:
```
MIT 2.830 wiki ─── this memory (course→formula→engine) ─── EWMAEngine.ts ─── prism_calc dispatcher (TBD: verify action exposure)
```

## PSN synergy touched (proof-of-life for `+ synergized PSN`)

- **Memories** ✅ this file
- **Wiki** ✅ paired wiki entry: [[ewma-run-to-run-controller-2026-05-23]] (sibling write)
- **Engines** ✅ EWMAEngine.ts (cross-ref to this memory in next sibling-slot pass)
- **Algorithms** ✅ EWMA recurrence formalized above
- **Formulas** ✅ steady-state half-width + variance growth formulas captured
- **System Viz** auto-detects on next graph regen (memory node + wiki entry both indexed)
- **Obsidian brain** auto-fed on next Stop via stop-obsidian-memory-feed.mjs
- **PRISM AI** EWMAEngine consumable via `prism_calc` action surface (dispatcher exposure to verify in sibling pass)
- **Tribal** PRISM WEDM tribal index already names "14 MIT-cited formulas" sourced from 2.830 — this memory pins one of them concretely

## Apply

- Future lima sessions executing the full MIT /goal: use this triplet as the **template pattern**. For each MIT course → for each extracted formula → write `reference_mit_<course>_<formula>_triplet_<date>.md` linking course wiki + formula + engine + action.
- Audit follow-up: verify EWMAEngine is wired into `prism_calc` (or `prism_spc`) action surface; if not, add an action like `spc_ewma_analyze`. Currently visible engine API: `step()`, `analyze()`, `steadyStateHalfWidth()`.
- Pattern generalizes to the other 4 courses already in wiki: 2.008 (manufacturing II), 2.813 (sustainable manufacturing), 18.06 (Strang linear algebra), 6.S191 (deep learning). Each likely has 1-3 formula/engine triplets to memorialize.

## Coverage gap surfaced

Of the 5 MIT-OCW courses in PRISM today:
- 2.830 → EWMA triplet ✅ (this memory)
- 2.008 → mfg II — triplet pending
- 2.813 → sustainable mfg — triplet pending
- 18.06 → linear algebra (Strang) — likely many engines depend on it (matrix ops everywhere); triplet pending
- 6.S191 → deep learning — likely many neural-net engines depend on it (GNN training, autoencoder, etc.); triplet pending

Math/science/engineering courses NOT yet in PRISM's wiki: MIT-OCW catalog has ~50+ in those domains (per `mit_courses_sources` action). Adding wiki entries for the rest is the next-iteration scope for lima.

Related: [[mit-2-830-control-of-manufacturing-processes]] · [[reference_mit_courses_goal_scope_handoff_2026_05_23]] · [[feedback_psn_definition]]
