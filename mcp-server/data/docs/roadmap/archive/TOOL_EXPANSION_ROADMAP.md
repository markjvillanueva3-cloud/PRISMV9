# ════════════════════════════════════════════════════════════════════════════════
# PRISM TOOL DATABASE — MASTER EXPANSION & APP-READINESS ROADMAP v2.0
# ════════════════════════════════════════════════════════════════════════════════
# CLASSIFICATION: MISSION-CRITICAL  |  LIVES DEPEND ON CORRECTNESS
# LOCATION: C:\PRISM\mcp-server\data\docs\roadmap\TOOL_EXPANSION_ROADMAP.md
# COMPANION: TOOL_SCHEMA_NORMALIZATION.md (absorbed into this document)
# SUPERSEDES: v1.0 (2026-02-15)
# ════════════════════════════════════════════════════════════════════════════════
#
# OBJECTIVE: Build the world's most comprehensive open CNC tool database.
#   1. Expand from ~14,000 to 45,000+ tools with COMPLETE cutting data
#   2. Normalize schema for app-grade filtering, search, and indexing
#   3. Build API/query layer for the PRISM App frontend
#   4. Enable real-time tool selection, comparison, and recommendation
#
# WHY THIS MATTERS:
#   - Wrong cutting parameters → tool explosion → operator injury/death
#   - Missing tools → machinist picks wrong substitute → scrap/crash
#   - Bad schema → app can't filter → machinist gives up → uses guesswork
#   - Every number, every field, every unit MUST be verified
#
# ════════════════════════════════════════════════════════════════════════════════

## TABLE OF CONTENTS

  PHASE 0: Schema Normalization & Index Layer (DO FIRST)
  PHASE 1: Turning Tools (biggest gap — 16% → 90%)
  PHASE 2: Solid Round Tools — endmills, drills, taps, reamers (33% → 90%)
  PHASE 3: Indexable Milling — bodies + inserts (5% → 90%)
  PHASE 4: Boring Tools (1% → 90%)
  PHASE 5: Toolholder Completion (84% → 95%)
  PHASE 6: Archive Extraction — 2.4GB split zip + unknown catalogs
  PHASE 7: App Integration Layer — API, search, recommendations
  PHASE 8: Continuous Enrichment — user feedback, wear data, alternatives

## ════════════════════════════════════════════════════════════════════════════════
## CURRENT STATE SNAPSHOT (2026-02-15)
## ════════════════════════════════════════════════════════════════════════════════

  Tools in registry:      13,967
  Estimated target:       45,000+
  Coverage:               ~37%
  Files:                  14 JSON files in C:\PRISM\data\tools\
  Cutting data coverage:  44% (but 6,741 toolholders correctly have none)
  Schema consistency:     POOR — vendor/manufacturer split, field name conflicts
  App-readiness:          NOT READY — no unified index, no filter API

## SOURCE INVENTORY
## ════════════════════════════════════════════════════════════════════════════════

### PDF CATALOGS (C:\PRISM_ARCHIVE_2026-02-01\RESOURCES\MANUFACTURER_CATALOGS\uploaded\)

| Pri | Vendor | File | Size | Type |
|-----|--------|------|------|------|
| P1 | KENNAMETAL | Master Catalog 2018 Vol.1 Turning Tools | 118MB | Turning, boring, grooving, threading |
| P1 | KENNAMETAL | Master Catalog 2018 Vol.2 Rotating Tools | 259MB | Endmills, drills, taps, reamers, indexable |
| P1 | SANDVIK | GC_2023-2024_G_Turning-Grooving | 70MB | Turning inserts, grooving, parting |
| P1 | SANDVIK | GC_2023-2024_G_Milling | 45MB | CoroMill full line + inserts |
| P1 | SANDVIK | GC_2023-2024_G_Drilling | 11MB | CoroDrill full line |
| P1 | SANDVIK | GC_2023-2024_G_Tooling | 12MB | Toolholding systems |
| P1 | SANDVIK | GC_2023-2024_US_* (4 files) | 122MB | US imperial editions |
| P1 | ISCAR | Flash_Solid_catalog_INCH | 86MB | Solid carbide complete |
| P1 | ISCAR | catalog_c010b_full | 99MB | Full Iscar catalog |
| P1 | KORLOY | korloy turning / korloy solid | 136MB | Korean manufacturer |
| P1 | SECO | Turning + Milling + Solid + Threading + Tooling (5 files) | 192MB | Full Seco line |
| P2 | GUHRING | Full catalog + holders | 49MB | Drills, taps, endmills, reamers |
| P2 | OSG | OSG.pdf | 109MB | Taps, drills, endmills, thread mills |
| P2 | MA FORD | Product Catalog vol105 | 161MB | Endmills, drills |
| P2 | BIG DAISHOWA | Vol.5 | 24MB | Complete toolholding |
| P2 | REGO-FIX | Catalogue 2026 ENGLISH | 207MB | Complete toolholding |
| P2 | EMUGE | Katalog 160 | 232MB | Taps, thread mills |
| P2 | ZENI | Full catalog | 182MB | Full line |
| P2 | SGS | Global Catalog v26.1 | 16MB | Endmills |
| P2 | ACCUPRO | 2013 catalog | 42MB | Endmills, drills |
| P2 | GLOBAL CNC | Full 2023 | 53MB | Toolholding |
| P2 | CAMFIX | Full catalog | 53MB | Swiss tooling |
| P2 | UNKNOWN | AMPC_US-EN.pdf | 166MB | Needs identification |
| P2 | UNKNOWN | YU25_America.pdf (likely Mitsubishi) | 386MB | Needs identification |
| P2 | UNKNOWN | TURNING_CATALOG_PART 1.pdf | 203MB | Needs identification |
| P3 | RAPIDKUT | 2018 | 4MB | Budget tools |

### SPLIT ZIP ARCHIVE: MANUFACTURER CATALOGS.zip.017-.099 (~2.4GB compressed)
### EXTRACTED JS FILES: ULTRA V3 (2.6MB), MANUFACTURER_CATALOG_DB (2.4MB), + 8 more
### CAD FILES: TOOL_HOLDER_CAD_FILES\ — STP files with parametric geometry

## ════════════════════════════════════════════════════════════════════════════════
## UNIFIED SCHEMA SPECIFICATION (THE LAW — ALL DATA MUST CONFORM)
## ════════════════════════════════════════════════════════════════════════════════
## This is the single source of truth for field names, types, and validation.
## Every tool in the database MUST have the core fields.
## Category-specific fields are required for that category.
## App indexes are built from these fields — inconsistency breaks the app.
## ════════════════════════════════════════════════════════════════════════════════

### CORE FIELDS (100% of tools — hard requirement):
```
id:               string   — unique, prefixed: EM- TI- TH- DR- TP- RM- BR- SP- MI- IB-
vendor:           string   — normalized manufacturer name (NOT "manufacturer")
catalog_number:   string   — vendor's part number (nullable if generated)
category:         string   — from CANONICAL CATEGORIES below (exactly 14 values)
subcategory:      string   — finer classification within category
type:             string   — specific tool geometry/function
name:             string   — human-readable: "[Vendor] [Series] [Key Specs]"
status:           string   — ACTIVE | DISCONTINUED | SPECIAL_ORDER
data_source:      string   — PDF_EXTRACTION | CATALOG_JS | GENERATED | CAD_SPEC
confidence:       number   — 0.60-0.95 (see Data Quality Tiers)
price_usd:        number   — list price (null if unknown)
```

### CANONICAL CATEGORIES (exactly 14 — app dropdown):
```
SOLID_ENDMILLS        — Square, ball, corner radius, roughing solid endmills
INDEXABLE_MILLING      — Face mill, shoulder mill, high-feed bodies
MILLING_INSERTS        — APKT, RPMT, SEKN, SEKT, SEHT, SNMT, ODMT, XOEX, etc.
SOLID_DRILLS           — Carbide, HSS, through-coolant drills
INDEXABLE_DRILLS        — Indexable and exchangeable-tip drills
TAPS                   — Spiral point, spiral flute, form, thread mills
REAMERS                — Machine, adjustable, shell reamers
TURNING_INSERTS        — CNMG, WNMG, DNMG, CCMT, DCMT + all negative/positive
TURNING_HOLDERS        — OD, ID, grooving, threading holders + boring bars
GROOVING_INSERTS       — Grooving, parting, face grooving inserts
THREADING_INSERTS      — 60°, 55°, API, ACME profile inserts
BORING                 — Fine boring heads, rough boring heads, modular systems
TOOLHOLDERS            — Mill spindle, lathe turret, adapters, collets
SPECIALTY              — Keyseat, dovetail, chamfer, engraving, slot mills
```

### DIMENSIONAL FIELDS BY CATEGORY:

**Solid Round Tools** (SOLID_ENDMILLS, SOLID_DRILLS, TAPS, REAMERS):
```
cutting_diameter_mm:     number  — REQUIRED
shank_diameter_mm:       number  — REQUIRED
flute_count:             number  — REQUIRED
flute_length_mm:         number  — REQUIRED
overall_length_mm:       number  — REQUIRED
helix_angle_deg:         number  — nullable for drills
coating:                 string  — TiAlN, AlTiN, AlCrN, TiN, ZrN, nACo, UNCOATED
substrate:               string  — CARBIDE, MICRO_GRAIN_CARBIDE, HSS, HSS_COBALT, HSS_PM
coolant_through:         boolean — REQUIRED
center_cutting:          boolean — for endmills
variable_helix:          boolean — for endmills
length_class:            string  — STUB | REGULAR | LONG | EXTRA_LONG
corner_radius_mm:        number  — 0 for square, >0 for corner radius/ball
```

**Inserts** (TURNING_INSERTS, MILLING_INSERTS, GROOVING_INSERTS, THREADING_INSERTS):
```
iso_shape:               string  — C, D, S, T, V, W, R, A, L, etc.
iso_shape_angle_deg:     number  — 80, 55, 90, 60, 35, etc.
inscribed_circle_mm:     number  — REQUIRED
thickness_mm:            number  — REQUIRED
corner_radius_mm:        number  — REQUIRED (turning) or null (milling)
chipbreaker_code:        string  — PM, MF, MR, PR, etc.
chipbreaker_application: string  — FINISHING | MEDIUM | ROUGHING | HEAVY_ROUGHING
wiper:                   boolean — wiper geometry (Y/N)
hand:                    string  — RIGHT | LEFT | NEUTRAL
grade_code:              string  — vendor's grade designation (GC4425, KC5025, etc.)
grade_coating_type:      string  — CVD | PVD | UNCOATED | CBN | PCD | CERAMIC
grade_coating_layers:    string  — e.g., "TiCN-Al2O3-TiN"
grade_substrate:         string  — CEMENTED_CARBIDE | CERMET | CBN | PCD | CERAMIC
grade_iso_range:         string  — e.g., "P15-P35" (ISO application range)
grade_first_choice:      array   — ["P_STEELS", "M_STAINLESS"]
cutting_edges:           number  — number of usable edges
```

**Toolholders** (TOOLHOLDERS):
```
spindle_interface:       string  — BT40, CAT40, HSK-A63, VDI30, BMT55, Capto-C5, etc.
tool_interface:          string  — ER25, ER32, MT3, Weldon, etc.
clamping_type:           string  — COLLET | HYDRAULIC | SHRINK_FIT | SIDE_LOCK | etc.
bore_diameter_mm:        number  — nullable
bore_range_mm:           [min,max] — for collet chucks
gauge_length_mm:         number  — from spindle face to tool tip
max_rpm:                 number  — balanced/rated RPM
balance_grade:           string  — G2.5@25000, G6.3@12000, etc.
runout_um:               number  — TIR in micrometers
coolant_through:         boolean
```

**Turning Holders** (TURNING_HOLDERS):
```
holder_style:            string  — MCLNR, DWLNR, PDJNR, etc. (ISO designation)
shank_width_mm:          number  — REQUIRED
shank_height_mm:         number  — REQUIRED  
overall_length_mm:       number  — REQUIRED
compatible_inserts:      array   — ["CNMG", "CNMX"] insert shapes
approach_angle_deg:      number  — 95°, 93°, 75°, etc.
hand:                    string  — RIGHT | LEFT
clamping_system:         string  — P, M, S, C (ISO)
```

**Boring** (BORING):
```
bore_range_mm:           [min,max] — boring diameter range
adjustment_resolution_mm: number  — 0.01 for fine, 0.1 for rough  
shank_diameter_mm:       number  — for boring bars
max_overhang_xD:         number  — maximum L/D ratio
anti_vibration:          boolean — dampened bar
compatible_inserts:      array   — insert shapes
achievable_tolerance:    string  — IT5, IT6, IT7, etc.
```

### CUTTING DATA SCHEMA (MANDATORY for all cutting tools):
```
cutting_data: {
  "P_STEELS": {
    // Common to all tool types:
    "vc_min": number,       // m/min — minimum recommended
    "vc_rec": number,       // m/min — recommended (start here)
    "vc_max": number,       // m/min — maximum aggressive
    "coolant": string,      // FLOOD | MQL | DRY | AIR_BLAST
    
    // TURNING/BORING (feed per revolution):
    "fn_finish": [min, max],   // mm/rev — finishing feed range
    "fn_medium": [min, max],   // mm/rev — medium feed range
    "fn_rough":  [min, max],   // mm/rev — roughing feed range
    "ap_finish": [min, max],   // mm — finishing depth of cut
    "ap_medium": [min, max],   // mm — medium depth of cut
    "ap_rough":  [min, max],   // mm — roughing depth of cut
    
    // MILLING (feed per tooth):
    "fz_min": number,          // mm/tooth
    "fz_rec": number,          // mm/tooth
    "fz_max": number,          // mm/tooth
    "ae_slot_xD": number,      // radial engagement for slotting (fraction of D)
    "ae_finish_xD": number,    // radial engagement for finishing
    "ae_rough_xD": number,     // radial engagement for roughing/HEM
    "ap_slot_xD": number,      // axial depth for slotting (fraction of D)
    "ap_finish_xD": number,    // axial depth for finishing
    "ap_rough_xD": number,     // axial depth for roughing/HEM
    "ramp_max_deg": number,    // max ramp angle (degrees)
    
    // DRILLING (feed per revolution):
    "fn_min": number,          // mm/rev
    "fn_rec": number,          // mm/rev
    "fn_max": number,          // mm/rev
    "peck_depth_xD": number,   // peck depth as fraction of diameter
    
    // TAPPING:
    "vc_rec": number,          // m/min (typically 5-30)
    "percent_thread": number   // 65, 70, or 75
  },
  "M_STAINLESS": { ... },
  "K_CAST_IRON": { ... },
  "N_NONFERROUS": { ... },
  "S_SUPERALLOYS": { ... },
  "H_HARDENED": { ... }
}

MATERIAL GROUP KEYS (exactly 6 — app filter dropdown):
  P_STEELS       — Carbon, alloy, tool steels (ISO P)
  M_STAINLESS    — Austenitic, duplex, martensitic, PH (ISO M)
  K_CAST_IRON    — Gray, ductile, CGI, white (ISO K)
  N_NONFERROUS   — Aluminum, copper, brass, plastics (ISO N)
  S_SUPERALLOYS  — Titanium, Inconel, Waspaloy, cobalt (ISO S)
  H_HARDENED     — Hardened steel >45 HRC, chilled cast iron (ISO H)
```

### CUTTING DATA VALIDATION HARD BLOCKS:
```
IF ANY OF THESE FAIL → DO NOT SAVE THE TOOL → FIX THE DATA FIRST

Material     vc range (m/min)    Typical        If violated, likely cause
─────────    ────────────────    ───────        ─────────────────────────
P_STEELS     50 – 600           200-350        Inch/metric confusion or wrong material
M_STAINLESS  30 – 400           120-220        
K_CAST_IRON  50 – 500           150-300        
N_NONFERROUS 100 – 5000         500-1500       If >3000, verify it's diamond/PCD
S_SUPERALLOYS 10 – 150          25-50          If >80, verify not stainless
H_HARDENED   30 – 350           80-180         If >250, verify it's CBN

Feed validation:
  Turning fn: 0.02 – 1.5 mm/rev     (if >1.0, verify heavy roughing)
  Milling fz: 0.005 – 0.50 mm/tooth (if >0.20, verify high-feed cutter)
  Drilling fn: 0.01 – 0.80 mm/rev   (if >0.50, verify indexable)
  Tapping vc: 2 – 50 m/min          (if >30, verify carbide or form tap)
  
UNIT CONFUSION KILLS:
  SFM → m/min: multiply by 0.3048
  IPR → mm/rev: multiply by 25.4
  IPT → mm/tooth: multiply by 25.4
  inches → mm: multiply by 25.4
  
  VERIFY: If vc for P25 steel is 800-1100, it's SFM not m/min — CONVERT
  VERIFY: If fn is 0.008-0.015, it's IPR not mm/rev — CONVERT
```

## ════════════════════════════════════════════════════════════════════════════════
## PHASE 0: SCHEMA NORMALIZATION & INDEX LAYER (DO FIRST — 1-2 sessions)
## ════════════════════════════════════════════════════════════════════════════════
## WHY FIRST: Without this, every tool we add makes the mess worse.
## Every subsequent phase writes data conforming to the unified schema.
## ════════════════════════════════════════════════════════════════════════════════

### Step 0-1: Registry Normalization Layer
```
FILE: C:\PRISM\mcp-server\src\registries\ToolRegistry.ts

ADD to the load path (normalize on ingest):
  a. If tool has "manufacturer" but no "vendor" → copy to "vendor"
  b. If tool has "cutting_params" but no "cutting_data" → rename
  c. If tool has "chip_breaker" (boolean) → rename to "has_chipbreaker"
  d. If tool has "chipbreaker" (string) → rename to "chipbreaker_code"
  e. Compute "primary_diameter_mm":
     - SOLID_ENDMILLS/SOLID_DRILLS: cutting_diameter_mm
     - *_INSERTS: inscribed_circle_mm
     - TOOLHOLDERS: bore_diameter_mm
     - BORING: bore_range_mm[0] (minimum)
     - INDEXABLE_*: cutting_diameter_mm
  f. Remap old categories to canonical 14:
     MILLING → split into SOLID_ENDMILLS (has flute_count) / INDEXABLE_MILLING (has insert_count)
     TURNING → split into TURNING_INSERTS (has iso_shape) / TURNING_HOLDERS (has shank_width_mm)
     TOOLHOLDING → merge into TOOLHOLDERS
     DRILLING → SOLID_DRILLS (has flute_count) / INDEXABLE_DRILLS (has compatible_inserts)
     INSERTS → route to TURNING_INSERTS / MILLING_INSERTS by iso_shape analysis
  g. Normalize vendor names: "Sandvik Coromant" = "Sandvik" = "SANDVIK" → "Sandvik Coromant"
  
VALIDATION: After normalization, every tool MUST have:
  [x] id, vendor, category (from canonical 14), name, status, confidence
```

### Step 0-2: In-Memory Index Builder
```
FILE: C:\PRISM\mcp-server\src\registries\ToolIndex.ts (NEW FILE)

Build indexes on first load, refresh on data change:

PRIMARY INDEXES (O(1) lookup):
  categoryIndex:     Map<string, Set<string>>          // category → tool IDs
  vendorIndex:       Map<string, Set<string>>          // vendor → tool IDs
  subcategoryIndex:  Map<string, Set<string>>          // subcategory → tool IDs
  coatingIndex:      Map<string, Set<string>>          // coating → tool IDs
  substrateIndex:    Map<string, Set<string>>          // substrate → tool IDs
  spindleIndex:      Map<string, Set<string>>          // spindle_interface → tool IDs
  gradeIndex:        Map<string, Set<string>>          // grade_code → tool IDs
  isoShapeIndex:     Map<string, Set<string>>          // iso_shape → tool IDs
  
RANGE INDEXES (binary search):
  diameterIndex:     SortedMap<number, Set<string>>    // diameter → tool IDs
  priceIndex:        SortedMap<number, Set<string>>    // price → tool IDs
  fluteCountIndex:   Map<number, Set<string>>          // flute count → tool IDs

BOOLEAN INDEXES:
  hasCuttingData:    Set<string>                       // tool IDs with cutting_data
  coolantThrough:    Set<string>                       // tool IDs with coolant
  centerCutting:     Set<string>                       // tool IDs with center cutting

FULL-TEXT:
  nameTokens:        Map<string, Set<string>>          // token → tool IDs
  catalogNumberMap:  Map<string, string>               // catalog_number → tool ID (exact)

FACETS (for app filter counts):
  categoryFacets:    Map<string, number>               // category → count
  vendorFacets:      Map<string, number>               // vendor → count
  coatingFacets:     Map<string, number>               // coating → count
  materialFacets:    Map<string, number>               // material groups with data → count
```

### Step 0-3: Query API via prism_data Dispatcher
```
FILE: C:\PRISM\mcp-server\src\dispatchers\DataDispatcher.ts

NEW ACTIONS (add to existing dispatcher):

  tool_search:
    Input: {
      query?: string,              // full-text search on name + catalog_number
      category?: string,           // exact match from canonical 14
      vendor?: string,             // exact or fuzzy match
      diameter_min?: number,       // mm
      diameter_max?: number,       // mm
      coating?: string,
      substrate?: string,
      material_group?: string,     // filter to tools with cutting data for this group
      spindle_interface?: string,  // for toolholders
      iso_shape?: string,          // for inserts
      flute_count?: number,
      has_cutting_data?: boolean,
      coolant_through?: boolean,
      min_confidence?: number,
      sort_by?: string,            // "name" | "price" | "diameter" | "confidence"
      limit?: number,              // default 20, max 100
      offset?: number              // for pagination
    }
    Output: {
      total: number,
      tools: Tool[],
      facets: {                    // for dynamic filter dropdowns
        categories: { name: string, count: number }[],
        vendors: { name: string, count: number }[],
        coatings: { name: string, count: number }[],
        materials: { name: string, count: number }[]
      }
    }

  tool_compare:
    Input: { tool_ids: string[] }  // 2-5 tool IDs
    Output: {
      tools: Tool[],
      comparison_matrix: {         // side-by-side specs
        field: string,
        values: (string|number|null)[]
      }[],
      cutting_data_matrix: {       // side-by-side cutting data per material
        material: string,
        tools: { id: string, vc_rec: number, fz_or_fn_rec: number }[]
      }[]
    }

  tool_recommend:
    Input: {
      operation: string,           // "FACE_MILLING" | "SHOULDER_MILLING" | "OD_TURNING" | etc.
      material_group: string,      // "P_STEELS" | "M_STAINLESS" | etc.
      material_hardness_hrc?: number,
      diameter_mm?: number,        // desired cutting diameter
      depth_mm?: number,           // depth of cut
      machine_spindle?: string,    // "BT40" | "CAT40" | etc. (filters compatible holders)
      machine_max_rpm?: number,
      budget?: string              // "ECONOMY" | "STANDARD" | "PREMIUM"
    }
    Output: {
      recommended: Tool[],         // ranked by suitability
      reasoning: string[],         // why each was chosen
      cutting_parameters: {        // ready-to-use parameters
        tool_id: string,
        vc: number, rpm: number,
        feed_rate_mm_min: number,
        depth_of_cut_mm: number,
        width_of_cut_mm: number,
        coolant: string
      }[],
      compatible_holders: Tool[]   // matching toolholders for the spindle
    }

  tool_alternatives:
    Input: { tool_id: string }
    Output: {
      original: Tool,
      alternatives: {
        tool: Tool,
        match_score: number,       // 0-1 similarity
        differences: string[],     // what's different
        price_comparison: string   // "CHEAPER" | "SAME" | "MORE_EXPENSIVE"
      }[]
    }

  tool_facets:
    Input: { category?: string }   // optional filter
    Output: {
      categories: { name: string, count: number }[],
      vendors: { name: string, count: number }[],
      coatings: { name: string, count: number }[],
      substrates: { name: string, count: number }[],
      spindle_interfaces: { name: string, count: number }[],
      iso_shapes: { name: string, count: number }[],
      diameter_range: { min: number, max: number },
      price_range: { min: number, max: number },
      total_tools: number,
      tools_with_cutting_data: number
    }
```

### Step 0-4: Migration Script (run once)
```
FILE: C:\PRISM\mcp-server\scripts\migrate_tool_schema.js

PROCESS:
  1. Read all 14 existing JSON files
  2. For each tool, apply normalization rules from Step 0-1
  3. Re-categorize into canonical 14 categories
  4. Write new files with canonical names
  5. Verify: count before = count after (zero loss)
  6. Verify: all tools have core fields
  7. Keep old files as .bak for rollback
  
OUTPUT FILES (new canonical naming):
  SOLID_ENDMILLS.json
  INDEXABLE_MILLING.json
  MILLING_INSERTS.json
  SOLID_DRILLS.json
  INDEXABLE_DRILLS.json
  TAPS.json
  REAMERS.json
  TURNING_INSERTS.json
  TURNING_HOLDERS.json
  GROOVING_INSERTS.json
  THREADING_INSERTS.json
  BORING.json
  TOOLHOLDERS.json
  SPECIALTY.json
```

### Phase 0 Completion Criteria:
```
□ ToolRegistry normalizes all fields on load
□ ToolIndex builds primary + range + boolean indexes
□ tool_search returns results with facets
□ tool_compare works for 2-5 tools side-by-side
□ tool_recommend returns ranked results with parameters
□ tool_facets returns dynamic filter counts
□ Migration script converts all existing data
□ Zero data loss during migration
□ npm run build clean
□ All 14 canonical files present
```

## ════════════════════════════════════════════════════════════════════════════════
## PHASE 1: TURNING TOOLS — THE BIGGEST GAP (16% → 90%)
## ════════════════════════════════════════════════════════════════════════════════
## TARGET: 14,100 turning entries (currently ~2,400)
## SOURCES: Kennametal Vol.1, Sandvik G_Turning-Grooving, Seco Turning, Korloy
## PRIORITY: Highest — turning is 40% of all CNC operations
## SESSION ESTIMATE: 4-6 sessions
## ════════════════════════════════════════════════════════════════════════════════

### 1A: Negative Turning Inserts (~6,000 entries)

Every shop uses CNMG/WNMG/DNMG daily. These are the bread and butter.

**Step 1A-1: Sandvik turning inserts from GC_2023-2024_G_Turning-Grooving.pdf**
```
EXTRACT: Every CNMG, WNMG, DNMG, VNMG, TNMG, SNMG listed
FOR EACH: ISO code, IC, thickness, corner radius, chipbreaker, wiper
FOR EACH: ALL grades (GC4425, GC4415, GC4335, GC2220, etc.)
FOR EACH GRADE: coating type, ISO range, first-choice materials
CUTTING DATA: vc per material group (P1-P12, M1-M5, K1-K7, N, S, H)
              fn ranges for finish/medium/rough
              ap ranges for finish/medium/rough
SOURCE UNIT: METRIC (G catalog) — verify vc ~250-350 m/min for P25 steel
OUTPUT: Conform to UNIFIED SCHEMA → TURNING_INSERTS category
ESTIMATED YIELD: ~1,500 entries (6 shapes × 5 sizes × 5 chipbreakers × 10 grades)
```

**Step 1A-2: Kennametal turning inserts from Vol.1 (118MB)**
```
EXTRACT: Beyond series CNMG/WNMG/DNMG/VNMG/TNMG/SNMG
GRADES: KC5010 (P10), KC5025 (P25), KC5040 (P40), KC9110 (PVD P15), KC9125
CHIPBREAKERS: FP (finish), MP (medium), RP (rough), HP (heavy rough)
SOURCE UNIT: IMPERIAL — MUST CONVERT:
  SFM × 0.3048 → m/min (verify 800 SFM × 0.3048 = 244 m/min ✓)
  IPR × 25.4 → mm/rev (verify 0.012 IPR × 25.4 = 0.305 mm/rev ✓)
  inches × 25.4 → mm
  IF CONVERTED vc > 600 m/min for steel: STOP. CONVERSION ERROR.
ESTIMATED YIELD: ~1,200 entries
```

**Step 1A-3: Seco turning inserts from Turning 2018.1.pdf (53MB)**
```
GRADES: TP1501 (P15 CVD), TP2501 (P25 CVD), TP3501 (P35 CVD)
        TM1501 (M15 PVD), TM2001 (M20 PVD)
        TK1501 (K15 CVD), TK2001 (K20 CVD)
CHIPBREAKERS: MF1 (finish), M3 (medium), M5 (medium-rough), R3 (rough)
ESTIMATED YIELD: ~1,000 entries
```

**Step 1A-4: Korloy turning inserts from korloy turning.pdf (43MB)**
```
GRADES: NC3225 (P25), NC3220 (P20), NC3120 (P15 PVD)
        PC5300 (P30), PC9030 (M30), GK1135 (K15)
ESTIMATED YIELD: ~800 entries
```

**Step 1A-5: Remaining vendors from ULTRA V3 + MANUFACTURER_CATALOG_DB**
```
VENDORS: Iscar, Walter, Tungaloy, Mitsubishi, Kyocera, Sumitomo
These exist as structured JS — parse and expand into individual entries.
ESTIMATED YIELD: ~1,500 entries
```

**Step 1A-6: Dedup, validate, merge**
```
Run validation against HARD BLOCKS. Zero tolerance.
Merge into TURNING_INSERTS.json conforming to unified schema.
```

### 1B: Positive Turning Inserts (~1,500 entries)
```
SHAPES: CCMT, DCMT, VCMT, TCMT, RCMT, SCMT
SAME process as 1A. These are positive-rake for finishing and boring.
Smaller IC sizes (6.35mm, 9.525mm), lighter cuts, better finish.
Different speed/feed recommendations than negative inserts.
```

### 1C: Grooving & Parting Inserts (~800 entries)
```
CURRENTLY: 0 entries — completely empty
SOURCES: Sandvik CoroCut 1-2/QD/XS, Kennametal Top-Notch, Iscar TANG-GRIP
CRITICAL DATA: groove width (2-6mm), max depth, parting diameter limits
FEED NOTES: grooving uses lower feed than turning — typically 0.05-0.15 mm/rev
```

### 1D: Threading Inserts (~500 entries)
```
CURRENTLY: 0 entries — completely empty
PROFILES: 60° (UN/Metric), 55° (BSP/BSPT), API, ACME, Buttress
PITCHES: 0.5mm-6mm metric, 4-40 TPI imperial
VENDORS: Sandvik CoroThread 266, Kennametal, Iscar, Carmex
CRITICAL DATA: thread profile, pitch range, full/partial, infeed method
```

### 1E: Turning Holders Expansion (~800 entries)
```
ADD: More shank sizes (10-50mm), left-hand variants, internal bars
ADD: Grooving blade holders, threading holders, face groove holders
TARGET: 2,000 total (currently 681)
```

### Phase 1 Completion Criteria:
```
□ TURNING_INSERTS.json:     10,000+ entries (from 1,710)
□ GROOVING_INSERTS.json:    800+ entries (from 0)
□ THREADING_INSERTS.json:   500+ entries (from 0)
□ TURNING_HOLDERS.json:     2,000+ entries (from 681)
□ Every insert has cutting_data for ≥2 material groups
□ Every insert has dimensional data (IC, thickness, corner_radius)
□ Every insert has grade info (coating type, substrate, ISO range)
□ All units metric, validated against HARD BLOCKS
□ npm run build clean, registry loads without errors
```

## ════════════════════════════════════════════════════════════════════════════════
## PHASE 2: SOLID ROUND TOOLS — ENDMILLS, DRILLS, TAPS, REAMERS (33% → 90%)
## ════════════════════════════════════════════════════════════════════════════════
## TARGET: 12,200 entries (currently ~3,500)
## SOURCES: Kennametal Vol.2, Sandvik Milling/Drilling, Guhring, OSG, MA Ford,
##          Seco Solid End Mills, Iscar Flash Solid, SGS, Harvey, Helical, Korloy
## SESSION ESTIMATE: 4-6 sessions
## ════════════════════════════════════════════════════════════════════════════════

### 2A: Solid Carbide End Mills (~6,000 entries)

**Step 2A-1: Expansion matrix per vendor**
```
FOR EACH VENDOR (15 vendors):
  FOR EACH SERIES (5-15 per vendor):
    FOR EACH DIAMETER (metric: 1-32mm, inch: 1/8"-1"):
      FOR EACH FLUTE COUNT (2F, 3F, 4F, 5F, 6F):
        FOR EACH LENGTH (stub, regular, long, extra-long):
          CREATE ENTRY with cutting data per material group

CUTTING DATA PER ENDMILL (what the machinist needs):
  - vc (m/min): surface speed
  - fz (mm/tooth): feed per tooth — NOT per rev, NOT mm/min
  - ae_max (×D): max radial engagement
  - ap_max (×D): max axial engagement
  - ramp_max_deg: max ramp angle
  - coolant recommendation

CRITICAL: Endmills use fz (per tooth), NOT fn (per rev)
  Typical fz for steel: 0.02-0.20 mm/tooth
  If you see fz > 0.5 → that's probably fn (per rev) — DIVIDE by flute count
  vc for steel endmill: 80-250 m/min (LOWER than turning inserts)
```

**Step 2A-2: Vendor extraction order**
```
1. KENNAMETAL Vol.2 (259MB): HARVI I TE/II/III/Ultra 8X/Mini → IMPERIAL, CONVERT
2. SANDVIK CoroMill Plura from G_Milling: HD, HFS, General → METRIC
3. ISCAR Flash Solid (86MB): Multi-Master, Chatterfree, FINISHRED → IMPERIAL
4. SECO Solid End Mills (39MB): Jabro JHP, Solid², HFM, Mini → METRIC
5. GUHRING (48MB): RF 100, G-Mold, 3684/3688 → METRIC
6. OSG (109MB): A Brand, Phoenix, AERO, WXL → METRIC/IMPERIAL mixed
7. MA FORD (161MB): TuffCut GP/XT/Inox → IMPERIAL
8. SGS (16MB): Z-Carb, S-Carb → METRIC
9. HARVEY: Specialty miniature, keyseat, dovetail
10. HELICAL: HVTI, H35AL, H45HV, HEV variable helix
11. KORLOY Solid (93MB): AEMS, AEMD, AEMH
12. ACCUPRO (42MB): General purpose line
13. ZENI (182MB): Value line
14. RAPIDKUT (4MB): Budget
15. Extract remaining from ULTRA V3 unconverted sections
```

### 2B: Solid Carbide Drills (~2,000 entries)
```
TYPES: stub (3×D), regular (5×D), long (8×D), extra-long (12×D),
       through-coolant, flat-bottom, step drills
DIAMETERS: 1.0-25.0mm (0.5mm steps) + #80-#1 number + A-Z letter + fractional
DRILLING uses fn (mm/rev) NOT fz (mm/tooth)
SOURCES: Guhring (best drill catalog), Sandvik CoroDrill, Kennametal, OSG
```

### 2C: Taps (~800 entries)
```
TYPES: spiral point (through), spiral flute (blind), form/roll, thread mills
THREAD FORMS: UN (UNC/UNF), Metric (coarse/fine), BSP, NPT
SIZES: M2-M30, #2-3/4"
TAPPING vc is MUCH LOWER: 5-30 m/min for HSS in steel
SOURCES: OSG (world leader), Emuge (232MB catalog), Guhring, Kennametal
```

### 2D: Reamers (~400 entries)
```
TYPES: carbide machine, HSS chucking, adjustable, shell
SIZES: 3-50mm in H6/H7/H8 tolerances
vc typically 50-80% of drill speed, fn 2-3× drill feed
```

### Phase 2 Completion Criteria:
```
□ SOLID_ENDMILLS.json:  8,000+ entries (from ~2,900)
□ SOLID_DRILLS.json:    3,000+ entries (from 360)
□ TAPS.json:            800+ entries (from 126)
□ REAMERS.json:         400+ entries (from 189)
□ Every tool has cutting_data for ≥3 material groups
□ Endmills use fz (mm/tooth), drills/taps use fn (mm/rev)
□ All imperial data converted and verified
□ npm run build clean
```

## ════════════════════════════════════════════════════════════════════════════════
## PHASE 3: INDEXABLE MILLING — BODIES + INSERTS (5% → 90%)
## ════════════════════════════════════════════════════════════════════════════════
## TARGET: 3,500 entries (currently ~1,100)
## SESSION ESTIMATE: 2-3 sessions
## ════════════════════════════════════════════════════════════════════════════════

### 3A: Milling Inserts (~1,000 entries)
```
SHAPES: APKT/APMT (90° shoulder), RPMT/RCKT (round), SEKN/SEKT (square 45°),
        SEHT (square positive), SNMT (economy), ODMT/XOEX (multi-edge),
        LOGU (tangential), LNMT (helical), R390 (Sandvik)
FOR EACH: sizes, chipbreakers, grades, cutting data per material
Milling inserts use fz (per tooth) — same as endmills
```

### 3B: Milling Body Expansion (~600 entries)
```
TYPES: face mills (45°/65°/90°), shoulder mills, high-feed, disc/slot, T-slot
SIZES: 10-315mm
COUPLINGS: arbor, screw-on, Capto, Weldon, shell
VENDORS: Sandvik, Kennametal, Iscar, Seco, Walter, Tungaloy, Ingersoll
```

### 3C: Specialty Milling (~400 entries)
```
TYPES: slot mills, T-slot cutters, thread mills, chamfer mills
Each with cutting data per material
```

## ════════════════════════════════════════════════════════════════════════════════
## PHASE 4: BORING TOOLS — NEARLY EMPTY (1% → 90%)
## ════════════════════════════════════════════════════════════════════════════════
## TARGET: 600 entries (currently 8)
## SESSION ESTIMATE: 1-2 sessions
## ════════════════════════════════════════════════════════════════════════════════

### 4A: Boring Bars (~300 entries)
```
TYPES: steel shank (4-10×D), carbide shank (up to 14×D),
       anti-vibration/Silent Tools (up to 14×D), modular Capto (C3-C8)
BORING CUTTING DATA RULES:
  vc: 70-90% of OD turning recommendations
  fn: 50-80% of OD turning (chatter-prone)
  ap derates with overhang: 4×D=100%, 6×D=75%, 8×D=50%, 10×D=30%
SOURCES: Sandvik Silent Tools, Kennametal A/E-Series, Big Daishowa
```

### 4B: Boring Heads (~200 entries)
```
Fine boring (0.01mm adjust): Kaiser, Big Daishowa, Romicron
Rough boring (0.1mm adjust): Wohlhaupter, Kennametal
Twin-cutter production heads
Ranges: 6-250mm bore
```

### 4C: Modular Boring Systems (~100 entries)
```
Sandvik CoroBore, Kennametal, Big Daishowa
Assembly: coupling + extension + cartridge + insert
```

## ════════════════════════════════════════════════════════════════════════════════
## PHASE 5: TOOLHOLDER COMPLETION + WORKHOLDING (84% → 98%)
## ════════════════════════════════════════════════════════════════════════════════
## TARGET: 8,000 entries (currently 6,741)
## SESSION ESTIMATE: 1-2 sessions
## ════════════════════════════════════════════════════════════════════════════════

### 5A: Big Daishowa complete extraction from Vol.5 PDF (24MB)
### 5B: Rego-Fix complete extraction from 2026 catalog (207MB)
### 5C: Additional vendors (Nikken, NT Tool, MST, Briney, Maritool)
### 5D: Workholding (vises, chucks, collet chucks, fixture plates)

## ════════════════════════════════════════════════════════════════════════════════
## PHASE 6: ARCHIVE EXTRACTION + UNKNOWN CATALOGS
## ════════════════════════════════════════════════════════════════════════════════
## TARGET: Variable — could add 5,000-15,000 tools
## SESSION ESTIMATE: 2-4 sessions
## ════════════════════════════════════════════════════════════════════════════════

### 6A: Reassemble split zip (MANUFACTURER CATALOGS.zip.017-.099)
```
~80 parts × 30MB = 2.4GB compressed
1. Verify all parts present (check for gaps in numbering)
2. Reassemble with 7-Zip
3. Extract PDFs
4. Identify each by manufacturer
5. Process per Phases 1-5 patterns
```

### 6B: Identify unknown catalogs
```
AMPC_US-EN.pdf (166MB) — read first 5 pages, identify vendor
YU25_America.pdf (386MB) — likely Mitsubishi (YU25 is a grade code)
TURNING_CATALOG_PART 1.pdf (203MB) — read first page, identify
```

### 6C: Extract newly discovered catalogs
```
Follow same patterns as Phases 1-5
```

## ════════════════════════════════════════════════════════════════════════════════
## PHASE 7: APP INTEGRATION LAYER — UI, API, REAL-TIME ENGINE
## ════════════════════════════════════════════════════════════════════════════════
## This is where the database becomes a PRODUCT.
## Everything before this was building the engine. This is the cockpit.
## SESSION ESTIMATE: 6-10 sessions
## ════════════════════════════════════════════════════════════════════════════════

### 7A: Tool Explorer — Browse & Search UI

**What the machinist sees:**
```
┌─────────────────────────────────────────────────────────────────────┐
│ PRISM Tool Explorer                                    🔍 Search   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ CATEGORIES         FILTERS              RESULTS (2,341 of 45,000)  │
│ ┌───────────┐     ┌──────────────┐     ┌───────────────────────┐   │
│ │ ▸ Endmills│     │ Vendor    ▾  │     │ Sandvik CNMG120408-PM │   │
│ │ ▸ Drills  │     │ Coating   ▾  │     │ GC4425 • P25 • CVD    │   │
│ │ ▸ Taps    │     │ Material  ▾  │     │ vc: 325 m/min • $18.50│   │
│ │ ▾ Turning │     │ Diameter  ▾  │     ├───────────────────────┤   │
│ │   Inserts │     │ ├ 6mm-12mm │     │ Kennametal Beyond CNMG │   │
│ │   Holders │     │ Price     ▾  │     │ KC5025 • P25 • CVD    │   │
│ │   Grooving│     │ Confidence▾  │     │ vc: 300 m/min • $16.00│   │
│ │ ▸ Milling │     │ ☑ Has data  │     ├───────────────────────┤   │
│ │ ▸ Boring  │     │ ☑ Coolant   │     │ Seco CNMG120408-M3    │   │
│ │ ▸ Holders │     └──────────────┘     │ TP2501 • P25 • CVD    │   │
│ │ ▸ Special │                          │ vc: 310 m/min • $15.00│   │
│ └───────────┘                          └───────────────────────┘   │
│                                                                     │
│ [Compare Selected (3)]  [Get Parameters]  [Find Alternatives]      │
└─────────────────────────────────────────────────────────────────────┘

IMPLEMENTATION:
  Backend: tool_search API from Phase 0-3
  Frontend: React component with:
    - Left: Category tree (collapsible, with counts)
    - Middle: Faceted filters (dynamic counts update on each selection)
    - Right: Result cards with key specs visible at glance
    - Pagination: 20 results per page, infinite scroll optional
    - Sort: by name, price, diameter, confidence, relevance
    
  FACETED FILTER BEHAVIOR:
    When user selects "Vendor: Sandvik" → all other filters update counts
    to show only Sandvik-compatible options. If "Coating: TiAlN" has 0
    Sandvik tools → gray it out, don't hide it.
    
  SEARCH: Tokenized full-text on name + catalog_number
    "CNMG 12" → matches CNMG120404, CNMG120408, CNMG120412
    "harvi 10mm" → matches Kennametal HARVI series Ø10
    "4 flute tialn 1/2" → matches 4F TiAlN 12.7mm endmills
```

### 7B: Tool Detail View — The Full Spec Sheet

**What the machinist sees when they click a tool:**
```
┌─────────────────────────────────────────────────────────────────────┐
│ Sandvik CNMG 12 04 08-PM GC4425                                   │
│ Turning Insert • Negative • 80° Diamond                ★ Premium  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ SPECIFICATIONS              │ CUTTING DATA                         │
│ ─────────────               │ ──────────                           │
│ IC: 12.7mm                  │ Material    vc      fn      ap      │
│ Thickness: 4.76mm           │ ─────────   ──────  ──────  ─────   │
│ Corner R: 0.8mm             │ P Steel     325     0.25    3.0     │
│ Chipbreaker: PM (Medium)    │ M Stain     200     0.20    2.5     │
│ Grade: GC4425 (CVD P15-P35)│ K Cast      280     0.30    3.5     │
│ Coating: TiCN-Al2O3-TiN    │ N Alum      800     0.35    4.0     │
│ Edges: 4                    │ S Super     40      0.12    1.5     │
│ Wiper: No                   │ H Hard      120     0.15    1.0     │
│ Hand: Neutral               │                                      │
│                              │ [Calculate RPM & Feed Rate]          │
│ COMPATIBLE HOLDERS:          │ Ø___mm  Material: [▾ P Steel]       │
│ DCLNR, MCLNR, PCLNR        │ → RPM: 8,145  Feed: 2,036 mm/min   │
│                              │                                      │
│ Price: $18.50  │ Confidence: 95% │ Source: Sandvik GC 2023-2024   │
│                                                                     │
│ [Find Alternatives] [Compare With...] [Add to Tool List] [Export] │
└─────────────────────────────────────────────────────────────────────┘

IMPLEMENTATION:
  Backend: tool_search (by ID) + tool_alternatives + tool_recommend (for holders)
  Frontend:
    - Hero section: name, key identifiers, quality tier badge
    - Spec columns: dimensional on left, cutting data table on right
    - Inline calculator: enter workpiece Ø and material → instant RPM + feed
      RPM = (vc × 1000) / (π × D)
      Feed = RPM × fn (turning) or RPM × fz × flutes (milling)
    - Compatible holders: pre-filtered by insert shape, linked to holder detail
    - Alternatives: ranked by similarity score with price comparison
    - Actions: compare, add to list, export to CSV/PDF
    
  RPM/FEED CALCULATOR — THE KILLER FEATURE:
    This is why machinists will use the app. They select the tool,
    enter their workpiece diameter and material, and get EXACT parameters.
    The math is trivial but having it pre-loaded with verified data is gold.
    
    For turning:  RPM = (vc × 1000) / (π × workpiece_diameter_mm)
                  Feed = RPM × fn_rec (mm/min)
    For milling:  RPM = (vc × 1000) / (π × tool_diameter_mm)
                  Feed = RPM × fz_rec × flute_count (mm/min)
    For drilling: RPM = (vc × 1000) / (π × drill_diameter_mm)
                  Feed = RPM × fn_rec (mm/min)
    
    SAFETY: Display warning if RPM exceeds machine max or holder rating
    SAFETY: Display warning if feed seems aggressive (>80% of max)
    SAFETY: Display "VERIFY BEFORE USE" if confidence < 0.80
```

### 7C: Tool Comparison — Side-by-Side

**Machinist selects 2-5 tools and sees:**
```
┌─────────────────────────────────────────────────────────────────────┐
│ COMPARE: 3 Turning Inserts for P25 Steel                          │
├──────────────┬──────────────┬──────────────┬──────────────────────┤
│              │ Sandvik      │ Kennametal   │ Seco                 │
│              │ CNMG-PM      │ Beyond CNMG  │ CNMG-M3             │
│              │ GC4425       │ KC5025       │ TP2501               │
├──────────────┼──────────────┼──────────────┼──────────────────────┤
│ vc (P Steel) │ 325 m/min    │ 300 m/min    │ 310 m/min    ◀ BEST │
│ fn (medium)  │ 0.20-0.35    │ 0.18-0.32    │ 0.20-0.33           │
│ ap (medium)  │ 1.5-4.0mm    │ 1.5-3.5mm    │ 1.5-4.0mm           │
│ Coating      │ CVD 3-layer  │ CVD 3-layer  │ CVD 3-layer         │
│ IC           │ 12.7mm       │ 12.7mm       │ 12.7mm              │
│ Corner R     │ 0.8mm        │ 0.8mm        │ 0.8mm               │
│ Edges        │ 4            │ 4            │ 4                    │
│ Price        │ $18.50       │ $16.00 ◀    │ $15.00 ◀ CHEAPEST   │
│ Cost/Edge    │ $4.63        │ $4.00        │ $3.75                │
│ Confidence   │ 95%          │ 92%          │ 90%                  │
├──────────────┼──────────────┼──────────────┼──────────────────────┤
│ VERDICT      │ Fastest cut  │ Good balance │ Best value           │
└──────────────┴──────────────┴──────────────┴──────────────────────┘

IMPLEMENTATION:
  Backend: tool_compare API
  Frontend:
    - Table layout with tools as columns
    - Highlight best/worst in each row (green/red)
    - Cost-per-edge calculation: price_usd / cutting_edges
    - Auto-verdict based on: highest vc = "Fastest", lowest cost/edge = "Best value"
    - Material selector at top: switch material group → table updates
```

### 7D: Smart Tool Recommendation Engine

**Machinist describes their operation, PRISM recommends tools:**
```
INPUT FORM:
  Operation:    [▾ OD Turning        ]
  Material:     [▾ 4140 Alloy Steel  ]  → auto-maps to P5 (alloy medium)
  Hardness:     [ 28 ] HRC
  Workpiece Ø:  [ 50 ] mm
  Depth of cut: [ 2.5 ] mm
  Finish req:   [▾ Medium (Ra 1.6-3.2)]
  Machine:      [▾ Mazak QT-250 ]       → auto-maps to turret interface
  Budget:       [▾ Standard ]

OUTPUT:
  RECOMMENDATION #1: Sandvik CNMG120408-PM GC4425
    Why: First-choice grade for P5 steel, medium chipbreaker matches 2.5mm DOC
    Parameters: RPM 2,067 • Feed 517mm/min • vc 325m/min • fn 0.25mm/rev
    Holder: DCLNR 2525M12 (in your turret compatibility list)
    Estimated tool life: ~15 min at recommended parameters
    
  RECOMMENDATION #2: Kennametal Beyond CNMG120408-MP KC5025
    Why: 8% slower but 13% cheaper, same application range
    Parameters: RPM 1,910 • Feed 458mm/min
    
  RECOMMENDATION #3: Seco CNMG120408-M3 TP2501
    Why: Best value, good all-around performance
    Parameters: RPM 1,974 • Feed 474mm/min

IMPLEMENTATION:
  Backend: tool_recommend API + prism_calc for parameter computation
  Logic:
    1. Map material to ISO group (4140 @ 28 HRC → P5_alloy_medium)
    2. Filter tools: category=TURNING_INSERTS, has cutting_data.P_STEELS
    3. Filter by chipbreaker: 2.5mm DOC → MEDIUM chipbreaker range
    4. Filter by machine: turret interface → compatible holders
    5. Rank by: vc_rec (higher = more productive) × confidence
    6. Calculate RPM/feed for each recommendation
    7. Cross-reference compatible holders from TURNING_HOLDERS
    8. Estimate tool life from Taylor equation if taylor_C/taylor_n available
    
  MATERIAL MAPPER:
    The app needs a material-to-ISO-group mapping table.
    This already exists in PRISM's material registry (3,392 materials).
    Each material has iso_group assignment.
    User types "4140" → lookup → P5 alloy_medium → use P_STEELS cutting data
    User types "316 SS" → lookup → M1 austenitic → use M_STAINLESS data
    User types "Inconel 718" → lookup → S3 nickel superalloy → use S_SUPERALLOYS data
```

### 7E: Machine-Tool Compatibility Matrix

**New app feature: "What fits my machine?"**
```
USER FLOW:
  1. User selects their machine (from machine registry: 1,016 machines)
  2. Machine has: spindle_interface (BT40/CAT40/HSK), turret slots (VDI/BMT),
     max_rpm, max_power_kW, torque_curve
  3. App shows ONLY compatible toolholders for that spindle
  4. User selects a holder → app shows compatible cutting tools
  5. User selects a cutting tool → app shows cutting parameters
     with RPM/feed automatically capped at machine limits

IMPLEMENTATION:
  New fields needed on machines (already in machine registry):
    spindle_interface: string
    turret_type: string (VDI30, VDI40, BMT55, BMT65)
    max_rpm: number
    max_power_kW: number
    
  New compatibility chain:
    Machine.spindle_interface → TOOLHOLDERS.spindle_interface
    TOOLHOLDERS.tool_interface → Cutting tool.shank_diameter_mm (for solid)
    TOOLHOLDERS.compatible_inserts → Insert shapes (for indexable)
    Machine.turret_type → TURNING_HOLDERS.turret_interface
    
  SAFETY: If calculated RPM > machine.max_rpm:
    Cap at max_rpm, recalculate vc, display warning
    "⚠ Machine limited to 6,000 RPM → vc reduced to 189 m/min (recommended: 325)"
```

### 7F: Tool List / Tool Crib Management

**Machinists can build and save tool lists:**
```
FEATURES:
  - Create named lists ("Mazak QT-250 Turret", "Job #4521 Tools", "Go-to Endmills")
  - Add tools from search/browse/recommendations
  - Export list as: CSV, PDF (with cutting data), or JSON (for CAM import)
  - Share lists between users (if multi-user)
  - Mark tools as "IN STOCK", "ORDER", "ON MACHINE"
  - Cost summary: total list cost, cost per job
  - Auto-suggest alternatives if a tool is discontinued

IMPLEMENTATION:
  Storage: window.storage (for web app) or local JSON (for desktop)
  Schema per list:
    { name, created, tools: [{ tool_id, quantity, status, notes }], total_cost }
```

### 7G: Export & Integration

```
EXPORT FORMATS:
  - CSV: filterable spreadsheet with all specs + cutting data
  - PDF: formatted tool cards with cutting parameters (print for shop floor)
  - JSON: machine-readable for CAM/ERP integration
  - Siemens NX Tool Library (.dat): direct CAM import
  - Fusion 360 Tool Library (.json): direct CAM import
  - Mastercam Tool Library (.mcam-tooldb): direct CAM import

CAM INTEGRATION IS THE ULTIMATE GOAL:
  Machinist finds tool in PRISM → exports to CAM → parameters pre-loaded
  No manual entry of speeds/feeds → fewer errors → safer machining
```

### Phase 7 Completion Criteria:
```
□ Tool Explorer: browse, search, faceted filter all 45,000+ tools
□ Tool Detail: full spec sheet with inline RPM/feed calculator
□ Tool Compare: side-by-side for 2-5 tools with auto-verdict
□ Tool Recommend: operation → material → ranked recommendations with parameters
□ Machine Compatibility: machine → compatible tools chain
□ Tool Lists: create, save, export
□ Export: CSV, PDF, JSON minimum; CAM formats stretch goal
□ All views respect confidence levels (warnings for <0.80)
□ All calculations validated against HARD BLOCKS
□ Mobile-responsive (machinists use phones at the machine)
```

## ════════════════════════════════════════════════════════════════════════════════
## PHASE 8: CONTINUOUS ENRICHMENT — LIVING DATABASE
## ════════════════════════════════════════════════════════════════════════════════
## The database is never "done." This phase runs forever.
## SESSION ESTIMATE: Ongoing
## ════════════════════════════════════════════════════════════════════════════════

### 8A: Tool Life & Wear Data Integration

```
CONCEPT: When machinists use PRISM to select tools, they can report back:
  "I used CNMG120408-PM GC4425 on 4140 @ 28 HRC"
  "Tool lasted 18 minutes at vc=300, fn=0.22"
  "Broke at minute 12 — chipping on flank"

DATA MODEL per wear report:
  {
    tool_id: string,
    material_machined: string,
    material_hardness_hrc: number,
    vc_actual: number,
    fn_actual: number,
    ap_actual: number,
    tool_life_minutes: number,
    failure_mode: "FLANK_WEAR" | "CRATER_WEAR" | "CHIPPING" | "FRACTURE" | "BUE",
    surface_finish_achieved_ra: number,
    coolant_used: string,
    machine_id: string,
    operator_notes: string,
    timestamp: ISO date
  }

APP FEATURES:
  - On tool detail page: "Community tool life: avg 16.2 min (23 reports)"
  - Trending: "This grade is lasting 20% longer than average in 4140"
  - Warnings: "3 reports of chipping at vc>350 — consider reducing speed"
  - Taylor equation refinement: adjust C and n from real-world data
```

### 8B: Cross-Reference & Alternative Engine

```
CONCEPT: Every tool should know its competitors.

CROSS-REFERENCE TABLE:
  Sandvik CNMG120408-PM GC4425 ↔ Kennametal Beyond CNMG120408-MP KC5025
  Sandvik CNMG120408-PM GC4425 ↔ Seco CNMG120408-M3 TP2501
  Sandvik CNMG120408-PM GC4425 ↔ Iscar CNMG120408-PP IC8250
  
BUILD METHOD:
  1. Match by: same ISO shape + same IC size + same corner radius ± 0.1mm
  2. Match by: compatible chipbreaker range (finishing ↔ finishing)
  3. Match by: overlapping ISO grade range (P15-P35 ↔ P20-P40)
  4. Score similarity: dimensional match × grade overlap × cutting data proximity
  5. Store as bidirectional links

APP FEATURE:
  "Don't have GC4425 in stock? Here are 4 alternatives from other vendors."
  Ranked by: similarity score, price difference, availability
```

### 8C: Vendor Price & Availability Tracking

```
CONCEPT: Prices change. Tools get discontinued. New ones launch.

IMPLEMENTATION:
  - Quarterly: Check vendor websites for price updates
  - Scrape MSC, Kennametal, Sandvik e-catalogs for current pricing
  - Mark discontinued tools (status: DISCONTINUED)
  - Flag price changes >10% from previous
  - Auto-add new product launches from vendor RSS/newsletters
  
PRICE TIERS (for recommendation engine):
  ECONOMY: Korloy, Zeni, Rapidkut, generic (price_level: 1-2)
  STANDARD: Kennametal, Seco, OSG, Guhring (price_level: 3)
  PREMIUM: Sandvik, Iscar, Walter (price_level: 4-5)
```

### 8D: User Preferences & Shop Profiles

```
CONCEPT: "My shop only uses BT40 machines and we prefer Sandvik."

SHOP PROFILE:
  {
    shop_name: string,
    machines: [{ machine_id, spindle, turret }],
    preferred_vendors: string[],
    excluded_vendors: string[],
    stock_on_hand: [{ tool_id, quantity }],
    budget_tier: "ECONOMY" | "STANDARD" | "PREMIUM",
    units: "METRIC" | "IMPERIAL",
    coolant_type: "FLOOD" | "MQL" | "DRY"
  }

APP BEHAVIOR WITH PROFILE:
  - Search defaults to preferred vendors (but shows all)
  - Recommendations prioritize in-stock tools
  - Machine compatibility auto-filters to shop's machines
  - RPM/feed calculator uses shop's preferred units
  - "You have 3 of these in stock" badge on tool cards
```

### 8E: Cutting Data Confidence Improvement Pipeline

```
CONCEPT: Move Tier 4-5 data (confidence 0.60-0.75) up to Tier 1-2.

METHODS:
  1. PDF re-extraction: go back to catalogs with better parsing
  2. Vendor API integration: some vendors have digital cutting data APIs
     - Sandvik: CoroPlus ToolGuide API
     - Walter: GPS (Walter Guide) API
     - Seco: Suggest API
  3. User-reported data: aggregate wear reports into cutting data
  4. Lab testing: for critical tools, run controlled cutting tests
  5. Cross-vendor validation: if 3 vendors agree on vc for a shape/grade, high confidence

PRIORITY: Focus on most-searched tools with lowest confidence
  Track: search_count × (1 - confidence) = "improvement_urgency"
  Tool with 500 searches and 0.65 confidence → urgency 175
  Tool with 10 searches and 0.95 confidence → urgency 0.5
```

## ════════════════════════════════════════════════════════════════════════════════
## PHASE 9: ADVANCED ANALYTICS & AI FEATURES
## ════════════════════════════════════════════════════════════════════════════════
## These are stretch goals that differentiate PRISM from a simple catalog.
## ════════════════════════════════════════════════════════════════════════════════

### 9A: Predictive Tool Life

```
CONCEPT: Given a tool + material + parameters → predict minutes of tool life.

MODEL: Extended Taylor equation with corrections:
  T = C / (vc^n × fn^p × ap^q × HRC_factor × coolant_factor)
  
  Where C, n, p, q are fitted from:
    1. Vendor-published tool life data (from catalogs)
    2. User wear reports (Phase 8A)
    3. PRISM's formula registry (500 formulas)
  
APP OUTPUT:
  "Estimated tool life: 15.2 minutes (±3.1 min)"
  "At $18.50 per insert with 4 edges → $0.30/minute cutting cost"
  "Reduce vc by 15% for 40% longer life (trade: 12% slower cycle)"
```

### 9B: Cost-Per-Part Optimization

```
CONCEPT: "Which tool gives me the lowest cost to machine this part?"

INPUTS:
  - Part: material, features (holes, profiles, facing), tolerances
  - Tools: candidate set (from search or recommendation)
  - Machine: hourly rate, setup time
  
CALCULATION:
  cost_per_part = (tool_cost / parts_per_edge) + (cycle_time × machine_rate)
  
  Where:
    parts_per_edge = tool_life_minutes / cycle_time_per_part
    cycle_time = machining_length / feed_rate_mm_min
    tool_cost = price_usd / cutting_edges

OPTIMIZATION:
  - Aggressive parameters: faster cycle, shorter tool life → calculate total cost
  - Conservative parameters: slower cycle, longer tool life → calculate total cost
  - Find the sweet spot where cost_per_part is minimized
  - Display as chart: vc on X-axis, cost_per_part on Y-axis
```

### 9C: AI-Powered Tool Selection Assistant

```
CONCEPT: Natural language interface.

USER: "I need to rough 316 stainless, 2mm DOC, on my Mazak with BT40.
       Last time the insert chipped. What should I try?"

PRISM AI:
  1. Parses: material=316SS (M1), operation=roughing, DOC=2mm,
             machine=Mazak+BT40, problem=chipping
  2. Diagnoses: chipping = grade too hard or vc too high for stainless
  3. Recommends: tougher grade (M30 instead of M20), lower vc, 
                 or switch to PVD coated grade
  4. Returns specific tools with adjusted parameters
  5. Explains: "Chipping in stainless usually means the grade is too 
               brittle. Try GC2220 (PVD, tougher) at vc=160 instead 
               of 200. If still chipping, check toolholder rigidity."

IMPLEMENTATION:
  - Claude API integration (already available in PRISM)
  - System prompt includes tool database schema + cutting data rules
  - Function calling: tool_search, tool_recommend, tool_compare
  - Conversation context: remembers previous problems and solutions
```

### 9D: Visual Tool Identification

```
CONCEPT: Machinist photographs a tool → PRISM identifies it.

USER FLOW:
  1. Take photo of insert (usually has markings: "CNMG 120408 GC4425")
  2. Upload to PRISM app
  3. OCR reads markings → searches catalog_number
  4. If markings worn: image classification by shape → iso_shape filter
  5. Returns tool detail page with cutting data

IMPLEMENTATION:
  - Claude Vision API for OCR and shape recognition
  - Fallback: manual entry with guided prompts
     "What shape is the insert?" [Diamond] [Square] [Triangle] [Round]
     "How many edges?" [2] [3] [4] [6] [8]
     "Approximate IC size?" [6mm] [10mm] [12mm] [16mm]
```

### 9E: Shop Floor Dashboard

```
CONCEPT: Real-time view of what tools are running and their status.

FEATURES:
  - Tool life remaining on active tools (countdown)
  - "Tool change needed in ~3 minutes on Machine 2"
  - Tool cost tracking per job
  - Most-used tools this month (reorder alerts)
  - Tool performance trends (is this tool lasting longer or shorter?)
  
REQUIRES: Integration with machine monitoring (OPC-UA, MTConnect)
  This is Phase 10+ territory but the data model supports it now.
```

## ════════════════════════════════════════════════════════════════════════════════
## EXECUTION METHODOLOGY
## ════════════════════════════════════════════════════════════════════════════════
## Every session follows this. No exceptions. One false move kills everybody.
## ════════════════════════════════════════════════════════════════════════════════

### SESSION BOOT SEQUENCE:
```
1. BOOT:     prism_dev→session_boot → prism_context→todo_update
2. READ:     Read THIS ROADMAP to find current phase/step
3. CHECK:    Read ACTION_TRACKER.md for pending items from last session
4. VERIFY:   prism_knowledge→stats (confirm current tool count)
5. EXECUTE:  Work on the current phase/step
6. VALIDATE: Run validation against HARD BLOCKS before saving ANY file
7. BUILD:    npm run build (NEVER standalone tsc)
8. COUNT:    Verify tool count increased (or stayed same for schema work)
9. HANDOFF:  Write session state to ACTION_TRACKER.md (format below)
10. END:     prism_session→state_save
```

### PDF EXTRACTION METHODS:
```
METHOD 1: DIRECT TABLE EXTRACTION (preferred)
  Tool: pdfplumber (Python) on the Linux container
  Process: Open PDF → extract tables → parse → validate → save
  Best for: Sandvik/Seco catalogs with clean tabular layouts

METHOD 2: API-ASSISTED EXTRACTION (for complex layouts)
  When tables are image-based or have complex multi-column formats:
  Send page image to Claude API → structured extraction prompt → JSON
  Validate all numbers → cross-reference with other sources

METHOD 3: KNOWLEDGE-BASED GENERATION (for filling gaps)
  Use extracted data as reference templates
  Apply ISO 13399 standards for dimensions
  Apply vendor's published grade guidelines
  Interpolate cutting data from known reference points
  Mark confidence 0.75 (lower than extraction at 0.95)
```

### DATA QUALITY TIERS:
```
TIER 1 (conf: 0.95): Direct PDF table extraction, cross-verified
TIER 2 (conf: 0.90): Extracted from manufacturer's structured JS catalog files
TIER 3 (conf: 0.85): Generated from catalog series × standard sizes
TIER 4 (conf: 0.75): Interpolated from similar tools + vendor guidelines
TIER 5 (conf: 0.60): Estimated from ISO standards + general machining knowledge

RULES:
  - Tier 1-3: Safe for CNC operations directly
  - Tier 4-5: MUST display "⚠ VERIFY BEFORE USE" in app
  - NEVER present Tier 4-5 as verified data
  - Every entry MUST have confidence field
```

### SESSION HANDOFF FORMAT:
```
Write this EXACT format to ACTION_TRACKER.md at end of every session:

═══════════════════════════════════════════════════════════
TOOL EXPANSION — SESSION HANDOFF
═══════════════════════════════════════════════════════════
DATE: [ISO date]
ROADMAP: C:\PRISM\mcp-server\data\docs\roadmap\TOOL_EXPANSION_ROADMAP.md

CURRENT PHASE: [Phase number and name]
CURRENT STEP:  [Exact step, e.g., "1A-3: Seco turning inserts, page 200/1060"]

COMPLETED THIS SESSION:
  - [What was done]
  - [How many tools added]
  - [File created/updated]

TOOL COUNTS:
  Before: [number]
  After:  [number]
  Delta:  +[number]
  Files modified: [list]

NEXT SESSION MUST:
  1. [Exact first action — what file to open, what page to start at]
  2. [What data to extract]
  3. [Where to save it]
  4. [What to validate]

BLOCKERS/ISSUES:
  - [Any problems found]
  - [Any data quality concerns]
  - [Any files that couldn't be read]

DO NOT SKIP STEPS. DO NOT ASSUME. READ THE ROADMAP.
═══════════════════════════════════════════════════════════
```

### FILE NAMING CONVENTION (canonical — matches categories):
```
C:\PRISM\data\tools\
  SOLID_ENDMILLS.json
  INDEXABLE_MILLING.json
  MILLING_INSERTS.json
  SOLID_DRILLS.json
  INDEXABLE_DRILLS.json
  TAPS.json
  REAMERS.json
  TURNING_INSERTS.json
  TURNING_HOLDERS.json
  GROOVING_INSERTS.json
  THREADING_INSERTS.json
  BORING.json
  TOOLHOLDERS.json
  SPECIALTY.json
  
Legacy files (keep for backward compat until migration):
  CUTTING_TOOLS_INDEX.json, MILLING.json, DRILLING.json, etc.
```

## ════════════════════════════════════════════════════════════════════════════════
## PROGRESS TRACKING — MASTER CHECKLIST
## ════════════════════════════════════════════════════════════════════════════════

### PHASE 0: Schema Normalization (prerequisite)
- [ ] 0-1: Registry normalization layer in ToolRegistry.ts
- [ ] 0-2: ToolIndex.ts — in-memory indexes + facets
- [ ] 0-3: Query API — tool_search, tool_compare, tool_recommend, tool_facets
- [ ] 0-4: Migration script — convert all 14 files to canonical schema

### PHASE 1: Turning (target: 14,100)
- [ ] 1A-1: Sandvik turning inserts (~1,500)
- [ ] 1A-2: Kennametal turning inserts (~1,200)
- [ ] 1A-3: Seco turning inserts (~1,000)
- [ ] 1A-4: Korloy turning inserts (~800)
- [ ] 1A-5: ULTRA V3 remaining vendors (~1,500)
- [ ] 1A-6: Dedup + validate
- [ ] 1B: Positive inserts (~1,500)
- [ ] 1C: Grooving/parting inserts (~800)
- [ ] 1D: Threading inserts (~500)
- [ ] 1E: Turning holders expansion (~800)

### PHASE 2: Solid Round Tools (target: 12,200)
- [ ] 2A: Solid endmills — 15 vendors (~6,000)
- [ ] 2B: Solid drills (~2,000)
- [ ] 2C: Taps (~800)
- [ ] 2D: Reamers (~400)

### PHASE 3: Indexable Milling (target: 3,500)
- [ ] 3A: Milling inserts (~1,000)
- [ ] 3B: Milling bodies (~600)
- [ ] 3C: Specialty milling (~400)

### PHASE 4: Boring (target: 600)
- [ ] 4A: Boring bars (~300)
- [ ] 4B: Boring heads (~200)
- [ ] 4C: Modular systems (~100)

### PHASE 5: Toolholder Completion (target: 8,000)
- [ ] 5A: Big Daishowa Vol.5
- [ ] 5B: Rego-Fix 2026
- [ ] 5C: Additional vendors
- [ ] 5D: Workholding

### PHASE 6: Archive Extraction (target: variable)
- [ ] 6A: Reassemble split zip
- [ ] 6B: Identify unknown catalogs
- [ ] 6C: Extract newly discovered

### PHASE 7: App Integration Layer
- [ ] 7A: Tool Explorer (browse + search + faceted filter)
- [ ] 7B: Tool Detail View (spec sheet + inline calculator)
- [ ] 7C: Tool Comparison (side-by-side)
- [ ] 7D: Smart Recommendation Engine
- [ ] 7E: Machine-Tool Compatibility Matrix
- [ ] 7F: Tool List / Tool Crib Management
- [ ] 7G: Export & CAM Integration

### PHASE 8: Continuous Enrichment
- [ ] 8A: Tool life & wear data integration
- [ ] 8B: Cross-reference & alternative engine
- [ ] 8C: Vendor price tracking
- [ ] 8D: User preferences & shop profiles
- [ ] 8E: Confidence improvement pipeline

### PHASE 9: Advanced Analytics & AI
- [ ] 9A: Predictive tool life
- [ ] 9B: Cost-per-part optimization
- [ ] 9C: AI tool selection assistant (Claude-powered)
- [ ] 9D: Visual tool identification
- [ ] 9E: Shop floor dashboard

## ════════════════════════════════════════════════════════════════════════════════
## GRAND TOTALS
## ════════════════════════════════════════════════════════════════════════════════
##
## CURRENT:  13,967 tools  |  37% coverage  |  44% with cutting data
## TARGET:   45,000+ tools |  90% coverage  |  85%+ with cutting data
## GAP:      ~31,000 tools to add
##
## PHASES 0-6: Build the database (data expansion + schema)
## PHASE 7:    Build the product (app UI + API)
## PHASES 8-9: Build the moat (intelligence + AI)
##
## ESTIMATED TOTAL SESSIONS: 25-40
## ════════════════════════════════════════════════════════════════════════════════
