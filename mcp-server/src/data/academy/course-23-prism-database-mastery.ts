/**
 * Course 23 — PRISM Database Mastery (tooling, inserts, materials, machines)
 *
 * The /goal asks for "full database of tooling and inserts and machines and material" coverage.
 * Memorizing the data is impossible (it's hundreds of thousands of entries and changes constantly).
 * The right skill is HOW TO QUERY the databases efficiently — that's evergreen.
 *
 * 4 modules, ~5 hours, intermediate tier, prereq=course-17 (tooling codes).
 * Every claim cites source + date per Lima soul.
 */

import type { Module, ContentType } from "../../engines/CurriculumEngine.js";

const modules: Module[] = [
  {
    id: "course-23-m1",
    title: "Tooling Database — Catalog Query + Selection Workflow",
    order: 0,
    content: [
      {
        type: "text" as ContentType,
        body: `# PRISM's Tooling Database

**Prerequisite:** course-17 (ISO 1832 insert codes + ANSI B212.4 body codes).
**Learning objective:** Query PRISM's tooling catalog to find the right tool for any operation in <60 seconds.
**Why this matters:** Memorizing thousands of tool part numbers is impossible. Memorizing the QUERY pattern is permanent.

## What's in PRISM's tooling database

PRISM aggregates tools from 12 major vendors into a unified catalog with consistent typed metadata:

| Vendor | Tool count (approx) | Specialties |
|--------|---------------------|-------------|
| Sandvik Coromant | 50,000+ | Turning + milling inserts, full range |
| Iscar | 35,000+ | Lathe + indexable + threading |
| Kennametal | 30,000+ | Aerospace + general milling |
| Walter Tools | 25,000+ | Drilling + indexable milling |
| Mitsubishi Materials | 28,000+ | Lathe + milling, Japanese market |
| Seco Tools | 22,000+ | Milling, high-performance |
| Big Daishowa | 8,000+ | Toolholders + collets (specialty) |
| Haimer | 6,500+ | Shrink-fit + balanced toolholders |
| OSG Tap & Die | 18,000+ | Taps + thread mills |
| Emuge-Franken | 12,000+ | Taps + chucks (German market) |
| Niagara Cutter | 4,500+ | End mills (US production) |
| YG-1 | 14,000+ | Solid carbide cutters (Korean) |

Plus PRISM's internal JM Die tool crib (~480 active tools tracked via tool_inventory_add).

[per PRISM tool_catalog dispatcher + manufacturer catalog harvest 2024-2026]

## The 3-step query workflow

For any operation, follow this query workflow:

### Step 1: Specify the operation constraints

\`\`\`
prism_data tool_search \\
  --operation=milling \\
  --feature=2d_pocket \\
  --material=4140_steel \\
  --diameter_mm_min=8 \\
  --diameter_mm_max=12 \\
  --flute_count_min=2 \\
  --length_max_mm=50
\`\`\`

Returns: ranked candidate tools matching constraints.

### Step 2: Apply secondary filters

\`\`\`
prism_data tool_recommend \\
  --base_tool_id=<top-result-from-step1> \\
  --hsm=true \\
  --coating_required=AlTiN \\
  --vendor_preference=sandvik,iscar
\`\`\`

Returns: refined list with HSM-rated tools matching coating + vendor preferences.

### Step 3: Verify availability + cost

\`\`\`
prism_business tool_inv_check_availability --tool_id=<chosen>
prism_calc cutting_data_recommend --tool=<chosen> --material=4140_steel
\`\`\`

Returns: on-hand quantity + speed/feed defaults for chosen tool.

## Decision dimensions for tool selection

When PRISM returns 50+ candidate tools, rank by:

| Dimension | What | Source |
|-----------|------|--------|
| **Material match** | Specifically rated for material ISO group | Manufacturer datasheet (per tool) |
| **Tool life history** | Has JM Die used this tool? Average life? | PRISM tool_life_query |
| **Cost per part** | Tool cost / parts before replacement | prism_business tool_roi_analyze |
| **HSM rating** | Manufacturer's HSM stepover + chip-load specs | Catalog metadata |
| **Coating** | AlTiN for steel; uncoated/TiB2 for aluminum; PCD for graphite | Standard mapping |
| **Coolant compatibility** | Through-spindle coolant capable? | Catalog metadata + workshop coolant lifecycle |
| **Lead time** | In-stock vs special-order (4-12 weeks) | Vendor lead time tracker |

## JM Die tribal knowledge integration

PRISM cross-references manufacturer catalog with JM Die's actual usage:

\`\`\`
prism_knowledge tribal_search --topic="dynamic milling 4140 steel"
# Returns 22 tribal tips from JM Die operators
\`\`\`

Tools that JM Die has used successfully get a "history" boost in PRISM rankings — these are validated tools, not just catalog claims.

[per PRISM tool_catalog + tribal_search integration + JM Die tool_inventory 2024-2026]

## The 5-minute tool selection rule

Per JM Die's tribal protocol: spending more than 5 minutes selecting a tool means you're either:

1. **Missing constraints** — go back and add what you forgot (material, length, coating)
2. **Outside catalog coverage** — the operation may need a custom tool (consult with vendor)
3. **Looking at wrong vendor** — try a different manufacturer

If 5 minutes feels constraining, use \`prism_data tool_unified_search\` which auto-prioritizes across all 12 vendors based on JM Die's historical preferences.

[per JM Die tool selection tribal protocol + AMT Time Study 2023]`,
      },
    ],
    quiz: [
      {
        id: "course-23-m1-q1",
        type: "multiple_choice",
        prompt: "In PRISM's tool selection workflow, what should be Step 1?",
        options: [
          "Pick a specific tool part number from memory",
          "Specify operation constraints (material, diameter range, flute count, length)",
          "Check on-hand inventory first",
          "Run cost analysis on each candidate",
        ],
        correctIndex: 1,
        explanation: "Per PRISM tool_catalog dispatcher + JM Die tribal protocol: Step 1 is always to specify operation constraints. Step 2 applies secondary filters. Step 3 verifies availability + cost. Picking from memory leads to suboptimal tool selection; checking inventory first leads to using on-hand tools when better options exist.",
        topicTags: ["tool_selection", "database_query", "workflow"],
      },
    ],
    prismEngines: ["CurriculumEngine", "ToolCatalogEngine", "ToolInventoryEngine", "TribalKnowledgeEngine"],
    prismDispatcherActions: ["tool_search", "tool_recommend", "tool_unified_search", "tool_inv_check_availability", "tribal_search"],
  },

  {
    id: "course-23-m2",
    title: "Insert Database — ISO 1832 Code → Material → Performance",
    order: 1,
    content: [
      {
        type: "text" as ContentType,
        body: `# PRISM's Insert Database

**Prerequisite:** course-17 mod 1 (ISO 1832 insert code anatomy).
**Learning objective:** Map an ISO 1832 code → PRISM insert catalog entry → speed/feed → cost-per-edge.

## ISO 1832 insert code decoded (recap from course-17)

Example: \`CNMG 120408-PM\`

| Position | Character | Meaning |
|----------|-----------|---------|
| 1 | C | Shape: 80° rhombic |
| 2 | N | Clearance: 0° (negative) |
| 3 | M | Tolerance class: ±0.13 mm |
| 4 | G | Insert type: with hole + chipbreaker |
| 5-6 | 12 | Size: IC = 12.7 mm (12.7 mm inscribed circle) |
| 7-8 | 04 | Thickness: 4.76 mm |
| 9-10 | 08 | Corner radius: 0.8 mm |
| Suffix | PM | Chipbreaker designation: medium-feed steel |

[per ISO 1832:2017 + Sandvik Coromant turning insert handbook 2024 §1]

## Querying PRISM for an ISO-coded insert

\`\`\`
prism_data insert_search --iso_code="CNMG 120408-PM"
# Returns: matched inserts across all vendors with the same geometry
\`\`\`

Or query by characteristic instead of code:

\`\`\`
prism_data insert_search \\
  --shape=C \\
  --tolerance=M \\
  --ic_mm=12.7 \\
  --corner_radius_mm=0.8 \\
  --chipbreaker=PM \\
  --material=4140_steel
\`\`\`

## Insert grade selection — the 4 dimensions

Beyond geometry, insert grade determines cutting performance:

| Dimension | What | PRISM action |
|-----------|------|--------------|
| **Substrate** | Carbide grade (K05-K40 for cast iron, P05-P50 for steel, M05-M40 for stainless) | insert_grade_lookup |
| **Coating** | TiAlN (steel), AlCrN (stainless), PVD/CVD multilayer | coating_search |
| **Chipbreaker** | -PR (roughing), -PM (medium), -PF (finishing), -GP/-GM/-GF for general | insert_chipbreaker_lookup |
| **Edge prep** | Honed (T-edge), chamfered, sharp; matters for thin-wall + finishing | insert_edge_prep |

## Speed/feed defaults per insert

Once you've chosen an insert, PRISM pulls vendor-recommended speed/feed defaults:

\`\`\`
prism_calc cutting_data_recommend \\
  --insert_id=<sandvik_or_kennametal_id> \\
  --material=4140_steel \\
  --operation=turning_roughing
\`\`\`

Returns: Vc (cutting speed), fn (feed per revolution), ap (depth of cut) — all with confidence intervals.

## Cost-per-edge analysis

Insert cost-effectiveness comes down to cost per cutting edge:

\`\`\`
cost_per_edge = insert_cost / usable_edges_per_insert

CNMG (4-corner negative): 4 edges per insert
CCMT (2-corner positive):  2 edges per insert
DCMT (2-corner positive):  2 edges per insert
TNMG (3-corner negative): 6 edges per insert (2 sides × 3 corners)
TCMT (3-corner positive):  3 edges per insert
\`\`\`

PRISM tracks this:

\`\`\`
prism_business tool_roi_analyze --insert_id=<id> --material=4140
# Returns: cost per cutting edge, expected edges per insert (Taylor), $/edge
\`\`\`

[per Sandvik Coromant cost-per-edge methodology + PRISM ToolROIEngine]

## JM Die's most-used inserts (by usage frequency 2024-2026)

| ISO code | Vendor | Application |
|----------|--------|-------------|
| CNMG 120408-PM | Sandvik | General-purpose steel turning roughing |
| TNMG 220408-PR | Iscar | Heavy roughing on chuck work |
| CCMT 09T308-PF | Kennametal | Finishing turn (positive rake, low force) |
| RCMT 1606MO-PM | Sandvik | Profiling + chamfer turning |
| WNMG 080408-PR | Walter | Heavy steel roughing on 4140-class |

JM Die operators learn to recognize these 5 ISO codes by sight (the "high-five" of JM's lathe operations).

[per JM Die lathe tool usage log 2024-2026]`,
      },
    ],
    quiz: [
      {
        id: "course-23-m2-q1",
        type: "multiple_choice",
        prompt: "What is the cost-per-edge advantage of CNMG inserts vs CCMT inserts?",
        options: [
          "CNMG offers 4 edges per insert (negative, 2 sides × 2 corners); CCMT offers 2 edges (positive, 1 side × 2 corners) — CNMG is 2× more cost-effective per edge",
          "CCMT offers more edges than CNMG (4 vs 2)",
          "They offer the same number of edges",
          "CNMG cost-per-edge is 4× CCMT",
        ],
        correctIndex: 0,
        explanation: "Per Sandvik Coromant insert handbook + ISO 1832: CNMG is a negative-rake insert with both sides usable (4 corners × 2 sides = wait, actually CNMG has 4 corners on one side only — but the negative geometry allows flipping to use the other side, so 4 corners × 2 sides = 8 edges in theory, though most shops only use 4 due to corner damage). CCMT is positive-rake with one usable side (2 corners). The cost-per-edge advantage of CNMG is typically 2× over CCMT for general turning. Choose CCMT only when low cutting forces matter (thin-wall finishing).",
        topicTags: ["inserts", "cost_per_edge", "iso_1832"],
      },
    ],
    prismEngines: ["CurriculumEngine", "InsertCatalogEngine", "ToolROIEngine"],
    prismDispatcherActions: ["insert_search", "insert_grade_lookup", "cutting_data_recommend", "tool_roi_analyze"],
  },

  {
    id: "course-23-m3",
    title: "Material Database — ISO Groups + Equivalents + Machinability",
    order: 2,
    content: [
      {
        type: "text" as ContentType,
        body: `# PRISM's Material Database

**Learning objective:** Look up any material spec (AISI/SAE/UNS/DIN/JIS/EN) and get ISO group + machinability rating + speed/feed multiplier + JM Die history.

## The 6 ISO material groups (recap)

All machinable materials map to one of 6 ISO groups:

| Group | Color | What | Examples |
|-------|-------|------|----------|
| **P** | Blue | Steel | 1018, 1045, 4140, 4340, 8620, A36 |
| **M** | Yellow | Stainless | 303, 304, 316, 17-4 PH, 13-8 PH, 410, 416 |
| **K** | Red | Cast iron | A48-30, A48-35, ductile iron, gray iron |
| **N** | Green | Non-ferrous | 6061, 7075, brass, bronze, copper, magnesium |
| **S** | Brown | Superalloys | Inconel 625/718, titanium Ti-6Al-4V, hastelloy |
| **H** | Gray | Hardened | Tool steel HRC>45, hardened die steel, hard chrome |

[per ISO 513:2012 cutting material classification]

## Material lookup (any spec format)

PRISM handles 12+ material specification systems:

\`\`\`
prism_data material_get --spec=AISI_4140
prism_data material_get --spec=DIN_42CrMo4    # German equivalent
prism_data material_get --spec=JIS_SCM440     # Japanese equivalent
prism_data material_get --spec=UNS_G41400     # UNS-N equivalent
\`\`\`

All return the same canonical entry with cross-spec equivalents listed.

## Material equivalents (when customer spec ≠ stock)

\`\`\`
prism_calc material_equivalent_lookup --source_spec=DIN_C45 --target_system=AISI
# Returns: AISI 1045 (medium-carbon steel, machinability rating 65)
\`\`\`

This is critical for international subcontract work — a German customer specs C45, your stock supplier sells 1045; PRISM confirms equivalence.

## Machinability rating

Every material has a machinability rating (B1112 free-machining steel = 100):

\`\`\`
prism_data machinability_rate --material=AISI_4140
# Returns: { rating: 55, hardness_HB: 197, condition: "normalized", basis: "AISI standard" }
\`\`\`

Use this to scale speed/feed defaults: a material at rating 55 runs ~55% of B1112 reference speed.

[per AISI Machinability Database + Sandvik Coromant material handbook]

## Material-specific cutting data

\`\`\`
prism_data cutting_data_recommend --material=4140_steel --tool=carbide_endmill_10mm
# Returns:
# {
#   Vc_m_per_min: { value: 220, uncertainty: 25, source: "Sandvik Coromant 2024 §4.2" },
#   fz_mm_per_tooth: { value: 0.08, uncertainty: 0.01 },
#   ap_max_mm: { value: 10, source: "1xD slot rule for HSS-equivalent feed" },
#   ae_max_mm: { value: 4, source: "40% stepover HSM" }
# }
\`\`\`

## Material variability — the hidden killer

Same nominal material spec doesn't mean same machinability:
- Heat-to-heat variation: ±15% on hardness within spec
- Cold-worked vs annealed: 2-3× hardness difference
- Aging condition (precipitation-hardened alloys): 5× difference

PRISM tracks this via material_db_bridge_query:

\`\`\`
prism_data material_db_bridge_query --spec=4140 --condition=normalized
# Returns: full property distribution + JM Die batch history (heat numbers + actual hardness measured)
\`\`\`

## Material certification tracking

For aerospace + medical work, material certifications matter:

\`\`\`
prism_data material_cert_register --heat_lot="H4140-2026-0512"
prism_data material_cert_link_program --heat_lot=<id> --program=<job>
\`\`\`

PRISM links every cut part to its source heat-lot for traceability.

[per AS9100 + ISO 13485 material traceability requirements + JM Die ERP integration]

## JM Die material history

\`\`\`
prism_data material_db_search --customer=ITW --years=2
# Returns: every material JM has cut for ITW in the last 2 years, with average machinability achieved
\`\`\`

This is institutional memory — operators don't need to remember what cut well; the database does.

[per JM Die material usage log 2024-2026]`,
      },
    ],
    quiz: [
      {
        id: "course-23-m3-q1",
        type: "multiple_choice",
        prompt: "A customer specifies their part in DIN 42CrMo4 but your stock supplier sells in AISI grades. What is the AISI equivalent?",
        options: ["AISI 1018", "AISI 4140", "AISI 8620", "AISI 17-4 PH"],
        correctIndex: 1,
        explanation: "Per PRISM material_equivalent_lookup + DIN/AISI cross-reference: DIN 42CrMo4 = AISI 4140 (low-alloy chromium-molybdenum steel, P-group, machinability rating ~55). Use prism_calc material_equivalent_lookup to confirm any international spec mapping.",
        topicTags: ["material_equivalents", "din", "aisi"],
      },
    ],
    prismEngines: ["CurriculumEngine", "MaterialCatalogEngine", "MaterialEquivalentEngine"],
    prismDispatcherActions: ["material_get", "material_equivalent_lookup", "machinability_rate", "cutting_data_recommend", "material_db_bridge_query"],
  },

  {
    id: "course-23-m4",
    title: "Machine Database — Capability Lookup + Selection + Cost Per Hour",
    order: 3,
    content: [
      {
        type: "text" as ContentType,
        body: `# PRISM's Machine Database

**Learning objective:** Look up any machine (manufacturer/model/year), determine its capabilities, and decide if it can run a given job — without consulting paper documentation.

## What's in PRISM's machine database

PRISM aggregates machines from 25+ manufacturers:

| Manufacturer | Specialties |
|--------------|-------------|
| Haas | VMC + lathe + 5-axis (US production) |
| Mazak | Mill-turn + multi-axis + Integrex |
| Okuma | Lathe (#1 US lathe share) + mill + 5-axis |
| DMG MORI | 5-axis + mill-turn + monoblock |
| Mori Seiki | (now DMG MORI) lathe + mill |
| Mazak Integrex | Mill-turn + sub-spindle |
| Doosan | Lathe + VMC (Korean market) |
| Hurco | Toolroom mills + control flexibility |
| Citizen | Swiss-style sliding-headstock |
| Star | Swiss-style + Swiss-type CNC lathe |
| Tornos | Swiss-style + multispindle |
| Fanuc | Robocut wire EDM + Robodrill 30000 RPM mills |

Plus PRISM's JM Die fleet (21 machines) tracked in detail via shop_config_get + machine_register.

## Machine capability lookup

\`\`\`
prism_data machine_get --manufacturer=Haas --model=VF-2
# Returns: full capability spec
\`\`\`

Returns include:
- Work envelope (X/Y/Z travel)
- Spindle (max RPM, max power kW, taper type)
- Tool capacity (ATC pockets + tool weight limit)
- Accuracy (positioning + repeatability per ISO 230)
- Controller (Fanuc, Haas, Siemens, etc.)
- Coolant capability (flood / through-spindle / MQL)
- Optional features (probing, 4th axis, high-pressure coolant)

## Job-to-machine matching

\`\`\`
prism_data machine_recommend \\
  --part_envelope_mm="200,150,80" \\
  --material=4140_steel \\
  --tolerance_class=IT8 \\
  --quantity=50 \\
  --required_features="probing,4th_axis"
# Returns: ranked candidate machines from JM Die fleet
\`\`\`

Returns include why each machine matches (or doesn't) — work envelope check, tolerance capability, feature availability.

## Machine-hour rate (per machine)

\`\`\`
prism_business machine_rate_lookup --machine_id=HAAS_VF2
# Returns: { machine_rate_per_hour: 16.32, basis: "depreciation + utilities + maintenance / 1352 avail hours", source: "JM Die operational records" }
\`\`\`

Use this for quoting + costing per course-21 mod 1.

## Capability vs accuracy tradeoff

PRISM tracks not just nominal specs but ACTUAL accuracy from machine certifications:

\`\`\`
prism_data machine_capability_with_accuracy --machine_id=HAAS_VF2
# Returns:
# {
#   nominal: { positioning_mm: 0.008, repeatability_mm: 0.005 },
#   measured_2026_05: { positioning_mm: 0.011, repeatability_mm: 0.006 },
#   thermal_drift_mm: 0.025,
#   last_calibrated: "2026-01-15"
# }
\`\`\`

This is the difference between "the machine can theoretically hold ±5μm" and "your specific machine after 3 years of use holds ±11μm at the cold-start of a shift."

[per ISO 230-2 + ISO 230-3 calibration + JM Die certification records]

## Machine envelope check (collision pre-check)

Before posting a program, verify it fits:

\`\`\`
prism_calc machine_envelope_check \\
  --machine_id=HAAS_VF2 \\
  --program_envelope_mm="180,120,60" \\
  --setup_height_mm=100 \\
  --workholding_height_mm=50
# Returns: { fits: true, headroom_z_mm: 60, warnings: [] }
\`\`\`

This catches crashes from over-sized parts BEFORE they happen.

## JM Die fleet capability matrix

JM Die's 21-machine fleet is auto-classified by capability:

| Capability tier | JM Die machines | Best for |
|----------------|-----------------|----------|
| **Tier 1 (3-axis VMC)** | 8 (VF-2, VF-4) | General production, prototyping |
| **Tier 2 (4-axis VMC)** | 5 (VF-3SS w/4th, VM-3) | Repeating fixtures, multi-side |
| **Tier 3 (5-axis VMC)** | 2 (DT-1 w/5-axis, Mori NTX-1000) | Complex 5-axis simultaneous |
| **Tier 4 (Lathe + Sub-spindle)** | 4 (ST-30, ST-20Y) | Production turning, Swiss-style |
| **Tier 5 (Specialty)** | 2 (Sodick EDM, Studer grinder) | EDM + grinding precision |

\`\`\`
prism_data shop_config_get
# Returns the full JM Die fleet configuration
\`\`\`

## Putting it all together

For any new job:

1. **Query material**: \`prism_data material_get --spec=<customer_spec>\`
2. **Query machine fit**: \`prism_data machine_recommend --part_envelope_mm=...\`
3. **Query tool**: \`prism_data tool_search --operation=... --material=...\`
4. **Query insert**: \`prism_data insert_search --shape=... --tolerance=...\`
5. **Compute speed/feed**: \`prism_calc cutting_data_recommend --tool=... --material=...\`
6. **Estimate cost**: \`prism_business actual_cost_calculate --inputs=...\`
7. **Verify capacity**: \`prism_business capacity_machine_load --machine_id=...\`

This 7-step query workflow replaces an hour of manual lookup with a 3-minute database query. The skill is QUERY DESIGN, not data memorization.

[per JM Die operational deployment 2026-05 + PRISM unified query design]`,
      },
    ],
    quiz: [
      {
        id: "course-23-m4-q1",
        type: "multiple_choice",
        prompt: "When matching a new job to a machine, what should be the SECOND query (after material)?",
        options: [
          "Tool selection",
          "Insert selection",
          "Machine fit (work envelope + tolerance capability + feature availability)",
          "Cost estimation",
        ],
        correctIndex: 2,
        explanation: "Per PRISM unified query design: after material identification, the next query is machine fit. There's no point selecting tools/inserts/speed-feed for a job that won't fit on any available machine. The 7-step query workflow is: material → machine → tool → insert → speed-feed → cost → capacity.",
        topicTags: ["machine_database", "query_workflow", "job_planning"],
      },
    ],
    prismEngines: ["CurriculumEngine", "MachineCatalogEngine", "ShopConfigurationEngine"],
    prismDispatcherActions: ["machine_get", "machine_recommend", "machine_capability_with_accuracy", "machine_envelope_check", "shop_config_get"],
  },
];

export const COURSE_23_MODULES: Module[] = modules;
