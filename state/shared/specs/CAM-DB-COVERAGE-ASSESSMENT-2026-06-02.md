# CAM / Machine / Fixture / Material / ERP Database Coverage Assessment

**CAM-DB-FILL (slot:romeo, 2026-06-02).** Operator work order: *"build all fusion,
hypermill, mastercam and cimco tooling databases with all input data filled out and
collision avoidance models within the tool creator filled out, machine databases,
fixture and material databases | databases for front end erp should be cataloged.
utilize workflow to help assess if we're missing functionality and coverage with our
databases."*

Method: a 12-agent read-only coverage Workflow (`cam-db-coverage-v2`, run
`wf_3dbfc3d6-b1e`) — 9+ domain auditors (Fusion/hyperMILL/Mastercam/CIMCO tool-DB
formats, machine/fixture/material DBs, ERP catalog, collision-holder-geometry,
existing-export dedup, tool-corpus depth, collision-compute inventory) → 1 synthesis.
Grounded in REAL installed bytes + the shipped CIMCO exporter pattern.

> **Headline:** the CAM tool *exporters* largely **already exist** (Fusion / Mastercam
> / hyperMILL export engines + dispatcher actions are SHIPPED). The real gap is the
> **collision model**: per-tool holder/extension geometry is *never populated* and the
> tool↔holder *join does not exist*. Collision *compute* is built (10 engines, ~5.4K
> LOC) but is **geometry-starved**. So the comprehensive route is: build the
> tool→holder **assembly join + holder body geometry**, then feed it into the existing
> exporters' collision blocks — NOT rebuild the exporters.

---

## 1. Coverage scorecard

| Database | Coverage | Real format known? | Collision fields? | Status |
|----------|----------|--------------------|-------------------|--------|
| **CIMCO tool DB** (`.tmlib`) | 100% (620 cutters) | YES — bytes reverse-engineered | N/A (cutters) | **SHIPPED** |
| **Fusion tool DB** (`.tools`) | engine 100% | YES — real `.tools` JSON on disk (holder.segments + shaft) | holder YES; assembly stickout NO | **SHIPPED engine** · CLI wrapper = gap (S) |
| **Mastercam tool DB** (`.tooldb`) | JSON 100% / SQLite 0 | YES — `.tooldb` = SQLite (`SQLite format 3\0`), 47 tbl | holder geom YES; OpToolInfo BLOB opaque | partial — SQLite writer gap |
| **hyperMILL tool DB** | engine 100% / fmt 40% | PARTIAL — SQLite/Access on disk, geom blobs binary-opaque | holder schema YES; tool geom blob NO | partial |
| **CIMCO machine-config** (`.mcfg`+STL) | 0% | YES — 36 templates + 387 STL on disk | YES (`MachineDefinition.Collision[]`) | gap — clone-a-template (spec ready) |
| **Machine DB** | 47–55% | YES — MachineRegistry (824 loaded) | spindle taper text only; no head envelope | partial |
| **Fixture / workholding DB** | 38% schema / 5–10% data | PARTIAL — Orange Vise extracted; REGO-FIX image-only | no 3D; radial clearance only | gap |
| **Material DB** | 80% schema / <10% export | bridges read-only; no write format on disk | N/A | partial — 0 exporters |
| **Collision models in tool creator** | **0%** | compute exists (10 engines) | **holder envelope NEVER populated** | **gap (CENTRAL)** |
| **ERP catalog** | high (metadata) | YES — vendor/JM/reference DBs filled | N/A | FILLED |

## 2. The central gap — CONFIRMED (empirically, by inspecting a real tool record)

**Per-tool holder/extension geometry is the join that makes collision models possible
in every CAM.** A real `EXTRACTED_DETAILED_TOOLS` record carries cutter geometry only
(`diameter, flutes, loc, oal, shank`; `geometry` = `{volume, surfaceArea}`) — **no
holder, no gauge length, no projection.**

What EXISTS: cutter geometry (720 tools) · holder INTERFACE physics
(`ToolHolderDatabaseEngine`, 80+ specs: CAT/BT/HSK taper, bore, rpm, ER8..ER50
capacity) · full collision COMPUTE stack (OBB/SAT/swept-volume ready).

What is MISSING (the join):
1. **No `tool_holder_id` FK** — tools and holders are disconnected tables; no `ToolAssembly`.
2. **No `gauge_length` / `stickout_from_holder` / `projection`** — the `L` in deflection-L³ AND the collision envelope length.
3. **No holder 3D body envelope** — the holder DB stores scalars only; the collision engine's `holder` envelope array is declared but never populated.
4. **No spindle/head envelope** on MachineRegistry (5-axis head clearance).

## 3. Dependency-ordered build plan (R13 — verifiable core first)

| # | Unit | Builds | Depends | Effort | Verification |
|---|------|--------|---------|--------|--------------|
| **0** | **U-CDF-HOLDER-GEOM** ✅ | `scripts/lib/holder-geometry.mjs` — CAM-agnostic holder collision-profile generator (tool→ER holder select + stepped-cylinder body + shaft + projection/gauge) + verified CIMCO adapter | corpus + holder DB | S | **DONE** — 23/23 node:test incl. real round-trip through `cimco-tmlib` (non-zero, spindle→tip) |
| **1** | **U-CDF-ASSEMBLY** | tool↔holder JOIN: `ToolAssembly` type + FK + gauge/stickout fields; consumes U0 geometry | U0 | M | JM tool+CAT40 → total stickout; units-guard throws on untagged field |
| **2** | **U-CDF-FUSION-CLI** | `scripts/export-tools-to-fusion360.mjs` over existing `FusionToolExportEngine` — emit `.tools` with `holder.segments` from U0 + assembly stickout | U0/U1 + existing engine | S | byte-diff vs real `.tools` on disk; re-import in Fusion |
| **3** | **U-CDF-CIMCO-MCFG** | `scripts/lib/cimco-mcfg.mjs` + exporter cloning 36 `.mcfg` templates → JM machines; populate `Collision[]` | `.mcfg`/STL on disk + MachineRegistry | M | clone Haas template → load in CIMCO; collision pairs render |
| **4** | **U-CDF-MASTERCAM-SQLITE** | `scripts/lib/mastercam-tooldb.mjs` writing SQLite `.tooldb` (Tl* tables w/ holder) | U0 + real `.tooldb` (better-sqlite3 in mcp-server) | M | write `.tooldb` → open in Mastercam Tool Manager; INCH fail-loud |
| **5** | **U-CDF-MATERIAL-EXPORT** | per-ISO Vc/fz/kc1.1/Taylor exporter → Fusion/Mastercam/hyperMILL material libs | constants.ts + MaterialRegistry | M | 1047 mats → format; kc1.1 round-trips P=1800 |
| **6** | **U-CDF-HOLDER-ENVELOPE-WIRE** | wire populated holder envelope into `CollisionEngine.check5AxisHeadClearance()`; collision-ready assembly in #2/#3/#4 | #1..#4 | L | 5-axis head-tilt scenario flags gouge w/ holder loaded vs clears without |

## 4. Already-covered (do NOT rebuild — VERIFY before extending)

- **CIMCO tool library** — `scripts/export-tools-to-cimco-tmlib.mjs` + `scripts/lib/cimco-tmlib.mjs`, `prism_data:cimco_toollib_export`, 620 cutters, 19+7 tests.
- **Fusion tool engine** — `FusionToolExportEngine` / `Fusion360ToolExportEngine` (CLI wrapper is the gap).
- **Mastercam tool exporter (JSON)** — `MastercamToolExportEngine` + `prism_cam:mastercam_tool_export`; `export-mastercam-holder-db.mjs`.
- **hyperMILL tool exporter** — `HyperMillToolExportEngine` + `prism_cam:hypermill_tool_export` + holder/machine companions.
- **Collision compute** — 10 engines / ~5.4K LOC; feed geometry, don't rebuild math.
- **ERP / vendor / JM / reference DBs** — vendor-catalog-db, jm-die-database, prism-reference-db all FILLED.

> ⚠ The "already-covered" engine claims (Fusion/Mastercam/hyperMILL export engines) are
> from the assessment Workflow's agents and **must be VERIFIED on disk** before building
> CLI wrappers atop them — do not build against a phantom (R12 fail-loud).

## 5. Immediate next unit for romeo

**U-CDF-ASSEMBLY (#1)** — the tool↔holder join, on the proven U0 geometry foundation.
Lowest risk (no binary formats), highest leverage (no exporter can carry collision
geometry until tool↔holder is linked with stickout). Real-bytes sample:
`mcp-server/data/prism-reference-db/tools.json` (`EXTRACTED_DETAILED_TOOLS`, 720 inch
tools) joined with `ToolHolderDatabaseEngine` HOLDER_DB — both already on disk.

---

_Source: Workflow `wf_3dbfc3d6-b1e` (`cam-db-coverage-v2`), 12 read-only auditors +
synthesis, grounded in real installed bytes (Fusion `.tools`, Mastercam `.tooldb`
SQLite header, CIMCO `.tmlib`/`​.mcfg`) + shipped CIMCO exporter. U0 shipped this session._
