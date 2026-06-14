---
name: reference-cad-template-coverage-plateau-2026-05-27
description: CAD function-template coverage hits sticky plateau at 78.5% (113/144 slots) from YouTube alone — 31 gaps are unfillable without PDF/catalog pivot or classifier domain expansion.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.042Z
aliases: reference_cad_template_coverage_plateau_2026_05_27
---


# CAD template coverage plateau (slot:delta iter25..iter34, 2026-05-27)

## What happened
9 iters of YouTube ytsearch3 harvests (54 queries, ~140 video transcripts, 2397 tribal entries) plus 1 classifier refactor lifted coverage 67.6% → 78.5% (91 → 113 templates of 144 slot-grid).

Iters 31, 33, 34 each added 0-1 templates per 6 harvests despite adding 40-100 tribal entries — diminishing returns wall.

## Root causes of the plateau (31 remaining gaps)
1. **feature-recog** (all softwares) — concept is mostly FAR/HSMWorks-internal; standalone tutorials rare on YouTube.
2. **Onshape gaps** — Onshape lacks mainstream YouTube content for reverse-eng, generative, mass-properties, sheet-metal extra topics.
3. **Rhino gaps** — Rhino is NURBS-native; weldments, sheet-metal, routing are uncommon use cases.
4. **Classifier still has order-of-precedence collisions** — even after iter32 most-hits-wins refactor (lifted +6 templates), specialist regexes have fewer keyword variants than feature-3d/sketch-2d. Tutorial mentions of "extrude" 30x vs "weldment" 5x → feature-3d wins.

## Successful engineering move (iter32)
`inferFunction()` refactor first-match-wins → most-hits-wins at `H:/prism-slot-delta/scripts/generate-cad-function-templates.mjs:45-58`. ZERO new harvests, +6 templates. Committed in iter32.

## What's still high-ROI to try
1. **Enrich specialist regexes** with more keyword variants (e.g., weldments: add "skeletal frame", "ROEX", "tubing assembly", "stitch weld") — boosts hits in YouTube content.
2. **PDF/online-catalog pivot for sticky niches** using lima's pypdf method. Onshape mass-properties + Rhino routing likely findable in vendor catalogs.
3. **Pivot to piece-3** — substrate is rich enough (113 templates, proposeFunctionOperations API ready) for CADAssemblyGenerationEngine build.

## What NOT to repeat
- More YouTube harvests on the same 31 categories — confirmed wall.
- Re-running pipeline without classifier change — no net new templates.

## Closed-loop self-improving pipeline (delivered)
The closed loop runs end-to-end per iter:
`findCoverageGaps → ytsearch3 harvest → extract-youtube-toolpath-tribal → emit-youtube-toolpath-wiki → generate-cad-function-templates → cad-template-consumer.--coverage`
Each piece is pure-fn-tested in scripts/lib/ + scripts/*.test.mjs. Closed-loop cron a33ee325 runs every 5min for autonomous drain.

## Memory anchors
- `feedback_use_lima_pypdf_page_extractor` — canonical PDF method when pivoting
- `feedback_no_public_h_drive` — internal-only output discipline
- `feedback_commit_to_slot_worktree` — slot/delta commit hygiene
