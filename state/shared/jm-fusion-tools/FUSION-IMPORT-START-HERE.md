# Fusion 360 Tool Library — START HERE (JM Die crib)

_Operator import guide. Generated 2026-06-11 (slot:romeo). Re-run `node H:/prism/scripts/merge-jm-fusion-crib.mjs` to refresh the consolidated file; `npx tsx H:/prism/mcp-server/scripts/generate-jm-fusion-tool-libraries.ts` to refresh everything from the source crib._

## Import into Fusion 360
**Manufacture → Manage → Tool Library → right-click your Cloud (or Local) library → Import → pick a file below.**

## Which file?

| You want | Import this (absolute path) |
|----------|------------------------------|
| **Whole crib, ONE import** (218 tools, every material preset) | `H:\prism\state\shared\jm-fusion-tools\material-group-libraries\JM-CRIB-ALL-families.csv` (613 KB) |
| One material group at a time | `…\material-group-libraries\by-group\` → JM-CRIB-H.csv, JM-CRIB-K.csv, JM-CRIB-M.csv, JM-CRIB-N.csv, JM-CRIB-P.csv, JM-CRIB-S.csv |
| One tool family at a time | `…\material-group-libraries\` → 7 `*-allconditions.csv` files |
| By tool type, then brand | `…\material-group-libraries\by-type-brand\` → per-ISO-group `H/ K/ M/ N/ P/ S/` (see INDEX.md) |
| Full brand catalog (15,994 milling tools, ISCAR/OSG/YG-1/Sandvik/…) | `H:\prism\state\shared\jm-fusion-tools\jm-milling-tools.tools` (21.7 MB) |

ISO material groups: **P**=steel · **M**=stainless · **K**=cast iron · **N**=aluminum · **S**=superalloy · **H**=hardened.

## Notes (read before you rely on it)
- **Format:** `CSV_TOOLS_VERSION_1` — byte-identical header to JM's existing Fusion exports. `.tools` is native Fusion JSON.
- **Holders are embedded in each tool** (REGO-FIX Capto C6 / BIG DAISHOWA ER-32 / ISCAR / Techniks, real collision segments). That is Fusion's holder model — there is no separate holder file to import.
- The folder `H:\prism\state\shared\holder-libraries\` (643 HAIMER/GUHRING/BIG DAISHOWA holders) is a **reference database**, NOT a Fusion import.
- **Speeds/feeds are starting points** (Kienzle/Taylor-backed) — verify on the machine for setup rigidity, coolant, finish.
- Geometry + holder collision columns are copied **verbatim** from JM's proven CSVs (no unit conversion → no 25.4× scale error).
