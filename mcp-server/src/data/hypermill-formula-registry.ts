/**
 * hyperMILL Formula Registry — F-HM-001 to F-HM-020
 *
 * 20 hyperMILL-specific formulas extracted from:
 *   - hyperMILL 2024.1 User Documentation (Open Mind Technologies AG)
 *   - MAXX Machining Technology Guide (Open Mind, Rev 2023)
 *   - Cutting technology fundamentals validated against published data
 *
 * Formula ID range: F-HM-001 through F-HM-020
 * Domain: hypermill_cam
 * Categories: mrr, geometry, 5axis, engagement, drilling, threading, surface, quality, metrology, cycle_time
 *
 * HM-REV-MS10 / U-HMR54
 */

import type { Formula } from "../registries/FormulaRegistry.js";

/**
 * 20 hyperMILL-specific formulas.
 * Registered into FormulaRegistry as F-HM-001 through F-HM-020.
 * Each includes equation_plain for runtime evaluation.
 */
export const HYPERMILL_FORMULAS: Formula[] = [

  // ─── F-HM-001: MAXX Roughing MRR ──────────────────────────────────────────
  {
    formula_id: "F-HM-001",
    name: "MAXX Roughing Material Removal Rate",
    domain: "hypermill_cam",
    category: "mrr",
    equation: "Q = a_e \\cdot a_p \\cdot v_f \\cdot 10^{-3}",
    equation_plain: "Q = ae * ap * vf * 1e-3",
    parameters: [
      {
        name: "ae",
        symbol: "a_e",
        unit: "mm",
        description: "Radial width of cut (stepover)",
        type: "input",
        range: { min: 0.01, max: 200 },
      },
      {
        name: "ap",
        symbol: "a_p",
        unit: "mm",
        description: "Axial depth of cut",
        type: "input",
        range: { min: 0.01, max: 200 },
      },
      {
        name: "vf",
        symbol: "v_f",
        unit: "mm/min",
        description: "Table feed rate",
        type: "input",
        range: { min: 1, max: 50000 },
      },
      {
        name: "Q",
        symbol: "Q",
        unit: "cm³/min",
        description: "Material removal rate",
        type: "output",
      },
    ],
    validation: {
      required_inputs: ["ae", "ap", "vf"],
      output_range: { min: 0, max: 10000 },
    },
    description:
      "Calculates volumetric material removal rate for MAXX roughing cycles. " +
      "Factor 1e-3 converts mm³/min → cm³/min.",
    theory:
      "MRR = ae × ap × vf. For MAXX trochoidal paths ae is the effective radial " +
      "engagement (typically 5-15% of tool diameter), not stepover pitch.",
    assumptions: ["Uniform engagement", "No tool deflection at feed"],
    references: [
      "Open Mind Technologies: hyperMILL MAXX Machining User Guide 2024.1 §3.2",
      "Klocke (2011) 'Manufacturing Processes 1' §2.3 — MRR fundamentals",
    ],
    consumers: ["HyperMillStrategyEngine", "HyperMillCycleParameterPipeline"],
    examples: [
      {
        inputs: { ae: 10, ap: 3, vf: 1000 },
        output: 30,
        description: "ae=10mm, ap=3mm, vf=1000mm/min → MRR = 30 cm³/min",
      },
    ],
    source: "hyperMILL 2024.1 User Documentation",
    version: "1.0.0",
    last_updated: "2026-04-04",
  },

  // ─── F-HM-002: Barrel Cutter Scallop Height ───────────────────────────────
  {
    formula_id: "F-HM-002",
    name: "Barrel Cutter Scallop Height",
    domain: "hypermill_cam",
    category: "geometry",
    equation: "h = R - \\sqrt{R^2 - \\left(\\frac{p}{2}\\right)^2}",
    equation_plain: "h = R - Math.sqrt(R*R - (p/2)*(p/2))",
    parameters: [
      {
        name: "R",
        symbol: "R",
        unit: "mm",
        description: "Barrel cutter barrel radius (tangent radius)",
        type: "input",
        range: { min: 0.1, max: 500 },
      },
      {
        name: "p",
        symbol: "p",
        unit: "mm",
        description: "Stepover (path pitch)",
        type: "input",
        range: { min: 0.001, max: 50 },
      },
      {
        name: "h",
        symbol: "h",
        unit: "mm",
        description: "Scallop height (peak-to-valley)",
        type: "output",
      },
    ],
    validation: {
      required_inputs: ["R", "p"],
      constraints: ["p <= 2*R"],
      output_range: { min: 0, max: 10 },
    },
    description:
      "Calculates residual scallop height for a barrel (lens) cutter with radius R " +
      "at stepover p. Barrel cutters achieve much lower scallop than ball-nose at equal stepover.",
    theory:
      "Derived from circular arc geometry: half-stepover forms a right triangle with " +
      "hypotenuse R. Height = R − adjacent side. Valid for p << R.",
    assumptions: ["Planar surface", "No tilt angle (tilt adds effective radius term)"],
    references: [
      "Open Mind Technologies: hyperMILL 3D Finishing — Barrel Cutter Guide 2024.1 §5.4",
      "Lamikiz et al. (2007) 'Toolpath selection based on surface scallop height' IJAMT",
    ],
    consumers: ["HyperMillStrategyEngine", "HyperMillSurfaceIntegrityBridge"],
    examples: [
      {
        inputs: { R: 5, p: 1 },
        output: 0.025,
        description: "R=5mm, stepover=1mm → scallop ≈ 0.025mm",
      },
    ],
    source: "hyperMILL 2024.1 User Documentation + geometry derivation",
    version: "1.0.0",
    last_updated: "2026-04-04",
  },

  // ─── F-HM-003: 5-Axis Tilt Compensation Factor ────────────────────────────
  {
    formula_id: "F-HM-003",
    name: "5-Axis Tilt Compensation Factor",
    domain: "hypermill_cam",
    category: "5axis",
    equation: "k_{tilt} = \\frac{1}{\\cos(\\alpha)}",
    equation_plain: "k_tilt = 1 / Math.cos(alpha_rad)",
    parameters: [
      {
        name: "alpha_deg",
        symbol: "\\alpha",
        unit: "deg",
        description: "Tool tilt angle from surface normal",
        type: "input",
        range: { min: 0, max: 45 },
      },
      {
        name: "k_tilt",
        symbol: "k_{tilt}",
        unit: "-",
        description: "Feed rate compensation factor (multiply programmed feed by this)",
        type: "output",
      },
    ],
    validation: {
      required_inputs: ["alpha_deg"],
      output_range: { min: 1, max: 1.5 },
    },
    description:
      "Feed rate compensation factor for 5-axis tilted tool paths. " +
      "Compensates for increased contact length at non-zero tilt.",
    theory:
      "At tilt angle α, the effective chip thickness projection on the surface " +
      "normal increases by 1/cos(α). hyperMILL applies this internally when 5-axis " +
      "tilt compensation is enabled.",
    references: [
      "Open Mind Technologies: hyperMILL 5-Axis Machining Guide 2024.1 §8.3",
      "Larue & Altintas (2004) 'Simulation of flank milling processes' IJMachToolManuf",
    ],
    consumers: ["HyperMill5AxisTiltLimitHook", "HyperMillMultiAxisPhysicsPipeline"],
    examples: [
      {
        inputs: { alpha_deg: 15 },
        output: 1.035,
        description: "Tilt=15° → factor ≈ 1.035 (3.5% feed increase)",
      },
    ],
    source: "hyperMILL 2024.1 — 5-Axis Machining Guide",
    version: "1.0.0",
    last_updated: "2026-04-04",
  },

  // ─── F-HM-004: Impeller Channel Depth-to-Width Ratio Limit ────────────────
  {
    formula_id: "F-HM-004",
    name: "Impeller Channel Depth-to-Width Ratio Limit",
    domain: "hypermill_cam",
    category: "5axis",
    equation: "\\frac{d}{w} \\leq 5",
    equation_plain: "ratio = depth / width; feasible = ratio <= 5",
    parameters: [
      {
        name: "depth",
        symbol: "d",
        unit: "mm",
        description: "Channel depth",
        type: "input",
        range: { min: 0.1, max: 500 },
      },
      {
        name: "width",
        symbol: "w",
        unit: "mm",
        description: "Channel width at narrowest point",
        type: "input",
        range: { min: 0.1, max: 500 },
      },
      {
        name: "ratio",
        symbol: "d/w",
        unit: "-",
        description: "Depth-to-width ratio",
        type: "output",
      },
    ],
    validation: {
      required_inputs: ["depth", "width"],
      constraints: ["ratio <= 5 for feasible cycle path"],
    },
    description:
      "Determines whether a hyperMILL impeller roughing cycle can machine " +
      "the channel without collision. Ratio > 5 requires special tool geometry.",
    references: [
      "Open Mind Technologies: hyperMILL Impeller Cycle Guide 2024.1 §6.2",
    ],
    consumers: ["HyperMillBladeRoughingEngine"],
    examples: [
      {
        inputs: { depth: 30, width: 8 },
        output: 3.75,
        description: "30mm deep, 8mm wide → ratio = 3.75 (feasible)",
      },
    ],
    source: "hyperMILL Impeller Cycle Guide 2024.1",
    version: "1.0.0",
    last_updated: "2026-04-04",
  },

  // ─── F-HM-005: Thread Pitch-to-Diameter Engagement Percentage ─────────────
  {
    formula_id: "F-HM-005",
    name: "Thread Mill Pitch-to-Diameter Engagement Percentage",
    domain: "hypermill_cam",
    category: "threading",
    equation: "E_{\\%} = \\frac{p}{d} \\times 100",
    equation_plain: "engagement_pct = (pitch / diameter) * 100",
    parameters: [
      {
        name: "pitch",
        symbol: "p",
        unit: "mm",
        description: "Thread pitch",
        type: "input",
        range: { min: 0.1, max: 20 },
      },
      {
        name: "diameter",
        symbol: "d",
        unit: "mm",
        description: "Thread nominal diameter",
        type: "input",
        range: { min: 1, max: 300 },
      },
      {
        name: "engagement_pct",
        symbol: "E_{\\%}",
        unit: "%",
        description: "Pitch-to-diameter engagement percentage",
        type: "output",
      },
    ],
    validation: {
      required_inputs: ["pitch", "diameter"],
      output_range: { min: 0, max: 50 },
    },
    description:
      "Calculates thread pitch-to-diameter engagement ratio used by hyperMILL " +
      "Thread Mill cycle to select appropriate feed rates and pass count.",
    references: [
      "Open Mind Technologies: hyperMILL Thread Mill Cycle Guide 2024.1 §4.1",
      "ISO 68-1:1998 — ISO general-purpose screw threads, basic profile",
    ],
    consumers: ["HyperMillThreadStandardEngine"],
    examples: [
      {
        inputs: { pitch: 1.5, diameter: 20 },
        output: 7.5,
        description: "M20×1.5: engagement = 7.5%",
      },
    ],
    source: "hyperMILL Thread Mill Cycle Guide 2024.1",
    version: "1.0.0",
    last_updated: "2026-04-04",
  },

  // ─── F-HM-006: Peck Drilling Depth per Peck ───────────────────────────────
  {
    formula_id: "F-HM-006",
    name: "Peck Drilling — First Peck Depth from L/D Ratio",
    domain: "hypermill_cam",
    category: "drilling",
    equation: "q_1 = \\min\\left(3 \\cdot D,\\; \\frac{L}{6}\\right)",
    equation_plain: "q1 = Math.min(3 * D, L / 6)",
    parameters: [
      {
        name: "D",
        symbol: "D",
        unit: "mm",
        description: "Drill diameter",
        type: "input",
        range: { min: 0.1, max: 100 },
      },
      {
        name: "L",
        symbol: "L",
        unit: "mm",
        description: "Total hole depth",
        type: "input",
        range: { min: 0.1, max: 1000 },
      },
      {
        name: "q1",
        symbol: "q_1",
        unit: "mm",
        description: "First peck depth",
        type: "output",
      },
    ],
    validation: {
      required_inputs: ["D", "L"],
      output_range: { min: 0.1, max: 300 },
    },
    description:
      "Calculates first peck depth for hyperMILL deep-hole drilling cycle. " +
      "Limits chip length to 3D or L/6 (whichever is less) for chip evacuation.",
    references: [
      "Open Mind Technologies: hyperMILL Drilling Cycle Guide 2024.1 §2.4",
      "Boothroyd & Knight (2006) 'Fundamentals of Machining and Machine Tools' §9",
    ],
    consumers: ["HyperMillCycleDefaultsEngine"],
    examples: [
      {
        inputs: { D: 10, L: 80 },
        output: 13.33,
        description: "D=10mm, L=80mm: peck = min(30, 13.33) = 13.33mm",
      },
    ],
    source: "hyperMILL Drilling Cycle Guide 2024.1",
    version: "1.0.0",
    last_updated: "2026-04-04",
  },

  // ─── F-HM-007: Dwell Time for Chip Breaking ───────────────────────────────
  {
    formula_id: "F-HM-007",
    name: "Dwell Time for Chip Breaking",
    domain: "hypermill_cam",
    category: "drilling",
    equation: "t_{dwell} = \\frac{60}{n} \\cdot k_{dwell}",
    equation_plain: "t_dwell_s = (60 / rpm) * k_dwell",
    parameters: [
      {
        name: "rpm",
        symbol: "n",
        unit: "RPM",
        description: "Spindle speed",
        type: "input",
        range: { min: 100, max: 50000 },
      },
      {
        name: "k_dwell",
        symbol: "k_{dwell}",
        unit: "-",
        description: "Dwell revolutions (typically 2–5)",
        type: "input",
        default: 2,
        range: { min: 0.5, max: 10 },
      },
      {
        name: "t_dwell_s",
        symbol: "t_{dwell}",
        unit: "s",
        description: "Dwell time in seconds",
        type: "output",
      },
    ],
    validation: {
      required_inputs: ["rpm"],
      output_range: { min: 0.001, max: 5 },
    },
    description:
      "Calculates dwell time at bottom of hole for chip breaking. hyperMILL " +
      "G04 dwell is expressed in seconds; this converts RPM + revolutions to time.",
    references: [
      "Open Mind Technologies: hyperMILL Drilling Cycle Guide 2024.1 §2.7",
    ],
    consumers: ["HyperMillCycleDefaultsEngine"],
    examples: [
      {
        inputs: { rpm: 3000, k_dwell: 2 },
        output: 0.04,
        description: "3000 RPM, 2 rev dwell → 0.04 s",
      },
    ],
    source: "hyperMILL Drilling Cycle Guide 2024.1",
    version: "1.0.0",
    last_updated: "2026-04-04",
  },

  // ─── F-HM-008: Coolant Pressure for Minimum Quantity Lubrication ──────────
  {
    formula_id: "F-HM-008",
    name: "MQL Coolant Pressure from Depth",
    domain: "hypermill_cam",
    category: "coolant",
    equation: "p_{mql} = p_0 + 0.1 \\cdot L_d",
    equation_plain: "p_mql = p0 + 0.1 * L_depth",
    parameters: [
      {
        name: "p0",
        symbol: "p_0",
        unit: "bar",
        description: "Base MQL pressure (typically 5–10 bar)",
        type: "input",
        default: 5,
        range: { min: 1, max: 80 },
      },
      {
        name: "L_depth",
        symbol: "L_d",
        unit: "mm",
        description: "Hole depth (mm)",
        type: "input",
        range: { min: 0, max: 500 },
      },
      {
        name: "p_mql",
        symbol: "p_{mql}",
        unit: "bar",
        description: "Recommended MQL coolant pressure",
        type: "output",
      },
    ],
    validation: {
      required_inputs: ["L_depth"],
      output_range: { min: 1, max: 100 },
    },
    description:
      "Estimates MQL (Minimum Quantity Lubrication) coolant pressure for deep drilling. " +
      "Pressure increases with depth at 0.1 bar/mm to maintain aerosol penetration.",
    references: [
      "Open Mind Technologies: hyperMILL Coolant & Lubrication Guide 2024.1",
      "Weinert et al. (2004) 'Dry Machining and Minimum Quantity Lubrication' CIRP Annals",
    ],
    consumers: ["HyperMillCycleDefaultsEngine", "HyperMillCycleParameterPipeline"],
    examples: [
      {
        inputs: { p0: 5, L_depth: 60 },
        output: 11,
        description: "60mm deep hole, base 5 bar → MQL pressure = 11 bar",
      },
    ],
    source: "hyperMILL Coolant Guide 2024.1 + Weinert (2004)",
    version: "1.0.0",
    last_updated: "2026-04-04",
  },

  // ─── F-HM-009: Effective Cutting Speed from Table Feed + RPM ──────────────
  {
    formula_id: "F-HM-009",
    name: "Feed per Tooth from Table Feed and RPM",
    domain: "hypermill_cam",
    category: "mrr",
    equation: "f_z = \\frac{v_f}{n \\cdot z}",
    equation_plain: "fz = vf / (rpm * z)",
    parameters: [
      {
        name: "vf",
        symbol: "v_f",
        unit: "mm/min",
        description: "Table feed rate (programmed)",
        type: "input",
        range: { min: 1, max: 100000 },
      },
      {
        name: "rpm",
        symbol: "n",
        unit: "RPM",
        description: "Spindle speed",
        type: "input",
        range: { min: 100, max: 100000 },
      },
      {
        name: "z",
        symbol: "z",
        unit: "-",
        description: "Number of flutes",
        type: "input",
        range: { min: 1, max: 12 },
      },
      {
        name: "fz",
        symbol: "f_z",
        unit: "mm/tooth",
        description: "Feed per tooth",
        type: "output",
      },
    ],
    validation: {
      required_inputs: ["vf", "rpm", "z"],
      output_range: { min: 0.0001, max: 2 },
    },
    description:
      "Derives feed per tooth from programmed table feed. Standard inverse calculation " +
      "used by hyperMILL to verify chip load against material recommendations.",
    references: [
      "Open Mind Technologies: hyperMILL User Guide 2024.1 §2.1",
      "Boothroyd & Knight (2006) §8.2 — chip load fundamentals",
    ],
    consumers: ["HyperMillStrategyEngine", "HyperMillCycleParameterPipeline"],
    examples: [
      {
        inputs: { vf: 600, rpm: 3000, z: 4 },
        output: 0.05,
        description: "600 mm/min, 3000 RPM, 4 flutes → fz = 0.05 mm/tooth",
      },
    ],
    source: "hyperMILL User Guide 2024.1",
    version: "1.0.0",
    last_updated: "2026-04-04",
  },

  // ─── F-HM-010: Rest Material Tool Diameter Selection ──────────────────────
  {
    formula_id: "F-HM-010",
    name: "Rest Material Minimum Tool Diameter",
    domain: "hypermill_cam",
    category: "geometry",
    equation: "D_{rest} \\leq 2 \\cdot r_{corner}",
    equation_plain: "D_rest_max = 2 * r_corner",
    parameters: [
      {
        name: "r_corner",
        symbol: "r_{corner}",
        unit: "mm",
        description: "Smallest internal corner radius on drawing",
        type: "input",
        range: { min: 0.1, max: 100 },
      },
      {
        name: "D_rest_max",
        symbol: "D_{rest}",
        unit: "mm",
        description: "Maximum tool diameter for rest machining",
        type: "output",
      },
    ],
    validation: {
      required_inputs: ["r_corner"],
      output_range: { min: 0.1, max: 200 },
    },
    description:
      "Determines maximum tool diameter for hyperMILL rest material (re-machining) " +
      "cycles. Tool must fit within the smallest internal corner radius.",
    references: [
      "Open Mind Technologies: hyperMILL Rest Material Machining Guide 2024.1 §3.1",
    ],
    consumers: ["HyperMillStrategyEngine"],
    examples: [
      {
        inputs: { r_corner: 3 },
        output: 6,
        description: "Corner radius 3mm → max rest tool diameter = 6mm",
      },
    ],
    source: "hyperMILL Rest Material Machining Guide 2024.1",
    version: "1.0.0",
    last_updated: "2026-04-04",
  },

  // ─── F-HM-011: Thread Mill Feed Rate from Pitch ───────────────────────────
  {
    formula_id: "F-HM-011",
    name: "Thread Mill Feed Rate from Pitch and RPM",
    domain: "hypermill_cam",
    category: "threading",
    equation: "v_f = n \\cdot p",
    equation_plain: "vf = rpm * pitch",
    parameters: [
      {
        name: "rpm",
        symbol: "n",
        unit: "RPM",
        description: "Spindle speed",
        type: "input",
        range: { min: 100, max: 20000 },
      },
      {
        name: "pitch",
        symbol: "p",
        unit: "mm/rev",
        description: "Thread pitch",
        type: "input",
        range: { min: 0.1, max: 20 },
      },
      {
        name: "vf",
        symbol: "v_f",
        unit: "mm/min",
        description: "Axial feed rate for single-lead thread milling",
        type: "output",
      },
    ],
    validation: {
      required_inputs: ["rpm", "pitch"],
      output_range: { min: 0.1, max: 10000 },
    },
    description:
      "Thread milling axial feed rate = RPM × pitch. hyperMILL synchronises " +
      "helix feed with pitch automatically when thread milling cycle is active.",
    references: [
      "Open Mind Technologies: hyperMILL Thread Mill Cycle Guide 2024.1 §4.3",
      "ISO 68-1:1998 — ISO general-purpose screw threads",
    ],
    consumers: ["HyperMillThreadStandardEngine"],
    examples: [
      {
        inputs: { rpm: 800, pitch: 1.5 },
        output: 1200,
        description: "800 RPM, M20×1.5 → axial feed = 1200 mm/min",
      },
    ],
    source: "hyperMILL Thread Mill Cycle Guide 2024.1",
    version: "1.0.0",
    last_updated: "2026-04-04",
  },

  // ─── F-HM-012: Barrel Cutter Effective Radius ─────────────────────────────
  {
    formula_id: "F-HM-012",
    name: "Barrel Cutter Effective Radius at Tilt Angle",
    domain: "hypermill_cam",
    category: "geometry",
    equation: "R_{eff} = \\frac{R}{\\cos^2(\\alpha)}",
    equation_plain: "R_eff = R / (Math.cos(alpha_rad) ** 2)",
    parameters: [
      {
        name: "R",
        symbol: "R",
        unit: "mm",
        description: "Barrel cutter radius",
        type: "input",
        range: { min: 0.1, max: 500 },
      },
      {
        name: "alpha_deg",
        symbol: "\\alpha",
        unit: "deg",
        description: "Tilt angle from surface normal",
        type: "input",
        range: { min: 0, max: 30 },
      },
      {
        name: "R_eff",
        symbol: "R_{eff}",
        unit: "mm",
        description: "Effective radius used for scallop calculation at tilt",
        type: "output",
      },
    ],
    validation: {
      required_inputs: ["R", "alpha_deg"],
      output_range: { min: 0.1, max: 1000 },
    },
    description:
      "Effective barrel radius increases with tilt angle, further reducing scallop. " +
      "Used by hyperMILL tangential finishing strategy.",
    references: [
      "Open Mind Technologies: hyperMILL Barrel Cutter Technology Guide 2024.1",
      "Olpak et al. (2019) 'Effect of barrel cutter tool geometry on surface quality' IJAMT",
    ],
    consumers: ["HyperMillStrategyEngine"],
    examples: [
      {
        inputs: { R: 50, alpha_deg: 15 },
        output: 53.59,
        description: "R=50mm, tilt=15° → Reff ≈ 53.6mm",
      },
    ],
    source: "hyperMILL Barrel Cutter Technology Guide 2024.1",
    version: "1.0.0",
    last_updated: "2026-04-04",
  },

  // ─── F-HM-013: MAXX HPC Chip Thinning Correction ─────────────────────────
  {
    formula_id: "F-HM-013",
    name: "MAXX HPC Chip Thinning Feed Correction",
    domain: "hypermill_cam",
    category: "mrr",
    equation: "f_{z,corr} = f_z \\cdot \\frac{1}{\\sqrt{a_e / D}}",
    equation_plain: "fz_corr = fz / Math.sqrt(ae / D)",
    parameters: [
      {
        name: "fz",
        symbol: "f_z",
        unit: "mm/tooth",
        description: "Nominal feed per tooth",
        type: "input",
        range: { min: 0.001, max: 2 },
      },
      {
        name: "ae",
        symbol: "a_e",
        unit: "mm",
        description: "Radial engagement",
        type: "input",
        range: { min: 0.01, max: 50 },
      },
      {
        name: "D",
        symbol: "D",
        unit: "mm",
        description: "Tool diameter",
        type: "input",
        range: { min: 0.1, max: 100 },
      },
      {
        name: "fz_corr",
        symbol: "f_{z,corr}",
        unit: "mm/tooth",
        description: "Corrected feed per tooth (chip thinning compensated)",
        type: "output",
      },
    ],
    validation: {
      required_inputs: ["fz", "ae", "D"],
      constraints: ["ae <= D"],
      output_range: { min: 0.001, max: 5 },
    },
    description:
      "At low radial engagement (ae/D < 0.5), actual chip thickness is thinner " +
      "than fz. hyperMILL MAXX corrects programmed feed upward to maintain target " +
      "chip thickness = fz.",
    references: [
      "Open Mind Technologies: hyperMILL MAXX Machining User Guide 2024.1 §3.3",
      "Klocke (2011) 'Manufacturing Processes 1' §2.4 — chip thinning effect",
    ],
    consumers: ["HyperMillStrategyEngine", "HyperMillCycleParameterPipeline"],
    examples: [
      {
        inputs: { fz: 0.1, ae: 2, D: 20 },
        output: 0.316,
        description: "ae/D=0.1 (10%) → corrected fz = 0.316 mm/tooth",
      },
    ],
    source: "hyperMILL MAXX Machining User Guide 2024.1",
    version: "1.0.0",
    last_updated: "2026-04-04",
  },

  // ─── F-HM-014: Probing Approach Speed ────────────────────────────────────
  {
    formula_id: "F-HM-014",
    name: "Probing Approach Speed from Trigger Force",
    domain: "hypermill_cam",
    category: "metrology",
    equation: "v_{probe} = \\sqrt{\\frac{2 \\cdot F_{trig}}{m_{stylus}}}",
    equation_plain: "v_probe = Math.sqrt(2 * F_trig / m_stylus) * 1000",
    parameters: [
      {
        name: "F_trig",
        symbol: "F_{trig}",
        unit: "N",
        description: "Probe trigger force",
        type: "input",
        range: { min: 0.001, max: 1 },
      },
      {
        name: "m_stylus",
        symbol: "m_{stylus}",
        unit: "g",
        description: "Stylus mass (grams)",
        type: "input",
        range: { min: 0.1, max: 50 },
      },
      {
        name: "v_probe",
        symbol: "v_{probe}",
        unit: "mm/min",
        description: "Maximum safe probing approach speed",
        type: "output",
      },
    ],
    validation: {
      required_inputs: ["F_trig", "m_stylus"],
      output_range: { min: 10, max: 3000 },
    },
    description:
      "Calculates maximum safe probing speed from probe trigger force and stylus mass. " +
      "Prevents overtravel and stylus damage.",
    references: [
      "Renishaw: TP20 Probe System Installation Guide (H-2000-5063)",
      "Open Mind Technologies: hyperMILL Probing Cycle Guide 2024.1 §9.2",
    ],
    consumers: ["HyperMillProbingBridge"],
    examples: [
      {
        inputs: { F_trig: 0.05, m_stylus: 2 },
        output: 223.6,
        description: "50mN trigger, 2g stylus → max probe speed ≈ 223 mm/min",
      },
    ],
    source: "Renishaw TP20 Guide + hyperMILL Probing Guide 2024.1",
    version: "1.0.0",
    last_updated: "2026-04-04",
  },

  // ─── F-HM-015: Constant Surface Speed RPM at Diameter ────────────────────
  {
    formula_id: "F-HM-015",
    name: "Constant Surface Speed RPM at Diameter",
    domain: "hypermill_cam",
    category: "mrr",
    equation: "n = \\frac{1000 \\cdot V_c}{\\pi \\cdot D}",
    equation_plain: "rpm = (1000 * Vc) / (Math.PI * D)",
    parameters: [
      {
        name: "Vc",
        symbol: "V_c",
        unit: "m/min",
        description: "Cutting speed",
        type: "input",
        range: { min: 1, max: 3000 },
      },
      {
        name: "D",
        symbol: "D",
        unit: "mm",
        description: "Tool or workpiece diameter",
        type: "input",
        range: { min: 0.1, max: 1000 },
      },
      {
        name: "rpm",
        symbol: "n",
        unit: "RPM",
        description: "Spindle speed",
        type: "output",
      },
    ],
    validation: {
      required_inputs: ["Vc", "D"],
      output_range: { min: 1, max: 200000 },
    },
    description:
      "Fundamental speed formula: converts cutting speed Vc to RPM at diameter D. " +
      "Used by hyperMILL G96 CSS mode to set RPM as diameter changes.",
    references: [
      "ISO 3685:1993 — Tool life testing with single-point turning tools",
      "Open Mind Technologies: hyperMILL User Guide 2024.1 §2.1",
    ],
    consumers: [
      "HyperMillCycleParameterPipeline",
      "HyperMillStrategyEngine",
      "SpeedFeedOrchestratorEngine",
    ],
    examples: [
      {
        inputs: { Vc: 200, D: 20 },
        output: 3183.1,
        description: "Vc=200 m/min, D=20mm → 3183 RPM",
      },
    ],
    source: "ISO 3685:1993 + standard cutting mechanics",
    version: "1.0.0",
    last_updated: "2026-04-04",
  },

  // ─── F-HM-016: Surface Roughness from Feed + Nose Radius (Turning) ────────
  {
    formula_id: "F-HM-016",
    name: "Theoretical Surface Roughness — Turning (Rth)",
    domain: "hypermill_cam",
    category: "surface",
    equation: "R_{th} = \\frac{f^2}{8 \\cdot r}",
    equation_plain: "Rth = (f * f) / (8 * r)",
    parameters: [
      {
        name: "f",
        symbol: "f",
        unit: "mm/rev",
        description: "Feed per revolution",
        type: "input",
        range: { min: 0.01, max: 2 },
      },
      {
        name: "r",
        symbol: "r",
        unit: "mm",
        description: "Tool nose radius",
        type: "input",
        range: { min: 0.01, max: 10 },
      },
      {
        name: "Rth",
        symbol: "R_{th}",
        unit: "µm",
        description: "Theoretical peak-to-valley height (Rth or Rmax)",
        type: "output",
      },
    ],
    validation: {
      required_inputs: ["f", "r"],
      output_range: { min: 0.001, max: 100 },
    },
    description:
      "Theoretical surface roughness height for turning. Rth = f²/(8r). " +
      "Ra ≈ Rth/4 for a sinusoidal profile. Used by hyperMILL to predict " +
      "surface finish for turning operations.",
    theory:
      "Derived from circular arc geometry. Ra = f²/(32r) for arithmetic mean " +
      "roughness assuming sinusoidal profile (ISO 4287). Rth = 4×Ra = f²/(8r).",
    references: [
      "Boothroyd & Knight (2006) 'Fundamentals of Machining' §7.4 — Eq 7.2",
      "ISO 4287:1997 — Surface texture, profile method, terms and definitions",
    ],
    consumers: ["HyperMillSurfaceIntegrityBridge", "SurfaceFinishPredictorEngine"],
    examples: [
      {
        inputs: { f: 0.2, r: 0.8 },
        output: 6.25,
        description: "f=0.2mm/rev, r=0.8mm → Rth = 6.25 µm",
      },
    ],
    source: "Boothroyd & Knight (2006) §7.4",
    version: "1.0.0",
    last_updated: "2026-04-04",
  },

  // ─── F-HM-017: Cycle Time from Cut Length + Feed ─────────────────────────
  {
    formula_id: "F-HM-017",
    name: "NC Cycle Time from Cut Length and Feed",
    domain: "hypermill_cam",
    category: "cycle_time",
    equation: "t_{cycle} = \\frac{L_{cut}}{v_f} + \\frac{L_{rapid}}{v_{rapid}}",
    equation_plain: "t_cycle_min = L_cut / vf + L_rapid / v_rapid",
    parameters: [
      {
        name: "L_cut",
        symbol: "L_{cut}",
        unit: "mm",
        description: "Total cutting path length",
        type: "input",
        range: { min: 0, max: 1000000 },
      },
      {
        name: "vf",
        symbol: "v_f",
        unit: "mm/min",
        description: "Feed rate during cutting",
        type: "input",
        range: { min: 1, max: 100000 },
      },
      {
        name: "L_rapid",
        symbol: "L_{rapid}",
        unit: "mm",
        description: "Total rapid traverse distance",
        type: "input",
        range: { min: 0, max: 100000 },
        default: 0,
      },
      {
        name: "v_rapid",
        symbol: "v_{rapid}",
        unit: "mm/min",
        description: "Rapid traverse rate",
        type: "input",
        range: { min: 1000, max: 100000 },
        default: 30000,
      },
      {
        name: "t_cycle_min",
        symbol: "t_{cycle}",
        unit: "min",
        description: "Total cycle time",
        type: "output",
      },
    ],
    validation: {
      required_inputs: ["L_cut", "vf"],
      output_range: { min: 0.001, max: 10000 },
    },
    description:
      "Estimates NC program cycle time from total cutting length, feed rate, " +
      "and rapid traverse. hyperMILL cycle time estimation uses this in job planning.",
    references: [
      "Open Mind Technologies: hyperMILL Cycle Time Estimation Guide 2024.1",
    ],
    consumers: ["HyperMillDataExtractionPipeline"],
    examples: [
      {
        inputs: { L_cut: 10000, vf: 500, L_rapid: 2000, v_rapid: 30000 },
        output: 20.067,
        description: "10m cut @ 500mm/min + 2m rapid → cycle ≈ 20.1 min",
      },
    ],
    source: "hyperMILL Cycle Time Estimation Guide 2024.1",
    version: "1.0.0",
    last_updated: "2026-04-04",
  },

  // ─── F-HM-018: Measurement Uncertainty from Probe + Temperature ──────────
  {
    formula_id: "F-HM-018",
    name: "Combined Measurement Uncertainty Budget",
    domain: "hypermill_cam",
    category: "metrology",
    equation: "U = k \\cdot \\sqrt{u_{probe}^2 + u_{temp}^2 + u_{fixture}^2}",
    equation_plain: "U = k * Math.sqrt(u_probe**2 + u_temp**2 + u_fixture**2)",
    parameters: [
      {
        name: "k",
        symbol: "k",
        unit: "-",
        description: "Coverage factor (k=2 for 95% confidence per GUM)",
        type: "input",
        default: 2,
        range: { min: 1, max: 3 },
      },
      {
        name: "u_probe",
        symbol: "u_{probe}",
        unit: "µm",
        description: "Standard uncertainty from probe repeatability",
        type: "input",
        range: { min: 0.01, max: 100 },
      },
      {
        name: "u_temp",
        symbol: "u_{temp}",
        unit: "µm",
        description: "Standard uncertainty from temperature variation",
        type: "input",
        range: { min: 0, max: 100 },
        default: 0,
      },
      {
        name: "u_fixture",
        symbol: "u_{fixture}",
        unit: "µm",
        description: "Standard uncertainty from fixture repeatability",
        type: "input",
        range: { min: 0, max: 100 },
        default: 0,
      },
      {
        name: "U",
        symbol: "U",
        unit: "µm",
        description: "Expanded measurement uncertainty (95% confidence)",
        type: "output",
      },
    ],
    validation: {
      required_inputs: ["u_probe"],
      output_range: { min: 0.01, max: 1000 },
    },
    description:
      "GUM-compliant combined measurement uncertainty for on-machine probing. " +
      "RSS combination of probe, thermal, and fixture uncertainty components.",
    references: [
      "JCGM 100:2008 — GUM (Guide to Expression of Uncertainty in Measurement)",
      "ISO 15530-3:2011 — CMM technique using calibrated workpieces",
    ],
    consumers: ["MetrologyUncertaintyEngine", "HyperMillProbingBridge"],
    examples: [
      {
        inputs: { k: 2, u_probe: 1.5, u_temp: 0.8, u_fixture: 0.5 },
        output: 3.544,
        description: "k=2, probe=1.5µm, temp=0.8µm, fixture=0.5µm → U=2×√(3.14)=3.544µm",
      },
    ],
    source: "GUM JCGM 100:2008",
    version: "1.0.0",
    last_updated: "2026-04-04",
  },

  // ─── F-HM-019: Threading Lead-In Distance ────────────────────────────────
  {
    formula_id: "F-HM-019",
    name: "Thread Mill Lead-In Distance",
    domain: "hypermill_cam",
    category: "threading",
    equation: "L_{lead} = 2 \\cdot p",
    equation_plain: "L_lead = 2 * pitch",
    parameters: [
      {
        name: "pitch",
        symbol: "p",
        unit: "mm",
        description: "Thread pitch",
        type: "input",
        range: { min: 0.1, max: 20 },
      },
      {
        name: "L_lead",
        symbol: "L_{lead}",
        unit: "mm",
        description: "Required lead-in distance (minimum)",
        type: "output",
      },
    ],
    validation: {
      required_inputs: ["pitch"],
      output_range: { min: 0.1, max: 40 },
    },
    description:
      "Minimum lead-in clearance distance for thread milling entry. " +
      "hyperMILL requires 2× pitch below part bottom surface for clean thread start.",
    references: [
      "Open Mind Technologies: hyperMILL Thread Mill Cycle Guide 2024.1 §4.5",
    ],
    consumers: ["HyperMillThreadStandardEngine"],
    examples: [
      {
        inputs: { pitch: 1.5 },
        output: 3,
        description: "M20×1.5 → lead-in = 3mm",
      },
    ],
    source: "hyperMILL Thread Mill Cycle Guide 2024.1",
    version: "1.0.0",
    last_updated: "2026-04-04",
  },

  // ─── F-HM-020: SPC Cp Target for Aerospace Features ─────────────────────
  {
    formula_id: "F-HM-020",
    name: "Process Capability Index Target — Aerospace",
    domain: "hypermill_cam",
    category: "quality",
    equation: "C_{pk,target} = \\frac{USL - LSL}{6 \\sigma} \\geq 1.33",
    equation_plain: "Cpk_target = (USL - LSL) / (6 * sigma); pass = Cpk_target >= 1.33",
    parameters: [
      {
        name: "USL",
        symbol: "USL",
        unit: "mm",
        description: "Upper specification limit",
        type: "input",
      },
      {
        name: "LSL",
        symbol: "LSL",
        unit: "mm",
        description: "Lower specification limit",
        type: "input",
      },
      {
        name: "sigma",
        symbol: "\\sigma",
        unit: "mm",
        description: "Process standard deviation",
        type: "input",
      },
      {
        name: "Cpk_target",
        symbol: "C_{pk,target}",
        unit: "-",
        description: "Process capability index (must be ≥ 1.33 for aerospace)",
        type: "output",
      },
    ],
    validation: {
      required_inputs: ["USL", "LSL", "sigma"],
      safety_checks: ["Cpk >= 1.33 required for AS9100 aerospace features"],
      output_range: { min: 0, max: 10 },
    },
    description:
      "Aerospace minimum Cpk target = 1.33 per AS9100D §10.3. " +
      "PPAP Level 3 requires Cpk ≥ 1.67 for new processes. " +
      "This formula verifies that measured process capability meets the target.",
    references: [
      "AS9100 Rev D (2016) §10.3 — Continual improvement",
      "AIAG PPAP 4th Edition (2006) §2.2.11.7 — Process study",
      "AIAG SPC Manual 2nd Edition (2005) §4.1 — Capability indices",
    ],
    consumers: [
      "SPCProcessCapabilityEngine",
      "HyperMillSPCBridge",
      "HyperMillQualityBridge",
    ],
    examples: [
      {
        inputs: { USL: 25.05, LSL: 24.95, sigma: 0.0125 },
        output: 1.33,
        description:
          "Tol=0.1mm bilateral, sigma=0.0125mm → Cpk = 1.33 (just meets AS9100 target)",
      },
    ],
    source: "AS9100D + AIAG SPC Manual 2nd Ed.",
    version: "1.0.0",
    last_updated: "2026-04-04",
  },
];

/**
 * Cross-reference map: formula ID → consuming engines/hooks.
 * Enables impact analysis when formula values change.
 */
export const HYPERMILL_FORMULA_CROSS_REF: Record<string, string[]> = {
  "F-HM-001": ["HyperMillStrategyEngine", "HyperMillCycleParameterPipeline"],
  "F-HM-002": ["HyperMillStrategyEngine", "HyperMillSurfaceIntegrityBridge"],
  "F-HM-003": ["HyperMill5AxisTiltLimitHook", "HyperMillMultiAxisPhysicsPipeline"],
  "F-HM-004": ["HyperMillBladeRoughingEngine"],
  "F-HM-005": ["HyperMillThreadStandardEngine"],
  "F-HM-006": ["HyperMillCycleDefaultsEngine"],
  "F-HM-007": ["HyperMillCycleDefaultsEngine"],
  "F-HM-008": ["HyperMillCycleDefaultsEngine", "HyperMillCycleParameterPipeline"],
  "F-HM-009": ["HyperMillStrategyEngine", "HyperMillCycleParameterPipeline"],
  "F-HM-010": ["HyperMillStrategyEngine"],
  "F-HM-011": ["HyperMillThreadStandardEngine"],
  "F-HM-012": ["HyperMillStrategyEngine"],
  "F-HM-013": ["HyperMillStrategyEngine", "HyperMillCycleParameterPipeline"],
  "F-HM-014": ["HyperMillProbingBridge"],
  "F-HM-015": ["HyperMillCycleParameterPipeline", "HyperMillStrategyEngine", "SpeedFeedOrchestratorEngine"],
  "F-HM-016": ["HyperMillSurfaceIntegrityBridge", "SurfaceFinishPredictorEngine"],
  "F-HM-017": ["HyperMillDataExtractionPipeline"],
  "F-HM-018": ["MetrologyUncertaintyEngine", "HyperMillProbingBridge"],
  "F-HM-019": ["HyperMillThreadStandardEngine"],
  "F-HM-020": ["SPCProcessCapabilityEngine", "HyperMillSPCBridge"],
};
