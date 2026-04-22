# Resource Census Registry

Generated: 2026-03-30
Task anchor: `SQ2-0-CENSUS`
Roadmap anchors:
- `H:\PRISM\mcp-server\data\docs\roadmap\ULTIMATE-PRISM-ROADMAP-v25.md`
- `H:\PRISM\mcp-server\data\docs\roadmap\RESOURCE-LEARNING-HARDENING-ROADMAP.md`

## Scope

This registry is the first `LR-0` baseline for the side quest `SQ2: The Library`.
It inventories the three canonical resource reservoirs called out by the roadmap:

- active PRISM surfaces on `H:\PRISM`
- archive resources on `H:\PRISM_ARCHIVE_2026-02-01`
- user Box resources on `C:\Users\Mark Villanueva\Box\PRISM`

Counts below are live filesystem counts from the current machine, not copied roadmap estimates.

## Global Summary

- Reservoir groups scanned: `19`
- Total files surfaced: `18,944`
- PDF files surfaced: `2,519`
- Source video files surfaced: `4`
- CAD/model files surfaced: `403`
- Important nuance: several "PDF" or "course" corpora are mixed packages containing `json`, `html`, `js`, captions, and zip payloads in addition to PDFs.

## Location Summary

| Location | Corpus Count | Total Files | PDF Files | Source Videos | CAD Files |
| --- | ---: | ---: | ---: | ---: | ---: |
| Active (`H:\PRISM`) | 4 | 787 | 151 | 0 | 0 |
| Archive (`H:\PRISM_ARCHIVE_2026-02-01`) | 7 | 4,226 | 817 | 2 | 25 |
| Box (`C:\Users\Mark Villanueva\Box\PRISM`) | 8 | 13,931 | 1,551 | 2 | 378 |
| Total | 19 | 18,944 | 2,519 | 4 | 403 |

## Corpus Registry

| Corpus | Path | Category | Live Count | Signal | Extraction Status | Likely Consumers | Priority |
| --- | --- | --- | ---: | --- | --- | --- | --- |
| `active_resource_pdfs` | `H:\PRISM\RESOURCE PDFS` | pdf corpus | 594 | `113 pdf`, `99 json`, `98 html`, `90 zip` | mixed raw + packaged | document learning, formula extraction, learning UI | high |
| `active_manufacturer_catalogs` | `H:\PRISM\MANUFACTURER_CATALOGS` | catalog corpus | 116 | `38 pdf` dominant | raw catalog pack | calculator, quoting, tooling rules | high |
| `active_machine_handbooks` | `H:\PRISM\mcp-server\data\machine-handbooks` | handbook corpus | 8 | `8 json` structured handbooks | extracted structured | diagnosis, machine setup, machine live, handbook registry | highest |
| `active_video_learned` | `H:\PRISM\mcp-server\data\video-learned` | video corpus | 69 | `53 srt`, `16 json` | extracted transcripts + metadata | video learning, learning UI, promotion queue | high |
| `archive_mit_courses` | `H:\PRISM_ARCHIVE_2026-02-01\RESOURCES\MIT COURSES` | course corpus | 1,081 | `227 zip`, `196 pdf`, `125 vtt`, `106 json` | raw mixed course pack | training modules, formulas, algorithms, learning UI | highest |
| `archive_resource_pdfs` | `H:\PRISM_ARCHIVE_2026-02-01\RESOURCES\RESOURCE PDFS` | pdf corpus | 3,004 | `750 json`, `730 html`, `583 pdf`, `112 zip` | raw mixed reference pack | document learning, formula extraction, process rules | highest |
| `archive_manufacturer_catalogs` | `H:\PRISM_ARCHIVE_2026-02-01\RESOURCES\MANUFACTURER_CATALOGS` | catalog corpus | 116 | `38 pdf` dominant | raw catalog pack | tooling rules, quoting, calculator | medium |
| `archive_machine_models` | `H:\PRISM_ARCHIVE_2026-02-01\RESOURCES\MACHINE_SIMULATION_MODELS` | machine model corpus | 0 | directory exists, no files surfaced | empty or unsynced | simulation, machine capability, digital twin | investigate |
| `archive_generic_machine_models` | `H:\PRISM_ARCHIVE_2026-02-01\RESOURCES\GENERIC_MACHINE_MODELS` | machine model corpus | 0 | directory exists, no files surfaced | empty or unsynced | simulation, machine capability, learning assets | investigate |
| `archive_tool_holder_models` | `H:\PRISM_ARCHIVE_2026-02-01\RESOURCES\TOOL_HOLDER_CAD_FILES` | holder model corpus | 25 | `25 cad` | raw CAD corpus | holder-tool compatibility, setup planning | medium |
| `archive_cad_files` | `H:\PRISM_ARCHIVE_2026-02-01\RESOURCES\CAD_FILES` | cad corpus | 0 | directory exists, no files surfaced | empty or unsynced | geometry ingestion, simulation | investigate |
| `box_mit_courses` | `C:\Users\Mark Villanueva\Box\PRISM\MIT COURSES` | course corpus | 7,436 | `1822 json`, `1697 html`, `734 pdf`, `373 vtt` | raw mixed course pack | training modules, formulas, algorithms, learning UI | highest |
| `box_resource_pdfs` | `C:\Users\Mark Villanueva\Box\PRISM\RESOURCE PDFS` | pdf corpus | 6,070 | `1188 json`, `1118 html`, `815 pdf`, `191 vtt` | raw mixed reference pack | document learning, formula extraction, process rules | highest |
| `box_manufacturer_catalogs` | `C:\Users\Mark Villanueva\Box\PRISM\MANUFACTURER_CATALOGS` | catalog corpus | 0 | path exists, no files surfaced | empty or unsynced | tooling rules, quoting, sourcing | investigate |
| `box_machine_models` | `C:\Users\Mark Villanueva\Box\PRISM\MACHINE MODELS FOR LEARNING ENGINE AND SIMULATION` | machine model corpus | 272 | `234 step`, `37 zip` | raw CAD corpus | simulation, machine capability, digital twin | highest |
| `box_tool_holder_models` | `C:\Users\Mark Villanueva\Box\PRISM\TOOL HOLDER MODELS FOR LEARNING ENGINE` | holder model corpus | 113 | `110 cad` | raw CAD corpus | holder-tool compatibility, setup planning | high |
| `box_part_models` | `C:\Users\Mark Villanueva\Box\PRISM\PART MODELS FOR LEARNING ENGINE` | part model corpus | 33 | `32 cad` | raw CAD corpus | part similarity, training modules, learning engine | high |
| `box_fixture_catalogs` | `C:\Users\Mark Villanueva\Box\PRISM\WORKHOLDING AND FIXTURE CATALOGS` | fixture corpus | 0 | vendor directories exist, no files surfaced | directory-only or unsynced | workholding selection, setup planning | investigate |
| `box_training_videos` | `C:\Users\Mark Villanueva\Box\PRISM\PRISM CAD-CAM TRAINING` | video corpus | 7 | `2 pdf`, `2 cad`, `0 source video` | mixed seed pack, not yet validated as video corpus | training pipeline, learning UI | low |

## Canonical Interpretation

- Treat `machine-handbooks` and `video-learned` as already-extracted corpora that need consumer wiring and provenance cleanup, not bulk raw ingestion.
- Treat the large `MIT COURSES` and `RESOURCE PDFS` reservoirs in Archive and Box as the main raw acquisition backlog for `SQ2-1` and later waves.
- Treat the CAD/model corpora in Box as the main simulation and geometry backlog for machine, holder, and part learning.
- Treat zero-file or directory-only corpora as sync or provenance gaps until proven otherwise.

## First-Pass Observations

- The active and archive manufacturer catalog corpora are now confirmed as a mirror candidate: `116/116` filenames match, `116/116` filename-plus-byte-length pairs match, and sample SHA-256 spot checks matched on representative files. See `MANUFACTURER_CATALOG_DEDUP_2026-03-30.md`.
- The active video reservoir currently exposes transcripts and JSON metadata, not source video binaries.
- The Box reservoirs are much larger than the active and archive surfaces and should be treated as the dominant raw backlog for `SQ2`.
- The roadmap's older rough counts understated the current size of the live Box course and PDF corpora on this machine.

## Follow-On Artifacts

- `H:\PRISM\state\shared\RESOURCE_CENSUS_REGISTRY_2026-03-30.json`
- `H:\PRISM\state\shared\RESOURCE_REGISTRY_SCHEMA_2026-03-30.md`
- `H:\PRISM\state\shared\MANUFACTURER_CATALOG_DEDUP_2026-03-30.md`
- `H:\PRISM\state\shared\SQ2_1_STARTER_BACKLOG_2026-03-30.md`
