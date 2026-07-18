# hyperMILL Tool / Holder / Machine DB Export — Verification (echo, 2026-05-31)

UNITS: PRISM engine is mm-native. JM base-job tools are INCH → converted ×25.4 before export.

## TOOL DB — WORKS (exporter already existed; verified uploadable)
- Action `hypermill_tool_export_job` driven live on :3100 with 5 base-job tools (2" face, 1/2"+3/8"+1/4" end mills, 1/4" drill).
- Output = SQLite DDL (`sqlite_schema`) + INSERT statements → materialized to `prism-base-job-tools.hmt.sql`.
- LOADS into SQLite: `prism-base-job-tools.hmt` (Tools=5, NCTools=5, DepotItems=5).
  - Verified mapping: 2" face → type 20 IndexableHighFeedCutter Ø50.8mm (=2.0×25.4 ✓); end mills → type 2; drill → type 4 Ø6.35mm (=0.25×25.4 ✓).
- `hypermill_tool_export` (catalog fallback) → `prism-catalog-tools.hmt.sql` LOADS (Tools=40).
- Canonical extension = `.hmt` (SQLite DB). Engine note: "Import the .hmt file via hyperMILL Tool Database > File > Import SQLite". `.hmt.sql` is the load script (`sqlite3 x.hmt < x.hmt.sql`).

## TOOL-INSTALL ENVELOPE — PARTIAL (secondary defect, NOT the DB exporter)
- `cam_hypermill_build_tool_install` driven live → returned `{success:false, error:"Cannot read properties of undefined (reading 'tool_id')"}` at HyperMillPluginAdapterEngine.buildToolInstallEnvelope:401.
- This is the in-host install-envelope builder (live plugin push), not the uploadable DB export. Param-shape mismatch / null-guard bug. Left UNFIXED — HyperMill*/master-post engines have 16 in-flight peer handoffs (lane discipline; do not edit).

## HOLDER DB — GAP → BUILT
- No prior hyperMILL holder exporter existed (tool DB only *references* a holder name in NCTools; no standalone Holders table emitted).
- BUILT `scripts/export-hypermill-holder-db.mjs` — converts ToolHolderDatabaseEngine HOLDER_DB into Holders+Couplings SQLite per real `HYPERMILL_HOLDER_FIELDS`/`HYPERMILL_COUPLING_FIELDS` schema.
- Output `prism-holders.hmt.sql` LOADS into SQLite `prism-holders.hmt`: Holders=8, Couplings=9, **orphan_fk=0** (full FK integrity).
- Self-test: 11/11 real-value assertions (CAT40 RPM 15000, HSK-A63 25000, shrink-fit 42000).

## MACHINE DB — GAP → BUILT
- No prior hyperMILL machine exporter existed; tool-DB SQLite has no machine table (hyperMILL machines = machine MODELS for post/sim, not the tool DB).
- BUILT `scripts/export-hypermill-machine-db.mjs` — converts ShopConfigurationEngine mill fleet (VMC-01..05 + test VMX42) into machine-model JSON + flat CSV.
- Output `prism-machines.hypermill.json` (6 machines, 2×5-axis) VALID + `prism-machines.csv` (6 rows × 15 cols) VALID.
- Self-test: 12/12 real-value assertions (VMC-01 Hurco WinMAX-v10 X-travel 762mm; Roku-Roku 40000rpm HSK-A63; VMX42 12000rpm/18kW + rotary A+C).
