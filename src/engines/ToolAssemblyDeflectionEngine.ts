/**
 * ToolAssemblyDeflectionEngine — Combined tool assembly deflection analysis.
 *
 * Models the complete tool assembly: spindle → holder → collet/chuck → tool shank → cutting edge.
 * Each segment has its own diameter, length, material (E modulus), and contributes to total deflection.
 *
 * Uses cascaded cantilever beam model with multi-section moment of inertia.
 * Optional FEM path (solveBar axial + modalAnalysis) for assemblies with abrupt
 * diameter changes (HSK/BT tapers), auto-flagged when any section L/D > 4.
 *
 * Resonance cross-check: compares FEM-backed natural frequency against spindle RPM
 * and tooth-passing frequency, warns when within ±10%.
 *
 * References:
 *   - Bathe, "Finite Element Procedures" 2nd ed. (2014) — FEM bar/modal
 *   - Altintas, "Manufacturing Automation" 2nd ed. (2012) — resonance avoidance
 *   - ISO 10791-6 — Test conditions for machining centres, spindle/toolholder
 *
 * @engine ToolAssemblyDeflectionEngine
 * @milestone SCIMATH-WIRE-MS0
 * @unit P5-U01, P5-U03
 */

import { finiteElementEngine } from "./FiniteElementEngine.js";
import { CANONICAL_TOOL_MODULUS } from "../physics/constants.js";

interface AtomicValue<T> { value: T; unit: string; formula?: string; confidence?: number; }

export interface AssemblySection {
  name: string;
  length_mm: number;
  diameter_mm: number;
  material: "carbide" | "hss" | "steel" | "ceramic" | "cermet";
  is_cutting: boolean;
}

export interface AssemblyInput {
  sections: AssemblySection[];
  cutting_force_n: number;
  force_position?: "tip" | "center" | "distributed";
  spindle_rigidity_n_um?: number; // N/μm at spindle nose
  radial_force_n?: number;  // Fr component
  axial_force_n?: number;   // Fa component (for FEM axial)
  taper: "BT30" | "BT40" | "CAT40" | "CAT50" | "HSK-A63" | "HSK-A100" | "HSK-F63";
  /** Enable FEM path. Default: auto (true when any section L/D > 4 or HSK taper) */
  use_fem?: boolean;
  /** Spindle speed in RPM — enables resonance cross-check */
  spindle_speed_rpm?: number;
  /** Number of flutes — enables tooth-passing frequency resonance check */
  num_flutes?: number;
}

export interface SectionDeflection {
  name: string;
  length_mm: number;
  diameter_mm: number;
  moment_of_inertia_mm4: number;
  e_modulus_mpa: number;
  deflection_at_tip_mm: number;
  angular_contribution_rad: number;
  pct_of_total: number;
}

/** FEM analysis results (optional, present when use_fem is enabled) */
export interface FEMAnalysis {
  axial_compliance_um: number;
  axial_stiffness_n_mm: number;
  fem_natural_freq_hz: number;
  fem_mode_count: number;
  fem_vs_beam_stiffness_ratio: number;
}

/** Resonance risk assessment */
export interface ResonanceRisk {
  natural_freq_hz: number;
  spindle_freq_hz: number;
  tooth_passing_freq_hz: number;
  frequency_ratio: number;
  risk_level: "none" | "warning" | "danger";
  description: string;
}

export interface AssemblyDeflectionResult {
  total_deflection_mm: number;
  total_deflection_um: number;
  sections: SectionDeflection[];
  spindle_deflection_um: number;
  holder_deflection_um: number;
  tool_deflection_um: number;
  dominant_contributor: string;
  stiffness_n_mm: number;
  natural_frequency_hz: number;
  max_tolerance_achievable_mm: number;
  recommendations: string[];
  fem_analysis?: FEMAnalysis;
  resonance_risk?: ResonanceRisk;
}

/** Elastic modulus lookup — uses canonical values for tool materials, steel for structural */
const E_MODULUS: Record<string, number> = {
  carbide: CANONICAL_TOOL_MODULUS.carbide,   // 600,000 MPa
  hss: CANONICAL_TOOL_MODULUS.hss,           // 210,000 MPa
  steel: 210000,                             // structural steel (not a tool material)
  ceramic: CANONICAL_TOOL_MODULUS.ceramic,   // 380,000 MPa
  cermet: CANONICAL_TOOL_MODULUS.cermet,     // 400,000 MPa
};

const TAPER_RIGIDITY: Record<string, number> = {
  BT30: 15,   // N/μm
  BT40: 25,
  CAT40: 25,
  CAT50: 40,
  "HSK-A63": 45,
  "HSK-A100": 80,
  "HSK-F63": 40,
};

/** Material density in kg/m³ for FEM mass matrix */
const DENSITY: Record<string, number> = {
  carbide: 14500,
  hss: 7850,
  steel: 7850,
  ceramic: 3900,
  cermet: 7200,
};

export class ToolAssemblyDeflectionEngine {
  compute(input: AssemblyInput): AtomicValue<AssemblyDeflectionResult> {
    const { sections, cutting_force_n, taper } = input;
    const F = cutting_force_n;
    const forcePos = input.force_position || "tip";

    // Spindle nose rigidity
    const spindleRigidity = input.spindle_rigidity_n_um || TAPER_RIGIDITY[taper] || 25;
    const spindleDeflection_um = F / spindleRigidity;

    // Calculate cumulative deflection using cascaded beam model
    // Each section is a cantilever beam, and downstream sections amplify upstream angles
    const sectionResults: SectionDeflection[] = [];
    let totalLength = sections.reduce((s, sec) => s + sec.length_mm, 0);

    // Distance from spindle nose to force application point
    let forceDistance = totalLength;
    if (forcePos === "center") {
      const cuttingSections = sections.filter(s => s.is_cutting);
      if (cuttingSections.length > 0) {
        const lastCutting = cuttingSections[cuttingSections.length - 1];
        forceDistance = totalLength - lastCutting.length_mm / 2;
      }
    }

    // Cascaded beam: deflection at tip = sum of each section's contribution
    // For section i at distance L_i from fixed end:
    // δ_i = F * L_i² * (3*L_total - L_i) / (6 * E_i * I_i)  (for force at tip)
    // Plus angular amplification from upstream sections

    let cumulativeLength = 0;
    let totalDeflection_mm = 0;
    let totalAngle_rad = 0;

    for (const sec of sections) {
      const E = E_MODULUS[sec.material] || 210000;
      const I = (Math.PI / 64) * Math.pow(sec.diameter_mm, 4);
      const L = sec.length_mm;

      // Deflection of this section under force at its end
      const sectionDeflection = (F * Math.pow(L, 3)) / (3 * E * I);

      // Angle at end of this section
      const sectionAngle = (F * Math.pow(L, 2)) / (2 * E * I);

      // Contribution to tip deflection: own deflection + angle * remaining length
      const tipContribution = sectionDeflection + totalAngle_rad * L;

      totalDeflection_mm += tipContribution;
      totalAngle_rad += sectionAngle;
      cumulativeLength += L;

      sectionResults.push({
        name: sec.name,
        length_mm: L,
        diameter_mm: sec.diameter_mm,
        moment_of_inertia_mm4: Math.round(I * 100) / 100,
        e_modulus_mpa: E,
        deflection_at_tip_mm: Math.round(tipContribution * 10000) / 10000,
        angular_contribution_rad: Math.round(sectionAngle * 100000) / 100000,
        pct_of_total: 0, // filled after total is known
      });
    }

    // Add spindle deflection
    const spindleDeflection_mm = spindleDeflection_um / 1000;
    totalDeflection_mm += spindleDeflection_mm;
    // Spindle angle also amplifies all downstream deflections
    const spindleAngle = spindleDeflection_mm / 50; // approximate
    totalDeflection_mm += spindleAngle * totalLength;

    // Fill percentages
    for (const sr of sectionResults) {
      sr.pct_of_total = totalDeflection_mm > 0
        ? Math.round((sr.deflection_at_tip_mm / totalDeflection_mm) * 1000) / 10
        : 0;
    }

    // Categorize contributions
    let holderDeflection = 0, toolDeflection = 0;
    for (const sr of sectionResults) {
      const sec = sections.find(s => s.name === sr.name);
      if (sec?.is_cutting) toolDeflection += sr.deflection_at_tip_mm;
      else holderDeflection += sr.deflection_at_tip_mm;
    }

    // Find dominant contributor
    const dominant = sectionResults.reduce((a, b) =>
      a.deflection_at_tip_mm > b.deflection_at_tip_mm ? a : b
    );

    // Assembly stiffness
    const stiffness = totalDeflection_mm > 0 ? F / totalDeflection_mm : Infinity;

    // Natural frequency estimate (simplified single mass-spring)
    const toolMass_kg = sections.reduce((sum, s) => {
      const vol = Math.PI * Math.pow(s.diameter_mm / 2000, 2) * (s.length_mm / 1000);
      const density = DENSITY[s.material] || 7850;
      return sum + vol * density;
    }, 0);
    const natFreq = toolMass_kg > 0
      ? (1 / (2 * Math.PI)) * Math.sqrt((stiffness * 1000) / toolMass_kg)
      : 0;

    // Max achievable tolerance (deflection ≈ tolerance / 2 for safety)
    const maxTolerance = totalDeflection_mm * 2;

    // FEM analysis (P5-U01): axial compliance + modal natural frequency
    const hasHighLDRatio = sections.some(s => s.length_mm / s.diameter_mm > 4);
    const isHSK = taper.startsWith("HSK");
    const enableFEM = input.use_fem ?? (hasHighLDRatio || isHSK);

    let femAnalysis: FEMAnalysis | undefined;
    let femNatFreq = natFreq; // fallback to beam estimate

    if (enableFEM && sections.length >= 1) {
      try {
        // Build FEM bar elements from assembly sections (SI units: m, Pa, m²)
        const nNodes = sections.length + 1;
        const barElements = sections.map((s, i) => ({
          nodes: [i, i + 1] as [number, number],
          E: (E_MODULUS[s.material] || 210000) * 1e6,  // MPa → Pa
          A: Math.PI * Math.pow(s.diameter_mm / 2000, 2),  // mm → m, area in m²
          L: s.length_mm / 1000,  // mm → m
        }));

        // Axial FEM: apply axial force at tip, fixed at spindle
        const axialForce = input.axial_force_n || (F * 0.3); // 30% axial for milling
        const axialResult = finiteElementEngine.solveBar({
          elements: barElements,
          numNodes: nNodes,
          fixedDofs: [0],
          loads: [{ dof: nNodes - 1, value: axialForce }],
        });

        const axialDeflection_m = axialResult.maxDisplacement;
        const axialDeflection_um = axialDeflection_m * 1e6;
        const axialStiffness = axialDeflection_m > 0
          ? axialForce / (axialDeflection_m * 1000) // N/mm
          : Infinity;

        // Modal analysis for natural frequency (more accurate than mass-spring)
        const modalElements = sections.map((s, i) => ({
          nodes: [i, i + 1] as [number, number],
          E: (E_MODULUS[s.material] || 210000) * 1e6,
          A: Math.PI * Math.pow(s.diameter_mm / 2000, 2),
          L: s.length_mm / 1000,
          rho: DENSITY[s.material] || 7850,
        }));

        const modalResult = finiteElementEngine.modalAnalysis(
          modalElements, nNodes, [0], 2
        );

        const femFreq = modalResult.frequencies.length > 0
          ? modalResult.frequencies[0]
          : natFreq;

        femNatFreq = femFreq > 0 ? femFreq : natFreq;

        femAnalysis = {
          axial_compliance_um: Math.round(axialDeflection_um * 100) / 100,
          axial_stiffness_n_mm: Math.round(axialStiffness * 10) / 10,
          fem_natural_freq_hz: Math.round(femNatFreq),
          fem_mode_count: modalResult.frequencies.length,
          fem_vs_beam_stiffness_ratio: stiffness > 0
            ? Math.round((axialStiffness / stiffness) * 100) / 100
            : 0,
        };
      } catch {
        // FEM may fail on degenerate geometry — fall back to beam theory
        femAnalysis = undefined;
      }
    }

    // Resonance cross-check (P5-U03): compare against spindle RPM ± 10%
    let resonanceRisk: ResonanceRisk | undefined;
    const effectiveNatFreq = femAnalysis ? femAnalysis.fem_natural_freq_hz : natFreq;

    if (input.spindle_speed_rpm && effectiveNatFreq > 0) {
      const spindleFreq = input.spindle_speed_rpm / 60;
      const toothPassingFreq = spindleFreq * (input.num_flutes || 1);

      // Check both spindle frequency and tooth-passing frequency
      const ratioSpindle = spindleFreq / effectiveNatFreq;
      const ratioTooth = toothPassingFreq / effectiveNatFreq;

      // Closest ratio to 1.0 (resonance)
      const closestRatio = Math.abs(ratioSpindle - 1) < Math.abs(ratioTooth - 1)
        ? ratioSpindle : ratioTooth;
      const closestFreq = Math.abs(ratioSpindle - 1) < Math.abs(ratioTooth - 1)
        ? "spindle" : "tooth-passing";

      let riskLevel: "none" | "warning" | "danger" = "none";
      let description = "";

      if (Math.abs(closestRatio - 1.0) < 0.05) {
        riskLevel = "danger";
        description = `RESONANCE DANGER: ${closestFreq} frequency ` +
          `(${Math.round(closestFreq === "spindle" ? spindleFreq : toothPassingFreq)} Hz) ` +
          `is within 5% of natural frequency (${Math.round(effectiveNatFreq)} Hz). ` +
          `Change RPM immediately.`;
      } else if (Math.abs(closestRatio - 1.0) < 0.10) {
        riskLevel = "warning";
        description = `RESONANCE WARNING: ${closestFreq} frequency ` +
          `(${Math.round(closestFreq === "spindle" ? spindleFreq : toothPassingFreq)} Hz) ` +
          `is within 10% of natural frequency (${Math.round(effectiveNatFreq)} Hz). ` +
          `Consider adjusting RPM.`;
      } else {
        description = `No resonance risk. Closest ratio: ${closestRatio.toFixed(2)} ` +
          `(${closestFreq} at ${Math.round(closestFreq === "spindle" ? spindleFreq : toothPassingFreq)} Hz ` +
          `vs fn=${Math.round(effectiveNatFreq)} Hz).`;
      }

      resonanceRisk = {
        natural_freq_hz: Math.round(effectiveNatFreq),
        spindle_freq_hz: Math.round(spindleFreq * 100) / 100,
        tooth_passing_freq_hz: Math.round(toothPassingFreq * 100) / 100,
        frequency_ratio: Math.round(closestRatio * 1000) / 1000,
        risk_level: riskLevel,
        description,
      };
    }

    // Recommendations
    const recs: string[] = [];
    if (dominant.name.toLowerCase().includes("shank") || dominant.pct_of_total > 50) {
      recs.push(`${dominant.name} contributes ${dominant.pct_of_total}% of deflection — consider shorter overhang or larger diameter`);
    }
    if (spindleDeflection_um > 5) {
      recs.push(`Spindle deflection ${spindleDeflection_um.toFixed(1)}μm is significant — consider HSK taper for better rigidity`);
    }
    if (totalDeflection_mm > 0.05) {
      recs.push(`Total deflection ${(totalDeflection_mm * 1000).toFixed(1)}μm exceeds 50μm — reduce overhang or increase tool diameter`);
    }
    if (hasHighLDRatio) {
      recs.push("L/D ratio > 4 detected — FEM analysis enabled for improved accuracy");
    }
    if (resonanceRisk?.risk_level === "danger") {
      recs.push(resonanceRisk.description);
    } else if (resonanceRisk?.risk_level === "warning") {
      recs.push(resonanceRisk.description);
    }

    const result: AssemblyDeflectionResult = {
      total_deflection_mm: Math.round(totalDeflection_mm * 10000) / 10000,
      total_deflection_um: Math.round(totalDeflection_mm * 10000) / 10,
      sections: sectionResults,
      spindle_deflection_um: Math.round(spindleDeflection_um * 10) / 10,
      holder_deflection_um: Math.round(holderDeflection * 10000) / 10,
      tool_deflection_um: Math.round(toolDeflection * 10000) / 10,
      dominant_contributor: dominant.name,
      stiffness_n_mm: Math.round(stiffness * 10) / 10,
      natural_frequency_hz: Math.round(femNatFreq > 0 ? femNatFreq : natFreq),
      max_tolerance_achievable_mm: Math.round(maxTolerance * 10000) / 10000,
      recommendations: recs,
      fem_analysis: femAnalysis,
      resonance_risk: resonanceRisk,
    };

    return {
      value: result,
      unit: "mm",
      formula: enableFEM
        ? "cascaded_cantilever_beam+FEM_solveBar+modalAnalysis"
        : "cascaded_cantilever_beam_F*L³/(3EI)",
      confidence: enableFEM ? 0.88 : 0.8,
    };
  }
}

export const toolAssemblyDeflectionEngine = new ToolAssemblyDeflectionEngine();
