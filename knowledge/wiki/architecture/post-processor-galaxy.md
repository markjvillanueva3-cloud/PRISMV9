---
title: Post-Processor Galaxy — Architecture Map
type: architecture
domain: post-processor
slot: echo
maintainer: echo
created: 2026-05-28
tags: [post-processor, gcode, masterpost, controller-dialect, galaxy, echo]
---

# Post-Processor Galaxy — Architecture Map

The post-processor galaxy (owned by **slot:echo**) converts CAM toolpath output into controller-specific, machine-ready G-code. It is the last stage of PRISM's print-to-program pipeline: **blueprint → CAD (delta) → CAM strategy+toolpath (kilo) → post-processor NC emission (echo) → shop floor.**

## Position in the pipeline

```
kilo (CAM toolpath, NCI/APT)  ─┐
oscar (feed/speed per block)  ─┼─►  echo (post-processor)  ─►  machine-ready .nc / .cps
src/physics/constants.ts      ─┘        │
                                        └─► india (closed-loop learning on outcomes)
```

Echo CONSUMES toolpaths from kilo + feed/speed from oscar; it does NOT select CAM strategy (kilo) or validate machine dynamics (machine-setup).

## Engine tiers

1. **Tier-1 saleable MasterPost** — `MasterPostProcessorEngine` (7-engine fanout), `MasterPostProcessorUnifiedAGIEngine` (14 controllers / 19 CAM / 25+ ops, 8-dim quality scorecard + provenance + tribal citation), `PostProcessorPipelineEngine` (7-phase / 38-stage), `MasterPostFineTuningEngine` (per-vendor LoRA-class calibration).
2. **G-code core** — 12 `GCode*` engines: safety analyzer (67K), template/snippet library, validation/verification gates, transpiler, optimizers, cycle-time predictors, NL→GC + GC→CAD.
3. **Controller-specialist (stub-wired, leverage class)** — 8 engines with code but only single-method wiring: `WEDMPost{Mitsubishi,Sodick,Makino,Agie,Fanuc}`, `LathePostProcessorAI` (73K), `LathePostGeneratorActiveLearning`, `JMDiePostProcessorLearning`.
4. **AGI-tier (fully dark)** — ~14 engines with zero dispatcher surface = the MS-MASTERPOST ghost-roost anchor.

## Dispatchers

`camDispatcher` (~155 post/pp/ppg/dialect cases) + `productDispatcher` (24 `ppg_*`). Pre-emit safety via `cam_post_emit_safety_gate`.

## Product line

**MasterPost** is a saleable subscription product. Controller MVP priority: Hurco WinMAX → Haas → Fanuc → Siemens → Mazatrol → Okuma. **Gated on U-LEGAL-13** (dialect codes re-derived from public manuals only).

## JM Die corpus

12 `.cps` at `JM DIE/PRISM MODIFIED POST PROCESSORS/` — Haas Classic, Hurco WinMAX, Okuma OSP-P300, Fanuc 31i. Wire-EDM post absent (generate via `WEDMPostMitsubishiEngine`).

## See also
- [[architecture/post-processor-controller-dialect-matrix]] — dialect feature deltas + gotchas
- [[architecture/post-processor-pipeline]] — the 7-phase emit pipeline
- Galaxy doctrine: `mcp-server/src/engines/post-processor/{CLAUDE,MEMORY,PATHS,TOOLBELT}.md`
- [[feedback_psn_definition]] — echo is the post-processor leg of the PSN engine/algorithm/formula axes

_Authored by slot:echo (claude-223d9a61), 2026-05-28._
