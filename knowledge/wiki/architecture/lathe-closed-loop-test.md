---
title: Lathe (Kienzle) closed-loop test architecture
type: architecture
domain: lathe
slot: whiskey
date: 2026-06-26
tags: [lathe, kienzle, closed-loop, rung-a, rung-b, rung-c, safety, efficiency, vision-ocr, never-soften]
related:
  - "[[node-fetch-localhost-ollama-broken-use-curl]]"
  - "[[reference_whiskey_rungc_ocr_leg_u_w2c_2026_06_26]]"
---

# Lathe (Kienzle) closed-loop test architecture

The print-to-CNC-program-for-lathes closed-loop TEST: does PRISM regenerate a lathe program that
matches the empirical reality of JM Die's 34,993 real Okuma `.MIN` programs, with collision avoidance +
cost + machining efficiency factored in? Three rungs + a safety/efficiency layer, folded into ONE
unified dashboard (`scripts/lathe-closed-loop-full.mjs` -> `state/shared/dashboards/lathe-closed-loop-full.json`).

## The rungs

- **Rung A -- empirical ground-truth cloud.** `scripts/lathe-jmdie-param-accuracy-harness.mjs` mines
  every JM `.MIN` (use `--all --all-roots` for the true 34,993, not just the 16,558 under CNC LATHE)
  into per-op percentile bands -> `op_parameter_reference[rough|finish|drill|rapid].{sfm,feed_ipr}.{p05..p95}`
  + a G50-cap safety audit (545 G96-without-G50 overspeed-risk programs). This is the ground truth;
  ground-truth ext = `.MIN` (decision D3).
- **Rung B -- PRISM generator vs the cloud.** `mcp-server/scripts/lathe-roundtrip-accuracy-harness.ts`
  (run via tsx) parses a real `.MIN`, regenerates via `turningPrintToProgramEngine.runPipeline()`, and
  scores the generated speeds/feeds vs the Rung A cloud. Honest baseline ~41.6% (synthetic-grid 96.3%
  feed / 100% SFM is on a synthetic input grid, NOT real-program accuracy).
- **Rung C-CAD -- the geometry leg (the keystone gap, U-W2C).** `scripts/lathe-rungc-ocr-loop.mjs`
  (run via tsx): real part DRAWING (PDF) -> PyMuPDF raster -> `blueprintVisionOCREngine.analyzeBlueprint`
  -> `turningPrintIntakeEngine.convertBlueprint` -> `runPipeline` -> `scoreProgram` (`scripts/lib/lathe-band-score.mjs`)
  -> pair to `.MIN` by part# (`scripts/lib/lathe-part-number.mjs`). Closes the loop for the PDF-print
  subset. STEP B-rep leg (2,307 JM STEP files) still needs the Python cad-engine bridge --
  `STEPGeometryParserEngine` is entity-COUNT-only, does NOT feed `TurningCADImportEngine`.

## Safety + efficiency scoring (U-W2D)

`scripts/lib/lathe-safety-efficiency-score.mjs` aggregates the pipeline-computed signals
(`collision_checks[]`, `boring_bar_checks[]`, `chatter_checks[]`, per-op `physics.{power_kW,mrr_mm3_min,tool_life_min}`,
`estimated_cycle_time_sec`) + machine limits into a SAFE / UNSAFE / PARTIAL verdict + efficiency
metrics. It is the TEST measurement layer, NOT the shop-floor S(x) gate. Doctrine:

- **NEVER soften:** a critical collision fail / overspeed op (rpm > G50/max cap) / overpower op
  (power > machine limit) / critical warning / boring-bar out-of-tolerance => UNSAFE.
- **Never assert SAFE on an unchecked axis:** missing machine limit or `collision_checks` not run ->
  reported as `unknowns`, verdict degrades to PARTIAL (never SAFE). Non-finite op physics (NaN/Infinity)
  is unverifiable -> `op_physics_nonfinite` unknown -> PARTIAL.

## Lessons (bug findings, R12)

1. **A FAILED collision check vetoes SAFE regardless of severity LABEL.** `LatheCollisionZoneEngine`
   emits `passed:false, severity:"warning"` for REAL conflicts (live-tool-vs-tailstock CONFLICT,
   grooving/parting overhang), and the pipeline forwards them into `warnings` preserving severity.
   Gating the safety verdict only on `severity==="critical"` let a program with a failed collision
   check grade SAFE -- a never-soften violation (caught by 3-of-3 arm C, missed by arms A+B). Fix:
   ANY `passed:false` collision check vetoes SAFE; erring toward UNSAFE on a non-pass is the safe
   direction. **General lesson:** a safety gate must veto on the FAIL FLAG, not on the advisory
   severity label the producer happened to assign.
2. **No silent false-success on a geometry-only program.** A print that generates only specialty ops
   (threading/parting/grooving -- all excluded from band scoring) has `band_scored_ops=0`: the geometry
   path closed but nothing was validated vs the cloud. `full_geometry_loop_closed` must require
   >=1 print with >=1 band-scored op, else it flips true while validating nothing (3-of-3 arm C).
3. **Resolve fields robustly across producer shapes.** A harness STDOUT and its persisted dashboard
   FILE can have different shapes (flat vs nested under `aggregate.*/safety.*`). Reading flat fields
   from the nested dashboard yielded `null` on real data (a misleading R12 violation in the operator's
   "comprehensive closed-loop test"). Use `??` fallback across both shapes; compute the resolver BEFORE
   every consumer (coverage block too) so the same dashboard never self-contradicts.

## Host gotcha

Node `fetch` is broken for localhost Ollama on this host even at `127.0.0.1`
([[node-fetch-localhost-ollama-broken-use-curl]]). To run a vision-OCR TS engine at $0-Claude from a
script: inject a curl-based `ollamaVisionGenerate` into the `llmEngine` singleton's `deps` + null its
`config.api_key` (forces Ollama-only). The vision run is GPU-bound; drivers are resumable + reap-safe
(`--all --limit 1`) so a fire when the fleet GPU frees completes them.

## Tests + scrutiny

`scripts/lib/lathe-band-score.test.mjs` (17) + `scripts/lib/lathe-safety-efficiency-score.test.mjs` (10)
= 27 real reference-value/invariant tests. Every unit got per-file 2-arm + 3-of-3 scrutiny; the
independent analyst (arm C) caught a real safety P1 twice that the first two arms missed.
