# Tool + Tool-Holder DB Organization — cross-CAM material categorization (for romeo)

> **From juliett (database-expansion) → romeo (Fusion tool-holder + tooling DB).** Operator directive 2026-06-01: "make sure it has the proper full database for each. he's breaking it down by material types categorization so help him organize the databases since it will be the **same across all cad cam softwares**." This spec is the organizing schema; romeo populates the Fusion-specific data against it.

## The one rule that makes it portable
**Categorize by ISO 513 workpiece-material group (P/M/K/N/S/H), never by free-text.** Every CAM system (Fusion 360, Mastercam, hyperMILL, NX, SolidWorks CAM, Esprit, Inventor HSM) and every cutting-tool vendor classifies by ISO 513. Free-text names ("1018", "AISI 1018", "carbon steel", "Steel") are unportable; the ISO group is the canonical key that survives the jump between softwares.

PRISM's `MaterialDB` is already ISO 513. The **tool/holder side was free-text** (`CAMToolSchema.materials: string[]`). This spec closes that with one shared module.

## USE THIS — `mcp-server/src/data/tool-material-categorization.ts` (shipped + 21 tests)
The single, CAM-agnostic material axis. Import it from `FusionToolLibraryEngine`, your builder, and any CAM tool library:

```ts
import {
  ISO_513_GROUPS,                 // the taxonomy: 6 groups × name/color/description/subgroups
  normalizeMaterialToISO,         // "AISI 1018" -> { group:"P", matched }
  normalizeMaterialsToISOGroups,  // ["1018","304","6061"] -> { groups:["P","M","N"], unmatched:[] }
  categorizeToolMaterials,        // free-text[] -> ToolMaterialCategory record (or null if unknown)
  ToolMaterialCategorySchema,     // zod — validate every tool/holder's material axis
} from "../data/tool-material-categorization.js";

// tag every tool/holder you import for Fusion:
const cat = categorizeToolMaterials(tool.materials, { primaryGroup: "P" });
// -> { isoGroups:["P","M"], primaryGroup:"P", subgroups?, hardnessHRC?, sourceMaterials, unmatchedMaterials }
```
Rules baked in: unknown material → `null` (never silently coerced to P); hardness condition (chilled/hardened ≥45 HRC) overrides base ferrous material → H; superalloy/Ti identity (S) and stainless (M) beat generic "steel" (P). Unmatched names are **surfaced** for you to map, never dropped.

## The two axes — keep them separate
A tool/holder record has TWO orthogonal classification axes. Do not collapse them:
1. **Material axis (ISO 513, P/M/K/N/S/H)** — *which workpiece material it cuts/serves.* The organizing key romeo breaks down by. From `tool-material-categorization.ts`.
2. **Holder-interface axis (machine spindle)** — *how it mounts.* Already complete in **`ToolHolderDatabaseEngine.ts`** (80+ interfaces: CAT30-60 / BT30-50 / HSK-A/B/E/F/T / CAPTO C3-C8 / KM / PSC / VDI / BMT / SK / MT / R8 / ER, with ANSI B5.50 / JIS B6339 / DIN 69893 standards, spindle_bore, flange_dia, pull_stud, max_rpm). **Reuse it — do not rebuild the holder taxonomy.** The interface axis itself splits into TWO sub-axes, both cross-CAM — see the holder-categorization module below.

## USE THIS — `mcp-server/src/data/holder-categorization.ts` (shipped + 25 tests)
The CAM-agnostic **holder** axis — the sibling of the material module. Separates every CAT/BT holder by **taper size** AND by **contact type** (the operator's two requested sub-axes):

```ts
import {
  CAT_TAPER_SIZES, BT_TAPER_SIZES, SK_TAPER_SIZES, // [30,40,45,50,60] / [30,35,40,45,50] / [30,40,50] — only DB-present sizes
  normalizeHolderDesignation,  // "BCV50" -> { interface:"CAT", taperSize:50, contactType:"dual_contact_big_plus" }
  categorizeHolder,            // string | holder-record -> HolderCategory (reads the *_bigplus signal)
  HolderCategorySchema,        // zod — validate every holder's interface×size×contact axis
} from "../data/holder-categorization.js";

const hc = categorizeHolder(holder);   // { interface, taperSize, formSize?, contactType, bigPlusLicensed?, confidence }
```
- **Taper-size sub-axis**: 30/35/40/45/50/60 — the size lists carry ONLY sizes present in `HOLDER_DB` (no fabricated CAT35/BT60). An out-of-range size → `taperSize:null` (never invented).
- **Contact-type sub-axis**: `taper_only` (plain CAT/BT/SK steep-taper register) · `dual_contact_big_plus` (BIG-PLUS® — simultaneous taper + spindle gauge-face) · `inherently_dual` (HSK/CAPTO/KM/PSC, dual by design) · `unknown` (fail-loud).
- **BIG DAISHOWA designations**: `BBT` = BIG-PLUS on a **BT** taper; `BCV` = BIG-PLUS on a **CAT** taper (CV = CAT V-flange — *NOT* BT; the live `holders.json` had `BCV40/BCV50` mislabeled as BT, now fixed). The dominant real signal is a record's `taper` field carrying a `*_bigplus` suffix (`cat40_bigplus`) — most dual-contact holders keep a plain "CAT40" designation, so `categorizeHolder` reads that field/name; it does **not** require the holder to be re-keyed.
- **`bigPlusLicensed`** is set ONLY from an explicit flag — never inferred from a token (a BIG-PLUS holder in a standard spindle runs taper-only; inferring a license is a false-safety claim).

## Canonical record shape (same in every CAM)
```
Tool / Holder record =
  identity        : { id, name, vendor, partNumber }
  geometry        : CAMToolSchema.geometry (diameter, fluteLength, OAL, shankDiameter, fluteCount, cornerRadius, helix/rake)   // tools
  holderInterface : ToolHolderDatabaseEngine key (e.g. "CAT40", "HSK-A63")                                                      // holders + tool assemblies
  materialAxis    : ToolMaterialCategory  { isoGroups[], primaryGroup, subgroups?, hardnessHRC? }   ← THE cross-CAM key
  cuttingData     : per [isoGroup] vc/fz/ap/ae  (bridge to SFC / prism-reference-db)
```

## How to organize the database (the breakdown)
Index the tool + holder library **by ISO group first**, then by tool type:
```
P (steel)        → { end_mill:[...], drill:[...], tap:[...], insert:[...], holders:[...] }
M (stainless)    → { ... }
K (cast iron)    → { ... }
N (non-ferrous)  → { ... }
S (superalloy/Ti)→ { ... }
H (hardened)     → { ... }
```
A tool that cuts multiple groups appears under each (its `isoGroups` array). Each group's `subgroups` (see `ISO_513_GROUPS[g].subgroups`) give the finer breakdown (e.g. P → unalloyed / low-alloy / high-alloy / cast / free-machining). **This exact structure is reused verbatim for Fusion, Mastercam, hyperMILL, NX** — only the per-software export format (Fusion `.tools` JSON, Mastercam `.tooldb`, etc.) differs; the categorization does not.

## Bridges (already wired — see DB_MANIFEST consumers[])
- **MaterialDB** (ISO 513 workpiece props) — the material-side authority your `isoGroups` join against.
- **ToolDB** / `data/tools/` (TOOLHOLDERS.json 6.7M, CUTTING_TOOLS_INDEX.json 5.9M, ENDMILL_CATALOGS, INDEXABLE_MILLING_TOOLHOLDING) — existing tool + holder data to ingest, not re-collect.
- **VendorCatalogDB** — 425 vendors + 85 catalogs (holder makers: REGO-FIX, BIG DAISHOWA, guhring, CAMFIX) for sourcing.
- Cutting data per `[tool, isoGroup]` lives in the SFC (`prism-reference-db` + oscar's `.ts`) — join on `isoGroups`.

## Checklist for romeo's Fusion DB
- [ ] Every tool + holder carries a `ToolMaterialCategory` (validate with `ToolMaterialCategorySchema`).
- [ ] Holder interface comes from `ToolHolderDatabaseEngine` keys (no new taper taxonomy).
- [ ] Every holder carries a `HolderCategory` from `categorizeHolder(...)` (validate with `HolderCategorySchema`) — so CAT/BT are separated by taper size AND contact type (dual-contact/BIG-PLUS), not just by interface string.
- [ ] When importing a BIG-PLUS holder whose designation is plain ("CAT40"), set its `taper`/`name` to carry the `*_bigplus` / "BIG-PLUS" signal so `categorizeHolder` classifies it `dual_contact_big_plus` (it will otherwise read `taper_only`, which is correct for a non-BIG-PLUS CAT40).
- [ ] Unmatched materials from `categorizeToolMaterials(...).unmatchedMaterials` → extend `MATERIAL_ISO_PATTERNS` (ping juliett) rather than inventing a group.
- [ ] Library indexed by ISO group → tool type (the structure above) so it ports 1:1 to other CAM.

_Source modules: `mcp-server/src/data/tool-material-categorization.ts` (material axis, +21 tests) and `mcp-server/src/data/holder-categorization.ts` (holder interface×size×contact axis, +25 tests). Owner of both axes + normalization: juliett. Holder physics taxonomy: `ToolHolderDatabaseEngine.ts`. CAM-agnostic tool schema: `CAMToolLibraryEngine.ts`._
