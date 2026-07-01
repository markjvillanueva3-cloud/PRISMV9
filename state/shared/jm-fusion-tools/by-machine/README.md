# JM Die Fleet — By-Machine Tool Libraries (material-first, spindle-clamped)

**slot:romeo, 2026-06-15** — answers the operator directive: *"look how the current jm die fusion library is setup and update your work to coincide with how we set our tools up by machines. update the jm die fleet utilizing the same logic of categorizing by material type first so that cutting parameters coincide with the material for the tool cutting data."*

## How JM sets tools up (the source)
JM's `FUSION TOOL LIBRARY` (resources/PRISM FOLDER FROM HOME) groups cribs by function + one explicit machine crib:
- **END MILLS FOR MACHINE 4, TWIST DRILLS** → mill tools (58)
- **TURNING TOOLS, BORING BARS (rough/finish), 130°/180° INSERT DRILLS** → lathe tools (160)

Machine assignment is encoded in the **crib filename** (the `machineSideConnectionType`/`stationNumber` columns are empty), so this generator classifies each tool by its source crib — no insert-vs-twist-drill ambiguity.

## What this produces
JM's **actual 218 crib tools** (not the 118K corpus — JM does not own 118K tools) assigned to JM's **actual 12 CNC cutting machines**, each library **material-first**, with cutting parameters **clamped to that machine's spindle**:

| layer | what |
|---|---|
| `by-machine/{machine_id}/{ISO}.csv` | **analysis view** — tools for that machine × that material, one row per (tool × toolpath) with machine-clamped cutting data (24 cols) |
| `by-machine/{machine_id}/FUSION-IMPORT.csv` | **Fusion-importable** — the full 173-column Fusion CSV_TOOLS format, every preset row, material-first ordered, ready to import into Fusion as that machine's tool library. Each row = the source tool's verbatim geometry/holder columns + cutting cells (spindle/surface speed, feeds, stepdown/over) overridden by the spindle-clamped per-(material × toolpath) preset. |
| `FLEET-LEDGER.json` | per-machine roster: type, taper, max_rpm, max_power_kw, tools assigned, presets, rpm-clamped count |

The `FUSION-IMPORT.csv` header is byte-identical (md5-verified) to JM's source crib exports, so the geometry/holder/collision columns pass through unchanged — only the cutting cells are replaced with the machine-clamped material-matched values. Drops straight into Fusion per machine.

**Material-first** = the ISO group is the file split (analysis view) / the row ordering (Fusion import), so cutting parameters always coincide with the material.

## Spindle clamping (machine-coincident cutting data)
The same tool+material yields **different usable parameters per machine** — a milling preset whose computed RPM exceeds the spindle ceiling is pinned at the ceiling, with SFM + table feed scaled down proportionally (chip-load `fz` constant). Verified per-machine clamp counts (fleet: 31,392 presets, 397 clamped):

| machine | type | taper | max RPM | presets | clamped |
|---|---|---|---|---|---|
| okuma-mb-56va | vmc | BT50 | 6,000 | 1,550 | 128 |
| haas-vf-2 | vmc | CAT40 | 8,100 | 1,550 | 54 |
| hurco-vmx30i | vmc | BT40 | 12,000 | 1,550 | 7 |
| haas-om-2 | vmc | BT30 | 30,000 | 1,550 | 0 |
| roku-roku-rmx5 | 5axis | HSK-E25 | 40,000 | 1,550 | 0 |
| okuma-multus-b250 | mill_turn | — | 5,000 | 4,706 | 208 |
| 6× Okuma lathes (LTH) | lathe | — | 3,800–5,000 | 3,156 ea | 0 (CSS turning) |

Lathe turning is CSS (rpm=null) — the spindle max is surfaced as a column, not applied to a null rpm. Multus (mill-turn) gets both crib sets.

## Spec source + a flagged discrepancy (R7)
Spindle specs (max_rpm/power/taper) + roster come from `JmDieMachineConfigEngine.getAllConfigs()` (OEM datasheets) — the **same source the Fusion `.machine` kinematic defs use** (`generate-jm-fusion-machine-library.ts`), so the tool libraries + machine envelopes stay consistent. `ShopConfigurationEngine`'s controller-map IDs (VMC-01..05 / LTH-01..07, matching post-processor names) carry **no mill max_rpm**, so they cannot drive clamping. Minor model-name deltas between the two inventories — **Hurco VM30i ↔ VMX30i, Okuma M460V-5AX ↔ MB-56VA, Roku-Roku HC658-II ↔ RMX-5** — are flagged here for reconciliation (a DB task), not merged; they do not affect cutting-data correctness since each config's spindle spec is real.

## Regenerate
```bash
cd mcp-server && npx tsx scripts/generate-jm-by-machine-libraries.ts --reset
```
`--reset` clears generated content but preserves this README. Units: INCH (JM convention); vc in SFM, feed in IPM. NO inline physics constants (cutting via the shared `jm-tool-condition-matrix.ts` → `ultimateSpeedFeedEngine`). Clamp math tested: `generate-jm-by-machine-libraries.test.ts` (7 cases).
