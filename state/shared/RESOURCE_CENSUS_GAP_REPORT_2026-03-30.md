# Resource Census Gap Report

Generated: 2026-03-30
Depends on: [RESOURCE_CENSUS_REGISTRY_2026-03-30.md](H:\PRISM\state\shared\RESOURCE_CENSUS_REGISTRY_2026-03-30.md)

## Key Findings

1. No canonical shared resource registry existed for `SQ2` on this machine before this pass.
   The roadmap named the reservoirs, but not their live counts, mixed formats, or actual extraction posture.

2. The main PDF and course reservoirs are mixed corpora, not pure document buckets.
   Archive and Box reservoirs contain substantial `json`, `html`, `js`, caption, and zip payloads alongside PDFs, so `SQ2-1` must normalize package structure before assuming "one file = one document".

3. The active video corpus is already transcript-heavy and source-video-light.
   `H:\PRISM\mcp-server\data\video-learned` currently surfaces `53` subtitle files and `16` JSON files, but no source video binaries in the first pass.

4. Several roadmap-listed reservoirs exist as directories with zero surfaced files.
   This currently applies to:
   - `H:\PRISM_ARCHIVE_2026-02-01\RESOURCES\MACHINE_SIMULATION_MODELS`
   - `H:\PRISM_ARCHIVE_2026-02-01\RESOURCES\GENERIC_MACHINE_MODELS`
   - `H:\PRISM_ARCHIVE_2026-02-01\RESOURCES\CAD_FILES`
   - `C:\Users\Mark Villanueva\Box\PRISM\MANUFACTURER_CATALOGS`

5. The Box fixture corpus is only partially present locally.
   Vendor directories are visible under `C:\Users\Mark Villanueva\Box\PRISM\WORKHOLDING AND FIXTURE CATALOGS`, but no files surfaced in the first census pass.

6. Active and archive manufacturer catalog corpora appear duplicated at the top-line count level.
   Both currently show `116` total files and `38` PDFs, so `SQ2-1` should include dedup before extraction promotion.

7. The Box training corpus is mislabeled or incomplete for a "video" reservoir.
   `C:\Users\Mark Villanueva\Box\PRISM\PRISM CAD-CAM TRAINING` surfaced only `7` files in the first pass, including PDFs and CAD assets, but no source video files.

8. Structured handbook assets are present, but downstream consumer completeness is still unclear.
   The live repo contains `8` structured handbook JSON files, which means the main remaining gap is consumer exposure and promotion logic rather than raw acquisition.

## Gaps Blocking Clean SQ2-1 Execution

- No shared schema yet for `extraction_status`, `validation_state`, and `consumer_tags`
- No dedup policy yet across active/archive/Box mirrors
- No canonical rule yet for distinguishing raw source assets from already-extracted derivatives
- No sync verification yet for empty or directory-only Box/Archive corpora

## What Is Now Unblocked

- `SQ2-0` now has a live baseline registry instead of rough roadmap estimates
- `SQ2-1` can begin with ordered backlog slices instead of broad corpus hunting
- Consumer mapping can start from explicit corpus tags instead of implied folder names

## Recommended Next Fixes

1. Define a minimal canonical schema for each resource row:
   - `resource_id`
   - `path`
   - `corpus`
   - `category`
   - `provenance`
   - `extraction_status`
   - `validation_state`
   - `consumer_tags`

2. Run a dedicated dedup pass for:
   - active vs archive manufacturer catalogs
   - archive vs Box MIT courses
   - archive vs Box resource PDF corpora

3. Resolve sync truth for the empty or directory-only reservoirs before treating them as genuinely empty knowledge domains.

4. Promote the structured handbook and transcript reservoirs into the same canonical registry model so raw and derived assets share one spine.
