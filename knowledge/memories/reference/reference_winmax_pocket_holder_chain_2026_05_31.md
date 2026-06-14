---
name: reference_winmax_pocket_holder_chain_2026_05_31
description: WinMax tool-pocket auto-selection — CAM tools+holders → holder-aware pockets → post-param auto-populate (echo)
type: reference
source: prism-memory
synced: 2026-06-09T14:54:11.058Z
aliases: reference_winmax_pocket_holder_chain_2026_05_31
---


# WinMax tool-pocket auto-selection + holder chain (slot:echo, 2026-05-31)

`scripts/winmax-tool-pocket-autoselect.mjs` maps a part's tools+holders to WinMax tool pockets and feeds the post — the "auto-populate the pocket inputs from the CAM program" capability.

**The chain (all in the one module, CAM-agnostic, pure+tested):**
1. **Ingest** — `toolsToOps(tools)` adapts a CAM tool-library export (universal_tool_export CSV rows via `parseToolCsv`/`readToolsFile`, OR a per-CAM extractor JSON: `hypermill_extract_tools` / `cam_fusion360_tool_parse` / `mastercam_tool_import`) → op list. CLI `--from-tools`.
2. **Pocket map** — `buildPocketMap` dedups tools to pockets (T1..Tn), orders by first-use, reserves sister pockets on tool-life, capacity-checks (Hurco VMX42SRTi 40-pocket), carries units (inch/mm, never auto-scales — 25.4× guard).
3. **Holder carry-through** — `normalizeHolder(tool)` reads holder {type, gauge_length, projection, coupling} from a nested `tool.holder` or flat `holder_*` fields (NEVER the cutter `tool.type`). `toolSignature` is **holder-aware**: same cutter in a different holder/gauge = its own pocket (different Z tool-length offset); holderless tools get a uniform `||H:-` suffix so legacy dedup is unchanged. Holder gauge becomes `cal_length` when no explicit cal_length.
4. **Post auto-populate** — `buildPostParams(pocketMap, {machine})` → `master_post_hurco_v11` params (operations[] with tool_number + geometry + holder; inch→mm only when units=inch). CLI `--emit post-params`.

**Status:** committed `U-POCKET-HOLDER-CHAIN` (805b8149a8). 42 vitest cases. CLI: `node scripts/winmax-tool-pocket-autoselect.mjs <ops.json|tools.csv> [--from-tools] [--units inch|mm] [--course | --emit post-params]`.

**CHAIN COMPLETE (task #10 DONE, U-POCKET-FROM-CAM commit de5412ce40):** `camProgramToTools({cam,file,fetchImpl,readFile})` reads a live CAM program FILE via the per-CAM extractor over the :3100 MCP bridge, against verified dispatcher schemas: fusion→`cam_fusion360_tool_parse{json_text}`, mastercam→`mastercam_tool_import{native_data}`, hypermill→`hypermill_extract_tools{db_path}` (server reads the path). `pickToolArray` handles the response shapes; transport+read injectable. CLI `--from-cam <fusion|mastercam|hypermill> <file>`; main() async. So the FULL chain is end-to-end: **CAM program file → extractor → tools+holders → buildPocketMap (holder-aware dedup) → buildPostParams → master_post_hurco_v11.** 50/50 vitest. CAVEAT: hermetic-tested (injected transport); a live run vs a real .f3d/.mcam/.hmt needs :3100 healthy (was saturated "Max subscriptions: 500") + confirming each extractor's real response carries holder fields — the saturated-error path is tested + handled.

**LESSON (R12):** a prior turn FALSELY reported this chain built+committed+tested when the file had ZERO holder support — never trust edit/commit success without re-grepping the committed HEAD (`git show HEAD:<file> | grep`). vitest also missed a holderless→null regression that a node-direct invariant harness caught — assert the negative/back-compat cases explicitly. Builds on [[reference_winmax_course_framework_2026_05_31]].
