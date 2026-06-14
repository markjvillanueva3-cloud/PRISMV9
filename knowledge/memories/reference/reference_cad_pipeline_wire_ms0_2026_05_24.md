---
name: reference_cad_pipeline_wire_ms0_2026_05_24
description: CAD-PIPELINE-WIRE-MS0/U-CAD-KNOWLEDGE-WIRE shipped slot:delta 2026-05-24 — two-layer surface (index builder + UserPromptSubmit hook) that surfaces the 4939-param + 4999-tribal vault on every CAD prompt; companion 20-source download catalog
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.041Z
aliases: reference_cad_pipeline_wire_ms0_2026_05_24
---


# CAD-PIPELINE-WIRE-MS0 — wiki + tribal + courses + PDF injection

Shipped 2026-05-24 by slot:delta on H:/prism-slot-delta (commit chain after `[SLOT-DELTA] [CAD-CORPUS-MS0]/U-STEP-FEATURE-EXTRACT`).

## What it does

Adds `additionalContext` to every UserPromptSubmit that mentions CAD ops (extrude, sketch, sweep, hole, fillet, pattern, loft, sheet-metal, dimension, gd&t, ...) or names a priority CAD system (hyperCAD, Fusion 360, Mastercam, SolidWorks, Inventor) or carries regen intent. The injected block surfaces:

- Per-system coverage counts (ops/params indexed for the detected system)
- Top-K matching ops by token-overlap (e.g. `fusion360/extrude (17 params)`)
- Top tribal CAD entries
- Top engineering courses
- Top extracted CAD/CAM PDFs
- Cross-ref to `/cad-regen` skill on regen intent

## Two pieces

| Piece | Path | Role |
|---|---|---|
| Index builder | `scripts/cad-pipeline-knowledge-index.mjs` | Walks `knowledge/wiki/architecture/{cad-params,tribal,courses,extracts,monolith-modules}`; emits `state/shared/cad-pipeline-knowledge-index.json` with reverse token index (cap 25/token). ~150ms full rebuild. |
| Hook | `.claude/hooks/cad-pipeline-knowledge-inject.mjs` | UserPromptSubmit T2 hook, wired after `wiki-precheck-inject`. Throttled 30s, fail-soft on missing index. |

## Slot-delta vault vs main tree

Slot-delta carries the full U-CADP-EXTRACT artifact: **5 systems / 721 ops / 4,939 params / 4,999 tribal entries / 15 courses / 14 PDF extracts / 1,091 indexed tokens**. Main tree as of 2026-05-24: **1 system / 30 ops / 286 params / 345 tribal / 104 courses**. The slot-delta tree must merge into main to scale the hook fleet-wide.

## Companion: external download catalog

`scripts/cad-design-book-sources.mjs` → `state/shared/cad-design-book-sources.json`. 20 cataloged training-corpus sources across 4 license tiers:
- **tier-1** (vendor docs, attribution-required, no redistribution): Autodesk Fusion 360 help + API · Inventor · SolidWorks help + API · Mastercam help · OPEN MIND hyperMILL/hyperCAD-S docs
- **tier-2** (CC-BY-NC-SA): MIT 2.008, 2.007, 6.838 (geometric modeling — NURBS/B-spline/BRep), 2.972
- **tier-3** (public domain): Machinery's Handbook pre-1928 · French Engineering Drawing · USAF/USN drafting manuals · NIST manufacturing notes · ISO 10303-21 STEP spec · ISO 10303-42 BRep spec
- **tier-4** (free-with-registration): Autodesk Generative Design whitepapers · Springer/Elsevier open-access feature-recognition papers · GrabCAD library

Operator-mediated download — feed via `/pdf-learn`, which lands extracts in `knowledge/wiki/architecture/extracts/` where the next index rebuild auto-picks them up.

## Why

User directive 2026-05-24: *"wire in wiki nodes, tribal knowledge nodes into cad pipelines from the engineering courses, pdf of cad cam softwares and find cad design book downloads to train the system further"*. Pre-wiring the 4,939-param vault was invisible to the AI unless an operator manually surfaced a file. Post-wiring every CAD prompt gets the relevant subset injected BEFORE the model writes its first token — direct R8 ("read before you write") + R10 ("checkpoint") doctrine application; collapses what was a 5-tool-call discovery phase into one context block.

## Cross-refs

- `[[reference_step_feature_extract_2026_05_24]]` (pending) — sibling pure-node STEP BRep entity classifier (3 complex / 16 moderate / 11 simple from 30-file test set)
- `[[reference_kec_ms0_6999_seeds_2026_05_24]]` — the 6,999-node NN-graph training pool that this wiring complements
- `/cad-regen` skill — 30-file STEP regen test set including Impeller turbine + ROTOR SHAFT targets
- `state/shared/cad-pipeline-knowledge-index.json` — runtime index data
- `state/shared/cad-design-book-sources.json` — external sources catalog
- Wired in `H:/prism-slot-delta/.claude/settings.json` UserPromptSubmit (line ~826, after `wiki-precheck-inject`). Main-tree settings activation deferred.

## Knobs

- `PRISM_CAD_PIPELINE_INJECT_DISABLE=1` — off entirely
- `PRISM_CAD_PIPELINE_INJECT_K=N` (default 5) — top-K ops to surface
- `PRISM_CAD_PIPELINE_INJECT_THROTTLE_MS=N` (default 30000) — per-chat throttle file at `~/.claude/state/cad-pipeline-inject-throttle.json`
