---
name: reference-cam-pipeline-audit-2026-05-28
description: CAM domain audit applying delta's CAD-PIPELINE-AUDIT methodology to CAM. Re-runnable scorer (scripts/cam-pipeline-coverage-scorer.mjs) + baseline (cam-pipeline-coverage-LATEST.{json,md}) + audit doc (F1-F7 findings) + Tier-1-to-4 test playbook for hyperMILL+Mastercam+Fusion + CAD-to-CAM handoff contract. HyperMill leads at norm 92 / 6-10 platform-specific stages; Fusion 360 owns live-drive (socket + Autodesk MCP); Mastercam X8 under-bridged despite 95+ JM Die programs.
type: reference
slot: kilo
source: prism-memory
synced: 2026-06-09T14:54:09.049Z
aliases: reference_cam_pipeline_audit_2026_05_28
---


# CAM Pipeline Audit — kilo applies delta's CAD methodology to CAM (2026-05-28)

**Operator follow-up:** *"do another deep assessment … apply all of the same things but specifically for cam since its your domain"*

Five artifacts shipped this cycle (mirrors delta's CAD audit pattern 1:1):

| Artifact | Path | Mirror of |
|---|---|---|
| Scorer script | `scripts/cam-pipeline-coverage-scorer.mjs` | delta's `cad-pipeline-coverage-scorer.mjs` |
| Coverage baseline | `state/shared/specs/cam-pipeline-coverage-LATEST.{json,md,html}` | delta's `cad-pipeline-coverage-LATEST.{json,md}` |
| Audit doc | `state/shared/specs/CAM-PIPELINE-AUDIT-2026-05-28.md` + .html | delta's `CAD-PIPELINE-AUDIT-2026-05-20.md` |
| Test playbook | `state/shared/specs/CAM-TEST-PLAYBOOK-2026-05-28.md` + .html (Tier 1 mock → Tier 4 orchestrator for hyperMILL + Mastercam + Fusion) | delta's `HYPERCAD-TEST-PLAYBOOK-2026-05-20.md` |
| Handoff contract | `state/shared/specs/CAD-TO-CAM-HANDOFF-CONTRACT-2026-05-28.md` + .html (delta → kilo schema, GD&T propagation, post-CAM verification gate) | delta's `PRINT-TO-CAD-HANDOFF-CONTRACT-2026-05-27.md` (kilo → delta) |

## Ranking (norm 2026-05-28)

| Rank | Platform | Norm | Plat-specific stages | Bridge kind | Autodesk MCP |
|---|---|---|---|---|---|
| 1 | HyperMill (+HyperCAD-S) | 92 | 6/10 | in-host | no |
| 2 | Inventor HSM | 91 | 6/10 | none | yes |
| 3 | Fusion 360 | 79.5 | 3/10 | **socket** | **yes** |
| 4 | Mastercam X8 | 72.5 | 3/10 | none | no |
| 5 | NX CAM | 71.5 | 3/10 | none | no |
| 6 | Esprit | 64 | 2/10 | none | no |
| 7 | SolidCAM | 61 | 2/10 | none | no |
| 8 | PowerMill | 61 | 2/10 | none | no |

## Findings F1-F7

- **F1** — HyperMill leads CAM substrate; live-drive runtime partially verified (MISC-305 analog).
- **F2** — Mastercam X8 under-bridged: 95+ JM Die mcx-8 programs + full VBScript automation surface, but PRISM has ZERO platform-specific bridge engines. Highest-leverage Mastercam gap. `U-MASTERCAM-VBSCRIPT-DRIVE` ships the C-Hook + ATP NetHook + VBScript bridge.
- **F3** — Fusion 360 wins live-drive (socket bridge :18360 + Autodesk MCP). Subject to MISC-305 runtime gate.
- **F4** — Closed-loop feedback stage at the floor (= 3) across ALL platforms — the self-learning loop is platform-NEUTRAL (good news). `U-PER-CAM-CORPUS-PRIORS` would tune bandit posteriors per CAM system using accumulated corpus.
- **F5** — Workholding stage shows ZERO platform-specific evidence — correctly platform-agnostic (no follow-up).
- **F6** — Setup-sheet stage is most-covered across all platforms (echo's post-emit family).
- **F7** — Shared-engine credit tautology controlled by `hasPlatformEvidence` flag. Esprit/SolidCAM/PowerMill are nearly pure-shared-credit ranks (8/10 false).

## Fusion CAM access — operator's specific question

Operator asked "the fusion cad files in JM die folder have cam programs, can you access and utilize those? we're posting all programs but it's taking a while."

**Answer: YES.** 1640 .f3d files at `H:/PRISM/JM DIE/FUSION CAD AND CAM FILES/{ELECTRODES,JM,MANNY,OKUMA(1756902819851),ROKU ROKU}/`. Each .f3d is a ZIP archive containing `model.sqlite` with the **native Fusion feature tree AND CAM operation tree** (sketches, extrudes, fillets, patterns, toolpaths, operations, parameters). **Don't need to wait for G-code post-processing** — the CAM data is embedded.

Three access paths:
1. **Offline batch** (no Fusion needed): `scripts/extract-f3d-feature-trees.py` (kilo-authored 2026-05-27). Per-file JSON output to `state/shared/cad-rev-eng/`. **`U-F3D-EXTRACT-BATCH-RUN` is the operator-actionable unit** (zero PRISM deps).
2. **Runtime TS**: `F3DSQLiteParserEngine.ts` (the TS sibling).
3. **Live Fusion socket bridge**: `Fusion360LiveBridgeEngine` + Autodesk MCP (subject to MISC-305 runtime verification per Tier 2 playbook).

## Highest-leverage next units (after this audit)

1. **`U-F3D-EXTRACT-BATCH-RUN`** — operator-actionable, parallelizable, populates Fusion training corpus immediately. Zero PRISM deps.
2. **`U-ADAPTIVE-PIPELINE-ORCH`** — 10-stage outer orchestrator. The single missing piece that converts "we have all the engines" into "closed-loop self-training is on."
3. **`U-CAM-AUDIT-PEER-REVIEW`** — fire 2 reviewer agents on this audit per delta's FAIL→patch→re-publish pattern.
4. **`U-MASTERCAM-VBSCRIPT-DRIVE`** — closes F2 (95+ Mastercam programs unused).
5. **`U-ADAPTIVE-PIPELINE-WET-RUN`** — drive ONE JM Die part through the orchestrator end-to-end (Tier 4 of the playbook).

## Cross-refs

- `[[reference_cam_adaptive_pipeline_deep_assessment_2026_05_28]]` — deep assessment behind this audit
- `[[reference_cam_self_teaching_pipeline_ms0]]` — initial MS0 spec
- `[[reference_cam_corpus_locations]]` — JM Die paths
- `[[reference_oscar_sfc_domain_map_2026_05_27]]` — SFC stack
- `[[reference_echo_post_processor_domain_map_2026_05_27]]` — PP stack
- `[[feedback_ai_training_first_before_revenue]]` — supporting doctrine
