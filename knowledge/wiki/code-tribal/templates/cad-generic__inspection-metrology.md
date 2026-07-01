---
title: "CAD function template — generic / inspection-metrology"
software: generic
function: inspection-metrology
source: video-tribal-aggregation
tip_count: 1
videos_covered: 1
generated_at: 2026-05-27
---

# CAD function template — generic / inspection-metrology

**Software:** `generic` · **Function category:** `inspection-metrology`
**Source:** aggregated from 1 video tribal tips across 1 unique tutorial videos.

## Canonical prompt pattern

When a chat asks "do <inspection-metrology> in <generic>" or invokes [[tribal-by-domain-inject]] with domain=cad matching, this template surfaces.

## Aggregated tribal tips (top 1 by confidence)

### Tip 1 (confidence 0.43)

> roughness gauge you must check the calibration must check the calibration must check the calibration now in order to che

roughness gauge you must check the calibration must check the calibration must check the calibration now in order to check the calibration first position a reference specimen on a Surface plate Surface plate Surface plate next position the gauge so that the probe will travel in the same direction as the double arrowed line on the reference specimen reference specimen reference specimen make sure the probe is positioned far enough above the specimen to avoid a collision when positioning collision when positioning collision when positioning when the gauge is properly positioned loosen the

_Signals: safety:3_

_Source: [Lesson 7 Measuring Surface Finish](https://www.youtube.com/watch?v=A0Gx8C113e8) — channel `Screw Machine Information`_

## Self-learning hook

This template is consumed by the assembly-generation AI when it needs to synthesize `inspection-metrology` operations in `generic`. The aggregated tips act as few-shot priors. Closed-loop flow:

1. New tribal entries land in `mcp-server/data/tribal/youtube-toolpath-tribal.jsonl`
2. `embed-tribal-jsonl-into-index.mjs` adds them to the recall index
3. Re-running `generate-cad-function-templates.mjs` rebuilds this template with new tips folded in
4. The AI sees the richer template on its next invocation