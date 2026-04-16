# SQ2 Wave B1 Follow-On Bucket Manifests

Generated: 2026-03-30
Task anchor: `SQ2-0-CENSUS`
Wave anchor: `U-CENSUS1-B`
Schema reference:
- `H:\PRISM\state\shared\RESOURCE_REGISTRY_SCHEMA_2026-03-30.md`

## Purpose

These are the next two Wave B1 bucket manifests after the initial `18.03` and `6.006` pair.
They extend the side-quest roadmap into:

- `archive_resource_pdfs/3.012-fall-2005`
- `box_resource_pdfs/6.046j-spring-2015`

## Bucket: `archive_resource_pdfs/3.012-fall-2005`

### Identity

- Path: `H:\PRISM_ARCHIVE_2026-02-01\RESOURCES\RESOURCE PDFS\3.012-fall-2005`
- Provenance: `archive`
- Course title: `Fundamentals of Materials Science`
- Course number: `3.012`
- Term: `Fall 2005`
- Topics:
  - `Engineering > Materials Science and Engineering`
  - `Science > Physics > Thermodynamics`
- Learning resource types:
  - `Exams with Solutions`
  - `Lecture Notes`
  - `Written Assignments with Examples`
  - `Problem Sets`
  - `Problem Set Solutions`

### Bucket Metrics

- Total files: `383`
- Total size: `348.8 MB`
- PDF files: `173`
- JSON files: `93`
- HTML files: `96`
- ZIP files: `10`
- Content-map entries: `185`

### Page Sections

- `assignments`
- `calendar`
- `exams`
- `lecture-notes`
- `readings`
- `recitations`
- `syllabus`

### Descriptor Shape

- Descriptor count: `82`
- Resource type mix:
  - `78` `Document`
  - `2` `Image`
  - `2` `Other`
- Payload pattern:
  - `82` descriptors have direct files
  - `0` descriptors have captions
  - `0` descriptors have transcripts
  - `0` descriptors have archive URLs

### Interpretation

This is a document-dominant course-export bucket with almost no derivative media layer.
It is the cleanest follow-on candidate for materials and thermodynamics knowledge extraction.

Representative assets:

- `f04_q1_sol_t.pdf`
- `f04_quiz1.pdf`
- `f04ps1.pdf`
- `f04ps1_sol_struc.pdf`
- `dmse_curriculum.pdf`

## Bucket: `box_resource_pdfs/6.046j-spring-2015`

### Identity

- Path: `C:\Users\Mark Villanueva\Box\PRISM\RESOURCE PDFS\6.046j-spring-2015`
- Provenance: `box`
- Course title: `Design and Analysis of Algorithms`
- Course number: `6.046J`
- Extra course number: `18.410J`
- Term: `Spring 2015`
- Topics:
  - `Engineering > Computer Science > Algorithms and Data Structures`
  - `Engineering > Computer Science > Computer Networks`
  - `Engineering > Computer Science > Cryptography`
  - `Mathematics > Applied Mathematics`
- Learning resource types:
  - `Lecture Videos`
  - `Problem-solving Videos`
  - `Exams with Solutions`
  - `Lecture Notes`
  - `Instructor Insights`
  - `Problem Sets`
  - `Problem Set Solutions`

### Bucket Metrics

- Total files: `980`
- Total size: `245.8 MB`
- PDF files: `122`
- JSON files: `273`
- HTML files: `270`
- ZIP files: `7`
- VTT files: `79`
- Content-map entries: `254`

### Page Sections

- `assignments`
- `calendar`
- `exams`
- `instructor-insights`
- `lecture-notes`
- `recitation-notes`
- `syllabus`

### Descriptor Shape

- Descriptor count: `243`
- Resource type mix:
  - `121` `Document`
  - `39` `Video`
  - `79` `Other`
  - `4` `Image`
- Payload pattern:
  - `204` descriptors have direct files
  - `39` descriptors have captions
  - `39` descriptors have transcripts
  - `39` descriptors have archive URLs

### Interpretation

This bucket behaves like a richer successor to `6.006`:
it has the same caption and transcript derivative pattern, plus instructor-insight and problem-solving-video surfaces that are likely high-value for teaching and reasoning workflows.

Representative assets:

- `Lecture 1: Overview, Interval Scheduling`
- `Lecture 10: Dynamic Programming: Advanced DP`
- `Lecture 16: Complexity: P, NP, NP-completeness, Reductions`
- `Problem Set 2`
- `Quiz 1`

### Derivative Warning

- `78` `3play caption file` rows
- `39` `3play pdf file` rows

These should be treated as linked derivatives, not primary course documents.

## Recommended Continuation

1. Run the same per-descriptor manifest generation for these two buckets that was already completed for `18.03` and `6.006`
2. Cut a second candidate batch from:
   - `3.012-fall-2005`
   - `6.046j-spring-2015`
3. Keep the structured handbook lane moving in parallel through the consumer-readiness matrix
