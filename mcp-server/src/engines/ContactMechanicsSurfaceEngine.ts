/**
 * ContactMechanicsSurfaceEngine — Hertz Contact + Sub-Surface Integrity Analysis
 *
 * Predicts sub-surface damage from tool-workpiece contact mechanics:
 *   - Hertz contact pressure at tool-workpiece interface
 *   - Sub-surface von Mises stress field (Huber solution)
 *   - Plastic zone depth where σ_VM exceeds yield strength
 *   - White layer risk when cutting temperature exceeds austenite threshold
 *   - Residual stress sign from mechanical (compressive) vs thermal (tensile)
 *
 * References:
 *   - Hertz (1882): Contact mechanics
 *   - Huber (1904): Sub-surface stress in elastic contact
 *   - Johnson (1985): Contact Mechanics, Cambridge University Press
 *   - Chou & Evans (1999): White layer formation in hard turning
 *   - Ulutan & Ozel (2011): Machining-induced surface integrity
 *
 * @module ContactMechanicsSurfaceEngine
 */

// ─── Types ──────────────────────────────────────────────────────────

export interface MaterialProps {
  name: string;
  E_GPa: number;           // Young's modulus
  nu: number;              // Poisson's ratio
  yield_MPa: number;       // Yield strength
  hardness_HRC?: number;   // Hardness (for white layer risk)
  austenite_temp_C?: number; // Austenite transformation temperature
  thermal_conductivity?: number; // W/(m·K)
  specific_heat?: number;  // J/(kg·K)
  density?: number;        // kg/m³
}

export interface ToolGeometry {
  nose_radius_mm: number;
  edge_radius_um?: number;  // hone radius in microns
  clearance_angle_deg: number;
  rake_angle_deg: number;
  E_GPa?: number;          // Tool material modulus (default carbide 600 GPa)
  nu?: number;             // Tool Poisson's ratio (default 0.22)
}

export interface CuttingConditions {
  Vc_m_min: number;        // Cutting speed
  feed_mm_rev: number;     // Feed per revolution
  ap_mm: number;           // Axial depth of cut
  ae_mm?: number;          // Radial depth (for milling)
  coolant?: "flood" | "mql" | "dry" | "cryogenic";
}

export interface HertzContactResult {
  /** Maximum contact pressure (MPa) */
  p_max_MPa: number;
  /** Contact half-width (mm) */
  a_mm: number;
  /** Contact area (mm²) */
  contact_area_mm2: number;
  /** Combined elastic modulus E* (GPa) */
  E_star_GPa: number;
  /** Equivalent radius (mm) */
  R_equivalent_mm: number;
  /** Normal force used (N) */
  normal_force_N: number;
}

export interface SubSurfaceStressResult {
  /** Depth points analyzed (mm) */
  depths_mm: number[];
  /** Von Mises stress at each depth (MPa) */
  sigma_VM_MPa: number[];
  /** Maximum von Mises stress (MPa) */
  max_sigma_VM_MPa: number;
  /** Depth of maximum stress (mm) */
  depth_of_max_mm: number;
  /** Shear stress τ_max at each depth */
  tau_max_MPa: number[];
  /** Hydrostatic pressure at each depth */
  p_hydro_MPa: number[];
}

export interface PlasticZoneResult {
  /** Plastic zone depth (mm) — where σ_VM > yield */
  plastic_depth_mm: number;
  /** Maximum plastic strain estimate */
  max_plastic_strain: number;
  /** Affected volume per unit length (mm²) */
  affected_area_mm2: number;
  /** Safety factor (yield / max_stress) */
  safety_factor: number;
  /** Is the plastic zone significant (depth > 10μm)? */
  significant: boolean;
}

export interface WhiteLayerResult {
  /** Risk level */
  risk: "none" | "low" | "medium" | "high" | "critical";
  /** Estimated interface temperature (°C) */
  interface_temp_C: number;
  /** Austenite transformation temperature (°C) */
  austenite_temp_C: number;
  /** Temperature margin (°C) — negative means exceeded */
  margin_C: number;
  /** Estimated white layer thickness (μm) — 0 if no risk */
  estimated_thickness_um: number;
  /** Recommendations */
  recommendations: string[];
}

export interface ResidualStressResult {
  /** Mechanical component (compressive, negative) */
  mechanical_MPa: number;
  /** Thermal component (tensile, positive) */
  thermal_MPa: number;
  /** Net surface residual stress */
  net_surface_MPa: number;
  /** Stress type */
  type: "compressive" | "tensile" | "neutral";
  /** Depth of stress reversal (mm) — where compressive→tensile */
  reversal_depth_mm: number;
  /** Assessment */
  assessment: string;
}

export interface FullIntegrityResult {
  hertz: HertzContactResult;
  subsurface: SubSurfaceStressResult;
  plastic_zone: PlasticZoneResult;
  white_layer: WhiteLayerResult;
  residual_stress: ResidualStressResult;
  overall_risk: "low" | "medium" | "high" | "critical";
  summary: string;
}

// ─── Material Database ──────────────────────────────────────────────

const MATERIAL_DB: Record<string, MaterialProps> = {
  "steel_1045": { name: "AISI 1045", E_GPa: 205, nu: 0.29, yield_MPa: 530, hardness_HRC: 20, austenite_temp_C: 727, thermal_conductivity: 49.8, specific_heat: 486, density: 7870 },
  "steel_4140": { name: "AISI 4140", E_GPa: 210, nu: 0.29, yield_MPa: 655, hardness_HRC: 28, austenite_temp_C: 727, thermal_conductivity: 42.6, specific_heat: 473, density: 7850 },
  "steel_4340_hardened": { name: "AISI 4340 HRC52", E_GPa: 210, nu: 0.29, yield_MPa: 1620, hardness_HRC: 52, austenite_temp_C: 727, thermal_conductivity: 34.0, specific_heat: 475, density: 7850 },
  "stainless_304": { name: "304 SS", E_GPa: 193, nu: 0.29, yield_MPa: 215, austenite_temp_C: 1400, thermal_conductivity: 16.2, specific_heat: 500, density: 8000 },
  "titanium_6al4v": { name: "Ti-6Al-4V", E_GPa: 114, nu: 0.34, yield_MPa: 880, austenite_temp_C: 995, thermal_conductivity: 6.7, specific_heat: 526, density: 4430 },
  "inconel_718": { name: "Inconel 718", E_GPa: 205, nu: 0.29, yield_MPa: 1035, austenite_temp_C: 1200, thermal_conductivity: 11.4, specific_heat: 435, density: 8190 },
  "aluminum_7075": { name: "Al 7075-T6", E_GPa: 71.7, nu: 0.33, yield_MPa: 503, thermal_conductivity: 130, specific_heat: 960, density: 2810 },
  "cast_iron_gray": { name: "Gray Cast Iron", E_GPa: 110, nu: 0.26, yield_MPa: 240, thermal_conductivity: 46, specific_heat: 490, density: 7200 },
};

// ─── Engine ─────────────────────────────────────────────────────────

export class ContactMechanicsSurfaceEngine {

  /**
   * Compute Hertz contact parameters for tool-workpiece interface.
   * Models the tool nose as a cylinder contacting a flat surface.
   *
   * p_max = (F * E* / (π * R))^(1/2) for line contact (2D Hertz)
   * a = (4*F*R / (π*E*))^(1/2) — contact half-width
   */
  hertzContact(
    normalForce_N: number,
    tool: ToolGeometry,
    workpiece: MaterialProps,
  ): HertzContactResult {
    const E_tool = (tool.E_GPa ?? 600) * 1e3; // MPa
    const nu_tool = tool.nu ?? 0.22;
    const E_wp = workpiece.E_GPa * 1e3; // MPa
    const nu_wp = workpiece.nu;

    // Combined elastic modulus: 1/E* = (1-ν₁²)/E₁ + (1-ν₂²)/E₂
    const E_star = 1 / ((1 - nu_tool ** 2) / E_tool + (1 - nu_wp ** 2) / E_wp);
    const R = tool.nose_radius_mm; // equivalent radius (mm)

    // 2D Hertz (cylinder on flat, per unit length)
    // Contact half-width: a = sqrt(4*F*R / (π*E*))
    // But for 3D sphere on flat: a = (3*F*R / (4*E*))^(1/3)
    // Using 3D spherical contact (more accurate for nose radius)
    const F = normalForce_N;
    const a = Math.pow((3 * F * R) / (4 * E_star), 1 / 3);
    const p_max = (3 * F) / (2 * Math.PI * a * a); // MPa (from N and mm)
    const contactArea = Math.PI * a * a;

    return {
      p_max_MPa: parseFloat(p_max.toFixed(1)),
      a_mm: parseFloat(a.toFixed(6)),
      contact_area_mm2: parseFloat(contactArea.toFixed(6)),
      E_star_GPa: parseFloat((E_star / 1e3).toFixed(1)),
      R_equivalent_mm: R,
      normal_force_N: F,
    };
  }

  /**
   * Compute sub-surface stress field using Huber's solution for Hertzian contact.
   *
   * For a sphere pressed into a half-space, the stress field below the contact is:
   *   σ_z = -p_max * a² / (a² + z²)
   *   σ_r = -p_max * [(1+2ν)/2 * a²/(a²+z²) - z/sqrt(a²+z²)]  (approximate)
   *   τ_max ≈ 0.31 * p_max at z ≈ 0.48a (maximum shear stress)
   *
   * Von Mises: σ_VM = sqrt(σ_z² + σ_r² - σ_z*σ_r + 3*τ²)
   */
  subSurfaceStress(
    hertz: HertzContactResult,
    workpiece: MaterialProps,
    maxDepth_mm?: number,
    numPoints?: number,
  ): SubSurfaceStressResult {
    const a = hertz.a_mm;
    const p_max = hertz.p_max_MPa;
    const nu = workpiece.nu;
    const depth = maxDepth_mm ?? a * 5; // analyze to 5× contact radius
    const N = numPoints ?? 50;

    const depths: number[] = [];
    const sigma_VM: number[] = [];
    const tau_max: number[] = [];
    const p_hydro: number[] = [];

    let maxVM = 0;
    let depthOfMax = 0;

    for (let i = 0; i <= N; i++) {
      const z = (i / N) * depth;
      depths.push(parseFloat(z.toFixed(6)));

      // Normalized depth
      const zn = z / Math.max(a, 1e-10);
      const zn2 = zn * zn;

      // Axial stress (compressive, along contact normal)
      const sigma_z = -p_max / (1 + zn2);

      // Radial stress (approximate for spherical contact)
      const sigma_r = -p_max * ((1 + 2 * nu) / 2 * 1 / (1 + zn2) - zn / Math.sqrt(1 + zn2));

      // Hoop stress ≈ sigma_r for axisymmetric case
      const sigma_theta = sigma_r;

      // Maximum shear stress
      const tau = Math.abs(sigma_z - sigma_r) / 2;

      // Von Mises stress (axisymmetric simplification)
      const vm = Math.sqrt(
        0.5 * ((sigma_z - sigma_r) ** 2 + (sigma_r - sigma_theta) ** 2 + (sigma_theta - sigma_z) ** 2)
      );

      // Hydrostatic pressure
      const hydro = -(sigma_z + sigma_r + sigma_theta) / 3;

      sigma_VM.push(parseFloat(vm.toFixed(2)));
      tau_max.push(parseFloat(tau.toFixed(2)));
      p_hydro.push(parseFloat(hydro.toFixed(2)));

      if (vm > maxVM) {
        maxVM = vm;
        depthOfMax = z;
      }
    }

    return {
      depths_mm: depths,
      sigma_VM_MPa: sigma_VM,
      max_sigma_VM_MPa: parseFloat(maxVM.toFixed(2)),
      depth_of_max_mm: parseFloat(depthOfMax.toFixed(6)),
      tau_max_MPa: tau_max,
      p_hydro_MPa: p_hydro,
    };
  }

  /**
   * Determine plastic zone depth — where σ_VM exceeds yield strength.
   */
  plasticZoneDepth(
    subsurface: SubSurfaceStressResult,
    workpiece: MaterialProps,
  ): PlasticZoneResult {
    const yield_MPa = workpiece.yield_MPa;
    let plasticDepth = 0;
    let maxStrain = 0;
    let affectedArea = 0;

    for (let i = 0; i < subsurface.depths_mm.length; i++) {
      if (subsurface.sigma_VM_MPa[i] > yield_MPa) {
        plasticDepth = subsurface.depths_mm[i];
        // Estimate plastic strain: ε_p ≈ (σ_VM - σ_y) / E (simplified)
        const strain = (subsurface.sigma_VM_MPa[i] - yield_MPa) / (workpiece.E_GPa * 1e3);
        if (strain > maxStrain) maxStrain = strain;
      }
    }

    // Affected area ≈ depth × width (width ≈ 2× contact half-width from Hertz)
    if (plasticDepth > 0) {
      // Approximate width as proportional to depth
      affectedArea = plasticDepth * plasticDepth * Math.PI / 4;
    }

    const safetyFactor = subsurface.max_sigma_VM_MPa > 0
      ? yield_MPa / subsurface.max_sigma_VM_MPa
      : Infinity;

    return {
      plastic_depth_mm: parseFloat(plasticDepth.toFixed(6)),
      max_plastic_strain: parseFloat(maxStrain.toFixed(8)),
      affected_area_mm2: parseFloat(affectedArea.toFixed(6)),
      safety_factor: parseFloat(Math.min(safetyFactor, 99).toFixed(2)),
      significant: plasticDepth > 0.01, // > 10μm
    };
  }

  /**
   * Assess white layer formation risk.
   *
   * White layer forms when the surface temperature exceeds the austenite
   * transformation temperature (Ac3 ≈ 727°C for steel) followed by rapid
   * quenching from the bulk material. Creates a hard, brittle surface layer.
   *
   * Temperature model: Jaeger moving heat source (simplified)
   *   T_interface ≈ 0.754 * q * sqrt(L/(k*ρ*c*Vc))
   *   where q = τ * Vc (heat flux), L = contact length, τ = shear stress
   */
  whiteLayerRisk(
    conditions: CuttingConditions,
    tool: ToolGeometry,
    workpiece: MaterialProps,
    hertz: HertzContactResult,
  ): WhiteLayerResult {
    const austeniteTemp = workpiece.austenite_temp_C ?? 727;
    const k = workpiece.thermal_conductivity ?? 40;
    const rho = workpiece.density ?? 7800;
    const c = workpiece.specific_heat ?? 480;
    const Vc = conditions.Vc_m_min / 60; // m/s

    // Estimate shear stress from contact pressure
    const tau = hertz.p_max_MPa * 0.3; // τ ≈ 0.3 * p_max (friction)

    // Heat flux at interface
    const q_W_mm2 = tau * Vc * 1e3 / 1e6; // W/mm² (approximate)

    // Contact length (mm)
    const L = hertz.a_mm * 2;

    // Jaeger moving heat source temperature rise (simplified)
    // T_rise = 0.754 * q * sqrt(L / (k * rho * c * V))
    const alpha = k / (rho * c); // thermal diffusivity m²/s
    const T_rise = 0.754 * (q_W_mm2 * 1e6) * Math.sqrt(L * 1e-3 / (k * rho * c * Vc))
      * 1e-3; // scaling factor for units

    // Practical temperature estimation (empirical correction)
    // T_interface ≈ ambient + Vc_factor + feed_factor + depth_factor
    const ambientTemp = 25;
    const vcFactor = Vc * 60 * 2.5; // ~2.5°C per m/min cutting speed
    const feedFactor = conditions.feed_mm_rev * 200; // feed contribution
    const coolantFactor = conditions.coolant === "flood" ? 0.4
      : conditions.coolant === "mql" ? 0.7
      : conditions.coolant === "cryogenic" ? 0.25
      : 1.0; // dry

    const T_interface = (ambientTemp + vcFactor + feedFactor) * coolantFactor;
    const margin = austeniteTemp - T_interface;

    // White layer thickness estimate (Chou & Evans 1999)
    // Thickness ∝ (T_interface - T_austenite) * contact_time
    let thickness_um = 0;
    if (T_interface > austeniteTemp) {
      const excessTemp = T_interface - austeniteTemp;
      const contactTime_ms = (L / (Vc * 1e3)) * 1e3; // ms
      thickness_um = Math.min(excessTemp * contactTime_ms * 0.01, 50); // cap at 50μm
    }

    let risk: WhiteLayerResult["risk"];
    const recommendations: string[] = [];

    if (margin > 200) {
      risk = "none";
    } else if (margin > 100) {
      risk = "low";
      recommendations.push("Monitor tool wear — VB increase raises temperature");
    } else if (margin > 0) {
      risk = "medium";
      recommendations.push("Reduce cutting speed by 15-20%");
      recommendations.push("Use flood coolant or cryogenic cooling");
      recommendations.push("Inspect surface for white layer with metallography");
    } else if (margin > -100) {
      risk = "high";
      recommendations.push("Reduce cutting speed immediately");
      recommendations.push("Switch to cryogenic cooling (LN2/CO2)");
      recommendations.push("Reduce feed to minimize heat generation");
      recommendations.push("White layer likely forming — verify with micro-hardness testing");
    } else {
      risk = "critical";
      recommendations.push("STOP: Severe white layer formation expected");
      recommendations.push("Reduce Vc by 30%+ and use cryogenic cooling");
      recommendations.push("Consider grinding instead of hard turning");
      recommendations.push("Part may require scrapping — inspect sub-surface");
    }

    return {
      risk,
      interface_temp_C: parseFloat(T_interface.toFixed(1)),
      austenite_temp_C: austeniteTemp,
      margin_C: parseFloat(margin.toFixed(1)),
      estimated_thickness_um: parseFloat(thickness_um.toFixed(1)),
      recommendations,
    };
  }

  /**
   * Predict surface residual stress sign and magnitude.
   *
   * Mechanical contribution (compressive): from plastic deformation under tool
   * Thermal contribution (tensile): from thermal expansion and contraction
   *
   * Net stress = mechanical + thermal
   * - Gentle cuts (low speed, sharp tool): compressive dominates → good fatigue life
   * - Aggressive cuts (high speed, worn tool): tensile dominates → poor fatigue life
   */
  residualStress(
    conditions: CuttingConditions,
    tool: ToolGeometry,
    workpiece: MaterialProps,
    hertz: HertzContactResult,
    plasticZone: PlasticZoneResult,
  ): ResidualStressResult {
    // Mechanical component (compressive)
    // Proportional to contact pressure and plastic deformation
    const mechStress = -hertz.p_max_MPa * 0.15 * (plasticZone.significant ? 1.0 : 0.3);

    // Thermal component (tensile)
    // Higher speed → more heat → more thermal stress
    const Vc = conditions.Vc_m_min;
    const thermalFactor = Vc / 200; // normalized to 200 m/min
    const edgeRadius = tool.edge_radius_um ?? 20;
    const edgeFactor = edgeRadius / 30; // sharper = less thermal (more cutting, less plowing)
    const coolantReduction = conditions.coolant === "flood" ? 0.5
      : conditions.coolant === "cryogenic" ? 0.3
      : conditions.coolant === "mql" ? 0.7
      : 1.0;

    const thermalStress = workpiece.yield_MPa * 0.2 * thermalFactor * edgeFactor * coolantReduction;

    const netStress = mechStress + thermalStress;

    // Depth of stress reversal (where compressive transitions to tensile)
    // Approximately at the plastic zone boundary
    const reversalDepth = plasticZone.plastic_depth_mm > 0
      ? plasticZone.plastic_depth_mm * 1.5
      : 0.05; // default 50μm

    let assessment: string;
    if (netStress < -100) {
      assessment = "Strongly compressive — excellent fatigue resistance. Surface hardening likely.";
    } else if (netStress < 0) {
      assessment = "Mildly compressive — good surface integrity. Favorable for fatigue life.";
    } else if (netStress < 200) {
      assessment = "Mildly tensile — acceptable for most applications. Monitor in fatigue-critical parts.";
    } else {
      assessment = "Strongly tensile — poor surface integrity. Risk of fatigue crack initiation. Consider shot peening or grinding.";
    }

    return {
      mechanical_MPa: parseFloat(mechStress.toFixed(1)),
      thermal_MPa: parseFloat(thermalStress.toFixed(1)),
      net_surface_MPa: parseFloat(netStress.toFixed(1)),
      type: netStress < -10 ? "compressive" : netStress > 10 ? "tensile" : "neutral",
      reversal_depth_mm: parseFloat(reversalDepth.toFixed(4)),
      assessment,
    };
  }

  /**
   * Full surface integrity analysis — combines all sub-analyses.
   */
  fullIntegrityAnalysis(
    conditions: CuttingConditions,
    tool: ToolGeometry,
    workpiece: MaterialProps | string,
  ): FullIntegrityResult {
    // Resolve material
    const mat = typeof workpiece === "string"
      ? MATERIAL_DB[workpiece] ?? MATERIAL_DB["steel_1045"]
      : workpiece;

    // Estimate normal force from Kienzle
    const kc1_1 = mat.yield_MPa * 3.5; // approximate kc1.1 from yield
    const mc = 0.25;
    const h = conditions.feed_mm_rev;
    const ap = conditions.ap_mm;
    const Fc = kc1_1 * ap * Math.pow(h, 1 - mc); // cutting force (N)
    const Fn = Fc * 0.4; // normal force ≈ 40% of cutting force (empirical)

    const hertz = this.hertzContact(Fn, tool, mat);
    const subsurface = this.subSurfaceStress(hertz, mat);
    const plasticZone = this.plasticZoneDepth(subsurface, mat);
    const whiteLayer = this.whiteLayerRisk(conditions, tool, mat, hertz);
    const residual = this.residualStress(conditions, tool, mat, hertz, plasticZone);

    // Overall risk assessment
    let overallRisk: FullIntegrityResult["overall_risk"];
    if (whiteLayer.risk === "critical" || residual.type === "tensile" && residual.net_surface_MPa > 300) {
      overallRisk = "critical";
    } else if (whiteLayer.risk === "high" || plasticZone.significant && residual.type === "tensile") {
      overallRisk = "high";
    } else if (whiteLayer.risk === "medium" || residual.type === "tensile") {
      overallRisk = "medium";
    } else {
      overallRisk = "low";
    }

    const summary = [
      `Contact: p_max=${hertz.p_max_MPa.toFixed(0)} MPa, a=${(hertz.a_mm * 1000).toFixed(1)} μm`,
      `Sub-surface: max σ_VM=${subsurface.max_sigma_VM_MPa.toFixed(0)} MPa at ${(subsurface.depth_of_max_mm * 1000).toFixed(1)} μm`,
      `Plastic zone: ${plasticZone.significant ? (plasticZone.plastic_depth_mm * 1000).toFixed(1) + " μm deep" : "none"}`,
      `White layer: ${whiteLayer.risk} (T_interface=${whiteLayer.interface_temp_C.toFixed(0)}°C, margin=${whiteLayer.margin_C.toFixed(0)}°C)`,
      `Residual stress: ${residual.net_surface_MPa.toFixed(0)} MPa (${residual.type})`,
      `Overall: ${overallRisk.toUpperCase()} risk`,
    ].join(". ");

    return { hertz, subsurface, plastic_zone: plasticZone, white_layer: whiteLayer, residual_stress: residual, overall_risk: overallRisk, summary };
  }

  /**
   * Dispatcher-compatible calculate method.
   */
  calculate(input: {
    action: "hertz_contact" | "subsurface_stress" | "plastic_zone" | "white_layer_risk" | "residual_stress" | "full_integrity";
    [key: string]: unknown;
  }): unknown {
    switch (input.action) {
      case "hertz_contact":
        return this.hertzContact(
          input.normal_force_N as number,
          input.tool as ToolGeometry,
          input.workpiece as MaterialProps,
        );

      case "subsurface_stress":
        return this.subSurfaceStress(
          input.hertz as HertzContactResult,
          input.workpiece as MaterialProps,
          input.max_depth_mm as number | undefined,
          input.num_points as number | undefined,
        );

      case "plastic_zone":
        return this.plasticZoneDepth(
          input.subsurface as SubSurfaceStressResult,
          input.workpiece as MaterialProps,
        );

      case "white_layer_risk":
        return this.whiteLayerRisk(
          input.conditions as CuttingConditions,
          input.tool as ToolGeometry,
          input.workpiece as MaterialProps,
          input.hertz as HertzContactResult,
        );

      case "residual_stress":
        return this.residualStress(
          input.conditions as CuttingConditions,
          input.tool as ToolGeometry,
          input.workpiece as MaterialProps,
          input.hertz as HertzContactResult,
          input.plastic_zone as PlasticZoneResult,
        );

      case "full_integrity":
        return this.fullIntegrityAnalysis(
          input.conditions as CuttingConditions,
          input.tool as ToolGeometry,
          input.workpiece as MaterialProps | string,
        );

      default:
        return { error: `Unknown action: ${input.action}` };
    }
  }
}
