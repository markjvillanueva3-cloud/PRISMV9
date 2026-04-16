/**
 * lathe-physics-science-tips.ts — Physics, Chemistry, Metallurgy, Thermodynamics Tips
 * ====================================================================================
 *
 * PhD-level scientific knowledge for lathe cutting processes.
 * Integrates: Kienzle, Taylor, Johnson-Cook, Jaeger thermal, metallurgy.
 *
 * @module data/lathe-physics-science-tips
 */

import type { TribalTip } from "./tribal-knowledge-types.js";

/**
 * Cutting force physics (Kienzle model)
 */
export const KIENZLE_TIPS: TribalTip[] = [
  {
    tip_id: "kienzle-001",
    title: "Kienzle Force Calculation",
    description:
      "Main cutting force Fc = kc1.1 × ap × f^(1-mc). Where kc1.1 is specific cutting force at 1mm chip thickness, ap is depth of cut, f is feed, mc is Kienzle exponent (0.14-0.40).",
    category: "cutting_force",
    machine_type: "lathe",
    severity: "info",
    confidence: 0.98,
    source: "Kienzle (1952), Altintas Manufacturing Automation",
    formula: "Fc = kc1_1 * ap * f^(1-mc)",
    variables: {
      kc1_1: "Specific cutting force at h=1mm [N/mm²]",
      ap: "Depth of cut [mm]",
      f: "Feed rate [mm/rev]",
      mc: "Kienzle exponent (material-dependent)",
    },
    values_by_iso: {
      P: { kc1_1: 1800, mc: 0.25 },
      M: { kc1_1: 2100, mc: 0.25 },
      K: { kc1_1: 1100, mc: 0.28 },
      N: { kc1_1: 700, mc: 0.23 },
      S: { kc1_1: 2800, mc: 0.28 },
      H: { kc1_1: 3200, mc: 0.30 },
    },
    tags: ["kienzle", "cutting_force", "physics"],
  },
  {
    tip_id: "kienzle-002",
    title: "Power Requirement from Force",
    description:
      "Cutting power Pc = Fc × Vc / 60000 [kW]. Motor power must exceed Pc/η where η is machine efficiency (0.7-0.85). Always verify spindle power before heavy roughing.",
    category: "cutting_force",
    machine_type: "lathe",
    severity: "critical",
    confidence: 0.95,
    source: "Sandvik Coromant, Machine Tool Dynamics",
    formula: "Pc = (Fc × Vc) / 60000 [kW]",
    tags: ["power", "motor", "roughing"],
  },
  {
    tip_id: "kienzle-003",
    title: "Torque from Cutting Force",
    description:
      "Spindle torque T = Fc × Dc / 2000 [Nm]. At low RPM, torque limits may be reached before power limits. Check machine torque curve for max DOC at given RPM.",
    category: "cutting_force",
    machine_type: "lathe",
    severity: "warning",
    confidence: 0.95,
    source: "Machine tool specifications",
    formula: "T = (Fc × D) / 2000 [Nm]",
    tags: ["torque", "spindle", "low_rpm"],
  },
];

/**
 * Tool life physics (Taylor model)
 */
export const TAYLOR_TIPS: TribalTip[] = [
  {
    tip_id: "taylor-001",
    title: "Taylor Tool Life Equation",
    description:
      "Tool life T = (C/Vc)^(1/n) where C is Taylor constant (Vc at T=1min), n is Taylor exponent. Higher n means flatter curve (less speed-sensitive). Double speed roughly halves tool life for n=0.25.",
    category: "tool_life",
    machine_type: "lathe",
    severity: "info",
    confidence: 0.98,
    source: "Taylor (1907), ISO 3685",
    formula: "T = (C / Vc)^(1/n)",
    variables: {
      T: "Tool life [min]",
      C: "Taylor constant [m/min at T=1min]",
      Vc: "Cutting speed [m/min]",
      n: "Taylor exponent (0.1-0.4)",
    },
    values_by_iso: {
      P: { C: 350, n: 0.25 },
      M: { C: 250, n: 0.22 },
      K: { C: 400, n: 0.27 },
      N: { C: 800, n: 0.35 },
      S: { C: 150, n: 0.18 },
      H: { C: 120, n: 0.15 },
    },
    tags: ["taylor", "tool_life", "wear"],
  },
  {
    tip_id: "taylor-002",
    title: "Extended Taylor with Feed and DOC",
    description:
      "Extended Taylor: T = C / (Vc^a × f^b × ap^c). Speed has largest effect (a≈0.4), then feed (b≈0.2), then DOC (c≈0.1). Reduce speed before reducing feed for longer tool life.",
    category: "tool_life",
    machine_type: "lathe",
    severity: "info",
    confidence: 0.90,
    source: "Kronenberg, Manufacturing Science",
    formula: "T = C / (Vc^a × f^b × ap^c)",
    tags: ["taylor", "extended", "optimization"],
  },
  {
    tip_id: "taylor-003",
    title: "Flank Wear Progression",
    description:
      "Flank wear VB grows in three phases: rapid initial (break-in), steady-state linear, rapid final (failure). Tool life criterion: VB = 0.3mm average or 0.6mm max. Replace at steady-state end.",
    category: "tool_life",
    machine_type: "lathe",
    severity: "warning",
    confidence: 0.95,
    source: "ISO 3685 Tool Life Testing",
    tags: ["flank_wear", "vb", "tool_change"],
  },
];

/**
 * Thermal physics tips
 */
export const THERMAL_TIPS: TribalTip[] = [
  {
    tip_id: "thermal-001",
    title: "Cutting Temperature Generation",
    description:
      "Nearly all cutting energy converts to heat: Q ≈ Fc × Vc. At 200 m/min in steel, chip temperatures reach 600-800°C. Tool-chip interface can exceed 1000°C in titanium machining.",
    category: "thermal",
    machine_type: "lathe",
    severity: "info",
    confidence: 0.95,
    source: "Shaw Metal Cutting Principles",
    formula: "Q = Fc × Vc [W]",
    tags: ["temperature", "heat", "energy"],
  },
  {
    tip_id: "thermal-002",
    title: "Heat Partition in Cutting",
    description:
      "Heat distribution: chip 60-80% (higher at high speed), tool 10-20%, workpiece 5-20%, coolant variable. At high speeds, chip carries more heat away, protecting workpiece.",
    category: "thermal",
    machine_type: "lathe",
    severity: "info",
    confidence: 0.90,
    source: "Trent & Wright Metal Cutting",
    tags: ["heat_partition", "chip", "cooling"],
  },
  {
    tip_id: "thermal-003",
    title: "Coating Temperature Limits",
    description:
      "Coating breakdown temperatures: Uncoated carbide 600°C, TiN 500°C, TiCN 450°C, TiAlN 800°C, Al2O3 1200°C. Select coating based on expected temperature.",
    category: "thermal",
    machine_type: "lathe",
    severity: "warning",
    confidence: 0.95,
    source: "Coating manufacturer data",
    tags: ["coating", "temperature", "selection"],
  },
  {
    tip_id: "thermal-004",
    title: "Thermal Softening Effect",
    description:
      "Material flow stress drops with temperature (Johnson-Cook T* term). Steel loses 50% strength at 600°C. This softening reduces cutting forces but increases tool wear.",
    category: "thermal",
    machine_type: "lathe",
    severity: "info",
    confidence: 0.90,
    source: "Johnson-Cook model",
    tags: ["softening", "flow_stress", "johnson_cook"],
  },
  {
    tip_id: "thermal-005",
    title: "Thermal Distortion in Long Parts",
    description:
      "Thermal expansion: ΔL = α × L × ΔT. Steel α≈12×10⁻⁶/K. A 300mm part heating 50°C grows 0.18mm. For tight tolerances, use coolant and allow settling time.",
    category: "thermal",
    machine_type: "lathe",
    severity: "critical",
    confidence: 0.95,
    source: "Thermal expansion physics",
    formula: "ΔL = α × L × ΔT",
    tags: ["expansion", "distortion", "tolerance"],
  },
];

/**
 * Metallurgical tips
 */
export const METALLURGY_TIPS: TribalTip[] = [
  {
    tip_id: "metal-001",
    title: "White Layer Formation",
    description:
      "White layer (untempered martensite) forms when surface exceeds Ac1 temperature then quenches rapidly. Occurs in hardened steel above 200 m/min. Hard but brittle - may cause fatigue failure.",
    category: "metallurgy",
    machine_type: "lathe",
    severity: "warning",
    confidence: 0.90,
    source: "Metallurgical literature",
    tags: ["white_layer", "martensite", "hard_turning"],
  },
  {
    tip_id: "metal-002",
    title: "Work Hardening in Stainless",
    description:
      "Austenitic stainless (304, 316) work hardens severely. Never rub without cutting - always maintain positive chip load. Use sharp tools, positive rake, adequate DOC (>0.5mm).",
    category: "metallurgy",
    machine_type: "lathe",
    severity: "critical",
    confidence: 0.95,
    source: "Stainless steel machining guides",
    tags: ["work_hardening", "stainless", "304", "316"],
  },
  {
    tip_id: "metal-003",
    title: "Carbide Distribution in Tool Steel",
    description:
      "Tool steels (D2, M2) have hard carbide particles that cause abrasive wear. Larger carbides = more wear. Use CBN or ceramic for >55 HRC. Carbide OK for <55 HRC.",
    category: "metallurgy",
    machine_type: "lathe",
    severity: "info",
    confidence: 0.90,
    source: "Tool steel handbook",
    tags: ["carbide", "tool_steel", "abrasion"],
  },
  {
    tip_id: "metal-004",
    title: "Residual Stress from Cutting",
    description:
      "Cutting produces tensile residual stress (thermal) in surface, compressive below. Tensile stress reduces fatigue life. Finishing with sharp tool, low feed minimizes thermal damage.",
    category: "metallurgy",
    machine_type: "lathe",
    severity: "warning",
    confidence: 0.90,
    source: "Surface integrity research",
    tags: ["residual_stress", "fatigue", "surface_integrity"],
  },
  {
    tip_id: "metal-005",
    title: "Tempering Risk in Hardened Steel",
    description:
      "Hardened steel tempers (softens) above 300-400°C. Excessive cutting temperature causes soft spots. Keep speed moderate, use coolant, maintain sharp tools to prevent surface softening.",
    category: "metallurgy",
    machine_type: "lathe",
    severity: "critical",
    confidence: 0.95,
    source: "Heat treatment metallurgy",
    tags: ["tempering", "hardness", "softening"],
  },
];

/**
 * Chemistry tips
 */
export const CHEMISTRY_TIPS: TribalTip[] = [
  {
    tip_id: "chem-001",
    title: "Coolant-Material Compatibility",
    description:
      "Chemical incompatibilities: Al + chlorinated oil = staining, Cu + sulfur = discoloration, Mg + water = fire risk, Ti + chlorine = stress corrosion. Check compatibility before use.",
    category: "chemistry",
    machine_type: "lathe",
    severity: "critical",
    confidence: 0.95,
    source: "Coolant manufacturer guidelines",
    tags: ["coolant", "compatibility", "staining"],
  },
  {
    tip_id: "chem-002",
    title: "Diffusion Wear in Titanium",
    description:
      "Titanium has high chemical affinity for carbon and cobalt. At cutting temperatures, Ti diffuses into WC-Co tools causing dissolution wear. Use low speed (<60 m/min) or PCD tooling.",
    category: "chemistry",
    machine_type: "lathe",
    severity: "critical",
    confidence: 0.95,
    source: "Titanium machining research",
    tags: ["titanium", "diffusion", "wear"],
  },
  {
    tip_id: "chem-003",
    title: "Built-Up Edge Chemistry",
    description:
      "BUE forms when workpiece material adheres to tool at low speeds (<30 m/min in steel). Caused by cold welding at tool-chip interface. Increase speed or use coated inserts to prevent.",
    category: "chemistry",
    machine_type: "lathe",
    severity: "warning",
    confidence: 0.90,
    source: "Metal cutting tribology",
    tags: ["bue", "adhesion", "low_speed"],
  },
  {
    tip_id: "chem-004",
    title: "Coolant pH and Corrosion",
    description:
      "Coolant pH should be 8.5-9.5 for corrosion protection. Below 8: rust risk on steel. Above 10: skin irritation, paint damage. Test weekly, adjust with additives.",
    category: "chemistry",
    machine_type: "lathe",
    severity: "warning",
    confidence: 0.90,
    source: "Coolant maintenance guides",
    tags: ["ph", "corrosion", "coolant_maintenance"],
  },
];

/**
 * Chip formation physics tips
 */
export const CHIP_PHYSICS_TIPS: TribalTip[] = [
  {
    tip_id: "chip-001",
    title: "Shear Plane Angle (Merchant)",
    description:
      "Shear plane angle φ = 45° - β/2 + α/2. Where β is friction angle (atan(μ)), α is rake angle. Higher rake → higher shear angle → lower forces. Minimum energy principle.",
    category: "chip_formation",
    machine_type: "lathe",
    severity: "info",
    confidence: 0.95,
    source: "Merchant (1945) Metal Cutting Theory",
    formula: "φ = 45° - β/2 + α/2",
    tags: ["shear_angle", "merchant", "rake"],
  },
  {
    tip_id: "chip-002",
    title: "Chip Breaking Minimum DOC",
    description:
      "Chip breakers need minimum DOC to function. Below minimum, chip flows over breaker without breaking. Typical minimum: 0.5-1.5mm depending on insert geometry. Check insert specification.",
    category: "chip_formation",
    machine_type: "lathe",
    severity: "warning",
    confidence: 0.90,
    source: "Insert manufacturer data",
    tags: ["chip_breaker", "doc", "minimum"],
  },
  {
    tip_id: "chip-003",
    title: "Segmented Chip Formation",
    description:
      "At high speeds, chips become segmented (saw-tooth) due to adiabatic shear bands. Occurs in low thermal conductivity materials (Ti, Ni alloys) and hardened steel. Reduces average force but increases vibration.",
    category: "chip_formation",
    machine_type: "lathe",
    severity: "info",
    confidence: 0.90,
    source: "Chip formation research",
    tags: ["segmented", "adiabatic", "high_speed"],
  },
  {
    tip_id: "chip-004",
    title: "Long Stringy Chip Hazard",
    description:
      "Long continuous chips are safety hazard (entanglement, cuts). Increase feed for thicker chip that breaks. Use chip breaker insert. Add pecking in deep cuts. Never clear chips by hand while running.",
    category: "chip_formation",
    machine_type: "lathe",
    severity: "critical",
    confidence: 0.98,
    source: "Shop safety standards",
    tags: ["safety", "stringy", "chip_control"],
  },
];

/**
 * Deflection and dynamics tips
 */
export const DYNAMICS_TIPS: TribalTip[] = [
  {
    tip_id: "dynamics-001",
    title: "Tool Deflection Calculation",
    description:
      "Tool deflection δ = F×L³/(3×E×I). For boring bar, L/D > 4 requires reduced parameters. At L/D = 6, deflection is 8× that of L/D = 3. Use carbide bars (E=600 GPa vs 200 for steel).",
    category: "deflection",
    machine_type: "lathe",
    severity: "critical",
    confidence: 0.95,
    source: "Structural mechanics",
    formula: "δ = (F × L³) / (3 × E × I)",
    tags: ["deflection", "boring", "overhang"],
  },
  {
    tip_id: "dynamics-002",
    title: "Chatter Stability",
    description:
      "Regenerative chatter occurs when wave-on-wave cutting reinforces vibration. Critical depth: b_lim = 1/(2×Ks×G). Increase damping, reduce overhang, or change speed to avoid chatter.",
    category: "dynamics",
    machine_type: "lathe",
    severity: "warning",
    confidence: 0.90,
    source: "Tobias chatter theory",
    tags: ["chatter", "vibration", "stability"],
  },
  {
    tip_id: "dynamics-003",
    title: "Thin Wall Deflection",
    description:
      "Thin walls deflect under cutting force, causing taper and chatter. Support with steady rest or internal mandrel. Reduce DOC and feed. Cut in direction that pushes into support.",
    category: "deflection",
    machine_type: "lathe",
    severity: "critical",
    confidence: 0.95,
    source: "Thin wall machining guides",
    tags: ["thin_wall", "support", "taper"],
  },
];

/**
 * Get all physics/science tips
 */
export function getAllScienceTips(): TribalTip[] {
  return [
    ...KIENZLE_TIPS,
    ...TAYLOR_TIPS,
    ...THERMAL_TIPS,
    ...METALLURGY_TIPS,
    ...CHEMISTRY_TIPS,
    ...CHIP_PHYSICS_TIPS,
    ...DYNAMICS_TIPS,
  ];
}

/**
 * Get tips by science domain
 */
export function getTipsByDomain(domain: string): TribalTip[] {
  const domainMap: Record<string, TribalTip[]> = {
    kienzle: KIENZLE_TIPS,
    taylor: TAYLOR_TIPS,
    thermal: THERMAL_TIPS,
    metallurgy: METALLURGY_TIPS,
    chemistry: CHEMISTRY_TIPS,
    chip: CHIP_PHYSICS_TIPS,
    dynamics: DYNAMICS_TIPS,
  };
  return domainMap[domain.toLowerCase()] || [];
}

/**
 * Search tips by formula or physics concept
 */
export function searchPhysicsTips(query: string): TribalTip[] {
  const q = query.toLowerCase();
  return getAllScienceTips().filter(
    (tip) =>
      tip.title.toLowerCase().includes(q) ||
      tip.description.toLowerCase().includes(q) ||
      tip.tags?.some((t) => t.toLowerCase().includes(q)) ||
      tip.formula?.toLowerCase().includes(q)
  );
}

export default {
  KIENZLE_TIPS,
  TAYLOR_TIPS,
  THERMAL_TIPS,
  METALLURGY_TIPS,
  CHEMISTRY_TIPS,
  CHIP_PHYSICS_TIPS,
  DYNAMICS_TIPS,
  getAllScienceTips,
  getTipsByDomain,
  searchPhysicsTips,
};
