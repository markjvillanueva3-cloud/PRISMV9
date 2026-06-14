# CIMCO Edit 2026 — Database Fill Guide (PRISM → CIMCO)

**CIMCO-TOOLDB-FILL-MS0 (slot:romeo, 2026-06-02).** How to fill the fillable
databases in CIMCO Edit 2026 from PRISM data. Grounded in the **real installed
bytes** (verified, not guessed).

**Why this matters — the oracle:** per [[reference_cimco_install_corpus_2026_06_02]]
(slot echo, same day) the operator bought **CIMCO Edit 2026 + Machine Simulation** and
copied the full build to H: as **PRISM's program+post verification oracle** (the
drivable kinematic sim PRISM lacked; supersedes the static R9–R18 conformance
validator). Filling CIMCO's tool + machine DBs is how that oracle gets the real tools
and machines to verify against.

**Canonical corpus (read from H:, not C:):**
- `H:/prism/resources/cimco-2026/CIMCOEdit/` — CIMCO Edit 2026.01.10 (robocopy-verified vs `C:/Program Files/CIMCO 2026/`).
- `H:/prism/resources/cimco-2025/` — 2025.01.25 (Machine Sim baseline).
- Automation surface (from the echo memo): **REST API (new in CIMCO 2026)**, CLI switches, `CIMCOSimulation.exe` (separate headless-candidate binary), bundled **MariaDB** (`mariadb.exe`) backing NC-Base/DNC-Max/MDC-Max.

CIMCO Edit 2026 exposes four fillable databases. Their value to PRISM differs, so the
fill strategy differs per database:

| # | Database | Location | Format | PRISM fill strategy |
|---|----------|----------|--------|---------------------|
| 1 | **Tool Library** | `ToolLibs/Predefined/*.tmlib` | XML `<Library Version="4">` | **AUTOMATED** — exporter built ✓ |
| 2 | **Machine Config** | `MachineCfg/<name>/{*.mcfg,*.json,*.stl}` | JSON (`MachineDefinition.Collision[]`) + STL | **CLONE-A-TEMPLATE** — clone closest predefined |
| 3 | **Setup-sheet Templates** | `Templates/*.TYP`, `*.TPL` | per-controller defs | **NO ACTION** — auto-consumes #1 |
| 4 | **NC-Base** (program/PDM) | bundled **MariaDB** datastore | SQL tables | **SQL** — romeo/juliett ingest (separate unit) |

---

## 1. Tool Library (`.tmlib`) — AUTOMATED ✓  (the high-value database)

This is the database PRISM's 54K-tool corpus actually enriches. CIMCO ships small
predefined libs (Inch Mills, Inch Drills, ISO Mills MM, ISCAR/Seco Holders, …).

**Format** (reverse-engineered from the real predefined libs):
```xml
<Library Version="4">
  <Cutter Type="EndMill">
    <Parameter Type="ItemId"></Parameter>
    <Parameter Type="ItemNumber">1</Parameter>
    <Parameter Type="Description">1/2 FLAT ENDMILL</Parameter>
    <Parameter Type="ItemGuid">…uuid…</Parameter>
    <Parameter Type="ItemUnitSystem">Imperial</Parameter>   <!-- Imperial=inch, Metric=mm -->
    <Parameter Type="FluteDiameter">0.5</Parameter>
    <Parameter Type="ShaftDiameter">0.5</Parameter>
    … BodyLength FluteLength ShoulderLength CornerRadius … EndMillCornerType …
  </Cutter>
</Library>
```
Confirmed cutter types + exact param sets: **EndMill · CommonDrill** (TipAngle 140) **·
SpotDrill** (TipAngle 90 + TipDiameter) **· Countersink · TapRightHand** (ThreadPitch =
25.4²/TPI = 645.16/TPI, verified vs `Inch Taps.tmlib`) **· Holder** (HolderSegments).

**Generate the libraries:**
```bash
node scripts/export-tools-to-cimco-tmlib.mjs              # default: EXTRACTED_DETAILED_TOOLS (inch) → Imperial
node scripts/export-tools-to-cimco-tmlib.mjs --units metric
node scripts/export-tools-to-cimco-tmlib.mjs --store <key> --native inch|mm --units imperial|metric
```
Output → `mcp-server/data/cimco-export/toollibs/PRISM <Type> <Inch|MM>.tmlib` + a
`cimco-export-manifest.json`. First real run: **720 records → 620 EndMill cutters**,
lossless inch round-trip, 0 scale anomalies.

> **UNITS-FIRST (hard rail):** a misread native unit is a 25.4× scale error. The
> exporter only converts stores whose native units are **verified** (or passed via
> `--native`); unverified stores are refused, never guessed. Records whose post-
> conversion diameter falls outside 0.05–200 mm are skipped as suspected mislabels.

**Load into CIMCO Edit:** open the **Tool Manager** (Backplot/Solid simulation →
tool setup), then **Import library** and select the generated `.tmlib`. CIMCO's own
user/predefined libraries live under `…/CIMCOEdit/ToolLibs/Predefined/`, so a copied
`.tmlib` placed alongside them also appears in the library picker.
*(Exact menu wording to confirm in-app — the import-mechanism web research was
rate-limited; the format + folder are verified, the menu label is the one open item.)*

---

## 2. Machine Configuration (`.mcfg` + STL) — CLONE A TEMPLATE

CIMCO ships **36 predefined machine configs** + **387 `.stl`** kinematic/collision
meshes. Each machine is JSON: the `config.json` lists `UserConfiguration.Models[]`
(STL component refs + colours), and the **`.mcfg` is JSON** holding
`MachineDefinition.Collision[]` named pairs (Tool|Workpiece, Tool|Fixture, Tool|C,
C|Z, …) + travels. Authoring STL kinematics from scratch is high-effort and PRISM has
no source for it — **but cloning is cheap:** copy the closest predefined config dir,
rename, and adjust travels + collision pairs. The STL meshes are reused from the
template (generic machine-class geometry is good enough for the verification oracle).

**Fill path:** clone the closest predefined Cimco config below for each JM Die machine
class, then tune travels/limits. (Ingesting `.mcfg`+`.stl` into PRISM's own DB is the
separate romeo/juliett SQL unit — see [[reference_cimco_install_corpus_2026_06_02]].)

| JM Die machine class | Closest CIMCO predefined config |
|----------------------|--------------------------------|
| 3-axis VMC (Haas VF/Mini, etc.) | `Cimco Mill 3 Axis Type A / B / C` |
| 4-axis VMC (rotary/trunnion) | `Cimco Mill 4 Axis Table Type A / B / C` |
| 5-axis trunnion | `Cimco Mill 5 Axis Table Head/Table BC/AC …` |
| 2-axis CNC lathe | `Cimco Lathe 3 Axis C` |
| Lathe + live tooling (C/Y) | `Cimco Lathe 4 Axis CY` |
| Mill-turn / sub-spindle | `Cimco Lathe Mill-Turn BC + Sub` |
| **Wire EDM** | *(not covered by CIMCO's mill/lathe 3D sim; WEDM = DNC only via `AGIECUT.TPL`)* |

Load: **Backplot/Simulation → Machine Setup → select machine** from the list above.

---

## 3. Setup-sheet Templates (`.TYP` / `.TPL`) — NO SEPARATE FILL NEEDED

`Templates/` holds DNC transmission templates (`.TPL`) and per-controller setup-sheet
/ backplot definitions (`.TYP`: `Haas NGC Milling`, `Siemens Turning`, `Fanuc 30i`,
`Mazak`, `Okuma`, …) plus `MultiChannelSystemTemplates.json`. These are **factory
controller definitions**, not a user data store.

**Key dependency:** the setup-sheet generator pulls its tool list from the loaded
NC program's tools **resolved against the Tool Manager library**. Therefore **filling
the Tool Library (#1) automatically enriches every setup sheet** — no separate
template fill is required. Operator action: select the controller's `.TYP` that
matches the target machine; nothing to populate.

---

## 4. NC-Base (program / PDM database) — SQL, separate unit

CIMCO bundles **MariaDB** (`mariadb.exe`, `mariadb-dump.exe`) as the datastore behind
**NC-Base** (NC-program PDM), DNC-Max, and MDC-Max. Because it is a real SQL database,
PRISM can read/write it directly (no UI scraping) — e.g. push JM Die's program library
+ revision metadata into NC-Base, or pull MDC-Max OEE for the business galaxy. This is
a distinct build (connect via SQL, map schema) owned by romeo/juliett and is **out of
scope for the tool-library fill** — tracked as a follow-up unit, not done here.

---

## Status summary

- **Tool Library (#1)** — ✅ built + verified (`scripts/lib/cimco-tmlib.mjs` + exporter; 19/19 tests; 620 tools exported, lossless inch round-trip).
- **Machine Config (#2)** — 📋 clone-a-template (table above); full PRISM↔`.mcfg`/`.stl` SQL ingest is a separate romeo/juliett unit.
- **Setup-sheet Templates (#3)** — ✅ covered transitively by #1 (no separate fill).
- **NC-Base (#4)** — ⏳ SQL ingest = separate unit (MariaDB direct; romeo/juliett).
- **Open item** — confirm the exact Tool Manager import menu label in-app (format + folder verified; only the menu wording is unconfirmed).
- **Follow-up (U-CTF-WIRE)** — wire `cimco_toollib_export` as an MCP dispatcher action (romeo's domain).
- **Context** — CIMCO = PRISM's verification oracle ([[reference_cimco_install_corpus_2026_06_02]]); automation via REST API (2026) / `CIMCOSimulation.exe` / MariaDB.
