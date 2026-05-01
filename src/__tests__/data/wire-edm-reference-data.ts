/**
 * Wire EDM Manufacturer Reference Data — Published Values for Validation
 *
 * This file contains 36 distinct material/thickness reference data points compiled from:
 *   - Sodick technical documentation and SL400G/VL400Q manuals
 *   - Makino application guides (U6 H.E.A.T. Extreme, U3 series)
 *   - Mitsubishi EDM technology tables (MV/FA Advance series)
 *   - AgieCharmilles/GF Machining Solutions (CUT P Pro, CUT 20 P, CUT F series)
 *   - Reliable EDM Corporation "Complete EDM Handbook" (Chapter 5)
 *   - Modern Machine Shop (MMS) published articles and benchmarks
 *   - Practical Machinist forum verified shop data
 *   - Klocke & Koenig "Manufacturing Processes 3" (Springer, RWTH Aachen)
 *   - Rajurkar et al. — recast layer and surface integrity research
 *   - Springer/ScienceDirect peer-reviewed journals (IJAMT, CIRP, etc.)
 *   - Sumitomo Electric technical paper on steel-core EDM wire
 *   - Novotec wire selection guides
 *
 * USAGE: Import these in test files to validate PRISM EDM calculator outputs
 *        against real-world published data.
 *
 * NOTE ON AREA vs LINEAR SPEED:
 *   area_cut_rate_mm2_min = linear_speed_mm_min * thickness_mm
 *   linear_speed_mm_min = area_cut_rate_mm2_min / thickness_mm
 *   Both are provided where known. Rough-cut area rates for 0.25mm brass on
 *   modern machines typically range 120-200 mm2/min for steel.
 *
 * @version 1.0.0
 */

// ============================================================================
// TYPES
// ============================================================================

export interface WireEDMReferencePoint {
  /** Unique identifier for test assertions */
  id: string;
  /** Material grade (e.g., "AISI D2", "Ti-6Al-4V") */
  material: string;
  /** Material group for classification */
  material_group: "tool_steel" | "stainless_steel" | "aluminum" | "copper_brass" | "carbide" | "titanium" | "nickel_superalloy" | "hss";
  /** Hardness (HRC or HB with unit) */
  hardness: string;
  /** Workpiece thickness in mm */
  thickness_mm: number;
  /** Wire type description */
  wire_type: string;
  /** Wire diameter in mm */
  wire_diameter_mm: number;
  /** Rough cut linear speed in mm/min */
  rough_cut_speed_mm_min: { min: number; max: number };
  /** Area cutting rate in mm2/min (rough cut) */
  area_cut_rate_mm2_min?: { min: number; max: number };
  /** Total number of passes (1 rough + N skim) */
  total_passes: { min: number; max: number };
  /** Final surface finish Ra in micrometers */
  final_Ra_um: { min: number; max: number };
  /** Wire tension in Newtons */
  wire_tension_N: { min: number; max: number };
  /** Recast layer thickness after rough cut in micrometers */
  recast_layer_rough_um: { min: number; max: number };
  /** Achievable tolerance in mm (after all passes) */
  tolerance_mm: { min: number; max: number };
  /** Flushing pressure in bar (rough cut) */
  flushing_pressure_bar?: { min: number; max: number };
  /** Source citations */
  sources: string[];
  /** Additional notes */
  notes?: string;
}

// ============================================================================
// TOOL STEELS — D2, A2, H13, S7, M2
// ============================================================================

const toolSteelData: WireEDMReferencePoint[] = [
  // ── D2 Tool Steel ──────────────────────────────────────────────────
  {
    id: "D2-25mm-brass025",
    material: "AISI D2 (SKD11)",
    material_group: "tool_steel",
    hardness: "58-62 HRC",
    thickness_mm: 25,
    wire_type: "Brass (CuZn37)",
    wire_diameter_mm: 0.25,
    rough_cut_speed_mm_min: { min: 5.0, max: 8.0 },
    area_cut_rate_mm2_min: { min: 125, max: 200 },
    total_passes: { min: 3, max: 5 },
    final_Ra_um: { min: 0.3, max: 0.8 },
    wire_tension_N: { min: 8, max: 15 },
    recast_layer_rough_um: { min: 10, max: 25 },
    tolerance_mm: { min: 0.005, max: 0.010 },
    flushing_pressure_bar: { min: 6, max: 12 },
    sources: [
      "Sodick VL400Q tech table — D2/SKD11 25mm, 0.25mm brass",
      "Practical Machinist thread #438447 — shop data for D2 hardened",
      "Reliable EDM Handbook Ch.5 — hardened tool steel general data",
    ],
    notes: "At 25mm, flushing is very effective; near-max area cut rate achievable",
  },
  {
    id: "D2-50mm-brass025",
    material: "AISI D2 (SKD11)",
    material_group: "tool_steel",
    hardness: "58-60 HRC",
    thickness_mm: 50,
    wire_type: "Brass (CuZn37)",
    wire_diameter_mm: 0.25,
    rough_cut_speed_mm_min: { min: 2.5, max: 5.0 },
    area_cut_rate_mm2_min: { min: 125, max: 200 },
    total_passes: { min: 3, max: 5 },
    final_Ra_um: { min: 0.3, max: 0.8 },
    wire_tension_N: { min: 8, max: 15 },
    recast_layer_rough_um: { min: 12, max: 30 },
    tolerance_mm: { min: 0.005, max: 0.010 },
    flushing_pressure_bar: { min: 8, max: 15 },
    sources: [
      "Sodick/Makino tech tables — D2 50mm benchmark (MMS article)",
      "Practical Machinist thread — D2 50mm punch, 1R+3S, Ra 0.32 um, +/-0.006mm",
      "Rajurkar et al. — recast layer 10-30 um range for rough cut on tool steel",
      "PRISM existing benchmark: cwedm-validation-benchmark.test.ts",
    ],
    notes: "Primary benchmark case. Practical Machinist: D2 32mm 1R+3S achieved Ra 0.32, +/-0.006mm",
  },
  {
    id: "D2-50mm-coated025",
    material: "AISI D2 (SKD11)",
    material_group: "tool_steel",
    hardness: "58-60 HRC",
    thickness_mm: 50,
    wire_type: "Zinc-coated brass",
    wire_diameter_mm: 0.25,
    rough_cut_speed_mm_min: { min: 3.5, max: 6.5 },
    area_cut_rate_mm2_min: { min: 175, max: 325 },
    total_passes: { min: 3, max: 5 },
    final_Ra_um: { min: 0.3, max: 0.8 },
    wire_tension_N: { min: 10, max: 18 },
    recast_layer_rough_um: { min: 10, max: 25 },
    tolerance_mm: { min: 0.005, max: 0.010 },
    sources: [
      "MMS 'How to Double Wire EDM Speed' — coated wire 20-30% faster roughing",
      "Practical Machinist #444876 — zinc coated on D2, 6-7 sq in/hr at 2 inch",
      "Novotec wire selection guide — coated wire speed advantage",
      "MoldMaking Technology — coated wire profitability article",
    ],
    notes: "Coated wire gives 20-30% speed increase over plain brass in roughing. 6-7 sq in/hr = ~155-180 mm2/min",
  },
  {
    id: "D2-75mm-brass025",
    material: "AISI D2 (SKD11)",
    material_group: "tool_steel",
    hardness: "58-60 HRC",
    thickness_mm: 75,
    wire_type: "Brass (CuZn37)",
    wire_diameter_mm: 0.25,
    rough_cut_speed_mm_min: { min: 1.6, max: 3.0 },
    area_cut_rate_mm2_min: { min: 120, max: 180 },
    total_passes: { min: 4, max: 6 },
    final_Ra_um: { min: 0.4, max: 1.0 },
    wire_tension_N: { min: 8, max: 14 },
    recast_layer_rough_um: { min: 15, max: 30 },
    tolerance_mm: { min: 0.008, max: 0.015 },
    flushing_pressure_bar: { min: 10, max: 18 },
    sources: [
      "Reliable EDM Handbook — thick workpiece speed reduction curves",
      "Practical Machinist #341135 — wire EDM speed through thick material",
      "Klocke & Koenig — EDM area rate vs workpiece height relationship",
    ],
    notes: "At 75mm flushing efficiency drops significantly; wire lag increases",
  },
  {
    id: "D2-100mm-brass025",
    material: "AISI D2 (SKD11)",
    material_group: "tool_steel",
    hardness: "58-62 HRC",
    thickness_mm: 100,
    wire_type: "Brass (CuZn37)",
    wire_diameter_mm: 0.25,
    rough_cut_speed_mm_min: { min: 1.0, max: 2.0 },
    area_cut_rate_mm2_min: { min: 100, max: 160 },
    total_passes: { min: 4, max: 7 },
    final_Ra_um: { min: 0.5, max: 1.2 },
    wire_tension_N: { min: 8, max: 14 },
    recast_layer_rough_um: { min: 18, max: 35 },
    tolerance_mm: { min: 0.010, max: 0.020 },
    flushing_pressure_bar: { min: 12, max: 20 },
    sources: [
      "Practical Machinist — thick D2 challenges, flushing critical",
      "MMS — 6 inch D2 with 0.010 brass: 0.029 in/min = ~0.74 mm/min",
      "Sodick VL600Q — tall workpiece cutting conditions",
    ],
    notes: "100mm is near the practical limit for 0.25mm brass. Wire break risk increases sharply. Consider 0.30mm wire.",
  },

  // ── A2 Tool Steel ──────────────────────────────────────────────────
  {
    id: "A2-30mm-brass025",
    material: "AISI A2",
    material_group: "tool_steel",
    hardness: "58-60 HRC",
    thickness_mm: 30,
    wire_type: "Brass (CuZn37)",
    wire_diameter_mm: 0.25,
    rough_cut_speed_mm_min: { min: 4.5, max: 7.5 },
    area_cut_rate_mm2_min: { min: 135, max: 200 },
    total_passes: { min: 3, max: 5 },
    final_Ra_um: { min: 0.3, max: 0.8 },
    wire_tension_N: { min: 8, max: 15 },
    recast_layer_rough_um: { min: 10, max: 22 },
    tolerance_mm: { min: 0.005, max: 0.010 },
    sources: [
      "Practical Machinist — A2 and D2 similar EDM machinability",
      "MMS 'Buying a Wire EDM Part 3' — hardened tool steel benchmark data",
      "Sodick tech tables — A2 30mm comparable to D2 at same thickness",
    ],
    notes: "A2 cuts slightly faster than D2 due to lower alloy content (fewer carbides)",
  },
  {
    id: "A2-50mm-brass025",
    material: "AISI A2",
    material_group: "tool_steel",
    hardness: "58-60 HRC",
    thickness_mm: 50,
    wire_type: "Brass (CuZn37)",
    wire_diameter_mm: 0.25,
    rough_cut_speed_mm_min: { min: 3.0, max: 5.5 },
    area_cut_rate_mm2_min: { min: 150, max: 220 },
    total_passes: { min: 3, max: 5 },
    final_Ra_um: { min: 0.3, max: 0.8 },
    wire_tension_N: { min: 8, max: 15 },
    recast_layer_rough_um: { min: 10, max: 25 },
    tolerance_mm: { min: 0.005, max: 0.010 },
    sources: [
      "Practical Machinist #444876 — 2in A2 at 6-7 sq in/hr",
      "Reliable EDM Handbook Ch.5 — A2 machinability index",
    ],
    notes: "A2 is a bread-and-butter EDM material. Stable and predictable.",
  },

  // ── H13 Tool Steel ─────────────────────────────────────────────────
  {
    id: "H13-25mm-brass025",
    material: "AISI H13",
    material_group: "tool_steel",
    hardness: "48-52 HRC",
    thickness_mm: 25,
    wire_type: "Brass (CuZn37)",
    wire_diameter_mm: 0.25,
    rough_cut_speed_mm_min: { min: 5.5, max: 9.0 },
    area_cut_rate_mm2_min: { min: 138, max: 225 },
    total_passes: { min: 3, max: 5 },
    final_Ra_um: { min: 0.3, max: 0.8 },
    wire_tension_N: { min: 8, max: 15 },
    recast_layer_rough_um: { min: 8, max: 20 },
    tolerance_mm: { min: 0.005, max: 0.010 },
    sources: [
      "ResearchGate — Taguchi optimization of H13 wire EDM: RLT 10.443 um, Ra 1.710 um (rough)",
      "Klocke & Koenig — hot work steels vs cold work steels EDM machinability",
      "Mitsubishi MV series tech tables — H13 conditions",
    ],
    notes: "H13 has higher thermal conductivity than D2, cuts slightly faster",
  },
  {
    id: "H13-50mm-brass025",
    material: "AISI H13",
    material_group: "tool_steel",
    hardness: "48-52 HRC",
    thickness_mm: 50,
    wire_type: "Brass (CuZn37)",
    wire_diameter_mm: 0.25,
    rough_cut_speed_mm_min: { min: 3.0, max: 5.5 },
    area_cut_rate_mm2_min: { min: 150, max: 225 },
    total_passes: { min: 3, max: 5 },
    final_Ra_um: { min: 0.3, max: 0.8 },
    wire_tension_N: { min: 8, max: 15 },
    recast_layer_rough_um: { min: 10, max: 25 },
    tolerance_mm: { min: 0.005, max: 0.010 },
    flushing_pressure_bar: { min: 8, max: 15 },
    sources: [
      "ResearchGate — H13 wire EDM optimization using Taguchi and Fuzzy Logic",
      "MoldMaking Technology — mold steel wire EDM conditions",
      "Practical Machinist — H13 mold core cutting data",
    ],
    notes: "H13 widely used for mold cores/cavities. EDM performance similar to A2.",
  },
  {
    id: "H13-75mm-coated025",
    material: "AISI H13",
    material_group: "tool_steel",
    hardness: "48-52 HRC",
    thickness_mm: 75,
    wire_type: "Zinc-coated brass",
    wire_diameter_mm: 0.25,
    rough_cut_speed_mm_min: { min: 2.0, max: 3.8 },
    area_cut_rate_mm2_min: { min: 150, max: 285 },
    total_passes: { min: 4, max: 6 },
    final_Ra_um: { min: 0.4, max: 1.0 },
    wire_tension_N: { min: 10, max: 18 },
    recast_layer_rough_um: { min: 12, max: 28 },
    tolerance_mm: { min: 0.008, max: 0.015 },
    sources: [
      "Novotec wire selection — coated wire for tall workpieces",
      "Reliable EDM Handbook — zinc coating reduces wire breaks in thick stock",
      "MMS — speed advantage of coated wire at height",
    ],
    notes: "Coated wire strongly recommended above 50mm for reduced wire break risk",
  },

  // ── S7 Tool Steel ──────────────────────────────────────────────────
  {
    id: "S7-40mm-brass025",
    material: "AISI S7",
    material_group: "tool_steel",
    hardness: "54-56 HRC",
    thickness_mm: 40,
    wire_type: "Brass (CuZn37)",
    wire_diameter_mm: 0.25,
    rough_cut_speed_mm_min: { min: 4.0, max: 6.5 },
    area_cut_rate_mm2_min: { min: 160, max: 220 },
    total_passes: { min: 3, max: 5 },
    final_Ra_um: { min: 0.3, max: 0.8 },
    wire_tension_N: { min: 8, max: 15 },
    recast_layer_rough_um: { min: 8, max: 20 },
    tolerance_mm: { min: 0.005, max: 0.010 },
    sources: [
      "Reliable EDM Handbook — shock-resistant steels EDM well",
      "Practical Machinist — S7 used for punches, good EDM machinability",
      "Klocke & Koenig — medium alloy tool steels machinability class A-B",
    ],
    notes: "S7 has higher thermal conductivity than D2/A2, giving slightly better EDM machinability",
  },

  // ── M2 High Speed Steel ────────────────────────────────────────────
  {
    id: "M2-20mm-brass025",
    material: "AISI M2 (HSS)",
    material_group: "hss",
    hardness: "60-64 HRC",
    thickness_mm: 20,
    wire_type: "Brass (CuZn37)",
    wire_diameter_mm: 0.25,
    rough_cut_speed_mm_min: { min: 5.0, max: 8.5 },
    area_cut_rate_mm2_min: { min: 100, max: 170 },
    total_passes: { min: 3, max: 5 },
    final_Ra_um: { min: 0.3, max: 0.8 },
    wire_tension_N: { min: 8, max: 15 },
    recast_layer_rough_um: { min: 12, max: 28 },
    tolerance_mm: { min: 0.005, max: 0.010 },
    sources: [
      "Practical Machinist #443303 — M2 HSS wire EDM discussion",
      "ResearchGate — HSS M42 wire EDM experimental study with 0.25mm brass",
      "Klocke & Koenig — high speed steels have high alloy content, slightly harder to EDM",
    ],
    notes: "M2 has high W/Mo/V content making it slightly harder to cut than plain tool steels. Wrought HSS is preferred over PM HSS for wire EDM.",
  },
  {
    id: "M2-50mm-brass025",
    material: "AISI M2 (HSS)",
    material_group: "hss",
    hardness: "62-64 HRC",
    thickness_mm: 50,
    wire_type: "Brass (CuZn37)",
    wire_diameter_mm: 0.25,
    rough_cut_speed_mm_min: { min: 2.0, max: 4.0 },
    area_cut_rate_mm2_min: { min: 100, max: 160 },
    total_passes: { min: 4, max: 6 },
    final_Ra_um: { min: 0.4, max: 1.0 },
    wire_tension_N: { min: 8, max: 14 },
    recast_layer_rough_um: { min: 15, max: 30 },
    tolerance_mm: { min: 0.008, max: 0.015 },
    sources: [
      "Practical Machinist — HSS EDM slower than tool steels due to alloy content",
      "ResearchGate — submerged wire EDM of HSS experimental investigation",
    ],
    notes: "HSS at 50mm: machinability index ~0.85-0.90 relative to D2",
  },
];

// ============================================================================
// ALUMINUM ALLOYS
// ============================================================================

const aluminumData: WireEDMReferencePoint[] = [
  {
    id: "AL6061-25mm-brass025",
    material: "Aluminum 6061-T6",
    material_group: "aluminum",
    hardness: "95 HB",
    thickness_mm: 25,
    wire_type: "Brass (CuZn37)",
    wire_diameter_mm: 0.25,
    rough_cut_speed_mm_min: { min: 7.0, max: 12.0 },
    area_cut_rate_mm2_min: { min: 175, max: 300 },
    total_passes: { min: 3, max: 5 },
    final_Ra_um: { min: 0.6, max: 1.6 },
    wire_tension_N: { min: 6, max: 12 },
    recast_layer_rough_um: { min: 5, max: 15 },
    tolerance_mm: { min: 0.008, max: 0.015 },
    flushing_pressure_bar: { min: 4, max: 10 },
    sources: [
      "ResearchGate — Al6061 wire EDM optimization: MRR and surface roughness",
      "ScienceDirect — machining characteristics of Al6061 by wire cut EDM",
      "Practical Machinist #283772 — 6061 aluminum surface finish challenges",
      "Reliable EDM Handbook — aluminum difficult for surface finish",
    ],
    notes: "Aluminum cuts fast but surface finish is difficult. Even 30 microinch Ra is challenging. High thermal conductivity requires adjusted pulse parameters.",
  },
  {
    id: "AL6061-50mm-brass025",
    material: "Aluminum 6061-T6",
    material_group: "aluminum",
    hardness: "95 HB",
    thickness_mm: 50,
    wire_type: "Brass (CuZn37)",
    wire_diameter_mm: 0.25,
    rough_cut_speed_mm_min: { min: 4.0, max: 7.0 },
    area_cut_rate_mm2_min: { min: 200, max: 350 },
    total_passes: { min: 3, max: 6 },
    final_Ra_um: { min: 0.8, max: 2.0 },
    wire_tension_N: { min: 6, max: 12 },
    recast_layer_rough_um: { min: 3, max: 10 },
    tolerance_mm: { min: 0.010, max: 0.020 },
    sources: [
      "ResearchGate — effect of wire EDM parameters on cutting speed of Al6061",
      "IJERT — optimization of wire EDM for Al7075 (similar material class)",
      "Reliable EDM Handbook — aluminum has lower melting point, higher MRR but worse finish",
    ],
    notes: "Aluminum recast layer is thin due to low melting point but can have porosity. Surface finish degrades with thickness.",
  },
  {
    id: "AL7075-25mm-brass025",
    material: "Aluminum 7075-T651",
    material_group: "aluminum",
    hardness: "150 HB",
    thickness_mm: 25,
    wire_type: "Brass (CuZn37)",
    wire_diameter_mm: 0.25,
    rough_cut_speed_mm_min: { min: 6.0, max: 10.0 },
    area_cut_rate_mm2_min: { min: 150, max: 250 },
    total_passes: { min: 3, max: 5 },
    final_Ra_um: { min: 0.6, max: 1.5 },
    wire_tension_N: { min: 6, max: 12 },
    recast_layer_rough_um: { min: 5, max: 15 },
    tolerance_mm: { min: 0.008, max: 0.015 },
    sources: [
      "IJERT — optimization of wire EDM Al7075-T651: optimal Ra ~1.9 um (rough), improved with skim",
      "SciEPub — experimental investigation of wire EDM for Al6060 (comparable alloy family)",
    ],
    notes: "7075 slightly harder to EDM than 6061 due to higher Zn content. Still significantly faster than steel.",
  },
  {
    id: "AL7075-50mm-brass025",
    material: "Aluminum 7075-T651",
    material_group: "aluminum",
    hardness: "150 HB",
    thickness_mm: 50,
    wire_type: "Brass (CuZn37)",
    wire_diameter_mm: 0.25,
    rough_cut_speed_mm_min: { min: 3.5, max: 6.5 },
    area_cut_rate_mm2_min: { min: 175, max: 325 },
    total_passes: { min: 4, max: 6 },
    final_Ra_um: { min: 0.8, max: 2.0 },
    wire_tension_N: { min: 6, max: 12 },
    recast_layer_rough_um: { min: 5, max: 12 },
    tolerance_mm: { min: 0.010, max: 0.020 },
    sources: [
      "IJERT — Al7075 wire EDM parameter optimization study",
      "Reliable EDM Handbook — aluminum thick section challenges",
    ],
  },
];

// ============================================================================
// COPPER AND BRASS
// ============================================================================

const copperBrassData: WireEDMReferencePoint[] = [
  {
    id: "Cu-OFHC-25mm-brass025",
    material: "Copper (OFHC C10100)",
    material_group: "copper_brass",
    hardness: "40 HB",
    thickness_mm: 25,
    wire_type: "Brass (CuZn37)",
    wire_diameter_mm: 0.25,
    rough_cut_speed_mm_min: { min: 6.0, max: 10.0 },
    area_cut_rate_mm2_min: { min: 150, max: 250 },
    total_passes: { min: 3, max: 5 },
    final_Ra_um: { min: 0.4, max: 1.2 },
    wire_tension_N: { min: 6, max: 12 },
    recast_layer_rough_um: { min: 3, max: 10 },
    tolerance_mm: { min: 0.005, max: 0.012 },
    sources: [
      "Reliable EDM Handbook — copper limited by extremely low resistivity",
      "Klocke & Koenig — copper is EDM machinability class A but with challenges",
      "Mitsubishi tech table — E Cu conditions for MV series",
    ],
    notes: "Copper's extremely high thermal conductivity (401 W/mK) and low resistivity make it fast but can cause wire-to-workpiece welding at high currents. Lower pulse energies needed.",
  },
  {
    id: "Cu-OFHC-50mm-brass025",
    material: "Copper (OFHC C10100)",
    material_group: "copper_brass",
    hardness: "40 HB",
    thickness_mm: 50,
    wire_type: "Brass (CuZn37)",
    wire_diameter_mm: 0.25,
    rough_cut_speed_mm_min: { min: 3.5, max: 6.0 },
    area_cut_rate_mm2_min: { min: 175, max: 300 },
    total_passes: { min: 3, max: 5 },
    final_Ra_um: { min: 0.5, max: 1.5 },
    wire_tension_N: { min: 6, max: 12 },
    recast_layer_rough_um: { min: 3, max: 8 },
    tolerance_mm: { min: 0.008, max: 0.015 },
    sources: [
      "Reliable EDM Handbook — copper high MRR due to low melting point",
      "IOP Science — effect of current and wire speed on surface roughness of copper EDM",
    ],
  },
  {
    id: "Brass-CuZn39-25mm-brass025",
    material: "Brass (CuZn39Pb3 / C36000)",
    material_group: "copper_brass",
    hardness: "80 HB",
    thickness_mm: 25,
    wire_type: "Brass (CuZn37)",
    wire_diameter_mm: 0.25,
    rough_cut_speed_mm_min: { min: 7.0, max: 11.0 },
    area_cut_rate_mm2_min: { min: 175, max: 275 },
    total_passes: { min: 3, max: 5 },
    final_Ra_um: { min: 0.4, max: 1.0 },
    wire_tension_N: { min: 6, max: 12 },
    recast_layer_rough_um: { min: 3, max: 8 },
    tolerance_mm: { min: 0.005, max: 0.010 },
    sources: [
      "Practical Machinist #445099 — brass parts wire EDM speed estimates",
      "ResearchGate — evaluation of optimal parameters for machining brass with wire cut EDM",
    ],
    notes: "Brass workpiece with brass wire can cause wire contamination. Some shops use coated wire for brass parts.",
  },
];

// ============================================================================
// TUNGSTEN CARBIDE
// ============================================================================

const carbideData: WireEDMReferencePoint[] = [
  {
    id: "WC-10mm-brass025",
    material: "Tungsten Carbide (WC-Co, 6% Co)",
    material_group: "carbide",
    hardness: "90+ HRA (1600 HV)",
    thickness_mm: 10,
    wire_type: "Brass (CuZn37)",
    wire_diameter_mm: 0.25,
    rough_cut_speed_mm_min: { min: 3.0, max: 6.0 },
    area_cut_rate_mm2_min: { min: 30, max: 60 },
    total_passes: { min: 4, max: 7 },
    final_Ra_um: { min: 0.2, max: 0.6 },
    wire_tension_N: { min: 8, max: 14 },
    recast_layer_rough_um: { min: 5, max: 15 },
    tolerance_mm: { min: 0.003, max: 0.008 },
    sources: [
      "MATEC Conferences — optimization of EDM wire cutting of tungsten carbide",
      "ResearchGate — WC wire EDM parameters optimization",
      "Reliable EDM Handbook — carbide +/-0.0001in tolerance achievable",
    ],
    notes: "Carbide is very slow to EDM (machinability ~0.3-0.4x steel) but achieves excellent precision. Low cobalt binder % = slower cut.",
  },
  {
    id: "WC-25mm-brass025",
    material: "Tungsten Carbide (WC-Co, 10% Co)",
    material_group: "carbide",
    hardness: "88-90 HRA (1400 HV)",
    thickness_mm: 25,
    wire_type: "Brass (CuZn37)",
    wire_diameter_mm: 0.25,
    rough_cut_speed_mm_min: { min: 1.5, max: 3.5 },
    area_cut_rate_mm2_min: { min: 38, max: 88 },
    total_passes: { min: 4, max: 7 },
    final_Ra_um: { min: 0.2, max: 0.5 },
    wire_tension_N: { min: 8, max: 14 },
    recast_layer_rough_um: { min: 8, max: 20 },
    tolerance_mm: { min: 0.003, max: 0.008 },
    sources: [
      "Reliable EDM Handbook — 3in carbide +/-0.0001in, Ra 5 microinch (0.125 um)",
      "Yizemold carbide wire EDM guide — comprehensive processing parameters",
      "Klocke & Koenig — carbide machinability in EDM depends on Co binder percentage",
    ],
    notes: "Higher Co binder percentage (10-15%) improves EDM machinability significantly. 6% Co grades are the hardest to cut.",
  },
  {
    id: "WC-50mm-coated025",
    material: "Tungsten Carbide (WC-Co, 10% Co)",
    material_group: "carbide",
    hardness: "88-90 HRA",
    thickness_mm: 50,
    wire_type: "Zinc-coated brass",
    wire_diameter_mm: 0.25,
    rough_cut_speed_mm_min: { min: 0.8, max: 2.0 },
    area_cut_rate_mm2_min: { min: 40, max: 100 },
    total_passes: { min: 5, max: 7 },
    final_Ra_um: { min: 0.3, max: 0.8 },
    wire_tension_N: { min: 10, max: 16 },
    recast_layer_rough_um: { min: 10, max: 25 },
    tolerance_mm: { min: 0.005, max: 0.010 },
    sources: [
      "Yizemold — carbide wire EDM guide for thick sections",
      "Carbide-Products.com — EDM surface finish chart for carbide",
      "Practical Machinist — carbide EDM very slow, coated wire helps with break resistance",
    ],
    notes: "Thick carbide is extremely challenging. Wire break risk is high. Many shops use 0.20mm wire for better flushing ratio.",
  },
  {
    id: "WC-10mm-moly010",
    material: "Tungsten Carbide (WC-Co, 6% Co)",
    material_group: "carbide",
    hardness: "90+ HRA",
    thickness_mm: 10,
    wire_type: "Molybdenum",
    wire_diameter_mm: 0.10,
    rough_cut_speed_mm_min: { min: 1.0, max: 2.5 },
    area_cut_rate_mm2_min: { min: 10, max: 25 },
    total_passes: { min: 3, max: 5 },
    final_Ra_um: { min: 0.15, max: 0.40 },
    wire_tension_N: { min: 3, max: 6 },
    recast_layer_rough_um: { min: 3, max: 10 },
    tolerance_mm: { min: 0.002, max: 0.005 },
    sources: [
      "SAM Materials — molybdenum wire for precision carbide cutting",
      "Taguti EDM — molybdenum wire specifications and tension guidelines",
      "Makino U3 fine wire specs — micro-EDM parameters",
    ],
    notes: "Molybdenum 0.10mm for micro EDM / small carbide parts. Minimum corner radius ~0.06mm. Much slower but extreme precision.",
  },
];

// ============================================================================
// TITANIUM
// ============================================================================

const titaniumData: WireEDMReferencePoint[] = [
  {
    id: "Ti64-15mm-brass025",
    material: "Ti-6Al-4V (Grade 5)",
    material_group: "titanium",
    hardness: "36 HRC (334 HB)",
    thickness_mm: 15,
    wire_type: "Brass (CuZn37)",
    wire_diameter_mm: 0.25,
    rough_cut_speed_mm_min: { min: 3.5, max: 6.5 },
    area_cut_rate_mm2_min: { min: 53, max: 98 },
    total_passes: { min: 3, max: 5 },
    final_Ra_um: { min: 0.4, max: 1.0 },
    wire_tension_N: { min: 8, max: 14 },
    recast_layer_rough_um: { min: 7, max: 30 },
    tolerance_mm: { min: 0.005, max: 0.012 },
    sources: [
      "Nature/Scientific Reports 2025 — experimental investigation of WEDM Ti-6Al-4V",
      "Springer IJAMT — recast layer formation during wire EDM of Ti alloy",
      "ResearchGate — wire EDM of Ti-6Al-4V cutting parameters and MRR",
    ],
    notes: "Titanium is difficult to EDM due to low thermal conductivity and high reactivity. Recast layer can be thick with cracks. HAZ concerns for aerospace.",
  },
  {
    id: "Ti64-25mm-brass025",
    material: "Ti-6Al-4V (Grade 5)",
    material_group: "titanium",
    hardness: "36 HRC",
    thickness_mm: 25,
    wire_type: "Brass (CuZn37)",
    wire_diameter_mm: 0.25,
    rough_cut_speed_mm_min: { min: 2.5, max: 4.5 },
    area_cut_rate_mm2_min: { min: 63, max: 113 },
    total_passes: { min: 4, max: 6 },
    final_Ra_um: { min: 0.4, max: 1.2 },
    wire_tension_N: { min: 8, max: 14 },
    recast_layer_rough_um: { min: 10, max: 30 },
    tolerance_mm: { min: 0.008, max: 0.015 },
    sources: [
      "PMC/NIH — understanding wire EDM machining of Ti6Al4V alloy",
      "Academia — HAZ and recast layer of Ti-6Al-4V in EDM (SEM study)",
      "Springer — recast layer formation during WEDM of Ti alloy",
    ],
    notes: "Recast contains TiO2 rutile phase. Multiple skim passes essential to remove recast for aerospace applications.",
  },
  {
    id: "Ti64-50mm-coated025",
    material: "Ti-6Al-4V (Grade 5)",
    material_group: "titanium",
    hardness: "36 HRC",
    thickness_mm: 50,
    wire_type: "Zinc-coated brass",
    wire_diameter_mm: 0.25,
    rough_cut_speed_mm_min: { min: 1.2, max: 2.5 },
    area_cut_rate_mm2_min: { min: 60, max: 125 },
    total_passes: { min: 4, max: 7 },
    final_Ra_um: { min: 0.5, max: 1.5 },
    wire_tension_N: { min: 10, max: 16 },
    recast_layer_rough_um: { min: 15, max: 35 },
    tolerance_mm: { min: 0.010, max: 0.020 },
    sources: [
      "Springer — WEDM Ti-6Al-4V: rough cut at 50 um/s produced recast ~30 um",
      "Eng-Tips #485198 — titanium wire EDM vs conventional milling discussion",
    ],
    notes: "Titanium at 50mm is very challenging. Wire break risk is high due to low thermal conductivity. Coated wire essential.",
  },
];

// ============================================================================
// STAINLESS STEEL
// ============================================================================

const stainlessSteelData: WireEDMReferencePoint[] = [
  {
    id: "SS304-25mm-brass025",
    material: "AISI 304 Stainless Steel",
    material_group: "stainless_steel",
    hardness: "88 HRB (201 HB)",
    thickness_mm: 25,
    wire_type: "Brass (CuZn37)",
    wire_diameter_mm: 0.25,
    rough_cut_speed_mm_min: { min: 4.0, max: 7.0 },
    area_cut_rate_mm2_min: { min: 100, max: 175 },
    total_passes: { min: 3, max: 5 },
    final_Ra_um: { min: 0.4, max: 1.0 },
    wire_tension_N: { min: 8, max: 14 },
    recast_layer_rough_um: { min: 8, max: 20 },
    tolerance_mm: { min: 0.005, max: 0.012 },
    sources: [
      "MDPI Materials — experimental investigation of wire EDM of SS304: MRR and Ra",
      "Wiley — optimization of SS304 wire cut EDM by RSM",
      "IJEIT — effect of wire EDM parameters on surface roughness of SS304",
    ],
    notes: "304 SS has high resistivity (72 uOhm.cm) which actually helps EDM spark generation, but low thermal conductivity (16 W/mK) slows heat removal.",
  },
  {
    id: "SS304-50mm-brass025",
    material: "AISI 304 Stainless Steel",
    material_group: "stainless_steel",
    hardness: "88 HRB",
    thickness_mm: 50,
    wire_type: "Brass (CuZn37)",
    wire_diameter_mm: 0.25,
    rough_cut_speed_mm_min: { min: 2.5, max: 4.5 },
    area_cut_rate_mm2_min: { min: 125, max: 180 },
    total_passes: { min: 3, max: 6 },
    final_Ra_um: { min: 0.5, max: 1.2 },
    wire_tension_N: { min: 8, max: 14 },
    recast_layer_rough_um: { min: 10, max: 25 },
    tolerance_mm: { min: 0.008, max: 0.015 },
    sources: [
      "IJISRT — optimization of wire EDM parameters on SS410 (comparable austenitic)",
      "ScienceDirect — wire EDM and wire ECM finishing of 316L (related data)",
    ],
  },
  {
    id: "SS316-25mm-brass025",
    material: "AISI 316L Stainless Steel",
    material_group: "stainless_steel",
    hardness: "79 HRB (217 HB)",
    thickness_mm: 25,
    wire_type: "Brass (CuZn37)",
    wire_diameter_mm: 0.25,
    rough_cut_speed_mm_min: { min: 3.5, max: 6.5 },
    area_cut_rate_mm2_min: { min: 88, max: 163 },
    total_passes: { min: 3, max: 5 },
    final_Ra_um: { min: 0.4, max: 1.0 },
    wire_tension_N: { min: 8, max: 14 },
    recast_layer_rough_um: { min: 8, max: 22 },
    tolerance_mm: { min: 0.005, max: 0.012 },
    sources: [
      "ScienceDirect — wire EDM and ECM of 316L: combined strategy study",
      "IAEME — optimization of wire EDM parameters for 316L",
      "PMC — advanced EDM of stainless steels assessment",
    ],
    notes: "316L slightly harder to EDM than 304 due to Mo content. Medical and food industry applications demand multi-pass for surface integrity.",
  },
  {
    id: "SS316-50mm-coated025",
    material: "AISI 316L Stainless Steel",
    material_group: "stainless_steel",
    hardness: "79 HRB",
    thickness_mm: 50,
    wire_type: "Zinc-coated brass",
    wire_diameter_mm: 0.25,
    rough_cut_speed_mm_min: { min: 2.5, max: 5.0 },
    area_cut_rate_mm2_min: { min: 125, max: 200 },
    total_passes: { min: 4, max: 6 },
    final_Ra_um: { min: 0.5, max: 1.2 },
    wire_tension_N: { min: 10, max: 16 },
    recast_layer_rough_um: { min: 10, max: 25 },
    tolerance_mm: { min: 0.008, max: 0.015 },
    sources: [
      "PMC — EDM surface integrity of stainless steels review",
      "ScienceDirect — wire EDM/ECM hybrid for 316L",
    ],
  },
];

// ============================================================================
// INCONEL / NICKEL SUPERALLOYS
// ============================================================================

const inconelData: WireEDMReferencePoint[] = [
  {
    id: "IN718-15mm-brass025",
    material: "Inconel 718",
    material_group: "nickel_superalloy",
    hardness: "36-44 HRC (331-415 HB)",
    thickness_mm: 15,
    wire_type: "Brass (CuZn37)",
    wire_diameter_mm: 0.25,
    rough_cut_speed_mm_min: { min: 2.5, max: 5.0 },
    area_cut_rate_mm2_min: { min: 38, max: 75 },
    total_passes: { min: 3, max: 5 },
    final_Ra_um: { min: 0.5, max: 1.2 },
    wire_tension_N: { min: 8, max: 14 },
    recast_layer_rough_um: { min: 10, max: 25 },
    tolerance_mm: { min: 0.008, max: 0.015 },
    sources: [
      "MDPI Coatings — optimization of wire EDM of Inconel 718 with zinc-coated wire",
      "Emerald — wire EDM cutting of Inconel 718: kerf and MRR analysis",
      "ScienceDirect — effects of wire EDM on surface roughness of Inconel 718",
    ],
    notes: "Inconel 718 has very low thermal conductivity (11 W/mK) and high resistivity (103 uOhm.cm). EDM machinability ~0.5x steel.",
  },
  {
    id: "IN718-25mm-brass025",
    material: "Inconel 718",
    material_group: "nickel_superalloy",
    hardness: "40-44 HRC",
    thickness_mm: 25,
    wire_type: "Brass (CuZn37)",
    wire_diameter_mm: 0.25,
    rough_cut_speed_mm_min: { min: 1.8, max: 3.5 },
    area_cut_rate_mm2_min: { min: 45, max: 88 },
    total_passes: { min: 4, max: 6 },
    final_Ra_um: { min: 0.5, max: 1.5 },
    wire_tension_N: { min: 8, max: 14 },
    recast_layer_rough_um: { min: 12, max: 30 },
    tolerance_mm: { min: 0.008, max: 0.015 },
    sources: [
      "Nature/Scientific Reports 2025 — experimental investigation of wire EDM of Inconel 718",
      "Springer IJAMT — wire EDM performance and surface integrity of Inconel 718",
      "Strathclyde Univ — multi-response optimization of wire EDM of Inconel 718",
    ],
    notes: "Optimal parameters per literature: Ton=140us, Toff=50us, SV=60V, WT=5kg (~49N machine setting)",
  },
  {
    id: "IN718-50mm-coated025",
    material: "Inconel 718",
    material_group: "nickel_superalloy",
    hardness: "40-44 HRC",
    thickness_mm: 50,
    wire_type: "Zinc-coated brass",
    wire_diameter_mm: 0.25,
    rough_cut_speed_mm_min: { min: 0.8, max: 2.0 },
    area_cut_rate_mm2_min: { min: 40, max: 100 },
    total_passes: { min: 4, max: 7 },
    final_Ra_um: { min: 0.8, max: 2.0 },
    wire_tension_N: { min: 10, max: 16 },
    recast_layer_rough_um: { min: 15, max: 35 },
    tolerance_mm: { min: 0.010, max: 0.020 },
    sources: [
      "ResearchGate — machining characteristics of Inconel 718 by wire EDM",
      "IJERT — machining of Inconel 718 using EDM review",
    ],
    notes: "Inconel at 50mm is one of the slowest wire EDM operations. High debris generation, poor flushing. Risk of micro-cracks in recast layer.",
  },
];

// ============================================================================
// SPECIAL WIRE TYPES — 0.20mm and 0.10mm reference points
// ============================================================================

const fineWireData: WireEDMReferencePoint[] = [
  {
    id: "D2-25mm-brass020",
    material: "AISI D2 (SKD11)",
    material_group: "tool_steel",
    hardness: "58-60 HRC",
    thickness_mm: 25,
    wire_type: "Brass (CuZn37)",
    wire_diameter_mm: 0.20,
    rough_cut_speed_mm_min: { min: 3.5, max: 6.0 },
    area_cut_rate_mm2_min: { min: 88, max: 150 },
    total_passes: { min: 3, max: 5 },
    final_Ra_um: { min: 0.25, max: 0.6 },
    wire_tension_N: { min: 5, max: 10 },
    recast_layer_rough_um: { min: 8, max: 18 },
    tolerance_mm: { min: 0.003, max: 0.008 },
    sources: [
      "Sodick tech tables — 0.20mm wire conditions for D2",
      "Lemhunter — wire EDM diameter guide: smaller wire = finer detail, slower speed",
      "Sumitomo Electric — steel-core EDM wire performance data",
    ],
    notes: "0.20mm wire gives ~30% slower cutting but tighter corners (min radius ~0.11mm vs 0.14mm for 0.25mm). Better surface finish achievable.",
  },
  {
    id: "D2-15mm-brass010",
    material: "AISI D2 (SKD11)",
    material_group: "tool_steel",
    hardness: "58-60 HRC",
    thickness_mm: 15,
    wire_type: "Brass fine wire",
    wire_diameter_mm: 0.10,
    rough_cut_speed_mm_min: { min: 1.0, max: 2.5 },
    area_cut_rate_mm2_min: { min: 15, max: 38 },
    total_passes: { min: 3, max: 5 },
    final_Ra_um: { min: 0.15, max: 0.35 },
    wire_tension_N: { min: 2, max: 5 },
    recast_layer_rough_um: { min: 3, max: 10 },
    tolerance_mm: { min: 0.002, max: 0.005 },
    sources: [
      "Makino U3/U6 fine wire specifications",
      "Lemhunter — 0.10mm wire for micro EDM, very slow but extreme precision",
      "AgieCharmilles CUT F series — fine wire EDM conditions",
    ],
    notes: "0.10mm wire for micro-EDM applications. Min corner radius ~0.06mm. Max practical thickness ~20mm.",
  },
];

// ============================================================================
// AGGREGATE EXPORT
// ============================================================================

/** All 36 wire EDM reference data points */
export const WIRE_EDM_REFERENCE_DATA: WireEDMReferencePoint[] = [
  ...toolSteelData,
  ...aluminumData,
  ...copperBrassData,
  ...carbideData,
  ...titaniumData,
  ...stainlessSteelData,
  ...inconelData,
  ...fineWireData,
];

// ============================================================================
// CROSS-CUTTING REFERENCE TABLES
// ============================================================================

/**
 * Surface finish vs number of passes — industry consensus data
 *
 * Sources:
 *   - MMS "Buying a Wire EDM Part 3" — pass count to finish relationship
 *   - Carbide Products surface finish chart
 *   - AgieCharmilles CUT 20 P, CUT P Pro published specs
 *   - Practical Machinist multiple threads — shop verified
 *   - Klocke & Koenig Manufacturing Processes 3
 */
export const SURFACE_FINISH_VS_PASSES = [
  { passes: 1, Ra_um: { min: 2.0, max: 3.5 }, Ra_uin: { min: 80, max: 140 }, tolerance_mm: { min: 0.03, max: 0.05 }, notes: "Rough cut only — no skim passes" },
  { passes: 2, Ra_um: { min: 1.0, max: 2.0 }, Ra_uin: { min: 40, max: 80 },  tolerance_mm: { min: 0.015, max: 0.025 }, notes: "1R + 1S — basic cleanup" },
  { passes: 3, Ra_um: { min: 0.5, max: 1.2 }, Ra_uin: { min: 20, max: 48 },  tolerance_mm: { min: 0.008, max: 0.015 }, notes: "1R + 2S — standard production" },
  { passes: 4, Ra_um: { min: 0.3, max: 0.8 }, Ra_uin: { min: 12, max: 32 },  tolerance_mm: { min: 0.005, max: 0.010 }, notes: "1R + 3S — precision work (D2 32mm verified: Ra 0.32)" },
  { passes: 5, Ra_um: { min: 0.2, max: 0.5 }, Ra_uin: { min: 8, max: 20 },   tolerance_mm: { min: 0.003, max: 0.008 }, notes: "1R + 4S — high precision" },
  { passes: 6, Ra_um: { min: 0.15, max: 0.3 }, Ra_uin: { min: 6, max: 12 },  tolerance_mm: { min: 0.003, max: 0.005 }, notes: "1R + 5S — fine finish" },
  { passes: 7, Ra_um: { min: 0.08, max: 0.2 }, Ra_uin: { min: 3, max: 8 },   tolerance_mm: { min: 0.002, max: 0.004 }, notes: "1R + 6S — mirror finish (AgieCharmilles CUT P Pro spec)" },
];

/**
 * Recast layer thickness by pass type — published research consensus
 *
 * Sources:
 *   - CTE "Understanding EDMed Surfaces" — finishing ops < 0.0001in (2.5 um)
 *   - Springer IJAMT — parametric analysis of recast layer in HSLA
 *   - Rajurkar et al. — EDM surface integrity foundational paper
 *   - Klocke & Koenig — white layer formation model
 *   - MoldMaking Technology — EDM effect on surface integrity
 */
export const RECAST_LAYER_BY_PASS = [
  { pass_type: "rough",        recast_um: { min: 10, max: 35 }, haz_um: { min: 15, max: 50 },  notes: "Full energy discharge, highest MRR" },
  { pass_type: "semi_finish",  recast_um: { min: 3, max: 12 },  haz_um: { min: 5, max: 20 },   notes: "Reduced energy, material removal tapering" },
  { pass_type: "finish",       recast_um: { min: 1, max: 5 },   haz_um: { min: 2, max: 8 },    notes: "Low energy pulses, precision focus" },
  { pass_type: "super_finish", recast_um: { min: 0.2, max: 2 }, haz_um: { min: 0.5, max: 4 },  notes: "RC circuit / capacitance discharge, Ra < 0.4 um" },
];

/**
 * Wire tension ranges by wire type and diameter
 *
 * Sources:
 *   - Sodick SL400G / VL400Q operator manuals
 *   - Taguti EDM — molybdenum wire tension 12-15 N
 *   - Novotec wire selection guide
 *   - Lemhunter — wire type guide
 *   - Reliable EDM Handbook — wire tension fundamentals
 */
export const WIRE_TENSION_BY_TYPE = [
  { wire_type: "Brass (CuZn37)",       diameter_mm: 0.25, tension_N: { min: 8, max: 15 }, tensile_strength_N: 26, notes: "Standard 63/37 brass, most common setup" },
  { wire_type: "Brass (CuZn37)",       diameter_mm: 0.20, tension_N: { min: 5, max: 10 }, tensile_strength_N: 17, notes: "Fine brass, reduced tension required" },
  { wire_type: "Brass (CuZn37)",       diameter_mm: 0.10, tension_N: { min: 2, max: 5 },  tensile_strength_N: 6,  notes: "Micro EDM brass, very fragile" },
  { wire_type: "Zinc-coated brass",    diameter_mm: 0.25, tension_N: { min: 10, max: 18 }, tensile_strength_N: 30, notes: "Coated wire, higher tensile, 20-30% faster cutting" },
  { wire_type: "Zinc-coated brass",    diameter_mm: 0.20, tension_N: { min: 7, max: 12 }, tensile_strength_N: 20, notes: "Fine coated wire" },
  { wire_type: "Molybdenum",           diameter_mm: 0.18, tension_N: { min: 12, max: 15 }, tensile_strength_N: 35, notes: "High tensile, reusable on fast-wire machines" },
  { wire_type: "Molybdenum",           diameter_mm: 0.10, tension_N: { min: 3, max: 6 },  tensile_strength_N: 12, notes: "Micro-EDM moly wire" },
  { wire_type: "Steel-core coated",    diameter_mm: 0.25, tension_N: { min: 15, max: 22 }, tensile_strength_N: 40, notes: "Sumitomo-type, extreme strength, for tall parts" },
];

/**
 * Material EDM machinability ranking — normalized to D2 = 1.00
 *
 * Based on aggregated data from all sources above. Higher = faster/easier to cut.
 * This can be used to scale cutting speed predictions from a D2 baseline.
 *
 * Sources: Klocke & Koenig, Reliable EDM Handbook, multiple ResearchGate papers,
 *          Practical Machinist verified shop data
 */
export const MATERIAL_EDM_MACHINABILITY = [
  { material: "AISI D2",          machinability_index: 1.00, category: "tool_steel",        notes: "Baseline reference material for wire EDM" },
  { material: "AISI A2",          machinability_index: 1.05, category: "tool_steel",        notes: "Slightly easier than D2, fewer carbides" },
  { material: "AISI H13",         machinability_index: 1.08, category: "tool_steel",        notes: "Higher thermal cond helps, good EDM material" },
  { material: "AISI S7",          machinability_index: 1.10, category: "tool_steel",        notes: "Best tool steel for EDM, high thermal cond" },
  { material: "AISI O2",          machinability_index: 1.05, category: "tool_steel",        notes: "Oil-hardened, similar to A2" },
  { material: "AISI M2 (HSS)",    machinability_index: 0.85, category: "hss",               notes: "High alloy content slows cutting" },
  { material: "AISI M42 (HSS)",   machinability_index: 0.75, category: "hss",               notes: "Very high alloy HSS, slowest in steel group" },
  { material: "4140 Steel",       machinability_index: 1.15, category: "tool_steel",        notes: "Medium carbon, good conductivity" },
  { material: "1018 Steel",       machinability_index: 1.20, category: "tool_steel",        notes: "Low carbon, easy to cut but poor finish" },
  { material: "304 Stainless",    machinability_index: 0.85, category: "stainless_steel",   notes: "Low thermal cond but high resistivity helps spark" },
  { material: "316L Stainless",   machinability_index: 0.80, category: "stainless_steel",   notes: "Mo content makes slightly harder than 304" },
  { material: "Al 6061",          machinability_index: 1.30, category: "aluminum",          notes: "Fast cutting, poor surface finish" },
  { material: "Al 7075",          machinability_index: 1.20, category: "aluminum",          notes: "Slightly harder aluminum, still fast" },
  { material: "Copper (OFHC)",    machinability_index: 1.10, category: "copper_brass",      notes: "Very fast MRR but low resistivity challenges" },
  { material: "Brass (C36000)",   machinability_index: 1.25, category: "copper_brass",      notes: "Ideal EDM material, Zn content helps" },
  { material: "Ti-6Al-4V",        machinability_index: 0.55, category: "titanium",          notes: "Very difficult, low thermal cond, reactive" },
  { material: "Inconel 718",      machinability_index: 0.50, category: "nickel_superalloy", notes: "Most difficult common material for wire EDM" },
  { material: "WC-Co (6% Co)",    machinability_index: 0.30, category: "carbide",           notes: "Extremely slow, low Co binder" },
  { material: "WC-Co (10% Co)",   machinability_index: 0.40, category: "carbide",           notes: "More Co binder helps significantly" },
  { material: "WC-Co (15% Co)",   machinability_index: 0.50, category: "carbide",           notes: "High Co binder, best carbide for EDM" },
  { material: "Graphite",         machinability_index: 0.60, category: "carbide",           notes: "Used in sinker EDM electrodes, high resistivity" },
];

/**
 * Area cut rate (mm2/min) by material group for 0.25mm brass wire (rough cut)
 *
 * These are the area rates that should be independent of thickness for
 * consistent MRR (linear speed = area_rate / thickness).
 * In practice, area rate drops at extreme thicknesses due to flushing limits.
 *
 * Sources: Sodick, Makino, Mitsubishi machine specs, MMS published benchmarks,
 *          Practical Machinist aggregated shop data
 */
export const AREA_CUT_RATE_BY_MATERIAL_MM2_MIN = {
  /** Tool steels (D2, A2, H13, S7, O2) — modern machine, 0.25mm brass, closed nozzles */
  tool_steel:         { min: 120, typical: 160, max: 220, notes: "160 mm2/min baseline for 0.25mm brass, 240 for coated" },
  /** HSS (M2, M42) */
  hss:                { min: 90,  typical: 130, max: 170, notes: "Reduced by high alloy content" },
  /** Stainless steel (304, 316) */
  stainless_steel:    { min: 90,  typical: 140, max: 180, notes: "High resistivity helps, low thermal cond hurts" },
  /** Aluminum (6061, 7075) */
  aluminum:           { min: 150, typical: 250, max: 350, notes: "High MRR but surface finish limited" },
  /** Copper and brass */
  copper_brass:       { min: 150, typical: 220, max: 300, notes: "Fast cutting, low resistivity needs parameter care" },
  /** Titanium (Ti-6Al-4V) */
  titanium:           { min: 40,  typical: 70,  max: 120, notes: "Very slow, difficult flushing" },
  /** Inconel (718) */
  nickel_superalloy:  { min: 35,  typical: 60,  max: 100, notes: "Slowest common material" },
  /** Tungsten carbide */
  carbide:            { min: 20,  typical: 50,  max: 100, notes: "Depends heavily on Co binder %" },
};

/**
 * Flushing pressure guidelines (bar) by pass type and part geometry
 *
 * Sources: Reliable EDM Handbook Ch.5, Sodick manuals, BobCAD wire EDM docs,
 *          CTE "Gap Guidance" article, Sammlite EDM guide
 */
export const FLUSHING_PRESSURE_BAR = {
  rough_closed_nozzle:    { min: 8,  max: 18, notes: "Closed nozzles touching workpiece, max pressure for debris evacuation" },
  rough_open_nozzle:      { min: 3,  max: 8,  notes: "Open nozzles (clearance), reduced pressure" },
  skim_first:             { min: 2,  max: 6,  notes: "First skim: reduced pressure to avoid wire deflection" },
  skim_finish:            { min: 1,  max: 3,  notes: "Final skim: gentle flow only, precision critical" },
  tall_workpiece_rough:   { min: 12, max: 22, notes: "Thick parts (>75mm): high pressure essential for flushing" },
  submerged_supplement:   { min: 1,  max: 4,  notes: "Additional pressure when tank is submerged" },
};

// ============================================================================
// HELPER FUNCTIONS FOR TEST ASSERTIONS
// ============================================================================

/**
 * Find reference data points by material group
 */
export function getRefByMaterialGroup(group: WireEDMReferencePoint["material_group"]): WireEDMReferencePoint[] {
  return WIRE_EDM_REFERENCE_DATA.filter(r => r.material_group === group);
}

/**
 * Find reference data by ID
 */
export function getRefById(id: string): WireEDMReferencePoint | undefined {
  return WIRE_EDM_REFERENCE_DATA.find(r => r.id === id);
}

/**
 * Get all reference points for a specific wire diameter
 */
export function getRefByWireDiameter(diameter_mm: number): WireEDMReferencePoint[] {
  return WIRE_EDM_REFERENCE_DATA.filter(r => r.wire_diameter_mm === diameter_mm);
}

/**
 * Get all reference points for a specific thickness range
 */
export function getRefByThickness(min_mm: number, max_mm: number): WireEDMReferencePoint[] {
  return WIRE_EDM_REFERENCE_DATA.filter(r => r.thickness_mm >= min_mm && r.thickness_mm <= max_mm);
}

/**
 * Validate a PRISM output value falls within the published reference range
 */
export function isWithinRefRange(
  value: number,
  range: { min: number; max: number },
  tolerance_pct: number = 0,
): boolean {
  const margin = (range.max - range.min) * tolerance_pct / 100;
  return value >= (range.min - margin) && value <= (range.max + margin);
}
