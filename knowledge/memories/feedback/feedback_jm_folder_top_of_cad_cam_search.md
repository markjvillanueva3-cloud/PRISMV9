---
name: feedback_jm_folder_top_of_cad_cam_search
description: "For ANY CAD/CAM file search (parts, prints, setups, fixtures, posts, programs, tool/machine models), search H:\\PRISM\\JM DIE FIRST. It is the canonical shop archive and CAM's primary directive is CAD/CAM files. Do NOT whole-tree recursive-search H:\\prism (it times out)."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.431Z
aliases: feedback_jm_folder_top_of_cad_cam_search
---


**Standing rule (operator directive, 2026-05-30):** `H:\PRISM\JM DIE` is **top of the search list** for every CAD/CAM file lookup — the CAM (kilo) / mill / lathe / wedm / blueprint primary directive is dealing with CAD/CAM files, and JM Die is the canonical shop archive (24,545 files, 100+ customers, the real parts/prints/fixtures/posts/programs/tool+machine models).

**Why:** This session I twice ran whole-`H:\prism` recursive ripgrep/Glob that TIMED OUT (20 s) hunting for a 5-axis setup file — when the file was in `H:\PRISM\JM DIE\OKUMA\SETUPS` all along. Searching the right root first is faster, finds the real shop assets (not stale repo copies), and matches the domain directive. Whole-tree H: search is the wrong reflex for CAD/CAM artifacts.

**How to apply (search order for CAD/CAM artifacts):**
1. **`H:\PRISM\JM DIE`** FIRST — scope to the relevant subfolder, never blind whole-tree:
   - `OKUMA\SETUPS\` — 5-axis fixtures + setup templates (`OKUMA MATE VISE SETUP FINAL.iam`, jaws, dovetail stock bottom, machine CAD).
   - `POST PROCESSORS\` — `.cps`/`.pst` posts (1.CONSOLIDATED, 2.PRISM ENHANCED\mill\{okuma,haas,hurco}).
   - `_PART LIBRARY\` — customer parts (.dxf/.STEP/.x_b/.SLDPRT).
   - `CNC MILL HAAS\` + `HURCO CNC PROGRAMS\` — mill program archives.
   - `MACHINE MODELS FOR LEARNING\`, `HAAS-HURCO\`, `WIRE EDM\`.
2. Then the repo `mcp-server/data/posts/`, `resources/CAD FILES`, engine corpus only if JM DIE misses.
3. Use targeted `Get-ChildItem <subdir> -Filter` / Glob on the specific subfolder — NOT recursive over all of `H:\prism` or all of `JM DIE` (24K files).

Pairs with the corpus-path atlases already in memory: [[reference_cam_corpus_locations]], [[reference_mill_domain_atlas_for_foxtrot_2026_05_27]], [[cad-corpus-paths]], [[reference_blueprint_ocr_cad_reading_atlas_2026_05_27]] — those map the paths; THIS rule says start there. Domain: kilo CAM galaxy + all machining/blueprint slots.
