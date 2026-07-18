---
name: oscar-jm-first-cohort-2026-06-02
description: "SHIPPED: JMFirstCohortEngine freezes the JM-purchased-items priority cohort (7 shop-tools CSVs x 6 ISO materials x 15-machine fleet) for the SFC sweep. UNITS-FIRST inch->mm per tool (CSVs are inches; one turning row is mm). Wired prism_calc:sfc_jm_first_cohort. Precursor to FULL-SWEEP-RUN."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.690Z
aliases: reference_oscar_jm_first_cohort_2026_06_02
---


Commit `fbeb38c2ae` on `slot/oscar`, OSCAR-SFC-9AXIS-MS0 / U-OSC9-JM-FIRST-SUBSET (task #57). Honors the operator's explicit priority: sweep "JM items purchased + used in the shop FIRST … jm machine fleet, tool paths, tooling and holders and inserts."

**What shipped:** `JMFirstCohortEngine.build(opts?)` (pure, deterministic) enumerates the priority input set from REAL JM shop data — `shopToolLibraryEngine.loadAll()` (the 7 `shop-tools-*.csv`, ~218 tools), `JM_DIE_CONTROLLER_MAP` (15-machine fleet: 7 lathe / 5 mill / 3 EDM), and 6 ISO-group representative materials (P 1018 / M 304SS / K cast-iron / N 6061 / S Ti-6Al-4V / H H13, mirrors comparator `DEFAULT_MATERIAL_BY_ISO`). Returns `{tools, materials, machines, cells, summary}`; `cells` = tool×material (capped 5000, full estimate reported). Wired `prism_calc:sfc_jm_first_cohort`.

**UNITS-FIRST (the load-bearing discipline, 25.4× hazard):** the CSV tool diameters are in INCHES (`tool_unit="inches"`; a JM 1/2" endmill is `diameter=0.5`). The engine converts to mm PER TOOL keyed on its `unit`: mm kept as-is; else ×25.4 (assume inch = JM convention, with a warning on ambiguous unit). Both reviewers independently verified the conversion is correct on the dominant inch path AND on the **one mixed-unit row** — `shop-tools-turning.csv` tool #10 has `unit="millimeters"` (6.35mm), which the mm-branch correctly KEEPS as-is (no double ×25.4). Lesson banked: when ingesting a tool library, NEVER assume a single unit for the whole file — check the per-row unit; a die-shop CSV can be mostly inch with stray mm rows, and either a missed conversion (inch→left-as-mm) or a wrong double-conversion (mm→×25.4) is a 25.4× error. The test `maxMm > 5` catches inch-left-as-mm; the per-tool `mm ≈ in × 25.4` identity catches both directions.

**Proof:** tsc 0; 12/12 PASS; per-file scrutiny 2/2 PASS (one reviewer rate-limited on first dispatch → re-dispatched the A arm; B's PASS stood), zero P0/P1. P3 deferred: EDM sinker-vs-wire are both classed "wedm" (advisory metadata only); `CATEGORY_TO_OPERATION` is a maintenance coupling point with the #51 auto-glob (new tool families skip-with-warning = correct fail-soft).

**Next (critical path):** U-OSC9-QUAD-LANE-COMPARATOR (#58, extend SpeedFeedTriVendorBatchComparatorEngine 3→4 lanes adding traditionalSpeedFeedLaneEngine as AXIS D — the risky verdict-taxonomy redesign with 30-test blast radius) → U-OSC9-FULL-SWEEP-RUN (sweep this cohort through the 4-lane comparator reading the launched HSMAdvisor+G-Wizard live libs → exhaustive_sfc.jsonl + HTML/MD report). Relates to [[reference_oscar_traditional_lane_2026_06_02]], [[reference_oscar_gwizard_lane_honest_2026_06_02]].
