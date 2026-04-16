# Resource Extraction Queue

Generated: 2026-03-30
Depends on: [RESOURCE_CENSUS_REGISTRY_2026-03-30.md](H:\PRISM\state\shared\RESOURCE_CENSUS_REGISTRY_2026-03-30.md)
Roadmap anchors:
- `H:\PRISM\mcp-server\data\docs\roadmap\ULTIMATE-PRISM-ROADMAP-v25.md`
- `H:\PRISM\mcp-server\data\docs\roadmap\RESOURCE-LEARNING-HARDENING-ROADMAP.md`

## Queue Logic

Priority is ordered by:

1. direct product leverage
2. amount of already-accessible signal
3. likelihood of unlocking the next roadmap wave
4. low risk of interfering with the main-path frontend/backend gate

## Tier 0: Immediate SQ2 Follow-Ons

| Queue ID | Corpus / Work Slice | Why First | Output Target |
| --- | --- | --- | --- |
| `U-CENSUS1-A` | Active machine handbook registry cleanup | Already structured JSON and directly useful to diagnostics + machine live | handbook provenance map, consumer tags, exposure checklist |
| `U-CENSUS1-B` | Box + Archive PDF/reference pack normalization | Largest raw knowledge backlog with direct formula/process payoff | dedup list, typed extraction batches, `SQ2-1` starter queue |
| `U-CENSUS1-C` | Box + Archive MIT course pack normalization | Largest training backlog and high leverage for learning modules | course-pack registry, module tags, promotion candidates |
| `U-CENSUS1-D` | Box machine/holder/part model registry | Largest geometry backlog and direct feed for simulation + compatibility | CAD asset index, machine/holder/part tags, consumer map |

## Tier 1: High-Value Cleanup Before Bulk Ingestion

| Queue ID | Corpus / Work Slice | Why Next | Output Target |
| --- | --- | --- | --- |
| `U-CENSUS1-E` | Active resource PDFs + active manufacturer catalogs | Closest to active repo and likely duplicated with archive | provenance cleanup, dedup rules, active-vs-archive split |
| `U-CENSUS1-F` | Active video-learned corpus | Already extracted; needs source linkage and normalized knowledge-object contract | source-video linkage audit, transcript confidence tags |
| `U-CENSUS1-G` | Archive tool-holder CAD files | Small and bounded; easy win for compatibility work | holder model registry and compatibility seeds |

## Tier 2: Sync / Provenance Investigations

| Queue ID | Corpus / Work Slice | Current Risk | Output Target |
| --- | --- | --- | --- |
| `U-CENSUS1-H` | Archive machine simulation models | Directory exists but no files surfaced | sync verification result |
| `U-CENSUS1-I` | Archive generic machine models | Directory exists but no files surfaced | sync verification result |
| `U-CENSUS1-J` | Archive CAD files | Directory exists but no files surfaced | sync verification result |
| `U-CENSUS1-K` | Box manufacturer catalogs | Path exists but no files surfaced | sync verification result |
| `U-CENSUS1-L` | Box workholding + fixture catalogs | Vendor directories exist, no files surfaced | sync verification result |
| `U-CENSUS1-M` | Box PRISM CAD-CAM training | Labeled as training but no source video files surfaced in first pass | corpus reclassification |

## Recommended Next Slice

The next logical execution slice after this census baseline is:

1. `U-CENSUS1-B`
2. `U-CENSUS1-C`
3. `U-CENSUS1-A`

Reason:

- `U-CENSUS1-B` and `U-CENSUS1-C` unlock `SQ2-1` fastest by giving the PDF/course pipeline an ordered high-impact backlog.
- `U-CENSUS1-A` is bounded and high leverage, but it is already structured and can run in parallel after the raw backlog is framed.

## Proposed Extraction Queue Shape For SQ2-1

### Batch 1

- machine handbook JSON corpus
- top 50 manufacturer/process PDFs from active + archive + Box
- top 25 MIT course packs with machining, manufacturing, controls, and statistics relevance

### Batch 2

- remaining high-confidence PDF/catalog corpora
- transcript-backed video knowledge packages
- holder and machine model metadata linkage

### Batch 3

- low-confidence or unsynced reservoirs after sync verification
- any Box-only corpora that need provenance cleanup before promotion
