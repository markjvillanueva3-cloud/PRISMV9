# SQ2-1 Starter Backlog

Generated: 2026-03-30
Task anchor: `SQ2-0-CENSUS`
Feeds:
- `U-CENSUS1-B`
- `U-CENSUS1-C`
- `U-CENSUS1-A`

## Intent

Turn the `SQ2-0` census into an immediately-usable `SQ2-1` execution spine.
These are bucket-level targets chosen because they have the highest accessible signal with the lowest ambiguity.

## Wave B1: PDF / Reference Normalization

Process these first as bucket manifests before any bulk extraction:

| Rank | Bucket | Why It Starts Here |
| --- | --- | --- |
| 1 | `archive_resource_pdfs/18.03-spring-2010` (`1273 files`, `213 pdf`, `374 json`) | highest archive PDF density and strong course-export signal |
| 2 | `archive_resource_pdfs/3.012-fall-2005` (`383 files`, `173 pdf`, `93 json`) | dense PDF payloads with materials-science relevance |
| 3 | `box_resource_pdfs/6.006-spring-2020` (`922 files`, `126 pdf`, `251 json`) | high Box signal with richer metadata footprint |
| 4 | `box_resource_pdfs/6.046j-spring-2015` (`980 files`, `122 pdf`, `273 json`) | large mixed course-export structure worth normalizing once |
| 5 | `box_resource_pdfs/2.830j-spring-2008` (`790 files`, `84 pdf`, `214 json`) | controls-heavy course-export bucket with direct automation value |

Representative surfaced assets:

- `H:\PRISM_ARCHIVE_2026-02-01\RESOURCES\RESOURCE PDFS\18.03-spring-2010\static_resources\0060994446768de761f5b2e9d681c6ec_MIT18_031S10_chapter_25.pdf`
- `H:\PRISM_ARCHIVE_2026-02-01\RESOURCES\RESOURCE PDFS\18.03-spring-2010\static_resources\00cb2978d59ebdd68fc96f69f9c4573a_MIT18_03S10_rec_21_sol.pdf`
- `C:\Users\Mark Villanueva\Box\PRISM\RESOURCE PDFS\6.006-spring-2020\static_resources\03a34fcf3012a242ffcae5534e9fa511_MIT6_006S20_ps3-questions.pdf`
- `C:\Users\Mark Villanueva\Box\PRISM\RESOURCE PDFS\6.006-spring-2020\static_resources\0462839ce975fea99f6a7b8adc8e1477_MIT6_006S20_ps4-solutions.pdf`

Expected output:

- one normalized manifest per bucket
- duplicate-group candidates across archive vs Box mirrors
- typed asset tags for `document`, `course-export`, `metadata`, `transcript`, and `archive-wrapper`

## Wave C1: MIT Course Normalization

Process these next as course-pack registries:

| Rank | Bucket | Why It Starts Here |
| --- | --- | --- |
| 1 | `box_mit_courses/MIT COURSES 4` (`2903 files`, `282 pdf`, `684 json`) | largest Box training bucket and likely richest metadata reservoir |
| 2 | `box_mit_courses/MIT COURSES 2` (`1883 files`, `176 pdf`, `477 json`) | second-largest Box training bucket |
| 3 | `box_mit_courses/6.046j-spring-2015` (`974 files`, `122 pdf`, `273 json`) | bounded course-export bucket, good schema pilot |
| 4 | `box_mit_courses/10.34-fall-2015` (`731 files`, `74 pdf`, `195 json`) | engineering-heavy bucket with stronger manufacturing relevance than generic theory-only courses |
| 5 | `archive_mit_courses/6.046j-spring-2015` (`253 files`, `118 pdf`, `5 json`) | useful mirror comparison target against richer Box equivalent |

Representative surfaced course folders:

- `C:\Users\Mark Villanueva\Box\PRISM\MIT COURSES\MIT COURSES 4\uploaded\11.205-fall-2019`
- `C:\Users\Mark Villanueva\Box\PRISM\MIT COURSES\MIT COURSES 4\uploaded\18.404j-fall-2020`
- `C:\Users\Mark Villanueva\Box\PRISM\MIT COURSES\MIT COURSES 4\uploaded\3.016-fall-2005`
- `C:\Users\Mark Villanueva\Box\PRISM\MIT COURSES\MIT COURSES 4\uploaded\6.042j-fall-2010`

Representative surfaced assets:

- `C:\Users\Mark Villanueva\Box\PRISM\MIT COURSES\MIT COURSES 4\uploaded\11.205-fall-2019 (pmanzano@jmdie.com)\static_resources\044e6a1b77ac13aeb3fbb799cbd93f68_11.205f19_week_2_arc.pdf`
- `C:\Users\Mark Villanueva\Box\PRISM\MIT COURSES\MIT COURSES 4\uploaded\11.205-fall-2019 (pmanzano@jmdie.com)\static_resources\b9fccd4f18a985debc36a2d7ab640eb2_11.205f19_pset2.pdf`

Expected output:

- course-pack manifest rows keyed by course code
- promotion candidates tagged for controls, materials, statistics, algorithms, or manufacturing methods
- archive-vs-Box mirror notes where the same course exists in both places

## Wave A1: Machine Handbook Exposure

This is the bounded structured pass that can run in parallel after B1/C1 framing:

- `dmg-dmu-50.json`
- `doosan-dnm-5700.json`
- `makino-a51nx.json`
- `mazak-integrex-i200.json`
- `okuma-lb3000-ex-ii.json`
- `okuma-mu-5000v.json`
- `okuma-multus-b300ii.json`
- `roku-roku-rky-1000n.json`

Immediate goal:

- map each handbook to machine id, manufacturer, manual provenance, and consumer exposure targets
- keep these as structured `promoted` assets instead of re-ingesting them like raw PDFs

## Hold / Investigate Buckets

- `box_manufacturer_catalogs` -> path exists, no files surfaced
- `box_fixture_catalogs` -> vendor directories only in first pass
- `archive_machine_models`, `archive_generic_machine_models`, `archive_cad_files` -> present as paths but not hydrated locally

## Recommended Next Execution Order

1. build bucket manifests for `Wave B1`
2. build course-pack registries for `Wave C1`
3. map the eight machine handbooks into the canonical schema
4. only then open bulk `SQ2-1` extraction
