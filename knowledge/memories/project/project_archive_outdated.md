---
name: PRISM archive is pre-PRISM outdated data
description: H:\PRISM_ARCHIVE_2026-02-01 contains 684 JS files from before PRISM was built — outdated, do not import or rely on.
type: project
---

`H:\PRISM_ARCHIVE_2026-02-01/EXTRACTED/` has 684 .js files (materials, machines, catalogs, engines, knowledge bases, formulas, algorithms) but this data is from BEFORE PRISM was built — it's super outdated.

**Why:** User explicitly stated this was pre-PRISM data. Current PRISM registries (MaterialRegistry 2,957 materials, ToolCatalogEngine 95K tools, MachineRegistry 910 machines) are the source of truth.

**How to apply:**
- Do NOT import archive JS files into current PRISM
- Do NOT use archive data for speed/feed calibration
- The 25 tool holder STEP files (BATCH 2) may still be useful for collision geometry — verify before using
- The machine simulation model folder structure (12 brands) could be useful as a template but folders are empty
- If user asks about archive, remind them it's outdated
