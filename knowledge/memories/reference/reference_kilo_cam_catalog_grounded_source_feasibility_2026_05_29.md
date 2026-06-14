---
name: reference_kilo_cam_catalog_grounded_source_feasibility_2026_05_29
description: "CAM catalog Phase-2 grounded-source feasibility — exhaustive param fill is BLOCKED on local sources (binary defaults, workflow PDFs); live-seat add-in enumeration is the only grounded path"
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.179Z
aliases: reference_kilo_cam_catalog_grounded_source_feasibility_2026_05_29
---


Phase 2 of the CAM feature-catalog buildout ([[reference_kilo_cam_catalog_query_2026_05_29]]) is "grounded exhaustive fill" of the ~40% missing Fusion (59%) / Mastercam (55%) params. A grounded source-availability probe (slot:kilo claude-1981bb83, 2026-05-29) **falsified the original premise** that vendor PDFs / Mastercam X8 docs hold them in extractable form.

**The audit is sound (verified, NOT a bug — did not "fix" a non-bug):** `claimed` uses `Math.max(per-file)` not a sum (no consolidated↔split overlap inflation); `observedParams` de-duped by (op,param) across files (110 raw ops → 56 deduped proves overlap collapses); `machine-simulation.json` = 7 machine presets (separate axis, not a thin op); `module.total_params` (e.g. 312) are author-aspirational targets while `toolpaths.<op>.params` arrays are empty — real params live in nested `pages`/dialog (engine recovers `dynamic_mill`→32 cross-file). **So 55%/59% = real grounded ÷ author target; the gap is genuine data ABSENCE, not an extraction miss.**

**Grounded-source probe (why local fill is blocked):** Mastercam `SharedDefaults/.../*.DEFAULTS-8`/`*.OPERATIONS-8` = **binary** (`file`→"data"; need SDK/live seat); local PDFs = install/admin guides; `Dynamic_Milling.pdf` (78 p) = **workflow** doc not param ref (`Stepover`×2, `Min toolpath radius`×0, `retract`×0); `cad-cam-resources-pdf-index.json` = file catalog only (0/3936 carry text); the mcamX8 `*.xml` are CATIA-interop metadata. No cheap text-parseable local source exists.

**Corrected Phase-2 source strategy** (model = how hyperMILL hit 152%: structured DB/menu export, not docs): **★ live-seat dialog enumeration via `CAMAddInFrameworkEngine` (76K, already built; `/cam-bridge`)** — generate a Mastercam C-Hook/NET-Hook + Fusion `adsk.cam` add-in that walks every op's param defs in the running seat → export to `cam-functions/<system>/*.json` with `source:"<app> live-enum"`. Grounded by construction. Fallbacks: online help scrape (names grounded, values `unverified`), binary `.DEFAULTS-8` decode (needs SDK). Fusion-first per CLAUDE-BRIEF CAM tier (Fusion > hyperMILL > Mastercam).

**Why:** a multi-session bulk-fill campaign sourced from PDFs would produce mostly `unverified` params or tempt hallucination — unsafe G-code, the one hard "never" for CAM. Surfacing the false premise (R7/R12) before any slot burns sessions is the responsible move.

**How to apply:** Phase 2 is ⏸ BLOCKED on operator green-light for which seat(s) to deploy the enumeration add-in against. Do NOT attempt grounded fill from local files. Punch list + full feasibility in `state/shared/specs/CAM-GALAXY-COMPLETENESS-AUDIT-2026-05-29.md` §"Phase 2 grounded-source FEASIBILITY (CORRECTION)" and the plan `H:/.claude/plans/rippling-inventing-hopper.md` §Phase 2. See [[reference_kilo_cam_catalog_query_2026_05_29]] · [[feedback_use_lima_pypdf_page_extractor]].
