---
name: reference-shop-tool-library-bridge-design-2026-05-27
description: Design notes for U-LATHE-SHOP-TOOL-LIBRARY-BRIDGE — the P0 unit that maps customer T-numbers to ANSI insert codes + vendor grades. Without this the wizard can't validate any real JM-Die program.
type: reference
slot: whiskey
source: prism-memory
synced: 2026-06-09T14:54:10.935Z
aliases: reference_shop_tool_library_bridge_design_2026_05_27
---


# Shop tool-library bridge design

## The gap

ALCOA baseline (iter7) showed 0/11 programs document the insert behind their `T0101` calls. Real shops keep this in:
- **Tool-list sheet** (paper at the machine OR HMI tool-table screen)
- **CAM master** (Mastercam/Fusion/hyperMILL tool library)
- **ERP entry** (per-customer-per-job tool list)

The wizard needs all three reconciled.

## Bridge architecture

```
Customer Job  →  Tool List Source (paper/HMI/CAM/ERP)
                 ↓
                 LatheShopToolLibraryBridge
                 ↓ resolve(customer, jobId, T-number, controller, machineModel) →
                 {
                   ansi_insert: "CNMG-432-PR",      // ISO-style code
                   grade: "KCM35",                   // vendor grade
                   vendor: "Kennametal",
                   geometry: "C",                    // rhombic 80°
                   nose_radius_mm: 0.8,
                   coating: "PVD-TiAlN",
                   life_minutes_at_target_vc: 18,
                   suggested_vc_sfm: [350, 420],     // range
                   suggested_fz_ipr: [0.008, 0.014],
                   iso_group_fit: ["P-30", "M-25"],
                   substitution_options: [
                     "SECO TP2500", "Sandvik 4325", "Walter WPP20S"
                   ]
                 }
```

## Data sources

### Layer 1: Source-of-truth (per customer)
- `JM DIE/<customer>/tool-list.json` (manually curated initially)
- `JM DIE/<customer>/<job>/setup-sheet.pdf` (parsed by lima's pypdf page-by-page extractor)
- Operator HMI tool-table dump (per-machine `.tools` export)

### Layer 2: Cross-customer canonical
- `mcp-server/data/ingestion_cache/lathe-tribal-master-index-2026-05-26.json` (this session — 14 vendors / 87+ grades)
- `lathe-vendor-expansion-2026-05-26.json` (25 tooling brands tier-A + 11 tier-B)
- Manufacturer PDF catalogs in `resources/RESOURCE PDFS/`

### Layer 3: Inferred (fallback)
- Insert ANSI letter from grade-style: `KCM35` → Kennametal "M" series → likely ISO-M fit
- Geometry from common pairings: CNMG with 80° rhombic, DNMG with 55° diamond, etc.
- When confidence <0.5, surface "needs operator confirmation" instead of silent guess

## Resolver fallback chain (R12 fail-loud per leaf)

```
1. Customer+Job exact match → return
2. Customer-only T-number → return + "warning: job-specific override possible"
3. Machine-model heuristic (LB-3000 vs LU-30) → return + "warning: machine-model only"
4. Controller default (Fanuc T0101 conventions) → return + "warning: low-confidence default"
5. NO MATCH → throw + "operator must populate tool-list for this job/T-number"
```

Never silently degrade to "no insert info" — surface the gap loudly.

## Schema (TS interface skeleton — sketched, not implemented)

```ts
interface ShopToolEntry {
  customer: string;
  jobId?: string;
  controller: "fanuc" | "haas" | "okuma" | "mazak" | "doosan";
  machineModel?: string;
  toolNumber: string;            // "T0101", "T0202", etc.

  insertAnsi: string;            // "CNMG-432-PR"
  geometry: "C" | "W" | "D" | "S" | "T" | "V" | "R" | "K";
  noseRadiusMm: number;

  vendor: string;
  grade: string;
  coating: string | null;

  lifeMinutesAtTargetVc: number;
  suggestedVcSfm: [number, number];   // range [min, max]
  suggestedFzIpr: [number, number];
  isoGroupFit: string[];

  substitutionOptions: string[];      // alt grades that fit
  sourceLayer: 1 | 2 | 3;             // which layer answered
  confidence: number;                 // 0..1
}
```

## Integration points

- **Wizard**: `LatheCAMIntelligenceEngine.selectInsert(material, geometry, depth)` calls bridge to get options
- **Quality pipeline**: `validateTools(program)` cross-checks each T-block against bridge entry
- **Cycle-time engine**: `LatheCSSOptimizerEngine` uses `lifeMinutesAtTargetVc` for edge-rotation cadence
- **Substitution advisor**: When inventory lacks the canonical insert, suggest from `substitutionOptions`

## Build sequence (next-session targets)

1. Define `shop-tool-library-bridge.mjs` module + TS interface
2. Seed Layer 2 from existing `lathe-tribal-master-index-2026-05-26.json` (already exists)
3. Stub Layer 1 with empty `{}` map (operator populates per customer)
4. Implement resolver fallback chain
5. Wire `validateTools` in `lathe-quality-pipeline.mjs` to call bridge
6. Wire `LatheCAMIntelligenceEngine.selectInsert` to call bridge
7. Hermetic tests (40+ cases: each layer fallback + each anti-pattern + each ISO group)

## Estimated unblock impact

Closes:
- 0% insert-coverage on ALCOA → 100% (any program with a `T<NN>` block can be validated)
- `validateTools` "dead-loaded" status → functional
- Wizard "can't pick insert without operator hand-feeding" → wizard self-selects from library

## Related

- [[lathe-baseline-ALCOA-2026-05-26]] — surfaced the gap as P0
- [[reference_insert_edge_rotation_strategy_2026_05_27]] — uses bridge output for rotation cadence
- [[reference_lathe_program_quality_rubric_2026_05_27]] — Category C (Tooling) scoring depends on bridge
- [[feedback_use_lima_pypdf_page_extractor]] — for parsing customer setup-sheet PDFs
- `mcp-server/data/ingestion_cache/lathe-tribal-master-index-2026-05-26.json` — Layer 2 seed data
