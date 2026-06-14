---
name: reference_cad_topology_emitter_2026_05_25
description: CAD-PIPELINE-WIRE-MS0 topology-rich STEP emitter + validator + /cad-to-desktop skill shipped slot:delta 2026-05-25 — closes "Fusion shows nothing" gap with real CLOSED manifold body (3 faces) but quantifies the remaining 482-face blade-topology deficit vs source
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.042Z
aliases: reference_cad_topology_emitter_2026_05_25
---


# CAD topology-rich STEP emitter (CAD-PIPELINE-WIRE-MS0 follow-up)

Shipped 2026-05-25 slot:delta — 4 units in one /loop iter:

| Unit | File | Result |
|---|---|---|
| U-CAD-FUSION-TOPOLOGY-EMIT | `scripts/cad-emit-impeller-fusion-step.mjs` | Real CLOSED manifold STEP (CYLINDRICAL_SURFACE + 2 PLANE caps via ADVANCED_FACE/EDGE_LOOP/ORIENTED_EDGE chain). Replaces 2-line placeholder. |
| U-CAD-TOPOLOGY-VALIDATE | `scripts/cad-step-topology-validate.mjs` + `.test.mjs` | TOPOLOGY_OK / TOPOLOGY_DEGENERATE verdict. 7/7 tests pass. |
| U-CAD-DESKTOP-DELIVERY-SKILL | `scripts/cad-to-desktop.mjs` + `.claude/commands/cad-to-desktop.md` | One-shot SOURCE+TOPOLOGY+LEGACY+STL drop to operator Desktop for Fusion verification with `--validate` face-count diff. |
| U-CAD-COMMIT-DELTA-PASS | this commit | Slot/delta worktree commit. |

## Quantified gap (the value)

`/cad-to-desktop --slug impeller-turbine --validate` produces a measurable verdict:

| Artifact | verdict | CLOSED_SHELL faces |
|---|---|---|
| SOURCE | TOPOLOGY_OK | **485** |
| REGEN_TOPOLOGY (new) | TOPOLOGY_OK | **3** |
| REGEN_LEGACY (old pseudo) | TOPOLOGY_DEGENERATE | **0** |

Before this work: "Fusion shows nothing — regen is points only" (subjective).
After this work: "Fusion shows a real hub solid (3 faces); 482 blade-faces are the documented next-phase deliverable" (numerical).

## Honesty boundary preserved

`/cad-to-desktop` writes ONLY to `~/Desktop/` (operator's local hardware, not internet-published). Compatible with the `no public H: drive` rule from [[feedback_no_public_h_drive]].

The skill's README + closing console line tell the operator explicitly that REGEN_TOPOLOGY is "hub envelope only" and the gap to SOURCE is what the next pipeline phase must close. No false promises.

## Cross-refs

- `[[reference_cad_pipeline_closed_loop_2026_05_24]]` — closed-loop pipeline this builds on
- `[[cad-pipeline-closed-loop]]` (wiki) — full 19+3 script pipeline table + updated topology-gap section
- Skill: `/cad-to-desktop`
- Scripts: `cad-emit-impeller-fusion-step.mjs`, `cad-step-topology-validate.mjs`, `cad-to-desktop.mjs`
- Desktop output: `~/Desktop/impeller-turbine_{SOURCE,REGEN_TOPOLOGY,REGEN_LEGACY,REGEN_STL}.{stp,step,stl}`

## Pending for next phase

- The 482-face blade-topology deficit: needs the emitted `<slug>.fusion360.py` script run INSIDE Fusion's Python kernel via Fusion API (out-of-process for the pure-node pipeline)
- Apply topology emitter + validator + delivery skill to remaining 558 corpus parts (currently only impeller-turbine has the regen-topology.step output)
- Extend the topology emitter beyond a single cylinder: feed `geom.cylinders[]` to emit N proper concentric cylindrical surfaces (close some of the 482-face gap purely in node)
