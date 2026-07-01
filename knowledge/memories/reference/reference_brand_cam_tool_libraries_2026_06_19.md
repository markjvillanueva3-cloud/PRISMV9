---
name: reference_brand_cam_tool_libraries_2026_06_19
description: "Brand CAM tool-library pipeline COMPLETE (slot:romeo 2026-06-19): unified deduped normalizer + per-brand emitters across 7 lanes (Fusion/hyperMILL/Mastercam tools + Mastercam/hyperMILL inserts + Mastercam/hyperMILL holders) + app index + harness + placement + nightly cron. All 3 operator-named categories (holders+tooling+inserts) delivered. ALL diameter-bearing tooling subcategories emit: solid/indexable mills, drills, reamers, thread mills (everywhere), turning (hyperMILL+Mastercam, Fusion excluded by schema). Fixed a 22K-duplicate-tool bug + a thread-mill FK-incompleteness bug. Only genuinely data-limited: thread TAPS (no pitch source) + turning insert-pairing (corpus has bare bodies)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.482Z
aliases: reference_brand_cam_tool_libraries_2026_06_19
---


# Brand CAM tool-library pipeline -- COMPLETE (slot:romeo, 2026-06-19)

Operator: *"finish generating tool libraries for all top brands of tool holders and tooling and
inserts for fusion, hypermill and mastercam. use harnesses, loops and crons."* -- ALL THREE named
categories (holders + tooling + inserts) delivered across the CAMs that have each library type.

## Architecture (all committed `[MAIN-FORCE] [TOOL-LIBRARIES]/U-*` on cad-fusion-live-ms0)
- **`scripts/lib/brand-tool-catalog.mjs`** -- unified loader+normalizer of the 60-file brand corpus,
  3 schema families -> 1 canonical mm record. **RECORD-LEVEL DEDUP** (key brand|id, prefer
  geometry-complete) fixed a latent **22K-duplicate-tool** bug + loaded the richer Jun-12
  `*-turning/-rotating.json` sources (INCLUDE_RE expanded). UNITS-FIRST + `isPlausibleGeometry`
  (excludes the YG1-380mm-drill class of source mis-parse). LIVE: **72,406 unique tools / 26 brands**.
- **`scripts/lib/holder-taper.mjs`** -- holder designation -> spindle taper (BBT50->BT50, ER-32->ER32,
  KM40, HSK-A63, CAT/Capto) + book-value collision geometry; REUSES ER_COLLET from holder-geometry.mjs.
- **`scripts/emit-brand-tool-libraries.mjs`** -- `BUILDERS[format]` registry, **7 lanes**:
  fusion TOOLS 43,200 (rotating cutters + thread mills) / hypermill+mastercam TOOLS 45,894 (those +
  turning) / 19-20 brands; mastercam+hypermill INSERTS (1,459 each, ISO-IC parsed); mastercam+
  hypermill HOLDERS (1,167 each, 4 brands, taper geometry). ALL tooling subcategories with a
  diameter emit across the CAMs that support each (thread mills everywhere; turning = hyperMILL +
  Mastercam, Fusion excluded by its insert-based turning schema -- per-lane MILL_TURN_CATEGORIES).
  R12 reconciliation invariant per lane. Shared selectInsertRows / selectHolderRows.
- **`scripts/cam-tool-library-harness.mjs`** -- emit+validate all 7 lanes, exit-1-on-fail.
- **`scripts/place-cam-tool-libraries.mjs`** -- delivers into the seats (Fusion CAM dir, hyperMILL
  v31 seat w/ built .hmt binaries for tools+inserts+holders, Mastercam X8 shared). 7 SEATS.
- **`scripts/build-brand-tool-catalog-index.mjs`** -> `brand-tool-catalog-index.json` (Part-2 app
  bridge): totals + byCategory matrix + per-brand counts + file pointers for ALL 7 lanes. Cron-refreshed.
- **`scripts/cam-tool-library-cron.mjs` + `install-cam-tool-library-cron.ps1`** -- nightly
  regen->validate->place->index. **VERIFIED: `PRISM CAM Tool Library Regen` LastTaskResult=0**,
  full 7-format + index cycle exit 0.

## Verified
- SQLite round-trip validates every .hmt (tools/inserts/holders). CSV parse validates Mastercam lanes.
- Tests: normalizer 28, emitter 38, harness 7, placement 4, cron 3, index 6, holder-taper 7 -- all green.
- 2-arm per-file scrutiny on the keystones (normalizer + emitter); P1s caught + fixed (silent-drop
  accounting, dedup collision, drill point-angle, units-first test gap, file-level-dedup regression).

## DELIVERED in this loop (iters 17, 19 -- previously marked data-limited, now emitted)
- **thread MILLS** -- emit across all 3 CAMs (Fusion "thread mill", hyperMILL ThreadMill tool_type_id 15,
  Mastercam "Thread Mill"); the [15,"ThreadMill"] GeometryClass was the FK-completeness fix (iter 17b).
- **turning bodies** -- emit hyperMILL (GeneralTurningTool tool_type_id 1000) + Mastercam ("Turning");
  Fusion EXCLUDED (its turning schema is insert-assembly-based, not a single tool record) via per-lane
  MILL_TURN_CATEGORIES. The [1000,"GeneralTurningTool"] GeometryClass keeps the .hmt FK build complete.

## Honest remaining (DATA-LIMITED, not deferred-by-laziness)
- **thread TAPS** -- taps NEED a thread pitch the corpus lacks (only the diameter-bearing thread MILLS
  emit); a tap without pitch is an incomplete tool (R12). Needs a pitch source / designation parser.
- **turning insert-pairing** -- turning BODIES emit, but the insert+holder ASSEMBLY linkage is absent in
  the corpus (bare tool only). The body is a valid library entry; the paired insert is a future enrichment.
- **Frontend rendering** of the index = quebec's domain (romeo provided the backend bridge).

## Dedup reconciliation (R8)
Regenerable, per-brand, deduped, plausibility-gated SUCCESSOR to the 2026-06-15 full-corpus export
([[reference_fullcorpus_cam_export_2026_06_15]] + [[reference_cam_library_placement_2026_06_15]]) whose
`generate-fullcorpus-*.ts` generators are GONE (verified absent) and which shipped DUPLICATE +
garbage-geometry tools. Distinct from the JM-crib `audit-jm-cam-libraries.mjs`
([[reference_jm_cam_audit_tool_2026_06_18]]). Linked: [[feedback_ultimate_destination_check]].
