# DB-Domain Categorization Audit — 2026-06-01 (slot:juliett)

> **Operator directive:** "use workflow to ensure each database domain is properly categorized and cat/bt holders are separated by taper size AND whether they're dual contact/big plus."
> **Method:** a 54-agent Workflow (classify → adversarial-verify per domain) over all 27 registered DB domains (`data/databases/DB_MANIFEST.json`), gold-standard = the shipped `tool-material-categorization.ts` (ISO 513) + `holder-categorization.ts` (taper×contact) modules. Advisory punch-list — `mustHumanVerify:true` on every fill recommendation.

**"Properly categorized"** = a canonical manufacturing grouping KEY (ISO group, IT grade, coolant class, fixture family, taper interface, controller dialect, …) expressed as a reusable axis (`taxonomy const + normalize fn + zod schema + categorize fn`, unknown→null) AND wired into the consumers that read the DB. Free-text columns ("1018", "FANUC 0i") are **UNCATEGORIZED** even with many rows.

## Shipped this directive (the cross-CAM axes — `mcp-server/src/data/`)
| Module | Axis | Domains served | Tests |
|--------|------|----------------|-------|
| `tool-material-categorization.ts` | ISO 513 P/M/K/N/S/H workpiece-material | MaterialDB, ToolDB, ProcessDataDB | 27 |
| `holder-categorization.ts` | holder interface family × **taper size** × **contact type** (taper-only / dual-contact-BIG-PLUS / inherently-dual) | ToolHolderDatabaseEngine, PrismReferenceDB.holders | 25 |
| `controller-family.ts` + `alarm-categorization.ts` | controller brand (16 families) × alarm category × severity × machine-stoppage | **AlarmDB** (P0), GCodeTemplateDB, MachineDB | 27 |

**Data-bug fixes shipped alongside:** holders.json `BCV40/BCV50` BT→CAT mislabel; AlarmDB index now recovers the 1210/2511 `controller_family:"undefined"` records via the `family`/`alarm_id` fallback + folds DMG_MORI/DOOSAN (which `ALARM_SCHEMA.json` omitted).

## Status — 27 domains (15 verified pass-1; 12 re-audit in flight `w41aw61fi`)

### ✅ CATEGORIZED / done
- **AlarmDB** — was the **P0** gap (free-text grouping keys, 48% undefined family). **FIXED** this session (`U-ALARMDB-CATEGORIZATION`, commit on `cad-fusion-live-ms0`): `alarm-categorization.ts` + `AlarmRegistry` wired to canonical index/lookup.

### 🟧 P1 punch-list (defined-but-unwired or missing-axis; build the sibling module)
| Domain | Natural axis (grouping key) | Fill |
|--------|------------------------------|------|
| **MachineDB** | machineClass × controllerDialect (kinematic+process × control brand) | build `machine-categorization.ts`; fix 5 fabricated-default unknown-coercions in `MachineVocabularyNormalizerEngine` (line 309/374/417/454/490) + `MachineProfileEngine:198,210`; wire `machine_categorize` dataDispatcher action. Reuse `controller-family.ts`. |
| **ThreadDB** | thread standard (ISO-metric / UN / NPT / BSP / ACME) | build `thread-categorization.ts` (4-part shape). |
| **ToleranceDB** | IT grade / fit class (ISO 286) | build `tolerance-categorization.ts`, unknown→null. |
| **GCodeTemplateDB** | controller dialect group | build `controller-dialect-categorization.ts` — **import `controller-family.ts`** (shared axis). |
| **ReportTemplateDB** | report/document-type closed enum | build `report-type-categorization.ts`. |
| **ToolpathStrategyDB** | strategy family (Category→Family→variant) | `StrategyTaxonomyEngine` exists + wired; add `toolpath-strategy-categorization.ts` for gold-standard parity. |
| **DecisionTreeDB** | ISO 513 (already wired) | **NOT** the orphan pass-1 claimed (verifier overturned — `DecisionTreeEngine` has real importers); axis-quality polish only. |
| **FormulaDB** | (NA for manufacturing) | NA for a manufacturing key; optional `formula-domain-categorization.ts` reusing `constants.ts FORMULA_DOMAINS` (21). |

### ⚪ NA — no manufacturing categorization applies (AI / internal-structure domains)
AlgorithmDB · KnowledgeDB · WorkflowDB · InferenceDB · CompoundActionDB · SourceCatalogDB — verified: no part/tool/material/machine/toolpath entity to group.

### ✅ Re-audit COMPLETE (`w41aw61fi`, 2026-06-01 — 11/12 verified; MaterialDB known)
The 12 pass-1 StructuredOutput failures, resolved:

| Domain | Status | Pri | Axis (grouping key) | Fill |
|--------|--------|-----|---------------------|------|
| **MaterialDB** | CATEGORIZED | — | ISO 513 P/M/K/N/S/H | none — the gold-standard axis itself (`tool-material-categorization.ts`). |
| **CoolantDB** | CATEGORIZED | P2 | delivery class × base × ISO-compat | wired (`CoolantRegistry` typed unions); optional `coolant-categorization.ts` to kill the ~8 divergent inline coolant enums. |
| **CAMSystemDB** | CATEGORIZED | — | CAM vendor / post family (vendor×tier×adapter) | none — defined+wired; P3 cosmetic (`cam/PATHS.md` renders data path `undefined`). |
| **ToolDB** | PARTIAL | P1 | tool-type × ISO 513 material | material half exists (`categorizeToolMaterials`) but **ZERO importers** — wire it into CAMToolLibrary/FusionToolLibrary/ToolCatalog; add `tool-type-categorization.ts`. |
| **WorkholdingDB** | PARTIAL | P1 | fixture family (vise/chuck/collet/vacuum/magnetic/tombstone/soft-jaw/zero-point) | data is family-grouped but fragmented into 4 local enums (`3_jaw_chuck` vs `chuck`, `soft_jaw` vs `soft_jaws`) — build `workholding-categorization.ts`, collapse the enums. |
| **SpindleDB** | UNCATEGORIZED | P1 | taper interface (reuse `holder-categorization.ts`) × power/torque class | wire taper axis into `machine-spindle-corrections.ts` + add the power-class band. |
| **CollisionDB** | PARTIAL | P1 | collision-pair type (body×body, AABB/OBB/SWEPT) | build `collision-categorization.ts` promoting the 9 collision_check_types + bbox types. |
| **ProcessDataDB** | PARTIAL | P1 | operation type × ISO 513 material | wire the ISO half via `normalizeMaterialToISO` on the `by_material` grade keys. |
| **GenomeDB** | PARTIAL | P2 | ISO 513 (× material family) | consolidate `ManufacturingGenomeEngine` to import the shared `tool-material-categorization.ts`. |
| **JMDieDocuStrataDB** ⭐ | PARTIAL | P1 | document role/type (order-lifecycle: print/quote/order/shipping/financial) | **juliett's own corpus** — build `document-role-categorization.ts` (15-value closed role set). High-value, in-lane. |
| **VendorCatalogDB** | PARTIAL | P1 | vendor type (tool/holder/material/machine/workholding maker) | build `vendor-categorization.ts`. |
| **PrismReferenceDB** | PARTIAL | P2 | outer: 17 manufacturing category buckets (wired); inner: raw source blobs | outer axis fine; inner-layer normalize is per-category (holders already done this session). |

**Full 27-domain tally:** 6 CATEGORIZED (AlarmDB✦done, MaterialDB, CoolantDB, CAMSystemDB, PrismReferenceDB-outer, DecisionTreeDB-wired) · **~14 P1** (build the sibling axis module — same proven pattern) · 4 P2 (consolidation) · 6 NA (AI/internal). The cross-CAM pattern is proven 3× (material/holder/alarm); every P1 is a mechanical application of it.

> **Recommended next (logical order, R13):** the P1 modules that REUSE an existing axis first (ToolDB-wire, SpindleDB-taper, ProcessDataDB-ISO — no new taxonomy needed), then the new-taxonomy builds (WorkholdingDB, CollisionDB, VendorCatalogDB, JMDieDocuStrataDB⭐). Pick up via `/loop` over this punch-list.

### 3 verifier overturns (pass-1 corrected by adversarial arm)
- **AlarmDB** PARTIAL→UNCATEGORIZED-in-practice (keys existed only as raw strings) — now fixed.
- **MachineDB** axis refined to machineClass×controllerDialect primary.
- **DecisionTreeDB** "orphan" claim was FALSE — engine is wired.

## Open P2 follow-ups (from per-file scrutiny of the AlarmDB build)
1. `categorizeAlarm` — add `controllerFamilySource: "controller_family"|"family"|"alarm_id"` provenance field (the `family` field does ~90% of the recovery; surfacing the source aids data-quality audits).
2. Add `AlarmRegistry.test.ts` asserting cross-variant lookup (index `"DMG MORI"` → `getByController("DMG_MORI")` resolves). The existing 76 alarm tests do not exercise the registry's index/lookup key-space; reviewer B proved consistency by probe — a test locks it against drift.
3. **Shared controller-family axis** — `controller-family.ts` is THE single source of truth; when GCodeTemplateDB + MachineDB axes are built they must `import` it, not re-derive (ControllerDialectEngine's 6-value `type ControllerFamily` should also align to it).

_Generated by the DB-domain categorization Workflow (juliett). Sibling spec: `TOOL-HOLDER-DB-ORGANIZATION-FOR-ROMEO.md`. Wiki: [[holder-bcv-is-cat-not-bt]]._
