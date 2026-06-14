---
name: reference_mike_wedm_archive_composition_data_gap_2026_05_29
description: JM Die WIRE EDM archive is 98% binary Mastercam .MCX — only ~22 NC programs; print→wire-program LoRA training data is gated by .MIN-macro + .MCX readers, NOT by code
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.213Z
aliases: reference_mike_wedm_archive_composition_data_gap_2026_05_29
---


# JM Die WIRE EDM archive composition + print→wire-program training-data gap (slot:mike, 2026-05-29)

**Empirically measured this session** by running the full WEDM LoRA dataset build (`WEDMLoRADatasetBuilderEngine.build()`) over the real archive via `scripts/run-wedm-lora-dataset-build.ts` (tsx, standalone — MCP was down).

## The archive is NOT 4058 NC programs
`H:/PRISM/JM DIE/WIRE EDM` has 4058 *files*, but by extension:
- **2191 `.mcx-8` + 1779 `.mcx` = 3970 (98%) binary Mastercam CAM files** (`file` → `data`; NOT text, NOT G-code). The CAD/CAM *source*, not posted NC.
- **19 `.min`** (Mitsubishi WEDM programs), **3 `.nc`** (standard), **1 `.dat`**, 28 `.esp`, 14 `.zip`, misc.
- The engine's default path `CNC WIRE EDM` does NOT exist — must pass `basePath: "H:/PRISM/JM DIE/WIRE EDM"` (the engine's `JM_DIE_WEDM_PATH_ALT`).

## What the pipeline produced (proven E2E on real data — RGS-MS1 lesson satisfied)
`scanArchive` matched 23 program-extension files → **6 parsed → 10 deterministic Alpaca examples** (train 6 / val 0 / test 4; seed 42; stratify=operation). Tribal injected (36 tips from the 145-tip pool), physics provenance present, dialect detection correct (`NOZE TEST.NC → Mitsubishi taper_uv`). Output: `mcp-server/data/training/wedm-lora/wedm_lora_{train,val,test}.jsonl`. **The substrate works; this is the honest result, not a failure of the code.**

## The two DATA-VOLUME gaps (the real answer to "do we have everything to train print→wire-program?")
1. **`.MIN` Mitsubishi macro-language parser** — 17/23 files skipped (`parseProgram` returns null when `detectedOps.size===0`). Two `.MIN` sub-formats coexist: G-code-ish `.MIN` (3024402-P1.MIN etc. — parse OK) vs figure/macro-language `.MIN` (`$PC12-12.MIN%`, `DEF WORK`, `PS LC,[...]`, `/CALL OBAR` — fail). A macro parser unlocks ~16 more programs.
2. **`.MCX` Mastercam binary extractor** — where 98% of the volume lives. Needs Mastercam (or a `.mcx` reader / operator-exported posted-NC) to extract geometry+toolpaths. Until then the archive's print→program signal is locked in binary CAM files.

## Verdict
**Code = ready (16-engine LoRA stack, 26 dispatcher actions, e2e green). Data = tiny (~10 examples) until the .MIN-macro parser + .MCX path exist.** Augmentation (`WEDMPrintProgramAlpacaAugmenter` iter23 + curriculum) multiplies a base set but ≠ a robust corpus from 10 seeds. Highest-ROI next step for real training volume: the `.MIN` macro parser (cheap, ~4× programs) then the Mastercam `.MCX`/posted-NC path (the 3970-file motherlode). See [[reference_wire_domain_atlas_for_mike_2026_05_27]] and `engines/wedm/PATHS.md` §D. india owns the GPU train run; mike owns the data ingestion.
