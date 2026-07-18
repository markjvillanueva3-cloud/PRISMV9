---
title: Post-Processor Emit Pipeline (7-phase / 38-stage)
type: architecture
domain: post-processor
slot: echo
maintainer: echo
created: 2026-05-28
tags: [post-processor, pipeline, physics, safety, kienzle, taylor, gcode, echo]
---

# Post-Processor Emit Pipeline (PostProcessorPipelineEngine)

All NC emission in the post-processor galaxy (slot:echo) routes through `PostProcessorPipelineEngine` — a 7-phase, 38-stage pipeline. **Never string-concatenate G-code**; the pipeline's physics (P1) and safety+tribal (P5) phases are non-negotiable gates.

## The 7 phases

| Phase | Name | What it does |
|-------|------|--------------|
| **P0** | Defaults | resolve machine profile, controller family, optimization target, material |
| **P1** | Physics | Kienzle (cutting force), Taylor (tool life), Tlusty (chatter/stability), deflection, Ra (surface finish), power, torque — constants from `src/physics/constants.ts` |
| **P2** | Block-by-block | per-`ToolpathBlock`: 9-class engagement, full force tuple, thermal {T_tool, T_chip, cumulative_heat}, wear {VB, VB_rate, remaining_life_pct} |
| **P3** | Motion-opt | rapid optimization, smoothing-mode injection, look-ahead, corner handling |
| **P4** | Stochastic | Monte-Carlo CI95 on cycle-time / tool-life / quality |
| **P5** | Safety + tribal | rapid limits, coolant-before-spindle ordering, retract heights; tribal-tip citation injection |
| **P6** | Output | emit NC + 8-dim `UnifiedPostResult` (quality_score, kinematics_validation, provenance audit chain, tribal_tips_applied[]) |

## Controller / optimization knobs

- 11 `ControllerFamily` · 5 `OptimizationTarget` (balanced / max_speed / max_tool_life / min_cost / surface_quality).
- `UnifiedPostResult` carries the full provenance audit chain so every emitted block is traceable to its physics + tribal source.

## Inputs / outputs (bridges)

- **IN:** CAM toolpath blocks (kilo) + feed/speed (oscar, `cam_speedfeed_compute`) + physics constants.
- **OUT:** `.nc` / `.cps` + the quality scorecard → program-release + setup-sheet surfaces; outcome tuple → india (`xproc_outcome_publish`).

## Why not string-concat

Ad-hoc G-code concatenation bypasses P1 (ships unvalidated feeds/speeds), P5 (no safety gate, no tribal citation), and P4 (no confidence interval) — and breaks byte-equivalence vs the golden NC archive. See [[feedback_echo_masterpost_pipeline_route]].

## See also
- [[architecture/post-processor-galaxy]] · [[architecture/post-processor-controller-dialect-matrix]]
- `cam_post_emit_safety_gate` — the pre-emit safety gate echo wired (HURCO-POST-PIPELINE-BRIDGE-MS0 iter13)

_Authored by slot:echo (claude-223d9a61), 2026-05-28._
