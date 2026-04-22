# SQ2 Side-Quest Roadmap - 2026-03-30

## Purpose

Convert the existing SQ2 census work into a dependency-ordered promotion roadmap so Codex and Claude can resume without drift after runtime recovery.

## Current Verified Position

- `SQ2-0-CENSUS` has produced a canonical resource census registry and schema.
- Manufacturer catalog dedup is complete enough to avoid dual-ingesting active and archive mirrors.
- Wave B1 bucket manifests are complete for:
  - `archive_resource_pdfs/18.03-spring-2010`
  - `box_resource_pdfs/6.006-spring-2020`
  - `archive_resource_pdfs/3.012-fall-2005`
  - `box_resource_pdfs/6.046j-spring-2015`
- Descriptor-row inventories exist for all four buckets.
- Batch promotion queues are prepared:
  - `Batch 1`: `18.03` + `6.006`
  - `Batch 2`: `3.012` + `6.046J`
- Machine handbook JSON exposure mapping is started and should be treated as a consumer-readiness lane rather than a raw-extraction lane.

## Working Rule

Stay on the SQ2 side-quest path the user explicitly requested, but keep the work tightly scoped:

- finish prepared batches before opening new reservoirs
- prefer promotion-ready primary assets over derivative caption or transcript files
- treat shared PRISM state as canonical until helper/runtime health returns

## Roadmap Waves

### Wave C1: Batch 1 Promotion

Source queues:

- `SQ2_BATCH1_PRIMARY_CANDIDATES_2026-03-30`

Deliverables:

- `SQ2_BATCH1_PROMOTION_LOG_2026-03-30.md`
- `SQ2_BATCH1_PROMOTION_LOG_2026-03-30.json`

Requirements:

- promote the first 40 primary assets from `18.03` and `6.006`
- record source bucket, descriptor path, normalized title, asset class, derivative status, and recommended destination family
- explicitly exclude transcript-PDF and caption derivatives from primary promotion counts
- note any malformed descriptors or missing payload links as promotion blockers

Definition of done:

- 40 assets classified and logged
- blockers isolated into a follow-up list instead of blocking the whole batch

### Wave C2: Handbook Consumer Readiness

Source queue:

- `SQ2_MACHINE_HANDBOOK_EXPOSURE_MAP_2026-03-30`

Deliverables:

- `SQ2_HANDBOOK_CONSUMER_MATRIX_2026-03-30.md`
- `SQ2_HANDBOOK_CONSUMER_MATRIX_2026-03-30.json`

Requirements:

- map each handbook JSON to its current and missing consumer surfaces
- identify whether each item is exposed through commands, search/index, UI, or only raw state
- mark the smallest useful next action for each handbook item

Definition of done:

- every handbook JSON has a single next consumer action
- any missing validation or discovery surface is named explicitly

### Wave C3: Batch 2 Promotion

Source queues:

- `SQ2_BATCH2_PRIMARY_CANDIDATES_2026-03-30`

Deliverables:

- `SQ2_BATCH2_PROMOTION_LOG_2026-03-30.md`
- `SQ2_BATCH2_PROMOTION_LOG_2026-03-30.json`

Requirements:

- promote the first 40 primary assets from `3.012` and `6.046J`
- preserve separation between direct instructional documents and video-derived assets
- surface any bucket-specific normalization quirks for later automation

Definition of done:

- 40 assets classified and logged
- repeated normalization patterns called out for automation

### Wave D1: Reservoir Expansion

Only begin after Waves C1-C3 have at least starter outputs.

Candidate continuation:

- repeat the manifest -> descriptor rows -> primary candidate queue pipeline on the next two highest-value reservoirs
- prioritize buckets with strong primary document density and low derivative noise

## Current Blockers

- local PowerShell runtime is failing with `8009001d`, so helper-driven sync and extraction work cannot currently run from this Codex thread
- MCP resources are not attached in this thread yet
- queue helper writes and roadmap helper writes should resume after runtime recovery

## Resume Order After Runtime Recovery

1. confirm shell and MCP health
2. refresh shared startup and task-queue posture
3. execute Wave C1 first
4. execute Wave C2 second if Batch 1 promotion is blocked on runtime-sensitive extraction
5. execute Wave C3 before opening new raw reservoirs

## Coordination Note

Until the runtime is healthy again, this roadmap file is the canonical SQ2 continuation note for this Codex thread.
