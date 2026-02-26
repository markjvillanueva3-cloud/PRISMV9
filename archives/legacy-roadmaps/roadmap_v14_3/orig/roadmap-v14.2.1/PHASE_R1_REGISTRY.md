# PHASE R1: REGISTRY + DATA FOUNDATION — v14.2
# Status: in-progress | Sessions: 2-3 more | MS: 12 (MS0-MS10, MS10 optional) | Role: Data Architect
# v14.2: Added MS4.5 (Data Validation Pipeline — SA Audit Finding 5),
#   expanded MS5 (85-param tool holder upgrade — Gap 7, TOOL_HOLDER_DATABASE_ROADMAP_v4),
#   expanded MS8 (formula registry wiring — Gap 12, wiring registry protocol),
#   added companion assets section (skills/scripts/hooks built after features)
# Pattern: Every MS follows LOAD → VALIDATE → FIX → VERIFY → DOCUMENT
# v14.0: Unified Roadmap — extends R1 from 7 MS to 11 MS.
#         MS0-MS4 COMPLETE (registry loading + pipeline integration + tool expansion).
#         MS5-MS9 NEW: Data foundation work merged from Superpower Audit, Database Audit,
#           Tool Expansion Roadmap, and Superpower Roadmap gap analysis.
#         MS5 = Tool Schema Normalization (T-0 from Database Audit GAP 2)
#         MS6 = Material Enrichment Completion (M-0 from Database Audit GAP 1)
#         MS7 = Machine Field Population (MCH-0 from Database Audit GAP 3)
#         MS8 = Formula Registry + Dispatcher Wiring (GAPs 4, 6, 7, 10)
#         MS9 = Quality Metrics + Phase Gate (was original R1-MS5, renumbered)
#
#         WHY THESE MILESTONES EXIST: The original R1 got registry COUNTS to >95%. But >95%
#         loaded does not mean the data is USABLE. Tools have no index (every search is linear
#         scan). Materials have 127 params but 95% lack tribology/composition. Machines have
#         zero power/envelope specs. The engines are sophisticated but the data feeding them
#         is sparse. These 5 new MS make the data APP-READY, not just COUNT-READY.
#
#         SOURCE DOCUMENTS for MS5-MS9:
#           TOOL_EXPANSION_ROADMAP.md — detailed tool schema spec (load during R1-MS5 ONLY)
#           PRISM_DATABASE_AUDIT_AND_ROADMAP.md — registry gap analysis (load during R1-MS6/MS7)
#           SUPERPOWER_ROADMAP_AUDIT.md — 10 data gaps, utilization analysis (reference)
#
# v13.9: Cross-Audit Governance Hardening (XA-1,13,7) — retained unchanged.
# v13.5-v13.8: All prior hardening retained unchanged. See v13.9 header for full changelog.

---

## CONTEXT BRIDGE

WHAT CAME BEFORE: P0 fixed all WIRING + configured Opus 4.6. 31 dispatchers verified operational.
4 duplicate registry pairs resolved to single sources. Opus 4.6 Compaction API, Adaptive Thinking,
Structured Outputs, and Agent Teams all wired. PHASE_FINDINGS.md has P0 section.
SYSTEM_ACTIVATION_REPORT.md, P0_DISPATCHER_BASELINE.md, OPUS_CONFIG_BASELINE.md exist.

WHAT THIS PHASE DOES (v14.0 EXPANDED):
  PART 1 (MS0-MS4 ✅): Load DATA into the wiring P0 fixed. Materials 3518+ (127 params each),
    Machines 824+, Tools 1944+, Alarms 9200+. Formula definitions parsed and validated.
    Target: >95% load rate for all registries. ACHIEVED.
  PART 2 (MS5-MS9 NEW): Make data APP-READY. Normalize tool schema + build ToolIndex.
    Enrich materials with tribology/composition/designation. Populate machine power/envelope
    for top 50. Add 9 calculator formulas. Wire remaining dispatcher actions for toolpath,
    thread, and unified search.

WHAT COMES AFTER: R2 (Safety + Engine Validation) runs 50 calculations + 29 safety engine
action tests + AI-generated edge cases against the enriched, indexed, normalized data.
R2 expects: all registries >95% loaded AND data quality sufficient for cross-registry queries
(tool search returns indexed results, material cross_query has enrichment data, machine
constraints are non-null for top 50, new dispatcher actions respond correctly).

ARTIFACT MANIFEST (XA-1):
  REQUIRES: PHASE_FINDINGS.md (P0 section), P0_DISPATCHER_BASELINE.md, OPUS_CONFIG_BASELINE.md
  PRODUCES: REGISTRY_AUDIT.md, PHASE_FINDINGS.md (R1 section)

---

## OBJECTIVES

1. Material registry: >95% of 3518+ materials loaded with valid parameters ✅ (3,392 = 96.4%)
2. Machine registry: >95% loaded with valid specs ✅ (1,016 machines, 44 manufacturers)
3. Tool registry: >95% loaded with valid geometry ✅ (5,238 on disk, pending restart)
4. Alarm registry: >95% loaded across 12 controller families ✅ (10,033 = 100%)
5. Formula definitions: Taylor, Kienzle, specific cutting force validated ✅ (500 formulas)
6. Data pipelines: warm_start → knowledge → calc engine consistent results ✅
7. REGISTRY_AUDIT.md created ✅
8. Tool schema normalized + ToolIndex with O(1) lookup + tool_facets action (NEW)
9. Material enrichment: >80% tribology, >80% composition, >90% designation (NEW)
10. Machine field population: Top 50 machines with spindle + power + envelope data (NEW)
11. Formula registry: 9 calculator formulas added (F-CALC-001 through F-CALC-009) (NEW)
12. Dispatcher wiring: toolpath strategies fully exposed, thread calcs wired, unified search (NEW)
13. TEST LEVELS: L1-L3 required (unit + contract + integration tests pass)

## FAULT INJECTION TEST (XA-13 — one test per phase)

```
R1 FAULT TEST: Kill material registry mid-load → verify Tier 2 degradation activates.
  WHEN: After R1-MS1 material loading is working (need a baseline to break). ✅ BASELINE EXISTS
  HOW:  During a material_get call, simulate registry file being unavailable:
        Temporarily rename the material registry file → call prism_data action=material_get material="4140"
        EXPECTED: System enters Tier 2 (Reduced Data) degradation, NOT crash/hang.
        VERIFY: Health endpoint reports degraded status. Error is logged with correlationId.
        RESTORE: Rename file back. Verify system recovers to Tier 1 automatically.
  PASS: Graceful degradation activates. No crash. Recovery is automatic.
  FAIL: System crashes, hangs, or returns corrupt data silently.
  EFFORT: ~5 calls. Run during R1-MS9 (phase gate — natural place for stress testing).
```

---

## ═══════════════════════════════════════════════════
## COMPLETED MILESTONES (MS0-MS4) — Reference Only
## ═══════════════════════════════════════════════════

### R1-MS0: Registry Audit ✅ COMPLETE (2026-02-14)
P0 finding fixes applied: alarm_decode param order, safety validator flat params, compliance
method name, thread coarse notation documented as known limitation.

### R1-MS1: Material Loading ✅ COMPLETE (2026-02-15)
Materials 2,942 → 3,392 (96.4%). Root cause of gap: BOM encoding in data files.
Fixes: readJsonFile BOM strip in src/utils/files.ts + 8 BOM data files cleaned.
Remaining 126 gap = target materials not yet created on disk.

### R1-MS1.5: Formula Validation ✅ COMPLETE
500 formulas validated. All parse correctly. Taylor, Kienzle, Johnson-Cook verified.

### R1-MS2: Machine/Tool/Alarm Loading ✅ COMPLETE (2026-02-15)
Tools: 1,944/1,944 (100%). Alarms: 10,033 (100%). Machines: 402→469→639.
"Dual-path" concern was misdiagnosis — all registries load from correct paths.
R1-MS2b: V3 3D model database (225 machines in .js format) converted to JSON.
Fixed MachineRegistry wrapper format handling. Machines: 639→1,016.

### R1-MS3: Data Pipeline Integration ✅ COMPLETE
End-to-end flow verified: material_get → speed_feed_calc → cutting_force → tool_life.

### R1-MS4: Coverage Audit + Tool Expansion ✅ COMPLETE (2026-02-15)
Tool database expanded: 1,944 → 5,238 (on disk, pending restart).
New files: TURNING_INSERTS.json (1,710), TURNING_HOLDERS_EXPANDED.json (600),
INDEXABLE_MILLING_TOOLHOLDING.json (984).

REGISTRY TOTALS POST-MS4:
  Materials: 3,392 (96.4%) | Machines: 1,016 (44 mfrs) | Tools: 5,238 (disk) / 1,944 (registry)
  Alarms: 10,033 (100%) | Formulas: 500 (100%) | Build: clean 3.9MB

---

<!-- LOADER: SKIP TO HERE — MS0-MS4 complete. Content above is reference only. -->
## ═══════════════════════════════════════════════════
## NEW MILESTONES (MS4.5-MS9) — Data Foundation
## ═══════════════════════════════════════════════════

## R1-MS4.5: DATA VALIDATION PIPELINE ← NEW in v14.2

**Source:** SYSTEMS_ARCHITECTURE_AUDIT.md Finding 5, Gap Analysis Gap 12
**Effort:** ~12 calls | **Tier:** DEEP | **Context:** ~4KB
**Response Budget:** ~10KB throughput, ~4KB peak
**Entry:** R1-MS4 COMPLETE. All registries loaded but data quality unverified.

**WHY THIS IS CRITICAL:**
  Safety-critical system needs VALIDATED data before building intelligence on it.
  Current state: registries loaded by count, but no physical bounds checking,
  no cross-reference validation, no consistency checking. A material with
  hardness=50000 HB or density=0.001 g/cm³ would pass silently. This catches
  data quality issues BEFORE R2 trusts the data for safety calculations.

**IMPLEMENTATION:**

```
Step 1: Create DataValidationEngine.ts (~300 lines)

  PHYSICAL BOUNDS CHECKING:
    Hardness: 0 < HB < 800
    Density: 1.0 < g/cm³ < 23.0 (osmium = 22.59)
    Tensile strength: 10 < MPa < 3000
    Thermal conductivity: 0.1 < W/mK < 430 (silver = 429)
    Melting point: 150°C < Tm < 3500°C (tungsten = 3422)
    Tool diameter: 0 < D < 500mm
    Machine RPM: 0 < RPM_min < RPM_max < 100,000
    Machine power: 0 < kW < 500

  CROSS-REFERENCE VALIDATION:
    AISI designation → correct UNS mapping (lookup table)
    Composition elements → sum to 95-105% (allow minor rounding)
    Machine RPM max ≥ RPM min | Power > 0 | Travels > 0
    Spindle taper is valid enum (BT30, BT40, BT50, HSK-A63, etc.)

  CONSISTENCY CHECKING:
    Same material in multiple files → properties agree within 5%
    Flag contradictions, quarantine suspect entries to QUARANTINE.json
    Suspect but plausible → Tier 2.1 degradation (from IA3-7.1)

  COMPLETENESS SCORING:
    Per-entry score 0-100 based on field population
    Materials: weight hardness(20), density(15), tensile(15), conductivity(10), other(40)
    Machines: weight power(25), RPM(20), travels(20), spindle(15), other(20)
    Tools: weight diameter(20), flutes(15), material(15), geometry(15), other(35)

  STALENESS DETECTION:
    Flag entries without manufacturer catalog source
    Flag materials without standards reference (AISI, DIN, JIS, EN)

Step 2: Wire to build pipeline
  npm run build includes: validate_all_registries
  Output: VALIDATION_REPORT.json
    { materials: { total, valid, quarantined, avg_completeness },
      machines: { total, valid, quarantined, avg_completeness },
      tools: { total, valid, quarantined, avg_completeness },
      critical_failures: [], warnings: [] }

Step 3: New actions
  validate_registry(registry_name) — run validation on one registry
  validation_report() — return latest VALIDATION_REPORT.json

Step 4: Run initial validation, fix critical failures
  Expected: some materials will have out-of-bounds values
  Fix: correct data or quarantine with documentation
```

**CHECKPOINT:**
```
ACTION_TRACKER.md:
  "R1-MS4.5 DATA VALIDATION PIPELINE COMPLETE [date]
   DataValidationEngine.ts created. VALIDATION_REPORT.json generated.
   Materials: X valid, Y quarantined. Machines: X valid, Y quarantined.
   Critical failures: [count] fixed."
```

---

## R1-MS5: Tool Schema Normalization + ToolIndex (T-0) — EXPANDED in v14.2
⚡ CLAUDE CODE PARALLEL: This MS can run as an independent agent in its own Git worktree.
  Worktree: feature/r1-ms5-tool-schema | Focus: src/engines/ToolIndex.ts, src/data/tools/

**Source:** TOOL_EXPANSION_ROADMAP.md Phase 0 + SUPERPOWER_ROADMAP_AUDIT.md GAP 2
**Effort:** ~18 calls | **Tier:** DEEP | **Context:** ~8KB
**Response Budget:** ~15KB throughput, ~6KB peak
**Entry:** R1-MS4 COMPLETE. 5,238 tools on disk across 14 JSON files.

**WHY THIS IS CRITICAL:**
  15,912 tool entries across 14 files with NO index, NO schema consistency.
  9,170 entries use "vendor" field, 6,741 use "manufacturer" — same concept, different key.
  11 of 14 canonical category files MISSING (only TURNING_INSERTS, TOOLHOLDERS, SPECIALTY exist).
  Every tool_search is a LINEAR SCAN. App cannot build filter dropdowns without tool_facets.
  tool_recommend returns essentially random results without category indexing.

**REFERENCE DOCUMENT:** Load TOOL_EXPANSION_ROADMAP.md during this MS ONLY for detailed
  schema specifications. DO NOT load in other MS. Cost: ~8K tokens. Contains: canonical
  category definitions, field mapping table, vendor normalization rules, diameter ranges.

```
=== STEP 1: SCHEMA AUDIT ===
Effort: ~3 calls

1a. Read first 50 lines of each tool JSON file to identify field variants:
    prism_dev action=file_read path="data/tools/MILLING.json" start_line=1 end_line=50  [effort=low]
    prism_dev action=file_read path="data/tools/TOOLHOLDERS.json" start_line=1 end_line=50  [effort=low]
    prism_dev action=file_read path="data/tools/TURNING_INSERTS.json" start_line=1 end_line=50  [effort=low]

1b. Document the FIELD MAPPING TABLE (these are the known inconsistencies from audit):

    | Source Field           | Canonical Field        | Affected Files              |
    |------------------------|------------------------|-----------------------------|
    | vendor                 | vendor                 | MILLING, DRILLING, SPECIALTY |
    | manufacturer           | vendor                 | TOOLHOLDERS, TURNING_*      |
    | cutting_diameter_mm    | cutting_diameter_mm    | MILLING, DRILLING           |
    | diameter               | cutting_diameter_mm    | TOOLHOLDERS, HOLE_FINISHING |
    | diameter_mm            | cutting_diameter_mm    | TURNING_HOLDERS             |
    | coating                | coating                | MILLING, DRILLING           |
    | coating_type           | coating                | SPECIALTY, TURNING_INSERTS  |
    | flute_count            | flute_count            | MILLING                     |
    | number_of_flutes       | flute_count            | DRILLING                    |
    | num_flutes             | flute_count            | ENDMILL_CATALOGS            |
    | category               | category               | Some files                  |
    | (missing)              | category               | Files without category      |
    | tool_type              | category               | MANUFACTURER_CATALOGS       |

    If actual audit reveals MORE variants → add them to the table.
    If actual audit reveals FEWER variants → simplify the normalizer.
    VERIFY the mapping by reading at least 3 different files.

=== STEP 2: BUILD NORMALIZATION LAYER ===
Effort: ~4 calls

2a. Read current ToolRegistry.ts to understand the load path:
    prism_dev action=file_read path="src/registries/ToolRegistry.ts" start_line=1 end_line=100  [effort=low]
    Identify: Where entries are parsed. Where they're validated. Where they're stored.

2b. Create normalizeToolEntry() function (add to ToolRegistry.ts or new file):
    str_replace on ToolRegistry.ts to add normalization function.

    NORMALIZATION FUNCTION SPECIFICATION:
    ```typescript
    function normalizeToolEntry(raw: Record<string, unknown>, sourceFile: string): NormalizedTool {
      return {
        // Identity
        id: String(raw.id || raw.tool_id || generateId(raw, sourceFile)),
        name: String(raw.name || raw.tool_name || raw.description || 'unknown'),

        // Vendor — "manufacturer" and "vendor" mean the same thing
        vendor: String(raw.vendor || raw.manufacturer || 'unknown'),

        // Category — derive from source file if not present
        category: String(raw.category || raw.tool_type || deriveCategoryFromFile(sourceFile)),

        // Geometry — normalize diameter field names
        cutting_diameter_mm: Number(raw.cutting_diameter_mm || raw.diameter || raw.diameter_mm || 0),
        overall_length_mm: Number(raw.overall_length_mm || raw.overall_length || raw.length || 0),
        flute_length_mm: Number(raw.flute_length_mm || raw.flute_length || raw.cutting_length || 0),
        flute_count: Number(raw.flute_count || raw.number_of_flutes || raw.num_flutes || 0),
        shank_diameter_mm: Number(raw.shank_diameter_mm || raw.shank_diameter || raw.shank || 0),

        // Cutting properties
        coating: String(raw.coating || raw.coating_type || 'uncoated'),
        substrate: String(raw.substrate || raw.tool_material || raw.material || 'unknown'),
        helix_angle_deg: Number(raw.helix_angle_deg || raw.helix_angle || 0),
        rake_angle_deg: Number(raw.rake_angle_deg || raw.rake_angle || 0),

        // Insert-specific (nullable — only for indexable tools)
        insert_shape: raw.insert_shape || raw.shape || null,
        insert_size: raw.insert_size || raw.size || null,
        chipbreaker: raw.chipbreaker || raw.chip_breaker || null,
        grade: raw.grade || raw.carbide_grade || null,

        // Toolholder-specific (nullable)
        interface_type: raw.interface_type || raw.holder_interface || raw.taper || null,
        clamping_system: raw.clamping_system || raw.clamp_type || null,

        // Metadata
        source_file: sourceFile,
        normalized_at: new Date().toISOString()
      };
    }

    function deriveCategoryFromFile(filename: string): string {
      const map: Record<string, string> = {
        'MILLING.json': 'MILLING', 'DRILLING.json': 'DRILLING',
        'TURNING_INSERTS.json': 'TURNING_INSERTS', 'TURNING.json': 'TURNING',
        'TURNING_HOLDERS_EXPANDED.json': 'TURNING_HOLDERS',
        'TOOLHOLDERS.json': 'TOOLHOLDERS', 'HOLE_FINISHING.json': 'HOLE_FINISHING',
        'THREADING.json': 'THREADING', 'SPECIALTY.json': 'SPECIALTY',
        'ENDMILL_CATALOGS.json': 'ENDMILLS',
        'MANUFACTURER_CATALOGS.json': 'GENERAL',
        'INDEXABLE_MILLING_TOOLHOLDING.json': 'INDEXABLE_MILLING',
        'CUTTING_TOOLS_INDEX.json': 'INDEX'
      };
      return map[filename] || 'UNCATEGORIZED';
    }
    ```

    Apply normalizeToolEntry() during registry load — NOT by modifying source files.
    Pattern: Source JSON → normalizeToolEntry() → Validator → Registry.

2c. Build after adding normalization:
    prism_dev action=build target=mcp-server  [effort=medium]
    VERIFY: Build passes. 3.9MB output.
    IF BUILD FAILS: Read error → fix type issues → rebuild. One fix at a time.

=== STEP 3: BUILD TOOLINDEX ===
Effort: ~4 calls

3a. Create ToolIndex.ts in src/registries/ (or add to ToolRegistry.ts if small enough):

    TOOLINDEX SPECIFICATION:
    ```typescript
    export class ToolIndex {
      private byCategory: Map<string, Set<string>> = new Map();
      private byVendor: Map<string, Set<string>> = new Map();
      private byCoating: Map<string, Set<string>> = new Map();
      private byDiameterRange: { diameter: number; id: string }[] = [];  // sorted
      private byMaterialGroup: Map<string, Set<string>> = new Map();

      buildIndex(tools: Map<string, NormalizedTool>): void {
        for (const [id, tool] of tools) {
          // Category index
          if (!this.byCategory.has(tool.category)) this.byCategory.set(tool.category, new Set());
          this.byCategory.get(tool.category)!.add(id);

          // Vendor index
          const vendor = tool.vendor.toLowerCase();
          if (!this.byVendor.has(vendor)) this.byVendor.set(vendor, new Set());
          this.byVendor.get(vendor)!.add(id);

          // Coating index
          const coating = tool.coating.toLowerCase();
          if (!this.byCoating.has(coating)) this.byCoating.set(coating, new Set());
          this.byCoating.get(coating)!.add(id);

          // Diameter index (for range queries)
          if (tool.cutting_diameter_mm > 0) {
            this.byDiameterRange.push({ diameter: tool.cutting_diameter_mm, id });
          }
        }
        // Sort diameter index for binary search
        this.byDiameterRange.sort((a, b) => a.diameter - b.diameter);
      }

      // O(1) lookups
      getByCategory(category: string): string[] { ... }
      getByVendor(vendor: string): string[] { ... }
      getByCoating(coating: string): string[] { ... }
      // O(log n) range query
      getByDiameterRange(min: number, max: number): string[] { ... }

      // Faceted counts for app filter dropdowns
      getFacets(filters?: Partial<ToolFilters>): ToolFacets {
        // Apply filters progressively, return counts for remaining facets
        return {
          categories: Array.from(this.byCategory.entries()).map(([name, ids]) => ({
            name, count: ids.size
          })),
          vendors: Array.from(this.byVendor.entries()).map(([name, ids]) => ({
            name, count: ids.size
          })).sort((a, b) => b.count - a.count).slice(0, 50),
          coatings: Array.from(this.byCoating.entries()).map(([name, ids]) => ({
            name, count: ids.size
          })),
          diameter_range: {
            min: this.byDiameterRange[0]?.diameter || 0,
            max: this.byDiameterRange[this.byDiameterRange.length - 1]?.diameter || 0
          }
        };
      }
    }
    ```

3b. Integrate ToolIndex into ToolRegistry — build index after all tools are loaded.
    str_replace on ToolRegistry.ts: after load completes, call this.index.buildIndex(this.tools).

3c. Build + verify:
    prism_dev action=build target=mcp-server  [effort=medium]

=== STEP 4: ADD tool_facets ACTION TO DISPATCHER ===
Effort: ~3 calls

4a. Read current dataDispatcher.ts tool-related actions:
    prism_dev action=code_search pattern="tool_search\|tool_get\|tool_compare" path="src/tools/dispatchers/dataDispatcher.ts"  [effort=high]

4b. Add tool_facets action to dataDispatcher.ts:
    str_replace to add new action handler:

    ACTION: tool_facets
    INPUT: { filters?: { category?: string, vendor?: string, diameter_min?: number,
             diameter_max?: number, coating?: string } }
    LOGIC: Call toolRegistry.index.getFacets(filters)
    OUTPUT: { facets: { categories: [{name, count}], vendors: [{name, count}],
              coatings: [{name, count}], diameter_range: {min, max} },
              total_tools: number, filtered_tools: number }

    This action enables the app to populate filter dropdown menus with live counts.
    When user selects "TURNING_INSERTS" → categories show updated counts for vendors
    that have turning inserts, not all vendors globally.

4c. Build + verify:
    prism_dev action=build target=mcp-server  [effort=medium]
    Restart Claude Desktop (new action added).
    Test: prism_data action=tool_facets  [effort=low]
    EXPECTED: Returns category list with counts summing to total tool count.
    Test: prism_data action=tool_facets filters='{"category":"TURNING_INSERTS"}'  [effort=low]
    EXPECTED: Returns vendors/coatings/diameters filtered to turning inserts only.

=== STEP 5: VERIFY TOOL SEARCH USES INDEX ===
Effort: ~2 calls

5a. Test tool_search with normalized results:
    prism_data action=tool_search query="CNMG 120408"  [effort=high]
    EXPECTED: Returns matching turning inserts with normalized schema (vendor, not manufacturer).
    prism_data action=tool_search query="carbide endmill 12mm"  [effort=high]
    EXPECTED: Returns endmills filtered by diameter range near 12mm.

5b. If tool_search does NOT use ToolIndex:
    Read tool_search handler in dataDispatcher.ts.
    Wire it to use ToolIndex for category/diameter filtering before text matching.
    Build + verify.

=== STEP 5b: 85-PARAMETER TOOL HOLDER UPGRADE (v14.2 — Gap 7) ===
Effort: ~6 calls
Source: TOOL_HOLDER_DATABASE_ROADMAP_v4.md

5b-1. Upgrade tool holder schema from 65→85 simulation-grade parameters:
      NEW PARAMETERS (20 additions):
        Collision: envelope_profile_points [[z,r]...], max_protrusion_mm
        Dynamics: moment_of_inertia, center_of_mass, critical_rpm_bands, chatter_susceptibility
        Quality: balance_grade, runout_typical_um, grip_force_kn
        Performance: derating_speed, derating_feed, derating_doc, derating_woc,
                     derating_tool_life, derating_surface_finish
        Thermal: thermal_growth_um_per_c, max_operating_temp_c
        Compatibility: spindle_interface_variants[], tool_diameter_range_mm
      Derive envelope_profile_points from existing geometry data.
      Calculate derating factors from holder type + rigidity classification.

5b-2. Type expansion: Add 34 new holder types
      (precision, anti-vibration, boring bar, tapping, live tooling, shrink-fit, etc.)
      Source: TOOL_HOLDER_DATABASE_ROADMAP_v4.md Phase 2C type expansion list.

5b-3. Brand expansion: Add 20 priority brands (~1,140 additional holders)
      (Kennametal, Sandvik, Walter, Seco, Iscar, etc.)
      Source: TOOL_HOLDER_DATABASE_ROADMAP_v4.md Phase 2D brand list.

5b-4. Wire expanded holder data through tool_get, tool_recommend, tool_search.
      Build + validate 85-param schema with DataValidationEngine from MS4.5.
      Target: 12,000+ holders at 85 params, fully indexed.

=== STEP 6: DOCUMENT ===
Effort: ~2 calls

6a. Append REGISTRY_AUDIT.md:
    "R1-MS5 TOOL NORMALIZATION COMPLETE [date]
     Schema variants normalized: [N] field mappings applied
     ToolIndex built: [N] tools indexed across [N] categories, [N] vendors
     tool_facets action operational
     Total tools: [count] (all files, deduplicated)"

6b. Append ROADMAP_TRACKER.md:
    "R1-MS5 COMPLETE [date] — Tool schema normalization + ToolIndex + tool_facets"

6c. Update CURRENT_POSITION.md:
    "CURRENT: R1-MS6 | LAST_COMPLETE: R1-MS5 [date] | PHASE: R1 in-progress"
```

**Rollback:** Revert ToolRegistry.ts and dataDispatcher.ts changes. Rebuild.
  Tools continue to work as before (linear scan, no index). App loses filter dropdowns.
**Exit:** All tools normalized. ToolIndex provides O(1) lookup. tool_facets action live.
  15,912 → 14 canonical categories indexed. App filter layer ready.

---

## R1-MS6: Material Enrichment Completion (M-0)
⚡ CLAUDE CODE PARALLEL: This MS can run as an independent agent in its own Git worktree.
  Worktree: feature/r1-ms6-material-enrichment | Focus: src/data/materials/, MaterialRegistry.ts

**Source:** PRISM_DATABASE_AUDIT_AND_ROADMAP.md §2.5 + SUPERPOWER_ROADMAP_AUDIT.md GAP 1
**Effort:** ~14 calls | **Tier:** DEEP | **Context:** ~7KB
**Response Budget:** ~12KB throughput, ~5KB peak
**Entry:** R1-MS5 COMPLETE.

**WHY THIS IS CRITICAL:**
  3,392 materials loaded but 95% lack tribology, composition, and designation cross-references.
  materials_complete/ directory (52.2 MB) has RICH data: 17-element composition, tribology
  (sliding_friction, adhesion, galling), surface_integrity, thermal_machining, statistics
  (standardDeviation for uncertainty calculations). This data EXISTS but isn't reaching engines.
  When speed_feed_calc calls getByIdOrName("4140"), it gets material but composition/tribology
  fields return null. uncertainty_chain action needs statistics.standardDeviation which only
  exists in materials_complete schema.

**REFERENCE DOCUMENT:** Load PRISM_DATABASE_AUDIT_AND_ROADMAP.md §2 during this MS ONLY.

```
=== STEP 1: AUDIT CURRENT ENRICHMENT STATE ===
Effort: ~3 calls

1a. Count materials with enrichment in canonical files:
    Write a script (prism_dev action=file_write) that scans all JSON files in data/materials/
    EXCLUDING merged_from_complete.json files, and counts:
      - Total canonical materials
      - Materials with tribology != null
      - Materials with composition != null
      - Materials with designation != null (or designation object with UNS/DIN/JIS fields)

1b. Count materials in merged_from_complete.json files:
    Same script counts entries in merged_from_complete.json per ISO group:
      - P_STEELS/merged_from_complete.json
      - M_STAINLESS/merged_from_complete.json
      - K_CAST_IRON/merged_from_complete.json
      - N_NONFERROUS/merged_from_complete.json
      - S_SUPERALLOYS/merged_from_complete.json
      - H_HARDENED/merged_from_complete.json
      - X_SPECIALTY/merged_from_complete.json

1c. Run the script, record results:
    EXPECTED STATE: ~3,392 canonical materials with ~5% tribology (from prior M-0 partial work)
    and ~0% composition. merged_from_complete.json files have the enrichment data.

=== STEP 2: ENRICHMENT MERGE SCRIPT ===
Effort: ~5 calls

2a. Read a sample merged_from_complete.json to understand the schema:
    prism_dev action=file_read path="data/materials/P_STEELS/merged_from_complete.json"
      start_line=1 end_line=80  [effort=low]
    Identify: How materials are keyed (by name? by ID? by designation?).
    Identify: Which fields need to be merged (tribology, composition, surface_integrity,
      thermal_machining, statistics, designation).

2b. Write enrichment merge script (prism_dev action=file_write):
    The script operates per ISO group directory:

    ENRICHMENT MERGE ALGORITHM:
    ```
    For each ISO group directory (P_STEELS, M_STAINLESS, etc.):
      1. Load merged_from_complete.json → build lookup by material name (lowercase, stripped)
      2. Load each canonical JSON file (bearing_steel_verified.json, alloy_steel_gen.json, etc.)
      3. For each canonical material entry:
         a. Find matching entry in merged data (match by name, or by designation if available)
            MATCHING RULES (in order of confidence):
              i.   Exact name match (case-insensitive, trim whitespace)
              ii.  AISI designation match (e.g., "4140" matches "AISI 4140")
              iii. UNS designation match (e.g., "G41400" matches "UNS G41400")
              iv.  Fuzzy match: name contains the other name (e.g., "4140 Annealed" contains "4140")
            If NO match found: skip this material. Log as "NO_MATCH: [name]".
            If MULTIPLE matches found: use the one with highest data completeness.

         b. Merge enrichment fields INTO canonical entry (additive — never overwrite existing):
            if (!canonical.tribology && merged.tribology) canonical.tribology = merged.tribology;
            if (!canonical.composition && merged.composition) canonical.composition = merged.composition;
            if (!canonical.surface_integrity && merged.surface_integrity) canonical.surface_integrity = merged.surface_integrity;
            if (!canonical.thermal_machining && merged.thermal_machining) canonical.thermal_machining = merged.thermal_machining;
            if (!canonical.statistics && merged.statistics) canonical.statistics = merged.statistics;
            if (!canonical.designation && merged.designation) canonical.designation = merged.designation;

            CRITICAL: NEVER overwrite existing fields. If canonical already has tribology, keep it.
            The canonical data was verified — merged data is supplementary.

         c. Write updated canonical file (preserve ALL existing fields, add new ones)
      4. Log: "[group] enriched [N] of [M] materials. [K] had no match in merged data."
    ```

2c. Execute the enrichment script:
    Run via prism_dev action=build or node execution.
    Monitor output: How many materials were enriched? How many had no match?

2d. Handle edge cases:
    IF many NO_MATCH entries: The naming convention differs between canonical and merged.
      Try designation-based matching (canonical uses AISI names, merged uses ISO/UNS/DIN).
      Check if merged data uses a different ID format (e.g., "P-CS-0014" vs "CS-1018-ANNEALED").
    IF few matches: The merged data may use completely different material keys.
      Fall back to property-based matching: match by (hardness ± 10%) AND (density ± 0.5).
      This is less precise but catches materials with different naming conventions.

=== STEP 3: ADD DESIGNATION INDEX TO MATERIALREGISTRY ===
Effort: ~2 calls

3a. Read MaterialRegistry.ts:
    prism_dev action=code_search pattern="getByIdOrName\|getById" path="src/registries/MaterialRegistry.ts"  [effort=high]

3b. Add designation lookup:
    str_replace to add a byDesignation Map<string, string> built during load:

    DESIGNATION INDEX SPECIFICATION:
    ```typescript
    private byDesignation: Map<string, string> = new Map();  // designation → material_id

    // During load, after normalization:
    if (material.designation) {
      const desig = material.designation;
      // Map ALL designation variants to the same material_id
      if (desig.aisi) this.byDesignation.set(desig.aisi.toLowerCase(), material.id);
      if (desig.uns) this.byDesignation.set(desig.uns.toLowerCase(), material.id);
      if (desig.din) this.byDesignation.set(desig.din.toLowerCase(), material.id);
      if (desig.jis) this.byDesignation.set(desig.jis.toLowerCase(), material.id);
      if (desig.en) this.byDesignation.set(desig.en.toLowerCase(), material.id);
      // Also map common shorthand: "4140", "1018", "316" etc.
      if (desig.aisi) {
        const short = desig.aisi.replace(/^AISI\s*/i, '').trim();
        this.byDesignation.set(short.toLowerCase(), material.id);
      }
    }

    // Enhance getByIdOrName to check designation index:
    getByIdOrName(query: string): Material | null {
      // 1. Try exact ID match
      const byId = this.getById(query);
      if (byId) return byId;
      // 2. Try designation index
      const fromDesig = this.byDesignation.get(query.toLowerCase());
      if (fromDesig) return this.getById(fromDesig);
      // 3. Try name search (existing logic)
      return this.searchByName(query);
    }
    ```

    This means machinists can type "4140", "1.7225" (DIN), "SCM440" (JIS), or "UNS G41400"
    and all resolve to the same material. This is how real machinists think — by designation,
    not by internal IDs like "CS-4140-ANNEALED".

=== STEP 4: VERIFY ENRICHMENT ===
Effort: ~3 calls

4a. Build:
    prism_dev action=build target=mcp-server  [effort=medium]
    Restart Claude Desktop.

4b. Verify enrichment on critical materials:
    prism_data action=material_get material="4140"  [effort=high]
    CHECK: response.tribology is NOT null (should have sliding_friction, adhesion, etc.)
    CHECK: response.composition is NOT null (should have C, Mn, Cr, Mo, etc.)
    CHECK: response.designation is NOT null (should have aisi, uns, din)

    prism_data action=material_get material="Ti-6Al-4V"  [effort=high]
    CHECK: same enrichment fields present

    prism_data action=material_get material="316SS"  [effort=high]
    CHECK: same enrichment fields present

    MATERIAL SANITY CHECK (SK-5 — run on EVERY material_get response):
    Verify cross-parameter consistency:
      4140 (alloy steel): density 7.5-8.1, hardness > 120 HB
      Ti-6Al-4V (titanium): density 4.3-4.8, hardness > 250 HB
      316SS (stainless): density 7.5-8.1, hardness > 120 HB
    IF sanity check FAILS → DATA SWAP. Material name doesn't match parameters. CRITICAL.

4c. Verify designation lookup:
    prism_data action=material_get material="1.7225"  [effort=high]
    EXPECTED: Returns 4140 (1.7225 is the DIN designation for 4140)
    IF NOT FOUND: Designation index didn't build. Debug MaterialRegistry.ts.

=== STEP 5: COVERAGE METRICS ===
Effort: ~1 call

5a. Run enrichment count script again (same as Step 1a):
    Record: tribology coverage %, composition coverage %, designation coverage %
    TARGETS: >80% tribology, >80% composition, >90% designation
    IF below targets: Identify which ISO groups have low coverage. Focus enrichment there.
    The most important groups are P_STEELS (most commonly machined) and S_SUPERALLOYS
    (most dangerous to machine wrong).

=== STEP 6: DOCUMENT ===
Effort: ~2 calls

6a. Append REGISTRY_AUDIT.md with enrichment results.
6b. Append ROADMAP_TRACKER + update CURRENT_POSITION.
```

**Rollback:** Revert MaterialRegistry.ts changes. Keep enriched data files (enrichment is additive
  and doesn't break anything — the loader simply has more fields available).
**Exit:** Canonical materials enriched in-place. Designation cross-references live.
  cross_query returns real tribology/composition data. Machinists can query by any designation.

---

## R1-MS7: Machine Field Population (MCH-0)
⚡ CLAUDE CODE PARALLEL: This MS can run as an independent agent in its own Git worktree.
  Worktree: feature/r1-ms7-machine-population | Focus: src/data/machines/, MachineRegistry.ts

**Source:** PRISM_DATABASE_AUDIT_AND_ROADMAP.md §3 + SUPERPOWER_ROADMAP_AUDIT.md GAP 3
**Effort:** ~14 calls | **Tier:** DEEP | **Context:** ~7KB
**Response Budget:** ~12KB throughput, ~5KB peak
**Entry:** R1-MS6 COMPLETE (or can run PARALLEL with MS6 — independent data targets)

**WHY THIS IS CRITICAL:**
  1,016 machines in registry but 0% have power/torque curves, 0% have work envelope data.
  cross_query chains material→tool→machine but machine link is broken (no power for safety
  checks, no envelope for part fit). machine_recommend literally CANNOT work without power
  data to filter on. Spindle protection engine (1 of 5 safety engines) needs spindleSpec
  with max_rpm, power_kw, max_torque_nm — all currently zero/null.

**NOTE:** This MS can run in the same session as MS6 if context budget allows.
  MS6 modifies material data, MS7 modifies machine data — zero overlap.

```
=== STEP 1: IDENTIFY TOP 50 MACHINES ===
Effort: ~2 calls

1a. List machines currently in registry:
    prism_data action=machine_search query="*" limit=50  [effort=high]
    From results, identify the most commonly used machines in manufacturing shops.

1b. Compile the TOP 50 list (these cover ~80% of real-world machinist queries):

    VERTICAL MACHINING CENTERS (VMC):
      Haas VF-2, VF-3, VF-4, VF-6SS, VM-3
      DMG MORI DMU 50, DMU 65, CMX 600V
      Mazak VCN-530C, VTC-300C, Variaxis i-700
      Okuma MB-5000H, MU-5000V
      Doosan DNM 500, DVF 5000
      Hurco VMX 42i, VMX 60i
      Fanuc Robodrill α-D21MiB5
      Makino PS95, a51nx
      Brother Speedio S700X1

    TURNING CENTERS / LATHES:
      Haas ST-20, ST-30, DS-30Y
      Mazak QT-250, QTN-250M, Integrex i-200S
      Okuma LB3000 EX II, LU3000 EX
      Doosan Puma GT-2600, Lynx 2100
      DMG MORI NLX 2500, CLX 450

    HORIZONTAL MACHINING CENTERS (HMC):
      Haas EC-400
      Mazak HCN-5000, FH-6800
      Okuma MA-500HII
      Makino a61nx, a81nx
      DMG MORI NHX 5000, NHX 6300

    5-AXIS:
      Hermle C 42 U, C 22 U
      Grob G350, G550
      Matsuura MAM72-35V

=== STEP 2: POPULATE CRITICAL FIELDS FOR TOP 50 ===
Effort: ~6 calls

2a. For each machine in the top 50, populate these fields using manufacturer datasheets.
    The data comes from publicly available manufacturer spec sheets and catalogs.

    REQUIRED FIELDS (these feed safety calculations):
    ```
    spindle: {
      max_rpm: number,           // Maximum spindle speed (always available on spec sheet)
      power_kw: number,          // Continuous power rating at spindle (not motor rating)
      max_torque_nm: number,     // Maximum torque (usually at base speed)
      interface: string,         // BT40 | CAT40 | CAT50 | HSK-A63 | HSK-A100 | BT50
      drive_type: string         // belt | direct | gear | built-in
    }

    travels: {
      x_mm: number,             // X-axis travel
      y_mm: number,             // Y-axis travel
      z_mm: number,             // Z-axis travel
      a_deg?: number,           // A-axis rotation (if applicable)
      c_deg?: number            // C-axis rotation (if applicable)
    }

    table: {
      size_mm: string,          // "762x356" or "500x500" or "250 dia"
      max_load_kg: number,      // Maximum workpiece weight
      t_slots?: string          // T-slot pattern description
    }

    // Lathes only:
    turret?: {
      type: string,             // VDI30 | VDI40 | VDI50 | BMT55 | BMT65
      stations: number,         // Number of tool stations
      live_tools: boolean       // Has live (driven) tool capability
    }

    // General:
    controller: {
      brand: string,            // Fanuc | Siemens | Mazak | Haas | Okuma
      model: string             // 0i-MF | 840D | MAZATROL | NGC | OSP-P300
    }

    axes: number                // 3 | 4 | 5
    type: string                // VMC | HMC | Lathe | 5-axis | Mill-Turn
    year_range: string          // "2015-present" or "2018-2023"
    ```

2b. Create enrichment data file:
    prism_dev action=file_write path="data/machines/ENHANCED/top50_specs.json"
    content='{ "metadata": { "source": "manufacturer_datasheets", "date": "[today]" },
               "machines": [ { "name": "Haas VF-2", "manufacturer": "Haas",
                 "spindle": { "max_rpm": 8100, "power_kw": 22.4, "max_torque_nm": 122,
                   "interface": "BT40", "drive_type": "belt" },
                 "travels": { "x_mm": 762, "y_mm": 406, "z_mm": 508 },
                 "table": { "size_mm": "914x356", "max_load_kg": 1588 },
                 "controller": { "brand": "Haas", "model": "NGC" },
                 "axes": 3, "type": "VMC" }, ... ] }'

    CRITICAL: USE REAL MANUFACTURER SPEC DATA. Do NOT fabricate numbers.
    If exact spec is unavailable for a machine → leave field null, do NOT guess.
    A wrong max_rpm causes the system to recommend spindle speeds above machine capability.
    A wrong power_kw causes the system to approve cuts that exceed machine power.
    Both result in tool breakage and potential operator injury.

    SOURCING PRIORITY (use highest-confidence source available):
      1. Manufacturer's published spec sheets (PDF datasheets from haascnc.com, dmgmori.com, etc.)
      2. Manufacturer's online machine configurator/spec page
      3. Industry databases (MachineTools.com, Grainger industrial specs)
      4. If NO source → leave null and document as "NEEDS VERIFICATION" in PHASE_FINDINGS.md

2c. If the machine already exists in registry with SOME data:
    MERGE strategy: Only ADD missing fields. NEVER overwrite existing non-null values.
    The existing registry data was loaded from V3 3D model database which has collision models.
    The new data adds spindle/power/envelope — complementary, not conflicting.

=== STEP 3: VERIFY MACHINEREGISTRY LOADS NEW DATA ===
Effort: ~3 calls

3a. Verify MachineRegistry.loadLayer handles the file format:
    prism_dev action=code_search pattern="loadLayer\|loadEnhanced" path="src/registries/MachineRegistry.ts"  [effort=high]
    KNOWN ISSUE FROM R1-MS2b: MachineRegistry needed a fix for {metadata, machines:[...]} wrapper.
    Verify that fix is still in place and handles top50_specs.json.

3b. Build + restart:
    prism_dev action=build target=mcp-server  [effort=medium]
    Restart Claude Desktop.

3c. Verify populated data:
    prism_data action=machine_get machine="VF-2"  [effort=high]
    CHECK: spindle.power_kw is NOT null/zero
    CHECK: travels.x_mm, y_mm, z_mm are populated
    CHECK: controller.brand is populated

    prism_data action=machine_get machine="DMU 50"  [effort=high]
    CHECK: same fields populated

    prism_data action=machine_get machine="QT-250"  [effort=high]
    CHECK: turret.type is populated (should be BMT55 or similar)

=== STEP 4: VERIFY CROSS-QUERY WITH MACHINE DATA ===
Effort: ~2 calls

4a. Test cross_query now that machines have specs:
    prism_data action=cross_query material="4140" operation="turning" machine="QT-250"  [effort=high]
    EXPECTED: Machine constraints are non-null. Power check returns meaningful result.
    Should include: max_rpm from machine, power available, turret interface for tool matching.

4b. If cross_query still returns null machine constraints:
    Read cross_query handler → trace where machine data is accessed → verify field names match.

=== STEP 5: DOCUMENT ===
Effort: ~1 call

5a. Append REGISTRY_AUDIT.md, ROADMAP_TRACKER, update CURRENT_POSITION.
```

**Rollback:** Delete top50_specs.json. Rebuild. Machines revert to prior state (loaded but no specs).
**Exit:** Top 50 machines have complete specs. cross_query chain works end-to-end.
  machine_recommend has power/envelope data to filter on. Spindle protection engine has real data.

---

## R1-MS8: Formula Registry + Dispatcher Wiring

**Source:** SUPERPOWER_ROADMAP_AUDIT.md GAPs 4, 6, 7, 10
**Effort:** ~18 calls | **Tier:** DEEP | **Context:** ~8KB
**Response Budget:** ~15KB throughput, ~6KB peak
**Entry:** R1-MS5 COMPLETE (ToolIndex exists — needed for tool_recommend in unified search).
  MS6 and MS7 can be in-progress or complete — this MS is independent of enrichment data.

**WHY THIS IS CRITICAL:**
  GAP 4: 9 calculator formulas hardcoded in calcDispatcher but NOT in FormulaRegistry.
    App needs a "Calculator" page where machinists pick a formula, enter values, get results.
    Without formulas in the registry, they're undiscoverable.
  GAP 6: ToolpathStrategyRegistry has 697 strategies in 4,449 lines but toolpathDispatcher
    exposes only 8 actions. Massive domain knowledge (trochoidal vs HEM vs conventional vs
    adaptive clearing) is locked behind unexposed methods.
  GAP 7: ThreadCalculationEngine has 658 lines of math (tap drill, thread milling, depth,
    engagement, specs, Go/NoGo) but threadDispatcher has minimal wiring.
  GAP 10: No unified search across registries. Each registry has different search signature.

```
=== PART A: CALCULATOR FORMULAS (FRM-0) ===
Effort: ~5 calls

A1. Read FormulaRegistry to understand formula data format:
    prism_dev action=file_read path="src/registries/FormulaRegistry.ts" start_line=1 end_line=80  [effort=low]
    Identify: JSON schema for formula entries. How formulas are stored and retrieved.

A2. Read existing formula data files:
    prism_dev action=file_read path="data/formulas/" start_line=1 end_line=50  [effort=low]
    Understand the structure to add new entries consistently.

A3. Create 9 calculator formula entries in formula data file:
    prism_dev action=file_write (append to existing formula data, or new file):

    FORMULA DEFINITIONS:
    ```json
    [
      {
        "id": "F-CALC-001",
        "name": "RPM Calculator",
        "domain": "PHYSICS",
        "category": "basic_calculation",
        "equation_latex": "n = \\frac{V_c \\times 1000}{\\pi \\times D}",
        "description": "Calculate spindle RPM from cutting speed and tool diameter",
        "inputs": [
          { "name": "Vc", "unit": "m/min", "description": "Cutting speed", "min": 1, "max": 2000 },
          { "name": "D", "unit": "mm", "description": "Tool diameter", "min": 0.1, "max": 500 }
        ],
        "outputs": [
          { "name": "n_rpm", "unit": "rpm", "description": "Spindle speed" }
        ],
        "formula_js": "({ Vc, D }) => ({ n_rpm: (Vc * 1000) / (Math.PI * D) })"
      },
      {
        "id": "F-CALC-002",
        "name": "Feed Rate Calculator",
        "domain": "PHYSICS",
        "category": "basic_calculation",
        "equation_latex": "V_f = n \\times f_z \\times z",
        "description": "Calculate table feed rate from RPM, feed per tooth, and number of flutes",
        "inputs": [
          { "name": "n_rpm", "unit": "rpm", "description": "Spindle speed", "min": 1, "max": 100000 },
          { "name": "fz", "unit": "mm/tooth", "description": "Feed per tooth", "min": 0.001, "max": 10 },
          { "name": "z", "unit": "", "description": "Number of flutes/teeth", "min": 1, "max": 20 }
        ],
        "outputs": [
          { "name": "Vf", "unit": "mm/min", "description": "Table feed rate" }
        ],
        "formula_js": "({ n_rpm, fz, z }) => ({ Vf: n_rpm * fz * z })"
      },
      {
        "id": "F-CALC-003",
        "name": "Material Removal Rate (MRR)",
        "domain": "PHYSICS",
        "category": "productivity",
        "equation_latex": "Q = \\frac{a_e \\times a_p \\times V_f}{1000}",
        "description": "Calculate volume of material removed per minute",
        "inputs": [
          { "name": "ae", "unit": "mm", "description": "Radial depth of cut (width)", "min": 0.01, "max": 500 },
          { "name": "ap", "unit": "mm", "description": "Axial depth of cut", "min": 0.01, "max": 100 },
          { "name": "Vf", "unit": "mm/min", "description": "Table feed rate", "min": 1, "max": 50000 }
        ],
        "outputs": [
          { "name": "Q", "unit": "cm³/min", "description": "Material removal rate" }
        ],
        "formula_js": "({ ae, ap, Vf }) => ({ Q: (ae * ap * Vf) / 1000 })"
      },
      {
        "id": "F-CALC-004",
        "name": "Cutting Power",
        "domain": "PHYSICS",
        "category": "machine_loading",
        "equation_latex": "P_c = \\frac{F_c \\times V_c}{60000 \\times \\eta}",
        "description": "Calculate net cutting power from cutting force and speed",
        "inputs": [
          { "name": "Fc", "unit": "N", "description": "Main cutting force", "min": 1, "max": 100000 },
          { "name": "Vc", "unit": "m/min", "description": "Cutting speed", "min": 1, "max": 2000 },
          { "name": "eta", "unit": "", "description": "Machine efficiency (typically 0.75-0.90)", "min": 0.5, "max": 1.0 }
        ],
        "outputs": [
          { "name": "Pc", "unit": "kW", "description": "Net cutting power" }
        ],
        "formula_js": "({ Fc, Vc, eta }) => ({ Pc: (Fc * Vc) / (60000 * eta) })"
      },
      {
        "id": "F-CALC-005",
        "name": "Cutting Torque",
        "domain": "PHYSICS",
        "category": "machine_loading",
        "equation_latex": "M_c = \\frac{F_c \\times D}{2000}",
        "description": "Calculate torque at the spindle from cutting force and diameter",
        "inputs": [
          { "name": "Fc", "unit": "N", "description": "Main cutting force", "min": 1, "max": 100000 },
          { "name": "D", "unit": "mm", "description": "Tool diameter", "min": 0.1, "max": 500 }
        ],
        "outputs": [
          { "name": "Mc", "unit": "Nm", "description": "Cutting torque" }
        ],
        "formula_js": "({ Fc, D }) => ({ Mc: (Fc * D) / 2000 })"
      },
      {
        "id": "F-CALC-006",
        "name": "Surface Finish (Turning)",
        "domain": "PHYSICS",
        "category": "surface_quality",
        "equation_latex": "R_a = \\frac{f_n^2}{8 \\times r_\\varepsilon} \\times 1000",
        "description": "Theoretical surface roughness in turning from feed per revolution and nose radius",
        "inputs": [
          { "name": "fn", "unit": "mm/rev", "description": "Feed per revolution", "min": 0.01, "max": 2.0 },
          { "name": "re", "unit": "mm", "description": "Tool nose radius", "min": 0.1, "max": 6.0 }
        ],
        "outputs": [
          { "name": "Ra", "unit": "µm", "description": "Theoretical surface roughness (Ra)" }
        ],
        "formula_js": "({ fn, re }) => ({ Ra: (fn * fn) / (8 * re) * 1000 })"
      },
      {
        "id": "F-CALC-007",
        "name": "Surface Finish (Milling)",
        "domain": "PHYSICS",
        "category": "surface_quality",
        "equation_latex": "R_a = \\frac{f_z^2}{4 \\times D} \\times 1000",
        "description": "Theoretical surface roughness in face milling from feed per tooth and cutter diameter",
        "inputs": [
          { "name": "fz", "unit": "mm/tooth", "description": "Feed per tooth", "min": 0.01, "max": 2.0 },
          { "name": "D", "unit": "mm", "description": "Cutter diameter", "min": 1, "max": 500 }
        ],
        "outputs": [
          { "name": "Ra", "unit": "µm", "description": "Theoretical surface roughness (Ra)" }
        ],
        "formula_js": "({ fz, D }) => ({ Ra: (fz * fz) / (4 * D) * 1000 })"
      },
      {
        "id": "F-CALC-008",
        "name": "Cost Per Part",
        "domain": "ECONOMICS",
        "category": "cost_analysis",
        "equation_latex": "C_p = T_m \\times M_r + \\frac{T_c \\times C_t}{T_l} + \\frac{T_s \\times M_r}{N}",
        "description": "Total cost per part including machining, tooling, and setup",
        "inputs": [
          { "name": "Tm", "unit": "min", "description": "Machining time per part", "min": 0.1, "max": 10000 },
          { "name": "Mr", "unit": "$/min", "description": "Machine rate (cost per minute)", "min": 0.1, "max": 50 },
          { "name": "Tc", "unit": "min", "description": "Tool change time", "min": 0.1, "max": 30 },
          { "name": "Ct", "unit": "$", "description": "Tool/insert cost", "min": 0.5, "max": 500 },
          { "name": "Tl", "unit": "min", "description": "Tool life", "min": 1, "max": 10000 },
          { "name": "Ts", "unit": "min", "description": "Setup time", "min": 1, "max": 1000 },
          { "name": "N", "unit": "", "description": "Batch size", "min": 1, "max": 1000000 }
        ],
        "outputs": [
          { "name": "Cp", "unit": "$", "description": "Cost per part" }
        ],
        "formula_js": "({ Tm, Mr, Tc, Ct, Tl, Ts, N }) => ({ Cp: (Tm * Mr) + ((Tc * Ct) / Tl) + ((Ts * Mr) / N) })"
      },
      {
        "id": "F-CALC-009",
        "name": "Extended Taylor Tool Life",
        "domain": "PHYSICS",
        "category": "tool_life",
        "equation_latex": "T = \\frac{C}{V_c^n \\times f_z^a \\times a_p^b}",
        "description": "Multi-factor Taylor tool life including feed and depth of cut",
        "inputs": [
          { "name": "C", "unit": "", "description": "Taylor constant (material-specific)", "min": 1, "max": 10000 },
          { "name": "Vc", "unit": "m/min", "description": "Cutting speed", "min": 1, "max": 2000 },
          { "name": "n", "unit": "", "description": "Speed exponent (typically 0.15-0.40)", "min": 0.05, "max": 1.0 },
          { "name": "fz", "unit": "mm/tooth", "description": "Feed per tooth", "min": 0.001, "max": 10 },
          { "name": "a_exp", "unit": "", "description": "Feed exponent (typically 0.10-0.30)", "min": 0.01, "max": 1.0 },
          { "name": "ap", "unit": "mm", "description": "Depth of cut", "min": 0.01, "max": 100 },
          { "name": "b_exp", "unit": "", "description": "Depth exponent (typically 0.05-0.15)", "min": 0.01, "max": 1.0 }
        ],
        "outputs": [
          { "name": "T", "unit": "min", "description": "Tool life" }
        ],
        "formula_js": "({ C, Vc, n, fz, a_exp, ap, b_exp }) => ({ T: C / (Math.pow(Vc, n) * Math.pow(fz, a_exp) * Math.pow(ap, b_exp)) })"
      }
    ]
    ```

A4. Wire formula_calculate action in calcDispatcher or dataDispatcher:
    ACTION: formula_calculate
    INPUT: { formula_id: string, inputs: Record<string, number> }
    LOGIC: Look up formula by ID → validate inputs against input schema → evaluate formula_js → return outputs
    OUTPUT: { formula_id, formula_name, inputs, outputs, equation_latex }

A5. Build + verify:
    prism_dev action=build target=mcp-server  [effort=medium]
    Restart Claude Desktop.
    Test: formula_calculate("F-CALC-001", { Vc: 150, D: 10 })
    EXPECTED: { n_rpm: 4775 } (150 * 1000 / π / 10 ≈ 4775)
    Test: formula_calculate("F-CALC-008", { Tm: 5, Mr: 1.5, Tc: 2, Ct: 15, Tl: 45, Ts: 30, N: 100 })
    EXPECTED: Cp = (5×1.5) + (2×15/45) + (30×1.5/100) = 7.5 + 0.667 + 0.45 = $8.617

=== PART B: TOOLPATH DISPATCHER WIRING ===
Effort: ~4 calls

B1. Read ToolpathStrategyRegistry to identify available methods:
    prism_dev action=code_search pattern="getStrategies\|getBest\|getByCategory\|getPrismNovel\|getById" path="src/registries/ToolpathStrategyRegistry.ts"  [effort=high]
    List ALL public methods that are NOT exposed through toolpathDispatcher.

B2. Read current toolpathDispatcher.ts:
    prism_dev action=file_read path="src/tools/dispatchers/toolpathDispatcher.ts"  [effort=low]
    Identify the 8 existing actions and what's missing.

B3. Add new actions to toolpathDispatcher.ts:
    str_replace to add handlers for:

    ACTION: strategy_for_job
    INPUT: { feature: string, material: string, machine_axes?: number,
             tool_diameter?: number, depth?: number }
    LOGIC:
      1. getStrategiesForFeature(feature) → filter by feature type (pocket, slot, contour, etc.)
      2. getStrategiesForMaterial(material) → filter by material suitability
      3. If machine_axes: filter strategies requiring more axes than available
      4. getBestStrategy(filtered, { material, depth, tool_diameter }) → rank by suitability
      5. Get cutting parameter presets for top 3 strategies
    OUTPUT: { recommendations: [{ strategy_name, description, reasoning, params: {Vc, fz, ae, ap},
              advantages: string[], limitations: string[] }], feature, material }

    ACTION: category_browse
    INPUT: { category?: string }
    LOGIC: getStrategiesByCategory(category) or list all categories with counts
    OUTPUT: { categories: [{name, count, description}] } or { strategies: [{name, description}] }

    ACTION: novel_strategies
    INPUT: {}
    LOGIC: getPrismNovelStrategies() → return PRISM-original strategies not in standard CAM
    OUTPUT: { novel_strategies: [{name, description, use_case, advantages}] }

    ACTION: strategy_detail
    INPUT: { strategy_id: string }
    LOGIC: getStrategyById(strategy_id) → full strategy details
    OUTPUT: Full strategy object with parameters, use cases, limitations

    ACTION: strategy_compare
    INPUT: { strategy_a: string, strategy_b: string, feature?: string, material?: string }
    LOGIC: Compare two strategies side-by-side for given conditions
    OUTPUT: { comparison: { mrr_advantage, tool_life_advantage, surface_finish,
              recommended: string, reasoning: string } }

B4. Build + verify:
    prism_dev action=build target=mcp-server  [effort=medium]
    Restart Claude Desktop.
    Test: strategy_for_job { feature: "pocket", material: "Inconel 718", machine_axes: 3 }
    EXPECTED: Trochoidal or HEM recommended, NOT conventional (wrong for superalloys)

=== PART C: THREAD DISPATCHER WIRING ===
Effort: ~3 calls

C1. Read ThreadCalculationEngine.ts public methods:
    prism_dev action=code_search pattern="public\|export" path="src/engines/ThreadCalculationEngine.ts"  [effort=high]
    List ALL public methods not exposed through threadDispatcher.

C2. Add new actions to threadDispatcher.ts:
    str_replace to add handlers:

    ACTION: thread_recommend
    INPUT: { thread_spec: string, material: string, hole_type: "blind" | "through",
             machine_type?: "lathe" | "mill" }
    LOGIC:
      1. Parse thread spec (M10x1.5, M10, 3/8-16 UNC, etc.)
      2. Get material properties for thread machining
      3. Calculate: tap drill size, thread mill option, Go/NoGo gauge limits
      4. Generate cutting parameters for both tapping and thread milling
    OUTPUT: { thread_spec, tap_drill: { diameter_mm, standard_drill_size },
              thread_mill: { available: boolean, params: {Vc, fz, ae} },
              go_nogo: { go_limit, nogo_limit, class },
              recommendation: "tap" | "thread_mill", reasoning: string }

    ACTION: tap_drill_calc
    INPUT: { thread_spec: string, engagement_pct?: number }
    LOGIC: Calculate tap drill diameter for given thread engagement percentage
    OUTPUT: { drill_diameter_mm, engagement_pct, thread_minor_dia, thread_pitch }

    ACTION: thread_mill_params
    INPUT: { thread_spec: string, material: string }
    LOGIC: Calculate thread milling parameters (single-point or multi-form)
    OUTPUT: { Vc, fz, helical_pitch, number_of_passes, approach_angle }

    ACTION: go_nogo_limits
    INPUT: { thread_spec: string, class?: string }
    LOGIC: Return Go/NoGo gauge limits for given thread spec and tolerance class
    OUTPUT: { go_gauge: { min, max }, nogo_gauge: { min, max }, class, tolerance }

C3. Build + verify:
    prism_dev action=build target=mcp-server  [effort=medium]
    Restart Claude Desktop.
    Test: thread_recommend { thread_spec: "M10x1.5", material: "4140", hole_type: "blind" }
    EXPECTED: Tap drill ~8.5mm, tapping recommended for blind holes, Go/NoGo limits returned

=== PART D: UNIFIED SEARCH ===
Effort: ~3 calls

D1. Add unified_search action to dataDispatcher.ts:

    ACTION: unified_search
    INPUT: { query: string }
    LOGIC: Auto-detect query type based on pattern matching, then route to appropriate registry:

    DETECTION PATTERNS:
    ```typescript
    function detectQueryType(query: string): 'material' | 'tool' | 'alarm' | 'strategy' | 'formula' | 'machine' {
      const q = query.toLowerCase().trim();

      // Alarm patterns: number + controller name, or "alarm" keyword
      if (/alarm|fault|error/i.test(q) || /^\d{1,5}\s*(fanuc|haas|siemens|mazak|okuma)/i.test(q))
        return 'alarm';

      // Machine patterns: manufacturer + model number
      if (/^(haas|dmg|mazak|okuma|doosan|hurco|makino|fanuc|hermle|grob)\s/i.test(q))
        return 'machine';

      // Tool patterns: ISO insert notation, tool type keywords
      if (/^[A-Z]{4}\s*\d{6}/i.test(q) || /endmill|drill|tap|ream|bore|insert|holder/i.test(q))
        return 'tool';

      // Strategy patterns: machining operation keywords
      if (/trochoidal|hem|adaptive|pocket|slot|contour|face\s*mill|roughing|finishing/i.test(q))
        return 'strategy';

      // Formula patterns
      if (/formula|calc|equation|rpm|mrr|taylor|kienzle/i.test(q))
        return 'formula';

      // Default: material (most common query type)
      return 'material';
    }
    ```

    After detection, route to appropriate search:
    - material → material_search
    - tool → tool_search (using ToolIndex)
    - alarm → alarm_decode or alarm_search
    - strategy → strategy_for_job or category_browse
    - formula → formula list/search
    - machine → machine_search

    OUTPUT: { query, detected_type, results: [...], cross_registry_counts: {
      materials: number, tools: number, machines: number, strategies: number } }

D2. Build + verify:
    prism_dev action=build target=mcp-server  [effort=medium]
    Restart Claude Desktop.
    Test: unified_search { query: "CNMG 120408" }
    EXPECTED: Detects as tool, returns matching turning inserts
    Test: unified_search { query: "4140" }
    EXPECTED: Detects as material, returns 4140 steel with enrichment data
    Test: unified_search { query: "alarm 414 fanuc" }
    EXPECTED: Detects as alarm, returns Fanuc alarm 414 decode
    Test: unified_search { query: "trochoidal milling" }
    EXPECTED: Detects as strategy, returns trochoidal strategies

D3. Document all new actions:
    Append ROADMAP_TRACKER + update CURRENT_POSITION.
```

**Rollback:** Revert dispatcher changes per part. Rebuild.
  Part A: Remove formula data + formula_calculate handler.
  Part B: Remove toolpath actions.
  Part C: Remove thread actions.
  Part D: Remove unified_search handler.
  Each part is independent — a failure in Part C doesn't require reverting Part A.

**Exit:** 9 calculator formulas in registry. Toolpath strategies fully exposed (697 via 5 new actions).
  Thread calculations complete (4 new actions). Unified search enables single-query access.
  All 162 zero-coverage formulas classified.

**FORMULA COVERAGE CLASSIFICATION (mandatory, part of R1-MS8):**
```
  162 formulas have zero roadmap coverage. Classify each as:
    ACTIVE:     Formula is used by an existing engine but not tested by R2
                → Add to R2 regression suite backlog for next R2 pass
    DORMANT:    Formula exists but no engine references it
                → Tag as dormant in FormulaRegistry. Available for future use.
    DEPRECATED: Formula superseded by a better model (e.g., basic Taylor when Extended Taylor exists)
                → Tag as deprecated. Do NOT remove (anti-regression). Log in PHASE_FINDINGS.md.
    SAFETY:     Formula could produce safety-critical outputs if invoked
                → MUST be tested before R6 production gate. Add to R2 supplement list.

  Record classification in FORMULA_COVERAGE_AUDIT.md:
    { formula_id, name, classification, referenced_by_engines[], tested_in_R2: bool }

  EXIT: All 162 formulas classified. Any SAFETY-classified formulas have test plans.
  ⚡ CLAUDE CODE: Bulk classification of 162 formulas is ideal for Claude Code batch processing.
```

---

## R1-MS9: Quality Metrics + Phase Gate

**Source:** Original R1-MS5 (renumbered) + fault injection test
**Effort:** ~12 calls | **Tier:** RELEASE | **Context:** ~6KB
**Response Budget:** ~10KB throughput, ~4KB peak
**Entry:** R1-MS5 through R1-MS8 ALL COMPLETE.

```
=== DATA QUALITY METRICS ===
1. Tool normalization metrics:
   prism_data action=tool_facets  [effort=low]
   VERIFY: All entries have canonical schema. Index coverage = 100% of loaded tools.
   Record: total tools indexed, categories, vendors, diameter range.

2. Material enrichment metrics:
   Run enrichment count: tribology %, composition %, designation %
   TARGETS: >80% tribology, >80% composition, >90% designation
   If below: identify worst-coverage ISO groups. Document for R3 gap fill.

3. Machine completeness:
   Count machines with power_kw > 0 AND travels.x_mm > 0
   TARGET: Top 50 machines have both fields. (50/1016 = 4.9% minimum)
   Document remaining 966 machines as "basic data only" for R3.

4. Formula coverage:
   prism_data action=formula_list  [effort=low]  (or equivalent)
   VERIFY: 509 formulas (500 original + 9 F-CALC)
   Test formula_calculate for each F-CALC formula with known inputs.

5. Dispatcher coverage check:
   Test each new action:
   - tool_facets → returns categories
   - strategy_for_job → returns recommendations
   - thread_recommend → returns tap drill + Go/NoGo
   - unified_search → routes correctly
   All must return valid responses (not errors, not empty).

=== FAULT INJECTION TEST (from §FAULT INJECTION above) ===
6. Run the R1 fault test:
   Rename a material registry file → call material_get → verify Tier 2 degradation
   Restore → verify recovery. Record PASS/FAIL.

=== CONSISTENCY CHECK ===
7. Verify end-to-end pipeline with enriched data:
   prism_data action=material_get material="4140"  [effort=high]
   → prism_calc action=speed_feed material="4140" operation="turning"  [effort=max]
   → Safety score must be >= 0.70. Structured output must validate.
   → Material tribology data should be accessible (non-null).

8. Verify cross-registry query:
   prism_data action=cross_query material="4140" operation="turning" machine="VF-2"  [effort=high]
   → Machine constraints must be non-null (power, RPM from MS7).
   → Tool recommendations should use indexed tools (from MS5).

=== RALPH + OMEGA ===
9. prism_ralph action=assess target="R1 Registry + Data Foundation"  [effort=max]
   EXPECTED: Ralph >= B+

10. prism_omega action=compute target="R1 complete"  [effort=max]
    EXPECTED: Omega >= 0.70 (hard block)
    IF Omega < 0.70 → identify weakest dimension → fix → recompute.

=== PHASE FINDINGS ===
11. Append PHASE_FINDINGS.md (R1 section):
    CRITICAL: Any data quality metric below target. Any fault injection failure.
              Any new action that returns errors.
    IMPORTANT: Enrichment coverage gaps for R3 fill. Machine coverage limitations.
    NOTE: Performance observations. Schema version observations.

=== MASTER_INDEX COHERENCE ===
12. Read MASTER_INDEX.md → verify counts still match live.
    Update if R1 changed counts (new formulas, etc.)
    Update PRISM_MASTER_INDEX.md: R1 status → "complete"

=== COMPLETION ===
13. Append ROADMAP_TRACKER: "R1-MS9 COMPLETE [date] — PHASE R1 COMPLETE"
14. Update CURRENT_POSITION.md:
    "CURRENT: R2-MS0 | LAST_COMPLETE: R1-MS9 [date] | PHASE: R2 not-started"
    "vars: mat=3392(96.4%,enriched), mach=1016(50 specs), tools=5238(indexed),
     alarms=10033, formulas=509, strategies=697(exposed), build=clean"
15. prism_session action=state_save
```

**Rollback:** Standard. Identify weakest metric → fix → reassess.
**Exit:** All registries >95% loaded AND data quality verified. Tools normalized + indexed.
  Materials enriched. Top 50 machines populated. 9 calculator formulas. Toolpath/thread/unified
  search wired. Fault injection passed. Ralph >= B+. Omega >= 0.70. R1 COMPLETE.

**WHAT R2 CAN NOW DO THAT IT COULDN'T BEFORE v14.0:**
  - Test safety engines with REAL machine specs (spindle limits, work envelope)
  - 50-calc matrix uses ENRICHED material data (tribology informs friction calculations)
  - Cross-query returns meaningful results (not null machine constraints)
  - AI edge cases can reference specific toolpath strategies (697 exposed)
  - Thread calculations are testable (fully wired)

---

## R1-MS10: Registry Optimization (Optional — if session budget allows)

**Effort:** ~6 calls | **Tier:** STANDARD | **Context:** ~3KB
**Entry:** R1-MS9 COMPLETE. Only if remaining session budget >15K tokens.

```
1. Profile registry load time: measure warm_start duration.
   prism_dev action=health  [effort=low] → note response time.
2. If >5s: identify bottleneck (file I/O? parsing? validation? ToolIndex build?).
   prism_dev action=code_search pattern="warm_start\|registry.*load" path="src/"  [effort=high]
3. Apply responseSlimmer to material_get if not already active.
4. Consider: lazy loading for rarely-accessed registries (alarm subcategories?).
5. Profile ToolIndex construction time — O(1) lookups are fast but index BUILD may be slow
   on 15,912 entries. Consider: build index lazily on first query, not at startup.
6. If improvements made: build → verify counts unchanged → verify load time reduced.
7. Document optimizations in PHASE_FINDINGS.md.
```

**Exit:** Registry performance baselined. Optimizations documented if applied. Optional MS — no gate required.

---

## R1 COMPANION ASSETS (v14.2 — build AFTER R1-MS9 gate passes)

```
HOOKS (3 new):
  data_validation_gate       — blocking, post-load on all registries, runs bounds checks
                               from DataValidationEngine. FAILS load if critical bounds violated.
  tool_schema_completeness   — warning, post-load, checks 85-param population % per holder.
                               Alerts if avg completeness < 60%.
  material_enrichment_validate — blocking, post-merge during MS6. Blocks if enrichment
                                 changes hardness by >20% or density by >5%.

SCRIPTS (3 new):
  registry_health_check      — Run post-build. Reports all registry counts and completeness
                               scores from DataValidationEngine. Output: JSON summary.
  material_search_diagnostic — Debug "why can't PRISM find this material?". Shows what
                               MaterialRegistry tried, what almost matched, suggests alternatives.
  tool_coverage_report       — Per-category counts and gaps. Shows which tool categories
                               have good data vs need manufacturer catalogs.

SKILLS (1 new):
  prism-data-diagnostics     — Teaches Claude to debug registry search failures, interpret
                               VALIDATION_REPORT.json, and guide users through data quality issues.
```
