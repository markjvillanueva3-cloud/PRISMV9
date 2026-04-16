# SQ2 Wave B1 Bucket Manifests

Generated: 2026-03-30
Task anchor: `SQ2-0-CENSUS`
Wave anchor: `U-CENSUS1-B`
Schema reference:
- `H:\PRISM\state\shared\RESOURCE_REGISTRY_SCHEMA_2026-03-30.md`

## Purpose

These are the first normalized bucket manifests for `SQ2-1`.
They capture the two highest-priority `Wave B1` buckets as structured course-site exports, not loose PDF folders.

## Bucket: `archive_resource_pdfs/18.03-spring-2010`

### Identity

- Path: `H:\PRISM_ARCHIVE_2026-02-01\RESOURCES\RESOURCE PDFS\18.03-spring-2010`
- Provenance: `archive`
- Course title: `Differential Equations`
- Course number: `18.03`
- Term: `Spring 2010`
- Topics: `Mathematics > Differential Equations`, `Mathematics > Linear Algebra`
- Learning resource types: `Lecture Videos`, `Lecture Notes`, `Problem Sets`, `Problem Set Solutions`

### Bucket Metrics

- Total files: `1273`
- Total size: `114.6 MB`
- Content-map entries: `354`
- Resource directories: `354`
- Video gallery directories: `1`
- Existing derived metadata: `COURSE_SKILL_PROPOSAL.json` present

### Extension Mix

- `374 json`
- `369 html`
- `213 pdf`
- `79 js`
- `64 vtt`
- `32 srt`
- `35 jpg`

### Page Sections

- `assignments`
- `calendar`
- `exams`
- `lecture-notes`
- `mathlets`
- `readings`
- `recitations`
- `syllabus`

### Layout Interpretation

1. Root control-plane files:
   - `data.json`
   - `content_map.json`
   - `index.html`
   - `sitemap.xml`
2. `pages/*/data.json` files describe section-level navigation and should be preserved as section metadata.
3. `resources/*/data.json` files act like normalized resource descriptors and should become asset rows.
4. `static_resources/*.pdf`, `*.vtt`, and `*.srt` are the extractable payload layer.
5. `download.zip` and `static_resources.zip` are packaging wrappers and should be marked as provenance artifacts, not primary extraction sources when unpacked content is already present.
6. `COURSE_SKILL_PROPOSAL.json` is prior derived analysis and should be retained as derivative provenance instead of being treated as a source document.

### Consumer / Tag Posture

- Suggested consumer tags:
  - `math-foundations`
  - `differential-equations`
  - `linear-algebra`
  - `controls-prereq`
  - `learning-ui`
- Suggested format families:
  - `course-export`
  - `resource-metadata`
  - `document`
  - `transcript`
  - `video-caption`

### First Extraction Targets

- lecture-note PDFs
- problem-set PDFs and solution PDFs
- recitation materials
- exam materials
- section metadata from `pages/*`

## Bucket: `box_resource_pdfs/6.006-spring-2020`

### Identity

- Path: `C:\Users\Mark Villanueva\Box\PRISM\RESOURCE PDFS\6.006-spring-2020`
- Provenance: `box`
- Course title: `Introduction to Algorithms`
- Course number: `6.006`
- Term: `Spring 2020`
- Topics:
  - `Engineering > Computer Science > Algorithms and Data Structures`
  - `Engineering > Computer Science > Theory of Computation`
  - `Mathematics > Computation`
- Learning resource types: `Lecture Videos`, `Exams with Solutions`, `Lecture Notes`, `Problem Sets`, `Problem Set Solutions`

### Bucket Metrics

- Total files: `922`
- Total size: `121.2 MB`
- Content-map entries: `237`
- Resource directories: `239`
- Video gallery directories: `1`
- Existing derived metadata: no `COURSE_SKILL_PROPOSAL.json` surfaced at root

### Extension Mix

- `251 json`
- `247 html`
- `126 pdf`
- `79 js`
- `65 vtt`
- `33 srt`
- `11 zip`

### Page Sections

- `assignments`
- `calendar`
- `lecture-notes`
- `practice-problems`
- `quizzes`
- `resource-index`
- `syllabus`

### Layout Interpretation

1. Root control-plane files:
   - `data.json`
   - `content_map.json`
   - `index.html`
   - `sitemap.xml`
2. `pages/*/data.json` files define section metadata and queue structure.
3. `resources/*/data.json` files describe individual lecture, review, problem-session, quiz, and transcript assets and should become asset rows.
4. `static_resources/*.pdf`, `*.vtt`, `*.srt`, and related media-support files are the extractable payload layer.
5. Root zip artifacts are provenance wrappers unless they expose content that is missing from the unpacked tree.
6. The bucket contains stronger algorithm/problem-session metadata than the archive 18.03 bucket and should be tagged for computational reasoning consumers.

### Consumer / Tag Posture

- Suggested consumer tags:
  - `algorithms`
  - `optimization-prereq`
  - `computational-reasoning`
  - `scheduling-prereq`
  - `learning-ui`
- Suggested format families:
  - `course-export`
  - `resource-metadata`
  - `document`
  - `transcript`
  - `video-caption`

### First Extraction Targets

- lecture-note PDFs
- problem-set templates, questions, and solutions
- quiz review assets
- problem-session transcripts and caption-linked resources
- course review materials

## Normalization Rules Shared By Both Buckets

1. Register the bucket as a `course-export` corpus, not a plain PDF corpus.
2. Preserve root metadata files as control-plane artifacts.
3. Convert each `resources/*/data.json` descriptor into an asset row with `source_kind=packaged`.
4. Convert payload PDFs, captions, and transcripts in `static_resources` into extractable source assets linked back to their descriptor rows.
5. Mark root zip wrappers as provenance artifacts unless they add missing assets.
6. Record any prior derivative analysis, like `COURSE_SKILL_PROPOSAL.json`, as `source_kind=derived`.

## Recommended Immediate Next Step

Use these manifests to build the next two machine-readable asset manifests:

1. `archive_resource_pdfs/18.03-spring-2010`
2. `box_resource_pdfs/6.006-spring-2020`

Those asset manifests should enumerate `resources/*/data.json` rows plus linked `static_resources` payloads.
