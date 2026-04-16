# Resource Registry Schema

Generated: 2026-03-30
Task anchor: `SQ2-0-CENSUS`
Applies to:
- `H:\PRISM\state\shared\RESOURCE_CENSUS_REGISTRY_2026-03-30.json`
- `H:\PRISM\state\shared\RESOURCE_CENSUS_REGISTRY_2026-03-30.md`
- future `LR-1` normalization outputs

## Purpose

This defines the minimal canonical row shape for `SQ2` so raw sources, extracted derivatives, and promoted knowledge objects can share one spine.

## Row Levels

### 1. Corpus Row

Use for `LR-0` census and backlog planning.
One row represents a filesystem reservoir or a named sub-bucket.

Required fields:

| Field | Meaning | Example |
| --- | --- | --- |
| `id` | stable corpus identifier | `box_resource_pdfs` |
| `location` | physical source family | `box` |
| `path` | canonical root path | `C:\Users\Mark Villanueva\Box\PRISM\RESOURCE PDFS` |
| `category` | high-level corpus type | `pdf corpus` |
| `live_count` | surfaced file count | `6070` |
| `signal_summary` | short top-signal summary | `1188 json, 1118 html, 815 pdf, 191 vtt` |
| `extraction_status` | raw vs derived posture | `raw mixed reference pack` |
| `validation_state` | what remains before promotion | `highest-value LR-1 backlog` |
| `consumer_tags` | downstream consumers | `document-learning`, `formula-extraction` |
| `priority` | roadmap urgency | `highest` |

### 2. Asset Row

Use for `LR-1` and later normalized manifests.
One row represents a single source asset or extracted derivative.

Required fields:

| Field | Meaning |
| --- | --- |
| `resource_id` | stable asset identifier |
| `corpus_id` | parent corpus id |
| `path` | full asset path |
| `provenance` | `active`, `archive`, `box`, `generated`, or `derived` |
| `category` | `pdf`, `video`, `transcript`, `json`, `cad`, `zip`, etc. |
| `format_family` | normalized family like `document`, `course-export`, `cad-model`, `metadata`, `transcript` |
| `source_kind` | `raw`, `packaged`, `derived`, or `promoted` |
| `extraction_status` | `unseen`, `queued`, `normalized`, `extracted`, `promoted`, `skipped` |
| `validation_state` | `unknown`, `needs-review`, `validated`, `duplicate`, `unsynced`, `orphaned` |
| `consumer_tags` | downstream product consumers |

Recommended fields:

| Field | Meaning |
| --- | --- |
| `duplicate_group` | groups mirror or duplicate assets |
| `derivative_of` | source `resource_id` when the asset is derived |
| `machine_tags` | machine ids or families referenced |
| `material_tags` | material families referenced |
| `process_tags` | machining, controls, metrology, statistics, business, etc. |
| `course_tags` | OCW course code or module family |
| `confidence` | extraction or classification confidence |
| `notes` | bounded freeform context |

## Normalized Enums

### `provenance`

- `active`
- `archive`
- `box`
- `generated`
- `derived`

### `source_kind`

- `raw`
- `packaged`
- `derived`
- `promoted`

### `extraction_status`

- `unseen`
- `queued`
- `normalized`
- `extracted`
- `promoted`
- `skipped`

### `validation_state`

- `unknown`
- `needs-review`
- `validated`
- `duplicate`
- `unsynced`
- `orphaned`

## Canonical Rules

1. Keep one row spine across raw and derived assets.
2. Use `duplicate_group` instead of duplicating extraction work across mirrors.
3. Distinguish packaged course exports from pure documents via `format_family`.
4. Promote already-extracted corpora like `machine-handbooks` and `video-learned` into the same schema rather than tracking them in a separate ad hoc format.
5. Do not mark empty reservoirs as truly empty until `validation_state` is resolved from `unsynced` or `orphaned` to something stronger.

## Immediate Adoption

- Treat `RESOURCE_CENSUS_REGISTRY_2026-03-30.json` as the current corpus-row baseline.
- Use `duplicate_group` when normalizing active and archive manufacturer catalogs.
- Use asset rows for `SQ2-1` bucket manifests before any bulk extraction begins.
