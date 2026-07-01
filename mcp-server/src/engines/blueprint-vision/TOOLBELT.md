# Blueprint-Vision Galaxy — TOOLBELT (XRAY slot)

> Memoized tool-call patterns for slot:xray. Each entry saves tokens/time vs. the naive alternative. Built 2026-05-29.
> **Hard-won lesson:** recursive `**` Glob against `mcp-server/src/engines/` (3000+ files) TIMES OUT (>20s). Use bounded patterns or `find -maxdepth N`. See `## Glob patterns`.

## prism_* dispatcher actions used most (route BEFORE Grep — answers in one call)
- `prism_session:master_index_query keyword="<term>"` | ranked top-K vs 110K-node graph + wiki + memory | beats Grep for "where is X / what handles Y" (system-viz-first doctrine [[feedback_system_viz_first_audit]])
- `prism_cad:cad_pdf_blueprint_extract` | multi-page PDF blueprint → structured dims | the primary extraction entry, not a hand-rolled parse
- `prism_cad:cad_pdf_pattern_rescue_extract` | low-confidence pattern rescue | when cad_pdf_blueprint_extract confidence < threshold
- `prism_cad:cad_gdt_callout_parse` / `cad_gdt_parse_enhanced` / `cad_fcf_validate` | GD&T callout → FCF + datum-tie validate
- `prism_cad:cad_tolerance_stackup` / `cad_tolerance_fit_analyze` / `cad_tolerance_it_grade` | tolerance propagation
- `prism_cad:cad_dxf_geom_parse` · `cad_fcstd_parse` · `cad_f3d_parse` · `cad_stl_analyze` | native CAD per-format parse
- `prism_cad:feature_recognize` | feature recognition from extracted geometry
- `prism_business:blueprint_to_quote` | hand extraction → charlie's quote bridge
- `prism_cam:print_to_program_full` | hand extraction → kilo's CAM pipeline
- `prism_knowledge:tribal_capture {slot:'xray', tip, context, citation}` | record a domain learning (NEVER markdown-write to knowledge/tribal/)
- `prism_memory:semantic_search query="blueprint ocr ..." topK=20` | PULL from master brain (galaxy MEMORY.md High-ROI reconcile)

## Grep patterns
- `Grep pattern="cad_pdf_blueprint|cad_gdt|cad_tolerance" path=mcp-server/src/tools/dispatchers glob=*.ts output=content` | find the dispatcher case for a blueprint action | ~1-2 files
- `Grep pattern="class Blueprint\w+Engine" path=mcp-server/src/engines glob=*.ts output=files_with_matches` | enumerate real blueprint engine classes | ~14 files
- `Grep pattern="confidence" path=mcp-server/src/engines glob=Blueprint*.ts -n` | locate confidence-emission sites | targeted
- `Grep pattern="<sourceSHA>" path=state/shared glob=blueprint-*.jsonl` | dedup check before re-extracting | ledger hit/miss

## Glob patterns (NEVER use bare ** on engines/ — it times out)
- `Glob pattern="mcp-server/src/engines/Blueprint*.ts"` | all blueprint engines | ~14 files, fast
- `Glob pattern="mcp-server/src/engines/{PDF,DXF,FCStd,F3D,STL,GDT,Tolerance,OCR}*.ts"` | parser/OCR families | bounded, fast
- `Glob pattern="state/shared/blueprint-*.jsonl"` | extraction ledgers | ~6 files
- `Glob pattern="knowledge/wiki/{architecture,lessons}/*blueprint*.md"` | blueprint wiki leaves | bounded
- Fallback for deep trees: `Bash find <dir> -maxdepth 3 -name "<pat>"` (NOT recursive Glob)

## Bash one-liners (RTK-wrapped where applicable)
- `rtk git log --oneline -8 -- mcp-server/src/engines/blueprint-vision/` | galaxy history | ~60% vs raw
- `find "H:/PRISM/JM DIE/REVERSE ENGINEERING" -maxdepth 1 | wc -l` | corpus file count | avoids dumping 36 paths
- `node -e "const g=require('./state/shared/chat-slots.json');..."` | read JSON field | beats full-file Read
- `[ -f <engine-path> ] && echo EXISTS || echo MISSING` | verify an engine name before referencing (R8) | 1 line, prevents phantom refs
- PS5.1 stdout mangles control bytes — verify unicode/control via `node`, NOT the Read tool ([[feedback_read_tool_strips_control_chars]])

## Read offset+limit cheatsheet (big files — never full-read)
- `state/shared/blueprint-extraction-deep-reason-2026-05-24.jsonl` | 24.5MB | NEVER full-read — `Grep` for the SHA/PN, or `Bash head`/`wc -l`
- `mcp-server/data/state/extraction-log.json` | 54.6KB | Read with `offset/limit` or `prism_session:master_index_query`
- `mcp-server/data/state/cad-cam-resources-pdf-index.json` | 1MB | query, never full-read
- `reference_blueprint_ocr_cad_reading_atlas_2026_05_27.md` | 21KB | the anchor — read once, then rely on MEMORY.md High-ROI pointers

## git common commands (RTK-wrapped; commit from H:/prism with [MAIN] prefix)
- `rtk git status` · `rtk git add mcp-server/src/engines/blueprint-vision/` · `rtk git commit -m "[MAIN] [BLUEPRINT-VISION]/U-BV-<id>: <N> prints from <source> (slot:xray)"`
- Galaxy + buildout commits ride the shared tree → `[MAIN]` prefix ([[feedback_commit_prefix_main_on_shared_tree]]); never `git stash` in the shared tree ([[feedback_no_git_stash_shared_tree]]).

## Extraction workflow (the canonical pipeline order)
1. `[ -f <src> ]` + source-SHA dedup vs `state/shared/blueprint-accuracy-events.jsonl`.
2. Multi-print? → `python scripts/extract-jm-die-corpus-page-by-page.py` (split first).
3. Per print: `prism_cad:cad_pdf_blueprint_extract` (raster) OR `cad_dxf_geom_parse`/`cad_step_parse_file` (vector/native).
4. Low confidence → `cad_pdf_pattern_rescue_extract` or vision-LLM (`scripts/lib/ollama-vision-extract-lib.mjs`).
5. GD&T → `cad_gdt_callout_parse` + `cad_fcf_validate` (datum-tie). Tolerances → `cad_tolerance_*`. Normalize mm.
6. Cross-check geometry volume vs file size (silent-empty-parse guard).
7. Emit per-field confidence → downstream (`blueprint_to_quote` / `print_to_program_full`) → ledger entry.

— Built 2026-05-29 by slot:xray (PER-SLOT-GALAXY-BUILDOUT).

<!-- OPERATIONAL-CONTEXT (auto-wired by scripts/wire-galaxies-to-operational-context.mjs -- regenerate, do not hand-edit) -->
## OPERATIONAL CONTEXT (PC specs / Ollama / loops / vault / LoRA-CAG-RAG -- auto-wired)
- **Hardware (size every build to it):** RTX PRO 6000 Blackwell 96GB VRAM, Ryzen 9 9950X3D 32T, ~127GB RAM. Canonical: `state/shared/specs/CANONICAL-HOST-FACTS-2026-06-09.md` (cite, do not restate -- it drifts otherwise).
- **Ollama utilization (offload here; reserve Claude for deep reasoning + safety):** code explain/review/lint -> `qwen2.5-coder:32b`; deep local reasoning -> `gpt-oss:120b` (65GB, fits resident on the 96GB card); trivial -> `qwen2.5-coder:1.5b`. Full roster + when-to-use each tier: [[prism-methodology-foundations]] section 1.
- **How to run loops:** [[agent-loop-design-rules]] (CLOSED-loop, eval-gate every iter, each pass feeds the next, BUDGET is a stop condition). **Obsidian vault (PSN brain):** [[feedback-obsidian-brain]] (recall before re-deriving; auto-fed every Stop). **Harnesses / LoRA / CAG / RAG:** [[prism-methodology-foundations]] (orchestrator/specialist/subagent split; arXiv-grounded).
- **Tool stack + on-disk versions (tool upgrades / features):** multi-VLM OCR ensemble (qwen3-vl / qwen2.5vl / llama3.2-vision), Docustrata index, pypdf/Tesseract. Live corpus + versions: [[primary-domain-resource-map]] (keep-fresh cadence there).
- **This domain's knowledge layers (auto-invoked via wiki-precheck-inject when relevant):** [[blueprint-vision-foundations]] / [[blueprint-vision-source-atlas]] / [[blueprint-vision-applied-practice]] / [[blueprint-vision-advanced-techniques]].
- **This domain's local resource trove (resources/ + JM DIE/ subdirs, easy access):** [[primary-domain-resource-map]] (owner: xray).
<!-- /OPERATIONAL-CONTEXT -->
