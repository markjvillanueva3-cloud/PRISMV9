# SQ2 Wave B1 Asset Manifest Starter

Generated: 2026-03-30
Task anchor: `SQ2-0-CENSUS`
Wave anchor: `U-CENSUS1-B`
Depends on:
- `H:\PRISM\state\shared\SQ2_WAVE_B1_BUCKET_MANIFESTS_2026-03-30.md`
- `H:\PRISM\state\shared\RESOURCE_REGISTRY_SCHEMA_2026-03-30.md`

## Purpose

This is the first asset-level normalization pass for the two highest-priority `Wave B1` buckets.
It does not enumerate every single asset row yet; instead, it establishes the descriptor mix, derivative rules, and primary-vs-derived boundaries needed for `SQ2-1`.

## Bucket: `archive_resource_pdfs/18.03-spring-2010`

### Descriptor Summary

- Resource descriptors surfaced: `343`
- Resource type mix:
  - `213` `Document`
  - `32` `Video`
  - `34` `Image`
  - `64` `Other`
- Payload linkage:
  - `311` descriptors have direct `file`
  - `32` descriptors have `captions_file`
  - `32` descriptors have `transcript_file`
  - `32` descriptors have `archive_url`

### Primary vs Derived Split

- Primary document descriptors: `181`
  Rule: `Document` rows excluding `title = 3play pdf file`
- Primary video descriptors: `32`
- Primary image descriptors: `34`
- Derived transcript PDF descriptors: `32`
  Rule: `title = 3play pdf file`
- Derived caption descriptors: `64`
  Rule: `title = 3play caption file`

### Dominant Learning-Type Families

- `45` `Problem-solving Notes`
- `37` `Lecture Notes`
- `32` `Lecture Videos`
- `12` `Problem Sets`
- `9` `Problem Sets; Problem Set Solutions`
- `10` exam-family rows (`7` `Exams`, `3` `Exams with Solutions`)

### Representative Primary Assets

- Document: `MIT18_031S10_chapter_25.pdf`
- Document: `Lecture Video Correlation Table`
- Video: `Lecture 19: Introduction to the Laplace Transform`
- Video: `Lecture 25: Homogeneous Linear Systems with Constant Coefficients`

### Normalization Decision

1. Treat `3play pdf file` rows as derived transcript assets linked to the corresponding video descriptor.
2. Treat `3play caption file` rows as derived caption assets, not primary course documents.
3. Preserve exam, recitation, reading, and lecture-note PDFs as primary extraction targets.

## Bucket: `box_resource_pdfs/6.006-spring-2020`

### Descriptor Summary

- Resource descriptors surfaced: `224`
- Resource type mix:
  - `123` `Document`
  - `32` `Video`
  - `2` `Image`
  - `67` `Other`
- Payload linkage:
  - `195` descriptors have direct `file`
  - `32` descriptors have `captions_file`
  - `32` descriptors have `transcript_file`
  - `29` descriptors have `archive_url`

### Primary vs Derived Split

- Primary document descriptors: `95`
  Rule: `Document` rows excluding `title = 3play pdf file`
- Primary video descriptors: `32`
- Primary image descriptors: `2`
- Primary non-caption `Other` descriptors: `7`
  These include template-style assets such as `Problem Set 3 Template`, `Problem Set 4 Template`, and `Problem Set 5 Template`.
- Derived transcript PDF descriptors: `28`
  Rule: `title = 3play pdf file`
- Derived caption descriptors: `60`
  Rule: `title = 3play caption file`

### Dominant Learning-Type Families

- `36` `Problem-solving Notes`
- `24` `Lecture Videos`
- `20` `Lecture Notes`
- `16` `Problem Sets`
- `9` `Problem Sets; Problem Set Solutions`
- `14` exam-family rows (`7` `Exams`, `7` `Exams with Solutions`)

### Representative Primary Assets

- Document: `Problem Set 3`
- Document: `Problem Set 4 Solutions`
- Video: `Lecture 15: Dynamic Programming, Part 1: SRTBOT, Fib, DAGs, Bowling`
- Other: `Problem Set 5 Template`

### Normalization Decision

1. Treat `3play pdf file` rows as derived transcript PDFs linked to video descriptors.
2. Treat `3play caption file` rows as derived caption assets.
3. Keep non-caption `Other` rows as primary supplemental assets because they include assignment and problem-set templates.
4. Prioritize lecture, problem-set, quiz-review, and problem-session assets for promotion candidates.

## Shared Asset Rules For Both Buckets

1. `resource_type = Video` defines the primary packaged video descriptor row.
2. `title = 3play pdf file` means transcript derivative, not primary document.
3. `title = 3play caption file` means caption derivative, not primary knowledge row.
4. `resource_type = Document` and non-3play title means primary extractable document.
5. Non-caption `Other` rows require case-by-case promotion and should not be dropped automatically.

## Next Extraction Step

The next bounded `SQ2` move should be machine-readable per-descriptor manifests for:

1. `archive_resource_pdfs/18.03-spring-2010`
2. `box_resource_pdfs/6.006-spring-2020`

Those manifests should output one normalized row per `resources/*/data.json` descriptor, plus derived linkage to transcript and caption payloads.
